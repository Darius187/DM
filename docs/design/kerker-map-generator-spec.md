# Kerker-Map-Generator - lueckenlos gefuellt, gemischte Raumgroessen

Auftrag fuer Claude Code (Fable). Neuer Generator als eigenes Modul. Erzeugt eine
Kerker-Map: die Flaeche ist fast vollstaendig mit aneinandergrenzenden, gemauerten Raeumen
gefuellt, kaum tote Wandmasse, keine langen Gaenge durch Leere. Eine Karte, ein Stil.
Keine Hoehle, kein zweiter Modus, kein Regler.

WICHTIG - dies ersetzt NICHT den vorherigen Spec (`dungeon-generator-spec-diablo1.md`).
Der bleibt fuer gestreute Raeume in Wandmasse (Passagen, Vaults im Fels). DIESER hier ist
der Haupt-Kerker-Generator. Beide koennen spaeter koexistieren.

## Der Unterschied zum vorherigen Spec (bitte lesen)
- Vorher: Raeume als Inseln in eine grosse Wandmasse geschnitten, mit Gaengen dazwischen.
  Viel tote Wand.
- JETZT: Die Flaeche wird komplett in Raeume zerlegt, die sich beruehren. Wand ist nur die
  duenne Trennlinie zwischen zwei Raeumen. Man tritt aus einem Raum durch eine Tuer direkt
  in den naechsten. Fast keine ungenutzte Flaeche.

## Kernprinzip: rekursive Flaechenteilung
Die ganze Grid-Flaeche ist ein Rechteck. Teile es rekursiv in kleinere Rechtecke, bis lauter
raumgrosse Stuecke uebrig bleiben. Jedes Stueck IST ein Raum (nicht ein Raum irgendwo im
Stueck) - deshalb fuellen die Raeume die Flaeche lueckenlos. Die Schnittlinien werden zu
1-Tile-Waenden. In diese Waende werden Tueren geschlagen.

---

## Algorithmus

### Schritt 1 - Teilen mit gemischten Groessen (DER KERN)
Rekursive Funktion `teile(rect)`:

```
teile(rect):
  # zu klein zum Teilen -> wird Raum
  if rect.breite < 2*minRaum+1 UND rect.hoehe < 2*minRaum+1:
     -> Blatt (Raum)

  # gross genug fuer EINEN Raum und Zufall sagt stopp -> grosser Raum/Saal
  else if rect.breite <= maxRaum UND rect.hoehe <= maxRaum UND random() < stopChance:
     -> Blatt (Raum)

  # sonst weiter teilen
  else:
     achse = laengere Seite bevorzugen (mit etwas Zufall)
     # Schnitt NICHT in der Mitte, sondern zufaellig im erlaubten Bereich
     # -> das erzeugt ungleiche Raumgroessen
     schnitt = random(minRaum+1 .. laenge-minRaum-1)
     teile die beiden Haelften rekursiv
```

Die GEMISCHTEN GROESSEN, die du willst, entstehen aus zwei Stellen:
- Der zufaellige Schnittpunkt (nicht Mitte) macht die zwei Haelften ungleich gross.
- `stopChance` laesst manche grosse Stuecke stehen (Saele), waehrend andere tief zerteilt
  werden (kleine Zellen). Richtwert `stopChance` ~0.3-0.5. Hoeher = mehr grosse Raeume.
- Richtwerte: `minRaum` ~3 Tiles, `maxRaum` ~11 Tiles. Beides per Konfig.

### Schritt 2 - Raeume ausfuellen mit Trennwaenden
- Jedes Blatt-Rechteck wird zu `Raumboden`, ABER die aeusserste Tile-Reihe bleibt `Wand`.
- So entsteht zwischen je zwei benachbarten Raeumen eine gemeinsame 1-Tile-Wand.
- Keine Gaenge, keine geschrumpften Raeume mit Abstand - die Raeume beruehren sich direkt.

### Schritt 3 - grosse/unregelmaessige Saele (optional, bricht die Rechteck-Gleichheit)
- Waehle einige benachbarte Raum-Paare (z.B. 10-20%) und entferne ihre Trennwand.
- Ergebnis: groessere, teils L-foermige Raeume neben den kleinen. Das verstaerkt die
  Abwechslung eng/weit und nimmt dem Layout das reine Schachbrett-Gefuehl.

