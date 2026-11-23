import { test, expect, type Page, type Browser } from '@playwright/test';
import { itemProblems } from '../../shared/items';
import { validateSave } from '../../shared/save';

// Testes do modo online: rodam contra o servidor real (em memória), subido pelo
// playwright.config.js. Cada jogador é um contexto de navegador separado.

async function onlinePlayer(browser: Browser, cls = 'lamina') {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 560 } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|favicon/.test(m.text())) errors.push(m.text()); });
  await page.goto('/?debug=1');
  await page.waitForSelector('#mOnline:not([hidden])', { timeout: 30_000 });
  await page.evaluate(() => { (window as any).__T.G.forceHour = 12; (window as any).__T.G.forceWeather = 'limpo'; });   // meio-dia (a noite muda dano, XP e loot)
  await page.click('#mOnline');
  await page.click('.net-tabs button:nth-child(3)');
  await page.click('.net-form button.gold');
  await page.waitForSelector('#create:not([hidden])', { timeout: 20_000 });
  await page.evaluate(c => { (window as any).__T.G.char.cls = c; }, cls);
  await page.click('#cGo');
  await skipStory(page);
  await page.waitForFunction(() => (window as any).__T?.P && (window as any).__T.RG.key === 'hub', null, { timeout: 30_000 });
  await page.waitForFunction(() => (window as any).TessNet.connected, null, { timeout: 15_000 });
  const name = await page.evaluate(() => (window as any).TessNet.account.name as string);
  return { page, ctx, errors, name };
}
async function skipStory(page: Page) {
  for (let i = 0; i < 8; i++) { const s = page.locator('#story'); if (!(await s.isVisible())) break; await s.click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(150); }
}
/** Dois jogadores em grupo dentro da mesma Fenda do grupo (A é o líder e simula os monstros). */
async function groupRift(browser: Browser) {
  const A = await onlinePlayer(browser, 'lamina'), B = await onlinePlayer(browser, 'arco');
  await A.page.evaluate(n => (window as any).TessNet.invite(n), B.name);
  await B.page.click('.net-invite button:has-text("Aceitar")');
  await A.page.waitForFunction(() => (window as any).TessNet.party?.members.length === 2, null, { timeout: 10_000 });
  await A.page.evaluate(() => (window as any).__T.ev('netGroupRift(1)'));
  await B.page.locator('.net-ready button:has-text("Entrar")').click();
  for (const pg of [A.page, B.page]) await pg.waitForFunction(() => (window as any).__T.RG?.key === 'rift' && (window as any).TessNet.room, null, { timeout: 20_000 });
  await A.page.waitForFunction(() => (window as any).TessNet.isHost, null, { timeout: 10_000 });
  await B.page.waitForFunction(() => (window as any).TessNet.hostId > 0 && !(window as any).TessNet.isHost, null, { timeout: 10_000 });
  const ev = (pg: Page, src: string) => pg.evaluate(s => (window as any).__T.ev(s), src);
  return { A, B, ev };
}

const waitSync = (page: Page) => page.waitForFunction(() => (window as any).TessNet.sync === 'salvo', null, { timeout: 20_000 });

test('dois jogadores se veem na vila, conversam e usam emotes', async ({ browser }) => {
  const A = await onlinePlayer(browser, 'arcano'), B = await onlinePlayer(browser, 'arco');
  await A.page.evaluate(() => { const T = (window as any).__T; T.P.x = 44; T.P.z = 40; });
  await B.page.evaluate(() => { const T = (window as any).__T; T.P.x = 46.5; T.P.z = 40; });
  await B.page.waitForTimeout(600);
  const bx = await B.page.evaluate(() => [(window as any).__T.P.x, (window as any).__T.P.z]);
  await A.page.waitForFunction(([n, x, z]) => (window as any).TessNet.players().some((p: any) => p.name === n && p.slot !== undefined && Math.hypot(p.tx - x, p.tz - z) < .5), [B.name, bx[0], bx[1]] as const, { timeout: 10_000 })
    .catch(async e => { console.log('B em', bx, 'A vê', await A.page.evaluate(() => (window as any).TessNet.players().map((p: any) => [p.name, p.tx, p.tz, p.slot]))); throw e; });
  await expect(A.page.locator('#marks .tag.rp .rn', { hasText: B.name })).toBeVisible();
  await expect(A.page.locator('.net-chip')).toContainText('2 online');

  await B.page.keyboard.press('Enter');
  await B.page.keyboard.type('Bom dia, porra!');
  await B.page.keyboard.press('Enter');
  await expect(A.page.locator('.net-log')).toContainText('Bom dia, *****!');
  await expect(A.page.locator('#marks .tag.rp .bub')).toHaveText('Bom dia, *****!');

  await B.page.click('.net-emotes button:nth-child(3)');
  await A.page.waitForFunction(() => (window as any).TessNet.players().some((p: any) => p.emote === 'dancar'), null, { timeout: 5000 });
  await B.page.waitForFunction(() => (window as any).__T.P.emote === 'dancar', null, { timeout: 5000 });

  // Relógio da vila: moradores e galinhas no mesmo lugar para os dois
  await A.page.waitForTimeout(1600);   // tempo para as medidas de relógio
  const where = (pg: Page) => pg.evaluate(() => (window as any).__T.ev(`({
    npcs: npcs.filter(n => n.visible && n.wander).map(n => [n.id, +n.x.toFixed(2), +n.z.toFixed(2)]),
    galinhas: critters.map(c => [+(c.x - c.ox).toFixed(2), +(c.z - c.oz).toFixed(2)]),
  })`));
  const [wa, wb] = await Promise.all([where(A.page), where(B.page)]);
  expect(wa.npcs.length).toBeGreaterThan(2);
  for (let i = 0; i < wa.npcs.length; i++) {
    expect(wb.npcs[i][0]).toBe(wa.npcs[i][0]);
    expect(Math.hypot(wa.npcs[i][1] - wb.npcs[i][1], wa.npcs[i][2] - wb.npcs[i][2]), `morador ${wa.npcs[i][0]}`).toBeLessThan(.6);
  }
  for (let i = 0; i < wa.galinhas.length; i++)
    expect(Math.hypot(wa.galinhas[i][0] - wb.galinhas[i][0], wa.galinhas[i][1] - wb.galinhas[i][1]), `galinha ${i}`).toBeLessThan(.6);

  await B.ctx.close();
  await A.page.waitForFunction(() => (window as any).TessNet.players().length === 0, null, { timeout: 10_000 });
  expect(A.errors).toEqual([]); expect(B.errors).toEqual([]);
  await A.ctx.close();
});

