# 02 - KAMPF, ITEMS & MONSTER

Jeder Punkt mit **[Aufwand]** und **WARUM**. Ohne das WARUM baut man technisch
korrekten Code, der das Spiel kaputt macht.

---

# TEIL A - DER IST-ZUSTAND (vollstaendig, aus dem Code gelesen)

Quelle: `balancing.ts`, `kampf.ts`, `items.ts`, `skills.ts`, `combat.ts`

## A1. Zauber

**Grundzauber** (Slots 1-3, an Heldenstufe gebunden):

| Zauber | Frei ab | Mana | CD | Wirkung |
|--------|---------|------|-----|---------|
| Feuerball | Stufe 2 | 12 | 0,55s | 16+5×Lvl, Splash |
| Heilung | Stufe 3 | 26 | 4s | 40% Max-Leben |
| Heiliges Licht | Stufe 4 | 22 | 2s | Radius 135, +40% vs. Untote |

**Zauberei-Schule** (frei durch Skillstufe): Aderlass(2) · Kettenblitz(3) ·
Heilende Hand(3) · Lebenstausch(4) · Frostnova(6) · Feuerregen(8) · Bannkreis(9)

**Nur ueber Schriftrollen** (Verbrauchsgut, nicht lernbar): Gewitter, Eisregen,
Feuerwand, Feuerwalze, Windstoss + seltene Foliant-Varianten aus Buecherregalen.

## A2. Nahkampfwaffen

Rostige Klinge(5) → Kurzschwert(8) → Streitkolben(11) → Langschwert(14) →
Streitaxt(16) → Falchion(18) → Hellebarde(20) → Kriegshammer(22)
+ Boss-Beute: **Templerklinge des Ostens** (+4 Schaden, +3 Lebensraub)

Zufalls-Praefix/Suffix + Affixe. Seltenheit: Gewoehnlich / Magisch / Selten / Episch.

**Movesets:** Schwert (3er-Combo) · Axt (2 Hiebe + Rundumschlag) · Stange (Stich) ·
Wucht/Hammer (Overhead, AoE) - je mit eigenem Tempo und eigener Reichweite.

**Nahkampf-Faehigkeiten:** Wuchtschlag(2) · Rundumschlag(3) · Blutdurst(4, heilt bei
Treffer) · Kriegsschrei(5, Stun+Buff) · Sturmangriff(6) · Erschuetterung(7) ·
Hinrichtung(9, ×2,5 vs. betaeubt)

## A3. Fernkampf

Boegen: Jagdbogen(9) · Armbrust(14) · Kriegsbogen(17). Dazu Zauberstaebe.
Pfeile: stapelbar zu 20, kein eigener Typ. **Elementarpfeile durch Sockelung:**
Feuer (Brand-DoT), Eis (Slow), Schatten (Lebensraub).

**Bogen-Faehigkeiten:** Mehrfachschuss(3) · Hagel der Pfeile(4) · Splitterpfeil(5) ·
Durchschlag(6) · Sprungpfeil(7) · Fesselpfeil(8) · Markierter Tod(9, +25% Schaden 8s)

## A4. Allgemeine Kampffaehigkeiten

- **Blocken:** mit Schild 30% Restschaden; ohne Schild 20-55% je Gegnertyp
- **Perfekte Parade:** Treffer in den ersten 300ms des Blocks → Gegner taumelt 0,9s
- **Riposte:** nach Parade naechster Treffer +100% (1,3s Fenster)
- **Ausweichrolle:** 260ms Unverwundbarkeit, 0,9s CD
- **Schwerer Hieb:** ×2,2, bricht Haltung, 0,6s Vorbereitung
- **KEIN Stamina-System**
- **Learning by doing:** 9 Stufen je Schule, automatische Freischaltung

## A5. WAS ES NICHT GIBT (wichtig fuer jedes Design!)

- **KEINE REITER** (Pferde-Animation nicht gut genug)
- **KEIN schweres Geraet** (Rammbock, Katapult, Trebuchet)

**Beides ist spaeter moeglich, aber KEIN System darf darauf angewiesen sein.**

---

# TEIL B - DAS KONTER-SYSTEM (Code: `src/data/kampfarten.ts`)

## B1. Die oberste Regel

**Das Schwert muss IMMER funktionieren.** Nie unter halben Schaden. Nie Immunitaet.

