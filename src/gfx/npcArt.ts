// Detailliertere Dorf-Grafik (Runde 40, Autorwunsch: Taverne + NPC im Stil des
// Helden zeichnen). Erste Entwürfe - rein prozedural auf Canvas, damit sie wie
// die übrige Grafik tunbar bleiben. Düsterer 1635er Ton.

function poly(ctx: CanvasRenderingContext2D, pts: number[][], c: string): void {
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fill();
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, c: string): void {
  ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}
// Detailliertes Fachwerkhaus (Runde 40), füllt w×h px. Wände unten, Dach oben
// mit Überstand. variante 0-3 ändert Putz-/Dach-/Fensterfarben. Sauber, ohne
// weißen Rand (Autorbug: die PNG-Häuser waren schäbig + hatten weiße Ränder).
export function drawHaus(ctx: CanvasRenderingContext2D, w: number, h: number, variante: number): void {
  ctx.clearRect(0, 0, w, h);
  const putz = ['#b9a988', '#a89878', '#c2b08a', '#9a8e72'][variante % 4];
  const balken = ['#3a281a', '#33241a', '#42301e', '#2e2216'][variante % 4];
  const dach = ['#3a2e26', '#4a3a2e', '#322822', '#463026'][variante % 4];
  const wandTop = Math.round(h * 0.40);           // Oberkante der Wand (Dach darüber)
  const sockelTop = Math.round(h - (h - wandTop) * 0.26);
  const ueber = Math.round(w * 0.06);             // Dachüberstand
  // --- Wand ---
  ctx.fillStyle = putz; ctx.fillRect(0, wandTop, w, h - wandTop);
  // Steinsockel mit Mauerwerk
  ctx.fillStyle = '#4a443c'; ctx.fillRect(0, sockelTop, w, h - sockelTop);
  for (let y = sockelTop + 2; y < h; y += Math.max(4, h * 0.03)) {
    for (let x = 0; x < w; x += Math.max(8, w * 0.07)) {
      ctx.fillStyle = (Math.floor(x / 8) + Math.floor(y / 4)) % 2 ? '#423c34' : '#534b41';
      ctx.fillRect(x + ((Math.floor((y - sockelTop) / 4)) % 2) * (w * 0.035), y, w * 0.06, h * 0.022);
    }
  }
  // Fachwerk-Balken
  const bw = Math.max(2, Math.round(w * 0.035));
  ctx.fillStyle = balken;
  ctx.fillRect(0, wandTop, w, bw); ctx.fillRect(0, sockelTop - bw, w, bw);          // waagerecht
  const mid = (wandTop + sockelTop) / 2;
  ctx.fillRect(0, mid, w, bw * 0.8);
  const stiele = Math.max(2, Math.round(w / (w * 0.34)));
  for (let i = 0; i <= stiele; i++) { const x = Math.round((i / stiele) * (w - bw)); ctx.fillRect(x, wandTop, bw, sockelTop - wandTop); }
  // Andreaskreuze im oberen Feld
  for (let i = 0; i < stiele; i++) {
    const x0 = (i / stiele) * w + bw, x1 = ((i + 1) / stiele) * w - bw;
    if (i % 2 === 0) { poly(ctx, [[x0, wandTop + bw], [x1, mid - 1], [x1 - bw, mid - 1], [x0, wandTop + bw * 2]], balken); }
  }
  // Fenster (warm beleuchtet) in den Wandfeldern
  const fw = Math.min(w * 0.16, 26), fh = Math.min((sockelTop - mid) * 0.7, 22);
  for (let i = 0; i < stiele; i++) {
    if (i % 2 === 1) continue;
    const fx = (i + 0.5) / stiele * w - fw / 2, fy = mid + (sockelTop - mid - fh) / 2;
    ctx.fillStyle = '#2a1c10'; ctx.fillRect(fx - 2, fy - 2, fw + 4, fh + 4);
    ctx.fillStyle = ['#e8b65a', '#d89a3a', '#e0a848'][variante % 3]; ctx.fillRect(fx, fy, fw, fh);
    ctx.fillStyle = '#2a1c10'; ctx.fillRect(fx + fw / 2 - 0.8, fy, 1.6, fh); ctx.fillRect(fx, fy + fh / 2 - 0.8, fw, 1.6);
  }
  // Tür (mittig)
  const dw = Math.min(w * 0.2, 30), dh = (h - mid) * 0.62;
  const dx = w / 2 - dw / 2, dy = h - dh;
  ctx.fillStyle = '#2e2014'; ctx.fillRect(dx, dy, dw, dh);
  ctx.fillStyle = '#46301c'; ctx.fillRect(dx + 2, dy + 2, dw - 4, dh - 2);
  ctx.fillStyle = '#2e2014'; ctx.fillRect(dx + dw / 2 - 1, dy + 2, 2, dh - 2);
  ctx.fillStyle = '#caa24a'; ctx.beginPath(); ctx.arc(dx + dw * 0.78, dy + dh * 0.5, Math.max(1, w * 0.012), 0, 6.283); ctx.fill();
  // --- Dach (Steildach mit Schindeln + Überstand) ---
  const first = Math.round(w * (0.42 + (variante % 2) * 0.08));
  poly(ctx, [[-ueber, wandTop + 2], [first, Math.round(h * 0.04)], [w + ueber, wandTop + 2]], dach);
  const reihen = 6;
  for (let r = 0; r < reihen; r++) {
    const t0 = r / reihen, t1 = (r + 1) / reihen;
    const yb = wandTop + 2 - t0 * (wandTop - h * 0.04);
    const yt = wandTop + 2 - t1 * (wandTop - h * 0.04);
    ctx.fillStyle = r % 2 ? shadeHex(dach, -10) : shadeHex(dach, 8);
    poly(ctx, [[-ueber + t0 * (first + ueber), yb], [w + ueber - t0 * (w + ueber - first), yb], [w + ueber - t1 * (w + ueber - first), yt], [-ueber + t1 * (first + ueber), yt]], ctx.fillStyle as string);
  }
  // Firstbalken + Dachkante
  ctx.fillStyle = balken; ctx.fillRect(-ueber, wandTop, w + 2 * ueber, Math.max(2, h * 0.018));
  // Schornstein
  ctx.fillStyle = '#3a322a'; const cw = w * 0.08; ctx.fillRect(w * 0.7, h * 0.06, cw, wandTop - h * 0.06);
  ctx.fillStyle = '#2a241e'; ctx.fillRect(w * 0.7, h * 0.06, cw, h * 0.03);
}

