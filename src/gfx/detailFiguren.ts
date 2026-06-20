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
  // Schwert in der rechten Hand (klar als Klinge erkennbar: Knauf, Griff,
  // Parierstange, Klinge, Spitze) - kein "Knochen" mehr.
  {
    const hx = CX + 10.8, hy = 40;
    ln(ctx, hx, hy + 3.5, hx, hy, 2.4, '#4a3a2a');                   // Griff
    ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(hx, hy + 4, 1.2, 0, 7); ctx.fill();   // Knauf
    ln(ctx, hx - 3, hy - 1, hx + 3, hy - 1, 1.7, '#7a6a52');         // Parierstange
    ln(ctx, hx, hy - 1, hx, hy - 15, 2.4, '#9aa0a8');                // Klinge
    ln(ctx, hx - 0.4, hy - 1, hx - 0.4, hy - 15, 0.9, '#cfd6e0');    // Lichtkante
    ctx.fillStyle = '#9aa0a8'; ctx.beginPath(); ctx.moveTo(hx - 1.2, hy - 14); ctx.lineTo(hx + 1.2, hy - 14); ctx.lineTo(hx, hy - 18); ctx.closePath(); ctx.fill();  // Spitze
  }
  // Schädel
  ell(ctx, CX, 17, 6.2, 6.6, bone);
  ell(ctx, CX - 2, 13.6, 2.2, 2.4, boneH);                            // Glanz
  ell(ctx, CX - 2.5, 17.2, 2, 2.5, dark);                            // tiefe schwarze Augenhöhlen
  ell(ctx, CX + 2.5, 17.2, 2, 2.5, dark);
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
  // Hals (kurz - sitzt direkt auf den Schultern, kein langer Hals)
  ctx.fillStyle = hautS; ctx.fillRect(CX - 2.2, 22, 4.4, 2.5);
  // Kopf
  ell(ctx, CX, 17, 6, 6.4, haut);
  ell(ctx, CX - 2, 14.4, 2.2, 2.6, hautH);                            // Stirnlicht
  ell(ctx, CX + 3.2, 18, 1.6, 2.6, hautS);                           // Wangenschatten
  // Augen + Nase
  ell(ctx, CX - 2, 17.6, 0.9, 1.2, '#241813'); ell(ctx, CX + 2, 17.6, 0.9, 1.2, '#241813');
  ctx.fillStyle = hautS; ctx.fillRect(CX - 0.5, 18.4, 1.4, 1.8);      // Nase
  // Wuschelhaar
  for (const [dx, ry, rx, ryy] of [[-4, 12.5, 3, 3.4], [-1, 11.6, 3.2, 3.6], [2.4, 12, 3, 3.4], [5, 13.5, 2.4, 3]] as const) ell(ctx, CX + dx, ry, rx, ryy, haar);
  ell(ctx, CX - 2.5, 11.8, 2, 2.2, haarH);
}

// Pest-Opfer - kranker, leicht gebeugter Dörfler: fahl-grünliche Haut, dunkle
// Pestbeulen an Hals/Gesicht, zerlumptes Gewand, schütteres Haar, eingefallene
// Augen, fiebriger Schweiß. (Stilvorlage zur Bewertung.)
export function drawPestDetail(ctx: CanvasRenderingContext2D): void {
  const haut = '#a6b288', hautH = '#bfc89e', hautS = '#7a8460';
  const kleid = '#5a5a44', kleidH = '#6e6e52', kleidS = '#3c3c2c', hose = '#37352a', stiefel = '#221f16';
  const beule = '#5a1414', beuleH = '#8a2a2a';
  ell(ctx, CX, 58, 12, 3.2, 'rgba(0,0,0,0.32)');
  for (const sx of [-3.2, 3.2] as const) {                            // Beine (zerlumpt)
    rr(ctx, CX + sx - 2, 41, 4, 13, 1.5, hose);
    rr(ctx, CX + sx - 2.3, 53, 5, 3.2, 1.4, stiefel);
  }
  // gebeugter Rumpf (leicht nach vorn, Schultern hängen) - Kittel mit Fetzen
  ctx.fillStyle = kleid; ctx.beginPath();
  ctx.moveTo(CX - 7.5, 25); ctx.lineTo(CX + 7.5, 25); ctx.lineTo(CX + 6, 43); ctx.lineTo(CX - 6, 43); ctx.closePath(); ctx.fill();
  ctx.fillStyle = kleidH; ctx.fillRect(CX - 7, 26, 3, 16);
  ctx.fillStyle = kleidS; ctx.beginPath(); ctx.moveTo(CX, 25); ctx.lineTo(CX + 7.5, 25); ctx.lineTo(CX + 6, 43); ctx.lineTo(CX, 43); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 3; i++) { ctx.fillStyle = kleidS; ctx.fillRect(CX - 5 + i * 4, 41, 1.4, 3 + i % 2); }  // Fetzensaum
  // dünne, hängende Arme
  for (const sx of [-1, 1] as const) {
    rr(ctx, CX + sx * 7.5 - 1.4, 26, 2.8, 13, 1.4, kleid);
    ell(ctx, CX + sx * 7.5, 39, 1.7, 1.7, hautS);
  }
  // Hals + Beulen
  ctx.fillStyle = hautS; ctx.fillRect(CX - 2, 22, 4, 2.5);
  ell(ctx, CX - 4.5, 24, 1.6, 1.4, beule); ell(ctx, CX - 4.5, 24, 0.7, 0.7, beuleH);
  // Kopf (eingefallen), Schweißglanz, eingesunkene dunkle Augen
  ell(ctx, CX, 17, 5.8, 6.3, haut);
  ell(ctx, CX - 2, 14, 1.8, 2.2, hautH);
  ell(ctx, CX + 3, 18, 1.5, 2.6, hautS);                              // Wangenhöhle
  ell(ctx, CX - 2, 17.6, 1.1, 1.4, '#1c1510'); ell(ctx, CX + 2, 17.6, 1.1, 1.4, '#1c1510');  // tiefe Augen
  ctx.fillStyle = hautS; ctx.fillRect(CX - 0.5, 18.6, 1.3, 1.8);      // Nase
  ell(ctx, CX + 3.4, 14.6, 1.3, 1.1, beule); ell(ctx, CX + 3.4, 14.6, 0.6, 0.5, beuleH);  // Beule Schläfe
  ctx.fillStyle = '#6a6450';                                          // schütteres Haar
  for (const [dx, ry] of [[-3, 12.5], [0, 12], [3, 12.8]] as const) ell(ctx, CX + dx, ry, 2.2, 2.4, '#6a6450');
}

