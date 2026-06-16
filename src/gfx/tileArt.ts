// Programmatische Tiles - portiert aus der Referenz (drawTile), als
// Texturen-Generator. Variante (0-6) bringt Beschnitt-Abwechslung wie
// das tileNoise der Referenz.

import { TILE } from './fallbackArt';
import type { CryptTheme } from '../data/krypta';
import { fels64, zaun64, acker64, folterbank64, skelett64, altar64, wasser64 } from './detailArt';

type Ctx = CanvasRenderingContext2D;

// Wasser-Animationsschleife (Runde 40): so viele Phasen-Frames bildet der Fluss,
// bevor er sich wiederholt - begrenzt zugleich die Zahl gecachter Texturen.
export const WASSER_FRAMES = 8;

// Detailliertes 64px-Objekt sauber auf die 32px-Kachel herunterrechnen
// (Runde 40, "den Rest in 64px runterskaliert"). Überlagert vorhandenen Inhalt
// (z. B. die Bodenplatte) nicht-destruktiv, weil die Quellen auf transparentem
// Grund zeichnen.
function detail(ctx: Ctx, draw: (c: Ctx) => void): void {
  const g = document.createElement('canvas');
  g.width = 64; g.height = 64;
  draw(g.getContext('2d')!);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(g, 0, 0, 64, 64, 0, 0, TILE, TILE);
  ctx.restore();
}

function grasBase(ctx: Ctx, n: number): void {
  const g = 46 + n * 2;
  ctx.fillStyle = `rgb(${g - 14},${g},${g - 22})`;
  ctx.fillRect(0, 0, TILE, TILE);
  // Grasbüschel und Sprenkel je Variante (deterministisch, kein Flackern)
  ctx.fillStyle = `rgba(${g - 4},${g + 14},${g - 12},0.8)`;
  for (let i = 0; i < 5; i++) {
    const tx = ((i * 13 + n * 7) % 28) + 2, ty = ((i * 19 + n * 11) % 26) + 3;
    ctx.fillRect(tx, ty, 1, 3);
    ctx.fillRect(tx + 2, ty + 1, 1, 2);
  }
  ctx.fillStyle = 'rgba(14,26,10,0.5)';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(((i * 23 + n * 5) % 29) + 1, ((i * 17 + n * 13) % 28) + 2, 2, 1);
  }
  if (n === 3) { ctx.fillStyle = 'rgba(20,40,16,0.5)'; ctx.fillRect(8, 12, 3, 6); ctx.fillRect(20, 6, 3, 6); }
  if (n === 2) { ctx.fillStyle = '#b8aed0'; ctx.fillRect(9, 9, 2, 2); ctx.fillStyle = '#d0c890'; ctx.fillRect(22, 18, 2, 2); }
  if (n === 6) { ctx.fillStyle = 'rgba(90,86,78,0.6)'; ctx.beginPath(); ctx.arc(18, 20, 3, 0, 6.283); ctx.fill(); }
}

function floorBase(ctx: Ctx, n: number, theme?: CryptTheme): void {
  const f = theme?.floor ?? [27, -3, -6];
  const g = f[0] + n * 2;
  ctx.fillStyle = `rgb(${g},${g + f[1]},${g + f[2]})`;
  ctx.fillRect(0, 0, TILE, TILE);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
  // Plattenfugen + abgenutzte Stellen je Variante
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  if (n % 2 === 0) ctx.fillRect(0, 15 + (n % 3), TILE, 1);
  else ctx.fillRect(14 + (n % 4), 0, 1, TILE);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fillRect(((n * 11) % 20) + 3, ((n * 7) % 20) + 3, 6, 4);
  if (n === 4) {
    // Riss quer über die Platte
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(4, 8); ctx.lineTo(13, 14); ctx.lineTo(11, 22); ctx.lineTo(19, 27);
    ctx.stroke();
  }
}

