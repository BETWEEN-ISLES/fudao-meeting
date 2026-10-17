((root)=>{
  'use strict';
  const COLS=6,ROWS=7;
  const SHAPES=[
    [[0,0],[1,0],[2,0],[3,0]],[[0,0],[1,0],[0,1],[1,1]],
    [[0,0],[1,0],[2,0],[1,1]],[[0,0],[0,1],[0,2],[1,2]],
    [[1,0],[1,1],[0,2],[1,2]],[[1,0],[2,0],[0,1],[1,1]],
    [[0,0],[1,0],[1,1],[2,1]]
  ];
  function rotate(shape){const next=shape.map(([x,y])=>[-y,x]);const minX=Math.min(...next.map(p=>p[0])),minY=Math.min(...next.map(p=>p[1]));return next.map(([x,y])=>[x-minX,y-minY]);}
  function fits(board,shape,x,y){return shape.every(([dx,dy])=>x+dx>=0&&x+dx<COLS&&y+dy>=0&&y+dy<ROWS&&!board[(y+dy)*COLS+x+dx]);}
  function route(board){
    const queue=[],parent=new Map();
    for(let x=0;x<COLS;x++){const i=(ROWS-1)*COLS+x;if(board[i]){queue.push(i);parent.set(i,-1);}}
    for(let n=0;n<queue.length;n++){
      const i=queue[n],x=i%COLS,y=Math.floor(i/COLS);
      if(y===0){const path=[];for(let at=i;at!==-1;at=parent.get(at))path.push(at);return path;}
      for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,j=ny*COLS+nx;if(nx>=0&&nx<COLS&&ny>=0&&ny<ROWS&&board[j]&&!parent.has(j)){parent.set(j,i);queue.push(j);}}
    }
    return [];
  }
  function movesAvailable(board,tray){return tray.some(piece=>{
    let shape=SHAPES[piece];
    for(let r=0;r<4;r++,shape=rotate(shape))for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(fits(board,shape,x,y))return true;
    return false;
  });}
  function create(random=Math.random){
    let board,tray,rows,placed,rowPoints,bonus,state,path,history;
    const draw=()=>Math.min(SHAPES.length-1,Math.floor(random()*SHAPES.length));
    function reset(){board=Array(COLS*ROWS).fill(0);tray=[draw(),draw(),draw()];rows=[];placed=0;rowPoints=0;bonus=0;state='playing';path=[];history=[];}
    reset();
    function place(slot,turns,x,y){
      if(state!=='playing'||!Number.isInteger(slot)||slot<0||slot>2)return {ok:false};
      let shape=SHAPES[tray[slot]];for(let n=0;n<turns%4;n++)shape=rotate(shape);
      if(!fits(board,shape,x,y))return {ok:false};
      history.push({board:[...board],tray:[...tray],rows:[...rows],placed,rowPoints});
      for(const [dx,dy]of shape)board[(y+dy)*COLS+x+dx]=tray[slot]+1;
      placed++;let completed=0;
      for(let r=0;r<ROWS;r++)if(!rows.includes(r)&&board.slice(r*COLS,(r+1)*COLS).every(Boolean)){rows.push(r);completed++;}
      const gained=completed*150+Math.max(0,completed-1)*100;rowPoints+=gained;
      tray[slot]=draw();path=route(board);
      if(path.length){state='won';bonus=500+board.filter(v=>!v).length*10;}
      else if(!movesAvailable(board,tray))state='lost';
      return {ok:true,completed,gained};
    }
    function undo(){if(state!=='playing'||!history.length)return false;const old=history.pop();({board,tray,rows,placed,rowPoints}=old);bonus=0;path=[];return true;}
    return {reset,place,undo,get board(){return [...board]},get tray(){return [...tray]},get rows(){return [...rows]},get placed(){return placed},get rowPoints(){return rowPoints},get bonus(){return bonus},get score(){return placed*40+rowPoints+bonus},get state(){return state},get path(){return [...path]},get canUndo(){return state==='playing'&&history.length>0}};
  }
  const api={COLS,ROWS,SHAPES,rotate,fits,route,movesAvailable,create};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.IslandBridge=api;
})(typeof window!=='undefined'?window:globalThis);
