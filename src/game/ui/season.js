/* Fios de Tessária · Temporada: Passe do Tear, missões, entrada diária, loja de cosméticos e os efeitos dos cosméticos */
// As regras (missões do dia, trilhas, catálogo) ficam em shared/season.ts (window.TessSeason), as mesmas do servidor.
// O progresso das missões é contado aqui (no save); o resgate passa pelo servidor, que dá a XP do passe uma vez só.
// Fios Dourados e cosméticos ficam no servidor: o jogo só mostra e usa o que a conta tem.

const TS = window.TessSeason;
let SEAS = null, seTab = 'passe', seBusy = false;   // SEAS: último estado da temporada vindo do servidor

/** Progresso das missões no save (zera no dia novo e na semana nova). */
function missionStore() {
  const s = G.save, now = Date.now(), d = TS.dayIndex(now), w = TS.weekIndex(now);
  s.smis = s.smis || {}; if (s.smis.d !== d) { s.smis.d = d; s.smis.p = {}; } if (s.smis.w !== w) { s.smis.w = w; s.smis.wp = {}; }
  return s.smis;
}
/** Algo aconteceu no jogo (matar, pescar, cozinhar…): conta para as missões de hoje e da semana. */
function missionEvent(kind, n = 1) {
  if (!G.save) return; const m = missionStore(), now = Date.now();
  const all = [...TS.dailyMissions(now).map(x => [x, m.p]), ...TS.weeklyMissions(now).map(x => [x, m.wp])];
  for (const [mi, prog] of all) {
    if (mi.kind !== kind) continue;
    const before = prog[mi.id] || 0; if (before >= mi.n) continue;
    prog[mi.id] = Math.min(mi.n, before + n);
    if (prog[mi.id] >= mi.n) { toast('MISSÃO CONCLUÍDA', false, mi.t.toUpperCase() + ' · RESGATE NO PASSE DO TEAR (TECLA P)', '#ffd27a'); sfx('frag'); seasonDot(true); }
  }
}
const missionProg = mi => { const m = missionStore(); return (mi.id[0] === 'd' ? m.p : m.wp)[mi.id] || 0; };
/** Ponto no botão do passe: há missão concluída para resgatar, nível do passe para pegar ou a entrada do dia. */
function seasonDot(on) { const b = $('#hPass'); if (b) b.classList.toggle('dot', !!on); }
function seasonClaimable() {
  if (!SEAS) return false; const me = SEAS.me, now = Date.now();
  if (!me.loginToday) return true;
  if ([...TS.dailyMissions(now), ...TS.weeklyMissions(now)].some(mi => missionProg(mi) >= mi.n && !me.missions.includes(mi.id))) return true;
  for (let l = 1; l <= me.level; l++) { if (TS.PASS_FREE[l] && !me.free.includes(l)) return true; if (me.premium && TS.PASS_PREM[l] && !me.prem.includes(l)) return true; }
  return false;
}
/** Lê a temporada do servidor (ao entrar online e ao abrir a tela). */
async function seasonRefresh() { const n = NETON(); if (!n) return null; const v = await n.season(); if (v) { SEAS = v; G.cosOwned = v.me.owned; seasonDot(seasonClaimable()); } return v; }

