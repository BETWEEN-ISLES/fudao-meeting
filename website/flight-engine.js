// Browser-independent fixed-step game rules, also used by validation.
((root) => {
  const WIDTH=960,HEIGHT=540;
  function polygon(obstacle,top){
    const y=top?obstacle.center-obstacle.gap/2:obstacle.center+obstacle.gap/2;
    const direction=top?-1:1,depth=top?y+40:HEIGHT-y+40,x=obstacle.x,w=obstacle.width;
    return [[x,y+direction*14],[x+w*.13,y],[x+w*.82,y+direction*2],[x+w,y+direction*15],[x+w*.84,y+direction*depth*.48],[x+w*.57,y+direction*depth],[x+w*.18,y+direction*depth*.60]];
  }
  function circlePolygon(cx,cy,r,points){
    let inside=false;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const [ax,ay]=points[j],[bx,by]=points[i],dx=bx-ax,dy=by-ay;
      if(((ay>cy)!==(by>cy)) && cx<(bx-ax)*(cy-ay)/(by-ay)+ax)inside=!inside;
      const t=Math.max(0,Math.min(1,((cx-ax)*dx+(cy-ay)*dy)/(dx*dx+dy*dy||1)));
      if((cx-ax-t*dx)**2+(cy-ay-t*dy)**2<r*r)return true;
    }
    return inside;
  }
  function create(random=Math.random,viewportWidth=WIDTH){
    let bird,obstacles,score,state,elapsed,spawnDistance,speed,lastCenter;
    function reset(){bird={x:Math.min(220,viewportWidth*.23),y:270,vy:0,flap:0};obstacles=[];score=0;state='ready';elapsed=0;spawnDistance=140;speed=155;lastCenter=270;}
    reset();
    function flap(){if(state==='ready'){state='playing';}if(state==='playing'){bird.vy=-255;bird.flap=.19;}}
    function step(dt){
      if(state!=='playing')return;
      elapsed+=dt;bird.flap=Math.max(0,bird.flap-dt);bird.vy=Math.min(420,bird.vy+740*dt);bird.y+=bird.vy*dt;
      const targetSpeed=Math.min(430,155+score*7);
      speed+=(targetSpeed-speed)*(1-Math.exp(-dt*1.6));
      spawnDistance-=speed*dt;
      if(spawnDistance<=0){const gap=Math.max(170,215-score*1.5),center=Math.max(155,Math.min(385,lastCenter+(random()-.5)*180));lastCenter=center;obstacles.push({x:viewportWidth+30,width:Math.min(105,viewportWidth*.16),center,gap,scored:false});spawnDistance+=300;}

      for(const o of obstacles){
        o.x-=speed*dt;
        if(!o.scored&&o.x+o.width<bird.x-14){o.scored=true;score++;}
        if(circlePolygon(bird.x+13,bird.y,15,polygon(o,true))||circlePolygon(bird.x+13,bird.y,15,polygon(o,false)))state='over';
      }
      obstacles=obstacles.filter(o=>o.x+o.width>-20);
      if(bird.y<23||bird.y>HEIGHT-23)state='over';
    }
    return {reset,flap,step,resize(width){const before=bird.x;viewportWidth=width;bird.x=Math.min(220,width*.23);const shift=bird.x-before;for(const obstacle of obstacles)obstacle.x+=shift;},pause(){if(state==='playing')state='paused';},resume(){if(state==='paused')state='playing';},get bird(){return bird},get obstacles(){return obstacles},get score(){return score},get state(){return state},get elapsed(){return elapsed},get speed(){return speed}};
  }
  const api={WIDTH,HEIGHT,create,polygon,circlePolygon};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.IslandFlight=api;
})(typeof window!=='undefined'?window:globalThis);

