(() => {
  'use strict';
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const rules=document.querySelector('#game-rules'),confirm=document.querySelector('#confirm-rules');
  let acknowledged=false,sound=true,audio=null,origin=null,praiseLayer=null;
  const effects=new WeakMap();
  try{sound=localStorage.getItem('bridge-sound')!=='off';}catch{}
  const soundButton=document.querySelector('#toggle-game-sound');
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
      effects.set(board,{toast,timer:0,shake:0,streak:0,praise:0,bumping:[],fallback:null});
    }
    return effects.get(board);
  }
  function show(board,text,kind){
    const fx=instance(board);clearTimeout(fx.timer);fx.toast.textContent=text;fx.toast.className=`feedback-toast ${kind}`;
    const rect=board.getBoundingClientRect(),width=fx.toast.offsetWidth,height=fx.toast.offsetHeight;
    const margin=16,screenWidth=window.innerWidth,screenHeight=window.innerHeight;
    const preferLeft=board.id==='p1-board';
    let left,top,direction;
    if(preferLeft&&rect.left>=width+margin*2){left=rect.left-width-margin;top=rect.top+rect.height*.43;direction=-70;}
    else if(screenWidth-rect.right>=width+margin*2){left=rect.right+margin;top=rect.top+rect.height*.43;direction=70;}
    else if(rect.left>=width+margin*2){left=rect.left-width-margin;top=rect.top+rect.height*.43;direction=-70;}
    else{left=rect.left+(rect.width-width)/2;top=rect.top-height-12;direction=preferLeft?-45:45;}
    fx.toast.style.left=`${Math.max(margin,Math.min(screenWidth-width-margin,left))}px`;
    fx.toast.style.top=`${Math.max(margin,Math.min(screenHeight-height-margin,top))}px`;
    fx.toast.style.setProperty('--praise-entry',`${direction}px`);
    void fx.toast.offsetWidth;fx.toast.classList.add('is-visible');
    fx.timer=setTimeout(()=>fx.toast.classList.remove('is-visible'),kind==='win'?1700:1250);
  }
  function invalid(board){
    const fx=instance(board);fx.streak=0;tone('error');fx.toast.classList.remove('is-visible');
    fx.bumping.forEach(cell=>cell.classList.remove('preview-bump'));
    if(fx.fallback)fx.fallback.classList.remove('piece-error');
    if(!reduced.matches){
      fx.bumping=Array.from(board.querySelectorAll('.preview-valid,.preview-invalid'));
      clearTimeout(fx.shake);
      if(fx.bumping.length){void board.offsetWidth;fx.bumping.forEach(cell=>cell.classList.add('preview-bump'));}
      else{
        fx.fallback=board.parentElement.querySelector('.piece-option[aria-pressed="true"]')||document.querySelector('.piece-option[aria-pressed="true"]');
        if(fx.fallback){void fx.fallback.offsetWidth;fx.fallback.classList.add('piece-error');}
      }
      fx.shake=setTimeout(()=>{fx.bumping.forEach(cell=>cell.classList.remove('preview-bump'));if(fx.fallback)fx.fallback.classList.remove('piece-error');},460);
      if(navigator.vibrate)try{navigator.vibrate(35);}catch{}
    }
  }
  function success(board,{cleared=0,won=false,points=40}={}){
    const fx=instance(board);fx.streak++;
    const phrases=won?['Bridge Complete!','You Did It!','Wonderful Bridge!']:cleared>1?['Amazing!','Incredible!','Outstanding!','Spectacular!']:cleared?['Excellent!','Brilliant!','Beautiful!','Fantastic!']:['Good!','Nice!','Well Done!','Lovely!','Great Move!','Keep It Up!','Smooth!','Wonderful!'];
    const phrase=phrases[fx.praise++%phrases.length];
    tone(won?'win':cleared?'clear':'place');show(board,`${phrase} ＋${points}`,won?'win':cleared?'clear':'good');
  }
  function reset(board){
    const fx=effects.get(board);if(!fx)return;clearTimeout(fx.timer);clearTimeout(fx.shake);fx.streak=0;fx.praise=0;fx.toast.classList.remove('is-visible');fx.bumping.forEach(cell=>cell.classList.remove('preview-bump'));if(fx.fallback)fx.fallback.classList.remove('piece-error');
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
