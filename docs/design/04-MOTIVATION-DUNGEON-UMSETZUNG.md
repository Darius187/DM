# RAVENSMOOR - 04 MOTIVATION, DUNGEON & UMSETZUNG

Die psychologische Architektur (warum man weiterspielt), der Dungeon-Generator,
und die konkrete Reihenfolge der Arbeit.

---

# TEIL A - DIE MOTIVATIONS-ARCHITEKTUR

## A1. Die drei Uhren  [Design-Prinzip - der Kern-Motor]

**Was Spieler stundenlang festhaelt, ist selten EIN Reiz. Es sind mehrere Uhren, die
unterschiedlich schnell laufen und sich gegenseitig fuettern.** Alle drei sind schon da:

| Uhr | Was | Dauer |
|-----|-----|-------|
| **Minuten** | Kampf: Hieb, Parade, Riposte, Beute | Sekunden bis Minuten |
| **Stunden** | Dungeon-Lauf: runter, pluendern, hoch, beim Schmied abliefern | 20-60 Min |
| **Tage** | Dorf: Felder wachsen, Schmied schmiedet, Konvoi rollt nach Norden | Spieltage |

**DER ENTSCHEIDENDE KNIFF: Die langsamen Uhren laufen WEITER, waehrend man an der
schnellen spielt.**

Du steigst in die Krypta, weil du weisst: Wenn ich hochkomme, ist das Korn reif, der
Schmied hat die Klinge fertig, der Konvoi ist an der Front angekommen. Du kommst hoch,
kassierst **drei Belohnungen auf einmal**, stoesst sofort die naechsten drei an - und
gehst wieder runter.

**Das ist der "nur noch einer"-Motor.** Und er ist GESUND, weil er das AUFHOEREN
genauso belohnt wie das Weiterspielen. (Stardew lebt davon.)

Die Wirtschaft tickt schon im Tagestakt - **sie muss nur konsequent an den Dungeon
gekoppelt werden.**

## A2. Es darf nie NICHTS Angefangenes geben  [Design-Prinzip]

Der Mensch erinnert sich an **Unerledigtes** staerker als an Erledigtes. Deshalb
funktioniert der halbfertige Balken.

- Die Palisade braucht noch **zwoelf Holz**.
- Der Schmied braucht noch **drei Erz** fuer die naechste Stufe.
- Der Wiederaufbau steht bei **zwei von drei**.
- Morgen ist die **Ernte reif**.

**Wer das Spiel oeffnet und sofort drei Dinge sieht, die KURZ VOR DEM ZIEL stehen,
hoert nicht mehr auf. Wer nichts Offenes sieht, macht es zu.**

## A3. DER VERSCHNAUF-BILDSCHIRM  [billig] [OPUS] - Autorwunsch

**Problem (vom Autor erkannt):** Eine unfertige Sache, die man VERGISST, zieht nicht.
Sie zieht nur, wenn man sie SIEHT.

**Aber Vorsicht vor der naheliegenden Loesung:** Zwoelf Zeilen in einer Liste = eine
Aufgabenverwaltung. Die schiebt man vor sich her, statt sie zu wollen.

**Zwei GETRENNTE Dinge (beide halb vorhanden):**

1. **Das JOURNAL ist fuer AUFTRAEGE** - Quests, Story, was der Graf will.
   Laeuft bereits ueber `logbuch()` und `QuestTracker`. **Kein Holzzaehler hier drin.**

2. **Der VERSCHNAUF-BILDSCHIRM** - kein Fenster, das man oeffnet, sondern etwas, das
   einen **ANSPRINGT, wenn man zurueck ins Dorf kommt.**
   Genau der Moment, in dem man entscheidet: Kaufe ich Traenke und gehe wieder runter,
   oder mache ich Schluss?

**Inhalt: DREI bis VIER Zeilen. Mehr nicht.**
- Nur, was **KURZ VOR FERTIG** ist. Alles Ferne bleibt draussen.
- Jede Zeile **anklickbar**, fuehrt zu der Person, die es weiterbringt.
- 20 Eintraege = Buchhaltung. 3 Zeilen = "ach komm, das eine noch".

