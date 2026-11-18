/* Fios de Tessária · Co-op na Fenda do grupo (caminho A: o anfitrião simula) */
// Anfitrião (o líder, ou quem está há mais tempo na instância): simula inimigos e chefe como sempre e
// envia o estado deles pelo servidor (mensagens hx). Antes de cada inimigo pensar, o P aponta por um
// instante para o jogador mais próximo (alvo substituto): a IA de sempre persegue quem estiver perto,
// e o dano num companheiro vai pela rede (hto) em vez de tirar vida do anfitrião.
// Convidados: os inimigos e o chefe são cópias desenhadas a partir do estado; os acertos vão para o
// anfitrião (gx), que aplica o dano. Cada jogo dá o próprio XP e o próprio loot quando um inimigo cai.

const COOP = { nseq: 0, acc: 0, proxies: new Map(), byNid: new Map(), remoteHit: false, sew: null, wipeT: 0 };
// Mesmos valores de shared/protocol.ts (o jogo ainda não importa módulos).
const CO_HP = [1, 1, 1.75, 2.5, 3.25], CO_DMG = [1, 1, 1.1, 1.15, 1.2], CO_DOWN = 15, CO_SEW = 3, CO_SEW_HP = .3, CO_SHARE = 30;
/** Jogadores na instância (este e os da sala), de 1 a 4. */
function coopCount() { const n = coopNet(); return n ? Math.min(4, 1 + n.players().length) : 1; }
function coopDmgMul() { return CO_DMG[coopCount()] || 1; }
/** Recompensa de um inimigo: quem estava a até 30 de distância ou acertou ele. Fora do co-op, sempre. */
function coopShare(e) { if (!coopNet()) return true; return !!e.hitByMe || (!!P && Math.hypot(P.x - e.x, P.z - e.z) < CO_SHARE); }
/** Inimigo caiu longe e sem acerto deste jogador: só conta o progresso da Fenda. */
function coopFarKill(e) { if (G.rift && !G.rift.bossUp) riftProgress(e.elite ? 8 : 2.4); }
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
    q.x = r.x; q.z = r.z; q.yaw = r.yaw; q.iframe -= dt; q.live = true; q.dieT = r.down ? 0 : -1; live.add(r.id);
  }
  for (const [id, q] of COOP.proxies) if (!live.has(id)) { q.live = false; COOP.proxies.delete(id); }
  return [...COOP.proxies.values()];
}
function coopNearest(x, z, me, tg) {
  let best = me.dieT < 0 && !(me.down > 0) ? me : null, bd = best ? Math.hypot(me.x - x, me.z - z) : 1e9;
  for (const q of tg) { if (q.dieT >= 0) continue; const d = Math.hypot(q.x - x, q.z - z); if (d < bd) { bd = d; best = q; } }
  return best || me;
}
/** Laço dos inimigos: normal fora do co-op; com alvo substituto no anfitrião; cópias no convidado. */
function coopUpdateEnemies(dt) {
  const n = coopNet();
  if (!n) { for (const e of enemies) updateEnemy(e, dt); return; }
  if (!n.isHost) { for (const e of enemies) coopProxyEnemy(e, dt); return; }
  const tg = coopTargets(dt), me = P;
  for (const e of enemies) { if (!e.nid) { e.nid = n.selfId * 100000 + (++COOP.nseq); const m = CO_HP[coopCount()] || 1; if (m > 1) { e.hp = Math.round(e.hp * m); e.maxHp = Math.round(e.maxHp * m); } } P = coopNearest(e.x, e.z, me, tg); try { updateEnemy(e, dt); } finally { P = me; } }
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
  q.iframe = .5; n.hto(q.remote, { k: 'h', d: Math.round(dmg * coopDmgMul()), x: cr2(sx), z: cr2(sz), kb: cr2(kb) });
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
  const n = coopNet(); if (!n) return;
  coopSewTick(n, dt);
  if (!n.isHost) return;
  coopCheckWipe(n, dt);
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
function coopBossStart(rm) {
  const n = coopNet(); if (!n || !n.isHost) return;
  const m = CO_HP[coopCount()] || 1; if (boss && m > 1) { boss.hp = Math.round(boss.hp * m); boss.maxHp = Math.round(boss.maxHp * m); updateBossBar(); }
  n.hx({ k: 'bs', i: RG.rooms.indexOf(rm) });
}
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
  dmg = Math.round(dmg); e.flash = 1; e.hitT = .18; e.hitByMe = true; lifeSteal(dmg); if (crit) hitStop(.045);
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
  if (!coopShare(e)) return;   // longe e sem ter acertado
  G.save.kills++;
  dropGold(e.x, e.z, e.def.gold + Math.floor(rr(0, 3)));
  if (Math.random() < .07) pickups.push({ kind: 'heart', x: e.x, y: .5, z: e.z, vx: 0, vy: 3, vz: 0, t: 0 });
  if (Math.random() < .08 * stats().itemFind) dropItem(e.x, e.z, rollRar(G.rift && G.rift.L >= 4 ? 1 : 0));
  const n0 = tels.length; onEnemyKilled(e); tels.length = n0;   // explosões chegam do anfitrião, não duplica
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
  if (kind === 'px') {                      // entre jogadores: caído, levantou, costurar
    const r = n.players().find(x => x.id === from);
    if (d.k === 'down' && r) r.down = true;
    else if (d.k === 'up' && r) r.down = false;
    else if (d.k === 'rev' && P && P.down > 0) coopRevived(r ? r.name : 'Um companheiro');
    return;
  }
  if (d.k === 'wipe') return coopWipe();
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

// ---------- Caído e Costurar ----------
/** A vida zerou: com algum companheiro de pé na Fenda, fica Caído em vez de morrer. */
function coopTryDown() {
  const n = coopNet(); if (!n || !P) return false;
  if (!n.players().some(r => !r.down)) return false;
  P.hp = 0; P.down = CO_DOWN; P.iframe = 0; P.act = null; P.emote = null; P.kx = P.kz = 0; COOP.sew = null;
  n.px({ k: 'down' });
  toast('CAÍDO', true, 'UM COMPANHEIRO PODE COSTURAR VOCÊ DE VOLTA'); sfx('hurt'); G.shake = Math.max(G.shake, .3);
  return true;
}
function coopDownTick(dt) {
  P.down -= dt; P.moveAmt = lerp(P.moveAmt || 0, 0, .3); P.vx = P.vz = 0;
  if (Math.random() < dt * 6) spawn({ x: P.x + rr(-.5, .5), y: rr(.1, .8), z: P.z + rr(-.5, .5), vy: rr(.3, .8), life: .8, s0: .08, s1: .02, b0: .8, b1: .1, mat: 7 });
  if (P.down <= 0) { P.down = 0; const n = coopNet(); if (n) n.px({ k: 'up' }); playerDie(); }
}
/** Pose de quem está caído: ajoelhado, cabeça baixa, braços largados. */
function coopDownPose(A, t) {
  A[1].ty = -.5; A[1].rx = .25; A[2].rx = .85; A[2].ry = 0; A[3].rx = .45 + Math.sin(t * 1.3) * .04;
  A[4].rx = .35; A[5].rx = .35; A[4].rz = .25; A[5].rz = -.25; A[6].rx = A[7].rx = -1.45;
}
function coopRevived(by) {
  const n = coopNet(); P.down = 0; P.hp = Math.max(1, Math.round(P.maxHp * CO_SEW_HP)); P.iframe = 1.5;
  if (n) n.px({ k: 'up' });
  toast('COSTURADO DE VOLTA', true, by.toUpperCase() + ' TE PUXOU PELOS FIOS'); sfx('lvl');
  burst(P.x, 1, P.z, 30, 7, 4, .6, .1);
}
/** Companheiro caído perto (para o aviso de interação). */
function coopReviveTarget() {
  const n = coopNet(); if (!n || !P || P.down > 0 || P.dieT >= 0) return null;
  let best = null;
  for (const r of n.players()) { if (!r.down || r.x === undefined) continue; const d = Math.hypot(r.x - P.x, r.z - P.z); if (d < 1.8 && (!best || d < best.d)) best = { id: r.id, name: r.name, d }; }
  return best;
}
function coopStartSew(id) { if (!COOP.sew || COOP.sew.id !== id) { COOP.sew = { id, t: 0, hp0: P.hp }; sfx('ui'); } }
/** Costurando: ficar perto 3 s; afastar, levar dano ou cair interrompe. */
function coopSewTick(n, dt) {
  const s = COOP.sew; if (!s) return;
  const r = n.players().find(x => x.id === s.id);
  if (!r || !r.down || !P || P.down > 0 || P.dieT >= 0 || P.hp < s.hp0 || Math.hypot(r.x - P.x, r.z - P.z) > 2.4) { COOP.sew = null; return; }
  s.t += dt;
  if (Math.random() < dt * 30) { const u = Math.random(); spawn({ x: lerp(P.x, r.x, u), y: 1 + Math.sin(u * Math.PI) * .6, z: lerp(P.z, r.z, u), life: .35, s0: .09, s1: .02, b0: 1, b1: .4, mat: 7 }); }
  if (s.t >= CO_SEW) { n.px({ k: 'rev' }, r.id); r.down = false; COOP.sew = null; toast('Você costurou ' + r.name + ' de volta', false, 'GRUPO'); sfx('lvl'); }
}
/** Anfitrião: todos caídos (ou mortos) → todos voltam ao início e o chefe recomeça. */
function coopCheckWipe(n, dt) {
  COOP.wipeT = Math.max(0, COOP.wipeT - dt);
  const ps = n.players(); if (!ps.length || COOP.wipeT > 0 || !P) return;
  const meOut = P.down > 0 || P.dieT >= 0;
  if (meOut && ps.every(r => r.down)) { COOP.wipeT = 5; n.hx({ k: 'wipe' }); coopWipe(); }
}
function coopWipe() {
  const n = coopNet(); if (n) for (const r of n.players()) r.down = false;
  COOP.sew = null; if (P) { P.down = 0; P.dieT = -1; }
  toast('O GRUPO CAIU', true, 'TODOS VOLTAM AO INÍCIO DA FENDA · O GUARDIÃO RECOMEÇA', '#ff8a6a');
  if (!G.respawning) respawn();
}
