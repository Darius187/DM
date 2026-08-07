# RAVENSMOOR - 03 RTS, KRIEGSWIRTSCHAFT & ARMEE

Alle RTS-Systeme der Sitzung. Jeder Punkt mit **Aufwand** und **RANG** (wann dran).
Die Quellen (AoE IV, Total War, BAR, Stronghold, Manor Lords, Dungeon Siege) sind
genannt, damit spaeter nachvollziehbar ist, WOHER die Idee kam.

**Wichtig:** Diese Dokumente beschreiben zusammen mind. 5 Spiele. Wer alles nimmt,
bekommt kein reiches Spiel, sondern ein unfertiges. Deshalb die Rang-Ordnung.

---

## 0. DER IST-ZUSTAND (aus dem Code gelesen)

Vorhanden und funktionierend:
- `src/data/rts.ts` - Einheiten, Bauten, Moral, Belagerung, Turm, Raenge (Daten)
- `src/logic/rtsBattle.ts` - Kommando-Schicht (Auswahl, Befehle, Formationen)
- `src/logic/formationen.ts`, `src/world/Wegfeld.ts`
- Integration in `WorldScene.ts`
- Belagerung mit Bresche-Fokus, Turm-Besatzung, Lager-Auren, Bauzeit, Wegfeld

**Die grosse Luecke:** Heer und Dorf sind KOMPLETT ENTKOPPELT.
- Baukosten kommen aus `p.materials` = **dem Rucksack des Helden** (Designfehler)
- Keine echte Rekrutierung (nur Gratis-Test-Spawn)
- Kein Nachschub, keine Kriegswirtschaft
- Die Schlacht wird bei jedem Kartenwechsel ZERSTOERT (`unloadAreaObjects`)

**Tote Stellen im Code (pruefen, dann aufraeumen):**
- `RTS_RANG` (Veteranen) ist definiert, aber NIRGENDS benutzt.
  Vorsicht: `RtsUnit.rank` ist etwas anderes (Formations-Tiefe) - Namenskollision.
- `RTS_EINHEITEN` und `RTS_UNIT_TYP` sind ZWEI konkurrierende Einheiten-Tabellen -
  nur die zweite laeuft. In `RTS_EINHEITEN` steht ein Armbruster, obwohl Armbrueste
  per Design-Regel ausgeschlossen sind.

---

## RANG 1 - SOFORT (billig, hoher Ertrag, halb vorhanden)

### 1.1 Baukosten aus dem DORF-LAGER  [billig] [OPUS]
Die Kernforderung: **viel abgebaut = viel baubar.**

Umzustellende Stellen (alle in `WorldScene.ts`):
- `rtsBaue()` - Verfuegbarkeitspruefung
- `platzierKlick()` - Abbuchung beim Setzen der Baustelle
- `palisadeDragEnd()` - Abbuchung je gezogenem Segment
- `repariereBau()` - Pruefung + Abbuchung
- `baueBauAb()` - Rueckerstattung
- `baueRtsLeiste()` - Farbcodierung "kann/kann nicht" muss den LAGERBESTAND lesen,
  sonst luegt die Anzeige

**NICHT umstellen:** Das persoenliche Baumenue des Helden (`baue()` / `BAUMENU`,
Taste N). Lagerfeuer und Verband bezahlt der Held aus seinem EIGENEN Vorrat - das
ist "Held farmt" und Absicht.

### 1.2 Moral entscheidet Kaempfe, nicht Lebenspunkte  [billig] (Total War)
**Der wichtigste Punkt ueberhaupt - und die Konstanten existieren schon (`MORAL`),
werden nur kaum benutzt.**

Kaempfe sollen enden, weil der Feind **BRICHT**, nicht weil jeder auf null gepruegelt
wurde.

Moral SINKT durch: Angriff in Ruecken/Flanke, Tod des Anfuehrers, Verlust des Banners,
hohe Verluste in kurzer Zeit, Einkesselung, zahlenmaessige Unterlegenheit,
Flucht benachbarter Einheiten, fehlender Proviant.

Moral STEIGT durch: geschlossene Formation, bekannter Anfuehrer, sichere Flanken,
nahe Verbuendete, Sieg ueber einen gefaehrlichen Gegner, Standarte, Feldaltar, Brunnen.

Unter der Fluchtschwelle: die Einheit LAEUFT WEG. (`MORAL.fluchtUnter` existiert.)

-> **Macht aus Schlachten TAKTIK statt Zahlenabbau.**

### 1.3 Bewegung und Ziel TRENNEN  [billig] (BAR "Set Target")
Aktuell bricht ein Angriffsbefehl die Bewegung ab. Zwei getrennte Felder:

```
interface TacticalOrder {
  movementDestination?: Vector2;      // wohin marschieren
  preferredTargetId?: number;         // wen bevorzugt angreifen
  preferredTargetCategory?: string;   // oder: welche KATEGORIE
}
```

