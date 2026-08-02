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

19. Schatten live - Feinschliff & Reichweite (Runde 55):
    Gebäude, NPCs, Gegner und Held werfen jetzt am Tag im Freien Schlagschatten
    (Regler in den Einstellungen: "Schatten / Licht-Stärke"). Offene Punkte, an denen
    ich nach deiner Sichtung weiterarbeite:
    (a) BÄUME werfen noch keinen Schatten (nur Gebäude/Figuren) - leicht nachrüstbar,
        sobald du sagst, dass die Stärke/Optik passt (sonst doppelte Arbeit).
    (b) DUNGEON-FACKEL-SCHATTEN (Raycasting) ist in der DebugArena live und schön, aber
        noch NICHT in den echten Krypta-Szenen verdrahtet - das ist der nächste Schritt,
        sobald du den Tag-Schatten abgenommen hast.
    (c) STÄRKE/LÄNGE/WEICHHEIT: aktuell harte Kanten (Projektion). Sag, ob dir die
        Schatten zu kräftig/zu lang/zu hart sind - alles in einer Datei (SchattenManager)
        justierbar; weiche Kanten (Blur) wären ein kleiner Zusatz.

20. Licht/Schatten-Varianten zur Auswahl (Runde 55): Im DebugArena (Taste X = Dungeon-Dunkel,
    Panel rechts) kannst du jetzt alle Varianten testen: Sichtradius am Helden (Regler+Schalter),
    nur Wandfackel, Kombi, mehrere Fackeln, "Licht am Helden (alt)". Dazu Feuer-Stil neu/alt und
    Weichheit. Sag mir, WELCHE Variante + welche Werte (Sichtradius, Weichheit, Feuer-Stil) sich am
    besten anfühlen (du vermutest: kleinerer Radius = gruseliger) - die übernehme ich dann fest in
    die echte Krypta. Stadtschatten sind jetzt weich + dezent; sag, ob die Stärke (0.42) passt.

21. Licht-Werkbank live + Raycaster-Sonne (Runde 55): Im Hauptspiel öffnest du mit Taste L die
    LICHT-WERKBANK und stellst ALLES live ein (persistent): Sonne Projektion/Raycaster, Sonnen-
    Kegel (Ferne), Schatten-Stärke, Weichheit, Dungeon-Variante, Held-Sichtradius, Feuer-Stil.
    Bitte teste und sag mir: (a) Welcher SONNEN-MODUS gefällt dir in der Stadt - die kurze
    Projektion oder die langen Raycaster-Schlagschatten? Bei Raycaster sind die Schatten lang
    (physikalisch korrekt für einen Punkt); soll ich die Länge begrenzen? (b) Welche Werte
    (Stärke/Weichheit/Kegel) passen? Die übernehme ich dann als Standard. Hinweis: der Held-
    Sichtradius/die Dungeon-Varianten wirken aktuell in der DebugArena voll; im Live-Dungeon läuft
    noch das alte Licht - sag, ob ich das Dungeon-Licht auch auf die Werkbank umstellen soll.

