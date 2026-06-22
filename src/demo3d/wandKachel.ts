// 2.5D-Wandkachel (Runde 60). Autorwunsch: die Wände müssen den Raum WIRKLICH
// ABSCHLIESSEN - waagerecht UND senkrecht sichtbar, Ecken durchgehend verbunden,
// keine Löcher, und ~doppelt so hoch. Modell: jede Wandkachel ist ein ERHABENER
// BLOCK - die Mauerkrone (Kappe) ist um H nach oben gezogen, darunter die
// Vorderfront bis zum Boden. Nach Norden gezogene Kappen decken die Fronten der
// dahinterliegenden Wände ab -> senkrechte Wände werden zu einem durchgehenden
// erhabenen Streifen (kein Stufen-Effekt). Reines 2D-Canvas (Phaser-fähig).
// Aufrufer zeichnet die Wände von NORD nach SÜD (ty aufsteigend), VOR den Sprites.

export interface Kanten { n: boolean; e: boolean; s: boolean; w: boolean; } // true = Wand-Nachbar (geschlossen)

// Sichtbarer Dungeon-Stein: Kappe mittelgrau (klar erkennbar), Front dunkler.
const CAP = '#574f43', CAP_HI = '#736959', CAP_DK = '#393428', CAP_MORTAR = '#28231b';
const FRONT_TOP = '#3a342b', FRONT_BOT = '#171309', FRONT_MORTAR = '#0c0905', FRONT_HI = '#4c4538';

function fugen(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, kursH: number, fugeB: number, mortar: string, hi: string, lo: string, off: number): void {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  let row = 0;
  for (let cy = y; cy < y + h + kursH; cy += kursH, row++) {
    ctx.fillStyle = hi; ctx.fillRect(x, cy + 0.5, w, 1);
    ctx.fillStyle = lo; ctx.fillRect(x, cy + kursH - 1.6, w, 1);
    ctx.fillStyle = mortar; ctx.fillRect(x, cy + kursH - 1, w, 1);
    const versatz = ((row + off) % 2) * (fugeB / 2);
    for (let jx = x - versatz; jx < x + w; jx += fugeB) {
      ctx.fillStyle = mortar; ctx.fillRect(jx, cy, 1.1, kursH);
      ctx.fillStyle = hi; ctx.fillRect(jx + 1.1, cy + 1, 0.7, kursH * 0.4);
    }
  }
  ctx.restore();
}

// (x,y) = linke obere Ecke der Wand-KACHEL (Boden-Footprint); ts = Kachelgröße;
// H = Wandhöhe in Pixeln (Kappe wird um H nach oben gezogen). Die Front reicht
// von der Kappenunterkante bis zum Boden (y+ts).
export function zeichneWandKachel(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, H: number, k: Kanten, v: number): void {
  const faceTop = y + ts - H;     // Oberkante der Front = Unterkante der erhabenen Kappe
  const faceBot = y + ts;         // Boden-Kontakt (Südkante des Footprints)

  // --- Vorderfront (die "Höhe" der Wand) ---
  const fg = ctx.createLinearGradient(0, faceTop, 0, faceBot);
  fg.addColorStop(0, FRONT_TOP); fg.addColorStop(1, FRONT_BOT);
  ctx.fillStyle = fg; ctx.fillRect(x, faceTop, ts, H);
  fugen(ctx, x, faceTop, ts, H, Math.max(6, H / 3.6), ts / 2, FRONT_MORTAR, FRONT_HI, '#0c0905', v + 1);
  if (!k.w) { ctx.fillStyle = 'rgba(255,242,214,0.08)'; ctx.fillRect(x, faceTop, 1.6, H); }
  if (!k.e) { ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(x + ts - 1.8, faceTop, 1.8, H); }
  // Kontaktschatten auf dem Boden, wenn südlich Boden ist
  if (!k.s) {
    const sg = ctx.createLinearGradient(0, faceBot, 0, faceBot + ts * 0.3);
    sg.addColorStop(0, 'rgba(0,0,0,0.55)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.fillRect(x - 1, faceBot, ts + 2, ts * 0.3);
  }

  // --- erhabene Mauerkrone (Kappe), um H nach oben gezogen ---
  const capTop = y - H;
  ctx.fillStyle = CAP; ctx.fillRect(x, capTop, ts, ts);
  fugen(ctx, x, capTop, ts, ts, ts / 3.2, ts / 2, CAP_MORTAR, CAP_HI, CAP_DK, v);
  // 3D-Relief der Kappe: NW hell, SO dunkel -> Block "steht"
  ctx.fillStyle = CAP_HI; ctx.fillRect(x, capTop, ts, 1.6); ctx.fillRect(x, capTop, 1.6, ts);
  ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.fillRect(x + ts - 1.6, capTop, 1.6, ts);
  // Kante Kappe -> Front: heller Grat + dunkle Schattenlinie (klare Oberkante der Wand)
  ctx.fillStyle = 'rgba(255,246,222,0.14)'; ctx.fillRect(x, faceTop - 2, ts, 1.4);
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, faceTop - 0.6, ts, 1.6);
}
