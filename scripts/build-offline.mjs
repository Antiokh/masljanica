import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {createHash} from 'node:crypto';
const root='dist';
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(join(dir,x.name)):[join(dir,x.name)]);}
const excluded = new Set(['sw.js', '_headers', '_redirects', '_routes.json', '404.html']);
const files=walk(root).filter(p=>!excluded.has(relative(root,p))).sort();
const hash=createHash('sha256');for(const p of files){hash.update(p);hash.update(readFileSync(p));}
const paths=files.map(p=>'/'+relative(root,p).split('/').map(encodeURIComponent).join('/')).map(p=>p.endsWith('/index.html')?p.slice(0,-10):p);
const code='const CACHE='+JSON.stringify('masljanica-'+hash.digest('hex').slice(0,16))+';\nconst URLS='+JSON.stringify(paths)+';\n'+readFileSync('scripts/sw-template.js','utf8');
writeFileSync(join(root,'sw.js'),code);
console.log('Offline manifest: '+paths.length+' resources.');
