// Estado online do jogo: conta, save na nuvem, vila em tempo real e correio.
// Exposto como window.TessNet para o código do jogo (src/game/net/remote.js).

import { API_BASE, WS_BASE, call, tokens } from './api';
import { type RiftParams, ACTS, EMOTES, type Act, type Emote, type Look, type PublicPlayer, type ServerMsg } from '../../shared/protocol';
import type { FriendsList, PartyView } from '../../shared/social';

export interface PublicAccount { id: string; name: string; guest: boolean; email: string | null; google: boolean }
export interface Remote { id: number; name: string; title: string; look: Look; tx: number; tz: number; tyaw: number; m: number; a: string; x?: number; z?: number; yaw?: number; slot?: number; emote?: Emote | null; emoteT?: number; chat?: string; chatT?: number; act?: Act | null; actT?: number }
export type SyncState = 'desligado' | 'salvo' | 'pendente' | 'enviando' | 'recusado' | 'conflito' | 'sem-rede';
export interface ChatLine { kind: 'chat' | 'sys' | 'grupo'; name?: string; text: string; ts: number; mine?: boolean }

type Listener = (ev: string, data?: any) => void;
const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
declare const __APP_VERSION__: string;

export class Net {
  enabled = !!API_BASE;
  account: PublicAccount | null = null;
  offline = false;                 // jogando offline nesta sessão (mesmo com conta)
  googleClientId: string | null = null;
  rev = 0;
  sync: SyncState = 'desligado';
  syncErrors: string[] = [];
  room = '';
  connected = false;
  chatLog: ChatLine[] = [];
  /** Grupo atual (null sem grupo) e convites recebidos ainda válidos. */
  party: PartyView | null = null;
  /** Instância do grupo em que este jogador está (ou entrando). */
  inst: number | null = null;
  /** Aviso "Pronto?" pendente. */
  ready: { inst: number; L: number; by: string; until: number } | null = null;
  invites: Array<{ from: string; size: number; exp: number }> = [];
  /** Última lista de amigos carregada (para os menus) e nomes bloqueados. */
  friendsList: FriendsList | null = null;

  private listeners = new Set<Listener>();
  private remotes = new Map<number, Remote>();
  private remoteList: Remote[] = [];
  private ws: WebSocket | null = null;
  private wantHub = false;
  private region = 'hub';
  private regionN = 0;
  private look: Look | null = null;
  private myId = 0;
  private retry = 0;
  private retryTimer: number | undefined;
  private pending: any = null;
  private flushTimer: number | undefined;
  private inflight: Promise<void> | null = null;
  private lastPos = '';
  private lastPosAt = 0;
  /** Diferença entre a hora do servidor e a deste aparelho (ms). Usada pelo relógio da vila. */
  clockOffset = 0;
  private clockRtt = Infinity;
  /** Hora do servidor, em ms: a mesma para todos os jogadores (com folga de alguns ms). */
  serverNow() { return Date.now() + this.clockOffset; }

  on(fn: Listener) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit(ev: string, data?: any) { for (const fn of this.listeners) { try { fn(ev, data); } catch (e) { console.error(e); } } }
  private setSync(s: SyncState) { if (this.sync !== s) { this.sync = s; this.emit('sync', s); } }

