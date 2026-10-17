(() => {
  'use strict';
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const rules=document.querySelector('#game-rules'),confirm=document.querySelector('#confirm-rules');
  let acknowledged=false,sound=true,audio=null,origin=null,praiseLayer=null;
  const effects=new WeakMap();
  try{sound=localStorage.getItem('bridge-sound')!=='off';}catch{}
  const soundButton=document.querySelector('#toggle-game-sound');
  function motion(node,frames,duration,finished){
    const transforms=frames.map(frame=>({transform:`translate(${frame.x||0}px,${frame.y||0}px) rotate(${frame.angle||0}deg)`,opacity:frame.opacity===undefined?1:frame.opacity}));
    if(typeof node.animate==='function'){
      const animation=node.animate(transforms,{duration,easing:'linear'});
      animation.onfinish=()=>{if(finished)finished();};
      return()=>animation.cancel();
    }
    // Frame-based fallback also works when CSS animations are disabled.
    let request=0,start;
    function step(now){
      if(start===undefined)start=now;
      const progress=Math.min((now-start)/duration,1),position=progress*(frames.length-1),index=Math.min(frames.length-2,Math.floor(position)),t=position-index;
      const a=frames[index],b=frames[index+1],blend=key=>(a[key]||0)+((b[key]||0)-(a[key]||0))*t;
      node.style.transform=`translate(${blend('x')}px,${blend('y')}px) rotate(${blend('angle')}deg)`;
      node.style.opacity=String((a.opacity===undefined?1:a.opacity)+((b.opacity===undefined?1:b.opacity)-(a.opacity===undefined?1:a.opacity))*t);
      if(progress<1)request=window.requestAnimationFrame(step);else{node.style.transform='';node.style.opacity='';if(finished)finished();}
    }
    request=window.requestAnimationFrame(step);
    return()=>{window.cancelAnimationFrame(request);node.style.transform='';node.style.opacity='';};
  }
  function updateSound(){if(soundButton){soundButton.textContent=`音效：${sound?'開':'關'}`;soundButton.setAttribute('aria-pressed',String(sound));}}
  function unlock(){
    if(!sound)return;
    try{const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;if(!audio)audio=new Context();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{}
  }
  function tone(kind){
    if(!sound)return;unlock();if(!audio||audio.state!=='running')return;
    try{
      const notes=kind==='win'?[523.25,659.25,783.99,1046.5]:kind==='clear'?[523.25,659.25,880]:kind==='error'?[155,130.81]:[440,587.33];
      notes.forEach((frequency,index)=>{
        const oscillator=audio.createOscillator(),gain=audio.createGain(),time=audio.currentTime+index*.075;
        oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,time);gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(kind==='error'?.025:.045,time+.01);gain.gain.exponentialRampToValueAtTime(.0001,time+.16);
        oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(time);oscillator.stop(time+.18);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      });
    }catch{}
  }
  function instance(board){
    if(!effects.has(board)){
      const host=board.parentElement;host.classList.add('feedback-host');
      if(!praiseLayer){praiseLayer=document.createElement('div');praiseLayer.className='feedback-layer';praiseLayer.setAttribute('aria-hidden','true');document.body.append(praiseLayer);}
      const toast=document.createElement('div');toast.className='feedback-toast';toast.setAttribute('aria-hidden','true');praiseLayer.append(toast);
      effects.set(board,{toast,timer:0,shake:0,streak:0,praise:0,bumping:[],fallback:null,flight:null,ghost:null,ghostMotion:null});
    }
    return effects.get(board);
  }
  function show(board,text,kind){
    const fx=instance(board);clearTimeout(fx.timer);fx.toast.textContent=text;fx.toast.className=`feedback-toast ${kind}`;
    const rect=board.getBoundingClientRect(),width=fx.toast.offsetWidth,height=fx.toast.offsetHeight;
    const margin=16,screenWidth=window.innerWidth,screenHeight=window.innerHeight;
    const preferLeft=board.id!=='p2-board';
    let left,top;
    if(preferLeft&&rect.left>=width+margin*2){left=rect.left-width-margin;top=rect.top+rect.height*.43;}
    else if(!preferLeft&&screenWidth-rect.right>=width+margin*2){left=rect.right+margin;top=rect.top+rect.height*.43;}
    else{left=rect.left+(rect.width-width)/2;top=rect.top-height-12;}
    left=Math.max(margin,Math.min(screenWidth-width-margin,left));
    fx.toast.style.left=`${left}px`;
    fx.toast.style.top=`${Math.max(margin,Math.min(screenHeight-height-margin,top))}px`;
    if(fx.flight)fx.flight();
    fx.toast.classList.add('is-visible');
    const entry=reduced.matches?(preferLeft?-50:50):(preferLeft?-left-width-24:screenWidth-left+24);
    fx.flight=motion(fx.toast,[{x:entry,y:0,angle:preferLeft?-7:7,opacity:0},{x:entry*.23,y:0,angle:1,opacity:1},{x:preferLeft?8:-8,y:0,angle:-3,opacity:1},{x:0,y:0,angle:-3,opacity:1}],reduced.matches?240:620);
    fx.timer=setTimeout(()=>fx.toast.classList.remove('is-visible'),kind==='win'?1700:1250);
  }
  function invalid(board){
    const fx=instance(board);fx.streak=0;tone('error');if(fx.flight)fx.flight();fx.toast.classList.remove('is-visible');
    fx.bumping.forEach(cell=>cell.classList.remove('preview-bump'));
    if(fx.fallback)fx.fallback.classList.remove('piece-error');
    fx.bumping=Array.from(board.querySelectorAll('.preview-valid,.preview-invalid'));
    if(fx.ghostMotion)fx.ghostMotion();if(fx.ghost)fx.ghost.remove();
    const group=document.createElement('div');group.className='placement-ghost-group';group.setAttribute('aria-hidden','true');
    let targets=fx.bumping;
    if(!targets.length){const candidate=board.parentElement.querySelector('.piece-option[aria-pressed="true"]')||document.querySelector('.piece-option[aria-pressed="true"]');targets=candidate?[candidate]:[];}
    for(const cell of targets){
      const rect=cell.getBoundingClientRect(),outline=document.createElement('div');outline.className='placement-ghost';
      Object.assign(outline.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});group.append(outline);
    }
    praiseLayer.append(group);fx.ghost=group;
    const amplitude=reduced.matches?3:8;
    fx.ghostMotion=motion(group,[{x:0},{x:-amplitude},{x:amplitude},{x:-amplitude*.8},{x:amplitude*.65},{x:-amplitude*.4},{x:amplitude*.25},{x:0}],reduced.matches?280:460,()=>{group.remove();if(fx.ghost===group)fx.ghost=null;});
    if(!reduced.matches&&navigator.vibrate)try{navigator.vibrate(35);}catch{}
  }
  function success(board,{cleared=0,won=false,points=40}={}){
    const fx=instance(board);fx.streak++;
    if(fx.ghostMotion)fx.ghostMotion();if(fx.ghost)fx.ghost.remove();fx.ghost=null;
    const phrases=won?['Bridge Complete!','You Did It!','Wonderful Bridge!']:cleared>1?['Amazing!','Incredible!','Outstanding!','Spectacular!']:cleared?['Excellent!','Brilliant!','Beautiful!','Fantastic!']:['Good!','Nice!','Well Done!','Lovely!','Great Move!','Keep It Up!','Smooth!','Wonderful!'];
    const phrase=phrases[fx.praise++%phrases.length];
    tone(won?'win':cleared?'clear':'place');show(board,`${phrase} ＋${points}`,won?'win':cleared?'clear':'good');
  }
  function reset(board){
    const fx=effects.get(board);if(!fx)return;clearTimeout(fx.timer);clearTimeout(fx.shake);fx.streak=0;fx.praise=0;fx.toast.classList.remove('is-visible');if(fx.flight)fx.flight();if(fx.ghostMotion)fx.ghostMotion();if(fx.ghost)fx.ghost.remove();fx.ghost=null;fx.bumping.forEach(cell=>cell.classList.remove('preview-bump'));if(fx.fallback)fx.fallback.classList.remove('piece-error');
  }
  window.BridgeFeedback={invalid,success,reset,get confirmed(){return acknowledged;}};
  if(soundButton)soundButton.addEventListener('click',()=>{sound=!sound;try{localStorage.setItem('bridge-sound',sound?'on':'off');}catch{}updateSound();if(sound)tone('place');});
  updateSound();
  if(!rules||!confirm)return;
  function openRules(){origin=document.activeElement;confirm.textContent=acknowledged?'返回遊戲':'確認，開始遊戲';rules.showModal();}
  const help=document.querySelector('#show-game-rules');if(help)help.addEventListener('click',openRules);
  rules.addEventListener('cancel',event=>{if(!acknowledged)event.preventDefault();});
  rules.addEventListener('close',()=>{if(acknowledged&&origin&&origin.isConnected)origin.focus({preventScroll:true});});
  confirm.addEventListener('click',()=>{
    const initial=!acknowledged;acknowledged=true;unlock();rules.close();
    document.dispatchEvent(new CustomEvent('bridge:rules-confirm',{detail:{initial}}));
  });
  openRules();
})();
