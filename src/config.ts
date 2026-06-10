/** Zentrale Konstanten: Farbpalette und Spielfeld-Maße (Stilvorgabe aus dem Master-Prompt). */
export const PALETTE = {
  parchment: 0xd8cfb8,
  blood: 0x8c1a1a,
  gold: 0xc9a227,
  night: 0x1a1612,
} as const;

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const DEPTHS = {
  floor: 0,
  decals: 5,
  shadows: 8,
  entities: 10,
  effects: 20,
  light: 30,
  ui: 100,
  debug: 200,
} as const;