**WARUM:** Die meisten Spieler wollen mit dem Schwert spielen. Der Waffenwechsel ist
eine BELOHNUNG fuer Wissen, keine STEUER auf Unwissen. Wer stur mit dem Langschwert
durchgeht, kommt durch - es dauert nur laenger.

## B2. Das Dreieck OHNE Reiter ❗ (kritische Korrektur)

**Das Problem:** Das AoE-Konter-Dreieck steht auf Kavallerie. Ohne Reiter bricht es.
Ebenso betroffen: Speerwall gegen Charge, Keil als Kavallerie-Formation, "erstes
Kriegspferd" als Machtspitze.

**Die Loesung (besser als das Original):** Das Dreieck laeuft ueber die HEMA-Wurzeln
des Spiels - **SCHNITT / STICH / WUCHT** existieren schon in den Movesets.

```
        SCHILD / PANZER  (haelt Fernkampf und Schnitt - aber langsam)
              ▲   │
        Wucht │   │ Stich findet die Luecken
    zerschmet.│   ▼
        SCHWARM ◄──── FERNKAMPF (maeht Massen - prallt am Schild ab)
     (ueberrennt Einzelne, stirbt an Flaeche)
```

**Getestet.** Jeder Gegnertyp hat eine eindeutig beste Antwort:

| Gegner | Beste Waffe | Warum |
|--------|-------------|-------|
| Bauern-Schwarm | **Pfeil** | maeht Massen nieder |
| Skelett-Soldat | **Wucht** | Knochen zerschmettern |
| Untoter Ritter | **Stich** | findet die Luecken im Harnisch |
| Pesttraeger | **Feuer** | Faules brennt |
| Schatten | **Heiliges Licht** | koerperlos, nur Licht fasst ihn |
| Lebender Soeldner | **Stich** | Panzerbrecher |

**Balance-Fehler gefunden und behoben:** Mit den ersten Werten klebte Heiliges Licht
gegen JEDEN Untoten am 2.0-Cap - es waere die Universalloesung gewesen und haette alle
anderen Konter entwertet. Werte gesenkt, jetzt ist es nur bei Schatten die beste Antwort.

## B3. Rueckmeldung ist Pflicht [billig]

Float-Text: **"SCHWACH!"** in Gold bei Verwundbarkeit, **"PRALLT AB"** in Grau bei
Resistenz. Plus sichtbare Merkmale am Gegner (Ruestplatten, aufgedunsene Haut).

**WARUM:** Ohne Rueckmeldung ist das schoenste Konter-System unsichtbar - und dann
existiert es fuer den Spieler nicht.

## B4. Situative Ruestung [billig - KEINE neue Systemlogik]

Dieselbe Matrix, andere Richtung. Jede Wahl VERAENDERT das Spiel, statt nur Zahlen
zu erhoehen:

- **Gambeson:** schluckt Schnitte, ein schwerer Stich geht durch
- **Kettenhemd:** Ringe fangen die Klinge - gegen Wucht hilft kein Ring
- **Plattenverstaerkung:** Pfeile prallen ab, aber du bist langsam
- **Leinenkittel:** kaum Schutz, dafuer flink

**WARUM DAS GRATIS IST:** Es braucht keine neue Systemlogik, nur Werte. Die
Schadensarten-Matrix existiert bereits.

## B5. Telegraphen OHNE Bodenkreise [billig] (League-Prinzip)

**Die Regel:** Je hoeher der Schaden, desto laenger MUSS der Vorlauf sein.
"Klick - 800 Schaden" ohne Vorwarnung ist unlesbar und macht wuetend.

**ABER: keine bunten Kreise auf dem Boden.** Die Ankuendigung passiert ueber:
- Koerperhaltung
- Waffenrichtung
- Ton (Bogenschuetzen heben gleichzeitig die Boegen, Hornsignal)
- Partikel (Staub bei einem Ansturm)

**WARUM:** Das ist lesbar UND malerisch. Zelda-Kreise waeren in diesem Stil ein
Fremdkoerper. Und auf hohem Schwierigkeitsgrad blendet man die UI-Hilfe aus und laesst
nur Animation und Ton - **die eleganteste Schwierigkeitsstufe, die es gibt.**

---

# TEIL C - AUSBAU DER FAEHIGKEITEN (was fehlt)

## C1. Das Problem mit Learning-by-doing ❗

9 Stufen je Schule, automatische Freischaltung. **Am Ende kann JEDER Held ALLES.**
Keine Entscheidung, kein Verzicht, keine Build-Identitaet.

