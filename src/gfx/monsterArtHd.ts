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
  return !('quad' in f) && !('chicken' in f);
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

  // Arme als gerade Balken von der Schulter zur jeweiligen Faust - schmaler
  // als die haengenden Arme, damit der Querarm kein Brustband bildet.
  const armCol = f.skeletal ? '#d8cfb0' : f.tunic;
  const arm = (sx: number, sy: number, hx: number, hy: number, br: number): void => {
    ctx.fillStyle = shade(armCol, -8);
    ctx.beginPath();
    ctx.moveTo(sx * U, sy * U);
    ctx.lineTo((sx + br) * U, sy * U);
    ctx.lineTo((hx + br) * U, hy * U);
    ctx.lineTo(hx * U, hy * U);
    ctx.closePath(); ctx.fill();
  };
  // rechter Arm: kurz von der rechten Schulter zur OBEREN Faust
  arm(10.9, 7.2 + bob + legL, gx - 0.35, gy - 0.6, 0.9);
  // linker Arm: quer ueber den GUERTEL (nicht ueber die Brust) zur unteren Faust
  arm(4.3, 7.9 + bob + legR, gx - 0.9, gy + 0.9, 0.85);
  // Faeuste auf der Wicklung
  const faust = f.skeletal ? '#e2dcc4' : shade(f.skin, -6);
  rund(ctx, gx - 0.3, gy - 0.85, 1.6, 0.9, 0.35, faust);
  rund(ctx, gx - 0.25, gy + 0.2, 1.6, 0.9, 0.35, shade(faust, -14));
}

