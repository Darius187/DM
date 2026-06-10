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
