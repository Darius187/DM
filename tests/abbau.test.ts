// STUFEN-ABBAU (R80, "wie 7 Days to Die"): Fels/Erz zerfallen in Stufen und
// zahlen anteilig aus. Diese Tests sichern die reine Formel-Logik ab -
// die Optik (Risse/Geröll) wird im Browser verifiziert.
import { describe, expect, it } from 'vitest';
import { GATHER, abbauStufe, abbauSoll } from '../src/data/crafting';

// Einen kompletten Abbau simulieren (wie WorldScene.mine je Schlag)
function simuliere(maxHp: number, inhalt: number): { stufen: number[]; zahlungen: number[] } {
  let hp = maxHp, gegeben = 0;
  const stufen: number[] = [], zahlungen: number[] = [];
  while (hp > 0) {
    hp -= 1;
    const stufe = abbauStufe(hp, maxHp);
    stufen.push(stufe);
    const soll = hp <= 0 ? inhalt : abbauSoll(stufe, inhalt);
    zahlungen.push(Math.max(0, soll - gegeben));
    gegeben = Math.max(gegeben, soll);
  }
  return { stufen, zahlungen };
}

describe('Stufen-Abbau (7DtD)', () => {
  it('Fels (4 Schläge): ganz -> rissig -> Geröll -> weg', () => {
    const { stufen } = simuliere(GATHER.felsSchlaege, 6);
    expect(stufen).toEqual([0, 1, 2, 3]);
  });

  it('Erzader (5 Schläge) erreicht alle Stufen der Reihe nach', () => {
    const { stufen } = simuliere(GATHER.erzSchlaege, 4);
    expect(stufen[stufen.length - 1]).toBe(3);
    for (let i = 1; i < stufen.length; i++) expect(stufen[i]).toBeGreaterThanOrEqual(stufen[i - 1]);
    expect(new Set(stufen)).toEqual(new Set([0, 1, 2, 3]));
  });

  it('zahlt über alle Stufen GENAU den Gesamt-Inhalt aus (nie mehr, nie weniger)', () => {
    for (const maxHp of [GATHER.felsSchlaege, GATHER.erzSchlaege]) {
      for (let inhalt = 1; inhalt <= 8; inhalt++) {
        const { zahlungen } = simuliere(maxHp, inhalt);
        expect(zahlungen.reduce((a, b) => a + b, 0)).toBe(inhalt);
        for (const z of zahlungen) expect(z).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('jede Zerfalls-Stufe zahlt anteilig (kein Leer-Hacken bis zum Schluss)', () => {
    // Bei Stufe 1 muss bereits etwas ausgezahlt sein (dorfSim-Verhalten)
    expect(abbauSoll(1, 6)).toBeGreaterThan(0);
    expect(abbauSoll(2, 6)).toBeGreaterThan(abbauSoll(1, 6));
    expect(abbauSoll(3, 6)).toBe(6);
  });
});

// Autorbug R80 ("unsichtbare Felsen"): buildStart hatte rocks/ores nur als
// Liste - ohne Map-Kachel gab es weder Bild noch Kollision. Nie wieder.
import { buildStart } from '../src/world/areagen';
import { T } from '../src/world/tiles';
import { seededRng } from '../src/logic/rng';

describe('START-Karte: Felsen/Adern stehen wirklich auf der Map', () => {
  it('jeder rocks/ores-Eintrag hat seine Kachel (T.ROCK/T.ORE), keiner im Wasser', () => {
    const a = buildStart(seededRng(4711));
    expect(a.rocks.length).toBeGreaterThanOrEqual(6);
    expect(a.ores.length).toBeGreaterThanOrEqual(2);
    for (const r of a.rocks) expect(a.map[Math.floor(r.y / 32)][Math.floor(r.x / 32)]).toBe(T.ROCK);
    for (const o of a.ores) expect(a.map[Math.floor(o.y / 32)][Math.floor(o.x / 32)]).toBe(T.ORE);
  });
});
