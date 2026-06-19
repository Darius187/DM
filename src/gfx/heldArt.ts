// Detaillierte Helden-Figur (Runde 37): eigene 64x64-Zeichnung mit rundem
// Kopf, Kapuze, Umhang, getrennten Beinen samt Stiefeln und 4 Blickrichtungen
// + Gehschritt. Höhere Auflösung als die 32px-Dorf-/Gegner-Figuren, damit der
// Held klarer und detaillierter wirkt. Waffenlos (geschlagen wird per FX).

import { shade, type Dir } from './fallbackArt';
import type { HeldTier } from '../data/helden';
import { getHeldForm, type HeldForm } from '../data/heldForm';
import type { WeaponClass } from '../data/types';

// Waffenklasse, die der Held in der Hand hält/schwingt (R54)
export type WaffenKlasse = WeaponClass;

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
  // Kettenhemd: VERSETZTE Ringreihen (Autorbug R40: das alte Gitter sah aus wie
  // eine Steppjacke). Jeder Ring = heller Reflex + Schatten darunter, jede zweite
  // Reihe um einen halben Ring versetzt -> Maschen-Optik statt Karos.
  if (gitter) {
    ctx.save(); wamsPfad(); ctx.clip();
    for (let row = 0, yy = sy - 1; yy < wy; yy += 2, row++) {
      const off = (row % 2) ? 1 : 0;
      for (let xx = CX - sb + off; xx < CX + sb; xx += 2) {
        ctx.fillStyle = 'rgba(222,230,240,0.6)'; ctx.fillRect(xx, yy, 1, 1);        // Ringreflex
        ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(xx + 0.4, yy + 1, 1, 0.9); // Ringschatten
      }
    }
    ctx.restore();
  }
  if (p.metall && !gitter) { ctx.fillStyle = shade('#eef3f8', f.ruestHell); ctx.globalAlpha = 0.5; ctx.fillRect(CX - sb + 4, sy + 2, 3, 5); ctx.globalAlpha = 1; }
  // Rost-Patina + Verschmutzung (Runde 40) - auf das Wams geklippt, ortsfest
  if (f.rost > 0 || f.schmutz > 0) {
    ctx.save(); wamsPfad(); ctx.clip();
    if (f.rost > 0) {
      for (let yy = sy; yy < wy; yy++) for (let xx = Math.floor(CX - sb); xx < CX + sb; xx++) {
        const hsh = (((xx * 73856093) ^ (yy * 19349663)) >>> 8) & 0xff;
        if (hsh / 255 < f.rost * 0.2) { ctx.fillStyle = (hsh & 1) ? 'rgba(124,62,28,0.55)' : 'rgba(92,46,20,0.6)'; ctx.fillRect(xx, yy, 1, 1); }
      }
    }
    if (f.schmutz > 0) {
      for (let k = 0; k < 5; k++) {
        const yy = wy - 1 - k;
        ctx.fillStyle = `rgba(28,22,14,${f.schmutz * (0.5 - k * 0.08)})`;
        ctx.fillRect(CX - sb, yy, sb * 2, 1);
      }
    }
    ctx.restore();
  }
  // Gürtel + Schnalle (Breite + Farben regelbar - auch die Schnalle, Autorwunsch R40)
  const bh = (tb + 1) * f.guertelBreite;
  rr(ctx, CX - bh, wy - 1.5, 2 * bh, 3, 1, f.farben.guertel ?? '#3a2a18');
  ctx.fillStyle = f.farben.schnalle ?? '#c9a23a'; ctx.fillRect(CX - 1.2, wy - 1.2, 2.4, 2.4);
}

// Schulterplatten/Pauldrons (Runde 40): 0 keine, 1 schlicht, 2 massiv verziert
function pauldrons(ctx: CanvasRenderingContext2D, p: Pal, f: HeldForm): void {
  if (f.schultern <= 0) return;
  const sy = f.schulterY, sb = f.schulterB, gross = f.schultern >= 2;
  const r = gross ? 5.6 : 3.9;
  for (const side of [-1, 1] as const) {
    const x = CX + side * (sb + (gross ? 0.6 : -0.4));
    ctx.fillStyle = f.farben.schulter ?? (p.metall ? shade('#9aa1aa', f.ruestHell) : shade(p.wams, 10));
    ctx.beginPath(); ctx.ellipse(x, sy + 1.5, r, r * 0.9, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shade(p.wams, -26); ctx.fillRect(x - r, sy + 1, r * 2, 1.1); // Unterkante
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x - r + 1, sy - r * 0.6, r * 0.7, 1); // Lichtkante
    if (gross) { ctx.fillStyle = f.farben.schnalle ?? '#c9a23a'; ctx.fillRect(x - 0.8, sy - 2, 1.6, 1.6); } // Niete/Verzierung
  }
}

