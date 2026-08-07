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

export const HELD_CELL = 64; // Kantenlänge der FIGUR (intern, Ursprung 0..64)
// Rand um die Figur in jeder Atlas-Zelle (R54): Platz, damit der lange Schwung
// + die lange Klinge NICHT abgeschnitten werden und NICHT ins Nachbar-Feld
// laufen ("das Nachbarfeld nutzen"). Die Figur wird beim Backen um MARGIN
// versetzt - Fußposition/Größe im Spiel bleiben dadurch unverändert.
export const HELD_MARGIN = 20;
export const HELD_FELD = HELD_CELL + 2 * HELD_MARGIN; // tatsächliche Zellengröße im Atlas

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

function heldPalette(tier: HeldTier, f: HeldForm): Pal {
  let p: Pal = { ...PALETTEN[tier] };
  const fb = f.farben;
  if (fb.wams) { p.wams = fb.wams; p.wamsH = shade(fb.wams, 20); p.wamsS = shade(fb.wams, -24); }
  if (fb.cape) { p.umh = fb.cape; p.umhS = shade(fb.cape, -22); }
  if (fb.kapuze) { p.kap = fb.kapuze; p.kapH = shade(fb.kapuze, 18); p.kapS = shade(fb.kapuze, -22); }
  if (fb.beine) { p.bein = fb.beine; p.beinS = shade(fb.beine, -22); }
  if (f.ruestHell) p = tintPal(p, f.ruestHell);
  return p;
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
    seg(P(-3), P(1), 3.8, holz);                       // Griff (Knauf hinter der Hand)
    seg(P(1, -4.2), P(1, 4.2), 1.8, stahlK);           // Parierstange (Kreuz)
    seg(P(1), P(23), 2.8, stahl); seg(P(1), P(22), 1.2, stahlK);   // lange Klinge + Licht
  } else if (waffe === 'stab') {
    seg(P(-4), P(18), 2.5, holz);
    ctx.fillStyle = '#8a6ad0'; const k = P(19); ctx.beginPath(); ctx.arc(k[0], k[1], 2.6, 0, 7); ctx.fill();
  } else if (waffe === 'stange') {
    seg(P(-5), P(20), 2.3, holz);                      // langer Schaft
    seg(P(19), P(24), 2.3, stahl); seg(P(19), P(24), 1, stahlK);  // Spitze
  } else {
    // axt / kolben / wucht: Stiel + schwerer Kopf nahe der Spitze
    seg(P(-3), P(16), 3.2, holz);
    const k = P(17);
    if (waffe === 'axt') {
      ctx.fillStyle = stahl;
      ctx.beginPath(); const a = P(15, 0), b = P(20, 5), c = P(19, 9), d = P(14, 5);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = eisen; ctx.beginPath(); ctx.arc(k[0], k[1], waffe === 'wucht' ? 3.8 : 3.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#6a6e75'; ctx.beginPath(); ctx.arc(k[0] - 1.2, k[1] - 1.2, 1.2, 0, 7); ctx.fill();
    }
  }
}

// Waffe in Ruhe (Gehen/Stehen): hängt in der Hand, Klinge in Richtung restAng
// (je Blickrichtung verschieden - rechtshändig, nicht gespiegelt). Knauf an der
// Hand nahe am Körper, Spitze zeigt von ihm weg nach unten.
function zeichneWaffeRuhend(ctx: CanvasRenderingContext2D, f: HeldForm, x: number, restAng: number, waffe: WaffenKlasse | null): void {
  if (!waffe || waffe === 'bogen') return;
  zeichneWaffe(ctx, x, f.schulterY + f.armL + 1, restAng, waffe);
}

// Spitzen-Abstand der Waffe von der Hand (für die Länge des Klingen-Schweifs -
// wuchs mit der langen Klinge mit, R54). bogen wird nicht geschwungen.
const WAFFEN_LAENGE: Record<string, number> = { schwert: 23, stange: 24, stab: 19, axt: 20, kolben: 20, wucht: 20, bogen: 0 };
function waffenLaenge(w: WaffenKlasse | null): number { return w ? (WAFFEN_LAENGE[w] ?? 20) : 0; }

