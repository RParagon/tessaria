import { randomUUID } from 'node:crypto';
import type { Account, ClaimResult, FishScore, HistoryEntry, Listing, SeasonRow, FriendLink, MailRow, NewAccount, PutSaveResult, SaveRow, Store, TransferResult } from './types';
import { invMax } from '../../../shared/save';

/**
 * Armazenamento em memória: desenvolvimento sem banco e testes.
 * Mesmo comportamento do PgStore (os testes rodam contra os dois).
 * Tudo se perde ao reiniciar o servidor.
 */
export class MemoryStore implements Store {
  private accounts = new Map<string, Account>();
  private sessions = new Map<string, { accountId: string; expiresAt: Date }>();
  private saves = new Map<string, SaveRow>();
  private tombs = new Map<string, Set<string>>();
  private mail: MailRow[] = [];
  private mailSeq = 0;
  private friends = new Map<string, { from: string; to: string; accepted: boolean; at: Date }>();
  private blocks = new Map<string, { a: string; b: string; at: Date }>();
  public auditLog: Array<{ accountId: string | null; kind: string; detail: any }> = [];
  public errors: any[] = [];
  public chat: Array<{ accountId: string; room: string; text: string }> = [];

  private fish = new Map<string, { week: number; accountId: string; points: number; bestFish: string; bestKg: number; bestPts: number; claimed: boolean }>();
  async addFishCatch(week: number, accountId: string, points: number, fish: string, kg: number) {
    const k = week + ':' + accountId, e = this.fish.get(k) ?? { week, accountId, points: 0, bestFish: fish, bestKg: kg, bestPts: 0, claimed: false };
    e.points += points; if (points > e.bestPts) { e.bestPts = points; e.bestFish = fish; e.bestKg = kg; } this.fish.set(k, e); return e.points;
  }
  private fishRow(e: { accountId: string; points: number; bestFish: string; bestKg: number; bestPts: number }): FishScore { return { name: this.accounts.get(e.accountId)?.name ?? '?', points: e.points, bestFish: e.bestFish, bestKg: e.bestKg, bestPts: e.bestPts }; }
  async fishTop(week: number, n: number) { return [...this.fish.values()].filter(e => e.week === week).sort((a, b) => b.points - a.points).slice(0, n).map(e => this.fishRow(e)); }
  async fishMine(week: number, accountId: string) { const e = this.fish.get(week + ':' + accountId); if (!e) return null; const rank = 1 + [...this.fish.values()].filter(o => o.week === week && o.points > e.points).length; return { ...this.fishRow(e), rank, claimed: e.claimed }; }
  async claimFishPrize(week: number, accountId: string) { const e = this.fish.get(week + ':' + accountId); if (!e || e.claimed) return false; e.claimed = true; return true; }
  private market: Array<{ id: number; sellerId: string; sellerName: string; item: any; price: number; createdAt: Date; buyerId: string | null; buyerName: string | null; paid: boolean; soldAt?: Date }> = [];
  private marketSeq = 0;
  private bump(s: SaveRow) { s.rev++; s.updatedAt = new Date(); return s.rev; }
  private invOf(s: SaveRow) { s.data.inv = Array.isArray(s.data.inv) ? s.data.inv : []; return s.data.inv as any[]; }
  private listing(m: (typeof this.market)[number]): Listing { return { id: m.id, sellerName: m.sellerName, item: this.clone(m.item), price: m.price, createdAt: m.createdAt, sold: !!m.buyerId, paid: m.paid, buyerName: m.buyerName }; }
  async marketList(sellerId: string, sellerName: string, itemId: string, price: number, maxActive: number) {
    const s = this.saves.get(sellerId); if (!s) return { ok: false as const, reason: 'sem-save' as const };
    if (this.market.filter(m => m.sellerId === sellerId && !m.buyerId).length >= maxActive) return { ok: false as const, reason: 'limite' as const };
    const inv = this.invOf(s), i = inv.findIndex(it => it && it.id === itemId);
    if (i < 0) return { ok: false as const, reason: (['weapon', 'armor', 'charm'].some(k => s.data.eq?.[k]?.id === itemId) ? 'equipado' : 'sem-item') as 'equipado' | 'sem-item' };
    const [item] = inv.splice(i, 1); const rev = this.bump(s);
    if (!this.tombs.has(sellerId)) this.tombs.set(sellerId, new Set()); this.tombs.get(sellerId)!.add(itemId);
    const id = ++this.marketSeq; this.market.push({ id, sellerId, sellerName, item, price, createdAt: new Date(), buyerId: null, buyerName: null, paid: false });
    return { ok: true as const, rev, id };
  }
  async marketActive(limit: number) { return this.market.filter(m => !m.buyerId).slice(-limit).reverse().map(m => this.listing(m)); }
  async marketMine(sellerId: string) { return this.market.filter(m => m.sellerId === sellerId && !(m.buyerId && m.paid)).reverse().map(m => this.listing(m)); }
  async marketBuy(buyerId: string, id: number) {
    const m = this.market.find(x => x.id === id); if (!m) return { ok: false as const, reason: 'nao-encontrado' as const };
    if (m.buyerId) return { ok: false as const, reason: 'vendido' as const };
    if (m.sellerId === buyerId) return { ok: false as const, reason: 'proprio' as const };
    const s = this.saves.get(buyerId); if (!s) return { ok: false as const, reason: 'sem-save' as const };
    if ((Number(s.data.gold) || 0) < m.price) return { ok: false as const, reason: 'sem-ouro' as const };
    const inv = this.invOf(s); if (inv.length >= invMax(s.data)) return { ok: false as const, reason: 'bolsa-cheia' as const };
    s.data.gold -= m.price; s.data.spent = (Number(s.data.spent) || 0) + m.price; inv.push(this.clone(m.item)); const rev = this.bump(s);
    this.tombs.get(buyerId)?.delete(m.item.id);
    m.buyerId = buyerId; m.buyerName = this.accounts.get(buyerId)?.name ?? null; m.soldAt = new Date();
    return { ok: true as const, rev, item: this.clone(m.item), price: m.price };
  }
  async marketCancel(sellerId: string, id: number) {
    const m = this.market.find(x => x.id === id && x.sellerId === sellerId); if (!m) return { ok: false as const, reason: 'nao-encontrado' as const };
    if (m.buyerId) return { ok: false as const, reason: 'vendido' as const };
    const s = this.saves.get(sellerId); if (!s) return { ok: false as const, reason: 'sem-save' as const };
    const inv = this.invOf(s); if (inv.length >= invMax(s.data)) return { ok: false as const, reason: 'bolsa-cheia' as const };
    inv.push(this.clone(m.item)); const rev = this.bump(s); this.tombs.get(sellerId)?.delete(m.item.id);
    this.market = this.market.filter(x => x !== m);
    return { ok: true as const, rev, item: this.clone(m.item) };
  }
  async marketCollect(sellerId: string, tax: number) {
    const due = this.market.filter(m => m.sellerId === sellerId && m.buyerId && !m.paid); if (!due.length) return { ok: false as const, reason: 'nada' as const };
    const s = this.saves.get(sellerId); if (!s) return { ok: false as const, reason: 'sem-save' as const };
    const gold = due.reduce((a, m) => a + Math.floor(m.price * (1 - tax)), 0);
    s.data.gold = (Number(s.data.gold) || 0) + gold; const rev = this.bump(s); for (const m of due) m.paid = true;
    return { ok: true as const, rev, gold, n: due.length };
  }
  async tradeExecute(aId: string, bId: string, aItems: string[], aGold: number, bItems: string[], bGold: number) {
    const A = this.saves.get(aId), B = this.saves.get(bId); if (!A || !B) return { ok: false as const, reason: 'sem-save' };
    const ia = this.invOf(A), ib = this.invOf(B);
    if ((Number(A.data.gold) || 0) < aGold || (Number(B.data.gold) || 0) < bGold) return { ok: false as const, reason: 'sem-ouro' };
    if (!aItems.every(id => ia.some(it => it?.id === id)) || !bItems.every(id => ib.some(it => it?.id === id))) return { ok: false as const, reason: 'sem-item' };
    if (ia.length - aItems.length + bItems.length > invMax(A.data) || ib.length - bItems.length + aItems.length > invMax(B.data)) return { ok: false as const, reason: 'bolsa-cheia' };
    const fromA = ia.filter(it => aItems.includes(it?.id)), fromB = ib.filter(it => bItems.includes(it?.id));
    A.data.inv = ia.filter(it => !aItems.includes(it?.id)).concat(this.clone(fromB)); B.data.inv = ib.filter(it => !bItems.includes(it?.id)).concat(this.clone(fromA));
    A.data.gold = A.data.gold - aGold + bGold; B.data.gold = B.data.gold - bGold + aGold;
    for (const [acc, ids, back] of [[aId, aItems, bItems], [bId, bItems, aItems]] as const) { if (!this.tombs.has(acc)) this.tombs.set(acc, new Set()); for (const i of ids) this.tombs.get(acc)!.add(i); for (const i of back) this.tombs.get(acc)!.delete(i); }
    return { ok: true as const, revA: this.bump(A), revB: this.bump(B), fromA: this.clone(fromA), fromB: this.clone(fromB) };
  }
  private tradeLog: Array<{ aId: string; bId: string; aName: string; bName: string; aItems: any[]; aGold: number; bItems: any[]; bGold: number; at: Date }> = [];
  async logTrade(e: { aId: string; bId: string; aName: string; bName: string; aItems: any[]; aGold: number; bItems: any[]; bGold: number }) { this.tradeLog.push({ ...this.clone(e), at: new Date() }); }
  async history(accountId: string, limit: number) {
    const out: HistoryEntry[] = [], nm = (xs: any[]) => xs.map(i => String(i?.name ?? '?'));
    for (const t of this.tradeLog) { if (t.aId === accountId) out.push({ kind: 'troca', with: t.bName, gave: nm(t.aItems), got: nm(t.bItems), gold: t.bGold - t.aGold, at: t.at }); else if (t.bId === accountId) out.push({ kind: 'troca', with: t.aName, gave: nm(t.bItems), got: nm(t.aItems), gold: t.aGold - t.bGold, at: t.at }); }
    for (const m of this.market) { if (!m.buyerId) continue; const at = m.soldAt ?? m.createdAt; if (m.sellerId === accountId) out.push({ kind: 'venda', with: m.buyerName ?? '?', gave: nm([m.item]), got: [], gold: m.price, at }); if (m.buyerId === accountId) out.push({ kind: 'compra', with: m.sellerName, gave: [], got: nm([m.item]), gold: -m.price, at }); }
    return out.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
  }
  private seasons = new Map<string, { xp: number; premium: boolean; free: number[]; prem: number[]; missions: string[] }>();
  private wallet = new Map<string, number>();
  private owned = new Map<string, Set<string>>();
  private logins = new Map<string, { streak: number; lastDay: number }>();
  private seasonOf(a: string, s: number) { const k = s + ':' + a; let e = this.seasons.get(k); if (!e) { e = { xp: 0, premium: false, free: [], prem: [], missions: [] }; this.seasons.set(k, e); } return e; }
  async seasonGet(a: string, s: number): Promise<SeasonRow> { const e = this.seasonOf(a, s), l = this.logins.get(a) ?? { streak: 0, lastDay: 0 }; return { ...this.clone(e), dourados: this.wallet.get(a) ?? 0, owned: [...(this.owned.get(a) ?? [])], streak: l.streak, lastDay: l.lastDay }; }
  async seasonMission(a: string, s: number, id: string, xp: number) { const e = this.seasonOf(a, s); if (e.missions.includes(id)) return false; e.missions.push(id); e.xp += xp; return true; }
  async seasonClaim(a: string, s: number, level: number, track: 'free' | 'prem') { const e = this.seasonOf(a, s), arr = track === 'free' ? e.free : e.prem; if (arr.includes(level)) return false; arr.push(level); return true; }
  async seasonPremium(a: string, s: number, price: number) { const e = this.seasonOf(a, s); if (e.premium) return 'ja' as const; if ((this.wallet.get(a) ?? 0) < price) return 'sem-dourados' as const; this.wallet.set(a, (this.wallet.get(a) ?? 0) - price); e.premium = true; return 'ok' as const; }
  private payments = new Map<string, { accountId: string; dourados: number; status: string }>();
  async paymentCredit(p: { id: string; provider: string; accountId: string; pack: string; dourados: number; amount: number }) {
    if (this.payments.has(p.id) || !this.accounts.has(p.accountId)) return false;
    this.payments.set(p.id, { accountId: p.accountId, dourados: p.dourados, status: 'aprovado' }); this.wallet.set(p.accountId, (this.wallet.get(p.accountId) ?? 0) + p.dourados); return true;
  }
  async paymentRevoke(id: string, status: string) {
    const e = this.payments.get(id); if (!e || e.status !== 'aprovado') return null; e.status = status;
    this.wallet.set(e.accountId, Math.max(0, (this.wallet.get(e.accountId) ?? 0) - e.dourados)); return { accountId: e.accountId, dourados: e.dourados };
  }
  async walletAdd(a: string, n: number) { const v = (this.wallet.get(a) ?? 0) + n; if (v < 0) return false; this.wallet.set(a, v); return true; }
  async buyCosmetic(a: string, id: string, price: number) { const o = this.owned.get(a) ?? new Set<string>(); if (o.has(id)) return 'ja' as const; if ((this.wallet.get(a) ?? 0) < price) return 'sem-dourados' as const; this.wallet.set(a, (this.wallet.get(a) ?? 0) - price); o.add(id); this.owned.set(a, o); return 'ok' as const; }
  async grantCosmetic(a: string, id: string) { const o = this.owned.get(a) ?? new Set<string>(); o.add(id); this.owned.set(a, o); }
  async loginClaim(a: string, day: number) { const l = this.logins.get(a) ?? { streak: 0, lastDay: 0 }; if (l.lastDay === day) return { ok: false, streak: l.streak }; l.streak = l.lastDay === day - 1 ? l.streak + 1 : 1; l.lastDay = day; this.logins.set(a, l); return { ok: true, streak: l.streak }; }
  async saveReward(a: string, centelhas: number, fios: number) { const s = this.saves.get(a); if (!s) return null; s.data.gold = (Number(s.data.gold) || 0) + centelhas; s.data.fios = (Number(s.data.fios) || 0) + fios; return this.bump(s); }
  async migrate() {}
  async close() {}

