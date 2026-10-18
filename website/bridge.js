(() => {
  'use strict';
  const E=window.IslandBridge,endless=new URLSearchParams(window.location.search).get('mode')==='endless',game=E.create(Math.random,{endless,allowRotation:!window.BridgeTouch.active});
  let touchControl=null;
  const scoreKey=endless?'bridge-endless-best-8':'bridge-classic-best-8';
  const board=document.querySelector('#bridge-board'),tray=document.querySelector('#piece-tray');
  const message=document.querySelector('#bridge-message'),result=document.querySelector('#bridge-result');
  const undoButton=document.querySelector('#undo-piece'),rotateButton=document.querySelector('#rotate-piece');
  const cells=[],names=['長條','正方形','T 型','L 型','反 L 型','S 型','Z 型'];
  let selected=0,turns=0,preview=null,cursor=(E.ROWS-1)*E.COLS,best=0,drag=null,suppressClick=false,ready=false;
  const FX=window.BridgeFeedback,rules=document.querySelector('#game-rules');
  try{const value=Number(localStorage.getItem(scoreKey));if(Number.isFinite(value)&&value>0)best=Math.floor(value);}catch{}
  document.querySelector('#bridge-best').textContent=String(best);
  function shapeFor(slot=selected){
    let shape=E.SHAPES[game.tray[slot]];
    for(let r=0;r<(slot===selected?turns:0);r++)shape=E.rotate(shape);
    return shape;
  }
  function paintPreview(index){
    preview=index;
    for(const cell of cells)cell.classList.remove('preview-valid','preview-invalid');
    if(index===null||!ready||game.state!=='playing')return;
    const x=index%E.COLS,y=Math.floor(index/E.COLS),shape=shapeFor(),valid=E.fits(game.board,shape,x,y);
    for(const [dx,dy]of shape){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<E.COLS&&ny>=0&&ny<E.ROWS)cells[ny*E.COLS+nx].classList.add(valid?'preview-valid':'preview-invalid');}
  }
  function makeTray(){
    tray.replaceChildren();
    game.tray.forEach((type,slot)=>{
      const option=document.createElement('button');option.type='button';option.className='piece-option';option.dataset.slot=String(slot);
      option.setAttribute('aria-pressed',String(selected===slot));option.setAttribute('aria-label',`方塊 ${slot+1}，${names[type]}，${selected===slot?'已選取':'選擇此方塊'}`);
      option.disabled=!ready||game.state!=='playing';
      const miniature=document.createElement('span');miniature.className='mini-piece';miniature.setAttribute('aria-hidden','true');
      for(const [x,y]of shapeFor(slot)){const part=document.createElement('span');part.className=`mini-cell color-${type+1}`;part.style.gridColumn=String(x+1);part.style.gridRow=String(y+1);miniature.append(part);}
      const caption=document.createElement('span');caption.textContent=`方塊 ${slot+1} · ${names[type]}`;option.append(miniature,caption);tray.append(option);
    });
  }
  function render(){
    const values=game.board,rows=game.rows,path=new Set(game.path);
    cells.forEach((cell,index)=>{
      cell.className='cell';cell.disabled=!ready;const filled=values[index];
      if(filled)cell.classList.add('filled',`color-${filled}`);
      if(path.has(index))cell.classList.add('route');
      cell.setAttribute('aria-label',`第 ${Math.floor(index/E.COLS)+1} 列，第 ${index%E.COLS+1} 欄，${filled?'已有方塊':'空格'}`);
      cell.tabIndex=index===cursor?0:-1;
    });
    document.querySelector('#bridge-score').textContent=String(game.score);
    document.querySelector('#endless-progress').textContent=`第 ${game.boards} 張棋盤 · ${game.bridges} 座橋`; 
    undoButton.disabled=!ready||!game.canUndo;rotateButton.disabled=!ready||game.state!=='playing';
    makeTray();paintPreview(preview);
  }
  function select(slot){
    if(!ready||rules.open||game.state!=='playing')return;
    selected=slot;turns=0;makeTray();paintPreview(preview);
    message.textContent=window.BridgeTouch.active?`已選方塊 ${slot+1}，拖曳到預覽位置後放開。`:`已選方塊 ${slot+1}（${names[game.tray[slot]]}），點棋盤放置，或按 R 旋轉。`;
  }
  function rotate(){
    if(!ready||rules.open||window.BridgeTouch.active||game.state!=='playing')return;
    turns=(turns+1)%4;makeTray();paintPreview(preview);message.textContent=`方塊 ${selected+1} 已旋轉 ${turns*90} 度。`;
  }
  function showEndlessResult(){
    if(game.score>best){best=game.score;try{localStorage.setItem(scoreKey,String(best));}catch{}document.querySelector('#bridge-best').textContent=String(best);}
    document.querySelector('#result-title').textContent='這趟旅程，先記在這裡。';
    document.querySelector('#result-description').textContent=`累計完成 ${game.bridges} 座橋、消除 ${game.clearedRows} 排，遊玩 ${game.boards} 張棋盤。`;
    document.querySelector('#result-total').textContent=`${game.score} 分`;
    const list=document.querySelector('#result-breakdown');list.replaceChildren();
    for(const [label,value]of [['放置方塊',game.placed*40],['消排與多排獎勵',game.rowPoints],['搭橋與空格獎勵',game.bonus]]){const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=String(value);row.append(dt,dd);list.append(row);}
    result.showModal();
  }
  function showResult(){
    if(endless){showEndlessResult();return;}
    const won=game.state==='won';
    if(won&&game.score>best){best=game.score;try{localStorage.setItem(scoreKey,String(best));}catch{}document.querySelector('#bridge-best').textContent=String(best);}
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
    if(!ready||rules.open)return;
    if(game.state!=='playing'){message.textContent='本局已結束，可以重新開始，或查看棋盤上的路線。';return;}
    const outcome=game.place(selected,turns,index%E.COLS,Math.floor(index/E.COLS));
    if(!outcome.ok){paintPreview(index);FX.invalid(board);message.textContent='無法放置：超出棋盤或與已有方塊重疊。';return;}
    turns=0;preview=null;cursor=index;render();
    FX.success(board,{cleared:outcome.completed,won:outcome.bridged,points:40+outcome.gained+outcome.bridgeBonus});
    message.textContent=outcome.completed?`消除 ${outcome.completed} 橫排！本次加 ${40+outcome.gained} 分；請用剩下的方塊搭橋。`:'已放置方塊，＋40 分。下一塊已準備好。';
    if(outcome.continued)message.textContent=outcome.bridged?`完成一座橋！累計 ${game.bridges} 座，已換新棋盤繼續。`:'棋盤已無處可放，分數保留，換新棋盤繼續。';
    if(outcome.cleared.length&&!outcome.continued){for(const r of outcome.cleared)for(let x=0;x<E.COLS;x++)cells[r*E.COLS+x].classList.add('row-cleared');setTimeout(()=>{for(const cell of cells)cell.classList.remove('row-cleared');},400);}
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
    event.preventDefault();const [dx,dy]=shifts[event.key],x=Math.max(0,Math.min(E.COLS-1,cursor%E.COLS+dx)),y=Math.max(0,Math.min(E.ROWS-1,Math.floor(cursor/E.COLS)+dy));cursor=y*E.COLS+x;cells[cursor].focus();
  });
  tray.addEventListener('click',event=>{if(suppressClick)return;const option=event.target.closest('[data-slot]');if(option)select(Number(option.dataset.slot));});
  tray.addEventListener('pointerdown',event=>{
    const option=event.target.closest('[data-slot]');if(!option||!ready||rules.open||game.state!=='playing'||event.button!==0)return;
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
  undoButton.addEventListener('click',()=>{if(ready&&!rules.open&&game.undo()){FX.reset(board);turns=0;preview=null;render();message.textContent='已撤回上一步，分數與候選方塊也已恢復。';}});
  document.addEventListener('keydown',event=>{if(event.code==='KeyR'&&!event.repeat&&!board.contains(event.target)&&!result.open){event.preventDefault();rotate();}});
  function restart(){if(!ready)return;if(touchControl)touchControl.cancel();if(result.open)result.close();FX.reset(board);game.reset();selected=0;turns=0;cursor=(E.ROWS-1)*E.COLS;preview=null;render();message.textContent='新的旅程開始了。選擇方塊，再點棋盤放置。';cells[cursor].focus();}
  document.querySelector('#restart-bridge').addEventListener('click',restart);
  document.querySelector('#play-again').addEventListener('click',restart);
  document.querySelector('#close-result').addEventListener('click',()=>result.close());
  result.addEventListener('click',event=>{if(event.target===result)result.close();});
  document.addEventListener('bridge:rules-confirm',event=>{if(event.detail.initial){ready=true;render();cells[cursor].focus();message.textContent='開始搭橋！選擇方塊，再點棋盤放置。';}});
  // Confirmation may happen while this deferred script is still downloading.
  if(FX.confirmed)ready=true;

  touchControl=window.BridgeTouch.attach({board,tray,getShape:()=>shapeFor(),getType:()=>game.tray[selected],canPlay:()=>ready&&!rules.open&&game.state==='playing',onSelect:select,onPreview:paintPreview,onDrop:place,onMode:touch=>{game.setRotationAllowed(!touch);if(touch)turns=0;}});
  document.querySelector('#endless-controls').hidden=!endless;
  document.querySelector('#endless-rule').hidden=!endless;
  document.querySelector('#single-mode-link').setAttribute('aria-current',endless?'false':'page');
  document.querySelector('#endless-mode-link').setAttribute('aria-current',endless?'page':'false');
  if(endless){document.title='無限搭橋｜浮島之間';document.querySelector('#best-label').textContent='最佳累積';}
  document.querySelector('#finish-endless').addEventListener('click',()=>{if(ready&&!rules.open&&game.state==='playing'){touchControl.cancel();game.finish();render();showResult();}});

  render();
})();



