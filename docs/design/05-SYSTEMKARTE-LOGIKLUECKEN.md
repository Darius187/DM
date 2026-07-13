# 05 - SYSTEMKARTE & LOGIKLUECKEN

**Das wichtigste Dokument.** Es beantwortet nicht "was gibt es", sondern
"was haengt woran" und "wo bricht es, wenn man nicht aufpasst".

Wer ein System anfasst, ohne seine Kopplungen zu kennen, baut Bugs, die spaeter teuer
sind. Diese Datei existiert, damit das nicht passiert.

---

# TEIL A - DIE SYSTEMKARTE

## A1. Der zentrale Kreislauf (alles haengt hier dran)

```
                          ┌─────────────────────────────────┐
                          │                                 │
                          ▼                                 │
   HELD FARMT ──────► DORF-LAGER ──────► NPCs REFINEN ─────┤
   (Erz, Holz,         (dorfLager)        (Schmied, Muellr, │
    Stein, Kraeuter)        │              Baecker, Zimmer.) │
        ▲                   │                     │          │
        │                   ▼                     ▼          │
        │             FELD-DEPOT           WAFFEN + BROT     │
        │            (3 Zahlen:            + WERKZEUG        │
        │             Baumaterial,               │           │
        │             Proviant,                  │           │
        │             Sanitaet)                  ▼           │
        │                   │              REKRUTIERUNG      │
        │                   │              (kostet Waffe +   │
        │                   ▼               Gold + BAUER)    │
        │            FELDBAUTEN                  │           │
        │            (Palisade, Turm)            ▼           │
        │                   │                 ARMEE ─────────┘
        │                   │              (Roster, persistent)
        │                   ▼                    │
        └────────── SCHLACHT ◄───────────────────┘
                       │
                       ├──► Gefallene (deine) ──► stehen beim FEIND auf
                       ├──► Beute-Deko am Boden ──► BERGUNG ──► Dorf-Lager
                       └──► Moral entscheidet ──► Sieg oder Flucht
```

**Die Kernaussage:** Es gibt keinen Teil dieses Spiels, der isoliert steht. Wer den
Dungeon anfasst, faesst die Wirtschaft an. Wer die Wirtschaft anfasst, faesst das Heer an.

---

## A2. Alle Kopplungen im Detail

### K1 - DORF-LAGER ist der zentrale Knoten
Was hineingeht: Held-Farming, NPC-Produktion, Schlachtfeld-Bergung, Schrott-Ankauf
Was herausgeht: Feld-Depot (Konvoi), Schmiede-Aufwertung, Rekrutierung, Wiederaufbau,
Essen der Bewohner, Abgabe an den Grafen

**GEFAHR:** Sechs Systeme ziehen aus demselben Topf. Wenn eines zu gierig ist, verhungern
die anderen. Es braucht EINE Lager-Schnittstelle (`lagerRein` / `lagerRaus` existieren
bereits) - **nie direkt auf `dorfLager` schreiben.**

### K2 - MORAL hat vier Quellen (MUSS eine Formel sein)
1. Standarte / Anfuehrer in Reichweite (Aura, siehe K8)
2. Verluste, Flanke, Einkesselung, Bannerverlust (Total War)
3. Proviant im Feld-Depot (Nachschub)
4. Tageszeit (Sunzi: morgens scharf, abends muede)

**GEFAHR:** Wenn vier Systeme unabhaengig an der Moral drehen, entsteht Chaos und
Bug-Jagd. Es gibt **EINE Funktion** `berechneMoral(einheit)`, die alle Summanden sammelt.
Kein System aendert Moral direkt.

### K3 - TAGS sind die gemeinsame Sprache von Monster-Resistenz UND RTS-Konter
Dieselbe Tabelle bedient beides. Ein Skelett hat den Tag `knochen`; Wucht macht
gegen `knochen` doppelten Schaden - egal ob im Dungeon oder in der Feldschlacht.

**Das ist die wichtigste Vereinfachung im ganzen Design.** Einmal bauen, zweimal nutzen.

### K4 - UNTOTEN-HERKUNFT steuert vier Dinge gleichzeitig
Herkunft (Bauer/Handwerker/Kaufmann/Soldat/Ritter) bestimmt:
1. Aussehen (Sprite, Kleidung)
2. Kampfkraft (HP, Schaden, Ruestung)
3. Beute-Tabelle
4. Spawn-Budget-Kosten (Bauer = 1 Punkt, Ritter = 4)
5. Beschreibungstext beim Anklicken

