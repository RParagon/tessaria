import postgres from 'postgres';
import { MIGRATIONS } from './migrations';
import type { Account, ClaimResult, FriendLink, MailRow, NewAccount, PutSaveResult, SaveRow, Store, TransferResult , Listing, HistoryEntry, SeasonRow } from './types';
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

  async addTombstones(accountId: string, itemIds: string[]) {
    if (!itemIds.length) return;
    await this.sql`INSERT INTO tombstones ${this.sql(itemIds.map(id => ({ account_id: accountId, item_id: id })))} ON CONFLICT DO NOTHING`;
  }
  async addFishCatch(week: number, accountId: string, points: number, fish: string, kg: number) {
    const r = await this.sql`INSERT INTO fish_scores (week, account_id, points, best_fish, best_kg, best_pts) VALUES (${week}, ${accountId}, ${points}, ${fish}, ${kg}, ${points})
      ON CONFLICT (week, account_id) DO UPDATE SET points = fish_scores.points + EXCLUDED.points,
        best_fish = CASE WHEN EXCLUDED.best_pts > fish_scores.best_pts THEN EXCLUDED.best_fish ELSE fish_scores.best_fish END,
        best_kg = CASE WHEN EXCLUDED.best_pts > fish_scores.best_pts THEN EXCLUDED.best_kg ELSE fish_scores.best_kg END,
        best_pts = GREATEST(fish_scores.best_pts, EXCLUDED.best_pts)
      RETURNING points`;
    return Number(r[0].points);
  }
  async fishTop(week: number, n: number) {
    const r = await this.sql`SELECT a.name, f.points, f.best_fish, f.best_kg, f.best_pts FROM fish_scores f JOIN accounts a ON a.id = f.account_id WHERE f.week = ${week} ORDER BY f.points DESC, f.updated_at ASC LIMIT ${n}`;
    return r.map(x => ({ name: x.name as string, points: Number(x.points), bestFish: x.best_fish as string, bestKg: Number(x.best_kg), bestPts: Number(x.best_pts) }));
  }
  async fishMine(week: number, accountId: string) {
    const r = await this.sql`SELECT a.name, f.points, f.best_fish, f.best_kg, f.best_pts, f.claimed, (SELECT COUNT(*) FROM fish_scores o WHERE o.week = f.week AND o.points > f.points) AS ahead FROM fish_scores f JOIN accounts a ON a.id = f.account_id WHERE f.week = ${week} AND f.account_id = ${accountId}`;
    if (!r.length) return null; const x = r[0];
    return { name: x.name as string, points: Number(x.points), bestFish: x.best_fish as string, bestKg: Number(x.best_kg), bestPts: Number(x.best_pts), rank: Number(x.ahead) + 1, claimed: !!x.claimed };
  }
  async claimFishPrize(week: number, accountId: string) {
    const r = await this.sql`UPDATE fish_scores SET claimed = true WHERE week = ${week} AND account_id = ${accountId} AND NOT claimed RETURNING week`;
    return r.length > 0;
  }
  async logTrade(e: { aId: string; bId: string; aName: string; bName: string; aItems: any[]; aGold: number; bItems: any[]; bGold: number }) {
    await this.sql`INSERT INTO trade_log (a_id, b_id, a_name, b_name, a_items, a_gold, b_items, b_gold) VALUES (${e.aId}, ${e.bId}, ${e.aName}, ${e.bName}, ${this.sql.json(e.aItems)}, ${e.aGold}, ${this.sql.json(e.bItems)}, ${e.bGold})`;
  }
  async history(accountId: string, limit: number) {
    const nm = (xs: any[]) => (Array.isArray(xs) ? xs : []).map(i => String(i?.name ?? '?'));
    const tr = await this.sql`SELECT * FROM trade_log WHERE a_id = ${accountId} OR b_id = ${accountId} ORDER BY created_at DESC LIMIT ${limit}`;
    const mk = await this.sql`SELECT * FROM market_listings WHERE buyer_id IS NOT NULL AND (seller_id = ${accountId} OR buyer_id = ${accountId}) ORDER BY sold_at DESC LIMIT ${limit}`;
    const out: HistoryEntry[] = [];
    for (const t of tr) { const mine = t.a_id === accountId; out.push({ kind: 'troca', with: mine ? t.b_name : t.a_name, gave: nm(mine ? t.a_items : t.b_items), got: nm(mine ? t.b_items : t.a_items), gold: mine ? t.b_gold - t.a_gold : t.a_gold - t.b_gold, at: t.created_at }); }
    for (const m of mk) { if (m.seller_id === accountId) out.push({ kind: 'venda', with: m.buyer_name ?? '?', gave: nm([m.item]), got: [], gold: Number(m.price), at: m.sold_at }); if (m.buyer_id === accountId) out.push({ kind: 'compra', with: m.seller_name, gave: [], got: nm([m.item]), gold: -Number(m.price), at: m.sold_at }); }
    return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
  }
  // ---------- temporada, passe, carteira e cosméticos ----------
  async seasonGet(a: string, season: number): Promise<SeasonRow> {
    const [p] = await this.sql`SELECT xp, premium, claimed FROM season_progress WHERE account_id = ${a} AND season = ${season}`;
    const [w] = await this.sql`SELECT dourados FROM wallet WHERE account_id = ${a}`;
    const o = await this.sql`SELECT cosmetic_id FROM cosmetics_owned WHERE account_id = ${a}`;
    const [l] = await this.sql`SELECT streak, last_day FROM login_streak WHERE account_id = ${a}`;
    const c = p?.claimed ?? {};
    return { xp: Number(p?.xp ?? 0), premium: !!p?.premium, free: c.free ?? [], prem: c.prem ?? [], missions: c.missions ?? [], dourados: Number(w?.dourados ?? 0), owned: o.map(x => x.cosmetic_id as string), streak: Number(l?.streak ?? 0), lastDay: Number(l?.last_day ?? 0) };
  }
  private async seasonRow(tx: any, a: string, season: number) {
    await tx`INSERT INTO season_progress (account_id, season) VALUES (${a}, ${season}) ON CONFLICT DO NOTHING`;
    const [p] = await tx`SELECT xp, premium, claimed FROM season_progress WHERE account_id = ${a} AND season = ${season} FOR UPDATE`;
    return { xp: Number(p.xp), premium: !!p.premium, c: { free: [], prem: [], missions: [], ...(p.claimed ?? {}) } as { free: number[]; prem: number[]; missions: string[] } };
  }
  async seasonMission(a: string, season: number, id: string, xp: number) {
    return this.sql.begin(async tx => { const r = await this.seasonRow(tx, a, season); if (r.c.missions.includes(id)) return false; r.c.missions.push(id);
      await tx`UPDATE season_progress SET xp = xp + ${xp}, claimed = ${tx.json(r.c)} WHERE account_id = ${a} AND season = ${season}`; return true; }) as Promise<boolean>;
  }
  async seasonClaim(a: string, season: number, level: number, track: 'free' | 'prem') {
    return this.sql.begin(async tx => { const r = await this.seasonRow(tx, a, season), arr = track === 'free' ? r.c.free : r.c.prem; if (arr.includes(level)) return false; arr.push(level);
      await tx`UPDATE season_progress SET claimed = ${tx.json(r.c)} WHERE account_id = ${a} AND season = ${season}`; return true; }) as Promise<boolean>;
  }
  async seasonPremium(a: string, season: number, price: number) {
    return this.sql.begin(async tx => { const r = await this.seasonRow(tx, a, season); if (r.premium) return 'ja';
      const u = await tx`UPDATE wallet SET dourados = dourados - ${price} WHERE account_id = ${a} AND dourados >= ${price} RETURNING dourados`; if (!u.length) return 'sem-dourados';
      await tx`UPDATE season_progress SET premium = true WHERE account_id = ${a} AND season = ${season}`; return 'ok'; }) as Promise<'ok' | 'ja' | 'sem-dourados'>;
  }
  async walletAdd(a: string, n: number) {
    await this.sql`INSERT INTO wallet (account_id) VALUES (${a}) ON CONFLICT DO NOTHING`;
    const u = await this.sql`UPDATE wallet SET dourados = dourados + ${n} WHERE account_id = ${a} AND dourados + ${n} >= 0 RETURNING dourados`; return u.length > 0;
  }
  async buyCosmetic(a: string, id: string, price: number) {
    return this.sql.begin(async tx => {
      const [h] = await tx`SELECT 1 FROM cosmetics_owned WHERE account_id = ${a} AND cosmetic_id = ${id}`; if (h) return 'ja';
      await tx`INSERT INTO wallet (account_id) VALUES (${a}) ON CONFLICT DO NOTHING`;
      const u = await tx`UPDATE wallet SET dourados = dourados - ${price} WHERE account_id = ${a} AND dourados >= ${price} RETURNING dourados`; if (!u.length) return 'sem-dourados';
      await tx`INSERT INTO cosmetics_owned (account_id, cosmetic_id, source) VALUES (${a}, ${id}, 'loja')`; return 'ok'; }) as Promise<'ok' | 'ja' | 'sem-dourados'>;
  }
  async grantCosmetic(a: string, id: string, source: string) { await this.sql`INSERT INTO cosmetics_owned (account_id, cosmetic_id, source) VALUES (${a}, ${id}, ${source}) ON CONFLICT DO NOTHING`; }
  async loginClaim(a: string, day: number) {
    return this.sql.begin(async tx => {
      await tx`INSERT INTO login_streak (account_id) VALUES (${a}) ON CONFLICT DO NOTHING`;
      const [l] = await tx`SELECT streak, last_day FROM login_streak WHERE account_id = ${a} FOR UPDATE`;
      if (Number(l.last_day) === day) return { ok: false, streak: Number(l.streak) };
      const streak = Number(l.last_day) === day - 1 ? Number(l.streak) + 1 : 1;
      await tx`UPDATE login_streak SET streak = ${streak}, last_day = ${day} WHERE account_id = ${a}`; return { ok: true, streak }; }) as Promise<{ ok: boolean; streak: number }>;
  }
  async saveReward(a: string, centelhas: number, fios: number) {
    return this.sql.begin(async tx => {
      const [s] = await tx`SELECT data FROM saves WHERE account_id = ${a} FOR UPDATE`; if (!s) return null;
      const d = s.data; d.gold = (Number(d.gold) || 0) + centelhas; d.fios = (Number(d.fios) || 0) + fios;
      const [u] = await tx`UPDATE saves SET data = ${tx.json(d)}, rev = rev + 1, updated_at = now() WHERE account_id = ${a} RETURNING rev`; return Number(u.rev); }) as Promise<number | null>;
  }
  // ---------- mercado da vila e troca direta ----------
  private toListing(x: any): Listing { return { id: Number(x.id), sellerName: x.seller_name, item: x.item, price: Number(x.price), createdAt: x.created_at, sold: !!x.buyer_id, paid: !!x.paid, buyerName: x.buyer_name ?? null }; }
  async marketList(sellerId: string, sellerName: string, itemId: string, price: number, maxActive: number) {
    return this.sql.begin(async tx => {
      const [s] = await tx`SELECT data FROM saves WHERE account_id = ${sellerId} FOR UPDATE`;
      if (!s) return { ok: false, reason: 'sem-save' } as const;
      const [c] = await tx`SELECT COUNT(*)::int AS n FROM market_listings WHERE seller_id = ${sellerId} AND buyer_id IS NULL`;
      if (c.n >= maxActive) return { ok: false, reason: 'limite' } as const;
      const data = s.data, inv: any[] = Array.isArray(data.inv) ? data.inv : [], i = inv.findIndex(it => it && it.id === itemId);
      if (i < 0) return { ok: false, reason: ['weapon', 'armor', 'charm'].some(k => data.eq?.[k]?.id === itemId) ? 'equipado' : 'sem-item' } as const;
      const [item] = inv.splice(i, 1); data.inv = inv;
      const [u] = await tx`UPDATE saves SET data = ${tx.json(data)}, rev = rev + 1, updated_at = now() WHERE account_id = ${sellerId} RETURNING rev`;
      await tx`INSERT INTO tombstones (account_id, item_id) VALUES (${sellerId}, ${itemId}) ON CONFLICT DO NOTHING`;
      const [m] = await tx`INSERT INTO market_listings (seller_id, seller_name, item, price) VALUES (${sellerId}, ${sellerName}, ${tx.json(item)}, ${price}) RETURNING id`;
      return { ok: true, rev: u.rev, id: Number(m.id) } as const;
    }) as any;
  }
  async marketActive(limit: number) { return (await this.sql`SELECT * FROM market_listings WHERE buyer_id IS NULL ORDER BY created_at DESC LIMIT ${limit}`).map(x => this.toListing(x)); }
  async marketMine(sellerId: string) { return (await this.sql`SELECT * FROM market_listings WHERE seller_id = ${sellerId} AND NOT (buyer_id IS NOT NULL AND paid) ORDER BY created_at DESC LIMIT 50`).map(x => this.toListing(x)); }
  async marketBuy(buyerId: string, id: number) {
    return this.sql.begin(async tx => {
      const [m] = await tx`SELECT * FROM market_listings WHERE id = ${id} FOR UPDATE`;
      if (!m) return { ok: false, reason: 'nao-encontrado' } as const;
      if (m.buyer_id) return { ok: false, reason: 'vendido' } as const;
      if (m.seller_id === buyerId) return { ok: false, reason: 'proprio' } as const;
      const [s] = await tx`SELECT data FROM saves WHERE account_id = ${buyerId} FOR UPDATE`;
      if (!s) return { ok: false, reason: 'sem-save' } as const;
      const data = s.data, price = Number(m.price); data.inv = Array.isArray(data.inv) ? data.inv : [];
      if ((Number(data.gold) || 0) < price) return { ok: false, reason: 'sem-ouro' } as const;
      if (data.inv.length >= invMax(data)) return { ok: false, reason: 'bolsa-cheia' } as const;
      data.gold -= price; data.spent = (Number(data.spent) || 0) + price; data.inv.push(m.item);
      const [u] = await tx`UPDATE saves SET data = ${tx.json(data)}, rev = rev + 1, updated_at = now() WHERE account_id = ${buyerId} RETURNING rev`;
      await tx`DELETE FROM tombstones WHERE account_id = ${buyerId} AND item_id = ${m.item.id}`;
      await tx`UPDATE market_listings SET buyer_id = ${buyerId}, buyer_name = (SELECT name FROM accounts WHERE id = ${buyerId}), sold_at = now() WHERE id = ${id}`;
      return { ok: true, rev: u.rev, item: m.item, price } as const;
    }) as any;
  }
  async marketCancel(sellerId: string, id: number) {
    return this.sql.begin(async tx => {
      const [m] = await tx`SELECT * FROM market_listings WHERE id = ${id} AND seller_id = ${sellerId} FOR UPDATE`;
      if (!m) return { ok: false, reason: 'nao-encontrado' } as const;
      if (m.buyer_id) return { ok: false, reason: 'vendido' } as const;
      const [s] = await tx`SELECT data FROM saves WHERE account_id = ${sellerId} FOR UPDATE`;
      if (!s) return { ok: false, reason: 'sem-save' } as const;
      const data = s.data; data.inv = Array.isArray(data.inv) ? data.inv : [];
      if (data.inv.length >= invMax(data)) return { ok: false, reason: 'bolsa-cheia' } as const;
      data.inv.push(m.item);
      const [u] = await tx`UPDATE saves SET data = ${tx.json(data)}, rev = rev + 1, updated_at = now() WHERE account_id = ${sellerId} RETURNING rev`;
      await tx`DELETE FROM tombstones WHERE account_id = ${sellerId} AND item_id = ${m.item.id}`;
      await tx`DELETE FROM market_listings WHERE id = ${id}`;
      return { ok: true, rev: u.rev, item: m.item } as const;
    }) as any;
  }
  async marketCollect(sellerId: string, tax: number) {
    return this.sql.begin(async tx => {
      const due = await tx`SELECT id, price FROM market_listings WHERE seller_id = ${sellerId} AND buyer_id IS NOT NULL AND NOT paid FOR UPDATE`;
      if (!due.length) return { ok: false, reason: 'nada' } as const;
      const [s] = await tx`SELECT data FROM saves WHERE account_id = ${sellerId} FOR UPDATE`;
      if (!s) return { ok: false, reason: 'sem-save' } as const;
      const gold = due.reduce((a, m) => a + Math.floor(Number(m.price) * (1 - tax)), 0), data = s.data;
      data.gold = (Number(data.gold) || 0) + gold;
      const [u] = await tx`UPDATE saves SET data = ${tx.json(data)}, rev = rev + 1, updated_at = now() WHERE account_id = ${sellerId} RETURNING rev`;
      await tx`UPDATE market_listings SET paid = true WHERE id IN ${tx(due.map(m => m.id))}`;
      return { ok: true, rev: u.rev, gold, n: due.length } as const;
    }) as any;
  }
  async tradeExecute(aId: string, bId: string, aItems: string[], aGold: number, bItems: string[], bGold: number) {
    return this.sql.begin(async tx => {
      const rows = await tx`SELECT account_id, data FROM saves WHERE account_id IN ${tx([aId, bId])} ORDER BY account_id FOR UPDATE`;
      const A = rows.find(r => r.account_id === aId)?.data, B = rows.find(r => r.account_id === bId)?.data;
      if (!A || !B) return { ok: false, reason: 'sem-save' };
      const ia: any[] = Array.isArray(A.inv) ? A.inv : [], ib: any[] = Array.isArray(B.inv) ? B.inv : [];
      if ((Number(A.gold) || 0) < aGold || (Number(B.gold) || 0) < bGold) return { ok: false, reason: 'sem-ouro' };
      if (!aItems.every(id => ia.some(it => it?.id === id)) || !bItems.every(id => ib.some(it => it?.id === id))) return { ok: false, reason: 'sem-item' };
      if (ia.length - aItems.length + bItems.length > invMax(A) || ib.length - bItems.length + aItems.length > invMax(B)) return { ok: false, reason: 'bolsa-cheia' };
      const fromA = ia.filter(it => aItems.includes(it?.id)), fromB = ib.filter(it => bItems.includes(it?.id));
      A.inv = ia.filter(it => !aItems.includes(it?.id)).concat(fromB); B.inv = ib.filter(it => !bItems.includes(it?.id)).concat(fromA);
      A.gold = A.gold - aGold + bGold; B.gold = B.gold - bGold + aGold;
      const [ua] = await tx`UPDATE saves SET data = ${tx.json(A)}, rev = rev + 1, updated_at = now() WHERE account_id = ${aId} RETURNING rev`;
      const [ub] = await tx`UPDATE saves SET data = ${tx.json(B)}, rev = rev + 1, updated_at = now() WHERE account_id = ${bId} RETURNING rev`;
      for (const [acc, ids, back] of [[aId, aItems, bItems], [bId, bItems, aItems]] as const) {
        if (ids.length) await tx`INSERT INTO tombstones ${tx(ids.map(i => ({ account_id: acc, item_id: i })))} ON CONFLICT DO NOTHING`;
        if (back.length) await tx`DELETE FROM tombstones WHERE account_id = ${acc} AND item_id IN ${tx(back as string[])}`;
      }
      return { ok: true, revA: ua.rev, revB: ub.rev, fromA, fromB };
    }) as any;
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