- "Zieht euch zum Tor zurueck, **aber schiesst weiter auf die Reiter**."
- "Rueckt bis zum Graben vor, **aber beschiesst bevorzugt die Armbrustschuetzen**."
- Zielkategorien: Reiter, Bogenschuetzen, Anfuehrer, Belagerungsmannschaften,
  Fahnentraeger, Verwundete, Fliehende, Tore.

**Fast umsonst, macht das RTS sofort taktischer.**

### 1.4 Ziel-Sperrzeit  [billig] (Dungeon Siege) - IST VERMUTLICH EIN BUG
`naechsterFeind()` rechnet JEDEN FRAME neu. Steht ein Gegner minimal naeher, wechseln
die Einheiten das Ziel - und **zappeln zwischen zwei Zielen hin und her**.

Fix: Ziel 0,5-2 Sekunden festhalten. Wechsel nur bei: Ziel tot, unerreichbar,
ausserhalb der Verfolgung, direkter Spielerbefehl, deutlich hoeher priorisiertes Ziel.

(Bei der Belagerung ist das mit `BELAGERUNG.neuBewertenS` schon geloest - im
normalen Kampf fehlt es.)

### 1.5 Angriffs-Slots am Kollisionsrand  [billig] - IST VERMUTLICH EIN BUG
**Zwei unabhaengige Quellen (AoE IV + Diablo-Dok) empfehlen dasselbe** - das ist die
Standardloesung fuer "20 Figuren stehen ineinander und 3 kaempfen".

Nahkaempfer bekommen einen **reservierten Platz** am Kollisionsrand des Ziels.
Nicht alle stuermen denselben Punkt an. Ist kein Platz frei: warten, anderes Ziel
suchen, oder nachruecken wenn ein Slot frei wird.
-> Ermoeglicht **Einkreisung**, ohne dass Figuren ineinanderstehen.

### 1.6 Tag-basierte Konter  [billig] (AoE IV)
Siehe Dok 02, Punkt 4. **Dieselbe Tabelle** wie die Monster-Resistenzen.
Speer schlaegt Reiter, Bogen schlaegt Speer, Reiter schlaegt Bogen.

### 1.7 Die drei Verhaltens-Achsen  [billig] (Dungeon Siege - "Field Commands")
Aktuell hat jede Einheit EINE Haltung (aggressiv/verteidigen/halten).
Dungeon Siege trennt in **DREI UNABHAENGIGE ACHSEN** - deutlich maechtiger:

| Achse | Optionen |
|-------|----------|
| **Bewegung** | frei verfolgen / in der Naehe bleiben (Leash) / Stellung halten |
| **Angriff** | selbst angreifen / nur zurueckschlagen / **gar nicht angreifen** |
| **Zielwahl** | naechster / schwaechster / gefaehrlichster |

**Erst dadurch entstehen ROLLEN:**
- Bogenschuetze: Stellung halten, selbst angreifen, schwaechste zuerst
- **Feldscher: in der Naehe bleiben, NICHT angreifen** (damit er nichts anzieht)
- Ritter: frei verfolgen, aggressiv, gefaehrlichste zuerst

"Feuer einstellen" ist genau das, was fehlt, damit der Heiler nicht in den Kampf rennt.

### 1.8 Engstellen-Kompression  [billig] (AoE IV / Dungeon Siege)
Breite Linie wird am Tor automatisch zur **Kolonne** und formiert sich dahinter neu.
**Ohne das verklumpen die Truppen an jedem Tor** - das passiert vermutlich schon.

### 1.9 Formations-Abstandsregler  [billig] (Dungeon Siege 30.4)
Eng = stark im Nahkampf. Weit = ueberlebt Flaechenschaden.
**Das ist der natuerliche Konter gegen Katapulte und Feuerregen.**

---

## RANG 2 - DIE KETTE SCHLIESSEN (das Fundament)

```
Mine/Feld → Dorf-Lager → Zeughaus → Heer
                ▲                      │
                └─ Kriegswirtschaft ───┘
```

### 2.1 Persistente Armee (Roster)  [mittel-teuer] [FABLE]
**MUSS VOR der Rekrutierung kommen** (Abhaengigkeits-Umkehr - der urspruengliche
Plan hatte Persistenz ganz hinten, das geht nicht: man rekrutiert sonst Soldaten,
die an der naechsten Kartenkante verschwinden).

- Datenmodell `armee` AUSSERHALB von `RtsBattle` (RtsBattle bleibt reine Kommando-
  Schicht - das ist gute Architektur, nicht aufweichen).
- Pro Einheit: `{ id, name, typ, maxhp, hp, rang, kills, verletzungen[] }`
- Beim Betreten einer Karte: Roster-Einheiten spawnen.
  Beim Verlassen: Zustand ZURUECK ins Roster.
- **Tote sind ENDGUELTIG raus. Verluste muessen weh tun.**
- In `SaveData` einhaengen (Defaults fuer alte Staende!).

### 2.2 Veteranen (RTS_RANG endlich verdrahten)  [billig, nach 2.1]
- Kills zaehlen pro Einheit. Ab `killsProRang` steigt der Rang (max `maxRang`).
- Rang gibt +Schaden, +Leben, +Moral (Konstanten existieren).
- Rang sichtbar im Overlay (Winkel/Sterne).

