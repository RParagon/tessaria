import { test, expect } from '@playwright/test';
import { newGame, T, travel, unlock } from './helpers.js';

test('abre o título, cria personagem e chega à vila sem erros', async ({ page }) => {
  const errors = await newGame(page, { cls: 'arco' });
  await page.waitForTimeout(1500);
  expect(await T(page, () => __T.G.char.cls)).toBe('arco');
  expect(await T(page, () => __T.P.hp > 0)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause .ver')).toHaveText(/^\d+\.\d+\.\d+$/);
  expect(errors).toEqual([]);
});

test('todas as regiões carregam e desenham sem erro', async ({ page }) => {
  const errors = await newGame(page);
  await unlock(page, { bosses: ['forest', 'crypt', 'peaks', 'swamp'], ended: true, met: { act2y: true, act2y2: true } });
  for (const key of ['forest', 'crypt', 'peaks', 'swamp', 'glass', 'wilds']) {
    await travel(page, key);
    await page.waitForTimeout(600);
    expect(await T(page, () => __T.RG.rooms.length)).toBeGreaterThan(0);
  }
  await T(page, () => { __T.G.riftRoll = { base: 'forest', boss: 'spider', aff: ['dourada'] }; __T.startRift(2); });
  await page.waitForFunction(() => __T.RG.key === 'rift' && !__T.G.traveling, null, { timeout: 60_000 });
  expect(errors).toEqual([]);
});

test('a Fenda gera um mapa diferente a cada abertura', async ({ page }) => {
  await newGame(page);
  await unlock(page, { bosses: ['forest'] });
  const layouts = [];
  for (let i = 0; i < 2; i++) {
    await T(page, () => { __T.G.riftRoll = { base: 'forest', boss: 'spider', aff: ['dourada'] }; __T.startRift(1); });
    await page.waitForFunction(() => __T.RG.key === 'rift' && !__T.G.traveling, null, { timeout: 60_000 });
    layouts.push(await T(page, () => __T.RG.rooms.map(r => Math.round(r.x) + ',' + Math.round(r.y)).join(' ')));
    await travel(page, 'hub');
  }
  expect(layouts[0]).not.toEqual(layouts[1]);
});