// Lebender Toter - verwesender Leichnam: grau-grüne, fleckige Haut, zerfetzte
// dunkle Kleidung, offene Wunde, eingefallene schwarze Augen, hagere Glieder.
export function drawLebenderToterDetail(ctx: CanvasRenderingContext2D): void {
  const haut = '#8a9678', hautH = '#a3ad8a', hautS = '#5e6850', fleck = '#4a5038';
  const kleid = '#3a382e', kleidH = '#4c493c', kleidS = '#26241c', hose = '#2c2a22', stiefel = '#1c1a13';
  const wunde = '#5a1818';
  ell(ctx, CX, 58, 12, 3.2, 'rgba(0,0,0,0.32)');
  for (const sx of [-3.4, 3.4] as const) {
    rr(ctx, CX + sx - 2, 41, 4, 13, 1.5, hose);
    rr(ctx, CX + sx - 1.5, 47, 2, 3, 1, hautS);                       // freiliegendes Bein
    rr(ctx, CX + sx - 2.3, 53, 5, 3.2, 1.4, stiefel);
  }
  // Rumpf (zerfetzte Kleidung)
  ctx.fillStyle = kleid; ctx.beginPath();
  ctx.moveTo(CX - 8, 24); ctx.lineTo(CX + 8, 24); ctx.lineTo(CX + 6.5, 43); ctx.lineTo(CX - 6.5, 43); ctx.closePath(); ctx.fill();
  ctx.fillStyle = kleidH; ctx.fillRect(CX - 7.4, 25, 3.2, 16);
  ctx.fillStyle = kleidS; ctx.beginPath(); ctx.moveTo(CX, 24); ctx.lineTo(CX + 8, 24); ctx.lineTo(CX + 6.5, 43); ctx.lineTo(CX, 43); ctx.closePath(); ctx.fill();
  // offene Wunde / freiliegende Rippen am Bauch
  ctx.fillStyle = hautS; ctx.fillRect(CX - 3, 33, 6, 6);
  ctx.fillStyle = wunde; ctx.fillRect(CX - 2, 34.5, 4, 3);
  ctx.fillStyle = '#bcae8e'; for (let i = 0; i < 2; i++) ctx.fillRect(CX - 2.5, 34 + i * 2, 5, 0.8);  // Rippen
  // hagere Arme (einer abgewinkelt vorgestreckt)
  rr(ctx, CX - 8 - 1.5, 25, 3, 13, 1.4, kleid);
  ell(ctx, CX - 8, 38, 1.8, 1.8, hautS);
  ln(ctx, CX + 8, 26, CX + 13, 31, 3, kleid);                         // vorgestreckter Oberarm
  ln(ctx, CX + 13, 31, CX + 16, 30, 2.6, hautS);                      // Unterarm (Haut)
  for (let f = -1; f <= 1; f++) ln(ctx, CX + 16, 30, CX + 18, 29 + f * 1.3, 1, hautS);  // Klauen
  // Hals + Kopf (eingefallen, fleckig)
  ctx.fillStyle = hautS; ctx.fillRect(CX - 2, 21, 4, 3);
  ell(ctx, CX, 16.5, 5.8, 6.3, haut);
  ell(ctx, CX - 2, 13.5, 1.8, 2.2, hautH);
  ell(ctx, CX + 2.8, 17, 1.5, 1.4, fleck); ell(ctx, CX - 3, 19, 1.2, 1.1, fleck);  // Verwesungsflecken
  ell(ctx, CX - 2, 17, 1.3, 1.6, '#0f0c08'); ell(ctx, CX + 2, 17, 1.3, 1.6, '#0f0c08');  // schwarze Augen
  ctx.fillStyle = hautS; ctx.fillRect(CX - 0.5, 18, 1.3, 1.8);
  ctx.fillStyle = '#1a160f'; ctx.fillRect(CX - 2, 20.4, 4, 0.9);      // schiefer Mund
  ctx.fillStyle = '#4a4636'; for (const dx of [-3, 1] as const) ell(ctx, CX + dx, 12, 2.4, 2.2, '#4a4636');  // wirres Resthaar
}
