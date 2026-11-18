// Itens: o gerador e as regras, num lugar só, usados pelo jogo (via window.TessItems,
// ver src/items-bridge.ts) e pelo servidor (validação do save e loot da Fenda do grupo).
// O teste "itens gerados pelo jogo passam pelas regras do servidor" confere os dois lados.

export type Slot = 'weapon' | 'armor' | 'charm';
export type Stat = 'dmg' | 'hp' | 'crit' | 'spd' | 'cdr' | 'ls' | 'dr' | 'gold';
export interface Item {
  id: string; slot: Slot; rar: number; tier: number; st: Partial<Record<Stat, number>>;
  name: string; cls?: string; power?: string; up?: number;
}

export const RAR_M = [1, 1.3, 1.65, 2.1, 2.7];
export const AFF_BASE: Record<string, number> = { crit: 3, spd: 4, cdr: 5, ls: 1.5, dr: 4, gold: 10, hp: 12 };
export const PRIMARY: Partial<Record<Slot, Stat>> = { weapon: 'dmg', armor: 'hp' };
export const AFF_POOL: Record<Slot, Stat[]> = { weapon: ['crit', 'ls', 'cdr', 'spd'], armor: ['dr', 'spd', 'hp', 'gold'], charm: ['crit', 'cdr', 'ls', 'gold', 'spd', 'dr'] };
export const POWERS_BY_SLOT: Record<Slot, string[]> = { weapon: ['sol', 'ultbrasa', 'agulhas'], armor: ['guardiao', 'desfiado'], charm: ['maca', 'coroa'] };
export const CLASSES = ['lamina', 'arcano', 'arco'];
export const MAX_UP = 10;

const upBound = (v: number, up: number) => v * Math.pow(1.08, up) + up + 1;

/** Maior valor possível de um atributo para este item (com folga para arredondamentos e reforjas). */
export function statCap(it: Pick<Item, 'slot' | 'rar' | 'tier' | 'up'>, stat: Stat): number {
  const m = RAR_M[it.rar] ?? 1, tier = it.tier, up = it.up ?? 0, k = m * (.7 + tier * .35);
  let cap = 0;
  if (stat === PRIMARY[it.slot]) cap += stat === 'dmg' ? 7 * k + 3 : 12 * k + 5;
  const base = AFF_BASE[stat];
  if (base) cap += Math.max(1, base * (.6 + .4 * m) * (.8 + .25 * tier) * 1.25) * 2;
  return upBound(cap, up);
}

/** Lista de problemas do item (vazia se for válido). `maxTier` vem do progresso do jogador. */
export function itemProblems(it: unknown, maxTier = 40): string[] {
  const p: string[] = [];
  if (!it || typeof it !== 'object') return ['item não é objeto'];
  const x = it as Record<string, unknown>;
  if (typeof x.id !== 'string' || !x.id || x.id.length > 24) p.push('id inválido');
  if (!['weapon', 'armor', 'charm'].includes(x.slot as string)) { p.push('slot inválido'); return p; }
  const slot = x.slot as Slot;
  if (!Number.isInteger(x.rar) || (x.rar as number) < 0 || (x.rar as number) > 4) p.push('raridade inválida');
  if (typeof x.tier !== 'number' || !Number.isFinite(x.tier) || x.tier < 0.5 || x.tier > maxTier) p.push(`nível de item fora do alcance (${x.tier})`);
  const up = x.up === undefined ? 0 : x.up;
  if (!Number.isInteger(up) || (up as number) < 0 || (up as number) > MAX_UP) p.push('aprimoramento inválido');
  if (typeof x.name !== 'string' || !x.name || x.name.length > 60) p.push('nome inválido');
  if (x.cls !== undefined && !CLASSES.includes(x.cls as string)) p.push('classe inválida');
  if (x.power !== undefined) {
    if (x.rar !== 4) p.push('poder em item que não é lendário');
    if (!POWERS_BY_SLOT[slot].includes(x.power as string)) p.push('poder desconhecido');
  }
  const st = x.st;
  if (!st || typeof st !== 'object' || Array.isArray(st)) { p.push('atributos inválidos'); return p; }
  const allowed = new Set<string>([...(PRIMARY[slot] ? [PRIMARY[slot] as string] : []), ...AFF_POOL[slot]]);
  const keys = Object.keys(st);
  if (keys.length > 8) p.push('atributos demais');
  if (p.length) return p;
  for (const k of keys) {
    const v = (st as Record<string, unknown>)[k];
    if (!allowed.has(k)) { p.push(`atributo ${k} não existe em ${slot}`); continue; }
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) { p.push(`valor inválido em ${k}`); continue; }
    const cap = statCap({ slot, rar: x.rar as number, tier: x.tier as number, up: up as number }, k as Stat);
    if (v > cap) p.push(`${k}=${v} acima do máximo ${cap.toFixed(1)}`);
  }
  return p;
}

