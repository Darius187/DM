// BODENMALER (Runde 74): der ECHTE Boden-Look aus dorfSim, Phaser-frei und in
// EINEN Bake gemalt (statt pro Frame). Portiert und ÜBERARBEITET nach Autor-
// Kritik: der Waldboden bekommt eine eigene, MOOSIGE Struktur (Moospolster,
// Falllaub, Nadeln) statt nur eines flachen dunklen Tints; die Wiese behält
// ihre Halm-Struktur. Der Weg ist dorfSims Polygon-Band (mäandernde Mittellinie,
// ausgefranste Breite, Spurrillen, Erdflecken, Steinchen, Saumgras) statt der
// alten Erd-Kleckse. Alles wird aus der Kachelkarte abgeleitet (T.PATH/T.BRIDGE
// -> Weglinie, T.TREE-Dichte -> Waldbiom) - keine Zusatzdaten nötig.
//
// Determinismus: eigener Seed-Zufall (mulberry32) statt Math.random, damit der
// Boden bei jedem Laden gleich aussieht (und der Bake testbar bleibt).

import { T } from './tiles';
import { moorNoise, felsNoise, sst } from './biome';

export interface BodenKarte { w: number; h: number; map: number[][] }

// --- Seed-Zufall (mulberry32) -------------------------------------------------
function rngAus(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Wiesen-Pattern (Port aus dorfSim macheGras): Basis + kurze Halm-Striche ---
// R80 (Autor: "das Grün war dort deutlich schöner"): Basis und Halm-Töne
// EXAKT wie dorfSims macheGras - keine eigene Deutung mehr.
function macheGrasPattern(rnd: () => number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#27331c'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 360; i++) {
    const r = rnd();
    g.strokeStyle = r < 0.5 ? 'rgba(54,72,38,0.6)' : r < 0.8 ? 'rgba(34,46,24,0.6)' : 'rgba(70,90,48,0.45)';
    g.lineWidth = 1;
    const x = rnd() * 128, y = rnd() * 128, hgt = 3 + rnd() * 6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 3, y - hgt); g.stroke();
  }
  return c;
}

// (Das alte Moos-Pattern ist raus - R80: der Waldboden folgt jetzt 1:1 dem
// dorfSim-Biom-Tint in maleBoden, der Autor will exakt den Anfangskarte-Look.)

// --- Weglinie aus der Kachelkarte: pro Spalte die Mitte der PATH/BRIDGE-Kacheln
// (die Salzstraßen laufen West->Ost). Liefert Weltkoordinaten-Punkte. ----------
export function wegMittellinie(k: BodenKarte, TILE: number): Array<{ x: number; y: number }> {
  const roh: Array<{ x: number; y: number }> = [];
  for (let tx = 0; tx < k.w; tx++) {
    let sum = 0, n = 0;
    for (let ty = 0; ty < k.h; ty++) {
      const id = k.map[ty][tx];
      if (id === T.PATH || id === T.BRIDGE) { sum += ty; n++; }
    }
    if (n) roh.push({ x: tx * TILE + TILE / 2, y: (sum / n + 0.5) * TILE });
  }
  // GLÄTTEN (Autorkritik "Zick-Zack"): die Kachelzentren springen in 32px-Stufen,
  // wo die Wegzeile wechselt - ein gleitendes Mittel (+-4 Spalten) macht daraus
  // die weiche, natürliche Linie, der auch das gemalte Band folgt.
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < roh.length; i++) {
    let sum = 0, n = 0;
    for (let j = Math.max(0, i - 4); j <= Math.min(roh.length - 1, i + 4); j++) { sum += roh[j].y; n++; }
    pts.push({ x: roh[i].x, y: sum / n });
  }
  return pts;
}

// --- Baum-/Walddichte 0..1 an einem Weltpunkt: Anteil T.TREE im Umkreis. ------
export function baumDichteFn(k: BodenKarte, TILE: number): (x: number, y: number) => number {
  const R = 5;   // Kachel-Radius der Nachbarschaft
  return (x: number, y: number) => {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    let n = 0, tot = 0;
    for (let dy = -R; dy <= R; dy += 2) {
      for (let dx = -R; dx <= R; dx += 2) {
        const id = k.map[ty + dy]?.[tx + dx];
        if (id === undefined) continue;
        tot++; if (id === T.TREE) n++;
      }
    }
    return tot ? Math.min(1, (n / tot) * 3.2) : 0;   // schon lockerer Wald zählt
  };
}

