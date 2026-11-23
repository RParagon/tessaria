/* Fios de Tessária · Interface: HUD, menus, toasts */
/* =========================================================
   UI: HUD, MENUS, TOASTS, NÚMEROS
   ========================================================= */
// Notificações em dois lugares, para não poluir o meio da tela:
//  - big (marcos: nível, chefe, item lendário, peixe raro…): no centro, UMA por vez, em fila (no máximo 3 esperando).
//    opts.now fura a fila (ex.: "PEIXE MORDEU!", que pede reação na hora).
//  - o resto (itens coletados, Centelhas, pesca comum, avisos): no feed do canto direito, abaixo do minimapa.
//    Repetidas se juntam (×2, ×3…) em vez de empilhar.
const TOASTQ = []; let toastCur = null, toastTimer = 0;
function toast(text, big, sub, color, opts) {
  text = String(text); sub = sub ? String(sub) : '';
  if (big) {
    if (opts && opts.now) { TOASTQ.length = 0; showBanner({ text, sub, color }); return; }
    if ((toastCur && toastCur.text === text) || TOASTQ.some(q => q.text === text)) return;   // já está na tela ou na fila
    TOASTQ.push({ text, sub, color }); while (TOASTQ.length > 3) TOASTQ.shift();
    if (!toastCur) nextBanner(); return;
  }
  feedPush(text, sub, color);
}
function showBanner(q) {
  const box = $('#toast'); box.innerHTML = ''; clearTimeout(toastTimer); toastCur = q;
  const el = document.createElement('div'); el.className = 'toast big'; el.textContent = q.text; if (q.color) el.style.color = q.color;
  if (q.sub) { const sm = document.createElement('small'); sm.textContent = q.sub; el.appendChild(sm); }
  box.appendChild(el); toastTimer = setTimeout(() => { el.remove(); toastCur = null; nextBanner(); }, TOASTQ.length ? 2000 : 2600);
}
function bannerClear() { clearTimeout(toastTimer); $('#toast').innerHTML = ''; toastCur = null; nextBanner(); }
function nextBanner() { const q = TOASTQ.shift(); if (q) showBanner(q); }
function feedPos() {   // logo abaixo do minimapa (ou dos botões do canto, quando não há minimapa)
  const f = $('#feed'); if (!f) return;
  const mm = $('#mmapZ'), hr = document.querySelector('.hud-r'), ref = mm && !mm.hidden ? mm : hr;
  const b = ref ? ref.getBoundingClientRect().bottom : 60; f.style.top = Math.round(b + 8) + 'px';
}
function feedPush(text, sub, color) {
  const f = $('#feed'); if (!f) return; feedPos();
  const key = text + '|' + sub;
  for (const el of f.children) if (el._k === key) {   // repetida: soma no contador e renova o tempo
    el._n++; el.querySelector('.n').textContent = '×' + el._n; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    clearTimeout(el._t); el._t = setTimeout(() => feedOut(el), 3400); f.appendChild(el); return;
  }
  const el = document.createElement('div'); el.className = 'toast'; el._k = key; el._n = 1;
  const b = document.createElement('b'); b.textContent = text; if (color) b.style.color = color; el.appendChild(b);
  const n = document.createElement('span'); n.className = 'n'; el.appendChild(n);
  if (sub) { const sm = document.createElement('small'); sm.textContent = sub; el.appendChild(sm); }
  f.appendChild(el); while (f.children.length > 4) f.firstChild.remove();
  el._t = setTimeout(() => feedOut(el), 3400);
}
function feedOut(el) { el.classList.add('out'); setTimeout(() => el.remove(), 300); }
function popNum(x, y, z, text, cls) {
  if (!VP) return;
  const c = [VP[0] * x + VP[4] * y + VP[8] * z + VP[12], VP[1] * x + VP[5] * y + VP[9] * z + VP[13], 0, VP[3] * x + VP[7] * y + VP[11] * z + VP[15]];
  if (c[3] <= 0) return;
  const r = canvas.getBoundingClientRect(), sx = (c[0] / c[3] * .5 + .5) * r.width, sy = (1 - (c[1] / c[3] * .5 + .5)) * r.height;
  const el = document.createElement('div'); el.className = 'num ' + (cls || ''); el.textContent = text; el.style.left = (sx + rr(-10, 10)) + 'px'; el.style.top = sy + 'px';
  const fx = $('#fx'); fx.appendChild(el); if (fx.children.length > 40) fx.firstChild.remove(); setTimeout(() => el.remove(), 850);
}
let hudCache = {};
function setTxt(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function updateHud() {
  if (!P) return;
  const s = G.save, st = stats();
  { const w = weatherNow(); setTxt('#hClock', outdoors() ? (nightK() > .5 ? '☾ ' : '☀ ') + hourStr() + (w.k > .4 && WEATHER[w.type].ic ? ' ' + WEATHER[w.type].ic : '') : ''); } { const ck = $('#hClock'); if (ck) ck.style.color = nightK() > .5 ? '#9cb8ff' : duskK() > .3 ? '#ff9a5a' : '#ffd27a'; }
  setTxt('#hName', G.char.name); { const nc = nameColorCss(G.char.namecolor), hn = $('#hName'); if (hn && hn._nc !== nc) { hn._nc = nc; hn.classList.toggle('aurora', nc === 'aurora'); hn.style.color = nc && nc !== 'aurora' ? nc : ''; } } setTxt('#hLv', eloLvl(s) !== s.lvl ? s.lvl + '→' + eloLvl(s) : eloMentor() ? s.lvl + '★' : s.lvl);
  $('#hHp').style.width = clamp(P.hp / P.maxHp, 0, 1) * 100 + '%'; setTxt('#hHpT', `${Math.ceil(P.hp)} / ${P.maxHp}`);
  $('#hXp').style.width = clamp(s.xp / xpNeed(s.lvl), 0, 1) * 100 + '%';
  setTxt('#hGold', s.gold); setTxt('#hPot', s.potions + '/' + st.maxPot); setTxt('#hFrag', s.frags.length + '/9');
  const dc = clamp(P.dashCd / st.dashCd, 0, 1), sc = clamp(P.skillCd / st.skillCd, 0, 1), ac = clamp(P.atkCd / st.atkCd, 0, 1);
  $('#abDash').style.setProperty('--cd', dc); $('#abSkill').style.setProperty('--cd', sc); $('#abAtk').style.setProperty('--cd', ac);
  $('#tDash').style.setProperty('--cd', dc); $('#tSkill').style.setProperty('--cd', sc);
  { const u = Math.min(1, G.ult || 0), us = u.toFixed(2); if (hudCache.ult !== us) { hudCache.ult = us; for (const id of ['#abUlt', '#tUlt']) { $(id).style.setProperty('--ult', us); $(id).classList.toggle('ready', u >= 1); } } }
  const sk = P.skillCd > 0 ? Math.ceil(P.skillCd) : ''; setTxt('#abSkillT', sk); setTxt('#tSkillT', sk);
  setTxt('#abPotN', s.potions); setTxt('#tPotN', s.potions);
  if (hudCache.pe !== (s.potions <= 0)) { hudCache.pe = s.potions <= 0; $('#abPot').classList.toggle('empty', hudCache.pe); $('#tPot').classList.toggle('empty', hudCache.pe); }
  if (hudCache.cls !== G.char.cls) {
    hudCache.cls = G.char.cls;
    for (const id of ['#abAtk img', '#tAtk img']) $(id).src = icon(CLSICON[G.char.cls]);
    for (const id of ['#abSkill img', '#tSkill img']) $(id).src = icon(SKILLICON[G.char.cls]);
    for (const id of ['#abUlt img', '#tUlt img']) $(id).src = icon('ult');
    $('#abUlt').dataset.tip = ULT_NAME[G.char.cls] + '\nR · carrega com o dano que você causa';
    $('#abSkillL').textContent = SKILLNAME[G.char.cls];
  }
  { const R2 = RUNES[G.char.cls][curRune()], tip = (R2 ? R2.n + '\n' + R2.d : 'Habilidade') + '\nBotão direito do mouse (ou K)'; if (hudCache.tip !== tip) { hudCache.tip = tip; $('#abSkill').dataset.tip = tip; } }   // dica com a runa ativa
  if (!G.touch && (G.keysT = (G.keysT ?? 60) - 1 / 60) <= 0 && G.keysT > -1) { $('#keys').classList.add('faded'); G.keysT = -2; }   // a linha de controles some depois de um tempo (H mostra de novo)
  { const f = $('#feed'); if (f && f.children.length && (G.time - (hudCache.feedT || 0) > .2 || G.time < (hudCache.feedT || 0))) { hudCache.feedT = G.time; feedPos(); } }   // o minimapa pode aparecer/sumir depois do aviso
  tipsTick();   // primeiros passos
  const trk = trackerHTML(); if (hudCache.trk !== trk) { hudCache.trk = trk; $('#hTrk').innerHTML = trk; }
  const S = G.streak, se = $('#streak');
  if (S.n >= 3) { se.hidden = false; setTxt('#stN', 'x' + S.n); setTxt('#stL', S.n >= 50 ? 'CARNIFICINA' : S.n >= 25 ? 'MASSACRE' : S.n >= 10 ? 'MATANÇA' : 'SEQUÊNCIA'); $('#stBar').style.width = clamp(S.t / 3.2, 0, 1) * 100 + '%'; } else se.hidden = true;
  const bh = Object.entries(G.buffs).filter(([, v]) => v > 0).map(([k, v]) => `<span style="border-color:${BUFFS[k].c};color:${BUFFS[k].c}">${BUFFS[k].n} ${Math.ceil(v)}s</span>`).join('');
  if (hudCache.bf !== bh) { hudCache.bf = bh; $('#buffs').innerHTML = bh; }
  const rb = $('#riftBar');
  { const bt = G.rift ? (innerWidth <= 760 ? 'calc(env(safe-area-inset-top,0px) + 222px)' : 'calc(env(safe-area-inset-top,0px) + 116px)') : ''; if (hudCache.bt !== bt) { hudCache.bt = bt; $('#bossBar').style.top = bt; } }
  if (G.rift) { rb.hidden = false; const R = G.rift, mm = Math.floor(R.t / 60), ss = Math.floor(R.t % 60); setTxt('#rbName', `FENDA ${R.L} · ${Math.floor(R.prog)}%`); setTxt('#rbTime', `${mm}:${String(ss).padStart(2, '0')}`); setTxt('#rbAff', R.aff.map(a => RAFF[a].n).join(' · ')); $('#rbFill').style.width = R.prog + '%'; } else rb.hidden = true;
}
function refreshHudVis() {
  document.body.classList.toggle('tch', !!G.touch);
  document.body.classList.toggle('playing', G.mode === 'play');
  const play = (['play', 'dialog'].includes(G.mode) || (G.mode === 'menu' && $('#ending').hidden && P)) && G.menu !== 'inv';
  $('#hud').hidden = !play;
  if (!play) { $('#mmap').hidden = true; $('#mmapZ').hidden = true; } else if (RG && RG.key !== 'hub' && RG.key !== 'home' && !isIndoor(RG.key)) { $('#mmap').hidden = false; $('#mmapZ').hidden = false; }
  $('#touch').hidden = !(play && G.touch && G.mode === 'play');
  $('#keys').hidden = G.touch; $('#abar').hidden = G.touch;
  { const pv = G.mode === 'create' || (G.mode === 'menu' && G.menu === 'inv'); $('#poseBar').hidden = !pv; if (!pv) { G.pvPose = null; G.pvZoom = 1; document.querySelectorAll('#poseBar button').forEach(x => x.classList.remove('on')); } }
}
function showOnly(id) { for (const s of ['#bank', '#profile', '#title', '#create', '#story', '#forge', '#journal', '#pause', '#ending', '#inv', '#shop', '#skills', '#board', '#riftm', '#home', '#stash', '#mail', '#wshop', '#wmap', '#fishery', '#market', '#trade', '#season']) $(s).hidden = s !== id; }
function openMenu(which) {
  (G.menuSeen = G.menuSeen || {})[which] = 1;   // primeiros passos: já abriu a Bolsa, o Grimório…
  if (G.mode !== 'play' && !(G.mode === 'dialog' && (which === 'forge' || which === 'shop' || which === 'fishery'))) return;
  $('#dialog').hidden = true; DLG.q = []; DLG.cur = null;
  G.mode = 'menu'; input.atk = false; sfx('ui');
  G.menu = which; $('#prompt').hidden = true; $('#tUse').hidden = true;
  if (which === 'skills') renderSkills(); if (which === 'board') renderBoard(); if (which === 'riftm') renderRiftMenu();
  if (which === 'inv') { invSel = null; renderInv(); } if (which === 'shop') { invSel = null; G.sellAllArm = false; renderShop(); }
  if (which === 'home') renderHome(); if (which === 'stash') { stSel = null; renderStash(); } if (which === 'mail') { mlSel = null; G.mailCode = null; resetMailOnline(); renderMail(); }
  if (which === 'profile') renderProfile(); if (which === 'bank') renderBank();
  if (which === 'wshop') renderWShop(); if (which === 'wmap') renderWMap(); if (which === 'fishery') renderFishery(); if (which === 'market') renderMarket(); if (which === 'trade') renderTrade(); if (which === 'season') renderSeason();
  if (which === 'forge') renderForge(); if (which === 'journal') renderJournal(); if (which === 'pause') renderPause();
  showOnly('#' + which); refreshHudVis();
}
function closeMenus() { if (G.cosPreview) cosPreviewEnd(); showOnly(null); G.mode = 'play'; G.menu = null; refreshHudVis(); updateObjective(); }
$('#bJournal').onclick = () => openMenu('journal'); $('#hPass').onclick = () => openSeason(); $('#sePrevBack').onclick = () => { cosPreviewEnd(); sfx('ui'); }; $('#seClose').onclick = () => closeMenus(); $('#bBag').onclick = () => openMenu('inv');
$('#abBag').onclick = () => openMenu('inv'); $('#abDash').onclick = () => doDash(); $('#abSkill').onclick = () => doSkill(); $('#abUlt').onclick = () => doUlt(); $('#abPot').onclick = () => drinkPotion();
$('#iClose').onclick = closeMenus; $('#sClose').onclick = closeMenus; $('#kClose').onclick = closeMenus; $('#bdClose').onclick = closeMenus; $('#rClose').onclick = closeMenus;
$('#bSkills').onclick = () => openMenu('skills');
let invSel = null;
function slotBtn(it, fn, sel) {
  const b = document.createElement('button'); b.className = 'slot'; b.style.setProperty('--rc', RAR[it.rar].c);
  const im = document.createElement('img'); im.src = icon(itemIcon(it)); im.alt = ''; b.appendChild(im);
  b.title = it.name; b.setAttribute('aria-label', it.name); if (sel) b.setAttribute('aria-pressed', 'true'); b.onclick = () => { sfx('ui'); fn(); }; return b;
}
function itemLinesHTML(it, cmp) {
  const keys = new Set([...Object.keys(it.st), ...(cmp ? Object.keys(cmp.st) : [])]), out = [];
  for (const k of keys) {
    const v = it.st[k] || 0, c = cmp ? (cmp.st[k] || 0) : null;
    let delta = ''; if (cmp && v !== c) delta = ` <span class="${v > c ? 'up-g' : 'dn-r'}">(${v > c ? '+' : ''}${v - c})</span>`;
    out.push(v ? `<li>${STAT_FMT[k](v)}${delta}</li>` : `<li class="dn-r">sem ${STAT_LBL[k]}${delta}</li>`);
  }
  return out.join('');
}
function renderDetail(box, sel, ctx, after) {
  if (!sel) { box.innerHTML = '<p class="sub">Toque num item para ver os detalhes e comparar com o que você usa.</p>'; return; }
  const it = sel.it, s = G.save, cur = s.eq[it.slot], isEq = sel.eq !== undefined;
  const sc = itemScore(it), cs = cur && !isEq ? itemScore(cur) : null;
  box.innerHTML = `<h3 style="color:${RAR[it.rar].c}">${it.name}</h3>${it.power ? `<div class="legp">✦ ${POWERS[it.power]}</div>` : ''}<div class="meta">${SLOTN[it.slot]} · ${RAR[it.rar].n} · <span style="color:${s.lvl < TI.reqLvl(it) ? '#ff6a5a' : 'inherit'}">Nv ${TI.reqLvl(it)}</span> · Poder ${sc}${cs !== null ? ` <span class="${sc >= cs ? 'up-g' : 'dn-r'}">(${sc >= cs ? '+' : ''}${sc - cs})</span>` : ''}</div><ul>${itemLinesHTML(it, isEq ? null : cur)}</ul>` + (cur && !isEq ? `<div class="meta">Comparando com: <span style="color:${RAR[cur.rar].c}">${cur.name}</span></div>` : (!cur && !isEq ? '<div class="meta">Você não tem nada neste espaço.</div>' : ''));
  const row = document.createElement('div'); row.className = 'irow';
  const btn = (label, cls, fn, dis) => { const b = document.createElement('button'); b.className = 'px ' + cls; b.textContent = label; b.disabled = !!dis; b.onclick = () => { fn(); after(); }; row.appendChild(b); };
  if (ctx === 'inv') {
    if (isEq) btn('Guardar na bolsa', '', () => { if (s.inv.length >= BAG()) { toast('Bolsa cheia.'); return; } s.inv.push(it); s.eq[it.slot] = null; invSel = null; afterEquip(); }, s.inv.length >= BAG());
    else { const rq = TI.reqLvl(it); if (s.lvl < rq) btn('Requer nível ' + rq, '', () => { }, true); else btn('Equipar', 'gold', () => { const prev = s.eq[it.slot]; s.eq[it.slot] = it; s.inv.splice(s.inv.indexOf(it), 1); if (prev) s.inv.push(prev); invSel = { it, eq: it.slot }; afterEquip(); }); btn(`Desmontar (+${scrapVal(it)} Centelhas)`, '', () => { s.gold += scrapVal(it); s.inv.splice(s.inv.indexOf(it), 1); invSel = null; sfx('pick'); writeSave(); }); }
  } else if (ctx === 'buy') {
    const pr = itemPrice(it); btn(`Comprar (${pr} Centelhas)`, 'gold', () => { spend(pr); s.shop.items.splice(s.shop.items.indexOf(it), 1); invSel = null; if (!takeItem(it)) s.inv.push(it); writeSave(); }, s.gold < pr || s.inv.length >= BAG());
  } else if (ctx === 'sell') {
    btn(`Vender (+${scrapVal(it)} Centelhas)`, 'gold', () => { s.gold += scrapVal(it); s.inv.splice(s.inv.indexOf(it), 1); invSel = null; sfx('pick'); writeSave(); });
  }
  box.appendChild(row);
}
function renderInv() {
  const s = G.save, st = stats(), eqBox = $('#iEq'); eqBox.innerHTML = '';
  for (const k of ['weapon', 'armor', 'charm']) {
    const it = s.eq[k], d = document.createElement('div'); d.className = 'eqs';
    if (it) d.appendChild(slotBtn(it, () => { invSel = { it, eq: k }; renderInv(); }, invSel && invSel.it === it));
    else { const e = document.createElement('div'); e.className = 'slot empty'; const im = document.createElement('img'); im.src = icon(k === 'weapon' ? CLSICON[G.char.cls] : k); im.alt = ''; im.style.opacity = '.3'; e.appendChild(im); d.appendChild(e); }
    const tx = document.createElement('div'); tx.innerHTML = `<b>${SLOTN[k].toUpperCase()}</b>` + (it ? `<span style="color:${RAR[it.rar].c}">${it.name}</span>` : '<span style="color:var(--dim)">Vazio</span>'); d.appendChild(tx);
    eqBox.appendChild(d);
  }
  $('#iStats').innerHTML = [['Vida', P.maxHp], ['Dano', Math.round(st.dmg)], ['Crítico', Math.round(st.crit * 100) + '%'], ['Defesa', Math.round(st.dr * 100) + '%'], ['Vampirismo', Math.round(st.ls * 100) + '%'], ['Recarga', st.skillCd.toFixed(1) + 's']].map(([a, b]) => `<div>${a}<b>${b}</b></div>`).join('');
  const bag = $('#iBag'); bag.innerHTML = '';
  s.inv.forEach(it => { const b = slotBtn(it, () => { invSel = { it }; renderInv(); }, invSel && invSel.it === it); b.title = 'Toque duas vezes para equipar';
    b.ondblclick = () => { if (s.lvl < TI.reqLvl(it)) { toast('Requer nível ' + TI.reqLvl(it)); return; } const prev = s.eq[it.slot]; s.eq[it.slot] = it; s.inv.splice(s.inv.indexOf(it), 1); if (prev) s.inv.push(prev); invSel = { it, eq: it.slot }; afterEquip(); renderInv(); };   // atalho: equipar sem procurar o botão
    bag.appendChild(b); });
  for (let i = s.inv.length; i < BAG(); i++) { const e = document.createElement('div'); e.className = 'slot empty'; bag.appendChild(e); }
  $('#iCount').textContent = `${s.inv.length}/${BAG()}`;
  renderDetail($('#iDet'), invSel, 'inv', renderInv);
}
function ensureShop() {
  const s = G.save, nb = ['forest', 'crypt', 'peaks', 'swamp', 'glass'].filter(k => s.bosses[k]).length, stamp = nb * 10 + (s.diff || 0);
  if (!s.shop || s.shop.stamp !== stamp) { const tier = Math.min(5, nb + 1) + curDiff().tier * .6; s.shop = { stamp, items: [makeItem('weapon', tier, rollRar(1)), makeItem('armor', tier, rollRar(1)), makeItem('charm', tier, rollRar(1)), makeItem(pick(['weapon', 'armor', 'charm']), tier, Math.max(2, rollRar(2)))] }; writeSave(); }
}
/* ---- Ermos: mercador suspeito (estoque e preços mudam a cada hora, iguais para todos) e mapa de viagem ---- */
let wsZone = 0, wsSel = null;
let wsId = 0;
function openWShop(id) { wsId = id; wsZone = Math.floor(id / 10); wsSel = null; openMenu('wshop'); }
function wsStock(zone) {
  const hour = Math.floor(villageTime() / 3600), key = wsId + ':' + hour;
  if (G.wsCache && G.wsCache.key === key) return G.wsCache;
  const tb = Math.max(1, Math.round(wildTierBase(zone))), items = withSeed(9001 + wsId * 97 + hour * 7919, () => {
    const out = [];
    for (let i = 0; i < 5; i++) {
      const r = Math.random(), tier = Math.min(5, tb + (Math.random() < .3 ? 1 : 0)), rar = Math.min(TI.rarCap(tier), r < .4 ? 1 : r < .78 ? 2 : r < .96 ? 3 : 4), slot = ['weapon', 'armor', 'charm'][Math.floor(Math.random() * 3)];
      const it = makeItem(slot, tier, rar), mood = .55 + Math.random() * 1.15;
      out.push({ it, price: Math.round([0, 90, 220, 520, 1500][rar] * (1 + it.tier * .6) * mood), mood });
    }
    return out;
  });
  return (G.wsCache = { key, hour, items, potPrice: 30 + zone * 12 });
}
function renderWShop() {
  const s = G.save, st = stats(), S2 = wsStock(wsZone), bought = (s.wbuy = s.wbuy || {})[S2.key] || [];
  const left = 3600 - (villageTime() % 3600), mm = Math.floor(left / 60);
  $('#wsSub').innerHTML = `"Psst. Coisa boa, preço justo… quase sempre." Você tem <b style="color:var(--gold)">${s.gold}</b> Centelhas. Estoque novo em <b>${mm} min</b>.`;
  const list = $('#wsList'); list.innerHTML = '';
  const pr = document.createElement('div'); pr.className = 'shoprow';
  pr.innerHTML = `<div class="slot" style="--rc:#d9433a"><img src="${icon('potion')}" alt=""></div><div class="nm">Poção de procedência duvidosa<small>Enche uma poção · você tem ${s.potions}/${st.maxPot}</small></div>`;
  const pb = document.createElement('button'); pb.className = 'px gold'; pb.textContent = S2.potPrice + ' Centelhas'; pb.disabled = s.gold < S2.potPrice || s.potions >= st.maxPot;
  pb.onclick = () => { spend(S2.potPrice); s.potions++; sfx('pick'); writeSave(); renderWShop(); }; pr.appendChild(pb); list.appendChild(pr);
  if (!hasMap()) { const mr = document.createElement('div'); mr.className = 'shoprow'; mr.innerHTML = `<div class="slot" style="--rc:#f2b84b"><img src="${icon('book')}" alt=""></div><div class="nm">Mapa "achado" por aí<small>Funciona igual ao do Otto. Só é mais caro. E meio amassado.</small></div>`;
    const mb = document.createElement('button'); mb.className = 'px gold'; mb.textContent = MAP_PRICE.merc + ' Centelhas'; mb.disabled = s.gold < MAP_PRICE.merc; mb.onclick = () => buyMap(MAP_PRICE.merc, renderWShop); mr.appendChild(mb); list.appendChild(mr); }
  S2.items.forEach((o, i) => {
    const row = document.createElement('div'), sold = bought.includes(i); row.className = 'shoprow';
    row.appendChild(slotBtn(o.it, () => { wsSel = i; renderWShop(); }, wsSel === i));
    const nm = document.createElement('div'); nm.className = 'nm'; nm.innerHTML = `<span style="color:${RAR[o.it.rar].c}">${o.it.name}</span><small>${o.mood < .8 ? 'uma pechincha, ele jura' : o.mood > 1.35 ? 'caro, mas ele "não negocia"' : 'preço de mercado… do mercado dele'}</small>`; row.appendChild(nm);
    const b = document.createElement('button'); b.className = 'px' + (!sold && s.gold >= o.price ? ' gold' : ''); b.textContent = sold ? 'Vendido' : o.price + ' ✦'; b.disabled = sold || s.gold < o.price || s.inv.length >= BAG();
    b.onclick = () => { spend(o.price); const it = JSON.parse(JSON.stringify(o.it)); it.id = it.id + '-' + Date.now().toString(36); takeItem(it); (s.wbuy[S2.key] = s.wbuy[S2.key] || []).push(i); const ks = Object.keys(s.wbuy); if (ks.length > 12) delete s.wbuy[ks[0]]; sfx('lvl'); writeSave(); renderWShop(); };
    row.appendChild(b); list.appendChild(row);
  });
  const det = $('#wsDet'); if (wsSel === null) det.innerHTML = '<p class="sub">Toque num item para ver os detalhes e comparar com o que você usa.</p>';
  else { const it = S2.items[wsSel].it; det.innerHTML = `<h3 style="color:${RAR[it.rar].c}">${it.name}</h3><div class="meta">${SLOTN[it.slot]} · ${RAR[it.rar].n} · Poder ${itemScore(it)}</div><ul>${itemLinesHTML(it, s.eq[it.slot])}</ul>`; }
}
$('#wsClose').onclick = () => closeMenus();
/* ---- Pesqueiro: mercado de peixes (preço que cai quando muitos vendem o mesmo peixe), iscas, varas e coleção ---- */
let fsTab = 'mercado', fsPrices = null, fsBusy = false, fsTour = null, fsTourT = 0;
function openFishery(tab) { if (tab) fsTab = tab; if (G.menu === 'fishery') return renderFishery(); fsPrices = null; openMenu('fishery'); const n = NETON(); if (n) n.fishMarket().then(p => { fsPrices = p; if (G.menu === 'fishery') renderFishery(); }); }
/** Preço agora: o do mercado compartilhado (online) ou o do mercado local deste save. */
function fishPriceNow(id) { if (fsPrices && fsPrices[id]) return fsPrices[id]; const now = Date.now(); return { p: TF.fishPrice(G.save.fmkt || {}, id, now), d: TF.fishTrendDelta(id, now) }; }
async function sellFishUI(id, n) {
  const s = G.save; if (fsBusy || !s.fish || (s.fish[id] || 0) < n || n <= 0) return;
  fsBusy = true; let total = null;
  try { const net = NETON(); const r = net ? await net.sellFish(id, n) : null; if (r) { total = r.total; fsPrices = r.prices; } } catch (e) { }
  if (total === null) { s.fmkt = s.fmkt || {}; total = TF.sellFish(s.fmkt, id, n, Date.now()); }   // offline: mercado local
  fsBusy = false;
  s.fish[id] -= n; if (!s.fish[id]) delete s.fish[id]; missionEvent('sellfish', n);
  s.gold += total; sfx('clink'); toast('+' + total + ' CENTELHAS', false, n + '× ' + TF.fishById(id).n.toUpperCase(), '#ffbf3d'); writeSave(); renderFishery();
}
function renderFishery() {
  const s = G.save, list = $('#fsList'), lv = fishLv(); list.innerHTML = '';
  document.querySelectorAll('#fishery .ftabs button').forEach(b => { b.classList.toggle('on', b.dataset.ft === fsTab); b.onclick = () => { fsTab = b.dataset.ft; sfx('ui'); renderFishery(); }; });
  const row = (html, btns) => { const r = document.createElement('div'); r.className = 'shoprow'; r.innerHTML = html; for (const b of btns || []) r.appendChild(b); list.appendChild(r); return r; };
  const btn = (txt, on, fn, gold) => { const b = document.createElement('button'); b.className = 'px' + (gold && on ? ' gold' : ''); b.textContent = txt; b.disabled = !on; b.onclick = fn; return b; };
  if (fsTab === 'mercado') {
    const have = TF.FISH.filter(f => (s.fish && s.fish[f.id]) > 0);
    $('#fsSub').innerHTML = (fsPrices ? 'Mercado de toda Tessária: ' : 'Mercado da vila (offline): ') + 'cada peixe vendido baixa o preço daquele peixe, e ele volta a subir com o tempo. A tendência muda a cada hora. Você tem <b style="color:var(--gold)">' + s.gold + '</b> Centelhas.';
    if (!have.length) row('<div class="nm">Seu cesto está vazio.<small>Pesque no lago ou nos píeres do rio e volte aqui para vender.</small></div>');
    let all = 0;
    for (const f of have) {
      const n = s.fish[f.id], pr = fishPriceNow(f.id), d = Math.round(pr.d * 100); all += pr.p * n;
      row(`<span class="fish-dot" style="--fc:${f.c}"></span><div class="nm"><span style="color:${f.c}">${f.n}</span><small>${n} no cesto · valor normal ${f.g}</small></div><div class="fprice">${pr.p} ✦<small class="${d >= 0 ? 'fup' : 'fdown'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}% na hora</small></div>`,
        [btn('Vender 1', true, () => sellFishUI(f.id, 1)), btn('Todos', n > 1, () => sellFishUI(f.id, Math.min(99, n)), true)]);
    }
    if (have.length) { const r = row(`<div class="nm">Vender o cesto inteiro<small>Cerca de ${all} Centelhas (o preço cai um pouco a cada peixe)</small></div>`); r.appendChild(btn('Vender tudo', true, async () => { for (const f of have) await sellFishUI(f.id, Math.min(99, s.fish[f.id] || 0)); }, true)); }
    row('<div class="nm" style="width:100%"><small>Preços de hoje</small>' + TF.FISH.filter(f => s.fcount && s.fcount[f.id]).map(f => { const pr = fishPriceNow(f.id); return `<span style="color:${f.c}">${f.n}</span> ${pr.p}`; }).join(' · ') + '</div>');
  } else if (fsTab === 'loja') {
    s.bait = s.bait || {}; const rodLv = s.rodLv || 0;
    $('#fsSub').innerHTML = 'Isca escolhida: <b>' + (s.baitSel && TF.baitById(s.baitSel) ? TF.baitById(s.baitSel).n : 'nenhuma') + '</b>. Cada lançamento gasta uma. Você tem <b style="color:var(--gold)">' + s.gold + '</b> Centelhas.';
    row(`<span class="fish-dot unk"></span><div class="nm">Sem isca<small>Pesca normal, sem gastar nada</small></div>`, [btn(!s.baitSel ? 'Usando' : 'Usar', !!s.baitSel, () => { s.baitSel = null; writeSave(); renderFishery(); })]);
    for (const b of TF.BAITS) {
      const lock = lv < b.lv, n = s.bait[b.id] || 0;
      row(`<span class="fish-dot" style="--fc:${b.id === 'fio' ? '#9cf6ff' : b.id === 'grilo' ? '#ff8a5a' : '#c08a5a'}"></span><div class="nm">${b.n} <small>${b.desc} · você tem ${n}${lock ? ' · Pescador nível ' + b.lv : ''}</small></div>`,
        [btn(s.baitSel === b.id ? 'Usando' : 'Usar', !lock && n > 0 && s.baitSel !== b.id, () => { s.baitSel = b.id; writeSave(); renderFishery(); }),
         btn(b.pack + ' por ' + b.price + ' ✦', !lock && s.gold >= b.price, () => { spend(b.price); s.bait[b.id] = n + b.pack; if (!s.baitSel) s.baitSel = b.id; sfx('pick'); writeSave(); renderFishery(); }, true)]);
    }
    const cur = TF.RODS[rodLv], nx = TF.RODS[rodLv + 1];
    row(`<span class="fish-dot" style="--fc:#a0703a"></span><div class="nm">${cur.n}<small>Sua vara atual${rodLv ? ' · +' + cur.win.toFixed(1) + ' s para puxar' : ''}${TF.FISH.some(f => f.rod > rodLv) ? ' · peixe mais pesado arrebenta a linha' : ' · aguenta qualquer peixe'}</small></div>`);
    if (nx) row(`<span class="fish-dot" style="--fc:#ffbf3d"></span><div class="nm">${nx.n}<small>Aguenta peixes mais pesados (${TF.FISH.filter(f => f.rod === rodLv + 1).map(f => f.n).join(', ') || 'os maiores'}) · +${nx.win.toFixed(1)} s para puxar</small></div>`,
      [btn(nx.price + ' ✦', s.gold >= nx.price, () => { spend(nx.price); s.rodLv = rodLv + 1; toast(nx.n.toUpperCase(), true, 'PEIXES MAIS PESADOS NÃO ARREBENTAM A LINHA', '#ffbf3d'); sfx('legend'); writeSave(); renderFishery(); }, true)]);
  } else if (fsTab === 'torneio') {
    const n = NETON();
    if (!n) { $('#fsSub').innerHTML = 'O torneio semanal é online: entre com sua conta para disputar com todos os Tecelões. Cada pesca vale pontos pelo peso (comparado aos da mesma espécie) e pela raridade.'; return; }
    if (!fsTour || Date.now() - fsTourT > 15000) { fsTourT = Date.now(); n.fishTourney().then(t => { fsTour = t; if (G.menu === 'fishery' && fsTab === 'torneio') renderFishery(); }); if (!fsTour) { $('#fsSub').textContent = 'Carregando o ranking…'; return; } }
    const T0 = fsTour, left = Math.max(0, T0.endsAt - Date.now()), dd = Math.floor(left / 864e5), hh = Math.floor(left / 36e5) % 24, kgs = x => x.toFixed(2).replace('.', ',');
    $('#fsSub').innerHTML = `<b style="color:var(--gold)">Torneio de Pesca da semana</b> · termina em ${dd}d ${hh}h. Cada pesca soma pontos (peso e raridade). Os 10 primeiros ganham Centelhas na semana seguinte.` + (T0.me ? `<br>Você: <b>${T0.me.rank}º</b> com <b>${T0.me.points}</b> pontos · melhor: ${TF.fishById(T0.me.bestFish).n} de ${kgs(T0.me.bestKg)} kg` : '<br>Você ainda não pescou nesta semana.');
    const L = T0.last && T0.last.me;
    if (L && L.prize && !L.claimed) { const r = row(`<div class="nm">Prêmio da semana passada<small>Você ficou em ${L.rank}º lugar</small></div>`); r.appendChild(btn('Resgatar ' + L.prize + ' ✦', true, async () => { const c = await n.fishClaim(); if (c) { s.gold += c.gold; sfx('legend'); toast('PRÊMIO DO TORNEIO', true, '+' + c.gold + ' CENTELHAS · ' + c.rank + 'º LUGAR', '#ffbf3d'); writeSave(); } fsTour = null; renderFishery(); }, true)); }
    if (!T0.top.length) row('<div class="nm">Ninguém pescou ainda nesta semana.<small>Seja o primeiro!</small></div>');
    T0.top.forEach((x, i) => row(`<div class="nm"><b style="color:${i === 0 ? 'var(--gold)' : i < 3 ? '#d8d2c4' : 'inherit'}">${i + 1}º ${x.name}</b><small>melhor: ${(TF.fishById(x.bestFish) || { n: x.bestFish }).n} de ${kgs(x.bestKg)} kg</small></div><div class="fprice">${x.points}<small>pontos</small></div>`));
    if (T0.last && T0.last.top.length) row('<div class="nm" style="width:100%"><small>Campeões da semana passada</small>' + T0.last.top.map((x, i) => (i + 1) + 'º ' + x.name + ' (' + x.points + ')').join(' · ') + '</div>');
  } else {
    const fxp = s.fxp || 0, a = TF.fisherXpFor(lv), b = TF.fisherXpFor(lv + 1), pct = lv >= TF.FISHER_MAX ? 100 : Math.round((fxp - a) / (b - a) * 100);
    const got = TF.FISH.filter(f => s.fcount && s.fcount[f.id]).length;
    $('#fsSub').innerHTML = `<b style="color:#9cf6ff">Pescador nível ${lv}</b> · ${Math.floor(fxp)} XP${lv < TF.FISHER_MAX ? ' (próximo em ' + b + ')' : ''}<div class="fbar"><i style="width:${pct}%"></i></div>Cada nível: mais peixe raro e mais tempo para puxar. Peixe novo na coleção dá XP em dobro. Coleção: <b>${got}/${TF.FISH.length}</b>.`;
    const grid = document.createElement('div'); grid.className = 'fgrid'; list.appendChild(grid);
    const WN = { lago: 'lago', rio: 'rio', remanso: 'remanso' };
    for (const f of TF.FISH) {
      const c = s.fcount && s.fcount[f.id], r = document.createElement('div'); r.className = 'shoprow';
      r.innerHTML = c ? `<span class="fish-dot" style="--fc:${f.c}"></span><div class="nm"><span style="color:${f.c}">${f.n}</span><small>${c} pescados${s.frec && s.frec[f.id] ? ' · recorde ' + s.frec[f.id].toFixed(2).replace('.', ',') + ' kg' : ''} · ${f.at.map(w => WN[w]).join(', ')}${f.w > 1 ? ' · briga ' + f.w + '×' : ''}${f.night ? ' · mais à noite' : ''}</small></div>`
        : `<span class="fish-dot unk"></span><div class="nm">???<small>${f.at.map(w => WN[w]).join(', ')}${f.lv > 1 ? ' · Pescador ' + f.lv : ''}${f.night ? ' · de noite' : ''}${f.rod ? ' · ' + TF.RODS[f.rod].n : ''}${f.id === 'rei' ? ' · só com Isca de Fio' : ''}</small></div>`;
      grid.appendChild(r);
    }
  }
}
$('#fsClose').onclick = () => closeMenus();
/* ---- Mercado da Vila (online): anunciar itens, comprar dos outros, receber as vendas (5% de taxa) ---- */
let mkTab = 'comprar', mkData = null, mkSel = null, mkBusy = false, mkHist = null;
for (const id of ['#mkQ', '#mkSlot', '#mkRar', '#mkSort', '#mkUse']) $(id).addEventListener(id === '#mkQ' ? 'input' : 'change', () => { if (G.menu === 'market') renderMarket(); });
function openMarket() { mkHist = null; const n = NETON(); if (!n) { toast('O Mercado da Vila é online', false, 'ENTRE COM SUA CONTA PARA COMPRAR E VENDER COM OUTROS TECELÕES'); return; } mkData = null; mkSel = null; openMenu('market'); n.market().then(d => { mkData = d; if (G.menu === 'market') renderMarket(); }); }
async function marketOp(fn, after) { if (mkBusy) return; mkBusy = true; mkHist = null; const r = await fn(); mkBusy = false; if (!r.ok) { toast('Não deu certo', false, r.error.toUpperCase()); sfx('ui'); } else { after(r.data); writeSave(); sfx('pick'); } const n = NETON(); if (n) mkData = await n.market(); renderMarket(); }
function renderMarket() {
  const s = G.save, n = NETON(), list = $('#mkList'), det = $('#mkDet'); list.innerHTML = ''; det.innerHTML = '';
  document.querySelectorAll('#market .ftabs button').forEach(b => { b.classList.toggle('on', b.dataset.mt === mkTab); b.onclick = () => { mkTab = b.dataset.mt; mkSel = null; sfx('ui'); renderMarket(); }; });
  $('#mkFilt').hidden = mkTab !== 'comprar';
  if (!mkData) { $('#mkSub').textContent = 'Carregando o mercado…'; return; }
  const row = (it, html, btns) => { const r = document.createElement('div'); r.className = 'shoprow'; if (it) r.appendChild(slotBtn(it, () => { det.innerHTML = `<h3 style="color:${RAR[it.rar].c}">${it.name}</h3><div class="meta">${SLOTN[it.slot]} · ${RAR[it.rar].n} · Poder ${itemScore(it)}</div><ul>${itemLinesHTML(it, s.eq[it.slot])}</ul>`; }, false)); const nm = document.createElement('div'); nm.className = 'nm'; nm.innerHTML = html; r.appendChild(nm); for (const b of btns || []) r.appendChild(b); list.appendChild(r); return r; };
  const btn = (txt, on, fn, gold) => { const b = document.createElement('button'); b.className = 'px' + (gold && on ? ' gold' : ''); b.textContent = txt; b.disabled = !on; b.onclick = fn; return b; };
  if (mkTab === 'comprar') {
    const mine = n.account.name, q = $('#mkQ').value.trim().toLowerCase(), slot = $('#mkSlot').value, rar = +$('#mkRar').value || 0, sort = $('#mkSort').value, use = $('#mkUse').checked;
    let act = mkData.active.filter(l => l.sellerName !== mine && (!q || l.item.name.toLowerCase().includes(q)) && (!slot || l.item.slot === slot) && l.item.rar >= rar && (!use || ((l.item.slot !== 'weapon' || l.item.cls === G.char.cls) && TI.reqLvl(l.item) <= s.lvl)));
    act = act.slice().sort(sort === 'cheap' ? (a, b) => a.price - b.price : sort === 'rich' ? (a, b) => b.price - a.price : sort === 'power' ? (a, b) => itemScore(b.item) - itemScore(a.item) : () => 0);
    $('#mkSub').innerHTML = `Itens à venda por outros Tecelões. Você tem <b style="color:var(--gold)">${s.gold}</b> Centelhas e ${BAG() - s.inv.length} espaços na bolsa.`;
    if (!act.length) row(null, mkData.active.length ? 'Nada com esses filtros.<small>Mude a busca ou os filtros.</small>' : 'Nada à venda agora.<small>Volte mais tarde, ou anuncie você mesmo na aba Vender.</small>');
    for (const l of act) row(l.item, `<span style="color:${RAR[l.item.rar].c}">${l.item.name}</span><small>de ${l.sellerName} · Poder ${itemScore(l.item)} · nível ${TI.reqLvl(l.item)}</small>`, [btn(l.price + ' ✦', s.gold >= l.price && s.inv.length < BAG(), () => marketOp(() => n.marketBuy(l.id), d => { s.gold -= d.price; s.spent = (s.spent || 0) + d.price; s.inv.push(d.item); toast('COMPRADO', true, d.item.name.toUpperCase() + ' · −' + d.price + ' CENTELHAS', RAR[d.item.rar].c); }), true)]);
  } else if (mkTab === 'vender') {
    $('#mkSub').innerHTML = `Escolha um item da bolsa e o preço. Ele sai da bolsa e fica no mercado até alguém comprar (ou você cancelar). Taxa da vila: ${Math.round(mkData.tax * 100)}% na hora de receber. Até ${mkData.max} anúncios.`;
    if (!s.inv.length) row(null, 'Sua bolsa está vazia.');
    for (const it of s.inv) {
      const r = row(it, `<span style="color:${RAR[it.rar].c}">${it.name}</span><small>Poder ${itemScore(it)} · o Otto pagaria ${scrapVal(it)}</small>`);
      const inp = document.createElement('input'); inp.type = 'number'; inp.min = '1'; inp.step = '10'; inp.value = String(Math.max(10, scrapVal(it) * 3)); inp.style.width = '86px'; inp.setAttribute('aria-label', 'Preço');
      r.appendChild(inp); r.appendChild(btn('Anunciar', true, () => { const price = Math.max(1, Math.min(1e7, Math.floor(+inp.value || 0))); marketOp(() => n.marketList(it.id, price), () => { const i = s.inv.findIndex(x => x.id === it.id); if (i >= 0) s.inv.splice(i, 1); toast('ANUNCIADO', false, it.name.toUpperCase() + ' · ' + price + ' CENTELHAS'); }); }, true));
    }
  } else if (mkTab === 'hist') {
    $('#mkSub').textContent = 'Suas últimas trocas diretas e o que você comprou e vendeu no mercado.';
    if (!mkHist) { row(null, 'Carregando…'); n.history().then(h => { mkHist = h || []; if (G.menu === 'market' && mkTab === 'hist') renderMarket(); }); return; }
    if (!mkHist.length) row(null, 'Nada ainda.<small>Troque com alguém (toque no nome dele) ou compre e venda aqui no mercado.</small>');
    const when = d => { const m = Math.round((Date.now() - new Date(d).getTime()) / 60000); return m < 60 ? 'há ' + m + ' min' : m < 1440 ? 'há ' + Math.round(m / 60) + ' h' : 'há ' + Math.round(m / 1440) + ' d'; };
    for (const e of mkHist) { const r = row(null, `<b>${e.kind === 'troca' ? 'Troca com ' + e.with : e.kind === 'venda' ? 'Vendeu para ' + e.with : 'Comprou de ' + e.with}</b><small>${e.gave.length ? 'deu: ' + e.gave.join(', ') : ''}${e.gave.length && e.got.length ? ' · ' : ''}${e.got.length ? 'recebeu: ' + e.got.join(', ') : ''}${e.gold ? ` · <span class="${e.gold > 0 ? 'gp' : 'gn'}">${e.gold > 0 ? '+' : ''}${e.gold} ✦</span>` : ''} · ${when(e.at)}</small>`); r.classList.add('hist'); }
  } else {
    const due = mkData.mine.filter(l => l.sold && !l.paid), total = due.reduce((a, l) => a + Math.floor(l.price * (1 - mkData.tax)), 0);
    $('#mkSub').innerHTML = due.length ? `Você vendeu ${due.length} ${due.length > 1 ? 'itens' : 'item'}: <b style="color:var(--gold)">${total}</b> Centelhas para receber (já sem a taxa).` : 'Seus anúncios. Os vendidos aparecem aqui para você receber as Centelhas.';
    if (due.length) { const r = row(null, 'Receber as vendas<small>Vai direto para as suas Centelhas</small>'); r.appendChild(btn('Receber ' + total + ' ✦', true, () => marketOp(() => n.marketCollect(), d => { s.gold += d.gold; toast('VENDAS RECEBIDAS', true, '+' + d.gold + ' CENTELHAS', '#ffbf3d'); }), true)); }
    if (!mkData.mine.length) row(null, 'Você não tem anúncios.');
    for (const l of mkData.mine) row(l.item, `<span style="color:${RAR[l.item.rar].c}">${l.item.name}</span><small>${l.price} ✦ · ${l.sold ? 'vendido para ' + (l.buyerName || 'alguém') : 'à venda'}</small>`, l.sold ? [] : [btn('Cancelar', s.inv.length < BAG(), () => marketOp(() => n.marketCancel(l.id), d => { s.inv.push(d.item); toast('ANÚNCIO CANCELADO', false, d.item.name.toUpperCase() + ' VOLTOU PARA A BOLSA'); }))]);
  }
}
$('#mkClose').onclick = () => closeMenus();
/* ---- Troca direta (online, na mesma sala) ---- */
let trSel = new Set(), trTimer = 0;
function tradeSend() { const n = NETON(); if (!n || !G.trade) return; clearTimeout(trTimer); trTimer = setTimeout(() => n.tradeOffer([...trSel], Math.max(0, Math.min(G.save.gold, Math.floor(+$('#trGold').value || 0)))), 250); }
function renderTrade() {
  const T0 = G.trade, s = G.save; if (!T0) return;
  $('#trTitle').textContent = 'Troca com ' + T0.with; $('#trTheirsH').textContent = 'Oferta de ' + T0.with;
  const mine = $('#trMine'); mine.innerHTML = '';
  s.inv.forEach(it => { const b = slotBtn(it, () => { trSel.has(it.id) ? trSel.delete(it.id) : trSel.size < 8 && trSel.add(it.id); sfx('ui'); renderTrade(); tradeSend(); }, trSel.has(it.id)); if (trSel.has(it.id)) b.classList.add('off'); mine.appendChild(b); });
  const th = $('#trTheirs'); th.innerHTML = ''; for (const it of T0.theirs.items) th.appendChild(slotBtn(it, () => { $('#trSub').innerHTML = `<b style="color:${RAR[it.rar].c}">${it.name}</b> · ${SLOTN[it.slot]} · Poder ${itemScore(it)}`; }, false));
  $('#trMineSt').textContent = (T0.mine.items.length ? T0.mine.items.length + ' item(ns)' : 'nenhum item') + ' · ' + T0.mine.gold + ' ✦' + (T0.mine.ready ? ' · CONFIRMADO' : '');
  $('#trTheirsSt').textContent = (T0.theirs.items.length ? T0.theirs.items.length + ' item(ns)' : 'nenhum item') + ' · ' + T0.theirs.gold + ' ✦' + (T0.theirs.ready ? ' · CONFIRMADO' : ' · ainda decidindo');
  $('#trReady').textContent = T0.mine.ready ? 'Desfazer confirmação' : 'Confirmar troca';
}
$('#trGold').oninput = () => tradeSend();
$('#trReady').onclick = () => { const n = NETON(); if (n && G.trade) { sfx('ui'); n.tradeReady(!G.trade.mine.ready); } };
$('#trCancel').onclick = () => { const n = NETON(); if (n) n.tradeCancel(); G.trade = null; closeMenus(); };
/** Mapa dos Ermos: o que você explorou, obeliscos e acampamentos. Num obelisco, toque num obelisco desperto para viajar. */
function renderWMap() {
  const travel0 = G.wmTravel !== undefined && G.wmTravel !== null, mapOk = hasMap();
  if (!RG || RG.key === 'home' || isIndoor(RG.key) || (!mapOk && !travel0)) { closeMenus(); return; }
  if (mapOk && MM.key !== RG) setupMinimap();
  $('.wmwrap').hidden = !mapOk || !MM.seen;   // sem mapa, o obelisco ainda viaja pela lista
  $('#wmTitle').textContent = RG.wild ? 'Mapa dos Ermos' : 'Mapa · ' + (RG.key === 'rift' ? 'Fenda' : REG[RG.key].name); $('.wmwrap').style.aspectRatio = RG.W + '/' + RG.H;
  const W = RG.W, H = RG.H, cv = $('#wmCv'); cv.width = W; cv.height = H; const seenArr = MM.seen || new Uint8Array(W * H);
  const cx = cv.getContext('2d'), img = cx.createImageData(W, H), d = img.data;
  for (let i = 0; i < W * H; i++) { const o = i * 4; if (seenArr[i] && MM.base) { d[o] = MM.base[o]; d[o + 1] = MM.base[o + 1]; d[o + 2] = MM.base[o + 2]; } else { d[o] = 10; d[o + 1] = 8; d[o + 2] = 18; } d[o + 3] = 255; }
  cx.putImageData(img, 0, 0);
  const travel = G.wmTravel !== undefined && G.wmTravel !== null, ob = obelList(), pins = $('#wmPins'), list = $('#wmList'); pins.innerHTML = ''; list.innerHTML = '';
  $('#wmSub').textContent = travel ? (mapOk ? 'Toque num obelisco aceso para viajar. Os apagados ainda precisam ser despertos.' : 'Sem o Mapa do Cartógrafo você não vê o mapa, mas o obelisco ainda leva aos outros obeliscos acesos.') : RG.wild ? 'O que você já explorou e a sua trilha. Obeliscos acesos permitem viagem rápida (use um obelisco).' : 'O que você já explorou e a sua trilha (pontos dourados). M abre e fecha.';
  { const tr = G.save.trail && G.save.trail[RG.key]; if (tr) for (const p of tr) { const a = 1 - trailAge(p); if (a <= 0) continue; cx.fillStyle = `rgba(242,184,75,${(.9 * a).toFixed(2)})`; cx.fillRect(Math.floor(p[0] / T), Math.floor(p[1] / T), 1, 1); } }   // trilha que vai sumindo
  const pin = (x, z, cls, label, fn) => { const b = document.createElement(fn ? 'button' : 'div'); b.className = 'wpin ' + cls; b.style.left = (x / T / W * 100) + '%'; b.style.top = (z / T / H * 100) + '%'; if (label) { const s2 = document.createElement('span'); s2.textContent = label; b.appendChild(s2); } if (fn) { b.onclick = fn; b.setAttribute('aria-label', label); } pins.appendChild(b); return b; };
  const go = (x, z, name) => { G.wmTravel = null; closeMenus(); obeliskJump(x, z, name); };
  for (const rm of RG.rooms) {
    if (rm.kind !== 'obelisk') continue;
    const id = rm.obId ?? rm.ob * 10, on = ob.includes(id), seen = seenArr[Math.floor(rm.wz / T) * W + Math.floor(rm.wx / T)];
    if (!on && !seen) continue;
    const here = travel && id === G.wmTravel, fn = travel && on && !here ? () => go(rm.wx + 1.6, rm.wz + 1.6, obName(id)) : null;
    pin(rm.wx, rm.wz, (on ? 'on' : '') + (here ? ' here' : ''), obName(id), fn);
    if (fn) { const b = document.createElement('button'); b.className = 'px gold'; b.textContent = obName(id) + ' · Nv ' + WZ[rm.ob].lv; b.onclick = fn; list.appendChild(b); }
  }
  if (travel) { const b = document.createElement('button'); b.className = 'px'; b.textContent = 'Portão da Vila Brasa'; b.onclick = () => go(RG.start.wx, RG.start.wz + 1.5, 'Portão da Vila'); list.appendChild(b); }
  if (RG.wild) pin(RG.start.wx, RG.start.wz, 'camp', 'Vila', null);
  if (!RG.wild) for (const it of inter) if ((it.kind === 'portal' || it.kind === 'riftportal') && seenArr[Math.floor(it.z / T) * W + Math.floor(it.x / T)]) pin(it.x, it.z, 'on', it.kind === 'riftportal' ? 'Fenda' : it.to === 'hub' ? 'Vila' : (REG[it.to] ? REG[it.to].name : ''), null);
  if (P) pin(P.x, P.z, 'me', 'você', null);
  requestAnimationFrame(() => wmCenterMe(RG.wild ? 3 : 1.4));   // abre perto de você
}
$('#wmClose').onclick = () => { G.wmTravel = null; closeMenus(); };
/* zoom (roda, + e −) e arrastar no mapa grande */
const WMV = { s: 1, x: 0, y: 0 };
function wmApply() {
  const wr = $('.wmwrap'), w = wr.clientWidth, h = wr.clientHeight;
  WMV.s = clamp(WMV.s, 1, 8); WMV.x = clamp(WMV.x, w * (1 - WMV.s), 0); WMV.y = clamp(WMV.y, h * (1 - WMV.s), 0);
  $('#wmInner').style.transform = `translate(${WMV.x}px,${WMV.y}px) scale(${WMV.s})`; $('#wmInner').style.setProperty('--inv', (1 / WMV.s).toFixed(3));
}
function wmZoom(f, px, py) { const wr = $('.wmwrap'); if (px === undefined) { px = wr.clientWidth / 2; py = wr.clientHeight / 2; } const s2 = clamp(WMV.s * f, 1, 8); WMV.x = px - (px - WMV.x) * s2 / WMV.s; WMV.y = py - (py - WMV.y) * s2 / WMV.s; WMV.s = s2; wmApply(); }
function wmCenterMe(s) { if (!P || !RG) return; const wr = $('.wmwrap'), w = wr.clientWidth, h = wr.clientHeight; WMV.s = s || WMV.s; WMV.x = w / 2 - P.x / T / RG.W * w * WMV.s; WMV.y = h / 2 - P.z / T / RG.H * h * WMV.s; wmApply(); }
{ const wr = $('.wmwrap'); let drag = null;
  wr.addEventListener('wheel', e => { e.preventDefault(); const r = wr.getBoundingClientRect(); wmZoom(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  wr.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; drag = { x: e.clientX, y: e.clientY, ox: WMV.x, oy: WMV.y }; wr.classList.add('drag'); wr.setPointerCapture(e.pointerId); });
  wr.addEventListener('pointermove', e => { if (!drag) return; WMV.x = drag.ox + e.clientX - drag.x; WMV.y = drag.oy + e.clientY - drag.y; wmApply(); });
  const end = () => { drag = null; wr.classList.remove('drag'); }; wr.addEventListener('pointerup', end); wr.addEventListener('pointercancel', end);
  $('#wmZin').onclick = () => wmZoom(1.35); $('#wmZout').onclick = () => wmZoom(1 / 1.35); $('#wmMe').onclick = () => wmCenterMe(Math.max(WMV.s, 2.5)); }
function buyMap(price, after) { if (G.save.gold < price) return; spend(price); G.save.map = true; writeSave(); sfx('legend'); toast('MAPA DO CARTÓGRAFO', true, 'MINIMAPA LIGADO · TECLA M ABRE O MAPA', '#ffbf3d'); MM.key = null; setupMinimap(); after(); }
function renderShop() {
  ensureShop();
  const s = G.save, st = stats(); $('#sGold').textContent = s.gold;
  const list = $('#sList'); list.innerHTML = '';
  const potRow = document.createElement('div'); potRow.className = 'shoprow';
  potRow.innerHTML = `<div class="slot" style="--rc:#d9433a"><img src="${icon('potion')}" alt=""></div><div class="nm">Poção de cura<small>Recupera 45% da vida · você tem ${s.potions}/${st.maxPot}</small></div>`;
  const pb = document.createElement('button'); pb.className = 'px gold'; pb.textContent = '20 Centelhas'; pb.disabled = s.gold < 20 || s.potions >= st.maxPot;
  pb.onclick = () => { spend(20); s.potions++; sfx('pick'); writeSave(); renderShop(); }; potRow.appendChild(pb); list.appendChild(potRow);
  { const lv = (BAG() - 20) / 5, c = BAG_UP[lv]; if (c) { const br = document.createElement('div'); br.className = 'shoprow'; br.innerHTML = `<div class="slot" style="--rc:#c08a4a"><img src="${icon('bag')}" alt=""></div><div class="nm">Bolsa maior<small>+5 espaços (hoje ${BAG()}, máximo 40)</small></div>`;
    const bb = document.createElement('button'); bb.className = 'px gold'; bb.textContent = c + ' Centelhas'; bb.disabled = s.gold < c; bb.onclick = () => { spend(c); s.bagCap = BAG() + 5; sfx('lvl'); toast('BOLSA MAIOR', true, BAG() + ' ESPAÇOS'); writeSave(); renderShop(); }; br.appendChild(bb); list.appendChild(br); } }
  if (!hasMap()) { const mr = document.createElement('div'); mr.className = 'shoprow'; mr.innerHTML = `<div class="slot" style="--rc:#f2b84b"><img src="${icon('book')}" alt=""></div><div class="nm">Mapa do Cartógrafo<small>Minimapa e mapa grande (tecla M) em todo lugar; guarda o que você explorou e a sua trilha</small></div>`;
    const mb = document.createElement('button'); mb.className = 'px gold'; mb.textContent = MAP_PRICE.otto + ' Centelhas'; mb.disabled = s.gold < MAP_PRICE.otto; mb.onclick = () => buyMap(MAP_PRICE.otto, renderShop); mr.appendChild(mb); list.appendChild(mr); }
  { const gc = gambleCost(), gr = document.createElement('div'); gr.className = 'shoprow'; gr.innerHTML = `<div class="slot" style="--rc:#c07bff"><img src="${icon('bag')}" alt=""></div><div class="nm">Embrulho misterioso<small>${gc} Centelhas · item surpresa, nunca comum · 13% épico · 2% lendário</small></div>`;
    const bx = document.createElement('div'); bx.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end';
    for (const [sl, lb] of [['weapon', 'Arma'], ['armor', 'Armadura'], ['charm', 'Amuleto']]) { const b = document.createElement('button'); b.className = 'px' + (s.gold >= gc && s.inv.length < BAG() ? ' gold' : ''); b.textContent = lb; b.disabled = s.gold < gc || s.inv.length >= BAG(); b.onclick = () => { sfx('ui'); gamble(sl); renderShop(); }; bx.appendChild(b); }
    gr.appendChild(bx); list.appendChild(gr); }
  for (const it of s.shop.items) {
    const row = document.createElement('div'); row.className = 'shoprow';
    row.appendChild(slotBtn(it, () => { invSel = { it, buy: true }; renderShop(); }, invSel && invSel.it === it));
    const nm = document.createElement('div'); nm.className = 'nm'; nm.innerHTML = `<span style="color:${RAR[it.rar].c}">${it.name}</span><small>${SLOTN[it.slot]} · ${RAR[it.rar].n} · Poder ${itemScore(it)}</small>`; row.appendChild(nm);
    const b = document.createElement('button'); b.className = 'px'; b.textContent = itemPrice(it) + ' Centelhas'; b.onclick = () => { sfx('ui'); invSel = { it, buy: true }; renderShop(); }; row.appendChild(b);
    list.appendChild(row);
  }
  if (!s.shop.items.length) { const p = document.createElement('p'); p.className = 'sub'; p.textContent = 'Estoque esgotado. Volte depois do próximo Fio.'; list.appendChild(p); }
  const bag = $('#sBag'); bag.innerHTML = '';
  s.inv.forEach(it => { const b = slotBtn(it, () => { invSel = { it, sell: true }; renderShop(); }, invSel && invSel.it === it); b.title = 'Toque duas vezes para vender'; b.ondblclick = () => { s.gold += scrapVal(it); s.inv.splice(s.inv.indexOf(it), 1); invSel = null; sfx('pick'); writeSave(); renderShop(); }; bag.appendChild(b); });   // atalho: vender
  if (!s.inv.length) bag.innerHTML = '<p class="sub" style="grid-column:1/-1">Sua bolsa está vazia.</p>';
  else {   // vender tudo de uma vez (os lendários ficam; dois toques para confirmar)
    const sellable = s.inv.filter(it => it.rar < 4), total = sellable.reduce((a, it) => a + scrapVal(it), 0), keep = s.inv.length - sellable.length;
    const b = document.createElement('button'); b.className = 'px' + (G.sellAllArm ? ' gold' : ''); b.style.gridColumn = '1/-1'; b.disabled = !sellable.length;
    b.textContent = G.sellAllArm ? `Confirmar: vender ${sellable.length} itens por ${total} Centelhas` : `Vender tudo (${sellable.length} itens · +${total} Centelhas)` + (keep ? ` · ${keep} lendário${keep > 1 ? 's' : ''} fica${keep > 1 ? 'm' : ''}` : '');
    b.onclick = () => { if (!G.sellAllArm) { G.sellAllArm = true; renderShop(); return; } G.sellAllArm = false; s.gold += total; s.inv = s.inv.filter(it => it.rar >= 4); invSel = null; sfx('pick'); toast('BOLSA VENDIDA', false, '+' + total + ' CENTELHAS'); writeSave(); renderShop(); };
    bag.prepend(b);
  }
  renderDetail($('#sDet'), invSel, invSel && invSel.buy ? 'buy' : 'sell', renderShop);
} $('#bPause').onclick = () => openMenu('pause');
$('#hmClose').onclick = closeMenus; $('#stClose').onclick = closeMenus; $('#mlClose').onclick = closeMenus;
$('#fClose').onclick = closeMenus; $('#jClose').onclick = closeMenus; $('#pResume').onclick = closeMenus;
$('#pQuit').onclick = () => { writeSave(); const n = NETON(); if (n) void n.flushNow(); showOnly(null); toTitle(); };   // online: manda o progresso à nuvem antes do título
function renderForge() {
  const s = G.save; $('#fGold').textContent = s.gold;
  const list = $('#fList'); list.innerHTML = '';
  for (const u of UPG) {
    const lv = s.up[u.k], cost = UPCOST[lv], maxed = lv >= u.max;
    const row = document.createElement('div'); row.className = 'up';
    row.innerHTML = `<b>${u.t}</b><p>${u.d}</p><div class="pips">${Array.from({ length: u.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div>`;
    const b = document.createElement('button'); b.className = 'px' + (!maxed && s.gold >= cost ? ' gold' : ''); b.textContent = maxed ? 'Máximo' : `${cost} ✦`; b.disabled = maxed || s.gold < cost;
    b.onclick = () => { if (s.gold < cost) return; spend(cost); s.up[u.k]++; sfx('lvl'); const st = stats(); const diff = st.maxHp - P.maxHp; P.maxHp = st.maxHp; P.hp += Math.max(0, diff); if (u.k === 'pot') s.potions++; writeSave(); renderForge(); };
    row.appendChild(b); list.appendChild(row);
  }
  { const h2 = document.createElement('h3'); h2.style.cssText = 'font-size:12px;color:var(--dim);margin-top:6px'; h2.textContent = 'APRIMORAR EQUIPAMENTO (+1 ATÉ +10)'; list.appendChild(h2);
    const p2 = document.createElement('p'); p2.className = 'sub'; p2.textContent = 'Cada nível deixa todos os atributos do item 8% mais fortes. Até +5 nunca falha; depois o fogo fica caprichoso. Falhar só custa as Centelhas, o item não quebra.' + (hasF('bancada') ? ' Bancada de Tecelão: -30%.' : ''); list.appendChild(p2);
    for (const k of ['weapon', 'armor', 'charm']) { const it = s.eq[k]; if (!it) continue; const u = it.up || 0, c = upCost(it), mx = u >= 10;
      const row = document.createElement('div'); row.className = 'shoprow'; row.appendChild(slotBtn(it, () => { }, false));
      const nm = document.createElement('div'); nm.className = 'nm'; nm.innerHTML = `<span style="color:${RAR[it.rar].c}">${it.name}</span><small>${mx ? 'Nível máximo. Obra-prima.' : `+${u} → +${u + 1} · chance ${Math.round(UPCH[u] * 100)}%`}</small>`; row.appendChild(nm);
      const b = document.createElement('button'); b.className = 'px' + (!mx && s.gold >= c ? ' gold' : ''); b.textContent = mx ? 'Máximo' : c + ' ✦'; b.disabled = mx || s.gold < c; b.onclick = () => { upgradeItem(it); renderForge(); }; row.appendChild(b); list.appendChild(row); } }
  const hh = document.createElement('h3'); hh.style.cssText = 'font-size:12px;color:var(--dim);margin-top:6px'; hh.textContent = 'REFORJAR EQUIPAMENTO'; list.appendChild(hh);
  const pp = document.createElement('p'); pp.className = 'sub'; pp.textContent = 'A Bruma troca um atributo extra do item por outro, sorteado no fogo.'; list.appendChild(pp);
  for (const k of ['weapon', 'armor', 'charm']) {
    const it = s.eq[k]; if (!it) continue;
    const cost = Math.round(25 * (1 + it.rar) * Math.max(1, it.tier) * (hasF('bancada') ? .7 : 1));
    const row = document.createElement('div'); row.className = 'shoprow'; row.appendChild(slotBtn(it, () => { }, false));
    const nm = document.createElement('div'); nm.className = 'nm'; nm.innerHTML = `<span style="color:${RAR[it.rar].c}">${it.name}</span><small>${Object.entries(it.st).map(([a, v]) => STAT_FMT[a](v)).join(' · ')}</small>`; row.appendChild(nm);
    const b = document.createElement('button'); b.className = 'px' + (s.gold >= cost ? ' gold' : ''); b.textContent = cost + ' ✦'; b.disabled = s.gold < cost;
    b.onclick = () => { spend(cost); reforge(it); afterEquip(); renderForge(); sfx('lvl'); }; row.appendChild(b); list.appendChild(row);
  }
}
/* Decoração da casa: peças compradas com Fios Dourados (só estilo, a posse fica no servidor) em 6 lugares fixos. */
function renderDeco(L) {
  const TS = window.TessSeason, s = G.save, n = NETON(), own = new Set(G.cosOwned || []); s.deco = s.deco || {};
  const info = document.createElement('p'); info.className = 'sub';
  info.textContent = n ? (typeof SEAS !== 'undefined' && SEAS ? `Você tem ${SEAS.me.dourados} Fios Dourados. Decoração é só estilo: não dá bônus.` : 'Carregando a sua conta…') : 'A decoração é comprada com Fios Dourados: entre com a sua conta online.';
  L.appendChild(info); if (n && (typeof SEAS === 'undefined' || !SEAS)) seasonRefresh().then(() => { if (G.menu === 'home') renderHome(); });
  for (const k of TS.DECO_SLOTS) {
    const spot = TS.slotSpot(k), cur = s.deco[k], box = document.createElement('div'); box.className = 'up deco';
    box.innerHTML = `<b>${TS.DECO_SLOT_N[k]}</b><p>${cur ? TS.decoById(cur).n : 'vazio'}</p>`;
    const opts = document.createElement('div'); opts.className = 'deco-opts';
    for (const d of TS.DECOR.filter(x => x.spot === spot)) {
      const b = document.createElement('button'), mine = own.has(d.id), here = cur === d.id, used = !here && Object.values(s.deco).includes(d.id);
      b.className = 'px' + (here ? ' on' : ''); b.title = d.d;
      b.textContent = here ? '✓ ' + d.n : mine ? d.n + (used ? ' (em uso)' : '') : d.n + ' · ' + d.price + ' ✧';
      b.disabled = !n && !mine;
      b.onclick = async () => {
        if (here) { delete s.deco[k]; }
        else if (mine) { for (const kk of Object.keys(s.deco)) if (s.deco[kk] === d.id) delete s.deco[kk]; s.deco[k] = d.id; }
        else { if (!SEAS || SEAS.me.dourados < d.price) { toast('Fios Dourados insuficientes', false, 'VEJA A LOJA DO PASSE (TECLA P)'); sfx('ui'); return; }
          const r = await n.shopDeco(d.id); if (!r.ok) { toast('Não deu certo', false, String(r.error).toUpperCase()); sfx('ui'); return; }
          if (r.data && r.data.view) { SEAS = r.data.view; G.cosOwned = SEAS.me.owned; } s.deco[k] = d.id; toast(d.n.toUpperCase(), true, 'NOVA DECORAÇÃO NA SUA CASA', '#ffd27a'); sfx('legend'); }
        writeSave(); homeRebuild(); renderHome(); sfx('pick');
      };
      opts.appendChild(b);
    }
    box.appendChild(opts); L.appendChild(box);
  }
}
function renderHome() {
  const s = G.save, h = H(); $('#hmGold').textContent = s.gold; const L = $('#hmList'); L.innerHTML = '';
  const sec = t => { const e = document.createElement('h3'); e.className = 'hsec'; e.textContent = t; L.appendChild(e); };
  const row = (title, desc, label, ok, fn, done) => { const r = document.createElement('div'); r.className = 'up'; r.innerHTML = `<b>${title}</b><p>${desc}</p>`; const b = document.createElement('button'); b.className = 'px' + (ok && !done ? ' gold' : ''); b.textContent = label; b.disabled = !!done || !ok; b.onclick = () => { fn(); if (G.menu === 'home') renderHome(); }; r.appendChild(b); L.appendChild(r); };
  if (!h.owned) {
    const p = document.createElement('p'); p.className = 'sub'; p.innerHTML = 'A casa de telhado vermelho a leste da forja. O Otto jura que o último dono "foi buscar pão e virou fio". Com ela vem um <b>baú</b> que guarda itens para sempre, o <b>Correio do Tear</b> para trocar itens com amigos e espaço para <b>mobília com bônus permanentes</b>.'; L.appendChild(p);
    row('Comprar a casa', 'Inclui baú de 20 espaços, correio e catálogo de mobília.', HOUSE_COST + ' ✦', s.gold >= HOUSE_COST, () => { spend(HOUSE_COST); h.owned = true; writeSave(); sfx('legend'); rebuildHub(); closeMenus(); toast('A CASA É SUA!', true, 'entre pela porta para mobiliar', '#ffbf3d'); });
    return;
  }
  const on = HOUSE_F.filter(f => h.f[f.id]);
  const bz = document.createElement('div'); bz.className = 'bonus'; bz.innerHTML = on.length ? on.map(f => `<b>${f.n}</b> · ${f.d}`).join('<br>') : 'Nenhuma mobília ainda. Cada peça aparece na casa e dá um bônus permanente.'; L.appendChild(bz);
  sec('MOBÍLIA');
  for (const F of HOUSE_F) row(F.n, F.d, h.f[F.id] ? 'Na casa' : F.c + ' ✦', s.gold >= F.c, () => { spend(F.c); h.f[F.id] = true; if (F.id === 'jardim') s.potions++; writeSave(); sfx('lvl'); toast(F.n.toUpperCase(), true, 'colocada na sua casa', '#ffbf3d'); homeRebuild(); }, !!h.f[F.id]);
  sec('DECORAÇÃO (FIOS DOURADOS)'); renderDeco(L);
  sec('BAÚ');
  const c = STASH_UP[(h.cap - 20) / 10];
  row('Ampliar o baú', `Hoje: ${h.cap} espaços.${c ? ` Próximo: ${h.cap + 10}.` : ' Tamanho máximo.'}`, c ? c + ' ✦' : 'Máximo', c && s.gold >= c, () => { spend(c); h.cap += 10; writeSave(); sfx('lvl'); toast('BAÚ AMPLIADO', false, h.cap + ' ESPAÇOS'); }, !c);
  sec('LIVRO DE CONTAS');
  const lb = document.createElement('div'); lb.className = 'bonus'; lb.innerHTML = `Centelhas gastas na vida toda: <b>${(s.spent || 0).toLocaleString('pt-BR')}</b><br>Itens no baú: <b>${h.stash.length}/${h.cap}</b> · Mobília: <b>${on.length}/${HOUSE_F.length}</b><br>Pacotes enviados pelo correio: <b>${(s.st || {}).mailSent || 0}</b>`; L.appendChild(lb);
}
let stSel = null;
function renderStash() {
  const s = G.save, h = H(); $('#stCount').textContent = `${h.stash.length}/${h.cap}`; $('#stBagN').textContent = `${s.inv.length}/${BAG()}`;
  const bag = $('#stBag'); bag.innerHTML = ''; s.inv.forEach(it => bag.appendChild(slotBtn(it, () => { stSel = { it, from: 'bag' }; renderStash(); }, stSel && stSel.it === it)));
  if (!s.inv.length) bag.innerHTML = '<p class="sub" style="grid-column:1/-1">Bolsa vazia.</p>';
  $('#stAll').disabled = !s.inv.length || h.stash.length >= h.cap;
  const box = $('#stBox'); box.innerHTML = ''; h.stash.forEach(it => box.appendChild(slotBtn(it, () => { stSel = { it, from: 'box' }; renderStash(); }, stSel && stSel.it === it)));
  for (let i = h.stash.length; i < h.cap; i++) { const e = document.createElement('div'); e.className = 'slot empty'; box.appendChild(e); }
  const det = $('#stDet');
  if (!stSel) { det.innerHTML = '<p class="sub">Toque num item para ver os detalhes e mover.</p>'; return; }
  const it = stSel.it; det.innerHTML = `<h3 style="color:${RAR[it.rar].c}">${it.name}</h3>${it.power ? `<div class="legp">✦ ${POWERS[it.power]}</div>` : ''}<div class="meta">${SLOTN[it.slot]} · ${RAR[it.rar].n} · Poder ${itemScore(it)}</div><ul>${itemLinesHTML(it, s.eq[it.slot])}</ul>`;
  const r = document.createElement('div'); r.className = 'irow'; const b = document.createElement('button'); b.className = 'px gold';
  if (stSel.from === 'bag') { b.textContent = h.stash.length >= h.cap ? 'Baú cheio' : 'Guardar no baú'; b.disabled = h.stash.length >= h.cap; b.onclick = () => { s.inv.splice(s.inv.indexOf(it), 1); h.stash.push(it); stSel = null; sfx('open'); writeSave(); renderStash(); }; }
  else { b.textContent = s.inv.length >= BAG() ? 'Bolsa cheia' : 'Pegar para a bolsa'; b.disabled = s.inv.length >= BAG(); b.onclick = () => { h.stash.splice(h.stash.indexOf(it), 1); s.inv.push(it); stSel = null; sfx('open'); writeSave(); renderStash(); }; }
  r.appendChild(b); det.appendChild(r);
}
$('#stAll').onclick = () => { const s = G.save, h = H(); while (s.inv.length && h.stash.length < h.cap) h.stash.push(s.inv.shift()); stSel = null; sfx('open'); writeSave(); renderStash(); };
function ckSum(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return (h % 1679616).toString(36).toUpperCase().padStart(4, '0'); }
function itemCode(it) { const o = { v: 1, id: it.id, n: it.name, s: it.slot, r: it.rar, t: Math.round(it.tier * 100) / 100, st: it.st, p: it.power || 0, c: it.cls || G.char.cls, u: it.up || 0, f: (G.char.name || 'Tecelão').slice(0, 20) }; const j = btoa(unescape(encodeURIComponent(JSON.stringify(o)))); return 'TEAR-' + j + '-' + ckSum(j); }
function readCode(code) {
  const m = /^TEAR-([A-Za-z0-9+/=]+)-([0-9A-Z]{4})$/.exec((code || '').replace(/\s+/g, '')); if (!m || ckSum(m[1]) !== m[2]) return null;
  let o; try { o = JSON.parse(decodeURIComponent(escape(atob(m[1])))); } catch (e) { return null; }
  if (!o || o.v !== 1 || !SLOTN[o.s] || !(o.r >= 0 && o.r <= 4) || typeof o.n !== 'string' || o.n.length > 60 || !o.st || typeof o.st !== 'object') return null;
  for (const k in o.st) if (!STAT_FMT[k] || typeof o.st[k] !== 'number' || o.st[k] < 0 || o.st[k] > 2000) return null;
  if (o.p && !POWERS[o.p]) return null;
  const it = { id: Math.random().toString(36).slice(2, 9), slot: o.s, rar: o.r | 0, tier: clamp(+o.t || 1, 1, 9), st: o.st, cls: o.c, up: clamp(o.u | 0, 0, 10), name: o.n, srcId: String(o.id), from: String(o.f || 'Tecelão').slice(0, 20) };
  if (o.p) it.power = o.p;
  if (it.slot === 'weapon' && o.c !== G.char.cls) { it.cls = G.char.cls; const tag = it.up ? ' +' + it.up : ''; if (it.rar === 4) { const L2 = LEGS.weapon[G.char.cls]; it.name = L2[0] + tag; it.power = L2[1]; } else it.name = pick(WNAMES[G.char.cls]) + ' ' + pick(SUFX[clamp(Math.round(it.tier), 1, 5)]) + tag; it.adapted = true; }
  return it;
}
let mlSel = null;
function renderMail() {
  if (NETON() && !NETON().offline) return renderMailOnline();
  $('#mlCodeBox').hidden = false; $('#mlInbox').hidden = true; $('#mlInboxH').hidden = true;
  $('#mlIntro').textContent = 'Troque itens com amigos: lacre um item num pacote, mande o código por mensagem, e a pessoa abre no correio da casa dela. Jogando online, o correio envia direto pelo nome.';
  const s = G.save, h = H(), bag = $('#mlBag'); bag.innerHTML = '';
  s.inv.forEach(it => bag.appendChild(slotBtn(it, () => { mlSel = { it }; G.mailCode = null; renderMail(); }, mlSel && mlSel.it === it)));
  if (!s.inv.length) bag.innerHTML = '<p class="sub" style="grid-column:1/-1">Coloque na bolsa o item que quer enviar.</p>';
  const det = $('#mlDet'), btn = (row, t, cls, fn) => { const b = document.createElement('button'); b.className = 'px ' + cls; b.textContent = t; b.onclick = fn; row.appendChild(b); return b; };
  if (G.mailCode) {
    det.innerHTML = '<p class="sub">Pacote lacrado! Copie o código e mande para seu amigo. Ele abre no Correio do Tear da casa dele.</p>';
    const ta = document.createElement('textarea'); ta.id = 'mlOut'; ta.readOnly = true; ta.value = G.mailCode; det.appendChild(ta);
    const r = document.createElement('div'); r.className = 'irow';
    btn(r, 'Copiar código', 'gold', () => { const ok = () => toast('Código copiado', false, 'CORREIO DO TEAR'); ta.select(); try { navigator.clipboard.writeText(G.mailCode).then(ok, () => { document.execCommand('copy'); ok(); }); } catch (e) { document.execCommand('copy'); ok(); } });
    btn(r, 'Pronto', '', () => { G.mailCode = null; renderMail(); }); det.appendChild(r); return;
  }
  if (!mlSel) { det.innerHTML = '<p class="sub">Escolha um item da bolsa para lacrar num pacote. Ele sai da sua bolsa.</p>'; return; }
  const it = mlSel.it; det.innerHTML = `<h3 style="color:${RAR[it.rar].c}">${it.name}</h3><div class="meta">${SLOTN[it.slot]} · ${RAR[it.rar].n} · Poder ${itemScore(it)}</div><ul>${itemLinesHTML(it)}</ul><p class="sub">Ao lacrar, o item sai da sua bolsa e vira um código. Só quem receber o código consegue abrir.</p>`;
  const r = document.createElement('div'); r.className = 'irow';
  btn(r, 'Lacrar e enviar', 'gold', () => { s.inv.splice(s.inv.indexOf(it), 1); h.seen.push(String(it.id)); const st2 = s.st = s.st || {}; st2.mailSent = (st2.mailSent || 0) + 1; G.mailCode = itemCode(it); mlSel = null; writeSave(); sfx('frag'); renderMail(); });
  det.appendChild(r);
}
$('#mlGet').onclick = () => {
  const it = readCode($('#mlIn').value), h = H(), s = G.save;
  if (!it) { toast('Código inválido ou danificado', false, 'CORREIO DO TEAR', '#ff8a6a'); sfx('hurt'); return; }
  if (h.seen.includes(it.srcId)) { toast('Esse pacote já foi aberto', false, 'CORREIO DO TEAR', '#ff8a6a'); return; }
  if (s.inv.length >= BAG()) { toast('Bolsa cheia. Abra espaço para receber.'); return; }
  h.seen.push(it.srcId); const from = it.from, ad = it.adapted; delete it.srcId; delete it.from; delete it.adapted; s.inv.push(it); $('#mlIn').value = ''; writeSave(); sfx('legend');
  toast(it.name, true, 'PACOTE DE ' + from.toUpperCase() + (ad ? ' · ADAPTADO À SUA CLASSE' : ''), RAR[it.rar].c); renderMail();
};
function upCost(it) { return Math.round(itemPrice(it) * .5 * Math.pow(1.5, it.up || 0) * (hasF('bancada') ? .7 : 1)); }
function upgradeItem(it) {
  const u = it.up || 0; if (u >= 10) return; const c = upCost(it); if (G.save.gold < c) return; spend(c); missionEvent('upgrade');
  if (Math.random() < UPCH[u]) {
    it.up = u + 1; for (const k in it.st) it.st[k] = Math.max(it.st[k] + 1, Math.round(it.st[k] * 1.08));
    it.name = it.name.replace(/ \+\d+$/, '') + ' +' + it.up; afterEquip();
    toast(it.name, it.up >= 8, 'APRIMORADO PARA +' + it.up, RAR[it.rar].c); sfx(it.up >= 8 ? 'legend' : 'lvl'); hitStop(.05);
  } else { writeSave(); toast('O metal rachou, mas não quebrou', false, 'FALHOU · ' + Math.round(UPCH[u] * 100) + '% DE CHANCE', '#ff8a6a'); sfx('hurt'); }
}
const gambleCost = () => { const nb = ['forest', 'crypt', 'peaks', 'swamp', 'glass'].filter(k => G.save.bosses[k]).length; return Math.round(100 * (1 + nb) * (1 + .4 * (G.save.diff || 0))); };
function gamble(slot) {
  const s = G.save, c = gambleCost(); if (s.gold < c || s.inv.length >= BAG()) return; spend(c);
  const r = Math.random(), d = s.diff || 0, rar = r < .02 + .006 * d ? 4 : r < .15 ? 3 : r < .45 ? 2 : 1;
  const nb = ['forest', 'crypt', 'peaks', 'swamp', 'glass'].filter(k => s.bosses[k]).length, it = makeItem(slot, Math.min(5, nb + 1) + curDiff().tier * .6, rar);
  const st2 = s.st = s.st || {}; st2.gambles = (st2.gambles || 0) + 1; if (rar === 4) st2.legs = (st2.legs || 0) + 1;
  s.inv.push(it); writeSave(); toast(it.name, rar >= 3, 'DO EMBRULHO · ' + RAR[rar].n.toUpperCase(), RAR[rar].c); sfx(rar === 4 ? 'legend' : rar === 3 ? 'epic' : 'open'); if (rar === 4) hitStop(.08);
}
/** Perfil do herói (clicar no retrato do HUD): retrato grande, atributos, equipamento e jornada. */
/** Cofre do Tear: o que está no banco não se perde ao morrer nos Ermos. */
function renderBank() {
  const s = G.save; s.bank = s.bank || 0;
  $('#bkSub').innerHTML = `Com você: <b style="color:var(--gold)">${s.gold}</b> Centelhas · No cofre: <b style="color:#9ff6ff">${s.bank}</b>. O que fica no cofre não cai no chão quando você morre nos Ermos.`;
  const box = $('#bkBtns'); box.innerHTML = '';
  const mk = (label, ok, fn, gold) => { const b = document.createElement('button'); b.className = 'px' + (ok && gold ? ' gold' : ''); b.textContent = label; b.disabled = !ok; b.onclick = () => { fn(); sfx('pick'); writeSave(); renderBank(); }; box.appendChild(b); };
  for (const n of [100, 1000, 10000]) mk('Guardar ' + n, s.gold >= n, () => { s.gold -= n; s.bank += n; }, true);
  mk('Guardar tudo', s.gold > 0, () => { s.bank += s.gold; s.gold = 0; }, true);
  for (const n of [100, 1000, 10000]) mk('Sacar ' + n, s.bank >= n, () => { s.bank -= n; s.gold += n; });
  mk('Sacar tudo', s.bank > 0, () => { s.gold += s.bank; s.bank = 0; });
}
$('#bkClose').onclick = () => closeMenus();
function renderProfile() {
  const s = G.save, st = stats(), m = Math.floor((s.time || 0) / 60);
  try { const A = newAnim(playerModel); $('#pfImg').src = bakeModel(playerModel, A, 96, [.9, 1.6, 4.4], [0, 1.05, 0], .35, 30); } catch (e) { }
  $('#pfName').textContent = G.char.name;
  $('#pfSub').textContent = `${CLS[G.char.cls].label} · Nível ${s.lvl} · ${curDiff().n}` + (eloLvl(s) !== s.lvl ? ` · conta como ${eloLvl(s)} (Fio de Elo)` : '');
  const need = xpNeed(s.lvl), pct = Math.min(100, Math.round((s.xp / need) * 100)); $('#pfXp').style.width = pct + '%'; $('#pfXpT').textContent = `XP ${Math.floor(s.xp)} / ${need} (${pct}%)`;
  $('#pfStats').innerHTML = [['Vida', P ? P.maxHp : st.maxHp], ['Dano', Math.round(st.dmg)], ['Crítico', Math.round((st.crit || 0) * 100) + '%'], ['Defesa', Math.round((st.def || 0) * 100) + '%'], ['Vampirismo', Math.round((st.leech || 0) * 100) + '%'], ['Poções', s.potions + '/' + st.maxPot]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join('');
  $('#pfEq').innerHTML = ['weapon', 'armor', 'charm'].map(k => { const it = s.eq[k]; return `<div class="row"><img src="${icon(k === 'weapon' ? CLSICON[G.char.cls] : k)}" alt="" style="width:24px;height:24px;image-rendering:pixelated"><span style="color:${it ? RAR[it.rar].c : 'var(--dim)'}">${it ? it.name : 'Vazio'}</span><small>${it ? RAR[it.rar].n + ' · Poder ' + itemScore(it) : SLOTN[k]}</small></div>`; }).join('');
  $('#pfJourney').innerHTML = [['Tempo de jogo', m + ' min'], ['Monstros', s.kills || 0], ['Quedas', s.deaths || 0], ['Centelhas', s.gold], ['No cofre', s.bank || 0], ['Feitos', (s.feats || []).length + '/' + FEITOS.length], ['Fenda máx.', s.riftMax || 0], ['Peixes', (s.st && s.st.fish) || 0], ['Mapa', hasMap() ? 'Sim' : 'Não']].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join('');
  $('#pfWard').hidden = !(G.save.house && G.save.house.owned && G.save.house.f.guarda);
}
$('#hPortraitB').onclick = () => openMenu('profile');
$('#pfClose').onclick = () => closeMenus();
$('#pfWard').onclick = () => { closeMenus(); if (RG && RG.key === 'home') openWardrobe(); else toast('O Guarda-Roupa fica na sua casa', false, 'A LESTE DA FORJA'); };
function renderJournal() {
  const s = G.save; $('#jQuests').innerHTML = questListHTML();
  const fd = s.feats || []; $('#jFeatN').textContent = `${fd.length}/${FEITOS.length}`;
  $('#jFeats').innerHTML = FEITOS.map(f => `<div class="card" aria-pressed="${fd.includes(f.id)}" style="cursor:default"><b>${fd.includes(f.id) ? '✦ ' : ''}${f.n}</b><p>${f.d}</p></div>`).join('');
  $('#jFios').innerHTML = [['forest', 'FIO VERDE'], ['crypt', 'FIO DE OSSO'], ['peaks', 'FIO DE BRASA']].map(([k, n]) => `<div class="fio ${s.bosses[k] ? 'on' : ''}">${n}</div>`).join('');
  const st = stats(), m = Math.floor(s.time / 60);
  $('#jStats').innerHTML = [['Classe', CLS[G.char.cls].label], ['Nível', s.lvl], ['Vida', P.maxHp], ['Dano', Math.round(st.dmg)], ['Tempo', m + ' min'], ['Monstros', s.kills]].map(([a, b]) => `<div>${a}<b>${b}</b></div>`).join('');
  const rn = { forest: 'Bosque Sussurrante', crypt: 'Ossuário Real', peaks: 'Picos de Cinza' };
  $('#jFrags').innerHTML = FRAG.map((f, i) => s.frags.includes(i) ? `<div class="frag"><b>${f.t}</b><p>${f.x}</p></div>` : `<div class="frag lock"><b>??? · ${rn[f.r]}</b><p>Uma memória escondida num canto afastado.</p></div>`).join('');
}
function renderPause() { $('#sTips').checked = G.settings.tips !== false; $('#sUi').value = G.settings.uis || 1; $('#sZoom').value = G.settings.zoom || 1; $('#sHalo').checked = G.settings.halo !== false; renderDiff(); $('#sVib').checked = G.settings.vib !== false; $('#sMusic').value = G.settings.music; $('#sPx').value = G.settings.px; $('#sDither').value = G.settings.dither; $('#sOutline').checked = G.settings.outline; $('#sSound').checked = G.settings.sound; }
$('#sPx').oninput = e => { G.settings.px = +e.target.value; saveSettings(); };
$('#sZoom').oninput = e => { G.settings.zoom = +e.target.value; saveSettings(); };
$('#sHalo').onchange = e => { G.settings.halo = e.target.checked; saveSettings(); };
$('#sTips').onchange = e => { G.settings.tips = e.target.checked; saveSettings(); if (!e.target.checked) tipHide(); else if (G.save && G.save.tips) { G.save.tips = { _vet: 0 }; writeSave(); } };   // religar recomeça as dicas
$('#sUi').oninput = e => { G.settings.uis = +e.target.value; saveSettings(); updateUiScale(); };
// barra de poses do espelho (bolsa e criação)
document.querySelectorAll('#poseBar button').forEach(b => b.onclick = () => { const p = b.dataset.p; sfx('ui'); if (p === 'zin') camZoom(-1); else if (p === 'zout') camZoom(1); else { G.pvPose = p; document.querySelectorAll('#poseBar button').forEach(x => x.classList.toggle('on', x === b)); } });
$('#sDither').oninput = e => { G.settings.dither = +e.target.value; saveSettings(); };
$('#sOutline').onchange = e => { G.settings.outline = e.target.checked; saveSettings(); };
$('#sDiff').onchange = e => { const v = +e.target.value; if (!G.save || !diffOk(DIFFS[v]) || !(RG && RG.key === 'hub')) { renderDiff(); return; } G.save.diff = v; writeSave(); renderDiff(); updateObjective(); toast('DIFICULDADE: ' + DIFFS[v].n.toUpperCase(), true, DIFFS[v].d, DIFFS[v].c); sfx(v > 0 ? 'epic' : 'open'); };
$('#sSound').onchange = e => { G.settings.sound = e.target.checked; saveSettings(); };
$('#sMusic').oninput = e => { G.settings.music = +e.target.value; if (MUS.master && AC) MUS.master.gain.setTargetAtTime(G.settings.music * .8, AC.currentTime, .1); saveSettings(); };
function saveSettings() { try { localStorage.setItem(SKEY + '-set', JSON.stringify(G.settings)); } catch (e) { } }
try { const s = JSON.parse(localStorage.getItem(SKEY + '-set') || 'null'); if (s) { Object.assign(G.settings, s); if ((s.sv || 0) < 2) { G.settings.px = 3; G.settings.dither = .5; G.settings.sv = 2; } } } catch (e) { }   /* sv 2: novo padrão de pixel 3 e pontilhado .5 */
updateUiScale();   // o tamanho da interface salvo vale desde a primeira tela

/* ---- título, criador, história ---- */
function toTitle() {
  G.mode = 'title'; G.rift = null; G.menu = null; setMusic('title'); P = null; boss = null; enemies = []; projs = []; tels = []; pickups = [];
  if (!RG || RG.key !== 'hub') { RG = genRegion('hub'); RG.gateSet = new Set(); if (!WORLDS.hub) WORLDS.hub = buildWorld('hub', RG); WD = WORLDS.hub; }
  inter = []; npcs = []; critters = []; $('#marks').innerHTML = '';
  for (const n of NPCS) { if (n.id === 'desf') continue; const m = makeModel('npc-' + n.id, () => buildHumanoid(n.cfg, 32 + NPCS.indexOf(n) * 8)); npcs.push({ ...n, model: m, anim: newAnim(m), yaw: n.baseYaw || 0, talkT: 0, visible: true }); }
  spawnCritters();
  uploadPalette('hub');
  const sv = readOfflineSave(); $('#mContinue').hidden = !sv;   // o Continuar do título é sempre o offline
  showOnly('#title'); refreshHudVis();
}
$('#mNew').onclick = () => { sfx('ui'); useOfflineSlot(); const n = NET(); if (n) { n.offline = true; n.leaveHub(); } if (G.touch) goLandscape(); openCreator(); };
$('#pFull').onclick = () => { goLandscape(); };
// Reportar problema: pelo painel online (funciona sem conta); sem servidor, abre a página de privacidade, que tem o contato.
$('#pReport').onclick = () => { const u = window.TessNetUI; if (u) u.report(); else window.open('privacidade.html#direitos', '_blank', 'noopener'); };
$('#sVib').onchange = e => { G.settings.vib = e.target.checked; saveSettings(); };
$('#mContinue').onclick = () => { sfx('ui'); useOfflineSlot(); const n = NET(); if (n) { n.offline = true; n.leaveHub(); } const sv = readSave(); if (sv) startFromSave(sv); };
function startFromSave(sv) {
  sv.inv = sv.inv || []; sv.eq = sv.eq || {}; sv.met = sv.met || {}; sv.talents = sv.talents || []; sv.pgp = sv.pgp || {}; sv.perks = sv.perks || {}; sv.q = sv.q || {}; sv.riftMax = sv.riftMax || 0; sv.fios = sv.fios || 0; sv.riftBest = sv.riftBest || {}; G.rift = null;
  G.save = sv; G.char = { ...sv.char }; rebuildPlayerModel(); P = null;
  showOnly(null); G.mode = 'play'; refreshHudVis();
  $('#loading').hidden = false;
  setTimeout(() => { loadRegion(sv.region || 'hub', true); $('#loading').hidden = true; fadeTo(0, .6); }, 30);
}
let creatorYaw = 0;
function optRow(id, items, key, isSwatch) {
  const box = $(id); box.innerHTML = '';
  items.forEach((it, i) => {
    const b = document.createElement('button');
    const locked = it.cost && !(G.save && (G.save.cos || []).includes(it.value));
    if (isSwatch) { b.className = 'sw'; b.style.background = it.color; b.title = it.label; b.setAttribute('aria-label', it.label); }
    else { b.className = 'opt' + (it.cost ? ' rare' : ''); b.textContent = locked ? `🔒 ${it.label} · ${it.cost} ✦` : it.label; }
    b.setAttribute('aria-pressed', G.char[key] === it.value);
    b.onclick = () => {
      if (locked) {   // estilo raro: compra uma vez e fica liberado para sempre
        if (G.save.gold < it.cost) { sfx('ui'); toast('CENTELHAS INSUFICIENTES', false, `${it.label} custa ${it.cost} ✦`); return; }
        spend(it.cost); (G.save.cos = G.save.cos || []).push(it.value); writeSave(); sfx('lvl'); toast(it.label.toUpperCase(), true, 'estilo raro liberado no guarda-roupa', '#ffbf3d');
        G.char[key] = it.value; renderCreator(); scheduleRebuild(); return;
      }
      G.char[key] = it.value; sfx('ui'); [...box.children].forEach(c => c.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); scheduleRebuild(); };
    box.appendChild(b);
  });
}
function renderCreator() {
  $('#cName').value = G.char.name;
  const cb = $('#cCls'); cb.innerHTML = '';
  for (const [k, c] of Object.entries(CLS)) {
    const b = document.createElement('button'); b.className = 'opt'; b.innerHTML = `<b>${c.label}</b><span>${c.desc}</span>`; b.setAttribute('aria-pressed', G.char.cls === k);
    b.onclick = () => { G.char.cls = k; sfx('ui'); [...cb.children].forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); scheduleRebuild(); };
    cb.appendChild(b);
  }
  optRow('#cBody', BODIES.map((b, i) => ({ label: b[0], value: i })), 'body');
  optRow('#cSkin', SKINS.map((s, i) => ({ color: css(hsl2rgb(s[0], s[1], s[2])), label: 'Tom ' + (i + 1), value: i })), 'skin', true);
  const W = !!G.wardrobe;
  $('#cTitle').textContent = W ? 'Guarda-Roupa' : 'Crie sua Tecelagem'; $('#cNameF').hidden = W; $('#cClsF').hidden = W; $('#cRand').hidden = W; $('#cWardSub').hidden = !W;
  if (W) $('#cWardSub').innerHTML = `Você tem <b style="color:var(--gold)">${G.save.gold}</b> Centelhas. Os estilos com 🔒 são raros: compre uma vez e use quando quiser.`;
  $('#cGo').textContent = W ? 'Vestir' : 'Começar a jornada'; $('#cBack').textContent = W ? 'Cancelar' : 'Voltar';
  optRow('#cHair', HAIR_STYLES.map(h => ({ label: h[1], value: h[0] })).concat(W ? RARE_HAIR.map(h => ({ label: h[1], value: h[0], cost: h[2] })) : []), 'hair');
  optRow('#cHairCol', HAIRS.map((s, i) => ({ color: css(hsl2rgb(s[0], s[1], s[2])), label: 'Cor ' + (i + 1), value: i })), 'hairCol', true);
  optRow('#cOutfit', OUTFITS.map((s, i) => ({ color: css(hsl2rgb(s[0], s[1], s[2])), label: 'Roupa ' + (i + 1), value: i })), 'outfit', true);
  optRow('#cTrim', TRIMS.map((s, i) => ({ color: css(hsl2rgb(s[0], s[1], s[2])), label: 'Detalhe ' + (i + 1), value: i })), 'trim', true);
  optRow('#cGlow', GLOWS.map((g2, i) => ({ color: css(g2[1][2]), label: g2[0], value: i })), 'glow', true);
  optRow('#cAcc', ACCS.map(a => ({ label: a[1], value: a[0] })).concat(W ? RARE_ACCS.map(a => ({ label: a[1], value: a[0], cost: a[2] })) : []), 'acc');
  optRow('#cBeard', BEARDS.map(b => ({ label: b[1], value: b[0] })), 'beard');
  $('#cAuraF').hidden = !W; if (W) { if (!G.char.aura) G.char.aura = 'nenhuma'; optRow('#cAura', AURAS.map(a => ({ label: a[1], value: a[0], cost: a[2] || undefined })), 'aura'); }
  $('#cArmorF').hidden = !W; if (W) { if (!G.char.armorStyle) G.char.armorStyle = 'classica'; optRow('#cArmor', ARMOR_STYLES.map(a => ({ label: a[1], value: a[0], cost: a[2] })), 'armorStyle'); $('#cArmorHint').hidden = !!(G.save.eq && G.save.eq.armor); }
  $('#cCosF').hidden = !W;
  if (W) {   // cosméticos da temporada: só os que a conta tem (vêm do servidor)
    for (const k of ['trail', 'namecolor', 'ctitle', 'tele', 'death', 'frame']) if (G.char[k] === undefined) G.char[k] = '';
    const own = new Set(G.cosOwned || []), C = window.TessSeason.COSMETICS, mk = slot => [{ label: 'Nenhum', value: '' }].concat(C.filter(c => c.slot === slot && own.has(c.id)).map(c => ({ label: c.n, value: c.id })));
    optRow('#cTrail', mk('trail'), 'trail'); optRow('#cNameCol', mk('namecolor'), 'namecolor'); optRow('#cCTitle', mk('title'), 'ctitle'); optRow('#cTele', mk('tele'), 'tele'); optRow('#cDeath', mk('death'), 'death'); optRow('#cFrame', mk('frame'), 'frame');
    $('#cCosHint').textContent = own.size ? 'Rastro de esquiva, cor do nome e título: os outros jogadores veem.' : 'Ganhe rastros, cores de nome e títulos no Passe do Tear (tecla P) ou compre na loja da temporada.';
  }
  $('#cCape').checked = G.char.cape;
}
let rebuildTimer = 0;
function scheduleRebuild() { clearTimeout(rebuildTimer); rebuildTimer = setTimeout(() => { rebuildPlayerModel(); uploadPalette(RG ? RG.key : 'hub'); }, 50); }
/** Guarda-Roupa da casa: o mesmo espelho da criação, sem nome e classe, com os estilos raros à venda. */
function openWardrobe() {
  G.wardrobe = { prev: { ...G.char } }; G.mode = 'create'; G.pvPose = null; $('#prompt').hidden = true; $('#tUse').hidden = true;
  renderCreator(); rebuildPlayerModel(); uploadPalette(RG.key); getModel('pedestal');
  seasonRefresh().then(v => { if (v && G.wardrobe) renderCreator(); });   // cosméticos da conta
  showOnly('#create'); refreshHudVis(); sfx('ui');
}
function closeWardrobe(keep) {
  if (!keep) G.char = { ...G.wardrobe.prev };
  else { G.save.char = { ...G.char }; writeSave(); toast('VISUAL NOVO', true, 'os outros jogadores já veem', '#ffbf3d'); sfx('lvl'); }
  G.wardrobe = null; G.mode = 'play'; P.act = null; P.actT = 0; showOnly(null); rebuildPlayerModel(); uploadPalette(RG.key); refreshHudVis(); netLook();
}
function openCreator() {
  G.wardrobe = null; G.mode = 'create'; if (!G.char.name) G.char.name = pick(NAMES); G.char.beard = G.char.beard || 'nenhuma';
  if (!ACCS.some(a => a[0] === G.char.acc)) G.char.acc = 'nenhum'; if (!HAIR_STYLES.some(h => h[0] === G.char.hair)) G.char.hair = 'curto';   // estilos raros não passam para um herói novo
  renderCreator(); rebuildPlayerModel(); uploadPalette('hub'); getModel('pedestal');
  makePlayer(0, 0); showOnly('#create'); refreshHudVis();
}
$('#cName').addEventListener('input', e => { G.char.name = e.target.value.trim() || 'Tecelagem'; });
$('#cCape').addEventListener('change', e => { G.char.cape = e.target.checked; scheduleRebuild(); });
$('#cRand').onclick = () => {
  sfx('ui');
  Object.assign(G.char, { cls: pick(Object.keys(CLS)), body: Math.floor(rr(0, 3)), skin: Math.floor(rr(0, SKINS.length)), hair: pick(HAIR_STYLES)[0], hairCol: Math.floor(rr(0, HAIRS.length)), outfit: Math.floor(rr(0, OUTFITS.length)), trim: Math.floor(rr(0, TRIMS.length)), glow: Math.floor(rr(0, GLOWS.length)), acc: pick(ACCS)[0], cape: Math.random() < .6, name: pick(NAMES), beard: Math.random() < .6 ? 'nenhuma' : pick(BEARDS)[0] });
  renderCreator(); scheduleRebuild();
};
$('#cBack').onclick = () => { sfx('ui'); if (G.wardrobe) return closeWardrobe(false); toTitle(); };
$('#cGo').onclick = () => {
  if (G.wardrobe) return closeWardrobe(true);
  sfx('ui'); G.char.name = ($('#cName').value.trim() || pick(NAMES)).slice(0, 14);
  G.save = newSave(); writeSave(); P = null; rebuildPlayerModel();
  G.mode = 'story'; G.storyI = 0; showOnly('#story'); $('#storyBox').innerHTML = ''; storyNext();
};
function storyNext() {
  const box = $('#storyBox'), SL = G.storyLines || STORY;
  if (G.storyI >= SL.length && G.storyEnd) { const cb = G.storyEnd; G.storyLines = null; G.storyEnd = null; cb(); return; }
  if (G.storyI >= SL.length) {
    showOnly(null); G.mode = 'play'; refreshHudVis(); $('#loading').hidden = false;
    setTimeout(() => { loadRegion('hub'); $('#loading').hidden = true; fadeTo(0, .8); }, 30);
    return;
  }
  box.innerHTML = '';
  const p = document.createElement('p'); p.textContent = SL[G.storyI++]; box.appendChild(p);
  const h = document.createElement('div'); h.className = 'hint'; h.textContent = G.storyI >= SL.length ? (G.storyEnd ? 'TOQUE PARA CONTINUAR' : 'TOQUE PARA COMEÇAR') : 'TOQUE PARA CONTINUAR'; box.appendChild(h);
}
$('#story').addEventListener('click', () => { sfx('ui'); storyNext(); });

