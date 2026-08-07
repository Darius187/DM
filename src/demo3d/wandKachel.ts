// 2.5D-Wandkachel (Runde 60). Autorwunsch: der DUNKLE Ziegel-Look aus dem
// Screenshot, nur HÖHER - aber als sauberes Wand-BAND (Wandkachel als dunkler
// Ziegel + eine nach Süden in den Raum hängende Front), KEIN heller fetter Klotz
// und KEIN Ziegelfeld überall. Eine RAND-Wand = dunkles Ziegelband mit dünner
// Lichtkante oben. Aufrufer zeichnet NORD->SÜD (ty aufsteigend) VOR den Sprites
// -> südlichere Kappen decken die Fronten der nördlichen ab = durchgehende
// senkrechte Wände + verbundene Ecken, keine Löcher. Reines 2D-Canvas.

export interface Kanten { n: boolean; e: boolean; s: boolean; w: boolean; } // true = Wand-Nachbar (geschlossen)

// Dunkle Ziegelpalette (wie der gemochte Screenshot).
const KAPPE_TOP = '#4a4233', KAPPE_BOT = '#332c20';                 // Wand-Oberseite (Kachel)
const FRONT_TOP = '#3c3527', FRONT_MID = '#272219', FRONT_BOT = '#120f09'; // hängende Front
const MORTAR = '#0c0905', STEIN_HI = '#5a4f3b';

function fugen(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, kursH: number, fugeB: number, off: number): void {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  let row = 0;
  for (let cy = y; cy < y + h + kursH; cy += kursH, row++) {
    ctx.fillStyle = STEIN_HI; ctx.fillRect(x, cy + 0.5, w, 0.8);
    ctx.fillStyle = MORTAR; ctx.fillRect(x, cy + kursH - 1, w, 1.1);
    const versatz = ((row + off) % 2) * (fugeB / 2);
    for (let jx = x - versatz; jx < x + w; jx += fugeB) {
      ctx.fillStyle = MORTAR; ctx.fillRect(jx, cy, 1, kursH);
      ctx.fillStyle = STEIN_HI; ctx.fillRect(jx + 1, cy + 1, 0.6, kursH * 0.35);
    }
  }
  ctx.restore();
}

// (x,y) = linke obere Ecke der Wand-KACHEL; ts = Kachelgröße; faceH = wie weit die
// Front nach SÜDEN in den Raum hängt (= zusätzliche Höhe). Wandband = ts + faceH.
export function zeichneWandKachel(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, faceH: number, k: Kanten, v: number): void {
  const bot = y + ts;

  // --- hängende Front (die "Höhe" der Wand) nach Süden, nur wenn Boden im Süden ---
  if (!k.s) {
    const fg = ctx.createLinearGradient(0, bot, 0, bot + faceH);
    fg.addColorStop(0, FRONT_TOP); fg.addColorStop(0.55, FRONT_MID); fg.addColorStop(1, FRONT_BOT);
    ctx.fillStyle = fg; ctx.fillRect(x, bot, ts, faceH);
    fugen(ctx, x, bot, ts, faceH, Math.max(7, ts / 3), ts / 2, v + 1);
    if (!k.w) { ctx.fillStyle = 'rgba(210,198,166,0.07)'; ctx.fillRect(x, bot, 1.4, faceH); }
    if (!k.e) { ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(x + ts - 1.6, bot, 1.6, faceH); }
    const sg = ctx.createLinearGradient(0, bot + faceH, 0, bot + faceH + ts * 0.3);
    sg.addColorStop(0, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.fillRect(x - 1, bot + faceH, ts + 2, ts * 0.3);
  }

  // --- Wand-Oberseite (die Kachel selbst), dunkler Ziegel ---
  const cg = ctx.createLinearGradient(0, y, 0, bot);
  cg.addColorStop(0, KAPPE_TOP); cg.addColorStop(1, KAPPE_BOT);
  ctx.fillStyle = cg; ctx.fillRect(x, y, ts, ts);
  fugen(ctx, x, y, ts, ts, ts / 3, ts / 2, v);
  // dünne Lichtkante oben (Wand-Oberkante) - KEIN fetter heller Block
  ctx.fillStyle = 'rgba(210,198,166,0.12)'; ctx.fillRect(x, y + 0.5, ts, 1.3);
  if (!k.w) { ctx.fillStyle = 'rgba(210,198,166,0.06)'; ctx.fillRect(x, y, 1.4, ts); }
  if (!k.e) { ctx.fillStyle = 'rgba(0,0,0,0.34)'; ctx.fillRect(x + ts - 1.6, y, 1.6, ts); }
  // Kante Oberseite -> Front (Wand-Vorderkante): dunkle Linie + feiner Grat
  if (!k.s) {
    ctx.fillStyle = 'rgba(255,246,222,0.10)'; ctx.fillRect(x, bot - 2, ts, 1.2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, bot - 0.6, ts, 1.4);
  }
}
