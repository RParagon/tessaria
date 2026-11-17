/* Fios de Tessária · Interação, gatilhos e viagem */
/* =========================================================
   INTERAÇÃO, GATILHOS, VIAGEM
   ========================================================= */
let nearInter = null;
function spawnCritters() {
  const pn = HUB.pen, m = getModel('chicken');
  for (let i = 0; i < 5; i++) critters.push({ model: m, anim: newAnim(m), x: rr((pn.x0 + 1) * T + .4, pn.x1 * T - .4), z: rr((pn.y0 + 1) * T + .4, pn.y1 * T - .4), yaw: rr(0, 6.28), tg: null, wait: rr(0, 2), peck: 0, ph: 0, moving: 0 });
}
function updateNPCs(dt) {
  if (!RG || RG.key !== 'hub') return;
  for (const n of npcs) {
    if (!n.visible || !n.wander) continue;
    const talking = n.talkT > 0 || (G.mode === 'dialog' && DLG.cur && DLG.cur.who === n.name);
    if (talking) { n.moveAmt = lerp(n.moveAmt || 0, 0, .2); continue; }
    n.wait = (n.wait ?? rr(0, 2)) - dt;
    if (!n.tg && n.wait <= 0) { n.tg = pick(n.wander); n.tgT = 0; }
    if (n.tg) {
      n.tgT += dt; const dx = n.tg[0] - n.x, dz = n.tg[1] - n.z, d = Math.hypot(dx, dz);
      if (d < .35 || n.tgT > 9) { n.tg = null; n.wait = rr(1.5, 5); }
      else { const sp = n.spd || 1.5; n.x += dx / d * sp * dt; n.z += dz / d * sp * dt; collide(n, .3); n.wyaw = Math.atan2(dx, dz); n.moveAmt = lerp(n.moveAmt || 0, 1, .15); n.walkPh = (n.walkPh || 0) + dt * sp * 2.6; }
    } else n.moveAmt = lerp(n.moveAmt || 0, 0, .15);
  }
  const pn = HUB.pen, x0 = (pn.x0 + 1) * T + .3, x1 = pn.x1 * T - .3, z0 = (pn.y0 + 1) * T + .3, z1 = pn.y1 * T - .3;
  for (const c of critters) {
    c.peck = Math.max(0, c.peck - dt); c.wait -= dt;
    const flee = P && Math.hypot(P.x - c.x, P.z - c.z) < 2.2;
    if (flee) c.tg = [clamp(c.x + (c.x - P.x) * 2, x0, x1), clamp(c.z + (c.z - P.z) * 2, z0, z1)];
    if (!c.tg && c.wait <= 0) { if (Math.random() < .5) { c.peck = .6; c.wait = rr(.8, 2); } else c.tg = [rr(x0, x1), rr(z0, z1)]; }
    if (c.tg) { const dx = c.tg[0] - c.x, dz = c.tg[1] - c.z, d = Math.hypot(dx, dz); if (d < .15) { c.tg = null; c.wait = rr(.4, 2); c.moving = 0; } else { const sp = flee ? 3.2 : 1.1; c.x += dx / d * sp * dt; c.z += dz / d * sp * dt; c.yaw = Math.atan2(dx, dz); c.moving = 1; c.ph += dt * sp; } } else c.moving = 0;
  }
}
function project(x, y, z) {
  if (!VP) return null;
  const cx = VP[0] * x + VP[4] * y + VP[8] * z + VP[12], cy = VP[1] * x + VP[5] * y + VP[9] * z + VP[13], cw = VP[3] * x + VP[7] * y + VP[11] * z + VP[15];
  if (cw <= 0) return null;
  return [(cx / cw * .5 + .5) * canvas.clientWidth, (1 - (cy / cw * .5 + .5)) * canvas.clientHeight];
}
let boardEl = null;
function updateMarksExtra(show) {
  const box = $('#marks');
  if (!boardEl || !boardEl.isConnected) { boardEl = document.createElement('div'); boardEl.className = 'tag'; box.appendChild(boardEl); }
  const ready = show && RG.key === 'hub' && (G.save.contracts || []).some(c => c.p >= c.n);
  const sc = ready ? project(36, 2.3, 12.9) : null;
  if (sc) { boardEl.hidden = false; boardEl.style.left = sc[0] + 'px'; boardEl.style.top = sc[1] + 'px'; if (!boardEl._h) { boardEl.innerHTML = '<b class="mk req">!</b><span>Contratos</span>'; boardEl._h = 1; } } else boardEl.hidden = true;
  for (const e of enemies) {
    if (!e.elite) continue;
    if (!e.el) { e.el = document.createElement('div'); e.el.className = 'tag elite' + (e.thief ? ' thief' : ''); e.el.innerHTML = '<span></span><div class="ehp"><i></i></div>'; e.el.firstChild.textContent = e.elite.name; box.appendChild(e.el); }
    const vis = (G.mode === 'play' || G.mode === 'dialog') && e.dieT < 0 && e.spawnT <= 0 && P && Math.hypot(e.x - P.x, e.z - P.z) < 16;
    const p2 = vis ? project(e.x, 1.9 * e.scale + (e.type === 'bat' ? 1 : 0) + .3, e.z) : null;
    if (!p2) { e.el.hidden = true; continue; }
    e.el.hidden = false; e.el.style.left = p2[0] + 'px'; e.el.style.top = p2[1] + 'px'; e.el.lastChild.firstChild.style.width = clamp(e.hp / e.maxHp, 0, 1) * 100 + '%';
  }
}
function updateMarks() {
  const show = (G.mode === 'play' || G.mode === 'dialog') && RG && RG.key === 'hub' && P && G.save, rq = show ? requiredTalk() : null, box = $('#marks');
  if (G.save && RG) updateMarksExtra(show);
  for (const n of npcs) {
    if (!n.el) { n.el = document.createElement('div'); n.el.className = 'tag'; box.appendChild(n.el); }
    if (!show || !n.visible) { n.el.hidden = true; continue; }
    const req = rq === n.id, neu = !G.save.met['t_' + n.id], d = Math.hypot(n.x - P.x, n.z - P.z);
    if (!req && !neu && d > 7) { n.el.hidden = true; continue; }
    const sc = project(n.x, 2.25 * (n.scale || 1) + .15, n.z);
    if (!sc) { n.el.hidden = true; continue; }
    n.el.hidden = false; n.el.style.left = sc[0] + 'px'; n.el.style.top = sc[1] + 'px';
    const html = (req ? '<b class="mk req">!</b>' : neu ? '<b class="mk">?</b>' : '') + (d < 7 ? `<span>${n.name}</span>` : '');
    if (n.el._h !== html) { n.el.innerHTML = html; n.el._h = html; }
  }
}
function updateWilds() {
  if (!RG || !RG.wild || !P) return;
  const z = wZone(P.x / T, P.z / T);
  if (G.wzone === undefined || G.wzone === null) G.wzone = z;
  else if (z !== G.wzone) { G.wzone = z; const W2 = WZ[z], hot = W2.lv > G.save.lvl + 3; toast(W2.n.toUpperCase(), true, `monstros nível ${W2.lv}` + (hot ? ' · PERIGOSO PARA VOCÊ' : ''), hot ? '#ff6a5a' : W2.c); updateDiffHud(); G.save.wz = Math.max(G.save.wz || 0, z); }
  G.wT = (G.wT || 0) - 1 / 60; if (G.wT > 0) return; G.wT = 1;
  for (const rm of RG.rooms) {
    if (!rm.en || !rm.spawned) continue;
    const live = enemies.some(e => e.room === rm && e.dieT < 0), far = Math.hypot(rm.wx - P.x, rm.wz - P.z) > 30;
    if (live) { rm.clearT = null; continue; }
    if (rm.clearT == null) rm.clearT = G.time;
    if (far && G.time - rm.clearT > (rm.alpha ? 150 : 70)) { rm.spawned = false; rm.clearT = null; }
  }
}
function updateTriggers(dt) {
  updateWilds();
  if (inter.some(i => i.taken)) inter = inter.filter(i => !i.taken);
  nearInter = null; let bd = 99;
  for (const it of inter) {
    if (it.kind === 'portal' && it.to !== 'hub') { const [lit, lock] = portalState(it.to); it.lit = lit; it.lock = lock; }
    const d = Math.hypot(it.x - P.x, it.z - P.z);
    if (it.kind === 'frag' && d < 1.3 && !it.taken) { collectFrag(it); continue; }
    if (it.kind === 'frag') continue;
    if (it.kind === 'qitem') { if (d < 1.25 && !it.taken) collectQ(it); continue; }
    if (it.kind === 'pylon') { if (!it.used && d < 1.5) usePylon(it); continue; }
    if (it.kind === 'dragon' && d < 2.8 && d > .01) { moveSafe(P, (it.x - P.x) / d * (d - 2.8), (it.z - P.z) / d * (d - 2.8), .4); }
    if (d < (it.r || 1.8) && d < bd && !(it.kind === 'chest' && it.open)) { bd = d; nearInter = it; }
  }
  for (const n of npcs) { if (!n.visible) continue; const d = Math.hypot(n.x - P.x, n.z - P.z); if (d < 2.2 && d < bd) { bd = d; nearInter = { kind: 'npc', npc: n }; } }
  if (RG.key === 'hub') { const [fx, fz] = HUB.fountain, d = Math.hypot(fx - P.x, fz - P.z); if (d < 3.4 && d < bd) { bd = d; nearInter = { kind: 'shrine', x: fx, z: fz, hub: true }; } }
  const pr = $('#prompt'), tu = $('#tUse');
  if (nearInter && P.dieT < 0) {
    const HL = { house: H().owned ? 'Entrar em casa' : 'Casa à venda · ' + HOUSE_COST + ' Centelhas', stash: 'Abrir o baú', catalog: 'Catálogo da casa (mobília e baú)', mail: 'Correio do Tear', bed: 'Dormir (+15% de XP)' };
    const label = HL[nearInter.kind] || (nearInter.kind === 'appletree' ? 'Deixar a maçã na macieira' : nearInter.kind === 'altar' ? 'Desafiar ' + BOSSDEF[REG[RG.key].boss].name.split(',')[0] + ' de novo · ' + curDiff().n : nearInter.kind === 'npc' ? 'Falar com ' + nearInter.npc.name : nearInter.kind === 'shrine' ? 'Descansar e salvar' : nearInter.kind === 'chest' ? 'Abrir baú' : nearInter.kind === 'portal' ? (nearInter.to === 'hub' ? 'Voltar à Vila Brasa' : 'Entrar: ' + REG[nearInter.to].name) : nearInter.kind === 'dragon' ? 'Falar com Varkhaz' : nearInter.kind === 'board' ? 'Ver contratos' : nearInter.kind === 'riftportal' ? 'Entrar na Fenda do Tear' : 'Usar');
    pr.innerHTML = (G.touch ? '' : '<kbd>E</kbd>') + label; pr.hidden = false; tu.hidden = !G.touch;
    if (G.touch) { const k = nearInter.kind, vb = k === 'house' ? (H().owned ? 'ENTRAR' : 'VER') : k === 'stash' || k === 'mail' ? 'ABRIR' : k === 'catalog' ? 'VER' : k === 'bed' ? 'DORMIR' : k === 'npc' || k === 'dragon' ? 'FALAR' : k === 'chest' ? 'ABRIR' : k === 'shrine' ? 'DESCANSAR' : k === 'portal' || k === 'riftportal' ? 'ENTRAR' : k === 'altar' ? 'DESAFIAR' : k === 'appletree' ? 'DEIXAR' : 'USAR', sp = tu.firstElementChild; if (sp && sp.textContent !== vb) sp.textContent = vb; }
  } else { pr.hidden = true; tu.hidden = true; }
  for (const rm of RG.rooms) {
    if (rm.en && !rm.spawned && Math.hypot(rm.wx - P.x, rm.wz - P.z) < ((rm.r || Math.max(rm.w, rm.h)) + 3) * T) {
      rm.spawned = true; let k = 0;
      const grp = []; for (const [type, n] of Object.entries(rm.en)) for (let i = 0; i < n; i++) { const [x, z] = freeSpot(rm.wx, rm.wz, (rm.r || Math.min(rm.w, rm.h)) * T * .7); grp.push(spawnEnemy(type, x, z, k++ * .12)); }
      grp.forEach(e => e.room = rm);
      if (rm.alpha && grp.length) { const e = grp[0]; makeElite(e); e.alpha = true; e.elite.name = ENAME[e.type] + ' Alfa'; e.hp = e.maxHp = Math.round(e.maxHp * 1.5); }
      else if (grp.length && Math.random() < (RG.wild ? .1 : G.rift ? .65 : .35) + .05 * (G.save.diff || 0)) makeElite(pick(grp));
      if (grp.length >= 5 && (G.save.diff || 0) >= 3 && Math.random() < .35) makeElite(pick(grp.filter(e => !e.elite)));
      if (!RG.thiefDone && rm.kind !== 'boss' && Math.random() < .14) { RG.thiefDone = true; spawnThief(rm); }
    }
    if (rm.kind === 'boss' && !boss && (G.rift ? G.rift.bossUp && !G.rift.done : !G.save.bosses[RG.key]) && Math.hypot(rm.wx - P.x, rm.wz - P.z) < (rm.r - 1.5) * T) startBoss(rm);
  }
}
function interact() {
  if (!nearInter || P.dieT >= 0) return;
  const it = nearInter;
  if (it.kind === 'npc') { const n = it.npc; n.talkT = 4; G.save.met['t_' + n.id] = true; const lines = questLines(n.id) || DIALOG[n.id](); say(lines, () => updateObjective()); }
  else if (it.kind === 'shrine') {
    P.hp = P.maxHp; G.save.potions = stats().maxPot; G.save.cp = { region: RG.key, x: P.x, z: P.z }; writeSave();
    sfx('heal'); toast('Você descansou. Progresso salvo.');
    for (let i = 0; i < 40; i++) { const a = rr(0, 6.28); spawn({ x: it.x + Math.cos(a) * .7, y: rr(.5, 2), z: it.z + Math.sin(a) * .7, vy: rr(1, 2.5), life: rr(.6, 1.2), s0: .1, s1: .02, b0: 1, b1: .2, mat: 31 }); }
  } else if (it.kind === 'chest') {
    it.open = true; it.openT = 0; G.save.chests.push(it.id); sfx('open');
    const g = Math.round(({ forest: 45, crypt: 70, peaks: 100, swamp: 140, glass: 180 }[RG.key] || 40) * curDiff().gold); dropGold(it.x, it.z, Math.round(g / 3));
    G.save.gold += g - Math.round(g / 3); dropItem(it.x, it.z + 1.3, rollRar(1));
    if (G.save.potions < stats().maxPot) { G.save.potions++; toast(`+${g} Centelhas e uma poção`); } else toast(`+${g} Centelhas`);
    writeSave();
  } else if (it.kind === 'dragon') { say(DIALOG.dragonEnd(true), () => updateObjective());
  } else if (it.kind === 'house') { if (H().owned) travel('home'); else openMenu('home');
  } else if (it.kind === 'catalog') { openMenu('home');
  } else if (it.kind === 'stash') { openMenu('stash');
  } else if (it.kind === 'mail') { openMenu('mail');
  } else if (it.kind === 'bed') {
    fadeTo(1, .35, () => { P.hp = P.maxHp; G.save.potions = stats().maxPot; G.buffs.descanso = 600; writeSave(); fadeTo(0, .9); toast('BEM DESCANSADO', true, '+15% de XP por 10 minutos · vida e poções cheias', '#ffd27a'); sfx('heal'); });
  } else if (it.kind === 'appletree') {
    const s = G.save; it.taken = true;
    say([{ who: '', text: 'Você deixa a maçã do Vovô Brann ao pé da macieira e se afasta um pouco.' }, { who: '', text: s.ended === 'B' ? 'O Sol pisca. Duas vezes. Quando você olha de novo, a maçã sumiu, e no lugar dela há uma escama dourada, ainda morna.' : 'Um vento quente sopra do norte, com cheiro de brasa. Quando você olha de novo, a maçã sumiu, e no lugar dela há uma escama dourada.' }], () => { s.q.brann.p = 1; s.q.brann.how = 'tree'; writeSave(); toast('MAÇÃ ENTREGUE', false, 'FALE COM O VOVÔ BRANN', '#ff8a6a'); });
  } else if (it.kind === 'altar') { if (boss) return; const rm = RG.rooms.find(r => r.kind === 'boss'); if (!rm) return; G.rematch = true; startBoss(rm); for (let i = 0; i < 50; i++) { const a = rr(0, 6.28); spawn({ x: it.x, y: 1, z: it.z, vx: Math.cos(a) * 4, vy: rr(0, 3), vz: Math.sin(a) * 4, life: .7, s0: .14, s1: .03, b0: 1, b1: .2, mat: 30, drag: 2 }); }
  } else if (it.kind === 'board') { openMenu('board');
  } else if (it.kind === 'riftportal') { if (!it.lit) { toast('A Fenda abre depois de recuperar o Fio Verde.'); return; } openMenu('riftm');
  } else if (it.kind === 'portal') {
    if (it.to !== 'hub') { const [lit, lock] = portalState(it.to); it.lit = lit; it.lock = lock; }
    if (!it.lit) { toast(it.lock || 'O portal está apagado.'); return; }
    travel(it.to);
  }
}
function collectFrag(it) {
  it.taken = true; G.save.frags.push(it.idx); writeSave(); sfx('frag');
  for (let i = 0; i < 60; i++) { const a = rr(0, 6.28); spawn({ x: it.x, y: 1.2, z: it.z, vx: Math.cos(a) * 3, vy: rr(-1, 3), vz: Math.sin(a) * 3, life: rr(.6, 1.2), s0: .12, s1: .02, b0: 1, b1: .2, mat: 30, drag: 2 }); }
  const f = FRAG[it.idx];
  say([{ who: `Memória ${G.save.frags.length} de 9 · ${f.t}`, text: f.x }], () => { updateObjective(); if (G.save.frags.length === 9) toast('Você lembra de tudo.', true, 'um outro final ficou possível'); });
}
function requiredTalk() { const s = G.save; if (!s) return null; if (!s.met.ysolde) return 'ysolde'; if (s.bosses.forest && !s.met.ysolde2) return 'ysolde'; if (s.bosses.crypt && !s.met.desf2) return 'desf'; if (s.ended && !s.met.act2y) return 'ysolde'; if (s.bosses.swamp && !s.met.act2y2) return 'ysolde'; return null; }
function portalState(to) {
  const b = G.save.bosses;
  if (to === 'forest') return G.save.met.ysolde ? [true] : [false, 'Fale com a Anciã Ysolde primeiro.'];
  if (to === 'crypt') return !b.forest ? [false, 'Apagado. Recupere o Fio Verde no bosque.'] : G.save.met.ysolde2 ? [true] : [false, 'Apagado. Leve o Fio Verde até a Anciã Ysolde.'];
  if (to === 'wilds') return G.save.met.ysolde ? [true] : [false, 'Fale com a Anciã Ysolde primeiro.'];
  if (to === 'swamp') return !G.save.ended ? [false, 'Apagado. O Sol ainda não voltou.'] : G.save.met.act2y ? [true] : [false, 'Apagado. A Anciã Ysolde quer falar com você.'];
  if (to === 'glass') return !b.swamp ? [false, 'Apagado. Recupere o Fio de Água no Pântano Afogado.'] : G.save.met.act2y2 ? [true] : [false, 'Apagado. Leve o Fio de Água até a Anciã Ysolde.'];
  if (to === 'peaks') return !b.crypt ? [false, 'Apagado. Recupere o Fio de Osso no Ossuário.'] : G.save.met.desf2 ? [true] : [false, 'Apagado. O encapuzado no lado leste da vila quer falar com você.'];
  return [true];
}
function fadeTo(target, dur, cb) { G.fadeFrom = G.fade; G.fadeTo = target; G.fadeDur = dur; G.fadeT = 0; G.fadeCb = cb || null; }
function travel(to) {
  if (G.traveling) return; G.traveling = true; input.atk = false;
  fadeTo(1, .45, () => { $('#loading').hidden = false; setTimeout(() => { loadRegion(to); $('#loading').hidden = true; G.traveling = false; fadeTo(0, .6); }, 30); });
}
function loadRegion(key, atCp) {
  if (boss) endBossFight(false);
  G.rematch = false; G.wzone = null;
  if (key !== 'rift') G.rift = null;
  RG = genRegion(key); RG.gateSet = new Set(RG.gates.map(g => g[0] + ',' + g[1]));
  if (key === 'rift' || key === 'home') { if (WORLDS[key]) WORLDS[key].chunks.forEach(freeVAO); WORLDS[key] = buildWorld(key, RG); }
  else if (!WORLDS[key]) WORLDS[key] = buildWorld(key, RG);
  WD = WORLDS[key];
  uploadPalette(key === 'rift' ? G.rift.base : key);
  enemies = []; projs = []; tels = []; pickups = []; inter = []; npcs = []; critters = []; parts.length = 0; emitAcc = {}; $('#marks').innerHTML = ''; G.zones = []; G.later = []; G.ultUsed = false;
  G.save.region = key === 'rift' ? 'hub' : key; $('#toast').innerHTML = '';
  const spec = REG[key];
  if (key === 'hub') {
    inter.push({ kind: 'board', x: 36, z: 12.9, r: 2.1 });
    inter.push({ kind: 'house', x: 68.4, z: 47.1, r: 2.1 });
    { const qb = G.save.q && G.save.q.brann; if (qb && qb.st === 'active' && !qb.p && G.save.ended) inter.push({ kind: 'appletree', x: 25, z: 51.4, r: 2.4 }); }
    inter.push({ kind: 'riftportal', x: 74, z: 22, r: 2.4, lit: !!G.save.bosses.forest, model: getModel('portal'), anim: newAnim(getModel('portal')), yaw: -1.57 });
    ensureContracts();
    for (const p of HUB.portals) { const [lit, lock] = portalState(p.to); inter.push({ kind: 'portal', to: p.to, x: p.x, z: p.z, r: 2.2, lit, lock, model: getModel('portal'), anim: newAnim(getModel('portal')), yaw: p.yaw || 0 }); }
    for (const n of NPCS) { const m = makeModel('npc-' + n.id, () => buildHumanoid(n.cfg, 32 + NPCS.indexOf(n) * 8)); npcs.push({ ...n, model: m, anim: newAnim(m), yaw: n.baseYaw || 0, talkT: 0, visible: n.id !== 'desf' || (G.save.bosses.forest && (!G.save.ended || G.save.ended === 'B')) }); }
    spawnCritters();
    if (G.save.q && G.save.q.nina && G.save.q.nina.st === 'active') placeNina();
  } else if (key === 'home') {
    setupHome();
  } else {
    const st = RG.start;
    inter.push({ kind: 'portal', to: 'hub', x: st.wx, z: st.wz - 3.2, r: 2.2, lit: true, model: getModel('portal'), anim: newAnim(getModel('portal')), yaw: 0 });
    RG.rooms.forEach((rm, i) => {
      if (rm.kind === 'shrine') inter.push({ kind: 'shrine', x: rm.wx, z: rm.wz, r: 2, model: getModel('shrine'), anim: newAnim(getModel('shrine')), yaw: 0 });
      if (rm.chest) { const id = key + '-c' + i, open = G.save.chests.includes(id); inter.push({ kind: 'chest', id, x: rm.wx + (rm.frag !== undefined ? 2 : 0), z: rm.wz - 1, r: 1.8, open, openT: open ? 9 : 0, model: getModel('chest'), anim: newAnim(getModel('chest')), yaw: 0 }); }
      if (rm.frag !== undefined && !G.save.frags.includes(rm.frag)) inter.push({ kind: 'frag', idx: rm.frag, x: rm.wx, z: rm.wz, model: getModel('frag'), anim: newAnim(getModel('frag')), yaw: 0 });
      if (rm.kind === 'boss' && G.save.bosses[key]) { const calm = key === 'peaks' && G.save.dragonCalm && !G.save.ended; inter.push({ kind: 'portal', to: 'hub', x: rm.wx + (calm ? 6 : 0), z: rm.wz + (calm ? 5 : 0), r: 2, lit: true, model: getModel('portal'), anim: newAnim(getModel('portal')), yaw: 0 }); if (calm) inter.push(calmDragonInter(rm)); if (key !== 'peaks' || G.save.ended) inter.push({ kind: 'altar', x: rm.wx - 4.5, z: rm.wz + 3.5, r: 1.9, model: getModel('pedestal'), anim: newAnim(getModel('pedestal')), yaw: 0 }); }
    });
    ({ wilds: ['javali', 'lobo', 'urso', 'gosmo', 'wisp', 'imp', 'bat', 'beetle', 'fantasma'], forest: ['gosmo', 'wisp', 'golem'], crypt: ['skel', 'bat', 'skull'], peaks: ['imp', 'beetle', 'dragon'], swamp: ['sapo', 'afogado', 'hydra'], glass: ['sentinela', 'fantasma', 'reflexo'] })[key === 'rift' ? G.rift.base : key].forEach(k => getModel(DEF[k] ? DEF[k].model : k));
    if (key === 'rift') { getModel(G.rift.boss); if (G.rift.boss === 'spider') getModel('spiderling'); }
    { const fights = RG.rooms.filter(r => r.en && r.kind !== 'boss'), np = RG.wild ? 6 : Math.random() < .5 ? 2 : 1;
      for (let i = 0; i < np && fights.length; i++) { const rm = fights.splice(Math.floor(Math.random() * fights.length), 1)[0], [x, z] = freeSpot(rm.wx, rm.wz, (rm.r || Math.min(rm.w, rm.h)) * T * .6); inter.push({ kind: 'pylon', bt: pick(['furia', 'rapidez', 'fortuna', 'protecao']), x, z, r: 1.6, model: getModel('pylon'), anim: newAnim(getModel('pylon')), yaw: 0 }); } }
    const sq = G.save.q || {};
    for (const [qid, Q] of Object.entries(QUESTS)) {
      const st = sq[qid]; if (!st || st.st !== 'active' || Q.region !== key || st.p >= Q.need) continue;
      const cand = RG.rooms.filter(r => r.en);
      for (let i = 0; i < Q.need - st.p; i++) { const rm = cand[(i * 3 + qid.length) % cand.length]; const [x, z] = freeSpot(rm.wx, rm.wz, (rm.r || Math.min(rm.w, rm.h)) * T * .8); inter.push({ kind: 'qitem', qid, x, z, mat: Q.mat }); }
    }
  }
  let sx, sz;
  const cp = G.save.cp;
  if (atCp && cp && cp.region === key) { sx = cp.x; sz = cp.z; }
  else if (key === 'hub') { [sx, sz] = HUB.spawn; }
  else if (key === 'home') { sx = 16; sz = 17.6; }
  else { sx = RG.start.wx; sz = RG.start.wz + 1.5; G.save.cp = { region: key, x: sx, z: sz }; }
  if (!P) makePlayer(sx, sz); else { P.x = sx; P.z = sz; P.vx = P.vz = P.kx = P.kz = 0; P.dieT = -1; }
  P.maxHp = stats().maxHp; if (key === 'hub') P.hp = P.maxHp;
  cam.x = P.x; cam.z = P.z;
  writeSave(); updateObjective(); setMusic(key === 'rift' ? G.rift.base : key); MM.key = null; setupMinimap();
  setTimeout(() => toast(spec.name.toUpperCase(), true, spec.sub), 500);
  const rq = key === 'hub' && requiredTalk(); if (rq && G.save.met.ysolde) setTimeout(() => toast(NPCS.find(n => n.id === rq).name + ' quer falar com você', false, 'SIGA O ! DOURADO'), 2800);
  if (key === 'hub' && G.save.met.ysolde && !G.save.met.houseTip && G.save.met.wildTip) { G.save.met.houseTip = true; setTimeout(() => toast('CASA À VENDA', true, 'a leste da forja · baú, correio e mobília com bônus'), 4200); }
  if (key === 'hub' && G.save.met.ysolde && !G.save.met.wildTip) { G.save.met.wildTip = true; setTimeout(() => toast('NOVO: OS ERMOS', true, 'o portão ao sul da vila leva às terras selvagens · bichos para upar'), 4200); }
  if (key === 'wilds') setTimeout(() => toast('Quanto mais longe da vila, mais perigoso', false, 'CAMPINA → MATA → COLINAS → ERMO PROFUNDO'), 3200);
  if (key === 'hub' && G.save.met.ysolde && !G.save.met.diffTip) { G.save.met.diffTip = true; setTimeout(() => toast('Quer mais desafio?', false, 'A DIFICULDADE FICA NO MENU (ESC)'), 5600); }
  updateDiffHud();
}
const MM = { key: null, base: null, seen: null, t: 0 };
function hexRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function setupHome() {
  const f = H().f; inter = [];
  inter.push({ kind: 'portal', to: 'hub', x: 16, z: 19.6, r: 1.7, lit: true, model: null, yaw: 0 });
  inter.push({ kind: 'stash', x: 8.6, z: 7.6, r: 2, model: getModel('chest'), anim: newAnim(getModel('chest')), yaw: 0 });
  inter.push({ kind: 'catalog', x: 12.6, z: 8.2, r: 1.6 });
  inter.push({ kind: 'mail', x: 23.6, z: 8.3, r: 1.6 });
  if (f.cama) inter.push({ kind: 'bed', x: 22.4, z: 11.4, r: 1.6 });
  if (f.estatua) { const m = makeModel('statue:' + JSON.stringify(G.char), () => { const r = buildHumanoid({ ...G.char, seed: 5 }, 0); for (let i = 0; i < r.data.length; i += STRIDE) { const m0 = r.data[i + 6]; r.data[i + 6] = (m0 === 6 || m0 === 7 || m0 >= 120) ? 26 : 25; } return r; }); inter.push({ kind: 'statue', x: 9.6, z: 11.6, r: .01, y: .55, scale: 1.3, model: m, anim: newAnim(m), yaw: .6 }); }
}
function homeRebuild() { if (RG && RG.key === 'home') { if (WORLDS.home) WORLDS.home.chunks.forEach(freeVAO); WORLDS.home = buildWorld('home', RG); WD = WORLDS.home; emitAcc = {}; setupHome(); } }
function rebuildHub() { if (!WORLDS.hub) return; WORLDS.hub.chunks.forEach(freeVAO); if (RG && RG.key === 'hub') { WORLDS.hub = buildWorld('hub', RG); WD = WORLDS.hub; emitAcc = {}; } else delete WORLDS.hub; }
function setupMinimap() {
  const cv = $('#mmap'), show = RG && RG.key !== 'hub' && RG.key !== 'home'; cv.hidden = !show; $('#mmapZ').hidden = !show; if (!show) { MM.key = null; return; }
  const W = RG.W, H = RG.H; cv.width = W; cv.height = H; MM.key = RG; MM.seen = new Uint8Array(W * H); MM.base = new Uint8ClampedArray(W * H * 4);
  const pal = curPal || REGPAL.hub, row = (m, i) => { const r = pal.rows[m]; return r ? r[i] : [90, 90, 90]; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = RG.grid[y][x], o = (y * W + x) * 4; let col;
    if (c === '#') col = row(RG.wild ? 13 : 11, 0);
    else if (c === '~') col = RG.key === 'glass' || (G.rift && G.rift.base === 'glass') ? [10, 12, 30] : row(15, 2);
    else if (c === 'V') col = [242, 184, 75];
    else if (c === ',') col = row(9, 2);
    else col = RG.wild ? hexRgb(WZ[wZone(x, y)].c).map(v => v * .55) : row(8, 2);
    MM.base[o] = col[0]; MM.base[o + 1] = col[1]; MM.base[o + 2] = col[2]; MM.base[o + 3] = 255;
  }
}
function updateMinimap(dt) {
  if (!RG || RG.key === 'hub' || RG.key === 'home' || !P) return; if (MM.key !== RG) setupMinimap();
  const W = RG.W, H = RG.H, tx = Math.floor(P.x / T), tz = Math.floor(P.z / T), rad = RG.wild ? 9 : 7;
  for (let y = tz - rad; y <= tz + rad; y++) for (let x = tx - rad; x <= tx + rad; x++) if (x >= 0 && y >= 0 && x < W && y < H && (x - tx) ** 2 + (y - tz) ** 2 <= rad * rad) MM.seen[y * W + x] = 1;
  MM.t -= dt; if (MM.t > 0) return; MM.t = .2;
  const cv = $('#mmap'), cx = cv.getContext('2d'), img = cx.createImageData(W, H), d = img.data;
  for (let i = 0; i < W * H; i++) { const o = i * 4; if (MM.seen[i]) { d[o] = MM.base[o]; d[o + 1] = MM.base[o + 1]; d[o + 2] = MM.base[o + 2]; } else { d[o] = 8; d[o + 1] = 6; d[o + 2] = 14; } d[o + 3] = 255; }
  cx.putImageData(img, 0, 0);
  const dot = (x, z, col, s = 1) => { cx.fillStyle = col; cx.fillRect(Math.floor(x / T) - (s >> 1), Math.floor(z / T) - (s >> 1), s, s); };
  const seenAt = (x, z) => MM.seen[Math.floor(z / T) * W + Math.floor(x / T)];
  for (const it of inter) { if (!seenAt(it.x, it.z)) continue; if (it.kind === 'portal' || it.kind === 'riftportal') dot(it.x, it.z, '#5ff0ff', 2); else if (it.kind === 'shrine') dot(it.x, it.z, '#6fff9a', 2); else if (it.kind === 'chest' && !it.open) dot(it.x, it.z, '#ffd23d', 2); else if (it.kind === 'altar') dot(it.x, it.z, '#d07bff', 2); else if (it.kind === 'pylon' && !it.used) dot(it.x, it.z, '#fff08a', 1); }
  for (const rm of RG.rooms) { if (rm.kind === 'boss' && seenAt(rm.wx, rm.wz)) dot(rm.wx, rm.wz, '#ff3a3a', 3); if (RG.wild && rm.alpha && !rm.spawned && seenAt(rm.wx, rm.wz)) dot(rm.wx, rm.wz, '#d07bff', 2); }
  for (const e of enemies) if (e.dieT < 0 && seenAt(e.x, e.z)) dot(e.x, e.z, e.elite ? '#d07bff' : '#ff5a4a', 1);
  if (boss) dot(boss.x, boss.z, '#ff2020', 3);
  dot(P.x, P.z, '#ffffff', 2);
  const zl = $('#mmapZ'), z = RG.wild ? WZ[wZone(P.x / T, P.z / T)] : null, txt = z ? z.n.toUpperCase() + ' · NV ' + z.lv : (RG.key === 'rift' ? 'FENDA' : REG[RG.key].name.toUpperCase());
  if (zl.textContent !== txt) zl.textContent = txt; zl.style.color = z ? z.c : 'var(--bone)';
  zl.style.top = (cv.offsetTop + cv.offsetHeight + 6) + 'px';
}
function updateObjective() {
  const s = G.save, k = RG ? RG.key : 'hub';
  if (G.rift) { const R = G.rift; $('#hObj').textContent = R.done ? 'Fenda concluída! Pegue as recompensas e volte pelo portal.' : R.bossUp ? 'Derrote o Guardião da Fenda no coração do mapa, ao norte.' : 'Derrote inimigos para encher a barra da Fenda.'; return; }
  let t; const rq = requiredTalk();
  if (rq === 'ysolde' && s.met.ysolde) t = k !== 'hub' ? 'Volte à Vila Brasa e fale com a Anciã Ysolde.' : s.bosses.swamp ? 'Leve o Fio de Água até a Anciã Ysolde, a oeste da fonte.' : s.ended ? 'O Tear treme. A Anciã Ysolde quer falar com você.' : 'Leve o Fio Verde até a Anciã Ysolde, a oeste da fonte.';
  else if (rq === 'desf') t = k === 'hub' ? 'Fale com o encapuzado no lado leste da vila.' : 'Volte à Vila Brasa. Alguém quer falar com você.';
  else if (!s.met.ysolde) t = 'Fale com a Anciã Ysolde, perto da fonte.';
  else if (!s.bosses.forest) t = k === 'forest' ? 'Encontre o Guardião de Musgo no coração do bosque, ao norte.' : 'Entre no portal do Bosque Sussurrante, ao norte.';
  else if (!s.bosses.crypt) t = k === 'crypt' ? 'Desça até a sala do trono do Rei Morgrave, ao norte.' : 'Entre no portal do Ossuário, ao norte.';
  else if (!s.bosses.peaks) t = k === 'peaks' ? 'Suba até o ninho de Varkhaz, ao norte.' : 'Entre no portal dos Picos de Cinza, ao nordeste.';
  else if (s.ended && !s.bosses.swamp) t = k === 'swamp' ? 'Atravesse o pântano até o covil da Hidra do Lodo, ao norte.' : 'Entre no portal do Pântano Afogado, no fim da estrada a oeste.';
  else if (s.ended && !s.bosses.glass) t = k === 'glass' ? 'Suba a Cidadela até a Sala dos Espelhos, ao norte.' : 'Entre no portal da Cidadela de Vidro, no fim da estrada a leste.';
  else if (s.ended) t = `Tessária está costurada. Suba a dificuldade (agora: ${curDiff().n}), desafie os guardiões de novo e domine as Fendas.`;
  else if (s.dragonCalm) t = s.frags.length >= 9 ? 'Você lembra de tudo. Volte ao ninho nos Picos e fale com Varkhaz.' : `Ache as memórias que faltam e volte a Varkhaz. ${missingText()}`;
  else t = 'Fale com Varkhaz no ninho dos Picos de Cinza.';
  $('#hObj').textContent = t; updateDiffHud();
}
function ending(kind) {
  const s = G.save; s.endings.push(kind); s.ended = kind; s.dragonCalm = false; inter = inter.filter(i => i.kind !== 'dragon');
  writeSave(); setMusic('title');
  playStory(epilogue(kind), () => showEndingScreen(kind));
}
function showEndingScreen(kind) {
  const s = G.save, m = Math.floor(s.time / 60), sec = Math.floor(s.time % 60), qd = Object.values(s.q || {}).filter(x => x.st === 'done').length;
  G.mode = 'menu'; G.menu = 'ending'; showOnly('#ending');
  $('#eTitle').textContent = kind === 'A' ? 'FIM · O SOL REACESO' : 'FIM · O SOL QUE LEMBRA';
  $('#eText').textContent = (kind === 'A' ? 'Tessária respira de novo. Varkhaz descansa, e o Sol gira no Tear.' : 'Tessária lembra. Varkhaz brilha no céu como um Sol novo, e o Desfiado foi costurado de volta.')
    + '\n\nObrigado por jogar. Você pode continuar em Tessária: a vila agora vive sob o Sol, e as Fendas do Tear, os contratos e as missões seguem abertos.'
    + (kind === 'A' && s.frags.length < 9 ? '\n\nExiste outro final para quem encontra as 9 memórias antes de decidir o destino do dragão. Ele fica para uma nova jornada.' : '');
  $('#eStats').innerHTML = [['Tempo', `${m}min ${sec}s`], ['Nível', s.lvl], ['Memórias', s.frags.length + '/9'], ['Missões', qd + '/5'], ['Monstros', s.kills], ['Quedas', s.deaths], ['Maior Fenda', s.riftMax || 'nenhuma']].map(([a, b]) => `<div>${a}<b>${b}</b></div>`).join('');
  refreshHudVis();
}
$('#eRewind').onclick = () => { $('#ending').hidden = true; G.mode = 'play'; G.menu = null; refreshHudVis(); travel('hub'); };
$('#eTitleBtn').onclick = () => { $('#ending').hidden = true; writeSave(); toTitle(); };


