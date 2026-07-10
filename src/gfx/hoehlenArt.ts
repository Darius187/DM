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

// --- Erzader-Band über einem 32er-Ausschnitt ---------------------------------
// R127e, gegen die Realität geprüft (Recherche):
// GOLD kommt als GOLDQUARZGANG vor - der Gang ist zu 97-98% weiss-grauer QUARZ,
//   das Gold sitzt nur als kleine metallisch-gelbe Sprenkel darin.
// EISEN (Roteisenerz/Hämatit, das mittelalterliche Erz) = rotbraunes Band mit
//   Rost-Hof und stahlgrauen Metallglanz-Punkten.
// KUPFER (Kupferkies/Chalkopyrit) = messinggelbe Einsprengsel; oberflächennah
//   zu GRÜNEM Malachit (selten blauem Azurit) verwittert - "die grüne Farbe
//   zeigt das Kupfer an".
function zeichneErzBand(ctx: Ctx, sx: number, sy: number, art: 'eisen' | 'kupfer' | 'gold'): void {
  const r = prng(sx * 8 + sy + (art === 'gold' ? 401 : art === 'kupfer' ? 301 : 201));
  // Richtung wechselt im Schachbrett - benachbarte Erz-Kacheln wirken wie
  // EINE sich schlängelnde Ader. Mittellinie EINMAL würfeln, alle Striche
  // laufen auf demselben Pfad (sonst franst das Band aus).
  const senkrecht = (sx + sy) % 2 === 0;
  const pfad: Array<[number, number]> = [];
  let p = TILE / 2 + (r() - 0.5) * 6;
  for (let t = -2; t <= TILE + 2; t += 4) {
    p += (r() - 0.5) * 4;
    pfad.push(senkrecht ? [p, t] : [t, p]);
  }
  const strich = (breite: number, farbe: string): void => {
    ctx.strokeStyle = farbe; ctx.lineWidth = breite; ctx.lineCap = 'round';
    ctx.beginPath();
    pfad.forEach(([x, y], i) => { if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.stroke();
  };
  // Sprenkel entlang des Pfads (mit Quer-Streuung)
  const sprenkel = (anz: number, farbe: string, groesse: number, streu: number): void => {
    ctx.fillStyle = farbe;
    for (let i = 0; i < anz; i++) {
      const [px, py] = pfad[Math.floor(r() * pfad.length)];
      const qx = senkrecht ? (r() - 0.5) * streu : 0, qy = senkrecht ? 0 : (r() - 0.5) * streu;
      ctx.fillRect(px + qx, py + qy, groesse + r() * groesse, groesse + r() * 0.8 * groesse);
    }
  };
  if (art === 'gold') {
    strich(7, 'rgba(120,115,105,0.25)');       // Übergangs-Saum ins Gestein
    strich(5, 'rgba(205,200,190,0.92)');       // Quarzgang (weiss-grau)
    strich(2.6, 'rgba(230,226,216,0.95)');     // heller Quarz-Kern
    sprenkel(3, '#4a4a52', 1, 6);              // dunkle Sulfid-Einschlüsse
    sprenkel(4, '#dfb43a', 1, 5);              // Gold: KLEINE Flitter
    sprenkel(2, '#ffe27a', 1, 4);              // hellster Glanz
  } else if (art === 'eisen') {
    strich(8, 'rgba(96,50,30,0.30)');          // Oxidations-Hof (Rost)
    strich(4.5, '#5e2c1c');                    // Hämatit-Band rotbraun
    strich(2, '#7a4028');
    sprenkel(4, '#8a8a92', 1, 5);              // stahlgrauer Metallglanz
    sprenkel(3, '#a05a30', 1, 7);              // Rostflecken
  } else {
    strich(8, 'rgba(46,110,78,0.28)');         // Malachit-Hof (grüne Verwitterung)
    strich(4.5, 'rgba(52,124,88,0.6)');        // grüner Saum
    strich(2, '#2e6e4e');
    sprenkel(5, '#b08a3a', 1, 5);              // Kupferkies: messinggelb
    sprenkel(2, '#d8b24a', 1, 4);              // hellerer Messingglanz
    if (r() < 0.5) sprenkel(1, '#3a5a9a', 1.4, 6); // selten Azurit (blau)
  }
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
  if (art === 'erz_eisen') zeichneErzBand(ctx, sx, sy, 'eisen');
  else if (art === 'erz_kupfer') zeichneErzBand(ctx, sx, sy, 'kupfer');
  else if (art === 'erz_gold') zeichneErzBand(ctx, sx, sy, 'gold');
  scene.textures.addCanvas(key, cv);
  return key;
}