// ---------- gerador ----------
export type Rng = () => number;
export const SLOTS: Slot[] = ['weapon', 'armor', 'charm'];
export const RAR_AFF = [0, 1, 1.5, 2, 3];               // afixos por raridade (parte fracionária = chance de mais um)
export const WNAMES: Record<string, string[]> = { lamina: ['Espada', 'Gládio', 'Montante', 'Sabre'], arcano: ['Cajado', 'Varinha', 'Cetro', 'Bastão'], arco: ['Arco curto', 'Arco longo', 'Arco recurvo', 'Arco de caça'] };
export const ANAMES = ['Túnica', 'Cota', 'Manto', 'Couraça', 'Gibão'];
export const CNAMES = ['Amuleto', 'Anel', 'Relíquia', 'Talismã', 'Broche'];
export const SUFX: Record<number, string[]> = { 1: ['de Musgo', 'Sussurrante', 'de Raiz', 'do Bosque'], 2: ['de Osso', 'Real', 'Fúnebre', 'do Ossuário'], 3: ['de Brasa', 'Cinzento', 'Escaldante', 'dos Picos'], 4: ['do Lodo', 'Afogado', 'de Junco', 'do Pântano'], 5: ['de Vidro', 'Espelhado', 'Prismático', 'da Cidadela'] };
export const LEGS: { weapon: Record<string, [string, string]>; armor: Array<[string, string]>; charm: Array<[string, string]> } = {
  weapon: { lamina: ['Lâmina do Sol Partido', 'sol'], arcano: ['Cajado da Última Brasa', 'ultbrasa'], arco: ['Arco das Mil Agulhas', 'agulhas'] },
  armor: [['Couraça do Guardião', 'guardiao'], ['Manto do Desfiado', 'desfiado']],
  charm: [['Maçã de Âmbar', 'maca'], ['Coroa de Morgrave', 'coroa']],
};
export const STARTER_NAME: Record<string, string> = { lamina: 'Espada de treino', arcano: 'Cajado de treino', arco: 'Arco de treino' };
export const affPool = (slot: Slot) => AFF_POOL[slot];
const pickR = <T>(rng: Rng, a: T[]): T => a[Math.floor(rng() * a.length)];
const clampN = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const newId = (rng: Rng) => rng().toString(36).slice(2, 9).padEnd(7, '0');

