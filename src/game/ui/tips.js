/* Fios de Tessária · Primeiros passos: dicas curtas, uma por vez, na hora em que fazem sentido */
// Cada dica aparece quando a situação acontece (o primeiro monstro por perto, o primeiro item, a vida baixa...)
// e some sozinha quando o jogador faz a ação (ou toca no ✕). O que já foi aprendido fica no save (s.tips).
// Quem já tem experiência (nível 5 ou 30 minutos de jogo) não vê as dicas. Dá para desligar no menu.

const TIPS = [
  { id: 'mover', when: () => G.tipMoved !== undefined, done: () => G.tipMoved > 6,
    k: 'Ande com <kbd>WASD</kbd> ou as setas. O mouse mira os ataques.', t: 'Arraste o dedo no lado esquerdo da tela para andar.' },
  { id: 'falar', when: s => !s.met.ysolde && RG && RG.key === 'hub', done: s => !!s.met.ysolde,
    k: 'Siga o <b>objetivo</b> no canto da tela: fale com a Anciã Ysolde. Chegue perto e aperte <kbd>E</kbd>.', t: 'Siga o <b>objetivo</b> no canto da tela: fale com a Anciã Ysolde. Chegue perto e toque em <b>USAR</b>.' },
  { id: 'atacar', when: () => enemyNear(9), done: s => s.kills > 0,
    k: 'Monstro! Segure o <b>botão esquerdo</b> (ou <kbd>J</kbd>) para atacar. Os golpes seguem a mira do mouse.', t: 'Monstro! Segure <b>ATACAR</b> para golpes seguidos.' },
  { id: 'esquiva', when: s => s.kills >= 1 && enemyNear(9), done: () => P.dashT > 0,
    k: '<kbd>Espaço</kbd>: esquiva. Um salto rápido em que nada acerta você. Use para fugir dos golpes marcados no chão.', t: '<b>ESQUIVA</b>: um salto rápido em que nada acerta você. Use para fugir dos golpes marcados no chão.' },
  { id: 'habilidade', when: s => s.kills >= 3 && enemyNear(10), done: () => P.skillCd > 0,
    k: '<b>Botão direito</b> (ou <kbd>K</kbd>): a habilidade da sua classe. Ela recarrega sozinha.', t: '<b>HABIL.</b>: a habilidade da sua classe. Ela recarrega sozinha.' },
  { id: 'pocao', when: () => P.hp < P.maxHp * .45 && P.dieT < 0, done: s => s.potions < (G.tipPot ?? s.potions) || P.hp > P.maxHp * .8,
    k: 'Vida baixa! <kbd>Q</kbd> bebe uma poção. Elas voltam quando você descansa na vila.', t: 'Vida baixa! Toque no <b>frasco</b> para beber uma poção. Elas voltam quando você descansa na vila.' },
  { id: 'item', when: s => s.inv.length > 0, done: () => !!(G.menuSeen && G.menuSeen.inv),
    k: 'Item novo na bolsa! Aperte <kbd>I</kbd> e toque no item para comparar e equipar.', t: 'Item novo na bolsa! Toque em <b>Bolsa</b> e no item para comparar e equipar.' },
  { id: 'golpe', when: () => (G.ult || 0) >= 1, done: () => !!G.ultFiring || P.ultT > 0 || (G.ult || 0) < 1,
    k: 'Golpe do Tear carregado! Aperte <kbd>R</kbd> para o ataque especial.', t: 'Golpe do Tear carregado! Toque em <b>GOLPE</b> para o ataque especial.' },
  { id: 'grimorio', when: s => s.lvl >= 2, done: () => !!(G.menuSeen && G.menuSeen.skills),
    k: 'Você subiu de nível! Runas e talentos ficam no <b>Grimório</b> (<kbd>G</kbd>).', t: 'Você subiu de nível! Runas e talentos ficam no <b>Grimório</b>.' },
];
const enemyNear = r => typeof enemies !== 'undefined' && !!P && enemies.some(e => e.dieT < 0 && !(e.spawnT > 0) && Math.hypot(e.x - P.x, e.z - P.z) < r);
let tipCur = null, tipShownAt = 0;
function tipsOn() {
  const s = G.save; if (!s || G.settings.tips === false) return false;
  s.tips = s.tips || {};
  if (s.tips._vet === undefined) s.tips._vet = (s.lvl >= 5 || (s.time || 0) > 1800) ? 1 : 0;   // veteranos: sem dicas
  return !s.tips._vet;
}
function tipBox() { let el = $('#tip'); if (!el) { el = document.createElement('div'); el.id = 'tip'; el.setAttribute('role', 'status'); ($('#hud') || document.body).appendChild(el); } return el; }   // dentro do HUD: some junto com ele (título, telas cheias)
function tipHide() { tipCur = null; const el = $('#tip'); if (el) el.hidden = true; }
function tipLearn(id) { const s = G.save; if (!s) return; s.tips = s.tips || {}; if (!s.tips[id]) { s.tips[id] = 1; writeSave(); } if (tipCur && tipCur.id === id) tipHide(); }
/** Chamado pelo HUD a cada quadro: cuida da dica atual e escolhe a próxima. */
function tipsTick() {
  if (tipCur && G.save && P && tipCur.done(G.save)) { tipLearn(tipCur.id); sfx('pick'); return; }   // vale também com um menu aberto (Bolsa, Grimório)
  if (!P || G.mode !== 'play' || !tipsOn()) { if (tipCur) { const el = $('#tip'); if (el) el.hidden = true; } return; }
  const s = G.save;
  if (G.tipMoved === undefined && RG) { G.tipMoved = 0; G.tipPos = [P.x, P.z]; }
  if (G.tipPos) { G.tipMoved += Math.hypot(P.x - G.tipPos[0], P.z - G.tipPos[1]); G.tipPos = [P.x, P.z]; }
  if (tipCur) {
    if (tipCur.done(s)) { tipLearn(tipCur.id); sfx('pick'); return; }
    const el = $('#tip'); if (el && el.hidden) el.hidden = false;
    return;
  }
  if (performance.now() - tipShownAt < 2500) return;   // um respiro entre uma dica e outra
  for (const T of TIPS) {
    if (s.tips[T.id] || !T.when(s)) continue;
    if (T.done(s)) { s.tips[T.id] = 1; continue; }   // já sabia
    if (T.id === 'pocao') G.tipPot = s.potions;
    tipCur = T; tipShownAt = performance.now();
    const el = tipBox(); el.hidden = false; el.innerHTML = `<b class="tl">PRIMEIROS PASSOS</b><span>${G.touch ? T.t : T.k}</span><button class="x" aria-label="Entendi">✕</button>`;
    el.querySelector('.x').onclick = e => { e.stopPropagation(); tipLearn(T.id); };
    break;
  }
}
