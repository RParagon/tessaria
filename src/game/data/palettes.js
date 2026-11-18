/* Fios de Tessária · Paletas por região */
/* =========================================================
   PALETAS
   ========================================================= */
function hsl2rgb(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
const lerpHue = (a, b, t) => { const d = ((b - a + 540) % 360) - 180; return a + d * t; };
function rp(h, s, l, shift = 1) {
  const o = [];
  for (let i = 0; i < 5; i++) {
    const t = i / 4, L = clamp(l + (t - .55) * .64, .04, .96);
    const hh = t < .55 ? lerpHue(h, 250, (.55 - t) * .55 * shift) : lerpHue(h, 55, (t - .55) * .5 * shift);
    o.push(hsl2rgb(hh, clamp(s * (1 - Math.abs(t - .5) * .45), 0, 1), L));
  }
  return o;
}
const hx = a => a.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const hex1 = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;
const FIRE = hx(['#2a0c10', '#8f1d17', '#e2541c', '#ffb02e', '#fff3c4']);
const VIOLET = hx(['#160826', '#511a86', '#a03ee0', '#de8cff', '#fbeaff']);
const GHOST = hx(['#05200c', '#0e6a2c', '#2ed15a', '#a2ff8c', '#f3ffe2']);
const GOLDS = hx(['#2c1606', '#8a4a10', '#e09a2a', '#ffd866', '#fff8dc']);
const CYANE = hx(['#04202a', '#0a6b80', '#20c4d8', '#9cf6ff', '#f0ffff']);
const REDGEM = hx(['#2e0610', '#8a0f24', '#e0263f', '#ff8a8a', '#fff0f0']);
const TOXIC = hx(['#0f2a06', '#3f8a14', '#8fdc2e', '#d6ff86', '#f8ffe4']);
const EYEY = hx(['#3a1a00', '#b05a00', '#ffa800', '#ffe34d', '#fffbe0']);
const SPARK = hx(['#2a1a05', '#9a6a10', '#ffc83d', '#fff08a', '#ffffff']);
const HEAL = hx(['#06202a', '#0d6b6b', '#2fd1b0', '#a8ffe6', '#f2fffb']);

const SKINS = [[28, .45, .8], [26, .45, .68], [22, .42, .56], [20, .4, .44], [18, .36, .32], [205, .2, .72], [135, .25, .5]];
const HAIRS = [[250, .12, .16], [25, .45, .3], [44, .6, .6], [12, .68, .44], [220, .06, .86], [210, .6, .5], [330, .55, .62], [150, .45, .42]];
const OUTFITS = [[355, .55, .42], [22, .6, .45], [45, .6, .5], [95, .4, .38], [150, .4, .36], [185, .45, .4], [215, .5, .42], [255, .4, .4], [285, .4, .4], [320, .45, .45], [30, .12, .42], [240, .1, .22]];
const TRIMS = [[44, .7, .55], [220, .08, .75], [28, .45, .36], [250, .15, .15], [40, .15, .88], [350, .6, .45]];
const GLOWS = [['Âmbar', EYEY], ['Ciano', CYANE], ['Violeta', VIOLET], ['Verde', GHOST], ['Rubi', REDGEM]];
const HAIR_STYLES = [['curto', 'Curto'], ['longo', 'Longo'], ['rabo', 'Rabo'], ['coque', 'Coque'], ['moicano', 'Moicano'], ['careca', 'Raspado']];
const ACCS = [['nenhum', 'Nenhum'], ['capuz', 'Capuz'], ['chapeu', 'Chapéu'], ['pena', 'Chapéu de pena'], ['elmo', 'Elmo'], ['bandana', 'Bandana'], ['chifres', 'Chifres'], ['coroa', 'Coroa de folhas'], ['cachecol', 'Cachecol'], ['tapa', 'Tapa-olho']];
const BEARDS = [['nenhuma', 'Liso'], ['barba', 'Barba'], ['bigode', 'Bigode'], ['cavanhaque', 'Cavanhaque']];
const BODIES = [['Esguio'], ['Médio'], ['Robusto']];
function charRows(c) {
  const sk = SKINS[c.skin], hr = HAIRS[c.hairCol], of = OUTFITS[c.outfit], tr = TRIMS[c.trim], gl2 = GLOWS[c.glow][1];
  return [rp(sk[0], sk[1], sk[2], .5), rp(hr[0], hr[1], hr[2], .7), rp(of[0], of[1], of[2]), rp(tr[0], tr[1], tr[2], .7), rp(215, .1, .62, .5), rp(28, .4, .33), gl2, gl2];
}
const REGPAL = {
  hub: { bg: ['#0b0a16', '#1d1832', '#43293f'], outline: '#06050b', star: '#ffe9c9', rows: {
    8: rp(95, .42, .4), 9: rp(35, .28, .55, .6), 10: rp(85, .5, .5), 11: rp(32, .12, .58, .5), 12: rp(25, .45, .34), 13: rp(125, .45, .32), 14: GOLDS, 15: rp(195, .55, .48),
    16: rp(350, .65, .55), 17: rp(48, .75, .6), 18: rp(200, .45, .45), 19: rp(30, .35, .45), 20: EYEY, 21: FIRE, 22: rp(8, .5, .38), 23: rp(210, .35, .36), 24: rp(40, .28, .8, .5), 25: rp(14, .32, .64, .5), 26: GHOST, 27: FIRE, 28: rp(45, .2, .85), 29: rp(250, .3, .12) } },
  forest: { bg: ['#040b0a', '#0b1d18', '#17372b'], outline: '#020605', star: '#e4ffe8', rows: {
    8: rp(118, .35, .3), 9: rp(32, .35, .36), 10: rp(100, .5, .42), 11: rp(150, .08, .42), 12: rp(25, .35, .28), 13: rp(135, .5, .3), 14: CYANE, 15: rp(190, .5, .4),
    16: rp(120, .55, .5), 17: rp(140, .5, .3), 18: rp(170, .45, .62), 19: rp(200, .4, .4), 20: EYEY, 21: GHOST, 22: rp(80, .12, .45), 23: rp(110, .45, .4), 24: rp(140, .3, .12), 25: rp(160, .4, .7), 26: GHOST, 27: GHOST, 28: rp(45, .2, .85), 29: rp(150, .3, .1) } },
  crypt: { bg: ['#05040a', '#100b1c', '#22163a'], outline: '#030207', star: '#ece2ff', rows: {
    8: rp(250, .12, .36), 9: rp(250, .2, .16), 10: rp(170, .2, .24), 11: rp(255, .1, .44), 12: rp(20, .3, .3), 13: rp(260, .08, .7), 14: GOLDS, 15: rp(230, .4, .25),
    16: rp(44, .28, .72, .7), 17: rp(38, .2, .5, .7), 18: rp(270, .25, .25), 19: rp(300, .35, .3), 20: GHOST, 21: VIOLET, 22: rp(44, .3, .72, .7), 23: rp(38, .22, .58, .7), 24: rp(262, .3, .14), 25: rp(43, .78, .55), 26: GHOST, 27: GHOST, 28: rp(48, .25, .86, .5), 29: rp(270, .3, .1) } },
  peaks: { bg: ['#0a0406', '#200a0c', '#4a1612'], outline: '#060203', star: '#ffe0c8', rows: {
    8: rp(10, .12, .25), 9: rp(20, .1, .42), 10: rp(50, .5, .45), 11: rp(5, .15, .32), 12: rp(15, .2, .18), 13: rp(270, .2, .22), 14: FIRE, 15: FIRE,
    16: rp(0, .6, .42), 17: rp(40, .2, .2), 18: rp(350, .3, .22), 19: rp(20, .4, .3), 20: EYEY, 21: FIRE, 22: rp(356, .62, .42), 23: rp(36, .62, .6), 24: rp(338, .5, .3), 25: rp(42, .25, .76, .6), 26: EYEY, 27: FIRE, 28: rp(45, .2, .86, .5), 29: rp(350, .45, .2) } },
};


const KNIGHT_CFG = { seed: 90, body: 2, hair: 'careca', hairCol: 0, skin: 5, outfit: 11, trim: 1, glow: 2, acc: 'elmo', cape: true, cls: 'lamina', armor: 4, charm: 3, beard: 'nenhuma' };
const XROWS = (() => {
  const r = {}, kc = charRows(KNIGHT_CFG); for (let i = 0; i < 8; i++) r[128 + i] = kc[i];
  Object.assign(r, { 136: rp(275, .3, .2), 137: rp(330, .45, .38), 138: rp(270, .2, .15), 139: rp(45, .15, .82, .5), 140: rp(275, .3, .2), 141: rp(275, .3, .2), 142: REDGEM, 143: hx(['#20203a', '#6a6aa0', '#c8c8f0', '#f0f0ff', '#ffffff']),
    144: rp(10, .25, .75, .5), 145: rp(340, .5, .2), 146: rp(190, .5, .6), 147: rp(300, .35, .3), 148: rp(300, .35, .3), 149: rp(300, .35, .3), 150: CYANE, 151: VIOLET });
  return r;
})();
REGPAL.home = { bg: ['#0a0608', '#1a0f10', '#2c1a16'], outline: '#050304', star: '#ffe2b8', rows: {
  8: rp(30, .42, .38), 9: rp(24, .4, .22), 10: rp(35, .5, .45), 11: rp(35, .18, .64), 12: rp(22, .45, .27), 13: rp(110, .38, .36), 14: FIRE, 15: rp(200, .4, .5),
  16: rp(350, .55, .45), 17: rp(45, .65, .55), 18: rp(210, .4, .45), 19: rp(30, .32, .56), 20: EYEY, 21: FIRE, 22: rp(5, .5, .38), 23: rp(40, .22, .76), 24: rp(20, .35, .2), 25: rp(42, .55, .55), 26: GOLDS, 27: CYANE, 28: rp(40, .15, .86), 29: rp(20, .3, .07) } };
REGPAL.wilds = { bg: ['#0c0a18', '#24203c', '#4a3550'], outline: '#06050b', star: '#ffe9c9', rows: {
  8: rp(95, .42, .38), 9: rp(32, .3, .4), 10: rp(80, .5, .46), 11: rp(30, .1, .5), 12: rp(25, .42, .3), 13: rp(125, .42, .3), 14: GOLDS, 15: rp(195, .55, .45),
  16: rp(25, .42, .38), 17: rp(38, .35, .72), 18: rp(220, .08, .55), 19: rp(20, .3, .2), 20: EYEY, 21: FIRE, 22: rp(140, .35, .24), 23: rp(35, .42, .42), 24: rp(260, .06, .3), 25: rp(48, .45, .6), 26: GHOST, 27: FIRE, 28: rp(40, .2, .82), 29: rp(270, .2, .1),
  // biomas dos Ermos (WREMAP em core/state.js): teia, lodo, pedra de túmulo, cinza, rocha queimada, capim morto; 158-159 brilham
  152: rp(250, .12, .82, .5), 153: rp(88, .22, .19), 154: rp(225, .12, .48, .6), 155: rp(20, .06, .4, .5), 156: rp(12, .35, .26), 157: rp(268, .16, .27, .6), 158: FIRE, 159: GHOST } };
REGPAL.swamp = { bg: ['#030806', '#0b1913', '#1f2e22'], outline: '#020403', star: '#d8ffe0', rows: {
  8: rp(55, .2, .19), 9: rp(30, .24, .15), 10: rp(92, .3, .23), 11: rp(80, .1, .27), 12: rp(28, .2, .18), 13: rp(100, .3, .2), 14: TOXIC, 15: rp(165, .35, .22),
  16: rp(100, .45, .36), 17: rp(55, .45, .58), 18: rp(170, .18, .5), 19: rp(140, .3, .24), 20: EYEY, 21: TOXIC, 22: rp(115, .35, .3), 23: rp(70, .35, .5), 24: rp(95, .3, .14), 25: rp(345, .5, .55), 26: TOXIC, 27: TOXIC, 28: rp(50, .2, .82), 29: rp(120, .3, .07) } };
REGPAL.glass = { bg: ['#05050e', '#121833', '#2c3a6a'], outline: '#03030a', star: '#e8f4ff', rows: {
  8: rp(215, .22, .52), 9: rp(228, .22, .3), 10: rp(195, .32, .6), 11: rp(230, .18, .4), 12: rp(240, .15, .24), 13: rp(200, .42, .66), 14: CYANE, 15: rp(250, .4, .1),
  16: rp(210, .14, .76), 17: rp(222, .28, .4), 18: rp(262, .28, .3), 19: rp(45, .6, .58), 20: CYANE, 21: VIOLET, 22: rp(220, .3, .5), 23: rp(200, .3, .7), 24: rp(240, .3, .2), 25: rp(45, .6, .6), 26: CYANE, 27: VIOLET, 28: rp(210, .15, .88), 29: rp(240, .3, .08) } };
REGPAL.hubDay = { ...REGPAL.hub, bg: ['#3d63a8', '#e8a070', '#ffe2a8'], outline: '#1a1020', star: '#ffe2a8' };
