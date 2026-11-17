/* Fios de Tessária · Loop principal e inicialização */
/* =========================================================
   LOOP
   ========================================================= */
let last = performance.now();
G.fade = 0; G.shake = 0; G.hurt = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now; G.time += dt;
  if (G.fadeDur) { G.fadeT += dt; const k = clamp(G.fadeT / G.fadeDur, 0, 1); G.fade = lerp(G.fadeFrom, G.fadeTo, k); if (k >= 1) { G.fadeDur = 0; const cb = G.fadeCb; G.fadeCb = null; if (cb) cb(); } }
  G.shake = Math.max(0, (G.shake || 0) * Math.exp(-dt * 6) - dt * .02);
  if (G.cine) { G.cine.t += dt; if (G.cine.t > G.cine.dur) G.cine = null; }
  if (hudCache.cine !== !!G.cine) { hudCache.cine = !!G.cine; $('#cine').hidden = !G.cine; } G.hurt = Math.max(0, (G.hurt || 0) - dt * 2.5);
  try {
    if (G.mode === 'play' && P && !G.traveling && !(G.touch && innerHeight > innerWidth * 1.05)) {
      let gdt = dt; if (G.hitStop > 0) { G.hitStop -= dt; gdt = dt * .12; }
      G.save.time += dt;
      updatePlayer(gdt); netTick(dt);
      for (const e of enemies) updateEnemy(e, gdt);
      enemies = enemies.filter(e => { if (e.dead && e.el) e.el.remove(); return !e.dead; });
      if (boss) updateBoss(boss, gdt);
      updateProjectiles(gdt); updateTelegraphs(gdt); updatePickups(gdt);
      if (G.rift && !G.rift.done) G.rift.t += gdt; updateLater(gdt); updateZones(gdt);
      for (const k in G.buffs) G.buffs[k] -= gdt;
      updateStreak(gdt); checkFeats(dt); updateMinimap(dt);
      if (G.pickT > 0) { G.pickT -= dt; if (G.pickT <= 0) G.pickN = 0; }
      if (P.dieT < 0 && P.hp / P.maxHp < .3) { G.beatT = (G.beatT || 0) - dt; if (G.beatT <= 0) { G.beatT = .85; sfx('beat'); G.hurt = Math.max(G.hurt, .5); } }
      if (P.dieT < 0) updateTriggers(gdt);
      updateHud();
    } else if (G.mode === 'dialog') { updateDialog(dt); updateHud(); }
    if (G.mode === 'play' || G.mode === 'dialog' || G.mode === 'title') updateNPCs(dt);
    updateParticles(dt);
    if (RG && (G.mode !== 'create')) updateEmitters(dt, P ? P.x : 44, P ? P.z : 32);
    render(dt); updateMarks(); updateRemoteMarks();
  } catch (err) { console.error(err); if (window.TessNet) window.TessNet.reportError(String(err), err && err.stack ? String(err.stack) : ''); }
}
if (__DEV__ || /[?&]debug=1/.test(location.search)) window.__T = { G, startRift: L => startRift(L), get P() { return P; }, get inter() { return inter; }, spawnThief: rm => spawnThief(rm), get boss() { return boss; }, get enemies() { return enemies; }, travel, loadRegion, get RG() { return RG; }, hurtBoss, startBoss, DIALOG, advanceDialog, spawnEnemy, monsterScale, curDiff, interact, get nearInter() { return nearInter; }, openMenu, makeItem, gamble, upgradeItem, H, readCode, itemCode, stats: () => stats(), ev: src => eval(src) };

/* boot */
setTimeout(() => {
  try {
    document.querySelectorAll('img[data-ic]').forEach(el => el.src = icon(el.dataset.ic));
    toTitle();
    $('#loading').hidden = true;
    requestAnimationFrame(t => { last = t; frame(t); });
  } catch (err) { $('#loading').textContent = 'ERRO: ' + err.message; console.error(err); }
}, 30);