  // ---------- conta ----------
  async init() {
    if (!this.enabled) return;
    const cfg = await call('GET', '/config');
    if (cfg.status === 200) this.googleClientId = cfg.data.googleClientId;
    if (tokens.get()) {
      const me = await call('GET', '/me');
      if (me.status === 200) this.account = me.data.account;
      else if (me.status === 401) tokens.clear();
    }
    this.emit('account', this.account);
  }
  private async finishAuth(r: { status: number; data: any; error: string | null }) {
    if (r.error || !r.data?.token) return { ok: false as const, error: r.error || 'Falha ao entrar.' };
    tokens.set(r.data.token); this.account = r.data.account; this.offline = false; this.emit('account', this.account);
    return { ok: true as const };
  }
  login(login: string, password: string) { return call('POST', '/auth/login', { login, password }).then(r => this.finishAuth(r)); }
  register(name: string, email: string, password: string) { return call('POST', '/auth/register', { name, email, password }).then(r => this.finishAuth(r)); }
  guest() { return call('POST', '/auth/guest', {}).then(r => this.finishAuth(r)); }
  google(idToken: string) { return call('POST', '/auth/google', { idToken }).then(r => this.finishAuth(r)); }
  async upgrade(email: string, password: string, name?: string) {
    const r = await call('POST', '/auth/upgrade', { email, password, ...(name ? { name } : {}) });
    if (r.error) return { ok: false as const, error: r.error };
    this.account = r.data.account; this.emit('account', this.account); return { ok: true as const };
  }
  async rename(name: string) {
    const r = await call('PATCH', '/me', { name });
    if (r.error) return { ok: false as const, error: r.error };
    this.account = r.data.account; this.emit('account', this.account); return { ok: true as const };
  }
  async logout() {
    this.leaveHub(); await call('POST', '/auth/logout', {});
    tokens.clear(); this.account = null; this.rev = 0; this.setSync('desligado'); this.emit('account', null);
  }

  // ---------- save na nuvem ----------
  async cloudSave(): Promise<{ ok: boolean; rev: number; data: any; updatedAt?: string; error?: string }> {
    const r = await call('GET', '/save');
    if (r.error) return { ok: false, rev: 0, data: null, error: r.error };
    return { ok: true, rev: r.data.rev, data: r.data.data, updatedAt: r.data.updatedAt };
  }
  /** Grava agora (sem esperar), usado ao adotar um save. */
  async putNow(data: any, rev: number): Promise<{ ok: boolean; rev?: number; error?: string; erros?: string[]; conflict?: boolean }> {
    const r = await call('PUT', '/save', { rev, data });
    if (r.status === 200) { this.rev = r.data.rev; this.setSync('salvo'); return { ok: true, rev: r.data.rev }; }
    if (r.status === 409) return { ok: false, conflict: true, error: r.error!, rev: r.data?.rev };
    return { ok: false, error: r.error!, erros: r.data?.erros };
  }
  async resetCloud() { const r = await call('DELETE', '/save', { confirm: 'APAGAR' }); if (r.error) return { ok: false, error: r.error }; this.rev = 0; return { ok: true }; }
  adopt(rev: number) { this.rev = rev; this.offline = false; this.setSync('salvo'); }

  /** Chamado pelo jogo a cada writeSave: envia em lote, alguns segundos depois. */
  saveChanged(save: any) {
    if (!this.account || this.offline || this.sync === 'recusado' || this.sync === 'conflito') return;
    this.pending = save;
    this.setSync('pendente');
    if (this.flushTimer === undefined) this.flushTimer = window.setTimeout(() => { this.flushTimer = undefined; void this.flush(); }, 4000);
  }
  async flush(): Promise<void> {
    if (this.inflight) { await this.inflight; if (this.pending) return this.flush(); return; }
    if (!this.pending || !this.account) return;
    const data = JSON.parse(JSON.stringify(this.pending)); this.pending = null;
    this.setSync('enviando');
    this.inflight = (async () => {
      const r = await call('PUT', '/save', { rev: this.rev, data });
      if (r.status === 200) { this.rev = r.data.rev; this.setSync(this.pending ? 'pendente' : 'salvo'); this.emit('saved', this.rev); }
      else if (r.status === 409) { this.setSync('conflito'); this.emit('conflict', r.data?.rev); }
      else if (r.status === 422) { this.syncErrors = r.data?.erros || []; this.setSync('recusado'); this.emit('rejected', this.syncErrors); }
      else if (r.status === 401) { this.setSync('desligado'); this.emit('expired'); }
      else { this.pending = this.pending || data; this.setSync('sem-rede'); window.setTimeout(() => void this.flush(), 15000); }
    })();
    try { await this.inflight; } finally { this.inflight = null; }
    if (this.pending && this.sync === 'pendente' && this.flushTimer === undefined) this.flushTimer = window.setTimeout(() => { this.flushTimer = undefined; void this.flush(); }, 4000);
  }
  /** Envia o que estiver pendente imediatamente (antes do correio, ao sair). */
  async flushNow() { if (this.flushTimer !== undefined) { clearTimeout(this.flushTimer); this.flushTimer = undefined; } await this.flush(); }

