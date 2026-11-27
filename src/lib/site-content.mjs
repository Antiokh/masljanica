// Shared build-time source for SEO, AI exports and social previews.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {asUTC} from './event-calendar.mjs';
export const site='https://masljanica.pages.dev';
export const brand='Масляница · Белград';
const read=n=>JSON.parse(readFileSync(new URL('../data/'+n+'.json',import.meta.url),'utf8'));
const md=n=>readFileSync(new URL('../data/'+n+'.md',import.meta.url),'utf8').trim();
const home=md('home');
function field(name){const m=home.match(new RegExp('^  '+name+': +(.+)$','m'));if(!m)throw Error('Missing event '+name);return m[1].trim().replace(/^["']|["']$/g,'');}
const config={enabled:field('enabled')==='true',schedule:field('schedule')==='true',date:field('date'),timezone:field('timezone')};
const event=read('event'),schedule=read('schedule').sort((a,b)=>a.start.localeCompare(b.start)),socials=read('socials'),songs=read('songs'),games=read('games'),actors=read('characters'),parts=read('parts'),scenario=read('scenario'),workshops=read('workshops'),recipes=read('pancake-recipes'),chapters=read('history-chapters'),historyMedia=read('history-media'),ditties=read('ditties'),folk=read('ditties-folk'),audio=read('audio-archive').files,gameDetails=read('game-details'),workshopDetails=read('workshop-details');
export const canonicalPath=path=>{const segments=path.split('/').filter(Boolean).map(s=>encodeURIComponent(decodeURIComponent(s)));return segments.length?'/'+segments.join('/')+'/':'/';};
export const url=path=>site+canonicalPath(path);
const anchor=(path,id)=>url(path)+'#'+encodeURIComponent(id);
const link=(title,href)=>'['+title+']('+href+')';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const excerpt=s=>{const t=clean(s).replace(/[#*_]/g,'');return t.length>155?t.slice(0,152).trimEnd()+'…':t;};
const period=config.enabled&&config.schedule&&schedule.length?{start:schedule[0].start,end:schedule.reduce((v,x)=>x.end>v?x.end:v,'')}:null;
const dateLabel=new Intl.DateTimeFormat('ru-RU',{dateStyle:'long',timeZone:'UTC'}).format(new Date(config.date+'T00:00:00Z'));
const nowDay=new Intl.DateTimeFormat('sv-SE',{timeZone:config.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const upcoming=config.enabled&&config.date>=nowDay;
const eventDescription=config.enabled?'Дата фестиваля: '+dateLabel+(period?', '+period.start+'–'+period.end+' ('+config.timezone+')':'')+'. Место: '+event.address+'. Вход свободный, приветствуется донейшн на блины.': 'Дата ближайшего фестиваля не объявлена.';
const scheduleText=config.enabled&&config.schedule?['## Программа на '+dateLabel,...schedule.map(x=>'- '+x.start+'–'+x.end+' — '+x.title+(x.games?' · '+link('Игры',url('/games/')):'')+(x.classes?' · '+link('Мастер-классы',url('/workshops/')):''))].join('\n'):'';
const media=x=>[...(x.audio||[]).map((u,i)=>audio[u]?.path?link('Аудиозапись '+(i+1),site+audio[u].path):''),x.video?link('Видео (внешний источник)',x.video):''].filter(Boolean).join(' · ');
const block=(title,href,text)=>'## '+title+'\n\nИсточник: '+href+'\n\n'+text;
const section=(path,title,description,body)=>({path:canonicalPath(path),title,description,body});
const songBody=x=>[x.lyrics,media(x)].filter(Boolean).join('\n\n');
const gameBody=x=>{const d=gameDetails[x.slug]||{};return [x.historical?'Историческая игра.':'Развлекательная игра.','Аудитория: '+x.audience,d.age_min?'Возраст: '+d.age_min+(d.age_max?'–'+d.age_max:'+')+' лет.':'',d.players_min?'Участники: '+d.players_min+(d.players_max?'–'+d.players_max:'+')+'.':'',d.equipment?'Реквизит: '+d.equipment:'',x.description,media(x)].filter(Boolean).join('\n\n');};
const workshopBody=x=>{const d=workshopDetails[x.slug]||{};return [x.enabled?'В программе.':'Пока не подтверждено (не считать частью программы).',x.host?'Ведущий: '+x.host:'',d.age_min?'Возраст: '+d.age_min+(d.age_max?'–'+d.age_max:'+')+' лет.':'',d.limit?'Количество мест: '+d.limit:'',x.description].filter(Boolean).join('\n\n');};
const partBody=p=>scenario.filter(x=>x.part===p.number).sort((a,b)=>a.order-b.order).map(x=>{const a=actors.find(a=>a.id===x.actor),s=songs.find(s=>s.id===x.song);return '**'+a.title+'**\n\n'+x.text+(s?'\n\nМузыка: '+link(s.title,anchor('/songs/',s.slug)):'');}).join('\n\n');
const historyBody=chapters.map(c=>block(c.title,anchor('/history/',c.id),[...c.paragraphs,...(c.images||[]).map(id=>{const m=historyMedia.find(x=>x.id===id);return m?m.caption+' · '+m.source+' · '+m.rights:'';}),...(c.songs||[]).map(slug=>link(songs.find(s=>s.slug===slug)?.title||slug,anchor('/songs/',slug))),...(c.games||[]).map(slug=>link(games.find(g=>g.slug===slug)?.title||slug,anchor('/games/',slug))),...(c.links||[]).map(x=>link(x.title,x.href)),'По источникам: '+c.source].join('\n\n'))).join('\n\n');
export const sections=[
 section('/','Масляница в Белграде','Народный праздник в Белграде: программа, песни, игры, сказ, блины и традиции.',[eventDescription,scheduleText,'Социальные сети: '+socials.map(s=>link(s.name,s.href)).join(' · '),link('Карта площадки',event.mapUrl),md('maslyanica-history'),md('maslyanica-name')].filter(Boolean).join('\n\n')),
 section('/songs/','Песни','Народные песни, тексты и локальные аудиозаписи.',songs.map(x=>block(x.title,url('/songs/'+x.slug+'/'),songBody(x))).join('\n\n')),
 section('/games/','Игры','Народные игры и забавы: правила, аудитория, расстановка и музыка.',games.map(x=>block(x.title,url('/games/'+x.slug+'/'),gameBody(x))).join('\n\n')),
 section('/scenario/','Сказ','Герои, сценарий праздника и музыкальное сопровождение.',[md('maslyanica-history'),md('maslyanica-name'),...actors.map(a=>block(a.title,anchor('/scenario/','character-'+a.slug),a.description)),...parts.map(p=>block(p.title,url('/scenario/'+p.number+'/'),partBody(p)))].join('\n\n')),
 section('/workshops/','Мастер-классы','Творческие занятия, рукоделие и народные мастерские; статус участия указан отдельно.',workshops.map(x=>block(x.title,url('/workshops/'+x.slug+'/'),workshopBody(x))).join('\n\n')),
 section('/pancakes/','Блины','24 исторических рецепта блинов и оладий из московского издания 1854 года.',recipes.map(x=>block(x.number+'. '+x.title,anchor('/pancakes/',x.id),x.method+'\n\nИздание 1854 г., с. '+x.pages)).join('\n\n')),
 section('/history/','История','Масляница в старинных книгах, фотографиях, песнях и играх.',historyBody+'\n\nИсточники: Н. Дубровский, «Масляница» (1870); И. Н. Божерянов (1894); «Лучшие московские блины» (1854); В. И. Даль, статья «Масло».'),
 section('/ditties/','Частушки','Авторские и народные частушки с атрибуцией и источниками.',[...ditties.map(x=>x.text+'\n\nАвтор: Антон Назаров · Белград'),...folk.items.map(x=>{const s=folk.sources[x.source];return x.text+'\n\n'+[x.author||'Автор неизвестен',x.performer?'Исполнитель: '+x.performer:'',s.collection,link(s.title,s.url)].filter(Boolean).join(' · ');})].join('\n\n---\n\n'))
];
const details=[
 ...songs.map(x=>section('/songs/'+x.slug+'/',x.title,excerpt(x.lyrics)||'Народная песня и записи.',songBody(x))),
 ...games.map(x=>section('/games/'+x.slug+'/',x.title,'Правила народной игры. '+x.audience+'.',gameBody(x))),
 ...workshops.map(x=>section('/workshops/'+x.slug+'/',x.title,(x.enabled?'Мастер-класс Масляницы. ':'Мастер-класс пока не подтверждён. ')+excerpt(x.description),workshopBody(x))),
 ...parts.map(p=>section('/scenario/'+p.number+'/',p.title,'Театральный сказ Масляницы, часть '+p.number+'.',partBody(p)))
];
export const pages=[...sections,...details];
export const pageFor=path=>pages.find(p=>p.path===canonicalPath(path));
export const ogPath=path=>path==='/'?'/og/index.png':'/og/'+createHash('sha256').update(canonicalPath(path)).digest('hex').slice(0,20)+'.png';
const id=site+'/#website';
export const website={'@type':'WebSite','@id':id,name:brand,alternateName:['Масленица в Белграде','Masljanica'],url:site+'/',inLanguage:'ru',description:sections[0].description,sameAs:socials.map(s=>s.href)};
export function structuredData(p){
 const pageUrl=url(p.path),parent=sections.find(s=>s.path!=='/'&&p.path.startsWith(s.path)),crumb=p.path==='/'?null:{'@type':'BreadcrumbList','@id':pageUrl+'#breadcrumb',itemListElement:[sections[0],...(parent&&parent!==p?[parent]:[]),p].map((x,i)=>({'@type':'ListItem',position:i+1,name:x.title,item:url(x.path)}))};
 const page={'@type':p.path==='/'?'WebPage':details.includes(p)?'WebPage':['/history/'].includes(p.path)?'WebPage':'CollectionPage','@id':pageUrl+'#webpage',url:pageUrl,name:p.title,description:p.description,inLanguage:'ru',isPartOf:{'@id':id},primaryImageOfPage:{'@type':'ImageObject',url:site+ogPath(p.path),width:1200,height:630},...(crumb?{breadcrumb:{'@id':crumb['@id']}}:{})};
 const graph=[website,page];if(crumb)graph.push(crumb);
 if(p.path==='/'&&upcoming&&period){
  const iso=t=>asUTC(config.date,t,config.timezone).replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,'$1-$2-$3T$4:$5:$6Z');
  const [latitude,longitude]=event.coords.split(',').map(Number);
  const e={'@type':'Event','@id':site+'/#festival-'+config.date,name:'Масляница в Белграде',url:site+'/',description:eventDescription,startDate:iso(period.start),endDate:iso(period.end),eventAttendanceMode:'https://schema.org/OfflineEventAttendanceMode',location:{'@type':'Place',name:event.address,address:{'@type':'PostalAddress',streetAddress:event.address,addressLocality:'Beograd',addressCountry:'RS'},geo:{'@type':'GeoCoordinates',latitude,longitude}},image:[site+ogPath('/')],isAccessibleForFree:true};
  graph.push(e);page.mainEntity={'@id':e['@id']};
 }
 if(p.path==='/pancakes/')graph.push({'@type':'ItemList',itemListElement:recipes.map((x,i)=>({'@type':'ListItem',position:i+1,name:x.title,url:anchor('/pancakes/',x.id)}))});
 return {'@context':'https://schema.org','@graph':graph};
}
export const llmLd={'@context':['https://schema.org','https://llmld.org/v1'],'@type':'llmld:AIWebsite',name:brand,url:site+'/',inLanguage:'ru',description:sections[0].description,sameAs:socials.map(s=>s.href),keywords:['Масляница','Масленица','Белград','народные традиции','Maslenitsa','Belgrade','Serbia'],'llmld:summary':{one_liner:sections[0].description,key_facts:[eventDescription,'Дату мероприятия проверяйте по главной странице. Неподтверждённые мастер-классы не являются частью программы.','Исторические гипотезы и современные практики различаются; сохраняйте ссылки на источники.','Доступность материалов не означает общую открытую лицензию.']},'llmld:actions':{primary:[{name:'LLM index',url:site+'/llms.txt'},{name:'Full text',url:site+'/llms-full.txt'},{name:'Compact text',url:site+'/llms-small.txt'}]}};
export const aiIntro='# '+brand+'\n\n> '+sections[0].description+'\n\nОсновной язык — русский. Используйте канонические ссылки на конкретные страницы. '+eventDescription+' Сверяйте дату и статус программы перед рекомендацией посещения. Для исторических утверждений сохраняйте атрибуцию и ссылки; общая лицензия на сторонние записи, изображения и тексты не заявлена.\n';
