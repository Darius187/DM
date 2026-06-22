// Wald-Beweis (Runde 60): ez-tree (MIT-Lizenz, Three.js) erzeugt prozedurale
// 3D-Bäume - wir BACKEN sie mit UNSEREM vorhandenen Prop-Backofen (macheBackofen,
// schon Three.js) im Spiel-Schrägblick zu flachen Sprites, genau wie Truhe/Erz.
// Ergebnis: gesäte Baum-Varianten als 2D-Billboards in unserem Top-Down-Wald.
// Kein Laufzeit-3D im Spiel nötig - ein Render pro Baum, danach reiner Sprite.
//
// Lizenz: ez-tree = MIT (Copyright 2024 Daniel Greenheck) -> nutzbar, im
// Gegensatz zum GPL-Regen-Demo. Quelle als Abhängigkeit in DECISIONS.md vermerkt.

import * as THREE from 'three';
import { Tree } from '@dgreenheck/ez-tree';
import { macheBackofen } from './propBackofen';

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d')!;
let W = 0, H = 0;
function passeGroesse(): void { W = view.width = innerWidth; H = view.height = innerHeight; }
passeGroesse(); addEventListener('resize', passeGroesse);

// ---------- dunkler Waldboden (gebackene, kachelbare Textur) ----------
function macheBoden(ts = 128): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = ts;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1c2417'; g.fillRect(0, 0, ts, ts);                 // dunkles Moos/Erde
  for (let i = 0; i < 260; i++) {
    const r = Math.random();
    g.fillStyle = r < 0.4 ? 'rgba(40,52,30,0.5)' : r < 0.7 ? 'rgba(12,16,10,0.6)' : 'rgba(60,72,44,0.35)';
    const s = 2 + Math.random() * 7;
    g.fillRect(Math.random() * ts, Math.random() * ts, s, s * (0.6 + Math.random()));
  }
  for (let i = 0; i < 30; i++) {                                     // ein paar Steine/Wurzeln
    g.fillStyle = 'rgba(70,66,54,0.4)';
    g.beginPath(); g.ellipse(Math.random() * ts, Math.random() * ts, 2 + Math.random() * 5, 1 + Math.random() * 3, Math.random() * 3, 0, 7); g.fill();
  }
  return c;
}
const bodenMuster = ctx.createPattern(macheBoden(), 'repeat');

// ---------- Bäume backen ----------
interface BaumSprite { bild: HTMLCanvasElement; }
const sprites: BaumSprite[] = [];
interface Platzierung { sp: number; x: number; y: number; skala: number; }
const wald: Platzierung[] = [];
let bereit = false;

function texturenBereit(o: THREE.Object3D): boolean {
  let ok = true;
  o.traverse((n) => {
    const mm = (n as THREE.Mesh).material;
    const mats = Array.isArray(mm) ? mm : mm ? [mm] : [];
    for (const mat of mats) for (const key of ['map', 'normalMap', 'aoMap', 'roughnessMap', 'alphaMap'] as const) {
      const t = (mat as unknown as Record<string, THREE.Texture | null>)[key];
      if (t && !(t.image && (t.image as HTMLImageElement).complete && (t.image as HTMLImageElement).naturalWidth > 0)) ok = false;
    }
  });
  return ok;
}
const schlaf = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function init(): Promise<void> {
  const ofen = macheBackofen(512);                                  // höhere Auflösung für Bäume
  // Mischung für einen Ravensmoor-Wald: Eiche/Esche/Espe/Kiefer + Busch
  const rezepte: Array<[string, number]> = [
    ['Oak Large', 1], ['Oak Medium', 23], ['Ash Large', 7], ['Ash Medium', 51],
    ['Aspen Large', 3], ['Aspen Medium', 90], ['Pine Large', 5], ['Pine Medium', 42], ['Bush 2', 12],
  ];
  const baeume = rezepte.map(([preset, seed]) => {
    const t = new Tree();
    t.loadPreset(preset);
    (t.options as unknown as { seed: number }).seed = seed;
    t.generate();
    return t;
  });
  // auf die asynchron geladenen Rinden-/Blatt-Texturen warten, sonst backen wir nackte Flächen
  for (let i = 0; i < 160 && !baeume.every(texturenBereit); i++) await schlaf(50);
  for (const t of baeume) {
    const obj = t as unknown as THREE.Object3D;
    const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    obj.scale.setScalar(2.4 / maxDim);                              // auf Einheitsgröße runter (Backofen-Kamera far=60)
    sprites.push({ bild: ofen.backe(t as unknown as THREE.Group) });
  }

  // Wald streuen (hinten klein, vorne groß; nach y sortiert = korrekte Überdeckung)
  const dichte = Math.round((W * H) / 32000);
  for (let i = 0; i < dichte; i++) {
    const y = Math.random();
    wald.push({ sp: Math.floor(Math.random() * sprites.length), x: Math.random() * W, y: y * H, skala: 0.4 + y * 0.7 });
  }
  wald.sort((a, b) => a.y - b.y);
  bereit = true;
  (window as unknown as { __waldBereit?: boolean }).__waldBereit = true;
}
void init();

// ---------- Render-Schleife ----------
function frame(now: number): void {
  // 1) Boden
  ctx.fillStyle = bodenMuster ?? '#1c2417'; ctx.fillRect(0, 0, W, H);
  // sanfter Tiefen-Verlauf (hinten dunkler -> Waldtiefe)
  const tg = ctx.createLinearGradient(0, 0, 0, H);
  tg.addColorStop(0, 'rgba(4,8,6,0.6)'); tg.addColorStop(0.5, 'rgba(8,12,8,0.15)'); tg.addColorStop(1, 'rgba(4,6,5,0.35)');
  ctx.fillStyle = tg; ctx.fillRect(0, 0, W, H);

  // 2) Bäume (depth-sortiert), Ankerpunkt am Stammfuß (~64% der Sprite-Höhe)
  if (bereit) {
    for (const p of wald) {
      const b = sprites[p.sp].bild;
      const w = b.width * p.skala, h = b.height * p.skala;
      const wiegen = Math.sin(now / 1400 + p.x * 0.01) * 0.012;     // leichtes Wiegen im Wind
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(wiegen);
      ctx.drawImage(b, -w / 2, -h * 0.64, w, h);
      ctx.restore();
    }
  } else {
    ctx.fillStyle = '#6a7a55'; ctx.font = '16px Georgia';
    ctx.fillText('Bäume werden gebacken …', 24, H - 28);
  }

  // 3) kühles Mondlicht + Vignette
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const mg = ctx.createRadialGradient(W * 0.5, H * 0.18, 10, W * 0.5, H * 0.18, Math.max(W, H) * 0.7);
  mg.addColorStop(0, 'rgba(90,110,140,0.10)'); mg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H); ctx.restore();
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(2,4,3,0.72)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
