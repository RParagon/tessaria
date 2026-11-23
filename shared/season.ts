// Temporada, Passe do Tear, missões, entrada diária e catálogo de cosméticos.
//
// Regra de ouro (docs/MONETIZATION.md): dinheiro compra estilo, nunca poder. Nada aqui dá dano, vida,
// chance de item ou XP de personagem. Os Fios Dourados (moeda premium) ficam no servidor, não no save.

export type CosSlot = 'trail' | 'title' | 'namecolor' | 'tele' | 'death' | 'frame';
export interface Cosmetic { id: string; slot: CosSlot; n: string; rar: 0 | 1 | 2 | 3; price?: number; src: 'loja' | 'passe' | 'feito'; fx?: any }

/** Catálogo. Os de "feito" (conquista) nunca são vendidos. */
export const COSMETICS: Cosmetic[] = [
  // rastros de esquiva (partículas no dash)
  { id: 'rastro_brasa', slot: 'trail', n: 'Rastro de Brasas', rar: 1, price: 180, src: 'loja', fx: { mat: 21, kind: 'brasa' } },
  { id: 'rastro_petala', slot: 'trail', n: 'Rastro de Pétalas', rar: 1, price: 180, src: 'loja', fx: { mat: 16, kind: 'petala' } },
  { id: 'rastro_gelo', slot: 'trail', n: 'Rastro de Gelo', rar: 2, price: 320, src: 'loja', fx: { mat: 150, kind: 'gelo' } },
  { id: 'rastro_vidro', slot: 'trail', n: 'Vidro Estilhaçado', rar: 2, price: 320, src: 'loja', fx: { mat: 28, kind: 'vidro' } },
  { id: 'rastro_fios', slot: 'trail', n: 'Fios de Luz', rar: 2, src: 'passe', fx: { mat: 14, kind: 'fios' } },
  { id: 'rastro_sombra', slot: 'trail', n: 'Passos de Sombra', rar: 3, src: 'passe', fx: { mat: 151, kind: 'sombra' } },
  { id: 'rastro_estrela', slot: 'trail', n: 'Poeira de Estrelas', rar: 3, price: 600, src: 'loja', fx: { mat: 30, kind: 'estrela' } },
  { id: 'rastro_folhas', slot: 'trail', n: 'Folhas ao Vento', rar: 1, src: 'passe', fx: { mat: 10, kind: 'folha' } },
  // cor do nome (no balão acima do herói, no chat e no ranking)
  { id: 'cor_ouro', slot: 'namecolor', n: 'Nome Dourado', rar: 2, price: 250, src: 'loja', fx: { c: '#ffd27a' } },
  { id: 'cor_rubi', slot: 'namecolor', n: 'Nome Rubi', rar: 1, price: 150, src: 'loja', fx: { c: '#ff6a7a' } },
  { id: 'cor_jade', slot: 'namecolor', n: 'Nome Jade', rar: 1, src: 'passe', fx: { c: '#6fe3a0' } },
  { id: 'cor_violeta', slot: 'namecolor', n: 'Nome Violeta', rar: 2, src: 'passe', fx: { c: '#c79bff' } },
  { id: 'cor_aurora', slot: 'namecolor', n: 'Nome Aurora', rar: 3, src: 'passe', fx: { c: 'aurora' } },
  // títulos (abaixo do nome)
  { id: 'tit_tecelao', slot: 'title', n: 'Tecelão Errante', rar: 0, src: 'passe' },
  { id: 'tit_pescador', slot: 'title', n: 'Mestre do Anzol', rar: 1, src: 'passe' },
  { id: 'tit_vidro', slot: 'title', n: 'Herói da Fenda de Vidro', rar: 2, src: 'passe' },
  { id: 'tit_lenda', slot: 'title', n: 'Lenda do Tear', rar: 3, src: 'passe' },
  { id: 'tit_noturno', slot: 'title', n: 'Andarilho Noturno', rar: 1, price: 200, src: 'loja' },
  { id: 'tit_campeao', slot: 'title', n: 'Campeão do Torneio', rar: 3, src: 'feito' },
  // efeito de teleporte (ao chegar por portal, obelisco ou ao renascer; os outros veem quando você aparece)
  { id: 'tele_coluna', slot: 'tele', n: 'Coluna de Luz', rar: 1, price: 220, src: 'loja', fx: { mat: 14, kind: 'coluna' } },
  { id: 'tele_fios', slot: 'tele', n: 'Portal de Fios', rar: 2, price: 380, src: 'loja', fx: { mat: 30, kind: 'fios' } },
  { id: 'tele_folhas', slot: 'tele', n: 'Redemoinho de Folhas', rar: 1, price: 220, src: 'loja', fx: { mat: 10, kind: 'folhas' } },
  { id: 'tele_vazio', slot: 'tele', n: 'Rasgo do Vazio', rar: 3, price: 650, src: 'loja', fx: { mat: 151, kind: 'vazio' } },
  // efeito de morte (ao cair; visível no PvP e no grupo)
  { id: 'morte_petalas', slot: 'death', n: 'Desfazer em Pétalas', rar: 1, price: 200, src: 'loja', fx: { mat: 16, kind: 'petalas' } },
  { id: 'morte_vidro', slot: 'death', n: 'Estilhaço de Vidro', rar: 2, price: 350, src: 'loja', fx: { mat: 28, kind: 'vidro' } },
  { id: 'morte_brasas', slot: 'death', n: 'Cinzas e Brasas', rar: 2, price: 350, src: 'loja', fx: { mat: 21, kind: 'brasas' } },
  // moldura do nome (acima do herói, para os outros jogadores)
  { id: 'mold_ouro', slot: 'frame', n: 'Moldura Dourada', rar: 2, price: 300, src: 'loja', fx: { css: 'fr-ouro' } },
  { id: 'mold_lua', slot: 'frame', n: 'Moldura de Luar', rar: 1, price: 200, src: 'loja', fx: { css: 'fr-lua' } },
  { id: 'mold_espinhos', slot: 'frame', n: 'Moldura de Espinhos', rar: 2, price: 300, src: 'loja', fx: { css: 'fr-espinhos' } },
  { id: 'mold_fios', slot: 'frame', n: 'Moldura de Fios Vivos', rar: 3, price: 600, src: 'loja', fx: { css: 'fr-fios' } },
];
/** Rótulo de cada tipo de cosmético. */
export const COS_SLOT_N: Record<CosSlot, string> = { trail: 'Rastro de esquiva', namecolor: 'Cor do nome', title: 'Título', tele: 'Efeito de teleporte', death: 'Efeito de morte', frame: 'Moldura do nome' };
/** Campo do visual (char) onde cada tipo fica equipado. */
export const COS_FIELD: Record<CosSlot, string> = { trail: 'trail', namecolor: 'namecolor', title: 'ctitle', tele: 'tele', death: 'death', frame: 'frame' };
export const cosById = (id: string) => COSMETICS.find(c => c.id === id);

