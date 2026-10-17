(() => {
  'use strict';
  const E=window.IslandBridge,game=E.create();
  const board=document.querySelector('#bridge-board'),tray=document.querySelector('#piece-tray');
  const message=document.querySelector('#bridge-message'),result=document.querySelector('#bridge-result');
  const undoButton=document.querySelector('#undo-piece'),rotateButton=document.querySelector('#rotate-piece');
  const cells=[],names=['長條','正方形','T 型','L 型','反 L 型','S 型','Z 型'];
  let selected=0,turns=0,preview=null,cursor=36,best=0,drag=null,suppressClick=false;
  try{const value=Number(localStorage.getItem('between-islands-bridge-best-v2'));if(Number.isFinite(value)&&value>0)best=Math.floor(value);}catch{}
  document.querySelector('#bridge-best').textContent=String(best);
  function shapeFor(slot=selected){
    let shape=E.SHAPES[game.tray[slot]];
    for(let r=0;r<(slot===selected?turns:0);r++)shape=E.rotate(shape);
    return shape;
  }
  function paintPreview(index){
    preview=index;
    for(const cell of cells)cell.classList.remove('preview-valid','preview-invalid');
    if(index===null||game.state!=='playing')return;
    const x=index%E.COLS,y=Math.floor(index/E.COLS),shape=shapeFor(),valid=E.fits(game.board,shape,x,y);
    for(const [dx,dy]of shape){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<E.COLS&&ny>=0&&ny<E.ROWS)cells[ny*E.COLS+nx].classList.add(valid?'preview-valid':'preview-invalid');}
  }
  function makeTray(){
    tray.replaceChildren();
    game.tray.forEach((type,slot)=>{
      const option=document.createElement('button');option.type='button';option.className='piece-option';option.dataset.slot=String(slot);
      option.setAttribute('aria-pressed',String(selected===slot));option.setAttribute('aria-label',`方塊 ${slot+1}，${names[type]}，${selected===slot?'已選取':'選擇此方塊'}`);
      option.disabled=game.state!=='playing';
      const miniature=document.createElement('span');miniature.className='mini-piece';miniature.setAttribute('aria-hidden','true');
      for(const [x,y]of shapeFor(slot)){const part=document.createElement('span');part.className=`mini-cell color-${type+1}`;part.style.gridColumn=String(x+1);part.style.gridRow=String(y+1);miniature.append(part);}
      const caption=document.createElement('span');caption.textContent=`方塊 ${slot+1} · ${names[type]}`;option.append(miniature,caption);tray.append(option);
    });
  }
  function render(){
    const values=game.board,rows=game.rows,path=new Set(game.path);
    cells.forEach((cell,index)=>{
      cell.className='cell';const filled=values[index];
      if(filled)cell.classList.add('filled',`color-${filled}`);
      if(path.has(index))cell.classList.add('route');
      cell.setAttribute('aria-label',`第 ${Math.floor(index/E.COLS)+1} 列，第 ${index%E.COLS+1} 欄，${filled?'已有方塊':'空格'}`);
      cell.tabIndex=index===cursor?0:-1;
    });
    document.querySelector('#bridge-score').textContent=String(game.score);
    undoButton.disabled=!game.canUndo;rotateButton.disabled=game.state!=='playing';
    makeTray();paintPreview(preview);
  }
  function select(slot){
    if(game.state!=='playing')return;
    selected=slot;turns=0;makeTray();paintPreview(preview);
    message.textContent=`已選方塊 ${slot+1}（${names[game.tray[slot]]}），點棋盤放置，或按 R 旋轉。`;
  }
  function rotate(){
    if(game.state!=='playing')return;
    turns=(turns+1)%4;makeTray();paintPreview(preview);message.textContent=`方塊 ${selected+1} 已旋轉 ${turns*90} 度。`;
  }
  function showResult(){
    const won=game.state==='won';
    if(won&&game.score>best){best=game.score;try{localStorage.setItem('between-islands-bridge-best-v2',String(best));}catch{}document.querySelector('#bridge-best').textContent=String(best);}
    document.querySelector('#result-title').textContent=won?'島嶼，連上了。':'這條路，先到這裡。';
    document.querySelector('#result-description').textContent=won?'已從起點連到終點！綠色框線標示出你的通關路線。':'目前三個方塊旋轉後都無處可放。換個安排，再試一次。';
    document.querySelector('#result-total').textContent=`${game.score} 分`;
    const breakdown=document.querySelector('#result-breakdown');breakdown.replaceChildren();
    const empty=game.board.filter(v=>!v).length;
    for(const [label,value]of [[`放置 ${game.placed} 塊`,game.placed*40],[`完成 ${game.rows.length} 橫排（含多排獎勵）`,game.rowPoints],['成功連橋',won?500:0],[`空格獎勵${won?`（${empty} 格）`:''}`,won?empty*10:0]]){
      const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=`＋${value}`;row.append(dt,dd);breakdown.append(row);
    }
    message.textContent=won?`搭橋成功，總分 ${game.score} 分。`:`本局結束，總分 ${game.score} 分。`;
    result.showModal();
  }
  function place(index){
    if(game.state!=='playing'){message.textContent='本局已結束，可以重新開始，或查看棋盤上的路線。';return;}
    const outcome=game.place(selected,turns,index%E.COLS,Math.floor(index/E.COLS));
    if(!outcome.ok){message.textContent='這個位置放不下，請避開已有方塊，或旋轉後再試。';return;}
    turns=0;preview=null;cursor=index;render();
    message.textContent=outcome.completed?`消除 ${outcome.completed} 橫排！本次加 ${40+outcome.gained} 分；請用剩下的方塊搭橋。`:'已放置方塊，＋40 分。下一塊已準備好。';
    if(outcome.cleared.length){for(const r of outcome.cleared)for(let x=0;x<6;x++)cells[r*6+x].classList.add('row-cleared');setTimeout(()=>{for(const cell of cells)cell.classList.remove('row-cleared');},400);}
    if(game.state!=='playing')showResult();
  }
  for(let i=0;i<E.COLS*E.ROWS;i++){
    const cell=document.createElement('button');cell.type='button';cell.className='cell';cell.dataset.cell=String(i);cells.push(cell);board.append(cell);
  }
  const hitCell=target=>target&&target.closest?target.closest('[data-cell]'):null;
  board.addEventListener('click',event=>{const cell=hitCell(event.target);if(cell)place(Number(cell.dataset.cell));});
  board.addEventListener('pointermove',event=>{const cell=hitCell(event.target);if(cell)paintPreview(Number(cell.dataset.cell));});
  board.addEventListener('pointerleave',()=>paintPreview(null));
  board.addEventListener('focusin',event=>{const cell=hitCell(event.target);if(cell){cursor=Number(cell.dataset.cell);cells.forEach((c,i)=>c.tabIndex=i===cursor?0:-1);paintPreview(cursor);}});
  board.addEventListener('focusout',event=>{if(!board.contains(event.relatedTarget))paintPreview(null);});
  board.addEventListener('keydown',event=>{
    if(event.code==='KeyR'){event.preventDefault();rotate();return;}
    const shifts={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    if(!shifts[event.key])return;
    event.preventDefault();const [dx,dy]=shifts[event.key],x=Math.max(0,Math.min(5,cursor%6+dx)),y=Math.max(0,Math.min(6,Math.floor(cursor/6)+dy));cursor=y*6+x;cells[cursor].focus();
  });
  tray.addEventListener('click',event=>{if(suppressClick)return;const option=event.target.closest('[data-slot]');if(option)select(Number(option.dataset.slot));});
  tray.addEventListener('pointerdown',event=>{
    const option=event.target.closest('[data-slot]');if(!option||game.state!=='playing'||event.button!==0)return;
    select(Number(option.dataset.slot));drag={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};tray.setPointerCapture(event.pointerId);
  });
  tray.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    drag.moved=drag.moved||Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>7;
    if(drag.moved){const cell=hitCell(document.elementFromPoint(event.clientX,event.clientY));paintPreview(cell?Number(cell.dataset.cell):null);}
  });
  tray.addEventListener('pointerup',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const moved=drag.moved;drag=null;if(tray.hasPointerCapture(event.pointerId))tray.releasePointerCapture(event.pointerId);
    if(moved){suppressClick=true;setTimeout(()=>suppressClick=false,250);const cell=hitCell(document.elementFromPoint(event.clientX,event.clientY));if(cell)place(Number(cell.dataset.cell));else paintPreview(null);}
  });
  tray.addEventListener('pointercancel',()=>{drag=null;paintPreview(null);});
  rotateButton.addEventListener('click',rotate);
  undoButton.addEventListener('click',()=>{if(game.undo()){turns=0;preview=null;render();message.textContent='已撤回上一步，分數與候選方塊也已恢復。';}});
  document.addEventListener('keydown',event=>{if(event.code==='KeyR'&&!event.repeat&&!board.contains(event.target)&&!result.open){event.preventDefault();rotate();}});
  function restart(){if(result.open)result.close();game.reset();selected=0;turns=0;cursor=36;preview=null;render();message.textContent='新的旅程開始了。選擇方塊，再點棋盤放置。';cells[cursor].focus();}
  document.querySelector('#restart-bridge').addEventListener('click',restart);
  document.querySelector('#play-again').addEventListener('click',restart);
  document.querySelector('#close-result').addEventListener('click',()=>result.close());
  result.addEventListener('click',event=>{if(event.target===result)result.close();});
  render();
})();

