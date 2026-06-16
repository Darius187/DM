// Detaillierte Batch-2-Objekte (Runde 40, Autorwunsch "den Rest in 64px
// runterskaliert"): Altar, Zaun, Acker/Felder, Folterbank, liegendes Skelett,
// Felsbrocken, Wasser/Fluss. Jede Funktion zeichnet in eine 64x64-Zelle auf
// transparentem Grund; tileArt rechnet sie sauber auf die 32px-Kachel herunter.
// Düsterer 1635er Ton, gleiche Bildsprache wie die Breakables.

type Ctx = CanvasRenderingContext2D;

function ell(ctx: Ctx, x: number, y: number, rx: number, ry: number, c: string): void {
  ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}
function poly(ctx: Ctx, pts: number[][], c: string): void {
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fill();
}
function schatten(ctx: Ctx, x: number, rx: number, y = 52): void {
  ell(ctx, x, y, rx, rx * 0.28, 'rgba(0,0,0,0.30)');
}

// --- Felsbrocken (mehrflächiger Granitblock mit Moos und Rissen) ------------
export function fels64(ctx: Ctx): void {
  schatten(ctx, 32, 20, 50);
  // Grundblock aus mehreren Facetten
  poly(ctx, [[8, 44], [12, 22], [26, 12], [44, 14], [56, 30], [52, 46], [30, 50]], '#6b665d');
  poly(ctx, [[12, 22], [26, 12], [44, 14], [34, 30], [16, 32]], '#807a6f'); // Lichtfläche oben
  poly(ctx, [[34, 30], [44, 14], [56, 30], [52, 46], [40, 44]], '#565249'); // Schattenflanke rechts
  poly(ctx, [[8, 44], [12, 22], [16, 32], [22, 44]], '#4e4a42');             // Schattenflanke links
  // Risse
  ctx.strokeStyle = 'rgba(20,18,14,0.6)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(28, 14); ctx.lineTo(30, 28); ctx.lineTo(24, 42); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(44, 16); ctx.lineTo(40, 30); ctx.lineTo(46, 44); ctx.stroke();
  ctx.lineWidth = 1;
  // Moosflecken
  ctx.fillStyle = 'rgba(70,92,52,0.5)';
  for (const [mx, my, r] of [[18, 30, 4], [40, 38, 5], [30, 44, 3.5], [50, 34, 3]]) { ell(ctx, mx, my, r, r * 0.7, ctx.fillStyle as string); }
  ctx.fillStyle = 'rgba(96,120,68,0.4)'; ell(ctx, 40, 37, 2.6, 1.8, ctx.fillStyle as string);
  // Lichtkante oben
  ctx.fillStyle = 'rgba(230,224,200,0.18)'; poly(ctx, [[14, 24], [26, 13], [40, 15], [30, 19], [18, 27]], 'rgba(230,224,200,0.16)');
}

// --- Zaun (verwitterte Holzlatten mit Maserung und Nägeln) ------------------
export function zaun64(ctx: Ctx): void {
  schatten(ctx, 32, 26, 52);
  const pfosten = (px: number) => {
    poly(ctx, [[px, 14], [px + 9, 14], [px + 8, 50], [px + 1, 50]], '#5c4427'); // Pfosten
    ctx.fillStyle = 'rgba(255,236,196,0.12)'; ctx.fillRect(px + 1, 14, 2.5, 36); // Lichtkante
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(px + 6.5, 14, 2.5, 36);     // Schatten
    ctx.strokeStyle = 'rgba(40,28,16,0.5)'; ctx.lineWidth = 0.8;                  // Maserung
    for (const o of [3, 5]) { ctx.beginPath(); ctx.moveTo(px + o, 16); ctx.lineTo(px + o, 48); ctx.stroke(); }
    poly(ctx, [[px, 14], [px + 4.5, 9], [px + 9, 14]], '#3a2c16');                // Spitze
  };
  // Querriegel hinter den Pfosten
  for (const [ry, hh] of [[24, 7], [38, 7]] as Array<[number, number]>) {
    ctx.fillStyle = '#4e3a20'; ctx.fillRect(2, ry, 60, hh);
    ctx.fillStyle = 'rgba(255,236,196,0.10)'; ctx.fillRect(2, ry, 60, 1.8);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(2, ry + hh - 2, 60, 2);
  }
  pfosten(8); pfosten(46);
  // Nägel
  ctx.fillStyle = '#2a2620';
  for (const [nx, ny] of [[12, 27], [12, 41], [50, 27], [50, 41]]) { ctx.beginPath(); ctx.arc(nx, ny, 1.4, 0, 6.283); ctx.fill(); }
}

