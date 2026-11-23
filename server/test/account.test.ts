import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { STORES, startServer, api, register, baseSave, type TestServer } from './helpers';

for (const kind of STORES) {
  describe(`conta: LGPD e reportes (${kind})`, () => {
    let S: TestServer;
    before(async () => { S = await startServer(kind, { devPayments: true }); });
    after(async () => { await S.close(); });

    test('baixar os dados traz conta, save e Fios Dourados, sem senha nem hash', async () => {
      const a = { ...(await register(S.url)), name: '' }; a.name = a.account.name;
      assert.equal((await api(S.url, 'PUT', '/save', { rev: 0, data: baseSave({ gold: 321 }) }, a.token)).status, 200);
      assert.equal((await api(S.url, 'POST', '/shop/dourados', { pack: 'p500' }, a.token)).status, 200);
      const r = await api(S.url, 'GET', '/account/export', undefined, a.token);
      assert.equal(r.status, 200);
      assert.equal(r.body.conta.nome, a.name); assert.equal(r.body.save.gold, 321); assert.equal(r.body.fiosDourados, 500);
      assert.ok(!JSON.stringify(r.body).includes('pass'), 'nada de senha/hash no arquivo');
      assert.equal((await api(S.url, 'GET', '/account/export')).status, 401);
    });

    test('excluir pede o nome e a senha; depois a sessão e o login deixam de existir', async () => {
      const id = Math.floor(Math.random() * 1e6), reg = await api(S.url, 'POST', '/auth/register', { name: 'Apagar' + id, email: `apagar${id}@exemplo.com`, password: 'senha1234' });
      assert.equal(reg.status, 201);
      const a = { token: reg.body.token, name: reg.body.account.name as string, email: `apagar${id}@exemplo.com`, password: 'senha1234' };
      assert.equal((await api(S.url, 'PUT', '/save', { rev: 0, data: baseSave() }, a.token)).status, 200);
      assert.equal((await api(S.url, 'POST', '/account/delete', { confirm: 'outro nome', password: a.password }, a.token)).status, 400);
      assert.equal((await api(S.url, 'POST', '/account/delete', { confirm: a.name, password: 'errada123' }, a.token)).status, 403);
      assert.equal((await api(S.url, 'POST', '/account/delete', { confirm: a.name }, a.token)).status, 403);
      assert.equal((await api(S.url, 'POST', '/account/delete', { confirm: a.name.toUpperCase(), password: a.password }, a.token)).status, 200);
      assert.equal((await api(S.url, 'GET', '/me', undefined, a.token)).status, 401);
      assert.equal((await api(S.url, 'POST', '/auth/login', { login: a.email, password: a.password })).status, 401);
      // o nome fica livre de novo
      const again = await api(S.url, 'POST', '/auth/register', { name: a.name, email: 'novo.' + a.email, password: a.password });
      assert.equal(again.status, 201);
    });

    test('convidado exclui só com o nome', async () => {
      const g = await api(S.url, 'POST', '/auth/guest', {});
      assert.equal(g.status, 201);
      assert.equal((await api(S.url, 'POST', '/account/delete', { confirm: g.body.account.name }, g.body.token)).status, 200);
      assert.equal((await api(S.url, 'GET', '/me', undefined, g.body.token)).status, 401);
    });

    test('reportar funciona com e sem conta e valida o texto', async () => {
      const a = await register(S.url);
      assert.equal((await api(S.url, 'POST', '/report', { kind: 'bug', text: 'O peixe sumiu da cesta', ctx: { versao: '0.48.0', nivel: 7 } }, a.token)).status, 200);
      assert.equal((await api(S.url, 'POST', '/report', { kind: 'jogador', text: 'Xingando no chat', target: 'Fulano' })).status, 200);
      assert.equal((await api(S.url, 'POST', '/report', { kind: 'bug', text: 'oi' })).status, 400);
      assert.equal((await api(S.url, 'POST', '/report', { kind: 'spam', text: 'qualquer coisa' })).status, 400);
    });
  });
}