**Warum es so stark wirkt: Es faengt den Spieler genau an der Schwelle ab, an der er
sonst aufhoeren wuerde.**

Reiner OPUS-Job - Dorfkasse, Dorf-Lager, Aufbaustufe, Feldwachstum, Schmiede-
Fortschritt sind alle schon im Zustand. Sie muessen nur eingesammelt werden.

## A4. Welle und Atempause  [Design-Prinzip]

Der Rhythmus, den der Autor beschreibt: **Nacht kommt, Horde kommt, du haeltst gerade
so. Dann Ruhe. In der Ruhe baust du aus, rekrutierst, verstaerkst. Dann die naechste
Welle, groesser.**

Anspannung -> Erleichterung -> Vorbereitung -> Anspannung.
(Das ist das AoE-Gefuehl, wenn man den Angriff kommen sieht.)

**Er braucht drei Dinge:**
1. Die Welle muss **ANGEKUENDIGT** sein (du siehst sie kommen, du hast Zeit, dich zu
   fuerchten). -> Verbindet sich mit der **unsicheren Aufklaerung**!
2. Sie muss **KNAPP** ausgehen (nicht ueberrollen, nicht durchwinken).
3. Danach muss **SICHTBAR** etwas besser sein als vorher.

## A5. Meisterschaft statt Beute-Automat  [Grundsatzentscheidung]

**Der billigste Weg zur Suchtwirkung ist die Zufallsbeute** - der Slot-Machine-Effekt.
Er funktioniert, aber er ist der **ungesunde Zwilling**, und er haelt Leute am
Bildschirm, die eigentlich nicht mehr da sein wollen.

**Dieses Spiel hat etwas Besseres:** ein Kampfsystem mit Parade, Riposte, Telegraphen
und Waffen-Movesets. **Das traegt MEISTERSCHAFT** - der Motor, der Leute FREIWILLIG
wiederkommen laesst, statt sie festzuhalten.

> Diablo lebt vom Automaten, Dark Souls von der Meisterschaft.
> **Dieses Spiel hat die Knochen fuer beides - das Gewicht gehoert klar auf
> Meisterschaft, die Beute ist Wuerze, nicht Motor.**

(Autorformulierung: "als Anreiz, besser zu werden" - genau das.)

## A6. Namen, die sterben koennen  [der staerkste Hebel]

Siehe Dok 03, Punkt 7. **Verlust wiegt psychologisch schwerer als Gewinn.**
Und dieser Hebel ist EHRLICH, weil er auf BEDEUTUNG beruht, nicht auf einem
Zufallsgenerator.

## A7. Die Welt muss den Fussabdruck zeigen  [halb vorhanden]

Das Gehoeft steht wieder. Die Palisade ist da. Neue Handwerker sind eingezogen.
Geraeumte Ebenen bleiben geraeumt (`geleert` existiert).

**Wer nach vierzig Stunden zurueckblickt und sieht, was er veraendert hat, will
weitermachen.**

## A8. Die naechste Sprosse muss sichtbar sein  [billig]

- Der Schmied ZEIGT die naechste Stufe, die er koennte, wenn du das Erz braechtest.
- Die Karte ZEIGT den Norden, den du noch nicht betreten kannst.

**Nie ein Nebel ohne Umriss.**

## A9. AUSDRUECKLICH NICHT (ungesunde Mechaniken)

- Tageszeit-Belohnungen an der ECHTEN Uhr
- Verpassbare Zeitfenster
- Endlose Zahlen-Treppen ohne Ende

**Das sind die Mechaniken, die aus Spielen Pflichten machen.
Dieses Spiel hat einen Anfang, eine Mitte und ein Ende - das soll es behalten.**

---

# TEIL B - DER DUNGEON-GENERATOR

## B1. Die Diagnose

