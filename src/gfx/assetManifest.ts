// Erwartete Asset-Dateien (Hot-Swap-Prinzip, Masterprompt 3.3).
// Das Spiel prüft beim Start, was vorhanden ist, und fällt sonst auf
// programmatische Grafik/WebAudio zurück. Fehlende Dateien brechen NIE etwas.

export const PORTRAITS = [
  'spieler', 'heinrich', 'magdalena', 'johannes', 'landherr',
  'schmied', 'mueller', 'bauer1', 'bauer2', 'haendler',
] as const;

export const ITEM_IMAGES = [
  'waffe_rostige-klinge', 'waffe_kurzschwert', 'waffe_streitkolben',
  'waffe_langschwert', 'waffe_streitaxt', 'waffe_reiterdegen',
  'waffe_hellebarde', 'waffe_kriegshammer', 'waffe_jagdbogen',
  'waffe_kriegsbogen', 'ruestung_lumpen', 'ruestung_lederwams',
  'ruestung_gambeson', 'ruestung_kettenhemd', 'ruestung_kuerass',
  'ring_knochenring', 'ring_siegelring', 'ring_silberring',
  'ring_eisenring', 'edelstein_feueropal', 'edelstein_frostsplitter',
  'edelstein_schattenperle', 'trank_heil', 'trank_mana',
  'schriftrolle', 'pfeile', 'relikt',
] as const;

export const SOUNDS = [
  // Kampf
  'schwert_swing', 'axt_swing', 'hellebarde_stoss', 'hammer_schlag',
  'bogen_spannen', 'pfeil_schuss', 'pfeil_einschlag', 'treffer_fleisch',
  'treffer_knochen', 'block', 'parade', 'rolle',
  // Gegner
  'skelett_klappern', 'pest_stoehnen', 'schatten_fluestern', 'templer_stimme',
  // Welt
  'schritte_gras', 'schritte_stein', 'tuer', 'truhe', 'muenzen', 'tod_pest1', 'tod_pest2', 'tod_pest3', 'tod_skelett1', 'tod_skelett2', 'tod_skelett3', 'tod_skelett_schild1', 'tod_skelett_schild2', 'tod_skelett_schild3', 'tod_universal1', 'tod_universal2', 'tod_universal3', 'begegnung_pest1', 'begegnung_pest2', 'begegnung_pest3', 'begegnung_skelett1', 'begegnung_skelett2', 'begegnung_skelett3', 'begegnung_miniboss1', 'begegnung_miniboss2', 'begegnung_miniboss3', 'begegnung_lebender_toter1', 'begegnung_lebender_toter2', 'begegnung_lebender_toter3', 'schritt_stein', 'schritt_gras', 'wucht_schlag', 'trank',
  'holz_hacken', 'stein_hacken', 'feuer_knistern', 'muehle', 'schmiede_hammer',
  'huhn', 'schwein', 'kuh', 'hund', 'wolf', 'kraehen',
  // Atmosphäre (Loops)
  'dorf_wind', 'krypta_droehnen', 'wald_nacht',
  // UI
  'klick', 'item_episch', 'levelup', 'fertigkeit_neu',
  // Musik und große Stimmungs-Sounds (Runde 12, .mp3 vom Autor)
  'musik_intro', 'musik_einfall', 'musik_boss', 'musik_menue', 'musik_tod',
  'musik_dorf', 'musik_wald', 'musik_krypta', 'musik_kirche', 'musik_nacht',
  'fireball1', 'fireball2', 'tod_gore',
  'herzschlag', 'regen_draussen', 'regen_drinnen',
  'krypta_betreten', 'krypta_grusel1', 'krypta_grusel2', 'krypta_grusel3',
  'krypta_grusel4', 'krypta_grusel5',
  // Schwert-Sounds des Autors: armor_cut = Gepanzerte, schwert_slice =
  // weiche Gegner + Todesstoß, swoosh = Schwung (abwechselnd), block1/2
  'armor_cut1', 'armor_cut2', 'schwert_slice1', 'schwert_slice2', 'schwert_slice3',
  'swoosh1', 'swoosh2', 'swoosh3', 'swoosh4', 'swoosh5', 'swoosh6', 'swoosh7', 'swoosh8',
  'block1', 'block2',
] as const;

// Figuren-Spritesheets: <name>_<richtung>_<frame>.png oder <name>.png + <name>.json
export const SPRITE_NAMES = [
  'spieler', 'pest', 'skelett', 'schuetze', 'schatten', 'templer', 'wolf', 'ratte',
  'heinrich', 'magdalena', 'johannes', 'landherr', 'schmied', 'mueller',
  'bauer1', 'bauer2', 'haendler', 'huhn', 'schwein', 'kuh', 'hund',
  // Held je Ruestungsstufe (Feedback-Runde 33): ein eigenes Sprite-Paket
  // pro Stufe wird bevorzugt, sonst die gezeichnete Stufe als Rueckfall.
  'spieler_stoff', 'spieler_leder', 'spieler_kette', 'spieler_platte',
] as const;

// Tiles für das Grafik-Upgrade (assets/tiles/<name>.png).
// VARIANTEN: zusätzlich werden <name>1.png bis <name>12.png geladen
// (z. B. gras1.png, gras2.png ...) und im Spiel positionsfest gemischt.
export const TILE_NAMES = [
  'gras', 'weg', 'baum', 'wald', 'baumstumpf', 'wasser', 'acker', 'zaun',
  'fachwerk_fassade', 'fachwerk_dach', 'kirche_fassade', 'kirche_dach',
  'kirchentuer', 'haustuer', 'grabstein', 'brunnen', 'brandstelle',
  'krypta_boden', 'krypta_wand', 'krypta_wand_front', 'knochen', 'blut', 'rune',
  'altar', 'regal', 'regal_geleert', 'regal_leer', 'treppe_ab', 'treppe_auf', 'erzader', 'fels',
  'fass', 'kiste', 'krug', 'heuhaufen', 'streckbank', 'streckbank_r', 'kaefig', 'zellentor', 'kerzenschrein',
  'spinnwebe', 'knochenhaufen', 'palisade', 'palisade_seite', 'stadttor',
  'holzboden', 'bett', 'tisch', 'stuhl', 'kamin', 'teppich', 'tresen',
  'haus',
] as const;

// Wie viele nummerierte Varianten je Tile-Name gesucht werden
export const TILE_VARIANTS_MAX = 12;

export const TITLE_IMAGE = 'ravensmoor-title';

export type AssetStatus = { key: string; pfad: string; gefunden: boolean };

// Zentrale Statusliste - wird beim Boot gefüllt und in der Konsole geloggt
export const assetStatus: AssetStatus[] = [];

export function logAssetStatus(): void {
  const gefunden = assetStatus.filter((a) => a.gefunden);
  const fallback = assetStatus.filter((a) => !a.gefunden);
  /* eslint-disable no-console */
  console.log(`[Assets] ${gefunden.length} Dateien gefunden, ${fallback.length} auf programmatischem Fallback.`);
  if (gefunden.length) console.log('[Assets] Gefunden:', gefunden.map((a) => a.pfad).join(', '));
  if (fallback.length) console.log('[Assets] Fallback aktiv für:', fallback.map((a) => a.pfad).join(', '));
  /* eslint-enable no-console */
}
