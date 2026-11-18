/* Fios de Tessária · Interface: HUD, menus, toasts */
/* =========================================================
   UI: HUD, MENUS, TOASTS, NÚMEROS
   ========================================================= */
function toast(text, big, sub, color) {
  const el = document.createElement('div'); el.className = 'toast' + (big ? ' big' : ''); el.textContent = text; if (color) el.style.color = color;
  if (sub) { const s = document.createElement('small'); s.textContent = sub; el.appendChild(s); }
  const box = $('#toast'); box.appendChild(el); while (box.children.length > 3) box.firstChild.remove(); setTimeout(() => el.remove(), 2700);
}
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
  setTxt('#hName', G.char.name); setTxt('#hLv', eloLvl(s) !== s.lvl ? s.lvl + ' → ' + eloLvl(s) + ' ELO' : eloMentor() ? s.lvl + ' MENTOR' : s.lvl);
  $('#hHp').style.width = clamp(P.hp / P.maxHp, 0, 1) * 100 + '%'; setTxt('#hHpT', `${Math.ceil(P.hp)} / ${P.maxHp}`);
  $('#hXp').style.width = clamp(s.xp / xpNeed(s.lvl), 0, 1) * 100 + '%';
  setTxt('#hGold', s.gold); setTxt('#hPot', s.potions + '/' + st.maxPot); setTxt('#hFrag', s.frags.length + '/9');
  const dc = clamp(P.dashCd / st.dashCd, 0, 1), sc = clamp(P.skillCd / st.skillCd, 0, 1), ac = clamp(P.atkCd / st.atkCd, 0, 1);
  $('#abDash').style.setProperty('--cd', dc); $('#abSkill').style.setProperty('--cd', sc); $('#abAtk').style.setProperty('--cd', ac);
  $('#tDash').style.setProperty('--cd', dc); $('#tSkill').style.setProperty('--cd', sc);
  const sk = P.skillCd > 0 ? Math.ceil(P.skillCd) : ''; setTxt('#abSkillT', sk); setTxt('#tSkillT', sk);
  setTxt('#abPotN', s.potions); setTxt('#tPotN', s.potions);
  if (hudCache.pe !== (s.potions <= 0)) { hudCache.pe = s.potions <= 0; $('#abPot').classList.toggle('empty', hudCache.pe); $('#tPot').classList.toggle('empty', hudCache.pe); }
  if (hudCache.cls !== G.char.cls) {
    hudCache.cls = G.char.cls;
    for (const id of ['#abAtk img', '#tAtk img']) $(id).src = icon(CLSICON[G.char.cls]);
    for (const id of ['#abSkill img', '#tSkill img']) $(id).src = icon(SKILLICON[G.char.cls]);
    $('#abSkillL').textContent = SKILLNAME[G.char.cls];
  }
  { const R2 = RUNES[G.char.cls][curRune()], tip = (R2 ? R2.n + '\n' + R2.d : 'Habilidade') + '\nBotão direito do mouse (ou K)'; if (hudCache.tip !== tip) { hudCache.tip = tip; $('#abSkill').dataset.tip = tip; } }   // dica com a runa ativa
  if (!G.touch && (G.keysT = (G.keysT ?? 60) - 1 / 60) <= 0 && G.keysT > -1) { $('#keys').classList.add('faded'); G.keysT = -2; }   // a linha de controles some depois de um tempo (H mostra de novo)
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
  if (!play) { $('#mmap').hidden = true; $('#mmapZ').hidden = true; } else if (RG && RG.key !== 'hub' && RG.key !== 'home') { $('#mmap').hidden = false; $('#mmapZ').hidden = false; }
  $('#touch').hidden = !(play && G.touch && G.mode === 'play');
  $('#keys').hidden = G.touch; $('#abar').hidden = G.touch;
}
function showOnly(id) { for (const s of ['#title', '#create', '#story', '#forge', '#journal', '#pause', '#ending', '#inv', '#shop', '#skills', '#board', '#riftm', '#home', '#stash', '#mail']) $(s).hidden = s !== id; }
function openMenu(which) {
  if (G.mode !== 'play' && !(G.mode === 'dialog' && (which === 'forge' || which === 'shop'))) return;
  $('#dialog').hidden = true; DLG.q = []; DLG.cur = null;
  G.mode = 'menu'; input.atk = false; sfx('ui');
  G.menu = which; $('#prompt').hidden = true; $('#tUse').hidden = true;
  if (which === 'skills') renderSkills(); if (which === 'board') renderBoard(); if (which === 'riftm') renderRiftMenu();
  if (which === 'inv') { invSel = null; renderInv(); } if (which === 'shop') { invSel = null; renderShop(); }
  if (which === 'home') renderHome(); if (which === 'stash') { stSel = null; renderStash(); } if (which === 'mail') { mlSel = null; G.mailCode = null; resetMailOnline(); renderMail(); }
  if (which === 'forge') renderForge(); if (which === 'journal') renderJournal(); if (which === 'pause') renderPause();
  showOnly('#' + which); refreshHudVis();
}
function closeMenus() { showOnly(null); G.mode = 'play'; G.menu = null; refreshHudVis(); updateObjective(); }
$('#bJournal').onclick = () => openMenu('journal'); $('#bBag').onclick = () => openMenu('inv');
$('#abBag').onclick = () => openMenu('inv'); $('#abDash').onclick = () => doDash(); $('#abSkill').onclick = () => doSkill(); $('#abPot').onclick = () => drinkPotion();
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
  box.innerHTML = `<h3 style="color:${RAR[it.rar].c}">${it.name}</h3>${it.power ? `<div class="legp">✦ ${POWERS[it.power]}</div>` : ''}<div class="meta">${SLOTN[it.slot]} · ${RAR[it.rar].n} · Poder ${sc}${cs !== null ? ` <span class="${sc >= cs ? 'up-g' : 'dn-r'}">(${sc >= cs ? '+' : ''}${sc - cs})</span>` : ''}</div><ul>${itemLinesHTML(it, isEq ? null : cur)}</ul>` + (cur && !isEq ? `<div class="meta">Comparando com: <span style="color:${RAR[cur.rar].c}">${cur.name}</span></div>` : (!cur && !isEq ? '<div class="meta">Você não tem nada neste espaço.</div>' : ''));
  const row = document.createElement('div'); row.className = 'irow';
  const btn = (label, cls, fn, dis) => { const b = document.createElement('button'); b.className = 'px ' + cls; b.textContent = label; b.disabled = !!dis; b.onclick = () => { fn(); after(); }; row.appendChild(b); };
  if (ctx === 'inv') {
    if (isEq) btn('Guardar na bolsa', '', () => { if (s.inv.length >= 20) { toast('Bolsa cheia.'); return; } s.inv.push(it); s.eq[it.slot] = null; invSel = null; afterEquip(); }, s.inv.length >= 20);
    else { btn('Equipar', 'gold', () => { const prev = s.eq[it.slot]; s.eq[it.slot] = it; s.inv.splice(s.inv.indexOf(it), 1); if (prev) s.inv.push(prev); invSel = { it, eq: it.slot }; afterEquip(); }); btn(`Desmontar (+${scrapVal(it)} Centelhas)`, '', () => { s.gold += scrapVal(it); s.inv.splice(s.inv.indexOf(it), 1); invSel = null; sfx('pick'); writeSave(); }); }
  } else if (ctx === 'buy') {
    const pr = itemPrice(it); btn(`Comprar (${pr} Centelhas)`, 'gold', () => { spend(pr); s.shop.items.splice(s.shop.items.indexOf(it), 1); invSel = null; if (!takeItem(it)) s.inv.push(it); writeSave(); }, s.gold < pr || s.inv.length >= 20);
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
  s.inv.forEach(it => bag.appendChild(slotBtn(it, () => { invSel = { it }; renderInv(); }, invSel && invSel.it === it)));
  for (let i = s.inv.length; i < 20; i++) { const e = document.createElement('div'); e.className = 'slot empty'; bag.appendChild(e); }
  $('#iCount').textContent = `${s.inv.length}/20`;
  renderDetail($('#iDet'), invSel, 'inv', renderInv);
}
function ensureShop() {
  const s = G.save, nb = ['forest', 'crypt', 'peaks', 'swamp', 'glass'].filter(k => s.bosses[k]).length, stamp = nb * 10 + (s.diff || 0);
  if (!s.shop || s.shop.stamp !== stamp) { const tier = Math.min(5, nb + 1) + curDiff().tier * .6; s.shop = { stamp, items: [makeItem('weapon', tier, rollRar(1)), makeItem('armor', tier, rollRar(1)), makeItem('charm', tier, rollRar(1)), makeItem(pick(['weapon', 'armor', 'charm']), tier, Math.max(2, rollRar(2)))] }; writeSave(); }
}
function renderShop() {
  ensureShop();
  const s = G.save, st = stats(); $('#sGold').textContent = s.gold;
  const list = $('#sList'); list.innerHTML = '';
  const potRow = document.createElement('div'); potRow.className = 'shoprow';
  potRow.innerHTML = `<div class="slot" style="--rc:#d9433a"><img src="${icon('potion')}" alt=""></div><div class="nm">Poção de cura<small>Recupera 45% da vida · você tem ${s.potions}/${st.maxPot}</small></div>`;
  const pb = document.createElement('button'); pb.className = 'px gold'; pb.textContent = '20 Centelhas'; pb.disabled = s.gold < 20 || s.potions >= st.maxPot;
  pb.onclick = () => { spend(20); s.potions++; sfx('pick'); writeSave(); renderShop(); }; potRow.appendChild(pb); list.appendChild(potRow);
  { const gc = gambleCost(), gr = document.createElement('div'); gr.className = 'shoprow'; gr.innerHTML = `<div class="slot" style="--rc:#c07bff"><img src="${icon('bag')}" alt=""></div><div class="nm">Embrulho misterioso<small>${gc} Centelhas · item surpresa, nunca comum · 13% épico · 2% lendário</small></div>`;
    const bx = document.createElement('div'); bx.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end';
    for (const [sl, lb] of [['weapon', 'Arma'], ['armor', 'Armadura'], ['charm', 'Amuleto']]) { const b = document.createElement('button'); b.className = 'px' + (s.gold >= gc && s.inv.length < 20 ? ' gold' : ''); b.textContent = lb; b.disabled = s.gold < gc || s.inv.length >= 20; b.onclick = () => { sfx('ui'); gamble(sl); renderShop(); }; bx.appendChild(b); }
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
  s.inv.forEach(it => bag.appendChild(slotBtn(it, () => { invSel = { it, sell: true }; renderShop(); }, invSel && invSel.it === it)));
  if (!s.inv.length) bag.innerHTML = '<p class="sub" style="grid-column:1/-1">Sua bolsa está vazia.</p>';
  renderDetail($('#sDet'), invSel, invSel && invSel.buy ? 'buy' : 'sell', renderShop);
} $('#bPause').onclick = () => openMenu('pause');
$('#hmClose').onclick = closeMenus; $('#stClose').onclick = closeMenus; $('#mlClose').onclick = closeMenus;
$('#fClose').onclick = closeMenus; $('#jClose').onclick = closeMenus; $('#pResume').onclick = closeMenus;
$('#pQuit').onclick = () => { writeSave(); showOnly(null); toTitle(); };
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
  sec('BAÚ');
  const c = STASH_UP[(h.cap - 20) / 10];
  row('Ampliar o baú', `Hoje: ${h.cap} espaços.${c ? ` Próximo: ${h.cap + 10}.` : ' Tamanho máximo.'}`, c ? c + ' ✦' : 'Máximo', c && s.gold >= c, () => { spend(c); h.cap += 10; writeSave(); sfx('lvl'); toast('BAÚ AMPLIADO', false, h.cap + ' ESPAÇOS'); }, !c);
  sec('LIVRO DE CONTAS');
  const lb = document.createElement('div'); lb.className = 'bonus'; lb.innerHTML = `Centelhas gastas na vida toda: <b>${(s.spent || 0).toLocaleString('pt-BR')}</b><br>Itens no baú: <b>${h.stash.length}/${h.cap}</b> · Mobília: <b>${on.length}/${HOUSE_F.length}</b><br>Pacotes enviados pelo correio: <b>${(s.st || {}).mailSent || 0}</b>`; L.appendChild(lb);
}
let stSel = null;
function renderStash() {
  const s = G.save, h = H(); $('#stCount').textContent = `${h.stash.length}/${h.cap}`; $('#stBagN').textContent = `${s.inv.length}/20`;
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
  else { b.textContent = s.inv.length >= 20 ? 'Bolsa cheia' : 'Pegar para a bolsa'; b.disabled = s.inv.length >= 20; b.onclick = () => { h.stash.splice(h.stash.indexOf(it), 1); s.inv.push(it); stSel = null; sfx('open'); writeSave(); renderStash(); }; }
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
  if (s.inv.length >= 20) { toast('Bolsa cheia. Abra espaço para receber.'); return; }
  h.seen.push(it.srcId); const from = it.from, ad = it.adapted; delete it.srcId; delete it.from; delete it.adapted; s.inv.push(it); $('#mlIn').value = ''; writeSave(); sfx('legend');
  toast(it.name, true, 'PACOTE DE ' + from.toUpperCase() + (ad ? ' · ADAPTADO À SUA CLASSE' : ''), RAR[it.rar].c); renderMail();
};
function upCost(it) { return Math.round(itemPrice(it) * .5 * Math.pow(1.5, it.up || 0) * (hasF('bancada') ? .7 : 1)); }
function upgradeItem(it) {
  const u = it.up || 0; if (u >= 10) return; const c = upCost(it); if (G.save.gold < c) return; spend(c);
  if (Math.random() < UPCH[u]) {
    it.up = u + 1; for (const k in it.st) it.st[k] = Math.max(it.st[k] + 1, Math.round(it.st[k] * 1.08));
    it.name = it.name.replace(/ \+\d+$/, '') + ' +' + it.up; afterEquip();
    toast(it.name, it.up >= 8, 'APRIMORADO PARA +' + it.up, RAR[it.rar].c); sfx(it.up >= 8 ? 'legend' : 'lvl'); hitStop(.05);
  } else { writeSave(); toast('O metal rachou, mas não quebrou', false, 'FALHOU · ' + Math.round(UPCH[u] * 100) + '% DE CHANCE', '#ff8a6a'); sfx('hurt'); }
}
const gambleCost = () => { const nb = ['forest', 'crypt', 'peaks', 'swamp', 'glass'].filter(k => G.save.bosses[k]).length; return Math.round(100 * (1 + nb) * (1 + .4 * (G.save.diff || 0))); };
function gamble(slot) {
  const s = G.save, c = gambleCost(); if (s.gold < c || s.inv.length >= 20) return; spend(c);
  const r = Math.random(), d = s.diff || 0, rar = r < .02 + .006 * d ? 4 : r < .15 ? 3 : r < .45 ? 2 : 1;
  const nb = ['forest', 'crypt', 'peaks', 'swamp', 'glass'].filter(k => s.bosses[k]).length, it = makeItem(slot, Math.min(5, nb + 1) + curDiff().tier * .6, rar);
  const st2 = s.st = s.st || {}; st2.gambles = (st2.gambles || 0) + 1; if (rar === 4) st2.legs = (st2.legs || 0) + 1;
  s.inv.push(it); writeSave(); toast(it.name, rar >= 3, 'DO EMBRULHO · ' + RAR[rar].n.toUpperCase(), RAR[rar].c); sfx(rar === 4 ? 'legend' : rar === 3 ? 'epic' : 'open'); if (rar === 4) hitStop(.08);
}
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
function renderPause() { renderDiff(); $('#sVib').checked = G.settings.vib !== false; $('#sMusic').value = G.settings.music; $('#sPx').value = G.settings.px; $('#sDither').value = G.settings.dither; $('#sOutline').checked = G.settings.outline; $('#sSound').checked = G.settings.sound; }
$('#sPx').oninput = e => { G.settings.px = +e.target.value; saveSettings(); };
$('#sDither').oninput = e => { G.settings.dither = +e.target.value; saveSettings(); };
$('#sOutline').onchange = e => { G.settings.outline = e.target.checked; saveSettings(); };
$('#sDiff').onchange = e => { const v = +e.target.value; if (!G.save || !diffOk(DIFFS[v]) || !(RG && RG.key === 'hub')) { renderDiff(); return; } G.save.diff = v; writeSave(); renderDiff(); updateObjective(); toast('DIFICULDADE: ' + DIFFS[v].n.toUpperCase(), true, DIFFS[v].d, DIFFS[v].c); sfx(v > 0 ? 'epic' : 'open'); };
$('#sSound').onchange = e => { G.settings.sound = e.target.checked; saveSettings(); };
$('#sMusic').oninput = e => { G.settings.music = +e.target.value; if (MUS.master && AC) MUS.master.gain.setTargetAtTime(G.settings.music * .8, AC.currentTime, .1); saveSettings(); };
function saveSettings() { try { localStorage.setItem(SKEY + '-set', JSON.stringify(G.settings)); } catch (e) { } }
try { const s = JSON.parse(localStorage.getItem(SKEY + '-set') || 'null'); if (s) Object.assign(G.settings, s); } catch (e) { }

