// RSLive-inspired network boundary: the HTML contains no external iframe src.
// Video differs from maps: a loaded player does not prove that its stream is available offline.
// Drop the player on a hot offline transition, and restore the original controls on reconnect.
export function installExternalEmbeds(){
  const selector='[data-external-embed]';
  function reset(root){
    const surface=root.querySelector('[data-embed-surface]');
    if(surface){surface.replaceChildren();surface.hidden=true;}
    const button=root.querySelector('[data-embed-load]');
    if(button)button.hidden=false;
  }
  function mount(root){
    if(!navigator.onLine||root.hidden)return;
    const surface=root.querySelector('[data-embed-surface]');
    if(!surface||surface.querySelector('iframe'))return;
    let url;
    try{url=new URL(root.dataset.embedSrc);}catch{return;}
    if(url.protocol!=='https:'||url.hostname!=='www.youtube-nocookie.com'||!/^\/embed\/[\w-]{11}$/.test(url.pathname))return;
    const frame=document.createElement('iframe');
    frame.className='video';
    frame.title='Видео';
    frame.loading='lazy';
    frame.referrerPolicy='strict-origin-when-cross-origin';
    frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen=true;
    frame.src=url.href;
    surface.replaceChildren(frame);
    surface.hidden=false;
    const button=root.querySelector('[data-embed-load]');
    if(button)button.hidden=true;
  }
  function refresh(){
    const online=navigator.onLine;
    document.documentElement.dataset.network=online?'online':'offline';
    for(const el of document.querySelectorAll('[data-online-only]'))el.hidden=!online;
    for(const root of document.querySelectorAll(selector)){
      if(!online){reset(root);continue;}
      if(root.dataset.embedMode==='auto')mount(root);
    }
  }
  document.addEventListener('click',event=>{
    const button=event.target instanceof Element?event.target.closest('[data-embed-load]'):null;
    if(!button)return;
    if(!navigator.onLine){refresh();return;}
    const root=button.closest(selector);
    if(root)mount(root);
  });
  document.addEventListener('astro:page-load',refresh);
  window.addEventListener('online',refresh);
  window.addEventListener('offline',refresh);
  window.addEventListener('pageshow',refresh);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
  refresh();
}