### 2.3 Rekrutierung: Bauern werden Soldaten  [mittel] (Manor Lords)
**Der AoE-Kern und gleichzeitig die Story: Soldaten sind RAR und teuer.**

Eine Rekrutierung kostet:
- **Gold** (Dorfkasse oder Held)
- **EINE `waffen`-Einheit aus dem Dorf-Lager** (der Schmied hat sie gemacht -
  **die Kette schliesst sich!**)
- und den entscheidenden Preis: **EINEN ARBEITER.**

Umsetzung: `bevoelkerung`-Zaehler. `TAGES_PRODUKTION` wird skaliert mit
`(bevoelkerung / bevoelkerungStart)`.
**Jeder Soldat, den du aufstellst, macht das Dorf aermer. Das ist der Zielkonflikt.**

**Soeldner als Alternative:** kosten NUR Gold (viel), keinen Arbeiter - dafuer
niedrigere Moral und sie desertieren frueher.
-> **Das gefundene Gold aus der Story-Hook wird zur Truppen-Waehrung.**

Truppen-Obergrenze an die Bevoelkerung gekoppelt, nicht frei.

### 2.4 Verstaerkung aus dem Roster  [billig, nach 2.1]
`rufeVerstaerkung()` (Wartfeuer) spawnt aktuell einen FESTEN Trupp aus dem Nichts.
Umbauen: Es ruft Einheiten aus dem ROSTER, die noch nicht auf dem Feld sind.
**Keine Einheiten im Roster = keine Verstaerkung. Kein Gratis-Nachschub.**
Verstaerkung trifft in **SCHUEBEN** ein (10, dann 30, dann der Rest) - das ist die
Dramaturgie von Akt 3: "durchhalten, bis sie kommen".

### 2.5 Nachschub - die 3-Zahlen-Abstraktion  [mittel] [FABLE]
**Der Trick, der es machbar macht: an der Front ABSTRAHIEREN.**

Im DORF bleibt alles detailliert (Holz, Stein, Eisen, Brot, Fleisch, Wasser,
Verbaende) - das laeuft bereits.

**An der FRONT gibt es nur DREI Zahlen:**

| Front-Ressource | Wird beladen aus |
|-----------------|------------------|
| **Baumaterial** | Holz, Stein, Palisadenholz |
| **Proviant** | Brot, Fleisch, Wasser, Bier |
| **Sanitaet** | Verbaende, Kraeuter |

Umrechnung passiert **beim Beladen des Konvois**. Dorfwirtschaft bleibt reich,
Front-UI zeigt 3 Balken statt 12.

**Kartenuebergreifend:** Das Feld-Depot haengt NICHT an der Karte, sondern **an der
ARMEE**. Es zieht mit, wird gespeichert. Konvoi-Laufzeit = Weltkarten-Distanz von
Ravensmoor zur aktuellen Zelle. **Je weiter nach Norden, desto laenger der
Nachschubweg** - das erzaehlt den Feldzug von allein.

Kopplungen (die Systeme existieren schon):
- **Proviant** haelt die MORAL (neuer Summand im MORAL-System)
- **Sanitaet** speist Feldscher und Lazarett
- **Baumaterial** die Palisaden
- Fleisch/Bier koennen ein **Moral-BONUS** sein statt nur Saettigung
  (die Feldkueche ist schon angelegt)
- Fernkaempfer verbrauchen **Pfeile**; ohne Pfeile faellt die Reichweite auf
  Nahkampf zurueck

### 2.6 Kriegswirtschaft-Schalter  [mittel] [FABLE]
Beim Schulzen im Verwaltungsbuch. Wirkt auf `wirtschaftsTick()` / `VERARBEITUNG` /
`SCHMIEDE_FERTIGUNG`:

| | FRIEDEN (jetzt) | KRIEG |
|---|---|---|
| Schmied | `waffen` + `werkzeuge` abwechselnd | NUR `waffen` + **`pfeile`** |
| Saegewerk | `bretter` (Wiederaufbau) | **`palisadenholz`** (Feldbau) |
| Baecker | `brot` (Ueberschuss -> Verkauf) | **`marschproviant`** (haltbar) |
| Dorfkasse | waechst durch Verkauf | waechst kaum (**Krieg kostet**) |

**Die Bewohner MURREN:** Nach X Tagen Kriegswirtschaft sinkt die Zufriedenheit
(an `dorfHunger` / `ESSEN.arbeitsBremse` anlehnen).
**Die Kriegswirtschaft ist NICHT gratis dauerhaft haltbar.**

Chronik-Zeilen fuer Umschaltmoment und Murren.

### 2.7 Der Notaufnahme-Effekt  [Design-Prinzip, kein Code]
**Der beste Einfall des Autors:** Das Holz geht an der Front aus.

Die Belagerung haelt, die Palisaden brechen, Nachschub kommt nicht, weil im Dorf
keiner mehr Baeume faellt. Also reitest du zurueck, stellst die Wirtschaft um,
treibst die Holzfaeller an, schickst den Konvoi los, reitest wieder hoch und
haeltst die Linie **gerade so**.