**GEFAHR:** Wenn das an fuenf Stellen definiert wird, driftet es auseinander.
**EIN Datensatz pro Herkunft** (siehe `src/data/untote.ts`).

### K5 - DIE GEFALLENEN (die staerkste Kopplung im Spiel)
```
Dein Soldat (Roster-Eintrag: Name, Rang, Ausruestung)
  faellt in der Schlacht
    │
    ├── Du BEERDIGST ihn (kostet Zeit, gibt Moral)  ──► endgueltig weg
    │
    └── Du laesst ihn liegen
          │
          └── Der Feind stellt ihn wieder auf
                │
                └── Er kommt zurueck: gleicher Name, gleiches Wams (verranzt),
                    gleiche Raenge, deine Ausruestung
```
**Was das koppelt:** Armee-Roster ↔ Feind-Spawner ↔ Bergungs-System ↔ Sprite-System ↔
Moral (deine Maenner sehen ihren toten Kameraden).

**TECHNISCHE FOLGE:** Der Feind-Spawner braucht Zugriff auf gefallene Roster-Eintraege.
Das heisst: **Ein Gefallener wird NICHT sofort geloescht**, sondern bekommt den Status
`gefallen` und bleibt im Datenmodell, bis er entweder beerdigt oder wieder aufgestellt wird.
**Das MUSS im Roster von Anfang an mitgedacht werden** - sonst muss man es teuer nachruesten.

### K6 - BEVOELKERUNG wird von ZWEI Systemen belastet (GEFAHR: doppelte Strafe)
1. Rekrutierung: Bauer wird Soldat -> weniger Produktion
2. Kriegswirtschaft: Bauern arbeiten anders -> andere Produktion

**Das darf sich nicht doppelt bestrafen.** Loesung: **EIN Bevoelkerungs-Zaehler.**
Rekrutierung senkt ihn. Kriegswirtschaft aendert nur, WAS produziert wird, nicht WIE VIEL
Arbeitskraft da ist. (Und dazu: eigene Zufriedenheit, die bei langer Kriegswirtschaft sinkt.)

### K7 - SICHT ist ein einziges System mit drei Nutzern
1. Dungeon: Fackeln, Lichtradius, Kriegsnebel
2. Overworld: Tag/Nacht, Wetter, Nebel
3. RTS: Aufklaerung, Wachturm, Spaeher

**GEFAHR:** Wenn Tag/Nacht die Sicht senkt und die Aufklaerung eine eigene Sichtrechnung
hat, widersprechen sie sich.
**Loesung:** EINE Sicht-Funktion `sichtweite(beobachter, zeit, wetter)`. Fackeln erhoehen
sie - **und verraten gleichzeitig die eigene Position** (das ist eine Mechanik, kein Bug).

### K8 - AUREN brauchen eine BEFEHLSKETTE (sonst sind sie Magie)
Eine Aura wirkt nicht ueberall. Sie braucht:
- Entfernung zum Traeger
- Sichtkontakt zum Banner ODER Hoerweite (Horn, Trommel)
- Der Traeger muss LEBEN und bei Bewusstsein sein

**Faellt der Hauptmann oder wird das Banner erobert, verschwindet die Aura.**
Das koppelt: Aura ↔ Moral ↔ Sicht ↔ Ziel-Prioritaet des Feindes (Banner sind Ziele).

### K9 - DER SCHMIED zieht aus vier Richtungen
1. Erz vom Helden (Mine)
2. Schrott vom Helden (Muellabfuhr)
3. Barren aus der Dorf-Schmelze
4. Kohle vom Koehler

Und produziert in drei Richtungen:
1. Waffen-Aufwertung fuer den Helden (Item-Stufe)
2. Sockel schlagen (Edelsteine -> Elementareffekte)
3. Standardwaffen ins Dorf-Lager (Rekruten-Bewaffnung)

**Alles ueber `dorfLager`.** Der Schmied hat KEIN eigenes Inventar.

