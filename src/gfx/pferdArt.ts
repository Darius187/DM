// Prozedurales Pferd-Sprite in vier Richtungen (Ravensmoor, Runde 66). LINKS/
// RECHTS nutzen die bewaehrte Seitenansicht aus reitArt.ts (drawGalopp, nach
// rechts, 64x48) - fuer LINKS wird gespiegelt. VORNE und HINTEN sind neue, gut
// lesbare 3/4-Ansichten in derselben erdigen Palette und mit demselben Reiter-
// Look. Aus drei parallelen Entwuerfen ausgewaehlt + verfeinert (DECISIONS R66).
//
// Geometrie: drawGalopp zeichnet in 64x48, Bodenlinie y~=41, Koerpermitte x=30.
// Wir betten sie mittig in die PFERD-Zelle ein, sodass die Hufe auf der Boden-
// linie PFERD_H-3 stehen.

import { drawGalopp } from './reitArt';

type Ctx = CanvasRenderingContext2D;

export const PFERD_W = 80; // Zellbreite
export const PFERD_H = 60; // Zellhoehe

// Erdige Pferde-Palette (passt exakt zu drawGalopp in reitArt.ts).
const FELL = '#6a4a2a';
const FELL_DUNKEL = '#4a3018';
const FELL_HELL = '#836046';
const MAEHNE = '#2e2012';
const HUF = '#1a120a';
const MAUL = '#5a3c20';
const AUGE = '#100a06';

// Reiter wie Held 'leder'.
const UMHANG = '#3a2d1c';
const UMHANG_S = '#271d12';
const KAPUZE = '#48381f';
const KAPUZE_S = '#2f2413';
const HAUT = '#d0a884';

// Bodenlinie in der Zelle (Hufe stehen hier auf).
const GROUND = PFERD_H - 3;
const MID = PFERD_W / 2;

// --- Hilfsformen -----------------------------------------------------------

