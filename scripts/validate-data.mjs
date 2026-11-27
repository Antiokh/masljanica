import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export const read = name=>JSON.parse(readFileSync(new URL('../src/data/'+name+'.json',import.meta.url),'utf8'));
for(const name of ['songs','games','characters','scenario','parts','ditties','schedule','workshops']) {
  const rows=read(name); assert(Array.isArray(rows),name);
  const slugs=rows.filter(x=>x.slug).map(x=>x.slug);
  assert.equal(new Set(slugs).size,slugs.length,name+' duplicate slug');
  for(const slug of slugs)assert(/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(slug),'Invalid slug '+slug);
}
const actors=read('characters'),songs=read('songs'),parts=read('parts');
for(const row of read('scenario')) {assert(actors.some(x=>x.id===row.actor),'Actor '+row.order);assert(parts.some(x=>x.number===row.part),'Part '+row.order);if(row.song)assert(songs.some(x=>x.id===row.song),'Song '+row.order);}
const event=read('event');
const map=new URL(event.mapUrl);
assert(map.protocol==='https:'&&map.hostname==='www.google.com'&&map.pathname.startsWith('/maps/d/')&&map.searchParams.has('mid'),'Event site map');
const socials=read('socials');
assert(socials.length===3&&new Set(socials.map(x=>x.name)).size===3,'Festival social links');
for(const social of socials){const url=new URL(social.href);assert(url.protocol==='https:'&&['t.me','www.facebook.com','instagram.com'].includes(url.hostname)&&social.path,'Social link and local icon');}
assert(typeof event.address==='string'&&event.address.trim(),'Event address');
assert(typeof event.coords==='string'&&/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(event.coords),'Event coordinates');
for(const item of read('schedule')){
  assert(/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item.start),'Invalid start time '+item.slug);
  assert(/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item.end)&&item.end>item.start,'Invalid end time '+item.slug);
}
console.log('Public content validation passed.');
