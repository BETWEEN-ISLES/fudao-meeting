(() => {
  'use strict';
  const canvas=document.querySelector('#flight'),ctx=canvas.getContext('2d');
  const panel=document.querySelector('#game-panel'),title=document.querySelector('#panel-title'),description=document.querySelector('#panel-description');
  const startButton=document.querySelector('#start'),pauseButton=document.querySelector('#pause');
  const scoreLabel=document.querySelector('#score'),bestLabel=document.querySelector('#best'),status=document.querySelector('#game-status');
  const E=window.IslandFlight,H=E.HEIGHT;
  if(!ctx){description.textContent='瀏覽器無法開啟遊戲畫面，請改用其他瀏覽器。';startButton.disabled=true;return;}
  let W=960,game,scale=1,dpr=1,last=0,accumulator=0,sceneTime=0,best=0,shownState='ready',assetsReady=false;
  try{best=Math.max(0,Number(localStorage.getItem('between-islands-flight-best'))||0);}catch{}
  bestLabel.textContent=String(best);
  const sprites={};
  const paths={up:'assets/flight/flap.png',glide:'assets/flight/glide.png',over:'assets/flight/fallen.png'};
  const loading=Object.entries(paths).map(([key,path])=>new Promise(resolve=>{
    const img=new Image();img.onload=()=>{sprites[key]=img;resolve(true);};img.onerror=()=>resolve(false);img.src=path;
  }));
  startButton.disabled=true;startButton.textContent='載入羽翼精靈…';
  Promise.all(loading).then(results=>{
    assetsReady=results.every(Boolean);
    startButton.disabled=!assetsReady;
    startButton.textContent=assetsReady?'開始飛行 ↗':'角色載入失敗';
    if(!assetsReady)description.textContent='角色圖檔尚未載入，請確認 assets/flight 資料夾已一併上傳，再重新整理。';
  });
  function resize(){
    const nextWidth=Math.max(320,Math.round(H*canvas.clientWidth/canvas.clientHeight));
    dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(canvas.clientWidth*dpr);canvas.height=Math.round(canvas.clientHeight*dpr);
    scale=canvas.height/H;
    if(!game||Math.abs(nextWidth-W)>5){W=nextWidth;game=E.create(Math.random,W);shownState='ready';sync();}
  }
  function sync(){
    scoreLabel.textContent=String(game.score);
    pauseButton.disabled=!['playing','paused'].includes(game.state);
    pauseButton.textContent=game.state==='paused'?'繼續 ▷':'暫停 Ⅱ';
    panel.hidden=game.state==='playing';
    if(game.state==='over'){
      if(game.score>best){best=game.score;try{localStorage.setItem('between-islands-flight-best',String(best));}catch{}}
      bestLabel.textContent=String(best);title.textContent='在這座島，歇一下。';description.textContent=`這次穿越 ${game.score} 座浮島。調整節奏，再展開一次旅程。`;startButton.textContent='重新挑戰 ↗';
      status.textContent=`挑戰結束，獲得 ${game.score} 分，最佳 ${best} 分。`;
    }else if(game.state==='paused'){
      title.textContent='讓風，等你一下。';description.textContent='準備好了，再繼續向前飛。';startButton.textContent='繼續飛行 ▷';status.textContent='遊戲已暫停。';
    }else if(game.state==='ready'){
      title.textContent='準備起飛了嗎？';description.textContent='點擊畫面、輕觸螢幕或按空白鍵，讓羽翼精靈振翅上升。';startButton.textContent=assetsReady?'開始飛行 ↗':'載入羽翼精靈…';
    }
  }
  function action(){
    if(!assetsReady)return;
    if(game.state==='paused')game.resume();
    else {if(game.state!=='playing')game.reset();game.flap();}
    accumulator=0;last=0;shownState=game.state;sync();canvas.focus({preventScroll:true});
  }
  function pause(){if(game.state==='playing')game.pause();else if(game.state==='paused')game.resume();last=0;accumulator=0;shownState=game.state;sync();}
  startButton.addEventListener('click',action);
  pauseButton.addEventListener('click',pause);
  canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();if(game.state==='playing')game.flap();else if(game.state==='ready')action();});
  document.addEventListener('keydown',event=>{
    if(event.target.closest('button,a,input,textarea,select'))return;
    if(['Space','ArrowUp'].includes(event.code)){event.preventDefault();if(event.repeat)return;if(game.state==='playing')game.flap();else if(game.state!=='over')action();}
    if(event.code==='KeyP'&&!event.repeat)pause();
  });
  function autoPause(){if(game.state==='playing'){game.pause();shownState=game.state;sync();}last=0;accumulator=0;}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause();});window.addEventListener('blur',autoPause);
  window.addEventListener('resize',resize);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  function cloud(x,y,size,opacity){ctx.fillStyle=`rgba(255,252,236,${opacity})`;ctx.beginPath();ctx.ellipse(x,y,size,16,0,0,Math.PI*2);ctx.ellipse(x-size*.32,y-12,size*.5,21,0,0,Math.PI*2);ctx.ellipse(x+size*.23,y-14,size*.43,25,0,0,Math.PI*2);ctx.fill();}
  function distantIsland(x,y,size,alpha){
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.scale(size,size);
    ctx.fillStyle='#8caeab';ctx.beginPath();ctx.moveTo(-70,0);ctx.lineTo(65,0);ctx.lineTo(28,90);ctx.lineTo(8,125);ctx.lineTo(-18,70);ctx.closePath();ctx.fill();
    ctx.fillStyle='#a9c6a1';ctx.beginPath();ctx.ellipse(-2,0,68,13,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#d7e2cb';ctx.fillRect(-22,-37,8,35);ctx.fillRect(12,-52,8,50);ctx.fillRect(-22,-40,42,8);
    ctx.strokeStyle='#85a59a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(15,15);ctx.bezierCurveTo(0,40,40,25,12,64);ctx.stroke();ctx.restore();
  }
  function background(){
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#a9d3e8');sky.addColorStop(.6,'#d9eeeb');sky.addColorStop(1,'#f5f1db');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    const sun=ctx.createRadialGradient(W*.25,60,5,W*.25,60,280);sun.addColorStop(0,'#fff9dfb3');sun.addColorStop(1,'#fff9df00');ctx.fillStyle=sun;ctx.fillRect(0,0,W,H);
    const drift=(reduced.matches&&game.state!=='playing')?0:sceneTime;
    for(let i=0;i<6;i++){const span=W+280,x=((i*249-drift*10)%span+span)%span-100;cloud(x,85+i%3*95,65+i%2*25,.55);}
    for(let i=0;i<4;i++){const span=W+320,x=((i*330+160-drift*17)%span+span)%span-130;distantIsland(x,240+i%2*150,.55+i%3*.2,.27);}
    ctx.fillStyle='#f2f1db66';ctx.fillRect(0,H-48,W,48);
  }
  function rock(o,top){
    const points=E.polygon(o,top);ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
    const fill=ctx.createLinearGradient(o.x,0,o.x+o.width,0);fill.addColorStop(0,'#72948c');fill.addColorStop(.45,'#a8b6a0');fill.addColorStop(1,'#718e83');ctx.fillStyle=fill;ctx.fill();
    ctx.save();ctx.clip();ctx.strokeStyle='#557f7266';ctx.lineWidth=3;
    for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(o.x+o.width*i/5,0);ctx.lineTo(o.x+o.width*(i-.5)/5,H);ctx.stroke();}ctx.restore();
    const edge=top?o.center-o.gap/2:o.center+o.gap/2;
    ctx.strokeStyle='#bdd28c';ctx.lineWidth=8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(points[0][0]+3,points[0][1]);ctx.lineTo(points[1][0],points[1][1]+(top?-4:4));ctx.lineTo(points[2][0],points[2][1]+(top?-4:4));ctx.lineTo(points[3][0]-3,points[3][1]);ctx.stroke();
    ctx.strokeStyle='#66996e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(o.x+o.width*.8,edge+(top?-20:20));ctx.bezierCurveTo(o.x+o.width*.5,edge+(top?-45:45),o.x+o.width*.95,edge+(top?-55:55),o.x+o.width*.65,edge+(top?-84:84));ctx.stroke();
  }
  function character(){
    const b=game.bird,img=sprites[game.state==='over'?'over':b.flap>0?'up':'glide'];
    if(!img)return;
    const idle=game.state==='ready'&&!reduced.matches?Math.sin(sceneTime*2)*6:0;
    ctx.save();ctx.translate(b.x,b.y+idle);ctx.rotate(game.state==='over'?.22:Math.max(-.28,Math.min(.48,b.vy/950)));
    ctx.drawImage(img,-60,-40,120,80);ctx.restore();
  }
  function render(now){
    const dt=last?Math.min((now-last)/1000,.05):0;last=now;
    if(game.state==='playing'){
      sceneTime+=dt;accumulator+=dt;
      while(accumulator>=1/120&&game.state==='playing'){game.step(1/120);accumulator-=1/120;}
      if(scoreLabel.textContent!==String(game.score))scoreLabel.textContent=String(game.score);
    }else if(game.state==='ready')sceneTime+=dt;
    if(game.state!==shownState){shownState=game.state;sync();}
    ctx.setTransform(scale,0,0,scale,0,0);background();game.obstacles.forEach(o=>{rock(o,true);rock(o,false);});character();
    window.requestAnimationFrame(render);
  }
  resize();window.requestAnimationFrame(render);
})();
