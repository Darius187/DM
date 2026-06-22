// Wald mit STIMMUNG (Runde 60). Autorwunsch: satte Bäume, aber düster/gedämpft
// (nicht hell-knallig) - UND als Spielelement kahle, tote Bäume rund um Krypta/
// Mine ("Blight"), die sich später erholen können. Beides ist EINSTELLBAR über
// die Stimmungs-Konstanten unten (eine Stelle -> ganzes Gefühl drehbar).
//
// ez-tree (MIT) erzeugt die 3D-Bäume, unser Prop-Backofen bäckt sie zu Sprites.
// Stellschrauben: leaves.count (Dichte/Kahlheit), leaves.tint + bark.tint
// (Grundfarbe), danach saturate()/brightness() auf dem Sprite (global "nicht so
// knallig"). Die Presets nutzen ein hell-gelbgrünes Blatt-Tint - genau das nehmen
// wir zurück.

import * as THREE from 'three';
import { Tree } from '@dgreenheck/ez-tree';
import { macheBackofen } from './propBackofen';

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d')!;
let W = 0, H = 0;
function passeGroesse(): void { W = view.width = innerWidth; H = view.height = innerHeight; }
passeGroesse(); addEventListener('resize', passeGroesse);

// ---------- STIMMUNGEN (hier drehen) ----------
interface Stimmung {
  blattDichte: number;   // Multiplikator auf leaves.count (1 = voll/satt, ~0.12 = fast kahl)
  blattTint: number;     // leaves.tint  (überschreibt das knallige Preset-Gelbgrün)
  rindeTint: number;     // bark.tint
  blattGroesse: number;  // Multiplikator auf leaves.size
  sat: number;           // 2D-Nachbearbeitung: Sättigung in %  (niedriger = entsättigt)
  hell: number;          // 2D-Nachbearbeitung: Helligkeit in %  (niedriger = dunkler)
}
// satter, aber DÜSTERER Wald (tiefes, gedämpftes Grün - nicht knallig)
const WALD: Stimmung = { blattDichte: 1.0, blattTint: 0x5d7a48, rindeTint: 0x5c5446, blattGroesse: 1.0, sat: 74, hell: 74 };
// kahl & tot rund um Krypta/Mine (grau-braun, fast laublos) - "erholt sich später"
const BLIGHT: Stimmung = { blattDichte: 0.07, blattTint: 0x6f6952, rindeTint: 0x453f37, blattGroesse: 0.85, sat: 28, hell: 52 };

// ---------- Boden ----------
function macheBoden(ts = 128): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = ts;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1b2316'; g.fillRect(0, 0, ts, ts);
  for (let i = 0; i < 280; i++) {
    const r = Math.random();
    g.fillStyle = r < 0.4 ? 'rgba(38,50,28,0.5)' : r < 0.7 ? 'rgba(11,15,9,0.6)' : 'rgba(54,66,40,0.32)';
    const s = 2 + Math.random() * 7; g.fillRect(Math.random() * ts, Math.random() * ts, s, s * (0.6 + Math.random()));
  }
  return c;
}
const bodenMuster = ctx.createPattern(macheBoden(), 'repeat');

// ---------- Stimmung auf den gebackenen Sprite legen (entsättigen/abdunkeln) ----------
function nachbearbeite(src: HTMLCanvasElement, st: Stimmung): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d')!;
  g.filter = `saturate(${st.sat}%) brightness(${st.hell}%)`;
  g.drawImage(src, 0, 0);
  return c;
}

// ---------- Bäume in beiden Stimmungen backen ----------
interface ArtSprites { wald: HTMLCanvasElement; blight: HTMLCanvasElement; }
const arten: ArtSprites[] = [];
interface Platzierung { art: number; x: number; y: number; skala: number; blight: boolean; }
const wald: Platzierung[] = [];
let bereit = false;
let krypta = { x: 0, y: 0, r: 0 };

function texturenBereit(o: THREE.Object3D): boolean {
  let ok = true;
  o.traverse((n) => {
    const mm = (n as THREE.Mesh).material; const mats = Array.isArray(mm) ? mm : mm ? [mm] : [];
    for (const mat of mats) for (const key of ['map', 'normalMap', 'aoMap', 'roughnessMap', 'alphaMap'] as const) {
      const t = (mat as unknown as Record<string, THREE.Texture | null>)[key];
      if (t && !(t.image && (t.image as HTMLImageElement).complete && (t.image as HTMLImageElement).naturalWidth > 0)) ok = false;
    }
  });
  return ok;
}
const schlaf = (ms: number) => new Promise((r) => setTimeout(r, ms));

