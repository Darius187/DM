// R207 HD-PASS fuer die neuen Monster (Autorwunsch: "die Pixel groesser machen
// und die Figur anschliessend auf die aktuell passende Groesse skalieren").
// Jede Zelle wird intern mit 128x128 gezeichnet (4x Aufloesung, 1-px-Details
// moeglich) und vom SpriteProvider weich auf die 32er-Spielzelle herunter-
// gerechnet - dieselbe Technik wie die Detail-NPCs (R40) und der Held (R37).
// Mehr als 4x lohnt nicht: bei 32 px Anzeigegroesse mitteln sich Details
// jenseits der 4x-Stufe einfach weg (nur Speicher, kein sichtbarer Gewinn).
//
// Koordinaten laufen im 16er-ALTRASTER der kleinen Figuren (1 Einheit = 8 px
// im 128er-Bild) - so bleiben die Proportionen deckungsgleich mit dem Bestand,
// aber Achtelschritte sind jetzt echte Pixel. Schwerter duerfen ueber den
// Kopf hinausragen (Autor: "so sieht das eher aus wie eine Kerze").

import type { FigureSpec } from './fallbackArt';
import { FIGURES, shade } from './fallbackArt';

export const HD_ZELLE = 128;
const U = HD_ZELLE / 16;   // 8 px je Alt-Raster-Einheit

// Welche Figuren den HD-Weg nehmen (die R206-Monster; der Leichenhund bleibt
// vorerst beim Vierbeiner-Bestand - der HD-Vierbeiner kommt, wenn die
// Menschen-Silhouetten abgenommen sind).
export const HD_FIGUREN: ReadonlyArray<string> = [
  'schinder', 'gefallener', 'moorleiche', 'fuhrmann_tot', 'zimmermann_tot',
];

function r(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string): void {
  ctx.fillStyle = col;
  ctx.fillRect(x * U, y * U, w * U, h * U);
}

// weiche Rundbox (Kopf, Schultern) - der eigentliche HD-Gewinn
function rund(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rad: number, col: string): void {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.roundRect(x * U, y * U, w * U, h * U, rad * U);
  ctx.fill();
}

// --- Waffen (lang!) --------------------------------------------------------

function hdSchwert(ctx: CanvasRenderingContext2D, x: number, bob: number): void {
  const b = bob;
  // Klinge vom oberen Zellrand (deutlich UEBER dem Kopf) bis zur Huefte -
  // laenger als die Figur selbst, mit Spitze, Grat und Hohlkehle.
  ctx.fillStyle = '#b8bcc4'; ctx.beginPath();
  ctx.moveTo((x + 0.5) * U, (0.2 + b) * U);                    // Spitze
  ctx.lineTo((x + 0.95) * U, (1.3 + b) * U);
  ctx.lineTo((x + 0.95) * U, (9.6 + b) * U);
  ctx.lineTo((x + 0.05) * U, (9.6 + b) * U);
  ctx.lineTo((x + 0.05) * U, (1.3 + b) * U);
  ctx.closePath(); ctx.fill();
  r(ctx, x + 0.42, 0.9 + b, 0.16, 8.6, '#e2e6ec');             // Mittelgrat
  r(ctx, x + 0.14, 1.5 + b, 0.14, 7.6, '#8e939c');             // Hohlkehle-Schatten
  r(ctx, x - 0.75, 9.6 + b, 2.5, 0.55, '#6a5430');             // Parierstange
  r(ctx, x - 0.55, 9.6 + b, 0.4, 0.55, '#8a7040');             // Licht auf der Stange
  r(ctx, x + 0.15, 10.15 + b, 0.7, 1.2, '#3e3220');            // Griffwicklung
  r(ctx, x + 0.15, 10.5 + b, 0.7, 0.15, '#5a4a30');
  rund(ctx, x - 0.05, 11.35 + b, 1.1, 0.9, 0.4, '#9a7a44');    // Knauf
}

function hdHaken(ctx: CanvasRenderingContext2D, x: number, bob: number): void {
  const b = bob;
  r(ctx, x + 0.15, 1.4 + b, 0.7, 10.8, '#5a4226');             // Schaft
  r(ctx, x + 0.3, 1.4 + b, 0.18, 10.8, '#7a5c38');             // Holz-Lichtkante
  r(ctx, x, 0.7 + b, 1, 0.7, '#8a8f96');                       // Zwinge
  ctx.strokeStyle = '#9aa0a8'; ctx.lineWidth = 0.42 * U;       // Eisenhaken als Bogen
  ctx.beginPath();
  ctx.arc((x - 0.3) * U, (0.7 + b) * U, 1.0 * U, -0.4, Math.PI * 0.9);
  ctx.stroke();
  r(ctx, x - 1.35, 1.2 + b, 0.4, 0.6, '#ccd2da');              // helle Hakenspitze
}