**Zwei Massnahmen, beide billig:**

1. **Erfahrung relativ zur Gegnerstaerke** (Dungeon Siege): Schwache Gegner geben kaum
   Fortschritt. Verhindert nebenbei das Ratten-Grinding.
2. **Hybride spezialisieren LANGSAMER.** Die Kurve so setzen, dass volle Meisterschaft
   in allen DREI Schulen in EINEM Durchgang NICHT erreichbar ist.

**Damit waehlt der Spieler implizit einen Build, indem er spielt.** Und die Sets (C4)
verstaerken diese Wahl.

## C2. Machtspitzen statt Zahlenwachstum [mittel] (League)

**"Jetzt kann ich etwas, was vorher nicht ging"** schlaegt **"mein Schaden ist von 41
auf 43 gestiegen"** um Laengen.

| Bei | Bekommst du |
|-----|-------------|
| Erster Schild | Schildwall-Faehigkeit |
| Rang Rottmeister | Zwei Trupps gleichzeitig kommandierbar |
| Rang Hauptmann | Befehlsreichweite +50%, Hornsignal |
| Banner des Grafen | Standarte-Aura ohne Fahnentraeger |
| Erster Spaeher | Feindmeldungen statt blinder Karte |

**Hinweis:** "Erstes Kriegspferd" GESTRICHEN - es gibt keine Reiter.

**So fuellst du Level-Cap 20.** (Empfehlung: 20, nicht 30. Lieber 20 Stufen, die alle
etwas bedeuten, als 30, von denen 20 nur Zahlen sind.)

## C3. Kombos ohne Magie [mittel] (League)

Der Held hat die Bausteine (Parade → Riposte, Kriegsschrei → Hinrichtung).
Auf **Truppenebene** fehlen sie:

- **Bresche schlagen:** Wucht bricht die Schildreihe → Stich stoesst durch → Schwarm stroemt nach
- **Zermuerben:** Schildwall haelt → Bogen beschiesst die Gedraengten → Moral bricht → sie fliehen
- **Enthaupten:** Monster-Held markieren → Fernkampf konzentriert → er faellt → die Horde bricht
- **Brand:** Oel ausschuetten → Feuerpfeil → brennende Sperrflaeche

**Hinweis:** Die Kette "Speerwall haelt Charge" ist GESTRICHEN (keine Reiter).

## C4. Sets als ROLLEN, nicht als Machtstufen [mittel]

**Die eiserne Regel:** Ein Set darf NICHT einfach staerker sein als alles andere -
sonst wirft man das gesamte Loot-System weg.

**Ein Set ist ANDERS, nicht besser:**

| Set | Ausrichtung |
|-----|-------------|
| **Kreuzritter** | stark gegen Untote, schwer, langsam |
| **Jaeger** | Bogen, leicht, schnell |
| **Kloster** | Magie und Mana, schwache Ruestung |

**WARUM DAS ZWEI PROBLEME LOEST:** Es gibt dem Spieler eine Identitaet zurueck, die
Learning-by-doing ihm nimmt. Einzelfunde koennen in ihrer Nische trotzdem besser sein.

**Sets leveln NICHT mit** (sonst sind sie ein Automat statt ein Ziel).
Stattdessen: **Der Schmied wertet Set-Teile auf.** ("Held farmt, NPCs refinen" bis
ins Endgame.)

**Set-Quellen:** Bosse, Monster-Lager, tiefe Kerker-Ebenen, das zweite Dorf, der Graf.
→ **Das ist der Grund, warum das Spiel MEHR ORTE braucht als Kerker + Kloster.**

## C5. Ausruestungsplaetze ergaenzen [billig]

**Helm, Handschuhe, Stiefel.** Ohne sie gibt es keine Sets - drei Teile sind kein Set.

---

# TEIL D - DER SCHMIED (Code-Kopplung: alles ueber `dorfLager`)

## D1. Warum braucht man ihn, wenn Loot besser ist?

**Der klassische Fehler:** Den Schmied als KONKURRENTEN zum Loot aufstellen. Dann
verliert er zwangslaeufig - Loot ist aufregend, Kaufen ist es nicht.

**Die Loesung: Er ist kein Konkurrent, er ist ein MULTIPLIKATOR auf den Loot.**
Er verkauft keine besseren Waffen - **er macht DEINE gefundenen Waffen besser.**
Und das ist exakt die Architektur-Regel "Held farmt, NPCs refinen".

