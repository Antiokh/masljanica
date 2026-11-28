// Shared build-time source for SEO, AI exports and social previews.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {asUTC} from './event-calendar.mjs';
import {sources,sourceText,terms,glossaryText,questions,faqText,participationText,localizedQuestions,localizedSources,localizedSourcePage} from './knowledge-content.mjs';
import {localizedFestivalPages} from './festival-locales.mjs';
import {translate,translateDocument,localizedPath,localeOf,stripLocale,languageTag} from './editorial-i18n.mjs';
export const site='https://masljanica.pages.dev';
export const brand='Масляница · Белград';
// Astro bundles server-side modules into dist before prerendering; resolve data from the project root.
const read=n=>JSON.parse(readFileSync(process.cwd()+'/src/data/'+n+'.json','utf8'));
const md=n=>readFileSync(process.cwd()+'/src/data/'+n+'.md','utf8').trim();
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
// Use the same event configuration for every social preview. No expired announcement.
export const ogEvent=upcoming?{
 date:dateLabel.replace(/\s*г\.$/u,''),
 time:period?period.start+'–'+period.end:'',
 location:event.address+', '+event.country
}:null;
const eventDescription=upcoming?'Дата фестиваля: '+dateLabel+(period?', '+period.start+'–'+period.end+' ('+config.timezone+')':'')+'. Место: '+event.address+'. Вход свободный, приветствуется донейшн на блины.': 'Дата ближайшего фестиваля не объявлена.';
const scheduleText=upcoming&&config.schedule?['## Программа на '+dateLabel,...schedule.map(x=>'- '+x.start+'–'+x.end+' — '+x.title+(x.games?' · '+link('Игры',url('/games/')):'')+(x.classes?' · '+link('Мастер-классы',url('/workshops/')):''))].join('\n'):'';
const media=x=>[...(x.audio||[]).map((u,i)=>audio[u]?.path?link('Аудиозапись '+(i+1),site+audio[u].path):''),x.video?link('Видео (внешний источник)',x.video):''].filter(Boolean).join(' · ');
const block=(title,href,text)=>'## '+title+'\n\nИсточник: '+href+'\n\n'+text;
const section=(path,title,description,body,extra={})=>({path:canonicalPath(path),title,description,body,...extra});
const eventTitle='Масленица'+(upcoming?' '+config.date.slice(0,4):'')+' в Белграде, Сербия — русский народный фестиваль';
const eventMeta=upcoming?dateLabel+(period?', '+period.start+'–'+period.end:'')+'. '+ogEvent.location+'. Вход свободный. Песни, игры, сказ, блины и народные мастерские.':'Русская Масляница в Белграде, Сербия: народные игры, песни, блины, театральный сказ и традиции. Следите за объявлением даты.';
const plot=md('festival-plot');
export const faq=questions({upcoming,date:ogEvent?.date,time:ogEvent?.time,location:ogEvent?.location,mapUrl:event.mapUrl});
const songBody=x=>[x.lyrics,media(x)].filter(Boolean).join('\n\n');
const gameBody=x=>{const d=gameDetails[x.slug]||{};return [x.historical?'Историческая игра.':'Развлекательная игра.','Аудитория: '+x.audience,d.age_min?'Возраст: '+d.age_min+(d.age_max?'–'+d.age_max:'+')+' лет.':'',d.players_min?'Участники: '+d.players_min+(d.players_max?'–'+d.players_max:'+')+'.':'',d.equipment?'Реквизит: '+d.equipment:'',x.description,media(x)].filter(Boolean).join('\n\n');};
const workshopBody=x=>{const d=workshopDetails[x.slug]||{};return [x.enabled?'В программе.':'Пока не подтверждено (не считать частью программы).',x.host?'Ведущий: '+x.host:'',d.age_min?'Возраст: '+d.age_min+(d.age_max?'–'+d.age_max:'+')+' лет.':'',d.limit?'Количество мест: '+d.limit:'',x.description].filter(Boolean).join('\n\n');};
const partBody=p=>scenario.filter(x=>x.part===p.number).sort((a,b)=>a.order-b.order).map(x=>{const a=actors.find(a=>a.id===x.actor),s=songs.find(s=>s.id===x.song);return '**'+a.title+'**\n\n'+x.text+(s?'\n\nМузыка: '+link(s.title,anchor('/songs/',s.slug)):'');}).join('\n\n');
const chapterBody=c=>[...c.paragraphs,...(c.images||[]).map(id=>{const m=historyMedia.find(x=>x.id===id);return m?m.caption+' · '+m.source+' · '+m.rights:'';}),...(c.songs||[]).map(slug=>link(songs.find(s=>s.slug===slug)?.title||slug,anchor('/songs/',slug))),...(c.games||[]).map(slug=>link(games.find(g=>g.slug===slug)?.title||slug,anchor('/games/',slug))),...(c.links||[]).map(x=>link(x.title,x.href)),'По источникам: '+c.source].join('\n\n');
const historyBody=chapters.map(c=>block(c.title,url('/history/'+c.id+'/'),chapterBody(c))).join('\n\n');
export const sections=[
 section('/','Масляница в Белграде',eventMeta,[eventDescription,scheduleText,'Социальные сети: '+socials.map(s=>link(s.name,s.href)).join(' · '),link('Карта площадки',event.mapUrl),md('maslyanica-history'),md('maslyanica-name'),plot,participationText()].filter(Boolean).join('\n\n'),{seoTitle:eventTitle}),
 section('/songs/','Песни','Народные песни, тексты и локальные аудиозаписи.',songs.map(x=>block(x.title,url('/songs/'+x.slug+'/'),songBody(x))).join('\n\n')),
 section('/games/','Игры','Народные игры и забавы: правила, аудитория, расстановка и музыка.',games.map(x=>block(x.title,url('/games/'+x.slug+'/'),gameBody(x))).join('\n\n')),
 section('/scenario/','Сказ','Герои, сценарий праздника и музыкальное сопровождение.',[md('maslyanica-history'),md('maslyanica-name'),plot,...actors.map(a=>block(a.title,anchor('/scenario/','character-'+a.slug),a.description)),...parts.map(p=>block(p.title,url('/scenario/'+p.number+'/'),partBody(p)))].join('\n\n')),
 section('/workshops/','Мастер-классы','Творческие занятия, рукоделие и народные мастерские; статус участия указан отдельно.',workshops.map(x=>block(x.title,url('/workshops/'+x.slug+'/'),workshopBody(x))).join('\n\n')),
 section('/pancakes/','Блины','24 исторических рецепта блинов и оладий из московского издания 1854 года.',recipes.map(x=>block(x.number+'. '+x.title,url('/pancakes/'+x.id+'/'),x.method+'\n\nИздание 1854 г., с. '+x.pages)).join('\n\n')),
 section('/history/','История','Масляница в старинных книгах, фотографиях, песнях и играх.',historyBody+'\n\nИсточники: Н. Дубровский, «Масляница» (1870); И. Н. Божерянов (1894); «Лучшие московские блины» (1854); В. И. Даль, статья «Масло».'),
 section('/ditties/','Частушки','Авторские и народные частушки с атрибуцией и источниками.',[...ditties.map(x=>x.text+'\n\nАвтор: Антон Назаров · Белград'),...folk.items.map(x=>{const s=folk.sources[x.source];return x.text+'\n\n'+[x.author||'Автор неизвестен',x.performer?'Исполнитель: '+x.performer:'',s.collection,link(s.title,s.url)].filter(Boolean).join(' · ');})].join('\n\n---\n\n'))
];
const referenceSections=[
 section('/faq/','Вопросы о фестивале','Когда и где проходит Масляница в Белграде, бесплатный вход, программа и посещение с детьми.',faqText(faq),{seoTitle:'Масленица в Белграде — ответы на частые вопросы',kind:'FAQPage'}),
 section('/sources/','Источники','Историческая библиография Масленицы: Дубровский, Божерянов, Даль, Ушаков и старинные рецепты.',sourceText,{seoTitle:'Источники по истории Масленицы — книги и словари',kind:'CollectionPage'}),
 section('/glossary/','Словарь традиций','Масленица, Сырная неделя, скоморохи, заклички и другие понятия народной культуры.',glossaryText,{seoTitle:'Словарь масленичных и русских народных традиций',kind:'DefinedTermSet'})
];
export const editorialPages=[...referenceSections,
 section('/history/name/','Почему Масляница через «я»?','Историческое написание Масленицы в словарях Даля и Ушакова, книге Дубровского 1870 года.',md('maslyanica-name')+'\n\n[История праздника](/history/) · [Библиография](/sources/)',{seoTitle:'Масляница или Масленица — история написания через Я',kind:'Article'}),
 ...chapters.map(c=>section('/history/'+c.id+'/',c.title,'История Масленицы: '+c.title+'. По историческим источникам XIX века.',chapterBody(c)+'\n\n[Библиография](/sources/) · [История праздника](/history/)',{kind:'Article',seoTitle:c.title+' — история Масленицы'})),
 section('/scenario/plot/','Краткое содержание сказа','Сюжет авторского театрализованного праздника: Скоморох, Баба Яга, Зима, Весна и Масляница.',plot+'\n\n[Полный сценарий и персонажи](/scenario/)',{kind:'CreativeWork',seoTitle:'Сюжет театрализованной Масленицы — краткое содержание сказа'}),
 ...recipes.map(x=>section('/pancakes/'+x.id+'/',x.title,'Старинный рецепт из книги «Лучшие московские блины» (1854), с. '+x.pages+'. '+excerpt(x.method),x.method+'\n\nИсточник: «Лучшие московские блины», 1854, с. '+x.pages+'. Исторический рецепт, не апробирован на современной кухне. [Все рецепты](/pancakes/) · [Библиография](/sources/)',{kind:'Recipe',seoTitle:x.title+' — старинный рецепт 1854 года'}))
];
const seo={ '/songs/':'Масленичные и русские народные песни — тексты и аудио','/games/':games.length+' русских народных игр — правила и схемы','/scenario/':'Сценарий Масленицы — театрализованный праздник и персонажи','/workshops/':'Народные ремёсла и мастер-классы на Масленице в Белграде','/pancakes/':recipes.length+' старинных рецепта русских блинов и оладий — 1854 год','/history/':'История Масленицы — происхождение, обряды и традиции','/ditties/':'Русские народные и авторские частушки'};
for(const p of sections)if(seo[p.path])p.seoTitle=seo[p.path];
sections.push(...referenceSections);
const details=[
 ...songs.map(x=>section('/songs/'+x.slug+'/',x.title,'Текст песни «'+x.title+'»'+(x.audio?.length?', аудиозаписи':'')+'. '+excerpt(x.lyrics),songBody(x),{kind:'MusicComposition',seoTitle:x.title+' — текст'+(x.audio?.length?' и аудио':'')+' | Песенник Масляницы'})),
 ...games.map(x=>section('/games/'+x.slug+'/',x.title,(x.historical?'Историческая народная игра. ':'Развлекательная игра. ')+x.audience+'. '+excerpt(x.description),gameBody(x),{kind:'CreativeWork',seoTitle:'Игра «'+x.title+'» — правила и проведение'})),
 ...workshops.map(x=>section('/workshops/'+x.slug+'/',x.title,(x.enabled?'Мастер-класс Масляницы. ':'Мастер-класс пока не подтверждён. ')+excerpt(x.description),workshopBody(x))),
 ...parts.map(p=>section('/scenario/'+p.number+'/',p.title,'Театральный сказ Масляницы, часть '+p.number+'.',partBody(p)))
];
const localizedHome=localizedFestivalPages({upcoming,date:config.date,time:ogEvent?.time,location:ogEvent?.location,mapUrl:event.mapUrl,schedule,showSchedule:config.schedule});
const basePages=[...sections,...details,...editorialPages.filter(p=>!referenceSections.includes(p))];
const localizedLabel=(p,locale)=>{
 const t=s=>translate(s,locale),title=t(p.title);
 const section=basePages.find(x=>x.path!=='/'&&p.path.startsWith(x.path)&&x.path.split('/').filter(Boolean).length===1);
 const suffix=locale==='sr'?'Masljanica · Beograd':'Masljanica · Belgrade';
 const description=t(p.description);
 const bibliography=p.path==='/sources/'?localizedSourcePage(locale):null;
 return {...p,path:localizedPath(p.path,locale),basePath:p.path,lang:languageTag(locale),code:locale,locale:locale==='sr'?'sr_RS':'en_US',brand:locale==='sr'?'MASLJANICA · BEOGRAD':'MASLJANICA · BELGRADE',title,seoTitle:title+' · '+suffix,description:description===p.description&&/[А-Яа-яЁё]/u.test(description)?title+' · '+(section?t(section.title)+' · ':'')+suffix:description,body:p.path==='/sources/'?bibliography.body:p.path==='/faq/'?faqText(localizedQuestions({upcoming,date:new Intl.DateTimeFormat(languageTag(locale),{dateStyle:'long',timeZone:'UTC'}).format(new Date(config.date+'T00:00:00Z')),time:ogEvent?.time,location:ogEvent?.location,mapUrl:event.mapUrl},locale)):translateDocument(p.body,locale),...(bibliography?{description:bibliography.description,seoTitle:bibliography.seoTitle+' · '+suffix}:{})};
};
export const localizedPages=localizedHome.map(h=>({...h,basePath:'/',title:translate('Масляница в Белграде',h.code),body:[h.body,translateDocument(basePages[0].body,h.code)].join('\n\n')}));
const localizedDetails=['sr','en'].flatMap(locale=>basePages.filter(p=>p.path!=='/').map(p=>localizedLabel(p,locale)));
export const languageAlternates=[{lang:'ru',path:'/'},{lang:'sr-Latn',path:'/sr/'},{lang:'en',path:'/en/'},{lang:'x-default',path:'/'}];
export const alternatesFor=path=>languageAlternates.map(a=>({lang:a.lang,path:canonicalPath(localizedPath(stripLocale(canonicalPath(path)),a.lang==='sr-Latn'?'sr':a.lang==='en'?'en':'ru'))})).filter(a=>pages.some(p=>p.path===a.path));
sections.push(...localizedPages,...localizedDetails.filter(p=>p.basePath.split('/').filter(Boolean).length===1));
export const pages=[...basePages,...localizedPages,...localizedDetails];
export const pageFor=path=>pages.find(p=>p.path===canonicalPath(path));
export const ogPath=(path,format='landscape')=>{
 const dir=format==='square'?'/og-square/':'/og/';
 return dir+(canonicalPath(path)==='/'?'index':createHash('sha256').update(canonicalPath(path)).digest('hex').slice(0,20))+'.png';
};
const id=site+'/#website';
export const website={'@type':'WebSite','@id':id,name:brand,alternateName:['Масленица в Белграде','Масленица в Сербии','Masljanica','Maslenica u Beogradu','Maslenitsa in Belgrade'],url:site+'/',inLanguage:['ru','sr-Latn','en'],description:sections[0].description,sameAs:socials.map(s=>s.href)};
export function structuredData(p){
 const pageUrl=url(p.path),parent=sections.find(s=>s.path!=='/'&&s.path!=='/sr/'&&s.path!=='/en/'&&p.path.startsWith(s.path)),crumb=p.path==='/'?null:{'@type':'BreadcrumbList','@id':pageUrl+'#breadcrumb',itemListElement:[sections[0],...(parent&&parent!==p?[parent]:[]),p].map((x,i)=>({'@type':'ListItem',position:i+1,name:x.title,item:url(x.path)}))};
 const page={'@type':p.path==='/'||p.kind==='LocalizedFestival'||details.includes(p)||editorialPages.includes(p)?'WebPage':['/history/'].includes(p.path)?'WebPage':'CollectionPage','@id':pageUrl+'#webpage',url:pageUrl,name:p.title,description:p.description,inLanguage:p.lang||'ru',isPartOf:{'@id':id},primaryImageOfPage:{'@type':'ImageObject',url:site+ogPath(p.path),width:1200,height:630},...(crumb?{breadcrumb:{'@id':crumb['@id']}}:{})};
 const graph=[website,page];if(crumb)graph.push(crumb);
 if(p.path==='/'&&upcoming&&period){
  const iso=t=>asUTC(config.date,t,config.timezone).replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,'$1-$2-$3T$4:$5:$6Z');
  const [latitude,longitude]=event.coords.split(',').map(Number);
  const e={'@type':'Event','@id':site+'/#festival-'+config.date,name:'Масляница в Белграде',url:site+'/',description:eventDescription,startDate:iso(period.start),endDate:iso(period.end),eventAttendanceMode:'https://schema.org/OfflineEventAttendanceMode',location:{'@type':'Place',name:event.address,address:{'@type':'PostalAddress',streetAddress:event.address,addressLocality:event.city,addressCountry:event.countryCode},geo:{'@type':'GeoCoordinates',latitude,longitude}},image:[site+ogPath('/'),site+ogPath('/','square')],eventStatus:'https://schema.org/EventScheduled',isAccessibleForFree:true,offers:{'@type':'Offer',price:0,priceCurrency:'RSD',url:site+'/'}};
  graph.push(e);page.mainEntity={'@id':e['@id']};
 }
 if(p.kind==='LocalizedFestival'&&upcoming&&period)page.about={'@id':site+'/#festival-'+config.date};
 if(p.path==='/pancakes/')graph.push({'@type':'ItemList',itemListElement:recipes.map((x,i)=>({'@type':'ListItem',position:i+1,name:x.title,url:anchor('/pancakes/',x.id)}))});
 const entityId=pageUrl+'#content';
 const add=entity=>{graph.push({'@id':entityId,url:pageUrl,name:p.title,inLanguage:'ru',...entity});page.mainEntity={'@id':entityId};};
 if(p.kind==='Article')add({'@type':'Article',headline:p.title,description:p.description,mainEntityOfPage:{'@id':page['@id']},citation:sources.filter(s=>s.url&&p.body.includes(s.url)).map(s=>s.url)});
 if(p.kind==='Recipe'){const x=recipes.find(x=>p.path===canonicalPath('/pancakes/'+x.id+'/'));if(x)add({'@type':'Recipe',description:'Исторический рецепт из издания 1854 года',recipeCategory:x.category,recipeInstructions:x.method});}
 if(p.kind==='MusicComposition'){const x=songs.find(x=>p.path===canonicalPath('/songs/'+x.slug+'/'));if(x){const recordings=(x.audio||[]).map(u=>audio[u]).filter(a=>a?.path).map(a=>({'@type':'MusicRecording',name:x.title,audio:{'@type':'AudioObject',contentUrl:site+a.path}}));add({'@type':'MusicComposition',lyrics:{'@type':'CreativeWork',text:x.lyrics},...(recordings.length?{recordedAs:recordings}:{})});}}
 if(p.kind==='CreativeWork')add({'@type':'CreativeWork',description:p.description});
 if(p.kind==='FAQPage'&&!p.lang){page['@type']='FAQPage';page.mainEntity=faq.map(([name,text])=>({'@type':'Question',name,acceptedAnswer:{'@type':'Answer',text:text.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'$1 ($2)')}}));}
 if(p.kind==='DefinedTermSet'&&!p.lang)add({'@type':'DefinedTermSet',hasDefinedTerm:terms.map(([name,description,href])=>({'@type':'DefinedTerm',name,description,url:site+href}))});
 if((p.basePath||p.path)==='/sources/')for(const s of localizedSources(p.code||'ru'))graph.push({'@type':s.type||'CreativeWork','@id':pageUrl+'#'+s.id,name:s.name,...(s.originalName?{alternateName:s.originalName}:{}),...(s.author?{author:{'@type':'Person',name:s.author}}:{}),...(s.year?{datePublished:String(s.year)}:{}),...(s.url?{url:s.url}:{})});
 const children=pages.filter(x=>x.path!==p.path&&p.path!=='/'&&x.path.startsWith(p.path)&&x.path.split('/').length===p.path.split('/').length+1);
 if(children.length&&p.path!=='/pancakes/')graph.push({'@type':'ItemList',itemListElement:children.map((x,i)=>({'@type':'ListItem',position:i+1,name:x.title,url:url(x.path)}))});
 return {'@context':'https://schema.org','@graph':graph};
}
export const festivalData={name:'Масляница',alternateName:'Масленица',url:site+'/',upcoming,date:upcoming?config.date:null,timezone:config.timezone,start:ogEvent&&period?period.start:null,end:ogEvent&&period?period.end:null,location:upcoming?{name:event.venue,city:event.city,country:event.country,countryCode:event.countryCode,coordinates:event.coords,mapUrl:event.mapUrl}:null,freeAdmission:upcoming?true:null,programme:upcoming&&config.schedule?schedule:[],socials:socials.map(({name,href})=>({name,url:href}))};
export function knowledgeGraph(){const byId=new Map(),anonymous=[];for(const p of pages)for(const n of structuredData(p)['@graph']){if(n['@id'])byId.set(n['@id'],n);else anonymous.push(n);}return {'@context':'https://schema.org','@graph':[...byId.values(),...anonymous]};}
export const llmLd={'@context':['https://schema.org','https://llmld.org/v1'],'@type':'llmld:AIWebsite',name:brand,url:site+'/',inLanguage:['ru','sr-Latn','en'],description:sections[0].description,sameAs:socials.map(s=>s.href),keywords:['Масляница','Масленица','Белград','народные традиции','Maslenitsa','Belgrade','Serbia'],'llmld:summary':{one_liner:sections[0].description,key_facts:[eventDescription,'Дату мероприятия проверяйте по главной странице. Неподтверждённые мастер-классы не являются частью программы.','Исторические гипотезы и современные практики различаются; сохраняйте ссылки на источники.','Доступность материалов не означает общую открытую лицензию.']},'llmld:actions':{primary:[{name:'LLM index',url:site+'/llms.txt'},{name:'Full text',url:site+'/llms-full.txt'},{name:'Compact text',url:site+'/llms-small.txt'},{name:'Festival data',url:site+'/festival.json'},{name:'Knowledge graph',url:site+'/knowledge.jsonld'}]}};
export const aiIntro='# '+brand+'\n\n> '+sections[0].description+'\n\nОсновной язык — русский. Краткие версии фестиваля: /sr/ (сербский), /en/ (английский). Используйте канонические ссылки на конкретные страницы. '+eventDescription+' Сверяйте дату и статус программы перед рекомендацией посещения. Для исторических утверждений сохраняйте атрибуцию и ссылки; общая лицензия на сторонние записи, изображения и тексты не заявлена.\n';