function hdAxt(ctx: CanvasRenderingContext2D, x: number, bob: number): void {
  const b = bob;
  r(ctx, x + 0.15, 2.6 + b, 0.7, 8.6, '#5a4226');              // Stiel
  ctx.fillStyle = '#9aa0a8'; ctx.beginPath();                   // Beilblatt geschwungen
  ctx.moveTo((x + 0.3) * U, (2.6 + b) * U);
  ctx.quadraticCurveTo((x - 1.9) * U, (2.9 + b) * U, (x - 1.5) * U, (4.9 + b) * U);
  ctx.quadraticCurveTo((x - 0.6) * U, (4.5 + b) * U, (x + 0.3) * U, (4.4 + b) * U);
  ctx.closePath(); ctx.fill();
  r(ctx, x - 1.45, 4.35 + b, 1.1, 0.2, '#ccd2da');             // Schneide
}

// --- Figur -----------------------------------------------------------------

// dir: 0 unten, 1 links, 2 rechts, 3 oben (wie der Bestand); frame 0..3.
export function drawMonsterHd(ctx: CanvasRenderingContext2D, name: string, dir: number, frame: number): void {
  const f = FIGURES[name] as FigureSpec | undefined;
  if (!f || 'quad' in (f as object) || 'chicken' in (f as object)) return;
  const step = frame % 4;
  const legL = step === 1 ? 0.9 : 0;
  const legR = step === 3 ? 0.9 : 0;
  const bob = step === 1 || step === 3 ? -0.45 : 0;
  const s = f.scale ?? 1;

  ctx.save();
  // Bodenschatten (unskaliert an der Standflaeche)
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath();
  ctx.ellipse(8 * U, 13.9 * U, 4.4 * U * s, 1.35 * U, 0, 0, Math.PI * 2);
  ctx.fill();
  if (s !== 1) {           // grosse Figuren wachsen um den FUSSPUNKT
    ctx.translate(8 * U * (1 - s), 14 * U * (1 - s));
    ctx.scale(s, s);
  }

  const flip = dir === 1;
  if (flip) { ctx.translate(16 * U, 0); ctx.scale(-1, 1); }

  // Beine / Robe
  if (f.robe) {
    rund(ctx, 5, 9 + bob, 6, 4.6, 0.7, f.tunic);
    r(ctx, 5.2, 9 + bob, 0.9, 4.4, shade(f.tunic, 14));
    r(ctx, 5, 13.1, 6, 0.5, shade(f.tunic, -26));
    r(ctx, 7.9, 9.6 + bob, 0.25, 3.6, shade(f.tunic, -18));    // Faltenwurf
    r(ctx, 9.4, 9.9 + bob, 0.22, 3.2, shade(f.tunic, -12));
  } else {
    rund(ctx, 6, 10 + bob, 1.9, 3 + legL, 0.5, f.legs);
    rund(ctx, 8.1, 10 + bob, 1.9, 3 + legR, 0.5, f.legs);
    r(ctx, 6, 12.3 + bob + legL, 1.9, 0.75, shade(f.legs, -26));
    r(ctx, 8.1, 12.3 + bob + legR, 1.9, 0.75, shade(f.legs, -26));
  }

  // Rumpf mit drei Tonstufen + Guertel
  rund(ctx, 5, 6 + bob, 6, 4.3, 0.8, f.tunic);
  r(ctx, 5.3, 6.1 + bob, 5.4, 0.8, shade(f.tunic, 20));
  r(ctx, 5.1, 6.9 + bob, 0.8, 2.8, shade(f.tunic, 10));
  r(ctx, 10.1, 6.9 + bob, 0.8, 2.8, shade(f.tunic, -18));
  if (!f.robe) r(ctx, 5.1, 9.3 + bob, 5.8, 0.6, shade(f.tunic, -32));

  if (f.skeletal) {
    // feiner Brustkorb: Wirbelsaeule + 4 Rippenpaare mit 1-px-Linien
    r(ctx, 5.6, 6.4 + bob, 4.8, 3.4, shade(f.tunic, -36));
    r(ctx, 7.85, 6.4 + bob, 0.3, 3.4, '#e6ddc2');
    for (let i = 0; i < 4; i++) {
      const ry = 6.8 + bob + i * 0.72;
      r(ctx, 5.9, ry, 1.7, 0.22, '#e6ddc2');
      r(ctx, 8.4, ry, 1.7, 0.22, '#e6ddc2');
    }
    r(ctx, 6.6, 9.45 + bob, 2.8, 0.28, '#cfc4a8');             // Beckenkamm
  }
  if (f.seuche) {
    for (const [bx, by] of [[5.7, 6.6], [9.1, 7.6], [7.1, 8.7]] as const) {
      rund(ctx, bx, by + bob, 0.9, 0.9, 0.45, '#5a1414');
      r(ctx, bx + 0.15, by + 0.15 + bob, 0.35, 0.35, '#8a2a2a');
    }
  }
  if (f.ritter) {
    rund(ctx, 6.4, 6.5 + bob, 3.2, 3.5, 0.3, '#777068');       // Tabard
    r(ctx, 7.7, 6.9 + bob, 0.7, 2.6, '#7a322a');               // Kreuz
    r(ctx, 7.05, 7.5 + bob, 2, 0.7, '#7a322a');
    rund(ctx, 4.3, 5.9 + bob, 1.9, 1.3, 0.5, '#3a3630');       // Schulterpanzer
    rund(ctx, 9.8, 5.9 + bob, 1.9, 1.3, 0.5, '#3a3630');
    r(ctx, 4.4, 5.95 + bob, 1.7, 0.4, '#5a544c');
    r(ctx, 9.9, 5.95 + bob, 1.7, 0.4, '#5a544c');
  }

  // Arme (gegenlaeufig zum Schritt)
  const armCol = f.skeletal ? '#d8cfb0' : f.tunic;
  rund(ctx, 4.1, 7 + bob + legR, 1, 3, 0.4, shade(armCol, -8));
  rund(ctx, 10.9, 7 + bob + legL, 1, 3, 0.4, shade(armCol, -8));

  // Kopf: Rundbox + Wangenschatten; Skelett bekommt Schaedel-Zuege
  rund(ctx, 5.4, 2 + bob, 5.2, 4.2, 1.3, f.skin);
  r(ctx, 9.7, 3 + bob, 0.8, 2.6, shade(f.skin, -16));
  r(ctx, 5.6, 2.15 + bob, 4.4, 0.7, shade(f.skin, 12));
  if (f.skeletal && dir !== 3) {
    r(ctx, 6.2, 4.9 + bob, 3.4, 0.55, shade(f.skin, -30));     // Kieferschatten
    r(ctx, 6.5, 5.1 + bob, 0.3, 0.4, shade(f.skin, -44));      // Zahnluecken
    r(ctx, 7.3, 5.1 + bob, 0.3, 0.4, shade(f.skin, -44));
    r(ctx, 8.1, 5.1 + bob, 0.3, 0.4, shade(f.skin, -44));
  }
  // Haar/Kapuze bzw. Hut
  if (f.robe) {                                                // Kapuze
    ctx.fillStyle = f.hair; ctx.beginPath();
    ctx.moveTo(5.1 * U, (4.4 + bob) * U);
    ctx.quadraticCurveTo(5.0 * U, (1.4 + bob) * U, 8 * U, (1.25 + bob) * U);
    ctx.quadraticCurveTo(11.0 * U, (1.4 + bob) * U, 10.9 * U, (4.4 + bob) * U);
    ctx.lineTo(10.2 * U, (3.4 + bob) * U);
    ctx.quadraticCurveTo(8 * U, (2.2 + bob) * U, 5.8 * U, (3.4 + bob) * U);
    ctx.closePath(); ctx.fill();
  } else if (f.hat) {
    rund(ctx, 5.0, 1.7 + bob, 6, 0.9, 0.35, f.hat);            // Krempe
    rund(ctx, 6.1, 0.6 + bob, 3.8, 1.4, 0.5, shade(f.hat, 10));// Kappe
  } else {
    r(ctx, 5.4, 1.9 + bob, 5.2, 0.9, f.hair);
  }
  // Augen (dir 0/1/2; oben = Hinterkopf)
  if (dir !== 3) {
    const ac = f.augen ?? '#1c1410';
    r(ctx, 6.5, 3.6 + bob, 0.75, 0.65, ac);
    r(ctx, 8.7, 3.6 + bob, 0.75, 0.65, ac);
    if (f.augen) {                                             // Gluehen
      ctx.fillStyle = f.augen + '55';
      ctx.fillRect(6.2 * U, (3.3 + bob) * U, 1.35 * U, 1.25 * U);
      ctx.fillRect(8.4 * U, (3.3 + bob) * U, 1.35 * U, 1.25 * U);
    }
  }

  // Waffe in der "vorderen" Hand (bei flip zeichnet der Spiegel sie links)
  const wx = 12.1;
  if (f.weapon === 'schwert') hdSchwert(ctx, wx, bob + legL);
  else if (f.weapon === 'haken') hdHaken(ctx, wx, bob + legL);
  else if (f.weapon === 'axt') hdAxt(ctx, wx, bob + legL);

  ctx.restore();
}
