(() => {
  'use strict';
  if(!document.documentElement.classList.contains('landing-root'))return;
  const root=document.documentElement, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let lastX=null,lastY=null,lastMove=0,energy=0,current=0,frame=0,lastFrame=0;
  function clear(){energy=0;current=0;root.style.setProperty('--liquid-opacity','.62');root.style.setProperty('--island-blur','4px');root.style.setProperty('--island-visibility','0');}
  function draw(now){
    frame=0;
    if(document.hidden){clear();return;}
    const dt=lastFrame?Math.min((now-lastFrame)/1000,.05):.016;lastFrame=now;
    const idle=now-lastMove;
    const target=idle<180?energy:energy*Math.exp(-(idle-180)/1000);
    current+=(target-current)*(1-Math.exp(-dt*(target>current?4.5:1.8)));
    root.style.setProperty('--liquid-opacity',String(.62-current*.24));
    root.style.setProperty('--island-visibility',String(current<.008?0:current*.9));
    root.style.setProperty('--island-blur',`${(4-current*2).toFixed(2)}px`);
    if(current>.001 || idle<220)frame=requestAnimationFrame(draw);
    else{clear();lastFrame=0;}
  }
  function move(e){
    if(e.isPrimary===false)return;
    const now=performance.now();
    energy=0;
    if(lastX!==null){const dt=Math.max(8,now-lastMove),speed=Math.hypot(e.clientX-lastX,e.clientY-lastY)/dt;energy=Math.min(1,speed/1.8);}
    lastX=e.clientX;lastY=e.clientY;lastMove=now;
    if(!frame)frame=requestAnimationFrame(draw);
  }
  window.addEventListener('pointermove',move,{passive:true});
  window.addEventListener('pointerdown',move,{passive:true});
  window.addEventListener('blur',()=>{lastMove=0;lastX=null;if(!frame)frame=requestAnimationFrame(draw);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;clear();lastX=null;lastFrame=0;}});
  reduced.addEventListener('change',()=>{cancelAnimationFrame(frame);frame=0;clear();lastX=null;lastFrame=0;});
  clear();
})();
