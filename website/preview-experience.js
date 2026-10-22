(() => {
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const scene=document.querySelector('.island-scene');
  if(scene && matchMedia('(pointer:fine)').matches){
    const islands=[...scene.querySelectorAll('[data-depth]')];
    let tx=0,ty=0,x=0,y=0,frame=0;
    function animate(){
      frame=0;if(reduced.matches)return;
      x+=(tx-x)*.055;y+=(ty-y)*.055;
      for(const island of islands){const d=Number(island.dataset.depth);island.style.transform=`translate3d(${x*d}px,${y*d}px,0)`;}
      if(Math.abs(tx-x)+Math.abs(ty-y)>.03)frame=requestAnimationFrame(animate);
    }
    function target(a,b){tx=a;ty=b;if(!frame&&!reduced.matches)frame=requestAnimationFrame(animate);}
    scene.closest('.hero').addEventListener('pointermove',e=>{const r=scene.getBoundingClientRect();target((e.clientX/r.width-.5)*35,((e.clientY-r.top)/r.height-.5)*24);});
    scene.closest('.hero').addEventListener('pointerleave',()=>target(0,0));
    reduced.addEventListener('change',()=>{if(reduced.matches){cancelAnimationFrame(frame);frame=0;for(const island of islands)island.style.transform='';}});
  }
  const key='between-islands-preview-20261023-discoveries';
  const categories=[{id:'2d',label:'2D 動畫',count:14},{id:'3d',label:'3D 動畫',count:2},{id:'documentary',label:'紀錄片',count:1},{id:'film',label:'自媒體電影製作',count:1},{id:'game',label:'遊戲設計',count:4},{id:'idol',label:'虛擬偶像',count:1},{id:'novel',label:'視覺小說',count:1},{id:'interaction',label:'互動設計',count:3},{id:'thesis',label:'論文',count:1},{id:'book',label:'電子繪本',count:4}];
  const catalog=categories.flatMap(c=>Array.from({length:c.count},(_,i)=>({id:`${c.id}-${String(i+1).padStart(2,'0')}`,label:`${c.label} 第 ${String(i+1).padStart(2,'0')} 組`,category:c.id})));
  let discoveries=[];
  try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))discoveries=saved.filter(id=>catalog.some(w=>w.id===id));}catch{}
  const node=(tag,text,className)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;};
  function recommend(detail={},demo=false){
    const type=detail.game==='flight'?'flight':'bridge';
    const pool=catalog.filter(w=>type==='flight'?['2d','3d','documentary','film'].includes(w.category):['game','interaction','novel','book','idol'].includes(w.category));
    const score=Number.isFinite(Number(detail.score))?Math.max(0,Math.floor(Number(detail.score))):0;
    const work=pool[score%pool.length];
    let host=document.querySelector('#journey-recommendation');
    if(!host){host=node('div',null,'recommendation-host');host.id='journey-recommendation';}
    const result=document.querySelector('#bridge-result[open],#pk-result[open]');
    const flight=document.querySelector('#game-panel:not([hidden])');
    const target=demo?document.querySelector('.journey-preview-control'):result||flight||document.querySelector('.journey-preview-control');
    if(!target)return;
    target.append(host);host.replaceChildren();
    const card=node('div',null,'journey-card');
    card.append(node('p',demo?'PREVIEW / 推薦介面示意':'A NEW ISLAND DISCOVERED','journey-kicker'),node('h3',demo?'旅程之後，遇見一座新島。':'下一座島，為你而選。'),node('p',`${work.label}｜作品資料待公布`),node('p','為這段旅程收藏一個探索方向，接著認識島嶼背後的創作者。'));
    const link=node('a','探索推薦作品 ↗');link.href=`works.html?work=${encodeURIComponent(work.id)}`;card.append(link);host.append(card);
    if(!demo&&!discoveries.includes(work.id)){discoveries.push(work.id);try{localStorage.setItem(key,JSON.stringify(discoveries));}catch{}}
    if(demo)host.scrollIntoView({behavior:reduced.matches?'auto':'smooth',block:'center'});
  }
  window.addEventListener('island:journey-end',e=>recommend(e.detail));
  const collection=document.querySelector('#collection');
  if(collection && discoveries.length){
    const shelf=node('section',null,'journey-collection');shelf.append(node('p','YOUR JOURNEY / 旅途中發現的島嶼','eyebrow'));
    for(const id of discoveries){const work=catalog.find(w=>w.id===id);const a=node('a',work.label+' ↗');a.href=`works.html?work=${encodeURIComponent(id)}`;shelf.append(a);}
    const clear=node('button','清除探索紀錄');clear.type='button';clear.addEventListener('click',()=>{try{localStorage.removeItem(key);}catch{}discoveries=[];shelf.remove();});shelf.append(clear);collection.prepend(shelf);
  }
})();
