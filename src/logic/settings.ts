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
  ui: { hotbar: { x: number; y: number }; mausleiste: { x: number; y: number }; dialog: { x: number; y: number }; log: { x: number; y: number }; orbHp: { x: number; y: number }; orbMp: { x: number; y: number }; fenster: { x: number; y: number }; questTracker: { x: number; y: number } };
  // Quest-Verfolger auf dem Hauptbildschirm (Runde 52): an/aus, frei verschiebbar.
  questTrackerAn: boolean;
  // HUD-Stil für Leben/Mana (Runde 52, Autorwunsch "Alternativen wie WoW"):
  // 0 = Kugeln rot/blau (bisher), 1 = WoW-Balken, 2 = Einheitenrahmen (Portrait).
  hudStil: number;
  // Chronik als Chat-Fenster (Runde 29): frei verschieb- UND skalierbar;
  // y zählt vom UNTEREN Bildrand (Chat-Verankerung wie bei WoW)
  chronikBox: { x: number; y: number; w: number; h: number };
  chronikAuto: boolean;   // Chronik-Fenster beim Spielstart offen (Runde 36)
  bloom: number;          // Leucht-/Bloom-Stärke 0-100 (Runde 51: Regler, 0 = aus)
  grusel: number;         // Grusel-Atmosphäre: kalter, dunkler Tint auf Gegner 0-100 (Runde 55)
  schatten: number;       // Schatten-/Licht-Stärke 0-100 (Runde 55: 0 = aus, Leistungsregler)
  // Licht-Werkbank (Runde 55): alle Regler des Licht-Tests, live im Spiel + persistent
  licht: {
    variante: number;     // Dungeon-Lichtvariante 0-4 (Sichtradius/Wandfackel/Kombis/alt)
    sichtRadius: number;  // persönlicher Lichtradius des Helden (Sichtradius)
    heldLichtAn: boolean; // Held-Sichtradius an/aus
    feuerNeu: boolean;    // Feuer-Stil neu (Glut+Flamme) vs alt (schlichter Kreis)
    weichheit: number;    // Schatten-Weichheit 0-100
    sonneRaycast: boolean;// Tag-Schatten: false = Projektion, true = Raycaster-Sonne
    sonneKegel: number;   // Größe/Ferne des Sonnen-Lichtkegels (Raycast) 0-100
  };
  audioV: number;         // einmalige Audio-Standards (Runde 40: Musik auf 20%)
  zoomV: number;          // einmaliger Zoom-Standard (Runde 41: 130%)
  bloomV: number;         // einmaliger Bloom-Standard (Runde 51: standardmäßig aus)
  uiLayoutV: number;      // Layout-Version: ältere UI-Versätze einmalig zurücksetzen
  barV: number;           // Leisten-Belegung: einmalig auf "leer bis auf Basics" setzen
  kb: KeyBindings;
}

export const DEF_SETTINGS: Settings = {
  volEffekte: 60,
  volAtmosphaere: 50,
  volMusik: 20, // Runde 40 (Autorwunsch): Musik leise im Hintergrund
  bright: 100,
  zoom: 130, // Runde 41 (Autorwunsch): Spielwelt-Zoom standardmäßig 130%
  tempo: 90,
  fow: true,
  shake: false,
  dmgNums: true,
  blood: true,
  lefty: false,
  // Runde 49 (Autorwunsch): Leiste startet LEER bis auf Angriff/Block/Tränke -
  // die Skills legt man sich selbst rein, sobald sie freigeschaltet sind.
  maus: { m1: 'angriff', m2: 'block', m3: 'leer', m4: 'pot', m5: 'leer' },
  tasten: { t1: 'leer', t2: 'leer', t3: 'leer', t4: 'leer', t5: 'leer', t6: 'leer', t9: 'leer', t0: 'leer', tr: 'waffe1', tt: 'waffe2' },
  vorlesen: false,
  ui: { hotbar: { x: 0, y: 0 }, mausleiste: { x: 0, y: 0 }, dialog: { x: 0, y: 0 }, log: { x: 0, y: 0 }, orbHp: { x: 0, y: 0 }, orbMp: { x: 0, y: 0 }, fenster: { x: 0, y: 0 }, questTracker: { x: 0, y: 0 } },
  questTrackerAn: true,
  hudStil: 0,
  chronikBox: { x: 4, y: -430, w: 340, h: 270 }, // Runde 43: bündig am LINKEN
  // Bildschirmrand, kompakter, knapp über der Lebenskugel/Leiste
  chronikAuto: true,
  bloom: 0, // Runde 51 (Autorwunsch): Bloom standardmäßig AUS, war zu stark
  grusel: 0, // Runde 55: Grusel-Tint standardmäßig aus, per F10-Regler einstellbar
  schatten: 70, // Runde 55: Schatten/Licht standardmäßig an (mittlere Stärke), Regler in Einstellungen
  licht: { variante: 2, sichtRadius: 110, heldLichtAn: true, feuerNeu: true, weichheit: 70, sonneRaycast: false, sonneKegel: 60 },
  audioV: 1,
  zoomV: 1,
  bloomV: 1,
  uiLayoutV: 4, // Runde 43: Chronik bündig links angedockt
  barV: 1,      // Runde 49: Leiste startet leer (Skills selbst belegen)
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
      current.licht = { ...DEF_SETTINGS.licht, ...(saved.licht ?? {}) };
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
        questTracker: { ...DEF_SETTINGS.ui.questTracker, ...(saved.ui?.questTracker ?? {}) },
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
      // Leisten-Migration (Runde 49): die Skill-Plätze einmalig leeren - man
      // belegt sie selbst, sobald die Fähigkeiten freigeschaltet sind. Angriff/
      // Block/Tränke/Waffen-Fähigkeiten bleiben als spielbare Basis.
      if ((saved.barV ?? 0) < DEF_SETTINGS.barV) {
        current.maus = { ...DEF_SETTINGS.maus };
        current.tasten = { ...DEF_SETTINGS.tasten };
        current.barV = DEF_SETTINGS.barV;
        try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* gesperrt */ }
      }
      // Audio-Migration (Runde 40, Autorwunsch "Musik bei 20%"): einmalig die
      // Musik-Lautstärke auf den neuen Standard setzen, danach frei regelbar.
      if ((saved.audioV ?? 0) < DEF_SETTINGS.audioV) {
        current.volMusik = DEF_SETTINGS.volMusik;
        current.audioV = DEF_SETTINGS.audioV;
        try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* gesperrt */ }
      }
      // Zoom-Migration (Runde 41, Autorwunsch "Standard 130%"): einmalig auf den
      // neuen Standard setzen, danach frei regelbar.
      if ((saved.zoomV ?? 0) < DEF_SETTINGS.zoomV) {
        current.zoom = DEF_SETTINGS.zoom;
        current.zoomV = DEF_SETTINGS.zoomV;
        try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* gesperrt */ }
      }
      // Bloom-Migration (Runde 51, Autorwunsch "Bloom zu stark, standardmäßig
      // aus"): vom alten Schalter (postFx) einmalig auf den Regler 0 = aus.
      if ((saved.bloomV ?? 0) < DEF_SETTINGS.bloomV) {
        current.bloom = 0;
        current.bloomV = DEF_SETTINGS.bloomV;
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
