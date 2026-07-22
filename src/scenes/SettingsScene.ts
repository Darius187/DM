// Einstellungen (R107 Kategorien, R112 Vorlage-Optik): die Oberflaeche ist ein
// DOM/CSS-Menue im Stil der Autor-Vorlage (reference/menue-vorlage-1300.png,
// gebaut in src/ui/settingsMenue.ts). Diese Szene liefert nur noch DATEN +
// CALLBACKS (Settings lesen/schreiben, Presets, Tasten-Neubelegung, Lautstaerke
// live anpassen) und raeumt das DOM beim Verlassen ZUVERLAESSIG ab (Rueckweg!).

import Phaser from 'phaser';
import {
  getSettings, saveSettings, resetSettings, keyLabel,
  wendeGrafikVoreinstellung, type GrafikStufe, type Settings,
} from '../logic/settings';
import { baueSettingsMenue, type SettingsMenue, type MenueZeile, type MenueTabId } from '../ui/settingsMenue';

interface SettingsParams { zurueck?: string; resume?: boolean }

export class SettingsScene extends Phaser.Scene {
  private zurueck = 'Title';
  private resume = false;
  private menue?: SettingsMenue;
  private pendingBind: keyof Settings['kb'] | null = null;
  private tab: MenueTabId = 'ton';   // fuer Verifikation/Tests lesbar

  constructor() { super('Settings'); }

