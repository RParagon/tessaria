// Regras de itens compartilhadas com o servidor.
// ESPELHAM o gerador do jogo (src/game/data/items.js: RAR, AFF_BASE, affPool,
// makeItem, reforge e o aprimoramento). Se mudar lá, mude aqui. O teste
// tests/e2e/online.spec.js gera centenas de itens no jogo e confere que todos
// passam por estas regras, para pegar qualquer divergência.

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
