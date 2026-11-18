import postgres from 'postgres';
import { MIGRATIONS } from './migrations';
import type { Account, ClaimResult, FriendLink, MailRow, NewAccount, PutSaveResult, SaveRow, Store, TransferResult } from './types';
import { invMax } from '../../../shared/save';

type Row = Record<string, any>;
const toAccount = (r: Row): Account => ({
  id: r.id, name: r.name, email: r.email, passHash: r.pass_hash, googleSub: r.google_sub, guest: r.guest, banned: r.banned,
  createdAt: r.created_at, lastSeen: r.last_seen, mutedUntil: r.muted_until,
});
const toMail = (r: Row): MailRow => ({ id: Number(r.id), toId: r.to_id, fromId: r.from_id, fromName: r.from_name, item: r.item, note: r.note, createdAt: r.created_at, claimedAt: r.claimed_at });

export class PgStore implements Store {
  private sql: postgres.Sql;
  constructor(url: string) {
    this.sql = postgres(url, { max: 10, idle_timeout: 30, connect_timeout: 10, onnotice: () => {} });
  }

  async migrate() {
    const sql = this.sql;
    await sql`CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
    for (const m of MIGRATIONS) {
      await sql.begin(async tx => {
        await tx`SELECT pg_advisory_xact_lock(424242)`;
        const done = await tx`SELECT 1 FROM schema_migrations WHERE id = ${m.id}`;
        if (done.length) return;
        await tx.unsafe(m.sql);
        await tx`INSERT INTO schema_migrations (id) VALUES (${m.id})`;
      });
    }
  }
  async close() { await this.sql.end({ timeout: 5 }); }

  async createAccount(a: NewAccount) {
    const [r] = await this.sql`INSERT INTO accounts (name, email, pass_hash, google_sub, guest)
      VALUES (${a.name}, ${a.email ?? null}, ${a.passHash ?? null}, ${a.googleSub ?? null}, ${a.guest}) RETURNING *`;
    return toAccount(r);
  }
  async accountById(id: string) { const [r] = await this.sql`SELECT * FROM accounts WHERE id = ${id}`; return r ? toAccount(r) : null; }
  async accountByName(name: string) { const [r] = await this.sql`SELECT * FROM accounts WHERE lower(name) = lower(${name})`; return r ? toAccount(r) : null; }
  async accountByEmail(email: string) { const [r] = await this.sql`SELECT * FROM accounts WHERE lower(email) = lower(${email})`; return r ? toAccount(r) : null; }
  async accountByGoogle(sub: string) { const [r] = await this.sql`SELECT * FROM accounts WHERE google_sub = ${sub}`; return r ? toAccount(r) : null; }
  async updateAccount(id: string, p: Partial<Account>) {
    const map: Record<string, string> = { name: 'name', email: 'email', passHash: 'pass_hash', googleSub: 'google_sub', guest: 'guest', banned: 'banned', lastSeen: 'last_seen', mutedUntil: 'muted_until' };
    const cols: Record<string, any> = {};
    for (const [k, v] of Object.entries(p)) if (map[k]) cols[map[k]] = v;
    if (!Object.keys(cols).length) return;
    await this.sql`UPDATE accounts SET ${this.sql(cols)} WHERE id = ${id}`;
  }

  async createSession(tokenHash: string, accountId: string, expiresAt: Date, ua: string) {
    await this.sql`INSERT INTO sessions (token_hash, account_id, expires_at, ua) VALUES (${tokenHash}, ${accountId}, ${expiresAt}, ${ua.slice(0, 200)})`;
  }
  async sessionAccount(tokenHash: string) {
    const [r] = await this.sql`SELECT account_id FROM sessions WHERE token_hash = ${tokenHash} AND expires_at > now()`;
    return r ? r.account_id as string : null;
  }
  async deleteSession(tokenHash: string) { await this.sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`; }

