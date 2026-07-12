// Speichern/Laden - JSON-versioniert, Storage injizierbar (Tests: Map, Spiel: localStorage).
// 3 Speicherslots + Autosave (Masterprompt Phase 10), Verhalten wie Referenz:
// Autosave bei Gebietswechsel.

import type { Item } from '../data/types';
import type { SchoolState } from './progression';

export const SAVE_VERSION = 3;
export const SAVE_PREFIX = 'ravensmoor_save_v3_slot';
export const AUTOSAVE_SLOT = 0; // Slot 0 = Autosave, 1-3 = manuelle Slots

export interface SaveData {
  v: number;
  zeit: number; // Unix-Millis des Speicherns
  player: {
    level: number; xp: number; xpNext: number; gold: number;
    pot: number; mpot: number; elixirs: number; hasKey: boolean;
    hp: number; mana: number;
    flaskMax: number; flaskPowerUp: boolean;
    arrows: number;
    inv: Item[];
    weaponIdx: number; armorIdx: number; ringIdx: number; schildIdx?: number;
    bogenIdx?: number; bogenAktiv?: boolean; // zweiter Waffenplatz (Runde 41)
    schools: Record<'nahkampf' | 'zauberei' | 'bogen', SchoolState>;
    materials: Record<string, number>;
    tools?: { axt: boolean; spitzhacke: boolean };
    resist?: { feuer: number; frost: number; schatten: number; seuche: number };
    verbaende?: number;
    warmBuff?: boolean;
  };
  lager?: Item[];
  welt: {
    areaId: string;
    flags: Record<string, boolean>;
    bossDead: boolean;
    relicChoice: string | null;
    aufbauStufe: number;
    tag: number;
    tageszeit: number;
    feld: Array<{ saatId: string | null; tageGewachsen: number; gegossen: boolean }>;
    // Persönliche Lagerfeuer je Karte (R81, Baumenü) - überleben Kartenwechsel und Laden
    lagerfeuer?: Record<string, Array<{ x: number; y: number }>>;
    haendlerSeed: number;
    aufbauBestellt?: boolean;
    einrichtung?: number;
    kopfgeld?: { tag: number; ebene: number; erledigt: boolean };
    album?: { kills: Record<string, number>; champions: string[]; unikate: string[]; notizen: number[] };
    stadtmauerStufe?: number;
    stadtmauerBestellt?: boolean; // alt (eine Nacht Bauzeit), abgelöst durch RestNaechte
    stadtmauerRestNaechte?: number;
    torWestZu?: boolean;
    torOstZu?: boolean;
    letzterEinfallTag?: number;
    einfallZaehler?: number;
    tagwerke?: Record<string, number>;
    dorfkasse?: number;
    // Wirtschaft Phase 1 (Runde 51): Dorf-Lager + Abgaben-Stand.
    // M3 Dorfwirtschaft: bericht = gestern produziert/verbraucht (Verwaltungs-
    // buch); optional - alte Staende laden ohne (?? beim Lesen).
    wirtschaft?: {
      lager: Record<string, number>; naechsteAbgabe: number; rueckstand: number;
      bericht?: { produziert: Record<string, number>; verbraucht: Record<string, number> };
      // M5 Dorfwirtschaft: Bauern-Felder + Viehbestaende (optional, alte
      // Staende starten mit den Standardwerten)
      felder?: Array<{ wachstum: number }>;
      vieh?: { huehner: number; kuehe: number; schweine: number; huhnT: number; kuhT: number; schweinT: number };
    };
    breschen?: Array<{ x: number; y: number }>;
  };
}

export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function slotKey(slot: number): string {
  return `${SAVE_PREFIX}${slot}`;
}

export function writeSave(storage: SaveStorage, slot: number, data: SaveData): boolean {
  try {
    storage.setItem(slotKey(slot), JSON.stringify({ ...data, v: SAVE_VERSION, zeit: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function readSave(storage: SaveStorage, slot: number): SaveData | null {
  try {
    const raw = storage.getItem(slotKey(slot));
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (!data || typeof data !== 'object' || !data.player || !data.welt) return null;
    if (data.v !== SAVE_VERSION) return migrate(data);
    return data;
  } catch {
    return null;
  }
}

export function hasSave(storage: SaveStorage, slot: number): boolean {
  try {
    return !!storage.getItem(slotKey(slot));
  } catch {
    return false;
  }
}

export function deleteSave(storage: SaveStorage, slot: number): void {
  try {
    storage.removeItem(slotKey(slot));
  } catch { /* localStorage gesperrt - bewusst ignoriert */ }
}

// Platzhalter für künftige Versionssprünge: unbekannte Versionen verwerfen
function migrate(_data: SaveData): SaveData | null {
  return null;
}

// Roundtrip-Hilfe: Equipment wird über Indizes referenziert (Referenz-Prinzip)
export function equipIndices(inv: Item[], weapon: Item | null, armor: Item | null, ring: Item | null, schild: Item | null = null, bogen: Item | null = null, bogenAktiv = false) {
  return {
    weaponIdx: weapon ? inv.indexOf(weapon) : -1,
    armorIdx: armor ? inv.indexOf(armor) : -1,
    ringIdx: ring ? inv.indexOf(ring) : -1,
    schildIdx: schild ? inv.indexOf(schild) : -1,
    bogenIdx: bogen ? inv.indexOf(bogen) : -1,
    bogenAktiv,
  };
}
