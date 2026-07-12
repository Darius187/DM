import { describe, it, expect } from 'vitest';
import { buildCrypt, buildBoss, BOSS_TORE, BOSS_KAMMERN, buildVillage, buildInterior, buildKirchenschiff, verschiebeHaus, DORF_WALDRAND, type AreaData } from '../src/world/areagen';
import { INNENRAEUME } from '../src/data/innenraeume';
import { VOLK } from '../src/data/dialoge';
import { SOLID, T } from '../src/world/tiles';
import { seededRng } from '../src/logic/rng';

// Breitensuche über begehbare Tiles
function reachable(a: AreaData, fromX: number, fromY: number): boolean[][] {
  const seen = Array.from({ length: a.h }, () => new Array<boolean>(a.w).fill(false));
  const queue: Array<[number, number]> = [[fromX, fromY]];
  seen[fromY][fromX] = true;
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= a.w || ny >= a.h || seen[ny][nx]) continue;
      // Mauerrisse (Geheimkammern, Runde 40) sind aufbrechbar - der Spieler
      // kommt durch, also zählen sie für die Erreichbarkeit als begehbar
      if (SOLID.has(a.map[ny][nx]) && a.map[ny][nx] !== T.CRACK) continue;
      seen[ny][nx] = true;
      queue.push([nx, ny]);
    }
  }
  return seen;
}

// Ein Ziel gilt als erreichbar, wenn ein Nachbar-Tile begehbar erreicht wird
function targetReachable(seen: boolean[][], tx: number, ty: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (seen[ty + dy]?.[tx + dx]) return true;
    }
  }
  return false;
}

