import { test, expect } from '@playwright/test';
import { newGame, T, travel, unlock, skipDialogs } from './helpers.js';

test('Ato II: Ysolde libera o Pântano e a Hidra entrega o Fio de Água', async ({ page }) => {
  const errors = await newGame(page);
  await unlock(page, { bosses: ['forest', 'crypt', 'peaks'], ended: true, lvl: 14 });
  await travel(page, 'hub');
  expect(await T(page, () => __T.inter.find(i => i.to === 'swamp').lit)).toBe(false);
  await T(page, () => { __T.P.x = 38.5; __T.P.z = 32; });
  await page.waitForTimeout(300);
  await T(page, () => __T.interact());
  await skipDialogs(page);
  expect(await T(page, () => __T.G.save.met.act2y)).toBe(true);

  await travel(page, 'swamp');
  await T(page, () => { __T.P.hp = __T.P.maxHp = 1e6; const R = __T.RG.rooms.find(r => r.kind === 'boss'); __T.P.x = R.wx; __T.P.z = R.wz + 7; });
  await page.waitForFunction(() => __T.boss || __T.G.mode === 'dialog', null, { timeout: 20_000 });
  await skipDialogs(page);
  await page.waitForFunction(() => __T.boss && __T.boss.spawnT <= 0, null, { timeout: 20_000 });
  expect(await T(page, () => __T.boss.type)).toBe('hydra');
  await page.waitForTimeout(4000);
  await T(page, () => { const b = __T.boss; b.invuln = 0; b.blinkDis = 0; __T.hurtBoss(b, 1e9, false, [b.x, b.z, 1]); });
  await page.waitForFunction(() => __T.G.mode === 'dialog', null, { timeout: 60_000 });
  await skipDialogs(page);
  expect(await T(page, () => __T.G.save.bosses.swamp)).toBe(true);
  expect(await T(page, () => __T.inter.some(i => i.kind === 'altar'))).toBe(true);
  expect(errors).toEqual([]);
});

test('missão A Maçã do Vovô termina com a Maçã de Âmbar', async ({ page }) => {
  await newGame(page);
  await unlock(page, { bosses: ['forest', 'crypt', 'peaks'], ended: true, met: { act2y: true, t_brann: true } });
  await T(page, () => { __T.P.x = 22.5; __T.P.z = 51.5; });
  await page.waitForTimeout(300);
  await T(page, () => __T.interact());
  await skipDialogs(page, 'Eu levo');
  await T(page, () => { __T.P.x = 25; __T.P.z = 50.2; });
  await page.waitForTimeout(300);
  expect(await T(page, () => __T.nearInter && __T.nearInter.kind)).toBe('appletree');
  await T(page, () => __T.interact());
  await skipDialogs(page);
  await T(page, () => { __T.P.x = 22.5; __T.P.z = 51.5; });
  await page.waitForTimeout(300);
  await T(page, () => __T.interact());
  await skipDialogs(page);
  const charm = await T(page, () => { const s = __T.G.save; return [s.eq.charm, ...s.inv].filter(Boolean).find(i => i.name === 'Maçã de Âmbar'); });
  expect(charm && charm.rar).toBe(4);
});
