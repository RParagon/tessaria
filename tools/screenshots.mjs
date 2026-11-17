// Tira as imagens do README direto do jogo (build de teste).
// Uso: npm run build:test && node tools/screenshots.mjs
import { chromium, devices } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORT = 4177, OUT = 'docs/img';
mkdirSync(OUT, { recursive: true });
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-test', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const launch = { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}) };

async function start(page, cls = 'lamina') {
  await page.goto(`http://localhost:${PORT}/?debug=1`);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* */ } });
  await page.reload();
  await page.waitForFunction(() => window.__T && document.querySelector('#mNew'));
  await wait(800);
  await page.click('#mNew');
  await page.evaluate(c => { __T.G.char.cls = c; __T.G.char.name = 'Lume'; }, cls);
  await page.click('#cGo');
  for (let i = 0; i < 6; i++) { if (!(await page.locator('#story').isVisible())) break; await page.click('#story', { timeout: 2000 }).catch(() => {}); await wait(120); }
  await page.waitForFunction(() => __T.P && __T.RG && __T.RG.key === 'hub');
  await page.evaluate(() => { const s = __T.G.save; Object.assign(s.bosses, { forest: true, crypt: true, peaks: true }); Object.assign(s.met, { ysolde: true, ysolde2: true, desf2: true, act2y: true, diffTip: true, wildTip: true, houseTip: true }); s.ended = 'B'; s.lvl = 16; s.gold = 60000; });
}
const travel = async (page, k) => { await page.evaluate(k => __T.travel(k), k); await page.waitForFunction(k => !__T.G.traveling && __T.RG.key === k, k, { timeout: 90000 }); };
const clean = async page => { await page.evaluate(() => { document.querySelector('#toast').innerHTML = ''; if (__T.P) { __T.P.iframe = 0; __T.P.hp = __T.P.maxHp; __T.G.hurt = 0; } }); await wait(120); };

try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break; } catch { /* */ } await wait(250); }
  const browser = await chromium.launch(launch);
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await start(page, 'arcano');

  // vila
  await travel(page, 'hub');
  await page.evaluate(() => { __T.P.x = 41; __T.P.z = 36; __T.P.yaw = 2.6; });
  await wait(3500); await clean(page);
  await page.screenshot({ path: `${OUT}/vila.png` });

  // hidra (imagem principal)
  await travel(page, 'swamp');
  await page.evaluate(() => { __T.P.iframe = 1e9; const R = __T.RG.rooms.find(r => r.kind === 'boss'); __T.P.x = R.wx; __T.P.z = R.wz + 7; });
  for (let i = 0; i < 30; i++) { if (await page.evaluate(() => __T.G.mode === 'dialog')) await page.evaluate(() => { const b = [...document.querySelectorAll('#dialog button')].find(x => x.offsetParent); if (b) b.click(); else __T.advanceDialog(); }); await wait(150); }
  await page.waitForFunction(() => __T.boss && __T.boss.spawnT <= 0, null, { timeout: 30000 });
  await page.evaluate(() => { const R = __T.RG.rooms.find(r => r.kind === 'boss'); __T.P.x = R.wx + 1.5; __T.P.z = R.wz + 5.2; });
  await page.keyboard.down('KeyJ'); await wait(2600); await page.keyboard.up('KeyJ'); await clean(page);
  await page.screenshot({ path: `${OUT}/hero.png` });

  // ermos
  await travel(page, 'wilds');
  await page.evaluate(() => { __T.P.iframe = 1e9; const r = __T.RG.rooms.find(r => r.zone === 3 && r.en && r.en.urso); __T.P.x = r.wx + 3; __T.P.z = r.wz + 3; });
  await wait(4500); await clean(page);
  await page.screenshot({ path: `${OUT}/ermos.png` });

  // casa mobiliada
  await page.evaluate(() => { const h = __T.H(); h.owned = true; for (const k of ['cama', 'lareira', 'jardim', 'estante', 'bancada', 'mapa', 'altar', 'estatua']) h.f[k] = true; __T.G.save.st = { gk: ['spider', 'knight'] }; });
  await travel(page, 'home');
  await page.evaluate(() => { __T.P.x = 16; __T.P.z = 15.5; __T.P.yaw = 3.1; });
  await wait(3500); await clean(page);
  await page.screenshot({ path: `${OUT}/casa.png` });
  await page.close();

  // celular na horizontal
  const ctx = await browser.newContext({ ...devices['Pixel 7 landscape'] });
  const ph = await ctx.newPage();
  await start(ph, 'arco');
  await travel(ph, 'wilds');
  await ph.evaluate(() => { __T.P.iframe = 1e9; const r = __T.RG.rooms.find(r => r.zone === 1 && r.en); __T.P.x = r.wx + 3; __T.P.z = r.wz + 3; });
  await wait(3500); await clean(ph);
  await ph.screenshot({ path: `${OUT}/celular.png` });
  await browser.close();
  console.log('imagens em', OUT);
} finally {
  server.kill();
}