// Kies-Grüppchen wie dorfSims pfadSteine/waldDetail (R80): 2-4 kleine Steine
// mit weichem Kontaktschatten und Lichtkante - so wirken sie geerdet.
function maleKies(ctx: CanvasRenderingContext2D, x: number, y: number, rnd: () => number): void {
  for (let k = 0, n = 2 + (rnd() * 3 | 0); k < n; k++) {
    const sx2 = x + (rnd() - 0.5) * 16, sy2 = y + (rnd() - 0.5) * 10;
    const rx = 2 + rnd() * 4, ry = 1.5 + rnd() * 2.4, rot = rnd() * 3;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(sx2 + rx * 0.3, sy2 + ry * 0.6, rx * 1.15, ry * 0.9, rot, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rnd() < 0.5 ? '#56524a' : '#4c4840';
    ctx.beginPath(); ctx.ellipse(sx2, sy2, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(210,210,200,0.14)';
    ctx.beginPath(); ctx.ellipse(sx2 - rx * 0.3, sy2 - ry * 0.3, rx * 0.5, ry * 0.5, rot, 0, Math.PI * 2); ctx.fill();
  }
}

/**
 * Malt den kompletten Boden (Wiese + Waldmoos + Weg) in den gegebenen Kontext.
 * ctx ist bereits so skaliert, dass in WELT-Pixeln gezeichnet wird (der Aufrufer
 * setzt ctx.scale für den Half-Res-Bake). Deterministisch über seed.
 */
export function maleBoden(ctx: CanvasRenderingContext2D, karte: BodenKarte, TILE: number, seed = 1): void {
  const rnd = rngAus(seed);
  const W = karte.w * TILE, H = karte.h * TILE;
  const dichte = baumDichteFn(karte, TILE);

  // 1) Wiese: dorfSims Gras-Pattern über alles - OHNE das alte großflächige
  // Farbspiel (R80, Autor: "das Grün war dort deutlich schöner"). Die Anfangs-
  // karte lebt vom ruhigen, satten Grundton; die Abwechslung kommt aus dem
  // Biom-Tint (Schritt 2) und den Details, nicht aus Farbwolken.
  const gras = macheGrasPattern(rnd);
  ctx.fillStyle = ctx.createPattern(gras, 'repeat')!;
  ctx.fillRect(0, 0, W, H);

  // 2) Biom-Tint wie dorfSims moosCv (R80/R81, 1:1-Port): eine NIEDRIG auf-
  // gelöste Tint-Karte (16-Weltpixel-Zellen), weich hochskaliert. Waldboden
  // erdig-braun über der ECHTEN Baumdichte, MOOR dunkelbraun und FELS grau
  // über dem dorfSim-Biom-Rauschen - die fließenden Übergänge der Anfangskarte.
  {
    const WALD = [31, 27, 15], MOOR = [28, 24, 13], FELS = [60, 58, 52];
    const zelle = 16;
    const tc = document.createElement('canvas');
    tc.width = Math.ceil(W / zelle); tc.height = Math.ceil(H / zelle);
    const m = tc.getContext('2d')!;
    const hashCell = (xx: number, yy: number): number => { const v = Math.sin(xx * 12.9 + yy * 78.2) * 43758.5; return v - Math.floor(v); };
    for (let yy = 0; yy < tc.height; yy++) {
      for (let xx = 0; xx < tc.width; xx++) {
        const x = xx * zelle + zelle / 2, y = yy * zelle + zelle / 2;
        const wMoor = sst(0.56, 0.74, moorNoise(x, y));
        const wFels = sst(0.56, 0.74, felsNoise(x, y)) * (1 - wMoor);
        const wWald = sst(0.18, 0.6, dichte(x, y)) * (1 - wMoor - wFels);
        let r = 0, g = 0, b = 0, a = 0;
        const add = (c: number[], w: number): void => { a += w; r += c[0] * w; g += c[1] * w; b += c[2] * w; };
        add(MOOR, wMoor); add(FELS, wFels); add(WALD, wWald);
        if (a < 0.02) continue;
        const al = Math.min(0.9, a * 0.92) * (0.86 + 0.28 * hashCell(xx, yy));
        m.fillStyle = `rgba(${Math.round(r / a)},${Math.round(g / a)},${Math.round(b / a)},${Math.min(0.92, al)})`;
        m.fillRect(xx, yy, 1, 1);
      }
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tc, 0, 0, tc.width, tc.height, 0, 0, W, H);
  }

  // 3) Wald-Details (Port aus dorfSim macheWaldDetailBilder, statisch gebacken):
  // Falllaub-Flecken, Totholz-Äste, kahle Erdstellen - nur im Waldbiom.
  const details = Math.round((W * H) / 90000);
  for (let i = 0; i < details; i++) {
    const x = rnd() * W, y = rnd() * H, d = dichte(x, y);
    if (d < 0.25 || rnd() > d) continue;
    const art = rnd();
    if (art < 0.45) {          // Falllaub-Fleck
      ctx.fillStyle = 'rgba(88,66,34,0.28)';
      ctx.beginPath(); ctx.ellipse(x, y, 14 + rnd() * 18, 8 + rnd() * 10, rnd() * 3, 0, Math.PI * 2); ctx.fill();
      for (let b = 0; b < 6; b++) {
        ctx.fillStyle = `rgba(${96 + rnd() * 40 | 0},${70 + rnd() * 26 | 0},30,0.5)`;
        ctx.beginPath(); ctx.ellipse(x + (rnd() - 0.5) * 30, y + (rnd() - 0.5) * 18, 2.2, 1.4, rnd() * 3, 0, Math.PI * 2); ctx.fill();
      }
    } else if (art < 0.72) {   // Totholz-Ast mit Kontaktschatten
      const a = rnd() * Math.PI, l = 18 + rnd() * 26;
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x + Math.cos(a) * l, y + 2 + Math.sin(a) * l * 0.4); ctx.stroke();
      ctx.strokeStyle = '#4a3a24'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.4); ctx.stroke();
    } else if (art < 0.92) {   // kahle Erdstelle
      ctx.fillStyle = 'rgba(46,36,20,0.4)';
      ctx.beginPath(); ctx.ellipse(x, y, 12 + rnd() * 14, 8 + rnd() * 8, rnd() * 3, 0, Math.PI * 2); ctx.fill();
    } else {                   // Kies-Cluster (dorfSim waldDetail Typ 3)
      maleKies(ctx, x, y, rnd);
    }
  }
  // Kies auch auf der offenen Wiese verstreut (R80, Anfangskarte-Look: kleine
  // Steingrüppchen liegen dort überall, nicht nur im Wald).
  for (let i = 0, n = Math.round((W * H) / 260000); i < n; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (dichte(x, y) > 0.3) continue;
    maleKies(ctx, x, y, rnd);
  }

  // 4) Erd-/Trampelflecken auf der offenen Wiese (sparsam)
  for (let i = 0; i < 40; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (dichte(x, y) > 0.2) continue;
    const r = 14 + rnd() * 50;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(86,68,40,0.22)'); g.addColorStop(1, 'rgba(86,68,40,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // 4b) Herbst-Laub-Tupfer auf der offenen Wiese (dorfSim-Look, R78): kleine
  // orange-braune Blättchen in lockeren Grüppchen.
  for (let i = 0, n = Math.round((W * H) / 130000); i < n; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (dichte(x, y) > 0.2) continue;
    for (let b2 = 0, m = 2 + (rnd() * 4 | 0); b2 < m; b2++) {
      ctx.fillStyle = `rgba(${150 + rnd() * 50 | 0},${86 + rnd() * 30 | 0},${30 + rnd() * 14 | 0},0.5)`;
      ctx.beginPath(); ctx.ellipse(x + (rnd() - 0.5) * 26, y + (rnd() - 0.5) * 18, 2.4, 1.5, rnd() * 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  // 5) Der WEG als dorfSim-Band
  const mitte = wegMittellinie(karte, TILE);
  if (mitte.length > 3) maleWeg(ctx, mitte, rnd);
}

// --- Brücke (1:1-Port aus dorfSim zeichneBrueckeDeck/zeichneGelaender, R78):
// unebene Planken QUER zur Laufrichtung (5 Brauntöne, Fugen, Maserung, Ast-
// löcher), Bordkanten, Geländer mit Pfosten/Handlauf/unterem Holm auf BEIDEN
// Längsseiten, Deck-Schatten. Ein Bild je Brücke statt Kachel-Bretter. -------
export function macheBrueckenBild(laenge: number, breite: number): HTMLCanvasElement {
  const railH = 17, rand = 6;
  const c = document.createElement('canvas');
  c.width = laenge + rand * 2; c.height = breite + railH + rand * 2 + 6;
  const g = c.getContext('2d')!;
  const x0 = rand, deckY = railH + rand;   // Deck-Oberkante
  // Deck-Schatten ins Wasser
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x0, deckY + 6, laenge, breite);
  // Pfeiler an den Vierteln
  for (const t of [0.25, 0.75]) {
    const px = x0 + laenge * t;
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(px - 4, deckY + breite - 2, 8, 18);
    g.fillStyle = '#1e150d'; g.fillRect(px - 3, deckY + breite - 4, 6, 16);
  }
  // Planken quer zur Laufrichtung (uneben, mit Fuge/Maserung/Astloch)
  const plankW = 13, paletten = ['#5b4327', '#674e2f', '#503c23', '#614a2b', '#574025'];
  for (let p = 0; p < laenge; p += plankW) {
    const hs = Math.sin(p * 1.7) * 43758.5, r = hs - Math.floor(hs), wob = (r - 0.5) * 2;
    g.fillStyle = paletten[Math.floor(r * paletten.length)];
    g.fillRect(x0 + p, deckY + wob, plankW - 1.6, breite - wob);
    g.strokeStyle = 'rgba(30,20,10,0.35)'; g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x0 + p + 2, deckY + 4); g.lineTo(x0 + p + 2, deckY + breite - 4);
    g.moveTo(x0 + p + plankW * 0.6, deckY + 6); g.lineTo(x0 + p + plankW * 0.6, deckY + breite - 6);
    g.stroke();
    if (r < 0.3) { g.fillStyle = 'rgba(20,14,8,0.5)'; g.beginPath(); g.ellipse(x0 + p + plankW * 0.45, deckY + r * breite * 0.8 + 4, 1.6, 1.2, 0, 0, 7); g.fill(); }
  }
  // Bordkanten (Geländerbasis) oben + unten
  g.fillStyle = '#3a2c18';
  g.fillRect(x0, deckY - 1, laenge, 3);
  g.fillRect(x0, deckY + breite - 2, laenge, 3);
  // Geländer beidseitig: Pfosten + unterer Holm + Handlauf (hinteres oben ragt hoch)
  const gelaender = (basisY: number): void => {
    const n = Math.max(4, Math.round(laenge / 28));
    g.lineCap = 'round';
    g.strokeStyle = '#241a10'; g.lineWidth = 3.4;
    for (let k = 0; k <= n; k++) { const wx = x0 + (laenge * k) / n; g.beginPath(); g.moveTo(wx, basisY); g.lineTo(wx, basisY - railH); g.stroke(); }
    g.strokeStyle = 'rgba(40,30,18,0.8)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x0, basisY - railH * 0.5); g.lineTo(x0 + laenge, basisY - railH * 0.5); g.stroke();
    g.strokeStyle = '#3a2c18'; g.lineWidth = 3.6;
    g.beginPath(); g.moveTo(x0, basisY - railH); g.lineTo(x0 + laenge, basisY - railH); g.stroke();
  };
  gelaender(deckY);            // hinteres Geländer (oben)
  gelaender(deckY + breite);   // vorderes Geländer (unten)
  return c;
}

// --- Pfütze (Port der dorfSim-Idee, statisch gebacken): unregelmäßige Lachen-
// Form aus verschmolzenen Blobs, Schlammrand, dunkler Wasserkörper mit Senken-
// Schattierung und gedämpfter Himmel-Spiegelung oben. Die DYNAMIK (wachsen/
// schwinden mit der Nässe) macht die WorldScene über Alpha/Skalierung. --------
export function machePfuetzenBild(seed: number, lang: number, quer: number): HTMLCanvasElement {
  const rnd = rngAus(seed);
  // R80 (Autorbug "Pfützen abgehakt"): die Blob-Ellipsen reichen bis ~0.74*lang
  // von der Mitte, der alte Canvas war aber nur lang/2+6 breit - der Rand hat
  // die Lachen GERADE ABGESCHNITTEN. Jetzt ist der Canvas groß genug.
  const c = document.createElement('canvas');
  c.width = Math.ceil(lang * 1.55) + 8; c.height = Math.ceil(quer * 1.7) + 8;
  const g = c.getContext('2d')!;
  const cx = c.width / 2, cy = c.height / 2;
  interface Blob { x: number; y: number; rx: number; ry: number }
  const blobs: Blob[] = [];
  const n = 3 + (rnd() * 3 | 0);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    blobs.push({ x: cx + (t - 0.5) * lang * 0.72, y: cy + (rnd() - 0.5) * quer * 0.3, rx: lang * (0.16 + rnd() * 0.14), ry: quer * (0.3 + rnd() * 0.2) });
  }
  const form = (grow: number): void => {
    g.beginPath();
    for (const b of blobs) { g.moveTo(b.x + b.rx * grow, b.y); g.ellipse(b.x, b.y, b.rx * grow, b.ry * grow, 0, 0, Math.PI * 2); }
  };
  // nasser Schlammrand (etwas größer als der Wasserkörper), weich wie in
  // dorfSims machePfuetze (leichter Blur statt harter Ellipsen-Kante)
  g.filter = `blur(${Math.max(1, lang * 0.022)}px)`;
  g.fillStyle = 'rgba(26,19,11,0.45)'; form(1.25); g.fill();
  // Wasserkörper (heller/blauer als v1 - die fast schwarze Lache wirkte kaputt)
  g.fillStyle = '#18242e'; form(1); g.fill();
  g.filter = 'none';
  // Senke: Mitte dunkler, Rand minimal heller
  g.save(); form(1); g.clip();
  const rg = g.createRadialGradient(cx, cy, 2, cx, cy, lang * 0.5);
  rg.addColorStop(0, 'rgba(0,0,0,0.35)'); rg.addColorStop(0.8, 'rgba(70,86,100,0.10)'); rg.addColorStop(1, 'rgba(120,140,160,0.16)');
  g.fillStyle = rg; g.fillRect(0, 0, c.width, c.height);
  // gedämpfte Himmel-Spiegelung in der oberen Hälfte
  const lg = g.createLinearGradient(0, cy - quer * 0.5, 0, cy + quer * 0.1);
  lg.addColorStop(0, 'rgba(150,172,198,0.34)'); lg.addColorStop(1, 'rgba(150,172,198,0)');
  g.fillStyle = lg; g.fillRect(0, 0, c.width, cy + quer * 0.1);
  g.restore();
  return c;
}

// --- Schilf-Büschel (Ufer-Bewuchs, Runde 75 "teste das mal"): 5-9 gebogene
// Halme, 1-3 davon mit braunem Rohrkolben, dazu breitere Blattgräser. Gebacken
// als Sprite; das Schwanken macht die WorldScene (Fuß-Anker-Rotation). --------
export function macheSchilfBild(seed: number): HTMLCanvasElement {
  const rnd = rngAus(seed);
  // R82 ("niedrigauflösend"): 3x überabgetastet backen - die Anzeige skaliert
  // auf 1/3 herunter, dadurch echtes Antialiasing statt Treppen-Halmen.
  const S = 3;
  const c = document.createElement('canvas'); c.width = 44 * S; c.height = 62 * S;
  const g = c.getContext('2d')!;
  g.scale(S, S);
  const fx = 22, fy = 58;
  // weicher Fußschatten
  g.fillStyle = 'rgba(0,0,0,0.28)';
  g.beginPath(); g.ellipse(fx, fy, 12, 3.4, 0, 0, Math.PI * 2); g.fill();
  const halme = 5 + (rnd() * 5 | 0);
  const gruen = ['#2c4020', '#3a5228', '#31491f', '#456030'];
  for (let i = 0; i < halme; i++) {
    const bx = fx + (rnd() - 0.5) * 14;
    const neig = (rnd() - 0.5) * 14;
    const hoehe = 30 + rnd() * 24;
    const kolben = rnd() < 0.3 && hoehe > 40;
    g.strokeStyle = gruen[(rnd() * gruen.length) | 0];
    g.lineWidth = 1.4 + rnd() * 0.8;
    g.beginPath(); g.moveTo(bx, fy);
    g.quadraticCurveTo(bx + neig * 0.3, fy - hoehe * 0.6, bx + neig, fy - hoehe);
    g.stroke();
    if (kolben) {   // Rohrkolben: brauner, runder Kolben nahe der Spitze + Spieß
      const kx = bx + neig * 0.92, ky = fy - hoehe * 0.92;
      g.strokeStyle = '#3a4a22'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + neig * 0.12, ky - 7); g.stroke();
      g.fillStyle = '#5a4226';
      g.beginPath(); g.ellipse(kx, ky + 5, 2.1, 6, neig * 0.02, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.beginPath(); g.ellipse(kx - 0.7, ky + 3.4, 0.8, 3, 0, 0, Math.PI * 2); g.fill();
    }
  }
  // 2-3 breite Blattgräser am Fuß
  for (let i = 0, n = 2 + (rnd() * 2 | 0); i < n; i++) {
    const bx = fx + (rnd() - 0.5) * 16, neig = (rnd() - 0.5) * 22, hoehe = 16 + rnd() * 14;
    g.strokeStyle = 'rgba(70,96,48,0.8)'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(bx, fy); g.quadraticCurveTo(bx + neig * 0.4, fy - hoehe * 0.7, bx + neig, fy - hoehe); g.stroke();
  }
  return c;
}

// --- Wiesen-Bewuchs im "Dorf im Wald"-Stil (Autorwunsch R77: GENAU dieser
// Look). 1:1-Port der dorfSim-Zeichnungen (macheBewuchsBilder + Gras-Striche),
// nur in 2facher Auflösung gebacken (LINEAR-Anzeige) und als Sprites mit
// Fuß-Anker - das Schwanken/Wegbiegen macht die WorldScene. ------------------

// Blümchen (gelb/rosa/weiß/lila), Kräuter-Büschel, Klee - exakt dorfSim Z.502-518.
export function macheBewuchsBilder(): HTMLCanvasElement[] {
  const S = 1;   // 1:1 wie dorfSim (Anzeige unskaliert -> Striche bleiben fein statt zu Balken zu verschmelzen)
  const mk = (): [HTMLCanvasElement, CanvasRenderingContext2D] => {
    const c = document.createElement('canvas'); c.width = 18 * S; c.height = 24 * S;
    const g = c.getContext('2d')!; g.scale(S, S); return [c, g];
  };
  const out: HTMLCanvasElement[] = [];
  for (const f of ['#b8a85a', '#b0808e', '#c4c6b2', '#9388ac']) {
    const [c, g] = mk();
    g.strokeStyle = '#3f4d28'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(9, 21); g.lineTo(9, 9); g.stroke();
    g.strokeStyle = '#46582f'; g.beginPath(); g.moveTo(9, 15); g.lineTo(6, 13); g.moveTo(9, 13); g.lineTo(12, 11); g.stroke();
    g.fillStyle = f;
    for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283; g.beginPath(); g.ellipse(9 + Math.cos(a) * 3, 7 + Math.sin(a) * 3, 1.9, 1.4, a, 0, 7); g.fill(); }
    g.fillStyle = '#6a5a2a'; g.beginPath(); g.arc(9, 7, 1.4, 0, 7); g.fill();
    out.push(c);
  }
  { const [c, g] = mk(); g.strokeStyle = '#4a5d2c'; g.lineWidth = 1.3;   // Kräuter-Büschel
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(9, 21); g.quadraticCurveTo(9 + k * 2, 13, 9 + k * 4.5, 6 + Math.abs(k)); g.stroke(); } out.push(c); }
  { const [c, g] = mk(); g.fillStyle = '#3e5226'; g.strokeStyle = '#3e5226'; g.lineWidth = 1.2;  // Klee
    for (const [x1, y1] of [[7, 13], [11, 13], [9, 11]] as Array<[number, number]>) { g.beginPath(); g.moveTo(9, 21); g.lineTo(x1, y1); g.stroke(); g.beginPath(); g.arc(x1, y1 - 1, 2.4, 0, 7); g.fill(); } out.push(c); }
  return out;
}