### K10 - PORTAL, VERSCHNAUF-BILDSCHIRM und DIE DREI UHREN
```
Krypta (Minuten-Uhr) --Portalrolle--> Dorf
                                        │
                                        ▼
                            VERSCHNAUF-BILDSCHIRM
                            "Schmied braucht 3 Erz"
                            "Palisade fehlt 12 Holz"
                            "Ernte morgen reif"
                                        │
                                        ▼
                            Spieler stoesst 3 Dinge an
                                        │
                                        ▼
                            Geht wieder runter (Stunden-Uhr)
                                        │
                            Waehrenddessen laeuft die Tage-Uhr
```
**Ohne Portal ist die Schleife zu zaeh. Ohne Verschnauf-Bildschirm vergisst man,
was offen ist. Beide zusammen sind der Motor.**

---

# TEIL B - GEFUNDENE LOGIKLUECKEN (und ihre Loesung)

## L1 - KEINE REITER bricht das Konter-Dreieck ❗ KRITISCH

**Das Problem:** Das AoE-Konter-System steht auf Kavallerie (Speer schlaegt Reiter,
Reiter schlaegt Bogen, Bogen schlaegt Speer). Ohne Reiter bleibt ein Zweieck.
Betroffen sind ausserdem: Speerwall-Bereitschaft (war gegen die Charge gedacht),
Keil-Formation (Kavallerie-Werkzeug), Machtspitze "erstes Kriegspferd".

**Die Loesung (besser als das Original):** Das Dreieck laeuft ueber
**SCHNITT / STICH / WUCHT** - das existiert schon in den Movesets.

```
        SCHILD / PANZER  (Blocker: haelt Fernkampf und Schnitt, aber langsam)
              ▲   │
        Wucht │   │ Stich durchbricht
    zerschmet.│   ▼
        SCHWARM ◄──── FERNKAMPF (maeht Massen nieder,
     (viele Schwache,               verliert gegen Schild)
      ueberrennen Einzelne)
```

Konkret:
- **Schildtraeger** blockt Pfeile und Schnitt -> aber der **Stich** (Hellebarde, Speer)
  findet die Luecken im Harnisch
- **Stangenwaffen** sind stark gegen Gepanzerte -> aber unhandlich gegen **Schwaerme**
  (schlechte Angriffsrate gegen viele)
- **Schwarm** ueberrennt einzelne Stangenkaempfer -> wird aber von **Fernkampf** und
  **Flaechenangriffen** (Wucht/AoE) niedergemaeht
- **Fernkampf** maeht Massen -> verliert gegen **Schildtraeger** (Pfeile prallen ab)

**Das ist ein vollstaendiges Dreieck, es steht auf den HEMA-Wurzeln des Spiels, und
Reiter docken spaeter an, ohne dass etwas umgebaut werden muss** (sie kommen als
schneller Flankierer, der Fernkaempfer erreicht).

**Was ausdruecklich NICHT gebaut wird (bis Reiter existieren):**
- Speerwall/Brace gegen Charge
- Keil als Kavallerie-Formation (der Keil bleibt, aber als Durchbruchs-Geometrie)
- "Erstes Kriegspferd" als Machtspitze -> ersetzt durch "Erster Hauptmann-Rang"

---

## L2 - Learning-by-doing macht jeden Helden allmaechtig

**Das Problem:** 9 Stufen je Schule, automatische Freischaltung durch Benutzung.
Am Ende kann JEDER Held ALLES. Keine Entscheidung, kein Verzicht, keine Build-Identitaet.

**Die Loesung (zwei Massnahmen, beide billig):**
1. **Erfahrung relativ zur Gegnerstaerke** (aus Dungeon Siege): Schwache Gegner geben
   kaum Fortschritt. Verhindert Ratten-Grinding.
2. **Hybride spezialisieren LANGSAMER.** Die Kurve so setzen, dass volle Meisterschaft
   in allen drei Schulen in EINEM Durchgang NICHT erreichbar ist.

**Folge:** Der Spieler waehlt implizit einen Build, indem er spielt. Die SETS (Kreuzritter/
Jaeger/Kloster) verstaerken diese Wahl. **Das loest zwei Probleme mit einer Massnahme.**

---

## L3 - Sets duerfen das Loot-System nicht toeten

**Das Problem:** Wenn ein Set einfach staerker ist als alles, wird jeder Einzelfund wertlos.

**Die Loesung:** **Ein Set ist ANDERS, nicht besser. Es ist eine ROLLE.**
- Kreuzritter: stark gegen Untote, schwer, langsam
- Jaeger: Bogen, leicht, schnell
- Kloster: Magie und Mana, schwache Ruestung