22. Strassen-/Flüsse-Zeichnung für die neuen Karten (Runde 72): Für jede neue
    Oberwelt-Karte brauche ich aus deiner UNTEREN Zeichnung die exakten
    Kreuzungspunkte je Kante (blaue Linien = Flüsse/Bäche, dunkelrote = Wege,
    blaue Ellipsen = Seen): an welcher Position (Pixel oder "oberes/mittleres/
    unteres Drittel") kreuzt was welche Kante, und wie verläuft das Wasser
    INNERHALB der Karte (Mündung in einen See? Verzweigung?).
    Konkret für START (2,3) zuerst: Salzstrasse läuft West->Ost (Default
    y≈1500 West, y≈1350 Ost). Offen: Wo betritt der Fluss die Karte, liegt
    ein See darauf, und wo verlässt er sie wieder (Süd ist Weltkante)?
    Zwischenlösung bis dahin: ich baue START-GELÄNDE + Salzstrasse + alle
    Spielsysteme schon, das neue SDF-Wasser kommt mit deiner Wasser-Linienführung
    dazu. Volle Raster-/Kanten-Übersicht: WELTKARTE-PLAN.md.

## Runde 76: POIs am Weg nach Ravensmoor + Wegmarkierung (Autorfrage "wie war das um 1300?")
Historischer Befund (recherchiert): Um 1300 gab es KEINE beschrifteten
Wegweiser oder Ortsschilder - kaum jemand konnte lesen; systematische
Schilder kamen erst mit dem Postwesen des 18. Jahrhunderts (z.B. kursächsische
Postdistanzsäulen ab 1721). Reisende orientierten sich an: LANDMARKEN
(Kirchtürme!), BILDSTÖCKEN und WEGKREUZEN an Straßen/Pilgerwegen (zugleich
Gebetsstationen und Warnzeichen an gefährlichen Stellen), Galgen vor der
Stadt (= "Stadtgebiet beginnt"), Brücken/Furten, Gasthäusern - und sie
fragten Menschen.
Mein Vorschlag für die Startkarte (jeweils klein, alle mechanisch nutzbar):
 1. BILDSTOCK an der Brücke (statt Schriftschild): Heiligennische + Kerze -
    authentisch UND als Rastpunkt/Speicherstein nutzbar. MEINE EMPFEHLUNG.
 2. Symbol-Wegweiser an der Gabelung: grober Holzpfahl mit eingekerbtem
    RABEN (Ravensmoor-Zeichen) statt Text - so löste man es für Analphabeten.
 3. GALGENHÜGEL nahe der Ostkante Richtung Stadt - düster, historisch korrekt
    als Zeichen der nahen Gerichtsbarkeit, passt zur Heavy-Rain-Stimmung.
 4. SÜHNEKREUZ abseits des Wegs - Anbindung an die Story (der Bote, der nie
    zurückkam?): verwitterter Stein, untersuchbar, erste Lore-Notiz.
 5. Verlassener KARREN mit verstreuter Fracht am Wegrand (Überfall) -
    erzählt die Gefahr, sanftes Loot-Tutorial.
 6. KÖHLER-MEILER im Waldrand - würde zugleich Frage 7 lösen (Köhler
    verkauft Kohle statt der Schmied).
Welche davon sollen rein? (Ich baue nach deiner Auswahl; ohne Antwort baue
ich als Zwischenlösung Nr. 1 + 2, beide in einer Zeile entfernbar.)

--- R94 (RTS-Block) ---
 7. Palisade "drehen": Du wolltest Eck-Elemente + Drehen. Ich habe es als
    AUTO-Verbindung gelöst (Pfähle erkennen ihre Nachbarn und bilden Ecken/
    Enden von selbst) statt eines manuellen Dreh-Knopfes - beim Ziehen einer
    L-Linie entsteht die Ecke automatisch. Zwischenlösung aktiv. Reicht dir
    das, oder willst du zusätzlich freie Diagonalen / manuelles Drehen?

--- R96 (RTS-Ausbau) ---
 8. Angriffsmarsch-Taste: Du wolltest A. A ist bei uns Kamera-links (WASD).
    Zwischenlösung: A schärft den Angriffsmarsch, der nächste Rechts-Befehl
    führt ihn aus. Reicht dir das, oder soll A fest umgelegt werden (z.B. auf
    eine andere Taste)?
 9. Im RTS-TEST-Modus greifen die gespawnten Feind-Monster auch den Helden an
    (zum Testen gewollt). Soll das so bleiben, oder im reinen Aufbau-Test der
    Held unverwundbar sein?
10. "Später"-Lager-Bauten aus deiner Nachricht (Feldaltar, Mannschaftszelt-
    Ruhe-Buff, Kochstelle, Brunnen, Feldschmiede, Wartfeuer/Signalfeuer,
    Nachschubzelt) sowie Erschöpfungs-/Wach-Wechsel und Ausrüstungs-Verteilung
    ans Heer: bewusst NOCH NICHT gebaut (du hast sie selbst als "zweite Schicht,
    erst Kämpfen/Bewegen/Formation beweisen" eingeordnet). Das Bausystem
    (platzieren/HP/reparieren/abbauen) steht jetzt - diese Bauten wären danach
    reine Dateneinträge. Sag Bescheid, welche als Nächstes.

--- R98 (Oberwelt-Kanten, BLOCKER vor weiteren Karten) ---
11. Bevor die restlichen Landschafts-Hüllen gebaut werden, muss die Prompt-1-
    Bau-Phase nachgeholt werden (Flüsse/Wege laufen sonst nicht über die
    Kartengrenzen durch): autoritative Tabelle in % aus ravenkarte.png,
    Kanten-Übergabe-System das die Builder speisen, EINE Referenzkarte, Rezept.
    Stand + Belege: WELTKARTE-PLAN.md ("STAND des Kanten-Systems"). Die
    Kreuzungspunkte aus ravenkarte.png dem Autor je Kante zur Bestätigung
    vorlegen (nichts erfinden). Frage: soll ich diese Phase als Nächstes bauen?
23. Katakomben-Dungeon (V8, R102) - WO soll er live laufen? [R102b: Autor will es
   irgendwo verwenden - "vielleicht als Uebergang / Passage / sogar erste Karte".
   Ort noch offen. Gaenge auf 2 Kacheln verbreitert + mehr Deko eingebaut.] Zwischenlösung: Schalter
   KATAKOMBEN_EINSATZ in src/data/katakombenDungeon.ts (ebenen: [3] oder abEbene: 4),
   Standard AUS; testbar in der DUNGEON-PROBE (V8) und im Spiel über F10 ->
   KASTEN -> "Katakomben-Dungeon betreten". Sag mir "nutze ab Ebene X" / "Ebene X"
   / "eigener Dungeon mit Eingang bei Y" - die Aktivierung ist eine Zeile.
24. Katakomben-Dungeon Boss: aktuell ein Elite-Champion "Herr der Tiefe"
   (Zwischenlösung). Soll die Bossarena einen ECHTEN inszenierten Boss bekommen
   (wie der Templer in den Boss-Kammern), und welchen?
25. Dorf-Layout (R104): das beigefuegte Planungsbild lag den Uploads NICHT bei -
   das Platzhalter-Layout ('stadt'-Area, src/data/dorfplan.ts) ist daher aus deiner
   Text-Beschreibung + Angerdorf-Archetyp + echtem Terrain abgeleitet. Schick mir
   das Bild, dann ruecke ich die exakten Positionen nach.
26. Dorf-Ausgaenge passen NICHT zur aktuellen Oberwelt-Nachbarschaft: du willst
   Nord->Kloster, Ost->Burg, Sued->Marktort, West->Dunkelwald; aktuell grenzt
   'stadt' an lager(N), wald_se(O), start(W) und NICHTS(S). Die Suedkante hat gar
   keinen Weg-Uebergang (Wasser/Wald). Die Platzhalter-Ausgangsboxen markieren nur
   deinen Wunsch - die echte Overworld-Verdrahtung + ein Sued-Uebergang sind eigene
   Schritte. Soll ich die Nachbarn umhaengen, und wo genau der Sued-Ausgang hin?
27. Dorf-Form: die Planungskarte ist 128x128 (quadratisch), die Area 130x85
   (breit). Ich habe den Anger E-W entlang der Salzstrasse gelegt (passt zur breiten
   Form). Falls dein Plan den Anger N-S vorsieht, muss ich anders einpassen - sag
   Bescheid, wenn das Bild da ist.


## 28. menu-ui-template/ fehlt im Repo (R112b)
Der Autor verweist fuer den HUD-Umbau auf C:\Obsidian\DM\menu-ui-template\
(claude-code-handover-final-ui-1300.md, final-hud-extra-flat-reference-
layout-1300.png, Asset-Boegen, Selbstcheck-Liste). Diese Dateien sind in
KEINEM Branch des Repos. ZWISCHENLOESUNG: Settings-Restyle nach
reference/menue-vorlage-1300.png + Chat-Anweisungen umgesetzt; die HUD-
Uebergabe wartet, bis der Ordner gepusht ist (z.B. via Codex-Branch, wie
bei reference/menue-vorlage-1300.png geschehen).


## 29. V4-Mine: 4x oder 6x laenglich? (R119)
4x laenglich (196x120) ist umgesetzt. Der Autor ueberlegt 6x laenglich
(240x147). ZWISCHENLOESUNG: 4x aktiv; Umschalten = eine Zeile in
src/world/hoehlenDungeon.ts (W/H). In der DUNGEON-PROBE (V4) begutachten.
- ERLEDIGT R127e: Mine ist LIVE (buildGoldmine = V4-Generator, Eingang wie
  gehabt am Hoehlenmaul im Dunkelwald) und die Adern sind ABBAUBAR
  (Eisen/Kupfer/Gold). NEUE Frage: Wofuer soll KUPFER verwendet werden
  (Schmiede-Rezepte? Kessel? Muenzen)? Zwischenloesung: sammelbares Material
  ohne Rezept.
- R127e Optik der Live-Mine: WorldScene nutzt noch die Standard-Fels-Optik -
  soll ich die Hoehlen-Optik (nahtloses Gestein, Fels-Kanten, Grubenlicht,
  Tropfen) in die WorldScene portieren? Zwischenloesung: Layout+Abbau live,
  Optik-Portierung als eigene Runde.

## 31. AUFTRAG-dorfleben-anker.md fehlt im Repo (M0 Dorfwirtschaft)
Der neue Auftrag verweist auf ihn als Grundlage (Anker-System, Tagesplaene,
Natuerlichkeit). ZWISCHENLOESUNG: Kern aus den Verweisen rekonstruiert und als
M0 umgesetzt (src/data/dorfleben.ts). FRAGE: Bitte die Originaldatei liefern,
falls dort mehr steht (z. B. besondere Anker je Figur) - wird dann nachgezogen.

## 30. 3D-Haus-GLB: Material-Farben & Kollisions-Zentren fehlen im Export (R131c)
Der gelieferte GLB (medieval_carpenter_house_3d_runtime.glb) hat KEINE Texturen und
bei 16 von 20 Materialien die Grundfarbe = reines Weiss - das Haus wuerde sonst
komplett weiss/ueberbelichtet rendern. Ausserdem sind alle collision_guides-Zentren
in der Runtime-JSON auf 0 gesetzt (nur die Groessen stehen drin), und die
COLLISION_/NAV_-Knoten liegen nicht im GLB.
ZWISCHENLOESUNG (laeuft, sieht gut aus):
 - Material-Farben nach Namen getintet (src/data/hausMaterial.ts, in einer Datei
   aenderbar) - dunkle Eiche, Lehm-Gefach, Schindeln, Feldstein.
 - Kollision = mitdrehender Grundriss-Footprint aus bounds_blender (kein per-Wand).
FRAGE: Kannst du das GLB mit echten Material-Farben/Texturen UND echten
collision_guide-Zentren neu exportieren (Codex)? Dann fallen Tinting + Footprint-
Naeherung weg und wir bekommen exakte Wand-Kollisionen. Bis dahin bleibt die
Zwischenloesung aktiv.

## R138 - Respawn-Feinschliff (Zwischenloesung aktiv)
Beim Tod auf einer OBERWELT-Karte erwacht der Held jetzt am EINGANG derselben
Karte (Karten-Spawn, Westseite). Du sagtest "evtl. die map davor oder so" -
Alternative waere die tatsaechlich zuvor besuchte Karte (merken wir uns beim
Kartenwechsel). ZWISCHENLOESUNG: dieselbe Karte am Eingang - kein Rueckwurf
quer durch die Welt, kein zusaetzlicher Zustand. Dungeon-Tod fuehrt nach
Ravensmoor (stadt). Sag Bescheid, wenn du stattdessen die Vorgaenger-Karte
willst - eine Zeile in src/logic/respawn.ts.

## R138 - V9 vs. Katakomben: NICHT dasselbe
Du vermutetest, beides sei das gleiche. Es sind ZWEI Generatoren:
V9 = "Kammern + echte Tueren" (R118), Katakomben = "Raum+Gang+Vault-Verlies"
(R102, mit Rollen wie Eingang/Boss/Gewoelbe). Beide liegen jetzt im Maps-Tab.
FRAGE: beide behalten oder einen streichen?

## R138b - Fluss-Sichtbarkeit MIT Shader (bei Tag)
Beim Verifizieren fiel auf: der Fluss auf 'start' ist mit Shader AN morgens
und sogar mittags bei Sonne kaum vom Boden zu unterscheiden (Beleg:
screenshots/r138-fluss-mittag-shader-an.png - dieselbe Stelle zeigt mit
FLACHEM Ersatz-Wasser ein klares Band: r138-flachwasser-statt-unsichtbarer-
wand.png). Das duerfte MIT-Ursache deines "unsichtbare Wand"-Erlebnisses sein.
FRAGE: Soll ich einen Sichtbarkeits-Pass am Wasser-Shader machen (staerkerer
Ufersaum/Kontrast bei Tageslicht)? Ich fasse den kanonischen Shader-Look
(reference/fluss-bach.html) nicht ohne dein Go an. ZWISCHENLOESUNG: keine -
Werte lassen sich live im WASSER-Tab der Dev-Konsole testen.

## R141 - Soll das Heer beim Kartenwechsel automatisch mitkommen?
Dok 03 sagt "beim Betreten einer Karte: Roster-Einheiten spawnen". Ich habe
mich fuer einen AUFSTELL-Knopf entschieden (BEFEHLE-Tab + Wartfeuer-Schuebe)
statt Auto-Spawn - sonst marschiert die Armee auch durch Stadt und Dungeon.
ZWISCHENLOESUNG: Heer folgt nur auf Befehl. FRAGE: Beim spaeteren FELDZUG
(Akt 3, eigene Schlacht-Karten) automatisch aufstellen - reicht dir das?

## R142 - Wie ruft der Graf?
Die Verstaerkung marschiert jetzt real vom Waldrand nach Ravensmoor
(Test-Knopf im TEST-Tab). Du liessest offen, WIE der Ruf ausgeloest wird.
ZWISCHENLOESUNG: Test-Knopf. VORSCHLAG mit Spielgefuehl: ein BOTE - du
schickst einen benannten Reiter von Ravensmoor zur Fuerstenburg (er
marschiert real ueber die Karten, kann abgefangen werden!), und erst seine
Ankunft loest die Grafen-Kolonne aus. Teuer erkauft, spuerbar, erzaehlt sich
selbst. Alternative: automatisch alle N Tage mit der Abgabe. Was willst du?

## R145 - Einfall haengt noch am ARCHIV-Dorf
Der Monster-Einfall (startEinfall/startGrosserEinfall, Einfall-Zwischenspeicher,
Abwehr-Belohnung) prueft ueberall noch `village` - das ist seit dem Umzug das
tote Archiv. Folgen: im NEUEN Ravensmoor (stadt) feuert kein Einfall mehr, und
stirbt man waehrend eines (Archiv-)Einfalls, verpuffen die Angreifer beim
Erwachen. Wegen Regel 14 (ARCHIV nie anfassen) habe ich das nicht umgebaut.
ZWISCHENLOESUNG: keine - Einfaelle ruhen faktisch. VORSCHLAG: eigener Auftrag
"Einfall-Umzug nach Neu-Ravensmoor" (Tor-/Mauer-Logik der stadt gleich mit).

## NACHTRAG R176: Stand der alten Fragen
- R145 (Einfall am Archiv-Dorf): ERLEDIGT in R157 - der Einfall laeuft jetzt
  komplett im neuen Ravensmoor (stadt), Monster kommen organisch ueber die
  Nord-/Ost-Strassen. Frage gegenstandslos.
- R141 (Heer beim Kartenwechsel) und R142 (Wie ruft der Graf? Boten-Vorschlag)
  sind weiterhin OFFEN und warten auf deine Entscheidung.

## R179 - Wie heisst der Bote?
Der Grafen-Bote ist eingebaut (wohnt beim Amt, Schulze schickt ihn; Botenposten
holt ihn ins Feldlager). Ich habe ihm bewusst KEINEN Namen gegeben (Regel 6:
Namen kommen vom Autor). ZWISCHENLOESUNG: er heisst schlicht "der Bote".
FRAGE: Wie soll er heissen - und soll er ein Gesicht/Portrait bekommen?

## R180 - Feldzug-Balance (Zahlen gehoeren dir)
Der Feldzug-Plan steht (FELDZUG-PLAN.md, Phasen F1-F6). Offene Design-Zahlen:
1. Wellen-Groesse der Feind-Produktion je Lager (Vorschlag: 4-8, waechst je Woche)?
2. Wie viele Karten darf der Feind maximal besetzen, ehe es kritisch wird?
3. Golem: nur per Truppen-Fokus fällbar - oder auch mit Belagerungs-Trick (Palisade+Bogen)?
4. Aussehen der Feind-Befestigung (Knochenpalisade? Pfahlwerk mit Bannern?)
ZWISCHENLOESUNG: ich baue F1 zuerst (Gebiets-Status) - der ist zahlenfrei.

## R182 - Letzter Rueckzugsort bei verlorenem Feldzug?
Beschlossen: KEIN Totalverlust. Offen: WOHIN zieht man sich zurueck, wenn
alle Karten fallen - Fuerstenburg (existiert als Karte, mein Vorschlag)
oder "in die Berge" (neue Karte noetig)? ZWISCHENLOESUNG: Fuerstenburg.

## R184 - Zwei Zufluchten (Hoher Norden vs. Fuerstenburg): meine Vorschlaege
Problem (Autor): warum in den Hohen Norden fliehen, wenn es die Burg gibt?
VORSCHLAG A (mein Favorit): die Burg NIMMT KEINE FLUECHTLINGE. Der Graf
  verriegelt die Tore - "die Seuche des Nordens" (Dok 06 B1: er KANN
  politisch nichts anderes sagen) darf seine Mauern nicht erreichen; er
  fuerchtet Ansteckung/Unterwanderung und hat selbst kaum Vorraete. Er gibt
  TRUPPEN, aber kein Asyl. Das ist historisch glaubwuerdig (Staedte wiesen
  Pestfluechtlinge ab), macht den Grafen ambivalent (starker Story-Ton) und
  ZWINGT die Zuflucht im Norden, ohne eine Karte zu sperren.
VORSCHLAG B: die Burg ist ZU WEIT und der Weg zu gefaehrlich fuer einen
  Treck - Bewohner sind langsam, der Konvoi wuerde auf den Weststrassen von
  der Horde gestellt (Konvoi-Mechanik). Der Norden ist naeher und die Horde
  will die STADT, nicht die Berge. (Funktioniert, erklaert aber nicht,
  warum man nicht SPAETER nachzieht.)
VORSCHLAG C: Kombination - kurzfristig Norden (nah, Berge = verteidigbar),
  und die Burg nimmt nur VERWUNDETE/Kinder in kleinen, eskortierten
  Konvois auf (Nebenmissionen). Das nutzt beide Orte.
Dein eigener Vorschlag (Horde blockiert die Startkarte) kommt danach zum
Vergleich. ZWISCHENLOESUNG: A.

## R192 - Gegenstaende im Kommando-Fenster?
Der Autor ueberlegt, ob auch GEGENSTAENDE im Auswahl-Bereich des Kommando-
Pults erscheinen sollen (neben Einheiten/Gegnern/Gebaeuden, R193).
ZWISCHENLOESUNG: erstmal nicht - erst Einheiten/Gegner/Gebaeude sauber.

## F3 - Monster-Bau-Assets definieren (Autor-Ansage)
Das Feindlager steht mechanisch (Bindealtar, Knochenwall, Waechter), aber die
OPTIK ist Platzhalter (Altar = Untoten-Koerper, Wall = Mauerriss-Kacheln).
Zu definieren (Autor + ggf. Codex/Blender): Bindealtar-Modell, Knochen-
palisade, Fleisch/Blut-Bauten, Blutlager-Fass/Becken. ZWISCHENLOESUNG:
Platzhalter bleiben, Mechanik ist fertig verdrahtet.

## NACHTRAG (F5/F6/KI-Teil-2 - einige der obigen Fragen sind jetzt praktisch beantwortet)
- R180.1 (Wellen-Groesse): gesetzt - Live-Welle gedeckelt auf 10, Sturm-Nachschub
  gedeckelt auf 16 lebende Feinde (nie Hunderterhorden, dein R180-Wunsch). Alle
  Zahlen in src/data/welt.ts FELDZUG, in einer Zeile aenderbar. FRAGE bleibt nur:
  passt dir das Gefuehl der Deckel, oder groesser/kleiner?
- R180.3 (Golem faellbar): ENTSCHIEDEN mit F6 - der Golem-Panzer bricht nur
  GEBUNDEN (3+ Nahkaempfer/Held im Umkreis), allein prallt fast alles ab. KEIN
  eigener Belagerungs-Trick noetig; wenn du einen willst (Palisade+Bogen), sag es.
- R192 (Gegenstaende im Kommando-Fenster): weiterhin Zwischenloesung "erstmal
  nicht" - Einheiten/Gegner/Gebaeude sind sauber (R193). Sag, ob Items rein sollen.
- NEU offen (KI-Teil-2): Ich habe 16 der 24 Punkte des KI-Dokuments NICHT
  uebernommen (Reservierungen, Force-Tracking, Detachment-Baum, Korridor/Sync/
  Flanken/Frontabschnitte, Feind-Rueckzug mit Nachhut, freie Bau-KI, Kampf-
  simulation) - alle mit Begruendung in docs/design/07-FEIND-KI.md TEIL 2. Die
  meisten brauchen eine 200-Einheiten-RTS-Buehne, die wir bewusst nicht haben,
  oder verstossen gegen die harten Regeln 5/6 (Kavallerie/Belagerung) bzw. gegen
  R147b (Untote fliehen nicht). FRAGE: Willst du groessere Feldzug-Schlachten
  (Rueckeroberung mit mehreren Gruppen)? Dann lege ich die zurueckgestellten
  Punkte (Korridor, Sync, Flanken, Kampfsimulation) wieder vor.

## AUTOR-NACHTRAG (nach KI-Teil-2) - drei Punkte zurueck auf "offen"
Details + Begruendung in docs/design/07-FEIND-KI.md TEIL 2 AUTOR-NACHTRAG (N1-N3).
- N1 BELAGERUNGSGERAET: nicht verworfen, nur zurueckgestellt - erst alles andere,
  dann klaeren WAS genau (Rammbock/Wurfgeraet, nur Monster oder auch Heer). Regel
  5/6 bleibt: Kavallerie-Gattung tabu, Belagerungsgeraet braucht Autor-Freigabe.
- N2 FEIND-RUECKZUG MIT NACHHUT: aufnehmen fuer den grossen Feldzug. Kopplung zu
  R147b aufgeloest: kein individuelles Panik-Fliehen (verboten), aber BEFOHLENER
  Horden-Rueckzug durch die steuernde Intelligenz ist erlaubt (kalte Taktik).
- N3 FREIE BAU-KI: Autor unschluessig. IST = feste Reihenfolge/feste Anker (A9/F3).
  Claude-Empfehlung = Mittelweg (vorgefertigte, routen-sichere Lager-Blaupausen +
  sichtbare Monster-Arbeiter). ENTSCHEIDUNG des Autors steht aus.

## KAMPF-VERHALTEN AUSSERHALB RTS-MODUS (Autor "die Verhaltens-Einstellungen haben keinerlei Wirkung")
Befund: Die drei Verhaltens-Achsen (Bewegung aggressiv/verteidigen/halten,
Angriff, Zielwahl) leben in rtsBattle.ts und werden NUR angewandt, solange der
RTS-Modus laeuft (rtsBattle wird erst beim Umschalten erzeugt). Im normalen Spiel
(Feldzug-Angriff, Garnison) nutzen die Soldaten die schlichte Enemy-KI - darum
"keine Wirkung".
Zwischenloesung (jetzt gebaut): PROVOKATION wirkt in BEIDEN Modi - ein getroffener
Soldat jagt seinen Angreifer aktiv, auch den Bogenschuetzen aus der Distanz. Das
loest den konkret gemeldeten Schmerz ("stehen bloed rum und lassen sich toeten").
Echte Frage: Sollen die Verhaltens-Achsen dauerhaft (auch OHNE RTS-Modus) gelten -
also z.B. eine als "aggressiv" gestellte Garnison jeden Feind verfolgen? Das waere
ein groesserer Umbau (Haltungs-Logik unabhaengig vom rtsBattle-Update) und beruehrt
die R188-Performance-Arbeit. Ich warte auf dein OK, bevor ich das anfasse.

## R206 - Monster-Vorschlaege (Kontaktbogen liegt im Chat)
Sechs neue Gegner, alle aus Dok 06 ("Zeitgeist statt Zauber") abgeleitet,
als FIGURES-Eintraege gebaut (Platzhalter-Optik, Werte folgen nach Auswahl):
1. DER SCHINDER (Dok 06 Teil D) - hebt Gefallene wieder auf, selten/langsam/
   schwach, DAS Prioritaetsziel. Zwischenloesung: noch nicht verdrahtet.
2. GEFALLENER HELD (C2) - Elite-Scherge in rostiger Prunkruestung.
3. MOORLEICHE - zaeher, langsamer Ufer-/Moor-Schrecken (historisch verwurzelt).
4. UNTOTER FUHRMANN (Teil E) - fuehrt den Blut-Konvoi, Ueberfall-Ziel.
5. UNTOTER ZIMMERMANN (Teil E) - baut die Feind-Palisaden sichtbar.
6. LEICHENHUND - verwildertes Tier, jagt im Rudel, flieht bei Gegenwehr.
FRAGE an den Autor: welche davon einbauen, welche zuerst? Vorschlag:
Schinder zuerst (loest laut Doku den Lehrmoment im Kerker), dann Moorleiche
(nutzt Moor-Nebel/Naesse), dann die zwei Arbeiter (machen die Feind-
Wirtschaft sichtbar). Werte kommen dann nach Dok 06/02 in enemies.ts.

## R212 - Wesen jenseits untoter Menschen (Autor-Frage "was gibt es noch?")
Vorhanden: Wolf, Ratte, Leichenhund (Tiere), Menschengolem + Skelettwache
(Machwerke des Klosters), Grabschatten (Geist). Vorschlaege im Zeitgeist-Ton
(Volksglaube statt Fantasy - niemand sagt "Magie"):
1. AASKRAEHEN-SCHWARM - die Raben von Ravensmoor als Gegner: umkreisen den
   Helden, picken, stieben bei Schlag auseinander. Passt zum Spielnamen.
2. IRRLICHT - Moorlicht, das nachts in den Sumpf LOCKT (kein Kaempfer,
   ein Verfuehrer; Volkssage, im Moor-Nebel-System zuhause).
3. WERWOLF - Volksglaube; als seltener Wald-Boss bei Nacht.
4. KEILER / verwilderte Weidetiere - entlaufenes Vieh der Gefallenen,
   nutzt das bestehende Vierbeiner-System.
5. FLIEGENSCHWARM am Kadaver - Flaechen-Aergernis um Leichen, verbindet
   sich mit dem Beerdigen-System aus Dok 06 D4.
Zwischenloesung: nichts davon gebaut, erst Autor-Wahl. Empfehlung:
Aaskraehen zuerst (Marke!), dann Irrlicht (nutzt Moor-Nebel).

## R219 - Der Hohe Dom (Trier)
- WO liegt der Dom in der Spielwelt und wie betritt man ihn? Zwischenloesung:
  Planungskarte 'dom' im Maps-Tab (Dev-Konsole), noch kein Eingang im Spiel.
  Denkbar: eigener Huegel auf einer Nordkarte, oder als Wallfahrts-Ziel einer
  Quest. Aussenansicht (Fassade auf der Oberwelt) fehlt ebenfalls noch.
- Die drei Krypten liegen als Ost-Trakt AUF derselben Karte. Sollen sie
  spaeter eine echte Unter-Ebene mit eigener Treppe werden?

## R223 - Der versunkene Bezirk
- WO kommt das Sonderlevel hin? Zwischenloesung: Planungskarte im Maps-Tab.
  Es waere ein Kandidat fuer ein eigenes Stadt-Ruinen-Gebiet (versunkener
  Stadtteil von Ravensmoor?) oder eine Zwischenebene der Katakomben.
- Soll aus dem Modul-Prinzip der Vorlage ein eigener Generator werden
  (Zellen-Module mit Anschlusskanten), oder bleibt es bei Einzelkarten?
