// Gezeichnete Item-Icons je Typ (Fallback, Masterprompt 5.2).

import type { Item, GemItem } from '../data/types';
import { shade } from './fallbackArt';

export const ICON_SIZE = 64;

export function drawItemIcon(ctx: CanvasRenderingContext2D, it: Item): void {
  ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
  ctx.save();
  ctx.translate(32, 32);
  switch (it.kind) {
    case 'weapon': drawWeapon(ctx, it); break;
    case 'armor': drawArmor(ctx); break;
    case 'schild': drawSchild(ctx); break;
    case 'ring': drawRing(ctx); break;
    case 'gem': drawGem(ctx, it as GemItem); break;
    case 'potion': drawPotion(ctx, '#d8402a'); break;
    case 'mpotion': drawPotion(ctx, '#4a6ae0'); break;
    case 'elixir': drawPotion(ctx, '#c9a227'); break;
    case 'scroll': drawScroll(ctx); break;
    case 'arrows': drawArrows(ctx); break;
    case 'relic': drawRelic(ctx); break;
    case 'food': drawFood(ctx, it.name); break;
    case 'material': drawMaterial(ctx, it.name); break;
    case 'tool': drawTool(ctx, it.name); break;
  }
  ctx.restore();
}

function drawSchild(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#6a5430';
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, 6.283);
  ctx.fill();
  ctx.fillStyle = '#8a6a3e';
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, 6.283);
  ctx.fill();
  ctx.strokeStyle = '#3a2a16';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-18, 0); ctx.lineTo(18, 0);
  ctx.moveTo(0, -18); ctx.lineTo(0, 18);
  ctx.stroke();
  ctx.fillStyle = '#aab4c0';
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, 6.283);
  ctx.fill();
  ctx.fillStyle = shade('#aab4c0', 30);
  ctx.beginPath();
  ctx.arc(-2, -2, 2.5, 0, 6.283);
  ctx.fill();
}

function drawWeapon(ctx: CanvasRenderingContext2D, it: Item): void {
  const cls = it.weaponClass ?? 'schwert';
  ctx.rotate(0.6);
  if (cls === 'schwert') {
    ctx.fillStyle = '#c8ccd4'; ctx.fillRect(-3, -24, 6, 34);
    ctx.fillStyle = '#e8ecf0'; ctx.fillRect(-1, -24, 2, 34);
    ctx.fillStyle = '#6a5430'; ctx.fillRect(-10, 10, 20, 5);
    ctx.fillStyle = '#4a3a20'; ctx.fillRect(-3, 15, 6, 10);
  } else if (cls === 'axt') {
    ctx.fillStyle = '#6a5430'; ctx.fillRect(-2, -22, 5, 44);
    ctx.fillStyle = '#9aa0a8';
    ctx.beginPath(); ctx.moveTo(2, -22); ctx.quadraticCurveTo(20, -16, 16, 2); ctx.lineTo(2, -6); ctx.closePath(); ctx.fill();
  } else if (cls === 'stange') {
    ctx.fillStyle = '#6a5430'; ctx.fillRect(-2, -26, 4, 50);
    ctx.fillStyle = '#9aa0a8';
    ctx.beginPath(); ctx.moveTo(-2, -26); ctx.lineTo(2, -26); ctx.lineTo(4, -12); ctx.lineTo(-8, -16); ctx.closePath(); ctx.fill();
    ctx.fillRect(-2, -30, 4, 6);
  } else if (cls === 'wucht') {
    ctx.fillStyle = '#6a5430'; ctx.fillRect(-2, -14, 5, 38);
    ctx.fillStyle = '#787068'; ctx.fillRect(-12, -26, 26, 14);
    ctx.fillStyle = '#8e867c'; ctx.fillRect(-12, -26, 26, 4);
  } else if (cls === 'bogen') {
    ctx.strokeStyle = '#7a5c34'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(-4, 0, 22, -1.2, 1.2); ctx.stroke();
    ctx.strokeStyle = '#d8d0c0'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(4, -20); ctx.lineTo(4, 20); ctx.stroke();
  }
}

function drawArmor(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#7a7068';
  ctx.beginPath();
  ctx.moveTo(-16, -18); ctx.lineTo(16, -18); ctx.lineTo(13, 6); ctx.quadraticCurveTo(0, 22, -13, 6);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade('#7a7068', 18); ctx.fillRect(-16, -18, 32, 5);
  ctx.fillStyle = shade('#7a7068', -20); ctx.fillRect(-2, -13, 4, 26);
}

function drawRing(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(0, 4, 13, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#e8e0d0';
  ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(6, -10); ctx.lineTo(0, -2); ctx.lineTo(-6, -10); ctx.closePath(); ctx.fill();
}

function drawGem(ctx: CanvasRenderingContext2D, gem: GemItem): void {
  ctx.fillStyle = gem.col;
  ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(14, 0); ctx.lineTo(0, 18); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(-3, -10, 5, 8);
}

function drawPotion(ctx: CanvasRenderingContext2D, col: string): void {
  ctx.fillStyle = '#2a1a10'; ctx.fillRect(-9, -10, 18, 28);
  ctx.fillStyle = col; ctx.fillRect(-7, -4, 14, 20);
  ctx.fillStyle = '#8a7a5a'; ctx.fillRect(-5, -18, 10, 9);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-6, -2, 3, 14);
}

