// HÖHLEN-OPTIK für die V4-Mine (R126, Autorwunsch + Referenzfotos Stollen):
// prozedurale 32x32-Texturen - geröllige Stollenwände, erdiger Höhlenboden,
// Erzadern (Eisen/Kupfer/Gold) die wie eine Goldader IM Gestein liegen, und
// Holzbohlen für die Insel-Räume (Stollen-Kammern). Lazy in den Szenen-Cache
// gebacken wie bodenStile.ts. Farbwelt an den Fotos orientiert: braun-graues
// Gestein, warme Lichtinseln kommen aus der Beleuchtung, nicht aus der Textur.

const TILE = 32;
type Ctx = CanvasRenderingContext2D;

export type HoehleArt = 'boden' | 'wand' | 'erz_eisen' | 'erz_kupfer' | 'erz_gold' | 'bohlen';

// deterministischer Zufall je Variante (stabil, kein Math.random im Bake)
function prng(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

// --- Stollenwand: unregelmäßige Gesteinsbrocken (Geröll unter Tage) ----------
function zeichneWand(ctx: Ctx, n: number): void {
  const r = prng(n + 31);
  ctx.fillStyle = '#171310';                                  // tiefe Fugen
  ctx.fillRect(0, 0, TILE, TILE);
  // 7-9 eckige Brocken, jeder ein unregelmäßiges Viereck mit eigener Tönung
  const anz = 7 + Math.floor(r() * 3);
  for (let i = 0; i < anz; i++) {
    const cx = r() * TILE, cy = r() * TILE, rad = 5 + r() * 7;
    const grau = 40 + r() * 34, warm = r() * 14;              // braun-graues Gestein
    ctx.fillStyle = `rgb(${Math.round(grau + warm)},${Math.round(grau + warm * 0.55)},${Math.round(grau)})`;
    ctx.beginPath();
    const ecken = 5 + Math.floor(r() * 2);
    for (let e = 0; e < ecken; e++) {
      const a = (e / ecken) * 6.283 + r() * 0.5;
      const rr = rad * (0.6 + r() * 0.5);
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
      if (e === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    // Kante: oben-links Licht, unten-rechts Schatten (plastische Brocken)
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,235,200,0.06)';
    ctx.fillRect(cx - rad * 0.5, cy - rad * 0.5, rad * 0.8, 2);
  }
  // feiner Staub/Risse
  for (let i = 0; i < 14; i++) { ctx.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.2})`; ctx.fillRect(r() * TILE, r() * TILE, 1, 1); }
}

// --- Höhlenboden: festgetretene Erde mit Geröll und Kieseln -------------------
function zeichneBoden(ctx: Ctx, n: number): void {
  const r = prng(n + 7);
  // heller als die Wände, damit der begehbare Stollen im Lampenlicht klar
  // lesbar ist (Referenzfotos: festgetretener, warm beleuchteter Grund)
  const g = 62 + (n % 7) * 2;
  ctx.fillStyle = `rgb(${g + 14},${g + 2},${g - 12})`;        // erdiges Warmbraun
  ctx.fillRect(0, 0, TILE, TILE);
  // unregelmäßige dunklere/hellere Flecken (festgetretener Grund)
  for (let i = 0; i < 5; i++) {
    const d = (r() - 0.5) * 0.16;
    ctx.fillStyle = d > 0 ? `rgba(220,200,170,${d})` : `rgba(0,0,0,${-d})`;
    ctx.beginPath(); ctx.ellipse(r() * TILE, r() * TILE, 4 + r() * 7, 3 + r() * 5, r() * 3, 0, 6.283); ctx.fill();
  }
  // Kiesel + kleine Brocken (Geröll)
  for (let i = 0; i < 9; i++) {
    const c = 52 + r() * 40;
    ctx.fillStyle = `rgb(${c + 6},${c},${c - 8})`;
    ctx.beginPath(); ctx.ellipse(r() * TILE, r() * TILE, 0.8 + r() * 1.8, 0.7 + r() * 1.4, r() * 3, 0, 6.283); ctx.fill();
    if (r() < 0.4) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(r() * TILE, r() * TILE, 1, 1); }
  }
  // Staubkörner
  for (let i = 0; i < 16; i++) { ctx.fillStyle = `rgba(0,0,0,${0.06 + r() * 0.1})`; ctx.fillRect(r() * TILE, r() * TILE, 1, 1); }
}

// --- Erzader: Stollenwand + geschlängeltes Erzband mit Glanzpunkten -----------
// Farben: Eisen = rostiges Rotbraun, Kupfer = Malachitgrün mit Kupferglanz
// (so sah Kupfererz um 1300 aus), Gold = sattes Gelb mit hellen Funken.
function zeichneErz(ctx: Ctx, n: number, art: 'eisen' | 'kupfer' | 'gold'): void {
  zeichneWand(ctx, n + 101);
  const r = prng(n + (art === 'gold' ? 401 : art === 'kupfer' ? 301 : 201));
  const farben = {
    eisen: { band: '#6e3a24', hell: '#a05a30', funke: '#c88a54' },
    kupfer: { band: '#2e6e4e', hell: '#3fa06a', funke: '#e08a4a' },
    gold: { band: '#8a6a14', hell: '#c9a227', funke: '#ffe27a' },
  }[art];
  // Ader = 2 parallele, geschlängelte Bänder quer über die Kachel (Richtung je
  // Variante gedreht, damit benachbarte Kacheln zusammen wie EINE Ader wirken)
  const senkrecht = n % 2 === 0;
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
  // Funken/Einschlüsse (bei Gold deutlich mehr Glanz)
  const funken = art === 'gold' ? 7 : 4;
  for (let i = 0; i < funken; i++) {
    const fx = senkrecht ? TILE / 2 + (r() - 0.5) * 10 : r() * TILE;
    const fy = senkrecht ? r() * TILE : TILE / 2 + (r() - 0.5) * 10;
    ctx.fillStyle = farben.funke;
    ctx.fillRect(fx, fy, 1 + r() * 1.4, 1 + r() * 1.2);
  }
}

// --- Holzbohlen für die Stollen-Kammern (Insel-Räume) -------------------------
function zeichneBohlen(ctx: Ctx, n: number): void {
  const r = prng(n + 57);
  ctx.fillStyle = '#241609';
  ctx.fillRect(0, 0, TILE, TILE);
  const breite = 8;
  for (let x = 0; x < TILE; x += breite) {
    const c = 92 + r() * 28;
    ctx.fillStyle = `rgb(${c},${Math.round(c * 0.62)},${Math.round(c * 0.34)})`;
    ctx.fillRect(x + 1, 0, breite - 2, TILE);
    // Maserung
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      let px = x + 2 + r() * (breite - 4);
      ctx.moveTo(px, 0);
      for (let y = 5; y <= TILE; y += 6) { px += (r() - 0.5) * 2; ctx.lineTo(px, y); }
      ctx.stroke();
    }
    // Stoßfuge quer (versetzte Bohlen-Enden)
    const fy = Math.floor(r() * 4) * 8 + 4;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x + 1, fy, breite - 2, 1);
  }
}

// Lazy-Bake: eine Textur je (Art, Variante 0..6) in den Szenen-Cache.
export function hoehleTextur(
  scene: { textures: { exists: (k: string) => boolean; addCanvas: (k: string, c: HTMLCanvasElement) => void } },
  art: HoehleArt, variant: number,
): string {
  const key = `hoehle_${art}_${variant}`;
  if (scene.textures.exists(key)) return key;
  const cv = document.createElement('canvas'); cv.width = TILE; cv.height = TILE;
  const ctx = cv.getContext('2d')!;
  if (art === 'wand') zeichneWand(ctx, variant);
  else if (art === 'boden') zeichneBoden(ctx, variant);
  else if (art === 'bohlen') zeichneBohlen(ctx, variant);
  else zeichneErz(ctx, variant, art === 'erz_gold' ? 'gold' : art === 'erz_kupfer' ? 'kupfer' : 'eisen');
  scene.textures.addCanvas(key, cv);
  return key;
}
