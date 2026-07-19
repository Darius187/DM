export const SKELETTWACHE = {
  atlasKey: 'ravensmoor_skeleton_guard',
  atlasBild: 'skeleton_guard/ravensmoor-skeleton-guard.png',
  atlasJson: 'skeleton_guard/ravensmoor-skeleton-guard.json',
  zellen: 160,
  richtungen: 8,
  frames: { idle: 6, walk: 10, thrust: 10, combo: 14, spin: 14, hit: 6, death: 12 },
  fps: { idle: 6, walk: 11, thrust: 13, combo: 14, spin: 15, hit: 16, death: 8 },
  skala: 0.68,
  bodenanker: 0.925,
  trefferDauerS: 0.34,
  schlagNachlaufS: 0.42,
  rundum: { radius: 92, schadenF: 0.82, stoss: 270, cooldownMinS: 5.5, cooldownSpanneS: 2.5 },
} as const;

export type SkelettwacheClip = keyof typeof SKELETTWACHE.frames;

export function skelettwacheFrame(clip: SkelettwacheClip, dir: number, frame: number): string {
  const d = ((dir % SKELETTWACHE.richtungen) + SKELETTWACHE.richtungen) % SKELETTWACHE.richtungen;
  const f = ((frame % SKELETTWACHE.frames[clip]) + SKELETTWACHE.frames[clip]) % SKELETTWACHE.frames[clip];
  return `${clip}_d${d}_f${f}`;
}