function drawScroll(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#d8cba8'; ctx.fillRect(-14, -16, 28, 32);
  ctx.fillStyle = '#8a7048'; ctx.fillRect(-16, -18, 32, 5); ctx.fillRect(-16, 13, 32, 5);
  ctx.fillStyle = '#6a5a40';
  for (let i = 0; i < 4; i++) ctx.fillRect(-10, -9 + i * 6, 20, 2);
}

function drawArrows(ctx: CanvasRenderingContext2D): void {
  for (let i = -1; i <= 1; i++) {
    ctx.save(); ctx.translate(i * 9, 0); ctx.rotate(0.15 * i);
    ctx.fillStyle = '#7a5c34'; ctx.fillRect(-1, -16, 2, 30);
    ctx.fillStyle = '#9aa0a8';
    ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(4, -14); ctx.lineTo(-4, -14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d8d0c0'; ctx.fillRect(-3, 10, 6, 5);
    ctx.restore();
  }
}

function drawRelic(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(220,170,60,0.4)';
  ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f3e0a0';
  ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(12, 0); ctx.lineTo(0, 14); ctx.lineTo(-12, 0); ctx.closePath(); ctx.fill();
}

function drawFood(ctx: CanvasRenderingContext2D, name: string): void {
  if (name.includes('Brot')) {
    ctx.fillStyle = '#b08648'; ctx.beginPath(); ctx.ellipse(0, 2, 17, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a6434'; ctx.fillRect(-10, -3, 4, 9); ctx.fillRect(0, -3, 4, 9);
  } else if (name.includes('Käse')) {
    ctx.fillStyle = '#e0c050';
    ctx.beginPath(); ctx.moveTo(-16, 10); ctx.lineTo(16, 10); ctx.lineTo(16, -8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c0a030';
    ctx.beginPath(); ctx.arc(6, 4, 3, 0, Math.PI * 2); ctx.fill();
  } else if (name.includes('Milch')) {
    ctx.fillStyle = '#d8d4c8'; ctx.fillRect(-8, -14, 16, 30);
    ctx.fillStyle = '#f0ece0'; ctx.fillRect(-8, -14, 16, 8);
  } else {
    // Wurst/Speck
    ctx.strokeStyle = '#8a4030'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 2, 12, 0.4, Math.PI - 0.4); ctx.stroke();
  }
}

function drawMaterial(ctx: CanvasRenderingContext2D, name: string): void {
  if (name.includes('Holz')) {
    ctx.fillStyle = '#7a5c34'; ctx.fillRect(-16, -6, 32, 9);
    ctx.fillStyle = '#5c441f'; ctx.fillRect(-16, 4, 32, 9);
    ctx.fillStyle = '#a8854e';
    ctx.beginPath(); ctx.arc(-16, -1.5, 4.5, 0, Math.PI * 2); ctx.arc(-16, 8.5, 4.5, 0, Math.PI * 2); ctx.fill();
  } else if (name.includes('Eisen')) {
    ctx.fillStyle = '#8a8e96'; ctx.fillRect(-14, -4, 28, 12);
    ctx.fillStyle = '#a8acb4'; ctx.fillRect(-14, -8, 28, 5);
  } else if (name.includes('Kräuter')) {
    ctx.strokeStyle = '#4a7a3a'; ctx.lineWidth = 2.5;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(i * 6, 16); ctx.quadraticCurveTo(i * 10, -2, i * 5, -14); ctx.stroke();
    }
  } else if (name.includes('Kohle')) {
    ctx.fillStyle = '#1c1c20';
    ctx.beginPath(); ctx.arc(-6, 2, 9, 0, Math.PI * 2); ctx.arc(7, -2, 8, 0, Math.PI * 2); ctx.fill();
  } else {
    // Stein
    ctx.fillStyle = '#7a766e';
    ctx.beginPath(); ctx.moveTo(-14, 10); ctx.lineTo(-10, -10); ctx.lineTo(8, -12); ctx.lineTo(15, 4); ctx.lineTo(8, 12); ctx.closePath(); ctx.fill();
  }
}

function drawTool(ctx: CanvasRenderingContext2D, name: string): void {
  ctx.rotate(0.6);
  ctx.fillStyle = '#6a5430'; ctx.fillRect(-2, -18, 4, 40);
  if (name.includes('Spitzhacke')) {
    ctx.strokeStyle = '#9aa0a8'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, -8, 14, Math.PI + 0.4, -0.4); ctx.stroke();
  } else {
    ctx.fillStyle = '#9aa0a8';
    ctx.beginPath(); ctx.moveTo(2, -18); ctx.quadraticCurveTo(16, -13, 13, -2); ctx.lineTo(2, -6); ctx.closePath(); ctx.fill();
  }
}

// Eindeutiger Icon-Schlüssel je Item-Aussehen (für Textur-Cache)
export function iconKey(it: Item): string {
  if (it.kind === 'weapon') return `icon_weapon_${it.weaponClass ?? 'schwert'}`;
  if (it.kind === 'gem') return `icon_gem_${(it as GemItem).elem}`;
  if (it.kind === 'food' || it.kind === 'material' || it.kind === 'tool') return `icon_${it.kind}_${it.name}`;
  return `icon_${it.kind}`;
}
