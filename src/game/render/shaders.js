/* Fios de Tessária · Shaders e pipeline WebGL */
/* =========================================================
   SHADERS
   ========================================================= */
const VS_SPLAT = `#version 300 es
precision highp float;
precision highp int;
layout(location=0) in vec3 a_pos;
layout(location=1) in vec3 a_nrm;
layout(location=2) in vec4 a_info;
uniform mat4 u_bones[24];
uniform mat4 u_vp;
uniform vec3 u_cam, u_light, u_player, u_pclip;
uniform float u_aspect;
uniform float u_proj, u_sizeMul, u_dissolve, u_dmat, u_flash, u_glow, u_near, u_range, u_time, u_xray;
uniform vec4 u_shadow[8];
out float v_mat; out float v_shade; out float v_flash; out float v_depth;
float hash(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
void kill(){ gl_Position=vec4(2.0,2.0,2.0,1.0); gl_PointSize=0.0; }
void main(){
  int bone=int(a_info.y+0.5), flags=int(a_info.w+0.5);
  mat4 M=u_bones[bone];
  vec4 wp=M*vec4(a_pos,1.0);
  if(u_xray>0.0 && (flags&8)!=0){
    vec4 cp=u_vp*wp; vec2 dd=(cp.xy/cp.w-u_pclip.xy)*vec2(u_aspect,1.0);
    if(cp.w<u_pclip.z-0.8 && dot(dd,dd)<0.07){ kill(); return; }
  }
  float mat=a_info.x, size=a_info.z*u_sizeMul, shade;
  if((flags&2)!=0){
    shade=a_nrm.x*u_glow;
    if((flags&16)!=0) shade*=0.78+0.28*sin(u_time*2.2+wp.x*1.7+wp.z*1.3);
  } else {
    vec3 n=normalize(mat3(M)*a_nrm);
    vec3 Vd=normalize(u_cam-wp.xyz);
    if((flags&1)!=0 && dot(n,Vd)<0.0) n=-n;
    float nv=dot(n,Vd);
    if(nv<-0.2){ kill(); return; }
    float diff=max(dot(n,u_light),0.0);
    float rim=pow(1.0-clamp(nv,0.0,1.0),3.0);
    shade=0.17+0.72*diff+0.18*rim;
    if((flags&16)!=0) shade*=0.82+0.22*sin(u_time*1.8+wp.x*1.3+wp.z*0.9);
    if((flags&4)!=0){
      float sh=1.0;
      for(int i=0;i<8;i++){ vec4 s=u_shadow[i]; if(s.z<=0.0) continue; float q=length((wp.xz-s.xy)/s.zw); sh=min(sh,mix(0.35,1.0,smoothstep(0.45,1.0,q))); }
      shade*=sh;
    }
  }
  if(u_dissolve>0.0){
    float h=hash(a_pos*3.7);
    float k=clamp((u_dissolve*1.35-h)/0.35,0.0,1.0);
    if(k>=1.0){ kill(); return; }
    if(k>0.0){
      wp.xyz+=vec3(sin(h*91.0),0.0,cos(h*57.0))*0.7*k+vec3(0.0,3.0*k*k,0.0);
      shade=1.0-k; mat=u_dmat; size*=1.0-0.6*k;
    }
  }
  gl_Position=u_vp*wp;
  gl_PointSize=clamp(size*u_proj/gl_Position.w,1.0,96.0);
  v_mat=mat; v_shade=shade; v_flash=u_flash;
  v_depth=clamp((gl_Position.w-u_near)/u_range,0.012,1.0);
}`;
const FS_SPLAT = `#version 300 es
precision highp float;
in float v_mat; in float v_shade; in float v_flash; in float v_depth;
uniform float u_soft;
out vec4 o;
void main(){
  vec2 c=gl_PointCoord*2.0-1.0;
  float r2=dot(c,c);
  if(r2>1.0) discard;
  float g=exp(-r2*2.5);
  // u_soft: sem o brilho no centro de cada splat (que dá o aspecto de bolinhas); usado nos humanoides
  o=vec4(v_mat/255.0, clamp(v_shade+(g-0.45)*0.14*(1.0-u_soft),0.0,1.0), v_flash, v_depth);
}`;
const VS_POST = `#version 300 es
void main(){ vec2 p=vec2((gl_VertexID<<1)&2, gl_VertexID&2); gl_Position=vec4(p*2.0-1.0,0.0,1.0); }`;
const FS_POST = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D u_fb, u_pal;
uniform float u_px, u_dither, u_time, u_fade, u_hurt;
uniform vec2 u_res;
uniform int u_outlineOn;
uniform int u_icon;   // 1: assando ícone (fundo transparente)
uniform vec3 u_outline, u_bg0, u_bg1, u_bg2, u_star;
out vec4 o;
const float BAY[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
bool isEm(int m){ return m==6||m==7||m==14||m==20||m==21||m==26||m==27||m==30||m==31||(m>=32&&(m&7)>=6)||(m>=120&&m<=124); }
float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
void main(){
  ivec2 R=ivec2(u_res)-1;
  ivec2 lp=min(ivec2(gl_FragCoord.xy/u_px),R);
  vec4 d=texelFetch(u_fb,lp,0);
  float b=(BAY[(lp.y&3)*4+(lp.x&3)]+0.5)/16.0;
  vec2 uv=(vec2(lp)+0.5)/u_res;
  ivec2 OFF[4]=ivec2[4](ivec2(1,0),ivec2(-1,0),ivec2(0,1),ivec2(0,-1));
  vec3 col;
  bool done=false;
  if(d.a==0.0){
    if(u_outlineOn==1){
      for(int i=0;i<4;i++){ vec4 q=texelFetch(u_fb,clamp(lp+OFF[i],ivec2(0),R),0); if(q.a>0.0 && !isEm(int(q.r*255.0+0.5))){ col=u_outline; done=true; break; } }
    }
    if(!done && u_icon==1){ o=vec4(0.0); return; }
    if(!done){
      float f=(1.0-uv.y)*2.0+(b-0.5)*0.9;
      int i=clamp(int(floor(f+0.5)),0,2); col=i==0?u_bg0:(i==1?u_bg1:u_bg2);
      float hs=h21(vec2(lp));
      if(uv.y>0.35 && hs>0.996){ float tw=sin(u_time*2.5+hs*300.0); if(tw>-0.2) col=mix(col,u_star,tw>0.6?1.0:0.55); }
    }
  } else {
    int m=int(d.r*255.0+0.5);
    int i=clamp(int(floor(d.g*4.0+(b-0.5)*u_dither+0.5)),0,4);
    col=texelFetch(u_pal,ivec2(i,m),0).rgb;
    if(u_outlineOn==1 && !isEm(m)){
      for(int k=0;k<4;k++){
        vec4 q=texelFetch(u_fb,clamp(lp+OFF[k],ivec2(0),R),0);
        if(q.a>0.0 && q.a<d.a-0.06 && !isEm(int(q.r*255.0+0.5))){ col=mix(texelFetch(u_pal,ivec2(0,m),0).rgb,u_outline,0.55); break; }
      }
    }
    if(d.b>0.0 && d.b*1.05>b) col=vec3(1.0);
  }
  vec2 cv=uv-0.5; float vig=dot(cv,cv)*2.4;
  if(u_hurt>0.0 && (vig-0.42)*u_hurt*2.4>b) col=mix(col,vec3(0.75,0.08,0.08),0.7);
  if(u_fade>0.0 && u_fade>b) col=vec3(0.02,0.015,0.04);
  o=vec4(col,1.0);
}`;
function compile(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
function program(vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}
const PS = program(VS_SPLAT, FS_SPLAT), PP = program(VS_POST, FS_POST);
function makeVAO(data, dynamicCap) {
  const vao = gl.createVertexArray(), buf = gl.createBuffer();
  gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  if (dynamicCap) gl.bufferData(gl.ARRAY_BUFFER, dynamicCap * STRIDE * 4, gl.DYNAMIC_DRAW); else gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  const B = STRIDE * 4;
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, B, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, B, 12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, B, 24);
  gl.bindVertexArray(null);
  return { vao, buf, count: data ? data.length / STRIDE : 0 };
}
function freeVAO(v) { if (!v) return; gl.deleteBuffer(v.buf); gl.deleteVertexArray(v.vao); }
const emptyVAO = gl.createVertexArray();
const FB = { w: 0, h: 0, fbo: gl.createFramebuffer(), tex: gl.createTexture(), depth: gl.createRenderbuffer() };
function resizeFB(w, h) {
  if (w === FB.w && h === FB.h) return;
  FB.w = w; FB.h = h;
  gl.bindTexture(gl.TEXTURE_2D, FB.tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindRenderbuffer(gl.RENDERBUFFER, FB.depth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
  gl.bindFramebuffer(gl.FRAMEBUFFER, FB.fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, FB.tex, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, FB.depth);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
const palTex = gl.createTexture();
let curPal = null;
function uploadPalette(regKey) {
  const reg = (regKey === 'hub' && G.save && G.save.ended && G.mode !== 'title' && G.mode !== 'create') ? REGPAL.hubDay : (REGPAL[regKey] || REGPAL[G.rift ? G.rift.base : 'hub']), px = new Uint8Array(5 * 256 * 4);
  const rows = [];
  const pr = charRows(G.char);
  for (let i = 0; i < 8; i++) rows[i] = pr[i];
  const eqOn = G.mode !== 'create' || G.wardrobe;   // no guarda-roupa o herói está equipado: cores do metal e da raridade de verdade
  const wr = eqOn && G.save && G.save.eq && G.save.eq.weapon ? G.save.eq.weapon.rar : 0; rows[4] = METAL[wr];
  for (let i = 8; i < 30; i++) rows[i] = reg.rows[i];
  for (let i = 152; i < 160; i++) if (reg.rows[i]) rows[i] = reg.rows[i];   // cores extras da região (biomas dos Ermos)
  if (regKey === 'hub') { const br = charRows(BARD.cfg); for (let i = 0; i < 8; i++) rows[152 + i] = br[i]; }   // Bardo (só na vila)
  rows[30] = SPARK; rows[31] = HEAL; RAR.forEach(r => rows[r.row] = r.ramp);
  const eqp = eqOn && G.save && G.save.eq ? G.save.eq : {}, arR = eqp.armor ? eqp.armor.rar : 0, chR = eqp.charm ? eqp.charm.rar : 0;
  rows[125] = METAL[arR]; rows[126] = RAR[arR].ramp; rows[127] = RAR[chR].ramp;
  NPCS.forEach((n, k) => { const r = charRows(n.cfg); for (let i = 0; i < 8; i++) rows[32 + k * 8 + i] = r[i]; });
  for (const k in XROWS) rows[k] = XROWS[k];
  if (regKey === 'wilds') { const r = charRows(MERC_CFG); for (let i = 0; i < 8; i++) rows[128 + i] = r[i]; }   // mercador dos acampamentos
  if (regKey === 'hub') for (const n of EAST_NPCS) { const r = charRows(n.cfg); for (let i = 0; i < 8; i++) rows[n.base + i] = r[i]; }   // moradores do Bairro Leste (só na vila)
  for (const k in REMOTE_ROWS) rows[k] = REMOTE_ROWS[k];
  if (regKey !== 'hub') { const rf = charRows({ ...G.char, skin: 5, outfit: 11, trim: 3, glow: 2 }); for (let i = 0; i < 8; i++) rows[152 + i] = rf[i]; }   // Reflexo (fora da vila; na vila as linhas são do Bardo)
  for (let m = 0; m < 256; m++) { const row = rows[m] || rows[11]; for (let i = 0; i < 5; i++) { const c = row[i], o = (m * 5 + i) * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255; } }
  gl.bindTexture(gl.TEXTURE_2D, palTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 5, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  if (G.mode !== 'create' && G.mode !== 'title' && typeof bakePortrait === 'function') setTimeout(bakePortrait, 0);   // retrato do HUD com as cores novas
  curPal = (G.rift && RG && RG.key === 'rift') ? { ...reg, bg: ['#07030e', '#1a0b2e', '#3c1766'], star: '#e6d0ff' } : reg;
}

