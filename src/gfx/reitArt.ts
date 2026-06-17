// Galoppierendes Pferd mit Reiter (Runde 51, Autorfrage "ordentliche Reit-
// Animation?"). SEITENANSICHT (nach rechts), eigener Galopp-Zyklus statt des
// generischen Vierbeiners: vier Beine mit Stand-/Schwung-Phase, kurze Schwebe,
// wehende Mähne und Schweif, ein mitschwingender Reiter. Gezeichnet in ~64x48,
// drr Aufrufer skaliert hoch / spiegelt für die Gegenrichtung.

type Ctx = CanvasRenderingContext2D;

// Fuß-Position eines Beins im Zyklus c (0..1) mit Phasen-Versatz.
function beinFuss(hipX: number, groundY: number, phase: number, c: number, reach: number, lift: number): { x: number; y: number } {
  const ph = (c - phase + 1) % 1;
  if (ph < 0.5) { // Standphase: Huf am Boden, wandert nach hinten
    const k = ph / 0.5;
    return { x: hipX + reach * (1 - 2 * k), y: groundY };
  }
  const k = (ph - 0.5) / 0.5; // Schwungphase: anheben, nach vorn
  return { x: hipX + reach * (-1 + 2 * k), y: groundY - Math.sin(k * Math.PI) * lift };
}

function bein(ctx: Ctx, hipX: number, hipY: number, fuss: { x: number; y: number }, farbe: string, breite: number): void {
  const kx = (hipX + fuss.x) / 2 + 2, ky = (hipY + fuss.y) / 2; // Knie leicht nach vorn
  ctx.strokeStyle = farbe; ctx.lineWidth = breite; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kx, ky); ctx.lineTo(fuss.x, fuss.y); ctx.stroke();
  ctx.fillStyle = '#1a120a'; ctx.fillRect(fuss.x - 1.4, fuss.y - 1, 2.8, 2); // Huf
}

export function drawGalopp(ctx: Ctx, frame: number): void {
  ctx.clearRect(0, 0, 64, 48);
  const FRAMES = 6;
  const c = (frame % FRAMES) / FRAMES;
  const koerper = '#6a4a2a', dunkel = '#4a3018', mähne = '#2e2012', haut = '#5a3c20';
  const groundY = 41;
  const bob = -Math.abs(Math.sin(c * Math.PI * 2)) * 2; // kurze Schwebe = Körper hebt sich
  const bx = 30, by = 24 + bob; // Körpermitte

  // Galopp-Phasen der vier Beine (Rotationsgalopp)
  const hinNah = beinFuss(20, groundY, 0.00, c, 7, 7);
  const hinFern = beinFuss(18, groundY, 0.12, c, 7, 7);
  const vorNah = beinFuss(41, groundY, 0.48, c, 7, 7);
  const vorFern = beinFuss(43, groundY, 0.58, c, 7, 7);

  // FERNE Beine zuerst (hinter dem Körper, dunkler)
  bein(ctx, 18, by + 6, hinFern, dunkel, 3);
  bein(ctx, 43, by + 6, vorFern, dunkel, 3);

  // Schweif (weht hinten, schwingt mit dem Zyklus)
  const tw = Math.sin(c * Math.PI * 2) * 3;
  ctx.strokeStyle = mähne; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(15, by - 2); ctx.quadraticCurveTo(8 + tw, by + 4, 6 + tw, by + 14); ctx.stroke();

  // Körper (länglicher Rumpf)
  ctx.fillStyle = koerper;
  ctx.beginPath(); ctx.ellipse(bx, by, 16, 8, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(255,236,196,0.10)'; ctx.beginPath(); ctx.ellipse(bx, by - 2, 15, 5, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = dunkel; ctx.beginPath(); ctx.ellipse(bx, by + 4, 15, 4, 0, 0, 6.283); ctx.fill(); // Bauchschatten

  // Hals + Kopf (rechts, nach vorn-oben)
  ctx.fillStyle = koerper;
  ctx.beginPath(); ctx.moveTo(42, by - 6); ctx.lineTo(50, by - 16); ctx.lineTo(56, by - 14); ctx.lineTo(48, by + 2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(56, by - 15, 5, 3.5, 0.5, 0, 6.283); ctx.fill(); // Kopf
  ctx.fillStyle = haut; ctx.beginPath(); ctx.moveTo(58, by - 16); ctx.lineTo(61, by - 11); ctx.lineTo(57, by - 12); ctx.closePath(); ctx.fill(); // Maul
  ctx.fillStyle = koerper; ctx.beginPath(); ctx.moveTo(53, by - 18); ctx.lineTo(55, by - 22); ctx.lineTo(57, by - 18); ctx.closePath(); ctx.fill(); // Ohr
  ctx.fillStyle = '#100a06'; ctx.fillRect(56, by - 16, 1.4, 1.4); // Auge
  // Mähne (dunkel, am Halsrücken)
  ctx.strokeStyle = mähne; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(44, by - 8); ctx.lineTo(52, by - 18); ctx.stroke();

  // REITER (sitzt mittig, lehnt nach vorn, schwingt mit)
  const rb = by - 9 + bob * 0.5;
  ctx.fillStyle = '#3a2c1c'; ctx.fillRect(27, rb + 2, 3, 6); ctx.fillRect(33, rb + 2, 3, 6); // Beine am Pferd
  ctx.fillStyle = '#6e2f2a'; ctx.beginPath(); ctx.moveTo(28, rb + 4); ctx.lineTo(37, rb - 2); ctx.lineTo(39, rb + 2); ctx.lineTo(31, rb + 8); ctx.closePath(); ctx.fill(); // Oberkörper (vorgebeugt)
  ctx.fillStyle = '#d0a884'; ctx.beginPath(); ctx.arc(38, rb - 4, 3, 0, 6.283); ctx.fill(); // Kopf
  ctx.fillStyle = '#39332c'; ctx.beginPath(); ctx.arc(38, rb - 5, 3, Math.PI, 0); ctx.fill(); // Hut/Haar
  ctx.strokeStyle = '#d0a884'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(36, rb); ctx.lineTo(46, rb - 4); ctx.stroke(); // Arm zu den Zügeln
  ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(46, rb - 4); ctx.lineTo(55, by - 13); ctx.stroke(); // Zügel zum Kopf

  // NAHE Beine (vor dem Körper, hell)
  bein(ctx, 20, by + 6, hinNah, koerper, 3.4);
  bein(ctx, 41, by + 6, vorNah, koerper, 3.4);
}
