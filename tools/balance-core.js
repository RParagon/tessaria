// Núcleo do simulador de equilíbrio entre classes.
// Gera o código que roda DENTRO do escopo do jogo (via __T.ev, disponível no
// build de teste). Mede, no mesmo nível e sem itens:
//  - dano por segundo contra um boneco de treino (alvo único e grupo de 8)
//  - tempo para limpar uma onda real (6 esqueletos + 4 morcegos) e dano recebido
//  - tempo contra o Guardião de Musgo e dano recebido
// A IA é simples: aproxima ou mantém distância, ataca, usa a habilidade quando
// pronta e esquiva de avisos prestes a explodir.

export const CLASSES = ['lamina', 'arcano', 'arco'];

export function simSource(level) {
  return `(async () => {
  const LV = ${Number(level)};
  const s = G.save; s.lvl = LV; Object.assign(s.bosses, { forest: true, crypt: true }); Object.assign(s.met, { ysolde: true, ysolde2: true, desf2: true });
  let TAKEN = 0; const _hurt = hurtPlayer;
  hurtPlayer = (...a) => { const h0 = P.hp; const r = _hurt(...a); TAKEN += Math.max(0, h0 - P.hp); P.hp = 1e6; return r; };
  const melee = G.char.cls === 'lamina';
  const ai = () => {
    let tx = null, tz = null, bd = 1e9;
    for (const e of enemies) { if (e.dieT >= 0 || e.spawnT > 0) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; tx = e.x; tz = e.z; } }
    if (boss && !boss.dying) { const d = Math.hypot(boss.x - P.x, boss.z - P.z); if (d < bd + 4) { bd = d; tx = boss.x; tz = boss.z; } }
    keys.clear(); input.atk = false; if (tx === null) return;
    const want = melee ? (boss ? 3.2 : 1.6) : 7, dx = tx - P.x, dz = tz - P.z, dir = bd > want + .5 ? 1 : bd < want - 2 ? -1 : 0;
    if (dir) { const ux = dx / bd * dir, uz = dz / bd * dir; if (ux > .35) keys.add('KeyD'); if (ux < -.35) keys.add('KeyA'); if (uz > .35) keys.add('KeyS'); if (uz < -.35) keys.add('KeyW'); }
    P.yaw = Math.atan2(dx, dz);
    if (bd < (melee ? 4 : 12)) input.atk = true;
    if (P.skillCd <= 0 && bd < (melee ? 3.2 : 10)) doSkill();
    if (P.dashCd <= 0 && tels.some(t => t.t / t.dur > .6 && Math.hypot(t.x - P.x, t.z - P.z) < (t.r || t.len || 3))) doDash();
  };
  const step = dt => { G.time += dt; s.xp = -1e9; ai(); updatePlayer(dt); for (const e of enemies) updateEnemy(e, dt); enemies = enemies.filter(e => !e.dead); if (boss) updateBoss(boss, dt); updateProjectiles(dt); updateTelegraphs(dt); updatePickups(dt); updateLater(dt); updateZones(dt); for (const k in G.buffs) G.buffs[k] -= dt; if (G.mode === 'dialog') { DLG.q = []; nextLine(); } };
  const yieldUI = () => new Promise(r => setTimeout(r, 0));
  const run = async (setup, done, maxT) => {
    setup(); P.maxHp = 1e6; P.hp = 1e6; P.dieT = -1; TAKEN = 0; let t = 0;
    while (t < maxT && !done()) { for (let k = 0; k < 40; k++) { step(.05); t += .05; } await yieldUI(); }
    return { t: +t.toFixed(1), taken: Math.round(TAKEN), ok: done() };
  };
  const dummy = async n => {
    loadRegion('crypt'); G.mode = 'play'; const R = RG.rooms[3]; RG.rooms.forEach(r => r.spawned = true);
    P.x = R.wx; P.z = R.wz + 7; P.maxHp = 1e6; P.hp = 1e6; P.skillCd = 0;
    const D = []; for (let i = 0; i < n; i++) { const a = i / n * 6.28, r0 = n > 1 ? 1.6 : 0, e = spawnEnemy('gosmo', R.wx + Math.cos(a) * r0, R.wz + Math.sin(a) * r0, 0); e.spawnT = 0; e.hp = e.maxHp = 1e7; e.cd = 1e9; e.spdMul = 0; e.def = { ...e.def, dmg: 0, r: .55 }; D.push(e); }
    let t = 0; while (t < 30) { for (let k = 0; k < 40; k++) { step(.05); t += .05; for (const e of D) { e.cd = 1e9; e.kx = e.kz = 0; } } await yieldUI(); }
    return Math.round(D.reduce((a, e) => a + (1e7 - e.hp), 0) / 30);
  };
  document.querySelectorAll('#marks,#toast').forEach(e => e.style.display = 'none');
  const out = { single: await dummy(1), group: await dummy(8), waves: [], boss: [] };
  for (let i = 0; i < 3; i++) {
    loadRegion('crypt'); G.mode = 'play'; const R = RG.rooms[3];
    out.waves.push(await run(() => { P.x = R.wx; P.z = R.wz + 6; for (let k = 0; k < 6; k++) spawnEnemy('skel', R.wx + Math.cos(k) * 4, R.wz + Math.sin(k) * 3, 0).spawnT = 0; for (let k = 0; k < 4; k++) spawnEnemy('bat', R.wx + Math.cos(k * 2) * 5, R.wz - 3, 0).spawnT = 0; RG.rooms.forEach(r => r.spawned = true); }, () => !enemies.some(e => e.dieT < 0), 120));
  }
  for (let i = 0; i < 2; i++) {
    loadRegion('forest'); G.mode = 'play'; G.rematch = true; const R = RG.rooms.find(r => r.kind === 'boss'); RG.rooms.forEach(r => r.spawned = true);
    out.boss.push(await run(() => { P.x = R.wx; P.z = R.wz + 6; startBoss(R); boss.spawnT = 0; G.cine = null; if (G.mode === 'dialog') { DLG.q = []; nextLine(); } G.mode = 'play'; }, () => !boss || boss.dying, 240));
    boss = null; G.rematch = false;
  }
  hurtPlayer = _hurt;
  const avg = (a, k) => +(a.reduce((x, y) => x + y[k], 0) / a.length).toFixed(1);
  return { dps_alvo: out.single, dps_grupo8: out.group, onda_s: avg(out.waves, 't'), onda_dano: avg(out.waves, 'taken'), chefe_s: avg(out.boss, 't'), chefe_dano: avg(out.boss, 'taken') };
})()`;
}
