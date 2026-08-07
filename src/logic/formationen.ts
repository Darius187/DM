// Formations-Mathematik für den Schlacht-Prototyp (Runde 51, Autorwunsch:
// Mischung aus Age-of-Empires-Festformationen und Beyond-All-Reason-Linien).
// REIN und damit testbar: erzeugt lokale Slot-Versätze (forward/lateral) relativ
// zu einem Anker und einer Blickrichtung. Die Szene dreht sie in die Welt.
//
// Füll-Reihenfolge: vorderste/äußerste Slots ZUERST. Wenn die Szene die Einheiten
// nach Rolle sortiert (Schild/Nahkampf vorne, Bogen/Heiler hinten) übergibt,
// landen schwere Einheiten automatisch vorne bzw. außen.

// Neben den Grundformen drei historische des 14. Jh. (Autorwunsch R54):
// - schiltron: schottischer Speer-Ring/Igel gegen Reiterei (Bannockburn 1314) -
//   Speere nach außen, Schützen/Anführer geschützt in der Mitte.
// - bogenfluegel: englische Langbogen-Taktik (Crécy 1346, Azincourt) -
//   Männer in der Mitte, Schützen schräg nach vorn auf den FLÜGELN (V).
// - kolonne: tiefe, schmale Marschkolonne zum Durchstoßen/Durchqueren von Lücken.
export type Form = 'linie' | 'block' | 'keil' | 'locker' | 'schutz' | 'schiltron' | 'bogenfluegel' | 'kolonne';

// f = forward (zur Blickrichtung, vorne = positiv), l = lateral (quer)
export interface Slot { f: number; l: number }

export function formSlots(n: number, form: Form, S = 30): Slot[] {
  if (n <= 0) return [];
  const out: Slot[] = [];
  const reihe = (count: number, f: number, gap = S): void => {
    for (let i = 0; i < count; i++) out.push({ f, l: (i - (count - 1) / 2) * gap });
  };
  switch (form) {
    case 'linie': {
      // breit und flach: vordere Reihe (Nahkampf), dahinter der Rest (Bogen)
      const cols = Math.ceil(n / 2);
      reihe(Math.min(cols, n), S / 2);
      if (n > cols) reihe(n - cols, -S / 2);
      break;
    }
    case 'block': {
      const cols = Math.max(1, Math.round(Math.sqrt(n)));
      const rows = Math.ceil(n / cols);
      let rem = n;
      for (let r = 0; r < rows; r++) {
        const c = Math.min(cols, rem);
        reihe(c, ((rows - 1) / 2 - r) * S);
        rem -= c;
      }
      break;
    }
    case 'keil': {
      // Spitze (1 Einheit) vorne, jede Reihe eine breiter
      const reihen: number[] = [];
      let rem = n, w = 1;
      while (rem > 0) { const c = Math.min(w, rem); reihen.push(c); rem -= c; w++; }
      const R = reihen.length;
      reihen.forEach((c, r) => reihe(c, ((R - 1) / 2 - r) * S));
      break;
    }
    case 'locker': {
      // gleiche Anordnung wie Block, nur mit deutlich mehr Abstand
      const cols = Math.max(1, Math.round(Math.sqrt(n)));
      const rows = Math.ceil(n / cols);
      let rem = n;
      for (let r = 0; r < rows; r++) {
        const c = Math.min(cols, rem);
        reihe(c, ((rows - 1) / 2 - r) * S * 1.7, S * 1.7);
        rem -= c;
      }
      break;
    }
    case 'schutz': {
      // Hohlbox: Außenring zuerst (schwere Einheiten schützen die Mitte)
      const cols = Math.max(2, Math.round(Math.sqrt(n)));
      const rows = Math.ceil(n / cols);
      const grid: Slot[] = [];
      let rem = n;
      for (let r = 0; r < rows; r++) {
        const c = Math.min(cols, rem);
        for (let i = 0; i < c; i++) grid.push({ f: ((rows - 1) / 2 - r) * S, l: (i - (c - 1) / 2) * S });
        rem -= c;
      }
      grid.sort((a, b) => (Math.abs(b.f) + Math.abs(b.l)) - (Math.abs(a.f) + Math.abs(a.l)));
      out.push(...grid);
      break;
    }
    case 'schiltron': {
      // Speer-Ring: Außenring zuerst (Nahkampf nach außen), Rest geschützt innen.
      const innen = n > 10 ? Math.round(n * 0.22) : 0;
      const aussen = Math.max(1, n - innen);
      const radius = Math.max(S, (aussen * S) / (2 * Math.PI));
      for (let i = 0; i < aussen; i++) {
        const a = (i / aussen) * Math.PI * 2 - Math.PI / 2;   // vorne beginnen
        out.push({ f: Math.cos(a) * radius, l: Math.sin(a) * radius });
      }
      const ir = radius * 0.5;
      for (let i = 0; i < innen; i++) {
        const a = (i / Math.max(1, innen)) * Math.PI * 2;
        out.push({ f: innen > 1 ? Math.cos(a) * ir : 0, l: innen > 1 ? Math.sin(a) * ir : 0 });
      }
      break;
    }
    case 'bogenfluegel': {
      // Mitte: Nahkampf-Block vorn; Flügel: Schützen schräg nach VORN/außen (V).
      let zentrum = Math.max(1, Math.min(n, Math.round(n * 0.45)));
      let fluegel = n - zentrum;
      if (fluegel % 2 === 1) { zentrum++; fluegel--; }   // Flügel paarweise -> symmetrisch
      const zc = Math.max(1, Math.round(Math.sqrt(zentrum)));
      let rem = zentrum, r = 0;
      while (rem > 0) { const c = Math.min(zc, rem); reihe(c, S * 0.5 - r * S); rem -= c; r++; }
      const proSeite = Math.ceil(fluegel / 2);
      let done = 0;
      for (let k = 0; k < proSeite; k++) {
        for (const side of [-1, 1] as const) {
          if (done >= fluegel) break;
          const off = k + 1;
          out.push({ f: S * 0.8 + off * S * 0.6, l: side * (zc * S * 0.55 + off * S * 0.7) });
          done++;
        }
      }
      break;
    }
    case 'kolonne': {
      // tiefe, schmale Marschkolonne (2 breit): Front zuerst (Nahkampf vorn).
      const cols = n >= 6 ? 2 : 1;
      const rows = Math.ceil(n / cols);
      let rem = n;
      for (let r = 0; r < rows; r++) {
        const c = Math.min(cols, rem);
        reihe(c, ((rows - 1) / 2 - r) * S);
        rem -= c;
      }
      break;
    }
  }
  return out;
}

