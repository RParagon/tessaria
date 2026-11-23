import postgres from 'postgres';
import { MIGRATIONS } from './migrations';
import type { Account, ClaimResult, FriendLink, MailRow, NewAccount, PutSaveResult, SaveRow, Store, TransferResult , Listing, HistoryEntry, SeasonRow, GuildRow, GuildMember } from './types';
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
  async paymentCredit(p: { id: string; provider: string; accountId: string; pack: string; dourados: number; amount: number }) {
    try {
      return await this.sql.begin(async tx => {
        const ins = await tx`INSERT INTO payments (id, provider, account_id, pack, dourados, amount, status) VALUES (${p.id}, ${p.provider}, ${p.accountId}, ${p.pack}, ${p.dourados}, ${p.amount}, 'aprovado') ON CONFLICT (id) DO NOTHING RETURNING id`;
        if (!ins.length) return false;
        await tx`INSERT INTO wallet (account_id, dourados) VALUES (${p.accountId}, ${p.dourados}) ON CONFLICT (account_id) DO UPDATE SET dourados = wallet.dourados + ${p.dourados}`;
        return true;
      }) as boolean;
    } catch (e: any) { if (e?.code === '23503' || e?.code === '22P02') return false; throw e; }   // conta inexistente ou id inválido
  }
  async paymentRevoke(id: string, status: string) {
    return this.sql.begin(async tx => {
      const [r] = await tx`UPDATE payments SET status = ${status}, updated_at = now() WHERE id = ${id} AND status = 'aprovado' RETURNING account_id, dourados`;
      if (!r) return null;
      await tx`UPDATE wallet SET dourados = GREATEST(0, dourados - ${r.dourados}) WHERE account_id = ${r.account_id}`;
      return { accountId: r.account_id as string, dourados: r.dourados as number };
    }) as Promise<{ accountId: string; dourados: number } | null>;
  }
  // ---------- duelos ----------
  async duelResult(w: string, l: string, o: { day: number; pairMax: number; start: number; k: number }) {
    const [a, b] = w < l ? [w, l] : [l, w];
    return this.sql.begin(async tx => {
      const [pr] = await tx`INSERT INTO duel_pairs (a, b, day, n) VALUES (${a}, ${b}, ${o.day}, 1) ON CONFLICT (a, b, day) DO UPDATE SET n = duel_pairs.n + 1 RETURNING n`;
      if (pr.n > o.pairMax) return null;
      await tx`INSERT INTO duel_ratings (account_id, rating) VALUES (${w}, ${o.start}), (${l}, ${o.start}) ON CONFLICT DO NOTHING`;
      const rows = await tx`SELECT account_id, rating FROM duel_ratings WHERE account_id IN (${w}, ${l}) FOR UPDATE`;
      const rw = rows.find(r => r.account_id === w)!.rating as number, rl = rows.find(r => r.account_id === l)!.rating as number;
      const ex = 1 / (1 + 10 ** ((rl - rw) / 400)), d = Math.max(1, Math.round(o.k * (1 - ex)));
      await tx`UPDATE duel_ratings SET rating = rating + ${d}, wins = wins + 1, updated_at = now() WHERE account_id = ${w}`;
      await tx`UPDATE duel_ratings SET rating = GREATEST(0, rating - ${d}), losses = losses + 1, updated_at = now() WHERE account_id = ${l}`;
      return { winner: rw + d, loser: Math.max(0, rl - d), delta: d };
    }) as any;
  }
  async duelTop(n: number) { const r = await this.sql`SELECT a.name, d.rating, d.wins, d.losses FROM duel_ratings d JOIN accounts a ON a.id = d.account_id WHERE d.wins + d.losses > 0 ORDER BY d.rating DESC, d.wins DESC LIMIT ${n}`; return r.map(x => ({ name: x.name, rating: x.rating, wins: x.wins, losses: x.losses })); }
  async duelMine(a: string) {
    const [m] = await this.sql`SELECT rating, wins, losses FROM duel_ratings WHERE account_id = ${a}`; if (!m) return { rating: 1000, wins: 0, losses: 0, rank: null };
    const [r] = await this.sql`SELECT count(*)::int + 1 AS rank FROM duel_ratings WHERE rating > ${m.rating} AND wins + losses > 0`;
    return { rating: m.rating, wins: m.wins, losses: m.losses, rank: m.wins + m.losses > 0 ? r.rank : null };
  }
  // ---------- guildas ----------
  private toGuild(r: any): GuildRow { return { id: r.id, name: r.name, tag: r.tag, emblem: r.emblem, motd: r.motd, fios: Number(r.fios), createdAt: r.created_at }; }
  async guildOf(a: string) {
    const [r] = await this.sql`SELECT g.*, m.role FROM guild_members m JOIN guilds g ON g.id = m.guild_id WHERE m.account_id = ${a}`;
    return r ? { guild: this.toGuild(r), role: r.role as GuildMember['role'] } : null;
  }
  async guildMembers(g: string) {
    const rows = await this.sql`SELECT m.*, a.name, a.last_seen FROM guild_members m JOIN accounts a ON a.id = m.account_id WHERE m.guild_id = ${g} ORDER BY m.joined_at`;
    return rows.map(r => ({ accountId: r.account_id, name: r.name, role: r.role, weekFios: r.week_fios, week: r.week, totalFios: r.total_fios, joinedAt: r.joined_at, lastSeen: r.last_seen }) as GuildMember);
  }
  private async waiting(tx: any, a: string, ms: number) { const [l] = await tx`SELECT left_at FROM guild_leaves WHERE account_id = ${a}`; return !!l && Date.now() - new Date(l.left_at).getTime() < ms; }
  async guildFound(a: string, g: { name: string; tag: string; emblem: any }, o: { cost: number; minLvl: number; rejoinMs: number }) {
    try {
      return await this.sql.begin(async tx => {
        const [m] = await tx`SELECT 1 FROM guild_members WHERE account_id = ${a}`; if (m) return { ok: false, reason: 'em-guilda' };
        if (await this.waiting(tx, a, o.rejoinMs)) return { ok: false, reason: 'espera' };
        const [s] = await tx`SELECT data FROM saves WHERE account_id = ${a} FOR UPDATE`; if (!s) return { ok: false, reason: 'sem-save' };
        const d = s.data; if ((Number(d.lvl) || 1) < o.minLvl) return { ok: false, reason: 'nivel' };
        if ((Number(d.gold) || 0) < o.cost) return { ok: false, reason: 'sem-centelhas' };
        const [dn] = await tx`SELECT 1 FROM guilds WHERE lower(name) = lower(${g.name})`; if (dn) return { ok: false, reason: 'nome' };
        const [dt] = await tx`SELECT 1 FROM guilds WHERE tag = ${g.tag}`; if (dt) return { ok: false, reason: 'sigla' };
        d.gold = Number(d.gold) - o.cost; d.spent = (Number(d.spent) || 0) + o.cost;
        const [u] = await tx`UPDATE saves SET data = ${tx.json(d)}, rev = rev + 1, updated_at = now() WHERE account_id = ${a} RETURNING rev`;
        const [ng] = await tx`INSERT INTO guilds (name, tag, emblem) VALUES (${g.name}, ${g.tag}, ${tx.json(g.emblem)}) RETURNING id`;
        await tx`INSERT INTO guild_members (account_id, guild_id, role) VALUES (${a}, ${ng.id}, 'lider')`;
        await tx`DELETE FROM guild_invites WHERE account_id = ${a}`;
        return { ok: true, rev: Number(u.rev), guildId: ng.id as string };
      }) as any;
    } catch (e: any) { if (e?.code === '23505') return { ok: false, reason: String(e?.constraint_name ?? '').includes('tag') ? 'sigla' : 'nome' } as const; throw e; }
  }
  async guildInvite(g: string, a: string, from: string, max: number) {
    const [m] = await this.sql`SELECT guild_id FROM guild_members WHERE account_id = ${a}`; if (m && m.guild_id === g) return 'ja-membro' as const;
    const [c] = await this.sql`SELECT count(*)::int AS n FROM guild_members WHERE guild_id = ${g}`; if (c.n >= max) return 'cheia' as const;
    await this.sql`INSERT INTO guild_invites (guild_id, account_id, from_id) VALUES (${g}, ${a}, ${from}) ON CONFLICT (guild_id, account_id) DO UPDATE SET created_at = now(), from_id = ${from}`;
    return 'ok' as const;
  }
  async guildInvites(a: string, maxAgeMs: number) {
    const rows = await this.sql`SELECT i.guild_id, i.created_at, g.name, g.tag, g.emblem, coalesce(f.name, '?') AS from_name FROM guild_invites i JOIN guilds g ON g.id = i.guild_id LEFT JOIN accounts f ON f.id = i.from_id
      WHERE i.account_id = ${a} AND i.created_at > now() - make_interval(secs => ${maxAgeMs / 1000}) ORDER BY i.created_at DESC`;
    return rows.map(r => ({ guildId: r.guild_id, name: r.name, tag: r.tag, emblem: r.emblem, fromName: r.from_name, createdAt: r.created_at }));
  }
  async guildAccept(a: string, g: string, o: { max: number; rejoinMs: number; inviteMs: number }) {
    return this.sql.begin(async tx => {
      const [i] = await tx`SELECT created_at FROM guild_invites WHERE guild_id = ${g} AND account_id = ${a}`;
      if (!i || Date.now() - new Date(i.created_at).getTime() > o.inviteMs) return { ok: false, reason: 'sem-convite' };
      const [m] = await tx`SELECT 1 FROM guild_members WHERE account_id = ${a}`; if (m) return { ok: false, reason: 'em-guilda' };
      if (await this.waiting(tx, a, o.rejoinMs)) return { ok: false, reason: 'espera' };
      await tx`SELECT id FROM guilds WHERE id = ${g} FOR UPDATE`;
      const [c] = await tx`SELECT count(*)::int AS n FROM guild_members WHERE guild_id = ${g}`; if (c.n >= o.max) return { ok: false, reason: 'cheia' };
      await tx`INSERT INTO guild_members (account_id, guild_id, role) VALUES (${a}, ${g}, 'membro')`;
      await tx`DELETE FROM guild_invites WHERE account_id = ${a}`;
      return { ok: true };
    }) as any;
  }
  async guildDecline(a: string, g: string) { await this.sql`DELETE FROM guild_invites WHERE guild_id = ${g} AND account_id = ${a}`; }
  async guildLeave(a: string) {
    return this.sql.begin(async tx => {
      const [m] = await tx`SELECT guild_id, role FROM guild_members WHERE account_id = ${a}`; if (!m) return null;
      await tx`SELECT id FROM guilds WHERE id = ${m.guild_id} FOR UPDATE`;
      await tx`DELETE FROM guild_members WHERE account_id = ${a}`;
      await tx`INSERT INTO guild_leaves (account_id) VALUES (${a}) ON CONFLICT (account_id) DO UPDATE SET left_at = now()`;
      const rest = await tx`SELECT m.account_id, m.role, a.name FROM guild_members m JOIN accounts a ON a.id = m.account_id WHERE m.guild_id = ${m.guild_id} ORDER BY (m.role = 'oficial') DESC, m.joined_at`;
      if (!rest.length) { await tx`DELETE FROM guilds WHERE id = ${m.guild_id}`; return { guildId: m.guild_id, disbanded: true, newLeader: null }; }
      if (m.role === 'lider') { await tx`UPDATE guild_members SET role = 'lider' WHERE account_id = ${rest[0].account_id}`; return { guildId: m.guild_id, disbanded: false, newLeader: rest[0].name as string }; }
      return { guildId: m.guild_id, disbanded: false, newLeader: null };
    }) as any;
  }
  async guildKick(g: string, a: string) {
    const r = await this.sql`DELETE FROM guild_members WHERE guild_id = ${g} AND account_id = ${a} AND role <> 'lider' RETURNING account_id`;
    if (r.length) await this.sql`INSERT INTO guild_leaves (account_id) VALUES (${a}) ON CONFLICT (account_id) DO UPDATE SET left_at = now()`;
    return r.length > 0;
  }
  async guildSetRole(g: string, a: string, role: GuildMember['role'], officersMax: number) {
    return this.sql.begin(async tx => {
      const [m] = await tx`SELECT role FROM guild_members WHERE guild_id = ${g} AND account_id = ${a} FOR UPDATE`; if (!m) return 'nao-membro';
      if (role === 'oficial' && m.role !== 'oficial') { const [c] = await tx`SELECT count(*)::int AS n FROM guild_members WHERE guild_id = ${g} AND role = 'oficial'`; if (c.n >= officersMax) return 'muitos-oficiais'; }
      if (role === 'lider') await tx`UPDATE guild_members SET role = 'oficial' WHERE guild_id = ${g} AND role = 'lider'`;
      await tx`UPDATE guild_members SET role = ${role} WHERE guild_id = ${g} AND account_id = ${a}`; return 'ok';
    }) as any;
  }
  async guildUpdate(g: string, p: { motd?: string; emblem?: any }) {
    if (p.motd !== undefined) await this.sql`UPDATE guilds SET motd = ${p.motd} WHERE id = ${g}`;
    if (p.emblem !== undefined) await this.sql`UPDATE guilds SET emblem = ${this.sql.json(p.emblem)} WHERE id = ${g}`;
  }
  async guildAddFios(a: string, n: number, week: number) {
    return this.sql.begin(async tx => {
      const [m] = await tx`UPDATE guild_members SET week_fios = CASE WHEN week = ${week} THEN week_fios + ${n} ELSE ${n} END, week = ${week}, total_fios = total_fios + ${n} WHERE account_id = ${a} RETURNING guild_id`;
      if (!m) return 0; await tx`UPDATE guilds SET fios = fios + ${n} WHERE id = ${m.guild_id}`; return n;
    }) as Promise<number>;
  }
  async guildDonate(a: string, gold: number, o: { per: number; dayMax: number; day: number; week: number }) {
    return this.sql.begin(async tx => {
      const [m] = await tx`SELECT guild_id, donate_day, donate_fios FROM guild_members WHERE account_id = ${a} FOR UPDATE`; if (!m) return { ok: false, reason: 'sem-guilda' };
      const used = m.donate_day === o.day ? m.donate_fios : 0, fios = Math.min(Math.floor(gold / o.per), o.dayMax - used);
      if (fios <= 0) return { ok: false, reason: 'limite' };
      const cost = fios * o.per;
      const [s] = await tx`SELECT data FROM saves WHERE account_id = ${a} FOR UPDATE`; if (!s) return { ok: false, reason: 'sem-save' };
      const d = s.data; if ((Number(d.gold) || 0) < cost) return { ok: false, reason: 'sem-centelhas' };
      d.gold = Number(d.gold) - cost; d.spent = (Number(d.spent) || 0) + cost;
      const [u] = await tx`UPDATE saves SET data = ${tx.json(d)}, rev = rev + 1, updated_at = now() WHERE account_id = ${a} RETURNING rev`;
      await tx`UPDATE guild_members SET donate_day = ${o.day}, donate_fios = ${used + fios}, week_fios = CASE WHEN week = ${o.week} THEN week_fios + ${fios} ELSE ${fios} END, week = ${o.week}, total_fios = total_fios + ${fios} WHERE account_id = ${a}`;
      await tx`UPDATE guilds SET fios = fios + ${fios} WHERE id = ${m.guild_id}`;
      return { ok: true, rev: Number(u.rev), fios, gold: cost };
    }) as any;
  }
  async guildLog(g: string, kind: string, detail: any) { await this.sql`INSERT INTO guild_log (guild_id, kind, detail) VALUES (${g}, ${kind}, ${this.sql.json(detail)})`; }
  async guildLogList(g: string, limit: number) { const r = await this.sql`SELECT kind, detail, created_at FROM guild_log WHERE guild_id = ${g} ORDER BY id DESC LIMIT ${limit}`; return r.map(x => ({ kind: x.kind, detail: x.detail, at: x.created_at })); }
  async suspicion(a: string, hours: number) {
    const [r] = await this.sql`SELECT count(*)::int AS n FROM audit WHERE account_id = ${a} AND kind IN ('save_alerta', 'suspeita_velocidade', 'suspeita_dano') AND created_at > now() - make_interval(hours => ${hours})`; return r.n as number;
  }
  async suspects(hours: number, limit: number) {
    const rows = await this.sql`SELECT a.id, a.name, a.banned, count(*)::int AS n, array_agg(DISTINCT x.kind) AS kinds FROM audit x JOIN accounts a ON a.id = x.account_id
      WHERE x.kind IN ('save_alerta', 'suspeita_velocidade', 'suspeita_dano') AND x.created_at > now() - make_interval(hours => ${hours}) GROUP BY a.id ORDER BY n DESC LIMIT ${limit}`;
    return rows.map(r => ({ id: r.id as string, name: r.name as string, n: r.n as number, banned: r.banned as boolean, kinds: r.kinds as string[] }));
  }
  async listReports(status: string | null, limit: number) {
    const rows = status
      ? await this.sql`SELECT r.*, a.name FROM reports r LEFT JOIN accounts a ON a.id = r.account_id WHERE r.status = ${status} ORDER BY r.id DESC LIMIT ${limit}`
      : await this.sql`SELECT r.*, a.name FROM reports r LEFT JOIN accounts a ON a.id = r.account_id ORDER BY r.id DESC LIMIT ${limit}`;
    return rows.map(r => ({ id: Number(r.id), accountId: r.account_id, name: r.name ?? null, kind: r.kind, target: r.target, text: r.text, ctx: r.ctx, status: r.status, createdAt: r.created_at }));
  }
  async setReportStatus(id: number, status: string) { const r = await this.sql`UPDATE reports SET status = ${status} WHERE id = ${id} RETURNING id`; return r.length > 0; }
  async addReport(r: { accountId: string | null; kind: string; target: string | null; text: string; ctx: Record<string, unknown> }) {
    const [x] = await this.sql`INSERT INTO reports (account_id, kind, target, text, ctx) VALUES (${r.accountId}, ${r.kind}, ${r.target}, ${r.text}, ${this.sql.json(r.ctx as any)}) RETURNING id`; return Number(x.id);
  }
  async deleteAccount(a: string) { await this.sql`DELETE FROM accounts WHERE id = ${a}`; }   // o resto vai junto (ON DELETE CASCADE / SET NULL)
  async exportAccount(a: string) {
    const [acc] = await this.sql`SELECT id, name, email, google_sub IS NOT NULL AS google, guest, created_at, last_seen FROM accounts WHERE id = ${a}`; if (!acc) return {};
    const q = async (p: Promise<any[]>) => (await p).map(r => ({ ...r }));
    return {
      conta: { id: acc.id, nome: acc.name, email: acc.email, google: acc.google, convidado: acc.guest, criadaEm: acc.created_at, vistoEm: acc.last_seen },
      save: (await this.sql`SELECT data FROM saves WHERE account_id = ${a}`)[0]?.data ?? null,
      fiosDourados: (await this.sql`SELECT dourados FROM wallet WHERE account_id = ${a}`)[0]?.dourados ?? 0,
      cosmeticos: await q(this.sql`SELECT cosmetic_id, source, created_at FROM cosmetics_owned WHERE account_id = ${a}`),
      temporadas: await q(this.sql`SELECT season, xp, premium, claimed FROM season_progress WHERE account_id = ${a}`),
      correio: await q(this.sql`SELECT id, from_name, item, note, created_at, claimed_at FROM mail WHERE to_id = ${a} OR from_id = ${a} ORDER BY id DESC LIMIT 1000`),
      pagamentos: await q(this.sql`SELECT id, pack, dourados, amount, status, created_at FROM payments WHERE account_id = ${a}`),
      reportes: await q(this.sql`SELECT kind, target, text, status, created_at FROM reports WHERE account_id = ${a}`),
      historico: await this.history(a, 500),
    };
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
