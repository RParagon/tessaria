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
import { nameProblem, maskText, cleanChat } from '../../shared/text';
import { allItems, validateSave, MAX_SAVE_BYTES } from '../../shared/save';
import { PROTOCOL_VERSION, HUB_CAP } from '../../shared/protocol';

declare module 'fastify' { interface FastifyRequest { account?: Account } }

const publicAccount = (a: Account) => ({ id: a.id, name: a.name, guest: a.guest, email: a.email ? a.email.replace(/^(.).*(@.*)$/, '$1•••$2') : null, google: !!a.googleSub });
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
