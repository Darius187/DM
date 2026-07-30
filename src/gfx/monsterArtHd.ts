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

import type { FigureSpec, QuadSpec } from './fallbackArt';
import { FIGURES, shade } from './fallbackArt';

// R207c (Autor: "der Templer ist ingame am Kopf abgeschnitten, das Schwert
// darf sogar 1,5 seine Groesse sein"): die Zelle bekommt LUFT. Die Figur
// selbst bleibt exakt so gross wie bisher (16 Einheiten = 32 Anzeige-Pixel) -
// drumherum liegt Rand, in den Klinge und Helm hineinragen duerfen. Genau das
// Prinzip, das der Held seit R37 nutzt (HELD_CELL + HELD_MARGIN).
export const HD_FIGUR_U = 16;        // Figur-Raster wie bisher (Fuss auf y=14)
export const HD_LUFT_OBEN_U = 10;    // Luft ueber dem Kopf: traegt die 1,5x-Klinge
export const HD_LUFT_SEITE_U = 5;    // Luft links/rechts (Ausholen, Spiegelung)
export const HD_ZELLE_U = HD_FIGUR_U + 2 * HD_LUFT_SEITE_U;   // 26 (quadratisch)
const PX_PRO_U = 8;                  // 4x-Aufloesung wie bisher
export const HD_ZELLE = HD_ZELLE_U * PX_PRO_U;                // 208 px intern
const U = PX_PRO_U;

// R209: Frames je Richtung im HD-Atlas - 0-3 Gehen, 4-6 Schlag-/Wirk-Phasen
// (dieselbe Aufteilung wie beim Helden, HELD_FRAMES/SCHLAG_FRAME).
export const HD_FRAMES = 7;

// R216 (Autor: "einige Gegner sehen unscharf/verschwommen aus"): der Atlas wird
// UEBERZEICHNET gebacken - Figur 32*HD_UEBER px statt 32 px. Die Szene zeigt sie
// dann mit Skala < HD_UEBER, also VERKLEINERT statt vergroessert. Ein Hochskalieren
// weichgezeichneter 32er-Pixel war die Ursache der Unschaerfe (seit die Figuren
// groesser dargestellt werden). Interne Zeichnung bleibt 208 px - der Weg
// 208 -> 104 ist nur noch halb so grob wie 208 -> 52.
export const HD_UEBER = 2;

/**
 * Umrechnung Wunsch-Anzeigegroesse -> Sprite-Skala. HD-Figuren sind im Atlas um
 * HD_UEBER ueberzeichnet, brauchen also entsprechend weniger Skala. Wer eine
 * Figur skaliert, MUSS durch diese Funktion gehen, sonst ist sie doppelt so gross.
 */
export function hdSkala(name: string, wunsch: number): number {
  return istHdFigur(name) ? wunsch / HD_UEBER : wunsch;
}

// Fuss der Figur im Alt-Raster (dort steht die Ellipse des Bodenschattens).
const FUSS_U = 14;

/**
 * Ursprung des Sprites, damit der FUSSPUNKT trotz groesserer Zelle auf exakt
 * derselben Weltposition bleibt wie bei den alten 32er-Frames (dort lag der
 * Fuss 12 px unter dem Anker bei origin 0.5). Gerechnet, nicht geraten.
 */
export const HD_ORIGIN_X = 0.5;
export const HD_ORIGIN_Y =
  (HD_LUFT_OBEN_U + FUSS_U) / HD_ZELLE_U
  - (FUSS_U / HD_FIGUR_U - 0.5) * (HD_FIGUR_U / HD_ZELLE_U);

/** Kantenlaenge eines HD-Frames im Atlas (Figur darin weiterhin 32 px gross). */
export function hdFrameGroesse(spriteGroesse: number): number {
  return Math.round(spriteGroesse * HD_ZELLE_U / HD_FIGUR_U);
}

/**
 * Nimmt diese Figur den HD-Weg? R208 (Autor: "auch die Heer-Soldaten, die mit
 * dem Schild und ALLE anderen inkl. Dorfbewohner - gleiche Technik wie der
 * Held"): JEDE humanoide FIGURES-Figur zeichnet jetzt HD. Nur Vierbeiner und
 * das Huhn bleiben beim 32er-Bestand (HD-Vierbeiner ist Folgearbeit), und die
 * handgemalten Detail-NPCs behalten ihren eigenen Weg (DETAIL_NPCS greift im
 * SpriteProvider VOR diesem Check).
 *
 * Nebenwirkung, bewusst: wer HD ist, hat KEINEN gebackenen Bodenschatten mehr
 * und bekommt ihn von der Szene (CombatScene/WorldScene, FIGUR_SCHATTEN).
 */
export function istHdFigur(name: string): boolean {
  const f = FIGURES[name];
  if (!f) return false;
  // R212b (Autor: "und die Tiere?"): Vierbeiner nehmen jetzt AUCH den HD-Weg
  // (drawQuadrupedHd). Nur das Huhn bleibt beim charmanten 32er-Pixelvieh.
  return !('chicken' in f);
}

/**
 * Welchen Anteil der FRAME-Kante nimmt die FIGUR ein? Bei HD-Frames ist
 * ringsum Luft (fuer Klinge und Helm), sonst fuellt die Figur den Frame.
 *
 * Wer einen Figur-Frame formatfuellend in einen Rahmen einpasst (Portraets,
 * Info-Karten), muss durch diesen Anteil TEILEN - sonst schrumpft die Figur
 * um die Luft. Genau das hat der Zellgroessen-Audit als Bruchstelle gemeldet.
 */
export function figurFrameAnteil(name: string): number {
  return istHdFigur(name) ? HD_FIGUR_U / HD_ZELLE_U : 1;
}

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

// --- Waffen ----------------------------------------------------------------

// Figurhoehe im Alt-Raster: Kopfoberkante ~1.5 bis Fuss 14.
const FIGUR_HOEHE_U = 12.5;

/**
 * Schwert, das AM GRIFF haengt statt an einer festen Bildposition (R207c,
 * Autor: "das Schwert ist nur neben dem Monster und er haelt das nicht
 * richtig"). x/gy = Mitte des Griffs; langF = Gesamtlaenge als Vielfaches der
 * FIGURHOEHE (1.0 = Klinge ragt ueber den Kopf, 1.5 = Templer-Bidenhaender,
 * halbe Klinge ueber dem Kopf).
 */
