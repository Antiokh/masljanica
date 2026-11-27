import type { APIRoute } from 'astro';
import { frontmatter } from '../data/home.md';
import event from '../data/event.json';
import schedule from '../data/schedule.json';
const escapeText=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
import { calendarEvent } from '../lib/event-calendar.mjs';
function fold(line:string){
 const parts:string[]=[];let part='',size=0;
 for(const char of line){const n=Buffer.byteLength(char);if(size+n>75){parts.push(part);part=' ';size=1;}part+=char;size+=n;}
 parts.push(part);return parts.join('\r\n');
}
export const GET:APIRoute=()=>{
 const item=calendarEvent(frontmatter.event,event,schedule);
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Maslyanica Belgrade//Festival//RU','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT','UID:'+item.uid,'DTSTAMP:20000101T000000Z','DTSTART:'+item.start,'DTEND:'+item.end,'SUMMARY:'+escapeText(item.title),'LOCATION:'+escapeText(item.location),'DESCRIPTION:'+escapeText(item.description),'URL:https://masljanica.pages.dev/','END:VEVENT','END:VCALENDAR'];
 return new Response(lines.map(fold).join('\r\n')+'\r\n',{headers:{'Content-Type':'text/calendar; charset=utf-8'}});
};
