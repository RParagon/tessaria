/* Fios de Tessária · Jogador: movimento, ataques, colisão */
/* =========================================================
   JOGADOR
   ========================================================= */
let playerModel = null;
function rebuildPlayerModel() {
  if (playerModel) freeVAO(playerModel);
  const eq = (G.mode !== 'create' || G.wardrobe) && G.save && G.save.eq ? G.save.eq : {};   // no guarda-roupa, com o equipamento
  const r = buildHumanoid({ ...G.char, seed: 7, armor: eq.armor ? eq.armor.rar : undefined, charm: eq.charm ? eq.charm.rar : undefined }, 0, true), v = makeVAO(r.data);   // o seu herói em alta definição
  playerModel = Object.assign(r, { vao: v.vao, buf: v.buf, count: v.count, data: null });
  if (P) P.anim = newAnim(playerModel);
}
function makePlayer(x, z) {
  const st = stats();
  P = { x, z, y: 0, vx: 0, vz: 0, kx: 0, kz: 0, yaw: Math.PI, hp: st.maxHp, maxHp: st.maxHp, walkPh: 0, moveAmt: 0, act: null, actT: 0, atkCd: 0, skillCd: 0, dashCd: 0, dashT: 0, dashX: 0, dashZ: 1, iframe: 0, dieT: -1, aimT: -9, aimYaw: 0, flash: 0, anim: newAnim(playerModel) };
}
function aimDir() {
  if (!G.touch && G.time - input.mouseT < 3 && VP) {
    const r = canvas.getBoundingClientRect(), nx = (input.mouseX - r.left) / r.width * 2 - 1, ny = 1 - (input.mouseY - r.top) / r.height * 2;
    const g = groundFromScreen(nx, ny); if (g) { const dx = g[0] - P.x, dz = g[1] - P.z, l = Math.hypot(dx, dz); if (l > .3) return [dx / l, dz / l]; }
  }
  let best = null, bd = 11;
  for (const e of enemies) { if (e.dieT >= 0 || e.spawnT > 0) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; best = [e.x, e.z]; } }
  if (boss && !boss.dying) for (const h of bossHits(boss)) { const d = Math.hypot(h[0] - P.x, h[1] - P.z) - h[2]; if (d < bd) { bd = d; best = [h[0], h[1]]; } }
  if (best) { const dx = best[0] - P.x, dz = best[1] - P.z, l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; }
  return [Math.sin(P.yaw), Math.cos(P.yaw)];
}
let invVP = null;
function invert4(m) {
  const inv = new Float32Array(16), a = m;
  inv[0] = a[5] * a[10] * a[15] - a[5] * a[11] * a[14] - a[9] * a[6] * a[15] + a[9] * a[7] * a[14] + a[13] * a[6] * a[11] - a[13] * a[7] * a[10];
  inv[4] = -a[4] * a[10] * a[15] + a[4] * a[11] * a[14] + a[8] * a[6] * a[15] - a[8] * a[7] * a[14] - a[12] * a[6] * a[11] + a[12] * a[7] * a[10];
  inv[8] = a[4] * a[9] * a[15] - a[4] * a[11] * a[13] - a[8] * a[5] * a[15] + a[8] * a[7] * a[13] + a[12] * a[5] * a[11] - a[12] * a[7] * a[9];
  inv[12] = -a[4] * a[9] * a[14] + a[4] * a[10] * a[13] + a[8] * a[5] * a[14] - a[8] * a[6] * a[13] - a[12] * a[5] * a[10] + a[12] * a[6] * a[9];
  inv[1] = -a[1] * a[10] * a[15] + a[1] * a[11] * a[14] + a[9] * a[2] * a[15] - a[9] * a[3] * a[14] - a[13] * a[2] * a[11] + a[13] * a[3] * a[10];
  inv[5] = a[0] * a[10] * a[15] - a[0] * a[11] * a[14] - a[8] * a[2] * a[15] + a[8] * a[3] * a[14] + a[12] * a[2] * a[11] - a[12] * a[3] * a[10];
  inv[9] = -a[0] * a[9] * a[15] + a[0] * a[11] * a[13] + a[8] * a[1] * a[15] - a[8] * a[3] * a[13] - a[12] * a[1] * a[11] + a[12] * a[3] * a[9];
  inv[13] = a[0] * a[9] * a[14] - a[0] * a[10] * a[13] - a[8] * a[1] * a[14] + a[8] * a[2] * a[13] + a[12] * a[1] * a[10] - a[12] * a[2] * a[9];
  inv[2] = a[1] * a[6] * a[15] - a[1] * a[7] * a[14] - a[5] * a[2] * a[15] + a[5] * a[3] * a[14] + a[13] * a[2] * a[7] - a[13] * a[3] * a[6];
  inv[6] = -a[0] * a[6] * a[15] + a[0] * a[7] * a[14] + a[4] * a[2] * a[15] - a[4] * a[3] * a[14] - a[12] * a[2] * a[7] + a[12] * a[3] * a[6];
  inv[10] = a[0] * a[5] * a[15] - a[0] * a[7] * a[13] - a[4] * a[1] * a[15] + a[4] * a[3] * a[13] + a[12] * a[1] * a[7] - a[12] * a[3] * a[5];
  inv[14] = -a[0] * a[5] * a[14] + a[0] * a[6] * a[13] + a[4] * a[1] * a[14] - a[4] * a[2] * a[13] - a[12] * a[1] * a[6] + a[12] * a[2] * a[5];
  inv[3] = -a[1] * a[6] * a[11] + a[1] * a[7] * a[10] + a[5] * a[2] * a[11] - a[5] * a[3] * a[10] - a[9] * a[2] * a[7] + a[9] * a[3] * a[6];
  inv[7] = a[0] * a[6] * a[11] - a[0] * a[7] * a[10] - a[4] * a[2] * a[11] + a[4] * a[3] * a[10] + a[8] * a[2] * a[7] - a[8] * a[3] * a[6];
  inv[11] = -a[0] * a[5] * a[11] + a[0] * a[7] * a[9] + a[4] * a[1] * a[11] - a[4] * a[3] * a[9] - a[8] * a[1] * a[7] + a[8] * a[3] * a[5];
  inv[15] = a[0] * a[5] * a[10] - a[0] * a[6] * a[9] - a[4] * a[1] * a[10] + a[4] * a[2] * a[9] + a[8] * a[1] * a[6] - a[8] * a[2] * a[5];
  const det = a[0] * inv[0] + a[1] * inv[4] + a[2] * inv[8] + a[3] * inv[12]; if (!det) return null;
  for (let i = 0; i < 16; i++) inv[i] /= det; return inv;
}
function groundFromScreen(nx, ny) {
  if (!invVP) return null;
  const un = (z) => { const x = invVP[0] * nx + invVP[4] * ny + invVP[8] * z + invVP[12], y = invVP[1] * nx + invVP[5] * ny + invVP[9] * z + invVP[13], zz = invVP[2] * nx + invVP[6] * ny + invVP[10] * z + invVP[14], w = invVP[3] * nx + invVP[7] * ny + invVP[11] * z + invVP[15]; return [x / w, y / w, zz / w]; };
  const a = un(-1), b = un(1), d = V.sub(b, a); if (Math.abs(d[1]) < 1e-6) return null;
  const t = (1 - a[1]) / d[1]; if (t < 0) return null;
  return [a[0] + d[0] * t, a[2] + d[2] * t];
}
function collide(e, r) {
  for (let it = 0; it < 2; it++) {
    const tx0 = Math.floor((e.x - r) / T), tx1 = Math.floor((e.x + r) / T), tz0 = Math.floor((e.z - r) / T), tz1 = Math.floor((e.z + r) / T);
    for (let tz = tz0; tz <= tz1; tz++) for (let tx = tx0; tx <= tx1; tx++) {
      if (!blocked(tx, tz)) continue;
      const cx = clamp(e.x, tx * T, tx * T + T), cz = clamp(e.z, tz * T, tz * T + T), dx = e.x - cx, dz = e.z - cz, d = Math.hypot(dx, dz);
      if (d < r) {
        if (d < 1e-5) {
          const fx = e.x - tx * T, fz = e.z - tz * T, opts = [[fx, -1, 0, tx - 1, tz], [T - fx, 1, 0, tx + 1, tz], [fz, 0, -1, tx, tz - 1], [T - fz, 0, 1, tx, tz + 1]].filter(o => !blocked(o[3], o[4])).sort((a, b) => a[0] - b[0]);
          if (opts.length) { const o = opts[0]; e.x += o[1] * (o[0] + r); e.z += o[2] * (o[0] + r); } else if (e.safeX !== undefined) { e.x = e.safeX; e.z = e.safeZ; }
        } else { e.x += dx / d * (r - d); e.z += dz / d * (r - d); }
      }
    }
  }
}
function moveSafe(e, dx, dz, r) {
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (r * .6)));
  for (let i = 0; i < n; i++) { e.x += dx / n; collide(e, r); e.z += dz / n; collide(e, r); }
  unstuck(e);
}
function unstuck(e) {
  if (!RG) return;
  e.x = clamp(e.x, T * .5, (RG.W - .5) * T); e.z = clamp(e.z, T * .5, (RG.H - .5) * T);
  if (blocked(Math.floor(e.x / T), Math.floor(e.z / T))) { if (e.safeX !== undefined) { e.x = e.safeX; e.z = e.safeZ; } }
  else { e.safeX = e.x; e.safeZ = e.z; }
}
function updatePlayer(dt) {
  const st = stats();
  if (P.dieT >= 0) { P.dieT += dt; if (P.dieT > 1.6 && !G.respawning) respawn(); return; }
  if (P.down > 0) { coopDownTick(dt); return; }   // co-op: Caído
  let ix = 0, iz = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) iz -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) iz += 1;
  if (input.joy.on) { ix += input.joy.x; iz += input.joy.y; }
  const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
  updateUlt(dt);
  P.atkCd -= dt; P.skillCd -= dt; P.dashCd -= dt; P.iframe -= dt; P.actT += dt; P.flash = Math.max(0, P.flash - dt * 6); P.slowT = (P.slowT || 0) - dt;
  if (P.act && P.actT > ({ swing: .3, cast: .3, shoot: .25, spin: .5, nova: .45, dash: .18, hurt: .25, volley: .3 }[P.act] || .3)) P.act = null;
  if (P.dashT > 0) {
    P.dashT -= dt; moveSafe(P, P.dashX * 17 * dt, P.dashZ * 17 * dt, .4); if (P.dashT <= 0) P.landT = .15;
    (P.ghosts || (P.ghosts = [])).push({ x: P.x, z: P.z, yaw: P.yaw, t: 0 }); if (P.ghosts.length > 5) P.ghosts.shift();
    if (Math.random() < .8) spawn({ x: P.x + rr(-.2, .2), y: rr(.3, 1.4), z: P.z + rr(-.2, .2), life: .3, s0: .14, s1: .02, b0: .7, b1: .1, mat: 7 });
  } else {
    const sp = st.spd * (P.act === 'spin' ? .6 : 1) * (P.slowT > 0 ? .6 : 1);
    P.vx = lerp(P.vx, ix * sp, 1 - Math.exp(-dt * 14)); P.vz = lerp(P.vz, iz * sp, 1 - Math.exp(-dt * 14));
    const kl = Math.hypot(P.kx, P.kz); if (kl > 16) { P.kx *= 16 / kl; P.kz *= 16 / kl; }
    moveSafe(P, (P.vx + P.kx) * dt, (P.vz + P.kz) * dt, .4);
  }
  P.kx *= Math.exp(-dt * 7); P.kz *= Math.exp(-dt * 7);
  collide(P, .4);
  if (boss && !boss.dying) for (const h of bossHits(boss)) { const dx = P.x - h[0], dz = P.z - h[1], d = Math.hypot(dx, dz), m = h[2] + .4; if (d < m && d > 1e-4) { moveSafe(P, dx / d * (m - d), dz / d * (m - d), .4); } }
  unstuck(P);
  const spd = Math.hypot(P.vx, P.vz);
  P.moveAmt = lerp(P.moveAmt, clamp(spd / st.spd, 0, 1), 1 - Math.exp(-dt * 10));
  P.walkPh += dt * spd * 2.1;
  P.landT = (P.landT || 0) - dt;
  if (P.ghosts) { for (const g of P.ghosts) g.t += dt; P.ghosts = P.ghosts.filter(g => g.t < .25); }
  { const stepN = Math.floor(P.walkPh / Math.PI); if (stepN !== P.lastStep) { P.lastStep = stepN; if (P.moveAmt > .55 && P.dashT <= 0) { const sd = stepN % 2 ? .15 : -.15, cx = Math.cos(P.yaw), sx2 = -Math.sin(P.yaw); for (let i = 0; i < 3; i++) spawn({ x: P.x + cx * sd + rr(-.08, .08), y: .08, z: P.z + sx2 * sd + rr(-.08, .08), vx: rr(-.3, .3), vy: rr(.2, .5), vz: rr(-.3, .3), life: rr(.3, .5), s0: .09, s1: .18, b0: .3, b1: .05, mat: 120, drag: 2 }); } } }
  let want = P.yaw;
  if (G.time - P.aimT < .45) want = P.aimYaw; else if (spd > .5) want = Math.atan2(P.vx, P.vz);
  const pyaw = P.yaw; P.yaw += angDiff(P.yaw, want) * (1 - Math.exp(-dt * 16));
  P.lean = lerp(P.lean || 0, clamp(-angDiff(pyaw, P.yaw) / Math.max(dt, .001) * .05, -.25, .25) * P.moveAmt, .2);
  P.idleT = (P.moveAmt < .1 && !P.act && G.time - P.aimT > 1) ? (P.idleT || 0) + dt : 0;
  P.cls = G.char.cls;
  const ranged = P.cls !== 'lamina';
  P.stance = lerp(P.stance || 0, ranged && (G.time - P.aimT < .5 || input.atk) && P.dashT <= 0 ? 1 : 0, 1 - Math.exp(-dt * 16));
  if (P.cls === 'arcano' && P.stance > .3) rate('charge', 24, dt, () => { const tip = handPos('staff'), a = rr(0, 6.28), r = rr(.3, .55); spawn({ x: tip[0] + Math.cos(a) * r, y: tip[1] + rr(-.3, .3), z: tip[2] + Math.sin(a) * r, vx: -Math.cos(a) * r * 5, vz: -Math.sin(a) * r * 5, life: .2, s0: .08, s1: .03, b0: .8, b1: 1, mat: 7 }); });
  if (input.atk && P.atkCd <= 0) doAttack();
}
function setAim() { const d = aimDir(); P.aimYaw = Math.atan2(d[0], d[1]); P.aimT = G.time; P.yaw = P.aimYaw; return d; }
function doAttack() {
  if (G.mode !== 'play' || P.dieT >= 0 || P.down > 0) return;
  const st = stats(), cls = G.char.cls, d = setAim();
  P.atkCd = st.atkCd; P.actT = 0; P.fxSkill = false;
  const crit = () => Math.random() < stats().crit;
  if (cls === 'lamina') {
    P.combo = (G.time - (P.lastSwing || -9) < .8) ? ((P.combo || 0) + 1) % 3 : 0; P.lastSwing = G.time;
    const heavy = P.combo === 2, from = P.combo === 1 ? 1 : -1;
    P.act = 'swing'; sfx('swing'); P.atkCd = st.atkCd * (heavy ? 1.35 : 1);
    for (let i = 0; i < 22; i++) { const k = i / 21, a = P.yaw + from * (1.25 - k * 2.5) * (heavy ? .55 : 1), r = heavy ? rr(1.2, 2.7) : rr(1.4, 2.3); spawn({ x: P.x + Math.sin(a) * r, y: heavy ? lerp(1.9, .3, k) : rr(.75, 1.15), z: P.z + Math.cos(a) * r, vx: Math.sin(a) * 2.5, vz: Math.cos(a) * 2.5, life: .12 + k * .1, s0: heavy ? .26 : .2, s1: .04, b0: 1, b1: .25, mat: 7 }); }
    G.later.push({ t: .07, fn: () => { meleeHit(heavy ? 2.9 : 2.5, heavy ? .85 : 1.25, st.dmg * (heavy ? 1.6 : 1), d); if (heavy) { G.shake = Math.max(G.shake, .14); hitStop(.05); burst(P.x + d[0] * 1.9, .2, P.z + d[1] * 1.9, 18, 7, 3.5, .35, .14); } } });
  } else if (cls === 'arcano') {
    P.act = 'cast'; sfx('shoot');
    const tip = handPos('staff');
    burst(tip[0], tip[1], tip[2], 10, 7, 2.5, .22, .12);
    shoot({ x: tip[0], y: Math.max(1.0, tip[1]), z: tip[2], vx: d[0] * 14, vz: d[1] * 14, life: .95, dmg: st.dmg, team: 'p', mat: 7, size: .36, r: .4, homing: 4.5, trail: 1, bolt: true });
  } else {
    P.act = 'shoot'; sfx('bow');
    const bow = handPos('bow');
    for (let i = 0; i < 6; i++) spawn({ x: bow[0], y: bow[1], z: bow[2], vx: d[0] * rr(1, 3) + rr(-.5, .5), vy: rr(-.3, .6), vz: d[1] * rr(1, 3) + rr(-.5, .5), life: .18, s0: .1, s1: .02, b0: 1, b1: .2, mat: 7 });
    shoot({ x: bow[0], y: Math.max(.9, bow[1]), z: bow[2], vx: d[0] * 22, vz: d[1] * 22, life: .7, dmg: st.dmg, team: 'p', mat: 7, size: .2, r: .35, pierce: 2, trail: .35, arrow: true });
    P.shotN = (P.shotN || 0) + 1; if (hasPow('agulhas') && P.shotN % 5 === 0) for (const off of [-.36, -.18, .18, .36]) { const a = Math.atan2(d[0], d[1]) + off; shoot({ x: bow[0], y: Math.max(.9, bow[1]), z: bow[2], vx: Math.sin(a) * 22, vz: Math.cos(a) * 22, life: .7, dmg: st.dmg * .8, team: 'p', mat: 124, size: .2, r: .35, pierce: 2, trail: .5, arrow: true }); }
  }
}
function handPos(which) {
  if (!P || !P.W) return [P ? P.x : 0, 1.2, P ? P.z : 0];
  const bw = [.86, 1, 1.18][G.char.body ?? 1];
  return which === 'staff' ? tp(P.W[8], [-.38 * bw, .85 + 1.1, .06]) : tp(P.W[9] || P.W[4], [.38 * bw + .02, .85, .1]);
}
function meleeHit(range, arc, dmg, d) {
  const yaw = Math.atan2(d[0], d[1]);
  for (const e of enemies) {
    if (e.dieT >= 0 || e.spawnT > 0) continue;
    const dx = e.x - P.x, dz = e.z - P.z, dist = Math.hypot(dx, dz) - e.def.r * e.scale;
    if (dist > range) continue;
    if (Math.abs(angDiff(yaw, Math.atan2(dx, dz))) > arc && dist > .4) continue;
    const c = Math.random() < stats().crit; hurtEnemy(e, dmg * (c ? stats().critMul : 1), dx, dz, c); if (c && hasPow('sol')) solBurst(e.x, e.z, dmg);
  }
  pvpArea(P.x, P.z, range, dmg, yaw, arc);   // Ermo Profundo: outros jogadores (não amigos)
  if (boss && !boss.dying) {
    for (const h of bossHits(boss)) {
      const dx = h[0] - P.x, dz = h[1] - P.z, dist = Math.hypot(dx, dz) - h[2];
      if (dist > range || (Math.abs(angDiff(yaw, Math.atan2(dx, dz))) > arc && dist > .4)) continue;
      const c = Math.random() < stats().crit; hurtBoss(boss, dmg * (c ? stats().critMul : 1), c, h); break;
    }
  }
}
function doDash() {
  if (G.mode !== 'play' || P.dieT >= 0 || P.down > 0 || P.dashCd > 0) return;
  let ix = 0, iz = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) iz -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) iz += 1;
  if (input.joy.on) { ix += input.joy.x; iz += input.joy.y; }
  if (Math.hypot(ix, iz) < .2) { ix = Math.sin(P.yaw); iz = Math.cos(P.yaw); }
  const l = Math.hypot(ix, iz); P.dashX = ix / l; P.dashZ = iz / l;
  P.dashT = .17; P.iframe = .3; P.dashCd = stats().dashCd; P.act = 'dash'; P.actT = 0; P.yaw = Math.atan2(P.dashX, P.dashZ);
  sfx('dash');
  if (hasPow('desfiado')) { const x = P.x, z = P.z; tels.push({ kind: 'circle', x, z, r: 2.2, t: 0, dur: .5, mat: 7, fn: () => { burst(x, .5, z, 30, 7, 5, .5, .18); sfx('boom'); aoeDamage(x, z, 2.4, stats().dmg * 1.5); } }); }
}
function doSkill() {
  if (G.mode !== 'play' || P.dieT >= 0 || P.down > 0 || P.skillCd > 0) return;
  const st = stats(), cls = G.char.cls, rn = curRune(); P.skillCd = st.skillCd; P.actT = 0; P.fxSkill = true; sfx('skill');
  if (cls === 'lamina') {
    P.act = 'spin'; P.iframe = .35; const R2 = rn === 2 ? 4.6 : 3.5;
    if (rn === 2) for (const e of enemies) { if (e.dieT >= 0 || e.spawnT > 0) continue; const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz); if (d < 7.5 && d > 1.2) { e.x += dx / d * (d - 1.2) * .7; e.z += dz / d * (d - 1.2) * .7; collide(e, e.def.r * e.scale); } }
    for (let i = 0; i < 70; i++) { const a = i / 70 * 6.28; spawn({ x: P.x + Math.cos(a) * 1.2, y: rr(.4, 1.3), z: P.z + Math.sin(a) * 1.2, vx: Math.cos(a) * R2 * 1.4, vz: Math.sin(a) * R2 * 1.4, life: rr(.3, .5), s0: .22, s1: .05, b0: 1, b1: .2, mat: 7, drag: 3 }); }
    let hits = 0;
    for (const e of enemies) { if (e.dieT >= 0 || e.spawnT > 0) continue; const dx = e.x - P.x, dz = e.z - P.z; if (Math.hypot(dx, dz) - e.def.r * e.scale < R2) { hurtEnemy(e, st.dmg * 2.4, dx, dz, false, 1.6); hits++; } }
    pvpArea(P.x, P.z, R2, st.dmg * 2.4);
    if (boss && !boss.dying) for (const h of bossHits(boss)) if (Math.hypot(h[0] - P.x, h[1] - P.z) - h[2] < R2) { hurtBoss(boss, st.dmg * 2.4, false, h); hits++; break; }
    if (rn === 1) G.zones.push({ x: P.x, z: P.z, r: 3.2, t: 0, dur: 3, dmg: st.dmg * .45, tick: 0, team: 'p' });
    if (rn === 3 && hits) { const h = Math.round(P.maxHp * .04 * hits); P.hp = Math.min(P.maxHp, P.hp + h); popNum(P.x, 2.3, P.z, '+' + h, 'heal'); }
    G.shake = Math.max(G.shake, .15);
  } else if (cls === 'arcano') {
    P.act = 'nova';
    if (rn === 2) { const d = setAim(), tip = handPos('staff'); shoot({ x: tip[0], y: 1.6, z: tip[2], vx: d[0] * 12, vz: d[1] * 12, life: .9, dmg: st.dmg * 6, team: 'p', mat: 7, size: .95, r: .8, trail: 1, comet: true }); }
    else {
      const nova = () => {
        if (!P || P.dieT >= 0) return; const nv = Math.random();
        for (let i = 0; i < 48; i++) { const a = i / 48 * 6.28; spawn({ x: P.x + Math.cos(a) * 1.1, y: .1, z: P.z + Math.sin(a) * 1.1, vx: Math.cos(a) * 4.5, vy: .4, vz: Math.sin(a) * 4.5, life: .55, s0: .2, s1: .04, b0: 1, b1: .2, mat: rn === 1 ? 122 : 7, drag: 2 }); }
        for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; shoot({ x: P.x, y: 1.3, z: P.z, vx: Math.sin(a) * 11, vz: Math.cos(a) * 11, life: 1.1, dmg: st.dmg * 1.5, nv, team: 'p', mat: rn === 1 ? 122 : 7, size: .32, r: .4, homing: 5, trail: 1, frost: rn === 1 }); }
      };
      nova(); if (rn === 3) G.later.push({ t: .45, fn: nova });
    }
  } else {
    P.act = 'shoot'; const d = setAim(), y0 = Math.atan2(d[0], d[1]);
    const volley = () => { if (!P || P.dieT >= 0) return; sfx('bow'); for (let i = 0; i < 9; i++) { const a = y0 - .36 + i / 8 * .72; shoot({ x: P.x + Math.sin(a) * .5, y: 1.15, z: P.z + Math.cos(a) * .5, vx: Math.sin(a) * 20, vz: Math.cos(a) * 20, life: .8, dmg: st.dmg * 1.1 * (rn === 1 ? 1.2 : 1), team: 'p', mat: 7, size: .22, r: .35, pierce: rn === 1 ? 99 : 3, trail: .6, arrow: true, boom: rn === 2 ? 1.6 : 0 }); } };
    volley(); if (rn === 3) { G.later.push({ t: .16, fn: volley }); G.later.push({ t: .32, fn: volley }); }
  }
}
/* ---- Golpe do Tear: especial de cada classe, carregado com o dano causado (cerca de 40 golpes) ---- */
const ULT_NAME = { lamina: 'Fúria do Tear', arcano: 'Estrela Cadente', arco: 'Flecha do Céu' };
function ultCharge(dmg) { if (!P || G.ultFiring || P.ultT > 0) return; const was = (G.ult || 0) >= 1; G.ult = Math.min(1, (G.ult || 0) + dmg / Math.max(1, stats().dmg * 40)); if (!was && G.ult >= 1) { toast('GOLPE DO TEAR PRONTO', true, ULT_NAME[G.char.cls].toUpperCase() + ' · TECLA R', '#ffd27a'); sfx('frag'); } }
function ultHitArea(x, z, r, dmg, slow) {
  G.ultFiring = true;
  try {
    for (const e of enemies) { if (e.dieT >= 0 || e.spawnT > 0) continue; const dx = e.x - x, dz = e.z - z; if (Math.hypot(dx, dz) - e.def.r * e.scale < r) { hurtEnemy(e, dmg, dx, dz, true, 1.4); if (slow) e.slowT = Math.max(e.slowT || 0, slow); } }
    pvpArea(x, z, r, dmg);
    if (boss && !boss.dying) for (const h of bossHits(boss)) if (Math.hypot(h[0] - x, h[1] - z) - h[2] < r) { hurtBoss(boss, dmg, true, h); break; }
  } finally { G.ultFiring = false; }
}
function doUlt() {
  if (G.mode !== 'play' || !P || P.dieT >= 0 || P.down > 0 || (G.ult || 0) < 1) return;
  const st = stats(), cls = G.char.cls; G.ult = 0; sfx('legend'); hitStop(.06); G.shake = Math.max(G.shake, .25);
  toast(ULT_NAME[cls].toUpperCase(), true, '', '#ffd27a');
  if (cls === 'lamina') { P.ultT = 4; P.ultTick = 0; P.act = 'spin'; P.actT = 0; }   // giro contínuo (updateUlt)
  else if (cls === 'arcano') {
    P.act = 'nova'; P.actT = 0; const d = setAim(), tx = P.x + d[0] * 7, tz = P.z + d[1] * 7;
    const meteor = (x, z, r, k, delay) => { tels.push({ x, z, r, t: 0, dur: delay, kind: 'circle', mat: 151 }); G.later.push({ t: delay, fn: () => {
      for (let i = 0; i < 80; i++) { const a = Math.random() * 6.283, s = rr(2, 9); spawn({ x, y: .3, z, vx: Math.cos(a) * s, vy: rr(1, 6), vz: Math.sin(a) * s, life: rr(.5, 1), s0: .3, s1: .05, b0: 1, b1: .2, mat: i % 3 ? 21 : 151, buoy: -6 }); }
      ultHitArea(x, z, r, st.dmg * k); G.zones.push({ x, z, r: r * .8, t: 0, dur: 4, dmg: st.dmg * .6, tick: 0, team: 'p' }); G.shake = Math.max(G.shake, .4); sfx('boom'); } }); };
    meteor(tx, tz, 5, 12, .7); for (let i = 0; i < 3; i++) { const a = Math.random() * 6.283, d2 = rr(2.5, 4.5); meteor(tx + Math.cos(a) * d2, tz + Math.sin(a) * d2, 2.6, 5, 1.1 + i * .25); }
  } else {
    P.act = 'shoot'; P.actT = 0; const d = setAim(), L = 22, W = 1.5;
    for (let k = 0; k < 60; k++) { const u = k / 60 * L; spawn({ x: P.x + d[0] * u, y: 1.2, z: P.z + d[1] * u, vy: .3, life: .5 + k * .006, s0: .35, s1: .06, b0: 1, b1: .2, mat: 150 }); }
    G.ultFiring = true;
    try {
      for (const e of enemies) { if (e.dieT >= 0 || e.spawnT > 0) continue; const rx = e.x - P.x, rz = e.z - P.z, along = rx * d[0] + rz * d[1], side = Math.abs(rx * d[1] - rz * d[0]); if (along > 0 && along < L && side < W + e.def.r * e.scale) { hurtEnemy(e, st.dmg * 10, d[0], d[1], true, 2); e.slowT = Math.max(e.slowT || 0, 3); } }
      if (boss && !boss.dying) for (const h of bossHits(boss)) { const rx = h[0] - P.x, rz = h[1] - P.z, along = rx * d[0] + rz * d[1], side = Math.abs(rx * d[1] - rz * d[0]); if (along > 0 && along < L && side < W + h[2]) { hurtBoss(boss, st.dmg * 10, true, h); break; } }
    } finally { G.ultFiring = false; }
  }
}
function updateUlt(dt) {
  if (!P || !(P.ultT > 0)) return;
  P.ultT -= dt; P.act = 'spin'; P.actT = (P.actT + dt) % .5; P.iframe = Math.max(P.iframe, .05);
  if ((P.ultTick -= dt) <= 0) { P.ultTick = .25; ultHitArea(P.x, P.z, 4, stats().dmg * 1.6); }
  for (let i = 0; i < 6; i++) { const a = Math.random() * 6.283; spawn({ x: P.x + Math.cos(a) * 1.6, y: rr(.3, 1.6), z: P.z + Math.sin(a) * 1.6, vx: Math.cos(a + 1.57) * 6, vz: Math.sin(a + 1.57) * 6, life: .35, s0: .22, s1: .04, b0: 1, b1: .2, mat: 21 }); }
  if (P.ultT <= 0) { P.act = null; P.ultT = 0; }
}
function drinkPotion() {
  if (G.mode !== 'play' || P.dieT >= 0 || P.down > 0) return;
  if (G.save.potions <= 0) { toast('Sem poções. Descanse num santuário.'); return; }
  if (P.hp >= P.maxHp) { toast('Sua vida já está cheia.'); return; }
  G.save.potions--; const h = Math.round(P.maxHp * (hasPow('maca') ? 1 : stats().potHeal)); P.hp = Math.min(P.maxHp, P.hp + h);
  popNum(P.x, 2.2, P.z, '+' + h, 'heal'); sfx('heal');
  for (let i = 0; i < 30; i++) spawn({ x: P.x + rr(-.5, .5), y: rr(0, 1.5), z: P.z + rr(-.5, .5), vy: rr(1, 2), life: rr(.5, .9), s0: .1, s1: .02, b0: 1, b1: .2, mat: 31 });
}
function hurtPlayer(dmg, sx, sz, kb = 7) {
  if (P && P.remote) return coopHurtRemote(dmg, sx, sz, kb);   // co-op: alvo substituto (companheiro)
  if (!P || P.dieT >= 0 || P.down > 0 || P.iframe > 0 || P.dashT > 0 || G.mode !== 'play') return false;
  if (inCamp(P.x, P.z)) return false;   // acampamento dos Ermos: zona segura
  if (P.ultT > 0) dmg *= .5;   // Fúria do Tear
  if (coopIsHost()) dmg *= coopDmgMul();   // co-op: inimigos batem mais forte com mais gente
  dmg = Math.max(1, Math.round(dmg * monsterScale().dmg * (1 - stats().dr)));
  if (P.shield > 0) { const a = Math.min(P.shield, dmg); P.shield -= a; dmg -= a; if (dmg <= 0) { P.iframe = .35; popNum(P.x, 2.2, P.z, 'BLOQUEADO', 'info'); return true; } }
  if (hasPow('guardiao') && Math.random() < .25) { P.shield = 30; popNum(P.x, 2.6, P.z, 'ESCUDO DE MUSGO', 'heal'); }
  P.hp -= dmg; P.iframe = .7; P.flash = 1; P.act = 'hurt'; P.actT = 0; G.hurt = 1; G.shake = Math.max(G.shake, .2);
  if (G.touch && G.settings.vib !== false && navigator.vibrate) try { navigator.vibrate(dmg > P.maxHp * .15 ? 60 : 25); } catch (e) { }
  const dx = P.x - sx, dz = P.z - sz, l = Math.hypot(dx, dz) || 1; P.kx = dx / l * kb; P.kz = dz / l * kb;
  popNum(P.x, 2.2, P.z, '-' + dmg, 'hurt'); sfx('hurt');
  if (P.hp <= 0 && stats().tal.has('ultimo') && !G.ultUsed) { G.ultUsed = true; P.hp = Math.round(P.maxHp * .4); P.iframe = 2; toast('ÚLTIMO FIO', true, 'você se recusa a cair'); burst(P.x, 1, P.z, 40, 7, 5, .6, .18); }
  if (P.hp <= 0 && !coopTryDown()) playerDie();   // co-op: com companheiro de pé, fica Caído em vez de morrer
  return true;
}
/** Morte de verdade: custo da dificuldade e volta no ponto seguro. */
function playerDie() { P.hp = 0; P.dieT = 0; G.save.deaths++; if (G.char.death) deathFx(P.x, P.z, G.char.death);   // efeito de morte (cosmético)
  toast('Você se desfez em fios…', true, 'o Tear vai costurar você de volta');
  if (RG && RG.wild) {   // Ermos: tudo o que você carrega fica no chão por 5 min (equipados e banco ficam)
    const s = G.save, old = s.wloot && Date.now() - s.wloot.t < LOOT_MS ? s.wloot : null, items = s.inv.splice(0);
    s.wloot = { x: Math.round(P.x * 10) / 10, z: Math.round(P.z * 10) / 10, gold: s.gold + (old ? old.gold : 0), items: (old ? old.items : []).concat(items).slice(0, 40), t: Date.now() }; s.gold = 0; writeSave(); netLootDrop(s.wloot);   // online: o espólio vai para o chão da sala e qualquer um pega
    setTimeout(() => toast('ESPÓLIO NOS ERMOS', true, `${s.wloot.gold} CENTELHAS E ${s.wloot.items.length} ITENS NO CHÃO · 5 MIN PARA VOLTAR`, '#ff8a6a'), 1200); return;
  }
  const dv = G.save.diff || 0; if (dv > 0) { const lost = Math.floor(G.save.gold * Math.min(.2, .04 * dv)); if (lost > 0) { G.save.gold -= lost; setTimeout(() => toast('-' + lost + ' Centelhas', false, 'O PREÇO DA ' + curDiff().n.toUpperCase(), '#ff8a6a'), 1100); } } }
function respawn() {
  G.respawning = true;
  fadeTo(1, .5, () => {
    if (boss) endBossFight(false);
    const cp = G.save.cp && G.save.cp.region === RG.key ? G.save.cp : null;
    const sx = cp ? cp.x : RG.start.wx, sz = cp ? cp.z : RG.start.wz + 2;
    makePlayer(sx, sz); P.warp = true; if (G.char.tele) teleFx(sx, sz, G.char.tele);   // online: o servidor aceita o salto; efeito de teleporte (cosmético)
    G.respawning = false;
    fadeTo(0, .6);
  });
}

