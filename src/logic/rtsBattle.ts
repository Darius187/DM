// RTS-Schlacht-Schicht für die Spielwelt (R96-R99d).
// R99d (Autorbrief P12-14): KEINE eigene Kampf-Simulation mehr - alle Kämpfer
// sind ECHTE Dungeon-Enemies. Verbündete = Enemy mit team 'spieler' (gleiche
// KI: Schild/Parade/Bogen/Wegfeld), Feinde = normale spawnEnemy-Monster.
// Diese Klasse ist nur noch die KOMMANDO-Schicht: Auswahl (Klick/Gummiband/
// Doppelklick/Shift), Befehle (Rechtsklick, Formation mit Ghost, Angriffsmarsch,
// Halten), Turm-Besatzung, Lager-Auren und das Feedback-Overlay. Die Befehle
// steuern die Enemy-Refs über jagdZiel (Marsch/Stellung) und fokusZiel (Angriff).
//
// Der Held bleibt eine SONDER-Einheit der Szene (heldRef): auswählbar und
// befehligbar, kämpft aber mit dem Helden-System.

import Phaser from 'phaser';
import type { SpriteProvider } from '../gfx/SpriteProvider';
import type { Enemy } from '../world/Enemy';
import { formSlots, formSlotsSkaliert, linienSlots, slotWelt, type Form, type Slot } from './formationen';
import { RTS_UNIT_TYP, TURM, LAGER_EFFEKT, type RtsUnitTyp, type RtsTeam } from '../data/rts';
import { Wegfeld } from '../world/Wegfeld';

const TILE = 32;

export type Stance = 'aggressiv' | 'verteidigen' | 'halten';

interface Gruppe { anker: { x: number; y: number }; facing: number; ziel: { x: number; y: number } | null; manuell: boolean; angriffsMarsch: boolean }

// Kommando-Hülle um einen verbündeten Enemy (ref). Position/HP werden je Frame
// aus dem ref gespiegelt; Befehle schreiben jagdZiel/fokusZiel in den ref.
export interface RtsUnit {
  ref: Enemy;
  typ: RtsUnitTyp;
  x: number; y: number; hp: number; maxhp: number;
  basisDmg: number;
  tot: boolean; gewaehlt: boolean;
  stance: Stance; rank: number;
  grp: Gruppe | null; off: Slot | null;
  fokusRef: Enemy | null;
  turm: { x: number; y: number } | null;
  buffDmg: number;
}

export interface HeldRef {
  pos(): { x: number; y: number };
  lebt(): boolean;
  schaden(n: number): void;
  naheKlick(wx: number, wy: number): boolean;
  setGewaehlt(b: boolean): void;
  befehlMarsch(x: number, y: number): void;
  befehlAngriff(x: number, y: number): void;
}

export interface RtsHost {
  scene: Phaser.Scene;
  provider: SpriteProvider;
  play(key: string, vol?: number): void;
  isSolid(x: number, y: number): boolean;
  tuerme(): Array<{ x: number; y: number }>;
  lager(): Array<{ typ: string; x: number; y: number }>;
  gitter(): { w: number; h: number } | null;
  begehbar(tx: number, ty: number, team: RtsTeam): boolean;
  // R99d: Dungeon-Kampf-Anbindung
  spawnAlly(typ: RtsUnitTyp, x: number, y: number): Enemy | null;
  spawnFeind(typ: RtsUnitTyp, x: number, y: number): void;
  feinde(): Enemy[];
  istAktiv(e: Enemy): boolean;      // lebt der Enemy noch in der Szene?
  entferne(e: Enemy): void;         // Verbündeten aus der Szene nehmen (RTS-Ende/[alle entfernen])
  entferneAlleFeinde(): void;
}

