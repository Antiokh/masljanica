// Shared pure calendar logic for build validation and offline/SPA presentation.
export function validEventDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const d=new Date(value+'T00:00:00Z');
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;
}
export function calendarDay(now=new Date(),timezone='Europe/Belgrade'){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get=type=>parts.find(p=>p.type===type)?.value;
  return get('year')+'-'+get('month')+'-'+get('day');
}
export function seasonState(config,now=new Date()){
  if(config?.enabled!==true||!validEventDate(config.date))return {event:false,schedule:false};
  try{
    const current=config.date>=calendarDay(now,config.timezone);
    return {event:current,schedule:current&&config.schedule===true};
  }catch{return {event:false,schedule:false};}
}
export function installHomeSeason(){
  let timer;
  function refresh(){
    clearTimeout(timer);
    const root=document.querySelector('[data-home-dashboard]');
    if(!root)return;
    const config={enabled:root.dataset.eventEnabled==='true',date:root.dataset.eventDate,timezone:root.dataset.eventTimezone,schedule:root.dataset.scheduleEnabled==='true'};
    const state=seasonState(config);
    root.querySelectorAll('[data-home-season]').forEach(el=>{el.hidden=!state[el.dataset.homeSeason];});
    root.querySelectorAll('[data-home-timeless]').forEach(el=>{el.hidden=state.event;});
    const online=navigator.onLine;
    root.querySelectorAll('img[data-home-character-src]').forEach(img=>{
      if(!online){img.hidden=true;img.removeAttribute('src');}
      else if(!img.hasAttribute('src')){img.hidden=true;img.src=img.dataset.homeCharacterSrc;}
      else if(img.complete&&img.naturalWidth>0)img.hidden=false;
    });
    // An open offline page also expires after midnight without navigation.
    timer=setTimeout(refresh,30000);
  }
  document.addEventListener('load',e=>{if(e.target instanceof HTMLImageElement&&e.target.matches('[data-home-character-src]')&&navigator.onLine&&e.target.naturalWidth>0)e.target.hidden=false;},true);
  document.addEventListener('error',e=>{if(e.target instanceof HTMLImageElement&&e.target.matches('[data-home-character-src]'))e.target.hidden=true;},true);
  document.addEventListener('astro:before-swap',()=>clearTimeout(timer));
  document.addEventListener('astro:page-load',refresh);
  window.addEventListener('pageshow',refresh);
  window.addEventListener('online',refresh);
  window.addEventListener('offline',refresh);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
  refresh();
}
