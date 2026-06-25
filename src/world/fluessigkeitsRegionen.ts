// Reine Logik (kein Phaser): zusammenhängende Flächen einer Kachel-ID in einer
// Karte finden. Liefert je Komponente eine Bounding-Box. Wird vom Liquid-Shader-
// Overlay genutzt - eine Brücke quer durch einen Bach muss ihn z. B. in zwei
// Regionen teilen, damit das opake Shader-Quad die Brücke nicht zudeckt.
// In eigenem Modul, damit es ohne Phaser (window) unit-getestet werden kann.

export interface KachelRegion { x0: number; y0: number; x1: number; y1: number; zellen: number; }

export function findeFluessigkeitsRegionen(map: number[][], id: number, minZellen = 1): KachelRegion[] {
  const h = map.length, w = map[0]?.length ?? 0;
  const gesehen: boolean[][] = Array.from({ length: h }, () => new Array(w).fill(false));
  const regionen: KachelRegion[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (map[y][x] !== id || gesehen[y][x]) continue;
      // Flood-Fill (Tiefensuche) der Komponente, Bounding-Box mitführen
      let x0 = x, y0 = y, x1 = x, y1 = y, zellen = 0;
      const stack: Array<[number, number]> = [[x, y]];
      gesehen[y][x] = true;
      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        zellen++;
        if (cx < x0) x0 = cx; if (cx > x1) x1 = cx;
        if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (map[ny][nx] === id && !gesehen[ny][nx]) { gesehen[ny][nx] = true; stack.push([nx, ny]); }
        }
      }
      if (zellen >= minZellen) regionen.push({ x0, y0, x1, y1, zellen });
    }
  }
  return regionen;
}
