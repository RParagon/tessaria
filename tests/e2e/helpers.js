// Utilitários compartilhados pelos testes de ponta a ponta.
// O jogo expõe um gancho de testes em `window.__T` quando aberto com ?debug=1
// (ou em modo dev). O build de teste (`npm run build:test`) ainda inclui
// `__T.ev`, que avalia código dentro do escopo do jogo.

/** Abre o jogo, cria um personagem novo e espera chegar à Vila Brasa. */
export async function newGame(page, { cls = 'lamina', name } = {}) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|fonts\.g/.test(m.text())) errors.push(m.text()); });
  await page.goto('/?debug=1');
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* sem storage */ } });
  await page.reload();
  await page.waitForFunction(() => window.__T && document.querySelector('#mNew'), null, { timeout: 30_000 });
  await page.evaluate(() => { __T.G.forceHour = 12; __T.G.forceWeather = 'limpo'; });   // meio-dia: a noite muda dano, XP e loot (o teste da noite força a hora)
  await page.waitForTimeout(800);
  await page.click('#mNew');
  await page.evaluate(([c, n]) => { __T.G.char.cls = c; if (n) __T.G.char.name = n; }, [cls, name]);
  await page.click('#cGo');
  for (let i = 0; i < 8; i++) { const story = page.locator('#story'); if (!(await story.isVisible())) break; await story.click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(150); }
  await page.waitForFunction(() => __T.P && __T.RG && __T.RG.key === 'hub', null, { timeout: 30_000 });
  return errors;
}

/** Avalia uma função no contexto da página. */
export const T = (page, fn, arg) => page.evaluate(fn, arg);

/** Viaja para uma região e espera o carregamento. */
export async function travel(page, key) {
  await page.evaluate(k => __T.travel(k), key);
  await page.waitForFunction(k => !__T.G.traveling && __T.RG.key === k, key, { timeout: 90_000 });
}

/** Passa por todos os diálogos abertos, escolhendo a opção que contém `prefer`. */
export async function skipDialogs(page, prefer) {
  const seen = [];
  for (let i = 0; i < 40; i++) {
    if ((await page.evaluate(() => __T.G.mode)) !== 'dialog') break;
    seen.push(await page.evaluate(() => document.querySelector('#dTxt').textContent));
    const buttons = await page.$$('#dialog button');
    let clicked = false;
    for (const b of buttons) { if (!(await b.isVisible())) continue; const t = await b.textContent(); if (!prefer || t.includes(prefer)) { await b.click(); clicked = true; break; } }
    if (!clicked) for (const b of buttons) if (await b.isVisible()) { await b.click(); clicked = true; break; }
    if (!clicked) await page.evaluate(() => __T.advanceDialog());
    await page.waitForTimeout(120);
  }
  return seen;
}

/** Marca o progresso da história para pular etapas nos testes. */
export async function unlock(page, { bosses = [], ended = false, lvl, gold, met = {} } = {}) {
  await page.evaluate(([b, e, l, g, m]) => {
    const s = __T.G.save;
    for (const k of b) s.bosses[k] = true;
    Object.assign(s.met, { ysolde: true, ysolde2: true, desf2: true, diffTip: true, wildTip: true, houseTip: true }, m);
    if (e) { s.ended = 'B'; s.endings = ['B']; }
    if (l) s.lvl = l;
    if (g !== undefined) s.gold = g;
  }, [bosses, ended, lvl, gold, met]);
}

/** Tira da vila os moradores que caminham pelo relógio (senão um deles pode passar mais perto do herói que o alvo do teste). */
export const calmVillage = page => page.evaluate(() => __T.ev('npcs.forEach(n => { if (n.wander) n.visible = false; })'));
