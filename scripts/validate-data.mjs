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
assert(/^\d{4}-\d{2}-\d{2}$/.test(read('event').date),'Invalid event date');
console.log('Public content validation passed.');