test('amigos e grupo: tocar no nome, convidar, aceitar e conversar fora da vila', async ({ browser }) => {
  const A = await onlinePlayer(browser, 'lamina'), B = await onlinePlayer(browser, 'arcano');
  await A.page.evaluate(() => { const T = (window as any).__T; T.P.x = 44; T.P.z = 40; });
  await B.page.evaluate(() => { const T = (window as any).__T; T.P.x = 46.5; T.P.z = 40; });
  const nameTag = A.page.locator('#marks .tag.rp .rn', { hasText: B.name });
  await expect(nameTag).toBeVisible();

  // pedido de amizade pelo menu do nome
  await nameTag.click();
  await A.page.click('.net-pop button:has-text("Adicionar amigo")');
  await B.page.waitForFunction(n => (window as any).TessNet.friendsList?.incoming.some((f: any) => f.name === n), A.name, { timeout: 10_000 });
  await B.page.click('.net-friendsbtn');
  await B.page.click('.net-frow:has-text("quer ser seu amigo") button:has-text("Aceitar")');
  await expect(B.page.locator('.net-frow.on', { hasText: A.name })).toBeVisible();
  await B.page.click('.net-modal .net-x');

  // convite de grupo pelo menu do nome
  await nameTag.click();
  await A.page.click('.net-pop button:has-text("Convidar para o grupo")');
  await B.page.click('.net-invite button:has-text("Aceitar")');
  await expect(A.page.locator('.net-party .net-pm')).toHaveCount(2);
  await expect(B.page.locator('.net-party .net-pm').first()).toContainText('★ ' + A.name);
  await expect(A.page.locator('#marks .tag.rp.ally')).toBeVisible();

  // B sai da vila: continua no grupo, aparece no Bosque; o chat do Bosque é local, e /g fala com o grupo
  await B.page.evaluate(() => { const T = (window as any).__T; T.G.save.met.ysolde = true; T.travel('forest'); });
  await expect(A.page.locator('.net-party .net-pm', { hasText: B.name })).toContainText('Bosque Sussurrante', { timeout: 20_000 });
  await B.page.waitForFunction(() => (window as any).__T.RG.key === 'forest' && (window as any).TessGame.mode === 'play', null, { timeout: 20_000 });
  await B.page.keyboard.press('Enter');
  await B.page.keyboard.type('/g Vem pro bosque!');
  await B.page.keyboard.press('Enter');
  await expect(A.page.locator('.net-log')).toContainText('[Grupo] ' + B.name + ': Vem pro bosque!');
  await expect(A.page.locator('#marks .tag.rp')).toHaveCount(0);

  expect(A.errors).toEqual([]); expect(B.errors).toEqual([]);
  await A.ctx.close(); await B.ctx.close();
});

test('quem assiste vê o ataque, a esquiva e os projéteis do outro jogador desde o início', async ({ browser }) => {
  const A = await onlinePlayer(browser, 'arcano'), B = await onlinePlayer(browser, 'lamina');
  await A.page.evaluate(() => { const T = (window as any).__T; T.P.x = 44; T.P.z = 40; });
  await B.page.evaluate(() => { const T = (window as any).__T; T.P.x = 47; T.P.z = 40; });
  await A.page.waitForFunction(n => (window as any).TessNet.players().some((p: any) => p.name === n && p.slot !== undefined && p.x !== undefined), B.name, { timeout: 10_000 });
  // A anota cada ação que chega e o primeiro quadro desenhado dela.
  await A.page.evaluate(() => {
    const W = window as any, seen: any[] = W.__seen = [], orig = W.TessGame.remoteAct;
    W.TessGame.remoteAct = (id: number, a: string, c: number, yaw: number) => { const n0 = W.__T.ev('parts.length'); orig(id, a, c, yaw); seen.push({ a, c, fx: W.__T.ev('parts.length') - n0 }); };
  });
  const remote = () => (window as any).TessNet.players()[0];

  // Emote primeiro: a ação seguinte precisa interrompê-lo.
  await B.page.evaluate(() => (window as any).TessNet.emote('dancar'));
  await A.page.waitForFunction(() => (window as any).TessNet.players()[0].emote === 'dancar', null, { timeout: 5000 });

  const t0 = await B.page.evaluate(() => { (window as any).__T.ev('doAttack()'); return Date.now(); });
  await A.page.waitForFunction(() => { const r = (window as any).TessNet.players()[0]; return r.act === 'swing' && r.actT > 0 && r.actT < .3; }, null, { timeout: 3000, polling: 'raf' });
  expect(Date.now() - t0).toBeLessThan(1500);
  expect(await A.page.evaluate(remote).then((r: any) => r.emote ?? null)).toBeNull();
  // o rastro do golpe também aparece para quem assiste
  expect(await A.page.evaluate(() => (window as any).__seen[0].fx)).toBe(22);

  await B.page.waitForTimeout(400);
  await B.page.evaluate(() => (window as any).__T.ev('doDash()'));
  await A.page.waitForFunction(() => { const r = (window as any).TessNet.players()[0]; return r.act === 'dash' && r.ghosts && r.ghosts.length > 0; }, null, { timeout: 3000, polling: 'raf' });

  const seen = await A.page.evaluate(() => (window as any).__seen.map((x: any) => x.a));
  expect(seen).toEqual(['swing', 'dash']);

  // O Arcano (A) lança um raio e a Nova: B vê os projéteis, só visuais.
  await A.page.waitForTimeout(400);
  await A.page.evaluate(() => (window as any).__T.ev('doAttack()'));
  await B.page.waitForFunction(() => (window as any).__T.ev("projs.filter(p => p.team === 'fx' && p.bolt).length") === 1, null, { timeout: 3000, polling: 'raf' });
  await A.page.waitForTimeout(400);
  await A.page.evaluate(() => (window as any).__T.ev('doSkill()'));
  await B.page.waitForFunction(() => (window as any).__T.ev("projs.filter(p => p.team === 'fx').length") >= 16, null, { timeout: 3000, polling: 'raf' });
  expect(await B.page.evaluate(() => (window as any).__T.ev("projs.every(p => p.team !== 'p' && !p.dmg)"))).toBe(true);
  expect(await B.page.evaluate(() => (window as any).__T.P.hp === (window as any).__T.P.maxHp)).toBe(true);
  expect(A.errors).toEqual([]); expect(B.errors).toEqual([]);
  await A.ctx.close(); await B.ctx.close();
});

