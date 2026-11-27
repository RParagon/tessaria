// Tabela de progressão: uma linha por região/nível, com as metas de ritmo e de combate.
// Metas (ponto de partida de design, ver docs/BALANCE.md):
//   monstro comum morre em 2 a 4 golpes · o herói aguenta 5 a 8 golpes · 3 a 5 min por nível no começo.
// Usa o código do jogo (dist-test): stats(), monsterScale(), xpNeed() e itens gerados no nível da região.
// Uso: npm run build:test && node tools/progression-table.mjs [classe]   (sai com erro se algo fugir muito das metas)
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 4176;
const ONLY = process.argv[2];
const CLASSES = ONLY ? [ONLY] : ['lamina', 'arcano', 'arco'];
// região, nível do herói, monstro típico, nível de item (tier) e quantos monstros por minuto se mata ali (estimativa)
const ROWS = [
  ['forest', 1, 'gosmo', 1, 7], ['forest', 3, 'wisp', 1, 7], ['crypt', 4, 'skel', 2, 6], ['crypt', 6, 'bat', 2, 6], ['peaks', 8, 'imp', 3, 5],
  ['peaks', 11, 'beetle', 3, 5], ['swamp', 13, 'sapo', 4, 5], ['swamp', 15, 'afogado', 4, 5], ['glass', 17, 'sentinela', 5, 4], ['glass', 20, 'fantasma', 5, 4],
];
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-test', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const wait = ms => new Promise(r => setTimeout(r, ms));
let bad = 0;
try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break; } catch { /* subindo */ } await wait(250); }
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}) });
  for (const cls of CLASSES) {
    const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
    await page.goto(`http://localhost:${PORT}/?debug=1`);
    await page.waitForFunction(() => window.__T && document.querySelector('#mNew'));
    await page.click('#mNew');
    await page.evaluate(c => { __T.G.char.cls = c; }, cls);
    await page.click('#cGo');
    for (let i = 0; i < 6; i++) { if (!(await page.locator('#story').isVisible())) break; await page.click('#story', { timeout: 2000 }).catch(() => {}); await wait(150); }
    await page.waitForFunction(() => __T.P && __T.RG && __T.RG.key === 'hub');
    const rows = await page.evaluate(R => __T.ev(`(() => {
      const out = [], R = ${JSON.stringify(R)}, s = G.save, rg0 = RG, eq0 = s.eq;
      for (const [reg, L, mon, tier, kpm] of R) {
        s.lvl = L; s.eq = { weapon: makeItem('weapon', tier, 2), armor: makeItem('armor', tier, 2), charm: makeItem('charm', tier, 1) };
        RG = { key: reg }; const ms = monsterScale(); RG = rg0;
        const st = stats(), d = DEF[mon], ehp = d.hp * ms.hp, edmg = d.dmg * ms.dmg * (1 - st.dr), exp = d.xp * ms.xp;
        const hk = Math.ceil(ehp / st.dmg), tk = +(hk * st.atkCd).toFixed(2), hd = Math.ceil(st.maxHp / Math.max(1, edmg)), need = xpNeed(L), kills = Math.ceil(need / exp);
        out.push({ regiao: reg, nivel: L, monstro: mon, vida: Math.round(st.maxHp), dano: Math.round(st.dmg), golpes_p_matar: hk, seg_p_matar: tk, golpes_p_morrer: hd, xp_prox: need, abates_p_nivel: kills, min_p_nivel: +(kills / kpm).toFixed(1) });
      }
      s.eq = eq0; return out; })()`), ROWS);
    console.log(`\nProgressão · ${cls} (Normal, equipamento típico da região)`);
    console.table(rows);
    for (const r of rows) {
      const flags = [];
      // Matar: em segundos (o Arco bate mais rápido que a Lâmina; 2 a 4 golpes de espada ≈ 0,7 a 1,8 s).
      if (r.seg_p_matar < .5 || r.seg_p_matar > 2.2) flags.push(`${r.seg_p_matar} s para matar (meta 0,7-1,8 s)`);
      // Morrer: a Lâmina é o tanque (7 a 11); as outras, 5 a 9.
      const [lo, hi] = cls === 'lamina' ? [6, 12] : [4, 10];
      if (r.golpes_p_morrer > hi || r.golpes_p_morrer < lo) flags.push(`golpes para morrer ${r.golpes_p_morrer} (meta ${cls === 'lamina' ? '7-11' : '5-9'})`);
      if (r.nivel <= 5 && r.min_p_nivel < 1.5) flags.push(`${r.min_p_nivel} min por nível (meta 3-5 no começo)`);
      if (flags.length) { bad++; console.log(`  ⚠ ${cls} · ${r.regiao} nível ${r.nivel}: ${flags.join(' · ')}`); }
    }
    await page.close();
  }
  await browser.close();
} finally { server.kill(); }
if (bad) { console.log(`\n${bad} linha(s) fora das metas.`); process.exitCode = 1; } else console.log('\nTudo dentro das metas.');
