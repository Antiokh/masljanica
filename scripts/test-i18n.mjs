import assert from 'node:assert/strict';
import {preferredLocale,chooseLocale} from '../public/locale-preference.mjs';
for(const [primary,saved,expected] of [['sr-Latn-RS',null,'sr'],['sr-Cyrl',null,'sr'],['en-GB',null,'en'],['de-DE',null,'ru'],['en-US','ru','ru'],['ru-RU','sr','sr']])assert.equal(preferredLocale(primary,saved),expected);
assert.equal(chooseLocale({path:'/games/',primary:'en-US'}),'en');
assert.equal(chooseLocale({path:'/en/games/',primary:'sr-RS'}),null);
assert.equal(chooseLocale({path:'/games/',primary:'en-US',saved:'ru'}),null);
assert.equal(chooseLocale({path:'/',primary:'sr-RS',explicit:'ru'}),null);
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
 const source=read('games')[0].description.trim();
 assert.equal(translate(' '+source+'  ',l),' '+translate(source,l)+'  ','Editorial translation preserves surrounding whitespace');
 for(const song of read('songs'))assert.ok(read('song-meanings')[song.slug]?.[l],song.slug+' '+l);
}
console.log('Locale routes and editorial coverage verified.');
