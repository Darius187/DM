# Codex-Auftrag: Palisade, Tor und Wachturm bauen

## Kontext - worum es geht

Ravensmoor ist ein 2D-Spiel (Phaser 3) mit **Schrägdraufsicht von oben**.
Grundmass: **1 Kachel = 32 x 32 px** (`TILE = 32`). Alles in der Welt wird mit
**derselben Kamera-Neigung (~57 Grad ueber dem Boden)** gerendert bzw. aus GLB
zu Sprites gebacken - dadurch liegt die ganze Welt in einer Perspektive.

Es gibt einen **RTS-Modus**: der Spieler baut mit seinem Heer ein befestigtes
Lager (Zelte, Feldschmiede, Brunnen - und eben Palisade, Tor, Wachturm) und
verteidigt es gegen anrennende Untote. Die Wehrbauten sind damit **kein Deko,
sondern Kampfmechanik**: Monster muessen die Mauer einreissen, Bogenschuetzen
stehen im Turm, das Tor ist der Flaschenhals.

Aktuell sind Palisade/Tor/Turm **prozedurale Canvas-Zeichnungen** (Notloesung).
Sie sollen durch richtige 3D-Modelle ersetzt werden, die - wie die Camp-Props -
als GLB kommen und im Spiel zu Sprites gebacken werden.

## Warum das gerade wichtig ist (Fehlerbild des Autors)

Der Autor hat gemeldet:
- *"beim Turm ist da so ein seltsamer Rand"* und *"wenn ein Gebaeude abgebaut
  wird bleibt manchmal noch der Rand vom Gebaeude"* -> Ursache: **eingebackener
  Bodenteller/Schatten** im Modell.
- *"die Einheiten bleiben bei der Wegfindung oft an Ecken haengen ... z. B. bei
  den Palisaden"* und *"oft kommen die Einheiten nicht gut durch die Palisade"*
  -> Ursache u. a.: **Geometrie ragt ueber die eigene Grundflaeche hinaus**.
- *"das Tor belegt 2 Felder aber wenn man es anklickt sieht es so aus als waere
  es nur eine Palisade"* -> es fehlt eine erkennbare Tor-Optik ueber beide
  Kacheln.
- *"alter, warum sind die Assets alle nicht aufgestellt, die liegen alle auf dem
  Boden"* -> **Z-hoch statt Y-hoch exportiert**. Bitte unbedingt beachten.

Die Spiel-Logik dahinter (Belagerung, Sichtlinie, Bresche, Turm-Schutz) ist
inzwischen gebaut. Was fehlt, sind die Modelle - und die muessen masshaltig
sein, sonst kommen die Wegfindungs-Fehler zurueck.

---

# GRUNDREGELN (fuer ALLE drei Bauten)

1. **Kollision kommt IMMER aus der Karten-Kachel** (`T.PALISADE` / `T.TOR`),
   NIE aus dem Sprite. Das Modell darf optisch ueber die Kachel ragen (Hoehe),
   aber die **Grundflaeche** muss exakt stimmen.
2. **GLB ist Y-hoch** (glTF-Standard). Fusspunkt bei y = 0. Nicht Z-hoch
   exportieren - genau dieser Bug ist schon einmal passiert (alles lag flach).
3. **KEIN Bodenteller, KEIN eingebackener Schatten, KEIN Boden-Quad.** Der
   Schatten kommt aus dem Spiel.
4. **Sauberes Alpha** an den Raendern, kein halbtransparenter Saum - beim
   automatischen Beschneiden entstehen sonst sichtbare Kanten.
5. **Kein Ueberhang in Nachbarkacheln am BODEN.** Was oben ausladet (Dach,
   Bruestung) ist ok; was den Boden beruehrt, muss in der eigenen Grundflaeche
   stehen.
6. Material: eingebettete PBR-Materialien wie bei den Camp-GLBs. Keine
   handgemalten 2D-Ersatzgrafiken.

---

# 1) PALISADE - Kachel-SET mit 16 Varianten (kein Einzel-Prop!)

Die Palisade wird **je Kachel** gezeichnet und verbindet sich mit den Nachbarn.
Das Spiel berechnet eine Bitmaske aus den 4 Nachbarn und waehlt die passende
Variante - es braucht also **alle 16 Kombinationen**:

```
N = 1   (Nachbar oben)      mask 0  = freistehender Einzelpfahl
E = 2   (Nachbar rechts)    mask 10 = E+W  -> gerade Wand waagerecht
S = 4   (Nachbar unten)     mask 5  = N+S  -> gerade Wand senkrecht
W = 8   (Nachbar links)     mask 3  = N+E  -> Ecke
                            mask 15 = alle -> Kreuzung
```

Textur-Namen im Spiel: `palisade3d_0` ... `palisade3d_15`.

**Es reichen 6 Grundmodule**, weil das Spiel drehen kann:
Einzelpfahl (0) / Stumpf-Ende (1 Nachbar) / Gerade (2 gegenueber) /
Ecke (2 benachbart) / T-Stueck (3) / Kreuz (4). Wenn du die 16 Bakes direkt
lieferst, ist das aber auch recht - Hauptsache alle 16 Namen existieren.