  private clone<T>(v: T): T { return v === null || v === undefined ? v : structuredClone(v); }

  async createAccount(a: NewAccount) {
    const lower = a.name.toLowerCase();
    for (const x of this.accounts.values()) {
      if (x.name.toLowerCase() === lower) throw Object.assign(new Error('nome em uso'), { code: '23505' });
      if (a.email && x.email && x.email.toLowerCase() === a.email.toLowerCase()) throw Object.assign(new Error('email em uso'), { code: '23505' });
      if (a.googleSub && x.googleSub === a.googleSub) throw Object.assign(new Error('google em uso'), { code: '23505' });
    }
    const acc: Account = { id: randomUUID(), name: a.name, email: a.email ?? null, passHash: a.passHash ?? null, googleSub: a.googleSub ?? null, guest: a.guest, banned: false, createdAt: new Date(), lastSeen: null, mutedUntil: null };
    this.accounts.set(acc.id, acc);
    return { ...acc };
  }
  async accountById(id: string) { const a = this.accounts.get(id); return a ? { ...a } : null; }
  async accountByName(name: string) { for (const a of this.accounts.values()) if (a.name.toLowerCase() === name.toLowerCase()) return { ...a }; return null; }
  async accountByEmail(email: string) { for (const a of this.accounts.values()) if (a.email && a.email.toLowerCase() === email.toLowerCase()) return { ...a }; return null; }
  async accountByGoogle(sub: string) { for (const a of this.accounts.values()) if (a.googleSub === sub) return { ...a }; return null; }
  async updateAccount(id: string, p: Partial<Account>) {
    const a = this.accounts.get(id); if (!a) return;
    if (p.name && p.name.toLowerCase() !== a.name.toLowerCase() && (await this.accountByName(p.name))) throw Object.assign(new Error('nome em uso'), { code: '23505' });
    if (p.email && (await this.accountByEmail(p.email))?.id !== undefined && (await this.accountByEmail(p.email))!.id !== id) throw Object.assign(new Error('email em uso'), { code: '23505' });
    Object.assign(a, p);
  }

