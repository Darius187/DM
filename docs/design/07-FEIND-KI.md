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

---

# TEIL 2 - Autor-Dokument "24 Punkte" (Nacht-Auftrag, gesichtet + entschieden)

Grundlage: das zweite Autor-KI-Dokument (Reservierungen, Tracking, Plan-
Bindung, Formationen, Budgets - 24 Punkte). Geprueft gegen die 12 harten
Regeln (Dok 00), Dok 06 und den IST-Stand (F1-F6). Massstab: unser Feldzug
ist ein KARTEN-Spiel (abstrakte Lager + eine Live-Welle beim Helden, Deckel
10-16 Einheiten) - keine 200-Einheiten-RTS-Schlacht. Uebernommen wird, was
auf dieser Groesse SPUERBAR ist.

## D. UEBERNOMMEN (jetzt umgesetzt)

### D1. Unsicherheitsbereich statt Exaktwert (Punkt 2)
Die Spaeher meldeten bisher die EXAKTE Verteidigungsstaerke - allwissend,
wirkt betruegerisch (vgl. A2). Jetzt: die Sichtung streut (+-25%,
FELDZUG.sichtungsUnschaerfe), die Welle wird an der GESCHAETZTEN Staerke
bemessen. Der staerkeFaktor 1.3 ist unsere "vorsichtige KI" (rechnet nach
oben) - genau der Geist von getRiskAdjustedEnemyPower.

### D2. Plan-Bindung + Wechselhuerde (Punkt 5)
Unser Feindzug hatte das Gegenteil des Zappel-Problems: er konnte sich an
einem Ziel FESTBEISSEN (verstaerkt der Spieler das Ziel, spaeht das Lager
endlos neu). Jetzt: nach 3 vergeblichen Spaeh-Runden (zu teuer geworden)
gibt der Feind das Ziel AUF (FELDZUG.spaehVersucheMax) und plant neu -
ein anderes Lager/Ziel kann dran sein. Ein LAUFENDER Angriff (kaempft)
bleibt gebunden - keine Sekundentakt-Wechsel (das war schon so).

### D3. Stuck-Detection fuer Wellen (Punkt 21)
R166-Entklemmer gab es nur fuer Einfall/stadt. Jetzt wacht er auch ueber
FELDZUG-Wellen auf jeder Karte: kommt eine Einheit mit Marschziel 2s lang
keine 10px voran, faellt sie auf die normale Gegner-KI zurueck (Reaktion 1
der Autor-Liste: lokal neu loesen statt den Plan zu loeschen). Punkt vom
Autor doppelt eingefordert ("Kollision und Wegfindung... beachte das immer").

### D4. Zielbudgets/Overkill + Angriffsplaetze (Punkt 15)
Angriffsplaetze um JEDES Ziel sind mit F6 gebaut (Slots beidseitig, je Ziel
gruppiert, 12 Plaetze) - genau die EngagementSlots des Dokuments. Kein-
Overkill fuer Fernkampf steht bereits in A8.

## E. SCHON VORHANDEN (kein Neubau - Doppelstrukturen vermeiden)

- Punkt 8 (weiche Slots statt starrem Rechteck): Formations-Slots + Abstands-
  regler (RTS 1.8/1.9) + Slot-Ring im Nahkampf (F6) sind unsere weichen
  Zielbereiche. Marsch-Formationen wechseln nicht die Form je Korridor -
  bei Wellen-Groesse 10 kein spuerbarer Gewinn.
- Punkt 22/23 (Rechenbudget, ereignis+periodisch): R188 hat genau das
  etabliert (Wachwerden-Drossel, Slot-Takt 0.3s, Bindungs-Takt 0.5s,
  Flussfeld-Cache). Ein eigenes Job-Queue-Framework waere Overkill.
- Punkt 11 (Bereitschaft): A5 deckt das in einfacher Form (Schwellen +
  Timeouts); die Welle spawnt erst, wenn die Punkte reichen.
- Punkt 19 (Constraints vor Utility): unser zielVon() prueft harte Regeln
  (unantastbar, frei, Nachbarschaft) VOR der Bewertung - Prinzip erfuellt.

## F. NICHT UEBERNOMMEN (und warum)

- Punkt 1 (Reservierungs-Struktur mit Besitzern): unsere Feind-Seite hat
  EINEN Plan zur Zeit (V1) und keine konkurrierenden Planer - Reservierungen
  loesen ein Problem, das es bei uns (noch) nicht gibt. WIEDERVORLAGE, falls
  mehrere gleichzeitige Angriffe kommen.
- Punkt 3/4 (TrackedEnemyForce, Sammlungs-Score): der Spieler hat EINE
  Armee-Seite mit Garnisonen je Karte; der Feind sieht sie ueber die
  Spaeher-Sichtung je Karte. Cluster-Verfolgung ueber Frames braucht die
  200-Einheiten-Buehne, die wir bewusst nicht haben (welleMax).
- Punkt 6/7 (Anforderungsprofile, Detachment-Baum): unsere Wellen sind
  3-10 Mann aus 3 Typen - Rollen-Zusammenstellung nach Faehigkeiten waere
  Theater ohne Buehne. Die CAVALRY/SIEGE-Begriffe des Dokuments verstossen
  zudem gegen die harten Regeln 5/6 (keine Kavallerie-Gattung, kein
  schweres Geraet - der GOLEM ist unser lebender Rammbock).
- Punkt 9/12/13/14 (Korridorbreite, Zeitfenster-Sync, Flanken-Utility,
  Frontabschnitte): Mehr-Gruppen-Operationen - unsere Welle ist EINE
  Gruppe mit breiter Front (F6). WIEDERVORLAGE fuer den grossen Feldzug
  (Rueckeroberungs-Schlachten), falls der Autor groessere Schlachten will.
- Punkt 10 (Sammel-Flaechen): Wellen spawnen an der Kante in Formation -
  es gibt keine Sammel-Phase auf der Live-Karte.
- Punkt 16 (Rueckzugsplan mit Nachhut fuer den FEIND): kollidiert mit
  R147b (Autor-Order: Monster kennen keine Moral-Flucht - sie sind
  willenlose Untote, Dok 06). Der abstrakte Angriff bricht ab
  (zurueckgeschlagen), aber lebende Monster fliehen nicht.
- Punkt 17/18 (Basisbau-Strassennetz, Verteidigungs-Korridore): kollidiert
  mit A9/F3 (Autor-Entscheid: Feindlager baut nach FESTER Reihenfolge an
  festen Ankern, keine freie Bau-KI).
- Punkt 20 (Kurz-Kampfsimulation): unsere abstrakte Aufloesung (Welle vs.
  Garnisonskraft) IST die einfache Simulation; eine 12s-Iteration braucht
  Werte (DPS je Rolle, Moralmodell beidseitig), die es beim Feind bewusst
  nicht gibt. WIEDERVORLAGE mit groesseren Schlachten.