**Masse je Kachel-Variante:**
- Grundflaeche: **genau 1 Kachel = 32 x 32 px** (in Blender: Frustumbreite
  exakt 1 Kachel).
- Gezeichnet wird: **32 px breit x ~85 px hoch** (`TILE * 2.67`).
- **Origin/Anker: unten-mitte (0.5, 1)** - der Fuss sitzt auf der UNTERKANTE
  der Kachel.
- Referenz-Bake der jetzigen Notloesung: Canvas 48 x 168, beschnitten auf
  48 x 128, Bodenlinie bei Zeile 116. Pfahlhoehe 1,85 / Radius 0,115 in
  Welteinheiten - daran die Holzstaerke ausrichten.

**Kritisch:** Die Verbindungsstellen muessen **buendig** sein. Bei `mask 10`
(E+W) muss der linke Rand exakt an den rechten Rand der Nachbarkachel
anschliessen - sonst entstehen Luecken in der Wand, und die sieht man sofort.

---

# 2) TOR - belegt exakt 2 Kacheln, in BEIDEN Richtungen

Das Tor deckt **zwei Kacheln** ab (Doppeltor). Zwei Einbaulagen, zwei Zustaende,
insgesamt **10 Texturen**:

| Lage | Varianten | Textur-Namen |
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
- Holzstaerke und Hoehe **identisch zur Palisade**, damit es buendig einreiht.

**Zustaende:** `zu` = geschlossen (blockiert), `auf` = offen (Durchfahrt sichtbar
frei, Fluegel zur Seite geschwenkt). Beide Zustaende als eigene Variante bauen.

**Bitte deutlich als Tor erkennbar machen** (Torbogen/Querbalken/Beschlaege,
kraeftige Pfosten links und rechts) - der Autor konnte das Tor bisher optisch
nicht von einer Palisade unterscheiden.

---

# 3) WACHTURM - 2x2 Kacheln

- Grundflaeche: **2 x 2 Kacheln = 64 x 64 px**. **Alle vier Beine muessen
  INNERHALB dieser Flaeche stehen.** Der bisherige Turm ragte darueber hinaus -
  daher der Rand-Effekt und die Ecken-Haenger bei der Wegfindung.
- Gezeichnet: **132 px hoch**, Anker **(0.5, 0.78)** - also nicht ganz unten,
  damit die vorderen Beine in den 2x2-Block reichen.
- Die Plattform (wo die Besatzung steht) liegt **~40 px ueber dem Fusspunkt**
  (`TURM.hoeheOffset = 40`). Die Bruestung muss dort sichtbar sein, weil das
  Spiel die Besatzung genau auf dieser Hoehe zeichnet.
- Kapazitaet **2 Mann** - die Plattform muss optisch fuer 2 Figuren reichen,
  und die Bruestung darf die Figuren nicht komplett verdecken (halbhoch oder
  mit Schiessscharten).
- **Kein Bodenteller** (Grundregel 3) - genau der war die Ursache fuer den
  "seltsamen Rand".

---

# 4) WAS DAS SPIEL BEREITS SELBST MACHT (nicht mitliefern)

- Schatten, Y-Sortierung, Lebensbalken, Bau-Baustelle, Reparatur-Optik.
- Die Masken-Auswahl (welche der 16 Palisaden-Varianten gezogen wird).
- Tor auf/zu-Umschaltung, Kollision, Sichtlinie, Bresche.
- Beschaedigungs-Stufen werden aktuell NICHT aus eigenen Modellen gezogen -
  wenn du optionale "beschaedigt"-Varianten liefern willst, sag Bescheid,
  dann verdrahte ich sie.

---

# 5) LIEFERUNG

- Ablage wie bei den Camp-Props: GLB unter `assets/props/` (Unterordner
  `wehrbau/`), unveraendert mit eingebetteten PBR-Materialien.
- Bitte die **Dateinamen** melden, dann trage ich sie in die Bake-Registrierung
  (`src/gfx/*Bitmaps.ts`) mit den oben genannten Textur-Keys ein.
- Falls sich eines der Masse aus Modellgruenden nicht halten laesst: **nicht
  schweigend abweichen**, sondern den abweichenden Wert melden - ich ziehe dann
  die Konstante im Code nach (`TILE`-Vielfache in `src/data/rts.ts`).

# 6) ABNAHME-CHECKLISTE (bitte vor Abgabe durchgehen)

- [ ] Y-hoch exportiert (nicht Z-hoch) -> Modell steht, liegt nicht.
- [ ] Kein Bodenteller, kein eingebackener Schatten.
- [ ] Palisade: alle 16 Masken vorhanden, Verbindungen buendig, keine Luecken.
- [ ] Palisade: Grundflaeche exakt 1 Kachel, nichts ragt am Boden hinaus.
- [ ] Tor: genau 2 Kacheln breit bzw. hoch, buendig zur Palisade.
- [ ] Tor: `auf` und `zu` klar unterscheidbar, als Tor erkennbar.
- [ ] Turm: alle Beine innerhalb 2x2, Plattform auf ~40 px Hoehe, Platz fuer 2.
- [ ] Sauberes Alpha ohne halbtransparenten Saum.
