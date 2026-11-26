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

// Match the browser chrome to Starlight's actual selected theme.
const themeMeta = document.querySelector('meta[name="theme-color"]');
const syncThemeColor = () => { if(themeMeta) themeMeta.content = document.documentElement.dataset.theme === 'light' ? '#FFFFFF' : '#101827'; };
syncThemeColor();
new MutationObserver(syncThemeColor).observe(document.documentElement, {attributes:true,attributeFilter:['data-theme']});
