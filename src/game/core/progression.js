/* Fios de Tessária · Progressão: runas, talentos, elites, casa, economia */
/* =========================================================
   PROGRESSÃO: RUNAS, TALENTOS, ELITES, ZONAS, LENDÁRIOS
   ========================================================= */
const RUNES = {
  lamina: [{ n: 'Giro Flamejante', d: 'Gira a lâmina em chamas, ferindo tudo em volta.', lv: 1 }, { n: 'Brasa Viva', d: 'Deixa um anel de fogo no chão por 3 segundos.', lv: 3 }, { n: 'Redemoinho', d: 'Puxa os inimigos para perto e aumenta o alcance.', lv: 6 }, { n: 'Sangue Quente', d: 'Cura 4% da vida para cada inimigo atingido.', lv: 9 }],
  arcano: [{ n: 'Nova Arcana', d: 'Dispara 16 projéteis teleguiados em círculo (no máximo 4 acertam o mesmo alvo).', lv: 1 }, { n: 'Geada', d: 'Os projéteis deixam os inimigos lentos.', lv: 3 }, { n: 'Cometa', d: 'Um cometa gigante explode onde você mira.', lv: 6 }, { n: 'Eco', d: 'Uma segunda nova dispara logo depois da primeira.', lv: 9 }],
  arco: [{ n: 'Chuva de Flechas', d: 'Leque de 9 flechas que atravessam inimigos.', lv: 1 }, { n: 'Farpada', d: 'As flechas atravessam tudo e causam 20% mais dano.', lv: 3 }, { n: 'Explosiva', d: 'Cada flecha explode ao acertar.', lv: 6 }, { n: 'Saraivada', d: 'Dispara três leques seguidos.', lv: 9 }],
};
const TALENTS = [
  { id: 'casca', n: 'Pele de Casca', d: '-10% de dano recebido.' },
  { id: 'mao', n: 'Mão Leve', d: 'Ataques básicos 12% mais rápidos.' },
  { id: 'olho', n: 'Olho de Fio', d: '+8% de crítico, e críticos causam 2,5× de dano.' },
  { id: 'brasa', n: 'Brasa Interior', d: 'A habilidade recarrega 20% mais rápido.' },
  { id: 'sangue', n: 'Sanguessuga', d: '3% do dano causado vira vida.' },
  { id: 'sorte', n: 'Sorte de Tecelão', d: '+25% de Centelhas e +30% de chance de itens.' },
  { id: 'vento', n: 'Passo de Vento', d: 'Esquiva recarrega 30% mais rápido e +8% de velocidade.' },
  { id: 'ultimo', n: 'Último Fio', d: 'Uma vez por região, ao cair, você levanta com 40% da vida.' },
];
const curRune = () => { const r = G.save.rune || 0, R2 = RUNES[G.char.cls][r]; return R2 && G.save.lvl >= R2.lv ? r : 0; };
const edmg = e => e.def.dmg * (e.dmgMul || 1) * (e.wdm || 1);
const ENAME = { gosmo: 'Gosmo', wisp: 'Fagulha', skel: 'Esqueleto', bat: 'Morcego', imp: 'Diabrete', beetle: 'Besouro', sapo: 'Sapo-boca', afogado: 'Afogado', sentinela: 'Sentinela', fantasma: 'Fantasma', javali: 'Javali', lobo: 'Lobo', urso: 'Urso-de-Musgo' };
const EAFF = { veloz: 'Ligeiro', vamp: 'Imortal', expl: 'Instável', blind: 'Couraçado', gelo: 'Gélido' };
function makeElite(e) {
  const n = (G.rift && G.rift.L >= 3) || (G.save.diff || 0) >= 3 ? 2 : 1, keys = Object.keys(EAFF).sort(() => Math.random() - .5).slice(0, n);
  e.elite = { aff: keys, name: ENAME[e.type] + ' ' + keys.map(k => EAFF[k]).join(' e ') };
  e.hp = e.maxHp = Math.round(e.maxHp * 3.2); e.scale *= 1.3; e.dmgMul = 1.3; e.spdMul = keys.includes('veloz') ? 1.5 : 1;
}
function onEnemyKilled(e) {
  const rmul = G.rift ? (1 + .3 * G.rift.L) * (G.rift.aff.includes('sangrenta') ? 1.3 : 1) : 1, st2 = G.save.st = G.save.st || {};
  gainXp(Math.round(e.def.xp * rmul * (e.elite ? 4 : 1) * monsterScale().xp * (e.wxp || 1)));
  streakKill();
  if (!e.dummy) { missionEvent('kill'); if (e.elite) missionEvent('elite'); if (e.alpha) missionEvent('alpha'); if (RG && RG.wild && isNight()) missionEvent('wilds_night'); }   // missões do Passe do Tear
  if (e.thief) {
    st2.thieves = (st2.thieves || 0) + 1; dropGold(e.x, e.z, 45); for (let i = 0; i < 3; i++) dropItem(e.x + rr(-1, 1), e.z + rr(-1, 1), rollRar(2));
    toast('LADRÃO DERROTADO!', true, 'ele derruba tudo o que roubou'); sfx('legend'); G.shake = Math.max(G.shake, .25);
  } else if (e.elite) {
    st2.elites = (st2.elites || 0) + 1;
    dropGold(e.x, e.z, e.def.gold * 3); dropItem(e.x, e.z, rollRar(2));
    toast(e.elite.name + ' derrotado', false, e.alpha ? 'ALFA DOS ERMOS' : 'ELITE', '#d7a6ff');
    if (e.alpha) { dropItem(e.x + 1, e.z, Math.max(3, rollRar(3))); dropGold(e.x, e.z, 20); st2.alphas = (st2.alphas || 0) + 1; }
    if (e.lair) { dropItem(e.x - 1, e.z + 1, Math.random() < .08 ? 4 : 3); dropGold(e.x, e.z, 60); st2.lairs = (st2.lairs || 0) + 1; toast('COVIL LIMPO', true, e.elite.name.toUpperCase() + ' CAIU', '#ffbf3d'); }
    if (e.elite.aff.includes('expl')) { const x = e.x, z = e.z; tels.push({ kind: 'circle', x, z, r: 2.6, t: 0, dur: .9, fn: () => { sfx('boom'); burst(x, .3, z, 40, 21, 5, .6, .2); if (Math.hypot(P.x - x, P.z - z) < 2.7) hurtPlayer(22, x, z, 10); } }); }
  }
  if (hasPow('coroa') && P && P.dieT < 0) P.hp = Math.min(P.maxHp, P.hp + P.maxHp * .03);
  if (G.rift && !G.rift.bossUp) { riftProgress(e.elite ? 8 : 2.4); const no = e.elite ? 3 : (Math.random() < .3 ? 1 : 0); for (let i = 0; i < no; i++) pickups.push({ kind: 'orb', x: e.x, y: .8, z: e.z, vx: rr(-2, 2), vy: rr(3, 5), vz: rr(-2, 2), t: 0 }); }
  if (G.rift && G.rift.aff.includes('explosiva') && !e.thief && Math.random() < .45) { const x = e.x, z = e.z; tels.push({ kind: 'circle', x, z, r: 1.8, t: 0, dur: .8, fn: () => { sfx('boom'); burst(x, .3, z, 22, 21, 4, .5, .16); if (Math.hypot(P.x - x, P.z - z) < 1.9) hurtPlayer(12, x, z, 8); } }); }
  contractEvent('kill', e);
}
const BUFFS = { sopa: { n: 'Sopa da Mel', d: '+10% de vida máxima', c: '#ffbf7a', mat: 30 }, torta: { n: 'Torta de Maçã', d: '+10% de dano e +25% de Centelhas', c: '#ff8a5a', mat: 124 }, assado: { n: 'Peixe Assado', d: '+12% de vida máxima', c: '#ffd27a', mat: 30 }, brasa: { n: 'Truta na Brasa', d: '+12% de dano', c: '#ff8a5a', mat: 124 }, ensopado: { n: 'Ensopado do Rio', d: '+20% de vida máxima e −8% de dano recebido', c: '#9cf6ff', mat: 122 }, banquete: { n: 'Banquete do Rei', d: '+20% de vida e dano, mais velocidade e +25% de XP', c: '#ff5a7a', mat: 124 }, descanso: { n: 'Bem Descansado', d: '+15% de XP', c: '#ffd27a', mat: 30 }, furia: { n: 'Fúria', d: '+50% de dano', c: '#ffbf3d', mat: 124 }, rapidez: { n: 'Rapidez', d: 'mais velocidade e ataques mais rápidos', c: '#5aa2ff', mat: 122 }, fortuna: { n: 'Fortuna', d: 'o dobro de Centelhas e mais itens', c: '#fff08a', mat: 30 }, protecao: { n: 'Proteção', d: '-40% de dano recebido', c: '#3fd1b0', mat: 31 } };
function usePylon(it) {
  it.used = true; const B = BUFFS[it.bt]; G.buffs[it.bt] = 30;
  toast('PILAR DA ' + B.n.toUpperCase(), true, B.d + ' por 30 segundos'); sfx('skill'); hitStop(.06);
  for (let i = 0; i < 60; i++) { const a = rr(0, 6.28); spawn({ x: it.x, y: rr(.5, 2.4), z: it.z, vx: Math.cos(a) * 4, vy: rr(-1, 2), vz: Math.sin(a) * 4, life: .7, s0: .16, s1: .03, b0: 1, b1: .2, mat: B.mat, drag: 2 }); }
}
function streakKill() { const S = G.streak; S.n++; S.t = 3.2; const ms = { 10: 'MATANÇA!', 25: 'MASSACRE!', 50: 'CARNIFICINA!', 100: 'LENDA VIVA!' }[S.n]; if (ms) { toast(ms, true, `${S.n} seguidos sem parar`); sfx('lvl'); } }
function updateStreak(dt) {
  const S = G.streak; if (!S.n) return; S.t -= dt;
  if (S.t <= 0) {
    if (S.n >= 10) { const xp = Math.round(S.n * 2.5 * regionTier()); gainXp(xp); toast(`Sequência de ${S.n}`, false, `+${xp} XP BÔNUS`, '#ffbf3d'); }
    const st2 = G.save.st = G.save.st || {}; st2.bestStreak = Math.max(st2.bestStreak || 0, S.n); S.n = 0;
  }
}
const FEITOS = [
  { id: 'kill100', n: 'Cem Fios Cortados', d: 'Derrote 100 inimigos.', chk: s => s.kills >= 100 },
  { id: 'kill500', n: 'Lenda de Tessária', d: 'Derrote 500 inimigos.', chk: s => s.kills >= 500 },
  { id: 'elite10', n: 'Caçada Real', d: 'Derrote 10 elites.', chk: s => ((s.st || {}).elites || 0) >= 10 },
  { id: 'thief', n: 'Pega Ladrão', d: 'Derrote um Ladrão de Centelhas.', chk: s => ((s.st || {}).thieves || 0) >= 1 },
  { id: 'leg', n: 'Brilho Dourado', d: 'Encontre um item lendário.', chk: s => ((s.st || {}).legs || 0) >= 1 },
  { id: 'streak50', n: 'Carnificina', d: 'Faça uma sequência de 50 sem parar.', chk: s => ((s.st || {}).bestStreak || 0) >= 50 },
  { id: 'rift5', n: 'Mergulho no Tear', d: 'Conclua uma Fenda de nível 5.', chk: s => (s.riftMax || 0) >= 5 },
  { id: 'rift10', n: 'Além do Tear', d: 'Conclua uma Fenda de nível 10.', chk: s => (s.riftMax || 0) >= 10 },
  { id: 'frags', n: 'Quem Lembra de Tudo', d: 'Encontre as 9 memórias.', chk: s => s.frags.length >= 9 },
  { id: 'quests', n: 'Amigo da Vila', d: 'Conclua as 5 missões dos moradores.', chk: s => Object.values(s.q || {}).filter(x => x.st === 'done').length >= 5 },
  { id: 'endB', n: 'O Sol que Lembra', d: 'Alcance o final verdadeiro.', chk: s => (s.endings || []).includes('B') },
  { id: 'lvl20', n: 'Fio Mestre', d: 'Alcance o nível 20.', chk: s => s.lvl >= 20 },
  { id: 'gk', n: 'Caçador de Guardiões', d: 'Derrote a Aranha, o Cavaleiro e o Olho nas Fendas.', chk: s => ((s.st || {}).gk || []).length >= 3 },
  { id: 'casa', n: 'Lar Doce Lar', d: 'Compre a casa na Vila Brasa.', chk: s => !!(s.house && s.house.owned) },
  { id: 'mobilia', n: 'Casa Completa', d: 'Compre toda a mobília da casa.', chk: s => !!(s.house && HOUSE_F.every(f => s.house.f[f.id])) },
  { id: 'mais10', n: 'Obra-Prima', d: 'Aprimore um item até +10.', chk: s => [s.eq.weapon, s.eq.armor, s.eq.charm, ...s.inv, ...((s.house || {}).stash || [])].some(i => i && (i.up || 0) >= 10) },
  { id: 'magnata', n: 'Magnata de Tessária', d: 'Gaste 50.000 Centelhas.', chk: s => (s.spent || 0) >= 50000 },
  { id: 'correio', n: 'Carta a um Amigo', d: 'Envie um item pelo Correio do Tear.', chk: s => ((s.st || {}).mailSent || 0) >= 1 },
  { id: 'wild3', n: 'Até o Fim do Mapa', d: 'Chegue ao Ermo Profundo.', chk: s => (s.wz || 0) >= 3 },
  { id: 'pesca', n: 'Paciência de Tecelão', d: 'Pesque 10 peixes no lago do Bairro Leste.', chk: s => ((s.st && s.st.fish) || 0) >= 10 },
  { id: 'alpha5', n: 'Caçador de Alfas', d: 'Derrote 5 Alfas nos Ermos.', chk: s => ((s.st || {}).alphas || 0) >= 5 },
  { id: 'act2', n: 'Fios Soltos', d: 'Derrote a Hidra do Lodo e O Reflexo.', chk: s => !!(s.bosses.swamp && s.bosses.glass) },
  { id: 'diff3', n: 'Mestre Tecelão', d: 'Derrote um guardião na dificuldade Mestre.', chk: s => Object.values(s.bossDiff || {}).some(v => v >= 3) },
  { id: 'torm', n: 'Atravessar o Tormento', d: 'Derrote um guardião em Tormento.', chk: s => Object.values(s.bossDiff || {}).some(v => v >= 4) },
  { id: 'lvl30', n: 'Além do Fio', d: 'Alcance o nível 30.', chk: s => s.lvl >= 30 },
  { id: 'rankS', n: 'Mais Rápido que o Tear', d: 'Conclua uma Fenda com rank S.', chk: s => ((s.st || {}).rankS || 0) >= 1 },
];
function checkFeats(dt) {
  G.featT = (G.featT || 0) - dt; if (G.featT > 0) return; G.featT = 1;
  const s = G.save; s.feats = s.feats || [];
  for (const f of FEITOS) if (!s.feats.includes(f.id) && f.chk(s)) { s.feats.push(f.id); s.gold += 50; toast('FEITO: ' + f.n, true, f.d + ' · +50 Centelhas'); sfx('legend'); writeSave(); break; }
}
function spawnThief(rm) {
  const [x, z] = freeSpot(rm.wx, rm.wz, (rm.r || Math.min(rm.w, rm.h)) * T * .6), e = spawnEnemy('thief', x, z, .4);
  e.thief = true; e.elite = { aff: [], name: 'Ladrão de Centelhas' };
  toast('UM LADRÃO DE CENTELHAS!', true, 'pegue antes que ele fuja'); sfx('epic');
}
function riftProgress(v) { const R = G.rift; if (!R || R.bossUp) return; R.prog = Math.min(100, R.prog + v); if (R.prog >= 100) { R.bossUp = true; toast('O GUARDIÃO DA FENDA SURGIU', true, 'vá até o coração da fenda, ao norte'); updateObjective(); sfx('roar'); } }
const RAFF = {
  sangrenta: { n: 'Sangrenta', d: 'Inimigos causam 25% mais dano, mas dão 30% mais XP.' },
  frenetica: { n: 'Frenética', d: 'Inimigos 20% mais rápidos.' },
  explosiva: { n: 'Explosiva', d: 'Inimigos podem explodir ao morrer.' },
  abundante: { n: 'Abundante', d: '50% mais inimigos (e mais progresso).' },
  dourada: { n: 'Dourada', d: 'O dobro de Centelhas.' },
  fortificada: { n: 'Fortificada', d: 'Inimigos com 40% mais vida, mas um item a mais no fim.' },
};
const riftAffN = L => L >= 12 ? 3 : L >= 6 ? 2 : 1;
const fmtT = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
function rollRift() { const base = pick(unlockedRegions()); return { base, boss: pick(['spider', 'knight', 'eye', 'spider', 'knight', 'eye', REG[base].boss]), aff: Object.keys(RAFF).sort(() => Math.random() - .5) }; }
function aoeDamage(x, z, r, dmg, skip) {
  for (const e of enemies) { if (e.dieT >= 0 || e.spawnT > 0 || e === skip) continue; if (Math.hypot(e.x - x, e.z - z) < r + e.def.r * e.scale) hurtEnemy(e, dmg, e.x - x, e.z - z, false, .8); }
  if (boss && !boss.dying) for (const h of bossHits(boss)) if (Math.hypot(h[0] - x, h[1] - z) < r + h[2]) { hurtBoss(boss, dmg, false, h); break; }
}
function solBurst(x, z, dmg) { for (let i = 0; i < 26; i++) { const a = rr(0, 6.28); spawn({ x, y: .8, z, vx: Math.cos(a) * 4, vy: rr(0, 2), vz: Math.sin(a) * 4, life: .4, s0: .2, s1: .04, b0: 1, b1: .2, mat: 124, drag: 2 }); } aoeDamage(x, z, 2, dmg * .6); }
function projHit(p, e) {
  if (p.frost) e.slowT = 2.2;
  if (p.bolt && !p.child) { burst(e.x, 1, e.z, 10, 7, 2.8, .25, .12); aoeDamage(e.x, e.z, 1.8, p.dmg * .6, e); }   // explosão do projétil arcano
  if (p.boom) { burst(e.x, .8, e.z, 14, 7, 3, .3, .14); aoeDamage(e.x, e.z, p.boom, p.dmg * .5); }
  if (p.bolt && !p.child && hasPow('ultbrasa')) { const a0 = Math.atan2(p.vx, p.vz); for (const off of [-.7, 0, .7]) shoot({ x: p.x, y: p.y, z: p.z, vx: Math.sin(a0 + off) * 11, vz: Math.cos(a0 + off) * 11, life: .5, dmg: p.dmg * .45, team: 'p', mat: 124, size: .24, r: .35, homing: 6, trail: .8, bolt: true, child: true, hit: new Set(p.hit || []) }); }
  if (p.comet) { explodeComet(p); p.pierce = -1; }
}
function explodeComet(p) { p.exploded = true; G.shake = Math.max(G.shake, .3); sfx('boom'); burst(p.x, .5, p.z, 70, 7, 7, .7, .25); aoeDamage(p.x, p.z, 3.5, p.dmg); }
function updateZones(dt) {
  for (let i = G.zones.length - 1; i >= 0; i--) {
    const z = G.zones[i]; z.t += dt; if (z.t >= z.dur) { G.zones.splice(i, 1); continue; }
    if (z.team === 'p') { z.tick -= dt; if (z.tick <= 0) { z.tick = .5; for (const e of enemies) if (e.dieT < 0 && e.spawnT <= 0 && Math.hypot(e.x - z.x, e.z - z.z) < z.r) hurtEnemy(e, z.dmg, 0, 0, false, 0); if (boss && !boss.dying) for (const h of bossHits(boss)) if (Math.hypot(h[0] - z.x, h[1] - z.z) < z.r + h[2]) { hurtBoss(boss, z.dmg, false, h); break; } } }
    else if (z.team === 'e' && P && Math.hypot(P.x - z.x, P.z - z.z) < z.r) { P.slowT = .35; if (z.dmg) { z.tick = (z.tick || 0) - dt; if (z.tick <= 0) { z.tick = .5; hurtPlayer(z.dmg, z.x, z.z, 0); } } }
  }
}
function drawZones(t) {
  for (const z of G.zones) {
    if (P && Math.abs(z.x - P.x) > 32 || P && Math.abs(z.z - P.z) > 28) continue;   // só as zonas perto (os Ermos têm muitas teias)
    const ally = z.team !== 'e', m = z.mat || (ally ? 7 : 122), fade = 1 - z.t / z.dur, n = Math.ceil(z.r * 10);
    for (let i = 0; i < n; i++) { const a = i / n * 6.283 + t * (ally ? 1 : -.5); dyn(z.x + Math.cos(a) * z.r, .07, z.z + Math.sin(a) * z.r, .7 * fade + .2, m, .18); }
    for (let i = 0; i < n; i++) { const a = hash2(i, 3) * 6.283, d = Math.sqrt(hash2(i, 9)) * z.r; dyn(z.x + Math.cos(a) * d, .06 + (ally ? Math.abs(Math.sin(t * 6 + i)) * .3 : 0), z.z + Math.sin(a) * d, .45 * fade, m, .16); }
  }
}
function updateLater(dt) { for (let i = G.later.length - 1; i >= 0; i--) { const L = G.later[i]; L.t -= dt; if (L.t <= 0) { G.later.splice(i, 1); L.fn(); } } }
function reforge(it) {
  const prim = it.slot === 'weapon' ? 'dmg' : it.slot === 'armor' ? 'hp' : null, sec = Object.keys(it.st).filter(k => k !== prim);
  if (sec.length) delete it.st[pick(sec)];
  const pool = affPool(it.slot).filter(k => !(k in it.st)), a = pick(pool.length ? pool : affPool(it.slot)), R = RAR[it.rar];
  const v = Math.max(1, Math.round(AFF_BASE[a] * (.6 + .4 * R.m) * (.8 + .25 * it.tier) * rr(.8, 1.25)));
  it.st[a] = (it.st[a] || 0) + v; toast(STAT_FMT[a](v), false, 'REFORJADO', RAR[it.rar].c);
}

