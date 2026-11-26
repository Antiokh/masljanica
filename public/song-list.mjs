// One attached audio element, independent of accordion visibility.
// Queue order is the catalog order, then the archived variants of each song.
export function installSongList(){
  let audio=null,queue=[],index=-1,attempt=0;
  const rows=()=>[...document.querySelectorAll('.song-row')];
  const active=()=>queue[index];
  function showError(message=''){
    const el=document.getElementById('song-player-error');
    if(el){el.textContent=message;el.hidden=!message;}
  }
  function sync(){
    if(!audio||!audio.isConnected)return;
    const track=active(),playing=!!track&&!audio.paused&&!audio.ended&&!audio.error;
    for(const row of rows()){
      const button=row.querySelector('.song-play'),selected=track?.song===row.id;
      const on=selected&&playing;
      if(button){button.dataset.playing=String(on);button.setAttribute('aria-label',(on?'Пауза: ':'Воспроизвести: ')+row.dataset.song);}
      row.classList.toggle('is-playing',on);
      if(selected){const select=row.querySelector('.song-variant');if(select)select.value=track.src;}
    }
    const player=document.getElementById('song-player');
    if(!player)return;
    player.hidden=!track;
    if(!track)return;
    document.getElementById('song-player-title').textContent=track.title+(track.count>1?' · Запись '+(track.variant+1)+'/'+track.count:'');
    document.getElementById('song-player-position').textContent=(index+1)+' / '+queue.length;
    player.querySelector('[data-song-player="previous"]').disabled=index<=0;
    player.querySelector('[data-song-player="next"]').disabled=index>=queue.length-1;
  }
  function bind(){
    const next=document.getElementById('song-player-audio');
    if(next===audio)return;
    if(audio){attempt++;audio.pause();}
    audio=next;index=-1;queue=[];
    if(!audio)return;
    for(const row of rows()){
      let tracks;try{tracks=JSON.parse(row.dataset.tracks||'[]');}catch{continue;}
      for(const [variant,track] of tracks.entries()){
        if(!/^\/media\/audio\/[a-z0-9_-]+\.mp3$/.test(track.src))continue;
        queue.push({src:track.src,song:row.id,title:row.dataset.song,variant,count:tracks.length});
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
      showError('Не удалось воспроизвести локальную запись: '+(e.name==='NotAllowedError'?'нажмите Play в плеере.':'проверьте подключение или загрузите офлайн-копию.'));
      sync();
    });
    sync();
  }
  function select(next,autoplay=true){
    if(!audio||next<0||next>=queue.length)return;
    attempt++;
    audio.pause();index=next;
    // Assign only same-origin archived MP3 URLs. No old hosting fallback.
    audio.src=queue[index].src;
    audio.load();
    showError();sync();
    if(autoplay)play();
  }
  document.addEventListener('click',e=>{
    const target=e.target instanceof Element?e.target:null;
    const button=target?.closest('.song-play');
    if(button){
      bind();if(!audio)return;
      const row=button.closest('.song-row'),variant=row.querySelector('.song-variant')?.value;
      if(active()?.song===row.id&&(!variant||active().src===variant)){
        if(audio.paused||audio.ended){if(audio.ended)audio.currentTime=0;play();}
        else{attempt++;audio.pause();sync();}
      }else{
        const next=queue.findIndex(t=>t.song===row.id&&(!variant||t.src===variant));
        select(next);
      }
      return;
    }
    const action=target?.closest('[data-song-player]')?.dataset.songPlayer;
    if(action){bind();select(index+(action==='previous'?-1:1));}
  });
  document.addEventListener('change',e=>{
    if(!(e.target instanceof HTMLSelectElement)||!e.target.matches('.song-variant'))return;
    bind();
    const row=e.target.closest('.song-row');
    if(active()?.song!==row.id)return;
    select(queue.findIndex(t=>t.song===row.id&&t.src===e.target.value),!audio.paused&&!audio.ended);
  });
  for(const event of ['play','playing','pause','ended','emptied','error'])document.addEventListener(event,e=>{
    if(e.target!==audio)return;
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
    requestAnimationFrame(()=>row.scrollIntoView({block:'start'}));
  }
  document.addEventListener('astro:before-swap',()=>{if(audio){attempt++;audio.pause();}});
  document.addEventListener('astro:page-load',()=>{bind();openHash();});
  window.addEventListener('hashchange',openHash);
  bind();openHash();
}
