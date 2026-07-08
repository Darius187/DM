// MENUE-PROBE (R106, Autorauftrag "Menue im Stil 1300/1400 wie das Mockup, aber
// flexibel"): isolierte, INTERAKTIVE Vorschau des Mittelalter-UI-Systems
// (src/ui/medieval-ui.css + medievalUi.ts) - zwei Panels wie im Autor-Mockup
// (AUSWAHL-Einheitenkarte + BANNER/HEER), mit Demo-Daten. Bewusst OHNE Spiel-
// Logik: erst gefallen lassen, dann Schritt fuer Schritt die echte RTS-Leiste
// darauf umziehen. Ereignisse landen sichtbar im Ereignis-Feld unten.
import Phaser from 'phaser';
import {
  mvWurzel, mvAllesEntfernen, mvPanel, mvKnopf, mvTabs, mvBalken,
  mvTrenner, mvStatReihe, mvKarte, mvSlots, mvAbzeichen, mvSchalter,
} from '../ui/medievalUi';

export class UIProbe extends Phaser.Scene {
  constructor() { super({ key: 'UIProbe' }); }

  private log?: HTMLDivElement;

  create(): void {
    const w = this.scale.width, h = this.scale.height;
    // dunkler Vignetten-Hintergrund (Atmosphaere wie im Mockup)
    this.add.rectangle(0, 0, w, h, 0x141a10).setOrigin(0);
    const vig = this.add.graphics();
    vig.fillStyle(0x000000, 0.5);
    vig.fillCircle(w / 2, h / 2, Math.max(w, h));
    vig.setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.add.text(w / 2, 16, 'MENÜ-PROBE · Mittelalter-UI-System (DOM/CSS über Phaser)', {
      fontFamily: 'serif', fontSize: '15px', color: '#c9a227', letterSpacing: 2,
    }).setOrigin(0.5, 0);
    this.add.text(w / 2, h - 14, 'Alles klickbar: Tabs, Karten, Knöpfe, Schalter · Fenster am Kopf ziehbar · [ESC] zurück', {
      fontFamily: 'serif', fontSize: '12px', color: '#8a7a5a',
    }).setOrigin(0.5, 1);

    mvWurzel();
    this.baueAuswahlPanel(Math.max(16, w / 2 - 560), 70);
    this.baueBannerPanel(Math.min(w - 356, w / 2 + 120), 70);
    this.baueEreignisFeld(Math.max(16, w / 2 - 560), h - 160);

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'));
    // DOM beim Verlassen IMMER wegraeumen (Risiko-Checkliste: globale Reste)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => mvAllesEntfernen());
  }

  private melde(text: string): void {
    if (!this.log) return;
    const zeile = document.createElement('div');
    zeile.textContent = `→ ${text}`;
    this.log.prepend(zeile);
    while (this.log.children.length > 5) this.log.lastChild?.remove();
  }

  // Linkes Panel: Einheiten-Details (wie Mockup links).
  private baueAuswahlPanel(x: number, y: number): void {
    const p = mvPanel({ titel: 'Auswahl', wappen: '⚜', x, y, breite: 330 });
    const tabs = mvTabs(
      [{ id: 'gebaeude', label: 'Gebäude' }, { id: 'einheit', label: 'Einheit' }],
      'einheit', (id) => this.melde(`Tab gewechselt: ${id}`),
    );
    p.el.insertBefore(tabs.el, p.inhalt);

    const kopfzeile = document.createElement('div');
    kopfzeile.style.cssText = 'display:flex;gap:10px;align-items:center';
    const wappen = document.createElement('div');
    wappen.className = 'mv-karte-icon';
    wappen.style.cssText = 'width:44px;height:44px;font-size:22px';
    wappen.textContent = '🏠';
    const namen = document.createElement('div');
    namen.innerHTML = '<div class="mv-titelgross">Aldric v. Weiden</div><div class="mv-untertitel">Schildträger · Stufe 4</div>';
    kopfzeile.append(wappen, namen);
    p.inhalt.appendChild(kopfzeile);

    const leben = mvBalken('Leben', 86, 105, 'rot');
    const moral = mvBalken('Moral', 72, 100, 'gelb', false);
    p.inhalt.append(leben.el, moral.el);
    p.inhalt.appendChild(mvStatReihe([
      { label: 'Angr', wert: 24, symbol: '⚔' },
      { label: 'Vert', wert: 31, symbol: '🛡' },
      { label: 'Tempo', wert: 12, symbol: '🥾' },
    ]));
    p.inhalt.appendChild(mvTrenner('Ausrüstung'));
    p.inhalt.appendChild(mvSlots(['⚔', '🛡', null, '⛑'], (i) => this.melde(`Ausrüstungs-Slot ${i + 1} angeklickt`)));
    p.inhalt.appendChild(mvTrenner('Einzelbefehl'));
    const reihe1 = document.createElement('div');
    reihe1.className = 'mv-zeile';
    reihe1.append(
      mvKnopf('Folgen', () => this.melde('Befehl: Folgen')),
      mvKnopf('Angreifen', () => this.melde('Befehl: Angreifen'), { primaer: true }),
      mvKnopf('Halten', () => this.melde('Befehl: Halten')),
    );
    const reihe2 = document.createElement('div');
    reihe2.className = 'mv-zeile';
    reihe2.style.marginTop = '8px';
    reihe2.append(
      mvKnopf('Zurückziehen', () => this.melde('Befehl: Zurückziehen')),
      mvKnopf('Patrouille', () => this.melde('Befehl: Patrouille')),
    );
    p.inhalt.append(reihe1, reihe2);
  }