**Damit wird die Dorfwirtschaft von einer Nebenbeschaeftigung zur NOTAUFNAHME.**
Holzhacken ist stinklangweilig. Holzhacken, **weil heute Nacht die Palisade faellt**,
ist es nicht.

**Die Regel dahinter: NIE eine Sackgasse, immer nur TEURE Auswege.**
Kein Holz mehr?
- Reiss das abgebrannte Gehoeft ab und nimm die Balken.
- Kauf beim Haendler zum Wucherpreis.
- Schick Bauern in den Wald - dann stehen sie nicht auf dem Feld, und in drei Tagen
  fehlt das Brot.

**Jeder Ausweg kostet woanders.** Das ist der Unterschied zwischen HART und
FRUSTRIEREND: Hart heisst, jede Option tut weh. Frustrierend heisst, es gibt keine.

### 2.8 Arbeiter an der Front fehlen im Dorf  [mittel] (BAR / Stronghold)
Feldbauten brauchen **Arbeiter vor Ort**, nicht nur Material. Der Zimmermann kann
nicht gleichzeitig im Dorf und an der Front bauen.

(Die BAR-Vollversion mit Werkzeugqualitaet, Wetterfaktor und Sicherheitsfaktor ist
Buchhaltung - **NICHT uebernehmen**. Nur die halbe Version.)

---

## RANG 3 - DAS EINE TEURE SYSTEM (die naechste grosse Wahl)

### 3.1 UNSICHERE AUFKLAERUNG  [TEUER] (BAR) - **EMPFOHLENES TEURES SYSTEM**

Statt "Feind sichtbar oder nicht" gibt es **Meldungen mit Unsicherheit**:

```
interface EnemyReport {
  estimatedPosition: Vector2;
  positionUncertainty: number;
  estimatedStrengthMin: number;
  estimatedStrengthMax: number;
  observedAt: number;
  confidence: number;
  source: "directSight" | "scout" | "watchtower" | "messenger" | "villager" | "rumor";
}
```

- **Direkte Sicht:** "143 Mann, 18 Reiter, zwei Wagen."
- **Spaehermeldung:** "Vielleicht 100 bis 200 Mann suedlich des Waldes."
- **Alte Meldung:** "Vor zwei Stunden wurden dort Reiter gesehen."
- **Geruecht:** "Ein grosses Heer soll aus dem Osten kommen."

Mit dem Alter wird die Meldung unsicherer: Position ungenauer, Staerke unzuverlaessiger,
Einheitentypen verschwinden, Marschrichtung nur noch vermutet.

**Warum GENAU DAS das teure System sein sollte:**
- Der **Wachturm** bekommt endlich einen Zweck jenseits von Schiessen.
- **Spaeher** werden wertvoll.
- Und der Punkt: **Man trifft Entscheidungen unter UNGEWISSHEIT** - und das ist die
  Essenz von Taktik. Nicht "die perfekte Konter-Einheit gegen einen bekannten Feind",
  sondern: **"Reicht meine Palisade gegen *vielleicht* zweihundert? Halte ich, oder
  ziehe ich ab?"**
- Es unterscheidet dieses Spiel von allen anderen.
- **Die Haelfte ist schon da** (Kriegsnebel, Tuerme).

---

## RANG 4 - SPAETER (gut, aber nicht jetzt)

### 4.1 Schlachtfeld-Bergung  [mittel-teuer] (BAR) - **zweitbeste BAR-Idee**
Nach der Schlacht einsammeln: Pfeile, Waffen, Ruestungen, Verwundete, Pferde, Wagen.

**Der clevere Teil: Wenn du FLIEHEN musst, holt der Feind SEINE Sachen zurueck.**
-> "Das Feld behalten" wird zum eigenen Ziel.
-> **Ein knapper Sieg mit Rueckzug ist schlechter als ein kleinerer Sieg mit
   gehaltenem Boden.** Historisch korrekt und mechanisch elegant.

**Verbindet sich mit drei anderen Systemen:**
- Loot-Deko am Boden (Dok 02, Punkt 12) wird hier eingesammelt
- Die eigenen Gefallenen bergen, **bevor der Feind sie wieder aufstellt** (Dok 01, Punkt 8)
- Fuellt das Dorf-Lager -> Kriegswirtschaft

### 4.2 Gezeichnete Formationslinien mit Tiefe  [mittel] (BAR)
**Halb vorhanden!** `formiereEntlangLinie()` laesst schon eine Linie ziehen.
Was fehlt: **TIEFE** (eine Reihe, zwei, drei) und **Formationstyp darauf**
(Schildwall, Speerwall, lockere Schuetzenlinie, Kolonne).

"Haltet den Abschnitt zwischen dem Felsen und dem Bach." -> Taktik zum Anfassen.

### 4.3 Physische Geschosse (teilweise)  [mittel] (BAR)
NUR: "Der Verbuendete blockiert die Schussbahn" -> macht Formation wichtig.
**NICHT:** Terrain-Verformung durch Explosionen.

