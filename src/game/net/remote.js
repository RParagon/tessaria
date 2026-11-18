/* Fios de Tessária · Ponte com o modo online (jogadores na vila, correio, save na nuvem) */
// O lado de rede fica em src/net (TypeScript) e se expõe como window.TessNet.
// Sem servidor configurado, TessNet não existe ou está desligado, e o jogo segue offline.

const NET = () => (window.TessNet && window.TessNet.enabled ? window.TessNet : null);
const NETON = () => { const n = NET(); return n && n.account ? n : null; };
const RSLOTS = 12, RBASE = 160;            // 12 jogadores visíveis, cada um com 8 linhas próprias na paleta (160..255)
const REMOTE_ROWS = {};
const rslots = Array.from({ length: RSLOTS }, () => ({ id: 0, key: '', model: null }));

/** Aparência pública do próprio herói (o que os outros veem). */
function lookOfPlayer() {
  const eq = (G.save && G.save.eq) || {};
  return { cls: G.char.cls, body: G.char.body, skin: G.char.skin, hair: G.char.hair, hairCol: G.char.hairCol, outfit: G.char.outfit, trim: G.char.trim, glow: G.char.glow, acc: G.char.acc, cape: !!G.char.cape, beard: G.char.beard || 'nenhuma', armor: eq.armor ? eq.armor.rar : null, charm: eq.charm ? eq.charm.rar : null, wr: eq.weapon ? eq.weapon.rar : 0 };
}

// ---------- ganchos chamados pelo jogo ----------
function netSaveChanged() { const n = NETON(); if (n && G.save) n.saveChanged(G.save); }
// ---------- Fenda do grupo ----------
/** Roda fn com Math.random trocado por um sorteio com semente: com a mesma semente, todo jogo gera o mesmo mapa. */
function withSeed(seed, fn) { const r = Math.random; Math.random = rng(seed | 0); try { return fn(); } finally { Math.random = r; } }
/** Menu da Fenda: em grupo e líder, a Fenda abre para o grupo (o servidor responde com ienter). */
function netGroupRift(L) {
  const n = NETON(); if (!n || !n.groupRift) return false;
  const R0 = G.riftRoll || rollRift(); G.riftRoll = R0;
  n.openRift(L, R0.base, R0.aff.slice(0, riftAffN(L)), R0.boss);
  toast('Abrindo a Fenda para o grupo', false, 'OS OUTROS RECEBEM O AVISO');
  return true;
}
/** Portal dos Ermos na vila: em grupo e líder, os Ermos abrem para o grupo (o servidor responde com ienter). */
function netGroupWilds() {
  const n = NETON(); if (!n || !n.groupRift) return false;
  n.openWilds(); toast('Abrindo os Ermos para o grupo', false, 'OS OUTROS RECEBEM O AVISO');
  return true;
}
/** Entrar nos Ermos do grupo: o mapa dos Ermos é sempre o mesmo, basta viajar com a instância. */
function startGroupWilds(inst, diff) {
  const n = NETON(); if (!n || !P || G.mode === 'title' || G.mode === 'create') return;
  if (G.menu) closeMenus();
  if (G.mode === 'dialog') { DLG.q = []; DLG.cur = null; G.mode = 'play'; $('#dialog').hidden = true; }
  n.enteringInst(inst, 'wilds');
  ELO = { diff: diff ?? null, ref: 0, kind: 'wilds' };   // Ermos: vale a dificuldade do grupo (sem Fio de Elo)
  travel('wilds');
  setTimeout(() => toast('ERMOS DO GRUPO', false, 'MESMOS MONSTROS PARA TODOS · CADA UM COM O PRÓPRIO LOOT'), 1800);
}
/** Servidor mandou entrar: gera a Fenda com os dados e a semente do grupo e viaja. */
function startGroupRift(inst, prm, diff, lvl) {
  const n = NETON(); if (!n || !P || G.mode === 'title' || G.mode === 'create') return;
  if (G.menu) closeMenus();
  if (G.mode === 'dialog') { DLG.q = []; DLG.cur = null; G.mode = 'play'; $('#dialog').hidden = true; }
  G.riftRoll = { base: prm.base, boss: prm.boss, aff: prm.aff.slice() };
  n.enteringInst(inst, 'rift');
  ELO = { diff: diff ?? null, ref: lvl || 0, kind: 'rift' };   // dificuldade do grupo e Fio de Elo
  withSeed(prm.seed, () => startRift(prm.L));
  setTimeout(() => toast('FENDA DO GRUPO', false, 'MESMO MAPA E MESMOS MONSTROS · O JOGO DO LÍDER COMANDA OS INIMIGOS'), 1800);
}

