// Vereinheitlichte Karten-Erzeugung für die DUNGEON-PROBE (ÜBERSICHT/BEGEHEN)
// UND die spielbare Variante (DungeonSpiel). Jeder Generator wird auf eine
// kleine ProbeKarte abgebildet: grid + solid() (für Kollision) + farbe() (für
// die Minikarte). So testen Ansehen, Begehen und Spielen alle dieselbe Quelle.

import { baueLogischenDungeon, type DRaum, type Zelle } from './logischerDungeon';
import { baueKammernDungeon } from './dungeonKammern';
import { baueGangDungeon } from './dungeonGaenge';
import { baueHoehle } from './hoehlenDungeon';
import { baueVerbundeneRaeume } from './verbundeneRaeume';
import { baueBurg } from './burgDungeon';
import { baueKatakombenDungeon } from './katakombenDungeon';
import type { KatakombenRolle } from '../data/katakombenDungeon';
import { buildCrypt } from './areagen';
import { seededRng } from '../logic/rng';
import { T, SOLID } from './tiles';
import { VORLAGE_FARBE, type EditCode } from './dungeonVorlage';

export type DungeonVersion = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface ProbeKarte {
  name: string;
  w: number; h: number;
  grid: number[][];
  solid: (t: number) => boolean;
  farbe: (t: number) => number;
  raeume?: DRaum[];
  // V8 (R102): Rollen-Etiketten fuer die Uebersicht ("die Folterkammer" statt
  // "irgendein Raum") + editorCodes=true, wenn das Gitter BEREITS Editor-Codes
  // traegt (der Editor uebernimmt dann Tueren/Gaenge 1:1 statt nur Wand/Boden).
  rollen?: Array<{ cx: number; y: number; label: string; farbe: string }>;
  editorCodes?: boolean;
}

const FARBE_V3: Record<Zelle, number> = {
  0: 0x14110c, 1: 0x4a443a, 2: 0x8a5a2a, 3: 0xc9a227, 4: 0x6ad06a, 5: 0xd05a4a, 6: 0x05060a, 7: 0x6a1818, 8: 0xff4848,
};

function farbeV1(t: number): number {
  if (t === T.STAIR) return 0xd05a4a;
  if (t === T.STAIRUP || t === T.WENDEL) return 0x6ad06a;
  if (t === T.CDOOR || t === T.HDOOR || t === T.ZELLENTOR) return 0x8a5a2a;
  if (t === T.WATER || t === T.ABYSS) return 0x05060a;
  if (t === T.BLOOD) return 0x6a1818;
  if (SOLID.has(t)) return 0x14110c;
  return 0x4a443a;
}

// V8 (R102): Anzeige-Etiketten je Rolle - GROSS = die festen/besonderen Rollen.
const ROLLEN_LABEL: Record<KatakombenRolle, { text: string; farbe: string }> = {
  eingang: { text: 'EINGANG', farbe: '#6ad06a' },
  bossarena: { text: 'BOSSARENA', farbe: '#ff4848' },
  schatzkammer: { text: 'SCHATZKAMMER', farbe: '#f0c040' },
  kapelle: { text: 'Kapelle', farbe: '#e8d8a0' },
  folterkammer: { text: 'Folterkammer', farbe: '#ff8a7a' },
  kerker: { text: 'Kerker', farbe: '#cdbf9d' },
  krypta: { text: 'Krypta', farbe: '#9ab4cc' },
  beinhaus: { text: 'Beinhaus', farbe: '#cdbf9d' },
  skriptorium: { text: 'Skriptorium', farbe: '#e8d8a0' },
  wachstube: { text: 'Wachstube', farbe: '#ff8a7a' },
  gewoelbe: { text: 'Gewölbe', farbe: '#8a8070' },
};