function rewardTxt(r) {
  if (!r) return '';
  if (r.dourados) return r.dourados + ' Fios Dourados'; if (r.centelhas) return r.centelhas + ' Centelhas'; if (r.fios) return r.fios + ' Fios do Tear';
  const c = TS.cosById(r.cos); return c ? c.n + ' (' + TS.COS_SLOT_N[c.slot].toLowerCase() + ')' : r.cos;
}
const RARC = ['#d8d2c4', '#5aa2ff', '#c07bff', '#ffbf3d'];
/** Aplica no save local o que o servidor deu (Centelhas e Fios do Tear) para não divergir da nuvem. */
function applyReward(r) { const s = G.save; if (r.centelhas) s.gold += r.centelhas; if (r.fios) s.fios = (s.fios || 0) + r.fios; writeSave(); }
async function seasonOp(fn, after) {
  if (seBusy) return; seBusy = true;
  const r = await fn(); seBusy = false;
  if (!r.ok) { toast('Não deu certo', false, String(r.error).toUpperCase()); sfx('ui'); }
  else { if (r.data && r.data.view) { SEAS = r.data.view; G.cosOwned = SEAS.me.owned; } if (after) after(r.data || {}); sfx('pick'); }
  seasonDot(seasonClaimable()); renderSeason();
}
function openSeason(tab) {
  const n = NETON(); if (!n) { toast('O Passe do Tear é online', false, 'ENTRE COM SUA CONTA PARA MISSÕES, PASSE E LOJA'); return; }
  if (tab) seTab = tab; openMenu('season'); seasonRefresh().then(() => { if (G.menu === 'season') renderSeason(); });
}
function renderSeason() {
  const list = $('#seList'); if (!list) return; list.innerHTML = '';
  document.querySelectorAll('#season .ftabs button').forEach(b => { b.classList.toggle('on', b.dataset.st === seTab); b.onclick = () => { seTab = b.dataset.st; sfx('ui'); renderSeason(); }; });
  if (!SEAS) { $('#seSub').textContent = 'Carregando a temporada…'; return; }
  const n = NETON(), me = SEAS.me, S = SEAS.season, now = Date.now(), daysLeft = Math.max(0, Math.ceil((SEAS.endsAt - now) / 864e5));
  const row = (html, btns, cls) => { const r = document.createElement('div'); r.className = 'shoprow' + (cls ? ' ' + cls : ''); r.innerHTML = html; for (const b of btns || []) r.appendChild(b); list.appendChild(r); return r; };
  const btn = (txt, on, fn, gold) => { const b = document.createElement('button'); b.className = 'px' + (gold && on ? ' gold' : ''); b.textContent = txt; b.disabled = !on; b.onclick = fn; return b; };
  const lvXp = me.xp - me.level * S.xpPerLevel, pct = me.level >= S.levels ? 100 : Math.round(lvXp / S.xpPerLevel * 100);
  $('#seHead').innerHTML = `<b style="color:var(--gold)">${S.n}</b> · termina em ${daysLeft} dias<br>Passe nível <b>${me.level}</b>/${S.levels}${me.premium ? ' · <b style="color:#c07bff">PREMIUM</b>' : ''} · <b style="color:#ffd27a">${me.dourados}</b> Fios Dourados<div class="fbar"><i style="width:${pct}%"></i></div>`;
  if (seTab === 'passe') {
    $('#seSub').innerHTML = 'Suba de nível com as missões. A trilha grátis dá recompensa a cada 2 níveis (inclusive Fios Dourados); a premium dá em todos os níveis e os cosméticos da temporada. <b>Nada aqui dá poder</b>: só estilo.';
    if (!me.premium) row(`<div class="nm"><b style="color:#c07bff">Passe Premium</b><small>Recompensa em todos os ${S.levels} níveis, 8 cosméticos da temporada e 660 Fios Dourados de volta</small></div>`, [btn(S.premiumPrice + ' Fios Dourados', me.dourados >= S.premiumPrice, () => seasonOp(() => n.seasonPremium(), () => toast('PASSE PREMIUM', true, 'AS RECOMPENSAS PREMIUM ESTÃO LIBERADAS', '#c07bff')), true)]);
    for (let l = 1; l <= S.levels; l++) {
      const f = TS.PASS_FREE[l], p = TS.PASS_PREM[l], got = l <= me.level;
      const fb = f ? (me.free.includes(l) ? btn('✓', false) : btn('Pegar', got, () => seasonOp(() => n.seasonClaim(l, 'free'), d => { if (d.reward) { applyReward(d.reward); toast('NÍVEL ' + l, false, rewardTxt(d.reward).toUpperCase(), '#ffd27a'); } }), true)) : null;
      const pb = p ? (me.prem.includes(l) ? btn('✓', false) : btn(me.premium ? 'Pegar' : '🔒', got && me.premium, () => seasonOp(() => n.seasonClaim(l, 'prem'), d => { if (d.reward) { applyReward(d.reward); toast('NÍVEL ' + l + ' · PREMIUM', false, rewardTxt(d.reward).toUpperCase(), '#c07bff'); } }), true)) : null;
      const r = row(`<div class="nm"><b style="color:${got ? 'var(--gold)' : 'var(--dim)'}">Nível ${l}</b><small>${f ? 'Grátis: ' + rewardTxt(f) : 'Grátis: —'}<br><span style="color:#c07bff">Premium: ${rewardTxt(p)}</span></small></div>`, [fb, pb].filter(Boolean), 'pass' + (got ? '' : ' locked'));
      if (l === me.level + 1) r.id = 'seNext';
    }
  } else if (seTab === 'missoes') {
    $('#seSub').textContent = 'Três missões por dia e três por semana, iguais para todos. Cumpra jogando e resgate aqui para ganhar XP do passe.';
    const block = (title, arr) => { row(`<div class="nm"><b>${title}</b></div>`); for (const mi of arr) { const pr = missionProg(mi), done = me.missions.includes(mi.id), ok = pr >= mi.n; row(`<div class="nm">${mi.t}<small>${done ? 'resgatada' : pr + '/' + mi.n} · ${mi.xp} XP do passe</small><div class="fbar"><i style="width:${Math.round(pr / mi.n * 100)}%"></i></div></div>`, [btn(done ? '✓' : 'Resgatar', ok && !done, () => seasonOp(() => n.seasonMission(mi.id), d => toast('+' + (d.xp || mi.xp) + ' XP DO PASSE', false, mi.t.toUpperCase(), '#ffd27a')), true)]); } };
    block('Missões de hoje', TS.dailyMissions(now)); block('Missões da semana', TS.weeklyMissions(now));
  } else if (seTab === 'loja') {
    const own = new Set(me.owned);
    $('#seSub').innerHTML = 'Vitrine da semana (troca toda segunda). Cosméticos só mudam o visual. Os de conquista (como o título de Campeão do Torneio) nunca são vendidos.';
    for (const id of SEAS.shop) { const c = TS.cosById(id); if (!c) continue; row(`<div class="nm"><b style="color:${RARC[c.rar]}">${c.n}</b><small>${TS.COS_SLOT_N[c.slot]} · ${['comum', 'raro', 'épico', 'lendário'][c.rar]}</small></div>`, [btn('Prévia', true, () => cosPreview(id)), own.has(id) ? btn('Seu', false) : btn(c.price + ' ✧', me.dourados >= c.price, () => seasonOp(() => n.shopBuy(id), () => toast(c.n.toUpperCase(), true, 'VISTA NO GUARDA-ROUPA DA SUA CASA', RARC[c.rar])), true)]); }
    row('<div class="nm"><b>Fios Dourados</b><small>' + (SEAS.payments === 'dev' ? 'Modo de desenvolvimento: os pacotes são creditados sem pagamento.' : 'Compras com dinheiro real chegam em breve (Pix, cartão e Google Play). Por enquanto, ganhe Fios Dourados no Passe e na entrada diária.') + '</small></div>');
    for (const p of SEAS.packs) row(`<div class="nm">${p.n} Fios Dourados<small>R$ ${p.brl.toFixed(2).replace('.', ',')}</small></div>`, [btn(SEAS.payments === 'dev' ? 'Creditar' : 'Em breve', SEAS.payments === 'dev', () => seasonOp(() => n.buyDourados(p.id), () => toast('+' + p.n + ' FIOS DOURADOS', false, 'MODO DE DESENVOLVIMENTO', '#ffd27a')))]);
  } else {
    $('#seSub').textContent = 'Entre todo dia: a recompensa cresce até o 7º dia seguido (que dá Fios Dourados). Faltou um dia, recomeça.';
    const streak = me.streak || 0, today = me.loginToday, next = today ? streak : (me.lastDay === TS.dayIndex(now) - 1 ? streak + 1 : 1);
    TS.LOGIN_REWARDS.forEach((r, i) => { const day = i + 1, cur = ((next - 1) % 7) + 1, done = today ? day <= ((streak - 1) % 7) + 1 : day < cur; row(`<div class="nm"><b style="color:${day === cur && !today ? 'var(--gold)' : 'inherit'}">Dia ${day}</b><small>${rewardTxt(r)}</small></div>`, [btn(done ? '✓' : day === cur && !today ? 'Receber' : '—', day === cur && !today, () => seasonOp(() => n.loginClaim(), d => { if (d.reward) { applyReward(d.reward); toast('ENTRADA DO DIA ' + (((d.streak - 1) % 7) + 1), true, rewardTxt(d.reward).toUpperCase(), '#ffd27a'); } }), true)]); });
  }
}

