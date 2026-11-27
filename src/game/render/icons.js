/* Fios de Tessária (módulo ES) · Ícones em pixel art */

/* =========================================================
   ÍCONES (pixel art 12×12 desenhada em código)
   ========================================================= */
export const ICONC = { k: '#120c1a', w: '#fff7e6', g: '#a9a3b8', s: '#d8d2e6', y: '#f2b84b', r: '#d9433a', b: '#4a8fe0', p: '#a35ee0', n: '#7a4a2a', N: '#b07a48', G: '#5fbf4a', c: '#3fd1d0', o: '#ff8a2a' };
export const ICONS = {
  sword: ['..........kk', '.........kwk', '........kwgk', '.......kwgk.', '......kwgk..', '..k..kwgk...', '..kkkwgk....', '...kygk.....', '..knkk......', '.knk.k......', 'knk.........', 'kk..........'],
  staff: ['.......kkk..', '......kcwck.', '......kccck.', '.......kkk..', '......knk...', '.....knk....', '....knk.....', '...knk......', '..knk.......', '.knk........', 'knk.........', 'kk..........'],
  bow: ['...kkk......', '..knnnk.....', '.kn..knk..k.', '.kn...k..kwk', 'kn....k.kwk.', 'kn....kkwk..', 'kn....kwkk..', 'kn...kwk.k..', '.kn.kwk..k..', '.knkwk..k...', '..kkk..kk...', '...kkkk.....'],
  armor: ['..kkk..kkk..', '.kgggkkgggk.', 'kggggggggggk', 'kgkggsgggkgk', '.kkggsgggkk.', '..kggsgggk..', '..kggggggk..', '..kyyyyyyk..', '..kggggggk..', '..kggggggk..', '...kkkkkk...', '............'],
  charm: ['..kk....kk..', '..ky....yk..', '...ky..yk...', '....kyyk....', '.....kk.....', '....kppk....', '...kpwppk...', '...kppppk...', '....kppk....', '.....kk.....', '............', '............'],
  potion: ['....kkkk....', '....knnk....', '.....kk.....', '....kwwk....', '...kwrrrk...', '..kwrrrrrk..', '..krrrrrrk..', '..krrrrrrk..', '..krrrrrrk..', '...krrrrk...', '....kkkk....', '............'],
  dash: ['............', '.kkkk.......', '..kcck......', '...kcck.....', 'kkkkkcck....', 'kccccccck...', 'kkkkkcck....', '...kcck.....', '..kcck......', '.kkkk.......', '............', '............'],
  fire: ['.....k......', '....kok.....', '....koyk....', '...koyok.k..', '..koyyokkok.', '..koyyyooyk.', '.koyywyyyok.', '.koywwwyyok.', '.koywwwyok..', '..koyyyok...', '...kkkkk....', '............'],
  nova: ['.....kk.....', '.....kck....', '..k..kck..k.', '..kckcwckck.', '...kcwwwck..', 'kkkcwwwwwckk', 'kcccwwwwccck', '.kkkcwwwckk.', '...kcwkwck..', '..kck.k.kck.', '..k.......k.', '............'],
  rain: ['.k...k...k..', '.k...k...k..', '.k...k...k..', '.k...k...k..', 'kgk.kgk.kgk.', 'kwk.kwk.kwk.', '.k...k...k..', '............', '..k...k...k.', '..k...k...k.', '.kwk.kwk.kwk', '..k...k...k.'],
  heart: ['............', '.kkk...kkk..', 'krrrk.krrrk.', 'krwrrkrrrrk.', 'krrrrrrrrrk.', 'krrrrrrrrrk.', '.krrrrrrrk..', '..krrrrrk...', '...krrrk....', '....krk.....', '.....k......', '............'],
  gold: ['.....kk.....', '.....kyk....', '.....kyk....', '....kyyyk...', '.kkkyywyykk.', 'kyyyywwwyyyk', '.kkkyywyykk.', '....kyyyk...', '.....kyk....', '.....kyk....', '.....kk.....', '............'],
  gem: ['............', '....kkkk....', '...kcwcck...', '..kcwccccck.', '.kkkkkkkkkk.', '..kcccccck..', '...kcccck...', '....kccck...', '.....kck....', '......k.....', '............', '............'],
  bag: ['....kkkk....', '...kn..nk...', '...kn..nk...', '..kkkkkkkk..', '.knnnnnnnnk.', '.knnyynnnnk.', '.knnyynnnnk.', '.knnnnnnnnk.', '.knnnnnnnnk.', '..kkkkkkkk..', '............', '............'],
  book: ['............', '.kkkkkkkkk..', '.knnnnnnnnk.', '.knwwwwwwnk.', '.knwkkkkwnk.', '.knwwwwwwnk.', '.knwkkkkwnk.', '.knwwwwwwnk.', '.knwkkkwwnk.', '.knnnnnnnnk.', '.kkkkkkkkkk.', '............'],
  gear: ['....k..k....', '...kgkkgk...', '.k.kggggk.k.', 'kgkggkkggkgk', '.kggk..kggk.', '.kgk....kgk.', '.kgk....kgk.', '.kggk..kggk.', 'kgkggkkggkgk', '.k.kggggk.k.', '...kgkkgk...', '....k..k....'],
};
export const iconURL = {};
export const ICON3D = {};   // ícones 3D assados pelo motor de splats (render.js, bakeIcons); os de pixel ficam de reserva
export function icon(name) {
  if (ICON3D[name]) return ICON3D[name];
  if (iconURL[name]) return iconURL[name];
  const rows = ICONS[name] || ICONS.gem, c = document.createElement('canvas'); c.width = c.height = 12;
  const x = c.getContext('2d');
  rows.forEach((r, y) => { for (let i = 0; i < 12; i++) { const ch = r[i]; if (ch && ch !== '.' && ICONC[ch]) { x.fillStyle = ICONC[ch]; x.fillRect(i, y, 1, 1); } } });
  return (iconURL[name] = c.toDataURL());
}
export const CLSICON = { lamina: 'sword', arcano: 'staff', arco: 'bow' };
export const SKILLICON = { lamina: 'fire', arcano: 'nova', arco: 'rain' };
export const SKILLNAME = { lamina: 'Giro', arcano: 'Nova', arco: 'Chuva' };

