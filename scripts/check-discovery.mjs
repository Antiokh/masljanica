import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import sharp from 'sharp';
import {pages,site,url,ogPath,ogEvent,festivalData,languageAlternates,alternatesFor} from '../src/lib/site-content.mjs';
import {renderOgSvg,ogFormats} from './og-layout.mjs';
for(const [format,layout] of Object.entries(ogFormats)){
 const sample=renderOgSvg('Сказ',{date:'14 марта 2027',time:'11:30–16:00',location:'Roštilj zona, Ada Ciganlija, Beograd'},'Герои, сценарий праздника и музыкальное сопровождение.',format);
 for(const text of ['14 марта 2027','11:30–16:00','Roštilj zona','Сказ','Герои, сценарий'])assert.ok(sample.includes(text),'OG content: '+format+' '+text);
 assert.ok(!sample.includes('#FFE2C8'),'No separate background under event metadata');
 assert.ok(layout.sun.x+layout.sun.size<=layout.width&&layout.sun.y+layout.sun.size<=layout.height,'Sun fits canvas');
 assert.ok(!renderOgSvg('Сказ',null,'',format).includes('11:30'),'No expired event');
}
assert.ok(!renderOgSvg('Сказ',null).includes('11:30'),'No stale event in timeless preview');
if(ogEvent){
 const active=renderOgSvg('Сказ',ogEvent);
 assert.ok(active.includes(ogEvent.date),'OG uses current event date');
 if(ogEvent.time)assert.ok(active.includes(ogEvent.time),'OG uses current schedule');
}
const root='dist';
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+pages.map(p=>'<url><loc>'+escape(url(p.path))+'</loc></url>').join('')+'</urlset>';
writeFileSync(root+'/sitemap-0.xml',sitemap);
writeFileSync(root+'/sitemap-index.xml','<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>'+site+'/sitemap-0.xml</loc></sitemap></sitemapindex>');
for(const p of pages){
 const candidates=[root+p.path+'index.html',root+decodeURIComponent(p.path)+'index.html'];
 const file=candidates.find(existsSync);assert.ok(file,'Canonical page missing: '+p.path);
 const html=readFileSync(file,'utf8');
 for(const marker of ['og:image','twitter:card','masljanica-schema','rel="canonical"',site+ogPath(p.path)])assert.ok(html.includes(marker),p.path+' missing '+marker);
 if(p.seoTitle)assert.ok(html.includes(p.seoTitle.replaceAll('&','&amp;')),p.path+' SEO title');
 {
  const alternates=alternatesFor(p.path);
  assert.equal(alternates.length,languageAlternates.length,p.path+' alternate route coverage');
  const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
  const links=[...html.matchAll(/<link\b[^>]*>/g)].map(m=>attrs(m[0]));
  assert.deepEqual(links.filter(x=>x.rel==='canonical').map(x=>x.href),[url(p.path)],p.path+' self canonical');
  const actual=links.filter(x=>x.rel==='alternate'&&x.hreflang).map(x=>[x.hreflang,x.href]).sort();
  assert.deepEqual(actual,alternates.map(a=>[a.lang,url(a.path)]).sort(),p.path+' exact alternate URLs');
  for(const a of alternates)assert.ok(alternatesFor(a.path).some(b=>b.lang===(p.lang||'ru')&&b.path===p.path),p.path+' reciprocal '+a.lang);
  assert.equal(/<html\b[^>]*\blang="([^"]+)"/.exec(html)?.[1],p.lang||'ru',p.path+' HTML language');
  const locales=[...html.matchAll(/<meta\b[^>]*>/g)].map(m=>attrs(m[0])).filter(x=>x.property==='og:locale:alternate').map(x=>x.content).sort();
  assert.deepEqual(locales,['ru_RU','sr_RS','en_US'].filter(x=>x!==(p.locale||'ru_RU')).sort(),p.path+' OG alternate locales');
 }
 const images=[...html.matchAll(/<meta\b[^>]*property="og:image"[^>]*content="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(images,[site+ogPath(p.path),site+ogPath(p.path,'square')],p.path+' ordered OG alternatives');
 for(const [format,layout] of Object.entries(ogFormats)){
  const m=await sharp(root+ogPath(p.path,format)).metadata();assert.equal(m.width,layout.width);assert.equal(m.height,layout.height);assert.equal(m.format,'png');
 }
}
for(const [path,size] of [['favicon-96x96.png',96],['apple-touch-icon.png',180],['web-app-manifest-192x192.png',192],['web-app-manifest-512x512.png',512],['maskable-512x512.png',512]]){const m=await sharp(root+'/'+path).metadata();assert.equal(m.width,size);assert.equal(m.height,size);}
assert.ok(existsSync(root+'/favicon.ico'));
const manifest=JSON.parse(readFileSync(root+'/manifest.webmanifest','utf8'));
assert.equal(manifest.name,'Масляница');assert.equal(manifest.short_name,'Масляница');
assert.equal(manifest.background_color,'#101827');assert.equal(manifest.theme_color,'#101827');
for(const icon of manifest.icons)assert.ok(existsSync(root+icon.src),icon.src);
assert.ok(manifest.icons.some(x=>x.purpose==='maskable'));
for(const path of ['/apple-touch-icon.png','/maskable-512x512.png']){
 const {data}=await sharp(root+path).extract({left:0,top:0,width:1,height:1}).removeAlpha().raw().toBuffer({resolveWithObject:true});
 assert.deepEqual([...data],[16,24,39],path+' uses dark launch palette');
}
const home=readFileSync(root+'/index.html','utf8');
assert.match(home,/<meta\b[^>]*name="theme-color"[^>]*content="#101827"/);
assert.ok(home.includes('apple-mobile-web-app-title'));
for(const name of ['llms.txt','llms-small.txt','llms-full.txt','robots.txt'])assert.ok(readFileSync(root+'/'+name,'utf8').includes(site),name);
assert.equal(new Set(pages.map(p=>p.path)).size,pages.length,'Unique canonical pages');
const festival=JSON.parse(readFileSync(root+'/festival.json','utf8'));assert.deepEqual(festival,festivalData);
if(festival.upcoming){assert.equal(festival.location.countryCode,'RS');assert.ok(ogEvent.location.includes(festival.location.country));}
const graph=JSON.parse(readFileSync(root+'/knowledge.jsonld','utf8'))['@graph'];
for(const type of ['WebSite','Article','Recipe','MusicComposition','FAQPage','DefinedTermSet','Book'])assert.ok(graph.some(n=>n['@type']===type),'Graph type '+type);
const full=readFileSync(root+'/llms-full.txt','utf8');for(const p of pages)assert.ok(full.includes(p.title),p.title+' absent from AI corpus');
console.log('Canonical routes, PNG previews, icons, sitemap and AI corpus verified.');