test('Fenda do grupo: o líder abre, o outro aceita o Pronto? e os dois entram no mesmo mapa e se veem', async ({ browser }) => {
  const A = await onlinePlayer(browser, 'lamina'), B = await onlinePlayer(browser, 'arco');
  // grupo (convite direto pela API do cliente; a interface do convite já tem teste próprio)
  await A.page.evaluate(n => (window as any).TessNet.invite(n), B.name);
  await B.page.click('.net-invite button:has-text("Aceitar")');
  await A.page.waitForFunction(() => (window as any).TessNet.party?.members.length === 2, null, { timeout: 10_000 });
  // líder abre a Fenda nível 1 pelo mesmo caminho do menu
  expect(await A.page.evaluate(() => (window as any).__T.ev('netGroupRift(1)'))).toBe(true);
  await A.page.waitForFunction(() => (window as any).__T.RG?.key === 'rift' && (window as any).TessNet.room, null, { timeout: 20_000 });
  // B recebe o Pronto? e entra
  const card = B.page.locator('.net-ready');
  await expect(card).toContainText('Fenda do Tear · Nível 1');
  await card.locator('button:has-text("Entrar")').click();
  await B.page.waitForFunction(() => (window as any).__T.RG?.key === 'rift' && (window as any).TessNet.room, null, { timeout: 20_000 });
  // mesmo mapa: salas, ligações, semente, chefe e afixos iguais
  const mapa = (pg: Page) => pg.evaluate(() => (window as any).__T.ev('JSON.stringify({ rooms: REG.rift.rooms.map(r => [r.x, r.y, r.r || 0, r.w || 0, r.kind || "", r.en ? Object.keys(r.en).length : 0]), links: REG.rift.links, seed: REG.rift.seed, boss: G.rift.boss, aff: G.rift.aff })'));
  const [ma, mb] = await Promise.all([mapa(A.page), mapa(B.page)]);
  expect(mb).toBe(ma);
  // dentro da Fenda, um vê o outro
  const st = (pg: Page) => pg.evaluate(() => { const n = (window as any).TessNet; return { room: n.room, inst: n.inst, region: n.region, ps: n.players().map((p: any) => p.name), party: n.party?.inst }; });
  await A.page.waitForFunction(n => (window as any).TessNet.players().some((p: any) => p.name === n), B.name, { timeout: 10_000 }).catch(async e => { console.log('A', JSON.stringify(await st(A.page)), 'B', JSON.stringify(await st(B.page))); throw e; });
  await B.page.waitForFunction(n => (window as any).TessNet.players().some((p: any) => p.name === n), A.name, { timeout: 10_000 });
  await B.page.evaluate(() => { const T = (window as any).__T; T.P.x = T.P.x + 1.5; });
  await A.page.waitForFunction(() => (window as any).TessNet.players().some((p: any) => p.slot !== undefined), null, { timeout: 10_000 });
  await expect(A.page.locator('#marks .tag.rp .rn', { hasText: B.name })).toBeVisible();
  expect(await A.page.evaluate(() => (window as any).TessNet.party.inst.n)).toBe(2);
  if (process.env.SHOTS) await A.page.screenshot({ path: process.env.SHOTS + '/fenda-grupo.png' });
  expect(A.errors).toEqual([]); expect(B.errors).toEqual([]);
  await A.ctx.close(); await B.ctx.close();
});

test('Fenda do grupo: os monstros são os mesmos para os dois, o acerto do convidado vale e o lobo persegue quem está perto', async ({ browser }) => {
  const A = await onlinePlayer(browser, 'lamina'), B = await onlinePlayer(browser, 'arco');
  await A.page.evaluate(n => (window as any).TessNet.invite(n), B.name);
  await B.page.click('.net-invite button:has-text("Aceitar")');
  await A.page.waitForFunction(() => (window as any).TessNet.party?.members.length === 2, null, { timeout: 10_000 });
  await A.page.evaluate(() => (window as any).__T.ev('netGroupRift(1)'));
  await B.page.locator('.net-ready button:has-text("Entrar")').click();
  for (const pg of [A.page, B.page]) await pg.waitForFunction(() => (window as any).__T.RG?.key === 'rift' && (window as any).TessNet.room, null, { timeout: 20_000 });
  await A.page.waitForFunction(() => (window as any).TessNet.isHost, null, { timeout: 10_000 });
  await B.page.waitForFunction(() => (window as any).TessNet.hostId > 0 && !(window as any).TessNet.isHost, null, { timeout: 10_000 });
  const ev = (pg: Page, src: string) => pg.evaluate(s => (window as any).__T.ev(s), src);

  // 1. o líder cria um inimigo; o convidado vê a cópia no mesmo lugar
  await ev(A.page, "(() => { const e = spawnEnemy('gosmo', P.x + 3, P.z); e.spawnT = 0; e.hp = e.maxHp = 40; e.def = Object.assign({}, e.def, { dmg: 0 }); window.__g = e; })()");
  await A.page.waitForFunction(() => (window as any).__T.ev('__g.nid > 0'), null, { timeout: 5000 });
  const nid = await ev(A.page, '__g.nid');
  await B.page.waitForFunction(id => (window as any).__T.ev(`enemies.some(e => e.proxy && e.nid === ${id})`), nid, { timeout: 5000 });
  const [pa, pb] = await Promise.all([ev(A.page, '[__g.x, __g.z]'), ev(B.page, `(e => [e.x, e.z])(enemies.find(e => e.nid === ${nid}))`)]);
  expect(Math.hypot(pa[0] - pb[0], pa[1] - pb[1])).toBeLessThan(1);

  // 2. o convidado acerta: o líder aplica o dano, o inimigo cai e o convidado ganha a recompensa
  const killsB = await ev(B.page, 'G.save.kills');
  await ev(B.page, `hurtEnemy(enemies.find(e => e.nid === ${nid}), 9999, 1, 0, false)`);
  await A.page.waitForFunction(() => (window as any).__T.ev('__g.dieT >= 0'), null, { timeout: 5000 });
  await B.page.waitForFunction(id => (window as any).__T.ev(`!!(enemies.find(e => e.nid === ${id}) || { rewarded: true }).rewarded`), nid, { timeout: 5000 });
  expect(await ev(B.page, 'G.save.kills')).toBeGreaterThan(killsB);

  // 3. um lobo perto do convidado (longe do líder) persegue e morde o convidado
  // afasta o convidado do líder (os dois começam no mesmo ponto), espera o líder ver a posição nova
  const far = await ev(B.page, "(() => { const rm = RG.rooms.filter(r => r.kind !== 'boss').sort((a, b) => Math.hypot(b.wx - P.x, b.wz - P.z) - Math.hypot(a.wx - P.x, a.wz - P.z))[0]; P.x = rm.wx; P.z = rm.wz; return [P.x, P.z]; })()");
  await A.page.waitForFunction(([x, z]) => (window as any).TessNet.players().some((r: any) => Math.hypot(r.x - x, r.z - z) < 1.5), far, { timeout: 10_000 });
  await B.page.waitForTimeout(300);
  const hpB = await ev(B.page, 'P.hp');
  await ev(A.page, "(() => { const r = TessNet.players()[0]; const e = spawnEnemy('lobo', r.x + 1.2, r.z); e.spawnT = 0; e.aggro = true; })()");
  await B.page.waitForFunction(h => (window as any).__T.ev('P.hp') < h, hpB, { timeout: 15_000 });

  // 4. o convidado não cria inimigos próprios
  expect(await ev(B.page, 'enemies.every(e => e.proxy)')).toBe(true);

  // 5. chefe: o líder chega na sala do chefe e ele aparece para os dois
  await ev(A.page, "(() => { enemies.forEach(e => { e.dieT = 0; }); G.rift.prog = 100; G.rift.bossUp = true; const rm = RG.rooms.find(r => r.kind === 'boss'); P.x = rm.wx; P.z = rm.wz + 2; })()");
  await A.page.waitForFunction(() => (window as any).__T.boss, null, { timeout: 10_000 });
  await B.page.waitForFunction(() => (window as any).__T.boss && (window as any).__T.boss.proxy, null, { timeout: 10_000 });
  expect(await ev(B.page, 'boss.type')).toBe(await ev(A.page, 'boss.type'));
  // 6. os golpes do convidado derrubam o chefe no líder; 7. a Fenda termina para os dois
  await ev(A.page, 'boss.invuln = 0; boss.spawnT = 0; boss.hp = 50');
  for (let i = 0; i < 5 && !(await ev(A.page, '!!(boss && boss.dying) || G.rift.done')); i++) { await ev(B.page, 'boss && hurtBoss(boss, 60, false, bossHits(boss)[0])'); await B.page.waitForTimeout(300); }
  await A.page.waitForFunction(() => (window as any).__T.ev('G.rift.done'), null, { timeout: 15_000 });
  await B.page.waitForFunction(() => (window as any).__T.ev('G.rift.done'), null, { timeout: 15_000 });
  expect(A.errors).toEqual([]); expect(B.errors).toEqual([]);
  await A.ctx.close(); await B.ctx.close();
});

