import type { WebSocket } from 'ws';
import { ACTS, ACT_BURST, ACT_RATE, CHAT_MAX, EMOTES, HUB_BOUNDS, HUB_CAP, MAX_SPEED, PROTOCOL_VERSION, SNAP_HZ, sanitizeLook, type Act, type Emote, type Look, type PublicPlayer, type ServerMsg } from '../../shared/protocol';
import { cleanChat, maskText } from '../../shared/text';
import type { Account, Store } from './store/types';
import { inc, gauge } from './metrics';

const CLS_LABEL: Record<string, string> = { lamina: 'Lâmina', arcano: 'Arcano', arco: 'Arco' };
const DIFF_N = ['Normal', 'Difícil', 'Expert', 'Mestre', 'Tormento I', 'Tormento II', 'Tormento III'];

/** Aparência pública a partir do save (o servidor não confia na aparência enviada sem passar por sanitizeLook). */
export function lookFromSave(save: any): Look {
  const c = save?.char ?? {}, eq = save?.eq ?? {};
  return sanitizeLook({ ...c, armor: eq.armor ? eq.armor.rar : null, charm: eq.charm ? eq.charm.rar : null, wr: eq.weapon ? eq.weapon.rar : 0 });
}
/** Título mostrado sob o nome: nível, classe e dificuldade, calculados no servidor a partir do save. */
export function titleFromSave(save: any): string {
  if (!save) return 'Recém-chegado';
  const parts = [`Nv ${save.lvl ?? 1}`, CLS_LABEL[save.char?.cls] ?? ''];
  if (save.diff) parts.push(DIFF_N[save.diff] ?? '');
  return parts.filter(Boolean).join(' · ');
}

interface Player {
  id: number; account: Account; ws: WebSocket; room: Room;
  look: Look; title: string;
  x: number; z: number; yaw: number; m: number; a: string;
  lastPos: number; synced: boolean; dirty: boolean; alive: boolean;
  actTokens: number; actRefill: number; chatTokens: number; chatRefill: number; blockedHits: number[]; lastEmote: number; lastLook: number;
}

class Room {
  players = new Map<number, Player>();
  constructor(public id: string, public label: string) {}
  broadcast(msg: ServerMsg, except?: Player) {
    const s = JSON.stringify(msg);
    for (const p of this.players.values()) if (p !== except && p.ws.readyState === 1) p.ws.send(s);
  }
}

