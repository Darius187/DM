# Auftrag: Dorfwirtschaft "Siedler lite" + Dorfleben komplett (autonom, in Meilensteinen)

Ziel: Ravensmoor bekommt eine lebendige Dorfwirtschaft: Bewohner arbeiten SICHTBAR
an Arbeitsorten (schmieden, backen, ernten, Holz hacken, fischen), machen Pausen,
Produktionsketten brauchen echte Inputs (kein Erz -> keine Waffen), das Dorf hat
ein zentrales Lager mit Verwaltung, Tiere vermehren sich, (fast) alle Bewohner
können sprechen und handeln, und das Questsystem ist technisch an die NPCs
angebunden. Siedler-Gefühl in LITE: keine Mikroverwaltung, alles läuft im
Tagestakt von selbst, der Autor justiert nur Zahlen.

## ARBEITSMODUS (ausdrücklicher Autorwunsch - überschreibt frühere Halt-Punkte)

- **Autonom durcharbeiten, KEINE Rückfragen.** Der Autor will, dass erstmal etwas
  steht; nachjustiert wird später. Triff Entscheidungen selbst, dokumentiere sie
  im Meilenstein-Bericht unter "ENTSCHEIDUNGEN", arbeite weiter.
- Die Halt-Punkte aus `AUFTRAG-dorfleben-anker.md` ENTFALLEN. Falls jener Auftrag
  noch nicht umgesetzt ist: arbeite ihn ZUERST autonom ab (er ist die Grundlage:
  Anker-System, Tagespläne, Natürlichkeit), dann diesen.
- Einzige Ausnahmen, bei denen du stoppst und fragst: (1) du müsstest bestehende
  Systeme LÖSCHEN oder grundlegend umbauen (statt erweitern), (2) Spielstände
  würden unrettbar brechen, (3) ein Meilenstein ist ohne eine Autor-Ressource
  (z. B. fehlende Datei) unmöglich.
- Nach JEDEM Meilenstein: Commit(s) + kurzer Bericht mit Screenshots (je Phase/
  System) + ENTSCHEIDUNGEN + ehrliche Lücken. Nicht auf Antwort warten - weiter
  zum nächsten Meilenstein.
- CLAUDE.md gilt: kleine Schritte, tsc + Tests grün je Meilenstein, im Browser
  verifizieren, ehrlich melden was nur headless geprüft ist, deutsche Commits.

## LEITPLANKEN (nicht verhandelbar)

1. **Erweitern, nicht neu bauen.** Es existieren bereits: Dorf-Lager + Dorfkasse
   + tägliche Produktion + Abgaben an den Fürsten (7-Tage-Rhythmus), die
   automatische Verarbeitung Weizen->Mehl->Brot und Eisen+Kohle->Barren
   (`src/data/wirtschaft.ts`, VERARBEITUNG), Tagesphasen (`welt.ts`, TAG),
   Innenräume, Tagwerke, Kopfgelder, Händler, Kämpfer-/Einfall-/Flucht-Logik,
   Quest-Logbuch (questCtx/logbuch/verfolgteQuest), das Anker-System (aus dem
   Dorfleben-Auftrag). ALLES davon wird erweitert und verdrahtet - nichts
   parallel neu erfunden.
2. **Alle Balancing-Zahlen in Daten-Dateien** (wirtschaft.ts erweitern bzw.
   dorfOekonomie.ts daneben), nie hart im Code. Der Autor dreht später nur Werte.
3. **Balance-Grundsatz: Das Dorf überlebt ohne den Helden, aber es blüht nur mit
   ihm.** Eigenproduktion klein halten; Held bleibt Haupt-Hebel (bringt Erz,
   Felle, Kräuter, kauft/verkauft). Regel "Held sammelt, NPCs veredeln" bleibt:
   NPCs erzeugen Basis-Rohstoffe (Feld, Vieh, Fisch, Holz) nur in kleinem Takt.
