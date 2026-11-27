import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>JSON.parse(readFileSync(new URL('../src/data/'+name+'.json',import.meta.url),'utf8'));
const own=read('ditties'),folk=read('ditties-folk');
assert.ok(own.length>=20,'Keep the original author corpus and additions');
for(const verse of ["Нет у нас к блинам сметанки\nБыли деньги в альта-банке.\nКто был беден — не пропал\nКто богат был — бедным стал.","Ходят русские по банкам\nПросят разрешения\nПоложить, промежду прочим,\nДенег сбережения","Было ранее не густо\nС накоплением капусты\nНо приехала с села\nК нам капуста кисела","Кто не знает, но еда\nБезопасна не всегда\nПоросенка год кормили\nА теперь и он еда"]) assert.ok(own.some(x=>x.text===verse),'Preserve newly supplied author verse verbatim');
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

assert.ok(own.some(x=>x.text==="Говорили-говорили\nЧто студенты победили\nА на деле — хренушки!\nПобедили дедушки!"),'Preserve new student satire verbatim');

assert.ok(own.some(x=>x.text==="Как у дедушки мороза\nБыли признаки склероза\nНичего не помнит дед,\nНикакого дома нет."),'Preserve new Ded Moroz verse verbatim');

assert.ok(own.some(x=>x.text==="Нагнетали молодые\nПолитический насос\nВ результате разорили\nБанк, в котором бизнес рос"),'Preserve new bank satire verbatim');
