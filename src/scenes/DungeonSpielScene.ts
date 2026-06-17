// Spielbarer Dungeon (Runde 51, Autorwunsch "Debug-Arena mit der Dungeon-Probe
// verschmelzen"): die 3. Funktion der Probe - man läuft mit dem ECHTEN Helden
// durch einen generierten Dungeon (V1/V3/V4/V5) und kämpft gegen spawnbare
// Gegner. Aufbau wie die Debug-Arena (CombatScene), aber die Kollision und das
// Bild kommen aus dem gewählten Generator.

import { CombatScene } from '../world/CombatScene';
import type { Enemy } from '../world/Enemy';
import { TILE } from '../gfx/fallbackArt';
import { erzeugeKarte, findeStartKachel, type ProbeKarte, type DungeonVersion } from '../world/probeKarten';
import type { EnemyTypeId } from '../data/types';
import Phaser from 'phaser';

const SPAWN_KEYS: Record<string, EnemyTypeId> = {
  f1: 'pest', f2: 'skelett', f3: 'schuetze', f4: 'schatten', f5: 'wolf', f6: 'ratte', f7: 'templer',
};

export class DungeonSpielScene extends CombatScene {
  private version: DungeonVersion = 5;
  private karte!: ProbeKarte;
  private hudText!: Phaser.GameObjects.Text;
  private lastInfo = '';

  constructor() { super('DungeonSpiel'); }

  init(data: { version?: DungeonVersion }): void {
    this.version = data.version ?? 5;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0908');
    this.karte = erzeugeKarte(this.version);
    const start = findeStartKachel(this.karte);
    // WICHTIG: setupCombat erzeugt this.provider - MUSS vor zeichneDungeon laufen
    // (sonst Absturz: this.provider undefined beim Tile-Zeichnen).
    this.setupCombat(start.x * TILE + TILE / 2, start.y * TILE + TILE / 2);
    this.zeichneDungeon();
    this.cameras.main.startFollow(this.playerSprite, true, 0.15, 0.15);
    this.cameras.main.setBounds(0, 0, this.karte.w * TILE, this.karte.h * TILE);
    this.spawneTesthorde(start);

    this.hudText = this.add.text(this.scale.width - 12, 12, '', {
      fontFamily: 'serif', fontSize: '14px', color: '#d8cfb8', backgroundColor: '#000000aa', padding: { x: 8, y: 6 }, align: 'right',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(700);
    this.add.text(12, this.scale.height - 12, [
      `SPIELBARER DUNGEON  ·  ${this.karte.name}`,
      'WASD: Laufen · Klick: Angriff · Umschalt: schwer · Rechtsklick: Block · Leer: Rolle · 4/5/6: Fähigkeiten',
      'F1-F7: Gegner spawnen · K: Gegner löschen · N: Neuer Dungeon · ESC: zurück zur Probe',
    ].join('\n'), {
      fontFamily: 'serif', fontSize: '13px', color: '#c8b890', backgroundColor: '#000000aa', padding: { x: 8, y: 6 },
    }).setOrigin(0, 1).setScrollFactor(0).setDepth(700);

    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      const k = ev.key.toLowerCase();
      if (ev.key.startsWith('F') && ev.key.length <= 3) ev.preventDefault();
      const typ = SPAWN_KEYS[k];
      if (typ) { const a = Math.random() * 6.283; this.spawnEnemy(typ, 1, this.px + Math.cos(a) * 180, this.py + Math.sin(a) * 180); }
      if (k === 'k') { for (const e of this.enemies) e.sprite?.destroy(); this.enemies = []; }
      if (k === 'n') this.scene.restart({ version: this.version });
      if (ev.key === 'Escape') this.scene.start('DungeonProbe');
    });
  }

  // Tiles aus dem Generator: solide -> Wand, sonst -> Boden (echte Krypta-Art).
  private zeichneDungeon(): void {
    const k = this.karte;
    for (let ty = 0; ty < k.h; ty++) {
      for (let tx = 0; tx < k.w; tx++) {
        const wand = k.solid(k.grid[ty][tx]);
        const variant = ((tx * 73856093) ^ (ty * 19349663)) % 7;
        const key = this.provider.tileKey(wand ? 'krypta_wand_front' : 'krypta_boden', variant);
        this.add.image(tx * TILE + TILE / 2, ty * TILE + TILE / 2, key).setDepth(wand ? ty * TILE + 1 : -10);
      }
    }
  }

  private spawneTesthorde(start: { x: number; y: number }): void {
    let gesetzt = 0;
    for (let v = 0; v < 200 && gesetzt < 6; v++) {
      const tx = 1 + Math.floor(Math.random() * (this.karte.w - 2)), ty = 1 + Math.floor(Math.random() * (this.karte.h - 2));
      if (this.karte.solid(this.karte.grid[ty][tx])) continue;
      if (Math.hypot(tx - start.x, ty - start.y) < 6) continue;       // nicht direkt am Helden
      this.spawnEnemy(gesetzt % 2 ? 'skelett' : 'pest', 1, tx * TILE + TILE / 2, ty * TILE + TILE / 2);
      gesetzt++;
    }
  }

  // Kollision aus dem Generator-Gitter.
  override isSolidAt(x: number, y: number): boolean {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    const t = this.karte.grid[ty]?.[tx];
    return t === undefined || this.karte.solid(t);
  }

  protected override onEnemyKilled(e: Enemy): void {
    this.dropLoot(e);
  }

  protected override onPlayerDeath(): void {
    this.p.hp = this.p.stats.maxhp;
    this.playerDead = false;
    this.belebePlayerSprite();
  }

  override logMsg(text: string, _cls?: string): void {
    this.lastInfo = text;
  }

  update(_time: number, delta: number): void {
    this.updateCombat(delta / 1000);
    this.hudText.setText([
      `Leben ${Math.max(0, Math.ceil(this.p.hp))}/${this.p.stats.maxhp}   Mana ${Math.ceil(this.p.mana)}/${this.p.stats.maxmana}`,
      `Gegner: ${this.enemies.length}`,
      this.lastInfo,
    ].join('\n'));
  }
}
