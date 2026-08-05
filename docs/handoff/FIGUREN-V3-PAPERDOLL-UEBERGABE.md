# Figuren V3 – Übergabe Codex → Claude

## Status

Das freigegebene V3-Artpaket ist fertig, aber noch nicht in den Spiel-Renderer
integriert. Einstiegspunkt ist:

`assets/sprites/hero-combat-v2/aldric-v3/hero-layers-v3.json`

Das Manifest enthält Dateipfade, 128×128-Zellmaß, Richtungen, neun
Frame-Spalten, Lauf-/Kampftempo, Hand- und Schildanker sowie die
blickrichtungsabhängige Z-Reihenfolge.

## Lieferumfang

- 6 vollständige Körper-Sheets: Hemd/Basis, Lumpen, Lederwams, Gambeson,
  Kettenhemd, Plattenrock.
- 13 Waffen-Sheets: alle acht Nahkampfwaffen, drei Fernwaffen und zwei Stäbe
  aus der Variantenliste.
- 5 Schild-Sheets: Holz-Rundschild, Rundschild, beschlagener Rundschild,
  Eisenschild und Holz-Turmschild.
- 5 Helm-Sheets: Stoffhaube, Lederkappe, Eisenhut, Kettenhaube, Beckenhaube.
- 1 unabhängiges Reiseumhang-Sheet.
- Statische Prüfungen und animierte Gehen-/Schlag-GIFs unter
  `assets/sprites/hero-combat-v2/aldric-v3/proofs/`.
- Reproduzierbarer Zuschnitt/Build:
  `tools/build_hero_layers_v3.py`.

Alle Ebenen sind 1152×512 Pixel groß: vier Zeilen `down`, `left`, `right`,
`up` und neun Spalten `idle`, `walk_1` bis `walk_4`, `windup`, `impact`,
`followthrough`, `block`.

## Verbindliches Slotmodell

Pro Frame genau eine Zelle je Slot stapeln:

1. `bodyAppearance`: genau eines der sechs vollständigen Körper-Sheets.
2. `cape`: optional.
3. `weapon`: optional/genau eine ausgerüstete Waffe.
4. `shield`: optional.
5. `helmet`: optional.

Rüstung ist ausdrücklich **keine** flache Ebene über einem Grundkörper. Der
gewählte Rüstungszustand ersetzt `bodyAppearance` vollständig. Dadurch werden
nicht hunderte Kombinationen vorgezeichnet: Kettenhemd + Helm + Umhang +
Langschwert + Schild entsteht aus fünf synchronen Zellen.

Die alten geometrisch erzeugten `armor-*`-Ebenen sind verworfen und dürfen
nicht integriert werden.

## Z-Reihenfolge

Das Manifest liefert `zOrderBackToFront`; nicht im Loader raten:

- `down`: cape, bodyAppearance, weapon, shield, helmet
- `left`: weapon, cape, bodyAppearance, shield, helmet
- `right`: cape, bodyAppearance, weapon, shield, helmet
- `up`: weapon, bodyAppearance, cape, shield, helmet

Damit liegt der Schild auch bei Blick nach oben sichtbar vor Körper/Umhang und
die Seitenrichtung der Waffe wechselt korrekt vor beziehungsweise hinter die
Figur.

## Ankerkonvention und Tempo

- Koordinaten sind ganzzahlige, frame-lokale Pixelmitten ab Zelloberkante
  links.
- `handAnchors[row][frame]` bezeichnet die Mitte der geschlossenen Waffenhand;
  der Griffpunkt der Waffengrafik wird darauf gesetzt.
- `shieldAnchors[row][frame]` bezeichnet Unterarm/Schildbuckel-Mitte.
- Gemeinsamer Fußpunkt: `[64, 124]`.
- Gehen: 120 ms je Frame.
- Schlag: Ausholen 140 ms, Treffer 80 ms, Nachziehen 180 ms.
- Block: 160 ms; Idle-Vorschlag 240 ms.

## Noch wichtig

- Die fünf Helm-IDs sind vorläufige historische Artstufen, weil der Spielcode
  derzeit keine verbindliche Helm-Itemliste liefert. Beim Anschluss echte IDs
  mappen oder die Namen als neue Items übernehmen.
- Bögen, Armbrust und Stäbe sind bereits als anheftbare 4×9-Sheets vorhanden,
  benutzen in dieser Lieferung aber noch die universellen Körperposen. Eine
  spätere eigene Spann-/Schuss-/Zauber-Körperanimation kann die Kampfspalten
  ersetzen, ohne den Slotvertrag zu ändern.
- Die finalen Zellen sind exakt 128×128; die gemalten Rohkataloge wurden vom
  Buildskript deterministisch zugeschnitten und in dieses Raster gesetzt.

## Auftrag an Claude

1. Werkbank/Loader auf das Manifest und die fünf Slots umstellen.
2. Richtung und Frame immer für alle aktiven Slots gemeinsam wechseln.
3. `zOrderBackToFront` je Richtung auswerten.
4. Auswahllisten für Körperlook, Helm, Umhang, Waffe und Schild aus
   `assets`/`labels` im Manifest befüllen.
5. Zuerst die beiden animierten GIFs und die drei PNG-Prüfbögen ansehen; dann
   im Live-Test mindestens Holz-Rundschild und Holz-Turmschild mit jedem der
   sechs Körperlooks prüfen.
6. Alte V2-`armor-*`-Overlays nicht mit V3 mischen.
