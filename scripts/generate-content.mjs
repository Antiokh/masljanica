import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { read } from './validate-data.mjs';
import {editorialPages,pageFor,pages} from '../src/lib/site-content.mjs';
import {translate,localizedPath} from '../public/i18n.mjs';
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
  const meta=pageFor('/'+section+'/'+slug+'/');
  const front='---\ntitle: '+JSON.stringify(title)+'\nslug: '+JSON.stringify(section+'/'+slug)+'\ndescription: '+JSON.stringify(meta?.description||title)+'\ntemplate: splash\n---\n\n';
  writeFileSync(new URL(encodeURIComponent(slug)+'.md',dir),front+'[← К списку](/'+section+'/)\n\n'+body+'\n');
}
const songs=read('songs'),games=read('games'),actors=read('characters');
for(const x of songs)page('songs',x.slug,x.title,media(x)+'<div class="song-lyrics">'+escape(x.lyrics)+'</div>');
for(const x of games)page('games',x.slug,x.title,escape(x.audience)+'\n\n'+media(x)+x.description);
for(const x of read('workshops'))page('workshops',x.slug,x.title,(x.enabled?'В программе.':'Пока не подтверждено (участие уточняется).')+'\n\n'+(x.host?'Ведущий: '+escape(x.host)+'\n\n':'')+'<div class="scenario-text">'+escape(x.description)+'</div>');
for(const p of read('parts')) {
 const body=read('scenario').filter(x=>x.part===p.number).map(x=>{
 const actor=actors.find(a=>a.id===x.actor),song=songs.find(s=>s.id===x.song);
 return '<p class="scenario-role">'+escape(actor?.title)+'</p>\n\n<div class="scenario-text">'+escape(x.text)+'</div>\n\n'+(song?'[♫ '+song.title+'](/songs/#'+song.slug+')\n\n':'')+'---\n\n';
 }).join('');
 page('scenario',String(p.number),p.title,body);
}
for(const p of editorialPages){
 const segments=p.path.split('/').filter(Boolean).map(decodeURIComponent);
 if(segments.length===2){page(segments[0],segments[1],p.title,p.body);continue;}
 const front='---\ntitle: '+JSON.stringify(p.title)+'\nslug: '+JSON.stringify(segments.join('/'))+'\ndescription: '+JSON.stringify(p.description)+'\ntemplate: splash\n---\n\n';
 writeFileSync(new URL(segments[0]+'.md',root),front+'[← На главную](/)\n\n'+p.body+'\n');
}
// Native Starlight localized docs: stable slugs and explicit original-language attribution.
for(const p of pages.filter(p=>p.lang&&p.basePath!=='/'&&!['/songs/','/games/','/scenario/','/workshops/','/pancakes/','/history/','/ditties/'].includes(p.basePath))){
 const segments=p.path.split('/').filter(Boolean).map(decodeURIComponent),file=segments.pop();
 const dir=new URL(segments.map(encodeURIComponent).join('/')+'/',root);mkdirSync(dir,{recursive:true});
 const front='---\ntitle: '+JSON.stringify(p.title)+'\nslug: '+JSON.stringify(p.path.slice(1,-1).split('/').map(decodeURIComponent).join('/'))+'\ndescription: '+JSON.stringify(p.description)+'\ntemplate: splash\n---\n\n';
 const parent=p.basePath.split('/').filter(Boolean).length>1?'/'+p.basePath.split('/').filter(Boolean)[0]+'/':'/';
 const body=p.body.replace(/\]\((\/[^)]+)\)/g,(_,href)=>']('+localizedPath(href,p.code)+')');
 writeFileSync(new URL(encodeURIComponent(file)+'.md',dir),front+'['+translate('← К списку',p.code)+']('+localizedPath(parent,p.code)+')\n\n'+translate('Оригинал на русском языке',p.code)+'\n\n<div lang="ru">\n\n'+body+'\n\n</div>\n');
}
console.log('Generated public content pages.');