## D2. Seine vier Rollen

1. **Aufwertung** [billig] - Waffenstufe erhoehen. Kostet Erz/Barren aus dem Dorf-Lager.
   Gilt fuer JEDE gefundene Waffe. Je tiefer die Mine, desto staerker die Beute.
   → **Mine und Loot verstaerken sich, statt sich zu ersetzen.**

2. **Sockel schlagen** [billig] - Fassungen fuer Edelsteine. Die Elementarpfeile
   entstehen bereits so. Der Schmied ist der EINZIGE Weg zu mehr Sockeln.

3. **Das Heer bewaffnen** [mittel] - Er produziert `waffen` ins Dorf-Lager.
   **Ohne Waffen keine Rekruten.** Er ist der Ausruester der ARMEE.
   **Das kann kein Loot ersetzen.**

4. **Schrott ankaufen** [billig] - siehe D3

**Sein Verkaufstisch:** NUR Grundausruestung und Werkzeug (Axt, Spitzhacke). Alles
darueber laeuft ueber Aufwertung.

## D3. Schrott, Waehrung und Muellabfuhr [billig]

**Problem:** Der Held muss Ausruestung loswerden koennen, und es waere inkonsistent,
wenn der Schmied nichts ankauft.

**Loesung:** Er kauft an, aber SCHLECHT. Rostiges Zeug = Schrott fuer ein paar Pfennige.
Keine Einnahmequelle - die **Muellabfuhr**.

**Und damit schliesst sich die Kette:**
```
Held bringt Schrott → Schmied macht 0815-Armeewaffen daraus →
Rekruten werden damit bewaffnet → Der Graf ist ueberrascht und schickt eine Belohnung
```
Der eigene LOOT ist besser als Standardzeug → **Loot wird zur ELITE-Ausruestung der
Armee** (verteilbar ueber das Zeughaus), nicht zum Ersatz fuer den Schmied.

**Waehrung:** **Pfennig** (Alltag) und **Gulden** (Gold). 100 Pfennig = 1 Gulden.
(Runde Zahl. Echte historische Umrechnungen schwankten stark - nicht nachbilden.)

## D4. Gesegnet und Verflucht [mittel] - DAS THEMA, nicht Deko

**"Verzaubert" waere generisch. Gesegnet/verflucht ist richtig.**

**Verfluchte Waffen:** machen staerker und fressen dich dabei auf. Leben pro Treffer,
Heilung wirkt schwaecher, du legst sie nicht mehr ab.

**WARUM DAS DIE WICHTIGSTE ITEM-MECHANIK IST:**
> **Das ist das ENDE IM KLEINEN.** Der Spieler trifft dieselbe Entscheidung, die der
> Waffenknecht getroffen hat und die er am Schluss vor dem Relikt nochmal trifft:
> **Macht gegen Preis.** Wer 100 Stunden lang kleine Fluchvorteile abgewogen hat, sitzt
> vor der letzten Wahl im Kloster ganz anders.
> Der Titel heisst "Der Preis der Unsterblichkeit" - **hier zahlst du ihn in Raten.**

**Geweihte Waffen** sind das Gegenstueck: stark gegen Untote (1,4x), **schwach gegen
Lebende (0,5x)**. → Ein Set fuer den Dungeon, ein Set fuer den Krieg. **Echte Wahl.**

**Optional [L12]:** Eine verfluchte Waffe koennte ueber Zeit eine **dauerhafte
Verletzung** verursachen (der Arm wird taub). Das macht den Fluch koerperlich statt
nur numerisch.

**Identifizieren:** vom Autor GESTRICHEN. Der Fluch ist sichtbar - der Spieler
entscheidet trotzdem.

---

# TEIL E - MONSTER (Code: `src/data/untote.ts`)

## E1. Die Untoten erzaehlen ihre Herkunft [mittel] ❗ KERNIDEE

Jeder Untote war einmal jemand. Beim Anklicken erscheint eine VERMUTUNG:

> *"Der zerrissene Kittel und die schwieligen Haende deuten auf einen Bauern - er hielt
> noch eine Sense, als sie ihn holten."*

**WARUM DAS SO STARK IST (drei Dinge auf einmal):**

1. **Lore ohne Textwand.** Man SIEHT, dass hier ein Dorf gestorben ist. Keine Notiz,
   kein Dialog - **der Gegner IST die Erzaehlung.** Und jede Beschreibung ist eine
   kleine Anklage: Die Untoten sind keine Monster, sie sind die TOTEN DEINER WELT.
   Der Waffenknecht hat sie nicht erschaffen - er hat sie BENUTZT.

