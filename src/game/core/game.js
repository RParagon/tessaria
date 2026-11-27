/* Fios de Tessária (módulo ES) · G: o estado do jogo (modo, personagem, save, configurações…). Nunca é reatribuído, só alterado. */
export const G = {
  mode: 'boot', char: { name: 'Lume', cls: 'lamina', body: 1, skin: 2, hair: 'rabo', hairCol: 1, outfit: 0, trim: 0, glow: 0, acc: 'nenhum', cape: true, beard: 'nenhuma' }, zones: [], later: [], menu: null, rift: null, buffs: {}, streak: { n: 0, t: 0 },
  save: null, time: 0, settings: { px: 3, dither: .5, sv: 2, outline: true, sound: true, music: .5, zoom: .85, halo: true },   // zoom: distância da câmera (menor = mais perto) touch: matchMedia('(pointer: coarse)').matches,
};
