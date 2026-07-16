// WAND-STILE (R138b, Autorwunsch: "10 verschiedene Waende live in der
// Dev-Konsole testen"). 10 prozedurale Dungeon-/Gebaeude-Waende, die es im
// echten Spaetmittelalter (1349) so gab: Bruchstein, Sandstein-Quader,
// Feldstein, Backstein, Kalkputz, Fachwerk, Holzbohlen, Schiefer,
// Granitquader - und die Beinhaus-Wand (Ossuarien wie Sedlec: Knochenlagen).
// Gezeichnet wird die STIRNSEITE (TILE breit, H hoch, H = Wandhoehen-Regler)
// plus eine passende KRONE (Stein-Oberseite, TILE x TILE). Gleiche dunkle
// Deckkante + Lichtkante wie die Standard-Krypta-Wand, damit der Anschluss
// an Kronen/Schatten stimmt.

const TILE = 32;
type Ctx = CanvasRenderingContext2D;

export interface WandStil {
  id: string;
  name: string;
  deck: [number, number, number];                    // Grundton der Krone (Oberseite)
  front: (ctx: Ctx, n: number, H: number) => void;   // Stirnseite (ohne Deckkante)
}

function prng(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}
const voll = (ctx: Ctx, c: string, x: number, y: number, w: number, h: number): void => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

// Steinquader mit gemeisselten Kanten (Licht oben-links, Schatten unten-rechts)
function quaderBlock(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, g: number, b: number): void {
  ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,245,220,0.10)';
  ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y, 1, h);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x + w - 1, y, 1, h);
}

