# 00 - KONTEXT FUER CLAUDE CODE (IMMER ZUERST LESEN)

Diese Datei ist der Einstiegspunkt. Wenn du an Ravensmoor arbeitest, lies sie
VOLLSTAENDIG, bevor du eine Zeile Code schreibst. Sie sagt dir, WARUM etwas so ist -
nicht nur, WAS zu tun ist. Ohne das WARUM baust du technisch korrekten Code, der das
Spiel kaputt macht.

---

## WARUM ES DIESE DATEI GIBT

Bisheriges Problem: Der Autor bekommt einen Code-Auftrag, fuegt ihn ein, und Claude Code
setzt ihn stur um - ohne den Kontext von vielen Stunden Design-Arbeit. Ergebnis: technisch
richtig, inhaltlich falsch. Ein Beispiel: Wenn du "Baukosten aus dem Lager" umsetzt und
dabei auch das persoenliche Baumenue des Helden umstellst, hast du die Kernregel
"Held farmt, NPCs refinen" gebrochen, ohne es zu merken.

**Regel: Wenn ein Auftrag einer der Regeln unten widerspricht, HALT AN und melde es.
Fuehre ihn NICHT aus.**

---

## DIE 12 HARTEN REGELN (nie brechen, nie in Frage stellen)

### 1. Held farmt, NPCs refinen
Der Held sammelt ROHSTOFFE (Erz, Holz, Stein, Kraeuter). NPCs (Schmied, Magdalena,
Mueller, Baecker, Zimmermann) verarbeiten sie zu nutzbaren Guetern.
**WARUM:** Es macht das Dorf notwendig statt dekorativ und verankert die Wirtschaft
als Spielsystem statt als Kulisse. Der Held kann nichts allein.
**FOLGE:** Der Held stellt NIE selbst Waffen, Barren, Brot oder Traenke her.

### 2. Kein Ausdauer-/Stamina-System
Permanent abgelehnt. Rhythmus entsteht NUR aus Angriffs-Erholungszeiten und
Gegner-Telegraphen.
**WARUM:** Stamina macht den Kampf zu Ressourcen-Verwaltung. Der Kampf soll aus
Timing und Lesen bestehen.

### 3. Deterministischer Kampf - KEINE Trefferwuerfel
Du triffst, wenn du triffst. Ruestung REDUZIERT Schaden, sie senkt keine Trefferchance.
**WARUM:** Das Spiel hat Parade, Riposte, perfekte Parade und Telegraphen. Ein
zufaelliger Fehlschlag nach einer perfekt getimten Parade bricht das Versprechen des
Systems. Meisterschaft muss zuverlaessig belohnt werden.

### 4. Das Schwert muss IMMER funktionieren
Nie unter halben Schaden gegen irgendeinen Gegner. Nie eine Immunitaet.
**WARUM:** Die meisten Spieler wollen mit dem Schwert spielen. Der Waffenwechsel ist
eine BELOHNUNG fuer Wissen, keine STEUER auf Unwissen. Wer stur mit dem Langschwert
durchgeht, kommt durch - es dauert nur laenger.
**FOLGE:** Resistenzen sind Multiplikatoren (0.5x), nie Immunitaeten (0x).

### 5. PFERDE: Reittier JA - Kavallerie als Truppengattung NEIN (Stand jetzt)
**Was es GIBT:** Ein funktionierendes Reittier fuer den Helden (aus einem Blender-Asset,
laeuft gut). Es dient dem schnellen Reisen zwischen Karten und Missionen. Ob der Held
im KAMPF reitet, ist offen - das Pferd ist verwundbar.

**Was es NICHT gibt und worauf KEIN System bauen darf:**
- Kavallerie als eigene TRUPPENGATTUNG (20 Lanzenreiter, die in Formation chargen).
  Das braucht Charge-Mechanik, Gruppen-Kollision, Aufprall-Logik - alles nicht vorhanden.
- Schweres Geraet (Rammbock, Katapult, Trebuchet).

**WARUM DAS WICHTIG IST:**
Das Konter-System steht bewusst auf **SCHNITT / STICH / WUCHT** (siehe kampfarten.ts),
NICHT auf dem klassischen AoE-Dreieck (Speer schlaegt Reiter...). So funktioniert es
vollstaendig ohne Kavallerie - und Reiter koennen spaeter andocken, ohne dass irgendetwas
umgebaut werden muss.