export class RtsBattle {
  units: RtsUnit[] = [];
  private host: RtsHost;
  private held: HeldRef;
  gfx: Phaser.GameObjects.Graphics;
  fxg: Phaser.GameObjects.Graphics;
  aktiveForm: Form = 'linie';
  boxStart: { x: number; y: number } | null = null;
  boxNow: { x: number; y: number } | null = null;
  linieStart: { x: number; y: number } | null = null;
  linieNow: { x: number; y: number } | null = null;
  private lastKlickT = -999; private lastKlickTyp: RtsUnitTyp | null = null;
  marker: Array<{ x: number; y: number; t: number; feind: boolean }> = [];
  hover: { x: number; y: number } | null = null;   // P18: Zeigerposition fuer Feind-Hervorhebung
  heldGewaehlt = false;
  onFeedback?: (text: string) => void;

  constructor(host: RtsHost, held: HeldRef) {
    this.host = host; this.held = held;
    this.gfx = host.scene.add.graphics().setDepth(6100);
    this.fxg = host.scene.add.graphics().setDepth(6099);
  }

  destroy(): void {
    for (const u of this.units) if (!u.tot) this.host.entferne(u.ref);
    this.units = [];
    this.gfx.destroy(); this.fxg.destroy();
  }

  // --- Spawnen ---------------------------------------------------------------
  // Eigene Typen werden als VERBÜNDETE Dungeon-Enemies gespawnt; Feind-Typen
  // als echte Monster (spawnEnemy) - beide kämpfen mit der Dungeon-Technik.
  spawn(typ: RtsUnitTyp, x: number, y: number): RtsUnit | null {
    const d = RTS_UNIT_TYP[typ];
    if (d.team === 'feind') { this.host.spawnFeind(typ, x, y); return null; }
    const ref = this.host.spawnAlly(typ, x, y);
    if (!ref) { this.feedback(`${d.name}: Spawn nicht möglich`); return null; }
    const u: RtsUnit = {
      ref, typ, x, y, hp: ref.hp, maxhp: ref.maxhp, basisDmg: ref.dmg,
      tot: false, gewaehlt: false, stance: 'aggressiv', rank: d.rank,
      grp: null, off: null, fokusRef: null, turm: null, buffDmg: 1,
    };
    this.units.push(u);
    return u;
  }

  spawnTrupp(typen: RtsUnitTyp[], zx: number, zy: number): void {
    typen.forEach((t, i) => { this.spawn(t, zx + ((i % 4) - 1.5) * 26, zy + Math.floor(i / 4) * 26); });
  }

  alleEntfernen(): void {
    for (const u of this.units) if (!u.tot) this.host.entferne(u.ref);
    this.units = [];
    this.host.entferneAlleFeinde();
    this.verloren = false;
  }

  verloren = false;
  schlachtVerloren(): void {
    if (this.verloren) return;
    this.verloren = true;
    for (const u of this.units) { u.grp = null; u.off = null; u.fokusRef = null; u.turm = null; u.gewaehlt = false; }
    this.setHeldGewaehlt(false);
    this.feedback('Der Schlachtführer ist gefallen - die Truppe bricht und flieht');
  }

  gewaehlte(): RtsUnit[] { return this.units.filter((u) => u.gewaehlt && !u.tot); }
  private lebendeEigene(): RtsUnit[] { return this.units.filter((u) => !u.tot); }

  // --- Eingabe ----------------------------------------------------------------
  mausRunter(wx: number, wy: number, rechts: boolean, shift: boolean): boolean {
    if (rechts) { this.linieStart = { x: wx, y: wy }; this.linieNow = { x: wx, y: wy }; return true; }
    this.boxStart = { x: wx, y: wy }; this.boxNow = { x: wx, y: wy };
    (this as unknown as { _shift: boolean })._shift = shift;
    return true;
  }
  mausBewegt(wx: number, wy: number): void {
    if (this.boxStart) this.boxNow = { x: wx, y: wy };
    if (this.linieStart) this.linieNow = { x: wx, y: wy };
  }
  mausHoch(): boolean {
    let getan = false;
    if (this.boxStart && this.boxNow) { this.rahmenWaehlen((this as unknown as { _shift?: boolean })._shift ?? false); getan = true; }
    if (this.linieStart && this.linieNow) { this.rechtsBefehl(); getan = true; }
    this.boxStart = this.boxNow = this.linieStart = this.linieNow = null;
    return getan;
  }