4. **Spielstand-Kompatibilität:** Alle neuen Bestände (Waren, Tiere, Felder,
   Questflags) wandern in den Spielstand; alte Stände laden mit Standardwerten
   (Migration). Vor Abschluss eines Meilensteins: alten Stand laden + prüfen.
5. **Nicht anfassen:** Dungeon-Renderpfad (dark:true), Kampfsystem, Einfall-/
   Flucht-Kernlogik (nur Ziele/Kopplungen), das 9er-Feld des HELDEN (Bauern
   bekommen EIGENE Felder).
6. **Determinismus:** keine KI-Aufrufe, keine Bedürfnis-Simulation - Tagestakt,
   feste Regeln, seeded Zufall wo nötig.

---

## M1 - Bewohner-Roster + Sprites

**Roster (vom Autor vorgegeben - so umsetzen; vorhandene Figuren-Namen behalten,
fehlende zeitgenössisch um 1349 ergänzen):**

Amt & Kirche: 1. Schulze (Kämpfer, Gemeindehaus) · 2. Pater Johannes (Kirche) ·
3. Küster/Glöckner (Kirche/Friedhof - übernimmt das Glockenläuten morgens/abends).
Wirtshaus: 4. Heinrich Kramer (Wirt, Kämpfer) · 5. Wirtin (seine Frau, Küche).
Handwerk: 6. Schmied (Kämpfer, Schmiede am Rand) · 7. Müller (an der Mühle am
Fluss) · 8. Bäcker (Nordzeile, nutzt Backhaus) · 9. Zimmermann (Kämpfer,
Werkstatt + Baustelle verbrannter Hof) · 10. Holzfäller (Waldrand) ·
11. Fischer (See/Fluss) · 12. Imker (Obstgärten Süd) · 13. Magdalena
(Kräuterfrau, Westrand mit Kräutergarten - Lage steht fest).
Heil & Haus: 14. Hebamme/Heilerin (Dorfzeile; verzahnt mit dem Verwundeten-
Heilsystem) · 15. Magd (holt sichtbar Wasser vom Brunnen, Wäsche).
Bauern: 16.-18. Familie A: Bauer, Bäuerin, Kind (KORN-Felder Ost/Süd) ·
19.-21. Familie B: Bauer, Bäuerin, Hirtenjunge (VIEH: Angerwiese/Weide).
Dorfvolk: 22. Witwe (Klatsch am Brunnen) · 23. zweites Kind (die zwei Kinder
spielen zusammen um die Linde).
NICHT dabei (Autor-Entscheidung, gehören in die Hauptstadt/späteres Dorf):
Weberin, Gerber, Küfer, Bader, Schäfer, Schneider.

**Sprites:** Prozeduraler Figuren-Renderer auf 64x64 (oder höher, wenn das
Sprite-System es sauber hergibt): je Rolle eigene Kleidungsfarben/Silhouette,
Werkzeug in der Hand (Hammer, Mehlsack, Angel, Axt, Eimer, Kräuterkorb),
Posen/Mini-Animationen für Gehen, ARBEITEN (rollenspezifisch), PAUSE
(sitzen/strecken/trinken), PLAUSCH. Ehrlich: prozedural, kein gemaltes Artwork -
darum zwingend über die bestehende FIGURES-/SpriteProvider-Hot-Swap-Struktur,
sodass spätere ComfyUI/KI-Sprite-Pakete jede Figur 1:1 ersetzen.

## M2 - Arbeitsorte, sichtbare Arbeit, Pausen

- Je Rolle ARBEITS-Anker mit STATION (Amboss, Backofen, Mühle, Feld, Holzplatz,
  Angelsteg, Bienenstöcke, Kräuterbeet, Brunnen, Baustelle) - baut auf dem
  Anker-System auf.
- Sichtbare Arbeits-Effekte an der Station: Amboss-Funken + Hammer-Takt,
  Ofenrauch beim Backen, Hack-Bewegung + fallender Baum-Klang, Feld-Hacken,
  Angel-Wippe, Eimer-Trage-Weg der Magd. Klein und wiederverwendbar.
