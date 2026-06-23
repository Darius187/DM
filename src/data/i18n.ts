// i18n-Vorbereitung (Runde 61): zentrale Sprachdatei (Schlüssel -> Text) + t().
// NOCH OHNE Bibliothek - bewusst minimal, damit später eine echte i18n-Lib (oder
// weitere Sprachen) durch EINE zusätzliche Tabelle ergänzt werden kann, ohne im
// Code Strings zu suchen. Spielertexte bleiben Deutsch (CLAUDE.md), das hier ist
// nur die Struktur: alle sichtbaren Strings an EINER Stelle, im Code nur t('key').
//
// Platzhalter in Texten: {name} wird über t('key', { name: ... }) ersetzt.

export type Locale = 'de';
type Texte = Record<string, string>;

// ---- Deutsch (Referenzsprache) ----
const de: Texte = {
  // Dorf-im-Wald-Demo (dorf.html / dorfSim.ts)
  'dorf.titel': 'RAVENSMOOR · DORF IM WALD',
  'dorf.hud': 'Alles zusammen, reines 2D-Canvas: Gras + Pfad mit Wasser-Pfützen, '
    + 'dynamisches Wetter (klar / Regen / Unwetter) mit Wind, Dunst/Nebel, Tropfen-Ringen '
    + 'auf dem Wasser und im Sturm umknickenden Bäumen; im Norden ein begehbarer Berg bis '
    + 'zum Schnee, ein Fluss mit Brücke und ein nebliges Moor. Held (WASD, F = abbauen/fällen) '
    + '+ Hühner + Dorfbewohner. Tasten: 1 klar · 2 Regen · 3 Unwetter · 4 Gewitter (Blitz+Donner) · R Regen an/aus.',
  'dorf.laden': 'Dorf & Wald werden gebacken …',
  // Regler
  'regler.baumgroesse': 'Baumgröße',
  'regler.wegbreite': 'Weg-Breite',
  'regler.falltempo': 'Fall-Tempo',
  'regler.bewuchs': 'Bewuchs',
  // Wetterstufen
  'wetter.klar': 'klar',
  'wetter.niesel': 'Nieselregen',
  'wetter.regen': 'Regen',
  'wetter.unwetter': 'Unwetter',
  'wetter.gewitter': 'Gewitter',
  // HUD-Zeilen (mit Platzhaltern)
  'hud.wetter': 'Wetter: {wetter}   ·   Nässe {nass}%   [1 2 3 4]',
  'hud.vorrat': 'Holz {holz} · Stein {stein} · Erz {gold}/{eisen}/{kristall} (Au/Fe/Kr) · F: nächstes Objekt abbauen',
};

const tabellen: Record<Locale, Texte> = { de };
let aktuelleSprache: Locale = 'de';

export function setLocale(l: Locale): void { aktuelleSprache = l; }
export function getLocale(): Locale { return aktuelleSprache; }

// Schlüssel -> Text der aktuellen Sprache, mit {platzhalter}-Ersetzung.
// Fehlt der Schlüssel, wird der Schlüssel selbst zurückgegeben (fällt sofort auf).
export function t(key: string, vars?: Record<string, string | number>): string {
  let s = tabellen[aktuelleSprache][key] ?? key;
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}
