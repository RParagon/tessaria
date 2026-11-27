// Confere os módulos ES do jogo (entradas { module } de src/game/manifest.json): cada um precisa importar
// tudo o que usa. Um nome que só existe no escopo único dos arquivos antigos quebraria o módulo em produção.
// Roda no `npm run typecheck`.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const { files } = JSON.parse(readFileSync('src/game/manifest.json', 'utf8'));
const mods = files.filter(f => typeof f === 'object' && f.module).map(f => 'src/game/' + f.module);
if (!mods.length) process.exit(0);
// Na migração, o que o módulo declara no primeiro nível costuma ser usado pelos arquivos antigos: precisa de export.
// Para manter algo privado de propósito, ponha o comentário /* privado */ na linha.
const missing = [];
for (const m of mods) for (const [i, line] of readFileSync(m, 'utf8').split('\n').entries())
  if (/^(?:async\s+)?(?:const|let|var|function\*?|class)\s+[A-Za-z_$]/.test(line) && !line.includes('/* privado */')) missing.push(`${m}:${i + 1}: ${line.slice(0, 80)}`);
if (missing.length) { console.error('Declarações de primeiro nível sem export nos módulos do jogo (exporte ou marque /* privado */):\n' + missing.join('\n')); process.exit(1); }
let out = '';
try {
  execFileSync('npx', ['tsc', '--noEmit', '--allowJs', '--checkJs', '--module', 'esnext', '--target', 'es2020', '--moduleResolution', 'bundler', '--lib', 'es2020,dom', '--skipLibCheck', ...mods], { encoding: 'utf8', stdio: 'pipe' });
} catch (e) { out = String(e.stdout || '') + String(e.stderr || ''); }
// Só os erros que importam aqui: nomes que não existem (faltou importar). Os demais avisos de tipo do JS antigo são ignorados.
const bad = out.split('\n').filter(l => /error TS(2304|2552|2305|2307)/.test(l));
if (bad.length) { console.error('Módulos do jogo com nomes não importados:\n' + bad.join('\n')); process.exit(1); }
console.log(`módulos do jogo ok (${mods.length})`);
