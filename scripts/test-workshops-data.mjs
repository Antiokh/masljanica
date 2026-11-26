import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=n=>JSON.parse(readFileSync(new URL('../src/data/'+n+'.json',import.meta.url),'utf8'));
const workshops=read('workshops'),meta=read('workshop-details');
assert.deepEqual(Object.keys(meta).sort(),workshops.map(w=>w.slug).sort());
for(const w of workshops){const m=meta[w.slug];assert.ok(['craft','art','movement'].includes(m.category));assert.ok(m.audience.every(a=>['children','adults'].includes(a)));assert.ok(/^[a-z-]+$/.test(m.art));assert.ok(existsSync(new URL('../public/media/workshops/'+m.art+'.svg',import.meta.url)));if(m.limit!=null)assert.ok(Number.isInteger(m.limit)&&m.limit>0);if(m.age_max!=null)assert.ok(m.age_max>=m.age_min);if(w.enabled)assert.ok(w.description.trim()&&m.result);}
assert.equal(meta['кто-такая-матрешка'].limit,10);
console.log('Workshop metadata and illustration sources passed.');
