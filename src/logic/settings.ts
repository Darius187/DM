// Einstellungen - aus der Referenz übernommen und erweitert (Masterprompt 5.2):
// Lautstärke getrennt (Effekte/Atmosphäre), Tastenbelegung frei, Helligkeit,
// Bildschirmwackeln, Schadenszahlen, Blut, Linkshänder-Modus.

export interface KeyBindings {
  roll: string; interact: string; inv: string; charakter: string;
  pot: string; mpot: string; s1: string; s2: string; s3: string;
  heavy: string; faehigkeit1: string; faehigkeit2: string; faehigkeit3: string;
  pause: string;
}

export interface Settings {
  volEffekte: number;     // 0-100
  volAtmosphaere: number; // 0-100
  bright: number;         // 70-140
  tempo: number;          // Spieler-Tempo in % (70-110)
  fow: boolean;           // Nebel des Krieges im Dunkelwald
  shake: boolean;
  dmgNums: boolean;
  blood: boolean;
  lefty: boolean;
  // Maustasten-Belegung: Aktions-Kennungen für Links/Rechts/Mitte/Daumen1/Daumen2
  maus: { m1: string; m2: string; m3: string; m4: string; m5: string };
  vorlesen: boolean;      // Dialogtexte per Sprachausgabe vorlesen
  // UI-Versatz (im Entwicklungskasten verschiebbar, Runde 11)
  ui: { hotbar: { x: number; y: number }; dialog: { x: number; y: number }; log: { x: number; y: number }; orbHp: { x: number; y: number }; orbMp: { x: number; y: number } };
  kb: KeyBindings;
}

export const DEF_SETTINGS: Settings = {
  volEffekte: 60,
  volAtmosphaere: 50,
  bright: 100,
  tempo: 90,
  fow: true,
  shake: true,
  dmgNums: true,
  blood: true,
  lefty: false,
  maus: { m1: 'angriff', m2: 'block', m3: 's1', m4: 'pot', m5: 's3' },
  vorlesen: false,
  ui: { hotbar: { x: 0, y: 0 }, dialog: { x: 0, y: 0 }, log: { x: 0, y: 0 }, orbHp: { x: 0, y: 0 }, orbMp: { x: 0, y: 0 } },
  kb: {
    roll: ' ', interact: 'e', inv: 'i', charakter: 'c',
    pot: 'q', mpot: 'f', s1: '1', s2: '2', s3: '3',
    heavy: 'shift', faehigkeit1: 'r', faehigkeit2: 't', faehigkeit3: 'z',
    pause: 'p',
  },
};

const KEY = 'ravensmoor_settings_v2';
let current: Settings | null = null;

export function getSettings(): Settings {
  if (current) return current;
  current = structuredClone(DEF_SETTINGS);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Settings>;
      Object.assign(current, saved);
      current.kb = { ...DEF_SETTINGS.kb, ...(saved.kb ?? {}) };
      current.maus = { ...DEF_SETTINGS.maus, ...(saved.maus ?? {}) };
      current.ui = {
        hotbar: { ...DEF_SETTINGS.ui.hotbar, ...(saved.ui?.hotbar ?? {}) },
        dialog: { ...DEF_SETTINGS.ui.dialog, ...(saved.ui?.dialog ?? {}) },
        log: { ...DEF_SETTINGS.ui.log, ...(saved.ui?.log ?? {}) },
        orbHp: { ...DEF_SETTINGS.ui.orbHp, ...(saved.ui?.orbHp ?? {}) },
        orbMp: { ...DEF_SETTINGS.ui.orbMp, ...(saved.ui?.orbMp ?? {}) },
      };
    }
  } catch { /* localStorage gesperrt - Standardwerte nutzen */ }
  return current;
}

export function saveSettings(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(getSettings()));
  } catch { /* localStorage gesperrt - bewusst ignoriert */ }
}

export function resetSettings(): void {
  current = structuredClone(DEF_SETTINGS);
  saveSettings();
}

export function keyLabel(k: string): string {
  if (k === ' ') return 'LEERTASTE';
  if (k === 'shift') return 'UMSCHALT';
  return k.toUpperCase();
}
