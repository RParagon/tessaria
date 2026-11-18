/* Fios de Tessária · Inimigos e IA */
/* =========================================================
   INIMIGOS
   ========================================================= */
function spawnHpMul(type, x, z) { if (RG && RG.wild) { const D = curDiff(), zl = wildLv(x, z), tl = TYPELV[type] || 1; return D.hp * (1 + .1 * (zl - 1)) / (1 + .1 * (tl - 1)); } return monsterScale().hp; }
function spawnEnemy(type, x, z, delay = 0) {
  const def = DEF[type], model = getModel(def.model);
  const e = { type, def, model, anim: newAnim(model), x, z, y: 0, yaw: rr(0, 6.28), hp: Math.round(def.hp * spawnHpMul(type, x, z)), maxHp: Math.round(def.hp * spawnHpMul(type, x, z)), scale: def.scale * rr(.92, 1.08), state: 'idle', st: 0, cd: rr(.5, 1.5), t: rr(0, 9), spawnT: .8 + delay, dieT: -1, kx: 0, kz: 0, flash: 0, hop: 0, hvx: 0, hvz: 0, walkPh: 0, moveAmt: 0, act: null, actT: 0 };
  if (type === 'afogado') e.spdMul = .8;
  if (RG && RG.wild) { const tl = TYPELV[type] || 1; e.wdm = 1 / (1 + .06 * (tl - 1)); e.wxp = 1 / (1 + .08 * (tl - 1)); }
  if (G.rift && G.rift.aff && G.rift.aff.includes('frenetica')) e.spdMul = 1.2;
  enemies.push(e);
  return e;
}
function hurtEnemy(e, dmg, dx, dz, crit, kbm = 1) {
  if (e.proxy) return coopHitEnemy(e, dmg, dx, dz, crit, kbm);   // co-op: cópia; o acerto vai para o anfitrião
  if ((e.fade || 0) > .6) return;
  dmg = Math.round(dmg * (e.elite && e.elite.aff.includes('blind') ? .6 : 1));
  if (e.shieldT > 0) { dmg = Math.max(1, Math.round(dmg * .2)); if (Math.random() < .4) popNum(e.x, 2.2, e.z, 'ESCUDO', 'info'); }
  e.hp -= dmg; e.flash = 1; e.hitT = .18; if (!COOP.remoteHit) { e.hitByMe = true; lifeSteal(dmg); if (crit) hitStop(.045); }
  if (e.thief && e.hp > 0) dropGold(e.x, e.z, 2);
  const l = Math.hypot(dx, dz) || 1, kb = (e.type === 'beetle' ? 2 : 6) * kbm; e.kx += dx / l * kb; e.kz += dz / l * kb;
  popNum(e.x, 1.6 * e.scale + (e.type === 'bat' ? 1 : 0), e.z, crit ? dmg + '!' : '' + dmg, crit ? 'crit' : '');
  sfx('hit'); burst(e.x, 1, e.z, 6, 7, 3, .3, .1);
  if (e.dummy) { e.log.push([G.time, dmg]); if (e.hp < e.maxHp * .3) e.hp = e.maxHp; e.kx = e.kz = 0; if (!G.save.st || !G.save.st.dummy) { (G.save.st = G.save.st || {}).dummy = 1; toast('Boneco de treino', false, 'ELE MOSTRA O SEU DANO POR SEGUNDO'); } return; }
  if (e.hp <= 0 && e.dieT < 0) {
    e.dieT = 0; if (!COOP.remoteHit) hitStop(.03);
    if (coopShare(e)) {
      G.save.kills++;
      dropGold(e.x, e.z, e.def.gold + Math.floor(rr(0, 3)));
      if (Math.random() < .07) pickups.push({ kind: 'heart', x: e.x, y: .5, z: e.z, vx: 0, vy: 3, vz: 0, t: 0 });
      COOP.noItems = !!coopNet();   // co-op: itens dos monstros vêm do servidor
      try { if (Math.random() < .08 * stats().itemFind) dropItem(e.x, e.z, rollRar(G.rift && G.rift.L >= 4 ? 1 : 0)); onEnemyKilled(e); } finally { COOP.noItems = false; }
    } else coopFarKill(e);   // co-op: longe e sem ter acertado: só o progresso da Fenda
    coopKilled(e);
  }
}
function dropGold(x, z, n) { for (let i = 0; i < n; i++) { const a = rr(0, 6.28), s = rr(1, 3); pickups.push({ kind: 'gold', x, y: .8, z, vx: Math.cos(a) * s, vy: rr(3, 5), vz: Math.sin(a) * s, t: 0, v: 1 }); } }
function campPush(e) { if (!RG || !RG.camps) return; for (const c of RG.camps) { const dx = e.x - c.x, dz = e.z - c.z, d = Math.hypot(dx, dz); if (d < CAMP_R + .6 && d > 1e-3) { const k = (CAMP_R + .6) / d; e.x = c.x + dx * k; e.z = c.z + dz * k; } } }   // monstro não entra no acampamento
function moveEnt(e, vx, vz, dt) { const mm = (e.spdMul || 1) * (e.slowT > 0 ? .5 : 1), kl = Math.hypot(e.kx, e.kz); if (kl > 18) { e.kx *= 18 / kl; e.kz *= 18 / kl; } moveSafe(e, (vx * mm + e.kx) * dt, (vz * mm + e.kz) * dt, Math.max(.3, e.def.r * e.scale)); e.kx *= Math.exp(-dt * 6); e.kz *= Math.exp(-dt * 6); if (RG && RG.camps) campPush(e); }
function updateEnemy(e, dt) {
  if (e.dummy) { e.t += dt; e.flash = Math.max(0, e.flash - dt * 6); e.kx = e.kz = 0; e.hitT = (e.hitT || 0) - dt; return; }   // boneco de treino
  e.t += dt; e.flash = Math.max(0, e.flash - dt * 6); e.actT += dt;
  if (e.dieT >= 0) { e.dieT += dt; if (e.dieT > .6) e.dead = true; return; }
  if (e.spawnT > 0) { e.spawnT -= dt; return; }
  e.slowT = (e.slowT || 0) - dt; e.hitT = (e.hitT || 0) - dt;
  if (e.elite) {
    if (e.elite.aff.includes('vamp')) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * .03 * dt);
    if (e.elite.aff.includes('gelo')) { e.frostT = (e.frostT || 0) - dt; if (e.frostT <= 0) { e.frostT = .9; G.zones.push({ x: e.x, z: e.z, r: 1.3, t: 0, dur: 3.5, team: 'e' }); } }
  }
  const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz) || 1, nx = dx / d, nz = dz / d, alive = P.dieT < 0;
  for (const o of enemies) { if (o === e || o.dieT >= 0) continue; const ox = e.x - o.x, oz = e.z - o.z, od = Math.hypot(ox, oz), m = (e.def.r + o.def.r) * .9; if (od < m && od > 1e-4) { e.x += ox / od * (m - od) * .5; e.z += oz / od * (m - od) * .5; } }
  e.cd -= dt * curDiff().spd;
  const face = (a, k = 8) => { e.yaw += angDiff(e.yaw, a) * (1 - Math.exp(-dt * k)); };
  const touchDmg = (r) => { if (alive && d < r + .4) hurtPlayer(edmg(e), e.x, e.z); };
  switch (e.type) {
    case 'gosmo': {
      if (e.hop > 0) { e.hop -= dt; moveEnt(e, e.hvx, e.hvz, dt); e.y = Math.sin(Math.PI * (1 - e.hop / .45)) * .6; }
      else { e.y = 0; moveEnt(e, 0, 0, dt); if (e.cd <= 0 && d < 15 && alive) { e.hop = .45; const s = rr(3.5, 4.8); e.hvx = nx * s + rr(-1, 1); e.hvz = nz * s + rr(-1, 1); e.cd = rr(.55, 1.0); } }
      face(Math.atan2(nx, nz)); touchDmg(.55 * e.scale); break;
    }
    case 'wisp': {
      let mv = 0; if (d > 7.5) mv = 1; else if (d < 5) mv = -1;
      const px = -nz, pz = nx, s = Math.sin(e.t * .8) * 1.4;
      moveEnt(e, (nx * mv * 2.4 + px * s), (nz * mv * 2.4 + pz * s), dt);
      e.y = Math.sin(e.t * 2) * .15; face(Math.atan2(nx, nz));
      if (e.cd <= 0 && d < 12 && alive) { e.cd = rr(1.8, 2.6); shoot({ x: e.x, y: 1.2, z: e.z, vx: nx * 5.5, vz: nz * 5.5, life: 3, dmg: edmg(e), team: 'e', mat: 21, size: .36, r: .35, trail: .5 }); }
      touchDmg(.45); break;
    }
    case 'afogado':
    case 'skel': {
      if (e.state === 'wind') { if (e.st > .5) { e.state = 'strike'; e.st = 0; e.act = 'swing'; e.actT = 0; if (e.type === 'afogado') { const zx = e.x + Math.sin(e.yaw) * 1.5, zz = e.z + Math.cos(e.yaw) * 1.5; G.zones.push({ x: zx, z: zz, r: 1.4, t: 0, dur: 4, team: 'e', dmg: Math.round(edmg(e) * .3), tick: .3, mat: 21 }); burst(zx, .2, zz, 14, 21, 3, .4, .14); } if (alive && d < 2.6 && Math.abs(angDiff(e.yaw, Math.atan2(nx, nz))) < 1.0) hurtPlayer(edmg(e), e.x, e.z); } moveEnt(e, 0, 0, dt); }
      else if (e.state === 'strike') { moveEnt(e, Math.sin(e.yaw) * (e.st < .15 ? 6 : 0), Math.cos(e.yaw) * (e.st < .15 ? 6 : 0), dt); if (e.st > .55) { e.state = 'chase'; e.cd = 1.1; } }
      else { e.state = 'chase'; if (alive && d > 1.6) moveEnt(e, nx * 2.7, nz * 2.7, dt); else moveEnt(e, 0, 0, dt); face(Math.atan2(nx, nz)); if (alive && d < 2.2 && e.cd <= 0) { e.state = 'wind'; e.st = 0; tels.push({ kind: 'cone', x: e.x, z: e.z, ang: e.yaw, ha: .9, len: 2.6, t: 0, dur: .5 }); } }
      e.st += dt; const sp = Math.hypot(nx * 2.7, nz * 2.7) * (e.state === 'chase' && d > 1.6 ? 1 : 0); e.moveAmt = lerp(e.moveAmt, sp > 0 ? 1 : 0, 1 - Math.exp(-dt * 8)); e.walkPh += dt * 6 * e.moveAmt; break;
    }
    case 'bat': {
      e.st -= dt;
      const px = -nz, pz = nx, w = Math.sin(e.t * 3.2) * 3;
      if (e.st > 0) moveEnt(e, -nx * 4 + px * w, -nz * 4 + pz * w, dt); else moveEnt(e, nx * 5 + px * w * .6, nz * 5 + pz * w * .6, dt);
      face(Math.atan2(nx, nz), 10);
      if (alive && d < .9 && e.st <= 0) { if (hurtPlayer(edmg(e), e.x, e.z)) e.st = .9; else e.st = .3; } break;
    }
    case 'aranha': { const px = -nz, pz = nx, wob = Math.sin(e.t * 5) * 1.5; if (alive) moveEnt(e, nx * 4.8 + px * wob, nz * 4.8 + pz * wob, dt); face(Math.atan2(nx, nz), 12); touchDmg(.4); break; }
    case 'thief': {
      if (e.t > 30) { e.dieT = 0; e.escaped = true; toast('O ladrão escapou…', false, 'FICA PARA A PRÓXIMA'); burst(e.x, 1, e.z, 30, 30, 4, .6, .15); break; }
      const flee = d < 9, px = -nz, pz = nx, wob = Math.sin(e.t * 2.3) * 2.2;
      if (flee) moveEnt(e, -nx * 4.5 + px * wob, -nz * 4.5 + pz * wob, dt); else moveEnt(e, px * 1.6, pz * 1.6, dt);
      e.y = .15 + Math.abs(Math.sin(e.t * 9)) * .3; face(flee ? Math.atan2(-nx, -nz) : Math.atan2(px, pz), 10);
      if (Math.random() < .35) spawn({ x: e.x + rr(-.2, .2), y: .6, z: e.z + rr(-.2, .2), vy: .5, life: .5, s0: .09, s1: .02, b0: 1, b1: .2, mat: 30 });
      break;
    }
    case 'imp': {
      let mv = 0; if (d > 8) mv = 1; else if (d < 5.5) mv = -1;
      const px = -nz, pz = nx, s = Math.sin(e.t * .7) * 1.6;
      moveEnt(e, nx * mv * 2.6 + px * s, nz * mv * 2.6 + pz * s, dt); e.y = .3 + Math.sin(e.t * 2.5) * .15; face(Math.atan2(nx, nz));
      if (e.cd <= 0 && d < 12 && alive) {
        e.cd = rr(2.2, 3); e.act = 'throw'; e.actT = 0;
        const tx = P.x + P.vx * .5, tz = P.z + P.vz * .5, dmg = edmg(e);
        lob(e.x, 1.4, e.z, tx, tz, 1.0, 21, .34);
        tels.push({ kind: 'circle', x: tx, z: tz, r: 1.4, t: 0, dur: 1.0, fn: () => { burst(tx, .3, tz, 26, 21, 4, .5, .18); sfx('boom'); if (Math.hypot(P.x - tx, P.z - tz) < 1.5) hurtPlayer(dmg, tx, tz); } });
      }
      touchDmg(.45); break;
    }
    case 'javali': {
      e.st += dt; if (!e.aggro && (d < 8 || e.hitT > 0)) { e.aggro = true; e.cd = Math.min(e.cd, .4); }
      if (!e.aggro) { wander(e, dt, 1.4); break; }
      if (e.state === 'aim') { moveEnt(e, 0, 0, dt); face(e.tAng, 12); if (e.st > .6) { e.state = 'charge'; e.st = 0; sfx('dash'); } }
      else if (e.state === 'charge') { const ox = e.x, oz = e.z; moveEnt(e, Math.sin(e.tAng) * 11, Math.cos(e.tAng) * 11, dt); e.walkPh += dt * 18; if (Math.random() < .6) spawn({ x: e.x, y: .15, z: e.z, vy: .5, life: .4, s0: .18, s1: .05, b0: .5, b1: .05, mat: 9 }); if (alive && d < 1.1) { hurtPlayer(edmg(e), e.x, e.z, 10); e.state = 'rec'; e.st = 0; } const mv = Math.hypot(e.x - ox, e.z - oz); if (e.st > .7 || mv < 11 * dt * .35) { e.state = 'rec'; e.st = 0; } }
      else if (e.state === 'rec') { moveEnt(e, 0, 0, dt); if (e.st > .8) { e.state = 'trot'; e.cd = rr(1.4, 2.2); } }
      else { e.state = 'trot'; if (alive && d > 2) moveEnt(e, nx * 2.4, nz * 2.4, dt); else moveEnt(e, 0, 0, dt); face(Math.atan2(nx, nz), 6); e.walkPh += dt * 9; if (alive && e.cd <= 0 && d < 9) { e.state = 'aim'; e.st = 0; e.tAng = Math.atan2(nx, nz); tels.push({ kind: 'line', x: e.x, z: e.z, ang: e.tAng, len: 8, w: 1.2, t: 0, dur: .6 }); } }
      touchDmg(.5 * e.scale); break;
    }
    case 'lobo': {
      e.st += dt; if (!e.aggro && (d < 10 || e.hitT > 0)) { e.aggro = true; for (const o of enemies) if (o.type === 'lobo' && Math.hypot(o.x - e.x, o.z - e.z) < 9) o.aggro = true; if (!G.howlT || G.time - G.howlT > 4) { G.howlT = G.time; sfx('roar'); } }
      if (!e.aggro) { wander(e, dt, 1.6); break; }
      if (e.state === 'lunge') { moveEnt(e, Math.sin(e.tAng) * 9, Math.cos(e.tAng) * 9, dt); e.y = Math.sin(clamp(e.st / .35, 0, 1) * Math.PI) * .4; if (!e.tHit && alive && d < 1.1) { e.tHit = true; hurtPlayer(edmg(e), e.x, e.z, 7); } if (e.st > .35) { e.state = 'circle'; e.y = 0; e.cd = rr(1.3, 2.2); e.tHit = false; } }
      else if (e.state === 'crouch') { moveEnt(e, 0, 0, dt); face(e.tAng, 14); if (e.st > .4) { e.state = 'lunge'; e.st = 0; sfx('swing'); } }
      else { e.state = 'circle'; const px = -nz, pz = nx, dir = e.dir || (e.dir = Math.random() < .5 ? 1 : -1), rad = clamp((d - 3.2) * 2, -3, 5.5); if (alive) moveEnt(e, nx * rad + px * dir * 3.4, nz * rad + pz * dir * 3.4, dt); face(Math.atan2(nx, nz), 8); e.walkPh += dt * 11; e.moveAmt = 1;
        if (alive && e.cd <= 0 && d < 5.5) { e.state = 'crouch'; e.st = 0; e.tAng = Math.atan2(nx, nz); tels.push({ kind: 'line', x: e.x, z: e.z, ang: e.tAng, len: 4, w: 1, t: 0, dur: .4 }); } }
      break;
    }
    case 'urso': {
      e.st += dt; if (!e.aggro && (d < 7 || e.hitT > 0)) { e.aggro = true; e.state = 'roar'; e.st = 0; sfx('roar'); }
      if (!e.aggro) { wander(e, dt, 1.0); break; }
      if (e.state === 'roar') { moveEnt(e, 0, 0, dt); face(Math.atan2(nx, nz), 6); if (e.st > .9) { e.state = 'walk'; e.cd = .5; } }
      else if (e.state === 'swipe') { moveEnt(e, 0, 0, dt); if (e.st > .55 && !e.tHit) { e.tHit = true; sfx('swing'); if (alive && inCone(P.x, P.z, e.x, e.z, e.yaw, 1.0, 3)) hurtPlayer(edmg(e), e.x, e.z, 10); } if (e.st > 1.0) { e.state = 'walk'; e.cd = rr(1.2, 1.8); e.tHit = false; } }
      else if (e.state === 'slam') { moveEnt(e, 0, 0, dt); if (e.st > 1.6) { e.state = 'walk'; e.cd = rr(1.6, 2.4); } }
      else { e.state = 'walk'; if (alive && d > 2) moveEnt(e, nx * 1.9, nz * 1.9, dt); else moveEnt(e, 0, 0, dt); face(Math.atan2(nx, nz), 4); e.walkPh += dt * 5; e.moveAmt = d > 2 ? 1 : 0;
        if (alive && e.cd <= 0 && d < 3.2) { e.state = 'swipe'; e.st = 0; tels.push({ kind: 'cone', x: e.x, z: e.z, ang: e.yaw, ha: 1.0, len: 3, t: 0, dur: .55 }); }
        else if (alive && e.cd <= 0 && d < 7 && Math.random() < .5) { e.state = 'slam'; e.st = 0; const x = e.x, z = e.z, dm = edmg(e) * 1.2; tels.push({ kind: 'circle', x, z, r: 3, t: 0, dur: .9, fn: () => { G.shake = Math.max(G.shake, .25); sfx('boom'); burst(x, .3, z, 30, 9, 5, .5, .18); if (Math.hypot(P.x - x, P.z - z) < 3.1) hurtPlayer(dm, x, z, 12); } }); }
        else if (e.cd <= 0) e.cd = .4; }
      touchDmg(.7 * e.scale); break;
    }
    case 'sapo': {
      e.st += dt;
      if (e.state === 'aim') { moveEnt(e, 0, 0, dt); face(e.tAng, 14); if (e.st > .55) { e.state = 'tongue'; e.st = 0; sfx('swing'); } }
      else if (e.state === 'tongue') {
        moveEnt(e, 0, 0, dt); e.tongue = (e.st < .18 ? e.st / .18 : Math.max(0, 1 - (e.st - .18) / .3)) * 6.5;
        if (!e.tHit && e.st > .1 && e.st < .3 && alive) { const px = P.x - e.x, pz = P.z - e.z, sx = Math.sin(e.tAng), cz = Math.cos(e.tAng), al = px * sx + pz * cz, pr = Math.abs(px * cz - pz * sx); if (al > 0 && al < 6.8 && pr < .7) { e.tHit = true; hurtPlayer(edmg(e), e.x, e.z, -13); } }
        if (e.st > .5) { e.state = 'idle'; e.tongue = 0; e.tHit = false; e.cd = rr(1.6, 2.4); }
      } else if (e.hop > 0) { e.hop -= dt; moveEnt(e, e.hvx, e.hvz, dt); e.y = Math.sin(Math.PI * (1 - e.hop / .55)) * .9; if (e.hop <= 0) { e.y = 0; burst(e.x, .1, e.z, 6, 15, 2, .3, .1); } }
      else {
        e.y = 0; moveEnt(e, 0, 0, dt); face(Math.atan2(nx, nz));
        if (e.cd <= 0 && alive && d < 7 && d > 2.2 && Math.random() < .6) { e.state = 'aim'; e.st = 0; e.tAng = Math.atan2(nx, nz); e.yaw = e.tAng; tels.push({ kind: 'line', x: e.x, z: e.z, ang: e.tAng, len: 6.5, w: 1.1, t: 0, dur: .55, mat: 25 }); }
        else if (e.cd <= 0 && alive && d < 16) { e.hop = .55; const sp = rr(3.2, 4.4) * (d < 2.2 ? -.6 : 1); e.hvx = nx * sp + rr(-1.2, 1.2); e.hvz = nz * sp + rr(-1.2, 1.2); e.cd = rr(.5, .9); }
      }
      touchDmg(.6 * e.scale); break;
    }
    case 'sentinela': {
      e.shieldT = (e.shieldT || 0) - dt; e.st += dt;
      let mv = 0; if (d > 9) mv = 1; else if (d < 5.5) mv = -1;
      const px = -nz, pz = nx, sw = Math.sin(e.t * .9) * 1.8;
      if (e.state !== 'aim') moveEnt(e, nx * mv * 2.2 + px * sw, nz * mv * 2.2 + pz * sw, dt); else moveEnt(e, 0, 0, dt);
      e.y = .2 + Math.sin(e.t * 1.8) * .12; face(e.state === 'aim' ? e.tAng : Math.atan2(nx, nz), 6);
      if (e.state === 'aim') {
        if (e.st > .7) {
          shoot({ x: e.x, y: 1.45, z: e.z, vx: Math.sin(e.tAng) * 16, vz: Math.cos(e.tAng) * 16, life: .9, dmg: edmg(e), team: 'e', mat: 21, size: .3, r: .3, trail: 1 }); sfx('shoot'); e.shots = (e.shots || 0) + 1; e.act = 'shoot'; e.actT = 0;
          if (e.shots < 3) { e.st = .45; e.tAng = Math.atan2(P.x - e.x, P.z - e.z); tels.push({ kind: 'line', x: e.x, z: e.z, ang: e.tAng, len: 12, w: .5, t: 0, dur: .25, mat: 21 }); } else { e.state = 'idle'; e.shots = 0; e.cd = rr(2.2, 3); }
        }
      } else if (e.cd <= 0 && alive && d < 13) { e.state = 'aim'; e.st = 0; e.tAng = Math.atan2(nx, nz); tels.push({ kind: 'line', x: e.x, z: e.z, ang: e.tAng, len: 12, w: .5, t: 0, dur: .7, mat: 21 }); }
      if (e.shieldT < -4 && e.hp < e.maxHp * .85 && Math.random() < dt * .6) { e.shieldT = 2.2; sfx('skill'); }
      break;
    }
    case 'fantasma': {
      e.st += dt; e.y = .15 + Math.sin(e.t * 2) * .1;
      if (e.state === 'out') { e.fade = sm(0, .35, e.st); moveEnt(e, 0, 0, dt); if (e.st > .4) { const py = P.yaw || 0, bx = P.x - Math.sin(py) * 1.7, bz = P.z - Math.cos(py) * 1.7; if (!blocked(Math.floor(bx / T), Math.floor(bz / T))) { e.x = bx; e.z = bz; } e.state = 'in'; e.st = 0; e.yaw = Math.atan2(P.x - e.x, P.z - e.z); burst(e.x, 1, e.z, 14, 20, 3, .4, .12); } }
      else if (e.state === 'in') { e.fade = 1 - sm(0, .25, e.st); moveEnt(e, 0, 0, dt); if (e.st > .25) { e.state = 'wind'; e.st = 0; const a = Math.atan2(P.x - e.x, P.z - e.z); e.yaw = a; tels.push({ kind: 'cone', x: e.x, z: e.z, ang: a, ha: .85, len: 2.8, t: 0, dur: .5, mat: 20 }); } }
      else if (e.state === 'wind') { e.fade = 0; moveEnt(e, 0, 0, dt); if (e.st > .5) { e.state = 'strike'; e.st = 0; sfx('swing'); if (alive && inCone(P.x, P.z, e.x, e.z, e.yaw, .85, 2.9)) hurtPlayer(edmg(e), e.x, e.z, 8); } }
      else if (e.state === 'strike') { moveEnt(e, 0, 0, dt); if (e.st > .5) { e.state = 'idle'; e.cd = rr(2.2, 3.2); } }
      else { e.fade = 0; const px = -nz, pz = nx, w = Math.sin(e.t * 1.3) * 1.5; if (alive && d > 1.8) moveEnt(e, nx * 2.1 + px * w, nz * 2.1 + pz * w, dt); else moveEnt(e, 0, 0, dt); face(Math.atan2(nx, nz), 6); if (alive && e.cd <= 0 && d < 10) { e.state = 'out'; e.st = 0; sfx('dash'); } }
      if (Math.random() < .35) spawn({ x: e.x + rr(-.3, .3), y: rr(.1, .6), z: e.z + rr(-.3, .3), vy: rr(-.2, .2), life: .8, s0: .12, s1: .02, b0: .6, b1: .05, mat: 18 });
      break;
    }
    case 'beetle': {
      e.st += dt;
      if (e.state === 'aim') { moveEnt(e, 0, 0, dt); if (e.st > .8) { e.state = 'charge'; e.st = 0; } }
      else if (e.state === 'charge') {
        const ox = e.x, oz = e.z; moveEnt(e, Math.sin(e.yaw) * 12, Math.cos(e.yaw) * 12, dt);
        if (Math.random() < .7) spawn({ x: e.x, y: .2, z: e.z, vy: .5, life: .4, s0: .2, s1: .05, b0: .5, b1: .05, mat: 21 });
        if (alive && d < 1.3) hurtPlayer(edmg(e), e.x, e.z, 11);
        const moved = Math.hypot(e.x - ox, e.z - oz);
        if (e.st > .8 || moved < 12 * dt * .4) { e.state = moved < 12 * dt * .4 ? 'stun' : 'walk'; e.st = 0; e.cd = 2.4; if (e.state === 'stun') { G.shake = Math.max(G.shake, .1); burst(e.x, .5, e.z, 12, 15, 3, .4, .14); } }
      } else if (e.state === 'stun') { moveEnt(e, 0, 0, dt); if (e.st > 1.1) { e.state = 'walk'; e.st = 0; } }
      else { e.state = 'walk'; if (alive) moveEnt(e, nx * 1.8, nz * 1.8, dt); face(Math.atan2(nx, nz), 4); e.walkPh += dt * 8;
        if (alive && d < 10 && e.cd <= 0) { e.state = 'aim'; e.st = 0; e.yaw = Math.atan2(nx, nz); tels.push({ kind: 'line', x: e.x, z: e.z, ang: e.yaw, len: 10, w: 1.5, t: 0, dur: .8 }); } }
      touchDmg(.8 * e.scale); break;
    }
  }
}
function drawEnemyExtra(e, t) {
  if (e.tongue > .05) { const a = e.tAng, sx = Math.sin(a), cz = Math.cos(a), x0 = e.x + sx * .55 * e.scale, z0 = e.z + cz * .55 * e.scale, y0 = .62 * e.scale + e.y; for (let r = 0; r < e.tongue; r += .16) dyn(x0 + sx * r, y0 - Math.sin(r / 6.5 * Math.PI) * .12, z0 + cz * r, .75, 25, .11); dyn(x0 + sx * e.tongue, y0, z0 + cz * e.tongue, .9, 25, .24); }
  if (e.shieldT > 0) { const n = 22; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + t * 3; dyn(e.x + Math.cos(a) * 1.05, 1.4 + e.y + Math.sin(a * 3 + t * 4) * .25, e.z + Math.sin(a) * 1.05, .9, 20, .14); } }
}
function lob(x0, y0, z0, x1, z1, dur, mat, size) { shoot({ x: x0, y: y0, z: z0, vx: (x1 - x0) / dur, vy: (0.2 - y0) / dur + 9.8 * dur / 2, vz: (z1 - z0) / dur, grav: 9.8, life: dur, team: 'v', mat, size, trail: .8 }); }

