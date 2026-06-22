// 2.5D-Wandkachel (Runde 60, Autorwunsch "richtige Wände + Raumgefühl in UNSEREM
// 2D-Generator"): zeichnet EINE Wandkachel als erhabenen Steinblock - obere
// Mauerkrone (Kappe, hell) + hohe, DUNKLE Vorderfront nach Süden (über die
// Bodenkachel darunter) + scharfe Oberkante + Kontaktschatten. So entstehen aus
// den vorhandenen Wand-Kacheln des Generators durchgehende waagerechte UND
// senkrechte Wände mit sauberen 90°-Ecken - ganz in 2D-Canvas (Phaser-fähig).
// Licht von oben-links (NW). Portabel: malt nur in einen 2D-Kontext.

export interface Kanten { n: boolean; e: boolean; s: boolean; w: boolean; } // true = Wand-Nachbar (geschlossen)

// Steinpalette (Krypta). Kappe deutlich HELLER als die Front -> die Wand "steht".
const KAPPE = '#736b5e', KAPPE_FELS = '#4a463d', KAPPE_HI = '#8b8273', KAPPE_DK = '#4f493f', KAPPE_MORTAR = '#433d33';
const FRONT_TOP = '#544d42', FRONT_BOT = '#241f18', FRONT_MORTAR = '#16120c', FRONT_HI = '#6b6253';

// Quaderverband in ein Rechteck (kachelt nahtlos: Kurse/Fugen an lokalen Maßen)
function fugen(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, kursH: number, fugeB: number, mortar: string, steinHi: string, steinLo: string, off: number): void {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  let row = 0;
  for (let cy = y; cy < y + h + kursH; cy += kursH, row++) {
    ctx.fillStyle = steinHi; ctx.fillRect(x, cy + 0.5, w, 1);                 // Stein-Oberkante hell
    ctx.fillStyle = steinLo; ctx.fillRect(x, cy + kursH - 2, w, 1.4);          // Unterkante dunkel
    ctx.fillStyle = mortar; ctx.fillRect(x, cy + kursH - 1, w, 1);             // waagerechte Fuge
    const versatz = ((row + off) % 2) * (fugeB / 2);
    for (let jx = x - versatz; jx < x + w; jx += fugeB) {
      ctx.fillStyle = mortar; ctx.fillRect(jx, cy, 1.2, kursH);                // senkrechte Fuge
      ctx.fillStyle = steinHi; ctx.fillRect(jx + 1.2, cy + 1, 0.8, kursH * 0.45); // Lichtkante des Steins
    }
  }
  ctx.restore();
}

// Eine Wandkachel zeichnen. (x,y) = linke obere Ecke der Kappe; ts = Kachelgröße;
// faceH = Höhe der Vorderfront (ragt nach unten über die Südkachel).
export function zeichneWandKachel(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, faceH: number, k: Kanten, v: number): void {
  const imFels = k.n && k.e && k.s && k.w;                 // ringsum Wand = massiver Fels (nur Kappe)

  // --- Vorderfront ZUERST (sie liegt optisch unter der Kappe) ---
  if (!k.s) {
    const fy = y + ts;
    const g = ctx.createLinearGradient(0, fy, 0, fy + faceH);
    g.addColorStop(0, FRONT_TOP); g.addColorStop(0.55, '#3a342b'); g.addColorStop(1, FRONT_BOT);
    ctx.fillStyle = g; ctx.fillRect(x, fy, ts, faceH);
    fugen(ctx, x, fy, ts, faceH, Math.max(7, faceH / 2.4), ts / 2, FRONT_MORTAR, FRONT_HI, '#1c180f', v + 1);
    // seitliche Kanten der Front (Ecken ablesbar): West hell, Ost dunkel
    if (!k.w) { ctx.fillStyle = 'rgba(255,244,216,0.10)'; ctx.fillRect(x, fy, 2, faceH); }
    if (!k.e) { ctx.fillStyle = 'rgba(0,0,0,0.40)'; ctx.fillRect(x + ts - 2.5, fy, 2.5, faceH); }
    // Kontaktschatten auf dem Boden unter der Front
    const sg = ctx.createLinearGradient(0, fy + faceH, 0, fy + faceH + ts * 0.34);
    sg.addColorStop(0, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.fillRect(x - 1, fy + faceH, ts + 2, ts * 0.34);
  }

  // --- Mauerkrone (Kappe), HELL, deckt das obere Ende der Front ab ---
  ctx.fillStyle = imFels ? KAPPE_FELS : KAPPE;
  ctx.fillRect(x, y, ts, ts);
  fugen(ctx, x, y, ts, ts, ts / 3.2, ts / 2, KAPPE_MORTAR, KAPPE_HI, KAPPE_DK, v);
  // Kanten: Nord/West hell (Licht), Süd/Ost dunkel (Tiefe)
  if (!k.n) { ctx.fillStyle = KAPPE_HI; ctx.fillRect(x, y, ts, 2); }
  if (!k.w) { ctx.fillStyle = KAPPE_HI; ctx.fillRect(x, y, 2, ts); }
  if (!k.e) { ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.fillRect(x + ts - 2, y, 2, ts); }
  if (!k.s) {
    // scharfe, dunkle Wand-Oberkante (Kappe -> Front) + heller Lichtgrat darüber
    ctx.fillStyle = 'rgba(255,246,222,0.16)'; ctx.fillRect(x, y + ts - 4, ts, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x, y + ts - 2, ts, 2.5);
  }
}
