// Shared accounting of decoded resource bodies, not disk allocation.
export function resourceKind(value){
 const path=new URL(value,'https://inventory.invalid').pathname;
 const base=path.replace(/^\/(?:sr|en)(?=\/)/,'');
 if(/^\/(?:og|og-square)(?:\/|$)/.test(base))return 'og';
 if(/^\/_llms-txt\//.test(base)||/^\/(?:llms(?:-small|-full)?\.txt|robots\.txt|festival\.json|knowledge\.jsonld|sitemap[^/]*\.xml)$/.test(base))return 'discovery';
 if(/^\/__offline_/.test(path))return 'metadata';
 if(base.startsWith('/media/audio/'))return 'audio';
 if(base.startsWith('/media/'))return 'media';
 if(base.startsWith('/pagefind/'))return 'search';
 if(path.endsWith('/')||path.endsWith('/index.html'))return 'html:'+(/^\/(sr|en)(?:\/|$)/.exec(path)?.[1]||'ru');
 return 'shared assets';
}
export function summarizeEntries(entries){
 const groups={};let bytes=0,unknown=0;
 for(const entry of entries){
  const group=groups[resourceKind(entry.url)]??={count:0,bytes:0,unknown:0};group.count++;
  if(Number.isSafeInteger(entry.bytes)&&entry.bytes>=0){bytes+=entry.bytes;group.bytes+=entry.bytes;}
  else{unknown++;group.unknown++;}
 }
 return {count:entries.length,bytes,unknown,groups};
}
export function cacheKind(name,active){
 if(name===active)return 'active';
 if(name==='masljanica-meta-v2')return 'metadata';
 if(name.startsWith('masljanica-staging-v2-'))return 'staging';
 if(name.startsWith('masljanica-runtime-v2-'))return 'runtime';
 if(name.startsWith('masljanica-pack-v2-')||/^masljanica-[a-f0-9]{16}$/.test(name))return 'legacy';
 return 'other';
}
export async function inventoryCaches(storage,origin){
 const names=await storage.keys();let marker=null;
 if(names.includes('masljanica-meta-v2'))try{
  const meta=await storage.open('masljanica-meta-v2');
  marker=await (await meta.match(new URL('/__offline_active__',origin).href))?.json();
 }catch{}
 const result=[];
 for(const name of names){
  const kind=cacheKind(name,marker?.cache),entries=[];
  try{
   if(!(await storage.has(name)))continue;
   const cache=await storage.open(name);
   for(const request of await cache.keys()){
    let bytes=null;
    try{const response=await cache.match(request);if(response&&response.type!=='opaque'&&response.type!=='opaqueredirect')bytes=(await response.blob()).size;}catch{}
    entries.push({url:request.url,bytes});
   }
   result.push({name,kind,entries,...summarizeEntries(entries)});
  }catch{result.push({name,kind,entries:[],...summarizeEntries([]),unreadable:true});}
 }
 return {activeVersion:marker?.version??null,activeExpectedBytes:marker?.bytes??null,caches:result,total:summarizeEntries(result.flatMap(x=>x.entries))};
}
