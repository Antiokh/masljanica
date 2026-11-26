import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=n=>JSON.parse(readFileSync(new URL('../src/data/'+n+'.json',import.meta.url),'utf8'));
const rows=read('scenario'),parts=read('parts'),actors=read('characters'),songs=read('songs'),archive=read('audio-archive').files;
assert.equal(new Set(rows.map(r=>r.order)).size,rows.length);
assert.deepEqual([...rows].sort((a,b)=>a.order-b.order).map(r=>r.order),Array.from({length:rows.length},(_,i)=>i+1));
for(const r of rows){assert.ok(parts.some(p=>p.number===r.part));assert.ok(actors.some(a=>a.id===r.actor));assert.ok(r.text.trim());if(r.song){const song=songs.find(s=>s.id===r.song);assert.ok(song?.audio.length);for(const u of song.audio){const a=archive[u];assert.ok(a&&/^\/media\/audio\/[a-z0-9_-]+\.mp3$/.test(a.path));assert.ok(existsSync(new URL('../public'+a.path,import.meta.url)));}}}
assert.ok(existsSync(new URL('../src/data/maslyanica-history.md',import.meta.url)));
console.log('Scenario and local musical cues passed.');
