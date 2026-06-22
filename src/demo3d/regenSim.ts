// Regen- & Pfützen-Effekt (Runde 60) - reines 2D-Canvas, KEIN fremder Code,
// keine Lizenz-Falle (das angefragte Three.js/GPL-Demo war nur Inspiration).
// Lebt eigenständig auf regen.html und ist 1:1 in eine Phaser-Szene überführbar
// (Offscreen-Canvas als Textur ODER direkt im Render-Loop).
//
// Bausteine: nasses Kopfsteinpflaster (gebackene Kachel) · organische Pfützen
// (weiche Alpha-Maske aus überlappenden Ellipsen) mit Himmel-/Laternen-Spiegelung
// · Regen mit Tiefenstaffelung (nah = lang/schnell/hell) · Tropfen-Ringe IN den
// Pfützen, Spritzer-Krönchen + hüpfende Tropfen auf dem Stein · Blitz · Vignette.

// ---------- Palette (alle Stimmungswerte hier, leicht zu drehen) ----------
const HIMMEL = '#0b0f16';                 // kalter Nachthimmel (Grundton/Spiegelung oben)
const STEIN = '#191b20', STEIN_HELL = '#23262d', MOERTEL = '#0b0c0f';
const PFUETZE_OBEN = '#212e3c', PFUETZE_UNTEN = '#070a0f', PFUETZE_RAND = '#4a5666';
const LATERNE = [255, 176, 92] as const;  // warmes Laternenlicht (RGB)
const REGEN = '200,214,230';              // Tropfenfarbe (rgba-Basis)

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d')!;
let W = 0, H = 0, DPR = 1;
function passeGroesse(): void {
  DPR = Math.min(2, devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  view.width = W * DPR; view.height = H * DPR;
  view.style.width = W + 'px'; view.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
passeGroesse();
addEventListener('resize', () => { passeGroesse(); baueWelt(); });

// ---------- nasses Pflaster als gebackene, kachelbare Textur ----------
function macheBoden(ts = 128): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = ts;
  const g = c.getContext('2d')!;
  g.fillStyle = STEIN; g.fillRect(0, 0, ts, ts);
  const sp = ts / 4;
  for (let ry = 0; ry < 4; ry++) for (let rx = 0; rx < 4; rx++) {
    const versatz = (ry % 2) * sp / 2;
    const x = rx * sp - versatz, y = ry * sp;
    const ton = 0.8 + Math.random() * 0.5;
    g.fillStyle = mische(STEIN, STEIN_HELL, Math.random() * 0.5);
    g.fillRect(x + 1.5, y + 1.5, sp - 3, sp - 3);
    // nasser Glanz oben links auf jedem Stein
    const gg = g.createLinearGradient(x, y, x, y + sp);
    gg.addColorStop(0, `rgba(70,80,96,${0.18 * ton})`); gg.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.fillStyle = gg; g.fillRect(x + 1.5, y + 1.5, sp - 3, sp - 3);
    // Mörtelfuge
    g.strokeStyle = MOERTEL; g.lineWidth = 2; g.strokeRect(x + 1.5, y + 1.5, sp - 3, sp - 3);
  }
  // feiner Sprenkel + großflächiger Nass-Schimmer
  for (let i = 0; i < 120; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '10,11,14' : '60,68,82'},${Math.random() * 0.25})`;
    g.fillRect(Math.random() * ts, Math.random() * ts, 1.5, 1.5);
  }
  return c;
}

// zwei Hex-Farben mischen (t=0..1)
function mische(a: string, b: string, t: number): string {
  const pa = hex(a), pb = hex(b);
  return `rgb(${Math.round(pa[0] + (pb[0] - pa[0]) * t)},${Math.round(pa[1] + (pb[1] - pa[1]) * t)},${Math.round(pa[2] + (pb[2] - pa[2]) * t)})`;
}
function hex(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ---------- Pfützen ----------
interface Pfuetze { x: number; y: number; w: number; h: number; maske: HTMLCanvasElement; }
function machePfuetze(x: number, y: number, w: number, h: number): Pfuetze {
  const m = document.createElement('canvas'); m.width = w; m.height = h;
  const mc = m.getContext('2d')!;
  mc.filter = `blur(${Math.max(w, h) * 0.05}px)`; mc.fillStyle = '#fff';
  const n = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const ex = w * (0.32 + Math.random() * 0.36), ey = h * (0.36 + Math.random() * 0.28);
    const erx = w * (0.16 + Math.random() * 0.18), ery = h * (0.14 + Math.random() * 0.16);
    mc.beginPath(); mc.ellipse(ex, ey, erx, ery, 0, 0, Math.PI * 2); mc.fill();
  }
  return { x, y, w, h, maske: m };
}

// ---------- Welt ----------
let boden = macheBoden();
let bodenMuster: CanvasPattern | null = null;
let pfuetzen: Pfuetze[] = [];
const puddleBuf = document.createElement('canvas');
const pbx = puddleBuf.getContext('2d')!;

function baueWelt(): void {
  bodenMuster = ctx.createPattern(boden, 'repeat');
  pfuetzen = [];
  const ziel = Math.round((W * H) / 90000);                  // Dichte ~ Bildfläche
  for (let i = 0; i < ziel; i++) {
    const w = 140 + Math.random() * 260, h = w * (0.42 + Math.random() * 0.22);
    pfuetzen.push(machePfuetze(Math.random() * (W - w), Math.random() * (H - h), w, h));
  }
  puddleBuf.width = Math.max(2, Math.ceil(Math.max(...pfuetzen.map((p) => p.w), 2)));
  puddleBuf.height = Math.max(2, Math.ceil(Math.max(...pfuetzen.map((p) => p.h), 2)));
}
baueWelt();

// ---------- Tropfen / Ringe / Spritzer ----------
interface Drop { x: number; y: number; z: number; vy: number; len: number; }
interface Ring { x: number; y: number; t: number; leben: number; r0: number; rmax: number; pf: Pfuetze | null; }
interface Spritz { x: number; y: number; vx: number; vy: number; t: number; leben: number; }
const drops: Drop[] = [];
const ringe: Ring[] = [];
const spritzer: Spritz[] = [];
const WIND = 0.20;                                            // seitliche Neigung des Regens

function neuerTropfen(initial = false): Drop {
  const z = Math.random();                                    // 0 fern … 1 nah
  return { x: Math.random() * (W + 200) - 100, y: initial ? Math.random() * H : -20 - Math.random() * 60,
    z, vy: 620 + z * 980, len: 9 + z * 26 };
}
for (let i = 0; i < 520; i++) drops.push(neuerTropfen(true));

function pfuetzeUnter(x: number, y: number): Pfuetze | null {
  for (const p of pfuetzen) {
    if (x < p.x || y < p.y || x > p.x + p.w || y > p.y + p.h) continue;
    // grobe Ellipsen-Mitgliedschaft (reicht fürs Einschlag-Ziel)
    const nx = (x - p.x - p.w / 2) / (p.w * 0.42), ny = (y - p.y - p.h / 2) / (p.h * 0.42);
    if (nx * nx + ny * ny <= 1) return p;
  }
  return null;
}

function einschlag(x: number, y: number, wucht: number): void {
  const pf = pfuetzeUnter(x, y);
  if (pf) {
    ringe.push({ x, y, t: 0, leben: 1.1 + Math.random() * 0.5, r0: 1, rmax: (18 + Math.random() * 26) * wucht, pf });
    if (Math.random() < 0.5) ringe.push({ x, y, t: -0.12, leben: 1.0, r0: 1, rmax: (10 + Math.random() * 14) * wucht, pf });
  } else {
    // Spritzer-Krönchen auf dem Stein
    ringe.push({ x, y, t: 0, leben: 0.34, r0: 1, rmax: 7 * wucht, pf: null });
    const n = 3 + Math.floor(Math.random() * 3 * wucht);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.7;
      const s = (60 + Math.random() * 90) * wucht;
      spritzer.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, leben: 0.28 + Math.random() * 0.18 });
    }
  }
}

// ---------- Laterne (Maus oder sanfte Drift) + Blitz ----------
let latX = W * 0.5, latY = H * 0.35, mausAktiv = false;
addEventListener('pointermove', (e) => { latX = e.clientX; latY = e.clientY; mausAktiv = true; });
addEventListener('pointerdown', (e) => { for (let i = 0; i < 5; i++) einschlag(e.clientX, e.clientY, 2.2); });
let blitz = 0, blitzCd = 4 + Math.random() * 6;

// ---------- Schleife ----------
let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!mausAktiv) { latX = W * (0.5 + 0.32 * Math.sin(now / 4200)); latY = H * (0.34 + 0.12 * Math.sin(now / 2600)); }
  blitzCd -= dt; if (blitzCd <= 0) { blitz = 1; blitzCd = 5 + Math.random() * 8; }
  blitz = Math.max(0, blitz - dt * 2.6);
  const blitzHell = blitz > 0.05 ? (0.6 + 0.4 * Math.sin(now / 18)) * blitz : 0;

  // 1) Boden
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = bodenMuster ?? STEIN; ctx.fillRect(0, 0, W, H);
  // großflächiger Nass-Glanz quer übers Pflaster (bewegt sich kaum -> "nass")
  const sheen = ctx.createLinearGradient(0, 0, W, H);
  sheen.addColorStop(0, 'rgba(40,48,60,0.0)'); sheen.addColorStop(0.5, `rgba(70,82,100,${0.10 + blitzHell * 0.3})`); sheen.addColorStop(1, 'rgba(20,24,30,0.0)');
  ctx.fillStyle = sheen; ctx.fillRect(0, 0, W, H);

  // 2) Pfützen (Spiegelung + Ringe), jeweils in den Buffer gezeichnet und maskiert
  for (const p of pfuetzen) {
    pbx.setTransform(1, 0, 0, 1, 0, 0); pbx.clearRect(0, 0, puddleBuf.width, puddleBuf.height);
    // Grund: vertikaler Verlauf (oben Himmel, unten tief)
    const gg = pbx.createLinearGradient(0, 0, 0, p.h);
    gg.addColorStop(0, PFUETZE_OBEN); gg.addColorStop(1, PFUETZE_UNTEN);
    pbx.fillStyle = gg; pbx.fillRect(0, 0, p.w, p.h);
    // Himmel-Aufhellung oben + Blitz
    pbx.fillStyle = `rgba(120,140,168,${0.10 + blitzHell * 0.5})`; pbx.fillRect(0, 0, p.w, p.h * 0.5);
    // Laternen-Spiegelung: senkrechter, warmer Streifen unter der Laterne
    const lokalX = latX - p.x;
    if (lokalX > -p.w * 0.3 && lokalX < p.w * 1.3) {
      const rg = pbx.createRadialGradient(lokalX, p.h * 0.5, 2, lokalX, p.h * 0.5, p.h * 0.9);
      rg.addColorStop(0, `rgba(${LATERNE[0]},${LATERNE[1]},${LATERNE[2]},0.85)`); rg.addColorStop(0.5, `rgba(${LATERNE[0]},${LATERNE[1]},${LATERNE[2]},0.3)`); rg.addColorStop(1, 'rgba(0,0,0,0)');
      pbx.fillStyle = rg; pbx.save();
      pbx.translate(lokalX, p.h * 0.5); pbx.scale(0.32, 1.8); pbx.translate(-lokalX, -p.h * 0.5);
      pbx.fillRect(0, 0, p.w, p.h); pbx.restore();
    }
    // Ringe dieser Pfütze (lokale Koordinaten)
    for (const r of ringe) {
      if (r.pf !== p || r.t < 0) continue;
      const f = r.t / r.leben, rad = r.r0 + (r.rmax - r.r0) * f;
      const a = (1 - f) * 0.5;
      pbx.strokeStyle = `rgba(190,206,224,${a})`; pbx.lineWidth = 1.4;
      pbx.beginPath(); pbx.ellipse(r.x - p.x, r.y - p.y, rad, rad * 0.5, 0, 0, Math.PI * 2); pbx.stroke();
      pbx.strokeStyle = `rgba(20,28,38,${a * 0.7})`;
      pbx.beginPath(); pbx.ellipse(r.x - p.x, r.y - p.y, rad + 1.6, (rad + 1.6) * 0.5, 0, 0, Math.PI * 2); pbx.stroke();
    }
    // heller Wasser-Rand
    pbx.strokeStyle = PFUETZE_RAND; pbx.lineWidth = 1.2;
    // auf Pfützenform maskieren
    pbx.globalCompositeOperation = 'destination-in'; pbx.drawImage(p.maske, 0, 0);
    pbx.globalCompositeOperation = 'source-over';
    ctx.drawImage(puddleBuf, 0, 0, p.w, p.h, p.x, p.y, p.w, p.h);
    // weicher Rand-Schein um die Pfütze (Nässe greift auf den Stein über)
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.10;
    ctx.drawImage(p.maske, p.x - 2, p.y - 2, p.w + 4, p.h + 4); ctx.restore();
  }

  // 3) Regen
  ctx.lineCap = 'round';
  for (const d of drops) {
    d.y += d.vy * dt; d.x += d.vy * dt * WIND;
    if (d.y > H) { einschlag(d.x, H - 2 + Math.random() * 4, 0.6 + d.z * 0.8); Object.assign(d, neuerTropfen()); continue; }
    const a = 0.10 + d.z * 0.34;
    ctx.strokeStyle = `rgba(${REGEN},${a})`; ctx.lineWidth = 0.6 + d.z * 1.4;
    ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * WIND, d.y - d.len); ctx.stroke();
  }

  // 4) Spritzer auf dem Stein
  for (let i = spritzer.length - 1; i >= 0; i--) {
    const s = spritzer[i]; s.t += dt; if (s.t > s.leben) { spritzer.splice(i, 1); continue; }
    s.vy += 520 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
    ctx.fillStyle = `rgba(${REGEN},${(1 - s.t / s.leben) * 0.6})`;
    ctx.fillRect(s.x, s.y, 1.6, 1.6);
  }

  // 5) Ringe altern lassen (Stein-Krönchen werden direkt hier gezeichnet)
  for (let i = ringe.length - 1; i >= 0; i--) {
    const r = ringe[i]; r.t += dt; if (r.t > r.leben) { ringe.splice(i, 1); continue; }
    if (!r.pf && r.t > 0) {
      const f = r.t / r.leben, rad = r.r0 + (r.rmax - r.r0) * f;
      ctx.strokeStyle = `rgba(${REGEN},${(1 - f) * 0.5})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, rad, Math.PI, Math.PI * 2); ctx.stroke();
    }
  }

  // 6) Laternen-Schein (additiv) in der Luft
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const flack = 0.85 + Math.sin(now / 70) * 0.08 + Math.sin(now / 23) * 0.05;
  const lg = ctx.createRadialGradient(latX, latY, 4, latX, latY, 230);
  lg.addColorStop(0, `rgba(${LATERNE[0]},${LATERNE[1]},${LATERNE[2]},${0.5 * flack})`);
  lg.addColorStop(0.4, `rgba(${LATERNE[0]},${LATERNE[1]},${LATERNE[2]},0.14)`); lg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lg; ctx.fillRect(latX - 240, latY - 240, 480, 480);
  ctx.restore();

  // 7) Blitz-Aufhellung des ganzen Bildes
  if (blitzHell > 0) { ctx.fillStyle = `rgba(150,170,200,${blitzHell * 0.22})`; ctx.fillRect(0, 0, W, H); }

  // 8) Vignette + kalter Grundschleier
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(3,5,9,0.72)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = `${HIMMEL}22`; ctx.fillRect(0, 0, W, H);

  (window as unknown as { __regenBereit?: boolean }).__regenBereit = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
