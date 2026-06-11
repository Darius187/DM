import { PerspectiveCamera, Raycaster, Vector2, Vector3 } from "three/webgpu";

// Isometrie wie Diablo: leicht perspektivische Kamera, fest schraeg von oben,
// folgt der Figur weich (Nachziehen, kein hartes Snapping).
export class CameraRig {
  readonly camera: PerspectiveCamera;
  // Fester Versatz Kamera -> Ziel. Hoehe/Tiefe ergeben ~42 Grad Neigung.
  private readonly offset = new Vector3(0, 19, 17);
  private readonly target = new Vector3();
  private readonly look = new Vector3();
  private readonly raycaster = new Raycaster();
  private readonly groundPlaneY = 0;

  constructor(aspect: number) {
    this.camera = new PerspectiveCamera(32, aspect, 0.1, 200);
    this.camera.position.copy(this.offset);
    this.camera.lookAt(0, 0, 0);
  }

  resize(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  // Sofort an die Figur setzen (Start ohne Nachzieh-Ruck).
  snapTo(pos: Vector3) {
    this.target.copy(pos);
    this.look.copy(pos);
    this.camera.position.copy(pos).add(this.offset);
    this.camera.lookAt(pos);
  }

  // Weiches Nachziehen.
  update(playerPos: Vector3, dt: number) {
    // Exponentielle Daempfung, framerate-unabhaengig.
    const k = 1 - Math.exp(-dt * 6.0);
    this.look.lerp(playerPos, k);
    const desired = this.target.copy(this.look).add(this.offset);
    this.camera.position.lerp(desired, k);
    this.camera.lookAt(this.look);
  }

  // Projiziert NDC-Mauskoordinaten auf die Bodenebene (y = 0).
  // Liefert den Weltpunkt oder null, wenn parallel.
  raycastGround(ndc: Vector2, out: Vector3): Vector3 | null {
    this.raycaster.setFromCamera(ndc, this.camera);
    const ray = this.raycaster.ray;
    const denom = ray.direction.y;
    if (Math.abs(denom) < 1e-6) return null;
    const t = (this.groundPlaneY - ray.origin.y) / denom;
    if (t < 0) return null;
    out.copy(ray.direction).multiplyScalar(t).add(ray.origin);
    return out;
  }

  // Bildschirm-orientierte Bewegungsachsen (Kamera-Gier ist fix auf 0):
  // "vor" = vom Betrachter weg (-Z), "rechts" = +X.
  getScreenAxes(): { forward: Vector3; right: Vector3 } {
    return { forward: new Vector3(0, 0, -1), right: new Vector3(1, 0, 0) };
  }
}
