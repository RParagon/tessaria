/* Fios de Tessária · Chefes */
/* =========================================================
   CHEFES
   ========================================================= */
const BOSSDEF = {
  golem: { name: 'GUARDIÃO DE MUSGO', hp: 750, r: 1.5, xp: 120, gold: 70 },
  skull: { name: 'REI MORGRAVE', hp: 1600, r: 1.7, xp: 220, gold: 110 },
  dragon: { name: 'VARKHAZ, O DRAGÃO DE BRASA', hp: 2800, r: 2.3, xp: 0, gold: 0 },
  spider: { name: 'ARANHA TECELÃ', hp: 1400, r: 1.8, xp: 200, gold: 100 },
  knight: { name: 'CAVALEIRO DESFIADO', hp: 1700, r: 1.3, xp: 200, gold: 100 },
  eye: { name: 'OLHO DO VAZIO', hp: 1500, r: 1.5, xp: 200, gold: 100 },
  hydra: { name: 'HIDRA DO LODO', hp: 3400, r: 2.2, xp: 420, gold: 160 },
  reflexo: { name: 'O REFLEXO', hp: 3800, r: 1, xp: 520, gold: 200 },
};
const CINESUB = { golem: 'o guardião que plantava árvores', skull: 'o rei que não quis morrer', dragon: 'o dragão que guardou o Sol', spider: 'tece o que o Tear esqueceu', knight: 'armadura sem dono, juramento sem fim', eye: 'o Tear olha de volta', hydra: 'três bocas, nenhuma memória', reflexo: 'tudo o que você cortou, olhando de volta' };
const BOSSMAT = { hydra: 26, reflexo: 158, spider: 143, knight: 134, eye: 151, golem: 27, skull: 27, dragon: 27 };
const _bd = {
};
function bossHits(b) {
  if (b.type === 'spider') return [[b.x, b.z, 1.6], [b.x - Math.sin(b.yaw) * 1.6, b.z - Math.cos(b.yaw) * 1.6, 1.2]];
  if (b.type === 'knight') return [[b.x, b.z, 1.25]];
  if (b.type === 'reflexo') return [[b.x, b.z, 1.0]];
  if (b.type === 'hydra') { const out = [[b.x, b.z, 2.8]], W = b.W; if (W) b.model.heads.forEach(h => { if (W[h.hb]) { const p = tp(W[h.hb], V.add(h.tip, V.mul(h.fw, .5))); out.push([p[0], p[2], .9]); } }); return out; }
  if (b.type === 'eye') return [[b.x, b.z, 1.4]];
  if (b.type === 'dragon') {
    const W = b.W, c = Math.cos(b.yaw), s = Math.sin(b.yaw);
    const out = [[b.x + s * -.6, b.z + c * -.6, 2.2]];
    if (W && W[6]) { const h = tp(W[6], [0, 3.6, 2.6]); out.push([h[0], h[2], 1.0]); }
    return out;
  }
  if (b.type === 'skull') { const W = b.W; if (W && W[1]) { const h = tp(W[1], [0, 3.0, .2]); return [[h[0], h[2], 1.6]]; } return [[b.x, b.z, 1.6]]; }
  return [[b.x, b.z, 1.5]];
}
function startBoss(rm) {
  const type = REG[RG.key].boss, def = BOSSDEF[type], model = getModel(type);
  boss = { type, def, model, anim: newAnim(model), x: rm.wx, z: rm.wz, yaw: Math.atan2(P.x - rm.wx, P.z - rm.wz), hp: Math.round(def.hp * (G.rift ? (.55 + .22 * G.rift.L) * curDiff().hp : monsterScale().hp)), maxHp: Math.round(def.hp * (G.rift ? (.55 + .22 * G.rift.L) * curDiff().hp : monsterScale().hp)), act: null, actT: 0, cd: 2.0, t: 0, flash: 0, ev: {}, phase2: false, dying: false, dieT: 0, moveAmt: 0, walkPh: 0, lift: 0, hand: [{ k: 0, lx: 0, ly: 0, lz: 0 }, { k: 0, lx: 0, ly: 0, lz: 0 }], sweep: 0, summons: 0, room: rm, W: null, spawnT: 1.2, scale: type === 'knight' ? 2.3 : type === 'reflexo' ? 1.7 : type === 'hydra' ? 1.35 : 1 };
  G.cine = { t: 0, x: rm.wx, z: rm.wz, dur: 2.6 }; $('#cineName').innerHTML = (G.rift ? '<small>GUARDIÃO DA FENDA</small>' : G.rematch ? '<small>DESAFIO · ' + curDiff().n.toUpperCase() + '</small>' : '') + def.name + '<small>' + (CINESUB[type] || '') + '</small>';
  RG.gatesOn = true; sfx('roar'); G.shake = .3; setMusic(type === 'hydra' || type === 'reflexo' ? 'boss2' : 'boss');
  if (type === 'dragon' && !G.save.preFinal && !G.rift) { G.save.preFinal = true; writeSave(); }
  $('#bName').textContent = G.rift ? 'GUARDIÃO DA FENDA · ' + def.name : def.name; $('#bossBar').hidden = false; updateBossBar();
  if (!G.rift && !G.rematch) say(DIALOG.bossIntro(type), () => { });
  coopBossStart(rm);
}
function endBossFight(won) {
  RG.gatesOn = false; $('#bossBar').hidden = true; setMusic(G.rift ? G.rift.base : RG.key);
  if (!won) { G.rematch = false; boss = null; tels.length = 0; projs.length = 0; enemies = enemies.filter(e => !e.summoned); }
}
function updateBossBar() { if (boss) $('#bHp').style.width = clamp(boss.hp / boss.maxHp, 0, 1) * 100 + '%'; }
function hurtBoss(b, dmg, crit, h) {
  if (b.proxy) return coopHitBoss(b, dmg, crit, h);   // co-op: cópia; o acerto vai para o anfitrião
  if (b.invuln > 0 || b.spawnT > 0 || (b.blinkDis || 0) > .5) { popNum(h[0], 3, h[1], 'IMUNE', 'info'); return; }
  dmg = Math.round(dmg); b.hp -= dmg; b.flash = 1; if (!COOP.remoteHit) { lifeSteal(dmg); if (crit) hitStop(.05); }
  popNum(h[0], 3.2, h[1], crit ? dmg + '!' : '' + dmg, crit ? 'crit' : ''); sfx('hit'); burst(h[0], 1.6, h[1], 6, 7, 3, .3, .12);
  updateBossBar();
  if (b.hp <= 0 && !b.dying) { b.hp = 0; b.dying = true; b.dieT = 0; G.hitStop = .45; tels.length = 0; projs = projs.filter(p => p.team === 'p'); sfx('roar'); G.shake = .5; enemies.forEach(e => { if (e.summoned && e.dieT < 0) { e.dieT = 0; } }); }
}
function clampRoom(b, pad = 2.5) { const rm = b.room, rd = Math.hypot(b.x - rm.wx, b.z - rm.wz), lim = (rm.r - pad) * T; if (rd > lim) { b.x = rm.wx + (b.x - rm.wx) / rd * lim; b.z = rm.wz + (b.z - rm.wz) / rd * lim; } }
function startAct(b, a) { b.blinkDis = 0; b.hop = 0; b.act = a; b.actT = 0; b.ev = {}; if (b.hand) b.hand.forEach(h => h.k = 0); }
const once = (b, k, cond) => { if (cond && !b.ev[k]) { b.ev[k] = 1; return true; } return false; };
function turnTo(b, a, rate, dt) { b.yaw += clamp(angDiff(b.yaw, a), -rate * dt, rate * dt); }
function toLocal(b, wx, wz) { const dx = wx - b.x, dz = wz - b.z, c = Math.cos(b.yaw), s = Math.sin(b.yaw); return [c * dx - s * dz, s * dx + c * dz]; }
function updateBoss(b, dt) {
  b.t += dt; b.actT += dt; b.flash = Math.max(0, b.flash - dt * 6); b.invuln = (b.invuln || 0) - dt;
  if (b.dying) { b.dieT += dt; if (b.dieT > 2.6 && !b.done) { b.done = true; finishBoss(b); } return; }
  if (b.spawnT > 0) { b.spawnT -= dt; return; }
  if (!b.act) b.cd -= dt * (curDiff().spd - 1);
  const dx = P.x - b.x, dz = P.z - b.z, d = Math.hypot(dx, dz), want = Math.atan2(dx, dz), alive = P.dieT < 0;
  if (!b.phase2 && b.hp < b.maxHp * .5) { b.phase2 = true; startAct(b, 'roar'); b.invuln = 1.8; sfx('roar'); G.shake = .4; toast('O chefe se enfurece!'); }
  const end = (dur, cd) => { if (b.actT >= dur) { b.act = null; b.cd = (b.phase2 ? .65 : 1) * rr(cd[0], cd[1]); } };
  if (b.type === 'golem') {
    if (!b.act) {
      b.cd -= dt;
      if (d > 3 && alive) { const sp = b.phase2 ? 2.2 : 1.7; b.x += dx / d * sp * dt; b.z += dz / d * sp * dt; b.moveAmt = lerp(b.moveAmt, 1, .1); } else b.moveAmt = lerp(b.moveAmt, 0, .1);
      b.walkPh += dt * 4 * b.moveAmt; turnTo(b, want, 1.6, dt);
      if (b.cd <= 0 && alive) { if (d < 4) startAct(b, 'stomp'); else if (b.hp < b.maxHp * .6 && b.summons < 2 && Math.random() < .4) startAct(b, 'summon'); else startAct(b, Math.random() < .55 ? 'slam' : 'throw'); }
      if (alive && d < 2.2) hurtPlayer(12, b.x, b.z, 9);
    } else {
      b.moveAmt = lerp(b.moveAmt, 0, .2);
      const a = b.act, t = b.actT;
      if (a === 'slam') {
        if (once(b, 'tel', true)) { const fx = b.x + Math.sin(b.yaw) * 2.6, fz = b.z + Math.cos(b.yaw) * 2.6; b.sx = fx; b.sz = fz; tels.push({ kind: 'circle', x: fx, z: fz, r: 3.0, t: 0, dur: 1.0, fn: () => { G.shake = .4; sfx('boom'); burst(fx, .3, fz, 40, 15, 5, .6, .2); if (Math.hypot(P.x - fx, P.z - fz) < 3.1) hurtPlayer(22, fx, fz, 10); } }); }
        end(1.8, [1.2, 2.0]);
      } else if (a === 'stomp') {
        if (once(b, 'tel', true)) tels.push({ kind: 'circle', x: b.x, z: b.z, r: 3.8, t: 0, dur: .65, fn: () => { G.shake = .3; sfx('boom'); burst(b.x, .3, b.z, 40, 15, 6, .5, .2); if (Math.hypot(P.x - b.x, P.z - b.z) < 3.9) hurtPlayer(16, b.x, b.z, 13); } });
        end(1.1, [1.0, 1.6]);
      } else if (a === 'throw') {
        if (once(b, 'th', t > .6)) {
          const hand = tp(b.W ? b.W[5] : mI(), [-1.4, 1.2, .3]);
          for (let i = 0; i < 3; i++) { const tx = P.x + (i ? rr(-2.5, 2.5) : 0), tz = P.z + (i ? rr(-2.5, 2.5) : 0), du = 1.0 + i * .15; lob(hand[0], hand[1], hand[2], tx, tz, du, 15, .45); tels.push({ kind: 'circle', x: tx, z: tz, r: 1.6, t: 0, dur: du, fn: () => { sfx('boom'); burst(tx, .3, tz, 20, 15, 4, .5, .16); if (Math.hypot(P.x - tx, P.z - tz) < 1.7) hurtPlayer(16, tx, tz); } }); }
        }
        end(2.0, [1.2, 2.0]);
      } else if (a === 'summon') {
        if (once(b, 's', t > .6)) { b.summons++; for (let i = 0; i < 3; i++) { const [sx, sz] = freeSpot(b.x, b.z, 5); spawnEnemy('gosmo', sx, sz, i * .15).summoned = true; } }
        end(1.6, [1, 1.6]);
      } else if (a === 'roar') { end(1.8, [.6, 1]); }
    }
  } else if (b.type === 'skull') {
    if (!b.act) {
      b.cd -= dt;
      let mv = 0; if (d > 7.5) mv = 1; else if (d < 4.5) mv = -1;
      if (alive) { b.x += dx / d * mv * 2 * dt; b.z += dz / d * mv * 2 * dt; const rm = b.room, rd = Math.hypot(b.x - rm.wx, b.z - rm.wz), lim = (rm.r - 2.5) * T; if (rd > lim) { b.x = rm.wx + (b.x - rm.wx) / rd * lim; b.z = rm.wz + (b.z - rm.wz) / rd * lim; } }
      turnTo(b, want, 1.4, dt);
      if (b.cd <= 0 && alive) {
        const th = b.summons === 0 ? .66 : .33;
        if (b.summons < 2 && b.hp < b.maxHp * th) startAct(b, 'summon');
        else { const r = Math.random(); startAct(b, r < .4 ? 'slam' : r < .7 ? 'breath' : 'orbs'); }
      }
    } else {
      const a = b.act, t = b.actT;
      if (a === 'slam') {
        const sT = b.phase2 ? [.95, 1.3] : [1.15, 1.65];
        for (let j = 0; j < 2; j++) {
          const H = b.hand[j], start = j * .45;
          if (once(b, 'aim' + j, t > start)) { H.tx = P.x + P.vx * .3; H.tz = P.z + P.vz * .3; const tx = H.tx, tz = H.tz; tels.push({ kind: 'circle', x: tx, z: tz, r: 2.4, t: 0, dur: sT[j] - start, fn: () => { G.shake = .35; sfx('boom'); burst(tx, .2, tz, 50, 27, 6, .6, .2); if (Math.hypot(P.x - tx, P.z - tz) < 2.5) hurtPlayer(20, tx, tz, 10); if (b.phase2) for (let i = 0; i < 8; i++) { const an = i / 8 * 6.28; shoot({ x: tx, y: .8, z: tz, vx: Math.cos(an) * 6, vz: Math.sin(an) * 6, life: 1.6, dmg: 10, team: 'e', mat: 27, size: .3 }); } } }); }
          if (t > start) { const [lx, lz] = toLocal(b, H.tx, H.tz); H.lx = lx; H.lz = lz; H.k = sm(start, start + .6, t) * (1 - sm(sT[j] + .5, sT[j] + 1.1, t)); H.ly = t < sT[j] - .12 ? 3.0 : lerp(3.0, .45, sm(sT[j] - .12, sT[j], t)); }
        }
        end(2.9, [1.0, 1.7]);
      } else if (a === 'breath') {
        const mouth = b.W ? tp(b.W[1], [0, 2.15, 1.1]) : [b.x, 2, b.z];
        if (once(b, 'tel', true)) { b.bAng = want; tels.push({ kind: 'cone', x: mouth[0], z: mouth[2], ang: want, ha: .38, len: 9.5, t: 0, dur: .8, mat: 27 }); }
        if (t > .8 && t < 2.6) {
          b.bAng += clamp(angDiff(b.bAng, want), -.7 * dt, .7 * dt); b.yaw = b.bAng;
          rate('sb', 320, dt, () => { const sp = rr(6, 8), j = .1, a2 = b.bAng + rr(-.3, .3); spawn({ x: mouth[0], y: mouth[1], z: mouth[2], vx: Math.sin(a2) * sp, vy: rr(-1.5, -.5), vz: Math.cos(a2) * sp, life: rr(.8, 1.1), s0: .14, s1: rr(.4, .6), b0: 1, b1: .05, mat: 27, drag: 1.1, buoy: .6, floor: true }); });
          b.tick = (b.tick || 0) - dt; if (b.tick <= 0) { b.tick = .22; if (inCone(P.x, P.z, mouth[0], mouth[2], b.bAng, .38, 9.5)) { P.iframe = 0; hurtPlayer(7, mouth[0], mouth[2], 3); P.iframe = .15; } }
        } else turnTo(b, want, 1.2, dt);
        end(3.0, [1.0, 1.8]);
      } else if (a === 'orbs') {
        const n = b.phase2 ? 14 : 10, c = b.W ? tp(b.W[1], [0, 3.0, .5]) : [b.x, 3, b.z];
        for (const [k, tt, off] of [['o1', .5, 0], ['o2', 1.1, .5]]) if (once(b, k, t > tt)) { sfx('shoot'); for (let i = 0; i < n; i++) { const an = (i + off) / n * 6.283; shoot({ x: c[0], y: 1.1, z: c[2], vx: Math.sin(an) * 5, vz: Math.cos(an) * 5, life: 3.5, dmg: 12, team: 'e', mat: 21, size: .38, r: .35 }); } }
        end(2.2, [1.0, 1.6]);
      } else if (a === 'summon') {
        if (once(b, 's', t > .7)) { b.summons++; sfx('roar'); for (let i = 0; i < 3; i++) { const [sx, sz] = freeSpot(b.room.wx, b.room.wz, (b.room.r - 2) * T); spawnEnemy('skel', sx, sz, i * .2).summoned = true; } }
        end(1.8, [1, 1.6]);
      } else if (a === 'roar') { end(1.8, [.5, 1]); }
    }
    b.lift = lerp(b.lift, b.act === 'breath' ? .3 : 0, .05);
  } else if (b.type === 'spider') {
    if (!b.act) {
      b.cd -= dt;
      if (d > 4 && alive) { const sp = b.phase2 ? 3.4 : 2.6; b.x += dx / d * sp * dt; b.z += dz / d * sp * dt; b.moveAmt = lerp(b.moveAmt, 1, .15); } else b.moveAmt = lerp(b.moveAmt, 0, .15);
      b.walkPh += dt * 7 * b.moveAmt; turnTo(b, want, 3, dt); clampRoom(b);
      if (alive && d < 2.4) hurtPlayer(14, b.x, b.z, 9);
      if (b.cd <= 0 && alive) { if (b.summons < 3 && b.hp < b.maxHp * (.8 - b.summons * .25)) startAct(b, 'brood'); else startAct(b, Math.random() < .45 ? 'leap' : 'web'); }
    } else {
      b.moveAmt = lerp(b.moveAmt, 0, .2); const a = b.act, t = b.actT;
      if (a === 'leap') {
        if (once(b, 'tel', true)) { b.lx0 = b.x; b.lz0 = b.z; b.ltx = P.x; b.ltz = P.z; const tx = b.ltx, tz = b.ltz; tels.push({ kind: 'circle', x: tx, z: tz, r: 3, t: 0, dur: 1.0, mat: 143, fn: () => { G.shake = .4; sfx('boom'); burst(tx, .3, tz, 50, 143, 6, .6, .2); if (Math.hypot(P.x - tx, P.z - tz) < 3.1) hurtPlayer(22, tx, tz, 12); } }); }
        if (t > .35 && t < 1.0) { const k = sm(.35, 1.0, t); b.x = lerp(b.lx0, b.ltx, k); b.z = lerp(b.lz0, b.ltz, k); b.hop = Math.sin(k * Math.PI) * 3.5; } else b.hop = 0;
        end(1.7, [.8, 1.4]);
      } else if (a === 'web') {
        if (once(b, 'w', t > .5)) { sfx('shoot'); const n = b.phase2 ? 7 : 5; for (let i = 0; i < n; i++) { const an = want + (i - (n - 1) / 2) * .22; shoot({ x: b.x + Math.sin(an) * 1.5, y: 1.2, z: b.z + Math.cos(an) * 1.5, vx: Math.sin(an) * 9, vz: Math.cos(an) * 9, life: 1.4, dmg: 9, team: 'e', mat: 143, size: .42, r: .4, web: true }); } }
        end(1.4, [.8, 1.3]);
      } else if (a === 'brood') { if (once(b, 's', t > .6)) { b.summons++; for (let i = 0; i < 4; i++) { const [sx, sz] = freeSpot(b.x, b.z, 4); spawnEnemy('aranha', sx, sz, i * .1).summoned = true; } } end(1.4, [.8, 1.2]); }
      else if (a === 'roar') end(1.8, [.5, 1]);
    }
  } else if (b.type === 'knight') {
    if (!b.act) {
      b.cd -= dt;
      if (d > 3 && alive) { const sp = b.phase2 ? 3.0 : 2.3; b.x += dx / d * sp * dt; b.z += dz / d * sp * dt; b.moveAmt = lerp(b.moveAmt, 1, .15); } else b.moveAmt = lerp(b.moveAmt, 0, .15);
      b.walkPh += dt * 4.5 * b.moveAmt; turnTo(b, want, 2.4, dt); clampRoom(b);
      if (b.cd <= 0 && alive) { const r = Math.random(); if (d < 4.5) startAct(b, b.phase2 && r < .35 ? 'whirl' : 'sweep'); else startAct(b, r < .5 ? 'charge' : 'spikes'); }
    } else {
      b.moveAmt = lerp(b.moveAmt, 0, .2); const a = b.act, t = b.actT;
      if (a === 'sweep') {
        if (once(b, 'tel', true)) { b.sAng = b.yaw; tels.push({ kind: 'cone', x: b.x, z: b.z, ang: b.yaw, ha: 1.25, len: 5, t: 0, dur: .7, mat: 134, fn: () => { sfx('swing'); G.shake = .25; if (inCone(P.x, P.z, b.x, b.z, b.sAng, 1.25, 5)) hurtPlayer(24, b.x, b.z, 12); for (let i = 0; i < 30; i++) { const an = b.sAng - 1.25 + i / 29 * 2.5; spawn({ x: b.x + Math.sin(an) * 3.5, y: 1.2, z: b.z + Math.cos(an) * 3.5, vx: Math.sin(an) * 3, vz: Math.cos(an) * 3, life: .25, s0: .3, s1: .05, b0: 1, b1: .2, mat: 134 }); } } }); }
        end(1.3, [.7, 1.2]);
      } else if (a === 'charge') {
        if (once(b, 'tel', true)) { b.cAng = want; b.yaw = want; tels.push({ kind: 'line', x: b.x, z: b.z, ang: want, len: 14, w: 2.2, t: 0, dur: .85, mat: 134 }); }
        if (t > .85 && t < 1.55) { b.x += Math.sin(b.cAng) * 17 * dt; b.z += Math.cos(b.cAng) * 17 * dt; clampRoom(b, 2); if (Math.random() < .8) spawn({ x: b.x, y: .3, z: b.z, vy: .5, life: .4, s0: .3, s1: .05, b0: .6, b1: .05, mat: 134 }); if (alive && Math.hypot(P.x - b.x, P.z - b.z) < 2) hurtPlayer(26, b.x, b.z, 15); }
        end(2.0, [.8, 1.3]);
      } else if (a === 'spikes') {
        if (once(b, 's', true)) { const an = want; for (let i = 1; i <= 7; i++) { const x = b.x + Math.sin(an) * i * 1.8, z = b.z + Math.cos(an) * i * 1.8; tels.push({ kind: 'circle', x, z, r: 1.3, t: 0, dur: .7 + i * .12, mat: 134, fn: () => { sfx('hit'); burst(x, .2, z, 16, 134, 4, .5, .18); for (let k = 0; k < 6; k++) spawn({ x: x + rr(-.4, .4), y: 0, z: z + rr(-.4, .4), vy: rr(4, 7), life: .4, s0: .2, s1: .05, b0: 1, b1: .3, mat: 134, buoy: -12 }); if (Math.hypot(P.x - x, P.z - z) < 1.4) hurtPlayer(18, x, z, 8); } }); } }
        end(2.2, [.8, 1.3]);
      } else if (a === 'whirl') {
        if (t > .3 && t < 2.4) { b.x += dx / d * 2.2 * dt; b.z += dz / d * 2.2 * dt; clampRoom(b); b.tick = (b.tick || 0) - dt; if (b.tick <= 0) { b.tick = .25; if (d < 3.2) { P.iframe = 0; hurtPlayer(9, b.x, b.z, 6); P.iframe = .15; } } if (Math.random() < .9) { const an = rr(0, 6.28); spawn({ x: b.x + Math.cos(an) * 3, y: 1, z: b.z + Math.sin(an) * 3, vx: -Math.sin(an) * 6, vz: Math.cos(an) * 6, life: .3, s0: .25, s1: .05, b0: 1, b1: .2, mat: 134 }); } }
        end(2.6, [.8, 1.2]);
      } else if (a === 'roar') { if (once(b, 'sum', t > 1)) for (let i = 0; i < 3; i++) { const [sx, sz] = freeSpot(b.room.wx, b.room.wz, (b.room.r - 2) * T); spawnEnemy(RTYPES[G.rift ? G.rift.base : 'crypt'][0], sx, sz, i * .2).summoned = true; } end(2, [.5, 1]); }
    }
  } else if (b.type === 'eye') {
    if (!b.act) {
      b.cd -= dt; let mv = 0; if (d > 9) mv = 1; else if (d < 5) mv = -1;
      if (alive) { b.x += dx / d * mv * 2 * dt; b.z += dz / d * mv * 2 * dt; clampRoom(b); }
      turnTo(b, want, 2, dt);
      if (b.cd <= 0 && alive) { const r = Math.random(); startAct(b, r < .35 ? 'beam' : r < .6 ? 'orbs' : r < .82 ? 'rain' : 'blink'); }
    } else {
      const a = b.act, t = b.actT;
      if (a === 'beam') {
        if (once(b, 'tel', true)) { b.bAng = want; b.yaw = want; b.bDir = Math.random() < .5 ? 1 : -1; tels.push({ kind: 'line', x: b.x, z: b.z, ang: want, len: 16, w: 1.4, t: 0, dur: 1.0, mat: 151 }); }
        if (t > 1.0 && t < 2.8) {
          b.bAng += (b.phase2 ? .75 : .5) * dt * b.bDir; b.yaw = b.bAng; const ux = Math.sin(b.bAng), uz = Math.cos(b.bAng);
          rate('eb', 160, dt, () => { const r = rr(1, 16); spawn({ x: b.x + ux * r, y: rr(.7, 1.7), z: b.z + uz * r, vx: rr(-.5, .5), vy: rr(-.2, .5), vz: rr(-.5, .5), life: .25, s0: .34, s1: .05, b0: 1, b1: .3, mat: 151 }); });
          b.tick = (b.tick || 0) - dt; if (b.tick <= 0) { b.tick = .2; const px = P.x - b.x, pz = P.z - b.z, along = px * ux + pz * uz, perp = Math.abs(px * uz - pz * ux); if (along > 0 && along < 16 && perp < .9) { P.iframe = 0; hurtPlayer(9, b.x, b.z, 3); P.iframe = .12; } }
        }
        end(3.0, [1, 1.6]);
      } else if (a === 'orbs') {
        for (const [k, tt, off] of [['o1', .4, 0], ['o2', .9, .5], ['o3', 1.4, .25]]) if (once(b, k, t > tt && (k !== 'o3' || b.phase2))) { sfx('shoot'); for (let i = 0; i < 12; i++) { const an = (i + off) / 12 * 6.283; shoot({ x: b.x, y: 1.6, z: b.z, vx: Math.sin(an) * 5.5, vz: Math.cos(an) * 5.5, life: 3.5, dmg: 11, team: 'e', mat: 151, size: .4, r: .35 }); } }
        end(1.9, [.9, 1.4]);
      } else if (a === 'rain') {
        if (once(b, 'r', t > .4)) { const n = b.phase2 ? 8 : 5; for (let i = 0; i < n; i++) { const tx = P.x + (i ? rr(-4, 4) : 0), tz = P.z + (i ? rr(-4, 4) : 0), du = 1 + i * .1; tels.push({ kind: 'circle', x: tx, z: tz, r: 1.6, t: 0, dur: du, mat: 151, fn: () => { sfx('boom'); burst(tx, .3, tz, 26, 146, 5, .5, .18); if (Math.hypot(P.x - tx, P.z - tz) < 1.7) hurtPlayer(16, tx, tz); } }); shoot({ x: tx, y: 12, z: tz, vy: -11.7 / du, life: du, team: 'v', mat: 151, size: .5, trail: 1 }); } }
        end(2.2, [.9, 1.4]);
      } else if (a === 'blink') {
        if (once(b, 'out', true)) burst(b.x, 2.6, b.z, 40, 151, 5, .5, .2);
        if (once(b, 'in', t > .6)) { const [nx2, nz2] = freeSpot(b.room.wx, b.room.wz, (b.room.r - 3) * T); b.x = nx2; b.z = nz2; burst(b.x, 2.6, b.z, 40, 151, 5, .5, .2); sfx('skill'); }
        b.blinkDis = t < .6 ? sm(0, .5, t) : t < 1.1 ? 1 - sm(.6, 1, t) : 0;
        end(1.3, [.3, .6]);
      } else if (a === 'roar') { if (once(b, 'sum', t > 1)) for (let i = 0; i < 3; i++) { const [sx, sz] = freeSpot(b.room.wx, b.room.wz, (b.room.r - 2) * T); spawnEnemy('wisp', sx, sz, i * .2).summoned = true; } end(2, [.5, 1]); }
    }
  } else if (b.type === 'hydra') {
    const HS = b.model.heads, W = b.W, hpos = k => W && W[HS[k].hb] ? tp(W[HS[k].hb], V.add(HS[k].tip, V.mul(HS[k].fw, .8))) : [b.x, 3.5, b.z];
    if (!b.act) {
      b.cd -= dt; turnTo(b, want, b.phase2 ? 1.2 : .8, dt);
      if (alive && d < 3.6) hurtPlayer(14, b.x, b.z, 12);
      if (b.cd <= 0 && alive) { const r = Math.random(); if (d < 6.5 && r < .45) startAct(b, 'bite'); else if (r < .3) startAct(b, 'spit'); else if (r < .55) startAct(b, 'breath'); else if (r < .72 && b.hp < b.maxHp * .8) startAct(b, 'dive'); else if (r < .84 && b.summons < (b.phase2 ? 4 : 2)) startAct(b, 'summon'); else startAct(b, d < 7 ? 'bite' : 'spit'); }
    } else {
      const a = b.act, t = b.actT;
      if (a === 'bite') {
        for (const [k, tt] of [[0, 0], [2, .45], [1, b.phase2 ? .9 : 99]]) if (once(b, 't' + k, t > tt)) {
          const h = HS[k], bx = b.x + Math.sin(b.yaw + h.ang) * 1.8, bz = b.z + Math.cos(b.yaw + h.ang) * 1.8, a2 = Math.atan2(P.x - bx, P.z - bz); b['bA' + k] = a2; b['bT' + k] = t;
          tels.push({ kind: 'line', x: bx, z: bz, ang: a2, len: 6.5, w: 1.6, t: 0, dur: .65, mat: 26, fn: () => { sfx('swing'); G.shake = Math.max(G.shake, .2); const px = P.x - bx, pz = P.z - bz, sx = Math.sin(a2), cz = Math.cos(a2), al = px * sx + pz * cz, pr = Math.abs(px * cz - pz * sx); if (al > 0 && al < 6.7 && pr < 1) hurtPlayer(24, bx, bz, 10); burst(bx + sx * 5.5, .3, bz + cz * 5.5, 16, 15, 3, .4, .14); } });
        }
        end(b.phase2 ? 1.9 : 1.6, [.8, 1.4]);
      } else if (a === 'spit') {
        for (const [k, tt] of [[0, .5], [2, .8], [1, 1.1]]) if (once(b, 's' + k, t > tt)) {
          const h = hpos(k), n = b.phase2 ? 2 : 1; b.spitHead = k; b.spitT = t; sfx('shoot');
          for (let i = 0; i < n; i++) { const tx = P.x + (i ? rr(-3, 3) : P.vx * .4), tz = P.z + (i ? rr(-3, 3) : P.vz * .4), du = 1.0 + i * .15; lob(h[0], h[1], h[2], tx, tz, du, 26, .5); tels.push({ kind: 'circle', x: tx, z: tz, r: 1.7, t: 0, dur: du, mat: 26, fn: () => { sfx('boom'); burst(tx, .3, tz, 24, 26, 4, .5, .18); if (Math.hypot(P.x - tx, P.z - tz) < 1.8) hurtPlayer(18, tx, tz); G.zones.push({ x: tx, z: tz, r: 1.7, t: 0, dur: 5, team: 'e', dmg: 7, tick: .4, mat: 26 }); } }); }
        }
        end(1.8, [.9, 1.5]);
      } else if (a === 'breath') {
        const h = hpos(1);
        if (once(b, 'tel', true)) { b.bAng = want; tels.push({ kind: 'cone', x: b.x, z: b.z, ang: want, ha: .5, len: 10, t: 0, dur: .9, mat: 26 }); }
        if (t < .3) turnTo(b, want, 2.5, dt);
        if (t > 1.0 && t < 2.8) {
          b.sweep = .7 * Math.sin((t - 1) * 2.2); const ang = b.bAng + b.sweep * .6;
          rate('hb', 300, dt, () => { const sp = rr(6, 8.5), a2 = ang + rr(-.22, .22); spawn({ x: h[0], y: h[1], z: h[2], vx: Math.sin(a2) * sp, vy: rr(-2.4, -1.2), vz: Math.cos(a2) * sp, life: rr(.9, 1.2), s0: .18, s1: rr(.5, .8), b0: .9, b1: .03, mat: 26, drag: 1.3, buoy: .6, floor: true }); });
          b.tick = (b.tick || 0) - dt; if (b.tick <= 0) { b.tick = .25; if (inCone(P.x, P.z, b.x, b.z, ang, .34, 10)) { P.iframe = 0; hurtPlayer(8, b.x, b.z, 3); P.slowT = .6; P.iframe = .15; } }
        } else b.sweep = 0;
        end(3.2, [1, 1.6]);
      } else if (a === 'dive') {
        if (once(b, 'out', true)) { sfx('boom'); burst(b.x, .5, b.z, 50, 15, 5, .6, .2); }
        b.blinkDis = t < .7 ? sm(0, .7, t) : t < 1.9 ? 1 : 1 - sm(1.9, 2.3, t);
        if (once(b, 'tel', t > .8)) { const rm = b.room; let tx = P.x, tz = P.z; const rd = Math.hypot(tx - rm.wx, tz - rm.wz), lim = (rm.r - 3) * T; if (rd > lim) { tx = rm.wx + (tx - rm.wx) / rd * lim; tz = rm.wz + (tz - rm.wz) / rd * lim; } b.dx2 = tx; b.dz2 = tz; tels.push({ kind: 'circle', x: tx, z: tz, r: 3.2, t: 0, dur: 1.0, mat: 26, fn: () => { b.x = tx; b.z = tz; b.yaw = Math.atan2(P.x - tx, P.z - tz); G.shake = .45; sfx('boom'); burst(tx, .5, tz, 70, 15, 7, .7, .22); burst(tx, .5, tz, 30, 26, 5, .5, .18); if (Math.hypot(P.x - tx, P.z - tz) < 3.3) hurtPlayer(28, tx, tz, 15); } }); }
        if (t > .8 && t < 1.8 && Math.random() < .5) spawn({ x: b.dx2 + rr(-2, 2), y: .1, z: b.dz2 + rr(-2, 2), vy: rr(.5, 1.5), life: .6, s0: .15, s1: .05, b0: .6, b1: .1, mat: 15 });
        end(2.6, [.8, 1.3]);
      } else if (a === 'summon' || a === 'roar') {
        if (once(b, 'sum', t > 1)) { b.summons++; const n = b.phase2 ? 3 : 2; for (let i = 0; i < n; i++) { const [sx, sz] = freeSpot(b.room.wx, b.room.wz, (b.room.r - 2) * T); spawnEnemy(i === 2 ? 'afogado' : 'sapo', sx, sz, i * .2).summoned = true; } }
        G.shake = Math.max(G.shake, sm(0, .3, t) * (1 - sm(1.4, 2, t)) * .08);
        end(2.2, [.6, 1]);
      } else end(.1, [.5, .8]);
    }
  } else if (b.type === 'reflexo') {
    const cls = G.char.cls, M = 158;
    if (!b.act) {
      b.cd -= dt;
      const pref = cls === 'lamina' ? 2.4 : 6.5, mv = d > pref + 1 ? 1 : d < pref - 1.5 ? -1 : 0, ux = dx / (d || 1), uz = dz / (d || 1), orb = Math.sin(b.t * .9) * (cls === 'lamina' ? .4 : 1);
      if (alive) { const sp = b.phase2 ? 4.2 : 3.4; b.x += (ux * mv - uz * orb) * sp * dt; b.z += (uz * mv + ux * orb) * sp * dt; }
      b.moveAmt = lerp(b.moveAmt, mv || Math.abs(orb) > .3 ? 1 : 0, .15); b.walkPh += dt * 7 * b.moveAmt; turnTo(b, want, 5, dt); clampRoom(b);
      if (b.cd <= 0 && alive) {
        const r = Math.random();
        if (b.phase2 && r < .16 && b.summons < 3) startAct(b, 'mirror');
        else if (cls === 'lamina') startAct(b, d < 4 ? (r < .6 ? 'slash' : 'spin') : 'dash');
        else if (cls === 'arcano') startAct(b, d < 3.5 ? 'nova' : r < .55 ? 'bolts' : r < .8 ? 'rain' : 'blink');
        else startAct(b, d < 3.5 ? 'roll' : r < .6 ? 'volley' : 'rain');
      }
    } else {
      b.moveAmt = lerp(b.moveAmt, 0, .2); const a = b.act, t = b.actT;
      if (a === 'slash') {
        for (const [k, tt] of [[0, 0], [1, .55], [2, 1.1]]) if (once(b, 'c' + k, t > tt)) { const an = Math.atan2(P.x - b.x, P.z - b.z); b.yaw = an; b.combo = k; b.cT = t; tels.push({ kind: 'cone', x: b.x, z: b.z, ang: an, ha: 1.1, len: 3.8, t: 0, dur: .42, mat: M, fn: () => { sfx('swing'); if (inCone(P.x, P.z, b.x, b.z, an, 1.1, 3.9)) hurtPlayer(20, b.x, b.z, 9); b.x += Math.sin(an) * .8; b.z += Math.cos(an) * .8; clampRoom(b); for (let i = 0; i < 18; i++) { const q = an - 1.1 + i / 17 * 2.2; spawn({ x: b.x + Math.sin(q) * 2.6, y: 1.2, z: b.z + Math.cos(q) * 2.6, vx: Math.sin(q) * 3, vz: Math.cos(q) * 3, life: .25, s0: .25, s1: .05, b0: 1, b1: .2, mat: M }); } } }); }
        end(1.9, [.6, 1.1]);
      } else if (a === 'spin') {
        if (t > .35 && t < 2.2) { b.x += dx / (d || 1) * 2.6 * dt; b.z += dz / (d || 1) * 2.6 * dt; clampRoom(b); b.tick = (b.tick || 0) - dt; if (b.tick <= 0) { b.tick = .25; if (d < 3) { P.iframe = 0; hurtPlayer(9, b.x, b.z, 6); P.iframe = .15; } } if (Math.random() < .9) { const q = rr(0, 6.28); spawn({ x: b.x + Math.cos(q) * 2.8, y: 1, z: b.z + Math.sin(q) * 2.8, vx: -Math.sin(q) * 6, vz: Math.cos(q) * 6, life: .3, s0: .25, s1: .05, b0: 1, b1: .2, mat: M }); } }
        end(2.4, [.7, 1.1]);
      } else if (a === 'dash' || a === 'roll') {
        if (once(b, 'tel', true)) { const an = a === 'dash' ? want : want + Math.PI + rr(-.6, .6); b.cAng = an; if (a === 'dash') { b.yaw = an; tels.push({ kind: 'line', x: b.x, z: b.z, ang: an, len: 12, w: 2, t: 0, dur: .7, mat: M }); } }
        const t0 = a === 'dash' ? .7 : 0, t1 = a === 'dash' ? 1.3 : .35, sp = a === 'dash' ? 20 : 15;
        if (t > t0 && t < t1) { b.x += Math.sin(b.cAng) * sp * dt; b.z += Math.cos(b.cAng) * sp * dt; clampRoom(b, 2); spawn({ x: b.x, y: rr(.3, 1.8), z: b.z, life: .35, s0: .3, s1: .05, b0: .8, b1: .05, mat: M }); if (a === 'dash' && alive && Math.hypot(P.x - b.x, P.z - b.z) < 1.8) hurtPlayer(22, b.x, b.z, 14); }
        if (a === 'roll') for (const [k, tt] of [['r1', .5], ['r2', .7], ['r3', .9]]) if (once(b, k, t > tt)) { const an = Math.atan2(P.x - b.x, P.z - b.z); b.yaw = an; sfx('shoot'); for (let i = -1; i <= 1; i++) shoot({ x: b.x, y: 1.2, z: b.z, vx: Math.sin(an + i * .14) * 13, vz: Math.cos(an + i * .14) * 13, life: 1.5, dmg: 12, team: 'e', mat: M, size: .32, r: .3, trail: .8 }); }
        end(a === 'dash' ? 1.8 : 1.3, [.6, 1.1]);
      } else if (a === 'bolts' || a === 'volley') {
        for (const [k, tt] of [['w1', .45], ['w2', .95], ['w3', 1.45]]) if (once(b, k, t > tt && (k !== 'w3' || b.phase2))) {
          const an = Math.atan2(P.x - b.x, P.z - b.z), n = a === 'bolts' ? (b.phase2 ? 7 : 5) : 5, spr = a === 'bolts' ? .22 : .12; b.yaw = an; sfx('shoot');
          for (let i = 0; i < n; i++) { const q = an + (i - (n - 1) / 2) * spr; shoot({ x: b.x, y: 1.3, z: b.z, vx: Math.sin(q) * (a === 'bolts' ? 8 : 13), vz: Math.cos(q) * (a === 'bolts' ? 8 : 13), life: 2.4, dmg: a === 'bolts' ? 13 : 12, team: 'e', mat: M, size: a === 'bolts' ? .4 : .3, r: .32, trail: .8 }); }
        }
        end(2.0, [.7, 1.2]);
      } else if (a === 'nova') {
        if (once(b, 'tel', true)) tels.push({ kind: 'circle', x: b.x, z: b.z, r: 4, t: 0, dur: .75, mat: M, fn: () => { sfx('boom'); G.shake = .3; for (let i = 0; i < 50; i++) { const q = i / 50 * 6.283; spawn({ x: b.x, y: 1, z: b.z, vx: Math.cos(q) * 9, vz: Math.sin(q) * 9, life: .45, s0: .25, s1: .05, b0: 1, b1: .2, mat: M }); } if (Math.hypot(P.x - b.x, P.z - b.z) < 4.1) hurtPlayer(24, b.x, b.z, 12); } });
        if (once(b, 'go', t > 1.1)) { startAct(b, 'blink'); return; }
        end(1.3, [.6, 1]);
      } else if (a === 'blink') {
        if (once(b, 'out', true)) burst(b.x, 1.5, b.z, 40, M, 5, .5, .2);
        if (once(b, 'in', t > .5)) { const [nx2, nz2] = freeSpot(b.room.wx, b.room.wz, (b.room.r - 3) * T); b.x = nx2; b.z = nz2; burst(b.x, 1.5, b.z, 40, M, 5, .5, .2); sfx('skill'); }
        b.blinkDis = t < .5 ? sm(0, .45, t) : t < 1 ? 1 - sm(.5, .9, t) : 0;
        end(1.1, [.3, .6]);
      } else if (a === 'rain') {
        if (once(b, 'r', t > .5)) { const n = b.phase2 ? 9 : 6; for (let i = 0; i < n; i++) { const tx = P.x + (i ? rr(-4, 4) : P.vx * .4), tz = P.z + (i ? rr(-4, 4) : P.vz * .4), du = 1.1 + i * .1; tels.push({ kind: 'circle', x: tx, z: tz, r: 1.5, t: 0, dur: du, mat: M, fn: () => { sfx('boom'); burst(tx, .3, tz, 22, M, 4, .5, .16); if (Math.hypot(P.x - tx, P.z - tz) < 1.6) hurtPlayer(16, tx, tz); } }); shoot({ x: tx, y: 12, z: tz, vy: -11.7 / du, life: du, team: 'v', mat: M, size: .45, trail: 1 }); } }
        end(2.2, [.8, 1.3]);
      } else if (a === 'mirror' || a === 'roar') {
        if (once(b, 'sum', t > 1)) { b.summons++; for (let i = 0; i < 2; i++) { const [sx, sz] = freeSpot(b.room.wx, b.room.wz, (b.room.r - 2) * T); spawnEnemy(i ? 'sentinela' : 'fantasma', sx, sz, i * .25).summoned = true; } }
        if (a === 'roar') b.invuln = Math.max(b.invuln, 0);
        end(2, [.5, 1]);
      } else end(.1, [.5, .8]);
    }
  } else if (b.type === 'dragon') {
    const W = b.W, head = W && W[6] ? tp(W[6], [0, 3.4, 3.2]) : [b.x, 3.4, b.z];
    if (!b.act) {
      b.cd -= dt;
      if (d > 8 && alive) { const sp = b.phase2 ? 2.6 : 2.0; b.x += Math.sin(b.yaw) * sp * dt; b.z += Math.cos(b.yaw) * sp * dt; b.moveAmt = lerp(b.moveAmt, 1, .1); } else b.moveAmt = lerp(b.moveAmt, 0, .1);
      b.walkPh += dt * 5 * b.moveAmt; turnTo(b, want, b.phase2 ? 1.9 : 1.4, dt);
      const rm = b.room, rd = Math.hypot(b.x - rm.wx, b.z - rm.wz), lim = (rm.r - 2.8) * T; if (rd > lim) { b.x = rm.wx + (b.x - rm.wx) / rd * lim; b.z = rm.wz + (b.z - rm.wz) / rd * lim; }
      if (b.cd <= 0 && alive) {
        const behind = Math.abs(angDiff(b.yaw, want)) > 1.9;
        if (behind && d < 7.5) startAct(b, 'tail');
        else if (d < 4.2) startAct(b, 'stomp');
        else { const r = Math.random(); startAct(b, r < .4 ? 'breath' : (r < .75 || d > 9) ? 'rain' : 'gust'); }
      }
    } else {
      b.moveAmt = lerp(b.moveAmt, 0, .2);
      const a = b.act, t = b.actT;
      if (a === 'breath') {
        if (once(b, 'tel', t > .1)) { b.bAng = b.yaw; tels.push({ kind: 'cone', x: head[0], z: head[2], ang: b.yaw, ha: .48, len: 11, t: 0, dur: .8, mat: 27 }); }
        if (t < .1) turnTo(b, want, 3, dt);
        if (t > .9 && t < 2.6) {
          b.sweep = .8 * Math.sin((t - .9) * 2.4); const ang = b.yaw + b.sweep * .65;
          rate('db', 420, dt, () => { const sp = rr(7, 9.5), a2 = ang + rr(-.2, .2); spawn({ x: head[0], y: head[1], z: head[2], vx: Math.sin(a2) * sp, vy: rr(-2.6, -1.4), vz: Math.cos(a2) * sp, life: rr(.8, 1.15), s0: .16, s1: rr(.55, .8), b0: 1, b1: .03, mat: 27, drag: 1.2, buoy: 1.4, floor: true }); });
          b.tick = (b.tick || 0) - dt; if (b.tick <= 0) { b.tick = .22; if (inCone(P.x, P.z, head[0], head[2], ang, .32, 11)) { P.iframe = 0; hurtPlayer(9, head[0], head[2], 3); P.iframe = .15; } }
        } else b.sweep = 0;
        end(3.2, [1.0, 1.8]);
      } else if (a === 'rain' || a === 'roar') {
        if (a === 'rain' && once(b, 'r', t > .6)) {
          const n = b.phase2 ? 10 : 6; sfx('roar');
          for (let i = 0; i < n; i++) { const tx = P.x + (i ? rr(-5, 5) : P.vx * .4), tz = P.z + (i ? rr(-5, 5) : P.vz * .4), du = 1.2 + i * .12; shoot({ x: tx + rr(-1, 1), y: 14, z: tz - 4, vx: (-rr(-1, 1)) / du * 0, vy: -(14 - .3) / du, vz: 4 / du, life: du, team: 'v', mat: 27, size: .6, trail: 1 }); tels.push({ kind: 'circle', x: tx, z: tz, r: 1.7, t: 0, dur: du, mat: 27, fn: () => { sfx('boom'); burst(tx, .3, tz, 30, 27, 5, .6, .2); if (Math.hypot(P.x - tx, P.z - tz) < 1.8) hurtPlayer(18, tx, tz); } }); }
        }
        if (a === 'roar' && once(b, 'sum', t > 1.0)) for (let i = 0; i < 2; i++) { const [sx, sz] = freeSpot(b.room.wx, b.room.wz, (b.room.r - 2) * T); spawnEnemy('imp', sx, sz, i * .2).summoned = true; }
        G.shake = Math.max(G.shake, sm(0, .3, t) * (1 - sm(1.4, 2, t)) * .08);
        end(a === 'roar' ? 2.2 : 3.0, [1.0, 1.6]);
      } else if (a === 'gust') {
        for (const [k, tt] of [['g1', .9], ['g2', 1.5]]) if (once(b, k, t > tt)) {
          sfx('dash'); G.shake = .2;
          if (d < 10 && alive) { P.kx += dx / d * 13; P.kz += dz / d * 13; }
          for (let i = 0; i < 5; i++) { const an = b.yaw - .5 + i * .25; shoot({ x: head[0], y: 1.2, z: head[2], vx: Math.sin(an) * 7, vz: Math.cos(an) * 7, life: 2.2, dmg: 12, team: 'e', mat: 27, size: .45, r: .4 }); }
          for (let i = 0; i < 60; i++) { const an = b.yaw + rr(-.8, .8); spawn({ x: b.x + Math.sin(an) * 2, y: rr(.2, 2), z: b.z + Math.cos(an) * 2, vx: Math.sin(an) * 12, vz: Math.cos(an) * 12, life: .5, s0: .12, s1: .03, b0: .5, b1: .1, mat: 14, drag: 2 }); }
        }
        end(2.2, [1.0, 1.6]);
      } else if (a === 'tail') {
        if (once(b, 'tel', true)) { const ang = b.yaw + Math.PI; tels.push({ kind: 'cone', x: b.x, z: b.z, ang, ha: 1.2, len: 7.5, t: 0, dur: .7, mat: 27, fn: () => { G.shake = .3; sfx('swing'); if (inCone(P.x, P.z, b.x, b.z, ang, 1.2, 7.5)) hurtPlayer(20, b.x, b.z, 14); } }); }
        end(1.5, [.8, 1.4]);
      } else if (a === 'stomp') {
        if (once(b, 'tel', true)) { const fx = b.x + Math.sin(b.yaw) * 2.2, fz = b.z + Math.cos(b.yaw) * 2.2; tels.push({ kind: 'circle', x: fx, z: fz, r: 4.0, t: 0, dur: .6, mat: 27, fn: () => { G.shake = .35; sfx('boom'); burst(fx, .3, fz, 40, 15, 6, .5, .2); if (Math.hypot(P.x - fx, P.z - fz) < 4.1) hurtPlayer(16, fx, fz, 13); } }); }
        end(1.2, [.8, 1.4]);
      }
    }
  }
}
function finishBoss(b) {
  coopBossDone();
  if (G.rift) { finishRift(b); return; }
  const type = b.type, key = RG.key;
  if (G.rematch) {
    G.rematch = false; const D = curDiff();
    gainXp(Math.round((b.def.xp || 320) * D.xp)); dropGold(b.x, b.z, Math.round((b.def.gold || 150) * .6));
    dropItem(b.x - 1.2, b.z + 1, rollRar(2)); dropItem(b.x + 1.2, b.z + 1, Math.max(3, rollRar(3))); if (Math.random() < .25 + .06 * (G.save.diff || 0)) dropItem(b.x, b.z + 2.2, rollRar(3));
    diffFirst(key, b); endBossFight(true); boss = null; writeSave();
    toast('DESAFIO VENCIDO', true, b.def.name.split(',')[0] + ' · ' + D.n, D.c); sfx('legend'); return;
  }
  G.save.bosses[key] = true;
  gainXp(Math.round(b.def.xp * curDiff().xp)); dropGold(b.x, b.z, b.def.gold); diffFirst(key, b);
  if (type !== 'dragon') { dropItem(b.x - 1.2, b.z + 1, rollRar(2)); dropItem(b.x + 1.2, b.z + 1, Math.max(3, rollRar(3))); }
  endBossFight(true); boss = null;
  if (type === 'dragon') { G.save.cp = { region: key, x: b.room.wx, z: b.room.wz + 7 }; writeSave(); say(DIALOG.dragonEnd(false), () => { }); return; }
  inter.push({ kind: 'portal', to: 'hub', x: b.room.wx, z: b.room.wz, r: 2, model: getModel('portal'), anim: newAnim(getModel('portal')), lit: true, yaw: 0 });
  inter.push({ kind: 'altar', x: b.room.wx - 4.5, z: b.room.wz + 3.5, r: 1.9, model: getModel('pedestal'), anim: newAnim(getModel('pedestal')), yaw: 0 });
  G.save.cp = { region: key, x: b.room.wx, z: b.room.wz + 3 };
  writeSave();
  say(DIALOG.bossOutro(type), () => { updateObjective(); toast(REG[key].fio + ' OBTIDO', true, 'um portal de volta à vila se abriu'); if (type === 'reflexo') setTimeout(() => { toast('ATO II CONCLUÍDO', true, 'as dificuldades Tormento foram liberadas · menu (Esc)', '#ffbf3d'); sfx('legend'); }, 2800); });
}