### 4.4 Belagerungsgeraet  [teuer] (AoE IV)
Rammbock (gegen Tore, schwach gegen Nahkaempfer), Mangonel (gegen Gruppen -
**gestaffelte Formation ist der natuerliche Konter**), Belagerungsturm.
Sehr spaet, wenn ueberhaupt.

### 4.5 Wegfindung haerten  [billig-mittel] [OPUS]
Lokale Ausweichbewegung (nicht bei jeder Blockade den ganzen Weg neu rechnen),
Gruppenpfad (Formation berechnet einen Korridor, Einheiten folgen ihren Slots).

### 4.6 Befehlspakete / Baulinien / Arbeitsaufteilung  [mittel] (BAR)
Komfort. Shift-Warteschlange: bewegen -> bauen -> reparieren -> zurueckkehren.

---

## RANG 5 - AUSDRUECKLICH ABGELEHNT (nicht wieder vorschlagen)

| System | Quelle | Warum nicht |
|--------|--------|-------------|
| Belohnungen statt Befehle | Majesty | Der Reiz ist, NICHT befehlen zu koennen. Wir wollen Taktik. |
| Intrigen-/Beziehungssystem | Crusader Kings | Zu teuer. NUR: der Graf braucht EINEN persoenlichen Grund. |
| Ereignis-Regisseur | RimWorld | Das Spiel hat eine erzaehlte Handlung, keine Sandbox. Wuerde der Dramaturgie ins Handwerk pfuschen. |
| Voll-Logistik (Rationen, Sehnen, Hufbeschlag, Futter, Wagen) | Songs of Syx | Buchhaltungsspiel. Wir haben 3 Zahlen. |
| Stress-/Psyche-System | Darkest Dungeon | Eigenes System mit eigenem Balancing. Merken, nicht bauen. |
| Feuer-Ausbreitung, Loeschmannschaften | Stronghold | Zu teuer. |
| Terrain-Zerstoerung | BAR | Zu teuer, kein Nutzen. |
| Unbegrenztes Wirtschaftswachstum | BAR | Unglaubwuerdig fuer einen Grafen. Grenzen: Bevoelkerung, Ernte, Wald, Bergwerk, Transportwege, Jahreszeit. |
| Tote wiederbeleben | BAR | Tote Soldaten bleiben tot. (Ausser: sie stehen beim FEIND wieder auf.) |
| Mauerkronen als 2. Navigationsebene, Zeitalter, Arbeiter-Zustandsmaschinen, deterministische Simulation, Netzwerkcode | AoE IV | Das ist eine ganze RTS-Engine. Wir bauen ein ARPG mit RTS-Schicht. |

---

## 6. DIE GEFAEHRTEN-GRUPPE - die fehlende Mittelstufe  [mittel] (Dungeon Siege)

**Der wichtigste strukturelle Fund aus dem Diablo/Dungeon-Siege-Dokument:**

Es gibt Held allein (Akt 1) und Armee mit 300 Mann (Akt 3). **Dazwischen klafft eine
Luecke.**

Die Luecke fuellt eine **Gefaehrten-Gruppe**: der Schmied, der mit in die Krypta geht.
Ein paar Dorfwehrleute. Spaeter der Feldscher. **Vier bis sechs Leute**, gesteuert
ueber die drei Verhaltens-Achsen (1.7) statt einzeln angeklickt.

**Sie benutzen DENSELBEN CODE wie die spaetere Armee, nur in klein.**
-> Das RTS waechst organisch aus dem ARPG heraus, statt als Fremdkoerper danebenzustehen.

Leitsatz (Diablo-Dok, Kap. 67):
> **Der Hauptcharakter spielt sich unmittelbar wie Diablo 1, waehrend die Begleiter
> nach konfigurierbaren Dungeon-Siege-Regeln selbststaendig handeln.**

Das ist exakt dieses Spiel.

---

## 7. PERSOENLICHKEIT DER TRUPPEN - drei Stufen  [billig bis mittel]

**Warnung: Wenn alle 300 eine Persoenlichkeit haben, hat KEINER eine.**
Das ist keine Sparsamkeit, das ist Dramaturgie.

| Stufe | Wer | Was | Aufwand |
|-------|-----|-----|---------|
| **1** | ALLE (300) | **Name**, Ausruestung, Moral, Rang, Kills - beim Anklicken sichtbar | billig (Namensliste) |
| **2** | Veteranen (ab Rang 2, ~12 Mann) | **Beiname + Herkunft**: "Kunz der Muellersohn, hielt die Bresche am Osttor" | billig (Textvorlage) |
| **3** | Gefaehrten (4-6) | Echte Eigenheiten, Vorlieben, Konflikte | mittel (echte Arbeit, aber nur 6x) |

**Dasselbe Klick-Fenster fuer eigene Truppen UND Feinde.** Beim Feind steht statt
des Namens die **Vermutung, wer er einmal war** (siehe Dok 01/02).
Ein Fenster, zwei Zwecke.

