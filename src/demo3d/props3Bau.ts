// Außen-Props im Krypta-/Dorf-Stil (Runde 59, Autorwunsch "palisade zaun erz
// wie sieht das aus"): Palisade (spitze Wehrpfähle), Zaun (leichtes Tiergatter)
// und Erz in mehreren Varianten (Größe + Erzart). Jeweils 1 Kachel breit, an
// der Mitte zentriert und nach +z ausgerichtet, damit sie sich im prozeduralen
// Level nahtlos aneinanderreihen lassen. Alle: { gruppe, animate(o01, t) }.

import * as THREE from 'three';
import { matHolz, matEisen, matStein } from './texturen';

function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; return me;
}
function zyl(rt: number, rb: number, h: number, m: THREE.Material, seg = 8): THREE.Mesh {
  const me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); me.castShadow = true; me.receiveShadow = true; return me;
}
const NOOP = (): void => { /* statisch */ };

// ================== PALISADE (Wehrpfähle) ==================
// Dicht stehende, oben angespitzte Stämme, hinten mit zwei Querbalken und
// Eisenbändern verschnürt. Wuchtig - die Wehrmauer um Dorf/Lager.
export function bauePalisade(): { gruppe: THREE.Group; animate: (o: number, t: number) => void } {
  const g = new THREE.Group();
  const stamm = [matHolz(0x5a3f20), matHolz(0x4d3318), matHolz(0x66492a)];
  const eisenM = matEisen(0x2e2a22, 0.55);
  // vier dicke Stämme über die Kachelbreite, leicht unterschiedlich hoch
  const xs = [-0.36, -0.12, 0.12, 0.36];
  for (let i = 0; i < xs.length; i++) {
    const h = 2.1 + (i % 2 ? 0.18 : 0) + Math.random() * 0.12;
    const r = 0.13;
    const log = zyl(r, r + 0.01, h, stamm[i % stamm.length], 9);
    log.position.set(xs[i], h / 2, 0);
    log.rotation.y = Math.random() * 0.4;
    g.add(log);
    // angespitzte Krone (Kegel)
    const spitze = new THREE.Mesh(new THREE.ConeGeometry(r + 0.01, 0.34, 9), stamm[i % stamm.length]);
    spitze.position.set(xs[i], h + 0.16, 0); spitze.castShadow = true; g.add(spitze);
  }
  // zwei Querbalken hinten + Eisenbänder
  for (const by of [0.7, 1.65]) {
    g.add(box(1.0, 0.12, 0.08, matHolz(0x4a3318), 0, by, -0.13));
    for (const bx of [-0.3, 0.3]) g.add(box(0.06, 0.2, 0.2, eisenM, bx, by, -0.05));
  }
  // Erdaufwurf am Fuß
  const erde = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.4), new THREE.MeshStandardMaterial({ color: 0x2c2418, roughness: 1 }));
  erde.scale.set(1, 0.35, 0.7); erde.position.set(0, 0.0, 0.02); erde.receiveShadow = true; g.add(erde);
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
  return { gruppe: g, animate: NOOP };
}

// ================== ZAUN (Tiergatter) ==================
// Leichter Holzzaun, GLEICHMÄSSIG (keine Cartoon-Verjüngung, kein Schräghang):
// zwei Pfosten an den Kachelrändern (teilen sich mit dem Nachbarn), zwei gerade
// Querlatten gleicher Dicke dazwischen. Im 3D-Raum werden Segmente um 90° gedreht
// aneinandergesetzt -> echte vertikale UND horizontale Seiten + Ecken.
export function baueZaun(): { gruppe: THREE.Group; animate: (o: number, t: number) => void } {
  const g = new THREE.Group();
  const pfostenM = matHolz(0x6a4a28), latteM = matHolz(0x7a5630);
  const H = 0.9;
  for (const px of [-0.5, 0.5]) {
    g.add(box(0.12, H, 0.12, pfostenM, px, H / 2, 0));      // gerader, gleich dicker Pfosten
    g.add(box(0.16, 0.07, 0.16, pfostenM, px, H + 0.02, 0)); // flache Kappe
  }
  for (const ly of [0.34, 0.66]) g.add(box(1.0, 0.08, 0.06, latteM, 0, ly, 0)); // gerade, gleich dicke Latten
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
  return { gruppe: g, animate: NOOP };
}

