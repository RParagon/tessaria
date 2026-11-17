/* Fios de Tessária · Gerador de splats (SplatSet) */
/* =========================================================
   GERADOR DE SPLATS
   flags: 1 dupla face · 2 emissivo · 4 recebe sombra · 8 oclusor (some na frente do herói) · 16 tremeluz
   ========================================================= */
const STRIDE = 10;
function catmull(p0, p1, p2, p3, u) {
  const u2 = u * u, u3 = u2 * u, o = [];
  for (let i = 0; i < 3; i++) o.push(0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * u + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * u2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * u3));
  return o;
}
function smoothPath(nodes, sub, closed) {
  const N = nodes.length, out = [];
  const get = i => closed ? nodes[(i + N) % N] : nodes[clamp(i, 0, N - 1)];
  const segs = closed ? N : N - 1;
  for (let j = 0; j < segs; j++) {
    const p0 = get(j - 1), p1 = get(j), p2 = get(j + 1), p3 = get(j + 2);
    for (let s = 0; s < sub; s++) { const u = s / sub; out.push({ p: catmull(p0, p1, p2, p3, u), r: lerp(p1[3], p2[3], u), b: p1[4] }); }
  }
  if (closed) out.push({ p: out[0].p.slice(), r: out[0].r, b: out[0].b });
  else { const l = nodes[N - 1]; out.push({ p: [l[0], l[1], l[2]], r: l[3], b: nodes[N - 2][4] }); }
  return out;
}
class SplatSet {
  constructor(seed, density, remap, world) { this.R = rng(seed); this.D = density; this.remap = remap || null; this.world = !!world; this.parts = []; this.solids = []; this.out = []; this.sid = 0; }
  _sEll(c, r) { const id = this.sid++; this.solids.push({ k: 0, id, c, r, bc: c, br: Math.max(r[0], r[1], r[2]) }); return id; }
  _sSeg(a, b, ra, rb) { const id = this.sid++; this.solids.push({ k: 1, id, a, b, ra, rb, bc: V.lerp(a, b, .5), br: V.len(V.sub(b, a)) / 2 + Math.max(ra, rb) }); return id; }
  inside(p, skip) {
    for (const s of this.solids) {
      if (s.id === skip) continue;
      if (V.d2(p, s.bc) > s.br * s.br) continue;
      if (s.k === 0) {
        const x = (p[0] - s.c[0]) / s.r[0], y = (p[1] - s.c[1]) / s.r[1], z = (p[2] - s.c[2]) / s.r[2];
        if (x * x + y * y + z * z < 0.92) return true;
      } else {
        const ab = V.sub(s.b, s.a), ap = V.sub(p, s.a), L2 = V.dot(ab, ab);
        const t = L2 > 0 ? clamp(V.dot(ap, ab) / L2, 0, 1) : 0;
        if (V.len(V.sub(ap, V.mul(ab, t))) < lerp(s.ra, s.rb, t) * 0.94) return true;
      }
    }
    return false;
  }
  ell(c, r, mat, bone, o = {}) {
    if (typeof r === 'number') r = [r, r, r];
    const P = { k: 'ell', c, r, mat, bone, o, sid: -1 };
    if (!this.world && !o.noSolid && !o.inward) P.sid = this._sEll(c, r);
    this.parts.push(P); return this;
  }
  tube(nodes, mat, o = {}) {
    const path = smoothPath(nodes, o.sub || 6, o.closed);
    const P = { k: 'tube', path, mat, o, sids: [] };
    const mn = Math.min(o.sx || 1, o.sy || 1);
    for (let i = 0; i < path.length - 1; i++) P.sids.push(this.world || o.noSolid ? -1 : this._sSeg(path[i].p, path[i + 1].p, path[i].r * mn, path[i + 1].r * mn));
    this.parts.push(P);
    if (o.spines) this._spines(path, o.spines, o.sy || 1);
    return this;
  }
  cone(a, b, r, mat, bone, o = {}) { return this.tube([[...a, r, bone], [...b, 0.006, bone]], mat, Object.assign({ sub: 1, noSolid: true }, o)); }
  box(c, h, mat, bone, o = {}) { this.parts.push({ k: 'box', c, h, mat, bone, o }); return this; }
  mem(tris, mat, boneFn, o = {}) { this.parts.push({ k: 'mem', tris, mat, boneFn, o }); return this; }
  pt(p, n, mat, bone, size, flags = 0, em = .85) {
    if (this.remap && this.remap[mat] !== undefined) mat = this.remap[mat];
    if (isEm(mat)) { flags |= 2; n = [em, 0, 0]; }
    this.out.push(p[0], p[1], p[2], n[0], n[1], n[2], mat, bone, size, flags);
  }
  frame(t) {
    const side = Math.abs(t[1]) < 0.9 ? V.norm([-t[2], 0, t[0]]) : V.norm([t[1], -t[0], 0]);
    return [side, V.cross(side, t)];
  }
  _spines(path, sp, sy) {
    let acc = sp.step * 0.5;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1], seg = V.sub(b.p, a.p), L = V.len(seg);
      if (L < 1e-6) continue;
      const t = V.mul(seg, 1 / L), [, up] = this.frame(t);
      while (acc < L) {
        const u = acc / L, r = lerp(a.r, b.r, u), c = V.add(a.p, V.mul(seg, u));
        const g = (i + u) / (path.length - 1), h = lerp(sp.h[0], sp.h[1], g);
        const base = V.add(c, V.mul(up, r * sy * 0.8));
        const tip = V.add(base, V.add(V.mul(up, h), V.mul(t, h * sp.lean)));
        this.cone(base, tip, h * 0.32, sp.mat, a.b);
        acc += sp.step;
      }
      acc -= L;
    }
  }
  build() {
    const R = this.R;
    const M = (m, p, n, g) => typeof m === 'function' ? m(p, n, g) : m;
    for (const P of this.parts) {
      const o = P.o, Dd = this.D * (o.dm || 1), base = 2.4 / Math.sqrt(Dd) * (o.size || 1), check = !o.noCheck && !this.world;
      const fl = o.flags || 0, em = o.em ?? .85;
      const emit = (p, n, mat, bone, size, flags, skip) => { if (check && this.inside(p, skip)) return; this.pt(p, n, mat, bone, size, flags | fl, em); };
      if (P.k === 'ell') {
        const [a, b, c] = P.r, q = 1.6;
        const area = 4 * Math.PI * Math.pow((Math.pow(a * b, q) + Math.pow(a * c, q) + Math.pow(b * c, q)) / 3, 1 / q);
        const n = Math.max(o.min || 14, Math.round(area * Dd));
        for (let i = 0; i < n; i++) {
          const z = R() * 2 - 1, th = R() * Math.PI * 2, s = Math.sqrt(1 - z * z);
          const d = [s * Math.cos(th), s * Math.sin(th), z];
          if (o.keep && !o.keep(d)) continue;
          const p = [P.c[0] + d[0] * a, P.c[1] + d[1] * b, P.c[2] + d[2] * c];
          if (o.cut && o.cut.some(k => V.d2(p, k.c) < k.r * k.r)) continue;
          let nn = V.norm([d[0] / a, d[1] / b, d[2] / c]);
          if (o.inward) nn = V.mul(nn, -1);
          const size = Math.min(base * (0.75 + 0.5 * R()), Math.max(0.03, Math.min(a, b, c) * 1.7 * (o.size || 1)));
          emit(p, nn, M(P.mat, p, nn, 0), P.bone, size, 0, P.sid);
        }
      } else if (P.k === 'tube') {
        const sx = o.sx || 1, sy = o.sy || 1, path = P.path;
        for (let i = 0; i < path.length - 1; i++) {
          const A = path[i], B = path[i + 1], seg = V.sub(B.p, A.p), L = V.len(seg);
          if (L < 1e-6) continue;
          const t = V.mul(seg, 1 / L), [side, up] = this.frame(t);
          const area = 2 * Math.PI * (A.r + B.r) / 2 * L * (sx + sy) / 2;
          const nf = area * Dd, n = Math.max(o.minSeg || 0, Math.floor(nf) + (R() < nf % 1 ? 1 : 0));
          const slope = (A.r - B.r) / L;
          for (let k = 0; k < n; k++) {
            const u = R(), th = R() * Math.PI * 2, r = lerp(A.r, B.r, u), cs = Math.cos(th), sn = Math.sin(th);
            const c = V.add(A.p, V.mul(seg, u));
            const p = [c[0] + (side[0] * cs * sx + up[0] * sn * sy) * r, c[1] + (side[1] * cs * sx + up[1] * sn * sy) * r, c[2] + (side[2] * cs * sx + up[2] * sn * sy) * r];
            const nn = V.norm(V.add(V.add(V.mul(side, cs / sx), V.mul(up, sn / sy)), V.mul(t, slope)));
            const size = Math.min(base * (0.75 + 0.5 * R()), Math.max(0.028, r * 2.4));
            emit(p, nn, M(P.mat, p, nn, (i + u) / (path.length - 1)), A.b, size, 0, P.sids[i]);
          }
        }
      } else if (P.k === 'box') {
        const c = P.c, h = P.h;
        for (const f of (o.faces || 'tnsew')) {
          const a = (f === 't' || f === 'b') ? 1 : (f === 'n' || f === 's') ? 2 : 0;
          const s = (f === 't' || f === 's' || f === 'e') ? 1 : -1;
          const u = (a + 1) % 3, v = (a + 2) % 3, area = 4 * h[u] * h[v];
          const n = Math.max(4, Math.round(area * Dd)), nn = [0, 0, 0]; nn[a] = s;
          for (let i = 0; i < n; i++) {
            const p = [0, 0, 0]; p[a] = c[a] + s * h[a]; p[u] = c[u] + (R() * 2 - 1) * h[u]; p[v] = c[v] + (R() * 2 - 1) * h[v];
            emit(p, nn, M(P.mat, p, nn, 0), P.bone, base * (0.75 + 0.5 * R()), 0, -1);
          }
        }
      } else if (P.k === 'mem') {
        for (const Tr of P.tris) {
          const [w, A, B, sc = 0] = Tr, e1 = V.sub(A, w), e2 = V.sub(B, w), cr = V.cross(e1, e2);
          const area = V.len(cr) / 2, nn = V.norm(cr), n = Math.round(area * Dd);
          for (let k = 0; k < n; k++) {
            let r1 = R(), r2 = R();
            if (r1 + r2 > 1) { r1 = 1 - r1; r2 = 1 - r2; }
            const uw = 1 - r1 - r2, s = r2 / Math.max(1e-6, r1 + r2);
            if (sc > 0 && uw < sc * Math.sin(Math.PI * s)) continue;
            const p = V.add(V.add(w, V.add(V.mul(e1, r1), V.mul(e2, r2))), V.mul(nn, (R() - .5) * 0.02));
            emit(p, nn, M(P.mat, p, nn, 0), P.boneFn(p), base * (0.75 + 0.5 * R()), 1, -1);
          }
        }
      }
    }
    return new Float32Array(this.out);
  }
}

