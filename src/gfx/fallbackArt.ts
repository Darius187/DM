// Programmatisch gezeichnete Fallback-Grafik (Masterprompt 5.1/5.3).
// Kleine Pixel-Figuren mit Kopf, Körper, Beinen, Waffe - erkennbar, charmant,
// konsistent. Wird nur genutzt, wenn keine echte Grafikdatei vorliegt.

import gfxConfig from '../data/gfx.json';
import { heldTier, type HeldTier } from '../data/helden';

export const SPRITE = gfxConfig.spriteSize;
export const TILE = gfxConfig.tileSize;
const PX = 2; // "Pixel"-Größe innerhalb eines 32er-Sprites

export interface FigureSpec {
  tunic: string;        // Körperfarbe
  skin: string;         // Haut
  hair: string;         // Haar/Kapuze
  legs: string;         // Beine
  hat?: string;         // Hut/Helm (optional)
  robe?: boolean;       // Robe statt Beine (Priester, Magdalena)
  // M1 Dorfwirtschaft: auch WERKZEUGE in der Hand (Hammer, Mehlsack, Angel,
  // Eimer, Kraeuterkorb) - jede Rolle traegt sichtbar ihr Handwerkszeug.
  weapon?: 'schwert' | 'axt' | 'stange' | 'wucht' | 'bogen' | 'keule' | 'stab'
    | 'hammer' | 'sack' | 'angel' | 'eimer' | 'korb' | null;
  scale?: number;       // Templer ist größer
  skeletal?: boolean;   // Skelett-Look (Schädel, Brustkorb)
  glow?: string;        // Schatten-Look (Umriss-Glühen)
  augen?: string;       // Augenfarbe (rot glühend bei Untoten, Runde 20)
  seuche?: boolean;     // Pest-Look: Beulen + Lumpen (Runde 40)
  ritter?: boolean;     // Templer-Politur: Schulterpanzer, Tabard-Kreuz, Helmvisier (Runde 41)
  massig?: boolean;     // Hünen-/Troll-Look: breite Schultern, dicke Arme, Hauer (Runde 54)
}

export type Dir = 0 | 1 | 2 | 3; // unten, links, rechts, oben

function p(ctx: CanvasRenderingContext2D, x: number, y: number, w = 1, h = 1, col?: string): void {
  if (col) ctx.fillStyle = col;
  ctx.fillRect(x * PX, y * PX, w * PX, h * PX);
}

// Umriss-Helfer (Grafik-Politur): zeichnet die Figur in ein Zwischenbild und
// legt eine dunkle 1-Pixel-Silhouette in vier Richtungen darunter - dadurch
// heben sich alle Figuren klar vom Boden ab.
function withOutline(ctx: CanvasRenderingContext2D, draw: (c: CanvasRenderingContext2D) => void): void {
  const off = document.createElement('canvas');
  off.width = 32;
  off.height = 32;
  const octx = off.getContext('2d')!;
  draw(octx);
  const sil = document.createElement('canvas');
  sil.width = 32;
  sil.height = 32;
  const sctx = sil.getContext('2d')!;
  sctx.drawImage(off, 0, 0);
  sctx.globalCompositeOperation = 'source-in';
  sctx.fillStyle = 'rgba(8,6,4,0.85)';
  sctx.fillRect(0, 0, 32, 32);
  // Umriss + Figur ERST in ein eigenes 32x32-Bild legen (auf die Zelle begrenzt),
  // dann EINMAL platzieren. So können die ±1px-Umriss-Versätze nicht über die
  // Zellgrenze in die Nachbar-Frames des Atlas „bluten" (Autorbug R58: dunkle
  // Flecken am rechten Rand mancher Gegner).
  const comp = document.createElement('canvas');
  comp.width = 32;
  comp.height = 32;
  const cctx = comp.getContext('2d')!;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) cctx.drawImage(sil, dx, dy);
  cctx.drawImage(off, 0, 0);
  ctx.drawImage(comp, 0, 0);
}

