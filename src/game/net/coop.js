/* Fios de Tessária · Co-op na Fenda do grupo (caminho A: o anfitrião simula) */
// Anfitrião (o líder, ou quem está há mais tempo na instância): simula inimigos e chefe como sempre e
// envia o estado deles pelo servidor (mensagens hx). Antes de cada inimigo pensar, o P aponta por um
// instante para o jogador mais próximo (alvo substituto): a IA de sempre persegue quem estiver perto,
// e o dano num companheiro vai pela rede (hto) em vez de tirar vida do anfitrião.
// Convidados: os inimigos e o chefe são cópias desenhadas a partir do estado; os acertos vão para o
// anfitrião (gx), que aplica o dano. Cada jogo dá o próprio XP e o próprio loot quando um inimigo cai.

const COOP = { nseq: 0, acc: 0, proxies: new Map(), byNid: new Map(), remoteHit: false };
// Campos de um inimigo (ou do chefe) que bastam para desenhar e animar a cópia.
const COOP_F = ['x', 'z', 'y', 'yaw', 'hp', 'maxHp', 'state', 'act', 'actT', 'hop', 'cd', 'moveAmt', 'walkPh', 'stance', 'spawnT', 'dieT', 'scale', 'shieldT', 'fade', 'st', 'phase2', 'invuln', 'blinkDis', 'dying', 'flash'];
const cr2 = v => (typeof v === 'number' ? Math.round(v * 100) / 100 : typeof v === 'boolean' ? (v ? 1 : 0) : v === undefined ? null : v);

/** Rede da instância, só dentro da Fenda do grupo. */
function coopNet() { const n = NETON(); return n && n.inst && n.room && RG && RG.key === 'rift' && G.rift ? n : null; }
function coopIsHost() { const n = coopNet(); return !!(n && n.isHost); }
/** Na Fenda do grupo e sem simular: não cria inimigos nem chefe; desenha o que o anfitrião manda. */
function coopIsGuest() { const n = coopNet(); return !!(n && !n.isHost); }
/** Algum jogador (o local ou, no anfitrião, um companheiro) está a menos de r do ponto. */
function coopNear(x, z, r) {
  if (P && Math.hypot(x - P.x, z - P.z) < r) return true;
  if (!coopIsHost()) return false;
  for (const q of COOP.proxies.values()) if (Math.hypot(x - q.x, z - q.z) < r) return true;
  return false;
}
function coopReset() { COOP.byNid.clear(); COOP.proxies.clear(); COOP.acc = 0; }

