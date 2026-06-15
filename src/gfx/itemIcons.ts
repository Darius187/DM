// Gezeichnete Item-Icons je Typ (Fallback, Masterprompt 5.2).

import type { Item, GemItem, Rarity } from '../data/types';
import { RARITY_COLORS, RARITY_RGB } from '../data/items';
import { shade } from './fallbackArt';

export const ICON_SIZE = 64;

// Metallfarben je Seltenheit (Runde 38): gewöhnliche Waffen wirken stumpf/
// rostig, magische kühl, seltene vergoldet, epische arkan-violett. So sieht
// man der Klinge die Stufe an - rostige Klinge != Epic-Schwert.
const METALL: Record<Rarity, { klinge: string; glanz: string; griff: string }> = {
  0: { klinge: '#9a9082', glanz: '#b6ac9c', griff: '#5a4a30' },
  1: { klinge: '#aac0d6', glanz: '#dcecf8', griff: '#46566e' },
  2: { klinge: '#d8c068', glanz: '#f4e6a0', griff: '#7a5a26' },
  3: { klinge: '#c79af0', glanz: '#ecd8ff', griff: '#5a3a7a' },
};

// Farbiger Seltenheits-Schein + Rahmen hinter jedem Icon
function rarityBackdrop(ctx: CanvasRenderingContext2D, rar: Rarity): void {
  const rgb = RARITY_RGB[rar];
  if (rgb) {
    const grad = ctx.createRadialGradient(32, 32, 3, 32, 32, 33);
    const a = rar === 3 ? 0.52 : rar === 2 ? 0.4 : 0.3;
    grad.addColorStop(0, `rgba(${rgb},${a})`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, ICON_SIZE, ICON_SIZE);
  }
  ctx.strokeStyle = RARITY_COLORS[rar];
  ctx.globalAlpha = rar === 0 ? 0.3 : 0.75;
  ctx.lineWidth = 2;
  ctx.strokeRect(2.5, 2.5, 59, 59);
  ctx.globalAlpha = 1;
}

// Edelstein in Seltenheitsfarbe (auf Knauf/Brust/Reif ab Selten)
function rarityGem(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rar: Rarity): void {
  if (rar < 2) return;
  ctx.fillStyle = RARITY_COLORS[rar];
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.4, 0, 6.283); ctx.fill();
}

export function drawItemIcon(ctx: CanvasRenderingContext2D, it: Item): void {
  ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
  const rar = (it.rarity ?? 0) as Rarity;
  rarityBackdrop(ctx, rar);
  ctx.save();
  ctx.translate(32, 32);
  switch (it.kind) {
    case 'weapon': drawWeapon(ctx, it, rar); break;
    case 'armor': drawArmor(ctx, rar); break;
    case 'schild': drawSchild(ctx, rar); break;
    case 'ring': drawRing(ctx, rar); break;
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

function drawSchild(ctx: CanvasRenderingContext2D, rar: Rarity): void {
  const m = METALL[rar];
  ctx.fillStyle = m.griff;
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, 6.283); ctx.fill();
  ctx.fillStyle = shade(m.griff, 22);
  ctx.beginPath(); ctx.arc(0, 0, 18, 0, 6.283); ctx.fill();
  ctx.strokeStyle = '#3a2a16'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-18, 0); ctx.lineTo(18, 0);
  ctx.moveTo(0, -18); ctx.lineTo(0, 18);
  ctx.stroke();
  ctx.fillStyle = m.klinge;
  ctx.beginPath(); ctx.arc(0, 0, 6, 0, 6.283); ctx.fill();
  ctx.fillStyle = m.glanz;
  ctx.beginPath(); ctx.arc(-2, -2, 2.5, 0, 6.283); ctx.fill();
  rarityGem(ctx, 0, 0, 4.5, rar);
}