  private feindBei(x: number, y: number): Enemy | null {
    let best: Enemy | null = null, bd = 28;
    for (const e of this.host.feinde()) { const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  private eigeneBei(x: number, y: number): RtsUnit | null {
    let best: RtsUnit | null = null, bd = 24;
    for (const u of this.units) { if (u.tot) continue; const d = Math.hypot(u.x - x, u.y - y); if (d < bd) { bd = d; best = u; } }
    return best;
  }

  private setHeldGewaehlt(b: boolean): void { this.heldGewaehlt = b; this.held.setGewaehlt(b); }

  private rahmenWaehlen(shift: boolean): void {
    const x0 = Math.min(this.boxStart!.x, this.boxNow!.x), x1 = Math.max(this.boxStart!.x, this.boxNow!.x);
    const y0 = Math.min(this.boxStart!.y, this.boxNow!.y), y1 = Math.max(this.boxStart!.y, this.boxNow!.y);
    const klick = Math.hypot(x1 - x0, y1 - y0) < 6;
    if (klick) {
      const heldTreffer = this.held.naheKlick(x0, y0);
      const best = this.eigeneBei(x0, y0);
      const jetzt = this.host.scene.time.now;
      const doppel = !!best && jetzt - this.lastKlickT < 320 && this.lastKlickTyp === best.typ;
      this.lastKlickT = jetzt; this.lastKlickTyp = best?.typ ?? null;
      if (!shift) { for (const u of this.units) u.gewaehlt = false; this.setHeldGewaehlt(false); }
      if (heldTreffer) { this.setHeldGewaehlt(true); this.feedback('Held gewählt'); }
      else if (doppel && best) {
        for (const u of this.units) if (!u.tot && u.typ === best.typ) u.gewaehlt = true;
        this.feedback(`Alle ${RTS_UNIT_TYP[best.typ].name} gewählt`);
      } else if (best) { best.gewaehlt = shift ? !best.gewaehlt : true; this.feedback(RTS_UNIT_TYP[best.typ].name + ' gewählt'); }
    } else {
      if (!shift) { for (const u of this.units) u.gewaehlt = false; this.setHeldGewaehlt(false); }
      // P15: der Held ist per Box-Select GRUPPIERBAR wie die NPCs
      const hp = this.held.pos();
      if (this.held.lebt() && hp.x >= x0 && hp.x <= x1 && hp.y >= y0 && hp.y <= y1) this.setHeldGewaehlt(true);
      let n = 0;
      for (const u of this.units) { if (u.tot) continue; if (u.x >= x0 && u.x <= x1 && u.y >= y0 && u.y <= y1) { u.gewaehlt = true; n++; } }
      if (n || this.heldGewaehlt) this.feedback(`${n}${this.heldGewaehlt ? ' + Held' : ''} gewählt`);
    }
  }

  private turmBei(x: number, y: number): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null, bd: number = TURM.andockRadius;
    for (const t of this.host.tuerme()) { const dd = Math.hypot(t.x - x, t.y - y); if (dd < bd) { bd = dd; best = t; } }
    return best;
  }

  private rechtsBefehl(): void {
    const a = this.linieStart!, b = this.linieNow!;
    if (Math.hypot(b.x - a.x, b.y - a.y) > 44) { this.formiereEntlangLinie(a, b); return; }
    const turm = this.turmBei(b.x, b.y);
    if (turm) { this.befehlTurm(turm); return; }
    const ef = this.feindBei(b.x, b.y);
    if (ef) {
      this.befehlFokus(ef);
      if (this.heldGewaehlt) this.held.befehlAngriff(ef.x, ef.y);
      this.marker.push({ x: ef.x, y: ef.y, t: 0.8, feind: true });
      this.feedback('Angriff auf ' + ef.name);
      this.host.play('klick', 0.5);
    } else {
      this.befehlMarsch(b, false);
      if (this.heldGewaehlt) this.held.befehlMarsch(b.x, b.y);
      this.marker.push({ x: b.x, y: b.y, t: 0.8, feind: false });
    }
  }

  setForm(form: Form): void { this.aktiveForm = form; this.formiere(form); }
  setStance(s: Stance): void {
    const g = this.gewaehlte();
    // R100g (Autor "Haltung Angriff, aber NPCs greifen nicht an"): Angriff/Verteidigen
    // machen die Einheit AKTIV (passiv aus) - sie sucht/reagiert dann selbst. Nur
    // 'halten' laesst sie stehen.
    for (const u of g) { u.stance = s; if (s !== 'halten') u.ref.passiv = false; }
    if (g.length) this.feedback('Haltung: ' + s);
  }
  angriffsMarsch(wx: number, wy: number): void { this.befehlMarsch({ x: wx, y: wy }, true); if (this.heldGewaehlt) this.held.befehlMarsch(wx, wy); this.marker.push({ x: wx, y: wy, t: 0.8, feind: true }); this.feedback('Angriffsmarsch'); }
  stellungHalten(): void { const g = this.gewaehlte(); for (const u of g) { u.stance = 'halten'; u.grp = null; u.off = null; u.fokusRef = null; u.ref.passiv = false; } if (g.length) this.feedback('Stellung halten'); }

  private feedback(t: string): void { this.onFeedback?.(t); }

  private zumFeind(x: number, y: number): number {
    const fs = this.host.feinde();
    if (!fs.length) return 0;
    let sx = 0, sy = 0; for (const f of fs) { sx += f.x; sy += f.y; }
    return Math.atan2(sy / fs.length - y, sx / fs.length - x);
  }

  private formiere(form: Form): void {
    const sel = this.gewaehlte(); if (!sel.length) return;
    const cx = sel.reduce((a, u) => a + u.x, 0) / sel.length, cy = sel.reduce((a, u) => a + u.y, 0) / sel.length;
    const grp: Gruppe = { anker: { x: cx, y: cy }, facing: this.zumFeind(cx, cy), ziel: null, manuell: false, angriffsMarsch: false };
    const sortiert = [...sel].sort((a, b) => a.rank - b.rank);
    const slots = formSlots(sortiert.length, form, 30);
    sortiert.forEach((u, i) => { this.verlasseTurm(u); u.grp = grp; u.off = slots[i]; u.fokusRef = null; u.ref.passiv = false; });
    this.host.play('klick', 0.6);
  }

  private formiereEntlangLinie(a: { x: number; y: number }, b: { x: number; y: number }): void {
    const sel = this.gewaehlte(); if (!sel.length) return;
    const grp = this.baueLinienGruppe(sel, a, b);
    grp.zuweisung.forEach(({ u, slot }) => { this.verlasseTurm(u); u.grp = grp.gruppe; u.off = slot; u.fokusRef = null; u.ref.passiv = false; });
    this.host.play('klick', 0.6);
  }

  private baueLinienGruppe(sel: RtsUnit[], a: { x: number; y: number }, b: { x: number; y: number }): { gruppe: Gruppe; zuweisung: Array<{ u: RtsUnit; slot: Slot }> } {
    const laenge = Math.hypot(b.x - a.x, b.y - a.y);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (this.aktiveForm === 'linie' || this.aktiveForm === 'locker') {
      const dir = Math.atan2(b.y - a.y, b.x - a.x);
      let facing = dir + Math.PI / 2;
      const fs = this.host.feinde();
      if (fs.length) {
        let sx = 0, sy = 0; for (const f of fs) { sx += f.x; sy += f.y; }
        const toE = Math.atan2(sy / fs.length - mid.y, sx / fs.length - mid.x);
        if (Math.cos(facing - toE) < 0) facing = dir - Math.PI / 2;
      }
      const proj = (u: RtsUnit) => (u.x - a.x) * Math.cos(dir) + (u.y - a.y) * Math.sin(dir);
      const sortiert = [...sel].sort((u, v) => proj(u) - proj(v));
      const slots = linienSlots(sortiert.map((u) => u.rank), laenge, 30);
      const gruppe: Gruppe = { anker: mid, facing, ziel: null, manuell: false, angriffsMarsch: false };
      return { gruppe, zuweisung: sortiert.map((u, i) => ({ u, slot: slots[i] })) };
    }
    const facing = Math.atan2(b.y - a.y, b.x - a.x);
    const sortiert = [...sel].sort((u, v) => u.rank - v.rank);
    const slots = formSlotsSkaliert(sortiert.length, this.aktiveForm, laenge);
    const gruppe: Gruppe = { anker: mid, facing, ziel: null, manuell: false, angriffsMarsch: false };
    return { gruppe, zuweisung: sortiert.map((u, i) => ({ u, slot: slots[i] })) };
  }

  private befehlMarsch(ziel: { x: number; y: number }, angriff: boolean): void {
    const sel = this.gewaehlte(); if (!sel.length) return;
    const cx = sel.reduce((a, u) => a + u.x, 0) / sel.length, cy = sel.reduce((a, u) => a + u.y, 0) / sel.length;
    const grp: Gruppe = { anker: { x: cx, y: cy }, facing: Math.atan2(ziel.y - cy, ziel.x - cx), ziel, manuell: true, angriffsMarsch: angriff };
    sel.forEach((u) => { this.verlasseTurm(u); u.grp = grp; u.off = { f: u.x - cx, l: u.y - cy }; u.fokusRef = null; u.ref.passiv = false; });
    this.host.play('klick', 0.5);
  }

  private befehlFokus(ef: Enemy): void {
    for (const u of this.gewaehlte()) { this.verlasseTurm(u); if (u.grp) u.grp.ziel = null; u.grp = null; u.off = null; u.fokusRef = ef; u.ref.passiv = false; }
  }

  private befehlTurm(t: { x: number; y: number }): void {
    const drin = this.units.filter((u) => !u.tot && u.turm && Math.hypot(u.turm.x - t.x, u.turm.y - t.y) < 4).length;
    let frei = TURM.kapazitaet - drin;
    const sel = [...this.gewaehlte()].sort((a, b) => b.rank - a.rank);   // Fernkämpfer (hoher Rang) zuerst
    let hoch = 0;
    for (const u of sel) {
      if (frei <= 0) break;
      u.turm = { x: t.x, y: t.y }; u.grp = null; u.off = null; u.fokusRef = null; u.ref.passiv = false;
      frei--; hoch++;
    }
    if (hoch) { this.host.play('klick', 0.6); this.feedback(hoch === 1 ? 'Einheit bezieht den Wachturm' : `${hoch} Einheiten beziehen den Wachturm`); }
    else this.feedback('Der Wachturm ist voll besetzt');
  }

  private verlasseTurm(u: RtsUnit): void { u.turm = null; }

  // --- Simulation (nur noch Befehls-Steuerung; der KAMPF läuft im Enemy-System)
  update(dt: number): void {
    this.fxg.clear();
    this.raeumeWegfelder();
    this.wendeLagerAurenAn(dt);
    this.aktualisiereGruppen(dt);
    for (const u of this.units) if (!u.tot) this.steuereEinheit(u);
    for (const m of this.marker) m.t -= dt;
    this.marker = this.marker.filter((m) => m.t > 0);
    this.units = this.units.filter((u) => !u.tot);
  }

  // Befehle in den Enemy-Ref schreiben: jagdZiel = Marsch/Stellung,
  // fokusZiel = gezielter Angriff, null-jagdZiel = Dungeon-KI kämpft frei.
  private steuereEinheit(u: RtsUnit): void {
    const ref = u.ref;
    if (ref.hp <= 0 || !this.host.istAktiv(ref)) { u.tot = true; u.gewaehlt = false; return; }
    u.x = ref.x; u.y = ref.y; u.hp = ref.hp; u.maxhp = ref.maxhp;
    ref.dmg = Math.round(u.basisDmg * u.buffDmg);   // Feldküchen-Aura
    // R100b: passive (frisch gesetzte) Einheit steht still - nicht steuern, bis
    // sie geweckt (Gegner nah) oder befohlen wird (Befehle loeschen passiv).
    if (ref.passiv) return;
    if (this.verloren) {
      // Rout: weg vom nächsten Feind
      const f = this.naechsterFeind(u);
      ref.fokusZiel = null;
      if (f) { const dx = u.x - f.x, dy = u.y - f.y, d = Math.hypot(dx, dy) || 1; ref.jagdZiel = { x: u.x + dx / d * 80, y: u.y + dy / d * 80 }; }
      return;
    }
    if (u.turm) {
      // R100c: zwei Phasen. 1) ANLAUFEN an den Turm-FUSS ueber das Wegfeld (von
      // der erreichbaren Seite, auch an einer Palisaden-Ecke). 2) KLETTERN: nah
      // genug -> auf die Plattform FIXIEREN (festPos), steht still + schiesst.
      if (ref.festPos) return;
      const fussD = Math.hypot(ref.x - u.turm.x, ref.y - u.turm.y);
      if (fussD < 30) {
        ref.jagdZiel = null;
        ref.festPos = { x: u.turm.x, y: u.turm.y - TURM.hoeheOffset };
        ref.turmReichF = TURM.reichF;
      } else {
        ref.jagdZiel = { x: u.turm.x, y: u.turm.y };
      }
      return;
    }
    // Turm verlassen: Fixierung loesen
    if (ref.festPos) { ref.festPos = null; ref.turmReichF = 1; }
    if (u.fokusRef && u.fokusRef.hp > 0 && this.host.istAktiv(u.fokusRef)) {
      ref.fokusZiel = u.fokusRef;
      ref.jagdZiel = null;
      return;
    }
    u.fokusRef = null; ref.fokusZiel = null;
    const slot = this.slotWeltPos(u);
    const f = this.naechsterFeind(u);
    const fd = f ? Math.hypot(f.x - u.x, f.y - u.y) : Infinity;
    if (slot) {
      const dS = Math.hypot(slot.x - u.x, slot.y - u.y);
      if (u.grp?.angriffsMarsch && fd < 160) { ref.jagdZiel = null; return; }   // Angriffsmarsch: unterwegs kämpfen
      if (dS > 10) { ref.jagdZiel = slot; return; }
      ref.jagdZiel = fd < 70 ? null : slot;   // am Slot: kämpfen wenn der Feind ansteht
      return;
    }
    // lose Einheit nach Haltung
    if (u.stance === 'halten') { ref.jagdZiel = fd < 48 ? null : { x: u.x, y: u.y }; return; }
    const aggro = u.stance === 'aggressiv' ? 320 : 150;
    ref.jagdZiel = fd < aggro ? null : { x: u.x, y: u.y };
  }

  private naechsterFeind(u: RtsUnit): Enemy | null {
    let best: Enemy | null = null, bd = 1e9;
    for (const e of this.host.feinde()) { const d = Math.hypot(e.x - u.x, e.y - u.y); if (d < bd) { bd = d; best = e; } }
    return best;
  }

  // Lager-Auren (R97): Regeneration + Schadens-Buff wirken auf die Enemy-Refs.
  private wendeLagerAurenAn(dt: number): void {
    const bauten = this.host.lager();
    const r2 = LAGER_EFFEKT.radius * LAGER_EFFEKT.radius;
    for (const u of this.units) {
      u.buffDmg = 1;
      if (u.tot) continue;
      let heal = 0;
      for (const b of bauten) {
        if ((u.x - b.x) ** 2 + (u.y - b.y) ** 2 > r2) continue;
        if (b.typ === 'zelt' || b.typ === 'lazarett') heal = Math.max(heal, LAGER_EFFEKT.zeltRegen);
        else if (b.typ === 'nachschub') heal = Math.max(heal, LAGER_EFFEKT.nachschubRegen);
        else if (b.typ === 'feldaltar') heal = Math.max(heal, LAGER_EFFEKT.altarHeal);
        else if (b.typ === 'kochstelle') u.buffDmg = Math.max(u.buffDmg, LAGER_EFFEKT.kochDmg);
      }
      if (heal > 0 && u.ref.hp < u.ref.maxhp) u.ref.hp = Math.min(u.ref.maxhp, u.ref.hp + heal * dt);
    }
  }

  private aktualisiereGruppen(dt: number): void {
    const gesehen = new Set<Gruppe>();
    for (const u of this.units) {
      if (u.tot || !u.grp) continue;
      const g = u.grp;
      if (gesehen.has(g)) continue; gesehen.add(g);
      if (g.manuell && g.ziel) {
        const d = Math.hypot(g.ziel.x - g.anker.x, g.ziel.y - g.anker.y);
        if (d < 6) { g.ziel = null; }
        else {
          const sp = 60 * dt;
          g.anker.x += (g.ziel.x - g.anker.x) / d * sp;
          g.anker.y += (g.ziel.y - g.anker.y) / d * sp;
          g.facing = Math.atan2(g.ziel.y - g.anker.y, g.ziel.x - g.anker.x);
        }
      }
    }
  }

  private slotWeltPos(u: RtsUnit): { x: number; y: number } | null {
    if (!u.grp || !u.off) return null;
    if (u.grp.manuell) return { x: u.grp.anker.x + u.off.f, y: u.grp.anker.y + u.off.l };
    return slotWelt(u.grp.anker, u.grp.facing, u.off);
  }

  // --- Wegfeld (P17): wird von den Verbündeten-Proxies + dem Held genutzt ----
  private wegfelder = new Map<string, { feld: Wegfeld; t: number }>();
  wegPunkt(team: RtsTeam, vonX: number, vonY: number, ziel: { x: number; y: number }): { x: number; y: number } | null {
    const g = this.host.gitter();
    if (!g) return null;
    const ztx = Math.max(0, Math.min(g.w - 1, Math.floor(ziel.x / TILE))), zty = Math.max(0, Math.min(g.h - 1, Math.floor(ziel.y / TILE)));
    const key = `${team}:${ztx},${zty}`;
    let e = this.wegfelder.get(key);
    const now = this.host.scene.time.now;
    if (!e || !e.feld.passt(g.w, g.h)) { e = { feld: new Wegfeld(g.w, g.h), t: -1e9 }; this.wegfelder.set(key, e); }
    if (now - e.t > 300 || e.feld.zielTx !== ztx || e.feld.zielTy !== zty) {
      e.t = now;
      e.feld.berechne(ztx, zty, (tx, ty) => this.host.begehbar(tx, ty, team));
    }
    const nb = e.feld.bestesNachbarfeld(Math.floor(vonX / TILE), Math.floor(vonY / TILE));
    return nb ? { x: nb.tx * TILE + TILE / 2, y: nb.ty * TILE + TILE / 2 } : null;
  }
  private raeumeWegfelder(): void {
    const now = this.host.scene.time.now;
    for (const [k, e] of this.wegfelder) if (now - e.t > 2000) this.wegfelder.delete(k);
  }

  // --- Overlay (Ringe, HP, Marker, Box, Ghost) - P18-Feedback ----------------
  zeichneOverlay(): void {
    const g = this.gfx; g.clear();
    // R100c: Haltungs-Farbe (Autor "man sieht nicht welche Haltung aktiv ist")
    const stanceCol = (s: Stance): number => s === 'aggressiv' ? 0xd0603a : s === 'verteidigen' ? 0x4a8ad0 : 0x9a9a9a;
    for (const u of this.units) {
      if (u.tot) continue;
      // kleiner Haltungs-Punkt ueber JEDER Einheit (rot=Angriff, blau=Verteidigen, grau=Halten)
      g.fillStyle(stanceCol(u.stance), 0.95); g.fillCircle(u.x, u.y - 30, 2.6);
      if (u.gewaehlt) { g.lineStyle(1.5, stanceCol(u.stance), 0.95); g.strokeEllipse(u.x, u.y + 9, 24, 11); }
      if (u.hp < u.maxhp || u.gewaehlt) {
        const w = 22, frac = Math.max(0, u.hp / u.maxhp);
        g.fillStyle(0x000000, 0.5); g.fillRect(u.x - w / 2 - 1, u.y - 27, w + 2, 4);
        g.fillStyle(0x5ac85a, 1); g.fillRect(u.x - w / 2, u.y - 26, w * frac, 2);
      }
    }
    // Feind-HP (Feedback beim Anvisieren): nur beschädigte
    for (const e of this.host.feinde()) {
      if (e.hp >= e.maxhp) continue;
      const w = 22, frac = Math.max(0, e.hp / e.maxhp);
      g.fillStyle(0x000000, 0.5); g.fillRect(e.x - w / 2 - 1, e.y - 27, w + 2, 4);
      g.fillStyle(0xc85a5a, 1); g.fillRect(e.x - w / 2, e.y - 26, w * frac, 2);
    }
    // P18: Feind unterm Zeiger rot hervorheben (Angriffsziel-Feedback)
    if (this.hover) {
      const hz = this.feindBei(this.hover.x, this.hover.y);
      if (hz) { g.lineStyle(1.5, 0xe05a4a, 0.95); g.strokeEllipse(hz.x, hz.y + 9, 26, 12); }
    }
    for (const m of this.marker) {
      const a = Math.min(1, m.t / 0.8);
      g.lineStyle(2, m.feind ? 0xe05a4a : 0x9ad86a, a);
      g.strokeCircle(m.x, m.y, 8 + (1 - a) * 10);
    }
    if (this.boxStart && this.boxNow) {
      const x0 = Math.min(this.boxStart.x, this.boxNow.x), y0 = Math.min(this.boxStart.y, this.boxNow.y);
      g.lineStyle(1, 0x9ad86a, 0.9); g.fillStyle(0x9ad86a, 0.08);
      g.fillRect(x0, y0, Math.abs(this.boxNow.x - this.boxStart.x), Math.abs(this.boxNow.y - this.boxStart.y));
      g.strokeRect(x0, y0, Math.abs(this.boxNow.x - this.boxStart.x), Math.abs(this.boxNow.y - this.boxStart.y));
    }
    if (this.linieStart && this.linieNow && Math.hypot(this.linieNow.x - this.linieStart.x, this.linieNow.y - this.linieStart.y) > 44) {
      const sel = this.gewaehlte();
      if (sel.length) {
        const { gruppe, zuweisung } = this.baueLinienGruppe(sel, this.linieStart, this.linieNow);
        g.lineStyle(1.5, 0xc9a227, 0.9);
        for (const { slot } of zuweisung) {
          const p = slotWelt(gruppe.anker, gruppe.facing, slot);
          g.strokeCircle(p.x, p.y, 7);
        }
      }
      g.lineStyle(1, 0xc9a227, 0.5); g.lineBetween(this.linieStart.x, this.linieStart.y, this.linieNow.x, this.linieNow.y);
    }
  }

  zaehlung(): { eigene: number; feind: number } {
    return { eigene: this.lebendeEigene().length, feind: this.host.feinde().length };
  }
}