  async getSave(accountId: string): Promise<SaveRow | null> {
    const [r] = await this.sql`SELECT rev, data, updated_at FROM saves WHERE account_id = ${accountId}`;
    return r ? { rev: r.rev, data: r.data, updatedAt: r.updated_at } : null;
  }
  async putSave(accountId: string, data: any, expectedRev: number): Promise<PutSaveResult> {
    if (expectedRev === 0) {
      const r = await this.sql`INSERT INTO saves (account_id, rev, data) VALUES (${accountId}, 1, ${this.sql.json(data)}) ON CONFLICT (account_id) DO NOTHING RETURNING rev`;
      if (r.length) return { ok: true, rev: 1 };
    } else {
      const r = await this.sql`UPDATE saves SET data = ${this.sql.json(data)}, rev = rev + 1, updated_at = now() WHERE account_id = ${accountId} AND rev = ${expectedRev} RETURNING rev`;
      if (r.length) return { ok: true, rev: r[0].rev };
    }
    const cur = await this.getSave(accountId);
    return { ok: false, conflict: true, rev: cur?.rev ?? 0 };
  }

  async deleteSave(accountId: string) { await this.sql`DELETE FROM saves WHERE account_id = ${accountId}`; }

  async tombstoned(accountId: string, itemIds: string[]) {
    if (!itemIds.length) return [];
    const r = await this.sql`SELECT item_id FROM tombstones WHERE account_id = ${accountId} AND item_id IN ${this.sql(itemIds)}`;
    return r.map(x => x.item_id as string);
  }

  async grantItems(accountId: string, itemIds: string[], source: string) {
    if (!itemIds.length) return;
    await this.sql`INSERT INTO item_grants ${this.sql(itemIds.map(id => ({ item_id: id, account_id: accountId, source })))} ON CONFLICT (item_id) DO NOTHING`;
  }
  async granted(itemIds: string[]) {
    if (!itemIds.length) return [];
    const r = await this.sql`SELECT item_id FROM item_grants WHERE item_id IN ${this.sql(itemIds)}`;
    return r.map(x => x.item_id as string);
  }

  async transferItem(fromId: string, fromName: string, toId: string, itemId: string, note: string): Promise<TransferResult> {
    return this.sql.begin(async tx => {
      const [s] = await tx`SELECT rev, data FROM saves WHERE account_id = ${fromId} FOR UPDATE`;
      if (!s) return { ok: false, reason: 'sem-save' } as const;
      const data = s.data, inv: any[] = Array.isArray(data.inv) ? data.inv : [];
      const idx = inv.findIndex(it => it && it.id === itemId);
      if (idx < 0) {
        const equipped = ['weapon', 'armor', 'charm'].some(k => data.eq?.[k]?.id === itemId);
        return { ok: false, reason: equipped ? 'equipado' : 'sem-item' } as const;
      }
      const [item] = inv.splice(idx, 1); data.inv = inv;
      const [u] = await tx`UPDATE saves SET data = ${tx.json(data)}, rev = rev + 1, updated_at = now() WHERE account_id = ${fromId} RETURNING rev`;
      await tx`INSERT INTO tombstones (account_id, item_id) VALUES (${fromId}, ${itemId}) ON CONFLICT DO NOTHING`;
      const [m] = await tx`INSERT INTO mail (to_id, from_id, from_name, item, note) VALUES (${toId}, ${fromId}, ${fromName}, ${tx.json(item)}, ${note}) RETURNING id`;
      return { ok: true, rev: u.rev, mailId: Number(m.id) } as const;
    }) as Promise<TransferResult>;
  }
  async listMail(accountId: string) {
    const r = await this.sql`SELECT * FROM mail WHERE to_id = ${accountId} AND claimed_at IS NULL ORDER BY created_at DESC LIMIT 50`;
    return r.map(toMail);
  }
  async claimMail(accountId: string, mailId: number): Promise<ClaimResult> {
    return this.sql.begin(async tx => {
      const [m] = await tx`SELECT * FROM mail WHERE id = ${mailId} AND to_id = ${accountId} FOR UPDATE`;
      if (!m) return { ok: false, reason: 'nao-encontrado' } as const;
      if (m.claimed_at) return { ok: false, reason: 'ja-resgatado' } as const;
      const [s] = await tx`SELECT rev, data FROM saves WHERE account_id = ${accountId} FOR UPDATE`;
      if (!s) return { ok: false, reason: 'sem-save' } as const;
      const data = s.data; data.inv = Array.isArray(data.inv) ? data.inv : [];
      if (data.inv.length >= invMax(data)) return { ok: false, reason: 'bolsa-cheia' } as const;
      data.inv.push(m.item);
      const [u] = await tx`UPDATE saves SET data = ${tx.json(data)}, rev = rev + 1, updated_at = now() WHERE account_id = ${accountId} RETURNING rev`;
      await tx`UPDATE mail SET claimed_at = now() WHERE id = ${mailId}`;
      await tx`DELETE FROM tombstones WHERE account_id = ${accountId} AND item_id = ${m.item.id}`;
      return { ok: true, rev: u.rev, item: m.item } as const;
    }) as Promise<ClaimResult>;
  }

