import assert from 'node:assert/strict';

// Verify responsive geometry, reading order and intrinsic height of neighboring cards.
export async function assertCatalogColumns(page,groupSelector,cardSelector){
  const original=page.viewportSize();
  const group=page.locator(groupSelector).filter({has:page.locator(cardSelector)}).first();
  try{
    for(const width of [390,960,1440]){
      await page.setViewportSize({width,height:900});
      const metrics=await group.evaluate((el,selector)=>{
        const cards=[...el.querySelectorAll(selector)].filter(x=>!x.hidden&&x.getBoundingClientRect().width>0);
        const rect=x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height,width:r.width};};
        return {first:rect(cards[0]),second:rect(cards[1]),group:rect(el),overflow:cards.some(c=>c.scrollWidth>c.clientWidth+2)};
      },cardSelector);
      const {first,second}=metrics,label=groupSelector+' @ '+width;
      if(width>=960){
        assert.ok(Math.abs(first.y-second.y)<=2&&second.x>=first.right+3,label+' two row-major columns');
        assert.ok(Math.abs(first.width-second.width)<=2,label+' equal column widths');
      }else assert.ok(second.y>=first.bottom-1&&Math.abs(first.x-second.x)<=2,label+' original mobile stack');
      assert.ok(!metrics.overflow,label+' cards fit columns');
    }
    await page.setViewportSize({width:1440,height:900});
    const cards=group.locator(cardSelector+':visible');
    const first=cards.nth(0),second=cards.nth(1);
    const details=first.locator('details').first();
    const toggle=await first.evaluate(el=>el.matches('details'));
    const disclosure=toggle?first:details;
    if(await disclosure.count()){
      const wasOpen=await disclosure.evaluate(el=>el.open);
      try{
        await disclosure.evaluate(el=>el.open=false);
        const before=await second.evaluate(el=>el.getBoundingClientRect().height);
        await disclosure.evaluate(el=>el.open=true);
        const after=await second.evaluate(el=>el.getBoundingClientRect().height);
        assert.ok(Math.abs(after-before)<=1,groupSelector+' adjacent card must not stretch');
      }finally{await disclosure.evaluate((el,value)=>el.open=value,wasOpen);}
    }
  }finally{if(original)await page.setViewportSize(original);}
}