/* ---- contratos ---- */
const RNAME = { forest: 'Bosque Sussurrante', crypt: 'Ossuário Real', peaks: 'Picos de Cinza', swamp: 'Pântano Afogado', glass: 'Cidadela de Vidro' };
const RPREP = { forest: 'no', crypt: 'no', peaks: 'nos', swamp: 'no', glass: 'na' };
const EPLUR = { gosmo: 'Gosmos', wisp: 'Fagulhas', skel: 'Esqueletos', bat: 'Morcegos', imp: 'Diabretes', beetle: 'Besouros', sapo: 'Sapos-boca', afogado: 'Afogados', sentinela: 'Sentinelas', fantasma: 'Fantasmas', javali: 'Javalis', lobo: 'Lobos', urso: 'Ursos' };
const RTYPES = { forest: ['gosmo', 'wisp'], crypt: ['skel', 'bat'], peaks: ['imp', 'beetle'], swamp: ['sapo', 'afogado'], glass: ['sentinela', 'fantasma'] };
const unlockedRegions = () => { const b = G.save.bosses; return ['forest', ...(b.forest ? ['crypt'] : []), ...(b.crypt ? ['peaks'] : []), ...(G.save.met.act2y ? ['swamp'] : []), ...(b.swamp ? ['glass'] : [])]; };
function newContract() {
  const s = G.save, r = pick(unlockedRegions()), roll = Math.random(); let c;
  if (s.bosses.forest && roll < .18) { const L = Math.max(1, s.riftMax || 1); c = { kind: 'rift', n: 1, L, text: `Complete uma Fenda do Tear de nível ${L} ou mais`, tier: Math.min(4, 2 + Math.floor(L / 3)) }; }
  else if (roll < .42) { const n = Math.random() < .4 ? 2 : 1; c = { kind: 'elite', region: r, n, text: `Derrote ${n} elite${n > 1 ? 's' : ''} ${RPREP[r]} ${RNAME[r]}` }; }
  else if (roll < .7) { const n = 18 + Math.floor(rr(0, 10)); c = { kind: 'any', region: r, n, text: `Derrote ${n} inimigos ${RPREP[r]} ${RNAME[r]}` }; }
  else { const ty = pick(RTYPES[r]), n = { gosmo: 12, wisp: 8, skel: 10, bat: 10, imp: 8, beetle: 6, sapo: 8, afogado: 8, sentinela: 7, fantasma: 7 }[ty]; c = { kind: 'kill', type: ty, region: r, n, text: `Derrote ${n} ${EPLUR[ty]} ${RPREP[r]} ${RNAME[r]}` }; }
  c.tier = c.tier || { forest: 1, crypt: 2, peaks: 3, swamp: 4, glass: 5 }[c.region]; c.p = 0;
  c.gold = 30 + 25 * c.tier + (c.kind === 'elite' ? 30 : 0); c.xp = 35 * c.tier * (c.kind === 'rift' ? 2 : 1);
  return c;
}
function ensureContracts() { const s = G.save; if (!s.contracts) s.contracts = []; while (s.contracts.length < 3) s.contracts.push(newContract()); }
function contractEvent(kind, e) {
  const s = G.save; if (!s.contracts) return; const reg = G.rift ? G.rift.base : RG.key;
  for (const c of s.contracts) {
    if (c.p >= c.n) continue; let ok = false;
    if (kind === 'kill' && c.region === reg && (c.kind === 'any' || (c.kind === 'kill' && c.type === e.type) || (c.kind === 'elite' && e.elite))) ok = true;
    if (kind === 'rift' && c.kind === 'rift' && e >= c.L) ok = true;
    if (ok) { c.p++; if (c.p >= c.n) toast('Contrato concluído!', false, 'RECEBA NO QUADRO DA VILA', '#3fd1b0'); }
  }
}
function renderBoard() {
  ensureContracts(); const s = G.save, box = $('#bList'); box.innerHTML = '';
  s.contracts.forEach((c, i) => {
    const ok = c.p >= c.n, row = document.createElement('div'); row.className = 'qrow';
    row.innerHTML = `<div class="top"><b>${c.text}</b><small>${Math.min(c.p, c.n)}/${c.n}</small></div><div class="prog"><i style="width:${Math.min(1, c.p / c.n) * 100}%"></i></div><small>Recompensa: ${c.gold} Centelhas, ${c.xp} XP e um item Raro ou melhor</small>`;
    const b = document.createElement('button'); b.className = 'px' + (ok ? ' gold' : ''); b.textContent = ok ? 'Receber recompensa' : 'Em andamento'; b.disabled = !ok;
    b.onclick = () => { s.gold += c.gold; gainXp(c.xp); takeItem(makeItem(pick(['weapon', 'armor', 'charm']), c.tier, Math.max(2, rollRar(2)))); s.contracts[i] = newContract(); sfx('lvl'); writeSave(); renderBoard(); };
    row.appendChild(b); box.appendChild(row);
  });
}

