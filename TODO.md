# TODO - Notizen für später (keine Nebenbei-Refactorings)

- Erledigt R75: Wetter-Achse + Stimmungsregen (bis 1. Dungeon) + Pfützen am
  Weg + Ufer-Schilf (Test, Autor-Abnahme offen) + liegender ez-tree-Stamm
  (zerlegbar; die alte backeLiege-Zwischenzeichnung ist gestrichen).
- POIs auf three.js umstellen (Runde 77, Autorwunsch "kommt viel besser
  raus"): Galgen/Bildstock/Karren/Meiler als 3D-Modelle durch den Backofen
  (richtiger Winkel automatisch) statt der 2D-Canvas-Bilder; auch die BRÜCKE
  als 3D-Bake ist machbar (T.BRIDGE-Sprite ersetzen). Pipeline steht
  (figurBackofen/propBackofen).
- Bewegtes GRAS + BLUMEN (three.js, Autor will besseren Look als die alten
  Canvas-Striche): Referenzen recherchiert - Codrops "Fluffiest Grass"
  (InstancedMesh + Wind-Shader) und github.com/CK42BB/procedural-grass-threejs
  (Bezier-Halme, Böen-Wellen). Ansatz für unser 2D-Spiel: Halm-Büschel im
  Backofen (three.js) backen -> Sprites mit leichtem Schwank-Shader. ez-tree
  bringt zusätzlich ein (nicht exportiertes) Grass-Modul mit GLB-Assets mit.

- WICHTIG (Runde 73): die START-Karte (buildStart, NEUES SPIEL) ist auf den
  Engine-Pfad gehoben. Ihre Baum-OPTIK kommt noch aus dorfSim (ez-tree ->
  3D-Backofen) via gfx/baumBitmaps.ts (beim Boot registriert). Das ist die
  LETZTE Verbindung dieser Karte zu dorfSim - bewusst als reversibler
  Übergang. Sobald die finalen ComfyUI-Bäume da sind:
  registriereBaumBitmaps()-Aufruf in BootScene UND das Modul
  gfx/baumBitmaps.ts + die Export-Funktion baueBaumBitmaps() in dorfSim.ts
  wieder entfernen, obj_baum_*/obj_wald_* aus den ComfyUI-Assets laden. Dann
  ist die START-Karte komplett dorfSim-frei. Fest einplanen, sonst wird aus
  dem Übergang ein Dauerzustand.
- OFFEN (Messung, nur am echten Gerät): FPS auf der START-Karte (RTX 4070 Ti)
  und ob das Laufen ruckelfrei ist (kein dorfSim auf dieser Karte mehr -> der
  ~1s-Haken sollte weg sein). Entscheidet über "produktionsreif".

- BootScene erzeugt beim Start einige HEAD-Anfragen für fehlende
  Hot-Swap-Dateien - erwartetes Verhalten, im Netzwerk-Tab sichtbar,
  Konsole bleibt sauber.
- Inventarliste: Blättern/Scrollen fehlt, bei sehr vielen Items wird
  abgeschnitten (Überlaufschutz aktiv). Mit Maus-Rad/Touch-Wisch nachrüsten.
- Fähigkeits-Abklingzeiten (R/T/4-6) sind nicht im HUD sichtbar.
- Einrichtungs-Sets (Stufe 3) haben noch keine sichtbare Deko am Haus.
- Erledigt 2026-06-10: Einstellungen liefen bei kleinen Fenstern aus dem
  Bild - jetzt zweispaltig.
- Feedback-Runde 1, noch offen: UI-Fenster verschiebbar machen; Buch-Lesen
  als eigenes Pergament-Fenster mit mehr Text; Maustasten-Belegung in den
  Einstellungen frei wählbar (aktuell fest: Mitte=Feuerball, Daumen1=Trank,
  Daumen2=Heilung); Zauberrollen-Schnellslot ohne Inventar.
- Feedback-Runde 3, noch offen (nächste Runde): Endboss mit 3 Phasen +
  Raumwechsel + Eskalation; mehr Zaubersprüche (Blitzschlag einzeln,
  Feuerwand ...); Maustasten FREI belegbar (aktuell feste Anzeige M3/M4/M5
  in der Leiste); Crafting-Ausbau (Rezepte-Werkbank); Housing-Ausbau
  (Innenraum, Deko sichtbar); Collectables; Fenster verschieben;
  Buch-Pergament-Fenster; Dev-Tuning-Panel mit Berichtsfunktion.
- Feedback-Runde 5, noch offen: Boss-Eskalation als echter RAUMWECHSEL
  (aktuell erscheint der Tempelritter im selben Raum, nachdem die Leibwache
  fällt); Karten-/Platzier-Editor im Entwicklungskasten; weitere Zauber;
  Crafting-Werkbank-Ausbau; Housing-Innenraum; Sammelalbum (Collectables);
  Fenster verschieben; Buch-Pergament-Fenster. (Hotbar-Drag&Drop: erledigt
  in Runde 20.)
- Feedback-Runde 6, notiert: Riesige prozedurale Außenwelt mit Biomen nach
  dem Boss-Sieg + Stadtmauern/Verteidigung (Autor-Idee, groß - braucht
  eigene Phase und ein Konzept: Welt-Chunks, Biome, Monster-Einfälle).
  Vorschlag Claude: erst als "Einfälle"-Ereignis klein anfangen.
- Einfälle/Stadtmauer, nächste Ausbaustufen (Autor-Plan): Boss-Monster
  alle 7 Tage, die die Palisade beschädigen können (Mauer-Reparatur);
  Dörfler wehren sich/nehmen Schaden; Mauer-Stufe 2 (Stein); danach
  offene Außenwelt mit 2-3 Biomen.
- Begehbare Häuser (Innenräume für Taverne, Hütten, Kirche) - eigene
  Phase: Innen-Karten, Tür-Übergänge, NPCs sichtbar am Tisch/im Bett.
  Aktuell verschwinden die Bewohner nachts "in" ihre Häuser.
- Geschlossene Dorf-Wirtschaft (Runde-16-Wunsch, nächster Ausbau):
  sichtbare Lager/Vorräte je Betrieb, Träger-NPCs bringen Waren
  (Korn -> Mühle -> Backhaus), Bestände beeinflussen Angebote.
- HD-Bild (Runde 21 notiert): Der Bildgrößen-Regler skaliert hoch und wird
  dadurch pixeliger. Die scharfe Lösung wäre, die Kacheln/Figuren aus den
  300px-Quellen gleich in größerer Zielauflösung zu rendern (TILE 32 -> 48):
  eigene Phase, weil Tempo-/Reichweiten-Werte in Pixeln mitskaliert werden
  müssen. Lohnt, sobald die Sprite-Sätze des Autors final sind.

- Runde 50, Art-Liste KOMPLETT abgearbeitet: Blut nur in Sonderräumen;
  Käfig/Kerzenschrein/Blut/Foliant-Optik überarbeitet; Streckbank über zwei
  Kacheln; Bücherregale mit Zuständen voll/durchsucht/leer (Zustand bleibt
  über Speichern/Laden); Bücher = seltene 10x-Schriftrollen; begehbare Zelle
  mit offenem Zellentor in der Folterkammer (kein Laden).
  Offen/zur Klärung (siehe OFFENE-FRAGEN.md): ob "begehbare Türen/Zellen" auch
  die normalen Krypta-Kammern/Türen meinte (aktuell als Folterkammer-Zelle
  umgesetzt) und ob die Folterkammer als komplett EIGENER Raumabschnitt mit
  Instrumenten + mehr Blut gewünscht ist (aktuell ein Sonderraum, nicht
  abgetrennt).

- Prolog: ab dem 3. Raum wiederholt sich der Spieler-/Bewegungs-/solid-/
  Lichtaufbau in KammerDerFinsternis/DieSchwelle/BlutstromGang (CLAUDE.md
  Regel 3, "ab dem dritten Mal extrahieren"). Schlanke Basisklasse
  PrologRaum (Held, bewege, solid, Licht, hint/zeigeMeldung, Titel)
  herausziehen, alle drei migrieren, alle drei neu verifizieren. Bewusst
  als eigener Schritt (kein Nebenbei-Refactoring).
