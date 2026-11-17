// Ponto de entrada. O jogo em si é montado pelo plugin `tessaria-game`
// (ver vite.config.js) a partir dos arquivos listados em src/game/manifest.json.
// O modo online (src/net) carrega antes, para o jogo encontrar window.TessNet.
import './styles/game.css';
import './net/net.css';
import { Net } from './net/online';
import { mountOnlineUI } from './net/ui';
import 'virtual:tessaria-game';

const net = new Net();
window.TessNet = net;
addEventListener('error', e => net.reportError(String(e.message || e.error), e.error && e.error.stack ? String(e.error.stack) : ''));
addEventListener('unhandledrejection', e => net.reportError('Promise: ' + String(e.reason), e.reason && e.reason.stack ? String(e.reason.stack) : ''));

// A interface online entra depois do jogo pronto (título montado).
const ready = () => { if (window.TessGame && document.querySelector('#mOnline')) { mountOnlineUI(net); void net.init(); } else setTimeout(ready, 50); };
if (net.enabled) ready();