  // Rechtes Panel: Banner/Heer (wie Mockup rechts).
  private baueBannerPanel(x: number, y: number): void {
    const p = mvPanel({ titel: 'Banner', wappen: '🦁', x, y, breite: 340, onSchliessen: () => this.melde('Banner-Panel: Schließen angeklickt (Probe: bleibt offen)') });
    const ressourcen = mvAbzeichen([{ kuerzel: 'H', wert: 240 }, { kuerzel: 'S', wert: 85 }, { kuerzel: 'F', wert: 120 }]);
    p.inhalt.appendChild(ressourcen.el);
    const tabs = mvTabs(
      [{ id: 'bauen', label: 'Bauen' }, { id: 'heer', label: 'Heer' }],
      'heer', (id) => this.melde(`Banner-Tab: ${id}`),
    );
    tabs.el.style.marginTop = '8px';
    p.inhalt.appendChild(tabs.el);
    p.inhalt.appendChild(mvTrenner('Truppen'));

    const karten: Array<ReturnType<typeof mvKarte>> = [];
    const daten = [
      { icon: '🛡', name: 'Schildträger', typ: 'Nahkampf · Front', anzahl: 8, anteil: 0.9 },
      { icon: '⚔', name: 'Gewappneter', typ: 'Nahkampf · schwer', anzahl: 5, anteil: 0.72 },
      { icon: '🏹', name: 'Bogenschütze', typ: 'Fernkampf', anzahl: 6, anteil: 0.55 },
      { icon: '🐎', name: 'Ritter', typ: 'Elite · Kavallerie', anzahl: 2, anteil: 0.95 },
    ];
    daten.forEach((d, i) => {
      const karte = mvKarte({
        ...d,
        onKlick: () => {
          karten.forEach((k, j) => k.setzeGewaehlt(i === j));
          this.melde(`Einheit gewählt: ${d.name}`);
        },
      });
      karten.push(karte);
      p.inhalt.appendChild(karte.el);
    });
    karten[2].setzeGewaehlt(true);   // wie im Mockup: Bogenschütze gewaehlt

    p.inhalt.appendChild(mvTrenner('Befehle der Auswahl'));
    const schild = mvSchalter('Schildhaltung', true, (an) => this.melde(`Schildhaltung: ${an ? 'AN' : 'AUS'}`), '🛡');
    p.inhalt.appendChild(schild.el);
    const haltung = document.createElement('div');
    haltung.className = 'mv-untertitel';
    haltung.style.cssText = 'margin:6px 0 4px;letter-spacing:.12em;text-transform:uppercase';
    haltung.textContent = 'Haltung';
    p.inhalt.appendChild(haltung);
    const reihe = document.createElement('div');
    reihe.className = 'mv-zeile';
    reihe.append(
      mvKnopf('Angriff', () => this.melde('Haltung: Angriff')),
      mvKnopf('Verteidigen', () => this.melde('Haltung: Verteidigen'), { primaer: true }),
      mvKnopf('Halten', () => this.melde('Haltung: Halten')),
    );
    p.inhalt.appendChild(reihe);
  }

  // Kleines Pergament-Feld, das die ausgeloesten Ereignisse zeigt - so sieht der
  // Autor sofort, dass alles echte Klicks sind (kein Bild).
  private baueEreignisFeld(x: number, y: number): void {
    const p = mvPanel({ titel: 'Ereignisse (Probe)', wappen: '📜', x, y, breite: 330 });
    this.log = document.createElement('div');
    this.log.style.cssText = 'font-size:12px;min-height:84px;color:var(--mv-tinte)';
    this.log.innerHTML = '<div style="opacity:.6">Noch nichts angeklickt ...</div>';
    p.inhalt.appendChild(this.log);
  }
}
