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
// Farben: Eisen = rostiges Rotbraun, Kupfer = Malachitgrün mit Kupferglanz
// (so sah Kupfererz um 1300 aus), Gold = sattes Gelb mit hellen Funken.
function zeichneErzBand(ctx: Ctx, sx: number, sy: number, art: 'eisen' | 'kupfer' | 'gold'): void {
  const r = prng(sx * 8 + sy + (art === 'gold' ? 401 : art === 'kupfer' ? 301 : 201));
  const farben = {
    eisen: { band: '#6e3a24', hell: '#a05a30', funke: '#c88a54' },
    kupfer: { band: '#2e6e4e', hell: '#3fa06a', funke: '#e08a4a' },
    gold: { band: '#8a6a14', hell: '#c9a227', funke: '#ffe27a' },
  }[art];
  // Richtung wechselt im Schachbrett - benachbarte Erz-Kacheln wirken wie
  // EINE sich schlängelnde Ader.
  const senkrecht = (sx + sy) % 2 === 0;
  const bandLauf = (versatz: number, breite: number, farbe: string): void => {
    ctx.strokeStyle = farbe; ctx.lineWidth = breite; ctx.lineCap = 'round';
    ctx.beginPath();
    let p = versatz + (r() - 0.5) * 6;
    for (let t = -2; t <= TILE + 2; t += 5) {
      p += (r() - 0.5) * 5;
      const px = senkrecht ? p : t, py = senkrecht ? t : p;
      if (t === -2) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  };
  bandLauf(TILE / 2, 4.5, farben.band);                        // dunkler Kern
  bandLauf(TILE / 2, 2, farben.hell);                          // helle Mitte
  if (r() < 0.6) bandLauf(TILE / 2 + (r() < 0.5 ? -7 : 7), 1.6, farben.band); // Nebenader
  const funken = art === 'gold' ? 7 : 4;                       // Einschlüsse
  for (let i = 0; i < funken; i++) {
    const fx = senkrecht ? TILE / 2 + (r() - 0.5) * 10 : r() * TILE;
    const fy = senkrecht ? r() * TILE : TILE / 2 + (r() - 0.5) * 10;
    ctx.fillStyle = farben.funke;
    ctx.fillRect(fx, fy, 1 + r() * 1.4, 1 + r() * 1.2);
  }
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
