import { describe, expect, it } from 'vitest';
import manifestData from '../assets/houses/castle/medieval_castle_3d_runtime.json';
import { seededRng } from '../src/logic/rng';
import { buildBurg } from '../src/world/areagen';
import { T } from '../src/world/tiles';

interface Guide {
  kind: string;
  center_blender_xyz: [number, number, number];
  size_blender_xyz: [number, number, number];
}

interface BurgManifest {
  runtime_mode: string;
  doors?: Record<string, unknown>;
  collision_guides: Guide[];
  markers: Array<{ name: string; blender_xyz: [number, number, number] }>;
  node_groups?: {
    main_gate?: string[];
    wall_corners?: string[];
    wall_access?: string[];
  };
}

const manifest = manifestData as unknown as BurgManifest;

function istBlockiert(x: number, y: number): boolean {
  return manifest.collision_guides.some((g) => {
    if (g.kind !== 'block') return false;
    const [cx, cy] = g.center_blender_xyz;
    const [sx, sy] = g.size_blender_xyz;
    return x >= cx - sx / 2 && x <= cx + sx / 2
      && y >= cy - sy / 2 && y <= cy + sy / 2;
  });
}

describe('Fuerstenburg-Runtime', () => {
  it('laesst Suedtor und Weg zum Hof durchgehend frei', () => {
    for (let y = -24; y <= -8; y += 0.25) expect(istBlockiert(0, y), `Torweg blockiert bei y=${y}`).toBe(false);
    const hof = manifest.markers.find((m) => m.name === 'SPAWN_CASTLE_COURTYARD');
    expect(hof).toBeDefined();
    expect(istBlockiert(hof!.blender_xyz[0], hof!.blender_xyz[1])).toBe(false);
  });

  it('bleibt eine offene Aussenruntime ohne Tuer-Riegel', () => {
    expect(manifest.runtime_mode).toBe('exterior_only');
    expect(Object.keys(manifest.doors ?? {})).toHaveLength(0);
    expect(manifest.node_groups?.main_gate).toEqual([
      'BRG_MainGatehouse',
      'BRG_GateDoor_Left_Open',
      'BRG_GateDoor_Right_Open',
    ]);
  });

  it('schliesst den Mauerring an allen vier Eckverbindern', () => {
    expect(manifest.node_groups?.wall_corners).toEqual([
      'BRG_WallCorner_SW', 'BRG_WallCorner_SE',
      'BRG_WallCorner_NW', 'BRG_WallCorner_NE',
    ]);
    expect(manifest.node_groups?.wall_access).toHaveLength(4);

    for (let x = -27.6; x <= 27.6; x += 0.4) {
      expect(istBlockiert(x, 19.9), `Nordmauer offen bei x=${x}`).toBe(true);
      if (Math.abs(x) >= 3.3) expect(istBlockiert(x, -18.6), `Suedmauer offen bei x=${x}`).toBe(true);
    }
    for (let y = -18.6; y <= 19.9; y += 0.4) {
      expect(istBlockiert(-27.6, y), `Westmauer offen bei y=${y}`).toBe(true);
      expect(istBlockiert(27.6, y), `Ostmauer offen bei y=${y}`).toBe(true);
    }
  });

  it('erzeugt im sichtbaren Burgbereich weder Wasser noch Wasser-Shader', () => {
    const a = buildBurg(seededRng(193));
    const cx = Math.round(a.w * 0.5), cy = Math.round(a.h * 0.5);
    expect(a.wasserLauf).toBeUndefined();
    for (let y = cy - 25; y <= cy + 20; y++) {
      for (let x = cx - 35; x <= cx + 35; x++) expect(a.map[y][x]).not.toBe(T.WATER);
    }
    expect(a.map[Math.floor(a.spawn.y / 32)][Math.floor(a.spawn.x / 32)]).toBe(T.GRASS);
  });
});