test('Fenda do grupo: monstros mais fortes em dupla, Caído, Costurar e grupo inteiro caído', async ({ browser }) => {
  const { A, B, ev } = await groupRift(browser);
  // 1. escala: com 2 jogadores, vida 1,75x
  const base = await ev(A.page, "(() => { const e = spawnEnemy('gosmo', P.x + 6, P.z + 6); e.spawnT = 0; e.def = Object.assign({}, e.def, { dmg: 0 }); window.__s = e; return e.maxHp; })()");
  await A.page.waitForFunction(() => (window as any).__T.ev('__s.nid > 0'), null, { timeout: 5000 });
  expect(await ev(A.page, '__s.maxHp')).toBe(Math.round(base * 1.75));
  await ev(A.page, '__s.dieT = 0');

  // 2. o convidado cai: fica Caído (não morre) e o líder vê
  await ev(B.page, 'P.iframe = 0; P.dashT = 0; P.hp = 1; hurtPlayer(500, P.x + 1, P.z)');
  expect(await ev(B.page, 'P.down > 0 && P.dieT < 0')).toBe(true);
  await A.page.waitForFunction(() => (window as any).TessNet.players().some((r: any) => r.down), null, { timeout: 5000 });
  await expect(A.page.locator('#marks .tag.rp .rt', { hasText: 'CAÍDO' })).toBeVisible();

  // 3. o líder chega perto, aperta E e costura de volta
  await ev(A.page, '(r => { P.x = r.x + .8; P.z = r.z; })(TessNet.players()[0])');
  await A.page.waitForFunction(() => (window as any).__T.nearInter?.kind === 'revive', null, { timeout: 5000 });
  await A.page.keyboard.press('e');
  // 3 s de jogo; com dois navegadores sem GPU o relógio do jogo anda mais devagar que o real
  await B.page.waitForFunction(() => (window as any).__T.ev('!(P.down > 0)'), null, { timeout: 25_000 });
  const [hp, max] = await ev(B.page, '[P.hp, P.maxHp]');
  expect(hp).toBe(Math.max(1, Math.round(max * .3)));
  await A.page.waitForFunction(() => !(window as any).TessNet.players()[0].down, null, { timeout: 5000 });

  // 4. os dois caídos: todos voltam ao início da Fenda, de pé
  await ev(B.page, 'P.iframe = 0; P.hp = 1; hurtPlayer(500, P.x + 1, P.z)');
  await A.page.waitForFunction(() => (window as any).TessNet.players()[0].down, null, { timeout: 5000 });
  await ev(A.page, 'P.iframe = 0; P.dashT = 0; P.hp = 1; hurtPlayer(500, P.x + 1, P.z)');
  for (const pg of [A.page, B.page]) await pg.waitForFunction(() => (window as any).__T.ev('!(P.down > 0) && P.dieT < 0 && P.hp === P.maxHp'), null, { timeout: 20_000 });
  expect(A.errors).toEqual([]); expect(B.errors).toEqual([]);
  await A.ctx.close(); await B.ctx.close();
});

test('Fenda do grupo: o servidor sorteia o loot de cada um e o item pego é aceito na nuvem', async ({ browser }) => {
  const { A, B, ev } = await groupRift(browser);
  await waitSync(B.page);
  // elite perto dos dois; o líder derrota
  await ev(A.page, "(() => { const r = TessNet.players()[0]; const e = spawnEnemy('gosmo', (P.x + r.x) / 2, (P.z + r.z) / 2); e.spawnT = 0; makeElite(e); e.def = Object.assign({}, e.def, { dmg: 0 }); window.__el = e; })()");
  await A.page.waitForFunction(() => (window as any).__T.ev('__el.nid > 0'), null, { timeout: 5000 });
  await A.page.waitForTimeout(300);
  await ev(A.page, 'hurtEnemy(__el, 99999, 1, 0, false)');
  const loot = (pg: Page) => pg.waitForFunction(() => (window as any).__T.ev("pickups.filter(p => p.kind === 'item' && p.item.g === 1).map(p => p.item.id)").length > 0, null, { timeout: 8000 });
  await Promise.all([loot(A.page), loot(B.page)]);
  const ia = await ev(A.page, "pickups.filter(p => p.kind === 'item').map(p => [p.item.id, p.item.g || 0])");
  const ib = await ev(B.page, "pickups.filter(p => p.kind === 'item').map(p => [p.item.id, p.item.g || 0])");
  expect(ia.every((x: any) => x[1] === 1)).toBe(true);    // nenhum item sorteado no aparelho
  expect(ib.every((x: any) => x[1] === 1)).toBe(true);
  expect(ia.map((x: any) => x[0])).not.toEqual(ib.map((x: any) => x[0]));   // cada um tem o seu
  // o convidado pega o item e a nuvem aceita
  const id = ib[0][0];
  await B.page.waitForTimeout(1200);   // o item quica e só pode ser pego depois de assentar
  await B.page.waitForFunction(i => (window as any).__T.ev(`(p => { if (p) { P.x = p.x; P.z = p.z; } return G.save.inv.some(it => it.id === '${i}') || Object.values(G.save.eq).some(it => it && it.id === '${i}'); })(pickups.find(p => p.kind === 'item' && p.item.id === '${i}'))`), id, { timeout: 8000, polling: 200 });
  await ev(B.page, 'writeSave()');
  await B.page.waitForFunction(() => (window as any).TessNet.sync === 'salvo', null, { timeout: 15_000 });
  expect(await B.page.evaluate(() => (window as any).TessNet.sync)).toBe('salvo');
  expect(A.errors).toEqual([]); expect(B.errors).toEqual([]);
  await A.ctx.close(); await B.ctx.close();
});

