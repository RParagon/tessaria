/* Fios de Tessária · Projéteis, avisos e coletáveis */
/* =========================================================
   PROJÉTEIS, AVISOS E COLETÁVEIS
   ========================================================= */
function shoot(o) { projs.push(Object.assign({ x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0, life: 2, dmg: 10, team: 'e', mat: 21, size: .3, r: .35, pierce: 0, hit: null, homing: 0, grav: 0, trail: .5 }, o)); }
function updateProjectiles(dt) {
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i]; p.life -= dt;
    if (p.homing && p.team === 'p') {
      let best = null, bd = 7;
      for (const e of enemies) { if (e.dieT >= 0 || e.spawnT > 0 || (p.hit && p.hit.has(e))) continue; const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < bd) { bd = d; best = [e.x, e.z]; } }
      if (boss && !boss.dying) { const h = bossHits(boss)[0]; const d = Math.hypot(h[0] - p.x, h[1] - p.z); if (d < bd + 3) best = [h[0], h[1]]; }
      if (best) { const sp = Math.hypot(p.vx, p.vz), dx = best[0] - p.x, dz = best[1] - p.z, l = Math.hypot(dx, dz) || 1, k = 1 - Math.exp(-p.homing * dt); p.vx = lerp(p.vx, dx / l * sp, k); p.vz = lerp(p.vz, dz / l * sp, k); const n = Math.hypot(p.vx, p.vz) || 1; p.vx *= sp / n; p.vz *= sp / n; }
    }
    p.vy -= p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (Math.random() < p.trail) spawn({ x: p.x + rr(-.05, .05), y: p.y + rr(-.05, .05), z: p.z + rr(-.05, .05), life: rr(.15, .3), s0: p.size * .7, s1: .02, b0: .8, b1: .1, mat: p.mat });
    let dead = p.life <= 0;
    if (!dead && p.team !== 'v') {
      const tx = Math.floor(p.x / T), tz = Math.floor(p.z / T);
      if (RG.grid[tz] && RG.grid[tz][tx] === '#' && !RG.block.has(tx + ',' + tz)) { dead = true; burst(p.x, p.y, p.z, 6, p.mat, 2, .25, .1); }
    }
    if (!dead && p.team === 'p') {
      for (const e of enemies) {
        if (e.dieT >= 0 || e.spawnT > 0 || (p.hit && p.hit.has(e))) continue;
        if (p.nv && ((e.nvH || {})[p.nv] || 0) >= 4) continue;
        if (Math.hypot(e.x - p.x, e.z - p.z) < e.def.r * e.scale + p.r) {
          if (p.nv) { e.nvH = e.nvH || {}; e.nvH[p.nv] = (e.nvH[p.nv] || 0) + 1; }
          const c = Math.random() < stats().crit; hurtEnemy(e, p.dmg * (c ? stats().critMul : 1), p.vx, p.vz, c, .6); projHit(p, e);
          (p.hit || (p.hit = new Set())).add(e);
          if (p.pierce-- <= 0) { dead = true; break; }
        }
      }
      if (!dead && boss && !boss.dying && !(p.nv && ((boss.nvH || {})[p.nv] || 0) >= 4)) for (const h of bossHits(boss)) if (Math.hypot(h[0] - p.x, h[1] - p.z) < h[2] + p.r) { if (p.nv) { boss.nvH = boss.nvH || {}; boss.nvH[p.nv] = (boss.nvH[p.nv] || 0) + 1; } const c = Math.random() < stats().crit; hurtBoss(boss, p.dmg * (c ? stats().critMul : 1), c, h); dead = true; break; }
    } else if (!dead && p.team === 'e') {
      if (Math.hypot(P.x - p.x, P.z - p.z) < .45 + p.r && Math.abs(p.y - 1) < 1.3) { hurtPlayer(p.dmg, p.x - p.vx, p.z - p.vz); if (p.web) P.slowT = 2.2; dead = true; burst(p.x, p.y, p.z, 8, p.mat, 2, .3, .12); }
    }
    if (dead) { if (p.comet && !p.exploded) explodeComet(p); if (p.web) G.zones.push({ x: p.x, z: p.z, r: 1.5, t: 0, dur: 4, team: 'e', mat: 143 }); projs.splice(i, 1); }
  }
}
function updateTelegraphs(dt) { for (let i = tels.length - 1; i >= 0; i--) { const t = tels[i]; t.t += dt; if (t.follow) t.follow(t); if (t.t >= t.dur) { tels.splice(i, 1); if (t.fn) t.fn(); } } }
function inCone(px, pz, ox, oz, ang, ha, len) { const dx = px - ox, dz = pz - oz, d = Math.hypot(dx, dz); return d < len && (d < .6 || Math.abs(angDiff(ang, Math.atan2(dx, dz))) < ha); }
function drawTelegraphs() {
  for (const t of tels) {
    const k = clamp(t.t / t.dur, 0, 1), mat = t.mat || 21;
    if (t.kind === 'circle') {
      const n = Math.ceil(t.r * 12); for (let i = 0; i < n; i++) { const a = i / n * 6.283; dyn(t.x + Math.cos(a) * t.r, .07, t.z + Math.sin(a) * t.r, .65, mat, .22); }
      const fr = t.r * k, step = .5; for (let x = -fr; x <= fr; x += step) for (let z = -fr; z <= fr; z += step) if (x * x + z * z < fr * fr && ((Math.round(x / step) + Math.round(z / step)) & 1) === 0) dyn(t.x + x, .06, t.z + z, .35, mat, .18);
    } else if (t.kind === 'cone') {
      const n = Math.ceil(t.len * 4); for (let i = 0; i <= n; i++) { const r = i / n * t.len; for (const s of [-1, 1]) dyn(t.x + Math.sin(t.ang + s * t.ha) * r, .07, t.z + Math.cos(t.ang + s * t.ha) * r, .65, mat, .2); }
      const na = Math.ceil(t.ha * t.len * 4); for (let i = 0; i <= na; i++) { const a = t.ang - t.ha + i / na * 2 * t.ha; dyn(t.x + Math.sin(a) * t.len, .07, t.z + Math.cos(a) * t.len, .65, mat, .2); }
      const fl = t.len * k; for (let r = .6; r < fl; r += .55) { const na2 = Math.ceil(t.ha * r * 2); for (let i = 0; i <= na2; i++) { const a = t.ang - t.ha + (i + .5 * ((r * 2 | 0) & 1)) / (na2 + 1) * 2 * t.ha; dyn(t.x + Math.sin(a) * r, .06, t.z + Math.cos(a) * r, .35, mat, .18); } }
    } else if (t.kind === 'line') {
      const sx = Math.sin(t.ang), cz = Math.cos(t.ang), px = cz, pz = -sx;
      for (let r = 0; r <= t.len; r += .3) for (const s of [-1, 1]) dyn(t.x + sx * r + px * s * t.w / 2, .07, t.z + cz * r + pz * s * t.w / 2, .65, mat, .2);
      for (let r = 0; r <= t.len * k; r += .5) for (let w = -t.w / 2 + .25; w < t.w / 2; w += .5) dyn(t.x + sx * r + px * w, .06, t.z + cz * r + pz * w, .35, mat, .18);
    }
  }
}
function updatePickups(dt) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i]; p.t += dt;
    const dx = P.x - p.x, dz = P.z - p.z, d = Math.hypot(dx, dz);
    if (p.kind !== 'item' && p.t > .35 && d < 6 && P.dieT < 0) { const s = 15 * (1 - d / 6.5) + 4; p.vx = lerp(p.vx, dx / d * s, .2); p.vz = lerp(p.vz, dz / d * s, .2); p.vy = lerp(p.vy, (1 - p.y) * 6, .2); }
    else { p.vy -= 14 * dt; p.vx *= Math.exp(-dt * 3); p.vz *= Math.exp(-dt * 3); }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.y < .25) { p.y = .25; p.vy = Math.abs(p.vy) * .4; }
    if (p.kind === 'item') { if (Math.random() < .25 + .15 * p.item.rar) spawn({ x: p.x + rr(-.12, .12), y: .3, z: p.z + rr(-.12, .12), vy: rr(1.2, 2.4) + p.item.rar * .4, life: rr(.5, .9), s0: .1, s1: .03, b0: 1, b1: .2, mat: RAR[p.item.rar].row }); if (p.t > .5 && d < 1.15 && P.dieT < 0 && takeItem(p.item)) pickups.splice(i, 1); continue; }
    if (p.t > .35 && d < .7 && P.dieT < 0) {
      if (p.kind === 'gold') { addGold(p.v); sfx('pick'); }
      else if (p.kind === 'orb') { riftProgress(5); G.pickN = (G.pickN || 0) + 1; G.pickT = .6; sfx('pick'); }
      else { const h = Math.round(P.maxHp * .15); P.hp = Math.min(P.maxHp, P.hp + h); popNum(P.x, 2.2, P.z, '+' + h, 'heal'); sfx('heal'); }
      pickups.splice(i, 1);
    }
    if (p.t > 40) pickups.splice(i, 1);
  }
}
function lifeSteal(d) { const ls = stats().ls; if (ls > 0 && P && P.dieT < 0) P.hp = Math.min(P.maxHp, P.hp + d * ls); }
function hitStop(v) { if (G.time - (G.hsLast || -9) < .22) return; G.hsLast = G.time; G.hitStop = Math.max(G.hitStop || 0, v); }
function addGold(v) { G.pickN = (G.pickN || 0) + 1; G.pickT = .6; G.goldFrac = (G.goldFrac || 0) + v * stats().gold; const n = Math.floor(G.goldFrac); G.goldFrac -= n; G.save.gold += n; }
const regionTier = () => { const TM = { hub: 1, forest: 1, crypt: 2, peaks: 3, swamp: 4, glass: 5 }, k = G.rift ? G.rift.base : RG ? RG.key : 'hub', base = (RG && RG.wild && P ? 1 + wZone(P.x / T, P.z / T) * 1.2 : (TM[k] || 1)) + (G.rift ? G.rift.L * .5 : 0), lv = G.save ? G.save.lvl : 1; return base + curDiff().tier + Math.max(0, lv - (REGBASE[k] || 1) - 2) * .05; };
function dropItem(x, z, rar, slot) { const it = makeItem(slot || pick(['weapon', 'armor', 'charm']), regionTier(), rar); if (rar === 4) { sfx('legend'); toast('ITEM LENDÁRIO!', true, 'um brilho dourado no chão'); hitStop(.08); } else if (rar === 3) sfx('epic'); pickups.push({ kind: 'item', item: it, x, y: .8, z, vx: rr(-1.5, 1.5), vy: 4.5, vz: rr(-1.5, 1.5), t: 0 }); }
function takeItem(it) {
  const s = G.save; if (it.rar === 4) { s.st = s.st || {}; s.st.legs = (s.st.legs || 0) + 1; }
  if (!s.eq[it.slot]) { s.eq[it.slot] = it; afterEquip(); toast(it.name, false, 'EQUIPADO · ' + RAR[it.rar].n.toUpperCase(), RAR[it.rar].c); return true; }
  if (s.inv.length >= 20) { if (!G.bagWarn || G.time - G.bagWarn > 3) { toast('Bolsa cheia. Desmonte ou venda itens.'); G.bagWarn = G.time; } return false; }
  s.inv.push(it); sfx('open'); writeSave();
  toast(it.name, false, 'NOVO ITEM · ' + RAR[it.rar].n.toUpperCase() + (itemScore(it) > itemScore(s.eq[it.slot]) ? ' · MELHOR QUE O SEU' : ''), RAR[it.rar].c);
  return true;
}
function afterEquip() { rebuildPlayerModel(); const st = stats(); if (P) { const ratio = P.hp / P.maxHp; P.maxHp = st.maxHp; P.hp = Math.min(P.maxHp, Math.max(1, Math.round(ratio * P.maxHp))); } if (RG) uploadPalette(RG.key); writeSave(); sfx('open'); }
function gainXp(n) {
  if (bless('descanso')) n = Math.round(n * 1.15);
  const s = G.save; s.xp += n;
  while (s.xp >= xpNeed(s.lvl)) {
    s.xp -= xpNeed(s.lvl); s.lvl++;
    const st = stats(); P.maxHp = st.maxHp; P.hp = Math.min(P.maxHp, P.hp + Math.round(P.maxHp * .3));
    toast('NÍVEL ' + s.lvl + '!', true, 'mais vida e mais dano'); sfx('lvl');
    { const nd = DIFFS.findIndex(d => d.lvl === s.lvl && d.lvl > 1 && diffOk(d)); if (nd > 0) setTimeout(() => toast('DIFICULDADE ' + DIFFS[nd].n.toUpperCase() + ' LIBERADA', true, 'mude no menu (Esc) quando estiver na vila', DIFFS[nd].c), 2600); }
    if (P) { for (const e of enemies) { if (e.dieT >= 0 || e.spawnT > 0) continue; const dx = e.x - P.x, dz = e.z - P.z, dd = Math.hypot(dx, dz) || 1; if (dd < 5.5) { e.kx += dx / dd * 13; e.kz += dz / dd * 13; e.hitT = .18; } } for (let i = 0; i < 64; i++) { const a = i / 64 * 6.283; spawn({ x: P.x, y: .2, z: P.z, vx: Math.cos(a) * 10, vz: Math.sin(a) * 10, life: .45, s0: .22, s1: .04, b0: 1, b1: .2, mat: 30, drag: 3 }); } G.shake = Math.max(G.shake, .22); }
    if ([3, 6, 9].includes(s.lvl)) setTimeout(() => toast('NOVA RUNA DESBLOQUEADA', true, 'escolha no grimório (G)'), 1300);
    if ([5, 10, 15].includes(s.lvl)) setTimeout(() => toast('NOVO ESPAÇO DE TALENTO', true, 'escolha no grimório (G)'), 1500);
    if (s.lvl > 15) setTimeout(() => toast('+1 PONTO DE TEAR', false, 'GRIMÓRIO (G)'), 1500);
    for (let i = 0; i < 50; i++) { const a = rr(0, 6.28); spawn({ x: P.x + Math.cos(a) * .8, y: rr(0, .5), z: P.z + Math.sin(a) * .8, vy: rr(2, 4), life: rr(.6, 1), s0: .1, s1: .02, b0: 1, b1: .2, mat: 30 }); }
  }
}

