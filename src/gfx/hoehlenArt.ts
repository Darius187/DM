// HÖHLEN-OPTIK für die V4-Mine (R126, überarbeitet R127c).
// AUTOR-PROBLEM R127c: "wenn sich das Muster wiederholt, sind die Steine
// abgehackt, weil sie nur teilweise auf der Kachel sind." LÖSUNG: das Gestein
// wird NICHT mehr je 32er-Kachel gezeichnet, sondern auf EINE grosse
// 8x8-Kachel-Supertextur (256x256) MIT UMLAUF (was rechts rausläuft, kommt
// links wieder rein). Die Supertextur wird in 64 Einzelkacheln geschnitten,
// und die Szene verlegt sie NACH POSITION (tx%8, ty%8): jeder Stein läuft
// über die Kachelgrenze hinweg im Nachbarn weiter - nichts ist abgehackt,
// und die 8x8-Fläche kachelt auch mit sich selbst nahtlos.
// Erzadern liegen als Band ÜBER dem (nahtlosen) Gestein-Ausschnitt.

const TILE = 32;
const SUPER = 8;                 // Supertextur = 8x8 Kacheln
const SW = SUPER * TILE;         // 256 px
type Ctx = CanvasRenderingContext2D;

export type HoehleArt = 'boden' | 'wand' | 'erz_eisen' | 'erz_kupfer' | 'erz_gold' | 'bohlen';

// deterministischer Zufall (stabil, kein Math.random im Bake)
function prng(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

// Umlauf-Versätze: eine Form wird an allen 9 Positionen gezeichnet, damit sie
// an den Rändern der Supertextur nahtlos "durchläuft".
const UMLAUF: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [SW, 0], [-SW, 0], [0, SW], [0, -SW], [SW, SW], [SW, -SW], [-SW, SW], [-SW, -SW],
];

// --- Supertextur: Stollenwand (Geröll, Brocken laufen über Kachelgrenzen) ----
function baueWandSuper(ctx: Ctx): void {
  const r = prng(31);
  ctx.fillStyle = '#171310';                                  // tiefe Fugen
  ctx.fillRect(0, 0, SW, SW);
  const anzahl = SUPER * SUPER * 8;                           // ~8 Brocken je Kachel
  for (let i = 0; i < anzahl; i++) {
    const cx = r() * SW, cy = r() * SW, rad = 5 + r() * 7;
    const grau = 40 + r() * 34, warm = r() * 14;
    const farbe = `rgb(${Math.round(grau + warm)},${Math.round(grau + warm * 0.55)},${Math.round(grau)})`;
    // Polygon EINMAL würfeln, dann an allen Umlauf-Positionen zeichnen
    const ecken = 5 + Math.floor(r() * 2);
    const pts: Array<[number, number]> = [];
    for (let e = 0; e < ecken; e++) {
      const a = (e / ecken) * 6.283 + r() * 0.5;
      const rr = rad * (0.6 + r() * 0.5);
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    for (const [dx, dy] of UMLAUF) {
      const x = cx + dx, y = cy + dy;
      if (x < -rad - 2 || x > SW + rad + 2 || y < -rad - 2 || y > SW + rad + 2) continue;
      ctx.fillStyle = farbe;
      ctx.beginPath();
      pts.forEach(([px, py], e) => { if (e === 0) ctx.moveTo(x + px, y + py); else ctx.lineTo(x + px, y + py); });
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = 'rgba(255,235,200,0.06)';               // Lichtkante oben
      ctx.fillRect(x - rad * 0.5, y - rad * 0.5, rad * 0.8, 2);
    }
  }
  // feiner Staub/Risse
  for (let i = 0; i < SUPER * SUPER * 14; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.2})`;
    ctx.fillRect(r() * SW, r() * SW, 1, 1);
  }
}

// --- Supertextur: Höhlenboden (Erde + Geröll, komplett nahtlos) --------------
function baueBodenSuper(ctx: Ctx): void {
  const r = prng(7);
  ctx.fillStyle = 'rgb(76,64,50)';                            // erdiges Warmbraun
  ctx.fillRect(0, 0, SW, SW);
  // grosse weiche Flecken (regionale Tönung statt Kachel-Wiederholung)
  for (let i = 0; i < 42; i++) {
    const cx = r() * SW, cy = r() * SW, rx = 10 + r() * 22, ry = 8 + r() * 16, rot = r() * 3;
    const d = (r() - 0.5) * 0.14;
    ctx.fillStyle = d > 0 ? `rgba(220,200,170,${d})` : `rgba(0,0,0,${-d})`;
    for (const [dx, dy] of UMLAUF) {
      const x = cx + dx, y = cy + dy;
      if (x < -rx - 24 || x > SW + rx + 24 || y < -ry - 24 || y > SW + ry + 24) continue;
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 6.283); ctx.fill();
    }
  }
  // Kiesel + kleine Brocken (Geröll), laufen über Kachelgrenzen
  for (let i = 0; i < SUPER * SUPER * 9; i++) {
    const cx = r() * SW, cy = r() * SW;
    const rx = 0.8 + r() * 1.8, ry = 0.7 + r() * 1.4, rot = r() * 3;
    const c = 52 + r() * 40;
    ctx.fillStyle = `rgb(${(c + 6) | 0},${c | 0},${(c - 8) | 0})`;
    for (const [dx, dy] of UMLAUF) {
      const x = cx + dx, y = cy + dy;
      if (x < -4 || x > SW + 4 || y < -4 || y > SW + 4) continue;
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 6.283); ctx.fill();
    }
  }
  // Staubkörner
  for (let i = 0; i < SUPER * SUPER * 16; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.06 + r() * 0.1})`;
    ctx.fillRect(r() * SW, r() * SW, 1, 1);
  }
}

