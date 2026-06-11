import { Input } from "./input";
import { TUNABLE_SLIDERS, Tunables } from "./tunables";

export interface DebugInfo {
  fps: number;
  action: string;
  phase: string;
  phaseRemainingMs: number;
  comboStep: number;
  rollCooldownMs: number;
  iFrameMs: number;
  parryOpen: boolean;
  blocking: boolean;
  parryBuff: boolean;
  hp: number;
  maxHp: number;
  mode: string;
  enemies: number;
  wave: number;
}

// Baut und pflegt das gesamte DOM-UI: Renderer-Tag, HUD, Debug-Overlay mit
// Live-Slidern, Hilfe-Panel und Touch-Steuerung.
export class Overlay {
  private debugEl!: HTMLDivElement;
  private helpEl!: HTMLDivElement;
  private touchEl!: HTMLDivElement;
  private rendererTag!: HTMLDivElement;

  private fHp!: HTMLDivElement;
  private fHpLabel!: HTMLDivElement;
  private fBuff!: HTMLDivElement;

  private rState!: HTMLSpanElement;
  private rPhase!: HTMLSpanElement;
  private rCombo!: HTMLSpanElement;
  private rRoll!: HTMLSpanElement;
  private rIframe!: HTMLSpanElement;
  private rParry!: HTMLSpanElement;
  private rMode!: HTMLSpanElement;
  private rWave!: HTMLSpanElement;
  private rFps!: HTMLSpanElement;
  private valuesOut!: HTMLPreElement;
  private sliderLabels = new Map<keyof Tunables, HTMLElement>();

  constructor(
    private readonly root: HTMLElement,
    private readonly tun: Tunables,
    private readonly input: Input,
  ) {
    this.build();
  }

  setRenderer(label: string, isWebGPU: boolean) {
    this.rendererTag.textContent = `Renderer: ${label}`;
    this.rendererTag.classList.toggle("fallback", !isWebGPU);
  }

  toggleDebug() {
    this.debugEl.classList.toggle("hidden");
  }
  toggleHelp() {
    this.helpEl.classList.toggle("hidden");
  }
  toggleTouch() {
    this.touchEl.classList.toggle("on");
  }
  get touchOn(): boolean {
    return this.touchEl.classList.contains("on");
  }

  update(i: DebugInfo) {
    this.rFps.textContent = i.fps.toFixed(0);
    this.rState.textContent = i.action;
    this.rPhase.textContent = `${i.phase} (${i.phaseRemainingMs.toFixed(0)} ms)`;
    this.rCombo.textContent = i.action === "light" ? `${i.comboStep + 1}/3` : "-";
    this.rRoll.textContent =
      i.rollCooldownMs > 0 ? `${i.rollCooldownMs.toFixed(0)} ms` : "bereit";
    this.rIframe.textContent = i.iFrameMs > 0 ? `aktiv ${i.iFrameMs.toFixed(0)} ms` : "-";
    this.rParry.textContent = i.parryOpen ? "OFFEN" : i.blocking ? "Block (zu)" : "-";
    this.rParry.style.color = i.parryOpen ? "#7bdfff" : "#aeb6c8";
    this.rMode.textContent = i.mode;
    this.rWave.textContent = `Welle ${i.wave} - ${i.enemies} Gegner`;

    const pct = Math.max(0, Math.min(100, (i.hp / i.maxHp) * 100));
    this.fHp.style.width = `${pct}%`;
    this.fHpLabel.textContent = `${Math.ceil(i.hp)} / ${i.maxHp}`;
    this.fBuff.classList.toggle("on", i.parryBuff);
  }

  private build() {
    this.rendererTag = el("div", { id: "renderer-tag" });
    this.rendererTag.textContent = "Renderer: -";
    this.root.appendChild(this.rendererTag);

    this.buildHud();
    this.buildDebug();
    this.buildHelp();
    this.buildTouch();
    this.refreshValuesOut();
  }

  private buildHud() {
    const hud = el("div", { id: "hud" });
    const bar = el("div", { class: "bar" });
    this.fHp = el("div", { class: "fill" });
    this.fHpLabel = el("div", { class: "label" });
    bar.append(this.fHp, this.fHpLabel);
    this.fBuff = el("div", { id: "buff-tag" });
    this.fBuff.textContent = "PARADE-BUFF: naechster Treffer +100%";
    hud.append(bar, this.fBuff);
    this.root.appendChild(hud);
  }

  private buildDebug() {
    const d = el("div", { id: "debug" });
    d.append(elText("h2", "Debug-Overlay (F1)"));

    const rows = el("div");
    this.rFps = this.row(rows, "FPS");
    this.rState = this.row(rows, "Aktion");
    this.rState.className = "";
    this.rPhase = this.row(rows, "Phase");
    this.rCombo = this.row(rows, "Kombo");
    this.rRoll = this.row(rows, "Rollen-Cooldown");
    this.rIframe = this.row(rows, "i-Frames");
    this.rParry = this.row(rows, "Paradefenster");
    this.rMode = this.row(rows, "Steuermodus");
    this.rWave = this.row(rows, "Welle");
    d.append(rows);

    d.append(hr());
    d.append(elText("div", "Kernzeiten live tunen:", "hint"));
    for (const s of TUNABLE_SLIDERS) {
      d.append(this.slider(s.key, s.label, s.min, s.max, s.step));
    }

    d.append(hr());
    d.append(elText("div", "Aktuelle Werte (zum Uebernehmen):", "hint"));
    this.valuesOut = el<HTMLPreElement>("pre", { id: "values-out" });
    d.append(this.valuesOut);
    const copy = el("button", { class: "copy" });
    copy.textContent = "Werte in Zwischenablage kopieren";
    copy.addEventListener("click", () => {
      navigator.clipboard?.writeText(this.valuesText()).catch(() => {});
    });
    d.append(copy);

    this.debugEl = d;
    this.root.appendChild(d);
  }

