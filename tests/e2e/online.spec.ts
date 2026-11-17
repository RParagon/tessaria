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

  // B sai da vila: continua no grupo, aparece no Bosque, e o chat dele vai para o grupo
  await B.page.evaluate(() => { const T = (window as any).__T; T.G.save.met.ysolde = true; T.travel('forest'); });
  await expect(A.page.locator('.net-party .net-pm', { hasText: B.name })).toContainText('Bosque Sussurrante', { timeout: 20_000 });
  await B.page.waitForFunction(() => (window as any).__T.RG.key === 'forest' && (window as any).TessGame.mode === 'play', null, { timeout: 20_000 });
  await B.page.keyboard.press('Enter');
  await B.page.keyboard.type('Vem pro bosque!');
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
});
