// ============================================================
//  RABENMOOR - Ritter-Held als Phaser-3-Textur (1:1 Drop-in)
//  Kein Bild noetig: die Figur wird im Code gezeichnet und als
//  Textur erzeugt. Genau die Figur aus dem Render.
//
//  EINBAU in deiner Spielszene:
//    import { createRitterTexture } from './RitterHeld';
//
//    create() {
//      createRitterTexture(this);                 // erzeugt Textur 'held_ritter'
//      this.player = this.physics.add.sprite(x, y, 'held_ritter');
//      this.player.setOrigin(0.5, 0.9);           // Fuesse als Bezugspunkt
//      this.player.setScale(0.6);                 // nach Bedarf anpassen
//    }
//
//  Textur = 288 x 392 px (Figur 72 x 98 in 4-facher Aufloesung).
//  Pixelig-knackig statt weich:
//    this.textures.get('held_ritter').setFilter(Phaser.Textures.FilterMode.NEAREST);
//
//  Helmhoehe: in helm() unten die Zeile  const helmTop = 11 ;
//             GROESSER = Helm oben kuerzer (probier 5 / 8 / 11).
// ============================================================

import Phaser from 'phaser';

const W = 72, H = 98, CX = 36, SCALE = 4;

// Farbpalette
const ST = 0x9aa0a8, HI = 0xc9cfd6, SD = 0x5a606a, DK = 0x3a3f47;
const OX = 0x6e1f24, OX2 = 0x8a2a30, OXD = 0x4f141a, RED = 0x9a2f2f, RED2 = 0x7a2329;

type P = { x: number; y: number };
const S = (v: number) => v * SCALE;

// Farbe Richtung Schwarz (f<0) oder Weiss (f>0) mischen
function shade(c: number, f: number): number {
  let r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  const t = f < 0 ? 0 : 255, a = Math.abs(f);
  r = Math.round(r + (t - r) * a); g = Math.round(g + (t - g) * a); b = Math.round(b + (t - b) * a);
  return (r << 16) | (g << 8) | b;
}

// Zeichen-Helfer auf einem Phaser.Graphics (skaliert intern auf SCALE)
class Pen {
  constructor(private g: Phaser.GameObjects.Graphics) {}
  poly(pts: P[], c: number, a = 1) {
    this.g.fillStyle(c, a);
    this.g.fillPoints(pts.map(p => ({ x: S(p.x), y: S(p.y) })), true);
  }
  line(pts: P[], c: number, a: number, w: number) {
    this.g.lineStyle(S(w), c, a);
    this.g.strokePoints(pts.map(p => ({ x: S(p.x), y: S(p.y) })), false);
  }
  rect(x: number, y: number, w: number, h: number, c: number, a = 1) {
    this.g.fillStyle(c, a); this.g.fillRect(S(x), S(y), S(w), S(h));
  }
  circ(x: number, y: number, r: number, c: number, a = 1) {
    this.g.fillStyle(c, a); this.g.fillCircle(S(x), S(y), S(r));
  }
  ell(x: number, y: number, rx: number, ry: number, c: number, a = 1) {
    this.g.fillStyle(c, a); this.g.fillEllipse(S(x), S(y), S(rx * 2), S(ry * 2));
  }
}

function legPlate(p: Pen, lx: number) {
  p.poly([{x:lx-4,y:58},{x:lx+4,y:58},{x:lx+3.4,y:68},{x:lx-3.4,y:68}], ST);
  p.line([{x:lx,y:60},{x:lx,y:67}], HI, 0.4, 0.8);
  p.poly([{x:lx-4,y:69},{x:lx+4,y:69},{x:lx+5,y:73},{x:lx+3,y:75},{x:lx-3,y:75},{x:lx-5,y:73}], shade(ST,-0.05));
  p.ell(lx-1.5,71,1.6,1.4, HI, 0.5);
  p.poly([{x:lx-3.4,y:75},{x:lx+3.4,y:75},{x:lx+3,y:85},{x:lx-3,y:85}], ST);
  p.line([{x:lx,y:76},{x:lx,y:84}], HI, 0.4, 0.8);
  p.line([{x:lx+2.6,y:76},{x:lx+2.6,y:84}], SD, 0.6, 0.6);
  p.poly([{x:lx-3.6,y:85},{x:lx+2.6,y:85},{x:lx+7,y:88},{x:lx+5,y:90},{x:lx-3,y:90}], DK);
  p.line([{x:lx-2,y:87.5},{x:lx+4,y:87.5}], SD, 0.8, 0.7);
}

