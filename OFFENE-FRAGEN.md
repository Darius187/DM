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
