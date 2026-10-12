import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--lang=sr'] });
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:3, isMobile:true, hasTouch:true, colorScheme:'light' });
const p = await ctx.newPage();
await p.goto('http://localhost:3001/', {waitUntil:'networkidle'});
await p.waitForTimeout(2500);
await p.screenshot({path:'ex-1.png'});
for (const d of '6994') { await p.getByRole('button',{name:d, exact:true}).click().catch(e=>console.log('nobtn',d)); await p.waitForTimeout(150);}
await p.waitForTimeout(2500);
await p.screenshot({path:'ex-2.png'});
console.log((await p.locator('button').allInnerTexts()).slice(0,60).join(' | '));
await b.close();
