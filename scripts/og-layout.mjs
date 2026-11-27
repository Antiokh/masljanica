// Deterministic layout for both social preview aspect ratios.
export const ogFormats={
 landscape:{width:1200,height:630,sun:{size:548,x:628,y:41}},
 square:{width:1080,height:1080,sun:{size:470,x:305,y:230}}
};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const measure=s=>[...s].reduce((n,c)=>n+(/[МШЩЖЮWm]/u.test(c)?1.06:/[ilIтг .,:!|]/u.test(c)?.43:.71),0);
function wrap(s,max){
 const lines=[];let line='';
 for(const word of String(s||'').trim().split(/\s+/u).filter(Boolean)){
  if(line&&measure(line+' '+word)>max){lines.push(line);line='';}
  if(measure(word)>max){for(const c of word){if(line&&measure(line+c)>max){lines.push(line);line='';}line+=c;}}else line+=(line?' ':'')+word;
 }
 if(line)lines.push(line);return lines;
}
function limited(s,max,limit){
 const lines=wrap(s,max);if(lines.length<=limit)return lines;
 const result=lines.slice(0,limit);let last=result.at(-1);
 while(last&&measure(last+'…')>max)last=last.slice(0,-1);
 result[limit-1]=last.replace(/[ ,.;:]+$/u,'')+'…';return result;
}
const text=(s,x,y,size,fill,weight=400)=>'<text x="'+x+'" y="'+y+'" font-size="'+size+'" font-weight="'+weight+'" fill="'+fill+'">'+esc(s)+'</text>';
function fit(s,width,size,min,count){let lines=wrap(s,width/size);while(lines.length>count&&size>min){size-=2;lines=wrap(s,width/size);}return {size,lines:limited(s,width/size,count)};}
const ink='#8D3618',accent='#C34D21',secondary='#536477';
function header(event,square){
 const x=64,y=45,w=square?952:550;
 const brand=text('МАСЛЯНИЦА · БЕЛГРАД',x,y+28,27,ink,700);
 if(!event)return brand+'<path d="M64 94h190" stroke="'+accent+'" stroke-width="5" stroke-linecap="round"/>';
 const when=[event.date,event.time].filter(Boolean).join(' · ');
 const d=fit(when,w-52,square?39:31,21,1),place=fit(event.location,w-52,square?30:24,18,2);
 const cal='<g transform="translate('+x+' 113)" fill="none" stroke="'+accent+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="20" height="20" rx="3"/><path d="M7 2v6m12-6v6M3 12h20"/></g>';
 const pin='<g transform="translate('+x+' 157)" fill="none" stroke="'+accent+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c0 6-9 14-9 14S4 16 4 10a9 9 0 1 1 18 0Z"/><circle cx="13" cy="10" r="3"/></g>';
 return brand+cal+text(d.lines.join(' '),x+38,139,d.size,ink,700)+pin+place.lines.map((line,i)=>text(line,x+38,182+i*place.size*1.1,place.size,secondary,500)).join('');
}
export function renderOgSvg(title,event,description='',format='landscape'){
 const layout=ogFormats[format];if(!layout)throw Error('Unknown OG format '+format);
 const square=format==='square',w=square?930:535,x=64;
 const h=fit(title,w,square?79:75,square?38:34,3),step=h.size*1.1;
 const top=square?730:(event?263:160);
 const heading=h.lines.map((line,i)=>text(line,x,top+h.size*.82+i*step,h.size,accent,700)).join('');
 const descSize=square?32:30,descY=top+h.size*.82+(h.lines.length-1)*step+descSize+25;
 const room=Math.max(1,Math.floor(((square?1020:565)-descY)/(descSize*1.24))+1);
 const desc=limited(description,w/descSize,Math.min(square?3:4,room)).map((line,i)=>text(line,x,descY+i*descSize*1.24,descSize,secondary,500)).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+layout.width+'" height="'+layout.height+'" viewBox="0 0 '+layout.width+' '+layout.height+'"><rect width="'+layout.width+'" height="'+layout.height+'" fill="#FFF1E8"/><rect x="22" y="22" width="'+(layout.width-44)+'" height="'+(layout.height-44)+'" rx="24" fill="none" stroke="#E9B44C" stroke-width="3"/><g font-family="DejaVu Sans, Noto Sans, sans-serif">'+header(event,square)+heading+desc+'</g></svg>';
}
