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
  'schritte_gras', 'schritte_stein', 'tuer', 'truhe', 'muenzen', 'trank',
  'holz_hacken', 'stein_hacken', 'feuer_knistern', 'muehle', 'schmiede_hammer',
  'huhn', 'schwein', 'kuh', 'hund', 'kraehen',
  // Atmosphäre (Loops)
  'dorf_wind', 'krypta_droehnen', 'wald_nacht',
  // UI
  'klick', 'item_episch', 'levelup', 'fertigkeit_neu',
] as const;

// Figuren-Spritesheets: <name>_<richtung>_<frame>.png oder <name>.png + <name>.json
export const SPRITE_NAMES = [
  'spieler', 'pest', 'skelett', 'schuetze', 'schatten', 'templer', 'wolf', 'ratte',
  'heinrich', 'magdalena', 'johannes', 'landherr', 'schmied', 'mueller',
  'bauer1', 'bauer2', 'haendler', 'huhn', 'schwein', 'kuh', 'hund',
] as const;

// Tiles für späteres Grafik-Upgrade (assets/tiles/<name>.png)
export const TILE_NAMES = [
  'gras', 'weg', 'baum', 'wasser', 'acker', 'zaun',
  'fachwerk_fassade', 'fachwerk_dach', 'kirche_fassade', 'kirche_dach',
  'kirchentuer', 'grabstein', 'brunnen', 'brandstelle',
  'krypta_boden', 'krypta_wand', 'knochen', 'blut', 'rune',
  'altar', 'regal', 'treppe_ab', 'treppe_auf', 'erzader', 'fels',
  'fass', 'kiste', 'krug', 'heuhaufen', 'streckbank', 'kaefig', 'kerzenschrein',
] as const;

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
