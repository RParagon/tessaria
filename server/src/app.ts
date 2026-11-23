import { createHash, timingSafeEqual } from 'node:crypto';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { WebSocketServer } from 'ws';
import { z } from 'zod';
import type { Config } from './config';
import type { Account, Store } from './store/types';
import { EMAIL_RE, guestName, hashPassword, hashToken, newToken, passwordProblem, verifyGoogleIdToken, verifyPassword } from './auth';
import { Hub, type HubOptions } from './hub';
import { acceptFriend, removeFriend, requestFriend, setBlock } from './social';
import { FRIEND_REQ_DAYS, type FriendsList } from '../../shared/social';
import { inc, render as renderMetrics } from './metrics';
import { mpCreatePreference, mpGetPayment, mpSignatureOk, notificationPaymentId, paymentMatches, parseRef } from './payments';
import { nameProblem, maskText, cleanChat } from '../../shared/text';
import { allItems, validateSave, MAX_SAVE_BYTES } from '../../shared/save';
import { PROTOCOL_VERSION, HUB_CAP } from '../../shared/protocol';
import { COSMETICS, cosById, DOURADOS_PACKS, LOGIN_REWARDS, PASS_FREE, PASS_PREM, SEASON, dailyMissions, dayIndex, missionNow, passLevel, seasonEnds, shopRotation, weeklyMissions, type Reward } from '../../shared/season';
import { FISH, FISH_KG, fishById, fishPoints, fishPrice, fishTrendDelta, sellFish, tourneyEnds, tourneyWeek, TOURNEY_PRIZES, type MarketState } from '../../shared/fish';

declare module 'fastify' { interface FastifyRequest { account?: Account } }

const publicAccount = (a: Account) => ({ id: a.id, name: a.name, guest: a.guest, email: a.email ? a.email.replace(/^(.).*(@.*)$/, '$1•••$2') : null, google: !!a.googleSub, password: !!a.passHash });
/** Alertas de trapaça (8 dias) a partir dos quais prêmios ficam retidos para análise. */
const SUSPECT_HOLD = 6;
const isUnique = (e: any) => e && (e.code === '23505');

export interface AppOptions { config: Config; store: Store; hub?: HubOptions }
export interface App { app: FastifyInstance; hub: Hub }