  private row(parent: HTMLElement, label: string): HTMLSpanElement {
    const r = el("div", { class: "row" });
    r.append(elText("span", label));
    const v = el<HTMLSpanElement>("span");
    r.append(v);
    parent.append(r);
    return v;
  }

  private slider(key: keyof Tunables, label: string, min: number, max: number, step: number) {
    const wrap = el("div", { class: "slider" });
    const lab = el("label");
    lab.append(elText("span", label));
    const val = el<HTMLElement>("b");
    val.textContent = `${this.tun[key]} ms`;
    lab.append(val);
    this.sliderLabels.set(key, val);

    const input = el<HTMLInputElement>("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(this.tun[key]);
    input.addEventListener("input", () => {
      this.tun[key] = Number(input.value);
      val.textContent = `${this.tun[key]} ms`;
      this.refreshValuesOut();
    });

    wrap.append(lab, input);
    return wrap;
  }

  private valuesText(): string {
    const lines = TUNABLE_SLIDERS.map((s) => `  ${s.key}: ${this.tun[s.key]},`);
    return `{\n${lines.join("\n")}\n}`;
  }

  private refreshValuesOut() {
    if (this.valuesOut) this.valuesOut.textContent = this.valuesText();
  }

  private buildHelp() {
    const h = el("div", { id: "help" });
    h.innerHTML = `
      <div><b>WASD</b> Bewegung - <b>Maus</b> zielen</div>
      <div><b>Linksklick</b> leichter Angriff (3er-Kombo)</div>
      <div><b>Shift+Links</b> / <b>Q</b> schwerer Angriff</div>
      <div><b>Rechts halten</b> blocken / Parade</div>
      <div><b>Leertaste</b> Ausweichrolle</div>
      <div><b>G</b> neue Gegnerwelle</div>
      <div><b>M</b> Klick-zu-Bewegen umschalten</div>
      <div><b>T</b> Touch-Steuerung - <b>H</b> Hilfe - <b>F1</b> Debug</div>`;
    this.helpEl = h;
    this.root.appendChild(h);
  }

  private buildTouch() {
    const t = el("div", { id: "touch" });
    const joy = el("div", { id: "joy" });
    const nub = el("div", { class: "nub" });
    joy.append(nub);
    t.append(joy);

    const light = el("div", { class: "tbtn", id: "t-light" });
    light.textContent = "Leicht";
    const heavy = el("div", { class: "tbtn", id: "t-heavy" });
    heavy.textContent = "Schwer";
    const roll = el("div", { class: "tbtn", id: "t-roll" });
    roll.textContent = "Rolle";
    t.append(light, heavy, roll);

    this.touchEl = t;
    this.root.appendChild(t);

    this.wireJoystick(joy, nub);
    this.wireButton(light, () => (this.input.trigLight = true));
    this.wireButton(heavy, () => (this.input.trigHeavy = true));
    this.wireButton(roll, () => (this.input.trigRoll = true));
  }

  private wireJoystick(joy: HTMLElement, nub: HTMLElement) {
    let id = -1;
    const max = 50;
    const onMove = (cx: number, cy: number) => {
      const r = joy.getBoundingClientRect();
      let dx = cx - (r.left + r.width / 2);
      let dy = cy - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy) || 1;
      const cl = Math.min(len, max);
      dx = (dx / len) * cl;
      dy = (dy / len) * cl;
      nub.style.transform = `translate(${dx}px, ${dy}px)`;
      this.input.touchMove.set(dx / max, -dy / max);
      this.input.touchActive = true;
    };
    const reset = () => {
      id = -1;
      nub.style.transform = "translate(0,0)";
      this.input.touchMove.set(0, 0);
      this.input.touchActive = false;
    };
    joy.addEventListener("pointerdown", (e) => {
      id = e.pointerId;
      joy.setPointerCapture(id);
      onMove(e.clientX, e.clientY);
    });
    joy.addEventListener("pointermove", (e) => {
      if (e.pointerId === id) onMove(e.clientX, e.clientY);
    });
    joy.addEventListener("pointerup", reset);
    joy.addEventListener("pointercancel", reset);
  }

  private wireButton(elm: HTMLElement, fire: () => void) {
    elm.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      fire();
    });
  }
}

// ---- kleine DOM-Helfer --------------------------------------------------
function el<T extends HTMLElement = HTMLDivElement>(
  tag: string,
  attrs: Record<string, string> = {},
): T {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else e.setAttribute(k, v);
  }
  return e as unknown as T;
}

function elText(tag: string, text: string, cls?: string): HTMLElement {
  const e = document.createElement(tag);
  e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

function hr(): HTMLElement {
  return document.createElement("hr");
}