test('Ermos do grupo: o líder abre, os dois chegam ao mesmo mapa e o golpe do amigo dá loot do servidor aos dois', async ({ browser }) => {
  const A = await onlinePlayer(browser, 'lamina'), B = await onlinePlayer(browser, 'arco');
  await A.page.evaluate(n => (window as any).TessNet.invite(n), B.name);
  await B.page.click('.net-invite button:has-text("Aceitar")');
  await A.page.waitForFunction(() => (window as any).TessNet.party?.members.length === 2, null, { timeout: 10_000 });
  const ev = (pg: Page, src: string) => pg.evaluate(s => (window as any).__T.ev(s), src);
  expect(await ev(A.page, 'netGroupWilds()')).toBe(true);
  await expect(B.page.locator('.net-ready')).toContainText('abriu os Ermos de Tessária');
  await B.page.locator('.net-ready button:has-text("Entrar")').click();
  for (const pg of [A.page, B.page]) await pg.waitForFunction(() => (window as any).__T.RG?.key === 'wilds' && (window as any).TessNet.room === 'Ermos do grupo', null, { timeout: 30_000 });
  await A.page.waitForFunction(() => (window as any).TessNet.isHost, null, { timeout: 10_000 });
  const mapa = (pg: Page) => ev(pg, 'JSON.stringify(RG.rooms.slice(0, 40).map(r => [Math.round(r.wx), Math.round(r.wz), r.kind || "", r.zone]))');
  expect(await mapa(B.page)).toBe(await mapa(A.page));
  await A.page.waitForFunction(n => (window as any).TessNet.players().some((p: any) => p.name === n), B.name, { timeout: 10_000 });
  // elite entre os dois; o amigo derruba e os dois recebem item do servidor
  // espera o líder ver o amigo perto (a posição do amigo chega depois da viagem)
  await A.page.waitForFunction(() => (window as any).__T.ev('(r => !!r && r.x !== undefined && Math.hypot(r.x - P.x, r.z - P.z) < 6)(TessNet.players()[0])'), null, { timeout: 10_000 });
  await ev(A.page, "(() => { const e = spawnEnemy('lobo', P.x + 2, P.z + 2); e.spawnT = 0; makeElite(e); e.def = Object.assign({}, e.def, { dmg: 0 }); window.__w = e; })()");
  await A.page.waitForFunction(() => (window as any).__T.ev('__w.nid > 0'), null, { timeout: 5000 });
  const nid = await ev(A.page, '__w.nid');
  await B.page.waitForFunction(id => (window as any).__T.ev(`enemies.some(e => e.proxy && e.nid === ${id})`), nid, { timeout: 5000 });
  await ev(B.page, `hurtEnemy(enemies.find(e => e.nid === ${nid}), 99999, 1, 0, false)`);
  const loot = (pg: Page) => pg.waitForFunction(() => (window as any).__T.ev("pickups.some(p => p.kind === 'item' && p.item.g === 1)"), null, { timeout: 8000 });
  await Promise.all([loot(A.page), loot(B.page)]);
  expect(A.errors).toEqual([]); expect(B.errors).toEqual([]);
  await A.ctx.close(); await B.ctx.close();
});

