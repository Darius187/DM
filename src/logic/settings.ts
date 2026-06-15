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
  volMusik: number;       // 0-100 (Musikstücke, Runde 17)
  bright: number;
  // Bildgröße in Prozent (Runde 21): 100 = wie bisher, größer = näher dran
  zoom: number;         // 70-140
  tempo: number;          // Spieler-Tempo in % (70-110)
  fow: boolean;           // Nebel des Krieges im Dunkelwald
  shake: boolean;
  dmgNums: boolean;
  blood: boolean;
  lefty: boolean;
  // Maustasten-Belegung: Aktions-Kennungen für Links/Rechts/Mitte/Daumen1/Daumen2
  maus: { m1: string; m2: string; m3: string; m4: string; m5: string };
  // Tastenleiste frei belegbar (Runde 26, "wie bei WoW"): Slot -> Aktion
  tasten: { t1: string; t2: string; t3: string; t4: string; t5: string; t6: string; t9: string; t0: string; tr: string; tt: string };
  vorlesen: boolean;      // Dialogtexte per Sprachausgabe vorlesen
  // UI-Versatz (im Entwicklungskasten verschiebbar, Runde 11)
  ui: { hotbar: { x: number; y: number }; mausleiste: { x: number; y: number }; dialog: { x: number; y: number }; log: { x: number; y: number }; orbHp: { x: number; y: number }; orbMp: { x: number; y: number }; fenster: { x: number; y: number } };
  // Chronik als Chat-Fenster (Runde 29): frei verschieb- UND skalierbar;
  // y zählt vom UNTEREN Bildrand (Chat-Verankerung wie bei WoW)
  chronikBox: { x: number; y: number; w: number; h: number };
  chronikAuto: boolean;   // Chronik-Fenster beim Spielstart offen (Runde 36)
  uiLayoutV: number;      // Layout-Version: ältere UI-Versätze einmalig zurücksetzen
  kb: KeyBindings;
}

export const DEF_SETTINGS: Settings = {
  volEffekte: 60,
  volAtmosphaere: 50,
  volMusik: 55,
  bright: 100,
  zoom: 100,
  tempo: 90,
  fow: true,
  shake: false,
  dmgNums: true,
  blood: true,
  lefty: false,
  maus: { m1: 'angriff', m2: 'block', m3: 's1', m4: 'pot', m5: 's3' },
  tasten: { t1: 's1', t2: 's2', t3: 's3', t4: 'kettenblitz', t5: 'frostnova', t6: 'bannkreis', t9: 'feuerregen', t0: 'aderlass', tr: 'waffe1', tt: 'waffe2' },
  vorlesen: false,
  ui: { hotbar: { x: 0, y: 0 }, mausleiste: { x: 0, y: 0 }, dialog: { x: 0, y: 0 }, log: { x: 0, y: 0 }, orbHp: { x: 0, y: 0 }, orbMp: { x: 0, y: 0 }, fenster: { x: 0, y: 0 } },
  chronikBox: { x: 8, y: -308, w: 380, h: 300 }, // ganz links UNTEN (Runde 40)
  chronikAuto: true,
  uiLayoutV: 3, // Runde 40: Orbs an den Leisten, Meldungen oben, Chronik unten links
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
      current.tasten = { ...DEF_SETTINGS.tasten, ...(saved.tasten ?? {}) };
      current.chronikBox = { ...DEF_SETTINGS.chronikBox, ...(saved.chronikBox ?? {}) };
      current.ui = {
        hotbar: { ...DEF_SETTINGS.ui.hotbar, ...(saved.ui?.hotbar ?? {}) },
        mausleiste: { ...DEF_SETTINGS.ui.mausleiste, ...(saved.ui?.mausleiste ?? {}) },
        dialog: { ...DEF_SETTINGS.ui.dialog, ...(saved.ui?.dialog ?? {}) },
        log: { ...DEF_SETTINGS.ui.log, ...(saved.ui?.log ?? {}) },
        orbHp: { ...DEF_SETTINGS.ui.orbHp, ...(saved.ui?.orbHp ?? {}) },
        orbMp: { ...DEF_SETTINGS.ui.orbMp, ...(saved.ui?.orbMp ?? {}) },
        fenster: { ...DEF_SETTINGS.ui.fenster, ...(saved.ui?.fenster ?? {}) },
      };
      // Layout-Migration (Runde 40): die Aktionsleisten sind jetzt EIN zentrierter
      // Block, die Orbs flankieren die Leisten, die Meldungen stehen oben und die
      // Chronik unten links. Alte, von Hand verschobene Versätze passen nicht mehr
      // und ließen die UI "total verschoben" wirken - daher einmalig nullen und
      // die neuen Standardplätze übernehmen.
      if ((saved.uiLayoutV ?? 0) < DEF_SETTINGS.uiLayoutV) {
        current.ui.hotbar = { x: 0, y: 0 };
        current.ui.mausleiste = { x: 0, y: 0 };
        current.ui.orbHp = { x: 0, y: 0 };
        current.ui.orbMp = { x: 0, y: 0 };
        current.ui.log = { x: 0, y: 0 };
        current.chronikBox = { ...DEF_SETTINGS.chronikBox };
        current.uiLayoutV = DEF_SETTINGS.uiLayoutV;
        try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* gesperrt */ }
      }
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