**Reiten als Held ist etwas anderes als Kavallerie.** Ueber die Karte reiten ist
Fortbewegung. Eine Reiterattacke ist ein Kampfsystem. Nicht verwechseln.

**Geplant, aber GANZ WEIT HINTEN (nichts darauf aufbauen):**
- **Untote auf fahlen Pferden als GEGNER-Gattung** ← die interessanteste Variante,
  passt erzaehlerisch (der fahle Reiter ist ein Bild, das jeder in dieser Zeit kannte).
  Ein untoter Ritter zu Pferd waere der natuerliche Auftritt fuer einen der Schergen.
- Berittene Ritter des Grafen als SPAETE Verstaerkung (Bonus, kein Fundament).
- Eigene Kavallerie fuer die Spielerarmee: sehr weit hinten, die Karte ist vermutlich
  nicht dafuer ausgelegt.

### 6. Keine Armbrueste in der Heereszusammensetzung
Design-Entscheidung des Autors. (In `RTS_EINHEITEN` steht noch ein `armbruster` - das
ist eine tote Legacy-Tabelle, siehe Dok 03.)
Der HELD darf eine Armbrust fuehren (existiert in items.ts) - das ist etwas anderes.

### 7. Jede Map ist eine WorldScene Area
Sie erbt HUD, Speichern, Licht und Uebergaenge automatisch.
**WARUM:** Isolierte Szenen verlieren die gesamte Spiel-Infrastruktur und muessen alles
nachbauen. Das ist schon einmal passiert (die alte parallele Stadt-Szene).
**NIE eine isolierte Szene bauen.**

### 8. Der Dungeon (`dark:true`) hat einen eigenen Renderpfad
Overworld-Aenderungen (Wasser, Wetter, Baeume, Boden) duerfen ihn NIE beruehren.

### 9. Optionen vorlegen, bevor eine neue Map oder ein neuer Dungeon entsteht
Nie autonom eine Karte anlegen. Erst Vorschlaege, dann bauen.

### 10. Kleine, verifizierte Schritte mit Halt-Punkten
Lieber melden als fabrizieren. Wenn du auf etwas stoesst, das den Auftrag sprengt:
ANHALTEN und berichten. Nie "kreativ" erweitern.

### 11. Alles muss in den Spielstand
`collectSave()` / `applySave()` / `SaveData`. Jedes neue System braucht Defaults fuer
ALTE Spielstaende, sonst brechen sie.

### 12. Sprache und Ton
Deutsch. Bindestrich `-` statt Gedankenstrich. Keine Schmeichelei. Bei Unsicherheit:
sagen, dass man unsicher ist.

---

## DIE 5 LEITIDEEN (das Herz des Spiels - hier kommt jede Design-Entscheidung her)

### A. "Der Preis der Unsterblichkeit" ist eine FRAGE, keine Ueberschrift
Held und Antagonist sind Spiegelbilder. Beide verloren alles im Krieg. Einer waehlte
Demut (Kloster), einer Hybris (Relikt). Am Ende trifft der SPIELER dieselbe Wahl.
**FOLGE FUER MECHANIK:** Verfluchte Waffen (Macht gegen Preis) sind das Ende im Kleinen.
Wer 100 Stunden lang kleine Fluchvorteile abgewogen hat, sitzt vor der letzten Wahl
anders. **Verfluchte Items sind KEINE Deko - sie sind das Thema.**

### B. Die Untoten sind die Toten DEINER Welt
Kein Monster ist ein Monster. Jeder war ein Bauer, ein Soldat, ein Kaufmann. Der
Waffenknecht hat sie nicht erschaffen - er hat sie BENUTZT.
**FOLGE:** Herkunft bestimmt Aussehen, Staerke, Ausruestung UND Beute. Beim Anklicken
erscheint eine Vermutung, wer der Tote war. Das ist Lore ohne Textwand.

### C. Der Feind wird staerker, indem er DICH verliert
Deine Gefallenen stehen auf SEINER Seite wieder auf - mit deiner Ausruestung, mit ihren
Raengen, sichtbar am selben Wams, mit dem Namen, den du kennst.
**FOLGE:** Das Schlachtfeld zu behalten ist keine Deko, sondern taktische Notwendigkeit.
Wer seine Toten beerdigt, sieht sie nicht wieder.

