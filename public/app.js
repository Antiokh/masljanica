// One global runtime. Astro swaps page DOM, not the document listeners.
(() => {
 if(window.__masljanicaRuntime)return;window.__masljanicaRuntime=true;
 const sw=navigator.serviceWorker;
 let state={ready:false,progress:null},latest=null,error='',checking=false,registrationFailed=false;
 const fmt=n=>((n||0)/1e6).toFixed(1).replace('.',',')+' МБ';
 const send=type=>sw?.controller?.postMessage({type});
 const syncTheme=()=>{const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=document.documentElement.dataset.theme==='light'?'#FFFFFF':'#101827';};
 new MutationObserver(syncTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
 function refreshCatalog(){
   const search=document.querySelector('#catalog-search'),filter=document.querySelector('#catalog-filter');if(!search)return;
   let count=0;
   document.querySelectorAll('[data-entry]').forEach(el=>{
     el.hidden=!(el.dataset.search||'').toLocaleLowerCase('ru').includes(search.value.trim().toLocaleLowerCase('ru'))||!!(filter?.value&&el.dataset.category!==filter.value);
     if(!el.hidden)count++;
   });
   document.querySelectorAll('.catalog-group').forEach(g=>g.hidden=!g.querySelector('[data-entry]:not([hidden])'));
   const empty=document.querySelector('#catalog-empty');if(empty)empty.hidden=count>0;
 }
 document.addEventListener('input',e=>{if(e.target?.id==='catalog-search')refreshCatalog();});
 document.addEventListener('change',e=>{if(e.target?.id==='catalog-filter')refreshCatalog();});
 document.addEventListener('play',e=>{if(e.target instanceof HTMLAudioElement)document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause();});},true);
 function render(){
   const label=document.querySelector('#offline-status'),size=document.querySelector('#offline-size'),button=document.querySelector('#offline-update'),remove=document.querySelector('#offline-delete'),bar=document.querySelector('#offline-progress');
   const busy=!!state.progress,stale=state.ready&&latest&&latest.version!==state.version;
   document.documentElement.dataset.offlineReady=String(state.ready);
   if(label)label.textContent=error||(!sw?'Офлайн-режим не поддерживается.':registrationFailed?'Не удалось запустить Service Worker.':!sw.controller?'Подключение Service Worker…':busy?'Загрузка: '+state.progress.done+' из '+(state.progress.total||'…')+' файлов':state.ready?(stale?'Доступно обновление. Старая копия сохранена.':'Офлайн-копия готова.'):'Полная копия ещё не скачана.');
   if(size)size.textContent=latest?'Размер полной копии: '+fmt(latest.bytes):state.ready?'Сохранено: '+fmt(state.bytes):'';
   if(button){button.disabled=!sw?.controller||busy||checking||!navigator.onLine;button.textContent=state.ready?(stale?'Обновить копию':'Проверить и обновить'):'Скачать для офлайна';}
   if(remove){remove.disabled=busy||!state.ready||!sw?.controller;}
   if(bar){bar.hidden=!busy;if(busy){bar.max=state.progress.totalBytes||1;bar.value=state.progress.bytes||0;}}
 }
 async function checkVersion(){
   if(checking||!navigator.onLine)return;
   checking=true;render();
   try{const r=await fetch('/offline-version.json',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(r.ok){const v=await r.json();if(v.schema===1)latest=v;}}catch{}finally{checking=false;render();}
 }
 document.addEventListener('click',e=>{
   const target=e.target instanceof Element?e.target:null;
   const menu=document.querySelector('.more-menu');if(menu?.open&&target&&!menu.contains(target))menu.open=false;
   if(target?.closest('#offline-update')){error='';state.progress={done:0,total:0,bytes:0,totalBytes:0};render();send('OFFLINE_DOWNLOAD');}
   if(target?.closest('#offline-delete')&&confirm('Удалить полную офлайн-копию?')){error='';send('OFFLINE_DELETE');}
 });
 sw?.addEventListener('message',e=>{
   const m=e.data;
   if(m?.type==='OFFLINE_STATUS')state=m;
   if(m?.type==='OFFLINE_PROGRESS')state.progress=m.progress;
   if(m?.type==='OFFLINE_COMPLETE'){error='';checkVersion();}
   if(m?.type==='OFFLINE_ERROR')error='Загрузка не завершена: '+m.message;
   render();
 });
 function pageLoad(){
   syncTheme();refreshCatalog();render();
   if(document.querySelector('#offline-status')){send('OFFLINE_STATUS');checkVersion();}
 }
 document.addEventListener('astro:page-load',pageLoad);
 window.addEventListener('online',()=>{render();if(document.querySelector('#offline-status'))checkVersion();});
 window.addEventListener('offline',render);
 sw?.addEventListener('controllerchange',()=>{send('OFFLINE_STATUS');render();});
 if(sw&&(location.protocol==='https:'||location.hostname==='localhost')){
   sw.register('/sw.js').then(()=>{send('OFFLINE_STATUS');render();}).catch(()=>{registrationFailed=true;render();});
 }
 pageLoad();
})();
