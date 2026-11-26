// Delegated handlers survive Astro ClientRouter swaps. Native audio is the source of truth.
export function installSongList(){
  function sync(audio){
    const row=audio.closest('.song-row');
    const button=row?.querySelector('.song-play');
    if(!button)return;
    const playing=!audio.paused&&!audio.ended;
    button.dataset.playing=String(playing);
    button.setAttribute('aria-label',(playing?'Пауза: ':'Воспроизвести: ')+row.dataset.song);
    row.classList.toggle('is-playing',playing);
  }
  function error(audio,message=''){
    const el=audio.closest('.song-row')?.querySelector('.song-error');
    if(el){el.textContent=message;el.hidden=!message;}
  }
  function play(audio){
    error(audio);
    audio.play().catch(e=>{
      if(e.name==='AbortError')return;
      error(audio,'Не удалось воспроизвести запись. Проверьте подключение или офлайн-копию.');
      sync(audio);
      const row=audio.closest('.song-row');
      if(row)row.querySelector('details').open=true;
    });
    sync(audio);
  }
  document.addEventListener('click',e=>{
    const target=e.target instanceof Element?e.target:null;
    const button=target?.closest('.song-play');
    if(button){
      const audio=button.closest('.song-row')?.querySelector('audio');
      if(!audio)return;
      if(audio.paused||audio.ended)play(audio);else{audio.pause();sync(audio);}
      return;
    }
    const video=target?.closest('.song-video-load');
    if(video){
      const iframe=document.createElement('iframe');
      iframe.className='video';iframe.title='Видео исполнения';iframe.allowFullscreen=true;
      iframe.src=video.dataset.video;
      video.replaceWith(iframe);
    }
  });
  document.addEventListener('change',e=>{
    if(!(e.target instanceof HTMLSelectElement)||!e.target.matches('.song-variant'))return;
    const audio=e.target.closest('.song-row')?.querySelector('audio');
    if(!audio)return;
    const wasPlaying=!audio.paused&&!audio.ended;
    audio.pause();audio.src=e.target.value;audio.load();error(audio);sync(audio);
    if(wasPlaying)play(audio);
  });
  for(const event of ['play','playing','pause','ended','emptied','error'])document.addEventListener(event,e=>{
    if(e.target instanceof HTMLAudioElement&&e.target.matches('.song-audio')){
      sync(e.target);
      if(event==='error')error(e.target,'Запись недоступна.');
    }
  },true);
  function openHash(){
    if(location.pathname!=='/songs/'&&location.pathname!=='/songs')return;
    if(!location.hash)return;
    let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
    const row=document.getElementById(id);
    if(!row?.matches('.song-row'))return;
    const details=row.querySelector('details');if(details)details.open=true;
    requestAnimationFrame(()=>row.scrollIntoView({block:'start'}));
  }
  document.addEventListener('astro:page-load',openHash);
  window.addEventListener('hashchange',openHash);
  openHash();
}
