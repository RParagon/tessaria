/* Fios de Tessária · Regiões, lore, geração de mapas e construção do mundo */
/* =========================================================
   REGIÕES E LORE
   ========================================================= */
const FRAG = [
  { r: 'forest', t: 'A lenhadora', x: '"O Guardião de Musgo plantava uma árvore para cada criança que nascia na vila. Quando o Sol apagou, as árvores começaram a sussurrar nomes que ninguém mais lembrava."' },
  { r: 'forest', t: 'O corvo', x: '"Vi o rei no bosque, de madrugada, arrancando fios das raízes com as próprias mãos. Ele contava baixinho: mais um ano. Mais um ano."' },
  { r: 'forest', t: 'O Guardião', x: '"Ele me prometeu que o bosque viveria para sempre. Só precisava de um fio. Só um. Eu deixei. Que o musgo me perdoe."' },
  { r: 'crypt', t: 'A criada', x: '"Sua Majestade não dormia mais. Tinha medo de fechar os olhos e não abri-los. Mandou chamar o Tecelão da corte numa noite sem lua."' },
  { r: 'crypt', t: 'O Tecelão da corte', x: '"Eu puxei o fio do próprio Sol. O rei jurou que era só um. O céu rachou como vidro, e eu ouvi o mundo inteiro perder o fôlego."' },
  { r: 'crypt', t: 'O soldado', x: '"O dragão desceu sobre o palácio e não queimou ninguém. Engoliu a última brasa do Sol antes que o rei a alcançasse e fugiu para os picos. Mandaram a gente contar outra história."' },
  { r: 'peaks', t: 'Varkhaz', x: '"Arde. A brasa arde por dentro. Se eu soltar, ele volta para pegá-la. Se eu segurar, esqueço quem sou. Já esqueci tanto."' },
  { r: 'peaks', t: 'Varkhaz', x: '"Uma criança me deu uma maçã, uma vez. Na vila, antes de tudo. Eu ainda lembro do gosto. Eu ainda lembro."' },
  { r: 'peaks', t: 'O Tear', x: '"Todo fio arrancado pode ser recosturado. Mas só por mãos que lembrem de tudo: do medo, da culpa e da maçã."' },
];
const REG = {
  hub: { name: 'Vila Brasa', sub: 'O último lugar aceso', style: 'hub', W: 104, H: 48, seed: 3, torch: 21,
    // a vila original (sala 0) e o Bairro Leste (sala 1): fogueira, Bardo, arena de treino e lago de pesca
    // sala 2: o Santuário da Fenda, ao sul do Bairro Leste
    rooms: [{ x: 22, y: 16, w: 19, h: 13, shape: 'rect', kind: 'start' }, { x: 59, y: 16, w: 14, h: 12, shape: 'rect' }, { x: 59, y: 38.5, w: 8.5, h: 7.5, shape: 'rect' }, { x: 47, y: 38.5, w: 2.2, h: 2, shape: 'rect' }, { x: 88.5, y: 22, w: 13, h: 18, shape: 'rect' }], links: [[0, 1], [1, 3], [3, 2]] },   // 4: o Pesqueiro, a leste (rio)   // 3: vestíbulo a oeste (entrada do santuário)
  forest: { name: 'Bosque Sussurrante', sub: 'Onde as árvores lembram', style: 'forest', W: 50, H: 40, seed: 11, torch: 27, boss: 'golem', fio: 'FIO VERDE',
    rooms: [
      { x: 6, y: 34, r: 3, kind: 'start' }, { x: 15, y: 30, r: 4.5, en: { gosmo: 3 } }, { x: 6, y: 22, r: 3.5, frag: 0, en: { gosmo: 2 } },
      { x: 24, y: 24, r: 5, en: { gosmo: 3, wisp: 1 }, pool: true }, { x: 34, y: 31, r: 3, kind: 'shrine' }, { x: 44, y: 34, r: 3.2, chest: 1, en: { wisp: 2 } },
      { x: 33, y: 16, r: 5, en: { gosmo: 4, wisp: 2 } }, { x: 18, y: 13, r: 3.8, frag: 1, en: { wisp: 2, gosmo: 1 } }, { x: 44, y: 20, r: 4, chest: 1, en: { wisp: 3, gosmo: 2 } },
      { x: 45, y: 9, r: 2.8, frag: 2 }, { x: 26, y: 6, r: 5.5, kind: 'boss' }],
    links: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [3, 6], [6, 7], [6, 8], [8, 9], [6, 10]] },
  crypt: { name: 'Ossuário Real', sub: 'Onde os mortos contam histórias', style: 'crypt', W: 50, H: 40, seed: 21, torch: 27, boss: 'skull', fio: 'FIO DE OSSO',
    rooms: [
      { x: 5, y: 34, w: 3, h: 3, shape: 'rect', kind: 'start' }, { x: 15, y: 34, w: 4, h: 3, shape: 'rect', en: { skel: 3 } }, { x: 15, y: 24, w: 3, h: 3, shape: 'rect', frag: 3, en: { bat: 2 } },
      { x: 26, y: 30, w: 5, h: 4, shape: 'rect', en: { skel: 3, bat: 2 } }, { x: 37, y: 34, w: 3, h: 2, shape: 'rect', kind: 'shrine' }, { x: 45, y: 28, w: 3, h: 3, shape: 'rect', chest: 1, en: { bat: 3 } },
      { x: 26, y: 18, w: 5, h: 4, shape: 'rect', en: { skel: 4, bat: 2 } }, { x: 12, y: 12, w: 3, h: 3, shape: 'rect', frag: 4, en: { skel: 2 } }, { x: 40, y: 16, w: 4, h: 3, shape: 'rect', chest: 1, en: { skel: 3, bat: 2 } },
      { x: 44, y: 6, w: 2, h: 2, shape: 'rect', frag: 5 }, { x: 24, y: 6.5, r: 6, kind: 'boss' }],
    links: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [3, 6], [6, 7], [6, 8], [8, 9], [6, 10], [5, 8]] },
  peaks: { name: 'Picos de Cinza', sub: 'Onde o Sol foi escondido', style: 'peaks', W: 54, H: 42, seed: 31, torch: 27, boss: 'dragon', fio: 'FIO DE BRASA',
    rooms: [
      { x: 6, y: 36, r: 3, kind: 'start' }, { x: 16, y: 32, r: 4.5, en: { imp: 2, beetle: 1 } }, { x: 7, y: 23, r: 3.4, frag: 6, en: { imp: 2 } },
      { x: 26, y: 26, r: 5.5, en: { imp: 2, beetle: 2 }, pool: true }, { x: 37, y: 34, r: 3, kind: 'shrine' }, { x: 47, y: 36, r: 3, chest: 1, en: { beetle: 2 } },
      { x: 38, y: 20, r: 5.5, en: { imp: 3, beetle: 2 }, pool: true }, { x: 16, y: 15, r: 3.8, frag: 7, en: { imp: 2, beetle: 1 } }, { x: 48, y: 25, r: 4, chest: 1, en: { imp: 3 } },
      { x: 47, y: 10, r: 2.8, frag: 8 }, { x: 28, y: 9, r: 7, kind: 'boss' }],
    links: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [3, 6], [6, 8], [8, 9], [6, 7], [6, 10]] },
  home: { name: 'Casa do Tecelão', sub: 'Seu canto em Tessária', style: 'home', W: 16, H: 13, seed: 77, torch: 14, rooms: [{ x: 8, y: 6.5, w: 5, h: 3.5, shape: 'rect', kind: 'start' }], links: [] },
  wilds: { name: 'Ermos de Tessária', sub: 'As terras selvagens ao redor da vila', style: 'wilds', W: 400, H: 350, seed: 61, torch: 21, rooms: [], links: [] },
  swamp: { name: 'Pântano Afogado', sub: 'Onde as vozes afundam', style: 'swamp', W: 52, H: 42, seed: 41, torch: 21, boss: 'hydra', fio: 'FIO DE ÁGUA',
    rooms: [
      { x: 46, y: 36, r: 3, kind: 'start' }, { x: 36, y: 33, r: 4.5, en: { sapo: 3, afogado: 1 }, pool: true }, { x: 45, y: 24, r: 3.4, en: { afogado: 2, sapo: 1 } },
      { x: 27, y: 27, r: 5.5, en: { sapo: 3, afogado: 2 }, pool: true }, { x: 16, y: 34, r: 3, kind: 'shrine' }, { x: 6, y: 36, r: 3.2, chest: 1, en: { sapo: 2 } },
      { x: 17, y: 20, r: 5.5, en: { sapo: 3, afogado: 3 }, pool: true }, { x: 35, y: 15, r: 3.8, chest: 1, en: { afogado: 2, sapo: 2 } }, { x: 6, y: 23, r: 4, en: { sapo: 2, afogado: 2 }, pool: true },
      { x: 6, y: 10, r: 2.8, chest: 1, en: { afogado: 2 } }, { x: 24, y: 8, r: 7, kind: 'boss' }],
    links: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [3, 6], [6, 8], [8, 9], [2, 7], [6, 10], [7, 10]] },
  glass: { name: 'Cidadela de Vidro', sub: 'Onde o Tear se olha no espelho', style: 'glass', W: 52, H: 42, seed: 51, torch: 14, boss: 'reflexo', fio: 'FIO ESPELHADO',
    rooms: [
      { x: 26, y: 37, w: 3, h: 2.5, shape: 'rect', kind: 'start' }, { x: 26, y: 29, w: 5, h: 3, shape: 'rect', en: { sentinela: 2, fantasma: 2 } }, { x: 13, y: 29, w: 3.5, h: 3, shape: 'rect', en: { fantasma: 3 } },
      { x: 39, y: 29, w: 3.5, h: 3, shape: 'rect', en: { sentinela: 3 } }, { x: 13, y: 19, w: 3, h: 3, shape: 'rect', kind: 'shrine' }, { x: 39, y: 19, w: 4, h: 3.5, shape: 'rect', chest: 1, en: { sentinela: 2, fantasma: 2 } },
      { x: 26, y: 19, w: 4, h: 3, shape: 'rect', en: { sentinela: 2, fantasma: 3 } }, { x: 5, y: 11, w: 2.5, h: 2.5, shape: 'rect', chest: 1, en: { fantasma: 2 } }, { x: 46, y: 10, w: 2.5, h: 2.5, shape: 'rect', chest: 1, en: { sentinela: 2 } },
      { x: 26, y: 7.5, r: 6.5, kind: 'boss' }],
    links: [[0, 1], [1, 2], [1, 3], [2, 4], [3, 5], [1, 6], [4, 7], [5, 8], [6, 9]] },
};
const HUB = {
  houses: [
    { x: 4, y: 8, w: 3, h: 3, roof: 23 }, { x: 9, y: 8, w: 3, h: 3, roof: 22 }, { x: 14, y: 9, w: 5, h: 3, roof: 22, tavern: true },
    { x: 27, y: 8, w: 3, h: 3, roof: 22 },   // a casa vizinha (33,8) deu lugar ao Banco do Tear
    { x: 4, y: 20, w: 3, h: 3, roof: 22 }, { x: 9, y: 22, w: 3, h: 3, roof: 23 }, { x: 26, y: 20, w: 3, h: 2, roof: 11, forge: true }, { x: 33, y: 20, w: 3, h: 3, roof: 22 },
    // Bairro Leste
    { x: 47, y: 5, w: 4, h: 3, roof: 23 }, { x: 53, y: 5, w: 3, h: 3, roof: 22 }, { x: 47, y: 23, w: 3, h: 3, roof: 22 }, { x: 52, y: 24, w: 3, h: 3, roof: 23 },
    // Pesqueiro: a casa do Ivo (iscas e varas)
    { x: 78, y: 8, w: 4, h: 3, roof: 11 }],
  fountain: [44, 32], portals: [{ to: 'forest', x: 24, z: 9 }, { to: 'crypt', x: 44, z: 8 }, { to: 'peaks', x: 64, z: 9 }, { to: 'swamp', x: 9, z: 33, yaw: 1.57 }, { to: 'wilds', x: 44, z: 56, yaw: 3.14 }, { to: 'glass', x: 145, z: 33, yaw: -1.57 }],
  lamps: [[34, 24], [54, 24], [34, 40], [54, 40], [24, 15], [64, 15], [40, 14], [48, 14], [18, 32], [70, 32], [92, 24], [92, 40], [110, 21], [126, 21], [110, 43], [140, 30], [128, 40], [140, 18], [158, 22], [158, 50], [172, 36], [166, 66], [176, 14]],
  spawn: [44, 42], stalls: [[26, 12, 16], [29, 12, 18], [52, 18, 15], [55, 18, 22], [82, 14, 16], [84, 14, 15]], /* as duas últimas: feira do Bairro Leste */ trees: [[3, 14], [17, 20], [39, 14], [38, 27], [3, 27], [12, 26], [36, 3], [72, 5], [72, 27], [46, 15], [58, 27], [63, 5]],
  pond: { x: 30.5, y: 25.5, rx: 2.8, ry: 1.6 }, lake: { x: 66, y: 23.6, rx: 4.4, ry: 2.4 },
  // Bairro Leste (coordenadas do mundo): fogueira com bancos, arena com bonecos, ponto de pesca
  fire: [118, 31], benches: [[114.2, 31, 1.57], [121.8, 31, -1.57], [118, 27.2, 0], [118, 34.8, 3.14]], arena: { x: 134, z: 13, w: 7, h: 5 }, dummies: [[130, 13], [134, 13], [138, 13]], fish: [122.5, 47], fishery: [166, 31.6],   /* fishery: banca do mercado de peixes (Pesqueiro) */ pen: { x0: 14, y0: 23, x1: 18, y1: 27 },
  // Santuário da Fenda (mundo): portal sombrio no estrado ao sul, pilares de obsidiana com chama violeta e arco na entrada
  sanct: { x: 118, z: 77, gate: [118, 68.5], pil: [[107, 67], [129, 67], [132, 78], [108, 87.5], [128, 87.5]], arch: [101.5, 77] },
  // Banco do Tear (mundo): entre a forja e a casa da praça, fachada para o sul
  bank: { x: 69, z: 18.4 },
  props: [[26, 18, 'crate'], [27, 18.6, 'barrel'], [62, 18, 'crate'], [22, 40, 'barrel'], [66, 44, 'crate'], [65.4, 44.8, 'barrel'], [12, 30, 'crate'], [36, 12, 'board'], [102, 16, 'crate'], [102.8, 16.6, 'barrel'], [98, 50, 'barrel'], [112, 52, 'crate'],
    // Bairro Leste: feira, poço, canteiros, feno e varal
    [101.6, 38.6, 'barrel'], [102.3, 39.4, 'crate'], [113.2, 38.4, 'crate'], [113.8, 39.3, 'barrel'], [123, 12, 'well'], [96, 30, 'flowers'], [104, 28, 'flowers'], [134, 33, 'flowers'], [140, 40, 'flowers'], [116, 20, 'flowers'],
    [142, 25, 'hay'], [143.2, 26.3, 'hay'], [101, 46.5, 'line'], [120.5, 51.6, 'crate'], [121.3, 52.3, 'barrel'], [136, 20.5, 'crate'],
    // Pesqueiro: caixotes de peixe, barris de isca, redes e varal de peixe seco
    [161, 28.4, 'barrel'], [161.8, 29.2, 'crate'], [171, 28.6, 'crate'], [156, 21, 'barrel'], [157, 21.8, 'crate'], [154, 44, 'hay'], [160, 60, 'flowers'], [156, 34, 'line'], [168, 40, 'barrel']],
};
/** Rio do Pesqueiro (ladrilhos): centro e meia largura em cada linha; o remanso é o poço largo ao sul. */
const riverX = ty => 94 + Math.sin(ty * .22) * 1.6 + Math.sin(ty * .07 + 1) * 1.0;
const riverHW = ty => 1.9 + 1.7 * Math.exp(-(((ty - 33) / 3) ** 2));
/** Pontos de pesca: o píer do lago e quatro píeres no rio (o de baixo dá no remanso). x, z: começo do píer; a boia cai 4,2 adiante. */
HUB.fishSpots = [{ x: HUB.fish[0], z: HUB.fish[1], water: 'lago', n: 'Lago do Bairro Leste' }].concat([[10, 'rio', 'Píer do Norte'], [19.5, 'rio', 'Píer da Corredeira'], [26.5, 'rio', 'Píer do Salgueiro'], [33, 'remanso', 'Remanso Fundo']].map(([ty, water, n]) => ({ x: Math.round(((riverX(ty) - riverHW(ty)) * T - 1.2) * 10) / 10, z: ty * T, water, n })));
/** Píer do Ivo (não é ponto de pesca do jogador): ele pesca ali, perto da casa. */
/** Ponte de tábuas sobre o riacho (mundo): liga o norte ao sul do Pesqueiro. */
const HUB_BRIDGE = [161, 49.2];
const IVO_PIER = [Math.round(((riverX(14.5) - riverHW(14.5)) * T - 1.2) * 10) / 10, 29];
/** Bardo do Bairro Leste: fica fora de NPCS (as linhas de paleta dos moradores estão cheias) e usa as linhas 152-159, livres na vila. */
const BARD = { id: 'bardo', name: 'Bardo Tomé', x: 121.6, z: 27.6, baseYaw: 2.6, cfg: { seed: 81, body: 1, hair: 'longo', hairCol: 2, skin: 3, outfit: 3, trim: 4, glow: 3, acc: 'pena', cape: true, gear: 'alaude' } };
/** Moradores do Bairro Leste: linhas de paleta próprias (128-143), livres na vila (lá ninguém usa as cores do Cavaleiro e dos monstros). */
/** Mercador suspeito dos acampamentos dos Ermos (cores nas linhas 128-135, livres nos Ermos). */
const MERC_CFG = { seed: 85, body: 1, hair: 'careca', hairCol: 0, skin: 5, outfit: 11, trim: 4, glow: 3, acc: 'capuz', cape: true, beard: 'cavanhaque' };
const EAST_NPCS = [
  { id: 'lucia', name: 'Acendedora Lúcia', x: 93.5, z: 25.5, base: 128, spd: 1.15, wander: [[93.5, 25.5], [111.5, 22.5], [127.5, 22.5], [141.5, 19.5], [141.5, 31.5], [129.5, 41.5], [111.5, 44.5], [93.5, 41.5]],
    cfg: { seed: 83, body: 0, hair: 'coque', hairCol: 0, skin: 4, outfit: 9, trim: 2, glow: 1, acc: 'chapeu', cape: false, gear: 'vara' } },
  { id: 'dora', name: 'Feirante Dora', x: 108, z: 37.6, baseYaw: 0, base: 136,
    cfg: { seed: 84, body: 2, hair: 'rabo', hairCol: 3, skin: 1, outfit: 4, trim: 5, glow: 0, acc: 'bandana', cape: false, apron: true } },
];
const WANDER_KIDS = [[36, 27], [52, 27], [52, 38], [36, 38], [44, 24], [40, 44], [50, 44]];
const NPCS = [
  { id: 'ysolde', name: 'Anciã Ysolde', x: 37, z: 32, baseYaw: 1.57, cfg: { seed: 61, body: 0, hair: 'longo', hairCol: 4, skin: 1, outfit: 7, trim: 0, glow: 1, acc: 'coroa', cape: true, cls: 'arcano' } },
  { id: 'bruma', name: 'Ferreira Bruma', x: 56.4, z: 45.1, baseYaw: -1.57, cfg: { seed: 62, body: 2, hair: 'coque', hairCol: 3, skin: 3, outfit: 10, trim: 2, glow: 0, acc: 'bandana', cape: false, gear: 'martelo', apron: true } },
  { id: 'kiko', name: 'Kiko', x: 40, z: 26, scale: .72, wander: WANDER_KIDS, spd: 2.2, cfg: { seed: 63, body: 0, hair: 'curto', hairCol: 1, skin: 2, outfit: 6, trim: 4, glow: 0, acc: 'cachecol', cape: false } },
  { id: 'desf', name: 'O Desfiado', x: 78, z: 26, baseYaw: -1.57, cfg: { seed: 64, body: 1, hair: 'careca', hairCol: 0, skin: 5, outfit: 11, trim: 1, glow: 2, acc: 'capuz', cape: true } },
  { id: 'otto', name: 'Mercador Otto', x: 56, z: 28.5, cfg: { seed: 65, body: 2, hair: 'careca', hairCol: 0, skin: 3, outfit: 2, trim: 3, glow: 0, acc: 'chapeu', cape: false, beard: 'bigode' } },
  { id: 'tarsa', name: 'Guarda Tarsa', x: 44, z: 13.5, wander: [[38, 13.5], [50, 13.5]], spd: 1.1, cfg: { seed: 66, body: 2, hair: 'curto', hairCol: 0, skin: 4, outfit: 6, trim: 1, glow: 1, acc: 'elmo', cape: true, cls: 'lamina', armor: 3 } },
  { id: 'mel', name: 'Padeira Mel', x: 33.6, z: 26.6, baseYaw: 3.14, cfg: { seed: 67, body: 1, hair: 'coque', hairCol: 2, skin: 0, outfit: 1, trim: 4, glow: 0, acc: 'padeiro', cape: false, apron: true } },
  { id: 'lio', name: 'Bardo Lio', x: 49.5, z: 35.5, baseYaw: -.6, cfg: { seed: 68, body: 0, hair: 'longo', hairCol: 3, skin: 1, outfit: 8, trim: 0, glow: 2, acc: 'pena', cape: true, gear: 'alaude' } },
  { id: 'ivo', name: 'Pescador Ivo', x: IVO_PIER[0] + 2.4, z: IVO_PIER[1] + .1, baseYaw: 1.57, cfg: { seed: 69, body: 1, hair: 'curto', hairCol: 4, skin: 2, outfit: 5, trim: 2, glow: 0, acc: 'nenhum', cape: false, gear: 'vara', beard: 'barba' } },
  { id: 'brann', name: 'Vovô Brann', x: 21, z: 51.5, cfg: { seed: 70, body: 1, hair: 'careca', hairCol: 4, skin: 2, outfit: 10, trim: 2, glow: 0, acc: 'cachecol', cape: false, gear: 'bengala', beard: 'barba' } },
  { id: 'nina', name: 'Nina', x: 48, z: 26, scale: .7, wander: WANDER_KIDS, spd: 2.4, cfg: { seed: 71, body: 0, hair: 'rabo', hairCol: 3, skin: 4, outfit: 9, trim: 4, glow: 0, acc: 'nenhum', cape: false } },
];
const DEF = {
  gosmo: { hp: 34, dmg: 9, r: .55, xp: 6, gold: 3, model: 'gosmo', scale: 1 },
  wisp: { hp: 26, dmg: 10, r: .45, xp: 8, gold: 4, model: 'wisp', scale: 1 },
  skel: { hp: 70, dmg: 14, r: .45, xp: 12, gold: 6, model: 'skel', scale: 1 },
  bat: { hp: 32, dmg: 9, r: .45, xp: 9, gold: 5, model: 'bat', scale: 1.1 },
  imp: { hp: 80, dmg: 16, r: .45, xp: 16, gold: 8, model: 'imp', scale: 1.15 },
  thief: { hp: 240, dmg: 0, r: .45, xp: 40, gold: 0, model: 'imp', scale: .85 },
  aranha: { hp: 22, dmg: 8, r: .4, xp: 5, gold: 1, model: 'spiderling', scale: 1 },
  beetle: { hp: 130, dmg: 20, r: .8, xp: 20, gold: 10, model: 'beetle', scale: 1.2 },
  javali: { hp: 42, dmg: 10, r: .55, xp: 9, gold: 4, model: 'boar', scale: 1.1 },
  lobo: { hp: 34, dmg: 9, r: .45, xp: 9, gold: 4, model: 'wolf', scale: 1.05 },
  urso: { hp: 150, dmg: 20, r: .8, xp: 28, gold: 10, model: 'bear', scale: 1.25 },
  sapo: { hp: 150, dmg: 22, r: .6, xp: 30, gold: 12, model: 'toad', scale: 1.1 },
  afogado: { hp: 210, dmg: 26, r: .45, xp: 32, gold: 13, model: 'drowned', scale: 1.05 },
  sentinela: { hp: 170, dmg: 22, r: .55, xp: 36, gold: 14, model: 'sentinel', scale: 1 },
  fantasma: { hp: 190, dmg: 30, r: .45, xp: 40, gold: 15, model: 'phantom', scale: 1.05 },
};
const MODEL_FN = { dummy: buildDummy, gosmo: buildGosmo, wisp: buildWisp, skel: buildSkeleton, bat: buildBat, imp: buildImp, beetle: buildBeetle, golem: buildGolem, skull: buildSkullBoss, dragon: buildDragon, shrine: buildShrine, chest: buildChest, frag: buildFragment, portal: buildPortal, riftgate: buildRiftGate, camp: () => buildCamp(), portal_forest: () => buildPortalStyle('forest'), portal_crypt: () => buildPortalStyle('crypt'), portal_peaks: () => buildPortalStyle('peaks'), portal_swamp: () => buildPortalStyle('swamp'), portal_wilds: () => buildPortalStyle('wilds'), portal_glass: () => buildPortalStyle('glass'), pedestal: buildPedestal, chicken: buildChicken, pylon: buildPylon, spider: buildSpider, spiderling: buildSpiderling, eye: buildEye, knight: () => buildHumanoid(KNIGHT_CFG, 128), toad: buildToad, boar: buildBoar, wolf: buildWolf, bear: buildBear, drowned: buildDrowned, sentinel: buildSentinel, phantom: buildPhantom, hydra: buildHydra, reflexo: () => buildHumanoid(reflexCfg(), 152) };
const getModel = k => k === 'reflexo' ? makeModel('reflexo:' + JSON.stringify(G.char), MODEL_FN.reflexo) : makeModel(k, MODEL_FN[k]);
const CLS = {
  lamina: { label: 'Lâmina', desc: 'Corte em arco de perto. Hab.: Giro Flamejante.', hp: 130, dmg: 17, spd: 5.2, atkCd: .36, skillCd: 6 },
  arcano: { label: 'Arcano', desc: 'Projéteis teleguiados que explodem em área. Hab.: Nova Arcana.', hp: 90, dmg: 12, spd: 5.0, atkCd: .38, skillCd: 7 },
  arco: { label: 'Arco', desc: 'Flechas que atravessam. Hab.: Chuva de Flechas.', hp: 110, dmg: 12, spd: 5.6, atkCd: .25, skillCd: 6 },
};
const UPG = [
  { k: 'pow', t: 'Têmpera', d: '+15% de dano em todos os ataques.', max: 5 },
  { k: 'vig', t: 'Vigor', d: '+18 de vida máxima.', max: 5 },
  { k: 'agi', t: 'Agilidade', d: '+5% de velocidade e esquiva mais frequente.', max: 5 },
  { k: 'foc', t: 'Foco', d: 'Habilidade recarrega 10% mais rápido.', max: 5 },
  { k: 'pot', t: 'Bolsa de poções', d: '+1 poção máxima.', max: 3 },
];
const UPCOST = [25, 50, 90, 140, 200];

