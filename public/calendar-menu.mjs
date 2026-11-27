// Same external-opening convention as Dobri Visarun; the Apple ICS is ours.
export function openCalendarLink(win,url){
 const bridge=win.Telegram?.WebApp;
 if(typeof bridge?.openLink==='function'){try{bridge.openLink(url);return true;}catch{}}
 return false; // Let the actual anchor handle ordinary browser navigation.
}
export function installCalendarMenu(win=window){
 const doc=win.document;
 const current=()=>doc.querySelector('[data-calendar-menu][open]');
 const close=(restore=false)=>{const menu=current();if(!menu)return;menu.open=false;if(restore)menu.querySelector('summary')?.focus({preventScroll:true});};
 doc.addEventListener('click',e=>{
  if(e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)return;
  const el=e.target instanceof win.Element?e.target:null;
  const link=el?.closest('[data-calendar-provider]');
  if(link){
   if(link.dataset.calendarProvider==='apple'&&!win.navigator.onLine){
    link.setAttribute('download','maslyanica.ics'); // Offline pack contains the actual ICS file.
   }else{
    link.removeAttribute('download');
    if(openCalendarLink(win,link.href))e.preventDefault();
   }
   close(true);return;
  }
  if(el&&!el.closest('[data-calendar-menu]'))close();
 });
 doc.addEventListener('keydown',e=>{if(e.key==='Escape'&&current()){e.preventDefault();close(true);}});
 doc.addEventListener('astro:before-swap',()=>close());
 function update(){
  const link=doc.querySelector('[data-calendar-provider="apple"]');if(!link)return;
  if(win.navigator.onLine)link.removeAttribute('download');else link.setAttribute('download','maslyanica.ics');
 }
 doc.addEventListener('astro:page-load',update);win.addEventListener('online',update);win.addEventListener('offline',update);update();
}