// Langbogen (Schuetze): figurhoher Bogen mit Sehne und aufgelegtem Pfeil.
function hdBogen(ctx: CanvasRenderingContext2D, x: number, bob: number): void {
  const b = bob;
  ctx.strokeStyle = '#7a5c34'; ctx.lineWidth = 0.45 * U;
  ctx.beginPath();
  ctx.arc((x - 2.2) * U, (6.5 + b) * U, 4.6 * U, -1.05, 1.05); // Bogenrucken
  ctx.stroke();
  ctx.strokeStyle = '#d8d0c0'; ctx.lineWidth = 0.14 * U;       // Sehne
  ctx.beginPath();
  ctx.moveTo((x - 2.2 + 4.6 * Math.cos(-1.05)) * U, (6.5 + b + 4.6 * Math.sin(-1.05)) * U);
  ctx.lineTo((x - 2.2 + 4.6 * Math.cos(1.05)) * U, (6.5 + b + 4.6 * Math.sin(1.05)) * U);
  ctx.stroke();
  r(ctx, x - 1.2, 6.35 + b, 3.4, 0.3, '#8a6a3e');              // Pfeilschaft
  ctx.fillStyle = '#b8bcc4'; ctx.beginPath();                   // Pfeilspitze
  ctx.moveTo((x + 2.7) * U, (6.5 + b) * U);
  ctx.lineTo((x + 2.0) * U, (6.15 + b) * U);
  ctx.lineTo((x + 2.0) * U, (6.85 + b) * U);
  ctx.closePath(); ctx.fill();
  r(ctx, x - 1.5, 6.2 + b, 0.5, 0.6, '#c8c0a8');               // Befiederung
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

// Zauberstab: Holzschaft, Zierring, Kristall in Krallenfassung - er LEUCHTET
// (der spaetere Zauber-Schwung setzt hier an, R210).
function hdStab(ctx: CanvasRenderingContext2D, x: number, bob: number): void {
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
  ctx.fillStyle = '#a85ce033';                                  // Schein
  ctx.beginPath(); ctx.arc((x + 0.5) * U, (1.3 + b) * U, 1.8 * U, 0, 7); ctx.fill();
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

// --- Figur -----------------------------------------------------------------

// dir: 0 unten, 1 links, 2 rechts, 3 oben (wie der Bestand); frame 0..3 =
// Gehen. R209: frame 4..6 = SCHLAG-Phasen (Ausholen/Hieb/Ausklang) - vorerst
// nur fuer Zweihand-Traeger gezeichnet und nur zum Zeigen, die Spiel-
// Verdrahtung kommt nach der Autor-Abnahme.
export function drawMonsterHd(ctx: CanvasRenderingContext2D, name: string, dir: number, frame: number): void {
  const f = FIGURES[name] as FigureSpec | undefined;
  if (!f || 'quad' in (f as object) || 'chicken' in (f as object)) return;
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
  //
  // R207c: die Figur wird IMMER in Normalgroesse gezeichnet und sitzt im
  // Luft-Rahmen der Zelle. f.scale wird hier BEWUSST ignoriert - "groesser"
  // ist Sache der SZENE (sprite.setScale, z. B. boss 1.5 / elite 1.25).
  // Vorher wurde der Templer doppelt vergroessert (Zeichnung 1.5 UND Szene
  // 1.5) und lief oben aus der Zelle heraus - genau der abgeschnittene Kopf,
  // den der Autor im Spiel gesehen hat.
  ctx.translate(HD_LUFT_SEITE_U * U, HD_LUFT_OBEN_U * U);

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
  const zweihand = f.zweihand === true && f.weapon === 'schwert';
  const armCol = f.skeletal ? '#d8cfb0' : f.tunic;
  if (!zweihand) {
    const aw = f.massig ? 1.6 : 1, al = f.massig ? 3.8 : 3, ax = f.massig ? 3.3 : 4.1;
    rund(ctx, ax, 7 + bob + legR, aw, al, 0.4, shade(armCol, -8));
    rund(ctx, f.massig ? 11.1 : 10.9, 7 + bob + legL, aw, al, 0.4, shade(armCol, -8));
  }

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
    // R207d (Autor: "sieht aus wie ein Cowboy - KEINE Huete, wenn dann Helm"):
    // hat zeichnet jetzt einen anliegenden HELM ohne Krempe. Ritter bekommen
    // eine Beckenhaube mit Nasal, alle anderen eine schlichte Kalotte.
    rund(ctx, 5.3, 1.3 + bob, 5.4, 2.6, 1.4, f.hat);           // Helmglocke
    r(ctx, 5.5, 1.55 + bob, 4.6, 0.5, shade(f.hat, 16));       // Lichtkante
    r(ctx, 5.3, 3.5 + bob, 5.4, 0.45, shade(f.hat, -18));      // Helmrand
    if (f.ritter) {
      r(ctx, 7.65, 2.6 + bob, 0.7, 1.9, shade(f.hat, -12));    // Nasal
      r(ctx, 5.9, 0.9 + bob, 4.2, 0.5, shade(f.hat, -20));     // Kammansatz
    }
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

  // Waffe. Zweihand zeichnet Klinge + beide Arme + Faeuste in einem Zug;
  // einhaendige Waffen sitzen am Ende des rechten Arms (R207c, Autor: "er
  // haelt das nicht richtig") und bekommen eine sichtbare Faust am Schaft.
  const langF = f.schwertLang ?? 1.0;
  if (zweihand) {
    hdZweihandGriff(ctx, f, bob, legL, legR, langF, schlagPhase);
  } else {
    const wx = 11.4, wy = bob + legL;
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
      hdStab(ctx, wx, wy);
      rund(ctx, wx - 0.3, 8.4 + wy, 1.6, 1.0, 0.35, f.skeletal ? '#e2dcc4' : shade(f.skin, -6));
    } else if (f.weapon === 'bogen') {
      hdBogen(ctx, wx, wy);
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
    } else if (f.weapon === 'sack') {
      hdSack(ctx, wx - 0.5, wy);
    } else if (f.weapon === 'angel') {
      hdAngel(ctx, wx, wy);
    } else if (f.weapon === 'eimer') {
      hdEimer(ctx, wx - 0.5, wy);
    } else if (f.weapon === 'korb') {
      hdKorb(ctx, wx - 0.5, wy);
    }
  }

  ctx.restore();
}
