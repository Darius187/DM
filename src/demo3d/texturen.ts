// Prozedurale Texturen im Krypta-Stil (Runde 58) für die 3D-Objekte. Graustufig
// gehalten - die Materialfarbe (material.color) tönt sie ein, so reicht je eine
// Holz-/Stein-/Eisen-/Tuch-Textur für alle Farbvarianten. Passt zur düsteren
// Umgebung; alternativ ließen sich später echte Phaser-Kacheltexturen einhängen.

import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();

function tex(key: string, repeat: number, draw: (x: CanvasRenderingContext2D, S: number) => void): THREE.Texture {
  const c = cache.get(key); if (c) return c;
  const S = 128; const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const x = cv.getContext('2d')!; draw(x, S);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 4;
  cache.set(key, t); return t;
}

// Holz: Mittelgrau mit dunkler, leicht geschwungener Längsmaserung + Astlöcher.
export function holzTextur(): THREE.Texture {
  return tex('holz', 1, (x, S) => {
    x.fillStyle = '#bcbcbc'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 70; i++) {
      const gx = Math.random() * S, w = 0.5 + Math.random() * 1.6, a = 0.06 + Math.random() * 0.16;
      x.strokeStyle = `rgba(40,30,18,${a})`; x.lineWidth = w;
      x.beginPath(); x.moveTo(gx, -2);
      x.bezierCurveTo(gx + (Math.random() * 7 - 3.5), S * 0.34, gx + (Math.random() * 7 - 3.5), S * 0.68, gx + (Math.random() * 5 - 2.5), S + 2);
      x.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const kx = Math.random() * S, ky = Math.random() * S, r = 2 + Math.random() * 4;
      const g = x.createRadialGradient(kx, ky, 0, kx, ky, r);
      g.addColorStop(0, 'rgba(35,24,14,0.7)'); g.addColorStop(1, 'rgba(120,110,90,0)');
      x.fillStyle = g; x.beginPath(); x.arc(kx, ky, r, 0, 7); x.fill();
    }
  });
}

// Stein: körnige Fläche mit Mörtelfugen (Quaderverband) und feinen Rissen.
export function steinTextur(): THREE.Texture {
  return tex('stein', 1.6, (x, S) => {
    x.fillStyle = '#b6b2a8'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 2200; i++) { const g = 150 + Math.random() * 70; x.fillStyle = `rgba(${g},${g - 6},${g - 14},0.18)`; x.fillRect(Math.random() * S, Math.random() * S, 1.5, 1.5); }
    x.strokeStyle = 'rgba(40,36,30,0.7)'; x.lineWidth = 2.4;
    for (let r = 0; r < 4; r++) { const y = r * (S / 4), off = (r % 2) * (S / 4); x.beginPath(); x.moveTo(0, y); x.lineTo(S, y); x.stroke(); for (let cx = 0; cx < S; cx += S / 2) { x.beginPath(); x.moveTo(cx + off, y); x.lineTo(cx + off, y + S / 4); x.stroke(); } }
    x.strokeStyle = 'rgba(30,26,22,0.35)'; x.lineWidth = 0.8;
    for (let i = 0; i < 10; i++) { x.beginPath(); let px = Math.random() * S, py = Math.random() * S; x.moveTo(px, py); for (let s = 0; s < 4; s++) { px += Math.random() * 16 - 8; py += Math.random() * 16 - 8; x.lineTo(px, py); } x.stroke(); }
  });
}

// Eisen: dunkler, leicht fleckiger Metallgrund mit Kratzern und Glanzpunkten.
export function eisenTextur(): THREE.Texture {
  return tex('eisen', 2, (x, S) => {
    x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 800; i++) { const g = 110 + Math.random() * 90; x.fillStyle = `rgba(${g},${g},${g},0.12)`; x.fillRect(Math.random() * S, Math.random() * S, 2, 2); }
    for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(60,60,66,${0.1 + Math.random() * 0.2})`; x.lineWidth = 0.6 + Math.random(); const ax = Math.random() * S, ay = Math.random() * S, a = Math.random() * 6.28, l = 6 + Math.random() * 20; x.beginPath(); x.moveTo(ax, ay); x.lineTo(ax + Math.cos(a) * l, ay + Math.sin(a) * l); x.stroke(); }
    for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(230,230,235,${0.1 + Math.random() * 0.15})`; x.fillRect(Math.random() * S, Math.random() * S, 1.5, 1.5); }
  });
}

// Tuch (Tabard/Umhang): feines Gewebe (Kreuzschraffur) auf neutralem Grund.
export function tuchTextur(): THREE.Texture {
  return tex('tuch', 3, (x, S) => {
    x.fillStyle = '#c0c0c0'; x.fillRect(0, 0, S, S);
    x.strokeStyle = 'rgba(70,64,56,0.18)'; x.lineWidth = 1;
    for (let i = 0; i < S; i += 4) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.stroke(); }
    x.strokeStyle = 'rgba(150,144,136,0.18)';
    for (let i = 0; i < S; i += 4) { x.beginPath(); x.moveTo(0, i); x.lineTo(S, i); x.stroke(); }
    for (let i = 0; i < 600; i++) { const g = 150 + Math.random() * 60; x.fillStyle = `rgba(${g},${g - 4},${g - 8},0.12)`; x.fillRect(Math.random() * S, Math.random() * S, 1.5, 1.5); }
  });
}
