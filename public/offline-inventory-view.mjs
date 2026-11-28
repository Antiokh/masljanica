import {tr} from './i18n.mjs';
import {inventoryCaches,summarizeEntries} from './offline-inventory.mjs';
const categoryLabels={audio:'Аудио',media:'Изображения и медиа',search:'Поисковый индекс','html:ru':'HTML · RU','html:sr':'HTML · SR','html:en':'HTML · EN','shared assets':'Общие ресурсы',og:'OG-изображения',discovery:'SEO / AI-экспорт',metadata:'Служебные данные'};
const cacheLabels={active:'Активная копия',staging:'Незавершённая копия',runtime:'Runtime-кэш',legacy:'Старый кэш',metadata:'Служебные данные',other:'Прочий кэш'};
const size=n=>Number.isFinite(n)?(n<1000000?Math.round(n/1000).toLocaleString()+' '+tr('КБ'):(n/1e6).toLocaleString(document.documentElement.lang||'ru',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+tr('МБ')):'—';
const el=(tag,value,cls)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=value;if(cls)node.className=cls;return node;};
const row=(label,value)=>{const node=el('div',undefined,'pwa-inventory-row');node.append(el('span',label),el('strong',value));return node;};
const amount=x=>size(x.bytes)+(x.unknown||x.unreadable?' + ?':'');
function breakdown(parent,summary){
 for(const [kind,group] of Object.entries(summary.groups).sort((a,b)=>b[1].bytes-a[1].bytes))parent.append(row(tr(categoryLabels[kind]||kind)+' · '+group.count,amount(group)));
}
function fileList(parent,entries){
 const details=el('details',undefined,'pwa-inventory-files');details.append(el('summary',tr('Все файлы')+' · '+entries.length));
 details.addEventListener('toggle',()=>{
  if(!details.open||details.children.length>1)return;
  const list=el('div',undefined,'pwa-inventory-file-list');
  for(const entry of [...entries].sort((a,b)=>(b.bytes??-1)-(a.bytes??-1))){
   let path=entry.url;try{const url=new URL(path,location.origin);if(url.origin===location.origin)path=url.pathname+url.search;path=decodeURI(path);}catch{}
   const item=row(path,size(entry.bytes));if(Number.isFinite(entry.bytes))item.title=entry.bytes+' B';list.append(item);
  }
  details.append(list);
 });
 parent.append(details);
}
function renderSource(parent,title,source){
 const box=el('section',undefined,'pwa-inventory-source');box.append(el('h3',title),row(tr('Всего')+' · '+source.count,amount(source)));breakdown(box,source);fileList(box,source.entries);parent.append(box);
}
export function installOfflineInventory({onResize}={}){
 let pending=false;
 document.addEventListener('click',async event=>{
  const button=event.target instanceof Element?event.target.closest('[data-pwa-inventory-refresh]'):null;
  if(!button||pending)return;
  const out=button.closest('[data-pwa-inventory]')?.querySelector('[data-pwa-inventory-result]');if(!out)return;
  pending=true;button.disabled=true;out.replaceChildren(el('p',tr('Проверяем файлы…')));onResize?.();
  try{
   const report=el('div');
   if(navigator.onLine)try{
    const response=await fetch('/offline-manifest.json',{cache:'no-store',signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw Error('manifest');
    const manifest=await response.json();if(!Array.isArray(manifest.entries))throw Error('manifest');
    renderSource(report,tr('Доступная сборка')+' · '+manifest.version,{entries:manifest.entries,...summarizeEntries(manifest.entries)});
    if(manifest.excludedBreakdown){
     const box=el('section',undefined,'pwa-inventory-source');box.append(el('h3',tr('Исключено из пакета')));
     for(const [kind,group] of Object.entries(manifest.excludedBreakdown))if(kind!=='internal')box.append(row(tr(categoryLabels[kind]||kind)+' · '+group.count,size(group.bytes)));report.append(box);
    }
   }catch{report.append(el('p',tr('Манифест сервера недоступен.')));}
   const overview=el('section',undefined,'pwa-inventory-source');overview.append(el('h3',tr('Кэши на устройстве')));
   try{
    if(!window.caches)throw Error('cache storage unavailable');
    const actual=await inventoryCaches(window.caches,location.origin);
    overview.append(row(tr('Всего в кэшах')+' · '+actual.total.count,amount(actual.total)));
    if(actual.activeExpectedBytes!==null)overview.append(row(tr('Размер активного пакета по манифесту'),size(actual.activeExpectedBytes)));
    if(actual.caches.some(c=>c.unreadable)||actual.total.unknown)overview.append(el('p',tr('Некоторые данные недоступны для измерения.')));
    if(!actual.caches.length)overview.append(el('p',tr('Кэши отсутствуют.')));
    report.append(overview);
    const order=['active','staging','runtime','legacy','metadata','other'];
    for(const cache of actual.caches.sort((a,b)=>order.indexOf(a.kind)-order.indexOf(b.kind)||b.bytes-a.bytes)){
     const details=el('details',undefined,'pwa-inventory-cache');
     details.append(el('summary',tr(cacheLabels[cache.kind])+' · '+amount(cache)),el('p',cache.name,'pwa-inventory-cache-name'));
     breakdown(details,cache);fileList(details,cache.entries);report.append(details);
    }
   }catch{overview.append(el('p',tr('Не удалось прочитать хранилище.')));report.append(overview);}
   try{const estimate=await navigator.storage?.estimate();if(Number.isFinite(estimate?.usage))overview.append(row(tr('Всего в хранилище'),size(estimate.usage)));}catch{}
   if(out.isConnected)out.replaceChildren(report);
  }catch{if(out.isConnected)out.replaceChildren(el('p',tr('Не удалось прочитать хранилище.')));}
  finally{pending=false;button.disabled=false;onResize?.();}
 });
}
