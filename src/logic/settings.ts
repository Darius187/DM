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
  chronikMini?: boolean;  // Chronik eingeklappt (nur Kopfzeile), R86
  chronikV?: number;      // einmalig: Chronik an den UNTERSTEN Rand andocken (R86)
  chronikAuto: boolean;   // Chronik-Fenster beim Spielstart offen (Runde 36)
  bloom: number;          // Leucht-/Bloom-Stärke 0-100 (Runde 51: Regler, 0 = aus)
  figuren3d: boolean;     // TEST (Runde 77): Held als 3D-gebackener Atlas statt 2D-Zeichnung
  grusel: number;         // Grusel-Atmosphäre: kalter, dunkler Tint auf Gegner 0-100 (Runde 55)
  schatten: number;       // Schatten-/Licht-Stärke AUSSENWELT 0-100 (Runde 55: 0 = aus, Leistungsregler)
  dungeonStaerke: number; // Schatten-/Dunkelheit-Stärke DUNGEON 0-100 (getrennt von der Aussenwelt, Runde 56)
  // Licht-Werkbank (Runde 55): alle Regler des Licht-Tests, live im Spiel + persistent
  licht: {
    variante: number;     // Dungeon-Lichtvariante 0-4 (Sichtradius/Wandfackel/Kombis/alt)
    sichtRadius: number;  // persönlicher Lichtradius des Helden (Sichtradius)
    heldLichtAn: boolean; // Held-Sichtradius an/aus
    feuerNeu: boolean;    // Feuer-Stil neu (Glut+Flamme) vs alt (schlichter Kreis)
    weichheit: number;    // Schatten-Weichheit 0-100
    sonneRaycast: boolean;// Tag-Schatten: false = Projektion, true = Raycaster-Sonne
    sonneKegel: number;   // Größe/Ferne des Sonnen-Lichtkegels (Raycast) 0-100
    dungeonNeu: boolean;  // Dungeon: Wand-Schatten (Raycasting) für Held-/Fackellicht
    fackelHelligkeit: number; // Helligkeit der Dungeon-Fackeln 0-100 (50 = neutral)
    fackelReichweite: number; // Reichweite/Radius der Dungeon-Fackeln 0-100 (50 = neutral)
    fackelFarbe: number;      // Farbtemperatur der Fackeln 0 (tiefrot) .. 100 (weißgelb)
    dungeonWeichheit: number; // Weichheit der Dungeon-Wandschatten 0-100 (getrennt von Sonne)
    schattenFackeln: number;  // wie viele Fackeln zusätzlich zum Held Schatten werfen 0-100 -> 0..6 (Leistung!)
    heldFarbe: number;        // Farbtemperatur des Held-Lichts 0 (tiefrot) .. 100 (kühl-weiß), Runde 56
    alleFackelnSchatten: boolean; // ALLE sichtbaren Fackeln werfen Schatten (übersteuert schattenFackeln), Runde 56
    effekteSchatten: boolean;     // Effekt-Lichter (Feuerball/Zauber/Feuer) werfen auch Schatten, Runde 56
    fackelSicht: boolean;         // Fackeln nur bei freier Sichtlinie zählen (aus = auch durch Wände), Runde 56
    heldSchatten: boolean;        // Held wirft Schatten (Raycast) ODER nur weicher Sichtradius (kein Schleier), Runde 56
    fackelSichtTol: number;       // Sicht-Toleranz: durch wie viele Wände das Fackellicht noch zählt (0 = direkt, hoch = um die Ecke), Runde 56
    fackelDistanz: number;        // Aktiv-Distanz: wie weit entfernt Fackeln noch leuchten 0-100, Runde 56
    fackelRaumLicht: number;      // neutrales Raumlicht: wie hell/weiß die Fackel den Raum aufhellt (getrennt von der warmen Flamme), Runde 57
    fackelRaumFarbe: number;      // Farbe des Raumlichts 0 (warm) .. 100 (kühl-weiß), Runde 57
    fackelGlutRadius: number;     // Streuung des warmen Flammenscheins 0 (eng am Kern) .. 100 (weit), Runde 57
    lichtSchaerfe: number;        // Schärfe des Lichts: 100 = scharf, 0 = weicher Schleier (steuert den Weichzeichner), Runde 57
    heldSichtfeld: boolean;       // Sichtfeld-Maske: nur was in der Sichtlinie des Helden liegt ist sichtbar (kein Auf-Ploppen ganzer Räume), Runde 57
    sichtfeldRadius: number;      // wie weit der Held sieht (Sichtfeld-Reichweite) 0-100, Runde 57
    sichtfeldStaerke: number;     // wie STARK das Sichtfeld abdunkelt 0-100 (0 = aus/weich, 100 = harte Sichtlinie), Runde 57
    umgebungslicht: number;       // Grundhelligkeit 0-100: hebt die Dunkelheit an, damit Wände/Gegner schwach sichtbar bleiben, Runde 57
    lichtHelligkeit: number;      // Licht-Helligkeit (Master) 0-100: skaliert das Raumlicht + den Feuerschein, Runde 57
    schattenNah: number;          // Schatten-Aufhellung NAHER Lichter 0-100 (unmittelbare Schatten heller), Runde 57
    schattenFern: number;         // Schatten-Aufhellung FERNER Lichter 0-100 (entfernte Schatten heller), Runde 57
    fackelBlende: number;         // Fackel-Überblendung 0-100: 0 = hart an/aus, hoch = sanftes Ein-/Ausblenden (kein Aufblinken), Runde 57
    // Held-Licht NACHTS draußen (R81, Autorwunsch "Helligkeit, Farbe und
    // Sichtweite will ich regeln können"):
    nachtDunkel?: number;         // wie finster die Nacht wird 0-100 (82 = bisheriges Stockfinster)
    nachtSicht?: number;          // Held-Sichtradius nachts in px (Standard 240)
    nachtGlut?: number;           // Stärke des warmen Scheins um den Helden 0-100
    nachtGlutFarbe?: number;      // Farbe des Held-Scheins (Hex, Standard warmes 0xffcf86)
    wandHoehe?: number;           // Krypta-Wandhöhe in Kacheln (R84, Default 2)
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
  // R86 (Autorwunsch): von Anfang an GANZ UNTEN am Bildschirmrand angedockt
  chronikBox: { x: 4, y: -270, w: 340, h: 270 }, // bündig am LINKEN
  // Bildschirmrand, kompakter, knapp über der Lebenskugel/Leiste
  chronikAuto: true,
  chronikV: 1,
  bloom: 0, // Runde 51 (Autorwunsch): Bloom standardmäßig AUS, war zu stark
  figuren3d: false, // 3D-Held-Test standardmäßig AUS (2D bleibt die Wahrheit)
  grusel: 100, // Runde 58 (Autorwunsch): Grusel-Atmosphäre standardmäßig voll an
  schatten: 70, // Runde 55: Schatten/Licht (Aussenwelt) standardmäßig an (mittlere Stärke)
  dungeonStaerke: 100, // Runde 58: vom Autor eingestellter Stand (Dungeon-Dunkelheit)
  licht: { variante: 2, sichtRadius: 183, heldLichtAn: true, feuerNeu: true, weichheit: 70, sonneRaycast: false, sonneKegel: 60, dungeonNeu: true, fackelHelligkeit: 23, fackelReichweite: 100, fackelFarbe: 31, dungeonWeichheit: 99, schattenFackeln: 100, heldFarbe: 18, alleFackelnSchatten: true, effekteSchatten: false, fackelSicht: true, heldSchatten: false, fackelSichtTol: 0, fackelDistanz: 100, fackelRaumLicht: 4, fackelRaumFarbe: 33, fackelGlutRadius: 0, lichtSchaerfe: 86, heldSichtfeld: true, sichtfeldRadius: 100, sichtfeldStaerke: 19, umgebungslicht: 0, lichtHelligkeit: 42, schattenNah: 0, schattenFern: 100, fackelBlende: 68, nachtDunkel: 82, nachtSicht: 240, nachtGlut: 50, nachtGlutFarbe: 0xffcf86, wandHoehe: 2 },
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
      // R86: Chronik einmalig an den untersten Rand andocken (NUR die Chronik,
      // andere UI-Versätze des Autors bleiben unangetastet)
      if ((saved.chronikV ?? 0) < 1) {
        current.chronikBox = { ...DEF_SETTINGS.chronikBox };
        current.chronikV = 1;
      }
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
