// BEWEGUNGS-PROBE (Runde 55, Autorwunsch): Beispiel-Animationen für den Helden -
// ein MIX aus unserem Stil mit den Vorteilen der zwei Phaser-Referenzen (Knight-
// Kettenanimation idle->guard->attack->idle + Brawler-Set walk/idle/kick...).
// LINKS unsere AKTUELLE Figur (gebackenes Sprite), RECHTS eine NEUE prozedurale
// Figur mit: nach vorn geneigtem Kopf (anatomisch natürlicher), echtem AUSFALL-
// SCHRITT beim Schlag, SCHWERT+SCHILD-Gardestellung und natürlicherem Gang.
// Klick = Zustand wechseln (wie Brawler). Taste K = Kette idle->Garde->Ausfall->idle
// automatisch abspielen (wie der Knight). Rein zum Vergleichen, noch nicht im Spiel.

import Phaser from 'phaser';
import { SpriteProvider } from '../gfx/SpriteProvider';
import { angleToDir8 } from '../world/Enemy';

type Zustand = 'stehen' | 'gehen' | 'ausfall' | 'garde' | 'sieg';
const ZUSTAENDE: Zustand[] = ['stehen', 'gehen', 'ausfall', 'garde', 'sieg'];
const LABELS: Record<Zustand, string> = { stehen: 'Stehen (Atem, Kopf vor)', gehen: 'Gehen', ausfall: 'Ausfall-Schlag (Lunge)', garde: 'Schwert + Schild (Garde)', sieg: 'Sieg' };

interface P { x: number; y: number }

export class BewegungsProbe extends Phaser.Scene {
  private provider!: SpriteProvider;
  private g!: Phaser.GameObjects.Graphics;
  private altSprite!: Phaser.GameObjects.Sprite;
  private zustand: Zustand = 'ausfall';
  private phase = 0;              // 0..1 für Einmal-Animationen (Ausfall)
  private gehPhase = 0;          // fortlaufend für Gehen
  private kette: Zustand[] | null = null;
  private ketteIdx = 0;
  private statusT!: Phaser.GameObjects.Text;

  constructor() { super('BewegungsProbe'); }

