import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
const root='dist';
const excluded=new Set(['sw.js','_headers','_redirects','_routes.json','404.html','offline-manifest.json','offline-version.json']);
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(join(dir,x.name)):[join(dir,x.name)]);}
const entries=walk(root).filter(p=>{const path=relative(root,p).replaceAll('\\','/');return !excluded.has(path)&&!path.startsWith('og/')&&!path.startsWith('_llms-txt/')&&!/^llms(?:-small|-full)?\\.txt$/.test(path)&&!/^sitemap.*\\.xml$/.test(path)&&path!=='robots.txt';}).sort().map(p=>{
  const content=readFileSync(p);
  let url='/'+relative(root,p).split('/').map(encodeURIComponent).join('/');
  if(url.endsWith('/index.html'))url=url.slice(0,-10);
  return {url,bytes:content.length,revision:createHash('sha256').update(content).digest('hex')};
});
if(!entries.some(e=>e.url==='/pagefind/pagefind.js')||!entries.some(e=>e.url==='/pagefind/pagefind-entry.json'))throw Error('Pagefind output missing from offline corpus');
const version=createHash('sha256').update(JSON.stringify(entries)).digest('hex').slice(0,20);
const summary={schema:1,version,bytes:entries.reduce((n,x)=>n+x.bytes,0),count:entries.length};
writeFileSync(join(root,'offline-manifest.json'),JSON.stringify({...summary,entries}));
writeFileSync(join(root,'offline-version.json'),JSON.stringify(summary));
writeFileSync(join(root,'sw.js'),'const BUILD='+JSON.stringify(version)+';\nconst CURRENT_REVISIONS='+JSON.stringify(Object.fromEntries(entries.map(e=>[e.url,e.revision])))+';\n'+readFileSync('scripts/sw-template.js','utf8'));
console.log('Offline pack '+version+': '+summary.count+' entries, '+summary.bytes+' bytes');
