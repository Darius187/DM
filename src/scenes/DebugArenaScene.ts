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

const SPAWN_KEYS: Record<string, EnemyTypeId> = {
  '1': 'pest', '2': 'skelett', '3': 'schuetze', '4': 'schatten', '5': 'wolf', '6': 'ratte', '7': 'templer',
};

export class DebugArenaScene extends CombatScene {
  private showDebug = true;
  private debugGfx!: Phaser.GameObjects.Graphics;
  private debugText!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;
  private spawnElite = false;
  private lastAttackInfo = '';

  constructor() {
    super('DebugArena');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#141210');
    this.setupCombat((ARENA_W / 2) * TILE, (ARENA_H / 2) * TILE);
    this.drawArena();
    this.cameras.main.startFollow(this.playerSprite, true, 0.15, 0.15);
    this.spawnDummy();

    this.debugGfx = this.add.graphics().setDepth(560);
    this.debugText = this.add.text(12, 12, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#9ad8a0', backgroundColor: '#000000aa', padding: { x: 8, y: 6 },
    }).setScrollFactor(0).setDepth(700);
    this.add.text(12, this.scale.height - 12, [
      'DEBUG-ARENA  ·  1-7: Gegner spawnen (Pest/Skelett/Schütze/Schatten/Wolf/Ratte/Templer)',
      '0: Dummy · 9: Elite an/aus · K: Gegner löschen · H: Hitboxen/Timings · G: Waffe wechseln · ESC: Menü',
      'WASD: Laufen · Linksklick: Angriff (3er-Kombo) · Umschalt: schwerer Hieb · Rechtsklick halten: Block/Parade · Leertaste: Rolle',
    ].join('\n'), {
      fontFamily: 'serif', fontSize: '13px', color: '#c8b890', backgroundColor: '#000000aa', padding: { x: 8, y: 6 },
    }).setOrigin(0, 1).setScrollFactor(0).setDepth(700);
    this.hudText = this.add.text(this.scale.width - 12, 12, '', {
      fontFamily: 'serif', fontSize: '14px', color: '#d8cfb8', backgroundColor: '#000000aa', padding: { x: 8, y: 6 }, align: 'right',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(700);

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'));
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

  protected onEnemyKilled(_e: Enemy): void {
    this.logMsg('Gegner besiegt - neuer Spawn per Taste 1-7', '');
  }

  protected onPlayerDeath(): void {
    this.p.hp = this.p.stats.maxhp;
    this.playerDead = false;
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
    if (SPAWN_KEYS[k]) {
      const a = Math.random() * 6.283;
      this.spawnEnemy(SPAWN_KEYS[k], 1, this.px + Math.cos(a) * 180, this.py + Math.sin(a) * 180, this.spawnElite && SPAWN_KEYS[k] !== 'templer');
    }
    if (k === '0') this.spawnDummy();
    if (k === '9') {
      this.spawnElite = !this.spawnElite;
      this.logMsg(this.spawnElite ? 'Elite-Spawn AN' : 'Elite-Spawn AUS');
    }
    if (k === 'k') {
      for (const e of this.enemies) e.sprite?.destroy();
      this.enemies = [];
    }
    if (k === 'h') this.showDebug = !this.showDebug;
    if (k === 'g') this.cycleWeapon();
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
    this.hudText.setText([
      `Leben ${Math.max(0, Math.ceil(this.p.hp))}/${this.p.stats.maxhp}   Mana ${Math.ceil(this.p.mana)}/${this.p.stats.maxmana}`,
      `Waffe: ${this.p.weapon?.name ?? '-'}`,
      this.lastAttackInfo,
    ].join('\n'));
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
