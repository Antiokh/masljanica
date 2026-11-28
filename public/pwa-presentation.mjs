import {tr,currentPath,stripLocale,localeOf} from './i18n.mjs';
// Presentation only. All state and commands belong to the PWA controller.
export function installPwaPresentation({onOpen}={}){
  let closeTimer,anchor,returningFocus,pinned=false,estimate=null,estimatePending=false,lastEstimate=0;
  const panel=()=>document.querySelector('#festival-pwa-menu');
  const fmt=n=>((n||0)/1e6).toFixed(1).replace('.',',')+tr(' МБ');
  function setValue(key,value){document.querySelectorAll('[data-pwa-value="'+key+'"]').forEach(el=>{if(el.textContent!==value)el.textContent=value;});}
  async function readStorage(force=false){
    if(estimatePending||(!force&&Date.now()-lastEstimate<30000)||!navigator.storage?.estimate)return;
    estimatePending=true;
    try{const info=await navigator.storage.estimate();estimate=Number.isFinite(info.usage)?fmt(info.usage):null;lastEstimate=Date.now();setValue('storage',estimate||'—');}catch{}finally{estimatePending=false;}
  }
  function position(){
    const p=panel();if(!p?.matches(':popover-open')||!anchor?.isConnected)return;
    const rect=anchor.getBoundingClientRect(),gap=8,margin=12;
    const width=p.offsetWidth,height=p.offsetHeight,above=rect.bottom+gap+height>innerHeight-margin;
    p.style.left=Math.max(margin,Math.min(rect.left,innerWidth-width-margin))+'px';
    p.style.top=Math.max(margin,Math.min(above?rect.top-gap-height:rect.bottom+gap,innerHeight-height-margin))+'px';
  }
  function close(){clearTimeout(closeTimer);const p=panel();if(p?.matches(':popover-open'))p.hidePopover();document.querySelectorAll('[data-pwa-menu-trigger]').forEach(el=>el.setAttribute('aria-expanded','false'));anchor=null;pinned=false;}
  function open(trigger, pin=false){
    clearTimeout(closeTimer);const p=panel();if(!p?.showPopover)return;
    if(p.matches(':popover-open')&&anchor===trigger){if(pin)pinned=true;return;}
    anchor=trigger;pinned=pin;
    if(!p.matches(':popover-open'))p.showPopover();
    document.querySelectorAll('[data-pwa-menu-trigger]').forEach(el=>el.setAttribute('aria-expanded',String(el===trigger)));
    position();void readStorage();onOpen?.();
  }
  function delayedClose(){if(pinned)return;clearTimeout(closeTimer);closeTimer=setTimeout(()=>{if(!panel()?.matches(':hover,:focus-within')&&!anchor?.matches(':hover,:focus-visible'))close();},180);}
  document.addEventListener('click',e=>{
    const trigger=e.target instanceof Element?e.target.closest('[data-pwa-menu-trigger]'):null;
    if(!trigger)return;
    e.preventDefault();
    if(panel()?.matches(':popover-open')&&anchor===trigger&&pinned){close();return;}
    open(trigger,true);
  });
  document.addEventListener('pointerover',e=>{
    if(e.pointerType!=='mouse'||!matchMedia('(min-width:60.001rem) and (hover:hover)').matches)return;
    const el=e.target instanceof Element?e.target:null;
    if(el?.closest('.festival-brand-icon'))open(el.closest('.festival-brand-icon'));
    if(el?.closest('#festival-pwa-menu'))clearTimeout(closeTimer);
  });
  document.addEventListener('pointerout',e=>{
    if(e.pointerType!=='mouse')return;
    const el=e.target instanceof Element?e.target.closest('.festival-brand-icon,#festival-pwa-menu'):null;
    if(el&&!el.contains(e.relatedTarget))delayedClose();
  });
  document.addEventListener('focusin',e=>{if(e.target instanceof Element&&e.target.matches('.festival-brand-icon:focus-visible')&&!panel()?.matches(':popover-open')){if(e.target===returningFocus)return;open(e.target);}});
  document.addEventListener('focusout',delayedClose);
  document.addEventListener('toggle',e=>{if(e.target===panel()&&e.newState==='closed'){document.querySelectorAll('[data-pwa-menu-trigger]').forEach(el=>el.setAttribute('aria-expanded','false'));anchor=null;pinned=false;}},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel()?.matches(':popover-open')){const trigger=anchor;close();returningFocus=trigger;trigger?.focus({preventScroll:true});returningFocus=null;}},true);
  document.addEventListener('toggle',e=>{if(e.target?.matches?.('.telegram-runtime-diagnostics'))position();},true);
  window.addEventListener('resize',position);
  document.addEventListener('astro:before-swap',close);
  return {render(model){
    const {online,standalone,launchLabel,readiness,ready,stale,busy,deleting,progress,automatic,canChange,canDelete,canDownload,error}=model;
    const percent=progress?.total?Math.min(100,Math.floor(100*progress.done/progress.total)):0;
    const copy=deleting?tr('Удаление…'):busy?(ready?tr('Обновление '):tr('Загрузка '))+(progress?.total?percent+'%':'…'):readiness==='unknown'?tr('Проверяем…'):stale?tr('Устарела'):ready?tr('Готова'):tr('Не скачана');
    setValue('connection',online?tr('Онлайн'):ready?tr('Офлайн · копия доступна'):readiness==='unknown'?tr('Офлайн · проверяем'):tr('Офлайн · копии нет'));
    setValue('launch',launchLabel||(standalone?tr('Приложение'):tr('Браузер')));setValue('copy',copy);setValue('compact',tr('Офлайн-копия · ')+copy);setValue('storage',estimate||'—');setValue('percent',progress?.total?percent+'%':'…');
    const dot=document.querySelector('#offline-indicator');if(dot)dot.dataset.state=busy||deleting?'busy':online?'online':readiness==='unknown'?'unknown':ready?'ready':'unavailable';
    document.querySelectorAll('[data-pwa-auto]').forEach(el=>{el.setAttribute('aria-checked',String(automatic));el.disabled=!canChange;});
    document.querySelectorAll('[data-pwa-delete]').forEach(el=>el.disabled=!canDelete);
    document.querySelectorAll('[data-pwa-download]').forEach(el=>{el.disabled=!canDownload;el.textContent=ready?tr('Обновить'):tr('Скачать');});
    document.querySelectorAll('[data-pwa-progress],[data-pwa-nav-progress]').forEach(el=>el.hidden=!busy);
    document.querySelectorAll('[data-pwa-bar]').forEach(el=>{if(progress?.total)el.value=percent;else el.removeAttribute('value');});
    document.querySelectorAll('[data-pwa-error]').forEach(el=>{el.hidden=!error;el.textContent=error||'';});
    position();
  },refreshStorage:()=>readStorage(true)};
}
