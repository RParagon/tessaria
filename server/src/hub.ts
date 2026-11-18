import type { WebSocket } from 'ws';
import { RELAY_MAX_BYTES, RELAY_PER_SEC, INST_BOUNDS, INST_CAP, INST_EMPTY_MS, INST_READY_MS, RIFT_BASES, ACTS, ACT_BURST, ACT_RATE, CHAT_MAX, EMOTES, HUB_BOUNDS, HUB_CAP, MAX_SPEED, PROTOCOL_VERSION, SNAP_HZ, sanitizeLook, type Act, type Emote, type Look, type PublicPlayer, type ServerMsg } from '../../shared/protocol';
import { cleanChat, maskText } from '../../shared/text';
import { FRIEND_REQ_DAYS, PARTY_GRACE_MS, PARTY_INVITE_MS, PARTY_MAX, WHERE_LABEL, whereLabel, type PartyView } from '../../shared/social';
import type { Account, Store } from './store/types';
import { inc, gauge } from './metrics';
import { requestFriend } from './social';

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
  id: number; account: Account; ws: WebSocket; room: Room | null;   // room null: conectado fora da vila (só amigos e grupo)
  where: string; whereN: number; lvl: number; left: boolean;
  friends: Set<string>; blocks: Set<string>; lastInvite: number;   // blocks: contas que ESTE jogador bloqueou
  look: Look; title: string;
  x: number; z: number; yaw: number; m: number; a: string;
  lastPos: number; synced: boolean; dirty: boolean; alive: boolean;
  actTokens: number; actRefill: number; chatTokens: number; chatRefill: number; blockedHits: number[]; lastEmote: number; lastLook: number; timeReqs: number; relayTokens: number; relayRefill: number;
}

class Room {
  players = new Map<number, Player>();
  bounds = HUB_BOUNDS;
  inst: Instance | null = null;
  constructor(public id: string, public label: string) {}
  broadcast(msg: ServerMsg, except?: Player) {
    const s = JSON.stringify(msg);
    for (const p of this.players.values()) if (p !== except && p.ws.readyState === 1) p.ws.send(s);
  }
}

interface Party { id: number; leader: string; members: string[]; info: Map<string, { name: string; cls: string; lvl: number }>; gone: Map<string, NodeJS.Timeout>; inst?: Instance | null }
/** Instância do grupo (Fenda): uma sala própria, com os dados que geram o mesmo mapa para todos. */
interface Instance { host: number; id: number; party: Party; kind: 'rift'; L: number; base: string; aff: string[]; boss: string; seed: number; room: Room; closeT: NodeJS.Timeout | null }
export interface HubOptions { inviteMs?: number; graceMs?: number; instEmptyMs?: number }
const lvlOf = (save: any) => (Number.isInteger(save?.lvl) ? save.lvl : 1);

