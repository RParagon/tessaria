/* Fios de Tessária · Render do quadro */
/* =========================================================
   RENDER
   ========================================================= */
let dpr = 1, pxDev = 4, VP = null;
const EMOTES_PV = ['acenar', 'comemorar', 'dancar', 'sentar'];   // poses do espelho
const IVO_BOB = [126.4, 50.2];   // boia do Pescador Ivo no lago do Bairro Leste
const FISH_MAT = { 'Lambari': 28, 'Tilápia-de-Brasa': 13, 'Carpa Dourada': 14, 'Peixe-Lua': 26 };
/** Vara (curva, verga na mordida), linha com barriga até a boia e o peixe saltando até a mão. */
function drawFishing(t) {
  const F = G.fishing, C = G.fishCatch, bw = [.86, 1, 1.18][G.char.body ?? 1];
  const hand = tp(P.W[11] || P.W[5], [-.38 * bw, .85, .1]), fw = [Math.sin(P.yaw), Math.cos(P.yaw)];
  const bend = F && F.bite ? .5 + Math.sin(t * 24) * .15 : C && !C.miss ? .35 : .12;
  const L = 1.9, pts = [];
  for (let k = 0; k <= 12; k++) { const u = k / 12, fwd = u * L * Math.cos(.75 - bend * u), up = u * L * Math.sin(.75 - bend * u); pts.push([hand[0] + fw[0] * fwd, hand[1] + up, hand[2] + fw[1] * fwd]); }
  pts.forEach((p, k) => { dyn(p[0], p[1], p[2], .6, 12, .085 - k * .004); if (k < 12) dyn((p[0] + pts[k + 1][0]) / 2, (p[1] + pts[k + 1][1]) / 2, (p[2] + pts[k + 1][2]) / 2, .6, 12, .08 - k * .004); });
  const tip = pts[12];
  if (F && F.t > .5) {   // linha com barriga e boia vermelha e branca
    const b = fishBob(t);
    for (let k = 1; k < 14; k++) { const u = k / 14; dyn(lerp(tip[0], b[0], u), lerp(tip[1], b[1], u) - Math.sin(u * Math.PI) * (F.bite ? .1 : .4), lerp(tip[2], b[2], u), .85, 28, .045); }
    dyn(b[0], b[1] + .04, b[2], .9, 16, .15); dyn(b[0], b[1] + .13, b[2], .95, 28, .09);
    if (Math.random() < (F.bite ? .5 : .04)) spawn({ x: b[0] + rr(-.2, .2), y: .05, z: b[2] + rr(-.2, .2), vy: rr(.4, 1.2), life: .4, s0: .07, s1: .02, b0: 1, b1: .3, mat: 15 });
  }
  if (C && !C.miss && C.from) {   // peixe em arco da boia até a mão, depois erguido
    const u = clamp(C.t / .6, 0, 1), h = Math.sin(u * Math.PI) * 1.6, m = FISH_MAT[C.f.n] ?? 28;
    const x = lerp(C.from[0], hand[0], u), z = lerp(C.from[2], hand[2], u), y = lerp(.1, hand[1] + .5, u) + h, wig = Math.sin(t * 30) * .12;
    for (let k = -3; k <= 3; k++) dyn(x + fw[0] * k * .07, y + Math.sin(k * .8 + wig * 10) * .02, z + fw[1] * k * .07, .8, m, .13 - Math.abs(k) * .015);
    dyn(x - fw[0] * .3, y + wig, z - fw[1] * .3, .7, m, .11);   // rabo
    if (u < .3 && Math.random() < .6) spawn({ x: C.from[0] + rr(-.3, .3), y: .1, z: C.from[2] + rr(-.3, .3), vy: rr(1, 2.5), life: .5, s0: .08, s1: .02, b0: 1, b1: .3, mat: 15 });
  }
}
const cam = { x: 0, z: 0, zoom: 1 };
const IDB = (() => { const a = new Float32Array(24 * 16); a.set(mI(), 0); return a; })();
const boneBuf = new Float32Array(24 * 16);
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  // espelho (bolsa e criação): o dobro da resolução, para ver o personagem e os cosméticos de perto
  const pv = G.mode === 'create' || (G.mode === 'menu' && G.menu === 'inv');
  pxDev = Math.max(1, Math.round((pv ? Math.max(1, G.settings.px * .5) : G.settings.px) * dpr));
  resizeFB(Math.ceil(w / pxDev), Math.ceil(h / pxDev));
}
function boneOrder(B) { const o = [], done = new Set(); const vis = i => { if (done.has(i)) return; if (B[i].p >= 0) vis(B[i].p); done.add(i); o.push(i); }; for (let i = 0; i < B.length; i++) vis(i); return o; }
function computeInst(model, A, M) {
  const B = model.bones, W = [], ord = model.ord && model.ord.length === B.length ? model.ord : (model.ord = boneOrder(B));
  for (const i of ord) {
    const b = B[i], a = A[i], p = b.v;
    let L = mMul(mT(p[0] + a.tx, p[1] + a.ty, p[2] + a.tz), mMul(mRY(a.ry), mMul(mRX(a.rx), mRZ(a.rz))));
    if (a.sx !== 1 || a.sy !== 1 || a.sz !== 1) L = mMul(L, mS(a.sx, a.sy, a.sz));
    L = mMul(L, mT(-p[0], -p[1], -p[2]));
    W[i] = b.p < 0 ? mMul(M, L) : mMul(W[b.p], L);
    boneBuf.set(W[i], i * 16);
  }
  return W;
}
let U = PS.u;
function drawModel(model, A, x, y, z, yaw, scale, o = {}) {
  const M = mMul(mT(x, y, z), mMul(mRY(yaw), mS(scale)));
  const W = computeInst(model, A, M);
  gl.uniformMatrix4fv(U.u_bones, false, boneBuf);
  gl.uniform1f(U.u_sizeMul, scale); gl.uniform1f(U.u_dissolve, o.dis || 0); gl.uniform1f(U.u_dmat, o.dmat ?? 21);
  gl.uniform1f(U.u_flash, o.flash || 0); gl.uniform1f(U.u_glow, o.glow || 1); gl.uniform1f(U.u_xray, 0); gl.uniform1f(U.u_soft, o.soft ?? model.soft ?? 0);
  gl.bindVertexArray(model.vao); gl.drawArrays(gl.POINTS, 0, model.count);
  return W;
}
function render(dt) {
  resize();
  const asp = canvas.width / canvas.height, fov = 40 * Math.PI / 180, cssW = canvas.clientWidth;
  const proj = mPersp(fov, asp, .1, 220);
  let eye, tgt, regPal = curPal || REGPAL.hub, xray = 0, player = [0, -99, 0];
  dynN = 0;
  const preview = G.mode === 'create' || (G.mode === 'menu' && G.menu === 'inv');
  if (G.mode === 'title' || (!P && G.mode !== 'create')) {
    const a = G.time * .06; tgt = [44, 1, 32]; eye = [44 + Math.sin(a) * 32, 21, 32 + Math.cos(a) * 32];
  } else if (preview) {
    const sideL = cssW <= 760 && innerHeight < 520 && cssW > innerHeight && G.mode !== 'create';
    if (cssW > 760 || sideL) proj[8] = sideL ? .44 : (G.mode === 'create' ? 400 : 440) / cssW * .95; else proj[9] = G.mode === 'create' ? -.48 : -.56;
    const pz = G.pvZoom || 1; tgt = [0, 1.0 + (1 - pz) * .35, 0]; eye = cssW > 760 || sideL ? [0, 1.9, 5.6 * pz] : [0, 2.1, 7.4 * pz];   // roda do mouse aproxima
  } else {
    let tx = P.x, tz = P.z;
    if (boss && !boss.dying) { tx = lerp(P.x, boss.x, .32); tz = lerp(P.z, boss.z, .32); }
    if (RG && RG.key === 'home') { tx = lerp(P.x, 16, .85); tz = lerp(P.z, 12.6, .85); }
    if (G.cine) { const k = sm(0, .4, G.cine.t) * (1 - sm(G.cine.dur - .5, G.cine.dur, G.cine.t)); tx = lerp(tx, G.cine.x, k); tz = lerp(tz, G.cine.z, k); }
    cam.x = lerp(cam.x, tx, 1 - Math.exp(-dt * 6)); cam.z = lerp(cam.z, tz, 1 - Math.exp(-dt * 6));
    const fit = Math.pow(clamp(1.1 / asp, 1, 2), .55), dist = 15.5 * (G.settings.zoom || 1) * fit * (RG && RG.key === 'home' ? 1.16 : 1) * (boss ? 1.3 : 1) * (boss && boss.type === 'dragon' ? 1.12 : 1) * (G.cine ? 1 - .3 * sm(0, .4, G.cine.t) * (1 - sm(G.cine.dur - .5, G.cine.dur, G.cine.t)) : 1), pitch = .98;
    const sh = G.shake || 0;
    tgt = [cam.x + rr(-sh, sh), .8, cam.z + rr(-sh, sh)]; eye = [tgt[0], tgt[1] + dist * Math.sin(pitch), tgt[2] + dist * Math.cos(pitch)];
    xray = 1; player = [P.x, 0, P.z];
  }
  VP = mMul(proj, mLook(eye, tgt, [0, 1, 0])); invVP = invert4(VP);
  const light = V.norm([-.45, 1.0, .5]);
  gl.bindFramebuffer(gl.FRAMEBUFFER, FB.fbo); gl.viewport(0, 0, FB.w, FB.h);
  gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.disable(gl.BLEND);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(PS.p); U = PS.u;
  gl.uniformMatrix4fv(U.u_vp, false, VP); gl.uniform3fv(U.u_cam, eye); gl.uniform3fv(U.u_light, light); gl.uniform3fv(U.u_player, player); gl.uniform1f(U.u_aspect, asp);
  { const pc = [VP[0] * player[0] + VP[4] * 1.0 + VP[8] * player[2] + VP[12], VP[1] * player[0] + VP[5] * 1.0 + VP[9] * player[2] + VP[13], VP[3] * player[0] + VP[7] * 1.0 + VP[11] * player[2] + VP[15]]; gl.uniform3fv(U.u_pclip, [pc[0] / pc[2], pc[1] / pc[2], pc[2]]); }
  gl.uniform1f(U.u_proj, FB.h / (2 * Math.tan(fov / 2))); gl.uniform1f(U.u_time, G.time);
  const camD = V.len(V.sub(eye, tgt)); gl.uniform1f(U.u_near, Math.max(.1, camD - 14)); gl.uniform1f(U.u_range, 30);
  // sombras
  const shadows = new Float32Array(32); let si = 0;
  const addSh = (x, z, rx, rz) => { if (si < 8) { shadows.set([x, z, rx, rz], si * 4); si++; } };
  if (!preview && (G.mode === 'play' || G.mode === 'dialog' || G.mode === 'menu')) {
    if (P && P.dieT < 0) addSh(P.x, P.z, .55, .55);
    if (boss && !boss.dying) { if (boss.type === 'dragon') addSh(boss.x - Math.sin(boss.yaw) * .9, boss.z - Math.cos(boss.yaw) * .9, 2.6, 2.6); else if (boss.type === 'skull') { const h = bossHits(boss)[0]; addSh(h[0], h[1], 1.3, 1.3); if (boss.W) for (const H of boss.model.hands) { const p = tp(boss.W[H.hb], H.W); addSh(p[0], p[2], .7, .8); } } else addSh(boss.x, boss.z, 1.5, 1.4); }
    for (const n of npcs) if (n.visible) addSh(n.x, n.z, .5 * (n.scale || 1), .5 * (n.scale || 1));
    const near = enemies.filter(e => e.dieT < 0).sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z));
    for (const e of near) addSh(e.x, e.z, e.def.r * e.scale * 1.1, e.def.r * e.scale * 1.1);
  }
  gl.uniform4fv(U.u_shadow, shadows);
  // mundo
  if (!preview && WD) {
    gl.uniformMatrix4fv(U.u_bones, false, IDB); gl.uniform1f(U.u_sizeMul, 1); gl.uniform1f(U.u_dissolve, 0); gl.uniform1f(U.u_flash, 0); gl.uniform1f(U.u_glow, 1); gl.uniform1f(U.u_xray, xray); gl.uniform1f(U.u_soft, 0);
    const vr = G.mode === 'title' ? 60 : 30 + (boss ? 8 : 0);
    if (WD && WD.lazy) streamWorld(tgt[0], tgt[2], WD.chunks.length ? 2 : 999);   // Ermos: blocos perto da câmera (todos de uma vez ao entrar)
    for (const c of WD.chunks) { if (Math.abs(c.cx - tgt[0]) > vr || Math.abs(c.cz - tgt[2]) > vr * .95) continue; gl.bindVertexArray(c.vao); gl.drawArrays(gl.POINTS, 0, c.count); }
  }
  const t = G.time;
  if (preview) {
    drawModel(getModel('pedestal'), newAnim(getModel('pedestal')), 0, 0, 0, 0, 1);
    creatorYaw += dt * .4; resetAnim(P.anim); P.moveAmt = 0; P.cls = G.char.cls; P.act = (Math.floor(t / 4) % 3 === 2) ? ({ lamina: 'swing', arcano: 'cast', arco: 'shoot' }[G.char.cls]) : null; P.actT = (t % 4) * .25;
    if (G.mode !== 'create') { P.act = null; P.actT = 0; }
    const pose = G.pvPose || (G.mode === 'create' ? 'auto' : 'idle');
    if (pose === 'idle' || EMOTES_PV.includes(pose)) { P.act = null; P.actT = 0; }
    else if (pose === 'atk') { P.act = { lamina: 'swing', arcano: 'cast', arco: 'shoot' }[G.char.cls]; P.actT = (t % 1.2) * .25; }
    P.stance = P.act && P.cls !== 'lamina' ? 1 : 0; P.combo = Math.floor(t / 12) % 3;
    poseHuman(P.anim, P, t); if (EMOTES_PV.includes(pose)) applyEmote(P.anim, pose, t, 1);
    drawModel(playerModel, P.anim, 0, 0, 0, creatorYaw, 1);
  } else {
    drawRemotes(dt, t);
    for (const n of npcs) {
      if (!n.visible) continue;
      resetAnim(n.anim); n.talkT -= dt;
      const talking = n.talkT > 0 || (G.mode === 'dialog' && DLG.cur && DLG.cur.who === n.name);
      let want = n.baseYaw || 0;
      if (talking && P) want = Math.atan2(P.x - n.x, P.z - n.z);
      else if ((n.moveAmt || 0) > .2) want = n.wyaw;
      else if (P && Math.hypot(P.x - n.x, P.z - n.z) < 4 && n.id !== 'ivo') want = Math.atan2(P.x - n.x, P.z - n.z);
      n.yaw += angDiff(n.yaw, want) * (1 - Math.exp(-dt * 6));
      n.act = talking ? 'talk' : ((((n.id === 'kiko' || n.id === 'nina') && (n.moveAmt || 0) < .2 && Math.sin(t * .7 + n.x) > .8) || (n.id === 'otto' && P && Math.hypot(P.x - n.x, P.z - n.z) < 9 && Math.sin(t * .9) > .6)) ? 'wave' : null);
      n.cls = n.cfg.cls; poseHuman(n.anim, n, t + n.x);
      if (n.id === 'lio' && !talking) { n.anim[5].rx = -.9 + Math.sin(t * 9) * .18; n.anim[4].rx = -.75; n.anim[4].ry = -.6; n.anim[3].rz = Math.sin(t * 2) * .08; }
      if (n.id === 'brann') { n.anim[2].rx += .22; n.anim[3].rx -= .1; }
      if (n.id === 'lucia' && !talking && (n.moveAmt || 0) < .2) {   // parada num lampião: ergue a vara e acende
        n.anim[5].rx = -2.3 + Math.sin(t * 3) * .1; n.anim[3].rx = -.3; if (n.W && Math.random() < .25) { const tip = tp(n.W[8], [-.38, 1.6, 1.76]); spawn({ x: tip[0], y: tip[1], z: tip[2], vx: rr(-.5, .5), vy: rr(.5, 1.5), vz: rr(-.5, .5), life: .5, s0: .07, s1: .02, b0: 1, b1: .2, mat: 14 }); }
      }
      if (n.id === 'dora' && !talking) { const ph = Math.sin(t * 1.3); n.anim[4].rx = -.7 + ph * .25; n.anim[5].rx = -.7 - ph * .25; n.anim[2].rx += .15; if (Math.sin(t * .35) > .92) { n.act = 'wave'; } }   // arruma a banca
      if (n.id === 'ivo' && !talking) { n.anim[5].rx = -.75 + Math.sin(t * .8) * .05; }
      if (n.id === 'bruma' && !talking) { const ph = (t * .9) % 1; n.anim[5].rx = ph < .7 ? lerp(-.3, -2.5, ph / .7) : lerp(-2.5, -.2, clamp((ph - .7) / .08, 0, 1)); if (ph > .7) n.anim[2].rx += .15; if (n.lastPh !== undefined && n.lastPh < .78 && ph >= .78) { for (let i = 0; i < 10; i++) spawn({ x: 55 + rr(-.15, .15), y: .75, z: 44.9 + rr(-.1, .1), vx: rr(-2, 2), vy: rr(1.5, 3.5), vz: rr(-2, 2), life: rr(.3, .6), s0: .06, s1: .02, b0: 1, b1: .3, mat: 14, buoy: -9 }); if (P && G.mode === 'play' && Math.hypot(P.x - 55, P.z - 45) < 9) sfx('clink'); } n.lastPh = ph; }
      if (n.id === 'mel' && !talking) { n.anim[4].rx = -1.0 + Math.sin(t * 5) * .25; n.anim[5].rx = -1.0 - Math.sin(t * 5) * .25; n.anim[2].rx += .25; }
      if (n.id === 'desf' && !(G.save && G.save.ended) && Math.random() < .3) spawn({ x: n.x + rr(-.3, .3), y: rr(.3, 1.8), z: n.z + rr(-.3, .3), vx: rr(-.3, .3), vy: rr(.3, .8), vz: rr(-.3, .3), life: 1.2, s0: .07, s1: .02, b0: .9, b1: .1, mat: 63 });
      if (n.id === 'lio' && !talking && Math.random() < .03) spawn({ x: n.x + rr(-.3, .3), y: 1.6, z: n.z + .3, vx: rr(-.2, .2), vy: .6, vz: rr(-.1, .2), life: 1.6, s0: .1, s1: .04, b0: 1, b1: .2, mat: 14 });
      n.W = drawModel(n.model, n.anim, n.x, 0, n.z, n.yaw, n.scale || 1, { dis: n.id === 'desf' && !(G.save && G.save.ended === 'B') ? .1 + .05 * Math.sin(t * 2) : 0, dmat: 63 });
      if (n.id === 'ivo' && n.W) { const tip = tp(n.W[8], [-.38, 1.6, 1.76]), bx = IVO_BOB[0], bz = IVO_BOB[1], by = .02 + Math.sin(t * 2.2) * .04; for (let k = 0; k <= 10; k++) { const u = k / 10; dyn(lerp(tip[0], bx, u), lerp(tip[1], by, u) - Math.sin(u * Math.PI) * .35, lerp(tip[2], bz, u), .5, 28, .045); } dyn(bx, by + .05, bz, .9, 16, .16); }
    }
    if (RG && RG.key === 'hub') {   // patos nadando no lago do Bairro Leste
      const dm = getModel('chicken'); G.ducks = G.ducks || [0, 1, 2, 3].map(() => newAnim(dm));
      G.ducks.forEach((A, k) => { const dir = k % 2 ? 1 : -1, a = t * (.12 + k * .02) * dir + k * 1.57, rr2 = .45 + k * .1, x = 132 + Math.cos(a) * 8.8 * rr2, z = 47.2 + Math.sin(a) * 4.8 * rr2;
        resetAnim(A); A[2].rx = Math.sin(t * 2 + k) > .85 ? .9 : .1; A[1].rz = Math.sin(t * 3 + k) * .08; drawModel(dm, A, x, -.14 + Math.sin(t * 2.2 + k) * .02, z, a + (dir > 0 ? 0 : Math.PI), k === 0 ? 1 : .8);
        if (Math.random() < .05) spawn({ x: x + rr(-.2, .2), y: .02, z: z + rr(-.2, .2), vy: .2, life: .6, s0: .06, s1: .14, b0: .6, b1: .1, mat: 15 }); });
    }
    for (const c of critters) { resetAnim(c.anim); c.anim[2].rx = c.peck > 0 ? .9 * Math.sin(c.peck * 16) ** 2 : 0; c.anim[1].ty = Math.abs(Math.sin(c.ph * 9)) * .05 * c.moving; c.anim[1].rz = Math.sin(c.ph * 9) * .08 * c.moving; drawModel(c.model, c.anim, c.x, 0, c.z, c.yaw, 1); }
    for (const it of inter) {
      if (!it.model) continue;
      resetAnim(it.anim);
      if (it.kind === 'dragon') poseCalmDragon(it.anim, t, G.mode === 'dialog' && DLG.cur && DLG.cur.who === 'Varkhaz');
      if (it.kind === 'shrine') { it.anim[1].ry = t * 1.2; it.anim[1].ty = Math.sin(t * 2) * .08; }
      if (it.kind === 'obelisk') { const on = (G.save.obel || []).includes(it.zone); it.anim[1].ry = t * (on ? 1.6 : .3); for (let k = 0; k < 10; k++) { const a = t * (on ? 1.2 : .3) + k / 10 * 6.283; dyn(it.x + Math.cos(a) * 1.25, .07, it.z + Math.sin(a) * 1.25, on ? .9 : .35, on ? 26 : 24, .15); } }   // obelisco: anel aceso se desperto
      if (it.kind === 'cave') { if (Math.random() < .35) spawn({ x: it.x + rr(-.6, .6), y: rr(.2, 1.6), z: it.z + rr(-.3, .3), vy: rr(.2, .6), life: 1.2, s0: .2, s1: .5, b0: .25, b1: .02, mat: 29, drag: .5 }); }   // covil: fumaça escura
      if (it.kind === 'altar') { const D = curDiff(); for (let k = 0; k < 12; k++) { const a = t * -1.1 + k / 12 * 6.283; dyn(it.x + Math.cos(a) * 1.1, .07, it.z + Math.sin(a) * 1.1, .8, k % 2 ? 26 : 30, .16); } if (!boss && Math.random() < .3 + .05 * (G.save.diff || 0)) spawn({ x: it.x + rr(-.3, .3), y: 1.2, z: it.z + rr(-.3, .3), vy: rr(1, 2), life: .7, s0: .1, s1: .02, b0: 1, b1: .2, mat: D.n.startsWith('Tormento') ? 124 : 30 }); }
      if (it.kind === 'frag') { it.anim[1].ry = t * 2; it.anim[1].ty = Math.sin(t * 2.5) * .15; if (Math.random() < .3) spawn({ x: it.x + rr(-.5, .5), y: rr(.3, 1.8), z: it.z + rr(-.5, .5), vy: .5, life: .8, s0: .07, s1: .02, b0: 1, b1: .2, mat: 30 }); }
      if (it.kind === 'chest') { if (it.open) it.openT += dt; it.anim[1].rx = -1.9 * sm(0, .35, it.openT); }
      if (it.kind === 'pylon') { it.anim[1].ry = t * 1.5; it.anim[1].ty = Math.sin(t * 2) * .12; if (!it.used) { const B = BUFFS[it.bt]; for (let k = 0; k < 14; k++) { const a = t * 1.4 + k / 14 * 6.283; dyn(it.x + Math.cos(a) * 1.0, .07, it.z + Math.sin(a) * 1.0, .7, B.mat, .16); } if (Math.random() < .5) spawn({ x: it.x + rr(-.25, .25), y: 1.7, z: it.z + rr(-.25, .25), vy: rr(.5, 1.2), life: .8, s0: .1, s1: .02, b0: 1, b1: .2, mat: B.mat }); } }
      drawModel(it.model, it.anim, it.x, it.y || 0, it.z, it.yaw, it.scale || 1, { glow: it.used ? .2 : 1 });
      if (it.kind === 'camp') { if (Math.random() < .7) spawn({ x: it.x + rr(-.3, .3), y: .25, z: it.z + 1.6 + rr(-.3, .3), vx: rr(-.15, .15), vy: rr(1, 1.8), life: rr(.35, .6), s0: .18, s1: .03, b0: 1, b1: .15, mat: 21, drag: 1 }); dyn(it.x - 1.2, 1.85, it.z + 1.1, .9, 14, .14); dyn(it.x + 1.2, 1.85, it.z + 1.05, .9, 14, .14); }
      if (it.kind === 'riftportal') {   // portal sombrio: véu girando, redemoinho para dentro e estilhaços em órbita
        it.anim[1].rz = t * (it.lit ? .7 : .1);
        const on = it.lit ? 1 : .25, cy = .32 + 2.3 * .8;
        for (let i = 0; i < (it.lit ? 4 : 1); i++) { const a = rr(0, 6.28), r = rr(1.1, 1.5); spawn({ x: it.x + Math.cos(a) * r, y: cy + Math.sin(a) * r * 1.08, z: it.z + .1, vx: -Math.cos(a) * 2.2 - Math.sin(a) * 1.2, vy: -Math.sin(a) * 2.2 + Math.cos(a) * 1.2, life: .55, s0: .13, s1: .02, b0: on, b1: .1, mat: Math.random() < .35 ? 29 : 151, drag: 1.5 }); }
        for (let k = 0; k < 7; k++) { const a = t * .45 + k / 7 * 6.283, y = cy + .4 + Math.sin(t * 1.3 + k) * .5, px = it.x + Math.cos(a) * 3.1, pz = it.z + Math.sin(a) * 1.6; dyn(px, y, pz, .4, 29, .15); dyn(px, y + .13, pz, .3, 29, .1); dyn(px, y + .24, pz, .3, 29, .06); if (it.lit) dyn(px, y + .06, pz, .9, 151, .06); /* estilhaços finos */ }
        if (it.lit && Math.random() < .2) spawn({ x: it.x + rr(-3, 3), y: .1, z: it.z + rr(-2, 2), vy: rr(.4, 1), life: rr(1, 1.8), s0: .07, s1: .02, b0: 1, b1: .1, mat: 151 });
      }
      if (it.kind === 'portal' && it.lit) { for (let i = 0; i < 3; i++) { const a = rr(0, 6.28), r = rr(0, 1.05); spawn({ x: it.x + Math.cos(a) * r * Math.cos(it.yaw || 0), y: 1.5 + Math.sin(a) * r * 1.3, z: it.z + rr(-.1, .1) - Math.cos(a) * r * Math.sin(it.yaw || 0), vx: -Math.sin(a) * .8 * Math.cos(it.yaw || 0), vz: Math.sin(a) * .8 * Math.sin(it.yaw || 0), vy: Math.cos(a) * .8, life: .5, s0: .12, s1: .03, b0: 1, b1: .2, mat: it.kind === 'riftportal' ? 122 : RG && RG.key === 'hub' && PORTAL_FX[it.to] !== undefined ? PORTAL_FX[it.to] : it.to === 'hub' ? 30 : 31 }); } }
    }
    for (const e of enemies) {
      if (Math.abs(e.x - tgt[0]) > 30 || Math.abs(e.z - tgt[2]) > 26) continue;
      poseEnemy(e, e.t);
      if (e.elite && e.dieT < 0 && Math.random() < .6) spawn({ mat: e.thief ? 30 : 123, x: e.x + rr(-.5, .5) * e.scale, y: rr(.1, 1.4) * e.scale, z: e.z + rr(-.5, .5) * e.scale, vy: rr(.4, 1), life: .6, s0: .1, s1: .02, b0: 1, b1: .2 });
      if (e.slowT > 0 && Math.random() < .4) spawn({ x: e.x + rr(-.4, .4), y: rr(.2, 1.2), z: e.z + rr(-.4, .4), vy: -.3, life: .5, s0: .08, s1: .02, b0: 1, b1: .3, mat: 122 });
      const dis = e.spawnT > 0 ? clamp(e.spawnT / .8, 0, 1) : e.dieT >= 0 ? clamp(e.dieT / .6, 0, 1) : 0;
      drawModel(e.model, e.anim, e.x, e.y, e.z, e.yaw, e.scale * (e.dieT >= 0 ? 1 + .25 * Math.sin(Math.min(1, e.dieT / .25) * Math.PI) : 1), { dis: Math.max(dis, e.fade || 0), dmat: e.thief ? 30 : 21, flash: e.flash > .5 ? 1 : 0 });
      if (e.dieT < 0) drawEnemyExtra(e, t);
    }
    if (G.touch && P && P.dieT < 0 && G.mode === 'play') { let tg = null, bd = 11; for (const e of enemies) { if (e.dieT >= 0 || e.spawnT > 0) continue; const dd = Math.hypot(e.x - P.x, e.z - P.z); if (dd < bd) { bd = dd; tg = e; } } if (tg) { const rr2 = (tg.def.r + .35) * tg.scale; for (let k = 0; k < 10; k++) { const a = t * 2 + k / 10 * 6.283; dyn(tg.x + Math.cos(a) * rr2, .08, tg.z + Math.sin(a) * rr2, .9, 30, .12); } } }
    if (boss) {
      poseBoss(boss, boss.t);
      const dis = boss.dying ? clamp(boss.dieT / 2.4, 0, 1) : boss.spawnT > 0 ? clamp(boss.spawnT / 1.2, 0, 1) : 0;
      boss.W = drawModel(boss.model, boss.anim, boss.x, boss.hop || 0, boss.z, boss.yaw, boss.scale || 1, { dis: Math.max(dis, boss.blinkDis || 0), dmat: BOSSMAT[boss.type] ?? 27, flash: boss.flash > .5 ? 1 : 0, glow: boss.act ? 1 : .85 });
      if (boss.type === 'reflexo' && !boss.dying && Math.random() < .5) spawn({ x: boss.x + rr(-.6, .6), y: rr(.2, 3), z: boss.z + rr(-.6, .6), vy: rr(.3, 1), life: .8, s0: .1, s1: .02, b0: 1, b1: .2, mat: 158 });
      if (boss.phase2 && !boss.dying && Math.random() < .6) { const a = rr(0, 6.28), rad = 1.5 * (boss.scale || 1); spawn({ x: boss.x + Math.cos(a) * rad, y: rr(.2, 2.5), z: boss.z + Math.sin(a) * rad, vy: rr(.5, 1.5), life: .7, s0: .14, s1: .03, b0: 1, b1: .2, mat: BOSSMAT[boss.type] ?? 27 }); }
    }
    if (P && playerModel) {
      resetAnim(P.anim); poseHuman(P.anim, P, t);
      if (P.down > 0) coopDownPose(P.anim, t);
      else if (P.emote) { P.emoteT = (P.emoteT || 0) + dt; if ((P.emoteT > 6 && P.emote !== 'sentar') || (P.moveAmt || 0) > .2 || P.act) P.emote = null; else applyEmote(P.anim, P.emote, t, Math.min(1, P.emoteT / .4)); }
      if (G.fishing || G.fishCatch) poseFishing(P.anim, t);
      if (P.ghosts) for (const g of P.ghosts) if (g.t < .18) drawModel(playerModel, P.anim, g.x, 0, g.z, g.yaw, 1, { flash: .55 - g.t * 2 });
      for (const k in G.buffs) if (G.buffs[k] > 0 && Math.random() < .35) spawn({ x: P.x + rr(-.45, .45), y: rr(.1, 1.8), z: P.z + rr(-.45, .45), vy: rr(.3, .8), life: .6, s0: .09, s1: .02, b0: 1, b1: .2, mat: BUFFS[k].mat });
      const blink = P.iframe > 0 && P.dashT <= 0 && P.dieT < 0 && Math.floor(t * 20) % 2 === 0;
      if (G.settings.halo !== false && P.dieT < 0) for (let k = 0; k < 18; k++) { const a = k / 18 * 6.283 + t * .6; dyn(P.x + Math.cos(a) * .62, .07, P.z + Math.sin(a) * .62, k % 3 ? .45 : .75, 30, .13); }   // anel de destaque do herói
      if (!blink) P.W = drawModel(playerModel, P.anim, P.x, 0, P.z, P.yaw, 1, { dis: P.dieT >= 0 ? clamp(P.dieT / 1.2, 0, 1) : 0, dmat: 7, flash: P.flash > .6 ? 1 : 0 });
      if (P.W && (G.fishing || G.fishCatch)) drawFishing(t);
      if (P.shield > 0) for (let i = 0; i < 16; i++) { const a = t * 2 + i / 16 * 6.283; dyn(P.x + Math.cos(a) * .7, .3 + (i % 4) * .4, P.z + Math.sin(a) * .7, .7, 31, .14); }
      if (G.save && G.save.eq && G.save.eq.weapon && G.save.eq.weapon.rar === 4 && P.W && Math.random() < .5) { const wp = G.char.cls === 'arco' ? handPos('bow') : G.char.cls === 'arcano' ? handPos('staff') : tp(P.W[8], [-.38 * ([.86, 1, 1.18][G.char.body ?? 1]), .6, .6]); spawn({ x: wp[0] + rr(-.1, .1), y: wp[1] + rr(-.1, .1), z: wp[2] + rr(-.1, .1), vy: .5, life: .4, s0: .08, s1: .02, b0: 1, b1: .2, mat: 124 }); }
      if (P.stance > .2 && P.dieT < 0) {
        const sv = P.stance;
        if (P.cls === 'arcano') { for (let i = 0; i < 22; i++) { const a = t * 1.6 + i / 22 * 6.283; dyn(P.x + Math.cos(a) * 1.0, .06, P.z + Math.sin(a) * 1.0, .55 * sv, 7, .15); } for (let i = 0; i < 6; i++) { const a = -t * 2.4 + i / 6 * 6.283; dyn(P.x + Math.cos(a) * .6, .06, P.z + Math.sin(a) * .6, .8 * sv, 7, .2); } }
        const ay = P.aimYaw; for (let k = 1; k <= 7; k++) dyn(P.x + Math.sin(ay) * (1 + k * .9), .07, P.z + Math.cos(ay) * (1 + k * .9), .3 * sv * (1 - k / 9), 7, .13);
      }
    }
  }
  // dinâmicos
  for (const p of parts) { const k = p.age / p.life; dyn(p.x, p.y, p.z, lerp(p.b0, p.b1, k), p.mat, lerp(p.s0, p.s1, k)); }
  for (const p of projs) {
    if (p.arrow) { const l = Math.hypot(p.vx, p.vz) || 1, ux = p.vx / l, uz = p.vz / l; dyn(p.x, p.y, p.z, 1, p.mat, p.size); for (let k = 1; k <= 4; k++) dyn(p.x - ux * k * .15, p.y, p.z - uz * k * .15, k === 4 ? .9 : .45, p.mat, k === 4 ? .17 : .1); }
    else if (p.bolt) { dyn(p.x, p.y, p.z, 1, p.mat, p.size); for (let k = 0; k < 3; k++) { const a = t * 14 + k * 2.094; dyn(p.x + Math.cos(a) * .24, p.y + Math.sin(a) * .24, p.z, .7, p.mat, .1); } }
    else dyn(p.x, p.y, p.z, 1, p.mat, p.size);
  }
  for (const p of pickups) { if (p.kind === 'item') { const r = RAR[p.item.rar].row; dyn(p.x, p.y + .15 + Math.sin(t * 3 + p.x) * .08, p.z, 1, r, .36); for (let k = 0; k < 8; k++) { const a = t * 2 + k / 8 * 6.283; dyn(p.x + Math.cos(a) * .45, .06, p.z + Math.sin(a) * .45, .55, r, .14); } } else dyn(p.x, p.y, p.z, .8 + .2 * Math.sin(t * 10 + p.x), p.kind === 'gold' ? 30 : p.kind === 'orb' ? 122 : 31, p.kind === 'gold' ? .2 : .34); }
  drawTelegraphs(); drawZones(t);
  // coleta visível: feixe de luz em cada item, minhocas desenhadas e uma seta no chão para o mais perto
  { const tg = collectTargets(); let best = null, bd = 1e9;
    for (const c of tg) {
      for (let k = 0; k < 16; k++) { const y = .3 + k * .3, w = Math.sin(t * 4 - k * .6) * .06; dyn(c.x + w, y, c.z, 1 - k * .045, c.mat, .26 - k * .012); }   // feixe que se vê de longe
      for (let k = 0; k < 10; k++) { const a = t * 2.2 + k / 10 * 6.283; dyn(c.x + Math.cos(a) * .55, .07, c.z + Math.sin(a) * .55, .85, c.mat, .14); }   // anel no chão
      if (c.worm) for (let k = 0; k < 6; k++) { const u = k / 5, wig = Math.sin(t * 6 + k * 1.2) * .08; dyn(c.x - .3 + u * .6, .1 + Math.abs(Math.sin(t * 4 + k)) * .04, c.z + wig, .95, 21, .15 - Math.abs(u - .5) * .08); }
      const d = P ? Math.hypot(c.x - P.x, c.z - P.z) : 1e9; if (d < bd) { bd = d; best = c; }
    }
    if (best && P && bd > 2.2 && G.mode === 'play') { const a = Math.atan2(best.x - P.x, best.z - P.z), s = Math.sin(a), c2 = Math.cos(a), pl = .5 + .5 * Math.sin(t * 5);
      for (let k = 0; k < 7; k++) { const r = 1.0 + k * .26 + pl * .15; dyn(P.x + s * r, .1, P.z + c2 * r, .7 + .3 * pl, 14, .2 - k * .01); }   // seta dourada no chão
      for (const sd of [-1, 1]) for (let k = 1; k <= 3; k++) dyn(P.x + s * (2.7 - k * .2) + c2 * k * .17 * sd, .1, P.z + c2 * (2.7 - k * .2) - s * k * .17 * sd, .7 + .3 * pl, 14, .17); }
  }
  for (const it of inter) if (it.kind === 'qitem') { const y = .5 + Math.sin(t * 3 + it.x) * .1; dyn(it.x, y, it.z, 1, it.mat, .3); for (let k = 0; k < 6; k++) { const a = t * 2 + k / 6 * 6.283; dyn(it.x + Math.cos(a) * .35, .06, it.z + Math.sin(a) * .35, .6, it.mat, .12); } if (Math.random() < .4) spawn({ x: it.x + rr(-.1, .1), y: .3, z: it.z + rr(-.1, .1), vy: rr(1, 2), life: .7, s0: .08, s1: .02, b0: 1, b1: .2, mat: it.mat }); }
  if (dynN) {
    gl.uniformMatrix4fv(U.u_bones, false, IDB); gl.uniform1f(U.u_sizeMul, 1); gl.uniform1f(U.u_dissolve, 0); gl.uniform1f(U.u_flash, 0); gl.uniform1f(U.u_glow, 1); gl.uniform1f(U.u_xray, 0); gl.uniform1f(U.u_soft, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, dynVAO.buf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pData, 0, dynN * STRIDE);
    gl.bindVertexArray(dynVAO.vao); gl.drawArrays(gl.POINTS, 0, dynN);
  }
  // pós
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); gl.disable(gl.DEPTH_TEST);
  gl.useProgram(PP.p); const Q = PP.u;
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, FB.tex); gl.uniform1i(Q.u_fb, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, palTex); gl.uniform1i(Q.u_pal, 1);
  gl.uniform1f(Q.u_px, pxDev); gl.uniform2f(Q.u_res, FB.w, FB.h); gl.uniform1f(Q.u_dither, G.settings.dither); gl.uniform1f(Q.u_time, G.time);
  gl.uniform1i(Q.u_outlineOn, G.settings.outline ? 1 : 0); gl.uniform1f(Q.u_fade, G.fade || 0); gl.uniform1f(Q.u_hurt, G.hurt || 0);
  const bgp = preview ? { bg: ['#0c0a18', '#1a1430', '#2e2048'], outline: '#06050b', star: '#ffe9c9' } : regPal;
  gl.uniform3fv(Q.u_outline, hex1(bgp.outline)); gl.uniform3fv(Q.u_star, hex1(bgp.star));
  gl.uniform3fv(Q.u_bg0, hex1(bgp.bg[0])); gl.uniform3fv(Q.u_bg1, hex1(bgp.bg[1])); gl.uniform3fv(Q.u_bg2, hex1(bgp.bg[2]));
  gl.uniform1i(Q.u_icon, 0);
  gl.bindVertexArray(emptyVAO); gl.drawArrays(gl.TRIANGLES, 0, 3);
}

