# Sound-Inventar Ravensmoor (Stand Runde 51)

So funktioniert die Audio-Schicht: liegt eine echte Datei `assets/sounds/<name>.ogg`
vor, wird SIE gespielt. Sonst ein **synthetischer Platzhalter-Beep** (wenn ein
Synth-Rezept existiert). Gibt es beides nicht, bleibt der Klang **stumm**.
=> Das Spiel läuft auch ohne deine Sounds, klingt dann aber teils nach Beep
oder ist still. Diese Liste sagt dir, was du schon geliefert hast und was noch
fehlt (priorisiert).

## A) VORHANDEN - deine echten Sounds (42 Dateien in assets/sounds/)
Kampf/Treffer: armor_cut1, armor_cut2, schwert_slice1-3, swoosh1-6, wucht_schlag,
  block1, block2, pfeil_schuss.
Gegner-Begegnung/Tod: begegnung_pest1, begegnung_skelett1, begegnung_miniboss1,
  tod_pest1, tod_skelett1, tod_skelett_schild1, tod_universal1, wolf.
Zauber: fireball1, fireball2.
Atmosphäre/Stimmung: herzschlag, krypta_betreten, krypta_grusel1-5,
  regen_draussen, regen_drinnen.
Musik: musik_intro, musik_menue, musik_dorf, musik_nacht, musik_einfall,
  musik_krypta, musik_boss, musik_tod.

## B) FEHLT als echter Sound - läuft aktuell auf Platzhalter-BEEP
Diese werden im Spiel getriggert, klingen aber nur nach synthetischem Beep -
echte Aufnahmen würden sie deutlich aufwerten (nach Priorität):

WICHTIG (hört man oft):
- treffer_fleisch, treffer_knochen, tod (generischer Todeslaut)
- trank (Trank trinken), aufheben (Item aufheben), muenzen (Gold), klick (UI)
- axt_swing, hammer_schlag, hellebarde_stoss, bogen_spannen, pfeil_einschlag
- feuerball, heiliges_licht, heilung (Zauber-Wirkung)
- levelup, fertigkeit_neu (Aufstieg)
- schmiede_hammer, holz_hacken, stein_hacken (Tagwerk/Sammeln)

MITTEL:
- truhe (Truhe öffnen), tuer (Tür), rolle (Schriftrolle), item_episch,
  edelstein_fassen, fass_bruch (Fass zerbricht), parade, fehler (ungültig)
- gebietswechsel (Übergang), telegraph (Angriff-Vorwarnung), boss_slam
- pest_stoehnen, skelett_klappern, templer_stimme, schatten_fluestern
- rabenruf

## C) STUMM - weder Datei noch Beep (am dringendsten)
Diese sind aktuell KOMPLETT still - hier brauche ich am ehesten echte Dateien
(Loops/Musik lassen sich nicht sinnvoll als Beep faken):
- **musik_kirche** (Musik/Stille in der Kirche)
- **krypta_droehnen** (Dauer-Dröhnen-Loop in der Krypta)
- **dorf_wind** (Wind-Loop im Dorf)
- **wald_nacht** (Nacht-Loop im Wald)
- **blut_fluestern** (Flüstern am Blut, Prolog/Krypta)
- **schreck_husch**, **schreck_sting** (Schreck-Momente/Stinger)
- **tod_gore** (besonders blutiger Tod)

## D) Mehr Varianten wünschenswert (mehr Abwechslung)
Von diesen gibt es je 1 Datei, das Spiel würde 2-3 nutzen (weniger Wiederholung):
- begegnung_pest2/3, begegnung_skelett2/3, begegnung_miniboss2/3
- tod_pest2/3, tod_skelett2/3, tod_skelett_schild2/3, tod_universal2/3
- swoosh7/8

## Format
Bevorzugt **.ogg** (klein, browsertauglich), Dateiname = Sound-Key aus dieser
Liste, ab nach `assets/sounds/`. Mehr braucht es nicht - das Spiel zieht sie
automatisch (Hot-Swap). Neue Sound-Keys ergänze ich gern, wenn du eigene Ideen
hast.

## E) Erzähler-STIMME (Memoiren - zum Aufnehmen, KEIN TTS)
Runde 51: Story-Zeilen spielen jetzt eine AUFGENOMMENE Stimme, wenn die passende
Datei vorliegt (sonst nur Text - kein Roboter-TTS). Du sprichst die Memoiren ein
und legst sie unter diesen Schlüsseln in assets/sounds/ ab:
- **erz_intro_1 ... erz_intro_7** - die Eröffnungs-/Vorspann-Zeilen.
- **erz_ankunft_1, erz_ankunft_2** - Ankunft in Ravensmoor.
- **erz_krypta_1, erz_krypta_2** - Abstieg in die Krypta.
- **erz_boss_1, erz_boss_2** - vor dem Grab des Kreuzritters.
(Weitere Story-Beats - totes Dorf, Lager, Kloster - bekommen denselben Mechanismus,
sobald die Texte/Zeilen stehen; ich vergebe dann erz_<ort>_<n>-Schlüssel.)
Der Text dieser Zeilen ist DEINER (Stimme des Autors) - ich vertone/erfinde nichts.