// Zeichnet eine humanoide Figur in ein 32x32-Feld (Ursprung links oben).
export function drawHumanoid(ctx: CanvasRenderingContext2D, f: FigureSpec, dir: Dir, frame: number): void {
  // Schlagschatten zuerst (ohne Umriss)
  const s = f.scale ?? 1;
  ctx.save();
  if (s !== 1) {
    ctx.translate(16 * (1 - s), 32 * (1 - s));
    ctx.scale(s, s);
  }
  ctx.fillStyle = `rgba(0,0,0,${gfxConfig.shadowAlpha})`;
  ctx.beginPath();
  ctx.ellipse(16, 28, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  withOutline(ctx, (c) => drawHumanoidParts(c, f, dir, frame));
}

function drawHumanoidParts(ctx: CanvasRenderingContext2D, f: FigureSpec, dir: Dir, frame: number): void {
  ctx.save();
  const s = f.scale ?? 1;
  if (s !== 1) {
    ctx.translate(16 * (1 - s), 32 * (1 - s));
    ctx.scale(s, s);
  }

  const step = frame % 4; // 0 stehen, 1 links vor, 2 stehen, 3 rechts vor
  const legL = step === 1 ? 1 : 0;
  const legR = step === 3 ? 1 : 0;
  const bob = step === 1 || step === 3 ? -1 : 0;

  // Beine / Robe
  if (f.robe) {
    p(ctx, 5, 9 + bob, 6, 4, f.tunic);
    p(ctx, 5, 9 + bob, 1, 4, shade(f.tunic, 12));
    p(ctx, 5, 13, 6, 1, shade(f.tunic, -22));
  } else {
    p(ctx, 6, 10 + bob, 2, 3 + legL, f.legs);
    p(ctx, 8, 10 + bob, 2, 3 + legR, f.legs);
    // Schuhe dunkler abgesetzt
    p(ctx, 6, 12 + bob + legL, 2, 1, shade(f.legs, -24));
    p(ctx, 8, 12 + bob + legR, 2, 1, shade(f.legs, -24));
  }
  // Körper: Licht von oben links, Schattenkante rechts, Gürtel
  p(ctx, 5, 6 + bob, 6, 4, f.tunic);
  p(ctx, 5, 6 + bob, 6, 1, shade(f.tunic, 18));
  p(ctx, 5, 7 + bob, 1, 3, shade(f.tunic, 10));
  p(ctx, 10, 7 + bob, 1, 3, shade(f.tunic, -16));
  if (!f.robe) p(ctx, 5, 9 + bob, 6, 1, shade(f.tunic, -30));
  if (f.skeletal) {
    // Brustkorb (Runde 40 detaillierter): dunkler Brustraum, Wirbelsäule,
    // drei Rippenpaare mit Lücken - in echten Pixeln für feinere Linien.
    const by = (6 + bob) * PX;
    ctx.fillStyle = shade(f.tunic, -38); ctx.fillRect(10, by, 12, 8);
    ctx.fillStyle = '#e6ddc2'; ctx.fillRect(15, by, 2, 8);            // Wirbelsäule
    for (let r = 0; r < 3; r++) {
      const ry = by + 1 + r * 2.4;
      ctx.fillRect(11, ry, 4, 1);                                     // linke Rippe
      ctx.fillRect(17, ry, 4, 1);                                     // rechte Rippe
    }
    ctx.fillStyle = '#cfc4a8'; ctx.fillRect(13, by + 7, 6, 1);        // Beckenkamm
  }
  // Pest-Beulen (Runde 40): geschwollene, dunkelrote Beulen an Hals und Brust
  if (f.seuche) {
    const sy = (6 + bob) * PX;
    for (const [bx, byo] of [[11, 1], [18, 3], [14, 5]] as Array<[number, number]>) {
      ctx.fillStyle = '#5a1414'; ctx.fillRect(bx, sy + byo, 2, 2);
      ctx.fillStyle = '#8a2a2a'; ctx.fillRect(bx, sy + byo, 1, 1);
    }
  }
  // Templer-Politur (Runde 41, dezent): ein blasses Tabard-Kreuz auf der Brust
  // und Schulterpanzer - macht aus der grauen Figur einen erkennbaren Ritter.
  if (f.ritter) {
    const by = (6 + bob) * PX;
    ctx.fillStyle = '#777068'; ctx.fillRect(13, by + 1, 6, 7);             // dezentes Tabard (nah am Wams)
    ctx.fillStyle = '#7a322a'; ctx.fillRect(15, by + 2, 2, 5);             // verblasstes Kreuz senkrecht
    ctx.fillStyle = '#7a322a'; ctx.fillRect(14, by + 3, 4, 1.4);           // Kreuz waagerecht
    ctx.fillStyle = '#3a3630'; ctx.fillRect(9, by, 3, 2);                  // Schulterpanzer links
    ctx.fillStyle = '#3a3630'; ctx.fillRect(20, by, 3, 2);                // Schulterpanzer rechts
    ctx.fillStyle = '#5a544c'; ctx.fillRect(9, by, 3, 1); ctx.fillRect(20, by, 3, 1); // Lichtkante
  }
  // Hünen-/Troll-Masse (Runde 54): wulstige Schultern + breiterer Brustkorb,
  // damit Riesen nicht wie hochskalierte Soldaten aussehen.
  if (f.massig) {
    const my = (6 + bob) * PX;
    ctx.fillStyle = shade(f.tunic, 12); ctx.fillRect(2 * PX, my, 3 * PX, 3 * PX);   // Schulterwulst links
    ctx.fillStyle = shade(f.tunic, -16); ctx.fillRect(11 * PX, my, 3 * PX, 3 * PX); // Schulterwulst rechts
    ctx.fillStyle = shade(f.tunic, -4); ctx.fillRect(4 * PX, my, 8 * PX, 4 * PX);   // breiterer Brustkorb
  }
  // Arme schwingen gegenläufig zu den Beinen (bei massig dicker und länger)
  const armCol = f.skeletal ? '#d8cfb0' : f.tunic;
  const aw = f.massig ? 2 : 1, al = f.massig ? 4 : 3, ax = f.massig ? 3 : 4;
  p(ctx, ax, 7 + bob + legR, aw, al, shade(armCol, -8));
  p(ctx, 11, 7 + bob + legL, aw, al, shade(armCol, -8));
  // Kopf mit Wangenschatten
  p(ctx, 5, 2 + bob, 6, 4, f.skin);
  p(ctx, 10, 3 + bob, 1, 3, shade(f.skin, -18));
  // Hauer/Stoßzähne unter den Augen (nur Front/Seite sichtbar)
  if (f.massig && dir !== 3) { ctx.fillStyle = '#f0ece0'; ctx.fillRect(6 * PX, (5 + bob) * PX, 1 * PX, 1 * PX); ctx.fillRect(9 * PX, (5 + bob) * PX, 1 * PX, 1 * PX); }
  // Haar/Kapuze/Hut mit Glanzkante
  if (f.hat) {
    p(ctx, 4, 1 + bob, 8, 2, f.hat);
    p(ctx, 5, 0 + bob, 6, 1, f.hat);
    p(ctx, 5, 0 + bob, 3, 1, shade(f.hat, 16));
  } else {
    p(ctx, 5, 1 + bob, 6, 2, f.hair);
    p(ctx, 5, 1 + bob, 3, 1, shade(f.hair, 18));
  }
  // Augen je Richtung - schlichte dunkle Augenhöhlen. Runde 41 (Autorwunsch):
  // KEINE rot glühenden Augen und KEINE Totenschädel-Gesichter mehr (sah nicht
  // gut aus) - nur noch dezente schwarze Augen, kein Mund/Kiefer. (Der
  // Grabschatten behält über f.augen seine glimmenden Augen als einziges Merkmal.)
  ctx.fillStyle = f.augen ?? (f.skeletal ? '#120a0a' : '#26180e');
  if (dir === 0) { p(ctx, 6, 4 + bob, 1, 1); p(ctx, 9, 4 + bob, 1, 1); }
  if (dir === 1) { p(ctx, 5, 4 + bob, 1, 1); p(ctx, 7, 4 + bob, 1, 1); }
  if (dir === 2) { p(ctx, 8, 4 + bob, 1, 1); p(ctx, 10, 4 + bob, 1, 1); }
  // dir 3 (oben): kein Gesicht, Hinterkopf
  if (dir === 3 && !f.hat) p(ctx, 5, 2 + bob, 6, 3, f.hair);

  // Waffe in der Hand (rechts, bei links-Blick links)
  if (f.weapon) drawHeldWeapon(ctx, f.weapon, dir, bob);
  if (f.glow) {
    ctx.strokeStyle = f.glow;
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(8, 2 * PX + bob * PX, 16, 24);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawHeldWeapon(ctx: CanvasRenderingContext2D, w: NonNullable<FigureSpec['weapon']>, dir: Dir, bob: number): void {
  const x = dir === 1 ? 2 : 12;
  switch (w) {
    case 'schwert':
      p(ctx, x, 4 + bob, 1, 5, '#b8bcc4');
      p(ctx, x - 0.5, 8 + bob, 2, 1, '#6a5430');
      break;
    case 'axt':
      p(ctx, x, 4 + bob, 1, 6, '#6a5430');
      p(ctx, x - 1, 4 + bob, 3, 2, '#9aa0a8');
      break;
    case 'stange':
      p(ctx, x, 1 + bob, 1, 11, '#6a5430');
      p(ctx, x - 1, 1 + bob, 3, 2, '#9aa0a8');
      break;
    case 'wucht':
      p(ctx, x, 4 + bob, 1, 6, '#6a5430');
      p(ctx, x - 1, 3 + bob, 3, 3, '#787068');
      break;
    case 'keule':
      p(ctx, x, 5 + bob, 1, 5, '#6a5430');
      break;
    case 'stab':
      // Zauberstab (Runde 50): Holzschaft mit Zierring und einem in zwei Krallen
      // gefassten Rauten-Kristall statt eines flachen Klotzes ('Mops'-Optik).
      p(ctx, x, 1 + bob, 1, 10, '#5a3c22');       // Holzschaft
      p(ctx, x, 6 + bob, 1, 1, '#9a7a44');        // Zierring am Schaft
      p(ctx, x - 1, 0 + bob, 1, 1, '#9a8a6a');    // linke Kralle
      p(ctx, x + 1, 0 + bob, 1, 1, '#9a8a6a');    // rechte Kralle
      p(ctx, x, -1 + bob, 1, 3, '#a85ce0');       // Kristall senkrecht
      p(ctx, x - 1, 0 + bob, 3, 1, '#a85ce0');    // Kristall waagerecht
      p(ctx, x, 0 + bob, 1, 1, '#e8c8ff');        // Glanzpunkt
      break;
    case 'bogen':
      ctx.strokeStyle = '#7a5c34';
      ctx.lineWidth = PX;
      ctx.beginPath();
      ctx.arc((x + 0.5) * PX, (7 + bob) * PX, 5 * PX, -1.1, 1.1);
      ctx.stroke();
      break;
    // --- Werkzeuge (M1 Dorfwirtschaft): jede Rolle traegt ihr Handwerkszeug ---
    case 'hammer':
      p(ctx, x, 5 + bob, 1, 5, '#6a5430');        // Stiel
      p(ctx, x - 1, 4 + bob, 3, 2, '#8a8f96');    // Kopf
      break;
    case 'sack':
      p(ctx, x - 1, 6 + bob, 3, 4, '#cfc4a8');    // Mehlsack
      p(ctx, x, 5 + bob, 1, 1, '#8a7a5a');        // Zugband
      break;
    case 'angel':
      p(ctx, x, 0 + bob, 1, 10, '#6a5430');       // Rute
      p(ctx, x + 1, 0 + bob, 1, 5, '#d8d0c0');    // Schnur
      break;
    case 'eimer':
      p(ctx, x - 1, 8 + bob, 3, 3, '#6a5430');    // Eimer
      p(ctx, x - 1, 7 + bob, 3, 1, '#8a8f96');    // Buegel
      break;
    case 'korb':
      p(ctx, x - 1, 7 + bob, 3, 3, '#9a7a44');    // Korb
      p(ctx, x - 1, 6 + bob, 3, 1, '#4a6a3a');    // Kraeuter obenauf
      break;
  }
}

// Vierbeiner (Wolf, Ratte, Schwein, Kuh, Hund, Pferd)
// mane = Mähne (Pferd), horns = Hörner (Kuh), snout = helles Maul (Kuh),
// longHead/longTail geben Pferd die längere Schnauze und den fließenden Schweif.
export interface QuadSpec {
  body: string; head: string; size: number; tail?: boolean; ears?: boolean; spots?: string;
  mane?: string; horns?: string; snout?: string; longHead?: boolean; longTail?: boolean;
}
export function drawQuadruped(ctx: CanvasRenderingContext2D, q: QuadSpec, dir: Dir, frame: number): void {
  ctx.fillStyle = `rgba(0,0,0,${gfxConfig.shadowAlpha})`;
  ctx.beginPath();
  ctx.ellipse(16, 27, 9 * q.size, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  withOutline(ctx, (c) => drawQuadrupedParts(c, q, dir, frame));
}

function drawQuadrupedParts(ctx: CanvasRenderingContext2D, q: QuadSpec, dir: Dir, frame: number): void {
  const flip = dir === 1;
  ctx.save();
  if (flip) { ctx.translate(32, 0); ctx.scale(-1, 1); }
  const step = frame % 4;
  const legA = step === 1 ? 1 : 0;
  const legB = step === 3 ? 1 : 0;
  const bw = Math.round(8 * q.size), bh = Math.round(4 * q.size);
  // Zentrieren statt fester Kante: große Tiere (Kuh, Pferd) ragten sonst
  // rechts aus dem 32er-Sprite - "halbes Pferd" (Fehlerbericht Runde 25)
  const bx = Math.max(1, Math.floor((16 - (bw + 3)) / 2) + 1);
  const by = 9 - bh;
  // Körper mit Lichtkante oben
  p(ctx, bx, by, bw, bh, q.body);
  p(ctx, bx, by, bw, 1, shade(q.body, 14));
  if (q.spots) { p(ctx, bx + 2, by + 1, 2, 2, q.spots); p(ctx, bx + 5, by, 2, 2, q.spots); }
  // Beine - große Tiere haben längere und vier statt zwei
  const legLen = q.size >= 1.2 ? 3 : 2;
  p(ctx, bx + 1, by + bh, 1, legLen + legA, shade(q.body, -20));
  p(ctx, bx + bw - 2, by + bh, 1, legLen + legB, shade(q.body, -20));
  if (q.size >= 1.2) {
    p(ctx, bx + 3, by + bh, 1, legLen + legB, shade(q.body, -28));
    p(ctx, bx + bw - 4, by + bh, 1, legLen + legA, shade(q.body, -28));
  }
  // Kopf - Pferd bekommt eine längere Schnauze (longHead), Kuh einen breiteren
  const hw = q.longHead ? 4 : 3;
  const hx = bx + bw - 1, hy = by - 1;
  // Mähne (Pferd): dunkler Streifen am Nacken hinter dem Kopf und auf der Stirn
  if (q.mane) { p(ctx, hx - 1, hy - 1, 1, 4, q.mane); p(ctx, hx, hy - 1, 1, 1, q.mane); }
  p(ctx, hx, hy, hw, 3, q.head);
  p(ctx, hx, hy, hw, 1, shade(q.head, 12)); // Lichtkante auf dem Kopf
  if (q.ears) { p(ctx, hx, hy - 1, 1, 1, q.head); p(ctx, hx + 2, hy - 1, 1, 1, q.head); }
  // Hörner (Kuh): helle Stummel oben an den Kopfecken
  if (q.horns) { p(ctx, hx, hy - 1, 1, 1, q.horns); p(ctx, hx + 2, hy - 1, 1, 1, q.horns); }
  // helles Maul (Kuh) bzw. Nüstern vorn an der Schnauze
  if (q.snout) p(ctx, hx + hw - 1, hy + 1, 1, 2, q.snout);
  p(ctx, hx + 1, hy + 1, 1, 1, '#1a0e08'); // Auge
  // Schwanz - Pferd hat einen langen, fließenden Schweif
  if (q.tail) p(ctx, bx - 1, by - (q.longTail ? 1 : 0), 1, q.longTail ? 5 : 2, shade(q.body, -14));
  ctx.restore();
}

// Huhn
export function drawChicken(ctx: CanvasRenderingContext2D, dir: Dir, frame: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(16, 26, 5, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  withOutline(ctx, (c) => drawChickenParts(c, dir, frame));
}

function drawChickenParts(ctx: CanvasRenderingContext2D, dir: Dir, frame: number): void {
  const flip = dir === 1;
  ctx.save();
  if (flip) { ctx.translate(32, 0); ctx.scale(-1, 1); }
  const peck = frame % 4 === 1 ? 1 : 0;
  p(ctx, 6, 9, 4, 3, '#e8e0d0');
  p(ctx, 9, 7 + peck, 2, 2, '#e8e0d0');
  p(ctx, 11, 8 + peck, 1, 1, '#d8842a');
  p(ctx, 9, 6 + peck, 1, 1, '#c03030');
  p(ctx, 7, 12, 1, 1, '#d8842a');
  p(ctx, 8, 12, 1, 1, '#d8842a');
  ctx.restore();
}

function clampByte(v: number): number { return Math.max(0, Math.min(255, v)); }
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = clampByte((n >> 16) + amt), g = clampByte(((n >> 8) & 255) + amt), b = clampByte((n & 255) + amt);
  return `rgb(${r},${g},${b})`;
}

// Figuren-Vorlagen für alle Sprite-Namen (Fallback-Kasten)
export const FIGURES: Record<string, FigureSpec | { quad: QuadSpec } | { chicken: true }> = {
  // Held (Runde 53, Autorwunsch): aussehen "wie der Hannes" (Pater Johannes),
  // nur leicht abgewandelt - bekapuzter/berockter Wanderer, graumeliertes Haar,
  // dunkelblaugraues Gewand. KEINE Waffe in der Hand (Schlag per Schwung-FX).
  spieler:   { tunic: '#34343f', skin: '#c8b090', hair: '#6a6a6a', legs: '#2a2a32', robe: true, weapon: null, scale: 1.18 },
  pest:      { tunic: '#5a7a3a', skin: '#9aa87a', hair: '#46602e', legs: '#3a4a26', weapon: null, seuche: true },
  skelett:   { tunic: '#cfc4a8', skin: '#e0d8c0', hair: '#cfc4a8', legs: '#b8ae90', weapon: 'schwert', skeletal: true },
  schuetze:  { tunic: '#b8a888', skin: '#d0c8b0', hair: '#b8a888', legs: '#a09070', weapon: 'bogen', skeletal: true },
  // Grabschatten (Runde 41): echter schwarzer Schatten statt buntem Männchen -
  // durchgehend nahezu schwarze Silhouette, nur die Augen glimmen. Wird in der
  // Szene zusätzlich halbtransparent gerendert und gleitet (kein Hüpfen).
  schatten:  { tunic: '#0c0a14', skin: '#0a0812', hair: '#08060f', legs: '#070510', weapon: null, glow: '#1a1026', augen: '#e84860' },
  templer:   { tunic: '#6a6258', skin: '#8a8278', hair: '#3a3430', legs: '#4a443c', weapon: 'schwert', hat: '#56504a', scale: 1.5, ritter: true },
  // Soldaten des Fürsten (Runde 51, Schlacht-Prototyp): Blau-Stahl, gepanzert
  soldat:    { tunic: '#3a4a6a', skin: '#c8b090', hair: '#2a2018', legs: '#2a3242', hat: '#6a6d74', weapon: 'schwert', ritter: true },
  bogensoldat: { tunic: '#3a4a6a', skin: '#c8b090', hair: '#2a2018', legs: '#2a3242', hat: '#5a6068', weapon: 'bogen' },
  // Riese/Troll (Runde 54, Helms-Klamm-Wunsch): hünenhaft, grünhäutig, Keule,
  // Hauer. Wird in der Schlacht zusätzlich groß skaliert (groesse in TYP).
  riese:     { tunic: '#5a4a30', skin: '#7a9a5a', hair: '#3a2a1a', legs: '#43381f', weapon: 'wucht', massig: true },
  // Untoter Riese: fahl-grauer Hüne mit glimmenden Augen
  untoter_riese: { tunic: '#8a8478', skin: '#9aa090', hair: '#6a6458', legs: '#6a6458', weapon: 'wucht', massig: true, skeletal: true, augen: '#e84860' },
  wolf:      { quad: { body: '#4a4440', head: '#3c3834', size: 1, tail: true, ears: true } },
  ratte:     { quad: { body: '#5a4a3a', head: '#4c3e30', size: 0.6, tail: true } },
  heinrich:  { tunic: '#7a4a2a', skin: '#c8b090', hair: '#4a3a26', legs: '#3a2c1c' },
  magdalena: { tunic: '#4a6a3a', skin: '#c8b090', hair: '#6a5a3a', legs: '#3a4a2a', robe: true, weapon: 'korb' },
  johannes:  { tunic: '#3a3a44', skin: '#c8b090', hair: '#6a6a6a', legs: '#2a2a32', robe: true },
  landherr:  { tunic: '#5a2a3a', skin: '#c8b090', hair: '#3a3026', legs: '#2c2018', hat: '#2a1c10' },
  schmied:   { tunic: '#4a3a30', skin: '#b89878', hair: '#241a10', legs: '#30241a', weapon: 'hammer' },
  mueller:   { tunic: '#b8b0a0', skin: '#c8b090', hair: '#8a7a5a', legs: '#6a6052', weapon: 'sack' },
  bauer1:    { tunic: '#6a5a3a', skin: '#c8b090', hair: '#4a3a22', legs: '#46381f', hat: '#8a7448' },
  bauer2:    { tunic: '#5a6248', skin: '#c8b090', hair: '#3a3226', legs: '#3c4030', hat: '#8a7448' },
  haendler:  { tunic: '#8a4a6a', skin: '#c8a888', hair: '#2a2018', legs: '#3a2a3a', hat: '#5a3048' },
  // Dorfvolk (Feedback-Runde 9): Berufe und Familien des 17. Jahrhunderts.
  // Eigene Namen je Figur, damit spätere Sprite-Pakete sie 1:1 ersetzen können.
  schulze:    { tunic: '#3a3a5a', skin: '#c8b090', hair: '#5a5048', legs: '#26222e', hat: '#1c1822' },
  baecker:    { tunic: '#d8d0c0', skin: '#cab294', hair: '#6a5a3a', legs: '#8a8276', hat: '#e8e0d0' },
  zimmermann: { tunic: '#7a5c34', skin: '#b89878', hair: '#3a2c1a', legs: '#4a3a24', weapon: 'axt' },
  schneider:  { tunic: '#5a3a6a', skin: '#c8b090', hair: '#46362a', legs: '#3a2a44' },
  hirte:      { tunic: '#6a6244', skin: '#c8b090', hair: '#7a5c34', legs: '#46412e', hat: '#8a7448', scale: 0.85 },
  magd:       { tunic: '#8a6a4a', skin: '#c8b090', hair: '#5c422a', legs: '#5c4830', robe: true, weapon: 'eimer' },
  waescherin: { tunic: '#7a8a9a', skin: '#c8b090', hair: '#8a7a5a', legs: '#4c5662', robe: true },
  wirtin:     { tunic: '#8a4a3a', skin: '#c8b090', hair: '#3a2c1a', legs: '#54302a', robe: true },
  frau1:      { tunic: '#6a7a4a', skin: '#c8b090', hair: '#6a5a3a', legs: '#46502e', robe: true },
  frau2:      { tunic: '#9a7a52', skin: '#cab294', hair: '#42362a', legs: '#5c4830', robe: true },
  witwe:      { tunic: '#3a3632', skin: '#c0a888', hair: '#8a8276', legs: '#2a2622', robe: true },
  kind1:      { tunic: '#7a6a4a', skin: '#d0b896', hair: '#8a6a3a', legs: '#4a3a24', scale: 0.65 },
  kind2:      { tunic: '#5a6a7a', skin: '#d0b896', hair: '#46362a', legs: '#3a4450', scale: 0.65 },
  // Runde 10: das Dorf bekommt Wirtschaft - jede Zunft eine eigene Figur
  bader:      { tunic: '#8a8276', skin: '#c8b090', hair: '#3a3026', legs: '#5a5448', hat: '#d8d0c0' },
  kuefer:     { tunic: '#6a4c28', skin: '#b89878', hair: '#4a3a26', legs: '#46341c' },
  weberin:    { tunic: '#4a6a8a', skin: '#c8b090', hair: '#6a5a3a', legs: '#34485c', robe: true },
  gerber:     { tunic: '#5c4a36', skin: '#b09070', hair: '#36281a', legs: '#423020' },
  hebamme:    { tunic: '#7a5a6a', skin: '#c8b090', hair: '#7a7268', legs: '#52404a', robe: true },
  kuester:    { tunic: '#44444e', skin: '#c8b090', hair: '#5a5048', legs: '#30303a', robe: true },
  fischer:    { tunic: '#3a5a6a', skin: '#b89878', hair: '#46362a', legs: '#2c4250', hat: '#5a6a4a', weapon: 'angel' },
  imker:      { tunic: '#9a8a52', skin: '#c8b090', hair: '#6a5a3a', legs: '#6a6038', hat: '#d8cfa0' },
  schaefer:   { tunic: '#7a7258', skin: '#b89878', hair: '#5a4a32', legs: '#54503c', hat: '#8a7448', weapon: 'stange' },
  // M1 Dorfwirtschaft (Autor-Roster): Holzfaeller + Vieh-Bauernfamilie B
  holzfaeller: { tunic: '#5c4a30', skin: '#b89878', hair: '#3a2c1a', legs: '#3c3020', weapon: 'axt' },
  bauer3:     { tunic: '#6a4e36', skin: '#c8b090', hair: '#3c2e1c', legs: '#443622', hat: '#7a6438' },
  bauer4:     { tunic: '#7a5a44', skin: '#cab294', hair: '#5c422a', legs: '#54402c', robe: true },
  huhn:      { chicken: true },
  schwein:   { quad: { body: '#d8a8a0', head: '#cc9a90', size: 0.9, tail: true } },
  schaf:     { quad: { body: '#e8e2d4', head: '#3a3026', size: 0.9, tail: true, ears: true } },
  // Kuh (Runde 51, Autorwunsch "mehr nach Kuh"): Hörner, helles Maul, Flecken
  kuh:       { quad: { body: '#e8e0d2', head: '#d8d0c0', size: 1.3, tail: true, spots: '#3a3026', horns: '#efe7d0', snout: '#d0a8a0' } },
  hund:      { quad: { body: '#7a6244', head: '#6a5438', size: 0.8, tail: true, ears: true } },
  // size 1,35: mehr passt samt Umriss-Kontur nicht ins 32er-Raster
  // Pferd (Runde 51, Autorwunsch "besser zeichnen"): Mähne, lange Schnauze, Schweif
  pferd:     { quad: { body: '#7a5230', head: '#6a4628', size: 1.35, tail: true, ears: true, mane: '#39271a', longHead: true, longTail: true } },
  // Lebender Toter (Runde 32): sieht aus wie ein Bewohner - nur die
  // glühend roten Augen verraten ihn
  lebender_toter: { tunic: '#6a6254', skin: '#cabfa8', hair: '#4a4036', legs: '#3e3a30', weapon: null },
};

// Helden-Aussehen nach Ruestungsstufe x Waffe (Feedback-Runde 32):
// vier sichtbare Stufen (Stoff/Leder/Kette/Platte), jede mit der getragenen
// Waffe in der Hand. Eigene Figurnamen `spieler_<stufe>_<waffe>`, damit jede
// Stufe spaeter 1:1 durch ein eigenes Sprite-Paket ersetzt werden kann (Hot-Swap).
// Held je Rüstungsstufe (Runde 52, Autorwunsch "Anthrazit wie die schwarzen
// Ritter"): waffenlos, heroisch, durchgehend dunkler Anthrazit-/Dunkelstahl-Ton,
// der mit der Stufe heller/metallischer wird. stoff = dunkles Wams, leder =
// dunkler Lederpanzer, kette = anthrazit-Kette, platte = Dunkelstahl-Platte.
// Held je Rüstungsstufe (Runde 53, Autorwunsch "wie der Hannes"): durchgehend
// der berockte Wanderer-Look von Pater Johannes (Robe, graumeliertes Haar), die
// Rüstung wächst nur über den Gewand-Ton mit. Leicht änderbar in einer Datei.
const SPIELER_STUFEN: Record<HeldTier, FigureSpec> = {
  stoff:  { tunic: '#34343f', skin: '#c8b090', hair: '#6a6a6a', legs: '#2a2a32', robe: true, weapon: null, scale: 1.18 },
  leder:  { tunic: '#3c3a40', skin: '#c8b090', hair: '#6e6e6e', legs: '#2c2a30', robe: true, weapon: null, scale: 1.18 },
  kette:  { tunic: '#46484f', skin: '#c8b090', hair: '#7a7a7a', legs: '#34363c', robe: true, weapon: null, scale: 1.2 },
  platte: { tunic: '#53565e', skin: '#c8b090', hair: '#8a8a8a', legs: '#3e4046', robe: true, weapon: null, scale: 1.22 },
};
for (const stufe of Object.keys(SPIELER_STUFEN) as HeldTier[]) {
  FIGURES[`spieler_${stufe}`] = SPIELER_STUFEN[stufe];
}

// Bewaffnete "Gefallene" (Runde 35): je Untoten-Typ eine sichtbare Waffe -
// klont die Basis-Figur und tauscht nur die Waffe (analog zum Helden).
const GEFALLENE_FIG_TYPEN = ['skelett', 'pest', 'lebender_toter'] as const;
const GEFALLENE_FIG_WAFFEN = ['schwert', 'axt', 'wucht', 'bogen', 'stab'] as const;
for (const t of GEFALLENE_FIG_TYPEN) {
  const basis = FIGURES[t] as FigureSpec;
  for (const w of GEFALLENE_FIG_WAFFEN) {
    FIGURES[`${t}_${w}`] = { ...basis, weapon: w };
  }
}

// Figurname des Helden je getragener Ruestung (Wert, null = nichts).
// Waffenlos (Runde 37): der Held trägt keine Waffe in der Hand.
export function spielerFigur(ruestwert: number | null): string {
  return `spieler_${heldTier(ruestwert)}`;
}
