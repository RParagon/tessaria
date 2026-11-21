import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { STORES, startServer, api, register, baseSave, type TestServer } from './helpers';
import { cosById, PASS_FREE, PASS_PREM } from '../../shared/season';

for (const kind of STORES) {
  describe(`temporada (${kind})`, () => {
    let S: TestServer;
    before(async () => { S = await startServer(kind, { devPayments: true }); });
    after(async () => { await S.close(); });

    test('missões dão XP do passe uma vez; níveis liberam recompensas da trilha grátis; premium pede Fios Dourados', async () => {
      const a = await register(S.url);
      assert.equal((await api(S.url, 'PUT', '/save', { rev: 0, data: baseSave({ gold: 100 }) }, a.token)).status, 200);
      const v0 = (await api(S.url, 'GET', '/season', undefined, a.token)).body;
      assert.equal(v0.me.level, 0); assert.equal(v0.daily.length, 3); assert.equal(v0.weekly.length, 3); assert.equal(v0.shop.length, 4);
      for (const m of [...v0.daily, ...v0.weekly]) assert.equal((await api(S.url, 'POST', '/season/mission', { id: m.id }, a.token)).status, 200);
      assert.equal((await api(S.url, 'POST', '/season/mission', { id: v0.daily[0].id }, a.token)).status, 409);
      assert.equal((await api(S.url, 'POST', '/season/mission', { id: 'd1:kill' }, a.token)).status, 404);   // missão de outro dia
      const v1 = (await api(S.url, 'GET', '/season', undefined, a.token)).body;
      assert.ok(v1.me.level >= 4, `nível ${v1.me.level}`);
      // trilha grátis, nível 2: Centelhas no save da nuvem
      const c2 = await api(S.url, 'POST', '/season/claim', { level: 2, track: 'free' }, a.token);
      assert.equal(c2.status, 200); assert.deepEqual(c2.body.reward, PASS_FREE[2]);
      const s = (await api(S.url, 'GET', '/save', undefined, a.token)).body; assert.equal(s.data.gold, 100 + (PASS_FREE[2] as any).centelhas); assert.equal(s.rev, c2.body.rev);
      assert.equal((await api(S.url, 'POST', '/season/claim', { level: 2, track: 'free' }, a.token)).status, 409);
      assert.equal((await api(S.url, 'POST', '/season/claim', { level: 40, track: 'free' }, a.token)).status, 403);   // nível ainda não alcançado
      assert.equal((await api(S.url, 'POST', '/season/claim', { level: 1, track: 'prem' }, a.token)).status, 403);   // sem premium
      assert.equal((await api(S.url, 'POST', '/season/premium', {}, a.token)).status, 402);
      // compra de Fios Dourados (modo de desenvolvimento) e o premium
      assert.equal((await api(S.url, 'POST', '/shop/dourados', { pack: 'p1100' }, a.token)).status, 200);
      const p = await api(S.url, 'POST', '/season/premium', {}, a.token);
      assert.equal(p.status, 200); assert.equal(p.body.view.me.premium, true); assert.equal(p.body.view.me.dourados, 150);
      const c3 = await api(S.url, 'POST', '/season/claim', { level: 3, track: 'prem' }, a.token);
      assert.deepEqual(c3.body.reward, PASS_PREM[3]); assert.equal(c3.body.view.me.dourados, 150 + (PASS_PREM[3] as any).dourados);
    });

    test('loja: só a vitrine da semana, com Fios Dourados; equipar exige ter o cosmético; entrada diária uma vez por dia', async () => {
      const a = await register(S.url);
      assert.equal((await api(S.url, 'PUT', '/save', { rev: 0, data: baseSave({ gold: 50 }) }, a.token)).status, 200);
      const v = (await api(S.url, 'GET', '/season', undefined, a.token)).body, item = v.shop[0];
      assert.equal((await api(S.url, 'POST', '/shop/buy', { id: item }, a.token)).status, 402);
      assert.equal((await api(S.url, 'POST', '/shop/buy', { id: 'tit_campeao' }, a.token)).status, 404);   // de conquista: nunca vendido
      await api(S.url, 'POST', '/shop/dourados', { pack: 'p500' }, a.token);
      const b = await api(S.url, 'POST', '/shop/buy', { id: item }, a.token);
      assert.equal(b.status, 200); assert.ok(b.body.view.me.owned.includes(item)); assert.equal(b.body.view.me.dourados, 500 - cosById(item)!.price!);
      assert.equal((await api(S.url, 'POST', '/shop/buy', { id: item }, a.token)).status, 409);
      const slot = cosById(item)!.slot, field = slot === 'trail' ? 'trail' : slot === 'namecolor' ? 'namecolor' : 'ctitle';
      const s0 = (await api(S.url, 'GET', '/save', undefined, a.token)).body;
      const other = v.shop.find((x: string) => x !== item);
      assert.equal((await api(S.url, 'PUT', '/save', { rev: s0.rev, data: { ...s0.data, char: { ...s0.data.char, [cosById(other)!.slot === 'trail' ? 'trail' : cosById(other)!.slot === 'namecolor' ? 'namecolor' : 'ctitle']: other } } }, a.token)).status, 422);
      assert.equal((await api(S.url, 'PUT', '/save', { rev: s0.rev, data: { ...s0.data, char: { ...s0.data.char, [field]: item } } }, a.token)).status, 200);
      const l = await api(S.url, 'POST', '/login/claim', {}, a.token);
      assert.equal(l.status, 200); assert.equal(l.body.streak, 1); assert.deepEqual(l.body.reward, { centelhas: 300 });
      assert.equal((await api(S.url, 'GET', '/save', undefined, a.token)).body.data.gold, 350);
      assert.equal((await api(S.url, 'POST', '/login/claim', {}, a.token)).status, 409);
    });
  });
}
