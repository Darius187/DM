// RTS-Schlacht-Schicht für die Spielwelt (R96, Autorwunsch: "übernimm
// formationen.ts/SchlachtProbe größtenteils in unsere Spielwelt - Einheiten
// wählen (Klick/Gummiband/Doppelklick/Shift), Rechtsklick-Befehle, Rechts-Ziehen
// = Formation mit Ghost-Vorschau, A = Angriffsmarsch, H = Stellung halten, dazu
// NPCs UND Monster zum Testen spawnen").
//
// Diese Klasse kapselt die Einheiten-Simulation + Auswahl + Befehle. Der Held
// bleibt eine SONDER-Einheit der Szene (WorldScene reicht ihn als heldRef herein):
// er ist auswählbar/befehligbar wie eine Einheit, behält aber seine ARPG-Ebene.

import Phaser from 'phaser';
import type { SpriteProvider } from '../gfx/SpriteProvider';
import { formSlots, formSlotsSkaliert, linienSlots, slotWelt, type Form, type Slot } from './formationen';
import { RTS_UNIT_TYP, TURM, LAGER_EFFEKT, type RtsUnitTyp, type RtsTeam } from '../data/rts';

export type Stance = 'aggressiv' | 'verteidigen' | 'halten';

interface Gruppe { anker: { x: number; y: number }; facing: number; ziel: { x: number; y: number } | null; manuell: boolean; angriffsMarsch: boolean }

export interface RtsUnit {
  sprite: Phaser.GameObjects.Sprite;
  team: RtsTeam; typ: RtsUnitTyp; figur: string; heiler: boolean; groesse: number; tint?: number;
  x: number; y: number; hp: number; maxhp: number; dmg: number; reich: number; reichBasis: number; speed: number; rank: number;
  atkCd: number; dir: number; step: number; stepT: number; flash: number; tot: boolean; gewaehlt: boolean;
  stance: Stance;
  grp: Gruppe | null; off: Slot | null; ziel: { x: number; y: number } | null; fokus: RtsUnit | null;
  turm: { x: number; y: number } | null;   // R96: besetzt diesen Wachturm (erhöht, mehr Reichweite)
  buffDmg: number; buffSchutz: number;      // R97: Lager-Auren (Feldküche/Feldaltar), je Frame neu
}

// Der Held wird der Simulation als leichtes Ziel/Angreifer bekannt gemacht und
// ist zugleich eine SONDER-Einheit: auswählbar und befehligbar wie eine Einheit.
export interface HeldRef {
  pos(): { x: number; y: number };
  lebt(): boolean;
  schaden(n: number): void;         // Feind trifft den Helden
  naheKlick(wx: number, wy: number): boolean;   // Klick nah genug am Helden?
  setGewaehlt(b: boolean): void;    // Auswahlring am Helden an/aus
  befehlMarsch(x: number, y: number): void;
  befehlAngriff(x: number, y: number): void;
}

export interface RtsHost {
  scene: Phaser.Scene;
  provider: SpriteProvider;
  play(key: string, vol?: number): void;
  isSolid(x: number, y: number): boolean;
  tuerme(): Array<{ x: number; y: number }>;   // Wachturm-Positionen (Besatzung)
  lager(): Array<{ typ: string; x: number; y: number }>;   // Lager-Wirk-Bauten (Auren)
}

export class RtsBattle {
  units: RtsUnit[] = [];
  private host: RtsHost;
  private held: HeldRef;
  gfx: Phaser.GameObjects.Graphics;
  fxg: Phaser.GameObjects.Graphics;
  aktiveForm: Form = 'linie';
  // Auswahl-/Befehls-Zug (Weltkoordinaten)
  boxStart: { x: number; y: number } | null = null;
  boxNow: { x: number; y: number } | null = null;
  linieStart: { x: number; y: number } | null = null;
  linieNow: { x: number; y: number } | null = null;
  private lastKlickT = -999; private lastKlickTyp: RtsUnitTyp | null = null;
  marker: Array<{ x: number; y: number; t: number; feind: boolean }> = [];
  heldGewaehlt = false;
  // Rückmeldung, welche Einheit/welchen Feind man zuletzt anvisiert hat.
  onFeedback?: (text: string) => void;

