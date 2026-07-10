// BODEN-STILE (R124, ueberarbeitet R127 - Autorwunsch: "natuerlicher, mehr
// Auswahl - Kirchenboden, Plattenboden, Mosaik... und unpassende raus").
// 20 prozedurale 32x32-Boeden im Dungeon-Stil, alle mit feinem Rauschen und
// Abnutzung, damit sie nach echtem Boden aussehen statt nach Muster.
// Auswahl in der DUNGEON-PROBE; Raum-Rollen bekommen eigene Boeden
// (raumBoeden in probeKarten.ts, z. B. Blut im Kerker, Gebein im Beinhaus).

const TILE = 32;
type Ctx = CanvasRenderingContext2D;

export interface BodenStil { id: string; name: string; zeichne: (ctx: Ctx, n: number) => void }

// kleiner deterministischer Zufall je Variante (stabil, kein Math.random im Bake)
function prng(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}
const fuege = (ctx: Ctx, c: string, x: number, y: number, w: number, h: number): void => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

// Gemeinsame Bausteine fuer den "natuerlichen" Blick -------------------------
// feines Korn-Rauschen (jeder Boden hat Staub/Poren)
function koernung(ctx: Ctx, r: () => number, staerke = 0.1, anzahl = 26): void {
  for (let i = 0; i < anzahl; i++) {
    const d = (r() - 0.5) * staerke * 2;
    ctx.fillStyle = d > 0 ? `rgba(235,225,205,${d})` : `rgba(0,0,0,${-d})`;
    ctx.fillRect(r() * TILE, r() * TILE, 1, 1);
  }
}
// Abnutzung: helle, weiche Trittspur (Boeden werden mittig blank getreten)
function abnutzung(ctx: Ctx, r: () => number, staerke = 0.05): void {
  ctx.fillStyle = `rgba(235,220,190,${staerke})`;
  ctx.beginPath(); ctx.ellipse(TILE / 2 + (r() - 0.5) * 6, TILE / 2 + (r() - 0.5) * 6, 12, 9, r() * 3, 0, 6.283); ctx.fill();
}
// feiner Riss (unregelmaessige Polyline von oben nach unten)
function riss(ctx: Ctx, r: () => number, alpha = 0.3): void {
  ctx.strokeStyle = `rgba(0,0,0,${alpha})`; ctx.lineWidth = 1;
  ctx.beginPath();
  let x = r() * TILE, y = 0;
  ctx.moveTo(x, y);
  while (y < TILE) { y += 3 + r() * 5; x += (r() - 0.5) * 7; ctx.lineTo(x, y); }
  ctx.stroke();
}