  create(): void {
    const W = this.scale.width, H = this.scale.height;
    this.provider = new SpriteProvider(this);
    this.cameras.main.setBackgroundColor('#20242a');
    // Boden
    const bg = this.add.graphics().setDepth(0);
    bg.fillStyle(0x161a1f, 1).fillRect(0, 0, W, H);
    const bodenY = H * 0.74;
    bg.fillStyle(0x2a2f36, 1).fillRect(0, bodenY, W, H - bodenY);
    bg.lineStyle(1, 0x353b43, 1);
    for (let x = 0; x <= W; x += 48) bg.lineBetween(x, bodenY, x, H);
    bg.lineStyle(2, 0x3a4048, 1).lineBetween(0, bodenY, W, bodenY);

    this.add.text(W / 2, 14, 'BEWEGUNGS-PROBE - links AKTUELL, rechts NEU (Mix mit Kopf-vor + Ausfall + Schild)', { fontFamily: 'serif', fontSize: '16px', color: '#e8dcc4', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(20);
    this.add.text(W * 0.30, 56, 'AKTUELL', { fontFamily: 'serif', fontSize: '15px', color: '#b0b8c0' }).setOrigin(0.5).setDepth(20);
    this.add.text(W * 0.66, 56, 'NEU (Mix)', { fontFamily: 'serif', fontSize: '15px', color: '#f0d8a0' }).setOrigin(0.5).setDepth(20);

    // AKTUELL: unser gebackenes Helden-Sprite (Profil nach rechts), groß
    this.altSprite = this.add.sprite(W * 0.30, bodenY, '__DEFAULT').setOrigin(0.5, 1).setScale(4.2).setDepth(10);

    // NEU: prozedural je Frame gezeichnet
    this.g = this.add.graphics().setDepth(10);

    this.statusT = this.add.text(W / 2, H - 16, '', { fontFamily: 'serif', fontSize: '14px', color: '#c8bfa6' }).setOrigin(0.5, 1).setDepth(20);

    this.input.on('pointerdown', () => { this.kette = null; this.naechsterZustand(); });
    this.input.keyboard?.on('keydown-K', () => this.starteKette());
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'));
  }

  private naechsterZustand(): void {
    const i = (ZUSTAENDE.indexOf(this.zustand) + 1) % ZUSTAENDE.length;
    this.setzeZustand(ZUSTAENDE[i]);
  }

  private setzeZustand(z: Zustand): void { this.zustand = z; this.phase = 0; }

  private starteKette(): void { this.kette = ['stehen', 'garde', 'ausfall', 'stehen']; this.ketteIdx = 0; this.setzeZustand(this.kette[0]); }

  update(_t: number, dt: number): void {
    const s = dt / 1000;
    this.gehPhase = (this.gehPhase + s * 1.4) % 1;
    // Einmal-Animationen (Ausfall/Sieg) laufen über die Phase; in der Kette weiter
    const einmal = this.zustand === 'ausfall' || this.zustand === 'sieg';
    if (einmal) {
      this.phase += s / (this.zustand === 'ausfall' ? 1.1 : 1.3);
      if (this.phase >= 1) {
        this.phase = 1;
        if (this.kette) { this.ketteIdx++; if (this.ketteIdx < this.kette.length) this.setzeZustand(this.kette[this.ketteIdx]); else this.kette = null; }
      }
    } else if (this.kette) {
      // Stehen/Garde in der Kette kurz halten, dann weiter
      this.phase += s;
      if (this.phase > 1.1) { this.ketteIdx++; if (this.ketteIdx < this.kette.length) this.setzeZustand(this.kette[this.ketteIdx]); else this.kette = null; }
    }

    const tt = this.time.now / 1000;
    // AKTUELL-Sprite passend setzen (Profil rechts = angleToDir8(0))
    const dir = angleToDir8(0);
    let frame: number;
    if (this.zustand === 'gehen') frame = Math.floor(this.gehPhase * 4) % 4;
    else if (this.zustand === 'ausfall') frame = 4 + Math.min(2, Math.floor(this.phase * 3));   // Schlagphasen 4..6
    else frame = (tt % 2.9) < 1.1 ? 2 : 0;                                                       // Atem
    this.provider.applyFigure(this.altSprite, 'spieler_leder', dir, frame, 'schwert');

    // NEU-Figur zeichnen
    this.g.clear();
    this.zeichneRitter(this.scale.width * 0.66, this.scale.height * 0.74, 5.2, tt);

    this.statusT.setText(`Zustand: ${LABELS[this.zustand]}    ·    Klick = nächster Zustand    ·    K = Kette (idle->Garde->Ausfall->idle)    ·    ESC = Menü`);
  }

  // ====== NEUE Figur (Seitenansicht nach rechts, prozedural animiert) ========
  private zeichneRitter(bx: number, by: number, sc: number, tt: number): void {
    const p = this.pose(tt);
    const g = this.g;
    const X = (x: number) => bx + x * sc, Y = (y: number) => by + y * sc;
    const lim = (a: P, b: P, w: number, col: number, al = 1): void => {
      g.lineStyle(w * sc, col, al); g.lineBetween(X(a.x), Y(a.y), X(b.x), Y(b.y));
    };
    // Schatten am Boden
    g.fillStyle(0x000000, 0.35); g.fillEllipse(bx + p.hip.x * sc, by + 1, 26 * sc * 0.5, 6 * sc * 0.5);

    // Farben (gedeckter Stahl-Ritter wie unser Held)
    const fern = 0x3a3e46, nah = 0x575c66, leder = 0x2c2c32, boot = 0x18181c, haut = 0xc8a888, helm = 0x2a2a30;
    const klinge = 0xcdd2da, griff = 0x6a5a3a, schildHolz = 0x6a4a2a, schildEisen = 0x8a8e96;

    // --- FERNE (hintere) Glieder zuerst, dunkler ---
    const fHip = p.hip, fKnie = ik2(fHip, p.backFoot, 12, 12, +1);
    lim(fHip, fKnie, 5.4, leder, 0.9); lim(fKnie, p.backFoot, 4.8, leder, 0.9);
    lim(p.backFoot, { x: p.backFoot.x + 5, y: p.backFoot.y }, 4.2, boot, 0.9);   // hinterer Stiefel
    // fernes (Schild-) Arm
    const fEll = ik2(p.shoulder, p.shieldHand, 10, 10, p.schildBend);
    lim(p.shoulder, fEll, 4.6, fern); lim(fEll, p.shieldHand, 4.2, fern);

    // --- RUMPF (leicht nach vorn geneigt) ---
    g.fillStyle(nah, 1);
    g.fillPoints([
      new Phaser.Math.Vector2(X(p.hip.x - 4), Y(p.hip.y)),
      new Phaser.Math.Vector2(X(p.shoulder.x - 4.5), Y(p.shoulder.y)),
      new Phaser.Math.Vector2(X(p.shoulder.x + 5), Y(p.shoulder.y)),
      new Phaser.Math.Vector2(X(p.hip.x + 4), Y(p.hip.y)),
    ], true);
    // Gürtel
    lim({ x: p.hip.x - 4, y: p.hip.y }, { x: p.hip.x + 4, y: p.hip.y }, 2.4, 0x3a2e1a);

    // --- KOPF: NACH VORN GENEIGT (der Autorwunsch) ---
    const hd = p.head;
    // Hals (vom Schulteransatz schräg nach vorn zum Kopf)
    lim({ x: p.shoulder.x, y: p.shoulder.y }, { x: hd.x, y: hd.y + 4 }, 3.0, haut);
    g.fillStyle(haut, 1); g.fillCircle(X(hd.x), Y(hd.y), 5.6 * sc);
    // Helm/Haar oben + hinten (Neigung macht die Stirn vorn frei)
    g.fillStyle(helm, 1);
    g.beginPath(); g.arc(X(hd.x), Y(hd.y), 5.9 * sc, Math.PI * 0.86 + p.kopfTilt, Math.PI * 2.05 + p.kopfTilt, false); g.fillPath();
    // Nase/Profil vorn
    g.fillStyle(haut, 1); g.fillTriangle(X(hd.x + 5.2), Y(hd.y - 0.5), X(hd.x + 6.8), Y(hd.y + 1.2), X(hd.x + 5.0), Y(hd.y + 2));
    // Auge
    g.fillStyle(0x1a1a1f, 1); g.fillCircle(X(hd.x + 3.0), Y(hd.y - 0.5), 0.9 * sc);

    // --- NAHE (vordere) Glieder, heller, oben ---
    const nKnie = ik2(p.hip, p.frontFoot, 12, 12, +1);
    lim(p.hip, nKnie, 6.0, leder); lim(nKnie, p.frontFoot, 5.2, leder);
    lim(p.frontFoot, { x: p.frontFoot.x + 6, y: p.frontFoot.y }, 4.6, boot);     // vorderer Stiefel

    // Schild am fernen Arm (rund, mit Eisenrand) - vor dem Rumpf wenn vorgehalten
    g.fillStyle(schildHolz, 1); g.fillCircle(X(p.shieldHand.x), Y(p.shieldHand.y), 7.5 * sc);
    g.lineStyle(1.6 * sc, schildEisen, 1); g.strokeCircle(X(p.shieldHand.x), Y(p.shieldHand.y), 7.5 * sc);
    g.fillStyle(schildEisen, 1); g.fillCircle(X(p.shieldHand.x), Y(p.shieldHand.y), 2.2 * sc);   // Buckel

    // Schwert-Arm (nah) + Klinge
    const nEll = ik2(p.shoulder, p.swordHand, 10, 10, p.schwertBend);
    lim(p.shoulder, nEll, 5.0, nah); lim(nEll, p.swordHand, 4.6, haut);
    // Schwert: Griff + Klinge in Schlagrichtung
    const sd = p.swordDir; const hand = p.swordHand;
    const knauf = { x: hand.x - Math.cos(sd) * 3, y: hand.y - Math.sin(sd) * 3 };
    const spitze = { x: hand.x + Math.cos(sd) * 22, y: hand.y + Math.sin(sd) * 22 };
    lim(knauf, hand, 2.0, 0xe0c050);                 // Knauf
    lim({ x: hand.x - Math.sin(sd) * 3.2, y: hand.y + Math.cos(sd) * 3.2 }, { x: hand.x + Math.sin(sd) * 3.2, y: hand.y - Math.cos(sd) * 3.2 }, 1.8, griff); // Parierstange
    g.lineStyle(2.6 * sc, klinge, 1); g.lineBetween(X(hand.x), Y(hand.y), X(spitze.x), Y(spitze.y));
    g.lineStyle(1.0 * sc, 0xffffff, 0.7); g.lineBetween(X(hand.x), Y(hand.y), X(spitze.x), Y(spitze.y));

    // Klingen-Schweif beim Ausfall-Schlag (Wusch)
    if (this.zustand === 'ausfall' && this.phase > 0.28 && this.phase < 0.62) {
      const a0 = p.swordDir + 0.7, a1 = p.swordDir;
      g.lineStyle(3 * sc, 0x9ad0ff, 0.35 * (1 - (this.phase - 0.28) / 0.34));
      g.beginPath(); g.arc(X(hand.x - Math.cos(sd) * 2), Y(hand.y - Math.sin(sd) * 2), 22 * sc, a0, a1, true); g.strokePath();
    }
  }

  // Pose-Berechnung je Zustand. Rückgabe in Figur-Einheiten (Füße bei y=0, hoch=-).
  private pose(tt: number): {
    hip: P; shoulder: P; head: P; kopfTilt: number; frontFoot: P; backFoot: P;
    swordHand: P; swordDir: number; schwertBend: number; shieldHand: P; schildBend: number;
  } {
    const atem = Math.sin(tt * 2.2);
    // Grundhaltung: KOPF + Schultern nach VORN geneigt (natürlicher als kerzengerade)
    let lean = 2.6;                 // Vorlage des Oberkörpers
    let kopfVor = 3.4;              // Kopf zusätzlich nach vorn
    let hip: P = { x: 0, y: -24 + atem * 0.25 };
    let frontFoot: P = { x: 3, y: 0 }, backFoot: P = { x: -4.5, y: 0 };
    let swordHand: P = { x: 5, y: -30 }, swordDir = 1.2, schwertBend = -1;
    let shieldHand: P = { x: -3, y: -28 }, schildBend = 1;

    if (this.zustand === 'gehen') {
      const p = this.gehPhase, w = p * Math.PI * 2;
      lean = 4.0; kopfVor = 3.8;
      frontFoot = { x: 3 + Math.sin(w) * 8, y: -Math.max(0, Math.sin(w)) * 3 };
      backFoot = { x: -3 + Math.sin(w + Math.PI) * 8, y: -Math.max(0, Math.sin(w + Math.PI)) * 3 };
      hip = { x: 0, y: -24 - Math.abs(Math.sin(w * 2)) * 1.4 };
      // Arme gegenläufig zu den Beinen
      swordHand = { x: 5 - Math.sin(w) * 4, y: -30 + Math.cos(w) * 1.5 }; swordDir = 1.4;
      shieldHand = { x: -3 - Math.sin(w + Math.PI) * 4, y: -28 };
    } else if (this.zustand === 'garde') {
      // Schwert+Schild-Garde: Schild VOR den Körper, Schwert hinten bereit, leichte Hocke
      const b = Math.sin(tt * 2.6) * 0.6;
      lean = 4.5; kopfVor = 3.0;
      hip = { x: 0, y: -22 + b * 0.2 };
      frontFoot = { x: 5, y: 0 }; backFoot = { x: -6, y: 0 };
      shieldHand = { x: 9.5, y: -30 + b * 0.4 }; schildBend = 1;        // Schild vorgehalten
      swordHand = { x: -4, y: -33 }; swordDir = -1.9; schwertBend = -1; // Schwert hoch/hinten bereit
    } else if (this.zustand === 'ausfall') {
      // AUSFALLSCHRITT + Hieb: Ausholen -> explosiver Lunge -> Halten -> Zurück.
      const ph = this.phase;
      if (ph < 0.25) {
        const k = smooth(ph / 0.25);                                   // Ausholen (Gewicht zurück, Schwert hoch)
        lean = lerp(2.6, -2, k); kopfVor = 3;
        hip = { x: lerp(0, -3, k), y: -24 };
        frontFoot = { x: lerp(3, 1, k), y: 0 }; backFoot = { x: lerp(-4.5, -7, k), y: 0 };
        swordHand = { x: lerp(5, -3, k), y: lerp(-30, -40, k) }; swordDir = lerp(1.2, -2.2, k); schwertBend = -1;
        shieldHand = { x: lerp(-3, 2, k), y: -28 };
      } else if (ph < 0.55) {
        const k = smooth((ph - 0.25) / 0.30);                          // LUNGE: Fuß weit vor, Körper drüber
        lean = lerp(-2, 9, k); kopfVor = lerp(3, 5.5, k);              // Oberkörper + Kopf führen nach vorn
        hip = { x: lerp(-3, 6, k), y: lerp(-24, -20, k) };            // Hüfte senkt + schiebt vor
        frontFoot = { x: lerp(1, 16, k), y: 0 };                      // tiefer Ausfallschritt
        backFoot = { x: lerp(-7, -13, k), y: 0 };                     // hinteres Bein gestreckt
        swordHand = { x: lerp(-3, 14, k), y: lerp(-40, -26, k) }; swordDir = lerp(-2.2, 0.5, k); schwertBend = -1;
        shieldHand = { x: lerp(2, -2, k), y: -27 };
      } else if (ph < 0.7) {
        lean = 9; kopfVor = 5.5;                                       // kurzer Halt im Ausfall
        hip = { x: 6, y: -20 }; frontFoot = { x: 16, y: 0 }; backFoot = { x: -13, y: 0 };
        swordHand = { x: 14, y: -26 }; swordDir = 0.5; schwertBend = -1; shieldHand = { x: -2, y: -27 };
      } else {
        const k = smooth((ph - 0.7) / 0.30);                          // Zurück in die Grundstellung
        lean = lerp(9, 2.6, k); kopfVor = lerp(5.5, 3.4, k);
        hip = { x: lerp(6, 0, k), y: lerp(-20, -24, k) };
        frontFoot = { x: lerp(16, 3, k), y: 0 }; backFoot = { x: lerp(-13, -4.5, k), y: 0 };
        swordHand = { x: lerp(14, 5, k), y: lerp(-26, -30, k) }; swordDir = lerp(0.5, 1.2, k);
        shieldHand = { x: lerp(-2, -3, k), y: -28 };
      }
    } else if (this.zustand === 'sieg') {
      // Sieg: Schwert hoch gereckt, Brust raus, Kopf leicht zurück
      const j = Math.abs(Math.sin(tt * 3)) * 1.5;
      lean = 0; kopfVor = 1.5;
      hip = { x: 0, y: -24 - j };
      frontFoot = { x: 4, y: 0 }; backFoot = { x: -5, y: 0 };
      swordHand = { x: 3, y: -46 }; swordDir = -1.55; schwertBend = -1;
      shieldHand = { x: -7, y: -26 };
    } else {
      // stehen: ruhiger Atem, Gewicht leicht vorn, Kopf vor
      hip = { x: 0, y: -24 + atem * 0.25 };
      swordHand = { x: 5 + atem * 0.3, y: -30 }; swordDir = 1.2;
      shieldHand = { x: -3, y: -28 + atem * 0.2 };
    }

    const shoulder: P = { x: hip.x + lean, y: hip.y - 18 };
    const head: P = { x: shoulder.x + kopfVor, y: shoulder.y - 7 };
    const kopfTilt = 0.12 + kopfVor * 0.02;   // Helm folgt der Neigung
    // Arme setzen an der Schulter an (Hand-Ziele sind absolut gesetzt)
    return { hip, shoulder, head, kopfTilt, frontFoot, backFoot, swordHand, swordDir, schwertBend, shieldHand, schildBend };
  }
}

// ---- Helfer ---------------------------------------------------------------
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function smooth(t: number): number { const x = Phaser.Math.Clamp(t, 0, 1); return x * x * (3 - 2 * x); }
// 2-Knochen-IK: Gelenk zwischen root und target (l1+l2), bend = +/-1 Beugerichtung
function ik2(root: P, target: P, l1: number, l2: number, bend: number): P {
  const dx = target.x - root.x, dy = target.y - root.y;
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.001);
  const a = Math.atan2(dy, dx);
  const cosA = Phaser.Math.Clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const ang = a + bend * Math.acos(cosA);
  return { x: root.x + Math.cos(ang) * l1, y: root.y + Math.sin(ang) * l1 };
}