  constructor(host: RtsHost, held: HeldRef) {
    this.host = host; this.held = held;
    this.gfx = host.scene.add.graphics().setDepth(6100);   // Ringe/Marker unter der UI, über der Welt
    this.fxg = host.scene.add.graphics().setDepth(6099);
  }

  destroy(): void {
    for (const u of this.units) u.sprite.destroy();
    this.units = [];
    this.gfx.destroy(); this.fxg.destroy();
  }

  // --- Spawnen --------------------------------------------------------------
  spawn(typ: RtsUnitTyp, x: number, y: number): RtsUnit {
    const d = RTS_UNIT_TYP[typ];
    const groesse = d.groesse ?? 1;
    const sprite = this.host.scene.add.sprite(x, y, '__DEFAULT').setScale(groesse).setDepth(y);
    this.host.provider.applyFigure(sprite, d.figur, 0, 0);
    if (d.tint) sprite.setTint(d.tint);
    const u: RtsUnit = {
      sprite, team: d.team, typ, figur: d.figur, heiler: d.heiler, groesse, tint: d.tint,
      x, y, hp: d.hp, maxhp: d.hp, dmg: d.dmg, reich: d.reich, reichBasis: d.reich, speed: d.speed, rank: d.rank,
      atkCd: 0, dir: 0, step: 0, stepT: 0, flash: 0, tot: false, gewaehlt: false,
      stance: 'aggressiv', grp: null, off: null, ziel: null, fokus: null, turm: null,
      buffDmg: 1, buffSchutz: 1,
    };
    this.units.push(u);
    return u;
  }

  // Eine kleine Abteilung nach Rolle streuen (Test-Knöpfe).
  spawnTrupp(typen: RtsUnitTyp[], zx: number, zy: number): void {
    typen.forEach((t, i) => {
      const rx = zx + ((i % 4) - 1.5) * 26;
      const ry = zy + Math.floor(i / 4) * 26;
      this.spawn(t, rx, ry);
    });
  }

  alleEntfernen(): void {
    for (const u of this.units) u.sprite.destroy();
    this.units = [];
    this.verloren = false;
  }

  // R97: fällt der Schlachtführer (Held), bricht die eigene Truppe und flieht.
  verloren = false;
  schlachtVerloren(): void {
    if (this.verloren) return;
    this.verloren = true;
    for (const u of this.units) if (u.team === 'spieler') { u.grp = null; u.off = null; u.ziel = null; u.fokus = null; this.verlasseTurm(u); u.stance = 'halten'; u.gewaehlt = false; }
    this.setHeldGewaehlt(false);
    this.feedback('Der Schlachtführer ist gefallen - die Truppe bricht und flieht');
  }

  private lebende(team: RtsTeam): RtsUnit[] { return this.units.filter((u) => !u.tot && u.team === team); }
  gewaehlte(): RtsUnit[] { return this.units.filter((u) => u.gewaehlt && !u.tot && u.team === 'spieler'); }

  private heeresMitte(team: RtsTeam): { x: number; y: number } | null {
    let sx = 0, sy = 0, n = 0;
    for (const u of this.units) if (!u.tot && u.team === team) { sx += u.x; sy += u.y; n++; }
    return n ? { x: sx / n, y: sy / n } : null;
  }

