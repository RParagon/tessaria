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
  await page.click('#cGo');
  expect(await T(page, () => [__T.G.mode, __T.G.save.char.acc, __T.G.save.cos])).toEqual(['play', 'cartola', ['cartola']]);
  expect(errors).toEqual([]);
});
