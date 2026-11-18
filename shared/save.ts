// Validação do save no servidor.
//
// Duas camadas:
//  - erros (rejeitam o save): valores impossíveis, itens fora das regras, ids
//    repetidos, saltos absurdos de nível ou de ouro desde o último save;
//  - alertas (aceitam, mas registram na auditoria): saltos grandes, mas
//    possíveis para quem joga muito bem.
//
// Fase 1: o combate ainda roda no aparelho, então o servidor não sabe se cada
// monstro foi mesmo derrotado. Esta validação fecha as trapaças grosseiras
// (editar o save) e, junto com as lápides de itens, a duplicação pelo correio.
// A autoridade completa vem na Fase 2, com o combate no servidor.

import { itemProblems, type Item } from './items';

export const MAX_SAVE_BYTES = 400_000;
export const BOSSES = ['forest', 'crypt', 'peaks', 'swamp', 'glass'];
// Precisa listar toda a mobília de HOUSE_F (src/game/core/state.js); o teste de ponta a ponta confere.
export const HOUSE_FURNITURE = ['cama', 'guarda', 'lareira', 'jardim', 'estante', 'bancada', 'mapa', 'altar', 'estatua'];
/** Estilos raros do Guarda-Roupa (RARE_ACCS e RARE_HAIR em src/game/data/palettes.js). */
export const RARE_COSMETICS = ['flor', 'oculos', 'orelhas', 'aureola', 'cartola', 'trancas', 'placas', 'escamas', 'tabardo', 'brasas', 'vagalumes', 'petalas', 'gelo', 'sombra', 'fios'];
export const DIFF_LEVEL = [1, 1, 6, 12, 16, 20, 24];
export const INV_MAX = 20;
/** Bolsa ampliada (save.bagCap: 20 a 40, de 5 em 5). */
export const invMax = (s: AnySave | null | undefined) => { const c = Number(s?.bagCap) || 20; return c >= 20 && c <= 40 && c % 5 === 0 ? c : 20; };

export interface SaveCheck { errors: string[]; flags: string[] }
type AnySave = Record<string, any>;

const isInt = (v: unknown, lo: number, hi: number) => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;
const isNum = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

/** Maior nível de item que o progresso deste save permite. */
export function maxItemTier(s: AnySave): number {
  const rift = Number(s.riftMax) || 0, lvl = Number(s.lvl) || 1;
  return 5 + 2.5 + 1 + rift * .5 + Math.max(0, lvl) * .06 + 2;
}

/** Todos os itens do save (equipados, bolsa e baú), com o lugar onde estão. */
export function allItems(s: AnySave): Array<{ where: string; it: Item }> {
  const out: Array<{ where: string; it: Item }> = [];
  for (const k of ['weapon', 'armor', 'charm']) { const it = s.eq?.[k]; if (it) out.push({ where: `eq.${k}`, it }); }
  (Array.isArray(s.inv) ? s.inv : []).forEach((it: Item, i: number) => out.push({ where: `inv[${i}]`, it }));
  (Array.isArray(s.house?.stash) ? s.house.stash : []).forEach((it: Item, i: number) => out.push({ where: `baú[${i}]`, it }));
  return out;
}