// ---------- decoração da casa (Fios Dourados, sempre à venda; só estilo) ----------
/** Lugares da casa: um tapete, um quadro na parede, uma peça no teto e três no chão. */
export type DecoSpot = 'tapete' | 'parede' | 'teto' | 'chao';
export const DECO_SLOTS = ['tapete', 'parede', 'teto', 'chao1', 'chao2', 'chao3'] as const;
export type DecoSlot = typeof DECO_SLOTS[number];
export const DECO_SLOT_N: Record<DecoSlot, string> = { tapete: 'Tapete da sala', parede: 'Parede', teto: 'Teto', chao1: 'Canto da janela', chao2: 'Perto da lareira', chao3: 'Perto do altar' };
export const slotSpot = (k: DecoSlot): DecoSpot => k.startsWith('chao') ? 'chao' : k as DecoSpot;
export interface Deco { id: string; n: string; spot: DecoSpot; price: number; d: string }
export const DECOR: Deco[] = [
  { id: 'dec_tap_real', n: 'Tapete Real', spot: 'tapete', price: 220, d: 'Vermelho com borda dourada' },
  { id: 'dec_tap_mar', n: 'Tapete do Mar', spot: 'tapete', price: 220, d: 'Ondas azuis e creme' },
  { id: 'dec_tap_fios', n: 'Tapete de Fios Vivos', spot: 'tapete', price: 420, d: 'Fios que brilham no escuro' },
  { id: 'dec_qua_fenda', n: 'Quadro da Fenda de Vidro', spot: 'parede', price: 180, d: 'A Cidadela vista de longe' },
  { id: 'dec_tap_tear', n: 'Tapeçaria do Tear', spot: 'parede', price: 300, d: 'Tecida com os fios da Temporada 1' },
  { id: 'dec_est_brasa', n: 'Estandarte da Vila Brasa', spot: 'parede', price: 150, d: 'Brasa e ouro' },
  { id: 'dec_lus_vidro', n: 'Lustre de Vidro', spot: 'teto', price: 380, d: 'Ilumina a sala inteira' },
  { id: 'dec_lan_flut', n: 'Lanternas Flutuantes', spot: 'teto', price: 320, d: 'Pequenas chamas que balançam' },
  { id: 'dec_aquario', n: 'Aquário com Peixe-Lua', spot: 'chao', price: 450, d: 'Um peixe-lua só seu' },
  { id: 'dec_fonte', n: 'Fonte de Pedra', spot: 'chao', price: 400, d: 'Água que nunca para' },
  { id: 'dec_arvore', n: 'Árvore de Lanternas', spot: 'chao', price: 350, d: 'Galhos com luzinhas' },
  { id: 'dec_vaso', n: 'Vaso de Cristais', spot: 'chao', price: 180, d: 'Cristais roxos da Fenda' },
  { id: 'dec_dragao', n: 'Estátua do Dragão Dourado', spot: 'chao', price: 600, d: 'Varkhaz, em ouro, enrolado no pedestal' },
];
export const decoById = (id: string) => DECOR.find(d => d.id === id);
/** Confere o objeto de decoração do save: cada lugar com uma peça do tipo certo, sem repetir. Devolve os ids usados ou um erro. */
export function checkDeco(deco: unknown): { ids: string[]; error?: string } {
  if (deco === undefined || deco === null) return { ids: [] };
  if (typeof deco !== 'object' || Array.isArray(deco)) return { ids: [], error: 'decoração inválida' };
  const ids: string[] = [];
  for (const [k, v] of Object.entries(deco as Record<string, unknown>)) {
    if (!(DECO_SLOTS as readonly string[]).includes(k)) return { ids, error: `lugar de decoração inválido: ${k}` };
    if (v === null || v === '') continue;
    const d = typeof v === 'string' ? decoById(v) : undefined;
    if (!d || d.spot !== slotSpot(k as DecoSlot)) return { ids, error: `decoração inválida em ${k}` };
    if (ids.includes(d.id)) return { ids, error: 'a mesma decoração em dois lugares' };
    ids.push(d.id);
  }
  return { ids };
}

