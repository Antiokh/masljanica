import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto,createHash} from 'node:crypto';
import vm from 'node:vm';
const origin='https://test.invalid', version='a'.repeat(20);
const abs=path=>new URL(path,origin).href;
const contents={'/':'home','/songs/':'songs','/games/':'games'};
const entries=Object.entries(contents).map(([url,body])=>({url,bytes:Buffer.byteLength(body),revision:createHash('sha256').update(body).digest('hex')}));
const manifest={schema:1,version,count:entries.length,bytes:entries.reduce((n,e)=>n+e.bytes,0),entries};
const stores=new Map(),requests=new Map(),listeners=new Map(),notices=[];
const caches={
 async open(name){if(!stores.has(name))stores.set(name,new Map());const data=stores.get(name);return {async match(k){return data.get(k)?.clone()},async put(k,v){data.set(k,v.clone())},async delete(k){return data.delete(k)}}},
 async has(name){return stores.has(name)},async keys(){return [...stores.keys()]},async delete(name){return stores.delete(name)}
};
const meta=await caches.open('masljanica-meta-v2');
const old=await caches.open('masljanica-pack-v2-old');
await old.put(abs('/'),new Response('old home'));
await old.put(abs('/__offline_manifest__'),new Response(JSON.stringify({entries:[]})));
await meta.put(abs('/__offline_active__'),new Response(JSON.stringify({cache:'masljanica-pack-v2-old',version:'old'})));
let fail=true;
const self={location:{origin},navigator:{onLine:true},clients:{async matchAll(){return [{postMessage(m){notices.push(m)}}]}},addEventListener(t,h){listeners.set(t,h)}};
const fetch=async input=>{
 const path=new URL(typeof input==='string'?input:input.url,origin).pathname;
 if(path==='/offline-manifest.json')return new Response(JSON.stringify(manifest));
 requests.set(path,(requests.get(path)||0)+1);
 const response=path==='/songs/'&&fail?new Response('unavailable',{status:503}):new Response(contents[path]);
 Object.defineProperty(response,'url',{value:abs(path)});
 return response;
};
const sandbox={self,caches,fetch,URL,Request,Response,Headers,Map,Set,Date,Promise,Uint8Array,Array,crypto:webcrypto,AbortController,setTimeout:(fn,ms)=>setTimeout(fn,ms<5000?0:ms),clearTimeout,console};
vm.createContext(sandbox);
vm.runInContext('const BUILD='+JSON.stringify(version)+'; const CURRENT_REVISIONS={};\n'+readFileSync(new URL('./sw-template.js',import.meta.url),'utf8'),sandbox);
async function command(type){const tasks=[];listeners.get('message')({data:{type},source:{postMessage(m){notices.push(m)}},waitUntil(p){tasks.push(p)}});await Promise.all(tasks);}
await command('OFFLINE_DOWNLOAD');
assert.equal((await (await meta.match(abs('/__offline_active__'))).json()).version,'old');
assert.ok(stores.has('masljanica-staging-v2-'+version));
assert.equal(requests.get('/games/'),1,'Primary pass must proceed past a transient error');
assert.ok(requests.get('/songs/')>=4,'Deferred tail must retry');
fail=false;
const runtime=await caches.open('masljanica-runtime-v2-'+version);
await runtime.put(abs('/songs/'),new Response(contents['/songs/']));
const beforeResume=requests.get('/songs/');
await command('OFFLINE_DOWNLOAD');
assert.equal(requests.get('/songs/'),beforeResume,'Verified warm entry must be reused');
assert.equal(stores.has('masljanica-runtime-v2-'+version),false,'Redundant runtime cache removed after activation');
assert.equal((await (await meta.match(abs('/__offline_active__'))).json()).version,version);
assert.equal(requests.get('/games/'),1,'Resume should reuse previously downloaded files');
assert.equal(stores.has('masljanica-pack-v2-old'),false);
await command('OFFLINE_DELETE');
assert.equal(await meta.match(abs('/__offline_active__')),undefined);
assert.equal([...stores.keys()].some(n=>n.startsWith('masljanica-staging-v2-')),false);
console.log('Offline transaction resume, deferred recovery and deletion passed.');