// Eine Schlagpose: Klingenwinkel (Bildschirm), Winkel der VORIGEN Phase (für den
// Schweif als echte Bewegungsspur), Reichweite Schulter->Hand, Ellenbogen-Seite,
// tipDist = Abstand der Klingenspitze von der Hand (Schweif-Länge).
interface Schlag { ang: number; prevAng: number; r: number; bend: number; tipDist: number }

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

// Klingen-Spur (R54, "Nachziehen der Waffe"): ein blau-weißer Bogen von der
// vorigen zur aktuellen Klingenrichtung - die ECHTE Bewegungsspur zwischen den
// Phasen. r liegt an der Klingenspitze (mit der langen Klinge mitgewachsen).
// breit = wie dick/prominent der Schweif ist (lange Klinge = kräftigerer Wisch).
function klingenSpur(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, fromAng: number, toAng: number, breit = 1): void {
  if (Math.abs(toAng - fromAng) < 0.06) return;
  const a0 = Math.min(fromAng, toAng), a1 = Math.max(fromAng, toAng);
  for (let i = 0; i < 3; i++) {
    const t = i / 2;
    ctx.strokeStyle = `rgba(${200 - i * 18},${228 - i * 9},255,${0.34 * (1 - t * 0.65)})`;
    ctx.lineWidth = (6.5 - i * 1.7) * breit; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(cx, cy, r - i * 1.6, (r - i * 1.6) * 0.85, 0, a0, a1); ctx.stroke();
  }
  ctx.lineWidth = 1;
}

// Schlagarm mit natürlichem Ellenbogen (IK): die Hand fährt auf dem Schwung-Bogen,
// der Arm bleibt fast gestreckt (volle Reichweite, Ellenbogen nicht durchgedrückt),
// die Klinge folgt dem Unterarm. Gibt Hand + Klingenwinkel zurück.
function schlagArm(ctx: CanvasRenderingContext2D, p: Pal, f: HeldForm, s: Schlag): { hx: number; hy: number; klinge: number } {
  const sx = CX - 0.4, sy = f.schulterY + 3;
  const l1 = 6, l2 = 6;
  const tx = sx + Math.cos(s.ang) * s.r, ty = sy + Math.sin(s.ang) * s.r * 0.9;
  const k = ik2(sx, sy, tx, ty, l1, l2, s.bend);
  const klinge = Math.atan2(k.hy - k.ey, k.hx - k.ex);   // Klinge in Verlängerung des Unterarms
  // Schweif an der Klingenspitze (wuchs mit der langen Klinge mit), kräftiger bei langen Waffen
  klingenSpur(ctx, sx, sy, s.r + s.tipDist * 0.82, s.prevAng, s.ang, s.tipDist >= 22 ? 1.18 : 1);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = p.wams;
  ctx.lineWidth = f.armB + 0.8;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(k.ex, k.ey); ctx.stroke();   // Oberarm
  ctx.lineWidth = f.armB;
  ctx.beginPath(); ctx.moveTo(k.ex, k.ey); ctx.lineTo(k.hx, k.hy); ctx.stroke();   // Unterarm
  ctx.lineWidth = 1;
  ell(ctx, k.hx, k.hy, f.armB / 2 + 0.6, f.armB / 2 + 0.6, f.farben.hand ?? shade(p.wams, -14));  // Hand
  return { hx: k.hx, hy: k.hy, klinge };
}

// Schlagarm + Waffe zeichnen (kein Spiegeln mehr - je Richtung eigene Choreografie).
function zeichneSchlag(ctx: CanvasRenderingContext2D, p: Pal, f: HeldForm, s: Schlag, waffe: WaffenKlasse | null): void {
  const h = schlagArm(ctx, p, f, s);
  zeichneWaffe(ctx, h.hx, h.hy, h.klinge, waffe);
}

