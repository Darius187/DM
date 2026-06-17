// Detaillierte Batch-2-Objekte (Runde 40, Autorwunsch "den Rest in 64px
// runterskaliert"): Altar, Zaun, Acker/Felder, Folterbank, liegendes Skelett,
// Felsbrocken, Wasser/Fluss. Jede Funktion zeichnet in eine 64x64-Zelle auf
// transparentem Grund; tileArt rechnet sie sauber auf die 32px-Kachel herunter.
// Düsterer 1635er Ton, gleiche Bildsprache wie die Breakables.

type Ctx = CanvasRenderingContext2D;

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Schlucht-Tiefenbild (Runde 40, Autorwunsch "es soll aussehen, als hätte es
// Tiefe; vielleicht sieht man unten auch was"). EIN großes Bild über die ganze
// Schlucht statt sich wiederholender Kacheln: ein Trichter aus zurückweichenden
// Felswänden zieht zum Grund, der in der Akzentfarbe der Ebene glüht (Verlies
// kalt-blau, Glutkatakomben glühend orange). w/h in Pixeln, akzent als #rrggbb.
export function drawSchlucht(ctx: Ctx, w: number, h: number, akzent: string): void {
  const [ar, ag, ab] = hexRgb(akzent);
  ctx.clearRect(0, 0, w, h);
  // 1) Senkrechter Tiefenverlauf: oben gebrochener Felssaum (Lichtkante), dann
  //    rasch ins Schwarze, am GRUND (unteres Drittel) glüht die Tiefe.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgb(54,48,40)');     // ferner oberer Wandsaum, beleuchtet
  g.addColorStop(0.1, 'rgb(24,21,17)');
  g.addColorStop(0.42, '#040305');        // tiefste Finsternis
  g.addColorStop(0.7, '#060507');
  g.addColorStop(1, 'rgb(16,14,12)');     // nahe Lippe (unten)
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // 2) Seitenwände abdunkeln (Vignette links/rechts) - der Schacht ist eng
  const sg = ctx.createLinearGradient(0, 0, w, 0);
  sg.addColorStop(0, 'rgba(0,0,0,0.55)'); sg.addColorStop(0.18, 'rgba(0,0,0,0)');
  sg.addColorStop(0.82, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
  // 3) Gesteinsschichten an den oberen Wänden (waagerechte Kanten)
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
  for (let k = 1; k <= 5; k++) { const yy = (k / 12) * h; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy + (k % 2 ? 2 : -2)); ctx.stroke(); }
  // 4) Glühender Grund (das "man sieht unten was"): breites Leuchtband tief unten
  const gy = h * 0.82;
  const grad = ctx.createRadialGradient(w / 2, gy, 2, w / 2, gy, w * 0.62);
  grad.addColorStop(0, `rgba(${Math.min(255, ar + 40)},${Math.min(255, ag + 35)},${Math.min(255, ab + 35)},0.78)`);
  grad.addColorStop(0.45, `rgba(${ar},${ag},${ab},0.26)`);
  grad.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
  ctx.fillStyle = grad; ctx.fillRect(0, h * 0.45, w, h * 0.55);
  // 5) glühende Adern/Funken im Grund
  for (let i = 0; i < 22; i++) {
    const gx = (i * 73 % (w - 8)) + 4;
    const gyy = gy + (Math.sin(i * 1.7) * h * 0.12);
    const fade = 0.6 - Math.abs(gyy - gy) / (h * 0.3);
    if (fade <= 0) continue;
    ctx.fillStyle = `rgba(${Math.min(255, ar + 90)},${Math.min(255, ag + 80)},${Math.min(255, ab + 80)},${fade})`;
    ctx.fillRect(gx, gyy, 1.6, 1.6);
  }
  // 6) helle, gebrochene Boden-Lippe ringsum (wo der Boden abbricht)
  ctx.strokeStyle = 'rgba(132,120,98,0.75)'; ctx.lineWidth = 2.5;
  ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
  ctx.fillStyle = 'rgba(150,138,114,0.4)'; ctx.fillRect(0, 0, w, 2);   // oberer Saum am hellsten
  ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 2;
  ctx.strokeRect(4.5, 4.5, w - 9, h - 9);
}

function ell(ctx: Ctx, x: number, y: number, rx: number, ry: number, c: string): void {
  ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

// Leucht-Kristall (Runde 40, Schlucht-Set-Piece): ein Cluster spitzer Scherben,
// das in der Akzentfarbe der Ebene glüht. 48x48-Zelle, Fuß bei y44.
export function drawKristall(ctx: Ctx, akzent: string): void {
  const [r, g, b] = hexRgb(akzent);
  const cx = 24, fy = 44;
  ell(ctx, cx, fy + 2, 13, 4, 'rgba(0,0,0,0.3)');                 // Bodenschatten
  // weiches Glühen um den Cluster
  const glow = ctx.createRadialGradient(cx, 28, 2, cx, 28, 24);
  glow.addColorStop(0, `rgba(${r},${g},${b},0.5)`);
  glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 48, 48);
  const dunkel = `rgb(${Math.round(r * 0.35)},${Math.round(g * 0.35)},${Math.round(b * 0.4)})`;
  const hell = `rgb(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)})`;
  const kern = `rgb(${Math.min(255, r + 150)},${Math.min(255, g + 150)},${Math.min(255, b + 150)})`;
  // einzelne Scherbe: Spitze oben, Sockel am Fuß
  const shard = (bx: number, tipY: number, br: number) => {
    poly(ctx, [[bx, fy], [bx - br, fy - 6], [bx - br * 0.5, tipY + 4], [bx, tipY], [bx + br * 0.5, tipY + 4], [bx + br, fy - 6]], dunkel);
    poly(ctx, [[bx, fy], [bx - br * 0.5, fy - 7], [bx - br * 0.2, tipY + 3], [bx, tipY]], hell);   // beleuchtete Kante
    ctx.strokeStyle = kern; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, tipY + 2); ctx.lineTo(bx, fy - 4); ctx.stroke(); // glühender Kern
  };
  shard(cx - 8, 20, 5);
  shard(cx + 9, 16, 5.5);
  shard(cx, 8, 6.5);            // höchste Scherbe in der Mitte
  shard(cx + 3, 26, 4);
  // Funken am Kern
  ctx.fillStyle = kern;
  for (const [sx, sy] of [[cx, 12], [cx + 9, 20], [cx - 8, 24]]) ctx.fillRect(sx - 0.5, sy, 1.5, 1.5);
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

// --- Erzader (Runde 42: aufgewertet auf aktuelle Qualität) ------------------
// Ein dunkler Gesteinsbrocken im Krypta-Boden, durchzogen von glitzernden
// Gold- und Silberadern mit einzelnen Lichtfunken - statt des alten grauen
// Kreises mit drei Klötzchen.
export function erzader64(ctx: Ctx): void {
  schatten(ctx, 32, 20, 50);
  // Gesteinsblock mit Facetten (dunkler als oberirdischer Fels)
  poly(ctx, [[10, 42], [14, 24], [28, 14], [46, 16], [54, 32], [50, 46], [28, 50]], '#46423b');
  poly(ctx, [[14, 24], [28, 14], [46, 16], [36, 30], [18, 32]], '#565249'); // Lichtfläche oben
  poly(ctx, [[36, 30], [46, 16], [54, 32], [50, 46], [38, 44]], '#393530'); // Schattenflanke rechts
  poly(ctx, [[10, 42], [14, 24], [18, 32], [24, 44]], '#322f2a');           // Schattenflanke links
  // Risse, durch die das Erz tritt
  ctx.strokeStyle = 'rgba(16,14,10,0.6)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(26, 16); ctx.lineTo(30, 30); ctx.lineTo(24, 44); ctx.stroke();
  ctx.lineWidth = 1;
  // Goldader: ein geschwungener Strang aus Nuggets
  const gold: Array<[number, number, number]> = [[20, 34, 3.2], [26, 28, 2.4], [31, 23, 3.6], [37, 27, 2.6], [42, 33, 3.0], [34, 38, 2.2]];
  for (const [gx, gy, r] of gold) {
    ell(ctx, gx, gy, r, r * 0.82, '#9a7322');           // dunkler Saum
    ell(ctx, gx - 0.4, gy - 0.4, r * 0.7, r * 0.6, '#e0b84a'); // Goldkern
    ell(ctx, gx - r * 0.35, gy - r * 0.35, r * 0.3, r * 0.24, '#fff0c0'); // Lichtfunke
  }
  // Silberader: feinere helle Sprenkel quer dazu
  for (const [sx, sy, r] of [[44, 24, 2.0], [48, 30, 1.6], [22, 42, 1.8], [16, 30, 1.5]] as Array<[number, number, number]>) {
    ell(ctx, sx, sy, r, r * 0.8, '#7d828c');
    ell(ctx, sx - 0.3, sy - 0.3, r * 0.55, r * 0.5, '#d2d6de');
  }
  // Lichtkante oben am Block
  ctx.fillStyle = 'rgba(226,220,198,0.14)';
  poly(ctx, [[16, 26], [28, 15], [44, 17], [34, 21], [20, 29]], 'rgba(226,220,198,0.14)');
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

// Breite Streckbank über ZWEI Kacheln (Runde 50): in einem 64 breiten x 32
// hohen Entwurfsraum gezeichnet, den detailWide() je Hälfte (links/rechts)
// auf eine Kachel blittet. So wirkt die Bank wie EIN langes Folterbett.
export function folterbankWide(ctx: Ctx): void {
  ctx.clearRect(0, 0, 64, 32);
  ell(ctx, 32, 27, 30, 5, 'rgba(0,0,0,0.28)'); // Bodenschatten quer
  // Rahmen: Wangen außen, lange Liegefläche dazwischen
  ctx.fillStyle = '#241a0e'; ctx.fillRect(2, 8, 5, 22); ctx.fillRect(57, 8, 5, 22);
  ctx.fillStyle = '#3a2c1a'; ctx.fillRect(6, 11, 52, 12);          // Liegefläche
  ctx.fillStyle = 'rgba(255,236,196,0.10)'; ctx.fillRect(6, 11, 52, 2); // Lichtkante
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(6, 20, 52, 3);   // Schatten
  // Längslatten
  ctx.strokeStyle = 'rgba(20,14,8,0.6)'; ctx.lineWidth = 1;
  for (const ly of [14, 17, 20]) { ctx.beginPath(); ctx.moveTo(8, ly); ctx.lineTo(56, ly); ctx.stroke(); }
  // Walzen mit Speichen an beiden Enden
  for (const wx of [6, 58]) {
    ctx.fillStyle = '#5a4026'; ctx.beginPath(); ctx.arc(wx, 9, 5.5, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#3a2814'; ctx.beginPath(); ctx.arc(wx, 9, 5.5, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = '#2a1c10'; ctx.lineWidth = 1.2;
    for (let a = 0; a < 4; a++) { const an = a * Math.PI / 4; ctx.beginPath(); ctx.moveTo(wx, 9); ctx.lineTo(wx + Math.cos(an) * 7, 9 + Math.sin(an) * 7); ctx.stroke(); }
    ctx.lineWidth = 1;
  }
  // gespannte Seile zur Mitte
  ctx.strokeStyle = '#b8a878'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(8, 12); ctx.lineTo(28, 16); ctx.moveTo(56, 12); ctx.lineTo(38, 18); ctx.stroke();
  ctx.lineWidth = 1;
  // Blutspuren auf der Liegefläche
  ctx.fillStyle = 'rgba(110,16,16,0.6)';
  ell(ctx, 30, 17, 6, 3, 'rgba(110,16,16,0.6)'); ell(ctx, 40, 19, 3, 1.6, 'rgba(110,16,16,0.6)');
  ell(ctx, 22, 20, 2.4, 1.3, 'rgba(70,8,8,0.6)');
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
  const w = 64, tau = Math.PI * 2;
  // Runde 41 (Autorbug "hässliche Überläufe, Felder müssen zueinander passen"):
  // NAHTLOS kachelbares Wasser. FLACHER Grundton (kein gerichteter Verlauf, der
  // an den Kachelkanten eine Naht erzeugt), und alle Merkmale werden an den
  // Rändern UMLAUFEND (wrap) gezeichnet - so passt jede Kachel an jede andere.
  ctx.fillStyle = '#163039'; ctx.fillRect(0, 0, w, w);
  // Helfer: zeichnet einen Fleck und seine umlaufenden Kopien (Wrap an allen Kanten)
  const wrap = (zeichne: (ox: number, oy: number) => void) => {
    for (const ox of [-w, 0, w]) for (const oy of [-w, 0, w]) zeichne(ox, oy);
  };
  // dunkle Tiefen-Mottle (gleichmäßig gestreut, sanft pulsierend)
  for (let i = 0; i < 16; i++) {
    const a = i * 2.39996;
    const x = (((Math.sin(a * 7.1) * 0.5 + 0.5) * w + Math.sin(phase * tau + i) * 3) % w + w) % w;
    const y = (((Math.cos(a * 5.3) * 0.5 + 0.5) * w + Math.cos(phase * tau + i) * 3) % w + w) % w;
    const r = 5 + (i % 3) * 2;
    ctx.fillStyle = 'rgba(8,20,28,0.34)';
    wrap((ox, oy) => { ctx.beginPath(); ctx.ellipse(x + ox, y + oy, r, r * 0.74, a, 0, tau); ctx.fill(); });
  }
  // helle Kräusel-Bögen (driften), umlaufend
  ctx.lineWidth = 1.3; ctx.strokeStyle = 'rgba(150,192,216,0.30)';
  for (let i = 0; i < 13; i++) {
    const a = i * 2.39996;
    const x = (((Math.sin(a * 3.1) * 0.5 + 0.5) * w + Math.sin(phase * tau * 0.5 + i) * 4) % w + w) % w;
    const y = (((Math.cos(a * 2.7) * 0.5 + 0.5) * w + Math.cos(phase * tau * 0.5 + i * 1.3) * 4) % w + w) % w;
    const rot = a + phase * 0.6;
    wrap((ox, oy) => { ctx.beginPath(); ctx.arc(x + ox, y + oy, 3 + (i % 2), rot, rot + 2.1); ctx.stroke(); });
  }
  // feine Kaustik-Glanzpunkte, umlaufend
  ctx.fillStyle = 'rgba(210,234,248,0.5)';
  for (let i = 0; i < 11; i++) {
    const a = i * 1.111;
    const x = (((Math.sin(a * 9 + phase * tau * 0.4) * 0.5 + 0.5) * w) % w + w) % w;
    const y = (((Math.cos(a * 6 + phase * tau * 0.4) * 0.5 + 0.5) * w) % w + w) % w;
    wrap((ox, oy) => ctx.fillRect(x + ox, y + oy, 1.4, 1.4));
  }
  ctx.lineWidth = 1;
}
