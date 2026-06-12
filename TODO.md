# TODO - Notizen für später (keine Nebenbei-Refactorings)

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
