// One initial negotiation per document. Explicit language links always take precedence.
export const LOCALE_KEY='masljanica-language-v1';
const supported=l=>['ru','sr','en'].includes(l);
export function preferredLocale(primary,saved){
 if(supported(saved))return saved;
 const lang=String(primary||'').toLowerCase().split(/[-_]/)[0];
 return supported(lang)?lang:'ru';
}
export function chooseLocale({path,primary,saved,explicit}){
 // A localized URL is an explicit landing choice; never redirect it to a different language.
 if(/^\/(?:sr|en)(?:\/|$)/.test(path))return null;
 if(explicit==='ru')return null;
 const target=preferredLocale(primary,saved);
 return target==='ru'?null:target;
}
export function installLocalePreference(win=window){
 const doc=win.document;
 const store=(value)=>{let persisted=false;for(const name of ['localStorage','sessionStorage'])try{win[name].setItem(LOCALE_KEY,value);persisted=true;}catch{}return persisted;};
 const read=()=>{for(const name of ['localStorage','sessionStorage'])try{const value=win[name].getItem(LOCALE_KEY);if(supported(value))return value;}catch{}return null;};
 doc.addEventListener('click',event=>{
  const link=event.target?.closest?.('a[data-language-choice]');
  if(!link||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const locale=link.dataset.languageChoice;if(!supported(locale))return;
  const saved=store(locale),target=new URL(link.href,win.location.href);
  target.search=win.location.search;target.searchParams.delete('__lang');
  target.hash=win.location.hash;
  if(!saved&&locale==='ru')target.searchParams.set('__lang','ru');
  link.href=target.href;
 },true);
 const current=new URL(win.location.href);
 const explicit=current.searchParams.get('__lang');
 if(explicit==='ru'){store('ru');return;}
 const locale=chooseLocale({path:current.pathname,primary:win.navigator.languages?.[0]||win.navigator.language,saved:read(),explicit});
 if(!locale)return;
 // The SSR alternate is the authority: no guessed routes, no redirect from 404s.
 const tag=locale==='sr'?'sr-Latn':locale;
 const link=doc.head.querySelector('link[rel="alternate"][hreflang="'+tag+'"]');
 if(!link)return;
 const target=new URL(link.href,win.location.href);
 // Canonical URLs point at production; retain the current origin for previews/local dev.
 target.host=current.host;target.protocol=current.protocol;
 target.search=current.search;target.hash=current.hash;
 if(target.pathname===current.pathname)return;
 if(win.navigator.onLine===false){
  // Do not strand an offline user on an absent localized page.
  void (async()=>{try{
   const meta=await win.caches.open('masljanica-meta-v2');
   const marker=await meta.match(new URL('/__offline_active__',current.origin).href);
   if(!marker)return;
   const info=await marker.json();
   if(!info.cache||!(await win.caches.has(info.cache)))return;
   const pack=await win.caches.open(info.cache);
   if(await pack.match(new URL(target.pathname,current.origin).href)&&win.location.href===current.href)win.location.replace(target.href);
  }catch{}})();return;
 }
 win.location.replace(target.href);
}
