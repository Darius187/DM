import { describe, it, expect } from 'vitest';
import { Wegfeld, findePfad } from '../src/world/Wegfeld';

// 5x5-Gitter mit senkrechter Wand in Spalte 2 (Reihen 0-3); Reihe 4 = Lücke.
// Ziel oben rechts (4,0), Gegner oben links (0,0): der direkte Weg ist durch die
// Wand versperrt, der einzige Weg führt unten herum durch die Lücke bei (2,4).
const begehbar = (tx: number, ty: number) => !(tx === 2 && ty <= 3);

describe('Wegfeld (Flussfeld-Wegfindung)', () => {
  it('findet einen Weg UM die Wand herum statt direkt hindurch', () => {
    const wf = new Wegfeld(5, 5);
    wf.berechne(4, 0, begehbar);
    expect(wf.erreichbar(0, 0)).toBe(true);     // erreichbar trotz Wand
    // Bestes Nachbarfeld von (0,0) führt NACH UNTEN Richtung Lücke, nicht
    // nach rechts in die Wand.
    const nb = wf.bestesNachbarfeld(0, 0);
    expect(nb).not.toBeNull();
    expect(nb!.ty).toBeGreaterThan(0); // bewegt sich nach unten (um die Wand)
  });

  it('meldet unerreichbare Felder (komplett ummauert)', () => {
    const wf = new Wegfeld(5, 5);
    // Ziel (0,0) komplett von Wand umgeben -> (4,4) unerreichbar
    const dicht = (tx: number, ty: number) => (tx <= 0 || ty <= 0) ? (tx === 0 && ty === 0) : true;
    wf.berechne(0, 0, dicht);
    expect(wf.erreichbar(4, 4)).toBe(false);
    expect(wf.bestesNachbarfeld(4, 4)).toBeNull();
  });

  it('am Ziel selbst gibt es keine Richtung', () => {
    const wf = new Wegfeld(5, 5);
    wf.berechne(2, 2, () => true);
    expect(wf.bestesNachbarfeld(2, 2)).toBeNull();
  });

  it('A*-Pfad führt um die Wand herum (NPC-Wegfindung)', () => {
    // gleiche Wand wie oben: Spalte 2, Reihen 0-3; Lücke bei (2,4)
    const pfad = findePfad(5, 5, begehbar, 0, 0, 4, 0);
    expect(pfad).not.toBeNull();
    // der Pfad MUSS durch die Lücke unten (Reihe 4) laufen, nicht durch die Wand
    expect(pfad!.some(([, ty]) => ty === 4)).toBe(true);
    // keine Kachel im Pfad liegt in der Wand
    expect(pfad!.every(([tx, ty]) => begehbar(tx, ty))).toBe(true);
    // Endpunkt ist das Ziel
    expect(pfad![pfad!.length - 1]).toEqual([4, 0]);
  });
});

// Autor-Befund: "Einheiten laufen erst gegen die Wand und suchen DANN den
// Umweg." Mit gewichteten Kosten (10/14) + String-Pulling steuert die Einheit
// von ANFANG an den entferntesten sichtbaren Pfadpunkt Richtung Luecke an.
describe('Wegfindung nach RTS-Standard (Kosten 10/14 + String-Pulling)', () => {
  const TILE = 32;
  const W = 20, H = 10;
  // Wand bei tx=10 ueber die volle Hoehe, EINZIGE Luecke bei ty=8
  const frei = (tx: number, ty: number) => tx >= 0 && ty >= 0 && tx < W && ty < H && !(tx === 10 && ty !== 8);
  const sichtFrei = (x0: number, y0: number, x1: number, y1: number): boolean => {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const schritte = Math.max(1, Math.ceil(d / (TILE / 2)));
    for (let i = 1; i <= schritte; i++) {
      const t = i / schritte;
      if (!frei(Math.floor((x0 + (x1 - x0) * t) / TILE), Math.floor((y0 + (y1 - y0) * t) / TILE))) return false;
    }
    return true;
  };

  it('der Feld-Abstieg fuehrt durch die Luecke (nicht in die Wand)', async () => {
    const { Wegfeld: WF } = await import('../src/world/Wegfeld');
    const wf = new WF(W, H);
    wf.berechne(13, 2, frei);
    const pfad = wf.pfadVon(8, 2, 40);
    expect(pfad.length).toBeGreaterThan(0);
    expect(pfad.some((p) => p.tx === 10 && p.ty === 8)).toBe(true);   // einzige Querung
    expect(pfad.every((p) => frei(p.tx, p.ty))).toBe(true);
  });

  it('String-Pulling steuert einen WEITEN sichtbaren Punkt an (plant vor der Wand)', async () => {
    const { Wegfeld: WF, ziehePfadStraff } = await import('../src/world/Wegfeld');
    const wf = new WF(W, H);
    wf.berechne(13, 2, frei);
    const sx = 8 * TILE + 16, sy = 2 * TILE + 16;
    const punkte = wf.pfadVon(8, 2, 40).map((p) => ({ x: p.tx * TILE + 16, y: p.ty * TILE + 16 }));
    const zp = ziehePfadStraff(punkte, sx, sy, sichtFrei, 5);
    expect(zp).not.toBeNull();
    // Der Steuerpunkt liegt WEIT voraus (>= 3 Kacheln), nicht auf der Nachbarkachel -
    // die Einheit laeuft also von Anfang an schraeg zur Luecke statt zur Wand.
    expect(Math.hypot(zp!.x - sx, zp!.y - sy)).toBeGreaterThan(3 * TILE);
    // Und die gerade Bahn dorthin ist wirklich frei (kein Wandkontakt).
    expect(sichtFrei(sx, sy, zp!.x, zp!.y)).toBe(true);
  });
});
