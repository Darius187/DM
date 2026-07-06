// Tests fuer den Diablo-1-Dungeon-Generator (R102): Eigenschaften, die fuer
// JEDE Auswuerfelung gelten muessen - Erreichbarkeit, Vault-Abkapselung,
// Editor-Kompatibilitaet, Rollen-Regeln. Viele Seeds = Property-Tests.

import { describe, it, expect } from 'vitest';
import { baueDiabloDungeon, type DiabloDungeonResult, type DiabloRaum } from '../src/world/diabloDungeon';
import { seededRng } from '../src/logic/rng';
import { exportiere, parse, type EditCode } from '../src/world/dungeonVorlage';
import { DIABLO_GEN, DIABLO_ROLLEN, DIABLO_EREIGNISSE } from '../src/data/diabloDungeon';

const SEEDS = [1, 7, 42, 99, 1234, 5678, 31337, 424242, 987654, 20260706];
const ergebnisse: DiabloDungeonResult[] = SEEDS.map((s) => baueDiabloDungeon(seededRng(s)));

const BEGEHBAR = new Set([1, 3, 4]);
const innen = (r: DiabloRaum): Array<[number, number]> => {
  const aus: Array<[number, number]> = [];
  for (let y = r.rect.y + 1; y < r.rect.y + r.rect.h - 1; y++) {
    for (let x = r.rect.x + 1; x < r.rect.x + r.rect.w - 1; x++) aus.push([x, y]);
  }
  return aus;
};

// Flutung ab Start ueber begehbare Kacheln (4er-Nachbarschaft)
function flute(tiles: EditCode[][], sx: number, sy: number): Set<string> {
  const gesehen = new Set<string>([`${sx},${sy}`]);
  const queue: Array<[number, number]> = [[sx, sy]];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (gesehen.has(k) || !BEGEHBAR.has(tiles[ny]?.[nx] ?? 0)) continue;
      gesehen.add(k); queue.push([nx, ny]);
    }
  }
  return gesehen;
}
const startVon = (d: DiabloDungeonResult): [number, number] => {
  const e = d.rooms[d.entranceRoomId];
  return innen(e).find(([x, y]) => d.tiles[y][x] === 1)!;
};