- PAUSEN: Vormittags- und Nachmittags-Verschnaufer an der Station (kurz),
  Mittagsrunde (existiert) bleibt der große Sozialblock; abends Wirtshaus.
  Zeitversätze aus dem Natürlichkeits-Schritt gelten überall.

## M3 - Lager & Verwaltung

- Dorf-Lager (existiert) auf den vollen Warenkatalog erweitern: Korn, Mehl,
  Wasser, Brot, Fisch, Fleisch, Eier, Milch, Honig, Kräuter (die geplanten
  benannten Kräuter als Untertypen vorbereiten), Holz, Stein, Erz, Kohle,
  Eisenbarren, Waffen, Werkzeuge, Felle, Gold (Dorfkasse).
- Kapazität je Warengruppe; bei Überlauf verkauft der Schulze automatisch an
  den Händler (Gold -> Dorfkasse, Meldung in der Chronik).
- VERWALTUNGS-BUCH beim Schulzen/Gemeindehaus (bestehende Anzeige ausbauen):
  Bestände, gestern produziert/verbraucht, Warnungen (z. B. "Mehl geht aus",
  "Müller fehlt"). EIN Panel, kein Dashboard-Wildwuchs.

## M4 - Produktionsketten (Input-gegated, an lebende NPCs gebunden)

Jede Stufe läuft NUR, wenn ihr NPC lebt, im Dorf ist und seine ARBEITS-Phase
hat (das war das offene Autor-Ziel) - und wenn die Inputs im Lager sind:

- Korn --(Müller an der MÜHLE; Wasserrad = Standort, kein Wasserverbrauch)--> Mehl
- Mehl + Wasser --(Bäcker; Wasser holt die Magd vom BRUNNEN ins Lager)--> Brot
- Erz + Kohle --(Schmelze, existiert)--> Eisenbarren
- Eisenbarren --(Schmied)--> WAFFEN/WERKZEUGE in sein Verkaufsinventar
  (sichtbar beim Händlern; Vorgriff: später rüsten diese Waffen die Miliz/
  RTS-Einheiten über das Zeughaus aus - nur den Daten-Haken vorsehen)
- Fischer --> Fisch · Holzfäller --> Holz · Imker --> Honig ·
  Magdalena --> Kräuter (klein; Held bleibt Hauptsammler) ·
  Zimmermann verbraucht Holz an der BAUSTELLE (Wiederaufbau-Fortschritt)
- Quellen für Erz/Kohle JETZT: Held (Krypta/Beute) + Händler; Haken für später:
  Goldmine-Dungeon (V2) und Köhler-Biom sind geplant - nur andocken können.

## M5 - Felder & Vieh

- BAUERN-FELDER (neu, getrennt vom Helden-Feld): Familie A sät/jätet/erntet
  sichtbar über Wachstumstage; Ernte -> Korn ins Lager. 2-3 Felder reichen.
- VIEH (Familie B + Angerwiese): Bestände im Spielstand.
  Hühner: Eier täglich; Vermehrung alle paar Tage bei Futter (Korn) bis Deckel.
  Kühe: Milch täglich; Kalb in großen Abständen bis Deckel; über Deckel ->
  Schlachtung -> Fleisch. Schweine: Ferkel bis Deckel; Schlachttag im
  Wochenrhythmus -> Fleisch. Alle Raten/Deckel/Futterkosten als Daten.
- EINFALL koppeln: gerissenes Vieh (Chaos-Logik existiert) senkt die Bestände
  wirklich; zertrampelte Felder verlieren Wachstumstage.

## M6 - Verbrauch & Kreislauf (macht alles bedeutsam)

- Bewohner ESSEN täglich aus dem Lager (Brot/Fisch/Fleisch/Eier/Milch, einfache
  Prioritätenliste). Knappheit LITE: kein Hungertod - stattdessen Unmuts-Klatsch
  ("kein Brot mehr!"), leicht verlangsamte Arbeit, Warnung im Verwaltungs-Buch.
