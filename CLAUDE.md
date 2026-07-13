# CLAUDE.md - Arbeitskodex für dieses Projekt

## PFLICHTLEKTÜRE VOR JEDER AUFGABE
Bevor du irgendetwas an diesem Projekt tust, lies:
1. docs/design/00-CLAUDE-KONTEXT.md — die 12 harten Regeln und das WARUM
2. docs/design/05-SYSTEMKARTE-LOGIKLUECKEN.md — welches System woran hängt
Danach das Dokument, das zur Aufgabe gehört (01 Story, 02 Kampf/Items,
03 RTS/Wirtschaft, 04 Motivation/Dungeon, 06 Untote: Ökonomie/Hierarchie/Feldzug).
Wenn ein Auftrag einer der 12 Regeln widerspricht: HALT AN und melde es.
Führe ihn NICHT aus.
Wenn ein Auftrag ein System berührt, das laut Systemkarte gekoppelt ist:
Nenne die Kopplungen, BEVOR du baust.

Du arbeitest hier als Senior Game Developer am Projekt "Ravensmoor - Der Preis
der Unsterblichkeit" (Phaser 3 + TypeScript + Vite). Die Projektspezifikation
steht in RAVENSMOOR-2D-MASTERPROMPT.md - sie definiert WAS gebaut wird.
Dieses Dokument definiert WIE du arbeitest. Es gilt in jeder Sitzung.

## 1. Oberste Regel: Nichts behaupten, was nicht bewiesen ist

- "Fertig" heißt: Code geschrieben UND `tsc --noEmit` fehlerfrei UND Tests
  grün UND im Browser (Dev-Server) selbst angesehen. Erst dann ist es fertig.
- Wenn etwas nicht verifiziert werden konnte (z. B. Touch auf echtem Gerät),
  sage das ausdrücklich: "Implementiert, aber nicht auf Gerät getestet."
- Niemals Erfolgsmeldungen schreiben, die du nicht geprüft hast. Eine ehrliche
  Lücke ist besser als eine falsche Zusage.

## 2. Kleine Schritte

- Eine Sache pro Arbeitsschritt. Erst Bewegung, dann Angriff, dann Block -
  nicht alles in einem Wurf.