// Hex aufhellen/abdunkeln (lokal, ohne fallbackArt-Import)
function shadeHex(hex: string, d: number): string {
  const n = parseInt(hex.slice(1), 16);
  const cl = (v: number) => Math.max(0, Math.min(255, v + d));
  const r = cl((n >> 16) & 255), g = cl((n >> 8) & 255), b = cl(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, c: string): void {
  ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

// --- NPC: Wirtin (64px-Zelle, Frontansicht) --------------------------------
export function drawWirtin(ctx: CanvasRenderingContext2D): void {
  const cx = 32;
  ell(ctx, cx, 58, 13, 3.2, 'rgba(0,0,0,0.32)');           // Bodenschatten
  poly(ctx, [[24, 38], [40, 38], [45, 56], [19, 56]], '#5a3a3a'); // Rock
  poly(ctx, [[32, 38], [40, 38], [45, 56], [32, 56]], '#492c2c');
  for (const fx of [26, 30, 34, 38]) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(fx, 40, 1, 15); }
  poly(ctx, [[27, 39], [37, 39], [39, 55], [25, 55]], '#cdbfa2'); // Schürze
  ctx.fillStyle = '#b6a888'; ctx.fillRect(30.5, 39, 3, 16);
  poly(ctx, [[25, 25], [39, 25], [37, 39], [27, 39]], '#3a2a30'); // Mieder
  poly(ctx, [[32, 25], [39, 25], [37, 39], [32, 39]], '#2c1f24');
  rr(ctx, 28, 28, 8, 9, 1.5, '#7a5a4a');                      // Bluse im Ausschnitt
  ctx.fillStyle = '#5a3a3a'; ctx.fillRect(31.5, 25, 1, 12);
  for (let i = 0; i < 4; i++) { ctx.fillStyle = '#caa24a'; ctx.fillRect(30, 28 + i * 2.4, 4, 0.8); } // Schnürung
  for (const side of [-1, 1] as const) {
    const sx = cx + side * 8;
    rr(ctx, sx - 2.3, 27, 4.6, 8, 2, '#3a2a30');             // Ärmel
    rr(ctx, sx - 2.1, 34, 4.2, 4, 1.6, '#7a5a4a');           // gekrempelt
    ell(ctx, sx, 39, 2.2, 2.2, '#d0a884');                   // Hand
  }
  // Kopf SITZT direkt auf den Schultern - KEIN Hals (Autorwunsch R40)
  const hy = 20;
  ell(ctx, cx, hy, 6, 6.4, '#d0a884');                        // Kopf
  ell(ctx, cx - 1.6, hy - 1.4, 2, 2.4, '#e0bb96');
  poly(ctx, [[cx - 6, hy - 1], [cx + 6, hy - 1], [cx + 5, hy - 6], [cx - 5, hy - 6]], '#4a3526'); // Haar
  ell(ctx, cx, hy - 6.5, 3, 2.6, '#4a3526');                  // Dutt
  ctx.fillStyle = '#3a281c'; ctx.fillRect(cx - 6, hy - 1, 12, 1.4);
  ell(ctx, cx - 2, hy + 0.5, 0.9, 1.2, '#241813'); ell(ctx, cx + 2, hy + 0.5, 0.9, 1.2, '#241813'); // Augen
  ctx.fillStyle = 'rgba(150,70,60,0.4)'; ctx.fillRect(cx - 3, hy + 2, 1.6, 1); ctx.fillRect(cx + 1.4, hy + 2, 1.6, 1);
  ctx.fillStyle = '#9a5a4a'; ctx.fillRect(cx - 1.2, hy + 3.2, 2.4, 0.9); // Mund
  rr(ctx, cx + 9, 36, 4, 5, 1, '#6a6a72');                    // Krug
  ctx.fillStyle = '#8a8a92'; ctx.fillRect(cx + 9, 36, 4, 1.2);
  ctx.fillStyle = '#52525a'; ctx.fillRect(cx + 12.5, 37, 1.4, 3);
}

// Registry detaillierter NPC-Figuren (Runde 40): Figurname -> Zeichenfunktion
// in eine 64px-Zelle (Frontansicht). Der SpriteProvider rechnet sie auf die
// 32px-Figurzelle herunter, damit sie sich nahtlos zwischen die übrigen
// Bewohner einfügen (gleiche Größe, gleiche Y-Sortierung).
export const DETAIL_NPCS: Record<string, (ctx: CanvasRenderingContext2D) => void> = {
  wirtin: drawWirtin,
};

// --- Gebäude: Taverne "Zum Schwarzen Raben" (128x128) ----------------------
export function drawTaverne(ctx: CanvasRenderingContext2D): void {
  // Steinsockel mit Mauerwerk
  rr(ctx, 14, 78, 100, 38, 1, '#4a443c');
  for (let y = 80; y < 114; y += 6) for (let x = 16; x < 112; x += 12) {
    ctx.fillStyle = (Math.floor(x / 12) + Math.floor(y / 6)) % 2 ? '#423c34' : '#524a40';
    ctx.fillRect(x + ((Math.floor(y / 6)) % 2) * 6, y, 11, 5);
  }
  // Fachwerk-Obergeschoss: Putz + dunkle Balken
  rr(ctx, 18, 40, 92, 40, 1, '#b9a988');
  ctx.fillStyle = '#3a281a';
  for (const x of [22, 50, 78, 104]) ctx.fillRect(x, 40, 4, 40);
  ctx.fillRect(18, 40, 92, 4); ctx.fillRect(18, 58, 92, 3); ctx.fillRect(18, 76, 92, 4);
  poly(ctx, [[26, 44], [46, 57], [42, 57], [26, 47]], '#3a281a'); // Andreaskreuz-Streben
  poly(ctx, [[46, 44], [26, 57], [30, 57], [46, 47]], '#3a281a');
  // Fenster mit warmem Licht + Sprossen
  for (const wx of [30, 86]) {
    rr(ctx, wx, 46, 14, 12, 1, '#2a1c10');
    rr(ctx, wx + 1.5, 47.5, 11, 9, 1, '#e8b65a');
    ctx.fillStyle = '#2a1c10'; ctx.fillRect(wx + 6.5, 47.5, 1.4, 9); ctx.fillRect(wx + 1.5, 51.5, 11, 1.2);
  }
  // Tür
  rr(ctx, 56, 84, 16, 30, 1.5, '#2e2014');
  rr(ctx, 57.5, 85.5, 13, 28, 1, '#46301c');
  ctx.fillStyle = '#2e2014'; ctx.fillRect(63.5, 86, 1.2, 27);
  ctx.fillStyle = '#caa24a'; ctx.beginPath(); ctx.arc(60, 100, 1, 0, 6.283); ctx.fill(); // Türgriff
  // Steildach mit Schindeln + Firstbalken
  poly(ctx, [[10, 42], [64, 12], [118, 42]], '#3a2e26');
  for (let r = 0; r < 5; r++) {
    const yy = 40 - r * 5;
    ctx.fillStyle = r % 2 ? '#322620' : '#3e302a';
    poly(ctx, [[12 + r * 9, yy], [116 - r * 9, yy], [112 - r * 9, yy - 4], [16 + r * 9, yy - 4]], ctx.fillStyle as string);
  }
  ctx.fillStyle = '#241a14'; poly(ctx, [[10, 42], [64, 12], [66, 14], [14, 43]], '#241a14'); // Dachkante links
  // Schornstein mit Rauch
  rr(ctx, 94, 16, 9, 16, 0.5, '#3a322a'); ctx.fillStyle = '#2a241e'; ctx.fillRect(94, 16, 9, 3);
  // Hängeschild "Zum Schwarzen Raben" (Rabe)
  ctx.strokeStyle = '#2a1c10'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(20, 60); ctx.lineTo(20, 74); ctx.stroke();
  rr(ctx, 8, 74, 24, 16, 1.5, '#2e2014');
  rr(ctx, 9.5, 75.5, 21, 13, 1, '#caa24a');
  // Rabe als Silhouette
  ctx.fillStyle = '#161210';
  ell(ctx, 19, 83, 4.5, 3, '#161210');                        // Körper
  ell(ctx, 23, 80, 2.4, 2, '#161210');                        // Kopf
  poly(ctx, [[24.5, 79.5], [28, 79], [24.5, 81]], '#161210'); // Schnabel
  poly(ctx, [[14, 83], [10, 86], [16, 85]], '#161210');       // Flügel/Schweif
  ctx.lineWidth = 1;
}
