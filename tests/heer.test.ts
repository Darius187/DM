import { describe, it, expect } from 'vitest';
import { werbeRekruten, ausruesten, stufeFuerGold } from '../src/logic/heer';
import type { Item } from '../src/data/types';
import { seededRng } from '../src/logic/rng';

function waffe(name: string, val: number, cls: Item['weaponClass']): Item {
  return { kind: 'weapon', name, rarity: 0, val, boni: [], weaponClass: cls };
}
function ruest(name: string, val: number): Item {
  return { kind: 'armor', name, rarity: 0, val, boni: [] };
}
function schild(name: string, val: number): Item {
  return { kind: 'schild', name, rarity: 0, val, boni: [] };
}

describe('Heer: Goldstufen', () => {
  it('mehr Sold pro Kopf = bessere Stufe', () => {
    expect(stufeFuerGold(0).titel).toBe('Gepresste');
    expect(stufeFuerGold(29).titel).toBe('Gepresste');
    expect(stufeFuerGold(30).titel).toBe('Freiwillige und Handwerker');
    expect(stufeFuerGold(70).titel).toBe('Erprobte Söldner');
    expect(stufeFuerGold(500).titel).toBe('Veteranen und Gewappnete');
  });
});

describe('Heer: Auto-Ausrüstung verbraucht die Kiste 1:1', () => {
  it('ein gespendetes besseres Schwert landet auf einem Nahkämpfer und ist dann weg', () => {
    const kiste: Item[] = [waffe('Prachtklinge', 14, 'schwert')];
    const g = ausruesten({ beruf: 'Söldner', rolle: 'nahkampf', stufe: 2 }, kiste);
    expect(g.waffe).toBe('Prachtklinge');
    expect(g.waffeWert).toBe(14);
    expect(kiste).toHaveLength(0);                 // verbraucht
  });

  it('ein Bogen landet NICHT auf einem Nahkämpfer (rollengerecht)', () => {
    const kiste: Item[] = [waffe('Langbogen', 12, 'bogen')];
    const g = ausruesten({ beruf: 'Söldner', rolle: 'nahkampf', stufe: 2 }, kiste);
    expect(g.waffe).toBe('Falchion');              // Standard-Nahkampfwaffe
    expect(kiste).toHaveLength(1);                 // der Bogen bleibt liegen
  });

  it('ein Bogenschütze nimmt den Bogen, keine Nahkampfwaffe', () => {
    const kiste: Item[] = [waffe('Langbogen', 12, 'bogen'), waffe('Schwert', 20, 'schwert')];
    const g = ausruesten({ beruf: 'Armbruster', rolle: 'bogen', stufe: 2 }, kiste);
    expect(g.waffe).toBe('Langbogen');
    expect(kiste.some((i) => i.name === 'Schwert')).toBe(true);   // Schwert bleibt
  });

  it('schwächere Spende als der Standard wird NICHT verbraucht (kein Downgrade)', () => {
    const kiste: Item[] = [waffe('Stumpfes Messer', 3, 'schwert')]; // unter Falchion (7)
    const g = ausruesten({ beruf: 'Söldner', rolle: 'nahkampf', stufe: 2 }, kiste);
    expect(g.waffe).toBe('Falchion');
    expect(kiste).toHaveLength(1);                 // bleibt liegen
  });

  it('Rüstung und Schild werden zugewiesen (Schild nur Nahkampf)', () => {
    const kisteN: Item[] = [ruest('Plattenharnisch', 16), schild('Setzschild', 6)];
    const gN = ausruesten({ beruf: 'Gewappneter', rolle: 'nahkampf', stufe: 5, eigenesGear: true }, kisteN);
    expect(gN.ruestung).toBe('Plattenharnisch');
    expect(gN.schild).toBe('Setzschild');
    expect(kisteN).toHaveLength(0);
    // Bogenschütze bekommt KEIN Schild
    const kisteB: Item[] = [schild('Setzschild', 6)];
    const gB = ausruesten({ beruf: 'Armbruster', rolle: 'bogen', stufe: 2 }, kisteB);
    expect(gB.schild).toBeNull();
    expect(kisteB).toHaveLength(1);
  });

  it('Gepresste (Stufe 1) ohne Spende kommen mit Notbehelf', () => {
    const g = ausruesten({ beruf: 'Gepresster Bauer', rolle: 'nahkampf', stufe: 1 }, []);
    expect(g.waffe).toBe('Knüppel');
    expect(g.ruestung).toBe('Bauernkittel');
  });
});

describe('Heer: werbeRekruten', () => {
  it('liefert benannte, lebende Rekruten mit fortlaufenden IDs', () => {
    const r = werbeRekruten({ gold: 200, anzahl: 4, kiste: [], rng: seededRng(7), startId: 10 });
    expect(r.rekruten).toHaveLength(4);
    expect(r.rekruten.every((u) => !u.tot)).toBe(true);
    expect(r.rekruten.every((u) => u.name.includes(' '))).toBe(true);
    expect(r.rekruten.map((u) => u.id)).toEqual(['rek_10', 'rek_11', 'rek_12', 'rek_13']);
    expect(r.rekruten.every((u) => u.maxhp > 0 && u.dmg > 0)).toBe(true);
  });

  it('verbraucht gespendete Ausrüstung und gibt den Rest zurück', () => {
    const kiste: Item[] = [waffe('Prachtklinge', 14, 'schwert'), ruest('Plattenharnisch', 16), waffe('Übrig', 99, 'axt')];
    const r = werbeRekruten({ gold: 60, anzahl: 1, kiste, rng: seededRng(1) });
    // ein Soldat verbraucht höchstens 1 Waffe + 1 Rüstung -> mind. 1 Stück bleibt
    expect(r.kisteRest.length).toBeGreaterThanOrEqual(1);
    expect(kiste).toHaveLength(3); // Original unverändert (Arbeitskopie)
  });

  it('mehr Gold pro Kopf bringt eine höhere Stufe', () => {
    const arm = werbeRekruten({ gold: 20, anzahl: 4, kiste: [], rng: seededRng(2) });
    const reich = werbeRekruten({ gold: 800, anzahl: 4, kiste: [], rng: seededRng(2) });
    expect(arm.stufe).toBe('Gepresste');
    expect(reich.stufe).toBe('Veteranen und Gewappnete');
    expect(Math.max(...reich.rekruten.map((u) => u.stufe))).toBeGreaterThan(Math.max(...arm.rekruten.map((u) => u.stufe)));
  });
});
