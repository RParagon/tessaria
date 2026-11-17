// Imprime a tabela de equilíbrio das classes.
// Uso: npm run test:balance            (nível 10)
//      node tools/balance-sim.mjs 20   (outro nível; exige dist-test e preview rodando ou sobe um)
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { CLASSES, simSource } from './balance-core.js';

const level = Number(process.argv[2] || 10);
const PORT = 4175;
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-test', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', shell: process.platform === 'win32' });
const wait = ms => new Promise(r => setTimeout(r, ms));

try {
  for (let i = 0; i < 40; i++) { try { const res = await fetch(`http://localhost:${PORT}/`); if (res.ok) break; } catch { /* subindo */ } await wait(250); }
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
  });
  const table = {};
  for (const cls of CLASSES) {
    const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
    await page.goto(`http://localhost:${PORT}/?debug=1`);
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* */ } });
    await page.reload();
    await page.waitForFunction(() => window.__T && document.querySelector('#mNew'));
    await wait(600);
    await page.click('#mNew');
    await page.evaluate(c => { __T.G.char.cls = c; }, cls);
    await page.click('#cGo');
    for (let i = 0; i < 6; i++) { if (!(await page.locator('#story').isVisible())) break; await page.click('#story', { timeout: 2000 }).catch(() => {}); await wait(120); }
    await page.waitForFunction(() => __T.P && __T.RG && __T.RG.key === 'hub');
    table[cls] = await page.evaluate(src => __T.ev(src), simSource(level));
    await page.close();
  }
  console.log(`Equilíbrio das classes · nível ${level} · sem itens`);
  console.table(table);
  await browser.close();
} finally {
  server.kill();
}
