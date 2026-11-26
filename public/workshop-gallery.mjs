// Keep one inline expanded panel after the actual visible grid row.
export function installWorkshopGallery(){
 let selected=null,lastRoot=null,frame=0;
 const root=()=>document.querySelector('[data-workshop-catalog]');
 const tiles=r=>[...r.querySelectorAll('[data-workshop-tile]')];
 const panels=r=>[...r.querySelectorAll('[data-workshop-panel]')];
 const trigger=(r,id)=>[...r.querySelectorAll('[data-workshop-open]')].find(x=>x.dataset.workshopOpen===id);
 function place(r){
  if(!selected)return;
  const tile=tiles(r).find(x=>x.dataset.workshopId===selected&&!x.hidden);
  const panel=panels(r).find(x=>x.dataset.workshopPanel===selected);
  if(!tile||!panel){close(r);return;}
  const grid=r.querySelector('[data-workshop-grid]');
  const visible=[...grid.querySelectorAll('.workshop-tile:not([hidden])')];
  // Grid columns are resolved by the browser; don't infer from screen width.
  const columns=getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length||1;
  const index=visible.indexOf(tile),end=Math.min(visible.length-1,Math.floor(index/columns)*columns+columns-1);
  const after=visible[end];
  if(after&&after.nextElementSibling!==panel)after.after(panel);
  panel.hidden=false;
 }
 function close(r,restore=false){const old=selected;selected=null;for(const p of panels(r))p.hidden=true;for(const t of r.querySelectorAll('[data-workshop-open]'))t.setAttribute('aria-expanded','false');if(restore&&old)trigger(r,old)?.focus();}
 function open(r,id,scroll=false){
  const t=trigger(r,id);if(!t||t.closest('[data-workshop-tile]').hidden)return;
  close(r);selected=id;t.setAttribute('aria-expanded','true');place(r);
  if(scroll){const p=panels(r).find(x=>x.dataset.workshopPanel===id);requestAnimationFrame(()=>p?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));}
 }
 function filter(r){
  const q=(r.querySelector('#workshop-search')?.value||'').trim().toLocaleLowerCase('ru');
  const a=r.querySelector('[data-workshop-filter="audience"][aria-pressed="true"]')?.dataset.value;
  const c=r.querySelector('[data-workshop-filter="category"][aria-pressed="true"]')?.dataset.value;
  let count=0;
  for(const tile of tiles(r)){tile.hidden=!(tile.dataset.search||'').toLocaleLowerCase('ru').includes(q)||!!(a&&!tile.dataset.audience.split(' ').includes(a))||!!(c&&tile.dataset.category!==c);if(!tile.hidden)count++;}
  const pending=r.querySelector('[data-workshop-pending]');pending.hidden=!pending.querySelector('[data-workshop-tile]:not([hidden])');
  r.querySelector('.workshop-active').hidden=!r.querySelector('.workshop-tile:not([hidden])');
  r.querySelector('#workshop-empty').hidden=count>0;
  if(selected)place(r);
 }
 function load(){const r=root();if(r!==lastRoot){lastRoot=r;selected=null;}if(!r)return;filter(r);if(location.hash){try{const id=decodeURIComponent(location.hash.slice(1));open(r,id,true);}catch{}}}
 document.addEventListener('click',e=>{const r=root(),el=e.target instanceof Element?e.target:null;if(!r||!el||!r.contains(el))return;
  const f=el.closest('[data-workshop-filter]');if(f){for(const b of f.parentElement.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===f));filter(r);return;}
  const t=el.closest('[data-workshop-open]');if(t){if(selected===t.dataset.workshopOpen)close(r);else open(r,t.dataset.workshopOpen,true);return;}
  if(el.closest('[data-workshop-close]'))close(r,true);
 });
 document.addEventListener('input',e=>{const r=root();if(r&&e.target?.id==='workshop-search')filter(r);});
 window.addEventListener('resize',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const r=root();if(r)place(r);});});
 document.addEventListener('astro:page-load',load);window.addEventListener('hashchange',load);load();
}