export function validateSave(s: unknown, opts: { prev?: AnySave | null; elapsedMs?: number } = {}): SaveCheck {
  const errors: string[] = [], flags: string[] = [];
  if (!s || typeof s !== 'object' || Array.isArray(s)) return { errors: ['save não é objeto'], flags };
  const v = s as AnySave;
  const size = JSON.stringify(v).length;
  if (size > MAX_SAVE_BYTES) errors.push(`save grande demais (${size} bytes)`);

  if (!v.char || typeof v.char !== 'object') errors.push('personagem ausente');
  else {
    if (!['lamina', 'arcano', 'arco'].includes(v.char.cls)) errors.push('classe inválida');
    if (typeof v.char.name !== 'string' || v.char.name.length > 24) errors.push('nome do personagem inválido');
  }
  if (!isInt(v.lvl, 1, 200)) errors.push('nível inválido');
  if (!isNum(v.xp, -1e12, 1e12)) errors.push('XP inválida');
  if (!isInt(v.gold, 0, 2_000_000_000)) errors.push('Centelhas inválidas');
  if (v.potions !== undefined && !isInt(v.potions, 0, 20)) errors.push('poções inválidas');
  if (v.fios !== undefined && !isNum(v.fios, 0, 1e8)) errors.push('Fios do Tear inválidos');
  if (v.spent !== undefined && !isNum(v.spent, 0, 1e12)) errors.push('total gasto inválido');
  if (v.up && typeof v.up === 'object') {
    for (const [k, n] of Object.entries(v.up)) if (!isInt(n, 0, k === 'pot' ? 3 : 5)) errors.push(`melhoria da forja inválida: ${k}`);
  }
  const diff = v.diff ?? 0;
  if (!isInt(diff, 0, 6)) errors.push('dificuldade inválida');
  else if (isInt(v.lvl, 1, 200) && v.lvl < DIFF_LEVEL[diff]) errors.push('dificuldade acima do nível');
  if (v.bosses && typeof v.bosses === 'object') for (const k of Object.keys(v.bosses)) if (!BOSSES.includes(k)) errors.push(`chefe desconhecido: ${k}`);
  if (diff >= 4 && !v.bosses?.glass) errors.push('Tormento sem concluir o Ato II');

  if (v.bagCap !== undefined && (!isInt(v.bagCap, 20, 40) || v.bagCap % 5 !== 0)) errors.push('tamanho da bolsa inválido');
  if (v.inv !== undefined && (!Array.isArray(v.inv) || v.inv.length > invMax(v))) errors.push('bolsa inválida');
  if (v.bank !== undefined && !isInt(v.bank, 0, 2_000_000_000)) errors.push('banco inválido');
  if (v.eq && typeof v.eq === 'object') for (const k of ['weapon', 'armor', 'charm']) { const it = v.eq[k]; if (it && it.slot !== k) errors.push(`item no espaço errado: ${k}`); }
  if (v.house) {
    const h = v.house;
    if (!isInt(h.cap ?? 20, 20, 70) || (h.cap ?? 20) % 10 !== 0) errors.push('tamanho do baú inválido');
    if (h.stash !== undefined && (!Array.isArray(h.stash) || h.stash.length > (h.cap ?? 20))) errors.push('baú cheio demais');
    if (h.f && typeof h.f === 'object') for (const k of Object.keys(h.f)) if (!HOUSE_FURNITURE.includes(k)) errors.push(`mobília desconhecida: ${k}`);
    if (!h.owned && ((h.stash && h.stash.length) || (h.f && Object.keys(h.f).length))) errors.push('casa usada sem ser comprada');
  }
  if (v.cos !== undefined) {
    if (!Array.isArray(v.cos) || v.cos.length > RARE_COSMETICS.length) errors.push('estilos raros inválidos');
    else for (const k of v.cos) if (!RARE_COSMETICS.includes(k)) errors.push(`estilo raro desconhecido: ${k}`);
  }

  const tierMax = maxItemTier(v), ids = new Set<string>();
  for (const { where, it } of allItems(v)) {
    const pr = itemProblems(it, tierMax);
    if (pr.length) errors.push(`${where}: ${pr[0]}`);
    if (it && typeof it.id === 'string') { if (ids.has(it.id)) errors.push(`item repetido: ${it.id}`); ids.add(it.id); }
  }

  const prev = opts.prev;
  if (prev && !errors.length) {
    const mins = Math.max(0, (opts.elapsedMs ?? 0) / 60_000);
    const dl = v.lvl - (prev.lvl ?? 1);
    if (dl < 0) errors.push('nível diminuiu');
    else if (dl > 12 + mins * 6) errors.push(`subiu ${dl} níveis em ${mins.toFixed(1)} min`);
    else if (dl > 4 + mins * 2) flags.push(`subiu ${dl} níveis em ${mins.toFixed(1)} min`);
    const dg = v.gold + (v.bank ?? 0) + (v.spent ?? 0) - (prev.gold + (prev.bank ?? 0) + (prev.spent ?? 0)), mult = 1 + (diff || 0);   // banco conta como Centelhas
    if (dg > 50_000 + mins * 40_000 * mult) errors.push(`ganhou ${dg} Centelhas em ${mins.toFixed(1)} min`);
    else if (dg > 8_000 + mins * 6_000 * mult) flags.push(`ganhou ${dg} Centelhas em ${mins.toFixed(1)} min`);
    const prevChests = new Set(prev.chests ?? []);
    const newChests = (v.chests ?? []).filter((c: string) => !prevChests.has(c)).length;
    if (newChests > 6 + mins * 4) flags.push(`${newChests} baús abertos em ${mins.toFixed(1)} min`);
  }
  return { errors, flags };
}
