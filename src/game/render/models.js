/* Fios de Tessária · Modelos procedurais (heróis, monstros, chefes) */
/* =========================================================
   MODELOS
   ========================================================= */
const MODELS = {};
function makeModel(key, fn) {
  if (MODELS[key]) return MODELS[key];
  const r = fn(), v = makeVAO(r.data);
  return (MODELS[key] = Object.assign(r, { vao: v.vao, buf: v.buf, count: v.count, data: null }));
}
const newAnim = m => m.bones.map(() => ({ rx: 0, ry: 0, rz: 0, tx: 0, ty: 0, tz: 0, sx: 1, sy: 1, sz: 1 }));
function resetAnim(A) { for (const a of A) { a.rx = a.ry = a.rz = a.tx = a.ty = a.tz = 0; a.sx = a.sy = a.sz = 1; } }

/* ---- humanoide (herói e moradores) ---- */
function humBones(bw) { return [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, .92, 0] }, { p: 1, v: [0, 1.0, 0] }, { p: 2, v: [0, 1.5, 0] }, { p: 2, v: [.3 * bw, 1.42, 0] }, { p: 2, v: [-.3 * bw, 1.42, 0] }, { p: 1, v: [.13, .9, 0] }, { p: 1, v: [-.13, .9, 0] }, { p: 5, v: [-.38 * bw, .85, .06] }, { p: 4, v: [.38 * bw, .85, .06] }]; }
function buildHumanoid(c, base) {
  let rm = null; if (base) { rm = {}; for (let i = 0; i < 8; i++) rm[i] = base + i; rm[125] = base + 4; rm[126] = base + 6; rm[127] = base + 7; }
  const S = new SplatSet(c.seed || 7, 1500, rm);   // densidade alta: rosto, cabelo e cosméticos bem definidos
  const bw = [.86, 1, 1.18][c.body ?? 1];
  const bones = humBones(bw);
  if (c.cape) bones.push({ p: 2, v: [0, 1.3, -.2] }, { p: 10, v: [0, .86, -.29] });   // capa em dois gomos: balança e esvoaça (poseHuman)
  const robe = c.cls === 'arcano';
  for (const sx of [1, -1]) {
    const b = sx > 0 ? 6 : 7;
    S.tube([[sx * .13, .92, 0, .12, b], [sx * .14, .5, .02, .1, b], [sx * .14, .17, 0, .09, b]], 3, { sub: 3 });
    S.ell([sx * .14, .09, .05], [.11, .09, .17], 5, b);
    if (!robe) { S.tube([[sx * .14, .34, .01, .104, b], [sx * .14, .14, .0, .1, b]], 5, { sub: 1, noSolid: true });   // cano da bota
      const r = []; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; r.push([sx * .14 + Math.cos(a) * .108, .35, .01 + Math.sin(a) * .108, .025, b]); } S.tube(r, 5, { closed: true, sub: 2, noSolid: true }); }   // dobra
    S.ell([sx * .14, .015, .06], [.115, .02, .18], 5, b, { noCheck: true, noSolid: true });   // sola
  }
  if (robe) S.tube([[0, 1.02, 0, .27 * bw, 1], [0, .6, 0, .32 * bw, 1], [0, .26, 0, .37 * bw, 1]], 2, { sub: 3, sy: .85, noSolid: true });
  S.ell([0, .97, 0], [.22 * bw, .14, .16], 3, 1);
  S.ell([0, 1.2, 0], [.27 * bw, .3, .19], (p, n) => (Math.abs(p[0]) < .045 && n[2] > .4) ? 3 : 2, 2);
  const belt = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; belt.push([Math.cos(a) * .235 * bw, 1.0, Math.sin(a) * .175, .035, 1]); }
  S.tube(belt, 5, { closed: true, sub: 2, noSolid: true });
  S.ell([0, 1.0, .18], [.05, .04, .02], 3, 1, { noSolid: true, noCheck: true, min: 8 });
  for (const y of [1.13, 1.25, 1.37]) S.ell([0, y, .193 - (y - 1.2) * .05], .022, 4, 2, { noSolid: true, min: 6 });   // botões (a armadura cobre)
  S.box([-.2 * bw, .93, .12], [.045, .055, .035], 5, 1, { noSolid: true });   // bolsinha do cinto
  if (c.acc !== 'cachecol') { const r = []; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; r.push([Math.cos(a) * .12, 1.47 + (Math.sin(a) > 0 ? -.03 * Math.sin(a) : 0), Math.sin(a) * .11, .026, 2]); } S.tube(r, 3, { closed: true, sub: 2, noSolid: true }); }   // gola
  for (const sx of [1, -1]) {
    const b = sx > 0 ? 4 : 5;
    S.ell([sx * .27 * bw, 1.4, 0], .11, 2, 2);
    S.tube([[sx * .3 * bw, 1.42, 0, .085, b], [sx * .35 * bw, 1.13, .02, .075, b], [sx * .37 * bw, .91, .05, .065, b]], 2, { sub: 3 });
    S.ell([sx * .38 * bw, .85, .06], .07, 0, b);
    { const r = []; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; r.push([sx * .368 * bw + Math.cos(a) * .072, .95, .045 + Math.sin(a) * .072, .022, b]); } S.tube(r, 3, { closed: true, sub: 2, noSolid: true }); }   // punho da manga
  }
  S.tube([[0, 1.42, 0, .08, 3], [0, 1.56, 0, .08, 3]], 0, { sub: 1, noSolid: true });
  S.ell([0, 1.72, 0], [.25, .26, .24], 0, 3);
  for (const sx of [1, -1]) {
    S.ell([sx * .09, 1.72, .222], [.05, .056, .022], 4, 3, { noSolid: true, noCheck: true, min: 14 });   // branco do olho
    S.ell([sx * .086, 1.716, .236], [.033, .041, .014], 6, 3, { noSolid: true, noCheck: true, min: 10 });   // íris brilhante (cor do brilho)
    S.ell([sx * .085, 1.715, .247], [.013, .018, .008], 5, 3, { noSolid: true, noCheck: true, min: 5 });   // pupila
    S.ell([sx * .25, 1.71, 0], [.045, .065, .05], 0, 3, { noSolid: true });
  }
  S.ell([0, 1.66, .24], .03, 0, 3, { noSolid: true, noCheck: true, min: 6 });
  for (const sx of [1, -1]) S.tube([[sx * .045, 1.785, .232, .014, 3], [sx * .095, 1.795, .226, .016, 3], [sx * .14, 1.78, .205, .011, 3]], 1, { sub: 2, noSolid: true, minSeg: 5 });   // sobrancelhas
  S.tube([[-.045, 1.612, .226, .009, 3], [0, 1.606, .232, .01, 3], [.045, 1.612, .226, .009, 3]], 5, { sub: 2, noSolid: true, minSeg: 4 });   // boca
  const cap = () => { S.ell([0, 1.77, -.02], [.275, .25, .27], 1, 3, { noCheck: true, noSolid: true, keep: d => d[1] > -.1 && !(d[2] > .5 && d[1] < .5) });
    for (let i = 0; i < 5; i++) { const x = (i - 2) * .075, z = .2 - Math.abs(x) * .35; S.tube([[x * .9, 1.97, z - .04, .045, 3], [x * 1.05 + .02, 1.89, z + .03, .03, 3], [x * 1.1 + .035, 1.83, z + .05, .01, 3]], 1, { sub: 2, noSolid: true, minSeg: 6 }); }   // franja
    for (let i = 0; i < 7; i++) { const a = (i / 6 - .5) * 2.6; S.tube([[Math.sin(a) * .1, 2.0, -Math.cos(a) * .1 - .02, .03, 3], [Math.sin(a) * .21, 1.93, -Math.cos(a) * .2 - .02, .03, 3], [Math.sin(a) * .27, 1.8, -Math.cos(a) * .27 - .02, .015, 3]], 1, { sub: 2, noSolid: true, minSeg: 6 }); }   // volume em mechas
  };
  switch (c.hair) {
    case 'curto': cap(); for (const sx of [1, -1]) S.ell([sx * .22, 1.66, -.05], [.07, .12, .12], 1, 3, { noCheck: true }); break;
    case 'longo': cap(); S.tube([[0, 1.75, -.15, .24, 3], [0, 1.45, -.2, .22, 3], [0, 1.15, -.18, .17, 3]], 1, { sx: 1.15, sy: .55, noSolid: true });
      for (const sx of [1, -1]) S.tube([[sx * .22, 1.72, .02, .07, 3], [sx * .24, 1.38, .05, .05, 3]], 1, { sub: 2, noSolid: true }); break;
    case 'rabo': cap(); S.tube([[0, 1.86, -.22, .09, 3], [0, 1.78, -.38, .1, 3], [0, 1.5, -.42, .08, 3], [0, 1.3, -.36, .03, 3]], 1, { sub: 4, noSolid: true }); break;
    case 'coque': cap(); S.ell([0, 1.98, -.12], .12, 1, 3, { noCheck: true }); break;
    case 'moicano': for (let i = 0; i < 6; i++) { const a = -0.5 + i * .32, base2 = [0, 1.72 + .26 * Math.cos(a), .25 * Math.sin(a) * -1], dir = [0, Math.cos(a), -Math.sin(a)]; S.cone(base2, V.add(base2, V.mul(dir, .22)), .07, 1, 3); } break;
    default: break;
  }
  switch (c.beard) {
    case 'barba': S.ell([0, 1.6, .1], [.21, .15, .16], 1, 3, { noCheck: true, noSolid: true, keep: d => d[2] > -.2 && d[1] < .45 }); S.cone([0, 1.5, .2], [0, 1.36, .22], .09, 1, 3); break;
    case 'bigode': for (const sx of [1, -1]) S.tube([[sx * .015, 1.645, .245, .026, 3], [sx * .08, 1.635, .235, .022, 3], [sx * .125, 1.6, .215, .012, 3]], 1, { sub: 2, noSolid: true, minSeg: 5 }); break;
    case 'cavanhaque': S.ell([0, 1.54, .19], [.065, .075, .05], 1, 3, { noCheck: true }); S.tube([[-.05, 1.645, .24, .018, 3], [.05, 1.645, .24, .018, 3]], 1, { sub: 1, noSolid: true, minSeg: 5 }); break;
    default: break;
  }
  switch (c.acc) {
    case 'capuz': S.ell([0, 1.75, -.02], [.31, .31, .31], 2, 3, { noCheck: true, noSolid: true, keep: d => !(d[2] > .3 && d[1] < .65 && d[1] > -.75) && d[1] > -.6 }); break;
    case 'chapeu': S.ell([0, 1.93, 0], [.44, .035, .44], 2, 3, { noCheck: true }); S.tube([[0, 1.95, 0, .25, 3], [.03, 2.3, -.08, .13, 3], [.1, 2.55, -.22, .02, 3]], 2, { sub: 3, noSolid: true });
      S.tube((() => { const r = []; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; r.push([Math.cos(a) * .25, 1.99, Math.sin(a) * .25, .03, 3]); } return r; })(), 3, { closed: true, sub: 2, noSolid: true }); break;
    case 'chifres': for (const sx of [1, -1]) S.tube([[sx * .14, 1.92, .02, .05, 3], [sx * .22, 2.05, -.04, .035, 3], [sx * .25, 2.12, -.14, .008, 3]], 3, { sub: 3, noSolid: true, minSeg: 6 }); break;
    case 'coroa': { const r = []; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; r.push([Math.cos(a) * .27, 1.9, Math.sin(a) * .26, .035, 3]); S.cone([Math.cos(a) * .27, 1.9, Math.sin(a) * .26], [Math.cos(a) * .31, 2.0, Math.sin(a) * .3], .04, 3, 3); } S.tube(r, 3, { closed: true, sub: 2, noSolid: true }); } break;
    case 'cachecol': { const r = []; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; r.push([Math.cos(a) * .14, 1.48, Math.sin(a) * .13, .07, 2]); } S.tube(r, 3, { closed: true, sub: 2, noSolid: true }); S.tube([[.06, 1.46, -.12, .06, 2], [.12, 1.2, -.2, .05, 2], [.14, 1.0, -.22, .045, 2]], 3, { sub: 3, noSolid: true }); } break;
    case 'tapa': S.ell([.09, 1.72, .245], [.06, .06, .02], 5, 3, { noSolid: true, noCheck: true, min: 10 }); S.tube([[.15, 1.76, .2, .012, 3], [.25, 1.8, 0, .012, 3]], 5, { sub: 1, noSolid: true }); break;
    case 'elmo': S.ell([0, 1.78, -.01], [.3, .29, .29], 4, 3, { noCheck: true, noSolid: true, keep: d => d[1] > -.2 && !(d[2] > .55 && d[1] < .35) }); S.box([0, 1.69, .275], [.025, .09, .02], 4, 3, { faces: 'stew' }); S.tube([[0, 2.05, .12, .05, 3], [0, 2.12, -.1, .065, 3], [0, 1.98, -.34, .04, 3]], 3, { sub: 3, noSolid: true }); break;
    case 'padeiro': S.tube([[0, 1.9, 0, .23, 3], [0, 2.18, 0, .26, 3]], 3, { sub: 2, noSolid: true }); S.ell([0, 2.22, 0], [.28, .11, .28], 3, 3, { noCheck: true, keep: d => d[1] > 0 }); break;
    case 'bandana': { const r = []; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; r.push([Math.cos(a) * .265, 1.83, Math.sin(a) * .255, .045, 3]); } S.tube(r, 3, { closed: true, sub: 2, noSolid: true }); S.tube([[0, 1.83, -.26, .04, 3], [.08, 1.7, -.36, .03, 3]], 3, { sub: 1, noSolid: true }); S.tube([[0, 1.83, -.26, .04, 3], [-.06, 1.68, -.34, .03, 3]], 3, { sub: 1, noSolid: true }); } break;
    case 'pena': S.ell([0, 1.93, 0], [.44, .035, .44], 2, 3, { noCheck: true }); S.tube([[0, 1.95, 0, .25, 3], [.03, 2.25, -.06, .17, 3], [.06, 2.36, -.12, .04, 3]], 2, { sub: 3, noSolid: true }); S.tube([[.2, 2.02, -.08, .035, 3], [.36, 2.3, -.24, .045, 3], [.4, 2.5, -.46, .01, 3]], 3, { sub: 3, noSolid: true }); break;
    default: break;
  }
  if (c.cape) { S.mem([[[.27 * bw, 1.46, -.17], [-.27 * bw, 1.46, -.17], [.36 * bw, .42, -.38]], [[-.27 * bw, 1.46, -.17], [.36 * bw, .42, -.38], [-.36 * bw, .42, -.38], .08]], 3, p => p[1] > 1.3 ? 2 : p[1] > .86 ? 10 : 11, { dm: 1.3 });
    S.tube([[-.27 * bw, 1.47, -.15, .035, 2], [0, 1.5, -.19, .035, 2], [.27 * bw, 1.47, -.15, .035, 2]], 3, { sub: 3, noSolid: true });   // presilha da capa nos ombros
    for (const sx of [1, -1]) S.ell([sx * .2 * bw, 1.49, -.08], .035, 4, 2, { noSolid: true, noCheck: true, min: 8 }); }
  const ar = c.armor;
  if (ar !== undefined && ar !== null && ar >= 0) {
    const AM = ar >= 2 ? 125 : 5, RN = 126;
    S.ell([0, 1.22, .005], [.29 * bw, .315, .215], (p, n) => (ar >= 3 && Math.abs(p[0]) < .025 && n[2] > .3) ? RN : (ar < 2 && Math.abs(p[0]) < .02 && n[2] > .5 ? 3 : AM), 2, { keep: d => d[1] > -.36 });
    if (ar >= 1) for (const sx of [1, -1]) { S.ell([sx * .3 * bw, 1.46, 0], [.16, .1, .15], AM, 2, { noCheck: true }); if (ar < 2) S.box([sx * .16 * bw, .98, .17], [.06, .07, .04], 5, 1); }
    if (ar >= 2) for (const sx of [1, -1]) { const b = sx > 0 ? 4 : 5; S.ell([sx * .33 * bw, 1.4, 0], [.13, .08, .13], AM, 2, { noCheck: true }); S.tube([[sx * .355 * bw, 1.07, .03, .088, b], [sx * .37 * bw, .93, .05, .08, b]], AM, { sub: 1, noSolid: true }); }
    if (ar >= 3) {
      const r = []; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; r.push([Math.cos(a) * .15, 1.5, Math.sin(a) * .14, .045, 2]); } S.tube(r, AM, { closed: true, sub: 2, noSolid: true });
      for (const sx of [1, -1]) { const b = sx > 0 ? 6 : 7; S.tube([[sx * .14, .52, .03, .12, b], [sx * .14, .22, .02, .105, b]], AM, { sub: 1, noSolid: true }); S.ell([sx * .3 * bw, 1.53, .02], [.12, .02, .1], RN, 2, { noCheck: true, noSolid: true, min: 10 }); }
    }
    if (ar >= 4) {
      for (const sx of [1, -1]) { S.cone([sx * .33 * bw, 1.52, 0], [sx * .46 * bw, 1.74, -.04], .06, AM, 2); S.cone([sx * .26 * bw, 1.53, -.05], [sx * .32 * bw, 1.7, -.1], .045, AM, 2); S.box([sx * .15 * bw, .82, .15], [.09, .14, .03], AM, 1, { faces: 'snew' }); }
      const r = []; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; r.push([Math.cos(a) * .262, 1.86, Math.sin(a) * .25, .02, 3]); } S.tube(r, RN, { closed: true, sub: 2, noSolid: true });
    }
  }
  if (c.charm !== undefined && c.charm !== null && c.charm >= 0) {
    S.tube([[-.1, 1.47, .12, .01, 2], [0, 1.33, .22, .01, 2], [.1, 1.47, .12, .01, 2]], 3, { sub: 2, noSolid: true });
    S.ell([0, 1.3, .235], [.05, .06, .03], 127, 2, { noSolid: true, noCheck: true, min: 12 });
  }
  const Hd = [-.38 * bw, .85, .06], Hl = [.38 * bw, .85, .06];
  if (c.cls === 'lamina') {
    S.tube([[Hd[0], Hd[1] - .02, Hd[2] + .1, .05, 8], [Hd[0], Hd[1] - .28, Hd[2] + .95, .012, 8]], 4, { sx: 1.7, sy: .35, sub: 2, noSolid: true });
    S.tube([[Hd[0] - .13, Hd[1], Hd[2] + .08, .025, 8], [Hd[0] + .13, Hd[1], Hd[2] + .08, .025, 8]], 3, { sub: 1, noSolid: true });
    S.ell([Hd[0], Hd[1] + .04, Hd[2] - .05], .04, 3, 8, { noSolid: true, noCheck: true });
    for (const sx of [1, -1]) S.ell([sx * .3 * bw, 1.47, 0], [.15, .09, .14], 4, 2, { noCheck: true });
    S.ell([.44 * bw, 1.0, .1], [.04, .22, .22], 4, 4, { noSolid: true, noCheck: true });
    S.ell([.48 * bw, 1.0, .1], .05, 3, 4, { noSolid: true, noCheck: true, min: 8 });
  } else if (c.cls === 'arcano') {
    S.tube([[Hd[0], Hd[1] - .78, Hd[2], .035, 8], [Hd[0], Hd[1] + .85, Hd[2], .03, 8]], 5, { sub: 2, noSolid: true });
    S.ell([Hd[0], Hd[1] + .02, Hd[2]], [.05, .08, .05], 3, 8, { noSolid: true, noCheck: true, min: 8 });
    S.cone([Hd[0], Hd[1] + .98, Hd[2]], [Hd[0], Hd[1] + 1.24, Hd[2]], .1, 7, 8);
    S.cone([Hd[0], Hd[1] + .98, Hd[2]], [Hd[0], Hd[1] + .82, Hd[2]], .1, 7, 8);
    for (const sx of [1, -1]) S.cone([Hd[0], Hd[1] + .85, Hd[2]], [Hd[0] + sx * .1, Hd[1] + 1.05, Hd[2]], .025, 3, 8);
  } else if (c.cls === 'arco') {
    S.tube([[Hl[0] + .02, Hl[1] - .6, Hl[2] - .13, .022, 9], [Hl[0] + .02, Hl[1] - .3, Hl[2] - .01, .03, 9], [Hl[0] + .02, Hl[1], Hl[2] + .05, .034, 9], [Hl[0] + .02, Hl[1] + .3, Hl[2] - .01, .03, 9], [Hl[0] + .02, Hl[1] + .6, Hl[2] - .13, .022, 9]], 5, { sub: 3, noSolid: true });
    S.tube([[Hl[0] + .02, Hl[1] - .58, Hl[2] - .14, .008, 9], [Hl[0] + .02, Hl[1] + .58, Hl[2] - .14, .008, 9]], 3, { sub: 1, noSolid: true });
    S.ell([Hl[0] + .02, Hl[1], Hl[2] + .04], [.045, .07, .045], 3, 9, { noSolid: true, noCheck: true, min: 8 });
    S.tube([[.13, 1.55, -.22, .075, 2], [.06, 1.0, -.24, .07, 2]], 5, { sub: 1, noSolid: true });
    for (let i = 0; i < 3; i++) S.cone([.1 + i * .03, 1.55, -.22], [.12 + i * .03, 1.72, -.24], .035, 3, 2);
  }
  if (c.gear === 'martelo') {
    S.tube([[Hd[0], Hd[1] - .05, Hd[2] + .05, .03, 8], [Hd[0], Hd[1] - .2, Hd[2] + .6, .03, 8]], 5, { sub: 1, noSolid: true });
    S.box([Hd[0], Hd[1] - .22, Hd[2] + .64], [.16, .09, .09], 4, 8);
  }
  if (c.apron) S.box([0, .95, .2], [.21 * bw, .36, .02], 5, 1, { faces: 's', dm: 1.5 });
  if (c.gear === 'vara') S.tube([[Hd[0], Hd[1] - .1, Hd[2] - .05, .025, 8], [Hd[0], Hd[1] + .55, Hd[2] + .9, .014, 8], [Hd[0], Hd[1] + .75, Hd[2] + 1.7, .008, 8]], 5, { sub: 3, noSolid: true, minSeg: 4 });
  if (c.gear === 'bengala') { S.tube([[Hd[0], Hd[1] + .05, Hd[2] + .08, .03, 8], [Hd[0], Hd[1] - .82, Hd[2] + .15, .025, 8]], 5, { sub: 1, noSolid: true }); S.ell([Hd[0], Hd[1] + .07, Hd[2] + .05], .045, 5, 8, { noSolid: true, noCheck: true }); }
  if (c.gear === 'alaude') { S.ell([.06, 1.1, .25], [.17, .2, .07], 5, 2, { noCheck: true }); S.tube([[.0, 1.26, .27, .03, 2], [-.3, 1.52, .27, .025, 2]], 5, { sub: 1, noSolid: true }); S.ell([.06, 1.12, .31], .045, 3, 2, { noSolid: true, noCheck: true, min: 8 }); }
  return { bones, data: S.build() };
}

