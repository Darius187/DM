// Anpassbare Proportionen der Helden-Figur (Runde 40, Autorwunsch: "ein Tool,
// in dem ich die Figur selber anpassen kann - nicht nur skalieren"). Alle Werte
// sind Pixel im 64px-Zeichenraster (drawHeld); der Figur-Editor verstellt sie
// live und speichert sie im Browser. So tunt der Autor die Proportionen selbst.

import type { HeldTier } from './helden';

export interface HeldForm {
  kopfR: number;      // Kopf-/Kapuzenradius (Standard 5.8 - kein Ballon mehr)
  kopfY: number;      // Höhe der Kopfmitte
  schulterY: number;  // Schulterlinie
  schulterB: number;  // halbe Schulterbreite (von der Mitte)
  tailleB: number;    // halbe Taillenbreite
  rumpfH: number;     // Rumpfhöhe (Schulter -> Taille)
  armL: number;       // Armlänge
  armB: number;       // Armbreite
  beinL: number;      // Beinlänge
  beinB: number;      // Beinbreite
  skala: number;      // Anzeige-Skala der Figur in der Welt (war HELD_SKALA)
  // Kopfbedeckung modular (Runde 40): Visier + wie viel Gesicht/Augen man sieht
  gesichtOffen: number; // Größe der Gesichtsöffnung (1 = wie bisher, klein = verdeckter)
  visier: number;       // Visier von oben über die Augen (0 = keins, 1 = fast zu)
  ruestHell: number;    // Rüstung heller/dunkler (- dunkel ... + hell)
  // Umhang + Gürtel + Schmuck (Runde 40, Erweiterung)
  capeBreite: number;   // Weite des Umhangs unten (klein = schmaler)
  capeLaenge: number;   // Länge des Umhangs
  guertelBreite: number;// Gürtelbreite
  kettenGitter: number; // Kettenhemd-Gittermuster (0 = aus, 1 = an)
  leuchten: number;     // leuchtende Kontur (epische Rüstung) (0 = aus, 1 = an)
  schultern: number;    // Schulterplatten/Pauldrons (0 keine, 1 schlicht, 2 massiv)
  rost: number;         // Rost-Patina auf der Rüstung (0 sauber .. 1 verrostet)
  schmutz: number;      // Verschmutzung am unteren Rand (0 sauber .. 1 dreckig)
  // Farb-Überschreibungen je Teil (leer = Standardfarbe der Rüstungsstufe)
  farben: { wams?: string; cape?: string; kapuze?: string; guertel?: string; schnalle?: string; hand?: string };
}

export const DEF_HELDFORM: HeldForm = {
  kopfR: 5.8, kopfY: 14.5, schulterY: 24, schulterB: 10, tailleB: 6,
  rumpfH: 17, armL: 13, armB: 4.6, beinL: 13, beinB: 6.4, skala: 0.6,
  gesichtOffen: 1.0, visier: 0, ruestHell: 0,
  capeBreite: 1.0, capeLaenge: 1.0, guertelBreite: 1.0, kettenGitter: 1, leuchten: 0,
  schultern: 0, rost: 0, schmutz: 0,
  farben: {},
};

// Zahlen-Felder der HeldForm (alles außer den Farb-Überschreibungen)
export type HeldFormNum = Exclude<keyof HeldForm, 'farben'>;

// Grenzen + Schrittweite je Regler für den Editor (Label, min, max, step)
export const HELDFORM_REGLER: Array<[HeldFormNum, string, number, number, number]> = [
  ['kopfR', 'Kopfgröße', 3.5, 8, 0.2],
  ['kopfY', 'Kopfhöhe', 10, 18, 0.5],
  ['schulterB', 'Schulterbreite', 6, 14, 0.5],
  ['tailleB', 'Taille', 3, 10, 0.5],
  ['rumpfH', 'Rumpflänge', 10, 24, 1],
  ['schulterY', 'Rumpf-Höhe', 20, 30, 0.5],
  ['armL', 'Armlänge', 8, 18, 0.5],
  ['armB', 'Armbreite', 3, 7, 0.2],
  ['beinL', 'Beinlänge', 8, 18, 0.5],
  ['beinB', 'Beinbreite', 4, 9, 0.2],
  ['skala', 'Gesamtgröße', 0.4, 1.0, 0.05],
  ['gesichtOffen', 'Gesicht offen', 0.2, 1.3, 0.1],
  ['visier', 'Visier', 0, 1, 0.1],
  ['ruestHell', 'Rüstung hell/dunkel', -40, 40, 5],
  ['capeBreite', 'Umhang-Weite', 0.4, 1.6, 0.1],
  ['capeLaenge', 'Umhang-Länge', 0.5, 1.3, 0.1],
  ['guertelBreite', 'Gürtelbreite', 0.5, 1.6, 0.1],
  ['kettenGitter', 'Kettengitter', 0, 1, 1],
  ['leuchten', 'Leucht-Kontur', 0, 1, 1],
  ['schultern', 'Schulterplatten', 0, 2, 1],
  ['rost', 'Rost', 0, 1, 0.1],
  ['schmutz', 'Verschmutzung', 0, 1, 0.1],
];

