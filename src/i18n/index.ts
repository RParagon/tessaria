// Idiomas do jogo. O texto original é o português; as traduções ficam em dicionários (src/i18n/en.json)
// cuja chave é o próprio texto em português, com os números trocados por {n}.
//
// A tradução acontece na camada da tela: um observador troca os textos (e title, placeholder, aria-label)
// assim que aparecem na página. Assim o código do jogo continua escrevendo em português, e o que ainda
// não tiver tradução simplesmente fica em português (nada quebra).
//
// Ficam de fora: o que o jogador escreve (chat, nomes), marcado com data-noi18n, e campos de texto.
import EN from './en.json';

export type Lang = 'pt' | 'en';
const KEY = 'tess.lang';
const DICTS: Record<Lang, Record<string, string> | null> = { pt: null, en: EN as Record<string, string> };
const HAS_EN = Object.keys(EN as object).length > 0;   // o inglês só aparece quando o dicionário existir
export const LANGS: Array<{ id: Lang; n: string }> = [{ id: 'pt', n: 'Português' }, ...(HAS_EN ? [{ id: 'en' as Lang, n: 'English' }] : [])];

function detect(): Lang {
  if (!HAS_EN) return 'pt';
  try { const s = localStorage.getItem(KEY); if (s === 'pt' || s === 'en') return s; } catch { /* sem storage */ }
  if ((import.meta as any).env?.MODE === 'test') return 'pt';   // build de teste: os testes conferem textos em português
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'pt';
  return nav.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}
export const lang: Lang = detect();
const dict = DICTS[lang];
const lower = new Map<string, string>();
if (dict) for (const [k, v] of Object.entries(dict)) lower.set(k.toLowerCase(), v);

const NUM = /\d+(?:[.,]\d+)*/g;
const LETTER = /[A-Za-zÀ-ÿ]/;
const isUpper = (s: string) => LETTER.test(s) && s === s.toUpperCase() && s !== s.toLowerCase();

/** Traduz um texto (sem espaços nas pontas). null se não houver tradução. */
export function trCore(text: string): string | null {
  if (!dict || !LETTER.test(text)) return null;
  const direct = dict[text]; if (direct !== undefined) return direct;
  const nums = text.match(NUM), key = nums ? text.replace(NUM, '{n}') : text;
  let v = nums ? dict[key] : undefined, up = false;
  if (v === undefined) { v = lower.get(key.toLowerCase()); up = v !== undefined && isUpper(key); }
  if (v === undefined) return null;
  let i = 0; let out = nums ? v.replace(/\{n\}/g, () => (nums[i++] ?? '')) : v;
  if (up) out = out.toUpperCase();
  return out;
}
/** Traduz preservando os espaços nas pontas; devolve o original se não houver tradução. */
export function tr(text: string): string {
  if (!dict) return text;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(text)!; const t = trCore(m[2]);
  return t === null ? text : m[1] + t + m[3];
}

// ---------- tradução da página ----------
const ATTRS = ['title', 'placeholder', 'aria-label', 'data-tip'];
const done = new WeakMap<Node, string>();   // nó → texto que pusemos (para não traduzir de novo o que já traduzimos)
const misses = new Set<string>();
const skip = (el: Element | null) => !!el && (el.closest('[data-noi18n], script, style, textarea, input, .net-line:not(.sys) , .rn, code') !== null);
function textNode(n: Text) {
  const v = n.nodeValue; if (!v || done.get(n) === v || skip(n.parentElement)) return;
  const t = tr(v);
  if (t !== v) { done.set(n, t); n.nodeValue = t; } else if (LETTER.test(v) && v.trim().length > 1) misses.add(v.trim().replace(NUM, '{n}'));
}
function element(el: Element) {
  if (skip(el)) return;
  for (const a of ATTRS) { const v = el.getAttribute(a); if (v) { const t = tr(v); if (t !== v) el.setAttribute(a, t); } }
  if (el instanceof HTMLInputElement && (el.type === 'button' || el.type === 'submit') && el.value) el.value = tr(el.value);
}
function walk(root: Node) {
  if (root.nodeType === 3) return textNode(root as Text);
  if (root.nodeType !== 1) return;
  element(root as Element);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { if (n.nodeType === 3) textNode(n as Text); else element(n as Element); }
}
export function startPageTranslation() {
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
  if (!dict) return;
  document.title = tr(document.title);
  walk(document.body);
  new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'characterData') textNode(m.target as Text);
      else if (m.type === 'attributes') element(m.target as Element);
      else m.addedNodes.forEach(walk);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
export function setLang(l: Lang) { try { localStorage.setItem(KEY, l); } catch { /* sem storage */ } location.reload(); }

// O jogo (escopo único) e a interface online usam por aqui. __misses: textos ainda sem tradução (para completar o dicionário).
(window as any).TessI18n = { lang, tr, setLang, LANGS, __misses: misses };