test('Ermos abertos: sem grupo, todos se veem; no Ermo Profundo há PvP e o espólio de quem cai fica para qualquer um', async ({ browser }) => {
  test.setTimeout(150_000);
  const A = await onlinePlayer(browser, 'lamina'), B = await onlinePlayer(browser, 'arco');
  const ev = (pg: Page, src: string) => pg.evaluate(s => (window as any).__T.ev(s), src);
  for (const pg of [A.page, B.page]) await pg.evaluate(() => (window as any).__T.travel('wilds'));
  for (const pg of [A.page, B.page]) await pg.waitForFunction(() => (window as any).__T.RG?.key === 'wilds' && (window as any).__T.ev("G.mode === 'play'") && /^Ermos #/.test((window as any).TessNet.room), null, { timeout: 60_000 });
  expect(await ev(A.page, 'TessNet.room')).toBe(await ev(B.page, 'TessNet.room'));
  // os dois no mesmo acampamento de monstros do Ermo Profundo (bioma 7)
  const go = (pg: Page, dx: number) => ev(pg, `(r => { P.hp = P.maxHp = 1e9; P.x = r.wx + ${dx}; P.z = r.wz + 1; P.warp = true; })(RG.rooms.find(r => r.zone === 7 && r.en))`);
  await go(A.page, 1); await go(B.page, 2.5);
  await A.page.waitForFunction(n => (window as any).__T.ev(`(r => !!r && r.x !== undefined && Math.hypot(r.x - P.x, r.z - P.z) < 4)(TessNet.players().find(p => p.name === ${JSON.stringify(n)}))`), B.name, { timeout: 15_000 });
  expect(await ev(A.page, 'deepAt(P.x, P.z)')).toBe(true);
  await expect(A.page.locator('#marks .tag.rp.foe .rn', { hasText: B.name })).toBeVisible();
  // golpe de A acerta B (dano de PvP reduzido)
  await ev(B.page, 'P.hp = P.maxHp = 5000; P.iframe = 0');
  await ev(A.page, 'pvpArea(P.x, P.z, 5, 400)');
  await B.page.waitForFunction(() => (window as any).__T.ev('P.hp < 5000'), null, { timeout: 8000 });
  expect(await ev(B.page, '5000 - P.hp')).toBeLessThanOrEqual(120);   // 400 × 0,3
  // B cai com Centelhas e um item na bolsa; A pega o espólio
  await ev(B.page, "G.save.gold = 777; G.save.inv = [TessItems.makeItem('weapon', 1.5, 1, 'arco')]; P.hp = 1; P.iframe = 0");
  await A.page.waitForTimeout(300);
  await ev(A.page, 'pvpCd.clear(); pvpArea(P.x, P.z, 5, 400)');
  await B.page.waitForFunction(() => (window as any).__T.ev('!!G.save.wloot && !!G.save.wloot.sid'), null, { timeout: 8000 });
  await A.page.waitForFunction(() => (window as any).TessNet.loots.size === 1, null, { timeout: 8000 });
  const gold0 = await ev(A.page, 'G.save.gold');
  await ev(A.page, '(L => { P.x = L.x; P.z = L.z; P.warp = true; })([...TessNet.loots.values()][0])');
  await A.page.waitForFunction(g => (window as any).__T.ev(`G.save.gold === ${g} + 777 && G.save.inv.length > 0`), gold0, { timeout: 8000 });
  await B.page.waitForFunction(() => (window as any).__T.ev('!G.save.wloot'), null, { timeout: 8000 });
  expect(A.errors).toEqual([]); expect(B.errors).toEqual([]);
  await A.ctx.close(); await B.ctx.close();
});

test('Fio de Elo: o amigo de nível baixo sobe para perto do líder e o grupo joga na dificuldade que os dois têm', async ({ browser }) => {
  const A = await onlinePlayer(browser, 'lamina'), B = await onlinePlayer(browser, 'arco');
  const ev = (pg: Page, src: string) => pg.evaluate(s => (window as any).__T.ev(s), src);
  // líder nível 11 no Expert (no limite de 10 níveis de diferença); o amigo fica no nível 1 (só tem o Difícil)
  await ev(A.page, 'G.save.lvl = 11; G.save.diff = 2; writeSave()');
  await waitSync(A.page); await waitSync(B.page);
  const hpAntes = await ev(B.page, 'stats().maxHp');
  await A.page.evaluate(n => (window as any).TessNet.invite(n), B.name);
  await B.page.click('.net-invite button:has-text("Aceitar")');
  await A.page.waitForFunction(() => (window as any).TessNet.party?.members.length === 2, null, { timeout: 10_000 });
  await ev(A.page, 'netGroupRift(1)');
  await B.page.locator('.net-ready button:has-text("Entrar")').click();
  for (const pg of [A.page, B.page]) await pg.waitForFunction(() => (window as any).__T.RG?.key === 'rift' && (window as any).TessNet.room, null, { timeout: 20_000 });
  expect(await ev(A.page, 'curDiff().n')).toBe('Difícil');
  expect(await ev(B.page, 'curDiff().n')).toBe('Difícil');
  expect(await ev(B.page, 'eloLvl(G.save)')).toBe(8);
  expect(await ev(B.page, 'stats().maxHp')).toBe(hpAntes + 70);   // +10 de vida por nível
  await expect(B.page.locator('#hLv')).toHaveText('1→8');
  // carregado pelo líder: o XP por abate fica limitado (3% do nível, menos com a diferença)
  expect(await ev(B.page, '(() => { const x0 = G.save.xp; gainXp(5000); return G.save.lvl === 1 && G.save.xp - x0 <= 2; })()')).toBe(true);   // selo do retrato: nível real → nível do Fio de Elo
  // de volta à vila, cada um com a própria dificuldade
  await ev(A.page, "travel('hub')");
  await A.page.waitForFunction(() => (window as any).__T.RG?.key === 'hub', null, { timeout: 20_000 });
  expect(await ev(A.page, 'curDiff().n')).toBe('Expert');
  expect(A.errors).toEqual([]); expect(B.errors).toEqual([]);
  await A.ctx.close(); await B.ctx.close();
});

test('o progresso vai para a nuvem e volta em outro aparelho', async ({ browser }) => {
  const A = await onlinePlayer(browser);
  await A.page.evaluate(() => { const s = (window as any).__T.G.save; s.lvl = 4; s.gold = 321; (window as any).__T.ev('writeSave()'); });
  await waitSync(A.page);
  const token = await A.page.evaluate(() => localStorage.getItem('tessaria-sessao'));
  await A.ctx.close();

  // "outro aparelho": navegador novo, só com a sessão (sem save local)
  const ctx = await browser.newContext({ viewport: { width: 900, height: 560 } });
  await ctx.addInitScript(t => { if (!localStorage.getItem('tessaria-sessao')) localStorage.setItem('tessaria-sessao', t as string); }, token);
  const page = await ctx.newPage();
  await page.goto('/?debug=1');
  await expect(page.locator('#mOnline')).toContainText('Continuar online', { timeout: 30_000 });
  await page.click('#mOnline');
  await page.click('.net-box button.gold');
  await page.waitForFunction(() => (window as any).__T?.P && (window as any).__T.RG.key === 'hub', null, { timeout: 30_000 });
  expect(await page.evaluate(() => [(window as any).__T.G.save.lvl, (window as any).__T.G.save.gold])).toEqual([4, 321]);
  await ctx.close();
});

test('save adulterado é recusado e o jogo oferece recarregar da nuvem', async ({ browser }) => {
  const A = await onlinePlayer(browser);
  await waitSync(A.page);
  await A.page.evaluate(() => { const s = (window as any).__T.G.save; s.gold = 999_999_999; (window as any).__T.ev('writeSave()'); });
  await expect(A.page.locator('.net-box h2')).toHaveText('Progresso recusado', { timeout: 20_000 });
  await expect(A.page.locator('.net-list')).toContainText('Centelhas');
  await A.page.click('.net-box button.gold');
  await expect(A.page.locator('.net-box')).toBeHidden({ timeout: 20_000 }).catch(() => {});
  await A.page.waitForFunction(() => (window as any).__T.G.save.gold < 1000, null, { timeout: 20_000 });
  await A.ctx.close();
});

test('correio online: envia pelo nome e o outro recebe; o item não duplica', async ({ browser }) => {
  const A = await onlinePlayer(browser), B = await onlinePlayer(browser);
  await A.page.evaluate(() => { const T = (window as any).__T; T.gamble ? null : null; T.G.save.gold = 400; T.gamble('charm'); T.ev('writeSave()'); });
  await waitSync(A.page);
  const item = await A.page.evaluate(() => (window as any).__T.G.save.inv[0]);
  await A.page.evaluate(() => (window as any).__T.openMenu('mail'));
  await A.page.click('#mlBag .slot');
  await A.page.fill('#mlTo', B.name);
  await A.page.fill('#mlNote', 'presente!');
  await A.page.click('#mlDet button.gold');
  await A.page.waitForFunction(() => (window as any).__T.G.save.inv.length === 0, null, { timeout: 15_000 });

  await B.page.evaluate(() => (window as any).__T.openMenu('mail'));
  await expect(B.page.locator('#mlInbox .shoprow')).toContainText(item.name);
  await expect(B.page.locator('#mlInbox .shoprow')).toContainText('presente!');
  await B.page.click('#mlInbox button.gold');
  await B.page.waitForFunction(id => (window as any).__T.G.save.inv.some((i: any) => i.id === id), item.id, { timeout: 15_000 });
  await waitSync(B.page);

  // A tenta "voltar no tempo" regravando o item: o servidor recusa
  await A.page.evaluate(it => { (window as any).__T.G.save.inv.push(it); (window as any).__T.ev('writeSave()'); }, item);
  await expect(A.page.locator('.net-box h2')).toHaveText('Progresso recusado', { timeout: 20_000 });
  await A.ctx.close(); await B.ctx.close();
});

test('itens gerados pelo jogo passam pelas regras do servidor', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.waitForFunction(() => (window as any).__T, null, { timeout: 30_000 });
  const items = await page.evaluate(() => (window as any).__T.ev(`(() => {
    const out = [];
    for (const cls of ['lamina', 'arcano', 'arco']) {
      G.char.cls = cls;
      for (let i = 0; i < 160; i++) {
        const it = makeItem(['weapon', 'armor', 'charm'][i % 3], 1 + (i % 9), i % 5);
        for (let r = 0; r < i % 4; r++) { try { reforge(it); } catch (e) {} }
        const up = i % 11; for (let u = 0; u < up; u++) { it.up = u + 1; for (const k in it.st) it.st[k] = Math.max(it.st[k] + 1, Math.round(it.st[k] * 1.08)); }
        out.push(it);
      }
    }
    return out;
  })()`));
  const bad = items.map((it: any) => ({ it, p: itemProblems(it, 40) })).filter((x: any) => x.p.length);
  expect(bad.slice(0, 3)).toEqual([]);
  expect(items.length).toBe(480);
});