/** Gera um item. O mesmo código no jogo e no servidor. */
export function makeItem(slot: Slot, tier: number, rar: number, cls: string, rng: Rng = Math.random, starter = false, id?: string): Item {
  const m = RAR_M[rar] ?? 1, k = m * (.7 + tier * .35);
  const it: Item = { id: id ?? newId(rng), slot, rar, tier, st: {}, cls, name: '' };
  if (slot === 'weapon') it.st.dmg = Math.round(7 * k + rng() * 3);
  if (slot === 'armor') it.st.hp = Math.round(12 * k + rng() * 5);
  const pool = AFF_POOL[slot], af = RAR_AFF[rar] ?? 0;
  let n = Math.floor(af) + (rng() < af % 1 ? 1 : 0); if (slot === 'charm') n = Math.max(1, n + 1);
  if (starter) n = 0;
  const pl = pool.slice().sort(() => rng() - .5).slice(0, Math.min(n, pool.length));
  for (const a of pl) it.st[a] = (it.st[a] || 0) + Math.max(1, Math.round(AFF_BASE[a] * (.6 + .4 * m) * (.8 + .25 * tier) * (.8 + rng() * .4)));
  if (starter) it.name = STARTER_NAME[cls] ?? 'Arma de treino';
  else if (rar === 4) { const L2 = slot === 'weapon' ? LEGS.weapon[cls] ?? LEGS.weapon.lamina : pickR(rng, LEGS[slot]); it.name = L2[0]; it.power = L2[1]; }
  else it.name = pickR(rng, slot === 'weapon' ? WNAMES[cls] ?? WNAMES.lamina : slot === 'armor' ? ANAMES : CNAMES) + ' ' + pickR(rng, SUFX[clampN(Math.round(tier), 1, 5)]);
  return it;
}
/** Raridade sorteada; `find` é a sorte (dificuldade, talentos). */
export function rollRar(rng: Rng = Math.random, find = 1, min = 0): number {
  const r = Math.pow(rng(), 1 / find), v = r < .55 ? 0 : r < .82 ? 1 : r < .95 ? 2 : r < .99 ? 3 : 4;
  return Math.max(min, v);
}

// ---------- loot de um monstro na Fenda (servidor, Fenda do grupo) ----------
// Mesmas contas do jogo: regionTier (core/projectiles.js), DIFFS (core/state.js), hurtEnemy e onEnemyKilled.
export const REGION_TIER: Record<string, number> = { hub: 1, forest: 1, crypt: 2, peaks: 3, swamp: 4, glass: 5 };
export const REGBASE: Record<string, number> = { hub: 1, forest: 1, crypt: 4, peaks: 8, swamp: 13, glass: 16 };
export const DIFF_TIER = [0, .3, .65, 1, 1.5, 2, 2.5];
export const DIFF_FIND = [1, 1.12, 1.28, 1.45, 1.65, 1.85, 2.1];
/** Nível de item de um drop na Fenda, para este jogador. */
export function riftTier(base: string, L: number, diff: number, lvl: number): number {
  return (REGION_TIER[base] ?? 1) + L * .5 + (DIFF_TIER[diff] ?? 0) + Math.max(0, lvl - (REGBASE[base] ?? 1) - 2) * .05;
}
export interface DropContext { base: string; L: number; diff: number; lvl: number; cls: string; sorte: boolean; tier?: number }
/** Níveis dos biomas dos Ermos (WZ em src/game/core/state.js). */
export const BIOME_LV = [2, 8, 12, 15, 17, 20, 24, 28];
/** Nível de item de um drop nos Ermos (regionTier + wildTierBase no jogo). */
export function wildsTier(biome: number, diff: number, lvl: number): number {
  return 1 + Math.min(4, (BIOME_LV[biome] ?? 2) / 7) + (DIFF_TIER[diff] ?? 0) + Math.max(0, lvl - 3) * .05;
}
/** Itens que um monstro derrotado deixa para um jogador (sem as Centelhas, que seguem no jogo). */
export function monsterDrops(ctx: DropContext, kind: { elite: boolean; thief: boolean }, rng: Rng, id: () => string): Item[] {
  const find = DIFF_FIND[ctx.diff] ?? 1, tier = ctx.tier ?? riftTier(ctx.base, ctx.L, ctx.diff, ctx.lvl), itemFind = ctx.sorte ? 1.3 : 1, out: Item[] = [];
  const add = (rar: number) => out.push(makeItem(pickR(rng, SLOTS), tier, rar, ctx.cls, rng, false, id()));
  if (rng() < .08 * itemFind) add(rollRar(rng, find, ctx.L >= 4 ? 1 : 0));
  if (kind.thief) for (let i = 0; i < 3; i++) add(rollRar(rng, find, 2));
  else if (kind.elite) add(rollRar(rng, find, 2));
  return out;
}