  async createSession(tokenHash: string, accountId: string, expiresAt: Date) { this.sessions.set(tokenHash, { accountId, expiresAt }); }
  async sessionAccount(tokenHash: string) { const s = this.sessions.get(tokenHash); return s && s.expiresAt > new Date() ? s.accountId : null; }
  async deleteSession(tokenHash: string) { this.sessions.delete(tokenHash); }

  async getSave(accountId: string) { const s = this.saves.get(accountId); return s ? { ...s, data: this.clone(s.data) } : null; }
  async putSave(accountId: string, data: any, expectedRev: number): Promise<PutSaveResult> {
    const cur = this.saves.get(accountId);
    if ((cur?.rev ?? 0) !== expectedRev) return { ok: false, conflict: true, rev: cur?.rev ?? 0 };
    const rev = expectedRev + 1;
    this.saves.set(accountId, { rev, data: this.clone(data), updatedAt: new Date() });
    return { ok: true, rev };
  }

  async deleteSave(accountId: string) { this.saves.delete(accountId); }

  private grants = new Map<string, { accountId: string; source: string }>();
  async grantItems(accountId: string, ids: string[], source: string) { for (const id of ids) if (!this.grants.has(id)) this.grants.set(id, { accountId, source }); }
  async granted(ids: string[]) { return ids.filter(i => this.grants.has(i)); }
  async addTombstones(accountId: string, ids: string[]) { if (!ids.length) return; if (!this.tombs.has(accountId)) this.tombs.set(accountId, new Set()); for (const i of ids) this.tombs.get(accountId)!.add(i); }
  async tombstoned(accountId: string, ids: string[]) { const t = this.tombs.get(accountId); return t ? ids.filter(i => t.has(i)) : []; }

