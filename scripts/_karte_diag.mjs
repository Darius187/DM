// Diagnose: warum übersieht scanBorder den Fluss an der Mittelkante start↔wald_o?
// Läuft die Kante (x=587, y 973..1088) ab und meldet je Position UNABHÄNGIG:
// - blauPresent (isBlue irgendwo im ±8-Band), rotPresent (isRed im Band)
// - die tatsächliche Pixelfarbe dort, wo Blau/Rot gefunden wird
// So sehen wir: (a) frisst Rot-Priorität den Fluss, (b) verdeckt der Weg ihn,
// (c) ist die Blau-Schwelle zu eng.
import { chromium as pwChromium } from 'playwright-core';
import sparticuz from '@sparticuz/chromium';
import { readFileSync } from 'node:fs';
const execPath = await sparticuz.executablePath();
const browser = await pwChromium.launch({ executablePath: execPath, args: sparticuz.args });
const page = await browser.newPage();
const b64 = readFileSync('/home/user/DM/reference/ravenkarte.png').toString('base64');
await page.setContent(`<img id="i" src="data:image/png;base64,${b64}">`);
await page.waitForFunction(() => { const i = document.getElementById('i'); return i && i.complete && i.naturalWidth > 0; });
const rep = await page.evaluate(() => {
  const img = document.getElementById('i'); const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, W, H).data;
  const px = (x, y) => { const i = ((y * W + x) * 4); return [d[i], d[i + 1], d[i + 2]]; };
  const isBlue = (r, gg, b) => b > 115 && r < 150 && b > r + 25 && gg > 70;
  const isRed = (r, gg, b) => r > 55 && gg < 110 && b < 110 && r > gg + 22 && r > b + 22 && !(b > 115 && b > r);
  // etwas breitere/weichere Blau-Definition zum Vergleich (Hypothese c)
  const isBlueWeit = (r, gg, b) => b > 95 && b > r + 12 && b >= gg - 10 && r < 190;
  const linePos = 587, y0 = 973, y1 = 1088, BAND = 8;
  const zeilen = [];
  for (let y = y0; y <= y1; y++) {
    let blau = null, blauWeit = null, rot = null;
    for (let dp = -BAND; dp <= BAND; dp++) {
      const p = px(linePos + dp, y);
      if (!blau && isBlue(...p)) blau = { dp, p };
      if (!blauWeit && isBlueWeit(...p)) blauWeit = { dp, p };
      if (!rot && isRed(...p)) rot = { dp, p };
    }
    const pct = ((y - y0) / (y1 - y0) * 100).toFixed(0);
    if (blau || blauWeit || rot) zeilen.push({ y, pct, blau: blau ? blau.p.join(',') : '-', blauWeit: blauWeit ? blauWeit.p.join(',') : '-', rot: rot ? rot.p.join(',') : '-' });
  }
  // zusätzlich: an welchen %-Positionen liefert die ENGE Blau-Erkennung Treffer,
  // an welchen die WEITE - und wo maskiert Rot (rot-Priorität)?
  return { zeilen };
});
console.log('y%  eng-Blau           weit-Blau           Rot(Weg)');
for (const z of rep.zeilen) console.log(`${String(z.pct).padStart(3)}  ${z.blau.padEnd(18)} ${z.blauWeit.padEnd(18)} ${z.rot}`);
await browser.close();
