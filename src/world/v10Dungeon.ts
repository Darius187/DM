// V10-Dungeon (R120): prozedural nach der HAND-VORLAGE des Autors (VORLAGE_V2,
// sein "Diablo-1-Raumgefuehl"). Merkmale der Vorlage, die hier nachgebildet
// werden: Raeume Wand an Wand in massiven Wandmassen (unterschiedlich dick),
// L-Formen/Hallen, VERSCHACHTELTE Innenraeume, und kurze GANG-Stummel ('ooo')
// bzw. Tueren durch die Wandmassen. Editor-Codes: 0 Fels · 1 Raumboden ·
// 2 Wand · 3 Tuer · 4 Gang. Groesse wie V8 (84x70). Reine Logik, testbar.

export interface V10Raum { id: number; x: number; y: number; w: number; h: number }
export interface V10Result { w: number; h: number; grid: number[][]; raeume: V10Raum[] }

type RNG = () => number;
interface Rect { x0: number; y0: number; x1: number; y1: number }

const W = 84, H = 70;
const MIN = 9;             // kleinste Raumkante (inkl. Waende)
const WAND_DICKE = [1, 3]; // Wandmassen zwischen Raeumen: 1 (Tuer) bis 3 (Gang-Stummel)
const GANG_BREITE = 3;     // Breite der Durchbrueche (Autor: nie 1-2)

export function baueV10(rng: RNG): V10Result {
  const grid: number[][] = Array.from({ length: H }, () => new Array<number>(W).fill(2));
  const raeume: V10Raum[] = [];
  const waende: Array<{ a: number; b: number; senkrecht: boolean; von: number; bis: number; pos: number; dicke: number }> = [];

  // 1) BSP mit VARIABLER Wanddicke (wie die dicken Wandmassen der Vorlage)
  const teile = (rect: Rect, tiefe: number): number[] => {
    const w = rect.x1 - rect.x0 + 1, h = rect.y1 - rect.y0 + 1;
    const dicke = WAND_DICKE[0] + Math.floor(rng() * (WAND_DICKE[1] - WAND_DICKE[0] + 1));
    const kannV = w >= 2 * MIN + dicke, kannH = h >= 2 * MIN + dicke;
    if (tiefe <= 0 || (!kannV && !kannH)) {
      const id = raeume.length;
      raeume.push({ id, x: rect.x0, y: rect.y0, w, h });
      for (let y = rect.y0; y <= rect.y1; y++) for (let x = rect.x0; x <= rect.x1; x++) grid[y][x] = 1;
      return [id];
    }
    const senkrecht = kannV && (!kannH || (w >= h ? true : rng() < 0.35));
    if (senkrecht) {
      const sx = rect.x0 + MIN + Math.floor(rng() * (w - 2 * MIN - dicke + 1));
      const links = teile({ x0: rect.x0, y0: rect.y0, x1: sx - 1, y1: rect.y1 }, tiefe - 1);
      const rechts = teile({ x0: sx + dicke, y0: rect.y0, x1: rect.x1, y1: rect.y1 }, tiefe - 1);
      waende.push({ a: links[0], b: rechts[0], senkrecht: true, von: rect.y0, bis: rect.y1, pos: sx, dicke });
      return [...links, ...rechts];
    }
    const sy = rect.y0 + MIN + Math.floor(rng() * (h - 2 * MIN - dicke + 1));
    const oben = teile({ x0: rect.x0, y0: rect.y0, x1: rect.x1, y1: sy - 1 }, tiefe - 1);
    const unten = teile({ x0: rect.x0, y0: sy + dicke, x1: rect.x1, y1: rect.y1 }, tiefe - 1);
    waende.push({ a: oben[0], b: unten[0], senkrecht: false, von: rect.x0, bis: rect.x1, pos: sy, dicke });
    return [...oben, ...unten];
  };
  teile({ x0: 2, y0: 2, x1: W - 3, y1: H - 3 }, 7);

  // 2) Durchbrueche: durch JEDE BSP-Wand ein Durchgang (haelt alles verbunden,
  //    wie die Vorlage: ueberall kommt man durch) - Dicke 1 = TUER (Code 3),
  //    dickere Wandmassen = GANG-Stummel (Code 4, die 'ooo'-Bloecke).
  for (const wd of waende) {
    // Durchbruch nur dort, wo auf BEIDEN Seiten Boden liegt (tiefe Splits
    // legen eigene Waende an - blind gestanzt fuehrte der Gang ins Nichts).
    const passt = (start: number): boolean => {
      for (let s = 0; s < GANG_BREITE; s++) {
        const vorX = wd.senkrecht ? wd.pos - 1 : start + s;
        const vorY = wd.senkrecht ? start + s : wd.pos - 1;
        const nachX = wd.senkrecht ? wd.pos + wd.dicke : start + s;
        const nachY = wd.senkrecht ? start + s : wd.pos + wd.dicke;
        if (grid[vorY]?.[vorX] !== 1 || grid[nachY]?.[nachX] !== 1) return false;
      }
      return true;
    };
    const mitte = wd.von + Math.floor((wd.bis - wd.von) / 2) - (GANG_BREITE >> 1);
    const kandidaten: number[] = [];
    for (let st = wd.von + 1; st <= wd.bis - GANG_BREITE; st++) if (passt(st)) kandidaten.push(st);
    if (!kandidaten.length) continue;   // Reparatur-Pass unten verbindet den Rest
    kandidaten.sort((a, b) => Math.abs(a - mitte) - Math.abs(b - mitte));
    const start = kandidaten[Math.floor(rng() * Math.min(kandidaten.length, 5))];
    const code = wd.dicke === 1 ? 3 : 4;
    for (let s = 0; s < GANG_BREITE; s++) {
      for (let d = 0; d < wd.dicke; d++) {
        const x = wd.senkrecht ? wd.pos + d : start + s;
        const y = wd.senkrecht ? start + s : wd.pos + d;
        if (grid[y]?.[x] === 2) grid[y][x] = code;
      }
    }
  }

  // 3) VERSCHACHTELTE Innenraeume (Vorlage: Raum im Raum mit eigener Wand und
  //    einer Oeffnung) - in grossen Raeumen mit guter Wahrscheinlichkeit.
  for (const r of raeume) {
    if (r.w < 14 || r.h < 12 || rng() > 0.45) continue;
    const iw = 5 + Math.floor(rng() * Math.min(4, r.w - 10));
    const ih = 5 + Math.floor(rng() * Math.min(3, r.h - 9));
    const ix = r.x + 2 + Math.floor(rng() * (r.w - iw - 4));
    const iy = r.y + 2 + Math.floor(rng() * (r.h - ih - 4));
    for (let y = iy; y < iy + ih; y++) for (let x = ix; x < ix + iw; x++) {
      grid[y][x] = (y === iy || y === iy + ih - 1 || x === ix || x === ix + iw - 1) ? 2 : 1;
    }
    // eine 2er-Oeffnung in einer zufaelligen Seite
    const seite = Math.floor(rng() * 4);
    const ox = seite < 2 ? ix + 1 + Math.floor(rng() * (iw - 3)) : (seite === 2 ? ix : ix + iw - 1);
    const oy = seite < 2 ? (seite === 0 ? iy : iy + ih - 1) : iy + 1 + Math.floor(rng() * (ih - 3));
    grid[oy][ox] = 1;
    if (seite < 2 && grid[oy][ox + 1] === 2 && ox + 1 < ix + iw - 1) grid[oy][ox + 1] = 1;
    if (seite >= 2 && grid[oy + 1]?.[ox] === 2 && oy + 1 < iy + ih - 1) grid[oy + 1][ox] = 1;
  }
  verbindeAlles(grid);
  return { w: W, h: H, grid, raeume };
}

