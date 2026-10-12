import { chromium } from 'playwright-core';
import fs from 'fs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--force-device-scale-factor=2','--window-size=600,1100'] });
const ctx = await b.newContext({ viewport:null, colorScheme:'light' });
await ctx.addInitScript(()=>{ document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='nextjs-portal{display:none!important}';document.head.appendChild(s);}); });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:797,deviceScaleFactor:0,mobile:true});
await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
const ND=fs.readFileSync('recipes.ndjson','utf8');
await p.route('**/api/recipes', async r=>{ await new Promise(z=>setTimeout(z,3000)); await r.fulfill({status:200,contentType:'application/x-ndjson',body:ND}); });
const frames=[]; const events=[]; let t0=null;
const now=()=>Date.now()/1000 - t0;
cdp.on('Page.screencastFrame', async f=>{
  const i=frames.length; const name=`rec/f${String(i).padStart(5,'0')}.jpg`;
  fs.writeFileSync(name, Buffer.from(f.data,'base64'));
  frames.push({file:name, t:f.metadata.timestamp});
  cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId}).catch(()=>{});
});
const mark=(n,extra={})=>{events.push({n,t:Date.now()/1000,...extra}); console.log(n, now().toFixed(2));};
async function tap(loc,label){ const bb=await loc.boundingBox(); mark('tap',{label,x:bb.x+bb.width/2,y:bb.y+bb.height/2}); await loc.click(); }
const W=ms=>p.waitForTimeout(ms);
await p.goto('http://localhost:3124/', {waitUntil:'networkidle'});
await W(1500);
for (const d of '1234'){ await p.getByRole('button',{name:d,exact:true}).click(); await W(200); }
await W(3000);
await p.evaluate(()=>window.scrollTo(0,0)); await W(500);
t0=Date.now()/1000;
await cdp.send('Page.startScreencast',{format:'jpeg',quality:90,maxWidth:780,maxHeight:1594,everyNthFrame:1});
mark('pantry'); await W(900);
for (const n of ['Crni luk','Paradajz','Paprika']){ await tap(p.getByRole('button',{name:new RegExp(`^\\S+\\s*${n}$`)}).first(), n); await W(480); }
mark('scroll'); await p.evaluate(()=>{const el=[...document.querySelectorAll('h2,h3,p,span,div')].find(e=>/JAJA I MLE/i.test(e.textContent)&&e.children.length<3); window.scrollTo({top: el.getBoundingClientRect().top+scrollY-150, behavior:'smooth'});}); await W(900);
for (const n of ['Jaja','Sir']){ await tap(p.getByRole('button',{name:new RegExp(`^\\S+\\s*${n}$`)}).first(), n); await W(480); }
await W(500);
await tap(p.getByRole('button',{name:/Šta da skuvam/}),'what'); await W(1100);
mark('options');
await tap(p.getByRole('button',{name:/Predloži mi jela/}),'suggest'); mark('cooking');
const start=Date.now();
while(Date.now()-start<60000){ const c=await p.getByText('Brza pržijana').count(); if(c>=1) break; await W(100);}
mark('results'); await W(2600);
const card = p.getByText('Domaća šakšuka sa sirom').first();
await tap(card,'card'); await W(1500); mark('detail');
await p.evaluate(()=>window.scrollBy({top:450,behavior:'smooth'})); await W(1100);
await p.evaluate(()=>window.scrollBy({top:700,behavior:'smooth'})); await W(1100);
await tap(p.getByRole('button',{name:/Počni kuvanje/}),'start'); await W(1500); mark('cookmode');
await tap(p.getByRole('button',{name:/Pokreni tajmer/}).first(),'timer'); await W(2200);
await tap(p.getByRole('button',{name:/Sledeći korak/}),'next'); await W(1500); mark('step2');
await cdp.send('Page.stopScreencast'); mark('end');
fs.writeFileSync('rec.json', JSON.stringify({t0,frames, events},null,1));
await b.close();
