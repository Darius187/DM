// Gegner-Entität mit KI - portiert aus der Referenz (update/bossAI/makeElite),
// erweitert um Telegraph-Werte aus dem Masterprompt und Haltungsbruch.

import Phaser from 'phaser';
import { ENEMIES, ELITE, ENEMY_AI, AGGRO, AGGRO_STD, BOSS, kampfTiefe } from '../data/enemies';
import type { EnemyTypeId, EliteAffix } from '../data/types';
import { BOSS_TEXTE } from '../data/texte';
import type { Rng } from '../logic/rng';
import { rnd, pick } from '../logic/rng';
import type { Dir } from '../gfx/fallbackArt';
import { TUNING } from '../logic/tuning';
import { PHYSIK } from '../data/kampf';

export interface EnemyHost {
  isSolidAt(x: number, y: number): boolean;
  playerX(): number;
  playerY(): number;
  playerR(): number;
  playerDir(): number; // Blickrichtung des Spielers (rad) für die Flanken-KI
  playerTot(): boolean; // tot: Gegner scharen sich um die Leiche statt anzugreifen
  enemyMeleeHit(e: Enemy, dmg: number): void;
  spawnEnemyProjectile(x: number, y: number, vx: number, vy: number, dmg: number, col: string, pfeil?: boolean): void;
  addTelegraph(x: number, y: number, r: number, t: number, dmg: number): void;
  summonAdds(e: Enemy, n: number): void;
  logMsg(text: string, cls?: string): void;
  playSound(name: string, volMult?: number): void;
  burstFx(x: number, y: number, col: number, n: number, spd: number): void;
  // Rudel-Verhalten (Runde 27): wie viele Verbündete stehen nahe bei e?
  verbuendeteNahe(e: Enemy, radius: number): number;
  // Begegnungs-Ruf (Runde 32): erster Sichtkontakt, gedrosselt
  begegnungsRuf(e: Enemy): void;
}

// Angriffsmuster je Gegnertyp (Masterprompt 4.3: 2-3 Muster, Telegraph 0,35-0,85 s)
interface AttackPattern {
  id: 'hieb' | 'doppelhieb' | 'giftwolke' | 'blinkschlag' | 'sprung';
  windup: number;
  weight: number;
}
const PATTERNS: Partial<Record<EnemyTypeId, AttackPattern[]>> = {
  pest: [
    { id: 'hieb', windup: 0.45, weight: 3 },
    { id: 'giftwolke', windup: 0.85, weight: 1 },
  ],
  skelett: [
    { id: 'hieb', windup: 0.36, weight: 3 },
    { id: 'doppelhieb', windup: 0.5, weight: 1 },
  ],
  schuetze: [
    { id: 'hieb', windup: 0.35, weight: 1 },
  ],
  schatten: [
    { id: 'hieb', windup: 0.35, weight: 3 },
    { id: 'blinkschlag', windup: 0.55, weight: 1 },
  ],
  wolf: [
    { id: 'hieb', windup: 0.35, weight: 2 },
    { id: 'sprung', windup: 0.6, weight: 1 },
  ],
  ratte: [
    { id: 'hieb', windup: 0.35, weight: 1 },
  ],
  lebender_toter: [
    { id: 'hieb', windup: 0.42, weight: 3 },
    { id: 'doppelhieb', windup: 0.55, weight: 1 },
  ],
};

// Positions-Audio je Typ (Hören vor Sehen, Masterprompt 4.3)
const AMBIENT_SOUND: Partial<Record<EnemyTypeId, string>> = {
  pest: 'pest_stoehnen',
  skelett: 'skelett_klappern',
  schuetze: 'skelett_klappern',
  schatten: 'schatten_fluestern',
  templer: 'templer_stimme',
  wolf: 'wolf',
};

let nextId = 1;

export class Enemy {
  id = nextId++;
  type: EnemyTypeId;
  name: string;
  x: number;
  y: number;
  r: number;
  col: string;
  hp: number;
  maxhp: number;
  dmg: number;
  speed: number;
  xp: number;
  aggro: number;
  ranged: boolean;
  boss: boolean;
  elite = false;
  affix: EliteAffix | null = null;
  depth: number;

