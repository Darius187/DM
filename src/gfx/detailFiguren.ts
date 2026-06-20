// Detail-Figuren im Stil des Helden (Runde 55, Autorwunsch "Beispiele zeigen,
// bevor es live geht"). NOCH NICHT in das Spiel verdrahtet - nur zur Bewertung
// der Stilrichtung. Bei Freigabe werden daraus die echten Gegner-/NPC-Figuren.
// Gezeichnet in eine 64x64-Zelle (gleiche Auflösung wie drawHeld), Frontansicht.

function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, c: string): void {
  ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, c: string): void {
  ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}
function ln(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, w: number, c: string): void {
  ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.lineWidth = 1;
}
const CX = 32;

// Untoter Krieger - knöcherner Skelett-Soldat im Detailgrad des Helden:
// Schädel mit glimmenden Augen, Brustkorb, Becken, Knochenglieder, Rostklinge.
export function drawSkelettDetail(ctx: CanvasRenderingContext2D): void {
  const bone = '#e8e1cd', boneH = '#f6f0dc', boneS = '#bcae8e', boneD = '#8a7d60', dark = '#15110b';
  ell(ctx, CX, 58, 13, 3.4, 'rgba(0,0,0,0.32)');                       // Bodenschatten
  // Beine: Oberschenkel + Schienbein, Knie, Fuß
  for (const sx of [-5, 5] as const) {
    const lx = CX + sx;
    ln(ctx, lx, 40, lx + sx * 0.25, 49, 3.4, bone);
    ln(ctx, lx + sx * 0.25, 49, lx, 56, 2.8, bone);
    ell(ctx, lx + sx * 0.25, 49, 1.7, 1.7, boneS);                     // Knie
    rr(ctx, lx - 2.4, 55.5, 5.5, 2.6, 1, boneS);                       // Fuß
  }
  // Becken
  rr(ctx, CX - 6, 38, 12, 5, 2.5, bone);
  ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(CX, 41, 2.2, 2, 0, 0, 7); ctx.fill();
  // Wirbelsäule + Brustkorb (Rippenpaare)
  ln(ctx, CX, 24, CX, 39, 2, boneS);
  ctx.strokeStyle = bone; ctx.lineWidth = 1.7;
  for (let i = 0; i < 4; i++) {
    const ry = 27 + i * 2.9, rx = 6 - i * 0.5;
    ctx.beginPath(); ctx.ellipse(CX, ry, rx, 3, 0, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(CX, ry, rx, 3, 0, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
  }
  ctx.lineWidth = 1;
  // Schultern + Arme (Oberarm/Unterarm/Hand), Ellenbogen
  for (const sx of [-1, 1] as const) {
    const shx = CX + sx * 8.5;
    ell(ctx, shx, 24.5, 2.1, 1.9, bone);
    ln(ctx, shx, 25, shx + sx * 1.8, 33, 2.6, bone);
    ln(ctx, shx + sx * 1.8, 33, shx + sx * 2.4, 41, 2.2, bone);
    ell(ctx, shx + sx * 1.8, 33, 1.5, 1.5, boneS);
    for (let f = -1; f <= 1; f++) ln(ctx, shx + sx * 2.4, 41, shx + sx * 2.4 + f * 1.3, 44.5, 1, bone);
  }
  // Rostige Klinge in der rechten Hand (wie die Gegner im Spiel)
  ln(ctx, CX + 2.4 * 2, 41, CX + 13, 30, 2.4, '#9aa0a8');
  ln(ctx, CX + 2.4 * 2, 41, CX + 12.5, 31, 1, '#cfd6e0');
  // Schädel
  ell(ctx, CX, 17, 6.2, 6.6, bone);
  ell(ctx, CX - 2, 13.6, 2.2, 2.4, boneH);                            // Glanz
  ell(ctx, CX - 2.6, 17.2, 1.8, 2.1, dark);                          // Augenhöhlen
  ell(ctx, CX + 2.6, 17.2, 1.8, 2.1, dark);
  ctx.fillStyle = '#e84860';                                          // glimmende Augen
  ctx.beginPath(); ctx.arc(CX - 2.6, 17.3, 0.85, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(CX + 2.6, 17.3, 0.85, 0, 7); ctx.fill();
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(CX, 18.4); ctx.lineTo(CX - 1.1, 21.4); ctx.lineTo(CX + 1.1, 21.4); ctx.closePath(); ctx.fill();
  rr(ctx, CX - 4.2, 21.6, 8.4, 3, 1, bone);                          // Kiefer
  ctx.fillStyle = boneD; for (let i = -3; i <= 3; i++) ctx.fillRect(CX + i * 1.15, 21.6, 0.6, 3);  // Zähne
}

// Stadtbürger - schlichter Dörfler im Detailgrad des Helden (ohne Rüstung):
// Wams, Schürze, Gürtel, Stiefel, Wuschelhaar, Gesicht.
export function drawBuergerDetail(ctx: CanvasRenderingContext2D): void {
  const haut = '#d0a884', hautH = '#e6c79c', hautS = '#a07a52';
  const haar = '#5a4326', haarH = '#75592f';
  const wams = '#7a5a38', wamsH = '#94714a', wamsS = '#543c22';
  const schurz = '#b9a47e', hose = '#3c2e1d', stiefel = '#241a10';
  ell(ctx, CX, 58, 12.5, 3.3, 'rgba(0,0,0,0.32)');                    // Schatten
  // Beine + Stiefel
  for (const sx of [-3.4, 3.4] as const) {
    rr(ctx, CX + sx - 2.1, 40, 4.2, 14, 2, hose);
    ctx.fillStyle = '#2c2114'; ctx.fillRect(CX + sx - 2.1, 49, 4.2, 1);
    rr(ctx, CX + sx - 2.4, 53.5, 5.2, 3.2, 1.4, stiefel);
  }
  // Rumpf (Wams), Schattenkante rechts, Lichtkante links
  ctx.fillStyle = wams; ctx.beginPath();
  ctx.moveTo(CX - 8, 24); ctx.lineTo(CX + 8, 24); ctx.lineTo(CX + 6.5, 42); ctx.lineTo(CX - 6.5, 42); ctx.closePath(); ctx.fill();
  ctx.fillStyle = wamsH; ctx.fillRect(CX - 7.4, 25, 3.4, 15);
  ctx.fillStyle = wamsS; ctx.beginPath(); ctx.moveTo(CX, 24); ctx.lineTo(CX + 8, 24); ctx.lineTo(CX + 6.5, 42); ctx.lineTo(CX, 42); ctx.closePath(); ctx.fill();
  // Schürze
  rr(ctx, CX - 5, 33, 10, 11, 1.5, schurz);
  ctx.fillStyle = '#a08a64'; ctx.fillRect(CX - 5, 33, 10, 1);
  // Gürtel + Schnalle
  rr(ctx, CX - 7, 40.5, 14, 2.6, 1, '#3a2a18');
  ctx.fillStyle = '#c9a23a'; ctx.fillRect(CX - 1.2, 40.6, 2.4, 2.4);
  // Arme
  for (const sx of [-1, 1] as const) {
    rr(ctx, CX + sx * 8 - 1.6, 25, 3.2, 12, 1.6, wams);
    ell(ctx, CX + sx * 8, 38, 1.8, 1.8, hautS);                       // Hand
  }
  // Hals
  ctx.fillStyle = hautS; ctx.fillRect(CX - 2.2, 21, 4.4, 4);
  // Kopf
  ell(ctx, CX, 16, 6, 6.4, haut);
  ell(ctx, CX - 2, 13.4, 2.2, 2.6, hautH);                            // Stirnlicht
  ell(ctx, CX + 3.2, 17, 1.6, 2.6, hautS);                           // Wangenschatten
  // Augen + Nase
  ctx.fillStyle = '#241813';
  ell(ctx, CX - 2, 16.6, 0.9, 1.2, '#241813'); ell(ctx, CX + 2, 16.6, 0.9, 1.2, '#241813');
  ctx.fillStyle = hautS; ctx.fillRect(CX - 0.5, 17.4, 1.4, 1.8);      // Nase
  // Wuschelhaar
  ctx.fillStyle = haar;
  for (const [dx, ry, rx, ryy] of [[-4, 11.5, 3, 3.4], [-1, 10.6, 3.2, 3.6], [2.4, 11, 3, 3.4], [5, 12.5, 2.4, 3]] as const) ell(ctx, CX + dx, ry, rx, ryy, haar);
  ctx.fillStyle = haarH; ell(ctx, CX - 2.5, 10.8, 2, 2.2, haarH);
}
