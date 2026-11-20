// Pesqueiro: peixes, iscas, varas, nível de Pescador e o mercado de peixes.
//
// Usado pelo jogo (window.TessFish, ponte em src/items-bridge.ts) e pelo servidor
// (mercado compartilhado: quanto mais gente vende o mesmo peixe, mais ele barateia).

export interface FishSpecies {
  id: string; n: string; c: string;
  /** Preço base (Centelhas) e XP de Pescador. */
  g: number; fx: number;
  /** Peso: quantos puxões a luta pede (1 a 4) e a vara mínima (rodLv) para não arrebentar. */
  w: number; rod: number;
  /** Nível de Pescador mínimo para aparecer. */
  lv: number;
  /** Onde aparece: lago (Bairro Leste), rio (píeres) e remanso (o poço fundo do rio). */
  at: Array<'lago' | 'rio' | 'remanso'>;
  /** Chance relativa (antes de iscas e nível). */
  p: number;
  /** Raro: entra no bônus das iscas e do nível. */
  rare?: number;
  /** Peixe da noite: chance multiplicada à noite (e dividida de dia). */
  night?: number;
}

export const FISH: FishSpecies[] = [
  { id: 'lambari', n: 'Lambari', c: '#d8d2c4', g: 6, fx: 2, w: 1, rod: 0, lv: 1, at: ['lago', 'rio'], p: 50 },
  { id: 'tilapia', n: 'Tilápia-de-Brasa', c: '#6fd36a', g: 15, fx: 4, w: 1, rod: 0, lv: 1, at: ['lago'], p: 26 },
  { id: 'truta', n: 'Truta-Prateada', c: '#bfe3ff', g: 22, fx: 5, w: 2, rod: 0, lv: 1, at: ['rio'], p: 26 },
  { id: 'bagre', n: 'Bagre-Velho', c: '#8a7a5a', g: 34, fx: 7, w: 2, rod: 1, lv: 3, at: ['rio', 'remanso'], p: 16 },
  { id: 'carpa', n: 'Carpa Dourada', c: '#ffbf3d', g: 45, fx: 9, w: 2, rod: 0, lv: 1, at: ['lago', 'remanso'], p: 9, rare: 1 },
  { id: 'dourado', n: 'Dourado-do-Rio', c: '#ffd27a', g: 70, fx: 14, w: 3, rod: 1, lv: 5, at: ['rio'], p: 6, rare: 1 },
  { id: 'enguia', n: 'Enguia-de-Fio', c: '#9cf6ff', g: 95, fx: 18, w: 2, rod: 2, lv: 8, at: ['remanso'], p: 5, rare: 2, night: 4 },
  { id: 'salmao', n: 'Salmão-Brasa', c: '#ff8a5a', g: 120, fx: 22, w: 3, rod: 2, lv: 10, at: ['rio', 'remanso'], p: 3, rare: 2 },
  { id: 'lua', n: 'Peixe-Lua', c: '#c07bff', g: 160, fx: 30, w: 2, rod: 0, lv: 1, at: ['lago'], p: .9, rare: 3, night: 4 },
  { id: 'rei', n: 'Rei-do-Rio', c: '#ff5a7a', g: 600, fx: 90, w: 4, rod: 3, lv: 15, at: ['remanso'], p: .35, rare: 4, night: 2 },
];
export const fishById = (id: string) => FISH.find(f => f.id === id);

/** Iscas: compradas em pacotes; cada lançamento gasta uma. */
export interface Bait { id: string; n: string; desc: string; pack: number; price: number; rare: number; bite: number; lv: number }
export const BAITS: Bait[] = [
  { id: 'minhoca', n: 'Minhoca', desc: 'Morde mais rápido; um pouco mais de peixe bom', pack: 10, price: 40, rare: 1.35, bite: .8, lv: 1 },
  { id: 'grilo', n: 'Grilo-de-Brasa', desc: 'Atrai os peixes grandes do rio', pack: 10, price: 140, rare: 2, bite: .75, lv: 4 },
  { id: 'fio', n: 'Isca de Fio', desc: 'Brilha na água: os raros vêm atrás', pack: 5, price: 320, rare: 3.4, bite: .65, lv: 9 },
];
export const baitById = (id: string) => BAITS.find(b => b.id === id);

/** Varas: aguentam peixes mais pesados e dão mais tempo para puxar. */
export const RODS = [
  { n: 'Vara de Bambu', price: 0, win: 0 },
  { n: 'Vara Reforçada', price: 600, win: .1 },
  { n: 'Vara de Carvalho', price: 1800, win: .2 },
  { n: 'Vara de Brasa', price: 4500, win: .3 },
  { n: 'Vara do Tear', price: 11000, win: .4 },
];

/** Nível de Pescador pela XP de pesca (1 a 30). */
export const FISHER_MAX = 30;
export const fisherLevel = (fxp: number) => Math.min(FISHER_MAX, 1 + Math.floor(Math.sqrt(Math.max(0, fxp) / 12)));
export const fisherXpFor = (lv: number) => (lv - 1) ** 2 * 12;

/** Pontos de pesca e o tipo de água de cada um. */
export type Water = 'lago' | 'rio' | 'remanso';

