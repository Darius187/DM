// Geteilte Schatten-/Licht-Mathematik (Runde 55) - reine, Phaser-freie Funktionen,
// damit dieselbe Engine in jeder Szene genutzt werden kann (Dungeon-Fackeln wie in
// der GRUSEL-SCHATTEN-Probe UND Tag-/Stadt-Schlagschatten von Gebäuden/NPCs).
//
// ZWEI Mechanismen, weil Licht und Schatten im Top-Down zwei verschiedene Dinge sind:
//  (A) PUNKTLICHT (Fackel, Kohlebecken, getragenes Licht): sichtPolygon() berechnet
//      per Strahlen auf jede Verdecker-Ecke, WOHIN das Licht reicht - ringsum ist
//      Dunkelheit. Verdecker (Wände, NPCs, Gebäude) werfen so RADIALE Schatten.
//  (B) SONNE (Tag, Stadt): sonnenschatten() projiziert die Silhouette eines Objekts
//      entlang der Sonnenrichtung -> ein Schatten-Polygon. PARALLELE Schatten, sehr
//      billig (kein Raycasting nötig, statische Gebäude einmal vorberechenbar).
// Beide teilen sich die Verdecker als Liniensegmente (rechteckSegmente()).

export interface Punkt { x: number; y: number }
export interface Segment { ax: number; ay: number; bx: number; by: number }
export interface Rechteck { x: number; y: number; w: number; h: number }

// Rechteck (Wand / Gebäude-Grundriss / Figur-Hülle) -> vier Kanten als Segmente.
export function rechteckSegmente(r: Rechteck): Segment[] {
  const x2 = r.x + r.w, y2 = r.y + r.h;
  return [
    { ax: r.x, ay: r.y, bx: x2, by: r.y },
    { ax: x2, ay: r.y, bx: x2, by: y2 },
    { ax: x2, ay: y2, bx: r.x, by: y2 },
    { ax: r.x, ay: y2, bx: r.x, by: r.y },
  ];
}

// Strahl (Ursprung O, Richtung d) gegen Segment: Entfernung t entlang des Strahls
// (>= 0) oder null. Standard-2D-Schnitt über Kreuzprodukte; Segmentanteil in [0,1].
export function strahlSegment(ox: number, oy: number, dx: number, dy: number, s: Segment): number | null {
  const sdx = s.bx - s.ax, sdy = s.by - s.ay;
  const denom = dx * sdy - dy * sdx;
  if (Math.abs(denom) < 1e-9) return null;            // parallel
  const t1 = ((s.ax - ox) * sdy - (s.ay - oy) * sdx) / denom; // entlang Strahl
  const t2 = ((s.ax - ox) * dy - (s.ay - oy) * dx) / denom;   // entlang Segment
  if (t1 >= 0 && t2 >= 0 && t2 <= 1) return t1;
  return null;
}

// Sichtpolygon eines Punktlichts (Raycasting): auf jede Verdecker-Ecke drei Strahlen
// (Ecke +/- Mini-Winkel, damit der Strahl an der Kante vorbeischlüpft), je nächsten
// Treffer behalten, nach Winkel sortiert -> der Lichtfächer. radius = Lichtweite.
export function sichtPolygon(licht: Punkt, segmente: Segment[], radius: number): Punkt[] {
  const winkel: number[] = [];
  for (const s of segmente) {
    for (const p of [[s.ax, s.ay], [s.bx, s.by]] as const) {
      const a = Math.atan2(p[1] - licht.y, p[0] - licht.x);
      winkel.push(a - 0.0003, a, a + 0.0003);
    }
  }
  const treffer: Array<{ a: number; x: number; y: number }> = [];
  for (const a of winkel) {
    const dx = Math.cos(a), dy = Math.sin(a);
    let best = radius;
    for (const s of segmente) {
      const t = strahlSegment(licht.x, licht.y, dx, dy, s);
      if (t !== null && t < best) best = t;
    }
    treffer.push({ a, x: licht.x + dx * best, y: licht.y + dy * best });
  }
  treffer.sort((p, q) => p.a - q.a);
  return treffer.map((t) => ({ x: t.x, y: t.y }));
}

// Konvexe Hülle (Andrew's monotone chain) - für den Sonnenschatten.
export function konvexeHuelle(pts: Punkt[]): Punkt[] {
  const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const kreuz = (o: Punkt, a: Punkt, b: Punkt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const unten: Punkt[] = [];
  for (const q of p) { while (unten.length >= 2 && kreuz(unten[unten.length - 2], unten[unten.length - 1], q) <= 0) unten.pop(); unten.push(q); }
  const oben: Punkt[] = [];
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (oben.length >= 2 && kreuz(oben[oben.length - 2], oben[oben.length - 1], q) <= 0) oben.pop(); oben.push(q); }
  unten.pop(); oben.pop();
  return unten.concat(oben);
}

// Sonnen-Schlagschatten eines Rechtecks (Tag): die Ecken werden entlang der
// Sonnenrichtung (Einheitsvektor, in die der Schatten fällt) um laenge verlängert;
// der Schatten ist die konvexe Hülle aus Original- und projizierten Ecken. So wirft
// JEDES Objekt (Gebäude, Baum, NPC-Hülle) einen parallelen Schatten - sehr günstig.
export function sonnenschatten(r: Rechteck, sonneDir: Punkt, laenge: number): Punkt[] {
  const ecken: Punkt[] = [
    { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h }, { x: r.x, y: r.y + r.h },
  ];
  const proj = ecken.map((e) => ({ x: e.x + sonneDir.x * laenge, y: e.y + sonneDir.y * laenge }));
  return konvexeHuelle([...ecken, ...proj]);
}
