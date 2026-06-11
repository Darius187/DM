// Hilfswerkzeug (nur Entwicklung): schneidet einen Bereich aus einem PNG aus,
// skaliert ihn hoch und legt ihn auf einen Magenta-Hintergrund mit Gitter,
// damit man Tile-Koordinaten pruefen kann.
// Aufruf: node tools/crop.cjs <in.png> <x> <y> <w> <h> <scale> <out.png> [grid]
const fs = require('fs');
const { PNG } = require('pngjs');

const [inFile, xs, ys, ws, hs, ss, outFile, grid] = process.argv.slice(2);
const [x0, y0, w, h, scale] = [xs, ys, ws, hs, ss].map(Number);
const gridStep = grid ? Number(grid) : 0;

const src = PNG.sync.read(fs.readFileSync(inFile));
const out = new PNG({ width: w * scale, height: h * scale });

for (let oy = 0; oy < out.height; oy++) {
  for (let ox = 0; ox < out.width; ox++) {
    const sx = x0 + Math.floor(ox / scale);
    const sy = y0 + Math.floor(oy / scale);
    const oi = (out.width * oy + ox) << 2;
    let r = 255, g = 0, b = 255, a = 255; // Magenta = transparent/ausserhalb
    if (sx >= 0 && sy >= 0 && sx < src.width && sy < src.height) {
      const si = (src.width * sy + sx) << 2;
      const sa = src.data[si + 3] / 255;
      r = Math.round(src.data[si] * sa + 255 * (1 - sa));
      g = Math.round(src.data[si + 1] * sa + 0 * (1 - sa));
      b = Math.round(src.data[si + 2] * sa + 255 * (1 - sa));
    }
    if (gridStep && ((sx - x0) % gridStep === 0 && ox % scale === 0 || (sy - y0) % gridStep === 0 && oy % scale === 0)) {
      r = 0; g = 255; b = 255;
    }
    out.data[oi] = r; out.data[oi + 1] = g; out.data[oi + 2] = b; out.data[oi + 3] = a;
  }
}
fs.writeFileSync(outFile, PNG.sync.write(out));
console.log('geschrieben:', outFile, out.width + 'x' + out.height);
