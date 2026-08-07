# assets/ui/ - Bild-Texturen fuer das Mittelalter-Menue (Codex)

Hier landen die UI-Texturen, die Codex mit ChatGPT-Bildern erzeugt. KEIN grosses
Vollbild-Menue - nur kleine, KACHELBARE Flaechen/Teile. Struktur + Klickbarkeit
kommen aus dem bestehenden System (src/ui/medieval-ui.css). Die Bilder werden nur
als Optik ueber die vorhandenen Flaechen gelegt (multiply-Blend).

## Dateien (genaue Namen, PNG mit Transparenz wo sinnvoll)

| Datei            | Zweck                         | Groesse (Richtwert) | Kachelbar? |
|------------------|-------------------------------|---------------------|------------|
| parchment.png    | Pergamentflaeche der Panels   | 512x512             | ja (seamless) |
| wood.png         | Holz der Kopfzeile/Reiter     | 512x128             | ja (horizontal) |
| button.png       | Knopf-Oberflaeche             | 256x96              | nein       |

Optional spaeter (dann hier ergaenzen + in mvTexturen.ts einhaengen):
frame-corner.png (Eck-Ornament), icon-*.png (Wappen/Icons), divider.png (Ornament-Linie).

## HUD-Unterordner

`hud/` enthaelt die separaten Bildvorlagen und leeren Bauteile fuer die flache
Spiel-HUD-Leiste. Das ist kein Vollbild-Menue, sondern eine Claude-Code-Uebergabe
fuer `src/ui/hud.ts`. Details stehen in `hud/README.md`.

## Regeln
- Duestere, gealterte Optik 1300/1400 (Pergament vergilbt, Holz dunkel, Bronze/Gold).
- Mittlere Helligkeit - die Farbe kommt aus den CSS-Gradients darunter (multiply).
  Also eher graustufig/leicht getoent liefern, NICHT knallbunt.
- Seamless kacheln, wo "kachelbar? ja" steht (sonst sieht man Kanten).
- Dateigroesse klein halten (moeglichst < 200 KB je Bild).

## Einbau (macht Codex in EINER Datei: src/ui/mvTexturen.ts)
1. PNG hier ablegen.
2. In src/ui/mvTexturen.ts oben importieren, z.B.:
       import parchment from '../../assets/ui/parchment.png';
3. In das TEXTUREN-Objekt eintragen:  parchment: parchment,
Fertig - Vite bindet das Bild ein, das Menue nutzt es automatisch. Kein anderer
Code muss angefasst werden.

## Pruefen
Titelmenue -> "MENUE-PROBE (UI)" zeigt beide Panels mit den Texturen.
