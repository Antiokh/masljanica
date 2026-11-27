// One attached audio element, independent of accordion visibility.
// Queue order is the catalog order, then the archived variants of each song.
export function installSongList(){
  let audio=null,queue=[],index=-1,attempt=0,pendingSeek=null;
  const selectedBySong=new Map();
  const fmt=seconds=>Math.floor(Math.max(0,seconds)/60)+':'+String(Math.floor(Math.max(0,seconds)%60)).padStart(2,'0');
  const progress=()=>pendingSeek!==null?pendingSeek*100:Number.isFinite(audio?.duration)&&audio.duration>0?Math.min(100,Math.max(0,audio.currentTime/audio.duration*100)):0;
  const rows=()=>[...document.querySelectorAll('.song-row')];
  const active=()=>queue[index];
  function showError(message=''){
    const el=document.getElementById('song-player-error');
    if(el){el.textContent=message;el.hidden=!message;}
  }
  function sync(){
    if(!audio||!audio.isConnected)return;
    const track=active(),playing=!!track&&!audio.paused&&!audio.ended&&!audio.error;
    const panel=document.getElementById('song-player');
    if(panel){
      const display=track||queue[0];
      const toggle=panel.querySelector('[data-playlist-action="toggle"]');
      const prev=panel.querySelector('[data-playlist-action="previous"]'),next=panel.querySelector('[data-playlist-action="next"]');
      toggle.disabled=!display;toggle.dataset.playing=String(playing);
      toggle.setAttribute('aria-label',playing?'Пауза':'Воспроизвести плейлист');
      toggle.style.setProperty('--song-progress',String(track?progress():0));
      prev.disabled=index<=0;next.disabled=!display||Math.max(0,index)>=queue.length-1;
      if(display){
        panel.querySelector('#playlist-title').textContent=display.title;
        panel.querySelector('#playlist-variant').textContent='Запись '+(display.variant+1)+' из '+display.count;
        panel.querySelector('#playlist-position').textContent=(Math.max(0,index)+1)+' / '+queue.length;
        const total=track&&Number.isFinite(audio.duration)?audio.duration:display.duration||0;
        const position=track?(pendingSeek!==null?pendingSeek*total:audio.currentTime):0;
        panel.querySelector('#playlist-time').textContent=fmt(position)+' / '+fmt(total);
        const seek=panel.querySelector('#playlist-seek'),percent=track?progress():0;
        seek.value=String(Math.round(percent*10));seek.style.setProperty('--seek-progress',percent+'%');
        seek.setAttribute('aria-valuetext',fmt(position)+' / '+fmt(total));
      }
    }
    for(const row of rows()){
      const button=row.querySelector('.song-play'),current=track?.song===row.id;
      const on=current&&playing;
      if(button){button.dataset.playing=String(on);button.setAttribute('aria-label',(on?'Пауза: ':'Воспроизвести: ')+row.dataset.song);button.style.setProperty('--song-progress',current?String(progress()):'0');}
      row.classList.toggle('is-playing',on);
      const selected=selectedBySong.get(row.id)??0;
      for(const variant of row.querySelectorAll('.song-variant')){
        const n=Number(variant.dataset.variant),isSelected=n===selected,isCurrent=current&&track.variant===n;
        variant.dataset.selected=String(isSelected);
        variant.dataset.playing=String(isCurrent&&playing);
        const toggle=variant.querySelector('.song-variant-toggle');
        toggle?.setAttribute('aria-pressed',String(isSelected));
        toggle?.setAttribute('aria-label',((isCurrent&&playing)?'Пауза: ':'Воспроизвести: ')+'запись '+(n+1)+' — '+row.dataset.song);
        const info=variant.querySelector('.song-variant-info');if(info)info.inert=!isSelected;
        variant.style.setProperty('--song-progress',isCurrent?String(progress()):'0');
        const time=variant.querySelector('.song-variant-time');
        const total=isCurrent&&Number.isFinite(audio.duration)?audio.duration:Number(time?.dataset.duration)||0;
        const position=isCurrent?(pendingSeek!==null?pendingSeek*total:audio.currentTime):0;
        if(time)time.textContent=isCurrent?fmt(position)+' / '+fmt(total):fmt(total);
        const seek=variant.querySelector('.song-seek');
        if(seek){
          const percent=isCurrent?progress():0;
          seek.value=String(Math.round(percent*10));
          seek.style.setProperty('--seek-progress',percent+'%');
          seek.setAttribute('aria-valuetext',fmt(position)+' / '+fmt(total));
        }
      }
    }
  }
  function bind(){
    const next=document.getElementById('song-player-audio');
    if(next===audio)return;
    if(audio){attempt++;audio.pause();}
    audio=next;index=-1;queue=[];pendingSeek=null;selectedBySong.clear();
    if(!audio)return;
    for(const row of rows()){
      let tracks;try{tracks=JSON.parse(row.dataset.tracks||'[]');}catch{continue;}
      for(const [variant,track] of tracks.entries()){
        if(!/^\/media\/audio\/[a-z0-9_-]+\.mp3$/.test(track.src))continue;
        queue.push({src:track.src,song:row.id,title:row.dataset.song,variant,count:tracks.length,duration:track.duration});
      }
    }
    sync();
  }
  function play(){
    if(!audio||!active())return;
    const current=audio,token=++attempt;
    showError();
    // Invoke play synchronously during the user's click, preserving mobile activation.
    current.play().catch(e=>{
      if(token!==attempt||audio!==current||e.name==='AbortError')return;
      showError('Не удалось воспроизвести локальную запись: '+(e.name==='NotAllowedError'?'нажмите Play ещё раз.':'проверьте подключение или загрузите офлайн-копию.'));
      sync();
    });
    sync();
  }
  function select(next,autoplay=true){
    if(!audio||next<0||next>=queue.length)return;
    attempt++;pendingSeek=null;
    audio.pause();index=next;selectedBySong.set(queue[index].song,queue[index].variant);
    // Assign only same-origin archived MP3 URLs. No old hosting fallback.
    audio.src=queue[index].src;
    audio.load();
    showError();sync();
    if(autoplay)play();
  }
  document.addEventListener('click',e=>{
    const target=e.target instanceof Element?e.target:null;
    const action=target?.closest('[data-playlist-action]')?.dataset.playlistAction;
    if(action){
      bind();if(!audio||!queue.length)return;
      if(action==='previous'){select(index-1);return;}
      if(action==='next'){select(Math.max(0,index)+1);return;}
      if(index<0){select(0);return;}
      if(audio.paused||audio.ended){if(audio.ended)audio.currentTime=0;play();}
      else{attempt++;audio.pause();sync();}
      return;
    }
    const button=target?.closest('.song-play,.song-variant-toggle');
    if(!button)return;
    bind();if(!audio)return;
    const row=button.closest('.song-row');
    const variant=button.matches('.song-variant-toggle')?Number(button.closest('.song-variant').dataset.variant):(selectedBySong.get(row.id)??0);
    const next=queue.findIndex(t=>t.song===row.id&&t.variant===variant);
    if(next<0)return;
    if(index===next){
      if(audio.paused||audio.ended){if(audio.ended)audio.currentTime=0;play();}
      else{attempt++;audio.pause();sync();}
    }else select(next);
  });
  function applySeek(){
    if(pendingSeek===null||!audio||!Number.isFinite(audio.duration)||audio.duration<=0)return;
    const fraction=pendingSeek;
    try{audio.currentTime=Math.min(audio.duration*fraction,Math.max(0,audio.duration-.01));pendingSeek=null;}catch{}
  }
  document.addEventListener('input',e=>{
    const slider=e.target;
    if(!(slider instanceof HTMLInputElement)||!slider.matches('.song-seek'))return;
    const fraction=Math.min(1,Math.max(0,Number(slider.value)/1000));
    if(slider.id==='playlist-seek'){
      bind();if(!audio||!queue.length)return;
      if(index<0)select(0,false);
      pendingSeek=fraction;applySeek();sync();return;
    }
    const variant=slider.closest('.song-variant'),row=slider.closest('.song-row');
    if(variant?.dataset.selected!=='true'||!row)return;
    bind();
    const next=queue.findIndex(t=>t.song===row.id&&t.variant===Number(variant.dataset.variant));
    if(next<0)return;
    // Scrubbing a previously idle recording prepares it without autoplay.
    if(index!==next)select(next,false);
    pendingSeek=fraction;applySeek();sync();
  });
  for(const event of ['play','playing','pause','ended','emptied','error','timeupdate','loadedmetadata','durationchange'])document.addEventListener(event,e=>{
    if(e.target!==audio)return;
    if(event==='loadedmetadata'||event==='durationchange')applySeek();
    if(event==='ended'&&index+1<queue.length){select(index+1);return;}
    if(event==='error'&&active())showError('Локальная запись недоступна. Проверьте подключение или офлайн-копию.');
    sync();
  },true);
  function openHash(){
    if(!location.hash)return;
    let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
    const row=document.getElementById(id);
    if(!row?.matches('.song-row'))return;
    const details=row.querySelector('details');if(details)details.open=true;
    if(!matchMedia('(min-width:60rem)').matches)requestAnimationFrame(()=>row.scrollIntoView({block:'start'}));
  }
  document.addEventListener('astro:before-swap',()=>{if(audio){attempt++;audio.pause();}});
  document.addEventListener('astro:page-load',()=>{bind();openHash();});
  window.addEventListener('hashchange',openHash);
  bind();openHash();
}