describe('Diablo-Dungeon: Grundgeruest', () => {
  it('nutzt NUR die Editor-Kachelcodes 0-4 und die Konfig-Masse', () => {
    for (const d of ergebnisse) {
      expect(d.w).toBe(DIABLO_GEN.w);
      expect(d.h).toBe(DIABLO_GEN.h);
      for (const zeile of d.tiles) for (const c of zeile) expect([0, 1, 2, 3, 4]).toContain(c);
    }
  });

  it('ist deterministisch: gleicher Seed -> identisches Ergebnis', () => {
    const a = baueDiabloDungeon(seededRng(42));
    const b = baueDiabloDungeon(seededRng(42));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('platziert genug Raeume (3x-Groesse) und 2-6 Vaults', () => {
    for (const d of ergebnisse) {
      const haupt = d.rooms.filter((r) => !r.istVault);
      const vaults = d.rooms.filter((r) => r.istVault);
      expect(haupt.length).toBeGreaterThanOrEqual(14);
      expect(haupt.length).toBeLessThanOrEqual(DIABLO_GEN.raumAnzahl[1]);
      expect(vaults.length).toBeGreaterThanOrEqual(2);
      expect(vaults.length).toBeLessThanOrEqual(DIABLO_GEN.vaultAnzahl[1]);
    }
  });

  it('Raeume ueberlappen sich nie (Wand dazwischen)', () => {
    for (const d of ergebnisse) {
      for (let i = 0; i < d.rooms.length; i++) {
        for (let j = i + 1; j < d.rooms.length; j++) {
          const a = d.rooms[i].rect, b = d.rooms[j].rect;
          const schnitt = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
          expect(schnitt, `Raum ${i} und ${j} ueberlappen`).toBe(false);
        }
      }
    }
  });
});

describe('Diablo-Dungeon: Erreichbarkeit (kein toter Raum)', () => {
  it('JEDER Raum (auch jeder Vault) ist vom Eingang aus begehbar', () => {
    for (const d of ergebnisse) {
      const [sx, sy] = startVon(d);
      const erreicht = flute(d.tiles, sx, sy);
      for (const raum of d.rooms) {
        const boden = innen(raum).filter(([x, y]) => d.tiles[y][x] === 1);
        expect(boden.length, `Raum ${raum.id} (${raum.rolle}) hat keinen Boden`).toBeGreaterThan(0);
        const ok = boden.some(([x, y]) => erreicht.has(`${x},${y}`));
        expect(ok, `Raum ${raum.id} (${raum.rolle}${raum.istVault ? ', Vault' : ''}) unerreichbar`).toBe(true);
      }
    }
  });

  it('jede Tuer ist GERADE durchschreitbar (gegenueberliegende Seiten frei)', () => {
    for (const d of ergebnisse) {
      for (let y = 0; y < d.h; y++) {
        for (let x = 0; x < d.w; x++) {
          if (d.tiles[y][x] !== 3) continue;
          const ns = BEGEHBAR.has(d.tiles[y - 1]?.[x] ?? 0) && BEGEHBAR.has(d.tiles[y + 1]?.[x] ?? 0);
          const ow = BEGEHBAR.has(d.tiles[y]?.[x - 1] ?? 0) && BEGEHBAR.has(d.tiles[y]?.[x + 1] ?? 0);
          expect(ns || ow, `Tuer bei ${x},${y} ist kaputt`).toBe(true);
        }
      }
    }
  });
});

describe('Diablo-Dungeon: Vaults (Kernwunsch)', () => {
  it('jeder Vault hat GENAU EINE Tuer in seinem Ring', () => {
    for (const d of ergebnisse) {
      for (const v of d.rooms.filter((r) => r.istVault)) {
        expect(v.tueren.length, `Vault ${v.id} (${v.rolle})`).toBe(1);
      }
    }
  });

  it('verschliesst man die Vault-Tuer, ist der Vault KOMPLETT abgekapselt', () => {
    for (const d of ergebnisse) {
      for (const v of d.rooms.filter((r) => r.istVault)) {
        const kopie = d.tiles.map((z) => [...z]) as EditCode[][];
        const tuer = v.tueren[0];
        kopie[tuer.y][tuer.x] = 2;
        const [sx, sy] = startVon(d);
        const erreicht = flute(kopie, sx, sy);
        const boden = innen(v).filter(([x, y]) => kopie[y][x] === 1);
        const nochErreichbar = boden.some(([x, y]) => erreicht.has(`${x},${y}`));
        expect(nochErreichbar, `Vault ${v.id} hat eine zweite Oeffnung`).toBe(false);
      }
    }
  });

  it('mindestens eine Vault-Tuer ist GEHEIM markiert', () => {
    for (const d of ergebnisse) {
      const vaults = d.rooms.filter((r) => r.istVault);
      if (!vaults.length) continue;
      expect(vaults.some((v) => v.tueren[0].geheim)).toBe(true);
    }
  });
});

describe('Diablo-Dungeon: Rollen (Phase 2/3)', () => {
  it('genau EIN Eingang und EINE Bossarena; Boss weit weg vom Eingang', () => {
    for (const d of ergebnisse) {
      const eingaenge = d.rooms.filter((r) => r.rolle === 'eingang');
      const bosse = d.rooms.filter((r) => r.rolle === 'bossarena');
      expect(eingaenge.length).toBe(1);
      expect(bosse.length).toBe(1);
      expect(d.entranceRoomId).not.toBe(d.bossRoomId);
      // Boss unter den 3 graph-fernsten Haupt-Raeumen
      const distanzen = d.rooms.filter((r) => !r.istVault && r.id !== d.entranceRoomId)
        .map((r) => r.distanz).sort((a, b) => b - a);
      expect(bosse[0].distanz).toBeGreaterThanOrEqual(distanzen[Math.min(2, distanzen.length - 1)]);
    }
  });

  it('Rollen-Obergrenzen werden respektiert; Schatzkammer liegt im Vault', () => {
    for (const d of ergebnisse) {
      const zaehler = new Map<string, number>();
      for (const r of d.rooms) zaehler.set(r.rolle, (zaehler.get(r.rolle) ?? 0) + 1);
      for (const [rolle, n] of zaehler) {
        expect(n, `Rolle ${rolle}`).toBeLessThanOrEqual(DIABLO_ROLLEN[rolle as keyof typeof DIABLO_ROLLEN].max);
      }
      for (const r of d.rooms.filter((x) => x.rolle === 'schatzkammer')) {
        expect(r.istVault, 'Schatzkammer muss im Vault liegen').toBe(true);
      }
    }
  });

  it('Staffelung: gefaehrliche Rollen liegen im Schnitt naeher am Boss als ruhige', () => {
    let ruhigSumme = 0, ruhigN = 0, gefahrSumme = 0, gefahrN = 0;
    for (const d of ergebnisse) {
      for (const r of d.rooms) {
        const lage = DIABLO_ROLLEN[r.rolle].lage;
        if (lage === 'ruhig') { ruhigSumme += r.blutStufe; ruhigN++; }
        if (lage === 'gefahr' && r.rolle !== 'bossarena') { gefahrSumme += r.blutStufe; gefahrN++; }
      }
    }
    expect(ruhigN).toBeGreaterThan(0);
    expect(gefahrN).toBeGreaterThan(0);
    expect(gefahrSumme / gefahrN).toBeGreaterThan(ruhigSumme / ruhigN);
  });

  it('Marker: Eingang ohne Gegner, Boss-Marker in der Arena, Spawns auf Raumboden', () => {
    for (const d of ergebnisse) {
      const eingang = d.rooms[d.entranceRoomId];
      expect(eingang.spawns.some((s) => s.typ.startsWith('gegner_'))).toBe(false);
      expect(eingang.spawns.some((s) => s.typ === 'prop_treppe_auf')).toBe(true);
      const boss = d.rooms[d.bossRoomId];
      expect(boss.spawns.some((s) => s.typ === 'gegner_boss')).toBe(true);
      for (const r of d.rooms) {
        for (const s of r.spawns) {
          if (s.typ === 'ereignis_blutgang') continue;   // liegt bewusst auf der Tuer
          expect(d.tiles[s.y][s.x], `${s.typ} in Raum ${r.id} liegt nicht auf Boden`).toBe(1);
        }
      }
    }
  });

  it('Ereignis-Marker: nur bekannte Typen, Obergrenzen eingehalten', () => {
    for (const d of ergebnisse) {
      const zaehler = new Map<string, number>();
      for (const r of d.rooms) {
        for (const s of r.spawns.filter((x) => x.typ.startsWith('ereignis_'))) {
          const name = s.typ.replace('ereignis_', '');
          if (name === 'blutgang') continue;
          expect(Object.keys(DIABLO_EREIGNISSE)).toContain(name);
          expect(DIABLO_EREIGNISSE[name].rollen).toContain(r.rolle);
          zaehler.set(name, (zaehler.get(name) ?? 0) + 1);
        }
      }
      for (const [name, n] of zaehler) expect(n).toBeLessThanOrEqual(DIABLO_EREIGNISSE[name].max);
    }
  });
});

describe('Diablo-Dungeon: Editor-Kompatibilitaet', () => {
  it('Export -> Parse ist verlustfrei (Round-Trip mit dungeonVorlage)', () => {
    const d = ergebnisse[0];
    const code = exportiere(d.tiles, 8);
    const zurueck = parse(code);
    expect(zurueck).not.toBeNull();
    expect(zurueck).toEqual(d.tiles);
  });
});