function pauldron(p: Pen, s: number) {
  const px = CX + s * 12;
  p.poly([{x:px-s*5,y:30},{x:px+s*6,y:31},{x:px+s*9,y:39},{x:px+s*5,y:45},{x:px-s*4,y:44},{x:px-s*5,y:36}], ST);
  p.poly([{x:px-s*5,y:31},{x:px+s*6,y:32},{x:px+s*4,y:36},{x:px-s*4,y:35}], HI, 0.4);
  p.line([{x:px-s*4,y:38},{x:px+s*8,y:40}], DK, 0.5, 0.9);
  p.line([{x:px-s*4,y:41.5},{x:px+s*6,y:43}], DK, 0.5, 0.9);
  p.poly([{x:px+s*5,y:31},{x:px+s*2,y:25},{x:px-s*0,y:32}], shade(ST,-0.1));
}

function helm(p: Pen) {
  // === Helm-Hoehe oben ===
  // helmTop = Y des Scheitels. GROESSER = Helm oben kuerzer. (Standard 5; hier 11)
  const helmTop = 11;
  const bodyTop = helmTop + 6;   // Korpus beginnt unter dem Scheitel
  const brow = 17.4;             // Brauenlinie bleibt -> Gesicht aendert sich nicht

  p.poly([{x:CX-8.5,y:bodyTop},{x:CX+8.5,y:bodyTop},{x:CX+8.5,y:28},{x:CX+7,y:31},{x:CX-7,y:31},{x:CX-8.5,y:28}], ST);
  p.poly([{x:CX-8.5,y:bodyTop},{x:CX-7,y:helmTop},{x:CX+7,y:helmTop},{x:CX+8.5,y:bodyTop}], shade(ST,0.05));
  p.ell(CX, helmTop+1.2, 7, 2.6, shade(ST,0.1));
  p.ell(CX-2.5, helmTop+1.6, 2.4, 1.5, HI, 0.4);
  p.rect(CX-1.1, helmTop, 2.2, brow-0.4-helmTop, shade(ST,0.07));
  p.line([{x:CX+1.1,y:helmTop+1},{x:CX+1.1,y:brow-1.4}], SD, 0.5, 0.5);
  p.line([{x:CX-8,y:brow},{x:CX+8,y:brow}], SD, 0.8, 1);
  p.rect(CX-8, brow+1.2, 16, 2.3, 0x0a0c10);
  for (const h of [[-2,24],[1,24],[4,24],[-0.5,26.5],[2.5,26.5]]) p.circ(CX+h[0],h[1],0.8, 0x0a0c10);
  p.poly([{x:CX-8.5,y:bodyTop},{x:CX-3.5,y:bodyTop},{x:CX-5,y:31},{x:CX-8.5,y:28}], HI, 0.16);
  for (const rx of [-7,-3.5,3.5,7]) p.circ(CX+rx,29.6,0.7, DK);
}

function rightArm(p: Pen) {
  p.poly([{x:CX+8,y:35},{x:CX+15,y:37},{x:CX+16,y:45},{x:CX+11,y:45}], ST);
  p.line([{x:CX+9,y:37},{x:CX+9,y:44}], HI, 0.3, 0.7);
  p.ell(CX+15,45,3,2.6, shade(ST,-0.06));
  p.poly([{x:CX+16.5,y:44},{x:CX+13,y:46},{x:CX+8,y:50},{x:CX+11.5,y:51.5}], ST);
  p.line([{x:CX+14,y:45.5},{x:CX+9.5,y:49.5}], SD, 0.5, 0.7);
}

function sword(p: Pen) {
  p.poly([{x:CX+7,y:50},{x:CX+10,y:48.5},{x:CX-7,y:91},{x:CX-9,y:89}], 0xcdd3da);
  p.line([{x:CX+8,y:50},{x:CX-7.5,y:88}], 0xeef2f6, 0.6, 0.9);
  p.line([{x:CX+9.5,y:49},{x:CX-8,y:89}], SD, 0.5, 0.6);
  p.poly([{x:CX-7,y:91},{x:CX-9,y:89},{x:CX-8.5,y:92}], 0x2a2e34);
  p.poly([{x:CX+3,y:45.5},{x:CX+14,y:50.5},{x:CX+12.5,y:53},{x:CX+2,y:48}], 0x565c64);
  p.line([{x:CX+3.5,y:46.5},{x:CX+13,y:51}], HI, 0.4, 0.6);
  p.poly([{x:CX+8,y:47},{x:CX+11,y:46},{x:CX+12,y:40},{x:CX+9,y:40}], 0x4a3525);
  for (const gy of [42,44]) p.line([{x:CX+8.6,y:gy},{x:CX+11.4,y:gy-0.6}], 0x281a10, 0.8, 0.6);
  p.circ(CX+10.5,39,2.4, 0x6a707a);
  p.circ(CX+9.8,38.3,0.9, HI, 0.6);
  p.poly([{x:CX+7,y:46},{x:CX+12,y:45},{x:CX+12.5,y:51},{x:CX+7.5,y:51.5}], DK);
  for (const fx of [8,9.5,11]) p.line([{x:CX+fx,y:46.5},{x:CX+fx-0.3,y:51}], 0x23272c, 0.8, 0.5);
}

