/* Fios de Tessária · Poses e animação */
/* =========================================================
   POSES
   ========================================================= */
function poseHuman(A, e, t) {
  const m = e.moveAmt || 0, w = e.walkPh || 0, br = Math.sin(t * 2.2), stc = e.stance || 0, cls = e.cls, lean = e.lean || 0, sw = Math.sin(w), cw = Math.cos(w);
  A[6].rx = sw * .85 * m; A[7].rx = -sw * .85 * m; A[6].rz = .02; A[7].rz = -.02;
  A[4].rx = -sw * .65 * m * (1 - stc); A[5].rx = sw * .65 * m * (1 - stc);
  A[4].rz = .1 + .06 * m + br * .015 * (1 - m); A[5].rz = -.1 - .06 * m - br * .015 * (1 - m);
  A[1].ty = Math.abs(cw) * .07 * m - .025 * m + br * .01 * (1 - m);
  A[1].ry = sw * .14 * m; A[1].rz = cw * .04 * m + lean;
  A[2].ry = -sw * .2 * m; A[2].rx = .14 * m + br * .022 * (1 - m); A[2].rz = -lean * .5;
  A[3].ry = -A[1].ry * .7 - A[2].ry * .7; A[3].rx = -.07 * m + Math.sin(w * 2) * .025 * m;
  const idle = clamp(((e.idleT || 0) - 3) / 1.5, 0, 1);
  if (idle > 0) { A[3].ry += Math.sin(t * .45) * .45 * idle; A[3].rx += Math.sin(t * .3) * .08 * idle; A[2].ry += Math.sin(t * .45) * .1 * idle; A[5].rz -= .05 * idle * (1 + Math.sin(t * .7)); }
  const a = e.act, at = e.actT || 0, ranged = stc > .01 && (cls === 'arco' || cls === 'arcano');
  if (ranged && cls === 'arco') {
    const snap = a === 'shoot' ? Math.sin(clamp(at / .2, 0, 1) * Math.PI) : 0;
    A[2].ry = -.95 * stc; A[3].ry = .85 * stc; A[3].rx -= .05 * stc; A[1].ry *= 1 - stc;
    A[4].rx = lerp(A[4].rx, -1.55, stc); A[4].ry = .95 * stc; A[4].rz = lerp(.1, -.05, stc);
    A[5].rx = lerp(A[5].rx, -1.4 + .3 * snap, stc); A[5].ry = (1.55 - 1.0 * snap) * stc; A[5].rz = lerp(-.1, -.25, stc);
    A[6].rz = .12 * stc; A[7].rz = -.1 * stc; A[2].rx -= .06 * snap;
  } else if (ranged && cls === 'arcano') {
    const th = a === 'cast' ? Math.sin(clamp(at / .26, 0, 1) * Math.PI) : 0;
    A[5].rx = lerp(A[5].rx, -.95 - .75 * th, stc); A[5].ry = .3 * stc; A[5].rz = lerp(-.1, -.05, stc);
    A[4].rx = lerp(A[4].rx, -1.0 - .45 * th, stc); A[4].ry = -.55 * stc; A[4].rz = lerp(.1, .35, stc);
    A[2].rx += (.1 + .18 * th) * stc; A[2].ry = (.25 * (1 - th) - .15 * th) * stc; A[1].tz = .06 * th;
  }
  if (a === 'swing') {
    const k = clamp(at / .3, 0, 1), ant = sm(0, .22, k) * (1 - sm(.22, .42, k)), str = sm(.2, .45, k), rec = sm(.6, 1, k), c = e.combo || 0;
    if (c === 2) { A[5].rx = lerp(lerp(-2.6, -3.1, ant), -.15, str); A[5].ry = 0; A[4].rx = lerp(-1.4, .3, str); A[2].rx = lerp(-.3 - .1 * ant, .5, str) * (1 - rec * .6); A[2].ry = 0; A[1].ty -= .12 * str * (1 - rec); A[6].rx = -.45 * str; A[7].rx = .35 * str; }
    else { const sg = c === 1 ? -1 : 1; A[5].rx = lerp(lerp(-2.0, -2.3, ant), -.5, str); A[5].ry = sg * lerp(.7 + .35 * ant, -.9, str); A[5].rz = -.25; A[2].ry = sg * lerp(.45 + .25 * ant, -.65, str) * (1 - rec * .5); A[1].ry += sg * lerp(.15, -.2, str); A[4].rx = -.4; A[6].rx = -.3 * str; A[7].rx = .25 * str; }
    A[1].tz = .2 * str * (1 - rec);
  }
  else if (a === 'cast' && !ranged) { const sv = Math.sin(clamp(at / .25, 0, 1) * Math.PI); A[5].rx = -1.5 * sv - .2; A[2].ry = -.2 * sv; }
  else if (a === 'shoot' && !ranged) { const sv = Math.sin(clamp(at / .22, 0, 1) * Math.PI); A[4].rx = -1.5; A[4].rz = 0; A[5].rx = -1.4; A[5].ry = -.5 * sv; A[2].ry = .25; }
  else if (a === 'spin') { A[2].ry = at / .5 * Math.PI * 2; A[4].rz = 1.3; A[5].rz = -1.3; A[1].ty -= .12; A[6].rx = -.35; A[7].rx = .35; }
  else if (a === 'nova') { const sv = Math.sin(clamp(at / .45, 0, 1) * Math.PI); A[4].rx = A[5].rx = -2.9 * sv; A[4].rz = .4 * sv; A[5].rz = -.4 * sv; A[2].rx = -.25 * sv; A[3].rx = -.3 * sv; A[2].ry = 0; A[1].ty -= .1 * (1 - sv); }
  else if (a === 'dash') { A[2].rx = .55; A[3].rx = -.25; A[4].rx = .7; A[5].rx = .7; A[4].rz = .4; A[5].rz = -.4; A[6].rx = -.7; A[7].rx = .6; A[1].ty -= .1; }
  else if (a === 'hurt') { const sv = 1 - clamp(at / .3, 0, 1); A[2].rx -= .45 * sv; A[3].rx -= .3 * sv; A[1].tz -= .12 * sv; A[4].rz += .5 * sv; A[5].rz -= .5 * sv; }
  else if (a === 'talk') { A[5].rx = -.5 - .25 * Math.sin(t * 5); A[3].ry = .1 * Math.sin(t * 1.7); A[3].rx = .05 * Math.sin(t * 3); A[4].rx = -.15 - .1 * Math.sin(t * 3.3); }
  else if (a === 'wave') { A[5].rz = -2.5 + .35 * Math.sin(t * 9); A[5].rx = -.2; A[3].rz = .08 * Math.sin(t * 4); }
  if (e.landT > 0) { A[1].ty -= .1 * e.landT / .15; A[2].rx += .2 * e.landT / .15; }
  if (cls === 'arcano') { const th = a === 'cast' ? Math.sin(clamp(at / .26, 0, 1) * Math.PI) : 0; poseStaff(A, .06 + .3 * th, -.1 * (1 - stc)); }
  if (cls === 'arco' && A[9]) { A[9].rx = -A[4].rx - A[2].rx; A[9].rz = -A[4].rz; }
  if (A[11]) {   // capa: esvoaça para trás ao andar e na esquiva; parado, só respira
    const fl = .45 * m + (a === 'dash' ? .7 : 0) + (a === 'spin' ? .5 : 0) + br * .025 * (1 - m) + Math.sin(t * 3.3 + w) * .06 * m;
    A[10].rx = fl - A[2].rx * .8; A[10].rz = Math.sin(t * 1.7) * .03 + sw * .05 * m;
    A[11].rx = fl * .55 + Math.sin(t * 2.4 + 1) * (.03 + .08 * m); A[11].rz = Math.sin(t * 2.1) * .04;
  }
}
/* Cajado do Arcano (osso 8, preso à mão direita). O osso desfaz exatamente a rotação do tronco (2) e do braço (5),
   para o cajado ficar quase em pé em relação ao quadril, com a inclinação pedida: rx > 0 leva a ponta para a frente,
   rz < 0 afasta o pé do cajado do corpo; na postura de mira ele fica reto, à frente do corpo. Antes só a rotação em X era desfeita (e pela metade no Y), e o resto da
   rotação do braço deixava o cajado em diagonal, atravessando o manto. */
