import {tr,currentPath,stripLocale,localeOf} from './i18n.mjs';
import { sanitizeTelegramPalette, applyTelegramPalette, telegramNativeColors } from './telegram-palette.mjs';
import { setupTelegramBackNavigation } from './telegram-back.mjs';
// One environment adapter. Launch hints affect UI only, never authentication.
const SESSION='masljanica-telegram-context-v1', COPY='masljanica-telegram-last-copy-v1', THEME='starlight-theme';
const platformOK=p=>/^[a-z][a-z0-9_]{1,23}$/i.test(p||'')&&p!=='unknown';
const versionOK=v=>/^\d+(?:\.\d+){0,3}$/.test(v||'');
const scheme=s=>s==='light'||s==='dark'?s:null;
export const themeMode=value=>scheme(value)||'auto';
export const resolveTheme=(mode,system,telegram)=>scheme(mode)||scheme(telegram)||scheme(system)||'light';
export function themeFromParams(params){
  const bg=params?.bg_color;
  if(!/^#[0-9a-f]{6}$/i.test(bg||''))return null;
  const [r,g,b]=bg.slice(1).match(/../g).map(x=>parseInt(x,16));
  return r*.299+g*.587+b*.114<128?'dark':'light';
}
// The SDK can expose a default colorScheme before receiving real theme data.
export function readBridgeTheme(api,previous=null,confirmed=false){
  if(themeFromParams(api?.themeParams))return scheme(api.colorScheme)||themeFromParams(api.themeParams);
  return confirmed?scheme(api?.colorScheme)||previous:previous;
}
export function parseTelegramLaunch(input){
  let url;try{url=new URL(input);}catch{return null;}
  for(const raw of [url.hash.slice(1),url.search.slice(1)]){
    const p=new URLSearchParams(raw),platform=p.get('tgWebAppPlatform'),version=p.get('tgWebAppVersion'),theme=p.get('tgWebAppThemeParams');
    if(!platformOK(platform)||!versionOK(version)||(!p.has('tgWebAppData')&&!theme))continue;
    let colors={};
    try{colors=sanitizeTelegramPalette(JSON.parse(theme||'{}'));}catch{}
    return {platform,version,theme:themeFromParams(colors),colors};
  }
  return null;
}
export function detectTelegram({url,session,api}={}){
  const launch=parseTelegramLaunch(url);if(launch)return launch;
  if(api?.initData&&platformOK(api.platform)&&versionOK(api.version))return {platform:api.platform,version:api.version,theme:scheme(api.colorScheme),colors:sanitizeTelegramPalette(api.themeParams)};
  if(session&&platformOK(session.platform)&&versionOK(session.version))return {platform:session.platform,version:session.version,theme:scheme(session.theme),colors:sanitizeTelegramPalette(session.colors)};
  return null;
}
export const copyRetention=(previous,verified,ready)=>!verified?'checking':!previous?'unknown':ready?'retained':'missing';
export function createRuntimeEnvironment(win=window){
  const doc=win.document,root=()=>doc.documentElement;
  const get=(kind,key)=>{try{return win[kind].getItem(key);}catch{return null;}};
  const set=(kind,key,value)=>{try{win[kind].setItem(key,value);return true;}catch{return false;}};
  let session;try{session=JSON.parse(get('sessionStorage',SESSION)||'null');}catch{}
  const api=()=>win.Telegram?.WebApp;
  const context=detectTelegram({url:win.location.href,session:win.__masljanicaTelegramLaunch||session,api:api()});
  const isTelegram=!!context;
  const isStandalone=()=>!isTelegram&&(win.matchMedia('(display-mode: standalone)').matches||win.navigator.standalone===true);
  let sw,cacheStorage=false;
  try{sw=win.navigator.serviceWorker;}catch{}
  try{cacheStorage=!!win.caches&&typeof win.caches.open==='function';}catch{}
  if(isTelegram&&!cacheStorage)sw=undefined;
  const previous=isTelegram?get('localStorage',COPY):null;
  let retention='checking',observed=false,telegramTheme=context?.theme||null,bridge=null,bridgeStatus='connecting',bridgeLoading=false;
  let backNavigation=null,telegramColors=sanitizeTelegramPalette(context?.colors);
  let volatileMode=null,themeSource=context?.theme?'launch':'system',lastNativeTheme=null;
  const call=(obj,name,...args)=>{try{if(typeof obj?.[name]==='function')return obj[name](...args);}catch{}};
  const mode=()=>volatileMode||themeMode(get('localStorage',THEME));
  const system=()=>win.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
  function save(){if(isTelegram)set('sessionStorage',SESSION,JSON.stringify({platform:context.platform,version:context.version,theme:telegramTheme,colors:telegramColors}));}
  function syncTheme(){
    if(!isTelegram)return;
    const selected=mode(),display=resolveTheme(selected,system(),telegramTheme);
    if(root().dataset.runtimeEnvironment!=='telegram')root().dataset.runtimeEnvironment='telegram';
    if(telegramTheme)root().dataset.telegramTheme=telegramTheme;
    if(root().dataset.theme!==display)root().dataset.theme=display;
    applyTelegramPalette(root(),selected,telegramColors);
    const nativeColors=telegramNativeColors(selected,display,telegramColors);
    const meta=doc.querySelector('meta[name="theme-color"]');if(meta&&meta.content!==nativeColors.background)meta.content=nativeColors.background;
    doc.querySelectorAll('[data-telegram-theme]').forEach(el=>{el.value=selected;});
    const nativeKey=JSON.stringify(nativeColors);
    if(bridge&&lastNativeTheme!==nativeKey){
      lastNativeTheme=nativeKey;
      call(bridge,'setHeaderColor',nativeColors.header);call(bridge,'setBackgroundColor',nativeColors.background);
      if(call(bridge,'isVersionAtLeast','7.10'))call(bridge,'setBottomBarColor',nativeColors.bottom);
    }
  }
  function syncInsets(){
    if(!bridge)return;
    const content=bridge.contentSafeAreaInset||{},safe=bridge.safeAreaInset||{};
    const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0?Math.min(n,200):0;
    for(const side of ['top','right','bottom','left'])root().style.setProperty('--telegram-content-'+side,(valid(content[side])+(bridge.isFullscreen?valid(safe[side]):0))+'px');
  }
  function diagnostics(){
    if(!isTelegram)return;
    const values={palette:root().dataset.telegramPalette==='active'?tr('Цвета Telegram'):tr('Фирменная палитра'),background:root().dataset.telegramPalette==='active'?telegramColors.bg_color:'—',themeMode:mode(),telegramTheme:telegramTheme||tr('Не получена'),themeSource:mode()!=='auto'?tr('Ручной выбор'):themeSource==='bridge'?'Telegram SDK':themeSource==='launch'?tr('Параметры Telegram'):tr('Системная (резерв)'),appliedTheme:root().dataset.theme,environment:'Telegram Mini App · '+context.platform,bridge:bridgeStatus==='ready'?tr('Подключён'):bridgeStatus==='unavailable'?tr('Недоступен · резервный режим'):tr('Подключение…'),sw:sw?tr('API доступен'):tr('Недоступен'),cache:cacheStorage?tr('API доступен'):tr('Недоступен'),retention:retention==='retained'?tr('Предыдущая копия обнаружена'):retention==='missing'?tr('Предыдущая копия не обнаружена'):retention==='checking'?tr('Проверяем…'):tr('Нет данных о предыдущем запуске')};
    for(const [key,value] of Object.entries(values))doc.querySelectorAll('[data-runtime-value="'+key+'"]').forEach(el=>{el.textContent=value;});
  }
  function sync(){if(isTelegram){syncTheme();syncInsets();diagnostics();}}
  function connect(){
    const candidate=api();if(!candidate||typeof candidate.onEvent!=='function')return false;
    if(bridge===candidate)return true;
    bridge=candidate;bridgeStatus='ready';
    const update=(confirmed=false)=>{
      const colors=sanitizeTelegramPalette(bridge.themeParams);
      if(colors.bg_color)telegramColors=colors;
      const next=readBridgeTheme(bridge,telegramTheme,confirmed);
      if(next&&(confirmed||themeFromParams(bridge.themeParams))){telegramTheme=next;themeSource='bridge';}
      save();syncTheme();diagnostics();
    };
    call(bridge,'onEvent','themeChanged',()=>update(true));
    call(bridge,'onEvent','activated',()=>{update(false);requestTheme();});
    update(false);
    requestTheme();
    for(const event of ['safeAreaChanged','contentSafeAreaChanged','viewportChanged','fullscreenChanged'])call(bridge,'onEvent',event,syncInsets);
    if(!backNavigation)backNavigation=setupTelegramBackNavigation(win,bridge);
    call(bridge,'ready');sync();return true;
  }
  function requestTheme(){
    if(bridge)call(win.Telegram?.WebView,'postEvent','web_app_request_theme',false);
  }
  function loadBridge(){
    if(connect()||bridgeLoading)return;
    bridgeLoading=true;
    // Official bridge only in Mini App. A failed SDK cannot block local content.
    const early=doc.querySelector('script[data-telegram-bridge]');
    const script=early||doc.createElement('script');
    if(!early){script.src='https://telegram.org/js/telegram-web-app.js?65';script.async=true;script.dataset.telegramBridge='';}
    const fail=()=>{bridgeLoading=false;if(bridgeStatus!=='ready'){bridgeStatus='unavailable';diagnostics();}};
    const timeout=win.setTimeout(fail,5000);
    script.addEventListener('load',()=>{win.clearTimeout(timeout);bridgeLoading=false;if(!connect())fail();},{once:true});
    script.addEventListener('error',()=>{win.clearTimeout(timeout);fail();},{once:true});
    if(!early)doc.head.append(script);
  }
  if(isTelegram){
    save();sync();
    doc.addEventListener('astro:after-swap',sync);doc.addEventListener('astro:page-load',sync);
    const resume=()=>{if(!bridge)loadBridge();else{const colors=sanitizeTelegramPalette(bridge.themeParams);if(colors.bg_color)telegramColors=colors;const next=readBridgeTheme(bridge,telegramTheme);if(next&&themeFromParams(bridge.themeParams)){telegramTheme=next;themeSource='bridge';save();}requestTheme();}sync();};
    win.addEventListener('pageshow',resume);win.addEventListener('online',resume);
    doc.addEventListener('visibilitychange',()=>{if(doc.visibilityState==='visible')resume();});
    win.addEventListener('focus',resume);
    win.addEventListener('storage',e=>{if(e.key===THEME||e.key===null){volatileMode=null;syncTheme();}});
    doc.addEventListener('change',e=>{
      if(e.target?.matches?.('[data-telegram-theme]')){
        const selected=themeMode(e.target.value);
        volatileMode=set('localStorage',THEME,selected==='auto'?'':selected)?null:selected;
        call(win.StarlightThemeProvider,'updatePickers',selected);
      }else if(e.target?.matches?.('starlight-theme-select select'))volatileMode=null;
      else return;
      queueMicrotask(()=>{syncTheme();diagnostics();});
    });
    win.matchMedia('(prefers-color-scheme: light)').addEventListener?.('change',()=>queueMicrotask(syncTheme));
    new win.MutationObserver(()=>{syncTheme();diagnostics();}).observe(root(),{attributes:true,attributeFilter:['data-theme','data-runtime-environment']});
    loadBridge();
  }
  return {isTelegram,isStandalone,canOfferInstall:()=>!isTelegram&&!isStandalone(),serviceWorker:sw,
    launchLabel:()=>isTelegram?'Telegram Mini App':isStandalone()?tr('Приложение'):tr('Браузер'),sync,
    observeCopy({verified,ready,version}){
      if(!isTelegram)return;
      if(verified&&!observed){retention=copyRetention(previous,true,ready);observed=true;}
      if(verified&&ready&&version)set('localStorage',COPY,version);
      diagnostics();
    }
  };
}