/** Sorteia o peixe de um lançamento. */
/** night: 0 a 1 (quão noite está): os peixes da noite aparecem muito mais. */
export function rollFish(water: Water, fisherLv: number, baitId: string | null, rng: () => number = Math.random, night = 0): FishSpecies {
  const b = baitId ? baitById(baitId) : null, rareMul = (b ? b.rare : 1) * (1 + fisherLv * .03);
  const pool = FISH.filter(f => f.at.includes(water) && fisherLv >= f.lv && !(f.id === 'rei' && (!b || b.id !== 'fio')));
  const wt = pool.map(f => f.p * (f.rare ? rareMul ** Math.min(2, f.rare * .6) : 1) * (f.night ? (night > .5 ? f.night : 1 / f.night) : 1));
  let r = rng() * wt.reduce((a, x) => a + x, 0);
  for (let i = 0; i < pool.length; i++) { if (r < wt[i]) return pool[i]; r -= wt[i]; }
  return pool[0];
}

// ---------- Mercado de peixes ----------
// Cada espécie tem uma "pressão de oferta": vender soma, e ela cai pela metade a cada MARKET_HALF_MS.
// O preço sai da pressão (até 35% do valor quando o mercado está inundado) e de uma tendência da hora,
// igual para todos (sobe e desce entre 80% e 125%).
export const MARKET_HALF_MS = 40 * 60_000;
export const MARKET_K = 30;   // com 30 peixes vendidos de uma vez o preço cai ~41%
export interface MarketState { [id: string]: { s: number; t: number } }

const hash = (n: number) => { let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
/** Tendência da hora para uma espécie (0,8 a 1,25), a mesma em todo aparelho e no servidor. */
export function trend(id: string, hour: number) {
  let k = 0; for (let i = 0; i < id.length; i++) k = (k * 31 + id.charCodeAt(i)) | 0;
  const a = hash(k + hour * 7919), b = hash(k + (hour - 1) * 7919);   // suaviza com a hora anterior
  return .8 + .45 * (a * .65 + b * .35);
}
export const marketHour = (now: number) => Math.floor(now / 3_600_000);
/** Pressão atual (com o decaimento até agora). */
export function pressure(st: MarketState, id: string, now: number) { const e = st[id]; if (!e) return 0; return e.s * Math.pow(.5, Math.max(0, now - e.t) / MARKET_HALF_MS); }
/** Preço de um peixe agora. */
export function fishPrice(st: MarketState, id: string, now: number) {
  const f = fishById(id); if (!f) return 0;
  const p = pressure(st, id, now);
  return Math.max(1, Math.round(f.g * (.35 + .65 * Math.exp(-p / MARKET_K)) * trend(id, marketHour(now))));
}
/** Vende n peixes um a um (o preço cai a cada um). Muda o estado e devolve o total. */
export function sellFish(st: MarketState, id: string, n: number, now: number) {
  let total = 0;
  for (let i = 0; i < n; i++) { total += fishPrice(st, id, now); st[id] = { s: pressure(st, id, now) + 1, t: now }; }
  return total;
}
/** Quanto o preço variou em relação à hora anterior (sem a pressão): para as setas ▲▼. */
export function fishTrendDelta(id: string, now: number) { const h = marketHour(now); return trend(id, h) / trend(id, h - 1) - 1; }

// ---------- peso e torneio semanal de pesca ----------
/** Faixa de peso (kg) de cada peixe. Os grandes são raros (curva puxada para baixo). */
export const FISH_KG: Record<string, [number, number]> = { lambari: [.05, .25], tilapia: [.3, 1.2], truta: [.4, 2.2], bagre: [1, 6], carpa: [.8, 4], dourado: [2, 9], enguia: [.6, 3], salmao: [2, 8], lua: [.5, 2.5], rei: [15, 40] };
export function fishKg(id: string, rng: () => number = Math.random) { const r = FISH_KG[id] ?? [.1, 1]; return Math.round((r[0] + (r[1] - r[0]) * Math.pow(rng(), 1.8)) * 100) / 100; }
/** Pontos de torneio de uma pesca: peso relativo à faixa da espécie, valendo mais nos raros. */
export function fishPoints(id: string, kg: number) {
  const f = fishById(id), r = FISH_KG[id]; if (!f || !r) return 0;
  const rel = Math.max(0, Math.min(1, (kg - r[0]) / (r[1] - r[0])));
  return Math.round((5 + 20 * rel) * (1 + (f.rare ?? 0) * 1.5));
}
/** Semanas do torneio: começam toda segunda-feira, 00:00 UTC. */
export const TOURNEY_EPOCH = Date.UTC(2026, 0, 5);
export const WEEK_MS = 7 * 864e5;
export const tourneyWeek = (now: number) => Math.floor((now - TOURNEY_EPOCH) / WEEK_MS);
export const tourneyEnds = (week: number) => TOURNEY_EPOCH + (week + 1) * WEEK_MS;
/** Prêmio em Centelhas para os 10 primeiros da semana que passou (resgatado na banca do Pesqueiro). */
export const TOURNEY_PRIZES = [6000, 4000, 2500, 1500, 1200, 1000, 800, 600, 500, 400];