function hdSchwert(ctx: CanvasRenderingContext2D, x: number, gy: number, langF: number): void {
  const lang = FIGUR_HOEHE_U * langF;
  const knaufY = gy + 1.5;            // Knauf unter der unteren Faust
  const stangeY = gy - 1.0;           // Parierstange ueber der oberen Faust
  const klinge = Math.max(3, lang - 2.5);
  const spitzeY = stangeY - klinge;
  // Klinge: schlanker Koerper mit echter Spitze
  ctx.fillStyle = '#b8bcc4'; ctx.beginPath();
  ctx.moveTo((x + 0.5) * U, spitzeY * U);
  ctx.lineTo((x + 0.95) * U, (spitzeY + 1.1) * U);
  ctx.lineTo((x + 0.95) * U, stangeY * U);
  ctx.lineTo((x + 0.05) * U, stangeY * U);
  ctx.lineTo((x + 0.05) * U, (spitzeY + 1.1) * U);
  ctx.closePath(); ctx.fill();
  r(ctx, x + 0.42, spitzeY + 0.7, 0.16, klinge - 0.7, '#e2e6ec');   // Mittelgrat
  r(ctx, x + 0.14, spitzeY + 1.3, 0.14, klinge - 1.5, '#8e939c');   // Hohlkehle
  r(ctx, x - 0.9, stangeY, 2.8, 0.55, '#6a5430');                   // Parierstange
  r(ctx, x - 0.7, stangeY, 0.45, 0.55, '#8a7040');                  // Licht darauf
  r(ctx, x + 0.15, stangeY + 0.55, 0.7, knaufY - stangeY - 0.55, '#3e3220');   // Griffwicklung
  r(ctx, x + 0.15, gy, 0.7, 0.15, '#5a4a30');
  rund(ctx, x - 0.05, knaufY, 1.1, 0.9, 0.4, '#9a7a44');            // Knauf
}

/**
 * ZWEIHAND-HALTUNG (Autor: "sollten die das Schwert nicht mit beiden Haenden
 * halten, wenn die kein Schild halten?"). Beide Arme greifen schraeg zum
 * Griff, zwei Faeuste liegen UEBEREINANDER auf der Wicklung - das liest sich
 * sofort als gehaltenes Schwert statt als danebenschwebende Klinge.
 * Reihenfolge: Klinge zuerst, dann Arme, dann Faeuste - so liegen die Haende
 * sichtbar AUF dem Griff.
 */
function hdZweihandGriff(
  ctx: CanvasRenderingContext2D, f: FigureSpec, bob: number, legL: number, legR: number, langF: number,
  schlagPhase = -1,
): void {
  // Griff DICHT am Rumpf (kurzer Querarm) und die Klinge leicht nach aussen
  // GENEIGT - so laeuft sie am Kopf vorbei statt darueber, und die Haltung
  // liest sich wie ein abgesetzter Bidenhaender statt wie ein Fahnenmast.
  //
  // R209 SCHLAG (drei Phasen wie beim Helden, erst nur zum ZEIGEN):
  //  0 AUSHOLEN - Klinge weit nach hinten ueber die Schulter gerissen
  //  1 HIEB     - Klinge quer nach vorn-unten durchgezogen, Griff vorgeschoben
  //  2 AUSKLANG - Klinge sinkt aus, kehrt Richtung Ruhe zurueck
  const SCHLAG = [
    { winkel: -1.15, dx: -0.6, dy: -1.1 },
    { winkel: 1.55, dx: 0.9, dy: 0.5 },
    { winkel: 0.65, dx: 0.3, dy: 0.2 },
  ] as const;
  const s = schlagPhase >= 0 ? SCHLAG[Math.min(schlagPhase, 2)] : null;
  const gx = 10.3 + (s?.dx ?? 0);
  const gy = 8.5 + bob + (s?.dy ?? 0);
  const NEIGUNG = s ? s.winkel : 0.2;    // rad, Spitze kippt nach aussen
  ctx.save();
  ctx.translate(gx * U, gy * U);
  ctx.rotate(NEIGUNG);
  ctx.translate(-gx * U, -gy * U);
  hdSchwert(ctx, gx, gy, langF);
  ctx.restore();

  // R208b (Autor: "man sieht die zwei Haende nicht"): die FAEUSTE sitzen AUF
  // der Griffwicklung und DREHEN MIT dem Schwert - die Arme folgen ihnen in
  // jede Schlagphase. Faust-Anker entlang der Klingenachse um den Griffpunkt
  // rotiert (von Hand gerechnet, kein Canvas-Transform noetig).
  const dreh = (px: number, py: number): { x: number; y: number } => {
    const c = Math.cos(NEIGUNG), sn = Math.sin(NEIGUNG);
    return { x: gx + (px - gx) * c - (py - gy) * sn, y: gy + (px - gx) * sn + (py - gy) * c };
  };
  const fObenP = dreh(gx + 0.5, gy - 0.45);   // Faust direkt unter der Parierstange
  const fUntenP = dreh(gx + 0.5, gy + 0.6);   // Faust am Knauf
  const armCol = f.skeletal ? '#d8cfb0' : f.tunic;
  const arm = (sx: number, sy: number, hx: number, hy: number, br: number): void => {
    ctx.fillStyle = shade(armCol, -8);
    ctx.beginPath();
    ctx.moveTo(sx * U, sy * U);
    ctx.lineTo((sx + br) * U, sy * U);
    ctx.lineTo((hx + br * 0.5) * U, hy * U);
    ctx.lineTo((hx - br * 0.5) * U, hy * U);
    ctx.closePath(); ctx.fill();
  };
  arm(10.9, 7.2 + bob + legL, fObenP.x, fObenP.y, 0.95);   // rechte Schulter -> obere Faust
  arm(4.3, 7.9 + bob + legR, fUntenP.x, fUntenP.y, 0.9);   // linker Arm quer -> untere Faust
  // GROSSE, klar lesbare Faeuste (rotiert wie der Griff)
  const faust = f.skeletal ? '#e2dcc4' : shade(f.skin, -6);
  const zeichneFaust = (p: { x: number; y: number }, col: string): void => {
    ctx.save();
    ctx.translate(p.x * U, p.y * U);
    ctx.rotate(NEIGUNG);
    ctx.beginPath();
    ctx.roundRect(-1.0 * U, -0.55 * U, 2.0 * U, 1.1 * U, 0.4 * U);
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = shade(col, -30); ctx.lineWidth = 0.12 * U; ctx.stroke();
    ctx.restore();
  };
  zeichneFaust(fObenP, faust);
  zeichneFaust(fUntenP, shade(faust, -14));
}

// R208b: Wappenschild (Heater) fest am linken Arm - der Autor wollte die
// Schildtraeger IM Kader sehen; das drehende Szenen-Schild bleibt zusaetzlich.
function hdSchild(ctx: CanvasRenderingContext2D, bob: number): void {
  const cx = 4.2, cy = 8.2 + bob, hw = 1.9;
  ctx.fillStyle = '#7a808a'; ctx.beginPath();
  ctx.moveTo((cx - hw) * U, (cy - 1.9) * U);
  ctx.lineTo((cx + hw) * U, (cy - 1.9) * U);
  ctx.lineTo((cx + hw) * U, (cy + 0.4) * U);
  ctx.quadraticCurveTo((cx + hw * 0.7) * U, (cy + 1.9) * U, cx * U, (cy + 2.5) * U);
  ctx.quadraticCurveTo((cx - hw * 0.7) * U, (cy + 1.9) * U, (cx - hw) * U, (cy + 0.4) * U);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#9aa0aa';                                   // Lichtkante oben
  ctx.fillRect((cx - hw) * U, (cy - 1.9) * U, hw * 2 * U, 0.8 * U);
  rund(ctx, cx - 0.45, cy - 0.55, 0.9, 0.9, 0.45, '#4a4640'); // Buckel
  ctx.strokeStyle = '#23201c'; ctx.lineWidth = 0.18 * U;      // Rand
  ctx.beginPath();
  ctx.moveTo((cx - hw) * U, (cy - 1.9) * U);
  ctx.lineTo((cx + hw) * U, (cy - 1.9) * U);
  ctx.lineTo((cx + hw) * U, (cy + 0.4) * U);
  ctx.quadraticCurveTo((cx + hw * 0.7) * U, (cy + 1.9) * U, cx * U, (cy + 2.5) * U);
  ctx.quadraticCurveTo((cx - hw * 0.7) * U, (cy + 1.9) * U, (cx - hw) * U, (cy + 0.4) * U);
  ctx.closePath(); ctx.stroke();
}

