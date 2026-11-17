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
function netRegion(key) { const n = NETON(); if (n) n.setRegion(key, lookOfPlayer(), P ? [P.x, P.z] : null); if (key !== 'hub') clearRemoteMarks(); }
function netLook() { const n = NETON(); if (n) n.setLook(lookOfPlayer()); }
let netPosAcc = 0;
function netTick(dt) {
  const n = NETON(); if (!n || !RG || RG.key !== 'hub' || !P) return;
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
function poseRemote(r, t) {
  const A = r.anim; resetAnim(A);
  const e2 = { moveAmt: r.m, walkPh: r.walkPh, cls: r.look.cls, act: null, actT: 0, combo: 0, stance: 0, lean: 0, idleT: 0 };
  if (r.a === 'swing' || r.a === 'cast' || r.a === 'shoot') { e2.act = r.a; e2.actT = (t * 3) % .3; }
  poseHuman(A, e2, t);
  if (r.emoteT < 6 && r.m < .2) applyEmote(A, r.emote, t);
}
/** Chamado no render da vila: suaviza posições, anima e desenha. */
function drawRemotes(dt, t) {
  const n = NETON(); if (!n || !RG || RG.key !== 'hub' || !P) return;
  const list = n.players(); if (!list.length) return;
  const vis = assignRemoteSlots(list);
  for (const r of vis) {
    const s = rslots[r.slot]; if (!s || !s.model) continue;
    const k = 1 - Math.exp(-dt * 12);
    if (r.x === undefined || Math.hypot(r.tx - r.x, r.tz - r.z) > 8) { r.x = r.tx; r.z = r.tz; r.yaw = r.tyaw; }
    r.x = lerp(r.x, r.tx, k); r.z = lerp(r.z, r.tz, k); r.yaw += angDiff(r.yaw, r.tyaw) * k;
    r.walkPh = (r.walkPh || 0) + dt * 7 * r.m; r.emoteT = (r.emoteT ?? 9) + dt; r.chatT = (r.chatT ?? 9) + dt;
    if (!r.anim || r.anim.length !== s.model.bones.length) r.anim = newAnim(s.model);
    poseRemote(r, t);
    r.W = drawModel(s.model, r.anim, r.x, 0, r.z, r.yaw, 1, {});
    if (r.emote === 'comemorar' && r.emoteT < 2 && Math.random() < .5) spawn({ x: r.x + rr(-.4, .4), y: rr(.5, 2), z: r.z + rr(-.4, .4), vy: rr(1, 2), life: .7, s0: .1, s1: .02, b0: 1, b1: .2, mat: 30 });
  }
}

// ---------- nomes e balões ----------
const rmarks = new Map();
function clearRemoteMarks() { for (const el of rmarks.values()) el.remove(); rmarks.clear(); }
function updateRemoteMarks() {
  const n = NETON(), box = $('#marks');
  const show = n && RG && RG.key === 'hub' && P && (G.mode === 'play' || G.mode === 'dialog');
  const alive = new Set();
  if (show) for (const r of n.players()) {
    if (r.slot === undefined || r.x === undefined || Math.hypot(r.x - P.x, r.z - P.z) > 18) continue;
    const sc = project(r.x, 2.35, r.z); if (!sc) continue;
    alive.add(r.id);
    let el = rmarks.get(r.id);
    if (!el || !el.isConnected) { el = document.createElement('div'); el.className = 'tag rp'; el.innerHTML = '<i class="bub" hidden></i><span class="rn"></span><small class="rt"></small>'; box.appendChild(el); rmarks.set(r.id, el); }
    el.style.left = sc[0] + 'px'; el.style.top = sc[1] + 'px';
    const nm = el.querySelector('.rn'), tt = el.querySelector('.rt'), bub = el.querySelector('.bub');
    if (nm.textContent !== r.name) nm.textContent = r.name;
    if (tt.textContent !== r.title) tt.textContent = r.title;
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
  remoteEmote: (id, e) => { const r = NETON() && NETON().players().find(p => p.id === id); if (r) { r.emote = e; r.emoteT = 0; } },
  remoteChat: (id, text) => { const r = NETON() && NETON().players().find(p => p.id === id); if (r) { r.chat = text; r.chatT = 0; } },
  myEmote: e => { if (!P) return; P.emote = e; P.emoteT = 0; },
};
