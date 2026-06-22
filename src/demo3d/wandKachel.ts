// 2.5D-Wandkachel (Runde 60). Autorwunsch-Feinschliff: die Wände DÜNNER (Kappe
// nur ~1 Ziegel dick statt volle Kachel) und DUNKLER, damit sie im Raycaster-
// Schatten wie ein echter Dungeon wirken. Eine RAND-Wand = schmale, dunkle
// Steinmauer mit dünner Mauerkrone oben + kurzer Front nach Süden + Kanten je
// offenem Nachbarn. Tiefer Fels wird vom Aufrufer NICHT gezeichnet (bleibt
// schwarz). Reines 2D-Canvas (Phaser-fähig), Licht von oben-links (NW).

export interface Kanten { n: boolean; e: boolean; s: boolean; w: boolean; } // true = Wand-Nachbar (geschlossen)

// Dunkle Dungeon-Steinpalette. Kappe nur leicht heller als die Front.
const KAPPE = '#403a32', KAPPE_HI = '#544c40', KAPPE_MORTAR = '#0e0c08';
const FRONT_TOP = '#322d26', FRONT_MID = '#211d17', FRONT_BOT = '#100d09', FRONT_MORTAR = '#090705', FRONT_HI = '#4a4338';

function fugen(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, kursH: number, fugeB: number, mortar: string, steinHi: string, steinLo: string, off: number): void {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  let row = 0;
  for (let cy = y; cy < y + h + kursH; cy += kursH, row++) {
    ctx.fillStyle = steinHi; ctx.fillRect(x, cy + 0.5, w, 0.8);
    ctx.fillStyle = steinLo; ctx.fillRect(x, cy + kursH - 1.6, w, 1);
    ctx.fillStyle = mortar; ctx.fillRect(x, cy + kursH - 1, w, 1);
    const versatz = ((row + off) % 2) * (fugeB / 2);
    for (let jx = x - versatz; jx < x + w; jx += fugeB) {
      ctx.fillStyle = mortar; ctx.fillRect(jx, cy, 1, kursH);
      ctx.fillStyle = steinHi; ctx.fillRect(jx + 1, cy + 1, 0.7, kursH * 0.4);
    }
  }
  ctx.restore();
}

// (x,y) = linke obere Ecke der Wand-KACHEL; ts = Kachelgröße; faceH = Überhang der
// Front nach Süden über die Bodenkachel (kurz - die Wand ist dünn).
export function zeichneWandKachel(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, faceH: number, k: Kanten, v: number): void {
  const capH = Math.max(5, ts * 0.34);                 // Mauerkrone nur ~1 Ziegel dick
  const bodyTop = y + capH;
  const bodyBot = k.s ? y + ts : y + ts + faceH;        // Überhang nur, wenn Boden im Süden

  // --- Front (dunkler Stein) ---
  const g = ctx.createLinearGradient(0, bodyTop, 0, bodyBot);
  g.addColorStop(0, FRONT_TOP); g.addColorStop(0.6, FRONT_MID); g.addColorStop(1, FRONT_BOT);
  ctx.fillStyle = g; ctx.fillRect(x, bodyTop, ts, bodyBot - bodyTop);
  fugen(ctx, x, bodyTop, ts, bodyBot - bodyTop, Math.max(6, ts / 3.6), ts / 2, FRONT_MORTAR, FRONT_HI, '#0d0b07', v + 1);

  // --- dünne Mauerkrone (Kappe) oben ---
  ctx.fillStyle = KAPPE; ctx.fillRect(x, y, ts, capH);
  fugen(ctx, x, y, ts, capH, capH, ts / 2, KAPPE_MORTAR, KAPPE_HI, '#1a160f', v);
  ctx.fillStyle = 'rgba(255,240,214,0.10)'; ctx.fillRect(x, y, ts, 1.2);        // Lichtgrat oben
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y + capH - 1, ts, 1.6);    // Kante Kappe/Front

  // --- Seiten-/Eckkanten ---
  if (!k.w) { ctx.fillStyle = 'rgba(255,240,214,0.07)'; ctx.fillRect(x, y, 1.4, bodyBot - y); }
  if (!k.e) { ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(x + ts - 1.8, y, 1.8, bodyBot - y); }

  // --- Kontaktschatten auf dem Boden ---
  if (!k.s) {
    const sg = ctx.createLinearGradient(0, bodyBot, 0, bodyBot + ts * 0.28);
    sg.addColorStop(0, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.fillRect(x - 1, bodyBot, ts + 2, ts * 0.28);
  }
}