/* ---- efeitos dos cosméticos ---- */
/** Rastro de esquiva (o seu e o dos outros jogadores). */
function trailFx(x, z, id, t) {
  const c = id && TS.cosById(id); if (!c || c.slot !== 'trail') return; const f = c.fx, y0 = groundAt(x, z);
  for (let k = 0; k < 3; k++) {
    const o = { x: x + rr(-.25, .25), y: y0 + rr(.1, 1.2), z: z + rr(-.25, .25), life: rr(.4, .8), s0: .1, s1: .02, b0: 1, b1: .1, mat: f.mat };
    if (f.kind === 'petala' || f.kind === 'folha') Object.assign(o, { vx: rr(-.6, .6), vy: rr(.2, .6), vz: rr(-.6, .6), s0: .09, s1: .07, b1: .4, drag: 1 });
    else if (f.kind === 'brasa') Object.assign(o, { vy: rr(.6, 1.4), s0: .08 });
    else if (f.kind === 'gelo' || f.kind === 'vidro') Object.assign(o, { vy: rr(-.4, .2), s0: .07, s1: .03, buoy: -3, floor: true });
    else if (f.kind === 'sombra') Object.assign(o, { y: y0 + rr(0, .3), vy: rr(.3, .7), s0: .14, b0: Math.random() < .4 ? .3 : 1, mat: Math.random() < .4 ? 29 : f.mat });
    else if (f.kind === 'estrela') Object.assign(o, { y: y0 + rr(.3, 1.6), s0: .06, s1: .01, life: rr(.6, 1.1), mat: Math.random() < .3 ? 14 : f.mat });
    else if (f.kind === 'fios') Object.assign(o, { y: y0 + .2 + k * .4, s0: .05, s1: .05, life: .5 });
    spawn(o);
  }
}
/** Cor do nome (CSS), com a "aurora" animada. */
function nameColorCss(id) { const c = id && TS.cosById(id); if (!c || c.slot !== 'namecolor') return ''; return c.fx.c === 'aurora' ? 'aurora' : c.fx.c; }
const cosTitle = id => { const c = id && TS.cosById(id); return c && c.slot === 'title' ? c.n : ''; };

