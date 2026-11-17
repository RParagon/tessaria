import { test, expect } from '@playwright/test';
import { newGame } from './helpers.js';
import { CLASSES, simSource } from '../../tools/balance-core.js';

// Teste lento (@slow): rode com `npm run test:balance`.
// Faixas combinadas para as classes (dano por segundo, nível 10, sem itens):
//  - em alvo único, nenhuma classe passa de 130% da mais fraca
//  - a Lâmina (corpo a corpo, mais risco) bate pelo menos tanto quanto as outras
//    em alvo único (margem de 3% para a variação dos críticos aleatórios)
//  - em grupo, o Arcano não fica abaixo de 45% da Lâmina
test('@slow classes dentro das faixas de equilíbrio', async ({ browser }) => {
  test.setTimeout(900_000);
  const r = {};
  for (const cls of CLASSES) {
    const page = await browser.newPage();
    await newGame(page, { cls });
    r[cls] = await page.evaluate(src => __T.ev(src), simSource(10));
    await page.close();
  }
  console.table(r);
  const singles = CLASSES.map(c => r[c].dps_alvo);
  expect(Math.max(...singles) / Math.min(...singles)).toBeLessThan(1.3);
  expect(r.lamina.dps_alvo).toBeGreaterThanOrEqual(Math.max(r.arcano.dps_alvo, r.arco.dps_alvo) * .97);
  expect(r.arcano.dps_grupo8 / r.lamina.dps_grupo8).toBeGreaterThan(.45);
});
