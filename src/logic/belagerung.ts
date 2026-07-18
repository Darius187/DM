export interface WehrstrukturPosition {
  id: string;
  x: number;
  y: number;
  tx?: number;
  ty?: number;
  tx2?: number;
  ty2?: number;
}

function belegteFelder(f: WehrstrukturPosition): Array<{ tx: number; ty: number }> {
  if (f.tx === undefined || f.ty === undefined) return [];
  const felder = [{ tx: f.tx, ty: f.ty }];
  if (f.tx2 !== undefined && f.ty2 !== undefined && (f.tx2 !== f.tx || f.ty2 !== f.ty)) {
    felder.push({ tx: f.tx2, ty: f.ty2 });
  }
  return felder;
}

export function benoetigteBreschenFelder(kollisionsRadius: number, kachelGroesse: number): number {
  return Math.max(1, Math.ceil(kollisionsRadius * 2 / Math.max(1, kachelGroesse)));
}

export function strukturBreiteInFeldern(f: WehrstrukturPosition): number {
  return Math.max(1, belegteFelder(f).length);
}

export function priorisierteBelagerungsziele<T extends WehrstrukturPosition>(strukturen: readonly T[]): T[] {
  const wehr = strukturen.filter((f) => f.id === 'palisade' || f.id === 'tor' || f.id.startsWith('wachturm'));
  return wehr.length ? wehr : [...strukturen];
}

// Findet nur eine direkt angrenzende Wehrkachel. So erweitert ein grosser
// Belagerer eine zu schmale Bresche entlang der bestehenden Palisadenlinie,
// statt irgendein fernes oder diagonales Gebaeude als Folge-Ziel zu waehlen.
export function angrenzendeWehrstruktur<T extends WehrstrukturPosition>(
  zerstoert: T,
  strukturen: readonly T[],
): T | null {
  const basis = belegteFelder(zerstoert);
  if (!basis.length) return null;
  let beste: T | null = null;
  let besteDistanz = Infinity;
  for (const kandidat of strukturen) {
    if (kandidat === zerstoert || (kandidat.id !== 'palisade' && kandidat.id !== 'tor')) continue;
    const felder = belegteFelder(kandidat);
    const grenzt = basis.some((a) => felder.some((b) => Math.abs(a.tx - b.tx) + Math.abs(a.ty - b.ty) === 1));
    if (!grenzt) continue;
    const distanz = Math.hypot(kandidat.x - zerstoert.x, kandidat.y - zerstoert.y);
    if (distanz < besteDistanz) { beste = kandidat; besteDistanz = distanz; }
  }
  return beste;
}