/** Itens de missão ainda no chão nesta região (minhocas da vara, itens das missões dos moradores). */
function collectTargets() {
  const out = []; if (!G.save || !RG) return out;
  const vq = G.save.q && G.save.q.vara;
  if (RG.key === 'hub' && vq && vq.st === 'active') WORMS.forEach(([x, z], i) => { if (!(vq.got || []).includes(i)) out.push({ x, z, mat: 21, worm: true }); });
  for (const it of inter) if (it.kind === 'qitem' && !it.taken) out.push({ x: it.x, z: it.z, mat: it.mat });
  return out;
}
/* ---------- ícones 3D: modelos de splats desenhados uma vez numa textura pequena e lidos como imagem ---------- */
const ICON_DEFS = {
  sword: S => { S.tube([[-.42, -.42, 0, .03, 0], [.38, .38, 0, .005, 0]], 28, { sx: 2.4, sy: .5, sub: 3, noSolid: true }); S.tube([[-.42, -.42, 0, .03, 0], [.3, .3, 0, .004, 0]], 28, { sx: .5, sy: .5, sub: 2, noSolid: true });
    S.tube([[-.5, -.28, 0, .045, 0], [-.28, -.5, 0, .045, 0]], 14, { sub: 2, noSolid: true }); S.tube([[-.45, -.45, 0, .035, 0], [-.62, -.62, 0, .035, 0]], 12, { sub: 1, noSolid: true }); S.ell([-.66, -.66, 0], .06, 14, 0, { noSolid: true }); },
  staff: S => {   // cajado: madeira com anéis dourados, cabeça em meia-lua segurando uma esfera brilhante
    S.tube([[-.62, -.66, 0, .04, 0], [-.1, -.12, 0, .036, 0], [.22, .22, 0, .034, 0]], 12, { sub: 3, noSolid: true });
    for (const u of [-.45, -.05]) S.tube([[u - .03, u - .03, 0, .052, 0], [u + .03, u + .03, 0, .052, 0]], 14, { sub: 1, noSolid: true });
    const hk = []; for (let i = 0; i <= 10; i++) { const a = -.6 + i / 10 * 3.6; hk.push([.42 + Math.cos(a) * .24, .42 + Math.sin(a) * .24, 0, .03 - Math.abs(i - 5) * .002, 0]); } S.tube(hk, 14, { sub: 2, noSolid: true });
    S.ell([.42, .42, .02], .14, 151, 0, { noSolid: true }); S.ell([.38, .47, .14], [.04, .04, .02], 28, 0, { noSolid: true, noCheck: true });
    for (const [x, y] of [[.72, .2], [.15, .72], [.7, .7]]) S.ell([x, y, 0], .035, 30, 0, { noSolid: true, noCheck: true, min: 6 }); },
  bow: S => { const p = []; for (let i = 0; i <= 8; i++) { const u = i / 8, a = -1.1 + u * 2.2; p.push([-.15 + Math.cos(a) * .55 - .4, Math.sin(a) * .62, 0, .045 - Math.abs(u - .5) * .04, 0]); } S.tube(p, 12, { sub: 2, noSolid: true });
    S.tube([[-.45, -.55, 0, .01, 0], [-.45, .55, 0, .01, 0]], 28, { sub: 1, noSolid: true }); S.tube([[-.45, 0, 0, .02, 0], [.55, 0, 0, .02, 0]], 28, { sub: 1, noSolid: true }); S.cone([.5, 0, 0], [.7, 0, 0], .07, 11, 0); },
  dash: S => { for (const k of [0, 1]) { const x = -.35 + k * .45; S.tube([[x - .25, .45, 0, .07, 0], [x + .15, 0, 0, .09, 0], [x - .25, -.45, 0, .07, 0]], 150, { sub: 2, noSolid: true }); } },
  fire: S => { for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, r = .2 + i * .028; S.ell([Math.cos(a) * r, Math.sin(a) * r * .9, 0], .1 + i * .006, i % 3 ? 27 : 21, 0, { noSolid: true, noCheck: true }); } S.ell([0, 0, 0], .16, 21, 0, { noSolid: true }); },
  nova: S => { S.ell([0, 0, 0], .2, 151, 0, { noSolid: true }); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, l = i % 2 ? .45 : .68; S.cone([Math.cos(a) * .15, Math.sin(a) * .15, 0], [Math.cos(a) * l, Math.sin(a) * l, 0], .08, i % 2 ? 151 : 30, 0); } },
  rain: S => { for (const [x, y] of [[-.35, .3], [.05, .45], [.35, .05], [-.1, -.2]]) { S.tube([[x - .18, y + .28, 0, .018, 0], [x + .1, y - .2, 0, .018, 0]], 28, { sub: 1, noSolid: true }); S.cone([x + .08, y - .16, 0], [x + .16, y - .3, 0], .05, 150, 0); } },
  potion: S => { S.ell([0, -.18, 0], [.38, .38, .38], (p) => p[1] < -.12 ? 16 : 28, 0); S.tube([[0, .15, 0, .12, 0], [0, .38, 0, .11, 0]], 28, { sub: 1 }); S.tube([[0, .38, 0, .13, 0], [0, .5, 0, .13, 0]], 12, { sub: 1 }); S.ell([-.14, -.06, .3], [.06, .1, .03], 28, 0, { noSolid: true, noCheck: true }); },
  bag: S => { S.ell([0, -.12, 0], [.46, .4, .34], 12, 0); S.ell([0, .2, .05], [.4, .14, .3], 19, 0); S.tube([[-.18, .3, .18, .03, 0], [0, .48, .1, .03, 0], [.18, .3, .18, .03, 0]], 19, { sub: 2, noSolid: true }); S.box([0, .02, .33], [.08, .07, .03], 14, 0, { faces: 's' }); },
  heart: S => { for (const s of [1, -1]) S.ell([s * .2, .15, 0], .28, 16, 0); S.cone([0, .05, 0], [0, -.55, 0], .38, 16, 0, { sx: 1.25, sy: .5, sub: 2 }); S.ell([-.22, .26, .2], [.07, .05, .03], 28, 0, { noSolid: true, noCheck: true }); },
  gold: S => { for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + .785; S.cone([0, 0, 0], [Math.cos(a) * .6, Math.sin(a) * .6, 0], .2, 14, 0, { sx: 1, sy: .4 }); } S.ell([0, 0, 0], .2, 14, 0, { noSolid: true }); },
  gem: S => { S.cone([0, .05, 0], [0, .55, 0], .38, 150, 0, { sub: 1 }); S.cone([0, .05, 0], [0, -.6, 0], .38, 150, 0, { sub: 1 }); S.ell([-.12, .2, .2], [.05, .08, .02], 28, 0, { noSolid: true, noCheck: true }); },
  book: S => { S.box([0, 0, 0], [.45, .55, .12], (p, n) => n[2] > .5 || n[2] < -.5 ? 16 : 28, 0); for (const [x, y] of [[-.38, .48], [.38, .48], [-.38, -.48], [.38, -.48]]) S.box([x, y, .13], [.07, .07, .01], 14, 0, { faces: 's' }); S.ell([0, 0, .13], [.12, .12, .01], 14, 0, { noSolid: true, noCheck: true }); },
  gear: S => { const r = []; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; r.push([Math.cos(a) * .38, Math.sin(a) * .38, 0, .1, 0]); } S.tube(r, 11, { closed: true, sub: 2, noSolid: true }); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; S.box([Math.cos(a) * .55, Math.sin(a) * .55, 0], [.08, .08, .08], 11, 0); } },
};
let ICONFB = null;
/** Desenha um modelo numa textura S×S (splats + pós com contorno) e devolve a imagem (data URL, fundo transparente). */
function bakeModel(model, A, S, eye, tgt, yaw = 0, fov = 30) {
  if (!ICONFB) { ICONFB = { w: 0, fbo: gl.createFramebuffer(), tex: gl.createTexture(), depth: gl.createRenderbuffer(), out: gl.createFramebuffer(), otex: gl.createTexture() }; }
  const F = ICONFB;
  if (F.w !== S) {
    F.w = S;
    for (const tx of [F.tex, F.otex]) { gl.bindTexture(gl.TEXTURE_2D, tx); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, S, S, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); }
    gl.bindRenderbuffer(gl.RENDERBUFFER, F.depth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, S, S);
    gl.bindFramebuffer(gl.FRAMEBUFFER, F.fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, F.tex, 0); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, F.depth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, F.out); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, F.otex, 0);
  }
  const fv = fov * Math.PI / 180, VPi = mMul(mPersp(fv, 1, .1, 50), mLook(eye, tgt, [0, 1, 0]));
  gl.bindFramebuffer(gl.FRAMEBUFFER, F.fbo); gl.viewport(0, 0, S, S); gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.disable(gl.BLEND);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(PS.p); U = PS.u;
  gl.uniformMatrix4fv(U.u_vp, false, VPi); gl.uniform3fv(U.u_cam, eye); gl.uniform3fv(U.u_light, V.norm([-.5, .9, .7])); gl.uniform3fv(U.u_player, [0, -99, 0]); gl.uniform1f(U.u_aspect, 1);
  gl.uniform3fv(U.u_pclip, [0, 0, -9]); gl.uniform1f(U.u_proj, S / (2 * Math.tan(fv / 2))); gl.uniform1f(U.u_time, 0);
  const d = V.len(V.sub(eye, tgt)); gl.uniform1f(U.u_near, Math.max(.1, d - 2)); gl.uniform1f(U.u_range, 4); gl.uniform4fv(U.u_shadow, new Float32Array(32));
  drawModel(model, A, 0, 0, 0, yaw, 1, {});
  gl.bindFramebuffer(gl.FRAMEBUFFER, F.out); gl.viewport(0, 0, S, S); gl.disable(gl.DEPTH_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(PP.p); const Q = PP.u;
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, F.tex); gl.uniform1i(Q.u_fb, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, palTex); gl.uniform1i(Q.u_pal, 1);
  gl.uniform1f(Q.u_px, 1); gl.uniform2f(Q.u_res, S, S); gl.uniform1f(Q.u_dither, .6); gl.uniform1f(Q.u_time, 0); gl.uniform1i(Q.u_outlineOn, 1); gl.uniform1f(Q.u_fade, 0); gl.uniform1f(Q.u_hurt, 0); gl.uniform1i(Q.u_icon, 1);
  gl.uniform3fv(Q.u_outline, [.03, .02, .05]); gl.uniform3fv(Q.u_star, [1, 1, 1]); gl.uniform3fv(Q.u_bg0, [0, 0, 0]); gl.uniform3fv(Q.u_bg1, [0, 0, 0]); gl.uniform3fv(Q.u_bg2, [0, 0, 0]);
  gl.bindVertexArray(emptyVAO); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.uniform1i(Q.u_icon, 0);
  const px = new Uint8Array(S * S * 4); gl.readPixels(0, 0, S, S, gl.RGBA, gl.UNSIGNED_BYTE, px);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const c = document.createElement('canvas'); c.width = c.height = S; const cx = c.getContext('2d'), img = cx.createImageData(S, S);
  for (let y = 0; y < S; y++) img.data.set(px.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);   // o WebGL lê de baixo para cima
  cx.putImageData(img, 0, 0); return c.toDataURL();
}
/** Assa todos os ícones (uma vez, no início; de novo se a paleta da vila mudar muito). */
function bakeIcons() {
  try {
    for (const [name, fn] of Object.entries(ICON_DEFS)) {
      const m = makeModel('icon:' + name, () => { const S = new SplatSet(91, 5200); fn(S); return { bones: [{ p: -1, v: [0, 0, 0] }], data: S.build() }; });
      ICON3D[name] = bakeModel(m, newAnim(m), 40, [.35, .45, 2.6], [0, 0, 0], 0, 34);
    }
    document.querySelectorAll('img[data-ic]').forEach(el => el.src = icon(el.dataset.ic));
    if (typeof hudCache === 'object') for (const k in hudCache) delete hudCache[k];   // a barra pega os ícones novos
    document.body.classList.add('ic3d');
  } catch (e) { console.warn('ícones 3D indisponíveis', e); }
}
/** Retrato do herói no HUD: busto de frente, refeito quando o visual ou o equipamento mudam. */
let portraitKey = '';
function bakePortrait() {
  if (!playerModel || !G.char) return;
  const k = JSON.stringify([G.char, G.save && G.save.eq && [G.save.eq.armor && G.save.eq.armor.rar, G.save.eq.charm && G.save.eq.charm.rar]]); if (k === portraitKey) return; portraitKey = k;
  try { const A = newAnim(playerModel); if (A[8]) A[8].sx = A[8].sy = A[8].sz = .001; const url = bakeModel(playerModel, A, 48, [.45, 1.8, 2.3], [0, 1.52, 0], 0, 26); const el = $('#hPortrait'); if (el) el.src = url; } catch (e) { console.warn(e); }
}

