import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import sharp from 'sharp';
import {pages,site,url,ogPath} from '../src/lib/site-content.mjs';
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
 const m=await sharp(root+ogPath(p.path)).metadata();assert.equal(m.width,1200);assert.equal(m.height,630);assert.equal(m.format,'png');
}
for(const [path,size] of [['favicon-96x96.png',96],['apple-touch-icon.png',180],['web-app-manifest-192x192.png',192],['web-app-manifest-512x512.png',512],['maskable-512x512.png',512]]){const m=await sharp(root+'/'+path).metadata();assert.equal(m.width,size);assert.equal(m.height,size);}
assert.ok(existsSync(root+'/favicon.ico'));
for(const name of ['llms.txt','llms-small.txt','llms-full.txt','robots.txt'])assert.ok(readFileSync(root+'/'+name,'utf8').includes(site),name);
const full=readFileSync(root+'/llms-full.txt','utf8');for(const p of pages)assert.ok(full.includes(p.title),p.title+' absent from AI corpus');
console.log('Canonical routes, PNG previews, icons, sitemap and AI corpus verified.');