Einzelfunde koennen in ihrer Nische besser sein. Sets leveln NICHT mit - **der Schmied
wertet Set-Teile auf** (das haelt "Held farmt, NPCs refinen" bis ins Endgame).

---

## L4 - Doppelte Bevoelkerungs-Strafe (siehe K6)
Geloest durch EINEN Zaehler.

---

## L5 - Die Gefallenen brauchen Roster-Persistenz VOR der Rekrutierung ❗

**Das Problem:** In `unloadAreaObjects()` wird die Schlacht bei jedem Kartenwechsel
zerstoert (`rtsBattle.destroy()`). Wer Rekrutierung baut, bevor das Roster persistent ist,
rekrutiert Soldaten, die an der naechsten Kartenkante verschwinden.

**Und schlimmer:** Das ganze "Gefallene stehen beim Feind auf"-System (K5) braucht
persistente Identitaeten. Ohne Roster ist es unmoeglich.

**Die Loesung: REIHENFOLGE.**
1. Roster persistent machen (mit `gefallen`-Status!)
2. DANN Veteranen
3. DANN Rekrutierung
4. DANN "die Gefallenen stehen auf"

**Der urspruengliche K1-K8-Plan hatte Persistenz auf Platz 7 - das ist eine
Abhaengigkeits-Umkehr und haette teuer nachgeruestet werden muessen.**

---

## L6 - Moral aus vier Quellen (siehe K2)
Geloest durch EINE Formel.

---

## L7 - Der Blocker-Bug: Angriffs-Slots fehlen

**Das Problem:** 20 Gegner stuermen denselben Punkt an, 3 kaempfen, 17 stehen ineinander.
**Zwei unabhaengige Quellen** (AoE-Dok und Diablo-Dok) empfehlen dieselbe Loesung.

**Die Loesung:** Angreifer bekommen einen **reservierten Platz am Kollisionsrand** des
Ziels. Kein Platz frei -> warten, anderes Ziel suchen, oder nachruecken.

**Das ist ein BUG-FIX, kein Feature.** Es ermoeglicht ausserdem Einkreisung.

---

## L8 - Ziel-Zappeln

**Das Problem:** `naechsterFeind()` rechnet jeden Frame neu. Ein minimal naeherer Gegner
laesst die Einheit umschalten -> sie zappelt zwischen zwei Zielen.
(Bei der Belagerung ist das mit `BELAGERUNG.neuBewertenS` schon geloest - im normalen
Kampf fehlt es.)

**Die Loesung:** Ziel 0,5-2 Sekunden festhalten. Wechsel nur bei: Ziel tot, unerreichbar,
Spielerbefehl, deutlich hoeher priorisiertes Ziel.

---

## L9 - Fackeln: Sicht-Gewinn UND Positions-Verrat

**Das Problem:** Wenn Fackeln nur die Sicht erhoehen, sind sie eine Gratis-Verbesserung.
**Die Loesung:** Sie erhoehen die eigene Sicht **und machen dich sichtbar**. Nachts mit
Fackel: du siehst mehr, aber der Feind sieht dich zuerst. Das ist eine ENTSCHEIDUNG.
(Koppelt an K7 und an die Aufklaerung.)

---

## L10 - Das Loch im Kessel (Sunzi)

**Das Problem:** Wenn eine vollstaendige Einkesselung nur Vorteile hat, ist sie ein
Automatismus ohne Entscheidung.
**Die Loesung (Sunzi, Kapitel VII):** Eine **vollstaendig umzingelte** Einheit flieht
NICHT - sie bekommt einen **Verzweiflungs-Bonus** und kaempft bis zum Tod.
Lass ein Loch, und sie flieht (billig zu besiegen). Schliesse den Kessel, und sie kostet dich.
**Gilt auch fuer DEINE Maenner.**

Eine Bedingung in der Moral-Formel. Macht das ganze System klueger.

---

## L11 - Spawn-Budget muss die Herkunft kennen

**Das Problem:** Das Spawn-Budget (Elite kostet 4, Skelett 1) und die Untoten-Herkunft
(Bauer/Soldat/Ritter) sind zwei Systeme, die dasselbe beschreiben.
**Die Loesung:** **Die Herkunft IST die Budget-Kosten.** Ein Datensatz.
Bauer = 1, Handwerker = 1, Kaufmann = 1, Soldat = 2, Ritter = 4, Monster-Held = 8.

---

## L12 - Verfluchte Waffen und Verletzungen

