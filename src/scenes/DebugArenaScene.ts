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
import { LichtPanel } from '../ui/lichtPanel';
import { RitterModell } from '../demo3d/ritterModell';
import { Held3DModell } from '../demo3d/held3dModel';
import type { Technik } from '../demo3d/ritterBau';
import { Objekt3DLager } from '../demo3d/objekt3dLager';
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
  private fackelAn = true;                    // Dungeon-Dunkel mit Lichtern an (Taste X) - gleich sichtbar
  private schatten!: SchattenManager;         // geteilter Schatten-Manager (beide Modi)
  private statischeOccl: Occluder[] = [];     // Säulen/Truhen/Gebäude (werfen Schatten)
  private fackeln: Array<{ x: number; y: number }> = [];   // feste Wandfackeln
  private lichtPanel!: LichtPanel;            // dieselbe Licht-Werkbank wie im Hauptspiel

  // --- 3D-Held-Test (Runde 58): beide Modelle testbar + Schlagtechniken ------
  private ritter: RitterModell | null = null;     // prozeduraler Ritter
  private soldat: Held3DModell | null = null;      // geriggtes Soldier-Modell
  private held3dTex: Phaser.Textures.CanvasTexture | null = null;
  private held3dModus: 'ritter' | 'soldat' | 'aus' = 'ritter'; // Taste M: Modell wechseln
  private testTechnik: Technik | null = null;      // Taste B: Schlagtechnik durchtesten
  private static readonly H3D = 192;
  private static readonly TECHNIKEN: Technik[] = ['slash', 'overhead', 'thrust', 'spin'];
  private h3dZeit = 0; private h3dPx = 0; private h3dPy = 0;

  // --- 3D-Objekt-Baukasten (Setzen/Löschen platzierbarer 3D-Objekte) ---------
  private lager: Objekt3DLager | null = null;
  private bauTyp: string | null = null;     // gewählter Objekttyp (Setzmodus)
  private loeschModus = false;
  private bauScale = 0.8;                    // Skalierung der nächsten Platzierung
  private bauMenu: HTMLDivElement | null = null;
  private bauScaleLabel: HTMLSpanElement | null = null;

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
      'F8: Dummy · F9: Elite · K: Gegner löschen · H: Hitboxen · G: Waffe · L: Schulen 9 · M: Modell (Ritter/Soldat/2D) · B: Schlagtechnik testen · ESC: Menü',
      'WASD: Laufen · Klick: Angriff · Umschalt: schwer · Rechtsklick: Block · Leer: Rolle · R/T: Waffen-Fähigkeit · 4/5/6: Kettenblitz/Frostnova/Bannkreis',
      'LICHT-TEST (Panel rechts): Variante/Sichtradius/Feuer-Stil/Weichheit  ·  X: Dungeon-Dunkel an/aus  ·  Z: Sonne wandern  ·  < > : Sonnenstand',
      '3D-BAUKASTEN (Menü links, verschiebbar): Objekt wählen + auf den Boden klicken zum Setzen · Klick auf Truhe/Fass öffnet/zerschlägt · Löschen-Modus + Größe -/+',
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
    // 3D-Held: beide Modelle bauen + eine Phaser-Textur, in die das aktive kopiert wird
    const S = DebugArenaScene.H3D;
    this.ritter = new RitterModell(S);
    this.soldat = new Held3DModell(S);
    this.held3dTex = (this.textures.exists('held3d') ? this.textures.get('held3d') : this.textures.createCanvas('held3d', S, S)) as Phaser.Textures.CanvasTexture ?? null;
    // 3D-Objekt-Baukasten + Menü
    this.lager = new Objekt3DLager(this);
    this.baueBauMenu();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.ritter?.destroy(); this.soldat?.destroy(); this.ritter = null; this.soldat = null;
      this.lager?.destroy(); this.lager = null;
      this.bauMenu?.remove(); this.bauMenu = null;
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
    if (k === 'm') {
      this.held3dModus = this.held3dModus === 'ritter' ? 'soldat' : this.held3dModus === 'soldat' ? 'aus' : 'ritter';
      this.logMsg(`Modell: ${this.held3dModus === 'ritter' ? '3D-Ritter (prozedural)' : this.held3dModus === 'soldat' ? '3D-Soldat (geriggt)' : '2D-Sprite'}`);
    }
    if (k === 'b') {
      // Schlagtechnik durchtesten: nächste Technik wählen UND sofort vorführen
      const T = DebugArenaScene.TECHNIKEN;
      const i = this.testTechnik ? (T.indexOf(this.testTechnik) + 1) % (T.length + 1) : 0;
      this.testTechnik = i < T.length ? T[i] : null;
      this.heldSchlagDauer = this.testTechnik === 'spin' ? 0.6 : this.testTechnik === 'overhead' ? 0.45 : 0.35;
      this.heldSchlagT = this.heldSchlagDauer; // Vorführ-Schwung auslösen
      const NAME: Record<Technik, string> = { slash: 'Hieb', overhead: 'Überkopf', thrust: 'Stich', spin: 'Wirbel' };
      this.logMsg(this.testTechnik ? `Test-Technik: ${NAME[this.testTechnik]}` : 'Test-Technik aus (Technik nach Waffe)');
    }
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

  // Schlagtechnik des aktuellen Schwungs (Taste B übersteuert, sonst nach Waffe -
  // an den bekannten Movesets orientiert: Stange = Stich, Hammer = Überkopf, sonst Hieb)
  private aktuelleTechnik(): Technik {
    if (this.testTechnik) return this.testTechnik;
    const cls = this.weaponClass();
    if (cls === 'stange') return 'thrust';
    if (cls === 'wucht') return 'overhead';
    return 'slash';
  }

  // Weltklick im Bau-Modus: setzen / löschen / interagieren (sonst normaler Klick)
  protected override bauKlick(ptr: Phaser.Input.Pointer): boolean {
    if (!this.lager) return false;
    const { x: wx, y: wy } = this.weltPunkt(ptr);
    if (this.bauTyp) { this.lager.platziere(this.bauTyp, wx, wy, this.bauScale); return true; }
    if (this.loeschModus) { this.lager.loescheBei(wx, wy); return true; }
    return this.lager.interagiereBei(wx, wy);
  }

  // Verschiebbares DOM-Baumenü: Objekt wählen -> auf den Boden klicken zum
  // Setzen; Löschen-Modus zum Entfernen; Größe -/+ vor dem Setzen.
  private baueBauMenu(): void {
    const p = document.createElement('div');
    p.style.cssText = 'position:fixed;left:14px;top:120px;width:176px;background:#140f08ee;border:1px solid #4a3a24;border-radius:8px;font-family:Georgia,serif;color:#e8dcc0;font-size:12.5px;box-shadow:0 4px 16px #000a;z-index:50;user-select:none;';
    const kopf = document.createElement('div');
    kopf.textContent = '3D-BAUKASTEN  ⠿';
    kopf.style.cssText = 'padding:7px 10px;background:#241a0c;border-bottom:1px solid #4a3a24;letter-spacing:2px;color:#e6c878;cursor:move;border-radius:8px 8px 0 0;';
    p.appendChild(kopf);
    const body = document.createElement('div'); body.style.cssText = 'padding:8px;display:flex;flex-direction:column;gap:5px;'; p.appendChild(body);
    const btn = (label: string, fn: () => void, parent: HTMLElement = body): HTMLButtonElement => {
      const b = document.createElement('button'); b.textContent = label;
      b.style.cssText = 'font-family:inherit;font-size:12px;color:#e8dcc0;background:#1f1810;border:1px solid #4a3a24;border-radius:5px;padding:5px 8px;cursor:pointer;text-align:left;';
      b.onclick = fn; parent.appendChild(b); return b;
    };
    const setzeAktiv = (aktiv: HTMLButtonElement | null): void => {
      for (const c of Array.from(body.querySelectorAll('button'))) { (c as HTMLElement).style.borderColor = '#4a3a24'; (c as HTMLElement).style.background = '#1f1810'; }
      if (aktiv) { aktiv.style.borderColor = '#f0d060'; aktiv.style.background = '#3a2a12'; }
    };
    for (const name of this.lager!.typen()) {
      const b = btn('▦ ' + name, () => { this.bauTyp = name; this.loeschModus = false; setzeAktiv(b); });
    }
    const zeiger = btn('✋ Zeiger (klicken=öffnen)', () => { this.bauTyp = null; this.loeschModus = false; setzeAktiv(zeiger); });
    const loeschen = btn('✕ Löschen-Modus', () => { this.bauTyp = null; this.loeschModus = true; setzeAktiv(loeschen); });
    btn('⌦ Alle löschen', () => { this.lager?.alleLoeschen(); });
    btn('🔥 WebGPU-Feuer öffnen', () => { window.open('/webgpu_fire.html', '_blank'); });
    const skala = document.createElement('div'); skala.style.cssText = 'display:flex;gap:4px;align-items:center;margin-top:3px;'; body.appendChild(skala);
    const upd = (): void => { if (this.bauScaleLabel) this.bauScaleLabel.textContent = 'Größe ' + this.bauScale.toFixed(2); };
    btn('−', () => { this.bauScale = Math.max(0.15, +(this.bauScale - 0.1).toFixed(2)); upd(); }, skala);
    this.bauScaleLabel = document.createElement('span'); this.bauScaleLabel.style.cssText = 'flex:1;text-align:center;'; skala.appendChild(this.bauScaleLabel); upd();
    btn('+', () => { this.bauScale = Math.min(3, +(this.bauScale + 0.1).toFixed(2)); upd(); }, skala);

    let drag = false, ox = 0, oy = 0;
    kopf.addEventListener('mousedown', (e) => { drag = true; ox = e.clientX - p.offsetLeft; oy = e.clientY - p.offsetTop; e.preventDefault(); });
    window.addEventListener('mousemove', (e) => { if (!drag || !this.bauMenu) return; p.style.left = (e.clientX - ox) + 'px'; p.style.top = (e.clientY - oy) + 'px'; });
    window.addEventListener('mouseup', () => { drag = false; });

    document.body.appendChild(p); this.bauMenu = p;
    setzeAktiv(zeiger);
  }

  // Helden-Render umlenken: das aktive 3D-Modell (Ritter oder Soldat) wird in
  // die 'held3d'-Textur gerendert und als Helden-Sprite gesetzt; im Modus 'aus'
  // das normale 2D-Bild (Taste M wechselt das Modell).
  protected override zeichneHeld(dir: number, step: number): void {
    const aktiv = this.held3dModus === 'ritter' ? this.ritter : this.held3dModus === 'soldat' ? this.soldat : null;
    if (!aktiv || !aktiv.bereit || !this.held3dTex) {
      this.playerSprite.setOrigin(0.5, 0.5);
      super.zeichneHeld(dir, step);
      return;
    }
    const now = this.time.now;
    const dt = this.h3dZeit ? Math.min(0.05, (now - this.h3dZeit) / 1000) : 0.016;
    this.h3dZeit = now;
    const moving = Math.hypot(this.px - this.h3dPx, this.py - this.h3dPy) > 0.4;
    this.h3dPx = this.px; this.h3dPy = this.py;
    // Schlag-Fortschritt aus der ECHTEN Angriffszeit -> synchron zur Trefferprüfung
    const swing = this.heldSchlagT > 0 ? 1 - this.heldSchlagT / Math.max(0.001, this.heldSchlagDauer) : -1;
    aktiv.update(dt, this.pdir, moving, swing, this.aktuelleTechnik());
    const ctx = this.held3dTex.getContext();
    const S = DebugArenaScene.H3D;
    ctx.clearRect(0, 0, S, S);
    ctx.drawImage(aktiv.canvas, 0, 0);
    this.held3dTex.refresh();
    this.playerSprite.setTexture('held3d').setOrigin(0.5, 0.6).setScale(0.28).clearTint();
  }

  update(_time: number, delta: number): void {
    this.updateCombat(delta / 1000);
    this.renderDebug();
    this.lager?.update(delta / 1000);   // platzierte 3D-Objekte animieren (Truhe auf, Fass zerbricht)
    // Schatten über den geteilten Manager: Fackel = Dungeon-Raycasting, sonst Sonne.
    if (this.sonneAuto) this.sonnenWinkel = (this.sonnenWinkel + 0.00003 * delta) % 1;
    const st = getSettings().schatten / 100;   // Leistungs-/Stärke-Regler
    const dyn = this.dynamischeOccl();
    // Dungeon-Licht über die gewählte Variante (Sichtradius/Wandfackeln), sonst
    // Sonne (Projektion ODER Raycaster, je nach Werkbank-Einstellung).
    const lic = getSettings().licht;
    this.schatten.feuerNeu = lic.feuerNeu;
    if (this.fackelAn) this.schatten.lichter(this.baueLichter(), dyn, st);
    else if (lic.sonneRaycast) this.schatten.sonneRaycast(this.sonnenWinkel, dyn, st, lic.sonneKegel, lic.weichheit);
    else this.schatten.sonne(this.sonnenWinkel, dyn, st);
    this.lichtPanel.update();
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
    // Dieselbe Licht-Werkbank wie im Hauptspiel - in der Arena gleich offen.
    this.lichtPanel = new LichtPanel(this, this.scale.width - 300, 80);
    this.lichtPanel.setVisible(true);
  }

  // Wandfackel-Halter (Stab + eiserner Korb); die Flamme sitzt am Punkt (x,y).
  private zeichneFackelHalter(x: number, y: number): void {
    this.add.rectangle(x, y + 13, 5, 22, 0x5a4228).setDepth(y).setStrokeStyle(1, 0x2e2014);  // Holzstab
    this.add.rectangle(x, y + 4, 9, 4, 0x3a3a40).setDepth(y + 0.1);                            // Eisenband
    this.add.ellipse(x, y, 12, 7, 0x2a221a).setDepth(y + 0.1);                                 // Korb/Glutbett
    this.add.ellipse(x, y - 1, 7, 4, 0x6a2a10).setDepth(y + 0.2);                              // Glut
  }

  protected override zeigerAufUI(p: Phaser.Input.Pointer): boolean { return !!this.lichtPanel?.trifft(p.x, p.y); }

  // Dynamische Verdecker (Held + Gegner) je Frame - werfen auch Schatten.
  private dynamischeOccl(): Occluder[] {
    const d: Occluder[] = [{ x: this.px, y: this.py + 10, w: 16, h: 8, hoehe: 26 }];
    for (const e of this.enemies) if (e.sprite) d.push({ x: e.x, y: e.y + 8, w: 15, h: 8, hoehe: 22 });
    return d;
  }

  // Lichter der gewählten Variante zusammenstellen (aus den persistenten
  // Einstellungen settings.licht - dieselben Werte wie das Hauptspiel-Panel).
  private baueLichter(): Licht[] {
    const L = getSettings().licht;
    const weich = L.weichheit / 100;
    const sicht: Licht = { x: this.px, y: this.py - 6, art: 'sicht', radius: L.sichtRadius };
    const fackel = (i: number, r = 240): Licht => ({ x: this.fackeln[i].x, y: this.fackeln[i].y, art: 'fackel', radius: r, weich });
    const mitSicht = (arr: Licht[]): Licht[] => L.heldLichtAn ? [...arr, sicht] : arr;
    switch (L.variante) {
      case 0: return L.heldLichtAn ? [sicht] : [];                          // Nur Sichtradius
      case 1: return [fackel(0)];                                           // Nur Wandfackel
      case 2: return mitSicht([fackel(0)]);                                 // Wandfackel + Sicht
      case 3: return mitSicht([fackel(0), fackel(1), fackel(2)]);           // Mehrere Fackeln + Sicht
      case 4: return [{ x: this.px, y: this.py - 6, art: 'fackel', radius: Math.max(150, L.sichtRadius), weich }]; // Licht am Helden (alt)
      default: return mitSicht([fackel(0)]);
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