// Den Helden in Seiten-/Diagonalansicht zeichnen. face = -1 links / +1 rechts.
// kopfDir steuert den Kopf (1 links, 2 rechts, 3 Rücken bei Rück-Diagonalen).
// schlag != null: Schlagpose. schlagVorne = Arm/Waffe VOR dem Körper (sonst
// dahinter -> Tiefenwirkung, die Klinge verschwindet teils hinter dem Rumpf).
function zeichneSeite(ctx: CanvasRenderingContext2D, p: Pal, f: HeldForm, face: number, step: number, tier: HeldTier, kopfDir: Dir, schlag: Schlag | null, schlagVorne: boolean, restAng: number, waffe: WaffenKlasse | null, atemHub = 0): void {
  const legSwing = step === 1 ? 1 : step === 3 ? -1 : 0;
  const stride = 3;
  // Beim Schlag: Ausfallschritt - vorderer Fuß (Richtung Gegner = face) weit vor,
  // hinterer Fuß zurück = stabiler Stand, Hüfte/Schulter schieben nach vorn (HEMA).
  const ausfall = schlag !== null;
  const nearLeg = ausfall ? face * 6 : face * legSwing * stride;
  const farLeg = ausfall ? -face * 4 : -face * legSwing * stride;
  const nearArm = -face * legSwing * 2.6;
  const farArm = face * legSwing * 2.6;
  const flutter = legSwing * 2;
  const gitter = tier === 'kette' && f.kettenGitter > 0;
  const hebe = (fn: () => void): void => { ctx.save(); ctx.translate(0, -atemHub); fn(); ctx.restore(); };

  // Oberkörper (Cape/Arme/Rumpf/Kopf/Waffe) atmet mit; die Beine bleiben stehen.
  hebe(() => { seiteUmhang(ctx, p, f, face, flutter); seiteArm(ctx, p, f, farArm, true); });   // hinten
  seiteBein(ctx, p, f, farLeg, face, true);                   // fernes Bein (kein Atemhub)
  hebe(() => {
    if (schlag && !schlagVorne) zeichneSchlag(ctx, p, f, schlag, waffe);   // Waffenarm HINTER dem Rumpf
    seiteRumpf(ctx, p, f, face, gitter);
  });
  seiteBein(ctx, p, f, nearLeg, face, false);                 // nahes Bein (kein Atemhub)
  hebe(() => {
    seitePauldron(ctx, p, f, face);
    kopf(ctx, p, f, kopfDir);
    if (schlag) {
      if (schlagVorne) zeichneSchlag(ctx, p, f, schlag, waffe); // Waffenarm VOR dem Rumpf
    } else {
      seiteArm(ctx, p, f, nearArm, false);                      // naher Arm vorn
      zeichneWaffeRuhend(ctx, f, CX + face * (f.tailleB + 1), restAng, waffe);
    }
  });
}

// 8 Blickrichtungen (Autorwunsch R54 "Zwischenanimationen"):
// 0=S(vorn) 1=SW 2=W(links) 3=NW 4=N(hinten) 5=NE 6=O(rechts) 7=SE
export const HELD_DIRS = 8;
// 0..3 Gehen, 4..7 = Schlag in VIER Phasen. Schnell wie der Swoosh (~50ms/Phase).
export const HELD_FRAMES = 8;
export const SCHLAG_FRAME = 4;       // erstes Schlag-Frame
export const SCHLAG_PHASEN = 4;
// Reichweite Schulter->Hand je Phase: Arm bleibt fast gestreckt (volle Reichweite),
// holt minimal ein und streckt sich beim Treffer ganz aus.
const SCHLAG_R = [10, 11, 11.2, 10.6];