  async friendLinks(accountId: string, pendingDays: number): Promise<FriendLink[]> {
    const rows = await this.sql`
      SELECT f.from_id, f.to_id, f.accepted, f.created_at, a.id AS other_id, a.name AS other_name, a.last_seen AS other_last_seen
      FROM friends f JOIN accounts a ON a.id = CASE WHEN f.from_id = ${accountId} THEN f.to_id ELSE f.from_id END
      WHERE (f.from_id = ${accountId} AND (f.accepted OR f.created_at > now() - make_interval(days => ${pendingDays})))
         OR (f.to_id = ${accountId} AND NOT f.accepted AND f.created_at > now() - make_interval(days => ${pendingDays}))
      ORDER BY lower(a.name)`;
    return rows.map(r => ({ otherId: r.other_id, otherName: r.other_name, otherLastSeen: r.other_last_seen, state: r.accepted ? 'amigo' : r.from_id === accountId ? 'enviado' : 'recebido', since: r.created_at }));
  }
  async addFriendRequest(fromId: string, toId: string) {
    await this.sql`INSERT INTO friends (from_id, to_id) VALUES (${fromId}, ${toId}) ON CONFLICT DO NOTHING`;
  }
  async acceptFriend(accountId: string, otherId: string) {
    return this.sql.begin(async tx => {
      const r = await tx`UPDATE friends SET accepted = true, created_at = now() WHERE from_id = ${otherId} AND to_id = ${accountId} RETURNING 1`;
      if (!r.length) return false;
      await tx`INSERT INTO friends (from_id, to_id, accepted) VALUES (${accountId}, ${otherId}, true)
        ON CONFLICT (from_id, to_id) DO UPDATE SET accepted = true, created_at = now()`;
      return true;
    }) as Promise<boolean>;
  }
  async removeFriend(a: string, b: string) {
    await this.sql`DELETE FROM friends WHERE (from_id = ${a} AND to_id = ${b}) OR (from_id = ${b} AND to_id = ${a})`;
  }
  async blockedBy(accountId: string) {
    const rows = await this.sql`SELECT a.id, a.name FROM blocks b JOIN accounts a ON a.id = b.blocked_id WHERE b.account_id = ${accountId} ORDER BY lower(a.name)`;
    return rows.map(r => ({ id: r.id as string, name: r.name as string }));
  }
  async isBlocked(a: string, b: string) {
    const r = await this.sql`SELECT 1 FROM blocks WHERE (account_id = ${a} AND blocked_id = ${b}) OR (account_id = ${b} AND blocked_id = ${a}) LIMIT 1`;
    return r.length > 0;
  }
  async setBlock(accountId: string, otherId: string, on: boolean) {
    if (on) await this.sql`INSERT INTO blocks (account_id, blocked_id) VALUES (${accountId}, ${otherId}) ON CONFLICT DO NOTHING`;
    else await this.sql`DELETE FROM blocks WHERE account_id = ${accountId} AND blocked_id = ${otherId}`;
  }

  async audit(accountId: string | null, kind: string, detail: any) {
    await this.sql`INSERT INTO audit (account_id, kind, detail) VALUES (${accountId}, ${kind}, ${this.sql.json(detail ?? {})})`;
  }
  async logClientError(e: { accountId: string | null; version: string; message: string; stack: string; ua: string; url: string }) {
    await this.sql`INSERT INTO client_errors (account_id, version, message, stack, ua, url) VALUES (${e.accountId}, ${e.version}, ${e.message}, ${e.stack}, ${e.ua}, ${e.url})`;
  }
  async logChat(accountId: string, room: string, text: string) {
    await this.sql`INSERT INTO chat_log (account_id, room, text) VALUES (${accountId}, ${room}, ${text})`;
  }
  async counts() {
    const [r] = await this.sql`SELECT (SELECT count(*) FROM accounts)::int a, (SELECT count(*) FROM saves)::int s, (SELECT count(*) FROM mail)::int m`;
    return { accounts: r.a, saves: r.s, mail: r.m };
  }
}