  // ---------- correio ----------
  async mail(): Promise<Array<{ id: number; from: string; item: any; note: string }>> {
    const r = await call('GET', '/mail'); return r.status === 200 ? r.data.mail : [];
  }
  async sendItem(to: string, item: { id: string }, note: string) {
    await this.flushNow();
    if (this.sync === 'recusado' || this.sync === 'conflito') return { ok: false as const, error: 'Seu progresso precisa ser sincronizado antes de enviar.' };
    const r = await call('POST', '/mail/send', { to, itemId: item.id, note: note || '' });
    if (r.error) return { ok: false as const, error: r.error };
    this.rev = r.data.rev; return { ok: true as const };
  }
  async claim(id: number) {
    await this.flushNow();
    const r = await call('POST', `/mail/${id}/claim`, {});
    if (r.error) return { ok: false as const, error: r.error };
    this.rev = r.data.rev; return { ok: true as const, item: r.data.item };
  }

  // ---------- vila em tempo real ----------
  /** A conexão fica aberta em qualquer região (amigos e grupo); só na vila ela entra numa sala. */
  setRegion(key: string, look: Look, _pos: [number, number] | null, n = 0) {
    this.look = look;
    if (key !== 'rift') this.inst = null;
    const changed = key !== this.region || n !== this.regionN || (key === 'rift' && !!this.inst);
    this.region = key; this.regionN = n;
    if (key !== 'hub') { this.clearRemotes(); this.room = ''; }
    if (!this.account || this.offline) return this.leaveHub();
    this.wantHub = true;
    if (this.ws && this.ws.readyState === 1) { if (changed) this.sendWhere(); }
    else this.connect();
  }
  private sendWhere() { this.send({ t: 'where', r: this.region, ...(this.regionN ? { n: this.regionN } : {}), ...(this.region === 'rift' && this.inst ? { i: this.inst } : {}) }); }
  // ---------- Fenda do grupo ----------
  /** Líder: abre a Fenda para o grupo (o servidor sorteia a semente e manda o Pronto? aos outros). */
  openRift(L: number, base: string, aff: string[], boss: string) { this.send({ t: 'iopen', kind: 'rift', L, base, aff, boss }); }
  /** Aceitar o Pronto? (ou "Entrar com o grupo" depois). */
  joinInst(id: number) { this.ready = null; this.send({ t: 'ijoin', inst: id }); }
  declineReady() { this.ready = null; this.emit('iready', null); }
  /** O jogo chama ao gerar a Fenda do grupo: daqui em diante o 'where' leva a instância. */
  enteringInst(id: number) { this.inst = id; }
  /** Em grupo e líder: os portais de Fenda abrem para o grupo. */
  get groupRift() { return !!this.party && this.party.members.length > 1 && this.isLeader && this.connected; }
  /** Na vila e com a sala conectada. */
  get inRoom() { return this.connected && !!this.room; }
  setLook(look: Look) { this.look = look; this.send({ t: 'look', look }); }
  players(): Remote[] { return this.remoteList; }
  sendPos(x: number, z: number, yaw: number, m: number, a: string) {
    const k = `${x.toFixed(2)},${z.toFixed(2)},${yaw.toFixed(2)},${m.toFixed(2)},${a}`;
    // Repete a posição parada 1x/s: se o servidor limitou um salto (anti-teleporte),
    // ele converge para a posição real mesmo com o jogador imóvel.
    const now = Date.now();
    if (k === this.lastPos && now - this.lastPosAt < 1000) return;
    this.lastPos = k; this.lastPosAt = now;
    this.send({ t: 'pos', x, z, yaw, m, a });
  }
  /** Envia no quadro em que a ação começa, para quem assiste ver o início da animação. */
  sendAct(a: Act, c: number, yaw: number) { if (ACTS.includes(a) && this.room) this.send({ t: 'act', a, c, yaw }); }
  chat(text: string) { if (text.trim()) this.send({ t: 'chat', text }); }
  emote(e: Emote) { if (EMOTES.includes(e)) this.send({ t: 'emote', e }); }