export function drawTileArt(ctx: Ctx, name: string, n: number, theme?: CryptTheme): void {
  switch (name) {
    case 'gras': grasBase(ctx, n); break;
    case 'weg': {
      const g = 72 + n * 2;
      ctx.fillStyle = `rgb(${g},${g - 10},${g - 26})`;
      ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; if (n < 2) ctx.fillRect(n * 9, 10, 5, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(4 + n * 3, 22, 4, 3);
      // Kiesel und Karrenspuren
      ctx.fillStyle = `rgba(${g + 22},${g + 8},${g - 10},0.7)`;
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(((i * 17 + n * 9) % 27) + 2, ((i * 23 + n * 5) % 26) + 3, 2, 2);
      }
      if (n % 3 === 0) { ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(8, 0, 3, TILE); ctx.fillRect(21, 0, 3, TILE); }
      break;
    }
    case 'baum':
      grasBase(ctx, n);
      ctx.fillStyle = '#241a10'; ctx.fillRect(13, 18, 6, 10);
      ctx.fillStyle = '#1c3018'; ctx.beginPath(); ctx.arc(16, 12, 12, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(40,70,34,0.8)'; ctx.beginPath(); ctx.arc(12, 9, 7, 0, 6.283); ctx.fill();
      break;
    case 'wasser':
      // Animiert: n trägt die Phase (variant + Frame), Wellen wandern abwärts
      detail(ctx, (c) => wasser64(c, (((n % WASSER_FRAMES) + WASSER_FRAMES) % WASSER_FRAMES) / WASSER_FRAMES));
      break;
    case 'acker':
      detail(ctx, acker64);
      break;
    case 'zaun':
      grasBase(ctx, n);
      ctx.fillStyle = '#5c4427';
      ctx.fillRect(4, 8, 4, 18); ctx.fillRect(24, 8, 4, 18);
      ctx.fillRect(0, 12, TILE, 4); ctx.fillRect(0, 20, TILE, 4);
      break;
    case 'palisade': {
      // Stadtmauer Stufe 1: angespitzte Holzpfähle, dicht an dicht
      grasBase(ctx, n);
      for (let i = 0; i < 4; i++) {
        const px2 = 1 + i * 8;
        ctx.fillStyle = i % 2 === (n % 2) ? '#5c4427' : '#4e3a20';
        ctx.fillRect(px2, 6, 7, 24);
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.fillRect(px2, 6, 2, 24);
        // Spitze
        ctx.fillStyle = '#3a2c16';
        ctx.beginPath();
        ctx.moveTo(px2, 6); ctx.lineTo(px2 + 3.5, 0); ctx.lineTo(px2 + 7, 6);
        ctx.closePath(); ctx.fill();
      }
      // Querbalken
      ctx.fillStyle = 'rgba(42,30,16,0.85)';
      ctx.fillRect(0, 14, TILE, 3);
      ctx.fillRect(0, 24, TILE, 3);
      break;
    }
    case 'stadttor': {
      // Geschlossenes Stadttor: Bohlen quer über dem Weg, Eisenband
      const g = 72 + n * 2;
      ctx.fillStyle = `rgb(${g},${g - 10},${g - 26})`;
      ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = '#4e3a20';
      ctx.fillRect(0, 2, TILE, 28);
      ctx.fillStyle = '#3a2c16';
      for (let i = 0; i < 4; i++) ctx.fillRect(0, 2 + i * 7, TILE, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(0, 2, TILE, 2);
      ctx.fillStyle = '#6a665e';
      ctx.fillRect(0, 12, TILE, 3);
      ctx.fillRect(14, 10, 4, 7); // Schlossplatte
      ctx.fillStyle = '#1a1410';
      ctx.fillRect(15, 12, 2, 3);
      break;
    }
    case 'fachwerk_fassade': {
      ctx.fillStyle = '#8a7a62'; ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = '#2a1e12';
      ctx.fillRect(0, 0, TILE, 3); ctx.fillRect(0, TILE - 3, TILE, 3);
      ctx.fillRect(0, 0, 3, TILE); ctx.fillRect(TILE - 3, 0, 3, TILE);
      ctx.fillRect(14, 0, 3, TILE);
      if (n % 3 === 0) {
        // Fenster mit warmem Licht
        ctx.fillStyle = '#2a1e12'; ctx.fillRect(5, 8, 11, 13);
        ctx.fillStyle = 'rgba(232,168,74,0.95)'; ctx.fillRect(6, 9, 9, 11);
        ctx.fillStyle = '#2a1e12'; ctx.fillRect(10, 9, 1, 11); ctx.fillRect(6, 14, 9, 1);
      }
      break;
    }
    case 'fachwerk_dach': {
      ctx.fillStyle = '#4a2a20'; ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      for (let i = 0; i < 4; i++) ctx.fillRect(0, (i * 8 + (n % 2) * 4) % TILE, TILE, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, 0, TILE, 4);
      break;
    }
    case 'kirche_fassade': {
      ctx.fillStyle = '#55524c'; ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, 10, TILE, 2); ctx.fillRect(0, 21, TILE, 2);
      ctx.fillRect(n % 2 ? 8 : 18, 0, 2, 10); ctx.fillRect(n % 2 ? 20 : 8, 12, 2, 9);
      if (n % 3 === 1) {
        // Spitzbogenfenster mit fahlem Schein
        ctx.fillStyle = '#1c1a18';
        ctx.beginPath(); ctx.moveTo(11, 22); ctx.lineTo(11, 12);
        ctx.quadraticCurveTo(16, 4, 21, 12); ctx.lineTo(21, 22); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(140,160,200,0.30)'; ctx.fillRect(13, 12, 6, 9);
      }
      break;
    }
    case 'kirche_dach': {
      ctx.fillStyle = '#3a3e46'; ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      for (let i = 0; i < 4; i++) ctx.fillRect(0, (i * 8 + (n % 2) * 4) % TILE, TILE, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(0, 0, TILE, 3);
      break;
    }
    case 'kirchentuer':
      ctx.fillStyle = '#241a10'; ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = '#3a2c1c'; ctx.fillRect(5, 2, TILE - 10, TILE - 2);
      ctx.strokeStyle = '#c9a227'; ctx.strokeRect(5.5, 2.5, TILE - 11, TILE - 3);
      ctx.fillStyle = '#c9a227'; ctx.fillRect(TILE - 12, 16, 3, 3);
      break;
    case 'grabstein':
      grasBase(ctx, n);
      ctx.fillStyle = '#5a564e'; ctx.fillRect(10, 8, 12, 18);
      ctx.beginPath(); ctx.arc(16, 8, 6, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(13, 13, 6, 2);
      break;
    case 'brunnen':
      grasBase(ctx, n);
      ctx.fillStyle = '#55504a'; ctx.beginPath(); ctx.arc(16, 16, 13, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#10141c'; ctx.beginPath(); ctx.arc(16, 16, 8, 0, 6.283); ctx.fill();
      break;
    case 'brandstelle':
      ctx.fillStyle = '#1c1814'; ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = 'rgba(60,50,40,0.4)'; ctx.fillRect(n * 3, n * 2, 6, 3);
      break;
    case 'krypta_boden':
      floorBase(ctx, n, theme);
      if (n === 5) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(6, 10, 12, 2); ctx.fillRect(14, 12, 2, 8); }
      break;
    case 'krypta_wand': {
      const wt = theme ?? { wallTop: '#0f0c08', wallFace: '#262017' } as CryptTheme;
      ctx.fillStyle = wt.wallTop; ctx.fillRect(0, 0, TILE, TILE);
      break;
    }
    case 'krypta_wand_front': {
      const wt = theme ?? { wallTop: '#0f0c08', wallFace: '#262017' } as CryptTheme;
      ctx.fillStyle = wt.wallTop; ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = wt.wallFace; ctx.fillRect(0, TILE - 10, TILE, 10);
      // Mauerwerk in der Stirnseite: Fugen und Lichtkante
      ctx.fillStyle = 'rgba(0,0,0,0.30)';
      ctx.fillRect(0, TILE - 6, TILE, 1);
      ctx.fillRect((n % 2) * 8 + 5, TILE - 10, 1, 4);
      ctx.fillRect((n % 2) * 8 + 19, TILE - 6, 1, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(0, TILE - 10, TILE, 1);
      break;
    }
    case 'mauerriss': {
      // Brüchige Wand (Front) mit deutlichen Rissen - lädt zum Aufbrechen ein
      const wt = theme ?? { wallTop: '#0f0c08', wallFace: '#262017' } as CryptTheme;
      ctx.fillStyle = wt.wallTop; ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = wt.wallFace; ctx.fillRect(0, TILE - 12, TILE, 12);
      // dunkle Risse, die von oben nach unten zacken
      ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(10, 2); ctx.lineTo(14, 11); ctx.lineTo(9, 20); ctx.lineTo(13, TILE - 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(22, 4); ctx.lineTo(18, 13); ctx.lineTo(23, 22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14, 11); ctx.lineTo(22, 13); ctx.stroke();
      // ein paar lose Brocken als Lichtkante
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(8, 14, 3, 2); ctx.fillRect(19, 18, 3, 2); ctx.fillRect(13, 24, 2, 2);
      ctx.lineWidth = 1;
      break;
    }
    case 'knochen':
      // Liegendes Skelett (Runde 40, Batch 2) auf der Bodenplatte
      floorBase(ctx, n, theme);
      detail(ctx, skelett64);
      break;
    case 'blut':
      floorBase(ctx, n, theme);
      ctx.fillStyle = 'rgba(110,16,16,0.55)';
      ctx.beginPath(); ctx.arc(13 + n, 14, 7, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(23, 21, 3.5, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(7, 23, 2.5, 0, 6.283); ctx.fill();
      break;
    case 'rune': {
      floorBase(ctx, n, theme);
      const rc = theme?.rune ?? '#c03030';
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = rc;
      ctx.beginPath(); ctx.arc(16, 16, 9, 0, 6.283); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(16, 7); ctx.lineTo(24, 21); ctx.lineTo(8, 21); ctx.closePath(); ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case 'altar':
      // Opferaltar (Runde 40, Batch 2): Stein, Blutrinne, Schädel, Kerzen
      floorBase(ctx, n, theme);
      detail(ctx, altar64);
      break;
    case 'abgrund': {
      // Bodenloser Schacht (Brücken-Prototyp ab Ebene 4): oben ein fahler
      // Felssaum, der nach unten in pures Schwarz abfällt - Blick in die Tiefe.
      const g2 = ctx.createLinearGradient(0, 0, 0, TILE);
      g2.addColorStop(0, '#1b1612'); g2.addColorStop(0.22, '#0a0809'); g2.addColorStop(1, '#000000');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = 'rgba(120,108,92,0.18)'; ctx.fillRect(0, 0, TILE, 1);   // Lichtkante der Schachtmauer
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 3, TILE, 2);          // Schattenkante darunter
      ctx.fillStyle = 'rgba(90,80,68,0.16)';                                   // ferne Felsbrocken tief unten
      ctx.fillRect(((n * 13) % 22) + 5, ((n * 7) % 10) + 18, 2, 1);
      ctx.fillRect(((n * 19) % 20) + 6, ((n * 11) % 8) + 22, 1, 1);
      break;
    }
    case 'bruecke': {
      // Holzsteg über den Abgrund: Planken quer, dunkle Spalten (die Tiefe
      // schimmert durch), seitliche Trägerbalken, Eisennägel.
      ctx.fillStyle = '#0a0809'; ctx.fillRect(0, 0, TILE, TILE);
      for (let i = 0; i < 5; i++) {
        const y = i * 6 + 1;
        ctx.fillStyle = i % 2 ? '#5a4228' : '#624a2e'; ctx.fillRect(0, y, TILE, 5);
        ctx.fillStyle = 'rgba(255,236,196,0.08)'; ctx.fillRect(0, y, TILE, 1);   // Lichtkante
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, y + 5, TILE, 1);      // Spalt
        ctx.fillStyle = 'rgba(40,28,16,0.4)'; ctx.fillRect(((i * 11) % 24) + 3, y + 1, 1, 3); // Maserung
      }
      ctx.fillStyle = '#3a2a18'; ctx.fillRect(0, 0, 2, TILE); ctx.fillRect(TILE - 2, 0, 2, TILE); // Trägerbalken
      ctx.fillStyle = '#2a2620';
      for (const yy of [3, 15, 27]) { ctx.fillRect(3, yy, 1.6, 1.6); ctx.fillRect(TILE - 4, yy, 1.6, 1.6); }
      break;
    }
    case 'regal': {
      ctx.fillStyle = '#2e2114'; ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = '#1a1108'; ctx.fillRect(2, 4, TILE - 4, 9); ctx.fillRect(2, 18, TILE - 4, 9);
      const bc = ['#7a3030', '#3a5a7a', '#6a6a3a', '#5a3a6a', '#7a5a2a'];
      for (let i = 0; i < 5; i++) { ctx.fillStyle = bc[(i + n) % 5]; ctx.fillRect(4 + i * 5, 5, 3.5, 7); }
      for (let i = 0; i < 5; i++) { ctx.fillStyle = bc[(i + n + 2) % 5]; ctx.fillRect(4 + i * 5, 19, 3.5, 7); }
      break;
    }
    case 'treppe_ab': case 'treppe_auf':
      ctx.fillStyle = '#0a0805'; ctx.fillRect(0, 0, TILE, TILE);
      ctx.strokeStyle = name === 'treppe_ab' ? '#c9a227' : '#8a9ab8';
      ctx.strokeRect(3.5, 3.5, TILE - 7, TILE - 7);
      ctx.fillStyle = '#4a4434';
      for (let i = 1; i < 4; i++) ctx.fillRect(6, 3 + i * 6, TILE - 12, 2);
      break;
    case 'erzader':
      floorBase(ctx, n, theme);
      ctx.fillStyle = '#4a4640'; ctx.beginPath(); ctx.arc(16, 16, 11, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#8a8e96'; ctx.fillRect(9, 12, 4, 3); ctx.fillRect(17, 17, 5, 3); ctx.fillRect(14, 8, 3, 3);
      break;
    case 'fels':
      grasBase(ctx, n);
      ctx.fillStyle = '#6a665e';
      ctx.beginPath(); ctx.moveTo(5, 24); ctx.lineTo(8, 10); ctx.lineTo(20, 7); ctx.lineTo(27, 16); ctx.lineTo(23, 25); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(10, 10, 8, 3);
      break;
    case 'streckbank':
      // Folterbank (Runde 40, Batch 2): Rahmen, Walzen, Seile, Blut
      floorBase(ctx, n, theme);
      detail(ctx, folterbank64);
      break;
    case 'kaefig':
      floorBase(ctx, n, theme);
      ctx.strokeStyle = '#55504a';
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(6 + i * 5, 4); ctx.lineTo(6 + i * 5, 28); ctx.stroke(); }
      ctx.strokeRect(4.5, 3.5, 23, 25);
      if (n % 2 === 0) { ctx.fillStyle = '#cfc4a8'; ctx.fillRect(12, 22, 8, 2.5); ctx.beginPath(); ctx.arc(16, 18, 3, 0, 6.283); ctx.fill(); }
      break;
    case 'kerzenschrein':
      floorBase(ctx, n, theme);
      ctx.fillStyle = '#3a362e'; ctx.fillRect(6, 14, 20, 12);
      ctx.fillStyle = '#e8e0c8';
      ctx.fillRect(9, 8, 3, 7); ctx.fillRect(15, 5, 3, 10); ctx.fillRect(21, 9, 3, 6);
      ctx.fillStyle = '#f8d878';
      ctx.beginPath(); ctx.ellipse(10.5, 6, 1.5, 2.5, 0, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.ellipse(16.5, 3, 1.5, 2.5, 0, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.ellipse(22.5, 7, 1.5, 2.5, 0, 0, 6.283); ctx.fill();
      break;
    // --- Innenräume (Feedback-Runde 9): warm und wohnlich ---
    case 'holzboden': {
      const g = 74 + (n % 3) * 4;
      ctx.fillStyle = `rgb(${g},${g - 22},${g - 42})`;
      ctx.fillRect(0, 0, TILE, TILE);
      // Dielenbretter mit versetzten Stößen
      ctx.fillStyle = 'rgba(30,18,8,0.5)';
      for (let i = 0; i < 4; i++) ctx.fillRect(0, i * 8, TILE, 1);
      ctx.fillRect(((n * 11) % 24) + 4, 1, 1, 7);
      ctx.fillRect(((n * 17) % 24) + 4, 17, 1, 7);
      ctx.fillStyle = 'rgba(255,220,160,0.05)';
      ctx.fillRect(0, 0, TILE, 8);
      break;
    }
    case 'teppich':
      drawTileArt(ctx, 'holzboden', n);
      ctx.fillStyle = '#6a2a28'; ctx.fillRect(2, 2, TILE - 4, TILE - 4);
      ctx.strokeStyle = '#c9a227'; ctx.strokeRect(4.5, 4.5, TILE - 9, TILE - 9);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(2, TILE - 5, TILE - 4, 3);
      break;
    case 'haustuer':
      ctx.fillStyle = '#8a7a62'; ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = '#2a1e12'; ctx.fillRect(0, 0, TILE, 3); ctx.fillRect(0, 0, 3, TILE); ctx.fillRect(TILE - 3, 0, 3, TILE);
      ctx.fillStyle = '#4e3a20'; ctx.fillRect(6, 4, TILE - 12, TILE - 4);
      ctx.fillStyle = '#3a2c16';
      for (let i = 0; i < 3; i++) ctx.fillRect(8 + i * 6, 4, 2, TILE - 4);
      ctx.fillStyle = '#c9a227'; ctx.fillRect(TILE - 12, 17, 3, 3);
      break;
    default:
      // Unbekanntes Tile sichtbar machen statt still zu scheitern
      ctx.fillStyle = '#3a1a3a'; ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = '#c0c0c0'; ctx.fillText('?', 13, 20);
  }
}

// Stehende Objekte (Baum, Fels, Grabstein ...) als transparente Sprites für
// die Y-Sortierung: der Boden liegt separat darunter (Masterprompt 5.1).
export const STANDING_OBJECTS = new Set([
  'baum', 'fels', 'grabstein', 'brunnen', 'zaun', 'erzader', 'altar',
  'regal', 'kerzenschrein', 'streckbank', 'kaefig', 'palisade',
  'bett', 'tisch', 'stuhl', 'kamin', 'tresen',
  'kerze', 'wandfackel', 'brennholz', 'kessel',
]);

export function drawObjectArt(ctx: Ctx, name: string, n: number, theme?: CryptTheme): void {
  ctx.clearRect(0, 0, TILE, TILE);
  switch (name) {
    case 'baum':
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(16, 28, 9, 3.5, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#241a10'; ctx.fillRect(13, 18, 6, 10);
      ctx.fillStyle = '#2e2014'; ctx.fillRect(13, 18, 2, 10);
      // Krone: dunkler Rand, Grundton, zwei Lichtballen, Tiefenflecken
      ctx.fillStyle = '#10200e'; ctx.beginPath(); ctx.arc(16, 12, 13, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#1c3018'; ctx.beginPath(); ctx.arc(16, 12, 11.5, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(40,70,34,0.85)'; ctx.beginPath(); ctx.arc(12, 9, 7, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(58,94,46,0.6)'; ctx.beginPath(); ctx.arc(10, 7, 3.5, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(8,18,6,0.5)';
      ctx.beginPath(); ctx.arc(21, 16, 3.5, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(14, 17, 2.5, 0, 6.283); ctx.fill();
      break;
    case 'fels':
      // Felsbrocken (Runde 40, Batch 2): facettierter Granitblock mit Moos
      detail(ctx, fels64);
      break;
    case 'grabstein':
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(16, 27, 8, 3, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#5a564e'; ctx.fillRect(10, 8, 12, 18);
      ctx.beginPath(); ctx.arc(16, 8, 6, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(13, 13, 6, 2);
      break;
    case 'brunnen':
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(16, 28, 13, 3.5, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#55504a'; ctx.beginPath(); ctx.arc(16, 16, 13, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#10141c'; ctx.beginPath(); ctx.arc(16, 16, 8, 0, 6.283); ctx.fill();
      // kleines Dachgestell
      ctx.strokeStyle = '#3a2c1c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(6, 16); ctx.lineTo(6, 4); ctx.lineTo(26, 4); ctx.lineTo(26, 16); ctx.stroke();
      ctx.fillStyle = '#4a2a20'; ctx.fillRect(4, 1, 24, 4);
      break;
    case 'wald':
      // Dichter Wald (Fallback): wie der Baum, nur dunkler und voller
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(16, 28, 10, 3.5, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#0c180a'; ctx.beginPath(); ctx.arc(16, 13, 14, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#15240f'; ctx.beginPath(); ctx.arc(16, 13, 12.5, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(34,56,28,0.85)'; ctx.beginPath(); ctx.arc(12, 10, 7, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(6,12,4,0.6)';
      ctx.beginPath(); ctx.arc(21, 17, 4, 0, 6.283); ctx.fill();
      break;
    case 'baumstumpf':
      // Frisch gefällter Stumpf mit Jahresringen
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(16, 22, 8, 3, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#3a2c16'; ctx.fillRect(10, 14, 12, 7);
      ctx.fillStyle = '#8a6a42'; ctx.beginPath(); ctx.ellipse(16, 14, 6.5, 4, 0, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#6a4c28';
      ctx.beginPath(); ctx.ellipse(16, 14, 4, 2.4, 0, 0, 6.283); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(16, 14, 1.8, 1, 0, 0, 6.283); ctx.stroke();
      break;
    case 'zaun':
      // Zaun (Runde 40, Batch 2): verwitterte Latten mit Maserung und Nägeln
      detail(ctx, zaun64);
      break;
    case 'palisade': case 'palisade_seite':
      for (let i = 0; i < 4; i++) {
        const px2 = 1 + i * 8;
        ctx.fillStyle = i % 2 === (n % 2) ? '#5c4427' : '#4e3a20';
        ctx.fillRect(px2, 6, 7, 24);
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.fillRect(px2, 6, 2, 24);
        ctx.fillStyle = '#3a2c16';
        ctx.beginPath();
        ctx.moveTo(px2, 6); ctx.lineTo(px2 + 3.5, 0); ctx.lineTo(px2 + 7, 6);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = 'rgba(42,30,16,0.85)';
      ctx.fillRect(0, 14, TILE, 3);
      ctx.fillRect(0, 24, TILE, 3);
      break;
    case 'bett':
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(16, 27, 12, 3.5, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#4e3a20'; ctx.fillRect(4, 6, 24, 21); // Rahmen
      ctx.fillStyle = '#7a3030'; ctx.fillRect(6, 12, 20, 13); // Decke
      ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(6, 12, 20, 3);
      ctx.fillStyle = '#e8e0c8'; ctx.fillRect(8, 7, 16, 5); // Kissen
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(8, 10, 16, 2);
      break;
    case 'tisch':
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(16, 27, 12, 3.5, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#3a2c16'; ctx.fillRect(6, 20, 3, 7); ctx.fillRect(23, 20, 3, 7); // Beine
      ctx.fillStyle = '#6a4c28'; ctx.fillRect(3, 9, 26, 12); // Platte
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(3, 9, 26, 3);
      ctx.fillStyle = '#e8e0c8'; ctx.beginPath(); ctx.arc(12, 14, 3, 0, 6.283); ctx.fill(); // Teller
      ctx.fillStyle = '#f8d878'; ctx.beginPath(); ctx.ellipse(21, 12, 1.4, 2.4, 0, 0, 6.283); ctx.fill(); // Kerze
      break;
    case 'stuhl':
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(16, 26, 7, 2.5, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#5a4427'; ctx.fillRect(10, 8, 12, 4);  // Lehne
      ctx.fillRect(10, 14, 12, 7); // Sitz
      ctx.fillStyle = '#3a2c16'; ctx.fillRect(10, 21, 2, 5); ctx.fillRect(20, 21, 2, 5);
      break;
    case 'kamin':
      ctx.fillStyle = '#55504a'; ctx.fillRect(3, 2, 26, 26); // Steinrahmen
      ctx.fillStyle = '#3a362e'; ctx.fillRect(3, 2, 26, 5);
      ctx.fillStyle = '#16100a'; ctx.fillRect(7, 9, 18, 17);  // Feuerraum
      ctx.fillStyle = '#d8842a'; // Flammen
      ctx.beginPath(); ctx.moveTo(10, 25); ctx.quadraticCurveTo(13, 14, 16, 25); ctx.fill();
      ctx.beginPath(); ctx.moveTo(15, 25); ctx.quadraticCurveTo(19, 12, 22, 25); ctx.fill();
      ctx.fillStyle = '#f8d878';
      ctx.beginPath(); ctx.moveTo(13, 25); ctx.quadraticCurveTo(16, 18, 19, 25); ctx.fill();
      ctx.fillStyle = '#2a1e12'; ctx.fillRect(7, 24, 18, 3); // Glutbett
      break;
    case 'tresen':
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(16, 27, 13, 3.5, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#4e3a20'; ctx.fillRect(2, 12, 28, 14); // Korpus
      ctx.fillStyle = '#6a4c28'; ctx.fillRect(1, 8, 30, 6);   // Platte
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(1, 8, 30, 2);
      ctx.fillStyle = '#8a6a4a'; ctx.beginPath(); ctx.ellipse(9, 9, 2.4, 3, 0, 0, 6.283); ctx.fill(); // Krug
      ctx.fillStyle = '#b8bcc4'; ctx.beginPath(); ctx.arc(22, 10, 2, 0, 6.283); ctx.fill(); // Becher
      break;
    case 'kerze':
      // Kerzenständer (Kandelaber): Fuß, Schaft, Kerze - Flamme kommt als Overlay
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.ellipse(16, 27, 6, 2.4, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#3a3026'; ctx.fillRect(14, 24, 4, 3);     // Fuß
      ctx.fillStyle = '#6a5a3a'; ctx.fillRect(15, 14, 2, 11);    // Schaft (Messing)
      ctx.fillStyle = '#8a7448'; ctx.fillRect(15, 14, 1, 11);
      ctx.fillStyle = '#7a6a48'; ctx.fillRect(12, 22, 8, 2);     // Teller
      ctx.fillStyle = '#e8e0c8'; ctx.fillRect(14, 8, 4, 7);      // Kerze (Wachs)
      ctx.fillStyle = '#fff8e0'; ctx.fillRect(14, 8, 1, 7);
      ctx.fillStyle = '#2a2018'; ctx.fillRect(15, 7, 1, 2);      // Docht
      break;
    case 'wandfackel':
      // Wandfackel: Eisenhalter + Fackelkopf - Flamme kommt als Overlay
      ctx.fillStyle = '#2a2620'; ctx.fillRect(14, 10, 4, 16);    // Stiel
      ctx.fillStyle = '#3a3630'; ctx.fillRect(14, 10, 1, 16);
      ctx.fillStyle = '#4a4036'; ctx.fillRect(11, 16, 10, 3);    // Wandhalterung
      ctx.fillStyle = '#5a4e40'; ctx.fillRect(11, 16, 10, 1);
      ctx.fillStyle = '#241c12'; ctx.beginPath(); ctx.ellipse(16, 9, 4, 3, 0, 0, 6.283); ctx.fill(); // Pechkopf
      break;
    case 'brennholz':
      // Brennholzstapel neben dem Kamin
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.ellipse(16, 26, 12, 3, 0, 0, 6.283); ctx.fill();
      for (const [ly, lx0] of [[20, 5], [20, 13], [20, 21], [15, 9], [15, 17], [11, 13]] as Array<[number, number]>) {
        ctx.fillStyle = '#5a4026'; ctx.fillRect(lx0, ly, 7, 5);
        ctx.fillStyle = '#cdb98a'; ctx.beginPath(); ctx.ellipse(lx0 + 0.5, ly + 2.5, 1.6, 2.2, 0, 0, 6.283); ctx.fill(); // Schnittfläche
        ctx.fillStyle = '#9a7a4a'; ctx.beginPath(); ctx.ellipse(lx0 + 0.5, ly + 2.5, 0.8, 1.3, 0, 0, 6.283); ctx.fill();
      }
      break;
    case 'kessel':
      // Kessel über dem Feuer (Dreifuß + schwarzer Topf)
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(16, 27, 9, 3, 0, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#2a2620'; ctx.lineWidth = 2;            // Dreifuß
      ctx.beginPath(); ctx.moveTo(9, 26); ctx.lineTo(13, 16); ctx.moveTo(23, 26); ctx.lineTo(19, 16); ctx.moveTo(16, 27); ctx.lineTo(16, 18); ctx.stroke();
      ctx.fillStyle = '#1c1a18'; ctx.beginPath(); ctx.ellipse(16, 16, 9, 8, 0, 0, 6.283); ctx.fill(); // Topf
      ctx.fillStyle = '#2e2a26'; ctx.beginPath(); ctx.ellipse(16, 11, 8, 3, 0, 0, 6.283); ctx.fill(); // Rand
      ctx.fillStyle = '#0e0c0a'; ctx.beginPath(); ctx.ellipse(16, 11, 6.5, 2.2, 0, 0, 6.283); ctx.fill(); // Öffnung
      ctx.strokeStyle = '#3a3630'; ctx.lineWidth = 1.4;          // Henkel
      ctx.beginPath(); ctx.arc(16, 11, 8, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      break;
    default:
      drawTileArt(ctx, name, n, theme);
  }
}

// Zerstörbare Objekte als eigenständige Sprites (über dem Boden)
// Detaillierte 64px-Variante (Runde 40, Autorwunsch "maximale Details in
// 64x64 runterskaliert"). Objekte mittig (Zentrum ~y30), Bodenschatten unten.
export function drawBreakable(ctx: Ctx, kind: string): void {
  const cx = 32;
  ctx.clearRect(0, 0, 64, 64);
  ctx.fillStyle = 'rgba(0,0,0,0.26)'; ctx.beginPath(); ctx.ellipse(cx, 50, 16, 4.5, 0, 0, 6.283); ctx.fill();
  switch (kind) {
    case 'fass': {
      const cy = 30, rx = 15, ry = 19;
      const body = () => { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.283); };
      ctx.fillStyle = '#684a28'; body(); ctx.fill();
      ctx.save(); body(); ctx.clip();
      ctx.fillStyle = 'rgba(255,238,205,0.13)'; ctx.fillRect(cx - rx, cy - ry, 9, ry * 2);  // Lichtseite
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(cx + 6, cy - ry, 11, ry * 2);          // Schattenseite
      ctx.strokeStyle = 'rgba(38,28,18,0.45)'; ctx.lineWidth = 1;
      for (const dx of [-10, -4, 2, 8]) { ctx.beginPath(); ctx.moveTo(cx + dx, cy - ry); ctx.lineTo(cx + dx, cy + ry); ctx.stroke(); }
      ctx.fillStyle = '#322820'; for (const yy of [cy - ry + 5, cy, cy + ry - 6]) ctx.fillRect(cx - rx, yy, rx * 2, 3);   // Reifen
      ctx.fillStyle = 'rgba(210,200,180,0.3)'; for (const yy of [cy - ry + 5, cy, cy + ry - 6]) ctx.fillRect(cx - rx, yy, rx * 2, 1);
      ctx.restore();
      ctx.fillStyle = '#5a3f22'; ctx.beginPath(); ctx.ellipse(cx, cy - ry, rx - 1, 4.4, 0, 0, 6.283); ctx.fill();        // Deckel
      ctx.fillStyle = '#73512c'; ctx.beginPath(); ctx.ellipse(cx, cy - ry, rx - 4, 2.6, 0, 0, 6.283); ctx.fill();
      break;
    }
    case 'kiste': {
      const x0 = 12, y0 = 12, w = 40, h = 38;
      ctx.fillStyle = '#7a5c34'; ctx.fillRect(x0, y0, w, h);
      ctx.fillStyle = 'rgba(255,230,190,0.07)'; for (let px = x0 + 4; px < x0 + w; px += 8) ctx.fillRect(px, y0, 1, h);   // Maserung
      ctx.fillStyle = 'rgba(38,26,14,0.42)'; for (let py = y0 + 10; py < y0 + h; py += 10) ctx.fillRect(x0, py, w, 1.6); // Planken
      ctx.fillStyle = '#8a6a3e'; ctx.fillRect(x0, y0, w, 8); ctx.fillStyle = 'rgba(38,26,14,0.42)'; ctx.fillRect(x0, y0 + 8, w, 1.6); // Deckel
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x0 + w - 6, y0, 6, h); ctx.fillRect(x0, y0 + h - 5, w, 5);        // Schatten
      ctx.fillStyle = '#3a3026'; for (const [bx, by] of [[x0, y0], [x0 + w - 6, y0], [x0, y0 + h - 6], [x0 + w - 6, y0 + h - 6]]) ctx.fillRect(bx, by, 6, 6); // Eckbeschläge
      ctx.fillStyle = '#5a5048'; for (const [bx, by] of [[x0 + 3, y0 + 3], [x0 + w - 3, y0 + 3], [x0 + 3, y0 + h - 3], [x0 + w - 3, y0 + h - 3]]) { ctx.beginPath(); ctx.arc(bx, by, 1.1, 0, 6.283); ctx.fill(); }
      ctx.strokeStyle = '#4a3a20'; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
      break;
    }
    case 'krug': {
      const cy = 32;
      ctx.fillStyle = '#9a6a44'; ctx.beginPath(); ctx.ellipse(cx, cy + 6, 13, 15, 0, 0, 6.283); ctx.fill();             // Bauch
      ctx.fillStyle = '#8a5e3a'; ctx.fillRect(cx - 5, cy - 12, 10, 13);                                                 // Hals
      ctx.strokeStyle = '#8a5e3a'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(cx + 12, cy - 1, 6, -1.2, 1.2); ctx.stroke(); ctx.lineWidth = 1; // Henkel
      ctx.fillStyle = '#7a5230'; ctx.beginPath(); ctx.ellipse(cx, cy - 12, 6, 2.6, 0, 0, 6.283); ctx.fill();            // Mündung
      ctx.fillStyle = '#5a3c22'; ctx.beginPath(); ctx.ellipse(cx, cy - 12, 4, 1.6, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,210,0.18)'; ctx.beginPath(); ctx.ellipse(cx - 5, cy + 3, 3.2, 7, 0, 0, 6.283); ctx.fill(); // Glasur
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(cx + 7, cy + 8, 3.4, 9, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#6a4226'; ctx.fillRect(cx - 13, cy + 1, 26, 2);                                                  // Zierband
      break;
    }
    case 'knochenhaufen': {
      const cy = 34;
      ctx.strokeStyle = '#cfc4a8'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - 13, cy + 6); ctx.lineTo(cx + 13, cy - 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 11, cy - 5); ctx.lineTo(cx + 11, cy + 9); ctx.stroke();
      ctx.lineCap = 'butt'; ctx.lineWidth = 1;
      ctx.fillStyle = '#e0d6ba'; ctx.beginPath(); ctx.arc(cx, cy - 5, 8, 0, 6.283); ctx.fill();                         // Schädel
      ctx.fillStyle = '#cfc4a8'; ctx.fillRect(cx - 5, cy + 1, 10, 5);                                                   // Kiefer
      ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.arc(cx - 3, cy - 6, 2.2, 0, 6.283); ctx.arc(cx + 3, cy - 6, 2.2, 0, 6.283); ctx.fill();
      ctx.fillRect(cx - 1, cy - 2, 2, 2.4);                                                                              // Nase
      ctx.strokeStyle = '#9a8e70'; for (let i = -3; i <= 3; i += 2) { ctx.beginPath(); ctx.moveTo(cx + i, cy + 1); ctx.lineTo(cx + i, cy + 5); ctx.stroke(); }
      break;
    }
    case 'spinnwebe': {
      ctx.strokeStyle = 'rgba(220,224,230,0.42)'; ctx.lineWidth = 0.8;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(4 + Math.cos(i * 0.28) * 56, 4 + Math.sin(i * 0.28) * 56); ctx.stroke(); }
      for (let r = 12; r <= 52; r += 10) { ctx.beginPath(); ctx.arc(4, 4, r, 0, 1.55); ctx.stroke(); }
      ctx.lineWidth = 1;
      break;
    }
    case 'heuhaufen': {
      const cy = 36;
      ctx.fillStyle = '#b89a4e'; ctx.beginPath(); ctx.ellipse(cx, cy, 20, 14, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#a8893e'; ctx.beginPath(); ctx.ellipse(cx, cy + 3, 20, 11, 0, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#8a7038'; ctx.lineWidth = 1;
      for (let i = 0; i < 24; i++) { const a = (i * 2.39) % 6.283; const r1 = 5 + (i * 7 % 13); const ex = cx + Math.cos(a) * r1, ey = cy + Math.sin(a) * r1 * 0.7; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(a) * 4, ey + Math.sin(a) * 3); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,240,180,0.22)'; ctx.beginPath(); ctx.ellipse(cx - 3, cy - 5, 10, 4, 0, 0, 6.283); ctx.fill();
      break;
    }
  }
}