Der aktuelle Generator ist ein organischer Blob (Zellulaerautomat) - ein
zusammenhaengender begehbarer Klumpen. Deshalb: keine Raeume, keine Struktur,
"alles durcheinander".

## B2. Was gewollt ist (nach mehreren Iterationen praezisiert)

**Ein KERKER** - keine Hoehle, kein zweiter Modus, kein Regler.
Die Flaeche ist **lueckenlos mit aneinandergrenzenden, gemauerten Raeumen gefuellt**,
kaum tote Wandmasse, keine langen Gaenge durch Leere.
**Innerhalb der einen Karte** wechseln sich grosse und kleine Raeume ab - Saal neben
Zellen-Cluster. Die "Weite" entsteht durch grosse Raeume, nicht durch eine hoehlenartige Zone.

## B3. Der Algorithmus: Rekursive Flaechenteilung  [FABLE]

Die Flaeche wird rekursiv zerschnitten, bis lauter raumgrosse Stuecke bleiben.
**Jedes Stueck IST ein Raum** -> sie fuellen lueckenlos, weil sie durch TEILUNG
entstanden sind, nicht durch Streuen.

**Die gemischten Groessen entstehen aus zwei Stellen:**
1. Der **Schnitt liegt NIE in der Mitte**, sondern zufaellig im erlaubten Bereich
2. Eine **`stopChance`** laesst manche grossen Stuecke stehen (Saele), waehrend andere
   tief zerteilt werden (Zellen-Cluster)

Wand = nur die duenne Trennlinie zwischen zwei Raeumen. Tueren werden hineingeschlagen.
Erreichbarkeit ueber Spanning Tree + 15-25% Extra-Tueren (Schleifen).

**Abgekapselte Vaults:** 3-6 Raeume mit GENAU EINER Tuer, sonst von Wand umschlossen.
Teils als Geheimtuer.

Detaillierter Spec: `kerker-map-generator-spec.md`

## B4. SETPIECES - die groesste Perle  [FABLE - gehoert IN den Spec]

**Aus dem Diablo-Dokument, Kapitel 4.4. Das ist die Antwort auf das Dungeon-Problem.**

Ein Setpiece ist ein **HANDGEBAUTER Raum, der in den zufaelligen Grundriss eingesetzt
wird**. Nicht generiert - GEBAUT.

**Damit loest sich der Widerspruch:** zufaellige Dungeons UND Raeume, die die Geschichte
erzaehlen.

**Diese Raeume duerfen KEINE Wuerfelergebnisse sein:**
- Die Leichenkammer (Sammlung)
- Die Aushoehlungskammer (Schlachterwerkzeuge)
- Die Reifehalle (schlafende, reanimierte Koerper)
- Der Bindealtar
- Der Blutstrom-Gang vor dem Boss
- Der Insel-Raum mit dem Stadtportal (ab Ebene 3)
- Die Zellen mit den Gefangenen

**Aenderung am Generator:**
Er platziert **ZUERST die Setpieces** (mit ihren geforderten Anschluessen),
**DANN fuellt er den Rest** mit zufaelligen Raeumen auf.

-> Story-Raeume garantiert auf jeder Ebene, drumherum echte Abwechslung.
**Das ist der Punkt, an dem der Dungeon aufhoert, generiert zu WIRKEN.**

```
interface SetPiece {
  width: number; height: number;
  requiredConnections: Direction[];
  cells: SetPieceCell[];
  scriptedObjects: ScriptedObject[];
}
```

## B5. Verschiedene Ebenen, verschiedene Generatoren  [billig]

Aus demselben Dokument (4.1): **Verschiedene Bereiche duerfen verschiedene Generatoren
verwenden.** Kathedrale rechtwinklig, Hoehle organisch.

-> **Kein Regler zwischen zwei Modi INNERHALB einer Karte** (das war ein Irrweg),
sondern **verschiedene EBENEN mit verschiedenen Bauprinzipien**.
- Die Erz-Hoehle: Hoehlen-Generator (organisch)
- Der Kerker: Raum-Generator (rechtwinklig)
- Der Blob-Generator bleibt fuer Passagen/Hoehlen nutzbar

