/* Fios de Tessária · Itens, raridades e lendários */
/* =========================================================
   ITENS
   ========================================================= */
const RAR = [
  { n: 'Comum', c: '#d8d2c4', row: 120, m: 1, price: 30, aff: 0, ramp: hx(['#26242c', '#6b6676', '#b8b2c6', '#ece6f4', '#ffffff']) },
  { n: 'Incomum', c: '#6fd36a', row: 121, m: 1.3, price: 60, aff: 1, ramp: hx(['#0b2410', '#1f7a2c', '#4fd35a', '#b4ff9e', '#f2ffe8']) },
  { n: 'Raro', c: '#5aa2ff', row: 122, m: 1.65, price: 110, aff: 1.5, ramp: hx(['#081a36', '#1d4fa6', '#4a94ff', '#aed2ff', '#f0f7ff']) },
  { n: 'Épico', c: '#c07bff', row: 123, m: 2.1, price: 200, aff: 2, ramp: VIOLET },
  { n: 'Lendário', c: '#ffbf3d', row: 124, m: 2.7, price: 350, aff: 3, ramp: GOLDS },
];
const METAL = [rp(215, .1, .62, .5), rp(140, .3, .58, .5), rp(215, .55, .6, .5), rp(275, .45, .6, .5), rp(45, .78, .6, .5)];
const SLOTN = { weapon: 'Arma', armor: 'Armadura', charm: 'Amuleto' };
const WNAMES = { lamina: ['Espada', 'Gládio', 'Montante', 'Sabre'], arcano: ['Cajado', 'Varinha', 'Cetro', 'Bastão'], arco: ['Arco curto', 'Arco longo', 'Arco recurvo', 'Arco de caça'] };
const ANAMES = ['Túnica', 'Cota', 'Manto', 'Couraça', 'Gibão'];
const CNAMES = ['Amuleto', 'Anel', 'Relíquia', 'Talismã', 'Broche'];
const SUFX = { 1: ['de Musgo', 'Sussurrante', 'de Raiz', 'do Bosque'], 2: ['de Osso', 'Real', 'Fúnebre', 'do Ossuário'], 3: ['de Brasa', 'Cinzento', 'Escaldante', 'dos Picos'], 4: ['do Lodo', 'Afogado', 'de Junco', 'do Pântano'], 5: ['de Vidro', 'Espelhado', 'Prismático', 'da Cidadela'] };
const LEG = { weapon: { lamina: 'Lâmina do Sol Partido', arcano: 'Cajado da Última Brasa', arco: 'Arco das Mil Agulhas' }, armor: 'Couraça do Guardião', charm: 'Maçã de Âmbar' };
const STAT_FMT = { dmg: v => `+${v}% de dano`, hp: v => `+${v} de vida`, crit: v => `+${v}% de crítico`, spd: v => `+${v}% de velocidade`, cdr: v => `-${v}% na recarga da habilidade`, ls: v => `${v}% do dano vira vida`, dr: v => `-${v}% de dano recebido`, gold: v => `+${v}% de Centelhas` };
const STAT_LBL = { dmg: 'dano', hp: 'vida', crit: 'crítico', spd: 'velocidade', cdr: 'recarga', ls: 'vampirismo', dr: 'defesa', gold: 'Centelhas' };
const AFF_BASE = { crit: 3, spd: 4, cdr: 5, ls: 1.5, dr: 4, gold: 10, hp: 12 };
function makeItem(slot, tier, rar, starter) {
  const R = RAR[rar], k = R.m * (.7 + tier * .35), it = { id: Math.random().toString(36).slice(2, 9), slot, rar, tier, st: {}, cls: G.char.cls };
  if (slot === 'weapon') it.st.dmg = Math.round(7 * k + rr(0, 3));
  if (slot === 'armor') it.st.hp = Math.round(12 * k + rr(0, 5));
  const pool = slot === 'weapon' ? ['crit', 'ls', 'cdr', 'spd'] : slot === 'armor' ? ['dr', 'spd', 'hp', 'gold'] : ['crit', 'cdr', 'ls', 'gold', 'spd', 'dr'];
  let n = Math.floor(R.aff) + (Math.random() < R.aff % 1 ? 1 : 0); if (slot === 'charm') n = Math.max(1, n + 1);
  if (starter) n = 0;
  const pl = pool.slice().sort(() => Math.random() - .5).slice(0, Math.min(n, pool.length));
  for (const a of pl) it.st[a] = (it.st[a] || 0) + Math.max(1, Math.round(AFF_BASE[a] * (.6 + .4 * R.m) * (.8 + .25 * tier) * rr(.8, 1.2)));
  if (starter) it.name = { lamina: 'Espada de treino', arcano: 'Cajado de treino', arco: 'Arco de treino' }[it.cls];
  else if (rar === 4) { const L2 = slot === 'weapon' ? LEGS.weapon[it.cls] : pick(LEGS[slot]); it.name = L2[0]; it.power = L2[1]; }
  else it.name = pick(slot === 'weapon' ? WNAMES[it.cls] : slot === 'armor' ? ANAMES : CNAMES) + ' ' + pick(SUFX[clamp(Math.round(tier), 1, 5)]);
  return it;
}
function rollRar(min = 0) { const r = Math.pow(Math.random(), 1 / (G.save ? curDiff().find : 1)), v = r < .55 ? 0 : r < .82 ? 1 : r < .95 ? 2 : r < .99 ? 3 : 4; return Math.max(min, v); }
function itemScore(it) { const w = { dmg: 1.5, hp: .4, crit: 2, spd: 1.5, cdr: 1.2, ls: 3, dr: 2.5, gold: .3 }; let s = 0; for (const k in it.st) s += (w[k] || 1) * it.st[k]; return Math.round(s); }
const itemIcon = it => it.slot === 'weapon' ? CLSICON[it.cls || G.char.cls] : it.slot;
const itemPrice = it => Math.round(RAR[it.rar].price * (.6 + .4 * it.tier));
const scrapVal = it => Math.max(3, Math.round(itemPrice(it) * .3));
const POWERS = {
  sol: 'Golpes críticos explodem em chamas ao redor do alvo.',
  ultbrasa: 'Projéteis se dividem em três ao acertar.',
  agulhas: 'A cada 5 disparos, solta um leque extra de flechas.',
  guardiao: 'Ao levar dano, 25% de chance de criar um escudo de musgo que absorve 30 de dano.',
  desfiado: 'A esquiva deixa um nó de fios que explode logo depois.',
  maca: 'Poções curam toda a vida.',
  coroa: 'Cada inimigo derrotado cura 3% da vida.',
};
const LEGS = { weapon: { lamina: ['Lâmina do Sol Partido', 'sol'], arcano: ['Cajado da Última Brasa', 'ultbrasa'], arco: ['Arco das Mil Agulhas', 'agulhas'] }, armor: [['Couraça do Guardião', 'guardiao'], ['Manto do Desfiado', 'desfiado']], charm: [['Maçã de Âmbar', 'maca'], ['Coroa de Morgrave', 'coroa']] };
const affPool = slot => slot === 'weapon' ? ['crit', 'ls', 'cdr', 'spd'] : slot === 'armor' ? ['dr', 'spd', 'hp', 'gold'] : ['crit', 'cdr', 'ls', 'gold', 'spd', 'dr'];
function hasPow(id) { const eq = G.save && G.save.eq; if (!eq) return false; for (const k in eq) if (eq[k] && eq[k].power === id) return true; return false; }