  atkCd: number;
  shootCd: number;
  windup = 0;
  stun = 0;
  slowT = 0;
  hitFlash = 0;
  wobble: number;
  dir: Dir = 0;
  step = 0;
  stepT = 0;
  markedT = 0; // Markierter Tod (Bogen Stufe 9)
  banishedT = 0; // Bannkreis schwächt Untote
  schlagtempoF = 1; // Per-Typ-Schlagtempo (F10, beim Spawn gesetzt)
  reichweiteF = 1;  // Per-Typ-Hiebreichweite (F10, beim Spawn gesetzt)
  kvx = 0; kvy = 0; // Physik-Rückstoß-Geschwindigkeit (Runde 36, Physik-Test)
  // Steckende Pfeile (Runde 40, Physik-Test): bleiben im Körper, bis er fällt.
  // rx/ry = Versatz vom Mittelpunkt (wandert mit), ang = Einschlagwinkel.
  steckPfeile?: Array<{ rx: number; ry: number; ang: number }>;
  private pattern: AttackPattern['id'] = 'hieb';
  private secondHitT = 0;   // Doppelhieb: zweiter Schlag
  private lungeT = 0;       // Sprungangriff: Restflugzeit
  private lungeVx = 0;
  private lungeVy = 0;
  private ambientT = Math.random() * 3 + 1;
  // Gruppen-KI (Feedback-Runde 1): jeder nähert sich aus eigenem Winkel,
  // umkreist den Spieler während der eigenen Erholzeit und weicht nach
  // einem Schlag zurück - so wird man umzingelt statt angerempelt.
  private flankAng = (Math.random() - 0.5) * 2.2;
  private orbitDir = Math.random() < 0.5 ? 1 : -1;
  private retreatT = 0;
  // Rolle (Runde 35): 'flanke' umläuft den Spieler und greift von HINTEN an,
  // 'front' bindet vorn (Tanks/Schildträger). Im Konstruktor je Typ gesetzt.
  rolle: 'front' | 'flanke' = 'front';
  champion = false;
  versteckt = false;
  // Schildträger (Runde 11): blockt Treffer von vorn, weicht nicht zurück
  schild = false;
  // Kampfbewusst (Runde 38): Monster gehen kurz in Deckung und parieren statt
  // wegzuweichen - echter Schlagabtausch. Tiere (Wolf/Ratte) nicht.
  kampfbewusst = false;
  // Festhäng-Erkennung (Runde 38): kommt der Gegner trotz Annäherung kaum vom
  // Fleck, schlägt er einen Bogen statt stur gegen das Hindernis zu drücken.
  private letztX = 0;
  private letztY = 0;
  private hängtT = 0;
  private umwegT = 0;
  // Bewaffnete Gefallene (Runde 35): sichtbare Waffen-Figur + Magie-Geschoss
  figurName?: string;
  magie = false;
  // Sichtbarer Figurname (mit Waffe, falls "Gefallener"), sonst der Typ
  figur(): string { return this.figurName ?? this.type; }
  // Schild-Haltung (Runde 20): kurz volle Frontdeckung, dann wieder offen
  blockT = 0;
  private steuerWinkel = 0;  // gewählte Ausweichdrehung am Hindernis
  private begegnet = false;  // Begegnungs-Ruf nur beim ersten Sichtkontakt
  private mutT = -1;         // > 0: sammelt sich noch, stürmt nicht allein
  private blockCd = 2 + Math.random() * 2;

  // bei Treffern zurückweichen (Feedback-Runde 2)
  onHurt(): void {
    if (this.boss) return;
    // Runde 35: beim Treffer nur noch SELTEN zurückzucken (vorher 0,7 für
    // flinke Typen - man konnte sie folgenlos abschnetzeln). Richtet sich
    // nach dem Aggressions-Profil; Pest/Lebende Tote zucken so gut wie nie.
    if (Math.random() < (AGGRO[this.type] ?? AGGRO_STD).rueckzugChance * 0.7) {
      this.retreatT = ENEMY_AI.rueckzugDauer + Math.random() * 0.14;
      this.orbitDir = Math.random() < 0.5 ? 1 : -1;
    }
  }

  // Boss-Zustand
  private slamCd: number = BOSS.slamCd;
  private fanCd: number = BOSS.fanCd;
  private chargeCd = 4;
  private phase3Aktiv = false;
  private summoned = [false, false];

  sprite: Phaser.GameObjects.Sprite | null = null;

