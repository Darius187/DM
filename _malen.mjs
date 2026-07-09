import { chromium } from 'playwright';
const SP='/tmp/claude-0/-home-user-DM/8a29f16c-6261-5c93-8c27-9ce98f5b71ae/scratchpad/';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage(); await p.setViewportSize({width:1280,height:800});
const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
await p.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>window.__game&&window.__game.scene,{timeout:30000});
await p.evaluate(()=>{ localStorage.removeItem('ravensmoor.dorfwege.v1'); window.__game.scene.start('World',{neu:true,startArea:'start'}); });
await p.waitForFunction(()=>window.__welt,{timeout:30000});
await p.waitForTimeout(1200);
await p.evaluate(()=>{ const w=window.__welt; w.goArea('stadt'); });
await p.waitForTimeout(1200);
await p.evaluate(()=>{ const w=window.__welt; w.toggleDorfEditor(); w.dorfMalTyp='feld'; w.baueDorfToolbar(); const cam=w.cameras.main; cam.setZoom(1); cam.centerOn(60*32,60*32); });
await p.waitForTimeout(300);
// ECHTER Maus-Zug quer ueber den Schirm (malt Feldweg)
const canvas = await p.$('canvas'); const r = await canvas.boundingBox();
await p.mouse.move(r.x+300, r.y+400); await p.mouse.down();
for (let i=1;i<=10;i++) await p.mouse.move(r.x+300+i*40, r.y+400+Math.sin(i)*20, {steps:3});
await p.mouse.up();
await p.waitForTimeout(300);
const nachMalen = await p.evaluate(()=>window.__welt.dorfWege.size);
// Strasse dazu + Radierer testen
await p.evaluate(()=>{ const w=window.__welt; w.dorfMalTyp='strasse'; });
await p.mouse.move(r.x+300, r.y+450); await p.mouse.down();
await p.mouse.move(r.x+600, r.y+450, {steps:6}); await p.mouse.up();
await p.waitForTimeout(200);
await p.evaluate(()=>{ const w=window.__welt; w.dorfMalTyp='radieren'; });
await p.mouse.move(r.x+340, r.y+400); await p.mouse.down(); await p.mouse.move(r.x+420, r.y+400,{steps:3}); await p.mouse.up();
await p.waitForTimeout(200);
const stats = await p.evaluate(()=>{ const w=window.__welt; let f=0,st=0; for(const t of w.dorfWege.values()) t==='feld'?f++:st++; return {gesamt:w.dorfWege.size,feld:f,strasse:st}; });
// Bericht enthaelt DORF_WEGE?
await p.evaluate(()=>window.__welt.zeigeDorfBericht());
await p.waitForTimeout(300);
const bericht = await p.evaluate(()=>{ const ta=document.querySelector('textarea'); return { hatWege: ta.value.includes('DORF_WEGE'), hatLaeufe: /feld: \[\[/.test(ta.value) }; });
await p.evaluate(()=>{ document.querySelectorAll('button').forEach(b=>{ if(b.textContent==='Schließen') b.click(); }); });
await p.screenshot({path:SP+'wege_malen.png'});
// Persistenz: localStorage gefuellt?
const persist = await p.evaluate(()=>{ const w=window.__welt; w.toggleDorfEditor(true); return (localStorage.getItem('ravensmoor.dorfwege.v1')||'').length > 10; });
console.log(JSON.stringify({nachMalen, stats, bericht, persist}));
console.log('ERR', errs.slice(0,3).join('|')||'(keine)');
await b.close();