/* ---- missões dos moradores ---- */
const QUESTS = {
  mel: { n: 'Cogumelos de Luz', giver: 'mel', region: 'forest', need: 5, item: 'Cogumelo de Luz', mat: 14, desc: 'Colha 5 cogumelos luminosos no Bosque Sussurrante para a Padeira Mel.', reward: '+20 de vida máxima e poções mais fortes', req: s => s.met.mel,
    offer: () => [{ who: 'Padeira Mel', text: 'Sabe o que falta no meu pão? Cogumelo de luz! Cresce no bosque, brilha azulzinho. Me traz cinco?', choices: [{ t: 'Trago, sim.', fn: () => startQuest('mel') }, { t: 'Agora não.' }] }],
    done: () => [{ who: 'Padeira Mel', text: 'Cinco cogumelos de luz! Olha só como brilham na massa…' }, { who: 'Padeira Mel', text: 'Pão de Mel com cogumelo de luz: dá força pro resto da vida. Literalmente. Come!' }] },
  vara: { n: 'A Vara do Ivo', giver: 'ivo', need: 4, desc: 'Ache 4 minhocas-de-brasa pelo Bairro Leste (brilham no chão, perto das casas, do lago e da arena) e leve para o Pescador Ivo, no Pesqueiro (passagem a leste do Bairro Leste).', reward: 'Vara de pesca: pesque no lago e nos píeres do rio', req: () => true,
    offer: () => [{ who: 'Pescador Ivo', text: 'Mudei pro lago do Bairro Leste: a água aqui é funda e os peixes são graúdos. Só me falta isca.' }, { who: 'Pescador Ivo', text: 'Minhoca-de-brasa! Brilham no chão, se escondem perto das casas, do lago e da arena. Me traz quatro e eu te dou minha vara reserva.', choices: [{ t: 'Vou procurar.', fn: () => startQuest('vara') }, { t: 'Agora não.' }] }],
    done: () => [{ who: 'Pescador Ivo', text: 'Quatro minhocas-de-brasa, gordinhas! Os lambaris vão fazer fila.' }, { who: 'Pescador Ivo', text: 'Toma a vara. Lance no lago, espere a boia afundar e puxe na hora certa. Peixe-Lua só aparece pra quem tem paciência.' }] },
  ivo: { n: 'O Anzol de Prata', giver: 'ivo', region: 'crypt', need: 1, item: 'Anzol de Prata', mat: 120, desc: 'Encontre o anzol de prata do Pescador Ivo no Ossuário Real.', reward: 'Anzol de Prata, um amuleto épico', req: s => s.bosses.forest,
    offer: () => [{ who: 'Pescador Ivo', text: 'Meu anzol de prata era do meu pai. Caiu num poço que dá direto no Ossuário. Se você descer lá…', choices: [{ t: 'Eu procuro.', fn: () => startQuest('ivo') }, { t: 'Talvez depois.' }] }],
    done: () => [{ who: 'Pescador Ivo', text: 'É ele! Ainda tem a marca do dente do meu pai, de quando ele abria nó com a boca.' }, { who: 'Pescador Ivo', text: 'Fica com ele. Um anzol de prata pesca sorte melhor do que peixe.' }] },
  lio: { n: 'A Canção Perdida', giver: 'lio', region: 'peaks', need: 3, item: 'Nota de Brasa', mat: 27, desc: 'Junte 3 Notas de Brasa nos Picos de Cinza para o Bardo Lio terminar a canção.', reward: '+10% de dano permanente e a canção completa', req: s => s.bosses.crypt,
    offer: () => [{ who: 'Bardo Lio', text: 'Tem uma canção que eu nunca terminei. As últimas notas ficaram presas nos Picos, eu sinto. Notas de brasa, quentes como o dragão.', choices: [{ t: 'Vou buscar as notas.', fn: () => startQuest('lio') }, { t: 'Agora não.' }] }],
    done: () => [{ who: 'Bardo Lio', text: '♪ Guardei o Sol dentro do peito, ardendo sem nome e sem leito; quem lembrar da maçã e do medo costura o dragão e desfaz o segredo ♪' }, { who: 'Bardo Lio', text: 'Terminada. Obrigado. Essa canção agora é sua também: leve ela no braço.' }] },
  nina: { n: 'Esconde-esconde', giver: 'kiko', need: 1, desc: 'Kiko não acha a Nina. Ela se escondeu atrás de alguma casa do lado norte da vila.', reward: 'Fita da Nina e Centelhas', req: s => s.bosses.forest,
    offer: () => [{ who: 'Kiko', text: 'A Nina se escondeu e eu desisto! Já procurei em todo lugar! Você me ajuda? Ela sempre se esconde atrás das casas.', choices: [{ t: 'Deixa comigo.', fn: () => startQuest('nina') }, { t: 'Agora não.' }] }] },
  brann: { n: 'A Maçã do Vovô', giver: 'brann', need: 1, desc: 'Leve a maçã do Vovô Brann até Varkhaz. Furioso, ele não aceita nada: primeiro vença-o no ninho dos Picos de Cinza; a maçã é entregue na conversa logo depois. Então volte ao Vovô Brann.', reward: 'Maçã de Âmbar (amuleto lendário)', req: s => s.bosses.crypt,
    offer: () => [{ who: 'Vovô Brann', text: 'Essa macieira aqui do lado nasceu da semente daquela maçã. Leve uma pra ele. Se o dragão ainda lembrar de alguma coisa, vai lembrar disso.' }, { who: 'Vovô Brann', text: G.save.ended ? 'Ele não está mais no ninho, eu sei. Mas deixe a maçã aqui, ao pé da macieira. Onde quer que ele esteja, vai sentir o cheiro.' : 'Mas não chegue oferecendo fruta pra um dragão furioso, viu? Primeiro acalme ele. Quando o fogo baixar e ele conversar com você, a maçã fala por mim.', choices: [{ t: 'Eu levo.', fn: () => { startQuest('brann'); G.save.q.brann.p = 0; G.save.apple = true; writeSave(); if (G.save.ended && RG && RG.key === 'hub' && !inter.some(i => i.kind === 'appletree')) inter.push({ kind: 'appletree', x: 25, z: 51.4, r: 2.4 }); toast('VOCÊ RECEBEU: MAÇÃ DO VOVÔ', false, G.save.ended ? 'DEIXE NA MACIEIRA, AO LADO DO BRANN' : 'ENTREGUE A VARKHAZ DEPOIS DE VENCÊ-LO', '#ff8a6a'); } }, { t: 'Ainda não.' }] }],
    done: () => [{ who: 'Vovô Brann', text: G.save.q.brann.how === 'tree' ? 'A maçã sumiu da macieira? E deixou essa escama no lugar… Então ele sentiu. Ele lembrou.' : 'Ele lembrou? Do menino do morro? …Ele lembrou.' }, { who: 'Vovô Brann', text: 'Setenta anos eu guardei isso calado. Toma. Eu conservei essa maçã em âmbar desde aquele dia. Agora ela é sua.' }] },
};
function startQuest(id) { const s = G.save; s.q = s.q || {}; s.q[id] = { st: 'active', p: 0 }; writeSave(); toast(QUESTS[id].n.toUpperCase(), true, QUESTS[id].need > 1 || QUESTS[id].region ? 'siga a seta dourada no chão até cada item' : 'nova missão no diário'); sfx('frag'); if (id === 'nina') placeNina(); }
function placeNina() { const n = npcs.find(x => x.id === 'nina'); if (n) { n.x = 69; n.z = 14.5; n.wander = null; n.tg = null; n.moveAmt = 0; } }
function completeQuest(id) {
  const s = G.save; s.q[id].st = 'done'; s.perks = s.perks || {};
  if (id === 'mel') s.perks.mel = true;
  if (id === 'lio') s.perks.lio = true;
  if (id === 'brann') { const it = makeItem('charm', Math.max(3, regionTier()), 4); it.name = 'Maçã de Âmbar'; it.power = 'maca'; takeItem(it); s.q.brann.rew = true; }
  if (id === 'vara') { s.rod = true; setTimeout(() => toast('VARA DE PESCA', true, 'PESQUE NO LAGO E NO RIO DO PESQUEIRO', '#ffbf3d'), 1400); }
  if (id === 'ivo') { const it = makeItem('charm', 2, 3); it.name = 'Anzol de Prata'; it.st = { crit: 6, gold: 25 }; takeItem(it); }
  if (id === 'nina') { const it = makeItem('charm', 1, 1); it.name = 'Fita da Nina'; it.st = { spd: 7 }; takeItem(it); s.gold += 60; }
  if (P) P.maxHp = stats().maxHp;
  writeSave(); setTimeout(() => toast('MISSÃO CONCLUÍDA', true, QUESTS[id].n), 300); sfx('lvl');
}
function questLines(npcId) {
  const s = G.save; s.q = s.q || {};
  if (npcId === 'nina' && s.q.nina && s.q.nina.st === 'active') return [{ who: 'Nina', text: 'Ahhh, você me achou! Não conta pro Kiko onde eu tava, tá? Toma, minha fita da sorte.', fn: () => { completeQuest('nina'); const n = npcs.find(x => x.id === 'nina'); if (n) { n.x = 48; n.z = 26; n.wander = WANDER_KIDS; } } }];
  if (npcId === 'brann' && s.q.brann && s.q.brann.st === 'done' && !s.q.brann.rew) return [{ who: 'Vovô Brann', text: 'Você levou a maçã pra ele, não levou? Eu vi no seu rosto. Esqueci de te agradecer direito.' }, { who: 'Vovô Brann', text: 'Toma. Eu conservei aquela maçã em âmbar desde que era menino. Agora ela é sua.', fn: () => completeQuest('brann') }];
  for (const [id, Q] of Object.entries(QUESTS)) {
    if (Q.giver !== npcId) continue;
    const st = s.q[id];
    if (!st) { if (Q.req(s)) return Q.offer(); continue; }
    if (st.st === 'active' && Q.done && st.p >= Q.need) return Q.done().map((l, i, a) => i === a.length - 1 ? { ...l, fn: () => completeQuest(id) } : l);
    if (st.st === 'active' && id === 'vara') return [{ who: 'Pescador Ivo', text: `Achou as minhocas? Faltam ${Q.need - (st.p || 0)}. Elas soltam faísca no chão, perto das casas, do lago e da arena.` }];
    if (st.st === 'active' && Q.region) return [{ who: NPCS.find(n => n.id === npcId).name, text: `Ainda falta: ${Q.item} (${st.p}/${Q.need}). Procure no ${RNAME[Q.region]}, eles brilham no escuro.` }];
  }
  return null;
}
function collectQ(it) {
  const s = G.save, Q = QUESTS[it.qid], st = s.q[it.qid]; it.taken = true; st.p++; writeSave(); sfx('frag');
  for (let i = 0; i < 24; i++) { const a = rr(0, 6.28); spawn({ x: it.x, y: .6, z: it.z, vx: Math.cos(a) * 2, vy: rr(0, 3), vz: Math.sin(a) * 2, life: .6, s0: .1, s1: .02, b0: 1, b1: .2, mat: it.mat, drag: 2 }); }
  toast(`${Q.item} ${st.p}/${Q.need}`, false, st.p >= Q.need ? 'VOLTE PARA ' + NPCS.find(n => n.id === Q.giver).name.toUpperCase() : 'MISSÃO: ' + Q.n.toUpperCase(), '#9cf6ff');
}
function questListHTML() {
  const s = G.save, q = s.q || {}, out = [];
  for (const [id, Q] of Object.entries(QUESTS)) { const st = q[id]; if (!st) continue; const done = st.st === 'done'; out.push(`<div class="qrow"><div class="top"><b style="color:${done ? 'var(--dim)' : 'var(--bone)'}">${Q.n}</b><small>${done ? 'Concluída' : Q.need > 1 ? st.p + '/' + Q.need : 'Em andamento'}</small></div><small>${Q.desc}</small>${done ? '' : `<small>Recompensa: ${Q.reward}</small>`}</div>`); }
  (s.contracts || []).forEach(c => out.push(`<div class="qrow"><div class="top"><b>Contrato: ${c.text}</b><small>${Math.min(c.p, c.n)}/${c.n}</small></div><div class="prog"><i style="width:${Math.min(1, c.p / c.n) * 100}%"></i></div></div>`));
  return out.join('') || '<p class="sub">Nenhuma missão ainda. Converse com os moradores e veja o quadro de contratos perto dos portais.</p>';
}
function trackerHTML() {
  const s = G.save, out = []; if (!s) return '';
  for (const [id, Q] of Object.entries(QUESTS)) {
    const st = (s.q || {})[id]; if (!st || st.st !== 'active') continue;
    if (id === 'brann') { out.push(st.p >= 1 ? `<div class="ok">${Q.n}: volte ao Vovô Brann</div>` : `<div>${Q.n}: ${s.ended ? 'deixe a maçã na macieira ao lado do Brann' : !s.bosses.peaks ? 'vença Varkhaz nos Picos; entregue depois' : 'fale com Varkhaz no ninho dos Picos'}</div>`); continue; }
    if (id === 'nina') { out.push(`<div>${Q.n}: ache a Nina na vila</div>`); continue; }
    out.push(st.p >= Q.need ? `<div class="ok">${Q.n}: volte para ${NPCS.find(n => n.id === Q.giver).name}</div>` : `<div>${Q.n}: ${st.p}/${Q.need}</div>`);
  }
  const cs = s.contracts || [], done = cs.filter(c => c.p >= c.n).length;
  if (done) out.push(`<div class="ok">${done} contrato${done > 1 ? 's' : ''} pronto${done > 1 ? 's' : ''} no quadro</div>`);
  else { const c = cs.find(c2 => c2.p > 0); if (c) out.push(`<div>Contrato: ${Math.min(c.p, c.n)}/${c.n}</div>`); }
  // Passe do Tear: missões concluídas para resgatar e, com espaço, as que estão andando
  const free = !(G.save.ended && G.save.bosses.glass) ? 0 : 1, pass = typeof passTrackLines === 'function' ? passTrackLines(out.length < 2 ? 2 + free : 1) : [];
  return [...out.slice(0, 3), ...pass].slice(0, 3 + free).join('');
}

