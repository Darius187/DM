import { Vector2 } from "three/webgpu";

// Sammelt rohe Eingaben (Tastatur, Maus, Touch) und stellt sie dem Spiel
// als Halte-Zustaende plus einmalige Ausloeser (Trigger) bereit.
export class Input {
  // Gedrueckte Tasten (Halte-Zustand)
  private readonly down = new Set<string>();
  // Maus in normalisierten Geraetekoordinaten (-1..1)
  readonly mouseNDC = new Vector2(0, 0);

  // Halte-Zustaende
  leftHeld = false;
  rightHeld = false;

  // Einmalige Ausloeser - werden pro Frame konsumiert.
  trigLight = false;
  trigHeavy = false;
  trigRoll = false;
  trigSpawn = false;
  trigToggleDebug = false;
  trigToggleMode = false;
  trigToggleHelp = false;
  trigToggleTouch = false;
  // Klick-zu-Bewegen: gesetzter Bodenklick (NDC zum Zeitpunkt des Klicks)
  trigGroundClick = false;
  readonly clickNDC = new Vector2(0, 0);

  // Touch
  touchMove = new Vector2(0, 0); // -1..1 Joystick
  touchActive = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    addEventListener("keydown", this.onKeyDown);
    addEventListener("keyup", this.onKeyUp);
    canvas.addEventListener("mousemove", this.onMouseMove);
    canvas.addEventListener("mousedown", this.onMouseDown);
    addEventListener("mouseup", this.onMouseUp);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    addEventListener("blur", () => this.down.clear());
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  // Bewegungseingabe aus WASD (Bildschirm-relativ): x = rechts, y = vor.
  movementAxis(out: Vector2): Vector2 {
    let x = 0;
    let y = 0;
    if (this.isDown("KeyW") || this.isDown("ArrowUp")) y += 1;
    if (this.isDown("KeyS") || this.isDown("ArrowDown")) y -= 1;
    if (this.isDown("KeyD") || this.isDown("ArrowRight")) x += 1;
    if (this.isDown("KeyA") || this.isDown("ArrowLeft")) x -= 1;
    out.set(x, y);
    if (x !== 0 || y !== 0) out.normalize();
    return out;
  }

  shiftHeld(): boolean {
    return this.isDown("ShiftLeft") || this.isDown("ShiftRight");
  }

  // Am Ende jedes Frames aufrufen: Trigger zuruecksetzen.
  endFrame() {
    this.trigLight = false;
    this.trigHeavy = false;
    this.trigRoll = false;
    this.trigSpawn = false;
    this.trigToggleDebug = false;
    this.trigToggleMode = false;
    this.trigToggleHelp = false;
    this.trigToggleTouch = false;
    this.trigGroundClick = false;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    this.down.add(e.code);
    switch (e.code) {
      case "Space":
        this.trigRoll = true;
        e.preventDefault();
        break;
      case "KeyQ":
        this.trigHeavy = true;
        break;
      case "KeyG":
        this.trigSpawn = true;
        break;
      case "F1":
      case "Backquote":
        this.trigToggleDebug = true;
        e.preventDefault();
        break;
      case "KeyM":
        this.trigToggleMode = true;
        break;
      case "KeyH":
        this.trigToggleHelp = true;
        break;
      case "KeyT":
        this.trigToggleTouch = true;
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.down.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent) => {
    const r = this.canvas.getBoundingClientRect();
    this.mouseNDC.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    this.mouseNDC.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.leftHeld = true;
      this.clickNDC.copy(this.mouseNDC);
      this.trigGroundClick = true;
      // Schwerer Angriff per Shift+Linksklick, sonst leicht.
      if (this.shiftHeld()) this.trigHeavy = true;
      else this.trigLight = true;
    } else if (e.button === 2) {
      this.rightHeld = true;
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.leftHeld = false;
    else if (e.button === 2) this.rightHeld = false;
  };
}