function netRegion(key) { coopReset(); const n = NETON(); if (n) n.setRegion(key, lookOfPlayer(), P ? [P.x, P.z] : null, key === 'rift' && G.rift ? G.rift.L : 0); if (!n || !n.inst) ELO = null; if (key !== 'hub') clearRemoteMarks(); }
function netLook() { const n = NETON(); if (n) n.setLook(lookOfPlayer()); }
let netPosAcc = 0, netAct = null, netActT = 0;
const NET_ACTS = ['swing', 'cast', 'shoot', 'spin', 'nova', 'dash'];
/** Detalhe que muda o efeito visual: golpe do combo, runa da habilidade ou poder da esquiva. */
function netActInfo(a) {
  if (a === 'swing') return P.combo || 0;
  if (a === 'dash') return hasPow('desfiado') ? 1 : 0;
  if (a === 'spin' || a === 'nova' || a === 'volley') return curRune();
  return 0;
}
function netTick(dt) {
  const n = NETON(); if (!n || !RG || !n.room || !P) return;   // sala conectada: vila ou Fenda do grupo
  // Ação nova (ou o mesmo golpe repetido): vai na hora, sem esperar a próxima posição.
  if (P.act && NET_ACTS.includes(P.act) && (P.act !== netAct || P.actT < netActT)) {
    const a = P.act === 'shoot' && P.fxSkill ? 'volley' : P.act;   // a Chuva de Flechas usa a mesma pose do tiro
    n.sendAct(a, netActInfo(a), P.yaw);
  }
  netAct = P.act; netActT = P.actT;
  netPosAcc += dt; if (netPosAcc < .1) return; netPosAcc = 0;
  n.sendPos(P.x, P.z, P.yaw, P.moveAmt || 0, P.act || '');
}

// ---------- jogadores remotos ----------
function lookKey(l) { return [l.cls, l.body, l.skin, l.hair, l.hairCol, l.outfit, l.trim, l.glow, l.acc, l.cape ? 1 : 0, l.beard, l.armor, l.charm, l.wr].join('|'); }
function buildRemoteModel(slot, look) {
  const cfg = { ...look, seed: 11 + slot, armor: look.armor ?? undefined, charm: look.charm ?? undefined };
  const rows = charRows(cfg); for (let i = 0; i < 8; i++) REMOTE_ROWS[RBASE + slot * 8 + i] = rows[i];
  const r = buildHumanoid(cfg, RBASE + slot * 8), v = makeVAO(r.data);
  return Object.assign(r, { vao: v.vao, buf: v.buf, count: v.count, data: null });
}

/** Escolhe os 12 mais próximos, (re)constrói modelos que mudaram e atualiza a paleta. */
function assignRemoteSlots(list) {
  const near = list.slice().sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z)).slice(0, RSLOTS);
  const keep = new Set(near.map(r => r.id));
  for (const s of rslots) if (s.id && !keep.has(s.id)) { s.id = 0; }
  let rebuilt = 0;
  for (const r of near) {
    let s = rslots.find(x => x.id === r.id);
    if (!s) { s = rslots.find(x => !x.id); if (!s) break; s.id = r.id; s.key = ''; }
    const k = lookKey(r.look);
    if (s.key !== k && rebuilt < 2) { if (s.model) freeVAO(s.model); s.model = buildRemoteModel(rslots.indexOf(s), r.look); s.key = k; rebuilt++; }
    r.slot = rslots.indexOf(s);
  }
  if (rebuilt && RG) uploadPalette(RG.key);
  return near;
}

