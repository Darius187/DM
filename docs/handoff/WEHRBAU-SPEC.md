# WEHRBAU-SPEC - Palisade, Tor, Wachturm (fuer Codex-Asset-Bau)

Verbindliche Masse, damit Assets ohne Anpassungsschmerz ins Spiel passen.
Grundmass: **1 Kachel = 32x32 px Welt** (TILE=32). Kollision kommt IMMER aus
der Karten-Kachel (T.PALISADE/T.TOR), nie aus dem Sprite.

## Palisade (kachelbar)
- Belegt **genau 1 Kachel** (32 px Grundflaeche); wird in Reihen gezogen.
- Als KACHEL-Set bauen (nicht als Einzel-Prop): Segment MITTE (beidseitig
  anschliessend), ENDE links/rechts/oben/unten, ECKE, EINZELPFAHL. Das Spiel
  waehlt die Maske aus den Nachbar-Kacheln (wie jetzt bauePalisadenKachel).
- Fusspunkt: Unterkante des Sprites = Unterkante der Kachel. Hoehe des
  sichtbaren Aufbaus: ~1,25 Kacheln (40 px Welt) - wie die Dungeon-Waende.
- KEINE eingebaute Bodenplatte/Schatten (der Schatten kommt aus dem Spiel).

## Tor
- Belegt **genau 2 Kacheln** in der Wandrichtung (waagerecht ODER senkrecht -
  beide Varianten noetig). Muss optisch buendig an die Palisaden-Segmente
  anschliessen (gleiche Holzstaerke/Hoehe).
- Zustaende: ZU und OFFEN (offen = begehbare Durchfahrt sichtbar frei).
- Pivot: Unterkante der 2-Kachel-Grundflaeche.

## Wachturm
- Grundflaeche **2x2 Kacheln** (64x64 px); die Beine muessen IN dieser Flaeche
  stehen (nichts ragt in Nachbarkacheln). Plattformhoehe fuer die Besatzung
  liegt ~40 px ueber dem Fusspunkt (TURM.hoeheOffset).
- Kein Bodenteller, kein eingebackener Schatten (sonst "seltsamer Rand").

## Allgemein (alle Wehr-/Lagerbauten)
- GLB Y-hoch (glTF-Standard), Fusspunkt bei y=0, keine globale Bodenplatte.
- Cloth/Banner statisch oder als vorgebackene Frames - keine Live-Simulation.
- Transparenz sauber (Alpha), sonst entstehen beim Beschneiden Raender.
