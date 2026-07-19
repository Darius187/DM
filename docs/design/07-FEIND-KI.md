# 07 - DIE FEIND-KI (Autor-Recherche R182, gesichtet und angepasst)

Grundlage: Autor-Dokument (M28AI/OpenRA/CircuitAI-Recherche, R182). Dieses
Dokument haelt fest, WAS davon fuer Ravensmoor uebernommen wird und was NICHT -
geprueft gegen die 12 harten Regeln (Dok 00) und den Feldzug-Plan (FELDZUG-
PLAN.md, Phasen F2/F3/F6). Es ist die Bauanleitung fuer die Feind-KI.

---

## A. UEBERNOMMEN (der Kern)

### A1. Drei Ebenen mit gestaffelten Uhren (statt einem grossen Skript)
- STRATEGISCH (~alle 1-2s): ausbauen/verteidigen/angreifen/expandieren,
  Ziel-Gebiet waehlen, Gruppen bilden, Reserve bestimmen. Gibt nur AUFTRAEGE.
- OPERATIV (~alle 0.25-0.5s): Gruppen verwalten (Hauptgruppe, Fernkampf,
  Reserve), Sammelpunkte, Synchronisation.
- TAKTISCH/EINHEIT: uebernimmt die BESTEHENDE Enemy-/rtsBattle-KI (Wegfeld,
  Slots, Telegraphen). KEINE neue Einheiten-Ebene bauen - sie existiert.
Gestaffelte Updates (nie alles im selben Frame) - wie OpenRA.

### A2. Blackboard mit Erinnerungs-Verfall
AIWorldState je Feind-Seite: bekannte Spieler-Einheiten/Bauten mit
lastSeen/confidence-Verfall (100% -> 80% nach 5s -> 45% nach 15s -> vergessen).
Die KI darf NICHT allwissend sein - das wirkt betruegerisch.

### A3. Cluster-Erkennung ueber Raster (kein ML)
Karte in grobe Zellen, Kampfkraft je Zelle, zusammenhaengende Zellen =
Cluster. Erkennen von "der Spieler sammelt sich" ueber Wachstumsrate.
Abfangpunkt auf dem VORAUSSICHTLICHEN Weg, nicht auf der aktuellen Position.

### A4. KAMPFSTAERKE statt Kopfzahl
power = basePower * hpRatio^0.7 * moral * bereitschaft * konterEignung,
Gruppenfaktoren Kohaesion/Gelaende. WICHTIG: die Konter-Eignung kommt aus
UNSEREM System (SCHNITT/STICH/WUCHT, kampfarten.ts) - NICHT aus dem
klassischen Speer-schlaegt-Reiter-Dreieck (siehe B1).

### A5. Angriffs-Schwellen + Sammel-Timeouts
Staerkeverhaeltnis-Schwellen (Angriff >=1.3, Abfangen >=1.15, Befestigung
>=1.5, Ueberfall auf Versorgung >=0.9), Abbruch-Schwelle (~0.75). Kein
endloses Warten: 90% da ODER 80% + Zeit abgelaufen ODER Feind kommt naeher.

### A6. Verschlankte Zustandsmaschine je Angriffsgruppe
RESERVE -> SAMMELN -> ANMARSCH -> KONTAKT(neu bewerten!) -> GEFECHT
-> (NACHSETZEN | NEU_SAMMELN | RUECKZUG) -> HEIMKEHR -> RESERVE.
FORM_UP/DEPLOY stecken in unserem bestehenden Formations-System (formationen
.ts) - keine Doppelstruktur. Ein Angriff ist NIE ein unumkehrbarer
Selbstmordbefehl: bei KONTAKT und im GEFECHT wird neu bewertet.

### A7. Rueckzugslogik ist gleichwertig zur Angriffslogik
Rueckzug bei <70% Verhaeltnis, >35% Verlusten, ueberrannten Fernkaempfern,
abgeschnittenem Rueckweg. GEORDNET: Fernkaempfer zuerst, Reserve deckt,
Sammeln am vorher festgelegten Rueckzugspunkt.

### A8. Kein Overkill + kluge Zielwahl
Erwarteten Schaden je Ziel buchfuehren; targetScore mit Bedrohung/Konter/
Entblossung/Distanz. Unter den besten 2-3 Zielen LEICHT zufaellig waehlen
(sonst vorhersehbar).

