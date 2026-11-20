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
  expect(info).toEqual({ W: 400, H: 350, biomas: 8, obel: 13, cav: 7, covis: 8 });   // 1 na Campina, 2 em cada bioma do meio, nenhum no Ermo Profundo
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
  await expect(page.locator('#wsList .shoprow')).toHaveCount(7);   // poção, mapa (quem não tem) e 5 itens
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
  expect(await ev('[RG.W, npcs.some(n => n.id === "bardo"), enemies.filter(e => e.dummy).length, inter.filter(i => i.kind === "bench").length, inter.filter(i => i.kind === "fish").length]')).toEqual([104, true, 3, 4, 5]);
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
  await ev("G.fishing.biteAt = .05; G.fishing.f = TessFish.fishById('lambari')");
  await page.waitForFunction(() => window.__T.ev('!!(G.fishing && G.fishing.bite)'), null, { timeout: 5000 });
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__T.ev('(G.save.st && G.save.st.fish) === 1'), null, { timeout: 3000 });
  expect(await ev('[G.save.fish.lambari, G.save.gold === ' + ouro + ', G.save.fxp > 0]')).toEqual([1, true, true]);   // o peixe vai para o cesto (vende na banca)
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

test('Pesqueiro: rio com píeres, iscas e varas na banca, peixe pesado que arrebenta ou briga, cesto e mercado que barateia', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await newGame(page);
  const ev = src => page.evaluate(s => window.__T.ev(s), src);
  await ev('G.save.rod = true; G.save.gold = 5000; P.hp = P.maxHp = 1e9');
  expect(await ev('HUB.fishSpots.map(f => f.water)')).toEqual(['lago', 'rio', 'rio', 'rio', 'remanso']);
  // banca do Pesqueiro: compra minhocas (escolhe sozinha) e vê o Pescador
  await ev('P.x = HUB.fishery[0]; P.z = HUB.fishery[1] + .5');
  await page.waitForFunction(() => window.__T.nearInter?.kind === 'fishery', null, { timeout: 5000 });
  await page.keyboard.press('e');
  await page.waitForSelector('#fishery:not([hidden])');
  await page.click('#fishery .ftabs button[data-ft="loja"]');
  await page.locator('#fsList .shoprow', { hasText: 'Minhoca' }).locator('button.gold').click();
  expect(await ev('[G.save.bait.minhoca, G.save.baitSel, G.save.gold]')).toEqual([10, 'minhoca', 4960]);
  await page.click('#fsClose');
  // Remanso: lança (gasta uma isca); o Bagre-Velho é pesado para a vara de bambu: a linha arrebenta
  await ev('(f => { P.x = f.x + 1.4; P.z = f.z; })(HUB.fishSpots[4])');
  await page.waitForFunction(() => window.__T.nearInter?.kind === 'fish' && window.__T.nearInter.spot === 4, null, { timeout: 5000 });
  const cast = async fish => { await page.keyboard.press('e'); await ev(`G.fishing.biteAt = .05; G.fishing.f = TessFish.fishById('${fish}')`); await page.waitForFunction(() => window.__T.ev('!!(G.fishing && G.fishing.bite)'), null, { timeout: 5000 }); };
  await cast('bagre');
  expect(await ev('G.save.bait.minhoca')).toBe(9);
  await page.keyboard.press('e');
  expect(await ev('[!!G.fishing, (G.save.fish || {}).bagre || 0]')).toEqual([false, 0]);
  await page.waitForFunction(() => window.__T.ev('!G.fishCatch'), null, { timeout: 3000 });
  // vara reforçada na banca; agora o bagre briga: dois puxões
  await ev("openFishery('loja')"); await page.waitForSelector('#fishery:not([hidden])');
  await page.locator('#fsList .shoprow', { hasText: 'Vara Reforçada' }).locator('button.gold').click();
  expect(await ev('G.save.rodLv')).toBe(1);
  await page.click('#fsClose');
  await cast('bagre');
  await page.keyboard.press('e');
  expect(await ev('[!!G.fishing, G.fishing && G.fishing.pulls]')).toEqual([true, 1]);
  await page.waitForFunction(() => window.__T.ev('G.fishing && G.fishing.t > .75'), null, { timeout: 3000 });
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__T.ev('(G.save.fish || {}).bagre === 1'), null, { timeout: 3000 });
  expect(await ev('[G.save.fcount.bagre, G.save.fxp > 0]')).toEqual([1, true]);
  // mercado (offline: o da vila): vende um e o próximo sai mais barato
  await ev("G.save.fish.bagre = 40; openFishery('mercado')"); await page.waitForSelector('#fishery:not([hidden])');
  const p0 = await ev("fishPriceNow('bagre').p"), g0 = await ev('G.save.gold');
  await page.locator('#fsList .shoprow', { hasText: 'Bagre-Velho' }).locator('button.gold').click();
  await page.waitForFunction(() => window.__T.ev('!G.save.fish.bagre'), null, { timeout: 3000 });
  expect(await ev('G.save.gold')).toBeGreaterThan(g0 + p0 * 25);
  expect(await ev("fishPriceNow('bagre').p")).toBeLessThan(p0);
  await page.click('#fishery .ftabs button[data-ft="pescador"]');
  await expect(page.locator('#fsSub')).toContainText('Pescador nível');
  await expect(page.locator('#fsList')).toContainText('Bagre-Velho');
  expect(errors).toEqual([]);
});

