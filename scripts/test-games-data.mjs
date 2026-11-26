import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=n=>JSON.parse(readFileSync(new URL('../src/data/'+n+'.json',import.meta.url),'utf8'));
const games=read('games'),metadata=read('game-details'),archive=read('audio-archive').files;
const known=new Set(['circle','circle-center','circle-two','circle-outside','double-circle','lines','shuttle','chain','gates','triples','pairs']);
for(const [slug,m] of Object.entries(metadata)){assert.ok(games.some(g=>g.slug===slug),slug);if(m.formation)assert.ok(known.has(m.formation),slug);for(const k of ['age_min','age_max','players_min','players_max'])if(m[k]!=null)assert.ok(Number.isInteger(m[k])&&m[k]>0,slug+' '+k);if(m.age_max)assert.ok(m.age_max>=m.age_min);if(m.players_max)assert.ok(m.players_max>=m.players_min);}
for(const g of games){assert.ok(g.description.trim(),g.slug);for(const url of g.audio){const track=archive[url];assert.ok(track&&/^\/media\/audio\/[a-z0-9_-]+\.mp3$/.test(track.path),g.slug);assert.ok(existsSync(new URL('../public'+track.path,import.meta.url)),track.path);}}
console.log('Games metadata and local audio passed.');
