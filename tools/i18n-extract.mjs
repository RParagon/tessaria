// Extrai os textos em português do jogo (código, página, regras comuns e mensagens do servidor), no formato das
// chaves do dicionário (números viram {n}), e lista os que ainda não têm tradução em src/i18n/<idioma>.json.
// Uso: node tools/i18n-extract.mjs [en] [--out arquivo.json]   (sem --out, só imprime o resumo)
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const lang = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'en';
const outIdx = process.argv.indexOf('--out'), out = outIdx > 0 ? process.argv[outIdx + 1] : null;
const files = [];
const walk = (d, re) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p, re); else if (re.test(f)) files.push(p); } };
walk('src/game', /\.js$/); walk('src/net', /\.ts$/); walk('shared', /\.ts$/);
files.push('server/src/app.ts', 'server/src/hub.ts', 'server/src/social.ts');   // só as mensagens que o jogador vê (o banco fica de fora)
files.push('src/game/ui/tips.js');

const NUM = /\d+(?:[.,]\d+)*/g, LETTER = /[A-Za-zÀ-ÿ]/;
const keys = new Set();
function add(raw) {
  let s = raw.replace(/\\n/g, ' ').replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s || !LETTER.test(s) || s.length < 2 || s.length > 600) return;
  if (/="|\\"|<|>|\b(SELECT|INSERT|UPDATE|DELETE|WHERE|RETURNING|ORDER BY|ON CONFLICT|LIMIT|JOIN|FROM)\b/.test(s)) return;   // atributos de HTML e SQL
  if (s.replace(/[^A-Za-zÀ-ÿ]/g, '').length < 3) return;   // pedaços curtos demais
  if (/^[#.@/]|^https?:|=>|[{}]|;\s|\bpx\b|^[a-z0-9_-]+$|^[A-Z0-9_]+$|^[a-z]+[A-Z]\w*$|\.(js|ts|png|json|css|html)\b|^\w+\(|var\(--|rgba?\(/.test(s)) return;   // código, seletores, ids
  if (!/\s/.test(s) && !/[À-ÿ]/.test(s) && !/^[A-ZÀ-Ý][a-zà-ÿ]+$/.test(s)) return;   // palavra solta sem cara de texto
  keys.add(s.replace(NUM, '{n}'));
}
function addMaybeHtml(s) { if (s.includes('<')) { for (const seg of s.split(/<[^>]*>/)) add(seg); } else add(s); }
for (const f of files) {
  const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/([^:'"`])\/\/[^\n'"`]*$/gm, '$1');
  for (const m of src.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g)) addMaybeHtml(m[1] ?? m[2] ?? '');
  for (const m of src.matchAll(/`((?:[^`\\]|\\.)*)`/g)) for (const part of m[1].split(/\$\{[^}]*\}/)) addMaybeHtml(part);   // trechos fixos dos templates
}
// página (index.html, termos e privacidade ficam em páginas próprias)
const html = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '');
for (const m of html.matchAll(/>([^<>]+)</g)) add(m[1]);
for (const m of html.matchAll(/(?:title|placeholder|aria-label|data-tip)="([^"]+)"/g)) add(m[1].replace(/&#10;/g, ' '));

let dict = {}; try { dict = JSON.parse(readFileSync(`src/i18n/${lang}.json`, 'utf8')); } catch { /* novo */ }
const all = [...keys].sort(), missing = all.filter(k => !(k in dict));
console.log(`textos encontrados: ${all.length} · traduzidos (${lang}): ${all.length - missing.length} · faltando: ${missing.length}`);
if (out) { writeFileSync(out, JSON.stringify(missing, null, 1)); console.log(`faltando → ${out}`); }
