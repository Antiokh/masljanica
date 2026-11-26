import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const origin='http://localhost:4321';
const server=spawn('npm',['run','preview','--','--host','localhost','--port','4321'],{stdio:'inherit'});
let browser;
try {
  for(let i=0;i<60;i++){
    try{if((await fetch(origin)).ok)break;}catch{}
    if(i===59)throw Error('Preview did not start');
    await new Promise(r=>setTimeout(r,500));
  }
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  await page.goto(origin);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await page.locator('#pwa-storage-accept').click();
  await page.evaluate(()=>{window.__navigationTest='persisted';});
  await page.locator('.app-nav a[href="/songs/"]').click();
  await page.waitForURL('**/songs/');
  await page.locator('#catalog-search').waitFor();
  assert.equal(await page.evaluate(()=>window.__navigationTest),'persisted','SPA navigation must keep the same window');
  const search=page.locator('#catalog-search');
  await search.fill('несуществующаяпесня');
  await page.locator('#catalog-empty').waitFor({state:'visible'});
  await search.fill('');
  await page.locator('#catalog-empty').waitFor({state:'hidden'});
  assert.equal(await page.locator('.song-row').count(),15);
  const row=page.locator('.song-row').filter({hasText:'Квашня'});
  await row.locator('summary').click();
  await row.locator('.song-lyrics').waitFor({state:'visible'});
  assert.equal(await row.locator('.song-variant option').count(),2);
  assert.equal(await row.locator('iframe').count(),0,'Video is lazy loaded');
  await row.locator('.song-variant').selectOption({index:1});
  assert.match(await row.locator('audio').getAttribute('src'),/^\/media\/audio\//);
  await row.locator('summary').click();
  await row.locator('.song-lyrics').waitFor({state:'hidden'});
  await row.locator('.song-play').click();
  await page.waitForFunction(()=>document.querySelector('[data-song="Квашня"] .song-play')?.dataset.playing==='true');
  assert.equal(await row.locator('details').getAttribute('open'),null,'Playing must not expand lyrics');
  await row.locator('.song-play').click();
  await page.waitForFunction(()=>document.querySelector('[data-song="Квашня"] .song-play')?.dataset.playing==='false');
  assert.equal(new URL(page.url()).pathname,'/songs/');
  await page.locator('.app-nav a[href="/games/"]').click();
  await page.waitForURL('**/games/');
  await page.locator('#catalog-search').fill('несуществующаяигра');
  await page.locator('#catalog-empty').waitFor({state:'visible'});
  await page.locator('.more-menu summary').click();
  await page.locator('.more-links a[href="/offline/"]').click();
  await page.waitForURL('**/offline/');
  await page.locator('#offline-update:not([disabled])').waitFor();
  await page.locator('#offline-update').click();
  await page.waitForFunction(()=>document.documentElement.dataset.offlineReady==='true',{},{timeout:180000});
  const audio=await page.evaluate(async()=>{
    const data=await (await fetch('/offline-manifest.json')).json();
    return data.entries.find(e=>e.url.endsWith('.mp3'))?.url;
  });
  assert.ok(audio,'Local audio must be present in the offline pack');
  await context.setOffline(true);
  await page.reload();
  await page.locator('#offline-status').waitFor();
  await page.waitForFunction(()=>document.documentElement.dataset.offlineReady==='true');
  await page.locator('.app-nav a[href="/songs/"]').click();
  await page.waitForURL('**/songs/');
  await page.locator('[data-entry]').first().waitFor();
  const range=await page.evaluate(async url=>{
    const response=await fetch(url,{headers:{Range:'bytes=0-127'}});
    return {status:response.status,bytes:(await response.arrayBuffer()).byteLength,range:response.headers.get('content-range')};
  },audio);
  assert.equal(range.status,206);assert.equal(range.bytes,128);assert.match(range.range,/^bytes 0-127\//);
  await context.close();
  console.log('SPA, search and complete offline audio smoke test passed.');
} finally {
  await browser?.close();
  server.kill();
}