// --- die 20 Stile ----------------------------------------------------------
export const BODEN_STILE: BodenStil[] = [
  // 1 - grosse, unregelmaessig geschnittene Steinplatten (Standard-Boden)
  { id: 'pflaster', name: 'Steinplatten', zeichne(ctx, n) {
    const r = prng(n);
    const g = 46 + (n % 7) * 2;
    fuege(ctx, `rgb(${g + 3},${g},${g - 5})`, 0, 0, TILE, TILE);
    // Fugen NICHT mittig, sondern je Variante versetzt (wirkt geschnitten)
    const fx = 10 + Math.floor(r() * 12), fy = 10 + Math.floor(r() * 12);
    ctx.strokeStyle = 'rgba(10,8,6,0.5)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(fx + (r() - 0.5) * 2, 0); ctx.lineTo(fx + (r() - 0.5) * 3, TILE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, fy + (r() - 0.5) * 2); ctx.lineTo(TILE, fy + (r() - 0.5) * 3); ctx.stroke();
    // je Feld eine leicht andere Toenung (Platten aus verschiedenen Bruechen)
    ctx.fillStyle = `rgba(${180 + r() * 40},${170 + r() * 30},150,${0.04 + r() * 0.05})`;
    ctx.fillRect(0, 0, fx, fy);
    if (r() < 0.4) riss(ctx, r, 0.2);
    abnutzung(ctx, r); koernung(ctx, r, 0.08);
  } },
  // 2 - schwarzer Schiefer mit feiner Schichtung
  { id: 'schiefer', name: 'Schwarzer Schiefer', zeichne(ctx, n) {
    const r = prng(n + 9);
    const g = 26 + (n % 5);
    fuege(ctx, `rgb(${g},${g + 2},${g + 5})`, 0, 0, TILE, TILE);
    // Spaltlinien: fast parallel, leicht wellig (natuerliche Schichtung)
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    const neigung = (r() - 0.5) * 8;
    for (let y0 = 3 + r() * 4; y0 < TILE; y0 += 6 + r() * 5) {
      ctx.beginPath(); ctx.moveTo(0, y0);
      for (let x = 6; x <= TILE; x += 6) ctx.lineTo(x, y0 + (x / TILE) * neigung + (r() - 0.5) * 1.6);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(120,135,160,0.08)';
    ctx.fillRect(0, 2 + r() * 6, TILE, 2);
    abnutzung(ctx, r, 0.035); koernung(ctx, r, 0.07);
  } },
  // 3 - Kopfsteinpflaster im Moertelbett
  { id: 'kopfstein', name: 'Kopfsteinpflaster', zeichne(ctx, n) {
    const r = prng(n + 3);
    fuege(ctx, '#2c2620', 0, 0, TILE, TILE);                  // Moertel
    for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++) {
      const cx = gx * 8 + 4 + (gy % 2) * 3 + (r() - 0.5) * 2, cy = gy * 8 + 4 + (r() - 0.5) * 2;
      const rad = 3.2 + r() * 1.6, hell = 56 + r() * 26;
      ctx.fillStyle = `rgb(${(hell + r() * 8) | 0},${hell | 0},${(hell - 6) | 0})`;
      ctx.beginPath(); ctx.ellipse(cx, cy, rad, rad * (0.8 + r() * 0.3), r() * 3, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,210,0.10)';               // Lichtkante oben
      ctx.beginPath(); ctx.ellipse(cx - 0.5, cy - 1, rad * 0.55, rad * 0.3, 0, 0, 6.283); ctx.fill();
    }
    koernung(ctx, r, 0.08, 18);
  } },
  // 4 - Fischgraet-Ziegel (opus spicatum, mittelalterlicher Ziegelboden;
  //     ersetzt den alten "Ziegelboden", der wie eine Wand aussah)
  { id: 'fischgraet', name: 'Fischgrät-Ziegel', zeichne(ctx, n) {
    const r = prng(n + 7);
    fuege(ctx, '#2a1d14', 0, 0, TILE, TILE);
    for (let reihe = 0; reihe < 4; reihe++) {
      for (let i = -1; i < 5; i++) {
        const links = reihe % 2 === 0;
        const bx = i * 8 + (reihe % 2) * 4, by = reihe * 8;
        const c = 116 + r() * 26;
        ctx.save();
        ctx.translate(bx + 4, by + 4);
        ctx.rotate(links ? 0.62 : -0.62);
        ctx.fillStyle = `rgb(${c | 0},${(c * 0.55) | 0},${(c * 0.4) | 0})`;
        ctx.fillRect(-5, -2.4, 10, 4.8);
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(-5, 1.2, 10, 1.2);
        ctx.restore();
      }
    }
    abnutzung(ctx, r, 0.04); koernung(ctx, r, 0.09, 20);
  } },
  // 5 - cremiger Marmor mit Aederung
  { id: 'marmor', name: 'Marmor', zeichne(ctx, n) {
    const r = prng(n + 4);
    const g = 128 + (n % 5) * 3;
    fuege(ctx, `rgb(${g},${g - 4},${g - 12})`, 0, 0, TILE, TILE);
    for (let i = 0; i < 3; i++) {                             // weiche Wolken
      ctx.fillStyle = `rgba(210,205,192,${0.05 + r() * 0.05})`;
      ctx.beginPath(); ctx.ellipse(r() * TILE, r() * TILE, 6 + r() * 9, 4 + r() * 6, r() * 3, 0, 6.283); ctx.fill();
    }
    for (let i = 0; i < 1 + Math.floor(r() * 2); i++) {       // feine graue Adern
      ctx.strokeStyle = `rgba(105,105,125,${0.25 + r() * 0.15})`; ctx.lineWidth = 0.9;
      ctx.beginPath();
      let x = r() * TILE, y = 0; ctx.moveTo(x, y);
      while (y < TILE) { y += 2.5 + r() * 4; x += (r() - 0.5) * 9; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(60,60,70,0.25)'; ctx.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
    koernung(ctx, r, 0.04, 14);
  } },
  // 6 - Marmor-Schachbrett (Kirchen-/Palastboden)
  { id: 'schachbrett', name: 'Marmor-Schachbrett', zeichne(ctx, n) {
    const r = prng(n + 21);
    for (let gy = 0; gy < 2; gy++) for (let gx = 0; gx < 2; gx++) {
      const dunkel = (gx + gy + n) % 2 === 0;
      const g = dunkel ? 34 + r() * 6 : 132 + r() * 10;
      fuege(ctx, `rgb(${g | 0},${(g - 3) | 0},${(g - (dunkel ? 2 : 12)) | 0})`, gx * 16, gy * 16, 16, 16);
      // Marmor-Ader in jeder Platte
      ctx.strokeStyle = dunkel ? 'rgba(150,150,170,0.18)' : 'rgba(100,100,120,0.22)';
      ctx.lineWidth = 0.8; ctx.beginPath();
      let x = gx * 16 + r() * 16, y = gy * 16; ctx.moveTo(x, y);
      while (y < gy * 16 + 16) { y += 3 + r() * 3; x += (r() - 0.5) * 6; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(20,16,12,0.5)'; ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(16, TILE); ctx.moveTo(0, 16); ctx.lineTo(TILE, 16); ctx.stroke();
    abnutzung(ctx, r, 0.03);
  } },
  // 7 - glasierte Tonfliesen (Kirchenboden, zweifarbig)
  { id: 'kirchenfliesen', name: 'Kirchenfliesen', zeichne(ctx, n) {
    const r = prng(n + 23);
    for (let gy = 0; gy < 2; gy++) for (let gx = 0; gx < 2; gx++) {
      const ocker = (gx + gy + n) % 2 === 0;
      const c = ocker ? [124 + r() * 12, 96 + r() * 8, 58] : [72 + r() * 8, 50, 38];
      fuege(ctx, `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`, gx * 16, gy * 16, 16, 16);
      // Glasur-Glanzpunkt
      ctx.fillStyle = 'rgba(225,215,190,0.06)';
      ctx.beginPath(); ctx.ellipse(gx * 16 + 5 + r() * 5, gy * 16 + 4 + r() * 4, 4, 2.4, -0.6, 0, 6.283); ctx.fill();
      // abgeplatzte Ecke (abgenutzte Glasur)
      if (r() < 0.3) { ctx.fillStyle = 'rgba(40,28,18,0.5)'; ctx.fillRect(gx * 16 + (r() < 0.5 ? 1 : 12), gy * 16 + (r() < 0.5 ? 1 : 12), 3, 3); }
    }
    ctx.strokeStyle = 'rgba(24,18,12,0.6)'; ctx.lineWidth = 1.2;
    ctx.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(16, TILE); ctx.moveTo(0, 16); ctx.lineTo(TILE, 16); ctx.stroke();
    koernung(ctx, r, 0.06, 14);
  } },
  // 8 - kleines Steinmosaik (Tesserae mit Moertelfugen)
  { id: 'mosaik', name: 'Steinmosaik', zeichne(ctx, n) {
    const r = prng(n + 27);
    fuege(ctx, '#241f18', 0, 0, TILE, TILE);                  // Moertel
    const paletten: Array<[number, number, number]> = [[150, 138, 114], [120, 112, 98], [92, 74, 58], [70, 82, 90], [116, 66, 54]];
    for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < 8; gx++) {
      const p = paletten[Math.floor(r() * (r() < 0.9 ? 3 : paletten.length))]; // fast nur beige/grau, sehr selten farbig
      const hell = 0.85 + r() * 0.3;
      ctx.fillStyle = `rgb(${(p[0] * hell) | 0},${(p[1] * hell) | 0},${(p[2] * hell) | 0})`;
      ctx.fillRect(gx * 4 + 0.5 + (r() - 0.5), gy * 4 + 0.5 + (r() - 0.5), 3, 3);
    }
    abnutzung(ctx, r, 0.04); koernung(ctx, r, 0.05, 12);
  } },
  // 9 - Ornamentplatte (gemeisselte Rosette - Kapelle/Gruft)
  { id: 'rosette', name: 'Ornamentplatte', zeichne(ctx, n) {
    const r = prng(n + 33);
    const g = 92 + (n % 5) * 3;
    fuege(ctx, `rgb(${g},${g - 6},${g - 14})`, 0, 0, TILE, TILE);
    ctx.strokeStyle = 'rgba(20,16,12,0.5)'; ctx.lineWidth = 1.2; ctx.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
    // gemeisselte Kreise + Speichen (Relief: dunkle Kerbe + helle Kante)
    const cx = TILE / 2, cy = TILE / 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, 10.5, 0, 6.283); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = 'rgba(235,220,190,0.14)';
    ctx.beginPath(); ctx.arc(cx, cy + 0.8, 10.5, 0, 6.283); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 6.283 + (n % 3) * 0.26;
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 5, cy + Math.sin(a) * 5); ctx.lineTo(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10); ctx.stroke();
    }
    if (r() < 0.35) riss(ctx, r, 0.22);
    abnutzung(ctx, r, 0.05); koernung(ctx, r, 0.07, 18);
  } },
  // 10 - warme Sandsteinplatten
  { id: 'sandstein', name: 'Sandsteinplatten', zeichne(ctx, n) {
    const r = prng(n + 37);
    const g = 114 + (n % 6) * 3;
    fuege(ctx, `rgb(${g},${g - 24},${g - 52})`, 0, 0, TILE, TILE);
    // waagrechte Schichtung (Sediment)
    for (let y = 3 + r() * 4; y < TILE; y += 5 + r() * 4) {
      ctx.fillStyle = `rgba(${g - 30},${g - 52},${g - 78},${0.10 + r() * 0.08})`;
      ctx.fillRect(0, y, TILE, 1 + r() * 1.4);
    }
    const fx = 12 + Math.floor(r() * 8);
    ctx.strokeStyle = 'rgba(60,40,20,0.4)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(fx, 0); ctx.lineTo(fx + (r() - 0.5) * 3, TILE); ctx.stroke();
    abnutzung(ctx, r); koernung(ctx, r, 0.09, 22);
  } },
  // 11 - heller, blank getretener Kalkstein
  { id: 'kalkstein', name: 'Kalkstein (abgetreten)', zeichne(ctx, n) {
    const r = prng(n + 41);
    const g = 120 + (n % 5) * 3;
    fuege(ctx, `rgb(${g},${g - 5},${g - 16})`, 0, 0, TILE, TILE);
    for (let i = 0; i < 3; i++) {                             // Wasser-/Kalkraender
      ctx.fillStyle = `rgba(120,112,96,${0.05 + r() * 0.06})`;
      ctx.beginPath(); ctx.ellipse(r() * TILE, r() * TILE, 5 + r() * 9, 4 + r() * 6, r() * 3, 0, 6.283); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(70,62,50,0.3)'; ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
    if (r() < 0.5) riss(ctx, r, 0.16);
    abnutzung(ctx, r, 0.09); koernung(ctx, r, 0.06, 16);
  } },
  // 12 - Granit (R127c, Autor "zu dominant, Muster nutzlos bei Wiederholung":
  // deutlich weniger + schwaechere Sprenkel, KEIN Plattenrand mehr - dadurch
  // gibt es keine sichtbare Kachel-Wiederholung, nur ruhiges Korn)
  { id: 'granit', name: 'Granit', zeichne(ctx, n) {
    const r = prng(n + 43);
    const g = 74 + (n % 5) * 2;
    fuege(ctx, `rgb(${g},${g - 2},${g - 4})`, 0, 0, TILE, TILE);
    for (let i = 0; i < 28; i++) {
      const w = r();
      ctx.fillStyle = w < 0.5 ? 'rgba(30,28,26,0.22)' : w < 0.85 ? 'rgba(150,146,138,0.16)' : 'rgba(160,130,115,0.12)';
      ctx.fillRect(r() * TILE, r() * TILE, 1, 1);
    }
    koernung(ctx, r, 0.05, 12);
  } },
  // 13 - Flusskiesel in Moertel (Hof/Kueche)
  { id: 'flusskiesel', name: 'Flusskiesel', zeichne(ctx, n) {
    const r = prng(n + 47);
    fuege(ctx, '#332c22', 0, 0, TILE, TILE);
    for (let i = 0; i < 14; i++) {
      const cx = r() * TILE, cy = r() * TILE, rad = 2 + r() * 2.6;
      const ton = 90 + r() * 60, warm = r() * 20;
      ctx.fillStyle = `rgb(${(ton + warm) | 0},${ton | 0},${(ton - warm * 0.6) | 0})`;
      ctx.beginPath(); ctx.ellipse(cx, cy, rad, rad * (0.65 + r() * 0.3), r() * 3, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,245,220,0.10)';
      ctx.beginPath(); ctx.ellipse(cx - rad * 0.25, cy - rad * 0.3, rad * 0.4, rad * 0.22, 0, 0, 6.283); ctx.fill();
    }
    koernung(ctx, r, 0.07, 16);
  } },
  // 14 - breite Holzdielen
  { id: 'holzdielen', name: 'Holzdielen', zeichne(ctx, n) {
    const r = prng(n + 53);
    fuege(ctx, '#1d1208', 0, 0, TILE, TILE);
    for (let x = 0; x < TILE; x += 8) {
      const c = 96 + r() * 30;
      ctx.fillStyle = `rgb(${c | 0},${(c * 0.64) | 0},${(c * 0.36) | 0})`;
      ctx.fillRect(x + 1, 0, 6, TILE);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {                            // Maserung
        ctx.beginPath();
        let px = x + 2 + r() * 4; ctx.moveTo(px, 0);
        for (let y = 5; y <= TILE; y += 6) { px += (r() - 0.5) * 1.6; ctx.lineTo(px, y); }
        ctx.stroke();
      }
      if (r() < 0.5) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x + 1, Math.floor(r() * 4) * 8 + 3, 6, 1); } // Stossfuge
      if (r() < 0.3) { ctx.fillStyle = 'rgba(20,12,6,0.6)'; ctx.beginPath(); ctx.arc(x + 4, r() * TILE, 1, 0, 6.283); ctx.fill(); } // Astloch
    }
    abnutzung(ctx, r, 0.05);
  } },
  // 15 - gestampfter Lehm (arme Stuben, Keller)
  { id: 'lehm', name: 'Gestampfter Lehm', zeichne(ctx, n) {
    const r = prng(n + 59);
    const g = 96 + (n % 6) * 2;
    fuege(ctx, `rgb(${g},${g - 26},${g - 48})`, 0, 0, TILE, TILE);
    // Trocknungs-Risse (feines Netz)
    ctx.strokeStyle = 'rgba(40,24,12,0.28)'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      let x = r() * TILE, y = r() * TILE; ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) { x += (r() - 0.5) * 14; y += (r() - 0.5) * 14; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    // R127c: KEINE Abnutzungs-Ellipse - das ovale Overlay wiederholte sich
    // sichtbar je Kachel (Autor). Nur feines Korn.
    koernung(ctx, r, 0.08, 24);
  } },
  // 16 - festgetretene dunkle Erde
  { id: 'erde', name: 'Erdboden', zeichne(ctx, n) {
    const r = prng(n + 13);
    const g = 58 + (n % 6) * 2;
    fuege(ctx, `rgb(${g},${g - 16},${g - 28})`, 0, 0, TILE, TILE);
    for (let i = 0; i < 8; i++) {
      const c = 60 + r() * 34;
      ctx.fillStyle = `rgb(${c | 0},${(c - 10) | 0},${(c - 20) | 0})`;
      ctx.beginPath(); ctx.ellipse(r() * TILE, r() * TILE, 1 + r() * 2.2, 0.8 + r() * 1.6, r() * 3, 0, 6.283); ctx.fill();
    }
    // R127c: keine Abnutzungs-Ellipse (wiederholte sich sichtbar; passt so
    // auch besser zum Hoehlengrund der Mine)
    koernung(ctx, r, 0.1, 26);
  } },
  // 17 - Steinplatten mit Moos in den Fugen (feuchte Gewoelbe)
  { id: 'moos', name: 'Moosstein', zeichne(ctx, n) {
    const r = prng(n + 11);
    const g = 52 + (n % 6) * 2;
    fuege(ctx, `rgb(${g - 4},${g},${g - 8})`, 0, 0, TILE, TILE);
    const fx = 10 + Math.floor(r() * 12), fy = 10 + Math.floor(r() * 12);
    ctx.strokeStyle = 'rgba(10,10,8,0.45)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(fx, 0); ctx.lineTo(fx + (r() - 0.5) * 3, TILE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(TILE, fy + (r() - 0.5) * 3); ctx.stroke();
    // Moos WAECHST AUS DEN FUGEN (nicht als Kreise irgendwo)
    for (let i = 0; i < 8; i++) {
      const anFuge = r() < 0.5;
      const mx = anFuge ? fx + (r() - 0.5) * 4 : r() * TILE;
      const my = anFuge ? r() * TILE : fy + (r() - 0.5) * 4;
      const gr = 60 + r() * 40;
      ctx.fillStyle = `rgba(${(gr * 0.55) | 0},${gr | 0},${(gr * 0.4) | 0},${0.25 + r() * 0.3})`;
      ctx.beginPath(); ctx.arc(mx, my, 1 + r() * 2.4, 0, 6.283); ctx.fill();
    }
    abnutzung(ctx, r, 0.04); koernung(ctx, r, 0.07, 16);
  } },
  // 18 - Sandboden mit weichen Verwehungen
  { id: 'sand', name: 'Sandboden', zeichne(ctx, n) {
    const r = prng(n + 5);
    const g = 112 + (n % 6) * 3;
    fuege(ctx, `rgb(${g},${g - 20},${g - 48})`, 0, 0, TILE, TILE);
    for (let y = 4 + r() * 5; y < TILE; y += 7 + r() * 4) {
      ctx.fillStyle = `rgba(90,68,40,${0.08 + r() * 0.06})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 4; x <= TILE; x += 4) ctx.lineTo(x, y + Math.sin((x + n * 7) * 0.35) * 1.6);
      ctx.lineTo(TILE, y + 2.2); ctx.lineTo(0, y + 2.2); ctx.closePath(); ctx.fill();
    }
    koernung(ctx, r, 0.09, 30);
  } },
  // 19 - Blutboden (dunkler Stein, eingetrocknete Lachen + Spritzer - Kerker)
  { id: 'blut', name: 'Blutboden', zeichne(ctx, n) {
    const r = prng(n + 17);
    const g = 42 + (n % 5) * 2;
    fuege(ctx, `rgb(${g},${g - 6},${g - 9})`, 0, 0, TILE, TILE);
    const fx = 10 + Math.floor(r() * 12);
    ctx.strokeStyle = 'rgba(10,8,6,0.4)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(fx, 0); ctx.lineTo(fx + (r() - 0.5) * 3, TILE); ctx.stroke();
    // eingetrocknete Lache: dunkler Rand, Kern etwas heller
    if (r() < 0.75) {
      const cx = r() * TILE, cy = r() * TILE, rad = 4 + r() * 6;
      ctx.fillStyle = 'rgba(70,10,10,0.55)';
      ctx.beginPath(); ctx.ellipse(cx, cy, rad, rad * 0.7, r() * 3, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(110,16,14,0.4)';
      ctx.beginPath(); ctx.ellipse(cx, cy, rad * 0.6, rad * 0.42, r() * 3, 0, 6.283); ctx.fill();
    }
    for (let i = 0; i < 5; i++) { ctx.fillStyle = `rgba(${(90 + r() * 40) | 0},12,10,${0.3 + r() * 0.3})`; ctx.fillRect(r() * TILE, r() * TILE, 1 + r() * 1.4, 1); }
    koernung(ctx, r, 0.07, 16);
  } },
  // 20 - Gebeinboden (Knochen + Schaedel im Staub - Beinhaus)
  { id: 'gebein', name: 'Gebeinboden', zeichne(ctx, n) {
    const r = prng(n + 19);
    const g = 50 + (n % 5) * 2;
    fuege(ctx, `rgb(${g - 2},${g - 3},${g - 8})`, 0, 0, TILE, TILE);
    // Langknochen (Strich mit zwei Endknubbeln)
    for (let i = 0; i < 2 + Math.floor(r() * 2); i++) {
      const x = r() * 24 + 4, y = r() * 24 + 4, a = r() * 6.283, len = 6 + r() * 5;
      const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
      ctx.strokeStyle = 'rgba(216,208,186,0.75)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = 'rgba(216,208,186,0.75)';
      for (const [px, py] of [[x, y], [ex, ey]]) { ctx.beginPath(); ctx.arc(px, py, 1.5, 0, 6.283); ctx.fill(); }
    }
    // gelegentlich ein kleiner Schaedel
    if (r() < 0.4) {
      const sx = r() * 22 + 5, sy = r() * 22 + 5;
      ctx.fillStyle = 'rgba(220,212,190,0.85)';
      ctx.beginPath(); ctx.arc(sx, sy, 3, 0, 6.283); ctx.fill();
      ctx.fillRect(sx - 2, sy + 2, 4, 2);
      ctx.fillStyle = 'rgba(20,16,12,0.9)';
      ctx.fillRect(sx - 1.6, sy - 1, 1.2, 1.4); ctx.fillRect(sx + 0.5, sy - 1, 1.2, 1.4);
    }
    koernung(ctx, r, 0.08, 20);
  } },
];

export const BODEN_STIL_IDS = BODEN_STILE.map((s) => s.id);

// Globale Dämpfung (R127b, Autor: "zu hell/zu bunt - so farbig sind die in echt
// nicht"). Entsättigt Richtung Grau und dunkelt leicht ab, damit alle Böden nach
// echtem, staubigem Stein aussehen statt nach Buntmuster. EIN Regler je Wert.
const SAETTIGUNG = 0.6;   // 1 = voll, 0 = grau -> 0.6 nimmt ~40% Farbe raus
const HELLIGKEIT = 0.86;  // <1 dunkelt ab
function daempfe(ctx: Ctx): void {
  const img = ctx.getImageData(0, 0, TILE, TILE);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
    d[i] = (lum + (d[i] - lum) * SAETTIGUNG) * HELLIGKEIT;
    d[i + 1] = (lum + (d[i + 1] - lum) * SAETTIGUNG) * HELLIGKEIT;
    d[i + 2] = (lum + (d[i + 2] - lum) * SAETTIGUNG) * HELLIGKEIT;
  }
  ctx.putImageData(img, 0, 0);
}

// Lazy-Bake: eine Textur je (Stil, Variante 0..6) in den Szenen-Cache.
export function bodenStilTextur(scene: { textures: { exists: (k: string) => boolean; addCanvas: (k: string, c: HTMLCanvasElement) => void } }, stilId: string, variant: number): string {
  const key = `boden_${stilId}_${variant}`;
  if (scene.textures.exists(key)) return key;
  const stil = BODEN_STILE.find((s) => s.id === stilId) ?? BODEN_STILE[0];
  const cv = document.createElement('canvas'); cv.width = TILE; cv.height = TILE;
  const ctx = cv.getContext('2d')!;
  stil.zeichne(ctx, variant);
  daempfe(ctx);
  scene.textures.addCanvas(key, cv);
  return key;
}
