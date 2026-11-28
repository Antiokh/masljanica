import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translate,localizedPath,localeOf} from '../src/lib/editorial-i18n.mjs';
const read=name=>JSON.parse(readFileSync(new URL('../src/data/'+name+'.json',import.meta.url),'utf8'));
for(const l of ['sr','en']){
 assert.equal(localeOf(localizedPath('/games/',l)),l);
 assert.equal(localizedPath('/en/games/#test',l),'/'+l+'/games/#test');
 assert.equal(localizedPath('/media/audio/a.mp3',l),'/media/audio/a.mp3');
 for(const [name,field] of [['games','description'],['scenario','text'],['workshops','description']]){
  for(const row of read(name)){const source=row[field];if(source?.trim())assert.notEqual(translate(source,l),source,name+' '+(row.slug??row.order)+' '+l);}
 }
 for(const song of read('songs'))assert.ok(read('song-meanings')[song.slug]?.[l],song.slug+' '+l);
}
console.log('Locale routes and editorial coverage verified.');