/* ---- prévia na loja: o herói gira no pedestal com o cosmético em loop ---- */
function cosPreview(id) {
  const c = TS.cosById(id); if (!c) return;
  G.cosPreview = id; $('#season').classList.add('previewing'); sfx('ui');
  const nm = G.char.name || 'Tecelão', nc = c.slot === 'namecolor' ? nameColorCss(id) : nameColorCss(G.char.namecolor), fr = c.slot === 'frame' ? c.fx.css : frameCss(G.char.frame), ti = c.slot === 'title' ? c.n : cosTitle(G.char.ctitle);
  $('#sePrev').innerHTML = `<div class="tag rp prevtag ${fr}"><span class="rn ${nc === 'aurora' ? 'aurora' : ''}" style="${nc && nc !== 'aurora' ? 'color:' + nc : ''}">${nm}</span><small class="rt">${ti}</small></div><p class="sub"><b style="color:${RARC[c.rar]}">${c.n}</b> · ${TS.COS_SLOT_N[c.slot]}${c.price ? ' · ' + c.price + ' ✧' : ''}</p>`;
  $('#sePrev').hidden = false; $('#sePrevBack').hidden = false;
}
function cosPreviewEnd() { G.cosPreview = null; $('#season').classList.remove('previewing'); $('#sePrev').hidden = true; $('#sePrevBack').hidden = true; }
/** O efeito do cosmético em prévia, repetindo (rastro numa esquiva de mentira, teleporte e morte a cada 2,5 s). */
function cosPreviewFx(t) {
  const c = TS.cosById(G.cosPreview); if (!c) return; const ph = t % 2.5, k = Math.floor(t / 2.5), fire = k !== G.cosPrevK; G.cosPrevK = k;   // dispara uma vez a cada 2,5 s, em qualquer taxa de quadros
  if (c.slot === 'trail' && ph < .6) trailFx(Math.sin(t * 6) * .5, 0, c.id, t);
  else if (c.slot === 'tele' && fire) teleFx(0, 0, c.id);
  else if (c.slot === 'death' && fire) deathFx(0, 0, c.id);
}
/** Efeito de teleporte (ao chegar). */
function teleFx(x, z, id) {
  const c = id && TS.cosById(id); if (!c || c.slot !== 'tele') return; const f = c.fx, y0 = groundAt(x, z);
  for (let i = 0; i < 60; i++) {
    const a = i / 60 * 6.283, o = { x: x + Math.cos(a) * .7, y: y0 + .05, z: z + Math.sin(a) * .7, life: rr(.6, 1.1), s0: .12, s1: .02, b0: 1, b1: .1, mat: f.mat };
    if (f.kind === 'coluna') Object.assign(o, { x: x + Math.cos(a) * .35, z: z + Math.sin(a) * .35, vy: rr(3, 6) });
    else if (f.kind === 'fios') Object.assign(o, { vx: -Math.sin(a) * 2, vz: Math.cos(a) * 2, vy: rr(1.5, 3), s0: .06 });
    else if (f.kind === 'folhas') Object.assign(o, { vx: -Math.sin(a) * 3, vz: Math.cos(a) * 3, vy: rr(.5, 2.5), s0: .1, s1: .08, mat: i % 3 ? 10 : 13, drag: 1.5 });
    else if (f.kind === 'vazio') Object.assign(o, { x: x + Math.cos(a) * 1.4, z: z + Math.sin(a) * 1.4, vx: -Math.cos(a) * 2.5, vz: -Math.sin(a) * 2.5, vy: rr(0, 1.5), mat: i % 4 ? 151 : 29 });
    spawn(o);
  }
}
/** Efeito de morte (ao cair). */
function deathFx(x, z, id) {
  const c = id && TS.cosById(id); if (!c || c.slot !== 'death') return; const f = c.fx, y0 = groundAt(x, z);
  for (let i = 0; i < 70; i++) {
    const o = { x: x + rr(-.35, .35), y: y0 + rr(.2, 1.8), z: z + rr(-.35, .35), vx: rr(-1.5, 1.5), vy: rr(.3, 2.5), vz: rr(-1.5, 1.5), life: rr(.8, 1.6), s0: .1, s1: .04, b0: 1, b1: .2, mat: f.mat, drag: 1 };
    if (f.kind === 'vidro') Object.assign(o, { vy: rr(1, 4), buoy: -6, floor: true, s0: .08, mat: i % 3 ? 28 : 150 });
    if (f.kind === 'brasas') Object.assign(o, { vy: rr(.8, 2), mat: i % 3 ? 21 : 29, s0: .09 });
    spawn(o);
  }
}
/** Classe CSS da moldura do nome. */
function frameCss(id) { const c = id && TS.cosById(id); return c && c.slot === 'frame' ? c.fx.css : ''; }
