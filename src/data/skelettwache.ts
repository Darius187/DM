export const SKELETTWACHE = {
  atlasKey: 'ravensmoor_skeleton_guard',
  atlasBild: 'skeleton_guard/ravensmoor-skeleton-guard.png',
  atlasJson: 'skeleton_guard/ravensmoor-skeleton-guard.json',
  zellen: 160,
  richtungen: 16,
  atlasSpalten: 24,
  frames: { idle: 6, walk: 12, thrust: 10, combo: 14, spin: 14, hit: 6, death: 12 },
  fps: { idle: 6, walk: 12, thrust: 13, combo: 14, spin: 15, hit: 16, death: 8 },
  // Kompensiert die weitere Blender-Kamera, welche die Speerklinge auch im
  // maximalen Ausfall vollstaendig innerhalb der Atlaszelle haelt.
  skala: 0.80,
  bodenanker: 0.925,
  trefferDauerS: 0.20,
  // Trefferzeit, Nachschwung und naechster Angriff benutzen dieselbe Zeitleiste
  // wie die Blender-Clips. So trifft der Speer im sichtbaren Kontakt-Frame und
  // die Wache faellt danach nicht in eine lange, untätige Standardpause.
  angriffe: {
    thrust: { windupS: 0.30, nachlaufS: 0.30, zyklusS: 0.74 },
    combo: { windupS: 0.34, nachlaufS: 0.48, zyklusS: 0.96, zweiterTrefferS: 0.24 },
    spin: { windupS: 0.52, nachlaufS: 0.46, zyklusS: 1.24 },
  },
  rundum: { radius: 92, schadenF: 0.82, stoss: 270, cooldownMinS: 5.5, cooldownSpanneS: 2.5 },
} as const;

export type SkelettwacheClip = keyof typeof SKELETTWACHE.frames;

export function skelettwacheFrame(clip: SkelettwacheClip, dir: number, frame: number): string {
  const d = ((dir % SKELETTWACHE.richtungen) + SKELETTWACHE.richtungen) % SKELETTWACHE.richtungen;
  const f = ((frame % SKELETTWACHE.frames[clip]) + SKELETTWACHE.frames[clip]) % SKELETTWACHE.frames[clip];
  return `${clip}_d${d}_f${f}`;
}
