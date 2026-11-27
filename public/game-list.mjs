// One native audio on the games catalog, deliberately no auto-advance.
export function installGameList(){
 let audio=null,active=null,pending=null,attempt=0;
 const fmt=n=>Math.floor(Math.max(0,n)/60)+':'+String(Math.floor(Math.max(0,n)%60)).padStart(2,'0');
 const error=msg=>{const el=document.querySelector('#game-audio-error');if(el){el.textContent=msg;el.hidden=!msg;}};
 function sync(){
  if(!audio?.isConnected)return;
  for(const track of document.querySelectorAll('[data-game-track]')){
   const current=track===active,playing=current&&!audio.paused&&!audio.ended&&!audio.error;
   const duration=current&&Number.isFinite(audio.duration)?audio.duration:Number(track.dataset.duration)||0;
   const time=current?(pending!==null?pending*duration:audio.currentTime):0;
   const pct=duration?Math.max(0,Math.min(100,time/duration*100)):0;
   track.dataset.playing=String(playing);track.style.setProperty('--game-progress',pct+'%');track.style.setProperty('--game-ring-progress',String(pct));
   const range=track.querySelector('.game-seek');range.value=String(Math.round(pct*10));range.setAttribute('aria-valuetext',fmt(time)+' / '+fmt(duration));
   track.querySelector('.game-track-time').textContent=current?fmt(time)+' / '+fmt(duration):fmt(duration);
   track.querySelector('button').setAttribute('aria-label',(playing?'Пауза: ':'Воспроизвести: ')+track.closest('.game-card').querySelector('.game-heading strong').textContent);
  }
 }
 function bind(){const next=document.querySelector('#game-audio');if(audio===next)return;if(audio)audio.pause();audio=next;active=null;pending=null;attempt++;sync();}
 function select(track){if(!audio||!/^\/media\/audio\/[a-z0-9_-]+\.mp3$/.test(track.dataset.gameTrack))return false;if(active!==track){attempt++;audio.pause();active=track;pending=null;audio.src=track.dataset.gameTrack;audio.load();}return true;}
 function seek(){if(pending!==null&&Number.isFinite(audio?.duration)&&audio.duration>0){try{audio.currentTime=Math.min(audio.duration*pending,Math.max(0,audio.duration-.01));pending=null;}catch{}}}
 function openHash(){if(!location.pathname.match(/^\/games\/?$/)||!location.hash)return;let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const row=document.getElementById(id);if(row?.matches('.game-card')){row.querySelector('details').open=true;if(!matchMedia('(min-width:60rem)').matches)requestAnimationFrame(()=>row.scrollIntoView({block:'start'}));}}
 document.addEventListener('click',e=>{
  const target=e.target instanceof Element?e.target:null,button=target?.closest('.game-audio-toggle');if(!button)return;
  bind();const track=button.closest('[data-game-track]');if(!select(track))return;
  if(!audio.paused&&!audio.ended){attempt++;audio.pause();sync();return;}
  if(audio.ended)audio.currentTime=0;error('');const token=++attempt;
  audio.play().catch(e=>{if(token===attempt&&e.name!=='AbortError'){error('Не удалось воспроизвести локальную запись. Проверьте офлайн-копию или подключение.');sync();}});sync();
 });
 document.addEventListener('input',e=>{const range=e.target;if(!(range instanceof HTMLInputElement)||!range.matches('.game-seek'))return;const fraction=Number(range.value)/1000;bind();if(!select(range.closest('[data-game-track]')))return;pending=fraction;seek();sync();});
 for(const event of ['play','playing','pause','ended','timeupdate','loadedmetadata','durationchange','error','emptied'])document.addEventListener(event,e=>{if(e.target!==audio)return;if(event==='loadedmetadata'||event==='durationchange')seek();if(event==='error'&&active)error('Локальная запись недоступна.');sync();},true);
 document.addEventListener('astro:before-swap',()=>{attempt++;audio?.pause();});
 document.addEventListener('astro:page-load',()=>{bind();openHash();});
 window.addEventListener('hashchange',openHash);bind();openHash();
}