**Chance, kein Problem:** Eine verfluchte Waffe koennte ueber Zeit eine **dauerhafte
Verletzung** verursachen (z.B. der Arm wird taub). Das verbindet zwei Systeme und macht
den Fluch koerperlich statt nur numerisch.
Optional, aber es passt perfekt zum Thema "Der Preis".

---

## L13 - Setpieces und der Portal-Raum

Der Insel-Raum mit dem Stadtportal IST ein Setpiece. Er ist kein Sonderfall.
**Folge:** Der Kerker-Generator muss Setpieces koennen, BEVOR das Portal eingebaut wird.
Reihenfolge beachten.

---

## L14 - Aufklaerung geht in BEIDE Richtungen (Sunzi)

**Das Problem:** Wenn nur DU unsichere Meldungen bekommst, ist es ein Informations-Display.
**Die Loesung (Sunzi, Kapitel I: "Krieg ist Taeuschung"):** Der Feind bekommt seine
Informationen ueber DICH genauso unzuverlaessig - **und du kannst sie faelschen.**
- Lagerfeuer: mehr entzuenden (groesser wirken) oder weniger (schwaecher wirken)
- Banner zeigen oder verbergen
- Truppen sichtbar aufmarschieren oder im Wald halten

**Das verwandelt das Aufklaerungs-System von einem Display in ein DUELL.**
Kosten: eine Handvoll Schalter. Wert: verdoppelt.

---

---

## L15 - TAEUSCHUNG BRAUCHT EINEN FEIND, DER SICH TAEUSCHEN LAESST ❗ KRITISCH

**Das Problem (spaet gefunden, deshalb hier ausdruecklich):**

Die unsichere Aufklaerung (Stufe 6) hat zwei Haelften:
1. DU bekommst unsichere Meldungen ueber den Feind
2. Der Feind bekommt unsichere Meldungen ueber DICH - **und du kannst sie faelschen**
   (weniger Lagerfeuer, Banner verbergen, Truppen im Wald halten)

**Haelfte 2 funktioniert NICHT, solange der Feind keine strategische Entscheidungsschicht
hat.** Aktuell:
- Er greift an
- Er belagert die schwaechste Palisade (`BELAGERUNG`, Bresche-Fokus)
- Er nagt am Holz

**Er BEWERTET nichts.** Er kann nicht denken:
- "Die sind schwach - ich setze nach."
- "Das koennte eine Falle sein - ich warte."
- "Ihr Nachschub kommt von Sueden - ich schneide ihn ab."
- "Sie haben viele Feuer - ich greife nicht an."

**Sun Bins Lagerfeuer-Trick funktioniert nur, weil ein General auf der anderen Seite eine
ENTSCHEIDUNG trifft.** Ohne diese Schicht ist die Taeuschung ein Knopf ohne Wirkung.

**FOLGE:**
Stufe 6 ist **zwei Systeme, nicht eins**:
  6.0  Feind-Strategieschicht (bewertet gemeldete Lage, entscheidet: angreifen /
       warten / Nachschub schneiden / ausweichen)   <-- FEHLT KOMPLETT
  6.1  Unsichere Meldungen (beide Richtungen)
  6.2  Zeichen lesen
  6.3  Taeuschung

**Das ist der Grund, warum es das TEURE System ist - und warum es ganz ans Ende gehoert.**
Wenn das Fable-Budget vorher ausgeht, ist das kein Verlust: Ohne 6.0 waere die Aufklaerung
ohnehin nur zur Haelfte da.

---

## L16 - ABHAENGIGKEITEN DER VIER FABLE-AUFGABEN (Uebersicht)

| Fable-Aufgabe | Braucht vorher | Schaltet frei |
|---------------|----------------|---------------|
| **1. Roster-Persistenz** (mit `gefallen`-Status) | NICHTS - sofort moeglich | Veteranen, Rekrutierung, "Gefallene stehen auf", Bergung |
| **3. Kerker-Generator + Setpieces** | NICHTS - komplett eigenstaendig (braucht nur Tile-Enum + Editor) | Setpieces, Portal-Inselraum, Spawn-Budget |
| **2. Kriegswirtschaft + Nachschub** | **OPUS-VORARBEIT:** (a) K1 Baukosten auf `dorfLager` umstellen, (b) EINE Moral-Formel (sonst kann der Proviant nirgends einspeisen) | Konvois, Notaufnahme-Effekt, Kriegswirtschaft |
| **4. Unsichere Aufklaerung** | 2 (Konvois muessen existieren, um sie zu ueberfallen) + **6.0 Feind-Strategieschicht (L15)** | Das taktische Duell |