// --- Acker/Felder (gepflügte Furchen mit Schollen und Trieben) --------------
export function acker64(ctx: Ctx): void {
  ctx.fillStyle = '#3a2c1c'; ctx.fillRect(0, 0, 64, 64);
  // Furchen in leichter Schräge, Licht von oben links
  for (let i = 0; i < 7; i++) {
    const y = 3 + i * 9;
    ctx.fillStyle = '#2a2014'; ctx.fillRect(0, y, 64, 6);            // Furchengrund
    ctx.fillStyle = '#48372220'; ctx.fillRect(0, y - 2, 64, 3);
    ctx.fillStyle = 'rgba(110,86,54,0.55)'; ctx.fillRect(0, y + 5, 64, 2); // Kammkante hell
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(0, y, 64, 1.4);  // tiefer Schatten
  }
  // Erdschollen
  ctx.fillStyle = 'rgba(74,56,34,0.8)';
  for (let i = 0; i < 14; i++) {
    const sx = (i * 23 + 7) % 60 + 2, sy = (i * 17 + 5) % 58 + 3;
    ell(ctx, sx, sy, 2.4, 1.6, ctx.fillStyle as string);
  }
  // ein paar zarte grüne Triebe
  ctx.strokeStyle = 'rgba(96,124,64,0.7)'; ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const sx = (i * 41 + 14) % 58 + 3, sy = 6 + ((i * 9) % 5) + i * 9;
    ctx.beginPath(); ctx.moveTo(sx, sy + 4); ctx.lineTo(sx, sy); ctx.moveTo(sx, sy + 2); ctx.lineTo(sx + 2, sy - 1); ctx.stroke();
  }
}

