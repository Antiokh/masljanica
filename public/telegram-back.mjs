// Adapted from dobri-visarun/src/lib/telegram.ts, setupTelegramBackNavigation.
// Astro owns document swaps. This guard is an interception mechanism, not a route stack.
const KEY='__masljanicaTelegramBackGuard';
const PEERS=new Set(['/','/songs/','/games/']);
const SECTIONS=new Set(['songs','games','scenario','workshops','ditties','pancakes','offline']);
export function normalizedRoute(path){
  const parts=String(path||'/').split('/').filter(Boolean);
  return parts.length?'/'+parts.join('/')+'/':'/';
}
export function isPeerRoute(path){return PEERS.has(normalizedRoute(path));}
export function isAppRoute(path){
  const route=normalizedRoute(path);
  return route==='/'||SECTIONS.has(route.split('/')[1]);
}
export function parentRoute(path,lastPeer='/'){
  const route=normalizedRoute(path);
  if(PEERS.has(route))return null;
  const parts=route.split('/').filter(Boolean);
  if(!SECTIONS.has(parts[0]))return isPeerRoute(lastPeer)?normalizedRoute(lastPeer):'/';
  if(parts.length>1)return '/'+parts.slice(0,-1).join('/')+'/';
  return isPeerRoute(lastPeer)?normalizedRoute(lastPeer):'/';
}
export function resolveBackAction({search=false,character=false,popover=false,calendar=false,menu=false,path='/',lastPeer='/'}={}){
  if(search)return 'search';
  if(character)return 'character';
  if(popover)return 'popover';
  if(calendar)return 'calendar';
  if(menu)return 'menu';
  return parentRoute(path,lastPeer)?'route':null;
}
export function setupTelegramBackNavigation(win,webApp){
  const doc=win.document,h=win.history;
  const native=webApp?.BackButton;
  let lastPeer=isPeerRoute(win.location.pathname)?normalizedRoute(win.location.pathname):'/';
  let snapshot=null,guardId=null,lastVisible=null,transitioning=false,closed=false;
  const call=(obj,name,...args)=>{try{if(typeof obj?.[name]==='function')return obj[name](...args);}catch{}};
  const q=s=>doc.querySelector(s);
  const popover=()=>{try{return q('#festival-pwa-menu:popover-open');}catch{return null;}};
  const route=()=>normalizedRoute(win.location.pathname);
  function state(){
    return {search:!!q('#festival-search-dialog[open]'),character:!!q('dialog[data-character-dialog][open]'),popover:!!popover(),calendar:!!q('[data-calendar-menu][open]'),menu:!!q('.more-menu[open]'),path:route(),lastPeer};
  }
  function syncNative(){
    if(!native?.show||!native?.hide)return;
    const visible=!!resolveBackAction(state());
    if(visible===lastVisible)return;
    lastVisible=visible;call(native,visible?'show':'hide');
  }
  function remember(){
    if(isPeerRoute(route()))lastPeer=route();
    const s=h.state||{};
    // Astro replace navigation intentionally drops custom state fields. Reattach
    // the marker to the existing top entry instead of pushing another entry.
    if(guardId){
      if(s[KEY]?.id!==guardId||s[KEY]?.role!=='top')h.replaceState({...s,[KEY]:{id:guardId,role:'top'}},'',win.location.href);
    }else if(s[KEY]?.role==='top'&&typeof s[KEY].id==='string'){
      guardId=s[KEY].id;
    }else{
      guardId=String(Date.now())+'-'+Math.random().toString(36).slice(2);
      const clean={index:0,scrollX:win.scrollX||0,scrollY:win.scrollY||0,...s};
      h.replaceState({...clean,[KEY]:{id:guardId,role:'base'}},'',win.location.href);
      h.pushState({...clean,[KEY]:{id:guardId,role:'top'}},'',win.location.href);
    }
    snapshot={url:win.location.href,state:{...h.state},scrollX:win.scrollX||0,scrollY:win.scrollY||0};
  }
  function refresh(){
    transitioning=false;
    try{remember();}catch{}syncNative();
  }
  function navigateParent(){
    const parent=parentRoute(route(),lastPeer);
    if(!parent)return false;
    // Same delegated Astro link path as a user click. No location.href reload.
    const link=doc.createElement('a');link.href=parent;link.dataset.astroHistory='replace';link.hidden=true;
    doc.body.append(link);link.click();link.remove();return true;
  }
  function inside(){
    if(transitioning)return true;
    const action=resolveBackAction(state());
    switch(action){
      case 'search': q('#festival-search-dialog [data-search-close]')?.click();break;
      case 'character': q('dialog[data-character-dialog][open] [data-character-close]')?.click();break;
      case 'popover': {
        const panel=popover();const trigger=q('[data-pwa-menu-trigger][aria-expanded="true"]');
        if(panel){panel.hidePopover();trigger?.focus({preventScroll:true});}
        break;
      }
      case 'calendar': {const menu=q('[data-calendar-menu][open]');if(menu){menu.open=false;menu.querySelector('summary')?.focus({preventScroll:true});}break;}
      case 'menu': {const menu=q('.more-menu[open]');if(menu){menu.open=false;menu.querySelector('summary')?.focus({preventScroll:true});}break;}
      case 'route': return navigateParent();
      default:return false;
    }
    syncNative();return true;
  }
  const onNative=()=>{inside();};
  const onPop=e=>{
    // Only consume our guard, never unrelated history or an Astro traversal.
    if(!snapshot||e.state?.[KEY]?.id!==guardId||e.state[KEY].role!=='base')return;
    e.stopImmediatePropagation();
    // Restore the rendered route BEFORE asking Astro to navigate to its parent.
    // Preserve Astro's state/index and the current scroll position.
    try{h.pushState({...snapshot.state,scrollX:snapshot.scrollX,scrollY:snapshot.scrollY,[KEY]:{id:guardId,role:'top'}},'',snapshot.url);}catch{return;}
    if(inside()){refresh();return;}
    if(!closed){closed=true;call(webApp,'close');win.setTimeout(()=>{closed=false;},500);}
  };
  // Set replace only on app-route link clicks inside Telegram. Plain browser/PWA
  // retains the standard Astro push/history behavior, including external links.
  doc.addEventListener('click',e=>{
    if(e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
    const link=e.target?.closest?.('a[href]');
    if(!link||link.hasAttribute('download')||link.hasAttribute('data-astro-reload')||(link.target&&link.target!=='_self'))return;
    let url;try{url=new URL(link.href,win.location.href);}catch{return;}
    if(url.origin!==win.location.origin||!isAppRoute(url.pathname))return;
    link.dataset.astroHistory='replace';
  },true);
  call(native,'onClick',onNative);
  // Capture runs before Astro's non-capture popstate handler even if it registered first.
  win.addEventListener('popstate',onPop,true);
  doc.addEventListener('astro:before-preparation',()=>{transitioning=true;});
  doc.addEventListener('astro:after-swap',refresh);
  doc.addEventListener('astro:page-load',refresh);
  win.addEventListener('hashchange',refresh);
  win.addEventListener('pageshow',refresh);
  // Native dialogs and details change attributes, not necessarily child nodes.
  // Read only meaningful state changes, not every audio/progress mutation.
  const observer=new win.MutationObserver(syncNative);
  observer.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
  doc.addEventListener('toggle',syncNative,true);
  doc.addEventListener('close',syncNative,true);
  // Initialize after Astro's router has established its own history state.
  if(doc.readyState==='complete'||h.state?.index!==undefined)refresh();
  else win.addEventListener('load',refresh,{once:true});
  syncNative();
  return {refresh,inside};
}