export const WAND_STILE: WandStil[] = [
  // 1 - Bruchsteinmauerwerk: unregelmaessige Steine in dickem Moertelbett
  { id: 'bruchstein', name: 'Bruchstein', deck: [72, 66, 58], front(ctx, n, H) {
    const r = prng(n + 3);
    voll(ctx, '#2a241c', 0, 0, TILE, H);                       // Moertel
    for (let y = 0; y < H; ) {
      const zh = 5 + Math.floor(r() * 4);
      for (let x = 0; x < TILE; ) {
        const zw = 6 + Math.floor(r() * 8);
        const g = 78 + r() * 30;
        ctx.fillStyle = `rgb(${(g + r() * 8) | 0},${(g - 4) | 0},${(g - 12) | 0})`;
        ctx.beginPath();
        ctx.moveTo(x + 1 + r(), y + 1);
        ctx.lineTo(x + zw - 1 - r() * 2, y + 1 + r());
        ctx.lineTo(x + zw - 1, y + zh - 1 - r());
        ctx.lineTo(x + 1 + r() * 2, y + zh - 1);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,240,210,0.07)';
        ctx.fillRect(x + 2, y + 1, zw - 4, 1);
        x += zw;
      }
      y += zh;
    }
  } },
  // 2 - Sandstein-Quader (Werkstein): grosse warme Bloecke im Laeuferverband
  { id: 'quader', name: 'Sandstein-Quader', deck: [96, 78, 54], front(ctx, n, H) {
    const r = prng(n + 7);
    voll(ctx, '#241a10', 0, 0, TILE, H);
    for (let y = 0, reihe = 0; y < H; y += 8, reihe++) {
      const off = ((reihe + n) % 2) * 8;
      for (let x = -off; x < TILE; x += 16) {
        const g = 118 + r() * 22;
        quaderBlock(ctx, x + 1, y + 1, 14, 6, g, g - 26, g - 56);
        // Sediment-Schichtung im Block
        ctx.fillStyle = 'rgba(90,62,30,0.18)';
        ctx.fillRect(x + 2, y + 3 + r() * 2, 12, 1);
      }
    }
  } },
  // 3 - Feldstein: runde Findlinge in Moertel (Dorfmauern, Fundamente)
  { id: 'feldstein', name: 'Feldstein', deck: [70, 68, 62], front(ctx, n, H) {
    const r = prng(n + 11);
    voll(ctx, '#2c261e', 0, 0, TILE, H);
    for (let gy = 0; gy < Math.ceil(H / 8); gy++) for (let gx = 0; gx < 4; gx++) {
      const cx = gx * 8 + 4 + (gy % 2) * 3 + (r() - 0.5) * 2;
      const cy = gy * 8 + 4 + (r() - 0.5) * 2;
      const rad = 3.4 + r() * 1.8, warm = r() * 14;
      const g = 76 + r() * 34;
      ctx.fillStyle = `rgb(${(g + warm) | 0},${g | 0},${(g - warm * 0.5) | 0})`;
      ctx.beginPath(); ctx.ellipse(cx, cy, rad, rad * (0.75 + r() * 0.3), r() * 3, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,245,215,0.10)';
      ctx.beginPath(); ctx.ellipse(cx - 0.6, cy - 1.1, rad * 0.5, rad * 0.28, 0, 0, 6.283); ctx.fill();
    }
  } },
  // 4 - Backstein (Klosterformat): schmale rote Ziegel im Laeuferverband
  { id: 'backstein', name: 'Backstein', deck: [96, 48, 34], front(ctx, n, H) {
    const r = prng(n + 13);
    voll(ctx, '#241612', 0, 0, TILE, H);
    for (let y = 0, reihe = 0; y < H; y += 4, reihe++) {
      const off = ((reihe + n) % 2) * 4;
      for (let x = -off; x < TILE; x += 8) {
        const g = 108 + r() * 34;
        ctx.fillStyle = `rgb(${g | 0},${(g * 0.45) | 0},${(g * 0.3) | 0})`;
        ctx.fillRect(x + 0.5, y + 0.5, 7, 3);
        if (r() < 0.18) { ctx.fillStyle = 'rgba(30,20,14,0.5)'; ctx.fillRect(x + 1 + r() * 5, y + 1, 1.6, 1.6); }  // Brandflecken
      }
    }
    ctx.fillStyle = 'rgba(255,235,205,0.04)';
    ctx.fillRect(0, 0, TILE, H);
  } },
  // 5 - Kalkputz: geweisste Wand, unten abgeplatzt (Stein schaut durch)
  { id: 'kalkputz', name: 'Kalkputz', deck: [104, 100, 90], front(ctx, n, H) {
    const r = prng(n + 17);
    const g = 136 + (n % 5) * 4;
    voll(ctx, `rgb(${g},${g - 6},${g - 18})`, 0, 0, TILE, H);
    for (let i = 0; i < 5; i++) {                              // Wolken/Feuchte
      ctx.fillStyle = `rgba(96,90,76,${0.05 + r() * 0.06})`;
      ctx.beginPath(); ctx.ellipse(r() * TILE, r() * H, 6 + r() * 8, 4 + r() * 6, r() * 3, 0, 6.283); ctx.fill();
    }
    // abgeplatzte Stellen unten: rohes Bruchstein-Fleckwerk
    const platzer = 1 + Math.floor(r() * 3);
    for (let i = 0; i < platzer; i++) {
      const px = r() * 24, py = H - 8 - r() * 8, pw = 5 + r() * 9, ph = 4 + r() * 5;
      ctx.fillStyle = '#2c241a';
      ctx.beginPath(); ctx.ellipse(px + pw / 2, py + ph / 2, pw / 2, ph / 2, r(), 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgb(${(84 + r() * 22) | 0},${(78 + r() * 18) | 0},66)`;
      ctx.beginPath(); ctx.ellipse(px + pw / 2, py + ph / 2, pw / 2.6, ph / 2.6, r(), 0, 6.283); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(70,62,50,0.25)'; ctx.lineWidth = 0.8;   // Haar-Risse
    ctx.beginPath();
    let x = r() * TILE, y = 0; ctx.moveTo(x, y);
    while (y < H * 0.7) { y += 3 + r() * 5; x += (r() - 0.5) * 6; ctx.lineTo(x, y); }
    ctx.stroke();
  } },
  // 6 - Fachwerk: dunkle Eichenbalken ueber Lehmgefach
  { id: 'fachwerk', name: 'Fachwerk', deck: [66, 52, 36], front(ctx, n, H) {
    const r = prng(n + 19);
    const g = 118 + (n % 5) * 4;                               // Lehmgefach
    voll(ctx, `rgb(${g},${g - 22},${g - 46})`, 0, 0, TILE, H);
    for (let i = 0; i < 12; i++) { ctx.fillStyle = `rgba(70,52,30,${0.06 + r() * 0.06})`; ctx.fillRect(r() * TILE, r() * H, 1 + r() * 2, 1); }  // Strohhaecksel
    const balken = (x: number, y: number, w: number, h: number): void => {
      ctx.fillStyle = '#332412'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(120,90,50,0.30)'; ctx.fillRect(x, y, w, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, y + h - 1, w, 1);
    };
    balken(0, 0, TILE, 3);                                     // Rähm oben
    balken(0, H - 4, TILE, 4);                                 // Schwelle unten
    balken(0, 0, 3, H); balken(TILE - 3, 0, 3, H);             // Staender
    // Diagonalstrebe je Variante links/rechts
    ctx.save();
    ctx.translate(TILE / 2, H / 2); ctx.rotate((n % 2 === 0 ? 1 : -1) * Math.atan2(H - 6, TILE - 6));
    balken(-Math.hypot(TILE, H) / 2, -1.5, Math.hypot(TILE, H), 3);
    ctx.restore();
  } },
  // 7 - Holzbohlen: senkrechte dunkle Bohlenwand (Bergwerk, Palisadenbau)
  { id: 'holzbohlen', name: 'Holzbohlen', deck: [58, 44, 26], front(ctx, n, H) {
    const r = prng(n + 23);
    voll(ctx, '#160e06', 0, 0, TILE, H);
    for (let x = 0; x < TILE; x += 8) {
      const c = 76 + r() * 26;
      ctx.fillStyle = `rgb(${c | 0},${(c * 0.62) | 0},${(c * 0.34) | 0})`;
      ctx.fillRect(x + 1, 0, 6, H);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {                            // Maserung
        ctx.beginPath();
        let px = x + 2 + r() * 4; ctx.moveTo(px, 0);
        for (let y = 5; y <= H; y += 6) { px += (r() - 0.5) * 1.4; ctx.lineTo(px, y); }
        ctx.stroke();
      }
      if (r() < 0.4) { ctx.fillStyle = 'rgba(16,10,4,0.7)'; ctx.beginPath(); ctx.arc(x + 4, r() * H, 1, 0, 6.283); ctx.fill(); }
    }
    // Eisenband quer mit Nietkoepfen
    const by = 4 + r() * (H - 10);
    ctx.fillStyle = '#3a3a40'; ctx.fillRect(0, by, TILE, 2.4);
    ctx.fillStyle = '#606068';
    for (let x = 3; x < TILE; x += 8) ctx.fillRect(x, by + 0.6, 1.4, 1.2);
  } },
  // 8 - Schiefer: duenne, dunkle Schichten (Trockenmauer)
  { id: 'schieferwand', name: 'Schiefer-Schichten', deck: [44, 48, 56], front(ctx, n, H) {
    const r = prng(n + 29);
    voll(ctx, '#14161c', 0, 0, TILE, H);
    for (let y = 0; y < H; ) {
      const zh = 2 + Math.floor(r() * 2.4);
      for (let x = 0; x < TILE; ) {
        const zw = 8 + Math.floor(r() * 10);
        const g = 42 + r() * 22;
        ctx.fillStyle = `rgb(${g | 0},${(g + 3) | 0},${(g + 9) | 0})`;
        ctx.fillRect(x + 0.5, y + 0.5, zw - 1, zh - 0.5);
        if (r() < 0.4) { ctx.fillStyle = 'rgba(150,165,190,0.10)'; ctx.fillRect(x + 1, y + 0.5, zw - 2, 1); }
        x += zw;
      }
      y += zh;
    }
  } },
  // 9 - Granitquader: grobe, kalte Bloecke (Zyklopenmauer, Fundamente)
  { id: 'granitquader', name: 'Granitquader', deck: [58, 58, 60], front(ctx, n, H) {
    const r = prng(n + 31);
    voll(ctx, '#17171a', 0, 0, TILE, H);
    for (let y = 0, reihe = 0; y < H; y += 11, reihe++) {
      const off = ((reihe + n) % 2) * 8;
      for (let x = -off; x < TILE; x += 16) {
        const g = 66 + r() * 16;
        quaderBlock(ctx, x + 1, y + 1, 14, 9, g, g - 1, g + 2);
        for (let i = 0; i < 10; i++) {                        // Granit-Sprenkel
          const w = r();
          ctx.fillStyle = w < 0.5 ? 'rgba(28,27,26,0.3)' : 'rgba(150,148,140,0.18)';
          ctx.fillRect(x + 2 + r() * 12, y + 2 + r() * 7, 1, 1);
        }
      }
    }
  } },
  // 10 - Beinhaus-Wand: geschichtete Knochenlagen + Schaedelreihen (Ossuar)
  { id: 'beinhaus', name: 'Beinhaus (Knochenlagen)', deck: [56, 52, 44], front(ctx, n, H) {
    const r = prng(n + 37);
    voll(ctx, '#181410', 0, 0, TILE, H);
    for (let y = 3; y < H; y += 6) {
      // eine Lage Langknochen quer (Roehren mit Endknubbeln)
      for (let x = -2; x < TILE; x += 7 + Math.floor(r() * 3)) {
        const kb = 210 + r() * 20, len = 6 + r() * 3, ky = y + (r() - 0.5) * 1.6;
        ctx.strokeStyle = `rgba(${kb | 0},${(kb - 12) | 0},${(kb - 34) | 0},0.85)`;
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(x, ky); ctx.lineTo(x + len, ky); ctx.stroke();
        ctx.fillStyle = `rgba(${kb | 0},${(kb - 12) | 0},${(kb - 34) | 0},0.85)`;
        ctx.beginPath(); ctx.arc(x, ky, 1.3, 0, 6.283); ctx.fill();
        ctx.beginPath(); ctx.arc(x + len, ky, 1.3, 0, 6.283); ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, y + 2.4, TILE, 1);   // Schattenfuge
    }
    // Schaedelreihe: je Variante an anderer Hoehe, mit Augenhoehlen
    const sy = 4 + (n % 3) * Math.max(6, Math.floor(H / 3.4));
    for (let x = 4; x < TILE; x += 9) {
      ctx.fillStyle = 'rgba(222,214,192,0.95)';
      ctx.beginPath(); ctx.arc(x + (r() - 0.5) * 1.5, sy, 3.1, 0, 6.283); ctx.fill();
      ctx.fillRect(x - 2, sy + 2.2, 4.4, 2);
      ctx.fillStyle = 'rgba(14,10,8,0.95)';
      ctx.fillRect(x - 1.9, sy - 1, 1.3, 1.6); ctx.fillRect(x + 0.7, sy - 1, 1.3, 1.6);
    }
  } },
];

export const WAND_STIL_IDS = WAND_STILE.map((s) => s.id);

interface SzeneMitTexturen { textures: { exists: (k: string) => boolean; addCanvas: (k: string, c: HTMLCanvasElement) => void } }

// Stirnseite (hohe Wand): TILE x H, mit derselben Deckkante/Lichtkante wie die
// Standard-Krypta-Wand (Anschluss an Krone + Wandschatten bleibt stimmig).
export function wandStilFrontTextur(scene: SzeneMitTexturen, stilId: string, variant: number, H: number): string {
  const key = `wand_${stilId}_${variant}_${H}`;
  if (scene.textures.exists(key)) return key;
  const stil = WAND_STILE.find((s) => s.id === stilId) ?? WAND_STILE[0];
  const cv = document.createElement('canvas'); cv.width = TILE; cv.height = H;
  const ctx = cv.getContext('2d')!;
  stil.front(ctx, variant, H);
  ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, 3, TILE, 1);   // Lichtkante unter der Krone
  const [dr, dg, db] = stil.deck;
  ctx.fillStyle = `rgb(${Math.round(dr * 0.5)},${Math.round(dg * 0.5)},${Math.round(db * 0.5)})`;
  ctx.fillRect(0, 0, TILE, 3);                                             // dunkle Deckkante oben
  scene.textures.addCanvas(key, cv);
  return key;
}

// Stein-Oberseite (Krone) im Grundton des Stils, leicht abgedunkelt.
export function wandStilKroneTextur(scene: SzeneMitTexturen, stilId: string, variant: number): string {
  const key = `wandkrone_${stilId}_${variant % 4}`;
  if (scene.textures.exists(key)) return key;
  const stil = WAND_STILE.find((s) => s.id === stilId) ?? WAND_STILE[0];
  const cv = document.createElement('canvas'); cv.width = cv.height = TILE;
  const ctx = cv.getContext('2d')!;
  const [r, g, b] = stil.deck.map((c) => Math.round(c * 0.72));
  ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(0, 0, TILE, TILE);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';                                      // Plattenfugen (dezent)
  ctx.fillRect(0, (variant % 2) ? 15 : 9, TILE, 1);
  ctx.fillRect((variant % 2) * 10 + 9, 0, 1, TILE);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(0, 0, TILE, 1); ctx.fillRect(0, 0, 1, TILE);
  scene.textures.addCanvas(key, cv);
  return key;
}