// ---------- temporada ----------
export const SEASON = { id: 1, n: 'Temporada 1 · A Fenda de Vidro', start: Date.UTC(2026, 10, 1), weeks: 8, levels: 40, xpPerLevel: 1000, premiumPrice: 950 };
export const seasonEnds = () => SEASON.start + SEASON.weeks * 7 * 864e5;
export const passLevel = (xp: number) => Math.min(SEASON.levels, Math.floor(Math.max(0, xp) / SEASON.xpPerLevel));

/** Recompensa: Fios Dourados (carteira), cosmético, Centelhas ou Fios do Tear (estes dois vão para o save). */
export type Reward = { dourados: number } | { cos: string } | { centelhas: number } | { fios: number };
/** Trilhas do passe: nível → recompensa. Grátis: 1 a cada 2 níveis (com Fios Dourados de volta); premium: todos os níveis. */
export const PASS_FREE: Record<number, Reward> = {};
export const PASS_PREM: Record<number, Reward> = {};
{
  const premCos = ['rastro_folhas', 'cor_jade', 'rastro_fios', 'cor_violeta', 'tit_vidro', 'rastro_sombra', 'cor_aurora', 'tit_lenda'];
  for (let l = 1; l <= SEASON.levels; l++) {
    if (l % 2 === 0) PASS_FREE[l] = l === 10 ? { cos: 'tit_tecelao' } : l === 30 ? { cos: 'tit_pescador' } : l % 6 === 0 ? { dourados: 40 } : l % 4 === 0 ? { fios: 6 } : { centelhas: 400 + l * 25 };
    PASS_PREM[l] = l % 5 === 0 ? { cos: premCos[l / 5 - 1] } : l % 3 === 0 ? { dourados: 60 } : l % 2 === 0 ? { fios: 10 } : { centelhas: 600 + l * 40 };
  }
}