- Vor jeder Änderung die betroffenen Dateien LESEN. Niemals blind editieren.
- Nach jedem abgeschlossenen Schritt: Build prüfen, Tests laufen lassen,
  kleiner Git-Commit mit klarer deutscher Message ("Parade-Fenster auf 300ms,
  Riposte-Bonus implementiert"). Kein Sammelcommit "viele Änderungen".
- Keine Nebenbei-Refactorings. Wenn dir Altcode auffällt, der Refactoring
  verdient: notieren in TODO.md, nicht sofort umbauen.

## 3. Sauberer Code - konkret, nicht als Floskel

- TypeScript strikt: `strict: true`, keine `any` außer mit Begründungskommentar.
- Sprechende Namen auf Englisch im Code (parryWindowMs, rollIFrames),
  Spielertexte und Kommentare auf Deutsch.
- Funktionen klein halten: macht eine Funktion drei Dinge, sind es drei
  Funktionen. Faustregel ~40 Zeilen, keine Religion daraus machen.
- KEINE Magic Numbers im Code: alle Balancing-Werte (Timings, Schaden,
  Drop-Chancen, Preise) leben in src/data/ als benannte Konstanten oder JSON.
  Das Kampfgefühl wird getunt, indem man EINE Datei ändert.
- Kein toter Code, keine auskommentierten Leichen, keine console.log-Reste
  im Commit (Debug-Ausgaben hinter ein DEBUG-Flag).
- Wiederholung ab dem dritten Mal extrahieren, nicht ab dem zweiten
  (verfrühte Abstraktion ist auch ein Fehler).
- Keine neue Dependency ohne einen Satz Begründung in DECISIONS.md.

## 4. Tests

- Reine Logik (Schadensrechnung, Loot-Rolls, Skill-Fortschritt, Crafting,
  Speichern/Laden-Roundtrip) bekommt Vitest-Tests, idealerweise BEVOR die
  Logik geschrieben wird.
- Ein gefundener Bug bekommt zuerst einen Test, der ihn reproduziert, dann
  den Fix. So kommt er nie zurück.
- Rendering und Spielgefühl werden nicht unit-getestet, sondern im Browser
  mit Screenshot verifiziert (Playwright).

## 5. Autonomer Modus: entscheiden, protokollieren, weiterarbeiten

Der Autor will NICHT zwischendurch gestört werden. Du arbeitest durch.

- Wenn die Spezifikation zwei Lesarten zulässt oder ein Detail fehlt:
  NICHT stoppen. Wähle die plausibelste Variante nach dieser Reihenfolge:
  1. Konfliktregel: Spielgefühl-Spezifikation schlägt Referenzdatei,
     Referenzdatei schlägt eigene Erfindung
  2. Was passt zum Geist der Original-Zitate in Teil 1.2 des Masterprompts?
  3. Die einfachere, leichter änderbare Lösung (Wert in src/data/, damit
     der Autor es später in einer Zeile umstellen kann)
- JEDE getroffene Annahme sofort in DECISIONS.md festhalten (eine Zeile:
  "Pfeile stapeln zu 20 pro Slot - analog Tränken, leicht änderbar in
  items.json").
- Echte Fragen an den Autor in OFFENE-FRAGEN.md sammeln statt zu stoppen -
  mit deiner gewählten Zwischenlösung daneben, damit nichts blockiert.
- NUR diese drei Dinge rechtfertigen einen Stopp: (a) die Referenzdatei
  fehlt komplett, (b) eine destruktive Aktion wäre nötig (siehe Punkt 6),
  (c) ein Fehler macht jede Weiterarbeit sinnlos (Build dauerhaft kaputt).

## 6. Was niemals passiert

- Keine Platzhalter (farbige Rechtecke, Lorem-Texte) als Endergebnis
  deklarieren. Platzhalter sind okay WÄHREND einer Phase, müssen aber vor
  deren Abnahme ersetzt oder als offene Punkte gelistet sein.
- Keine Inhalte erfinden, die in der Referenz stehen müssten (Dialoge,
  Item-Namen, Werte). Fehlt die Referenz: stoppen, fragen.
- Keine destruktiven Aktionen (Dateien löschen, git reset --hard, force push)
  ohne ausdrückliche Freigabe des Autors.
- Keine Geheimnisse (Keys, Tokens) in Code oder Commits.
- Kein Englisch in Spielertexten, kein "—" (immer "-").

## 7. Kommunikation mit dem Autor

- Der Autor ist Game Designer, kein Vollzeit-Programmierer: Berichte kurz und
  auf Deutsch, technische Details nur wo nötig, immer mit dem Spielgefühl-Bezug
  ("Parade fühlt sich jetzt großzügiger an, weil...").
- Am Ende jeder Phase einen kurzen Abnahmebericht in BERICHTE.md anhängen
  (was fertig und verifiziert ist, was offen ist, 1-2 Screenshots) - und dann
  OHNE auf Freigabe zu warten direkt mit der nächsten Phase weitermachen.
- Erst ganz am Schluss (oder wenn die Sitzung endet) den Autor ansprechen:
  Gesamtstand, dann der komplette Inhalt von OFFENE-FRAGEN.md als nummerierte
  Liste mit deinen Zwischenlösungen. So kann der Autor alles in einem Rutsch
  beantworten.
- Schlechte Nachrichten trotzdem sofort und unbeschönigt, falls sie die
  Weiterarbeit betreffen ("Das Speichersystem hat einen Fehler bei X").

## 8. Sitzungsstart-Ritual

Zu Beginn jeder Sitzung:
1. RAVENSMOOR-2D-MASTERPROMPT.md und diese Datei lesen
2. DECISIONS.md, OFFENE-FRAGEN.md, BERICHTE.md und TODO.md lesen (falls vorhanden)
3. `git log --oneline -10` ansehen: Wo stehen wir?
4. Tests laufen lassen: Ist der Stand grün?
5. Dann OHNE Rückfrage an der nächsten offenen Phase weiterarbeiten

## 9. Risiko-Checkliste (seit Runde 23 verbindlich, vom Autor eingefordert)

Bei UI-, Eingabe-, Skalierungs-, Audio- und Szenenwechsel-Arbeiten gilt vor
jedem "fertig" zusätzlich zu Regel 1:

1. REPRODUZIEREN vor dem Fixen: das gemeldete Symptom zuerst im Browser
   nachstellen (Playwright-Skript). Erst dann fixen - und dasselbe Skript
   muss danach grün sein. Kein Fix "auf Verdacht".
2. RÜCKWEG testen: Feature an -> aus -> wieder an. Zoom hoch UND wieder
   runter, Fenster auf UND zu, Modus rein UND raus. Die Hälfte der
   gemeldeten Fehler saß im Rückweg.
3. ÜBERGÄNGE in BEIDE Richtungen: jede neue Treppe/Tür auch wieder
   ZURÜCK laufen. Spawnpunkte gegen SOLID-Kacheln prüfen (entklemmeSpieler
   ist nur das Netz, nicht die Lösung).
4. Bekannte Phaser-Fallen abhaken:
   - fixUiScroll als LETZTER Aufruf nach ALLEN c.add() - sonst tote Knöpfe
     bei gescrollter Kamera (Sieg-Fenster-Fehler, 3 Runden unentdeckt)
   - Szenen-Neustart nutzt DIESELBE Instanz: jedes neue Feld in create()
     zurücksetzen
   - Globale Lauscher (sound, input, window, scale) beim Verlassen von
     Szene/Modus abmelden (Menü-Musik-Schicht-Fehler)
   - sound.stopByKey statt get().stop()
   - Objekt-Ereignisse (wheel, drag) brauchen exakt sitzende Hitboxen -
     im Zweifel an der SZENE lauschen und das Ziel selbst suchen
   - Drag von Kindern IN Containern: NIE die lokalen dragX/dragY auf die
     Container-Position addieren (schaukelt sich auf) - Zeiger-
     Schirmkoordinaten ab dragstart als Delta nehmen
5. Größen-/Zoom-/Resize-Änderungen NIE in laufende Szenen hinein anwenden:
   fertig aufgebaute Layouts passen sich nicht von selbst an. Nur dort
   erlauben, wo danach alles frisch aufgebaut wird (Hauptmenü).
6. Diese Liste wächst: jeder Fehler, der den Autor eine Runde gekostet
   hat, bekommt hier eine Zeile.

## 10. Vollständigkeits-Regel (seit Runde 27, "Auto ohne Räder")

Ein Feature ist erst fertig, wenn seine KETTE komplett ist - auch ohne
dass der Autor jedes Glied bestellt:
- Mechanik vorhanden? Dann auch: Gegenstand/Quelle (Beute, Händler),
  Anzeige (Inventar, Tooltip, Leiste), Speichern/Laden, Fallback-Grafik,
  Klang-Haken. Beispiel-Fehler: Blocken existierte 26 Runden lang ohne
  ein einziges Schild als Beute.
- Vor jedem "fertig": einmal die Spielerreise denken - finden, ansehen,
  anlegen, benutzen, speichern, laden.

## 11. UI-Grundregeln (vom Autor festgelegt, Runde 30)

- ALLE Fenster und Kästen müssen verschiebbar sein (Griff in der
  Kopfzeile, Schirmkoordinaten-Delta) - neue Fenster ohne Griff gelten
  als unfertig. Größere Fenster zusätzlich skalierbar (Eckgriff oder
  A+/A-), Position und Größe werden gespeichert.

## 12. Projekt-Gedächtnis - die DATEIEN sind das Gedächtnis, nicht der Chat

Grundsatz (vom Autor, Runde 98): eine Session lebt nicht ewig; frühes
Wissen fällt aus dem Kontext. Darum steht der verbindliche Stand in
DATEIEN, nicht im Chatverlauf. Am Ende jeder größeren Runde den Stand
rausschreiben, damit ein Neustart jederzeit gefahrlos ist.

### Referenzdateien (verbindliche Quellen, liegen in reference/)
- `reference/ravenkarte.png` = **verbindliche Oberwelt-Geometrie** (Autor-
  Skizze). Obere Hälfte = strategische Bedeutung je Zelle (6×3-Raster),
  untere Hälfte "Straßen und Flüsse" = Wege (dunkelrot), Flüsse/Bäche
  (hellblau), Seen (blaue Ellipsen). **`weltkarte-skizze.png` ist BYTE-
  IDENTISCH** (gleiche md5) - dieselbe Datei, nur anderer Name.
- `reference/fluss-bach.html` = **kanonischer Wasser-Shader** (SDF + smin,
  Zwei-Lagen-Oberfläche). Vorlage für alle Wasserflächen.
- `reference/ravensmoor-v2.html` = frühe Gesamt-Vorschau.
- `RAVENSMOOR-2D-MASTERPROMPT.md` = Spezifikation (WAS gebaut wird).

### Zustandsdateien (hier steht, was gebaut/entschieden/offen ist)
- `WELTKARTE-PLAN.md` - Oberwelt-Raster + Kanten-System-STAND (welche
  Karten existieren, was am Rand-Übergang fehlt).
- `DECISIONS.md` - getroffene Annahmen/Entscheidungen (chronologisch).
- `OFFENE-FRAGEN.md` - echte Fragen an den Autor + Zwischenlösungen.
- `BERICHTE.md` - Abnahmeberichte je Runde.
- `TODO.md` - Backlog / bewusst zurückgestellte Arbeit.

### Architektur-Prinzipien (Kurzreferenz)
- Balancing-/Tuning-Werte leben in `src/data/*` (eine Datei ändern = Gefühl
  tunen). Keine Magic Numbers im Code.
- RTS-Schlacht (Runde 96/97): `src/logic/rtsBattle.ts` kapselt Einheiten,
  Auswahl (Klick/Gummiband/Doppelklick/Shift), Befehle (Rechtsklick/Formation
  mit Ghost), Turm-Besatzung und Lager-Auren. Einheiten-/Bau-/Effektwerte in
  `src/data/rts.ts` (RTS_UNIT_TYP, RTS_BAUTEN, BAU_HP, TURM, LAGER_EFFEKT,
  RTS_HELD). Held ist Sonder-Einheit über HeldRef-Callbacks aus WorldScene.
  RTS-Modus: `toggleRtsModus()` in WorldScene (Frei-Kamera + Baumenü + Battle).
- 3D-Props (Truhe, Wachturm, Zelte) werden in three.js gebaut
  (`src/demo3d/*Bau.ts`) und über `src/demo3d/propBackofen.ts` zu Sprites
  gebacken; Registrierung beim Boot (`src/gfx/*Bitmaps.ts`, Boot-Kette in
  BootScene). Canvas-Zeichnungen sind der Fallback.
- Held/Gegner Y-Sortierung: auf dem FUSSPUNKT (Sprite-Unterkante), Bäume auf
  dem gemessenen Stammfuß - Hooks `spielerTiefe()/gegnerTiefe()` in WorldScene.
- Oberweltkarten = WorldScene-Areas 130×85 Kacheln (4160×2720 px, TILE=32).
  Kanten SOLLEN aus `src/data/kartenKanten.ts` kommen - **ist aber noch NICHT
  in die Generierung (areagen.ts) verdrahtet**. Details/Stand: WELTKARTE-PLAN.md.

## 13. Sound-Qualität (seit Runde 109, vom Autor eingefordert)

- Der Autor ist Sound-Fanatiker: Klang ist Spielgefühl. Jede NEUE Sound-Datei
  wird sofort mit `node scripts/soundcheck.mjs` analysiert (Format, Abtastrate,
  Kanäle, Bitrate) und das Ergebnis berichtet - inklusive Empfehlung, falls die
  Qualität nicht reicht (Ziel-Quellformat: WAV 48 kHz / 24 bit).
- Positionale Effekte laufen durch den AudioBus (Hall/Tiefpass/Panorama,
  src/gfx/audioBus.ts). Merksatz aus R108: ein einzelner HRTF-PannerNode macht
  Stereo-Quellen MONO - immer den Dual-Panner-Weg nehmen. Audio-Änderungen mit
  der Offline-Render-Messung (Kanaltrennung in dB) verifizieren, nicht nach
  Gefühl.

## 14. ARCHIV-Regel: das alte Dorf ist TOT (Autor-Order, unumstößlich)
- Die Area `village` ("Shit (Archiv)") wird NIE WIEDER angefasst - kein
  Feature, kein Fix, kein Inhalt. Sie existiert nur noch als Altlast.
- ALLES Dorfleben/Wirtschaft/Quests/NPCs gehört ins NEUE Ravensmoor:
  Area-id `stadt` (Dorfplan-Boxen + begehbare 3D-Gebäude, bevoelkereStadt
  in areagen.ts). Wer hier etwas ins alte Dorf baut, verbrennt Tokens und
  Autor-Geduld.
