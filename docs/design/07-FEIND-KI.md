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

---

# TEIL 2 - AUTOR-NACHTRAG (Runde nach KI-Teil-2, Entscheidungen praezisiert)

Der Autor hat drei zuvor als "NICHT UEBERNOMMEN" markierte Punkte neu bewertet.
Sie wandern damit von "raus" nach "OFFEN / WIEDERVORLAGE" - NICHT jetzt bauen,
aber die Tuer bleibt auf. Reihenfolge-Order des Autors: erst muss alles andere
stehen (Performance/Wegfindung/Feldzug), DANN diese drei.

## N1. Belagerungsgeraet (Cavalry/Siege/Cart/Rammbock) - OPTION OFFEN
Frueher wegen Regel 5/6 (keine Kavallerie-Gattung, kein schweres Geraet) raus.
AUTOR: "damit bin ich noch nicht ganz durch - die Belagerung mit diesen Geraeten
war damals Thema, vielleicht nehmen wir das auf. Erst muss alles andere stehen,
Option offen lassen." -> STATUS: zurueckgestellt, NICHT verworfen. Wenn es kommt,
gilt weiter Regel 5/6-Pruefung (Kavallerie als TRUPPENGATTUNG bleibt tabu; ein
Belagerungs-GERAET fuer die MONSTER-Seite - der Golem ist schon ein lebender
Rammbock - waere gesondert vom Autor freizugeben). Zuerst klaeren, WAS genau
(Rammbock gegen Tore? Wurfgeraet? nur Monster-Seite oder auch Spieler-Heer?).