  // ---------- grupo ----------
  invite(name: string) { this.send({ t: 'pinvite', name }); }
  acceptInvite(from: string) { this.invites = this.invites.filter(i => i.from !== from); this.send({ t: 'paccept', from }); }
  declineInvite(from: string) { this.invites = this.invites.filter(i => i.from !== from); this.send({ t: 'pdecline', from }); }
  leaveParty() { this.send({ t: 'pleave' }); }
  kick(name: string) { this.send({ t: 'pkick', name }); }
  lead(name: string) { this.send({ t: 'plead', name }); }
  partyChat(text: string) { if (text.trim()) this.send({ t: 'chat', text: '/g ' + text }); }
  get isLeader() { return !!this.party && this.party.leader === this.account?.name; }

  // ---------- amigos ----------
  async friends(): Promise<FriendsList | null> {
    if (!this.account) return null;
    const r = await call('GET', '/friends');
    if (r.status === 200) { this.friendsList = r.data; this.emit('friends', r.data); }
    return this.friendsList;
  }
  private async social(path: string, name: string) {
    const r = await call('POST', path, { name });
    if (r.error) return { ok: false as const, error: r.error };
    void this.friends(); return { ok: true as const, state: r.data?.state as string | undefined };
  }
  addFriend(name: string) { return this.social('/friends', name); }
  acceptFriend(name: string) { return this.social('/friends/accept', name); }
  removeFriend(name: string) { return this.social('/friends/remove', name); }
  block(name: string) { return this.social('/blocks', name); }
  unblock(name: string) { return this.social('/blocks/remove', name); }
  isFriend(name: string) { const n = name.toLowerCase(); return !!this.friendsList?.friends.some(f => f.name.toLowerCase() === n); }

