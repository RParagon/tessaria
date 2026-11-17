// Gera os ícones do jogo (web, PWA e Android) em pixel art, a partir de um
// desenho 32×32 feito em código. Uso: npm run icons
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';

const OUT = 'public/icons';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');

const images = await page.evaluate(() => {
  // Desenho base 32×32: agulha dourada de Tecelão atravessando um fio de luz.
  const base = document.createElement('canvas'); base.width = base.height = 32;
  const g = base.getContext('2d');
  const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const d = Math.hypot(x - 15.5, y - 15.5) / 22, t = Math.min(1, d);
    const r = Math.round(40 - 28 * t), gg = Math.round(24 - 16 * t), b = Math.round(70 - 46 * t);
    const dither = ((x + y) & 1) && t > .55 && t < .75 ? 8 : 0;
    px(x, y, `rgb(${r - dither},${gg - dither},${b - dither})`);
  }
  // fio (curva) em ciano e rosa
  for (let i = 0; i <= 60; i++) {
    const u = i / 60, x = Math.round(4 + u * 24), y = Math.round(22 - Math.sin(u * Math.PI * 1.5) * 7);
    px(x, y, '#3fd1d0'); if (i % 3 === 0) px(x, y + 1, '#a35ee0');
  }
  // agulha diagonal
  const needle = [[8, 25], [9, 24], [10, 23], [11, 22], [12, 21], [13, 20], [14, 19], [15, 18], [16, 17], [17, 16], [18, 15], [19, 14], [20, 13], [21, 12], [22, 11], [23, 10], [24, 9]];
  for (const [x, y] of needle) { px(x, y, '#f2b84b'); px(x + 1, y, '#ffe9a8'); px(x - 1, y + 1, '#8a5a1a'); }
  // olho da agulha
  for (const [x, y] of [[24, 7], [25, 7], [26, 8], [26, 9], [25, 10], [24, 10], [23, 9], [23, 8]]) px(x, y, '#ffe9a8');
  px(24, 8, '#160826'); px(25, 9, '#160826'); px(24, 9, '#160826'); px(25, 8, '#160826');
  // ponta brilhante e faíscas
  for (const [x, y, c] of [[6, 27, '#ffffff'], [7, 26, '#fff7e6'], [5, 26, '#ffbf3d'], [7, 28, '#ffbf3d'], [27, 4, '#ffe9a8'], [4, 6, '#9cf6ff'], [28, 20, '#de8cff']]) px(x, y, c);

  const render = (size, pad, round) => {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    if (round) { x.beginPath(); x.roundRect(0, 0, size, size, size * .18); x.clip(); }
    x.fillStyle = '#0b0912'; x.fillRect(0, 0, size, size);
    const inner = size - pad * 2; x.drawImage(base, pad, pad, inner, inner);
    return c.toDataURL('image/png');
  };
  const android = {};
  for (const [d, n] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
    android[`mipmap-${d}/ic_launcher.png`] = render(n, 0, true);
    android[`mipmap-${d}/ic_launcher_round.png`] = render(n, 0, true);
    android[`mipmap-${d}/ic_launcher_foreground.png`] = render(Math.round(n * 2.25), Math.round(n * 2.25 * .2), false);
  }
  return { android, web: {
    'icon-64.png': render(64, 0, true),
    'icon-192.png': render(192, 0, true),
    'icon-512.png': render(512, 0, true),
    'icon-maskable-512.png': render(512, 64, false),
    'icon-1024.png': render(1024, 0, false),
  } };
});

const save = (path, url) => writeFileSync(path, Buffer.from(url.split(',')[1], 'base64'));
for (const [name, url] of Object.entries(images.web)) save(`${OUT}/${name}`, url);
console.log('ícones web em', OUT);
const RES = 'android/app/src/main/res';
if (existsSync(RES)) {
  for (const [name, url] of Object.entries(images.android)) save(`${RES}/${name}`, url);
  const bg = `${RES}/values/ic_launcher_background.xml`;
  if (existsSync(bg)) writeFileSync(bg, '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0B0912</color>\n</resources>\n');
  console.log('ícones Android em', RES);
}
await browser.close();
