import { test, expect } from '@playwright/test';
import { newGame, T, travel, unlock } from './helpers.js';

test('casa: comprar, mobiliar, guardar no baú e bônus aplicados', async ({ page }) => {
  const errors = await newGame(page);
  await unlock(page, { bosses: ['forest', 'crypt', 'peaks'], gold: 60_000 });
  await T(page, () => { __T.P.x = 68.4; __T.P.z = 47.8; });
  await page.waitForTimeout(400);
  expect(await T(page, () => __T.nearInter && __T.nearInter.kind)).toBe('house');
  await T(page, () => __T.interact());
  await page.click('#hmList button.gold');
  expect(await T(page, () => __T.H().owned)).toBe(true);

  await T(page, () => __T.interact());
  await page.waitForFunction(() => !__T.G.traveling && __T.RG.key === 'home', null, { timeout: 30_000 });
  await T(page, () => { __T.P.x = 12.6; __T.P.z = 9; });
  await page.waitForTimeout(300);
  await T(page, () => __T.interact());
  for (let i = 0; i < 12; i++) { const b = await page.$('#hmList button.gold'); if (!b) break; await b.click(); await page.waitForTimeout(200); }
  const f = await T(page, () => __T.H().f);
  expect(Object.keys(f).length).toBe(9);
  const st = await T(page, () => { const s = __T.stats(); return { gold: s.gold, find: s.itemFind, pots: s.maxPot }; });
  expect(st.gold).toBeCloseTo(1.05, 2);
  expect(st.find).toBeCloseTo(1.1, 2);
  expect(st.pots).toBe(4);

  await page.keyboard.press('Escape');
  await T(page, () => { for (let i = 0; i < 3; i++) __T.gamble('charm'); });
  await T(page, () => { __T.P.x = 8.6; __T.P.z = 9.2; });
  await page.waitForTimeout(300);
  await T(page, () => __T.interact());
  await page.click('#stAll');
  expect(await T(page, () => __T.H().stash.length)).toBe(3);
  expect(await T(page, () => __T.G.save.inv.length)).toBe(0);
  expect(errors).toEqual([]);
});

test('aprimorar chega a +10 sem quebrar o item', async ({ page }) => {
  await newGame(page);
  await unlock(page, { bosses: ['forest'], gold: 1e7 });
  const r = await T(page, () => {
    __T.gamble('weapon'); const s = __T.G.save; s.eq.weapon = s.inv.shift();
    const it = s.eq.weapon, before = { ...it.st }; let tries = 0;
    while ((it.up || 0) < 10 && tries < 400) { __T.upgradeItem(it); tries++; }
    return { up: it.up, tries, grew: Object.keys(before).every(k => it.st[k] > before[k]), name: it.name };
  });
  expect(r.up).toBe(10);
  expect(r.grew).toBe(true);
  expect(r.name).toMatch(/\+10$/);
});

test('correio: código viaja entre jogadores, não reabre e rejeita adulteração', async ({ page, browser }) => {
  await newGame(page, { cls: 'lamina', name: 'Remetente' });
  await unlock(page, { bosses: ['forest'], gold: 5000 });
  const code = await T(page, () => { __T.gamble('weapon'); const it = __T.G.save.inv[0]; return __T.itemCode(it); });
  expect(code).toMatch(/^TEAR-[A-Za-z0-9+/=]+-[0-9A-Z]{4}$/);
  expect(await T(page, c => __T.readCode(c.slice(0, -2) + 'ZZ'), code)).toBeNull();

  const page2 = await browser.newPage();
  await newGame(page2, { cls: 'arco', name: 'Amigo' });
  const got = await page2.evaluate(c => { const it = __T.readCode(c); return it && { cls: it.cls, slot: it.slot }; }, code);
  expect(got).toEqual({ cls: 'arco', slot: 'weapon' });
  await page2.close();
});

test('guarda-roupa: móvel da casa troca o visual e vende estilos raros uma vez só', async ({ page }) => {
  const errors = await newGame(page);
  await T(page, () => { const s = __T.G.save; s.gold = 5000; __T.H().owned = true; __T.H().f.guarda = true; });
  await travel(page, 'home');
  await T(page, () => { __T.P.x = 24.2; __T.P.z = 8.6; });
  await page.waitForTimeout(300);
  expect(await T(page, () => __T.nearInter && __T.nearInter.kind)).toBe('wardrobe');
  await T(page, () => __T.interact());
  await expect(page.locator('#cTitle')).toHaveText('Guarda-Roupa');
  await expect(page.locator('#cClsF')).toBeHidden();
  // cancelar desfaz a troca
  await page.locator('#cBeard button', { hasText: 'Barba' }).click();
  await page.click('#cBack');
  expect(await T(page, () => [__T.G.mode, __T.G.char.beard])).toEqual(['play', 'nenhuma']);
  // estilo raro: compra, veste e fica no save
  await T(page, () => __T.interact());
  const spent0 = await T(page, () => __T.G.save.spent || 0);   // conta pelo total gasto (um feito pode dar Centelhas no meio)
  await page.locator('#cAcc button', { hasText: 'Cartola' }).click();
  expect(await T(page, () => __T.G.save.spent)).toBe(spent0 + 2000);
  await page.locator('#cAcc button', { hasText: 'Nenhum' }).click();
  await page.locator('#cAcc button', { hasText: 'Cartola' }).click();   // já comprada: não cobra de novo
  expect(await T(page, () => __T.G.save.spent)).toBe(spent0 + 2000);
  await page.locator('#cArmor button', { hasText: 'Couro' }).click();   // estilo de armadura grátis
  await page.click('#cGo');
  expect(await T(page, () => [__T.G.mode, __T.G.save.char.acc, __T.G.save.cos, __T.G.save.char.armorStyle])).toEqual(['play', 'cartola', ['cartola'], 'couro']);
  expect(errors).toEqual([]);
});

