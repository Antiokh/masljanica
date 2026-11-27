import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
import {site,brand,sections,pages,ogPath,url,aiIntro,ogEvent,editorialPages,festivalData,knowledgeGraph} from '../src/lib/site-content.mjs';
import {renderOgSvg,ogFormats} from './og-layout.mjs';
const out='public',sun='public/media/maslyanica-sun.webp';
await mkdir(out+'/og',{recursive:true});await mkdir(out+'/og-square',{recursive:true});await mkdir(out+'/_llms-txt',{recursive:true});
const png=async(size,inner=size,bg={r:0,g:0,b:0,alpha:0})=>{
 const art=await sharp(sun).resize(inner,inner,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
 return sharp({create:{width:size,height:size,channels:4,background:bg}}).composite([{input:art,gravity:'centre'}]).png().toBuffer();
};
const iconBackground='#101827';
for(const [name,size,inner,bg] of [['favicon-96x96.png',96,96],['apple-touch-icon.png',180,150,iconBackground],['web-app-manifest-192x192.png',192,192],['web-app-manifest-512x512.png',512,512],['maskable-512x512.png',512,392,iconBackground]])await writeFile(out+'/'+name,await png(size,inner,bg));
// ICO with PNG-encoded 16/32/48 pixel entries; browsers can choose the appropriate size.
const sizes=[16,32,48],icons=await Promise.all(sizes.map(s=>png(s)));
const ico=Buffer.alloc(6+16*sizes.length);ico.writeUInt16LE(1,2);ico.writeUInt16LE(sizes.length,4);let offset=ico.length;
for(const [i,size] of sizes.entries()){const p=6+i*16;ico[p]=size;ico[p+1]=size;ico.writeUInt16LE(1,p+4);ico.writeUInt16LE(32,p+6);ico.writeUInt32LE(icons[i].length,p+8);ico.writeUInt32LE(offset,p+12);offset+=icons[i].length;}
await writeFile(out+'/favicon.ico',Buffer.concat([ico,...icons]));
for(const [format,layout] of Object.entries(ogFormats)){
 const art=await png(layout.sun.size,layout.sun.size);
 for(const p of pages){
  const svg=Buffer.from(renderOgSvg(p.title,ogEvent,p.description,format));
  await sharp(svg).composite([{input:art,left:layout.sun.x,top:layout.sun.y}]).png({compressionLevel:9}).toFile(out+ogPath(p.path,format));
 }
}
const slug=p=>p.path==='/'?'festival':p.path.split('/').filter(Boolean)[0];
const fragment=p=>aiIntro+'\n# '+p.title+'\n\nКанонический URL: '+url(p.path)+'\n\n'+p.body+'\n';
for(const p of sections)await writeFile(out+'/_llms-txt/'+slug(p)+'.txt',fragment(p),'utf8');
const index=aiIntro+'\n## Разделы\n\n'+sections.map(p=>'- ['+p.title+']('+url(p.path)+'): '+p.description+' ([текст]('+site+'/_llms-txt/'+slug(p)+'.txt))').join('\n')+'\n\n## Дополнительные материалы\n\n- [Полный текст]('+site+'/llms-full.txt)\n- [Краткий текст]('+site+'/llms-small.txt)\n- [Sitemap]('+site+'/sitemap-index.xml)\n';
await writeFile(out+'/llms.txt',index,'utf8');
await writeFile(out+'/llms-small.txt',index+'\n## Афиша и традиции\n\n'+sections[0].body+'\n','utf8');
await writeFile(out+'/llms-full.txt',aiIntro+'\n'+[...sections,...editorialPages.filter(p=>!sections.includes(p))].map(p=>'# '+p.title+'\n\nКанонический URL: '+url(p.path)+'\n\n'+p.body).join('\n\n---\n\n')+'\n','utf8');
await writeFile(out+'/festival.json',JSON.stringify(festivalData,null,2),'utf8');
await writeFile(out+'/knowledge.jsonld',JSON.stringify(knowledgeGraph()),'utf8');
await writeFile(out+'/robots.txt','User-agent: *\nAllow: /\nSitemap: '+site+'/sitemap-index.xml\n','utf8');
console.log('Discovery assets generated: '+pages.length+' social images, icons, AI text exports.');
