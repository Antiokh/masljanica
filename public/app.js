if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
document.addEventListener('play', event => {
  if (event.target instanceof HTMLAudioElement) document.querySelectorAll('audio').forEach(audio => { if (audio !== event.target) audio.pause(); });
}, true);
document.addEventListener('click', event => {
  const menu=document.querySelector('.more-menu');
  if(menu?.open&&!menu.contains(event.target))menu.open=false;
});
