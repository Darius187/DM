// Formations-Mathematik für den Schlacht-Prototyp (Runde 51, Autorwunsch:
// Mischung aus Age-of-Empires-Festformationen und Beyond-All-Reason-Linien).
// REIN und damit testbar: erzeugt lokale Slot-Versätze (forward/lateral) relativ
// zu einem Anker und einer Blickrichtung. Die Szene dreht sie in die Welt.
//
// Füll-Reihenfolge: vorderste/äußerste Slots ZUERST. Wenn die Szene die Einheiten
// nach Rolle sortiert (Schild/Nahkampf vorne, Bogen/Heiler hinten) übergibt,
// landen schwere Einheiten automatisch vorne bzw. außen.

export type Form = 'linie' | 'block' | 'keil' | 'locker' | 'schutz';

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