// --- Supertextur: Holzbohlen (durchlaufende Bretter, versetzte Stösse) -------
function baueBohlenSuper(ctx: Ctx): void {
  const r = prng(57);
  ctx.fillStyle = '#241609';
  ctx.fillRect(0, 0, SW, SW);
  const breite = 8;
  for (let x = 0; x < SW; x += breite) {
    // Stoss-Fugen je Brett-Spalte: Positionen in [0..SW), Segmente dazwischen;
    // das letzte Segment läuft über den Rand (Umlauf) und behält EINEN Ton.
    const fugen: number[] = [];
    let fy = Math.floor(r() * 40);
    while (fy < SW) { fugen.push(fy); fy += 26 + Math.floor(r() * 30); }
    if (fugen.length < 2) fugen.push((fugen[0] ?? 0) + 128);
    const segment = (y0: number, hoehe: number, ton: number): void => {
      ctx.fillStyle = `rgb(${ton | 0},${(ton * 0.64) | 0},${(ton * 0.36) | 0})`;
      ctx.fillRect(x + 1, y0, breite - 2, hoehe);
      // Maserung (in das Segment geklemmt)
      ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y0, breite - 2, hoehe); ctx.clip();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        let px = x + 2 + r() * 4; ctx.moveTo(px, y0 - 3);
        for (let y = y0 + 3; y <= y0 + hoehe + 3; y += 6) { px += (r() - 0.5) * 1.6; ctx.lineTo(px, y); }
        ctx.stroke();
      }
      if (r() < 0.25) { ctx.fillStyle = 'rgba(20,12,6,0.6)'; ctx.beginPath(); ctx.arc(x + 4, y0 + r() * hoehe, 1, 0, 6.283); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';                     // Stossfuge oben
      ctx.fillRect(x + 1, y0, breite - 2, 1);
    };
    for (let j = 0; j < fugen.length; j++) {
      const y0 = fugen[j];
      const ton = 92 + r() * 28;
      if (j + 1 < fugen.length) segment(y0, fugen[j + 1] - y0, ton);
      else {                                                   // Umlauf-Segment
        segment(y0, SW - y0, ton);
        segment(0, fugen[0], ton);
      }
    }
  }
}

