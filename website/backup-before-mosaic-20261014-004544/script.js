const canvas = document.querySelector('#liquid');
const gl = canvas.getContext('webgl', { alpha:false, antialias:false });
if (!gl) { canvas.style.display='none'; console.warn('WebGL unavailable; using page background.'); }
if (gl) {

const vs = `
attribute vec2 a_position;
void main(){ gl_Position = vec4(a_position,0.0,1.0); }
`;

const fs = `
precision highp float;
uniform vec2 u_resolution;
uniform vec4 u_nodes[12];
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

  // A material field made of connected, lagging masses, rather than radial waves.
  float field=0.;
  vec2 gradient=vec2(0.);
  vec2 flow=vec2(0.);
  vec2 warp=vec2(fbm(uv*8.+u_time*.07),fbm(uv*8.+19.3-u_time*.055))-.5;
  for(int i=0;i<12;i++){
    vec4 node=u_nodes[i];
    vec2 center=node.xy;
    center.x*=u_resolution.x/u_resolution.y;
    vec2 d=uv-center+warp*.035;
    float radius=node.z;
    float shape=1.+.22*sin(d.x*23.+float(i)*1.7+u_time*.23)
                   +.16*sin(d.y*31.-float(i)*2.1-u_time*.18);
    float mass=exp(-dot(d,d)/(radius*radius)*shape)*node.w;
    field+=mass;
    gradient+=-2.*d/(radius*radius)*mass;
    flow+=vec2(-d.y,d.x)*mass*sin(float(i)*2.+u_time*.36);
  }
  float mask=smoothstep(.18,.85,field);
  vec2 normal=gradient/(1.+length(gradient));
  vec2 distortion=normal*.034*mask+flow*.10+warp*.014*mask;
  distortion.x/=u_resolution.x/u_resolution.y;
  vec2 refrUV=frag+distortion;
  vec2 chroma=distortion*.10;
  vec3 c;
  c.r=sky(refrUV+chroma).r;
  c.g=sky(refrUV).g;
  c.b=sky(refrUV-chroma).b;
  float rim=exp(-pow((field-.46)*3.8,2.))*mask;
  float light=pow(max(0.,dot(normal,normalize(vec2(-.55,.83)))),3.);
  c+=vec3(.60,.82,1.)*rim*light*.24;
  c+=vec3(.9,.98,1.)*mask*.025;
  float vignette=smoothstep(1.05,.28,length(frag-.5));
  c*=.80+.20*vignette;
  gl_FragColor=vec4(c,1.0);
}
`;

function shader(type, src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
const pos=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);

const resLoc=gl.getUniformLocation(program,'u_resolution');
const nodesLoc=gl.getUniformLocation(program,'u_nodes[0]');
const timeLoc=gl.getUniformLocation(program,'u_time');
const nodes=Array.from({length:12},()=>({x:.5,y:.5,vx:0,vy:0,energy:0}));
const packed=new Float32Array(48);
const target={x:.5,y:.5};
let lastInput=0, previousTime=0, active=false;
function resize(){const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);gl.viewport(0,0,canvas.width,canvas.height)}
addEventListener('resize',resize);resize();
addEventListener('pointermove',e=>{
  target.x=e.clientX/innerWidth;target.y=1-e.clientY/innerHeight;
  lastInput=performance.now();
  if(!active){nodes.forEach(n=>{n.x=target.x;n.y=target.y});active=true;}
},{passive:true});
const start=performance.now();
function render(now){
  const dt=Math.min((now-(previousTime||now-16.67))/1000,.033);
  previousTime=now;
  const t=(now-start)/1000;
  const stirring=active && now-lastInput<140;
  for(let i=0;i<nodes.length;i++){
    const n=nodes[i], leader=i===0?target:nodes[i-1];
    // Soft springs hold old positions briefly; damping leaves a small rebound.
    const stiffness=i===0?42:17;
    const damping=i===0?8:6.4;
    n.vx+=(leader.x-n.x)*stiffness*dt;
    n.vy+=(leader.y-n.y)*stiffness*dt;
    n.vx*=Math.exp(-damping*dt);n.vy*=Math.exp(-damping*dt);
    n.x+=n.vx*dt;n.y+=n.vy*dt;
    const speed=Math.hypot(n.vx*innerWidth/innerHeight,n.vy);
    const desired=stirring?1:0;
    n.energy+=(desired-n.energy)*(1-Math.exp(-dt*(stirring?5:.19)));
    const spread=(1-n.energy)*.045;
    packed[i*4]=n.x+Math.sin(t*.34+i*2.4)*(.009+spread)*n.energy;
    packed[i*4+1]=n.y+Math.cos(t*.29+i*1.9)*(.012+spread)*n.energy;
    packed[i*4+2]=(.095+spread+Math.min(speed,.8)*.018)*(1-i*.025);
    packed[i*4+3]=n.energy*(.28-i*.009);
  }
  gl.uniform2f(resLoc,canvas.width,canvas.height);
  gl.uniform4fv(nodesLoc,packed);gl.uniform1f(timeLoc,t);
  gl.drawArrays(gl.TRIANGLES,0,6);requestAnimationFrame(render);
}
requestAnimationFrame(render);
}
