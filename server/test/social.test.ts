import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { STORES, startServer, api, register, baseSave, WsClient, sleep, type TestServer } from './helpers';

for (const kind of STORES) {
  describe(`amigos e grupo (${kind})`, () => {
    let S: TestServer;
    before(async () => { S = await startServer(kind, {}, { inviteMs: 400, graceMs: 300, instEmptyMs: 300 }); });
    after(async () => { await S.close(); });

    async function account(save = baseSave()) {
      const a = await register(S.url);
      await api(S.url, 'PUT', '/save', { rev: 0, data: save }, a.token);
      return a;
    }
    async function connect(a: { token: string }, where = 'hub') {
      const c = new WsClient(`${S.ws}?token=${a.token}&r=${where}`); await c.open();
      const w = await c.waitFor(m => m.t === 'welcome');
      return { c, w };
    }
    async function befriend(a: { token: string; account: { name: string } }, b: { token: string; account: { name: string } }) {
      assert.equal((await api(S.url, 'POST', '/friends', { name: b.account.name }, a.token)).status, 200);
      assert.equal((await api(S.url, 'POST', '/friends/accept', { name: a.account.name }, b.token)).status, 200);
    }

    test('pedido de amizade: enviar, aceitar, lista com presença e remover', async () => {
      const A = await account(), B = await account(baseSave({ lvl: 8 }));
      const bws = await connect(B, 'forest');
      const r = await api(S.url, 'POST', '/friends', { name: B.account.name }, A.token);
      assert.equal(r.status, 200); assert.equal(r.body.state, 'enviado');
      await bws.c.waitFor(m => m.t === 'social' && m.ev === 'pedido' && m.name === A.account.name);
      let la = await api(S.url, 'GET', '/friends', undefined, A.token);
      assert.deepEqual(la.body.outgoing.map((x: any) => x.name), [B.account.name]);
      const lb = await api(S.url, 'GET', '/friends', undefined, B.token);
      assert.deepEqual(lb.body.incoming.map((x: any) => x.name), [A.account.name]);
      assert.equal((await api(S.url, 'POST', '/friends/accept', { name: A.account.name }, B.token)).body.state, 'amigos');
      la = await api(S.url, 'GET', '/friends', undefined, A.token);
      assert.equal(la.body.friends.length, 1);
      assert.deepEqual({ ...la.body.friends[0], lastSeen: null }, { name: B.account.name, online: true, where: 'Bosque Sussurrante', title: 'Nv 8 · Lâmina', lastSeen: null });
      assert.equal(la.body.outgoing.length, 0);
      // pedir de novo não duplica
      assert.equal((await api(S.url, 'POST', '/friends', { name: B.account.name }, A.token)).status, 409);
      bws.c.close(); await sleep(100);
      la = await api(S.url, 'GET', '/friends', undefined, A.token);
      assert.equal(la.body.friends[0].online, false); assert.ok(la.body.friends[0].lastSeen);
      assert.equal((await api(S.url, 'POST', '/friends/remove', { name: B.account.name }, A.token)).status, 200);
      assert.equal((await api(S.url, 'GET', '/friends', undefined, B.token)).body.friends.length, 0);
    });

    test('pedidos cruzados viram amizade na hora; regras de nome', async () => {
      const A = await account(), B = await account();
      await api(S.url, 'POST', '/friends', { name: B.account.name }, A.token);
      const r = await api(S.url, 'POST', '/friends', { name: A.account.name }, B.token);
      assert.equal(r.body.state, 'amigos');
      assert.equal((await api(S.url, 'POST', '/friends', { name: A.account.name }, A.token)).status, 422);
      assert.equal((await api(S.url, 'POST', '/friends', { name: 'NinguemComEsseNome' }, A.token)).status, 404);
      assert.equal((await api(S.url, 'GET', '/friends')).status, 401);
    });

    test('bloquear desfaz a amizade, impede pedidos e esconde o chat', async () => {
      const A = await account(), B = await account(), C = await account();
      await befriend(A, B);
      assert.equal((await api(S.url, 'POST', '/blocks', { name: B.account.name }, A.token)).status, 200);
      const la = await api(S.url, 'GET', '/friends', undefined, A.token);
      assert.equal(la.body.friends.length, 0); assert.deepEqual(la.body.blocked, [{ name: B.account.name }]);
      assert.equal((await api(S.url, 'POST', '/friends', { name: A.account.name }, B.token)).status, 409);
      const a = await connect(A), b = await connect(B), c = await connect(C);
      b.c.send({ t: 'chat', text: 'oi da B' });
      await c.c.waitFor(m => m.t === 'chat' && m.text === 'oi da B');
      await sleep(150);
      assert.ok(!a.c.msgs.some(m => m.t === 'chat' && m.text === 'oi da B'), 'quem bloqueou não deveria ver');
      b.c.send({ t: 'pinvite', name: A.account.name });
      await b.c.waitFor(m => m.t === 'sys' && /Não foi possível convidar/.test(m.text));
      assert.equal((await api(S.url, 'POST', '/blocks/remove', { name: B.account.name }, A.token)).status, 200);
      assert.equal((await api(S.url, 'GET', '/friends', undefined, A.token)).body.blocked.length, 0);
      a.c.close(); b.c.close(); c.c.close();
    });

    test('amigos ficam sabendo quando o outro entra e sai', async () => {
      const A = await account(), B = await account();
      await befriend(A, B);
      const a = await connect(A, 'crypt');
      const b = await connect(B);
      await a.c.waitFor(m => m.t === 'social' && m.ev === 'online' && m.name === B.account.name);
      b.c.close();
      await a.c.waitFor(m => m.t === 'social' && m.ev === 'offline' && m.name === B.account.name);
      a.c.close();
    });

    test('grupo: convidar na vila, aceitar, chat do grupo, líder e sair', async () => {
      const A = await account(baseSave({ lvl: 12 })), B = await account(baseSave({ lvl: 5, char: { ...baseSave().char, cls: 'arco' } })), C = await account();
      const a = await connect(A), b = await connect(B), c = await connect(C);
      a.c.send({ t: 'chat', text: '/convidar ' + B.account.name });
      const inv = await b.c.waitFor(m => m.t === 'pinvite');
      assert.equal(inv.from, A.account.name); assert.equal(inv.size, 1);
      b.c.send({ t: 'paccept', from: A.account.name });
      const pa = await a.c.waitFor(m => m.t === 'party' && m.party?.members.length === 2);
      assert.equal(pa.party.leader, A.account.name);
      assert.deepEqual(pa.party.members.map((m: any) => [m.name, m.cls, m.lvl, m.online, m.leader]), [[A.account.name, 'lamina', 12, true, true], [B.account.name, 'arco', 5, true, false]]);
      assert.match(pa.party.members[0].where, /^Vila Brasa #\d+$/);
      // só o líder convida
      b.c.send({ t: 'pinvite', name: C.account.name });
      await b.c.waitFor(m => m.t === 'sys' && m.text === 'Só o líder do grupo pode convidar.');
      // chat do grupo não chega para quem está fora
      b.c.send({ t: 'chat', text: '/g bora pra Fenda?' });
      const pc = await a.c.waitFor(m => m.t === 'pchat');
      assert.deepEqual([pc.name, pc.text], [B.account.name, 'bora pra Fenda?']);
      await sleep(150); assert.ok(!c.c.msgs.some(m => m.t === 'pchat'));
      // sair da vila atualiza o "onde" para o grupo, e o chat comum vira chat do grupo
      b.c.send({ t: 'where', r: 'rift', n: 7 });
      await a.c.waitFor(m => m.t === 'party' && m.party.members.some((x: any) => x.where === 'Fenda 7'));
      await a.c.waitFor(m => m.t === 'leave' && m.id === b.w.id);
      b.c.send({ t: 'chat', text: 'da Fenda' });
      await a.c.waitFor(m => m.t === 'pchat' && m.text === 'da Fenda');
      // passar a liderança e sair: o grupo de 2 acaba
      a.c.send({ t: 'plead', name: B.account.name });
      await a.c.waitFor(m => m.t === 'party' && m.party.leader === B.account.name);
      a.c.send({ t: 'pleave' });
      await b.c.waitFor(m => m.t === 'party' && m.party === null);
      await b.c.waitFor(m => m.t === 'sys' && m.text === 'O grupo acabou.');
      a.c.close(); b.c.close(); c.c.close();
    });

    test('grupo: fora da vila só amigos; convite expira; cheio com 4', async () => {
      const A = await account(), B = await account(), C = await account(), D = await account(), E = await account();
      const a = await connect(A), b = await connect(B, 'forest');
      a.c.send({ t: 'pinvite', name: B.account.name });
      await a.c.waitFor(m => m.t === 'sys' && m.text === 'Fora da vila, só dá para convidar amigos.');
      await befriend(A, B);
      await sleep(1050);
      a.c.send({ t: 'pinvite', name: B.account.name });
      await b.c.waitFor(m => m.t === 'pinvite' && m.from === A.account.name);
      await sleep(500);                       // inviteMs = 400 nos testes
      b.c.send({ t: 'paccept', from: A.account.name });
      await b.c.waitFor(m => m.t === 'sys' && m.text === 'Esse convite expirou.');
      // um grupo de 4 recusa o quinto
      const c = await connect(C), d = await connect(D), e = await connect(E);
      for (const [x, who] of [[b, B], [c, C], [d, D]] as const) {
        x.c.msgs = x.c.msgs.filter(q => q.t !== 'pinvite');      // convites antigos (já expirados) não contam
        await sleep(1050); a.c.send({ t: 'pinvite', name: who.account.name });
        await x.c.waitFor(m => m.t === 'pinvite' && m.from === A.account.name);
        x.c.send({ t: 'paccept', from: A.account.name });
      }
      await a.c.waitFor(m => m.t === 'party' && m.party.members.length === 4);
      await sleep(1050); a.c.send({ t: 'pinvite', name: E.account.name });
      await a.c.waitFor(m => m.t === 'sys' && m.text === 'Seu grupo está cheio (4).');
      // tirar alguém
      a.c.send({ t: 'pkick', name: D.account.name });
      await d.c.waitFor(m => m.t === 'sys' && m.text === 'Você foi tirado do grupo.');
      await a.c.waitFor(m => m.t === 'party' && m.party.members.length === 3);
      for (const x of [a, b, c, d, e]) x.c.close();
    });

    test('grupo: quem cai volta dentro da tolerância; depois sai', async () => {
      const A = await account(), B = await account();
      const a = await connect(A), b = await connect(B);
      a.c.send({ t: 'pinvite', name: B.account.name }); await b.c.waitFor(m => m.t === 'pinvite');
      b.c.send({ t: 'paccept', from: A.account.name });
      await a.c.waitFor(m => m.t === 'party' && m.party.members.length === 2);
      b.c.close();
      await a.c.waitFor(m => m.t === 'party' && m.party.members.some((x: any) => x.name === B.account.name && !x.online));
      const b2 = await connect(B, 'home');
      await b2.c.waitFor(m => m.t === 'party' && m.party.members.length === 2);
      await a.c.waitFor(m => m.t === 'party' && m.party.members.some((x: any) => x.name === B.account.name && x.online && x.where === 'Casa do Tecelão'));
      b2.c.close();
      await a.c.waitFor(m => m.t === 'party' && m.party === null, 2000);   // graceMs = 300 nos testes
      a.c.close();
    });

    test('Fenda do grupo: o líder abre, o grupo recebe o Pronto?, todos entram no mesmo mapa e se veem', async () => {
      const A = await account(), B = await account(), C = await account();
      const a = await connect(A), b = await connect(B), c = await connect(C);
      a.c.send({ t: 'pinvite', name: B.account.name });
      await b.c.waitFor(m => m.t === 'pinvite');
      b.c.send({ t: 'paccept', from: A.account.name });
      await a.c.waitFor(m => m.t === 'party' && m.party && m.party.members.length === 2);
      // só o líder abre; dados inválidos são ignorados
      b.c.send({ t: 'iopen', kind: 'rift', L: 3, base: 'crypt', aff: ['sangrenta'], boss: 'knight' });
      assert.match((await b.c.waitFor(m => m.t === 'sys' && /líder/.test(m.text))).text, /Só o líder/);
      a.c.send({ t: 'iopen', kind: 'rift', L: 3, base: 'lua', aff: [], boss: 'knight' });
      a.c.send({ t: 'iopen', kind: 'rift', L: 3, base: 'crypt', aff: ['sangrenta'], boss: 'knight' });
      const ea = await a.c.waitFor(m => m.t === 'ienter');
      assert.equal(ea.rift.L, 3); assert.equal(ea.rift.base, 'crypt'); assert.ok(ea.rift.seed > 0);
      const ready = await b.c.waitFor(m => m.t === 'iready');
      assert.equal(ready.inst, ea.inst); assert.equal(ready.by, A.account.name); assert.equal(ready.L, 3);
      b.c.send({ t: 'ijoin', inst: ready.inst });
      const eb = await b.c.waitFor(m => m.t === 'ienter');
      assert.deepEqual(eb.rift, ea.rift);   // mesmos dados → mesmo mapa
      // entram na sala da instância e se veem; posições fora da vila valem lá dentro
      a.c.send({ t: 'where', r: 'rift', n: 3, i: ea.inst });
      const wa = await a.c.waitFor(m => m.t === 'welcome' && m.room === 'Fenda 3');
      b.c.send({ t: 'where', r: 'rift', n: 3, i: ea.inst });
      const wb = await b.c.waitFor(m => m.t === 'welcome' && m.room === 'Fenda 3');
      assert.ok(wb.players.some((p: any) => p.id === wa.id));
      await a.c.waitFor(m => m.t === 'join' && m.p.id === wb.id);
      b.c.send({ t: 'pos', x: 150, z: 120, yaw: 0, m: 0, a: '' });
      await a.c.waitFor(m => m.t === 'snap' && m.ps.some((q: any) => q[0] === wb.id && q[1] === 150));
      const pv = await a.c.waitFor(m => m.t === 'party' && m.party?.inst?.n === 2);
      assert.equal(pv.party.inst.L, 3);
      // anfitrião (líder) e repasse do combate
      await b.c.waitFor(m => m.t === 'ihost' && m.id === wa.id);
      a.c.send({ t: 'hx', d: { k: 'snap', n: 1 } });
      assert.equal((await b.c.waitFor(m => m.t === 'hx' && m.d.k === 'snap')).from, wa.id);
      b.c.send({ t: 'hx', d: { k: 'falso' } });                 // quem não é anfitrião não transmite
      b.c.send({ t: 'gx', d: { k: 'hit', dmg: 5 } });
      assert.equal((await a.c.waitFor(m => m.t === 'gx' && m.d.k === 'hit')).from, wb.id);
      a.c.send({ t: 'hto', to: wb.id, d: { k: 'hurt', dmg: 3 } });
      await b.c.waitFor(m => m.t === 'hx' && m.d.k === 'hurt');
      b.c.send({ t: 'px', d: { k: 'down' } });                  // entre jogadores: para todos
      await a.c.waitFor(m => m.t === 'px' && m.d.k === 'down' && m.from === wb.id);
      a.c.send({ t: 'px', to: wb.id, d: { k: 'rev' } });       // para um
      await b.c.waitFor(m => m.t === 'px' && m.d.k === 'rev' && m.from === wa.id);
      a.c.send({ t: 'hx', d: 'texto' });                        // conteúdo precisa ser objeto
      await sleep(150);
      assert.ok(!a.c.msgs.some((m: any) => m.t === 'hx' && m.d.k === 'falso'));
      assert.ok(!b.c.msgs.some((m: any) => m.t === 'hx' && m.d === 'texto'));
      // quem não é do grupo não entra
      c.c.send({ t: 'where', r: 'rift', n: 3, i: ea.inst });
      await c.c.waitFor(m => m.t === 'iclosed' && m.inst === ea.inst);
      c.c.send({ t: 'ijoin', inst: ea.inst });
      await c.c.waitFor(m => m.t === 'sys' && /fechou/.test(m.text));
      // todos voltam para a vila: a instância vazia fecha
      a.c.send({ t: 'where', r: 'hub' }); b.c.send({ t: 'where', r: 'hub' });
      await a.c.waitFor(m => m.t === 'party' && m.party && m.party.inst === null, 3000);
      a.c.close(); b.c.close(); c.c.close();
    });

    test('Fenda do grupo: sair do grupo tira da instância; grupo desfeito fecha a Fenda', async () => {
      const A = await account(), B = await account();
      const a = await connect(A), b = await connect(B);
      a.c.send({ t: 'pinvite', name: B.account.name });
      await b.c.waitFor(m => m.t === 'pinvite'); b.c.send({ t: 'paccept', from: A.account.name });
      await a.c.waitFor(m => m.t === 'party' && m.party?.members.length === 2);
      a.c.send({ t: 'iopen', kind: 'rift', L: 1, base: 'forest', aff: [], boss: 'spider' });
      const ea = await a.c.waitFor(m => m.t === 'ienter');
      b.c.send({ t: 'ijoin', inst: ea.inst }); await b.c.waitFor(m => m.t === 'ienter');
      a.c.send({ t: 'where', r: 'rift', n: 1, i: ea.inst }); b.c.send({ t: 'where', r: 'rift', n: 1, i: ea.inst });
      await b.c.waitFor(m => m.t === 'welcome' && m.room === 'Fenda 1');
      b.c.send({ t: 'pleave' });
      await b.c.waitFor(m => m.t === 'iclosed' && m.inst === ea.inst);
      await a.c.waitFor(m => m.t === 'iclosed' && m.inst === ea.inst);   // grupo de 1 acabou: Fenda fecha
      a.c.close(); b.c.close();
    });

    test('comando /amigo pelo chat', async () => {
      const A = await account(), B = await account();
      const a = await connect(A), b = await connect(B);
      a.c.send({ t: 'chat', text: '/amigo ' + B.account.name });
      await b.c.waitFor(m => m.t === 'social' && m.ev === 'pedido');
      await a.c.waitFor(m => m.t === 'sys' && /Pedido de amizade enviado/.test(m.text));
      b.c.send({ t: 'chat', text: '/amigo ' + A.account.name });
      await a.c.waitFor(m => m.t === 'social' && m.ev === 'aceito' && m.name === B.account.name);
      a.c.close(); b.c.close();
    });
  });
}
