// Programmatische Tiles - portiert aus der Referenz (drawTile), als
// Texturen-Generator. Variante (0-6) bringt Beschnitt-Abwechslung wie
// das tileNoise der Referenz.

import { TILE, shade } from './fallbackArt';
import type { CryptTheme } from '../data/krypta';

type Ctx = CanvasRenderingContext2D;

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
    case 'wasser': {
      ctx.fillStyle = '#16222e'; ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = 'rgba(120,150,180,0.18)';
      ctx.fillRect(2 + n * 2, 6 + n, 10, 2); ctx.fillRect(14, 20 - n, 12, 2);
      // Glitzerpunkte und dunkler Grund
      ctx.fillStyle = 'rgba(180,210,235,0.30)';
      ctx.fillRect(((n * 13) % 24) + 4, ((n * 7) % 22) + 4, 2, 1);
      ctx.fillRect(((n * 19) % 22) + 5, ((n * 11) % 24) + 4, 1, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(((n * 9) % 18) + 6, ((n * 15) % 16) + 10, 8, 3);
      break;
    }
    case 'acker': {
      ctx.fillStyle = '#3a2c1c'; ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = '#2c2014';
      for (let i = 0; i < 4; i++) ctx.fillRect(0, 2 + i * 8, TILE, 3);
      break;
    }
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
    case 'knochen':
      floorBase(ctx, n, theme);
      ctx.fillStyle = '#cfc4a8';
      ctx.fillRect(6, 19, 9, 2.5); ctx.fillRect(18, 10, 8, 2.5);
      ctx.beginPath(); ctx.arc(12, 11, 4, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#1a1410'; ctx.fillRect(10, 10, 1.8, 2); ctx.fillRect(13.2, 10, 1.8, 2);
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
    case 'altar': {
      floorBase(ctx, n, theme);
      ctx.fillStyle = '#3a362e'; ctx.fillRect(4, 9, TILE - 8, TILE - 12);
      ctx.fillStyle = '#4e4a40'; ctx.fillRect(2, 6, TILE - 4, 7);
      ctx.fillStyle = 'rgba(110,16,16,0.8)'; ctx.fillRect(12, 13, 8, 3); ctx.fillRect(15, 16, 3, 9);
      ctx.fillStyle = '#f8d878';
      ctx.beginPath(); ctx.ellipse(6, 4, 1.6, 3, 0, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.ellipse(26, 4, 1.6, 3, 0, 0, 6.283); ctx.fill();
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
      floorBase(ctx, n, theme);
      ctx.fillStyle = '#3a2c1a'; ctx.fillRect(4, 10, 24, 12);
      ctx.fillStyle = '#241a0e'; ctx.fillRect(2, 8, 5, 16); ctx.fillRect(25, 8, 5, 16);
      ctx.strokeStyle = '#6a665e'; ctx.beginPath(); ctx.moveTo(7, 14); ctx.lineTo(25, 14); ctx.moveTo(7, 19); ctx.lineTo(25, 19); ctx.stroke();
      ctx.fillStyle = 'rgba(110,16,16,0.5)'; ctx.fillRect(12, 12, 6, 8);
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
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(16, 26, 11, 3.5, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#6a665e';
      ctx.beginPath(); ctx.moveTo(5, 24); ctx.lineTo(8, 10); ctx.lineTo(20, 7); ctx.lineTo(27, 16); ctx.lineTo(23, 25); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(10, 10, 8, 3);
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
    case 'zaun':
      ctx.fillStyle = '#5c4427';
      ctx.fillRect(4, 8, 4, 18); ctx.fillRect(24, 8, 4, 18);
      ctx.fillRect(0, 12, TILE, 4); ctx.fillRect(0, 20, TILE, 4);
      break;
    case 'palisade':
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
    default:
      drawTileArt(ctx, name, n, theme);
  }
}

// Zerstörbare Objekte als eigenständige Sprites (über dem Boden)
export function drawBreakable(ctx: Ctx, kind: string): void {
  ctx.clearRect(0, 0, TILE, TILE);
  switch (kind) {
    case 'fass':
      ctx.fillStyle = '#6a4c28'; ctx.beginPath(); ctx.ellipse(16, 17, 9, 11, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = shade('#6a4c28', 16); ctx.fillRect(8, 12, 16, 3);
      ctx.strokeStyle = '#3a3026'; ctx.beginPath(); ctx.ellipse(16, 17, 9, 11, 0, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = '#26201a';
      ctx.beginPath(); ctx.moveTo(7, 13); ctx.lineTo(25, 13); ctx.moveTo(7, 21); ctx.lineTo(25, 21); ctx.stroke();
      break;
    case 'kiste':
      ctx.fillStyle = '#7a5c34'; ctx.fillRect(6, 9, 20, 17);
      ctx.strokeStyle = '#4a3a20'; ctx.strokeRect(6.5, 9.5, 19, 16);
      ctx.beginPath(); ctx.moveTo(6, 9); ctx.lineTo(26, 26); ctx.moveTo(26, 9); ctx.lineTo(6, 26); ctx.stroke();
      break;
    case 'krug':
      ctx.fillStyle = '#8a6a4a'; ctx.beginPath(); ctx.ellipse(16, 19, 7, 8, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#6a4c30'; ctx.fillRect(12, 8, 8, 5);
      break;
    case 'knochenhaufen':
      ctx.fillStyle = '#cfc4a8';
      ctx.fillRect(8, 20, 10, 3); ctx.fillRect(16, 15, 9, 3);
      ctx.beginPath(); ctx.arc(13, 13, 4.5, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#1a1410'; ctx.fillRect(11, 12, 2, 2); ctx.fillRect(14.5, 12, 2, 2);
      break;
    case 'spinnwebe':
      ctx.strokeStyle = 'rgba(220,220,220,0.5)';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.moveTo(2, 2);
        ctx.lineTo(2 + Math.cos(i * 0.35) * 26, 2 + Math.sin(i * 0.35) * 26); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(2, 2, 12, 0, 1.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(2, 2, 20, 0, 1.6); ctx.stroke();
      break;
    case 'heuhaufen':
      ctx.fillStyle = '#b89a4e'; ctx.beginPath(); ctx.ellipse(16, 19, 12, 9, 0, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#8a7038';
      ctx.beginPath(); ctx.moveTo(8, 16); ctx.lineTo(13, 21); ctx.moveTo(16, 12); ctx.lineTo(20, 18); ctx.stroke();
      break;
  }
}
