// Server-only editorial overlays. Exact source keys invalidate stale translations on edits.
import {readFileSync} from 'node:fs';
import {translate as uiTranslate,localeOf,localizedPath,languageTag,stripLocale} from '../../public/i18n.mjs';
const content=JSON.parse(readFileSync(process.cwd()+'/src/data/editorial-translations.json','utf8'));
export {localizedPath,localeOf,languageTag,stripLocale};
export function translate(text,locale='ru'){
 if(locale==='ru'||typeof text!=='string')return text;
 const copy=content[text.trim()]?.[locale];
 if(copy===undefined)return uiTranslate(text,locale);
 return text.slice(0,text.length-text.trimStart().length)+copy+text.slice(text.trimEnd().length);
}
export function localize(path){const uiLocale=localeOf(path);return {tx:s=>translate(s,uiLocale),lp:s=>localizedPath(s,uiLocale),uiLocale,uiTag:languageTag(uiLocale),basePath:stripLocale(path)};}
export function translateDocument(text,locale){
 if(locale==='ru')return text;
 let result=String(text);
 for(const [source,copy] of Object.entries(content).sort((a,b)=>b[0].length-a[0].length))if(source.length>30&&copy[locale])result=result.replaceAll(source,copy[locale]);
 result=result.split('\n').map(line=>{const m=line.match(/^(#{1,6} |[-*] )(.+)$/);return m?m[1]+translate(m[2],locale):translate(line,locale);}).join('\n');
 return result.replace(/\]\((\/[^)]+)\)/g,(_,href)=>']('+localizedPath(href,locale)+')');
}