function drawWeapon(ctx: CanvasRenderingContext2D, it: Item, rar: Rarity): void {
  const cls = it.weaponClass ?? 'schwert';
  const m = METALL[rar];
  ctx.rotate(0.6);
  if (cls === 'schwert') {
    ctx.fillStyle = m.klinge; ctx.fillRect(-3, -24, 6, 34);
    ctx.fillStyle = m.glanz; ctx.fillRect(-1, -24, 2, 34);
    ctx.fillStyle = m.griff; ctx.fillRect(-10, 10, 20, 5);
    ctx.fillStyle = shade(m.griff, -20); ctx.fillRect(-3, 15, 6, 10);
    rarityGem(ctx, 0, 23, 3.5, rar); // Knauf-Edelstein
  } else if (cls === 'axt') {
    ctx.fillStyle = m.griff; ctx.fillRect(-2, -22, 5, 44);
    ctx.fillStyle = m.klinge;
    ctx.beginPath(); ctx.moveTo(2, -22); ctx.quadraticCurveTo(20, -16, 16, 2); ctx.lineTo(2, -6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = m.glanz; ctx.beginPath(); ctx.moveTo(3, -20); ctx.quadraticCurveTo(14, -15, 12, -3); ctx.lineTo(3, -8); ctx.closePath(); ctx.fill();
    rarityGem(ctx, 0, 22, 3.5, rar);
  } else if (cls === 'stange') {
    ctx.fillStyle = m.griff; ctx.fillRect(-2, -26, 4, 50);
    ctx.fillStyle = m.klinge;
    ctx.beginPath(); ctx.moveTo(-2, -26); ctx.lineTo(2, -26); ctx.lineTo(4, -12); ctx.lineTo(-8, -16); ctx.closePath(); ctx.fill();
    ctx.fillRect(-2, -30, 4, 6);
  } else if (cls === 'wucht') {
    ctx.fillStyle = m.griff; ctx.fillRect(-2, -14, 5, 38);
    ctx.fillStyle = shade(m.klinge, -14); ctx.fillRect(-12, -26, 26, 14);
    ctx.fillStyle = m.glanz; ctx.fillRect(-12, -26, 26, 4);
    rarityGem(ctx, 1, -19, 3.5, rar);
  } else if (cls === 'bogen') {
    ctx.strokeStyle = m.griff; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(-4, 0, 22, -1.2, 1.2); ctx.stroke();
    ctx.strokeStyle = m.glanz; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(4, -20); ctx.lineTo(4, 20); ctx.stroke();
    rarityGem(ctx, -4, 0, 3, rar);
  } else if (cls === 'stab') {
    ctx.fillStyle = m.griff; ctx.fillRect(-2.5, -10, 5, 34);
    ctx.fillStyle = m.klinge; ctx.beginPath(); ctx.arc(0, -16, 7, 0, 6.283); ctx.fill();
    rarityGem(ctx, 0, -16, 4.5, rar);
  }
}

function drawArmor(ctx: CanvasRenderingContext2D, rar: Rarity): void {
  const m = METALL[rar];
  ctx.fillStyle = shade(m.klinge, -16);
  ctx.beginPath();
  ctx.moveTo(-16, -18); ctx.lineTo(16, -18); ctx.lineTo(13, 6); ctx.quadraticCurveTo(0, 22, -13, 6);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = m.glanz; ctx.fillRect(-16, -18, 32, 4);
  ctx.fillStyle = shade(m.klinge, -32); ctx.fillRect(-2, -13, 4, 26);
  rarityGem(ctx, 0, -8, 4, rar); // Brust-Edelstein
}

function drawRing(ctx: CanvasRenderingContext2D, rar: Rarity): void {
  const m = METALL[rar];
  ctx.strokeStyle = rar >= 2 ? '#c9a227' : m.klinge; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(0, 4, 13, 0, Math.PI * 2); ctx.stroke();
  if (rar >= 2) { rarityGem(ctx, 0, -10, 5.5, rar); }
  else {
    ctx.fillStyle = m.glanz;
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(6, -10); ctx.lineTo(0, -2); ctx.lineTo(-6, -10); ctx.closePath(); ctx.fill();
  }
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

// Eindeutiger Icon-Schlüssel je Item-Aussehen (für Textur-Cache).
// Seltenheit fließt ein (Runde 38), sonst sähe das Epic wie die rostige Klinge aus.
export function iconKey(it: Item): string {
  const r = it.rarity ?? 0;
  if (it.kind === 'weapon') return `icon_weapon_${it.weaponClass ?? 'schwert'}_${r}`;
  if (it.kind === 'armor' || it.kind === 'schild' || it.kind === 'ring') return `icon_${it.kind}_${r}`;
  if (it.kind === 'gem') return `icon_gem_${(it as GemItem).elem}`;
  if (it.kind === 'food' || it.kind === 'material' || it.kind === 'tool') return `icon_${it.kind}_${it.name}`;
  return `icon_${it.kind}`;
}