const pub = (p: Player): PublicPlayer => ({ id: p.id, name: p.account.name, title: p.title, look: p.look, x: p.x, z: p.z, yaw: p.yaw });
const send = (p: Player, msg: ServerMsg) => { if (p.ws.readyState === 1) p.ws.send(JSON.stringify(msg)); };
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export class Hub {
  private rooms = new Map<string, Room>();
  private byAccount = new Map<string, Player>();
  private seq = 0;
  private timer: NodeJS.Timeout;
  private ping: NodeJS.Timeout;
  private parties = new Map<number, Party>();
  private partyOf = new Map<string, Party>();
  private invites = new Map<string, Map<string, { name: string; exp: number }>>();   // convidado → (quem convidou → convite)
  private partySeq = 0;
  private instances = new Map<number, Instance>();
  private instSeq = 0;
  private inviteMs: number;
  private graceMs: number;
  private instEmptyMs: number;

  constructor(private store: Store, private log: { warn: (o: any, m?: string) => void; info: (o: any, m?: string) => void }, opts: HubOptions = {}) {
    this.inviteMs = opts.inviteMs ?? PARTY_INVITE_MS; this.graceMs = opts.graceMs ?? PARTY_GRACE_MS; this.instEmptyMs = opts.instEmptyMs ?? INST_EMPTY_MS;
    this.timer = setInterval(() => this.tick(), 1000 / SNAP_HZ);
    this.ping = setInterval(() => this.heartbeat(), 15_000);
    gauge('hub_players', () => this.byAccount.size);
    gauge('hub_rooms', () => this.rooms.size);
    gauge('hub_parties', () => this.parties.size);
    gauge('hub_instances', () => this.instances.size);
  }

  stop() {
    clearInterval(this.timer); clearInterval(this.ping);
    for (const i of this.instances.values()) if (i.closeT) clearTimeout(i.closeT);
    for (const pt of this.parties.values()) for (const t of pt.gone.values()) clearTimeout(t);
    for (const p of this.byAccount.values()) { try { p.ws.close(1001, 'servidor reiniciando'); } catch { /* já fechado */ } p.ws.terminate(); }
  }
  get online() { return this.byAccount.size; }

  private pickRoom(): Room {
    for (const r of this.rooms.values()) if (r.players.size < HUB_CAP) return r;
    const n = this.rooms.size + 1, r = new Room('vila-' + n, `Vila Brasa #${n}`);
    this.rooms.set(r.id, r); return r;
  }

  /** `where`: região em que o jogador está (chave do jogo). Fora da vila, ele não entra em sala. */
  async connect(ws: WebSocket, account: Account, where = 'hub', whereN = 0) {
    const save = (await this.store.getSave(account.id))?.data;
    const links = await this.store.friendLinks(account.id, FRIEND_REQ_DAYS).catch(() => []);
    const blocks = await this.store.blockedBy(account.id).catch(() => []);
    if (!WHERE_LABEL[where]) where = 'hub';
    const p: Player = {
      id: ++this.seq, account, ws, room: null, where, whereN: where === 'rift' ? whereN : 0, lvl: lvlOf(save), left: false,
      friends: new Set(links.filter(l => l.state === 'amigo').map(l => l.otherId)), blocks: new Set(blocks.map(b => b.id)), lastInvite: 0,
      look: lookFromSave(save), title: titleFromSave(save),
      x: 44, z: 42, yaw: 0, m: 0, a: '', lastPos: Date.now(), synced: false, dirty: true, alive: true,
      actTokens: ACT_BURST, actRefill: Date.now(), chatTokens: 3, chatRefill: Date.now(), blockedHits: [], lastEmote: 0, lastLook: 0, timeReqs: 0, relayTokens: RELAY_PER_SEC, relayRefill: Date.now(),
    };
    const old = this.byAccount.get(account.id);
    this.byAccount.set(account.id, p);
    if (old) { send(old, { t: 'kick', reason: 'Sua conta entrou em outro lugar.' }); old.ws.close(4000, 'duplicada'); this.leave(old); }
    if (where === 'hub') this.enterRoom(p);
    else send(p, { t: 'welcome', id: p.id, room: '', players: [], v: PROTOCOL_VERSION, now: Date.now() });
    inc('hub_joins');
    ws.on('message', (raw, isBinary) => { if (isBinary) return; this.onMessage(p, raw.toString()); });
    ws.on('pong', () => { p.alive = true; });
    ws.on('close', () => this.leave(p));
    ws.on('error', () => this.leave(p));
    // Grupo: quem volta dentro do tempo de tolerância continua no grupo.
    const party = this.partyOf.get(account.id);
    if (party) { const t = party.gone.get(account.id); if (t) { clearTimeout(t); party.gone.delete(account.id); } party.info.set(account.id, { name: account.name, cls: p.look.cls, lvl: p.lvl }); this.sendParty(party); }
    if (!old) this.notifyFriends(p, 'online');
  }

  private enterRoom(p: Player, room: Room = this.pickRoom()) {
    if (room.inst?.closeT) { clearTimeout(room.inst.closeT); room.inst.closeT = null; }
    p.room = room; p.synced = false; p.dirty = true;
    room.players.set(p.id, p);
    send(p, { t: 'welcome', id: p.id, room: room.label, players: [...room.players.values()].filter(o => o !== p).map(pub), v: PROTOCOL_VERSION, now: Date.now() });
    room.broadcast({ t: 'join', p: pub(p) }, p);
    if (room.inst) this.pickHost(room.inst);
  }
  private leaveRoom(p: Player) {
    const room = p.room; if (!room) return;
    p.room = null;
    if (!room.players.delete(p.id)) return;
    room.broadcast({ t: 'leave', id: p.id });
    if (room.inst) { if (!room.players.size) this.scheduleClose(room.inst); else { this.pickHost(room.inst); this.sendParty(room.inst.party); } }
    else if (!room.players.size && this.rooms.size > 1) this.rooms.delete(room.id);
  }

  private leave(p: Player) {
    if (p.left) return;
    p.left = true;
    this.leaveRoom(p);
    if (this.byAccount.get(p.account.id) !== p) return;      // a conta já entrou de novo em outra conexão
    this.byAccount.delete(p.account.id);
    this.store.updateAccount(p.account.id, { lastSeen: new Date() }).catch(() => {});
    this.notifyFriends(p, 'offline');
    const party = this.partyOf.get(p.account.id);
    if (party) {
      party.gone.set(p.account.id, setTimeout(() => { party.gone.delete(p.account.id); this.leaveParty(p.account.id, 'caiu'); }, this.graceMs));
      this.sendParty(party);
    }
  }

  private onMessage(p: Player, raw: string) {
    inc('hub_messages');
    if (raw.length > 4096) return;
    let msg: any; try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg !== 'object') return;
    switch (msg.t) {
      case 'pos': return p.room ? this.onPos(p, msg) : undefined;
      case 'chat': return void this.onChat(p, msg.text);
      case 'emote': return p.room ? this.onEmote(p, msg.e) : undefined;
      case 'act': return p.room ? this.onAct(p, msg) : undefined;
      case 'time': if (p.timeReqs++ < 20 && typeof msg.c === 'number' && Number.isFinite(msg.c)) send(p, { t: 'time', c: msg.c, s: Date.now() }); return;
      case 'look': return this.onLook(p, msg.look);
      case 'where': return this.onWhere(p, msg.r, msg.n, msg.i);
      case 'iopen': return this.openInst(p, msg);
      case 'hx': case 'gx': case 'hto': case 'px': return this.relay(p, msg, raw.length);
      case 'ijoin': return this.joinInst(p, msg.inst);
      case 'pinvite': return void this.invite(p, msg.name);
      case 'paccept': return this.accept(p, msg.from);
      case 'pdecline': return this.decline(p, msg.from);
      case 'pleave': return void this.leaveParty(p.account.id, 'saiu');
      case 'pkick': return this.kick(p, msg.name);
      case 'plead': return this.lead(p, msg.name);
    }
  }

  private onPos(p: Player, m: any) {
    let x = num(m.x), z = num(m.z); const yaw = num(m.yaw), mv = num(m.m);
    if (x === null || z === null || yaw === null || mv === null) return;
    const B = p.room!.bounds; x = Math.min(B.x1, Math.max(B.x0, x)); z = Math.min(B.z1, Math.max(B.z0, z));
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
    if (!p.room) return this.partyChat(p, clean);              // fora da vila, o chat vai para o grupo
    const masked = await this.filterChat(p, clean); if (masked === null) return;
    const room = p.room; if (!room) return;
    const s = JSON.stringify({ t: 'chat', id: p.id, name: p.account.name, text: masked, ts: now } satisfies ServerMsg);
    // Quem bloqueou o autor não recebe a mensagem.
    for (const o of room.players.values()) if (o.ws.readyState === 1 && !o.blocks.has(p.account.id)) o.ws.send(s);
    inc('hub_chat');
    this.store.logChat(p.account.id, room.id, clean).catch(e => this.log.warn({ err: e }, 'falha ao registrar chat'));
  }

  /** Cota, filtro e silêncio automático, iguais para a vila e o grupo. Devolve o texto mascarado, ou null se não pode falar agora. */
  private async filterChat(p: Player, clean: string): Promise<string | null> {
    const now = Date.now();
    p.chatTokens = Math.min(3, p.chatTokens + (now - p.chatRefill) / 2000); p.chatRefill = now;
    if (p.chatTokens < 1) { send(p, { t: 'sys', text: 'Calma! Espere um pouco para falar de novo.' }); return null; }
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
    return masked;
  }

  private command(p: Player, c: string) {
    const sp = c.indexOf(' '), cmd = (sp < 0 ? c : c.slice(0, sp)).toLowerCase(), arg = sp < 0 ? '' : c.slice(sp + 1).trim();
    const sys = (text: string) => send(p, { t: 'sys', text });
    switch (cmd) {
      case '/quem': return p.room ? sys(`${p.room.label}: ${[...p.room.players.values()].map(o => o.account.name).join(', ')}`) : sys('Você não está na vila.');
      case '/sala': return p.room ? sys(`Você está em ${p.room.label} (${p.room.players.size}/${HUB_CAP}).`) : sys('Você não está na vila.');
      case '/g': case '/grupo': return arg ? void this.partyChat(p, arg) : sys('Use /g mensagem para falar com o grupo.');
      case '/convidar': return arg ? void this.invite(p, arg) : sys('Use /convidar Nome.');
      case '/sair': return void (this.leaveParty(p.account.id, 'saiu') || sys('Você não está em um grupo.'));
      case '/lider': return arg ? this.lead(p, arg) : sys('Use /lider Nome.');
      case '/tirar': return arg ? this.kick(p, arg) : sys('Use /tirar Nome.');
      case '/amigo': return arg ? void this.friendCommand(p, arg) : sys('Use /amigo Nome.');
    }
    sys('Comandos: /quem, /sala, /g (grupo), /convidar, /sair, /lider, /tirar, /amigo.');
  }

  private onEmote(p: Player, e: unknown) {
    if (!EMOTES.includes(e as Emote) || !p.room) return;
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
    p.room?.broadcast({ t: 'act', id: p.id, a: m.a as Act, c, yaw: +p.yaw.toFixed(2) }, p);
  }

  private onLook(p: Player, look: unknown) {
    const now = Date.now(); if (now - p.lastLook < 2000) return; p.lastLook = now;
    p.look = sanitizeLook(look);
    p.room?.broadcast({ t: 'look', id: p.id, look: p.look }, p);
    const party = this.partyOf.get(p.account.id), info = party?.info.get(p.account.id);
    if (party && info && info.cls !== p.look.cls) { info.cls = p.look.cls; this.sendParty(party); }
  }

  /** Atualiza o título quando o save muda (nível, dificuldade). */
  refreshTitle(accountId: string, save: any) {
    const p = this.byAccount.get(accountId); if (!p) return;
    const lvl = lvlOf(save), party = this.partyOf.get(accountId), info = party?.info.get(accountId);
    if (lvl !== p.lvl) { p.lvl = lvl; if (party && info) { info.lvl = lvl; this.sendParty(party); } }
    const t = titleFromSave(save); if (t === p.title) return;
    p.title = t; p.room?.broadcast({ t: 'title', id: p.id, title: t });
  }

  // ---------- presença e amigos ----------
  /** Onde a conta está agora (para a lista de amigos), ou null se offline. */
  presence(accountId: string): { where: string; title: string } | null {
    const p = this.byAccount.get(accountId); if (!p) return null;
    return { where: whereLabel(p.where, p.whereN, p.room?.label), title: p.title };
  }
  /** Mantém o cache de amigos e bloqueios das conexões abertas (chamado pelas rotas). */
  friendsChanged(a: string, b: string, on: boolean) {
    for (const [x, y] of [[a, b], [b, a]]) { const p = this.byAccount.get(x); if (p) on ? p.friends.add(y) : p.friends.delete(y); }
  }
  blockChanged(accountId: string, otherId: string, on: boolean) {
    const p = this.byAccount.get(accountId); if (p) on ? p.blocks.add(otherId) : p.blocks.delete(otherId);
    if (on) this.friendsChanged(accountId, otherId, false);
  }
  notify(accountId: string, msg: ServerMsg) { const p = this.byAccount.get(accountId); if (p) send(p, msg); }
  private notifyFriends(p: Player, ev: 'online' | 'offline') {
    for (const id of p.friends) { const f = this.byAccount.get(id); if (f) send(f, { t: 'social', ev, name: p.account.name }); }
  }
  private async friendCommand(p: Player, name: string) {
    const r = await requestFriend(this.store, p.account, name).catch(() => null);
    if (!r) return send(p, { t: 'sys', text: 'Não foi possível enviar o pedido agora.' });
    if (!r.ok) return send(p, { t: 'sys', text: r.error });
    if (r.state === 'amigos') { this.friendsChanged(p.account.id, r.other.id, true); this.notify(r.other.id, { t: 'social', ev: 'aceito', name: p.account.name }); send(p, { t: 'social', ev: 'aceito', name: r.other.name }); return; }
    this.notify(r.other.id, { t: 'social', ev: 'pedido', name: p.account.name });
    send(p, { t: 'sys', text: `Pedido de amizade enviado para ${r.other.name}.` });
  }

  // ---------- onde o jogador está ----------
  private onWhere(p: Player, r: unknown, n: unknown, i?: unknown) {
    if (typeof r !== 'string' || !WHERE_LABEL[r]) return;
    const whereN = r === 'rift' && Number.isInteger(n) && (n as number) > 0 && (n as number) < 1000 ? (n as number) : 0;
    // Na Fenda do grupo, a sala é a da instância; na vila, uma sala da vila; no resto, nenhuma.
    const inst = r === 'rift' && Number.isInteger(i) ? this.partyOf.get(p.account.id)?.inst : null;
    const target: Room | 'vila' | null = inst && inst.id === i && (inst.room.players.has(p.id) || inst.room.players.size < INST_CAP) ? inst.room : r === 'hub' ? 'vila' : null;
    const same = target === 'vila' ? !!p.room && !p.room.inst : target === p.room;
    p.where = r; p.whereN = whereN;
    if (!same) {
      if (p.room) this.leaveRoom(p);
      if (target === 'vila') this.enterRoom(p);
      else if (target) { this.enterRoom(p, target); this.sendParty(target.inst!.party); }
      else if (r === 'rift' && Number.isInteger(i)) send(p, { t: 'iclosed', inst: i as number });
    }
    const party = this.partyOf.get(p.account.id); if (party) this.sendParty(party);
  }

  // ---------- instâncias (co-op na Fenda) ----------
  private openInst(p: Player, m: any) {
    const pt = this.partyOf.get(p.account.id);
    if (!pt) return send(p, { t: 'sys', text: 'Você precisa estar num grupo para abrir a Fenda para o grupo.' });
    if (pt.leader !== p.account.id) return send(p, { t: 'sys', text: 'Só o líder abre a Fenda para o grupo.' });
    const word = (v: unknown) => typeof v === 'string' && /^[a-z]{1,14}$/.test(v);
    const L = m.L, aff = Array.isArray(m.aff) ? m.aff : null;
    if (!Number.isInteger(L) || L < 1 || L > 200 || !RIFT_BASES.includes(m.base) || !word(m.boss) || !aff || aff.length > 4 || !aff.every(word)) return;
    if (pt.inst && pt.inst.room.players.size && !(pt.inst.room.players.size === 1 && pt.inst.room.players.has(p.id))) return send(p, { t: 'sys', text: 'O grupo ainda está numa Fenda.' });
    if (pt.inst) this.closeInst(pt.inst);
    const id = ++this.instSeq, room = new Room('inst-' + id, `Fenda ${L}`);
    const inst: Instance = { host: 0, id, party: pt, kind: 'rift', L, base: m.base, aff: aff.slice(), boss: m.boss, seed: 1 + Math.floor(Math.random() * 2147483000), room, closeT: null };
    room.bounds = INST_BOUNDS; room.inst = inst; pt.inst = inst; this.instances.set(id, inst);
    send(p, this.enterMsg(inst));
    for (const mid of pt.members) if (mid !== p.account.id) this.notify(mid, { t: 'iready', inst: id, kind: 'rift', L, by: p.account.name, ms: INST_READY_MS });
    this.scheduleClose(inst);   // se ninguém entrar, fecha sozinha
    this.sendParty(pt);
    inc('hub_inst_open');
  }
  private joinInst(p: Player, id: unknown) {
    const inst = this.partyOf.get(p.account.id)?.inst;
    if (!inst || inst.id !== id) return send(p, { t: 'sys', text: 'Essa Fenda já fechou.' });
    if (inst.room.players.size >= INST_CAP && !inst.room.players.has(p.id)) return send(p, { t: 'sys', text: 'A Fenda do grupo está cheia.' });
    send(p, this.enterMsg(inst));
  }
  /** Anfitrião da instância: o líder do grupo, se estiver dentro; senão quem está há mais tempo. */
  private pickHost(inst: Instance) {
    const ps = [...inst.room.players.values()];
    const leader = ps.find(q => q.account.id === inst.party.leader);
    const h = leader ?? ps[0];
    const id = h ? h.id : 0;
    if (id !== inst.host || h) { inst.host = id; if (id) inst.room.broadcast({ t: 'ihost', id }); }
  }
  /** Repasse do combate na instância. O servidor não lê o conteúdo; só confere quem pode mandar o quê, tamanho e ritmo. */
  private relay(p: Player, m: any, bytes: number) {
    const inst = p.room?.inst; if (!inst || bytes > RELAY_MAX_BYTES || m.d === null || typeof m.d !== 'object') return;
    const now = Date.now();
    p.relayTokens = Math.min(RELAY_PER_SEC, p.relayTokens + (now - p.relayRefill) / 1000 * RELAY_PER_SEC); p.relayRefill = now;
    if (p.relayTokens < 1) { inc('hub_relay_drops'); return; }
    p.relayTokens -= 1;
    const isHost = inst.host === p.id;
    if (m.t === 'hx' && isHost) inst.room.broadcast({ t: 'hx', from: p.id, d: m.d }, p);
    else if (m.t === 'hto' && isHost) { const to = inst.room.players.get(m.to); if (to) send(to, { t: 'hx', from: p.id, d: m.d }); }
    else if (m.t === 'px') {   // entre jogadores: para um (to) ou para todos da instância
      if (m.to === undefined) inst.room.broadcast({ t: 'px', from: p.id, d: m.d }, p);
      else { const to = inst.room.players.get(m.to); if (to && to !== p) send(to, { t: 'px', from: p.id, d: m.d }); }
    }
    else if (m.t === 'gx' && !isHost) { const h = inst.room.players.get(inst.host); if (h) send(h, { t: 'gx', from: p.id, d: m.d }); }
  }
  private enterMsg(i: Instance): ServerMsg { return { t: 'ienter', inst: i.id, kind: 'rift', rift: { L: i.L, base: i.base, aff: i.aff, boss: i.boss, seed: i.seed } }; }
  private scheduleClose(inst: Instance) {
    if (inst.closeT) clearTimeout(inst.closeT);
    inst.closeT = setTimeout(() => { if (!inst.room.players.size) this.closeInst(inst); else inst.closeT = null; }, this.instEmptyMs);
  }
  private closeInst(inst: Instance) {
    if (inst.closeT) clearTimeout(inst.closeT);
    inst.closeT = null;
    for (const p of [...inst.room.players.values()]) { this.leaveRoomQuiet(p); send(p, { t: 'iclosed', inst: inst.id }); }
    this.instances.delete(inst.id);
    if (inst.party.inst === inst) { inst.party.inst = null; if (this.parties.has(inst.party.id)) this.sendParty(inst.party); }
  }
  /** Tira da sala sem disparar o fechamento (usado ao fechar a própria instância). */
  private leaveRoomQuiet(p: Player) { const room = p.room; if (!room) return; p.room = null; room.players.delete(p.id); room.broadcast({ t: 'leave', id: p.id }); }

  // ---------- grupo ----------
  private onlineByName(name: string): Player | null {
    const n = name.trim().toLowerCase(); if (!n) return null;
    for (const p of this.byAccount.values()) if (p.account.name.toLowerCase() === n) return p;
    return null;
  }
  private partyView(pt: Party): PartyView {
    return {
      id: pt.id, leader: pt.info.get(pt.leader)?.name ?? '',
      members: pt.members.map(id => {
        const i = pt.info.get(id)!, p = this.byAccount.get(id);
        return { name: i.name, cls: i.cls, lvl: i.lvl, online: !!p, where: p ? whereLabel(p.where, p.whereN, p.room?.label) : '', leader: id === pt.leader };
      }),
      inst: pt.inst ? { id: pt.inst.id, kind: pt.inst.kind, L: pt.inst.L, n: pt.inst.room.players.size } : null,
    };
  }
  private sendParty(pt: Party) {
    const msg: ServerMsg = { t: 'party', party: this.partyView(pt) };
    for (const id of pt.members) this.notify(id, msg);
  }
  private partySys(pt: Party, text: string, except?: string) { for (const id of pt.members) if (id !== except) this.notify(id, { t: 'sys', text }); }

  private async invite(p: Player, name: unknown) {
    const sys = (text: string) => send(p, { t: 'sys', text });
    if (typeof name !== 'string' || !name.trim()) return sys('Use /convidar Nome.');
    const now = Date.now(); if (now - p.lastInvite < 1000) return; p.lastInvite = now;
    const t = this.onlineByName(name);
    if (!t) return sys(`${name.trim().slice(0, 20)} não está online.`);
    if (t === p) return sys('Você não pode convidar a si mesmo.');
    const party = this.partyOf.get(p.account.id), theirs = this.partyOf.get(t.account.id);
    if (party && party.leader !== p.account.id) return sys('Só o líder do grupo pode convidar.');
    if (party && party.members.length >= PARTY_MAX) return sys(`Seu grupo está cheio (${PARTY_MAX}).`);
    if (theirs && theirs === party) return sys(`${t.account.name} já está no seu grupo.`);
    if (theirs) return sys(`${t.account.name} já está em um grupo.`);
    // Amigos se convidam de qualquer lugar; os outros, só na mesma sala da vila.
    if (!p.friends.has(t.account.id)) {
      if (!p.room || !t.room) return sys('Fora da vila, só dá para convidar amigos.');
      if (p.room !== t.room) return sys(`${t.account.name} está em outra sala da vila. Adicione como amigo para convidar de qualquer lugar.`);
    }
    if (p.blocks.has(t.account.id) || t.blocks.has(p.account.id) || await this.store.isBlocked(p.account.id, t.account.id).catch(() => true)) return sys(`Não foi possível convidar ${t.account.name}.`);
    let inv = this.invites.get(t.account.id); if (!inv) this.invites.set(t.account.id, inv = new Map());
    for (const [k, v] of inv) if (v.exp < now) inv.delete(k);
    inv.set(p.account.id, { name: p.account.name, exp: now + this.inviteMs });
    send(t, { t: 'pinvite', from: p.account.name, size: party ? party.members.length : 1, ms: this.inviteMs });
    sys(`Convite enviado para ${t.account.name}.`);
    inc('party_invites');
  }

  private takeInvite(p: Player, from: unknown): [string, { name: string; exp: number }] | null {
    if (typeof from !== 'string') return null;
    const inv = this.invites.get(p.account.id); if (!inv) return null;
    const f = from.trim().toLowerCase();
    for (const [id, v] of inv) if (v.name.toLowerCase() === f) { inv.delete(id); if (!inv.size) this.invites.delete(p.account.id); return [id, v]; }
    return null;
  }

  private accept(p: Player, from: unknown) {
    const sys = (text: string) => send(p, { t: 'sys', text });
    const got = this.takeInvite(p, from);
    if (!got || got[1].exp < Date.now()) return sys('Esse convite expirou.');
    const [fromId, { name }] = got, mine = this.partyOf.get(p.account.id);
    let party = this.partyOf.get(fromId);
    if (mine && mine === party) return;
    if (mine) return sys('Saia do seu grupo antes de entrar em outro (/sair).');
    const inviter = this.byAccount.get(fromId);
    if (!party) {
      if (!inviter) return sys(`${name} saiu do jogo.`);
      party = { id: ++this.partySeq, leader: fromId, members: [fromId], info: new Map([[fromId, { name: inviter.account.name, cls: inviter.look.cls, lvl: inviter.lvl }]]), gone: new Map() };
      this.parties.set(party.id, party); this.partyOf.set(fromId, party);
    }
    if (party.members.length >= PARTY_MAX) return sys(`O grupo de ${name} está cheio.`);
    party.members.push(p.account.id); this.partyOf.set(p.account.id, party);
    party.info.set(p.account.id, { name: p.account.name, cls: p.look.cls, lvl: p.lvl });
    this.partySys(party, `${p.account.name} entrou no grupo.`);
    this.sendParty(party);
    inc('party_joins');
  }

  private decline(p: Player, from: unknown) {
    const got = this.takeInvite(p, from); if (!got) return;
    this.notify(got[0], { t: 'sys', text: `${p.account.name} recusou o convite.` });
  }

  /** Tira a conta do grupo. Devolve false se ela não estava em um. */
  private leaveParty(accountId: string, why: 'saiu' | 'tirado' | 'caiu'): boolean {
    const pt = this.partyOf.get(accountId); if (!pt) return false;
    const name = pt.info.get(accountId)?.name ?? '?';
    pt.members = pt.members.filter(id => id !== accountId); this.partyOf.delete(accountId); pt.info.delete(accountId);
    const inside = this.byAccount.get(accountId);
    if (inside?.room?.inst && inside.room.inst.party === pt) { const id = inside.room.inst.id; this.leaveRoom(inside); send(inside, { t: 'iclosed', inst: id }); }
    const t = pt.gone.get(accountId); if (t) { clearTimeout(t); pt.gone.delete(accountId); }
    this.notify(accountId, { t: 'party', party: null });
    if (why === 'tirado') this.notify(accountId, { t: 'sys', text: 'Você foi tirado do grupo.' });
    else if (why === 'saiu') this.notify(accountId, { t: 'sys', text: 'Você saiu do grupo.' });
    if (pt.members.length <= 1) {
      for (const id of pt.members) { this.partyOf.delete(id); const g = pt.gone.get(id); if (g) clearTimeout(g); this.notify(id, { t: 'party', party: null }); this.notify(id, { t: 'sys', text: 'O grupo acabou.' }); }
      this.parties.delete(pt.id);
      if (pt.inst) this.closeInst(pt.inst);
      return true;
    }
    this.partySys(pt, why === 'tirado' ? `${name} foi tirado do grupo.` : why === 'caiu' ? `${name} caiu da conexão e saiu do grupo.` : `${name} saiu do grupo.`);
    if (pt.leader === accountId) { pt.leader = pt.members[0]; this.partySys(pt, `${pt.info.get(pt.leader)!.name} agora é o líder.`); }
    this.sendParty(pt);
    return true;
  }

  private memberByName(pt: Party, name: unknown): string | null {
    if (typeof name !== 'string') return null;
    const n = name.trim().toLowerCase();
    return pt.members.find(id => pt.info.get(id)!.name.toLowerCase() === n) ?? null;
  }
  private kick(p: Player, name: unknown) {
    const pt = this.partyOf.get(p.account.id);
    if (!pt) return send(p, { t: 'sys', text: 'Você não está em um grupo.' });
    if (pt.leader !== p.account.id) return send(p, { t: 'sys', text: 'Só o líder pode tirar alguém do grupo.' });
    const id = this.memberByName(pt, name);
    if (!id || id === p.account.id) return send(p, { t: 'sys', text: 'Essa pessoa não está no seu grupo.' });
    this.leaveParty(id, 'tirado');
  }
  private lead(p: Player, name: unknown) {
    const pt = this.partyOf.get(p.account.id);
    if (!pt) return send(p, { t: 'sys', text: 'Você não está em um grupo.' });
    if (pt.leader !== p.account.id) return send(p, { t: 'sys', text: 'Só o líder pode passar a liderança.' });
    const id = this.memberByName(pt, name);
    if (!id || id === p.account.id) return send(p, { t: 'sys', text: 'Essa pessoa não está no seu grupo.' });
    pt.leader = id; this.partySys(pt, `${pt.info.get(id)!.name} agora é o líder.`); this.sendParty(pt);
  }
  private async partyChat(p: Player, text: string) {
    const pt = this.partyOf.get(p.account.id);
    if (!pt) return send(p, { t: 'sys', text: p.room ? 'Você não está em um grupo.' : 'Você não está em um grupo. O chat da vila só funciona na vila.' });
    const clean = cleanChat(text, CHAT_MAX); if (!clean) return;
    const masked = await this.filterChat(p, clean); if (masked === null) return;
    const msg: ServerMsg = { t: 'pchat', name: p.account.name, text: masked, ts: Date.now() };
    for (const id of pt.members) { const o = this.byAccount.get(id); if (o && !o.blocks.has(p.account.id)) send(o, msg); }
    inc('party_chat');
    this.store.logChat(p.account.id, 'grupo-' + pt.id, clean).catch(e => this.log.warn({ err: e }, 'falha ao registrar chat'));
  }

  private tick() {
    for (const room of [...this.rooms.values(), ...[...this.instances.values()].map(i => i.room)]) {
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
