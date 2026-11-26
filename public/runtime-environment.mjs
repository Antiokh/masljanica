// One environment adapter. Launch hints affect UI only, never authentication.
const SESSION='masljanica-telegram-context-v1', COPY='masljanica-telegram-last-copy-v1', THEME='starlight-theme';
const platformOK=p=>/^[a-z][a-z0-9_]{1,23}$/i.test(p||'')&&p!=='unknown';
const versionOK=v=>/^\d+(?:\.\d+){0,3}$/.test(v||'');
const scheme=s=>s==='light'||s==='dark'?s:null;
export const themeMode=value=>scheme(value)||'auto';
export const resolveTheme=(mode,system,telegram)=>scheme(mode)||scheme(telegram)||scheme(system)||'light';
export function parseTelegramLaunch(input){
  let url;try{url=new URL(input);}catch{return null;}
  for(const raw of [url.hash.slice(1),url.search.slice(1)]){
    const p=new URLSearchParams(raw),platform=p.get('tgWebAppPlatform'),version=p.get('tgWebAppVersion'),theme=p.get('tgWebAppThemeParams');
    if(!platformOK(platform)||!versionOK(version)||(!p.has('tgWebAppData')&&!theme))continue;
    let color=null;
    try{const bg=JSON.parse(theme||'{}').bg_color;if(/^#[0-9a-f]{6}$/i.test(bg||'')){const [r,g,b]=bg.slice(1).match(/../g).map(x=>parseInt(x,16));color=r*.299+g*.587+b*.114<128?'dark':'light';}}catch{}
    return {platform,version,theme:color};
  }
  return null;
}
export function detectTelegram({url,session,api}={}){
  const launch=parseTelegramLaunch(url);if(launch)return launch;
  if(api?.initData&&platformOK(api.platform)&&versionOK(api.version))return {platform:api.platform,version:api.version,theme:scheme(api.colorScheme)};
  if(session&&platformOK(session.platform)&&versionOK(session.version))return {platform:session.platform,version:session.version,theme:scheme(session.theme)};
  return null;
}
export const copyRetention=(previous,verified,ready)=>!verified?'checking':!previous?'unknown':ready?'retained':'missing';
export function createRuntimeEnvironment(win=window){
  const doc=win.document,root=()=>doc.documentElement;
  const get=(kind,key)=>{try{return win[kind].getItem(key);}catch{return null;}};
  const set=(kind,key,value)=>{try{win[kind].setItem(key,value);return true;}catch{return false;}};
  let session;try{session=JSON.parse(get('sessionStorage',SESSION)||'null');}catch{}
  const api=()=>win.Telegram?.WebApp;
  const context=detectTelegram({url:win.location.href,session,api:api()});
  const isTelegram=!!context;
  const isStandalone=()=>!isTelegram&&(win.matchMedia('(display-mode: standalone)').matches||win.navigator.standalone===true);
  let sw,cacheStorage=false;
  try{sw=win.navigator.serviceWorker;}catch{}
  try{cacheStorage=!!win.caches&&typeof win.caches.open==='function';}catch{}
  if(isTelegram&&!cacheStorage)sw=undefined;
  const previous=isTelegram?get('localStorage',COPY):null;
  let retention='checking',observed=false,telegramTheme=context?.theme||null,bridge=null,bridgeStatus='connecting',bridgeLoading=false;
  let volatileMode=null;
  const call=(obj,name,...args)=>{try{if(typeof obj?.[name]==='function')return obj[name](...args);}catch{}};
  const mode=()=>volatileMode||themeMode(get('localStorage',THEME));
  const system=()=>win.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
  function save(){if(isTelegram)set('sessionStorage',SESSION,JSON.stringify({platform:context.platform,version:context.version,theme:telegramTheme}));}
  function syncTheme(){
    if(!isTelegram)return;
    const selected=mode(),display=resolveTheme(selected,system(),telegramTheme);
    if(root().dataset.runtimeEnvironment!=='telegram')root().dataset.runtimeEnvironment='telegram';
    if(root().dataset.theme!==display)root().dataset.theme=display;
    doc.querySelectorAll('[data-telegram-theme]').forEach(el=>{el.value=selected;});
    if(bridge){
      const bg=display==='light'?'#FFFFFF':'#101827',nav=display==='light'?'#FFFFFF':'#1D2B40';
      call(bridge,'setHeaderColor',nav);call(bridge,'setBackgroundColor',bg);
      if(call(bridge,'isVersionAtLeast','7.10'))call(bridge,'setBottomBarColor',nav);
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
    const values={environment:'Telegram Mini App · '+context.platform,bridge:bridgeStatus==='ready'?'Подключён':bridgeStatus==='unavailable'?'Недоступен · резервный режим':'Подключение…',sw:sw?'API доступен':'Недоступен',cache:cacheStorage?'API доступен':'Недоступен',retention:retention==='retained'?'Предыдущая копия обнаружена':retention==='missing'?'Предыдущая копия не обнаружена':retention==='checking'?'Проверяем…':'Нет данных о предыдущем запуске'};
    for(const [key,value] of Object.entries(values))doc.querySelectorAll('[data-runtime-value="'+key+'"]').forEach(el=>{el.textContent=value;});
  }
  function sync(){if(isTelegram){syncTheme();syncInsets();diagnostics();}}
  function connect(){
    const candidate=api();if(!candidate||typeof candidate.onEvent!=='function')return false;
    if(bridge===candidate)return true;
    bridge=candidate;bridgeStatus='ready';
    const update=()=>{telegramTheme=scheme(bridge.colorScheme)||telegramTheme;save();syncTheme();};
    update();call(bridge,'onEvent','themeChanged',update);
    for(const event of ['safeAreaChanged','contentSafeAreaChanged','viewportChanged','fullscreenChanged'])call(bridge,'onEvent',event,syncInsets);
    call(bridge,'ready');sync();return true;
  }
  function loadBridge(){
    if(connect()||bridgeLoading)return;
    bridgeLoading=true;
    // Official bridge only in Mini App. A failed SDK cannot block local content.
    const script=doc.createElement('script');script.src='https://telegram.org/js/telegram-web-app.js?65';script.async=true;
    const fail=()=>{bridgeLoading=false;if(bridgeStatus!=='ready'){bridgeStatus='unavailable';diagnostics();}};
    const timeout=win.setTimeout(fail,5000);
    script.addEventListener('load',()=>{win.clearTimeout(timeout);bridgeLoading=false;if(!connect())fail();},{once:true});
    script.addEventListener('error',()=>{win.clearTimeout(timeout);fail();},{once:true});
    doc.head.append(script);
  }
  if(isTelegram){
    save();sync();
    doc.addEventListener('astro:after-swap',sync);doc.addEventListener('astro:page-load',sync);
    win.addEventListener('pageshow',sync);win.addEventListener('online',()=>{if(!bridge)loadBridge();sync();});
    win.addEventListener('storage',e=>{if(e.key===THEME||e.key===null){volatileMode=null;syncTheme();}});
    doc.addEventListener('change',e=>{
      if(e.target?.matches?.('[data-telegram-theme]')){
        const selected=themeMode(e.target.value);
        volatileMode=set('localStorage',THEME,selected==='auto'?'':selected)?null:selected;
        call(win.StarlightThemeProvider,'updatePickers',selected);
      }else if(e.target?.matches?.('starlight-theme-select select'))volatileMode=null;
      else return;
      queueMicrotask(syncTheme);
    });
    win.matchMedia('(prefers-color-scheme: light)').addEventListener?.('change',()=>queueMicrotask(syncTheme));
    new win.MutationObserver(syncTheme).observe(root(),{attributes:true,attributeFilter:['data-theme','data-runtime-environment']});
    loadBridge();
  }
  return {isTelegram,isStandalone,canOfferInstall:()=>!isTelegram&&!isStandalone(),serviceWorker:sw,
    launchLabel:()=>isTelegram?'Telegram Mini App':isStandalone()?'Приложение':'Браузер',sync,
    observeCopy({verified,ready,version}){
      if(!isTelegram)return;
      if(verified&&!observed){retention=copyRetention(previous,true,ready);observed=true;}
      if(verified&&ready&&version)set('localStorage',COPY,version);
      diagnostics();
    }
  };
}