- Abgaben an den Fürsten (existiert) ziehen aus demselben Lager - Zielkonflikt
  wird spürbar. Held kann Lücken füllen (verkaufen/spenden - Spenden-Weg war
  Backlog).
- HÄNDLER an das Lager/die Eigenproduktion koppeln (offener Backlog-Punkt):
  Der Schmied verkauft nur, was er hergestellt hat; der Bäcker nur vorhandenes
  Brot. Feste Preise (Daten), schwankende VERFÜGBARKEIT - keine dynamischen
  Preise (Mikromanagement-Falle).

## M7 - Sprechen & Handeln für (fast) alle

- Jeder benannte Bewohner ist ansprechbar: 2-4 Dialogzeilen je Kontext
  (normal / Regen / nach Einfall / Knappheit / Abgabetag) aus kleinen Tabellen.
- Handel bei allen mit Waren (Schmied, Bäcker, Fischer, Imker, Magdalena,
  Wirtin/Essen, Bauern/Eier+Milch); die übrigen (Kinder, Witwe, Magd, Pater)
  nur Dialog. Kauf-/Verkaufspreise als Daten.

## M8 - Quest-Anbindung (Technik jetzt, Inhalte als Gerüst)

- Technischer Hook: `questgeber`-Feld am NPC + Marker über dem Kopf (verfügbar/
  abgabebereit), Anbindung an das bestehende Logbuch/Verfolger-System.
- QUESTLINIEN-TABELLE als Daten anlegen (Status: PLATZHALTER), vom Autor
  vorgegeben:
  | NPC | Linie | frei ab | Inhalt (kurz) |
  | Pater Johannes | Hauptquest (existiert) | sofort | Krypta/Finsternis |
  | Schulze | "Dorf im Aufbau" | sofort | Wiederaufbau, Abgaben-Nöte |
  | Schmied | "Stahl für Ravensmoor" | sofort | Erz beschaffen -> erste Waffe -> später Zeughaus/Miliz |
  | Magdalena | "Kräuterkunde" | sofort | benannte Kräuter sammeln -> Tränke |
  | Müller + Bäcker | "Vom Korn zum Brot" | Tag 2 | die Kette anstoßen/retten |
  | Fischer | "Der stille See" | Tag 3 | Angelplätze, Gerücht im Wasser |
  | Zimmermann | "Der verbrannte Hof" | nach 1. Einfall | Wiederaufbau-Projekt (aufbauStufe) |
  | Wirt Heinrich | "Gerüchte am Tresen" | sofort, wiederholbar | Kopfgelder (System existiert) |
  | Imker | "Süßes Gold" | Tag 4 | Honig/Met |
  | Hebamme | "Kranke im Dorf" | nach Einfall | Heilung, verzahnt mit Magdalena |
- ZWEI Quests real verdrahten als Beweis: "Stahl für Ravensmoor" (Schritt 1:
  5 Erz bringen -> Schmied schmiedet sichtbar die erste Waffe) und ein
  Tresen-Kopfgeld über den neuen Hook. Rest bleibt Gerüst.

## M9 - Politur, Balancing-Pass, Gesamtbericht

- Mehrere Spieltage am Stück prüfen (Bett überspringt Tage; `?zeit=`-Scrub):
  Läuft der Kreislauf stabil? Laufen Lager weder leer noch über? Screenshots.
- Kern-Störfall zeigen: Müller per Dev-Mittel entfernen -> Kette stockt sichtbar
  -> Klatsch + Warnung. Wiederherstellen.
- Gesamtbericht: was steht, alle ENTSCHEIDUNGEN, alle Zahlen-Dateien (wo der
  Autor justiert), ehrliche Lücken, Vorschläge für die Feinjustier-Runde.

## NICHT in diesem Auftrag
Häuser-/Figuren-Artwork (kommt per Hot-Swap vom Autor), RTS-Schicht (nur die
Daten-Haken Zeughaus/Waffen), Winter/Jahreszeiten, dynamische Preise,
Bedürfnis-/KI-Simulation, neue Karten oder Dungeons.
