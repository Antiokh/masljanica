import {tr,currentPath,stripLocale,localeOf} from './i18n.mjs';
import { installCalendarMenu } from './calendar-menu.mjs';
import { installStoryBook } from './story-book.mjs';
import { installWorkshopGallery } from './workshop-gallery.mjs';
import { installGameList } from './game-list.mjs';
import { installCatalogMaster } from './catalog-master.mjs';
import { createRuntimeEnvironment } from './runtime-environment.mjs';
import { installFestivalSearch } from './festival-search.mjs';
import { installCharacterDialogs } from './character-dialogs.mjs';
import { installHomeSeason } from './home-season.mjs';
import { installPwaPresentation } from './pwa-presentation.mjs';
import { installExternalEmbeds } from './external-embeds.mjs';
import { installSongList } from './song-list.mjs';
import { PWA_DAILY_STORAGE_KEYS as KEYS, localDayKey, serializeDailyOffer, resolvePwaDailyState } from './pwa-daily-state.mjs';
// One global runtime. Astro swaps page DOM, not the document listeners.
(() => {
 if(window.__masljanicaRuntime)return;window.__masljanicaRuntime=true;
 const environment=createRuntimeEnvironment();
 installSongList();
 installGameList();
 installCatalogMaster();
 installWorkshopGallery();
 installStoryBook();
 installExternalEmbeds();
 installHomeSeason();
 installCalendarMenu();
 installCharacterDialogs();
 installFestivalSearch();
 const sw=environment.serviceWorker;
 // Warm the small, frequently used section documents once per controller,
 // without holding up the first paint or triggering media downloads.
 let warmedController=null;
 function warmNavigation(){
   const controller=sw?.controller;
   if(!controller||controller===warmedController||!navigator.onLine||navigator.connection?.saveData||/^(slow-2g|2g)$/.test(navigator.connection?.effectiveType||''))return;
   warmedController=controller;
   const run=async()=>{
     const routes=['/','/songs/','/games/','/scenario/','/workshops/','/pancakes/','/history/'];
     for(const path of routes){
       if(!navigator.onLine||sw.controller!==controller)return;
       if(location.pathname===currentPath(path))continue;
       try{const response=await fetch(path,{priority:'low',signal:AbortSignal.timeout(5000),headers:{Accept:'text/html'}});if(response.ok)await response.arrayBuffer();}catch{}
     }
   };
   if('requestIdleCallback' in window)window.requestIdleCallback(()=>{void run();},{timeout:3000});
   else setTimeout(()=>{void run();},800);
 }
 // Local diagnostic only. Inspect Performance entries in DevTools.
 document.addEventListener('astro:before-preparation',()=>performance.mark('masljanica-nav-start'));
 document.addEventListener('astro:after-swap',()=>{if(performance.getEntriesByName('masljanica-nav-start').length){performance.measure('masljanica-nav-swap','masljanica-nav-start');performance.clearMarks('masljanica-nav-start');if(performance.getEntriesByName('masljanica-nav-swap').length>100)performance.clearMeasures('masljanica-nav-swap');}});

 let state={ready:false,progress:null},latest=null,error='',checking=false,registrationFailed=false;
 let readiness='unknown',verified=false,installPrompt=null,lastCheck=0,offer=null,autoAttempt=null;
 const PREF='masljanica-pwa-offline-preference-v1';
 const get=k=>{try{return localStorage.getItem(k);}catch{return null;}};
 const set=(k,v)=>{try{localStorage.setItem(k,v);return true;}catch{return false;}};
 const accepted=()=>get(KEYS.storageNoticeAck)==='1';
 const automatic=()=>get(PREF)==='enabled';
 const standalone=environment.isStandalone;
 const noteStandalone=()=>{if(standalone())set(KEYS.lastStandaloneDate,localDayKey());};
 const presentation=installPwaPresentation({onOpen:()=>{send('OFFLINE_STATUS');checkVersion();render();}});
 const startDownload=()=>{
   if(!accepted()||!verified||!sw?.controller||state.progress||state.deleting||!navigator.onLine)return;
   error='';state.progress={done:0,total:0,bytes:0,totalBytes:0};offer=null;render();send('OFFLINE_DOWNLOAD');
 };
 function resolveOffer(){
   noteStandalone();
   if(!accepted()||!verified||!sw?.controller||state.progress||state.deleting||!navigator.onLine||error)return;
   const stale=!!(state.ready&&latest&&latest.version!==state.version);
   const result=resolvePwaDailyState({
     storageAccepted:true,isStandalone:standalone()||environment.isTelegram,lastStandaloneDate:get(KEYS.lastStandaloneDate),
     dailyOffer:get(KEYS.dailyOffer),installPromptAvailable:environment.canOfferInstall()&&!!installPrompt,
     offlinePackCapabilityAvailable:verified,offlineCopyAvailable:state.ready,
     offlineCopyStale:stale,offlineAutoUpdateEnabled:automatic()&&!!latest
   });
   if(result.state==='offline-update-automatic'){
     const target=latest?.version;
     if(target&&autoAttempt!==target){autoAttempt=target;startDownload();}
     return;
   }
   if(offer)return;
   if(['install','offline-download','offline-update'].includes(result.state)){
     if(result.state!=='install'&&!latest)return;
     // An offer counts only if the presentation exists on the current page.
     if(document.querySelector('#pwa-offer')&&set(KEYS.dailyOffer,serializeDailyOffer(result.state)))offer=result.state;
   }
 }
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();if(!environment.canOfferInstall())return;installPrompt=e;resolveOffer();render();});
 window.addEventListener('appinstalled',()=>{installPrompt=null;offer=null;render();});

 const fmt=n=>((n||0)/1e6).toFixed(1).replace('.',',')+tr(' МБ');
 const send=type=>sw?.controller?.postMessage({type});
 // Telegram owns its native chrome and meta theme-color in runtime-environment.
 // In browsers/PWA read the resolved CSS token, including future palette changes.
 const syncTheme=()=>{
   if(environment.isTelegram)return;
   const root=document.documentElement,meta=document.querySelector('meta[name="theme-color"]');
   const color=getComputedStyle(root).getPropertyValue('--sl-color-bg').trim()||(root.dataset.theme==='light'?'#FFFFFF':'#101827');
   if(meta&&meta.content!==color)meta.content=color;
 };
 new MutationObserver(syncTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
 window.matchMedia('(prefers-color-scheme: light)').addEventListener?.('change',()=>requestAnimationFrame(syncTheme));
 window.addEventListener('pageshow',syncTheme);
 function refreshCatalog(){
   const search=document.querySelector('#catalog-search'),filter=document.querySelector('#catalog-filter');if(!search)return;
   const category=document.querySelector('[data-game-filter="category"][aria-pressed="true"],[data-ditty-filter][aria-pressed="true"]')?.dataset.value;
   const audience=document.querySelector('[data-game-filter="audience"][aria-pressed="true"]')?.dataset.value;
   let count=0;
   document.querySelectorAll('[data-entry]').forEach(el=>{
     el.hidden=!(el.dataset.search||'').toLocaleLowerCase('ru').includes(search.value.trim().toLocaleLowerCase('ru'))||!!(filter?.value&&el.dataset.category!==filter.value)||!!(category&&(category==='political'?el.dataset.political!=='true':el.dataset.category!==category))||!!(audience&&el.dataset.audience!==audience);
     if(!el.hidden)count++;
   });
   document.querySelectorAll('.catalog-group').forEach(g=>g.hidden=!g.querySelector('[data-entry]:not([hidden])'));
   const empty=document.querySelector('#catalog-empty');if(empty)empty.hidden=count>0;
   const total=document.querySelector('#game-count');if(total)total.textContent=tr('Найдено игр: ')+count;
   const dittyCount=document.querySelector('#ditty-count');if(dittyCount)dittyCount.textContent=tr('Найдено: ')+count;
   document.dispatchEvent(new Event('catalog:filter'));
 }
 document.addEventListener('input',e=>{if(e.target?.id==='catalog-search')refreshCatalog();});
 document.addEventListener('change',e=>{if(e.target?.id==='catalog-filter')refreshCatalog();});
 document.addEventListener('click',e=>{const button=e.target instanceof Element?e.target.closest('[data-game-filter],[data-ditty-filter]'):null;if(!button)return;for(const item of button.parentElement.querySelectorAll('[data-game-filter],[data-ditty-filter]'))item.setAttribute('aria-pressed',String(item===button));refreshCatalog();});
 document.addEventListener('play',e=>{if(e.target instanceof HTMLAudioElement)document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause();});},true);
 function render(){
   const busy=!!state.progress,deleting=!!state.deleting,stale=state.ready&&latest&&latest.version!==state.version;
   const notice=document.querySelector('#pwa-storage-notice'),prompt=document.querySelector('#pwa-offer'),message=document.querySelector('#pwa-offer-message'),action=document.querySelector('#pwa-offer-action');
   if(notice)notice.hidden=accepted()||!sw;
   if(prompt)prompt.hidden=!accepted()||!offer||busy||deleting;
   if(message&&offer)message.textContent=offer==='install'?tr('Установите Масляницу на устройство.'):(offer==='offline-download'?tr('Скачайте материалы праздника'):tr('Доступна новая версия материалов'))+(latest?' · '+fmt(latest.bytes):'')+'.';
   if(action&&offer)action.textContent=offer==='install'?tr('Установить'):offer==='offline-download'?tr('Скачать'):tr('Обновить');
   presentation.render({online:navigator.onLine,standalone:standalone(),launchLabel:environment.launchLabel(),readiness,ready:state.ready,stale:!!stale,busy,deleting,checking,progress:state.progress,automatic:automatic(),canChange:accepted()&&verified&&!deleting,canDelete:verified&&!busy&&!deleting&&(state.ready||state.staging),canDownload:accepted()&&verified&&!busy&&!deleting&&!checking&&navigator.onLine,error:error||(registrationFailed?tr('Не удалось запустить Service Worker.'):!sw?tr('Офлайн-режим не поддерживается.'):'')});

   environment.observeCopy({verified,ready:state.ready,version:state.version});
   document.documentElement.dataset.offlineReady=String(state.ready);
   document.documentElement.dataset.offlineReadiness=readiness;
 }
 async function checkVersion(force=false){
   if(!accepted()||checking||!navigator.onLine||(!force&&Date.now()-lastCheck<60000))return;
   checking=true;lastCheck=Date.now();render();
   try{const r=await fetch('/offline-version.json',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(r.ok){const v=await r.json();if(v.schema===1)latest=v;}}catch{}finally{checking=false;resolveOffer();render();}
 }
 document.addEventListener('click',e=>{
   const target=e.target instanceof Element?e.target:null;
   const menu=document.querySelector('.more-menu');if(menu?.open&&target&&!menu.contains(target)&&!target.closest('#festival-pwa-menu'))menu.open=false;
   if(target?.closest('[data-pwa-download]')&&accepted())startDownload();
   if(target?.closest('[data-pwa-auto]')&&accepted()&&verified){set(PREF,automatic()?'disabled':'enabled');autoAttempt=null;error='';resolveOffer();checkVersion(true);render();}
   if(target?.closest('[data-pwa-delete]')&&verified&&!state.progress&&!state.deleting&&confirm(tr('Удалить офлайн-данные?'))){error='';set(PREF,'disabled');autoAttempt=null;state.deleting=true;send('OFFLINE_DELETE');render();}
   if(target?.closest('#pwa-storage-accept')){set(KEYS.storageNoticeAck,'1');resolveOffer();checkVersion(true);render();}
   if(target?.closest('#pwa-offer-dismiss')){offer=null;render();}
   if(target?.closest('#pwa-offer-action')){
     const current=offer;offer=null;render();
     if(current==='install'&&environment.canOfferInstall()&&installPrompt){const p=installPrompt;installPrompt=null;p.prompt().catch(()=>{});}
     if(current==='offline-download'){set(PREF,'enabled');startDownload();}else if(current==='offline-update')startDownload();
   }
 });
 sw?.addEventListener('message',e=>{
   const m=e.data;
   if(m?.type==='OFFLINE_STATUS'){const wasDeleting=state.deleting;state=m;if(wasDeleting&&!m.deleting)presentation.refreshStorage();verified=m.capability===2;readiness=verified?(m.ready?'ready':'unavailable'):'unknown';if(verified)resolveOffer();}
   if(m?.type==='OFFLINE_PROGRESS')state.progress=m.progress;
   if(m?.type==='OFFLINE_COMPLETE'){error='';presentation.refreshStorage();checkVersion(true);}
   if(m?.type==='OFFLINE_ERROR')error=tr('Загрузка не завершена: ')+m.message;
   if(m?.type==='OFFLINE_DELETE_ERROR')error=tr('Не удалось удалить данные: ')+m.message;
   render();
 });
 function pageLoad(){
   environment.sync();syncTheme();refreshCatalog();render();
   noteStandalone();if(!verified)send('OFFLINE_STATUS');resolveOffer();render();warmNavigation();
 }
 document.addEventListener('astro:page-load',pageLoad);
 window.addEventListener('online',()=>{autoAttempt=null;error='';render();checkVersion(true);warmNavigation();});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){send('OFFLINE_STATUS');checkVersion();}});
 window.addEventListener('offline',render);
 sw?.addEventListener('controllerchange',()=>{verified=false;readiness='unknown';send('OFFLINE_STATUS');checkVersion(true);render();warmNavigation();});
 if(sw&&(location.protocol==='https:'||location.hostname==='localhost')){
   sw.register('/sw.js').then(()=>{send('OFFLINE_STATUS');checkVersion();render();}).catch(()=>{registrationFailed=true;readiness='unavailable';render();});
 }
 pageLoad();
})();