  // --- Eingabe (von der Szene weitergereicht) -------------------------------
  // Rückgabe true = Zeiger verbraucht (kein Weltangriff/Build).
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
  // Rückgabe: true, wenn ein Auswahl-/Befehlsvorgang abgeschlossen wurde.
  mausHoch(): boolean {
    let getan = false;
    if (this.boxStart && this.boxNow) { this.rahmenWaehlen((this as unknown as { _shift?: boolean })._shift ?? false); getan = true; }
    if (this.linieStart && this.linieNow) { this.rechtsBefehl(); getan = true; }
    this.boxStart = this.boxNow = this.linieStart = this.linieNow = null;
    return getan;
  }

  private feindBei(x: number, y: number): RtsUnit | null {
    let best: RtsUnit | null = null, bd = 26;
    for (const u of this.units) if (u.team === 'feind' && !u.tot) { const d = Math.hypot(u.x - x, u.y - y); if (d < bd) { bd = d; best = u; } }
    return best;
  }
  private eigeneBei(x: number, y: number): RtsUnit | null {
    let best: RtsUnit | null = null, bd = 24;
    for (const u of this.units) { if (u.team !== 'spieler' || u.tot) continue; const d = Math.hypot(u.x - x, u.y - y); if (d < bd) { bd = d; best = u; } }
    return best;
  }

  private setHeldGewaehlt(b: boolean): void { this.heldGewaehlt = b; this.held.setGewaehlt(b); }

