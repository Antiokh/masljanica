import sharp from 'sharp';
import {readdir,readFile} from 'node:fs/promises';
const dir=new URL('../public/media/workshops/',import.meta.url);
for(const name of await readdir(dir)){
 if(!name.endsWith('.svg'))continue;
 const svg=await readFile(new URL(name,dir));
 await sharp(svg).resize(640,480).webp({quality:87}).toFile(new URL(name.replace(/\.svg$/,'.webp'),dir).pathname);
}
console.log('Workshop illustrations rendered.');