// --- Erz-VORKOMMEN über einem 32er-Ausschnitt ---------------------------------
// R127f (Autor: "statt der Adern sichtbare GROSSE Vorkommen"). Farbwelt bleibt
// die recherchierte Realität (R127e): Gold sitzt in einer hellen QUARZ-Tasche
// (Goldquarzgang) als sattes Nugget-Nest; Eisen = rotbraune Hämatit-Brocken
// mit Rost-Hof und Stahlglanz; Kupfer = messinggelber Kupferkies mit grüner
// Malachit-Kruste (selten blauer Azurit).
function zeichneVorkommen(ctx: Ctx, seed: number, art: 'eisen' | 'kupfer' | 'gold'): void {
  const r = prng(seed + (art === 'gold' ? 401 : art === 'kupfer' ? 301 : 201));
  const cx = TILE / 2 + (r() - 0.5) * 6, cy = TILE / 2 + (r() - 0.5) * 6;
  // eckiger Brocken (Polygon) an Position mit Radius zeichnen
  const brocken = (bx: number, by: number, rad: number, farbe: string, kante = true): void => {
    const ecken = 5 + Math.floor(r() * 2);
    ctx.fillStyle = farbe;
    ctx.beginPath();
    for (let e = 0; e < ecken; e++) {
      const a = (e / ecken) * 6.283 + r() * 0.5;
      const rr = rad * (0.65 + r() * 0.45);
      const px = bx + Math.cos(a) * rr, py = by + Math.sin(a) * rr;
      if (e === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    if (kante) { ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.8; ctx.stroke(); }
  };
  // weicher Hof (Verwitterung/Gangart) hinter dem Nest
  const hof = (farbe: string, rad: number): void => {
    ctx.fillStyle = farbe;
    ctx.beginPath(); ctx.ellipse(cx, cy, rad, rad * 0.85, r() * 3, 0, 6.283); ctx.fill();
  };
  if (art === 'gold') {
    hof('rgba(205,200,188,0.85)', 12);                        // Quarz-Tasche (hell)
    hof('rgba(228,224,214,0.9)', 8.5);
    for (let i = 0; i < 4; i++) {                             // sattes Nugget-Nest
      const bx = cx + (r() - 0.5) * 11, by = cy + (r() - 0.5) * 10;
      brocken(bx, by, 2.6 + r() * 2.2, '#c9992a');
      ctx.fillStyle = '#ffe27a';                              // Glanz-Facette oben links
      ctx.fillRect(bx - 1.5, by - 1.5, 2, 1.4);
    }
    ctx.fillStyle = '#4a4a52';                                // Sulfid-Einschlüsse
    for (let i = 0; i < 3; i++) ctx.fillRect(cx + (r() - 0.5) * 16, cy + (r() - 0.5) * 14, 1.2, 1.2);
  } else if (art === 'eisen') {
    hof('rgba(96,50,30,0.5)', 12);                            // Rost-Hof
    for (let i = 0; i < 4; i++) {
      const bx = cx + (r() - 0.5) * 12, by = cy + (r() - 0.5) * 11;
      brocken(bx, by, 3 + r() * 2.4, i % 2 ? '#5e2c1c' : '#6e3a24');
      ctx.fillStyle = '#9a9aa4';                              // Stahlglanz-Facette
      ctx.fillRect(bx - 1.2, by - 1.4, 2, 1.2);
    }
    ctx.fillStyle = 'rgba(160,90,48,0.6)';                    // Rost-Läufer nach unten
    ctx.fillRect(cx - 1, cy + 6, 2, 5 + r() * 4);
  } else {
    hof('rgba(46,110,78,0.5)', 12);                           // Malachit-Kruste
    hof('rgba(63,143,95,0.45)', 8);
    for (let i = 0; i < 4; i++) {
      const bx = cx + (r() - 0.5) * 11, by = cy + (r() - 0.5) * 10;
      brocken(bx, by, 2.6 + r() * 2.2, i % 2 ? '#a87c2e' : '#b8933a'); // Kupferkies messing
      ctx.fillStyle = '#d8b24a';
      ctx.fillRect(bx - 1.4, by - 1.4, 2, 1.2);
    }
    if (r() < 0.5) { ctx.fillStyle = '#3a5a9a'; ctx.fillRect(cx + (r() - 0.5) * 12, cy + (r() - 0.5) * 10, 2, 1.6); } // Azurit
  }
}

// Transparentes Vorkommen-OBJEKT (fuer die Live-Mine in der WorldScene: liegt
// als abbaubares Objekt AUF der nahtlosen Stollenwand; die Abbau-Stufen
// rissig/Geroell uebernimmt die bestehende 7DtD-Optik).
export function vorkommenTextur(
  scene: { textures: { exists: (k: string) => boolean; addCanvas: (k: string, c: HTMLCanvasElement) => void } },
  erz: 'eisen' | 'kupfer' | 'gold', variant: number,
): string {
  const key = `hoehle_vorkommen_${erz}_${variant % 5}`;
  if (scene.textures.exists(key)) return key;
  const cv = document.createElement('canvas'); cv.width = TILE; cv.height = TILE;
  const ctx = cv.getContext('2d')!;
  zeichneVorkommen(ctx, 900 + (variant % 5) * 17, erz);
  scene.textures.addCanvas(key, cv);
  return key;
}

// --- Felsige Wand-Kanten (R127d, Autor: "Kanten der Vierecke abrunden /
// äussere Schicht uneben und felsig"). An jeder Wand-Boden-Grenze liegt ein
// gezackter Fels-Ueberlauf auf der Bodenkachel: dunkler Schattensaum mit
// unregelmaessigem Profil + halb eingegrabene Geroellbrocken. Das Profil ist
// eine Summe PERIODISCHER Sinuswellen ueber 256 px -> die 8 Schnitte laufen
// ueber Kachelgrenzen nahtlos durch und kacheln mit sich selbst.
export const KANTE_DICKE = 14;
export type KanteRichtung = 'oben' | 'unten' | 'links' | 'rechts';

function kantenProfil(seed: number): (i: number) => number {
  const r = prng(seed);
  const p1 = r() * 6.283, p2 = r() * 6.283, p3 = r() * 6.283;
  return (i: number) => {
    const t = (i / SW) * 6.283;
    const d = 5.5 + 2.4 * Math.sin(t * 3 + p1) + 1.7 * Math.sin(t * 7 + p2) + 1.2 * Math.sin(t * 13 + p3);
    return Math.max(2.5, Math.min(KANTE_DICKE - 3, d));
  };
}

function baueKanteSuper(richtung: KanteRichtung): HTMLCanvasElement {
  const seed = { oben: 71, unten: 73, links: 79, rechts: 83 }[richtung];
  const r = prng(seed + 500);
  const horizontal = richtung === 'oben' || richtung === 'unten';
  const cv = document.createElement('canvas');
  cv.width = horizontal ? SW : KANTE_DICKE;
  cv.height = horizontal ? KANTE_DICKE : SW;
  const ctx = cv.getContext('2d')!;
  const profil = kantenProfil(seed);
  // gezackter Fels-Schattensaum, per-Pixel-Spalten von der Wandseite her
  ctx.fillStyle = '#141110';
  for (let i = 0; i < SW; i++) {
    const d = profil(i) + (r() - 0.5) * 1.4;
    if (richtung === 'oben') ctx.fillRect(i, 0, 1, d);
    else if (richtung === 'unten') ctx.fillRect(i, KANTE_DICKE - d, 1, d);
    else if (richtung === 'links') ctx.fillRect(0, i, d, 1);
    else ctx.fillRect(KANTE_DICKE - d, i, d, 1);
  }
  // halb eingegrabene Geroellbrocken entlang des Profils (mit Umlauf laengs)
  for (let s = 0; s < SUPER * 5; s++) {
    const li = r() * SW;
    const tiefe = profil(li) - 0.5 + (r() - 0.5) * 2;
    const rad = 1.2 + r() * 2.2, quetsch = 0.6 + r() * 0.35, rot = r() * 3;
    const grau = 42 + r() * 30;
    ctx.fillStyle = `rgb(${(grau + 6) | 0},${grau | 0},${(grau - 5) | 0})`;
    for (const versatz of [-SW, 0, SW]) {
      const i = li + versatz;
      if (i < -6 || i > SW + 6) continue;
      const px = richtung === 'oben' || richtung === 'unten' ? i : (richtung === 'links' ? tiefe : KANTE_DICKE - tiefe);
      const py = richtung === 'oben' ? tiefe : richtung === 'unten' ? KANTE_DICKE - tiefe : i;
      ctx.beginPath(); ctx.ellipse(px, py, rad, rad * quetsch, rot, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.8; ctx.stroke();
    }
  }
  return cv;
}

const kanteCache = new Map<string, HTMLCanvasElement>();
// Kanten-Kachel fuer Weltposition: horizontal per tx%8, vertikal per ty%8.
export function hoehleKante(
  scene: { textures: { exists: (k: string) => boolean; addCanvas: (k: string, c: HTMLCanvasElement) => void } },
  richtung: KanteRichtung, pos: number,
): string {
  const s = ((pos % SUPER) + SUPER) % SUPER;
  const key = `hoehle_kante_${richtung}_${s}`;
  if (scene.textures.exists(key)) return key;
  let strip = kanteCache.get(richtung);
  if (!strip) { strip = baueKanteSuper(richtung); kanteCache.set(richtung, strip); }
  const horizontal = richtung === 'oben' || richtung === 'unten';
  const cv = document.createElement('canvas');
  cv.width = horizontal ? TILE : KANTE_DICKE;
  cv.height = horizontal ? KANTE_DICKE : TILE;
  const ctx = cv.getContext('2d')!;
  if (horizontal) ctx.drawImage(strip, s * TILE, 0, TILE, KANTE_DICKE, 0, 0, TILE, KANTE_DICKE);
  else ctx.drawImage(strip, 0, s * TILE, KANTE_DICKE, TILE, 0, 0, KANTE_DICKE, TILE);
  scene.textures.addCanvas(key, cv);
  return key;
}

// --- Supertextur-Cache (szenenunabhängig, einmal je Art gebacken) ------------
const superCache = new Map<string, HTMLCanvasElement>();
function superTextur(art: 'wand' | 'boden' | 'bohlen'): HTMLCanvasElement {
  let cv = superCache.get(art);
  if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = SW; cv.height = SW;
  const ctx = cv.getContext('2d')!;
  if (art === 'wand') baueWandSuper(ctx);
  else if (art === 'boden') baueBodenSuper(ctx);
  else baueBohlenSuper(ctx);
  superCache.set(art, cv);
  return cv;
}

// Kachel für Weltposition (tx, ty): Ausschnitt (tx%8, ty%8) der Supertextur;
// Erz = Wand-Ausschnitt + Ader-Band. Lazy in den Szenen-Cache gebacken.
export function hoehleTextur(
  scene: { textures: { exists: (k: string) => boolean; addCanvas: (k: string, c: HTMLCanvasElement) => void } },
  art: HoehleArt, tx: number, ty: number,
): string {
  const sx = ((tx % SUPER) + SUPER) % SUPER, sy = ((ty % SUPER) + SUPER) % SUPER;
  const key = `hoehle_${art}_${sx}_${sy}`;
  if (scene.textures.exists(key)) return key;
  const cv = document.createElement('canvas'); cv.width = TILE; cv.height = TILE;
  const ctx = cv.getContext('2d')!;
  const quelle: 'wand' | 'boden' | 'bohlen' = art === 'boden' ? 'boden' : art === 'bohlen' ? 'bohlen' : 'wand';
  ctx.drawImage(superTextur(quelle), sx * TILE, sy * TILE, TILE, TILE, 0, 0, TILE, TILE);
  if (art === 'erz_eisen') zeichneVorkommen(ctx, sx * 8 + sy, 'eisen');
  else if (art === 'erz_kupfer') zeichneVorkommen(ctx, sx * 8 + sy, 'kupfer');
  else if (art === 'erz_gold') zeichneVorkommen(ctx, sx * 8 + sy, 'gold');
  scene.textures.addCanvas(key, cv);
  return key;
}
