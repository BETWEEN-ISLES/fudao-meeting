const canvas = document.querySelector('#liquid');
const gl = canvas.getContext('webgl', { alpha:false, antialias:false });
if (!gl) alert('你的瀏覽器不支援 WebGL');

const vs = `
attribute vec2 a_position;
void main(){ gl_Position = vec4(a_position,0.0,1.0); }
`;

const fs = `
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform vec2 u_mouseVel;
uniform float u_time;

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
}
float fbm(vec2 p){
  float v=0.,a=.5;
  for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+13.7;a*=.5;}
  return v;
}

vec3 sky(vec2 uv){
  float y=uv.y;
  vec3 top=vec3(.025,.075,.15);
  vec3 mid=vec3(.20,.48,.68);
  vec3 low=vec3(.72,.87,.93);
  vec3 col=mix(low,mid,smoothstep(.0,.52,y));
  col=mix(col,top,smoothstep(.48,1.,y));

  float n=fbm(uv*vec2(2.2,3.0)+vec2(u_time*.008,0.));
  float clouds=smoothstep(.53,.78,n + (0.46-y)*.25);
  col=mix(col,vec3(.92,.97,1.),clouds*.23);

  float glow=exp(-7.0*length(uv-vec2(.52,.62)));
  col+=vec3(.30,.48,.62)*glow*.34;
  return col;
}

void main(){
  vec2 frag=gl_FragCoord.xy/u_resolution;
  vec2 uv=frag;
  uv.x*=u_resolution.x/u_resolution.y;
  vec2 m=u_mouse;
  m.x*=u_resolution.x/u_resolution.y;

  vec2 d=uv-m;
  float r=length(d);
  float influence=exp(-r*r*5.0);
  float wave=sin(r*28.0-u_time*3.0)*exp(-r*4.5);

  vec2 dir = r>.001 ? d/r : vec2(0.0);
  vec2 tangent=vec2(-dir.y,dir.x);
  float speed=min(length(u_mouseVel)*2.2,1.0);

  // 液態玻璃：滑鼠附近的折射、拉扯與細微旋流
  vec2 distortion = dir*wave*.010*influence;
  distortion += tangent*influence*(.010+.025*speed)*sin(u_time*1.6+r*18.0);
  distortion += u_mouseVel*influence*.045;

  float liquid=fbm(uv*3.4 + vec2(u_time*.045,-u_time*.025));
  distortion += vec2(liquid-.5, fbm(uv*3.4+8.2)-.5)*.008*influence;

  vec2 refrUV=frag+distortion;
  vec2 chroma=normalize(distortion+vec2(.0001))*.0045*influence;
  vec3 c;
  c.r=sky(refrUV+chroma).r;
  c.g=sky(refrUV).g;
  c.b=sky(refrUV-chroma).b;

  // 玻璃邊緣高光，不形成固定圓環，只沿流動區域浮現
  float edge=pow(influence,1.8)*(0.5+0.5*sin(r*22.0-u_time*2.4+liquid*5.0));
  c+=vec3(.60,.82,1.0)*edge*.11;
  c+=vec3(.9,.98,1.0)*pow(influence,5.0)*.055;

  float vignette=smoothstep(1.05,.28,length(frag-.5));
  c*=.80+.20*vignette;
  gl_FragColor=vec4(c,1.0);
}
`;

function shader(type, src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(s));return s}
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);gl.useProgram(program);
const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
const pos=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
const resLoc=gl.getUniformLocation(program,'u_resolution'), mouseLoc=gl.getUniformLocation(program,'u_mouse'), velLoc=gl.getUniformLocation(program,'u_mouseVel'), timeLoc=gl.getUniformLocation(program,'u_time');
let mouse={x:.5,y:.5}, target={x:.5,y:.5}, prev={x:.5,y:.5}, vel={x:0,y:0};
function resize(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;gl.viewport(0,0,canvas.width,canvas.height)}
addEventListener('resize',resize);resize();
addEventListener('pointermove',e=>{target.x=e.clientX/innerWidth;target.y=1-e.clientY/innerHeight});
addEventListener('touchmove',e=>{if(e.touches[0]){target.x=e.touches[0].clientX/innerWidth;target.y=1-e.touches[0].clientY/innerHeight}},{passive:true});
const start=performance.now();
function render(now){
  mouse.x+=(target.x-mouse.x)*.11; mouse.y+=(target.y-mouse.y)*.11;
  vel.x=(mouse.x-prev.x)*.75+vel.x*.25; vel.y=(mouse.y-prev.y)*.75+vel.y*.25;
  prev.x=mouse.x; prev.y=mouse.y;
  gl.uniform2f(resLoc,canvas.width,canvas.height);gl.uniform2f(mouseLoc,mouse.x,mouse.y);gl.uniform2f(velLoc,vel.x,vel.y);gl.uniform1f(timeLoc,(now-start)/1000);
  gl.drawArrays(gl.TRIANGLES,0,6);requestAnimationFrame(render);
}
requestAnimationFrame(render);