### D. Die drei Uhren (der Sucht-Motor)
Minuten = Kampf. Stunden = Dungeon-Lauf. Tage = Dorfwirtschaft.
**Die langsamen Uhren laufen WEITER, waehrend man an der schnellen spielt.**
Du steigst in die Krypta, weil oben das Korn reift und der Schmied schmiedet. Du kommst
hoch, kassierst drei Belohnungen, stoesst drei neue an, gehst wieder runter.
**FOLGE:** Jede Dorf-Mechanik MUSS an den Dungeon gekoppelt sein. Ein Dorfsystem, das
nicht mit dem Dungeon interagiert, ist tot.

### E. Meisterschaft, nicht Beute-Automat
Das Spiel hat Parade, Riposte, Telegraphen, Movesets. Das traegt KOENNEN.
Beute ist Wuerze, nicht Motor.
**FOLGE:** Keine Zufalls-Beute-Spirale, keine taeglichen Belohnungen an der echten Uhr,
keine endlosen Zahlen-Treppen. Das Spiel hat einen Anfang, eine Mitte und ein Ende.

---

## DIE DOKUMENTE (was wo steht)

| Datei | Inhalt |
|-------|--------|
| **00** (diese) | Regeln, Leitideen, Einstieg |
| **01** | Story, Welt, Figuren, Akte, Lore |
| **02** | Kampf, Items, Schmied, Monster, Faehigkeiten |
| **03** | RTS, Kriegswirtschaft, Armee, Aufklaerung |
| **04** | Motivation, Dungeon-Generator, Umsetzungsreihenfolge |
| **05** | **SYSTEMKARTE** - wie alles zusammenhaengt + Logikluecken |
| **src/data/** | Die Datenschicht (Tabellen, Konstanten) |

**Vor JEDEM Auftrag:** Lies 00 und 05. Dann das Dokument, das zum Auftrag gehoert.

---

## WIE DU AUFTRAEGE AUSFUEHRST

1. **Lies den relevanten Kontext.** Ein Auftrag zu Baukosten -> Dok 03 + Dok 05.
2. **Pruefe gegen die 12 Regeln.** Widerspruch -> ANHALTEN und melden.
3. **Pruefe gegen die Systemkarte (Dok 05).** Wenn dein Auftrag ein System beruehrt,
   das mit anderen gekoppelt ist, nenne die Kopplungen, BEVOR du baust.
4. **Sieh dir den bestehenden Code an.** Nichts erfinden, was schon existiert.
   Nichts neu benennen, was schon einen Namen hat.
5. **Baue in kleinen Schritten mit Halt-Punkten.**
6. **Haenge Neues in `SaveData` ein** (mit Defaults fuer alte Staende).
7. **Melde, was du NICHT getan hast** und warum.

---

## DIE HAEUFIGSTEN FEHLER (bisher passiert)

| Fehler | Warum er passiert | Wie du ihn vermeidest |
|--------|-------------------|----------------------|
| Isolierte Szene gebaut | "Ist einfacher" | Immer WorldScene Area |
| Overworld-Aenderung hat den Dungeon zerschossen | Gemeinsame Codepfade | `dark:true` pruefen |
| Bruecken kaputt beim Wasser-Umbau | Auto-Konvertierung von Pfad-Tiles | Nie Tiles automatisch umwandeln |
| Neues System nicht im Save | Vergessen | Checkliste Punkt 6 |
| Zwei parallele Tabellen fuer dasselbe | Alte nicht geloescht | Erst suchen, dann anlegen |
| Stur umgesetzt, Kontext ignoriert | Diese Datei nicht gelesen | Diese Datei lesen |

---

## WAS AKTUELL TOT IM CODE LIEGT (pruefen, dann aufraeumen - nicht blind loeschen)

- `RTS_RANG` in `src/data/rts.ts` - Veteranen-System definiert, NIRGENDS benutzt.
  Vorsicht: `RtsUnit.rank` ist etwas ANDERES (Formations-Tiefe). Namenskollision.
- `RTS_EINHEITEN` in `src/data/rts.ts` - konkurriert mit `RTS_UNIT_TYP`.
  Nur `RTS_UNIT_TYP` laeuft. `RTS_EINHEITEN` enthaelt einen `armbruster`, was der
  Design-Regel widerspricht.
- Der Konstanten-Block `MORAL` existiert, wird aber kaum benutzt.
- `dungeon-generator-spec-diablo1.md` ist UEBERHOLT durch
  `kerker-map-generator-spec.md` (rekursive Flaechenteilung statt Streuung).