// ================== ERZ (mehrere Varianten) ==================
// Felsbrocken mit eingesprengten, leicht glühenden Kristallen. Über `art`
// kommen Farbe + Leuchten (Gold/Kupfer/Eisen/Silber/Kristall), über `groesse`
// die Skalierung (klein .. groß). So entstehen aus EINEM Bauer alle Adern.
export type ErzArt = 'gold' | 'kupfer' | 'eisen' | 'silber' | 'kristall';

interface ErzStil { kristall: number; emissive: number; metall: number; rauh: number; gluehen: number; }
const ERZ_STILE: Record<ErzArt, ErzStil> = {
  gold:     { kristall: 0xd8a838, emissive: 0x3a2a08, metall: 0.85, rauh: 0.25, gluehen: 0.5 },
  kupfer:   { kristall: 0xc06a34, emissive: 0x3a1808, metall: 0.8,  rauh: 0.3,  gluehen: 0.5 },
  eisen:    { kristall: 0x9aa0a8, emissive: 0x14161a, metall: 0.9,  rauh: 0.35, gluehen: 0.3 },
  silber:   { kristall: 0xd6dce4, emissive: 0x20242a, metall: 0.92, rauh: 0.18, gluehen: 0.6 },
  kristall: { kristall: 0x6ad0ff, emissive: 0x123a4a, metall: 0.2,  rauh: 0.08, gluehen: 1.0 },
};

export function baueErz(art: ErzArt = 'gold', groesse = 1): { gruppe: THREE.Group; animate: (o: number, t: number) => void } {
  const g = new THREE.Group();
  const stil = ERZ_STILE[art];
  const fels = matStein(0x4e4a44), felsD = matStein(0x3a362f);
  // unregelmäßiger Felsbrocken aus mehreren Klötzen
  for (const [sx, sy, sz, w] of [[0, 0.25, 0, 0.7], [0.25, 0.35, 0.1, 0.4], [-0.2, 0.3, -0.1, 0.45], [0.05, 0.5, -0.05, 0.35]] as Array<[number, number, number, number]>) {
    const b = new THREE.Mesh(new THREE.DodecahedronGeometry(w * 0.6, 0), Math.random() < 0.5 ? fels : felsD);
    b.position.set(sx, sy, sz); b.rotation.set(Math.random(), Math.random(), Math.random()); b.castShadow = true; b.receiveShadow = true; g.add(b);
  }
  const istKristall = art === 'kristall';
  const erzMat = new THREE.MeshStandardMaterial({ color: stil.kristall, metalness: stil.metall, roughness: stil.rauh, emissive: stil.emissive });
  const kristalle: THREE.Mesh[] = [];
  const anzahl = istKristall ? 10 : 14;
  for (let i = 0; i < anzahl; i++) {
    const s = (istKristall ? 0.05 : 0.03) + Math.random() * 0.04;
    const geo = istKristall ? new THREE.ConeGeometry(s * 0.7, s * 2.4, 5) : new THREE.OctahedronGeometry(s);
    const k = new THREE.Mesh(geo, erzMat);
    const a = Math.random() * Math.PI * 2, r = 0.2 + Math.random() * 0.25;
    k.position.set(Math.cos(a) * r, 0.18 + Math.random() * 0.42, Math.sin(a) * r);
    k.rotation.set(Math.random(), Math.random(), Math.random()); k.castShadow = true; g.add(k); kristalle.push(k);
  }
  // leichtes Glimmen aus der Ader (bei Kristall am stärksten)
  const schimmer = new THREE.PointLight(stil.kristall, stil.gluehen * 0.8, 1.8, 2.2);
  schimmer.position.set(0, 0.4, 0); g.add(schimmer);
  g.scale.setScalar(groesse);
  return {
    gruppe: g,
    animate: (_o, t) => { schimmer.intensity = stil.gluehen * (0.55 + Math.sin(t * 2.2) * 0.25); },
  };
}
