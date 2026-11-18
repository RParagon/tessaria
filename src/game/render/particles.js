/* Fios de Tessária · Partículas e pontos dinâmicos */
/* =========================================================
   PARTÍCULAS E PONTOS DINÂMICOS
   ========================================================= */
function spawn(o) { if (parts.length >= PMAX) return; parts.push(Object.assign({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 1, s0: .1, s1: .05, b0: 1, b1: 0, mat: 21, drag: 0, buoy: 0, floor: false }, o)); }
function burst(x, y, z, n, mat, sp = 3, life = .5, size = .14) { for (let i = 0; i < n; i++) { const a = rr(0, 6.28), e = rr(-.3, 1); spawn({ x, y, z, vx: Math.cos(a) * sp * rr(.3, 1), vy: e * sp, vz: Math.sin(a) * sp * rr(.3, 1), life: rr(life * .6, life), s0: size, s1: .02, b0: 1, b1: .1, mat, drag: 2, buoy: -2, floor: true }); } }
function dyn(x, y, z, shade, mat, size) { if (dynN >= DYN_MAX) return; const o = dynN * STRIDE; pData[o] = x; pData[o + 1] = y; pData[o + 2] = z; pData[o + 3] = shade; pData[o + 4] = 0; pData[o + 5] = 0; pData[o + 6] = mat; pData[o + 7] = 0; pData[o + 8] = size; pData[o + 9] = 2; dynN++; }
function updateParticles(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.age += dt;
    if (p.age >= p.life) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
    const k = Math.exp(-p.drag * dt);
    p.vx *= k; p.vy = p.vy * k + p.buoy * dt; p.vz *= k;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.floor && p.y < .06) { p.y = .06; p.vy = Math.abs(p.vy) * .2; }
  }
}
let emitAcc = {};
function rate(key, perSec, dt, fn) { emitAcc[key] = (emitAcc[key] || 0) + perSec * dt; let n = 0; while (emitAcc[key] >= 1 && n < 60) { emitAcc[key] -= 1; fn(); n++; } }
function updateEmitters(dt, cx, cz) {
  if (!WD) return;
  const torch = REG[RG.key].torch;
  WD.emitters.forEach((e, i) => {
    if (Math.abs(e.x - cx) > 26 || Math.abs(e.z - cz) > 22) return;
    const k = 'em' + i;
    switch (e.t) {
      case 'torch': rate(k, 30, dt, () => spawn({ x: e.x + rr(-.06, .06), y: e.y, z: e.z + rr(-.06, .06), vy: rr(.6, 1.2), vx: rr(-.15, .15), life: rr(.3, .5), s0: .16, s1: .03, b0: 1, b1: .15, mat: torch, drag: 1 })); break;
      case 'voidflame': rate(k, 18, dt, () => spawn({ x: e.x + rr(-.12, .12), y: e.y, z: e.z + rr(-.12, .12), vy: rr(.7, 1.4), vx: rr(-.1, .1), life: rr(.35, .6), s0: .16, s1: .03, b0: 1, b1: .1, mat: Math.random() < .25 ? 29 : 151, drag: 1 })); break;
      case 'voidmist': rate(k, 3, dt, () => spawn({ x: e.x + rr(-1, 1), y: e.y, z: e.z + rr(-.8, .8), vx: rr(-.1, .1), vy: rr(.15, .4), vz: rr(-.1, .1), life: rr(1.5, 2.5), s0: .07, s1: .02, b0: .9, b1: .1, mat: 151, drag: .3 })); break;   // centelhas violeta subindo do estrado
      case 'candle': rate(k, 8, dt, () => spawn({ x: e.x + rr(-.2, .2), y: e.y, z: e.z + rr(-.2, .2), vy: rr(.3, .6), life: .5, s0: .07, s1: .02, b0: 1, b1: .2, mat: 14 })); break;
      case 'smoke': rate(k, 4, dt, () => spawn({ x: e.x, y: e.y, z: e.z, vx: rr(-.1, .2), vy: rr(.4, .7), vz: rr(-.1, .1), life: rr(2, 3), s0: .12, s1: .4, b0: .18, b1: .02, mat: 21, drag: .3 })); break;
      case 'forge': rate(k, 14, dt, () => spawn({ x: e.x + rr(-.2, .2), y: e.y, z: e.z + rr(-.2, .2), vx: rr(-.6, .6), vy: rr(1.5, 3), vz: rr(-.6, .6), life: rr(.4, .8), s0: .05, s1: .02, b0: 1, b1: .3, mat: 14, buoy: -3 })); break;
      case 'glow': rate(k, 2, dt, () => spawn({ x: e.x + rr(-.3, .3), y: e.y + rr(-.2, .2), z: e.z + rr(-.3, .3), vy: rr(.05, .2), life: 1.5, s0: .05, s1: .02, b0: .8, b1: .1, mat: 14 })); break;
      case 'crystal': rate(k, 10, dt, () => { const a = rr(0, 6.28); spawn({ x: e.x + Math.cos(a) * .6, y: e.y - .5, z: e.z + Math.sin(a) * .6, vy: rr(.6, 1.2), life: rr(1, 1.6), s0: .07, s1: .02, b0: 1, b1: .2, mat: 31 }); }); break;
      case 'spore': rate(k, 1.5, dt, () => spawn({ x: e.x, y: e.y, z: e.z, vx: rr(-.15, .15), vy: rr(.2, .4), vz: rr(-.15, .15), life: rr(2, 3.5), s0: .05, s1: .02, b0: .9, b1: .1, mat: 14 })); break;
      case 'lava': rate(k, 2, dt, () => spawn({ x: e.x + rr(-.8, .8), y: 0, z: e.z + rr(-.8, .8), vy: rr(1, 2.5), life: rr(.5, .9), s0: .1, s1: .03, b0: 1, b1: .2, mat: 14, buoy: -5 })); break;
      case 'fly': rate(k, .9, dt, () => spawn({ x: e.x + rr(-2.5, 2.5), y: rr(.3, 1.6), z: e.z + rr(-2.5, 2.5), vx: rr(-.3, .3), vy: rr(-.1, .2), vz: rr(-.3, .3), life: rr(2, 3.5), s0: .05, s1: .05, b0: .9, b1: .1, mat: 14 })); break;
      case 'mist': rate(k, 1.2, dt, () => spawn({ x: e.x + rr(-1.2, 1.2), y: e.y, z: e.z + rr(-1.2, 1.2), vx: rr(-.15, .15), vy: rr(.02, .08), vz: rr(-.15, .15), life: rr(3, 5), s0: .3, s1: .9, b0: .2, b1: .02, mat: 11, drag: .2 })); break;
      case 'bubble': rate(k, 1.5, dt, () => spawn({ x: e.x + rr(-.6, .6), y: -.05, z: e.z + rr(-.6, .6), vy: rr(.2, .5), life: rr(.4, .8), s0: .06, s1: .14, b0: .7, b1: .1, mat: 14 })); break;
      case 'shine': rate(k, 3, dt, () => spawn({ x: e.x + rr(-.4, .4), y: e.y + rr(-.4, .4), z: e.z + rr(-.4, .4), vy: rr(.1, .4), life: rr(.6, 1.1), s0: .06, s1: .01, b0: 1, b1: .1, mat: 14 })); break;
      case 'dust': rate(k, 2.5, dt, () => spawn({ x: e.x + rr(-6, 6), y: e.y + rr(0, 2), z: e.z + rr(-5, 5), vx: rr(-.1, .1), vy: rr(-.5, -.2), vz: rr(-.1, .1), life: rr(3, 5), s0: .05, s1: .05, b0: .9, b1: .1, mat: 13 })); break;
      case 'vent': rate(k, 6, dt, () => spawn({ x: e.x, y: e.y, z: e.z, vx: rr(-.1, .1), vy: rr(.8, 1.4), vz: rr(-.1, .1), life: rr(.8, 1.4), s0: .08, s1: .3, b0: .4, b1: .02, mat: 14, drag: .6 })); break;
    }
  });
}

