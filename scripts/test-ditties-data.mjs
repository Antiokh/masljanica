import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>JSON.parse(readFileSync(new URL('../src/data/'+name+'.json',import.meta.url),'utf8'));
const own=read('ditties'),folk=read('ditties-folk');
assert.equal(own.length,13,'Keep the original author corpus');
assert.ok(folk.items.length>=47);
const normalize=text=>text.toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[^а-яa-z0-9]/g,'');
const texts=[...own,...folk.items].map(x=>normalize(x.text));
assert.ok(texts.every(Boolean));assert.equal(new Set(texts).size,texts.length,'No exact normalized duplicates');
const ids=new Set();
for(const item of folk.items){
 assert.ok(['folk','bawdy'].includes(item.category));
 assert.ok(item.text.split('\n').length>=3);
 const source=folk.sources[item.source];assert.ok(source?.title&&source.collection&&source.short);
 assert.equal(new URL(source.url).hostname,'publicadomain.ru');
 assert.ok(Number.isInteger(item.number)&&item.number>0);
 const key=item.source+':'+item.number;assert.ok(!ids.has(key));ids.add(key);
}
console.log('Original ditties, anonymous folklore, source references and duplicates passed.');
