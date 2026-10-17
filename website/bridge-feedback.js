(() => {
  'use strict';
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const rules=document.querySelector('#game-rules'),confirm=document.querySelector('#confirm-rules');
  let acknowledged=false,sound=true,audio=null,origin=null;
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
      const toast=document.createElement('div');toast.className='feedback-toast';toast.setAttribute('aria-hidden','true');host.append(toast);
      effects.set(board,{toast,timer:0,shake:0,streak:0});
    }
    return effects.get(board);
  }
  function show(board,text,kind){
    const fx=instance(board);clearTimeout(fx.timer);fx.toast.textContent=text;fx.toast.className=`feedback-toast is-visible ${kind}`;
    fx.timer=setTimeout(()=>fx.toast.classList.remove('is-visible'),kind==='win'?1400:850);
  }
  function invalid(board){
    const fx=instance(board);fx.streak=0;tone('error');show(board,'再試一次','error');
    if(!reduced.matches){
      board.classList.remove('placement-shake');void board.offsetWidth;board.classList.add('placement-shake');
      clearTimeout(fx.shake);fx.shake=setTimeout(()=>board.classList.remove('placement-shake'),280);
      if(navigator.vibrate)try{navigator.vibrate(35);}catch{}
    }
  }
  function success(board,{cleared=0,won=false,points=40}={}){
    const fx=instance(board);fx.streak++;
    const phrase=won?'Bridge Complete!':cleared>1?'Amazing!':cleared?'Excellent!':fx.streak>=3?'Great!':'Good!';
    tone(won?'win':cleared?'clear':'place');show(board,`${phrase} ＋${points}`,won?'win':cleared?'clear':'good');
  }
  function reset(board){
    const fx=effects.get(board);if(!fx)return;clearTimeout(fx.timer);clearTimeout(fx.shake);fx.streak=0;fx.toast.classList.remove('is-visible');board.classList.remove('placement-shake');
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