  constructor(type: EnemyTypeId, depth: number, x: number, y: number, rng: Rng) {
    const def = ENEMIES[type];
    this.type = type;
    this.depth = depth;
    this.x = x;
    this.y = y;
    this.r = def.r;
    this.col = def.col;
    // Endlose Tiefe: ab Ebene 7 gedämpft, sonst unspielbar (Runde 28)
    const kt = kampfTiefe(depth);
    this.maxhp = Math.round(def.hpBase + def.hpPerDepth * kt);
    this.hp = this.maxhp;
    this.dmg = Math.round(def.dmgBase + def.dmgPerDepth * kt);
    this.speed = rnd(rng, def.speedMin, def.speedMax);
    this.xp = def.xpBase + def.xpPerDepth * depth;
    this.aggro = def.aggro;
    this.ranged = def.ranged ?? false;
    this.boss = def.boss ?? false;
    this.name = def.name;
    // Rolle (Runde 35): flinke, leichte Gegner umlaufen den Spieler und fallen
    // von hinten an; Pest/Lebende Tote drängen stur von vorn. Schildträger
    // werden später (beim Spawn) ohnehin auf 'front' gesetzt.
    const flinkTyp = type === 'schatten' || type === 'wolf' || type === 'ratte';
    this.rolle = flinkTyp || (type === 'skelett' && Math.random() < 0.5) ? 'flanke' : 'front';
    // Monster sind kampfbewusst (parieren), Tiere und Fernkämpfer nicht.
    const tier = type === 'wolf' || type === 'ratte';
    this.kampfbewusst = !tier && !this.ranged;
    this.letztX = x; this.letztY = y;
    this.atkCd = rnd(rng, 0, 1);
    this.shootCd = rnd(rng, 0, 1.5);
    this.wobble = rnd(rng, 0, 6.28);
  }

  makeElite(rng: Rng): this {
    this.elite = true;
    this.affix = pick(rng, ELITE.affixes);
    this.r = Math.round(this.r * ELITE.rMult);
    this.maxhp = Math.round(this.maxhp * ELITE.hpMult);
    this.hp = this.maxhp;
    this.dmg = Math.round(this.dmg * ELITE.dmgMult);
    this.xp = Math.round(this.xp * ELITE.xpMult);
    if (this.affix === 'Schnell') this.speed *= ELITE.fastSpeedMult;
    // Sichtbare Färbung je Affix, damit man die Gefahr lesen kann
    if (this.affix === 'Feurig') this.col = '#c25a2a';
    if (this.affix === 'Teilend') this.col = '#7aa83a';
    this.name = `${this.name} · ${this.affix}`;
    return this;
  }

  moveBody(host: EnemyHost, dx: number, dy: number): void {
    const r = this.r;
    const nx = this.x + dx;
    if (!host.isSolidAt(nx - r, this.y - r) && !host.isSolidAt(nx + r, this.y - r)
      && !host.isSolidAt(nx - r, this.y + r) && !host.isSolidAt(nx + r, this.y + r)) this.x = nx;
    const ny = this.y + dy;
    if (!host.isSolidAt(this.x - r, ny - r) && !host.isSolidAt(this.x + r, ny - r)
      && !host.isSolidAt(this.x - r, ny + r) && !host.isSolidAt(this.x + r, ny + r)) this.y = ny;
  }

