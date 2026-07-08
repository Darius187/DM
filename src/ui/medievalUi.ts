// MITTELALTER-UI-BAUSTEINE (R106): kleine DOM-Fabriken fuer das Design-System in
// medieval-ui.css. Phaser bleibt fuers Spiel zustaendig; Menues liegen als DOM-
// Overlay ueber dem Canvas (#game) und melden Klicks per Callback zurueck.
// Bewusst OHNE Framework - nur document.createElement, damit es in jeder Szene
// nutzbar ist und in der Alpha leicht umgebaut werden kann.
import './medieval-ui.css';

// Wurzel-Overlay ueber dem Spiel-Canvas (einmalig, Kinder fangen selbst Klicks).
export function mvWurzel(): HTMLDivElement {
  const vorhandene = document.getElementById('mv-root');
  if (vorhandene) return vorhandene as HTMLDivElement;
  const el = document.createElement('div');
  el.id = 'mv-root';
  el.className = 'mv-root';
  (document.getElementById('game') ?? document.body).appendChild(el);
  return el;
}

// Alles wegraeumen (Szenenwechsel): Wurzel leeren statt einzelne Panels zu jagen.
export function mvAllesEntfernen(): void {
  document.getElementById('mv-root')?.remove();
}

export interface MvPanel {
  el: HTMLDivElement;        // das Panel selbst (absolut positioniert)
  inhalt: HTMLDivElement;    // Inhaltsbereich unter der Kopfzeile
  zerstoere: () => void;
}

// Panel mit Kopfzeile (Ziehgriff, UI-Regel 11) und optionalem Schliessen-Knopf.
export function mvPanel(opts: {
  titel: string; wappen?: string; x: number; y: number; breite: number;
  onSchliessen?: () => void;
}): MvPanel {
  const root = mvWurzel();
  const el = document.createElement('div');
  el.className = 'mv-panel';
  el.style.left = `${opts.x}px`;
  el.style.top = `${opts.y}px`;
  el.style.width = `${opts.breite}px`;
  const kopf = document.createElement('div');
  kopf.className = 'mv-kopf';
  const wappen = document.createElement('span');
  wappen.className = 'mv-wappen';
  wappen.textContent = opts.wappen ?? '🛡';
  const titel = document.createElement('span');
  titel.textContent = opts.titel;
  kopf.append(wappen, titel);
  if (opts.onSchliessen) {
    const zu = document.createElement('span');
    zu.className = 'mv-zu';
    zu.textContent = '✕';
    zu.addEventListener('pointerdown', (e) => { e.stopPropagation(); opts.onSchliessen?.(); });
    kopf.appendChild(zu);
  }
  const inhalt = document.createElement('div');
  inhalt.className = 'mv-inhalt';
  el.append(kopf, inhalt);
  root.appendChild(el);
  // Ziehen ueber Schirmkoordinaten-Delta (wie die Phaser-Fenster).
  let start: { px: number; py: number; ex: number; ey: number } | null = null;
  kopf.addEventListener('pointerdown', (e) => {
    start = { px: e.clientX, py: e.clientY, ex: el.offsetLeft, ey: el.offsetTop };
    kopf.setPointerCapture(e.pointerId);
  });
  kopf.addEventListener('pointermove', (e) => {
    if (!start) return;
    const maxX = Math.max(0, (root.clientWidth || window.innerWidth) - el.offsetWidth);
    const maxY = Math.max(0, (root.clientHeight || window.innerHeight) - 40);
    el.style.left = `${Math.min(maxX, Math.max(0, start.ex + e.clientX - start.px))}px`;
    el.style.top = `${Math.min(maxY, Math.max(0, start.ey + e.clientY - start.py))}px`;
  });
  const ende = (): void => { start = null; };
  kopf.addEventListener('pointerup', ende);
  kopf.addEventListener('pointercancel', ende);
  return { el, inhalt, zerstoere: () => el.remove() };
}

export function mvKnopf(label: string, onKlick: () => void, opts?: { primaer?: boolean; aus?: boolean }): HTMLDivElement {
  const b = document.createElement('div');
  b.className = 'mv-btn' + (opts?.primaer ? ' mv-primaer' : '') + (opts?.aus ? ' mv-aus' : '');
  b.textContent = label;
  b.addEventListener('pointerdown', (e) => { e.stopPropagation(); onKlick(); });
  return b;
}

// Tab-Zeile; gibt einen Umschalter zurueck, damit der Aufrufer aktiv setzen kann.
export function mvTabs(tabs: Array<{ id: string; label: string }>, aktivId: string, onWechsel: (id: string) => void): { el: HTMLDivElement; setzeAktiv: (id: string) => void } {
  const el = document.createElement('div');
  el.className = 'mv-tabs';
  const knoepfe = new Map<string, HTMLDivElement>();
  const setzeAktiv = (id: string): void => {
    for (const [tid, k] of knoepfe) k.classList.toggle('mv-aktiv', tid === id);
  };
  for (const t of tabs) {
    const k = document.createElement('div');
    k.className = 'mv-tab';
    k.textContent = t.label;
    k.addEventListener('pointerdown', () => { setzeAktiv(t.id); onWechsel(t.id); });
    knoepfe.set(t.id, k);
    el.appendChild(k);
  }
  setzeAktiv(aktivId);
  return { el, setzeAktiv };
}

