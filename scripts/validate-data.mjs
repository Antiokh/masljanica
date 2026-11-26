import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export const read = name=>JSON.parse(readFileSync(new URL('../src/data/'+name+'.json',import.meta.url),'utf8'));
const counts={songs:15,games:31,characters:9,scenario:49,parts:3,ditties:13,schedule:5,workshops:9};
for(const [name,count] of Object.entries(counts)) {
  const rows=read(name); assert.equal(rows.length,count,name);
  const slugs=rows.filter(x=>x.slug).map(x=>x.slug); assert.equal(new Set(slugs).size,slugs.length,name+' duplicate slug');
}
const actors=read('characters'),songs=read('songs'),parts=read('parts');
for(const row of read('scenario')) {assert(actors.some(x=>x.id===row.actor));assert(parts.some(x=>x.number===row.part));if(row.song)assert(songs.some(x=>x.id===row.song));}
assert.equal(read('event').date,'2027-03-14');
console.log('Public content validation passed.');