  private send(m: object) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m)); }
  private connect() {
    if (!WS_BASE || !tokens.get() || (this.ws && this.ws.readyState <= 1)) return;
    clearTimeout(this.retryTimer);
    const ws = new WebSocket(`${WS_BASE}?token=${encodeURIComponent(tokens.get()!)}&r=${encodeURIComponent(this.region)}${this.regionN ? '&n=' + this.regionN : ''}`);
    this.ws = ws;
    ws.onopen = () => { this.retry = 0; };
    ws.onmessage = ev => { try { this.onMsg(JSON.parse(ev.data)); } catch (e) { console.error(e); } };
    ws.onclose = ev => {
      if (this.ws !== ws) return;
      this.ws = null; this.connected = false; this.room = ''; this.clearRemotes(); this.emit('hub', { connected: false });
      if (this.wantHub && ev.code !== 4000) { const wait = Math.min(15000, 1000 * 2 ** this.retry++); this.retryTimer = window.setTimeout(() => this.connect(), wait); }
    };
  }
  leaveHub() {
    this.wantHub = false; clearTimeout(this.retryTimer);
    if (this.ws) { const ws = this.ws; this.ws = null; ws.close(1000); }
    if (this.connected) { this.connected = false; this.emit('hub', { connected: false }); }
    this.room = ''; this.clearRemotes();
    if (this.party) { this.party = null; this.emit('party', null); }
    this.invites = [];
  }
  private clearRemotes() { this.remotes.clear(); this.remoteList = []; }
  private addRemote(p: PublicPlayer) {
    const r: Remote = { id: p.id, name: p.name, title: p.title, look: p.look, tx: p.x, tz: p.z, tyaw: p.yaw, m: 0, a: '' };
    this.remotes.set(p.id, r); this.remoteList = [...this.remotes.values()];
  }
  private onMsg(m: ServerMsg) {
    const G = (window as any).TessGame;
    switch (m.t) {
      case 'welcome':
        if (typeof m.now === 'number' && this.clockRtt === Infinity) this.clockOffset = m.now - Date.now();
        for (let i = 0; i < 3; i++) setTimeout(() => this.send({ t: 'time', c: Date.now() }), 200 + i * 400);
        this.myId = m.id; this.room = m.room; this.connected = true; this.clearRemotes(); m.players.forEach(p => this.addRemote(p));
        this.lastPos = ''; if (this.look) this.send({ t: 'look', look: this.look });
        {
          // A sala recebida não bate com onde o jogador está (voltou para a vila, ou reconectou dentro
          // da Fenda do grupo): avisa onde está, sempre com a instância. Já na sala certa, não reenvia
          // (reenviar sem a instância tirava o jogador da Fenda do grupo).
          const wantRoom = this.region === 'hub' || (this.region === 'rift' && !!this.inst);
          if (!!m.room !== wantRoom || (!m.room && this.regionN)) this.sendWhere();
        }
        this.emit('hub', { connected: true, room: m.room, count: this.remotes.size + 1 }); void this.friends(); break;
      case 'join': this.addRemote(m.p); this.emit('hub', { connected: true, room: this.room, count: this.remotes.size + 1, joined: m.p.name }); break;
      case 'leave': { const r = this.remotes.get(m.id); this.remotes.delete(m.id); this.remoteList = [...this.remotes.values()]; this.emit('hub', { connected: true, room: this.room, count: this.remotes.size + 1, left: r?.name }); break; }
      case 'snap': for (const [id, x, z, yaw, mv, a] of m.ps) { const r = this.remotes.get(id); if (r) { r.tx = x; r.tz = z; r.tyaw = yaw; r.m = mv; r.a = a; } } break;
      case 'chat': {
        const mine = m.id === this.myId;
        this.pushChat({ kind: 'chat', name: m.name, text: m.text, ts: m.ts, mine });
        if (!mine) G?.remoteChat(m.id, m.text); break;
      }
      case 'emote': if (m.id === this.myId) G?.myEmote(m.e); else G?.remoteEmote(m.id, m.e); break;
      case 'act': if (m.id !== this.myId && this.remotes.has(m.id)) G?.remoteAct(m.id, m.a, m.c, m.yaw); break;
      case 'time': {
        // Mini-NTP: fica com a medida de menor ida e volta.
        const now = Date.now(), rtt = now - m.c;
        if (rtt >= 0 && rtt < this.clockRtt) { this.clockRtt = rtt; this.clockOffset = m.s + rtt / 2 - now; }
        break;
      }
      case 'look': { const r = this.remotes.get(m.id); if (r) r.look = m.look; break; }
      case 'title': { const r = this.remotes.get(m.id); if (r) r.title = m.title; break; }
      case 'sys': this.pushChat({ kind: 'sys', text: m.text, ts: Date.now() }); break;
      case 'party': this.party = m.party; this.emit('party', m.party); break;
      case 'iready': this.ready = { inst: m.inst, L: m.L, by: m.by, until: Date.now() + m.ms }; this.emit('iready', this.ready); break;
      case 'ienter': this.ready = null; G?.startGroupRift(m.inst, m.rift as RiftParams); break;
      case 'iclosed':
        if (this.ready?.inst === m.inst) { this.ready = null; this.emit('iready', null); }
        if (this.inst === m.inst) { this.inst = null; this.emit('iclosed', m.inst); }
        break;
      case 'pinvite':
        this.invites = this.invites.filter(i => i.from !== m.from && i.exp > Date.now());
        this.invites.push({ from: m.from, size: m.size, exp: Date.now() + m.ms }); this.emit('pinvite', m); break;
      case 'pchat': this.pushChat({ kind: 'grupo', name: m.name, text: m.text, ts: m.ts, mine: m.name === this.account?.name }); break;
      case 'social': this.emit('social', m); void this.friends(); break;
      case 'kick': this.wantHub = false; this.pushChat({ kind: 'sys', text: m.reason, ts: Date.now() }); this.emit('kick', m.reason); break;
    }
  }
  private pushChat(l: ChatLine) { this.chatLog.push(l); if (this.chatLog.length > 60) this.chatLog.shift(); this.emit('chat', l); }

  // ---------- telemetria de erros ----------
  private sentErrors = 0;
  private seen = new Set<string>();
  reportError(message: string, stack = '') {
    if (!this.enabled || this.sentErrors >= 8) return;
    const key = message.slice(0, 120); if (this.seen.has(key)) return; this.seen.add(key); this.sentErrors++;
    void call('POST', '/telemetry/error', { version: VERSION, message: message.slice(0, 500), stack: stack.slice(0, 4000), url: location.pathname });
  }
}