// Sicherheitsnetz: solange begehbare Inseln existieren, eine trennende Wand-
// Kachel zur Tuer oeffnen (deterministisch, terminiert - jede Runde verbindet).
function verbindeAlles(grid: number[][]): void {
  const h = grid.length, w = grid[0].length;
  for (let runde = 0; runde < 300; runde++) {
    let sx = -1, sy = -1;
    for (let y = 0; y < h && sx < 0; y++) for (let x = 0; x < w; x++) if (grid[y][x] === 1) { sx = x; sy = y; break; }
    const seen: boolean[][] = Array.from({ length: h }, () => new Array<boolean>(w).fill(false));
    const stack: Array<[number, number]> = [[sx, sy]];
    seen[sy][sx] = true;
    while (stack.length) {
      const [x, y] = stack.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || ny >= h || nx >= w || seen[ny][nx] || grid[ny][nx] === 2) continue;
        seen[ny][nx] = true; stack.push([nx, ny]);
      }
    }
    let offen = false;
    for (let y = 1; y < h - 1 && !offen; y++) {
      for (let x = 1; x < w - 1 && !offen; x++) {
        if (grid[y][x] !== 2) continue;
        const links = grid[y][x - 1] !== 2 && seen[y][x - 1], rechts = grid[y][x + 1] !== 2 && !seen[y][x + 1] && grid[y][x + 1] !== 2;
        const oben = grid[y - 1][x] !== 2 && seen[y - 1][x], unten = grid[y + 1][x] !== 2 && !seen[y + 1][x] && grid[y + 1][x] !== 2;
        const linksU = grid[y][x - 1] !== 2 && !seen[y][x - 1], rechtsE = grid[y][x + 1] !== 2 && seen[y][x + 1];
        const obenU = grid[y - 1][x] !== 2 && !seen[y - 1][x], untenE = grid[y + 1][x] !== 2 && seen[y + 1][x];
        if ((links && rechts) || (linksU && rechtsE) || (oben && unten) || (obenU && untenE)) { grid[y][x] = 3; offen = true; }
      }
    }
    if (!offen) return;   // alles verbunden (oder nichts mehr zu oeffnen)
  }
}