/** Ajustes de pose dos emotes, aplicados depois de poseHuman (jogador local e remotos). */
function applyEmote(A, em, t) {
  if (em === 'acenar') { A[5].rz = -2.5 + .35 * Math.sin(t * 9); A[5].rx = -.2; A[3].rz = .08 * Math.sin(t * 4); }
  else if (em === 'comemorar') { const k = .5 + .5 * Math.sin(t * 8); A[4].rx = A[5].rx = -2.5 - .3 * k; A[4].rz = .35; A[5].rz = -.35; A[1].ty = .12 * k; A[3].rx = -.25; }
  else if (em === 'dancar') { A[1].ry = Math.sin(t * 5) * .6; A[1].ty = Math.abs(Math.sin(t * 9)) * .12; A[4].rz = 1.2 + Math.sin(t * 9) * .6; A[5].rz = -1.2 + Math.sin(t * 9 + 1.5) * .6; A[6].rx = Math.sin(t * 9) * .4; A[7].rx = -Math.sin(t * 9) * .4; }
  else if (em === 'sentar') { A[1].ty = -.48; A[6].rx = A[7].rx = -1.45; A[4].rx = A[5].rx = -.25; A[2].rx = .1; }
}
// Duração de cada ação, igual à do jogador local (core/player.js).
const REMOTE_ACT_DUR = { swing: .3, cast: .3, shoot: .25, volley: .25, spin: .5, nova: .45, dash: .18 };
/** Mão de um jogador remoto (mesmo cálculo de handPos, em core/player.js). */
function remoteHand(r, which) {
  if (!r.W) return [r.x, 1.2, r.z];
  const bw = [.86, 1, 1.18][r.look.body ?? 1];
  return which === 'staff' ? tp(r.W[8], [-.38 * bw, .85 + 1.1, .06]) : tp(r.W[9] || r.W[4], [.38 * bw + .02, .85, .1]);
}
/** Efeitos de uma ação remota: as mesmas partículas e projéteis de doAttack, doSkill e doDash,
 *  só visuais (time 'fx': sem dano, sem mira automática, sem lentidão). */