test('um save novo do jogo passa na validação do servidor', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.waitForFunction(() => (window as any).__T, null, { timeout: 30_000 });
  const save = await page.evaluate(() => (window as any).__T.ev('(() => { G.char.name = "Lume"; return newSave(); })()'));
  expect(validateSave(save).errors).toEqual([]);
  // casa com toda a mobília do jogo e todos os estilos raros do Guarda-Roupa: o servidor precisa conhecer cada um
  const full = await page.evaluate(() => (window as any).__T.ev(`(() => { const s = newSave(); s.house = { owned: true, f: Object.fromEntries(HOUSE_F.map(f => [f.id, true])), stash: [], cap: 20, seen: [] }; s.cos = RARE_ACCS.concat(RARE_HAIR).map(a => a[0]).concat(ARMOR_STYLES.filter(a => a[2]).map(a => a[0])).concat(AURAS.filter(a => a[2]).map(a => a[0])); return s; })()`));
  expect(validateSave(full).errors).toEqual([]);
});

test('torneio de pesca: a pesca online entra no ranking da semana e aparece na aba Torneio da banca', async ({ browser }) => {
  const A = await onlinePlayer(browser, 'arco');
  const ev = (pg: Page, src: string) => pg.evaluate(s => (window as any).__T.ev(s), src);
  await ev(A.page, "TessNet.fishCatch('dourado', 8.5)");
  await A.page.waitForTimeout(800);
  await ev(A.page, "openFishery('torneio')");
  await expect(A.page.locator('#fsSub')).toContainText('1º', { timeout: 10_000 });
  await expect(A.page.locator('#fsList')).toContainText(A.name);
  await expect(A.page.locator('#fsList')).toContainText('Dourado-do-Rio');
  expect(A.errors).toEqual([]);
  await A.ctx.close();
});

test('mercado da vila e troca direta: anunciar, comprar e receber; trocar itens e Centelhas na mesma sala', async ({ browser }) => {
  test.setTimeout(150_000);
  const A = await onlinePlayer(browser, 'lamina'), B = await onlinePlayer(browser, 'arco');
  const ev = (pg: Page, src: string) => pg.evaluate(s => (window as any).__T.ev(s), src);
  await ev(A.page, "G.save.inv = [TessItems.makeItem('charm', 1.5, 2, 'lamina'), TessItems.makeItem('weapon', 1.5, 1, 'lamina')]; G.save.gold = 100; writeSave()");
  await ev(B.page, 'G.save.gold = 2000; writeSave()');
  for (const pg of [A.page, B.page]) await pg.evaluate(() => (window as any).TessNet.flushNow());
  const id0 = await ev(A.page, 'G.save.inv[0].id');
  // A anuncia pelo mercado
  await ev(A.page, 'openMarket()'); await A.page.waitForSelector('#market:not([hidden])');
  await A.page.click('#market .ftabs button[data-mt="vender"]');
  const row = A.page.locator('#mkList .shoprow').first();
  await row.locator('input').fill('500'); await row.locator('button.gold').click();
  await A.page.waitForFunction(id => (window as any).__T.ev(`!G.save.inv.some(it => it.id === '${id}')`), id0, { timeout: 10_000 });
  await A.page.click('#mkClose');
  // B compra
  await ev(B.page, 'openMarket()'); await B.page.waitForSelector('#market:not([hidden])');
  await B.page.fill('#mkQ', 'zzz-nada');   // filtro que não acha nada
  await expect(B.page.locator('#mkList')).toContainText('Nada com esses filtros');
  await B.page.fill('#mkQ', '');
  await B.page.locator('#mkList .shoprow', { hasText: A.name }).locator('button.gold').click();
  await B.page.waitForFunction(id => (window as any).__T.ev(`G.save.inv.some(it => it.id === '${id}') && G.save.gold === 1500`), id0, { timeout: 10_000 });
  await B.page.click('#mkClose');
  // A recebe a venda (5% de taxa)
  await ev(A.page, 'openMarket()'); await A.page.waitForSelector('#market:not([hidden])');
  await A.page.click('#market .ftabs button[data-mt="meus"]');
  await A.page.locator('#mkList button.gold', { hasText: 'Receber' }).click();
  await A.page.waitForFunction(() => (window as any).__T.ev('G.save.gold === 100 + 475'), null, { timeout: 10_000 });
  await A.page.click('#mkClose');
  // troca direta: A dá a espada e recebe 300 Centelhas de B
  const sword = await ev(A.page, 'G.save.inv[0].id');
  await A.page.evaluate(n => (window as any).TessNet.tradePropose(n), B.name);
  await B.page.waitForFunction(() => (window as any).__T.ev("G.mode === 'dialog'"), null, { timeout: 10_000 });
  await B.page.locator('#dialog button', { hasText: 'Aceitar' }).click();
  for (const pg of [A.page, B.page]) await pg.waitForSelector('#trade:not([hidden])', { timeout: 10_000 });
  await A.page.locator('#trMine .slot').first().click();
  await B.page.fill('#trGold', '300');
  await B.page.waitForFunction(() => (window as any).__T.ev('G.trade && G.trade.theirs.items.length === 1 && G.trade.mine.gold === 300'), null, { timeout: 10_000 });
  await A.page.waitForFunction(() => (window as any).__T.ev('G.trade && G.trade.theirs.gold === 300 && G.trade.mine.items.length === 1'), null, { timeout: 10_000 });
  await A.page.click('#trReady'); await B.page.click('#trReady');
  await A.page.waitForFunction(id => (window as any).__T.ev(`!G.trade && G.save.gold === 875 && !G.save.inv.some(it => it.id === '${id}')`), sword, { timeout: 10_000 });
  await B.page.waitForFunction(id => (window as any).__T.ev(`!G.trade && G.save.gold === 1200 && G.save.inv.some(it => it.id === '${id}')`), sword, { timeout: 10_000 });
  // histórico: a troca e a venda aparecem para A
  await ev(A.page, 'openMarket()'); await A.page.waitForSelector('#market:not([hidden])');
  await A.page.click('#market .ftabs button[data-mt="hist"]');
  await expect(A.page.locator('#mkList')).toContainText('Troca com ' + B.name, { timeout: 10_000 });
  await expect(A.page.locator('#mkList')).toContainText('Vendeu para ' + B.name);
  await A.page.click('#mkClose');
  // os saves seguem sincronizando depois da troca
  for (const pg of [A.page, B.page]) { await pg.evaluate(() => (window as any).__T.ev('writeSave()')); await pg.evaluate(() => (window as any).TessNet.flushNow()); expect(await pg.evaluate(() => (window as any).TessNet.sync)).toBe('salvo'); }
  expect(A.errors).toEqual([]); expect(B.errors).toEqual([]);
  await A.ctx.close(); await B.ctx.close();
});

