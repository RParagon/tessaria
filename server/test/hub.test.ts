import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { STORES, startServer, api, register, baseSave, WsClient, sleep, type TestServer } from './helpers';

for (const kind of STORES) {
  describe(`vila online (${kind})`, () => {
    let S: TestServer;
    before(async () => { S = await startServer(kind); });
    after(async () => { await S.close(); });

    async function join(name?: string, save = baseSave()) {
      const a = await register(S.url, name);
      await api(S.url, 'PUT', '/save', { rev: 0, data: save }, a.token);
      const c = new WsClient(`${S.ws}?token=${a.token}`); await c.open();
      const w = await c.waitFor(m => m.t === 'welcome');
      return { a, c, w };
    }

    test('sem sessão válida a conexão é recusada', async () => {
      const c = new WsClient(`${S.ws}?token=falso`);
      await assert.rejects(c.open(), /401/);
    });

    test('jogadores se veem, se movem e saem', async () => {
      const A = await join(), B = await join(undefined, baseSave({ lvl: 9, char: { ...baseSave().char, cls: 'arco', outfit: 4 } }));
      assert.ok(B.w.players.some((p: any) => p.name === A.a.account.name));
      const j = await A.c.waitFor(m => m.t === 'join' && m.p.name === B.a.account.name);
      assert.equal(j.p.look.cls, 'arco'); assert.equal(j.p.look.outfit, 4); assert.equal(j.p.title, 'Nv 9 · Arco');
      B.c.send({ t: 'pos', x: 46, z: 43, yaw: 1, m: 1, a: '' });
      const snap = await A.c.waitFor(m => m.t === 'snap' && m.ps.some((p: any) => p[0] === B.w.id && p[1] === 46));
      assert.ok(snap);
      B.c.close();
      await A.c.waitFor(m => m.t === 'leave' && m.id === B.w.id);
      A.c.close();
    });

    test('ações (ataque, esquiva) chegam na hora para os outros, com limite', async () => {
      const A = await join(), B = await join();
      B.c.send({ t: 'act', a: 'swing', c: 2, yaw: 1.5 });
      const m = await A.c.waitFor(x => x.t === 'act' && x.id === B.w.id);
      assert.deepEqual([m.a, m.c, m.yaw], ['swing', 2, 1.5]);
      B.c.send({ t: 'act', a: 'dash', c: 7, yaw: 0 });
      const d = await A.c.waitFor(x => x.t === 'act' && x.a === 'dash');
      assert.equal(d.c, 0);
      // inválidas são ignoradas; quem manda não recebe de volta
      B.c.send({ t: 'act', a: 'voar', c: 0, yaw: 0 }); B.c.send({ t: 'act', a: 'swing', c: 0, yaw: 'x' });
      for (let i = 0; i < 20; i++) B.c.send({ t: 'act', a: 'cast', c: 0, yaw: 0 });
      await sleep(300);
      const got = A.c.msgs.filter(x => x.t === 'act' && x.id === B.w.id);
      assert.ok(got.every(x => ['swing', 'dash', 'cast'].includes(x.a)));
      const casts = got.filter(x => x.a === 'cast').length;
      assert.ok(casts >= 3 && casts <= 7, `repassou ${casts} de 20`);
      assert.equal(B.c.msgs.filter(x => x.t === 'act').length, 0);
      A.c.close(); B.c.close();
    });

    test('relógio: welcome traz a hora do servidor e o pedido de hora é respondido', async () => {
      const A = await join();
      assert.ok(Math.abs(A.w.now - Date.now()) < 2000);
      const c = Date.now(); A.c.send({ t: 'time', c });
      const r = await A.c.waitFor(m => m.t === 'time' && m.c === c);
      assert.ok(r.s >= c - 5 && r.s <= Date.now() + 5);
      A.c.close();
    });

    test('o título muda para todos quando o save sobe de nível', async () => {
      const A = await join(), B = await join();
      await api(S.url, 'PUT', '/save', { rev: 1, data: baseSave({ lvl: 5 }) }, B.a.token);
      const m = await A.c.waitFor(x => x.t === 'title' && x.id === B.w.id);
      assert.equal(m.title, 'Nv 5 · Lâmina');
      A.c.close(); B.c.close();
    });

    test('teleporte é limitado pela velocidade máxima', async () => {
      const A = await join(), B = await join();
      B.c.send({ t: 'pos', x: 44, z: 42, yaw: 0, m: 0, a: '' });
      await sleep(200);
      B.c.send({ t: 'pos', x: 80, z: 58, yaw: 0, m: 1, a: '' });
      const s = await A.c.waitFor(m => m.t === 'snap' && m.ps.some((p: any) => p[0] === B.w.id && p[3] === 0 && p[4] === 1));
      const p = s.ps.find((q: any) => q[0] === B.w.id);
      assert.ok(Math.hypot(p[1] - 44, p[2] - 42) < 10, `andou ${Math.hypot(p[1] - 44, p[2] - 42)}`);
      A.c.close(); B.c.close();
    });

    test('chat: chega para todos, filtra palavrões e segura spam', async () => {
      const A = await join(), B = await join();
      A.c.send({ t: 'chat', text: '  oi gente, que porra  ' });
      const m = await B.c.waitFor(x => x.t === 'chat' && x.name === A.a.account.name);
      assert.equal(m.text, 'oi gente, que *****');
      for (let i = 0; i < 6; i++) A.c.send({ t: 'chat', text: 'flood ' + i });
      await A.c.waitFor(x => x.t === 'sys' && /Calma/.test(x.text));
      A.c.send({ t: 'chat', text: '/quem' });
      const who = await A.c.waitFor(x => x.t === 'sys' && x.text.includes(B.a.account.name));
      assert.ok(who);
      A.c.close(); B.c.close();
    });

    test('chat: ofensas repetidas silenciam por 5 minutos', async () => {
      const A = await join(), B = await join();
      for (const t of ['caralho', 'merda']) { A.c.send({ t: 'chat', text: t }); await sleep(2100); }
      A.c.send({ t: 'chat', text: 'porra' });
      await A.c.waitFor(x => x.t === 'sys' && /silenciado por 5 minutos/.test(x.text), 6000);
      await sleep(2100);
      A.c.send({ t: 'chat', text: 'oi' });
      await A.c.waitFor(x => x.t === 'sys' && /silenciado por mais/.test(x.text));
      A.c.close(); B.c.close();
    });

    test('emotes chegam e têm intervalo mínimo', async () => {
      const A = await join(), B = await join();
      A.c.send({ t: 'emote', e: 'dancar' }); A.c.send({ t: 'emote', e: 'acenar' }); A.c.send({ t: 'emote', e: 'voar' });
      await B.c.waitFor(x => x.t === 'emote' && x.e === 'dancar');
      await sleep(300);
      assert.equal(B.c.msgs.filter(x => x.t === 'emote').length, 1);
      A.c.close(); B.c.close();
    });

    test('a mesma conta em dois lugares derruba a conexão antiga', async () => {
      const A = await join();
      const again = new WsClient(`${S.ws}?token=${A.a.token}`); await again.open();
      await A.c.waitFor(x => x.t === 'kick');
      await sleep(100); assert.equal(A.c.closed, true);
      again.close();
    });

    test('mensagens malformadas não derrubam o servidor', async () => {
      const A = await join();
      A.c.ws.send('isso não é json'); A.c.send({ t: 'pos', x: 'a' }); A.c.send({ t: 'chat', text: { a: 1 } }); A.c.send(null); A.c.send({ t: 'look', look: { cls: 'hacker', body: 99 } });
      await sleep(200);
      assert.equal((await api(S.url, 'GET', '/health')).body.ok, true);
      A.c.close();
    });

    test('chat local: na vila só quem está perto ouve; na taverna e em cada casa, quem está lá dentro', async () => {
      const A = await join(), B = await join(), C = await join();
      for (const [x, P] of [[44, A], [50, B], [150, C]] as const) P.c.send({ t: 'pos', x, z: 42, yaw: 0, m: 0, a: '' });
      await sleep(250);
      // C anda até longe (passos curtos, sem teleporte)
      for (let x = 44; x <= 150; x += 2) { C.c.send({ t: 'pos', x, z: 42, yaw: 0, m: 1, a: '' }); await sleep(170); }
      A.c.send({ t: 'chat', text: 'oi de perto' });
      const m = await B.c.waitFor(x => x.t === 'chat' && x.text === 'oi de perto');
      assert.equal(m.ch, 'Vila');
      await sleep(200); assert.ok(!C.c.msgs.some(x => x.t === 'chat' && x.text === 'oi de perto'), 'longe não ouve');
      // taverna: A e B entram; C fica na vila
      A.c.send({ t: 'where', r: 'taverna' }); B.c.send({ t: 'where', r: 'taverna' }); await sleep(200);
      A.c.send({ t: 'chat', text: 'na taverna' });
      const t = await B.c.waitFor(x => x.t === 'chat' && x.text === 'na taverna');
      assert.equal(t.ch, 'Taverna da Mel');
      // casas diferentes não se ouvem
      A.c.send({ t: 'where', r: 'casa', n: 2 }); B.c.send({ t: 'where', r: 'casa', n: 3 }); await sleep(200);
      A.c.send({ t: 'chat', text: 'na casa 2' });
      await A.c.waitFor(x => x.t === 'sys' && /Ninguém por perto ouviu/.test(x.text));
      await sleep(150); assert.ok(!B.c.msgs.some(x => x.t === 'chat' && x.text === 'na casa 2'));
      assert.ok(!C.c.msgs.some(x => x.t === 'chat' && (x.text === 'na taverna' || x.text === 'na casa 2')));
      A.c.close(); B.c.close(); C.c.close();
    });
  });
}