/* ---- título, criador, história ---- */
function toTitle() {
  G.mode = 'title'; G.rift = null; G.menu = null; setMusic('title'); P = null; boss = null; enemies = []; projs = []; tels = []; pickups = [];
  if (!RG || RG.key !== 'hub') { RG = genRegion('hub'); RG.gateSet = new Set(); if (!WORLDS.hub) WORLDS.hub = buildWorld('hub', RG); WD = WORLDS.hub; }
  inter = []; npcs = []; critters = []; $('#marks').innerHTML = '';
  for (const n of NPCS) { if (n.id === 'desf') continue; const m = makeModel('npc-' + n.id, () => buildHumanoid(n.cfg, 32 + NPCS.indexOf(n) * 8)); npcs.push({ ...n, model: m, anim: newAnim(m), yaw: n.baseYaw || 0, talkT: 0, visible: true }); }
  spawnCritters();
  uploadPalette('hub');
  const sv = readSave(); $('#mContinue').hidden = !sv;
  showOnly('#title'); refreshHudVis();
}
$('#mNew').onclick = () => { sfx('ui'); const n = NET(); if (n) { n.offline = true; n.leaveHub(); } if (G.touch) goLandscape(); openCreator(); };
$('#pFull').onclick = () => { goLandscape(); };
$('#sVib').onchange = e => { G.settings.vib = e.target.checked; saveSettings(); };
$('#mContinue').onclick = () => { sfx('ui'); const n = NET(); if (n) n.offline = true; const sv = readSave(); if (sv) startFromSave(sv); };
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
    if (isSwatch) { b.className = 'sw'; b.style.background = it.color; b.title = it.label; b.setAttribute('aria-label', it.label); }
    else { b.className = 'opt'; b.textContent = it.label; }
    b.setAttribute('aria-pressed', G.char[key] === it.value);
    b.onclick = () => { G.char[key] = it.value; sfx('ui'); [...box.children].forEach(c => c.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); scheduleRebuild(); };
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
  optRow('#cHair', HAIR_STYLES.map(h => ({ label: h[1], value: h[0] })), 'hair');
  optRow('#cHairCol', HAIRS.map((s, i) => ({ color: css(hsl2rgb(s[0], s[1], s[2])), label: 'Cor ' + (i + 1), value: i })), 'hairCol', true);
  optRow('#cOutfit', OUTFITS.map((s, i) => ({ color: css(hsl2rgb(s[0], s[1], s[2])), label: 'Roupa ' + (i + 1), value: i })), 'outfit', true);
  optRow('#cTrim', TRIMS.map((s, i) => ({ color: css(hsl2rgb(s[0], s[1], s[2])), label: 'Detalhe ' + (i + 1), value: i })), 'trim', true);
  optRow('#cGlow', GLOWS.map((g2, i) => ({ color: css(g2[1][2]), label: g2[0], value: i })), 'glow', true);
  optRow('#cAcc', ACCS.map(a => ({ label: a[1], value: a[0] })), 'acc');
  optRow('#cBeard', BEARDS.map(b => ({ label: b[1], value: b[0] })), 'beard');
  $('#cCape').checked = G.char.cape;
}
let rebuildTimer = 0;
function scheduleRebuild() { clearTimeout(rebuildTimer); rebuildTimer = setTimeout(() => { rebuildPlayerModel(); uploadPalette(RG ? RG.key : 'hub'); }, 50); }
function openCreator() {
  G.mode = 'create'; if (!G.char.name) G.char.name = pick(NAMES); G.char.beard = G.char.beard || 'nenhuma';
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
$('#cBack').onclick = () => { sfx('ui'); toTitle(); };
$('#cGo').onclick = () => {
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