function drawRitter(g: Phaser.GameObjects.Graphics) {
  const p = new Pen(g);
  // Umhang
  p.poly([{x:CX-10,y:30},{x:CX-18,y:54},{x:CX-13,y:70},{x:CX-18,y:91},{x:CX+3,y:89},{x:CX+13,y:91},{x:CX+11,y:62},{x:CX+13,y:42},{x:CX+8,y:30}], OX);
  p.poly([{x:CX+2,y:34},{x:CX+11,y:44},{x:CX+9,y:80},{x:CX+3,y:80}], OXD, 0.6);
  p.line([{x:CX-10,y:30},{x:CX-18,y:54},{x:CX-18,y:91}], OX2, 0.5, 1.3);
  // rote Waffenrock-Zipfel
  p.poly([{x:CX-3,y:55},{x:CX+3,y:55},{x:CX+2,y:76},{x:CX-2,y:76}], RED);
  p.poly([{x:CX-9,y:57},{x:CX-5,y:57},{x:CX-6,y:73},{x:CX-10,y:71}], RED2);
  p.poly([{x:CX+5,y:57},{x:CX+9,y:57},{x:CX+10,y:71},{x:CX+6,y:73}], RED2);
  // Beine
  legPlate(p, CX-5); legPlate(p, CX+5);
  // Fauld
  p.poly([{x:CX-11,y:54},{x:CX+11,y:54},{x:CX+10,y:59},{x:CX-10,y:59}], ST);
  p.poly([{x:CX-10,y:58},{x:CX+10,y:58},{x:CX+9,y:63},{x:CX-9,y:63}], shade(ST,-0.07));
  // Kuerass
  p.poly([{x:CX-12,y:31},{x:CX-13,y:39},{x:CX-9,y:54},{x:CX+9,y:54},{x:CX+13,y:39},{x:CX+12,y:31}], ST);
  p.poly([{x:CX-12,y:31},{x:CX-13,y:39},{x:CX-2,y:39},{x:CX-2,y:31}], HI, 0.4);
  p.poly([{x:CX-9,y:48},{x:CX+9,y:48},{x:CX+9,y:54},{x:CX-9,y:54}], 0x000000, 0.2);
  p.line([{x:CX,y:33},{x:CX,y:53}], SD, 0.7, 1.2);
  // rotes Kreuz (Schild verdeckt die linke Haelfte)
  p.rect(CX-1,37,2.5,13, RED);
  p.rect(CX-4.5,41,10,2.5, RED);
  // Gorget
  p.rect(CX-6,29,12,3, shade(ST,-0.12));
  // Schultern
  pauldron(p, -1); pauldron(p, 1);
  // rechter Arm
  rightArm(p);
  // Helm
  helm(p);
  // neutrales Heater-Schild
  const sx = CX - 12;
  const shp: P[] = [{x:sx-13,y:31},{x:sx+12,y:31},{x:sx+13,y:48},{x:sx+7,y:64},{x:sx,y:76},{x:sx-7,y:64},{x:sx-14,y:48}];
  p.poly(shp, 0x66707a);
  p.poly([{x:sx-13,y:31},{x:sx-1,y:31},{x:sx-3,y:60},{x:sx-9,y:55},{x:sx-14,y:48}], 0x808a94, 0.45);
  p.poly([{x:sx+1,y:40},{x:sx+13,y:48},{x:sx+7,y:64},{x:sx+2,y:60}], 0x000000, 0.18);
  p.line([...shp, shp[0]], 0x33383f, 1, 2.2);
  p.line([...shp, shp[0]], 0xaab0b8, 0.25, 0.7);
  // Schwert
  sword(p);
}

/**
 * Erzeugt die Ritter-Textur im TextureManager der Scene.
 * Einmalig in create() aufrufen, danach per Key 'held_ritter' nutzbar.
 */
export function createRitterTexture(scene: Phaser.Scene, key = 'held_ritter'): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  g.setVisible(false);
  drawRitter(g);
  g.generateTexture(key, W * SCALE, H * SCALE);
  g.destroy();
}
