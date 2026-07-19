# FELDZUG-PLAN - Der Krieg um die Gebiete (Autor-Vision R180, Stand R181)

Verbindliche Design-Grundlage: docs/design/06-UNTOTE-OEKONOMIE-UND-FELDZUG.md
(Teile E/G/H decken die Autor-Vision fast vollstaendig - dieser Plan macht
daraus BAUBARE Phasen). Autor-Order (R180, woertlich zusammengefasst):

- Die Monster ruesten auf wie in einem RTS: sie produzieren Einheiten,
  nehmen GEBIETE ein (Ziel: alle Karten), bauen eigene Stellungen
  (Palisaden/Tuerme "in ihrer Art"). Der Spieler verhindert das, indem er
  Gebiete saeubert, sichert und zurueckerobert - Balance aus Angriff,
  Rueckzug, Verteidigung, Ressourcen, Nachschub ("wie in einem echten Krieg").
- Auf der strategischen Karte muss sichtbar sein, welche Gebiete besetzt
  sind und wo gerade gekaempft wird.
- Kriegswirtschaft: die Dorfbewohner koennen beauftragt werden, fuer die
  Front zu produzieren; der Spieler entscheidet auf der Karte, wen er wohin
  schickt.
- Zwei Zugaenge nach Ravensmoor (Nord + Ost/Rabenhain). Unbewachte Zugaenge
  nimmt der Feind ein und BAUT dort sein Lager aus - das muss man dann
  muehsam zurueckerobern (Zange, Dok 06 Teil G).