function arm(ctx: CanvasRenderingContext2D, p: Pal, f: HeldForm, sx: number, vor: number): void {
  const top = f.schulterY + 2 + Math.max(0, -vor), hw = f.armB / 2;
  // BEIDE Ärmel gleiche Farbe (Autorbug R40: vorher vorne/hinten verschieden hell)
  rr(ctx, sx - hw, top, f.armB, f.armL, 2.2, p.wams);
  ctx.fillStyle = p.wamsS; ctx.fillRect(sx + hw * 0.3, top, hw * 0.6, f.armL); // dezente Schattenkante (gleiche Grundfarbe)
  // BEIDE Handschuhe gleiche Farbe (eigene Handschuhfarbe oder aus dem Wams)
  ell(ctx, sx, top + f.armL + vor * 0.5, hw + 0.3, hw + 0.3, f.farben.hand ?? shade(p.wams, -14));
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
    if (p.metall) { ctx.globalAlpha = 0.5; ell(ctx, cx - r * 0.45, cy - r * 0.5, 1.1 * s, 2.6 * s, shade('#eef3f8', f.ruestHell)); ctx.globalAlpha = 1; }
  } else if (p.metall) {
    ctx.fillStyle = shade('#cfd4da', f.ruestHell); for (let i = 0; i < 5; i++) ctx.fillRect(cx - r * 0.95 + i * (r * 0.45), cy - r + (i % 2) * 2, 1, 1);
  }

  if (dir === 3) { // Rückansicht: nur Haube
    ctx.fillStyle = p.kapS;
    ctx.beginPath(); ctx.ellipse(cx, cy + 0.5, r * 0.8, r * 0.72, 0, 0, Math.PI * 2); ctx.fill();
    return;
  }

  // Gesichtsöffnung: dunkler Rahmen + Haut, je Richtung leicht versetzt.
  // gesichtOffen skaliert die Öffnung (klein = mehr verdeckt).
  // Seitenansicht (1/2): Gesicht stark zur Laufrichtung verschoben (Profil),
  // damit nicht das Frontgesicht zu sehen ist (Autorbug R54: "schaut nach vorne
  // mit beiden Augen, wenn er links/rechts läuft").
  const seite = dir === 1 || dir === 2;
  const face = dir === 1 ? -1 : 1;                          // Profil-Blickrichtung
  const ox = seite ? face * 1.9 * s : 0;
  const go = f.gesichtOffen;
  const fcx = cx + ox, fcy = cy + 1;
  const frx = (4 * s * 0.7 + r * 0.18) * go * (seite ? 0.78 : 1), fry = (4.6 * s * 0.7 + r * 0.2) * go;
  ctx.fillStyle = '#191310';
  ctx.beginPath(); ctx.ellipse(fcx, fcy, frx, fry, 0, 0, Math.PI * 2); ctx.fill();
  ell(ctx, fcx, cy + 1.3, 3.3 * s * go * (seite ? 0.8 : 1), 3.9 * s * go, p.haut);
  ell(ctx, fcx - 1 * s * go, cy - 0.2, 1.2 * s * go, 1.6 * s * go, p.hautH);
  ctx.fillStyle = p.hautS;
  ctx.beginPath(); ctx.ellipse(fcx + (dir === 2 ? -1.7 : 1.7) * s * go, cy + 1.7, 1.2 * s * go, 2.4 * s * go, 0, 0, Math.PI * 2); ctx.fill();
  // Profil-Nase: nur ein kleiner Höcker (R54 Autorwunsch: kürzer, ~1px weniger)
  if (seite && go > 0.4 && f.visier < 0.55) {
    const nx = fcx + face * (frx + 0.2), ny = cy + 1.6;
    poly(ctx, [[nx - face * 0.3 * s, ny - 1.1 * s], [nx + face * 0.8 * s, ny], [nx - face * 0.3 * s, ny + 1.1 * s]], p.haut);
  }
  if (go > 0.45) {
    if (dir === 0) { auge(ctx, cx - 1.6 * s, cy + 0.8, s); auge(ctx, cx + 1.6 * s, cy + 0.8, s); }
    else { auge(ctx, fcx + face * 0.7 * s, cy + 0.8, s); }   // Profil: nur EIN Auge, vorne
  }
  // Modulares Visier: senkt sich von oben über das Gesicht, lässt einen
  // Augenschlitz frei (Figur-Editor, Runde 40)
  if (f.visier > 0) {
    ctx.save();
    ctx.beginPath(); ctx.ellipse(fcx, fcy, frx + 0.4, fry + 0.4, 0, 0, Math.PI * 2); ctx.clip();
    const steel = f.farben.visier ?? (p.metall ? shade('#9aa1aa', f.ruestHell) : shade(p.kap, 22));
    const visTop = fcy - fry, visBot = visTop + f.visier * 2 * fry;
    ctx.fillStyle = steel; ctx.fillRect(fcx - frx - 0.5, visTop - 0.5, frx * 2 + 1, visBot - visTop + 0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(fcx - frx, visTop + 0.4, frx * 2, 0.7); // Lichtkante
    const slitY = cy + 0.8;
    if (visBot > slitY - 0.5) { ctx.fillStyle = '#0c0907'; ctx.fillRect(fcx - frx, slitY - 0.7, frx * 2, 1.3); } // Augenschlitz
    ctx.restore();
  }
}

// --- Seitenansicht (Profil, Runde 54, Autorwunsch "Seitenansichten der Geh-
// Animation") -------------------------------------------------------------
// Bisher zeigte der Held beim Seitwärtsgehen die Frontfigur. Hier ein echtes
// Profil: schmaler Rumpf, ein nahes + ein fernes (dunkleres) Bein/Arm, die
// gegenläufig schwingen, Umhang weht nach HINTEN. face = Laufrichtung
// (+1 rechts, -1 links).

