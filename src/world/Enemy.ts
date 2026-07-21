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
import { PHYSIK, ANGRIFFSSLOTS } from '../data/kampf';
import { MORAL } from '../data/rts';
import { GOLEM } from '../data/golem';
import { SKELETTWACHE } from '../data/skelettwache';

export interface EnemyHost {
  isSolidAt(x: number, y: number): boolean;
  playerX(): number;
  playerY(): number;
  playerR(): number;
  playerDir(): number; // Blickrichtung des Spielers (rad) für die Flanken-KI
  playerTot(): boolean; // tot: Gegner scharen sich um die Leiche statt anzugreifen
  enemyMeleeHit(e: Enemy, dmg: number): void;
  spawnEnemyProjectile(x: number, y: number, vx: number, vy: number, dmg: number, col: string, pfeil?: boolean, vonTeam?: 'spieler' | 'feind', hoch?: boolean): void;
  addTelegraph(x: number, y: number, r: number, t: number, dmg: number): void;
  summonAdds(e: Enemy, n: number): void;
  logMsg(text: string, cls?: string): void;
  playSound(name: string, volMult?: number): void;
  burstFx(x: number, y: number, col: number, n: number, spd: number): void;
  golemSpezial(e: Enemy, art: 'rundum' | 'welle' | 'stampf' | 'zorn'): void;
  skelettwacheRundum(e: Enemy): void;
  // Rudel-Verhalten (Runde 27): wie viele Verbündete stehen nahe bei e?
  verbuendeteNahe(e: Enemy, radius: number): number;
  // Begegnungs-Ruf (Runde 32): erster Sichtkontakt, gedrosselt
  begegnungsRuf(e: Enemy): void;
  // Flussfeld-Wegfindung (Runde 50): Richtung (rad) zum Spieler, die um
  // Hindernisse herum führt; null, wenn kein Feld vorliegt -> direkter Weg.
  wegRichtung(x: number, y: number): number | null;
  // R101 (Autor "eingeschlossene Bogenschuetzen laufen wild statt still zu
  // halten"): liegt ein Flussfeld zum Ziel vor, das von hier KEINEN Weg findet?
  // true = die Einheit ist eingeschlossen -> STEHEN statt an der Wand zu jittern.
  // (Bei wegRichtung===null ohne Feld ist es nur "kein Feld" = offenes Gelaende.)
  wegBlockiert(x: number, y: number): boolean;
  // R101e (Autor-Bug "Krieger findet den Weg um die lange Palisade nicht"):
  // Flussfeld-Richtung zu einem BELIEBIGEN Ziel (Marsch-Befehl/Bresche), damit
  // Einheiten ueber die GANZE Karte um Hindernisse herumfinden - nicht nur beim
  // Kampf-Anlauf. null = kein Feld/kein Weg -> direkter Anlauf (greedy laufe).
  wegRichtungZiel(x: number, y: number, zielX: number, zielY: number): number | null;
}

