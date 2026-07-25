// BAUKASTEN fuer die Lagerbauten (Autor R195: "du musst mir die Moeglichkeit
// geben alles skalieren zu koennen ... oder drehen"). Je Bau-ID:
//   drehen = Blickwinkel des Modells (Grad, 0 = wie aus Blender exportiert)
//   skala  = Groessenfaktor auf die Ziel-Sprite-Hoehe (1 = Vorgabe)
// Die Vorgaben stehen hier; der Editor legt Abweichungen in localStorage ab und
// kann sie als Block exportieren, den ich hier als neue Vorgabe uebernehme.

export interface FeldbauOptik {
  drehen: number;   // Blickwinkel um die Hochachse (Grad)
  skala: number;    // Groessenfaktor auf die Ziel-Sprite-Hoehe
  neigung: number;  // Kamera-Neigung ueber dem Boden (Grad); 57 = Spiel-Vorgabe
}

// Vorgabe: leichte Dreiviertel-Ansicht nach links (-35 Grad) - dieselbe Richtung
// wie die uebrigen 3D-Props im Spiel. Einzelne Bauten koennen abweichen.
export const FELDBAU_DREHEN_VORGABE = -35;
// Kamera-Neigung des Spiels. Alles in der Welt wird so gebacken.
export const FELDBAU_NEIGUNG_VORGABE = 57;

// R196 (Autor: "die Zelte sehen zu klein aus", "Perspektive sieht seltsam aus"):
// Zelte/Unterkuenfte deutlich groesser als eine Figur, und eine etwas FLACHERE
// Kamera (50 statt 57 Grad) - dann sieht man weniger Dach und mehr Zeltwand.
// Beides ist im Entwicklungskasten (F10 -> LAGERBAUTEN) live verstellbar.
export const FELDBAU_OPTIK_VORGABE: Readonly<Record<string, FeldbauOptik>> = {
  zelt:         { drehen: -35, skala: 1.4,  neigung: 50 },
  befehlszelt:  { drehen: -35, skala: 1.25, neigung: 50 },
  lazarett:     { drehen: -35, skala: 1.4,  neigung: 50 },
  feldschmiede: { drehen: -35, skala: 1.25, neigung: 52 },
  kochstelle:   { drehen: -35, skala: 1.15, neigung: 55 },
  brunnen:      { drehen: -35, skala: 1.15, neigung: 52 },
  standarte:    { drehen: -35, skala: 1.1,  neigung: 55 },
  feldaltar:    { drehen: -35, skala: 1.15, neigung: 55 },
  nachschub:    { drehen: -35, skala: 1.2,  neigung: 50 },
  pferdekoppel: { drehen: -35, skala: 1.3,  neigung: 50 },
};

export const FELDBAU_OPTIK_LABEL: Readonly<Record<string, string>> = {
  zelt: 'Zelt', befehlszelt: 'Befehlszelt', lazarett: 'Lazarett',
  feldschmiede: 'Feldschmiede', kochstelle: 'Kochstelle', brunnen: 'Brunnen',
  standarte: 'Standarte', feldaltar: 'Feldaltar', nachschub: 'Nachschubwagen',
  pferdekoppel: 'Pferdekoppel',
};

export const FELDBAU_OPTIK_IDS = Object.keys(FELDBAU_OPTIK_VORGABE);

const KEY = 'ravensmoor_feldbauoptik';
type Overrides = Record<string, Partial<FeldbauOptik>>;

let cache: Overrides | null = null;

function laden(): Overrides {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Overrides; } catch { cache = {}; }
  return cache!;
}

export function feldbauOptik(id: string): FeldbauOptik {
  const def = FELDBAU_OPTIK_VORGABE[id] ?? { drehen: FELDBAU_DREHEN_VORGABE, skala: 1, neigung: FELDBAU_NEIGUNG_VORGABE };
  const ov = laden()[id];
  return ov ? { ...def, ...ov } : { ...def };
}

export function setFeldbauOptik(id: string, werte: Partial<FeldbauOptik>): void {
  const o = laden();
  o[id] = { ...(o[id] ?? {}), ...werte };
  try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* Storage gesperrt */ }
}

export function resetFeldbauOptik(): void {
  cache = {};
  try { localStorage.removeItem(KEY); } catch { /* egal */ }
}

// Export fuer den Autor: aktuelle Werte als Block, den er mir schickt.
export function exportFeldbauOptik(): string {
  const zeilen = FELDBAU_OPTIK_IDS.map((id) => {
    const o = feldbauOptik(id);
    return `  ${id.padEnd(13)}: { drehen: ${Math.round(o.drehen)}, skala: ${Math.round(o.skala * 100) / 100}, neigung: ${Math.round(o.neigung)} },`;
  });
  return `FELDBAU_OPTIK_VORGABE = {\n${zeilen.join('\n')}\n}`;
}
