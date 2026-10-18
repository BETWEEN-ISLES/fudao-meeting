(() => {
  'use strict';
  const coarse=window.matchMedia('(pointer: coarse)');
  let touch=coarse.matches;
  function setTouch(value){touch=value;document.documentElement.classList.toggle('bridge-touch-mode',value);}
  setTouch(touch);
  window.BridgeTouch={get active(){return touch},attach({board,tray,getShape,getType,canPlay,onSelect,onPreview,onDrop,onMode}){
    let drag=null,ghost=null,frame=0,lastClick=0,lastPreview=undefined;
    const listen=(target,type,fn)=>target.addEventListener(type,fn,{capture:true,passive:false});
    function geometry(){const cells=board.querySelectorAll('[data-cell]'),first=cells[0].getBoundingClientRect(),next=cells[1].getBoundingClientRect(),below=cells[8].getBoundingClientRect();return{first,sx:next.left-first.left,sy:below.top-first.top};}
    function update(){
      if(!drag||!ghost)return;
      const {first,sx,sy}=geometry(),shape=getShape(),w=Math.max(...shape.map(p=>p[0]))+1,h=Math.max(...shape.map(p=>p[1]))+1;
      const left=drag.x-w*sx/2,top=drag.y-h*sy-24;
      ghost.style.transform=`translate(${left}px,${top}px)`;
      const x=Math.round((left-first.left)/sx),y=Math.round((top-first.top)/sy);
      drag.index=x>=0&&x<8&&y>=0&&y<8?y*8+x:null;
      if(lastPreview!==drag.index){lastPreview=drag.index;onPreview(drag.index);}
    }
    function scroll(){
      if(!drag)return;
      const amount=drag.y<85?-10:drag.y>window.innerHeight-65?10:0;
      if(amount)window.scrollBy(0,amount);
      update();frame=window.requestAnimationFrame(scroll);
    }
    function clear(){
      window.cancelAnimationFrame(frame);frame=0;
      if(ghost)ghost.remove();ghost=null;
      if(drag&&tray.hasPointerCapture(drag.id))tray.releasePointerCapture(drag.id);
      drag=null;lastPreview=null;onPreview(null);
    }
    listen(tray,'pointerdown',event=>{
      if(event.pointerType!=='touch'&&event.pointerType!=='pen'){setTouch(false);if(onMode)onMode(false);return;}
      if(drag){event.preventDefault();event.stopImmediatePropagation();return;}
      const option=event.target.closest('[data-slot]');if(!option||!canPlay())return;
      event.preventDefault();event.stopImmediatePropagation();setTouch(true);if(onMode)onMode(true);
      onSelect(Number(option.dataset.slot));
      const shape=getShape(),{first,sx,sy}=geometry();
      ghost=document.createElement('div');ghost.className='touch-piece-ghost';ghost.setAttribute('aria-hidden','true');
      for(const [x,y]of shape){const part=document.createElement('span');part.className=`touch-piece-cell color-${getType()+1}`;Object.assign(part.style,{left:`${x*sx}px`,top:`${y*sy}px`,width:`${first.width}px`,height:`${first.height}px`});ghost.append(part);}
      document.body.append(ghost);drag={id:event.pointerId,x:event.clientX,y:event.clientY,index:null};
      tray.setPointerCapture(event.pointerId);update();frame=window.requestAnimationFrame(scroll);
    });
    listen(tray,'pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;event.preventDefault();event.stopImmediatePropagation();drag.x=event.clientX;drag.y=event.clientY;update();});
    listen(tray,'pointerup',event=>{
      if(!drag||drag.id!==event.pointerId)return;event.preventDefault();event.stopImmediatePropagation();drag.x=event.clientX;drag.y=event.clientY;update();const index=drag.index;lastClick=Date.now();clear();if(index!==null)onDrop(index);
    });
    listen(tray,'pointercancel',event=>{if(drag){event.stopImmediatePropagation();clear();}});
    listen(tray,'click',event=>{if(Date.now()-lastClick<650){event.preventDefault();event.stopImmediatePropagation();}});
    window.addEventListener('blur',clear);
    return {cancel:clear};
  }};
})();