export async function buildApp({ config, store, hub: hubOpts }: AppOptions): Promise<App> {
  const app = Fastify({
    logger: { level: config.logLevel, redact: ['req.headers.authorization', 'req.headers.cookie'] },
    trustProxy: config.trustProxy,
    forceCloseConnections: true,
    bodyLimit: MAX_SAVE_BYTES + 50_000,
  });
  await app.register(cors, {
    origin: config.corsOrigins.length ? config.corsOrigins : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  });
  await app.register(rateLimit, { max: 240, timeWindow: '1 minute' });

  const hub = new Hub(store, app.log, hubOpts);
  app.addHook('onClose', async () => { hub.stop(); });

  // ---------- utilitários ----------
  const fail = (rep: FastifyReply, code: number, error: string, extra: object = {}) => rep.code(code).send({ error, ...extra });
  const parse = <T>(schema: z.ZodType<T>, body: unknown, rep: FastifyReply): T | null => {
    const r = schema.safeParse(body);
    if (!r.success) { fail(rep, 400, 'Pedido inválido.', { detalhes: r.error.issues.slice(0, 3).map(i => i.path.join('.') + ': ' + i.message) }); return null; }
    return r.data;
  };
  async function startSession(rep: FastifyReply, req: FastifyRequest, a: Account, status = 200) {
    const token = newToken();
    await store.createSession(hashToken(token), a.id, new Date(Date.now() + config.sessionDays * 864e5), String(req.headers['user-agent'] ?? ''));
    await store.updateAccount(a.id, { lastSeen: new Date() });
    return rep.code(status).send({ token, account: publicAccount(a) });
  }
  async function accountFromToken(token: string | undefined | null): Promise<Account | null> {
    if (!token || token.length > 100) return null;
    const id = await store.sessionAccount(hashToken(token));
    if (!id) return null;
    const a = await store.accountById(id);
    return a && !a.banned ? a : null;
  }
  const sameSecret = (a: string | null, b: string) => { if (!a) return false; const h = (x: string) => createHash('sha256').update(x).digest(); return timingSafeEqual(h(a), h(b)); };
  const bearer = (req: FastifyRequest) => { const h = req.headers.authorization; return h && h.startsWith('Bearer ') ? h.slice(7) : null; };
  const auth = async (req: FastifyRequest, rep: FastifyReply) => {
    const a = await accountFromToken(bearer(req));
    if (!a) return fail(rep, 401, 'Sessão expirada. Entre de novo.');
    req.account = a;
  };
  const authLimit = { config: { rateLimit: { max: config.authPerMinute, timeWindow: '1 minute' } } };
  // Limites por conta (não por IP): jogadores na mesma rede não dividem a cota.
  const perAccount = (max: number) => ({ rateLimit: { max, timeWindow: '1 minute', keyGenerator: (req: FastifyRequest) => req.headers.authorization ?? req.ip } });

  // ---------- informação ----------
  app.get('/health', async () => {
    let db = 'ok'; try { await store.counts(); } catch { db = 'erro'; }
    return { ok: db === 'ok', version: config.version, uptime: Math.round(process.uptime()), db, online: hub.online };
  });
  app.get('/config', async () => ({ version: config.version, protocol: PROTOCOL_VERSION, hubCap: HUB_CAP, googleClientId: config.googleClientId }));
  app.get('/metrics', async (req, rep) => {
    // Sem METRICS_TOKEN a rota não existe. Com ele, token ausente ou errado recebe 401:
    // coletores como o Metrics Endpoint do Grafana Cloud exigem esse código para aceitar a URL.
    if (!config.metricsToken) return fail(rep, 404, 'Não encontrado.');
    if (!sameSecret(bearer(req), config.metricsToken)) { rep.header('www-authenticate', 'Bearer'); return fail(rep, 401, 'Não autorizado.'); }
    const c = await store.counts().catch(() => ({ accounts: -1, saves: -1, mail: -1 }));
    rep.type('text/plain; version=0.0.4').send(renderMetrics({ accounts_total: c.accounts, saves_total: c.saves, mail_total: c.mail }));
  });

  // ---------- contas ----------
  const Register = z.object({ name: z.string(), email: z.string().max(254), password: z.string() });
  app.post('/auth/register', authLimit, async (req, rep) => {
    const b = parse(Register, req.body, rep); if (!b) return;
    const np = nameProblem(b.name); if (np) return fail(rep, 422, np);
    if (!EMAIL_RE.test(b.email)) return fail(rep, 422, 'E-mail inválido.');
    const pp = passwordProblem(b.password); if (pp) return fail(rep, 422, pp);
    try {
      const a = await store.createAccount({ name: b.name.trim(), email: b.email.trim().toLowerCase(), passHash: await hashPassword(b.password), guest: false });
      inc('accounts_created'); return startSession(rep, req, a, 201);
    } catch (e) {
      if (isUnique(e)) return fail(rep, 409, (await store.accountByName(b.name.trim())) ? 'Esse nome já está em uso.' : 'Já existe uma conta com esse e-mail.');
      throw e;
    }
  });

  const Login = z.object({ login: z.string().max(254), password: z.string().max(200) });
  app.post('/auth/login', authLimit, async (req, rep) => {
    const b = parse(Login, req.body, rep); if (!b) return;
    const a = b.login.includes('@') ? await store.accountByEmail(b.login.trim()) : await store.accountByName(b.login.trim());
    if (!a || !(await verifyPassword(b.password, a.passHash))) { inc('login_failed'); return fail(rep, 401, 'Login ou senha incorretos.'); }
    if (a.banned) return fail(rep, 403, 'Esta conta está suspensa.');
    inc('logins'); return startSession(rep, req, a);
  });

  app.post('/auth/guest', authLimit, async (req, rep) => {
    for (let i = 0; i < 6; i++) {
      try { const a = await store.createAccount({ name: guestName(), guest: true }); inc('accounts_guest'); return startSession(rep, req, a, 201); }
      catch (e) { if (!isUnique(e)) throw e; }
    }
    return fail(rep, 503, 'Tente de novo em instantes.');
  });

  const Upgrade = z.object({ email: z.string().max(254), password: z.string(), name: z.string().optional() });
  app.post('/auth/upgrade', { preHandler: auth, ...authLimit }, async (req, rep) => {
    const b = parse(Upgrade, req.body, rep); if (!b) return;
    const a = req.account!;
    if (!a.guest) return fail(rep, 409, 'Esta conta já tem e-mail.');
    if (!EMAIL_RE.test(b.email)) return fail(rep, 422, 'E-mail inválido.');
    const pp = passwordProblem(b.password); if (pp) return fail(rep, 422, pp);
    if (b.name !== undefined) { const np = nameProblem(b.name); if (np) return fail(rep, 422, np); }
    try {
      await store.updateAccount(a.id, { email: b.email.trim().toLowerCase(), passHash: await hashPassword(b.password), guest: false, ...(b.name ? { name: b.name.trim() } : {}) });
    } catch (e) { if (isUnique(e)) return fail(rep, 409, 'Nome ou e-mail já em uso.'); throw e; }
    return { account: publicAccount((await store.accountById(a.id))!) };
  });

  const Google = z.object({ idToken: z.string().min(20).max(4096) });
  app.post('/auth/google', authLimit, async (req, rep) => {
    if (!config.googleClientId) return fail(rep, 501, 'Login com Google não está configurado neste servidor.');
    const b = parse(Google, req.body, rep); if (!b) return;
    let g; try { g = await verifyGoogleIdToken(b.idToken, config.googleClientId); } catch { return fail(rep, 401, 'Não foi possível confirmar o login com Google.'); }
    let a = await store.accountByGoogle(g.sub);
    if (!a && g.email) { const byMail = await store.accountByEmail(g.email); if (byMail) { await store.updateAccount(byMail.id, { googleSub: g.sub }); a = byMail; } }
    if (!a) {
      const base = (g.name || 'Tecelão').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 11) || 'Tecelao';
      for (let i = 0; i < 8 && !a; i++) {
        const name = nameProblem(base) ? 'Tecelao' + Math.floor(Math.random() * 99999) : (i ? base + Math.floor(Math.random() * 9999) : base);
        try { a = await store.createAccount({ name, email: g.email, googleSub: g.sub, guest: false }); } catch (e) { if (!isUnique(e)) throw e; }
      }
      if (!a) return fail(rep, 503, 'Tente de novo em instantes.');
      inc('accounts_google');
    }
    if (a.banned) return fail(rep, 403, 'Esta conta está suspensa.');
    return startSession(rep, req, a);
  });

  app.post('/auth/logout', { preHandler: auth }, async req => { const t = bearer(req); if (t) await store.deleteSession(hashToken(t)); return { ok: true }; });
  app.get('/me', { preHandler: auth }, async req => ({ account: publicAccount(req.account!) }));

  // ---------- moderação (ADMIN_TOKEN) ----------
  // Reportes, contas com mais alertas de trapaça e suspender/reativar. Sem ADMIN_TOKEN, as rotas não existem.
  const admin = async (req: FastifyRequest, rep: FastifyReply) => {
    if (!config.adminToken) return fail(rep, 404, 'Não encontrado.');
    if (!sameSecret(bearer(req), config.adminToken)) { await new Promise(r => setTimeout(r, 300)); return fail(rep, 401, 'Não autorizado.'); }
  };
  const adminLimit = { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } };
  app.get('/admin/reports', { preHandler: admin, ...adminLimit }, async req => {
    const q = req.query as any, st = typeof q.status === 'string' && /^[a-z]{1,20}$/.test(q.status) ? q.status : null;
    return { reports: await store.listReports(st, 200) };
  });
  app.post('/admin/reports/:id', { preHandler: admin, ...adminLimit }, async (req, rep) => {
    const b = parse(z.object({ status: z.enum(['novo', 'visto', 'resolvido', 'descartado']) }), req.body, rep); if (!b) return;
    const id = Number((req.params as any).id); if (!Number.isInteger(id)) return fail(rep, 400, 'Id inválido.');
    return (await store.setReportStatus(id, b.status)) ? { ok: true } : fail(rep, 404, 'Reporte não encontrado.');
  });
  app.get('/admin/suspects', { preHandler: admin, ...adminLimit }, async req => {
    const h = Math.min(24 * 30, Math.max(1, Number((req.query as any).horas) || 24 * 7));
    return { horas: h, contas: await store.suspects(h, 100) };
  });
  app.post('/admin/accounts/:name/ban', { preHandler: admin, ...adminLimit }, async (req, rep) => {
    const b = parse(z.object({ banned: z.boolean(), motivo: z.string().max(300).optional() }), req.body, rep); if (!b) return;
    const a = await store.accountByName(String((req.params as any).name)); if (!a) return fail(rep, 404, 'Conta não encontrada.');
    await store.updateAccount(a.id, { banned: b.banned });
    if (b.banned) hub.dropAccount(a.id, 'Esta conta foi suspensa.');
    await store.audit(a.id, b.banned ? 'suspensa' : 'reativada', { motivo: b.motivo ?? '' }); return { ok: true };
  });

  // ---------- LGPD: baixar os dados e excluir a conta ----------
  app.get('/account/export', { preHandler: auth, config: perAccount(3) }, async (req, rep) => {
    const data = await store.exportAccount(req.account!.id);
    await store.audit(req.account!.id, 'conta_exportada', {});
    rep.header('content-disposition', `attachment; filename="fios-de-tessaria-${req.account!.name}.json"`);
    return { geradoEm: new Date().toISOString(), ...data };
  });
  // Exige digitar o nome do Tecelão (e a senha, se a conta tem senha). Os pagamentos ficam guardados (obrigação fiscal), sem a ligação com a conta.
  const DeleteBody = z.object({ confirm: z.string().max(40), password: z.string().max(200).optional() });
  app.post('/account/delete', { preHandler: auth, config: perAccount(5) }, async (req, rep) => {
    const b = parse(DeleteBody, req.body, rep); if (!b) return;
    const a = req.account!;
    if (b.confirm.trim().toLowerCase() !== a.name.toLowerCase()) return fail(rep, 400, 'Digite o nome do seu Tecelão exatamente para confirmar.');
    if (a.passHash && !(b.password && await verifyPassword(b.password, a.passHash))) return fail(rep, 403, 'Senha incorreta.');
    hub.dropAccount(a.id, 'Conta excluída.');
    await store.deleteAccount(a.id);
    await store.audit(null, 'conta_excluida', { id: a.id, convidado: a.guest });   // só o id (sem nome nem e-mail), para registro
    inc('accounts_deleted'); return { ok: true };
  });

  // ---------- reportar problema ou jogador ----------
  const ReportBody = z.object({ kind: z.enum(['bug', 'jogador', 'pagamento', 'outro']), text: z.string().trim().min(5).max(1500), target: z.string().max(40).optional(), ctx: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()])).optional() });
  app.post('/report', { config: { rateLimit: { max: 6, timeWindow: '10 minutes' } } }, async (req, rep) => {
    const b = parse(ReportBody, req.body, rep); if (!b) return;
    const a = await accountFromToken(bearer(req)).catch(() => null);
    const ctx = Object.fromEntries(Object.entries(b.ctx ?? {}).slice(0, 20));
    const id = await store.addReport({ accountId: a?.id ?? null, kind: b.kind, target: b.target?.trim() || null, text: b.text, ctx });
    inc('reports'); req.log.info({ report: id, kind: b.kind }, 'reporte recebido');
    return { ok: true, id };
  });

  const Rename = z.object({ name: z.string() });
  app.patch('/me', { preHandler: auth, ...authLimit }, async (req, rep) => {
    const b = parse(Rename, req.body, rep); if (!b) return;
    const np = nameProblem(b.name); if (np) return fail(rep, 422, np);
    try { await store.updateAccount(req.account!.id, { name: b.name.trim() }); } catch (e) { if (isUnique(e)) return fail(rep, 409, 'Esse nome já está em uso.'); throw e; }
    return { account: publicAccount((await store.accountById(req.account!.id))!) };
  });

  // ---------- save na nuvem ----------
  app.get('/save', { preHandler: auth }, async (req, rep) => {
    const s = await store.getSave(req.account!.id);
    if (!s) return { rev: 0, data: null };
    return { rev: s.rev, data: s.data, updatedAt: s.updatedAt };
  });

  const PutSave = z.object({ rev: z.number().int().min(0), data: z.record(z.any()) });
  app.put('/save', { preHandler: auth, config: perAccount(30) }, async (req, rep) => {
    const b = parse(PutSave, req.body, rep); if (!b) return;
    const a = req.account!, prev = await store.getSave(a.id);
    const check = validateSave(b.data, { prev: prev?.data ?? null, elapsedMs: prev ? Date.now() - new Date(prev.updatedAt).getTime() : 0 });
    const ids = allItems(b.data).map(x => x.it?.id).filter((x): x is string => typeof x === 'string');
    const dead = await store.tombstoned(a.id, ids);
    if (dead.length) check.errors.push(`itens que já saíram pelo correio: ${dead.slice(0, 3).join(', ')}`);
    { const c = (b.data as any).char || {}, want = [c.trail, c.namecolor, c.ctitle, c.tele, c.death, c.frame].filter((x: unknown) => typeof x === 'string' && x); if (want.length) { const own = new Set((await store.seasonGet(a.id, SEASON.id)).owned); for (const w of want) if (!own.has(w)) check.errors.push(`cosmético que a conta não tem: ${w}`); } }   // Fios Dourados e cosméticos: a posse é do servidor
    // Itens marcados como sorteados pelo servidor (g=1) precisam estar no registro.
    const claimed = allItems(b.data).filter(x => x.it && (x.it as any).g === 1).map(x => x.it.id).filter((x): x is string => typeof x === 'string');
    if (claimed.length) { const ok = new Set(await store.granted(claimed)); const fake = claimed.filter(id => !ok.has(id)); if (fake.length) check.errors.push(`itens do servidor desconhecidos: ${fake.slice(0, 3).join(', ')}`); }
    if (check.errors.length) {
      inc('saves_rejected');
      await store.audit(a.id, 'save_rejeitado', { erros: check.errors.slice(0, 10), rev: b.rev });
      return fail(rep, 422, 'O servidor recusou este progresso.', { erros: check.errors.slice(0, 5) });
    }
    if (check.flags.length) await store.audit(a.id, 'save_alerta', { alertas: check.flags, rev: b.rev });
    const r = await store.putSave(a.id, b.data, b.rev);
    if (!r.ok) { inc('saves_conflict'); return fail(rep, 409, 'O progresso na nuvem mudou em outro lugar.', { rev: r.rev }); }
    inc('saves_ok'); hub.refreshTitle(a.id, b.data);
    return { rev: r.rev };
  });

  const ResetSave = z.object({ confirm: z.literal('APAGAR') });
  app.delete('/save', { preHandler: auth, config: perAccount(3) }, async (req, rep) => {
    if (!parse(ResetSave, req.body, rep)) return;
    const prev = await store.getSave(req.account!.id);
    await store.deleteSave(req.account!.id);
    await store.audit(req.account!.id, 'save_apagado', { nivel: prev?.data?.lvl ?? null, rev: prev?.rev ?? 0 });
    return { ok: true };
  });

  // ---------- correio ----------
  app.get('/mail', { preHandler: auth }, async req => ({ mail: (await store.listMail(req.account!.id)).map(m => ({ id: m.id, from: m.fromName, item: m.item, note: m.note, at: m.createdAt })) }));

  const Send = z.object({ to: z.string().max(32), itemId: z.string().max(24), note: z.string().max(200).optional() });
  app.post('/mail/send', { preHandler: auth, config: perAccount(10) }, async (req, rep) => {
    const b = parse(Send, req.body, rep); if (!b) return;
    const from = req.account!, to = await store.accountByName(b.to.trim());
    if (!to || to.banned) return fail(rep, 404, 'Nenhum Tecelão com esse nome.');
    if (to.id === from.id) return fail(rep, 422, 'Você não pode enviar para si mesmo.');
    const note = maskText(cleanChat(b.note ?? '', 80));
    const r = await store.transferItem(from.id, from.name, to.id, b.itemId, note);
    if (!r.ok) return fail(rep, 409, r.reason === 'equipado' ? 'Tire o item do corpo antes de enviar.' : r.reason === 'sem-save' ? 'Sincronize seu progresso antes de enviar.' : 'Esse item não está na sua bolsa na nuvem. Sincronize e tente de novo.');
    inc('mail_sent'); await store.audit(from.id, 'correio_envio', { para: to.id, item: b.itemId, carta: r.mailId });
    return { rev: r.rev, mailId: r.mailId };
  });

  app.post('/mail/:id/claim', { preHandler: auth }, async (req, rep) => {
    const id = Number((req.params as any).id);
    if (!Number.isSafeInteger(id) || id <= 0) return fail(rep, 400, 'Carta inválida.');
    const r = await store.claimMail(req.account!.id, id);
    if (!r.ok) return fail(rep, r.reason === 'bolsa-cheia' ? 409 : 404, ({ 'bolsa-cheia': 'Sua bolsa está cheia.', 'ja-resgatado': 'Essa carta já foi aberta.', 'nao-encontrado': 'Carta não encontrada.', 'sem-save': 'Sincronize seu progresso antes de abrir cartas.' } as const)[r.reason]);
    inc('mail_claimed'); return { rev: r.rev, item: r.item };
  });

  // ---------- mercado de peixes (compartilhado: quanto mais gente vende o mesmo peixe, mais ele barateia) ----------
  const market: MarketState = {};
  const prices = () => { const now = Date.now(); return Object.fromEntries(FISH.map(f => [f.id, { p: fishPrice(market, f.id, now), d: +fishTrendDelta(f.id, now).toFixed(3) }])); };
  app.get('/fish/market', async () => ({ prices: prices(), at: Date.now() }));
  const SellFish = z.object({ fish: z.string().max(16), n: z.number().int().min(1).max(99) });
  app.post('/fish/sell', { preHandler: auth, config: perAccount(40) }, async (req, rep) => {
    const b = parse(SellFish, req.body, rep); if (!b) return;
    if (!fishById(b.fish)) return fail(rep, 422, 'Peixe desconhecido.');
    const total = sellFish(market, b.fish, b.n, Date.now());
    inc('fish_sold', b.n);
    return { total, prices: prices() };
  });

  // ---------- mercado da vila ----------
  // O item sai da bolsa do vendedor (na nuvem) ao anunciar e vai para a do comprador, que paga do próprio save.
  // O vendedor recebe as vendas quando quiser, menos 5% de taxa da vila. Até 8 anúncios por conta.
  const MARKET_TAX = .05, MARKET_MAX = 8;
  const mfail = (rep: FastifyReply, r: string) => fail(rep, r === 'bolsa-cheia' || r === 'sem-ouro' || r === 'limite' || r === 'vendido' || r === 'equipado' ? 409 : r === 'nao-encontrado' ? 404 : 422,
    ({ 'sem-save': 'Sincronize seu progresso antes.', 'sem-item': 'Esse item não está na sua bolsa na nuvem. Sincronize e tente de novo.', equipado: 'Tire o item do corpo antes.', limite: `No máximo ${MARKET_MAX} anúncios ao mesmo tempo.`, 'nao-encontrado': 'Anúncio não encontrado.', vendido: 'Esse item já foi vendido.', proprio: 'Esse anúncio é seu.', 'sem-ouro': 'Centelhas insuficientes (na nuvem).', 'bolsa-cheia': 'Bolsa cheia.', nada: 'Nada para receber.' } as Record<string, string>)[r] ?? 'Não deu certo.');
  app.get('/history', { preHandler: auth }, async req => ({ history: await store.history(req.account!.id, 40) }));
  app.get('/market', { preHandler: auth }, async req => ({ active: await store.marketActive(200), mine: await store.marketMine(req.account!.id), tax: MARKET_TAX, max: MARKET_MAX }));
  const ListBody = z.object({ itemId: z.string().max(40), price: z.number().int().min(1).max(10_000_000) });
  app.post('/market/list', { preHandler: auth, config: perAccount(20) }, async (req, rep) => {
    const b = parse(ListBody, req.body, rep); if (!b) return;
    const r = await store.marketList(req.account!.id, req.account!.name, b.itemId, b.price, MARKET_MAX); if (!r.ok) return mfail(rep, r.reason);
    inc('market_listed'); await store.audit(req.account!.id, 'mercado_anuncio', { item: b.itemId, preco: b.price }); return { rev: r.rev, id: r.id };
  });
  app.post('/market/:id/buy', { preHandler: auth, config: perAccount(30) }, async (req, rep) => {
    const id = Number((req.params as any).id); if (!Number.isSafeInteger(id) || id <= 0) return fail(rep, 400, 'Anúncio inválido.');
    const r = await store.marketBuy(req.account!.id, id); if (!r.ok) return mfail(rep, r.reason);
    inc('market_sold'); await store.audit(req.account!.id, 'mercado_compra', { anuncio: id, preco: r.price }); return { rev: r.rev, item: r.item, price: r.price };
  });
  app.post('/market/:id/cancel', { preHandler: auth, config: perAccount(20) }, async (req, rep) => {
    const id = Number((req.params as any).id); if (!Number.isSafeInteger(id) || id <= 0) return fail(rep, 400, 'Anúncio inválido.');
    const r = await store.marketCancel(req.account!.id, id); if (!r.ok) return mfail(rep, r.reason);
    return { rev: r.rev, item: r.item };
  });
  app.post('/market/collect', { preHandler: auth, config: perAccount(20) }, async (req, rep) => {
    const r = await store.marketCollect(req.account!.id, MARKET_TAX); if (!r.ok) return mfail(rep, r.reason);
    return { rev: r.rev, gold: r.gold, n: r.n };
  });

  // ---------- temporada: Passe do Tear, missões, entrada diária, loja de cosméticos ----------
  // Fios Dourados e cosméticos ficam no servidor. Centelhas e Fios do Tear das recompensas vão para o save da nuvem.
  const seasonView = async (id: string) => {
    const now = Date.now(), me = await store.seasonGet(id, SEASON.id);
    return { season: SEASON, endsAt: seasonEnds(), me: { ...me, level: passLevel(me.xp), loginToday: me.lastDay === dayIndex(now) }, daily: dailyMissions(now), weekly: weeklyMissions(now), shop: shopRotation(now), packs: DOURADOS_PACKS, payments: config.mpAccessToken ? 'mp' : config.devPayments ? 'dev' : 'em-breve' };
  };
  const giveReward = async (id: string, r: Reward, source: string) => {
    if ('dourados' in r) { await store.walletAdd(id, r.dourados); return {}; }
    if ('cos' in r) { await store.grantCosmetic(id, r.cos, source); return {}; }
    const rev = await store.saveReward(id, 'centelhas' in r ? r.centelhas : 0, 'fios' in r ? r.fios : 0); return { rev };
  };
  app.get('/season', { preHandler: auth }, async req => seasonView(req.account!.id));
  const MissionBody = z.object({ id: z.string().max(40) });
  app.post('/season/mission', { preHandler: auth, config: perAccount(30) }, async (req, rep) => {
    const b = parse(MissionBody, req.body, rep); if (!b) return;
    const m = missionNow(b.id, Date.now()); if (!m) return fail(rep, 404, 'Essa missão já passou.');
    if (!(await store.seasonMission(req.account!.id, SEASON.id, m.id, m.xp))) return fail(rep, 409, 'Missão já resgatada.');
    inc('season_missions'); return { xp: m.xp, view: await seasonView(req.account!.id) };
  });
  const ClaimBody = z.object({ level: z.number().int().min(1).max(200), track: z.enum(['free', 'prem']) });
  app.post('/season/claim', { preHandler: auth, config: perAccount(60) }, async (req, rep) => {
    const b = parse(ClaimBody, req.body, rep); if (!b) return;
    const id = req.account!.id, me = await store.seasonGet(id, SEASON.id), r = (b.track === 'free' ? PASS_FREE : PASS_PREM)[b.level];
    if (!r) return fail(rep, 404, 'Sem recompensa nesse nível.');
    if (passLevel(me.xp) < b.level) return fail(rep, 403, 'Nível do passe ainda não alcançado.');
    if (b.track === 'prem' && !me.premium) return fail(rep, 403, 'Recompensa do Passe Premium.');
    if (!(await store.seasonClaim(id, SEASON.id, b.level, b.track))) return fail(rep, 409, 'Já resgatada.');
    const out = await giveReward(id, r, `passe${SEASON.id}_${b.track}_${b.level}`);
    return { reward: r, ...out, view: await seasonView(id) };
  });
  app.post('/season/premium', { preHandler: auth, config: perAccount(10) }, async (req, rep) => {
    const r = await store.seasonPremium(req.account!.id, SEASON.id, SEASON.premiumPrice);
    if (r === 'ja') return fail(rep, 409, 'Você já tem o Passe Premium.'); if (r === 'sem-dourados') return fail(rep, 402, 'Fios Dourados insuficientes.');
    await store.audit(req.account!.id, 'passe_premium', { temporada: SEASON.id }); return { view: await seasonView(req.account!.id) };
  });
  app.post('/login/claim', { preHandler: auth, config: perAccount(10) }, async (req, rep) => {
    const id = req.account!.id, r = await store.loginClaim(id, dayIndex(Date.now()));
    if (!r.ok) return fail(rep, 409, 'Você já recebeu a recompensa de hoje.');
    const rw = LOGIN_REWARDS[(r.streak - 1) % LOGIN_REWARDS.length], out = await giveReward(id, rw, 'entrada');
    return { reward: rw, streak: r.streak, ...out, view: await seasonView(id) };
  });
  const BuyCos = z.object({ id: z.string().max(40) });
  app.post('/shop/buy', { preHandler: auth, config: perAccount(20) }, async (req, rep) => {
    const b = parse(BuyCos, req.body, rep); if (!b) return;
    const c = cosById(b.id); if (!c || c.src !== 'loja' || !c.price) return fail(rep, 404, 'Esse cosmético não está à venda.');
    if (!shopRotation(Date.now()).includes(c.id)) return fail(rep, 409, 'Esse cosmético não está na vitrine desta semana.');
    const r = await store.buyCosmetic(req.account!.id, c.id, c.price);
    if (r === 'ja') return fail(rep, 409, 'Você já tem esse cosmético.'); if (r === 'sem-dourados') return fail(rep, 402, 'Fios Dourados insuficientes.');
    inc('shop_bought'); await store.audit(req.account!.id, 'loja_cosmetico', { id: c.id, preco: c.price }); return { view: await seasonView(req.account!.id) };
  });
  // Compra de Fios Dourados com dinheiro real: Mercado Pago (Checkout Pro, Pix e cartão) na web.
  // O crédito só acontece no webhook, depois de o servidor conferir o pagamento na API do Mercado Pago.
  // Sem MP_ACCESS_TOKEN, só o modo de desenvolvimento credita (nunca em produção).
  app.post('/shop/dourados', { preHandler: auth, config: perAccount(10) }, async (req, rep) => {
    const b = parse(z.object({ pack: z.string().max(10) }), req.body, rep); if (!b) return;
    const p = DOURADOS_PACKS.find(x => x.id === b.pack); if (!p) return fail(rep, 404, 'Pacote desconhecido.');
    if (config.mpAccessToken) {
      const api = config.publicApiUrl ?? `${req.protocol}://${req.host}`;
      const site = config.siteUrl ?? config.corsOrigins.find(o => !/\/\/(localhost|127\.0\.0\.1)(:|$)/.test(o)) ?? null;
      try {
        const pref = await mpCreatePreference(config.mpAccessToken, { pack: p, accountId: req.account!.id, notificationUrl: `${api}/payments/mp/webhook`, siteUrl: site });
        inc('mp_checkout'); await store.audit(req.account!.id, 'mp_checkout', { pack: p.id, preferencia: pref.id });
        return { checkout: pref.url };
      } catch (e: any) { req.log.error({ err: e?.message }, 'mercado pago: falha ao criar a preferência'); return fail(rep, 502, 'Não foi possível abrir o pagamento agora. Tente de novo em instantes.'); }
    }
    if (!config.devPayments) return fail(rep, 501, 'Compras com dinheiro real chegam em breve.');
    await store.walletAdd(req.account!.id, p.n); return { view: await seasonView(req.account!.id) };
  });
  // Webhook do Mercado Pago. Responde 200 sempre que a notificação foi entendida (senão ele reenvia por dias);
  // 500 só quando a API do Mercado Pago falhou, para ele tentar de novo depois.
  app.post('/payments/mp/webhook', { config: { rateLimit: { max: 600, timeWindow: '1 minute' } } }, async (req, rep) => {
    if (!config.mpAccessToken) return rep.code(404).send({ error: 'Pagamentos desligados.' });
    const id = notificationPaymentId(req.body, req.query); if (!id) return { ok: true };
    if (config.mpWebhookSecret) {
      const dataId = String((req.query as any)?.['data.id'] ?? (req.body as any)?.data?.id ?? id);
      if (!mpSignatureOk(config.mpWebhookSecret, req.headers['x-signature'], req.headers['x-request-id'], dataId)) { inc('mp_bad_signature'); return rep.code(401).send({ error: 'Assinatura inválida.' }); }
    }
    let pay; try { pay = await mpGetPayment(config.mpAccessToken, id); } catch (e: any) { req.log.error({ err: e?.message, id }, 'mercado pago: falha ao consultar o pagamento'); return rep.code(500).send({ error: 'Tente de novo.' }); }
    if (!pay) return { ok: true };
    const ref = parseRef(pay.ref); if (!ref) { req.log.warn({ id }, 'mercado pago: pagamento sem referência do jogo'); return { ok: true }; }
    if (pay.status === 'refunded' || pay.status === 'charged_back') {
      const r = await store.paymentRevoke(pay.id, pay.status === 'refunded' ? 'estornado' : 'contestado');
      if (r) { inc('mp_revoked'); await store.audit(r.accountId, 'mp_estorno', { pagamento: pay.id, dourados: r.dourados, status: pay.status }); }
      return { ok: true };
    }
    if (!paymentMatches(pay, ref.pack)) { if (pay.status === 'approved') req.log.warn({ id, valor: pay.amount, moeda: pay.currency }, 'mercado pago: valor não confere com o pacote'); return { ok: true }; }
    if (await store.paymentCredit({ id: pay.id, provider: 'mercadopago', accountId: ref.accountId, pack: ref.pack.id, dourados: ref.pack.n, amount: pay.amount })) {
      inc('mp_credited'); await store.audit(ref.accountId, 'mp_credito', { pagamento: pay.id, pacote: ref.pack.id, dourados: ref.pack.n });
    }
    return { ok: true };
  });

  // ---------- torneio semanal de pesca ----------
  // Cada pesca vale pontos pelo peso (relativo à espécie) e pela raridade; a semana vira toda segunda 00:00 UTC.
  // Os 10 primeiros da semana passada resgatam o prêmio uma vez. Fase 1: o jogo diz o que pescou; o servidor confere a espécie, a faixa de peso e o ritmo.
  const lastCatch = new Map<string, number>();
  const CatchBody = z.object({ fish: z.string().max(16), kg: z.number().positive().max(100) });
  app.post('/fish/catch', { preHandler: auth, config: perAccount(30) }, async (req, rep) => {
    const b = parse(CatchBody, req.body, rep); if (!b) return;
    const r = FISH_KG[b.fish]; if (!fishById(b.fish) || !r) return fail(rep, 422, 'Peixe desconhecido.');
    if (b.kg < r[0] - 1e-6 || b.kg > r[1] + 1e-6) return fail(rep, 422, 'Peso impossível para esse peixe.');
    const id = req.account!.id, now = Date.now(); if (now - (lastCatch.get(id) ?? 0) < 2500) return fail(rep, 429, 'Devagar: uma pesca de cada vez.');
    lastCatch.set(id, now);
    const pts = fishPoints(b.fish, b.kg), total = await store.addFishCatch(tourneyWeek(now), id, pts, b.fish, b.kg);
    const me = await store.fishMine(tourneyWeek(now), id);
    inc('fish_catches'); return { points: pts, total, rank: me?.rank ?? null };
  });
  app.get('/fish/tournament', { preHandler: auth }, async req => {
    const now = Date.now(), wk = tourneyWeek(now), id = req.account!.id;
    const [top, me, lastTop, lastMe] = await Promise.all([store.fishTop(wk, 20), store.fishMine(wk, id), store.fishTop(wk - 1, 3), store.fishMine(wk - 1, id)]);
    return { week: wk, endsAt: tourneyEnds(wk), top, me, last: { top: lastTop, me: lastMe ? { ...lastMe, prize: lastMe.rank <= TOURNEY_PRIZES.length ? TOURNEY_PRIZES[lastMe.rank - 1] : 0 } : null } };
  });
  app.post('/fish/tournament/claim', { preHandler: auth, config: perAccount(10) }, async (req, rep) => {
    const wk = tourneyWeek(Date.now()) - 1, id = req.account!.id, me = await store.fishMine(wk, id);
    if (!me || me.rank > TOURNEY_PRIZES.length) return fail(rep, 404, 'Sem prêmio na semana passada.');
    if ((await store.suspicion(id, 24 * 8)) >= SUSPECT_HOLD) { await store.audit(id, 'torneio_premio_retido', { semana: wk, posicao: me.rank }); return fail(rep, 403, 'Seu prêmio está em análise. Fale com a moderação pelo Reportar problema.'); }
    if (!(await store.claimFishPrize(wk, id))) return fail(rep, 409, 'Prêmio já resgatado.');
    const gold = TOURNEY_PRIZES[me.rank - 1]; if (me.rank === 1) await store.grantCosmetic(id, 'tit_campeao', 'torneio');   // título de conquista: nunca vendido
    await store.audit(id, 'torneio_premio', { semana: wk, posicao: me.rank, centelhas: gold });
    return { gold, rank: me.rank };
  });

  // ---------- amigos e bloqueios (docs/ONLINE.md) ----------
  app.get('/friends', { preHandler: auth }, async req => {
    const me = req.account!, links = await store.friendLinks(me.id, FRIEND_REQ_DAYS), blocked = await store.blockedBy(me.id);
    const out: FriendsList = { friends: [], incoming: [], outgoing: [], blocked: blocked.map(b => ({ name: b.name })) };
    for (const l of links) {
      if (l.state === 'amigo') { const pr = hub.presence(l.otherId); out.friends.push({ name: l.otherName, online: !!pr, where: pr?.where ?? '', title: pr?.title ?? '', lastSeen: l.otherLastSeen ? l.otherLastSeen.toISOString() : null }); }
      else (l.state === 'recebido' ? out.incoming : out.outgoing).push({ name: l.otherName, at: l.since.toISOString() });
    }
    out.friends.sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
    return out;
  });
  const ByName = z.object({ name: z.string().min(1).max(32) });
  app.post('/friends', { preHandler: auth, config: perAccount(30) }, async (req, rep) => {
    const b = parse(ByName, req.body, rep); if (!b) return;
    const me = req.account!, r = await requestFriend(store, me, b.name);
    if (!r.ok) return fail(rep, r.code, r.error);
    if (r.state === 'amigos') { hub.friendsChanged(me.id, r.other.id, true); hub.notify(r.other.id, { t: 'social', ev: 'aceito', name: me.name }); }
    else hub.notify(r.other.id, { t: 'social', ev: 'pedido', name: me.name });
    inc('friend_requests'); return { state: r.state, name: r.other.name };
  });
  app.post('/friends/accept', { preHandler: auth, config: perAccount(30) }, async (req, rep) => {
    const b = parse(ByName, req.body, rep); if (!b) return;
    const me = req.account!, r = await acceptFriend(store, me, b.name);
    if (!r.ok) return fail(rep, r.code, r.error);
    hub.friendsChanged(me.id, r.other.id, true); hub.notify(r.other.id, { t: 'social', ev: 'aceito', name: me.name });
    return { state: 'amigos', name: r.other.name };
  });
  app.post('/friends/remove', { preHandler: auth, config: perAccount(30) }, async (req, rep) => {
    const b = parse(ByName, req.body, rep); if (!b) return;
    const me = req.account!, r = await removeFriend(store, me, b.name);
    if (!r.ok) return fail(rep, r.code, r.error);
    hub.friendsChanged(me.id, r.other.id, false); return { ok: true };
  });
  app.post('/blocks', { preHandler: auth, config: perAccount(30) }, async (req, rep) => {
    const b = parse(ByName, req.body, rep); if (!b) return;
    const me = req.account!, r = await setBlock(store, me, b.name, true);
    if (!r.ok) return fail(rep, r.code, r.error);
    hub.blockChanged(me.id, r.other.id, true); await store.audit(me.id, 'bloqueio', { conta: r.other.id }).catch(() => {});
    return { ok: true };
  });
  app.post('/blocks/remove', { preHandler: auth, config: perAccount(30) }, async (req, rep) => {
    const b = parse(ByName, req.body, rep); if (!b) return;
    const me = req.account!, r = await setBlock(store, me, b.name, false);
    if (!r.ok) return fail(rep, r.code, r.error);
    hub.blockChanged(me.id, r.other.id, false); return { ok: true };
  });

  // ---------- telemetria ----------
  const ErrorReport = z.object({ version: z.string().max(40), message: z.string().max(500), stack: z.string().max(4000).optional(), url: z.string().max(300).optional() });
  app.post('/telemetry/error', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req, rep) => {
    const b = parse(ErrorReport, req.body, rep); if (!b) return;
    const a = await accountFromToken(bearer(req)).catch(() => null);
    await store.logClientError({ accountId: a?.id ?? null, version: b.version, message: b.message, stack: b.stack ?? '', ua: String(req.headers['user-agent'] ?? '').slice(0, 300), url: b.url ?? '' });
    inc('client_errors'); return rep.code(204).send();
  });

  // ---------- WebSocket da vila ----------
  const wss = new WebSocketServer({ noServer: true, maxPayload: 32 * 1024 });
  app.server.on('upgrade', async (req, socket, head) => {
    try {
      const url = new URL(req.url ?? '/', 'http://x');
      if (url.pathname !== '/ws') return socket.destroy();
      const origin = req.headers.origin;
      if (config.corsOrigins.length && origin && !config.corsOrigins.includes(origin)) return socket.destroy();
      const a = await accountFromToken(url.searchParams.get('token'));
      if (!a) { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); return socket.destroy(); }
      const where = url.searchParams.get('r') || 'hub', whereN = Number(url.searchParams.get('n')) || 0;
      wss.handleUpgrade(req, socket, head, ws => { hub.connect(ws, a, where, whereN).catch(e => { app.log.warn({ err: e }, 'falha ao entrar na vila'); ws.close(1011); }); });
    } catch (e) { app.log.warn({ err: e }, 'upgrade falhou'); socket.destroy(); }
  });
  app.addHook('onClose', async () => { wss.close(); });

  app.setErrorHandler((err, _req, rep) => {
    if ((err as any).statusCode === 429) return rep.code(429).send({ error: 'Muitas tentativas. Espere um pouco.' });
    if ((err as any).statusCode && (err as any).statusCode < 500) return rep.code((err as any).statusCode).send({ error: 'Pedido inválido.' });
    app.log.error({ err }, 'erro interno'); inc('server_errors');
    return rep.code(500).send({ error: 'Erro no servidor. Tente de novo.' });
  });

  return { app, hub };
}
