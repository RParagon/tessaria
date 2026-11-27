import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeItem } from '../../shared/items';
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
      // sair da vila atualiza o "onde" para o grupo; o chat comum fica no local (ninguém ouviu) e /g chega ao grupo
      b.c.send({ t: 'where', r: 'rift', n: 7 });
      await a.c.waitFor(m => m.t === 'party' && m.party.members.some((x: any) => x.where === 'Fenda 7'));
      await a.c.waitFor(m => m.t === 'leave' && m.id === b.w.id);
      b.c.send({ t: 'chat', text: 'da Fenda' });
      await b.c.waitFor(m => m.t === 'sys' && /Ninguém por perto ouviu. Use \/g/.test(m.text));
      b.c.send({ t: 'chat', text: '/g da Fenda' });
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
      // loot pelo servidor: elite derrotada perto dos dois → item para cada um, registrado
      a.c.send({ t: 'pos', x: 150, z: 121, yaw: 0, m: 0, a: '' });
      await sleep(150);
      a.c.send({ t: 'ikill', n: 77, el: 1, th: 0, x: 150, z: 120 });
      const la = await a.c.waitFor(m => m.t === 'loot'), lb = await b.c.waitFor(m => m.t === 'loot');
      for (const L of [la, lb]) { assert.ok(L.items.length >= 1); assert.equal(L.items[0].g, 1); assert.match(L.items[0].id, /^g[0-9a-f]{12}$/); assert.ok(L.items[0].rar >= 2); }
      assert.notEqual(la.items[0].id, lb.items[0].id);
      const nLoot = () => b.c.msgs.filter((m: any) => m.t === 'loot').length, before = nLoot();
      a.c.send({ t: 'ikill', n: 77, el: 1, th: 0, x: 150, z: 120 });   // o mesmo monstro não paga duas vezes
      b.c.send({ t: 'ikill', n: 78, el: 1, th: 0, x: 150, z: 120 });   // quem não é anfitrião não avisa abates
      a.c.send({ t: 'ikill', n: 79, el: 1, th: 0, x: 10, z: 10 });     // longe dos dois: ninguém ganha
      await sleep(250);
      assert.equal(nLoot(), before);
      // o item concedido entra no save; um forjado com a marca do servidor é recusado
      const sv = baseSave(); sv.inv = [lb.items[0]];
      assert.equal((await api(S.url, 'PUT', '/save', { rev: 1, data: sv }, B.token)).status, 200);
      const fake = baseSave(); fake.inv = [{ ...lb.items[0], id: 'gdeadbeef0001' }];
      const r = await api(S.url, 'PUT', '/save', { rev: 2, data: fake }, B.token);
      assert.equal(r.status, 422); assert.match(r.body.erros.join(' '), /itens do servidor desconhecidos/);
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

    test('Ermos do grupo: mesmo mapa (sem semente), sala Ermos, mapa grande e loot no nível do bioma', async () => {
      const A = await account(baseSave({ lvl: 20 })), B = await account(baseSave({ lvl: 20 }));
      const a = await connect(A), b = await connect(B);
      a.c.send({ t: 'pinvite', name: B.account.name });
      await b.c.waitFor(m => m.t === 'pinvite'); b.c.send({ t: 'paccept', from: A.account.name });
      await a.c.waitFor(m => m.t === 'party' && m.party?.members.length === 2);
      a.c.send({ t: 'iopen', kind: 'wilds' });
      const ea = await a.c.waitFor(m => m.t === 'ienter');
      assert.equal(ea.kind, 'wilds'); assert.equal(ea.rift, null);
      const rd = await b.c.waitFor(m => m.t === 'iready');
      assert.equal(rd.kind, 'wilds');
      b.c.send({ t: 'ijoin', inst: rd.inst }); assert.equal((await b.c.waitFor(m => m.t === 'ienter')).kind, 'wilds');
      a.c.send({ t: 'where', r: 'wilds', i: ea.inst }); b.c.send({ t: 'where', r: 'wilds', i: ea.inst });
      const wb = await b.c.waitFor(m => m.t === 'welcome' && m.room === 'Ermos do grupo');
      a.c.send({ t: 'pos', x: 550, z: 480, yaw: 0, m: 0, a: '' }); b.c.send({ t: 'pos', x: 551, z: 481, yaw: 0, m: 0, a: '' });
      await a.c.waitFor(m => m.t === 'snap' && m.ps.some((q: any) => q[0] === wb.id && q[1] === 551));
      a.c.send({ t: 'ikill', n: 5, el: 1, th: 0, x: 550, z: 480, b: 7 });
      const L7 = await b.c.waitFor(m => m.t === 'loot');
      assert.ok(L7.items[0].tier > 5.4, `tier ${L7.items[0].tier}`);   // Ermo Profundo: 1 + 4 + (20-3)*0,05
      a.c.send({ t: 'ikill', n: 6, el: 1, th: 0, x: 550, z: 480, b: 99 });   // bioma inválido: vale a Campina
      const L0 = await b.c.waitFor(m => m.t === 'loot' && m !== L7);
      assert.ok(L0.items[0].tier < 3, `tier ${L0.items[0].tier}`);
      a.c.close(); b.c.close();
    });

    test('Ermos abertos: sala pública, PvP só no Ermo Profundo e sem fogo amigo, espólio que outro pega (com lápide no dono)', async () => {
      const A = await account(baseSave({ lvl: 30 })), B = await account(baseSave({ lvl: 30 })), C = await account(baseSave({ lvl: 30 }));
      await befriend(A, B);
      const a = await connect(A, 'wilds'), b = await connect(B, 'wilds'), c = await connect(C, 'wilds');
      assert.equal(a.w.room, 'Ermos #1 · Normal e Difícil'); assert.equal(c.w.room, a.w.room);
      // Ermo Profundo: ladrilho (40, 175), longe do centro (200, 175)
      a.c.send({ t: 'pos', x: 80, z: 350, yaw: 0, m: 0, a: '' }); b.c.send({ t: 'pos', x: 82, z: 350, yaw: 0, m: 0, a: '' }); c.c.send({ t: 'pos', x: 84, z: 350, yaw: 0, m: 0, a: '' });
      await a.c.waitFor(m => m.t === 'snap' && m.ps.some((q: any) => q[0] === c.w.id && q[1] === 84));
      a.c.send({ t: 'act', a: 'swing', c: 0, yaw: 0 }); a.c.send({ t: 'pvp', to: c.w.id, dmg: 120 });
      const hit = await c.c.waitFor(m => m.t === 'pvp');
      assert.equal(hit.from, a.w.id); assert.equal(hit.name, A.account.name); assert.equal(hit.dmg, 120);
      await sleep(300); a.c.send({ t: 'act', a: 'swing', c: 0, yaw: 0 }); a.c.send({ t: 'pvp', to: b.w.id, dmg: 120 });   // amigo: sem fogo amigo
      // perto da vila não há PvP: C volta pelo obelisco (teleporte aceito) para o centro
      c.c.send({ t: 'pos', x: 400, z: 350, yaw: 0, m: 0, a: '', w: 1 });
      await a.c.waitFor(m => m.t === 'snap' && m.ps.some((q: any) => q[0] === c.w.id && q[1] === 400));
      a.c.send({ t: 'act', a: 'swing', c: 0, yaw: 0 }); a.c.send({ t: 'pvp', to: c.w.id, dmg: 99 });
      await sleep(250);
      assert.equal(b.c.msgs.filter(m => m.t === 'pvp').length, 0);
      assert.equal(c.c.msgs.filter(m => m.t === 'pvp').length, 1);
      // espólio: C cai e larga Centelhas e um item; A pega primeiro
      await sleep(3100); c.c.send({ t: 'pos', x: 84, z: 350, yaw: 0, m: 0, a: '', w: 1 });   // teleporte de novo: no máximo um a cada 3 s
      await a.c.waitFor(m => m.t === 'snap' && m.ps.some((q: any) => q[0] === c.w.id && q[1] === 84));
      const it = makeItem('weapon', 1.5, 1, 'lamina');
      c.c.send({ t: 'ldrop', x: 84, z: 350, gold: 500, items: [it, { lixo: true }], at: 12345 });
      const drop = await a.c.waitFor(m => m.t === 'ldrop');
      assert.equal(drop.name, C.account.name); assert.equal(drop.gold, 500); assert.equal(drop.n, 1);   // item inválido fica de fora
      assert.equal((await c.c.waitFor(m => m.t === 'ldrop')).by, c.w.id);
      b.c.send({ t: 'pos', x: 130, z: 350, yaw: 0, m: 0, a: '', w: 1 });
      await sleep(100);
      b.c.send({ t: 'ltake', id: drop.id, free: 5 });   // longe demais: nada
      a.c.send({ t: 'ltake', id: drop.id, free: 5 });
      const got = await a.c.waitFor(m => m.t === 'lgot');
      assert.equal(got.gold, 500); assert.equal(got.items[0].id, it.id); assert.equal(got.own, false);
      const lost = await c.c.waitFor(m => m.t === 'lgone' && m.by);
      assert.equal(lost.by, A.account.name); assert.equal(lost.at, 12345);
      await b.c.waitFor(m => m.t === 'lgone' && m.id === drop.id);
      assert.equal(b.c.msgs.filter(m => m.t === 'lgot').length, 0);
      // o item agora tem lápide na conta de C: não volta pelo save dele
      const r = await api(S.url, 'PUT', '/save', { rev: 1, data: baseSave({ lvl: 30, inv: [it] }) }, C.token);
      assert.equal(r.status, 422); assert.match(JSON.stringify(r.body), /saíram/);
      // quem chega depois vê os espólios ainda no chão
      c.c.send({ t: 'ldrop', x: 84, z: 350, gold: 7, items: [], at: 999 });
      await a.c.waitFor(m => m.t === 'ldrop' && m.gold === 7);
      const D = await account(), d = await connect(D, 'wilds');
      assert.equal(d.w.room, a.w.room);
      await d.c.waitFor(m => m.t === 'ldrop' && m.gold === 7);
      a.c.close(); b.c.close(); c.c.close(); d.c.close();
    });

    test('Ermos abertos por faixa: Tormento não cai com Normal; quem está em grupo vai para a sala do líder', async () => {
      const T = await account(baseSave({ lvl: 30, diff: 4, bosses: { glass: true } })), F = await account(baseSave({ lvl: 25 }));
      await befriend(T, F);   // em salas diferentes, só amigo convida
      const t = await connect(T, 'wilds');
      assert.equal(t.w.room, 'Ermos #1 · Tormento');
      const f = await connect(F);
      t.c.send({ t: 'pinvite', name: F.account.name });
      await f.c.waitFor(m => m.t === 'pinvite'); f.c.send({ t: 'paccept', from: T.account.name });
      await t.c.waitFor(m => m.t === 'party' && m.party?.members.length === 2);
      f.c.send({ t: 'where', r: 'wilds' });
      const w = await f.c.waitFor(m => m.t === 'welcome' && m.room !== f.w.room);
      assert.equal(w.room, 'Ermos #1 · Tormento');
      const G2 = await account(baseSave({ lvl: 25 })), g = await connect(G2, 'wilds');
      assert.match(g.w.room, /Normal e Difícil$/);
      t.c.close(); f.c.close(); g.c.close();
    });

    test('troca direta: proposta, ofertas dos dois lados, confirmação dupla e a troca nos saves da nuvem (com lápides)', async () => {
      const A = await account(baseSave({ gold: 500, inv: [{ id: 'tr00001a', slot: 'charm', rar: 2, tier: 2, st: { crit: 4 }, cls: 'lamina', name: 'Anel A' }] }));
      const B = await account(baseSave({ gold: 50, inv: [{ id: 'tr00002b', slot: 'charm', rar: 1, tier: 2, st: { gold: 8 }, cls: 'lamina', name: 'Anel B' }] }));
      const a = await connect(A), b = await connect(B);
      a.c.send({ t: 'tprop', name: B.account.name });
      await b.c.waitFor(m => m.t === 'tinvite' && m.from === A.account.name);
      b.c.send({ t: 'tans', from: A.account.name, ok: true });
      await a.c.waitFor(m => m.t === 'tstate' && m.with === B.account.name);
      a.c.send({ t: 'toffer', items: ['tr00001a'], gold: 200 });
      await b.c.waitFor(m => m.t === 'tstate' && m.theirs.items.length === 1 && m.theirs.gold === 200);
      b.c.send({ t: 'toffer', items: ['tr00002b', 'nao-tem'], gold: 9999 });   // item que não tem e ouro demais: o servidor corta
      const st = await a.c.waitFor(m => m.t === 'tstate' && m.theirs.items.length === 1);
      assert.equal(st.theirs.gold, 50); assert.equal(st.theirs.items[0].id, 'tr00002b');
      a.c.send({ t: 'tready', on: true }); b.c.send({ t: 'tready', on: true });
      const da = await a.c.waitFor(m => m.t === 'tdone'), db = await b.c.waitFor(m => m.t === 'tdone');
      assert.deepEqual(da.gave, ['tr00001a']); assert.equal(da.got[0].id, 'tr00002b'); assert.equal(da.gold, 50 - 200);
      assert.equal(db.got[0].id, 'tr00001a'); assert.equal(db.gold, 150);
      const sa = (await api(S.url, 'GET', '/save', undefined, A.token)).body, sb = (await api(S.url, 'GET', '/save', undefined, B.token)).body;
      assert.equal(sa.data.gold, 350); assert.deepEqual(sa.data.inv.map((x: any) => x.id), ['tr00002b']); assert.equal(sa.rev, da.rev);
      assert.equal(sb.data.gold, 200); assert.deepEqual(sb.data.inv.map((x: any) => x.id), ['tr00001a']);
      const h = (await api(S.url, 'GET', '/history', undefined, A.token)).body.history[0];
      assert.deepEqual([h.kind, h.with, h.gave, h.got, h.gold], ['troca', B.account.name, ['Anel A'], ['Anel B'], -150]);
      // A não consegue trazer de volta o anel que deu
      assert.equal((await api(S.url, 'PUT', '/save', { rev: sa.rev, data: { ...sa.data, inv: [...sa.data.inv, { id: 'tr00001a', slot: 'charm', rar: 2, tier: 2, st: { crit: 4 }, cls: 'lamina', name: 'Anel A' }] } }, A.token)).status, 422);
      a.c.close(); b.c.close();
    });

    test('dificuldade do grupo: a do líder, limitada à que todos desbloquearam; o Pronto? leva a dificuldade e o nível do líder', async () => {
      const A = await account(baseSave({ lvl: 15, diff: 3 })), B = await account(baseSave({ lvl: 5 }));   // 10 níveis: o limite
      const a = await connect(A), b = await connect(B);
      a.c.send({ t: 'pinvite', name: B.account.name });
      await b.c.waitFor(m => m.t === 'pinvite'); b.c.send({ t: 'paccept', from: A.account.name });
      await a.c.waitFor(m => m.t === 'party' && m.party?.members.length === 2);
      a.c.send({ t: 'iopen', kind: 'rift', L: 2, base: 'forest', aff: [], boss: 'spider' });
      const sys = await a.c.waitFor(m => m.t === 'sys' && /Dificuldade do grupo/.test(m.text));
      assert.match(sys.text, /Difícil/); assert.match(sys.text, new RegExp(B.account.name)); assert.match(sys.text, /Mestre/);
      const ea = await a.c.waitFor(m => m.t === 'ienter');
      assert.equal(ea.diff, 1); assert.equal(ea.lvl, 15);
      assert.equal((await b.c.waitFor(m => m.t === 'iready')).diff, 1);
      a.c.close(); b.c.close();
    });

    test('faixa de nível: mais de 10 níveis do líder não recebe o Pronto? nem entra', async () => {
      const A = await account(baseSave({ lvl: 25 })), B = await account(baseSave({ lvl: 3 }));
      const a = await connect(A), b = await connect(B);
      a.c.send({ t: 'pinvite', name: B.account.name });
      await b.c.waitFor(m => m.t === 'pinvite'); b.c.send({ t: 'paccept', from: A.account.name });
      await a.c.waitFor(m => m.t === 'party' && m.party?.members.length === 2);
      a.c.send({ t: 'iopen', kind: 'rift', L: 2, base: 'forest', aff: [], boss: 'spider' });
      await b.c.waitFor(m => m.t === 'sys' && /Diferença de nível/.test(m.text));
      await a.c.waitFor(m => m.t === 'sys' && /Fora da faixa/.test(m.text));
      const ea = await a.c.waitFor(m => m.t === 'ienter');
      b.c.send({ t: 'ijoin', inst: ea.inst });
      await b.c.waitFor(m => m.t === 'sys' && /Diferença de nível|já fechou/.test(m.text));
      assert.ok(!b.c.msgs.some((m: any) => m.t === 'iready' || m.t === 'ienter'));
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
