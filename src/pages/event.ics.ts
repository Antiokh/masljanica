import type { APIRoute } from 'astro';
import { frontmatter } from '../data/home.md';
import event from '../data/event.json';
import schedule from '../data/schedule.json';
const escapeText=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
function asUTC(date:string,time:string,zone:string){
 const naive=Date.parse(date+'T'+time+':00Z');
 if(!Number.isFinite(naive))throw Error('Invalid event time');
 let candidate=naive;
 const format=new Intl.DateTimeFormat('en-US',{timeZone:zone,timeZoneName:'longOffset'});
 for(let i=0;i<3;i++){
  const offset=format.formatToParts(new Date(candidate)).find(x=>x.type==='timeZoneName')?.value||'';
  const m=/^GMT([+-])(\d{2}):(\d{2})$/.exec(offset);
  if(offset!=='GMT'&&!m)throw Error('Invalid timezone offset '+offset);
  const minutes=m?(m[1]==='-'?-1:1)*(Number(m[2])*60+Number(m[3])):0;
  candidate=naive-minutes*60000;
 }
 return new Date(candidate).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
}
function fold(line:string){
 const parts:string[]=[];let part='',size=0;
 for(const char of line){const n=Buffer.byteLength(char);if(size+n>75){parts.push(part);part=' ';size=1;}part+=char;size+=n;}
 parts.push(part);return parts.join('\r\n');
}
export const GET:APIRoute=()=>{
 const config=frontmatter.event;
 const items=[...schedule].sort((a,b)=>a.start.localeCompare(b.start));
 const start=items[0]?.start,end=items.reduce((last,x)=>x.end>last?x.end:last,'');
 if(!start||!end)throw Error('Missing event schedule');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Maslyanica Belgrade//Festival//RU','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT','UID:maslyanica-'+config.date+'@masljanica.pages.dev','DTSTAMP:20000101T000000Z','DTSTART:'+asUTC(config.date,start,config.timezone),'DTEND:'+asUTC(config.date,end,config.timezone),'SUMMARY:'+escapeText('Русская Масляница в Белграде'),'LOCATION:'+escapeText(event.address),'DESCRIPTION:'+escapeText('Мероприятие без билетов. Песни, игры, сказ и народные традиции.'),'URL:https://masljanica.pages.dev/','END:VEVENT','END:VCALENDAR'];
 return new Response(lines.map(fold).join('\r\n')+'\r\n',{headers:{'Content-Type':'text/calendar; charset=utf-8'}});
};
