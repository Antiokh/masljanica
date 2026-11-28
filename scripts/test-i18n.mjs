import assert from 'node:assert/strict';
import MarkdownIt from 'markdown-it';
import {resolveBuildCommit} from '../src/lib/build-info.mjs';
const commitA='a'.repeat(40),commitB='b'.repeat(40);
assert.equal(resolveBuildCommit({CF_PAGES_COMMIT_SHA:commitA,GITHUB_SHA:commitB},()=>{throw Error('Unexpected git');}),commitA);
assert.equal(resolveBuildCommit({GITHUB_SHA:commitB},()=>commitA),commitB);
assert.equal(resolveBuildCommit({CF_PAGES_COMMIT_SHA:'invalid'},()=>commitA+'\n'),commitA);
assert.equal(resolveBuildCommit({},()=>{throw Error('No git');}),null);
import {sources,localizedSources,localizedSourcePage} from '../src/lib/knowledge-content.mjs';
import {pageFor} from '../src/lib/site-content.mjs';
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
assert.equal(translate('Избушка','en'),'Home');
for(const locale of ['sr','en']){
 const records=localizedSources(locale),localized=localizedSourcePage(locale),page=pageFor('/'+locale+'/sources/');
 assert.equal(records.length,sources.length);
 assert.equal((localized.body.match(/^## /gm)||[]).length,sources.length);
 for(const [i,record] of records.entries()){
  assert.equal(record.id,sources[i].id);
  assert.equal(record.url,sources[i].url);
  assert.equal(record.year,sources[i].year);
  assert.notEqual(record.name,sources[i].name);
  assert.ok(localized.body.includes(record.name));
  if(record.url)assert.ok(localized.body.includes(record.url));
  if(record.type==='Book')assert.ok(localized.body.includes(sources[i].name));
  if(sources[i].author)assert.ok(record.author);
  if(sources[i].publication)assert.ok(record.publication);
 }
 assert.equal(page.body,localized.body);
 assert.equal(page.description,localized.description);
 assert.ok(page.seoTitle.startsWith(localized.seoTitle));
 assert.ok(page.body.includes('/'+locale+'/history/'));
 assert.ok(page.body.includes('/'+locale+'/ditties/'));
}
console.log('Locale routes and editorial coverage verified.');
