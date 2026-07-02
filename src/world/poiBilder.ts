// POI-BILDER (Runde 76, Autorfreigabe): kleine, malerische Wegzeichen der Zeit
// um 1300 für die Startkarte - historisch begründet (Recherche in
// OFFENE-FRAGEN.md): KEINE Schriftschilder, stattdessen Bildstock, Symbol-
// Wegweiser (eingekerbter Rabe), Galgen, Sühnekreuz, verunglückter Karren,
// Köhler-Meiler. Einmal als Canvas gebacken (LINEAR angezeigt), Y-sortiert.

function rngAus(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function neu(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')!];
}
// weicher Bodenschatten am Fuß
function fussSchatten(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const rg = g.createRadialGradient(x, y, 1, x, y, r);
  rg.addColorStop(0, 'rgba(0,0,0,0.4)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.beginPath(); g.ellipse(x, y, r, r * 0.32, 0, 0, Math.PI * 2); g.fill();
}

// Bildstock: Steinpfeiler mit Heiligennische, kleines Satteldach, Kerzenschein.
export function macheBildstock(): HTMLCanvasElement {
  const [c, g] = neu(64, 96);
  fussSchatten(g, 32, 90, 20);
  // Pfeiler mit leichtem Verlauf (Stein)
  const grad = g.createLinearGradient(24, 0, 42, 0);
  grad.addColorStop(0, '#8a8478'); grad.addColorStop(0.5, '#a29a8a'); grad.addColorStop(1, '#6e685e');
  g.fillStyle = grad; g.fillRect(25, 30, 14, 60);
  g.fillStyle = '#5e584e'; g.fillRect(22, 86, 20, 6);          // Sockel
  g.fillStyle = '#746e62'; g.fillRect(23, 26, 18, 6);          // Kranz unter dem Dach
  // Nische mit Heiligenbild (angedeutete Figur) + Kerzenschein
  g.fillStyle = '#2a2018'; g.fillRect(27, 34, 10, 16);
  const schein = g.createRadialGradient(32, 44, 1, 32, 44, 9);
  schein.addColorStop(0, 'rgba(255,190,90,0.9)'); schein.addColorStop(1, 'rgba(255,150,40,0)');
  g.fillStyle = schein; g.fillRect(22, 34, 20, 18);
  g.fillStyle = '#c8b890'; g.fillRect(30, 37, 4, 8);           // Figur
  g.fillStyle = '#c8b890'; g.beginPath(); g.arc(32, 36, 2.2, 0, 7); g.fill();
  // Satteldach
  g.fillStyle = '#4a3a2a';
  g.beginPath(); g.moveTo(18, 28); g.lineTo(32, 14); g.lineTo(46, 28); g.closePath(); g.fill();
  g.fillStyle = '#5e4a34';
  g.beginPath(); g.moveTo(20, 27); g.lineTo(32, 16); g.lineTo(32, 22); g.lineTo(24, 28); g.closePath(); g.fill();
  // Moos am Fuß
  g.fillStyle = 'rgba(70,90,48,0.7)';
  g.beginPath(); g.ellipse(27, 87, 5, 3, 0.4, 0, 7); g.ellipse(38, 88, 4, 2.4, -0.3, 0, 7); g.fill();
  return c;
}

// Symbol-Wegweiser: grober Holzpfahl, Querbalken nach Osten, eingekerbter Rabe.
export function macheWegweiser(): HTMLCanvasElement {
  const [c, g] = neu(72, 88);
  fussSchatten(g, 30, 82, 16);
  const holz = g.createLinearGradient(26, 0, 36, 0);
  holz.addColorStop(0, '#4a3a26'); holz.addColorStop(0.5, '#5e4a30'); holz.addColorStop(1, '#3a2c1c');
  g.fillStyle = holz; g.fillRect(27, 18, 8, 64);               // Pfahl
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(30, 22); g.lineTo(29, 78); g.stroke();   // Maserung
  // Querbalken, zeigt nach OSTEN (rechts), leicht schief
  g.save(); g.translate(31, 26); g.rotate(0.06);
  g.fillStyle = '#55432c'; g.fillRect(-6, -5, 40, 10);
  g.beginPath(); g.moveTo(34, -5); g.lineTo(41, 0); g.lineTo(34, 5); g.closePath(); g.fill();   // Spitze
  // eingekerbter RABE (dunkle Kerbe): sitzender Vogel, Schnabel nach rechts
  g.fillStyle = 'rgba(20,14,8,0.9)';
  g.beginPath();
  g.ellipse(12, 0, 6.5, 3.4, -0.15, 0, Math.PI * 2);           // Körper
  g.fill();
  g.beginPath(); g.arc(19, -2.4, 2.4, 0, 7); g.fill();         // Kopf
  g.beginPath(); g.moveTo(21, -2.6); g.lineTo(25.5, -1.6); g.lineTo(21, -0.8); g.closePath(); g.fill();   // Schnabel
  g.beginPath(); g.moveTo(6, 0.6); g.lineTo(1.5, 3.4); g.lineTo(7, 2.4); g.closePath(); g.fill();          // Schwanz
  g.restore();
  return c;
}

// Galgen auf kleinem Hügel: zwei Pfosten, Querbalken, leerer Strick im Wind.
export function macheGalgen(): HTMLCanvasElement {
  const [c, g] = neu(110, 120);
  // Hügel
  const huegel = g.createLinearGradient(0, 84, 0, 116);
  huegel.addColorStop(0, '#4a4432'); huegel.addColorStop(1, '#35301f');
  g.fillStyle = huegel;
  g.beginPath(); g.ellipse(55, 104, 50, 18, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(55, 112, 46, 9, 0, 0, 7); g.fill();
  const holz = '#4a3826';
  g.fillStyle = holz; g.fillRect(24, 30, 7, 72);               // linker Pfosten
  g.fillStyle = '#3e2f1f'; g.fillRect(76, 38, 7, 64);          // rechter Pfosten (etwas hinten)
  g.fillStyle = '#55432c'; g.fillRect(18, 24, 74, 8);          // Querbalken
  g.fillStyle = holz; g.beginPath(); g.moveTo(31, 44); g.lineTo(48, 32); g.lineTo(31, 36); g.closePath(); g.fill();   // Strebe
  // Strick (leer, leicht ausgelenkt)
  g.strokeStyle = '#8a7a58'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(58, 32); g.quadraticCurveTo(59, 44, 61, 52); g.stroke();
  g.beginPath(); g.ellipse(62, 56, 3.4, 4.4, 0.2, 0, Math.PI * 2); g.stroke();   // Schlinge
  // Krähe auf dem Balken
  g.fillStyle = '#14100c';
  g.beginPath(); g.ellipse(84, 21, 4.4, 2.6, -0.2, 0, 7); g.fill();
  g.beginPath(); g.arc(88, 19, 1.7, 0, 7); g.fill();
  g.beginPath(); g.moveTo(89.5, 19); g.lineTo(92, 19.8); g.lineTo(89.5, 20.4); g.closePath(); g.fill();
  return c;
}

// Sühnekreuz: verwittertes, leicht gekipptes Steinkreuz mit Flechten.
export function macheSuehnekreuz(): HTMLCanvasElement {
  const [c, g] = neu(64, 80);
  const rnd = rngAus(41);
  fussSchatten(g, 32, 74, 18);
  g.save(); g.translate(32, 72); g.rotate(-0.09);              // leicht gekippt
  const stein = g.createLinearGradient(-8, -60, 10, 0);
  stein.addColorStop(0, '#8a867a'); stein.addColorStop(1, '#5e5a50');
  g.fillStyle = stein;
  g.fillRect(-7, -52, 14, 52);                                 // Stamm
  g.fillRect(-20, -44, 40, 12);                                // Arme
  g.strokeStyle = 'rgba(40,36,30,0.5)'; g.lineWidth = 1.4;
  g.strokeRect(-7, -52, 14, 52); g.strokeRect(-20, -44, 40, 12);
  // eingeritztes kleines Kreuz (Sühnezeichen)
  g.strokeStyle = 'rgba(30,26,22,0.7)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -30); g.lineTo(0, -12); g.moveTo(-6, -24); g.lineTo(6, -24); g.stroke();
  // Flechten/Moos-Flecken
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? 'rgba(122,128,84,0.5)' : 'rgba(84,96,58,0.5)';
    g.beginPath(); g.ellipse((rnd() - 0.5) * 30, -8 - rnd() * 40, 2 + rnd() * 3, 1.5 + rnd() * 2, rnd() * 3, 0, 7); g.fill();
  }
  g.restore();
  // Gras am Fuß
  g.strokeStyle = '#3a4a22'; g.lineWidth = 1.3;
  for (let i = 0; i < 7; i++) {
    const x = 18 + rnd() * 28;
    g.beginPath(); g.moveTo(x, 74); g.lineTo(x + (rnd() - 0.5) * 5, 66 - rnd() * 5); g.stroke();
  }
  return c;
}

// Verunglückter Karren: gekippt, gebrochenes Rad, verstreute Säcke/Fass.
export function macheKarren(): HTMLCanvasElement {
  const [c, g] = neu(120, 84);
  fussSchatten(g, 58, 72, 40);
  g.save(); g.translate(56, 52); g.rotate(-0.12);              // gekippt
  const holz = g.createLinearGradient(0, -18, 0, 14);
  holz.addColorStop(0, '#6a5438'); holz.addColorStop(1, '#4a3a26');
  g.fillStyle = holz; g.fillRect(-34, -14, 66, 24);            // Wagenkasten
  g.strokeStyle = 'rgba(30,22,14,0.6)'; g.lineWidth = 1.4;
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-30 + i * 16, -13); g.lineTo(-30 + i * 16, 9); g.stroke(); }   // Bretter
  g.fillStyle = '#3a2c1c'; g.fillRect(30, -6, 26, 4);          // Deichsel (ins Leere)
  g.restore();
  // intaktes Rad (hinten) + gebrochenes Rad (vorn, liegt)
  const rad = (x: number, y: number, r: number, kaputt: boolean): void => {
    g.strokeStyle = '#4a3a26'; g.lineWidth = 4;
    g.beginPath(); g.arc(x, y, r, kaputt ? 0.7 : 0, kaputt ? 5.2 : Math.PI * 2); g.stroke();
    g.lineWidth = 2;
    for (let s = 0; s < 6; s++) {
      const a = (s / 6) * Math.PI * 2;
      if (kaputt && s === 1) continue;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2)); g.stroke();
    }
  };
  rad(26, 62, 15, false);
  g.save(); g.translate(96, 66); g.rotate(1.2); rad(0, 0, 13, true); g.restore();
  // verstreute Säcke + Fass
  g.fillStyle = '#8a795c';
  g.beginPath(); g.ellipse(78, 70, 9, 6, 0.4, 0, 7); g.fill();
  g.beginPath(); g.ellipse(64, 75, 8, 5, -0.3, 0, 7); g.fill();
  g.strokeStyle = 'rgba(60,50,34,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(74, 66); g.lineTo(82, 74); g.stroke();
  g.fillStyle = '#6a5438'; g.beginPath(); g.ellipse(14, 74, 7, 5, 0.2, 0, 7); g.fill();   // Fass liegend
  g.strokeStyle = '#3a2c1c'; g.beginPath(); g.ellipse(14, 74, 7, 5, 0.2, 0, 7); g.stroke();
  return c;
}

