// DebugArena (Harte Regel 3.2/7): leerer Raum, ein Dummy-Gegner jedes Typs
// auf Knopfdruck spawnbar, Anzeige von Hitboxen/Timings per Taste H.
// Hier wird das Kampfgefühl getunt, BEVOR Inhalte gebaut werden.

import { CombatScene } from '../world/CombatScene';
import type { Enemy } from '../world/Enemy';
import { TILE } from '../gfx/fallbackArt';
import { LIGHT_ATTACK, HEAVY_ATTACK, BLOCK, ROLL, PLAYER } from '../data/kampf';
import { recalc } from '../logic/playerState';
import type { EnemyTypeId, WeaponClass } from '../data/types';
import { WEAPONS, BOWS } from '../data/items';
import Phaser from 'phaser';

const ARENA_W = 30;
const ARENA_H = 20;

// F-Tasten, damit Zauber (1-3) und Fähigkeiten (4-6) frei bleiben
const SPAWN_KEYS: Record<string, EnemyTypeId> = {
  f1: 'pest', f2: 'skelett', f3: 'schuetze', f4: 'schatten', f5: 'wolf', f6: 'ratte', f7: 'templer',
};

export class DebugArenaScene extends CombatScene {
  private showDebug = true;
  private debugGfx!: Phaser.GameObjects.Graphics;
  private debugText!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;
  private spawnElite = false;
  private lastAttackInfo = '';

  // --- SCHATTEN-PROTOTYP (R55, Test vor dem Live-Einbau) -------------------
  // Hinweis zur Kostenfrage: ein projizierter Schatten ist KEIN ständiges
  // Neuzeichnen von Texturen. Es ist eine einfache Form (Oval/Quad), deren
  // Lage/Länge sich aus dem Sonnenstand ergibt - die GPU zeichnet die Szene eh
  // jeden Frame. Bewegt sich die Sonne, ändert sich nur ein Winkel/eine Länge.
  private sonnenWinkel = 0.5;                 // 0..1 Tageslauf (0 Sonnenaufgang .. 1 Untergang)
  private sonneAuto = true;                   // Sonne wandert automatisch
  private fackelAn = false;                   // getragene Fackel (Taste X)
  private schattenGfx!: Phaser.GameObjects.Graphics;   // Sonnenschatten (Weltkoordinaten)
  private fackelRT!: Phaser.GameObjects.RenderTexture; // Fackel-Dunkelheit (Schirm)
  private fackelWedge!: Phaser.GameObjects.Graphics;   // Occlusion-Schatten der Fackel (Schirm)
  private lichtScratch?: Phaser.GameObjects.Image;     // Lichtblob zum Ausstanzen
  private saeulen: Array<{ x: number; y: number; r: number }> = [];   // Test-Hindernisse

