// Estado online do jogo: conta, save na nuvem, vila em tempo real e correio.
// Exposto como window.TessNet para o código do jogo (src/game/net/remote.js).

import { API_BASE, WS_BASE, call, tokens } from './api';
import { type RiftParams, ACTS, EMOTES, type Act, type Emote, type Look, type PublicPlayer, type ServerMsg } from '../../shared/protocol';
import type { FriendsList, PartyView } from '../../shared/social';

export interface PublicAccount { id: string; name: string; guest: boolean; email: string | null; google: boolean; password?: boolean }
export interface Remote { id: number; name: string; title: string; look: Look; tx: number; tz: number; tyaw: number; m: number; a: string; x?: number; z?: number; yaw?: number; slot?: number; emote?: Emote | null; emoteT?: number; chat?: string; chatT?: number; act?: Act | null; actT?: number }
export type SyncState = 'desligado' | 'salvo' | 'pendente' | 'enviando' | 'recusado' | 'conflito' | 'sem-rede';
export interface ChatLine { kind: 'chat' | 'sys' | 'grupo' | 'guilda'; name?: string; text: string; ts: number; mine?: boolean; ch?: string }

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
  /** Região da instância do grupo: 'rift' (Fenda) ou 'wilds' (Ermos). */
  instKind: 'rift' | 'wilds' = 'rift';
  /** Quem simula o combate na instância (id de jogador na sala). */
  hostId = 0;
  /** Aviso "Pronto?" pendente. */
  ready: { inst: number; L: number; by: string; until: number; kind: 'rift' | 'wilds' } | null = null;
  invites: Array<{ from: string; size: number; exp: number }> = [];
  /** Duelos: desafios recebidos e o duelo em andamento (go e end em hora local). */
  duelInvites: Array<{ from: string; exp: number }> = [];
  duel: { opp: number; name: string; go: number; end: number } | null = null;
  /** Última lista de amigos carregada (para os menus) e nomes bloqueados. */
  friendsList: FriendsList | null = null;
  /** Espólios no chão da sala dos Ermos (de quem caiu): id → posição, dono, Centelhas, nº de itens e quando some. */
  loots = new Map<string, { id: string; x: number; z: number; by: number; name: string; gold: number; n: number; exp: number }>();

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
  // ---------- LGPD e reportes ----------
  /** Todos os dados da conta (JSON), para baixar. */
  async exportData() { const r = await call('GET', '/account/export', undefined, 20000); return r.error ? { ok: false as const, error: r.error } : { ok: true as const, data: r.data }; }
  /** Exclui a conta de vez (pede o nome do Tecelão e a senha, se houver). Sai da conta em seguida. */
  async deleteAccount(confirm: string, password?: string) {
    const r = await call('POST', '/account/delete', { confirm, password });
    if (r.error) return { ok: false as const, error: r.error };
    this.leaveHub(); tokens.clear(); this.account = null; this.rev = 0; this.setSync('desligado'); this.emit('account', null);
    return { ok: true as const };
  }
  /** Reporta um problema ou um jogador (funciona sem conta também). */
  async report(kind: 'bug' | 'jogador' | 'pagamento' | 'outro', text: string, target?: string, ctx?: Record<string, string | number | boolean>) {
    const r = await call('POST', '/report', { kind, text, target, ctx });
    return r.error ? { ok: false as const, error: r.error } : { ok: true as const };
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
    if (key !== this.instKind) { this.inst = null; this.hostId = 0; }
    const changed = key !== this.region || n !== this.regionN || (key === this.instKind && !!this.inst);
    this.region = key; this.regionN = n;
    if (key !== 'hub') { this.clearRemotes(); this.room = ''; }
    if (!this.account || this.offline) return this.leaveHub();
    this.wantHub = true;
    if (this.ws && this.ws.readyState === 1) { if (changed) this.sendWhere(); }
    else this.connect();
  }
  private sendWhere() { this.send({ t: 'where', r: this.region, ...(this.regionN ? { n: this.regionN } : {}), ...(this.region === this.instKind && this.inst ? { i: this.inst } : {}) }); }
  // ---------- Fenda do grupo ----------
  /** Líder: abre a Fenda para o grupo (o servidor sorteia a semente e manda o Pronto? aos outros). */
  openRift(L: number, base: string, aff: string[], boss: string) { this.send({ t: 'iopen', kind: 'rift', L, base, aff, boss }); }
  /** Líder: abre os Ermos para o grupo (mesmo mapa para todos; o servidor manda o Pronto?). */
  openWilds() { this.send({ t: 'iopen', kind: 'wilds' }); }
  /** Aceitar o Pronto? (ou "Entrar com o grupo" depois). */
  joinInst(id: number) { this.ready = null; this.send({ t: 'ijoin', inst: id }); }
  declineReady() { this.ready = null; this.emit('iready', null); }
  /** O jogo chama ao gerar a Fenda do grupo: daqui em diante o 'where' leva a instância. */
  enteringInst(id: number, kind: 'rift' | 'wilds' = 'rift') { this.inst = id; this.instKind = kind; }
  /** Em grupo e líder: os portais de Fenda abrem para o grupo. */
  /** Este jogo simula inimigos e chefe da instância. */
  get isHost() { return !!this.inst && !!this.room && this.hostId === this.myId; }
  /** Id deste jogador na sala atual. */
  get selfId() { return this.myId; }
  hx(d: object) { this.send({ t: 'hx', d }); }
  gx(d: object) { this.send({ t: 'gx', d }); }
  hto(to: number, d: object) { this.send({ t: 'hto', to, d }); }
  /** Anfitrião: monstro derrotado na Fenda do grupo (o servidor sorteia o loot de cada um). */
  ikill(n: number, el: boolean, th: boolean, x: number, z: number, b?: number) { this.send({ t: 'ikill', n, el: el ? 1 : 0, th: th ? 1 : 0, x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, ...(b === undefined ? {} : { b }) }); }
  px(d: object, to?: number) { this.send(to === undefined ? { t: 'px', d } : { t: 'px', to, d }); }
  get groupRift() { return !!this.party && this.party.members.length > 1 && this.isLeader && this.connected; }
  // ---------- mercado de peixes (Pesqueiro) ----------
  /** Preços do mercado compartilhado (null offline ou sem resposta: o jogo usa o mercado local). */
  async fishMarket(): Promise<Record<string, { p: number; d: number }> | null> {
    if (!this.account || this.offline) return null;
    const r = await call('GET', '/fish/market', undefined, 6000); return r.status === 200 ? r.data.prices : null;
  }
  /** Vende no mercado compartilhado: devolve o total pago (ou null, e o jogo vende no mercado local). */
  async sellFish(fish: string, n: number): Promise<{ total: number; prices: Record<string, { p: number; d: number }> } | null> {
    if (!this.account || this.offline) return null;
    const r = await call('POST', '/fish/sell', { fish, n }, 8000); return r.status === 200 ? r.data : null;
  }
  /** Torneio de pesca: avisa a pesca (pontos pelo peso) e lê o ranking da semana. */
  fishCatch(fish: string, kg: number) { if (this.account && !this.offline) void call('POST', '/fish/catch', { fish, kg }, 6000).then(r => { if (r.status === 200) (window as any).TessGame?.fishPts?.(r.data); }); }
  /** Histórico de trocas e de compras e vendas no mercado. */
  async history(): Promise<any[] | null> { if (!this.account || this.offline) return null; const r = await call('GET', '/history', undefined, 8000); return r.status === 200 ? r.data.history : null; }
  async fishTourney(): Promise<any | null> { if (!this.account || this.offline) return null; const r = await call('GET', '/fish/tournament', undefined, 8000); return r.status === 200 ? r.data : null; }
  async fishClaim(): Promise<{ gold: number; rank: number } | null> { if (!this.account || this.offline) return null; const r = await call('POST', '/fish/tournament/claim', {}, 8000); return r.status === 200 ? r.data : null; }
  // ---------- temporada: Passe do Tear, missões, entrada diária, loja de cosméticos ----------
  /** Estado da temporada (null offline). As recompensas em Centelhas e Fios do Tear chegam pelo save da nuvem (rev). */
  async season(): Promise<any | null> { if (!this.account || this.offline) return null; const r = await call('GET', '/season', undefined, 8000); return r.status === 200 ? r.data : null; }
  seasonMission(id: string) { return this.saveOp('POST', '/season/mission', { id }); }
  seasonClaim(level: number, track: 'free' | 'prem') { return this.saveOp('POST', '/season/claim', { level, track }); }
  seasonPremium() { return this.saveOp('POST', '/season/premium'); }
  loginClaim() { return this.saveOp('POST', '/login/claim'); }
  shopBuy(id: string) { return this.saveOp('POST', '/shop/buy', { id }); }
  shopDeco(id: string) { return this.saveOp('POST', '/shop/deco', { id }); }
  buyDourados(pack: string) { return this.saveOp('POST', '/shop/dourados', { pack }); }
  // ---------- mercado da vila ----------
  async market(): Promise<any | null> { if (!this.account || this.offline) return null; const r = await call('GET', '/market', undefined, 8000); return r.status === 200 ? r.data : null; }
  /** Operações que mexem no save da nuvem: sincroniza antes e adota a revisão nova depois. */
  private async saveOp(method: string, path: string, body: unknown = {}) {
    await this.flushNow();
    if (this.sync === 'recusado' || this.sync === 'conflito') return { ok: false as const, error: 'Seu progresso precisa ser sincronizado antes.' };
    const r = await call(method, path, body, 10000);
    if (r.error) return { ok: false as const, error: r.error };
    if (typeof r.data?.rev === 'number') this.rev = r.data.rev;
    return { ok: true as const, data: r.data };
  }
  marketList(itemId: string, price: number) { return this.saveOp('POST', '/market/list', { itemId, price }); }
  marketBuy(id: number) { return this.saveOp('POST', `/market/${id}/buy`); }
  marketCancel(id: number) { return this.saveOp('POST', `/market/${id}/cancel`); }
  marketCollect() { return this.saveOp('POST', '/market/collect'); }
  // ---------- troca direta ----------
  tradePropose(name: string) { this.send({ t: 'tprop', name }); }
  tradeAnswer(from: string, ok: boolean) { this.send({ t: 'tans', from, ok }); }
  /** A oferta é conferida no save da nuvem: sincroniza antes de mandar. */
  async tradeOffer(items: string[], gold: number) { await this.flushNow(); this.send({ t: 'toffer', items, gold }); }
  tradeReady(on: boolean) { this.send({ t: 'tready', on }); }
  tradeCancel() { this.send({ t: 'tcancel' }); }
  // ---------- Ermos abertos ----------
  /** Na sala pública dos Ermos (não na instância do grupo). */
  get inOpenWilds() { return this.connected && this.region === 'wilds' && !!this.room && !this.inst; }
  /** Amigo ou do grupo: sem fogo amigo. */
  isAlly(name: string) { const n = name.toLowerCase(); return this.isFriend(name) || !!this.party?.members.some(m => m.name.toLowerCase() === n); }
  pvpHit(to: number, dmg: number) { this.send({ t: 'pvp', to, dmg: Math.round(dmg) }); }
  lootDrop(x: number, z: number, gold: number, items: unknown[], at: number) { this.send({ t: 'ldrop', x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, gold, items, at }); }
  lootTake(id: string, free: number) { this.send({ t: 'ltake', id, free }); }
  /** Na vila e com a sala conectada. */
  get inRoom() { return this.connected && !!this.room; }
  setLook(look: Look) { this.look = look; this.send({ t: 'look', look }); }
  players(): Remote[] { return this.remoteList; }
  /** w=1: teleporte (obelisco, renascer): o servidor aceita o salto. */
  sendPos(x: number, z: number, yaw: number, m: number, a: string, w = 0) {
    const k = `${x.toFixed(2)},${z.toFixed(2)},${yaw.toFixed(2)},${m.toFixed(2)},${a}`;
    // Repete a posição parada 1x/s: se o servidor limitou um salto (anti-teleporte),
    // ele converge para a posição real mesmo com o jogador imóvel.
    const now = Date.now();
    if (k === this.lastPos && now - this.lastPosAt < 1000 && !w) return;
    this.lastPos = k; this.lastPosAt = now;
    this.send(w ? { t: 'pos', x, z, yaw, m, a, w: 1 } : { t: 'pos', x, z, yaw, m, a });
  }
  /** Envia no quadro em que a ação começa, para quem assiste ver o início da animação. */
  sendAct(a: Act, c: number, yaw: number) { if (ACTS.includes(a) && this.room) this.send({ t: 'act', a, c, yaw }); }
  chat(text: string) { if (text.trim()) this.send({ t: 'chat', text }); }
  emote(e: Emote) { if (EMOTES.includes(e)) this.send({ t: 'emote', e }); }

  // ---------- grupo ----------
  invite(name: string) { this.send({ t: 'pinvite', name }); }
  duelAsk(name: string) { this.send({ t: 'duel', name }); }
  duelAnswer(from: string, ok: boolean) { this.duelInvites = this.duelInvites.filter(i => i.from !== from); this.send({ t: 'dans', from, ok }); }
  duelLost() { this.send({ t: 'dlost' }); }
  async duels(): Promise<any | null> { if (!this.account || this.offline) return null; const r = await call('GET', '/duels', undefined, 8000); return r.status === 200 ? r.data : null; }
  acceptInvite(from: string) { this.invites = this.invites.filter(i => i.from !== from); this.send({ t: 'paccept', from }); }
  declineInvite(from: string) { this.invites = this.invites.filter(i => i.from !== from); this.send({ t: 'pdecline', from }); }
  leaveParty() { this.send({ t: 'pleave' }); }
  kick(name: string) { this.send({ t: 'pkick', name }); }
  lead(name: string) { this.send({ t: 'plead', name }); }
  partyChat(text: string) { if (text.trim()) this.send({ t: 'chat', text: '/g ' + text }); }
  get isLeader() { return !!this.party && this.party.leader === this.account?.name; }

  // ---------- amigos ----------
  // ---------- guilda ----------
  guildView: any = null;
  async guild(): Promise<any | null> { if (!this.account || this.offline) return null; const r = await call('GET', '/guild', undefined, 8000); if (r.status === 200) { this.guildView = r.data; return r.data; } return null; }
  private async gop(path: string, body: unknown) { const r = await call('POST', path, body); if (r.error) return { ok: false as const, error: r.error }; if (r.data?.view) this.guildView = r.data.view; return { ok: true as const, data: r.data }; }
  /** Fundar e doar mexem nas Centelhas do save da nuvem: sincroniza antes e adota a revisão nova. */
  guildFound(name: string, tag: string, emblem: { shape: number; color: number; symbol: number }) { return this.saveOp('POST', '/guild', { name, tag, emblem }).then(r => { if (r.ok && r.data?.view) this.guildView = r.data.view; return r; }); }
  guildDonate(gold: number) { return this.saveOp('POST', '/guild/donate', { gold }).then(r => { if (r.ok && r.data?.view) this.guildView = r.data.view; return r; }); }
  guildInvite(name: string) { return this.gop('/guild/invite', { name }); }
  guildAccept(id: string) { return this.gop('/guild/accept', { id }); }
  guildDecline(id: string) { return this.gop('/guild/decline', { id }); }
  guildLeave() { return this.gop('/guild/leave', {}); }
  guildKick(name: string) { return this.gop('/guild/kick', { name }); }
  guildRole(name: string, role: 'lider' | 'oficial' | 'membro') { return this.gop('/guild/role', { name, role }); }
  guildMotd(text: string) { return this.gop('/guild/motd', { text }); }
  guildEmblem(emblem: { shape: number; color: number; symbol: number }) { return this.gop('/guild/emblem', { emblem }); }
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
  private clearRemotes() { this.remotes.clear(); this.remoteList = []; this.loots.clear(); }
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
          const wantRoom = this.region === 'hub' || this.region === 'wilds' || (this.region === this.instKind && !!this.inst);
          if (!!m.room !== wantRoom || (!m.room && this.regionN)) this.sendWhere();
        }
        this.emit('hub', { connected: true, room: m.room, count: this.remotes.size + 1 }); void this.friends(); break;
      case 'join': this.addRemote(m.p); this.emit('hub', { connected: true, room: this.room, count: this.remotes.size + 1, joined: m.p.name }); break;
      case 'leave': { const r = this.remotes.get(m.id); this.remotes.delete(m.id); this.remoteList = [...this.remotes.values()]; this.emit('hub', { connected: true, room: this.room, count: this.remotes.size + 1, left: r?.name }); break; }
      case 'snap': for (const [id, x, z, yaw, mv, a] of m.ps) { const r = this.remotes.get(id); if (r) { r.tx = x; r.tz = z; r.tyaw = yaw; r.m = mv; r.a = a; } } break;
      case 'chat': {
        const mine = m.id === this.myId;
        this.pushChat({ kind: 'chat', name: m.name, text: m.text, ts: m.ts, mine, ch: m.ch });
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
      case 'iready': this.ready = { inst: m.inst, L: m.L, by: m.by, until: Date.now() + m.ms, kind: m.kind }; this.emit('iready', this.ready); break;
      case 'ienter': this.ready = null; if (m.kind === 'wilds') G?.startGroupWilds?.(m.inst, m.diff); else G?.startGroupRift(m.inst, m.rift as RiftParams, m.diff, m.lvl); break;
      case 'ihost': this.hostId = m.id; G?.coopHost?.(m.id === this.myId); break;
      case 'hx': case 'gx': case 'px': G?.coopMsg?.(m.t, m.from, m.d); break;
      case 'loot': G?.coopLoot?.(m); break;
      case 'pvp': G?.pvpHurt?.(m.from, m.name, m.dmg); break;
      case 'dinv': this.duelInvites = this.duelInvites.filter(i => i.from !== m.from); this.duelInvites.push({ from: m.from, exp: Date.now() + m.ms }); this.emit('dinvite', m); break;
      case 'dstart': this.duel = { opp: m.opp, name: m.name, go: Date.now() + m.go, end: Date.now() + m.go + m.ms }; this.duelInvites = []; G?.duelStart?.(m.name, m.go); this.emit('duel', this.duel); break;
      case 'dend': this.duel = null; G?.duelEnd?.(m); this.emit('duel', null); break;
      case 'tinvite': G?.tradeInvite?.(m.from); break;
      case 'tstate': G?.tradeState?.(m); break;
      case 'tdone': this.rev = m.rev; G?.tradeDone?.(m); break;
      case 'tend': G?.tradeEnd?.(m.reason); break;
      case 'ldrop': this.loots.set(m.id, { id: m.id, x: m.x, z: m.z, by: m.by, name: m.name, gold: m.gold, n: m.n, exp: Date.now() + m.ms }); if (m.by === this.myId) G?.lootSid?.(m.id); break;
      case 'lgot': G?.lootGot?.(m); break;
      case 'lgone': this.loots.delete(m.id); if (m.by) G?.lootLost?.(m.id, m.by, m.at); else G?.lootVanish?.(m.id); break;
      case 'iclosed':
        if (this.ready?.inst === m.inst) { this.ready = null; this.emit('iready', null); }
        if (this.inst === m.inst) { this.inst = null; G?.coopClosed?.(); this.emit('iclosed', m.inst); }
        break;
      case 'pinvite':
        this.invites = this.invites.filter(i => i.from !== m.from && i.exp > Date.now());
        this.invites.push({ from: m.from, size: m.size, exp: Date.now() + m.ms }); this.emit('pinvite', m); break;
      case 'pchat': this.pushChat({ kind: 'grupo', name: m.name, text: m.text, ts: m.ts, mine: m.name === this.account?.name }); break;
      case 'gchat': this.pushChat({ kind: 'guilda', name: m.name, text: m.text, ts: m.ts, mine: m.name === this.account?.name, ch: m.tag }); break;
      case 'guild': this.emit('guild', null); break;
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