// --- Folterbank / Streckbank (Holzrahmen mit Walzen, Seilen, Blut) ----------
export function folterbank64(ctx: Ctx): void {
  schatten(ctx, 32, 24, 52);
  // Rahmen
  ctx.fillStyle = '#241a0e'; ctx.fillRect(6, 16, 6, 34); ctx.fillRect(52, 16, 6, 34); // Beine/Wangen
  ctx.fillStyle = '#3a2c1a'; ctx.fillRect(8, 20, 48, 18);                              // Liegefläche
  ctx.fillStyle = 'rgba(255,236,196,0.10)'; ctx.fillRect(8, 20, 48, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(8, 34, 48, 4);
  // Längslatten
  ctx.strokeStyle = 'rgba(20,14,8,0.6)'; ctx.lineWidth = 1;
  for (const ly of [24, 28, 32]) { ctx.beginPath(); ctx.moveTo(10, ly); ctx.lineTo(54, ly); ctx.stroke(); }
  // Walzen mit Speichen an beiden Enden
  for (const wx of [12, 52]) {
    ctx.fillStyle = '#5a4026'; ctx.beginPath(); ctx.arc(wx, 18, 6.5, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#3a2814'; ctx.beginPath(); ctx.arc(wx, 18, 6.5, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = '#2a1c10'; ctx.lineWidth = 1.4;
    for (let a = 0; a < 4; a++) { const an = a * Math.PI / 4; ctx.beginPath(); ctx.moveTo(wx, 18); ctx.lineTo(wx + Math.cos(an) * 9, 18 + Math.sin(an) * 9); ctx.stroke(); }
    ctx.lineWidth = 1;
  }
  // gespannte Seile
  ctx.strokeStyle = '#b8a878'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(12, 22); ctx.lineTo(26, 26); ctx.moveTo(52, 22); ctx.lineTo(40, 30); ctx.stroke();
  ctx.lineWidth = 1;
  // Blutspuren
  ctx.fillStyle = 'rgba(110,16,16,0.6)';
  ell(ctx, 30, 30, 6, 3.5, ctx.fillStyle as string); ell(ctx, 40, 33, 3, 1.8, ctx.fillStyle as string);
  ctx.fillStyle = 'rgba(70,8,8,0.6)'; ell(ctx, 24, 36, 2.4, 1.4, ctx.fillStyle as string);
}

// --- Liegendes Skelett (Schädel, Brustkorb, Glieder am Boden) ---------------
export function skelett64(ctx: Ctx): void {
  ell(ctx, 32, 40, 22, 7, 'rgba(0,0,0,0.22)'); // breiter, flacher Bodenschatten
  const knochen = '#d8cfb4', dunkel = '#a89c80';
  ctx.lineCap = 'round';
  // Wirbelsäule
  ctx.strokeStyle = knochen; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(20, 34); ctx.lineTo(44, 30); ctx.stroke();
  // Brustkorb (Rippenbögen)
  ctx.strokeStyle = dunkel; ctx.lineWidth = 1.8;
  for (let i = 0; i < 5; i++) {
    const bx = 24 + i * 4;
    ctx.beginPath(); ctx.arc(bx, 33, 5, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  }
  // Arme
  ctx.strokeStyle = knochen; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(26, 33); ctx.lineTo(20, 44); ctx.lineTo(16, 50); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(40, 31); ctx.lineTo(46, 42); ctx.lineTo(50, 48); ctx.stroke();
  // Beine
  ctx.lineWidth = 2.8;
  ctx.beginPath(); ctx.moveTo(44, 30); ctx.lineTo(50, 22); ctx.lineTo(56, 16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(44, 31); ctx.lineTo(52, 30); ctx.lineTo(58, 26); ctx.stroke();
  ctx.lineCap = 'butt'; ctx.lineWidth = 1;
  // kleine Handknochen
  ctx.fillStyle = dunkel;
  for (const [hx, hy] of [[15, 51], [51, 49]]) { ell(ctx, hx, hy, 2.2, 2, ctx.fillStyle as string); }
  // Schädel (links, leicht zur Seite gekippt)
  ell(ctx, 16, 33, 8, 7.5, knochen);
  ell(ctx, 11, 36, 3.5, 3.2, dunkel);                 // Unterkiefer
  ctx.fillStyle = '#1a1410';
  ell(ctx, 14, 32, 2.2, 2.4, '#1a1410'); ell(ctx, 19, 32, 2.2, 2.4, '#1a1410'); // Augenhöhlen
  ctx.fillRect(15.5, 35, 1.6, 2.2);                   // Nase
  ctx.strokeStyle = '#9a8e70'; ctx.lineWidth = 0.8;   // Zähne
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(16 + i * 1.6, 37.5); ctx.lineTo(16 + i * 1.6, 39.5); ctx.stroke(); }
  ctx.lineWidth = 1;
}

// --- Altar (Opferstein mit Blutrinnen, Kerzen, Schädel) ---------------------
export function altar64(ctx: Ctx): void {
  schatten(ctx, 32, 24, 54);
  // Sockel + Deckplatte (leichte Perspektive)
  poly(ctx, [[14, 30], [50, 30], [54, 50], [10, 50]], '#39352d'); // Korpus
  poly(ctx, [[10, 50], [14, 30], [16, 32], [12, 50]], '#2c2922'); // Schattenkante links
  poly(ctx, [[8, 24], [56, 24], [50, 32], [14, 32]], '#54504456'); // -
  poly(ctx, [[8, 24], [56, 24], [50, 32], [14, 32]], '#565248');  // Deckplatte
  ctx.fillStyle = 'rgba(255,246,210,0.12)'; poly(ctx, [[8, 24], [56, 24], [52, 27], [12, 27]], 'rgba(255,246,210,0.12)'); // Lichtkante
  // Mauerfugen im Korpus
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
  for (const fy of [38, 45]) { ctx.beginPath(); ctx.moveTo(13, fy); ctx.lineTo(53, fy); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(32, 32); ctx.lineTo(32, 50); ctx.stroke();
  // Blutrinne mittig
  ctx.fillStyle = 'rgba(120,16,16,0.85)'; ctx.fillRect(28, 25, 8, 4); ctx.fillRect(30, 28, 4, 12);
  ctx.fillStyle = 'rgba(70,8,8,0.8)'; ctx.fillRect(30.5, 29, 1.4, 11);
  // Schädel auf der Platte
  ell(ctx, 32, 23, 4, 3.6, '#d8cfb4');
  ctx.fillStyle = '#1a1410'; ell(ctx, 30.4, 23, 1.1, 1.3, '#1a1410'); ell(ctx, 33.6, 23, 1.1, 1.3, '#1a1410');
  // zwei Kerzen mit Flämmchen
  for (const cxk of [12, 52]) {
    ctx.fillStyle = '#e8e0c8'; ctx.fillRect(cxk - 1.4, 16, 2.8, 9);
    ctx.fillStyle = '#fff8e0'; ctx.fillRect(cxk - 1.4, 16, 1, 9);
    ell(ctx, cxk, 12.5, 1.8, 3.4, '#f8d878');
    ell(ctx, cxk, 13.5, 0.9, 1.8, '#fff2c0');
  }
}

// --- Wasser/Fluss (eigene Simulation, animationsfähig) ----------------------
// phase 0..1 lässt die Strömung wandern; tileArt cached je Frame. Mehrere
// Wellenbänder unterschiedlicher Frequenz + Kaustik-Glanz + Schaum ergeben
// einen lebendigen, fließenden Eindruck statt nur ein paar Linien (Runde 40,
// Autorwunsch "eigene detaillierte Wasser-Simulation").
export function wasser64(ctx: Ctx, phase: number): void {
  const w = 64;
  // Tiefenverlauf: oben kühler Himmelreflex, unten dunkler Grund
  const grad = ctx.createLinearGradient(0, 0, 0, w);
  grad.addColorStop(0, '#1d3744'); grad.addColorStop(0.5, '#142a37'); grad.addColorStop(1, '#0d1b25');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, w);
  const tau = Math.PI * 2;
  // Wellenbänder (sinusförmige Helligkeitslinien, fließen nach unten)
  const band = (anz: number, amp: number, freq: number, speed: number, thick: number, col: string) => {
    ctx.strokeStyle = col; ctx.lineWidth = thick;
    for (let k = 0; k < anz; k++) {
      const baseY = ((k / anz + phase * speed) % 1) * w;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const y = baseY + Math.sin((x / w) * tau * freq + phase * tau * speed) * amp;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  };
  band(5, 2.6, 1.5, 1.0, 1.5, 'rgba(120,162,192,0.22)');  // große, langsame Wogen
  band(7, 1.2, 3.2, 1.7, 0.8, 'rgba(158,196,220,0.16)');  // feine, schnelle Kräuselung
  // dunkle Strömungsadern (geben Tiefe und Sog)
  ctx.strokeStyle = 'rgba(6,14,20,0.5)'; ctx.lineWidth = 2.4;
  for (let k = 0; k < 3; k++) {
    const baseY = ((k / 3 + phase * 0.7) % 1) * w;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 4) ctx.lineTo(x, baseY + Math.sin((x / w) * tau + phase * tau) * 3);
    ctx.stroke();
  }
  // Kaustik-Glanz: kurze helle Bögen, die mit der Strömung wandern
  ctx.strokeStyle = 'rgba(204,230,246,0.5)'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) {
    const cx = (i * 23 + 7) % (w - 8) + 4;
    const cy = ((i * 0.111 + phase * 1.2) % 1) * w;
    ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0.5, 2.4); ctx.stroke();
  }
  // Schaumtupfer
  ctx.fillStyle = 'rgba(222,240,250,0.42)';
  for (let i = 0; i < 6; i++) {
    const fx = (i * 37 + 11) % (w - 4) + 2;
    const fy = ((i * 0.27 + phase * 0.85) % 1) * w;
    ctx.fillRect(fx, fy, 2, 1);
  }
  ctx.lineWidth = 1;
}
