import {
  BoxGeometry,
  Camera,
  Mesh,
  MeshBasicMaterial,
  Scene,
  SphereGeometry,
  Vector3,
} from "three/webgpu";

// Hit-Stop: friert die Spielzeit kurz ein. Der Renderer laeuft weiter.
export class HitStop {
  private remainingMs = 0;

  trigger(ms: number) {
    // Laengeren Stop nicht durch kuerzeren ueberschreiben.
    this.remainingMs = Math.max(this.remainingMs, ms);
  }

  get active(): boolean {
    return this.remainingMs > 0;
  }

  get remaining(): number {
    return Math.max(0, this.remainingMs);
  }

  // Mit echtem dt (ms) abbauen. Liefert true, solange eingefroren wird.
  tick(realDtMs: number): boolean {
    if (this.remainingMs <= 0) return false;
    this.remainingMs -= realDtMs;
    return true;
  }
}

interface Particle {
  mesh: Mesh;
  vel: Vector3;
  life: number;
  maxLife: number;
}

interface FloatNumber {
  el: HTMLDivElement;
  world: Vector3;
  age: number;
  ttl: number;
  rise: number;
}

const TMP = new Vector3();

export type DmgKind = "light" | "finisher" | "heavy" | "parry" | "player";

// Buendelt die visuellen Treffer-Effekte: Partikel/Form-Blitz und schwebende
// Schadenszahlen. (Hit-Stop wird separat verwaltet.)
export class Effects {
  private particles: Particle[] = [];
  private numbers: FloatNumber[] = [];
  private readonly pGeo = new BoxGeometry(0.16, 0.16, 0.16);
  private readonly flashGeo = new SphereGeometry(0.5, 12, 8);

  constructor(
    private readonly scene: Scene,
    private readonly camera: Camera,
    private readonly uiRoot: HTMLElement,
  ) {}

  // Form-Blitz + Partikelschauer am Trefferpunkt.
  burst(at: Vector3, color: number, count = 10) {
    // Kurzer expandierender Blitz.
    const flash = new Mesh(
      this.flashGeo,
      new MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }),
    );
    flash.position.copy(at);
    flash.scale.setScalar(0.4);
    this.scene.add(flash);
    this.particles.push({
      mesh: flash,
      vel: new Vector3(0, 0, 0),
      life: 0.18,
      maxLife: 0.18,
    });

    // Splitter.
    for (let i = 0; i < count; i++) {
      const m = new Mesh(
        this.pGeo,
        new MeshBasicMaterial({ color, transparent: true, opacity: 1 }),
      );
      m.position.copy(at);
      const ang = Math.random() * Math.PI * 2;
      const sp = 2.5 + Math.random() * 4.5;
      m.userData.flash = false;
      this.scene.add(m);
      this.particles.push({
        mesh: m,
        vel: new Vector3(Math.cos(ang) * sp, 3 + Math.random() * 4, Math.sin(ang) * sp),
        life: 0.45 + Math.random() * 0.25,
        maxLife: 0.7,
      });
    }
  }

  // Schwebende Schadenszahl.
  damageNumber(at: Vector3, value: number, kind: DmgKind, prefix = "") {
    const el = document.createElement("div");
    el.className = `dmg ${kind}`;
    el.textContent = prefix + Math.round(value).toString();
    this.uiRoot.appendChild(el);
    this.numbers.push({ el, world: at.clone(), age: 0, ttl: 0.8, rise: 0 });
  }

  // Reine Textmarke (z. B. "PARADE!").
  label(at: Vector3, text: string, kind: DmgKind) {
    const el = document.createElement("div");
    el.className = `dmg ${kind}`;
    el.textContent = text;
    this.uiRoot.appendChild(el);
    this.numbers.push({ el, world: at.clone(), age: 0, ttl: 0.9, rise: 0 });
  }

  // gameplayDt friert Partikel mit dem Hit-Stop ein; realDt laesst die
  // DOM-Zahlen weiter aufsteigen, damit das Feedback nicht stockt.
  update(gameplayDt: number, realDt: number) {
    // Partikel
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= gameplayDt;
      const isFlash = p.mesh.geometry === this.flashGeo;
      if (isFlash) {
        const k = 1 - p.life / p.maxLife;
        p.mesh.scale.setScalar(0.4 + k * 2.2);
        (p.mesh.material as MeshBasicMaterial).opacity = Math.max(0, 0.85 * (1 - k));
      } else {
        p.vel.y -= 18 * gameplayDt;
        p.mesh.position.addScaledVector(p.vel, gameplayDt);
        (p.mesh.material as MeshBasicMaterial).opacity = Math.max(0, p.life / p.maxLife);
      }
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        (p.mesh.material as MeshBasicMaterial).dispose();
        this.particles.splice(i, 1);
      }
    }

    // Schadenszahlen
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      n.age += realDt;
      n.rise += realDt * 1.4;
      const t = n.age / n.ttl;
      if (t >= 1) {
        n.el.remove();
        this.numbers.splice(i, 1);
        continue;
      }
      TMP.copy(n.world);
      TMP.y += 1.4 + n.rise;
      TMP.project(this.camera);
      const x = (TMP.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-TMP.y * 0.5 + 0.5) * window.innerHeight;
      n.el.style.left = `${x}px`;
      n.el.style.top = `${y}px`;
      n.el.style.opacity = `${1 - t * t}`;
    }
  }
}
