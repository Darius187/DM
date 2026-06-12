# Eigene Grafiken einbauen (Hot-Swap)

Dateien einfach in die richtigen Ordner legen und das Spiel neu laden -
KEIN Code nötig. Fehlt eine Datei, malt das Spiel seine eigene Grafik.
In der Browser-Konsole (F12) steht beim Start, was gefunden wurde.

## assets/tiles/ - Boden, Bäume, Gebäude (32x32 PNG)

VARIANTEN: Von jedem Namen werden bis zu 12 nummerierte Dateien geladen
und im Spiel automatisch gemischt (positionsfest, flackert nicht):
  gras1.png, gras2.png, ... gras10.png
Eine einzelne Datei ohne Nummer (gras.png) geht auch.

Die wichtigsten Namen:
  gras*        Wiese (opak, nahtlos kachelbar)
  weg*         Erdweg/Straße (opak, kachelbar)
  baum*        einzelner Baum (TRANSPARENTER Hintergrund!)
  wald*        Baum im dichten Wald (transparent) - nimmt das Spiel
               automatisch für Bäume mit vielen Baum-Nachbarn
  baumstumpf*  Stumpf nach dem Fällen (transparent)
  fachwerk_fassade*  Hauswand mit Fenster (opak, seitlich kachelbar)
  fachwerk_dach*     Dachfläche (opak, kachelbar)
  haustuer*    Haustür in der Fassade (opak, 1 Tile)
  wasser*, acker*, zaun*, fels*, grabstein*, brunnen*
  krypta_boden*, krypta_wand*, krypta_wand_front*
  fass*, kiste*, krug* (transparent, zerstörbare Objekte)
  holzboden*, bett*, tisch*, stuhl*, kamin*, teppich*, tresen* (Stuben)
  palisade*, stadttor*

## assets/portraits/ - Gesichter für Dialoge (512x512 PNG)
  spieler.png, heinrich.png, magdalena.png, johannes.png, schmied.png ...

## assets/sprites/ - Figuren (kommt später, 4 Richtungen x 4 Schritte)
  <name>_unten_1.png ... <name>_oben_4.png (je 32x32, transparent)

## assets/sounds/ - Klänge (.ogg oder .wav)
  Namen siehe src/gfx/assetManifest.ts (z. B. schwert_swing.ogg)

## Regeln für alle Grafiken
- Endgröße exakt einhalten (Tiles 32x32) - groß generieren, dann mit
  "Nearest Neighbor" (ohne Weichzeichnen) herunterskalieren
- Licht kommt von OBEN LINKS
- Boden-Tiles opak und nahtlos; Objekte (Baum, Möbel) transparent

## WICHTIG: Sound-Längen (Lehre aus Runde 14)
Kampf-Effekte (swoosh, slice, armor_cut, block) müssen KURZ sein -
unter 3 Sekunden. Eine 48s-Compilation als swoosh2 hat bei jedem
Schwerthieb eine Dauerbeschallung gestartet. Lange Stücke nur für
musik_* und Atmosphären-Loops verwenden.
