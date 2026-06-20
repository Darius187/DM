# OFFENE FRAGEN an den Autor (mit gewählten Zwischenlösungen)

1. Landherr-Name für die Tabletop-Anbindung: Zwischenlösung "Landherr von
   Falkenberg" in src/data/story.json - dort in einer Zeile änderbar.
   Wie heißt der Landherr in eurem Tabletop?
2. Heinrichs Belohnung der Anna-Quest ("sein bestes Item"): Zwischenlösung
   ist ein garantiert seltener Ring + 100 Gold. Soll es etwas Bestimmtes sein
   (z. B. ein benanntes Erbstück mit fester Werteliste)?
3. Schwerer Hieb: Der Masterprompt nennt 0,6 s Ausholzeit, aber keine
   Erholzeit danach. Zwischenlösung 0,7 s (kampf.ts). Fühlt sich das richtig an?
4. Fertigkeits-Schulen: Wie schnell sollen die Stufen kommen? Zwischenlösung:
   Stufe 3 nach 80 Benutzungen, Stufe 9 nach 500 (balancing.ts, eine Kurve).
5. Die Soundliste in Teil 9 enthält keinen Wolf-Laut - der Wolf nutzt vorerst
   den Hund-Klang. Soll ein eigener "wolf_knurren"-Sound in die Liste?
6. Präfix-Deklination: Die Referenz bildet Namen als "Präfix + Basis", was
   bei neutralen Substantiven zu "Grimmiger Kettenhemd" führt (war in der
   Referenz genauso). Zwischenlösung: 1:1 übernommen. Sollen die Präfixe
   je Genus dekliniert werden (kleine Tabelle in items.ts)?
7. "Kohle vom Köhler" (Masterprompt 7.2): Es gibt keinen Köhler-NPC in der
   Gebäudeliste. Zwischenlösung: Der Schmied verkauft Kohle (12 Gold).
   Soll ein Köhler im Wald dazukommen?
8. Cleverness-Regler (Runde 35, deine Frage "bringt nichts?"): Er wirkt, ABER
   zwei der drei Verhalten sind reine AN/AUS-Schwellen (ab 0,5: Schild-
   Gegenstoss + Sammeln auf Verbuendete); nur der Rueckzugs-Konter skaliert
   stetig. Zwischen 0,5 und 2,0 aendert sich also fast nichts - dein Eindruck
   stimmt. Vorschlag/Zwischenloesung: belassen wie es ist; ich kann es auf
   STETIGE Skalierung umbauen (Block-Wahrscheinlichkeit, Sammel-Dauer, Konter-
   Chance wachsen alle mit dem Regler), dann macht jeder Schritt einen
   spuerbaren Unterschied. Soll ich das umbauen?
9. Physik-Test (Runde 35): Erste Stufe gebaut - im F10 "PHYSIK-TEST" anschalten,
   dann Fässer/Kisten schieben. Offen, was sich SONST noch physikalisch
   verhalten soll: (a) Pfeile, die in Wand/Boden/Gegner stecken bleiben,
   (b) Rückstoß auf lebende Gegner je nach Waffe (Hammer wirft weiter als
   Schwert - analog zur Gore-Wucht GORE_WUCHT), (c) weitere schiebbare Dinge
   (Stühle, Krüge rollen?). Sag, was als Nächstes dran ist, dann baue ich es
   - weiterhin erst hinter dem Schalter, dann live schalten.