/* ---- geração do mapa ---- */
function genWilds(key, spec) {
  const { W, H } = spec, R = rng(spec.seed), grid = [];
  for (let y = 0; y < H; y++) { const row = []; for (let x = 0; x < W; x++) {
    let c = '.'; const z = wRing(x, y), b = wZone(x, y), edge = Math.min(x, y, W - 1 - x, H - 1 - y);
    if (edge < 2 || (edge < 5 && vnoise(x * .4, y * .4) > .45)) c = '#';
    else if (vnoise(x * .13 + 5, y * .13) > .69 - z * .015 || vnoise(x * .33 + 11, y * .33 + 3) > .86) c = '#';
    else if (b === 3 ? vnoise(x * .085 + 40, y * .085 + 17) > .6 : z < 3 && vnoise(x * .085 + 40, y * .085 + 17) > .77) c = '~';   // o Brejo tem muito mais água
    row.push(c); } grid.push(row); }
  const set = (x, y, ch) => { if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) return; grid[y][x] = ch; };
  const road = (x1, y1) => { const dx = x1 - WC.x, dy = y1 - WC.y, L = Math.hypot(dx, dy), ph = R() * 6.28, px = -dy / L, py = dx / L; for (let i = 0; i <= L * 2; i++) { const u = i / (L * 2), w = Math.sin(u * L * .2 + ph) * 2.2 * Math.sin(u * Math.PI), cx = WC.x + dx * u + px * w, cy = WC.y + dy * u + py * w; for (let yy = Math.floor(cy - 2); yy <= cy + 2; yy++) for (let xx = Math.floor(cx - 2); xx <= cx + 2; xx++) { const d = Math.hypot(xx + .5 - cx, yy + .5 - cy); if (d < 1.4) set(xx, yy, ','); else if (d < 2.6 && grid[yy] && grid[yy][xx] !== ',') set(xx, yy, '.'); } } };
  // estradas saindo da vila para todos os lados (ligam os biomas e os obeliscos)
  road(WC.x, H - 4); road(4, WC.y + 2); road(W - 4, WC.y - 2); road(WC.x + 4, 4); road(30, 24); road(W - 27, H - 24); road(W - 32, 27); road(27, H - 30);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x + .5 - WC.x, y + .5 - WC.y); if (d < 7.2) grid[y][x] = 'V'; else if (d < 10.5 && grid[y][x] !== ',') grid[y][x] = '.'; }
  const rooms = [{ x: WC.x, y: WC.y + 10.2, r: 2.4, kind: 'start' }], ok = (x, y) => { for (let yy = Math.floor(y - 1); yy <= y + 1; yy++) for (let xx = Math.floor(x - 1); xx <= x + 1; xx++) { const c = grid[yy] && grid[yy][xx]; if (c !== '.' && c !== ',') return false; } return true; };
  for (let t = 0; t < 16000 && rooms.length < 760; t++) {
    const x = 4 + R() * (W - 8), y = 4 + R() * (H - 8), z = wZone(x, y), ring = wRing(x, y);
    if (Math.hypot(x - WC.x, y - WC.y) < 12 || rooms.some(r => Math.hypot(r.x - x, r.y - y) < 7.5) || !ok(x, y)) continue;
    const pool = WPOOL[z], n = 2 + ring + (z === 7 ? 1 : 0) + Math.floor(R() * 2), en = {}; for (let i = 0; i < n; i++) { const ty = pool[Math.floor(R() * pool.length)]; en[ty] = (en[ty] || 0) + 1; }
    rooms.push({ x, y, r: 2.5, en, zone: z, ring });
  }
  // Por bioma: santuários, um obelisco (viagem rápida), uma caverna, Alfas, o covil com o Alfa nomeado e baús.
  for (let z = 0; z < WZ.length; z++) {
    const zs = rooms.filter(r => r.zone === z && !r.kind); zs.sort(() => R() - .5);
    const take = n => zs.splice(0, Math.min(n, zs.length));
    take(z === 0 ? 1 : z === 7 ? 0 : 2).forEach(r => { delete r.en; r.kind = 'shrine'; });   // no Ermo Profundo não há santuário nem acampamento
    if (z !== 7 && zs.length) {   // até 2 acampamentos com obelisco por bioma, longe um do outro
      const mid = [22, 65, 120, 0][wRing(zs[0].x, zs[0].y)], band = r => Math.abs(wDist(r.x, r.y) - mid);   // no meio da faixa do bioma, não colado na vila
      const okB = zs.map((r, i) => [r, i]).filter(([r]) => band(r) < 18), pool = okB.length ? okB : zs.map((r, i) => [r, i]);
      const ai = pool[0][1], a = zs.splice(ai, 1)[0];
      const far = zs.map((r, i) => [Math.hypot(r.x - a.x, r.y - a.y) - band(r) * .6, i]).sort((p, q) => q[0] - p[0])[0];
      const picks = [a]; if (z !== 0 && far && far[0] > 30) picks.push(zs.splice(far[1], 1)[0]);
      picks.forEach((r, k) => { delete r.en; r.kind = 'obelisk'; r.ob = z; r.obId = z * 10 + k; });
    }
    if (WZ[z].cave) take(1).forEach(r => { delete r.en; r.kind = 'cave'; });
    take(z === 0 ? 1 : z === 7 ? 5 : 2).forEach(r => { r.alpha = true; r.en[WPOOL[z][0]] = (r.en[WPOOL[z][0]] || 0) + 1; });
    take(1).forEach(r => { r.alpha = true; r.lair = WZ[z].lair; r.en[WZ[z].lair[0]] = (r.en[WZ[z].lair[0]] || 0) + 3; });
    take(z === 2 ? 5 : 2).forEach(r => { r.chest = 1; });
  }
  for (const rm of rooms) for (let yy = Math.floor(rm.y - 3); yy <= rm.y + 3; yy++) for (let xx = Math.floor(rm.x - 3); xx <= rm.x + 3; xx++) if (Math.hypot(xx + .5 - rm.x, yy + .5 - rm.y) < 2.6 && grid[yy] && grid[yy][xx] !== 'V' && grid[yy][xx] !== ',') set(xx, yy, '.');
  const G = { key, W, H, grid, seed: spec.seed, rooms: [], block: new Set(), gates: [], gatesOn: false, reserved: new Set(), wild: true };
  const reserve = (wx, wz, rad = 1) => { const tx = Math.floor(wx / T), tz = Math.floor(wz / T); for (let y = tz - rad; y <= tz + rad; y++) for (let x = tx - rad; x <= tx + rad; x++) G.reserved.add(x + ',' + y); };
  rooms.forEach((rm, i) => { const r2 = { ...rm, i, wx: rm.x * T, wz: rm.y * T, spawned: false }; G.rooms.push(r2); reserve(r2.wx, r2.wz, 1); });
  reserve(WC.x * T, (WC.y + 8.6) * T, 2);
  G.start = G.rooms[0];
  return G;
}
/** Lagos da vila com contorno orgânico (coordenadas do mundo). <1: água; 1 a 1,14: areia da margem. */
function hubLakeD(px, pz) {
  let best = 9;
  for (const L of [HUB.pond, HUB.lake]) {
    const nx = (px / T - L.x) / L.rx, ny = (pz / T - L.y) / L.ry, a = Math.atan2(ny, nx);
    const d = Math.hypot(nx, ny) + (vnoise(px * .22 + L.x, pz * .22) - .5) * .34 + Math.sin(a * 3 + L.x) * .07 + Math.sin(a * 5 + L.y) * .04;
    best = Math.min(best, d);
  }
  const tx = px / T, ty = pz / T, wob = (vnoise(px * .25 + 40, pz * .25) - .5) * .3;
  if (ty > 2 && ty < 46 && tx > 84) best = Math.min(best, Math.abs(tx - riverX(ty)) / riverHW(ty) + wob);   // rio do Pesqueiro
  if (tx > 69.5 && tx < riverX(24)) best = Math.min(best, Math.abs(ty - (24.3 + Math.sin(tx * .5) * .45)) / .8 + wob);   // riacho: o lago desce até o rio
  return best;
}
function genRegion(key) {
  if (REG[key].style === 'wilds') return genWilds(key, REG[key]);
  const spec = REG[key], { W, H } = spec, R = rng(spec.seed);
  const grid = []; for (let y = 0; y < H; y++) grid.push(new Array(W).fill('#'));
  const set = (x, y, ch) => { if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return; grid[y][x] = ch; };
  const roomTiles = (rm, fn) => {
    const ext = (rm.r || Math.max(rm.w, rm.h)) + 3;
    for (let y = Math.floor(rm.y - ext); y <= rm.y + ext; y++) for (let x = Math.floor(rm.x - ext); x <= rm.x + ext; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const dx = x + .5 - rm.x, dy = y + .5 - rm.y;
      const inside = rm.shape === 'rect' ? (Math.abs(dx) < rm.w && Math.abs(dy) < rm.h) : (Math.hypot(dx, dy) + (vnoise(x * .35 + spec.seed, y * .35) - .5) * 2.2 < rm.r);
      fn(x, y, inside, Math.hypot(dx, dy));
    }
  };
  for (const [a, b] of spec.links) {
    const A = spec.rooms[a], B = spec.rooms[b], dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy), steps = Math.ceil(L * 2);
    const px = -dy / L, py = dx / L, ph = R() * 6.28, cw = spec.style === 'crypt' || spec.style === 'glass' ? 1.25 : 1.45;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps, w = spec.style === 'crypt' || spec.style === 'glass' ? 0 : Math.sin(u * Math.PI) * Math.sin(u * L * .35 + ph) * 1.6;
      const cx = A.x + dx * u + px * w, cy = A.y + dy * u + py * w;
      for (let y = Math.floor(cy - cw - 1); y <= cy + cw + 1; y++) for (let x = Math.floor(cx - cw - 1); x <= cx + cw + 1; x++)
        if (Math.hypot(x + .5 - cx, y + .5 - cy) < cw && grid[y] && grid[y][x] === '#') set(x, y, ',');
    }
  }
  for (const rm of spec.rooms) roomTiles(rm, (x, y, inside) => { if (inside) set(x, y, '.'); });
  for (const rm of spec.rooms) if (rm.pool) roomTiles(rm, (x, y, inside, d) => { if (inside && d > 2.4 && d < rm.r * .8 && vnoise(x * .5 + 3, y * .5 + 7) > .6 && grid[y][x] === '.') set(x, y, '~'); });
  const G = { key, W, H, grid, seed: spec.seed, rooms: [], block: new Set(), gates: [], gatesOn: false, reserved: new Set() };
  const reserve = (wx, wz, rad = 1) => { const tx = Math.floor(wx / T), tz = Math.floor(wz / T); for (let y = tz - rad; y <= tz + rad; y++) for (let x = tx - rad; x <= tx + rad; x++) G.reserved.add(x + ',' + y); };
  spec.rooms.forEach((rm, i) => {
    const r2 = { ...rm, i, wx: rm.x * T, wz: rm.y * T, spawned: false };
    G.rooms.push(r2);
    reserve(r2.wx, r2.wz, 1);
    if (rm.kind === 'boss') roomTiles(rm, (x, y, inside, d) => { if (!inside && d > rm.r + .6 && d < rm.r + 3.2 && (grid[y][x] === ',' || grid[y][x] === '.')) G.gates.push([x, y]); });
  });
  if (key === 'hub') {
    for (let y = 18; y <= 20; y++) for (let x = 71; x <= 77; x++) if (grid[y][x] === '#') grid[y][x] = ',';   // passagem do Bairro Leste para o Pesqueiro
    for (let x = 70; x <= 78; x++) for (let y = 22; y <= 26; y++) if (grid[y][x] === '#' && hubLakeD((x + .5) * T, (y + .5) * T) < 1.3) grid[y][x] = '.';   // leito do riacho
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (grid[y][x] !== '.') continue;
      const cx = x + .5, cy = y + .5, pd = HUB.pond;
      if (Math.abs(cx - 22) < 1.3 || Math.abs(cy - 16.5) < 1.1 || (y < 7 && y > 2 && cx > 8 && cx < 37) || Math.hypot(cx - 22, cy - 16) < 4.6) grid[y][x] = ',';
      if (hubLakeD(cx * T, cy * T) < .97) grid[y][x] = '~';   // mesma forma orgânica do desenho
      if (cx > 43 && ((Math.abs(cy - 16.5) < 1.1 && cx < 73) || Math.hypot(cx - 59, cy - 15.5) < 4.2 || Math.abs(cx - 59) < 1.1)) grid[y][x] = ',';   // caminhos e praça do Bairro Leste
      if (cx > 74 && cy > 18 && cy < 21 && cx < 80) grid[y][x] = ',';   // caminho até o Pesqueiro
      if (Math.abs(cx - HUB_BRIDGE[0] / T) < 1.1 && cy > 18 && cy < 31) grid[y][x] = ',';   // trilha norte-sul do Pesqueiro (passa pela ponte do riacho)
      if (cy > 30 && (Math.hypot((cx - 59) / 8, (cy - 38.5) / 7) < 1 || (cx > 44 && cx < 52 && Math.abs(cy - 38.5) < 1.6))) grid[y][x] = ',';   // piso de pedra do Santuário da Fenda e do vestíbulo
    }
    for (const [x, y] of HUB.trees) grid[y][x] = '#';
    for (const h of HUB.houses) for (let y = h.y; y < h.y + h.h; y++) for (let x = h.x; x < h.x + h.w; x++) G.block.add(x + ',' + y);
    for (const [x, y] of [[21, 15], [22, 15], [21, 16], [22, 16]]) G.block.add(x + ',' + y);
    for (const [x, y] of HUB.stalls) G.block.add(x + ',' + y);
    for (const [x, y] of [[9, 18], [13, 28]]) G.block.add(x + ',' + y);
    reserve(36, 13, 0); reserve(68.4, 47, 0); reserve(70.6, 46.8, 0); for (const f of HUB.fishSpots) reserve(f.x + 1, f.z, 1); reserve(IVO_PIER[0] + 1, IVO_PIER[1], 1); reserve(HUB.fishery[0], HUB.fishery[1], 1);
    const pn = HUB.pen;
    for (let y = pn.y0; y <= pn.y1; y++) for (let x = pn.x0; x <= pn.x1; x++) { G.reserved.add(x + ',' + y); if ((x === pn.x0 || x === pn.x1 || y === pn.y0 || y === pn.y1) && !(y === pn.y0 && x === 16)) G.block.add(x + ',' + y); }
    for (const p of HUB.portals) reserve(p.x, p.z, 1);
    { const sc = HUB.sanct; for (const [px, pz] of sc.pil) G.block.add(Math.floor(px / T) + ',' + Math.floor(pz / T)); reserve(sc.gate[0], sc.gate[1], 2); for (const dz of [-2.9, 2.9]) G.block.add(Math.floor(sc.arch[0] / T) + ',' + Math.floor((sc.arch[1] + dz) / T)); }
    for (const n of NPCS) reserve(n.x, n.z, 0);
    for (const n of EAST_NPCS) reserve(n.x, n.z, 0);
    for (const l of HUB.lamps) reserve(l[0], l[1], 0);
    for (const p of HUB.props) reserve(p[0], p[1], 0);
    // bordas orgânicas: a linha de árvores avança e recua (nunca perto de caminhos, portais, casas ou coisas reservadas)
    const nearPath = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const c = grid[y + dy]?.[x + dx]; if (c === ',' || c === '~') return true; } return false; };
    const free = (x, y) => !G.reserved.has(x + ',' + y) && !G.block.has(x + ',' + y);
    const n4 = (x, y, ch) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => grid[y + dy]?.[x + dx] === ch);
    for (let pass = 0; pass < 2; pass++) {
      const flip = [];
      for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
        const c = grid[y][x], n = vnoise(x * .33 + pass * 7, y * .33 + 11);
        if (c === '.' && n < .36 && n4(x, y, '#') && free(x, y) && !nearPath(x, y, 2)) flip.push([x, y, '#']);
        else if (c === '#' && n > .64 && n4(x, y, '.') && x > 3 && y > 3 && x < W - 4 && y < H - 4) flip.push([x, y, '.']);
      }
      for (const [x, y, ch] of flip) grid[y][x] = ch;
    }
    for (let y = 8; y <= 10; y++) for (let x = 32; x <= 36; x++) G.block.add(x + ',' + y);   // prédio do banco (lado norte da praça)
    reserve(HUB.bank.x, HUB.bank.z + 4.2, 1);
    G.hills = [];   // morros decorativos removidos (a pedido): relevo de verdade, com subida, fica para o futuro
  }
  G.start = G.rooms[0];
  return G;
}
function blocked(tx, ty) {
  const G = RG; if (!G) return true;
  if (tx < 0 || ty < 0 || tx >= G.W || ty >= G.H) return true;
  const c = G.grid[ty][tx];
  if (c === '#' || c === '~' || c === 'V') return true;
  const k = tx + ',' + ty;
  if (G.block.has(k)) return true;
  if (G.gatesOn && G.gateSet.has(k)) return true;
  return false;
}
function freeSpot(cx, cz, rad) {
  for (let i = 0; i < 30; i++) { const a = rr(0, 6.28), d = rr(rad * .25, rad), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (!blocked(Math.floor(x / T), Math.floor(z / T))) return [x, z]; }
  return [cx, cz];
}