2. **Taktik durch Lesbarkeit.** Was du SIEHST, sagt dir, was dich ERWARTET und was du
   KRIEGST. Trupp Gepanzerter: hart, lohnt sich. Bauernhorde: viele, schwach, kaum
   Beute - lauf durch oder mach Flaeche. **Der Spieler entscheidet, BEVOR er kaempft.**

3. **Sie beantwortet, warum in Graebern besseres Zeug liegt.** Weil dort Ritter liegen,
   keine Bauern.

| Herkunft | Staerke | Ausruestung | Beute | Budget |
|----------|---------|-------------|-------|--------|
| Bauer | schwach | Sense, Kittel | Pfennige | 1 |
| Handwerker | schwach-mittel | Werkzeug | Material | 1 |
| Kaufmann | schwach | feine Stoffe | Pfennige, Schmuck | 1 |
| Soldat | zaeh | Kettenhemd | brauchbare Klinge | 2 |
| Ritter | gefaehrlich | Harnisch | gute Ausruestung | 4 |
| **Monster-Held** | Elite | + Aura | Set-Teil, Edelstein | 8 |

## E2. Monster-Helden [mittel] - Autorwunsch

> *"Die Monster haben auch Helden und sowas verdient."*

Ein Monster-Held ist ein Untoter, der sich BEWAEHRT hat - er hat viele deiner Maenner
erschlagen und ist dadurch **INNERHALB SEINES LEVELS** aufgestiegen.

**WICHTIG - DAS IST KEIN AUTOSCALING:**
Er wird ein BESSERER Level-4-Untoter. Er wird **NIE Level 20.** Die Decke bleibt.
**Autoscaling loescht den Fortschritt des Spielers aus und ruiniert Spiele.**
Befoerderung im Feld tut das nicht.

Er traegt eine **Aura** (wie deine eigenen Anfuehrer), ist Prioritaetsziel, und
**wenn er faellt, bricht ein Teil der Horde.**

**Und der Bonus, den der Autor wollte:** Er hat GELERNT. Ein untoter Ritter, der zu
Lebzeiten Ritter erschlug, weiss, wo der Harnisch duenn ist → **+25% gegen Soldaten**
(nicht gegen den Helden).

**Die Untoten investieren in ihre Besten:** Der Beschwoerer stellt zuerst den wieder auf,
der am meisten getoetet hat. Der Heiler kuemmert sich zuerst um den Gefaehrlichsten.
**Das ist die LOGIK einer untoten Armee - sie hat keine Gefuehle, nur Effizienz.**

## E3. DIE GEFALLENEN ❗ Der staerkste Mechanismus im Spiel

Dein Soldat faellt. Zwei Wellen spaeter kommt er zurueck:
- **gleicher NAME** (den du kennst)
- **gleiches WAMS** (nur verranzter, untoter)
- **deine AUSRUESTUNG** (die er trug)
- **seine RAENGE** (die er sich verdient hat)

**WARUM:** Jeder Verlust wird DOPPELT bestraft - du verlierst ihn UND bekommst ihn als
Feind zurueck. **Dadurch wird "das Feld behalten" zur taktischen NOTWENDIGKEIT.**

**DIE GEGENMASSNAHME (wichtig, sonst ist es nur Bestrafung):**
Wer seinen eigenen Toten erneut faellt, kann ihn **BEERDIGEN**. Das kostet Zeit mitten
im Gefecht - aber es gibt **MORAL**, weil die Maenner sehen, dass ihr Hauptmann seine
Leute nicht liegen laesst.
**Wer sie liegen laesst, sieht sie wieder.**
→ Die Bergung ist keine Buchhaltung, sondern eine **Frage der EHRE**. Und sie ist
taktisch bezahlt.

**TECHNISCHE FOLGE (MUSS von Anfang an ins Roster, sonst teuer nachzuruesten):**
Ein gefallener Soldat wird **NICHT geloescht**. Status `gefallen`, bleibt im Datenmodell,
bis er beerdigt oder wieder aufgestellt wird.

## E4. Monster-Rollen [mittel]

**Mehr Gegner = Gewusel. Andersartige Gegner = Kampf.**