test('dia e noite: relógio no HUD, noite nos Ermos com monstros mais fortes e mais XP, peixes e crianças da noite', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await newGame(page);
  const ev = src => page.evaluate(s => window.__T.ev(s), src);
  // meio-dia na vila: relógio com sol; à noite, lua e as crianças na porta da taverna
  await expect(page.locator('#hClock')).toContainText('☀ 12:00');
  expect(await ev('[nightK(), duskK() < .1]')).toEqual([0, true]);
  await ev('G.forceHour = 23');
  await expect(page.locator('#hClock')).toContainText('☾ 23:00');
  expect(await ev('nightK()')).toBe(1);
  await ev('G.forceHour = 21');   // das 20h às 22h as crianças ouvem histórias na porta da taverna; depois vão dormir
  await page.waitForFunction(() => window.__T.ev('(n => n.visible && Math.hypot(n.x - 31.6, n.z - 26.2) < .1)(npcs.find(n => n.id === "kiko"))'), null, { timeout: 5000 });
  await ev('G.forceHour = 23');
  await page.waitForFunction(() => window.__T.ev('!npcs.find(n => n.id === "kiko").visible'), null, { timeout: 5000 });
  // postes: apagados de dia, todos acesos à noite; no fim da tarde a Lúcia faz a ronda e acende um por um, pelas ruas
  expect(await ev('HUB.lamps.every((l, i) => lampLit(i))')).toBe(true);
  await ev('G.forceHour = 12'); expect(await ev('HUB.lamps.some((l, i) => lampLit(i))')).toBe(false);
  const R = await ev('(R => ({ dur: R.dur, at: R.at }))(lampRoute())');
  expect(R.at.every(a => a > 0)).toBe(true); expect(R.dur / 60).toBeLessThan(3.5);   // a ronda inteira cabe no entardecer
  const i0 = R.at.indexOf(Math.min(...R.at));
  await ev(`G.forceHour = LAMP_LIGHT_H + (${R.at[i0]} - 1) / 60`); expect(await ev(`[lampLit(${i0}), !!luciaRound()]`)).toEqual([false, true]);
  await ev(`G.forceHour = LAMP_LIGHT_H + (${R.at[i0]} + 1) / 60`); expect(await ev(`[lampLit(${i0}), HUB.lamps.filter((l, i) => lampLit(i)).length]`)).toEqual([true, 1]);
  await page.waitForFunction(() => window.__T.ev('(n => !!n.round && Math.hypot(n.x - luciaRound().x, n.z - luciaRound().z) < .3)(npcs.find(n => n.id === "lucia"))'), null, { timeout: 5000 });
  await ev('G.forceHour = 23');
  // peixes da noite: a Enguia-de-Fio aparece muito mais no Remanso
  const enguias = await ev("(() => { let d = 0, n = 0; for (let i = 0; i < 3000; i++) { if (TessFish.rollFish('remanso', 10, null, Math.random, 0).id === 'enguia') d++; if (TessFish.rollFish('remanso', 10, null, Math.random, 1).id === 'enguia') n++; } return [d, n]; })()");
  expect(enguias[1]).toBeGreaterThan(enguias[0] * 4);
  // nos Ermos: de noite os monstros batem mais e dão mais XP; dentro de lugar coberto (Fenda) não é noite
  await ev("G.forceHour = 12"); await page.evaluate(() => window.__T.travel('wilds'));
  await page.waitForFunction(() => window.__T.RG.key === 'wilds' && window.__T.ev("G.mode === 'play'"), null, { timeout: 60_000 });
  const dia = await ev('monsterScale()'); await ev('G.forceHour = 1'); const noite = await ev('monsterScale()');
  expect(noite.dmg / dia.dmg).toBeCloseTo(1.15, 2); expect(noite.xp / dia.xp).toBeCloseTo(1.25, 2);
  await expect(page.locator('#hClock')).toContainText('☾ 01:00');
  expect(errors).toEqual([]);
});

