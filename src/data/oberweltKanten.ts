// AUTORITATIVE OBERWELT-KANTEN-TABELLE (R98, generiert aus reference/ravenkarte.png
// via scripts/_karte_extrakt.mjs). Pro Zelle: wo kreuzt welcher Fluss/Weg welche
// Kante, in PROZENT der Kantenlaenge (0..100). Seen als Zentrum/Radius in % der
// Zelle. GETEILTE Kanten sind per Konstruktion identisch (A.ost == B.west, gleiche
// pos) - darum laufen Fluesse/Wege ueber die Kartengrenzen durch.
// NICHT von Hand editieren: bei Skizzen-Aenderung neu generieren.

export interface KantenKreuzung { feature: "fluss" | "weg"; pos: number; }
export interface OberweltZelleKanten {
  id: string; gx: number; gy: number;
  nord: KantenKreuzung[]; ost: KantenKreuzung[]; sued: KantenKreuzung[]; west: KantenKreuzung[];
  see: { cx: number; cy: number; rx: number; ry: number } | null;
}

export const OBERWELT_KANTEN: Record<string, OberweltZelleKanten> = {
  kloster: { id: "kloster", gx: 5, gy: 0, nord: [{ feature: "fluss", pos: 9.6 }], ost: [], sued: [{ feature: "fluss", pos: 22.6 }, { feature: "weg", pos: 57.9 }], west: [], see: null },
  hochland: { id: "hochland", gx: 2, gy: 1, nord: [], ost: [{ feature: "weg", pos: 83.5 }], sued: [{ feature: "fluss", pos: 58.3 }], west: [], see: null },
  wald_nw: { id: "wald_nw", gx: 3, gy: 1, nord: [{ feature: "fluss", pos: 75.6 }], ost: [], sued: [{ feature: "weg", pos: 48.6 }, { feature: "fluss", pos: 76.7 }], west: [{ feature: "weg", pos: 83.5 }], see: null },
  wald_ne: { id: "wald_ne", gx: 4, gy: 1, nord: [{ feature: "weg", pos: 44.4 }, { feature: "fluss", pos: 74.2 }], ost: [], sued: [{ feature: "fluss", pos: 17.8 }, { feature: "weg", pos: 49.4 }], west: [], see: null },
  schlacht: { id: "schlacht", gx: 5, gy: 1, nord: [{ feature: "fluss", pos: 22.6 }, { feature: "weg", pos: 57.9 }], ost: [], sued: [{ feature: "weg", pos: 58.2 }, { feature: "fluss", pos: 76.8 }], west: [], see: null },
  wald_n: { id: "wald_n", gx: 2, gy: 2, nord: [{ feature: "fluss", pos: 58.3 }], ost: [], sued: [{ feature: "fluss", pos: 72.9 }], west: [], see: null },
  wald_m: { id: "wald_m", gx: 3, gy: 2, nord: [{ feature: "weg", pos: 48.6 }, { feature: "fluss", pos: 76.7 }], ost: [{ feature: "fluss", pos: 47.1 }], sued: [{ feature: "weg", pos: 46.7 }, { feature: "fluss", pos: 55.3 }], west: [], see: null },
  lager: { id: "lager", gx: 4, gy: 2, nord: [{ feature: "fluss", pos: 17.8 }, { feature: "weg", pos: 49.4 }], ost: [{ feature: "weg", pos: 39.5 }, { feature: "fluss", pos: 61.8 }], sued: [{ feature: "weg", pos: 43.1 }, { feature: "fluss", pos: 81.9 }], west: [{ feature: "fluss", pos: 47.1 }], see: { cx: 19, cy: 47, rx: 46, ry: 41 } },
  stadt2: { id: "stadt2", gx: 5, gy: 2, nord: [{ feature: "weg", pos: 58.2 }, { feature: "fluss", pos: 76.8 }], ost: [{ feature: "weg", pos: 42 }], sued: [{ feature: "weg", pos: 50 }], west: [{ feature: "weg", pos: 39.5 }, { feature: "fluss", pos: 61.8 }], see: null },
  burg: { id: "burg", gx: 0, gy: 3, nord: [], ost: [{ feature: "weg", pos: 60 }, { feature: "fluss", pos: 85.7 }], sued: [], west: [{ feature: "fluss", pos: 31.7 }], see: null },
  wald_w: { id: "wald_w", gx: 1, gy: 3, nord: [], ost: [{ feature: "weg", pos: 59.1 }, { feature: "fluss", pos: 78.7 }], sued: [], west: [{ feature: "weg", pos: 60 }, { feature: "fluss", pos: 85.7 }], see: null },
  start: { id: "start", gx: 2, gy: 3, nord: [{ feature: "fluss", pos: 72.9 }], ost: [{ feature: "fluss", pos: 47 }, { feature: "weg", pos: 77 }], sued: [], west: [{ feature: "weg", pos: 59.1 }, { feature: "fluss", pos: 78.7 }], see: null },
  wald_o: { id: "wald_o", gx: 3, gy: 3, nord: [{ feature: "weg", pos: 46.7 }, { feature: "fluss", pos: 55.3 }], ost: [{ feature: "weg", pos: 53 }, { feature: "fluss", pos: 81.7 }], sued: [], west: [{ feature: "fluss", pos: 47 }, { feature: "weg", pos: 77 }], see: null },
  stadt: { id: "stadt", gx: 4, gy: 3, nord: [{ feature: "weg", pos: 43.1 }, { feature: "fluss", pos: 81.9 }], ost: [{ feature: "weg", pos: 55.7 }, { feature: "fluss", pos: 81.7 }], sued: [], west: [{ feature: "weg", pos: 53 }, { feature: "fluss", pos: 81.7 }], see: null },
  wald_se: { id: "wald_se", gx: 5, gy: 3, nord: [{ feature: "weg", pos: 50 }], ost: [{ feature: "weg", pos: 57.8 }, { feature: "fluss", pos: 74.3 }], sued: [], west: [{ feature: "weg", pos: 55.7 }, { feature: "fluss", pos: 81.7 }], see: { cx: 28, cy: 73, rx: 46, ry: 11 } },
};