**EMPFOHLENE REIHENFOLGE:**
```
1. Roster-Persistenz            [FABLE]   - schaltet am meisten frei
2. Kerker-Generator + Setpieces [FABLE]   - unabhaengig, jederzeit
   (parallel: K1 + Moral-Formel [OPUS]    - Vorarbeit fuer Schritt 3)
3. Kriegswirtschaft + Nachschub [FABLE]
4. Aufklaerung + Feind-Strategie[FABLE]   - zuletzt, groesser als gedacht
```

---

---

## L17 - DER HELD MACHT DIE ARMEE UEBERFLUESSIG ❗ EXISTENZFRAGE

**Beobachtung des Autors:** "In den ersten Tests hat sich der Held durch die Schlacht
durchgeschnetzelt."

**Das ist kein Balance-Detail. Wenn der Held allein eine Armee besiegt, ist die ARMEE
DEKO - und Rekrutierung, Nachschub, Veteranen und Roster sind umsonst gebaut.**

**Vermutliche HAUPTURSACHE: L7 (fehlende Angriffs-Slots).**
Die Gegner stehen ineinander und nur 3 von 20 schlagen zu. Der Held ist nicht zu stark -
**die Gegner koennen ihn nur nicht erreichen.** Der Angriffs-Slot-Fix macht ihn
verwundbar, ohne einen einzigen Wert zu aendern.

**Fuenf Massnahmen (Details: Dok 06 Teil H):**
1. Feind-Truppen brauchen EIGENE, zaehere Werte (nicht Dungeon-Monster-Werte)
2. **Angriffs-Slots (L7)** - der Held wird umzingelbar
3. Moral bricht Einheiten, nicht der Held - er ist Katalysator, kein Vernichter
4. Zwei Fronten: er kann nur an EINEM Ort sein (Geografie loest, was Zahlen nicht loesen)
5. Zeit: eine Schlacht dauert Minuten. Er toetet 20, nicht 200.

**DIAGNOSE BESTAETIGT (Claude Code, Codeanalyse):**
- Kein Attacker-Cap, keine Angriffs-Slots. Von 20 Gegnern erreichen ~6-8 die erste Reihe,
  effektiv schlagen nur ~3-4 gleichzeitig zu.
- **Gegner kollidieren GAR NICHT mit dem Helden** (Enemy.ts:278-286 prueft nur Waende) -
  sie laufen durch ihn hindurch und stauen sich nur an sich selbst.
- Separation (CombatScene.separateEnemies) drueckt Gegner nur voneinander weg, nie vom
  Helden.
- **Rohwerte sind AUSGEWOGEN:** Bei 3 Angreifern stirbt der Held in 2,6s. Bei 15 waere es
  Sekundentod. **Er ueberlebt NUR, weil ihn niemand erreicht.**
- Urteil: ~70% Reichweiten-/Stau-Problem, ~30% Held-Design-Hebel, ~0% Rohwerte.

**❗ ZIEL-CAP FUER DEN HELDENSCHWUNG IST GESTRICHEN (Autor-Entscheidung):**
Claude Code schlug vor, den Rundumschlag auf 3-4 Ziele zu begrenzen (er trifft aktuell
unbegrenzt viele). **ABGELEHNT.** Ein Rundumschlag, der nur 4 von 10 Umstehenden trifft,
ist eine LUEGE - das Spiel zeigt eine Bewegung und rechnet eine andere. Das merkt der
Spieler, auch wenn er es nicht benennen kann. **Nicht bauen, nicht wieder vorschlagen.**
Die natuerliche Grenze des Helden sind FERNKAEMPFER: Wer in eine Formation rennt, waehrend
zwanzig Bogenschuetzen zielen, ist tot. Das ist der ehrliche Konter.

**KORRIGIERTE REIHENFOLGE (Massnahme 1 zuerst, sie ist vermutlich die Ursache):**
Die Testgegner auf der RTS-Karte haben vermutlich noch **Dungeon-Monster-Werte**
(Skelett, 25 HP) - fuer die RTS-Karte wurden nie eigene Gegnertypen definiert.
Ein SOLDAT in Formation ist etwas voellig anderes. **Erst die Feind-Truppen-Werte,
dann die Angriffs-Slots, dann neu bewerten.** Gut moeglich, dass sich das Problem
danach von selbst erledigt hat.