function rot3(a) {
  const cy = Math.cos(a.ry), sy = Math.sin(a.ry), cx = Math.cos(a.rx), sx = Math.sin(a.rx), cz = Math.cos(a.rz), sz = Math.sin(a.rz);
  return [[cy * cz + sy * sx * sz, -cy * sz + sy * sx * cz, sy * cx], [cx * sz, cx * cz, -sx], [-sy * cz + cy * sx * sz, sy * sz + cy * sx * cz, cy * cx]];
}
const mul3 = (a, b) => a.map(r => [0, 1, 2].map(j => r[0] * b[0][j] + r[1] * b[1][j] + r[2] * b[2][j]));
function poseStaff(A, rx, rz) {
  const Q = mul3(rot3(A[2]), rot3(A[5])), R = mul3([0, 1, 2].map(i => [Q[0][i], Q[1][i], Q[2][i]]), rot3({ rx, ry: 0, rz }));
  A[8].rx = Math.asin(clamp(-R[1][2], -1, 1)); A[8].ry = Math.atan2(R[0][2], R[2][2]); A[8].rz = Math.atan2(R[1][0], R[1][1]);
}
function poseEnemy(e, t) {
  const A = e.anim; resetAnim(A);
  switch (e.type) {
    case 'dummy': if (e.hitT > 0) A[1].rz = Math.sin(e.t * 40) * .2 * e.hitT / .18; break;   // boneco de treino balança
    case 'gosmo': { const air = e.hop > 0 ? Math.sin(Math.PI * (1 - e.hop / .45)) : 0, land = e.hop <= 0 ? Math.max(0, 1 - (e.cd > 0 ? (1 - e.cd) * 4 : 1)) : 0; const sy = 1 + .22 * air - .2 * land + .03 * Math.sin(t * 5); A[1].sy = sy; A[1].sx = A[1].sz = 1 / Math.sqrt(sy); break; }
    case 'wisp': A[1].ty = Math.sin(t * 2) * .12; A[1].ry = t * 1.5; break;
    case 'afogado':
    case 'skel': poseHuman(A, e, t); A[3].rz = Math.sin(t * 2) * .06 + (e.type === 'afogado' ? .25 : 0); if (e.type === 'afogado') { A[2].rx += .2; A[4].rx -= .5; A[5].rx = Math.min(A[5].rx, -.5); } break;
    case 'sapo': { const air = e.hop > 0 ? Math.sin(Math.PI * (1 - e.hop / .55)) : 0, cr = e.state === 'aim' ? sm(0, .5, e.st) : 0; A[1].sy = 1 - .15 * cr + .12 * air + .04 * Math.sin(t * 3); A[1].sx = A[1].sz = 1 / Math.sqrt(A[1].sy); A[1].rx = -.25 * air + .12 * cr; A[2].rx = e.state === 'tongue' ? .6 : .05 + .08 * Math.max(0, Math.sin(t * 1.7)); A[3].rx = A[5].rx = -1.1 * air + .3 * cr; A[4].rx = A[6].rx = .5 * air - .2 * cr; break; }
    case 'javali': { const w = e.walkPh || 0, mv = e.state === 'trot' || e.state === 'charge' || e.moveAmt ? 1 : 0, ph = [0, Math.PI, Math.PI, 0], sp = e.state === 'charge' ? 1.3 : 1; for (let i = 0; i < 4; i++) A[3 + i].rx = Math.sin(w * sp + ph[i]) * .65 * mv; A[1].ty = Math.abs(Math.sin(w * sp)) * .05 * mv; A[2].ry = Math.sin(t * 1.3) * .1; if (e.state === 'aim') { A[2].rx = .35; A[1].rz = Math.sin(t * 40) * .04; A[5].rx = A[6].rx = -.35; } if (e.state === 'charge') A[2].rx = .25; if (!e.aggro && !e.moveAmt) A[2].rx = .3 + .1 * Math.sin(t * 3); break; }
    case 'lobo': { const w = e.walkPh || 0, mv = (e.aggro && e.state === 'circle') || e.moveAmt ? 1 : 0, ph = [0, Math.PI, Math.PI, 0]; for (let i = 0; i < 4; i++) A[4 + i].rx = Math.sin(w + ph[i]) * .7 * mv; A[3].ry = Math.sin(t * 6) * .4 * (mv ? 1 : .4); A[3].rx = mv ? -.2 : .2; if (e.state === 'crouch') { A[1].ty = -.12; A[1].rx = .15; A[2].rx = .2; } if (e.state === 'lunge') { A[4].rx = A[5].rx = -1; A[6].rx = A[7].rx = .9; A[2].rx = -.2; } if (!e.aggro && !e.moveAmt) { A[2].rx = -.35 * Math.max(0, Math.sin(t * .4)); } break; }
    case 'urso': { const w = e.walkPh || 0, mv = e.moveAmt || 0; A[5].rx = Math.sin(w) * .5 * mv; A[6].rx = -Math.sin(w) * .5 * mv; A[3].rx = -Math.sin(w) * .45 * mv; A[4].rx = Math.sin(w) * .45 * mv; A[1].rz = Math.sin(w) * .05 * mv; A[1].ty = Math.abs(Math.cos(w)) * .06 * mv;
      if (e.state === 'roar') { const k = Math.sin(clamp(e.st / .9, 0, 1) * Math.PI); A[1].rx = -.5 * k; A[1].ty += .4 * k; A[3].rx = A[4].rx = -1.6 * k; A[3].rz = .5 * k; A[4].rz = -.5 * k; A[2].rx = -.4 * k; }
      if (e.state === 'swipe') { const up = sm(0, .5, e.st) * (1 - sm(.55, .65, e.st)), dn = sm(.55, .65, e.st) * (1 - sm(.8, 1, e.st)); A[3].rx = -2.2 * up + .6 * dn; A[3].ry = -.4 * up + .6 * dn; A[1].ry = .25 * up - .35 * dn; }
      if (e.state === 'slam') { const up = sm(0, .8, e.st) * (1 - sm(.88, .98, e.st)); A[1].rx = -.7 * up; A[1].ty += .6 * up; A[3].rx = A[4].rx = -2.4 * up + .4 * sm(.88, 1, e.st); }
      break; }
    case 'sentinela': A[1].ry = t * .6; A[2].ry = -t * (e.shieldT > 0 ? 7 : 1.2); A[2].rx = .25 * Math.sin(t * 1.3); A[2].rz = .2 * Math.cos(t * .9); if (e.state === 'aim') A[1].sy = A[1].sx = A[1].sz = 1 + .06 * Math.sin(t * 40); break;
    case 'fantasma': { A[1].rz = Math.sin(t * 1.3) * .06; A[1].rx = .08; A[2].rx = Math.sin(t * .9) * .1; const w = e.state === 'wind' ? sm(0, .4, e.st) : 0, sl = e.state === 'strike' ? 1 - sm(0, .4, e.st) : 0; A[3].rx = A[4].rx = -.3 - 1.9 * w + 1.0 * sl; A[3].rz = .2 + .5 * w; A[4].rz = -.2 - .5 * w; A[1].tz = .3 * sl; break; }
    case 'bat': A[1].ty = Math.sin(t * 9) * .06; A[2].rz = Math.sin(t * 18) * .75; A[3].rz = -Math.sin(t * 18) * .75; break;
    case 'aranha': A[1].ty = Math.abs(Math.sin(e.t * 20)) * .05; A[1].rz = Math.sin(e.t * 20) * .05; break;
    case 'thief':
    case 'imp': { A[5].rz = .2 + Math.sin(t * 12) * .5; A[6].rz = -.2 - Math.sin(t * 12) * .5; A[7].ry = Math.sin(t * 2) * .4; const th = e.act === 'throw' ? Math.sin(clamp(e.actT / .4, 0, 1) * Math.PI) : 0; A[4].rx = -2.2 * th; A[3].rx = -.3; A[2].rx = Math.sin(t * 3) * .08; break; }
    case 'beetle': { const w = e.walkPh; for (let i = 3; i < A.length; i++) A[i].rx = Math.sin(w + i * 1.7) * .3; if (e.state === 'aim') A[1].rz = Math.sin(t * 45) * .05; if (e.state === 'stun') A[1].rz = Math.sin(t * 8) * .12; break; }
  }
  const hk = e.hitT > 0 ? e.hitT / .18 : 0;
  if (hk > 0) { A[1].rx -= .4 * hk; A[1].sy *= 1 - .14 * hk; A[1].sx *= 1 + .12 * hk; A[1].sz *= 1 + .12 * hk; }
}
function poseBoss(b, t) {
  const A = b.anim; resetAnim(A);
  const a = b.act, at = b.actT;
  if (b.type === 'golem') {
    const m = b.moveAmt || 0, w = b.walkPh || 0, br = Math.sin(t * 1.5);
    A[6].rx = Math.sin(w) * .4 * m; A[7].rx = -Math.sin(w) * .4 * m; A[1].ty = br * .03 + Math.abs(Math.cos(w)) * .08 * m; A[1].rz = Math.sin(w) * .05 * m;
    A[4].rx = -Math.sin(w) * .3 * m; A[5].rx = Math.sin(w) * .3 * m; A[4].rz = .1; A[5].rz = -.1; A[3].ry = Math.sin(t * .7) * .15;
    if (a === 'slam') { const up = sm(0, .85, at) * (1 - sm(.9, 1.02, at)), dn = sm(.9, 1.02, at) * (1 - sm(1.4, 1.8, at)); A[4].rx = A[5].rx = -2.7 * up - .9 * dn; A[2].rx = -.25 * up + .45 * dn; A[4].rz = .1 + .35 * up; A[5].rz = -.1 - .35 * up; }
    if (a === 'stomp') { const up = sm(0, .55, at) * (1 - sm(.6, .7, at)); A[6].rx = -.9 * up; A[1].ty += .25 * up; A[2].rx = -.15 * up; }
    if (a === 'throw') { const k = sm(0, .55, at) * (1 - sm(.6, .75, at)); A[5].rx = -2.6 * k; A[2].ry = .4 * k - .5 * sm(.6, .75, at) * (1 - sm(1, 1.5, at)); }
    if (a === 'summon' || a === 'roar') { const k = sm(0, .4, at) * (1 - sm(1.2, 1.6, at)); A[4].rx = A[5].rx = -1.2 * k; A[4].rz = 1.0 * k; A[5].rz = -1.0 * k; A[3].rx = -.4 * k; A[2].rx = -.2 * k; }
  } else if (b.type === 'skull') {
    const B = b.model;
    A[1].ty = .15 * Math.sin(t * 1.2) + b.lift; A[1].rx = .05 * Math.sin(t * .9); A[1].rz = .04 * Math.sin(t * .7);
    let jaw = .04 + (Math.sin(t * .8) > .85 ? .12 * Math.abs(Math.sin(t * 14)) : 0);
    if (a === 'breath') jaw = lerp(jaw, .72, sm(.5, .8, at) * (1 - sm(2.6, 2.9, at)));
    if (a === 'orbs') jaw = lerp(jaw, .5, sm(0, .3, at) * (1 - sm(1.6, 2, at)));
    if (a === 'roar' || a === 'summon') { const k = sm(0, .3, at) * (1 - sm(1.3, 1.6, at)); jaw = lerp(jaw, .8, k); A[1].rz += k * Math.sin(t * 34) * .05; A[1].rx -= .2 * k; }
    A[2].rx = jaw;
    B.hands.forEach((H, j) => {
      const h = A[H.hb], ph = j * 2.1, sx = H.sx, hs = b.hand[j];
      let ox = .1 * Math.sin(t * .9 + ph), oy = .22 * Math.sin(t * 1.1 + 1 + ph), oz = .1 * Math.sin(t * .7 + ph), curl = .35 + .2 * Math.sin(t * 1.6 + ph), rx = 0;
      if (hs && hs.k > 0) { ox = lerp(ox, hs.lx - H.W[0], hs.k); oz = lerp(oz, hs.lz - H.W[2] - .5, hs.k); oy = lerp(oy, hs.ly - H.W[1], hs.k); curl = lerp(curl, -.2, hs.k); rx = .15 * hs.k; }
      h.tx = ox; h.ty = oy; h.tz = oz; h.rx = rx; h.rz = sx * .1 * Math.sin(t * 1.1 + 1 + ph);
      H.fingers.forEach((F, i) => { A[F.b].rx = curl + .12 * Math.sin(t * 1.6 + i * .6 + ph); });
      A[H.tb].ry = sx * (-.2 + .15 * Math.sin(t * 1.3 + ph));
    });
    B.vert.forEach((v, k) => { A[v.b].rx = .07 * Math.sin(t * 1.3 - k * .5); A[v.b].rz = .06 * Math.sin(t * .9 - k * .6); });
  } else if (b.type === 'spider') {
    const m = b.moveAmt || 0, w = b.walkPh || 0, a2 = b.act, t2 = b.actT;
    A[1].ty = Math.sin(t * 2) * .04 + Math.abs(Math.sin(w * 2)) * .06 * m; A[2].rx = Math.sin(t * 1.5) * .06; A[2].ry = Math.sin(t * .9) * .08; A[3].rx = Math.sin(t * 3) * .04;
    for (let i = 0; i < 8; i++) { const side = i < 4 ? 1 : -1, ph = w + (i % 4) * Math.PI / 2 + (side > 0 ? 0 : Math.PI); A[4 + i].rx = Math.sin(ph) * .3 * m; A[4 + i].rz = side * Math.max(0, Math.cos(ph)) * .25 * m; }
    if (a2 === 'leap') { const cr = sm(0, .35, t2) * (1 - sm(.35, .45, t2)), air = sm(.4, .6, t2) * (1 - sm(.9, 1.05, t2)); A[1].ty -= .4 * cr; for (let i = 0; i < 8; i++) A[4 + i].rz = (i < 4 ? 1 : -1) * (.3 * cr - .45 * air); }
    if (a2 === 'web') A[2].rx = -.6 * sm(0, .4, t2) * (1 - sm(.6, 1, t2));
    if (a2 === 'brood' || a2 === 'roar') { A[1].ty += .12 * Math.sin(t2 * 20); A[3].rx = -.3; }
  } else if (b.type === 'knight') {
    const e2 = { moveAmt: b.moveAmt, walkPh: b.walkPh, cls: 'lamina', act: null, actT: 0, combo: 0 }, a2 = b.act, t2 = b.actT;
    if (a2 === 'sweep') { e2.act = 'swing'; e2.actT = t2 < .7 ? .06 : (t2 - .7) * .6; }
    else if (a2 === 'charge') { e2.act = t2 < .85 ? 'hurt' : 'dash'; e2.actT = t2 < .85 ? .27 : .05; }
    else if (a2 === 'spikes') { e2.act = 'swing'; e2.combo = 2; e2.actT = t2 < .6 ? .06 : Math.min(.3, (t2 - .6) * .8); }
    else if (a2 === 'whirl') { e2.act = 'spin'; e2.actT = (t2 * 1.6) % .5; }
    else if (a2 === 'roar') e2.act = 'wave';
    poseHuman(A, e2, t);
  } else if (b.type === 'hydra') {
    const HS = b.model.heads, a2 = b.act, t2 = b.actT;
    A[1].ty = Math.sin(t * 1.4) * .06; A[1].sy = 1 + Math.sin(t * 1.4) * .02; A[2].ry = Math.sin(t * 1.1) * .35;
    HS.forEach((h, k) => {
      const ph = k * 2.1; let rx = Math.sin(t * 1.3 + ph) * .12, ry = Math.sin(t * .8 + ph) * .15, rz = 0, tz = 0, jaw = .08 + .08 * Math.max(0, Math.sin(t * 2 + ph));
      if (a2 === 'bite' && b['bT' + k] !== undefined) { const lt = t2 - b['bT' + k], wind = sm(0, .5, lt) * (1 - sm(.6, .7, lt)), lunge = sm(.6, .72, lt) * (1 - sm(.85, 1.2, lt)); rx += -.45 * wind + .85 * lunge; tz += 1.6 * lunge; jaw = lerp(jaw, .7, Math.max(wind, lunge)); ry += clamp(angDiff(b.yaw + h.ang, b['bA' + k] || 0), -.8, .8) * Math.max(wind, lunge); }
      if (a2 === 'spit' && b.spitHead === k) { const k2 = Math.sin(clamp((t2 - b.spitT) / .35, 0, 1) * Math.PI); rx -= .4 * k2; jaw = lerp(jaw, .6, k2); }
      if (a2 === 'breath' && k === 1) { const up = sm(0, .6, t2) * (1 - sm(.8, 1.0, t2)), br = sm(.9, 1.1, t2) * (1 - sm(2.6, 3, t2)); rx += -.5 * up + .35 * br; jaw = lerp(jaw, .8, Math.max(up, br)); ry += (b.sweep || 0) * .6 * br; }
      if (a2 === 'roar' || a2 === 'summon') { const k3 = sm(0, .4, t2) * (1 - sm(1.5, 2, t2)); rx -= .6 * k3; jaw = lerp(jaw, .9, k3); rz = Math.sin(t * 30 + k) * .05 * k3; ry += (k - 1) * .4 * k3; }
      if (a2 === 'dive') { const k4 = sm(0, .6, t2) * (1 - sm(1.9, 2.4, t2)); rx += .8 * k4; }
      A[h.nb].rx = rx; A[h.nb].ry = ry; A[h.nb].rz = rz; A[h.nb].tz = tz; A[h.hb].rx = -rx * .5 + .1 * Math.sin(t * 1.7 + ph); A[h.jb].rx = jaw;
    });
    if (a2 === 'dive') A[1].ty -= 1.4 * sm(0, .7, t2) * (1 - sm(1.9, 2.3, t2));
  } else if (b.type === 'reflexo') {
    const cls = G.char.cls, a2 = b.act, t2 = b.actT, e2 = { moveAmt: b.moveAmt, walkPh: b.walkPh, cls, act: null, actT: 0, combo: 0, stance: cls === 'lamina' ? 0 : .6, lean: 0 };
    if (a2 === 'slash') { e2.act = 'swing'; e2.combo = b.combo || 0; const lt = t2 - (b.cT || 0); e2.actT = lt < .3 ? .05 : Math.min(.3, (lt - .3) * .8); }
    else if (a2 === 'spin') { e2.act = 'spin'; e2.actT = (t2 * 1.6) % .5; }
    else if (a2 === 'dash') { e2.act = t2 < .7 ? 'hurt' : 'dash'; e2.actT = t2 < .7 ? .27 : .05; }
    else if (a2 === 'roll') { e2.act = t2 < .4 ? 'dash' : 'shoot'; e2.stance = t2 < .4 ? 0 : 1; e2.actT = ((t2 - .5) % .2 + .2) % .2; }
    else if (a2 === 'bolts' || a2 === 'rain') { e2.stance = 1; e2.act = 'cast'; e2.actT = (t2 % .5) * .52; }
    else if (a2 === 'volley') { e2.stance = 1; e2.act = 'shoot'; e2.actT = (t2 % .5) * .44; }
    else if (a2 === 'nova') { e2.act = 'nova'; e2.actT = Math.min(.45, t2 * .55); }
    else if (a2 === 'mirror' || a2 === 'roar') e2.act = 'nova', e2.actT = .22 + .05 * Math.sin(t * 8);
    poseHuman(A, e2, t);
  } else if (b.type === 'eye') {
    A[1].ty = Math.sin(t * 1.3) * .25;
    const lp = P ? toLocal(b, P.x, P.z) : [0, 1];
    A[2].ry = clamp(Math.atan2(lp[0], lp[1]), -.5, .5); A[2].rx = .12 * Math.sin(t * .7);
    for (let k = 3; k <= 6; k++) { A[k].ry = t * .8; A[k].ty = Math.sin(t * 2 + k) * .2; }
    for (let k = 7; k <= 12; k++) { A[k].rx = Math.sin(t * 1.5 + k) * .25; A[k].rz = Math.cos(t * 1.2 + k) * .25; }
    if (b.act === 'roar') { const sq = 1 + .06 * Math.sin(t * 30); A[1].sx = A[1].sy = A[1].sz = sq; }
    if (b.act === 'beam') { const k2 = sm(0, .8, b.actT) * (1 - sm(2.8, 3, b.actT)); A[1].sx = A[1].sz = 1 + .08 * k2; }
  } else {
    const m = b.moveAmt || 0, w = b.walkPh || 0, breathe = Math.sin(t * 2);
    let up = 0, br = 0, roar = 0, flap = 0, tail = 0, stomp = 0;
    if (a === 'breath') { up = sm(0, .6, at) * (1 - sm(.8, 1.1, at)); br = sm(.8, 1.0, at) * (1 - sm(2.5, 2.9, at)); }
    if (a === 'rain' || a === 'roar') roar = sm(0, .35, at) * (1 - sm(1.6, 2.1, at));
    if (a === 'gust') flap = sm(0, .3, at) * (1 - sm(1.8, 2.2, at));
    if (a === 'tail') tail = sm(0, .3, at) * (1 - sm(1.0, 1.5, at));
    if (a === 'stomp') stomp = sm(0, .45, at) * (1 - sm(.55, .7, at));
    const sweep = br * b.sweep;
    A[1].ty = breathe * .04 + .28 * up + .05 * roar + .3 * stomp; A[1].rx = breathe * .015 - .22 * up + .05 * br - .1 * roar - .2 * stomp;
    A[1].ry = tail * Math.sin(clamp(at / 1.2, 0, 1) * Math.PI * 2) * .9;
    for (let i = 0; i < 4; i++) { A[2 + i].rx = Math.sin(t * 1.3 - i * .4) * .04 - .17 * up + .13 * br - .12 * roar; A[2 + i].ry = Math.sin(t * .7 - i * .5) * .06 * (1 - br) + sweep * .1; }
    A[6].rx = Math.sin(t * 1.3 - 2) * .05 - .3 * up + .12 * br - .45 * roar; A[6].ry = Math.sin(t * .7 - 2.5) * .1 * (1 - br) + sweep * .3; A[6].rz = roar * Math.sin(t * 30) * .04;
    A[7].rx = .04 + Math.pow(Math.max(0, Math.sin(t * .9)), 10) * .22 * (1 - up) + .45 * up + .62 * br + .8 * roar;
    const tailAmp = .16 + .12 * (up + br + roar) + .5 * tail;
    for (let i = 0; i < 6; i++) { A[8 + i].ry = Math.sin(t * 1.6 - i * .55) * tailAmp + tail * .25 * Math.sin(clamp(at / 1.2, 0, 1) * Math.PI * 2 - i * .3); A[8 + i].rx = Math.sin(t * 1.1 - i * .5) * .04 + .05 * up; }
    const fast = Math.max(up, roar, flap);
    const w1 = lerp(lerp(.14 + .1 * Math.sin(t * 2.6), .25 + .55 * Math.sin(t * (flap > 0 ? 9 : 7.5)), fast), .55 + .08 * Math.sin(t * 5), br);
    const w2 = lerp(lerp(.08 * Math.sin(t * 2.6 - .7), .4 * Math.sin(t * 7.5 - .8), fast), .25, br);
    A[14].rz = w1; A[15].rz = w2; A[16].rz = -w1; A[17].rz = -w2; A[14].ry = -.08 * (1 - fast); A[16].ry = .08 * (1 - fast);
    A[18].rx = Math.sin(w) * .35 * m - .45 * up - .6 * stomp; A[19].rx = -Math.sin(w) * .35 * m - .45 * up; A[20].rx = -Math.sin(w) * .35 * m; A[21].rx = Math.sin(w) * .35 * m;
    A[18].ty = A[19].ty = .28 * up; A[18].ty += .3 * stomp;
  }
}