test('rotina e interiores: à noite os moradores vão para casa e para a taverna; entrar, comer com a Mel, cozinhar peixe e sair na porta', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await newGame(page);
  const ev = src => page.evaluate(s => window.__T.ev(s), src);
  await ev('G.save.met.ysolde = true; G.save.gold = 1000; P.hp = P.maxHp = 1e9');
  // meio-dia: Brann e Mel na rua; 21h: Brann na taverna? não: 21h ele está em casa; Mel na taverna
  expect(await ev('[npcs.find(n => n.id === "brann").visible, npcPlace("brann", 12), npcPlace("brann", 22), npcPlace("mel", 21)]')).toEqual([true, 'out', 'casa', 'taverna']);
  await ev('G.forceHour = 22');
  await page.waitForFunction(() => window.__T.ev('!npcs.find(n => n.id === "brann").visible && !npcs.find(n => n.id === "mel").visible'), null, { timeout: 5000 });
  // a porta da taverna
  const td = await ev('(d => [d.x, d.z])(HUB.doors.find(d => d.taverna))');
  await ev(`P.x = ${td[0]}; P.z = ${td[1]}`);
  await page.waitForFunction(() => window.__T.nearInter?.kind === 'door', null, { timeout: 5000 });
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__T.RG.key === 'taverna' && window.__T.ev("G.mode === 'play'"), null, { timeout: 20_000 });
  expect(await ev('npcs.map(n => n.id).sort()')).toEqual(['lio', 'mel', 'otto']);
  // Mel vende a sopa (buff)
  const mp = await ev('(n => [n.x, n.z])(npcs.find(n => n.id === "mel"))');
  await ev(`P.x = ${mp[0]}; P.z = ${mp[1]} + 1.2`);
  await page.waitForFunction(() => window.__T.nearInter?.kind === 'npc' && window.__T.nearInter.npc.id === 'mel', null, { timeout: 5000 });
  await page.keyboard.press('e');
  await skipDialogs(page, 'Sopa da Mel');
  expect(await ev('[G.buffs.sopa > 400, G.save.gold]')).toEqual([true, 960]);
  // cozinhar no fogareiro: 2 lambaris viram Peixe Assado
  await ev("G.save.fish = { lambari: 3 }; (c => { P.x = c.x; P.z = c.z; })(inter.find(i => i.kind === 'cook'))");
  await page.waitForFunction(() => window.__T.nearInter?.kind === 'cook', null, { timeout: 5000 });
  await page.keyboard.press('e');
  await skipDialogs(page, 'Cozinhar Peixe Assado');
  expect(await ev('[G.buffs.assado > 300, G.save.fish.lambari]')).toEqual([true, 1]);
  // sair: volta na porta da taverna
  await ev("(c => { P.x = c.x; P.z = c.z; })(inter.find(i => i.kind === 'exitdoor'))");
  await page.waitForFunction(() => window.__T.nearInter?.kind === 'exitdoor', null, { timeout: 5000 });
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__T.RG.key === 'hub' && window.__T.ev("G.mode === 'play'"), null, { timeout: 20_000 });
  expect(await ev(`Math.hypot(P.x - ${td[0]}, P.z - ${td[1]}) < 1.5`)).toBe(true);
  // casa do Vovô Brann: ele dorme lá dentro
  await ev('enterDoor(HUB.doors.find(d => d.i === 5))');
  await page.waitForFunction(() => window.__T.RG.key === 'casa' && window.__T.ev("G.mode === 'play'"), null, { timeout: 20_000 });
  expect(await ev('[REG.casa.name, npcs.map(n => [n.id, !!n.asleep])]')).toEqual(['Casa do Vovô Brann', [['brann', true]]]);
  expect(errors).toEqual([]);
});