// Profil-Bein: Stiefelspitze zeigt in Laufrichtung. back dunkelt das ferne Bein.
function seiteBein(ctx: CanvasRenderingContext2D, p: Pal, f: HeldForm, xOff: number, face: number, back: boolean): void {
  const top = f.schulterY + f.rumpfH - 2, len = f.beinL;
  const bw = f.beinB + 0.6, x = CX + xOff, hw = bw / 2;
  rr(ctx, x - hw, top, bw, len, 2.4, back ? shade(p.bein, -16) : p.bein);
  if (!back) { ctx.fillStyle = p.beinS; ctx.fillRect(x - hw + bw * 0.55, top, hw * 0.7, len); } // Schattenkante hinten
  // Stiefel: Ferse hinten, Spitze nach vorn (in face-Richtung)
  const fy = top + len - 1, st = back ? shade(p.stiefel, -12) : p.stiefel;
  poly(ctx, [[x - face * hw, fy], [x + face * hw, fy], [x + face * (hw + 3.2), fy + 4.6], [x - face * hw, fy + 4.6]], st);
  ctx.fillStyle = '#000'; ctx.globalAlpha = 0.22; ctx.fillRect(x - hw - 0.4, fy + 3.8, bw + 3.4, 1); ctx.globalAlpha = 1;
}

// Profil-Arm: ein einzelner schwingender Arm mit Handschuh.
function seiteArm(ctx: CanvasRenderingContext2D, p: Pal, f: HeldForm, xOff: number, back: boolean): void {
  const top = f.schulterY + 2, hw = f.armB / 2, x = CX + xOff;
  rr(ctx, x - hw, top, f.armB, f.armL, 2.2, back ? shade(p.wams, -18) : p.wams);
  const hand = f.farben.hand ?? shade(p.wams, -14);
  ell(ctx, x, top + f.armL, hw + 0.3, hw + 0.3, back ? shade(hand, -12) : hand);
}

