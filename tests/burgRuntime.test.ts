import { describe, expect, it } from 'vitest';
import manifestData from '../assets/houses/castle/medieval_castle_3d_runtime.json';
import { seededRng } from '../src/logic/rng';
import { buildBurg } from '../src/world/areagen';
import { T } from '../src/world/tiles';

interface Guide {
  name: string;
  kind: string;
  center_blender_xyz: [number, number, number];
  size_blender_xyz: [number, number, number];
}

interface BurgManifest {
  runtime_mode: string;
  doors?: Record<string, unknown>;
  courtyard_surfaces?: {
    uv_tile_meters: number;
    packed_earth_material: string;
    stable_zone_material: string;
    paving_material: string;
    moss_edge_material: string;
    textures_embedded_in_glb: boolean;
  };
  collision_guides: Guide[];
  markers: Array<{ name: string; blender_xyz: [number, number, number] }>;
  node_groups?: {
    main_gate?: string[];
    wall_corners?: string[];
    wall_seams?: string[];
    wall_access?: string[];
    wall_landings?: string[];
  };
  editable_parts?: Array<{ id: string; label: string; node: string; nodes?: string[]; collision_guides: string[] }>;
  continuous_controls: { camera_elevation_degrees: { default: number } };
  renderer_recipe: {
    adaptive_offscreen_resolution: string;
    texture_sampling: string;
    shadow_map: string;
    postprocessing: string;
  };
  materials: {
    embedded_basecolor_textures: boolean;
    texture_max_size: number;
    texture_policy: string;
    generated_prop_materials: string;
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
    expect(manifest.node_groups?.wall_seams).toHaveLength(11);
    expect(manifest.node_groups?.wall_access).toEqual([
      'BRG_WallStairs_Gate',
      'BRG_WallStairs_Rear',
    ]);
    expect(manifest.node_groups?.wall_landings).toEqual([]);

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

  it('liefert gekachelte und im GLB eingebettete Hofmaterialien', () => {
    expect(manifest.courtyard_surfaces).toEqual({
      uv_tile_meters: 4,
      packed_earth_material: 'BRG_MAT_CourtyardPackedEarth',
      stable_zone_material: 'BRG_MAT_CourtyardPackedEarth',
      paving_material: 'BRG_MAT_CourtyardPaving',
      moss_edge_material: 'BRG_MAT_CourtyardMoss',
      textures_embedded_in_glb: true,
    });
    expect(manifest.continuous_controls.camera_elevation_degrees.default).toBe(38);
  });

  it('fordert HiDPI-Sampling, 2K-Architektur und glTF-sichere Prop-Materialien an', () => {
    expect(manifest.renderer_recipe.adaptive_offscreen_resolution).toContain('devicePixelRatio, 2');
    expect(manifest.renderer_recipe.texture_sampling).toContain('LinearMipmapLinearFilter');
    expect(manifest.renderer_recipe.shadow_map).toContain('2048');
    expect(manifest.renderer_recipe.postprocessing).toContain('none');
    expect(manifest.materials).toMatchObject({
      embedded_basecolor_textures: true,
      texture_max_size: 2048,
    });
    expect(manifest.materials.texture_policy).toContain('small props 1024');
    expect(manifest.materials.generated_prop_materials).toContain('glTF-safe');
  });

  it('stellt Tuerme und Hofgebaeude als einzeln editierbare Runtime-Teile bereit', () => {
    expect(manifest.editable_parts?.map((p) => p.id)).toEqual([
      'gatehouse', 'gate_tower_west', 'gate_tower_east', 'rear_tower_nw', 'keep',
      'palas', 'chapel', 'kitchen', 'storage', 'stable',
    ]);
    const guideNamen = new Set(manifest.collision_guides.map((g) => g.name));
    for (const teil of manifest.editable_parts ?? []) {
      expect(teil.node, `${teil.id} ohne GLB-Knoten`).toMatch(/^BRG_/);
      expect(teil.collision_guides.length, `${teil.id} ohne Kollision`).toBeGreaterThan(0);
      for (const name of teil.collision_guides) expect(guideNamen.has(name), `${teil.id}: ${name} fehlt`).toBe(true);
    }
    expect(manifest.editable_parts?.[0].nodes).toEqual([
      'BRG_MainGatehouse', 'BRG_GateDoor_Left_Open', 'BRG_GateDoor_Right_Open',
    ]);
  });
});