// Werte-Balken mit Label + Zahl; set() aktualisiert Fuellung und Anzeige.
export function mvBalken(label: string, wert: number, max: number, variante: 'rot' | 'gelb' | 'gruen' = 'rot', zeigeMax = true): { el: HTMLDivElement; set: (w: number, m?: number) => void } {
  const wrap = document.createElement('div');
  const zeile = document.createElement('div');
  zeile.className = 'mv-bar-zeile';
  const lab = document.createElement('span');
  lab.className = 'mv-bar-label';
  lab.textContent = label;
  const zahl = document.createElement('span');
  zahl.className = 'mv-bar-wert';
  const bar = document.createElement('div');
  bar.className = 'mv-bar';
  const fuellung = document.createElement('div');
  fuellung.className = 'mv-bar-fuellung' + (variante === 'gruen' ? ' mv-gruen' : variante === 'gelb' ? ' mv-gelb' : '');
  bar.appendChild(fuellung);
  zeile.append(lab, zahl);
  wrap.append(zeile, bar);
  let m = max;
  const set = (w: number, neuMax?: number): void => {
    if (neuMax !== undefined) m = neuMax;
    fuellung.style.width = `${Math.max(0, Math.min(100, (w / Math.max(1, m)) * 100))}%`;
    zahl.textContent = zeigeMax ? `${Math.round(w)} / ${Math.round(m)}` : `${Math.round(w)}`;
  };
  set(wert);
  return { el: wrap, set };
}

export function mvTrenner(text?: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'mv-trenner';
  el.textContent = text ? `✦ ${text} ✦` : '✦';
  return el;
}

export function mvStatReihe(werte: Array<{ label: string; wert: string | number; symbol?: string }>): HTMLDivElement {
  const reihe = document.createElement('div');
  reihe.className = 'mv-statreihe';
  for (const s of werte) {
    const k = document.createElement('div');
    k.className = 'mv-statkachel';
    k.innerHTML = `<div class="mv-stat-label">${s.label}</div><div class="mv-stat-wert">${s.wert}</div><div class="mv-stat-symbol">${s.symbol ?? ''}</div>`;
    reihe.appendChild(k);
  }
  return reihe;
}

// Einheiten-Karte (Icon, Name, Typ, Anzahl, Staerke-Balken); waehlbar.
export function mvKarte(opts: { icon: string; name: string; typ: string; anzahl?: number; anteil?: number; onKlick?: () => void }): { el: HTMLDivElement; setzeGewaehlt: (an: boolean) => void } {
  const el = document.createElement('div');
  el.className = 'mv-karte';
  const icon = document.createElement('div');
  icon.className = 'mv-karte-icon';
  icon.textContent = opts.icon;
  const mitte = document.createElement('div');
  mitte.className = 'mv-karte-mitte';
  const bar = opts.anteil !== undefined
    ? `<div class="mv-bar"><div class="mv-bar-fuellung mv-gruen" style="width:${Math.round(opts.anteil * 100)}%"></div></div>` : '';
  mitte.innerHTML = `<div class="mv-karte-name">${opts.name}</div><div class="mv-karte-typ">${opts.typ}</div>${bar}`;
  el.append(icon, mitte);
  if (opts.anzahl !== undefined) {
    const anzahl = document.createElement('div');
    anzahl.className = 'mv-karte-anzahl';
    anzahl.textContent = `x${opts.anzahl}`;
    el.appendChild(anzahl);
  }
  if (opts.onKlick) el.addEventListener('pointerdown', opts.onKlick);
  return { el, setzeGewaehlt: (an) => el.classList.toggle('mv-gewaehlt', an) };
}

export function mvSlots(symbole: Array<string | null>, onKlick?: (index: number) => void): HTMLDivElement {
  const reihe = document.createElement('div');
  reihe.className = 'mv-slots';
  symbole.forEach((s, i) => {
    const slot = document.createElement('div');
    slot.className = 'mv-slot' + (s ? '' : ' mv-leer');
    slot.textContent = s ?? '·';
    if (onKlick) slot.addEventListener('pointerdown', () => onKlick(i));
    reihe.appendChild(slot);
  });
  return reihe;
}

// Ressourcen-Abzeichen-Reihe (Muenz-Symbol + Wert), z.B. Holz/Stein/Nahrung.
export function mvAbzeichen(eintraege: Array<{ kuerzel: string; wert: number | string }>): { el: HTMLDivElement; set: (kuerzel: string, wert: number | string) => void } {
  const reihe = document.createElement('div');
  reihe.className = 'mv-abzeichen-reihe';
  const werte = new Map<string, HTMLSpanElement>();
  for (const e of eintraege) {
    const a = document.createElement('div');
    a.className = 'mv-abzeichen';
    const muenze = document.createElement('span');
    muenze.className = 'mv-muenze';
    muenze.textContent = e.kuerzel;
    const zahl = document.createElement('span');
    zahl.textContent = String(e.wert);
    a.append(muenze, zahl);
    werte.set(e.kuerzel, zahl);
    reihe.appendChild(a);
  }
  return { el: reihe, set: (k, w) => { const z = werte.get(k); if (z) z.textContent = String(w); } };
}

// An/Aus-Schalterzeile (z.B. "Schildhaltung ... AN").
export function mvSchalter(label: string, an: boolean, onWechsel: (an: boolean) => void, symbol?: string): { el: HTMLDivElement; setze: (an: boolean) => void } {
  const el = document.createElement('div');
  el.className = 'mv-schalter-zeile';
  const status = document.createElement('span');
  status.className = 'mv-schalter-status';
  const setze = (a: boolean): void => {
    status.textContent = a ? 'AN' : 'AUS';
    status.style.color = a ? 'var(--mv-gruen)' : 'var(--mv-rot)';
  };
  el.innerHTML = `${symbol ? `${symbol} ` : ''}${label}`;
  el.appendChild(status);
  let zustand = an;
  setze(zustand);
  el.addEventListener('pointerdown', () => { zustand = !zustand; setze(zustand); onWechsel(zustand); });
  return { el, setze };
}