- DAS GROSSE STORY-EREIGNIS (nach dem Krypta-Boss, Dok 06 C3 "der Vorhang
  faellt"): Ravensmoor wird ueberrannt - der Held kann es allein NICHT
  halten. Flucht in den sicheren NORDEN mit allen Bewohnern und Pferden
  (im RTS-Modus befehligt man auch die Bewohner). Dort wird eine ZUFLUCHT
  gebaut, die die Stadtbewohner versorgt. Die Monster verfolgen nicht -
  sie besetzen und befestigen die Stadt. Dann: Ritt zum Grafen, Rueckkehr
  mit der Verstaerkung (~20 Mann), RUECKEROBERUNG der Stadt, Bewohner
  kehren heim - und ERST DANN beginnt die dauerhafte Verteidigungs-Phase.
- Ueberlegenheit der Horde: Monster greifen in FORMATIONEN an und schicken
  maechtige Einzelstuecke (Golem), gegen die der Held allein chancenlos ist.
  Aber keine Hunderterhorden - 20 Grafen-Maenner muessen eine Chance haben
  (Balance ueber Versorgungslinien/Blutlager, Dok 06 Teil H + A3: die Horde
  zerfaellt, wenn man ihre Blutlager zerstoert - nicht ueber Kopfzahl).
- Der Bote soll SICHTBAR reiten (wie die Truppen sichtbar marschieren) und
  von jeder Karte aus ausloesbar sein: Zwischenbote im Feldlager laeuft/
  reitet nach Ravensmoor und aktiviert den Hauptboten Richtung Fuerstenburg.
  Pferd nur, wenn im Lager eine Pferde-Einrichtung steht.

## Bereits gebaut (Stand R181)
- Weg-Stellung: ankommendes Heer bezieht Linien auf Nord-/Ost-Strasse (R177).
- Kloster-Spaeher ueber die Nordstrasse - ERST nach dem Krypta-Boss (R178/R180).
- Boten-Kette v1: Schulze schickt den Boten; Botenposten (RTS-Bau) holt ihn
  samt Pferd ins Feldlager; Ritt kartenweise + abfangbar; Ankunft an der
  burg-Karte loest die Grafen-Kolonne aus (R179). Noch NICHT sichtbar.
- Grafen-Kolonne startet an der Fuerstenburg (burg, aeusserste Karte links)
  und marschiert real bis Ravensmoor (R181).

## Zeitrechnung (R182: Autor "9:30 zu lang" - Galopp + kurze Audienz)
- Bote GALOPPIERT: 15s je Karten-Teilstrecke (BOTE.tempoF 0.2), Audienz 5s.
- Beispiel Lager NOERDLICH von Ravensmoor: Ritt 5x15s + 5s = ~1:20 min.
- Kolonne burg -> stadt = 5x75s = ~6:15 min (Fussmarsch, bewusst schwer -
  der grosse Anteil ist jetzt der MARSCH, nicht der Bote). GESAMT ~7:35.
  Regler: MARSCH.dauerJeKarteS, BOTE.tempoF/burgDauerS.

## Niederlagen-Regel (UEBERARBEITET R184, Autor: "es muss ein Schachmatt geben")
- Das Spiel MUSS verlierbar sein, sonst ist die Bedrohung kalter Kaffee.
  SCHACHMATT-Kette: nimmt der Feind ALLE Karten, steht die Horde vor der
  FUERSTENBURG und stuermt sie (Masse). Der Graf kann keine Truppen mehr
  stellen, wenn seine Karten weg sind - AUSSER es gibt Farmkarten WESTLICH
  der Burg (Autor will die noch einbringen: dort wird gefarmt/produziert,
  solange sie stehen). Die LETZTE SCHLACHT: Held + Garde des Grafen in der
  Burg - gewinnt der Held, treibt er den Feind hinaus und schlaegt mit der
  Garde zurueck (Comeback); faellt der GRAF, ist das Spiel VORBEI (laden
  oder neu beginnen). Kein stilles Aussitzen in der Zuflucht moeglich.
- RUECKZUGSWEG beim Fall Ravensmoors (Autor R184): westlich hinaus
  (Finsterhain), dann NORDWAERTS (Kraehenwald - dort stehen bereits Feinde,
  fuer den Helden machbar), weiter noerdlich (Grauwald), dann WESTLICH in
  den HOHEN NORDEN (hochland, Schnee/Berge - ggf. eigene neue Schneekarte
  obendrauf): AUF DEM BERG liegt der Rueckzugsort/die Zuflucht.
- OFFEN: Zwei-Zufluchten-Konflikt (Zuflucht im Hohen Norden vs. Fuerstenburg
  des Grafen) - Vorschlaege liegen beim Autor (OFFENE-FRAGEN.md R184).

## Feind-KI wie ein ECHTER SPIELER (Autor R184: "mit Konzept und Strategie")
- Ziel: die Horde fuehlt sich wie ein menschlicher Gegner an - reagiert auf
  die Spielweise, lernt, fuehrt ZANGEN und unerwartete Angriffe, setzt den
  Spieler unter Druck, bleibt aber fair. Umsetzung auf Basis 07-FEIND-KI
  (M28AI/OpenRA/BAR-Recherche des Autors), Ausbau in F6:
  1. GEDAECHTNIS je Route: gescheiterte Angriffe erhoehen die Mindeststaerke
     dort, erfolgreiche merken sich den Weg (Erfahrungswert je Kante).
  2. ANPASSUNG an den Spieler: verteidigt er stark im Osten, verlagert die
     Produktion nach Norden (Druck auf die schwache Flanke der Zange).
  3. ZANGE: ab 2 Lagern mit vollen Kassen synchronisierter Doppel-Angriff
     auf ZWEI Karten gleichzeitig (Phasenlinien aus der Autor-Recherche).
  4. UNVORHERSEHBARKEIT: leicht gewichteter Zufall unter den besten 2-3
     Zielen + gelegentliche Ueberfaelle auf schwache Ziele statt der Front.
  5. FAIRNESS: alles laeuft ueber sichtbare Spaeher (toete sie = er ist
     blind), kein Ressourcen-Betrug, Vorwarnungen bleiben.

## Feind-KI (R182): Autor-Recherche gesichtet
- Verbindliche Bauanleitung: docs/design/07-FEIND-KI.md (uebernommen/
  verworfen dokumentiert; Kavallerie/Armbrust/Belagerungsgeraet NICHT
  uebernommen - harte Regeln 5/6). Feind-Spaeher schaetzen zuerst die
  Staerke, dann bemisst der Feind seine Angriffsgruppe.

## Phasen (Aufgaben F1-F6, in dieser Reihenfolge)
- F1 GEBIETS-STATUS: je Karte frei/umkaempft/besetzt (gebietslage.ts, rein/
  testbar) + Anzeige auf Live-Karte und Maps-Tab. Grundlage fuer alles.
- F2 FEIND-PRODUKTION: Feindlager produzieren Einheiten in Wellen und
  nehmen unbewachte Nachbar-Gebiete ein (Start: Rabenhain/wald_se und der
  Norden Richtung Kloster). Feind-TRUPPEN bekommen eigene, zaehere Werte
  (Dok 06 H1.1 - Truppen sind keine Dungeon-Monster).
- F3 FEIND-BEFESTIGUNG: besetzte Karten bekommen ein sichtbares Feindlager
  + Palisaden "in ihrer Art" (Knochen/Pfahlwerk). KI-Antwort an den Autor:
  JA, sauber machbar in einfacher Form - feste Bauplaetze am Lager-Anker +
  Bau-Uhr + HP, gebaut von untoten Arbeitern (Dok 06 Teil E). KEINE freie
  Bau-KI noetig.
- F4 SICHTBARE REITER: der Bote als reitende Figur auf der Karte (Codex-
  Pferd-Sprite), Zwischenbote von jeder Karte, Pferde-Einrichtung im Lager
  als Voraussetzung fuers Pferd (sonst laeuft er - langsamer).
- F5 DER FALL VON RAVENSMOOR: das Story-Ereignis nach dem Krypta-Boss -
  Ueberrennung, Evakuierung (Bewohner+Pferde im RTS-Modus fuehren),
  ZUFLUCHT im Norden bauen/versorgen, Grafen-Ritt, Rueckeroberung mit der
  Kolonne, Rueckkehr der Bewohner, Start der Verteidigungs-Phase.
- F6 BALANCE-PASS UEBERLEGENHEIT: Formations-Angriffe der Monster, Elite-
  Stuecke (Golem: nur mit Truppen zu fallen), Angriffs-Slots in beide
  Richtungen, Wellen-Deckel; Comeback ueber Blutlager-Zerstoerung statt
  Kopfzahl (Dok 06 Teil H - Held NICHT nerfen).

## Offene Autor-Fragen (auch in OFFENE-FRAGEN.md)
- Name des Boten; Wellen-Groessen; wie viele Karten darf der Feind maximal
  halten, bevor es "verloren" ist; Aussehen der Feind-Befestigung.