## B6. Reihenfolge der Bevoelkerung (Diablo-Dok 4.5)  [billig]

**Erst Geometrie, dann Inhalt:**
1. Geometrie → 2. Tueren und Treppen → 3. Setpieces/Questbereiche →
4. Monstergruppen → 5. Fallen → 6. Behaelter → 7. Lose Gegenstaende →
8. Lichtquellen → 9. Dekoration

**Monster NICHT direkt neben dem Eintrittspunkt.** Sie duerfen notwendige Uebergaenge
nicht vollstaendig blockieren.

## B7. Erreichbarkeit pruefen  [billig]
Flood-Fill nach der Erzeugung. Eingang, Ausgang, Questziel, Bossraum, Setpieces
MUESSEN erreichbar sein. Sonst reparieren.

---

# TEIL C - DIE UMSETZUNGSREIHENFOLGE

## C1. Modell-Zuordnung (Regel)

| | OPUS | FABLE |
|---|------|-------|
| **Wofuer** | verifizierbar, Pattern-Copying, Screenshot-pruefbar | neuartig, hoher Blast-Radius, schwer verifizierbar |
| **Beispiele** | Bug-Fixes, Placement, Menues, Items nach Muster, Maps nach Vorlage, Effekte | neue Architektur-Systeme, Generator, Roster/Persistenz, Wirtschaftskopplung |

**Fable ist das knappe Gut. Nicht fuer Text und nicht fuer Verifizierbares verbrennen.**

**Das Design-Denken passiert im CHAT** (kostet kein Code-Budget). Fable bekommt einen
fertigen Spec und implementiert nur noch. Der teure Teil einer neuartigen Architektur
ist das ENTSCHEIDEN, nicht das Tippen.

## C2. SOFORT (billig, OPUS, hoher Ertrag)

1. **K1: Baukosten aus dem Dorf-Lager** (Dok 03, 1.1) - der Kern-Designfehler
2. **Verschnauf-Bildschirm** (A3)
3. **Moral entscheidet Kaempfe** (Dok 03, 1.2) - Konstanten existieren
4. **Bewegung und Ziel trennen** (Dok 03, 1.3)
5. **Ziel-Sperrzeit** (Dok 03, 1.4) - vermutlich ein Bug
6. **Angriffs-Slots** (Dok 03, 1.5) - vermutlich ein Bug
7. **Schadensarten + Konter-Matrix + Float-Feedback** (Dok 02, 2-4)
8. **Ausruestungsplaetze** (Helm/Handschuhe/Stiefel) (Dok 02, 8)
9. **Waehrung: Pfennig/Gulden** (Dok 02, 7)
10. **Schmied: Aufwerten, Sockeln, Schrott ankaufen** (Dok 02, 6-7)
11. **Portalrollen ab Ebene 3** (Dok 02, 16)
12. **Erz-Hoehle als erste Mission** (existiert als Plan)
13. **Namen fuer ALLE NPCs** (billig, wirkt stark)
14. **Spawn-Budget statt Gegnerzahl** (Dok 02, 10)
15. **Tueren schliessbar machen** (Dok 02, 11)
16. **Dorfkarte: Grundriss uebertragen** (Prompt existiert)

## C3. FABLE-SITZUNGEN (in dieser Reihenfolge)

**Sitzung 1: Kriegswirtschaft & Nachschub** (Dok 03, 2.5-2.6)
Feld-Depot, 3-Zahlen-Abstraktion, Konvoi, Versorgung/Moral, Kriegswirtschaft-Schalter.
Behebt das Fundament. **Wenn nur EINE Sitzung bleibt: diese.**

