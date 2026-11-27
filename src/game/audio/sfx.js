/* Fios de Tessária (módulo ES) · Efeitos sonoros sintetizados */
import { G } from '../core/game.js';
/* =========================================================
   ÁUDIO (sintetizado)
   ========================================================= */
let AC = null, lastSfx = {};   /* privado */
/** O contexto de áudio único do jogo (efeitos e música). create=false só devolve o que já existe. */
export function audioCtx(create = true) { if (!AC && create) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } return AC; }
export function sfx(type) {
  if (!G.settings.sound) return;
  const now = performance.now(); if (lastSfx[type] && now - lastSfx[type] < 45) return; lastSfx[type] = now;
  try { if (!audioCtx()) return; if (AC.state === 'suspended') AC.resume(); } catch (e) { return; }
  const t = AC.currentTime, g = AC.createGain(); g.connect(AC.destination);
  const osc = (type2, f0, f1, dur, vol) => { const o = AC.createOscillator(); o.type = type2; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); const gg = AC.createGain(); gg.gain.setValueAtTime(vol, t); gg.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(gg); gg.connect(g); o.start(t); o.stop(t + dur + .02); };
  const noise = (dur, vol, f) => { const b = AC.createBuffer(1, AC.sampleRate * dur, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); const s = AC.createBufferSource(); s.buffer = b; const fl = AC.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = f; const gg = AC.createGain(); gg.gain.value = vol; s.connect(fl); fl.connect(gg); gg.connect(g); s.start(t); };
  g.gain.value = .5;
  switch (type) {
    case 'swing': noise(.12, .25, 2400); break;
    case 'shoot': osc('square', 880, 440, .1, .06); break;
    case 'bow': osc('triangle', 420, 140, .12, .1); noise(.07, .15, 3200); break;
    case 'hit': osc('square', 220, 90, .08, .1); noise(.06, .2, 1500); break;
    case 'hurt': osc('sawtooth', 160, 60, .25, .14); break;
    case 'pick': { const f = 1100 + Math.min(1100, (G.pickN || 0) * 55); osc('square', f, f * 1.4, .06, .035); } break;
    case 'legend': [784, 988, 1175, 1568].forEach((f, i) => { const o = AC.createOscillator(), gg = AC.createGain(); o.type = 'triangle'; o.frequency.value = f; gg.gain.setValueAtTime(0, t + i * .07); gg.gain.linearRampToValueAtTime(.08, t + i * .07 + .01); gg.gain.exponentialRampToValueAtTime(.001, t + i * .07 + .6); o.connect(gg); gg.connect(g); o.start(t + i * .07); o.stop(t + i * .07 + .65); }); break;
    case 'epic': osc('triangle', 660, 990, .25, .07); osc('triangle', 880, 1320, .35, .05); break;
    case 'beat': osc('sine', 70, 40, .12, .25); break;
    case 'lvl': [523, 659, 784, 1046].forEach((f, i) => { const o = AC.createOscillator(), gg = AC.createGain(); o.type = 'square'; o.frequency.value = f; gg.gain.setValueAtTime(0, t + i * .08); gg.gain.linearRampToValueAtTime(.06, t + i * .08 + .01); gg.gain.exponentialRampToValueAtTime(.001, t + i * .08 + .2); o.connect(gg); gg.connect(g); o.start(t + i * .08); o.stop(t + i * .08 + .22); }); break;
    case 'dash': noise(.15, .18, 900); break;
    case 'boom': noise(.45, .4, 500); osc('sine', 120, 40, .4, .25); break;
    case 'thunder': noise(.25, .5, 1800); noise(2.8, .55, 140); noise(1.8, .35, 320); osc('sine', 55, 28, 2.2, .3); break;   // trovão: estalo e ronco longo
    case 'roar': noise(.9, .35, 380); osc('sawtooth', 90, 45, .9, .12); break;
    case 'open': osc('triangle', 330, 660, .2, .1); break;
    case 'frag': [660, 880, 1320].forEach((f, i) => osc('triangle', f, f, .35 + i * .1, .06)); break;
    case 'ui': osc('square', 600, 700, .04, .04); break;
    case 'skill': osc('sawtooth', 300, 900, .3, .08); noise(.3, .2, 3000); break;
    case 'heal': osc('triangle', 500, 1000, .3, .08); break;
    case 'clink': osc('triangle', 1800, 1500, .12, .03); break;
  }
}


/* Chuva: ruído contínuo filtrado (mais forte na tempestade; abafado dentro de casa). level 0 a 1. */
let RAIN = null;   /* privado */
export function rainAudio(level, muffled) {
  if (!AC) return;
  if (!G.settings.sound) level = 0;
  if (!RAIN) {
    if (level <= .01) return;
    const b = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < .002 ? 3 : 1);   // chiado com alguns pingos
    const src = AC.createBufferSource(); src.buffer = b; src.loop = true;
    const hp = AC.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 280;
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2600;
    const g = AC.createGain(); g.gain.value = 0;
    src.connect(hp); hp.connect(f); f.connect(g); g.connect(AC.destination); src.start();
    RAIN = { src, f, g };
  }
  const t = AC.currentTime;
  RAIN.g.gain.setTargetAtTime(level * (muffled ? .05 : .11), t, .8);
  RAIN.f.frequency.setTargetAtTime(muffled ? 700 : 2600, t, .5);
}
