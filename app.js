import * as game from "./game.js?v=district2";

const shapes = {
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
document.querySelectorAll('[data-icon]').forEach(node=>node.innerHTML=icon(node.dataset.icon));
const $ = id=>document.getElementById(id);
const loaded=game.loadGame(), state=loaded.state;
const points=[[23,33],[54,30],[83,32],[18,69],[47,68],[84,65]];
const symbols=['tape','wheel','car','radio','hotel','shop'];
const format=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0});
const compact=new Intl.NumberFormat('ru-RU',{notation:'compact',maximumFractionDigits:1});
function cash(value){return '$'+(value>=1e6?compact:format).format(Math.floor(value))}
let selected=0, lastTick=Date.now(),lastSave=lastTick,toastTimer;
const pins=[],cards=[];
function settle(){const now=Date.now();game.tick(state,Math.max(0,(now-lastTick)/1000));lastTick=now}
function save(){game.saveGame(state);lastSave=Date.now()}
function message(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3000)}
function select(index){selected=index;render()}
game.CREW.forEach((member,index)=>{
  const pin=document.createElement('button');pin.className='pin';pin.type='button';pin.style.left=points[index][0]+'%';pin.style.top=points[index][1]+'%';pin.innerHTML='<span class="pin-sign">'+icon(symbols[index])+'<span></span></span>';pin.setAttribute('aria-label',member.business);pin.title=member.business;pin.onclick=()=>select(index);$('pins').append(pin);pins.push(pin);
  const card=document.createElement('button');card.type='button';card.innerHTML='<img alt=""><span><strong></strong><small></small></span>';card.querySelector('img').src=member.image;card.querySelector('strong').textContent=member.name;card.onclick=()=>{select(index);if(matchMedia('(max-width:800px)').matches)document.querySelector('.inspector').scrollIntoView({block:'center'})};$('roster').append(card);cards.push(card);
});
const routes=document.createElement('div');routes.className='route-row';const progress=document.createElement('div');progress.className='contract-track';progress.innerHTML='<i></i>';$('mission-progress').after(progress,routes);
function renderContract(){
  const c=game.getContract?.(state);if(!c)return;
  $('mission').hidden=false;$('mission-title').textContent=c.title;$('mission-progress').textContent=c.description+' · '+format.format(Math.min(c.target,Math.floor(c.progress)))+' / '+format.format(c.target);
  progress.firstChild.style.width=Math.min(100,100*c.progress/c.target)+'%';
  $('claim').disabled=!c.ready;$('claim').textContent=(c.ready?'Получить ':'Награда ')+cash(c.reward);
  const signature=JSON.stringify([c.number,c.selectedRoute]);if(routes.dataset.signature===signature)return;
  routes.dataset.signature=signature;routes.replaceChildren();for(const route of c.routes??[]){const button=document.createElement('button');button.type='button';button.textContent=route.label+' · '+cash(route.reward);button.title=route.description;button.setAttribute('aria-pressed',String(c.selectedRoute===route.id));button.onclick=()=>{settle();game.selectContractRoute(state,route.id);save();render()};routes.append(button)}
}
function render(){
 const count=state.levels.filter(Boolean).length,member=game.CREW[selected],level=state.levels[selected],locked=selected>0&&!state.levels[selected-1],cost=game.nextCost(state,selected);
 $('cash').textContent=cash(state.cash);$('income').textContent='+'+cash(game.incomeRate(state))+'/с';$('owned').textContent=count+' / '+game.CREW.length;$('crew-count').textContent='В команде: '+count+' из '+game.CREW.length;
 $('collect-amount').textContent='+'+cash(game.collectValue?.(state)??5);
 game.CREW.forEach((m,i)=>{const active=i===selected;const number=String(i+1).padStart(2,'0');pins[i].classList.toggle('selected',active);pins[i].classList.toggle('owned',!!state.levels[i]);pins[i].setAttribute('aria-pressed',String(active));pins[i].querySelector('.pin-sign span').textContent=active?m.business:number;cards[i].classList.toggle('current',active);cards[i].setAttribute('aria-pressed',String(active));cards[i].querySelector('small').textContent=m.business});
 $('serial').textContent='№ '+String(selected+1).padStart(2,'0');if($('portrait').getAttribute('src')!==member.image)$('portrait').src=member.image;$('owner').textContent=member.name;$('availability').textContent=level?'● В команде':locked?'● Закрыто':'● Доступен найм';$('availability').classList.toggle('locked',locked);$('biz-name').textContent=member.business;$('description').textContent=member.description;
 $('level').textContent=level;$('current-rate').textContent=cash(member.rate*level)+'/с';$('next-rate').textContent='+'+cash(member.rate)+'/с';$('buy').disabled=locked||state.cash<cost;$('buy-label').textContent=locked?'Закрыто':level?'Улучшить':'Открыть бизнес';$('price').textContent=cash(cost);$('buy-hint').textContent=locked?'Сначала откройте бизнес «'+game.CREW[selected-1].business+'»':state.cash<cost?'Не хватает '+cash(Math.ceil(cost-state.cash)):'';renderContract();
}
$('collect').onclick=()=>{settle();const earned=game.collect(state);save();render();const fx=document.createElement('span');fx.className='spark';fx.setAttribute('aria-hidden','true');fx.textContent='+'+cash(earned);$('collect').append(fx);setTimeout(()=>fx.remove(),800)};
$('buy').onclick=()=>{settle();if(game.purchase(state,selected)){save();message(state.levels[selected]===1?'Открыт бизнес «'+game.CREW[selected].business+'»':game.CREW[selected].business+' · Уровень '+state.levels[selected]);const pin=pins[selected];pin.classList.remove('pulse');void pin.offsetWidth;pin.classList.add('pulse')}render()};
$('claim').onclick=()=>{settle();const reward=game.claimContract(state);if(reward){save();message('Заказ выполнен · +'+cash(reward))}render()};
document.querySelectorAll('nav a').forEach(a=>a.onclick=()=>{document.querySelector('.nav-active')?.classList.remove('nav-active');a.classList.add('nav-active')});
render();if(loaded.offlineEarned>=1)message('Пока вас не было, район заработал '+cash(loaded.offlineEarned));
setInterval(()=>{settle();render();if(Date.now()-lastSave>=5000)save()},1000);
window.addEventListener('pagehide',()=>{settle();save()});