**Warum das der staerkste Bindungs-Mechanismus ist:** Verlust wiegt psychologisch
schwerer als Gewinn. Wenn Hans die Bresche gehalten hat und Kunz seit dem ersten Dorf
dabei ist, verlierst du bei jedem Angriff nicht "eine Einheit", sondern JEMANDEN.
**Ein Veteran mit drei Raengen und einem Namen ist mehr wert als jede epische Klinge.**
Und genau deshalb schickst du ihn ungern in die Bresche - und genau deshalb spielst
du weiter.

---
---

# NACHTRAG (Sitzung 2) - WARCRAFT III, LEAGUE, SUNZI

Alles Folgende ist NEU. Code dazu: `src/data/fuehrung.ts`

## N0. ❗ KRITISCHE KORREKTUR: KEINE REITER

Es gibt **keine Kavallerie** (Pferde-Animation nicht gut genug) und **kein schweres
Geraet**. Das bricht:
- Das AoE-Konter-Dreieck (Speer schlaegt Reiter...) → **ersetzt durch Schnitt/Stich/Wucht**, siehe Dok 02
- Speerwall-Bereitschaft (war gegen die Charge gedacht) → **gestrichen**
- Keil als Kavallerie-Formation → bleibt, aber als reine Durchbruchs-Geometrie
- Machtspitze "erstes Kriegspferd" → **ersetzt durch Hauptmann-Raenge**
- Kombo "Speerwall haelt Charge → Salve" → **ersetzt durch "Bresche schlagen"**

**KEIN System darf auf Reiter angewiesen sein.** Sie docken spaeter sauber an
(als schneller Flankierer, der Fernkaempfer erreicht).

## N1. Befehlshaber-Faehigkeiten des Helden [mittel] ❗ (Warcraft III)

**Das Problem:** Im RTS-Modus tut der Held aktuell dasselbe wie im ARPG, nur langsamer.
Er ist "ein starker Kaempfer mit Truppen drumherum" - **kein Hauptmann.**

**Die Loesung: Keine Zauber. KOMMANDOS.**

| Taste | Faehigkeit | Warum es sie gibt |
|-------|------------|-------------------|
| F1 | Schildwall schliessen | Antwort auf Bogenschuetzen. Kostet Beweglichkeit. |
| F2 | Gemeinsame Salve | Konzentriertes Feuer BRICHT eine Formation, statt sie zu zermuerben. |
| F3 | Rueckzug zum Banner | Die Rettung, wenn die Linie bricht. |
| F4 | Reserven vorruecken | Macht Tiefe in der Formation nuetzlich. |
| F5 | Verwundete decken | Wer birgt, verliert nicht doppelt (siehe Gefallene). |
| F6 | **Hornsignal** | Der Wendepunkt-Knopf. Selten, machtvoll, klingt nach Mittelalter. |

Sie kosten **Abklingzeit, kein Mana**. Sie sind **militaerisch, nicht magisch**.
Sie haben eine **Befehlsreichweite**, die mit dem Rang waechst.

## N2. Auren brauchen eine BEFEHLSKETTE [billig] (Warcraft III)

**Eine Aura darf NICHT unsichtbar ueberall wirken** - dann ist sie Magie, und das passt
nicht in Low Fantasy. Eine mittelalterliche Aura ist eine **Befehlskette**: Man sieht
das Banner, man hoert das Horn, man kennt den Mann.

Sie braucht: **Entfernung + Sichtkontakt zum Banner ODER Hoerweite + der Traeger lebt.**

**Faellt der Hauptmann oder wird das Banner erobert, verschwindet die Aura.**
→ **Banner und Anfuehrer werden zu ECHTEN ZIELEN** - fuer dich und fuer den Feind.
→ Der Monster-Held traegt genauso eine Aura, die man brechen kann.

Auren: Bekannter Anfuehrer (Sicht, Moral +12) · Standarte (Sicht, +10) ·
Trommler (**Gehoer** - wirkt auch durch den Wald, Tempo +12%) ·
Feldscher (Naehe, Heilung) · Pater (Sicht, Moral)

## N3. Neutrale Orte mit ECHTEN Vorteilen [mittel] (Warcraft III / League)

**Nicht "+10% Schaden", sondern konkret.** Das macht "die Karte Schritt fuer Schritt
erobern" (Akt 3) zu echter Strategie statt zu einer Reihe von Kaempfen.

| Ort | Vorteil |
|-----|---------|
| **Wachturm** | groessere Sicht, bessere Feindmeldungen |
| **Bruecke** | schwere Wagen passieren - sonst muss der Nachschub die Furt nehmen (doppelte Zeit) |
| **Muehle** | Verpflegung verbessert sich |
| **Steinbruch** | Feldbau wird billiger |
| **Kloster** | Verwundete werden versorgt, Nachrichten |
| **Furt / Pass** | kontrolliert, wer durchkommt |
| **Soeldnerlager** | Rekruten ohne Bauern-Kosten (teuer) |

**Damit entsteht TAUSCHEN:** "Du verlierst den Wachturm, nimmst aber die Muehle."
**Kampf um die Karte, ohne ueberall Burgen platzieren zu muessen.**

## N4. Tag und Nacht als REGEL, nicht als Filter [billig] (Warcraft III)

