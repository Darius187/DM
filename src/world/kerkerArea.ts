// KERKER (V12) als ECHTE Spielkarte (R136b, Autor: "live einbauen, aber noch
// KEIN Eingang auf der Karte - die geplanten Maps liegen in der Dev-Konsole
// unter Maps, bis sie zu einem neuen Dungeon verknuepft werden").
//
// Dieser Adapter macht aus dem Editor-Code-Gitter des Kerker-Generators
// (kerkerDungeon.ts: 1 Boden, 2 Wand, 3 Tuer) ein vollwertiges AreaData fuer
// die WorldScene (Regel 7: jede Map ist eine WorldScene-Area - HUD, Licht,
// Speichern, Kampf kommen automatisch). Tueren werden ECHTE Dungeon-Tueren
// (T.DTUER, mit E zu oeffnen). EIN durchgehender Boden fuer die ganze Karte
// (Autor R136b: verschiedene Boeden je Raum sind fuer V12 GESTRICHEN).
//
// Bewusst NUR Geometrie + Fackeln: keine Gegner, keine Beute, keine Treppen -
// es ist die PLANUNGSKARTE der spaeteren Sondermission. Rein/raus geht ueber
// die Dev-Konsole (Maps-Tab). Inhalt kommt, wenn der Autor die Mission plant.

import { baueKerker } from './kerkerDungeon';
import { T } from './tiles';
import type { AreaData } from './areagen';
import { TILE } from '../gfx/fallbackArt';
import { CRYPT_THEMES } from '../data/krypta';
import { KERKER_GEN } from '../data/kerker';
import { rnd, type Rng } from '../logic/rng';

export function buildKerkerArea(rng: Rng): AreaData {
  const d = baueKerker(() => rng.random());
  // EditCode -> Spiel-Tiles: 1 Boden, 2 Wand, 3 echte Tuer. (0/4 erzeugt der
  // Kerker-Generator nicht; zur Sicherheit wird Unbekanntes zu Wand.)
  const map: number[][] = d.grid.map((zeile) => zeile.map((c) => (c === 1 ? T.FLOOR : c === 3 ? T.DTUER : T.WALL)));

  const a: AreaData = {
    id: 'kerker12', name: 'Kerker (V12-Planung)', dark: true,
    depth: KERKER_GEN.missionTiefe, theme: CRYPT_THEMES[KERKER_GEN.missionThema],
    w: d.w, h: d.h, map, spawn: { x: 0, y: 0 },
    torches: [], altars: [], wells: [], chests: [], shrines: [], books: [],
    breakables: [], enemySpawns: [], notes: [], folios: [], gear: [],
    ores: [], rocks: [], special: [], scareBudget: 0, labels: [],
    npcs: [], animals: [], kraeuter: [], baeume: [], chimneys: [],
  };

  // Spawn: Mitte des ersten Raums (immer Boden).
  const start = d.raeume[0];
  a.spawn = { x: (start.x + (start.w >> 1)) * TILE + 16, y: (start.y + (start.h >> 1)) * TILE + 16 };

  // Sparsames Fackellicht zum Ablaufen/Beurteilen: etwa jeder vierte Raum eine
  // Fackel in der Raummitte (wie buildCrypt sie setzt). Reine Sichtbarkeit -
  // die Ausleuchtung der echten Mission entwirft der Autor spaeter.
  for (let i = 0; i < d.raeume.length; i += 4) {
    const r = d.raeume[i];
    a.torches.push({ x: (r.x + (r.w >> 1)) * TILE + 16, y: (r.y + (r.h >> 1)) * TILE + 8, ph: rnd(rng, 0, 6.28) });
  }
  return a;
}
