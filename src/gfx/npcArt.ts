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
