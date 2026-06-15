// Detaillierte Helden-Figur (Runde 37): eigene 64x64-Zeichnung mit rundem
// Kopf, Kapuze, Umhang, getrennten Beinen samt Stiefeln und 4 Blickrichtungen
// + Gehschritt. Höhere Auflösung als die 32px-Dorf-/Gegner-Figuren, damit der
// Held klarer und detaillierter wirkt. Waffenlos (geschlagen wird per FX).

import { shade, type Dir } from './fallbackArt';
import type { HeldTier } from '../data/helden';
import { getHeldForm, type HeldForm } from '../data/heldForm';

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

// Rüstungsfarben heller/dunkler tönen (Figur-Editor: dunkle/helle Rüstung).
// Haut + Helm-/Metall-Flags bleiben unberührt.
function tintPal(p: Pal, hell: number): Pal {
  const s = (c: string) => shade(c, hell);
  return {
    ...p,
    wamsH: s(p.wamsH), wams: s(p.wams), wamsS: s(p.wamsS),
    kapH: s(p.kapH), kap: s(p.kap), kapS: s(p.kapS),
    bein: s(p.bein), beinS: s(p.beinS), stiefel: s(p.stiefel),
    umh: s(p.umh), umhS: s(p.umhS),
  };
}

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

const CX = 32; // Figurmitte (X) in der Zelle

// Ein Bein + Stiefel an Position lx, mit vor/zurück-Versatz vor (Gehschritt)
function bein(ctx: CanvasRenderingContext2D, p: Pal, f: HeldForm, lx: number, vor: number): void {
  const top = f.schulterY + f.rumpfH - 2, len = f.beinL + vor;
  const hw = f.beinB / 2;
  rr(ctx, lx - hw, top, f.beinB, len, 2.4, p.bein);
  ctx.fillStyle = p.beinS; ctx.fillRect(lx + hw * 0.3, top, hw * 0.8, len); // Schattenseite
  const fy = top + len - 1;
  poly(ctx, [[lx - hw - 0.2, fy], [lx + hw, fy], [lx + hw + 2.4, fy + 4.5], [lx - hw - 0.2, fy + 4.5]], p.stiefel);
  ctx.fillStyle = '#000'; ctx.globalAlpha = 0.25; ctx.fillRect(lx - hw - 0.2, fy + 3.6, f.beinB + 2.6, 1); ctx.globalAlpha = 1;
}

function umhang(ctx: CanvasRenderingContext2D, p: Pal, f: HeldForm, sway: number): void {
  const oy = f.schulterY - 1;
  const fullUy = f.schulterY + f.rumpfH + f.beinL - 0.5;      // Saum bis kurz über die Füße
  const uy = oy + (fullUy - oy) * f.capeLaenge;               // Länge regelbar
  const ow = f.schulterB - 4, uw = (f.schulterB + 8) * f.capeBreite; // Weite unten regelbar
  poly(ctx, [[CX - ow, oy], [CX + ow, oy], [CX + uw + sway, uy - 14], [CX + uw + 2 + sway, uy], [CX - uw - 2 - sway, uy], [CX - uw + sway, uy - 14]], p.umh);
  poly(ctx, [[CX, oy], [CX + ow, oy], [CX + uw + sway, uy - 14], [CX + uw + 2 + sway, uy], [CX, uy - 2]], p.umhS);
}

function rumpf(ctx: CanvasRenderingContext2D, p: Pal, f: HeldForm, gitter: boolean): void {
  const sy = f.schulterY, wy = sy + f.rumpfH, my = (sy + wy) / 2;
  const sb = f.schulterB, tb = f.tailleB, mb = (sb + tb) / 2;
  const wamsPfad = (): void => {
    ctx.beginPath();
    ctx.moveTo(CX - sb, sy); ctx.lineTo(CX + sb, sy); ctx.lineTo(CX + mb, my);
    ctx.lineTo(CX + tb, wy); ctx.lineTo(CX - tb, wy); ctx.lineTo(CX - mb, my); ctx.closePath();
  };
  // Wams: Schultern breit, Taille schmaler
  poly(ctx, [[CX - sb, sy], [CX + sb, sy], [CX + mb, my], [CX + tb, wy], [CX - tb, wy], [CX - mb, my]], p.wams);
  poly(ctx, [[CX, sy], [CX + sb, sy], [CX + mb, my], [CX + tb, wy], [CX, wy]], p.wamsS); // rechte Hälfte dunkler
  ctx.fillStyle = p.wamsH; ctx.fillRect(CX - sb + 3, sy + 1, 4, f.rumpfH - 5);            // Lichtkante links
  poly(ctx, [[CX - 1, sy + 1], [CX + 1, sy + 1], [CX + 0.5, wy - 1], [CX - 0.5, wy - 1]], p.wamsS); // Mittelnaht
  // Kettenhemd-Gittermuster: abwechselnd helle/dunkle Pixel, auf das Wams geklippt
  if (gitter) {
    ctx.save(); wamsPfad(); ctx.clip();
    for (let yy = sy; yy < wy; yy += 2) {
      for (let xx = CX - sb; xx < CX + sb; xx += 2) {
        ctx.fillStyle = ((xx + yy) & 3) === 0 ? 'rgba(238,243,248,0.22)' : 'rgba(0,0,0,0.26)';
        ctx.fillRect(xx, yy, 1, 1);
      }
    }
    ctx.restore();
  }
  if (p.metall && !gitter) { ctx.fillStyle = '#eef3f8'; ctx.globalAlpha = 0.5; ctx.fillRect(CX - sb + 4, sy + 2, 3, 5); ctx.globalAlpha = 1; }
  // Gürtel + Schnalle (Breite + Farbe regelbar)
  const bh = (tb + 1) * f.guertelBreite;
  rr(ctx, CX - bh, wy - 1.5, 2 * bh, 3, 1, f.farben.guertel ?? '#3a2a18');
  ctx.fillStyle = '#c9a23a'; ctx.fillRect(CX - 1.2, wy - 1.2, 2.4, 2.4);
}

