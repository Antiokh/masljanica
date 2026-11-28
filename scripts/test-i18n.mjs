import assert from 'node:assert/strict';
import MarkdownIt from 'markdown-it';
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
 const md=new MarkdownIt({html:false});
 for(const game of read('games')){
  const original=game.description.trim(),copy=translate(original,l);
  const html=md.render(copy);
  assert.ok(copy.includes('\n\n'), 'Game must not be flattened: '+game.slug+' '+l);
  if(/^#{1,6} /m.test(original)){
   assert.match(html,/<h4>/,game.slug+' '+l+' needs rule sections');
   assert.equal(copy.split('\n')[0],'### **'+translate(game.title,l)+'**',game.slug+' '+l+' localized rule title');
  }
  if(/^\|.*\|$/m.test(original))assert.match(html,/<table>/,game.slug+' '+l+' must retain tables');
  if(/^👫|^🏃|^🎶|^🎭 Ведущий|^🔄 Участники|^👑/u.test(original))assert.equal(copy.split('\n\n').length,original.split('\n\n').length,game.slug+' '+l+' must retain instruction blocks');
 }
 const source=read('games')[0].description.trim();
 assert.equal(translate(' '+source+'  ',l),' '+translate(source,l)+'  ','Editorial translation preserves surrounding whitespace');
 for(const song of read('songs'))assert.ok(read('song-meanings')[song.slug]?.[l],song.slug+' '+l);
}
const toggle=readFileSync(new URL('../src/components/LanguageToggle.astro',import.meta.url),'utf8');
assert.match(toggle,/data-language-choice=\{mode\.code\}/);
assert.match(toggle,/data-astro-reload/);
assert.match(toggle,/aria-current=\{locale===mode\.code\?/);
for(const flag of ['ru','gb','sr'])assert.match(readFileSync(new URL('../public/media/flags/'+flag+'.svg',import.meta.url),'utf8'),/<svg/);
console.log('Locale routes and editorial coverage verified.');
