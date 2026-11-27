// One layout for all canonical social previews. Coordinates in a 1200x630 canvas.
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
// Use conservative character widths to fit Cyrillic, Latin and long titles.
const width=s=>[...s].reduce((n,c)=>n+(/[МШЩЖЮWm]/u.test(c)?1:/[ilIтг .,:!|]/u.test(c)?.42:.68),0);
function wrap(s,max){
 const lines=[];let line='';
 for(const word of String(s).trim().split(/\s+/u)){
  if(line&&width(line+' '+word)>max){lines.push(line);line='';}
  if(width(word)>max){for(const c of word){if(line&&width(line+c)>max){lines.push(line);line='';}line+=c;}continue;}
  line+=(line?' ':'')+word;
 }
 if(line)lines.push(line);return lines;
}
const text=(s,x,y,size,fill,weight=400)=>'<text x="'+x+'" y="'+y+'" font-size="'+size+'" font-weight="'+weight+'" fill="'+fill+'">'+esc(s)+'</text>';
export function renderOgSvg(title,event){
 let font=76,lines=wrap(title,650/font);
 while(lines.length>3&&font>30){font-=2;lines=wrap(title,650/font);}
 const step=font*1.12,start=250-(lines.length-1)*step/2;
 const heading=lines.map((line,i)=>text(line,76,start+i*step,font,'#C34D21',700)).join('');
 const when=event?[event.date,event.time].filter(Boolean).join(' · '):'Народный праздник и традиции';
 let dateSize=40;while(width(when)*dateSize>990&&dateSize>24)dateSize-=2;
 let placeSize=30,place=event?wrap(event.location,990/placeSize):[];
 while(place.length>2&&placeSize>18){placeSize-=2;place=wrap(event.location,990/placeSize);}
 const details=event?
 '<rect x="54" y="431" width="1092" height="150" rx="18" fill="#FFE2C8"/>'+
 '<g transform="translate(77 454) scale(1.42)" fill="none" stroke="#C34D21" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></g>'+
 text(when,126,487,dateSize,'#8D3618',700)+
 '<g transform="translate(80 514) scale(1.15)" fill="none" stroke="#C34D21" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></g>'+
 place.map((line,i)=>text(line,126,543+i*30,placeSize,'#536477',500)).join(''):
 text(when,76,535,dateSize,'#536477',500);
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#FFF1E8"/><rect x="22" y="22" width="1156" height="586" rx="24" fill="none" stroke="#E9B44C" stroke-width="3"/><path d="M76 111h210" stroke="#C34D21" stroke-width="5" stroke-linecap="round"/><g font-family="DejaVu Sans, Noto Sans, sans-serif">'+text('МАСЛЯНИЦА · БЕЛГРАД',76,89,30,'#8D3618',700)+heading+details+'</g></svg>';
}