/* ---- inimigos ---- */
function buildGosmo() {
  const S = new SplatSet(41, 650), bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, 0, 0] }];
  S.ell([0, .42, 0], [.55, .42, .55], (p, n) => n[1] < -.35 ? 17 : 16, 1);
  for (const sx of [1, -1]) S.ell([sx * .17, .56, .47], [.07, .09, .05], 20, 1, { noSolid: true, noCheck: true, min: 12 });
  S.ell([0, .38, .53], [.12, .03, .03], 29, 1, { noSolid: true, noCheck: true, min: 8 });
  S.cone([0, .8, 0], [.06, 1.05, -.04], .05, 10, 1);
  S.ell([.13, 1.03, -.04], [.11, .025, .06], 10, 1, { noSolid: true, noCheck: true });
  return { bones, data: S.build() };
}
function buildWisp() {
  const S = new SplatSet(42, 700), bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, 1.2, 0] }];
  S.ell([0, 1.2, 0], .24, 21, 1, { em: 1, noSolid: true });
  S.ell([0, 1.2, 0], .42, 18, 1, { dm: .22, noSolid: true, noCheck: true, size: .8 });
  for (const sx of [1, -1]) S.ell([sx * .08, 1.25, .225], [.035, .05, .02], 29, 1, { noSolid: true, noCheck: true, min: 8 });
  for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; S.cone([Math.cos(a) * .2, 1.35, Math.sin(a) * .2], [Math.cos(a) * .32, 1.72, Math.sin(a) * .32], .06, 18, 1); }
  return { bones, data: S.build() };
}
function buildSkeleton() {
  const S = new SplatSet(51, 900), bw = .8, bones = humBones(bw);
  for (const sx of [1, -1]) {
    const b = sx > 0 ? 6 : 7;
    S.tube([[sx * .13, .9, 0, .05, b], [sx * .14, .5, .03, .045, b], [sx * .14, .12, 0, .04, b]], 16, { sub: 2, noSolid: true });
    S.ell([sx * .14, .5, .03], .06, 16, b, { noSolid: true });
    S.ell([sx * .14, .06, .06], [.06, .05, .13], 16, b);
    const a = sx > 0 ? 4 : 5;
    S.tube([[sx * .26, 1.42, 0, .04, a], [sx * .3, 1.13, .02, .035, a], [sx * .32, .9, .05, .03, a]], 16, { sub: 2, noSolid: true });
    S.ell([sx * .32, .86, .06], .055, 16, a, { noSolid: true });
    S.ell([sx * .22, 1.42, 0], .07, 17, 2, { noSolid: true });
  }
  S.ell([0, .95, 0], [.18, .1, .11], 16, 1);
  S.tube([[0, .95, -.03, .04, 2], [0, 1.45, -.03, .04, 2]], 17, { sub: 2, noSolid: true });
  for (let k = 0; k < 3; k++) { const y = 1.34 - k * .11, r = []; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; r.push([Math.cos(a) * (.2 - k * .02), y, Math.sin(a) * (.15 - k * .01), .025, 2]); } S.tube(r, 16, { closed: true, sub: 2, noSolid: true }); }
  const SO = [{ c: [.075, 1.68, .2], r: .07 }, { c: [-.075, 1.68, .2], r: .07 }];
  S.ell([0, 1.68, .02], [.2, .2, .22], 16, 3, { cut: SO });
  for (const sx of [1, -1]) {
    S.ell([sx * .075, 1.68, .15], .06, 29, 3, { inward: true, noCheck: true, keep: d => d[2] < .3 });
    S.ell([sx * .075, 1.68, .14], .025, 20, 3, { noSolid: true, noCheck: true, min: 6 });
  }
  S.ell([0, 1.53, .07], [.13, .05, .12], 16, 3);
  const Hd = [-.32, .86, .06];
  S.tube([[Hd[0], Hd[1] + .02, Hd[2] + .1, .045, 8], [Hd[0], Hd[1] - .22, Hd[2] + .85, .015, 8]], 11, { sx: 1.5, sy: .35, sub: 2, noSolid: true });
  S.tube([[Hd[0] - .1, Hd[1] + .03, Hd[2] + .08, .02, 8], [Hd[0] + .1, Hd[1] + .03, Hd[2] + .08, .02, 8]], 12, { sub: 1, noSolid: true });
  return { bones, data: S.build() };
}
function buildBat() {
  const S = new SplatSet(52, 800);
  const bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, 1.5, 0] }, { p: 1, v: [.15, 1.55, 0] }, { p: 1, v: [-.15, 1.55, 0] }];
  S.ell([0, 1.5, 0], [.18, .2, .22], 18, 1);
  S.ell([0, 1.62, .16], [.14, .13, .13], 18, 1);
  for (const sx of [1, -1]) {
    S.cone([sx * .07, 1.72, .14], [sx * .12, 1.88, .1], .05, 18, 1);
    S.ell([sx * .06, 1.65, .27], [.03, .03, .02], 20, 1, { noSolid: true, noCheck: true, min: 8 });
    S.cone([sx * .03, 1.56, .26], [sx * .03, 1.49, .27], .015, 28, 1, { minSeg: 6 });
    const b = sx > 0 ? 2 : 3, base = [sx * .15, 1.55, 0], t0 = [sx * .78, 1.72, -.1], t1 = [sx * .88, 1.45, -.25], t2 = [sx * .5, 1.3, -.3];
    S.mem([[base, t0, t1, .15], [base, t1, t2, .15]], 19, () => b);
    for (const tt of [t0, t1, t2]) S.tube([[...base, .03, b], [...tt, .01, b]], 18, { sub: 1, noSolid: true });
  }
  return { bones, data: S.build() };
}
function buildImp() {
  const S = new SplatSet(53, 800);
  const bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, .9, 0] }, { p: 1, v: [0, 1.22, 0] }, { p: 1, v: [.22, 1.15, 0] }, { p: 1, v: [-.22, 1.15, 0] }, { p: 1, v: [.12, 1.2, -.15] }, { p: 1, v: [-.12, 1.2, -.15] }, { p: 1, v: [0, .78, -.15] }];
  S.ell([0, .95, 0], [.24, .3, .2], (p, n) => n[2] > .6 && p[1] < 1.0 ? 19 : 16, 1);
  for (const sx of [1, -1]) {
    S.tube([[sx * .1, .75, 0, .07, 1], [sx * .12, .42, .05, .05, 1]], 16, { sub: 2, noSolid: true });
    S.ell([sx * .12, .38, .08], [.06, .05, .09], 17, 1);
    S.tube([[sx * .14, 1.36, .02, .05, 2], [sx * .26, 1.5, -.04, .035, 2], [sx * .3, 1.58, -.16, .006, 2]], 17, { sub: 3, noSolid: true, minSeg: 6 });
    S.ell([sx * .08, 1.36, .19], [.05, .05, .03], 20, 2, { noSolid: true, noCheck: true, min: 10 });
    const a = sx > 0 ? 3 : 4;
    S.tube([[sx * .22, 1.15, 0, .06, a], [sx * .3, .95, .1, .05, a], [sx * .32, .78, .2, .04, a]], 16, { sub: 3, noSolid: true });
    for (let k = -1; k <= 1; k++) S.cone([sx * .32, .76, .2], [sx * .32 + k * .04, .7, .3], .015, 17, a, { minSeg: 4 });
    const w = sx > 0 ? 5 : 6;
    S.mem([[[sx * .12, 1.2, -.15], [sx * .65, 1.55, -.3], [sx * .55, 1.0, -.35], .12]], 17, () => w);
  }
  S.ell([0, 1.33, .03], [.22, .2, .2], 16, 2);
  S.ell([0, 1.24, .19], [.09, .025, .02], 29, 2, { noSolid: true, noCheck: true, min: 8 });
  S.tube([[0, .8, -.18, .05, 7], [0, .6, -.4, .035, 7], [0, .5, -.65, .02, 7]], 16, { sub: 3, noSolid: true });
  S.cone([0, .5, -.65], [0, .48, -.82], .08, 17, 7);
  return { bones, data: S.build() };
}
function buildBeetle() {
  const S = new SplatSet(54, 600);
  const bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, .5, 0] }, { p: 1, v: [0, .5, .7] }];
  S.ell([0, .58, -.05], [.62, .42, .85], (p, n) => (n[1] > .15 && Math.abs(frac(p[2] * 2.2) - .5) < .07) ? 21 : (Math.abs(p[0]) < .03 && n[1] > .3 ? 29 : 18), 1);
  S.ell([0, .38, 0], [.5, .2, .75], 19, 1);
  S.ell([0, .48, .82], [.3, .24, .26], 19, 2);
  S.tube([[0, .6, .98, .09, 2], [0, .85, 1.2, .05, 2], [0, 1.0, 1.15, .01, 2]], 17, { sub: 3, noSolid: true });
  for (const sx of [1, -1]) {
    S.cone([sx * .14, .4, 1.0], [sx * .05, .36, 1.22], .05, 17, 2);
    S.ell([sx * .16, .56, 1.02], .04, 20, 2, { noSolid: true, noCheck: true, min: 8 });
    for (let i = 0; i < 3; i++) {
      const zl = .45 - i * .45, b = bones.length;
      bones.push({ p: 1, v: [sx * .45, .42, zl] });
      S.tube([[sx * .45, .42, zl, .06, b], [sx * .8, .4, zl + .05, .05, b], [sx * .95, .02, zl + .08, .03, b]], 19, { sub: 2, noSolid: true });
    }
  }
  return { bones, data: S.build() };
}
/* ---- chefes ---- */
function buildGolem() {
  const S = new SplatSet(31, 380);
  const bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, 1.55, 0] }, { p: 1, v: [0, 1.9, 0] }, { p: 2, v: [0, 3.0, .15] }, { p: 2, v: [1.0, 2.85, 0] }, { p: 2, v: [-1.0, 2.85, 0] }, { p: 1, v: [.5, 1.5, 0] }, { p: 1, v: [-.5, 1.5, 0] }];
  const MS = (p, n) => n[1] > .45 ? 23 : 22;
  S.ell([0, 2.35, 0], [1.0, .9, .75], MS, 2);
  S.ell([0, 1.6, 0], [.75, .45, .55], MS, 1);
  for (const sx of [1, -1]) S.ell([sx * .82, 2.95, -.05], [.5, .42, .5], MS, 2);
  S.ell([0, 2.45, .66], [.22, .3, .14], 26, 2, { noSolid: true, noCheck: true, em: .95 });
  S.ell([0, 3.2, .28], [.36, .3, .34], MS, 3);
  S.ell([0, 3.37, .5], [.34, .08, .12], 22, 3);
  for (const sx of [1, -1]) {
    S.ell([sx * .14, 3.24, .6], [.06, .05, .04], 26, 3, { noSolid: true, noCheck: true, min: 10 });
    const a = sx > 0 ? 4 : 5;
    S.tube([[sx * 1.05, 2.85, 0, .36, a], [sx * 1.32, 2.1, .12, .3, a], [sx * 1.4, 1.35, .28, .28, a]], MS, { sub: 4 });
    S.ell([sx * 1.42, 1.12, .32], [.46, .42, .46], 22, a);
    const l = sx > 0 ? 6 : 7;
    S.tube([[sx * .5, 1.5, 0, .38, l], [sx * .55, .6, .05, .34, l]], MS, { sub: 3 });
    S.ell([sx * .56, .25, .12], [.42, .25, .5], 22, l);
    S.tube([[sx * .9, 3.3, -.1, .04, 2], [sx * .9, 3.45, -.1, .04, 2]], 12, { sub: 1, noSolid: true });
    S.ell([sx * .9, 3.48, -.1], [.13, .06, .13], 14, 2, { noSolid: true, noCheck: true });
  }
  const R = S.R;
  for (let i = 0; i < 26; i++) { const a = R() * 6.28, rr2 = R() * .8; const b2 = [Math.cos(a) * rr2, 3.0 + R() * .3, Math.sin(a) * rr2 * .6 - .1]; S.cone(b2, V.add(b2, [R() * .1 - .05, .18 + R() * .1, R() * .1 - .05]), .04, 10, 2); }
  S.tube([[.3, 3.05, -.5, .08, 2], [.35, 3.8, -.6, .05, 2], [.3, 4.3, -.5, .03, 2]], 12, { noSolid: true });
  S.ell([.3, 4.4, -.5], [.45, .35, .45], 13, 2, { noSolid: true, noCheck: true, dm: .8 });
  for (let i = 0; i < 4; i++) { const x = -.6 + i * .4; S.tube([[x, 2.9, -.55, .04, 2], [x + .05, 2.2, -.72, .035, 2], [x, 1.6, -.6, .02, 2]], 23, { noSolid: true, sub: 3 }); }
  return { bones, data: S.build() };
}
const RM_DRAGON = { 0: 22, 1: 23, 2: 24, 3: 25, 4: 26, 5: 27, 6: 28, 7: 29, 8: 29 };
const RM_SKULL = { 0: 22, 1: 23, 2: 24, 3: 25, 4: 26, 5: 27, 6: 28, 7: 29, 8: 29, 14: 26 };
function buildDragon() {
  const S = new SplatSet(11, 480, RM_DRAGON);
  const bones = [
    { p: -1, v: [0, 0, 0] }, { p: 0, v: [0, 1.7, 0] }, { p: 1, v: [0, 2.0, .85] }, { p: 2, v: [0, 2.5, 1.4] }, { p: 3, v: [0, 3.0, 1.7] }, { p: 4, v: [0, 3.35, 1.9] },
    { p: 5, v: [0, 3.58, 2.08] }, { p: 6, v: [0, 3.44, 2.32] }, { p: 1, v: [0, 1.55, -1.5] }, { p: 8, v: [0, 1.3, -2.3] }, { p: 9, v: [0, 1.0, -3.0] }, { p: 10, v: [0, .75, -3.7] },
    { p: 11, v: [0, .6, -4.3] }, { p: 12, v: [0, .55, -4.9] }, { p: 1, v: [.55, 2.3, .6] }, { p: 14, v: [1.6, 3.0, .2] }, { p: 1, v: [-.55, 2.3, .6] }, { p: 16, v: [-1.6, 3.0, .2] },
    { p: 0, v: [.62, 1.5, .85] }, { p: 0, v: [-.62, 1.5, .85] }, { p: 0, v: [.62, 1.4, -.9] }, { p: 0, v: [-.62, 1.4, -.9] },
  ];
  const SC = (p, n) => n[1] < -0.42 ? 1 : 0;
  const CH = (p, n) => (n[1] < -0.3 || (n[2] > 0.55 && n[1] < 0.2)) ? 1 : 0;
  const torso = [[[0, 1.75, 0], [.86, .8, 1.35]], [[0, 1.92, .78], [.72, .74, .7]], [[0, 1.62, -.95], [.7, .66, .74]]];
  S.ell(torso[0][0], torso[0][1], CH, 1); S.ell(torso[1][0], torso[1][1], CH, 1); S.ell(torso[2][0], torso[2][1], SC, 1);
  const topY = z => { let y = 0; for (const [c, r] of torso) { const q = 1 - ((z - c[2]) / r[2]) ** 2; if (q > 0) y = Math.max(y, c[1] + r[1] * Math.sqrt(q)); } return y; };
  for (let i = 0; i < 9; i++) { const z = 1.05 - i * .3, yt = topY(z), h = .36 - Math.abs(i - 3) * .028; S.cone([0, yt - .07, z], [0, yt + h, z - .22], h * .34, 7, 1); }
  S.tube([[0, 1.95, .7, .56, 2], [0, 2.5, 1.4, .42, 3], [0, 3.0, 1.7, .36, 4], [0, 3.35, 1.9, .32, 5], [0, 3.6, 2.1, .3, 6]], SC, { spines: { mat: 7, h: [.24, .12], step: .2, lean: -.7 } });
  S.ell([0, 3.68, 2.22], [.36, .31, .42], SC, 6);
  S.tube([[0, 3.62, 2.4, .27, 6], [0, 3.52, 2.85, .2, 6], [0, 3.46, 3.18, .14, 6]], SC, { sx: 1.1, sy: .75 });
  S.ell([0, 3.46, 3.2], [.15, .105, .1], SC, 6);
  S.ell([0, 3.415, 2.75], [.17, .04, .33], 8, 6, { noSolid: true });
  S.cone([0, 3.95, 2.22], [0, 4.17, 1.95], .065, 7, 6); S.cone([0, 3.9, 1.98], [0, 4.06, 1.74], .05, 7, 6);
  for (const sx of [1, -1]) {
    S.ell([sx * .2, 3.86, 2.45], [.11, .065, .2], 7, 6);
    S.ell([sx * .255, 3.74, 2.52], [.066, .05, .078], 4, 6, { noSolid: true });
    S.ell([sx * .08, 3.56, 3.27], [.035, .03, .03], 8, 6, { noSolid: true, noCheck: true, min: 10 });
    S.tube([[sx * .2, 3.86, 2.1, .095, 6], [sx * .3, 4.06, 1.8, .072, 6], [sx * .37, 4.16, 1.45, .046, 6], [sx * .4, 4.1, 1.12, .008, 6]], 3, { noSolid: true, sub: 5 });
    S.tube([[sx * .3, 3.66, 2.0, .06, 6], [sx * .48, 3.64, 1.8, .04, 6], [sx * .58, 3.72, 1.6, .007, 6]], 3, { noSolid: true, sub: 4 });
    S.cone([sx * .3, 3.52, 2.25], [sx * .53, 3.42, 2.0], .05, 7, 6); S.cone([sx * .28, 3.62, 2.12], [sx * .5, 3.58, 1.92], .04, 7, 6);
    for (let i = 0; i < 6; i++) { const z = 2.6 + i * .11, x = sx * (.19 - i * .013); S.cone([x, 3.43, z], [x, 3.30, z + .015], .026, 6, 6, { minSeg: 10 }); }
    for (let i = 0; i < 5; i++) { const z = 2.62 + i * .1, x = sx * (.15 - i * .011); S.cone([x, 3.34, z], [x, 3.455, z], .022, 6, 7, { minSeg: 10 }); }
    S.cone([sx * .12, 3.22, 2.55], [sx * .17, 3.0, 2.36], .045, 7, 7);
  }
  S.tube([[0, 3.36, 2.35, .2, 7], [0, 3.3, 2.8, .15, 7], [0, 3.3, 3.08, .09, 7]], (p, n) => n[1] < -.2 ? 1 : 0, { sx: 1.05, sy: .5 });
  S.ell([0, 3.38, 2.7], [.12, .03, .28], 8, 7, { noSolid: true });
  S.tube([[0, 1.6, -1.2, .55, 1], [0, 1.5, -1.6, .5, 8], [0, 1.3, -2.3, .38, 9], [0, 1.0, -3.0, .28, 10], [0, .75, -3.7, .2, 11], [0, .6, -4.3, .13, 12], [0, .55, -4.9, .08, 13], [0, .55, -5.25, .03, 13]], SC, { spines: { mat: 7, h: [.32, .07], step: .24, lean: .75 } });
  S.mem([[[0, .56, -5.0], [.4, .6, -5.42], [0, .56, -6.05]], [[0, .56, -5.0], [0, .56, -6.05], [-.4, .6, -5.42]]], 2, () => 13);
  for (const [sx, z, b, back] of [[1, .85, 18, 0], [-1, .85, 19, 0], [1, -.9, 20, 1], [-1, -.9, 21, 1]]) {
    const x = sx * .62;
    S.ell([x, 1.35, z], [.32, .48, .4], SC, b);
    const nodes = back ? [[x * 1.05, 1.05, z - .1, .25, b], [x * 1.12, .62, z - .38, .17, b], [x * 1.12, .2, z - .15, .13, b]] : [[x * 1.05, 1.05, z + .05, .21, b], [x * 1.12, .55, z + .18, .15, b], [x * 1.12, .2, z + .12, .13, b]];
    S.tube(nodes, SC);
    const zf = nodes[2][2] + .13, xf = x * 1.12;
    S.ell([xf, .11, zf], [.21, .1, .29], SC, b);
    for (let k = -1; k <= 1; k++) S.cone([xf + k * .11, .09, zf + .2], [xf + k * .15, .0, zf + .44], .048, 3, b, { minSeg: 12 });
  }
  for (const sx of [1, -1]) {
    const b1 = sx > 0 ? 14 : 16, b2 = b1 + 1;
    const sh = [sx * .55, 2.3, .6], el = [sx * 1.6, 3.0, .2], wr = [sx * 2.6, 3.5, -.2];
    const F = [[sx * 4.55, 3.25, -.6], [sx * 4.3, 2.25, -1.32], [sx * 3.35, 1.45, -1.92], [sx * 2.2, 1.35, -1.98]];
    const back = [sx * .5, 1.95, -1.0];
    S.tube([[...sh, .16, b1], [...el, .11, b2], [...wr, .085, b2]], 0, { sub: 4, noSolid: true });
    S.ell(el, .12, 0, b2, { noSolid: true }); S.ell(wr, .1, 0, b2, { noSolid: true });
    S.cone(wr, [sx * 2.74, 3.88, .06], .055, 3, b2);
    for (const tip of F) { const mid = V.add(V.lerp(wr, tip, .5), [0, .14, 0]); S.tube([[...wr, .07, b2], [...mid, .045, b2], [...tip, .02, b2]], 0, { sub: 4, noSolid: true }); }
    const boneFn = p => Math.abs(p[0]) > 1.6 ? b2 : (Math.abs(p[0]) > .95 ? b1 : 1);
    S.mem([[wr, F[0], F[1], .17], [wr, F[1], F[2], .17], [wr, F[2], F[3], .15], [el, wr, F[3]], [el, F[3], back, .14], [sh, el, back]], 2, boneFn, { dm: .8 });
  }
  return { bones, data: S.build() };
}
function buildSkullBoss() {
  const S = new SplatSet(23, 520, RM_SKULL);
  const bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, 3.2, 0] }, { p: 1, v: [0, 2.6, -.05] }];
  const hands = [];
  for (const sx of [1, -1]) {
    const hb = bones.length, W = [sx * 2.5, 2.0, .5];
    bones.push({ p: 0, v: W });
    const fingers = [];
    for (let i = 0; i < 4; i++) { const xo = sx * (-.27 + i * .18), K = [W[0] + xo, 1.97, 1.02 - (i === 3 ? .08 : 0) - (i === 0 ? .03 : 0)]; fingers.push({ K, xo, b: bones.length }); bones.push({ p: hb, v: K }); }
    const T0 = [W[0] - sx * .2, 1.98, .62], tb = bones.length; bones.push({ p: hb, v: T0 });
    hands.push({ sx, hb, W, fingers, T0, tb });
  }
  const vert = [];
  for (let k = 0; k < 6; k++) { const c = [0, 2.12 - k * .34, -.5 - k * .13], b = bones.length; bones.push({ p: k === 0 ? 1 : b - 1, v: [c[0], c[1] + .17, c[2]] }); vert.push({ c, b, sc: 1 - k * .07 }); }
  const SOCK = [{ c: [.38, 3.02, 1.05], r: .29 }, { c: [-.38, 3.02, 1.05], r: .29 }], NOSE = [{ c: [0, 2.68, 1.13], r: .13 }, { c: [0, 2.8, 1.1], r: .09 }], CUT = [...SOCK, ...NOSE];
  const CR = [[0, 3.42, 0], [1.05, 1.0, 1.15]];
  S.ell(CR[0], CR[1], 0, 1, { cut: CUT }); S.ell([0, 2.95, .45], [.85, .75, .75], 0, 1, { cut: CUT });
  S.ell([0, 3.25, -.72], [.82, .78, .62], 0, 1); S.ell([0, 2.42, .72], [.5, .28, .42], 0, 1, { cut: NOSE });
  for (const sx of [1, -1]) {
    S.ell([sx * .38, 3.0, .9], .26, 2, 1, { inward: true, noCheck: true, keep: d => d[2] < .45 });
    S.ell([sx * .38, 3.0, .8], .1, 4, 1, { em: .95, noSolid: true, noCheck: true });
    S.ell([sx * .36, 3.33, 1.02], [.3, .09, .16], 0, 1, { cut: SOCK });
    S.ell([sx * .6, 2.76, .8], [.22, .15, .3], 0, 1);
    S.ell([sx * .9, 3.05, .1], [.12, .28, .32], 1, 1);
    S.ell([sx * .62, 2.6, 0], .12, 0, 2);
  }
  S.ell([0, 2.74, 1.0], [.13, .15, .13], 2, 1, { inward: true, noCheck: true, keep: d => d[2] < .5 });
  for (let i = 0; i < 10; i++) { const a = (-.5 + i / 9) * 2.2; S.ell([Math.sin(a) * .42, 2.18, .62 + Math.cos(a) * .4], [.06, .1, .05], 6, 1, { noSolid: true, min: 18 }); }
  S.tube([[-.62, 2.55, .05, .13, 2], [-.6, 2.2, .4, .15, 2], [-.38, 1.98, .85, .15, 2], [0, 1.93, 1.0, .16, 2], [.38, 1.98, .85, .15, 2], [.6, 2.2, .4, .15, 2], [.62, 2.55, .05, .13, 2]], 0, { sub: 5 });
  S.ell([0, 1.95, .95], [.25, .14, .14], 0, 2);
  for (let i = 0; i < 8; i++) { const a = (-.5 + i / 7) * 1.9; S.ell([Math.sin(a) * .4, 2.1, .55 + Math.cos(a) * .4], [.05, .08, .045], 6, 2, { noSolid: true, min: 16 }); }
  S.ell([0, 2.08, .55], [.36, .03, .3], 8, 2, { noSolid: true, noCheck: true }); S.ell([0, 2.34, .5], [.38, .03, .32], 8, 1, { noSolid: true, noCheck: true });
  const ring = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; ring.push([.86 * Math.cos(a), 4.05, .94 * Math.sin(a), .085, 1]); }
  S.tube(ring, 3, { closed: true, sy: 1.9, sub: 3, noSolid: true });
  for (let k = 0; k < 10; k++) {
    const a = Math.PI / 2 + k * Math.PI * 2 / 10, f = (Math.cos(k * Math.PI * 2 / 10) + 1) / 2, h = .22 + .4 * f;
    const base = [.86 * Math.cos(a), 4.1, .94 * Math.sin(a)], tip = [base[0] * 1.13, 4.1 + h, base[2] * 1.13];
    S.cone(base, tip, .09, 3, 1, { minSeg: 20 });
    const front = k === 0 || k === 1 || k === 9;
    S.ell(tip, front ? .06 : .045, front ? 14 : 3, 1, { noSolid: true, noCheck: true });
  }
  S.ell([0, 4.08, 1.0], [.11, .13, .06], 14, 1, { em: .95, noSolid: true, noCheck: true });
  for (const H of hands) {
    const { sx, hb, W, fingers, T0, tb } = H;
    S.ell(W, [.24, .12, .22], 0, hb);
    S.tube([[W[0] + sx * .08, 2.02, .42, .085, hb], [W[0] + sx * .35, 1.78, -.4, .07, hb], [W[0] + sx * .55, 1.55, -1.15, .06, hb]], 1, { noSolid: true });
    S.tube([[W[0] - sx * .1, 2.0, .42, .07, hb], [W[0] + sx * .15, 1.74, -.4, .06, hb], [W[0] + sx * .34, 1.5, -1.12, .05, hb]], 1, { noSolid: true });
    fingers.forEach(({ K, xo, b }, i) => {
      const ls = [1, 1.08, 1, .8][i];
      S.tube([[W[0] + xo * .35, 2.0, .62, .05, hb], [...K, .05, hb]], 1, { sub: 2, noSolid: true });
      const P1 = V.add(K, [xo * .12, -.04, .3 * ls]), P2 = V.add(P1, [xo * .05, -.08, .22 * ls]), P3 = V.add(P2, [0, -.12, .17 * ls]);
      S.tube([[...K, .05, b], [...P1, .044, b], [...P2, .038, b], [...P3, .008, b]], 0, { sub: 3, noSolid: true, minSeg: 6 });
      S.ell(K, [.062, .058, .062], 0, b, { noSolid: true }); S.ell(P1, .05, 0, b, { noSolid: true }); S.ell(P2, .044, 0, b, { noSolid: true });
    });
    const T1 = V.add(T0, [-sx * .2, -.04, .2]), T2 = V.add(T1, [-sx * .1, -.08, .2]), T3 = V.add(T2, [-sx * .03, -.1, .14]);
    S.tube([[...T0, .06, tb], [...T1, .05, tb], [...T2, .042, tb], [...T3, .008, tb]], 0, { sub: 3, noSolid: true, minSeg: 6 });
  }
  vert.forEach(({ c, b, sc }, k) => {
    S.ell(c, [.17 * sc, .12 * sc, .17 * sc], 1, b);
    S.cone(c, [c[0], c[1] - .08, c[2] - .34 * sc], .06 * sc, 1, b);
    for (const sx of [1, -1]) {
      S.cone(c, [sx * .28 * sc, c[1], c[2] - .04], .05 * sc, 1, b);
      if (k >= 1 && k <= 3) { const rs = [0, .9, 1, .8][k]; S.tube([[sx * .14, c[1] + .02, c[2] + .02, .05, b], [sx * .5 * rs, c[1] - .06, c[2] + .12 * rs, .045, b], [sx * .62 * rs, c[1] - .32 * rs, c[2] + .45 * rs, .035, b], [sx * .38 * rs, c[1] - .55 * rs, c[2] + .78 * rs, .015, b]], 0, { noSolid: true, sub: 4 }); }
    }
  });
  const crack = pts => {
    for (let i = 0; i < pts.length - 1; i++) {
      const L = V.len(V.sub(pts[i + 1], pts[i])), n = Math.ceil(L / .02);
      for (let k = 0; k < n; k++) {
        const q = V.add(V.lerp(pts[i], pts[i + 1], k / n), [(S.R() - .5) * .02, (S.R() - .5) * .02, (S.R() - .5) * .02]);
        const e = [(q[0] - CR[0][0]) / CR[1][0], (q[1] - CR[0][1]) / CR[1][1], (q[2] - CR[0][2]) / CR[1][2]], el = V.len(e);
        S.pt([CR[0][0] + CR[1][0] * e[0] / el * 1.012, CR[0][1] + CR[1][1] * e[1] / el * 1.012, CR[0][2] + CR[1][2] * e[2] / el * 1.012], V.norm([e[0] / CR[1][0], e[1] / CR[1][1], e[2] / CR[1][2]]), 7, 1, .05, 0);
      }
    }
  };
  crack([[.15, 4.38, .3], [.3, 4.15, .55], [.22, 3.95, .75], [.42, 3.75, .8], [.52, 3.56, .82]]);
  crack([[-.45, 4.25, -.25], [-.7, 3.98, .05], [-.62, 3.72, .3], [-.82, 3.5, .28]]);
  return { bones, data: S.build(), hands, vert };
}
/* ---- objetos ---- */
function buildShrine() {
  const S = new SplatSet(61, 500), bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, 1.75, 0] }];
  S.box([0, .25, 0], [.7, .25, .7], 11, 0);
  S.tube([[0, .5, 0, .28, 0], [0, 1.1, 0, .24, 0]], 11, { sub: 1 });
  S.ell([0, 1.15, 0], [.44, .12, .44], 11, 0);
  S.cone([0, 1.75, 0], [0, 2.2, 0], .21, 31, 1); S.cone([0, 1.75, 0], [0, 1.32, 0], .21, 31, 1);
  const r = []; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; r.push([Math.cos(a) * .74, .52, Math.sin(a) * .74, .025, 0]); }
  S.tube(r, 31, { closed: true, sub: 2, noSolid: true });
  return { bones, data: S.build() };
}
function buildChest() {
  const S = new SplatSet(62, 700), bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, .58, -.35] }];
  S.box([0, .3, 0], [.5, .28, .34], 12, 0);
  for (const sx of [1, -1]) S.box([sx * .3, .3, 0], [.05, .29, .35], 4, 0);
  S.box([0, .66, 0], [.52, .09, .36], 12, 1);
  for (const sx of [1, -1]) S.box([sx * .3, .66, 0], [.055, .1, .37], 4, 1);
  S.box([0, .5, .35], [.08, .09, .03], 30, 0);
  return { bones, data: S.build() };
}
function buildFragment() {
  const S = new SplatSet(63, 900), bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, 1.2, 0] }];
  S.cone([0, 1.2, 0], [0, 1.65, 0], .2, 30, 1, { em: .95 }); S.cone([0, 1.2, 0], [0, .8, 0], .2, 30, 1, { em: .95 });
  for (let i = 0; i < 3; i++) { const a = i / 3 * 6.283, p = [Math.cos(a) * .45, 1.2 + (i - 1) * .12, Math.sin(a) * .45]; S.cone(p, V.add(p, [0, .15, 0]), .06, 30, 1); S.cone(p, V.add(p, [0, -.12, 0]), .06, 30, 1); }
  return { bones, data: S.build() };
}
function buildPortal() {
  const S = new SplatSet(64, 380), bones = [{ p: -1, v: [0, 0, 0] }];
  const r = []; for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283; r.push([Math.cos(a) * 1.25, 1.5 + Math.sin(a) * 1.5, 0, .17, 0]); }
  S.tube(r, 11, { closed: true, sub: 3, noSolid: true });
  for (const sx of [1, -1]) S.box([sx * 1.25, .2, 0], [.35, .2, .35], 11, 0);
  S.box([0, 3.05, 0], [.18, .2, .2], 30, 0);
  return { bones, data: S.build() };
}
function buildBoar() {
  const S = new SplatSet(95, 650), bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, .55, 0] }, { p: 1, v: [0, .62, .5] }];
  S.ell([0, .6, -.05], [.42, .4, .66], (p, n) => n[1] < -.4 ? 17 : 16, 1);
  for (let i = 0; i < 7; i++) S.cone([0, .93, .35 - i * .14], [0, 1.12, .28 - i * .14], .07, 19, 1);
  S.ell([0, .6, .72], [.27, .27, .3], 16, 2);
  S.tube([[0, .55, .9, .14, 2], [0, .5, 1.08, .12, 2]], 19, { sub: 1, noSolid: true }); S.ell([0, .5, 1.13], [.11, .09, .03], 17, 2, { noSolid: true, noCheck: true });
  for (const sx of [1, -1]) { S.cone([sx * .12, .46, .98], [sx * .21, .68, 1.1], .045, 17, 2); S.ell([sx * .14, .74, .86], .04, 20, 2, { noSolid: true, noCheck: true, min: 6 }); S.cone([sx * .15, .82, .62], [sx * .23, 1.03, .55], .07, 19, 2); }
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const b = bones.length; bones.push({ p: 1, v: [sx * .22, .45, sz * .38] }); S.tube([[sx * .22, .45, sz * .38, .09, b], [sx * .22, .03, sz * .4, .06, b]], 19, { sub: 1, noSolid: true }); }
  S.tube([[0, .75, -.68, .04, 1], [0, .6, -.82, .02, 1]], 19, { sub: 1, noSolid: true });
  return { bones, data: S.build() };
}
function buildWolf() {
  const S = new SplatSet(96, 700), bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, .7, 0] }, { p: 1, v: [0, .88, .55] }, { p: 1, v: [0, .8, -.55] }];
  S.ell([0, .72, 0], [.26, .3, .62], (p, n) => n[1] < -.3 ? 17 : (n[1] > .5 ? 19 : 18), 1);
  S.ell([0, .82, .35], [.3, .34, .3], (p, n) => n[1] < -.2 ? 17 : 18, 1);
  S.ell([0, .98, .7], [.2, .19, .22], 18, 2); S.tube([[0, .92, .85, .11, 2], [0, .88, 1.08, .06, 2]], 18, { sub: 1, noSolid: true }); S.ell([0, .9, 1.1], .045, 19, 2, { noSolid: true, noCheck: true });
  for (const sx of [1, -1]) { S.cone([sx * .1, 1.1, .65], [sx * .13, 1.32, .6], .06, 19, 2); S.ell([sx * .085, 1.02, .88], .032, 20, 2, { noSolid: true, noCheck: true, min: 6 }); }
  S.tube([[0, .85, -.55, .08, 3], [0, .72, -.9, .08, 3], [0, .55, -1.15, .03, 3]], 18, { sub: 2, noSolid: true });
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const b = bones.length; bones.push({ p: 1, v: [sx * .15, .6, sz * .42] }); S.tube([[sx * .15, .6, sz * .42, .065, b], [sx * .15, .3, sz * .45, .05, b], [sx * .15, .02, sz * .48, .04, b]], sz > 0 ? 18 : 19, { sub: 1, noSolid: true }); }
  return { bones, data: S.build() };
}
function buildBear() {
  const S = new SplatSet(97, 520), bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, 1.0, 0] }, { p: 1, v: [0, 1.3, .85] }, { p: 1, v: [.55, 1.1, .5] }, { p: 1, v: [-.55, 1.1, .5] }, { p: 0, v: [.45, .6, -.45] }, { p: 0, v: [-.45, .6, -.45] }];
  S.ell([0, 1.0, -.1], [.75, .72, 1.0], (p, n) => n[1] > .6 ? 10 : (n[1] < -.4 ? 19 : 16), 1);
  S.ell([0, 1.3, .5], [.62, .62, .5], (p, n) => n[1] > .65 ? 10 : 16, 1);
  for (let i = 0; i < 6; i++) S.cone([Math.sin(i * 2.3) * .3, 1.75 - i * .04, .4 - i * .25], [Math.sin(i * 2.3) * .35, 2.0 - i * .05, .35 - i * .25], .09, 13, 1);
  S.ell([0, 1.38, 1.0], [.36, .34, .36], 16, 2); S.tube([[0, 1.27, 1.25, .17, 2], [0, 1.22, 1.46, .12, 2]], 17, { sub: 1, noSolid: true }); S.ell([0, 1.25, 1.55], .06, 19, 2, { noSolid: true, noCheck: true });
  for (const sx of [1, -1]) { S.ell([sx * .25, 1.66, .92], .1, 19, 2); S.ell([sx * .14, 1.46, 1.3], .04, 20, 2, { noSolid: true, noCheck: true, min: 6 }); }
  for (const [sx, b] of [[1, 3], [-1, 4]]) { S.tube([[sx * .55, 1.1, .5, .24, b], [sx * .6, .55, .65, .2, b], [sx * .6, .12, .75, .18, b]], 19, { sub: 2, noSolid: true }); for (let k = 0; k < 3; k++) S.cone([sx * (.52 + k * .08), .1, .9], [sx * (.52 + k * .08), .05, 1.08], .04, 17, b); }
  for (const [sx, b] of [[1, 5], [-1, 6]]) S.tube([[sx * .45, .6, -.45, .26, b], [sx * .48, .12, -.45, .2, b]], 19, { sub: 1, noSolid: true });
  return { bones, data: S.build() };
}
function wander(e, dt, sp) {
  if (e.hx === undefined) { e.hx = e.x; e.hz = e.z; }
  e.wt = (e.wt || 0) - dt; if (e.wt <= 0) { e.wt = rr(1.5, 4); const a = rr(0, 6.28), r = rr(0, 3); e.wx2 = e.hx + Math.cos(a) * r; e.wz2 = e.hz + Math.sin(a) * r; e.wIdle = Math.random() < .4; }
  const dx = e.wx2 - e.x, dz = e.wz2 - e.z, d = Math.hypot(dx, dz);
  if (!e.wIdle && d > .3) { moveEnt(e, dx / d * sp, dz / d * sp, dt); e.yaw += angDiff(e.yaw, Math.atan2(dx, dz)) * (1 - Math.exp(-dt * 5)); e.walkPh = (e.walkPh || 0) + dt * 6; e.moveAmt = 1; } else { moveEnt(e, 0, 0, dt); e.moveAmt = 0; }
}
function buildToad() {
  const S = new SplatSet(91, 620), bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, .4, 0] }, { p: 1, v: [0, .5, .4] }];
  S.ell([0, .55, 0], [.62, .42, .66], (p, n) => n[1] < -.3 ? 17 : (hash2(p[0] * 9 + 3, p[2] * 9) > .8 && n[1] > 0 ? 19 : 16), 1);
  S.ell([0, .36, .36], [.5, .2, .32], 17, 2);
  for (const sx of [1, -1]) { S.ell([sx * .3, .92, .3], [.16, .15, .15], 16, 1); S.ell([sx * .32, .97, .42], [.08, .08, .05], 20, 1, { noSolid: true, noCheck: true, min: 10 }); }
  S.ell([0, .6, .62], [.44, .04, .09], 29, 1, { noSolid: true, noCheck: true });
  for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; S.ell([Math.cos(a) * .36, .88, Math.sin(a) * .36 - .12], .07, 19, 1, { noSolid: true }); }
  for (const sx of [1, -1]) {
    let b = bones.length; bones.push({ p: 1, v: [sx * .45, .35, -.25] });
    S.tube([[sx * .45, .4, -.25, .18, b], [sx * .78, .22, -.05, .12, b], [sx * .62, .04, .25, .07, b]], 16, { sub: 2, noSolid: true }); S.ell([sx * .64, .03, .33], [.15, .03, .13], 17, b, { noSolid: true });
    b = bones.length; bones.push({ p: 1, v: [sx * .35, .35, .35] });
    S.tube([[sx * .35, .35, .35, .09, b], [sx * .45, .02, .55, .06, b]], 16, { sub: 2, noSolid: true }); S.ell([sx * .47, .02, .63], [.1, .02, .08], 17, b, { noSolid: true });
  }
  return { bones, data: S.build() };
}
function buildDrowned() {
  const r = buildSkeleton(), S = new SplatSet(53, 900);
  for (let i = 0; i < r.data.length; i += STRIDE) { const m = r.data[i + 6]; if (m === 16) r.data[i + 6] = 18; else if (m === 17) r.data[i + 6] = 19; }
  for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28, x = Math.cos(a) * .2, z = Math.sin(a) * .14; S.tube([[x, 1.42, z, .03, 2], [x * 1.3, 1.1, z * 1.3, .025, 2], [x * 1.2, .8 - k * .03, z * 1.4, .012, 2]], 19, { sub: 2, noSolid: true }); }
  S.ell([0, 1.86, .02], [.17, .06, .18], 19, 3, { noSolid: true }); for (let k = 0; k < 4; k++) S.tube([[-.12 + k * .08, 1.86, -.05, .025, 3], [-.14 + k * .09, 1.55, -.12, .01, 3]], 19, { sub: 1, noSolid: true });
  S.ell([.12, 1.25, .12], .05, 21, 2, { noSolid: true, noCheck: true, min: 8 });
  const extra = S.build(), out = new Float32Array(r.data.length + extra.length); out.set(r.data); out.set(extra, r.data.length);
  return { bones: r.bones, data: out };
}
function buildSentinel() {
  const S = new SplatSet(92, 700), C = [0, 1.4, 0], bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: C }, { p: 1, v: C }];
  S.cone([0, 1.4, 0], [0, 2.3, 0], .34, 16, 1); S.cone([0, 1.4, 0], [0, .5, 0], .34, 17, 1);
  S.ell(C, [.38, .12, .38], 16, 1, { noSolid: true });
  S.ell([0, 1.46, .32], [.13, .13, .06], 20, 1, { noSolid: true, noCheck: true, min: 12 });
  for (let k = 0; k < 3; k++) { const a = k / 3 * 6.283, x = Math.cos(a), z = Math.sin(a); S.cone([x * .75, 1.4, z * .75], [x * 1.05, 1.8, z * 1.05], .12, 16, 2); S.cone([x * .75, 1.4, z * .75], [x * 1.0, 1.05, z * 1.0], .12, 17, 2); S.ell([x * .78, 1.42, z * .78], .05, 21, 2, { noSolid: true, noCheck: true, min: 6 }); }
  const ring = []; for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283; ring.push([Math.cos(a) * .6, 1.4, Math.sin(a) * .6, .035, 2]); } S.tube(ring, 19, { closed: true, sub: 2, noSolid: true });
  return { bones, data: S.build() };
}
function buildPhantom() {
  const S = new SplatSet(93, 760), bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, 1.0, 0] }, { p: 1, v: [0, 1.55, 0] }, { p: 1, v: [.3, 1.4, 0] }, { p: 1, v: [-.3, 1.4, 0] }];
  S.tube([[0, 1.55, 0, .26, 1], [0, 1.0, 0, .34, 1], [0, .4, -.05, .46, 1], [0, .08, -.12, .22, 1]], 18, { sub: 4, noSolid: true });
  S.ell([0, 1.72, 0], [.26, .29, .28], 18, 2, { keep: d => d[2] < .55 });
  S.ell([0, 1.68, .13], [.17, .19, .12], 29, 2, { noCheck: true, inward: true });
  for (const sx of [1, -1]) S.ell([sx * .07, 1.7, .21], [.045, .03, .02], 20, 2, { noSolid: true, noCheck: true, min: 8 });
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; S.cone([Math.cos(a) * .4, .45, Math.sin(a) * .4 - .05], [Math.cos(a) * .52, -.02, Math.sin(a) * .52 - .1], .1, 18, 1); }
  for (const [sx, b] of [[1, 3], [-1, 4]]) { S.tube([[sx * .3, 1.4, 0, .1, b], [sx * .45, 1.0, .2, .07, b], [sx * .42, .8, .42, .04, b]], 18, { sub: 2, noSolid: true }); for (let k = 0; k < 3; k++) S.cone([sx * .42, .8, .42], [sx * (.36 + k * .05), .6, .64], .022, 28, b); }
  S.ell([0, 1.27, .26], [.16, .03, .03], 19, 1, { noSolid: true, noCheck: true });
  return { bones, data: S.build() };
}
function buildHydra() {
  const S = new SplatSet(94, 300), bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, .9, 0] }], heads = [];
  S.ell([0, .9, -.4], [2.1, 1.15, 2.0], (p, n) => n[1] > .3 && Math.abs(frac(p[0] * 1.2 + p[2] * .8) - .5) < .08 ? 24 : (n[1] < -.1 ? 23 : 22), 1);
  for (let i = 0; i < 7; i++) { const z = .6 - i * .45, x = Math.sin(i * 1.7) * .3, y = 2.0 - Math.abs(z + .4) * .3; S.cone([x, y - .1, z], [x, y + .6, z - .3], .16, 28, 1); }
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; S.ell([Math.cos(a) * 1.95, .22, Math.sin(a) * 1.85 - .4], [.42, .24, .36], i % 3 ? 24 : 19, 1, { dm: .8 }); }
  bones.push({ p: 1, v: [0, .6, -2.2] });
  S.tube([[0, .6, -2.2, .55, 2], [.6, .35, -3.2, .35, 2], [1.4, .2, -3.8, .15, 2], [2.0, .15, -4.0, .02, 2]], 22, { sub: 4, noSolid: true });
  [-.65, 0, .65].forEach((ang, k) => {
    const L = k === 1 ? 3.1 : 2.5, fw = [Math.sin(ang), 0, Math.cos(ang)], base = [fw[0] * 1.1, 1.3, .7 + fw[2] * .5], tip = [fw[0] * (1.1 + L * .5), 1.3 + L * .78, .7 + fw[2] * (.5 + L * .5)];
    const nb = bones.length; bones.push({ p: 1, v: base });
    const mid = V.lerp(base, tip, .5); mid[1] += .25; mid[0] -= fw[0] * .25; mid[2] -= .3;
    S.tube([[...base, .5, nb], [...mid, .36, nb], [...tip, .3, nb]], (p, n) => n[1] < -.2 ? 23 : (Math.abs(frac(p[1] * 2.4) - .5) < .07 ? 24 : 22), { sub: 5, spines: { step: .5, h: [.25, .12], lean: -.5, mat: 28 } });
    const hb = bones.length; bones.push({ p: nb, v: tip });
    S.tube([[...V.add(tip, V.mul(fw, -.12)), .4, hb], [...V.add(tip, V.mul(fw, .5)), .32, hb], [...V.add(tip, V.mul(fw, 1.05)), .17, hb]], 22, { sub: 3, sy: .8 });
    const side = [fw[2], 0, -fw[0]];
    for (const sx of [1, -1]) {
      const e = V.add(V.add(tip, V.mul(side, .27 * sx)), V.add(V.mul(fw, .25), [0, .2, 0]));
      S.ell(e, .085, 26, hb, { noSolid: true, noCheck: true, min: 10 });
      S.cone(V.add(V.add(tip, V.mul(side, .22 * sx)), [0, .24, 0]), V.add(V.add(tip, V.mul(side, .38 * sx)), V.add(V.mul(fw, -.55), [0, .65, 0])), .09, 28, hb);
      for (let i = 0; i < 4; i++) { const pp = V.add(V.add(tip, V.mul(fw, .45 + i * .15)), V.mul(side, .17 * sx)); S.cone(V.add(pp, [0, -.1, 0]), V.add(pp, [0, -.3, 0]), .03, 28, hb); }
    }
    const jb = bones.length; bones.push({ p: hb, v: V.add(tip, [0, -.12, 0]) });
    S.tube([[...V.add(tip, [0, -.24, 0]), .24, jb], [...V.add(V.add(tip, V.mul(fw, .95)), [0, -.3, 0]), .1, jb]], 23, { sub: 2, sy: .55 });
    heads.push({ nb, hb, jb, ang, tip, fw });
  });
  return { bones, data: S.build(), heads };
}
const reflexCfg = () => ({ ...G.char, seed: 91, armor: 4, charm: 2, acc: G.char.acc === 'nenhum' ? 'capuz' : G.char.acc, cape: true });
/* ---- chefes (ato II) ---- */
function buildSpider() {
  const S = new SplatSet(81, 420);
  const bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, 1.25, 0] }, { p: 1, v: [0, 1.4, -.8] }, { p: 1, v: [0, 1.2, .9] }];
  S.ell([0, 1.25, 0], [.9, .55, 1.0], (p, n) => n[1] > .6 && Math.abs(p[0]) < .2 ? 137 : 136, 1);
  S.ell([0, 1.6, -1.6], [1.05, .95, 1.25], (p, n) => (n[1] > .1 && Math.abs(frac(p[2] * 1.3) - .5) < .1) ? 137 : 136, 2);
  S.ell([0, 2.5, -1.5], [.3, .08, .45], 142, 2, { noSolid: true, noCheck: true });
  S.cone([0, 1.4, -2.75], [0, 1.2, -3.05], .18, 138, 2);
  S.ell([0, 1.2, 1.05], [.55, .45, .5], 136, 3);
  for (const sx of [1, -1]) {
    S.ell([sx * .17, 1.42, 1.48], .09, 142, 3, { noSolid: true, noCheck: true, min: 10 }); S.ell([sx * .35, 1.32, 1.36], .065, 142, 3, { noSolid: true, noCheck: true, min: 8 }); S.ell([sx * .09, 1.56, 1.38], .05, 142, 3, { noSolid: true, noCheck: true, min: 6 });
    S.tube([[sx * .15, .95, 1.4, .08, 3], [sx * .2, .7, 1.58, .05, 3], [sx * .1, .45, 1.5, .01, 3]], 139, { sub: 3, noSolid: true });
  }
  for (const sx of [1, -1]) for (let i = 0; i < 4; i++) {
    const b = bones.length, zb = [.55, .2, -.15, -.5][i], zf = [2.0, .9, -.6, -1.8][i], base = [sx * .75, 1.25, zb], knee = [sx * 1.7, 2.2, (zb + zf) / 2 + .15], foot = [sx * 2.6, 0, zf];
    bones.push({ p: 1, v: base });
    S.tube([[...base, .14, b], [...knee, .1, b], [...foot, .03, b]], 138, { sub: 4, noSolid: true });
    S.cone(knee, V.add(knee, [sx * .15, .35, 0]), .06, 139, b);
  }
  return { bones, data: S.build() };
}
function buildSpiderling() {
  const S = new SplatSet(82, 900), bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, .35, 0] }];
  S.ell([0, .35, .12], [.2, .15, .2], 136, 1); S.ell([0, .42, -.22], [.26, .22, .3], (p, n) => n[1] > .5 ? 137 : 136, 1);
  for (const sx of [1, -1]) { S.ell([sx * .07, .42, .3], .04, 142, 1, { noSolid: true, noCheck: true, min: 6 }); for (let i = 0; i < 4; i++) { const zb = .18 - i * .12; S.tube([[sx * .15, .35, zb, .035, 1], [sx * .45, .55, zb + .05, .03, 1], [sx * .65, 0, zb + (i < 2 ? .25 : -.2), .015, 1]], 138, { sub: 2, noSolid: true, minSeg: 4 }); } }
  return { bones, data: S.build() };
}
function buildEye() {
  const S = new SplatSet(83, 380), C = [0, 2.6, 0], bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: C }, { p: 1, v: C }];
  S.ell(C, 1.25, p => (Math.abs(Math.sin(p[0] * 5 + p[1] * 3 + p[2] * 4)) < .07 ? 145 : 144), 1);
  S.ell([0, 2.6, 1.17], [.62, .62, .16], 150, 2, { noSolid: true, noCheck: true, em: .9 });
  S.ell([0, 2.6, 1.31], [.22, .38, .05], 145, 2, { noSolid: true, noCheck: true });
  for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; S.cone([Math.cos(a) * .9, 3.4, Math.sin(a) * .9 - .2], [Math.cos(a) * 1.5, 4.3, Math.sin(a) * 1.5 - .4], .14, 146, 1); }
  for (let k = 0; k < 4; k++) { const b = bones.length, a = k / 4 * 6.283, p = [Math.cos(a) * 2.3, 2.6, Math.sin(a) * 2.3]; bones.push({ p: 0, v: C }); S.cone(p, V.add(p, [0, .5, 0]), .22, 146, b); S.cone(p, V.add(p, [0, -.45, 0]), .22, 146, b); S.ell(p, .1, 151, b, { noSolid: true, noCheck: true, min: 10 }); }
  for (let k = 0; k < 6; k++) { const b = bones.length, a = k / 6 * 6.283 + .3, st = [Math.cos(a) * .6, 1.55, Math.sin(a) * .6]; bones.push({ p: 1, v: st }); S.tube([[...st, .16, b], [st[0] * 1.6, .9, st[2] * 1.6, .1, b], [st[0] * 1.2, .3, st[2] * 1.2, .02, b]], 147, { sub: 4, noSolid: true }); }
  return { bones, data: S.build() };
}
/** Boneco de treino do Bairro Leste: poste, palha e um alvo pintado. Balança quando apanha. */
function buildDummy() {
  const S = new SplatSet(67, 900), bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, .9, 0] }];
  S.tube([[0, 0, 0, .07, 0], [0, 1.0, 0, .06, 0]], 12, { sub: 1 });
  S.ell([0, 1.35, 0], [.32, .42, .26], 17, 1);
  S.tube([[-.62, 1.5, 0, .05, 1], [.62, 1.5, 0, .05, 1]], 12, { sub: 1 });
  for (const sx of [-1, 1]) S.ell([sx * .6, 1.5, 0], [.12, .1, .1], 17, 1);
  S.ell([0, 1.95, 0], [.2, .2, .2], 17, 1);
  S.ell([0, 1.38, .25], [.16, .16, .03], 16, 1); S.ell([0, 1.38, .27], [.07, .07, .02], 28, 1);
  return { bones, data: S.build() };
}
function buildPylon() {
  const S = new SplatSet(66, 420), bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, 2.0, 0] }];
  S.box([0, .15, 0], [.55, .15, .55], 11, 0);
  S.tube([[0, .3, 0, .3, 0], [0, 1.15, 0, .2, 0]], 11, { sub: 1 });
  for (let k = 0; k < 4; k++) { const a = k / 4 * 6.283 + .785; S.cone([Math.cos(a) * .45, .3, Math.sin(a) * .45], [Math.cos(a) * .38, 1.35, Math.sin(a) * .38], .08, 11, 0); }
  S.cone([0, 2.0, 0], [0, 2.5, 0], .22, 124, 1); S.cone([0, 2.0, 0], [0, 1.55, 0], .22, 124, 1);
  return { bones, data: S.build() };
}
function buildPedestal() {
  const S = new SplatSet(65, 260), bones = [{ p: -1, v: [0, 0, 0] }];
  S.box([0, -.1, 0], [1.3, .1, 1.3], 11, 0, { faces: 'tnsew' });
  const r = []; for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; r.push([Math.cos(a) * 1.05, .01, Math.sin(a) * 1.05, .02, 0]); }
  S.tube(r, 31, { closed: true, sub: 2, noSolid: true });
  return { bones, data: S.build() };
}

function buildChicken() {
  const S = new SplatSet(72, 1400), bones = [{ p: -1, v: [0, 0, 0] }, { p: 0, v: [0, .25, 0] }, { p: 1, v: [0, .36, .1] }];
  S.ell([0, .25, 0], [.15, .14, .2], 28, 1);
  S.cone([0, .3, -.15], [0, .45, -.26], .08, 28, 1);
  S.ell([0, .42, .13], [.08, .085, .08], 28, 2);
  S.ell([0, .51, .13], [.02, .04, .05], 16, 2, { noSolid: true, noCheck: true, min: 8 });
  S.cone([0, .42, .2], [0, .41, .28], .03, 17, 2, { minSeg: 6 });
  for (const sx of [1, -1]) { S.ell([sx * .045, .44, .19], .015, 29, 2, { noSolid: true, noCheck: true, min: 4 }); S.tube([[sx * .06, .13, 0, .015, 1], [sx * .06, 0, .02, .015, 1]], 17, { sub: 1, noSolid: true, minSeg: 6 }); S.ell([sx * .15, .26, -.02], [.03, .08, .12], 28, 1, { noCheck: true }); }
  return { bones, data: S.build() };
}

