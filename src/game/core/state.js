/* Fios de Tessária · Estado do jogo, save e atributos */
/* =========================================================
   ESTADO DO JOGO
   ========================================================= */
const NAMES = ['Aren', 'Lume', 'Sael', 'Kai', 'Nyx', 'Ravi', 'Íris', 'Tavi', 'Odé', 'Lis', 'Rune', 'Sol'];
const G = {
  mode: 'boot', char: { name: 'Lume', cls: 'lamina', body: 1, skin: 2, hair: 'rabo', hairCol: 1, outfit: 0, trim: 0, glow: 0, acc: 'nenhum', cape: true, beard: 'nenhuma' }, zones: [], later: [], menu: null, rift: null, buffs: {}, streak: { n: 0, t: 0 },
  save: null, time: 0, settings: { px: innerWidth < 760 ? 3 : 4, dither: 1, outline: true, sound: true, music: .5 }, touch: matchMedia('(pointer: coarse)').matches,
};
let RG = null, WD = null, P = null, boss = null;
const WORLDS = {};
let enemies = [], projs = [], tels = [], pickups = [], inter = [], npcs = [], critters = [];
const parts = [];
const PMAX = 9000, DYN_MAX = 13000;
const pData = new Float32Array(DYN_MAX * STRIDE);
const dynVAO = makeVAO(null, DYN_MAX);
let dynN = 0;
function newSave() {
  return { v: 1, char: { ...G.char }, lvl: 1, xp: 0, gold: 0, potions: 3, up: { pow: 0, vig: 0, agi: 0, foc: 0, pot: 0 }, frags: [], chests: [], bosses: {}, met: {}, region: 'hub', cp: null, time: 0, deaths: 0, kills: 0, endings: [], inv: [], eq: { weapon: makeItem('weapon', 1, 0, true) }, shop: null, talents: [], pgp: {}, perks: {}, q: {}, contracts: null, riftMax: 0, rune: 0, fios: 0, riftBest: {} };
}
const SKEY = 'fios-de-tessaria-v1';
function writeSave() { try { G.save.char = { ...G.char }; localStorage.setItem(SKEY, JSON.stringify(G.save)); } catch (e) { } netSaveChanged(); }
function readSave() { try { const s = localStorage.getItem(SKEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
// ---------- Fio de Elo e dificuldade do grupo (docs/ONLINE.md) ----------
// ELO é preenchido pelo co-op ao entrar numa instância do grupo: { diff, ref (nível do líder), kind }.
let ELO = null;
/** Nível que vale para vida e dano: na Fenda do grupo, quem está muito abaixo sobe (líder − 3) e quem está muito acima desce (líder + 5). */
const eloLvl = s => { if (!ELO || ELO.kind !== 'rift' || !ELO.ref) return s.lvl; return s.lvl < ELO.ref - 3 ? ELO.ref - 3 : s.lvl > ELO.ref + 5 ? ELO.ref + 5 : s.lvl; };
/** Limitado pelo Fio de Elo (mais forte que o grupo): ganha o bônus de mentor. */
const eloMentor = () => !!(ELO && ELO.kind === 'rift' && ELO.ref && G.save && G.save.lvl > ELO.ref + 5);
/** Teto de nível de item do equipamento de quem está limitado: nível de item da Fenda + 8. */
const eloCap = () => eloMentor() ? regionTier() + 8 : 0;
function eqSum(s, cap = 0) {
  const o = { dmg: 0, hp: 0, crit: 0, spd: 0, cdr: 0, ls: 0, dr: 0, gold: 0 }; const eq = s.eq || {};
  for (const k in eq) { const it = eq[k]; if (!it) continue; const f = cap && it.tier > cap ? (.7 + cap * .35) / (.7 + it.tier * .35) : 1; for (const st in it.st) o[st] = (o[st] || 0) + it.st[st] * f; }
  return o;
}
let stats = function () {
  const s = G.save || newSave(), c = CLS[G.char.cls], e = eqSum(s, eloCap()), lv = eloLvl(s), tal = new Set(s.talents || []), pg = s.pgp || {}, pk = s.perks || {};
  return {
    maxHp: Math.round(c.hp + 18 * s.up.vig + 10 * (lv - 1) + e.hp + (pg.hp || 0) * 5 + (pk.mel ? 20 : 0)),
    dmg: c.dmg * (1 + .15 * s.up.pow) * (1 + .07 * (lv - 1)) * (1 + e.dmg / 100) * (1 + (pg.dmg || 0) / 100) * (pk.lio ? 1.1 : 1),
    spd: c.spd * (1 + .05 * s.up.agi) * (1 + Math.min(40, e.spd) / 100) * (tal.has('vento') ? 1.08 : 1),
    dashCd: .9 * (1 - .1 * s.up.agi) * (tal.has('vento') ? .7 : 1),
    skillCd: c.skillCd * (1 - .1 * s.up.foc) * (1 - Math.min(50, e.cdr + (pg.cdr || 0)) / 100) * (tal.has('brasa') ? .8 : 1),
    atkCd: c.atkCd * (tal.has('mao') ? .88 : 1), maxPot: 3 + s.up.pot,
    crit: .08 + Math.min(52, e.crit + (pg.crit || 0) * .5) / 100 + (tal.has('olho') ? .08 : 0), critMul: tal.has('olho') ? 2.5 : 2,
    ls: e.ls / 100 + (tal.has('sangue') ? .03 : 0), dr: Math.min(.7, Math.min(60, e.dr) / 100 + (tal.has('casca') ? .1 : 0)),
    gold: (1 + e.gold / 100) * (tal.has('sorte') ? 1.25 : 1), itemFind: tal.has('sorte') ? 1.3 : 1, potHeal: pk.mel ? .55 : .45, tal,
  };
};
const bless = k => (G.buffs[k] || 0) > 0;
const HOUSE_COST = 1500;
const HOUSE_F = [
  { id: 'cama', n: 'Cama de Dossel', d: 'Dormir enche a vida e as poções e dá Bem Descansado: +15% de XP por 10 minutos.', c: 600 },
  { id: 'lareira', n: 'Lareira de Pedra', d: '+5% de Centelhas em tudo, para sempre.', c: 1200 },
  { id: 'jardim', n: 'Jardim de Ervas', d: '+1 poção máxima.', c: 2000 },
  { id: 'estante', n: 'Estante de Troféus', d: 'Mostra cada guardião vencido. +2% de dano por guardião da história vencido.', c: 2500 },
  { id: 'bancada', n: 'Bancada de Tecelão', d: 'Aprimorar e reforjar na Bruma ficam 30% mais baratos.', c: 3500 },
  { id: 'mapa', n: 'Mapa de Tessária', d: '+10% de chance de encontrar itens.', c: 4500 },
  { id: 'altar', n: 'Altar do Tear', d: 'Fendas dão +25% de Fios do Tear.', c: 6000 },
  { id: 'estatua', n: 'Estátua Dourada do Tecelão', d: 'Uma estátua sua em ouro. Não dá bônus. Só mostra quem manda.', c: 25000 },
];
const STASH_UP = [800, 2000, 4500, 9000, 18000];
const UPCH = [1, 1, 1, 1, 1, .9, .75, .6, .45, .3];
const H = () => { const s = G.save; s.house = s.house || { owned: false, f: {}, stash: [], cap: 20, seen: [] }; s.house.seen = s.house.seen || []; return s.house; };
const gsave = () => G.save;
const hasF = id => !!(G.save && G.save.house && G.save.house.owned && G.save.house.f[id]);
function spend(n) { G.save.gold -= n; G.save.spent = (G.save.spent || 0) + n; }
const stats0 = stats;
stats = function () {
  const st = stats0();
  if (bless('furia')) st.dmg *= 1.5;
  if (bless('rapidez')) { st.spd *= 1.3; st.atkCd *= .75; }
  if (bless('fortuna')) { st.gold *= 2; st.itemFind *= 1.5; }
  if (bless('protecao')) st.dr = Math.min(.8, st.dr + .4);
  if (G.rift && G.rift.aff && G.rift.aff.includes('dourada')) st.gold *= 2;
  if (G.save) { const D = curDiff(); st.gold *= D.gold; st.itemFind *= D.find; }
  if (eloMentor()) { st.gold *= 1.25; st.itemFind *= 1.1; }   // bônus de mentor
  if (hasF('lareira')) st.gold *= 1.05; if (hasF('mapa')) st.itemFind *= 1.1; if (hasF('jardim')) st.maxPot += 1;
  if (hasF('estante')) st.dmg *= 1 + .02 * ['forest', 'crypt', 'peaks', 'swamp', 'glass'].filter(k => G.save.bosses[k]).length;
  return st;
};
const xpNeed = l => Math.round(30 * Math.pow(l, 1.5));
/* ---- dificuldade (estilo Diablo) ---- */
const DIFFS = [
  { n: 'Normal', hp: 1, dmg: 1, xp: 1, gold: 1, find: 1, spd: 1, lvl: 1, tier: 0, c: '#d8d2c4', d: 'A jornada como foi tecida.' },
  { n: 'Difícil', hp: 1.5, dmg: 1.25, xp: 1.25, gold: 1.25, find: 1.12, spd: 1.06, lvl: 1, tier: .3, c: '#6fd36a', d: 'Inimigos mais duros e ágeis. Mais XP, Centelhas e itens.' },
  { n: 'Expert', hp: 2.2, dmg: 1.55, xp: 1.6, gold: 1.6, find: 1.28, spd: 1.12, lvl: 6, tier: .65, c: '#5aa2ff', d: 'Para quem já domina a esquiva. Itens bem melhores.' },
  { n: 'Mestre', hp: 3.2, dmg: 1.9, xp: 2, gold: 2, find: 1.45, spd: 1.18, lvl: 12, tier: 1, c: '#c07bff', d: 'Cada elite é uma luta. Épicos e lendários aparecem com frequência.' },
  { n: 'Tormento I', hp: 4.6, dmg: 2.3, xp: 2.6, gold: 2.5, find: 1.65, spd: 1.22, lvl: 16, act2: true, tier: 1.5, c: '#ffbf3d', d: 'O Tear cobra caro. Lendários de verdade.' },
  { n: 'Tormento II', hp: 6.5, dmg: 2.8, xp: 3.3, gold: 3, find: 1.85, spd: 1.27, lvl: 20, act2: true, tier: 2, c: '#ff8a3d', d: 'Só para Tecelões com o equipamento certo.' },
  { n: 'Tormento III', hp: 9, dmg: 3.4, xp: 4.2, gold: 3.6, find: 2.1, spd: 1.32, lvl: 24, act2: true, tier: 2.5, c: '#ff4a4a', d: 'O limite do Tear. Boa sorte.' },
];
// ---------- Ermos: biomas ----------
// O mapa é dividido em anéis (distância da vila) e, nos anéis do meio, em setores (direção). As bordas são
// deformadas por ruído. lv: nível dos monstros; pool: monstros dos acampamentos; lair: Alfa com nome no covil;
// style: forma base da paisagem (0 campina, 1 mata, 2 colinas, 3 ermo); cave: base da caverna (região de Fenda).
const WZ = [
  { n: 'Campina Brasa', lv: 2, c: '#9bd36a', style: 0, pool: ['javali', 'gosmo', 'javali', 'lobo'], lair: ['javali', 'Javali-Rei'], cave: null },
  { n: 'Mata dos Uivos', lv: 8, c: '#5fbf8a', style: 1, pool: ['lobo', 'lobo', 'javali', 'urso', 'wisp'], lair: ['lobo', 'Uivo Velho'], cave: 'forest' },
  { n: 'Teia Funda', lv: 12, c: '#c9c2e6', style: 1, pool: ['aranha', 'aranha', 'aranha', 'wisp', 'bat'], lair: ['aranha', 'Rainha da Teia'], cave: 'forest' },
  { n: 'Brejo Cinzento', lv: 15, c: '#7f9f72', style: 1, pool: ['sapo', 'afogado', 'gosmo', 'sapo'], lair: ['sapo', 'Rei-Sapo'], cave: 'swamp' },
  { n: 'Colinas Partidas', lv: 17, c: '#e0a85a', style: 2, pool: ['urso', 'beetle', 'imp', 'lobo'], lair: ['beetle', 'Besouro Couraça'], cave: 'peaks' },
  { n: 'Cemitério Esquecido', lv: 20, c: '#9aa0cc', style: 1, pool: ['skel', 'skel', 'bat', 'fantasma', 'afogado'], lair: ['fantasma', 'O Lamento'], cave: 'crypt' },
  { n: 'Planalto de Cinzas', lv: 24, c: '#ff7a4a', style: 2, pool: ['imp', 'imp', 'beetle', 'bat'], lair: ['imp', 'Tirano de Cinzas'], cave: 'peaks' },
  { n: 'Ermo Profundo', lv: 28, c: '#ff5a7a', style: 3, pool: ['urso', 'beetle', 'imp', 'skel', 'aranha', 'fantasma'], lair: ['urso', 'Urso Antigo'], cave: 'glass' },
];
const WPOOL = WZ.map(b => b.pool);
const WC = { x: 150, y: 130 };
const TYPELV = { gosmo: 1, wisp: 1, javali: 1, lobo: 2, aranha: 1, thief: 1, skel: 4, bat: 4, urso: 5, imp: 8, beetle: 8, sapo: 13, afogado: 13, sentinela: 16, fantasma: 16 };
const wDist = (tx, ty) => Math.hypot(tx - WC.x, (ty - WC.y) * 1.15) + (vnoise(tx * .035 + 3, ty * .035 + 7) - .5) * 16;
/** Anel: 0 em volta da vila, 3 na borda. Decide densidade de paredes e quantos monstros por acampamento. */
const wRing = (tx, ty) => { const d = wDist(tx, ty); return d < 26 ? 0 : d < 60 ? 1 : d < 96 ? 2 : 3; };
/** Bioma (índice em WZ) de um ponto em ladrilhos. */
const wZone = (tx, ty) => {
  const r = wRing(tx, ty); if (r === 0) return 0; if (r === 3) return 7;
  const a = ((Math.atan2(ty - WC.y, tx - WC.x) * 57.2958 + (vnoise(tx * .03 + 50, ty * .03 + 11) - .5) * 50) % 360 + 360) % 360;
  if (r === 1) return a >= 180 && a < 300 ? 1 : (a >= 300 || a < 60) ? 2 : 3;   // oeste/norte · nordeste/leste · sul
  return (a >= 280 || a < 40) ? 4 : a >= 160 ? 5 : 6;                            // norte/leste · oeste · sul
};
/** Troca de cores por bioma (material → material). Linhas 152-159 só existem na paleta dos Ermos. */
const WREMAP = [null, null,
  { 8: 157, 10: 24, 13: 29, 22: 157, 9: 24, 12: 29, 23: 157, 25: 24 },           // Teia Funda: chão violeta-escuro, copas quase pretas (as teias, claras, se destacam)
  { 8: 153, 10: 22, 13: 22, 9: 153, 12: 19, 23: 153, 25: 22 },                    // Brejo: lodo escuro, copas verde-musgo
  null,
  { 8: 154, 10: 24, 13: 24, 22: 154, 9: 154, 12: 29 },           // Cemitério: pedra azulada, árvores mortas
  { 8: 155, 9: 155, 10: 156, 11: 156, 23: 155, 25: 156, 21: 158 },// Planalto: cinza, rocha queimada, brasas
  null];
const wildLv = (x, z) => WZ[wZone(x / T, z / T)].lv;
const REGBASE = { hub: 1, forest: 1, crypt: 4, peaks: 8, swamp: 13, glass: 16 };
const curDiff = () => DIFFS[ELO && Number.isInteger(ELO.diff) ? ELO.diff : (G.save && G.save.diff) || 0] || DIFFS[0];   // na instância do grupo vale a dificuldade do grupo
const diffOk = d => !!G.save && G.save.lvl >= d.lvl && (!d.act2 || !!G.save.bosses.glass);
const monLevel = () => { if (!G.save) return 1; if (RG && RG.wild && P) return wildLv(P.x, P.z); if (G.rift) return (ELO && ELO.ref ? ELO.ref : G.save.lvl) + G.rift.L; return Math.max(REGBASE[RG ? RG.key : 'hub'] || 1, G.save.lvl); };
function monsterScale() {
  const D = curDiff();
  if (RG && RG.wild) { const zl = P ? wildLv(P.x, P.z) : 2; return { hp: D.hp * (1 + .1 * (zl - 1)), dmg: D.dmg * (1 + .06 * (zl - 1)), xp: D.xp * (1 + .08 * (zl - 1)) * (G.bloodT > 0 ? 1.5 : 1) }; }   // Lua de Sangue: +50% de XP
  if (G.rift) return { hp: G.rift.hm * D.hp, dmg: G.rift.dm * D.dmg, xp: D.xp };
  const base = REGBASE[RG ? RG.key : 'hub'] || 1, over = Math.max(0, (G.save ? G.save.lvl : 1) - base - 2), n = G.save && G.save.diff ? 1 : .6;
  return { hp: D.hp * (1 + .08 * n * over), dmg: D.dmg * (1 + .05 * n * over), xp: D.xp * (1 + .05 * over) };
}
function updateDiffHud() {
  const el = $('#hDiff'); if (!el || !G.save) return; const D = curDiff();
  const txt = D.n.toUpperCase() + (RG && RG.key !== 'hub' && RG.key !== 'home' ? ' · MONSTROS NV ' + monLevel() : '');
  if (el.textContent !== txt) el.textContent = txt; el.style.color = RG && RG.wild && monLevel() > G.save.lvl + 3 ? '#ff6a5a' : D.c;
}
function renderDiff() {
  const sel = $('#sDiff'); if (!sel || !G.save) return; const cur = G.save.diff || 0, can = RG && RG.key === 'hub' && !boss;
  sel.innerHTML = DIFFS.map((d, i) => `<option value="${i}"${diffOk(d) ? '' : ' disabled'}${i === cur ? ' selected' : ''}>${d.n}${diffOk(d) ? '' : ' — ' + (d.act2 && !G.save.bosses.glass ? 'conclua o Ato II' : 'nível ' + d.lvl)}</option>`).join('');
  sel.disabled = !can;
  const D = DIFFS[cur];
  $('#dInfo').innerHTML = `<b style="color:${D.c}">${D.n}</b> · ${D.d}<br>Vida dos inimigos ×${D.hp} · dano ×${D.dmg} · XP ×${D.xp} · Centelhas ×${D.gold}${cur ? `<br>Cair custa ${Math.round(Math.min(.2, .04 * cur) * 100)}% das Centelhas.` : ''}<br>Monstros sobem de nível junto com você.${can ? '' : '<br><i>Só dá para mudar na Vila Brasa.</i>'}`;
}
function diffFirst(key, b) {
  const s = G.save, D = s.diff || 0, bd = s.bossDiff = s.bossDiff || {};
  if (bd[key] !== undefined && bd[key] >= D) return; bd[key] = D;
  if (D > 0) { dropItem(b.x, b.z - 1.5, 3); if (Math.random() < .3 + .1 * D) dropItem(b.x + 2, b.z - 1.5, 4); s.fios = (s.fios || 0) + 3 * D; setTimeout(() => toast('PRIMEIRA VITÓRIA: ' + DIFFS[D].n.toUpperCase(), true, `bônus épico · +${3 * D} Fios do Tear`, DIFFS[D].c), 1800); }
}

