self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('masljanica-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.headers.has('range')){
  if(!url.pathname.startsWith('/media/audio/'))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const full=await cache.match(url.pathname);
    if(!full)return fetch(request);
    const bytes=await full.arrayBuffer(),size=bytes.byteLength;
    const match=/^bytes=(\d*)-(\d*)$/i.exec(request.headers.get('range')||'');
    const headers=new Headers({'Accept-Ranges':'bytes','Content-Type':full.headers.get('Content-Type')||'audio/mpeg'});
    const invalid=()=>{headers.set('Content-Range','bytes */'+size);return new Response(null,{status:416,headers});};
    if(!match||(!match[1]&&!match[2])||!size)return invalid();
    let start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
    let end=match[1]&&match[2]?Math.min(size-1,Number(match[2])):size-1;
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)return invalid();
    headers.set('Content-Range','bytes '+start+'-'+end+'/'+size);
    headers.set('Content-Length',String(end-start+1));
    return new Response(bytes.slice(start,end+1),{status:206,headers});
  })());return;
 }
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(async()=>{
   const cache=await caches.open(CACHE);const pathname=url.pathname.endsWith('/')?url.pathname:url.pathname+'/';
   return await cache.match(pathname)||await cache.match(url.pathname)||new Response('Страница недоступна офлайн.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }));return;
 }
 event.respondWith(caches.open(CACHE).then(async cache=>await cache.match(request)||fetch(request)));
});