// Köhler-Meiler: Erdkuppel mit Rauchloch, Holzstapel daneben, dünner Rauch.
export function macheMeiler(): HTMLCanvasElement {
  const [c, g] = neu(110, 96);
  const rnd = rngAus(77);
  fussSchatten(g, 50, 86, 36);
  // Kuppel (Erde über Holz)
  const kuppel = g.createRadialGradient(46, 58, 4, 50, 66, 34);
  kuppel.addColorStop(0, '#5a4a34'); kuppel.addColorStop(0.7, '#42351f'); kuppel.addColorStop(1, '#2e2414');
  g.fillStyle = kuppel;
  g.beginPath(); g.ellipse(50, 66, 34, 24, 0, Math.PI, 0); g.lineTo(84, 84); g.ellipse(50, 84, 34, 8, 0, 0, Math.PI); g.closePath(); g.fill();
  // Grasnarbe-Flecken auf der Kuppel
  for (let i = 0; i < 9; i++) {
    g.fillStyle = i % 2 ? 'rgba(70,90,48,0.4)' : 'rgba(46,60,30,0.4)';
    g.beginPath(); g.ellipse(24 + rnd() * 52, 56 + rnd() * 22, 3 + rnd() * 5, 2 + rnd() * 3, rnd() * 3, 0, 7); g.fill();
  }
  // Rauchloch + Glut
  g.fillStyle = '#1a120a'; g.beginPath(); g.ellipse(50, 46, 6, 3.4, 0, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,120,40,0.5)'; g.beginPath(); g.ellipse(50, 46, 3, 1.6, 0, 0, 7); g.fill();
  // dünner Rauch
  g.strokeStyle = 'rgba(180,180,170,0.4)'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(50, 42); g.quadraticCurveTo(56, 28, 50, 16); g.quadraticCurveTo(46, 8, 52, 2); g.stroke();
  // Holzstapel daneben
  g.fillStyle = '#4a3826';
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3 - i; j++) {
    g.beginPath(); g.arc(92 + j * 7 + i * 3.5, 82 - i * 6, 3.6, 0, 7); g.fill();
    g.fillStyle = i % 2 ? '#55432c' : '#4a3826';
  }
  g.strokeStyle = '#2e2414'; g.lineWidth = 1;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3 - i; j++) g.beginPath(), g.arc(92 + j * 7 + i * 3.5, 82 - i * 6, 3.6, 0, 7), g.stroke();
  return c;
}

export const POI_BILDER: Record<string, () => HTMLCanvasElement> = {
  bildstock: macheBildstock,
  wegweiser: macheWegweiser,
  galgen: macheGalgen,
  suehnekreuz: macheSuehnekreuz,
  karren: macheKarren,
  meiler: macheMeiler,
};
