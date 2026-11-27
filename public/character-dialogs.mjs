// A single delegated native-dialog controller survives Astro navigation.
export function installCharacterDialogs(){
  let opener=null;
  const desktop=matchMedia('(min-width:60rem)');
  function setExpanded(wrapper,expanded){
    const toggle=wrapper?.querySelector('[data-character-toggle]');if(!toggle)return;
    wrapper.dataset.characterExpanded=String(expanded);
    toggle.setAttribute('aria-expanded',String(expanded));
    toggle.querySelector('[data-character-more]').hidden=expanded;
    toggle.querySelector('[data-character-less]').hidden=!expanded;
  }
  function initGallery(){
    for(const wrapper of document.querySelectorAll('[data-character-disclosure]')){
      const toggle=wrapper.querySelector('[data-character-toggle]');if(!toggle)continue;
      if(!wrapper.hasAttribute('data-character-expanded'))setExpanded(wrapper,false);
      toggle.hidden=!desktop.matches;
    }
  }
  function closeOpen(){document.querySelectorAll('dialog[data-character-dialog][open]').forEach(d=>d.close());}
  function open(button){
    const gallery=button.closest('[data-character-gallery]');
    const d=document.getElementById(button.getAttribute('aria-controls'));
    if(!gallery||!d||!gallery.contains(d)||d.open)return;
    closeOpen();opener=button;d.showModal();
  }
  document.addEventListener('click',event=>{
    const el=event.target instanceof Element?event.target:null;
    const toggle=el?.closest('[data-character-toggle]');
    if(toggle){const wrapper=toggle.closest('[data-character-disclosure]');setExpanded(wrapper,toggle.getAttribute('aria-expanded')!=='true');return;}
    const button=el?.closest('[data-character-open]');
    if(button){open(button);return;}
    if(el?.closest('[data-character-close]'))el.closest('dialog')?.close();
    else if(el?.matches('dialog[data-character-dialog]')){
      const r=el.getBoundingClientRect();
      if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)el.close();
    }
  });
  document.addEventListener('close',event=>{
    if(event.target.matches?.('[data-character-dialog]')){if(opener?.isConnected)opener.focus({preventScroll:true});opener=null;}
  },true);
  function openFromHash(){
    if(!/^\/scenario\/?$/.test(location.pathname))return;
    let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
    if(!id.startsWith('character-'))return;
    const d=document.getElementById(id);
    if(!d?.matches('dialog[data-character-dialog]')||d.open)return;
    const gallery=d.closest('[data-character-gallery]');
    const button=[...gallery?.querySelectorAll('[data-character-open]')||[]].find(el=>el.getAttribute('aria-controls')===id);
    if(button){
      if(desktop.matches&&button.matches('.home-character-grid > :nth-child(n+6)'))setExpanded(button.closest('[data-character-disclosure]'),true);
      button.scrollIntoView({block:'center'});open(button);
    }
  }
  document.addEventListener('astro:page-load',()=>{initGallery();openFromHash();});
  desktop.addEventListener('change',initGallery);
  window.addEventListener('hashchange',openFromHash);
  document.addEventListener('astro:before-swap',()=>{closeOpen();opener=null;});
  initGallery();openFromHash();
}