/* ---- construção do mundo em splats ---- */
function buildWorld(key, G) {
  const st = REG[key].style, emitters = [];
  let S = new SplatSet(G.seed + 7, st === 'wilds' ? 22 : 34, null, true), R = S.R;   // let: nos Ermos, cada bloco troca o S (mundo sob demanda)
  const isFloor = (x, y) => { const c = G.grid[y]?.[x]; return c === '.' || c === ',' || c === '~'; };
  const nearFloor = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (isFloor(x + dx, y + dy)) return true; return false; };
  const DF = st === 'wilds' ? 20 : 34;
  const tree = (x0, z0, s) => {
    const jx = (R() - .5) * .3, jz = (R() - .5) * .3;
    S.tube([[x0, 0, z0, .27 * s, 0], [x0 + jx, 1.5 * s, z0 + jz, .2 * s, 0]], 12, { sub: 1, flags: 8, dm: 1.4 });
    S.ell([x0 + jx, 2.3 * s, z0 + jz], [1.2 * s, .95 * s, 1.2 * s], 13, 0, { keep: d => d[1] > -.35, flags: 8, dm: .5, size: 1.4 });
    S.ell([x0 + jx + .25, 3.0 * s, z0 + jz - .2], [.8 * s, .7 * s, .8 * s], 13, 0, { keep: d => d[1] > -.2, flags: 8, dm: .5, size: 1.4 });
    for (let k = 0; k < 3; k++) { const a = R() * 6.28; S.cone([x0, .25, z0], [x0 + Math.cos(a) * .6, 0, z0 + Math.sin(a) * .6], .1, 12, 0, { flags: 8 }); }
  };
  // Um ladrilho do mapa: chão, água ou parede, com a decoração. Só depende da posição (e do sorteio R).
  const tileAt = (x, y) => {
    if (G.wild) S.remap = WREMAP[wZone(x, y)] || null;   // cores do bioma deste ladrilho
    const c = G.grid[y][x], wx = (x + .5) * T, wz = (y + .5) * T;
    if (c === '.' || c === ',' || c === 'V') {
      const n = Math.round(T * T * DF), th = hash2(x * 3.1, y * 7.3), th2 = hash2(y * 5.7, x * 1.9);
      for (let k = 0; k < n; k++) {
        const px = x * T + R() * T, pz = y * T + R() * T;
        let mat = 8, nrm = [(th - .5) * .2, 1, (th2 - .5) * .2], h = 0;
        if (st === 'hub') {
          if (c === ',') { const cu = px / .6, cv = pz / .6 + Math.floor(px / .6) * .5; const e = Math.min(frac(cu), 1 - frac(cu), frac(cv), 1 - frac(cv)); mat = e < .1 ? 11 : 9; const hh = hash2(Math.floor(cu), Math.floor(cv)); nrm = [(hh - .5) * .4, 1, (hash2(Math.floor(cv), 3) - .5) * .4]; }
          else mat = vnoise(px * .3, pz * .3) > .6 ? 10 : 8;
        } else if (st === 'forest') {
          if (c === ',') mat = vnoise(px * .5, pz * .5) > .7 ? 8 : 9; else mat = vnoise(px * .25, pz * .25) > .58 ? 10 : 8;
        } else if (st === 'crypt') {
          const fu = frac(px / (c === ',' ? .7 : 1)), fv = frac(pz / (c === ',' ? .7 : 1));
          mat = Math.min(fu, 1 - fu, fv, 1 - fv) < .05 ? 9 : 8;
          if (mat === 8 && vnoise(px * .4, pz * .4) > .72) mat = 10;
          const cs = c === ',' ? .7 : 1, hh = hash2(Math.floor(px / cs) * 1.3, Math.floor(pz / cs) * 2.1); nrm = [(hh - .5) * .35, 1, (hash2(Math.floor(pz / cs), Math.floor(px / cs)) - .5) * .35];
        } else if (st === 'home') {
          const rug = Math.abs(px - 16) < 3.6 && Math.abs(pz - 13.4) < 2.4, rugE = rug && (Math.abs(px - 16) > 3.2 || Math.abs(pz - 13.4) > 2.0);
          mat = rug ? (rugE ? 17 : (Math.abs(frac((px - 16) * .6 + (pz - 13.4) * .6) - .5) < .12 ? 16 : 22)) : (frac(pz / .55) < .07 || frac(px / 2.2 + Math.floor(pz / .55) * .37) < .025 ? 9 : 8);
          nrm = [0, 1, 0];
        } else if (st === 'wilds') {
          const zz = WZ[wZone(px / T + (vnoise(px * .2, pz * .2) - .5) * 5, pz / T + (vnoise(pz * .2, px * .2 + 9) - .5) * 5)].style, n0 = vnoise(px * .3 + 2, pz * .3);
          if (c === 'V') mat = (frac(px / .8) < .07 || frac(pz / .8 + Math.floor(px / .8) * .5) < .07) ? 11 : (n0 > .6 ? 23 : 9);
          else if (c === ',') mat = n0 > .7 ? 8 : 9;
          else if (zz === 0) mat = n0 > .6 ? 10 : 8;
          else if (zz === 1) mat = n0 > .55 ? 22 : n0 < .3 ? 13 : 8;
          else if (zz === 2) mat = n0 > .6 ? 25 : n0 < .35 ? 9 : 23;
          else { mat = n0 > .55 ? 24 : 29; if (Math.abs(vnoise(px * .45, pz * .45) - .5) < .012) mat = 21; }
        } else if (st === 'swamp') {
          const m = vnoise(px * .3 + 4, pz * .3); mat = c === ',' ? (m > .55 ? 9 : 8) : (m > .6 ? 10 : m < .3 ? 9 : 8);
          if (vnoise(px * .9, pz * .9) > .8) mat = 10;
        } else if (st === 'glass') {
          const cs = c === ',' ? .8 : 1.6, gx = Math.floor(px / cs), gz = Math.floor(pz / cs), fu = frac(px / cs), fv = frac(pz / cs), e2 = Math.min(fu, 1 - fu, fv, 1 - fv);
          mat = e2 < .045 ? (hash2(gx, gz) > .8 ? 14 : 9) : (hash2(gx * 1.7, gz * 2.3) > .72 ? 10 : 8);
          nrm = [(hash2(gx * 3.1, gz) - .5) * .5, 1, (hash2(gz, gx + 7) - .5) * .5];
        } else {
          if (Math.abs(vnoise(px * .45, pz * .45) - .5) < .013) mat = 14;
          else mat = (c === ',' || vnoise(px * .3 + 5, pz * .3) > .62) ? 9 : 8;
          if (mat === 8 && vnoise(px * .2 + 9, pz * .2) > .75) mat = 10;
        }
        h = (th - .5) * .03;
        if (st === 'hub') { const ld = hubLakeD(px, pz); if (ld < 1) { S.pt([px, -.12, pz], [(R() - .5) * .3, 1, (R() - .5) * .3], 15, 0, .42, 4 | 16); continue; } if (ld < 1.14) { mat = ld < 1.06 ? 9 : (R() < .5 ? 9 : mat); nrm = [0, 1, 0]; } }   // margem orgânica: água e areia
        S.pt([px, h, pz], nrm, mat, 0, 2.4 / Math.sqrt(DF) * (1.05 + .4 * R()), 4);
      }
      if (st === 'glass') { const sol = (xx, yy) => { const c2 = G.grid[yy]?.[xx]; return c2 === '.' || c2 === ','; }; let f = ''; if (!sol(x, y - 1)) f += 'n'; if (!sol(x, y + 1)) f += 's'; if (!sol(x + 1, y)) f += 'e'; if (!sol(x - 1, y)) f += 'w'; if (f) S.box([wx, -.75, wz], [1, .75, 1], p => frac(p[1] * 1.6) < .1 ? 14 : 11, 0, { faces: f }); }
      if (c !== 'V' && !G.reserved.has(x + ',' + y)) decorate(x, y, wx, wz, c);
    } else if (c === '~') {
      const n = Math.round(T * T * DF * .9);
      for (let k = 0; k < n; k++) {
        const px = x * T + R() * T, pz = y * T + R() * T;
        if (st === 'peaks') S.pt([px, -.15, pz], [0, 1, 0], 14, 0, .42 * (.8 + .4 * R()), 16, .7 + R() * .25);
        else if (st === 'glass') { if (R() < .035) S.pt([px, -2 - R() * 7, pz], [0, 1, 0], R() < .35 ? 14 : 13, 0, .08 + R() * .14, 16); }
        else if (st === 'hub' && hubLakeD(px, pz) >= 1) S.pt([px, (R() - .5) * .02, pz], [0, 1, 0], hubLakeD(px, pz) < 1.08 ? 9 : 8, 0, 2.4 / Math.sqrt(DF) * 1.2, 4);   // borda do ladrilho fora do contorno: areia/grama
        else S.pt([px, -.12, pz], [(R() - .5) * .3, 1, (R() - .5) * .3], 15, 0, .42, 4 | 16);
      }
      if (st === 'hub') {   // juncos, pedras e vitórias-régias pela margem
        if (R() < .35) { const rx = wx + (R() - .5) * 1.8, rz = wz + (R() - .5) * 1.8, ld = hubLakeD(rx, rz); if (ld > .9 && ld < 1.05) for (let k = 0; k < 4; k++) S.cone([rx + (R() - .5) * .3, -.1, rz + (R() - .5) * .3], [rx + (R() - .5) * .4, .6 + R() * .5, rz + (R() - .5) * .4], .035, R() < .3 ? 12 : 10, 0); }
        if (R() < .18) { const lx = wx + (R() - .5) * 1.6, lz = wz + (R() - .5) * 1.6; if (hubLakeD(lx, lz) < .85) S.ell([lx, -.08, lz], [.3, .02, .28], 10, 0, { keep: d => Math.atan2(d[2], d[0]) < 2.6, min: 14 }); }
        if (R() < .1) { const ox = wx + (R() - .5) * 1.8, oz = wz + (R() - .5) * 1.8; if (Math.abs(hubLakeD(ox, oz) - 1.02) < .06) S.ell([ox, .05, oz], [.25 + R() * .2, .18, .22], 11, 0); }
      }
      if (st === 'peaks' && R() < .12) emitters.push({ t: 'lava', x: wx, y: 0, z: wz });
      if (st === 'swamp') {
        if (R() < .3) { const lx = wx + (R() - .5) * 1.4, lz = wz + (R() - .5) * 1.4; S.ell([lx, -.06, lz], [.32, .02, .3], 10, 0, { keep: d => Math.atan2(d[2], d[0]) < 2.6, min: 16 }); if (R() < .3) S.ell([lx + .1, .02, lz], .07, 25, 0, { min: 6 }); }
        if (R() < .12) for (let k = 0; k < 5; k++) { const rx = wx + (R() - .5) * 1.6, rz = wz + (R() - .5) * 1.6; S.cone([rx, -.1, rz], [rx + (R() - .5) * .2, .7 + R() * .6, rz + (R() - .5) * .2], .04, R() < .3 ? 12 : 10, 0); }
        if (R() < .08) emitters.push({ t: 'bubble', x: wx, y: 0, z: wz });
      }
    } else if (c === '#' && !G.block.has(x + ',' + y)) {
      const edge = nearFloor(x, y);
      if (st === 'hub' || st === 'forest') {
        if (edge) { if (st === 'forest' && R() < .22) S.ell([wx + (R() - .5) * .5, .55, wz + (R() - .5) * .5], [1.1, .95, 1.05], (p, n) => n[1] > .55 ? 10 : 11, 0, { keep: d => d[1] > -.3, flags: 8, dm: .7 }); else tree(wx + (R() - .5) * .6, wz + (R() - .5) * .6, .9 + R() * .35); }
        else S.ell([wx + (R() - .5) * .6, 2.5 + R() * .6, wz + (R() - .5) * .6], [1.35, .9, 1.35], 13, 0, { keep: d => d[1] > 0, flags: 8, dm: .32, size: 1.6 });
      } else if (st === 'crypt') {
        if (edge) {
          let f = 't';
          if (isFloor(x, y - 1)) f += 'n'; if (isFloor(x, y + 1)) f += 's'; if (isFloor(x + 1, y)) f += 'e'; if (isFloor(x - 1, y)) f += 'w';
          S.box([wx, 1.1, wz], [1, 1.1, 1], (p, n) => n[1] > .5 ? 9 : ((frac(p[1] / .45) < .12 || frac((p[0] + p[2] + Math.floor(p[1] / .45) * .45) / .9) < .08) ? 9 : 11), 0, { faces: f, flags: 8 });
          if (isFloor(x, y + 1) && R() < .1) { S.box([wx, 1.5, wz + 1.06], [.08, .14, .06], 12, 0, { faces: 'stew' }); emitters.push({ t: 'torch', x: wx, y: 1.75, z: wz + 1.1 }); }
        } else S.box([wx, 1.1, wz], [1, 1.1, 1], 9, 0, { faces: 't', dm: .5, flags: 8 });
      } else if (st === 'home') {
        if (edge) {
          let f = 't'; if (isFloor(x, y - 1)) f += 'n'; if (isFloor(x, y + 1)) f += 's'; if (isFloor(x + 1, y)) f += 'e'; if (isFloor(x - 1, y)) f += 'w';
          const low = isFloor(x, y - 1) && !isFloor(x, y + 1), hh = low ? .35 : 1.5;
          S.box([wx, hh, wz], [1, hh, 1], (p, n) => n[1] > .5 ? 24 : (p[1] < .25 ? 24 : (Math.abs(frac(p[0] / 2 + p[2] / 2) - .5) < .05 || Math.abs(p[1] - 1.9) < .05) ? 12 : 11), 0, { faces: f, flags: 8 });
        }
      } else if (st === 'wilds') {
        const zz = WZ[wZone(x, y)].style;
        if (edge) {
          if (zz <= 1) { if (R() < .18) S.ell([wx + (R() - .5) * .5, .55, wz + (R() - .5) * .5], [1.1, .9, 1.05], (p, n) => n[1] > .55 ? 10 : 11, 0, { keep: d => d[1] > -.3, flags: 8, dm: .7 }); else tree(wx + (R() - .5) * .6, wz + (R() - .5) * .6, (zz ? 1.05 : .9) + R() * .4); }
          else if (zz === 2) { if (R() < .6) S.ell([wx + (R() - .5) * .5, .8, wz + (R() - .5) * .5], [1.1, 1.0 + R() * .7, 1.0], (p, n) => n[1] > .6 ? 25 : (frac(p[1] * 2.2) < .12 ? 23 : 11), 0, { keep: d => d[1] > -.3, flags: 8, dm: .7 }); else { const ox = wx + (R() - .5) * .6, oz = wz + (R() - .5) * .6; S.tube([[ox, 0, oz, .2, 0], [ox + (R() - .5) * .5, 1.8, oz + (R() - .5) * .5, .08, 0]], 12, { sub: 1, flags: 8 }); S.ell([ox, 1.9, oz], [.9, .5, .9], 25, 0, { keep: d => d[1] > -.3, flags: 8, dm: .5 }); } }
          else { const ox = wx + (R() - .5) * .6, oz = wz + (R() - .5) * .6; if (R() < .5) { S.tube([[ox, 0, oz, .22, 0], [ox + (R() - .5) * .6, 1.4, oz + (R() - .5) * .6, .1, 0], [ox + (R() - .5), 2.4, oz + (R() - .5), .03, 0]], 29, { sub: 2, flags: 8 }); for (let k = 0; k < 3; k++) { const a = R() * 6.28, y0 = .9 + k * .45; S.cone([ox, y0, oz], [ox + Math.cos(a) * .9, y0 + .5, oz + Math.sin(a) * .9], .06, 29, 0, { flags: 8 }); } } else { S.ell([ox, .9, oz], [1.05, 1.3, 1.0], (p, n) => n[1] > .62 ? 24 : 29, 0, { keep: d => d[1] > -.3, flags: 8, dm: .75 }); if (R() < .3) S.cone([ox, 1.2, oz], [ox + (R() - .5) * .4, 2.8, oz + (R() - .5) * .4], .24, 24, 0, { flags: 8 }); } }
        } else if (zz <= 1 || R() < .5) S.ell([wx + (R() - .5) * .6, zz <= 1 ? 2.5 + R() * .6 : 1.2, wz + (R() - .5) * .6], [1.35, .9, 1.35], zz <= 1 ? 13 : zz === 2 ? 23 : 29, 0, { keep: d => d[1] > 0, flags: 8, dm: .3, size: 1.6 });
      } else if (st === 'swamp') {
        if (edge) {
          const ox = wx + (R() - .5) * .6, oz = wz + (R() - .5) * .6, sc = .9 + R() * .45;
          if (R() < .55) {
            const bx = (R() - .5) * .9, bz = (R() - .5) * .9, tx = ox + bx, tz = oz + bz;
            S.tube([[ox, 0, oz, .3 * sc, 0], [ox + bx * .3, 1.0 * sc, oz + bz * .3, .2 * sc, 0], [tx, 2.1 * sc, tz, .1 * sc, 0]], 12, { sub: 2, flags: 8, dm: 1.3 });
            for (let k = 0; k < 3; k++) { const a = R() * 6.28, y0 = 1.3 * sc + k * .3, bx0 = ox + bx * .6, bz0 = oz + bz * .6, ex = bx0 + Math.cos(a) * 1.1, ez = bz0 + Math.sin(a) * 1.1; S.cone([bx0, y0, bz0], [ex, y0 + .5, ez], .07, 12, 0, { flags: 8 }); S.cone([ex - Math.cos(a) * .25, y0 + .38, ez - Math.sin(a) * .25], [ex - Math.cos(a) * .2, y0 - .55, ez - Math.sin(a) * .2], .06, 13, 0, { flags: 8 }); }
            for (let k = 0; k < 3; k++) { const a = R() * 6.28; S.cone([ox, .25, oz], [ox + Math.cos(a) * .75, 0, oz + Math.sin(a) * .75], .12, 12, 0, { flags: 8 }); }
            if (R() < .4) S.ell([tx, 2.45 * sc, tz], [1.3, .7, 1.3], 13, 0, { keep: d => d[1] > -.55, flags: 8, dm: .5, size: 1.4 });
          } else S.ell([ox, .4, oz], [1.1, .7, 1.0], (p, n) => n[1] > .5 ? 10 : 11, 0, { keep: d => d[1] > -.3, flags: 8, dm: .7 });
        } else S.ell([wx + (R() - .5) * .6, 2.3 + R() * .8, wz + (R() - .5) * .6], [1.4, .8, 1.4], 13, 0, { keep: d => d[1] > 0, flags: 8, dm: .3, size: 1.6 });
      } else if (st === 'glass') {
        if (edge) {
          const r0 = R(), hgt = 1.2 + R() * 2.4;
          S.box([wx, .2, wz], [1, .2, 1], (p, n) => n[1] > .5 ? 9 : 11, 0, { faces: 'tnsew' });
          if (r0 < .45) { const px = wx + (R() - .5) * .6, pz = wz + (R() - .5) * .6; S.cone([px, .1, pz], [px + (R() - .5) * .3, hgt, pz + (R() - .5) * .3], .3 + R() * .15, p => p[1] > hgt * .72 ? 13 : 11, 0, { flags: 8 }); if (R() < .5) S.cone([px + .3, .1, pz - .2], [px + .55, hgt * .55, pz - .1], .17, 13, 0, { flags: 8 }); if (R() < .25) emitters.push({ t: 'shine', x: px, y: hgt * .8, z: pz }); }
          else if (r0 < .6) { S.box([wx, 1.1, wz], [.28, 1.0, .28], p => frac(p[1] * 1.5) < .08 ? 14 : 11, 0, { faces: 'tnsew', flags: 8 }); S.ell([wx, 2.35, wz], .22, 13, 0, {}); }
        } else if (R() < .05) { const fy = -1.5 - R() * 3, fx = wx + (R() - .5), fz = wz + (R() - .5); S.cone([fx, fy - 1, fz], [fx, fy + .8, fz], .5, 13, 0); S.cone([fx, fy - 1, fz], [fx + .1, fy - 2.2, fz], .45, 11, 0); }
      } else {
        if (edge) {
          S.ell([wx + (R() - .5) * .5, .95, wz + (R() - .5) * .5], [1.05, 1.35, 1.05], (p, n) => n[1] > .62 ? 9 : 11, 0, { keep: d => d[1] > -.3, flags: 8, dm: .75 });
          if (R() < .4) { const sx = wx + (R() - .5) * 1.2, sz = wz + (R() - .5) * 1.2; S.cone([sx, 1.3, sz], [sx + (R() - .5) * .4, 2.6 + R() * .8, sz + (R() - .5) * .4], .26, 13, 0, { flags: 8 }); }
        } else S.ell([wx, 1.3, wz], [1.25, 1.0, 1.25], 11, 0, { keep: d => d[1] > 0, dm: .35, size: 1.5, flags: 8 });
      }
    }
  };
  if (!G.wild) for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) tileAt(x, y);   // nos Ermos, os ladrilhos são montados por bloco, sob demanda
  function decorate(x, y, wx, wz, c) {
    if (st === 'home') return;
    const r = R(), ox = wx + (R() - .5) * 1.4, oz = wz + (R() - .5) * 1.4;
    if (st === 'hub') {
      if (c === '.' && r < .2) for (let k = 0; k < 5; k++) { const fx = ox + (R() - .5) * .8, fz = oz + (R() - .5) * .8; S.cone([fx, 0, fz], [fx, .22, fz], .03, 10, 0); S.ell([fx, .24, fz], .06, R() < .5 ? 16 : 17, 0, { min: 6 }); }
      else if (c === '.' && r < .26) for (let k = 0; k < 4; k++) { const a = R() * 6.28; S.cone([ox, 0, oz], [ox + Math.cos(a) * .25, .35, oz + Math.sin(a) * .25], .05, 10, 0); }
    } else if (st === 'forest') {
      if (r < .16) for (let k = 0; k < 4; k++) { const a = R() * 6.28; S.cone([ox, 0, oz], [ox + Math.cos(a) * .25, .4, oz + Math.sin(a) * .25], .05, 10, 0); }
      else if (r < .2) { S.tube([[ox, 0, oz, .05, 0], [ox, .25, oz, .045, 0]], 9, { sub: 1 }); S.ell([ox, .28, oz], [.16, .07, .16], 14, 0, { min: 10 }); if (R() < .4) emitters.push({ t: 'spore', x: ox, y: .3, z: oz }); }
      else if (r < .23) S.ell([ox, .15, oz], [.3, .2, .25], 11, 0);
      else if (r < .24) S.tube([[ox - .8, .18, oz, .18, 0], [ox + .8, .2, oz + .3, .16, 0]], 12, { sub: 1 });
    } else if (st === 'crypt') {
      if (r < .05) { for (let k = 0; k < 3; k++) { const a = R() * 3.14; S.tube([[ox, .04, oz, .025, 0], [ox + Math.cos(a) * .35, .04, oz + Math.sin(a) * .35, .025, 0]], 28, { sub: 1 }); } S.ell([ox + .2, .1, oz], [.1, .09, .11], 28, 0); }
      else if (r < .08) { S.ell([ox, .3, oz], [.2, .3, .2], 12, 0); S.ell([ox, .62, oz], [.12, .04, .12], 12, 0); }
      else if (r < .1) { for (let k = 0; k < 3; k++) { const cx = ox + (R() - .5) * .4, cz = oz + (R() - .5) * .4, hh = .15 + R() * .2; S.tube([[cx, 0, cz, .04, 0], [cx, hh, cz, .04, 0]], 13, { sub: 1 }); S.pt([cx, hh + .05, cz], [0, 1, 0], 14, 0, .08); } emitters.push({ t: 'candle', x: ox, y: .4, z: oz }); }
    } else if (st === 'wilds') {
      const wb = wZone(x, y), zz = WZ[wb].style;
      if (zz === 0) { if (c === '.' && r < .14) for (let k = 0; k < 5; k++) { const fx = ox + (R() - .5) * .8, fz = oz + (R() - .5) * .8; S.cone([fx, 0, fz], [fx, .22, fz], .03, 10, 0); S.ell([fx, .24, fz], .06, [14, 17, 25][k % 3], 0, { min: 6 }); } else if (r < .22) for (let k = 0; k < 4; k++) { const a = R() * 6.28; S.cone([ox, 0, oz], [ox + Math.cos(a) * .25, .35, oz + Math.sin(a) * .25], .05, 10, 0); } }
      else if (zz === 1) { if (r < .12) for (let k = 0; k < 5; k++) { const a = R() * 6.28; S.cone([ox, 0, oz], [ox + Math.cos(a) * .45, .3, oz + Math.sin(a) * .45], .07, 13, 0); } else if (r < .16) { S.tube([[ox, 0, oz, .05, 0], [ox, .25, oz, .045, 0]], 28, { sub: 1 }); S.ell([ox, .28, oz], [.16, .07, .16], 14, 0, { min: 10 }); if (R() < .4) emitters.push({ t: 'spore', x: ox, y: .3, z: oz }); } else if (r < .18) S.tube([[ox - .8, .18, oz, .18, 0], [ox + .8, .2, oz + .3, .16, 0]], 12, { sub: 1 }); }
      else if (zz === 2) { if (r < .08) S.ell([ox, .15, oz], [.3 + R() * .3, .22, .28], 11, 0); else if (r < .13) for (let k = 0; k < 4; k++) { const a = R() * 6.28; S.cone([ox, 0, oz], [ox + Math.cos(a) * .3, .45, oz + Math.sin(a) * .3], .05, 25, 0); } }
      else { if (r < .05) { for (let k = 0; k < 3; k++) { const a = R() * 3.14; S.tube([[ox, .04, oz, .025, 0], [ox + Math.cos(a) * .35, .04, oz + Math.sin(a) * .35, .025, 0]], 28, { sub: 1 }); } S.ell([ox + .2, .1, oz], [.1, .09, .11], 28, 0); } else if (r < .08) { S.pt([ox, .02, oz], [0, 1, 0], 21, 0, .3, 16); emitters.push({ t: 'vent', x: ox, y: .1, z: oz }); } else if (r < .11) S.cone([ox, 0, oz], [ox + (R() - .5) * .3, .6 + R() * .5, oz + (R() - .5) * .3], .14, 24, 0); }
      // detalhes de cada bioma, além da forma base
      const r2 = R();
      if (wb === 2) {
        if (r2 < .06) { const a = R() * 6.28, L = .8 + R() * .7, x1 = ox + Math.cos(a) * L, z1 = oz + Math.sin(a) * L, h = .9 + R() * .6; S.mem([[[ox, .05, oz], [x1, .05, z1], [(ox + x1) / 2, h, (oz + z1) / 2]]], 152, () => 0, { dm: .35 }); }   // teia
        else if (r2 < .09) { S.ell([ox, .45, oz], [.22, .36, .22], 152, 0, { min: 18 }); S.tube([[ox, .8, oz, .02, 0], [ox, 1.7, oz, .015, 0]], 152, { sub: 1 }); }   // casulo
      } else if (wb === 3) {
        if (r2 < .1) for (let k = 0; k < 6; k++) { const a = R() * 6.28, d = R() * .4; S.cone([ox + Math.cos(a) * d, 0, oz + Math.sin(a) * d], [ox + Math.cos(a) * d + (R() - .5) * .15, .6 + R() * .5, oz + Math.sin(a) * d], .03, 22, 0); }   // juncos
        else if (r2 < .12) emitters.push({ t: 'mist', x: ox, y: .2, z: oz });
      } else if (wb === 5) {
        if (r2 < .07) { S.box([ox, .45, oz], [.28, .45, .09], 154, 0, { faces: 'tnsew' }); if (R() < .5) S.box([ox, .75, oz], [.42, .08, .09], 154, 0, { faces: 'tnsew' }); }   // lápide
        else if (r2 < .085) { S.tube([[ox, 0, oz, .04, 0], [ox, .3, oz, .035, 0]], 28, { sub: 1 }); emitters.push({ t: 'candle', x: ox, y: .34, z: oz }); }
      } else if (wb === 6) {
        if (r2 < .05) { S.pt([ox, .02, oz], [0, 1, 0], 158, 0, .35, 16); emitters.push({ t: 'vent', x: ox, y: .1, z: oz }); }   // fenda com brasas
        else if (r2 < .1) S.ell([ox, .2, oz], [.4 + R() * .3, .3, .35], 156, 0);
      }
    } else if (st === 'swamp') {
      if (r < .07) for (let k = 0; k < 5; k++) { const a = R() * 6.28, d0 = R() * .35; S.cone([ox + Math.cos(a) * d0, 0, oz + Math.sin(a) * d0], [ox + Math.cos(a) * (d0 + .15), .6 + R() * .5, oz + Math.sin(a) * (d0 + .15)], .04, R() < .3 ? 12 : 10, 0); }
      else if (r < .1) { S.tube([[ox, 0, oz, .05, 0], [ox, .22, oz, .04, 0]], 28, { sub: 1 }); S.ell([ox, .25, oz], [.14, .06, .14], 14, 0, { min: 10 }); if (R() < .5) emitters.push({ t: 'spore', x: ox, y: .3, z: oz }); }
      else if (r < .13) S.ell([ox, .02, oz], [.5, .02, .42], 15, 0, { flags: 16, min: 20 });
      else if (r < .145) { for (let k = 0; k < 3; k++) { const a = R() * 3.14; S.tube([[ox, .04, oz, .025, 0], [ox + Math.cos(a) * .35, .04, oz + Math.sin(a) * .35, .025, 0]], 28, { sub: 1 }); } S.ell([ox + .2, .1, oz], [.1, .09, .11], 28, 0); }
      else if (r < .16) S.tube([[ox - .9, .15, oz, .16, 0], [ox + .9, .2, oz + .4, .13, 0]], 12, { sub: 1 });
      else if (r < .175) emitters.push({ t: 'mist', x: ox, y: .2, z: oz });
    } else if (st === 'glass') {
      if (r < .05) { const hh = .3 + R() * .5; S.cone([ox, 0, oz], [ox + (R() - .5) * .2, hh, oz + (R() - .5) * .2], .12, 13, 0); S.cone([ox + .15, 0, oz], [ox + .25, hh * .6, oz + .05], .07, 13, 0); }
      else if (r < .07) { S.pt([ox, .03, oz], [0, 1, 0], 14, 0, .35, 16); emitters.push({ t: 'shine', x: ox, y: .4, z: oz }); }
      else if (r < .09) for (let k = 0; k < 5; k++) S.pt([ox + (R() - .5) * .6, .03, oz + (R() - .5) * .6], [R() - .5, 1, R() - .5], 13, 0, .12, 0);
    } else {
      if (r < .06) S.ell([ox, .15, oz], [.3 + R() * .2, .22, .28], 11, 0);
      else if (r < .09) S.cone([ox, 0, oz], [ox + (R() - .5) * .3, .6 + R() * .5, oz + (R() - .5) * .3], .14, 13, 0);
      else if (r < .11) { S.pt([ox, .02, oz], [0, 1, 0], 14, 0, .3, 16); emitters.push({ t: 'vent', x: ox, y: .1, z: oz }); }
      else if (r < .125) { S.tube([[ox, 0, oz, .12, 0], [ox + .1, 1.4, oz, .07, 0]], 12, { sub: 1, flags: 8 }); S.cone([ox + .08, 1.0, oz], [ox + .6, 1.5, oz + .2], .05, 12, 0, { flags: 8 }); S.cone([ox + .06, .8, oz], [ox - .5, 1.2, oz - .1], .045, 12, 0, { flags: 8 }); }
    }
  }
  if (key === 'hub') {
    let shutC = 23;
    const win = (px, py, pz, f) => {
      if (f === 's') {
        S.box([px, py, pz], [.3, .25, .05], 14, 0, { faces: 's' });
        S.box([px, py, pz + .03], [.32, .025, .03], 12, 0, { faces: 's' }); S.box([px, py, pz + .03], [.025, .27, .03], 12, 0, { faces: 's' });
        S.box([px, py - .32, pz + .1], [.38, .06, .12], 12, 0, { faces: 'tsew' });
        for (let k = 0; k < 5; k++) S.ell([px - .28 + k * .14, py - .22, pz + .14], .055, [16, 17, 10, 16, 13][k], 0, { min: 6 });
        for (const s2 of [-1, 1]) S.box([px + s2 * .47, py, pz + .03], [.13, .29, .03], shutC, 0, { faces: 's' });
      } else { const sx = f === 'e' ? 1 : -1; S.box([px, py, pz], [.05, .25, .3], 14, 0, { faces: f }); S.box([px + sx * .03, py, pz], [.03, .025, .32], 12, 0, { faces: f }); S.box([px + sx * .03, py, pz], [.03, .27, .025], 12, 0, { faces: f }); }
    };
    HUB.houses.forEach((h, hi) => {
      const x0 = h.x * T, z0 = h.y * T, w = h.w * T, d = h.h * T, cx = x0 + w / 2, cz = z0 + d / 2, hw = w / 2 - .15, hd = d / 2 - .15, fz = cz + hd;
      const plaster = h.forge ? 9 : [24, 25, 24, 11, 25][hi % 5]; shutC = h.roof === 22 ? 23 : 18;
      S.box([cx, .22, cz], [hw + .08, .22, hd + .08], p => frac(p[0] * 1.4 + p[2] * 1.4 + Math.floor(p[1] * 4.5) * .5) < .1 ? 29 : 11, 0, { faces: 'nsew' });
      S.box([cx, 1.51, cz], [hw, 1.09, hd], h.forge ? p => (frac(p[1] * 2.4) < .1 || frac((p[0] + p[2]) * .9 + Math.floor(p[1] * 2.4) * .5) < .08) ? 29 : (frac(p[0] * 3.1 + p[1] * 1.7) < .3 ? 11 : 9) : p => (Math.abs(frac((p[0] + p[2]) / 1.5 + .5) - .5) < .04 || Math.abs(p[1] - 1.5) < .055 || p[1] > 2.5) ? 12 : plaster, 0, { faces: 'nsew', flags: 8 });   // ferraria: pedra em blocos
      const o = .45, ey = 2.6, ry = 4.05;
      const A = [x0 - o, ey, z0 - o], B = [x0 + w + o, ey, z0 - o], C = [x0 + w + o, ry, cz], D = [x0 - o, ry, cz], E = [x0 + w + o, ey, z0 + d + o], F = [x0 - o, ey, z0 + d + o];
      S.mem([[A, B, C], [A, C, D], [D, C, E], [D, E, F]], p => (frac(p[1] * 2.6) < .16 || frac(p[0] * .8 + Math.floor(p[1] * 2.6) * .5) < .05) ? 29 : h.roof, () => 0, { flags: 8, dm: 1.15 });
      S.tube([[D[0] - .05, ry + .06, cz, .09, 0], [C[0] + .05, ry + .06, cz, .09, 0]], 12, { sub: 1, flags: 8 });
      for (const ez of [z0 - o, z0 + d + o]) S.tube([[x0 - o, ey - .04, ez, .055, 0], [x0 + w + o, ey - .04, ez, .055, 0]], 12, { sub: 1, flags: 8 });
      for (const gx of [x0 + .15, x0 + w - .15]) S.mem([[[gx, ey, z0 + .15], [gx, ey, z0 + d - .15], [gx, ry - .05, cz]]], p => (Math.abs(p[2] - cz) < .05 || Math.abs(p[1] - 3.1) < .05) ? 12 : plaster, () => 0, { flags: 8 });
      if (h.forge) {
        S.box([cx, .45, fz + .85], [.4, .25, .2], 29, 0); S.box([cx, .15, fz + .85], [.18, .15, .15], 29, 0); S.box([cx - .45, .6, fz + .85], [.08, .05, .12], 29, 0);
        S.box([x0 + .6, .5, fz + .3], [.45, .5, .3], 11, 0); S.pt([x0 + .6, 1.02, fz + .3], [0, 1, 0], 14, 0, .5);
        emitters.push({ t: 'forge', x: x0 + .6, y: 1.05, z: fz + .3 });
        S.tube([[x0 - .1, 2.0, fz + 1.35, .06, 0], [x0 + w + .1, 2.0, fz + 1.35, .06, 0]], 12, { sub: 1, flags: 8 }); for (let k = 0; k < 5; k++) { const bx2 = x0 + .2 + k * (w - .4) / 4; S.tube([[bx2, 2.35, fz + .05, .045, 0], [bx2, 2.0, fz + 1.4, .045, 0]], 12, { sub: 1, flags: 8 }); }   // pérgola de vigas (frente aberta)
        for (const px2 of [x0 - .1, x0 + w + .1]) S.tube([[px2, 0, fz + 1.35, .05, 0], [px2, 1.95, fz + 1.35, .05, 0]], 12, { sub: 1, flags: 8 });
        S.tube([[x0 + w - .9, .9, fz + .12, .03, 0], [x0 + w - .1, .9, fz + .12, .03, 0]], 12, { sub: 1 });
        for (let k = 0; k < 4; k++) S.tube([[x0 + w - .8 + k * .2, .2, fz + .14, .025, 0], [x0 + w - .8 + k * .2, 1.25, fz + .14, .012, 0]], 11, { sub: 1 });
        S.box([cx + 1.4, 2.0, fz + .1], [.35, .22, .04], 12, 0, { faces: 's' }); S.box([cx + 1.4, 2.04, fz + .14], [.18, .05, .02], 29, 0, { faces: 's' }); S.box([cx + 1.4, 1.93, fz + .14], [.04, .1, .02], 29, 0, { faces: 's' });
        // estética nova: chaminé de pedra larga, fornalha em arco com brasa, toco da bigorna, barril de têmpera, ferramentas e armeiro, ferradura dourada
        S.box([x0 + .9, 3.4, cz], [.7, 2.2, .7], p => frac(p[1] * 2.2) < .12 ? 29 : 11, 0, { faces: 'tnsew', flags: 8 }); S.box([x0 + .9, 5.65, cz], [.82, .1, .82], 29, 0, { faces: 'tnsew', flags: 8 });
        emitters.push({ t: 'smoke', x: x0 + .9, y: 5.8, z: cz }); emitters.push({ t: 'smoke', x: x0 + 1.1, y: 5.8, z: cz + .2 });
        { const ax = x0 + .9, az = fz + .2; S.box([ax, .7, az], [.75, .7, .32], p => frac(p[1] * 3 + Math.floor(p[0] * 2) * .5) < .12 ? 29 : 11, 0, { faces: 'tnsew' }); S.ell([ax, .62, az + .33], [.42, .42, .04], 21, 0, { noSolid: true, keep: d => d[1] > -.2, min: 30 }); S.ell([ax, .62, az + .3], [.28, .3, .03], 27, 0, { noSolid: true, noCheck: true, min: 20 }); emitters.push({ t: 'forge', x: ax, y: .7, z: az + .45 }); }
        S.tube([[cx, 0, fz + .85, .26, 0], [cx, .2, fz + .85, .26, 0]], 12, { sub: 1 });
        S.ell([x0 + w + .25, .45, fz + .9], [.32, .45, .32], p => Math.abs(p[1] - .45) < .05 || Math.abs(p[1] - .15) < .05 ? 29 : 12, 0); S.ell([x0 + w + .25, .9, fz + .9], [.28, .02, .28], 15, 0, { noSolid: true });
        for (let k = 0; k < 3; k++) { const tx2 = x0 + w - 1.6 + k * .35; S.tube([[tx2, 1.0, fz + .05, .025, 0], [tx2, 1.6, fz + .05, .02, 0]], 12, { sub: 1 }); S.box([tx2, 1.62, fz + .07], [.09, .06, .04], 29, 0); }
        for (let k = 0; k < 3; k++) S.tube([[x0 + w - .25 + k * .01, .15, fz + .35 + k * .25, .02, 0], [x0 + w - .25, 1.3, fz + .2 + k * .25, .01, 0]], 28, { sub: 1 });   // espadas no armeiro
        S.tube([[cx + 1.4, 2.45, fz + .18, .04, 0], [cx + 1.25, 2.58, fz + .18, .04, 0], [cx + 1.4, 2.7, fz + .18, .04, 0], [cx + 1.55, 2.58, fz + .18, .04, 0]], 14, { sub: 2, noSolid: true });   // ferradura
      } else if (!h.tavern) {
        const dx2 = cx - .6;
        S.box([dx2, .9, fz + .02], [.4, .5, .04], p => Math.abs(frac(p[0] / .2) - .5) < .1 ? 29 : 12, 0, { faces: 's' });
        S.box([dx2, 1.46, fz + .06], [.52, .06, .06], 12, 0, { faces: 'tsew' });
        for (const s2 of [-1, 1]) S.box([dx2 + s2 * .46, .9, fz + .06], [.05, .52, .05], 12, 0, { faces: 'sew' });
        S.ell([dx2 + .26, .92, fz + .08], .035, 17, 0, { min: 6 });
        S.box([dx2, .3, fz + .3], [.5, .06, .28], 11, 0, { faces: 'tnsew' });
        S.tube([[dx2 + .72, 1.75, fz + .04, .025, 0], [dx2 + .72, 1.75, fz + .32, .025, 0]], 12, { sub: 1 }); S.ell([dx2 + .72, 1.6, fz + .32], [.08, .12, .08], 14, 0, { min: 12 }); emitters.push({ t: 'glow', x: dx2 + .72, y: 1.6, z: fz + .32 });
        win(cx + 1.25, 1.7, fz + .02, 's'); win(x0 + w - .13, 1.7, cz, 'e'); win(x0 + .13, 1.7, cz, 'w');
        S.ell([x0 + .4, .35, fz + .45], [.38, .33, .3], 13, 0, { dm: .8 }); for (let k = 0; k < 4; k++) S.ell([x0 + .25 + k * .12, .62, fz + .5], .05, k % 2 ? 16 : 17, 0, { min: 5 });
      }
      S.box([x0 + w * .75, 3.95, cz - .4], [.24, .7, .24], p => frac(p[1] * 3) < .15 ? 29 : 11, 0, { faces: 'tnsew', flags: 8 }); S.box([x0 + w * .75, 4.68, cz - .4], [.3, .05, .3], 11, 0, { faces: 'tnsew', flags: 8 });
      emitters.push({ t: 'smoke', x: x0 + w * .75, y: 4.75, z: cz - .4 });
    });
    for (const h of HUB.houses) if (h.tavern) {
      const cx = (h.x + h.w / 2) * T, fz2 = (h.y + h.h) * T;
      S.tube([[cx + 2.6, 2.6, fz2 - .1, .04, 0], [cx + 2.6, 2.6, fz2 + .9, .04, 0]], 12, { sub: 1 });
      S.box([cx + 2.6, 2.15, fz2 + .75], [.05, .32, .45], 12, 0, { faces: 'ew' });
      S.box([cx + 2.6, 2.15, fz2 + .75], [.065, .16, .28], 17, 0, { faces: 'ew' });
      for (const ox of [-2.6, -2.0]) S.ell([cx + ox, .42, fz2 + .55], [.3, .42, .3], p => (Math.abs(p[1] - .22) < .05 || Math.abs(p[1] - .62) < .05) ? 11 : 12, 0);
      S.box([cx + .6, .62, fz2 + 1.3], [.7, .05, .4], 12, 0);
      for (const sx of [-1, 1]) S.box([cx + .6 + sx * .55, .3, fz2 + 1.3], [.05, .3, .32], 12, 0, { faces: 'nsew' });
      S.box([cx - .4, .3, fz2 + 1.3], [.2, .3, .2], 12, 0); S.box([cx + 1.6, .3, fz2 + 1.3], [.2, .3, .2], 12, 0);
      S.box([cx - .2, 1.55, fz2 - .1], [.3, .22, .05], 14, 0, { faces: 's' }); S.box([cx + 1.2, 1.55, fz2 - .1], [.3, .22, .05], 14, 0, { faces: 's' });
      S.box([cx + .5, .7, fz2 - .1], [.4, .7, .06], 12, 0, { faces: 's' });
    }
    for (const [sx2, sy2, cloth] of HUB.stalls) {
      const x0 = (sx2 + .5) * T, z0 = (sy2 + .5) * T;
      for (const [ox, oz] of [[-.9, -.8], [.9, -.8], [-.9, .8], [.9, .8]]) S.tube([[x0 + ox, 0, z0 + oz, .05, 0], [x0 + ox, 2.0, z0 + oz, .05, 0]], 12, { sub: 1, flags: 8 });
      S.mem([[[x0 - 1.15, 2.35, z0 - 1.05], [x0 + 1.15, 2.35, z0 - 1.05], [x0 + 1.15, 1.95, z0 + 1.15]], [[x0 - 1.15, 2.35, z0 - 1.05], [x0 + 1.15, 1.95, z0 + 1.15], [x0 - 1.15, 1.95, z0 + 1.15]]], p => Math.floor((p[0] - x0 + 1.15) / .384) % 2 ? cloth : 28, () => 0, { flags: 8 });
      S.box([x0, .5, z0 + .55], [1.0, .5, .3], 12, 0);
      for (let k = 0; k < 6; k++) S.ell([x0 - .75 + k * .3, 1.1, z0 + .55 + (k % 2) * .08], .12, [16, 17, 10, 16, 17, 10][k], 0, { min: 10 });
    }
    {
      const pn = HUB.pen, px0 = pn.x0 * T + .4, px1 = (pn.x1 + 1) * T - .4, pz0 = pn.y0 * T + .4, pz1 = (pn.y1 + 1) * T - .4, gA = 16 * T, gB = 17 * T;
      const rail = (a, b) => { for (const y of [.28, .6]) S.tube([[a[0], y, a[1], .045, 0], [b[0], y, b[1], .045, 0]], 19, { sub: 1 }); const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 1.3)); for (let i = 0; i <= n; i++) { const x = lerp(a[0], b[0], i / n), z = lerp(a[1], b[1], i / n); S.tube([[x, 0, z, .07, 0], [x, .78, z, .06, 0]], 12, { sub: 1 }); } };
      rail([px0, pz0], [gA, pz0]); rail([gB, pz0], [px1, pz0]); rail([px1, pz0], [px1, pz1]); rail([px1, pz1], [px0, pz1]); rail([px0, pz1], [px0, pz0]);
      S.box([(pn.x0 + 1.6) * T, .35, (pn.y1 - .2) * T], [.55, .35, .4], 17, 0);
      for (let k = 0; k < 30; k++) S.cone([(pn.x0 + 1.6) * T + (R() - .5) * 1.1, .68, (pn.y1 - .2) * T + (R() - .5) * .8], [(pn.x0 + 1.6) * T + (R() - .5) * 1.3, .8, (pn.y1 - .2) * T + (R() - .5) * .9], .03, 17, 0);
    }
    { // Bairro Leste: fogueira, bancos, cerca da arena e cais do lago
      const [fx, fz] = HUB.fire;
      for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; S.tube([[fx + Math.cos(a) * .55, .12, fz + Math.sin(a) * .55, .12, 0], [fx - Math.cos(a) * .2, .32, fz - Math.sin(a) * .2, .08, 0]], 12, { sub: 1 }); }
      for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283; S.ell([fx + Math.cos(a) * .85, .12, fz + Math.sin(a) * .85], [.2, .14, .18], 11, 0); }
      emitters.push({ t: 'forge', x: fx, y: .4, z: fz }); emitters.push({ t: 'smoke', x: fx, y: 1.4, z: fz });
      for (const [ox, oz] of [[-.18, 0], [.18, .08], [0, -.16]]) emitters.push({ t: 'torch', x: fx + ox, y: .35, z: fz + oz });   // chamas
      for (const [bx, bz, yaw] of HUB.benches) { const c = Math.cos(yaw), s = Math.sin(yaw), hw = 1.1; S.box([bx, .42, bz], [Math.abs(c) * hw + Math.abs(s) * .28, .06, Math.abs(s) * hw + Math.abs(c) * .28], 12, 0, { faces: 'tnsew' }); for (const d of [-.85, .85]) S.box([bx + c * d, .2, bz + s * d], [.08, .2, .08], 12, 0, { faces: 'nsew' }); }
      const A = HUB.arena;
      for (let i = 0; i <= 14; i++) for (const side of [0, 1, 2, 3]) {
        const u = i / 14, px = side < 2 ? A.x - A.w + u * 2 * A.w : (side === 2 ? A.x - A.w : A.x + A.w), pz = side < 2 ? (side === 0 ? A.z - A.h : A.z + A.h) : A.z - A.h + u * 2 * A.h;
        if (side === 1 && Math.abs(px - A.x) < 1.6) continue;   // entrada da arena
        if (i % 2 === 0) S.tube([[px, 0, pz, .07, 0], [px, .9, pz, .06, 0]], 12, { sub: 1, flags: 8 });
      }
      for (let k = 0; k < 4; k++) S.ell([A.x - A.w + 1 + k * 4, .02, A.z], [1.2, .02, 1.2], 9, 0);   // chão batido da arena
      for (const [qx, qz] of HUB.fishSpots.map(f => [f.x, f.z]).concat([IVO_PIER])) { S.box([qx + 1.4, .14, qz], [1.6, .06, .5], 12, 0, { faces: 'tnsew' }); for (const d of [0, 1.4, 2.8]) for (const sz of [.45, -.45]) S.tube([[qx + d, -.3, qz + sz, .07, 0], [qx + d, .14, qz + sz, .07, 0]], 12, { sub: 1 }); }   // píeres: lago, rio e o do Ivo
      { const [bx, bz] = HUB_BRIDGE; S.box([bx, .2, bz], [1.3, .07, 3.3], p => frac(p[2] * 1.4) < .12 ? 11 : 12, 0, { faces: 'tnsew' }); for (const sx of [-1.25, 1.25]) { S.tube([[bx + sx, .2, bz - 3.3, .05, 0], [bx + sx, .75, bz - 3.3, .05, 0]], 12, { sub: 1 }); S.tube([[bx + sx, .2, bz + 3.3, .05, 0], [bx + sx, .75, bz + 3.3, .05, 0]], 12, { sub: 1 }); S.tube([[bx + sx, .72, bz - 3.3, .04, 0], [bx + sx, .8, bz, .04, 0], [bx + sx, .72, bz + 3.3, .04, 0]], 12, { sub: 3 }); } }   // ponte de tábuas sobre o riacho
    }
    { const pd = HUB.pond, wx0 = (pd.x - pd.rx) * T + .4, wz = pd.y * T; S.box([wx0 + 1.6, .14, wz], [1.7, .06, .45], 12, 0, { faces: 'tnsew' }); for (let i = 0; i < 4; i++) for (const sz of [-.4, .4]) S.tube([[wx0 + .2 + i * 1.05, -.3, wz + sz, .06, 0], [wx0 + .2 + i * 1.05, .3, wz + sz, .06, 0]], 12, { sub: 1 }); }
    for (const [px, pz, kind] of HUB.props) {
      if (kind === 'crate') { S.box([px, .35, pz], [.35, .35, .35], p => (Math.abs(frac((p[0] + p[1] + p[2]) / .7) - .5) < .07) ? 19 : 12, 0); }
      else if (kind === 'barrel') S.ell([px, .45, pz], [.3, .45, .3], p => (Math.abs(p[1] - .2) < .05 || Math.abs(p[1] - .7) < .05) ? 11 : 12, 0);
      else if (kind === 'well') { S.tube([[px, 0, pz, .85, 0], [px, .85, pz, .85, 0]], 11, { sub: 1 }); S.ell([px, .82, pz], [.72, .03, .72], 15, 0, { noSolid: true }); for (const sx of [-.8, .8]) S.tube([[px + sx, .8, pz, .06, 0], [px + sx, 2.2, pz, .06, 0]], 12, { sub: 1 }); S.mem([[[px - 1.1, 2.1, pz - .7], [px + 1.1, 2.1, pz - .7], [px, 2.7, pz]], [[px - 1.1, 2.1, pz + .7], [px + 1.1, 2.1, pz + .7], [px, 2.7, pz]]], 22, () => 0); S.tube([[px - .8, 1.8, pz, .04, 0], [px + .8, 1.8, pz, .04, 0]], 12, { sub: 1 }); S.box([px + .1, 1.35, pz], [.14, .16, .14], 12, 0); }
      else if (kind === 'flowers') { S.box([px, .12, pz], [1.0, .12, .5], 12, 0, { faces: 'tnsew' }); S.box([px, .25, pz], [.92, .02, .42], 9, 0, { faces: 't' }); for (let k = 0; k < 14; k++) { const fx = px - .8 + (k % 7) * .27, fz = pz - .2 + Math.floor(k / 7) * .4; S.tube([[fx, .25, fz, .015, 0], [fx, .5, fz, .015, 0]], 13, { sub: 1 }); S.ell([fx, .54, fz], .07, [16, 17, 28, 18][k % 4], 0, { min: 6 }); } }
      else if (kind === 'hay') { S.ell([px, .45, pz], [.55, .45, .45], p => frac(p[1] * 6) < .15 ? 12 : 17, 0); }
      else if (kind === 'line') { for (const sx of [-1.6, 1.6]) S.tube([[px + sx, 0, pz, .05, 0], [px + sx, 1.8, pz, .05, 0]], 12, { sub: 1 }); S.tube([[px - 1.6, 1.75, pz, .012, 0], [px, 1.62, pz, .012, 0], [px + 1.6, 1.75, pz, .012, 0]], 28, { sub: 3, noSolid: true }); [[-1.0, 16], [-.3, 18], [.4, 28], [1.05, 17]].forEach(([ox, m]) => S.box([px + ox, 1.35, pz], [.22, .27, .015], m, 0, { faces: 'ns', flags: 1 })); }
      else { for (const sx of [-.7, .7]) S.tube([[px + sx, 0, pz, .06, 0], [px + sx, 1.7, pz, .06, 0]], 12, { sub: 1 }); S.box([px, 1.25, pz], [.85, .45, .05], 12, 0, { faces: 'ns' }); for (const [ox, oy] of [[-.4, 1.35], [.1, 1.2], [.45, 1.4], [-.15, 1.0]]) S.box([px + ox, oy, pz + .07], [.16, .13, .02], 28, 0, { faces: 's' }); }
    }
    { const wx = 9.5 * T, wz = 18.5 * T, r = []; for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; r.push([wx + Math.cos(a) * .72, .42, wz + Math.sin(a) * .72, .26, 0]); }
      S.tube(r, p => Math.floor((Math.atan2(p[2] - wz, p[0] - wx) + 3.15) * 2.3) % 2 ? 11 : 29, { closed: true, sub: 2 });
      for (let k = 0; k < 90; k++) { const a = R() * 6.283, dd = Math.sqrt(R()) * .5; S.pt([wx + Math.cos(a) * dd, .3, wz + Math.sin(a) * dd], [0, 1, 0], 15, 0, .2, 16); }
      for (const s2 of [-1, 1]) S.tube([[wx + s2 * .8, 0, wz, .06, 0], [wx + s2 * .8, 1.85, wz, .06, 0]], 12, { sub: 1, flags: 8 });
      S.tube([[wx - .85, 1.45, wz, .04, 0], [wx + .95, 1.45, wz, .04, 0]], 12, { sub: 1 });
      S.mem([[[wx - 1.1, 1.8, wz - .7], [wx + 1.1, 1.8, wz - .7], [wx + 1.1, 2.25, wz]], [[wx - 1.1, 1.8, wz - .7], [wx + 1.1, 2.25, wz], [wx - 1.1, 2.25, wz]], [[wx - 1.1, 2.25, wz], [wx + 1.1, 2.25, wz], [wx + 1.1, 1.8, wz + .7]], [[wx - 1.1, 2.25, wz], [wx + 1.1, 1.8, wz + .7], [wx - 1.1, 1.8, wz + .7]]], 22, () => 0, { flags: 8 });
      S.tube([[wx, 1.45, wz, .01, 0], [wx, 1.0, wz, .01, 0]], 28, { sub: 1 }); S.ell([wx, .92, wz], [.13, .12, .13], 12, 0); }
    for (const [bx, bz] of [[37.5, 28.3], [50.5, 28.3], [38.5, 36.6]]) { S.box([bx, .45, bz], [.8, .05, .22], 12, 0, { faces: 'tnsew' }); S.box([bx, .78, bz - .2], [.8, .22, .03], 12, 0, { faces: 'tns' }); for (const s2 of [-1, 1]) S.box([bx + s2 * .65, .2, bz], [.05, .2, .2], 12, 0, { faces: 'nsew' }); }
    { const lx2 = 16; for (const z of [16.6, 21.4]) S.tube([[lx2, 0, z, .05, 0], [lx2, 1.9, z, .05, 0]], 12, { sub: 1, flags: 8 }); S.tube([[lx2, 1.82, 16.6, .012, 0], [lx2, 1.76, 19, .012, 0], [lx2, 1.82, 21.4, .012, 0]], 28, { sub: 3 });
      [16, 18, 28, 23].forEach((m, k) => { const z = 17.1 + k * 1.05, yb = 1.15 + (k % 2) * .15; S.mem([[[lx2, 1.78, z], [lx2, 1.78, z + .7], [lx2, yb, z + .7]], [[lx2, 1.78, z], [lx2, yb, z + .7], [lx2, yb, z]]], m, () => 0, { flags: 8 }); }); }
    { const kx = 27, kz = 57; S.box([kx, .75, kz], [.9, .25, .55], 12, 0); S.ell([kx, 1.1, kz], [.85, .35, .5], 17, 0, { keep: d => d[1] > -.2 });
      for (const s2 of [-1, 1]) { const w2 = []; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; w2.push([kx + Math.cos(a) * .45, .45 + Math.sin(a) * .45, kz + s2 * .62, .045, 0]); } S.tube(w2, 12, { closed: true, sub: 2 }); }
      for (const s2 of [-.3, .3]) S.tube([[kx + .9, .7, kz + s2, .04, 0], [kx + 2.0, .35, kz + s2, .04, 0]], 12, { sub: 1 }); }
    { const ax = 12.5 * T, az = 26.5 * T; for (let k = 0; k < 18; k++) { const a = R() * 6.283, e = R() * 1.1 - .2; S.ell([ax + Math.cos(a) * Math.cos(e) * 1.6, 2.5 + Math.sin(e) * 1.25, az + Math.sin(a) * Math.cos(e) * 1.6], .13, 16, 0, { min: 10, flags: 8 }); } for (let k = 0; k < 4; k++) S.ell([ax + (R() - .5) * 3, .08, az + .6 + R()], .08, 16, 0, { min: 8 }); }
    for (let k = 0; k < 80; k++) { const a = R() * 6.283, dd = 2.45 + R() * .45, fx2 = 44 + Math.cos(a) * dd, fz3 = 32 + Math.sin(a) * dd; S.cone([fx2, 0, fz3], [fx2, .2, fz3], .03, 10, 0); S.ell([fx2, .22, fz3], .055, R() < .5 ? 16 : 17, 0, { min: 5 }); }
    for (let k = 0; k < 16; k++) emitters.push({ t: 'fly', x: 10 + R() * 68, y: .6, z: 10 + R() * 46 });
    const [fx, fz] = HUB.fountain;
    const ring = []; for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283; ring.push([fx + Math.cos(a) * 1.75, .3, fz + Math.sin(a) * 1.75, .3, 0]); }
    S.tube(ring, 11, { closed: true, sub: 2 });
    for (let k = 0; k < 420; k++) { const a = R() * 6.283, d = Math.sqrt(R()) * 1.55; S.pt([fx + Math.cos(a) * d, .35, fz + Math.sin(a) * d], [0, 1, 0], 15, 0, .3, 16); }
    S.tube([[fx, .3, fz, .26, 0], [fx, 1.45, fz, .22, 0]], 11, { sub: 1 });
    S.ell([fx, 1.5, fz], [.62, .15, .62], 11, 0);
    S.cone([fx, 2.15, fz], [fx, 2.7, fz], .24, 31, 0); S.cone([fx, 2.15, fz], [fx, 1.7, fz], .24, 31, 0);
    emitters.push({ t: 'crystal', x: fx, y: 2.2, z: fz });
    for (const [lx, lz] of HUB.lamps) { S.tube([[lx, 0, lz, .07, 0], [lx, 2.2, lz, .06, 0]], 12, { sub: 1, flags: 8 }); S.ell([lx, 2.32, lz], .16, 14, 0, { min: 20 }); emitters.push({ t: 'glow', x: lx, y: 2.35, z: lz }); S.tube([[lx, 2.0, lz, .03, 0], [lx + .48, 2.0, lz, .03, 0]], 12, { sub: 1 }); S.mem([[[lx + .1, 1.96, lz], [lx + .44, 1.96, lz], [lx + .44, 1.35, lz]], [[lx + .1, 1.96, lz], [lx + .44, 1.35, lz], [lx + .1, 1.35, lz]]], p => p[1] < 1.48 ? 17 : (Math.round(lx) % 4 < 2 ? 22 : 23), () => 0); }
  }
  if (st === 'home') {
    const f = (gsave() && gsave().house && gsave().house.f) || {}, B = gsave() ? gsave().bosses : {}, gk = (gsave() && gsave().st && gsave().st.gk) || [];
    for (const x0 of [9.5, 22.5]) { S.box([x0, 2.1, 6.06], [.9, .7, .05], p => (Math.abs(p[0] - x0) < .05 || Math.abs(p[1] - 2.1) < .05) ? 24 : 27, 0, { faces: 's' }); S.box([x0, 1.32, 6.25], [1.05, .08, .2], 24, 0, { faces: 'tsew' }); }
    S.box([16, .02, 19.3], [1.0, .02, .55], 16, 0, { faces: 't' });
    S.box([12.6, .55, 7.1], [.3, .55, .25], 24, 0, { faces: 'tnsew' }); S.box([12.6, 1.15, 7.05], [.45, .06, .38], 19, 0, { faces: 'tnsew' }); S.box([12.6, 1.24, 7.05], [.32, .03, .26], 28, 0, { faces: 't' }); S.box([12.6, 1.27, 7.05], [.015, .01, .26], 12, 0, { faces: 't' });
    S.box([23.6, .55, 7.2], [.1, .55, .1], 24, 0, { faces: 'nsew' }); S.box([23.6, 1.25, 7.2], [.32, .22, .42], 18, 0, { faces: 'tnsew' }); S.box([23.95, 1.5, 7.0], [.03, .22, .1], 16, 0, { faces: 'e' });
    S.box([8.6, .02, 7.8], [1.1, .02, .9], 22, 0, { faces: 't' });
    emitters.push({ t: 'glow', x: 16, y: 2.6, z: 12 }); emitters.push({ t: 'glow', x: 9, y: 2.4, z: 16 });
    if (f.cama) { S.box([23.9, .3, 11.2], [1.0, .3, 1.6], 24, 0, { faces: 'tnsew' }); S.box([23.9, .66, 11.4], [.9, .1, 1.4], 23, 0, { faces: 'tnsew' }); S.box([23.9, .74, 11.9], [.92, .08, .95], 16, 0, { faces: 'tsew' }); S.ell([23.9, .84, 10.2], [.55, .12, .3], 28, 0); S.box([23.9, 1.2, 9.65], [1.05, .6, .08], p => Math.abs(p[1] - 1.5) < .06 ? 25 : 24, 0, { faces: 'tnsew' }); for (const sx of [-1, 1]) S.tube([[23.9 + sx * .95, 0, 12.7, .05, 0], [23.9 + sx * .95, 2.2, 12.7, .05, 0]], 24, { sub: 1 }); }
    if (f.lareira) { S.box([16, 1.2, 6.7], [1.6, 1.2, .55], (p, n) => n[2] > .5 && Math.abs(p[0] - 16) < .8 && p[1] < 1.1 ? 29 : (frac(p[1] * 2.5 + Math.floor(p[0] * 1.6) * .5) < .12 ? 24 : 11), 0, { faces: 'tsew' }); S.box([16, 2.45, 6.85], [1.8, .08, .75], 24, 0, { faces: 'tnsew' }); for (let k = 0; k < 3; k++) S.tube([[15.4 + k * .3, .12, 7.0, .08, 0], [15.6 + k * .3, .12, 7.4, .07, 0]], 12, { sub: 1 }); emitters.push({ t: 'forge', x: 16, y: .3, z: 7.2 }); emitters.push({ t: 'torch', x: 16, y: .35, z: 7.2 }); S.ell([16, 2.62, 6.9], [.14, .14, .14], 25, 0); }
    if (f.estante) {
      S.box([6.8, 1.25, 13], [.35, 1.25, 3.1], 24, 0, { faces: 'tnsew' }); for (const y of [.55, 1.25, 1.95]) S.box([7.2, y, 13], [.12, .04, 3.0], 19, 0, { faces: 'tnsew' });
      const TR = [['forest', 31], ['crypt', 123], ['peaks', 14], ['swamp', 121], ['glass', 122]].filter(([k]) => B[k]).map(t => t[1]).concat([['spider', 143], ['knight', 134], ['eye', 151]].filter(([k]) => gk.includes(k)).map(t => t[1]));
      TR.forEach((m, i) => { const y = .6 + .7 * Math.floor(i / 3), z = 11 + (i % 3) * 2; S.box([7.25, y + .06, z], [.14, .06, .14], 28, 0, { faces: 'tnsew' }); S.ell([7.25, y + .32, z], [.15, .22, .15], m, 0, { min: 16 }); emitters.push({ t: 'glow', x: 7.3, y: y + .4, z }); });
    }
    if (f.bancada) { S.box([10.5, .82, 18.2], [1.5, .06, .55], 19, 0, { faces: 'tnsew' }); for (const [ox, oz] of [[-1.3, -.4], [1.3, -.4], [-1.3, .4], [1.3, .4]]) S.tube([[10.5 + ox, 0, 18.2 + oz, .05, 0], [10.5 + ox, .8, 18.2 + oz, .05, 0]], 24, { sub: 1 }); S.box([9.6, 1.05, 18.1], [.3, .18, .2], 11, 0, { faces: 'tnsew' }); S.tube([[11.2, .92, 18, .03, 0], [11.8, .92, 18.3, .03, 0]], 24, { sub: 1 }); S.box([11.85, .95, 18.32], [.1, .08, .14], 25, 0, { faces: 'tnsew' }); emitters.push({ t: 'candle', x: 11, y: 1.05, z: 18.5 }); }
    if (f.jardim) for (const z of [14, 16, 18]) { S.box([25.2, .32, z], [.32, .32, .32], 22, 0, { faces: 'tnsew' }); S.ell([25.2, .85, z], [.45, .4, .45], 13, 0); for (let k = 0; k < 4; k++) S.ell([25.2 + Math.cos(k * 1.7) * .35, .95 + (k % 2) * .2, z + Math.sin(k * 1.7) * .35], .08, [16, 17, 27, 28][k], 0, { min: 6 }); }
    if (f.mapa) { S.box([19.4, 2.1, 6.07], [1.3, .75, .03], 23, 0, { faces: 's' }); for (let k = 0; k < 5; k++) S.box([18.4 + k * .5, 2.0 + Math.sin(k) * .3, 6.1], [.2, .02, .01], 12, 0, { faces: 's' }); for (const [mx, my, mm] of [[18.5, 2.5, 31], [19.2, 1.8, 123], [20, 2.4, 14], [20.4, 1.7, 121]]) S.ell([mx, my, 6.12], .06, mm, 0, { min: 6 }); }
    if (f.altar) { S.box([21.5, .45, 16.8], [.4, .45, .4], 28, 0, { faces: 'tnsew' }); S.cone([21.5, .9, 16.8], [21.5, 2.1, 16.8], .3, 27, 0); emitters.push({ t: 'crystal', x: 21.5, y: 2.2, z: 16.8 }); }
    if (f.guarda) {   // guarda-roupa na parede direita, entre o correio e a cama, portas viradas para a sala
      const gx = 25.5, gz = 8.1;
      S.box([gx, 1.15, gz], [.38, 1.15, .8], 24, 0, { faces: 'tnsew' }); S.box([gx, 2.36, gz], [.46, .07, .9], 19, 0, { faces: 'tnsew' }); S.box([gx, .06, gz], [.42, .06, .85], 19, 0, { faces: 'tnsew' });
      for (const dz of [-.39, .39]) { S.box([gx - .39, 1.2, gz + dz], [.02, .95, .35], p => Math.abs(p[1] - 1.2) > .8 || Math.abs(p[2] - gz - dz) > .3 ? 19 : 23, 0, { faces: 'w' }); S.ell([gx - .43, 1.2, gz + dz * .15], .04, 14, 0, { min: 8 }); }
      S.box([gx, 2.5, gz], [.12, .07, .12], 14, 0, { faces: 'tnsew' });
    }
    if (f.estatua) { S.box([9.6, .25, 11.6], [.75, .25, .75], 28, 0, { faces: 'tnsew' }); S.box([9.6, .52, 11.6], [.65, .03, .65], 25, 0, { faces: 'tnsew' }); }
  }
  if (key === 'hub') {
    const own = gsave() && gsave().house && gsave().house.owned;
    if (own) { S.tube([[72.4, 0, 46.4, .06, 0], [72.4, 3.2, 46.4, .05, 0]], 12, { sub: 1, flags: 8 }); S.mem([[[72.45, 3.1, 46.4], [73.6, 3.0, 46.4], [72.45, 2.0, 46.4]], [[73.6, 3.0, 46.4], [73.5, 2.0, 46.4], [72.45, 2.0, 46.4]]], p => Math.abs(p[1] - 2.55) < .12 ? 7 : 17, () => 0, { flags: 8 }); for (const sx of [-1, 1]) { S.ell([68.4 + sx * .75, 1.7, 46.05], [.1, .14, .1], 14, 0, { min: 12 }); emitters.push({ t: 'glow', x: 68.4 + sx * .75, y: 1.7, z: 46.1 }); } S.box([68.4, .02, 46.6], [.55, .02, .35], 16, 0, { faces: 't' }); }
    else { S.tube([[70.6, 0, 46.8, .05, 0], [70.6, 1.3, 46.8, .05, 0]], 12, { sub: 1 }); S.box([70.6, 1.3, 46.85], [.45, .28, .04], p => Math.abs((p[0] - 70.6) * .6 - (p[1] - 1.3)) < .05 ? 16 : 11, 0, { faces: 'sn' }); }
  }
  if (key === 'hub') {   // Banco do Tear: mármore, colunas, frontão com moeda e cúpula dourada
    const { x: bx, z: bz } = HUB.bank, fz = bz + 2.7;
    S.box([bx, .15, bz + .4], [4.3, .15, 3.6], 11, 0, { faces: 'tnsew' });
    S.box([bx, 1.85, bz - .2], [3.6, 1.7, 2.6], (p, n) => (n[2] > .5 || n[0] !== 0) && Math.abs(p[1] - 2.1) < .55 && frac((p[0] - bx + p[2]) / 1.6) < .32 ? 29 : (Math.abs(p[1] - .3) < .08 ? 24 : 28), 0, { faces: 'nsew', flags: 8 });
    for (const cx of [-2.7, -1, 1, 2.7]) { S.tube([[bx + cx, .3, fz, .27, 0], [bx + cx, 3.5, fz, .24, 0]], (p) => frac(Math.atan2(p[2] - fz, p[0] - bx - cx) * 1.3) < .2 ? 24 : 28, { sub: 1, flags: 8 }); S.box([bx + cx, 3.62, fz], [.36, .1, .36], 24, 0, { flags: 8 }); S.box([bx + cx, .38, fz], [.34, .08, .34], 24, 0); emitters.push({ t: 'glow', x: bx + cx, y: 3.2, z: fz + .3 }); }
    S.box([bx, 3.82, fz - .1], [3.3, .12, .5], 24, 0, { faces: 'tnsew', flags: 8 });
    S.mem([[[bx - 3.3, 3.95, fz + .3], [bx + 3.3, 3.95, fz + .3], [bx, 5.0, fz + .3]]], 28, () => 0, { flags: 8 });   // frontão
    S.ell([bx, 4.35, fz + .34], [.36, .36, .06], 14, 0, { noSolid: true, min: 30, flags: 8 }); S.ell([bx, 4.35, fz + .4], [.2, .2, .03], 17, 0, { noSolid: true, min: 16, flags: 8 });   // moeda
    S.ell([bx, 3.5, bz - .2], [2.7, 1.7, 2.2], (p, n) => frac(Math.atan2(p[2] - bz + .2, p[0] - bx) * 2.5) < .12 ? 14 : 17, 0, { keep: d => d[1] > 0, flags: 8 });   // cúpula
    S.cone([bx, 5.1, bz - .2], [bx, 5.9, bz - .2], .14, 14, 0, { flags: 8 }); S.ell([bx, 6.0, bz - .2], .16, 14, 0, { flags: 8 });
    S.box([bx, 1.1, fz - .35], [.95, 1.0, .06], (p) => (Math.abs(p[0] - bx) < .04 || frac((p[1]) * 3) < .12) ? 14 : 12, 0, { faces: 's', flags: 8 });   // porta do cofre
    for (let i = 0; i < 3; i++) S.box([bx, .1 + i * .1, fz + .9 + (2 - i) * .35], [2.0 - i * .2, .1, .2], 11, 0, { faces: 'tnsew' });   // degraus
    emitters.push({ t: 'shine', x: bx, y: 4.35, z: fz + .5 });
  }
  if (key === 'hub') {   // Santuário da Fenda: estrado, círculos de runas, pilares de obsidiana e arco
    const sc = HUB.sanct, [gx, gz] = sc.gate;
    S.ell([gx, 0, gz], [4.2, .32, 2.9], 29, 0, { keep: d => d[1] > 0 }); S.ell([gx, .3, gz], [3.4, .05, 2.3], 23, 0, { keep: d => d[1] > 0 });   // estrado
    for (const [rad, n] of [[5.2, 700], [5.5, 700], [7.0, 900], [7.3, 900]]) for (let i = 0; i < n; i++) { const a = i / n * 6.283; S.pt([sc.x + Math.cos(a) * rad, .05, sc.z + Math.sin(a) * rad * .82], [0, 1, 0], 151, 0, .2, 2, .7); }
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + .13, c = Math.cos(a), s = Math.sin(a); for (let k = 0; k < 18; k++) { const u = 5.7 + k * .07; S.pt([sc.x + c * u + (k % 3 === 1 ? s * .22 : 0), .05, sc.z + s * u * .82 - (k % 3 === 1 ? c * .18 : 0)], [0, 1, 0], 151, 0, .2, 2, .65); } }   // runas entre os círculos
    for (const [px, pz] of sc.pil) {
      S.box([px, .15, pz], [.75, .15, .75], 24, 0, { faces: 'tnsew' }); S.box([px, 1.9, pz], [.42, 1.75, .42], 29, 0, { faces: 'tnsew' });
      for (let k = 0; k < 4; k++) S.cone([px + (k % 2 ? .3 : -.3), 3.6, pz + (k < 2 ? .3 : -.3)], [px + (k % 2 ? .55 : -.55), 4.3, pz + (k < 2 ? .55 : -.55)], .12, 29, 0);   // garras no topo
      S.ell([px, 3.75, pz], .28, 151, 0, { min: 20 }); emitters.push({ t: 'voidflame', x: px, y: 3.9, z: pz });
      for (let y = .8; y < 3.4; y += .8) S.box([px, y, pz + .43], [.18, .05, .01], 151, 0, { faces: 's' });   // fendas acesas
    }
    const [ax, az] = sc.arch;   // arco da entrada (a oeste, o caminho passa por baixo)
    for (const dz of [-2.9, 2.9]) { S.box([ax, 2.2, az + dz], [.5, 2.2, .5], 29, 0, { faces: 'tnsew' }); S.ell([ax, 4.5, az + dz], .3, 151, 0, { min: 16 }); emitters.push({ t: 'voidflame', x: ax, y: 4.6, z: az + dz }); }
    S.box([ax, 4.55, az], [.5, .35, 3.6], 29, 0, { faces: 'tnsew' }); for (let i = -2; i <= 2; i++) S.ell([ax + .52, 4.55, az + i * 1.2], .1, 151, 0, { min: 8 });
    for (const [fx, fz] of [[126, 42], [138, 44], [130, 52], [118, 31], [100, 30]]) emitters.push({ t: 'fly', x: fx, y: .8, z: fz });   // vaga-lumes no lago e na fogueira
    for (let k = 0; k < 5; k++) emitters.push({ t: 'voidmist', x: gx + (k - 2) * 1.6, y: .35, z: gz + 1.5 + (k % 2) });
  }
  if (key === 'hub') for (let k = 0; k < 16; k++) { const a = k * 2.4, ry = 1.95 + (k % 4) * .22, rad = 1.12 - Math.abs(ry - 2.3) * .4; S.ell([25 + Math.cos(a) * rad, ry, 53 + Math.sin(a) * rad], .1, 16, 0, { min: 8 }); }
  if (st === 'wilds') {
    const cx = WC.x * T, cz = WC.y * T, PR = 7.4 * T;
    for (let i = 0; i < 120; i++) { const a = i / 120 * 6.283; if (Math.abs(angDiff(a, Math.PI / 2)) < .2) continue; const px = cx + Math.cos(a) * PR, pz = cz + Math.sin(a) * PR, h = 2.2 + hash2(i, 5) * .5; S.tube([[px, 0, pz, .2, 0], [px, h, pz, .18, 0]], 12, { sub: 1, flags: 8 }); S.cone([px, h, pz], [px, h + .45, pz], .18, 12, 0, { flags: 8 }); }
    for (const s2 of [-1, 1]) { const a = Math.PI / 2 + s2 * .24, px = cx + Math.cos(a) * PR, pz = cz + Math.sin(a) * PR; S.box([px, 2, pz], [.6, 2, .6], p => frac(p[1] * 1.6) < .1 ? 29 : 12, 0, { faces: 'tnsew', flags: 8 }); S.cone([px, 4, pz], [px, 5.3, pz], .95, 25, 0, { flags: 8 }); S.ell([px, 3.2, pz + .62], .12, 14, 0, { min: 10 }); emitters.push({ t: 'torch', x: px, y: 3.3, z: pz + .7 }); }
    const HS = [[-6, -5, 0], [5, -6, 1], [-8, 4, 2], [8, 3, 3], [0, -10, 4], [-2, 2, 5]];
    for (const [hx, hz, k] of HS) { const x0 = cx + hx, z0 = cz + hz, w = 1.6 + (k % 2) * .5; S.box([x0, 1.1, z0], [w, 1.1, w * .8], p => Math.abs(frac((p[0] + p[2]) / 1.4 + .5) - .5) < .05 ? 12 : 28, 0, { faces: 'nsew', flags: 8 }); S.mem([[[x0 - w - .3, 2.2, z0 - w * .8 - .3], [x0 + w + .3, 2.2, z0 - w * .8 - .3], [x0 + w + .3, 3.5, z0]], [[x0 - w - .3, 2.2, z0 - w * .8 - .3], [x0 + w + .3, 3.5, z0], [x0 - w - .3, 3.5, z0]], [[x0 - w - .3, 3.5, z0], [x0 + w + .3, 3.5, z0], [x0 + w + .3, 2.2, z0 + w * .8 + .3]], [[x0 - w - .3, 3.5, z0], [x0 + w + .3, 2.2, z0 + w * .8 + .3], [x0 - w - .3, 2.2, z0 + w * .8 + .3]]], p => frac(p[1] * 2.6) < .15 ? 23 : 25, () => 0, { flags: 8, dm: 1.1 }); emitters.push({ t: 'smoke', x: x0 + w * .5, y: 3.8, z: z0 - .3 }); S.ell([x0, 1.4, z0 + w * .8 + .02], [.25, .2, .03], 14, 0, { min: 8 }); }
    S.tube([[cx + 2, 0, cz - 2, .4, 0], [cx + 2, 6, cz - 2, .3, 0]], 11, { sub: 1, flags: 8 }); S.ell([cx + 2, 6.5, cz - 2], .55, 14, 0, { min: 30 }); emitters.push({ t: 'crystal', x: cx + 2, y: 6.6, z: cz - 2 });
    for (const rm of G.rooms) if (rm.zone !== undefined && R() < .5) emitters.push({ t: rm.zone >= 6 ? 'vent' : rm.zone === 3 ? 'mist' : 'fly', x: rm.wx, y: .6, z: rm.wz });
    for (const rm of G.rooms) if (rm.en && !rm.kind) { S.ell([rm.wx + 1.2, .12, rm.wz - .8], [.5, .12, .5], 12, 0); for (let k = 0; k < 4; k++) S.tube([[rm.wx + 1.2 + Math.cos(k * 1.6) * .35, .1, rm.wz - .8 + Math.sin(k * 1.6) * .35, .06, 0], [rm.wx + 1.2, .35, rm.wz - .8, .02, 0]], 12, { sub: 1 }); for (let k = 0; k < 3; k++) S.tube([[rm.wx - 1, .04, rm.wz + 1 + k * .15, .025, 0], [rm.wx - .6, .04, rm.wz + 1.2 + k * .1, .025, 0]], 28, { sub: 1 }); }
  }
  if (st === 'swamp') for (const rm of G.rooms) { emitters.push({ t: 'fly', x: rm.wx, y: .6, z: rm.wz }); emitters.push({ t: 'mist', x: rm.wx + 2, y: .2, z: rm.wz - 1 }); }
  if (st === 'glass') for (const rm of G.rooms) emitters.push({ t: 'dust', x: rm.wx, y: 4, z: rm.wz });
  for (const rm of G.rooms) if (rm.kind === 'boss') {
    if (st === 'glass') for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283, rad = (rm.r + .6) * T, px = rm.wx + Math.cos(a) * rad, pz = rm.wz + Math.sin(a) * rad; S.box([px, 2.4, pz], [.5 * Math.abs(Math.sin(a)) + .12, 2.4, .5 * Math.abs(Math.cos(a)) + .12], p => p[1] > 4.5 || p[1] < .2 ? 14 : 13, 0, { faces: 'tnsew', flags: 8 }); }
    if (st === 'swamp') for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, rad = (rm.r + .4) * T, px = rm.wx + Math.cos(a) * rad, pz = rm.wz + Math.sin(a) * rad; S.tube([[px, 0, pz, .35, 0], [px * .98 + rm.wx * .02, 1.6, pz * .98 + rm.wz * .02, .2, 0], [px * .94 + rm.wx * .06, 2.8, pz * .94 + rm.wz * .06, .05, 0]], 28, { sub: 2, flags: 8 }); }
    const ring = []; for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283; ring.push(rm.wx + Math.cos(a) * (rm.r - 1) * T * .5, rm.wz + Math.sin(a) * (rm.r - 1) * T * .5); }
    for (let i = 0; i < 260; i++) { const a = i / 260 * 6.283, rad = (rm.r - 1.2) * T; S.pt([rm.wx + Math.cos(a) * rad, .03, rm.wz + Math.sin(a) * rad], [0, 1, 0], st === 'forest' ? 10 : 9, 0, .2, 4); }
  }
  if (G.wild) return lazyWorld(G, S, emitters, tileAt, seed => { S = new SplatSet(seed, 22, null, true); R = S.R; return S; });
  const data = S.build();
  const CS = 16, ncx = Math.ceil(G.W * T / CS), ncz = Math.ceil(G.H * T / CS), buckets = [];
  for (let i = 0; i < ncx * ncz; i++) buckets.push([]);
  for (let i = 0; i < data.length; i += STRIDE) {
    const cx = clamp(Math.floor(data[i] / CS), 0, ncx - 1), cz = clamp(Math.floor(data[i + 2] / CS), 0, ncz - 1), b = buckets[cz * ncx + cx];
    for (let k = 0; k < STRIDE; k++) b.push(data[i + k]);
  }
  const chunks = [];
  buckets.forEach((b, i) => { if (!b.length) return; const v = makeVAO(new Float32Array(b)); chunks.push({ ...v, cx: (i % ncx + .5) * CS, cz: (Math.floor(i / ncx) + .5) * CS }); });
  return { chunks, emitters, count: data.length / STRIDE };
}