10. Gegner-Vielfalt (Runde 35, Autorwunsch "mal Schwert, mal Schild, immer
    unterschiedlich"): Aggression + Flankieren sind drin. Offen ist die OPTISCHE
    Vielfalt: Schilde gibt es bisher nur für Skelette (Verhalten UND Bild).
    Schilde/Schwerter auch für Pest/Lebende Tote brauchen je eine sichtbare
    Variante in der Figur-Zeichnung (fallbackArt). Soll ich (a) das Schild-Bild
    auf Pest/Lebende Tote erweitern, (b) eine Schwert-Variante (mehr Reichweite/
    Schaden, sichtbare Klinge) ergänzen, (c) beides mit Zufalls-Mischung je
    Spawn? Sag, welche Mischung dir vorschwebt, dann zeichne ich die Varianten.

11. Screenshot-"Fehler" Krypta Ebene 1 (Runde 40, "was ist das fuer ein Fehler -
    siehe Screenshot"): Ich habe Ebene 1 nachgestellt (Playwright) - Boden, Waende,
    Faesser/Kisten, Blutspuren und die Dunkelheit rendern stimmig, ich finde keinen
    klaren Render-Bug. STARKE Vermutung: der rot markierte "leere" Bereich war die
    Folge des Geleert-Fehlers (du kamst in eine faelschlich als geraeumt geltende,
    also leere Ebene zurueck - dunkel, nur noch Props und alte Blutspuren). Den
    Geleert-Fehler habe ich behoben; damit sollte sich das erledigt haben.
    Falls es DOCH ein eigener Render-Fehler ist: bitte den Screenshot mit einem
    Pfeil auf die GENAUE Stelle (welches Objekt/welche Kachel wirkt falsch) - dann
    fixe ich gezielt, statt auf Verdacht (CLAUDE.md-Regel "erst reproduzieren").

- Prolog "Ebene 1" - Platzierung im Hauptspielfluss (ich habe es eingebaut, brauche aber deine Bestätigung der Lesart):
  Ich habe die drei Räume nach ihrem Briefing-ZWECK verteilt, nicht alle drei an den Anfang:
  - ERÖFFNUNGS-PROLOG (einmalig, beim ERSTEN Abstieg unter die Kirche): Kammer der Finsternis -> Die Schwelle -> Schalter/Treppe zurück ans Tageslicht -> wieder im Dorf. Danach führt dieselbe Treppe normal in die Krypta (crypt1). Begründung: die Treppe ist im Spiel schon als "Ebene 1" beschriftet, die Schwelle ist laut Briefing "das Finale von Ebene 1", und du wolltest einen Schalter, der zurück ins Dorf bringt (= du fliehst und meldest dem Fürsten, was du gesehen hast - passt zum Boten, der nie zurückkam).
  - PRE-BOSS (einmalig, letzter Abstieg vor dem Boss, crypt5 -> Boss): Der Blutstrom-Gang. Begründung: das Briefing nennt ihn ausdrücklich "der Gang DIREKT vor der Boss-Arena".
  ZWISCHENLÖSUNG falls du es anders willst: (a) alle drei Räume als ein Block am Anfang, oder (b) der Eröffnungs-Prolog führt direkt in die Krypta (statt zurück ins Dorf). Beides ist ein Ein-Zeilen-Wechsel.
  OFFEN/Folgefrage: Soll der Prolog dann auch die Krypta-Nummerierung verschieben (Krypta = "Ebene 2-6" statt 1-5)? Aktuell NICHT verschoben (Krypta bleibt Ebene 1-5), weil das viele Stellen berührt - sag Bescheid, wenn die Krypta hochzählen soll.

12. Art-Liste Runde 50 - zwei Lesarten, die ich plausibel gewählt habe (sag, falls anders gemeint):
    (a) "Türen/Zellen als begehbare Eingänge, kein Laden": Ich habe es als ZELLE in der
        Folterkammer umgesetzt - eine Gitterreihe mit einem offenen, begehbaren Zellentor,
        durch das man in die Zelle hineingeht (kein Gebietswechsel), dahinter die Truhe.
        ZWISCHENLÖSUNG falls du etwas anderes meintest: Falls es um die NORMALEN Krypta-
        Kammern/Durchgänge ging (die sind ohnehin schon nahtlos, eine Karte ohne Laden) oder
        um sichtbare Türblätter zwischen den Kammern - sag Bescheid, dann ergänze ich Türrahmen
        an den Durchgängen.
    (b) ERLEDIGT in Runde 50: Folterkammer ist jetzt ein eigener TRAKT (Instrumentenraum oben,
        Eingangsgang, Zellenblock mit begehbaren Zellen unten). Falls die UMSETZUNG anders gewünscht
        ist (z. B. mehr/weniger Zellen, andere Anordnung), sag Bescheid. Ursprünglicher Hinweis:
        Aktuell ist die
        Folterkammer EIN Sonderraum (Streckbank über 2 Kacheln, Käfige, begehbare Zelle, Blut,
        Notiz, seltene Truhe, ein gefangenes Wesen). Sie ist NICHT baulich vom Rest abgetrennt.
        Falls du einen klar abgegrenzten Trakt willst (eigener Gang -> mehrere Zellen ->
        Instrumentenraum), ist das ein größerer Layout-Schritt - sag, ob ich das aufsetzen soll.

13. Neue Eröffnung statt der Reitszene (du wolltest dir etwas überlegen): Ich habe die Reitszene/das Pferd ENTFERNT - das Spiel startet jetzt schlicht im Wald, der Held läuft selbst nach Ravensmoor (Titel + Geschichtszeilen bleiben). Für die RICHTIGE neue Eröffnung brauche ich dein Konzept: Soll der Held direkt IM Dorf starten? Wer schickt ihn wohin (welcher NPC, welcher erste Auftrag)? Wie soll er "ein wenig Gold verdienen" - welche erste Aufgabe (Botengang, Holz/Kräuter sammeln und verkaufen, einem Bauern helfen)? Sag mir den groben Ablauf, dann baue ich ihn.
14. Hof-Pferde (Deko am Bauern-Gatter): Du wolltest Pferde "ganz klar weglassen". Die REIT-Pferde sind weg. Es stehen aber noch zwei Deko-Pferde am Gatter (reine Vierbeiner-Grafik wie Kuh/Schwein, kein Reiter). Sollen die auch raus, oder dürfen sie als Hoftiere bleiben?

15. Fischer am Waldsee (Runde 51, gebaut): Fischer "Konrad" sitzt am Westufer und angelt sichtbar (arbeit 'fischen'), ansprechbar. Seine zwei Dialogzeilen in dialoge.ts (VOLK.waldfischer) sind PLATZHALTER von mir - formulier sie gern um (Name + Text). Soll er auch Fisch VERKAUFEN (wie Nepomuk in der Dorf-Fischerhütte), oder nur Atmosphäre bleiben?

16. Figur-Stil + Schatten-Technik (Runde 55):
    (a) FIGUR-RICHTUNG offen - A: alle Charaktere im Held-Detailstil, oder B: den Helden auf das
        Niveau der bestehenden Roben-Figuren vereinfachen. Dein Eindruck: die Detail-Beispiele
        (Skelett/Buerger/Pest-Opfer/Lebender Toter, F10-Viewer) wirken eher comic als ernster
        Grusel. ZWISCHENLOESUNG: Entscheidung geparkt, einfache Figuren laufen weiter; detaillierte
        Charakter-Kunst/-Animation erst im finalen Polishing (gefahrlos dank modularem Rigg+Skin).
        Sag A oder B, wenn du festlegen willst.
    (b) SCHATTEN-TECHNIK (deine SFSS-Frage) - Slembcke "Super Fast Soft Shadows" ist die Top-
        Referenz fuer weiche 2D-Schatten, aber reine WebGL/Shader-Technik (eigener Pipeline-Port
        noetig, kein Canvas-Fallback). MEINE EMPFEHLUNG/ZWISCHENLOESUNG: zuerst die manuelle
        Verdeckung aus der DebugArena in den Live-LightingManager holen (echte Schlagschatten von
        Fackel/Sonne hinter Waenden/Objekten, dependency-frei, Canvas+WebGL, weiche Kanten per
        Blur, Performance-Regler) - das ist der groesste Atmosphaere-/Grusel-Hebel und nutzt den
        vorhandenen LightingManager. SFSS als WebGL-Upgrade fuers Endpolishing vorgemerkt.
        Sag Bescheid, ob ich die Live-Integration der Schatten jetzt angehen soll.

17. Elementarpfeil-Bug "funktioniert am Anfang kurz, danach nicht mehr" (Runde 55):
    Ich konnte KEINEN Logik-Fehler reproduzieren, der die Elementwirkung nach einiger
    Zeit abschaltet - die Erkennung (gefasster Stein + Bogen-Stufe) wird pro Schuss frisch
    geprüft, Pfeile werden nicht als Munition verbraucht. Der gefundene echte Mangel: der
    fliegende Pfeil hatte im Flug KEINE Element-Optik (immer schlichter Holzpfeil), der
    gesockelte Effekt war also unsichtbar. DAS ist jetzt behoben (Pfeil glüht durchgehend
    farbig + Schweif; Frost blau, Feuer orange, Schatten violett). BITTE PRÜFEN: ob damit
    dein Symptom weg ist. Falls die Wirkung (Verlangsamen/Brennen/Lebensraub) WIRKLICH nach
    ein paar Schüssen ausbleibt, sag mir bitte die genaue Situation (Stein im Bogen oder in
    der Hauptwaffe? nach Waffenwechsel? nach Treffer X?), dann grabe ich gezielt weiter.

18. Grusel-Atmosphäre & Rüstungs-Look (Runde 55):
    (a) "Held ändert sich bei Kettenhemd/Plattenrock nicht": In meinem Test ÄNDERT sich der
        Detail-Held mit der Rüstung (Kette -> Platte deutlich heller/stählerner, in der GRUSEL-
        SCHATTEN-Probe per RÜSTUNG-Knopf nachstellbar). FALLS du keinen Wechsel siehst: läuft
        bei dir die EINFACHE Roben-Figur (F10-Umschalter)? Die ist bewusst EINE Robe und ändert
        sich nicht mit der Rüstung. Sag mir, in welchem Bildschirm (einfache Figur? Detail-Viewer?
        Charakter-Portrait?), dann fixe ich gezielt.
    (b) Grusel live: aktuell kalter Tint auf Gegner per F10-Regler (0/33/66/100%) im echten Spiel.
        Die volle Dunkelheit + Raycasting-Schatten (wie in der GRUSEL-SCHATTEN-Probe) live in die
        WorldScene/DebugArena zu holen ist ein größerer Schritt (Verdecker aus den Tiles, Licht je
        Szene). Sag Bescheid, ob dir der Tint-Regler erstmal reicht oder ob ich die volle
        Schatten-Beleuchtung ins Live-Spiel einbauen soll.