  async transferItem(fromId: string, fromName: string, toId: string, itemId: string, note: string): Promise<TransferResult> {
    const s = this.saves.get(fromId); if (!s) return { ok: false, reason: 'sem-save' };
    const inv: any[] = Array.isArray(s.data.inv) ? s.data.inv : [];
    const idx = inv.findIndex(it => it && it.id === itemId);
    if (idx < 0) return { ok: false, reason: ['weapon', 'armor', 'charm'].some(k => s.data.eq?.[k]?.id === itemId) ? 'equipado' : 'sem-item' };
    const [item] = inv.splice(idx, 1);
    s.rev++; s.updatedAt = new Date();
    if (!this.tombs.has(fromId)) this.tombs.set(fromId, new Set());
    this.tombs.get(fromId)!.add(itemId);
    const m: MailRow = { id: ++this.mailSeq, toId, fromId, fromName, item, note, createdAt: new Date(), claimedAt: null };
    this.mail.push(m);
    return { ok: true, rev: s.rev, mailId: m.id };
  }
  async listMail(accountId: string) { return this.mail.filter(m => m.toId === accountId && !m.claimedAt).reverse().map(m => this.clone(m)); }
  async claimMail(accountId: string, mailId: number): Promise<ClaimResult> {
    const m = this.mail.find(x => x.id === mailId && x.toId === accountId);
    if (!m) return { ok: false, reason: 'nao-encontrado' };
    if (m.claimedAt) return { ok: false, reason: 'ja-resgatado' };
    const s = this.saves.get(accountId); if (!s) return { ok: false, reason: 'sem-save' };
    s.data.inv = Array.isArray(s.data.inv) ? s.data.inv : [];
    if (s.data.inv.length >= invMax(s.data)) return { ok: false, reason: 'bolsa-cheia' };
    s.data.inv.push(this.clone(m.item)); s.rev++; s.updatedAt = new Date();
    m.claimedAt = new Date();
    this.tombs.get(accountId)?.delete(m.item.id);
    return { ok: true, rev: s.rev, item: this.clone(m.item) };
  }