// Schlag-CHOREOGRAFIE je Blickrichtung (R54, nach der HEMA-Beschreibung des
// Autors): RECHTSHÄNDIG, diagonale Hiebe, je Richtung EIGEN (nicht gespiegelt).
// Winkel in Bildschirm-Radiant: 0=rechts, PI/2=unten, PI=links, -PI/2=oben.
// swing = Klingenrichtung der 4 Phasen; rest = Ruhehaltung; bend = Ellenbogen-
// seite; frontVon = ab welcher Phase der Waffenarm VOR dem Körper liegt (davor
// dahinter -> die Klinge taucht hinter dem Rumpf durch).
// dir: 0=S 1=SW 2=W 3=NW 4=N 5=NE 6=O 7=SE
interface DirSchlag { rest: number; bend: number; frontVon: number; swing: number[] }
const SCHLAG: DirSchlag[] = [
  /*0 S  unten */ { rest: 1.45, bend:  1, frontVon: 1, swing: [-0.7, 0.4, 1.4, 2.2] },   // Mandritto: oben -> unten quer
  /*1 SW       */ { rest: 2.35, bend: -1, frontVon: 1, swing: [2.0, 2.7, 3.3, 2.7] },
  /*2 W  links */ { rest: 2.45, bend: -1, frontVon: 2, swing: [2.5, 3.2, 3.95, 3.25] },  // unten -> oben -> wieder runter
  /*3 NW       */ { rest: 2.25, bend: -1, frontVon: 2, swing: [2.45, 3.05, 3.7, 4.3] },
  /*4 N  oben  */ { rest: 0.85, bend:  1, frontVon: 3, swing: [0.9, 0.05, -0.7, -1.45] }, // von rechts unten über rechts nach oben
  /*5 NE       */ { rest: 0.80, bend:  1, frontVon: 2, swing: [0.7, -0.05, -0.8, -1.4] },
  /*6 O  rechts*/ { rest: 0.70, bend:  1, frontVon: 1, swing: [-0.95, -0.2, 0.6, 1.35] }, // oben -> unten
  /*7 SE       */ { rest: 0.95, bend:  1, frontVon: 1, swing: [-0.8, 0.0, 0.85, 1.55] },
];

