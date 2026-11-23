// Filtro de texto (chat e nomes) e regras de nome de conta.
// Compartilhado entre cliente (prévia) e servidor (a palavra final).
//
// A lista é curta de propósito: cobre o grosso em português e inglês. Ela fica
// num só lugar para ser ampliada sem mexer no resto. A normalização tira
// acentos, troca números e símbolos comuns por letras e junta letras repetidas,
// para pegar variações como "p0rr4" ou "porrrra".

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i' };

/** Palavras bloqueadas quando aparecem como palavra inteira (já normalizadas). */
const BLOCK_WORDS = new Set([
  'porra', 'caralho', 'merda', 'puta', 'puto', 'putas', 'putos', 'buceta', 'boceta', 'cu', 'foda', 'fodase', 'foder', 'fodido', 'fdp', 'vsf', 'pqp', 'tnc',
  'arrombado', 'arrombada', 'viado', 'viadinho', 'bicha', 'traveco', 'otario', 'otaria', 'babaca', 'cacete', 'piroca', 'pinto', 'rola', 'xoxota', 'xereca',
  'corno', 'vagabunda', 'vagabundo', 'piranha', 'retardado', 'retardada', 'mongol', 'macaco', 'preto', 'crioulo', 'nazista', 'hitler',
  'fuck', 'fucker', 'fucking', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'whore', 'slut', 'nigger', 'nigga', 'faggot', 'fag', 'retard', 'nazi',
]);

/** Radicais bloqueados como início de palavra (longos o bastante para não pegar palavras inocentes). */
const BLOCK_ROOTS = ['caralh', 'arromb', 'bucet', 'pirok', 'piroc', 'fodend', 'fodid', 'putari', 'viadag', 'fuckin', 'motherf', 'nigg'];

/** Nomes que não podem ser usados por jogadores. */
const RESERVED = ['admin', 'administrador', 'moderador', 'mod', 'sistema', 'system', 'suporte', 'tessaria', 'ysolde', 'varkhaz', 'morgrave', 'gm', 'staff', 'oficial'];

export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split('').map(c => LEET[c] ?? c).join('')
    .replace(/(.)\1{2,}/g, '$1$1');
}

const collapse = (w: string) => w.replace(/(.)\1+/g, '$1');

export function badToken(raw: string): boolean {
  const n = normalize(raw).replace(/[^a-z]/g, '');
  if (!n) return false;
  if (BLOCK_WORDS.has(n) || BLOCK_WORDS.has(collapse(n))) return true;
  return BLOCK_ROOTS.some(r => n.startsWith(r) || collapse(n).startsWith(r));
}

/** Troca palavras bloqueadas por asteriscos, mantendo o tamanho. */
export function maskText(text: string): string {
  // '!' vale como 'i' só dentro da palavra ("f!lho"); no fim é pontuação ("porra!").
  return text.replace(/[\p{L}\p{N}@$!]*[\p{L}\p{N}@$]/gu, w => (badToken(w) ? '*'.repeat(w.length) : w));
}

/** true se o texto tem algo bloqueado. */
export function hasBlocked(text: string): boolean {
  return maskText(text) !== text;
}

/** Limpa texto de chat: tira caracteres de controle, junta espaços, corta no tamanho. */
export function cleanChat(text: string, max = 140): string {
  return String(text ?? '').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export const NAME_MIN = 3;
export const NAME_MAX = 16;

/** Valida um nome de conta. Devolve a mensagem de erro em português, ou null se estiver ok. */
export function nameProblem(name: string): string | null {
  if (typeof name !== 'string') return 'Nome inválido.';
  const n = name.trim();
  if (n.length < NAME_MIN || n.length > NAME_MAX) return `O nome precisa ter de ${NAME_MIN} a ${NAME_MAX} caracteres.`;
  if (!/^[\p{L}\p{N}_]+$/u.test(n)) return 'Use só letras, números e _ (sem espaços).';
  if (!/\p{L}/u.test(n)) return 'O nome precisa ter pelo menos uma letra.';
  const norm = normalize(n).replace(/[^a-z]/g, '');
  if (RESERVED.includes(norm)) return 'Esse nome é reservado.';
  if (badToken(n)) return 'Esse nome não é permitido.';
  // Nomes colados ("ViadoPro"): procura palavras bloqueadas de 4+ letras dentro do nome.
  for (const w of BLOCK_WORDS) if (w.length >= 4 && norm.includes(w)) return 'Esse nome não é permitido.';
  return null;
}