**NICHT tun:** Den Helden schwaechen (das ist der ARPG-Kern) oder Feinden HP geben,
bis es weh tut (macht Kaempfe zaeh statt taktisch). Und keinen Ziel-Cap.

---

## L18 - DIE UNTOTEN HATTEN KEINE LOGISTIK

**Das Problem:** Ohne Versorgungskette sind die Untoten eine NATURGEWALT. Und eine
Naturgewalt kann man nicht besiegen, nur ueberleben. Es gibt nichts anzugreifen ausser
der Horde selbst.

**Die Loesung (Dok 06 Teil A): BLUT IST IHRE VERSORGUNG.**
Untote essen nicht - **aber sie ZERFALLEN.** Blut erneuert sie. Blut kommt von Lebenden.

**Was das koppelt:**
- Blutlager im Feld = **die Konvois, die man ueberfaellt** (Sunzi: 20x Wert)
- Zerstoerte Blutlager → die Horde verliert HP, Raenge, Spawn-Rate
- Der Blutstrom im Kerker ist **keine Deko, sondern eine PRODUKTIONSANLAGE**
- Untoten-Berufe (Herkunft!) = ihre Wirtschaft: Zimmermann baut, Fuhrmann faehrt,
  Schmied flickt, Schinder hebt auf
- **Der Comeback-Mechanismus:** Der Schwaechere gewinnt, indem er die Versorgungslinien
  des Staerkeren zerschneidet

**Und es beantwortet die Sauron-Frage: Wofuer baut er die Armee?**
Fuer NACHSCHUB. Sie ueberfallen nicht aus Bosheit - **sie brauchen Blut.**
Ein Feind, der dich hasst, ist verstehbar. Ein Feind, der dich VERARBEITET, nicht.

---

## L19 - BEERDIGEN ALS KLICK-ORGIE (behoben)

**Das Problem (Autor):** "Bei 100 Gefallenen muss man ja 100 mal anklicken."
**Berechtigt. Der Denkfehler war, es als Handlung IM GEFECHT zu bauen.**

**Loesung:** Beerdigen ist eine **PHASE NACH DER SCHLACHT**, kein Klick.
- **Feld gehalten** → Bergungs-Phase (EIN Vorgang): Tote beerdigt, Ausruestung geborgen,
  Verwundete versorgt
- **Abgezogen** → die Toten bleiben liegen → **der Schinder holt sie**

**"Das Feld behalten" ist die ENTSCHEIDUNG, nicht das Klicken.**
Einzige Klick-Ausnahme: der Veteran im Gefecht → Befehlshaber-Faehigkeit "Verwundete
decken" (F5). Ein Mann, nicht hundert.

**FOLGE FUER DAS ROSTER (Fable-Auftrag 1):** Der `gefallen`-Status bleibt Pflicht.
Aber das BEERDIGEN gehoert in die Nachschlacht-Phase, nicht in den Kampf.

---

## L20 - WER ERWECKT DIE TOTEN? (war schwammig, jetzt geloest)

**Vorher:** "Der Feind stellt sie wieder auf" - aber WER, WIE, WANN?

**Jetzt: DER SCHINDER** (Abdecker - ein historisch "unehrlicher" Beruf, ein Mann, den
die Gesellschaft schon zu Lebzeiten unter die Toten gerechnet hat).
- **Selten** (1-2 je Schlacht)
- **Langsam, schwach** im Kampf
- Hebt nur auf, was **noch liegt** (nicht Geborgenes, nicht Beerdigtes)
- Braucht **Zeit** je Leiche
- Stellt die **Besten zuerst** auf (Veteranen)
- **ER IST DAS PRIORITAETSZIEL** → Sunzi: Die Horde ist nicht der Feind, der BINDER ist es

**Erste Begegnung im KERKER** (Lehrmoment ohne Erklaerdialog): Man erschlaegt zwanzig
Skelette, sie stehen wieder auf, man erschlaegt sie nochmal - **dann sieht man den Mann
im Hintergrund.**

**FOLGE FUER DEN ROSTER-AUFTRAG:** Die Erhebung braucht einen SCHINDER auf dem Feld.
Ohne Schinder keine Erhebung. Das ist eine Bedingung, kein Timer.

---

## L21 - FAEHNLEIN STATT EINZELSOLDATEN