  create(params: SettingsParams): void {
    this.zurueck = params.zurueck ?? 'Title';
    this.resume = params.resume ?? false;
    this.cameras.main.setBackgroundColor('#0a0806');
    this.pendingBind = null;

    this.menue?.zerstoere();
    this.menue = baueSettingsMenue({
      tabs: [
        { id: 'ton', label: 'Ton', icon: '🔊', farbe: 'rot', zweispaltig: true },
        { id: 'bild', label: 'Bild', icon: '🖥', farbe: 'gruen', zweispaltig: true },
        { id: 'grafik', label: 'Grafik', icon: '✨', farbe: 'braun', zweispaltig: true },
        { id: 'steuerung', label: 'Steuerung', icon: '⚔', farbe: 'blau', zweispaltig: true },
        { id: 'allgemein', label: 'Allgemein', icon: '⚙', farbe: 'grau', zweispaltig: true },
      ],
      inhalt: (tab) => { this.tab = tab; return this.zeilenFuer(tab); },
      onStandard: () => {
        resetSettings();
        this.liveGrafik();
        this.menue?.zeigeTab(this.tab);
      },
      onZurueck: () => this.schliessen(),
      onTasteAnfordern: (id) => { this.pendingBind = id as keyof Settings['kb']; },
    });

    // Tasten-Neubelegung: naechster Druck belegt; Doppel-Belegung wird getauscht.
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && !this.pendingBind) { this.schliessen(); return; }
      if (!this.pendingBind) return;
      ev.preventDefault();
      const k = ev.key.toLowerCase();
      if (k !== 'escape') {
        const kb = getSettings().kb;
        for (const id of Object.keys(kb) as Array<keyof Settings['kb']>) {
          if (kb[id] === k) kb[id] = kb[this.pendingBind];
        }
        kb[this.pendingBind] = k;
        saveSettings();
      }
      this.menue?.tasteGesetzt(this.pendingBind, keyLabel(getSettings().kb[this.pendingBind]));
      this.pendingBind = null;
    });

    // DOM beim Verlassen IMMER abbauen (Risiko-Checkliste: Rueckweg / globale Reste)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.menue?.zerstoere(); this.menue = undefined; });
  }

  private schliessen(): void {
    saveSettings();
    this.liveGrafik();
    if (this.resume) { this.scene.stop(); this.scene.resume(this.zurueck); }
    else this.scene.start(this.zurueck);
  }

  // Grafik-Aenderungen sofort in die (evtl. pausierte) Spielszene tragen.
  private liveGrafik(): void {
    (this.scene.get('World') as unknown as { wendeGrafikAn?: () => void })?.wendeGrafikAn?.();
  }

  private zeilenFuer(tab: MenueTabId): MenueZeile[] {
    const s = getSettings();
    const speichern = <T>(fn: (v: T) => void) => (v: T): void => { fn(v); saveSettings(); };
    switch (tab) {
      case 'ton': return [
        { art: 'abschnitt', titel: 'Lautstärke' },
        { art: 'regler', label: 'Effekte', icon: '🔊', min: 0, max: 100, get: () => s.volEffekte, set: speichern((v) => { s.volEffekte = v; }) },
        { art: 'regler', label: 'Atmosphäre (Umgebung)', icon: '🌫', min: 0, max: 100, get: () => s.volAtmosphaere, set: speichern((v) => { s.volAtmosphaere = v; this.passeLaufendeAn(false, v); }) },
        { art: 'regler', label: 'Musik', icon: '🎵', min: 0, max: 100, get: () => s.volMusik, set: speichern((v) => { s.volMusik = v; this.passeLaufendeAn(true, v); }) },
        { art: 'abschnitt', titel: 'Räumlicher Klang' },
        { art: 'regler', label: 'Hall (Dungeon / Innenräume)', icon: '🏛', min: 0, max: 100, get: () => s.hall, set: speichern((v) => { s.hall = v; }) },
        { art: 'regler', label: 'Entfernungs-Dämpfung', icon: '📏', min: 0, max: 100, get: () => s.distanzDaempfung, set: speichern((v) => { s.distanzDaempfung = v; }) },
        { art: 'schalter', label: 'Räumlicher Klang / HRTF (Kopfhörer)', get: () => s.raumklang, tun: () => { s.raumklang = !s.raumklang; saveSettings(); } },
        { art: 'hinweis', text: 'Wirkt auf Kampf-, Tier- und Umgebungsklänge. Zum Prüfen im Spiel bewegen.' },
      ];
      case 'bild': return [
        { art: 'abschnitt', titel: 'Bild & Fenster' },
        { art: 'schalter', label: 'Vollbild', get: () => this.scale.isFullscreen, tun: () => { try { this.scale.toggleFullscreen(); } catch { /* ohne Vollbild */ } } },
        { art: 'regler', label: 'Spielwelt-Zoom', icon: '🔍', min: 100, max: 200, get: () => s.zoom, set: speichern((v) => { s.zoom = v; }) },
        { art: 'regler', label: 'HUD-Größe', icon: '▣', min: 60, max: 150, get: () => s.hudSkala, set: speichern((v) => { s.hudSkala = v; }) },
        { art: 'regler', label: 'Helligkeit', icon: '☀', min: 70, max: 140, get: () => s.bright, set: speichern((v) => { s.bright = v; }) },
        { art: 'abschnitt', titel: 'Leistung' },
        { art: 'schalter', label: 'FPS-Anzeige (Bildrate einblenden)', get: () => s.fpsAnzeige, tun: () => { s.fpsAnzeige = !s.fpsAnzeige; saveSettings(); } },
        { art: 'hinweis', text: 'Tipp: Bei niedrigen FPS im Reiter GRAFIK eine Voreinstellung wählen.' },
      ];
      case 'grafik': return [
        { art: 'abschnitt', titel: 'Leistungs-Voreinstellung' },
        {
          art: 'wahl', label: 'Voreinstellung (für dein System)', optionen: ['Niedrig', 'Mittel', 'Hoch', 'Eigen'],
          get: () => s.grafikStufe,
          set: (i) => {
            if (i <= 2) { wendeGrafikVoreinstellung(s, i as GrafikStufe); saveSettings(); this.liveGrafik(); }
            else { s.grafikStufe = 3; saveSettings(); }
            this.menue?.zeigeTab('grafik');   // Regler-Stellungen neu zeichnen
          },
        },
        { art: 'hinweis', text: 'Niedrig = schwache Geräte/Handy · Hoch = starke Systeme. Danach frei feinjustierbar.' },
        { art: 'abschnitt', titel: 'Effekte & Qualität' },
        { art: 'regler', label: 'Leuchten / Bloom', icon: '✨', min: 0, max: 100, get: () => s.bloom, set: (v) => this.grafikSet(() => { s.bloom = v; }) },
        { art: 'regler', label: 'Farb-Grading (Stimmung)', icon: '🎨', min: 0, max: 100, get: () => s.grading ?? 0, set: (v) => this.grafikSet(() => { s.grading = v; }) },
        { art: 'schalter', label: 'Rand-Vignette (dunkle Ränder)', get: () => s.licht.vignetteAn ?? false, tun: () => this.grafikSet(() => { s.licht.vignetteAn = !(s.licht.vignetteAn ?? false); }) },
        { art: 'schalter', label: 'Glatte Kanten (Standard AN, Neustart nötig)', get: () => s.glatteKanten ?? true, tun: () => this.grafikSet(() => { s.glatteKanten = !(s.glatteKanten ?? true); }) },
        { art: 'schalter', label: 'Bump-Licht / Light2D (Props plastisch, Neustart nötig)', get: () => s.light2d ?? false, tun: () => this.grafikSet(() => { s.light2d = !(s.light2d ?? false); }) },
        { art: 'regler', label: 'Schatten / Licht Außenwelt', icon: '🌗', min: 0, max: 100, get: () => s.schatten, set: (v) => this.grafikSet(() => { s.schatten = v; }) },
        { art: 'schalter', label: 'Dungeon: echte Wandschatten (Raycaster)', get: () => s.licht.dungeonNeu, tun: () => this.grafikSet(() => { s.licht.dungeonNeu = !s.licht.dungeonNeu; }) },
        { art: 'regler', label: 'Schattenwerfende Fackeln', icon: '🔥', min: 0, max: 100, get: () => s.licht.schattenFackeln, set: (v) => this.grafikSet(() => { s.licht.schattenFackeln = v; }) },
        { art: 'schalter', label: 'Wasser-Effekte (Shader)', get: () => s.wasserEffekte, tun: () => this.grafikSet(() => { s.wasserEffekte = !s.wasserEffekte; this.liveGrafik(); }) },
        { art: 'schalter', label: 'Blut & Überreste', get: () => s.blood, tun: () => this.grafikSet(() => { s.blood = !s.blood; }) },
        { art: 'schalter', label: 'Bildschirmwackeln bei Treffern', get: () => s.shake, tun: () => this.grafikSet(() => { s.shake = !s.shake; }) },
        { art: 'schalter', label: 'Schadenszahlen & Treffermeldungen', get: () => s.dmgNums, tun: () => this.grafikSet(() => { s.dmgNums = !s.dmgNums; }) },
        { art: 'schalter', label: 'Nebel des Krieges im Dunkelwald', get: () => s.fow, tun: () => this.grafikSet(() => { s.fow = !s.fow; }) },
      ];
      case 'steuerung': {
        const taste = (id: keyof Settings['kb'], label: string): MenueZeile => ({ art: 'taste', id, label, get: () => keyLabel(getSettings().kb[id]) });
        return [
          { art: 'abschnitt', titel: 'Kampf & Bewegung' },
          taste('roll', 'Ausweichrolle'), taste('heavy', 'Schwerer Hieb'), taste('interact', 'Reden / Aufheben'),
          taste('pot', 'Heiltrank'), taste('mpot', 'Manatrank'), taste('pause', 'Pause'),
          { art: 'abschnitt', titel: 'Fenster & Fähigkeiten' },
          taste('inv', 'Inventar'), taste('charakter', 'Charakterfenster'),
          taste('s1', 'Zauber 1'), taste('s2', 'Zauber 2'), taste('s3', 'Zauber 3'),
          taste('faehigkeit1', 'Waffen-Fähigkeit 1'), taste('faehigkeit2', 'Waffen-Fähigkeit 2'),
          { art: 'abschnitt', titel: 'Werkzeuge (Entwicklung)' },
          taste('kollisionOverlay', 'Kollisions-Overlay (Wände sichtbar)'),
          { art: 'hinweis', text: 'Weitere Tool-Tasten: B = Stresstest (Shift+B räumt) · L = Licht-Werkbank · Shift+K = Held sofort töten (Test) · F10 = Entwicklungskasten.' },
        ];
      }
      case 'allgemein': return [
        { art: 'abschnitt', titel: 'Spiel' },
        { art: 'regler', label: 'Spieler-Tempo (Kampfgefühl)', icon: '🥾', min: 70, max: 110, get: () => s.tempo, set: speichern((v) => { s.tempo = v; }) },
        { art: 'schalter', label: 'Quest-Verfolger auf dem Bildschirm', get: () => s.questTrackerAn, tun: () => { s.questTrackerAn = !s.questTrackerAn; saveSettings(); } },
        { art: 'abschnitt', titel: 'Kampf-Anzeige' },
        { art: 'schalter', label: 'Kampftexte einblenden (Treffer, "Pariert" …)', get: () => s.kampfTexte !== false, tun: () => { s.kampfTexte = !(s.kampfTexte !== false); saveSettings(); } },
        { art: 'schalter', label: 'Roter Ring vor Gegner-Angriff', get: () => s.gegnerWindupRing === true, tun: () => { s.gegnerWindupRing = !(s.gegnerWindupRing === true); saveSettings(); } },
        { art: 'hinweis', text: 'Kämpfe werden zusätzlich im Chronik-Reiter „Kampf" mitgeschrieben.' },
        { art: 'schalter', label: 'Texte vorlesen (Sprachausgabe)', get: () => s.vorlesen, tun: () => { s.vorlesen = !s.vorlesen; saveSettings(); } },
        { art: 'abschnitt', titel: 'Handy / Barrierefreiheit' },
        { art: 'schalter', label: 'Linkshänder-Modus (Joystick rechts)', get: () => s.lefty, tun: () => { s.lefty = !s.lefty; saveSettings(); } },
      ];
    }
  }

  // Ein Grafik-Wert wurde von Hand geaendert -> Voreinstellung "Eigen".
  private grafikSet(fn: () => void): void {
    fn();
    getSettings().grafikStufe = 3;
    saveSettings();
  }

  private passeLaufendeAn(musik: boolean, wert: number): void {
    const mgr = this.sound as Phaser.Sound.BaseSoundManager & { sounds?: Phaser.Sound.BaseSound[] };
    for (const snd of mgr.sounds ?? []) {
      if (!snd.isPlaying) continue;
      const istMusik = snd.key.startsWith('snd_musik_');
      if (istMusik === musik) (snd as Phaser.Sound.WebAudioSound).setVolume(wert / 100);
    }
  }
}