const pub = (p: Player): PublicPlayer => ({ id: p.id, name: p.account.name, title: p.title, look: p.look, x: p.x, z: p.z, yaw: p.yaw });
const send = (p: Player, msg: ServerMsg) => { if (p.ws.readyState === 1) p.ws.send(JSON.stringify(msg)); };
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export class Hub {
  private rooms = new Map<string, Room>();
  private byAccount = new Map<string, Player>();
  private seq = 0;
  private timer: NodeJS.Timeout;
  private ping: NodeJS.Timeout;

  constructor(private store: Store, private log: { warn: (o: any, m?: string) => void; info: (o: any, m?: string) => void }) {
    this.timer = setInterval(() => this.tick(), 1000 / SNAP_HZ);
    this.ping = setInterval(() => this.heartbeat(), 15_000);
    gauge('hub_players', () => this.byAccount.size);
    gauge('hub_rooms', () => this.rooms.size);
  }

  stop() { clearInterval(this.timer); clearInterval(this.ping); for (const p of this.byAccount.values()) { try { p.ws.close(1001, 'servidor reiniciando'); } catch { /* já fechado */ } p.ws.terminate(); } }
  get online() { return this.byAccount.size; }

  private pickRoom(): Room {
    for (const r of this.rooms.values()) if (r.players.size < HUB_CAP) return r;
    const n = this.rooms.size + 1, r = new Room('vila-' + n, `Vila Brasa #${n}`);
    this.rooms.set(r.id, r); return r;
  }

  async connect(ws: WebSocket, account: Account) {
    const old = this.byAccount.get(account.id);
    if (old) { send(old, { t: 'kick', reason: 'Sua conta entrou em outro lugar.' }); old.ws.close(4000, 'duplicada'); this.leave(old); }
    const save = (await this.store.getSave(account.id))?.data;
    const room = this.pickRoom();
    const p: Player = {
      id: ++this.seq, account, ws, room, look: lookFromSave(save), title: titleFromSave(save),
      x: 44, z: 42, yaw: 0, m: 0, a: '', lastPos: Date.now(), synced: false, dirty: true, alive: true,
      actTokens: ACT_BURST, actRefill: Date.now(), chatTokens: 3, chatRefill: Date.now(), blockedHits: [], lastEmote: 0, lastLook: 0,
    };
    room.players.set(p.id, p); this.byAccount.set(account.id, p);
    send(p, { t: 'welcome', id: p.id, room: room.label, players: [...room.players.values()].filter(o => o !== p).map(pub), v: PROTOCOL_VERSION });
    room.broadcast({ t: 'join', p: pub(p) }, p);
    inc('hub_joins');
    ws.on('message', (raw, isBinary) => { if (isBinary) return; this.onMessage(p, raw.toString()); });
    ws.on('pong', () => { p.alive = true; });
    ws.on('close', () => this.leave(p));
    ws.on('error', () => this.leave(p));
  }

  private leave(p: Player) {
    if (!p.room.players.has(p.id)) return;
    p.room.players.delete(p.id);
    if (this.byAccount.get(p.account.id) === p) this.byAccount.delete(p.account.id);
    p.room.broadcast({ t: 'leave', id: p.id });
    if (!p.room.players.size && this.rooms.size > 1) this.rooms.delete(p.room.id);
  }

  private onMessage(p: Player, raw: string) {
    inc('hub_messages');
    if (raw.length > 4096) return;
    let msg: any; try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg !== 'object') return;
    switch (msg.t) {
      case 'pos': return this.onPos(p, msg);
      case 'chat': return void this.onChat(p, msg.text);
      case 'emote': return this.onEmote(p, msg.e);
      case 'act': return this.onAct(p, msg);
      case 'look': return this.onLook(p, msg.look);
    }
  }

  private onPos(p: Player, m: any) {
    let x = num(m.x), z = num(m.z); const yaw = num(m.yaw), mv = num(m.m);
    if (x === null || z === null || yaw === null || mv === null) return;
    x = Math.min(HUB_BOUNDS.x1, Math.max(HUB_BOUNDS.x0, x)); z = Math.min(HUB_BOUNDS.z1, Math.max(HUB_BOUNDS.z0, z));
    const now = Date.now(), dt = Math.max(.05, (now - p.lastPos) / 1000), dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz), lim = MAX_SPEED * dt + 1.5;
    // A primeira posição depois de entrar vale direto (o jogador pode estar voltando de um portal).
    if (p.synced && d > lim) { x = p.x + dx / d * lim; z = p.z + dz / d * lim; inc('hub_speed_clamps'); }
    p.synced = true;
    p.x = x; p.z = z; p.yaw = yaw % 6.2832; p.m = Math.min(1, Math.max(0, mv)); p.a = typeof m.a === 'string' ? m.a.slice(0, 8) : ''; p.lastPos = now; p.dirty = true;
  }

  private async onChat(p: Player, text: unknown) {
    const now = Date.now();
    if (p.account.mutedUntil && p.account.mutedUntil.getTime() > now) {
      const min = Math.ceil((p.account.mutedUntil.getTime() - now) / 60000);
      return send(p, { t: 'sys', text: `Você está silenciado por mais ${min} min.` });
    }
    const clean = cleanChat(String(text ?? ''), CHAT_MAX);
    if (!clean) return;
    if (clean.startsWith('/')) return this.command(p, clean);
    p.chatTokens = Math.min(3, p.chatTokens + (now - p.chatRefill) / 2000); p.chatRefill = now;
    if (p.chatTokens < 1) return send(p, { t: 'sys', text: 'Calma! Espere um pouco para falar de novo.' });
    p.chatTokens -= 1;
    const masked = maskText(clean);
    if (masked !== clean) {
      p.blockedHits = p.blockedHits.filter(t => now - t < 60_000); p.blockedHits.push(now);
      if (p.blockedHits.length >= 3) {
        const until = new Date(now + 5 * 60_000); p.account.mutedUntil = until;
        await this.store.updateAccount(p.account.id, { mutedUntil: until }).catch(() => {});
        await this.store.audit(p.account.id, 'chat_mute', { motivo: 'palavras bloqueadas', ate: until }).catch(() => {});
        send(p, { t: 'sys', text: 'Você foi silenciado por 5 minutos por linguagem ofensiva.' });
      }
    }
    p.room.broadcast({ t: 'chat', id: p.id, name: p.account.name, text: masked, ts: now });
    inc('hub_chat');
    this.store.logChat(p.account.id, p.room.id, clean).catch(e => this.log.warn({ err: e }, 'falha ao registrar chat'));
  }

  private command(p: Player, c: string) {
    const cmd = c.split(' ')[0].toLowerCase();
    if (cmd === '/quem') return send(p, { t: 'sys', text: `${p.room.label}: ${[...p.room.players.values()].map(o => o.account.name).join(', ')}` });
    if (cmd === '/sala') return send(p, { t: 'sys', text: `Você está em ${p.room.label} (${p.room.players.size}/${HUB_CAP}).` });
    send(p, { t: 'sys', text: 'Comandos: /quem (quem está na sala), /sala (sua sala).' });
  }

  private onEmote(p: Player, e: unknown) {
    if (!EMOTES.includes(e as Emote)) return;
    const now = Date.now(); if (now - p.lastEmote < 1500) return; p.lastEmote = now;
    p.room.broadcast({ t: 'emote', id: p.id, e: e as Emote });
  }

  /** Ataque, habilidade ou esquiva: repassado na hora (não espera o snapshot), com cota por segundo. */
  private onAct(p: Player, m: any) {
    if (!ACTS.includes(m.a)) return;
    const yaw = num(m.yaw); if (yaw === null) return;
    const now = Date.now();
    p.actTokens = Math.min(ACT_BURST, p.actTokens + (now - p.actRefill) / 1000 * ACT_RATE); p.actRefill = now;
    if (p.actTokens < 1) { inc('hub_act_drops'); return; }
    p.actTokens -= 1;
    const c = Number.isInteger(m.c) && m.c >= 0 && m.c <= 3 ? m.c : 0;
    p.yaw = yaw % 6.2832; p.dirty = true;
    p.room.broadcast({ t: 'act', id: p.id, a: m.a as Act, c, yaw: +p.yaw.toFixed(2) }, p);
  }

  private onLook(p: Player, look: unknown) {
    const now = Date.now(); if (now - p.lastLook < 2000) return; p.lastLook = now;
    p.look = sanitizeLook(look);
    p.room.broadcast({ t: 'look', id: p.id, look: p.look }, p);
  }

  /** Atualiza o título quando o save muda (nível, dificuldade). */
  refreshTitle(accountId: string, save: any) {
    const p = this.byAccount.get(accountId); if (!p) return;
    const t = titleFromSave(save); if (t === p.title) return;
    p.title = t; p.room.broadcast({ t: 'title', id: p.id, title: t });
  }

  private tick() {
    for (const room of this.rooms.values()) {
      const ps: Array<[number, number, number, number, number, string]> = [];
      for (const p of room.players.values()) if (p.dirty) { ps.push([p.id, +p.x.toFixed(2), +p.z.toFixed(2), +p.yaw.toFixed(2), +p.m.toFixed(2), p.a]); p.dirty = false; }
      if (ps.length) room.broadcast({ t: 'snap', ps });
    }
  }

  private heartbeat() {
    for (const p of this.byAccount.values()) {
      if (!p.alive) { p.ws.terminate(); this.leave(p); continue; }
      p.alive = false; try { p.ws.ping(); } catch { /* fechado */ }
    }
  }
}