function remoteFx(r, a, c, yaw) {
  if (r.x === undefined || !P || Math.hypot(r.x - P.x, r.z - P.z) > 24) return;
  const d = [Math.sin(yaw), Math.cos(yaw)], x = r.x, z = r.z;
  if (a === 'swing') {
    const heavy = c === 2, from = c === 1 ? 1 : -1;
    for (let i = 0; i < 22; i++) { const k = i / 21, an = yaw + from * (1.25 - k * 2.5) * (heavy ? .55 : 1), rad = heavy ? rr(1.2, 2.7) : rr(1.4, 2.3); spawn({ x: x + Math.sin(an) * rad, y: heavy ? lerp(1.9, .3, k) : rr(.75, 1.15), z: z + Math.cos(an) * rad, vx: Math.sin(an) * 2.5, vz: Math.cos(an) * 2.5, life: .12 + k * .1, s0: heavy ? .26 : .2, s1: .04, b0: 1, b1: .25, mat: 7 }); }
    if (heavy) G.later.push({ t: .07, fn: () => burst(r.x + d[0] * 1.9, .2, r.z + d[1] * 1.9, 18, 7, 3.5, .35, .14) });
  } else if (a === 'cast') {
    const tip = remoteHand(r, 'staff');
    burst(tip[0], tip[1], tip[2], 10, 7, 2.5, .22, .12);
    shoot({ x: tip[0], y: Math.max(1.0, tip[1]), z: tip[2], vx: d[0] * 14, vz: d[1] * 14, life: .95, dmg: 0, team: 'fx', mat: 7, size: .36, r: .4, trail: 1, bolt: true });
  } else if (a === 'shoot') {
    const bow = remoteHand(r, 'bow');
    for (let i = 0; i < 6; i++) spawn({ x: bow[0], y: bow[1], z: bow[2], vx: d[0] * rr(1, 3) + rr(-.5, .5), vy: rr(-.3, .6), vz: d[1] * rr(1, 3) + rr(-.5, .5), life: .18, s0: .1, s1: .02, b0: 1, b1: .2, mat: 7 });
    shoot({ x: bow[0], y: Math.max(.9, bow[1]), z: bow[2], vx: d[0] * 22, vz: d[1] * 22, life: .7, dmg: 0, team: 'fx', mat: 7, size: .2, r: .35, trail: .35, arrow: true });
  } else if (a === 'spin') {
    const R2 = c === 2 ? 4.6 : 3.5;
    for (let i = 0; i < 70; i++) { const an = i / 70 * 6.28; spawn({ x: x + Math.cos(an) * 1.2, y: rr(.4, 1.3), z: z + Math.sin(an) * 1.2, vx: Math.cos(an) * R2 * 1.4, vz: Math.sin(an) * R2 * 1.4, life: rr(.3, .5), s0: .22, s1: .05, b0: 1, b1: .2, mat: 7, drag: 3 }); }
    if (c === 1) G.zones.push({ x, z, r: 3.2, t: 0, dur: 3, dmg: 0, tick: 0, team: 'fx' });
  } else if (a === 'nova') {
    if (c === 2) { const tip = remoteHand(r, 'staff'); shoot({ x: tip[0], y: 1.6, z: tip[2], vx: d[0] * 12, vz: d[1] * 12, life: .9, dmg: 0, team: 'fx', mat: 7, size: .95, r: .8, trail: 1, fxBoom: true }); }
    else {
      const mat = c === 1 ? 122 : 7;
      const nova = () => {
        if (r.x === undefined) return;
        for (let i = 0; i < 48; i++) { const an = i / 48 * 6.28; spawn({ x: r.x + Math.cos(an) * 1.1, y: .1, z: r.z + Math.sin(an) * 1.1, vx: Math.cos(an) * 4.5, vy: .4, vz: Math.sin(an) * 4.5, life: .55, s0: .2, s1: .04, b0: 1, b1: .2, mat, drag: 2 }); }
        for (let i = 0; i < 16; i++) { const an = i / 16 * 6.28; shoot({ x: r.x, y: 1.3, z: r.z, vx: Math.sin(an) * 11, vz: Math.cos(an) * 11, life: 1.1, dmg: 0, team: 'fx', mat, size: .32, r: .4, trail: 1 }); }
      };
      nova(); if (c === 3) G.later.push({ t: .45, fn: nova });
    }
  } else if (a === 'volley') {
    const volley = () => { if (r.x === undefined) return; for (let i = 0; i < 9; i++) { const an = yaw - .36 + i / 8 * .72; shoot({ x: r.x + Math.sin(an) * .5, y: 1.15, z: r.z + Math.cos(an) * .5, vx: Math.sin(an) * 20, vz: Math.cos(an) * 20, life: .8, dmg: 0, team: 'fx', mat: 7, size: .22, r: .35, trail: .6, arrow: true }); } };
    volley(); if (c === 3) { G.later.push({ t: .16, fn: volley }); G.later.push({ t: .32, fn: volley }); }
  } else if (a === 'dash' && c === 1) {
    tels.push({ kind: 'circle', x, z, r: 2.2, t: 0, dur: .5, mat: 7, fn: () => burst(x, .5, z, 30, 7, 5, .5, .18) });
  }
}
/** Começo de uma ação de outro jogador: toca a animação desde o início. */
function startRemoteAct(r, a, c, yaw) {
  remoteFx(r, a, c, yaw);
  if (a === 'volley') a = 'shoot';
  r.act = a; r.actT = 0; r.combo = c || 0; r.tyaw = yaw; if (r.yaw !== undefined) r.yaw = yaw;
  r.emote = null;                                    // a ação interrompe o emote, como no jogador local
  if (a === 'cast' || a === 'shoot') r.aimAgo = 0;
  // A posição da esquiva chega pelos snapshots, um pouco depois: o rastro dura o bastante para cobri-la.
  if (a === 'dash') { r.dashT = .35; r.ghosts = []; }
}
function updateRemoteAct(r, dt) {
  if (r.act) { r.actT += dt; if (r.actT > (REMOTE_ACT_DUR[r.act] || .3)) r.act = null; }
  r.aimAgo = (r.aimAgo ?? 9) + dt;
  const ranged = r.look.cls === 'arco' || r.look.cls === 'arcano';
  r.stance = lerp(r.stance || 0, ranged && r.aimAgo < .5 && r.act !== 'dash' ? 1 : 0, 1 - Math.exp(-dt * 16));
  if (r.dashT > 0) { r.dashT -= dt; r.ghosts.push({ x: r.x, z: r.z, yaw: r.yaw, t: 0 }); if (r.ghosts.length > 5) r.ghosts.shift(); }
  if (r.ghosts) { for (const g of r.ghosts) g.t += dt; r.ghosts = r.ghosts.filter(g => g.t < .25); }
}
function poseRemote(r, t) {
  const A = r.anim; resetAnim(A);
  const e2 = { moveAmt: r.m, walkPh: r.walkPh, cls: r.look.cls, act: r.act || null, actT: r.actT || 0, combo: r.combo || 0, stance: r.stance || 0, lean: 0, idleT: 0 };
  poseHuman(A, e2, t);
  if (r.down) { coopDownPose(A, t); return; }
  if (!r.act && r.emote && r.emoteT < 6 && r.m < .2) applyEmote(A, r.emote, t);
}
/** Chamado no render da vila: suaviza posições, anima e desenha. */
function drawRemotes(dt, t) {
  const n = NETON(); if (!n || !RG || !n.room || !P) return;
  const list = n.players(); if (!list.length) return;
  const vis = assignRemoteSlots(list);
  for (const r of vis) {
    const s = rslots[r.slot]; if (!s || !s.model) continue;
    const k = 1 - Math.exp(-dt * 12);
    if (r.x === undefined || Math.hypot(r.tx - r.x, r.tz - r.z) > 8) { r.x = r.tx; r.z = r.tz; r.yaw = r.tyaw; }
    r.x = lerp(r.x, r.tx, k); r.z = lerp(r.z, r.tz, k); r.yaw += angDiff(r.yaw, r.tyaw) * k;
    r.walkPh = (r.walkPh || 0) + dt * 7 * r.m; r.emoteT = (r.emoteT ?? 9) + dt; r.chatT = (r.chatT ?? 9) + dt;
    if (!r.anim || r.anim.length !== s.model.bones.length) r.anim = newAnim(s.model);
    updateRemoteAct(r, dt);
    // Poeira dos passos na corrida, como no jogador local (core/player.js).
    { const stepN = Math.floor(r.walkPh / Math.PI); if (stepN !== r.lastStep) { r.lastStep = stepN; if (r.m > .55 && !(r.dashT > 0) && Math.hypot(r.x - P.x, r.z - P.z) < 24) { const sd = stepN % 2 ? .15 : -.15, cx = Math.cos(r.yaw), sx2 = -Math.sin(r.yaw); for (let i = 0; i < 3; i++) spawn({ x: r.x + cx * sd + rr(-.08, .08), y: .08, z: r.z + sx2 * sd + rr(-.08, .08), vx: rr(-.3, .3), vy: rr(.2, .5), vz: rr(-.3, .3), life: rr(.3, .5), s0: .09, s1: .18, b0: .3, b1: .05, mat: 120, drag: 2 }); } } }
    poseRemote(r, t);
    if (r.ghosts) for (const g of r.ghosts) if (g.t < .18) drawModel(s.model, r.anim, g.x, 0, g.z, g.yaw, 1, { flash: .55 - g.t * 2 });
    r.W = drawModel(s.model, r.anim, r.x, 0, r.z, r.yaw, 1, {});
    if (r.emote === 'comemorar' && r.emoteT < 2 && Math.random() < .5) spawn({ x: r.x + rr(-.4, .4), y: rr(.5, 2), z: r.z + rr(-.4, .4), vy: rr(1, 2), life: .7, s0: .1, s1: .02, b0: 1, b1: .2, mat: 30 });
  }
}

