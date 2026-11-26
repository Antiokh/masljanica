// Telegram theme tokens are data, not CSS source. Only accept documented RGB colors.
export const THEME_FIELDS=Object.freeze(['bg_color','text_color','hint_color','link_color','button_color','button_text_color','secondary_bg_color','header_bg_color','bottom_bar_bg_color','accent_text_color','section_bg_color','section_header_text_color','section_separator_color','subtitle_text_color','destructive_text_color']);
export function sanitizeTelegramPalette(value){
  const result={};
  for(const key of THEME_FIELDS)if(typeof value?.[key]==='string'&&/^#[0-9a-f]{6}$/i.test(value[key]))result[key]=value[key].toLowerCase();
  return result;
}
export function applyTelegramPalette(root,mode,params){
  const palette=sanitizeTelegramPalette(params);
  const active=mode==='auto'&&!!palette.bg_color;
  for(const key of THEME_FIELDS){
    const prop='--masljanica-tg-'+key.replaceAll('_','-'),value=active?palette[key]:null;
    if(value){if(root.style.getPropertyValue(prop)!==value)root.style.setProperty(prop,value);}
    else if(root.style.getPropertyValue(prop))root.style.removeProperty(prop);
  }
  if(active){if(root.dataset.telegramPalette!=='active')root.dataset.telegramPalette='active';}
  else delete root.dataset.telegramPalette;
  return active;
}
export function telegramNativeColors(mode,display,params){
  const p=sanitizeTelegramPalette(params);
  if(mode==='auto'&&p.bg_color)return {background:p.bg_color,header:p.header_bg_color||p.secondary_bg_color||p.bg_color,bottom:p.bottom_bar_bg_color||p.secondary_bg_color||p.bg_color};
  const bg=display==='light'?'#FFFFFF':'#101827',nav=display==='light'?'#FFFFFF':'#1D2B40';
  return {background:bg,header:nav,bottom:nav};
}
