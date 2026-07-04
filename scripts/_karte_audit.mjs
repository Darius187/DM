// Zoom-Audit: schneidet die untere Rasterhälfte zeilenweise aus, 2x vergrößert,
// und zeichnet die erkannten Kreuzungen (aus karte_tabelle.json) als beschriftete
// Punkte auf die Original-Linien - damit man Punkt fuer Punkt vergleichen kann.
import { chromium as pwChromium } from 'playwright-core';
import sparticuz from '@sparticuz/chromium';
import { readFileSync, writeFileSync } from 'node:fs';
const OUT = '/tmp/claude-0/-home-user-DM/8a29f16c-6261-5c93-8c27-9ce98f5b71ae/scratchpad';
const tab = JSON.parse(readFileSync(`${OUT}/karte_tabelle.json`, 'utf8'));
const cols = [48, 225, 406, 587, 767, 947, 1124];
const rows = { 0: [618, 733], 1: [733, 854], 2: [854, 973], 3: [973, 1088] };
const byId = {}; for (const z of tab) byId[z.id] = z;

const execPath = await sparticuz.executablePath();
const browser = await pwChromium.launch({ executablePath: execPath, args: sparticuz.args });
const page = await browser.newPage();
const b64 = readFileSync('/home/user/DM/reference/ravenkarte.png').toString('base64');
await page.setContent(`<img id="i" src="data:image/png;base64,${b64}">`);
await page.waitForFunction(() => { const i = document.getElementById('i'); return i && i.complete && i.naturalWidth > 0; });

for (const [gyStr, cells] of Object.entries({
  gy3: ['burg', 'wald_w', 'start', 'wald_o', 'stadt', 'wald_se'],
  gy2: ['wald_n', 'wald_m', 'lager', 'stadt2'],
  gy1: ['hochland', 'wald_nw', 'wald_ne', 'schlacht'],
  kloster: ['kloster'],
})) {
  const url = await page.evaluate(({ cells, cols, rows, byId, Z }) => {
    const img = document.getElementById('i');
    // Bounding-Box der Zeile
    let x0 = 1e9, x1 = 0, y0 = 1e9, y1 = 0;
    for (const id of cells) { const z = byId[id]; x0 = Math.min(x0, cols[z.gx]); x1 = Math.max(x1, cols[z.gx + 1]); y0 = Math.min(y0, rows[z.gy][0]); y1 = Math.max(y1, rows[z.gy][1]); }
    const pad = 8; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    const cw = x1 - x0, ch = y1 - y0;
    const c = document.createElement('canvas'); c.width = cw * Z; c.height = ch * Z;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(img, x0, y0, cw, ch, 0, 0, cw * Z, ch * Z);
    const mark = (X, Y, feature, label) => {
      const sx = (X - x0) * Z, sy = (Y - y0) * Z;
      g.beginPath(); g.arc(sx, sy, 7, 0, Math.PI * 2); g.fillStyle = feature === 'fluss' ? '#00e5ff' : '#ff1a1a'; g.strokeStyle = '#000'; g.lineWidth = 2; g.fill(); g.stroke();
      g.font = 'bold 13px sans-serif'; g.fillStyle = '#000'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeText(label, sx + 9, sy + 4); g.fillStyle = feature === 'fluss' ? '#0077aa' : '#cc0000'; g.fillText(label, sx + 9, sy + 4);
    };
    for (const id of cells) {
      const z = byId[id]; const cx0 = cols[z.gx], cx1 = cols[z.gx + 1], cy0 = rows[z.gy][0], cy1 = rows[z.gy][1];
      for (const e of z.nord) mark(cx0 + (cx1 - cx0) * e.pos / 100, cy0, e.feature, `N${e.pos}`);
      for (const e of z.sued) mark(cx0 + (cx1 - cx0) * e.pos / 100, cy1, e.feature, `S${e.pos}`);
      for (const e of z.west) mark(cx0, cy0 + (cy1 - cy0) * e.pos / 100, e.feature, `W${e.pos}`);
      for (const e of z.ost) mark(cx1, cy0 + (cy1 - cy0) * e.pos / 100, e.feature, `O${e.pos}`);
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.font = 'bold 12px sans-serif'; g.fillText(id, (cx0 - x0) * Z + 4, (cy0 - y0) * Z + 14);
    }
    return c.toDataURL('image/png');
  }, { cells, cols, rows, byId, Z: 2 });
  writeFileSync(`${OUT}/audit_${gyStr}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`audit_${gyStr}.png`);
}
await browser.close();
