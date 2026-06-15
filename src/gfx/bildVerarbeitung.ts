// Browser-Verarbeitung hochgeladener Bilder (Baukasten, Runde 24):
// dieselben Schritte wie die Import-Pipeline für gelieferte Dateien -
// eingebackenen Karo-/Weiß-Hintergrund freistellen und auf Spielgröße
// herunterrechnen. Läuft komplett im Browser, der Autor testet allein.

// ChatGPT-Bilder backen ein helles Schachbrett ein: helle, fast graue
// Pixel (Minimum >= 210, Spannweite <= 16) gelten als Hintergrund -
// reines Weiß fällt mit darunter.
export function stelleFrei(quelle: HTMLCanvasElement): void {
  const ctx = quelle.getContext('2d')!;
  const d = ctx.getImageData(0, 0, quelle.width, quelle.height);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], g = p[i + 1], b = p[i + 2];
    const min = Math.min(r, g, b), max = Math.max(r, g, b);
    if (min >= 210 && max - min <= 16) p[i + 3] = 0;
  }
  ctx.putImageData(d, 0, 0);
}

export function alsCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext('2d')!.drawImage(img, 0, 0);
  return c;
}

// Herunterrechnen in Halbierungsschritten (deutlich sauberer als ein
// einziger Sprung von 300 auf 32 Pixel)
// Größte Kante auf max begrenzen (für localStorage-schonende Uploads, R40)
export function verkleinereCanvas(quelle: HTMLCanvasElement, max: number): HTMLCanvasElement {
  const s = max / Math.max(quelle.width, quelle.height);
  if (s >= 1) return quelle;
  return rechneHerunter(quelle, Math.max(1, Math.round(quelle.width * s)), Math.max(1, Math.round(quelle.height * s)));
}

export function rechneHerunter(quelle: HTMLCanvasElement, zw: number, zh: number): HTMLCanvasElement {
  let akt = quelle;
  while (akt.width / 2 >= zw && akt.height / 2 >= zh) {
    const halb = document.createElement('canvas');
    halb.width = Math.max(zw, Math.floor(akt.width / 2));
    halb.height = Math.max(zh, Math.floor(akt.height / 2));
    const ctx = halb.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(akt, 0, 0, halb.width, halb.height);
    akt = halb;
  }
  const ziel = document.createElement('canvas');
  ziel.width = zw;
  ziel.height = zh;
  const zctx = ziel.getContext('2d')!;
  zctx.imageSmoothingEnabled = true;
  zctx.imageSmoothingQuality = 'high';
  zctx.drawImage(akt, 0, 0, zw, zh);
  return ziel;
}

// Harte Alpha-Kante für den Pixel-Look (halbtransparente Säume weg)
export function harteKante(c: HTMLCanvasElement, schwelle = 96): void {
  const ctx = c.getContext('2d')!;
  const d = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 3; i < d.data.length; i += 4) {
    d.data[i] = d.data[i] < schwelle ? 0 : 255;
  }
  ctx.putImageData(d, 0, 0);
}

// Komplettpaket für einen Upload aus dem Baukasten
export function verarbeiteUpload(
  img: HTMLImageElement,
  opts: { zielW?: number; zielH?: number; freistellen: boolean },
): HTMLCanvasElement {
  let c = alsCanvas(img);
  if (opts.freistellen) stelleFrei(c);
  if (opts.zielW && opts.zielH && (c.width !== opts.zielW || c.height !== opts.zielH)) {
    c = rechneHerunter(c, opts.zielW, opts.zielH);
    if (opts.freistellen) harteKante(c);
  }
  return c;
}
