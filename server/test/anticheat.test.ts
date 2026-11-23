import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { STORES, startServer, api, register, baseSave, WsClient, sleep, type TestServer } from './helpers';
import { pvpHitCap } from '../../shared/protocol';

const ADMIN = 'token-de-teste-da-moderacao';

for (const kind of STORES) {
  describe(`proteção contra trapaça e moderação (${kind})`, () => {
    let S: TestServer;
    before(async () => { S = await startServer(kind, { adminToken: ADMIN }); });
    after(async () => { await S.close(); });

    async function account(save = baseSave()) {
      const a = await register(S.url);
      assert.equal((await api(S.url, 'PUT', '/save', { rev: 0, data: save }, a.token)).status, 200);
      return a;
    }
    async function connect(a: { token: string }, where = 'hub') {
      const c = new WsClient(`${S.ws}?token=${a.token}&r=${where}`); await c.open();
      const w = await c.waitFor(m => m.t === 'welcome');
      return { c, w };
    }

    test('teto de dano PvP cresce com nível e equipamento', () => {
      const lo = pvpHitCap(baseSave({ lvl: 1 })), hi = pvpHitCap(baseSave({ lvl: 40, eq: { weapon: { st: { dmg: 120 } } } }));
      assert.ok(lo > 200 && lo < 2000, `nível 1: ${lo}`);
      assert.ok(hi > lo * 5, `nível 40: ${hi}`);
      assert.ok(pvpHitCap(null) > 0);
    });

    test('PvP: acerto acima do teto do atacante não chega; repetido, vira suspeita', async () => {
      const A = await account(baseSave({ lvl: 30 })), C = await account(baseSave({ lvl: 30 }));
      const a = await connect(A, 'wilds'), c = await connect(C, 'wilds');
      a.c.send({ t: 'pos', x: 80, z: 350, yaw: 0, m: 0, a: '' }); c.c.send({ t: 'pos', x: 84, z: 350, yaw: 0, m: 0, a: '' });
      await a.c.waitFor(m => m.t === 'snap' && m.ps.some((q: any) => q[0] === c.w.id && q[1] === 84));
      a.c.send({ t: 'pvp', to: c.w.id, dmg: 120 });
      await c.c.waitFor(m => m.t === 'pvp' && m.dmg === 120);
      for (let i = 0; i < 7; i++) { a.c.send({ t: 'pvp', to: c.w.id, dmg: 5_000_000 }); await sleep(140); }
      await sleep(200);
      assert.equal(c.c.msgs.filter(m => m.t === 'pvp').length, 1, 'dano impossível não chega');
      const sus = (await api(S.url, 'GET', '/admin/suspects', undefined, ADMIN)).body.contas;
      assert.ok(sus.some((x: any) => x.name === A.account.name && x.kinds.includes('suspeita_dano')));
      a.c.close(); c.c.close();
    });

    test('velocidade impossível repetida: registra e derruba a conexão', async () => {
      const A = await account(), B = await account();
      const a = await connect(A), b = await connect(B);
      a.c.send({ t: 'pos', x: 44, z: 42, yaw: 0, m: 0, a: '' }); await sleep(100);
      for (let i = 0; i < 90 && !a.c.msgs.some(m => m.t === 'kick'); i++) { a.c.send({ t: 'pos', x: i % 2 ? 20 : 90, z: 42, yaw: 0, m: 1, a: '' }); await sleep(8); }
      const k = await a.c.waitFor(m => m.t === 'kick');
      assert.match(k.reason, /fora do normal/);
      const sus = (await api(S.url, 'GET', '/admin/suspects', undefined, ADMIN)).body.contas;
      assert.ok(sus.some((x: any) => x.name === A.account.name && x.kinds.includes('suspeita_velocidade')));
      assert.ok(!sus.some((x: any) => x.name === B.account.name));
      b.c.close();
    });

    test('save: pesca rápida demais é recusada', async () => {
      const a = await register(S.url);
      assert.equal((await api(S.url, 'PUT', '/save', { rev: 0, data: baseSave({ st: { fish: 3 } }) }, a.token)).status, 200);
      const r = await api(S.url, 'PUT', '/save', { rev: 1, data: baseSave({ st: { fish: 400 } }) }, a.token);
      assert.equal(r.status, 422); assert.ok(r.body.erros.some((e: string) => /peixes/.test(e)));
      const f = await api(S.url, 'PUT', '/save', { rev: 1, data: baseSave({ fios: 9_000 }) }, a.token);
      assert.equal(f.status, 422); assert.ok(f.body.erros.some((e: string) => /Fios do Tear/.test(e)));
    });

    test('moderação: precisa do token; lista e marca reportes; suspende e reativa', async () => {
      const A = await account();
      assert.equal((await api(S.url, 'GET', '/admin/reports')).status, 401);
      assert.equal((await api(S.url, 'GET', '/admin/reports', undefined, 'errado')).status, 401);
      assert.equal((await api(S.url, 'GET', '/admin/reports', undefined, A.token)).status, 401);
      assert.equal((await api(S.url, 'POST', '/report', { kind: 'jogador', text: 'xingou no chat', target: A.account.name })).status, 200);
      const L = (await api(S.url, 'GET', '/admin/reports?status=novo', undefined, ADMIN)).body.reports;
      const mine = L.find((r: any) => r.target === A.account.name); assert.ok(mine);
      assert.equal((await api(S.url, 'POST', `/admin/reports/${mine.id}`, { status: 'resolvido' }, ADMIN)).status, 200);
      assert.ok(!(await api(S.url, 'GET', '/admin/reports?status=novo', undefined, ADMIN)).body.reports.some((r: any) => r.id === mine.id));
      const c = await connect(A);
      assert.equal((await api(S.url, 'POST', `/admin/accounts/${A.account.name}/ban`, { banned: true, motivo: 'teste' }, ADMIN)).status, 200);
      await c.c.waitFor(m => m.t === 'kick' && /suspensa/.test(m.reason));
      assert.equal((await api(S.url, 'GET', '/me', undefined, A.token)).status, 401);
      assert.equal((await api(S.url, 'POST', `/admin/accounts/${A.account.name}/ban`, { banned: false }, ADMIN)).status, 200);
      assert.equal((await api(S.url, 'GET', '/me', undefined, A.token)).status, 200);
    });
  });
}

describe('moderação desligada', () => {
  let S: TestServer;
  before(async () => { S = await startServer('memoria'); });
  after(async () => { await S.close(); });
  test('sem ADMIN_TOKEN as rotas não existem', async () => {
    assert.equal((await api(S.url, 'GET', '/admin/reports', undefined, 'qualquer')).status, 404);
  });
});
