import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
import {site,brand,sections,pages,ogPath,url,aiIntro} from '../src/lib/site-content.mjs';
const out='public',sun='public/media/maslyanica-sun.webp';
await mkdir(out+'/og',{recursive:true});await mkdir(out+'/_llms-txt',{recursive:true});
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
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const wrap=(s,limit)=>{const lines=[];let line='';for(const word of s.split(/\s+/)){if(line&&line.length+word.length+1>limit){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;};
const art=await png(410,410);
for(const p of pages){
 const lines=wrap(p.title,21),font=lines.length>3?43:54,step=font*1.18,start=310-(lines.length-1)*step/2;
 const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#FFF1E8"/><rect x="22" y="22" width="1156" height="586" rx="24" fill="none" stroke="#E9B44C" stroke-width="3"/><path d="M76 105h190" stroke="#C34D21" stroke-width="5" stroke-linecap="round"/><g font-family="DejaVu Sans, Noto Sans, sans-serif"><text x="76" y="85" fill="#8D3618" font-size="24" font-weight="600">МАСЛЯНИЦА · БЕЛГРАД</text>'+lines.map((line,i)=>'<text x="76" y="'+(start+i*step)+'" font-size="'+font+'" font-weight="700" fill="#C34D21">'+esc(line)+'</text>').join('')+'<text x="76" y="540" fill="#536477" font-size="25">Народный праздник и традиции</text></g></svg>');
 await sharp(svg).composite([{input:art,left:748,top:110}]).png({compressionLevel:9}).toFile(out+ogPath(p.path));
}
const slug=p=>p.path==='/'?'festival':p.path.split('/').filter(Boolean)[0];
const fragment=p=>aiIntro+'\n# '+p.title+'\n\nКанонический URL: '+url(p.path)+'\n\n'+p.body+'\n';
for(const p of sections)await writeFile(out+'/_llms-txt/'+slug(p)+'.txt',fragment(p),'utf8');
const index=aiIntro+'\n## Разделы\n\n'+sections.map(p=>'- ['+p.title+']('+url(p.path)+'): '+p.description+' ([текст]('+site+'/_llms-txt/'+slug(p)+'.txt))').join('\n')+'\n\n## Дополнительные материалы\n\n- [Полный текст]('+site+'/llms-full.txt)\n- [Краткий текст]('+site+'/llms-small.txt)\n- [Sitemap]('+site+'/sitemap-index.xml)\n';
await writeFile(out+'/llms.txt',index,'utf8');
await writeFile(out+'/llms-small.txt',index+'\n## Афиша и традиции\n\n'+sections[0].body+'\n','utf8');
await writeFile(out+'/llms-full.txt',aiIntro+'\n'+sections.map(p=>'# '+p.title+'\n\nКанонический URL: '+url(p.path)+'\n\n'+p.body).join('\n\n---\n\n')+'\n','utf8');
await writeFile(out+'/robots.txt','User-agent: *\nAllow: /\nSitemap: '+site+'/sitemap-index.xml\n','utf8');
console.log('Discovery assets generated: '+pages.length+' social images, icons, AI text exports.');