  private rahmenWaehlen(shift: boolean): void {
    const x0 = Math.min(this.boxStart!.x, this.boxNow!.x), x1 = Math.max(this.boxStart!.x, this.boxNow!.x);
    const y0 = Math.min(this.boxStart!.y, this.boxNow!.y), y1 = Math.max(this.boxStart!.y, this.boxNow!.y);
    const klick = Math.hypot(x1 - x0, y1 - y0) < 6;
    if (klick) {
      const cx = x0, cy = y0;
      // Held zuerst (Sonder-Einheit): Klick nah am Helden wählt ihn.
      const heldTreffer = this.held.naheKlick(cx, cy);
      const best = this.eigeneBei(cx, cy);
      const jetzt = this.host.scene.time.now;
      const doppel = !!best && jetzt - this.lastKlickT < 320 && this.lastKlickTyp === best.typ;
      this.lastKlickT = jetzt; this.lastKlickTyp = best?.typ ?? null;
      if (!shift) { for (const u of this.units) u.gewaehlt = false; this.setHeldGewaehlt(false); }
      if (heldTreffer) { this.setHeldGewaehlt(true); this.feedback('Held gewählt'); }
      else if (doppel && best) {
        for (const u of this.units) if (u.team === 'spieler' && !u.tot && u.typ === best.typ) u.gewaehlt = true;
        this.feedback(`Alle ${RTS_UNIT_TYP[best.typ].name} gewählt`);
      } else if (best) { best.gewaehlt = shift ? !best.gewaehlt : true; this.feedback(RTS_UNIT_TYP[best.typ].name + ' gewählt'); }
    } else {
      if (!shift) { for (const u of this.units) u.gewaehlt = false; this.setHeldGewaehlt(false); }
      let n = 0;
      for (const u of this.units) { if (u.team !== 'spieler' || u.tot) continue; if (u.x >= x0 && u.x <= x1 && u.y >= y0 && u.y <= y1) { u.gewaehlt = true; n++; } }
      if (n) this.feedback(`${n} Einheiten gewählt`);
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
    // Rechtsklick auf einen Wachturm = Besatzung beziehen (Autorwunsch R96).
    const turm = this.turmBei(b.x, b.y);
    if (turm) { this.befehlTurm(turm); return; }
    const ef = this.feindBei(b.x, b.y);
    if (ef) {
      this.befehlFokus(ef);
      if (this.heldGewaehlt) this.held.befehlAngriff(ef.x, ef.y);
      this.marker.push({ x: ef.x, y: ef.y, t: 0.8, feind: true });
      this.feedback('Angriff auf ' + RTS_UNIT_TYP[ef.typ].name);
    } else {
      this.befehlMarsch(b, false);
      if (this.heldGewaehlt) this.held.befehlMarsch(b.x, b.y);
      this.marker.push({ x: b.x, y: b.y, t: 0.8, feind: false });
    }
  }

  setForm(form: Form): void { this.aktiveForm = form; this.formiere(form); }
  setStance(s: Stance): void { const g = this.gewaehlte(); for (const u of g) u.stance = s; if (g.length) this.feedback('Haltung: ' + s); }
  angriffsMarsch(wx: number, wy: number): void { this.befehlMarsch({ x: wx, y: wy }, true); if (this.heldGewaehlt) this.held.befehlMarsch(wx, wy); this.marker.push({ x: wx, y: wy, t: 0.8, feind: true }); this.feedback('Angriffsmarsch'); }
  stellungHalten(): void { const g = this.gewaehlte(); for (const u of g) { u.stance = 'halten'; u.grp = null; u.off = null; u.ziel = null; u.fokus = null; } if (g.length) this.feedback('Stellung halten'); }

  private feedback(t: string): void { this.onFeedback?.(t); }

  private zumFeind(x: number, y: number): number {
    const ec = this.heeresMitte('feind');
    return ec ? Math.atan2(ec.y - y, ec.x - x) : 0;
  }

  private formiere(form: Form): void {
    const sel = this.gewaehlte(); if (!sel.length) return;
    const cx = sel.reduce((a, u) => a + u.x, 0) / sel.length, cy = sel.reduce((a, u) => a + u.y, 0) / sel.length;
    const grp: Gruppe = { anker: { x: cx, y: cy }, facing: this.zumFeind(cx, cy), ziel: null, manuell: false, angriffsMarsch: false };
    const sortiert = [...sel].sort((a, b) => a.rank - b.rank);
    const slots = formSlots(sortiert.length, form, 30);
    sortiert.forEach((u, i) => { this.verlasseTurm(u); u.grp = grp; u.off = slots[i]; u.ziel = null; u.fokus = null; });
    this.host.play('klick', 0.6);
  }

  private formiereEntlangLinie(a: { x: number; y: number }, b: { x: number; y: number }): void {
    const sel = this.gewaehlte(); if (!sel.length) return;
    const grp = this.baueLinienGruppe(sel, a, b);
    grp.zuweisung.forEach(({ u, slot }) => { this.verlasseTurm(u); u.grp = grp.gruppe; u.off = slot; u.ziel = null; u.fokus = null; });
    this.host.play('klick', 0.6);
  }

  // Gemeinsame Slot-Berechnung für Ausführung UND Ghost-Vorschau.
  private baueLinienGruppe(sel: RtsUnit[], a: { x: number; y: number }, b: { x: number; y: number }): { gruppe: Gruppe; zuweisung: Array<{ u: RtsUnit; slot: Slot }> } {
    const laenge = Math.hypot(b.x - a.x, b.y - a.y);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (this.aktiveForm === 'linie' || this.aktiveForm === 'locker') {
      const dir = Math.atan2(b.y - a.y, b.x - a.x);
      let facing = dir + Math.PI / 2;
      const ec = this.heeresMitte('feind');
      if (ec) { const toE = Math.atan2(ec.y - mid.y, ec.x - mid.x); if (Math.cos(facing - toE) < 0) facing = dir - Math.PI / 2; }
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
    sel.forEach((u) => { this.verlasseTurm(u); u.grp = grp; u.off = { f: u.x - cx, l: u.y - cy }; u.ziel = null; u.fokus = null; });
    this.host.play('klick', 0.5);
  }

  private befehlFokus(ef: RtsUnit): void {
    for (const u of this.gewaehlte()) { this.verlasseTurm(u); if (u.grp) u.grp.ziel = null; u.grp = null; u.off = null; u.ziel = null; u.fokus = ef; }
    this.host.play('klick', 0.5);
  }

  // Wachturm besetzen: die gewählten Einheiten steigen hoch (bis Kapazität).
  // Fernkämpfer holen den großen Reichweiten-Bonus, Nahkampf nur wenig.
  private befehlTurm(t: { x: number; y: number }): void {
    const drin = this.units.filter((u) => u.turm && Math.hypot(u.turm.x - t.x, u.turm.y - t.y) < 4).length;
    let frei = TURM.kapazitaet - drin;
    // Fernkämpfer bevorzugt hochschicken (sie profitieren am meisten)
    const sel = [...this.gewaehlte()].sort((a, b) => b.reichBasis - a.reichBasis);
    let hoch = 0;
    for (const u of sel) {
      if (frei <= 0) break;
      u.turm = { x: t.x, y: t.y }; u.grp = null; u.off = null; u.ziel = null; u.fokus = null;
      u.reich = u.reichBasis + (u.reichBasis > 60 ? TURM.reichBonusFern : TURM.reichBonusNah);
      frei--; hoch++;
    }
    if (hoch) { this.host.play('klick', 0.6); this.feedback(hoch === 1 ? 'Einheit bezieht den Wachturm - Reichweite steigt' : `${hoch} Einheiten beziehen den Wachturm`); }
    else this.feedback('Der Wachturm ist voll besetzt');
  }

  private verlasseTurm(u: RtsUnit): void {
    if (u.turm) { u.turm = null; u.reich = u.reichBasis; }
  }

  // --- Simulation -----------------------------------------------------------
  update(dt: number): void {
    this.fxg.clear();
    this.wendeLagerAurenAn(dt);
    this.aktualisiereGruppen(dt);
    for (const u of this.units) if (!u.tot) this.updateUnit(u, dt);
    for (const m of this.marker) m.t -= dt;
    this.marker = this.marker.filter((m) => m.t > 0);
    // Tote entfernen
    for (const u of this.units) if (u.tot && u.sprite.active) { u.sprite.destroy(); }
    this.units = this.units.filter((u) => !u.tot);
  }

  // R97 "Lager zum Durchhalten": Auren der Wirk-Bauten auf eigene Einheiten im
  // Umkreis - Regeneration (Zelt/Nachschub/Altar), Schadensbuff (Feldküche),
  // Untoten-Schutz (Feldaltar). Buffs werden je Frame frisch berechnet.
  private wendeLagerAurenAn(dt: number): void {
    const bauten = this.host.lager();
    const r2 = LAGER_EFFEKT.radius * LAGER_EFFEKT.radius;
    for (const u of this.units) {
      u.buffDmg = 1; u.buffSchutz = 1;
      if (u.team !== 'spieler' || u.tot) continue;
      let heal = 0;
      for (const b of bauten) {
        if ((u.x - b.x) ** 2 + (u.y - b.y) ** 2 > r2) continue;
        if (b.typ === 'zelt') heal = Math.max(heal, LAGER_EFFEKT.zeltRegen);
        else if (b.typ === 'nachschub') heal = Math.max(heal, LAGER_EFFEKT.nachschubRegen);
        else if (b.typ === 'lazarett') heal = Math.max(heal, LAGER_EFFEKT.zeltRegen);
        else if (b.typ === 'feldaltar') { heal = Math.max(heal, LAGER_EFFEKT.altarHeal); u.buffSchutz = Math.min(u.buffSchutz, LAGER_EFFEKT.altarUntotSchutz); }
        else if (b.typ === 'kochstelle') u.buffDmg = Math.max(u.buffDmg, LAGER_EFFEKT.kochDmg);
      }
      if (heal > 0 && u.hp < u.maxhp) u.hp = Math.min(u.maxhp, u.hp + heal * dt);
    }
  }

  private aktualisiereGruppen(dt: number): void {
    // Manuelle Marsch-Gruppen bewegen ihren Anker zum Ziel; feste Formationen
    // stehen, bis sie ein neues Band bekommen.
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

  private naechsterFeind(u: RtsUnit): RtsUnit | null {
    const gegnerTeam: RtsTeam = u.team === 'spieler' ? 'feind' : 'spieler';
    let best: RtsUnit | null = null, bd = 260;
    for (const o of this.units) { if (o.tot || o.team !== gegnerTeam) continue; const d = Math.hypot(o.x - u.x, o.y - u.y); if (d < bd) { bd = d; best = o; } }
    return best;
  }

  private updateUnit(u: RtsUnit, dt: number): void {
    u.atkCd = Math.max(0, u.atkCd - dt);
    u.flash = Math.max(0, u.flash - dt);
    if (u.fokus && u.fokus.tot) u.fokus = null;

    // Auf dem Wachturm: erhöht stehen, weit schießen, nicht laufen (R96).
    if (u.turm) {
      u.x = u.turm.x; u.y = u.turm.y - TURM.hoeheOffset;
      const feind = this.naechsterFeind(u);
      if (feind && Math.hypot(feind.x - u.x, feind.y - u.y) <= u.reich) this.angriff(u, feind, TURM.dmgBonus);
      u.step = 0;
      this.zeichneUnit(u);
      return;
    }

    // Nach dem Fall des Schlachtführers fliehen die eigenen Truppen (Rout):
    // weg vom nächsten Feind, kein Angriff mehr.
    if (this.verloren && u.team === 'spieler') {
      const f = this.naechsterFeind(u);
      if (f) { const dx = u.x - f.x, dy = u.y - f.y, d = Math.hypot(dx, dy) || 1; this.laufe(u, { x: u.x + dx / d * 60, y: u.y + dy / d * 60 }, dt); }
      else u.step = 0;
      this.trenne(u); this.zeichneUnit(u); return;
    }

    let bewegtZu: { x: number; y: number } | null = null;
    const slot = this.slotWeltPos(u);

    if (u.heiler) {
      this.heilerHandeln(u);
      if (slot) { const d = Math.hypot(slot.x - u.x, slot.y - u.y); if (d > 4) bewegtZu = slot; }
    } else {
      const feind = u.fokus ?? this.naechsterFeind(u);
      const dF = feind ? Math.hypot(feind.x - u.x, feind.y - u.y) : Infinity;
      // Feind-Team greift auch den Helden an, wenn er näher ist.
      const heldNah = u.team === 'feind' && this.held.lebt() ? this.held.pos() : null;
      const dHeld = heldNah ? Math.hypot(heldNah.x - u.x, heldNah.y - u.y) : Infinity;
      if (heldNah && dHeld < dF && dHeld <= u.reich) { this.angriffHeld(u); }
      else if (feind && dF <= u.reich) { this.angriff(u, feind); }
      if (u.fokus && !u.fokus.tot && dF > u.reich) bewegtZu = { x: u.fokus.x, y: u.fokus.y };
      else if (slot && !(u.grp && u.grp.manuell && !u.grp.ziel && u.grp.angriffsMarsch === false)) {
        // In Formation zum (evtl. vorrückenden) Slot; Angriffsmarsch bricht aus,
        // wenn ein Feind im Weg ist.
        const dS = Math.hypot(slot.x - u.x, slot.y - u.y);
        if (u.grp?.angriffsMarsch && feind && dF < 130) bewegtZu = { x: feind.x, y: feind.y };
        else if (dS > 4) bewegtZu = slot;
      } else if (u.stance !== 'halten' && feind && dF > u.reich) {
        // Lose Einheiten (aggressiv/verteidigen) rücken auf den Feind vor.
        if (u.stance === 'aggressiv' || dF < 150) bewegtZu = { x: feind.x, y: feind.y };
      } else if (heldNah && u.team === 'feind' && dHeld > u.reich && dHeld < 320) {
        bewegtZu = heldNah;
      }
    }

    if (bewegtZu) this.laufe(u, bewegtZu, dt); else u.step = 0;
    this.trenne(u);
    this.zeichneUnit(u);
  }

  private heilerHandeln(u: RtsUnit): void {
    if (u.atkCd > 0) return;
    let ziel: RtsUnit | null = null, am = 0;
    for (const o of this.units) {
      if (o.tot || o.team !== u.team || o === u || o.hp >= o.maxhp) continue;
      const fehlt = o.maxhp - o.hp;
      if (fehlt > am && Math.hypot(o.x - u.x, o.y - u.y) <= u.reich) { am = fehlt; ziel = o; }
    }
    if (ziel) {
      ziel.hp = Math.min(ziel.maxhp, ziel.hp + u.dmg); u.atkCd = 0.9; ziel.flash = 0.1;
      this.fxg.lineStyle(2, 0x9ad86a, 0.7); this.fxg.lineBetween(u.x, u.y - 6, ziel.x, ziel.y - 6);
      this.host.play('heiliges_licht', 0.2);
    }
  }

  private angriff(u: RtsUnit, feind: RtsUnit, mult = 1): void {
    u.dir = this.achtRichtung(Math.atan2(feind.y - u.y, feind.x - u.x));
    if (u.atkCd > 0) return;
    u.atkCd = u.reich > 60 ? 1.1 : 0.7;
    feind.hp -= u.dmg * mult * u.buffDmg * feind.buffSchutz; feind.flash = 0.12;
    if (u.reich > 60) { this.fxg.lineStyle(1.5, 0xf0e0a0, 0.8); this.fxg.lineBetween(u.x, u.y - 6, feind.x, feind.y - 6); this.host.play('pfeil_schuss', 0.25); }
    else { this.host.play('schwert_slice1', 0.25); }
    if (feind.hp <= 0) { feind.tot = true; feind.gewaehlt = false; for (const o of this.units) if (o.fokus === feind) o.fokus = null; }
  }

  private angriffHeld(u: RtsUnit): void {
    if (u.atkCd > 0) return;
    u.atkCd = u.reich > 60 ? 1.1 : 0.8;
    this.held.schaden(u.dmg);
    const hp = this.held.pos();
    if (u.reich > 60) { this.fxg.lineStyle(1.5, 0xd06a4a, 0.8); this.fxg.lineBetween(u.x, u.y - 6, hp.x, hp.y - 6); }
  }

  private laufe(u: RtsUnit, ziel: { x: number; y: number }, dt: number): void {
    const dx = ziel.x - u.x, dy = ziel.y - u.y, d = Math.hypot(dx, dy);
    if (d < 1) { u.step = 0; return; }
    const sp = u.speed * dt;
    const ux = dx / d, uy = dy / d;
    const nx = u.x + ux * sp, ny = u.y + uy * sp;
    const r = 8;
    if (!this.host.isSolid(nx, u.y + r) && !this.host.isSolid(nx, u.y - r)) u.x = nx;
    if (!this.host.isSolid(u.x, ny + r) && !this.host.isSolid(u.x, ny - r)) u.y = ny;
    u.dir = this.achtRichtung(Math.atan2(uy, ux));
    u.stepT += dt;
    if (u.stepT > 0.14) { u.stepT = 0; u.step = (u.step + 1) % 4; }
  }

  // sanfte Trennung, damit Einheiten nicht ineinander stapeln
  private trenne(u: RtsUnit): void {
    for (const o of this.units) {
      if (o === u || o.tot) continue;
      const dx = u.x - o.x, dy = u.y - o.y; const d2 = dx * dx + dy * dy;
      const min = 13 * (u.groesse + o.groesse) * 0.5;
      if (d2 > 0.01 && d2 < min * min) {
        const d = Math.sqrt(d2); const push = (min - d) * 0.5;
        u.x += (dx / d) * push; u.y += (dy / d) * push;
      }
    }
  }

  private achtRichtung(rad: number): number {
    const a = ((rad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return Math.round(a / (Math.PI / 4)) % 8;
  }

  private zeichneUnit(u: RtsUnit): void {
    // Auf dem Turm über der Turmgrafik zeichnen (sonst nach Fußpunkt).
    u.sprite.setPosition(u.x, u.y).setDepth(u.turm ? u.turm.y + 2 : u.y + 12);
    this.host.provider.applyFigure(u.sprite, u.figur, u.dir, u.step);
    if (u.flash > 0) u.sprite.setTintFill(0xffffff);
    else if (u.tint) u.sprite.setTint(u.tint);
    else u.sprite.clearTint();
  }

  // --- Overlay (Ringe, Box, Ghost, Marker, HP) ------------------------------
  zeichneOverlay(): void {
    const g = this.gfx; g.clear();
    // Auswahl-Ringe
    for (const u of this.units) {
      if (!u.gewaehlt || u.tot) continue;
      g.lineStyle(1.5, 0x9ad86a, 0.9); g.strokeEllipse(u.x, u.y + 8 * u.groesse, 22 * u.groesse, 10 * u.groesse);
    }
    // HP-Balken über beschädigten/gewählten Einheiten
    for (const u of this.units) {
      if (u.tot) continue;
      if (u.hp >= u.maxhp && !u.gewaehlt) continue;
      const w = 20 * u.groesse, frac = Math.max(0, u.hp / u.maxhp);
      const bx = u.x - w / 2, by = u.y - 26 * u.groesse;
      g.fillStyle(0x000000, 0.5); g.fillRect(bx - 1, by - 1, w + 2, 4);
      g.fillStyle(u.team === 'spieler' ? 0x5ac85a : 0xc85a5a, 1); g.fillRect(bx, by, w * frac, 2);
    }
    // Ziel-Marker
    for (const m of this.marker) {
      const a = Math.min(1, m.t / 0.8);
      g.lineStyle(2, m.feind ? 0xe05a4a : 0x9ad86a, a);
      g.strokeCircle(m.x, m.y, 8 + (1 - a) * 10);
    }
    // Gummiband-Box
    if (this.boxStart && this.boxNow) {
      const x0 = Math.min(this.boxStart.x, this.boxNow.x), y0 = Math.min(this.boxStart.y, this.boxNow.y);
      g.lineStyle(1, 0x9ad86a, 0.9); g.fillStyle(0x9ad86a, 0.08);
      g.fillRect(x0, y0, Math.abs(this.boxNow.x - this.boxStart.x), Math.abs(this.boxNow.y - this.boxStart.y));
      g.strokeRect(x0, y0, Math.abs(this.boxNow.x - this.boxStart.x), Math.abs(this.boxNow.y - this.boxStart.y));
    }
    // Formations-Ghost beim Rechts-Ziehen
    if (this.linieStart && this.linieNow && Math.hypot(this.linieNow.x - this.linieStart.x, this.linieNow.y - this.linieStart.y) > 44) {
      const sel = this.gewaehlte();
      if (sel.length) {
        const { gruppe, zuweisung } = this.baueLinienGruppe(sel, this.linieStart, this.linieNow);
        g.lineStyle(1.5, 0xc9a227, 0.9);
        for (const { slot } of zuweisung) {
          const p = gruppe.manuell ? { x: gruppe.anker.x + slot.f, y: gruppe.anker.y + slot.l } : slotWelt(gruppe.anker, gruppe.facing, slot);
          g.strokeCircle(p.x, p.y, 7);
        }
      }
      g.lineStyle(1, 0xc9a227, 0.5); g.lineBetween(this.linieStart.x, this.linieStart.y, this.linieNow.x, this.linieNow.y);
    }
  }

  zaehlung(): { eigene: number; feind: number } {
    return { eigene: this.lebende('spieler').length, feind: this.lebende('feind').length };
  }
}
