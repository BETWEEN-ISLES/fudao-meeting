// Mosaic Lens — adapted from the user-provided Originkit component.
(() => {
  'use strict';
  const canvas=document.querySelector('#liquid');
  const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false});
  if(!gl){canvas.hidden=true;console.warn('Mosaic Lens requires WebGL2');return;}
  const config={background:[10/255,7/255,16/255],color1:[1,122/255,61/255],color2:[176/255,77/255,1],speed:2,size:1.53,angle:0,tile:10,hover:.88,reach:279};
  const VERT_SRC = "#version 300 es\r\nconst vec2 P[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));\r\nvoid main() { gl_Position = vec4(P[gl_VertexID], 0.0, 1.0); }\r\n";
  const FIELD_SRC = "#version 300 es\r\nprecision highp float;\r\nuniform vec2 uRes;\r\nuniform float uTime;\r\nuniform vec3 uC1;\r\nuniform vec3 uC2;\r\nuniform float uSize;\r\nuniform float uAngle;\r\nout vec4 o;\r\n\r\nconst float TAU = 6.28318530718;\r\nconst float LAYERS = 74.0;\r\nconst float GAIN = 0.540;\r\nconst vec2 CENTRE = vec2(-0.25, -0.56);\r\nconst float TILT = -2.2;\r\nconst float ZOOM = 1.05;\r\nconst float THETA = 2.12;\r\nconst float SHEAR = 0.956;\r\nconst float SHRINK = 0.949;\r\nconst vec2 WARP_FREQ = vec2(0.58, 2.8);\r\nconst vec2 WARP_AMP = vec2(0.16, 0.034);\r\nconst vec2 ASPECT = vec2(1.65, 0.22);\r\nconst float OFFSET = 0.31;\r\nconst float GLOW = 0.0021;\r\nconst float SOFT = 0.0019;\r\nconst float FALLOFF = 0.37;\r\nconst float PHASE = 64.0;\r\nconst float CYCLE = 0.16;\r\nconst float HUE_TRAVEL = 2.0;\r\n\r\nmat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }\r\n\r\nvoid main() {\r\n  vec2 R = uRes;\r\n  vec2 pos = (gl_FragCoord.xy - 0.5 * R) / R.y;\r\n\r\n  pos = rot(uAngle) * pos / uSize;\r\n  float t = uTime * 0.49 + PHASE;\r\n  float breath = (-sin(uTime * 0.735) + sin(uTime * 0.49 + 1.0)) * 0.25 + 0.5;\r\n  vec2 u = rot(TILT) * ((pos - CENTRE) * (ZOOM - breath * 0.085));\r\n  mat2 fold = mat2(cos(THETA), sin(THETA), -SHEAR, cos(THETA));\r\n\r\n  vec3 col = vec3(0.0);\r\n  for (float i = 1.0; i <= LAYERS; i += 1.0) {\r\n    u.x -= sin(u.y * WARP_FREQ.x + t + i * 0.007) * WARP_AMP.x;\r\n    u.y -= sin(u.x * WARP_FREQ.y - t + i * 0.02) * WARP_AMP.y;\r\n    u = fold * u * SHRINK;\r\n    vec2 q = (u - vec2(OFFSET + breath * 0.1, 0.0)) * ASPECT;\r\n    float g = GLOW / (dot(q, q) + SOFT) * (0.25 + breath * 0.4);\r\n    float r = length(u);\r\n    float k = sin(i * CYCLE + t * 1.2 + r * HUE_TRAVEL) * 0.5 + 0.5;\r\n    col += g * mix(uC1, uC2, k) * (0.62 + 0.5 * k) * exp2(-r * FALLOFF);\r\n  }\r\n  vec3 x = max(col * GAIN, 0.0);\r\n  col = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);\r\n  col = pow(clamp(col, 0.0, 1.0), vec3(0.85, 0.92, 0.98));\r\n  col *= 1.0 - smoothstep(0.5, 1.6, length(pos)) * 0.07;\r\n  o = vec4(col, 1.0);\r\n}\r\n";
  const FINISH_SRC = "#version 300 es\r\nprecision highp float;\r\nuniform sampler2D uField;\r\nuniform vec2 uRes;\r\nuniform float uTime;\r\nuniform vec3 uBg;\r\nuniform float uPaper;\r\nuniform vec2 uMouse;\r\nuniform float uOn;\r\nuniform float uReach;\r\nuniform float uTile;\r\nout vec4 o;\r\n\r\nconst float TIERS = 4.0;\r\n\r\nfloat ign(vec2 p, float f) { p += 5.588238 * mod(f, 64.0); return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y)); }\r\n\r\nvec3 scene(vec2 uv) { return texture(uField, clamp(uv, 0.0, 1.0)).rgb; }\r\n\r\nvec3 mosaic(vec2 frag, vec2 uv) {\r\n  float base = uTile;\r\n  float tier = 0.0;\r\n\r\n  if (uOn > 1e-4) {\r\n    vec2 cc = (floor(frag / base) + 0.5) * base;\r\n    vec2 d = (cc - uMouse) / uReach;\r\n    float w = uOn * exp(-dot(d, d));\r\n    tier = floor(min(w * (TIERS + 1.0), TIERS));\r\n  }\r\n  if (tier >= TIERS) return scene(uv);\r\n  float cell = base / exp2(tier);\r\n  vec2 c = (floor(frag / cell) + 0.5) * cell;\r\n  vec3 s = scene((c + cell * vec2(-0.25, -0.25)) / uRes) + scene((c + cell * vec2(0.25, -0.25)) / uRes)\r\n         + scene((c + cell * vec2(-0.25, 0.25)) / uRes) + scene((c + cell * vec2(0.25, 0.25)) / uRes);\r\n  return s * 0.25;\r\n}\r\n\r\nvoid main() {\r\n  vec2 frag = gl_FragCoord.xy;\r\n  vec3 L = max(mosaic(frag, frag / uRes), 0.0);\r\n\r\n  vec3 dark = uBg + L * (1.0 - uBg);\r\n  float strength = clamp(max(L.r, max(L.g, L.b)), 0.0, 1.0);\r\n  vec3 paper = uBg * (1.0 - strength) + L * 0.96;\r\n  vec3 col = mix(dark, paper, uPaper);\r\n  col += (ign(frag, floor(uTime * 24.0)) - 0.5) / 255.0;\r\n  o = vec4(clamp(col, 0.0, 1.0), 1.0);\r\n}\r\n";

  function link(fragment){
    const compile=(type,source)=>{
      const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(error);}
      return shader;
    };
    const vs=compile(gl.VERTEX_SHADER,VERT_SRC),fs=compile(gl.FRAGMENT_SHADER,fragment);
    const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    return program;
  }
  try {
    const field=link(FIELD_SRC),finish=link(FINISH_SRC);
    const locations=(p,names)=>Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(p,n)]));
    const uf=locations(field,['uRes','uTime','uC1','uC2','uSize','uAngle']);
    const un=locations(finish,['uField','uRes','uTime','uBg','uPaper','uMouse','uOn','uReach','uTile']);
    const vao=gl.createVertexArray();gl.bindVertexArray(vao);
    const fbo=gl.createFramebuffer();let texture=null,tw=0,th=0;
    let half=!!gl.getExtension('EXT_color_buffer_float');
    function resizeTarget(w,h){
      if(w===tw&&h===th&&texture)return;
      let complete=false;
      for(let attempt=0;attempt<2;attempt++){
        if(texture)gl.deleteTexture(texture);
        texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D,0,half?gl.RGBA16F:gl.RGBA8,w,h,0,gl.RGBA,half?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);
        gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
        complete=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);
        if(complete)break;
        half=false;
      }
      if(!complete)throw new Error('Mosaic Lens framebuffer unavailable');
      tw=w;th=h;
    }
    const pointer={x:0,y:0,inside:false};let mx=0,my=0,on=0,last=0,clock=0,raf=0;
    const read=e=>{const r=canvas.getBoundingClientRect();pointer.x=e.clientX-r.left;pointer.y=e.clientY-r.top;pointer.inside=true;};
    const leave=e=>{if(!e.relatedTarget)pointer.inside=false;};
    const blur=()=>{pointer.inside=false;};
    window.addEventListener('pointermove',read,{passive:true});window.addEventListener('pointerdown',read,{passive:true});
    document.addEventListener('pointerout',leave);window.addEventListener('blur',blur);
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    function render(now){
      const dt=last?Math.min((now-last)/1000,.05):0;last=now;
      if(!reduced.matches)clock=(clock+dt*config.speed)%3600;
      const dpr=Math.min(window.devicePixelRatio||1,2),cw=canvas.clientWidth,ch=canvas.clientHeight;
      const bw=Math.max(1,Math.round(cw*dpr)),bh=Math.max(1,Math.round(ch*dpr));
      if(canvas.width!==bw||canvas.height!==bh){canvas.width=bw;canvas.height=bh;}
      resizeTarget(Math.max(1,Math.round(bw/2)),Math.max(1,Math.round(bh/2)));
      const present=pointer.inside?1:0;
      if(present&&on<.02){mx=pointer.x;my=pointer.y;}
      on+=(present-on)*(1-Math.exp(-dt*5));
      const k=1-Math.exp(-dt*16);mx+=(pointer.x-mx)*k;my+=(pointer.y-my)*k;
      gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.viewport(0,0,tw,th);gl.useProgram(field);
      gl.uniform2f(uf.uRes,tw,th);gl.uniform1f(uf.uTime,clock);
      gl.uniform3fv(uf.uC1,config.color1);gl.uniform3fv(uf.uC2,config.color2);
      gl.uniform1f(uf.uSize,config.size);gl.uniform1f(uf.uAngle,config.angle);gl.drawArrays(gl.TRIANGLES,0,3);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,bw,bh);gl.useProgram(finish);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.uniform1i(un.uField,0);gl.uniform2f(un.uRes,bw,bh);gl.uniform1f(un.uTime,clock);
      gl.uniform3fv(un.uBg,config.background);gl.uniform1f(un.uPaper,0);
      gl.uniform2f(un.uMouse,mx*bw/Math.max(cw,1),bh-my*bh/Math.max(ch,1));
      gl.uniform1f(un.uOn,on*config.hover);gl.uniform1f(un.uReach,config.reach*bh/Math.max(ch,1));
      gl.uniform1f(un.uTile,Math.max(1,Math.round(config.tile*dpr)));gl.drawArrays(gl.TRIANGLES,0,3);
      raf=requestAnimationFrame(render);
    }
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);canvas.hidden=true;});
    canvas.addEventListener('webglcontextrestored',()=>window.location.reload());
    document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(raf);last=0;if(!document.hidden)raf=requestAnimationFrame(render);});
    raf=requestAnimationFrame(render);
  }catch(error){canvas.hidden=true;console.error('Mosaic Lens:',error);}
})();
