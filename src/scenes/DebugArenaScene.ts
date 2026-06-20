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
import { SchattenManager, type Occluder, type Licht } from '../systems/SchattenManager';
import { getSettings } from '../logic/settings';
import Phaser from 'phaser';

const ARENA_W = 30;
const ARENA_H = 20;

// Licht-Testvarianten (Autorwunsch R55: "mehrere Varianten per Regler testen")
const LICHT_VARIANTEN = [
  'Nur Sichtradius (Held)',
  'Nur Wandfackel',
  'Wandfackel + Sichtradius',
  'Mehrere Fackeln + Sichtradius',
  'Licht am Helden (alt)',
] as const;

interface LichtRegler { x: number; y: number; w: number; label: string; min: number; max: number; get: () => number; set: (v: number) => void; txt: Phaser.GameObjects.Text }

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
  private fackelAn = false;                   // Dungeon-Dunkel mit Lichtern (Taste X)
  private schatten!: SchattenManager;         // geteilter Schatten-Manager (beide Modi)
  private statischeOccl: Occluder[] = [];     // Säulen/Truhen/Gebäude (werfen Schatten)
  // Licht-Test (R55): Variante + Held-Sichtradius + Feuer-Stil + Weichheit
  private fackeln: Array<{ x: number; y: number }> = [];   // feste Wandfackeln
  private lichtVariante = 2;                   // Index in LICHT_VARIANTEN (Start: Wandfackel + Sicht)
  private sichtRadius = 110;                   // persönlicher Lichtradius des Helden
  private heldLichtAn = true;                  // Sichtradius an/aus
  private feuerNeu = true;                     // Feuer-Stil neu/alt
  private weichheit = 0.7;                     // Schatten-Weichheit 0..1
  private lichtPanelG!: Phaser.GameObjects.Graphics;
  private lichtRegler: LichtRegler[] = [];
  private ziehRegler: LichtRegler | null = null;
  private lichtSchalterListe: Array<{ txt: Phaser.GameObjects.Text; label: () => string }> = [];

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
      'LICHT-TEST (Panel rechts): Variante/Sichtradius/Feuer-Stil/Weichheit  ·  X: Dungeon-Dunkel an/aus  ·  Z: Sonne wandern  ·  < > : Sonnenstand',
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
    // Schatten über den geteilten Manager: Fackel = Dungeon-Raycasting, sonst Sonne.
    if (this.sonneAuto) this.sonnenWinkel = (this.sonnenWinkel + 0.00003 * delta) % 1;
    const st = getSettings().schatten / 100;   // Leistungs-/Stärke-Regler
    const dyn = this.dynamischeOccl();
    // Dungeon-Licht über die gewählte Variante (Sichtradius/Wandfackeln), sonst Sonne.
    this.schatten.feuerNeu = this.feuerNeu;
    if (this.fackelAn) this.schatten.lichter(this.baueLichter(), dyn, st);
    else this.schatten.sonne(this.sonnenWinkel, dyn, st);
    this.zeichneLichtPanel();
    const std = Math.round(4 + this.sonnenWinkel * 16);   // ~4..20 Uhr
    this.hudText.setText([
      `Leben ${Math.max(0, Math.ceil(this.p.hp))}/${this.p.stats.maxhp}   Mana ${Math.ceil(this.p.mana)}/${this.p.stats.maxmana}`,
      `Waffe: ${this.p.weapon?.name ?? '-'}`,
      `Sonne: ${std}:00 Uhr ${this.sonneAuto ? '(wandert)' : '(steht)'}   Fackel: ${this.fackelAn ? 'AN' : 'aus'}`,
      this.lastAttackInfo,
    ].join('\n'));
  }

  // --- Schatten-Prototyp -----------------------------------------------------

  // Test-Hindernisse (Säulen + Truhe + zwei Gebäude) + Schatten-Manager anlegen.
  // Alle Objekte werfen über den Manager sowohl Sonnen- als auch Fackelschatten.
  private baueSchattenTest(): void {
    const cx = (ARENA_W / 2) * TILE, cy = (ARENA_H / 2) * TILE;
    this.statischeOccl = [];
    const stellen: Array<[number, number]> = [[-120, -90], [140, -60], [-60, 110], [170, 90], [40, -130]];
    for (const [dx, dy] of stellen) {
      const x = cx + dx, y = cy + dy;
      this.add.rectangle(x, y - 16, 16, 34, 0x6a6258).setDepth(y).setStrokeStyle(1, 0x3a352e);
      this.add.ellipse(x, y, 18, 8, 0x4a463e).setDepth(y - 0.1);
      this.statischeOccl.push({ x, y, w: 17, h: 9, hoehe: 34 });   // schmale, hohe Säule
    }
    // flache Truhe (niedrig + breit -> kurzer breiter Schatten)
    {
      const x = cx - 150, y = cy + 30;
      this.add.rectangle(x, y - 7, 24, 16, 0x6a4a28).setDepth(y).setStrokeStyle(1, 0x3a2a16);
      this.add.rectangle(x, y - 12, 24, 6, 0x8a6638).setDepth(y);
      this.statischeOccl.push({ x, y, w: 26, h: 12, hoehe: 14 });
    }
    // zwei "Gebäude" (groß + hoch -> langer Gebäudeschatten, Autorwunsch)
    for (const [dx, dy, bw, bh] of [[-230, -40, 70, 56], [230, -120, 80, 50]] as const) {
      const x = cx + dx, y = cy + dy;
      this.add.rectangle(x, y - bh / 2, bw, bh, 0x584c3e).setDepth(y).setStrokeStyle(2, 0x3a322a);
      this.add.rectangle(x, y - bh + 4, bw, 10, 0x6a5c48).setDepth(y);   // Dachkante
      this.statischeOccl.push({ x, y, w: bw, h: 16, hoehe: bh + 30 });
    }
    // Feste Wandfackeln als Lichtquellen (R55): das Dungeon-Licht steht im Raum,
    // NICHT am Helden - so wirft der Held selbst weiche Schatten. Die Flamme malt
    // der Schatten-Manager animiert; hier nur der Halter (Stab + Korb).
    this.fackeln = [{ x: cx, y: cy - 150 }, { x: cx - 200, y: cy + 70 }, { x: cx + 205, y: cy + 50 }];
    for (const f of this.fackeln) this.zeichneFackelHalter(f.x, f.y);
    this.schatten = new SchattenManager(this);
    this.schatten.setzeStatisch(this.statischeOccl);
    this.baueLichtPanel();
  }

  // Wandfackel-Halter (Stab + eiserner Korb); die Flamme sitzt am Punkt (x,y).
  private zeichneFackelHalter(x: number, y: number): void {
    this.add.rectangle(x, y + 13, 5, 22, 0x5a4228).setDepth(y).setStrokeStyle(1, 0x2e2014);  // Holzstab
    this.add.rectangle(x, y + 4, 9, 4, 0x3a3a40).setDepth(y + 0.1);                            // Eisenband
    this.add.ellipse(x, y, 12, 7, 0x2a221a).setDepth(y + 0.1);                                 // Korb/Glutbett
    this.add.ellipse(x, y - 1, 7, 4, 0x6a2a10).setDepth(y + 0.2);                              // Glut
  }

  // Dynamische Verdecker (Held + Gegner) je Frame - werfen auch Schatten.
  private dynamischeOccl(): Occluder[] {
    const d: Occluder[] = [{ x: this.px, y: this.py + 10, w: 16, h: 8, hoehe: 26 }];
    for (const e of this.enemies) if (e.sprite) d.push({ x: e.x, y: e.y + 8, w: 15, h: 8, hoehe: 22 });
    return d;
  }

  // Lichter der gewählten Variante zusammenstellen (Held-Sicht + Wandfackeln).
  private baueLichter(): Licht[] {
    const sicht: Licht = { x: this.px, y: this.py - 6, art: 'sicht', radius: this.sichtRadius };
    const fackel = (i: number, r = 240): Licht => ({ x: this.fackeln[i].x, y: this.fackeln[i].y, art: 'fackel', radius: r, weich: this.weichheit });
    const mitSicht = (arr: Licht[]): Licht[] => this.heldLichtAn ? [...arr, sicht] : arr;
    switch (this.lichtVariante) {
      case 0: return this.heldLichtAn ? [sicht] : [];                       // Nur Sichtradius
      case 1: return [fackel(0)];                                           // Nur Wandfackel
      case 2: return mitSicht([fackel(0)]);                                 // Wandfackel + Sicht
      case 3: return mitSicht([fackel(0), fackel(1), fackel(2)]);           // Mehrere Fackeln + Sicht
      case 4: return [{ x: this.px, y: this.py - 6, art: 'fackel', radius: Math.max(150, this.sichtRadius), weich: this.weichheit }]; // Licht am Helden (alt)
      default: return mitSicht([fackel(0)]);
    }
  }

  // --- Licht-Test-Bedienfeld (Regler + Schalter, Autorwunsch R55) -----------
  private baueLichtPanel(): void {
    const W = this.scale.width, x0 = W - 322, y0 = 86;
    this.add.text(x0 + 8, y0 - 22, 'LICHT-TEST (Dungeon: X)', { fontFamily: 'serif', fontSize: '13px', color: '#ffcf8a', backgroundColor: '#000000aa', padding: { x: 6, y: 3 } }).setScrollFactor(0).setDepth(800);
    this.lichtPanelG = this.add.graphics().setScrollFactor(0).setDepth(795);
    this.lichtRegler = []; this.lichtSchalterListe = [];
    let y = y0 + 8;
    // Varianten-Wahl
    this.lichtSchalter(x0 + 8, y, () => `Variante: ${LICHT_VARIANTEN[this.lichtVariante]}`, () => { this.lichtVariante = (this.lichtVariante + 1) % LICHT_VARIANTEN.length; }); y += 30;
    this.lichtSchalter(x0 + 8, y, () => `Held-Licht (Sicht): ${this.heldLichtAn ? 'AN' : 'AUS'}`, () => { this.heldLichtAn = !this.heldLichtAn; }); y += 30;
    this.lichtReglerNeu(x0 + 8, y, 240, 'Sichtradius', 40, 240, () => this.sichtRadius, (v) => { this.sichtRadius = v; }); y += 34;
    this.lichtSchalter(x0 + 8, y, () => `Feuer-Stil: ${this.feuerNeu ? 'NEU' : 'alt'}`, () => { this.feuerNeu = !this.feuerNeu; }); y += 30;
    this.lichtReglerNeu(x0 + 8, y, 240, 'Weichheit', 0, 100, () => Math.round(this.weichheit * 100), (v) => { this.weichheit = v / 100; }); y += 34;
    this.lichtSchalter(x0 + 8, y, () => `Dungeon-Dunkel: ${this.fackelAn ? 'AN' : 'AUS'}`, () => { this.fackelAn = !this.fackelAn; }); y += 30;

    // Ziehen der Regler global auswerten
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (this.ziehRegler) this.setzeReglerAusX(this.ziehRegler, p.x); });
    this.input.on('pointerup', () => { this.ziehRegler = null; });
  }

  private lichtSchalter(x: number, y: number, label: () => string, fn: () => void): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, label(), { fontFamily: 'serif', fontSize: '13px', color: '#e6dcc4', backgroundColor: '#241c10', padding: { x: 7, y: 4 } }).setScrollFactor(0).setDepth(801).setInteractive({ useHandCursor: true });
    t.on('pointerover', () => t.setBackgroundColor('#3a2e18'));
    t.on('pointerout', () => t.setBackgroundColor('#241c10'));
    t.on('pointerdown', (p: Phaser.Input.Pointer) => { p.event.stopPropagation(); fn(); });
    this.lichtSchalterListe.push({ txt: t, label });
    return t;
  }

  private lichtReglerNeu(x: number, y: number, w: number, label: string, min: number, max: number, get: () => number, set: (v: number) => void): void {
    const txt = this.add.text(x, y - 1, '', { fontFamily: 'serif', fontSize: '12px', color: '#cbbfa0', backgroundColor: '#00000080', padding: { x: 4, y: 1 } }).setScrollFactor(0).setDepth(801);
    const desc: LichtRegler = { x, y: y + 18, w, label, min, max, get, set, txt };
    this.lichtRegler.push(desc);
    const zone = this.add.zone(x, y + 8, w, 22).setOrigin(0, 0).setScrollFactor(0).setDepth(802).setInteractive();
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => { this.ziehRegler = desc; this.setzeReglerAusX(desc, p.x); });
  }

  private setzeReglerAusX(d: LichtRegler, px: number): void {
    const f = Phaser.Math.Clamp((px - d.x) / d.w, 0, 1);
    d.set(Math.round(d.min + f * (d.max - d.min)));
  }

  private zeichneLichtPanel(): void {
    const g = this.lichtPanelG; if (!g) return;
    g.clear();
    for (const s of this.lichtSchalterListe) { const neu = s.label(); if (s.txt.text !== neu) s.txt.setText(neu); }
    for (const d of this.lichtRegler) {
      const f = (d.get() - d.min) / Math.max(1, d.max - d.min);
      g.fillStyle(0x1a1410, 1).fillRoundedRect(d.x, d.y - 4, d.w, 8, 4);
      g.fillStyle(0x9a6a2a, 1).fillRoundedRect(d.x, d.y - 4, d.w * f, 8, 4);
      g.fillStyle(0xf0d8a0, 1).fillCircle(d.x + d.w * f, d.y, 7);
      g.lineStyle(2, 0x2a2018, 1).strokeCircle(d.x + d.w * f, d.y, 7);
      d.txt.setText(`${d.label}: ${d.get()}`);
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
