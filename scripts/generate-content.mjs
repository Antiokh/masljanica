import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { read } from './validate-data.mjs';
const root=new URL('../src/content/docs/generated/',import.meta.url);
rmSync(root,{recursive:true,force:true});mkdirSync(root,{recursive:true});
const escape=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const url=s=>{try{const u=new URL(s);return u.protocol==='https:'||u.protocol==='http:'?escape(u.href):''}catch{return ''}};
const audioManifest = new URL('../src/data/audio-archive.json', import.meta.url);
const archivedAudio = existsSync(audioManifest) ? JSON.parse(readFileSync(audioManifest, 'utf8')).files : {};
function audioSource(source) {
  const entry = archivedAudio[source];
  if (entry?.path && /^\/media\/audio\/[a-z0-9_-]+\.mp3$/.test(entry.path)
      && existsSync(new URL('../public' + entry.path, import.meta.url))) return entry.path;
  return url(source);
}
function media(x){
  let output='';
  if(x.video){try{const u=new URL(x.video);const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v');if(id&&/^[\w-]{11}$/.test(id))output+='<div class="external-video" data-online-only data-external-embed data-embed-src="https://www.youtube-nocookie.com/embed/'+id+'" data-embed-mode="auto" hidden><div data-embed-surface hidden></div></div>\n\n';else if(url(x.video))output+='<p data-online-only hidden><a href="'+url(x.video)+'" target="_blank" rel="noopener noreferrer">Видео</a></p>\n\n';}catch{}}
  for(const audio of x.audio??[]){const src=audioSource(audio);if(src)output+='<audio controls preload="none" src="'+src+'"></audio>\n\n';}
  return output;
}
function page(section,slug,title,body){
  const dir=new URL(section+'/',root);mkdirSync(dir,{recursive:true});
  const front='---\ntitle: '+JSON.stringify(title)+'\nslug: '+JSON.stringify(section+'/'+slug)+'\ntemplate: splash\n---\n\n';
  writeFileSync(new URL(encodeURIComponent(slug)+'.md',dir),front+'[← К списку](/'+section+'/)\n\n'+body+'\n');
}
const songs=read('songs'),games=read('games'),actors=read('characters');
for(const x of songs)page('songs',x.slug,x.title,media(x)+'<div class="song-lyrics">'+escape(x.lyrics)+'</div>');
for(const x of games)page('games',x.slug,x.title,escape(x.audience)+'\n\n'+media(x)+x.description);
for(const x of actors.filter(x=>x.show))page('characters',x.slug,x.title,(url(x.image)?'![Иллюстрация]('+url(x.image)+')\n\n':'')+'<div class="scenario-text">'+escape(x.description)+'</div>');
for(const x of read('workshops'))page('workshops',x.slug,x.title,(x.host?'Ведущий: '+escape(x.host)+'\n\n':'')+'<div class="scenario-text">'+escape(x.description)+'</div>');
for(const p of read('parts')) {
 const body=read('scenario').filter(x=>x.part===p.number).map(x=>{
 const actor=actors.find(a=>a.id===x.actor),song=songs.find(s=>s.id===x.song);
 return '<p class="scenario-role">'+escape(actor?.title)+'</p>\n\n<div class="scenario-text">'+escape(x.text)+'</div>\n\n'+(song?'[♫ '+song.title+'](/songs/#'+song.slug+')'\n\n':'')+'---\n\n';
 }).join('');
 page('scenario',String(p.number),p.title,body);
}
console.log('Generated public content pages.');
