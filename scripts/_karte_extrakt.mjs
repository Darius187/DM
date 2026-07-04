// Bild->Geometrie-Extraktion aus reference/ravenkarte.png (untere Rasterhälfte).
// R98b: JEDE Grenze wird nur EINMAL abgetastet (am exakten Gitterstrich, mit
// senkrechtem Band) und an BEIDE Nachbarn mit DEMSELBEN Wert vergeben - so
// passen Wege/Flüsse per Konstruktion zusammen (Übergabe-Prinzip). Ausgabe:
// Tabelle (% der Kantenlänge) + Kontroll-Overlay + Klassifikations-Maske.
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
  const isRed = (r, gg, b) => r > 55 && gg < 110 && b < 110 && r > gg + 22 && r > b + 22 && !(b > 115 && b > r);

  const cols = [48, 225, 406, 587, 767, 947, 1124];
  const rows = { 0: [618, 733], 1: [733, 854], 2: [854, 973], 3: [973, 1088] };
  const name = {
    '5,0': 'kloster',
    '2,1': 'hochland', '3,1': 'wald_nw', '4,1': 'wald_ne', '5,1': 'schlacht',
    '2,2': 'wald_n', '3,2': 'wald_m', '4,2': 'lager', '5,2': 'stadt2',
    '0,3': 'burg', '1,3': 'wald_w', '2,3': 'start', '3,3': 'wald_o', '4,3': 'stadt', '5,3': 'wald_se',
  };
  const zellen = {};
  for (const key in name) { const [gx, gy] = key.split(',').map(Number); zellen[name[key]] = { id: name[key], gx, gy, nord: [], ost: [], sued: [], west: [], seen: null }; }
  const cellAt = (gx, gy) => name[`${gx},${gy}`] ? zellen[name[`${gx},${gy}`]] : null;

  // eine gerade Grenze EINMAL abtasten (senkrechtes Band ±BAND). Rückgabe:
  // Kreuzungen als % entlang [from,to], gemergte Wobbel.
  const BAND = 8;
  const scanBorder = (vertical, linePos, from, to) => {
    const len = to - from; const raw = []; let cur = null, start = 0;
    for (let t = 0; t <= len; t++) {
      let cls = null;
      for (let dp = -BAND; dp <= BAND && cls !== 'weg'; dp++) {
        const x = vertical ? linePos + dp : from + t;
        const y = vertical ? from + t : linePos + dp;
        const [r, gg, b] = px(x, y);
        if (isRed(r, gg, b)) cls = 'weg'; else if (!cls && isBlue(r, gg, b)) cls = 'fluss';
      }
      if (cls !== cur) { if (cur) raw.push({ feature: cur, a: start, b: t - 1 }); cur = cls; start = t; }
    }
    if (cur) raw.push({ feature: cur, a: start, b: len });
    let cr = raw.filter((r) => r.b - r.a >= 1).map((r) => ({ feature: r.feature, pos: ((r.a + r.b) / 2) / len * 100, gew: r.b - r.a + 1 }));
    cr.sort((p, q) => p.pos - q.pos);
    const merged = [];
    for (const k of cr) { const last = merged[merged.length - 1]; if (last && last.feature === k.feature && k.pos - last.posMax <= 10) { const gw = last.gew + k.gew; last.pos = (last.pos * last.gew + k.pos * k.gew) / gw; last.gew = gw; last.posMax = k.pos; } else merged.push({ feature: k.feature, pos: k.pos, gew: k.gew, posMax: k.pos }); }
    return merged.map((m) => ({ feature: m.feature, pos: +m.pos.toFixed(1) }));
  };

  const marks = [];
  // VERTIKALE Grenzen: x = cols[i], je Zeile gy. Links=(i-1,gy).ost, Rechts=(i,gy).west
  for (let i = 0; i <= 6; i++) for (const gy of [0, 1, 2, 3]) {
    const links = cellAt(i - 1, gy), rechts = cellAt(i, gy);
    if (!links && !rechts) continue;
    const [y0, y1] = rows[gy];
    // R98c: VOLLE Kante messen (nicht eingerückt), sonst sind die %-Werte
    // gegenüber der Zeichnung systematisch verschoben (Autorkritik).
    const cr = scanBorder(true, cols[i], y0, y1);
    if (links) links.ost = cr;
    if (rechts) rechts.west = cr;
    for (const e of cr) marks.push({ x: cols[i], y: y0 + (y1 - y0) * e.pos / 100, feature: e.feature });
  }
  // HORIZONTALE Grenzen: y = grid line, je Spalte gx. Oben=(gx,gyO).sued, Unten=(gx,gyU).nord
  const hbord = [[733, 0, 1], [854, 1, 2], [973, 2, 3], [1088, 3, null], [618, null, 0]];
  for (const [y, gyO, gyU] of hbord) for (let gx = 0; gx <= 5; gx++) {
    const oben = gyO != null ? cellAt(gx, gyO) : null, unten = gyU != null ? cellAt(gx, gyU) : null;
    if (!oben && !unten) continue;
    const x0 = cols[gx], x1 = cols[gx + 1];
    const cr = scanBorder(false, y, x0, x1);
    if (oben) oben.sued = cr;
    if (unten) unten.nord = cr;
    for (const e of cr) marks.push({ x: x0 + (x1 - x0) * e.pos / 100, y, feature: e.feature });
  }

  // Seen (gefüllte blaue Ellipsen) je Zelle
  for (const id in zellen) {
    const z = zellen[id]; const x0 = cols[z.gx], x1 = cols[z.gx + 1], [y0, y1] = rows[z.gy];
    let n = 0, sx = 0, sy = 0, minx = x1, maxx = x0, miny = y1, maxy = y0;
    for (let y = y0 + 6; y < y1 - 6; y += 2) for (let x = x0 + 6; x < x1 - 6; x += 2) { const [r, gg, b] = px(x, y); if (isBlue(r, gg, b)) { n++; sx += x; sy += y; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; } }
    const bboxFill = n > 0 ? (n * 4) / Math.max(1, (maxx - minx) * (maxy - miny)) : 0;
    if (n * 4 > (x1 - x0) * (y1 - y0) * 0.03 && bboxFill > 0.22 && (maxx - minx) > 12 && (maxy - miny) > 8) {
      z.seen = { cx: +(((sx / n) - x0) / (x1 - x0) * 100).toFixed(0), cy: +(((sy / n) - y0) / (y1 - y0) * 100).toFixed(0), rx: +((maxx - minx) / (x1 - x0) * 100 / 2).toFixed(0), ry: +((maxy - miny) / (y1 - y0) * 100 / 2).toFixed(0) };
    }
  }

  for (const m of marks) { g.fillStyle = m.feature === 'fluss' ? '#00e5ff' : '#ff2a2a'; g.strokeStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.arc(m.x, m.y, 6, 0, Math.PI * 2); g.fill(); g.stroke(); }
  return { zellen: Object.values(zellen), overlay: c.toDataURL('image/png') };
});

writeFileSync(`${OUT}/karte_overlay.png`, Buffer.from(out.overlay.split(',')[1], 'base64'));
writeFileSync(`${OUT}/karte_tabelle.json`, JSON.stringify(out.zellen, null, 2));
const f = (arr) => arr.map((e) => `${e.feature[0]}${e.pos}`).join(',') || '-';
for (const z of out.zellen) console.log(`${z.id.padEnd(9)} N:${f(z.nord).padEnd(16)} O:${f(z.ost).padEnd(16)} S:${f(z.sued).padEnd(16)} W:${f(z.west).padEnd(16)} See:${z.seen ? `${z.seen.cx}/${z.seen.cy}` : '-'}`);
await browser.close();
