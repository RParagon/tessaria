// Guildas (etapa social): regras comuns do jogo e do servidor.
// Desenho completo (ilha, prédios e guerra) em docs/GUILDS.md. Aqui só o que já existe: fundar, convidar,
// cargos, chat, emblema, recado do dia, Fios da Guilda (contribuição) e o nível da guilda (só estilo).
import { badToken, normalize } from './text';

export const GUILD_FOUND_COST = 25_000;     // Centelhas para fundar
export const GUILD_FOUND_LVL = 15;          // nível mínimo para fundar
export const GUILD_MAX = 30;                // vagas (o Salão da ilha aumenta para 50, no futuro)
export const GUILD_REJOIN_MS = 24 * 3_600_000;   // quem sai espera 24 h para entrar em outra
export const GUILD_INVITE_MS = 3 * 864e5;   // convite vale 3 dias
export const GUILD_OFFICERS_MAX = 5;
export const MOTD_MAX = 140;

export type GuildRole = 'lider' | 'oficial' | 'membro';
export const ROLE_N: Record<GuildRole, string> = { lider: 'Líder', oficial: 'Oficial', membro: 'Membro' };
export const canManage = (r: GuildRole | null | undefined) => r === 'lider' || r === 'oficial';

/** Fios da Guilda por atividade (contados no servidor). */
export const GUILD_FIOS = { daily: 10, weekly: 60, donatePer: 100, donateDayMax: 300 } as const;

/** Nível da guilda pelo total de Fios da Guilda (1 a 20). Só estilo por enquanto: moldura do emblema e o título no Salão. */
export const GUILD_LVL_MAX = 20;
export const guildXpFor = (lv: number) => Math.round(400 * (lv - 1) ** 1.6);
export function guildLevel(fios: number) { let l = 1; while (l < GUILD_LVL_MAX && fios >= guildXpFor(l + 1)) l++; return l; }

// ---------- emblema ----------
export const EMB_SHAPES = ['Escudo', 'Círculo', 'Losango', 'Estandarte', 'Hexágono', 'Estrela'];
export const EMB_COLORS = ['#c0392b', '#e67e22', '#f2b84b', '#7fb339', '#2e9e6b', '#2bb3c0', '#3a6fd8', '#6a4bc4', '#b04bb0', '#d85a8a', '#8a7a5a', '#dcd6c8'];
export const EMB_SYMBOLS = ['✦', '⚔', '☾', '☀', '❀', '♜', '⚑', '✶', '♞', '☘', '⚓', '❄'];
export interface Emblem { shape: number; color: number; symbol: number }
export function cleanEmblem(e: any): Emblem | null {
  const ok = (v: any, n: number) => Number.isInteger(v) && v >= 0 && v < n;
  return e && ok(e.shape, EMB_SHAPES.length) && ok(e.color, EMB_COLORS.length) && ok(e.symbol, EMB_SYMBOLS.length) ? { shape: e.shape, color: e.color, symbol: e.symbol } : null;
}
const SHAPE_PATH = [
  'M4 3h24v11c0 8-6 13-12 15C10 27 4 22 4 14z',
  'M16 3a13 13 0 1 0 0.01 0z',
  'M16 2l14 14-14 14L2 16z',
  'M5 3h22v26l-11-6-11 6z',
  'M16 2l12 7v14l-12 7-12-7V9z',
  'M16 2l4 9 10 1-7.5 6.5L25 29l-9-5-9 5 2.5-10.5L2 12l10-1z',
];
/** SVG do emblema (texto), o mesmo no jogo e nas páginas. */
export function emblemSvg(e: Emblem | null, size = 32) {
  const m = e ?? { shape: 0, color: 11, symbol: 0 };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true"><path d="${SHAPE_PATH[m.shape]}" fill="${EMB_COLORS[m.color]}" stroke="#000" stroke-width="2"/><text x="16" y="${m.shape === 5 ? 20 : 21}" text-anchor="middle" font-size="${m.shape === 5 ? 10 : 14}" fill="#fff" stroke="#000" stroke-width=".6" font-family="serif">${EMB_SYMBOLS[m.symbol]}</text></svg>`;
}

// ---------- nome e sigla ----------
export function guildNameProblem(name: unknown): string | null {
  if (typeof name !== 'string') return 'Nome inválido.';
  const n = name.trim().replace(/\s+/g, ' ');
  if (n.length < 3 || n.length > 20) return 'O nome da guilda precisa ter de 3 a 20 caracteres.';
  if (!/^[\p{L}\p{N} ]+$/u.test(n)) return 'Use só letras, números e espaços.';
  if (!/\p{L}/u.test(n)) return 'O nome precisa ter pelo menos uma letra.';
  if (n.split(' ').some(w => badToken(w)) || badToken(n.replace(/ /g, ''))) return 'Esse nome não é permitido.';
  const norm = normalize(n).replace(/[^a-z]/g, '');
  if (['admin', 'moderacao', 'moderador', 'suporte', 'staff', 'oficial', 'tessaria'].some(w => norm.includes(w))) return 'Esse nome é reservado.';
  return null;
}
export function guildTagProblem(tag: unknown): string | null {
  if (typeof tag !== 'string') return 'Sigla inválida.';
  const t = tag.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,4}$/.test(t)) return 'A sigla tem de 2 a 4 letras ou números, sem acento.';
  if (!/[A-Z]/.test(t)) return 'A sigla precisa ter pelo menos uma letra.';
  if (badToken(t.toLowerCase()) || ['ADM', 'MOD', 'GM', 'STAF', 'SUP'].includes(t)) return 'Essa sigla não é permitida.';
  return null;
}
export const cleanGuildName = (n: string) => n.trim().replace(/\s+/g, ' ');
export const cleanTag = (t: string) => t.trim().toUpperCase();

/** Semana da contribuição (começa segunda, 00:00 UTC, como o torneio). */
export const guildWeek = (now: number) => Math.floor((now - Date.UTC(2026, 0, 5)) / (7 * 864e5));
export const guildDay = (now: number) => Math.floor(now / 864e5);
