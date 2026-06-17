# Ravensmoor - Ideen-Backlog / TODO (lebende Liste)

Hier landen ALLE Ideen sofort, auch wenn ältere noch nicht fertig poliert sind.
Nichts geht verloren - "offen" heißt nicht "verworfen". Erledigtes wandert nach
unten unter "Erledigt". Detail-Konzepte stehen in LORE-IDEEN.md / WIRTSCHAFT-PLAN.md.

## Gerade in Arbeit
- (frei)

## Welt & Karte
- [ ] Holzfäller-Lager, Stein-Bergwerk und Goldlager AUF die Dorfkarte (im
      Waldgürtel), mit Wegen dorthin. (Autor-Entscheidung Runde 51.)
- [ ] Gold wird sichtbar vom Lager in die Stadt transportiert (Träger).
- [ ] Lange Wald-Anreise als Folge nahtlos verbundener Gebiete (statt EINER
      Riesenkarte) - Wald -> Schauplätze -> Dorf -> ... -> Kloster.
- [ ] Nahe Dörfer / Burg / Kloster (Finale im Kloster).
- [x] Waldsee im Dunkelwald (Atmosphäre, Wasserfläche mit Grasufer). OFFEN:
      Fischer-NPC am Ufer (evtl.).
- [x] Pestgrube als Wald-Schauplatz (1635, verbrannte Erde + Grabhügel).
- [~] Goldhöhle: spielbarer EINGANG im Wald (Höhlenmaul -> kleine Höhle mit
      Goldadern, dünn bewacht, Truhe, Aufgang zurück). Das große eigene
      Höhlen-Level (Gold für den Fürsten) kommt später daraus.
- [~] Held sichert, Bewohner schürfen (Autorentscheid Runde 51): Goldader gibt
      GOLDERZ ins Dorf-Lager (kein Sofort-Gold); die Schmelze macht über die
      Tage Dorfkassen-Gold daraus (Abgabe-Kreislauf). OFFEN/nächster Schritt:
      das "Sichern" als Mechanik - geräumte Stätten (Holzfäller-Lager,
      Bergwerk, Goldhöhle) lassen die Arbeiter dort produzieren / steigern die
      Tagesproduktion (verknüpft mit den Anfangsquests "Stätte säubern").
- [ ] Kloster als Platzhalter im NORDOSTEN, weit weg (~Halbtagesreise) - dort der
      Showdown; von dort spawnen die Monster Richtung Dorf. Braucht erst die
      verbundene Welt-Struktur (mehrere Gebiete), dann als NO-Endgebiet.
- [x] Anhöhe-DEMO gebaut (Menü -> ANHÖHE-PROBE): gefakte Höhe (Klippe + Schatten
      + Rampe + Schnee-Plateau). Echte Berg-Level später daraus.
- [ ] Schneegebiet im NORDWESTEN auf einem Berg - Rückzugsort des ganzen Dorfes.
- [ ] Handlung (Etappen bis zum Kloster, siehe LORE-IDEEN.md 1b):
      (a) Dorf zurückerobern -> Vorräte sammeln -> Aufbruch.
      (b) Totes Dorf (Monster haben gewütet, alle Einwohner tot).
      (c) Monster-Lager mit Kasernen (Reihenfolge b/c noch offen).
      (d) weitere Etappen -> Kloster (Finale, Quelle des Feldzugs).
      Warum: Kloster schickt Truppen Richtung Burg des Fürsten; Ravensmoor
      liegt als Engpass im Weg -> wird zuerst eingenommen.

## Anfang / Quests
- [ ] Anfangsquests vor dem Kirchen-Abstieg: Holzfäller-Lager säubern (wilde
      Tiere), Bergwerk/Steinbruch säubern. Welt + Wirtschaft kennenlernen.

## Die große Schlacht (Clou)
- [ ] Stadt wird angegriffen, Goldlager + Goldschmelze in Gefahr.
- [ ] Der Fürst schickt eine Armee Soldaten; sie treffen "gerade rechtzeitig"
      ein, wenn die Stadt überrannt wird, und werden dem Helden ÜBERGEBEN.
- [ ] Der Held führt sie taktisch (Formationen) gegen die Untoten-Horde, die
      AUCH Formationen kann -> Taktik entscheidet.
- [ ] Formationen wie im neuesten Age of Empires: erst Formations-VORSCHAU
      sehen (Geister-Felder), beim Bestätigen marschieren die Einheiten in die
      Slots (RTS-Stil). Gängige mittelalterliche Formationen.