// Eine Figur in die aktuelle 64x64-Zelle zeichnen (Ursprung links oben).
// dir: 0..7 (siehe oben), frame: 0..3 Gehen oder 4..6 Schlag-Phasen.
// waffe: ausgerüstete Waffenklasse, die in der Hand gehalten/geschwungen wird.
export function drawHeld(ctx: CanvasRenderingContext2D, tier: HeldTier, dir: number, frame: number, waffe: WaffenKlasse | null = null): void {
  const f = getHeldForm(tier);
  // Palette: erst Farb-Überschreibungen je Teil, DANN Helligkeit auf ALLES
  // (Autorbug R40: Helligkeit ließ überschriebene Teile + Helm unberührt)
  const p = heldPalette(tier, f);
  const attack = frame >= SCHLAG_FRAME;
  const phase = attack ? Math.min(SCHLAG_PHASEN - 1, frame - SCHLAG_FRAME) : 0;
  const step = attack ? 0 : frame % 4;   // 0 stehen(aus), 1 li vor, 2 stehen(ein-atmen), 3 re vor
  // Gehen als umgekehrtes Pendel (R54, Biomechanik): tiefster Punkt in der
  // Doppelstütze (Kontakt, Bein vor = Frame 1/3), höchster Punkt im Durchschwung
  // (Frame 0/2). Dazu seitliches Schwanken zur Standbeinseite, einmal pro Schritt.
  const bobUp = (step === 1 || step === 3) ? 0.9 : 0;
  const swayX = step === 1 ? -1 : step === 3 ? 1 : 0;
  // Atmung im Stehen (Frame 2 = Einatmen): Brustkorb + Schultern heben sich, der
  // Oberkörper geht hoch - die Beine/Füße bleiben stehen. Nur ausserhalb des Schlags.
  const atemHub = (!attack && step === 2) ? 1.4 : 0;
  const sway = step === 1 ? 2 : step === 3 ? -2 : 0;
  // Schlag-Choreografie der Richtung (rechtshändig, je Richtung eigen).
  const ds = SCHLAG[dir];
  const schlag: Schlag | null = attack
    ? { ang: ds.swing[phase], prevAng: phase > 0 ? ds.swing[phase - 1] : ds.rest, r: SCHLAG_R[phase], bend: ds.bend, tipDist: waffenLaenge(waffe) }
    : null;
  const schlagVorne = attack ? phase >= ds.frontVon : true;

  // Bodenschatten
  ell(ctx, CX, 58, 14, 3.4, 'rgba(0,0,0,0.32)');

  ctx.save();
  ctx.translate(swayX, bobUp);

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
    zeichneSeite(ctx, p, f, face, step, tier, kopfDir, schlag, schlagVorne, ds.rest, waffe, atemHub);
    ctx.restore();
    return;
  }

  // Cape hängt von den Schultern - hebt sich beim Einatmen mit (Oberkörper)
  ctx.save(); ctx.translate(0, -atemHub); umhang(ctx, p, f, sway); ctx.restore();

  // Beine mit Gehschritt - Spreizung an der Taille (Beine atmen NICHT mit).
  // Beim Schlag: breiter, fester Stand mit vorgesetztem (längerem) Führungsbein.
  const lVor = step === 1 ? 1.5 : step === 3 ? -1.5 : 0;
  const breit = schlag !== null;
  const spreiz = Math.max(2.4, f.tailleB * 0.65) * (breit ? 1.55 : 1);
  bein(ctx, p, f, CX - spreiz, breit ? 3 : lVor);            // Führungsbein vor (länger)
  bein(ctx, p, f, CX + spreiz, breit ? -0.5 : -lVor);        // Standbein hinten

  // Oberkörper (Arme/Rumpf/Schultern/Kopf/Waffe) hebt sich beim Einatmen
  ctx.save(); ctx.translate(0, -atemHub);
  // hinterer Arm (Off-Hand), dann ggf. Waffenarm HINTER dem Rumpf, dann Rumpf
  arm(ctx, p, f, CX - f.schulterB, -lVor);
  if (schlag && !schlagVorne) zeichneSchlag(ctx, p, f, schlag, waffe);   // Klinge taucht hinter den Körper
  rumpf(ctx, p, f, tier === 'kette' && f.kettenGitter > 0);
  if (schlag === null) arm(ctx, p, f, CX + f.schulterB, lVor);
  pauldrons(ctx, p, f); // Schulterplatten über den Armansätzen

  kopf(ctx, p, f, dir === 4 ? 3 : 0);   // N -> Rücken-Haube, S -> Front

  if (schlag) {
    if (schlagVorne) zeichneSchlag(ctx, p, f, schlag, waffe);   // Waffenarm VOR dem Rumpf
  } else {
    zeichneWaffeRuhend(ctx, f, CX + f.schulterB, ds.rest, waffe);   // Waffe ruht an der Hand
  }
  ctx.restore();   // Ende Oberkörper-Atemhub

  ctx.restore();
}

// Reitpose des echten Hauptcharakters. Anders als der normale Geh-Sprite hat
// sie einen klaren Sitzpunkt, angewinkelte Beine in den Steigbuegeln und beide
// Haende vor dem Koerper an den Zuegeln. Der Sitzpunkt liegt bei (32, 43).
export const REITER_SITZ_Y = 43;
export const REITER_FRAMES = 4;

function reiterGlied(
  ctx: CanvasRenderingContext2D,
  a: [number, number], b: [number, number], c: [number, number],
  breite: number, farbe: string, ende?: string,
): void {
  ctx.strokeStyle = farbe;
  ctx.lineWidth = breite;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
  if (ende) {
    ctx.strokeStyle = ende; ctx.lineWidth = breite + 0.8;
    ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
  }
  ctx.lineWidth = 1;
}

