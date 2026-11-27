// Passeia pelo jogo em outro idioma (menus, regiões, painéis) e lista os textos que apareceram sem tradução,
// já no formato de chave (números → {n}). Complementa o tools/i18n-extract.mjs, que lê o código.
// Uso: npm run build:test && node tools/i18n-harvest.mjs [en] [--out arquivo.json]
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const lang = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'en';
const oi = process.argv.indexOf('--out'), out = oi > 0 ? process.argv[oi + 1] : null;
const PORT = 4177;
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-test', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const wait = ms => new Promise(r => setTimeout(r, ms));
try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break; } catch { /* subindo */ } await wait(250); }
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}) });
  const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
  await page.goto(`http://localhost:${PORT}/?debug=1`);
  await page.evaluate(l => { localStorage.clear(); localStorage.setItem('tess.lang', l); }, lang);
  await page.reload();
  await page.waitForFunction(() => window.__T && document.querySelector('#mNew'));
  await page.click('#mNew'); await wait(400); await page.click('#cGo');
  for (let i = 0; i < 8; i++) { if (!(await page.locator('#story').isVisible())) break; await page.click('#story', { timeout: 2000 }).catch(() => {}); await wait(150); }
  await page.waitForFunction(() => __T.RG && __T.RG.key === 'hub' && __T.G.mode === 'play', null, { timeout: 30000 });
  const ev = s => page.evaluate(x => __T.ev(x), s);
  await ev("const s = G.save; s.gold = 99999; s.lvl = 12; s.inv.push(makeItem('weapon', 2, 3), makeItem('armor', 2, 2), makeItem('charm', 2, 4)); s.house = Object.assign({ f: {}, stash: [], cap: 20 }, s.house || {}, { owned: true }); s.rod = true; s.map = true; writeSave()");
  for (const m of ['inv', 'skills', 'journal', 'pause', 'profile', 'home', 'fishery', 'wshop']) { await ev(`try { openMenu('${m}') } catch (e) {}`); await wait(500); await ev('closeMenus()'); await wait(150); }
  for (const r of ['forest', 'crypt', 'peaks', 'swamp', 'glass', 'wilds', 'home', 'taverna', 'hub']) { await ev(`travel('${r}')`); await wait(1800); }
  await ev("toast('NÍVEL 2', true)"); await wait(300);
  const misses = await page.evaluate(() => [...window.TessI18n.__misses].sort());
  console.log(`textos vistos sem tradução (${lang}): ${misses.length}`);
  if (out) { writeFileSync(out, JSON.stringify(misses, null, 1)); console.log(`→ ${out}`); } else console.log(misses.join('\n'));
  await browser.close();
} finally { server.kill(); }