// Angriffsmuster je Gegnertyp (Masterprompt 4.3: 2-3 Muster, Telegraph 0,35-0,85 s)
interface AttackPattern {
  id: 'hieb' | 'doppelhieb' | 'giftwolke' | 'blinkschlag' | 'sprung'
    | 'golem_rundum' | 'golem_welle' | 'golem_stampf' | 'golem_zorn'
    | 'wache_stich' | 'wache_kombo' | 'wache_rundum';
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
  skelettwache: [
    { id: 'wache_stich', windup: SKELETTWACHE.angriffe.thrust.windupS, weight: 4 },
    { id: 'wache_kombo', windup: SKELETTWACHE.angriffe.combo.windupS, weight: 4 },
    { id: 'wache_rundum', windup: SKELETTWACHE.angriffe.spin.windupS, weight: 1 },
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
  golem: [
    { id: 'hieb', windup: 0.78, weight: 1 },
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
  rootT = 0;   // Fesselpfeil (Runde 47): festgewurzelt, kann sich nicht bewegen
  spawnRef?: { tot?: boolean; x?: number; y?: number; hp?: number }; // Verweis auf die Spawn-Definition (Runde 47):
  //   wird beim Tod als 'tot' markiert, damit der Gegner beim Wiederbetreten
  //   der Ebene NICHT erneut erscheint (Autorbug "alle Monster wieder da").
  brennT = 0;        // Brand-Restzeit (Sekunden) - Feuerregen-DoT (Runde 41)
  brennDps = 0;      // Schaden pro Sekunde, solange brennT > 0
  brennTick = 0;     // Takt bis zum nächsten Brand-Schaden
  hitFlash = 0;
  // Asset-Animation: von der KI getrennte Uhren, damit Lauf/Schlag/Treffer
  // weich ablaufen und nicht an den vier alten Fallback-Frames hängen.
  visualTime = 0;
  visualMoveT = 0;
  visualWalkTime = 0;
  visualHitT = 0;
  visualAttackT = 0;
  visualAttackDauer = 0;
  visualDir8 = 0;
  // Eigene Menschengolem-Phasen. Der schwere Koerper ignoriert Rueckstoss und
  // blutet bei 30/15/5 Prozent zunehmend stark aus.
  golemFleischStufe = 0;
  golemSchwerVerletzt = false;
  golemBlutCd = 0;
  golemBlutLacheCd = 0;
  golemBrescheRest = 0;
  golemVollerSchaden = 0;
  golemSpezialCd = 2.8 + Math.random() * 1.8;
  golemTelegraphArt: 'rundum' | 'welle' | 'stampf' | 'zorn' | null = null;
  skelettwacheAngriff: 'thrust' | 'combo' | 'spin' | null = null;
  skelettwacheSpezialCd = 2.8 + Math.random() * 2.2;
  private golemZornFolge = 0;
  wobble: number;
  dir: Dir = 0;
  step = 0;
  stepT = 0;
  markedT = 0; // Markierter Tod (Bogen Stufe 9)
  banishedT = 0; // Bannkreis schwächt Untote
  schlagtempoF = 1; // Per-Typ-Schlagtempo (F10, beim Spawn gesetzt)
  reichweiteF = 1;  // Per-Typ-Hiebreichweite (F10, beim Spawn gesetzt)
  kvx = 0; kvy = 0; // Physik-Rückstoß-Geschwindigkeit (Runde 36, Physik-Test)
  kbT = 0;          // Rückstoß-Restzeit (Runde 44): Wucht-/Axt-Treffer schleudern
  //                   den Gegner kurz zurück, unabhängig vom Physik-Test.
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
  // Jagd-Ziel (Runde 40, großer Einfall): Position eines Tieres/Bewohners, dem
  // der Gegner hinterherrennt statt den Spieler zu suchen. null = normale KI.
  jagdZiel: { x: number; y: number } | null = null;
  // R101 (Autor "Monster sollen die schwaechste Stelle gezielt angreifen"):
  // Bresche-Ziel der Belagerungs-KI (Struktur-Mitte). Gesetzt/geloescht von
  // WorldScene.updateBelagerung; der Monster marschiert dorthin und HAELT davor,
  // damit die Belagerung ihn dort gebuendelt nagen laesst.
  belagerungsZiel: { x: number; y: number } | null = null;
  belagerungsSchlagCd = 0;
  // Einfall-Failsafe (Runde 41): erkennt im Gelände festsitzende Nachzügler
  fsT = 0; fsX?: number; fsY?: number;
  // Schildträger (Runde 11): blockt Treffer von vorn, weicht nicht zurück
  schild = false;
  // R135c: Ruestung der RTS-Feld-Truppen. Multiplikator auf erlittenen Schaden
  // (1 = keine Ruestung/Dungeon-Standard, 0.55 = schwer gepanzerter Ritter). NIE
  // 0 - das Schwert trifft immer (Regel 4). kampfTags speisen die Konter-Matrix.
  schadensRed = 1;
  kampfTags: readonly import('../data/kampfarten').Tag[] = [];
  // R135d Angriffs-Slot: der Winkel um das Ziel, auf dem dieser Angreifer stehen
  // soll (von der Szene je Frame verteilt). null = kein Platz -> haelt zurueck.
  slotWinkel: number | null = null;
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
  // R99d (P12-14): Fraktion. 'spieler' = VERBUENDETER RTS-Kaempfer - laeuft mit
  // exakt derselben Dungeon-KI (Schild/Parade/Bogen), aber sein "Spieler"-Ziel
  // ist ueber den Proxy-Host der naechste FEIND (WorldScene.enemyHost).
  team: 'feind' | 'spieler' = 'feind';
  // R139 Moral (Dok 03, 1.2 - Total War): 0..100, unter MORAL.fluchtUnter
  // BRICHT die Einheit und flieht zur Kartenkante; eingekesselt flieht sie
  // NICHT, sondern kaempft verzweifelt weiter (Sunzi N5.3, "Loch im Kessel").
  moral = 100;
  flieht = false;
  verzweifelt = false;
  // R139 (Dok 03, 1.7 - Dungeon Siege "Field Commands"): Angriffs-Achse
  // "Feuer einstellen" - die Einheit bewegt sich, holt aber NIE aus (der
  // Feldscher zieht keine Aggro durch Gegenwehr). Zielwahl-Achse steuert,
  // WEN zielFuer aussucht (naechster/schwaechster/gefaehrlichster).
  kaempftNicht = false;
  zielWahl: 'naechster' | 'schwaechster' | 'gefaehrlichster' = 'naechster';
  // R139 (1.6): womit diese Einheit zuschlaegt (speist die KONTER-Matrix) und
  // wann zuletzt ein Konter-Text ueber ihr stand (Drossel gegen Text-Spam).
  schadensArt: import('../data/kampfarten').SchadensArt = 'schnitt';
  konterTextT = 0;
  // R141 (Dok 03, 2.1/2.2): Verweis auf die ROSTER-Einheit (persistente Armee)
  // und die Feld-Kills fuer den Veteranen-Rang. null = kein Roster (Feinde,
  // Dungeon-Monster).
  armeeId: number | null = null;
  kills = 0;
  soeldner = false;   // R143 (2.3): Moral-Malus; flieht er zur Kante, desertiert er
  feldzugTrupp = false;   // F2: Teil einer Feindzug-Angriffswelle (Live-Aufloesung)
  // MASSENSCHLACHT: Einheit einer grossen Schlacht - beim Tod KEIN Einzel-Loot,
  // leichter Tod (keine 8 Gore-Tweens), gedrosselter Todes-Sound. Sonst kippen
  // hunderte gleichzeitige Tode die FPS + den Sound (Autor-Befund Stresstest).
  massenEinheit = false;
  // R187: Heer-Ausruestung eines Verbuendeten. waffeMax > 0 -> der Schaden
  // WUERFELT je Schlag zwischen waffeMin und waffeMax; ruestungRed ist der
  // eingehende Schadens-Multiplikator (0.9 = 10% Schutz).
  waffeMin = 0;
  waffeMax = 0;
  waffeName = '';
  ruestungRed = 1;
  ruestungName = '';
  // R144: RTS-Einheitentyp eines Verbuendeten - damit die Befehls-Schicht eine
  // bereits stehende Garnison (R142) beim RTS-Einstieg uebernehmen kann.
  rtsTyp: import('../data/rts').RtsUnitTyp | null = null;
  fokusZiel: Enemy | null = null;   // Angriffsbefehl der RTS-Steuerung (Verbuendete)
  // Provokation (Autor "Soldaten stehen bloed rum und lassen sich vom Bogen-
  // schuetzen toeten"): wer getroffen wird, jagt seinen Angreifer - auch wenn
  // der weiter weg steht als die normale Zielsuche reicht. Laeuft nach ab.
  letzterAngreifer: Enemy | null = null;
  provokationT = 0;
  imTurm = false;                    // R100: sitzt im Wachturm -> Sprite unsichtbar, schiesst von oben
  passiv = false;                    // R100b: frisch gesetzt -> steht still, bis geweckt (Gegner nah/Schaden/Befehl)
  schlaeft = false;                  // R118 V9: schlaeft hinter verschlossener Tuer - weckt NUR Tuer-Oeffnen oder Schaden
  festPos: { x: number; y: number } | null = null;   // R100c: fixierter Posten (Turmplattform) - steht still, schiesst von dort
  turmReichF = 1;                    // R100c: Reichweiten-Faktor auf dem Turm (Fernkampf massiv)
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
    this.passiv = false;   // R100b: Schaden weckt eine passive Einheit
    this.schlaeft = false; // R118: Schaden weckt auch Schlafende
    // Der Menschengolem zuckt nicht zurueck. Seine Trefferreaktion kommt ueber
    // Blut, Fleischverlust und die HP-Phasen, nicht ueber Positionsspruenge.
    if (this.type === 'golem') return;
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
  private geysirCd: number = BOSS.geysirCd;
  private phase3Aktiv = false;
  private summoned = [false, false];
  // Welche Boss-Kammer (Runde 58): 0 = Vorhof, 1 = Halle, 2 = Inneres Grab.
  // Wird von der Welt beim Erscheinen/Wiederaufstellen gesetzt; gibt jeder
  // Kammer ihre eigene Phasen-Signatur (Salve ab Halle, Blutsäulen im Grab).
  bossKammer = 0;

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
    this.golemVollerSchaden = this.dmg;
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

  // Wucht-Rückstoß (Runde 44): schleudert den Gegner mit Geschwindigkeit vx/vy
  // weg und betäubt ihn kurz, damit er nicht sofort wieder heranläuft. Wirkt
  // IMMER (nicht nur im Physik-Test), aber bei Bossen stark gedämpft.
  stossWeg(vx: number, vy: number, stunS: number): void {
    if (this.type === 'golem') return;
    const f = this.boss ? 0.18 : this.champion ? 0.5 : 1;
    this.kvx = vx * f; this.kvy = vy * f;
    this.kbT = 0.22;
    this.stun = Math.max(this.stun, stunS * f);
  }

  hasLineOfSight(host: EnemyHost): boolean {
    const steps = 14;
    if (this.fokusZiel && this.fokusZiel.hp <= 0) this.fokusZiel = null;   // R99d: erledigtes Befehlsziel vergessen
    const px = host.playerX(), py = host.playerY();
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (host.isSolidAt(this.x + (px - this.x) * t, this.y + (py - this.y) * t)) return false;
    }
    return true;
  }

  update(host: EnemyHost, dt: number): void {
    // Der Menschengolem ist zu schwer fuer Impuls-/Treffer-Rueckstoss. Auch ein
    // eventuell bereits gesetzter Impuls darf ihn nicht einen Frame weit tragen.
    if (this.type === 'golem') { this.kbT = 0; this.kvx = 0; this.kvy = 0; }
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.shootCd = Math.max(0, this.shootCd - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.provokationT > 0) { this.provokationT = Math.max(0, this.provokationT - dt); if (this.provokationT === 0) this.letzterAngreifer = null; }
    if (this.letzterAngreifer && this.letzterAngreifer.hp <= 0) { this.letzterAngreifer = null; this.provokationT = 0; }
    this.visualTime += dt;
    if (this.visualMoveT > 0) this.visualWalkTime += dt;
    this.visualMoveT = Math.max(0, this.visualMoveT - dt);
    this.visualHitT = Math.max(0, this.visualHitT - dt);
    this.visualAttackT = Math.max(0, this.visualAttackT - dt);
    this.golemSpezialCd = Math.max(0, this.golemSpezialCd - dt);
    this.skelettwacheSpezialCd = Math.max(0, this.skelettwacheSpezialCd - dt);
    this.slowT = Math.max(0, this.slowT - dt);
    this.rootT = Math.max(0, this.rootT - dt);
    this.markedT = Math.max(0, this.markedT - dt);
    this.banishedT = Math.max(0, this.banishedT - dt);
    this.wobble += dt * 4;

    // R100b (Autor "warum stehen die nicht erstmal?"): frisch gesetzte Einheiten
    // sind PASSIV - sie stehen ruhig an ihrem Platz, bis sie geweckt werden
    // (Gegner kommt nah / Schaden / Befehl). Kein Loslaufen beim Spawn.
    if (this.passiv || this.schlaeft) { this.step = 0; return; }

    // R100c (Autor "die wuseln im Turm hin und her, der Bogen schiesst nicht"):
    // ein Turm-Insasse ist FIXIERT (festPos) - er steht bewegungslos oben und
    // schiesst von dort (Fernkampf mit Turm-Reichweite). Kein Hin-und-Her mehr.
    if (this.festPos) {
      this.x = this.festPos.x; this.y = this.festPos.y;
      this.step = 0;
      const zx = host.playerX(), zy = host.playerY(), zd = Math.hypot(zx - this.x, zy - this.y);
      this.dir = angleToDir(Math.atan2(zy - this.y, zx - this.x));
      if (this.ranged && zd > 10 && zd < ENEMY_AI.rangedMaxShoot * this.turmReichF && this.shootCd === 0) {
        this.shootCd = ENEMY_AI.rangedShootCd;
        const a = Math.atan2(zy - this.y, zx - this.x) + (Math.random() * 0.12 - 0.06);
        // R100j: Turm-Schuss ist ERHOEHT -> fliegt UEBER Palisaden/Waende (hoch=true),
        // sonst prallten die Pfeile an der eigenen Mauer ab ("kommen nicht raus").
        host.spawnEnemyProjectile(this.x, this.y - 6, Math.cos(a) * ENEMY_AI.rangedProjSpeed, Math.sin(a) * ENEMY_AI.rangedProjSpeed, this.dmg, this.magie ? '#b06ae8' : '#cfc4a8', !this.magie, this.team === 'spieler' ? 'spieler' : 'feind', true);
        host.playSound(this.magie ? 'fireball1' : 'pfeil_schuss');
      }
      return;
    }

    const px = host.playerX(), py = host.playerY();
    const d = Math.hypot(px - this.x, py - this.y);
    // Blickrichtung für das Sprite
    const ang = Math.atan2(py - this.y, px - this.x);
    this.dir = angleToDir(ang);
    // Einen begonnenen Speerhieb in seiner Richtung zu Ende fuehren. Sonst kann
    // seitliches Ausweichen mitten im Clip zwischen zwei Atlasansichten springen.
    if (this.type !== 'skelettwache' || this.visualAttackT <= 0) this.visualDir8 = angleToDir8(ang);

    // Wucht-Rückstoß (Runde 44): Hammer/Axt schleudern den Gegner zurück - er
    // gleitet mit Reibung aus, bevor die KI (nach dem kurzen Stun) übernimmt.
    // Gilt IMMER, nicht nur im Physik-Test.
    if (this.kbT > 0) {
      this.kbT -= dt;
      this.moveBody(host, this.kvx * dt, this.kvy * dt);
      this.kvx *= 0.86; this.kvy *= 0.86;
      this.advanceStep(dt);
      return;
    }
    // Physik-Rückstoß (Runde 36, nur im Physik-Test): weggeschleudert gleitet
    // und prallt der Gegner, bevor die KI wieder übernimmt. Bosse bleiben fest.
    if (TUNING.physikTest && !this.boss && (Math.abs(this.kvx) > 8 || Math.abs(this.kvy) > 8)) {
      this.moveBody(host, this.kvx * dt, this.kvy * dt);
      this.kvx *= PHYSIK.gegnerReibung;
      this.kvy *= PHYSIK.gegnerReibung;
      this.advanceStep(dt);
      return;
    }

    // Jagd auf Tier/Bewohner (Runde 40, großer Einfall): rennt stur zum Ziel,
    // statt den Spieler zu suchen. Das Reißen erledigt das Skript in der Szene.
    if (this.jagdZiel) {
      const dzx = this.jagdZiel.x - this.x, dzy = this.jagdZiel.y - this.y, dz = Math.hypot(dzx, dzy);
      if (dz > 3) {   // R100k (Autor "stehende NPCs haben Lauf-Animation"): nur laufen +
        // R101e: Marsch folgt dem FLUSSFELD zum Ziel (um lange Waende herum, ganze
        // Karte), nicht nur der Luftlinie - sonst jittert die Einheit an der Mauer.
        const wa = host.wegRichtungZiel(this.x, this.y, this.jagdZiel.x, this.jagdZiel.y);
        const ang = wa !== null ? wa : Math.atan2(dzy, dzx);
        this.dir = angleToDir(ang);   // animieren, wenn WIRKLICH Weg zum Ziel ist
        // R139: Fliehende rennen etwas schneller (Angst treibt).
        this.laufe(host, ang, this.speed * (this.flieht ? MORAL.fluchtTempoF : 1), dt);
        this.advanceStep(dt);
      } else { this.step = 0; }   // am Ziel -> Stand, KEINE Lauf-Animation
      return;
    }
    // R101 (Belagerung, Autor "die schwaechste Stelle gezielt angreifen"): ein
    // zugewiesener Belagerer marschiert zur Bresche-Struktur und HAELT davor
    // (updateBelagerung laesst ihn dort nagen). Fokus statt Streuung, kein Jitter.
    if (this.belagerungsZiel) {
      const bx = this.belagerungsZiel.x - this.x, by = this.belagerungsZiel.y - this.y, bd = Math.hypot(bx, by);
      this.dir = angleToDir(Math.atan2(by, bx));
      if (bd > this.r + 24) {
        // R101e: auch der Belagerer marschiert per Flussfeld um Waende zur Bresche.
        const wa = host.wegRichtungZiel(this.x, this.y, this.belagerungsZiel.x, this.belagerungsZiel.y);
        this.laufe(host, wa !== null ? wa : Math.atan2(by, bx), this.speed, dt); this.advanceStep(dt);
      }
      else this.step = 0;   // an der Bresche: stehen (Belagerung schlaegt zu)
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
      // Cleverness STETIG (Runde 41): die Pause zwischen Blocks skaliert mit dem
      // Regler - höher = blockt öfter. Bei 2.0 (Standard) wie bisher.
      const clever = Math.max(0.05, TUNING.gegnerCleverness);
      if (this.blockCd === 0 && nahGenug && this.blockT === 0 && clever > 0.05) {
        // Die Speerwache pariert nur kurz und kontert, statt bis zu 0,7 s in der
        // Idle-Pose festzuhängen. Schildträger behalten ihre defensive Identität.
        const istSpeerwache = this.type === 'skelettwache';
        this.blockT = istSpeerwache ? 0.20 + Math.random() * 0.12
          : this.schild ? 0.9 + Math.random() * 0.5 : 0.4 + Math.random() * 0.3;
        this.blockCd = (istSpeerwache ? 4.0 + Math.random() * 1.8
          : this.schild ? 2.5 + Math.random() * 2 : 3.2 + Math.random() * 2.6) * 2 / clever;
      }
      if (this.blockT > 0) {
        // Deckung läuft ab und der Spieler steht dran: Gegenstoß (Runde 27).
        // Konter-Chance skaliert STETIG mit der Cleverness (bei 2.0 = sicher).
        if (this.blockT <= dt * 2 && nahGenug && this.windup <= 0 && Math.random() < 0.5 * clever) {
          this.startPattern(host, this.type === 'skelettwache' ? 'wache_stich' : 'hieb', this.type === 'skelettwache' ? SKELETTWACHE.angriffe.thrust.windupS : 0.2);
        }
        return; // in Deckung: stehen, nicht angreifen
      }
    }
    // Doppelhieb: zweiter Schlag kurz nach dem ersten
    if (this.secondHitT > 0) {
      this.secondHitT -= dt;
      const istWachenKombo = this.type === 'skelettwache' && this.pattern === 'wache_kombo';
      const zweiteReichweite = (istWachenKombo ? 32 : 20) * (TUNING.gegnerReichweite * this.reichweiteF);
      if (this.secondHitT <= 0 && d < this.r + host.playerR() + zweiteReichweite) {
        host.enemyMeleeHit(this, Math.round(this.dmg * (istWachenKombo ? 0.72 : 0.7)));
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

    // R135d Angriffs-Slot: ein Nahkaempfer mit zugewiesenem Slot steuert seinen
    // Platz auf dem Ring um den Helden an (steuerAng), statt den Mittelpunkt - so
    // umzingeln sie ihn, statt sich auf einem Punkt zu stauen. Die Distanz-/Angriffs-
    // pruefungen bleiben auf der ECHTEN Heldennaehe (d/ang). Fernkaempfer halten
    // Abstand und bekommen keinen Slot.
    let steuerAng = ang;
    if (this.slotWinkel !== null && !this.ranged) {
      const rad = host.playerR() + this.r + ANGRIFFSSLOTS.ringLuecke;
      const sx = px + Math.cos(this.slotWinkel) * rad, sy = py + Math.sin(this.slotWinkel) * rad;
      steuerAng = Math.atan2(sy - this.y, sx - this.x);
    }
    const slowF = this.rootT > 0 ? 0 : this.slowT > 0 ? ENEMY_AI.slowFactorEis : 1;
    // R103 (Autor "Monster stehen an der Palisade neben dem Helden statt durchs
    // Tor zu kommen"): freie SICHT zum Ziel? Ohne Sicht (Wand dazwischen) wird NICHT
    // umkreist/angegriffen, sondern IMMER ums Hindernis gepfadet (durchs offene Tor).
    const zielSicht = this.hasLineOfSight(host);
    if (this.ranged && d < ENEMY_AI.rangedMaxShoot && d > ENEMY_AI.rangedMinShoot && zielSicht) {
      if (this.shootCd === 0 && !this.kaempftNicht) {   // R139 (1.7): Feuer einstellen
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
    } else if (!zielSicht || d > this.r + host.playerR() + 6 + 14 * ((TUNING.gegnerReichweite * this.reichweiteF) - 1)) {
      // R103 (Autor "Monster stehen an der Palisade neben dem Helden statt durchs
      // Tor zu kommen"): OHNE freie Sicht (Wand/Palisade dazwischen) folgt die
      // Einheit AUSSCHLIESSLICH dem Flussfeld ums Hindernis (durchs offene Tor / durch
      // die Bresche). Die lokale Umweg-/Umkreis-Heuristik wird uebersprungen - genau
      // die liess Monster stur an der naechsten Wand entlangrutschen. Kein Weg = stehen.
      if (!zielSicht) {
        const wa = host.wegRichtung(this.x, this.y);
        if (wa === null) { this.step = 0; return; }
        this.laufe(host, wa, this.speed * slowF, dt);
        this.advanceStep(dt);
        return;
      }
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
      // Sammel-Dauer skaliert STETIG mit der Cleverness (Runde 41): cleverer =
      // wartet länger geduldig auf Verbündete; bei 2.0 wie bisher.
      if (TUNING.gegnerCleverness > 0.05 && this.type === 'skelett' && d < 160 && d > 80) {
        if (this.mutT < 0) this.mutT = (ENEMY_AI.sammelnMin + Math.random() * ENEMY_AI.sammelnSpanne) * Math.min(2, TUNING.gegnerCleverness) / 2;
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
        // Annäherung (R100L, Autor "Soldat jittert an der Wand statt ums Hindernis
        // zu pfaden - er muss den Weg durchs offene Tor nehmen, sonst still halten"):
        // NUR wenn er dran ist UND freie Sicht hat, zaehlt der direkte Winkel; sonst
        // fuehrt IMMER das Flussfeld um Hindernisse/durch offene Tore. Findet das
        // Feld KEINEN Weg (Wand ohne Durchlass), HAELT er still statt zu jittern.
        const direktFrei = !host.isSolidAt(this.x + Math.cos(ang) * (this.r + 12), this.y + Math.sin(ang) * (this.r + 12));
        const nahMelee = d <= this.r + host.playerR() + 30;
        if (nahMelee && direktFrei) {
          // Mit Slot: den zugewiesenen Ring-Platz ansteuern (umzingeln), sonst der
          // alte leichte flankAng-Versatz.
          this.laufe(host, this.slotWinkel !== null ? steuerAng : ang + this.flankAng * 0.4, this.speed * slowF, dt);
          this.advanceStep(dt);
        } else {
          const wegAng = host.wegRichtung(this.x, this.y);
          // R101 (Autor "eingeschlossene Bogenschuetzen laufen wild"): kein Weg vom
          // Flussfeld UND (eingeschlossen ODER Wand direkt davor) -> STEHEN. Der
          // frueher noetige !direktFrei allein liess Einheiten an einer weiter
          // entfernten Mauer entlangrutschen, obwohl es keinen Weg raus gab.
          if (wegAng === null && (host.wegBlockiert(this.x, this.y) || !direktFrei)) {
            this.step = 0;   // kein Weg zum Ziel -> still halten (kein Wand-Jitter)
          } else {
            const fade = Math.min(1, Math.max(0, (d - 50) / 160));
            // Bei freiem direktem Weg (kein Flussfeld noetig) steuert ein Slot-Traeger
            // seinen Ring-Platz an; sonst folgt er dem Flussfeld ums Hindernis.
            const hatSlot = this.slotWinkel !== null && wegAng === null;
            const basis = wegAng ?? (this.slotWinkel !== null ? steuerAng : ang);
            const jitter = hatSlot ? 0 : this.flankAng * fade * (wegAng !== null ? 0.4 : 1);
            this.laufe(host, basis + jitter, this.speed * slowF, dt);
            this.advanceStep(dt);
          }
        }
      }
    } else if (this.atkCd === 0) {
      if (this.type === 'golem' && this.waehleGolemSpezial(host, d)) return;
      this.choosePattern(host);
    }
  }

  aktualisiereBelagerungsSchlag(dt: number): boolean {
    this.belagerungsSchlagCd = Math.max(0, this.belagerungsSchlagCd - dt);
    if (this.belagerungsSchlagCd > 0) return false;
    this.belagerungsSchlagCd = this.type === 'golem' ? GOLEM.belagerungsSchlagPauseS : 0.8;
    if (this.type === 'golem') {
      this.visualAttackDauer = GOLEM.belagerungsSchlagDauerS;
      this.visualAttackT = this.visualAttackDauer;
      this.golemTelegraphArt = null;
    }
    return true;
  }

  private waehleGolemSpezial(host: EnemyHost, distanz: number): boolean {
    if (this.golemSpezialCd > 0 || distanz > 145 || this.kaempftNicht) return false;
    const anteil = this.hp / Math.max(1, this.maxhp);
    let art: AttackPattern['id'] | null = null;
    if (anteil < GOLEM.phasen.rasereiUnter) {
      // Letzte Raserei: keine saubere Phase mehr, sondern alle erlernten
      // Flaecheneffekte als eine stark telegraphierte Verzweiflungstat.
      art = 'golem_zorn';
      this.golemZornFolge++;
    } else if (anteil <= GOLEM.phasen.stampfAb) {
      art = this.golemZornFolge++ % 2 === 0 ? 'golem_stampf' : 'golem_welle';
    } else if (anteil <= GOLEM.phasen.rundumNurUeber) {
      art = 'golem_welle';
    } else if (Math.random() < 0.34) {
      art = 'golem_rundum';
    }
    if (!art) {
      this.golemSpezialCd = 1.4;
      return false;
    }
    const windup = art === 'golem_zorn' ? 1.05 : art === 'golem_stampf' ? 0.92 : 0.72;
    this.startPattern(host, art, windup);
    this.golemSpezialCd = art === 'golem_zorn' ? 4.2 : 4.8 + Math.random() * 2.2;
    return true;
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
    // R139 (1.7): Kampfverbot - kein Ausholen, egal aus welchem Zweig.
    if (this.kaempftNicht) return;
    if (id === 'wache_rundum' && this.skelettwacheSpezialCd > 0) {
      id = 'wache_stich';
      windup = SKELETTWACHE.angriffe.thrust.windupS;
    }
    const def = (PATTERNS[this.type] ?? []).find((p) => p.id === id);
    this.pattern = id;
    // Schlagtempo-Regler (F10, Runde 27): höher = kürzeres Ausholen,
    // kürzere Pausen zwischen den Hieben
    this.windup = (windup ?? def?.windup ?? ENEMY_AI.meleeWindup) / (TUNING.gegnerSchlagtempo * this.schlagtempoF);
    if (this.type === 'golem') {
      this.visualAttackDauer = this.windup + GOLEM.schlagNachlaufS;
      this.visualAttackT = this.visualAttackDauer;
      this.golemTelegraphArt = id === 'golem_rundum' ? 'rundum'
        : id === 'golem_welle' ? 'welle'
        : id === 'golem_stampf' ? 'stampf'
        : id === 'golem_zorn' ? 'zorn' : null;
    }
    if (this.type === 'skelettwache') {
      this.skelettwacheAngriff = id === 'wache_kombo' ? 'combo' : id === 'wache_rundum' ? 'spin' : 'thrust';
      const timing = SKELETTWACHE.angriffe[this.skelettwacheAngriff];
      this.visualAttackDauer = this.windup + timing.nachlaufS / (TUNING.gegnerSchlagtempo * this.schlagtempoF);
      this.visualAttackT = this.visualAttackDauer;
      if (id === 'wache_rundum') {
        this.skelettwacheSpezialCd = SKELETTWACHE.rundum.cooldownMinS + Math.random() * SKELETTWACHE.rundum.cooldownSpanneS;
      }
    }
    const wacheTiming = this.type === 'skelettwache' && this.skelettwacheAngriff
      ? SKELETTWACHE.angriffe[this.skelettwacheAngriff] : null;
    this.atkCd = (wacheTiming?.zyklusS ?? (ENEMY_AI.meleeAtkCd + (id === 'hieb' ? 0 : 0.6)))
      / (TUNING.gegnerSchlagtempo * this.schlagtempoF);
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
        this.lungeIn(host, px, py, ENEMY_AI.hiebVorstoss);   // R174: gedaempft
        const d2 = Math.hypot(px - this.x, py - this.y);
        if (d2 < this.r + host.playerR() + 16 * (TUNING.gegnerReichweite * this.reichweiteF)) host.enemyMeleeHit(this, Math.round(this.dmg * (0.8 + Math.random() * 0.35)));
        if (Math.random() < (AGGRO[this.type] ?? AGGRO_STD).rueckzugChance) {
          this.retreatT = ENEMY_AI.rueckzugDauer + Math.random() * 0.18;
          this.orbitDir = Math.random() < 0.5 ? 1 : -1;
        }
        break;
      }
      case 'doppelhieb':
        this.lungeIn(host, px, py, ENEMY_AI.doppelVorstoss);   // R174: gedaempft
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
        this.lungeT = ENEMY_AI.sprungDauerS;   // R174: kuerzer + langsamer
        this.lungeVx = Math.cos(ang) * ENEMY_AI.sprungTempo;
        this.lungeVy = Math.sin(ang) * ENEMY_AI.sprungTempo;
        host.playSound('wolf');
        break;
      case 'golem_rundum':
        host.golemSpezial(this, 'rundum');
        break;
      case 'golem_welle':
        host.golemSpezial(this, 'welle');
        break;
      case 'golem_stampf':
        host.golemSpezial(this, 'stampf');
        break;
      case 'golem_zorn':
        host.golemSpezial(this, 'zorn');
        break;
      case 'wache_stich': {
        this.lungeIn(host, px, py, 28);
        const reichweite = this.r + host.playerR() + 30 * (TUNING.gegnerReichweite * this.reichweiteF);
        if (Math.hypot(px - this.x, py - this.y) < reichweite) host.enemyMeleeHit(this, this.dmg);
        break;
      }
      case 'wache_kombo': {
        this.lungeIn(host, px, py, 25);
        const reichweite = this.r + host.playerR() + 32 * (TUNING.gegnerReichweite * this.reichweiteF);
        if (Math.hypot(px - this.x, py - this.y) < reichweite) host.enemyMeleeHit(this, Math.round(this.dmg * 0.72));
        this.secondHitT = SKELETTWACHE.angriffe.combo.zweiterTrefferS
          / (TUNING.gegnerSchlagtempo * this.schlagtempoF);
        break;
      }
      case 'wache_rundum':
        host.skelettwacheRundum(this);
        break;
    }
    this.golemTelegraphArt = null;
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
    // Heilige Salve ab der Halle der Wächter (Kammer 1) oder ab Phase 2 (Runde 58)
    if ((phase2 || this.bossKammer >= 1) && this.fanCd === 0 && d < BOSS.fanRange) {
      this.fanCd = phase3 ? 1.8 : BOSS.fanCd;
      const half = ((phase3 ? BOSS.fanCount + 2 : BOSS.fanCount) - 1) / 2;
      for (let i = -half; i <= half; i++) {
        const a = ang + i * BOSS.fanSpread;
        host.spawnEnemyProjectile(this.x, this.y, Math.cos(a) * BOSS.fanProjSpeed, Math.sin(a) * BOSS.fanProjSpeed, Math.round(this.dmg * BOSS.fanDmgMult), '#a8e0c0');
      }
      host.playSound('templer_stimme');
    }
    // Phase III "Blutsäulen" (Runde 58): nur im Inneren Grab (letzte Kammer).
    // Blut bricht aus dem Boden - ein Ring um den Ritter UND Geysire unter dem
    // Helden zwingen zur Bewegung. Reiner, klar angesagter Telegraph-Schaden.
    this.geysirCd = Math.max(0, this.geysirCd - dt);
    if (this.bossKammer >= 2 && this.geysirCd === 0) {
      this.geysirCd = BOSS.geysirCd;
      host.logMsg(BOSS_TEXTE.blutsaeulen, 'bad');
      host.playSound('templer_stimme');
      const gDmg = Math.round(this.dmg * BOSS.geysirDmgMult);
      for (let i = 0; i < BOSS.geysirRing; i++) {
        const a = (i / BOSS.geysirRing) * Math.PI * 2 + Math.random() * 0.4;
        const gx = this.x + Math.cos(a) * BOSS.geysirRingR, gy = this.y + Math.sin(a) * BOSS.geysirRingR;
        host.addTelegraph(gx, gy, BOSS.geysirRadius, BOSS.geysirTelegraphS, gDmg);
        host.burstFx(gx, gy, 0x8c1414, 8, 70);
      }
      for (let i = 0; i < BOSS.geysirAmHeld; i++) {
        const gx = px + (Math.random() - 0.5) * BOSS.geysirStreuung, gy = py + (Math.random() - 0.5) * BOSS.geysirStreuung;
        host.addTelegraph(gx, gy, BOSS.geysirRadius, BOSS.geysirTelegraphS, gDmg);
        host.burstFx(gx, gy, 0x8c1414, 8, 70);
      }
    }
  }

  private advanceStep(dt: number): void {
    // Eine neue Laufsequenz beginnt immer auf der gemeinsamen neutralen Pose.
    // Dadurch springt der Golem beim Wechsel Idle -> Walk nicht in eine
    // zufaellige Phase seiner globalen Animationsuhr.
    if (this.visualMoveT <= 0) this.visualWalkTime = 0;
    this.visualMoveT = 0.22;
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

// 8 Richtungen für den hochauflösenden Helden (R54): 0=S(unten) 1=SW 2=W(links)
// 3=NW 4=N(oben) 5=NE 6=O(rechts) 7=SE. Bildschirm-Winkel: 0=rechts, PI/2=unten.
export function angleToDir8(ang: number): number {
  const a = Phaser.Math.Angle.Normalize(ang);
  const oct = Math.round(a / (Math.PI / 4)) % 8;   // 0=O,1=SO,2=S,3=SW,4=W,5=NW,6=N,7=NO
  return [6, 7, 0, 1, 2, 3, 4, 5][oct];
}

// 16 gebackene Kamerawinkel des Blender-Pferds: d0=S, d4=W, d8=N,
// d12=O. 22,5-Grad-Schritte vermeiden den sichtbaren 45-Grad-Perspektivsprung.
export function angleToDir16(ang: number): number {
  const a = Phaser.Math.Angle.Normalize(ang);
  return (12 + Math.round(a / (Math.PI / 8))) % 16;
}