// ---------- anfitrião ----------
/** Companheiros como alvos: objetos com os campos que a IA lê do P. */
function coopTargets(dt) {
  const n = coopNet(), live = new Set();
  for (const r of n.players()) {
    if (r.x === undefined) continue;
    let q = COOP.proxies.get(r.id);
    if (!q) { q = { remote: r.id, y: 0, hp: 100, maxHp: 100, dieT: -1, iframe: 0, dashT: 0, vx: 0, vz: 0, slowT: 0, kx: 0, kz: 0 }; COOP.proxies.set(r.id, q); }
    q.x = r.x; q.z = r.z; q.yaw = r.yaw; q.iframe -= dt; q.live = true; live.add(r.id);
  }
  for (const [id, q] of COOP.proxies) if (!live.has(id)) { q.live = false; COOP.proxies.delete(id); }
  return [...COOP.proxies.values()];
}
function coopNearest(x, z, me, tg) {
  let best = me.dieT < 0 ? me : null, bd = best ? Math.hypot(me.x - x, me.z - z) : 1e9;
  for (const q of tg) { const d = Math.hypot(q.x - x, q.z - z); if (d < bd) { bd = d; best = q; } }
  return best || me;
}
/** Laço dos inimigos: normal fora do co-op; com alvo substituto no anfitrião; cópias no convidado. */
function coopUpdateEnemies(dt) {
  const n = coopNet();
  if (!n) { for (const e of enemies) updateEnemy(e, dt); return; }
  if (!n.isHost) { for (const e of enemies) coopProxyEnemy(e, dt); return; }
  const tg = coopTargets(dt), me = P;
  for (const e of enemies) { if (!e.nid) e.nid = n.selfId * 100000 + (++COOP.nseq); P = coopNearest(e.x, e.z, me, tg); try { updateEnemy(e, dt); } finally { P = me; } }
}
function coopUpdateBoss(dt) {
  if (!boss) return;
  const n = coopNet();
  if (!n) return updateBoss(boss, dt);
  if (!n.isHost) return coopProxyBoss(boss, dt);
  const tg = [...COOP.proxies.values()], me = P;
  P = coopNearest(boss.x, boss.z, me, tg); try { updateBoss(boss, dt); } finally { P = me; }
}
/** hurtPlayer com o P apontando para um companheiro: o dano vai pela rede. */
function coopHurtRemote(dmg, sx, sz, kb) {
  const q = P, n = coopNet(); if (!n || q.iframe > 0) return false;
  q.iframe = .5; n.hto(q.remote, { k: 'h', d: Math.round(dmg), x: cr2(sx), z: cr2(sz), kb: cr2(kb) });
  return true;
}
/** Telegrafado terminou no anfitrião: confere também cada companheiro (a função lê o P). */
function coopEcho(fn) {
  if (!coopIsHost() || !COOP.proxies.size) return;
  const me = P;
  for (const q of COOP.proxies.values()) { P = q; try { fn(); } catch (e) { /* efeito só visual */ } finally { P = me; } }
}
/** Projétil inimigo no anfitrião: acerta companheiros também. */
function coopProjHit(p) {
  if (!coopIsHost()) return false;
  for (const q of COOP.proxies.values()) {
    if (Math.hypot(q.x - p.x, q.z - p.z) < .45 + p.r && Math.abs(p.y - 1) < 1.3) { const me = P; P = q; try { hurtPlayer(p.dmg, p.x - p.vx, p.z - p.vz); } finally { P = me; } return true; }
  }
  return false;
}
const coopPack = o => COOP_F.map(k => cr2(o[k]));
function coopPlain(o) {
  const r = {};
  for (const k in o) { const v = o[k]; if (k[0] === '_') continue; if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') r[k] = cr2(v); else if (Array.isArray(v) && v.every(x => typeof x === 'number')) r[k] = v.map(cr2); }
  return r;
}
/** Uma vez por quadro, no fim do laço: projéteis e telegrafados novos, e o estado 10x por segundo. */
function coopTick(dt) {
  const n = coopNet(); if (!n || !n.isHost) return;
  const shots = [], tl = [];
  for (const p of projs) if (!p._n) { p._n = 1; if (p.team === 'e') shots.push(coopPlain(p)); }
  for (const t of tels) if (!t._n) { t._n = 1; tl.push(coopPlain(t)); }
  if (shots.length || tl.length) n.hx({ k: 'fx', p: shots, t: tl });
  COOP.acc += dt; if (COOP.acc < .1) return; COOP.acc = 0;
  n.hx({
    k: 's', pr: cr2(G.rift.prog), bu: G.rift.bossUp ? 1 : 0,
    e: enemies.filter(e => !e.dead && e.nid).map(e => [e.nid, e.type, e.elite ? (e.elite.aff || []).join(',') + '|' + (e.elite.name || '') : '', e.thief ? 1 : 0, coopPack(e)]),
    b: boss ? [boss.type, coopPack(boss)] : null,
  });
}
function coopKilled(e) { const n = coopNet(); if (n && n.isHost && e.nid) n.hx({ k: 'k', nid: e.nid }); }
function coopBossStart(rm) { const n = coopNet(); if (n && n.isHost) n.hx({ k: 'bs', i: RG.rooms.indexOf(rm) }); }
function coopBossDone() { const n = coopNet(); if (n && n.isHost) n.hx({ k: 'bd' }); }

// ---------- convidado ----------
function coopProxyEnemy(e, dt) {
  if (!e.proxy) return updateEnemy(e, dt);   // virou inimigo de verdade (troca de anfitrião)
  e.t += dt; e.flash = Math.max(0, (e.flash || 0) - dt * 6); e.actT = (e.actT || 0) + dt;
  if (e.tx !== undefined) { const k = 1 - Math.exp(-dt * 12); e.x = lerp(e.x, e.tx, k); e.z = lerp(e.z, e.tz, k); }
  if (e.dieT >= 0) { e.dieT += dt; if (e.dieT > .6) e.dead = true; }
  else if (e.spawnT > 0) e.spawnT -= dt;
  if (e.gone && e.dieT < 0) e.dead = true;
}
function coopProxyBoss(b, dt) {
  b.t = (b.t || 0) + dt; b.actT = (b.actT || 0) + dt; b.flash = Math.max(0, (b.flash || 0) - dt * 6);
  if (b.tx !== undefined) { const k = 1 - Math.exp(-dt * 10); b.x = lerp(b.x, b.tx, k); b.z = lerp(b.z, b.tz, k); }
  if (b.dying) b.dieT = (b.dieT || 0) + dt;
}
function coopApply(o, vals, fresh) {
  COOP_F.forEach((k, i) => {
    const v = vals[i]; if (v === null || v === undefined) return;
    if (k === 'x') { o.tx = v; if (fresh) o.x = v; } else if (k === 'z') { o.tz = v; if (fresh) o.z = v; }
    else if (k === 'dieT') { if (v >= 0 && !(o.dieT >= 0)) o.dieT = v; } else if (k === 'flash') { if (v > (o.flash || 0)) o.flash = v; }
    else if (k === 'dying') o.dying = !!v; else o[k] = v;
  });
}
function coopSnap(d) {
  const seen = new Set();
  for (const [nid, type, el, thief, vals] of d.e || []) {
    seen.add(nid);
    let e = COOP.byNid.get(nid), fresh = false;
    if (!e || (e.dead && !e.dieT)) {
      if (!DEF[type]) continue;
      e = spawnEnemy(type, vals[0], vals[1], 0); e.nid = nid; e.proxy = true; fresh = true;
      if (el) { const [aff, name] = el.split('|'); e.elite = { aff: aff ? aff.split(',') : [], name: name || '' }; }
      if (thief) e.thief = true;
      COOP.byNid.set(nid, e);
    }
    coopApply(e, vals, fresh);
  }
  for (const e of enemies) if (e.proxy && !seen.has(e.nid) && e.dieT < 0) e.gone = true;
  if (d.b && boss && boss.proxy) coopApply(boss, d.b[1], false);
  G.rift.prog = d.pr; if (d.bu) G.rift.bossUp = true;
}
function coopHitEnemy(e, dmg, dx, dz, crit, kbm) {
  const n = coopNet(); if (!n || e.dieT >= 0 || e.spawnT > 0) return;
  dmg = Math.round(dmg); e.flash = 1; e.hitT = .18; lifeSteal(dmg); if (crit) hitStop(.045);
  popNum(e.x, 1.6 * e.scale, e.z, crit ? dmg + '!' : '' + dmg, crit ? 'crit' : ''); sfx('hit'); burst(e.x, 1, e.z, 6, 7, 3, .3, .1);
  n.gx({ k: 'h', nid: e.nid, d: dmg, c: crit ? 1 : 0, x: cr2(dx), z: cr2(dz), kb: cr2(kbm) });
}
function coopHitBoss(b, dmg, crit, h) {
  const n = coopNet(); if (!n || b.dying) return;
  dmg = Math.round(dmg); b.flash = 1; lifeSteal(dmg); if (crit) hitStop(.05);
  popNum(h[0], 3.2, h[1], crit ? dmg + '!' : '' + dmg, crit ? 'crit' : ''); sfx('hit'); burst(h[0], 1.6, h[1], 6, 7, 3, .3, .12);
  n.gx({ k: 'bh', d: dmg, c: crit ? 1 : 0 });
}
/** Inimigo caiu no anfitrião: cada convidado ganha o próprio XP, Centelhas e chance de item. */
function coopReward(e) {
  if (e.rewarded) return; e.rewarded = true;
  if (!(e.dieT >= 0)) e.dieT = 0;
  G.save.kills++;
  dropGold(e.x, e.z, e.def.gold + Math.floor(rr(0, 3)));
  if (Math.random() < .07) pickups.push({ kind: 'heart', x: e.x, y: .5, z: e.z, vx: 0, vy: 3, vz: 0, t: 0 });
  if (Math.random() < .08 * stats().itemFind) dropItem(e.x, e.z, rollRar(G.rift && G.rift.L >= 4 ? 1 : 0));
  onEnemyKilled(e);
}

// ---------- mensagens ----------
function coopMsg(kind, from, d) {
  const n = coopNet(); if (!n || !d) return;
  if (kind === 'gx') {                      // anfitrião recebe acertos
    if (!n.isHost) return;
    if (d.k === 'h') { const e = enemies.find(x => x.nid === d.nid); if (e && e.dieT < 0 && !e.dead) { COOP.remoteHit = true; try { hurtEnemy(e, +d.d || 0, +d.x || 0, +d.z || 0, !!d.c, +d.kb || 1); } finally { COOP.remoteHit = false; } } }
    else if (d.k === 'bh' && boss && !boss.dying) { COOP.remoteHit = true; try { hurtBoss(boss, +d.d || 0, !!d.c, bossHits(boss)[0]); } finally { COOP.remoteHit = false; } }
    return;
  }
  if (n.isHost) return;                     // daqui em diante: convidado recebe do anfitrião
  if (d.k === 's') coopSnap(d);
  else if (d.k === 'k') { const e = COOP.byNid.get(d.nid); if (e) coopReward(e); }
  else if (d.k === 'h') hurtPlayer(+d.d || 0, +d.x || 0, +d.z || 0, +d.kb || 7);
  else if (d.k === 'fx') {
    for (const s of d.p || []) shoot(Object.assign({}, s, { team: 'x', _n: 1 }));
    for (const t of d.t || []) tels.push(Object.assign({}, t, { _n: 1 }));
  }
  else if (d.k === 'bs') { const rm = RG.rooms[d.i]; if (rm && !boss) { startBoss(rm); if (boss) boss.proxy = true; } }
  else if (d.k === 'bd') { if (boss && !boss.done) { boss.done = true; boss.hp = 0; finishBoss(boss); } }
}
/** Este jogo passou a simular (ou deixou de simular): as cópias viram inimigos de verdade, e vice-versa. */
function coopHost(isHost) {
  if (!coopNet()) return;
  for (const e of enemies) { if (isHost) { if (e.proxy) { e.proxy = false; if (e.tx !== undefined) { e.x = e.tx; e.z = e.tz; } } } else if (!e.proxy) { e.proxy = true; if (e.nid) COOP.byNid.set(e.nid, e); } }
  if (boss) boss.proxy = !isHost;
}
if (window.TessGame) Object.assign(window.TessGame, { coopMsg, coopHost });
