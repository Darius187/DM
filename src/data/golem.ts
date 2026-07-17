// Echter Blender-Sprite des Stone-Golem-Pakets. Alle Spielwerte bleiben hier
// zentral tunbar; das Originalpaket enthielt Rig + Mesh, aber keine Animationen.
export const GOLEM = {
  atlasKey: 'ravensmoor_stone_golem',
  atlasBild: 'golem/ravensmoor-stone-golem.png',
  atlasJson: 'golem/ravensmoor-stone-golem.json',
  zellen: 144,
  richtungen: 8,
  frames: { idle: 8, walk: 12, attack: 14, hit: 7, death: 14 },
  fps: { idle: 6, walk: 12, attack: 14, hit: 18, death: 12 },
  spriteScale: 0.92,
  ursprungY: 0.81,
  trefferDauerS: 0.38,
  schlagNachlaufS: 0.48,
} as const;

export type GolemClip = keyof typeof GOLEM.frames;

export function golemFrame(clip: GolemClip, dir: number, frame: number): string {
  const d = ((dir % GOLEM.richtungen) + GOLEM.richtungen) % GOLEM.richtungen;
  const f = ((frame % GOLEM.frames[clip]) + GOLEM.frames[clip]) % GOLEM.frames[clip];
  return `${clip}_d${d}_f${f}`;
}
