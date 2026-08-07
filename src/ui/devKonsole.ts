// DEV-KONSOLE (Runde 72, Autorwunsch): EINE In-Game-Konsole mit Tabs - ab jetzt
// landet hier ALLES Einstellbare. Generisches DOM-Panel: Tabs oben, je Tab eine
// Liste Regler (Schieber/Farbe/Knopf/Notiz). Verschiebbar (Kopfzeile), getoggelt
// per F10 in der WorldScene. Die WorldScene verdrahtet die Tabs mit den Systemen.

export type DKControl =
  | { kind: 'slider'; label: string; min: number; max: number; step: number; get: () => number; set: (v: number) => void; fmt?: (v: number) => string }
  | { kind: 'color'; label: string; get: () => [number, number, number]; set: (c: [number, number, number]) => void }
  | { kind: 'button'; label: () => string; onClick: () => void }
  | { kind: 'note'; text: string };

export interface DKTab { name: string; controls: () => DKControl[]; }

function hex2rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function rgb2hex(c: [number, number, number]): string {
  const h = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
  return `#${h(c[0])}${h(c[1])}${h(c[2])}`;
}

export class DevKonsole {
  private wurzel: HTMLDivElement;
  private koerper: HTMLDivElement;
  private tabLeiste: HTMLDivElement;
  private aktiv = 0;
  sichtbar = false;

  constructor(private tabs: DKTab[]) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;right:12px;top:12px;z-index:60;width:264px;max-height:calc(100vh - 24px);overflow:hidden;display:none;flex-direction:column;background:rgba(8,12,18,0.92);border:1px solid #3a4a5a;border-radius:8px;color:#cdd8c4;font:11px Georgia,serif;text-shadow:0 1px 2px #000;box-shadow:0 8px 30px rgba(0,0,0,.5);';
    this.wurzel = d;
    // Kopfzeile (Griff zum Verschieben)
    const kopf = document.createElement('div');
    kopf.textContent = 'DEV-KONSOLE (F10)';
    kopf.style.cssText = 'cursor:move;font-weight:bold;color:#e8dcc0;padding:7px 10px;background:#16202c;border-bottom:1px solid #2a3a4a;user-select:none;';
    this.macheZiehbar(kopf);
    d.append(kopf);
    // Tab-Leiste
    this.tabLeiste = document.createElement('div');
    this.tabLeiste.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;padding:6px;background:#0e1620;';
    d.append(this.tabLeiste);
    // Scrollbarer Körper
    this.koerper = document.createElement('div');
    this.koerper.style.cssText = 'padding:8px 10px;overflow-y:auto;';
    d.append(this.koerper);
    document.body.appendChild(d);
    this.render();
  }

  private macheZiehbar(griff: HTMLElement): void {
    let zieht = false, sx = 0, sy = 0, ox = 0, oy = 0;
    griff.addEventListener('pointerdown', (e) => {
      zieht = true; sx = e.clientX; sy = e.clientY;
      const r = this.wurzel.getBoundingClientRect(); ox = r.left; oy = r.top;
      this.wurzel.style.right = 'auto'; this.wurzel.style.left = `${ox}px`; this.wurzel.style.top = `${oy}px`;
      e.preventDefault();
    });
    window.addEventListener('pointermove', (e) => {
      if (!zieht) return;
      this.wurzel.style.left = `${ox + (e.clientX - sx)}px`;
      this.wurzel.style.top = `${Math.max(0, oy + (e.clientY - sy))}px`;
    });
    window.addEventListener('pointerup', () => { zieht = false; });
  }

  toggle(): void { this.sichtbar = !this.sichtbar; this.wurzel.style.display = this.sichtbar ? 'flex' : 'none'; if (this.sichtbar) this.render(); }
  istSichtbar(): boolean { return this.sichtbar; }
  trifft(px: number, py: number): boolean {
    if (!this.sichtbar) return false;
    const r = this.wurzel.getBoundingClientRect();
    return px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
  }
  destroy(): void { this.wurzel.remove(); }
  refresh(): void { this.render(); }

  private render(): void {
    // Tabs
    this.tabLeiste.innerHTML = '';
    this.tabs.forEach((t, i) => {
      const b = document.createElement('button');
      b.textContent = t.name; const an = i === this.aktiv;
      b.style.cssText = `cursor:pointer;border-radius:5px;padding:5px 7px;font:10px Georgia,serif;border:1px solid ${an ? '#6aa0ff' : '#2a3a4a'};background:${an ? '#1e3a52' : '#141d28'};color:#e8dcc0;`;
      b.addEventListener('click', () => { this.aktiv = i; this.render(); });
      this.tabLeiste.append(b);
    });
    // Körper
    const k = this.koerper; k.innerHTML = '';
    const tab = this.tabs[this.aktiv]; if (!tab) return;
    for (const c of tab.controls()) this.baueControl(k, c);
  }

  private baueControl(parent: HTMLElement, c: DKControl): void {
    if (c.kind === 'note') {
      const n = document.createElement('div'); n.textContent = c.text;
      n.style.cssText = 'font-size:10px;color:#8aa0b4;margin:6px 0;line-height:1.4;';
      parent.append(n); return;
    }
    if (c.kind === 'button') {
      const b = document.createElement('button'); b.textContent = c.label();
      b.style.cssText = 'width:100%;cursor:pointer;border-radius:5px;padding:6px 0;margin:4px 0;font:inherit;background:#243018;color:#e8dcc0;border:1px solid #3a4a24;';
      b.addEventListener('click', () => { c.onClick(); b.textContent = c.label(); });
      parent.append(b); return;
    }
    if (c.kind === 'color') {
      const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin:4px 0;';
      const lab = document.createElement('span'); lab.textContent = c.label; lab.style.cssText = 'font-size:10px;color:#9fb0b8;';
      const inp = document.createElement('input'); inp.type = 'color'; inp.value = rgb2hex(c.get());
      inp.style.cssText = 'width:40px;height:22px;border:none;background:none;cursor:pointer;';
      inp.addEventListener('input', () => c.set(hex2rgb(inp.value)));
      row.append(lab, inp); parent.append(row); return;
    }
    // slider
    const row = document.createElement('div'); row.style.margin = '4px 0';
    const val = c.get();
    const lab = document.createElement('div'); lab.textContent = `${c.label}: ${c.fmt ? c.fmt(val) : val.toFixed(2)}`;
    lab.style.cssText = 'font-size:10px;color:#9fb0b8;margin-bottom:1px;';
    const inp = document.createElement('input'); inp.type = 'range';
    inp.min = String(c.min); inp.max = String(c.max); inp.step = String(c.step); inp.value = String(val);
    inp.style.cssText = 'width:100%;';
    inp.addEventListener('input', () => { const v = parseFloat(inp.value); c.set(v); lab.textContent = `${c.label}: ${c.fmt ? c.fmt(v) : v.toFixed(2)}`; });
    row.append(lab, inp); parent.append(row);
  }
}
