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

export async function assertCatalogMaster(page,cardSelector){
 const original=page.viewportSize(),root=page.locator('[data-catalog-master]'),cards=root.locator(cardSelector),nav=root.locator('[data-master-nav]'),content=root.locator('[data-master-content]');
 const initial=await cards.evaluateAll(els=>els.map(el=>[el.id,(el.matches('details')?el:el.querySelector('details')).open]));
 try{
  await page.setViewportSize({width:390,height:900});await nav.waitFor({state:'hidden'});
  const mobile=await cards.evaluateAll(els=>els.slice(0,2).map(el=>{const r=el.getBoundingClientRect();return {x:r.x,top:r.top,bottom:r.bottom,width:r.width};}));
  assert.ok(Math.abs(mobile[0].x-mobile[1].x)<=2&&mobile[1].top>=mobile[0].bottom-1,'Mobile retains original stack');
  for(const width of [960,1440]){
   await page.setViewportSize({width,height:900});await nav.waitFor({state:'visible'});
   const buttons=nav.locator('[data-master-choice]');assert.equal(await buttons.count(),await cards.count(),'All catalog entries selectable');
   const metrics=await root.evaluate(el=>{const left=el.querySelector('[data-master-nav]'),right=el.querySelector('[data-master-content]'),a=left.getBoundingClientRect(),b=right.getBoundingClientRect();return {left:{right:a.right,top:a.top,width:a.width},right:{left:b.left,top:b.top,width:b.width},overflow:[left,right].some(x=>x.scrollWidth>x.clientWidth+2),scroll:[left,right].map(x=>getComputedStyle(x).overflowY)};});
   assert.ok(metrics.right.left>=metrics.left.right+3&&metrics.right.width>metrics.left.width&&Math.abs(metrics.left.top-metrics.right.top)<=2,'Desktop master/detail columns at '+width);
   assert.ok(!metrics.overflow&&metrics.scroll.every(x=>x==='auto'),'Independent scroll panes without horizontal overflow');
   const second=buttons.nth(1);await second.click();const id=await second.getAttribute('data-master-choice');
   assert.equal(await second.getAttribute('aria-pressed'),'true');
   assert.deepEqual(await cards.evaluateAll(els=>els.filter(el=>el.getClientRects().length).map(el=>el.id)),[id],'Exactly one original card visible');
   assert.equal(await content.locator('[data-master-selected]').evaluate(el=>(el.matches('details')?el:el.querySelector('details')).open),true);
   assert.equal(await nav.locator('[aria-pressed=true]').count(),1);await buttons.first().click();
  }
 }finally{
  await page.setViewportSize({width:390,height:900});await nav.waitFor({state:'hidden'});
  await cards.evaluateAll((els,states)=>{for(const el of els)(el.matches('details')?el:el.querySelector('details')).open=states.find(s=>s[0]===el.id)?.[1]||false;},initial);
  if(original)await page.setViewportSize(original);
 }
}
