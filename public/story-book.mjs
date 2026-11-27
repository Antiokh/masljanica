// One audio transport per scenario page. Musical cues never auto-advance.
export function installStoryBook(){
 let audio=null,active=null,index=0,pending=null,attempt=0;
 const selected=new Map();
 const fmt=n=>Math.floor(Math.max(0,n)/60)+':'+String(Math.floor(Math.max(0,n)%60)).padStart(2,'0');
 const tracks=card=>{try{return JSON.parse(card.dataset.tracks||'[]');}catch{return [];}};
 function sync(){
  if(!audio?.isConnected)return;
  for(const card of document.querySelectorAll('[data-story-music]')){
   const current=card===active,n=selected.get(card.dataset.storyMusic)??0,t=tracks(card)[n];if(!t)continue;
   const playing=current&&!audio.paused&&!audio.ended&&!audio.error;
   const duration=current&&Number.isFinite(audio.duration)?audio.duration:t.duration||0;
   const pos=current?(pending!==null?pending*duration:audio.currentTime):0;
   const pct=duration>0?Math.max(0,Math.min(100,pos/duration*100)):0;
   const play=card.querySelector('.story-play'),seek=card.querySelector('.story-seek'),title=card.querySelector('.story-music-main strong').textContent;
   play.dataset.playing=String(playing);play.setAttribute('aria-label',(playing?'Пауза: ':'Воспроизвести: ')+title);
   card.style.setProperty('--story-progress',pct+'%');card.style.setProperty('--story-ring-progress',String(pct));
   seek.value=String(Math.round(pct*10));seek.setAttribute('aria-valuetext',fmt(pos)+' / '+fmt(duration));
   card.querySelector('.story-time').textContent=current?fmt(pos)+' / '+fmt(duration):fmt(duration);
   for(const b of card.querySelectorAll('[data-story-variant]'))b.setAttribute('aria-pressed',String(Number(b.dataset.storyVariant)===n));
  }
 }
 function bind(){const next=document.querySelector('#story-audio');if(audio===next)return;if(audio)audio.pause();audio=next;active=null;index=0;pending=null;attempt++;selected.clear();sync();}
 function error(card,message=''){const el=card?.querySelector('.story-music-error');if(el){el.textContent=message;el.hidden=!message;}}
 function select(card,n){
  const t=tracks(card)[n];if(!audio||!t||!/^\/media\/audio\/[a-z0-9_-]+\.mp3$/.test(t.src))return false;
  if(active!==card||index!==n){attempt++;audio.pause();active=card;index=n;pending=null;selected.set(card.dataset.storyMusic,n);audio.src=t.src;audio.load();}error(card);return true;
 }
 function play(){const target=audio,card=active,token=++attempt;target.play().catch(e=>{if(token===attempt&&audio===target&&e.name!=='AbortError'){error(card,'Не удалось воспроизвести локальную запись.');sync();}});sync();}
 function applySeek(){if(pending!==null&&Number.isFinite(audio?.duration)&&audio.duration>0){try{audio.currentTime=Math.min(audio.duration*pending,Math.max(0,audio.duration-.01));pending=null;}catch{}}}
 document.addEventListener('click',e=>{
  const target=e.target instanceof Element?e.target:null,b=target?.closest('[data-story-action],[data-story-variant]');if(!b)return;
  bind();const card=b.closest('[data-story-music]');if(!card||!audio)return;
  const variant=b.hasAttribute('data-story-variant'),n=variant?Number(b.dataset.storyVariant):selected.get(card.dataset.storyMusic)??0;
  const same=active===card&&index===n;if(!select(card,n))return;
  if(same&&!audio.paused&&!audio.ended){attempt++;audio.pause();sync();return;}
  if(audio.ended)audio.currentTime=0;play();
 });
 document.addEventListener('input',e=>{const el=e.target;if(!(el instanceof HTMLInputElement)||!el.matches('.story-seek'))return;const fraction=Number(el.value)/1000;bind();const card=el.closest('[data-story-music]');if(!card||!select(card,selected.get(card.dataset.storyMusic)??0))return;pending=fraction;applySeek();sync();});
 for(const event of ['play','playing','pause','ended','timeupdate','loadedmetadata','durationchange','error','emptied'])document.addEventListener(event,e=>{if(e.target!==audio)return;if(event==='loadedmetadata'||event==='durationchange')applySeek();if(event==='error'&&active)error(active,'Локальная запись недоступна.');sync();},true);
 function hash(){if(!/^\/scenario\/?$/.test(location.pathname)||!location.hash)return;let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const el=document.getElementById(id);if(!el?.closest('[data-story-book]')||el.matches('dialog[data-character-dialog]'))return;const part=el.closest('.story-part');if(part)part.open=true;if(el.id==='why-maslyanica')el.querySelector('details')?.setAttribute('open','');if(el.id==='story-history-title')el.closest('.story-history')?.querySelector('details')?.setAttribute('open','');requestAnimationFrame(()=>el.scrollIntoView({block:'start'}));}
 document.addEventListener('astro:before-swap',()=>{attempt++;audio?.pause();});
 document.addEventListener('astro:page-load',()=>{bind();hash();});
 window.addEventListener('hashchange',hash);bind();hash();
}
