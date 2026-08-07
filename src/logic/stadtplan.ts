// Stadt-Baukasten (Runde 22): vom Autor im Spiel gesetzte Kacheln und
// Objekte fürs Dorf. Liegt im Browser-Speicher; "STADTPLAN KOPIEREN"
// exportiert das JSON, damit ich es fest in den Code übernehmen kann.

// v = im Baukasten fest gewählte Grafik-Variante (1..n); fehlt sie,
// mischt das Spiel positionsfest wie überall sonst
export interface PlanKachel { x: number; y: number; t: number; orig: number; v?: number }
export interface PlanFackel { x: number; y: number }
export interface PlanTier { x: number; y: number; art: 'huhn' | 'schwein' | 'kuh' | 'hund' | 'schaf' | 'pferd' }
export interface PlanSchild { x: number; y: number; text: string }

export interface Stadtplan {
  kacheln: PlanKachel[];
  fackeln: PlanFackel[];
  tiere: PlanTier[];
  schilder: PlanSchild[];
}

export function leererPlan(): Stadtplan {
  return { kacheln: [], fackeln: [], tiere: [], schilder: [] };
}

const KEY = 'ravensmoor_stadtplan';

export function ladeStadtplan(): Stadtplan {
  try {
    const roh = localStorage.getItem(KEY);
    if (!roh) return leererPlan();
    return { ...leererPlan(), ...(JSON.parse(roh) as Partial<Stadtplan>) };
  } catch {
    return leererPlan();
  }
}

export function speichereStadtplan(plan: Stadtplan): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(plan));
  } catch { /* Speicher gesperrt oder voll */ }
}

export function loescheStadtplan(): void {
  try { localStorage.removeItem(KEY); } catch { /* egal */ }
}

// Alle Plan-Kacheln in die frisch gebaute Karte schreiben
export function wendePlanAn(map: number[][], plan: Stadtplan): void {
  for (const k of plan.kacheln) {
    if (map[k.y]?.[k.x] !== undefined) map[k.y][k.x] = k.t;
  }
}

// Kachel setzen; merkt sich das Original der KARTE (nicht früherer
// Pinselstriche), damit der Radierer sauber zurückbauen kann
export function setzeKachel(plan: Stadtplan, map: number[][], x: number, y: number, t: number, v?: number): boolean {
  if (map[y]?.[x] === undefined) return false;
  const alt = plan.kacheln.find((k) => k.x === x && k.y === y);
  if (map[y][x] === t && alt?.v === v) return false;
  if (alt) {
    if (alt.orig === t && v === undefined) {
      plan.kacheln.splice(plan.kacheln.indexOf(alt), 1);
    } else {
      alt.t = t;
      alt.v = v;
    }
  } else {
    plan.kacheln.push({ x, y, t, orig: map[y][x], ...(v !== undefined ? { v } : {}) });
  }
  map[y][x] = t;
  return true;
}

// Radierer: nimmt zuerst nahe Plan-Objekte zurück, sonst die Plan-Kachel
// (Karte erhält ihr Original zurück). Liefert, was entfernt wurde.
export function radiere(plan: Stadtplan, map: number[][], x: number, y: number, px: number, py: number):
'fackel' | 'tier' | 'schild' | 'kachel' | null {
  const naheIdx = <T extends { x: number; y: number }>(liste: T[]): number => {
    let best = -1, bestD = 26;
    liste.forEach((o, i) => {
      const d = Math.hypot(o.x - px, o.y - py);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  };
  const fi = naheIdx(plan.fackeln);
  if (fi >= 0) { plan.fackeln.splice(fi, 1); return 'fackel'; }
  const ti = naheIdx(plan.tiere);
  if (ti >= 0) { plan.tiere.splice(ti, 1); return 'tier'; }
  const si = naheIdx(plan.schilder);
  if (si >= 0) { plan.schilder.splice(si, 1); return 'schild'; }
  const ki = plan.kacheln.findIndex((k) => k.x === x && k.y === y);
  if (ki >= 0) {
    if (map[y]?.[x] !== undefined) map[y][x] = plan.kacheln[ki].orig;
    plan.kacheln.splice(ki, 1);
    return 'kachel';
  }
  return null;
}
