import { REIT_PFERD, type ReitClip, type ReitGangClip, type ReitUebergangClip } from '../data/reiten';

export function naehereZahl(aktuell: number, ziel: number, schritt: number): number {
  if (aktuell < ziel) return Math.min(ziel, aktuell + schritt);
  if (aktuell > ziel) return Math.max(ziel, aktuell - schritt);
  return aktuell;
}

export function kuerzesterWinkel(von: number, nach: number): number {
  let diff = (nach - von) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export function mausLenkung(blick: number, ziel: number): number {
  return Math.max(-1, Math.min(1, kuerzesterWinkel(blick, ziel) / REIT_PFERD.mausVollausschlag));
}

export function mausZielTempo(distanz: number, winkelDiff: number): number {
  if (distanz <= REIT_PFERD.mausStoppDistanz) return 0;
  const distanzFaktor = Math.max(0, Math.min(1,
    (distanz - REIT_PFERD.mausStoppDistanz) / (REIT_PFERD.mausLangsamDistanz - REIT_PFERD.mausStoppDistanz),
  ));
  const ausrichtung = Math.max(0, Math.cos(winkelDiff));
  return REIT_PFERD.mausHoechstTempo * distanzFaktor * ausrichtung;
}

export function reitClip(tempo: number, lenkung: number): ReitClip {
  const lenkStaerke = Math.abs(lenkung);
  // Die authored Wendemanöver sind Schritt-/Pivot-Posen, keine additive
  // Kurvenlage. Bei Fahrt bleibt deshalb die echte Gangart aktiv; sonst sprang
  // jeder kleine Mausimpuls zwischen Trab/Galopp und einem langsamen Turn-Clip.
  if (Math.abs(tempo) < 2 && lenkStaerke >= REIT_PFERD.lenkTotzone) {
    const seite = lenkung < 0 ? 'left' : 'right';
    const stufe = lenkStaerke >= REIT_PFERD.wendeStarkAb ? 'strong'
      : lenkStaerke >= REIT_PFERD.wendeMittelAb ? 'medium' : 'small';
    return `turn_${stufe}_${seite}` as ReitClip;
  }
  if (tempo < -2) return 'back';
  const vorwaerts = Math.abs(tempo);
  if (vorwaerts < 4) return 'idle';
  if (vorwaerts < REIT_PFERD.schrittGrenze) return 'walk';
  if (vorwaerts < REIT_PFERD.trabGrenze) return 'trot';
  return 'gallop';
}

export function clipFrames(clip: ReitClip): number {
  if (clip === 'idle') return 4;
  if (istReitUebergang(clip)) return 6;
  if (clip.startsWith('turn_')) return 8;
  return 8;
}

// Tempo-abhaengige Hufkadenz je Gangart. Ausgelagert, damit auch die Uebergaenge
// dieselbe Kurve benutzen koennen (sonst entsteht an der Naht ein Kadenzsprung).
//
// R135b (Autor: "beim Losreiten gleitet das Pferd, die Laufanimation startet nicht"):
// Die Kadenz war viel zu niedrig fuer das schnelle Anfahren - der Boden zog ~9px pro
// Beinbild unter dem Pferd durch (sichtbares Gleiten). Die Kurven sind jetzt deutlich
// steiler und hoeher, damit die Beine mit dem Tempo Schritt halten. An den Grenzen
// stetig gehalten (Schritt-Spitze = Trab-Boden), damit keine Naht springt.
// Zum Feintunen: hier die Basiswerte/Steigungen aendern - hoeher = weniger Gleiten.
export function gangFps(gang: ReitGangClip, v: number): number {
  if (gang === 'idle') return REIT_PFERD.animationFps.idle;
  if (gang === 'walk') return Math.max(8, Math.min(18, 8 + v * 0.109));                              // v 0..92 -> 8..18
  if (gang === 'trot') return Math.max(18, Math.min(24, 18 + (v - REIT_PFERD.schrittGrenze) * 0.071)); // 92..176 -> 18..24
  return Math.max(24, Math.min(28, 24 + (v - REIT_PFERD.trabGrenze) * 0.04));                        // 176..276 -> 24..28 (gallop)
}

export function clipFps(clip: ReitClip, tempo = 0): number {
  const v = Math.abs(tempo);
  if (istReitUebergang(clip)) {
    // Frueher lief JEDER Uebergang mit festen 18 fps und fiel danach abrupt auf
    // die (bei Schritt ~6-8 fps) langsamere Gangart-Kadenz zurueck - das war das
    // "Haengen beim Losreiten": Pferd wird schneller, Beine werden ploetzlich
    // langsamer. Jetzt laeuft der Uebergang in der Kadenz der ZIELgangart. Weil
    // die Gangart-Kurven an ihren Grenzen stetig sind (Schritt@92 ~ Trab@92), ist
    // die Naht am Uebergang->Zielgangart exakt sprungfrei, und die Beine bewegen
    // sich sofort im Tempo der Gangart, in die man wechselt.
    const nach = clip.split('_to_')[1] as ReitGangClip;
    return gangFps(nach, v);
  }
  if (clip === 'walk' || clip === 'trot' || clip === 'gallop' || clip === 'idle') return gangFps(clip, v);
  if (clip === 'back') return Math.max(5, Math.min(8, 4.8 + v * 0.067));
  return Math.max(7, Math.min(11, 7 + v / REIT_PFERD.hoechstTempo * 4));   // Standwenden
}

export function uebertrageAnimationsPhase(animT: number, von: ReitClip, nach: ReitClip): number {
  const vonFrames = clipFrames(von);
  const phase = (((animT % vonFrames) + vonFrames) % vonFrames) / vonFrames;
  return phase * clipFrames(nach);
}

const GANG_RANG: Record<ReitGangClip, number> = { idle: 0, walk: 1, trot: 2, gallop: 3 };

export function istReitGang(clip: ReitClip): clip is ReitGangClip {
  return clip === 'idle' || clip === 'walk' || clip === 'trot' || clip === 'gallop';
}

export function istReitUebergang(clip: ReitClip): clip is ReitUebergangClip {
  return clip.includes('_to_');
}

export function naechsterReitGang(von: ReitGangClip, ziel: ReitGangClip): ReitGangClip {
  const vr = GANG_RANG[von], zr = GANG_RANG[ziel];
  if (vr === zr) return von;
  const rang = vr + Math.sign(zr - vr);
  return (Object.keys(GANG_RANG) as ReitGangClip[]).find((clip) => GANG_RANG[clip] === rang) ?? ziel;
}

export function reitUebergang(von: ReitGangClip, nach: ReitGangClip): ReitUebergangClip | null {
  if (Math.abs(GANG_RANG[von] - GANG_RANG[nach]) !== 1) return null;
  return `${von}_to_${nach}` as ReitUebergangClip;
}

export function uebergangQuellFrame(clip: ReitUebergangClip): number {
  if (clip === 'trot_to_gallop') return 2;
  if (clip === 'gallop_to_trot') return 5;
  return 0;
}

export function uebergangZielFrame(clip: ReitUebergangClip): number {
  if (clip === 'trot_to_gallop') return 5;
  if (clip === 'gallop_to_trot') return 2;
  return 0;
}