### Schritt 4 - Tueren setzen (Erreichbarkeit)
- Baue einen Adjazenz-Graphen: welche Raeume teilen eine gemeinsame Wand.
- Spanning Tree ueber den Graphen -> mindestens eine Tuer pro noetiger Verbindung, sodass
  ALLE Raeume erreichbar sind (kein abgeschnittener Raum ausser gewollte Vaults).
- Danach 15-25% zusaetzliche Tueren zwischen benachbarten Raeumen -> Schleifen, damit man
  nicht staendig zurueckmuss.
- Eine Tuer = ein Wand-Tile auf der gemeinsamen Grenze wird zu `Tuer`.

### Schritt 5 - abgekapselte Raeume (Vaults)
- Waehle einige Raeume (Richtwert 3-6) und gib ihnen im Graphen GENAU EINE Tuer.
- Sackgasse: nur ueber diese eine Tuer erreichbar, sonst von Wand umschlossen.
- Ein Teil davon kann eine `Geheimtuer` bekommen (rendert als Wand, oeffnet bei Interaktion).
- Vaults tragen bevorzugt die Belohnungs-/Gefahren-Rollen (siehe unten).

---

## Raum-Rollen (Purpose - damit kein Raum ungenutzt ist)
Beim Erzeugen bekommt jeder Raum ein Etikett, das Groesse, Props, Gegner und Licht steuert.
(Gleiche Tabelle wie im vorherigen Spec - gilt unveraendert.)

| Rolle          | passt zu Groesse | Haeufigkeit | Inhalt / Gegner / Licht          |
|----------------|------------------|-------------|----------------------------------|
| Eingang        | mittel           | genau 1     | Treppe/Portal, keine Gegner      |
| Kapelle/Gebet  | mittel           | 0-1         | Altar, Baenke, Kerzen; warm      |
| Folterkammer   | klein            | 1-2         | Ketten, Kaefige, Blut; mittel    |
| Kerker/Verlies | mittel           | 1-2         | Zellen, Knochen; dunkel          |
| Krypta         | mittel           | 1-2         | Sarkophage; Grabschatten; kalt   |
| Beinhaus       | klein            | 0-1         | Knochenhaufen; Skelette          |
| Schatzkammer   | klein            | 1-2 (Vault) | Truhen, Loot; evtl. Waechter     |
| Skriptorium    | klein            | 0-1         | Buecher, Lore-Trigger            |
| Wachstube      | mittel           | 1-2         | viele Gegner; Fackeln            |
| Bossarena      | gross            | genau 1     | Blutfont; Boss; Finale           |

Zuweisung: Eingang = Startraum. Bossarena = Raum mit groesster Graph-Distanz zum Eingang.
Schatzkammer bevorzugt in einen Vault. Grosse Saele aus Schritt 3 eignen sich fuer Wachstube
oder Bossarena, kleine Zellen-Cluster fuer Kerker/Beinhaus. Rest gewichteter Zufall.

Blut-Progression (bestehendes Ravensmoor-Motiv): je naeher an der Bossarena, desto mehr
Blut-Props und desto kaelter/dunkler. Direkt davor der Blutstrom-Gang.

---

## Output-Format (Kompatibilitaet - zuerst pruefen)
Gleiche Tile-Typen wie der bestehende Editor: `Wand`, `Raumboden`, `Tuer`, `Gang` (Gang hier
kaum noetig, aber vorhalten). Vor dem Bauen bitte das aktuelle Tile-Enum / Map-Datenmodell
ansehen und den Output daran angleichen, NICHT neu erfinden. Pro Raum ausgeben:
`{id, rect, rolle, istVault, tueren[], spawns[]}`, dazu `entranceRoomId`, `bossRoomId`.
Spawns nur als Marker - das Spawnen macht die bestehende Runtime.

## Reihenfolge fuer knappe Zeit
1. Schritt 1+2+4 = der Kern (lueckenlos gefuellte Raeume mit Tueren, alle erreichbar).
   Im Editor "AUS GENERATOR" testen: begehbar, gemischte Groessen, keine tote Flaeche.