// (Die gebackenen Gras-Büschel-Sprites sind raus - R80, Autor: 'Grabsteine'.
// Das feine Gras zeichnet die WorldScene jetzt jeden Frame als dorfSim-Striche
// mit Wind-Neigung, siehe zeichneFeinGras.)

// --- Weg (Port aus dorfSim Z.64-88 + Z.1398-1416, statisch): mäandernde
// Mittellinie mit ausgefranster Halbbreite -> Polygon-Band, Spurrillen, in die
// Form geclippte Erdflecken + Steincluster, außen Saumgras. Der Mäander bleibt
// KLEIN (<= halbe Kachel), damit die begehbaren PATH-Kacheln das sichtbare Band
// decken (Kollision == Optik). -------------------------------------------------
function maleWeg(ctx: CanvasRenderingContext2D, mitte: Array<{ x: number; y: number }>, rnd: () => number): void {
  const nz = (s: number, f: number, ph: number): number => Math.sin(s * f + ph * 7.31) * 0.6 + Math.sin(s * f * 2.7 + ph * 3.1) * 0.4;
  // Mittellinie fein sampeln + Halbbreite je Punkt
  interface P { x: number; y: number; hw: number }
  const pts: P[] = [];
  for (let i = 0; i < mitte.length; i++) {
    const m = mitte[i], s = m.x;
    // NUR ein sehr langwelliger, kleiner Versatz (Autorkritik "Zick-Zack"):
    // die Form kommt aus der geglätteten Mittellinie, nicht aus dem Rauschen.
    const meander = nz(s, 0.004, 0) * 6;
    const hw = Math.max(20, 34 * (0.85 + 0.18 * nz(s, 0.013, 2) + 0.06 * nz(s, 0.04, 4)));
    pts.push({ x: m.x, y: m.y + meander, hw });
  }
  const poly = (): void => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y - pts[0].hw);
    for (const p of pts) ctx.lineTo(p.x, p.y - p.hw);
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y + pts[i].hw);
    ctx.closePath();
  };
  // Erdband
  poly(); ctx.fillStyle = '#332819'; ctx.fill();
  // Spurrillen (zwei dunkle Bahnen)
  for (const off of [-0.4, 0.4]) {
    ctx.strokeStyle = 'rgba(16,11,6,0.4)'; ctx.lineWidth = 7;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], y = p.y + p.hw * off;
      if (i === 0) ctx.moveTo(p.x, y); else ctx.lineTo(p.x, y);
    }
    ctx.stroke();
  }
  // In die Wegform geclippt: helle/dunkle Erdflecken + Steinchen-Cluster
  ctx.save(); poly(); ctx.clip();
  for (let i = 0; i < pts.length; i += 6) {
    const p = pts[i];
    if (rnd() < 0.5) {
      ctx.fillStyle = rnd() > 0.5 ? 'rgba(70,54,32,0.5)' : 'rgba(28,20,12,0.45)';
      ctx.beginPath(); ctx.ellipse(p.x + (rnd() - 0.5) * p.hw, p.y + (rnd() - 0.5) * p.hw * 1.2, 8 + rnd() * 16, 5 + rnd() * 8, rnd() * 3, 0, Math.PI * 2); ctx.fill();
    }
    if (rnd() < 0.3) {         // Steincluster
      const cx = p.x + (rnd() - 0.5) * p.hw, cy = p.y + (rnd() - 0.5) * p.hw;
      for (let sN = 0, n = 2 + (rnd() * 4 | 0); sN < n; sN++) {
        const sx = cx + (rnd() - 0.5) * 14, sy = cy + (rnd() - 0.5) * 10, r = 1.6 + rnd() * 2.6;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(sx + 1, sy + 1.4, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgb(${104 + rnd() * 26 | 0},${96 + rnd() * 22 | 0},${84 + rnd() * 18 | 0})`;
        ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.8, rnd() * 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(sx - r * 0.3, sy - r * 0.3, r * 0.35, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.restore();
  // Saumgras: Halme beidseitig über die harte Kante (statisch gebacken)
  for (let i = 0; i < pts.length; i += 2) {
    const p = pts[i];
    for (const seite of [-1, 1]) {
      if (rnd() < 0.35) continue;
      const gx = p.x + (rnd() - 0.5) * 8, gy = p.y + seite * (p.hw + (rnd() - 0.5) * 5);
      ctx.strokeStyle = rnd() > 0.5 ? '#34421f' : '#3a4a22'; ctx.lineWidth = 1.3;
      for (let hN = 0; hN < 3; hN++) {
        ctx.beginPath(); ctx.moveTo(gx + hN * 2 - 2, gy);
        ctx.lineTo(gx + hN * 2 - 2 + (rnd() - 0.5) * 4, gy - seite * (3 + rnd() * 5)); ctx.stroke();
      }
    }
  }
}

// Geröll-Haufen (R80, 7DtD-Abbau Stufe 2): dorfSims macheGeroell 1:1 portiert -
// ein paar unregelmäßige Brocken mit Lichtkante, deterministisch über seed.
export function macheGeroellBild(seed: number, R = 13): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = R * 2 + 14;
  const g = c.getContext('2d')!;
  let s = seed; const rnd = (): number => { s = (s * 16807 + 11) % 2147483647; return (s % 10000) / 10000; };
  const cx = c.width / 2, cy = c.height / 2 + R * 0.2;
  for (let k = 0; k < 6; k++) {
    const ox = (rnd() - 0.5) * R * 1.4, oy = (rnd() - 0.5) * R * 0.7, rr = R * (0.18 + rnd() * 0.22);
    g.fillStyle = k % 2 ? '#3e3e44' : '#52525a';
    g.beginPath(); g.ellipse(cx + ox, cy + oy, rr, rr * 0.7, 0, 0, 7); g.fill();
    g.fillStyle = '#62626a';
    g.beginPath(); g.ellipse(cx + ox - rr * 0.2, cy + oy - rr * 0.25, rr * 0.5, rr * 0.35, 0, 0, 7); g.fill();
  }
  return c;
}

// Riss-Überzug (R80, 7DtD-Abbau Stufe 1): der Strichzug aus dorfSims zeichneFels,
// als eigenes Bild über den angeschlagenen Brocken gelegt.
export function macheFelsRisseBild(R = 14): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = R * 2 + 4;
  const g = c.getContext('2d')!;
  const cx = c.width / 2, cy = c.height / 2;
  g.strokeStyle = 'rgba(12,12,16,0.6)'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(cx - R * 0.3, cy - R * 0.55); g.lineTo(cx + R * 0.08, cy - R * 0.1); g.lineTo(cx + R * 0.4, cy - R * 0.45); g.stroke();
  g.beginPath(); g.moveTo(cx + R * 0.05, cy - R * 0.08); g.lineTo(cx - R * 0.12, cy + R * 0.4); g.stroke();
  return c;
}

// R82 (Autorbug "kein Antialiasing"): Gras als 3x-überabgetastete Canvas-Bilder
// statt WebGL-Linien (die bei pixelArt kein AA können). Anzeige-Skala = 1/3.
// kurz = 3 Striche (dorfSim EBENE 1), hoch = 5 luftig aufgefächerte Halme.
export function macheFeinGrasBild(hoch: boolean, seed: number): HTMLCanvasElement {
  const S = 3, rnd = rngAus(seed);
  if (!hoch) {
    const c = document.createElement('canvas'); c.width = 16 * S; c.height = 10 * S;
    const g = c.getContext('2d')!; g.scale(S, S);
    g.lineWidth = 1.3; g.lineCap = 'round'; g.strokeStyle = '#3c4d27';
    for (const [dx, l, lean] of [[-2, 5, -0.9], [0, 7, 0.3], [2, 6, 1.1]] as Array<[number, number, number]>) {
      g.beginPath(); g.moveTo(8 + dx, 10);
      g.lineTo(8 + dx + lean + (rnd() - 0.5) * 1.4, 10 - l); g.stroke();
    }
    return c;
  }
  const c = document.createElement('canvas'); c.width = 28 * S; c.height = 24 * S;
  const g = c.getContext('2d')!; g.scale(S, S);
  g.lineWidth = 1.1; g.lineCap = 'round';
  for (let k = -2; k <= 2; k++) {
    g.strokeStyle = k % 2 ? '#43562b' : '#37481f';
    const u = 0.5 + Math.abs(k) * 0.22;
    const bh = (11 + rnd() * 8) * (0.75 + Math.abs(Math.sin((seed + k) * 3.7)) * 0.35);
    const x0 = 14 + k * 2.6, tip = x0 + k * 1.4 + u * 1.3 + (rnd() - 0.5);
    g.beginPath(); g.moveTo(x0, 24);
    g.quadraticCurveTo(x0 + (tip - x0) * 0.35, 24 - bh * 0.62, tip, 24 - bh);
    g.stroke();
  }
  return c;
}

// Moor-Schilf/Rohrkolben (R82): kleiner als vorher (Autor "riesig im Vergleich
// zum Helden") und 3x überabgetastet - 3 gebogene Halme + brauner Kolben.
export function macheMoorSchilfBild(seed: number, tot: boolean): HTMLCanvasElement {
  const S = 3, rnd = rngAus(seed);
  const h = 12 + rnd() * 7;
  const c = document.createElement('canvas'); c.width = 14 * S; c.height = Math.ceil(h + 3) * S;
  const g = c.getContext('2d')!; g.scale(S, S);
  g.lineWidth = 1.15; g.lineCap = 'round';
  g.strokeStyle = tot ? '#6a5a32' : '#3f5226';
  const by = h + 3;
  for (let k = -1; k <= 1; k++) {
    const hh = h * (0.78 + rnd() * 0.24);
    g.beginPath(); g.moveTo(7 + k * 2.2, by);
    g.quadraticCurveTo(7 + k * 2.2 + 1.1, by - hh * 0.6, 7 + k * 2.2 + 1.9, by - hh);
    g.stroke();
  }
  g.fillStyle = tot ? '#7a5a30' : '#5a3c22';
  g.fillRect(7 + 0.9, by - h, 2, 5);   // Rohrkolben an der Spitze des Mittelhalms
  return c;
}