/* ---- grimório ---- */
function renderSkills() {
  const s = G.save, cls = G.char.cls, rs = RUNES[cls], cur = curRune();
  $('#kInfo').textContent = `Nível ${s.lvl}. Runas mudam como a sua habilidade funciona. Talentos são bônus passivos. Troque quando quiser, sem custo.`;
  const rb = $('#kRunes'); rb.innerHTML = '';
  rs.forEach((r, i) => { const b = document.createElement('button'), lock = s.lvl < r.lv; b.className = 'card'; b.disabled = lock; b.setAttribute('aria-pressed', i === cur); b.innerHTML = `<b>${r.n}</b><p>${lock ? 'Desbloqueia no nível ' + r.lv : r.d}</p>`; b.onclick = () => { s.rune = i; sfx('ui'); writeSave(); renderSkills(); }; rb.appendChild(b); });
  const slots = (s.lvl >= 5) + (s.lvl >= 10) + (s.lvl >= 15); s.talents = (s.talents || []).slice(0, slots);
  $('#kSlots').textContent = slots ? `· ${s.talents.length}/${slots} em uso` : '· primeiro espaço no nível 5';
  const tb = $('#kTal'); tb.innerHTML = '';
  TALENTS.forEach(T3 => { const b = document.createElement('button'), on = s.talents.includes(T3.id); b.className = 'card'; b.setAttribute('aria-pressed', on); b.disabled = !on && s.talents.length >= slots; b.innerHTML = `<b>${T3.n}</b><p>${T3.d}</p>`; b.onclick = () => { if (on) s.talents = s.talents.filter(x => x !== T3.id); else s.talents.push(T3.id); sfx('ui'); afterEquip(); renderSkills(); }; tb.appendChild(b); });
  const pts = Math.max(0, s.lvl - 15), pg = s.pgp = s.pgp || {}, used = Object.values(pg).reduce((a, b) => a + b, 0), box = $('#kPar'); box.innerHTML = '';
  if (s.lvl < 16) { box.innerHTML = '<p class="sub">A partir do nível 16, cada nível dá um Ponto de Tear para deixar você mais forte para sempre. As Fendas do Tear são o melhor lugar para subir.</p>'; return; }
  const p = document.createElement('p'); p.className = 'sub'; p.textContent = `${pts - used} ponto(s) livre(s).`; box.appendChild(p);
  for (const [k, n, d] of [['dmg', 'Força', '+1% de dano'], ['hp', 'Vitalidade', '+5 de vida'], ['crit', 'Precisão', '+0,5% de crítico'], ['cdr', 'Foco', '-1% na recarga (máximo 20)']]) {
    const row = document.createElement('div'); row.className = 'shoprow'; row.innerHTML = `<div class="nm">${n}<small>${d} · investido: ${pg[k] || 0}</small></div>`;
    const b = document.createElement('button'); b.className = 'px'; b.textContent = '+1'; b.disabled = used >= pts || (k === 'cdr' && (pg.cdr || 0) >= 20);
    b.onclick = () => { pg[k] = (pg[k] || 0) + 1; sfx('ui'); afterEquip(); renderSkills(); }; row.appendChild(b); box.appendChild(row);
  }
}