test('clima: chuva, neblina e tempestade mudam a pesca, o faro dos monstros e trazem raios nos Ermos; dentro de casa não chove', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await newGame(page);
  const ev = src => page.evaluate(s => window.__T.ev(s), src);
  expect(await ev('[weatherNow().type, aggroMul()]')).toEqual(['limpo', 1]);
  await ev("G.forceWeather = 'chuva'");
  await page.waitForTimeout(400);
  expect(await ev('[raining(), aggroMul() < 1]')).toEqual([true, true]);
  await expect(page.locator('#hClock')).toContainText('☂');
  await ev("G.forceWeather = 'neblina'"); expect(await ev('[foggy(), aggroMul()]')).toEqual([true, .65]);
  // dentro da taverna: sempre limpo
  await ev('enterDoor(HUB.doors.find(d => d.taverna))');
  await page.waitForFunction(() => window.__T.RG.key === 'taverna' && window.__T.ev("G.mode === 'play'"), null, { timeout: 20_000 });
  expect(await ev('weatherNow().type')).toBe('limpo');
  // tempestade nos Ermos: raios marcados no chão perto do herói
  await ev("G.forceWeather = 'tempestade'; P.hp = P.maxHp = 1e9"); await page.evaluate(() => window.__T.travel('wilds'));
  await page.waitForFunction(() => window.__T.RG.key === 'wilds' && window.__T.ev("G.mode === 'play'"), null, { timeout: 60_000 });
  await ev("(r => { P.x = r.wx; P.z = r.wz; })(RG.rooms.find(r => r.zone === 1 && !r.kind))"); await ev('G.boltCD = 0');
  await page.waitForFunction(() => window.__T.ev("tels.length > 0 || G.bolt > 0"), null, { timeout: 5000 });
  expect(errors).toEqual([]);
});

test('Morro do Mirante: o chão sobe no morro, o herói acompanha e a luneta mostra a vista (XP na primeira vez)', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await newGame(page);
  const ev = src => page.evaluate(s => window.__T.ev(s), src);
  expect(await ev('[groundAt(44, 32), groundAt(HILL.x, HILL.z) > 2, groundAt(HILL.x + HILL.r * .5, HILL.z) > .3]')).toEqual([0, true, true]);
  expect(await ev('blocked(Math.floor(HILL.x / T), Math.floor(HILL.z / T))')).toBe(false);
  await ev('P.x = HILL.x + .4; P.z = HILL.z + 1.4');
  await page.waitForFunction(() => window.__T.nearInter?.kind === 'mirante', null, { timeout: 5000 });
  const xp = await ev('G.save.lvl * 1e7 + G.save.xp');
  await page.keyboard.press('e');
  expect(await ev('[G.lookT > 6, G.save.met.mirante, G.save.lvl * 1e7 + G.save.xp > ' + xp + ']')).toEqual([true, true, true]);
  expect(errors).toEqual([]);
});
