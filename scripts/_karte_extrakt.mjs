// Bild->Geometrie-Extraktion aus reference/ravenkarte.png (untere Rasterhälfte).
// Pro Zellkante: Kreuzungen von Fluss (hellblau) und Weg (dunkelrot) als % der
// Kantenlänge; Seen (blaue Ellipsen) als Zentrum+Größe in % der Zelle.
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

const out = await page.evaluate(() => {
  const img = document.getElementById('i');
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, W, H).data;
  const px = (x, y) => { const i = (((y | 0) * W + (x | 0)) * 4); return [d[i], d[i + 1], d[i + 2]]; };
  const isBlue = (r, gg, b) => b > 115 && r < 150 && b > r + 25 && gg > 70;
  const isRed = (r, gg, b) => r > 65 && r < 215 && gg < 85 && b < 85 && r > gg + 28 && r > b + 28;

  const cols = [48, 225, 406, 587, 767, 947, 1124];
  const rowsMain = { 1: [733, 854], 2: [854, 973], 3: [973, 1088] };
  const kloster = { yr: [618, 733] };
  const name = {
    '5,0': 'kloster',
    '2,1': 'hochland', '3,1': 'wald_nw', '4,1': 'wald_ne', '5,1': 'schlacht',
    '2,2': 'wald_n', '3,2': 'wald_m', '4,2': 'lager', '5,2': 'stadt2',
    '0,3': 'burg', '1,3': 'wald_w', '2,3': 'start', '3,3': 'wald_o', '4,3': 'stadt', '5,3': 'wald_se',
  };

  const scanEdge = (fixed, from, to, horizontal, inset) => {
    const treffer = []; let cur = null, start = 0; const len = to - from;
    for (let t = 0; t <= len; t++) {
      let cls = null;
      for (let dInset = 0; dInset <= 8 && !cls; dInset += 2) {
        const xx = horizontal ? from + t : fixed + inset + dInset;
        const yy = horizontal ? fixed + inset + dInset : from + t;
        const [r, gg, b] = px(xx, yy);
        if (isBlue(r, gg, b)) cls = 'fluss'; else if (isRed(r, gg, b)) cls = 'weg';
      }
      if (cls !== cur) { if (cur) treffer.push({ feature: cur, a: start, b: t - 1 }); cur = cls; start = t; }
    }
    if (cur) treffer.push({ feature: cur, a: start, b: len });
    // Rohkreuzungen in %
    let roh = treffer.filter((r) => r.b - r.a >= 1).map((r) => ({ feature: r.feature, pos: ((r.a + r.b) / 2) / len * 100, gew: r.b - r.a + 1 }));
    // Wobbel-Merge: gleiche Feature-Kreuzungen innerhalb 9% zu EINER zusammenfassen
    // (gewichteter Mittelpunkt) - die zittrige Handlinie kreuzt den Streifen mehrfach.
    roh.sort((p, q) => p.pos - q.pos);
    const merged = [];
    for (const k of roh) {
      const last = merged[merged.length - 1];
      if (last && last.feature === k.feature && k.pos - last.posMax <= 9) {
        const gw = last.gew + k.gew; last.pos = (last.pos * last.gew + k.pos * k.gew) / gw; last.gew = gw; last.posMax = k.pos;
      } else merged.push({ feature: k.feature, pos: k.pos, gew: k.gew, posMax: k.pos });
    }
    return merged.map((m) => ({ feature: m.feature, pos: +m.pos.toFixed(1) }));
  };

  const seenImCell = (x0, x1, y0, y1) => {
    let n = 0, sx = 0, sy = 0, minx = x1, maxx = x0, miny = y1, maxy = y0;
    for (let y = y0 + 6; y < y1 - 6; y += 2) for (let x = x0 + 6; x < x1 - 6; x += 2) {
      const [r, gg, b] = px(x, y);
      if (isBlue(r, gg, b)) { n++; sx += x; sy += y; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
    }
    const flaeche = (x1 - x0) * (y1 - y0);
    const bboxFill = n > 0 ? (n * 4) / Math.max(1, (maxx - minx) * (maxy - miny)) : 0;
    if (n * 4 > flaeche * 0.03 && bboxFill > 0.22 && (maxx - minx) > 12 && (maxy - miny) > 8) {
      return { cx: +(((sx / n) - x0) / (x1 - x0) * 100).toFixed(0), cy: +(((sy / n) - y0) / (y1 - y0) * 100).toFixed(0), rx: +((maxx - minx) / (x1 - x0) * 100 / 2).toFixed(0), ry: +((maxy - miny) / (y1 - y0) * 100 / 2).toFixed(0) };
    }
    return null;
  };

  const zellen = []; const marks = [];
  const doCell = (gx, gy, x0, x1, y0, y1) => {
    const id = name[`${gx},${gy}`]; if (!id) return;
    const ins = 5;
    const west = scanEdge(x0, y0 + ins, y1 - ins, false, ins);
    const ost = scanEdge(x1, y0 + ins, y1 - ins, false, -ins - 8);
    const nord = scanEdge(y0, x0 + ins, x1 - ins, true, ins);
    const sued = scanEdge(y1, x0 + ins, x1 - ins, true, -ins - 8);
    const seen = seenImCell(x0, x1, y0, y1);
    zellen.push({ id, gx, gy, west, ost, nord, sued, seen });
    for (const e of west) marks.push({ x: x0, y: y0 + (y1 - y0) * e.pos / 100, feature: e.feature });
    for (const e of ost) marks.push({ x: x1, y: y0 + (y1 - y0) * e.pos / 100, feature: e.feature });
    for (const e of nord) marks.push({ x: x0 + (x1 - x0) * e.pos / 100, y: y0, feature: e.feature });
    for (const e of sued) marks.push({ x: x0 + (x1 - x0) * e.pos / 100, y: y1, feature: e.feature });
  };
  for (const gy of [1, 2, 3]) for (let gx = 0; gx <= 5; gx++) doCell(gx, gy, cols[gx], cols[gx + 1], rowsMain[gy][0], rowsMain[gy][1]);
  doCell(5, 0, cols[5], cols[6], kloster.yr[0], kloster.yr[1]);

  for (const m of marks) { g.fillStyle = m.feature === 'fluss' ? '#00e5ff' : '#ff2a2a'; g.strokeStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.arc(m.x, m.y, 6, 0, Math.PI * 2); g.fill(); g.stroke(); }
  return { W, H, zellen, overlay: c.toDataURL('image/png') };
});

writeFileSync(`${OUT}/karte_overlay.png`, Buffer.from(out.overlay.split(',')[1], 'base64'));
writeFileSync(`${OUT}/karte_tabelle.json`, JSON.stringify(out.zellen, null, 2));
for (const z of out.zellen) {
  const f = (arr) => arr.map((e) => `${e.feature[0]}${e.pos}`).join(',') || '-';
  console.log(`${z.id.padEnd(9)} N:${f(z.nord).padEnd(18)} O:${f(z.ost).padEnd(18)} S:${f(z.sued).padEnd(18)} W:${f(z.west).padEnd(18)} See:${z.seen ? `${z.seen.cx}/${z.seen.cy} r${z.seen.rx}x${z.seen.ry}` : '-'}`);
}
await browser.close();
