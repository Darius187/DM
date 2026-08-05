# Pruefung des Rig-Prototyps V1 (Claude Code -> Codex)

Geprueft: `assets/sprites/hero-rig-v1/prototype/` (Commit 2a38c79).
Werkbank: `tools/sprite-werkbank.html` laedt jetzt dieses Paket.

## Urteil: BEWEGUNGSPRINZIP BESTANDEN - ein echter Befund offen

Der Wechsel auf ein Blender-Rig loest das Problem, das die
Bildgenerierung nicht loesen konnte: alle 36 Posen kommen aus derselben
Geometrie, es gibt keinen Gesichts- oder Proportionsdrift mehr. Die
Pipeline ist ausserdem reproduzierbar (blend + Renderer + Packer liegen
bei) - das war bei den generierten Paketen nie der Fall.

## Gemessen (nicht geschaetzt)

| Test | Ergebnis |
|------|----------|
| Ebenen-Stapel gegen 3D-Composite, **Silhouette** | **0 von 111.917 Pixeln** abweichend - exakt deckungsgleich |
| Leere Frames | 0 von 108 (Koerper/Waffe/Schild je 36) |
| Beschnitt am Zellrand | 0 Randpixel in allen 36 Frames |
| Fusspunkt-Wanderung je Richtung | 3 / 4 / 7 / 6 px (Ausschlag im followthrough - gewollt) |
| Gehzyklus | walk_1 == walk_3 (Durchgangspose), walk_2 vs walk_4 ~1700-2200 px Unterschied - **korrekter 4-Phasen-Zyklus** |
| Ebenen-Stapel gegen 3D-Composite, **Farbe** | 69-243 px je Frame abweichend - siehe Befund |

## Der eine echte Befund: die FAUST fehlt als Vordergrund-Ebene

Silhouette und Alpha stimmen perfekt, aber die FARBE weicht an einer
Stelle ab: **am Griff**. Im 3D-Composite umgreift die Hand den Griff -
ein Teil der Waffe liegt hinter der Faust. Beim flachen Stapeln liegt
die Waffe als Ganzes vor oder hinter dem Koerper; die Hand verschwindet
darunter. Betroffen sind alle vier Richtungen, am staerksten `down` und
`right` im `impact`-Frame.

Das ist kein Fehler im Rig, sondern eine prinzipielle Grenze flacher
Ebenen. Die uebliche Loesung: **eine vierte Mini-Ebene "Faust vorne"**,
die im Rig mitgerendert wird und beim Stapeln GANZ OBEN liegt (nur die
greifende Hand, sonst transparent). Damit gilt wieder:
`... > weapon > hand_front`. Bitte in derselben Render-Kette erzeugen.

Alternative, falls das zu teuer ist: pro Kombination ein Composite
rendern - das ist aber Kombinatorik-Explosion (6 Ruestungen x 8 Waffen
x 5 Schilde = 240 Sheets) und faellt damit aus.

Zum Nachsehen: Werkbank oeffnen, "Unterschied zeigen (rot)" anhaken.
Das Rot sitzt genau auf der Faust.

## Was der Prototyp NICHT beweist (und auch nicht soll)

Der Detailgrad. Low-Poly-Bloecke, kein Gesicht, steife Arme beim Gehen.
Codex sagt das selbst - hier ging es nur um die Bewegung. Die Frage,
ob das Modell auf den Ziel-Detailgrad gehoben werden kann, ist offen
und entscheidet der Autor. Ein Argument dafuer: das Projekt backt
Requisiten (Truhe, Wachturm, Zelte) bereits ueber
`src/demo3d/propBackofen.ts` aus three.js zu Sprites - die 3D-zu-Sprite-
Strecke ist im Haus also erprobt.

## Reihenfolge, die ich vorschlage

1. Faust-Vordergrund-Ebene nachruesten (kleiner Eingriff, gleiche
   Renderkette) - dann ist der Ebenen-Vertrag vollstaendig.
2. Detailgrad am Modell heben, so lange nur EINE Variante
   (Hemd + solide Klinge + Holzschild) - Autor gibt den Stil frei.
3. Erst danach Ruestungen, Helme, Umhang und die restlichen Waffen
   aus `docs/CODEX-VARIANTEN-LISTE.md` auf dasselbe Rig.

Nicht vervielfaeltigen, bevor Schritt 2 abgenommen ist.