// Wählbare Farben je Teil (Name -> Hex) für den Farb-Picker im Editor
export type FarbTeil = 'wams' | 'cape' | 'kapuze' | 'guertel' | 'schnalle' | 'hand';
export const FARB_TEILE: Array<[FarbTeil, string]> = [
  ['wams', 'Wams'], ['cape', 'Umhang'], ['kapuze', 'Kapuze/Helm'],
  ['guertel', 'Gürtel'], ['schnalle', 'Schnalle'], ['hand', 'Handschuhe'],
];
export const FARB_PALETTE: string[] = [
  '#7a2e28', '#6a4326', '#7a7d84', '#9aa1a9', '#3a5a7a', '#2e4a3a',
  '#5a3a6a', '#8a6a2a', '#c9a227', '#2a2a2e', '#8a8276', '#a83838',
];

// Pro Rüstungsstufe ein eigenes Aussehen (Runde 40, Autorwunsch "je nach
// Rüstung verändert sich das Aussehen"): der Held wechselt automatisch das
// Aussehen, sobald sich die getragene Rüstung (stoff/leder/kette/platte) ändert.
export type HeldFormen = Record<HeldTier, HeldForm>;

const KEY = 'ravensmoor_heldformen_v1';
let formen: HeldFormen | null = null;

function frisch(over: Partial<HeldForm> = {}): HeldForm {
  return { ...DEF_HELDFORM, ...over, farben: { ...(over.farben ?? {}) } };
}

// Sinnvolle Start-Looks je Stufe (die Stufen-Palette gibt die Grundfarbe,
// hier nur die Form-Unterschiede): Kette zeigt das Gittermuster, Platte trägt
// ein leicht gesenktes Visier - der Autor kann alles im Editor weiter tunen.
function defaults(): HeldFormen {
  return {
    stoff: frisch(),
    leder: frisch({ gesichtOffen: 0.95 }),
    kette: frisch({ kettenGitter: 1, gesichtOffen: 0.88, visier: 0.15 }),
    platte: frisch({ visier: 0.35, gesichtOffen: 0.82 }),
  };
}

export function getFormen(): HeldFormen {
  if (formen) return formen;
  formen = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Record<HeldTier, Partial<HeldForm>>>;
      for (const tier of ['stoff', 'leder', 'kette', 'platte'] as HeldTier[]) {
        if (saved[tier]) formen[tier] = { ...formen[tier], ...saved[tier], farben: { ...formen[tier].farben, ...(saved[tier]!.farben ?? {}) } };
      }
    }
  } catch { /* localStorage gesperrt - Standard */ }
  return formen;
}

export function getHeldForm(tier: HeldTier): HeldForm {
  return getFormen()[tier];
}

// Standard-Look einer Stufe (für den ZURÜCKSETZEN-Knopf im Editor)
export function standardForm(tier: HeldTier): HeldForm {
  return defaults()[tier];
}

// --- Benannte Vorlagen (Runde 40, Autorwunsch "Figur speichern unter Name,
// z.B. Rüstung_kette_episch") - eine Bibliothek gespeicherter Looks. ---
const PRESET_KEY = 'ravensmoor_heldvorlagen_v1';

export function getPresets(): Record<string, HeldForm> {
  try {
    const raw = localStorage.getItem(PRESET_KEY);
    if (raw) return JSON.parse(raw) as Record<string, HeldForm>;
  } catch { /* gesperrt */ }
  return {};
}

export function savePreset(name: string, form: HeldForm): void {
  const all = getPresets();
  all[name] = { ...form, farben: { ...form.farben } };
  try { localStorage.setItem(PRESET_KEY, JSON.stringify(all)); } catch { /* gesperrt */ }
}

export function deletePreset(name: string): void {
  const all = getPresets();
  delete all[name];
  try { localStorage.setItem(PRESET_KEY, JSON.stringify(all)); } catch { /* gesperrt */ }
}

export function saveHeldForm(): void {
  try { localStorage.setItem(KEY, JSON.stringify(getFormen())); } catch { /* gesperrt */ }
}