// ---------- missões (iguais para todos no mesmo dia / semana) ----------
export interface Mission { id: string; kind: string; n: number; xp: number; t: string }
const DAILY_POOL: Array<[string, number, number, string]> = [
  ['kill', 40, 350, 'Derrote 40 monstros'], ['elite', 4, 400, 'Derrote 4 elites'], ['alpha', 1, 500, 'Derrote um Alfa nos Ermos'],
  ['rift', 1, 450, 'Conclua uma Fenda'], ['fish', 6, 350, 'Pesque 6 peixes'], ['cook', 1, 300, 'Cozinhe um prato de peixe'],
  ['chest', 3, 350, 'Abra 3 baús'], ['wilds_night', 15, 450, 'Derrote 15 monstros nos Ermos à noite'], ['sellfish', 10, 300, 'Venda 10 peixes no mercado'],
  ['upgrade', 2, 350, 'Aprimore itens 2 vezes'], ['meal', 1, 250, 'Coma na taverna da Mel'], ['obelisk', 1, 400, 'Desperte ou viaje por um obelisco'],
];
const WEEKLY_POOL: Array<[string, number, number, string]> = [
  ['kill', 400, 1800, 'Derrote 400 monstros'], ['elite', 30, 2000, 'Derrote 30 elites'], ['rift', 6, 2200, 'Conclua 6 Fendas'],
  ['fish', 40, 1600, 'Pesque 40 peixes'], ['alpha', 4, 2200, 'Derrote 4 Alfas'], ['boss', 3, 2000, 'Derrote 3 chefes'], ['cook', 6, 1500, 'Cozinhe 6 pratos'],
];
export const dayIndex = (now: number) => Math.floor(now / 864e5);
export const weekIndex = (now: number) => Math.floor((now - Date.UTC(2026, 0, 5)) / (7 * 864e5));
const hash = (n: number) => { let x = Math.imul(n ^ 0x2545f491, 0x9e3779b1); x ^= x >>> 15; x = Math.imul(x, 0x85ebca77); x ^= x >>> 13; return (x >>> 0) / 4294967296; };
function pick(pool: Array<[string, number, number, string]>, seed: number, k: number, prefix: string): Mission[] {
  const idx = pool.map((_, i) => i).sort((a, b) => hash(seed * 31 + a) - hash(seed * 31 + b)).slice(0, k);
  return idx.map(i => { const [kind, n, xp, t] = pool[i]; return { id: `${prefix}${seed}:${kind}`, kind, n, xp, t }; });
}
export const dailyMissions = (now: number) => pick(DAILY_POOL, dayIndex(now), 3, 'd');
export const weeklyMissions = (now: number) => pick(WEEKLY_POOL, weekIndex(now), 3, 'w');
/** Uma missão (pelo id) vale agora? (de hoje ou desta semana) */
export function missionNow(id: string, now: number): Mission | null { return [...dailyMissions(now), ...weeklyMissions(now)].find(m => m.id === id) ?? null; }

// ---------- entrada diária (7 dias seguidos; o 7º dá Fios Dourados) ----------
export const LOGIN_REWARDS: Reward[] = [{ centelhas: 300 }, { fios: 4 }, { centelhas: 600 }, { fios: 8 }, { centelhas: 1000 }, { fios: 12 }, { dourados: 30 }];

/** Pacotes de Fios Dourados (preço em reais) para quando os pagamentos forem ligados. */
export const DOURADOS_PACKS = [{ id: 'p500', n: 500, brl: 9.9 }, { id: 'p1100', n: 1100, brl: 19.9 }, { id: 'p2400', n: 2400, brl: 39.9 }];

/** Vitrine da semana: 4 itens da loja escolhidos pela semana (iguais para todos). */
export function shopRotation(now: number) {
  const pool = COSMETICS.filter(c => c.src === 'loja'), w = weekIndex(now);
  return pool.map((c, i) => ({ c, h: hash(w * 97 + i) })).sort((a, b) => a.h - b.h).slice(0, 4).map(x => x.c.id);
}
