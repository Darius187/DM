// Hochzoom eines Zellbereichs mit erkannten Kreuzungen zum genauen Vergleich.
// Aufruf: node scripts/_karte_zoom.mjs <gx0> <gy0> <gx1> <gy1> <name>
import { chromium as pwChromium } from 'playwright-core';
import sparticuz from '@sparticuz/chromium';
import { readFileSync, writeFileSync } from 'node:fs';
const OUT = '/tmp/claude-0/-home-user-DM/8a29f16c-6261-5c93-8c27-9ce98f5b71ae/scratchpad';
const tab = JSON.parse(readFileSync(`${OUT}/karte_tabelle.json`, 'utf8'));
const cols = [48, 225, 406, 587, 767, 947, 1124];
const rows = { 0: [618, 733], 1: [733, 854], 2: [854, 973], 3: [973, 1088] };
const byId = {}; for (const z of tab) byId[z.id] = z;
const [gx0, gy0, gx1, gy1, nm] = process.argv.slice(2);
const X0 = cols[+gx0] - 10, X1 = cols[+gx1 + 1] + 10, Y0 = rows[+gy0][0] - 10, Y1 = rows[+gy1][1] + 10;

const execPath = await sparticuz.executablePath();
const browser = await pwChromium.launch({ executablePath: execPath, args: sparticuz.args });
const page = await browser.newPage();
const b64 = readFileSync('/home/user/DM/reference/ravenkarte.png').toString('base64');
await page.setContent(`<img id="i" src="data:image/png;base64,${b64}">`);
await page.waitForFunction(() => { const i = document.getElementById('i'); return i && i.complete && i.naturalWidth > 0; });
const url = await page.evaluate(({ X0, X1, Y0, Y1, cols, rows, tab, Z }) => {
  const img = document.getElementById('i'); const cw = X1 - X0, ch = Y1 - Y0;
  const c = document.createElement('canvas'); c.width = cw * Z; c.height = ch * Z; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(img, X0, Y0, cw, ch, 0, 0, cw * Z, ch * Z);
  const mark = (X, Y, feat, label) => { const sx = (X - X0) * Z, sy = (Y - Y0) * Z; g.beginPath(); g.arc(sx, sy, 8, 0, 7); g.fillStyle = feat === 'fluss' ? '#00e5ff' : '#ff1a1a'; g.strokeStyle = '#000'; g.lineWidth = 2; g.fill(); g.stroke(); g.font = 'bold 16px sans-serif'; g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeText(label, sx + 10, sy + 5); g.fillStyle = feat === 'fluss' ? '#0066aa' : '#bb0000'; g.fillText(label, sx + 10, sy + 5); };
  for (const z of tab) { const cx0 = cols[z.gx], cx1 = cols[z.gx + 1], cy0 = rows[z.gy][0], cy1 = rows[z.gy][1]; if (cx1 < X0 || cx0 > X1 || cy1 < Y0 || cy0 > Y1) continue;
    for (const e of z.nord) mark(cx0 + (cx1 - cx0) * e.pos / 100, cy0, e.feature, `N${e.pos}`);
    for (const e of z.sued) mark(cx0 + (cx1 - cx0) * e.pos / 100, cy1, e.feature, `S${e.pos}`);
    for (const e of z.west) mark(cx0, cy0 + (cy1 - cy0) * e.pos / 100, e.feature, `W${e.pos}`);
    for (const e of z.ost) mark(cx1, cy0 + (cy1 - cy0) * e.pos / 100, e.feature, `O${e.pos}`);
  }
  return c.toDataURL('image/png');
}, { X0, X1, Y0, Y1, cols, rows, tab, Z: 3 });
writeFileSync(`${OUT}/zoom_${nm}.png`, Buffer.from(url.split(',')[1], 'base64'));
console.log(`zoom_${nm}.png (${X1 - X0}x${Y1 - Y0} @3x)`);
await browser.close();
