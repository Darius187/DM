// BODEN-STILE (R124, Autorwunsch "Variationen in den Bodentexturen, 10 Beispiele
// zur Auswahl + testen"). 10 prozedurale 32x32-Boden-Texturen im Dungeon-Stil.
// Selbstständig (nicht theme-abhaengig), damit sie klar unterscheidbar sind.
// Auswahl in der DUNGEON-PROBE; das begangene Level nutzt den gewaehlten Stil.

const TILE = 32;
type Ctx = CanvasRenderingContext2D;

export interface BodenStil { id: string; name: string; zeichne: (ctx: Ctx, n: number) => void }

// kleiner deterministischer Zufall je Variante (stabil, kein Math.random im Bake)
function prng(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}
const fuege = (ctx: Ctx, c: string, x: number, y: number, w: number, h: number): void => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

// --- die 10 Stile ----------------------------------------------------------
export const BODEN_STILE: BodenStil[] = [
  { id: 'pflaster', name: 'Grabplatten', zeichne(ctx, n) {
    const g = 40 + n * 2; fuege(ctx, `rgb(${g},${g - 3},${g - 8})`, 0, 0, TILE, TILE);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
    fuege(ctx, 'rgba(0,0,0,0.16)', 0, 15, TILE, 1); fuege(ctx, 'rgba(0,0,0,0.16)', 15, 0, 1, TILE);
    const r = prng(n); for (let i = 0; i < 5; i++) fuege(ctx, 'rgba(255,255,255,0.04)', r() * 28 + 2, r() * 28 + 2, 3, 2);
  } },
  { id: 'schiefer', name: 'Schwarzer Schiefer', zeichne(ctx, n) {
    const g = 24 + n; fuege(ctx, `rgb(${g},${g + 1},${g + 3})`, 0, 0, TILE, TILE);
    const r = prng(n + 9); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); let x = r() * TILE; ctx.moveTo(x, 0); for (let y = 4; y <= TILE; y += 6) { x += (r() - 0.5) * 8; ctx.lineTo(x, y); } ctx.stroke(); }
    fuege(ctx, 'rgba(90,100,120,0.10)', 2, 2, TILE - 4, 3);
  } },
  { id: 'kopfstein', name: 'Kopfsteinpflaster', zeichne(ctx, n) {
    const g = 46 + n * 2; fuege(ctx, `rgb(${g - 10},${g - 12},${g - 16})`, 0, 0, TILE, TILE);
    const r = prng(n + 3);
    for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++) {
      const cx = gx * 8 + 4 + (gy % 2) * 2, cy = gy * 8 + 4, rad = 3 + r() * 1.5, hell = g + (r() * 20 - 6);
      ctx.fillStyle = `rgb(${hell},${hell - 3},${hell - 8})`; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.stroke();
    }
  } },
  { id: 'ziegel', name: 'Ziegelboden', zeichne(ctx, n) {
    fuege(ctx, '#3a241a', 0, 0, TILE, TILE);
    const r = prng(n + 7);
    for (let row = 0; row < 4; row++) { const off = (row % 2) * 8; for (let bx = -8; bx < TILE; bx += 16) {
      const c = 120 + r() * 30; fuege(ctx, `rgb(${c},${c - 40},${c - 60})`, bx + off + 1, row * 8 + 1, 14, 6);
    } }
  } },
  { id: 'marmor', name: 'Marmorfliesen', zeichne(ctx, n) {
    const g = 150 + n * 3; fuege(ctx, `rgb(${g},${g},${g - 6})`, 0, 0, TILE, TILE);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
    fuege(ctx, 'rgba(0,0,0,0.10)', 0, 15, TILE, 1); fuege(ctx, 'rgba(0,0,0,0.10)', 15, 0, 1, TILE);
    const r = prng(n + 4); ctx.strokeStyle = 'rgba(90,90,110,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); let x = r() * TILE; ctx.moveTo(x, 0); for (let y = 3; y <= TILE; y += 5) { x += (r() - 0.5) * 10; ctx.lineTo(x, y); } ctx.stroke();
  } },
  { id: 'moos', name: 'Moosstein', zeichne(ctx, n) {
    const g = 42 + n * 2; fuege(ctx, `rgb(${g - 6},${g - 3},${g - 10})`, 0, 0, TILE, TILE);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
    const r = prng(n + 11);
    for (let i = 0; i < 7; i++) { const gr = 40 + r() * 40; ctx.fillStyle = `rgba(${gr},${gr + 40},${gr - 10},0.5)`; ctx.beginPath(); ctx.arc(r() * TILE, r() * TILE, 2 + r() * 3, 0, 6.283); ctx.fill(); }
  } },
  { id: 'sand', name: 'Sandboden', zeichne(ctx, n) {
    const g = 120 + n * 3; fuege(ctx, `rgb(${g},${g - 20},${g - 55})`, 0, 0, TILE, TILE);
    const r = prng(n + 5);
    for (let i = 0; i < 40; i++) { const d = r() < 0.5 ? 0.08 : -0.08; fuege(ctx, `rgba(0,0,0,${Math.abs(d)})`, r() * TILE, r() * TILE, 1, 1); }
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'; for (let y = 6; y < TILE; y += 9) { ctx.beginPath(); ctx.moveTo(0, y + Math.sin(n) * 2); ctx.lineTo(TILE, y - Math.sin(n) * 2); ctx.stroke(); }
  } },
  { id: 'erde', name: 'Erdboden', zeichne(ctx, n) {
    const g = 54 + n * 2; fuege(ctx, `rgb(${g},${g - 14},${g - 26})`, 0, 0, TILE, TILE);
    const r = prng(n + 13);
    for (let i = 0; i < 10; i++) { const c = 60 + r() * 40; ctx.fillStyle = `rgb(${c},${c - 8},${c - 16})`; ctx.beginPath(); ctx.arc(r() * TILE, r() * TILE, 1 + r() * 2.4, 0, 6.283); ctx.fill(); }
    for (let i = 0; i < 20; i++) fuege(ctx, 'rgba(0,0,0,0.12)', r() * TILE, r() * TILE, 1, 1);
  } },
  { id: 'blut', name: 'Blutstein', zeichne(ctx, n) {
    const g = 38 + n * 2; fuege(ctx, `rgb(${g},${g - 6},${g - 10})`, 0, 0, TILE, TILE);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
    fuege(ctx, 'rgba(0,0,0,0.16)', 0, 15, TILE, 1);
    const r = prng(n + 17);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = `rgba(${100 + r() * 40},10,8,0.5)`; ctx.beginPath(); ctx.arc(r() * TILE, r() * TILE, 2 + r() * 4, 0, 6.283); ctx.fill(); }
  } },
  { id: 'gebein', name: 'Gebeinboden', zeichne(ctx, n) {
    const g = 44 + n * 2; fuege(ctx, `rgb(${g - 4},${g - 3},${g - 8})`, 0, 0, TILE, TILE);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
    const r = prng(n + 19); ctx.strokeStyle = 'rgba(220,214,196,0.7)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) { const x = r() * 24 + 4, y = r() * 24 + 4, a = r() * 6.283, len = 5 + r() * 5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
      ctx.fillStyle = 'rgba(220,214,196,0.7)'; ctx.beginPath(); ctx.arc(x, y, 1.4, 0, 6.283); ctx.fill(); }
    ctx.lineWidth = 1;
  } },
];

export const BODEN_STIL_IDS = BODEN_STILE.map((s) => s.id);

// Lazy-Bake: eine Textur je (Stil, Variante 0..6) in den Szenen-Cache.
export function bodenStilTextur(scene: { textures: { exists: (k: string) => boolean; addCanvas: (k: string, c: HTMLCanvasElement) => void } }, stilId: string, variant: number): string {
  const key = `boden_${stilId}_${variant}`;
  if (scene.textures.exists(key)) return key;
  const stil = BODEN_STILE.find((s) => s.id === stilId) ?? BODEN_STILE[0];
  const cv = document.createElement('canvas'); cv.width = TILE; cv.height = TILE;
  const ctx = cv.getContext('2d')!;
  stil.zeichne(ctx, variant);
  scene.textures.addCanvas(key, cv);
  return key;
}
