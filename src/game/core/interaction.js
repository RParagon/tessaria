/* Fios de Tessária · Interação, gatilhos e viagem */
/* =========================================================
   INTERAÇÃO, GATILHOS, VIAGEM
   ========================================================= */
let nearInter = null;
function spawnCritters() {
  const pn = HUB.pen, m = getModel('chicken');
  for (let i = 0; i < 5; i++) critters.push({ model: m, anim: newAnim(m), x: rr((pn.x0 + 1) * T + .4, pn.x1 * T - .4), z: rr((pn.y0 + 1) * T + .4, pn.y1 * T - .4), yaw: rr(0, 6.28), tg: null, wait: rr(0, 2), peck: 0, ph: 0, moving: 0 });
}
// ---------- relógio da vila ----------
// Moradores e galinhas andam por uma rota que é função da hora do servidor (TessNet.serverNow),
// com sorteio por semente. Todos os jogadores fazem a mesma conta e veem a mesma vila, sem trocar mensagens.
// Offline, vale a hora do aparelho.
function villageTime() { const n = window.TessNet; return (n && n.enabled && n.connected ? n.serverNow() : Date.now()) / 1000; }
// ---------- dia e noite ----------
// 1 minuto real = 1 hora na Tessária: o dia inteiro dura 24 min, igual para todos (hora do servidor).
// Noite das 20h às 5h (com entardecer e amanhecer de 2 h). Vale ao ar livre: vila, Ermos, bosque, pântano e picos.
const DAY_S = 24 * 60;
function dayHour() { if (G.forceHour !== undefined && G.forceHour !== null) return G.forceHour; return (((villageTime() % DAY_S) + DAY_S) % DAY_S) / 60; }
const sm01 = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const nightAt = h => (h >= 12 ? sm01(18.5, 20.5, h) : 1 - sm01(5, 7, h));
const duskAt = h => Math.max(0, 1 - Math.abs(h - 19) / 1.6) + Math.max(0, 1 - Math.abs(h - 6) / 1.3) * .7;
const OUTDOOR = { hub: 1, wilds: 1, forest: 1, swamp: 1, peaks: 1 };
const outdoors = () => !!(RG && OUTDOOR[RG.key] && !G.rift);
/** Quão noite está aqui (0 dia, 1 noite fechada); 0 em lugar coberto. */
function nightK() { return outdoors() ? nightAt(dayHour()) : 0; }
function duskK() { return outdoors() ? duskAt(dayHour()) : 0; }
const isNight = () => nightK() > .5;
const hourStr = () => { const h = dayHour(), hh = Math.floor(h), mm = Math.floor((h - hh) * 6) * 10; return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); };
// ---------- a ronda da Acendedora Lúcia ----------
// No fim da tarde ela sai de casa e corre de poste em poste, para e acende cada um; ao amanhecer refaz a ronda apagando.
// Tudo sai da hora do dia (dayHour): todos os jogadores veem os mesmos postes acesos e a Lúcia no mesmo lugar.
const LAMP_LIGHT_H = 17.2, LAMP_DOUSE_H = 4.4, LUCIA_SPD = 4.2, LUCIA_STOP = 1.8;   // horas de saída, velocidade (m/s) e parada em cada poste (s)
let LROUTE = null;
/** Roteiro da ronda pelas ruas: número = poste (para e acende), [x, z] = esquina por onde ela passa. */
const LUCIA_PATH = [[93.5, 33], 9, 8, 7, 6, 5, 4, 17, 3, 2, 1, 0, [10, 33], [44, 33], 16, 19, 18, 20, 21, [78, 33], 10, 13, 11, 22, 12, 14, 23, 15, [146, 38.5], 24, 25, 26, [161, 40], [150, 38.5], [132, 33], [100, 33]];
/** Linha do tempo da ronda: [t, x, z, parada?] em segundos desde a saída, e quando cada poste acende. */
function lampRoute() {
  if (LROUTE && LROUTE.n === HUB.lamps.length) return LROUTE;
  const L = EAST_NPCS.find(n => n.id === 'lucia'), home = [L.x, L.z], key = [[0, home[0], home[1], 0]], at = new Array(HUB.lamps.length).fill(0);
  let t = 0, cur = home;
  const go = (x, z) => { t += Math.hypot(x - cur[0], z - cur[1]) / LUCIA_SPD; key.push([t, x, z, 0]); cur = [x, z]; };
  for (const st of LUCIA_PATH.concat([home])) {
    if (Array.isArray(st)) { go(st[0], st[1]); continue; }
    const [lx, lz] = HUB.lamps[st]; go(lx - .9, lz);   // para ao lado do poste: a vara alcança a lanterna
    at[st] = t + LUCIA_STOP * .6; t += LUCIA_STOP; key.push([t, lx - .9, lz, 1]);
  }
  return (LROUTE = { n: HUB.lamps.length, key, at, dur: t });
}
/** O poste i está aceso agora? Acende quando a Lúcia passa no fim da tarde e apaga quando ela passa ao amanhecer. */
function lampLit(i) {
  const R = lampRoute(), h = dayHour(), on = LAMP_LIGHT_H + R.at[i] / 60, off = LAMP_DOUSE_H + R.at[i] / 60;
  return h >= on || h < off;
}
/** Onde a Lúcia está na ronda (ou null fora da ronda). */
function luciaRound() {
  const R = lampRoute(), h = dayHour();
  for (const h0 of [LAMP_LIGHT_H, LAMP_DOUSE_H]) {
    const t = (h - h0) * 60; if (t < 0 || t > R.dur) continue;
    const K = R.key; let k = 1; while (k < K.length - 1 && K[k][0] < t) k++;
    const A = K[k - 1], B = K[k], u = B[0] > A[0] ? clamp((t - A[0]) / (B[0] - A[0]), 0, 1) : 1, moving = !B[3] && Math.hypot(B[1] - A[1], B[2] - A[2]) > .05;
    return { x: A[1] + (B[1] - A[1]) * u, z: A[2] + (B[2] - A[2]) * u, yaw: moving ? Math.atan2(B[1] - A[1], B[2] - A[2]) : Math.PI / 2, moving, dousing: h0 === LAMP_DOUSE_H, t };
  }
  return null;
}
/** Avisos quando anoitece e amanhece, e os efeitos da noite em cada região. */
function updateDayNight() {
  if (!RG || !P) return;
  const n = isNight();
  if (G.wasNight === undefined) { G.wasNight = n; return; }
  if (n !== G.wasNight) {
    G.wasNight = n;
    if (!outdoors()) return;
    if (n) toast('ANOITECEU', true, RG.wild ? 'MONSTROS MAIS FORTES E MAIS ELITES · +25% DE XP E MAIS LOOT' : RG.key === 'hub' ? 'LAMPIÕES ACESOS · PEIXES DA NOITE NO RIO · O BARDO TOCA NA FOGUEIRA' : 'OS MONSTROS FICAM MAIS FORTES', '#9cb8ff');
    else toast('AMANHECEU', false, 'O SOL VOLTA À TESSÁRIA', '#ffd27a');
    sfx('ui');
  }
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h | 0; }
const legRand = (seed, k) => rng(seed ^ Math.imul(k | 0, 2654435761))();
/** Onde o morador deve estar na hora t: anda do ponto do trecho anterior até o do trecho atual e espera o resto. */
function npcScheduled(n, t) {
  const pts = n.wander, sp = n.spd || 1.5;
  if (!n.legLen) { let md = 0; for (const a of pts) for (const b of pts) md = Math.max(md, Math.hypot(a[0] - b[0], a[1] - b[1])); n.legLen = md / sp + 3; n.seed = hashStr(n.id); }
  const k = Math.floor(t / n.legLen), f = t - k * n.legLen;
  const A = pts[Math.floor(legRand(n.seed, k - 1) * pts.length)], B = pts[Math.floor(legRand(n.seed, k) * pts.length)];
  const d = Math.hypot(B[0] - A[0], B[1] - A[1]), dur = d / sp;
  if (f < dur && d > .01) { const u = f / dur; return { x: A[0] + (B[0] - A[0]) * u, z: A[1] + (B[1] - A[1]) * u, yaw: Math.atan2(B[0] - A[0], B[1] - A[1]), moving: true, walk: f * sp * 2.6 }; }
  return { x: B[0], z: B[1], yaw: null, moving: false, walk: 0 };
}
/** Onde cada morador fica à noite (x, z, para onde olha). */
const NIGHT_SPOT = { kiko: [31.6, 26.2, 0], nina: [34.4, 26.2, 0] };
function updateNPCs(dt) {
  if (!RG || RG.key !== 'hub') return;
  const vt = villageTime(), night = isNight();
  for (const n of npcs) {
    if (!n.visible || !n.wander) continue;
    if (n.id === 'lucia' && !(n.talkT > 0)) { const r = luciaRound(); if (r) { n.x = r.x; n.z = r.z; if (r.moving) { n.wyaw = r.yaw; n.moveAmt = lerp(n.moveAmt || 0, 1, .2); n.walkPh = r.t * LUCIA_SPD * 2.2; } else { n.wyaw = r.yaw; n.moveAmt = lerp(n.moveAmt || 0, 0, .25); } n.round = r; n.backT = 0; continue; } n.round = null; }   // ronda dos lampiões
    if (night && NIGHT_SPOT[n.id] && !(n.talkT > 0)) { const [nx, nz, ny] = NIGHT_SPOT[n.id]; n.x = nx; n.z = nz; n.wyaw = ny; n.baseYaw = ny; n.moveAmt = lerp(n.moveAmt || 0, 0, .15); continue; }   // à noite: as crianças ouvem histórias na porta da taverna
    const talking = n.talkT > 0 || (G.mode === 'dialog' && DLG.cur && DLG.cur.who === n.name);
    if (talking) { n.moveAmt = lerp(n.moveAmt || 0, 0, .2); n.backT = 20; continue; }
    n.backT = Math.max(0, (n.backT || 0) - dt);
    const s = npcScheduled(n, vt), gap = Math.hypot(s.x - n.x, s.z - n.z);
    // Depois de conversar com você, o morador caminha de volta para a rota comum (até 20 s).
    // Em qualquer outro caso (entrar na vila, relógio corrigido), ele já aparece no lugar certo.
    if (gap > 1.2 && n.backT > 0 && gap < 25) {
      // voltando para a rota comum depois de uma conversa (ou de um empurrão)
      const sp = (n.spd || 1.5) * 1.6, k = Math.min(1, sp * dt / gap);
      n.x += (s.x - n.x) * k; n.z += (s.z - n.z) * k; n.wyaw = Math.atan2(s.x - n.x, s.z - n.z);
      n.moveAmt = lerp(n.moveAmt || 0, 1, .15); n.walkPh = (n.walkPh || 0) + dt * sp * 2.6;
    } else {
      n.x = s.x; n.z = s.z; n.backT = 0;
      if (s.moving) { n.wyaw = s.yaw; n.moveAmt = lerp(n.moveAmt || 0, 1, .15); n.walkPh = s.walk; }
      else n.moveAmt = lerp(n.moveAmt || 0, 0, .15);
    }
    collide(n, .3);
  }
  const pn = HUB.pen, x0 = (pn.x0 + 1) * T + .3, x1 = pn.x1 * T - .3, z0 = (pn.y0 + 1) * T + .3, z1 = pn.y1 * T - .3;
  const cLeg = Math.hypot(x1 - x0, z1 - z0) / 1.1 + 1.5;
  const cPt = (i, k) => [x0 + (x1 - x0) * legRand(7919 * (i + 1), k * 2), z0 + (z1 - z0) * legRand(7919 * (i + 1), k * 2 + 1)];
  critters.forEach((c, i) => {
    // rota comum (andar e ciscar), mais um desvio só local quando o herói chega perto
    const tt = vt + i * 1.37, k = Math.floor(tt / cLeg), f = tt - k * cLeg, A = cPt(i, k - 1), B = cPt(i, k);
    const d = Math.hypot(B[0] - A[0], B[1] - A[1]), dur = d / 1.1, mv = f < dur;
    const bx = mv ? A[0] + (B[0] - A[0]) * f / dur : B[0], bz = mv ? A[1] + (B[1] - A[1]) * f / dur : B[1];
    c.ox = c.ox || 0; c.oz = c.oz || 0;
    const flee = P && Math.hypot(P.x - (bx + c.ox), P.z - (bz + c.oz)) < 2.2;
    if (flee) { const ax = bx + c.ox - P.x, az = bz + c.oz - P.z, al = Math.hypot(ax, az) || 1; c.ox += ax / al * 3.2 * dt; c.oz += az / al * 3.2 * dt; c.yaw = Math.atan2(ax, az); }
    else { const dk = Math.exp(-dt * .8); c.ox *= dk; c.oz *= dk; if (mv) c.yaw = Math.atan2(B[0] - A[0], B[1] - A[1]); }
    c.x = clamp(bx + c.ox, x0, x1); c.z = clamp(bz + c.oz, z0, z1);
    c.moving = mv || flee ? 1 : 0; c.ph += dt * (flee ? 3.2 : mv ? 1.1 : 0);
    const pf = (f - dur) % 2.2; c.peck = !mv && !flee && pf < .6 ? .6 - pf : 0;   // cisca de tempos em tempos, parada
  });
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
  else if (z !== G.wzone) { G.wzone = z; const W2 = WZ[z], hot = W2.lv > G.save.lvl + 3; if (z === 7) { setTimeout(() => toast('SEM ACAMPAMENTOS', false, 'QUANTO MAIS FUNDO, MAIS FORTES OS MONSTROS'), 2400); if (NETON() && NETON().inOpenWilds) setTimeout(() => toast('PVP ATIVO', true, 'OUTROS JOGADORES PODEM ATACAR · AMIGOS E GRUPO NÃO', '#ff5a7a'), 4800); } toast(W2.n.toUpperCase(), true, `monstros nível ${W2.lv}` + (hot ? ' · PERIGOSO PARA VOCÊ' : ''), hot ? '#ff6a5a' : W2.c); updateDiffHud(); G.save.wz = Math.max(G.save.wz || 0, wRing(P.x / T, P.z / T)); }   // wz: maior anel alcançado (3 = Ermo Profundo)
  if (G.bloodT > 0 && Math.random() < .5) spawn({ x: P.x + rr(-9, 9), y: rr(2, 5), z: P.z + rr(-7, 7), vy: -rr(.5, 1.2), life: 1.4, s0: .06, s1: .02, b0: .9, b1: .1, mat: 21 });   // Lua de Sangue
  G.wT = (G.wT || 0) - 1 / 60; if (G.wT > 0) return; G.wT = 1;
  wildsEvents(z);
  for (const rm of RG.rooms) {
    if (!rm.en || !rm.spawned) continue;
    const live = enemies.some(e => e.room === rm && e.dieT < 0), far = Math.hypot(rm.wx - P.x, rm.wz - P.z) > 30;
    if (live) { rm.clearT = null; continue; }
    if (rm.clearT == null) rm.clearT = G.time;
    if (far && G.time - rm.clearT > (rm.alpha ? 150 : 70)) { rm.spawned = false; rm.clearT = null; }
  }
}
function updateTriggers(dt) {
  updateWilds(); updateHubLife(dt); updateCamps(dt); updateWeave(dt);
  if (inter.some(i => i.taken)) inter = inter.filter(i => !i.taken);
  nearInter = null; let bd = 99;
  for (const it of inter) {
    if (it.kind === 'portal' && it.to !== 'hub' && !it.exit) { const [lit, lock] = portalState(it.to); it.lit = lit; it.lock = lock; }   // exit: saída (de covil), nunca trancada
    const d = Math.hypot(it.x - P.x, it.z - P.z);
    if (it.kind === 'frag' && d < 1.3 && !it.taken) { collectFrag(it); continue; }
    if (it.kind === 'frag') continue;
    if (it.kind === 'qitem') { if (d < 1.25 && !it.taken) collectQ(it); continue; }
    if (it.kind === 'pylon') { if (!it.used && d < 1.5) usePylon(it); continue; }
    if (it.kind === 'dragon' && d < 2.8 && d > .01) { moveSafe(P, (it.x - P.x) / d * (d - 2.8), (it.z - P.z) / d * (d - 2.8), .4); }
    if (d < (it.r || 1.8) && d < bd && !(it.kind === 'chest' && it.open)) { bd = d; nearInter = it; }
  }
  for (const n of npcs) { if (!n.visible) continue; const d = Math.hypot(n.x - P.x, n.z - P.z); if (d < 2.2 && d < bd) { bd = d; nearInter = { kind: 'npc', npc: n }; } }
  { const rv = coopReviveTarget(); if (rv && rv.d < bd) { bd = rv.d; nearInter = { kind: 'revive', id: rv.id, name: rv.name }; } }   // co-op: companheiro caído
  if (RG.key === 'hub') { const [fx, fz] = HUB.fountain, d = Math.hypot(fx - P.x, fz - P.z); if (d < 3.4 && d < bd) { bd = d; nearInter = { kind: 'shrine', x: fx, z: fz, hub: true }; } }
  const pr = $('#prompt'), tu = $('#tUse');
  if (nearInter && P.dieT < 0) {
    const HL = { bank: 'Banco do Tear', wardrobe: 'Abrir o guarda-roupa', bench: 'Sentar no banco', fish: G.fishing ? (G.fishing.bite ? 'PUXAR!' : 'Esperando o peixe…') : 'Pescar · ' + HUB.fishSpots[nearInter.spot || 0].n, fishery: 'Pesqueiro: mercado, iscas e varas', obelisk: nearInter.kind === 'obelisk' ? (obelList().includes(nearInter.obId) ? 'Viajar pelo obelisco' : 'Despertar o obelisco') : '', cave: nearInter.kind === 'cave' ? 'Entrar no covil · ' + WZ[nearInter.zone].n : '', revive: nearInter.kind === 'revive' ? (COOP.sew ? 'Costurando ' + nearInter.name + '…' : 'Costurar ' + nearInter.name) : '', house: H().owned ? 'Entrar em casa' : 'Casa à venda · ' + HOUSE_COST + ' Centelhas', stash: 'Abrir o baú', catalog: 'Catálogo da casa (mobília e baú)', mail: 'Correio do Tear', bed: 'Dormir (+15% de XP)' };
    const label = HL[nearInter.kind] || (nearInter.kind === 'appletree' ? 'Deixar a maçã na macieira' : nearInter.kind === 'altar' ? 'Desafiar ' + BOSSDEF[REG[RG.key].boss].name.split(',')[0] + ' de novo · ' + curDiff().n : nearInter.kind === 'npc' ? 'Falar com ' + nearInter.npc.name : nearInter.kind === 'shrine' ? 'Descansar e salvar' : nearInter.kind === 'chest' ? 'Abrir baú' : nearInter.kind === 'portal' ? (nearInter.to === 'hub' ? 'Voltar à Vila Brasa' : 'Entrar: ' + REG[nearInter.to].name) : nearInter.kind === 'dragon' ? 'Falar com Varkhaz' : nearInter.kind === 'board' ? 'Ver contratos' : nearInter.kind === 'riftportal' ? 'Entrar na Fenda do Tear' : 'Usar');
    pr.innerHTML = (G.touch ? '' : '<kbd>E</kbd>') + label; pr.hidden = false; tu.hidden = !G.touch;
    if (G.touch) { const k = nearInter.kind, vb = k === 'house' ? (H().owned ? 'ENTRAR' : 'VER') : k === 'stash' || k === 'mail' || k === 'wardrobe' || k === 'bank' ? 'ABRIR' : k === 'catalog' ? 'VER' : k === 'bed' ? 'DORMIR' : k === 'npc' || k === 'dragon' ? 'FALAR' : k === 'chest' ? 'ABRIR' : k === 'shrine' ? 'DESCANSAR' : k === 'portal' || k === 'riftportal' ? 'ENTRAR' : k === 'altar' ? 'DESAFIAR' : k === 'appletree' ? 'DEIXAR' : 'USAR', sp = tu.firstElementChild; if (sp && sp.textContent !== vb) sp.textContent = vb; }
  } else { pr.hidden = true; tu.hidden = true; }
  if (!coopIsGuest()) for (const rm of RG.rooms) {   // co-op: só o anfitrião cria inimigos; a sala acorda com qualquer jogador perto
    if (rm.en && !rm.spawned && coopNear(rm.wx, rm.wz, ((rm.r || Math.max(rm.w, rm.h)) + 3) * T)) {
      rm.spawned = true; let k = 0;
      const grp = []; for (const [type, n] of Object.entries(rm.en)) for (let i = 0; i < n; i++) { const [x, z] = freeSpot(rm.wx, rm.wz, (rm.r || Math.min(rm.w, rm.h)) * T * .7); grp.push(spawnEnemy(type, x, z, k++ * .12)); }
      grp.forEach(e => e.room = rm);
      if (rm.alpha && grp.length) {   // Alfa (e, no covil, o Alfa com nome do bioma: maior e bem mais forte)
        const e = (rm.lair && grp.find(x => x.type === rm.lair[0])) || grp[0]; makeElite(e); e.alpha = true;
        e.elite.name = rm.lair ? rm.lair[1] : ENAME[e.type] + ' Alfa'; e.hp = e.maxHp = Math.round(e.maxHp * (rm.lair ? 4 : 1.5));
        if (rm.lair) { e.lair = true; e.scale *= 1.55; }
      }
      else if (grp.length && Math.random() < (RG.wild ? (G.bloodT > 0 ? .45 : .1) + (rm.zone === 7 ? .15 : 0) + .12 * nightK() : G.rift ? .65 : .35) + .05 * (G.save.diff || 0)) makeElite(pick(grp));   // Ermos: Lua de Sangue e Ermo Profundo têm mais elites
      if (grp.length >= 5 && (G.save.diff || 0) >= 3 && Math.random() < .35) makeElite(pick(grp.filter(e => !e.elite)));
      if (!RG.thiefDone && rm.kind !== 'boss' && Math.random() < .14) { RG.thiefDone = true; spawnThief(rm); }
    }
    if (rm.kind === 'boss' && !boss && (G.rift ? G.rift.bossUp && !G.rift.done : !G.save.bosses[RG.key]) && coopNear(rm.wx, rm.wz, (rm.r - 1.5) * T)) startBoss(rm);
  }
}
function interact() {
  if (!nearInter || P.dieT >= 0) return;
  const it = nearInter;
  if (it.kind === 'revive') { coopStartSew(it.id); return; }
  if (it.kind === 'npc' && it.npc.merc !== undefined) { it.npc.talkT = 3; openWShop(it.npc.merc); return; }
  if (it.kind === 'npc') { const n = it.npc; n.talkT = 4; G.save.met['t_' + n.id] = true; const lines = questLines(n.id) || DIALOG[n.id](); say(lines, () => updateObjective()); }
  else if (it.kind === 'bench') sitBench(it);
  else if (it.kind === 'fish') fishAction(it.spot);
  else if (it.kind === 'fishery') openFishery();
  else if (it.kind === 'obelisk') useObelisk(it);
  else if (it.kind === 'cave') enterCave(it);
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
  } else if (it.kind === 'bank') { openMenu('bank');
  } else if (it.kind === 'wardrobe') { openWardrobe();
  } else if (it.kind === 'mail') { openMenu('mail');
  } else if (it.kind === 'bed') {
    fadeTo(1, .35, () => { P.hp = P.maxHp; G.save.potions = stats().maxPot; G.buffs.descanso = 600; writeSave(); fadeTo(0, .9); toast('BEM DESCANSADO', true, '+15% de XP por 10 minutos · vida e poções cheias', '#ffd27a'); sfx('heal'); });
  } else if (it.kind === 'appletree') {
    const s = G.save; it.taken = true;
    say([{ who: '', text: 'Você deixa a maçã do Vovô Brann ao pé da macieira e se afasta um pouco.' }, { who: '', text: s.ended === 'B' ? 'O Sol pisca. Duas vezes. Quando você olha de novo, a maçã sumiu, e no lugar dela há uma escama dourada, ainda morna.' : 'Um vento quente sopra do norte, com cheiro de brasa. Quando você olha de novo, a maçã sumiu, e no lugar dela há uma escama dourada.' }], () => { s.q.brann.p = 1; s.q.brann.how = 'tree'; writeSave(); toast('MAÇÃ ENTREGUE', false, 'FALE COM O VOVÔ BRANN', '#ff8a6a'); });
  } else if (it.kind === 'altar') { if (boss) return; const rm = RG.rooms.find(r => r.kind === 'boss'); if (!rm) return; G.rematch = true; startBoss(rm); for (let i = 0; i < 50; i++) { const a = rr(0, 6.28); spawn({ x: it.x, y: 1, z: it.z, vx: Math.cos(a) * 4, vy: rr(0, 3), vz: Math.sin(a) * 4, life: .7, s0: .14, s1: .03, b0: 1, b1: .2, mat: 30, drag: 2 }); }
  } else if (it.kind === 'board') { openMenu('board');
  } else if (it.kind === 'riftportal') { if (!it.lit) { toast('A Fenda abre depois de recuperar o Fio Verde.'); return; } G.arrive = { region: 'hub', x: it.x, z: it.z + 4.5 }; openMenu('riftm');   // na volta, chega no santuário
  } else if (it.kind === 'portal') {
    if (it.to !== 'hub' && !it.exit) { const [lit, lock] = portalState(it.to); it.lit = lit; it.lock = lock; }
    if (!it.lit) { toast(it.lock || 'O portal está apagado.'); return; }
    if (it.to === 'wilds' && RG.key === 'hub' && netGroupWilds()) return;   // co-op: o líder abre os Ermos para o grupo
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
  G.rematch = false; G.wzone = null; G.amb = null;
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
    inter.push({ kind: 'bank', x: HUB.bank.x, z: HUB.bank.z + 4.6, r: 2.2 });   // Banco do Tear: a porta do cofre, no alto da escada
    { const qb = G.save.q && G.save.q.brann; if (qb && qb.st === 'active' && !qb.p && G.save.ended) inter.push({ kind: 'appletree', x: 25, z: 51.4, r: 2.4 }); }
    { const [gx, gz] = HUB.sanct.gate; inter.push({ kind: 'riftportal', x: gx, z: gz, r: 3, y: .32, scale: .8, lit: !!G.save.bosses.forest, model: getModel('riftgate'), anim: newAnim(getModel('riftgate')), yaw: 0 }); }   // no Santuário da Fenda
    ensureContracts();
    for (const p of HUB.portals) { const [lit, lock] = portalState(p.to); const mk = PORTAL_FX[p.to] !== undefined ? 'portal_' + p.to : 'portal'; inter.push({ kind: 'portal', to: p.to, x: p.x, z: p.z, r: 2.2, lit, lock, model: getModel(mk), anim: newAnim(getModel(mk)), yaw: p.yaw || 0 }); }   // um estilo por destino
    for (const n of NPCS) { const m = makeModel('npc-' + n.id, () => buildHumanoid(n.cfg, 32 + NPCS.indexOf(n) * 8)); npcs.push({ ...n, model: m, anim: newAnim(m), yaw: n.baseYaw || 0, talkT: 0, visible: n.id !== 'desf' || (G.save.bosses.forest && (!G.save.ended || G.save.ended === 'B')) }); }
    spawnCritters();
    // Bairro Leste: Bardo, bancos da fogueira, ponto de pesca e bonecos de treino
    { const m = makeModel('npc-bardo', () => buildHumanoid(BARD.cfg, 152)); npcs.push({ ...BARD, model: m, anim: newAnim(m), yaw: BARD.baseYaw, talkT: 0, visible: true }); }
    for (const n of EAST_NPCS) { const m = makeModel('npc-' + n.id, () => buildHumanoid(n.cfg, n.base)); npcs.push({ ...n, model: m, anim: newAnim(m), yaw: n.baseYaw || 0, talkT: 0, visible: true }); }
    for (const [bx, bz, by] of HUB.benches) inter.push({ kind: 'bench', x: bx, z: bz, yaw: by, r: 1.6 });
    HUB.fishSpots.forEach((f, i) => inter.push({ kind: 'fish', spot: i, x: f.x + 1.4, z: f.z, r: 2.2 }));   // lago e píeres do rio
    inter.push({ kind: 'fishery', x: HUB.fishery[0], z: HUB.fishery[1], r: 2 });   // banca do Pesqueiro: mercado, iscas e varas
    for (const [dx, dz] of HUB.dummies) { const e = spawnEnemy('skel', dx, dz, 0); e.type = 'dummy'; e.model = getModel('dummy'); e.anim = newAnim(e.model); e.scale = 1; e.dummy = true; e.spawnT = 0; e.hp = e.maxHp = 5000; e.yaw = 0; e.log = []; }
    if (G.save.q && G.save.q.nina && G.save.q.nina.st === 'active') placeNina();
  } else if (key === 'home') {
    setupHome();
  } else {
    const st = RG.start; if (RG.wild) RG.camps = [];
    inter.push({ kind: 'portal', to: G.rift && G.rift.cave ? 'wilds' : 'hub', exit: !!(G.rift && G.rift.cave), x: st.wx, z: st.wz - 3.2, r: 2.2, lit: true, model: getModel('portal'), anim: newAnim(getModel('portal')), yaw: 0 });
    RG.rooms.forEach((rm, i) => {
      if (rm.kind === 'shrine') inter.push({ kind: 'shrine', x: rm.wx, z: rm.wz, r: 2, model: getModel('shrine'), anim: newAnim(getModel('shrine')), yaw: 0 });
      if (rm.kind === 'obelisk') {
        inter.push({ kind: 'obelisk', zone: rm.ob, obId: rm.obId ?? rm.ob * 10, x: rm.wx, z: rm.wz, r: 2, model: getModel('pylon'), anim: newAnim(getModel('pylon')), yaw: 0 });
        if (RG.wild) {   // acampamento seguro com mercador suspeito
          (RG.camps = RG.camps || []).push({ x: rm.wx, z: rm.wz, zone: rm.ob, id: rm.obId });
          inter.push({ kind: 'camp', x: rm.wx, z: rm.wz + 3.4, r: .01, model: getModel('camp'), anim: newAnim(getModel('camp')), yaw: 0 });
          const m = makeModel('npc-merc', () => buildHumanoid(MERC_CFG, 128)); npcs.push({ id: 'merc', merc: rm.obId ?? rm.ob * 10, name: 'Mercador Suspeito', x: rm.wx + 3, z: rm.wz + 1.2, baseYaw: -.6, cfg: MERC_CFG, model: m, anim: newAnim(m), yaw: -.6, talkT: 0, visible: true });
        }
      }
      if (rm.kind === 'cave') inter.push({ kind: 'cave', zone: rm.zone, ring: rm.ring, ri: i, x: rm.wx, z: rm.wz, r: 2.2, model: getModel('portal'), anim: newAnim(getModel('portal')), lit: false, yaw: 0 });
      if (rm.chest) { const id = key + '-c' + i, open = G.save.chests.includes(id); inter.push({ kind: 'chest', id, x: rm.wx + (rm.frag !== undefined ? 2 : 0), z: rm.wz - 1, r: 1.8, open, openT: open ? 9 : 0, model: getModel('chest'), anim: newAnim(getModel('chest')), yaw: 0 }); }
      if (rm.frag !== undefined && !G.save.frags.includes(rm.frag)) inter.push({ kind: 'frag', idx: rm.frag, x: rm.wx, z: rm.wz, model: getModel('frag'), anim: newAnim(getModel('frag')), yaw: 0 });
      if (rm.kind === 'boss' && G.save.bosses[key]) { const calm = key === 'peaks' && G.save.dragonCalm && !G.save.ended; inter.push({ kind: 'portal', to: 'hub', x: rm.wx + (calm ? 6 : 0), z: rm.wz + (calm ? 5 : 0), r: 2, lit: true, model: getModel('portal'), anim: newAnim(getModel('portal')), yaw: 0 }); if (calm) inter.push(calmDragonInter(rm)); if (key !== 'peaks' || G.save.ended) inter.push({ kind: 'altar', x: rm.wx - 4.5, z: rm.wz + 3.5, r: 1.9, model: getModel('pedestal'), anim: newAnim(getModel('pedestal')), yaw: 0 }); }
    });
    if (RG.wild) for (const rm of RG.rooms) if (rm.zone === 2 && rm.en) for (let k = 0; k < 3; k++) { const a = k * 2.1 + rm.i, d = 3.2 + (k % 2) * 1.4; G.zones.push({ x: rm.wx + Math.cos(a) * d, z: rm.wz + Math.sin(a) * d, r: 1.5, t: 0, dur: 1e9, team: 'e', mat: 152, web: true }); }   // teias que deixam lento
    ({ wilds: ['javali', 'lobo', 'urso', 'gosmo', 'wisp', 'imp', 'bat', 'beetle', 'fantasma', 'aranha', 'skel', 'sapo', 'afogado'], forest: ['gosmo', 'wisp', 'golem'], crypt: ['skel', 'bat', 'skull'], peaks: ['imp', 'beetle', 'dragon'], swamp: ['sapo', 'afogado', 'hydra'], glass: ['sentinela', 'fantasma', 'reflexo'] })[key === 'rift' ? G.rift.base : key].forEach(k => getModel(DEF[k] ? DEF[k].model : k));
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
  const cp = G.save.cp, arr = G.arrive; if (key !== 'rift') G.arrive = null;   // arrive: voltar na boca da caverna
  if (arr && arr.region === key) { sx = arr.x; sz = arr.z; G.save.cp = { region: key, x: sx, z: sz }; }
  else if (atCp && cp && cp.region === key && !blocked(Math.floor(cp.x / T), Math.floor(cp.z / T)) && cp.x < RG.W * T && cp.z < RG.H * T) { sx = cp.x; sz = cp.z; }   // checkpoint que caiu em parede (mapa mudou): volta ao início
  else if (key === 'hub') { [sx, sz] = HUB.spawn; }
  else if (key === 'home') { sx = 16; sz = 17.6; }
  else { sx = RG.start.wx; sz = RG.start.wz + 1.5; G.save.cp = { region: key, x: sx, z: sz }; }
  if (!P) makePlayer(sx, sz); else { P.x = sx; P.z = sz; P.vx = P.vz = P.kx = P.kz = 0; P.dieT = -1; }
  P.maxHp = stats().maxHp; if (key === 'hub') P.hp = P.maxHp;
  cam.x = P.x; cam.z = P.z;
  writeSave(); updateObjective(); setMusic(key === 'rift' ? G.rift.base : key); netRegion(key); MM.key = null; setupMinimap();
  setTimeout(() => toast(spec.name.toUpperCase(), true, spec.sub), 500);
  const rq = key === 'hub' && requiredTalk(); if (rq && G.save.met.ysolde) setTimeout(() => toast(NPCS.find(n => n.id === rq).name + ' quer falar com você', false, 'SIGA O ! DOURADO'), 2800);
  if (key === 'hub' && G.save.met.ysolde && !G.save.met.houseTip && G.save.met.wildTip) { G.save.met.houseTip = true; setTimeout(() => toast('CASA À VENDA', true, 'a leste da forja · baú, correio e mobília com bônus'), 4200); }
  if (key === 'hub' && G.save.met.ysolde && !G.save.met.wildTip) { G.save.met.wildTip = true; setTimeout(() => toast('NOVO: OS ERMOS', true, 'o portão ao sul da vila leva às terras selvagens · bichos para upar'), 4200); }
  if (key === 'wilds') setTimeout(() => toast('Quanto mais longe da vila, mais perigoso', false, 'OITO BIOMAS · DESPERTE OS OBELISCOS PARA VIAJAR'), 3200);
  if (key === 'hub' && G.save.met.ysolde && !G.save.met.diffTip) { G.save.met.diffTip = true; setTimeout(() => toast('Quer mais desafio?', false, 'A DIFICULDADE FICA NO MENU (ESC)'), 5600); }
  updateDiffHud();
}
const MM = { key: null, base: null, seen: null, t: 0 };
/** Mapa do Cartógrafo: sem ele não há minimapa nem mapa grande. Quem já explorava os Ermos antes dele existir ganha um. */
const MAP_PRICE = { otto: 250, merc: 400 };
function hasMap() { const s = G.save; if (!s) return false; if (!s.map && (s.wseen || (s.obel && s.obel.length))) s.map = true; return !!s.map; }
const TRAIL_S = 8 * 60;   // a trilha some em 8 minutos
const trailAge = p => p[2] ? (Date.now() / 1000 - p[2]) / TRAIL_S : 2;   // 0 nova, 1 sumiu
const mapKeep = k => k && k !== 'rift' && k !== 'home';   // regiões fixas: o explorado e a trilha ficam salvos
function mapStore() { const s = G.save; s.mseen = s.mseen || {}; if (s.wseen && !s.mseen.wilds) { s.mseen.wilds = s.wseen; } delete s.wseen; s.trail = s.trail || {}; return s; }
function hexRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function setupHome() {
  const f = H().f; inter = [];
  inter.push({ kind: 'portal', to: 'hub', x: 16, z: 19.6, r: 1.7, lit: true, model: null, yaw: 0 });
  inter.push({ kind: 'stash', x: 8.6, z: 7.6, r: 2, model: getModel('chest'), anim: newAnim(getModel('chest')), yaw: 0 });
  inter.push({ kind: 'catalog', x: 12.6, z: 8.2, r: 1.6 });
  inter.push({ kind: 'mail', x: 23.6, z: 8.3, r: 1.6 });
  if (f.cama) inter.push({ kind: 'bed', x: 22.4, z: 11.4, r: 1.6 });
  if (f.guarda) inter.push({ kind: 'wardrobe', x: 24.5, z: 8.4, r: 1.5 });
  if (f.estatua) { const m = makeModel('statue:' + JSON.stringify(G.char), () => { const r = buildHumanoid({ ...G.char, seed: 5 }, 0); for (let i = 0; i < r.data.length; i += STRIDE) { const m0 = r.data[i + 6]; r.data[i + 6] = (m0 === 6 || m0 === 7 || m0 >= 120) ? 26 : 25; } return r; }); inter.push({ kind: 'statue', x: 9.6, z: 11.6, r: .01, y: .55, scale: 1.3, model: m, anim: newAnim(m), yaw: .6 }); }
}
function homeRebuild() { if (RG && RG.key === 'home') { if (WORLDS.home) WORLDS.home.chunks.forEach(freeVAO); WORLDS.home = buildWorld('home', RG); WD = WORLDS.home; emitAcc = {}; setupHome(); } }
function rebuildHub() { if (!WORLDS.hub) return; WORLDS.hub.chunks.forEach(freeVAO); if (RG && RG.key === 'hub') { WORLDS.hub = buildWorld('hub', RG); WD = WORLDS.hub; emitAcc = {}; } else delete WORLDS.hub; }
const MMW = 96, MMH = 80;   // tamanho da janela do minimapa nos Ermos (em ladrilhos)
function setupMinimap() {
  const cv = $('#mmap'), show = RG && RG.key !== 'home' && hasMap(); cv.hidden = !show; $('#mmapZ').hidden = !show; if (!show) { MM.key = null; return; }
  const W = RG.W, H = RG.H; cv.width = RG.wild ? MMW : W; cv.height = RG.wild ? MMH : H; MM.key = RG; MM.seen = new Uint8Array(W * H); MM.base = new Uint8ClampedArray(W * H * 4);
  { const st = mapStore(); st.mseenN = st.mseenN || {}; if (mapKeep(RG.key) && st.mseen[RG.key] && (st.mseenN[RG.key] || (RG.key === 'wilds' ? 78000 : W * H)) === W * H) seenDecode(st.mseen[RG.key], MM.seen); st.mseenN[RG.key] = W * H; }   // o que você já explorou fica no mapa (se o mapa mudou de tamanho, recomeça)   // Ermos: o canvas é uma janela em volta do herói
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
/** Explorado dos Ermos no save: sequências alternadas (não visto, visto...) em base 36. */
function seenEncode(a) { const out = []; let cur = 0, n = 0; for (let i = 0; i < a.length; i++) { if (a[i] === cur) n++; else { out.push(n.toString(36)); cur = a[i]; n = 1; } } out.push(n.toString(36)); return out.join(','); }
function seenDecode(s, a) { let i = 0, v = 0; for (const t of String(s).split(',')) { const n = parseInt(t, 36) || 0; if (v) a.fill(1, i, Math.min(a.length, i + n)); i += n; v ^= 1; } }
function updateMinimap(dt) {
  if (!RG || RG.key === 'home' || !P || !hasMap()) return; if (MM.key !== RG) setupMinimap(); if (!MM.seen) return;
  {   // trilha: um ponto a cada 4 unidades, os últimos 300 por região
    const tr = mapKeep(RG.key) && (mapStore().trail[RG.key] = G.save.trail[RG.key] || []), l = tr && tr[tr.length - 1];
    if (tr && (!l || Math.hypot(l[0] - P.x, l[1] - P.z) > 4)) { tr.push([Math.round(P.x), Math.round(P.z), Math.floor(Date.now() / 1000)]); while (tr.length > 300 || (tr.length && trailAge(tr[0]) > 1)) tr.shift(); }
  }
  const W = RG.W, H = RG.H, tx = Math.floor(P.x / T), tz = Math.floor(P.z / T), rad = RG.wild ? 9 : 7;
  for (let y = tz - rad; y <= tz + rad; y++) for (let x = tx - rad; x <= tx + rad; x++) if (x >= 0 && y >= 0 && x < W && y < H && (x - tx) ** 2 + (y - tz) ** 2 <= rad * rad && !MM.seen[y * W + x]) { MM.seen[y * W + x] = 1; MM.dirty = true; }
  if (mapKeep(RG.key) && MM.dirty && (MM.saveT = (MM.saveT || 0) - dt) <= 0) { MM.saveT = 4; MM.dirty = false; mapStore().mseen[RG.key] = seenEncode(MM.seen); }
  MM.t -= dt; if (MM.t > 0) return; MM.t = .2;
  const VW = RG.wild ? MMW : W, VH = RG.wild ? MMH : H, ox = RG.wild ? clamp(tx - (MMW >> 1), 0, W - MMW) : 0, oy = RG.wild ? clamp(tz - (MMH >> 1), 0, H - MMH) : 0;
  const cv = $('#mmap'), cx = cv.getContext('2d'), img = cx.createImageData(VW, VH), d = img.data;
  for (let yy = 0; yy < VH; yy++) for (let xx = 0; xx < VW; xx++) { const i = (yy + oy) * W + xx + ox, o = (yy * VW + xx) * 4; if (MM.seen[i]) { d[o] = MM.base[i * 4]; d[o + 1] = MM.base[i * 4 + 1]; d[o + 2] = MM.base[i * 4 + 2]; } else { d[o] = 8; d[o + 1] = 6; d[o + 2] = 14; } d[o + 3] = 255; }
  cx.putImageData(img, 0, 0);
  const dot = (x, z, col, s = 1) => { cx.fillStyle = col; cx.fillRect(Math.floor(x / T) - ox - (s >> 1), Math.floor(z / T) - oy - (s >> 1), s, s); };
  if (G.save.trail && G.save.trail[RG.key]) for (const p of G.save.trail[RG.key]) { const a = 1 - trailAge(p); if (a > 0) dot(p[0], p[1], `rgba(242,184,75,${(.7 * a).toFixed(2)})`, 1); }   // trilha que vai sumindo
  const seenAt = (x, z) => MM.seen[Math.floor(z / T) * W + Math.floor(x / T)];
  for (const it of inter) { if (!seenAt(it.x, it.z)) continue; if (it.kind === 'portal' || it.kind === 'riftportal') dot(it.x, it.z, '#5ff0ff', 2); else if (it.kind === 'shrine') dot(it.x, it.z, '#6fff9a', 2); else if (it.kind === 'obelisk') dot(it.x, it.z, obelList().includes(it.obId) ? '#9ff6ff' : '#4a7a88', 3); else if (it.kind === 'cave') dot(it.x, it.z, '#c08a4a', 3); else if (it.kind === 'chest' && !it.open) dot(it.x, it.z, '#ffd23d', 2); else if (it.kind === 'altar') dot(it.x, it.z, '#d07bff', 2); else if (it.kind === 'pylon' && !it.used) dot(it.x, it.z, '#fff08a', 1); }
  for (const rm of RG.rooms) { if (rm.kind === 'boss' && seenAt(rm.wx, rm.wz)) dot(rm.wx, rm.wz, '#ff3a3a', 3); if (RG.wild && rm.alpha && !rm.spawned && seenAt(rm.wx, rm.wz)) dot(rm.wx, rm.wz, '#d07bff', 2); }
  for (const e of enemies) if (e.dieT < 0 && seenAt(e.x, e.z)) dot(e.x, e.z, e.elite ? '#d07bff' : '#ff5a4a', 1);
  if (boss) dot(boss.x, boss.z, '#ff2020', 3);
  dot(P.x, P.z, '#ffffff', 2);
  if (RG.camps) for (const c of RG.camps) if (seenAt(c.x, c.z)) dot(c.x, c.z, '#ffd27a', 3);
  const zl = $('#mmapZ'), z = RG.wild ? WZ[wZone(P.x / T, P.z / T)] : null, txt = z ? z.n.toUpperCase() + ' · NV ' + wildLv(P.x, P.z) + (inCamp(P.x, P.z) ? ' · SEGURO' : '') : (RG.key === 'rift' ? 'FENDA' : REG[RG.key].name.toUpperCase());
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



// ---------- Ermos: eventos, perigos, obeliscos e covis ----------
/** Uma vez por segundo nos Ermos: Lua de Sangue, emboscadas e os perigos de cada bioma. */
function wildsEvents(b) {
  if (coopIsGuest()) return;   // no grupo, quem simula é o anfitrião
  const ring = wRing(P.x / T, P.z / T);
  // Lua de Sangue: de tempos em tempos, 75 s com muito mais elites e +50% de XP
  G.bloodCD = (G.bloodCD ?? 360 + rr(0, 240)) - 1;
  if (G.bloodT > 0) { G.bloodT -= 1; if (G.bloodT <= 0) toast('A lua volta ao normal', false, 'FIM DA LUA DE SANGUE'); }
  else if (G.bloodCD <= 0 && isNight()) { G.bloodT = 75;   /* a Lua de Sangue só nasce à noite */ G.bloodCD = 540 + rr(0, 300); toast('LUA DE SANGUE', true, 'MAIS ELITES E +50% DE XP POR 75 SEGUNDOS', '#ff4a5a'); sfx('roar'); G.shake = Math.max(G.shake, .3); }
  // Emboscada (fora da Campina): monstros do bioma cercam o herói; vencer dá recompensa
  const A = G.amb;
  if (A) {
    if (A.list.every(e => e.dieT >= 0 || e.dead)) { G.amb = null; dropGold(P.x, P.z, 20 + 12 * A.ring); dropItem(P.x + 1, P.z, rollRar(A.ring >= 2 ? 2 : 1)); toast('EMBOSCADA VENCIDA', true, 'OS SAQUEADORES DEIXARAM O QUE CARREGAVAM', '#ffbf3d'); sfx('lvl'); }
    else if (Math.hypot(P.x - A.x, P.z - A.z) > 40) G.amb = null;
  } else {
    G.ambCD = (G.ambCD ?? 120 + rr(0, 90)) - 1;
    if (G.ambCD <= 0 && ring >= 1 && !enemies.some(e => e.dieT < 0 && Math.hypot(e.x - P.x, e.z - P.z) < 16)) {
      G.ambCD = 150 + rr(0, 120);
      const pool = WPOOL[b], n = 3 + ring + (G.bloodT > 0 ? 2 : 0), list = [];
      for (let i = 0; i < n; i++) { const a = i / n * 6.283 + rr(-.3, .3), [x, z] = freeSpot(P.x + Math.cos(a) * 9, P.z + Math.sin(a) * 9, 2.5); list.push(spawnEnemy(pick(pool), x, z, .4 + i * .15)); }
      if (Math.random() < .5) makeElite(pick(list));
      G.amb = { list, x: P.x, z: P.z, ring }; toast('EMBOSCADA!', true, WZ[b].n.toUpperCase(), '#ff8a5a'); sfx('roar');
    }
  }
  // Perigos de cada bioma (círculos marcados no chão antes de acertar)
  if (b === 4 && Math.random() < .18) wildsHazard(P.x + rr(-2.5, 2.5), P.z + rr(-2.5, 2.5), 1.5, 1.1, 23, 10 + WZ[4].lv * .8, 'PEDRAS DESABANDO');
  if (b === 6 && Math.random() < .3) wildsHazard(P.x + rr(-3, 3), P.z + rr(-3, 3), 1.1, .9, 21, 8 + WZ[6].lv * .7, 'CHUVA DE BRASAS');
}
function wildsHazard(x, z, r, dur, mat, dmg, warn) {
  if (warn && G.hazWarn !== warn) { G.hazWarn = warn; toast(warn, false, 'FIQUE FORA DOS CÍRCULOS'); }
  tels.push({ kind: 'circle', x, z, r, t: 0, dur, fn: () => { sfx('boom'); burst(x, .4, z, 26, mat, 4, .5, .16); if (P && Math.hypot(P.x - x, P.z - z) < r + .3) hurtPlayer(dmg, x, z); } });
}
/** Obelisco: desperta (uma vez) e leva a outros obeliscos despertos, ou ao portão da vila. */
function useObelisk(it) {
  const ob = obelList();
  if (!ob.includes(it.obId)) { ob.push(it.obId); writeSave(); sfx('lvl'); burst(it.x, 1.5, it.z, 40, 7, 4, .6, .1); toast('OBELISCO DESPERTO', true, obName(it.obId).toUpperCase() + ' · VIAGEM RÁPIDA LIBERADA', '#9ff6ff'); }
  G.wmTravel = it.obId; openMenu('wmap'); return;   // mapa de viagem: escolha o destino no mapa
  const dests = RG.rooms.filter(r => r.kind === 'obelisk' && r.ob !== it.zone && ob.includes(r.ob));
  const choices = dests.map(r => ({ t: WZ[r.ob].n + ' · Nv ' + WZ[r.ob].lv, fn: () => obeliskJump(r.wx + 1.6, r.wz + 1.6, WZ[r.ob].n) }));
  choices.push({ t: 'Portão da Vila Brasa', fn: () => obeliskJump(RG.start.wx, RG.start.wz + 1.5, 'Portão da Vila') });
  choices.push({ t: 'Ficar aqui' });
  say([{ who: 'Obelisco', text: dests.length ? 'Os fios do obelisco vibram. Para onde?' : 'Os fios vibram, mas nenhum outro obelisco desperto responde. Desperte mais deles pelos Ermos.', choices }], () => { });
}
function obeliskJump(x, z, name) {
  fadeTo(1, .3, () => { P.warp = true; P.x = x; P.z = z; P.vx = P.vz = P.kx = P.kz = 0; G.save.cp = { region: RG.key, x, z }; G.wzone = null; fadeTo(0, .5); toast(name.toUpperCase(), false, 'VIAGEM PELO OBELISCO'); });
}
/** Covil: uma caverna com mapa fixo (mesma semente sempre), no nível do bioma, com guardião; volta para a boca da caverna. */
const CAVE_BOSS = [null, 'spider', 'spider', 'eye', 'knight', 'knight', 'eye', 'eye'];
function enterCave(it) {
  const b = WZ[it.zone], L = clamp(b.lv - (G.save.lvl || 1), 1, 30);
  G.riftRoll = { base: b.cave, boss: CAVE_BOSS[it.zone] || 'spider', aff: [] };
  G.arrive = { region: 'wilds', x: it.x, z: it.z + 2.6 };
  withSeed(70001 + it.ri * 131, () => startRift(L));
  G.rift.cave = { zone: it.zone }; REG.rift.name = 'Covil · ' + b.n; REG.rift.sub = 'uma caverna sob os Ermos';
}

// ---------- Vila 2.0: Bairro Leste ----------
/** Sentar no banco (emote que os outros veem). Perto da fogueira, a vida volta aos poucos. */
function sitBench(it) {
  const y = it.yaw || 0; P.x = it.x - Math.sin(y) * .12; P.z = it.z - Math.cos(y) * .12; P.vx = P.vz = 0; P.yaw = y;   // de frente para a fogueira, no meio do assento
  if (window.TessGame) window.TessGame.myEmote('sentar'); else { P.emote = 'sentar'; P.emoteT = 0; }
  const n = NETON(); if (n && n.room) n.emote('sentar');
  sfx('ui');
}
/** Pesca: lançar a linha (gasta uma isca, se escolhida), esperar o peixe morder e puxar na janela.
 * Peixes pesados pedem mais puxões; se a vara for fraca para ele, a linha arrebenta. O peixe vai para o cesto
 * (vende na banca do Pesqueiro, com preço do mercado) e dá XP de Pescador. Regras em shared/fish.ts (TessFish). */
const TF = window.TessFish;
const fishLv = () => TF.fisherLevel((G.save && G.save.fxp) || 0);
const curSpot = () => HUB.fishSpots[G.fishing ? G.fishing.spot : (G.fishSpot || 0)] || HUB.fishSpots[0];
function hasRod() { const s = G.save; return !!(s && (s.rod || (s.q && s.q.vara && s.q.vara.st === 'done') || (s.st && s.st.fish > 0))); }   // quem já pescava antes da missão fica com a vara
function fishAction(spot = 0) {
  const F = G.fishing, s = G.save;
  if (!hasRod()) { toast('Sem vara de pesca', false, 'O PESCADOR IVO, NO PESQUEIRO, PODE AJUDAR', '#ffbf3d'); sfx('ui'); return; }
  if (G.fishCatch) return;
  if (!F) {
    G.fishSpot = spot; const sp = HUB.fishSpots[spot] || HUB.fishSpots[0];
    s.bait = s.bait || {}; let bait = s.baitSel && (s.bait[s.baitSel] || 0) > 0 ? TF.baitById(s.baitSel) : null;
    if (bait) s.bait[bait.id]--;
    const f = TF.rollFish(sp.water, fishLv(), bait ? bait.id : null, Math.random, nightK());   // de noite: Enguia, Peixe-Lua e Rei-do-Rio aparecem muito mais
    P.yaw = Math.atan2(sp.x + 4 - P.x, sp.z - P.z);
    G.fishing = { t: 0, spot, f, bait: bait ? bait.id : null, pulls: 0, biteAt: (2.6 + Math.random() * 4) * (bait ? bait.bite : 1), bite: false };
    P.emote = null; sfx('ui');
    toast('Linha lançada…', false, (bait ? bait.n.toUpperCase() + ' · RESTAM ' + s.bait[bait.id] : 'SEM ISCA') + ' · APERTE QUANDO O PEIXE MORDER');
    return;
  }
  if (F.t < .7) return;   // ainda lançando
  if (!F.bite) { G.fishing = null; G.fishCatch = { t: 0, miss: true }; toast('Puxou cedo demais', false, 'O PEIXE FUGIU'); return; }
  const f = F.f, rodLv = s.rodLv || 0;
  if (f.rod > rodLv) { G.fishing = null; G.fishCatch = { t: 0, miss: true }; toast('A LINHA ARREBENTOU!', true, f.n.toUpperCase() + ' É PESADO DEMAIS · PRECISA DA ' + TF.RODS[f.rod].n.toUpperCase(), '#ff8a6a'); sfx('hurt'); return; }
  F.pulls++;
  if (F.pulls < f.w) {   // peixe grande: briga; puxe de novo na próxima janela
    F.biteT = 0; F.fight = (F.fight || 0) + 1; G.shake = Math.max(G.shake, .15); sfx('hit');
    const b = fishBob(G.time); burst(b[0], .15, b[2], 16, 15, 3, .4, .12);
    toast('ELE ESTÁ BRIGANDO!', true, 'PUXE DE NOVO · ' + F.pulls + '/' + f.w, f.c); return;
  }
  G.fishing = null;
  const st = s.st = s.st || {}; st.fish = (st.fish || 0) + 1;
  s.fish = s.fish || {}; s.fish[f.id] = Math.min(9999, (s.fish[f.id] || 0) + 1);
  s.fcount = s.fcount || {}; const first = !s.fcount[f.id]; s.fcount[f.id] = (s.fcount[f.id] || 0) + 1;
  const lv0 = fishLv(); s.fxp = (s.fxp || 0) + f.fx * (first ? 3 : 1); const lv1 = fishLv();
  gainXp(Math.round(f.g * .35));
  G.fishCatch = { t: 0, f, from: fishBob(G.time) };   // o peixe salta da água até a mão do herói
  const rare = (f.rare || 0) >= 2;
  setTimeout(() => {
    toast(f.n.toUpperCase(), rare || first, (first ? 'NOVO NA COLEÇÃO · ' : '') + 'NO CESTO (' + s.fish[f.id] + ') · VENDA NA BANCA DO PESQUEIRO', f.c); sfx(rare ? 'legend' : 'lvl');
    if (lv1 > lv0) setTimeout(() => { toast('PESCADOR NÍVEL ' + lv1, true, 'MAIS PEIXE RARO E MAIS TEMPO PARA PUXAR', '#9cf6ff'); sfx('lvl'); }, 1600);
  }, 650);
  const b = fishBob(G.time); burst(b[0], .15, b[2], 22, 15, 3, .5, .12); writeSave();
}
/** Janela para puxar: a vara e o nível de Pescador dão mais tempo. */
const fishWindow = () => .9 + TF.RODS[(G.save && G.save.rodLv) || 0].win + fishLv() * .01;
/** Onde a boia está agora (balança na água; afunda na mordida e corre de um lado para o outro na briga). */
function fishBob(t) {
  const F = G.fishing, sp = curSpot(), bx = sp.x + 4.2, bz = sp.z - .2;
  const dip = F && F.bite ? -.12 - Math.abs(Math.sin(t * 22)) * .08 : 0, run = F && F.fight ? Math.sin(t * 5) * .5 : 0;
  return [bx + (F && F.bite ? Math.sin(t * 17) * .08 : 0), .06 + Math.sin(t * 2.4) * .03 + dip, bz + run];
}
/** Missão da vara: minhocas-de-brasa escondidas pelo Bairro Leste (brilham no chão). */
const WORMS = [[101, 22], [113.5, 44], [127, 36.5], [139, 25]];
function updateWorms(dt) {
  const st = G.save.q.vara; st.got = st.got || [];
  WORMS.forEach(([x, z], i) => {
    if (st.got.includes(i)) return;
    if (Math.random() < dt * 3) spawn({ x: x + rr(-.25, .25), y: .15, z: z + rr(-.25, .25), vy: rr(.3, .7), life: .7, s0: .08, s1: .02, b0: 1, b1: .2, mat: 21 });
    if (Math.hypot(P.x - x, P.z - z) < 1.1) { st.got.push(i); st.p = st.got.length; sfx('frag'); burst(x, .2, z, 12, 21, 2, .4, .1); toast('MINHOCA-DE-BRASA', false, st.p + '/' + WORMS.length + ' · LEVE PARA O PESCADOR IVO'); writeSave(); }
  });
}
const LOOT_MS = 5 * 60 * 1000;   // o espólio fica no chão dos Ermos por 5 minutos
function updateCamps(dt) {
  if (!RG || !RG.wild || !P) return;
  checkLootLost(); updateNetLoot();
  const L = G.save.wloot;
  if (L) {
    if (Date.now() - L.t > LOOT_MS) { G.save.wloot = null; writeSave(); toast('O espólio se desfez', false, 'CENTELHAS E ITENS PERDIDOS NOS ERMOS', '#ff8a6a'); }
    else if (L.sid && netLootTake(L.sid, L.x, L.z)) { }   // na sala online: o servidor decide quem pega primeiro
    else if (P.dieT < 0 && Math.hypot(P.x - L.x, P.z - L.z) < 1.4) {
      const s = G.save, room = Math.max(0, BAG() - s.inv.length), back = L.items.splice(0, room);
      s.gold += L.gold; s.inv.push(...back); toast('ESPÓLIO RECUPERADO', true, `+${L.gold} CENTELHAS · ${back.length} ITENS` + (L.items.length ? ` · ${L.items.length} NÃO COUBERAM` : ''), '#ffbf3d'); sfx('legend');
      L.gold = 0; if (!L.items.length) G.save.wloot = null; writeSave();
    }
  }
  const inside = inCamp(P.x, P.z);
  if (inside && !G.inCamp) { toast('ACAMPAMENTO', false, 'ZONA SEGURA · MERCADOR, FOGUEIRA E VIAGEM PELO OBELISCO'); sfx('ui'); }
  G.inCamp = inside;
  if (inside && P.dieT < 0 && P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + P.maxHp * .03 * dt);
}
function updateHubLife(dt) {
  if (!RG || RG.key !== 'hub' || !P) { G.fishing = null; G.fishCatch = null; return; }
  // pesca: o peixe morde, a janela fecha
  const F = G.fishing;
  if (F) {
    F.t += dt;
    if (!F.bite && F.t >= Math.max(F.biteAt, .8)) { /* nunca morde antes de a linha cair na água */ F.bite = true; F.biteT = 0; toast('PEIXE MORDEU!', true, 'APERTE AGORA'); sfx('hit'); const b = fishBob(G.time); burst(b[0], .15, b[2], 14, 15, 2, .4, .1); }
    else if (F.bite && (F.biteT += dt) > fishWindow()) { G.fishing = null; G.fishCatch = { t: 0, miss: true }; toast(F.pulls ? 'Ele se soltou' : 'O peixe escapou', false, 'TENTE DE NOVO'); }
    const sp = curSpot(); if (Math.hypot(P.x - sp.x - 1.4, P.z - sp.z) > 3) G.fishing = null;
  }
  if (G.fishCatch && (G.fishCatch.t += dt) > (G.fishCatch.miss ? .6 : 1.3)) { if (!G.fishCatch.miss) { P.emote = 'comemorar'; P.emoteT = 4.6; } G.fishCatch = null; }
  if (G.save && G.save.q && G.save.q.vara && G.save.q.vara.st === 'active') updateWorms(dt);
  // fogueira: sentado perto dela, a vida volta
  if (P.emote === 'sentar' && Math.hypot(P.x - HUB.fire[0], P.z - HUB.fire[1]) < 6 && P.hp < P.maxHp) { P.hp = Math.min(P.maxHp, P.hp + P.maxHp * .04 * dt); if (Math.random() < dt * 4) spawn({ x: P.x + rr(-.3, .3), y: rr(.8, 1.6), z: P.z + rr(-.3, .3), vy: .6, life: .7, s0: .06, s1: .02, b0: 1, b1: .2, mat: 31 }); }
  // bonecos: dano por segundo dos últimos 5 s
  for (const e of enemies) {
    if (!e.dummy || !e.log.length) continue;
    e.dpsT = (e.dpsT || 0) - dt; if (e.dpsT > 0) continue; e.dpsT = 1;
    const now = G.time; e.log = e.log.filter(l => now - l[0] < 5);
    if (!e.log.length) continue;
    const span = Math.max(1, Math.min(5, now - e.log[0][0])), dps = Math.round(e.log.reduce((a, l) => a + l[1], 0) / span);
    popNum(e.x, 3.1, e.z, 'DPS ' + dps, 'info');
  }
}
