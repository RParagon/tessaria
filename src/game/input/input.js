/* Fios de Tessária · Entrada: teclado, mouse, toque */
/* =========================================================
   ENTRADA
   ========================================================= */
const keys = new Set();
const input = { atk: false, mouseX: 0, mouseY: 0, mouseT: -9, joy: { on: false, id: null, ox: 0, oy: 0, x: 0, y: 0 } };
function setTouch(on) { if (G.touch === on) return; G.touch = on; refreshHudVis(); updateUiScale(); }
/** PC: a interface cresce com a janela (1x em 1100x640, até 1,75x). No celular fica 1x. */
function updateUiScale() { const ui = G.touch ? 1 : Math.max(1, Math.min(1.75, Math.min(innerWidth / 1100, innerHeight / 640))); document.documentElement.style.setProperty('--ui', ui.toFixed(3)); document.documentElement.style.setProperty('--uim', Math.min(ui, 1.3).toFixed(3)); }
addEventListener('resize', updateUiScale); updateUiScale();
/** Zoom: no jogo, a distância da câmera (lembrada); no espelho, a aproximação do personagem. */
function camZoom(dir) {
  if (G.mode === 'create' || G.menu === 'inv') { G.pvZoom = clamp((G.pvZoom || 1) * (dir > 0 ? 1.1 : 1 / 1.1), .45, 1.25); return; }
  G.settings.zoom = clamp((G.settings.zoom || 1) * (dir > 0 ? 1.08 : 1 / 1.08), .55, 1.25); saveSettings();
  const sz = $('#sZoom'); if (sz) sz.value = G.settings.zoom;
}
canvas.addEventListener('wheel', e => { if (G.mode === 'play' || G.mode === 'create' || G.menu === 'inv') { e.preventDefault(); camZoom(Math.sign(e.deltaY)); } }, { passive: false });
function goLandscape() { try { const el = document.documentElement; if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).then(() => { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => { }); }).catch(() => { }); else if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }
addEventListener('keydown', e => {
  if (e.target && ((e.target.tagName === 'INPUT' && e.target.type === 'text') || e.target.tagName === 'TEXTAREA')) { if (e.code === 'Escape') e.target.blur(); return; }
  setTouch(false);
  const k = e.code;
  if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k) && G.mode !== 'title') e.preventDefault();
  if (e.repeat) { keys.add(k); return; }
  keys.add(k);
  if (G.mode === 'dialog') { if (k === 'Space' || k === 'Enter' || k === 'KeyE') advanceDialog(); return; }
  if (G.mode === 'story') { if (k === 'Space' || k === 'Enter' || k === 'KeyE') storyNext(); return; }
  if (G.mode === 'menu') { if (k === 'Escape' || (k === 'Tab' && !$('#journal').hidden) || (k === 'KeyI' && !$('#inv').hidden) || (k === 'KeyM' && !$('#wmap').hidden)) { G.wmTravel = null; closeMenus(); } return; }
  if (G.mode !== 'play') return;
  if (k === 'Escape') openMenu('pause');
  else if (k === 'Tab') openMenu('journal');
  else if (k === 'KeyI' || k === 'KeyB') openMenu('inv');
  else if (k === 'KeyM' && RG && RG.wild) { G.wmTravel = null; openMenu('wmap'); }
  else if (k === 'KeyG') openMenu('skills');
  else if (k === 'Space' || k === 'ShiftLeft' || k === 'ShiftRight') doDash();
  else if (k === 'Equal' || k === 'NumpadAdd') camZoom(-1);
  else if (k === 'Minus' || k === 'NumpadSubtract') camZoom(1);
  else if (k === 'KeyH') { const el = $('#keys'); el.classList.toggle('faded'); G.keysT = 1e9; }
  else if (k === 'KeyK' || k === 'KeyL') doSkill();
  else if (k === 'KeyQ') drinkPotion();
  else if (k === 'KeyE' || k === 'Enter') interact();
  else if (k === 'KeyJ') input.atk = true;
});
addEventListener('keyup', e => { keys.delete(e.code); if (e.code === 'KeyJ') input.atk = false; });
addEventListener('blur', () => { keys.clear(); input.atk = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('pointerdown', e => { if (e.pointerType === 'touch') setTouch(true); }, true);
canvas.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { input.mouseX = e.clientX; input.mouseY = e.clientY; input.mouseT = G.time; } });
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'mouse') { setTouch(true); return; }
  setTouch(false);
  input.mouseX = e.clientX; input.mouseY = e.clientY; input.mouseT = G.time;
  if (G.mode === 'create' || (G.mode === 'menu' && G.menu === 'inv')) { dragC = { x: e.clientX }; return; }
  if (G.mode !== 'play') return;
  if (e.button === 0) input.atk = true; else if (e.button === 2) doSkill();
});
let dragC = null;
addEventListener('pointerup', e => { if (e.pointerType === 'mouse' && e.button === 0) input.atk = false; dragC = null; });
addEventListener('pointermove', e => { if (dragC && (G.mode === 'create' || G.menu === 'inv')) { creatorYaw += (e.clientX - dragC.x) * .01; dragC.x = e.clientX; } });
canvas.addEventListener('touchstart', e => { if ((G.mode === 'create' || G.menu === 'inv') && e.touches[0]) dragC = { x: e.touches[0].clientX }; }, { passive: true });
canvas.addEventListener('touchmove', e => { if (dragC && e.touches[0]) { creatorYaw += (e.touches[0].clientX - dragC.x) * .012; dragC.x = e.touches[0].clientX; } }, { passive: true });
const jz = $('#joyZone'), jb = $('#joyBase'), jk = $('#joyKnob');
jz.addEventListener('pointerdown', e => { setTouch(true); const J = input.joy; J.on = true; J.id = e.pointerId; J.ox = e.clientX; J.oy = e.clientY; J.x = J.y = 0; jz.setPointerCapture(e.pointerId); jb.hidden = false; jb.style.left = e.clientX + 'px'; jb.style.top = e.clientY + 'px'; jk.style.transform = 'translate(0,0)'; });
jz.addEventListener('pointermove', e => { const J = input.joy; if (!J.on || e.pointerId !== J.id) return; let dx = e.clientX - J.ox, dy = e.clientY - J.oy; const l = Math.hypot(dx, dy), m = 46; if (l > m) { dx *= m / l; dy *= m / l; } J.x = dx / m; J.y = dy / m; jk.style.transform = `translate(${dx}px,${dy}px)`; });
const joyEnd = e => { const J = input.joy; if (e.pointerId !== J.id) return; J.on = false; J.x = J.y = 0; jb.hidden = true; };
jz.addEventListener('pointerup', joyEnd); jz.addEventListener('pointercancel', joyEnd);
const tbtn = (id, down, up) => { const el = $(id), off = () => el.classList.remove('on'); el.addEventListener('pointerdown', e => { e.preventDefault(); setTouch(true); el.classList.add('on'); down(); }); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off); if (up) { el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up); } };
$('#prompt').addEventListener('pointerdown', e => { if (G.mode === 'play') { e.preventDefault(); interact(); } });
tbtn('#tAtk', () => { if (G.mode === 'play') input.atk = true; }, () => input.atk = false);
tbtn('#tDash', () => { if (G.mode === 'play') doDash(); });
tbtn('#tSkill', () => { if (G.mode === 'play') doSkill(); });
tbtn('#tPot', () => { if (G.mode === 'play') drinkPotion(); });
tbtn('#tUse', () => { if (G.mode === 'play') interact(); });

