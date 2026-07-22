// GLB-Prop-Backofen (Autor: "warum uebernimmst du nicht die GLB-Datei 1:1?"):
// laedt ein fertiges Blender/GLB-Modell (die hochwertigen Lager-Props) und backt
// es mit DERSELBEN Kamera/Beleuchtung wie die handgebauten Props zu einer
// Sprite-Leinwand. So kommt das echte Modell 1:1 ins 2D-Spiel - kein Nachbau.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { macheBackofen, beschneideCanvas } from './propBackofen';

export interface GlbBackOpt {
  groesse?: number;   // Render-Aufloesung des Backofens (default 640)
  drehen?: number;    // Yaw um die Hochachse (Radiant) fuer die 3/4-Ansicht
  zUp?: boolean;      // Blender-Export ist Z-hoch -> auf Y-hoch drehen (default true)
  zielH?: number;     // Ziel-Sprite-Hoehe in px (default 320)
}

// Skaliert eine Leinwand proportional auf die Ziel-Hoehe (wie in lagerBitmaps).
function skaliereAufHoehe(cv: HTMLCanvasElement, zielH: number): HTMLCanvasElement {
  const f = zielH / cv.height;
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(cv.width * f));
  out.height = Math.max(1, Math.round(zielH));
  const g = out.getContext('2d')!;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(cv, 0, 0, out.width, out.height);
  return out;
}

// Laedt die GLB, richtet sie fuer die Backofen-Kamera aus und backt sie.
export async function backeGlbProp(url: string, opt: GlbBackOpt = {}): Promise<HTMLCanvasElement> {
  const gltf = await new GLTFLoader().loadAsync(url);
  // Aussenhuelle: Yaw fuer die Blickrichtung. Darin die Z-hoch -> Y-hoch-Drehung,
  // damit die Backofen-Kamera (Y = oben) das Modell aufrecht sieht.
  const auf = new THREE.Group();
  if (opt.zUp !== false) auf.rotation.x = -Math.PI / 2;
  auf.add(gltf.scene);
  const gruppe = new THREE.Group();
  gruppe.rotation.y = opt.drehen ?? 0;
  gruppe.add(auf);
  const ofen = macheBackofen(opt.groesse ?? 640, false);
  const roh = beschneideCanvas(ofen.backe(gruppe));
  return skaliereAufHoehe(roh, opt.zielH ?? 320);
}
