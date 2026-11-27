export function asUTC(date,time,zone){
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

export function calendarEvent(config,event,schedule){
 const items=[...schedule].sort((a,b)=>a.start.localeCompare(b.start));
 const start=items[0]?.start,end=items.reduce((last,x)=>x.end>last?x.end:last,'');
 if(!start||!end||end<=start)throw Error('Missing or invalid event schedule');
 return {title:'Русская Масляница в Белграде',start:asUTC(config.date,start,config.timezone),end:asUTC(config.date,end,config.timezone),location:event.address,description:'Мероприятие без билетов. Песни, игры, сказ и народные традиции. https://masljanica.pages.dev/',uid:'maslyanica-'+config.date+'@masljanica.pages.dev'};
}
export function googleCalendarUrl(event){
 return 'https://calendar.google.com/calendar/render?'+new URLSearchParams({action:'TEMPLATE',text:event.title,dates:event.start+'/'+event.end,details:event.description,location:event.location}).toString();
}
