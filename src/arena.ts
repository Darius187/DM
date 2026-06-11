import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  GridHelper,
  Group,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Scene,
  Vector2,
} from "three/webgpu";

// Achsen-ausgerichtetes Hindernis (Quader) fuer Kollision/Deckung.
export interface Obstacle {
  // Mittelpunkt auf der Bodenebene
  center: Vector2;
  // Halbe Ausdehnung in X/Z
  half: Vector2;
}

export interface Arena {
  group: Group;
  obstacles: Obstacle[];
  // Halbe Kantenlaenge der spielbaren Flaeche (quadratisch, um den Ursprung)
  halfSize: number;
}

export function buildArena(scene: Scene): Arena {
  const group = new Group();
  scene.add(group);

  const halfSize = 22;
  const obstacles: Obstacle[] = [];

  // Boden mit Gitter, damit Bewegung/Distanz lesbar ist.
  const ground = new Mesh(
    new PlaneGeometry(halfSize * 2, halfSize * 2),
    new MeshStandardMaterial({ color: 0x141822, roughness: 0.95, metalness: 0.0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const grid = new GridHelper(halfSize * 2, halfSize * 2, 0x3a4a66, 0x232a38);
  (grid.material as LineBasicMaterial).transparent = true;
  (grid.material as LineBasicMaterial).opacity = 0.5;
  grid.position.y = 0.01;
  group.add(grid);

  const wallMat = new MeshStandardMaterial({ color: 0x2c3346, roughness: 0.8 });
  const pillarMat = new MeshStandardMaterial({ color: 0x39425a, roughness: 0.7 });

  const addBox = (
    cx: number,
    cz: number,
    sx: number,
    sy: number,
    sz: number,
    mat: MeshStandardMaterial,
  ) => {
    const mesh = new Mesh(new BoxGeometry(sx, sy, sz), mat);
    mesh.position.set(cx, sy / 2, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    obstacles.push({ center: new Vector2(cx, cz), half: new Vector2(sx / 2, sz / 2) });
  };

  // Aussenwaende
  const t = 0.8;
  addBox(0, -halfSize, halfSize * 2, 1.6, t, wallMat);
  addBox(0, halfSize, halfSize * 2, 1.6, t, wallMat);
  addBox(-halfSize, 0, t, 1.6, halfSize * 2, wallMat);
  addBox(halfSize, 0, t, 1.6, halfSize * 2, wallMat);

  // Ein paar Saeulen/Quader als Deckung
  addBox(-7, -6, 2, 2.2, 2, pillarMat);
  addBox(8, 5, 2.4, 2.4, 2.4, pillarMat);
  addBox(6, -9, 1.6, 2.0, 5, pillarMat);
  addBox(-10, 8, 4.5, 1.8, 1.6, pillarMat);
  addBox(0, 0, 1.4, 1.6, 1.4, pillarMat);

  // Licht: ein gerichtetes Licht + Ambient. Es geht um Lesbarkeit, nicht Atmosphaere.
  const ambient = new AmbientLight(0xb8c4e0, 0.65);
  group.add(ambient);

  const sun = new DirectionalLight(0xffffff, 2.1);
  sun.position.set(12, 22, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -halfSize;
  sun.shadow.camera.right = halfSize;
  sun.shadow.camera.top = halfSize;
  sun.shadow.camera.bottom = -halfSize;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 60;
  group.add(sun);

  return { group, obstacles, halfSize };
}

// Schiebt eine Kreis-Position (Radius r) aus allen Hindernissen heraus und
// haelt sie in der Arena. Mutiert und liefert den korrigierten Vektor.
export function resolveCollisions(pos: Vector2, r: number, arena: Arena): Vector2 {
  // Arena-Grenzen (Innenkante der Aussenwaende)
  const lim = arena.halfSize - 0.8 - r;
  pos.x = Math.max(-lim, Math.min(lim, pos.x));
  pos.y = Math.max(-lim, Math.min(lim, pos.y));

  for (const o of arena.obstacles) {
    // Naechster Punkt des AABB zur Kreismitte
    const nx = Math.max(o.center.x - o.half.x, Math.min(pos.x, o.center.x + o.half.x));
    const nz = Math.max(o.center.y - o.half.y, Math.min(pos.y, o.center.y + o.half.y));
    const dx = pos.x - nx;
    const dz = pos.y - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      const d = Math.sqrt(d2) || 0.0001;
      const push = (r - d) / d;
      pos.x += dx * push;
      pos.y += dz * push;
    }
  }
  return pos;
}