**Das Spiel HAT bereits alles:** Tageszeit, Wetter, Nebel, Fackeln, Lichtsystem,
Kriegsnebel. Es fehlt nur, dass daraus REGELN werden.

| | Tag | Nacht |
|---|-----|-------|
| Sichtweite | 1.0 | 0.4 |
| Bogenschuetzen | normal | 0.7 |
| Hinterhalte | schwer | 1.5x |
| Waldbewegung | normal | 0.8 |
| Lager | egal | **braucht Feuer und Wachen** |

Regen + Nacht = **0.25** (fast blind). Nebel am Morgen = 0.3. Vollmond = 0.6.

**DIE FACKEL-ENTSCHEIDUNG (das Herzstueck):**
Eine Fackel erhoeht deine Sicht (1.6x) **UND MACHT DICH SICHTBAR** (400px).
Nachts mit Fackel: Du siehst mehr, aber **der Feind sieht dich zuerst.**
→ Eine ENTSCHEIDUNG, kein Gratis-Upgrade.

**Und Moral haengt an der Tageszeit** (Sunzi): morgens +8, abends -8, nachts -12.
→ **Der Angriffszeitpunkt wird zu einer Entscheidung.** Kostet fast nichts - die Uhr
laeuft schon.

---

# N5. SUNZI - "DIE KUNST DES KRIEGES"

Neunzig Prozent des Buches ist Philosophie und laesst sich nicht in Mechanik uebersetzen.
**Sechs Stellen aber schon** - und eine davon hebt das teure System auf eine andere Ebene.

## N5.1 ❗ AUFKLAERUNG GEHT IN BEIDE RICHTUNGEN [teuer - Aufwertung des teuren Systems]

> *"Jede Kriegfuehrung gruendet auf Taeuschung. Wenn wir faehig sind anzugreifen, muessen
> wir unfaehig erscheinen; wenn wir nahe sind, muessen wir den Feind glauben machen,
> dass wir weit entfernt sind."* (Kapitel I)

**Das Problem mit der unsicheren Aufklaerung allein:** Wenn nur DU vage Meldungen
bekommst, ist es ein Informations-DISPLAY.

**Die Loesung:** Der Feind bekommt seine Informationen ueber DICH genauso unzuverlaessig -
**und du kannst sie FAELSCHEN.**

Sunzi erzaehlt von **Sun Bin**, der beim Rueckzug jede Nacht weniger Lagerfeuer entzuenden
liess - erst 100.000, dann 50.000, dann 20.000. Der Verfolger dachte, die Armee zerfalle,
setzte unvorsichtig nach und lief in den Hinterhalt.

**Als Mechanik:**
- **Lagerfeuer:** mehr entzuenden (groesser wirken) oder weniger (schwaecher wirken)
- **Banner:** zeigen oder verbergen
- **Truppen:** sichtbar aufmarschieren oder im Wald halten

**Kosten: eine Handvoll Schalter. Wert: verdoppelt das teure System.**
→ **Aufklaerung wird von einem Display zu einem DUELL.**

## N5.2 ❗ ZEICHEN LESEN STATT ZAHLEN LESEN [teuer - die Seele des Systems]

Kapitel IX ist eine einzige Liste von Beobachtungen:

> *"Wenn Voegel in ihrem Flug ploetzlich hoeher steigen, ist dies ein Zeichen fuer einen
> Hinterhalt an der Stelle unter ihnen."*
> *"Wenn Staub in einer hohen Saeule emporsteigt, ist das ein Zeichen fuer naeherrueckende
> Wagen; wenn der Staub niedrig bleibt und sich ueber ein weites Gebiet ausbreitet, ist
> das ein Zeichen fuer das Vorruecken von Infanterie."*
> *"Wenn die Soldaten sich beim Stehen auf ihre Speere stuetzen, dann sind sie schwach
> vor Hunger."*
> *"Laerm in der Nacht verraet Nervositaet."*

**Statt "142 Mann, 18 Reiter" bekommt der Spaeher ZEICHEN - und der Spieler muss sie
DEUTEN.**

**WARUM DAS SO GUT IST:**
- Historisch richtig (es gab kein Radar - man las die Landschaft)
- Spielerisch tief
- **Es belohnt ERFAHRUNG statt UI-Ablesen.** Nach zwanzig Stunden weisst du, was eine
  schmale Staubsaeule bedeutet. **Das ist Meisterschaft** - genau die Sorte, die das
  Spiel tragen soll.

| Zeichen | Bedeutung |
|---------|-----------|
| Voegel steigen ploetzlich auf | Hinterhalt darunter |
| Staub hoch und schmal | Wagen / Nachschub |
| Staub niedrig und breit | Fussvolk marschiert |
| Staub in Einzelwolken | Gruppen sammeln Feuerholz |
| Baeume bewegen sich | Der Feind faellt eine Schneise |
| Voegel sammeln sich | Das Lager ist VERLASSEN |
| Wilde Tiere fliehen auf | Ueberraschungsangriff im Anmarsch |
| Laerm nachts im Lager | Angst - die Moral ist unten |
| Soldaten stuetzen sich auf Speere | Hunger |
| Viele Bestrafungen | Der Feind ist am Ende |

