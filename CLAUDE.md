# CLAUDE.md - Arbeitskodex für dieses Projekt

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