export function drawReiter(ctx: CanvasRenderingContext2D, tier: HeldTier, dir: number, frame: number): void {
  const basis = getHeldForm(tier);
  // Feste Reitproportionen, aber Farben, Kopf, Visier und Ruestungsdetails des
  // aktuell ausgeruesteten Hauptcharakters bleiben erhalten.
  const f: HeldForm = { ...basis, kopfY: 14.5, schulterY: 23, rumpfH: 17, capeLaenge: Math.min(0.72, basis.capeLaenge) };
  const p = heldPalette(tier, f);
  const d = ((dir % 8) + 8) % 8;
  const seite = d !== 0 && d !== 4;
  const face = (d === 1 || d === 2 || d === 3) ? -1 : 1;
  const rhythmus = [0, 0.55, 0.15, -0.45][frame % REITER_FRAMES] ?? 0;
  const lean = seite ? face * (1.2 + Math.max(0, rhythmus) * 0.35) : 0;
  const hipY = REITER_SITZ_Y - 1;

  ctx.save();
  ctx.translate(lean, rhythmus);
  if (f.leuchten > 0) { ctx.shadowColor = 'rgba(246,210,96,0.9)'; ctx.shadowBlur = 3; }

  // Kurzer Umhang hinter dem Sattel; er endet oberhalb der Pferdeflanke.
  const capeBack = seite ? -face * (4 + (frame % 2)) : 0;
  poly(ctx, [[CX - 5, f.schulterY], [CX + 5, f.schulterY], [CX + 6 + capeBack, hipY + 5], [CX - 7 + capeBack, hipY + 5]], p.umhS);

  if (seite) {
    // Fernes Bein zuerst, danach nahes Bein: Huefte -> Knie vor dem Sattel ->
    // Stiefel fast senkrecht im Steigbuegel.
    reiterGlied(ctx, [CX - face * 1.8, hipY], [CX + face * 5.0, 48], [CX + face * 2.0, 57], f.beinB - 1.2, shade(p.bein, -18), shade(p.stiefel, -12));
    reiterGlied(ctx, [CX + face * 1.0, hipY], [CX + face * 7.0, 47], [CX + face * 4.0, 57], f.beinB - 0.4, p.bein, p.stiefel);

    // Ferner Arm liegt hinter dem Rumpf und greift ebenfalls nach vorn.
    reiterGlied(ctx, [CX - face * 1.5, f.schulterY + 3], [CX + face * 4.5, 30], [CX + face * 9.5, 36], f.armB - 1, shade(p.wams, -16), f.farben.hand ?? shade(p.wams, -18));
    seiteRumpf(ctx, p, f, face, tier === 'kette' && f.kettenGitter > 0);
    reiterGlied(ctx, [CX + face * 2.0, f.schulterY + 3], [CX + face * 6.5, 30], [CX + face * 11.0, 36], f.armB, p.wams, f.farben.hand ?? shade(p.wams, -14));
    seitePauldron(ctx, p, f, face);
    const kopfDir: Dir = (d === 3 || d === 5) ? 3 : (d === 1 || d === 7) ? 0 : (face < 0 ? 1 : 2);
    kopf(ctx, p, f, kopfDir);
  } else {
    // Front/Ruecken: Knie liegen ausserhalb des Sattels, beide Fuesse ziehen
    // wieder nach innen. So ist die Sitzhaltung sofort lesbar.
    reiterGlied(ctx, [CX - 3, hipY], [CX - 8, 49], [CX - 5, 57], f.beinB - 0.5, shade(p.bein, -14), shade(p.stiefel, -10));
    reiterGlied(ctx, [CX + 3, hipY], [CX + 8, 49], [CX + 5, 57], f.beinB - 0.2, p.bein, p.stiefel);
    poly(ctx, [[CX - 8, f.schulterY], [CX + 8, f.schulterY], [CX + 6, hipY + 1], [CX - 6, hipY + 1]], p.wams);
    poly(ctx, [[CX, f.schulterY], [CX + 8, f.schulterY], [CX + 6, hipY + 1], [CX, hipY + 1]], p.wamsS);
    const hand = f.farben.hand ?? shade(p.wams, -14);
    reiterGlied(ctx, [CX - 7, f.schulterY + 3], [CX - 5, 31], [CX - 3, 36], f.armB, p.wams, hand);
    reiterGlied(ctx, [CX + 7, f.schulterY + 3], [CX + 5, 31], [CX + 3, 36], f.armB, p.wams, hand);
    pauldrons(ctx, p, f);
    kopf(ctx, p, f, d === 4 ? 3 : 0);
  }
  ctx.restore();
}

