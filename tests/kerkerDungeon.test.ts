import { describe, expect, it } from 'vitest';
import { baueKerker, fluteVonErstemRaum } from '../src/world/kerkerDungeon';
import { KERKER_GEN } from '../src/data/kerker';
import { seededRng } from '../src/logic/rng';

const mitSeed = (seed: number) => { const r = seededRng(seed); return baueKerker(() => r.random()); };

describe('Kerker-Generator (rekursive Flaechenteilung)', () => {
  it('ist deterministisch bei gleichem Seed', () => {
    const a = mitSeed(42), b = mitSeed(42);
    expect(a.grid).toEqual(b.grid);
    expect(a.raeume.length).toBe(b.raeume.length);
  });

  it('fuellt die Flaeche LUECKENLOS (kein Fels, kein Gang - nur Boden/Wand/Tuer)', () => {
    for (const seed of [1, 42, 777]) {
      const d = mitSeed(seed);
      for (const zeile of d.grid) for (const t of zeile) expect([1, 2, 3]).toContain(t);
    }
  });

  it('haelt den Aussenrahmen als Wand', () => {
    const d = mitSeed(42);
    for (let x = 0; x < d.w; x++) { expect(d.grid[0][x]).toBe(2); expect(d.grid[d.h - 1][x]).toBe(2); }
    for (let y = 0; y < d.h; y++) { expect(d.grid[y][0]).toBe(2); expect(d.grid[y][d.w - 1]).toBe(2); }
  });

  it('macht ALLE Raeume vom ersten Raum aus erreichbar (Spanning Tree + Flood-Fill)', () => {
    for (const seed of [1, 42, 777, 2026]) {
      const d = mitSeed(seed);
      const erreicht = fluteVonErstemRaum(d.grid, d.w, d.h, d.raeume);
      expect(erreicht.size).toBe(d.raeume.length);
    }
  });

  it('setzt Tueren nur dort, wo BEIDE gegenueberliegenden Seiten Boden sind', () => {
    const d = mitSeed(42);
    let tueren = 0;
    for (let y = 1; y < d.h - 1; y++) for (let x = 1; x < d.w - 1; x++) {
      if (d.grid[y][x] !== 3) continue;
      tueren++;
      const hori = d.grid[y][x - 1] === 1 && d.grid[y][x + 1] === 1;
      const vert = d.grid[y - 1][x] === 1 && d.grid[y + 1][x] === 1;
      expect(hori || vert).toBe(true);
    }
    expect(tueren).toBeGreaterThan(0);
  });

  it('erzeugt GEMISCHTE Raumgroessen (Saele neben Zellen) und genug Raeume', () => {
    for (const seed of [1, 42, 777]) {
      const d = mitSeed(seed);
      expect(d.raeume.length).toBeGreaterThanOrEqual(15);
      const flaechen = d.raeume.map((r) => r.w * r.h);
      const min = Math.min(...flaechen), max = Math.max(...flaechen);
      expect(max).toBeGreaterThanOrEqual(min * 3);   // Saal deutlich groesser als Zelle
      // kein Raum unterschreitet die konfigurierte Mindestkante
      for (const r of d.raeume) { expect(Math.min(r.w, r.h)).toBeGreaterThanOrEqual(KERKER_GEN.minRaum); }
    }
  });

  it('gibt jedem Raum seine Tueren-Liste (fuer spaetere Rollen/Vaults)', () => {
    const d = mitSeed(42);
    // jeder Raum hat mindestens eine Tuer (sonst waere er nicht erreichbar)
    for (const r of d.raeume) expect(r.tueren.length).toBeGreaterThanOrEqual(1);
  });
});
