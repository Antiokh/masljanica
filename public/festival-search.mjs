import {tr,currentPath,stripLocale,localeOf} from './i18n.mjs';
// Pagefind remains the full-text engine. The input is SSR markup, never an async placeholder.
// One document-level controller handles all Astro page swaps; no DOMContentLoaded dependency.
export function installFestivalSearch(){
  let enginePromise, timer, sequence=0, opener=null, matches=[], offset=0;
  const batch=12;
  const dialog=()=>document.getElementById('festival-search-dialog');
  const current=()=>dialog()?.open?dialog():null;
  const status=(d,text)=>{d.querySelector('#festival-search-status').textContent=text;};
  const loadEngine=()=>enginePromise ||= import('/pagefind/pagefind.js').then(async pf=>{await pf.init();return pf;}).catch(error=>{enginePromise=null;throw error;});
  function invalidate(){clearTimeout(timer);sequence++;matches=[];offset=0;}
  function reset(d){
    invalidate();
    d.querySelector('#festival-search-input').value='';
    d.querySelector('#festival-search-results').replaceChildren();
    d.querySelector('[data-search-more]').hidden=true;
    status(d,tr('Введите слово или фразу.'));
  }
  function close(restore=true){
    const d=current();if(!d)return;
    invalidate();d.close();
    if(restore&&opener?.isConnected){const target=opener.closest('details:not([open])')?.querySelector('summary')||opener;target.focus({preventScroll:true});}
    opener=null;
  }
  function open(trigger){
    const d=dialog();if(!d||d.open)return;
    reset(d);opener=trigger||[...document.querySelectorAll('[data-search-open]')].find(el=>el.getClientRects().length)||document.querySelector('.more-menu > summary');
    const menu=opener?.closest('.more-menu');if(menu)menu.open=false;
    d.showModal();document.documentElement.classList.add('festival-search-open');
    d.querySelector('input').focus({preventScroll:true});
    // Warm on intent, not during navigation. Failure is reported on an actual query.
    void loadEngine().catch(()=>{});
  }
  function resultLink(result, fallbackTitle){
    let url;try{url=new URL(result.url,location.origin);}catch{return null;}
    if(url.origin!==location.origin||!/^https?:$/.test(url.protocol)||localeOf(url.pathname)!==localeOf(location.pathname))return null;
    // The song list is the primary player; keep deep links in that experience.
    const song=stripLocale(url.pathname).match(/^\/songs\/([^/]+)\/?$/);
    if(song){url=new URL(currentPath('/songs/#'+song[1]),location.origin);}
    const a=document.createElement('a');a.href=url.pathname+url.search+url.hash;
    a.textContent=result.title||result.meta?.title||fallbackTitle||url.pathname;
    return a;
  }
  function renderResult(data){
    const a=resultLink(data);if(!a)return null;
    const li=document.createElement('li');li.append(a);
    if(data.excerpt){const p=document.createElement('p');
      // Pagefind guarantees its excerpt is HTML-escaped with only highlight markup.
      p.innerHTML=data.excerpt;li.append(p);
    }
    const subs=(data.sub_results||[]).filter(s=>s.url!==data.url).slice(0,3);
    for(const sub of subs){const link=resultLink(sub,data.meta?.title);if(link&&link.href!==a.href){link.className='festival-search-subresult';li.append(link);}}
    return li;
  }
  const live=(d,token)=>d===current()&&token===sequence;
  function failure(d,token){
    if(!live(d,token))return;
    status(d,navigator.onLine?tr('Не удалось загрузить поиск. Измените запрос или повторите попытку.'):tr('Поиск недоступен без полной офлайн-копии. Проверьте её в разделе «Офлайн».'));
    d.querySelector('[data-search-more]').hidden=true;
  }
  async function next(d,token){
    const more=d.querySelector('[data-search-more]');more.disabled=true;
    try{
      const loaded=await Promise.all(matches.slice(offset,offset+batch).map(r=>r.data()));
      if(!live(d,token))return;
      for(const data of loaded){const node=renderResult(data);if(node)d.querySelector('#festival-search-results').append(node);}
      offset+=loaded.length;more.hidden=offset>=matches.length;
      status(d,tr('Найдено страниц: ')+matches.length);
    }catch{failure(d,token);}finally{if(live(d,token))more.disabled=false;}
  }
  function query(d,value){
    invalidate();const token=sequence;
    const results=d.querySelector('#festival-search-results'),more=d.querySelector('[data-search-more]');
    results.replaceChildren();more.hidden=true;more.disabled=false;
    const term=value.trim();if(!term){status(d,tr('Введите слово или фразу.'));return;}
    status(d,tr('Ищем…'));
    timer=setTimeout(async()=>{
      try{
        const pf=await loadEngine();if(!live(d,token))return;
        const found=await pf.search(term);if(!live(d,token))return;
        if(!found||!Array.isArray(found.results))throw Error('Search index unavailable');
        matches=found.results;
        if(!matches.length){status(d,tr('Ничего не найдено.'));return;}
        await next(d,token);
      }catch{failure(d,token);}
    },180);
  }
  document.addEventListener('click',e=>{
    const el=e.target instanceof Element?e.target:null;
    if(!el)return;
    const trigger=el.closest('[data-search-open]');if(trigger){open(trigger);return;}
    const d=current();if(!d)return;
    if(el.closest('[data-search-close]')){close();return;}
    if(el.closest('[data-search-more]')){void next(d,sequence);return;}
    if(el.closest('#festival-search-results a')){close(false);return;}
    if(el===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}
  });
  document.addEventListener('input',e=>{const d=current();if(d&&e.target.id==='festival-search-input')query(d,e.target.value);});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(current())close();else open();}});
  document.addEventListener('cancel',e=>{if(e.target===current()){e.preventDefault();close();}},true);
  document.addEventListener('close',e=>{if(e.target.id==='festival-search-dialog'&&!current())document.documentElement.classList.remove('festival-search-open');},true);
  document.addEventListener('astro:before-swap',()=>{close(false);invalidate();document.documentElement.classList.remove('festival-search-open');});
}