test('Passe do Tear: entrada do dia, missão cumprida jogando vira XP do passe, premium e loja com Fios Dourados, cosmético no guarda-roupa e visto pelos outros', async ({ browser }) => {
  test.setTimeout(150_000);
  const A = await onlinePlayer(browser, 'lamina'), B = await onlinePlayer(browser, 'arco');
  const ev = (pg: Page, src: string) => pg.evaluate(s => (window as any).__T.ev(s), src);
  await A.page.evaluate(() => (window as any).TessNet.flushNow());
  const g0 = await ev(A.page, 'G.save.gold');
  await A.page.keyboard.press('p');
  await A.page.waitForSelector('#season:not([hidden])');
  await expect(A.page.locator('#seHead')).toContainText('Passe nível 0', { timeout: 10_000 });
  // entrada do dia (300 Centelhas)
  await A.page.click('#season .ftabs button[data-st="entrada"]');
  await A.page.locator('#seList button.gold', { hasText: 'Receber' }).click();
  await A.page.waitForFunction(g => (window as any).__T.ev(`G.save.gold === ${g} + 300`), g0, { timeout: 10_000 });
  // uma missão de hoje cumprida "jogando" (eventos do jogo) e resgatada
  const m = await ev(A.page, 'TS.dailyMissions(Date.now())[0]');
  await ev(A.page, `for (let i = 0; i < ${m.n}; i++) missionEvent('${m.kind}')`);
  await A.page.click('#season .ftabs button[data-st="missoes"]');
  await A.page.locator('#seList .shoprow', { hasText: m.t }).locator('button.gold').click();
  await A.page.waitForFunction(xp => (window as any).__T.ev(`SEAS.me.xp === ${xp}`), m.xp, { timeout: 10_000 });
  // Fios Dourados (modo de desenvolvimento), premium e um cosmético da vitrine
  await A.page.click('#season .ftabs button[data-st="loja"]');
  await A.page.locator('#seList .shoprow', { hasText: '1100 Fios Dourados' }).locator('button').click();
  await A.page.waitForFunction(() => (window as any).__T.ev('SEAS.me.dourados === 1100'), null, { timeout: 10_000 });
  await A.page.click('#season .ftabs button[data-st="passe"]');
  await A.page.locator('#seList button.gold', { hasText: '950 Fios Dourados' }).click();
  await A.page.waitForFunction(() => (window as any).__T.ev('SEAS.me.premium === true && SEAS.me.dourados === 150'), null, { timeout: 10_000 });
  await A.page.click('#season .ftabs button[data-st="loja"]');
  // prévia: o herói no pedestal com o cosmético em loop, e volta para a loja
  await A.page.locator('#seList button', { hasText: 'Prévia' }).first().click();
  await expect(A.page.locator('#sePrev')).toBeVisible();
  expect(await ev(A.page, '!!G.cosPreview && SEAS.shop.includes(G.cosPreview)')).toBe(true);
  await A.page.click('#sePrevBack');
  expect(await ev(A.page, 'G.cosPreview')).toBe(null);
  await A.page.locator('#seList .shoprow', { hasText: '500 Fios Dourados' }).first().locator('button').click();
  await A.page.waitForFunction(() => (window as any).__T.ev('SEAS.me.dourados === 650'), null, { timeout: 10_000 });
  const item = await ev(A.page, 'SEAS.shop[0]');
  {
    await A.page.locator('#seList .shoprow', { hasText: await ev(A.page, `TS.cosById('${item}').n`) }).locator('button.gold').click();
    await A.page.waitForFunction(id => (window as any).__T.ev(`SEAS.me.owned.includes('${id}')`), item, { timeout: 10_000 });
    // veste e o outro jogador vê
    const key = await ev(A.page, `TS.COS_FIELD[TS.cosById('${item}').slot]`);
    await ev(A.page, `G.char.${key} = '${item}'; netLook(); writeSave()`);
    await B.page.waitForFunction(([n, k, id]) => (window as any).TessNet.players().some((p: any) => p.name === n && p.look[k] === id), [A.name, key, item] as const, { timeout: 10_000 });
    await A.page.evaluate(() => (window as any).TessNet.flushNow());
    expect(await A.page.evaluate(() => (window as any).TessNet.sync)).toBe('salvo');   // o servidor aceitou: a conta tem o cosmético
  }
  expect(A.errors).toEqual([]); expect(B.errors).toEqual([]);
  await A.ctx.close(); await B.ctx.close();
});

test('conta: reportar problema pelo menu, baixar os dados e excluir a conta (convidado)', async ({ browser }) => {
  const A = await onlinePlayer(browser);
  const { page } = A;
  // reportar pelo menu (Esc)
  await page.keyboard.press('Escape');
  await page.click('#pReport');
  await page.selectOption('#netRepKind', 'bug');
  await page.fill('#netRepText', 'Teste automático do reporte');
  await page.click('.net-form button.gold');
  await expect(page.locator('.net-modal')).toBeHidden();
  // baixar os dados
  await page.evaluate(() => (window as any).__T.ev('closeMenus()'));
  const data = await page.evaluate(async () => (await (window as any).TessNet.exportData()).data);
  expect(data.conta.nome).toBe(A.name);
  // excluir: abre o painel de conta pelo título
  await page.evaluate(() => (window as any).__T.ev('toTitle()'));
  await page.click('#mOnline');
  await page.click('.net-box button.danger');
  await page.fill('#netDel', 'nome errado');
  await page.click('.net-form button.danger');
  await expect(page.locator('#netMsg')).toContainText('Digite o nome');
  await page.fill('#netDel', A.name);
  await page.click('.net-form button.danger');
  await expect(page.locator('.net-modal')).toBeHidden();
  expect(await page.evaluate(() => (window as any).TessNet.account)).toBeNull();
  await expect(page.locator('#mOnline')).toHaveText('Jogar online');
  expect(A.errors.filter(e => !/status of 400/.test(e))).toEqual([]);   // o 400 é o nome errado, de propósito
  await A.ctx.close();
});

test('chat em todo lugar: na taverna o chat continua, com o rótulo do lugar, e só quem está lá dentro ouve', async ({ browser }) => {
  const A = await onlinePlayer(browser), B = await onlinePlayer(browser), C = await onlinePlayer(browser);
  for (const P of [A, B]) {
    await P.page.evaluate(() => (window as any).__T.travel('taverna'));
    await P.page.waitForFunction(() => (window as any).__T.RG.key === 'taverna' && (window as any).TessGame.mode === 'play', null, { timeout: 20_000 });
  }
  await expect(A.page.locator('.net-chat')).toBeVisible();
  await A.page.waitForTimeout(400);
  await A.page.keyboard.press('Enter');
  await expect(A.page.locator('.net-input')).toHaveAttribute('placeholder', /Taverna da Mel/);
  await A.page.keyboard.type('Uma rodada pra todos!');
  await A.page.keyboard.press('Enter');
  await expect(B.page.locator('.net-log')).toContainText('Taverna da Mel' + A.name + ': Uma rodada pra todos!');
  await C.page.waitForTimeout(500);
  await expect(C.page.locator('.net-log')).not.toContainText('Uma rodada pra todos!');
  for (const P of [A, B, C]) { expect(P.errors).toEqual([]); await P.ctx.close(); }
});
