import { test, expect } from '@playwright/test';
import { newGame, T, travel, unlock, skipDialogs } from './helpers.js';

// Regressão do bug "dash/empurrão joga para fora do mapa".
// Calcula a área alcançável a pé a partir da entrada e confere, depois de
// muitos dashes e empurrões exagerados, que o herói nunca sai dela.
// Tela pequena: o tamanho não importa aqui e o WebGL emulado fica bem mais rápido.
test.use({ viewport: { width: 400, height: 260 } });
for (const key of ['forest', 'crypt', 'peaks']) {
  test(`herói não atravessa paredes em ${key}`, async ({ page }) => {
    await newGame(page);
    await unlock(page, { bosses: ['forest', 'crypt'] });
    await travel(page, key);
    await T(page, () => {
      __T.P.hp = __T.P.maxHp = 1e6;
      const RG = __T.RG, free = (x, y) => x >= 0 && y >= 0 && x < RG.W && y < RG.H && (RG.grid[y][x] === '.' || RG.grid[y][x] === ',') && !RG.block.has(x + ',' + y);
      const s0 = Math.floor(__T.P.x / 2) + ',' + Math.floor(__T.P.z / 2), seen = new Set([s0]), q = [s0.split(',').map(Number)];
      while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + dx) + ',' + (y + dy); if (!seen.has(k) && free(x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); } } }
      window.__REACH = seen;
    });
    let escapes = 0;
    const dirs = [['KeyW', 'KeyA'], ['KeyS', 'KeyD'], ['KeyW', 'KeyD'], ['KeyS', 'KeyA'], ['KeyW'], ['KeyA'], ['KeyS'], ['KeyD']];
    for (let room = 0; room < 3; room++) {
      await T(page, i => { const R = __T.RG.rooms[i]; if (window.__REACH.has(Math.floor(R.wx / 2) + ',' + Math.floor(R.wz / 2))) { __T.P.x = R.wx; __T.P.z = R.wz; } for (const e of __T.enemies) { e.hp = 0; e.dieT = 0; } }, room * 3);
      for (let i = 0; i < 24; i++) {
        const ks = dirs[(i * 5 + room) % 8];
        for (const k of ks) await page.keyboard.down(k);
        await page.keyboard.press('Space');
        if (i % 2 === 0) await T(page, () => { const a = Math.random() * 6.28; __T.P.kx = Math.cos(a) * 90; __T.P.kz = Math.sin(a) * 90; });
        await page.waitForTimeout(80);
        for (const k of ks) await page.keyboard.up(k);
        await skipDialogs(page);
        if (!(await T(page, () => window.__REACH.has(Math.floor(__T.P.x / 2) + ',' + Math.floor(__T.P.z / 2))))) escapes++;
      }
    }
    expect(escapes).toBe(0);
  });
}
