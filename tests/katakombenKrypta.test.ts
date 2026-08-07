// R111 (Autorbug "Streckbank + Wand blockieren einen Durchgang - man kommt
// nicht mehr weiter"): Erreichbarkeit im ECHTEN Level pruefen, also NACH der
// Live-Umwandlung (Props werden solide Kacheln!). Und: keine tuerlosen
// Zwischen-Waende (duenne Wand mit Boden auf BEIDEN Seiten ohne Durchgang).
import { describe, it, expect } from 'vitest';
import { buildKatakombenKrypta } from '../src/world/katakombenKrypta';
import { KATAKOMBEN_EINSATZ } from '../src/data/katakombenDungeon';
import { T, SOLID } from '../src/world/tiles';
import { seededRng } from '../src/logic/rng';
import { TILE } from '../src/gfx/fallbackArt';

const SEEDS = [1, 7, 42, 99, 1234, 5678, 20261, 31337];

// begehbar = nicht solide; T.CRACK (Geheimtuer) zaehlt als begehbar, weil er
// aufgebrochen werden kann (Vaults sind absichtlich verschlossen).
const begehbar = (t: number): boolean => !SOLID.has(t) || t === T.CRACK;

function erreichbar(map: number[][], sx: number, sy: number): boolean[][] {
  const h = map.length, w = map[0].length;
  const seen: boolean[][] = Array.from({ length: h }, () => new Array<boolean>(w).fill(false));
  const stack = [[sx, sy]];
  seen[sy][sx] = true;
  while (stack.length) {
    const [x, y] = stack.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || ny >= h || nx >= w || seen[ny][nx]) continue;
      if (!begehbar(map[ny][nx])) continue;
      seen[ny][nx] = true;
      stack.push([nx, ny]);
    }
  }
  return seen;
}

describe('Katakomben im echten Level (nach Prop-Umwandlung)', () => {
  const vorher = { ebenen: [...KATAKOMBEN_EINSATZ.ebenen], abEbene: KATAKOMBEN_EINSATZ.abEbene };
  it('JEDE begehbare Kachel ist vom Spawn erreichbar (kein Prop blockiert einen Durchgang)', () => {
    for (const seed of SEEDS) {
      const a = buildKatakombenKrypta(2, seededRng(seed));
      const sx = Math.floor(a.spawn.x / TILE), sy = Math.floor(a.spawn.y / TILE);
      const seen = erreichbar(a.map, sx, sy);
      const fehlend: string[] = [];
      for (let y = 0; y < a.h; y++) {
        for (let x = 0; x < a.w; x++) {
          if (begehbar(a.map[y][x]) && a.map[y][x] !== T.WALL && !seen[y][x]) fehlend.push(`${x},${y}(t${a.map[y][x]})`);
        }
      }
      expect(fehlend, `Seed ${seed}: unerreichbare Kacheln: ${fehlend.slice(0, 8).join(' ')}`).toEqual([]);
    }
  });

  it('keine langen tuerlosen Zwischen-Waende (Boden beidseits, kein Durchgang)', () => {
    for (const seed of SEEDS) {
      const a = buildKatakombenKrypta(2, seededRng(seed));
      const frei = (x: number, y: number): boolean => a.map[y]?.[x] !== undefined && begehbar(a.map[y][x]);
      // duenne Wandkachel = Wand mit Boden LINKS+RECHTS oder OBEN+UNTEN.
      const duenn = (x: number, y: number): boolean => a.map[y][x] === T.WALL
        && ((frei(x - 1, y) && frei(x + 1, y)) || (frei(x, y - 1) && frei(x, y + 1)));
      // Laeufe zaehlen: zusammenhaengende duenne Wandstuecke; ab Laenge 4 muss
      // ein Durchgang drin sein (kuerzere sind Ecken/Pfeiler und okay).
      const MAXLAUF = 3;
      const laeufe: string[] = [];
      for (let y = 1; y < a.h - 1; y++) {
        let lauf = 0;
        for (let x = 1; x < a.w; x++) {
          if (duenn(x, y) && frei(x, y - 1) && frei(x, y + 1)) lauf++;
          else { if (lauf > MAXLAUF) laeufe.push(`h@${x - lauf},${y} len${lauf}`); lauf = 0; }
        }
      }
      for (let x = 1; x < a.w - 1; x++) {
        let lauf = 0;
        for (let y = 1; y < a.h; y++) {
          if (duenn(x, y) && frei(x - 1, y) && frei(x + 1, y)) lauf++;
          else { if (lauf > MAXLAUF) laeufe.push(`v@${x},${y - lauf} len${lauf}`); lauf = 0; }
        }
      }
      expect(laeufe, `Seed ${seed}: tuerlose Zwischen-Waende: ${laeufe.slice(0, 6).join(' ')}`).toEqual([]);
    }
  });

  it('Fackeln der Raeume sitzen AN WAND-Kacheln (nicht frei im Raum)', () => {
    for (const seed of SEEDS.slice(0, 3)) {
      const a = buildKatakombenKrypta(2, seededRng(seed));
      let anWand = 0;
      for (const f of a.torches) {
        const tx = Math.floor(f.x / TILE), ty = Math.floor(f.y / TILE);
        if (a.map[ty]?.[tx] === T.WALL || a.map[ty - 1]?.[tx] === T.WALL) anWand++;
      }
      // Altar-/Sonderfackeln duerfen frei stehen - aber die MEHRHEIT haengt an Waenden.
      expect(anWand / Math.max(1, a.torches.length)).toBeGreaterThan(0.6);
    }
  });
  void vorher;
});
