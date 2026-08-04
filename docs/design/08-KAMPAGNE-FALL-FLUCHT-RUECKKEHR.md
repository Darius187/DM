# 08 - KAMPAGNEN-ABLAUF: Fall, Flucht, Audienz, Rueckkehr, Wettlauf

Autor-Entwurf (R235). Ersetzt/verfeinert den F5-Ablauf (Fall von
Ravensmoor). Grundsatz: der Spieler VERLIERT Ravensmoor zuerst, rettet
die Menschen mit eigenen Haenden, holt Hilfe beim Grafen und erobert
zurueck - ERST DANACH beginnt der eigentliche Feldzug als Wettlauf.

## Akt 1 - Der Einfall, den man nicht halten kann

- Der Einfall auf Ravensmoor wird zu stark: Buerger werden
  niedergeschlagen, der Spieler hat keine Zeit zu heilen - die richtige
  Antwort ist EVAKUIEREN, nicht durchhalten.
- Die Evakuierung ist eine SPIELER-ENTSCHEIDUNG (Befehl), kein Timer:
  "Ich kann es nicht halten" ist ein Moment, den der Spieler selbst
  ausspricht.

## Akt 2 - Die Flucht (der Spieler fuehrt, alle folgen)

- Die Bewohner FOLGEN dem Helden real ueber die Karten (kein abstrakter
  Treck mehr): Ravensmoor -> westliche Karte -> hoch in den Norden ->
  Zuflucht im HOCHLAND (F5-Ziel bleibt).
- Fliehende Zivilisten werden von Monstern NICHT als Ziel gewaehlt -
  die Monster wollen den Kaempfer (Spieler/Soldaten). Die Reise ist
  Spannung, keine Eskorten-Hoelle.
- Die Fluchtroute ist NOCH NICHT von Monsterlagern verstellt: einzelne
  Monster ja (der Spieler kaempft sich allein durch), Lager nein.
  Die Schwierigkeit steigt ERST SPAETER (Akt 5).

## Akt 3 - Die Audienz beim Grafen

- Sind alle in der Zuflucht, reist der Spieler zur GRAFENBURG (Karte
  'burg', 0,3 im Weltraster - existiert als Huelle) und bittet um
  Audienz und Hilfe.
- Die Burg-Karte bewusst SCHLANK (Autor: wenig Dorfleben, wir sind
  nicht lange dort): Burg + Vorplatz mit Kulissen-Leben (wenige
  Statisten, Marktstand, Wachen) + KIRCHE. Die Kirche ist wichtig:
  sie ist der Ort des GRUFTSIEGELS (Ahnengruft, Doku 07/4e).
- Der Graf hilft SOFORT: ~10 Mann (GRAF_AUDIENZ.trupp) marschieren mit
  Richtung Ravensmoor. (Ersetzt an dieser Stelle den Boten-Umweg -
  der Botenposten bleibt fuers laufende Spiel danach.)

## Akt 4 - Die Rueckeroberung + der Verrat

- Mit den 10 Mann wird Ravensmoor befreit (stadt ist 'besetzt' und
  wird zurueckerobert).
- Danach: ein Soldat wird geschickt ODER der Spieler holt die Bewohner
  selbst aus der Zuflucht zurueck.
- DER VERRAT (Doku 07/4g) zuendet hier organisch: das erste Betreten
  einer besetzten Karte ist der Rueckeroberungs-Angriff - in DER Nacht
  verschwindet der Schmied. Und die Kirche bei der Burg hat er bereits
  BESUCHT (waehrend der Zuflucht-Zeit, unter all den Fluechtlingen
  fiel ein Mann mehr nicht auf): das Siegel ist ABSICHTLICH geoeffnet,
  und ES FAELLT ERSTMAL NICHT AUF (Autor-Entscheid R235). Der Graf
  lebt bei der Audienz - die Ahnengruft ist eine tickende Uhr, kein
  sofortiger Fall.

## Akt 5 - Der Wettlauf

- Ravensmoor wird umzaeunt (Stadtmauer/Palisade existiert), die
  Bewohner kehren zurueck, der Spieler beginnt Karten einzuholen.
- ERST JETZT starten die Monster ihre Expansion (Feindzug-Produktion/
  Angriffe waren bis zur Rueckeroberung GATED) - der Wettlauf beginnt:
  wer holt schneller Karten, der Spieler oder die Horde?
- Spaetere Eskalation im Wettlauf: die geoeffnete Ahnengruft bricht
  aus - die Grafenburg faellt von innen, die Grafen-Verstaerkung
  versiegt (bestehende R232-Kette, nur SPAETER gezuendet).

## System-Abgleich (was existiert, was sich aendert, was neu ist)

EXISTIERT (bleibt):
- F5: Fall-Zustand, Zuflucht 'hochland', Rueckeroberung, Golem-Moment.
- Feindzug (F2/F3) + Versorgungslinie (R227) + Lagervoegte (R230).
- Stadtmauer/Palisaden, Garnisonen/Maersche, Rekrutierung, Botenposten.
- Verrat Variante B (R234): Trigger "erste besetzte Karte" passt exakt
  in Akt 4.

UMBAU:
1. Evakuierung: Spieler-Befehl + ECHTES Folgen der Bewohner ueber
   Karten (statt Treck-Timer). Zivilisten sind keine Monster-Ziele.
2. Feindzug-Pacing: Expansion (Produktion + Angriffe) erst NACH der
   Rueckeroberung Ravensmoors (neues Gate-Flag). Start-Besetzung
   (lager/stadt2/kloster) bleibt statisch bestehen, expandiert aber
   nicht. Fluchtrouten-Karten: einzelne Gegner, keine Lager.
3. Grafen-Hilfe: persoenliche Audienz (Dialog beim Grafen) statt
   Boten-Ausloeser; Trupp ~10 Mann (GRAF_AUDIENZ in src/data).

NEU:
a. Burg-Karte ausbauen: Burg-Kulisse, Vorplatz light, KIRCHE
   (Siegel-Ort, begehbar mindestens als Fassade + Tuer), Graf-NPC
   mit Audienz-Dialog.
b. Flucht-Eskorte: Folge-KI der Bewohner (Karawane hinter dem Helden,
   Kartenwechsel gemeinsam), Ankunfts-Zaehlung in der Zuflucht.
c. Bewohner-Rueckholung nach der Befreiung (Befehl oder Abholung).

OFFEN (Autor):
- Ausloese-Moment des grossen Einfalls, der den Fall erzwingt (Tag X?
  Feldzug-Ereignis? aktuell F5-Sturm).
- Duerfen einzelne Bewohner auf der Flucht STERBEN (Drama) oder ist
  die Karawane sicher, solange der Spieler lebt?
- Wie lange "tickt" die Ahnengruft bis zum Burg-Fall (Akt 5)?
