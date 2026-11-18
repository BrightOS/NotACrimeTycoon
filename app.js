import * as game from "./game.js?v=world3";

const shapes = {
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  right:'<path d="m9 5 7 7-7 7"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
  map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15"/>',
  users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m0-15a3 3 0 0 1 0 6m2 3a5 5 0 0 1 4 5"/>',
  wallet:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M21 10h-6v5h6M5 5l11-3"/>',
  trend:'<path d="m3 17 6-6 4 4 8-10m-6 0h6v6"/>',
  blocks:'<path d="M3 21V8h8v13m0-18h9v18M1 21h22M6 12h2m-2 4h2m6-9h3m-3 4h3m-3 4h3"/>',
  brief:'<rect x="2" y="7" width="20" height="14" rx="3"/><path d="M8 7V4h8v3M2 12q10 6 20 0M11 14h2"/>',
  bolt:'<path d="m14 2-11 12h8l-1 8 11-13h-8z"/>',
  flag:'<path d="M5 22V3c5-4 9 4 15 0v11c-6 4-10-4-15 0"/>',
  tape:'<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="7" cy="11" r="2"/><circle cx="17" cy="11" r="2"/><path d="M7 13h10"/>',
  wheel:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>',
  car:'<path d="m4 10 2-6h12l2 6M3 10h18v8H3zM5 18v2m14-2v2M6 14h2m8 0h2"/>',
  radio:'<rect x="2" y="8" width="20" height="13" rx="2"/><path d="m4 8 13-6m-4 11h6m-6 4h6"/><circle cx="7" cy="14" r="2"/>',
  hotel:'<path d="M3 20v-9m0 5h18v4m0-4v-5h-9v5"/><circle cx="7" cy="12" r="2"/>',
  shop:'<path d="m3 10 2-6h14l2 6M3 10q2 4 5 0 3 4 5 0 3 4 5 0 2 3 3 0M4 12v8h16v-8"/>'
};
function icon(name){return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+shapes[name]+'</svg>'}
document.querySelectorAll('[data-icon]').forEach(node => node.innerHTML = icon(node.dataset.icon));
const $ = id => document.getElementById(id);
const viewport = $('viewport');
const loaded = game.loadGame();
const state = loaded.state;
const points = [[21,38],[49,40],[24,68],[77,40],[50,68],[78,68]];
const symbols = ['brief','star','shop','blocks','radio','wheel'];
const titles = ['grandtheftauto3','vicecity','sanandreas','IV'];
const archives = [...titles.map(name => 'https://www.rockstargames.com/games/' + name),
  'https://www.rockstargames.com/newswire/article/o349k552514831/new-grand-theft-auto-v-screenshots.html',
  'https://www.rockstargames.com/VI/media'];