// ---------- nomes e balões ----------
const rmarks = new Map();
function clearRemoteMarks() { for (const el of rmarks.values()) el.remove(); rmarks.clear(); }
function updateRemoteMarks() {
  const n = NETON(), box = $('#marks');
  const show = n && RG && n.room && P && (G.mode === 'play' || G.mode === 'dialog');
  const alive = new Set();
  if (show) for (const r of n.players()) {
    if (r.slot === undefined || r.x === undefined || Math.hypot(r.x - P.x, r.z - P.z) > 18) continue;
    const sc = project(r.x, 2.35, r.z); if (!sc) continue;
    alive.add(r.id);
    let el = rmarks.get(r.id);
    if (!el || !el.isConnected) {
      el = document.createElement('div'); el.className = 'tag rp'; el.innerHTML = '<i class="bub" hidden></i><span class="rn" role="button" tabindex="-1"></span><small class="rt"></small>'; box.appendChild(el); rmarks.set(r.id, el);
      // Tocar no nome abre o menu do jogador (amigo, grupo, bloquear), montado em src/net/ui.ts.
      const nmEl = el.querySelector('.rn');
      nmEl.addEventListener('pointerdown', e => e.stopPropagation());
      nmEl.addEventListener('click', e => { e.stopPropagation(); document.dispatchEvent(new CustomEvent('tess:player', { detail: { name: nmEl.textContent, x: e.clientX, y: e.clientY } })); });
    }
    el.style.left = sc[0] + 'px'; el.style.top = sc[1] + 'px';
    const nm = el.querySelector('.rn'), tt = el.querySelector('.rt'), bub = el.querySelector('.bub');
    if (nm.textContent !== r.name) nm.textContent = r.name;
    const ally = !!(n.party && n.party.members.some(m => m.name === r.name));
    if (el.classList.contains('ally') !== ally) el.classList.toggle('ally', ally);
    { const want = r.down ? 'CAÍDO · chegue perto para costurar' : r.title; if (tt.textContent !== want) tt.textContent = want; }
    const showBub = r.chat && r.chatT < 6;
    bub.hidden = !showBub; if (showBub && bub.textContent !== r.chat) bub.textContent = r.chat;
  }
  for (const [id, el] of rmarks) if (!alive.has(id)) { el.remove(); rmarks.delete(id); }
}