  async friendLinks(accountId: string, pendingDays: number): Promise<FriendLink[]> {
    const out: FriendLink[] = [], cut = Date.now() - pendingDays * 864e5;
    for (const f of this.friends.values()) {
      if (f.from !== accountId && f.to !== accountId) continue;
      if (f.accepted && f.to === accountId) continue;          // a amizade aparece uma vez, pela linha que sai da conta
      if (!f.accepted && f.at.getTime() < cut) continue;
      const otherId = f.from === accountId ? f.to : f.from, o = this.accounts.get(otherId); if (!o) continue;
      out.push({ otherId, otherName: o.name, otherLastSeen: o.lastSeen, state: f.accepted ? 'amigo' : f.from === accountId ? 'enviado' : 'recebido', since: f.at });
    }
    return out.sort((x, y) => x.otherName.localeCompare(y.otherName));
  }
  async addFriendRequest(fromId: string, toId: string) {
    const k = fromId + '>' + toId; if (!this.friends.has(k)) this.friends.set(k, { from: fromId, to: toId, accepted: false, at: new Date() });
  }
  async acceptFriend(accountId: string, otherId: string) {
    const f = this.friends.get(otherId + '>' + accountId); if (!f) return false;
    const at = new Date(); f.accepted = true; f.at = at;
    this.friends.set(accountId + '>' + otherId, { from: accountId, to: otherId, accepted: true, at });
    return true;
  }
  async removeFriend(a: string, b: string) { this.friends.delete(a + '>' + b); this.friends.delete(b + '>' + a); }
  async blockedBy(accountId: string) {
    return [...this.blocks.values()].filter(x => x.a === accountId).map(x => ({ id: x.b, name: this.accounts.get(x.b)?.name ?? '?' })).sort((x, y) => x.name.localeCompare(y.name));
  }
  async isBlocked(a: string, b: string) { return this.blocks.has(a + '>' + b) || this.blocks.has(b + '>' + a); }
  async setBlock(accountId: string, otherId: string, on: boolean) {
    const k = accountId + '>' + otherId;
    if (on) { if (!this.blocks.has(k)) this.blocks.set(k, { a: accountId, b: otherId, at: new Date() }); } else this.blocks.delete(k);
  }

  async audit(accountId: string | null, kind: string, detail: any) { this.auditLog.push({ accountId, kind, detail }); }
  async logClientError(e: any) { this.errors.push(e); }
  async logChat(accountId: string, room: string, text: string) { this.chat.push({ accountId, room, text }); if (this.chat.length > 5000) this.chat.shift(); }
  async counts() { return { accounts: this.accounts.size, saves: this.saves.size, mail: this.mail.length }; }
}
