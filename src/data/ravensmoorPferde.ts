// Vier eigenstaendige Pferde des Rabenmoorer Stalls. Alle teilen denselben
// Blender-Atlas; Farbe und Koerperbau bleiben kleine Laufzeitvarianten. So
// entstehen keine vier mehrfach geladenen 4K-Atlanten.

export type RabenmoorPferdRolle = 'held' | 'arbeit';

export interface RabenmoorPferdDef {
  id: string;
  name: string;
  rolle: RabenmoorPferdRolle;
  stallId: `stall_${1 | 2 | 3 | 4}`;
  startMarker: `APPROACH_STALL_${1 | 2 | 3 | 4}`;
  tint: number;
  skala: number;
  breite: number;
  hoehe: number;
  npcId?: string;
}

export const RABENMOOR_PFERDE: ReadonlyArray<RabenmoorPferdDef> = [
  {
    id: 'arbeit_fuchs',
    name: 'Fuchsstute',
    rolle: 'arbeit',
    stallId: 'stall_1',
    startMarker: 'APPROACH_STALL_1',
    // Gedaempfter Fuchs statt Orange: im Mittelalter ist einfarbiges
    // Kastanienbraun besonders gut belegt.
    tint: 0x9a674f,
    skala: 1.035,
    breite: 1.08,
    hoehe: 1.015,
    npcId: 'stallknecht',
  },
  {
    id: 'arbeit_dunkelbraun',
    name: 'Dunkelbrauner Wallach',
    rolle: 'arbeit',
    stallId: 'stall_2',
    startMarker: 'APPROACH_STALL_2',
    // Exakt der bisherige, vom Autor abgenommene Reitpferd-Ton.
    tint: 0x5c4c3c,
    skala: 1.055,
    breite: 1.11,
    hoehe: 1.02,
    npcId: 'stallknecht',
  },
  {
    id: 'arbeit_braun',
    name: 'Braune Arbeitspferdstute',
    rolle: 'arbeit',
    stallId: 'stall_3',
    startMarker: 'APPROACH_STALL_3',
    // Nah am Dunkelbraun, aber mit etwas waermerem Rotanteil (Brauner/Bay).
    tint: 0x735443,
    skala: 1.045,
    breite: 1.095,
    hoehe: 1.015,
    npcId: 'stallknecht',
  },
  {
    id: 'held_schwarz',
    name: 'Schwarzes Reitpferd',
    rolle: 'held',
    stallId: 'stall_4',
    startMarker: 'APPROACH_STALL_4',
    // Kein tintenschwarzer Fleck: ein sehr dunkles, leicht warmes Schwarz laesst
    // Beine, Zaumzeug und Sattel im Rabenmoor-Licht noch lesen.
    tint: 0x403b38,
    skala: 0.985,
    breite: 1,
    hoehe: 1,
  },
] as const;

export const HELDEN_PFERD_ID = 'held_schwarz';

export function pferdDef(id: string): RabenmoorPferdDef {
  return RABENMOOR_PFERDE.find((p) => p.id === id) ?? RABENMOOR_PFERDE[3];
}

