import { test, expect } from '@playwright/test';
import { newGame, T, travel, unlock, skipDialogs } from './helpers.js';

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
  expect(info).toEqual({ W: 300, H: 260, biomas: 8, obel: 7, cav: 7, covis: 8 });   // o Ermo Profundo não tem obelisco (nem acampamento)
  await ev('P.hp = P.maxHp = 1e9');

  // o Brejo (bioma 3) não pode dar o feito do Ermo Profundo
  await ev("(r => { P.x = r.wx + 3; P.z = r.wz + 3; })(RG.rooms.find(r => r.zone === 3 && r.ring === 1 && r.en))");
  await page.waitForTimeout(1500);
  expect(await ev('G.save.wz || 0')).toBeLessThan(3);

  // obelisco da Campina: desperta e leva ao portão da vila
  await ev("(r => { P.x = r.wx + 1; P.z = r.wz + 1; })(RG.rooms.find(r => r.kind === 'obelisk' && r.ob === 0))");
  await page.waitForFunction(() => window.__T.nearInter?.kind === 'obelisk', null, { timeout: 5000 });
  // acampamento: zona segura (sem dano) e mercador suspeito com estoque da hora
  expect(await ev('[inCamp(P.x, P.z), hurtPlayer(50, P.x + 1, P.z)]')).toEqual([true, false]);
  await ev("(n => { P.x = n.x - 1; P.z = n.z + .5; })(npcs.find(n => n.merc === 0))");
  await page.waitForFunction(() => window.__T.nearInter?.kind === 'npc' && window.__T.nearInter.npc.merc === 0, null, { timeout: 5000 });
  await page.keyboard.press('e');
  await expect(page.locator('#wshop')).toBeVisible();
  await expect(page.locator('#wsList .shoprow')).toHaveCount(6);
  await page.click('#wsClose');
  // obelisco: desperta e abre o mapa de viagem; o portão da vila fica na lista
  await ev("(r => { P.x = r.wx + 1; P.z = r.wz + 1; })(RG.rooms.find(r => r.kind === 'obelisk' && r.ob === 0))");
  await page.waitForFunction(() => window.__T.nearInter?.kind === 'obelisk', null, { timeout: 5000 });
  await page.keyboard.press('e');
  await expect(page.locator('#wmap')).toBeVisible();
  expect(await ev('G.save.obel')).toEqual([0]);
  await page.locator('#wmList button', { hasText: 'Portão da Vila Brasa' }).click();
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
  // pesca: sem vara não dá; a missão do Pescador Ivo (minhocas-de-brasa) entrega a vara
  await ev('P.x = HUB.fish[0] + 1.4; P.z = HUB.fish[1]');
  await page.waitForFunction(() => window.__T.nearInter?.kind === 'fish', null, { timeout: 5000 });
  await page.keyboard.press('e');
  expect(await ev('!!G.fishing')).toBe(false);
  await ev('(n => { P.x = n.x - 1; P.z = n.z; })(npcs.find(n => n.id === "ivo"))');
  await page.waitForFunction(() => window.__T.nearInter?.kind === 'npc' && window.__T.nearInter.npc.id === 'ivo', null, { timeout: 5000 });
  await page.keyboard.press('e');
  await skipDialogs(page, 'Vou procurar');
  expect(await ev('G.save.q.vara.st')).toBe('active');
  let i = 0;
  for (const [wx, wz] of await ev('WORMS')) { i++; await ev(`P.x = ${wx}; P.z = ${wz}`); await page.waitForFunction(n => window.__T.ev('G.save.q.vara.p || 0') >= n, i, { timeout: 5000 }); }
  expect(await ev('G.save.q.vara.p')).toBe(4);
  await ev('(n => { P.x = n.x - 1; P.z = n.z; })(npcs.find(n => n.id === "ivo"))');
  await page.waitForFunction(() => window.__T.nearInter?.kind === 'npc' && window.__T.nearInter.npc.id === 'ivo', null, { timeout: 5000 });
  await page.keyboard.press('e');
  await skipDialogs(page);
  expect(await ev('[G.save.q.vara.st, !!G.save.rod]')).toEqual(['done', true]);
  // agora pesca: lança, o peixe morde, puxa na hora
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
  // Santuário da Fenda: o portal sombrio fica na praça nova ao sul do Bairro Leste
  expect(await ev('(p => [p.x, p.z, p.model === getModel("riftgate")])(inter.find(i => i.kind === "riftportal"))')).toEqual([118, 68.5, true]);
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

test('personagem em destaque: zoom da câmera, espelho com poses e capa que esvoaça', async ({ page }) => {
  const errors = await newGame(page);
  const ev = src => page.evaluate(s => window.__T.ev(s), src);
  // zoom: roda do mouse e teclas + / −, lembrado nas configurações
  const z0 = await ev('G.settings.zoom');
  await page.mouse.move(500, 300); await page.mouse.wheel(0, -240); await page.waitForTimeout(200);
  const z1 = await ev('G.settings.zoom'); expect(z1).toBeLessThan(z0);
  await page.keyboard.press('Minus'); await page.waitForTimeout(100);
  expect(await ev('G.settings.zoom')).toBeGreaterThan(z1);
  expect(await ev('JSON.parse(localStorage.getItem(SKEY + "-set")).zoom')).toBeGreaterThan(0);
  // capa em dois gomos: ossos extras que balançam ao andar
  await ev('G.char.cape = true; rebuildPlayerModel()');
  expect(await ev('playerModel.bones.length')).toBe(16);   // 14 do esqueleto articulado + 2 da capa
  await page.keyboard.down('d'); await page.waitForTimeout(700);
  expect(await ev('P.anim[14].rx')).toBeGreaterThan(.12);
  expect(await ev('P.anim[12].rx + P.anim[13].rx')).toBeGreaterThan(.2);   // joelhos dobram ao andar
  await page.keyboard.up('d');
  // espelho da bolsa: barra de poses e aproximação
  await page.keyboard.press('i');
  await expect(page.locator('#poseBar')).toBeVisible();
  await page.click('#poseBar button[data-p="dancar"]');
  expect(await ev('G.pvPose')).toBe('dancar');
  await page.click('#poseBar button[data-p="zin"]');
  expect(await ev('G.pvZoom')).toBeLessThan(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('#poseBar')).toBeHidden();
  expect(await ev('G.pvPose')).toBe(null);
  expect(errors).toEqual([]);
});

test('Bairro Leste vivo: Acendedora Lúcia caminha, Feirante Dora conversa, feira e patos no lago', async ({ page }) => {
  const errors = await newGame(page);
  const ev = src => page.evaluate(s => window.__T.ev(s), src);
  expect(await ev('["lucia", "dora"].map(id => npcs.some(n => n.id === id))')).toEqual([true, true]);
  const a = await ev('(n => [n.x, n.z])(npcs.find(n => n.id === "lucia"))');
  expect(a[0]).toBeGreaterThan(90);   // anda pelo Bairro Leste, pela rota do relógio da vila
  await ev('(n => { P.x = n.x; P.z = n.z + 1.2; })(npcs.find(n => n.id === "dora"))');
  await page.waitForFunction(() => window.__T.nearInter?.kind === 'npc' && window.__T.nearInter.npc.id === 'dora', null, { timeout: 5000 });
  await page.keyboard.press('e');
  await expect(page.locator('#dialog')).toContainText('Feirante Dora');
  expect(await ev('G.ducks && G.ducks.length')).toBe(4);
  expect(errors).toEqual([]);
});
