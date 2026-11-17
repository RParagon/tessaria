// Empacota o servidor (e o código de shared/) num único arquivo para produção.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/server.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  packages: 'external',
  define: { 'process.env.APP_VERSION': JSON.stringify(process.env.APP_VERSION || pkg.version) },
  logLevel: 'info',
});
