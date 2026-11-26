const META='masljanica-meta-v2', RUNTIME='masljanica-runtime-v2-'+BUILD;
const PREFIX='masljanica-pack-v2-', STAGING='masljanica-staging-v2-', MARKER='/__offline_active__';
const CONTROL=new Set(['/sw.js','/offline-version.json','/offline-manifest.json']);
let activePromise, runtimePromise, task, deleting=false, progress=null, degradedUntil=0;
const currentRevision = path => Object.hasOwn(CURRENT_REVISIONS,path) ? CURRENT_REVISIONS[path] : null;
const runtimeCache = () => runtimePromise ||= caches.open(RUNTIME);
const absolute=path=>new URL(path,self.location.origin).href;
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
const key=path=>absolute(path.endsWith('/index.html')?path.slice(0,-10):path);
function htmlPath(path){return path.endsWith('/')||!path.split('/').pop().includes('.')||path.endsWith('/index.html');}
function canonical(path){if(path.endsWith('/index.html'))return path.slice(0,-10);return htmlPath(path)&&!path.endsWith('/')?path+'/':path;}
async function active(){
  if(!activePromise)activePromise=(async()=>{
    const marker=await (await caches.open(META)).match(absolute(MARKER));
    if(!marker)return null;
    const info=await marker.json();
    if(typeof info.cache!=='string'||!(info.cache.startsWith(PREFIX)||info.cache.startsWith(STAGING))||!(await caches.has(info.cache)))return null;
    const cache=await caches.open(info.cache);
    const manifest=await cache.match(absolute('/__offline_manifest__'));
    if(!(await cache.match(absolute('/')))||!manifest)return null;
    const entries=(await manifest.json()).entries;
    return {...info,cacheName:info.cache,cache,revisions:new Map(entries.map(entry=>[entry.url,entry.revision]))};
  })().catch(()=>null);
  return activePromise;
}
async function notify(message){
  for(const client of await self.clients.matchAll({type:'window',includeUncontrolled:true}))client.postMessage(message);
}
async function status(){
  const a=await active();
  return {type:'OFFLINE_STATUS',capability:2,deleting,staging:(await caches.keys()).some(name=>name.startsWith(STAGING)&&name!==a?.cacheName),ready:!!a,version:a?.version||null,bytes:a?.bytes||0,count:a?.count||0,build:BUILD,progress};
}
async function timedFetch(input,options={},ms=8000){
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),ms);
  try{return await fetch(input,{...options,signal:controller.signal});}finally{clearTimeout(timer);}
}
function unavailable(){return new Response('Страница недоступна офлайн.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
async function legacyMatch(path){
  for(const name of await caches.keys()){
    if(!/^masljanica-[a-f0-9]{16}$/.test(name))continue;
    const hit=await (await caches.open(name)).match(key(path));if(hit)return hit;
  }
}
function saveRuntime(event,cache,request,response){
  if(!response.ok||response.status!==200||response.redirected||response.type==='opaque')return;
  // The response is already available. Do not put storage I/O on the navigation path.
  event.waitUntil(cache.put(request,response.clone()).catch(()=>{}));
}
async function serve(event){
  const req=event.request,url=new URL(req.url),path=canonical(url.pathname),cacheKey=key(path);
  const revision=currentRevision(path), audio=path.startsWith('/media/audio/');
  const offline=self.navigator.onLine===false;
  const a=await active();
  // An older transactional pack remains useful for byte-identical resources.
  const exact=!!(a&&(a.version===BUILD||(revision&&a.revisions.get(path)===revision)));
  const packHit=exact?await a.cache.match(cacheKey):null;
  if(req.headers.has('range')){
    if(!audio)return fetch(req);
    if(packHit)return rangeResponse(req,packHit);
    const fallback=async()=>await a?.cache.match(cacheKey)||await legacyMatch(path);
    if(offline||Date.now()<degradedUntil){const hit=await fallback();if(hit)return rangeResponse(req,hit);if(offline)return unavailable();}
    try{return await timedFetch(req,{},5000);}catch{const hit=await fallback();return hit?rangeResponse(req,hit):unavailable();}
  }
  if(packHit)return packHit;
  // Only current build entries enter the runtime cache: bounded by the manifest,
  // without a cache.keys() scan or eviction work for every response.
  const runtime=revision&&!audio?await runtimeCache():null;
  if(runtime){const cached=await runtime.match(cacheKey);if(cached)return cached;}
  const fallback=await a?.cache.match(cacheKey);
  if(offline)return fallback||await legacyMatch(path)||unavailable();
  if(Date.now()<degradedUntil){const hit=fallback||await legacyMatch(path);if(hit)return hit;}
  try{
    const response=await timedFetch(req,{},fallback?2500:8000);
    if(response.status>=500){const hit=fallback||await legacyMatch(path);if(hit){degradedUntil=Date.now()+10000;return hit;}}
    if(response.ok)degradedUntil=0;
    if(runtime)saveRuntime(event,runtime,cacheKey,response);
    return response;
  }catch{degradedUntil=Date.now()+10000;return fallback||await legacyMatch(path)||unavailable();}
}
async function rangeResponse(request,full){
  const bytes=await full.arrayBuffer(),size=bytes.byteLength;
  const match=/^bytes=(\d*)-(\d*)$/i.exec(request.headers.get('range')||'');
  const headers=new Headers({'Accept-Ranges':'bytes','Content-Type':full.headers.get('Content-Type')||'audio/mpeg'});
  const invalid=()=>{headers.set('Content-Range','bytes */'+size);return new Response(null,{status:416,headers});};
  if(!match||(!match[1]&&!match[2])||!size)return invalid();
  const start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
  const end=match[1]&&match[2]?Math.min(size-1,Number(match[2])):size-1;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)return invalid();
  headers.set('Content-Range','bytes '+start+'-'+end+'/'+size);
  headers.set('Content-Length',String(end-start+1));
  return new Response(bytes.slice(start,end+1),{status:206,headers});
}
async function download(){
  const response=await timedFetch('/offline-manifest.json',{cache:'no-store'});
  if(!response.ok)throw Error('Не удалось получить список файлов.');
  const manifest=await response.json();
  if(manifest.schema!==1||!Array.isArray(manifest.entries)||!manifest.entries.length||!/^[a-f0-9]{20}$/.test(manifest.version)||manifest.count!==manifest.entries.length||new Set(manifest.entries.map(x=>x.url)).size!==manifest.count||manifest.entries.some(x=>typeof x.url!=='string'||!x.url.startsWith('/')||x.url.startsWith('//')||new URL(x.url,self.location.origin).origin!==self.location.origin||!/^[a-f0-9]{64}$/.test(x.revision)||!Number.isSafeInteger(x.bytes)||x.bytes<0))throw Error('Некорректный список файлов.');
  const old=await active();
  if(old?.version===manifest.version)return;
  const previous=old?await old.cache.match(absolute('/__offline_manifest__')):null;
  const revisions=new Map(previous?(await previous.json()).entries.map(x=>[x.url,x.revision]):[]);
  const name=STAGING+manifest.version, stage=await caches.open(name);
  // A deterministic staging cache permits a later attempt to resume the same version.
  let done=0,bytes=0,idx=0,failure;
  const deferred=[];
  async function report(){
    progress={done,total:manifest.count,bytes,totalBytes:manifest.bytes};
    await notify({type:'OFFLINE_PROGRESS',progress});
  }
  await report();
  async function valid(response,entry){
    if(!response||response.status!==200)return false;
    const body=await response.clone().arrayBuffer();
    if(body.byteLength!==entry.bytes)return false;
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',body)),x=>x.toString(16).padStart(2,'0')).join('');
    return digest===entry.revision;
  }
  async function populate(entry){
    let file=await stage.match(absolute(entry.url));
    if(file&&!(await valid(file,entry))){await stage.delete(absolute(entry.url));file=null;}
    if(!file&&revisions.get(entry.url)===entry.revision)file=await old.cache.match(absolute(entry.url));
    if(!file){
      let last;
      for(let attempt=0;attempt<3;attempt++){
        if(self.navigator.onLine===false)throw Error('Нет подключения');
        try{
          file=await timedFetch(absolute(entry.url),{cache:'no-store'},30000);
          if(file.status!==200||new URL(file.url).origin!==self.location.origin){
            const err=Error('HTTP '+file.status);err.permanent=!(file.status===408||file.status===425||file.status===429||file.status>=500);throw err;
          }
          if(!(await valid(file,entry)))throw Error('Ревизия файла изменилась');
          last=null;break;
        }catch(e){last=e;file=null;if(e.permanent)throw e;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,[1000,3000][attempt]));}
      }
      if(last||!file)throw last||Error('Файл недоступен');
    }
    await stage.put(absolute(entry.url),file);
    done++;bytes+=entry.bytes;
    if(done%5===0||done===manifest.count)await report();
  }
  async function worker(){
    while(!failure&&idx<manifest.entries.length){
      if(self.navigator.onLine===false){failure=Error('Нет подключения. Загрузка сохранена для продолжения.');return;}
      const entry=manifest.entries[idx++];
      try{await populate(entry);}catch(e){
        if(e.permanent){failure=Error(entry.url+': '+e.message);return;}
        deferred.push(entry);
      }
    }
  }
  await Promise.all(Array.from({length:3},worker));
  if(failure)throw failure;
  const remaining=[];
  for(const entry of deferred){
    try{await populate(entry);}catch(e){remaining.push(entry.url+': '+e.message);if(self.navigator.onLine===false)break;}
  }
  if(remaining.length||done!==manifest.count||bytes!==manifest.bytes)throw Error('Неполная офлайн-копия. Загрузка сохранена для продолжения. '+remaining.slice(0,3).join('; '));
  for(const entry of manifest.entries)if(!(await stage.match(absolute(entry.url))))throw Error('В копии отсутствует '+entry.url);
  await stage.put(absolute('/__offline_manifest__'),json(manifest));
  // Activate only a complete, checked staging cache; the old pointer survives every failure.
  await (await caches.open(META)).put(absolute(MARKER),json({cache:name,version:manifest.version,bytes,count:done}));
  activePromise=undefined;
  for(const cacheName of await caches.keys())if(cacheName!==name&&(cacheName.startsWith(PREFIX)||cacheName.startsWith(STAGING)||/^masljanica-[a-f0-9]{16}$/.test(cacheName)))await caches.delete(cacheName).catch(()=>{});

}
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  await self.clients.claim();
  // Preserve the previous full pack during upgrades; only runtime caches are disposable.
  for(const name of await caches.keys())if(name.startsWith('masljanica-runtime-v2-')&&name!==RUNTIME)await caches.delete(name);
})()));
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin||CONTROL.has(url.pathname))return;
  if(url.search&&!htmlPath(url.pathname))return;
  event.respondWith(serve(event));
});
self.addEventListener('message',event=>{
  const type=event.data?.type;
  if(type==='OFFLINE_STATUS'){event.waitUntil(status().then(s=>event.source?.postMessage(s)));return;}
  if(type==='OFFLINE_DOWNLOAD'){
    if(deleting){event.waitUntil(status().then(s=>event.source?.postMessage(s)));return;}
    if(!task){
      progress={done:0,total:0,bytes:0,totalBytes:0};
      task=download().then(()=>notify({type:'OFFLINE_COMPLETE'})).catch(e=>notify({type:'OFFLINE_ERROR',message:e.message})).finally(async()=>{progress=null;task=null;await notify(await status());});
    }
    event.waitUntil(task);
  }
  if(type==='OFFLINE_DELETE'){
    if(task||deleting){event.waitUntil(status().then(s=>event.source?.postMessage(s)));return;}
    deleting=true;
    event.waitUntil((async()=>{
      try{
        await notify(await status());
        await (await caches.open(META)).delete(absolute(MARKER));activePromise=undefined;
        for(const name of await caches.keys())if(name.startsWith(PREFIX)||name.startsWith(STAGING)||/^masljanica-[a-f0-9]{16}$/.test(name))await caches.delete(name);
      }catch(e){await notify({type:'OFFLINE_DELETE_ERROR',message:e.message});}
      finally{deleting=false;await notify(await status());}
    })());
  }
});
