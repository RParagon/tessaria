import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, SignJWT, createLocalJWKSet, exportJWK } from 'jose';
import { setGoogleJwksForTests } from '../src/auth';
import { STORES, startServer, api, register, baseSave, item, type TestServer } from './helpers';

for (const kind of STORES) {
  describe(`API (${kind})`, () => {
    let S: TestServer;
    before(async () => { S = await startServer(kind, { metricsToken: 'segredo-metricas', googleClientId: 'cliente-teste' }); });
    after(async () => { await S.close(); });

    test('saúde e configuração públicas', async () => {
      const h = await api(S.url, 'GET', '/health');
      assert.equal(h.status, 200); assert.equal(h.body.ok, true);
      const c = await api(S.url, 'GET', '/config');
      assert.equal(c.body.googleClientId, 'cliente-teste');
    });

    test('registro, login por e-mail e por nome, /me e logout', async () => {
      const r = await api(S.url, 'POST', '/auth/register', { name: 'Ysa_01', email: 'ysa@exemplo.com', password: 'senha1234' });
      assert.equal(r.status, 201); assert.ok(r.body.token);
      assert.equal((await api(S.url, 'POST', '/auth/register', { name: 'ysa_01', email: 'outra@exemplo.com', password: 'senha1234' })).status, 409);
      assert.equal((await api(S.url, 'POST', '/auth/register', { name: 'Outra', email: 'YSA@exemplo.com', password: 'senha1234' })).status, 409);
      assert.equal((await api(S.url, 'POST', '/auth/register', { name: 'Fraca', email: 'f@exemplo.com', password: '123' })).status, 422);
      assert.equal((await api(S.url, 'POST', '/auth/register', { name: 'Admin', email: 'a@exemplo.com', password: 'senha1234' })).status, 422);
      const l1 = await api(S.url, 'POST', '/auth/login', { login: 'ysa@exemplo.com', password: 'senha1234' });
      const l2 = await api(S.url, 'POST', '/auth/login', { login: 'YSA_01', password: 'senha1234' });
      assert.equal(l1.status, 200); assert.equal(l2.status, 200);
      assert.equal((await api(S.url, 'POST', '/auth/login', { login: 'ysa@exemplo.com', password: 'errada123' })).status, 401);
      const me = await api(S.url, 'GET', '/me', undefined, l1.body.token);
      assert.equal(me.body.account.name, 'Ysa_01'); assert.equal(me.body.account.email, 'y•••@exemplo.com');
      await api(S.url, 'POST', '/auth/logout', {}, l1.body.token);
      assert.equal((await api(S.url, 'GET', '/me', undefined, l1.body.token)).status, 401);
      assert.equal((await api(S.url, 'GET', '/me', undefined, l2.body.token)).status, 200);
    });

    test('convidado vira conta completa sem perder nada', async () => {
      const g = await api(S.url, 'POST', '/auth/guest', {});
      assert.equal(g.status, 201); assert.equal(g.body.account.guest, true); assert.match(g.body.account.name, /^Tecelão\d+$/);
      await api(S.url, 'PUT', '/save', { rev: 0, data: baseSave() }, g.body.token);
      const u = await api(S.url, 'POST', '/auth/upgrade', { email: 'convidado@exemplo.com', password: 'senha1234', name: 'Viajante' }, g.body.token);
      assert.equal(u.status, 200); assert.equal(u.body.account.guest, false); assert.equal(u.body.account.name, 'Viajante');
      const l = await api(S.url, 'POST', '/auth/login', { login: 'convidado@exemplo.com', password: 'senha1234' });
      assert.equal((await api(S.url, 'GET', '/save', undefined, l.body.token)).body.rev, 1);
    });

    test('trocar de nome respeita regras e unicidade', async () => {
      const a = await register(S.url, 'Primeiro'), b = await register(S.url);
      assert.equal((await api(S.url, 'PATCH', '/me', { name: 'primeiro' }, b.token)).status, 409);
      assert.equal((await api(S.url, 'PATCH', '/me', { name: 'Novo_Nome' }, b.token)).status, 200);
      assert.equal((await api(S.url, 'PATCH', '/me', { name: 'P0rra' }, a.token)).status, 422);
    });

    test('login com Google cria a conta e entra de novo na mesma', async () => {
      const { publicKey, privateKey } = await generateKeyPair('RS256');
      const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' };
      setGoogleJwksForTests(createLocalJWKSet({ keys: [jwk] }));
      const tok = (aud = 'cliente-teste') => new SignJWT({ email: 'gui@gmail.com', email_verified: true, given_name: 'Guilherme' }).setProtectedHeader({ alg: 'RS256', kid: 'k1' })
        .setIssuer('https://accounts.google.com').setAudience(aud).setSubject('google-123').setIssuedAt().setExpirationTime('5m').sign(privateKey);
      const r1 = await api(S.url, 'POST', '/auth/google', { idToken: await tok() });
      assert.equal(r1.status, 200); assert.equal(r1.body.account.google, true);
      const r2 = await api(S.url, 'POST', '/auth/google', { idToken: await tok() });
      assert.equal(r2.body.account.id, r1.body.account.id);
      assert.equal((await api(S.url, 'POST', '/auth/google', { idToken: await tok('outro-app') })).status, 401);
      setGoogleJwksForTests(null);
    });

    test('save: criar, ler, revisão otimista e conflito', async () => {
      const a = await register(S.url);
      assert.deepEqual((await api(S.url, 'GET', '/save', undefined, a.token)).body, { rev: 0, data: null });
      const p1 = await api(S.url, 'PUT', '/save', { rev: 0, data: baseSave() }, a.token);
      assert.equal(p1.status, 200); assert.equal(p1.body.rev, 1);
      const p2 = await api(S.url, 'PUT', '/save', { rev: 1, data: baseSave({ gold: 200 }) }, a.token);
      assert.equal(p2.body.rev, 2);
      const stale = await api(S.url, 'PUT', '/save', { rev: 1, data: baseSave({ gold: 300 }) }, a.token);
      assert.equal(stale.status, 409); assert.equal(stale.body.rev, 2);
      assert.equal((await api(S.url, 'GET', '/save', undefined, a.token)).body.data.gold, 200);
    });

    test('save: apagar exige confirmação e libera recomeçar do zero', async () => {
      const a = await register(S.url);
      await api(S.url, 'PUT', '/save', { rev: 0, data: baseSave({ lvl: 20, gold: 5000 }) }, a.token);
      assert.equal((await api(S.url, 'PUT', '/save', { rev: 1, data: baseSave({ lvl: 1 }) }, a.token)).status, 422);
      assert.equal((await api(S.url, 'DELETE', '/save', { confirm: 'sim' }, a.token)).status, 400);
      assert.equal((await api(S.url, 'DELETE', '/save', { confirm: 'APAGAR' }, a.token)).status, 200);
      assert.equal((await api(S.url, 'PUT', '/save', { rev: 0, data: baseSave({ lvl: 1 }) }, a.token)).status, 200);
    });

    test('save: o servidor recusa saves adulterados e registra auditoria', async () => {
      const a = await register(S.url);
      await api(S.url, 'PUT', '/save', { rev: 0, data: baseSave() }, a.token);
      const r1 = await api(S.url, 'PUT', '/save', { rev: 1, data: baseSave({ gold: 99_000_000 }) }, a.token);
      assert.equal(r1.status, 422); assert.ok(r1.body.erros.some((e: string) => /Centelhas/.test(e)));
      const r2 = await api(S.url, 'PUT', '/save', { rev: 1, data: baseSave({ inv: [item('hack', { st: { crit: 5000 } })] }) }, a.token);
      assert.equal(r2.status, 422);
      const r3 = await api(S.url, 'PUT', '/save', { rev: 1, data: baseSave({ lvl: 1 }) }, a.token);
      assert.equal(r3.status, 422);
      assert.equal((await api(S.url, 'GET', '/save', undefined, a.token)).body.rev, 1);
    });

    test('correio: envia, resgata, e o item enviado não volta por save antigo', async () => {
      const a = await register(S.url), b = await register(S.url);
      await api(S.url, 'PUT', '/save', { rev: 0, data: baseSave({ inv: [item('gift01'), item('keep01')] }) }, a.token);
      await api(S.url, 'PUT', '/save', { rev: 0, data: baseSave() }, b.token);
      const s = await api(S.url, 'POST', '/mail/send', { to: b.account.name, itemId: 'gift01', note: 'pra você, porra' }, a.token);
      assert.equal(s.status, 200); assert.equal(s.body.rev, 2);
      const sa = await api(S.url, 'GET', '/save', undefined, a.token);
      assert.deepEqual(sa.body.data.inv.map((i: any) => i.id), ['keep01']);
      // tentativa de duplicar: regravar o save antigo, com o item, na revisão atual
      const dup = await api(S.url, 'PUT', '/save', { rev: 2, data: baseSave({ inv: [item('gift01'), item('keep01')] }) }, a.token);
      assert.equal(dup.status, 422); assert.ok(dup.body.erros[0].includes('correio'));
      const box = await api(S.url, 'GET', '/mail', undefined, b.token);
      assert.equal(box.body.mail.length, 1); assert.equal(box.body.mail[0].note, 'pra você, *****');
      const c = await api(S.url, 'POST', `/mail/${box.body.mail[0].id}/claim`, {}, b.token);
      assert.equal(c.status, 200); assert.equal(c.body.item.id, 'gift01');
      assert.equal((await api(S.url, 'POST', `/mail/${box.body.mail[0].id}/claim`, {}, b.token)).status, 404);
      assert.deepEqual((await api(S.url, 'GET', '/save', undefined, b.token)).body.data.inv.map((i: any) => i.id), ['gift01']);
      // devolver ao remetente: a lápide dele some quando ele resgata
      await api(S.url, 'POST', '/mail/send', { to: a.account.name, itemId: 'gift01' }, b.token);
      const back = (await api(S.url, 'GET', '/mail', undefined, a.token)).body.mail[0];
      assert.equal((await api(S.url, 'POST', `/mail/${back.id}/claim`, {}, a.token)).status, 200);
      const cur = await api(S.url, 'GET', '/save', undefined, a.token);
      assert.equal((await api(S.url, 'PUT', '/save', { rev: cur.body.rev, data: cur.body.data }, a.token)).status, 200);
    });

    test('correio: 10 envios simultâneos do mesmo item, só 1 passa', async () => {
      const a = await register(S.url), b = await register(S.url);
      await api(S.url, 'PUT', '/save', { rev: 0, data: baseSave({ inv: [item('unico1')] }) }, a.token);
      await api(S.url, 'PUT', '/save', { rev: 0, data: baseSave() }, b.token);
      const rs = await Promise.all(Array.from({ length: 10 }, () => api(S.url, 'POST', '/mail/send', { to: b.account.name, itemId: 'unico1' }, a.token)));
      assert.equal(rs.filter(r => r.status === 200).length, 1);
      assert.equal((await api(S.url, 'GET', '/mail', undefined, b.token)).body.mail.length, 1);
    });

    test('correio: regras de envio', async () => {
      const a = await register(S.url), b = await register(S.url);
      await api(S.url, 'PUT', '/save', { rev: 0, data: baseSave({ inv: [item('m1')] }) }, a.token);
      assert.equal((await api(S.url, 'POST', '/mail/send', { to: 'NinguemAqui', itemId: 'm1' }, a.token)).status, 404);
      assert.equal((await api(S.url, 'POST', '/mail/send', { to: a.account.name, itemId: 'm1' }, a.token)).status, 422);
      assert.equal((await api(S.url, 'POST', '/mail/send', { to: b.account.name, itemId: 'w0000001' }, a.token)).status, 409);
      const full = await register(S.url);
      await api(S.url, 'PUT', '/save', { rev: 0, data: baseSave({ inv: Array.from({ length: 20 }, (_, i) => item('f' + i)) }) }, full.token);
      await api(S.url, 'POST', '/mail/send', { to: full.account.name, itemId: 'm1' }, a.token);
      const box = (await api(S.url, 'GET', '/mail', undefined, full.token)).body.mail;
      assert.equal((await api(S.url, 'POST', `/mail/${box[0].id}/claim`, {}, full.token)).status, 409);
    });

    test('telemetria de erros e métricas protegidas', async () => {
      assert.equal((await api(S.url, 'POST', '/telemetry/error', { version: '0.10.0', message: 'TypeError: x', stack: 'at y' })).status, 204);
      assert.equal((await api(S.url, 'GET', '/metrics')).status, 401);
      assert.equal((await fetch(S.url + '/metrics', { headers: { authorization: 'Bearer errado' } })).status, 401);
      const m = await fetch(S.url + '/metrics', { headers: { authorization: 'Bearer segredo-metricas' } });
      const txt = await m.text();
      assert.match(txt, /tessaria_client_errors \d+/); assert.match(txt, /tessaria_accounts_total \d+/);
    });

    test('rotas protegidas exigem sessão', async () => {
      for (const [m, p] of [['GET', '/me'], ['GET', '/save'], ['PUT', '/save'], ['GET', '/mail']] as const) assert.equal((await api(S.url, m, p, m === 'PUT' ? { rev: 0, data: {} } : undefined, 'token-falso')).status, 401);
    });
  });
}