// Langbogen (Schuetze): figurhoher Bogen mit Sehne und aufgelegtem Pfeil.
// R209 Schuss-Phasen: 0 = GESPANNT (Sehne im Knick zur Zughand, Pfeil zurueck-
// gezogen), 1 = GELOEST (Sehne schnellt gerade, Pfeil ist unterwegs),
// 2 = NACHLEGEN (neuer Pfeil wird aufgelegt, sitzt noch nicht vorn).
function hdBogen(ctx: CanvasRenderingContext2D, x: number, bob: number, schlagPhase = -1): void {
  const b = bob;
  ctx.strokeStyle = '#7a5c34'; ctx.lineWidth = 0.45 * U;
  ctx.beginPath();
  ctx.arc((x - 2.2) * U, (6.5 + b) * U, 4.6 * U, -1.05, 1.05); // Bogenrucken
  ctx.stroke();
  const s1x = x - 2.2 + 4.6 * Math.cos(-1.05), s1y = 6.5 + b + 4.6 * Math.sin(-1.05);
  const s2x = x - 2.2 + 4.6 * Math.cos(1.05), s2y = 6.5 + b + 4.6 * Math.sin(1.05);
  ctx.strokeStyle = '#d8d0c0'; ctx.lineWidth = 0.14 * U;       // Sehne
  ctx.beginPath();
  ctx.moveTo(s1x * U, s1y * U);
  if (schlagPhase === 0) ctx.lineTo((x - 2.0) * U, (6.5 + b) * U);   // gespannt: Knick
  ctx.lineTo(s2x * U, s2y * U);
  ctx.stroke();
  if (schlagPhase !== 1) {                                      // Phase 1: Pfeil fliegt
    const zug = schlagPhase === 0 ? -1.5 : schlagPhase === 2 ? -0.8 : 0;
    r(ctx, x - 1.2 + zug, 6.35 + b, 3.4, 0.3, '#8a6a3e');      // Pfeilschaft
    ctx.fillStyle = '#b8bcc4'; ctx.beginPath();                 // Pfeilspitze
    ctx.moveTo((x + 2.7 + zug) * U, (6.5 + b) * U);
    ctx.lineTo((x + 2.0 + zug) * U, (6.15 + b) * U);
    ctx.lineTo((x + 2.0 + zug) * U, (6.85 + b) * U);
    ctx.closePath(); ctx.fill();
    r(ctx, x - 1.5 + zug, 6.2 + b, 0.5, 0.6, '#c8c0a8');       // Befiederung
    if (schlagPhase === 0) {                                    // Zughand an der Sehne
      rund(ctx, x - 2.6, 6.05 + b, 1.4, 0.95, 0.35, '#c8b090');
    }
  }
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

// Streitkolben/Hammer ("wucht"): kurzer Stiel, schwerer Kopf mit Grat.
function hdWucht(ctx: CanvasRenderingContext2D, x: number, bob: number): void {
  const b = bob;
  r(ctx, x + 0.15, 3.4 + b, 0.7, 7.8, '#5a4226');              // Stiel
  r(ctx, x + 0.3, 3.4 + b, 0.16, 7.8, '#7a5c38');              // Lichtkante
  rund(ctx, x - 0.75, 2.1 + b, 2.5, 1.9, 0.4, '#787068');      // Kopf
  r(ctx, x - 0.75, 2.6 + b, 2.5, 0.3, '#9aa0a8');              // Grat
  r(ctx, x - 0.45, 2.25 + b, 1.9, 0.25, '#a8aeb6');            // Lichtkante oben
  r(ctx, x - 0.2, 4.0 + b, 1.4, 0.45, '#4a443c');              // Zwinge unter dem Kopf
}

// Zauberstab: Holzschaft, Zierring, Kristall in Krallenfassung - er LEUCHTET.
// R209 Wirk-Phasen: 0 = SAMMELN (Kristall glimmt heller), 1 = ENTLADUNG
// (grosser Schein + vier Strahlen), 2 = VERKLINGEN (Schein ebbt ab).
function hdStab(ctx: CanvasRenderingContext2D, x: number, bob: number, schlagPhase = -1): void {
  const b = bob;
  r(ctx, x + 0.2, 1.9 + b, 0.6, 9.6, '#5a3c22');               // Schaft
  r(ctx, x + 0.32, 1.9 + b, 0.15, 9.6, '#7a5636');             // Lichtkante
  r(ctx, x + 0.05, 5.4 + b, 0.9, 0.4, '#9a7a44');              // Zierring
  r(ctx, x - 0.35, 1.5 + b, 0.45, 1.1, '#9a8a6a');             // linke Kralle
  r(ctx, x + 0.9, 1.5 + b, 0.45, 1.1, '#9a8a6a');              // rechte Kralle
  ctx.fillStyle = '#a85ce0'; ctx.beginPath();                   // Kristall (Raute)
  ctx.moveTo((x + 0.5) * U, (0.2 + b) * U);
  ctx.lineTo((x + 1.25) * U, (1.3 + b) * U);
  ctx.lineTo((x + 0.5) * U, (2.4 + b) * U);
  ctx.lineTo((x - 0.25) * U, (1.3 + b) * U);
  ctx.closePath(); ctx.fill();
  r(ctx, x + 0.3, 1.0 + b, 0.45, 0.5, '#e8c8ff');              // Glanzpunkt
  // R216 (Autor: "dieser Leuchteffekt ist auch nicht so toll bei den Gegnern"):
  // der Kristall glimmt, aber der Hof ist kleiner und schwaecher als zuvor.
  const schein = schlagPhase === 0 ? 1.9 : schlagPhase === 1 ? 2.7 : schlagPhase === 2 ? 1.6 : 1.25;
  ctx.fillStyle = schlagPhase === 1 ? '#a85ce033' : '#a85ce01c'; // Schein
  ctx.beginPath(); ctx.arc((x + 0.5) * U, (1.3 + b) * U, schein * U, 0, 7); ctx.fill();
  if (schlagPhase === 1) {                                      // Entladung: 4 Strahlen
    ctx.strokeStyle = '#d8a8ff'; ctx.lineWidth = 0.22 * U;
    for (const w of [0.5, 2.1, 3.7, 5.3]) {
      ctx.beginPath();
      ctx.moveTo((x + 0.5 + Math.cos(w) * 1.6) * U, (1.3 + b + Math.sin(w) * 1.6) * U);
      ctx.lineTo((x + 0.5 + Math.cos(w) * 3.2) * U, (1.3 + b + Math.sin(w) * 3.2) * U);
      ctx.stroke();
    }
  }
}

// Hellebarde ("stange", Wache): langer Schaft, Stossspitze, seitliches Blatt.
function hdStange(ctx: CanvasRenderingContext2D, x: number, bob: number): void {
  const b = bob;
  r(ctx, x + 0.15, 0.9 + b, 0.65, 11.6, '#5a4226');
  r(ctx, x + 0.28, 0.9 + b, 0.16, 11.6, '#7a5c38');
  r(ctx, x + 0.18, -0.9 + b, 0.6, 1.8, '#b8bcc4');             // Stossspitze
  ctx.fillStyle = '#9aa0a8'; ctx.beginPath();                   // Beilblatt
  ctx.moveTo((x + 0.2) * U, (0.3 + b) * U);
  ctx.quadraticCurveTo((x - 1.5) * U, (0.5 + b) * U, (x - 1.2) * U, (2.1 + b) * U);
  ctx.quadraticCurveTo((x - 0.4) * U, (1.9 + b) * U, (x + 0.2) * U, (1.9 + b) * U);
  ctx.closePath(); ctx.fill();
  r(ctx, x - 1.15, 1.6 + b, 0.85, 0.2, '#ccd2da');             // Schneide
}

// --- Werkzeuge der Dorfbewohner (R208: HD fuer ALLE Figuren) ---------------

function hdKeule(ctx: CanvasRenderingContext2D, x: number, bob: number): void {
  const b = bob;
  r(ctx, x + 0.15, 5.4 + b, 0.7, 5.6, '#6a5430');
  rund(ctx, x - 0.25, 3.4 + b, 1.5, 2.4, 0.7, '#7a6238');      // dickes Ende
  r(ctx, x - 0.05, 3.7 + b, 0.4, 1.6, '#8a7248');
}

function hdHammer(ctx: CanvasRenderingContext2D, x: number, bob: number): void {
  const b = bob;
  r(ctx, x + 0.15, 4.6 + b, 0.7, 6.4, '#6a5430');
  rund(ctx, x - 0.85, 3.7 + b, 2.7, 1.5, 0.3, '#8a8f96');      // Kopf
  r(ctx, x - 0.85, 3.8 + b, 2.7, 0.4, '#a8aeb6');
}

function hdSack(ctx: CanvasRenderingContext2D, x: number, bob: number): void {
  const b = bob;
  rund(ctx, x - 0.9, 6.2 + b, 2.6, 3.6, 1.0, '#cfc4a8');
  r(ctx, x - 0.45, 6.6 + b, 0.4, 2.6, shade('#cfc4a8', -18));  // Falte
  r(ctx, x - 0.05, 5.6 + b, 0.9, 0.7, '#8a7a5a');              // Zugband
}

function hdAngel(ctx: CanvasRenderingContext2D, x: number, bob: number): void {
  const b = bob;
  r(ctx, x + 0.2, -0.4 + b, 0.5, 11.4, '#6a5430');             // Rute
  r(ctx, x + 0.85, -0.4 + b, 0.14, 5.4, '#d8d0c0');            // Schnur
  rund(ctx, x + 0.6, 5.0 + b, 0.7, 0.7, 0.3, '#9aa0a8');       // Haken/Blei
}

function hdEimer(ctx: CanvasRenderingContext2D, x: number, bob: number): void {
  const b = bob;
  ctx.fillStyle = '#6a5430'; ctx.beginPath();                   // konischer Eimer
  ctx.moveTo((x - 0.9) * U, (8.2 + b) * U);
  ctx.lineTo((x + 1.3) * U, (8.2 + b) * U);
  ctx.lineTo((x + 1.0) * U, (10.6 + b) * U);
  ctx.lineTo((x - 0.6) * U, (10.6 + b) * U);
  ctx.closePath(); ctx.fill();
  r(ctx, x - 0.9, 8.2 + b, 2.2, 0.35, '#8a7248');              // Rand
  ctx.strokeStyle = '#8a8f96'; ctx.lineWidth = 0.16 * U;       // Buegel
  ctx.beginPath(); ctx.arc((x + 0.2) * U, (8.2 + b) * U, 1.05 * U, Math.PI, 0); ctx.stroke();
}

// Grabschaufel (Totengraeber): langer Stiel, Blatt unten - Werkzeug UND Waffe.
function hdSchaufel(ctx: CanvasRenderingContext2D, x: number, bob: number): void {
  const b = bob;
  r(ctx, x + 0.15, 1.6 + b, 0.65, 8.6, '#5a4226');
  r(ctx, x + 0.28, 1.6 + b, 0.16, 8.6, '#7a5c38');
  r(ctx, x - 0.35, 0.9 + b, 1.6, 0.7, '#5a4226');              // Quergriff oben
  ctx.fillStyle = '#8a8f96'; ctx.beginPath();                   // Blatt unten
  ctx.moveTo((x - 0.5) * U, (10.2 + b) * U);
  ctx.lineTo((x + 1.45) * U, (10.2 + b) * U);
  ctx.lineTo((x + 1.15) * U, (12.4 + b) * U);
  ctx.quadraticCurveTo((x + 0.5) * U, (13.0 + b) * U, (x - 0.2) * U, (12.4 + b) * U);
  ctx.closePath(); ctx.fill();
  r(ctx, x - 0.5, 10.2 + b, 1.95, 0.35, '#a8aeb6');
}

// Geissel (Geissler): kurzer Griff, drei haengende Straenge mit Knoten.
function hdGeissel(ctx: CanvasRenderingContext2D, x: number, bob: number): void {
  const b = bob;
  r(ctx, x + 0.1, 6.2 + b, 0.7, 2.4, '#4a3a26');               // Griff
  ctx.strokeStyle = '#7a6a4e'; ctx.lineWidth = 0.22 * U;
  for (const [ex, sw] of [[-0.7, 0.3], [0.1, 0], [0.9, -0.25]] as const) {
    ctx.beginPath();
    ctx.moveTo((x + 0.45) * U, (6.4 + b) * U);
    ctx.quadraticCurveTo((x + 0.45 + ex) * U, (8.6 + b + sw) * U, (x + 0.45 + ex * 1.4) * U, (10.6 + b) * U);
    ctx.stroke();
    rund(ctx, x + 0.15 + ex * 1.4, 10.5 + b, 0.6, 0.6, 0.3, '#5a4a34');   // Knoten
  }
}

// Handglocke (Gloeckner): Totenglocke mit Klöppel - er laeutet die Toten herbei.
function hdGlocke(ctx: CanvasRenderingContext2D, x: number, bob: number): void {
  const b = bob;
  r(ctx, x + 0.2, 5.2 + b, 0.5, 1.4, '#4a3a26');               // Griff
  ctx.fillStyle = '#8a7a3e'; ctx.beginPath();                   // Glockenkoerper
  ctx.moveTo((x - 0.7) * U, (8.9 + b) * U);
  ctx.quadraticCurveTo((x - 0.7) * U, (6.4 + b) * U, (x + 0.45) * U, (6.3 + b) * U);
  ctx.quadraticCurveTo((x + 1.6) * U, (6.4 + b) * U, (x + 1.6) * U, (8.9 + b) * U);
  ctx.closePath(); ctx.fill();
  r(ctx, x - 0.7, 8.7 + b, 2.3, 0.4, '#a8983e');               // Schlagring
  r(ctx, x - 0.4, 6.8 + b, 0.4, 1.6, '#b8a85e');               // Lichtkante
  rund(ctx, x + 0.25, 9.1 + b, 0.55, 0.55, 0.27, '#3a3226');   // Kloeppel
}

function hdKorb(ctx: CanvasRenderingContext2D, x: number, bob: number): void {
  const b = bob;
  rund(ctx, x - 0.9, 7.6 + b, 2.5, 2.4, 0.6, '#9a7a44');
  r(ctx, x - 0.9, 8.3 + b, 2.5, 0.25, shade('#9a7a44', -20));  // Flechtlinien
  r(ctx, x - 0.9, 9.0 + b, 2.5, 0.25, shade('#9a7a44', -20));
  rund(ctx, x - 0.7, 6.9 + b, 2.1, 0.9, 0.4, '#4a6a3a');       // Kraeuter obenauf
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

// --- R209 Schlagphasen fuer EINHAND-Traeger (Autor-Freigabe: "mach alle") ---
// Die Waffe dreht in drei Phasen um die FAUST (Ausholen/Hieb/Ausklang), Faust
// und Waffe verschieben sich leicht mit, der Schlagarm folgt der Faust.
// Je Gattung ein eigener Verlauf - Hieb, Stoss, Laeuten, Wirken.

// y-Mitte der Waffenfaust im Alt-Raster (deckungsgleich mit den rund()-Faeusten
// der Ruhepose unten in drawMonsterHd).
const FAUST_Y: Record<string, number> = {
  schwert: 8.5, haken: 8.9, axt: 8.7, wucht: 8.9, stab: 8.9, stange: 8.7,
  keule: 9.1, hammer: 9.1, schaufel: 8.1, geissel: 7.1, glocke: 5.85,
};

// [Ausholen, Hieb, Ausklang] als Drehwinkel (rad) um die Faust.
const SCHWUNG: Record<string, readonly [number, number, number]> = {
  schwert: [-0.9, 1.25, 0.55], axt: [-0.9, 1.25, 0.55], wucht: [-0.95, 1.2, 0.5],
  keule: [-0.9, 1.25, 0.55], hammer: [-0.95, 1.2, 0.5], haken: [-0.8, 1.1, 0.5],
  schaufel: [-0.8, 1.15, 0.5], geissel: [-1.05, 1.0, 0.45],
  stange: [-0.35, 0.65, 0.3],       // Stoss: kleiner Winkel, dafuer Vorschub
  stab: [-0.4, 0.3, 0.1],           // Wirken: Stab neigt sich, Kristall entlaedt
  glocke: [-0.6, 0.6, -0.3],        // Laeuten: Pendel
};

// Faust-Versatz je Phase (die Hand schwingt mit, nicht nur das Geraet).
const SCHWUNG_DELTA: ReadonlyArray<{ dx: number; dy: number }> = [
  { dx: -0.5, dy: -0.7 }, { dx: 0.7, dy: 0.5 }, { dx: 0.25, dy: 0.2 },
];

// Stoss-Waffen (stange) schieben in der Hieb-Phase deutlich VOR statt zu drehen.
const STOSS_DELTA: ReadonlyArray<{ dx: number; dy: number }> = [
  { dx: -0.7, dy: 0.2 }, { dx: 1.7, dy: -0.2 }, { dx: 0.6, dy: 0 },
];

// Schlagarm: von der Schulter zur (mitgeschwungenen) Faust. Die Breite liegt
// SENKRECHT zur Armrichtung - mit horizontalen Kanten (wie bei den vertikalen
// Zweihand-Armen) degeneriert ein waagerechter Stoss zu einem Strich.
function zeichneSchlagArm(ctx: CanvasRenderingContext2D, f: FigureSpec, sx: number, sy: number, hx: number, hy: number, br: number): void {
  const dx = hx - sx, dy = hy - sy;
  const len = Math.hypot(dx, dy) || 1;
  const ox = (-dy / len) * br * 0.5, oy = (dx / len) * br * 0.5;
  const armCol = f.skeletal ? '#d8cfb0' : f.tunic;
  ctx.fillStyle = shade(armCol, -8);
  ctx.beginPath();
  ctx.moveTo((sx + ox) * U, (sy + oy) * U);
  ctx.lineTo((sx - ox) * U, (sy - oy) * U);
  ctx.lineTo((hx - ox * 0.7) * U, (hy - oy * 0.7) * U);
  ctx.lineTo((hx + ox * 0.7) * U, (hy + oy * 0.7) * U);
  ctx.closePath(); ctx.fill();
}

// --- Vierbeiner (R212b, Autor: "und die Tiere?") ----------------------------
// Gleiche HD-Technik wie die Menschen: Rundformen, drei Tonstufen, feine
// Details (Nuestern, Hufe, fliessender Schweif) - aus DENSELBEN QuadSpec-Daten
// wie der 32er-Bestand, deshalb sehen Kuh, Pferd, Wolf sofort nach sich aus.
export function drawQuadrupedHd(ctx: CanvasRenderingContext2D, q: QuadSpec, dir: number, frame: number): void {
  // R209: Frames 4-6 = SPRUNG-Phasen (Ducken/Satz/Landen) - Wolf und
  // Leichenhund reissen sichtbar zu, statt nur zu laufen.
  const schlagPhase = frame >= 4 ? Math.min(frame - 4, 2) : -1;
  if (schlagPhase >= 0) frame = 0;
  const flip = dir === 1;
  ctx.save();
  ctx.translate(HD_LUFT_SEITE_U * U, HD_LUFT_OBEN_U * U);
  if (flip) { ctx.translate(HD_FIGUR_U * U, 0); ctx.scale(-1, 1); }
  if (schlagPhase >= 0) {
    const s = [{ dx: -1.1, dy: 0.7, rot: 0.1 }, { dx: 2.2, dy: -1.0, rot: -0.22 }, { dx: 0.7, dy: 0, rot: -0.07 }][schlagPhase];
    ctx.translate(s.dx * U, s.dy * U);
    ctx.translate(8 * U, 12 * U); ctx.rotate(s.rot); ctx.translate(-8 * U, -12 * U);
  }
  const step = frame % 4;
  const legA = step === 1 ? 0.8 : 0;
  const legB = step === 3 ? 0.8 : 0;
  const bw = 8 * q.size, bh = 4 * q.size;
  const bx = Math.max(0.5, (16 - (bw + 3)) / 2 + 1);
  const by = 9 - bh;
  const legLen = q.size >= 1.2 ? 3 : 2;

  // Schweif zuerst (liegt hinter dem Koerper)
  if (q.tail) {
    ctx.strokeStyle = shade(q.body, -14); ctx.lineWidth = 0.5 * U;
    ctx.beginPath();
    ctx.moveTo((bx + 0.2) * U, (by + 0.6) * U);
    if (q.longTail) ctx.quadraticCurveTo((bx - 1.4) * U, (by + 1.5) * U, (bx - 1.0) * U, (by + 4.6) * U);
    else ctx.quadraticCurveTo((bx - 0.9) * U, (by + 0.4) * U, (bx - 0.8) * U, (by + 1.8) * U);
    ctx.stroke();
  }
  // Beine mit Hufen/Pfoten (vorn/hinten je nach Groesse vier)
  const bein = (x: number, extra: number, dunkel: number): void => {
    rund(ctx, x, by + bh - 0.3, 0.95, legLen + extra + 0.3, 0.3, shade(q.body, dunkel));
    r(ctx, x, by + bh + legLen + extra - 0.45, 0.95, 0.45, shade(q.body, dunkel - 18));
  };
  bein(bx + 0.8, legA, -20);
  bein(bx + bw - 1.8, legB, -20);
  if (q.size >= 1.2) { bein(bx + 2.6, legB, -28); bein(bx + bw - 3.6, legA, -28); }
  // Koerper: Rundform mit Licht oben und Bauch-Schatten
  rund(ctx, bx, by, bw, bh, Math.min(1.4, bh * 0.42), q.body);
  r(ctx, bx + 0.5, by + 0.15, bw - 1, 0.7, shade(q.body, 14));
  r(ctx, bx + 0.4, by + bh - 0.7, bw - 0.8, 0.5, shade(q.body, -16));
  if (q.spots) {
    rund(ctx, bx + 1.4, by + 0.8, 1.7, 1.5, 0.7, q.spots);
    rund(ctx, bx + 4.2, by + 0.3, 1.8, 1.6, 0.7, q.spots);
    rund(ctx, bx + bw - 2.2, by + 1.4, 1.3, 1.1, 0.5, q.spots);
  }
  // Kopf (Pferd mit laengerer Schnauze), leicht geneigt
  const hw = q.longHead ? 4 : 3;
  const hx = bx + bw - 1, hy = by - 1;
  if (q.mane) {   // Maehne am Nacken
    rund(ctx, hx - 1.1, hy - 1.1, 1.2, 4.4, 0.5, q.mane);
    r(ctx, hx - 0.1, hy - 1.0, 1.1, 0.8, q.mane);
  }
  if (q.ears) {
    rund(ctx, hx + 0.1, hy - 0.95, 0.8, 1.2, 0.35, q.head);
    rund(ctx, hx + 1.9, hy - 0.95, 0.8, 1.2, 0.35, q.head);
  }
  if (q.horns) {
    rund(ctx, hx - 0.1, hy - 0.9, 0.7, 1.0, 0.3, q.horns);
    rund(ctx, hx + 2.2, hy - 0.9, 0.7, 1.0, 0.3, q.horns);
  }
  rund(ctx, hx, hy, hw, 3, 0.9, q.head);
  r(ctx, hx + 0.3, hy + 0.15, hw - 0.6, 0.6, shade(q.head, 12));
  if (q.snout) rund(ctx, hx + hw - 1.1, hy + 0.9, 1.1, 1.9, 0.5, q.snout);
  r(ctx, hx + 1.0, hy + 0.9, 0.55, 0.55, '#1a0e08');           // Auge
  r(ctx, hx + 1.12, hy + 1.0, 0.2, 0.2, '#e8e0d0');            // Glanzpunkt
  if (!q.snout) r(ctx, hx + hw - 0.5, hy + 1.6, 0.35, 0.3, '#1a0e08');   // Nase
  ctx.restore();
}

// --- Figur -----------------------------------------------------------------

// dir: 0 unten, 1 links, 2 rechts, 3 oben (wie der Bestand); frame 0..3 =
// Gehen. R209: frame 4..6 = SCHLAG-Phasen (Ausholen/Hieb/Ausklang) - vorerst
// nur fuer Zweihand-Traeger gezeichnet und nur zum Zeigen, die Spiel-
// Verdrahtung kommt nach der Autor-Abnahme.
export function drawMonsterHd(ctx: CanvasRenderingContext2D, name: string, dir: number, frame: number): void {
  const roh = FIGURES[name];
  if (!roh || 'chicken' in (roh as object)) return;
  if ('quad' in (roh as object)) {   // R212b: Vierbeiner auf demselben Weg
    drawQuadrupedHd(ctx, (roh as { quad: QuadSpec }).quad, dir, frame);
    return;
  }
  const f = roh as FigureSpec;
  const schlagPhase = frame >= 4 ? Math.min(frame - 4, 2) : -1;
  if (schlagPhase >= 0) frame = 0;   // Beine stehen im Schlag (kein Gehschritt)
  const step = frame % 4;
  const legL = step === 1 ? 0.9 : 0;
  const legR = step === 3 ? 0.9 : 0;
  const bob = step === 1 || step === 3 ? -0.45 : 0;
  ctx.save();
  // KEIN eingebackener Bodenschatten mehr (Autor R207b: "falls das ein
  // Schatten ist, lasse das bitte weg") - die HD-Figur steht schattenfrei,
  // Licht/Schatten macht die Szene.
  ctx.translate(HD_LUFT_SEITE_U * U, HD_LUFT_OBEN_U * U);
  // R212b: KLEINE Figuren (Kinder 0.65, Hirtenjunge 0.85) schrumpfen um den
  // FUSSPUNKT - ohne das standen die Dorfkinder ploetzlich erwachsen gross da
  // (der 32er-Zeichner hatte f.scale beachtet, der HD-Weg nicht).
  // VERGROESSERN (> 1) bleibt bewusst Sache der Szene: Zeichnung UND Szenen-
  // Skala zusammen schnitten dem Templer den Kopf ab (R207c).
  const zSkala = Math.min(1, f.scale ?? 1);
  if (zSkala !== 1) {
    ctx.translate(8 * U * (1 - zSkala), 14 * U * (1 - zSkala));
    ctx.scale(zSkala, zSkala);
  }

  const flip = dir === 1;
  if (flip) { ctx.translate(HD_FIGUR_U * U, 0); ctx.scale(-1, 1); }

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

  // Huenen-Masse (massig, R208): Schulterwuelste + breiterer Brustkorb, damit
  // Riesen keine hochskalierten Soldaten sind (wie im 32er-Bestand).
  if (f.massig) {
    rund(ctx, 3.2, 5.8 + bob, 2.4, 2.6, 0.9, shade(f.tunic, 12));
    rund(ctx, 10.4, 5.8 + bob, 2.4, 2.6, 0.9, shade(f.tunic, -16));
    rund(ctx, 4.4, 6 + bob, 7.2, 4.2, 0.9, shade(f.tunic, -4));
  }

  // Arme. Zweihand-Traeger bekommen sie ERST mit der Waffe (beide greifen
  // zum Griff); alle anderen lassen sie gegenlaeufig zum Schritt haengen.
  // Zweihand nur OHNE Schild (Autor-Logik: "mit beiden Haenden, wenn die kein
  // Schild halten") - Schildtraeger fuehren das Schwert einhaendig.
  const zweihand = f.zweihand === true && f.weapon === 'schwert' && !f.schild;
  // R209: Fuehrt diese Figur gerade einen EINHAND-Schwung (Waffe mit Profil)
  // oder einen FAUSTSCHLAG (waffenlos bzw. reines Tragegeraet) aus? Dann
  // ersetzt der Schlagarm den haengenden rechten Arm.
  const schwungProfil = schlagPhase >= 0 && !zweihand && f.weapon ? SCHWUNG[f.weapon] : undefined;
  const faustkampf = schlagPhase >= 0 && !zweihand && !schwungProfil && f.weapon !== 'bogen';
  const armCol = f.skeletal ? '#d8cfb0' : f.tunic;
  if (!zweihand) {
    const aw = f.massig ? 1.6 : 1, al = f.massig ? 3.8 : 3, ax = f.massig ? 3.3 : 4.1;
    rund(ctx, ax, 7 + bob + legR, aw, al, 0.4, shade(armCol, -8));
    if (!schwungProfil && !faustkampf) rund(ctx, f.massig ? 11.1 : 10.9, 7 + bob + legL, aw, al, 0.4, shade(armCol, -8));
  }

  // Kopf: Rundbox + Wangenschatten; Skelett bekommt Schaedel-Zuege.
  // R218 (Autor: "die Koepfe sind viel zu riesig, orientiere dich an den
  // Proportionen vom Spieler"): gemessen war der Kopf 85 % der Schulterbreite,
  // beim Helden sind es 43 %. Der Kopf ist jetzt schmaler UND etwas kuerzer -
  // alle Kopf-Details (Augen, Helm, Kapuze, Schnabel) haengen an KOPF_X/KOPF_B,
  // damit sie mitwandern statt nebeneinander zu liegen.
  const KOPF_B = 4.0;                    // Breite (war 5.2), Rumpf ist 6 breit
  const KOPF_H = 3.9;                    // Hoehe (war 4.2)
  const KOPF_X = 8 - KOPF_B / 2;         // mittig ueber dem Rumpf (Mitte = 8)
  const KOPF_Y = 2.3 + bob;              // etwas tiefer: kein Riesenschaedel mehr
  rund(ctx, KOPF_X, KOPF_Y, KOPF_B, KOPF_H, 1.05, f.skin);
  r(ctx, KOPF_X + KOPF_B - 0.7, KOPF_Y + 0.9, 0.65, KOPF_H - 1.6, shade(f.skin, -16));
  r(ctx, KOPF_X + 0.2, KOPF_Y + 0.15, KOPF_B - 0.4, 0.6, shade(f.skin, 12));
  if (f.skeletal && dir !== 3) {
    r(ctx, KOPF_X + 0.6, KOPF_Y + 2.6, KOPF_B - 1.2, 0.5, shade(f.skin, -30));   // Kieferschatten
    r(ctx, KOPF_X + 0.9, KOPF_Y + 2.8, 0.28, 0.36, shade(f.skin, -44));          // Zahnluecken
    r(ctx, KOPF_X + 1.6, KOPF_Y + 2.8, 0.28, 0.36, shade(f.skin, -44));
    r(ctx, KOPF_X + 2.3, KOPF_Y + 2.8, 0.28, 0.36, shade(f.skin, -44));
  }
  // Haar/Kapuze bzw. Hut
  if (f.robe) {                                                // Kapuze
    const kl = KOPF_X - 0.35, kr = KOPF_X + KOPF_B + 0.35;
    ctx.fillStyle = f.hair; ctx.beginPath();
    ctx.moveTo(kl * U, (KOPF_Y + 2.2) * U);
    ctx.quadraticCurveTo(kl * U, (KOPF_Y - 0.7) * U, 8 * U, (KOPF_Y - 0.85) * U);
    ctx.quadraticCurveTo(kr * U, (KOPF_Y - 0.7) * U, kr * U, (KOPF_Y + 2.2) * U);
    ctx.lineTo((kr - 0.7) * U, (KOPF_Y + 1.2) * U);
    ctx.quadraticCurveTo(8 * U, (KOPF_Y + 0.05) * U, (kl + 0.7) * U, (KOPF_Y + 1.2) * U);
    ctx.closePath(); ctx.fill();
  } else if (f.hat) {
    // R207d (Autor: "sieht aus wie ein Cowboy - KEINE Huete, wenn dann Helm"):
    // hat zeichnet einen anliegenden HELM ohne Krempe. Ritter bekommen eine
    // Beckenhaube mit Nasal, alle anderen eine schlichte Kalotte.
    rund(ctx, KOPF_X - 0.15, KOPF_Y - 0.75, KOPF_B + 0.3, 2.4, 1.15, f.hat);      // Helmglocke
    r(ctx, KOPF_X + 0.1, KOPF_Y - 0.5, KOPF_B - 0.2, 0.42, shade(f.hat, 16));     // Lichtkante
    r(ctx, KOPF_X - 0.15, KOPF_Y + 1.3, KOPF_B + 0.3, 0.4, shade(f.hat, -18));    // Helmrand
    if (f.ritter) {
      r(ctx, 7.68, KOPF_Y + 0.5, 0.62, 1.7, shade(f.hat, -12));                   // Nasal
      r(ctx, KOPF_X + 0.4, KOPF_Y - 1.15, KOPF_B - 0.8, 0.45, shade(f.hat, -20)); // Kammansatz
    }
  } else {
    r(ctx, KOPF_X, KOPF_Y - 0.4, KOPF_B, 0.85, f.hair);
  }
  // Augen (dir 0/1/2; oben = Hinterkopf)
  if (dir !== 3) {
    const ac = f.augen ?? '#1c1410';
    const augL = KOPF_X + 0.65, augR = KOPF_X + KOPF_B - 1.3, augY = KOPF_Y + 1.35;
    r(ctx, augL, augY, 0.65, 0.58, ac);
    r(ctx, augR, augY, 0.65, 0.58, ac);
    if (f.augen) {                                             // Gluehen
      ctx.fillStyle = f.augen + '55';
      ctx.fillRect((augL - 0.25) * U, (augY - 0.25) * U, 1.15 * U, 1.1 * U);
      ctx.fillRect((augR - 0.25) * U, (augY - 0.25) * U, 1.15 * U, 1.1 * U);
    }
  }
  // R211: Schnabelmaske des Pestarztes - lederner Schnabel mitten im Gesicht,
  // die Augen werden zu runden Glaslinsen.
  if (f.schnabel && dir !== 3) {
    const lx = KOPF_X + 0.35, rx = KOPF_X + KOPF_B - 1.55, ly = KOPF_Y + 1.05;
    rund(ctx, lx, ly, 1.25, 1.15, 0.55, '#2e2620');            // Glaslinse links
    rund(ctx, rx, ly, 1.25, 1.15, 0.55, '#2e2620');
    r(ctx, lx + 0.25, ly + 0.3, 0.42, 0.42, '#8aa8b8');        // Glas-Glanz
    r(ctx, rx + 0.25, ly + 0.3, 0.42, 0.42, '#8aa8b8');
    ctx.fillStyle = '#4a3a28'; ctx.beginPath();                 // Schnabel
    ctx.moveTo(7.2 * U, (KOPF_Y + 1.9) * U);
    ctx.lineTo(8.8 * U, (KOPF_Y + 1.9) * U);
    ctx.lineTo(8.0 * U, (KOPF_Y + 4.0) * U);
    ctx.closePath(); ctx.fill();
    r(ctx, 7.55, KOPF_Y + 2.5, 0.8, 0.18, '#2e2318');          // Naht
    r(ctx, 7.7, KOPF_Y + 3.05, 0.55, 0.16, '#2e2318');
  }
  // R211: Strick des Gehaengten - Schlinge um den Hals, Ende baumelt.
  if (f.strick) {
    r(ctx, 5.6, 5.9 + bob, 4.8, 0.55, '#9a8a5e');              // Schlinge
    r(ctx, 5.6, 5.9 + bob, 4.8, 0.2, '#b8a878');
    r(ctx, 9.6, 6.3 + bob, 0.5, 2.6, '#9a8a5e');               // haengendes Ende
    rund(ctx, 9.45, 8.7 + bob, 0.8, 0.7, 0.3, '#8a7a50');      // Knoten
  }

  // Waffe. Zweihand zeichnet Klinge + beide Arme + Faeuste in einem Zug;
  // einhaendige Waffen sitzen am Ende des rechten Arms (R207c, Autor: "er
  // haelt das nicht richtig") und bekommen eine sichtbare Faust am Schaft.
  const langF = f.schwertLang ?? 1.0;
  // Wappenschild VOR der Waffe zeichnen (liegt am linken Arm, Waffe rechts).
  if (f.schild) hdSchild(ctx, bob);
  // R210 Kampf-Zauberer: Zauberstab in der LINKEN Hand (der Kristall wirkt in
  // den Schlagphasen mit - beim Zuschlagen flackert die Entladung auf).
  if (f.stabLinks) {
    hdStab(ctx, 3.0, bob + legR, schlagPhase);
    rund(ctx, 2.65, 8.9 + bob + legR, 1.6, 1.0, 0.35, f.skeletal ? '#e2dcc4' : shade(f.skin, -6));
  }
  if (zweihand) {
    hdZweihandGriff(ctx, f, bob, legL, legR, langF, schlagPhase);
  } else {
    const wx = 11.4, wy = bob + legL;
    // R209 Einhand-Schwung: Faust-Mittelpunkt als Drehpunkt, Waffe UND Faust
    // schwingen mit (Versatz je Phase), der Arm folgt nach dem Zeichnen.
    const faustX = wx + 0.5;
    const faustY = (f.weapon ? (FAUST_Y[f.weapon] ?? 8.9) : 8.9) + wy;
    let schwungDx = 0, schwungDy = 0;
    if (schwungProfil && f.weapon) {
      const delta = (f.weapon === 'stange' ? STOSS_DELTA : SCHWUNG_DELTA)[schlagPhase];
      schwungDx = delta.dx; schwungDy = delta.dy;
      ctx.save();
      ctx.translate(schwungDx * U, schwungDy * U);
      ctx.translate(faustX * U, faustY * U);
      ctx.rotate(schwungProfil[schlagPhase]);
      ctx.translate(-faustX * U, -faustY * U);
    }
    if (f.weapon === 'schwert') {
      hdSchwert(ctx, wx, 8.6 + wy, langF);
      rund(ctx, wx - 0.35, 8.0 + wy, 1.7, 1.0, 0.35, f.skeletal ? '#e2dcc4' : shade(f.skin, -6));
    } else if (f.weapon === 'haken') {
      hdHaken(ctx, wx, wy);
      rund(ctx, wx - 0.35, 8.4 + wy, 1.7, 1.0, 0.35, f.skeletal ? '#e2dcc4' : shade(f.skin, -6));
    } else if (f.weapon === 'axt') {
      hdAxt(ctx, wx, wy);
      rund(ctx, wx - 0.35, 8.2 + wy, 1.7, 1.0, 0.35, f.skeletal ? '#e2dcc4' : shade(f.skin, -6));
    } else if (f.weapon === 'wucht') {
      hdWucht(ctx, wx, wy);
      rund(ctx, wx - 0.35, 8.4 + wy, 1.7, 1.0, 0.35, f.skeletal ? '#e2dcc4' : shade(f.skin, -6));
    } else if (f.weapon === 'stab') {
      hdStab(ctx, wx, wy, schlagPhase);
      rund(ctx, wx - 0.3, 8.4 + wy, 1.6, 1.0, 0.35, f.skeletal ? '#e2dcc4' : shade(f.skin, -6));
    } else if (f.weapon === 'bogen') {
      hdBogen(ctx, wx, wy, schlagPhase);
      rund(ctx, wx - 0.9, 6.1 + wy, 1.5, 0.9, 0.35, f.skeletal ? '#e2dcc4' : shade(f.skin, -6));
    } else if (f.weapon === 'stange') {
      hdStange(ctx, wx, wy);
      rund(ctx, wx - 0.3, 8.2 + wy, 1.6, 1.0, 0.35, f.skeletal ? '#e2dcc4' : shade(f.skin, -6));
    } else if (f.weapon === 'keule') {
      hdKeule(ctx, wx, wy);
      rund(ctx, wx - 0.3, 8.6 + wy, 1.6, 1.0, 0.35, f.skeletal ? '#e2dcc4' : shade(f.skin, -6));
    } else if (f.weapon === 'hammer') {
      hdHammer(ctx, wx, wy);
      rund(ctx, wx - 0.3, 8.6 + wy, 1.6, 1.0, 0.35, f.skeletal ? '#e2dcc4' : shade(f.skin, -6));
    } else if (f.weapon === 'schaufel') {
      hdSchaufel(ctx, wx, wy);
      rund(ctx, wx - 0.3, 7.6 + wy, 1.6, 1.0, 0.35, f.skeletal ? '#e2dcc4' : shade(f.skin, -6));
    } else if (f.weapon === 'geissel') {
      hdGeissel(ctx, wx, wy);
      rund(ctx, wx - 0.35, 6.6 + wy, 1.6, 1.0, 0.35, f.skeletal ? '#e2dcc4' : shade(f.skin, -6));
    } else if (f.weapon === 'glocke') {
      hdGlocke(ctx, wx, wy);
      rund(ctx, wx - 0.3, 5.4 + wy, 1.5, 0.9, 0.35, f.skeletal ? '#e2dcc4' : shade(f.skin, -6));
    } else if (f.weapon === 'sack') {
      hdSack(ctx, wx - 0.5, wy);
    } else if (f.weapon === 'angel') {
      hdAngel(ctx, wx, wy);
    } else if (f.weapon === 'eimer') {
      hdEimer(ctx, wx - 0.5, wy);
    } else if (f.weapon === 'korb') {
      hdKorb(ctx, wx - 0.5, wy);
    }
    if (schwungProfil) {
      ctx.restore();
      // Schlagarm folgt der mitgeschwungenen Faust (Drehpunkt = Faustmitte,
      // darum wandert sie nur um den Phasen-Versatz).
      zeichneSchlagArm(ctx, f, 10.9, 7.2 + bob, faustX + schwungDx, faustY + schwungDy, 0.95);
    } else if (faustkampf) {
      // FAUSTSCHLAG (waffenlos / Tragegeraet): der rechte Arm stoesst vor,
      // eine grosse Faust am Ende - Ausholen, Treffer, Zurueckziehen.
      const ziel = [
        { x: 11.6, y: 7.9 + bob }, { x: 14.1, y: 7.1 + bob }, { x: 12.8, y: 7.6 + bob },
      ][schlagPhase];
      zeichneSchlagArm(ctx, f, 10.9, 7.2 + bob, ziel.x, ziel.y, f.massig ? 1.5 : 0.95);
      rund(ctx, ziel.x - 0.85, ziel.y - 0.55, 1.7, 1.1, 0.4, f.skeletal ? '#e2dcc4' : shade(f.skin, -6));
    }
  }

  ctx.restore();
}
