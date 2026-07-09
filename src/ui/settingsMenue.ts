// SETTINGS-MENUE im Vorlage-Stil (R112, reference/menue-vorlage-1300.png):
// Holzrahmen + Eisenecken, Leder-Buchreiter links, Pergament-Banner mit Siegel,
// Messing-Regler, dunkle Wert-/Tasten-Knoepfe, unten STANDARD/ZURUECK mit
// Siegelband. Reines DOM/CSS ueber dem Canvas (medieval-ui.css) - die
// SettingsScene liefert Daten + Callbacks, dieses Modul baut NUR die Optik.
import { wendeMvTexturenAn } from './mvTexturen';
import './medieval-ui.css';

export type MenueTabId = 'ton' | 'bild' | 'grafik' | 'steuerung' | 'allgemein';

export interface MenueRegler { art: 'regler'; label: string; icon?: string; min: number; max: number; get: () => number; set: (v: number) => void }
export interface MenueSchalter { art: 'schalter'; label: string; get: () => boolean; tun: () => void }
export interface MenueWahl { art: 'wahl'; label: string; optionen: string[]; get: () => number; set: (i: number) => void }
export interface MenueTaste { art: 'taste'; label: string; id: string; get: () => string }
export interface MenueAbschnitt { art: 'abschnitt'; titel: string }
export interface MenueHinweis { art: 'hinweis'; text: string }
export type MenueZeile = MenueRegler | MenueSchalter | MenueWahl | MenueTaste | MenueAbschnitt | MenueHinweis;

export interface SettingsMenueOpts {
  tabs: Array<{ id: MenueTabId; label: string; icon: string; farbe: 'rot' | 'gruen' | 'blau' | 'braun' | 'grau'; zweispaltig?: boolean }>;
  inhalt: (tab: MenueTabId) => MenueZeile[];
  onStandard: () => void;
  onZurueck: () => void;
  // Tasten-Neubelegung: Modul meldet "will Taste fuer id", Szene faengt den
  // Druck und ruft dann tasteGesetzt() zum Aktualisieren.
  onTasteAnfordern: (id: string) => void;
}

export interface SettingsMenue {
  el: HTMLDivElement;
  zeigeTab: (id: MenueTabId) => void;
  tasteGesetzt: (id: string, label: string) => void;
  zerstoere: () => void;
}

export function baueSettingsMenue(opts: SettingsMenueOpts): SettingsMenue {
  wendeMvTexturenAn();
  const wurzel = document.createElement('div');
  wurzel.className = 'mv-root mv-settings-wurzel';
  (document.getElementById('game') ?? document.body).appendChild(wurzel);

  const rahmen = document.createElement('div');
  rahmen.className = 'mv-rahmen';
  rahmen.innerHTML = '<div class="mv-ecke-l"></div><div class="mv-ecke-r"></div>';
  wurzel.appendChild(rahmen);

  const banner = document.createElement('div');
  banner.className = 'mv-titelbanner';
  banner.textContent = 'Einstellungen';
  const siegel = document.createElement('div');
  siegel.className = 'mv-siegel';
  siegel.textContent = '❋';
  banner.appendChild(siegel);
  rahmen.appendChild(banner);

  const tabsBox = document.createElement('div');
  tabsBox.className = 'mv-buchtabs';
  rahmen.appendChild(tabsBox);

  const flaeche = document.createElement('div');
  flaeche.className = 'mv-pergamentflaeche';
  rahmen.appendChild(flaeche);

  const fuss = document.createElement('div');
  fuss.className = 'mv-fussleiste';
  const standard = document.createElement('div');
  standard.className = 'mv-lederknopf mv-gruen';
  standard.textContent = 'Standard';
  standard.addEventListener('pointerdown', () => opts.onStandard());
  const band = document.createElement('div');
  band.className = 'mv-siegel-band';
  band.textContent = '❋';
  const zurueck = document.createElement('div');
  zurueck.className = 'mv-lederknopf mv-rot';
  zurueck.textContent = 'Zurück';
  zurueck.addEventListener('pointerdown', () => opts.onZurueck());
  fuss.append(standard, band, zurueck);
  rahmen.appendChild(fuss);

  const tabEls = new Map<MenueTabId, HTMLDivElement>();
  const tastenKnoepfe = new Map<string, HTMLDivElement>();
  let aktiverTab: MenueTabId = opts.tabs[0].id;

  const zeigeTab = (id: MenueTabId): void => {
    aktiverTab = id;
    for (const [tid, el] of tabEls) el.classList.toggle('mv-aktiv', tid === id);
    const def = opts.tabs.find((t) => t.id === id);
    flaeche.classList.toggle('mv-zweispaltig', !!def?.zweispaltig);
    flaeche.replaceChildren();
    tastenKnoepfe.clear();
    for (const zeile of opts.inhalt(id)) flaeche.appendChild(baueZeile(zeile, opts, tastenKnoepfe));
  };

  for (const t of opts.tabs) {
    const el = document.createElement('div');
    el.className = `mv-buchtab mv-${t.farbe}`;
    el.innerHTML = `<span class="mv-buchtab-icon">${t.icon}</span><span>${t.label}</span>`;
    el.addEventListener('pointerdown', () => zeigeTab(t.id));
    tabEls.set(t.id, el);
    tabsBox.appendChild(el);
  }
  zeigeTab(aktiverTab);

  return {
    el: wurzel,
    zeigeTab,
    tasteGesetzt: (id, label) => { const k = tastenKnoepfe.get(id); if (k) k.textContent = label; },
    zerstoere: () => wurzel.remove(),
  };
}