- [ ] Steuerung: Maus-Auswahlrahmen, Gruppen auf Strg+1/Strg+2.
- [ ] Helm's-Klamm-artiger Sturm: Untote kommen in FORMATION (auch dicke wie der
      Templer), die Palisade hält nicht, das Dorf wird überrannt.
- [ ] Flucht des ganzen Dorfes nach NORDWESTEN auf den verschneiten Berg.
- [ ] Geplanter Gegenangriff zur Säuberung mit Hilfe der Fürsten-Soldaten.
- [x] Spatial-Grid in die Schlacht-KI eingebaut: 1000 Einheiten von 24,6ms auf
      1,6ms/Frame (~15x, lineare Skalierung). Auch auf schwacher Hardware (x3)
      ~5ms -> selbst 1000+ Einheiten flüssig. Wird in die echte Schlacht übernommen.

## Wirtschaft (Details in WIRTSCHAFT-PLAN.md)
- [x] Wirtschaft Phase 1: Dorf-Lager + tägliche Produktion + ABGABEN an den
      Fürsten (alle 7 Tage, aus Lager+Dorfkasse; Rückstand = Druck) + Anzeige
      beim Schulzen. Schlank gehalten. Werte in src/data/wirtschaft.ts.
- [~] Wirtschaft Phase 2: Weizen->Mehl(Mühle)->Brot(Bäcker) und Eisen+Kohle->
      Barren(Schmelze) als AUTOMATISCHER Platzhalter eingebaut (läuft im
      Tagestakt von selbst, Werte in src/data/wirtschaft.ts -> VERARBEITUNG).
      Verifiziert: über 5 Tage füllen sich Mehl/Brot/Barren plausibel auf.
      OFFEN (Autor-ZIEL): die Bewohner Müller/Bäcker/Schmied müssen es sichtbar
      ABARBEITEN - jede Stufe daran gaten, ob der NPC lebt und im Dorf ist (im
      Einfall fliehen sie -> die Kette stockt). Struktur dafür steht schon.
- [ ] Händler-Bestände an das Lager koppeln (Kauf/Verkauf/Spende).
- [x] Brunnen größer + Blut-bei-Einfall (verseuchter Brunnen, Blut ringsum).

## Technik / Sonstiges
- [~] Logischer Dungeon-Generator als TEST gebaut (Menü -> DUNGEON-PROBE). Noch
      offen: in den echten Krypta-Generator übernehmen, wenn er gefällt.
- [ ] Später ggf. Kachel-Zeichenweise auf Tilemap-Layer umstellen (nur falls
      die Welt WIRKLICH riesig werden soll - eigener Schritt, nicht jetzt).
- [ ] Veröffentlichung: itch.io (Demo öffentlich, Vollversion via Download-Keys
      an Freunde); später evtl. Tauri-exe / Steam.

## Welt & Karte (Forts.)
- [~] Reit-Animation: galoppierendes Pferd+Reiter (Seitenansicht, eigener
      Galopp-Zyklus) als Demo gebaut (Menü -> REIT-PROBE). Falls gut genug,
      könnte eine VERBESSERTE Reit-Eröffnung zurückkommen (Autor-Entscheidung).

## Erledigt (Auswahl, Runde 51)
- [x] Reitszene/Pferd entfernt; Spiel startet frei steuerbar im Wald.
- [x] Kirche: Steinboden statt Gras, schmale Abstiegstreppe, Sound-Überlappung weg.
- [x] Bloom als Regler, standardmäßig aus.
- [x] Pferd/Kuh-Grafik verbessert.
- [x] Dorf vergrößert, ringsum Wald (moderate Stufe, nahtlos).
- [x] Schlacht-Prototyp im Testmodus (Formationen Linie/Keil/Igel, Auswahl-
      rahmen, AoE4-Vorschau, Marsch, Kampf gegen Untote).
- [x] Logischer Dungeon-Generator als Test-Karte (DUNGEON-PROBE).
- [x] Generator offener (Diablo-1) + Elite-Themenräume (Blut/Bein/Folter).
- [x] Fluss-Ufer mit Tiefe (Schatten-Saum + Wasserlinie an allen Seiten).
- [x] Dorfbrunnen größer + Blut-bei-Einfall (verseucht, Blutlachen ringsum).
- [x] Anhöhe-Demo (gefakte Höhe: Klippe/Schatten/Rampe/Schnee).
- [x] Dungeon-Modell: geteilte Halle (keine Gänge, alles Raum, Türen).
