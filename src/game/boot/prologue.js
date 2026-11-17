/* Fios de Tessária · Prólogo: atalhos de DOM e contexto WebGL2 */
'use strict';
const $ = s => document.querySelector(s);
const canvas = $('#c');
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' });
if (!gl) { $('#loading').textContent = 'SEU NAVEGADOR NÃO TEM WEBGL2'; return; }
document.querySelectorAll('.ver').forEach(el => el.textContent = __VERSION__);
