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

## Zeitrechnung (aktuelle Regler, MARSCH.dauerJeKarteS=75s, BOTE.tempoF=0.4)
- Bote je Karten-Teilstrecke 30s, Audienz an der Burg 45s.
- Beispiel Lager NOERDLICH von Ravensmoor (Karte 'lager'): Ritt lager ->
  stadt -> wald_o -> start -> wald_w -> burg = 5x30s + 45s = ~3:15 min.
- Kolonne burg -> stadt = 5x75s = ~6:15 min. GESAMT ~9:30 Spielminuten
  vom Absenden bis zum Eintreffen der Verstaerkung. Alles Regler.

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
