import assert from 'node:assert/strict';

// DOM geometry, not screenshots: stable across antialiasing and platform fonts.
export async function assertSongLayout(page) {
  const initial=page.viewportSize();
  const original=await page.evaluate(()=>document.documentElement.dataset.theme);
  const row=page.locator('.song-row').filter({has:page.locator('.song-variant[data-variant="4"]')}).first();
  const details=row.locator('details');
  const wasOpen=await details.evaluate(el=>el.open);
  try {
    if(!wasOpen)await details.locator('summary').click();
    for(const width of [390,1440]){
      await page.setViewportSize({width,height:900});
      for(const theme of ['light','dark']){
        await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
        await page.evaluate(()=>document.fonts.ready);
        const metrics=await row.evaluate(el=>{
          const q=s=>el.querySelector(s),rect=x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
          const style=x=>getComputedStyle(x),selected=q('.song-variant[data-selected=true]');
          const inactive=[...el.querySelectorAll('.song-variant[data-selected=false]')];
          const play=q('.song-play'),icon=play.querySelector('.song-play-icon'),disc=play.querySelector('.song-disc'),heading=q('.song-heading');
          const slider=selected.querySelector('.song-seek'),group=q('.song-variants');
          const panel=document.getElementById('song-player'),next=el.nextElementSibling;
          const css=style(el),body=style(q('.song-body')),summary=style(q('summary'));
          return {card:rect(el),panel:rect(panel),panelPosition:style(panel).position,group:rect(group),selected:rect(selected),inactive:inactive.map(x=>rect(x)),slider:rect(slider),disc:rect(disc),icon:rect(icon),play:rect(play),heading:rect(heading),next:next?rect(next):null,radius:parseFloat(css.borderTopLeftRadius),border:parseFloat(css.borderTopWidth),bodyBg:body.backgroundColor,summaryBg:summary.backgroundColor,bodyBorder:parseFloat(body.borderTopWidth),color:style(selected).color,background:style(selected).backgroundColor,selectedToken:style(document.documentElement).getPropertyValue('--festival-selected').trim(),audioCount:document.querySelectorAll('audio').length,hiddenAudio:document.querySelector('#song-player-audio')?.hidden};
        });
        const label=width+'px '+theme;
        assert.equal(metrics.panelPosition,'sticky',label+' sticky top playlist');
        assert.ok(metrics.panel.w>0 && metrics.panel.x>=-1 && metrics.panel.right<=width+1,label+' playlist fits');
        assert.equal(metrics.audioCount,1,label+' one audio transport');
        assert.equal(metrics.hiddenAudio,true,label+' no browser-native player');
        assert.ok(metrics.radius>=8&&metrics.border>=1,label+' independent card outline');
        assert.equal(metrics.bodyBg,'rgba(0, 0, 0, 0)',label+' unified body surface');
        assert.equal(metrics.summaryBg,'rgba(0, 0, 0, 0)',label+' unified header surface');
        assert.equal(metrics.bodyBorder,0,label+' no internal separator');
        if(metrics.next)assert.ok(metrics.next.y-metrics.card.bottom>=3||metrics.next.x-metrics.card.right>=3,label+' space between cards');
        assert.ok(metrics.heading.x-metrics.play.right>=4,label+' spacing after play icon');
        const center=r=>[r.x+r.w/2,r.y+r.h/2];
        const [dx,dy]=center(metrics.disc),[ix,iy]=center(metrics.icon);
        assert.ok(Math.abs(dx-ix)<=2&&Math.abs(dy-iy)<=2,label+' centered play glyph');
        assert.equal(metrics.inactive.length,4,label+' four collapsed variants');
        for(const item of metrics.inactive)assert.ok(Math.abs(item.w-item.h)<=2,label+' circular collapsed variant');
        assert.ok(metrics.selected.w>metrics.inactive[0].w+12,label+' expanded variant fills width');
        assert.ok(metrics.slider.w>12,label+' usable seek area');
        assert.ok(Math.abs(center(metrics.slider)[1]-center(metrics.selected)[1])<=6,label+' vertically centered seek');
        assert.ok(metrics.group.right<=metrics.card.right+1 && metrics.group.x>=metrics.card.x-1,label+' no overflow');
        const expected=theme==='dark'?'rgb(169, 67, 24)':'rgb(195, 77, 33)';
        assert.equal(metrics.selectedToken.toUpperCase(),theme==='dark'?'#A94318':'#C34D21',label+' approved theme-specific action token');
        assert.equal(metrics.color,'rgb(255, 255, 255)',label+' white foreground');
        assert.equal(metrics.background,expected,label+' selected action background');
      }
    }
  } finally {
    if(!wasOpen)await details.evaluate(el=>el.open=false);
    if(original)await page.evaluate(theme=>document.documentElement.dataset.theme=theme,original);
    if(initial)await page.setViewportSize(initial);
  }
}
