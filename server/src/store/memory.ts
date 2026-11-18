import { randomUUID } from 'node:crypto';
import type { Account, ClaimResult, FriendLink, MailRow, NewAccount, PutSaveResult, SaveRow, Store, TransferResult } from './types';
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
