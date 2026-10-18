(() => {
  'use strict';
  const E=window.IslandBridge;
  const arena=document.querySelector('#pk-arena'),clock=document.querySelector('#pk-clock'),duration=document.querySelector('#pk-duration');
  const startButton=document.querySelector('#start-pk'),summary=document.querySelector('#match-status'),dialog=document.querySelector('#pk-result');
  let active=false,deadline=0,lastTimeText='',clearingTimers=[],rulesConfirmed=false;
  const FX=window.BridgeFeedback,rules=document.querySelector('#game-rules');
  const players=[1,2].map(id=>({id,game:E.create(),selected:0,turns:0,cursor:36,cells:[],board:document.querySelector(`#p${id}-board`),tray:document.querySelector(`#p${id}-tray`),status:document.querySelector(`#p${id}-state`),score:document.querySelector(`#p${id}-score`),note:'等待開始'}));
  function shape(player){let value=E.SHAPES[player.game.tray[player.selected]];for(let i=0;i<player.turns;i++)value=E.rotate(value);return value;}
  function render(player){
    const values=player.game.board,path=new Set(player.game.path),canPlay=active&&player.game.state==='playing';
    const x=player.cursor%6,y=Math.floor(player.cursor/6),piece=shape(player),valid=E.fits(values,piece,x,y);
    player.cells.forEach((cell,i)=>{
      cell.className='cell';cell.disabled=!canPlay;cell.tabIndex=-1;
      if(values[i])cell.classList.add('filled',`color-${values[i]}`);
      if(path.has(i))cell.classList.add('route');
      if(i===player.cursor&&canPlay)cell.classList.add('cursor');
      cell.setAttribute('aria-label',`玩家 ${player.id} 第 ${Math.floor(i/6)+1} 列，第 ${i%6+1} 欄，${values[i]?'有方塊':'空格'}`);
    });
    if(canPlay)for(const [dx,dy]of piece){const nx=x+dx,ny=y+dy;if(nx<6&&ny<7)player.cells[ny*6+nx].classList.add(valid?'preview-valid':'preview-invalid');}
    player.score.textContent=String(player.game.score);
    player.status.textContent=player.note;
    player.tray.replaceChildren();
    player.game.tray.forEach((type,slot)=>{
      const button=document.createElement('button');button.type='button';button.className='piece-option';button.dataset.slot=String(slot);button.disabled=!canPlay;
      button.setAttribute('aria-pressed',String(player.selected===slot));button.setAttribute('aria-label',`玩家 ${player.id} 選擇方塊 ${slot+1}`);
      const mini=document.createElement('span');mini.className='mini-piece';mini.setAttribute('aria-hidden','true');
      const cells=slot===player.selected?shape(player):E.SHAPES[type];
      for(const [cx,cy]of cells){const part=document.createElement('span');part.className=`mini-cell color-${type+1}`;part.style.gridColumn=String(cx+1);part.style.gridRow=String(cy+1);mini.append(part);}
      const label=document.createElement('span');label.textContent=`方塊 ${slot+1} · ${player.id===1?slot+1:slot+7}`;button.append(mini,label);player.tray.append(button);
    });
  }
  function timeText(seconds){return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
  function finish(){
    if(!active)return;
    active=false;duration.disabled=false;startButton.disabled=false;startButton.textContent='開始新一局 ↗';
    const records=players.map(p=>({id:p.id,won:p.game.state==='won',score:p.game.score,cleared:p.game.clearedRows,placed:p.game.placed,bonus:p.game.bonus}));
    const {winners,ordered}=E.rank(records),winnerIds=new Set(winners.map(r=>r.id));
    const title=winners.length===0?'這一局，還沒有橋。':winners.length===2?'雙橋相連，並列獲勝。':`玩家 ${winners[0].id} 獲勝！`;
    document.querySelector('#pk-result-title').textContent=title;
    document.querySelector('#pk-result-description').textContent=winners.length?'只比較成功搭橋的玩家；未搭橋者即使分數較高，也沒有勝利資格。':'兩位玩家都沒有完成搭橋，本局無人獲勝，分數僅作紀錄。';
    const table=document.querySelector('#pk-results');table.replaceChildren();
    for(const record of ordered){const tr=document.createElement('tr');if(winnerIds.has(record.id))tr.className='winner';for(const value of [`玩家 ${record.id}`,record.won?'已完成':'未完成',`${record.cleared} 排`,`${record.score} 分`]){const td=document.createElement('td');td.textContent=value;tr.append(td);}table.append(tr);}
    document.querySelector('#pk-score-detail').textContent=records.map(r=>`玩家 ${r.id}：放置 ${r.placed*40} ＋ 消排 ${players[r.id-1].game.rowPoints} ＋ 搭橋及空格 ${r.bonus} ＝ ${r.score}`).join('；');
    summary.textContent=title;
    for(const player of players){if(player.game.state!=='won')player.note=player.game.reason==='time'?'時間到，未搭橋，無勝利資格。':'無處可放，未搭橋，無勝利資格。';render(player);}
    if(rules.open)rules.close();
    if(!dialog.open)dialog.showModal();
  }
  function checkTime(){
    if(!active)return false;
    const remaining=Math.max(0,Math.ceil((deadline-performance.now())/1000)),text=timeText(remaining);
    if(text!==lastTimeText){clock.textContent=text;lastTimeText=text;clock.classList.toggle('urgent',remaining<=15);}
    if(remaining===0){for(const player of players)player.game.expire();finish();return true;}
    return false;
  }
  function start(){
    if(active||!rulesConfirmed)return;
    if(dialog.open)dialog.close();
    const seconds=Number(duration.value),seed=(Date.now()^Math.floor(Math.random()*4294967296))>>>0;
    clearingTimers.forEach(clearTimeout);clearingTimers=[];
    active=true;deadline=performance.now()+seconds*1000;duration.disabled=true;startButton.disabled=true;lastTimeText='';
    for(const player of players){FX.reset(player.board);player.game=E.create(E.seeded(seed));player.selected=0;player.turns=0;player.cursor=36;player.note='已選方塊 1，移動預覽後放置。';render(player);}
    summary.textContent='對戰開始！橫排填滿會消除；用剩下的方塊搭橋，完成後才有獲勝資格。';checkTime();arena.focus({preventScroll:true});
  }
  function play(player,action,value){
    if(checkTime()||!active||rules.open||player.game.state!=='playing')return;
    if(action==='move'){
      const [dx,dy]=value,x=Math.max(0,Math.min(5,player.cursor%6+dx)),y=Math.max(0,Math.min(6,Math.floor(player.cursor/6)+dy));player.cursor=y*6+x;
    }else if(action==='select'){player.selected=value;player.turns=0;}
    else if(action==='rotate')player.turns=(player.turns+1)%4;
    else if(action==='place'){
      const result=player.game.place(player.selected,player.turns,player.cursor%6,Math.floor(player.cursor/6));
      if(!result.ok){player.note='無法放置：超出棋盤或與已有方塊重疊。';render(player);FX.invalid(player.board);return;}
      player.turns=0;player.note=result.completed?`消除 ${result.completed} 排，＋${result.gained+40} 分！繼續搭橋。`:'已放置，＋40 分。';
      if(player.game.state==='won'){player.note=`已搭橋！結算 ${player.game.score} 分，等待對手。`;summary.textContent=`玩家 ${player.id} 已完成搭橋，另一位玩家繼續挑戰。`;}
      if(player.game.state==='lost')player.note='已無處可放，未完成搭橋。等待本局結算。';
      render(player);
      FX.success(player.board,{cleared:result.completed,won:player.game.state==='won',points:40+result.gained+(player.game.state==='won'?player.game.bonus:0)});
      if(result.cleared.length){for(const r of result.cleared)for(let x=0;x<6;x++)player.cells[r*6+x].classList.add('row-cleared');clearingTimers.push(setTimeout(()=>{for(const cell of player.cells)cell.classList.remove('row-cleared');},400));}
      if(players.every(p=>p.game.state!=='playing'))finish();
      return;
    }
    render(player);
  }
  for(const player of players){
    for(let i=0;i<42;i++){const cell=document.createElement('button');cell.type='button';cell.className='cell';cell.dataset.cell=String(i);player.cells.push(cell);player.board.append(cell);}
    player.board.addEventListener('click',event=>{const cell=event.target.closest('[data-cell]');if(!cell||!active)return;player.cursor=Number(cell.dataset.cell);play(player,'place');});
    player.tray.addEventListener('click',event=>{const option=event.target.closest('[data-slot]');if(option)play(player,'select',Number(option.dataset.slot));});
    render(player);
  }
  const keys={KeyW:[0,'move',[0,-1]],KeyA:[0,'move',[-1,0]],KeyS:[0,'move',[0,1]],KeyD:[0,'move',[1,0]],KeyQ:[0,'rotate'],Space:[0,'place'],Digit1:[0,'select',0],Digit2:[0,'select',1],Digit3:[0,'select',2],ArrowUp:[1,'move',[0,-1]],ArrowLeft:[1,'move',[-1,0]],ArrowDown:[1,'move',[0,1]],ArrowRight:[1,'move',[1,0]],ShiftRight:[1,'rotate'],Enter:[1,'place'],NumpadEnter:[1,'place'],Digit7:[1,'select',0],Digit8:[1,'select',1],Digit9:[1,'select',2]};
  document.addEventListener('keydown',event=>{
    if(!active||dialog.open||rules.open||event.ctrlKey||event.metaKey||event.altKey||event.target.closest('input,select,textarea'))return;
    const action=keys[event.code];if(!action)return;event.preventDefault();if(event.repeat&&action[1]!=='move')return;play(players[action[0]],action[1],action[2]);
  });
  startButton.addEventListener('click',start);
  document.addEventListener('bridge:rules-confirm',event=>{if(event.detail.initial){rulesConfirmed=true;start();}});
  document.querySelector('#again-pk').addEventListener('click',start);
  document.querySelector('#inspect-pk').addEventListener('click',()=>dialog.close());
  duration.addEventListener('change',()=>{if(!active){clock.textContent=timeText(Number(duration.value));clock.classList.remove('urgent');}});
  window.addEventListener('focus',checkTime);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkTime();});
  setInterval(checkTime,200);
  if(FX.confirmed){rulesConfirmed=true;start();}
})();