// Profil-Rumpf: schmaler als die Front, leicht nach vorn geneigt, mit Gürtel.
function seiteRumpf(ctx: CanvasRenderingContext2D, p: Pal, f: HeldForm, face: number, gitter: boolean): void {
  const sy = f.schulterY, wy = sy + f.rumpfH;
  const w = Math.max(f.tailleB + 1.5, f.schulterB * 0.6);     // deutlich schmaler im Profil
  const lean = face * 1.4;                                     // Brust voran
  const pts = [[CX - w + lean, sy], [CX + w + lean, sy], [CX + w * 0.88, wy], [CX - w * 0.88, wy]];
  poly(ctx, pts, p.wams);
  // vordere Kante heller (Brust), hintere dunkler (Rücken)
  poly(ctx, [[CX + lean, sy], [CX + w + lean, sy], [CX + w * 0.88, wy], [CX, wy]], face > 0 ? p.wamsH : p.wamsS);
  poly(ctx, [[CX - w + lean, sy], [CX + lean, sy], [CX, wy], [CX - w * 0.88, wy]], face > 0 ? p.wamsS : p.wamsH);
  if (gitter) {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.clip();
    for (let row = 0, yy = sy - 1; yy < wy; yy += 2, row++) {
      const off = (row % 2) ? 1 : 0;
      for (let xx = CX - w; xx < CX + w; xx += 2) {
        ctx.fillStyle = 'rgba(222,230,240,0.55)'; ctx.fillRect(xx + off, yy, 1, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(xx + off + 0.4, yy + 1, 1, 0.9);
      }
    }
    ctx.restore();
  }
  // Gürtel
  rr(ctx, CX - w * 0.88, wy - 1.5, w * 1.76, 3, 1, f.farben.guertel ?? '#3a2a18');
  ctx.fillStyle = f.farben.schnalle ?? '#c9a23a'; ctx.fillRect(CX + lean * 0.5 - 1.2, wy - 1.2, 2.4, 2.4);
}

// Profil-Umhang: weht hinter dem Helden her (entgegen der Laufrichtung).
function seiteUmhang(ctx: CanvasRenderingContext2D, p: Pal, f: HeldForm, face: number, flutter: number): void {
  const oy = f.schulterY - 1;
  const len = (f.schulterY + f.rumpfH + f.beinL - 0.5 - oy) * f.capeLaenge;
  const uy = oy + len, back = -face;                          // Saum zeigt nach hinten
  const spread = (f.schulterB + 4) * f.capeBreite;
  const tipX = CX + back * (spread + flutter);
  poly(ctx, [[CX, oy], [CX + back * 2.5, oy], [tipX, uy - 12], [tipX + back * 2, uy], [CX + back * 2.5, uy]], p.umh);
  poly(ctx, [[CX + back * 2.5, oy], [tipX, uy - 12], [tipX + back * 2, uy], [CX + back * 2.5, uy]], p.umhS);
}

// Profil-Schulterplatte (nur die nahe, sichtbare Seite).
function seitePauldron(ctx: CanvasRenderingContext2D, p: Pal, f: HeldForm, face: number): void {
  if (f.schultern <= 0) return;
  const gross = f.schultern >= 2, r = gross ? 5.6 : 3.9;
  const x = CX + face * (Math.max(f.tailleB + 1.5, f.schulterB * 0.6) - 0.4);
  ctx.fillStyle = f.farben.schulter ?? (p.metall ? shade('#9aa1aa', f.ruestHell) : shade(p.wams, 10));
  ctx.beginPath(); ctx.ellipse(x, f.schulterY + 1.5, r, r * 0.9, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x - r + 1, f.schulterY - r * 0.6, r * 0.7, 1);
}

// Ausgerüstete Waffe in der Hand zeichnen (R54, Autorwunsch). Von der Hand (hx,hy)
// entlang des Klingenwinkels ang. So schwingt JE NACH ausgerüsteter Waffe das
// Richtige mit (Schwert/Axt/Kolben/Stange/Wucht/Stab); Bogen wird nicht geschwungen.
function zeichneWaffe(ctx: CanvasRenderingContext2D, hx: number, hy: number, ang: number, waffe: WaffenKlasse | null): void {
  if (!waffe || waffe === 'bogen') return;
  const fx = Math.cos(ang), fy = Math.sin(ang) * 0.85;
  const px = -Math.sin(ang), py = Math.cos(ang) * 0.85;
  const P = (d: number, o = 0): [number, number] => [hx + fx * d + px * o, hy + fy * d + py * o];
  const seg = (a: [number, number], b: [number, number], w: number, col: string): void => {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.lineWidth = 1;
  };
  const stahl = '#cfd6e0', stahlK = '#eef3f8', holz = '#5a4327', eisen = '#4a4e55';
  if (waffe === 'schwert') {
    seg(P(-2.5), P(1), 3.6, holz);                     // Griff
    seg(P(1, -3.8), P(1, 3.8), 1.7, stahlK);           // Parierstange
    seg(P(1), P(19), 2.7, stahl); seg(P(1), P(19), 1.1, stahlK);   // lange Klinge + Licht
  } else if (waffe === 'stab') {
    seg(P(-3), P(15), 2.4, holz);
    ctx.fillStyle = '#8a6ad0'; const k = P(16); ctx.beginPath(); ctx.arc(k[0], k[1], 2.4, 0, 7); ctx.fill();
  } else if (waffe === 'stange') {
    seg(P(-4), P(15), 2.2, holz);                      // Schaft
    seg(P(14), P(18), 2.2, stahl); seg(P(14), P(18), 0.9, stahlK);  // Spitze
  } else {
    // axt / kolben / wucht: Stiel + schwerer Kopf nahe der Spitze
    seg(P(-2), P(12), 3, holz);
    const k = P(13);
    if (waffe === 'axt') {
      ctx.fillStyle = stahl;
      ctx.beginPath(); const a = P(11, 0), b = P(16, 4), c = P(15, 8), d = P(10, 4);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = eisen; ctx.beginPath(); ctx.arc(k[0], k[1], waffe === 'wucht' ? 3.4 : 2.8, 0, 7); ctx.fill();
      ctx.fillStyle = '#6a6e75'; ctx.beginPath(); ctx.arc(k[0] - 1, k[1] - 1, 1, 0, 7); ctx.fill();
    }
  }
}

// Waffe in Ruhe (Gehen/Stehen): hängt nach unten an der aktiven Hand.
function zeichneWaffeRuhend(ctx: CanvasRenderingContext2D, f: HeldForm, x: number, waffe: WaffenKlasse | null): void {
  if (!waffe || waffe === 'bogen') return;
  zeichneWaffe(ctx, x, f.schulterY + f.armL + 1, Math.PI / 2 + 0.12, waffe);
}

interface Schlag { ang: number; sweep: number; r: number; sense: number; face: number }

// 2-Knochen-IK (R54): findet den Ellenbogen, sodass Ober-/Unterarm (l1,l2) von
// der Schulter (sx,sy) zur Hand (hx,hy) führen. bend (+/-1) bestimmt die Seite,
// auf die der Ellenbogen knickt - so spiegelt sich der Schlag links/rechts und
// der Arm sieht natürlich geknickt aus, statt unnatürlich verdreht.
function ik2(sx: number, sy: number, hx: number, hy: number, l1: number, l2: number, bend: number): { ex: number; ey: number; hx: number; hy: number } {
  let dx = hx - sx, dy = hy - sy;
  const dist = Math.hypot(dx, dy) || 0.001;
  const maxR = l1 + l2 - 0.4;
  if (dist > maxR) { hx = sx + dx / dist * maxR; hy = sy + dy / dist * maxR; dx = hx - sx; dy = hy - sy; }
  const d = Math.min(dist, maxR);
  const base = Math.atan2(dy, dx);
  const ca = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const ea = base + bend * Math.acos(ca);
  return { ex: sx + Math.cos(ea) * l1, ey: sy + Math.sin(ea) * l1, hx, hy };
}

// Klingen-Spur (R54, Autorwunsch "Nachziehen der Waffe"): ein blau-weißer Bogen,
// den die Klingenspitze auf ihrem Weg zieht, hinter der aktuellen Schlagrichtung
// her. Mehrere Lagen mit abnehmender Deckkraft ergeben den Schweif.
function klingenSpur(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, handAng: number, sense: number): void {
  const from = handAng - sense * 1.15;   // Schweif liegt HINTER der Bewegung
  const a0 = Math.min(from, handAng), a1 = Math.max(from, handAng);
  for (let i = 0; i < 3; i++) {
    const t = i / 2;
    ctx.strokeStyle = `rgba(${190 - i * 20},${224 - i * 10},255,${0.30 * (1 - t * 0.7)})`;
    ctx.lineWidth = 4 - i * 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(cx, cy, r - i * 1.4, (r - i * 1.4) * 0.85, 0, a0, a1); ctx.stroke();
  }
  ctx.lineWidth = 1;
}

// Schlagarm (R54, überarbeitet) mit natürlichem Ellenbogen (IK): die Hand fährt
// auf dem Schwung-Bogen (Winkel + Reichweite je Phase: nah/ausholen ->
// gestreckt/Treffer -> wieder gebeugt/Ausschwung), der Ellenbogen knickt zur
// face-Seite (links/rechts gespiegelt). Klinge folgt dem Unterarm. Gibt Hand +
// Klingenwinkel zurück, damit die Waffe daran hängt.
function schlagArm(ctx: CanvasRenderingContext2D, p: Pal, f: HeldForm, s: Schlag): { hx: number; hy: number; klinge: number } {
  const sx = CX - 0.4, sy = f.schulterY + 2.5;
  const l1 = 6, l2 = 6;
  const ha = s.ang + s.sweep;
  const tx = sx + Math.cos(ha) * s.r, ty = sy + Math.sin(ha) * s.r * 0.9;
  const k = ik2(sx, sy, tx, ty, l1, l2, s.face);
  const klinge = Math.atan2(k.hy - k.ey, k.hx - k.ex);   // Klinge in Verlängerung des Unterarms
  klingenSpur(ctx, sx, sy, s.r + 9, ha, s.sense);        // Waffen-Schweif
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = p.wams;
  ctx.lineWidth = f.armB + 0.8;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(k.ex, k.ey); ctx.stroke();   // Oberarm
  ctx.lineWidth = f.armB;
  ctx.beginPath(); ctx.moveTo(k.ex, k.ey); ctx.lineTo(k.hx, k.hy); ctx.stroke();   // Unterarm
  ctx.lineWidth = 1;
  ell(ctx, k.hx, k.hy, f.armB / 2 + 0.6, f.armB / 2 + 0.6, f.farben.hand ?? shade(p.wams, -14));  // Hand
  return { hx: k.hx, hy: k.hy, klinge };
}

// Schlagarm + Waffe zeichnen; bei flip wird ALLES horizontal gespiegelt (R54,
// Autorwunsch "linke Animation = Spiegel der rechten"). Der Schlag wird immer in
// der KANONISCHEN (rechten) Form gezeichnet und für linke Richtungen gespiegelt -
// so hält der Held die Waffe links exakt wie rechts, nur seitenverkehrt.
function zeichneSchlag(ctx: CanvasRenderingContext2D, p: Pal, f: HeldForm, s: Schlag, waffe: WaffenKlasse | null, flip: boolean): void {
  ctx.save();
  if (flip) { ctx.translate(2 * CX, 0); ctx.scale(-1, 1); }
  const h = schlagArm(ctx, p, f, s);
  zeichneWaffe(ctx, h.hx, h.hy, h.klinge, waffe);
  ctx.restore();
}

// Den Helden in Seiten-/Diagonalansicht zeichnen. face = -1 links / +1 rechts.
// kopfDir steuert den Kopf (1 links, 2 rechts, 3 Rücken bei Rück-Diagonalen).
// schlag != null: Schlagpose (Winkel + Phasenversatz) statt Geh-Arm.
function zeichneSeite(ctx: CanvasRenderingContext2D, p: Pal, f: HeldForm, face: number, step: number, tier: HeldTier, kopfDir: Dir, schlag: Schlag | null, waffe: WaffenKlasse | null): void {
  const legSwing = step === 1 ? 1 : step === 3 ? -1 : 0;
  const stride = 3;
  const nearLeg = face * legSwing * stride;
  const farLeg = -face * legSwing * stride;
  const nearArm = -face * legSwing * 2.6;
  const farArm = face * legSwing * 2.6;
  const flutter = legSwing * 2;
  const gitter = tier === 'kette' && f.kettenGitter > 0;

  seiteUmhang(ctx, p, f, face, flutter);                      // ganz hinten
  if (schlag === null) seiteArm(ctx, p, f, farArm, true);     // ferner Arm (im Lauf)
  seiteBein(ctx, p, f, farLeg, face, true);                   // fernes Bein
  seiteRumpf(ctx, p, f, face, gitter);
  seiteBein(ctx, p, f, nearLeg, face, false);                 // nahes Bein
  seitePauldron(ctx, p, f, face);
  kopf(ctx, p, f, kopfDir);
  if (schlag !== null) {
    zeichneSchlag(ctx, p, f, schlag, waffe, face < 0);        // links = Spiegel der rechten Pose
  } else {
    seiteArm(ctx, p, f, nearArm, false);                      // naher Arm vorn
    zeichneWaffeRuhend(ctx, f, CX + face * (f.tailleB + 1), waffe);
  }
}

// 8 Blickrichtungen (Autorwunsch R54 "Zwischenanimationen"):
// 0=S(vorn) 1=SW 2=W(links) 3=NW 4=N(hinten) 5=NE 6=O(rechts) 7=SE
export const HELD_DIRS = 8;
// 0..3 Gehen, 4..6 = Schlag in DREI Phasen (Ausholen -> Treffer -> Ausschwung).
// Drei Phasen reichen, damit der Schlag dem Swoosh folgt und trotzdem so schnell
// bleibt wie er (~55-65ms je Phase, schneller als der Gehschritt).
export const HELD_FRAMES = 7;
export const SCHLAG_FRAME = 4;       // erstes Schlag-Frame
export const SCHLAG_PHASEN = 3;
// Schwung je Phase: Winkelversatz UND Hand-Reichweite. Ausholen = Hand nah
// (Arm gebeugt), Treffer = gestreckt, Ausschwung = wieder etwas gebeugt - das
// gibt dem Schlag die natürliche Streckung durch den Treffer.
const SCHLAG_SWEEP = [-1.05, 0.0, 0.95];
const SCHLAG_REICH = [7, 10, 8.5];   // Hand näher am Körper -> Platz für die lange Klinge
// Schwung-RICHTUNG je Blickrichtung (Autorwunsch R54): links/oben schwingt von
// UNTEN nach OBEN, rechts/unten von OBEN nach UNTEN. sense kehrt den Bogen um.
// dir: 0=S 1=SW 2=W 3=NW 4=N 5=NE 6=O 7=SE -> {W,NW,N,NE}=unten->oben.
const SCHLAG_SENSE = [1, -1, 1, 1, 1, -1, 1, 1];
// Bildschirm-Winkel der Schlagrichtung je Richtung (0=rechts, PI/2=unten)
const STRIKE_ANG = [Math.PI / 2, 3 * Math.PI / 4, Math.PI, 5 * Math.PI / 4, -Math.PI / 2, 7 * Math.PI / 4, 0, Math.PI / 4];

// Eine Figur in die aktuelle 64x64-Zelle zeichnen (Ursprung links oben).
// dir: 0..7 (siehe oben), frame: 0..3 Gehen oder 4..6 Schlag-Phasen.
// waffe: ausgerüstete Waffenklasse, die in der Hand gehalten/geschwungen wird.
export function drawHeld(ctx: CanvasRenderingContext2D, tier: HeldTier, dir: number, frame: number, waffe: WaffenKlasse | null = null): void {
  const f = getHeldForm(tier);
  // Palette: erst Farb-Überschreibungen je Teil, DANN Helligkeit auf ALLES
  // (Autorbug R40: Helligkeit ließ überschriebene Teile + Helm unberührt)
  let p: Pal = { ...PALETTEN[tier] };
  const fb = f.farben;
  if (fb.wams) { p.wams = fb.wams; p.wamsH = shade(fb.wams, 20); p.wamsS = shade(fb.wams, -24); }
  if (fb.cape) { p.umh = fb.cape; p.umhS = shade(fb.cape, -22); }
  if (fb.kapuze) { p.kap = fb.kapuze; p.kapH = shade(fb.kapuze, 18); p.kapS = shade(fb.kapuze, -22); }
  if (fb.beine) { p.bein = fb.beine; p.beinS = shade(fb.beine, -22); }   // Hose/Beine färbbar (Autorwunsch R53)
  if (f.ruestHell) p = tintPal(p, f.ruestHell);
  const attack = frame >= SCHLAG_FRAME;
  const phase = attack ? Math.min(SCHLAG_PHASEN - 1, frame - SCHLAG_FRAME) : 0;
  const step = attack ? 0 : frame % 4;   // 0 stehen, 1 links vor, 2 stehen, 3 rechts vor
  const bobUp = step === 1 || step === 3 ? -1.4 : 0;
  const sway = step === 1 ? 2 : step === 3 ? -2 : 0;
  // Linke Richtungen werden als SPIEGEL der rechten gezeichnet (Autorwunsch):
  // der Schlag wird in der rechten Partner-Richtung (drawDir) berechnet und beim
  // Zeichnen horizontal gespiegelt. face spiegelt zusätzlich den Körper.
  const istLinks = dir === 1 || dir === 2 || dir === 3;
  const drawDir = istLinks ? (dir === 1 ? 7 : dir === 2 ? 6 : 5) : dir;
  const sense = SCHLAG_SENSE[drawDir];
  const schlag: Schlag | null = attack
    ? { ang: STRIKE_ANG[drawDir], sweep: SCHLAG_SWEEP[phase] * sense, r: SCHLAG_REICH[phase], sense, face: 1 }
    : null;

  // Bodenschatten
  ell(ctx, CX, 58, 14, 3.4, 'rgba(0,0,0,0.32)');

  ctx.save();
  ctx.translate(0, bobUp);

  // Leuchtende KONTUR statt Halo (Autorwunsch R40): ein Schatten-Glühen um jede
  // Form lässt die Rüstung umrissen leuchten. Wird nach der Figur zurückgesetzt.
  if (f.leuchten > 0) {
    ctx.shadowColor = 'rgba(246,210,96,0.95)';
    ctx.shadowBlur = 4;
  }

  // Seiten- UND Diagonalansichten als echtes Profil (Geh-Zyklus). face links/
  // rechts; bei Rück-Diagonalen (NW/NE) zeigt der Kopf die Haube (Rücken).
  // S (0) = Front, N (4) = Rücken bekommen die Frontsilhouette.
  if (dir !== 0 && dir !== 4) {
    const face = (dir === 1 || dir === 2 || dir === 3) ? -1 : 1;     // SW,W,NW links; NE,O,SE rechts
    // Kopf: reine Seite (W/O) -> Profil; Vorder-Diagonale (SW/SE) -> 3/4-Front-
    // gesicht (man läuft zum Betrachter); Rück-Diagonale (NW/NE) -> Haube.
    const kopfDir: Dir = (dir === 3 || dir === 5) ? 3 : (dir === 1 || dir === 7) ? 0 : (face < 0 ? 1 : 2);
    zeichneSeite(ctx, p, f, face, step, tier, kopfDir, schlag, waffe);
    ctx.restore();
    return;
  }

  umhang(ctx, p, f, sway);

  // Beine mit Gehschritt - Spreizung an der Taille
  const lVor = step === 1 ? 1.5 : step === 3 ? -1.5 : 0;
  const spreiz = Math.max(2.4, f.tailleB * 0.65);
  bein(ctx, p, f, CX - spreiz, lVor);
  bein(ctx, p, f, CX + spreiz, -lVor);

  // hinterer Arm (gegenläufig), Rumpf, vorderer Arm - an den Schultern
  arm(ctx, p, f, CX - f.schulterB, -lVor);
  rumpf(ctx, p, f, tier === 'kette' && f.kettenGitter > 0);
  if (schlag === null) arm(ctx, p, f, CX + f.schulterB, lVor);
  pauldrons(ctx, p, f); // Schulterplatten über den Armansätzen

  kopf(ctx, p, f, dir === 4 ? 3 : 0);   // N -> Rücken-Haube, S -> Front

  if (schlag !== null) {
    zeichneSchlag(ctx, p, f, schlag, waffe, false);   // Front/Rücken: kein Spiegeln
  } else {
    zeichneWaffeRuhend(ctx, f, CX + f.schulterB, waffe);   // Waffe ruht an der Hand
  }

  ctx.restore();
}

// Helden-Brustbild (Runde 43): unser Held nach der Konzeptzeichnung des Autors -
// bärtiger Mann mit braunem Wuschelhaar, Lederrüstung, Kapuzenkragen und runder
// Goldfibel. Frontal, ohne Waffe/Schild. Wird als Textur pt_spieler registriert
// und im Charakter- wie Dialogfenster gezeigt. Alles in S-Einheiten, damit es in
// jeder Zielgröße sauber skaliert.
export function drawHeldPortrait(ctx: CanvasRenderingContext2D, S = 128): void {
  const u = S / 128, C = S / 2;
  const haut = '#c5895c', hautH = '#dba87b', hautS = '#9a6240';
  const haar = '#5f4127', haarH = '#7d5836', haarD = '#3a2614';
  const leder = '#6e4a28', lederH = '#8c6238', lederD = '#46301a';
  const kragenD = '#352312';
  const gold = '#c9a227', goldH = '#ecce52', goldD = '#7e5f17';
  const kette = '#8d929b', ketteD = '#5f636b';

  // Hintergrund: warmes Bernsteinlicht (Waldlichtung im Abendlicht)
  const bg = ctx.createRadialGradient(C, S * 0.32, 8 * u, C, S * 0.52, S * 0.72);
  bg.addColorStop(0, '#cca25c'); bg.addColorStop(0.55, '#8a6c3c'); bg.addColorStop(1, '#3d2f18');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S);

  // Kapuzenkragen hinter den Schultern (breiter dunkler Stoff)
  poly(ctx, [[C - 60 * u, S + 2], [C - 50 * u, S * 0.60], [C, S * 0.52], [C + 50 * u, S * 0.60], [C + 60 * u, S + 2]], kragenD);
  // Lederrüstung über Brust/Schultern
  poly(ctx, [[C - 52 * u, S + 2], [C - 47 * u, S * 0.70], [C - 18 * u, S * 0.59], [C + 18 * u, S * 0.59], [C + 47 * u, S * 0.70], [C + 52 * u, S + 2]], leder);
  // Schulterkappen (Pauldrons) mit Lichtkante und Nieten
  for (const sx of [-1, 1]) {
    ell(ctx, C + sx * 41 * u, S * 0.73, 15 * u, 12 * u, lederH);
    ell(ctx, C + sx * 41 * u, S * 0.755, 13 * u, 10 * u, leder);
    ctx.fillStyle = lederD;
    for (const a of [-0.9, -0.2, 0.5]) ctx.fillRect(C + sx * 41 * u + Math.cos(a) * 9 * u, S * 0.73 + Math.sin(a) * 7 * u, 1.6 * u, 1.6 * u);
  }
  // V-Ausschnitt mit angedeutetem Kettenhemd
  poly(ctx, [[C - 14 * u, S * 0.62], [C + 14 * u, S * 0.62], [C, S * 0.86]], ketteD);
  ctx.fillStyle = kette;
  for (let ry = 0; ry < 8; ry++) for (let rxn = -3; rxn <= 3; rxn++) {
    const yy = S * 0.65 + ry * 2.4 * u, xx = C + rxn * 2.6 * u + (ry % 2) * 1.3 * u;
    if (Math.abs(xx - C) < (S * 0.86 - yy) * 0.6 + 2 * u) ctx.fillRect(xx, yy, 1.5 * u, 1.5 * u);
  }
  // Gekreuzte Lederriemen über der Brust
  ctx.strokeStyle = lederD; ctx.lineWidth = 3 * u; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(C - 22 * u, S * 0.64); ctx.lineTo(C + 16 * u, S * 0.90); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(C + 22 * u, S * 0.64); ctx.lineTo(C - 16 * u, S * 0.90); ctx.stroke();
  ctx.lineWidth = 1;
  // Runde Goldfibel am Kragen
  ell(ctx, C, S * 0.605, 7.5 * u, 7.5 * u, goldD);
  ell(ctx, C, S * 0.60, 6 * u, 6 * u, gold);
  ell(ctx, C - 1.8 * u, S * 0.588, 2.4 * u, 2.4 * u, goldH);

  // Hals
  rr(ctx, C - 7 * u, S * 0.46, 14 * u, 14 * u, 4 * u, hautS);
  rr(ctx, C - 6 * u, S * 0.45, 12 * u, 12 * u, 4 * u, haut);

  // Haar hinten (Rahmen um den Kopf)
  ell(ctx, C, S * 0.30, 26 * u, 27 * u, haarD);
  // Kopf/Gesicht
  ell(ctx, C, S * 0.31, 21 * u, 24 * u, haut);
  ell(ctx, C - 7 * u, S * 0.24, 8 * u, 9 * u, hautH);          // Stirn-Licht
  ell(ctx, C + 13 * u, S * 0.34, 6 * u, 10 * u, hautS);        // Wangenschatten rechts
  // Ohren
  for (const sx of [-1, 1]) { ell(ctx, C + sx * 21 * u, S * 0.33, 3.5 * u, 5 * u, haut); }

  // Vollbart (deckt Wangen/Kinn)
  poly(ctx, [[C - 17 * u, S * 0.32], [C - 19 * u, S * 0.40], [C - 11 * u, S * 0.50], [C, S * 0.535],
    [C + 11 * u, S * 0.50], [C + 19 * u, S * 0.40], [C + 17 * u, S * 0.32],
    [C + 12 * u, S * 0.41], [C, S * 0.43], [C - 12 * u, S * 0.41]], haar);
  ell(ctx, C, S * 0.46, 9 * u, 6 * u, haarH);                  // Bart-Licht Kinn
  // Schnurrbart
  poly(ctx, [[C - 8 * u, S * 0.385], [C, S * 0.40], [C + 8 * u, S * 0.385], [C + 6 * u, S * 0.415], [C - 6 * u, S * 0.415]], haarD);

  // Augenbrauen
  ctx.fillStyle = haarD;
  ctx.fillRect(C - 12 * u, S * 0.295, 8 * u, 2 * u);
  ctx.fillRect(C + 4 * u, S * 0.295, 8 * u, 2 * u);
  // Augen
  for (const sx of [-1, 1]) {
    ell(ctx, C + sx * 8 * u, S * 0.335, 3.2 * u, 2.3 * u, '#efe7d6');
    ell(ctx, C + sx * 8 * u, S * 0.335, 1.7 * u, 1.9 * u, '#4a3a2a');
    ctx.fillStyle = '#0e0a07'; ctx.fillRect(C + sx * 8 * u - 0.8 * u, S * 0.335 - 0.8 * u, 1.6 * u, 1.6 * u);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(C + sx * 8 * u - 1.4 * u, S * 0.327, 0.9 * u, 0.9 * u);
  }
  // Nase
  poly(ctx, [[C - 2.4 * u, S * 0.34], [C + 2.4 * u, S * 0.34], [C + 3.2 * u, S * 0.385], [C - 3.2 * u, S * 0.385]], hautS);
  ell(ctx, C, S * 0.36, 2.4 * u, 2.2 * u, haut);

  // Haar vorn: wuscheliger Pony in Strähnen
  ctx.fillStyle = haar;
  const strähnen: number[][] = [[-20, 0.20, 7, 9], [-12, 0.16, 8, 9], [-2, 0.15, 8, 8], [8, 0.16, 8, 9], [17, 0.20, 7, 9]];
  for (const [dx, ry, rx, rry] of strähnen) ell(ctx, C + dx * u, S * ry, rx * u, rry * u, haar);
  // Licht in den oberen Strähnen
  ctx.fillStyle = haarH;
  for (const [dx, ry] of [[-14, 0.15], [-3, 0.14], [9, 0.15]]) ell(ctx, C + dx * u, S * ry - 1 * u, 3.5 * u, 4 * u, haarH);
  // Haarspitzen über die Stirn
  ctx.fillStyle = haar;
  for (const [dx, w2] of [[-16, 5], [-7, 6], [3, 6], [12, 5]]) poly(ctx, [[C + dx * u, S * 0.24], [C + (dx + w2) * u, S * 0.24], [C + (dx + w2 / 2) * u, S * 0.31]], haar);

  // sanfter Vignetten-Rand
  ctx.fillStyle = 'rgba(20,14,8,0.0)';
  const vg = ctx.createRadialGradient(C, C, S * 0.34, C, C, S * 0.6);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(20,14,8,0.45)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, S, S);
}