// Kreuzungen einer Zelle in WELT-PIXEL fuer eine Area (Breite/Hoehe in px).
// West/Ost: y = pos% * Hoehe; Nord/Sued: x = pos% * Breite. So liest ein Builder
// seine Randgeometrie aus der Tabelle - und der Nachbar an derselben Kante genau
// denselben Punkt (Fluss/Weg laufen durch).
export interface KantePunkt { feature: "fluss" | "weg"; x?: number; y?: number; }
export function kantenPixel(id: string, breitePx: number, hoehePx: number): {
  west: KantePunkt[]; ost: KantePunkt[]; nord: KantePunkt[]; sued: KantePunkt[];
  see: { x: number; y: number; rx: number; ry: number } | null;
} | null {
  const k = OBERWELT_KANTEN[id];
  if (!k) return null;
  const yv = (a: KantenKreuzung[]): KantePunkt[] => a.map((c) => ({ feature: c.feature, y: c.pos / 100 * hoehePx }));
  const xv = (a: KantenKreuzung[]): KantePunkt[] => a.map((c) => ({ feature: c.feature, x: c.pos / 100 * breitePx }));
  return {
    west: yv(k.west), ost: yv(k.ost), nord: xv(k.nord), sued: xv(k.sued),
    see: k.see ? { x: k.see.cx / 100 * breitePx, y: k.see.cy / 100 * hoehePx, rx: k.see.rx / 100 * breitePx, ry: k.see.ry / 100 * hoehePx } : null,
  };
}

// Nachbar-Zelle in eine Richtung (fuer den Uebergabe-Abgleich).
export function nachbarId(id: string, richtung: "west" | "ost" | "nord" | "sued"): string | null {
  const k = OBERWELT_KANTEN[id]; if (!k) return null;
  const dx = richtung === "ost" ? 1 : richtung === "west" ? -1 : 0;
  const dy = richtung === "sued" ? 1 : richtung === "nord" ? -1 : 0;
  const n = Object.values(OBERWELT_KANTEN).find((z) => z.gx === k.gx + dx && z.gy === k.gy + dy);
  return n ? n.id : null;
}
