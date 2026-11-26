import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const origin='https://test.invalid', build='current', revision='a'.repeat(64);
const url=p=>new URL(p,origin).href;
const cloneMap=new Map(), listeners=new Map();
let requests=0, scans=0, releaseWrite;
const blockedWrite=new Promise(resolve=>{releaseWrite=resolve;});
const caches={
  async open(name){
    if(!cloneMap.has(name))cloneMap.set(name,new Map());
    const data=cloneMap.get(name);
    return {async match(key){return data.get(key)?.clone();},async put(key,response){if(name.startsWith('masljanica-runtime-'))await blockedWrite;data.set(key,response.clone());},async keys(){scans++;return [...data.keys()];}};
  },
  async has(name){return cloneMap.has(name);},
  async keys(){scans++;return [...cloneMap.keys()];}
};
const meta=await caches.open('masljanica-meta-v2');
const pack=await caches.open('masljanica-pack-v2-old');
await meta.put(url('/__offline_active__'),new Response(JSON.stringify({cache:'masljanica-pack-v2-old',version:'old'})));
await pack.put(url('/'),new Response('old home'));
await pack.put(url('/songs/'),new Response('same songs'));
await pack.put(url('/pagefind/pagefind-entry.json'),new Response('{"languages":{}}'));
await pack.put(url('/__offline_manifest__'),new Response(JSON.stringify({entries:[{url:'/songs/',revision},{url:'/pagefind/pagefind-entry.json',revision},{url:'/',revision:'old'}]})));
const self={location:{origin},navigator:{onLine:true},addEventListener(type,handler){listeners.set(type,handler);}};
const sandbox={self,caches,URL,Request,Response,Headers,Map,Set,Date,Promise,AbortController,setTimeout,clearTimeout,console,fetch:async()=>{requests++;return new Response('new home');}};
vm.createContext(sandbox);
vm.runInContext('const BUILD='+JSON.stringify(build)+'; const CURRENT_REVISIONS='+JSON.stringify({'/songs/':revision,'/pagefind/pagefind-entry.json':revision,'/':'b'.repeat(64)})+';\n'+readFileSync(new URL('./sw-template.js',import.meta.url),'utf8'),sandbox);
function request(path){
  const waits=[];let response;
  listeners.get('fetch')({request:new Request(url(path)),waitUntil(p){waits.push(p);},respondWith(p){response=p;}});
  return {response,waits};
}
assert.equal(await (await request('/songs/').response).text(),'same songs');
assert.equal(requests,0,'Unchanged entries must not hit network after deployment');
const pending=request('/');
let timer;
try{
  const result=await Promise.race([pending.response,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Response blocked by CacheStorage write')),500);})]);
  assert.equal(await result.text(),'new home');
}finally{clearTimeout(timer);releaseWrite();}
await Promise.all(pending.waits);
assert.equal(requests,1);
assert.equal(await (await request('/').response).text(),'new home');
assert.equal(requests,1,'Warm runtime route must not hit network');
assert.equal(scans,0,'Normal cache hits and misses must not enumerate cache keys');
self.navigator.onLine=false;
assert.equal(await (await request('/songs/').response).text(),'same songs');
assert.equal(requests,1,'Offline navigation must not try network');
assert.equal(await (await request('/pagefind/pagefind-entry.json?ts=123456').response).text(),'{"languages":{}}');
assert.equal(requests,1,'Pagefind metadata cache-buster must resolve to its cached static revision');
assert.equal(request('/other.json?ts=123456').response,undefined,'Unrelated asset queries must retain normal network behavior');
console.log('Navigation cache latency regression checks passed.');
