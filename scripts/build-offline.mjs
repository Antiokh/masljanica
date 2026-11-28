import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import {resourceKind} from '../public/offline-inventory.mjs';
const root='dist';
const excluded=new Set(['sw.js','_headers','_redirects','_routes.json','404.html','offline-manifest.json','offline-version.json']);
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(join(dir,x.name)):[join(dir,x.name)]);}
const assetPath=p=>relative(root,p).split('\\').join('/');
const exclusionReason=path=>excluded.has(path)?'internal':/^(?:(?:sr|en)\/)?(?:og|og-square)\//.test(path)?'og':/^(?:(?:sr|en)\/)?_llms-txt\//.test(path)||['llms.txt','llms-small.txt','llms-full.txt','robots.txt','festival.json','knowledge.jsonld'].includes(path)||/^sitemap.*\.xml$/.test(path)?'discovery':null;
const excludedBreakdown={};
const entries=walk(root).filter(p=>{const reason=exclusionReason(assetPath(p));if(!reason)return true;const group=excludedBreakdown[reason]??={count:0,bytes:0};group.count++;group.bytes+=readFileSync(p).length;return false;}).sort().map(p=>{
  const content=readFileSync(p);
  let url='/'+relative(root,p).split('/').map(encodeURIComponent).join('/');
  if(url.endsWith('/index.html'))url=url.slice(0,-10);
  return {url,bytes:content.length,revision:createHash('sha256').update(content).digest('hex')};
});
if(!entries.some(e=>e.url==='/pagefind/pagefind.js')||!entries.some(e=>e.url==='/pagefind/pagefind-entry.json'))throw Error('Pagefind output missing from offline corpus');
// Make the actual decoded payload and locale growth visible on every build.
const breakdown={};const groups=new Map();
for(const entry of entries){
 const path=entry.url,kind=resourceKind(path);
 const group=breakdown[kind]??={count:0,bytes:0};group.count++;group.bytes+=entry.bytes;
 if(/^\/(sr|en)\/(?:media|_astro|pagefind)\//.test(path))throw Error('Localized duplicate shared asset: '+path);
 const same=groups.get(entry.revision)??{count:0,bytes:entry.bytes};same.count++;groups.set(entry.revision,same);
}
console.log('Offline breakdown: '+JSON.stringify(breakdown));
console.log('Offline exclusions: '+JSON.stringify(excludedBreakdown));
if(entries.some(e=>exclusionReason(decodeURIComponent(e.url.slice(1)))))throw Error('Excluded discovery asset in offline pack');
console.log('Byte-identical entries (potential duplicate payload): '+[...groups.values()].reduce((n,x)=>n+(x.count-1)*x.bytes,0)+' bytes');
const version=createHash('sha256').update(JSON.stringify(entries)).digest('hex').slice(0,20);
const summary={schema:1,version,bytes:entries.reduce((n,x)=>n+x.bytes,0),count:entries.length};
writeFileSync(join(root,'offline-manifest.json'),JSON.stringify({...summary,breakdown,excludedBreakdown,entries}));
writeFileSync(join(root,'offline-version.json'),JSON.stringify(summary));
writeFileSync(join(root,'sw.js'),'const BUILD='+JSON.stringify(version)+';\nconst CURRENT_REVISIONS='+JSON.stringify(Object.fromEntries(entries.map(e=>[e.url,e.revision])))+';\n'+readFileSync('scripts/sw-template.js','utf8'));
console.log('Offline pack '+version+': '+summary.count+' entries, '+summary.bytes+' bytes');
