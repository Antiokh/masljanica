import assert from 'node:assert/strict';
import {resourceKind,summarizeEntries,cacheKind,inventoryCaches} from '../public/offline-inventory.mjs';
assert.equal(resourceKind('/sr/games/'),'html:sr');
assert.equal(resourceKind('/en/index.html'),'html:en');
assert.equal(resourceKind('/media/audio/a.mp3'),'audio');
assert.equal(resourceKind('/sr/og/a.png'),'og');
assert.equal(resourceKind('/og-square/a.png'),'og');
assert.equal(resourceKind('/pagefind/a.js'),'search');
assert.equal(cacheKind('masljanica-staging-v2-a','masljanica-staging-v2-a'),'active');
assert.equal(cacheKind('masljanica-staging-v2-b','masljanica-staging-v2-a'),'staging');
const origin='https://example.invalid',abs=path=>origin+path;
const stores=new Map([
 ['masljanica-meta-v2',new Map([[abs('/__offline_active__'),JSON.stringify({cache:'masljanica-staging-v2-a',version:'a',bytes:3})]])],
 ['masljanica-staging-v2-a',new Map([[abs('/media/audio/a.mp3'),'abc']])],
 ['masljanica-staging-v2-b',new Map([[abs('/og/a.png'),'12345']])],
 ['masljanica-runtime-v2-a',new Map([[abs('/en/games/'),'1234']])]
]);
const storage={keys:async()=>[...stores.keys()],has:async name=>stores.has(name),open:async name=>{assert.ok(stores.has(name));const m=stores.get(name);return {keys:async()=>[...m.keys()].map(url=>({url})),match:async request=>{const key=typeof request==='string'?request:request.url;return m.has(key)?new Response(m.get(key)):undefined;}};}};
const result=await inventoryCaches(storage,origin);
assert.equal(result.activeExpectedBytes,3);
assert.equal(result.caches.find(c=>c.kind==='active').bytes,3);
assert.equal(result.caches.find(c=>c.kind==='staging').groups.og.bytes,5);
assert.equal(result.caches.find(c=>c.kind==='runtime').groups['html:en'].bytes,4);
assert.equal(result.total.bytes,[...stores.values()].flatMap(m=>[...m.values()]).reduce((n,v)=>n+v.length,0));
assert.equal(summarizeEntries([{url:'/a',bytes:null}]).unknown,1);
assert.equal(stores.size,4);
console.log('Read-only offline inventory and classification passed.');