  hasLineOfSight(host: EnemyHost): boolean {
    const steps = 14;
    const px = host.playerX(), py = host.playerY();
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (host.isSolidAt(this.x + (px - this.x) * t, this.y + (py - this.y) * t)) return false;
    }
    return true;
  }

  update(host: EnemyHost, dt: number): void {
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.shootCd = Math.max(0, this.shootCd - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.slowT = Math.max(0, this.slowT - dt);
    this.markedT = Math.max(0, this.markedT - dt);
    this.banishedT = Math.max(0, this.banishedT - dt);
    this.wobble += dt * 4;

    const px = host.playerX(), py = host.playerY();
    const d = Math.hypot(px - this.x, py - this.y);
    // Blickrichtung für das Sprite
    const ang = Math.atan2(py - this.y, px - this.x);
    this.dir = angleToDir(ang);

    // Physik-Rückstoß (Runde 36, nur im Physik-Test): weggeschleudert gleitet
    // und prallt der Gegner, bevor die KI wieder übernimmt. Bosse bleiben fest.
    if (TUNING.physikTest && !this.boss && (Math.abs(this.kvx) > 8 || Math.abs(this.kvy) > 8)) {
      this.moveBody(host, this.kvx * dt, this.kvy * dt);
      this.kvx *= PHYSIK.gegnerReibung;
      this.kvy *= PHYSIK.gegnerReibung;
      this.advanceStep(dt);
      return;
    }

    if (this.boss) {
      this.bossAI(host, dt, d);
      return;
    }
    if (this.stun > 0) {
      this.stun -= dt;
      return;
    }
    // Spieler tot: nicht mehr angreifen, sondern sich im Kreis um die Leiche
    // scharen und über sie herfallen (Runde 35).
    if (host.playerTot()) {
      this.gatherCorpse(host, dt, d, ang);
      return;
    }
    // Deckung/Parade (Runde 38): Schildträger UND kampfbewusste Monster gehen
    // nahe am Spieler kurz in Deckung und parieren - Schildträger öfter/länger,
    // Monster seltener/kürzer. Statt zurückzuweichen ein echter Schlagabtausch.
    if (this.schild || this.kampfbewusst) {
      this.blockT = Math.max(0, this.blockT - dt);
      this.blockCd = Math.max(0, this.blockCd - dt);
      const nahGenug = d < this.r + host.playerR() + 26 * (TUNING.gegnerReichweite * this.reichweiteF);
      if (this.blockCd === 0 && nahGenug && this.blockT === 0 && TUNING.gegnerCleverness >= 0.5) {
        this.blockT = this.schild ? 0.9 + Math.random() * 0.5 : 0.4 + Math.random() * 0.3;
        this.blockCd = this.schild ? 2.5 + Math.random() * 2 : 3.2 + Math.random() * 2.6;
      }
      if (this.blockT > 0) {
        // Deckung läuft ab und der Spieler steht dran: Gegenstoß (Runde 27)
        if (this.blockT <= dt * 2 && nahGenug && this.windup <= 0 && TUNING.gegnerCleverness >= 0.5) {
          this.startPattern(host, 'hieb', 0.2);
        }
        return; // in Deckung: stehen, nicht angreifen
      }
    }
    // Doppelhieb: zweiter Schlag kurz nach dem ersten
    if (this.secondHitT > 0) {
      this.secondHitT -= dt;
      if (this.secondHitT <= 0 && d < this.r + host.playerR() + 20 * (TUNING.gegnerReichweite * this.reichweiteF)) {
        host.enemyMeleeHit(this, Math.round(this.dmg * 0.7));
      }
    }
    // Sprungangriff: fliegt auf den Spieler zu, Kontakt verletzt
    if (this.lungeT > 0) {
      this.lungeT -= dt;
      this.moveBody(host, this.lungeVx * dt, this.lungeVy * dt);
      if (d < this.r + host.playerR() + 4) {
        this.lungeT = 0;
        host.enemyMeleeHit(this, Math.round(this.dmg * 1.2));
      }
      return;
    }
    if (this.windup > 0) {
      this.windup -= dt;
      if (this.windup <= 0) this.executePattern(host, d);
      return;
    }
    if (d > this.aggro) {
      this.ambientSound(host, d, dt);
      return;
    }
    if (!this.begegnet) {
      this.begegnet = true;
      host.begegnungsRuf(this);
    }

    const slowF = this.slowT > 0 ? ENEMY_AI.slowFactorEis : 1;
    if (this.ranged && d < ENEMY_AI.rangedMaxShoot && d > ENEMY_AI.rangedMinShoot && this.hasLineOfSight(host)) {
      if (this.shootCd === 0) {
        this.shootCd = ENEMY_AI.rangedShootCd;
        const a = ang + (Math.random() * 0.12 - 0.06);
        // Zauberstab-Gefallene schleudern ein violettes Arkangeschoss statt Pfeil
        host.spawnEnemyProjectile(this.x, this.y, Math.cos(a) * ENEMY_AI.rangedProjSpeed, Math.sin(a) * ENEMY_AI.rangedProjSpeed, this.dmg, this.magie ? '#b06ae8' : '#cfc4a8', !this.magie);
        host.playSound(this.magie ? 'fireball1' : 'pfeil_schuss');
      }
      if (d < ENEMY_AI.rangedKeepDist) {
        this.moveBody(host, -Math.cos(ang) * this.speed * 0.6 * slowF * dt, -Math.sin(ang) * this.speed * 0.6 * slowF * dt);
        this.advanceStep(dt);
      }
    } else if (this.retreatT > 0) {
      // Rückzug nach dem eigenen Schlag - aber nicht folgenlos (Runde 27):
      // wer nachsetzt, kassiert einen schnellen Gegenhieb, und gewichen
      // wird SCHRÄG statt stur rückwärts (seitlich raus, neuer Winkel)
      this.retreatT -= dt;
      // wer den Spieler noch in Reichweite hat, dreht meist um und schlägt zu
      // (Runde 35: vorher 0,6 - Gegner liefen oft folgenlos weg)
      if (d < this.r + host.playerR() + 20 * (TUNING.gegnerReichweite * this.reichweiteF) && this.windup <= 0
        && Math.random() < ENEMY_AI.konterChance * TUNING.gegnerCleverness) {
        this.retreatT = 0;
        this.atkCd = Math.max(this.atkCd, 0.1);
        this.startPattern(host, 'hieb', 0.18);
        return;
      }
      const rw = ang + Math.PI + this.orbitDir * 0.7;
      this.moveBody(host, Math.cos(rw) * this.speed * 0.85 * slowF * dt, Math.sin(rw) * this.speed * 0.85 * slowF * dt);
      this.advanceStep(dt);
    } else if (d > this.r + host.playerR() + 6 + 14 * ((TUNING.gegnerReichweite * this.reichweiteF) - 1)) {
      // Festhäng-Erkennung (Runde 38/39): kam der Gegner in ~0,25 s trotz
      // Annäherung kaum vom Fleck (Regal/Ecke), schlägt er einen Bogen - und
      // zwar zur tatsächlich FREIEN Seite (sonst drückt er weiter ins Hindernis).
      this.hängtT += dt;
      if (this.hängtT > 0.25) {
        if (Math.hypot(this.x - this.letztX, this.y - this.letztY) < 2 && this.umwegT <= 0) {
          this.umwegT = 0.8;
          this.steuerWinkel = 0;
          const probe = this.r + 16;
          const frei = (a: number) => !host.isSolidAt(this.x + Math.cos(a) * probe, this.y + Math.sin(a) * probe);
          const freiL = frei(ang + 1.6), freiR = frei(ang - 1.6);
          this.orbitDir = freiL && !freiR ? 1 : freiR && !freiL ? -1 : -this.orbitDir; // freie Seite, sonst umkehren
        }
        this.letztX = this.x; this.letztY = this.y; this.hängtT = 0;
      }
      // Wolf darf den Sprung auch aus kurzer Distanz ansetzen
      if (this.type === 'wolf' && d < 120 && d > 50 && this.atkCd === 0 && Math.random() < 0.4) {
        this.startPattern(host, 'sprung');
        return;
      }
      // Sammeln statt einzeln anrennen (Runde 27): Skelette und Pestopfer
      // warten in Sichtweite kurz auf Verbündete - kommt Verstärkung in die
      // Nähe, stürmen alle gemeinsam
      if (TUNING.gegnerCleverness >= 0.5 && this.type === 'skelett' && d < 160 && d > 80) {
        if (this.mutT < 0) this.mutT = ENEMY_AI.sammelnMin + Math.random() * ENEMY_AI.sammelnSpanne;
        if (this.mutT > 0) {
          if (host.verbuendeteNahe(this, 150) >= ENEMY_AI.sammelnAb) this.mutT = 0;
          else {
            this.mutT -= dt;
            const oa2 = ang + this.orbitDir * 1.5;
            this.moveBody(host, Math.cos(oa2) * this.speed * 0.45 * slowF * dt, Math.sin(oa2) * this.speed * 0.45 * slowF * dt);
            this.advanceStep(dt);
            return;
          }
        }
      }
      if (this.umwegT > 0) {
        // hängt am Hindernis: ENTSCHLOSSEN seitlich ausweichen (direkt, damit
        // laufe() nicht zurück ins Hindernis dreht) - moveBody gleitet eh an
        // Wänden entlang. Runde 39.
        this.umwegT -= dt;
        const seit = ang + this.orbitDir * 1.45;
        this.moveBody(host, Math.cos(seit) * this.speed * slowF * dt, Math.sin(seit) * this.speed * slowF * dt);
      } else if (this.atkCd > 0 && d < 110) {
        // Erholzeit: nicht anstehen, sondern den Spieler umkreisen
        const oa = ang + this.orbitDir * 1.45;
        this.moveBody(host, Math.cos(oa) * this.speed * 0.55 * slowF * dt, Math.sin(oa) * this.speed * 0.55 * slowF * dt);
      } else if (this.rolle === 'flanke' && d < 230) {
        // Flanke (Runde 35): zur RÜCKSEITE des Spielers laufen und von hinten
        // angreifen - umläuft ihn, während die Tanks vorne binden.
        const pd = host.playerDir();
        const rx = px + Math.cos(pd + Math.PI) * (host.playerR() + this.r + 6);
        const ry = py + Math.sin(pd + Math.PI) * (host.playerR() + this.r + 6);
        this.laufe(host, Math.atan2(ry - this.y, rx - this.x), this.speed * slowF, dt);
      } else {
        // Annäherung versetzt aus dem eigenen Flankenwinkel -> Umzingeln;
        // laufe() umgeht dabei Hindernisse, statt dagegen zu rennen
        const fade = Math.min(1, Math.max(0, (d - 50) / 160));
        const fa = ang + this.flankAng * fade;
        this.laufe(host, fa, this.speed * slowF, dt);
      }
      this.advanceStep(dt);
    } else if (this.atkCd === 0) {
      this.choosePattern(host);
    }
  }

  // Hindernis-Umgehung (Runde 27): ist der direkte Weg versperrt, dreht
  // der Gegner schrittweise ab und folgt der Wand, statt dagegenzulaufen.
  // Die gewählte Drehrichtung bleibt, bis der Weg wieder frei ist.
  private laufe(host: EnemyHost, ang: number, tempo: number, dt: number): void {
    const probe = this.r + 14;
    const frei = (a: number) => !host.isSolidAt(this.x + Math.cos(a) * probe, this.y + Math.sin(a) * probe);
    let ziel = ang;
    if (!frei(ang)) {
      const drehungen = this.steuerWinkel !== 0
        ? [this.steuerWinkel, -this.steuerWinkel, this.steuerWinkel * 2, -this.steuerWinkel * 2]
        : (Math.random() < 0.5 ? [0.8, -0.8, 1.6, -1.6] : [-0.8, 0.8, -1.6, 1.6]);
      for (const dr of drehungen) {
        if (frei(ang + dr)) {
          ziel = ang + dr;
          this.steuerWinkel = dr;
          break;
        }
      }
    } else {
      this.steuerWinkel = 0;
    }
    this.moveBody(host, Math.cos(ziel) * tempo * dt, Math.sin(ziel) * tempo * dt);
  }

  // Vorstoß zum Spieler beim Schlag (Runde 39): schließt die Lücke eines
  // Rückschritts - aber nur bis zum Kontakt, nicht durch den Spieler hindurch.
  private lungeIn(host: EnemyHost, px: number, py: number, dist: number): void {
    const dx = px - this.x, dy = py - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const ziel = Math.min(dist, Math.max(0, d - (this.r + host.playerR()) + 6));
    if (ziel > 0.5) this.moveBody(host, (dx / d) * ziel, (dy / d) * ziel);
  }

  // Über die Leiche herfallen (Runde 35): an die Leiche heran, dann langsam
  // im Kreis darum scharren und gelegentlich daran "fressen" (Blutspritzer).
  private gatherCorpse(host: EnemyHost, dt: number, d: number, ang: number): void {
    const ring = host.playerR() + this.r + 5;
    if (d > ring + 6) {
      this.laufe(host, ang, this.speed * 0.7, dt);
    } else {
      const oa = ang + this.orbitDir * 1.5;
      this.moveBody(host, Math.cos(oa) * this.speed * 0.28 * dt, Math.sin(oa) * this.speed * 0.28 * dt);
      if (Math.random() < dt * 0.6) host.burstFx(host.playerX(), host.playerY() - 2, 0x7a1010, 3, 55);
    }
    this.advanceStep(dt);
  }

  private choosePattern(host: EnemyHost): void {
    const list = PATTERNS[this.type] ?? [{ id: 'hieb' as const, windup: ENEMY_AI.meleeWindup, weight: 1 }];
    let total = 0;
    for (const p of list) total += p.weight;
    let roll = Math.random() * total;
    let chosen = list[0];
    for (const p of list) {
      roll -= p.weight;
      if (roll <= 0) { chosen = p; break; }
    }
    this.startPattern(host, chosen.id, chosen.windup);
  }

  private startPattern(host: EnemyHost, id: AttackPattern['id'], windup?: number): void {
    const def = (PATTERNS[this.type] ?? []).find((p) => p.id === id);
    this.pattern = id;
    // Schlagtempo-Regler (F10, Runde 27): höher = kürzeres Ausholen,
    // kürzere Pausen zwischen den Hieben
    this.windup = (windup ?? def?.windup ?? ENEMY_AI.meleeWindup) / (TUNING.gegnerSchlagtempo * this.schlagtempoF);
    this.atkCd = (ENEMY_AI.meleeAtkCd + (id === 'hieb' ? 0 : 0.6)) / (TUNING.gegnerSchlagtempo * this.schlagtempoF);
    host.playSound('telegraph', 0.7);
  }

  private executePattern(host: EnemyHost, _d: number): void {
    const px = host.playerX(), py = host.playerY();
    const ang = Math.atan2(py - this.y, px - this.x);
    switch (this.pattern) {
      case 'hieb': {
        // Vorstoß in den Schlag (Runde 39): der Gegner setzt mit dem Hieb NACH,
        // damit ein simpler Schritt zurück nicht reicht - man muss rollen oder
        // seitlich ausweichen. Macht jeden Gegner bedrohlich (Duell-Gefühl).
        this.lungeIn(host, px, py, 26);
        const d2 = Math.hypot(px - this.x, py - this.y);
        if (d2 < this.r + host.playerR() + 16 * (TUNING.gegnerReichweite * this.reichweiteF)) host.enemyMeleeHit(this, Math.round(this.dmg * (0.8 + Math.random() * 0.35)));
        if (Math.random() < (AGGRO[this.type] ?? AGGRO_STD).rueckzugChance) {
          this.retreatT = ENEMY_AI.rueckzugDauer + Math.random() * 0.18;
          this.orbitDir = Math.random() < 0.5 ? 1 : -1;
        }
        break;
      }
      case 'doppelhieb':
        this.lungeIn(host, px, py, 22);
        if (Math.hypot(px - this.x, py - this.y) < this.r + host.playerR() + 18 * (TUNING.gegnerReichweite * this.reichweiteF)) host.enemyMeleeHit(this, Math.round(this.dmg * 0.7));
        this.secondHitT = 0.25;
        break;
      case 'giftwolke':
        // Pestopfer entlädt eine fauligen Schwaden um sich selbst
        host.addTelegraph(this.x, this.y, 56, 0.5, Math.round(this.dmg * 1.1));
        host.burstFx(this.x, this.y, 0x6a8a3a, 12, 90);
        host.playSound('pest_stoehnen');
        break;
      case 'blinkschlag': {
        // Grabschatten erscheint hinter dem Spieler und schlägt sofort wieder aus
        host.burstFx(this.x, this.y, 0xb06ae8, 12, 140);
        const behind = Math.atan2(this.y - py, this.x - px) + Math.PI;
        const nx = px + Math.cos(behind) * 34;
        const ny = py + Math.sin(behind) * 34;
        if (!host.isSolidAt(nx, ny)) {
          this.x = nx;
          this.y = ny;
        }
        host.burstFx(this.x, this.y, 0xb06ae8, 12, 140);
        host.playSound('schatten_fluestern');
        this.pattern = 'hieb';
        this.windup = 0.25;
        break;
      }
      case 'sprung':
        this.lungeT = 0.35;
        this.lungeVx = Math.cos(ang) * 330;
        this.lungeVy = Math.sin(ang) * 330;
        host.playSound('wolf');
        break;
    }
  }

  // Hören vor Sehen: ab ~1,5-facher Aggro-Reichweite leise hörbar
  private ambientSound(host: EnemyHost, d: number, dt: number): void {
    if (d > this.aggro * 1.5) return;
    this.ambientT -= dt;
    if (this.ambientT > 0) return;
    this.ambientT = 2.5 + Math.random() * 3;
    const snd = AMBIENT_SOUND[this.type];
    if (snd) host.playSound(snd, Math.max(0.15, 1 - d / (this.aggro * 1.5)) * 0.6);
  }

  private bossAI(host: EnemyHost, dt: number, d: number): void {
    this.slamCd = Math.max(0, this.slamCd - dt);
    this.fanCd = Math.max(0, this.fanCd - dt);
    if (this.windup > 0) {
      this.windup -= dt;
      if (this.windup <= 0) {
        if (this.pattern === 'sprung') {
          // Ansturm startet: hohe Geschwindigkeit auf die Spielerposition
          this.pattern = 'hieb';
          const a2 = Math.atan2(host.playerY() - this.y, host.playerX() - this.x);
          this.lungeT = 0.7;
          this.lungeVx = Math.cos(a2) * 520;
          this.lungeVy = Math.sin(a2) * 520;
        } else if (d < this.r + host.playerR() + BOSS.meleeRange * (TUNING.gegnerReichweite * this.reichweiteF)) {
          host.enemyMeleeHit(this, Math.round(this.dmg * (0.85 + Math.random() * 0.25)));
        }
      }
      return;
    }
    const phase2 = this.hp < this.maxhp * BOSS.phase2HpPct;
    // Phase 3 (Feedback-Runde 4): unter 25% eskaliert der Ritter -
    // Ansage, Beschwörungswelle, dauerhaft schneller und dichterer Takt
    const phase3 = this.hp < this.maxhp * 0.25;
    if (phase3 && !this.phase3Aktiv) {
      this.phase3Aktiv = true;
      host.logMsg('»GENUG! Das Grab verschlingt euch alle!«', 'bad');
      host.burstFx(this.x, this.y, 0xc03030, 30, 240);
      host.playSound('templer_stimme');
      host.summonAdds(this, 3);
      this.atkCd = 0;
      this.slamCd = 0;
    }
    const spd = this.speed * (phase3 ? 1.6 : phase2 ? BOSS.phase2SpeedMult : 1);
    if (!this.summoned[0] && this.hp < this.maxhp * BOSS.summonAt[0]) {
      this.summoned[0] = true;
      host.logMsg(BOSS_TEXTE.beschwoerung, 'bad');
      host.summonAdds(this, BOSS.summonCounts[0]);
    }
    if (!this.summoned[1] && this.hp < this.maxhp * BOSS.summonAt[1]) {
      this.summoned[1] = true;
      host.logMsg(BOSS_TEXTE.beschwoerung, 'bad');
      host.summonAdds(this, BOSS.summonCounts[1]);
    }
    const px = host.playerX(), py = host.playerY();
    const ang = Math.atan2(py - this.y, px - this.x);
    // Ansturm: kurzes Aufbäumen, dann prescht der Ritter quer durch den Raum
    this.chargeCd = Math.max(0, this.chargeCd - dt);
    if (this.lungeT > 0) {
      this.lungeT -= dt;
      this.moveBody(host, this.lungeVx * dt, this.lungeVy * dt);
      if (d < this.r + host.playerR() + 6) {
        this.lungeT = 0;
        host.enemyMeleeHit(this, Math.round(this.dmg * 1.4));
      }
      return;
    }
    if (this.chargeCd === 0 && d > 140 && d < 480) {
      this.chargeCd = phase3 ? 3.2 : phase2 ? 5 : 7.5;
      this.windup = 0.7;
      this.pattern = 'sprung';
      this.lungeVx = 0;
      host.logMsg('Der Tempelritter senkt die Klinge zum Ansturm!', 'bad');
      host.playSound('templer_stimme');
      return;
    }
    if (d > this.r + host.playerR() + 8) {
      this.moveBody(host, Math.cos(ang) * spd * dt, Math.sin(ang) * spd * dt);
      this.advanceStep(dt);
    } else if (this.atkCd === 0) {
      this.atkCd = BOSS.atkCd;
      this.windup = BOSS.windup;
      host.playSound('templer_stimme');
    }
    if (this.slamCd === 0 && d < BOSS.slamRange) {
      this.slamCd = phase3 ? 1.8 : phase2 ? BOSS.slamCdPhase2 : BOSS.slamCd;
      host.addTelegraph(px, py, BOSS.slamRadius, BOSS.slamTelegraphS, Math.round(this.dmg * BOSS.slamDmgMult));
      host.logMsg(BOSS_TEXTE.ausholen, 'bad');
      host.playSound('telegraph');
    }
    if (phase2 && this.fanCd === 0 && d < BOSS.fanRange) {
      this.fanCd = phase3 ? 1.8 : BOSS.fanCd;
      const half = ((phase3 ? BOSS.fanCount + 2 : BOSS.fanCount) - 1) / 2;
      for (let i = -half; i <= half; i++) {
        const a = ang + i * BOSS.fanSpread;
        host.spawnEnemyProjectile(this.x, this.y, Math.cos(a) * BOSS.fanProjSpeed, Math.sin(a) * BOSS.fanProjSpeed, Math.round(this.dmg * BOSS.fanDmgMult), '#a8e0c0');
      }
      host.playSound('templer_stimme');
    }
  }

  private advanceStep(dt: number): void {
    this.stepT += dt;
    if (this.stepT > 0.14) {
      this.stepT = 0;
      this.step = (this.step + 1) % 4;
    }
  }
}

export function angleToDir(ang: number): Dir {
  const a = Phaser.Math.Angle.Normalize(ang);
  if (a < 0.785 || a >= 5.498) return 2;  // rechts
  if (a < 2.356) return 0;                // unten
  if (a < 3.927) return 1;                // links
  return 3;                               // oben
}