function baueBaum(preset: string, seed: number, st: Stimmung): Tree {
  const t = new Tree();
  t.loadPreset(preset);
  const o = t.options as unknown as { seed: number; leaves: { count: number; tint: number; size: number }; bark: { tint: number } };
  o.seed = seed;
  o.leaves.count = Math.max(1, Math.round(o.leaves.count * st.blattDichte));
  o.leaves.tint = st.blattTint; o.leaves.size *= st.blattGroesse;
  o.bark.tint = st.rindeTint;
  t.generate();
  return t;
}
function backeSkaliert(ofen: ReturnType<typeof macheBackofen>, t: Tree, st: Stimmung): HTMLCanvasElement {
  const obj = t as unknown as THREE.Object3D;
  const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  obj.scale.setScalar(2.4 / (Math.max(size.x, size.y, size.z) || 1));   // Backofen-Kamera far=60
  return nachbearbeite(ofen.backe(t as unknown as THREE.Group), st);
}

async function init(): Promise<void> {
  const ofen = macheBackofen(512);
  const rezepte: Array<[string, number]> = [
    ['Oak Large', 1], ['Oak Medium', 23], ['Ash Large', 7], ['Aspen Large', 3], ['Pine Large', 5], ['Aspen Medium', 90],
  ];
  for (const [preset, seed] of rezepte) {
    const tw = baueBaum(preset, seed, WALD);
    for (let i = 0; i < 160 && !texturenBereit(tw as unknown as THREE.Object3D); i++) await schlaf(40);
    const wbild = backeSkaliert(ofen, tw, WALD);
    const bbild = backeSkaliert(ofen, baueBaum(preset, seed, BLIGHT), BLIGHT);
    arten.push({ wald: wbild, blight: bbild });
  }

  // Krypta-Punkt + Blight-Radius
  krypta = { x: W * 0.62, y: H * 0.46, r: Math.min(W, H) * 0.32 };
  const dichte = Math.round((W * H) / 30000);
  for (let i = 0; i < dichte; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    const d = Math.hypot(x - krypta.x, y - krypta.y);
    // weicher Rand: nahe der Krypta sicher kahl, am Rand zufällig durchmischt
    const blight = d < krypta.r * (0.55 + Math.random() * 0.6);
    wald.push({ art: Math.floor(Math.random() * arten.length), x, y, skala: 0.4 + (y / H) * 0.7, blight });
  }
  wald.sort((a, b) => a.y - b.y);
  bereit = true;
  (window as unknown as { __waldBereit?: boolean }).__waldBereit = true;
}
void init();

// ---------- Render ----------
function frame(now: number): void {
  ctx.fillStyle = bodenMuster ?? '#1b2316'; ctx.fillRect(0, 0, W, H);
  const tg = ctx.createLinearGradient(0, 0, 0, H);
  tg.addColorStop(0, 'rgba(4,8,6,0.6)'); tg.addColorStop(0.5, 'rgba(8,12,8,0.15)'); tg.addColorStop(1, 'rgba(4,6,5,0.35)');
  ctx.fillStyle = tg; ctx.fillRect(0, 0, W, H);

  // verdorrter Boden + Krypta-Mal in der Blight-Zone
  if (bereit) {
    const bg = ctx.createRadialGradient(krypta.x, krypta.y, krypta.r * 0.1, krypta.x, krypta.y, krypta.r);
    bg.addColorStop(0, 'rgba(26,22,17,0.78)'); bg.addColorStop(0.7, 'rgba(20,19,15,0.5)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = 'hsl(0,0%,50%)';
    ctx.beginPath(); ctx.arc(krypta.x, krypta.y, krypta.r * 0.8, 0, 7); ctx.fill(); ctx.restore();
    // Krypta-Stein (Andeutung)
    ctx.fillStyle = '#15171c'; ctx.fillRect(krypta.x - 26, krypta.y - 14, 52, 30);
    ctx.fillStyle = '#23262d'; ctx.fillRect(krypta.x - 22, krypta.y - 18, 44, 8);
  }

  if (bereit) {
    for (const p of wald) {
      const b = p.blight ? arten[p.art].blight : arten[p.art].wald;
      const w = b.width * p.skala, h = b.height * p.skala;
      const wiegen = Math.sin(now / 1400 + p.x * 0.01) * (p.blight ? 0.005 : 0.012);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(wiegen);
      ctx.drawImage(b, -w / 2, -h * 0.64, w, h); ctx.restore();
    }
  } else {
    ctx.fillStyle = '#6a7a55'; ctx.font = '16px Georgia'; ctx.fillText('Bäume werden gebacken (2 Stimmungen) …', 24, H - 28);
  }

  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const mg = ctx.createRadialGradient(W * 0.5, H * 0.16, 10, W * 0.5, H * 0.16, Math.max(W, H) * 0.7);
  mg.addColorStop(0, 'rgba(86,104,134,0.09)'); mg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H); ctx.restore();
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(2,4,3,0.74)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
