// Anpassbare Proportionen der Helden-Figur (Runde 40, Autorwunsch: "ein Tool,
// in dem ich die Figur selber anpassen kann - nicht nur skalieren"). Alle Werte
// sind Pixel im 64px-Zeichenraster (drawHeld); der Figur-Editor verstellt sie
// live und speichert sie im Browser. So tunt der Autor die Proportionen selbst.

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
}

export const DEF_HELDFORM: HeldForm = {
  kopfR: 5.8, kopfY: 14.5, schulterY: 24, schulterB: 10, tailleB: 6,
  rumpfH: 17, armL: 13, armB: 4.6, beinL: 13, beinB: 6.4, skala: 0.6,
};

// Grenzen + Schrittweite je Regler für den Editor (Label, min, max, step)
export const HELDFORM_REGLER: Array<[keyof HeldForm, string, number, number, number]> = [
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
];

const KEY = 'ravensmoor_heldform_v1';
let current: HeldForm | null = null;

export function getHeldForm(): HeldForm {
  if (current) return current;
  current = { ...DEF_HELDFORM };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) current = { ...DEF_HELDFORM, ...(JSON.parse(raw) as Partial<HeldForm>) };
  } catch { /* localStorage gesperrt - Standard */ }
  return current;
}

export function saveHeldForm(): void {
  try { localStorage.setItem(KEY, JSON.stringify(getHeldForm())); } catch { /* gesperrt */ }
}