function ell(ctx: Ctx, x: number, y: number, rx: number, ry: number, c: string): void {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function poly(ctx: Ctx, pts: number[][], c: string): void {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

// Vertikaler Hub einer Galopp-Pose (Schwebe-Phase hebt den Koerper kurz an).
function galoppHub(frame: number, lauf: boolean): number {
  if (!lauf) return 0;
  const c = (frame % 6) / 6;
  return -Math.abs(Math.sin(c * Math.PI * 2)) * 2;
}

// Vorder-/Hinter-Beinpaar in 3/4-Ansicht: zwei keulenfoermige Beine mit Huf.
// xL/xR sind die Huefthorizontale, top der Ansatz, len die Beinlaenge, swing
// der frame-abhaengige Versatz (ein Bein vor, eins zurueck), farbe das Fell.
function beinPaar(
  ctx: Ctx,
  xL: number,
  xR: number,
  top: number,
  len: number,
  breite: number,
  swing: number,
  farbe: string,
  schatten: string,
): void {
  // Linkes Bein zieht in +swing, rechtes in -swing (gegenlaeufig = Galopp).
  zeichneBein(ctx, xL, top, len, breite, swing, farbe, schatten);
  zeichneBein(ctx, xR, top, len, breite, -swing, farbe, schatten);
}

function zeichneBein(
  ctx: Ctx,
  x: number,
  top: number,
  len: number,
  breite: number,
  swing: number,
  farbe: string,
  schatten: string,
): void {
  // Hub des Hufes wenn das Bein nach vorn schwingt (positiver swing = angehoben).
  const lift = swing > 0 ? swing * 0.9 : 0;
  const fx = x + swing;
  const fyTop = top;
  const fyBot = top + len - lift;
  const hw = breite / 2;
  // Keule: oben breit am Ansatz, unten schmaler zum Huf.
  poly(
    ctx,
    [
      [x - hw, fyTop],
      [x + hw, fyTop],
      [fx + hw * 0.6, fyBot],
      [fx - hw * 0.6, fyBot],
    ],
    farbe,
  );
  // Schattenkante an der Innenseite.
  poly(
    ctx,
    [
      [x + hw * 0.1, fyTop],
      [x + hw, fyTop],
      [fx + hw * 0.6, fyBot],
      [fx + hw * 0.1, fyBot],
    ],
    schatten,
  );
  // Huf.
  ctx.fillStyle = HUF;
  ctx.fillRect(fx - hw * 0.7, fyBot - 1, hw * 1.4, 2.4);
}

// --- VORNE (dir 0): laeuft zum Betrachter, Kopf unten/vorn -----------------

function drawVorne(ctx: Ctx, frame: number, reiter: boolean, lauf: boolean): void {
  const hub = galoppHub(frame, lauf);
  const c = (frame % 6) / 6;
  const swing = lauf ? Math.sin(c * Math.PI * 2) * 3 : 0;

  const bodyY = GROUND - 22 + hub; // Schulter-/Brusthoehe
  const brustY = bodyY + 6;

  // Hinterbeine (weiter oben/hinten, dunkler, leicht schmaler) - zuerst.
  beinPaar(ctx, MID - 7, MID + 7, bodyY + 4, GROUND - (bodyY + 4), 6, swing * 0.6, FELL_DUNKEL, '#3a2614');

  // Kruppe/Ruecken hinter der Brust (angedeutet, dunkler, schmal oben).
  ell(ctx, MID, bodyY - 1, 12, 7, FELL_DUNKEL);

  // Brustkorb (breite, runde Brust nach vorn).
  ell(ctx, MID, brustY, 14, 11, FELL);
  // Lichtseite (links oben).
  ell(ctx, MID - 4, brustY - 3, 8, 6, FELL_HELL);
  // Schattenseite (rechts, dunklere Fuellung statt Outline).
  poly(
    ctx,
    [
      [MID + 2, brustY - 9],
      [MID + 14, brustY - 1],
      [MID + 13, brustY + 7],
      [MID + 4, brustY + 9],
    ],
    FELL_DUNKEL,
  );
  // Brustteilung (Mittellinie als dunkler Keil).
  poly(
    ctx,
    [
      [MID - 1.5, brustY - 8],
      [MID + 1.5, brustY - 8],
      [MID + 1, brustY + 9],
      [MID - 1, brustY + 9],
    ],
    FELL_DUNKEL,
  );

  // Vorderbeine (vor der Brust, hell) - gegenlaeufig zum Galopp.
  beinPaar(ctx, MID - 9, MID + 9, brustY + 5, GROUND - (brustY + 5), 7, swing, FELL, FELL_DUNKEL);

  if (reiter) drawReiterVorne(ctx, bodyY);

  // Hals + Kopf (nach unten/vorn zum Betrachter geneigt) - ueber der Brust.
  const halsY = brustY + 2;
  // Hals (breiter Keil von der Brust nach unten-vorn).
  poly(
    ctx,
    [
      [MID - 5, halsY],
      [MID + 5, halsY],
      [MID + 4, halsY + 12],
      [MID - 4, halsY + 12],
    ],
    FELL,
  );
  poly(
    ctx,
    [
      [MID + 1, halsY],
      [MID + 5, halsY],
      [MID + 4, halsY + 12],
      [MID + 1, halsY + 12],
    ],
    FELL_DUNKEL,
  );
  // Maehne (dunkler Streifen oben am Hals).
  poly(
    ctx,
    [
      [MID - 2, halsY - 1],
      [MID + 2, halsY - 1],
      [MID + 1.5, halsY + 11],
      [MID - 1.5, halsY + 11],
    ],
    MAEHNE,
  );

  const kopfY = halsY + 15;
  // Kopf (laenglich nach unten, Schnauze vorn).
  ell(ctx, MID, kopfY, 6.5, 8, FELL);
  ell(ctx, MID - 2, kopfY - 2, 3.5, 4.5, FELL_HELL);
  // Schattenseite des Kopfes.
  poly(
    ctx,
    [
      [MID + 1, kopfY - 7],
      [MID + 6.5, kopfY - 2],
      [MID + 6, kopfY + 5],
      [MID + 1, kopfY + 7],
    ],
    FELL_DUNKEL,
  );
  // Schnauze/Maul (heller Lederton unten).
  ell(ctx, MID, kopfY + 6, 4.5, 3.5, MAUL);
  // Nuestern.
  ctx.fillStyle = HUF;
  ctx.fillRect(MID - 2.4, kopfY + 6, 1.6, 1.6);
  ctx.fillRect(MID + 0.8, kopfY + 6, 1.6, 1.6);
  // Augen (zwei, vorne).
  ell(ctx, MID - 3.6, kopfY - 1, 1.3, 1.5, AUGE);
  ell(ctx, MID + 3.6, kopfY - 1, 1.3, 1.5, AUGE);
  // Ohren (zwei, oben am Kopf).
  poly(ctx, [[MID - 6, kopfY - 6], [MID - 3.5, kopfY - 10], [MID - 2.5, kopfY - 5]], FELL);
  poly(ctx, [[MID + 6, kopfY - 6], [MID + 3.5, kopfY - 10], [MID + 2.5, kopfY - 5]], FELL_DUNKEL);
}

function drawReiterVorne(ctx: Ctx, bodyY: number): void {
  const rx = MID;
  const ry = bodyY - 6;
  // Umhang/Koerper (breiter Kegel auf dem Ruecken).
  poly(
    ctx,
    [
      [rx - 8, ry + 10],
      [rx - 6, ry],
      [rx + 6, ry],
      [rx + 8, ry + 10],
    ],
    UMHANG,
  );
  // Schattenseite rechts.
  poly(
    ctx,
    [
      [rx, ry],
      [rx + 6, ry],
      [rx + 8, ry + 10],
      [rx, ry + 10],
    ],
    UMHANG_S,
  );
  // Beine seitlich am Pferd.
  ctx.fillStyle = UMHANG_S;
  ctx.fillRect(rx - 11, ry + 6, 3, 8);
  ctx.fillRect(rx + 8, ry + 6, 3, 8);
  // Kapuze + Kopf.
  ell(ctx, rx, ry - 3, 5, 5.5, KAPUZE);
  ell(ctx, rx + 2, ry - 3, 2.5, 4, KAPUZE_S);
  // Gesichtsoeffnung mit Haut.
  ell(ctx, rx, ry - 2, 2.6, 3, '#191310');
  ell(ctx, rx, ry - 2, 2, 2.4, HAUT);
}

// --- HINTEN (dir 1): laeuft weg, Hinterteil + Schweif zum Betrachter --------

function drawHinten(ctx: Ctx, frame: number, reiter: boolean, lauf: boolean): void {
  const hub = galoppHub(frame, lauf);
  const c = (frame % 6) / 6;
  const swing = lauf ? Math.sin(c * Math.PI * 2) * 3 : 0;

  const bodyY = GROUND - 22 + hub;
  const kruppeY = bodyY + 6;

  // Vorderbeine (vorn/oben, dunkler weil hinter der Kruppe) - zuerst.
  beinPaar(ctx, MID - 7, MID + 7, bodyY + 3, GROUND - (bodyY + 3), 6, swing * 0.6, FELL_DUNKEL, '#3a2614');

  // Hals-/Kopfansatz oben angedeutet (weg vom Betrachter, klein + dunkel).
  ell(ctx, MID, bodyY - 4, 7, 5, FELL_DUNKEL);

  // Kruppe (breite, runde Hinterhand).
  ell(ctx, MID, kruppeY, 15, 12, FELL);
  // Lichtseite (oben).
  ell(ctx, MID - 3, kruppeY - 4, 9, 6, FELL_HELL);
  // Schattenseite rechts (dunkle Kantenfuellung).
  poly(
    ctx,
    [
      [MID + 3, kruppeY - 10],
      [MID + 15, kruppeY - 2],
      [MID + 13, kruppeY + 8],
      [MID + 4, kruppeY + 10],
    ],
    FELL_DUNKEL,
  );
  // Pofalte (Mittellinie der Kruppe).
  poly(
    ctx,
    [
      [MID - 1.5, kruppeY - 9],
      [MID + 1.5, kruppeY - 9],
      [MID + 1, kruppeY + 10],
      [MID - 1, kruppeY + 10],
    ],
    FELL_DUNKEL,
  );

  // Hinterbeine (vor der Kruppe, hell) - gegenlaeufig.
  beinPaar(ctx, MID - 10, MID + 10, kruppeY + 6, GROUND - (kruppeY + 6), 7, swing, FELL, FELL_DUNKEL);

  if (reiter) drawReiterHinten(ctx, bodyY);

  // Schweif (haengt mittig ueber die Kruppe zum Betrachter, weht beim Galopp).
  const tw = lauf ? Math.sin(c * Math.PI * 2) * 3 : 0;
  ctx.strokeStyle = MAEHNE;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(MID, kruppeY - 4);
  ctx.quadraticCurveTo(MID + tw, kruppeY + 6, MID + tw * 1.4, kruppeY + 16);
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#1c130a';
  ctx.beginPath();
  ctx.moveTo(MID, kruppeY - 2);
  ctx.quadraticCurveTo(MID + tw, kruppeY + 7, MID + tw * 1.4, kruppeY + 15);
  ctx.stroke();
}

function drawReiterHinten(ctx: Ctx, bodyY: number): void {
  const rx = MID;
  const ry = bodyY - 6;
  // Umhang von hinten (breiter Ruecken-Kegel).
  poly(
    ctx,
    [
      [rx - 9, ry + 11],
      [rx - 6, ry],
      [rx + 6, ry],
      [rx + 9, ry + 11],
    ],
    UMHANG,
  );
  poly(
    ctx,
    [
      [rx, ry],
      [rx + 6, ry],
      [rx + 9, ry + 11],
      [rx, ry + 11],
    ],
    UMHANG_S,
  );
  // Kapuze von hinten (geschlossen, kein Gesicht).
  ell(ctx, rx, ry - 3, 5, 5.5, KAPUZE);
  ell(ctx, rx + 2, ry - 3, 2.5, 4, KAPUZE_S);
  ell(ctx, rx, ry - 1, 3, 3, KAPUZE_S);
}

// --- LINKS/RECHTS: bewaehrte Seitenansicht aus reitArt.ts -------------------
// drawGalopp zeichnet 64x48 nach rechts, Bodenlinie y~=41 (Huf bis ~42),
// Koerpermitte x=30. Wir versetzen sie mittig auf unsere Bodenlinie.

const SIDE_DX = MID - 30;         // Koerpermitte 30 -> PFERD-Mitte
const SIDE_DY = GROUND - 42;      // Huf-Unterkante 42 -> Bodenlinie

function drawSeite(ctx: Ctx, frame: number, reiter: boolean, lauf: boolean, spiegeln: boolean): void {
  // Im Stand ein ruhiger Frame ohne Schwebe (Frame 0 = Doppelstuetze, Hub 0).
  // drawGalopp hat keinen reinen Standmodus, deshalb nutzen wir Frame 0.
  const f = lauf ? frame % 6 : 0;
  ctx.save();
  if (spiegeln) {
    ctx.translate(PFERD_W, 0);
    ctx.scale(-1, 1);
    ctx.translate(SIDE_DX, SIDE_DY);
  } else {
    ctx.translate(SIDE_DX, SIDE_DY);
  }
  // drawGalopp ruft clearRect(0,0,64,48) RELATIV zur Transformation auf. In der
  // Welt wird das Pferd auf ein Offscreen-Canvas gerendert -> der clearRect
  // loescht nur das Offscreen, nicht die Welt. reiter steuert den Reiter (R66).
  drawGalopp(ctx, f, reiter);
  ctx.restore();
}

// --- Export-Vertrag --------------------------------------------------------

export function drawPferd(
  ctx: CanvasRenderingContext2D,
  dir: number,
  frame: number,
  reiter: boolean,
  lauf: boolean,
): void {
  // KEIN interner Bodenschatten: der Aufrufer setzt den Schatten einheitlich
  // (in der Welt via kontaktSchatten) - sonst doppelter Schatten bei vorne/hinten
  // und gar keiner bei der Seite (drawGalopp.clearRect loescht ihn dort).
  switch (dir) {
    case 0:
      drawVorne(ctx, frame, reiter, lauf);
      break;
    case 1:
      drawHinten(ctx, frame, reiter, lauf);
      break;
    case 2:
      drawSeite(ctx, frame, reiter, lauf, true); // Profil nach links (gespiegelt)
      break;
    case 3:
    default:
      drawSeite(ctx, frame, reiter, lauf, false); // Profil nach rechts (Original)
      break;
  }

  ctx.globalAlpha = 1;
}