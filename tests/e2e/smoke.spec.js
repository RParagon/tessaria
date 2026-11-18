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

test('Ermos 2.0: mapa grande com 8 biomas, obelisco, covil com volta na boca e emboscada', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await newGame(page);
  const ev = src => page.evaluate(s => window.__T.ev(s), src);
  await page.evaluate(() => window.__T.travel('wilds'));
  await page.waitForFunction(() => window.__T.RG.key === 'wilds' && window.__T.ev("G.mode === 'play'"), null, { timeout: 60_000 });
  const info = await ev("({ W: RG.W, H: RG.H, biomas: [...new Set(RG.rooms.filter(r => r.zone !== undefined).map(r => r.zone))].length, obel: RG.rooms.filter(r => r.kind === 'obelisk').length, cav: RG.rooms.filter(r => r.kind === 'cave').length, covis: RG.rooms.filter(r => r.lair).length })");
  expect(info).toEqual({ W: 300, H: 260, biomas: 8, obel: 8, cav: 7, covis: 8 });
  await ev('P.hp = P.maxHp = 1e9');

  // o Brejo (bioma 3) não pode dar o feito do Ermo Profundo
  await ev("(r => { P.x = r.wx + 3; P.z = r.wz + 3; })(RG.rooms.find(r => r.zone === 3 && r.ring === 1 && r.en))");
  await page.waitForTimeout(1500);
  expect(await ev('G.save.wz || 0')).toBeLessThan(3);

  // obelisco da Campina: desperta e leva ao portão da vila
  await ev("(r => { P.x = r.wx + 1; P.z = r.wz + 1; })(RG.rooms.find(r => r.kind === 'obelisk' && r.ob === 0))");
  await page.waitForFunction(() => window.__T.nearInter?.kind === 'obelisk', null, { timeout: 5000 });
  await page.keyboard.press('e');
  await expect(page.locator('#dialog')).toBeVisible();
  expect(await ev('G.save.obel')).toEqual([0]);
  await page.locator('#dialog button', { hasText: 'Portão da Vila Brasa' }).click();
  await page.waitForFunction(() => window.__T.ev('Math.hypot(P.x - RG.start.wx, P.z - RG.start.wz) < 3'), null, { timeout: 5000 });

  // covil: entra numa caverna fixa e o portal de saída devolve na boca dela
  const boca = await ev("(r => { P.x = r.wx + 1; P.z = r.wz + 1; return [r.wx, r.wz]; })(RG.rooms.find(r => r.kind === 'cave'))");
  await page.waitForFunction(() => window.__T.nearInter?.kind === 'cave', null, { timeout: 5000 });
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__T.RG.key === 'rift' && window.__T.ev("G.mode === 'play' && !!G.rift.cave"), null, { timeout: 30_000 });
  expect(await ev("inter.find(i => i.kind === 'portal').to")).toBe('wilds');
  await ev("(p => { P.x = p.x; P.z = p.z + 1; })(inter.find(i => i.kind === 'portal'))");
  await page.waitForFunction(() => window.__T.nearInter?.kind === 'portal', null, { timeout: 5000 });
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__T.RG.key === 'wilds' && window.__T.ev("G.mode === 'play'"), null, { timeout: 30_000 });
  const [px, pz] = await ev('[P.x, P.z]');
  expect(Math.hypot(px - boca[0], pz - boca[1])).toBeLessThan(4);

  // emboscada fora da Campina
  await ev("(r => { P.x = r.wx + 6; P.z = r.wz + 6; enemies.forEach(e => e.dieT = 0); G.ambCD = 0; G.wT = 0; })(RG.rooms.find(r => r.ring === 1 && r.en))");
  await page.waitForFunction(() => window.__T.ev('!!G.amb && G.amb.list.length >= 4'), null, { timeout: 5000 });
  expect(errors).toEqual([]);
});

test('Vila 2.0: Bairro Leste com Bardo, bonecos de treino, fogueira com bancos e pesca', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await newGame(page);
  const ev = src => page.evaluate(s => window.__T.ev(s), src);
  expect(await ev('[RG.W, npcs.some(n => n.id === "bardo"), enemies.filter(e => e.dummy).length, inter.filter(i => i.kind === "bench").length, inter.some(i => i.kind === "fish")]')).toEqual([76, true, 3, 4, true]);
  // boneco: registra o dano, mostra o DPS e não cai
  for (let i = 0; i < 40; i++) await ev("hurtEnemy(enemies.find(e => e.dummy), 200, 0, 1, false)");
  expect(await ev('(e => e.dieT < 0 && e.hp > 0 && e.log.length === 40)(enemies.find(e => e.dummy))')).toBe(true);
  // pesca: lança, o peixe morde, puxa na hora
  await ev('P.x = HUB.fish[0] + 1.4; P.z = HUB.fish[1]');
  await page.waitForFunction(() => window.__T.nearInter?.kind === 'fish', null, { timeout: 5000 });
  const ouro = await ev('G.save.gold');
  await page.keyboard.press('e');
  await ev('G.fishing.biteAt = .05');
  await page.waitForFunction(() => window.__T.ev('!!(G.fishing && G.fishing.bite)'), null, { timeout: 5000 });
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__T.ev('(G.save.st && G.save.st.fish) === 1'), null, { timeout: 3000 });
  expect(await ev('G.save.gold')).toBeGreaterThan(ouro);
  // banco perto da fogueira: senta e a vida volta
  await ev('P.hp = 5; sitBench(inter.find(i => i.kind === "bench"))');
  await page.waitForFunction(() => window.__T.ev('P.hp > 6'), null, { timeout: 5000 });
  expect(await ev('P.emote')).toBe('sentar');
  // o Bardo conta um rumor
  await ev('(n => { P.x = n.x + 1; P.z = n.z + 1; P.emote = null; })(npcs.find(n => n.id === "bardo"))');
  await page.waitForFunction(() => window.__T.nearInter?.kind === 'npc' && window.__T.nearInter.npc.id === 'bardo', null, { timeout: 5000 });
  await page.keyboard.press('e');
  await expect(page.locator('#dialog')).toContainText('Bardo Tomé');
  expect(errors).toEqual([]);
});

test('controles do PC: botão direito usa a habilidade, Shift esquiva, a barra mostra o mouse e H esconde os controles', async ({ page }) => {
  await newGame(page);
  const ev = src => page.evaluate(s => window.__T.ev(s), src);
  await page.mouse.move(500, 300);
  await page.mouse.down({ button: 'right' }); await page.mouse.up({ button: 'right' });
  await page.waitForFunction(() => window.__T.P.skillCd > 0, null, { timeout: 3000 });
  await ev('P.dashCd = 0');
  await page.keyboard.press('ShiftRight');
  await page.waitForFunction(() => window.__T.P.dashCd > 0, null, { timeout: 3000 });
  await expect(page.locator('#abSkill kbd .ms.r')).toHaveCount(1);
  await expect(page.locator('#abAtk kbd .ms.l')).toHaveCount(1);
  expect(await page.locator('#abSkill').getAttribute('data-tip')).toContain('Botão direito');
  await page.keyboard.press('h');
  await expect(page.locator('#keys')).toHaveClass(/faded/);
  await page.keyboard.press('h');
  await expect(page.locator('#keys')).not.toHaveClass(/faded/);
});
