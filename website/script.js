// Mosaic Lens — adapted from the user-provided Originkit component.
(() => {
  'use strict';
  const canvas=document.querySelector('#liquid');
  const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false});
  if(!gl){canvas.hidden=true;console.warn('Mosaic Lens requires WebGL2');return;}
  const config={background:[.08,.18,.22],color1:[.36,.73,.72],color2:[.48,.67,.86],speed:.65,size:1.65,angle:0,tile:16,hover:1,reach:285};
  const VERT_SRC = "#version 300 es\r\nconst vec2 P[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));\r\nvoid main() { gl_Position = vec4(P[gl_VertexID], 0.0, 1.0); }\r\n";
  const FIELD_SRC = "#version 300 es\r\nprecision highp float;\r\nuniform vec2 uRes;\r\nuniform float uTime;\r\nuniform vec3 uC1;\r\nuniform vec3 uC2;\r\nuniform float uSize;\r\nuniform float uAngle;\r\nout vec4 o;\r\n\r\nconst float TAU = 6.28318530718;\r\nconst float LAYERS = 74.0;\r\nconst float GAIN = 0.540;\r\nconst vec2 CENTRE = vec2(-0.25, -0.56);\r\nconst float TILT = -2.2;\r\nconst float ZOOM = 1.05;\r\nconst float THETA = 2.12;\r\nconst float SHEAR = 0.956;\r\nconst float SHRINK = 0.949;\r\nconst vec2 WARP_FREQ = vec2(0.58, 2.8);\r\nconst vec2 WARP_AMP = vec2(0.16, 0.034);\r\nconst vec2 ASPECT = vec2(1.65, 0.22);\r\nconst float OFFSET = 0.31;\r\nconst float GLOW = 0.0021;\r\nconst float SOFT = 0.0019;\r\nconst float FALLOFF = 0.37;\r\nconst float PHASE = 64.0;\r\nconst float CYCLE = 0.16;\r\nconst float HUE_TRAVEL = 2.0;\r\n\r\nmat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }\r\n\r\nvoid main() {\r\n  vec2 R = uRes;\r\n  vec2 pos = (gl_FragCoord.xy - 0.5 * R) / R.y;\r\n\r\n  pos = rot(uAngle) * pos / uSize;\r\n  float t = uTime * 0.49 + PHASE;\r\n  float breath = (-sin(uTime * 0.735) + sin(uTime * 0.49 + 1.0)) * 0.25 + 0.5;\r\n  vec2 u = rot(TILT) * ((pos - CENTRE) * (ZOOM - breath * 0.085));\r\n  mat2 fold = mat2(cos(THETA), sin(THETA), -SHEAR, cos(THETA));\r\n\r\n  vec3 col = vec3(0.0);\r\n  for (float i = 1.0; i <= LAYERS; i += 1.0) {\r\n    u.x -= sin(u.y * WARP_FREQ.x + t + i * 0.007) * WARP_AMP.x;\r\n    u.y -= sin(u.x * WARP_FREQ.y - t + i * 0.02) * WARP_AMP.y;\r\n    u = fold * u * SHRINK;\r\n    vec2 q = (u - vec2(OFFSET + breath * 0.1, 0.0)) * ASPECT;\r\n    float g = GLOW / (dot(q, q) + SOFT) * (0.25 + breath * 0.4);\r\n    float r = length(u);\r\n    float k = sin(i * CYCLE + t * 1.2 + r * HUE_TRAVEL) * 0.5 + 0.5;\r\n    col += g * mix(uC1, uC2, k) * (0.62 + 0.5 * k) * exp2(-r * FALLOFF);\r\n  }\r\n  vec3 x = max(col * GAIN, 0.0);\r\n  col = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);\r\n  col = pow(clamp(col, 0.0, 1.0), vec3(0.85, 0.92, 0.98));\r\n  col *= 1.0 - smoothstep(0.5, 1.6, length(pos)) * 0.07;\r\n  o = vec4(col, 1.0);\r\n}\r\n";
  const FINISH_SRC = "#version 300 es\nprecision highp float;\nuniform sampler2D uField;\nuniform vec2 uRes;\nuniform float uTime;\nuniform vec3 uBg;\nuniform vec2 uMouse;\nuniform float uOn;\nuniform float uReach;\nuniform float uTile;\nuniform vec2 uDrag;\nuniform vec2 uTrail[6];\nout vec4 o;\nfloat liquid(vec2 p){\n  vec2 warp=vec2(sin(p.y/uReach*3.2+uTime*.7),cos(p.x/uReach*3.8-uTime*.5))*uReach*.09;\n  float f=0.;\n  for(int i=0;i<6;i++){\n    vec2 d=(p-uTrail[i]+warp)/uReach;\n    float r=.55-float(i)*.045;\n    f+=exp(-dot(d,d)/(r*r))*(.52-float(i)*.055);\n  }\n  return smoothstep(.04,.95,f)*uOn;\n}\nvec3 scene(vec2 uv){return texture(uField,clamp(uv,0.,1.)).rgb;}\nvoid main(){\n  vec2 p=gl_FragCoord.xy;\n  float mask=liquid(p);\n  float stepSize=max(1.,uReach*.012);\n  vec2 gradient=vec2(liquid(p+vec2(stepSize,0.))-liquid(p-vec2(stepSize,0.)),liquid(p+vec2(0.,stepSize))-liquid(p-vec2(0.,stepSize)));\n  vec2 bend=gradient*uReach*5.5+uDrag*.75*mask;\n  vec2 uv=(p-bend)/uRes;\n  vec2 cell=(floor(p/uTile)+.5)*uTile/uRes;\n  vec3 blurred=(scene(cell+vec2(.002,0.))+scene(cell-vec2(.002,0.))+scene(cell+vec2(0.,.002))+scene(cell-vec2(0.,.002)))*.25;\n  vec3 light=mix(blurred,scene(uv),mask);\n  vec3 col=mix(uBg,vec3(.73,.86,.86),.24)+light*.48;\n  // A visible translucent blue-green body, including on quiet parts of the field.\n  vec3 tint=mix(vec3(.12,.43,.55),vec3(.20,.62,.53),.5+.5*sin(p.x/uReach*2.3+p.y/uReach*1.7+uTime*.8));\n  col=mix(col,tint+light*.22,mask*.62);\n  float sheen=pow(clamp(length(gradient)*11.,0.,1.),1.4);\n  col+=vec3(.69,.95,.88)*sheen*.30;\n  col+=vec3(.54,.85,.79)*mask*.08;\n  o=vec4(clamp(col,0.,1.),1.);\n}";

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
    const un=locations(finish,['uField','uRes','uTime','uBg','uPaper','uMouse','uOn','uReach','uTile','uDrag','uTrail[0]']);
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
    const trail=Array.from({length:6},()=>({x:0,y:0})),trailData=new Float32Array(12);
    const pointer={x:0,y:0,inside:false};let mx=0,my=0,on=0,last=0,clock=0,raf=0,dragX=0,dragY=0;
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
      if(present&&on<.02){mx=pointer.x;my=pointer.y;trail.forEach(n=>{n.x=mx;n.y=my;});}
      on+=(present-on)*(1-Math.exp(-dt*(present?9:1.1)));
      const oldX=mx,oldY=my;
      const k=1-Math.exp(-dt*12);mx+=(pointer.x-mx)*k;my+=(pointer.y-my)*k;
      const response=1-Math.exp(-dt*8);
      dragX+=((mx-oldX)/Math.max(dt,.001)*.12-dragX)*response;
      dragY+=((my-oldY)/Math.max(dt,.001)*.12-dragY)*response;
      for(let i=0;i<6;i++){
        const leader=i?trail[i-1]:{x:mx,y:my};
        const follow=1-Math.exp(-dt*(i?5:10));
        trail[i].x+=(leader.x-trail[i].x)*follow;trail[i].y+=(leader.y-trail[i].y)*follow;
        trailData[i*2]=trail[i].x*dpr;trailData[i*2+1]=bh-trail[i].y*dpr;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.viewport(0,0,tw,th);gl.useProgram(field);
      gl.uniform2f(uf.uRes,tw,th);gl.uniform1f(uf.uTime,clock);
      gl.uniform3fv(uf.uC1,config.color1);gl.uniform3fv(uf.uC2,config.color2);
      gl.uniform1f(uf.uSize,config.size);gl.uniform1f(uf.uAngle,config.angle);gl.drawArrays(gl.TRIANGLES,0,3);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,bw,bh);gl.useProgram(finish);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.uniform1i(un.uField,0);gl.uniform2f(un.uRes,bw,bh);gl.uniform1f(un.uTime,clock);
      gl.uniform3fv(un.uBg,config.background);gl.uniform1f(un.uPaper,0);
      gl.uniform2f(un.uMouse,mx*bw/Math.max(cw,1),bh-my*bh/Math.max(ch,1));
      gl.uniform1f(un.uOn,on*config.hover);gl.uniform1f(un.uReach,Math.min(config.reach,Math.min(cw,ch)*.48)*bh/Math.max(ch,1));
      gl.uniform2f(un.uDrag,reduced.matches?0:Math.max(-160,Math.min(160,dragX))*dpr,reduced.matches?0:-Math.max(-160,Math.min(160,dragY))*dpr);
      gl.uniform2fv(un['uTrail[0]'],trailData);
      gl.uniform1f(un.uTile,Math.max(1,Math.round(config.tile*dpr)));gl.drawArrays(gl.TRIANGLES,0,3);
      raf=requestAnimationFrame(render);
    }
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);canvas.hidden=true;});
    canvas.addEventListener('webglcontextrestored',()=>window.location.reload());
    document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(raf);last=0;if(!document.hidden)raf=requestAnimationFrame(render);});
    raf=requestAnimationFrame(render);
  }catch(error){canvas.hidden=true;console.error('Mosaic Lens:',error);}
})();