**Das Problem:** 100 Einzelsoldaten zu befehligen ist unbedienbar, und die Moral-Formel
muesste 100x rechnen.

**Loesung:** 5-6 **FAEHNLEIN** zu je ~20 Mann. Jedes mit Name, Banner, Bannertraeger,
EINER Moral-Zahl, eigenem Rang und eigener Haltung.

**Was das loest:**
- Klick-Problem (6 statt 100)
- Auren werden sinnvoll (der Bannertraeger traegt sie - das Banner wird ein ZIEL)
- Verluste werden lesbar ("Das Faehnlein vom Osttor wankt")
- Moral = EINE Zahl je Einheit (siehe K2)
- Bannertraeger-Nachfolge: Faellt er, hebt der naechste das Banner auf - **aber es dauert.**
  Solange: keine Aura, Moral sinkt.

**FOLGE FUER DAS ROSTER:** Das Roster braucht eine **zweite Ebene**: Soldat → Faehnlein.
Das MUSS beim Bau von Fable-Auftrag 1 mitgedacht werden, sonst teure Nacharbeit.

---

# TEIL C - DIE REIHENFOLGE, DIE KEINE LUECKEN LAESST

Diese Reihenfolge ist NICHT nach "was ist am coolsten" sortiert, sondern nach
Abhaengigkeiten. Wer sie umstellt, baut Nacharbeit ein.

```
STUFE 1 - Fundamente (nichts haengt davon ab, aber alles baut darauf)
  1.1  Tag-System (Tags an Einheiten und Monstern)          [Datenschicht]
  1.2  Schadensarten (Schnitt/Stich/Wucht) an Waffen        [Datenschicht]
  1.3  Konter-Matrix (nutzt 1.1 + 1.2)                      [Datenschicht]
  1.4  EINE Moral-Formel (sammelt alle Summanden)           [Logik]
  1.5  EINE Sicht-Formel (Zeit, Wetter, Fackel)             [Logik]

STUFE 2 - Bug-Fixes (unabhaengig, sofort spuerbar)
  2.1  Angriffs-Slots (L7)
  2.2  Ziel-Sperrzeit (L8)
  2.3  Bewegung und Ziel trennen
  2.4  Engstellen-Kompression

STUFE 3 - Die Wirtschaftskette (Fundament fuer alles RTS)
  3.1  Baukosten aus dem Dorf-Lager (K1)
  3.2  Schmied: Aufwerten, Sockeln, Schrott (K9)
  3.3  Feld-Depot + Konvoi (3-Zahlen-Abstraktion)
  3.4  Kriegswirtschaft-Schalter
  3.5  EIN Bevoelkerungs-Zaehler (K6)

STUFE 4 - Die Armee (braucht Stufe 3)
  4.1  Roster persistent MIT `gefallen`-Status (L5!)
  4.2  Veteranen (RTS_RANG verdrahten)
  4.3  Rekrutierung (kostet Waffe + Gold + Bauer)
  4.4  Die Gefallenen stehen beim Feind auf (K5)
  4.5  Bergung + Beerdigen

STUFE 5 - Taktik-Schicht (braucht Stufe 1 + 4)
  5.1  Drei Verhaltens-Achsen (Bewegung/Angriff/Zielwahl)
  5.2  Auren mit Befehlskette (K8)
  5.3  Befehlshaber-Faehigkeiten des Helden
  5.4  Tag/Nacht als Regel (nutzt 1.5)
  5.5  Das Loch im Kessel (L10)

STUFE 6 - Das teure System  (ZWEI Systeme, nicht eins - siehe L15!)
  6.0  FEIND-STRATEGIESCHICHT (bewertet Lage, entscheidet)  <-- FEHLT, ist Pflicht
  6.1  Unsichere Aufklaerung (Meldungen mit Unsicherheit)
  6.2  Zeichen lesen statt Zahlen lesen (Sunzi IX)
  6.3  Taeuschung in beide Richtungen (L14) - wirkt NUR mit 6.0

STUFE 7 - Content (braucht alles darueber)
  7.1  Monster-Rollen + Untoten-Herkunft (L11)
  7.2  Monster-Helden
  7.3  Sets (L3)
  7.4  Neutrale Orte (Bruecke, Muehle, Turm, Steinbruch)
  7.5  Kerker-Generator + Setpieces (L13)
  7.6  Akt 2b (Der Graf wird angegriffen)
```
