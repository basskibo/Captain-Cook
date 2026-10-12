import { chromium } from 'playwright-core';
import fs from 'fs';
const mode=process.argv[2]; // 'stills' t1,t2,.. | 'all'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--allow-file-access-from-files'] });
const p = await (await b.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1})).newPage();
await p.goto('file://'+process.cwd()+'/comp.html'); await p.evaluate(()=>window.ready);
if(mode==='stills'){ fs.mkdirSync('stills',{recursive:true});
  for(const t of process.argv[3].split(',').map(Number)){ await p.evaluate(t=>window.render(t),t); await p.screenshot({path:`stills/s_${t.toFixed(2)}.jpg`,quality:85,type:'jpeg'}); }
} else { fs.mkdirSync('out',{recursive:true}); const N=Math.round(21*30);
  for(let i=0;i<N;i++){ await p.evaluate(t=>window.render(t),i/30); await p.screenshot({path:`out/${String(i).padStart(4,'0')}.png`}); if(i%60==0) console.log(i);} }
await b.close();