describe('Krypta-Generator: jeder Spezialraum erreichbar', () => {
  for (let depth = 1; depth <= 3; depth++) {
    it(`Ebene ${depth}: 40 Seeds ohne unerreichbare Räume`, () => {
      for (let seed = 1; seed <= 40; seed++) {
        const a = buildCrypt(depth, seededRng(seed * 7919));
        const sx = Math.floor(a.spawn.x / 32), sy = Math.floor(a.spawn.y / 32);
        const seen = reachable(a, sx, sy);
        // Treppe nach unten
        const down = a.downPos!;
        expect(targetReachable(seen, Math.floor(down.x / 32), Math.floor(down.y / 32)),
          `Seed ${seed}: Abstieg unerreichbar`).toBe(true);
        // Spezialräume
        for (const sp of a.special) {
          expect(targetReachable(seen, sp.x, sp.y), `Seed ${seed}: ${sp.raum} unerreichbar`).toBe(true);
        }
        // Truhen und Schreine
        for (const ch of a.chests) {
          expect(targetReachable(seen, Math.floor(ch.x / 32), Math.floor(ch.y / 32)), `Seed ${seed}: Truhe unerreichbar`).toBe(true);
        }
        for (const s of a.shrines) {
          expect(targetReachable(seen, Math.floor(s.x / 32), Math.floor(s.y / 32)), `Seed ${seed}: Schrein unerreichbar`).toBe(true);
        }
      }
    });
  }

  it('Pflicht-Spezialräume je Ebene vorhanden', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const ids = (n: number) => buildCrypt(n, seededRng(seed * 104729)).special.map((s) => s.id);
      expect(ids(1)).toContain('bibliothek');
      expect(ids(1)).toContain('folterkammer');
      expect(ids(1)).toContain('schrein');
      const e2 = ids(2);
      expect(e2).toContain('beinhaus');
      expect(e2).toContain('annaGrab');
      expect(e2).toContain('blutbrunnen');
      expect(ids(3)).toContain('blutbrunnen');
      // Kultstätte: zwei Altäre
      expect(ids(3).filter((x) => x === 'altar').length).toBe(2);
    }
  });

  it('Geheimkammer: bis zum Aufbrechen massiver Fels, dann erreichbar', () => {
    let gefunden = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const a = buildCrypt(((seed % 5) + 1), seededRng(seed * 5003));
      const cracks = a.cracks ?? [];
      if (!cracks.length) continue;
      gefunden++;
      const c = cracks[0];
      // Vor dem Aufbrechen: Riss-Kachel ist CRACK, die Kammer ist KOMPLETT Wand
      // (wirklich unsichtbar, kein ausgehobener Raum, der Licht durchlässt)
      expect(a.map[c.ty][c.tx], `Seed ${seed}: Riss-Kachel ist kein CRACK`).toBe(T.CRACK);
      expect(c.kammer.every(([x, y]) => a.map[y][x] === T.WALL), `Seed ${seed}: Kammer ist nicht massiv`).toBe(true);
      const kx = Math.floor(c.chestX / 32), ky = Math.floor(c.chestY / 32);
      const sx = Math.floor(a.spawn.x / 32), sy = Math.floor(a.spawn.y / 32);
      // Selbst wenn man den Riss als begehbar zählt: dahinter ist Fels -> die
      // Truhe ist NICHT erreichbar, solange nichts ausgehoben wurde
      expect(targetReachable(reachable(a, sx, sy), kx, ky), `Seed ${seed}: Truhe vorm Aufbrechen erreichbar`).toBe(false);
      // Nach dem Aufbrechen (Riss + Kammer ausgehoben) ist die Truhe erreichbar
      const offen: AreaData = { ...a, map: a.map.map((r) => [...r]) };
      offen.map[c.ty][c.tx] = T.FLOOR;
      for (const [x, y] of c.kammer) offen.map[y][x] = T.FLOOR;
      expect(targetReachable(reachable(offen, sx, sy), kx, ky), `Seed ${seed}: Truhe nach Aufbrechen unerreichbar`).toBe(true);
    }
    expect(gefunden, 'In 60 Seeds entstand keine einzige Geheimkammer').toBeGreaterThan(5);
  });

  it('Bossraum: Aufgang erreichbar, Leibwache gesetzt (Boss kommt erst nach ihrem Fall)', () => {
    const a = buildBoss(seededRng(1), false);
    const sx = Math.floor(a.spawn.x / 32), sy = Math.floor(a.spawn.y / 32);
    const seen = reachable(a, sx, sy);
    expect(targetReachable(seen, Math.floor(a.upPos!.x / 32), Math.floor(a.upPos!.y / 32))).toBe(true);
    // Statt des Tempelritters steht zuerst seine Leibwache im Raum
    expect(a.enemySpawns.some((e) => e.champion)).toBe(true);
    expect(a.enemySpawns.some((e) => e.type === 'templer')).toBe(false);
    expect(buildBoss(seededRng(1), true).enemySpawns.length).toBe(0);
  });

  it('verschiebeHaus: Wände, Tür und Name wandern mit - keine unsichtbaren Wände zurück', () => {
    const a = buildVillage(seededRng(1));
    const hp = a.hausPlaetze!.find((p) => p.id === 'taverne')!;
    const alt = { x0: hp.x0, y0: hp.y0, x1: hp.x1, y1: hp.y1 };
    const tuerAlt = a.doors!.find((d) => d.haus === 'taverne')!;
    const tuerPos = { x: tuerAlt.x, y: tuerAlt.y };
    verschiebeHaus(a, hp, 3, 2);
    // Alte Fläche: keine Haus-Kacheln mehr (alles Gras)
    for (let y = alt.y0; y <= alt.y1; y++) {
      for (let x = alt.x0; x <= alt.x1; x++) {
        if (x >= alt.x0 + 3 && y >= alt.y0 + 2) continue; // Überlappung mit Ziel
        expect(a.map[y][x]).toBe(T.GRASS);
      }
    }
    // Neue Fläche: Tür-Kachel sitzt am verschobenen Ort, Eintrag folgt
    expect(tuerAlt.x).toBe(tuerPos.x + 3);
    expect(tuerAlt.y).toBe(tuerPos.y + 2);
    expect(a.map[tuerAlt.y][tuerAlt.x]).toBe(T.HDOOR);
    expect(hp.x0).toBe(alt.x0 + 3);
    expect(hp.y1).toBe(alt.y1 + 2);
  });

  it('Kirchenschiff: Rückkehr aus der Krypta landet VOR dem Altar, Weg zur Tür frei', () => {
    const a = buildKirchenschiff(seededRng(1));
    // Rückkehrpunkt: downPos + 2,2 Kacheln nach Süden (siehe WorldScene)
    const rx = Math.floor(a.downPos!.x / 32);
    const ry = Math.floor((a.downPos!.y + 2.2 * 32) / 32);
    expect(SOLID.has(a.map[ry][rx]), 'Rückkehrkachel ist fest').toBe(false);
    // Von dort muss die Dorftür (HDOOR) erreichbar sein
    const seen = reachable(a, rx, ry);
    const tuer = a.doors![0];
    expect(targetReachable(seen, tuer.x, tuer.y)).toBe(true);
  });

  it('Bossgrab (Runde 21): drei Kammern, Gittertore versiegeln die hinteren zwei', () => {    const zu = buildBoss(seededRng(1), false);
    const sx = Math.floor(zu.spawn.x / 32), sy = Math.floor(zu.spawn.y / 32);
    const gesehenZu = reachable(zu, sx, sy);
    // Solange der Ritter lebt: Kammer 2 (Halle) und 3 (Inneres Grab) gesperrt
    expect(BOSS_TORE.every((tor) => tor.xs.every((tx) => zu.map[tor.y][tx] === T.CAGE))).toBe(true);
    expect(targetReachable(gesehenZu, Math.floor(BOSS_KAMMERN[1].cx), BOSS_KAMMERN[1].cy)).toBe(false);
    expect(targetReachable(gesehenZu, Math.floor(BOSS_KAMMERN[2].cx), BOSS_KAMMERN[2].cy)).toBe(false);
    // Spawn und Leibwache liegen in Kammer 1 (Vorhof)
    expect(targetReachable(gesehenZu, Math.floor(BOSS_KAMMERN[0].cx), BOSS_KAMMERN[0].cy)).toBe(true);
    for (const e of zu.enemySpawns) expect(gesehenZu[Math.floor(e.y / 32)][Math.floor(e.x / 32)]).toBe(true);
    // Nach dem Sieg: Tore offen, alle drei Kammern und der Abstieg erreichbar
    const offen = buildBoss(seededRng(1), true);
    const gesehenOffen = reachable(offen, sx, sy);
    for (const k of BOSS_KAMMERN) expect(targetReachable(gesehenOffen, Math.floor(k.cx), k.cy)).toBe(true);
    expect(targetReachable(gesehenOffen, Math.floor(offen.downPos!.x / 32), Math.floor(offen.downPos!.y / 32))).toBe(true);
  });

  it('Endlose Tiefe: Ebene 8 begehbar, Abstieg im Bossraum nach dem Sieg', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const a = buildCrypt(8, seededRng(seed * 31));
      expect(a.depth).toBe(8);
      expect(a.name).toContain('Tiefe 8');
      const sx = Math.floor(a.spawn.x / 32), sy = Math.floor(a.spawn.y / 32);
      const seen = reachable(a, sx, sy);
      expect(targetReachable(seen, Math.floor(a.downPos!.x / 32), Math.floor(a.downPos!.y / 32)),
        `Seed ${seed}: Abstieg unerreichbar`).toBe(true);
    }
    // Nach dem Boss-Sieg öffnet sich der Abstieg in die Endlose Tiefe
    const b = buildBoss(seededRng(1), true);
    expect(b.map[3][16]).toBe(T.STAIR);
    expect(b.downPos).toBeTruthy();
  });

  it('Stadtmauer: Palisadenring geschlossen, Tore der Salzstraße bleiben offen', () => {
    // Runde 51: Das Dorf (92x60) liegt jetzt mittig in einer von Wald
    // umschlossenen Karte; der Palisadenring wandert um DORF_WALDRAND nach innen.
    const R = DORF_WALDRAND;
    const a = buildVillage(seededRng(7), 0, 1);
    // Ring vorhanden (Stichproben oben/unten/links/rechts)
    expect(a.map[2 + R][20 + R]).toBe(T.PALISADE);
    expect(a.map[57 + R][20 + R]).toBe(T.PALISADE); // 57 = alte Höhe 60 - 3
    expect(a.map[20 + R][2 + R]).toBe(T.PALISADE);
    // West- und Ost-Tor (Salzstraße) bleiben begehbar
    expect(a.map[30 + R][2 + R]).toBe(T.PATH);
    expect(a.map[30 + R][89 + R]).toBe(T.PATH); // 89 = alte Breite 92 - 3
    // Ohne Mauer keine Palisade
    const b = buildVillage(seededRng(7), 0, 0);
    expect(b.map[2 + R][20 + R]).not.toBe(T.PALISADE);
  });

  it('Innenräume: Tür vorhanden, Möbel im Raum, Dorf-Türen zeigen auf echte Stuben', () => {
    for (const [haus, def] of Object.entries(INNENRAEUME)) {
      const a = buildInterior(def);
      expect(a.innen).toBe(true);
      expect(a.innenHaus).toBe(haus === def.haus ? haus : def.haus);
      // Tür in der Südwand, Spawn davor begehbar
      const doorX = Math.floor(def.w / 2);
      expect(a.map[def.h - 1][doorX]).toBe(T.HDOOR);
      expect(SOLID.has(a.map[def.h - 2][doorX])).toBe(false);
      // Möbel liegen im Raum (nicht in den Wänden) und nicht vor der Tür
      for (const m of def.moebel) {
        expect(m.x, `${haus}: ${m.tile} in der Wand`).toBeGreaterThan(0);
        expect(m.x).toBeLessThan(def.w - 1);
        expect(m.y).toBeGreaterThan(0);
        expect(m.y).toBeLessThan(def.h - 1);
        expect(m.x === doorX && m.y === def.h - 2, `${haus}: ${m.tile} blockiert die Tür`).toBe(false);
      }
    }
    // Jede Dorf-Haustür führt in eine definierte Stube
    const dorf = buildVillage(seededRng(3), 0, 0);
    expect(dorf.doors!.length).toBeGreaterThanOrEqual(10);
    for (const d of dorf.doors!) {
      expect(INNENRAEUME[d.haus], `Tür ohne Innenraum: ${d.haus}`).toBeTruthy();
      expect(dorf.map[d.y][d.x]).toBe(T.HDOOR);
      // Vor der Tür ist begehbarer Boden
      expect(SOLID.has(dorf.map[d.y + 1][d.x]), `Tür von ${d.haus} ist zugebaut`).toBe(false);
    }
  });

  it('M1 Dorfwirtschaft: das Autor-Roster steht im Dorf, alle ansprechbar', () => {
    const dorf = buildVillage(seededRng(5), 0, 0);
    const ids = dorf.npcs.map((n) => n.id);
    // Das 23-Personen-Roster des Autors (Auftrag Dorfwirtschaft M1)
    for (const id of ['schulze', 'johannes', 'kuester', 'heinrich', 'wirtin', 'schmied',
      'mueller', 'baecker', 'zimmermann', 'holzfaeller', 'fischer', 'imker', 'magdalena',
      'hebamme', 'magd', 'bauer1', 'bauer2', 'kind1', 'bauer3', 'bauer4', 'hirte',
      'witwe', 'kind2'] as const) {
      expect(ids, `fehlt im Dorf: ${id}`).toContain(id);
    }
    // Gestrichen (Autor: gehoeren in die Hauptstadt): keine Geisterzuenfte mehr
    for (const id of ['bader', 'kuefer', 'weberin', 'gerber', 'schaefer', 'waescherin'] as const) {
      expect(ids, `sollte gestrichen sein: ${id}`).not.toContain(id);
    }
    // Jeder Dorf-NPC ist ansprechbar: Sonderfaelle oder VOLK-Zeilen
    const sonder = new Set(['heinrich', 'magdalena', 'johannes', 'schmied', 'mueller', 'bauer1', 'bauer2', 'haendler', 'landherr']);
    for (const n of dorf.npcs) {
      expect(sonder.has(n.id) || !!VOLK[n.id], `stumm: ${n.id}`).toBe(true);
    }
    // Schafweide bleibt (Familie B versorgt sie), Tiere vorhanden
    expect(dorf.animals.some((t) => t.type === 'schaf')).toBe(true);
    expect(dorf.animals.some((t) => t.type === 'kuh')).toBe(true);
  });

  it('M2 Dorfwirtschaft: Arbeits-Stationen stehen an den Ankern', () => {
    const dorf = buildVillage(seededRng(5), 0, 0);
    const arten = (dorf.stationen ?? []).map((s) => s.art);
    expect(arten).toContain('amboss');
    expect(arten).toContain('backofen');
    expect(arten).toContain('holzstapel');
    expect(arten.filter((a) => a === 'bienenkorb').length).toBeGreaterThanOrEqual(3);
    // Amboss steht nahe am Schmied-Anker (Funken haben einen Ort)
    const schmied = dorf.npcs.find((n) => n.id === 'schmied')!;
    const amboss = (dorf.stationen ?? []).find((s) => s.art === 'amboss')!;
    expect(Math.hypot(amboss.x - schmied.x, amboss.y - schmied.y)).toBeLessThan(64);
  });

  it('max. 2 Skript-Schreckmomente pro Ebene', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const a = buildCrypt(1, seededRng(seed));
      const scares = a.breakables.filter((b) => b.ambush).length;
      expect(a.scareBudget).toBeGreaterThanOrEqual(0);
      expect(scares).toBeLessThanOrEqual(2);
    }
  });

  it('Treppen liegen auf den richtigen Tiles', () => {
    const a = buildCrypt(2, seededRng(42));
    expect(a.map[Math.floor(a.upPos!.y / 32)][Math.floor(a.upPos!.x / 32)]).toBe(T.STAIRUP);
    expect(a.map[Math.floor(a.downPos!.y / 32)][Math.floor(a.downPos!.x / 32)]).toBe(T.STAIR);
  });
});