const money = new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0});
const short = new Intl.NumberFormat('ru-RU',{notation:'compact',maximumFractionDigits:1});
const cash = n => '$' + (n>=1e6 ? short : money).format(Math.floor(n));
const reduced = matchMedia('(prefers-reduced-motion:reduce)');
const mobile = matchMedia('(max-width:700px)');
const pins=[], cards=[], dots=[];
let selected=0, panel=null, opener=null, lastTick=Date.now(), lastSave=lastTick, lastFx=0, toastTimer;
function settle() {
  const now=Date.now();
  game.tick(state, Math.max(0,(now-lastTick)/1000));
  lastTick=now;
}
function save(){game.saveGame(state);lastSave=Date.now()}
function message(text){
  $('toast').textContent=text;
  $('toast').hidden=false;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>$('toast').hidden=true,2600);
}
function spark(node,text){
  if(reduced.matches)return;
  const effect=document.createElement('span');
  effect.className='spark';effect.textContent=text;effect.setAttribute('aria-hidden','true');
  node.append(effect);setTimeout(()=>effect.remove(),1400);
}
function aim(x,y,animated=false){
  viewport.scrollTo({left:x*viewport.scrollWidth-viewport.clientWidth/2,top:y*viewport.scrollHeight-viewport.clientHeight/2,behavior:animated&&!reduced.matches?'smooth':'instant'});
}
function updateMini(){
  const {clientWidth:w,clientHeight:h,scrollWidth:sw,scrollHeight:sh}=viewport;
  Object.assign($('mini-view').style,{left:100*viewport.scrollLeft/sw+'%',top:100*viewport.scrollTop/sh+'%',width:100*w/sw+'%',height:100*h/sh+'%'});
  positionInspector();
}
function positionInspector(){
  if(panel!=='inspector'||mobile.matches)return;
  const box=$('inspector'),point=pins[selected].getBoundingClientRect();
  const availableRight=innerWidth-point.right-16;
  const x=availableRight>=box.offsetWidth ? point.right+8 : point.left-box.offsetWidth-8;
  box.style.left=Math.max(8,Math.min(innerWidth-box.offsetWidth-8,x))+'px';
  box.style.top=Math.max(8,Math.min(viewport.clientHeight-box.offsetHeight-10,point.top-box.offsetHeight*.35))+'px';
}
function show(name,trigger){
  const previous=opener;
  ['inspector','crew','mission'].forEach(id=>$(id).hidden=id!==name);
  panel=name;
  $('open-crew').setAttribute('aria-expanded',String(name==='crew'));
  $('open-mission').setAttribute('aria-expanded',String(name==='mission'));
  $('objective').setAttribute('aria-expanded',String(name==='mission'));
  if(name){
    opener=trigger;
    positionInspector();
    $(name).querySelector('.close').focus({preventScroll:true});
  }else{
    opener=null;
    if(previous?.isConnected)previous.focus({preventScroll:true});
  }
  render();
}
function choose(index,fromRoster=false){
  selected=index;
  if(fromRoster)aim(points[index][0]/100,points[index][1]/100);
  show('inspector',pins[index]);
}
game.CREW.forEach((member,index)=>{
  const [x,y]=points[index];
  const pin=document.createElement('button');
  pin.className='pin';pin.style.left=x+'%';pin.style.top=y+'%';
  pin.innerHTML='<span class="pin-sign"><i></i><span></span></span>';
  pin.onclick=()=>choose(index);$('pins').append(pin);pins.push(pin);
  const card=document.createElement('button');card.className='crew-member';
  card.innerHTML='<img alt=""><span><strong></strong><small></small></span><i></i>';
  card.querySelector('img').src=member.image;card.querySelector('strong').textContent=member.name;
  card.querySelector('small').textContent=member.business;
  card.onclick=()=>choose(index,true);$('roster').append(card);cards.push(card);
  const dot=document.createElement('i');dot.className='mini-dot';dot.style.left=x+'%';dot.style.top=y+'%';
  $('mini-markers').append(dot);dots.push(dot);
});
function renderContract(){
  const c=game.getContract(state);
  $('objective-title').textContent=c.ready?'Забрать '+cash(c.reward):c.number===1?'Открыть '+game.CREW[0].business.toLocaleLowerCase('ru'):c.title;
  $('mission-title').textContent=c.title;$('mission-description').textContent=c.description;
  $('mission-progress').textContent=money.format(c.progress)+' / '+money.format(c.target);
  $('objective-bar').style.width=$('mission-bar').style.width=Math.min(100,100*c.progress/c.target)+'%';
  $('reward-dot').hidden=!c.ready;$('claim').disabled=!c.ready;
  $('claim').textContent=(c.ready?'Забрать награду ':'Награда ')+cash(c.reward);
  const key=String(c.number);
  if($('routes').dataset.order!==key){
    $('routes').dataset.order=key;$('routes').replaceChildren();
    for(const route of c.routes){
      const button=document.createElement('button');button.dataset.route=route.id;
      button.textContent=route.label+' · '+cash(route.reward);
      button.onclick=()=>{settle();game.selectContractRoute(state,route.id);save();render()};
      $('routes').append(button);
    }
  }
  for(const button of $('routes').children)button.setAttribute('aria-pressed',String(c.selectedRoute===button.dataset.route));
}
function render(){
  $('cash').textContent=cash(state.cash);$('income').textContent='+'+cash(game.incomeRate(state))+'/с';
  $('owned').textContent=state.levels.filter(Boolean).length+' / '+game.CREW.length;
  $('collect-amount').textContent='+'+cash(game.collectValue(state));
  game.CREW.forEach((m,i)=>{
    const owned=state.levels[i]>0,locked=i>0&&!state.levels[i-1];
    const status=owned?'owned':locked?'locked':'available';
    const pin=pins[i];
    if(pin.dataset.status!==status){
      pin.dataset.status=status;
      for(const name of ['owned','locked','available'])pin.classList.toggle(name,name===status);
      pin.querySelector('i').innerHTML=icon(locked?'lock':symbols[i]);
      pin.querySelector('.pin-sign span').textContent=locked?String(i+1).padStart(2,'0'):m.business;
      pin.setAttribute('aria-label',m.business+' · '+(locked?'закрыто':owned?'под контролем':'доступно'));
    }
    pin.classList.toggle('selected',panel==='inspector'&&selected===i);
    pin.setAttribute('aria-expanded',String(panel==='inspector'&&selected===i));
    dots[i].classList.toggle('available',!locked);
    cards[i].querySelector('i').textContent=locked?'Закрыто':owned?'Ур. '+state.levels[i]:'Доступно';
  });
  if(panel==='inspector'){
    const m=game.CREW[selected],level=state.levels[selected],locked=selected>0&&!state.levels[selected-1],cost=game.nextCost(state,selected);
    if($('portrait').getAttribute('src')!==m.image)$('portrait').src=m.image;
    $('availability').textContent=locked?'ЗАКРЫТО':level?'ПОД КОНТРОЛЕМ':'ДОСТУПНО';
    $('biz-name').textContent=m.business;$('owner').textContent=m.name;$('description').textContent=m.description;
    $('legend').textContent=m.legend??'';$('era').textContent=m.era+' ↗';$('era').href=archives[selected];
    $('level').textContent=level;$('current-rate').textContent=cash(m.rate*level)+'/с';$('next-rate').textContent='+'+cash(m.rate)+'/с';
    $('buy').disabled=locked||state.cash<cost;$('buy-label').textContent=locked?'Закрыто':level?'Улучшить':'Открыть дело';$('price').textContent=cash(cost);
    $('buy-hint').textContent=locked?'Сначала откройте дело «'+game.CREW[selected-1].business+'»':state.cash<cost?'Не хватает '+cash(Math.ceil(cost-state.cash)):'';
    positionInspector();
  }
  renderContract();
}
for(const [id,name] of [['open-crew','crew'],['open-mission','mission'],['objective','mission']]){
  $(id).onclick=()=>show(panel===name?null:name,$(id));
}
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>show(null));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&panel)show(null)});
$('buy').onclick=()=>{
  settle();if(!game.purchase(state,selected))return render();
  save();render();const pin=pins[selected];pin.classList.remove('pulse');void pin.offsetWidth;pin.classList.add('pulse');
  message(game.CREW[selected].business+' · '+(state.levels[selected]===1?'Дело открыто':'Уровень '+state.levels[selected]));
};
$('collect').onclick=()=>{settle();const value=game.collect(state);save();render();spark($('collect'),'+'+cash(value))};
$('claim').onclick=()=>{settle();const reward=game.claimContract(state);if(reward){save();message('Заказ выполнен · +'+cash(reward))}render()};
viewport.addEventListener('scroll',updateMini,{passive:true});
window.addEventListener('resize',updateMini);
$('mini').onclick=event=>{const box=$('mini').getBoundingClientRect();aim((event.clientX-box.left)/box.width,(event.clientY-box.top)/box.height,true)};
let drag=null,suppressClick=false;
viewport.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='mouse'||e.button!==0||e.target.closest('button'))return;
  drag={x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};suppressClick=false;
});
window.addEventListener('pointermove',e=>{
  if(!drag)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(Math.abs(dx)+Math.abs(dy)>5)suppressClick=true;
  if(suppressClick){viewport.classList.add('dragging');viewport.scrollTo(drag.left-dx,drag.top-dy)}
});
window.addEventListener('pointerup',()=>{drag=null;viewport.classList.remove('dragging')});
viewport.addEventListener('click',e=>{if(!e.target.closest('button')&&!suppressClick&&panel)show(null);suppressClick=false});
for(const [x,y] of points){
  const light=document.createElement('i');light.className='beacon';light.style.left=(x+2)+'%';light.style.top=(y-4)+'%';light.style.animationDelay=-x/17+'s';$('lights').append(light);
}
const first=Math.max(0,state.levels.findIndex(level=>level===0));
aim(mobile.matches?points[first][0]/100:.5,mobile.matches?points[first][1]/100:.5);updateMini();render();
if(loaded.offlineEarned>=1)message('Доход за время отсутствия · +'+cash(loaded.offlineEarned));
setInterval(()=>{
  settle();render();if(Date.now()-lastSave>=5000)save();
  if(Date.now()-lastFx>4900){const owned=pins.filter((_,i)=>state.levels[i]);if(owned.length){const p=owned[Math.floor(Math.random()*owned.length)],i=pins.indexOf(p);spark(p,'+'+cash(game.CREW[i].rate*state.levels[i])+'/с')}lastFx=Date.now()}
},1000);
window.addEventListener('pagehide',()=>{settle();save()});