// ---------- mundo sob demanda (Ermos) ----------
// O mapa grande não é montado de uma vez: cada bloco de 16x16 unidades é montado quando a câmera chega perto
// (com semente própria, então sai sempre igual) e descartado quando fica longe. Os elementos fixos (paliçada,
// casas, acampamentos) são montados uma vez e entram no bloco em que estão.
const WCS = 16, WBUILD = 44, WFREE = 64;
function lazyWorld(G, S0, emitters, tileAt, newS) {
  const ncx = Math.ceil(G.W * T / WCS), ncz = Math.ceil(G.H * T / WCS), data = S0.build(), stat = new Map();
  for (let i = 0; i < data.length; i += STRIDE) {
    const cx = clamp(Math.floor(data[i] / WCS), 0, ncx - 1), cz = clamp(Math.floor(data[i + 2] / WCS), 0, ncz - 1), k = cz * ncx + cx;
    let b = stat.get(k); if (!b) stat.set(k, b = []);
    for (let j = 0; j < STRIDE; j++) b.push(data[i + j]);
  }
  const staticEm = emitters.splice(0);
  const W = { lazy: true, chunks: [], emitters: staticEm.slice(), staticEm, built: new Map(), ncx, ncz, count: 0 };
  W.make = i => {
    const cx = i % ncx, cz = Math.floor(i / ncx), tpc = WCS / T, S = newS((G.seed * 7919 + i * 104729) | 0);
    for (let y = cz * tpc; y < Math.min(G.H, (cz + 1) * tpc); y++) for (let x = cx * tpc; x < Math.min(G.W, (cx + 1) * tpc); x++) tileAt(x, y);
    const own = S.build(), extra = stat.get(i), arr = new Float32Array(own.length + (extra ? extra.length : 0));
    arr.set(own); if (extra) arr.set(extra, own.length);
    const em = emitters.splice(0);
    if (!arr.length) return { i, em, cx: (cx + .5) * WCS, cz: (cz + .5) * WCS, empty: true };
    return { ...makeVAO(arr), i, em, cx: (cx + .5) * WCS, cz: (cz + .5) * WCS };
  };
  return W;
}
/** Monta os blocos perto de (px, pz) e descarta os longe. `budget`: quantos blocos montar neste quadro. */
function streamWorld(px, pz, budget = 2) {
  const W = WD; if (!W || !W.lazy) return;
  const want = [], r = Math.ceil(WBUILD / WCS), c0x = Math.floor(px / WCS), c0z = Math.floor(pz / WCS);
  for (let cz = c0z - r; cz <= c0z + r; cz++) for (let cx = c0x - r; cx <= c0x + r; cx++) {
    if (cx < 0 || cz < 0 || cx >= W.ncx || cz >= W.ncz) continue;
    const i = cz * W.ncx + cx; if (W.built.has(i)) continue;
    const d = Math.hypot((cx + .5) * WCS - px, (cz + .5) * WCS - pz); if (d < WBUILD) want.push([d, i]);
  }
  let changed = false;
  want.sort((a, b) => a[0] - b[0]);
  for (let k = 0; k < Math.min(budget, want.length); k++) { const c = W.make(want[k][1]); W.built.set(c.i, c); changed = true; }
  for (const [i, c] of W.built) if (Math.hypot(c.cx - px, c.cz - pz) > WFREE) { if (!c.empty) freeVAO(c); W.built.delete(i); changed = true; }
  if (changed) {
    W.chunks = [...W.built.values()].filter(c => !c.empty);
    W.emitters = W.staticEm.concat(...[...W.built.values()].map(c => c.em));
    W.count = W.chunks.reduce((a, c) => a + c.count, 0);
  }
}