## N5.3 DAS LOCH IM KESSEL [billig - eine Bedingung] ❗

> *"Lasse ein Schlupfloch frei, wenn du eine Armee umzingelst. Das bedeutet nicht, dass
> es dem Feind erlaubt wird zu fliehen. Der Grund ist, ihn glauben zu machen, dass es
> einen Weg in die Sicherheit gibt, um ihn daran zu hindern, mit dem Mut der Verzweiflung
> zu kaempfen."* (Kapitel VII)

**Als Mechanik:** Eine **vollstaendig eingekesselte** Einheit flieht NICHT - sie bekommt
einen **Verzweiflungs-Bonus** (Moral-Boden 45, Schaden ×1,35) und kaempft bis zum Tod.

**GETESTET:** Dieselbe Katastrophen-Lage → offen: Moral 0 = FLIEHT. Eingekesselt:
Moral 45 = HAELT STAND.

**WARUM:** Die Einkesselung ist keine Gratis-Beute mehr, sondern eine **Entscheidung mit
Preis.** Lass ein Loch, und sie fliehen (billig, aber sie kommen wieder). Schliesse den
Kessel, und sie kosten dich Maenner.
**Gilt auch fuer DEINE Truppen: In der Falle kaempfen sie haerter.**

## N5.4 NACHSCHUB UEBERFALLEN IST 20x SO VIEL WERT [mittel]

> *"Eine Wagenladung Vorraete vom Feind entspricht zwanzig eigenen."* (Kapitel II)

**Warum:** Du sparst dir den ganzen Transportweg.

**FOLGE FUER AKT 3:** Die Monsterlager sind **keine Erfahrungsfarmen**, sondern die
**LOGISTIK DES FEINDES**. Du ueberfaellst sie nicht wegen der Beute, sondern um dem
Gegner den Bauch aufzuschneiden.

**Und umgekehrt: Deine Konvois sind angreifbar.**
→ Das ist das Comeback-Prinzip: **Der Schwaechere gewinnt, indem er die
Versorgungslinien des Staerkeren zerschneidet.**

## N5.5 MORAL HAENGT AN DER TAGESZEIT [billig - ein Summand]

> *"Nun ist der Geist eines Soldaten morgens am schaerfsten; zu Mittag laesst er bereits
> nach; und am Abend hat er nur im Sinn, ins Lager zurueckzukehren."* (Kapitel VII)

Die Uhr laeuft schon. Ein Summand in der Moral-Formel. **Der Angriffszeitpunkt wird zur
Entscheidung.**

## N5.6 ❗ DER SATZ, DER UEBER DEM GANZEN SPIEL STEHT

> *"Die groesste Leistung besteht darin, den Widerstand des Feindes ohne einen Kampf zu
> brechen."* (Kapitel III)

Bei Untoten klingt das unmoeglich - man kann sie nicht ueberzeugen.
**Aber genau deshalb funktioniert es:**

> **DIE HORDE IST NICHT DER FEIND. DER BINDER IST ES.**

Toete den Beschwoerer, und seine Erhobenen fallen um.
Toete den Schattenmeister, und der Krieg endet.

**Sunzis hoechstes Prinzip ist woertlich die STRUKTUR dieses Spiels.**
Und man kann es dem Spieler beibringen: Erst laesst man ihn zwanzig Skelette einzeln
erschlagen - dann merkt er, dass der eine Mann dahinten sie alle wieder aufstellt.

## N5.7 Was aus Sunzi NICHT uebernommen wird

- Die Spionage-Kapitel in voller Tiefe (fuenf Spionsorten = ein eigenes Spiel).
  **EIN Spaeher, der Zeichen liest, reicht.**
- Disziplin-durch-Hinrichtung-Anekdoten
- Alles, was Rundenstrategie voraussetzt

---

# N6. WAS AUS WARCRAFT/LEAGUE NICHT UEBERNOMMEN WIRD

| System | Warum nicht |
|--------|-------------|
| Tote Helden gegen Gold wiederbeleben | Tote bleiben tot (ausser beim Feind) |
| Zu starke magische Auren | Low Fantasy - Auren brauchen Befehlsketten |
| Kuenstliche Unterhaltsstufen | Das Nachschub-System IST der Unterhalt, und besser |
| Helden, die ganze Armeen allein vernichten | Bricht die RTS-Schicht |
| Drei starre Lanes, Minions, Last-Hit | Wettkampf-Struktur, keine Welt |
| Respawn nach dem Tod, Reset nach jeder Partie | Das Spiel hat einen Anfang und ein Ende |
| Extreme Mobilitaet (Spruenge durch Mauern) | Macht historische Waffen bedeutungslos |
| **Volles Trigger-/Editor-System** | **Wertvoll, ABER:** Genau die Sorte System, an der Solo-Entwickler ein halbes Jahr verlieren. **Wenn, dann WINZIG:** Ereignis → Bedingungen → Aktionen. Nichts weiter. |