**Sitzung 2: Persistente Armee & Rekrutierung** (Dok 03, 2.1-2.4)
Roster ueber Kartenwechsel + Save, Veteranen (RTS_RANG verdrahten), Rekrutierung
kostet Bauern/Waffen/Gold, Verstaerkung aus dem Roster.
**MUSS nach S1** (Rekrutierung braucht die Ressourcenkette) **und die Persistenz muss
VOR der Rekrutierung** (sonst rekrutiert man Soldaten, die beim Kartenwechsel verschwinden).

**Sitzung 3: Kerker-Map-Generator + Setpieces** (Teil B)
Rekursive Flaechenteilung, Setpieces zuerst platzieren, dann auffuellen.
Raum-Rollen, Vaults, Blut-Progression.

Volle Prompts: `fable-drei-sitzungen.md` + `kerker-map-generator-spec.md`
(**Der Kerker-Spec muss noch um SETPIECES ergaenzt werden** - siehe B4.)

## C4. DANACH (mittel)

- Gefaehrten-Gruppe (Dok 03, 6) - die fehlende Mittelstufe
- Drei Verhaltens-Achsen (Dok 03, 1.7)
- Sets (Dok 02, 9)
- Untoten-Herkunft mit Beschreibung/Loot (Dok 02, 10)
- Truppen-Persoenlichkeit Stufe 1+2 (Dok 03, 7)
- Beförderung im Feld (Dok 01, 8)
- Monster-Rollen (Dok 02, 10)
- Akt 2b: Der Graf wird angegriffen (Dok 01, 5)
- Engstellen-Kompression, Formations-Abstand (Dok 03, 1.8-1.9)
- XCOM-Bereitschaft (Dok 02, 14)
- Dauerhafte Verletzungen (Dok 02, 13)

## C5. DAS EINE TEURE SYSTEM (naechste grosse Wahl)

**UNSICHERE AUFKLAERUNG** (Dok 03, 3.1)
Der Autor will die WAHL haben, es als Naechstes anzugehen. Es ist markiert und bereit.

## C6. SPAETER

- Schlachtfeld-Bergung (Dok 03, 4.1)
- Wiederkehrende Feinde / Nemesis light (Dok 02, 15)
- Gezeichnete Formationslinien mit Tiefe (Dok 03, 4.2)
- Belagerungsgeraet (Dok 03, 4.4)
- Zweites Dorf mit den fehlenden Handwerkern (Weberin, Gerber, Kuefer, Bader)

---

# TEIL D - ARBEITSREGELN (aus der Zusammenarbeit)

- **Held farmt, NPCs refinen.** Architektur-Regel, gilt bis ins Endgame (Schmied
  wertet sogar Set-Teile auf).
- **Kein Stamina-System.** Permanent abgelehnt.
- **Keine Armbrueste** in der Heereszusammensetzung.
- Jede Map ist eine **WorldScene Area** (erbt HUD, Save, Licht, Uebergaenge).
  Isolierte Szenen sind verboten.
- Der Dungeon (`dark:true`) hat einen eigenen Renderpfad - **nie von Overworld-
  Aenderungen anfassen lassen**.
- Claude Code muss **Optionen vorlegen**, bevor es eine neue Map oder einen neuen
  Dungeon anlegt.
- Kleine, verifizierte Schritte mit Halt-Punkten. Lieber melden als fabrizieren.
- Deutsch, Bindestrich statt Gedankenstrich, keine Schmeichelei.

---
---

# NACHTRAG (Sitzung 2)

## A10. Der Notaufnahme-Effekt ist der KERN [Design-Prinzip]

Der beste Einfall des Autors, hier nochmal in voller Schaerfe:

> *"Vielleicht komme ich mit meiner Armee und den Palisaden nicht weiter und muss schnell
> zurueck und die Leute im Dorf befehligen, mehr Baeume zu faellen, weil an der Front das
> Holz fuer Palisaden ausgeht."*

**Damit wird die Dorfwirtschaft von einer NEBENBESCHAEFTIGUNG zur NOTAUFNAHME.**

Holzhacken ist stinklangweilig.
**Holzhacken, weil heute Nacht die Palisade faellt, ist es nicht.**