/* ---- fendas do tear ---- */
function renderRiftMenu() {
  const s = G.save, max = Math.min(60, (s.riftMax || 0) + 1), el = $('#rLvl'); el.max = max; if (+el.value > max) el.value = max;
  const L = +el.value, R0 = G.riftRoll || (G.riftRoll = rollRift()), aff = R0.aff.slice(0, riftAffN(L)), best = (s.riftBest || {})[L];
  $('#rLvlV').textContent = L;
  $('#rInfo').textContent = 'Um eco instável do mundo. Derrote inimigos e pegue os orbes azuis para encher a barra, vença o Guardião e leve os tesouros. Rank S em menos de 3 minutos, A em menos de 5: rank alto dá mais itens e mais Fios do Tear.';
  $('#rStats').innerHTML = [['Reino', RNAME[R0.base]], ['Guardião', BOSSDEF[R0.boss].name.split(',')[0]], ['Vida dos inimigos', '+' + Math.round(40 * (L - 1)) + '%'], ['Dano dos inimigos', '+' + Math.round(18 * (L - 1)) + '%'], ['Chance de lendário', Math.round(15 + 4 * L) + '%'], ['Melhor tempo', best ? fmtT(best.t) + ' · ' + best.rank : 'nenhum']].map(([a, b]) => `<div>${a}<b>${b}</b></div>`).join('');
  $('#rAff').innerHTML = aff.map(a => `<div class="qrow"><b style="color:#d7a6ff">${RAFF[a].n}</b><small>${RAFF[a].d}</small></div>`).join('') + (L < 6 ? '<p class="sub" style="margin:0;font-size:11px">Fendas de nível 6 ou mais têm 2 afixos, e de nível 12 ou mais, 3.</p>' : '');
  $('#rFios').textContent = s.fios || 0;
  const shop = $('#rShop'); shop.innerHTML = '';
  for (const [rar, cost, lbl] of [[-1, 8, 'Tecer ao acaso'], [3, 15, 'Tecer item Épico'], [4, 45, 'Tecer item Lendário']]) {
    const b = document.createElement('button'); b.className = 'px' + ((s.fios || 0) >= cost ? ' gold' : ''); b.textContent = `${lbl} (${cost} Fios)`; b.disabled = (s.fios || 0) < cost || s.inv.length >= BAG() || !!G.weave;
    b.onclick = () => { s.fios -= cost; const tier = 2 + Math.min(4, (s.riftMax || 0) * .3), r2 = rar >= 0 ? rar : Math.min(TI.rarCap(tier, 1), TI.rollRar(Math.random, 1.6 * curDiff().find, 1)); startWeave(makeItem(pick(['weapon', 'armor', 'charm']), tier, r2)); writeSave(); closeMenus(); }; shop.appendChild(b);
  }
}
/** Tear do Destino: os fios giram em volta do portal, convergem e o item nasce num clarão da cor da raridade. */
function startWeave(it) {
  const pt = inter.find(i => i.kind === 'riftportal'), x = pt ? pt.x : P.x, z = pt ? pt.z + 3.2 : P.z - 2;
  G.weave = { t: 0, it, x, z }; sfx('skill'); toast('O TEAR ESTÁ TECENDO…', false, '', '#c07bff');
}
function updateWeave(dt) {
  const W = G.weave; if (!W) return; W.t += dt;
  if (!W.done && W.t >= 2.2) { W.done = true; const r = RAR[W.it.rar]; burst(W.x, 1.6, W.z, 60, r.row, 6, .8, .14); G.shake = Math.max(G.shake, W.it.rar >= 3 ? .3 : .12); sfx(W.it.rar >= 4 ? 'legend' : W.it.rar >= 3 ? 'epic' : 'lvl'); takeItem(W.it); if (W.it.rar >= 3) hitStop(.08); }
  if (W.t >= 3) G.weave = null;
}
$('#rReroll').onclick = () => { sfx('ui'); G.riftRoll = rollRift(); renderRiftMenu(); };
$('#rLvl').oninput = renderRiftMenu;
$('#rGo').onclick = () => { const L = +$('#rLvl').value; closeMenus(); if (netGroupRift(L)) return; startRift(L); };
function genRiftLayout(base) {
  const B = REG[base], W = B.W, H = B.H, rect = base === 'crypt' || base === 'glass', pool = !rect, cols = 4, rows = 3, cw = (W - 8) / cols, ch = (H - 22) / rows, startCol = Math.floor(rr(0, cols)), cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const st = r === rows - 1 && c === startCol; if (!st && Math.random() < .2) continue;
    const x = 4 + cw * (c + .5) + rr(-cw * .22, cw * .22), y = 19 + ch * (r + .5) + rr(-ch * .15, ch * .15), sz = rr(2.6, 3.9);
    const rm = rect ? { x, y, w: rr(2.4, 4.2), h: rr(2, 3), shape: 'rect' } : { x, y, r: sz, pool: pool && sz > 3.3 && Math.random() < .5 };
    if (st) { rm.kind = 'start'; if (rect) { rm.w = 3; rm.h = 2.5; } else { rm.r = 3; rm.pool = false; } } else rm.en = { x: Math.round(3 + Math.random() * 3) };
    cells.push({ r, c, rm, st });
  }
  cells.sort((a, b) => (b.st ? 1 : 0) - (a.st ? 1 : 0));
  const rooms = cells.map(q => q.rm), links = [], con = [0], left = rooms.map((_, i) => i).slice(1), D = (a, b) => Math.hypot(rooms[a].x - rooms[b].x, (rooms[a].y - rooms[b].y) * 1.3);
  while (left.length) { let best = null; for (const i of left) for (const j of con) { const d = D(i, j) + Math.random() * 2; if (!best || d < best[2]) best = [i, j, d]; } links.push([best[1], best[0]]); con.push(best[0]); left.splice(left.indexOf(best[0]), 1); }
  for (let k = 0; k < 2; k++) { const a = Math.floor(rr(1, rooms.length)), b = Math.floor(rr(1, rooms.length)); if (a !== b && D(a, b) < cw * 1.6 && !links.some(l => (l[0] === a && l[1] === b) || (l[0] === b && l[1] === a))) links.push([a, b]); }
  const mids = rooms.map((r, i) => i).filter(i => i > 0 && rooms[i].y > 19 + ch && rooms[i].y < 19 + ch * 2.2); const sh = mids.length ? pick(mids) : (rooms.length > 2 ? 1 : -1);
  if (sh > 0) { delete rooms[sh].en; rooms[sh].kind = 'shrine'; if (!rect) { rooms[sh].r = 3; rooms[sh].pool = false; } }
  const bx = W / 2 + rr(-7, 7); rooms.push({ x: bx, y: 8, r: rr(6.3, 7), kind: 'boss' });
  let nb = 0, nd = 1e9; rooms.forEach((r, i) => { if (r.kind === 'boss') return; const d = Math.hypot(r.x - bx, r.y - 8); if (d < nd) { nd = d; nb = i; } }); links.push([nb, rooms.length - 1]);
  return { rooms, links };
}
function startRift(L) {
  const R0 = G.riftRoll || rollRift(), base = R0.base, B = REG[base], types = RTYPES[base], aff = R0.aff.slice(0, riftAffN(L)), mult = aff.includes('abundante') ? 2.25 : 1.5;
  const LAY = genRiftLayout(base);
  const rooms = LAY.rooms.map(r => { const n = { ...r }; delete n.frag; delete n.chest; if (r.en) { const tot = Object.values(r.en).reduce((a, b) => a + b, 0), cnt = Math.round(tot * mult + L * .15); n.en = {}; for (let i = 0; i < cnt; i++) { const t2 = pick(types); n.en[t2] = (n.en[t2] || 0) + 1; } } else if (!r.kind) n.en = { [types[0]]: 2 + Math.floor(L / 3), [types[1]]: 2 }; return n; });
  REG.rift = { ...B, name: `Fenda do Tear · Nível ${L}`, sub: aff.map(a => RAFF[a].n).join(' · ') + ' · mapa nunca visto', seed: Math.floor(rr(1, 99999)), rooms, links: LAY.links, boss: R0.boss };
  G.rift = { L, base, prog: 0, t: 0, bossUp: false, done: false, aff, boss: R0.boss, dm: (1 + .18 * (L - 1)) * (aff.includes('sangrenta') ? 1.25 : 1), hm: (1 + .4 * (L - 1)) * (aff.includes('fortificada') ? 1.4 : 1) };
  G.riftRoll = null;
  travel('rift');
}
function finishRift(b) {
  missionEvent('rift'); missionEvent('boss');
  const R = G.rift, L = R.L, s = G.save; R.done = true;
  const rank = R.t < 180 ? 'S' : R.t < 300 ? 'A' : R.t < 480 ? 'B' : 'C';
  gainXp(Math.round(90 * (1 + .3 * L))); dropGold(b.x, b.z, 20 + 6 * L);
  const n = 2 + Math.floor(L / 3) + ({ S: 2, A: 1, B: 0, C: 0 })[rank] + (R.aff.includes('fortificada') ? 1 : 0);
  for (let i = 0; i < n; i++) dropItem(b.x + rr(-2, 2), b.z + rr(-1, 2), i === 0 && Math.random() < .15 + .04 * L + (rank === 'S' ? .15 : 0) ? 4 : rollRar(L >= 5 ? 2 : 1));
  const fios = Math.round((2 + L) * ({ S: 2, A: 1.5, B: 1, C: .7 })[rank]); s.fios = (s.fios || 0) + fios + (hasF('altar') ? Math.round(fios * .25) : 0);
  if (!R.cave) { s.riftMax = Math.max(s.riftMax || 0, L); s.riftBest = s.riftBest || {}; if (!s.riftBest[L] || R.t < s.riftBest[L].t) s.riftBest[L] = { t: R.t, rank }; }   // covil dos Ermos não conta como recorde de Fenda
  const st2 = s.st = s.st || {}; st2.gk = [...new Set([...(st2.gk || []), R.boss])].filter(k => ['spider', 'knight', 'eye'].includes(k)); if (rank === 'S') st2.rankS = (st2.rankS || 0) + 1;
  contractEvent('rift', L);
  endBossFight(true); boss = null;
  inter.push({ kind: 'portal', to: R.cave ? 'wilds' : 'hub', exit: !!R.cave, x: b.room.wx, z: b.room.wz, r: 2, model: getModel('portal'), anim: newAnim(getModel('portal')), lit: true, yaw: 0 });
  writeSave(); updateObjective();
  toast(`FENDA ${L} · RANK ${rank}`, true, `tempo ${fmtT(R.t)} · +${fios} Fios do Tear`, { S: '#ffbf3d', A: '#c07bff', B: '#5aa2ff', C: '#d8d2c4' }[rank]);
}