### A9. Lagerbau nach FESTER REIHENFOLGE an festen Ankern (Autor-Frage!)
"Nicht freie Bau-KI" heisst GENAU das, was der Autor vorschlaegt: die KI baut
nach einer Prioritaets-REIHENFOLGE an vordefinierten Bauplaetzen am Lager-
Anker (Kernzone -> Truppenzone -> Palisadenring -> Tuerme/Tor Richtung
Feind), mit Bau-Uhr und HP. placementScore nur zur Wahl UNTER den
vordefinierten Plaetzen. Zonen-Idee (Kern/Truppen/Unterstuetzung/Wehr)
uebernommen, auf Untoten-Art umgedeutet (Blutbecken statt Kueche, Dok 06).

### A10. Feind-SPAEHER zur Staerkeschaetzung (Autor-Zusatz)
Der Feind schickt zuerst 1-2 Spaeher; NUR was sie SEHEN, landet im
Blackboard. Danach bemisst er die Angriffsgruppe (mehr Truppen bei starker
Verteidigung, weniger zum Truppen-Sparen). Die R178-Klosterspaeher werden
damit von Stimmung zu FUNKTION: Spaeher toeten = der Feind bleibt blind.

### A11. Einflusskarte SPAETER in einfacher Form
Grobes Raster (Freund-/Feind-Kraft, Routen-Risiko), Update ~1x je Sekunde.
Erst wenn F2/F3 stehen - fuer den Anfang reichen Cluster + Gebietslage.

---

## B. NICHT UEBERNOMMEN (und warum)

1. **Reiterei/Kavallerie-Anteile in allen Gruppen-Rezepten** (10-15%,
   Reiterkeil, Flanken-Reitergruppe): verstoesst gegen HARTE REGEL 5
   (keine Kavallerie als Truppengattung, weder Spieler noch als System-
   Fundament). Untote fahle Reiter bleiben ein SPAETER Bonus, nichts baut
   darauf. Die Gruppen-Rezepte laufen ohne Reiter-Anteil.
2. **Armbrustschuetzen** in den Rezepten: HARTE REGEL 6 (keine Armbrueste
   im Heer). Fernkampf = Bogenschuetzen.
3. **Belagerungsgeraet** (25-Punkte-Eintrag, Pioniere): HARTE REGEL 5
   (kein schweres Geraet). Befestigungen fallen durch Erstuermen/Truppen.
4. **Hungarian-Algorithmus** fuer Slot-Zuweisung: das Dokument selbst sagt
   greedy reicht - wir HABEN greedy (formationen.ts).
5. **Eigene Einheiten-Ebene (100ms)**: existiert bereits (Enemy-KI +
   rtsBattle) - eine zweite wuerde sich widersprechen.
6. **Schwierigkeitsgrade**: spaeter; erst EINE gute Stufe (die "Schwer"-
   Beschreibung ist das Ziel). Kein Ressourcen-Betrug - deckt sich mit
   unserer Linie.
7. **Machine Learning**: nicht noetig (sagt das Dokument selbst).
8. **Scheinangriffe/Mehrfach-Synchronangriffe** ("Sehr schwer"): Phase F6+,
   nicht im ersten Wurf - erst muss die Grundmaschine stehen.
9. **Punktwerte-Tabelle 1:1** (Schwertkaempfer 10 usw.): Zahlen kommen aus
   UNSEREN Daten (RTS_UNIT_TYP/ENEMY-Werten), nicht aus der Vorlage -
   sonst pflegen wir zwei Wahrheiten.

---

## C. UMSETZUNGS-REIHENFOLGE (auf unsere Phasen gelegt)
- F2a: Blackboard + Feind-Spaeher + Cluster (A2/A3/A10) - reine Logik, testbar.
- F2b: Produktion + Kampfstaerke + Angriffs-Schwellen (A4/A5) je Feindlager.
- F3:  Lagerbau nach fester Reihenfolge (A9).
- F6:  Gruppen-Zustandsmaschine im Feld + Rueckzug + Zielwahl (A6/A7/A8),
       Einflusskarte (A11), spaeter Stufen/Scheinangriffe.