// ---------- correio online ----------
let mlOnlineSel = null, mlInbox = null, mlBusy = false;
function renderMailOnline() {
  const n = NETON(), s = G.save, bag = $('#mlBag'), det = $('#mlDet');
  $('#mlCodeBox').hidden = true; $('#mlInbox').hidden = false; $('#mlInboxH').hidden = false;
  $('#mlIntro').textContent = 'Envie um item da bolsa para outro Tecelão pelo nome. Ele recebe aqui, no correio da casa dele, mesmo que esteja offline.';
  bag.innerHTML = '';
  s.inv.forEach(it => bag.appendChild(slotBtn(it, () => { mlOnlineSel = it; renderMailOnline(); }, mlOnlineSel === it)));
  if (!s.inv.length) bag.innerHTML = '<p class="sub" style="grid-column:1/-1">Coloque na bolsa o item que quer enviar.</p>';
  if (!mlOnlineSel || !s.inv.includes(mlOnlineSel)) { mlOnlineSel = null; det.innerHTML = '<p class="sub">Escolha um item da bolsa para enviar.</p>'; }
  else {
    const it = mlOnlineSel;
    det.innerHTML = `<h3 style="color:${RAR[it.rar].c}"></h3><div class="meta">${SLOTN[it.slot]} · ${RAR[it.rar].n} · Poder ${itemScore(it)}</div><label class="set" style="display:block;margin:6px 0">Para (nome do Tecelão) <input id="mlTo" type="text" maxlength="16" autocomplete="off" spellcheck="false"></label><label class="set" style="display:block;margin:6px 0">Recado (opcional) <input id="mlNote" type="text" maxlength="80" autocomplete="off"></label>`;
    det.querySelector('h3').textContent = it.name;
    const r = document.createElement('div'); r.className = 'irow'; const b = document.createElement('button'); b.className = 'px gold'; b.textContent = 'Enviar';
    b.onclick = async () => {
      const to = $('#mlTo').value.trim(); if (!to || mlBusy) return; mlBusy = true; b.disabled = true; b.textContent = 'Enviando…';
      const res = await n.sendItem(to, it, $('#mlNote').value);
      mlBusy = false;
      if (!res.ok) { toast(res.error, false, 'CORREIO DO TEAR', '#ff8a6a'); b.disabled = false; b.textContent = 'Enviar'; return; }
      const i = s.inv.findIndex(x => x.id === it.id); if (i >= 0) s.inv.splice(i, 1);
      const st2 = s.st = s.st || {}; st2.mailSent = (st2.mailSent || 0) + 1;
      mlOnlineSel = null; writeSave(); sfx('frag'); toast(it.name, false, 'ENVIADO PARA ' + to.toUpperCase(), RAR[it.rar].c); renderMailOnline();
    };
    r.appendChild(b); det.appendChild(r);
  }
  const box = $('#mlInbox');
  if (mlInbox === null) { box.innerHTML = '<p class="sub">Abrindo a caixa de correio…</p>'; n.mail().then(list => { mlInbox = list; if (G.menu === 'mail') renderMailOnline(); }); return; }
  box.innerHTML = mlInbox.length ? '' : '<p class="sub">Nenhuma carta nova.</p>';
  for (const m of mlInbox) {
    const row = document.createElement('div'); row.className = 'shoprow';
    row.appendChild(slotBtn(m.item, () => { }, false));
    const nm = document.createElement('div'); nm.className = 'nm'; nm.innerHTML = '<span></span><small></small>';
    nm.firstChild.textContent = m.item.name; nm.firstChild.style.color = (RAR[m.item.rar] || RAR[0]).c;
    nm.lastChild.textContent = 'De ' + m.from + (m.note ? ': "' + m.note + '"' : '');
    row.appendChild(nm);
    const b = document.createElement('button'); b.className = 'px gold'; b.textContent = 'Receber'; b.disabled = s.inv.length >= 20;
    b.onclick = async () => {
      if (mlBusy) return; mlBusy = true; b.disabled = true;
      const res = await n.claim(m.id); mlBusy = false;
      if (!res.ok) { toast(res.error, false, 'CORREIO DO TEAR', '#ff8a6a'); b.disabled = false; return; }
      s.inv.push(res.item); mlInbox = mlInbox.filter(x => x.id !== m.id); writeSave(); sfx('legend');
      toast(res.item.name, true, 'PACOTE DE ' + m.from.toUpperCase(), (RAR[res.item.rar] || RAR[0]).c); renderMailOnline();
    };
    row.appendChild(b); box.appendChild(row);
  }
}
function resetMailOnline() { mlOnlineSel = null; mlInbox = null; }

