# WEHRBAU-SPEC - Palisade, Tor, Wachturm (verbindlich fuer Codex)

Alle Zahlen sind aus dem LAUFENDEN Code entnommen (nicht geschaetzt).
Grundmass: **1 Kachel = 32 x 32 px Welt** (`TILE = 32`).

## GRUNDREGELN (fuer ALLE drei)

1. **Kollision kommt IMMER aus der Karten-Kachel** (`T.PALISADE` / `T.TOR`),
   NIE aus dem Sprite. Das Modell darf also optisch ueber die Kachel ragen
   (Hoehe), aber die **Grundflaeche** muss exakt stimmen.
2. **GLB ist Y-hoch** (glTF-Standard). Fusspunkt bei y=0. Nicht Z-hoch
   exportieren - sonst liegen die Modelle flach (genau dieser Bug ist passiert).
3. **KEIN Bodenteller, KEIN eingebackener Schatten, KEIN Boden-Quad.** Der
   Schatten kommt aus dem Spiel. Eingebackene Teller sind die Ursache fuer den
   "seltsamen Rand" beim Turm und die Reste nach dem Abbau.
4. **Sauberes Alpha** an den Raendern (kein halbtransparenter Saum) - beim
   automatischen Beschneiden entstehen sonst sichtbare Kanten.
5. **Kein Ueberhang in Nachbarkacheln am BODEN.** Was oben ausladet (Dach,
   Bruestung) ist ok; was den Boden beruehrt, muss in der eigenen Grundflaeche
   stehen.

---

## 1) PALISADE - Kachel-SET mit 16 Varianten (kein Einzel-Prop!)

Die Palisade wird **je Kachel** gezeichnet und verbindet sich mit den Nachbarn.
Das Spiel berechnet eine Bitmaske aus den 4 Nachbarn und waehlt die passende
Variante - es braucht also **alle 16 Kombinationen**:

```
N = 1   (Nachbar oben)      Beispiel: mask 0  = freistehender Einzelpfahl
E = 2   (Nachbar rechts)              mask 10 = E+W  -> gerade Wand waagerecht
S = 4   (Nachbar unten)               mask 5  = N+S  -> gerade Wand senkrecht
W = 8   (Nachbar links)               mask 3  = N+E  -> Ecke
                                      mask 15 = alle -> Kreuzung
```
Textur-Namen im Spiel: `palisade3d_0` ... `palisade3d_15`.

**Masse je Kachel-Variante:**
- Grundflaeche: **genau 1 Kachel = 32 x 32 px** (in Blender: Frustumbreite ist
  exakt 1 Kachel breit).
- Gezeichnet wird: **32 px breit x ~85 px hoch** (`TILE * 2.67`).
- **Origin/Anker: unten-mitte** (0.5, 1) - der Fuss sitzt auf der UNTERKANTE
  der Kachel.
- Referenz-Bake: Canvas 48 x 168, auf 48 x 128 beschnitten, Bodenlinie bei
  Zeile 116. Die aktuelle prozedurale Palisade nutzt Pfahlhoehe 1,85 und
  Radius 0,115 (Welt-Einheiten) - daran die Holzstaerke ausrichten.

**Wichtig:** Die Verbindungsstellen muessen **buendig** sein: bei `mask 10`
(E+W) muss der linke Rand exakt an den rechten Rand der Nachbarkachel
anschliessen - sonst entstehen Luecken in der Wand.

---

## 2) TOR - belegt exakt 2 Kacheln, in BEIDEN Richtungen

Das Tor deckt **zwei Kacheln** ab (Doppeltor). Es gibt zwei Einbaulagen und
zwei Zustaende - insgesamt **10 Texturen**:

| Lage | Varianten | Textur-Name |
|---|---|---|
| waagerecht (Wand laeuft E-W) | 1 | `tor3d_zu_h`, `tor3d_auf_h` |
| senkrecht (Wand laeuft N-S) | 4 (NS-Maske 0, 1, 4, 5) | `tor3d_zu_v_<mask>`, `tor3d_auf_v_<mask>` |

Die NS-Maske beim senkrechten Tor sagt, ob oben/unten eine Wand anschliesst
(1 = oben, 4 = unten, 5 = beides, 0 = frei) - damit die Anschlusspfosten passen.

**Masse:**
- Waagerecht: gezeichnet **~65 px breit** (`TILE * 2.05`) x ~85 px hoch,
  Anker unten-mitte ueber BEIDEN Kacheln.
- Senkrecht: gezeichnet 32 px breit x **~117 px hoch** (`TILE * 2.67 + TILE`),
  Anker an der Unterkante der UNTEREN Kachel.
- Holzstaerke/Hoehe **identisch zur Palisade**, damit es buendig einreiht.

**Zustaende:** `zu` = geschlossen (blockiert), `auf` = offen (Durchfahrt sichtbar
frei). Beide Zustaende als eigene Variante bauen.

---

## 3) WACHTURM - 2x2 Kacheln

- Grundflaeche: **2 x 2 Kacheln = 64 x 64 px**. **Alle vier Beine muessen
  INNERHALB dieser Flaeche stehen.** (Der bisherige Turm ragte darueber hinaus -
  daher der Rand-Effekt und die Ecken-Haenger.)
- Gezeichnet: **132 px hoch**, Anker **(0.5, 0.78)** - also nicht ganz unten,
  damit die vorderen Beine in den 2x2-Block reichen.
- Die Plattform (wo die Besatzung steht) liegt **~40 px ueber dem Fusspunkt**
  (`TURM.hoeheOffset = 40`). Die Bruestung sollte dort sichtbar sein, weil die
  Besatzung dort gezeichnet wird.
- Kapazitaet 2 Mann - die Plattform muss optisch fuer 2 Figuren reichen.
- **Kein Bodenteller** (siehe Grundregel 3).

---

## 4) WAS DAS SPIEL BEREITS SELBST MACHT (nicht mitliefern)

- Schatten, Y-Sortierung, Lebensbalken, Bau-Baustelle, Reparatur-Optik.
- Die Masken-Auswahl (welche der 16 Palisaden-Varianten) - Codex liefert nur
  die 16 Modelle/Bakes.
- Tor auf/zu-Umschaltung und Kollision.

## 5) HAEUFIGE FEHLERQUELLEN (bitte pruefen vor Abgabe)

- [ ] Z-hoch exportiert -> Modell liegt flach.
- [ ] Bodenteller/Schatten eingebacken -> "seltsamer Rand", Reste nach Abbau.
- [ ] Palisaden-Varianten nicht buendig -> Luecken in der Wand.
- [ ] Tor schmaler/breiter als 2 Kacheln -> passt nicht in die Reihe.
- [ ] Turm-Beine ausserhalb der 2x2-Flaeche -> Einheiten haengen an der Ecke.
- [ ] Halbtransparenter Alpha-Saum -> sichtbare Kante nach dem Beschnitt.