function baueZeile(z: MenueZeile, opts: SettingsMenueOpts, tastenKnoepfe: Map<string, HTMLDivElement>): HTMLElement {
  if (z.art === 'abschnitt') {
    const el = document.createElement('div');
    el.className = 'mv-abschnitt mv-block';
    el.textContent = z.titel;
    return el;
  }
  if (z.art === 'hinweis') {
    const el = document.createElement('div');
    el.className = 'mv-fussnote mv-block';
    el.textContent = z.text;
    return el;
  }
  if (z.art === 'regler') return baueRegler(z);
  if (z.art === 'wahl') {
    const el = document.createElement('div');
    el.className = 'mv-zeile-knopf mv-block';
    const lab = document.createElement('span');
    lab.className = 'mv-zeile-label';
    lab.textContent = z.label;
    const knopf = document.createElement('div');
    knopf.className = 'mv-wertknopf';
    const zeige = (): void => { knopf.textContent = `${z.optionen[z.get()]} ▾`; };
    zeige();
    knopf.addEventListener('pointerdown', () => { z.set((z.get() + 1) % z.optionen.length); zeige(); });
    el.append(lab, knopf);
    return el;
  }
  if (z.art === 'taste') {
    const el = document.createElement('div');
    el.className = 'mv-zeile-knopf mv-block';
    const lab = document.createElement('span');
    lab.className = 'mv-zeile-label';
    lab.textContent = z.label;
    const knopf = document.createElement('div');
    knopf.className = 'mv-wertknopf';
    knopf.textContent = z.get();
    knopf.addEventListener('pointerdown', () => { knopf.textContent = 'Taste drücken …'; opts.onTasteAnfordern(z.id); });
    tastenKnoepfe.set(z.id, knopf);
    el.append(lab, knopf);
    return el;
  }
  // Schalter: dunkler Wert-Knopf mit Ein/Aus (wie die Dropdowns der Vorlage)
  const el = document.createElement('div');
  el.className = 'mv-zeile-knopf mv-block';
  const lab = document.createElement('span');
  lab.className = 'mv-zeile-label';
  lab.textContent = z.label;
  const knopf = document.createElement('div');
  knopf.className = 'mv-wertknopf';
  const zeige = (): void => { knopf.textContent = z.get() ? 'Ein ▾' : 'Aus ▾'; };
  zeige();
  knopf.addEventListener('pointerdown', () => { z.tun(); zeige(); });
  el.append(lab, knopf);
  return el;
}

function baueRegler(z: MenueRegler): HTMLElement {
  const el = document.createElement('div');
  el.className = 'mv-regler-zeile mv-block';
  const icon = document.createElement('span');
  icon.className = 'mv-regler-icon';
  icon.textContent = z.icon ?? '';
  const lab = document.createElement('span');
  lab.className = 'mv-regler-label';
  lab.textContent = z.label;
  const regler = document.createElement('div');
  regler.className = 'mv-regler';
  regler.innerHTML = '<div class="mv-schiene"></div><div class="mv-fuellung"></div><div class="mv-knopf"></div>';
  const fuellung = regler.querySelector('.mv-fuellung') as HTMLDivElement;
  const knopf = regler.querySelector('.mv-knopf') as HTMLDivElement;
  const wert = document.createElement('span');
  wert.className = 'mv-regler-wert';
  const zeige = (): void => {
    const f = Math.max(0, Math.min(1, (z.get() - z.min) / (z.max - z.min)));
    fuellung.style.width = `${f * 100}%`;
    knopf.style.left = `${f * 100}%`;
    wert.textContent = `${z.get()}%`;
  };
  zeige();
  const setzeAn = (clientX: number): void => {
    const r = regler.getBoundingClientRect();
    const rel = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    z.set(Math.round((z.min + rel * (z.max - z.min)) / 5) * 5);
    zeige();
  };
  regler.addEventListener('pointerdown', (e) => {
    regler.setPointerCapture(e.pointerId);
    setzeAn(e.clientX);
    const move = (ev: PointerEvent): void => setzeAn(ev.clientX);
    const up = (): void => { regler.removeEventListener('pointermove', move); regler.removeEventListener('pointerup', up); };
    regler.addEventListener('pointermove', move);
    regler.addEventListener('pointerup', up);
  });
  el.append(icon, lab, regler, wert);
  return el;
}