// ---------- API do jogo para o módulo de rede ----------
window.TessGame = {
  get mode() { return G.mode; },
  get region() { return RG ? RG.key : null; },
  get save() { return G.save; },
  readLocalSave: () => readSave(),
  writeLocalSave: sv => { try { localStorage.setItem(SKEY, JSON.stringify(sv)); } catch (e) { } },
  startFromSave: sv => startFromSave(sv),
  newGame: () => { sfx('ui'); if (G.touch) goLandscape(); openCreator(); },
  toTitle: () => { writeSave(); showOnly(null); toTitle(); },
  toast: (a, big, sub, c) => toast(a, big, sub, c),
  sfx: k => sfx(k),
  look: () => lookOfPlayer(),
  startGroupRift,
  startGroupWilds,
  coopClosed: () => { ELO = null; if (P) { P.maxHp = stats().maxHp; P.hp = Math.min(P.hp, P.maxHp); } updateDiffHud(); },
  remoteEmote: (id, e) => { const r = NETON() && NETON().players().find(p => p.id === id); if (r) { r.emote = e; r.emoteT = 0; } },
  remoteAct: (id, a, c, yaw) => { const r = NETON() && NETON().players().find(p => p.id === id); if (r) startRemoteAct(r, a, c, yaw); },
  remoteChat: (id, text) => { const r = NETON() && NETON().players().find(p => p.id === id); if (r) { r.chat = text; r.chatT = 0; } },
  myEmote: e => { if (!P) return; P.emote = e; P.emoteT = 0; },
};
