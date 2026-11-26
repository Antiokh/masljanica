// A single delegated native-dialog controller survives Astro navigation.
export function installCharacterDialogs(){
  let opener=null;
  function closeOpen(){document.querySelectorAll('dialog[data-character-dialog][open]').forEach(d=>d.close());}
  function open(button){
    const gallery=button.closest('[data-character-gallery]');
    const d=document.getElementById(button.getAttribute('aria-controls'));
    if(!gallery||!d||!gallery.contains(d)||d.open)return;
    closeOpen();opener=button;d.showModal();
  }
  document.addEventListener('click',event=>{
    const el=event.target instanceof Element?event.target:null;
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
  document.addEventListener('astro:before-swap',()=>{closeOpen();opener=null;});
}
