import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import MagicString, { Bundle } from 'magic-string';

const ROOT = dirname(fileURLToPath(import.meta.url));
const GAME = resolve(ROOT, 'src/game');
const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));

/**
 * Monta o código do jogo a partir de src/game/manifest.json.
 *
 * Os arquivos de src/game compartilham um único escopo (herança do protótipo
 * em arquivo único). O plugin concatena na ordem do manifesto, dentro de uma
 * função, e gera source map por arquivo: erros e o depurador apontam para o
 * arquivo e a linha originais.
 *
 * Modos:
 *  - dev (vite)            → __DEV__ = true, gancho de testes completo
 *  - test (build --mode test) → igual à produção, mas mantém o gancho de testes
 *  - production            → remove o avaliador de depuração (permite minificar tudo)
 */
/** Nomes exportados por um módulo do jogo (export const/let/function/class e export { a, b }). */
function exportNames(code) {
  const out = new Set();
  for (const m of code.matchAll(/^export\s+(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/gm)) out.add(m[1]);
  for (const m of code.matchAll(/^export\s*\{([^}]*)\}/gm)) for (const part of m[1].split(',')) { const n = part.trim().split(/\s+as\s+/).pop(); if (n) out.add(n); }
  return [...out];
}

function tessariaGame() {
  const VID = 'virtual:tessaria-game';
  const RID = '\0' + VID;
  let isDev = true;
  let mode = 'development';
  return {
    name: 'tessaria-game',
    configResolved(c) { isDev = c.command === 'serve'; mode = c.mode; },
    resolveId(id) { return id === VID ? RID : null; },
    load(id) {
      if (id !== RID) return null;
      const manifestPath = resolve(GAME, 'manifest.json');
      this.addWatchFile(manifestPath);
      const { files } = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const bundle = new Bundle({ separator: '\n' });
      const imports = [];
      for (const f of files) {
        // Migração para módulos (Fase 2): { "module": "engine/math.js" } é um módulo ES de verdade. Ele é importado,
        // e os nomes que exporta entram no escopo único, para os arquivos antigos continuarem funcionando.
        if (typeof f === 'object' && f.module) {
          const p = resolve(GAME, f.module), names = exportNames(readFileSync(p, 'utf8'));
          if (!names.length) this.error(`O módulo ${f.module} não exporta nada.`);
          const v = `__m${imports.length}`;
          imports.push(`import * as ${v} from ${JSON.stringify('/src/game/' + f.module)};`);
          bundle.addSource(new MagicString(`const { ${names.join(', ')} } = ${v};`));
          continue;
        }
        const p = resolve(GAME, f);
        this.addWatchFile(p);
        let code = readFileSync(p, 'utf8');
        if (!isDev && mode === 'production') code = code.replace(', ev: src => eval(src)', '');
        bundle.addSource({ filename: p, content: new MagicString(code) });
      }
      bundle.prepend(`${imports.join('\n')}\nconst __DEV__ = ${isDev};\nconst __VERSION__ = ${JSON.stringify(pkg.version)};\n(() => {\n`);
      bundle.append('\n})();\n');
      return { code: bundle.toString(), map: bundle.generateMap({ hires: true, includeContent: true }) };
    },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(GAME)) { server.ws.send({ type: 'full-reload' }); return []; }
      return undefined;
    },
  };
}

export default defineConfig({
  plugins: [tessariaGame()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    target: 'es2020',
    sourcemap: true,
    chunkSizeWarningLimit: 900,
  },
  server: { host: true },
  preview: { host: true },
});