| Rolle | Zwingt zu |
|-------|-----------|
| **Blocker** (Schild) | Positionierung, Wucht/Stich |
| **Schwarm** (viele Schwache) | Flaechenwaffen |
| **Fernkaempfer** | Vorruecken |
| **Beschwoerer** | **MUSS ZUERST STERBEN** |
| **Unterstuetzer** (heilt) | Prioritaetsziel |
| **Elite** | traegt die Mechanik der Karte |

## E5. Spawn-BUDGET statt Gegnerzahl [billig] - loest das Gewusel

Jede Ebene bekommt ein **Budget**, keine feste Zahl. Ritter = 4 Punkte, Bauer = 1.
Die Tiefe erhoeht das BUDGET - aber der Generator gibt es aus, wie er will.
**Manche Ebenen kaufen 20 Schwache, manche 5 Harte.**

→ Automatisch Rhythmus-Abwechslung, ohne jede Ebene von Hand zu bauen.
→ Die Tiefe skaliert weiter, **ohne den Bildschirm zu verstopfen.**

**Die Herkunft IST die Budget-Kosten.** Ein Datensatz, kein zweites System.

## E6. Tueren als Kampfsystem [billig] - die andere Loesung fuers Gewusel

Eine Tuer veraendert, **wie viele Gegner dich gleichzeitig erreichen koennen.**
Raum voller Skelette oeffnen, anlocken, in den Tuerrahmen zurueckziehen → statt gegen
zwoelf kaempfst du gegen zwei.

**Das Gewusel wird zum taktischen Problem, das DU loest, statt zu Frust, den das Spiel
dir aufzwingt.**

Voraussetzungen (die V9-Tueren liefern die Haelfte):
- Der Spieler muss Tueren auch **SCHLIESSEN** koennen
- Gegner duerfen sich nicht gegenseitig durch die Engstelle schieben

## E7. Loot-Regen: NEIN, aber die Optik JA [billig]

**Problem:** "Jedes Skelett laesst eine rostige Klinge fallen" → Boden voll, Aufheben
wird Arbeit, und **jeder einzelne Fund wird bedeutungslos.**
Das toetet das Loot-System, noch **bevor** die FPS leiden.

**Loesung (visuell, nicht mechanisch):**
- Der Gegner **sieht aus wie das, was er traegt**
- Beim Tod bleibt sein Zeug als **DEKO am Boden** liegen, nicht als Item
  → Ein Schlachtfeld voller rostiger Klingen, durch die man watet
- **Die Masse wird per SCHLACHTFELD-BERGUNG eingesammelt** - nicht Stueck fuer Stueck,
  sondern als ERTRAG ins Dorf-Lager
- Der Held hebt nur auf, was BESONDERS ist

→ Realismus, Wirtschaft, **und keine einzige ueberfluessige Kiste am Boden.**

## E8. Dauerhafte Verletzungen [mittel] (Battle Brothers)

**Der Autor-Einwand gegen "bewusstlos statt tot" ist berechtigt:** In einem Solospiel ist
das nur verzoegerter Frust. → **In die Dev-Konsole als Schalter, nicht als Standard.**

**ABER: Dauerhafte Verletzungen sind besser als beides.**

Hans ueberlebt die Bresche - **mit einem zerschmetterten Arm.** Er kann keinen Schild
mehr halten. Er lebt weiter, er kaempft weiter, aber er ist **gezeichnet.**

- Erzeugt genau die Geschichten, die gewollt sind
- Ohne den Frust des Todes
- Ohne die Folgenlosigkeit des Heilens
- **Passt zur Feldscher-Rolle:** Wer schnell versorgt wird, behaelt den Arm

---

# TEIL F - AUSDRUECKLICH ABGELEHNT (nicht wieder vorschlagen)

| System | Warum nicht |
|--------|-------------|
| **Trefferchance-Wuerfel** | GIFT. Der Kampf lebt von Parade, Riposte, Telegraphen - von KOENNEN. Ein Fehlschlag nach perfekter Parade bricht das Versprechen. **Deterministisch bleiben.** |
| **Haltbarkeit / Reparatur** | Verwaltungsarbeit. Der Schmied hat schon vier Gruende. |
| **Rasterinventar** | Verwaltungsfrust. |
| **Identifizieren** | Vom Autor gestrichen. |
| **Bewusstlos-statt-tot (Held)** | Verzoegerter Frust im Solospiel → Dev-Konsole. |
| **Bunte Bodenkreise** | Fremdkoerper im malerischen Stil. Telegraph ueber Haltung/Ton. |
