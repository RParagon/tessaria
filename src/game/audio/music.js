/* Fios de Tessária · Música procedural */
/* =========================================================
   MÚSICA (sequenciador procedural por região)
   ========================================================= */
const MUSIC = {
  title: { bpm: 70, root: 57, mode: [0, 2, 4, 7, 9], prog: [[0, 'M'], [5, 'M'], [9, 'm'], [7, 'M']], lead: 'triangle', arp: 'triangle', bass: 'sine', drums: null, dens: .3, echo: .4, leadOct: 12, pad: true },
  hub: { bpm: 92, root: 57, mode: [0, 2, 4, 7, 9], prog: [[0, 'M'], [9, 'm'], [5, 'M'], [7, 'M']], lead: 'triangle', arp: 'square', bass: 'triangle', drums: 'soft', dens: .48, echo: .25, leadOct: 12, pad: false },
  forest: { bpm: 76, root: 50, mode: [0, 2, 3, 5, 7, 9, 10], prog: [[0, 'm'], [10, 'M'], [5, 'M'], [0, 'm']], lead: 'sine', arp: 'triangle', bass: 'triangle', drums: null, dens: .42, echo: .4, leadOct: 12, pad: true },
  crypt: { bpm: 66, root: 45, mode: [0, 2, 3, 5, 7, 8, 11], prog: [[0, 'm'], [8, 'M'], [5, 'm'], [7, 'M']], lead: 'square', arp: 'sine', bass: 'sawtooth', drums: 'heart', dens: .34, echo: .32, leadOct: 24, pad: true, padT: 'sawtooth' },
  peaks: { bpm: 108, root: 52, mode: [0, 1, 3, 5, 7, 8, 10], prog: [[0, 'm'], [1, 'M'], [0, 'm'], [10, 'M']], lead: 'square', arp: 'triangle', bass: 'sawtooth', drums: 'drive', dens: .45, echo: .2, leadOct: 12, pad: false },
  home: { bpm: 80, root: 60, mode: [0, 2, 4, 7, 9], prog: [[0, 'M'], [5, 'M'], [7, 'M'], [0, 'M']], lead: 'triangle', arp: 'sine', bass: 'sine', drums: null, dens: .3, echo: .45, leadOct: 12, pad: true },
  wilds: { bpm: 100, root: 55, mode: [0, 2, 4, 5, 7, 9, 11], prog: [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']], lead: 'triangle', arp: 'square', bass: 'triangle', drums: 'soft', dens: .45, echo: .3, leadOct: 12, pad: true },
  swamp: { bpm: 72, root: 47, mode: [0, 2, 3, 5, 7, 8, 10], prog: [[0, 'm'], [5, 'm'], [8, 'M'], [7, 'm']], lead: 'sine', arp: 'triangle', bass: 'sawtooth', drums: 'heart', dens: .36, echo: .45, leadOct: 12, pad: true, padT: 'triangle' },
  glass: { bpm: 96, root: 54, mode: [0, 2, 4, 6, 7, 9, 11], prog: [[0, 'M'], [2, 'M'], [11, 'm'], [7, 'M']], lead: 'triangle', arp: 'sine', bass: 'triangle', drums: 'soft', dens: .5, echo: .5, leadOct: 24, pad: true },
  boss2: { bpm: 146, root: 49, mode: [0, 1, 4, 5, 7, 8, 10], prog: [[0, 'M'], [1, 'M'], [8, 'M'], [7, 'm']], lead: 'square', arp: 'sawtooth', bass: 'sawtooth', drums: 'battle', dens: .6, echo: .18, leadOct: 12, pad: false },
  boss: { bpm: 138, root: 50, mode: [0, 2, 3, 5, 7, 8, 10], prog: [[0, 'm'], [8, 'M'], [10, 'M'], [7, 'M']], lead: 'sawtooth', arp: 'square', bass: 'sawtooth', drums: 'battle', dens: .55, echo: .15, leadOct: 12, pad: false },
};
const MUS = { key: null, song: null, master: null, send: null, step: 0, nextT: 0, noise: null };
function ensureAudio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } }
  if (AC.state === 'suspended') AC.resume();
  if (MUS.key && !MUS.master) startSong(MUS.key);
}
addEventListener('pointerdown', ensureAudio, true); addEventListener('keydown', ensureAudio, true);
function genMelody(S) {
  const R = rng(S.bpm * 7 + S.root), out = []; let deg = 3;
  for (let i = 0; i < 64; i++) {
    if (R() > S.dens * (i % 2 === 0 ? 1.35 : .65)) { out.push(null); continue; }
    deg = clamp(deg + Math.round((R() - .5) * 3.2), 0, S.mode.length * 2 - 1);
    out.push(S.root + S.leadOct + S.mode[deg % S.mode.length] + 12 * Math.floor(deg / S.mode.length));
  }
  return out;
}
function setMusic(key) { if (MUS.key === key) return; MUS.key = key; if (AC) startSong(key); }
function startSong(key) {
  const old = MUS.master;
  if (old) { old.gain.setTargetAtTime(0, AC.currentTime, .5); setTimeout(() => { try { old.disconnect(); } catch (e) { } }, 3000); }
  const S = MUSIC[key]; MUS.master = null; MUS.song = null; if (!S) return;
  S.mel = S.mel || genMelody(S);
  const m = AC.createGain(); m.gain.value = 0; m.connect(AC.destination); m.gain.setTargetAtTime(G.settings.music * .8, AC.currentTime, .8);
  const dl = AC.createDelay(1); dl.delayTime.value = 60 / S.bpm * .75; const fb = AC.createGain(); fb.gain.value = S.echo; dl.connect(fb); fb.connect(dl); dl.connect(m);
  const send = AC.createGain(); send.gain.value = .6; send.connect(dl);
  MUS.master = m; MUS.send = send; MUS.song = S; MUS.step = 0; MUS.nextT = AC.currentTime + .15;
}
function mnote(type, midi, t, dur, vol, cut, dest, att = .01) {
  const o = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter();
  o.type = type; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12); f.type = 'lowpass'; f.frequency.value = cut;
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(f); f.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .05);
}
function mnoise(t, vol, hp, dur) {
  if (!MUS.noise) { const b = AC.createBuffer(1, AC.sampleRate * .3, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; MUS.noise = b; }
  const s2 = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s2.buffer = MUS.noise; f.type = 'highpass'; f.frequency.value = hp;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); s2.connect(f); f.connect(g); g.connect(MUS.master); s2.start(t); s2.stop(t + dur + .02);
}
function mkick(t, v) { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + .15); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + .2); o.connect(g); g.connect(MUS.master); o.start(t); o.stop(t + .22); }
function playStep(S, step, t, sd) {
  const out = MUS.master, bar = Math.floor(step / 8) % S.prog.length, [ro, q] = S.prog[bar], ch = q === 'M' ? [0, 4, 7] : [0, 3, 7], base = S.root + (ro > 6 ? ro - 12 : ro), s8 = step % 8;
  if (S.pad && s8 === 0) for (const c2 of ch) mnote(S.padT || 'sine', base + 12 + c2, t, sd * 8.3, .02, 900, out, .4);
  const fast = S.drums === 'battle' || S.drums === 'drive';
  if (s8 % (fast ? 1 : 2) === 0) mnote(S.bass, base - 12 + (S.drums === 'battle' && s8 % 4 === 2 ? 12 : 0), t, sd * (fast ? .9 : 1.8), .12, 520, out);
  if (S.arp) mnote(S.arp, base + 12 + ch[step % 3] + (Math.floor(step / 3) % 2) * 12, t, sd * .9, .03, 2400, out);
  const m = S.mel[step % S.mel.length]; if (m) { mnote(S.lead, m, t, sd * 1.7, .055, 3200, out); mnote(S.lead, m, t, sd * 1.7, .03, 2000, MUS.send); }
  const d = S.drums;
  if (d === 'soft') { if (s8 % 2) mnoise(t, .02, 7000, .04); if (s8 === 0) mkick(t, .22); }
  else if (d === 'heart') { if (s8 === 0 || s8 === 1) mkick(t, s8 ? .12 : .2); }
  else if (d === 'drive') { if (s8 === 0 || s8 === 4) mkick(t, .32); if (s8 === 2 || s8 === 6) mnoise(t, .12, 1500, .12); mnoise(t, .018, 7000, .04); }
  else if (d === 'battle') { if (s8 === 0 || s8 === 3 || s8 === 4) mkick(t, .38); if (s8 === 2 || s8 === 6) mnoise(t, .15, 1500, .13); mnoise(t, .025, 7000, .04); }
}
setInterval(() => {
  if (!AC || !MUS.song || !MUS.master || AC.state !== 'running' || G.settings.music <= 0) return;
  const S = MUS.song, sd = 60 / S.bpm / 2;
  if (MUS.nextT < AC.currentTime - .2) MUS.nextT = AC.currentTime + .05;
  while (MUS.nextT < AC.currentTime + .3) { playStep(S, MUS.step, MUS.nextT, sd); MUS.nextT += sd; MUS.step++; }
}, 80);


/* Interiores: a casa toca a música calma do lar; a taverna, uma mais animada. */
MUSIC.casa = MUSIC.home; MUSIC.taverna = { ...MUSIC.home, bpm: 108, mode: [0, 2, 4, 5, 7, 9], prog: [[0, "M"], [5, "M"], [7, "M"], [5, "M"]], lead: "square", dens: .55, echo: .3, pad: false };