## N2. Feind-Rueckzug mit Nachhut - AUFNEHMEN (taktisch), NICHT als Panik
Frueher raus wegen R147b (Untote kennen keine Moral-Flucht). AUTOR: "vielleicht
macht es spielerisch Sinn, wenn sich auch der Gegner zurueckzieht und mit Nachhut
anrueckt - auch wenn es Monster sind, haben die eh schon eine KI, also warum
nicht, aus taktischen Gruenden."
AUFLOESUNG der Kopplung zu R147b (WICHTIG, vor dem Bau): R147b verbietet das
INDIVIDUELLE Panik-Fliehen einzelner Monster (Angst/Moral) - das bleibt verboten
(sie sind willenlose Untote). Ein BEFOHLENER, geordneter Rueckzug der ganzen
Horde durch die STEUERNDE Intelligenz (Nekromant/Bindealtar) ist etwas anderes:
kein Zittern, keine Flucht, sondern kalte Taktik ("die Horde weicht geschlossen
zurueck, eine Nachhut deckt"). Damit bleibt der Geist von R147b erhalten UND der
taktische Rueckzug ist moeglich. STATUS: fuer den grossen Feldzug vorgemerkt
(gehoert zu den "groesseren Schlachten"), gebaut wird es dort, nicht einzeln.

## N3. Freie Bau-KI (Feindlager) - AUTOR UNSCHLUESSIG, Empfehlung: Mittelweg
AUTOR: "ich moechte es wie die guten RTS-Games haben - wie bauen die Feindlager?"
IST-STAND (A9/F3): unser Feindlager baut nach FESTER Reihenfolge an FESTEN Ankern
(Bindealtar zuerst, Knochenwall Stufe 1 ab 90s, Stufe 2 ab 300s, Waechter) -
sicher, vorhersehbar, blockiert NIE einen Weg, aber immer gleich.
DOKUMENT (KI-Teil-2 Punkt 17/18): echte Bau-KI fuehrt eine interne Verkehrsgrafik,
platziert Gebaeude dynamisch dort, wo sie keine Route blocken, und richtet
Verteidigung zu den TATSAECHLICH benutzten Angriffskorridoren aus.
EMPFEHLUNG (Claude): MITTELWEG "vorgefertigte, geprüfte Blaupausen" statt starr
ODER voll-frei. Das Lager waechst durch mehrere hand-gebaute, VORAB-validierte
Lager-Layouts (nie routen-blockierend), kontextabhaengig gewaehlt; sichtbare
MONSTER-ARBEITER (Autor-Idee) bauen die Teile in Reihenfolge auf; die
Wall-Oeffnungen/Tuerme richten sich nach der Angriffsseite des Spielers (Punkt 18,
billig mit unseren Verkehrsdaten). GRUND: Der Autor hasst Wegfindungs-Haenger -
eine VOLL-FREIE Bau-KI ist genau die klassische Quelle dafuer (die KI mauert sich
selbst zu). Der Mittelweg gibt RTS-Abwechslung OHNE das Risiko. STATUS: offen,
Autor entscheidet (starr behalten / Mittelweg / voll-frei).

---

# TEIL 3 - FEINDLAGER-MITTELWEG + MONSTER-OEKONOMIE (Autor bestaetigt, Bau-Spec)

## M1. Bau nach Blaupausen (BESTAETIGT - "so machen wir das")
Weder starr (immer gleich) noch voll-frei (mauert sich zu). Das Lager waechst
nach VORGEFERTIGTEN, routen-sicheren BLAUPAUSEN:
- MEHRERE Varianten je Ausbaustufe (Wall-Form, Waechter-Anordnung, Altar-Lage) -
  ein Seed je Karte waehlt eine, so gleicht kein Lager dem anderen, aber jedes
  folgt einem klaren Schema. (Autor: "mehrere Varianten definieren.")
- Jede Blaupause hat GARANTIERTE Oeffnungen (Tor-Luecken) - nie ein
  geschlossener Kasten. Zusaetzliche Haertung spaeter: BFS-Pruefung, dass ein
  Weg von jeder Kante zum Altar bleibt.
- Sichtbare MONSTER-ARBEITER (eigene Einheit, kein Kampf) bauen die Teile in
  Reihenfolge auf (spaeterer Schritt).
- Verteidigung richtet sich zur Angriffsseite des Spielers (KI-Teil-2 Punkt 18).

## M2. Lager ist eine VERTEIDIGUNGSLINIE, kein Kaefig (BESTAETIGT - wichtig!)
Autor: "ich wuerde nicht alle Einheiten im Lager lassen - wenn ich das Lager
einfach umgehe weil die da alle drin festsitzen, juckt es keinen." -> Das Lager
darf NICHT komplett geschlossen sein und die Besatzung NICHT eingesperrt:
- Die Garnison SORTIERT AUS (patrouilliert den Zugang, faengt den Helden ab,
  besetzt die Tore) - nicht alle im Ring gebunkert.
- Das Lager sitzt AUF/an der Route, die der Held nehmen muss (kontrolliert den
  Korridor, KI-Teil-2 Punkt 18) - Umgehen kostet, ist nicht gratis.
- Unser F3-Wall ist schon ein HALBRING/mit Toren (kein Kasten) - gut, wird nur
  um das aktive Aussortieren erweitert.

## M3. MONSTER-OEKONOMIE - Empfehlung (Autor-Frage "was meinst du?")
Autor ueberlegt: Monster bauen Rohstoffe ab (Stein/Holz) wie der Held. Sorge:
viele Karten = irre Rohstoffe; und thematisch - Palisaden aus KNOCHEN, woher der
Rohstoff? "Vielleicht keine gute Idee."
CLAUDE-EMPFEHLUNG: KEINE woertliche Holz/Stein-Minen-Wirtschaft. Gruende:
(1) thematisch falsch (Untote faellen kein Holz), (2) genau das Runaway-Problem,
das der Autor fuerchtet, (3) eine Ernte-/Arbeiter-Mining-Sim = mehr Wegfindungs-
Last = mehr Ruckeln (Autors Hauptschmerz).
STATTDESSEN - der Rohstoff ist BIOMASSE / TOD: Leichen, Blut, Knochen, geerntet
vom besetzten Land (Doerfler, Vieh, Gefallene). Das ist Dok 06 (Untoten-
Oekonomie). Woher die Knochen fuer die Palisade? Aus den TOTEN des Landes, das
sie halten - das beantwortet die Autor-Frage direkt und stimmungsvoll.
MECHANIK - wir haben die Abstraktion SCHON: der Feindzug produziert "Kampfkraft"
je besetztem Lager ueber Zeit (F2); ein zerstoertes Lager schwaecht die ganze
Horde (F6 Blutlager-Comeback). DAS ist der Rohstoff, abstrakt. Zentrale
Verwaltung = das KLOSTER als Hauptlager (Autor); faellt es, bricht das Netz
zusammen (passt zu Schachmatt/Hierarchie, Dok 06). "Monster weniger effizient"
= einfach eine Zahl (hoehere Kosten/langsamere Produktion), kein neues System.
RUNAWAY-SCHUTZ (Autor-Order "nie eine Karte komplett zubauen"): (a) Blaupausen
sind routen-sicher (M1), (b) Bau-Deckel je Karte, (c) mehrere Lager, durch die
der Held MUSS - die geballten Rohstoffe fliessen in Wellen/Ausbau, nicht in eine
Mauer-Wand; und der Comeback-Hebel (Lager zerstoeren) bremst die Horde.
STATUS M3: EMPFEHLUNG, Autor bestaetigt/aendert. Bau der Blaupausen (M1/M2)
laeuft mit dem ABSTRAKTEN Zeit-Gate (wie F3 heute) - braucht die Oekonomie-
Entscheidung NICHT, ist also entkoppelt und kann sofort starten.

---

# TEIL 4 - AUTOR-GROSSVISION (Runde nach M1, ZU BESTAETIGEN vor Bau)

Der Autor erweitert die Vision deutlich - noch nicht gebaut, erst Rahmen abklaeren:

## V1. Der Feind ist kein hirnloser Untoten-Haufen, sondern eine ARBEITENDE Macht
Vorbild HERR DER RINGE / ISENGARD: die Gegner arbeiten sichtbar - HOLZEN AB,
schuften, bauen -, haben dadurch Intelligenz und Charakter, und sie arbeiten
FUER JEMANDEN. Im KLOSTER sitzt der Herr, der die Region als sein Koenigreich
aufbauen und beherrschen will.
KOPPLUNG zu Dok 01/06 (Untoten-Identitaet) - VORSCHLAG zur Aufloesung, damit die
Story nicht bricht: die Untoten sind die ARBEITS-Gangs, aber nicht willenlos -
sie werden von einem WILLEN (Nekromant/Herr im Kloster) erhoben und GELENKT.
Bild = Sarumans Orks: sie roden den Wald, brechen Stein, befeuern die
Kriegsmaschine - sichtbare Industrialisierung des besetzten Landes. Das gibt
Charakter + Intelligenz UND behaelt die Untoten-Identitaet. (Autor bestaetigt
Framing? Oder echter Wechsel zu Orks als eigene Spezies?)
FOLGE fuer M3-Oekonomie: KEHRTWENDE - wenn sichtbares Arbeiten/Ernten der PUNKT
ist (Charakterisierung), lohnt ein schlankes, GEDECKELTES Ernte-/Rohstoffsystem
DOCH (frueher abgelehnt, weil "hirnlose Untote + versteckte Oekonomie"). Runaway-
Schutz bleibt (Bau-Deckel, nie zubauen, Comeback-Hebel).

## V2. 600 EINHEITEN je Karte moeglich (ausser Ravensmoor)
HARTE Ansage. Realitaet (ehrlich): die aktuelle Architektur schafft ~60 (bei 60
schon 7,7 ms + Spikes). 600 = ~10x = voellig ausserhalb des jetzigen Designs
(jede Einheit volle KI je Frame). 600 in einem 2D-Phaser-Browserspiel ist
MACHBAR, aber nur mit der BAR-Architektur aus dem Wegfindungs-Dokument:
- Simulation von der GRAFIK TRENNEN (Logik-Sim mit fester 20-30 Hz fuer ALLE,
  Renderer interpoliert; nichts schlaeft off-camera).
- KI-Detailstufe (fern/untaetig = seltener denken; nah/kaempfend = voll).
- Squad-Wegfindung (ein Gruppenpfad statt 600 A*), Spatial Hash, Portale.
- Sprite-Batching (EIN Atlas, keine Container/Effekte je Einheit, nur Sichtbares).
- ggf. Pathfinding im Web Worker.
Das ist ein MEHR-PHASEN-UMBAU der Einheiten-/Kampf-Schicht, kein Patch. 600 ist
das STRETCH-Ziel; validieren in Stufen 100 -> 300 -> 600 mit Messung (Rendering
von 600 Sprites + Nebel + Gelaende ist ein eigenes Thema neben der Sim).
FOLGE fuer die Reihenfolge: die Performance-/Architektur-Grundlage ist damit
NICHT mehr optional, sondern PFLICHT UND ZUERST - sie wird von BEIDEN neuen
Zielen (arbeitende Laborer + 600 Einheiten) verlangt.
OFFEN: ist 600 ein hartes Muss oder "so viel dass es wie eine Horde wirkt"?
(Aktive Kaempfer auf dem Schirm vs. Gesamtzahl-mit-LOD ist ein riesiger
Unterschied - das bestimmt den Bauaufwand.)

## V1b/V2b - AUTOR-PRAEZISIERUNG (Setting + Zahlen)
- SETTING BLEIBT: Europa um 1349 (Pest), UNTOTE - KEINE Orks. "Isengard/HdR"
  war nur Veranschaulichung fuers ARBEITENDE (roden, schuften, fuer den Herrn
  im Kloster). Framing "gelenkte Untote" bestaetigt.
- ZAHLEN: 600 war eine Hausnummer. Realistisches Ziel = grosse SPAETSPIEL-
  SCHLACHT (Cannae/Hannibal-Fantasie): 300 vs 300 (evtl. 500 vs 500, Grenze
  offen) - NUR im fortgeschrittenen Spiel, auf der VORLETZTEN/LETZTEN Karte
  (Kloster-Eroberung oder alte Schlachtkarte). Anfangskarten NICHT, Horde
  spawnt dort keine Hunderte. Karten sind gross + offen (deutlich groesser als
  Dungeons) -> die Zahlen sind geometrisch nicht unrealistisch.
- MUSS "nachweislich gut laufen" (Autor). Der Hauptmenue-Test hatte KEINE
  Baeume/Logik/Kollision = Bestfall; die echte Grenze liegt tiefer und wird
  GEMESSEN, nicht geraten.
- GRENZE = Schnittmenge dreier Limits, die ZUSAMMENHAENGEN muessen (Autor):
  (1) FIKTION - die grosse Schlacht wird ERARBEITET (Spaetspiel), kein
      Dauerzustand; als DESIGNTE Set-Piece (feste Karte/Trigger) viel leichter
      zu optimieren als "ueberall/jederzeit emergent".
  (2) OEKONOMIE - Spieler kann nicht unendlich Soldaten anheuern (Gold/
      Bevoelkerung); die Monster SYMMETRISCH gedeckelt durch ihre Ernte-
      Oekonomie (Biomasse je gehaltener Karte, Kloster-Durchsatz) - mehr
      Gebiet gehalten = groessere Horde moeglich = Druck zum Gegenschlag.
  (3) PERFORMANCE - ueber allem ein GEMESSENER harter Deckel "laeuft gut";
      was die Oekonomien mehr erlauben, kommt als Nachschub-Wellen, nicht als
      600 gleichzeitig auf dem Schirm.
- NAECHSTER SCHRITT: Stress-Messung auf 'schlacht' (echte Karte) - IST-Grenze
  heute feststellen, DANN entscheiden, wie weit das Fundament sie hebt.

## V2c - STRESS-MESSUNG IST-GRENZE (schlacht, echte Baeume/Kollision/KI)
Gemessen: reine w.update()-LOGIK je Frame (OHNE WebGL-Zeichnen), headless.
  100 Einheiten: Median 11.6 ms (~86 fps), p95 22, max 27
  300 Einheiten: Median  9.9 ms (~101 fps), p95 19, max 68 (GC-Spike)
  600 Einheiten: Median  8.4 ms (~119 fps), p95 14, max 19
BEFUND (wichtig, korrigiert frueheren Pessimismus): die Logik EXPLODIERT NICHT
mit der Zahl. Auf einer OFFENEN Karte ist Bewegung billig (Freie-Bahn-Abkuerzung
greift fast immer - kein Flussfeld noetig), darum bleibt 600 ~gleich/besser als
100 (bei 600 verklumpen viele sofort und stehen = noch weniger Pfad-Arbeit).
Der frueher genannte "~60-Deckel" galt fuer die STADT (enge Karte, alle jagen
den Helden = teures Pathing) - NICHT fuer eine designte offene Schlachtkarte.
NOCH NICHT gemessen (die echten Risiken): (1) das WebGL-ZEICHNEN von 600 Sprites
+ Lebensbalken + Nebel + Baeumen (laeuft AUSSERHALB update(), separater Render-
Schritt) - der wahrscheinliche echte Flaschenhals; (2) GC-Spikes (in den max-
Werten sichtbar); (3) echte Zielhardware (headless != Autor-PC).
NAECHSTE MESSUNG: volle Frame inkl. Rendering bei 300/600, dann steht die
ehrliche fps-Zahl "laeuft nachweislich gut".