2. Schritt 5 (Vaults), dann Schritt 3 (Saele/Merge).
3. Rollen + Blut-Progression zuletzt.

## Was ich nicht sicher weiss
- Ob Diablo 1 intern exakt so gebaut hat, weiss ich nicht - der Originalcode ist nur
  nachgebaut bekannt. Aber der beschriebene EFFEKT (lueckenlos gefuellt, aneinandergrenzende
  Raeume gemischter Groesse, kaum tote Wand) ist mit rekursiver Flaechenteilung genau das,
  was rauskommt.
- Das genaue bestehende Tile-Enum und Map-Datenmodell kenne ich nicht - Output daran anpassen.
- Alle Zahlen (minRaum, maxRaum, stopChance, Vault-Anzahl) sind Richtwerte und muessen an die
  gewuenschte Kartengroesse und das Gefuehl angepasst werden.

---
---

# ERGAENZUNG: SETPIECES (Pflicht - ohne sie ist der Generator unvollstaendig)

**Aus dem Diablo-1-Dokument, Kapitel 4.4. Das ist der wichtigste Zusatz.**

## Was ein Setpiece ist
Ein **HANDGEBAUTER Raum**, der in den zufaelligen Grundriss eingesetzt wird.
Nicht generiert - GEBAUT. Er hat feste Zellen, feste Objekte, feste Skripte.

## Warum das den Generator rettet
Der Widerspruch "zufaellige Dungeons UND Raeume, die die Geschichte erzaehlen" loest sich
nur so. Diese Raeume duerfen KEINE Wuerfelergebnisse sein:

- Leichenkammer (Sammlung der Toten)
- Aushoehlungskammer (Schlachterwerkzeuge - hier werden sie praepariert)
- Reifehalle (schlafende, reanimierte Koerper)
- Bindealtar
- Blutstrom-Gang vor dem Boss
- **Insel-Raum mit dem Stadtportal (ab Ebene 3)**
- Zellen mit Gefangenen (Rettung -> sie werden Dorf-NPCs)

## Die Aenderung am Algorithmus (WICHTIG - Reihenfolge!)

```
FALSCH:  Raeume generieren -> hinterher Setpieces reinquetschen
RICHTIG: 1. SETPIECES ZUERST platzieren (mit ihren geforderten Anschluessen)
         2. DANN den Rest der Flaeche mit zufaelligen Raeumen auffuellen
         3. DANN Tueren/Verbindungen
         4. DANN Erreichbarkeit pruefen (Flood-Fill!)
```

## Datenmodell
```ts
interface SetPiece {
  id: string;
  breite: number; hoehe: number;
  anschluesse: Richtung[];        // wo Tueren hin MUESSEN
  zellen: SetPieceZelle[];        // handgebauter Grundriss
  objekte: SkriptObjekt[];        // Altar, Kaefig, Portal, Truhe
  nurAufEbenen?: number[];        // z.B. Portal nur ab Ebene 3
  hoechstensEinmal: boolean;
}
```

## Erreichbarkeit (Pflicht)
Nach der Erzeugung: **Flood-Fill vom Eingang.**
Eingang, Ausgang, Bossraum und JEDES Setpiece muessen erreichbar sein.
Wenn nicht: reparieren, nicht neu wuerfeln.

## Bevoelkerung: erst Geometrie, dann Inhalt
1. Geometrie → 2. Tueren/Treppen → 3. **Setpieces** → 4. Monster →
5. Fallen → 6. Behaelter → 7. Beute → 8. Licht → 9. Deko

**Monster NICHT direkt neben dem Eintrittspunkt.** Sie duerfen notwendige Uebergaenge
nicht vollstaendig blockieren.

## Spawn-Budget statt Gegnerzahl
Siehe `src/data/untote.ts`. Die Ebene bekommt ein BUDGET (Ritter = 4 Punkte, Bauer = 1).
Der Generator gibt es aus, wie er will. Manche Ebenen: 20 Schwache. Manche: 5 Harte.
→ Abwechslung im Rhythmus, ohne den Bildschirm zu verstopfen.