// Gezogene Linie (Beyond-All-Reason-Stil): N Einheiten verteilen sich entlang
// einer Strecke der Länge `laenge`. `raenge[i]` (0 = Front .. 3 = hinten) staffelt
// sie nach Rolle in die Tiefe; lateral werden sie gleichmäßig auf die Linie
// gelegt (in der übergebenen Reihenfolge entlang der Strecke).
export function linienSlots(raenge: number[], laenge: number, S = 30): Slot[] {
  const n = raenge.length;
  if (n === 0) return [];
  const span = Math.max(laenge, (n - 1) * 22);
  // Saubere 2-Reihen-Linie: Front (Schild/Nahkampf, Rang 0/1) auf der Linie,
  // Fernkampf/Heiler (Rang >=2) eine Reihe dahinter. Lateral gleichmäßig.
  return raenge.map((rg, i) => ({
    f: (rg <= 1 ? 0.5 : -0.5) * S,
    l: n === 1 ? 0 : (i / (n - 1) - 0.5) * span,
  }));
}

// Dreht einen lokalen Slot in Weltkoordinaten (Anker + Blickrichtung facing).
export function slotWelt(anker: { x: number; y: number }, facing: number, s: Slot): { x: number; y: number } {
  const cf = Math.cos(facing), sf = Math.sin(facing);
  return { x: anker.x + s.f * cf - s.l * sf, y: anker.y + s.f * sf + s.l * cf };
}

// Festformation entlang einer gezogenen Linie skalieren (Runde 53, Autorwunsch:
// "Formation HALTEN, aber per gezogener Linie drehen UND größer/kleiner machen -
// der Keil bleibt ein Keil, wird nur breiter/gedreht"). Der Abstand S wird so
// gewählt, dass die Vorne-Hinten-Ausdehnung der Formation der Linienlänge
// entspricht; da `reihe()` denselben Abstand quer benutzt, wächst die ganze
// Formation gleichmäßig mit. Form (Anzahl + Vorzeichenmuster der Slots) bleibt.
export function formSlotsSkaliert(n: number, form: Form, laenge: number, minS = 16, maxS = 90): Slot[] {
  const basis = formSlots(n, form, 1);
  let lo = Infinity, hi = -Infinity;
  for (const s of basis) { lo = Math.min(lo, s.f); hi = Math.max(hi, s.f); }
  const spanU = Math.max(1, hi - lo);               // Ausdehnung in S-Einheiten
  const S = Math.max(minS, Math.min(maxS, laenge / spanU));
  return formSlots(n, form, S);
}