**Die Regel dahinter: NIE eine Sackgasse, immer nur TEURE Auswege.**

Kein Holz mehr?
- Reiss das abgebrannte Gehoeft ab und nimm die Balken
- Kauf beim Haendler zum Wucherpreis
- Schick Bauern in den Wald - dann stehen sie nicht auf dem Feld, und in drei Tagen
  fehlt das Brot
- **Ueberfalle den Nachschub des Feindes** (Sunzi: 20x so viel wert)

**Jeder Ausweg kostet woanders.**

> **Das ist der Unterschied zwischen HART und FRUSTRIEREND:**
> **Hart heisst, jede Option tut weh. Frustrierend heisst, es gibt keine.**

## B8. SETPIECES - die groesste Perle [gehoert IN den Kerker-Spec]

**Aus dem Diablo-Dokument, Kapitel 4.4.** Ein Setpiece ist ein **HANDGEBAUTER Raum, der
in den zufaelligen Grundriss eingesetzt wird.** Nicht generiert - GEBAUT.

**Damit loest sich der Widerspruch:** zufaellige Dungeons UND Raeume, die die Geschichte
erzaehlen.

Diese Raeume duerfen KEINE Wuerfelergebnisse sein:
- Die Leichenkammer (Sammlung)
- Die Aushoehlungskammer (Schlachterwerkzeuge)
- Die Reifehalle (schlafende, reanimierte Koerper)
- Der Bindealtar
- Der Blutstrom-Gang vor dem Boss
- **Der Insel-Raum mit dem Stadtportal** (ab Ebene 3)
- Die Zellen mit den Gefangenen

**Aenderung am Generator:**
Er platziert **ZUERST die Setpieces** (mit ihren geforderten Anschluessen), **DANN fuellt
er den Rest** mit zufaelligen Raeumen auf.

→ Story-Raeume garantiert auf jeder Ebene, drumherum echte Abwechslung.
**Das ist der Punkt, an dem der Dungeon aufhoert, GENERIERT zu wirken.**

## B9. Verschiedene EBENEN, verschiedene Generatoren [billig]

Nicht ein Regler zwischen zwei Modi INNERHALB einer Karte (das war ein Irrweg), sondern
**verschiedene Ebenen mit verschiedenen Bauprinzipien**:
- **Erz-Hoehle:** Hoehlen-Generator (organisch)
- **Kerker:** Raum-Generator (rechtwinklig, rekursive Flaechenteilung)
- Der alte Blob-Generator bleibt fuer Passagen nutzbar

## C7. DIE VOLLSTAENDIGE REIHENFOLGE (siehe Dok 05, Teil C)

Die Reihenfolge in Dok 05 ist **nicht nach "was ist am coolsten" sortiert, sondern nach
ABHAENGIGKEITEN.** Wer sie umstellt, baut Nacharbeit ein.

Die kritischste Abhaengigkeit:
**Roster-Persistenz MIT `gefallen`-Status MUSS vor der Rekrutierung kommen.**
Sonst rekrutiert man Soldaten, die an der naechsten Kartenkante verschwinden - und das
ganze "Gefallene stehen beim Feind auf"-System ist unmoeglich.

## D2. EHRLICHE WARNUNG ZUM UMFANG

Auf dem Tisch liegen jetzt ueber dreissig Systeme. Jedes fuer sich verlockend.
**Wer sie alle nimmt, hat in zwei Jahren ein beeindruckendes Design-Dokument und kein
Spiel.**

> **Ein Solo-Dev stirbt nicht an schlechten Ideen, sondern an zu vielen guten.**

Der Unterschied zwischen einem beeindruckenden Design und einem fertigen Spiel ist nicht
die Qualitaet der Ideen, sondern die **Bereitschaft, sie in eine Reihenfolge zu zwingen
und die ersten drei wirklich zu bauen, bevor man die vierte anfasst.**

Deshalb: **Dok 05, Teil C.** Stufe fuer Stufe.