  constructor() {
    super('DebugArena');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#141210');
    this.setupCombat((ARENA_W / 2) * TILE, (ARENA_H / 2) * TILE);
    this.drawArena();
    this.cameras.main.startFollow(this.playerSprite, true, 0.15, 0.15);
    this.spawnDummy();
    this.baueSchattenTest();

    this.debugGfx = this.add.graphics().setDepth(560);
    this.debugText = this.add.text(12, 12, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#9ad8a0', backgroundColor: '#000000aa', padding: { x: 8, y: 6 },
    }).setScrollFactor(0).setDepth(700);
    this.add.text(12, this.scale.height - 12, [
      'DEBUG-ARENA  ·  F1-F7: Gegner spawnen (Pest/Skelett/Schütze/Schatten/Wolf/Ratte/Templer)',
      'F8: Dummy · F9: Elite an/aus · K: Gegner löschen · H: Hitboxen/Timings · G: Waffe wechseln · L: Schulen Stufe 9 · ESC: Menü',
      'WASD: Laufen · Klick: Angriff · Umschalt: schwer · Rechtsklick: Block · Leer: Rolle · R/T: Waffen-Fähigkeit · 4/5/6: Kettenblitz/Frostnova/Bannkreis',
      'SCHATTEN-TEST  ·  X: Fackel tragen (Dungeon-Schatten an/aus)  ·  Z: Sonne wandern an/aus  ·  < > : Sonnenstand drehen',
    ].join('\n'), {
      fontFamily: 'serif', fontSize: '13px', color: '#c8b890', backgroundColor: '#000000aa', padding: { x: 8, y: 6 },
    }).setOrigin(0, 1).setScrollFactor(0).setDepth(700);
    this.hudText = this.add.text(this.scale.width - 12, 12, '', {
      fontFamily: 'serif', fontSize: '14px', color: '#d8cfb8', backgroundColor: '#000000aa', padding: { x: 8, y: 6 }, align: 'right',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(700);
    // F-Tasten nicht an den Browser durchreichen
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ev.key.startsWith('F') && ev.key.length <= 3) ev.preventDefault();
    });
    // Dev-Hook für automatisierte Tests
    if (import.meta.env.DEV) {
      (window as unknown as { __arena?: DebugArenaScene }).__arena = this;
    }
  }

  private drawArena(): void {
    for (let ty = 0; ty < ARENA_H; ty++) {
      for (let tx = 0; tx < ARENA_W; tx++) {
        const edge = tx === 0 || ty === 0 || tx === ARENA_W - 1 || ty === ARENA_H - 1;
        const variant = ((tx * 73856093) ^ (ty * 19349663)) % 7;
        const key = this.provider.tileKey(edge ? 'krypta_wand_front' : 'krypta_boden', variant);
        this.add.image(tx * TILE + TILE / 2, ty * TILE + TILE / 2, key).setDepth(-10);
      }
    }
  }

  isSolidAt(x: number, y: number): boolean {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    return tx <= 0 || ty <= 0 || tx >= ARENA_W - 1 || ty >= ARENA_H - 1;
  }

  protected onEnemyKilled(e: Enemy): void {
    this.dropLoot(e); // auch in der Arena, um Beute/Lichtsäulen zu testen
  }

  protected onPlayerDeath(): void {
    this.p.hp = this.p.stats.maxhp;
    this.playerDead = false;
    this.belebePlayerSprite();
    this.logMsg('Arena: Tod zurückgesetzt (volles Leben)', 'bad');
  }

  override logMsg(text: string, _cls?: string): void {
    this.lastAttackInfo = text;
  }

  // Dummy: bewegungslose Zielscheibe mit viel Leben
  private spawnDummy(): void {
    const e = this.spawnEnemy('pest', 1, (ARENA_W / 2 + 4) * TILE, (ARENA_H / 2) * TILE);
    e.name = 'Dummy';
    e.maxhp = 9999;
    e.hp = 9999;
    e.speed = 0;
    e.aggro = 0; // greift nie an
  }

  protected override onGameKey(k: string): void {
    if (k === 'escape') this.scene.start('Title');
    if (SPAWN_KEYS[k]) {
      const a = Math.random() * 6.283;
      this.spawnEnemy(SPAWN_KEYS[k], 1, this.px + Math.cos(a) * 180, this.py + Math.sin(a) * 180, this.spawnElite && SPAWN_KEYS[k] !== 'templer');
    }
    if (k === 'f8') this.spawnDummy();
    if (k === 'f9') {
      this.spawnElite = !this.spawnElite;
      this.logMsg(this.spawnElite ? 'Elite-Spawn AN' : 'Elite-Spawn AUS');
    }
    if (k === 'k') {
      for (const e of this.enemies) e.sprite?.destroy();
      this.enemies = [];
    }
    if (k === 'h') this.showDebug = !this.showDebug;
    if (k === 'g') this.cycleWeapon();
    if (k === 'x') { this.fackelAn = !this.fackelAn; this.logMsg(this.fackelAn ? 'Fackel AN (Dungeon-Schatten)' : 'Fackel aus'); }
    if (k === 'z') { this.sonneAuto = !this.sonneAuto; this.logMsg(this.sonneAuto ? 'Sonne wandert' : 'Sonne steht (Pfeil < > zum Drehen)'); }
    if (k === ',' || k === 'arrowleft') this.sonnenWinkel = Math.max(0, this.sonnenWinkel - 0.05);
    if (k === '.' || k === 'arrowright') this.sonnenWinkel = Math.min(1, this.sonnenWinkel + 0.05);
    if (k === 'l') {
      // Schulen aufleveln, um alle Fähigkeiten zu testen
      for (const s of ['nahkampf', 'zauberei', 'bogen'] as const) {
        this.p.schools[s] = { uses: 500, level: 9 };
      }
      this.p.mana = this.p.stats.maxmana;
      this.logMsg('Alle Schulen auf Stufe 9 (Test)');
    }
  }

  // Waffe durchwechseln, um alle Movesets zu testen (Phase 2)
  private weaponIdx = 0;
  private cycleWeapon(): void {
    const all = [...WEAPONS, ...BOWS];
    this.weaponIdx = (this.weaponIdx + 1) % all.length;
    const [name, val, cls] = all[this.weaponIdx];
    this.p.weapon = { kind: 'weapon', name, rarity: 0, val, boni: [], weaponClass: cls as WeaponClass };
    recalc(this.p);
    this.logMsg(`Waffe: ${name} (${cls})`);
    if (cls === 'bogen' && this.p.arrows < 50) this.p.arrows = 50;
  }

  update(_time: number, delta: number): void {
    this.updateCombat(delta / 1000);
    this.renderDebug();
    // Schatten-Prototyp
    if (this.sonneAuto) this.sonnenWinkel = (this.sonnenWinkel + 0.00003 * delta) % 1;
    this.zeichneSonnenschatten();
    this.aktualisiereFackel();
    const std = Math.round(4 + this.sonnenWinkel * 16);   // ~4..20 Uhr
    this.hudText.setText([
      `Leben ${Math.max(0, Math.ceil(this.p.hp))}/${this.p.stats.maxhp}   Mana ${Math.ceil(this.p.mana)}/${this.p.stats.maxmana}`,
      `Waffe: ${this.p.weapon?.name ?? '-'}`,
      `Sonne: ${std}:00 Uhr ${this.sonneAuto ? '(wandert)' : '(steht)'}   Fackel: ${this.fackelAn ? 'AN' : 'aus'}`,
      this.lastAttackInfo,
    ].join('\n'));
  }

  // --- Schatten-Prototyp -----------------------------------------------------

  // Test-Hindernisse (Säulen) + Schatten-Layer + Fackel-Licht anlegen.
  private baueSchattenTest(): void {
    const cx = (ARENA_W / 2) * TILE, cy = (ARENA_H / 2) * TILE;
    const stellen: Array<[number, number]> = [[-120, -90], [140, -60], [-60, 110], [170, 90], [40, -130]];
    for (const [dx, dy] of stellen) {
      const x = cx + dx, y = cy + dy;
      // schlichte Steinsäule als Hindernis (wirft Sonnen- UND Fackelschatten)
      this.add.rectangle(x, y - 14, 16, 30, 0x6a6258).setDepth(y).setStrokeStyle(1, 0x3a352e);
      this.add.ellipse(x, y, 18, 8, 0x4a463e).setDepth(y - 0.1);
      this.saeulen.push({ x, y, r: 9 });
    }
    this.schattenGfx = this.add.graphics().setDepth(-9);   // Sonnenschatten auf dem Boden
    // weicher Lichtblob zum Ausstanzen der Fackel-Dunkelheit
    if (!this.textures.exists('arenaLicht')) {
      const S = 256, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
      const c = cv.getContext('2d')!;
      const grd = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.55, 'rgba(255,255,255,0.7)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = grd; c.fillRect(0, 0, S, S);
      this.textures.addCanvas('arenaLicht', cv);
    }
    this.lichtScratch = this.add.image(0, 0, 'arenaLicht').setVisible(false);
    this.fackelRT = this.add.renderTexture(0, 0, this.scale.width, this.scale.height).setOrigin(0, 0).setScrollFactor(0).setDepth(540).setVisible(false);
    this.fackelWedge = this.add.graphics().setScrollFactor(0).setDepth(541).setVisible(false);
  }

  // Sonnenstand -> Schattenrichtung + Länge. Mittags kurz + steil, morgens/abends
  // lang + flach. Jede Figur/Säule wirft den Schatten (ein Oval auf dem Boden).
  private zeichneSonnenschatten(): void {
    const g = this.schattenGfx; if (!g) return;
    g.clear();
    if (this.fackelAn) return;   // im Dunkeln keine Sonne
    const hoch = Math.sin(this.sonnenWinkel * Math.PI);            // 0 Auf/Untergang .. 1 Mittag
    const len = 8 + (1 - hoch) * 52;                               // lang in der Dämmerung
    const wid = 5 + hoch * 2.5;
    const ang = Math.PI / 2 + (this.sonnenWinkel - 0.5) * 2.3;     // morgens -> abends schwenkt der Schatten
    const alpha = 0.34;
    g.fillStyle(0x000000, alpha);
    // Spieler
    this.schattenOval(g, this.px, this.py + 15, len, wid, ang);
    // Gegner
    for (const e of this.enemies) if (e.sprite) this.schattenOval(g, e.x, e.y + 12, len * 0.9, wid, ang);
    // Säulen (höher -> längerer Schatten)
    for (const s of this.saeulen) this.schattenOval(g, s.x, s.y, len * 1.15, wid * 1.1, ang);
  }

  private schattenOval(g: Phaser.GameObjects.Graphics, fx: number, fy: number, len: number, wid: number, ang: number): void {
    const cos = Math.cos(ang), sin = Math.sin(ang);
    const ecx = fx + cos * len * 0.5, ecy = fy + sin * len * 0.5;
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 16; i++) {
      const t = (i / 16) * Math.PI * 2;
      const ex = Math.cos(t) * (len * 0.5), ey = Math.sin(t) * wid;
      pts.push(new Phaser.Math.Vector2(ecx + ex * cos - ey * sin, ecy + ex * sin + ey * cos));
    }
    g.fillPoints(pts, true);
  }

  // Getragene Fackel: dunkler Raum mit warmem Lichtkreis um den Spieler; die
  // Säulen werfen Schlagschatten (Occlusion) - das Licht kommt nicht hindurch.
  private aktualisiereFackel(): void {
    const rt = this.fackelRT, wg = this.fackelWedge;
    if (!rt || !wg || !this.lichtScratch) return;
    if (!this.fackelAn) { rt.setVisible(false); wg.setVisible(false); return; }
    const cam = this.cameras.main, zm = cam.zoom;
    const w2s = (wx: number, wy: number): [number, number] => [(wx - cam.worldView.x) * zm, (wy - cam.worldView.y) * zm];
    const t = this.time.now / 1000;
    const flick = 1 + Math.sin(t * 8) * 0.05 + Math.sin(t * 21) * 0.03;
    const rad = 150 * flick;                                  // Lichtradius (Welt)
    rt.setVisible(true); rt.clear();
    rt.fill(0x06040a, 0.9);                                   // Dunkelheit
    const [lx, ly] = w2s(this.px, this.py - 6);
    this.lichtScratch.setScale((rad * 2 * zm) / 256);
    rt.erase(this.lichtScratch, lx, ly);                     // Lichtloch ausstanzen
    // Occlusion: hinter jeder Säule einen Schattenkeil verdunkeln (auf eigener Lage)
    wg.setVisible(true); wg.clear(); wg.fillStyle(0x06040a, 0.92);
    for (const s of this.saeulen) {
      const d = Math.hypot(s.x - this.px, s.y - this.py);
      if (d > rad + s.r || d < s.r) continue;
      const a = Math.atan2(s.y - this.py, s.x - this.px);
      const perp = a + Math.PI / 2;
      const far = (rad - d) + 90;                            // Keil bis zur Lichtgrenze
      const [n1x, n1y] = w2s(s.x + Math.cos(perp) * s.r, s.y + Math.sin(perp) * s.r);
      const [n2x, n2y] = w2s(s.x - Math.cos(perp) * s.r, s.y - Math.sin(perp) * s.r);
      const spread = Math.asin(Math.min(0.99, s.r / d));
      const [f1x, f1y] = w2s(s.x + Math.cos(perp) * s.r + Math.cos(a - spread) * far, s.y + Math.sin(perp) * s.r + Math.sin(a - spread) * far);
      const [f2x, f2y] = w2s(s.x - Math.cos(perp) * s.r + Math.cos(a + spread) * far, s.y - Math.sin(perp) * s.r + Math.sin(a + spread) * far);
      wg.fillPoints([
        new Phaser.Math.Vector2(n1x, n1y), new Phaser.Math.Vector2(f1x, f1y),
        new Phaser.Math.Vector2(f2x, f2y), new Phaser.Math.Vector2(n2x, n2y),
      ], true);
    }
  }

  private renderDebug(): void {
    const g = this.debugGfx;
    g.clear();
    if (!this.showDebug) {
      this.debugText.setVisible(false);
      return;
    }
    this.debugText.setVisible(true);
    const c = this.combat;
    // Spieler-Hitbox + Blickrichtung
    g.lineStyle(1, 0x4ae04a, 0.8);
    g.strokeCircle(this.px, this.py, PLAYER.radius);
    g.lineBetween(this.px, this.py, this.px + Math.cos(this.pdir) * 26, this.py + Math.sin(this.pdir) * 26);
    // Angriffsreichweiten
    g.lineStyle(1, 0xe0b53a, 0.25);
    g.beginPath();
    g.arc(this.px, this.py, LIGHT_ATTACK.range, this.pdir - LIGHT_ATTACK.arc, this.pdir + LIGHT_ATTACK.arc);
    g.strokePath();
    // Gegner-Hitboxen + Aggro
    for (const e of this.enemies) {
      g.lineStyle(1, 0xe04a4a, 0.8);
      g.strokeCircle(e.x, e.y, e.r);
      if (e.aggro > 0) {
        g.lineStyle(1, 0xe04a4a, 0.12);
        g.strokeCircle(e.x, e.y, e.aggro);
      }
    }
    const lines = [
      `Zustand: ${c.action}  Kombo: ${c.combo + 1}/3`,
      `Erholung: ${c.recoverT.toFixed(2)}s / ${c.recoverTotal.toFixed(2)}s  (abbrechbar ab 50%)`,
      `Kombo-Fenster: ${c.comboWindowT.toFixed(2)}s   Puffer: ${c.bufferT.toFixed(2)}s ${c.bufferedAction ?? ''}`,
      `Schwer-Ausholen: ${c.heavyT.toFixed(2)}s / ${HEAVY_ATTACK.windupS}s (2,2x)`,
      `Block: ${c.blocking ? 'AN' : 'aus'}  gehalten: ${c.blockT.toFixed(2)}s  Parade-Fenster: ${(BLOCK.parryWindowMs / 1000).toFixed(2)}s`,
      `Riposte: ${c.riposteT.toFixed(2)}s   Rolle iFrames: ${c.rollT.toFixed(2)}s/${ROLL.iFramesMs / 1000}s  CD: ${c.rollCdT.toFixed(2)}s`,
      `Hit-Stop: ${(Math.max(0, this.hitstopT) * 1000).toFixed(0)}ms   Gegner: ${this.enemies.length}`,
    ];
    this.debugText.setText(lines.join('\n'));
  }
}