export function erzeugeKarte(version: DungeonVersion): ProbeKarte {
  if (version === 8) {
    const d = baueKatakombenDungeon(seededRng(Math.floor(Math.random() * 1e9)));
    const vaults = d.rooms.filter((r) => r.istVault);
    const geheime = vaults.filter((r) => r.tueren.some((t) => t.geheim)).length;
    return {
      name: `V8 - Katakomben-Räume + Vaults (${d.rooms.length} Räume, ${vaults.length} Vaults, ${geheime} geheim)`,
      w: d.w, h: d.h, grid: d.tiles as number[][],
      solid: (t) => t === 0 || t === 2,
      farbe: (t) => VORLAGE_FARBE[t as EditCode] ?? 0x100d0a,
      rollen: d.rooms.map((r) => ({
        cx: r.rect.x + (r.rect.w >> 1), y: r.rect.y,
        label: ROLLEN_LABEL[r.rolle].text + (r.istVault ? (r.tueren.some((t) => t.geheim) ? ' 🔒' : ' (Vault)') : ''),
        farbe: ROLLEN_LABEL[r.rolle].farbe,
      })),
      editorCodes: true,
    };
  }
  if (version === 1) {
    const a = buildCrypt(1, seededRng(Math.floor(Math.random() * 1e9)));
    return { name: 'V1 - Krypta (aktuell im Spiel)', w: a.w, h: a.h, grid: a.map, solid: (t) => SOLID.has(t), farbe: farbeV1 };
  }
  if (version === 3) {
    const d = baueLogischenDungeon(Math.random);
    return {
      name: 'V3 - Geteilte Halle (logisch)', w: d.w, h: d.h, grid: d.grid as number[][], raeume: d.raeume,
      solid: (t) => t === 0 || t === 3 || t === 6, farbe: (t) => FARBE_V3[t as Zelle] ?? 0x4a443a,
    };
  }
  if (version === 2) {
    const d = baueKammernDungeon(Math.random);   // wiederhergestellt (dgn2): Kammern + Gänge
    return { name: 'V2 - Kammern + Gänge (Original)', w: d.w, h: d.h, grid: d.grid as number[][], raeume: d.raeume as unknown as DRaum[],
      solid: (t) => t === 0 || t === 3 || t === 6, farbe: (t) => FARBE_V3[t as Zelle] ?? 0x4a443a };
  }
  if (version === 6) {
    const d = baueGangDungeon(Math.random);       // wiederhergestellt (dgnB): offen + Elite-Themenräume
    return { name: 'V6 - Offen + Elite-Themenräume', w: d.w, h: d.h, grid: d.grid as number[][], raeume: d.raeume as unknown as DRaum[],
      solid: (t) => t === 0 || t === 3 || t === 6, farbe: (t) => FARBE_V3[t as Zelle] ?? 0x4a443a };
  }
  if (version === 7) {
    const d = baueBurg(Math.random);              // NEU: echtes Verlies (BSP, dichte unregelmäßige Räume)
    const farben: Record<number, number> = { 0: 0x14110c, 1: 0x8a5a2a, 2: 0x4a443a };
    return { name: `V7 - Verlies/Burg (${d.raeume} Räume)`, w: d.w, h: d.h, grid: d.grid, solid: (t) => t === 0, farbe: (t) => farben[t] ?? 0x4a443a };
  }
  if (version === 4) {
    const d = baueHoehle(Math.random);
    const farben: Record<number, number> = { 0: 0x14110c, 1: 0x39322a, 2: 0x8a5a2a, 3: 0x5a6076 };
    return { name: `V4 - Höhle mit ${d.raeume} begehbaren Räumen`, w: d.w, h: d.h, grid: d.grid, solid: (t) => t === 0, farbe: (t) => farben[t] ?? 0x39322a };
  }
  const d = baueVerbundeneRaeume(Math.random);
  const farben: Record<number, number> = { 0: 0x14110c, 1: 0x4a443a, 2: 0x5a6076 };
  return { name: `V5 - Verbundene Räume (${d.raeume}) + Füllräume`, w: d.w, h: d.h, grid: d.grid, solid: (t) => t === 0, farbe: (t) => farben[t] ?? 0x4a443a };
}

// Eine selbst gezeichnete Editor-Vorlage (Codes: 2 Wand, 0 Leer/Fels = solide;
// 1 Boden, 3 Tür, 4 Gang = begehbar) als ProbeKarte - damit Begehen UND Spielen
// die gezeichnete Vorlage identisch behandeln (Runde 53, Autorwunsch).
export function vorlageKarte(grid: number[][], name = 'Editor-Vorlage'): ProbeKarte {
  return {
    name, w: grid[0]?.length ?? 0, h: grid.length,
    grid: grid.map((r) => [...r]),
    solid: (t) => t === 2 || t === 0,
    farbe: (t) => VORLAGE_FARBE[t as EditCode] ?? 0x100d0a,
  };
}

// Nächste begehbare Kachel von der Mitte aus (Ringsuche) - Startpunkt.
export function findeStartKachel(k: ProbeKarte): { x: number; y: number } {
  const cx = Math.floor(k.w / 2), cy = Math.floor(k.h / 2);
  for (let r = 0; r < Math.max(k.w, k.h); r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 1 || y < 1 || x >= k.w - 1 || y >= k.h - 1) continue;
      if (!k.solid(k.grid[y][x])) return { x, y };
    }
  }
  return { x: cx, y: cy };
}
