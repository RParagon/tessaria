import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { STORES, startServer, api, register, baseSave, WsClient, sleep, type TestServer } from './helpers';
import { GUILD_FOUND_COST, GUILD_FIOS, emblemSvg, guildLevel, guildNameProblem, guildTagProblem } from '../../shared/guild';

const EMB = { shape: 2, color: 4, symbol: 7 };

describe('guilda: regras comuns', () => {
  test('nome, sigla, emblema e nível', () => {
    assert.equal(guildNameProblem('Os Tecelões'), null);
    assert.ok(guildNameProblem('ab')); assert.ok(guildNameProblem('Guilda dos Admins')); assert.ok(guildNameProblem('Porra Total'));
    assert.equal(guildTagProblem('tec'), null); assert.ok(guildTagProblem('TECEL')); assert.ok(guildTagProblem('12')); assert.ok(guildTagProblem('ADM'));
    assert.match(emblemSvg(EMB), /^<svg/); assert.equal(guildLevel(0), 1); assert.ok(guildLevel(100_000) > 5);
  });
});

for (const kind of STORES) {
  describe(`guilda (${kind})`, () => {
    let S: TestServer;
    before(async () => { S = await startServer(kind); });
    after(async () => { await S.close(); });

    async function account(save = baseSave({ lvl: 20, gold: 40_000 })) {
      const a = await register(S.url);
      assert.equal((await api(S.url, 'PUT', '/save', { rev: 0, data: save }, a.token)).status, 200);
      return a;
    }
    async function connect(a: { token: string }) {
      const c = new WsClient(`${S.ws}?token=${a.token}&r=hub`); await c.open();
      const w = await c.waitFor(m => m.t === 'welcome');
      return { c, w };
    }
    const tag = () => 'G' + Math.random().toString(36).slice(2, 5).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
    const gname = () => 'Guilda ' + Math.random().toString(36).slice(2, 8).replace(/[0-9]/g, 'a');

    test('fundar: nível 15, Centelhas do save da nuvem, nome e sigla únicos', async () => {
      const low = await account(baseSave({ lvl: 10, gold: 40_000 }));
      assert.equal((await api(S.url, 'POST', '/guild', { name: gname(), tag: tag(), emblem: EMB }, low.token)).status, 403);
      const poor = await account(baseSave({ lvl: 20, gold: 100 }));
      assert.equal((await api(S.url, 'POST', '/guild', { name: gname(), tag: tag(), emblem: EMB }, poor.token)).status, 402);
      const A = await account(), n = gname(), t = tag();
      assert.equal((await api(S.url, 'POST', '/guild', { name: n, tag: t, emblem: { shape: 99, color: 0, symbol: 0 } }, A.token)).status, 400);
      const r = await api(S.url, 'POST', '/guild', { name: n, tag: t.toLowerCase(), emblem: EMB }, A.token);
      assert.equal(r.status, 200); assert.equal(r.body.gold, GUILD_FOUND_COST);
      assert.equal(r.body.view.guild.tag, t); assert.equal(r.body.view.me.role, 'lider');
      const s = (await api(S.url, 'GET', '/save', undefined, A.token)).body; assert.equal(s.data.gold, 40_000 - GUILD_FOUND_COST); assert.equal(s.rev, r.body.rev);
      assert.equal((await api(S.url, 'POST', '/guild', { name: gname(), tag: tag(), emblem: EMB }, A.token)).status, 409);   // já está numa
      const B = await account();
      assert.equal((await api(S.url, 'POST', '/guild', { name: n.toUpperCase(), tag: tag(), emblem: EMB }, B.token)).status, 409);
      assert.equal((await api(S.url, 'POST', '/guild', { name: gname(), tag: t, emblem: EMB }, B.token)).status, 409);
    });

    test('convite, aceitar, sigla no título, chat /gu, cargos e expulsão', async () => {
      const A = await account(), B = await account(), C = await account(), D = await account();
      const t = tag(); assert.equal((await api(S.url, 'POST', '/guild', { name: gname(), tag: t, emblem: EMB }, A.token)).status, 200);
      const a = await connect(A), b = await connect(B), d = await connect(D);
      assert.equal((await api(S.url, 'POST', '/guild/invite', { name: B.account.name }, B.token)).status, 404);   // B não tem guilda
      assert.equal((await api(S.url, 'POST', '/guild/invite', { name: B.account.name }, A.token)).status, 200);
      await b.c.waitFor(m => m.t === 'sys' && /convidou você para a guilda/.test(m.text));
      const inv = (await api(S.url, 'GET', '/guild', undefined, B.token)).body.invites;
      assert.equal(inv.length, 1); assert.equal(inv[0].tag, t);
      const acc = await api(S.url, 'POST', '/guild/accept', { id: inv[0].guildId }, B.token);
      assert.equal(acc.status, 200); assert.equal(acc.body.view.guild.members.length, 2);
      const tt = await d.c.waitFor(m => m.t === 'title' && m.id === b.w.id);
      assert.ok(tt.title.startsWith(`[${t}] `), tt.title);
      // chat da guilda: só membros
      b.c.send({ t: 'chat', text: '/gu bora pro torneio' });
      const gc = await a.c.waitFor(m => m.t === 'gchat');
      assert.deepEqual([gc.name, gc.tag, gc.text], [B.account.name, t, 'bora pro torneio']);
      await sleep(150); assert.ok(!d.c.msgs.some(m => m.t === 'gchat'));
      // membro não convida; o líder promove a Oficial e aí convida
      assert.equal((await api(S.url, 'POST', '/guild/invite', { name: C.account.name }, B.token)).status, 403);
      assert.equal((await api(S.url, 'POST', '/guild/role', { name: B.account.name, role: 'oficial' }, A.token)).status, 200);
      assert.equal((await api(S.url, 'POST', '/guild/invite', { name: C.account.name }, B.token)).status, 200);
      const cg = (await api(S.url, 'GET', '/guild', undefined, C.token)).body.invites[0];
      assert.equal((await api(S.url, 'POST', '/guild/accept', { id: cg.guildId }, C.token)).status, 200);
      // Oficial expulsa membro, mas não outro Oficial nem o Líder
      assert.equal((await api(S.url, 'POST', '/guild/kick', { name: A.account.name }, B.token)).status, 403);
      assert.equal((await api(S.url, 'POST', '/guild/kick', { name: C.account.name }, B.token)).status, 200);
      // expulso espera 24 h para entrar em outra (ou voltar)
      assert.equal((await api(S.url, 'POST', '/guild/invite', { name: C.account.name }, A.token)).status, 200);
      assert.equal((await api(S.url, 'POST', '/guild/accept', { id: cg.guildId }, C.token)).status, 409);
      // passar a liderança: A vira Oficial
      const lead = await api(S.url, 'POST', '/guild/role', { name: B.account.name, role: 'lider' }, A.token);
      assert.equal(lead.status, 200);
      const roles = Object.fromEntries(lead.body.view.guild.members.map((m: any) => [m.name, m.role]));
      assert.equal(roles[B.account.name], 'lider'); assert.equal(roles[A.account.name], 'oficial');
      // recado do dia com filtro
      const motd = await api(S.url, 'POST', '/guild/motd', { text: 'Guerra no sábado, porra!' }, B.token);
      assert.equal(motd.body.view.guild.motd, 'Guerra no sábado, *****!');
      a.c.close(); b.c.close(); d.c.close();
    });

    test('Fios da Guilda: doação (com teto diário) e missões do Passe', async () => {
      const A = await account(baseSave({ lvl: 20, gold: 80_000 }));
      assert.equal((await api(S.url, 'POST', '/guild', { name: gname(), tag: tag(), emblem: EMB }, A.token)).status, 200);
      const d1 = await api(S.url, 'POST', '/guild/donate', { gold: 1_050 }, A.token);
      assert.equal(d1.status, 200); assert.equal(d1.body.fios, 10); assert.equal(d1.body.gold, 1_000);   // 1 Fio a cada 100 (o resto fica)
      const big = await api(S.url, 'POST', '/guild/donate', { gold: 50_000 }, A.token);
      assert.equal(big.body.fios, GUILD_FIOS.donateDayMax - 10);
      assert.equal((await api(S.url, 'POST', '/guild/donate', { gold: 500 }, A.token)).status, 409);   // teto do dia
      const s = (await api(S.url, 'GET', '/save', undefined, A.token)).body;
      assert.equal(s.data.gold, 80_000 - GUILD_FOUND_COST - GUILD_FIOS.donateDayMax * 100);
      // missão do Passe: +10 (diária)
      const v0 = (await api(S.url, 'GET', '/season', undefined, A.token)).body;
      const m = await api(S.url, 'POST', '/season/mission', { id: v0.daily[0].id }, A.token);
      assert.equal(m.body.guildFios, GUILD_FIOS.daily);
      const g = (await api(S.url, 'GET', '/guild', undefined, A.token)).body.guild;
      assert.equal(g.fios, GUILD_FIOS.donateDayMax + GUILD_FIOS.daily);
      assert.equal(g.members[0].weekFios, GUILD_FIOS.donateDayMax + GUILD_FIOS.daily);
    });

    test('sair: o líder passa a liderança; o último a sair desfaz a guilda', async () => {
      const A = await account(), B = await account();
      const f = await api(S.url, 'POST', '/guild', { name: gname(), tag: tag(), emblem: EMB }, A.token);
      await api(S.url, 'POST', '/guild/invite', { name: B.account.name }, A.token);
      await api(S.url, 'POST', '/guild/accept', { id: f.body.view.guild.id }, B.token);
      const l = await api(S.url, 'POST', '/guild/leave', {}, A.token);
      assert.equal(l.status, 200); assert.equal(l.body.disbanded, false);
      assert.equal((await api(S.url, 'GET', '/guild', undefined, B.token)).body.me.role, 'lider');
      const l2 = await api(S.url, 'POST', '/guild/leave', {}, B.token);
      assert.equal(l2.body.disbanded, true); assert.equal(l2.body.view.guild, null);
      assert.equal((await api(S.url, 'POST', '/guild/leave', {}, B.token)).status, 404);
    });
  });
}
