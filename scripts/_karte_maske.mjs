// Diagnose: färbt reference/ravenkarte.png nach Klassifikation um, damit man
// sieht, ob Fluss (hellblau) und Weg (dunkelrot) vollständig erkannt werden.
import { chromium as pwChromium } from 'playwright-core';
import sparticuz from '@sparticuz/chromium';
import { readFileSync, writeFileSync } from 'node:fs';
const OUT = '/tmp/claude-0/-home-user-DM/8a29f16c-6261-5c93-8c27-9ce98f5b71ae/scratchpad';
const execPath = await sparticuz.executablePath();
const browser = await pwChromium.launch({ executablePath: execPath, args: sparticuz.args });
const page = await browser.newPage();
const b64 = readFileSync('/home/user/DM/reference/ravenkarte.png').toString('base64');
await page.setContent(`<img id="i" src="data:image/png;base64,${b64}">`);
await page.waitForFunction(() => { const i = document.getElementById('i'); return i && i.complete && i.naturalWidth > 0; });
const url = await page.evaluate(() => {
  const img = document.getElementById('i'); const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const im = g.getImageData(0, 0, W, H); const d = im.data;
  const isBlue = (r, gg, b) => b > 115 && r < 150 && b > r + 25 && gg > 70;
  // Weg breiter fassen: dunkles Rot/Braun, R deutlich über G und B
  const isRed = (r, gg, b) => r > 55 && gg < 110 && b < 110 && r > gg + 22 && r > b + 22 && !(b > 115 && b > r);
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], gg = d[i + 1], b = d[i + 2];
    if (isBlue(r, gg, b)) { d[i] = 0; d[i + 1] = 230; d[i + 2] = 255; }
    else if (isRed(r, gg, b)) { d[i] = 255; d[i + 1] = 0; d[i + 2] = 0; }
    else if (r < 75 && gg < 75 && b < 75) { d[i] = d[i + 1] = d[i + 2] = 40; }   // Rahmen dunkel lassen
    else { d[i] = d[i + 1] = d[i + 2] = 245; }                                    // Rest weiß
  }
  g.putImageData(im, 0, 0); return c.toDataURL('image/png');
});
writeFileSync(`${OUT}/karte_maske.png`, Buffer.from(url.split(',')[1], 'base64'));
console.log('Maske: karte_maske.png');
await browser.close();
