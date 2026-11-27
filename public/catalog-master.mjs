// Responsive enhancement over the original SSR cards. No cloned content/audio.
export function installCatalogMaster(){
 const desktop=matchMedia('(min-width:60rem)');
 let root=null,nav=null,content=null,entries=[],selected=null,mobileOpen=new Map(),active=false;
 const disclosure=row=>row.matches('details')?row:row.querySelector('details');
 const hashId=()=>{try{return decodeURIComponent(location.hash.slice(1));}catch{return '';}};
 const available=e=>!e.row.hidden;
 function make(tag,className,value){const el=document.createElement(tag);if(className)el.className=className;if(value!=null)el.textContent=value;return el;}
 function playback(){
  if(!active)return;
  for(const e of entries){if(!e.play)continue;const on=e.row.querySelector('.song-play')?.dataset.playing==='true';
   e.play.dataset.playing=String(on);e.play.textContent=on?'Ⅱ':'▶';
   e.play.setAttribute('aria-label',(on?'Пауза: ':'Воспроизвести: ')+e.title);}
 }
 function buildNav(){
  nav.replaceChildren();let lastGroup=null;
  for(const e of entries){
   if(e.group!==lastGroup){lastGroup=e.group;if(lastGroup)nav.append(make('div','master-group-title',lastGroup));}
   const item=make('div','master-choice'),button=make('button','master-select');button.type='button';
   button.dataset.masterChoice=e.row.id;button.setAttribute('aria-controls',e.row.id);button.setAttribute('aria-pressed','false');
   button.append(make('strong','',e.title));if(e.subtitle)button.append(make('small','',e.subtitle));
   const source=e.row.querySelector('.song-play');
   e.play=null;if(source&&!source.disabled){e.play=make('button','master-play','▶');e.play.type='button';e.play.dataset.masterPlay=e.row.id;item.append(e.play);}
   item.append(button);nav.append(item);e.item=item;e.button=button;
  }
 }
 function select(e,{reset=true,remember=false}={}){
  if(!active||!e||!available(e))return;
  const changed=selected!==e;selected=e;
  for(const x of entries){const on=x===e;x.row.toggleAttribute('data-master-selected',on);
   x.button.setAttribute('aria-pressed',String(on));disclosure(x.row).open=on;}
  if(remember)mobileOpen.set(e.row,true);
  if(changed&&reset)content.scrollTop=0;playback();
 }
 function refresh(){
  if(!active)return;
  for(const e of entries)e.item.hidden=!available(e);
  for(const label of nav.querySelectorAll('.master-group-title')){
   let next=label.nextElementSibling,visible=false;
   while(next&&!next.matches('.master-group-title')){if(!next.hidden)visible=true;next=next.nextElementSibling;}
   label.hidden=!visible;
  }
  if(!selected||!available(selected)){
   const next=entries.find(available);
   if(next)select(next);
   else{selected=null;for(const e of entries){e.row.removeAttribute('data-master-selected');e.button.setAttribute('aria-pressed','false');disclosure(e.row).open=false;}}
  }
  playback();
 }
 function enter(){
  if(active||!root)return;
  mobileOpen=new Map(entries.map(e=>[e.row,disclosure(e.row).open]));
  const initial=entries.find(e=>available(e)&&disclosure(e.row).open)||entries.find(e=>available(e)&&e.row.id===hashId())||entries.find(available);
  buildNav();active=true;root.setAttribute('data-master-active','');nav.hidden=false;
  selected=null;refresh();if(initial)select(initial);
 }
 function leave(){
  if(!active)return;
  active=false;root.removeAttribute('data-master-active');nav.hidden=true;
  for(const e of entries){e.row.removeAttribute('data-master-selected');disclosure(e.row).open=mobileOpen.get(e.row)||false;}
  nav.replaceChildren();selected=null;
 }
 function bind(){
  const next=document.querySelector('[data-catalog-master]');
  if(next===root){desktop.matches?enter():leave();return;}
  if(active)leave();root=next;entries=[];selected=null;
  if(!root)return;
  nav=root.querySelector('[data-master-nav]');content=root.querySelector('[data-master-content]');
  entries=[...content.querySelectorAll('.song-row,.game-card,.recipe-card')].map(row=>{
   const heading=row.querySelector('.song-heading,.game-heading'),summary=disclosure(row).querySelector('summary');
   const title=heading?.querySelector('strong')?.textContent||summary.querySelector('strong')?.textContent||row.id;
   const subtitle=heading?.querySelector('small')?.innerText.trim()||row.querySelector('.recipe-number')?.textContent||'';
   const group=row.closest('.game-group,.recipe-group')?.querySelector('h2,h3')?.textContent||'';
   return {row,title,subtitle,group};
  });
  if(desktop.matches)enter();
 }
 function openHash(){
  if(!active)return;const e=entries.find(x=>x.row.id===hashId());if(!e)return;
  if(!available(e)){
   const input=document.getElementById('catalog-search');if(input)input.value='';
   for(const b of document.querySelectorAll('[data-game-filter]'))b.setAttribute('aria-pressed',String(!b.dataset.value));
   input?.dispatchEvent(new Event('input',{bubbles:true}));
  }
  if(available(e)){select(e,{remember:true});e.item.scrollIntoView({block:'nearest',inline:'nearest'});}
 }
 document.addEventListener('click',event=>{
  if(!active||!(event.target instanceof Element))return;
  const button=event.target.closest('[data-master-choice],[data-master-play]');
  if(button&&nav.contains(button)){
   const e=entries.find(x=>x.row.id===(button.dataset.masterChoice||button.dataset.masterPlay));
   select(e,{remember:true});if(button.hasAttribute('data-master-play'))e?.row.querySelector('.song-play')?.click();return;
  }
  const summary=event.target.closest('summary');
  if(summary&&content.contains(summary)&&selected&&summary===disclosure(selected.row).querySelector('summary'))event.preventDefault();
 });
 document.addEventListener('toggle',event=>{
  if(!active)return;const e=entries.find(x=>disclosure(x.row)===event.target);
  if(e&&event.target.open&&e!==selected&&available(e))select(e);
  else if(e&&e===selected&&!event.target.open)event.target.open=true;
 },true);
 document.addEventListener('catalog:filter',refresh);
 for(const type of ['play','playing','pause','ended','error'])document.addEventListener(type,e=>{if(e.target instanceof HTMLAudioElement)queueMicrotask(playback);},true);
 desktop.addEventListener('change',()=>{if(root){desktop.matches?enter():leave();}});
 document.addEventListener('astro:page-load',()=>{bind();openHash();});
 window.addEventListener('hashchange',openHash);
 bind();openHash();
}