function arm(ctx: CanvasRenderingContext2D, p: Pal, f: HeldForm, sx: number, vor: number, dunkel: boolean): void {
  const top = f.schulterY + 2 + Math.max(0, -vor), hw = f.armB / 2;
  rr(ctx, sx - hw, top, f.armB, f.armL, 2.2, dunkel ? p.wamsS : p.wams);
  // Hand als Lederhandschuh in Armfarbe (Autorwunsch R40)
  ell(ctx, sx, top + f.armL + vor * 0.5, hw + 0.3, hw + 0.3, shade(dunkel ? p.wamsS : p.wams, -10));
}

function auge(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = '#241813';
  ctx.beginPath(); ctx.ellipse(x, y, 0.95 * s, 1.3 * s, 0, 0, Math.PI * 2); ctx.fill();
}

// Kopf (parametrisiert, Runde 40): Größe/Höhe kommen aus der HeldForm, das
// Gesicht skaliert mit. Die Kapuze schließt eng um den Kopf (kein Ballon).
function kopf(ctx: CanvasRenderingContext2D, p: Pal, f: HeldForm, dir: Dir): void {
  const cx = CX, cy = f.kopfY, r = f.kopfR, s = r / 5.8; // s = Gesichts-Skala
  // Hals zur Schulterlinie
  ctx.fillStyle = shade(p.haut, -16); ctx.fillRect(cx - 2.4 * s, cy + r * 0.8, 4.8 * s, f.schulterY - (cy + r * 0.8) + 2);
  // Kragen auf den Schultern
  poly(ctx, [[cx - r - 1, f.schulterY + 2], [cx + r + 1, f.schulterY + 2], [cx + r - 1, f.schulterY - 3], [cx - r + 1, f.schulterY - 3]], p.kapS);
  // Kapuze/Helm - enge Haube
  const hr = p.helm ? r * 0.92 : r;
  ctx.fillStyle = p.kap;
  ctx.beginPath(); ctx.ellipse(cx, cy - 1, hr, hr + 0.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.kapH;
  ctx.beginPath(); ctx.ellipse(cx - r * 0.4, cy - r * 0.7, 2.5 * s, 1.9 * s, -0.5, 0, Math.PI * 2); ctx.fill();
  if (p.helm) {
    ctx.fillStyle = p.kapH; ctx.fillRect(cx - 0.8, cy - r - 1.5, 1.6, r * 1.0);
    if (p.metall) { ctx.globalAlpha = 0.5; ell(ctx, cx - r * 0.45, cy - r * 0.5, 1.1 * s, 2.6 * s, '#eef3f8'); ctx.globalAlpha = 1; }
  } else if (p.metall) {
    ctx.fillStyle = '#cfd4da'; for (let i = 0; i < 5; i++) ctx.fillRect(cx - r * 0.95 + i * (r * 0.45), cy - r + (i % 2) * 2, 1, 1);
  }

  if (dir === 3) { // Rückansicht: nur Haube
    ctx.fillStyle = p.kapS;
    ctx.beginPath(); ctx.ellipse(cx, cy + 0.5, r * 0.8, r * 0.72, 0, 0, Math.PI * 2); ctx.fill();
    return;
  }

  // Gesichtsöffnung: dunkler Rahmen + Haut, je Richtung leicht versetzt.
  // gesichtOffen skaliert die Öffnung (klein = mehr verdeckt).
  const ox = dir === 1 ? -1.2 * s : dir === 2 ? 1.2 * s : 0;
  const go = f.gesichtOffen;
  const fcx = cx + ox, fcy = cy + 1;
  const frx = (4 * s * 0.7 + r * 0.18) * go, fry = (4.6 * s * 0.7 + r * 0.2) * go;
  ctx.fillStyle = '#191310';
  ctx.beginPath(); ctx.ellipse(fcx, fcy, frx, fry, 0, 0, Math.PI * 2); ctx.fill();
  ell(ctx, fcx, cy + 1.3, 3.3 * s * go, 3.9 * s * go, p.haut);
  ell(ctx, fcx - 1 * s * go, cy - 0.2, 1.2 * s * go, 1.6 * s * go, p.hautH);
  ctx.fillStyle = p.hautS;
  ctx.beginPath(); ctx.ellipse(fcx + (dir === 2 ? -1.7 : 1.7) * s * go, cy + 1.7, 1.2 * s * go, 2.4 * s * go, 0, 0, Math.PI * 2); ctx.fill();
  if (go > 0.45) {
    if (dir === 0) { auge(ctx, cx - 1.6 * s, cy + 0.8, s); auge(ctx, cx + 1.6 * s, cy + 0.8, s); }
    if (dir === 1) { auge(ctx, cx - 2.2 * s, cy + 0.8, s); auge(ctx, cx + 0.2 * s, cy + 0.8, s); }
    if (dir === 2) { auge(ctx, cx + 2.2 * s, cy + 0.8, s); auge(ctx, cx - 0.2 * s, cy + 0.8, s); }
  }
  // Modulares Visier: senkt sich von oben über das Gesicht, lässt einen
  // Augenschlitz frei (Figur-Editor, Runde 40)
  if (f.visier > 0) {
    ctx.save();
    ctx.beginPath(); ctx.ellipse(fcx, fcy, frx + 0.4, fry + 0.4, 0, 0, Math.PI * 2); ctx.clip();
    const steel = p.metall ? '#9aa1aa' : shade(p.kap, 22);
    const visTop = fcy - fry, visBot = visTop + f.visier * 2 * fry;
    ctx.fillStyle = steel; ctx.fillRect(fcx - frx - 0.5, visTop - 0.5, frx * 2 + 1, visBot - visTop + 0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(fcx - frx, visTop + 0.4, frx * 2, 0.7); // Lichtkante
    const slitY = cy + 0.8;
    if (visBot > slitY - 0.5) { ctx.fillStyle = '#0c0907'; ctx.fillRect(fcx - frx, slitY - 0.7, frx * 2, 1.3); } // Augenschlitz
    ctx.restore();
  }
}

// Eine Figur in die aktuelle 64x64-Zelle zeichnen (Ursprung links oben).
export function drawHeld(ctx: CanvasRenderingContext2D, tier: HeldTier, dir: Dir, frame: number): void {
  const f = getHeldForm();
  // Palette: erst Helligkeit tönen, dann Farb-Überschreibungen je Teil
  const p: Pal = f.ruestHell ? tintPal(PALETTEN[tier], f.ruestHell) : { ...PALETTEN[tier] };
  const fb = f.farben;
  if (fb.wams) { p.wams = fb.wams; p.wamsH = shade(fb.wams, 20); p.wamsS = shade(fb.wams, -24); }
  if (fb.cape) { p.umh = fb.cape; p.umhS = shade(fb.cape, -22); }
  if (fb.kapuze) { p.kap = fb.kapuze; p.kapH = shade(fb.kapuze, 18); p.kapS = shade(fb.kapuze, -22); }
  const step = frame % 4;            // 0 stehen, 1 links vor, 2 stehen, 3 rechts vor
  const bobUp = step === 1 || step === 3 ? -1.4 : 0;
  const sway = step === 1 ? 2 : step === 3 ? -2 : 0;

  // Bodenschatten
  ell(ctx, CX, 58, 14, 3.4, 'rgba(0,0,0,0.32)');

  ctx.save();
  ctx.translate(0, bobUp);

  // Goldenes Leuchten epischer Rüstungen (Figur-Editor, Runde 40): weicher
  // Schein hinter der Figur, gebacken in die Zelle
  if (f.leuchten > 0) {
    for (const [r2, a2] of [[19, 0.10], [13, 0.16], [8, 0.2]] as const) {
      ell(ctx, CX, 36, r2, r2 * 1.25, `rgba(244,206,90,${a2})`);
    }
  }

  umhang(ctx, p, f, sway);

  // Beine mit Gehschritt - Spreizung an der Taille
  const lVor = step === 1 ? 1.5 : step === 3 ? -1.5 : 0;
  const spreiz = Math.max(2.4, f.tailleB * 0.65);
  bein(ctx, p, f, CX - spreiz, lVor);
  bein(ctx, p, f, CX + spreiz, -lVor);

  // hinterer Arm (gegenläufig), Rumpf, vorderer Arm - an den Schultern
  arm(ctx, p, f, CX - f.schulterB, -lVor, true);
  rumpf(ctx, p, f, tier === 'kette' && f.kettenGitter > 0);
  arm(ctx, p, f, CX + f.schulterB, lVor, false);

  kopf(ctx, p, f, dir);

  ctx.restore();
}
