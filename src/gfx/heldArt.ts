// Detaillierte Helden-Figur (Runde 37): eigene 64x64-Zeichnung mit rundem
// Kopf, Kapuze, Umhang, getrennten Beinen samt Stiefeln und 4 Blickrichtungen
// + Gehschritt. Höhere Auflösung als die 32px-Dorf-/Gegner-Figuren, damit der
// Held klarer und detaillierter wirkt. Waffenlos (geschlagen wird per FX).

import { shade, type Dir } from './fallbackArt';
import type { HeldTier } from '../data/helden';

export const HELD_CELL = 64; // Kantenlänge einer Figur-Zelle

interface Pal {
  hautH: string; haut: string; hautS: string;
  wamsH: string; wams: string; wamsS: string;
  kapH: string; kap: string; kapS: string;
  bein: string; beinS: string; stiefel: string;
  umh: string; umhS: string;
  helm: boolean;            // platte: Helm statt Stoffkapuze
  metall: boolean;          // kette/platte: Glanzkante
}

const HAUT = { hautH: '#e6c79c', haut: '#d0a884', hautS: '#a07a52' };
const PALETTEN: Record<HeldTier, Pal> = {
  stoff: {
    ...HAUT,
    wamsH: '#9a4038', wams: '#7a2e28', wamsS: '#531e1a',
    kapH: '#48413a', kap: '#39332c', kapS: '#26221d',
    bein: '#3a2c1c', beinS: '#271e12', stiefel: '#1f1810',
    umh: '#332f28', umhS: '#23201a', helm: false, metall: false,
  },
  leder: {
    ...HAUT,
    wamsH: '#86532e', wams: '#6a4326', wamsS: '#482c16',
    kapH: '#5c4528', kap: '#48381f', kapS: '#2f2413',
    bein: '#3a2a18', beinS: '#271c10', stiefel: '#1d150c',
    umh: '#3a2d1c', umhS: '#271d12', helm: false, metall: false,
  },
  kette: {
    ...HAUT,
    wamsH: '#9aa0a8', wams: '#7a7d84', wamsS: '#565a61',
    kapH: '#868b92', kap: '#6a6d74', kapS: '#494c52',
    bein: '#4a4e57', beinS: '#33363d', stiefel: '#23252a',
    umh: '#322f2a', umhS: '#23211c', helm: false, metall: true,
  },
  platte: {
    ...HAUT,
    wamsH: '#bcc2ca', wams: '#9aa1a9', wamsS: '#6e757e',
    kapH: '#b2b8c0', kap: '#9298a0', kapS: '#646a72',
    bein: '#565d68', beinS: '#3a404a', stiefel: '#262a31',
    umh: '#3a2222', umhS: '#281717', helm: true, metall: true,
  },
};