test('banco e espólio: o cofre guarda Centelhas, morrer nos Ermos deixa o resto no chão e dá para recuperar; bolsa maior', async ({ page }) => {
  const errors = await newGame(page);
  const ev = src => page.evaluate(s => window.__T.ev(s), src);
  await ev('G.save.gold = 5000; P.x = HUB.bank.x; P.z = HUB.bank.z + 5.4');
  await page.waitForFunction(() => window.__T.nearInter?.kind === 'bank', null, { timeout: 5000 });
  await page.keyboard.press('e');
  await page.getByRole('button', { name: 'Guardar 1000', exact: true }).click();
  expect(await ev('[G.save.gold, G.save.bank]')).toEqual([4000, 1000]);
  await page.click('#bkClose');
  // Otto vende +5 espaços na bolsa
  await ev('G.save.gold = 6000; buyMap; openMenu("shop")');
  await page.locator('#sList .shoprow', { hasText: 'Bolsa maior' }).locator('button').click();
  expect(await ev('BAG()')).toBe(25);
  await page.keyboard.press('Escape');
  // Ermos: morrer derruba o que você carrega; o banco fica
  await ev("G.save.gold = 700; G.save.inv.push(makeItem('armor', 1, 2))");
  await travel(page, 'wilds');
  await ev('P.x += 9; P.z += 4; playerDie()');   // longe do ponto onde renasce
  expect(await ev('[G.save.gold, G.save.inv.length, G.save.wloot.gold, G.save.wloot.items.length, G.save.bank]')).toEqual([0, 0, 700, 1, 1000]);
  await page.waitForFunction(() => window.__T.ev('P.dieT < 0 && !G.respawning'), null, { timeout: 20_000 });
  await ev('P.x = G.save.wloot.x; P.z = G.save.wloot.z');
  await page.waitForFunction(() => window.__T.ev('!G.save.wloot'), null, { timeout: 5000 });
  expect(await ev('[G.save.gold, G.save.inv.length]')).toEqual([700, 1]);
  expect(errors).toEqual([]);
});

test('itens: teto de raridade pela área, nível exigido para equipar e vender tudo no Otto', async ({ page }) => {
  const errors = await newGame(page);
  const ev = src => page.evaluate(s => window.__T.ev(s), src);
  // Campina (nível de item ~1,3): no máximo Raro, mesmo pedindo Lendário
  expect(await ev('[TI.rarCap(1.3), TI.rarCap(2.5), TI.rarCap(3.2), TI.rarCap(1.3, 1)]')).toEqual([2, 3, 4, 3]);
  await ev("pickups.length = 0; dropItem(P.x + 1, P.z, 4)");
  expect(await ev("pickups.find(p => p.kind === 'item').item.rar")).toBeLessThanOrEqual(2);
  // item de área funda pede nível
  await ev("G.save.inv.push(makeItem('armor', 5, 2)); openMenu('inv')");
  expect(await ev('TI.reqLvl(G.save.inv[G.save.inv.length - 1])')).toBeGreaterThan(15);
  await page.keyboard.press('Escape');
  // vender tudo (dois toques), lendário fica
  await ev("G.save.inv.push(makeItem('weapon', 3, 1), makeItem('charm', 3, 4)); openMenu('shop')");
  const n = await ev('G.save.inv.length'), g0 = await ev('G.save.gold');
  await page.locator('#sBag button', { hasText: 'Vender tudo' }).click();
  await page.locator('#sBag button', { hasText: 'Confirmar' }).click();
  expect(await ev('G.save.inv.map(i => i.rar)')).toEqual([4]);
  expect(await ev('G.save.gold')).toBeGreaterThan(g0);
  expect(n).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});

test('Tear do Destino e aura: tecer ao acaso gasta Fios e entrega o item depois da animação; a aura sai no visual', async ({ page }) => {
  const errors = await newGame(page);
  const ev = src => page.evaluate(s => window.__T.ev(s), src);
  await ev("G.save.fios = 20; G.save.bosses.forest = true; openMenu('riftm')");
  const n0 = await ev('G.save.inv.length + Object.values(G.save.eq).filter(Boolean).length');
  await page.locator('#rShop button', { hasText: 'Tecer ao acaso' }).click();
  expect(await ev('[G.save.fios, !!G.weave]')).toEqual([12, true]);
  await page.waitForFunction(() => window.__T.ev('!G.weave'), null, { timeout: 15_000 });
  expect(await ev('G.save.inv.length + Object.values(G.save.eq).filter(Boolean).length')).toBe(n0 + 1);
  await ev("G.char.aura = 'brasas'");
  expect(await ev('lookOfPlayer().aura')).toBe('brasas');
  expect(errors).toEqual([]);
});