function poly(ctx: CanvasRenderingContext2D, pts: number[][], c: string): void {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}
function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, c: string): void {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, c: string): void {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

// Ein Bein + Stiefel an Position lx, mit vor/zurück-Versatz dy (Gehschritt)
function bein(ctx: CanvasRenderingContext2D, p: Pal, lx: number, vor: number): void {
  const top = 39, len = 13 + vor;
  rr(ctx, lx - 3.2, top, 6.4, len, 2.4, p.bein);
  ctx.fillStyle = p.beinS; ctx.fillRect(lx + 0.6, top, 2.6, len); // Schattenseite
  // Stiefel
  const fy = top + len - 1;
  poly(ctx, [[lx - 3.4, fy], [lx + 3.2, fy], [lx + 5.6, fy + 4.5], [lx - 3.4, fy + 4.5]], p.stiefel);
  ctx.fillStyle = '#000'; ctx.globalAlpha = 0.25; ctx.fillRect(lx - 3.4, fy + 3.6, 9, 1); ctx.globalAlpha = 1;
}

function umhang(ctx: CanvasRenderingContext2D, p: Pal, sway: number): void {
  // hinter dem Körper, weitet sich nach unten, leichtes Wehen (sway)
  poly(ctx, [[26, 23], [38, 23], [44 + sway, 40], [46 + sway, 54], [18 - sway, 54], [20 - sway, 40]], p.umh);
  poly(ctx, [[32, 23], [38, 23], [44 + sway, 40], [46 + sway, 54], [32, 52]], p.umhS); // Faltenschatten
}

function rumpf(ctx: CanvasRenderingContext2D, p: Pal): void {
  // Wams: Schultern breit, Taille schmaler
  poly(ctx, [[22, 24], [42, 24], [40, 34], [38, 41], [26, 41], [24, 34]], p.wams);
  poly(ctx, [[32, 24], [42, 24], [40, 34], [38, 41], [32, 41]], p.wamsS); // rechte Hälfte dunkler
  ctx.fillStyle = p.wamsH; ctx.fillRect(25, 25, 4, 12);                   // Lichtkante links
  poly(ctx, [[31, 25], [33, 25], [32.5, 40], [31.5, 40]], p.wamsS);       // Mittelnaht
  if (p.metall) { ctx.fillStyle = '#eef3f8'; ctx.globalAlpha = 0.5; ctx.fillRect(26, 26, 3, 5); ctx.globalAlpha = 1; }
  // Gürtel + Schnalle
  rr(ctx, 25, 39.5, 14, 3, 1, '#3a2a18');
  ctx.fillStyle = '#c9a23a'; ctx.fillRect(31, 39.8, 2.4, 2.4);
}

function arm(ctx: CanvasRenderingContext2D, p: Pal, sx: number, vor: number, dunkel: boolean): void {
  rr(ctx, sx - 2.4, 26 + Math.max(0, -vor), 4.8, 13, 2.2, dunkel ? p.wamsS : p.wams);
  // Hand als Lederhandschuh in Armfarbe (Autorwunsch R40): nicht mehr nackte
  // Haut, sondern dieselbe Farbe wie der Ärmel, etwas abgedunkelt
  ell(ctx, sx, 39 + vor * 0.5, 2.7, 2.7, shade(dunkel ? p.wamsS : p.wams, -10)); // Handschuh
}

function auge(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#241813';
  ctx.beginPath(); ctx.ellipse(x, y, 0.95, 1.3, 0, 0, Math.PI * 2); ctx.fill();
}

// Kopf (Runde 39 verkleinert): die Kapuze schließt ENG um den Kopf (kein
// Ballon mehr), ein Hals verbindet Kopf und Rumpf. Gesicht je Blickrichtung.
function kopf(ctx: CanvasRenderingContext2D, p: Pal, dir: Dir): void {
  const cx = 32, cy = 14;
  // Hals
  ctx.fillStyle = shade(p.haut, -16); ctx.fillRect(cx - 2.4, cy + 5, 4.8, 5);
  // Kragen auf den Schultern
  poly(ctx, [[cx - 8, 26], [cx + 8, 26], [cx + 6, 21], [cx - 6, 21]], p.kapS);
  // Kapuze/Helm - enge Haube, deckt den Scheitel, vorn offen
  const hr = p.helm ? 6.4 : 7;
  ctx.fillStyle = p.kap;
  ctx.beginPath(); ctx.ellipse(cx, cy - 1, hr, hr + 0.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.kapH;
  ctx.beginPath(); ctx.ellipse(cx - 2.3, cy - 4, 2.5, 1.9, -0.5, 0, Math.PI * 2); ctx.fill();
  if (p.helm) {
    ctx.fillStyle = p.kapH; ctx.fillRect(cx - 0.8, cy - 8, 1.6, 6);
    if (p.metall) { ctx.globalAlpha = 0.5; ell(ctx, cx - 2.6, cy - 3, 1.1, 2.6, '#eef3f8'); ctx.globalAlpha = 1; }
  } else if (p.metall) {
    ctx.fillStyle = '#cfd4da'; for (let i = 0; i < 5; i++) ctx.fillRect(cx - 5.5 + i * 2.6, cy - 6 + (i % 2) * 2, 1, 1);
  }

  if (dir === 3) { // Rückansicht: nur Haube
    ctx.fillStyle = p.kapS;
    ctx.beginPath(); ctx.ellipse(cx, cy + 0.5, 4.6, 4.2, 0, 0, Math.PI * 2); ctx.fill();
    return;
  }

  // Gesichtsöffnung: dunkler Rahmen + Haut, je Richtung leicht versetzt
  const ox = dir === 1 ? -1.2 : dir === 2 ? 1.2 : 0;
  ctx.fillStyle = '#191310';
  ctx.beginPath(); ctx.ellipse(cx + ox, cy + 1, 4, 4.6, 0, 0, Math.PI * 2); ctx.fill();
  ell(ctx, cx + ox, cy + 1.3, 3.3, 3.9, p.haut);
  ell(ctx, cx + ox - 1, cy - 0.2, 1.2, 1.6, p.hautH);
  ctx.fillStyle = p.hautS;
  ctx.beginPath(); ctx.ellipse(cx + ox + (dir === 2 ? -1.7 : 1.7), cy + 1.7, 1.2, 2.4, 0, 0, Math.PI * 2); ctx.fill();
  if (dir === 0) { auge(ctx, cx - 1.6, cy + 0.8); auge(ctx, cx + 1.6, cy + 0.8); }
  if (dir === 1) { auge(ctx, cx - 2.2, cy + 0.8); auge(ctx, cx + 0.2, cy + 0.8); }
  if (dir === 2) { auge(ctx, cx + 2.2, cy + 0.8); auge(ctx, cx - 0.2, cy + 0.8); }
}

// Eine Figur in die aktuelle 64x64-Zelle zeichnen (Ursprung links oben).
export function drawHeld(ctx: CanvasRenderingContext2D, tier: HeldTier, dir: Dir, frame: number): void {
  const p = PALETTEN[tier];
  const step = frame % 4;            // 0 stehen, 1 links vor, 2 stehen, 3 rechts vor
  const bobUp = step === 1 || step === 3 ? -1.4 : 0;
  const sway = step === 1 ? 2 : step === 3 ? -2 : 0;

  // Bodenschatten
  ell(ctx, 32, 58, 14, 3.4, 'rgba(0,0,0,0.32)');

  ctx.save();
  ctx.translate(0, bobUp);

  umhang(ctx, p, sway);

  // Beine mit Gehschritt
  const lVor = step === 1 ? 1.5 : step === 3 ? -1.5 : 0;
  bein(ctx, p, 28, lVor);
  bein(ctx, p, 36, -lVor);

  // hinterer Arm (gegenläufig), Rumpf, vorderer Arm
  arm(ctx, p, 22, -lVor, true);
  rumpf(ctx, p);
  arm(ctx, p, 42, lVor, false);

  kopf(ctx, p, dir);

  ctx.restore();
}
