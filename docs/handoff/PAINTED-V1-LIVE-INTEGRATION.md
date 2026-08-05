# Aldric Painted V1 ist live im Spiel (R247)

Umsetzung des Auftrags `ALDRIC-PAINTED-V1-LIVE-AUFTRAG.md`.

## Loader

- `src/gfx/heldGemalt.ts` - kennt NUR das Blatt-Format: laedt beide Sheets als
  Phaser-Spritesheet (128er Zellen), rechnet Richtung/Frame in einen
  Frame-Index um, meldet ueber `gemaltBereit`, ob die Variante da ist.
- Geladen wird beim ersten Bedarf aus `CombatScene` (nicht in der BootScene),
  damit der Spielstart nicht laenger dauert. Bis das Sheet da ist, zeichnet
  unveraendert die prozedurale Figur.
- `src/data/heldGemalt.ts` - alle Tuning-Werte (Fusspunkt, Groesse, Ursprung).
  EINE Datei aendern = die Figur sitzt anders.

## Richtungs- und Frame-Mapping (im Browser nachgemessen)

Die Engine fuehrt acht Richtungen, das Blatt vier Zeilen:

| Engine-dir | Blattzeile |
|-----------|------------|
| 0, 1 | unten (0) |
| 2, 3 | links (1) |
| 4, 5 | oben (3) |
| 6, 7 | rechts (2) |

| Spielzustand | Blattspalte |
|--------------|-------------|
| Stehen | idle (0) |
| `pstep` 0-3 | walk_1 - walk_4 (1-4) |
| Schlagphase 0-3 | windup, impact, impact, followthrough (5-7) |
| `combat.blocking` | block (8) |

Die vier Schlagphasen der bestehenden Maschine werden gleichmaessig auf die
drei gemalten Bilder verteilt, damit der Hieb zusammenhaengend bleibt.

## Varianten

- Ruestung UND Schild angelegt -> `gambeson-turmschild`
- sonst -> `base`
- Bogen und Reiten -> weiterhin der bisherige Renderer (keine Frames geliefert)

## Fussposition und Tiefensortierung

Der Auftrag verlangt, dass sich daran nichts aendert. Erst gemessen, dann
geloest:

- Der Fusspunkt liegt in ALLEN 72 Bildern beider Sheets exakt auf Y=123
  (Spanne 0 px) - Codex hat sauber ausgerichtet.
- Aus `HELD_GEMALT.hoeheFaktor` (0.64) und `originY` (0.57) folgt derselbe
  Fussabstand zur Spielerposition wie bei der prozeduralen Figur: beide
  28,8 px bei Standardskala. Nachgerechnet und im Spiel bestaetigt.
- Die Tiefensortierung rechnet mit der SPRITE-Unterkante. Das gemalte Blatt
  hat unter den Fuessen nur 5 px Rand, die prozedurale Zelle 20 px - ohne
  Ausgleich sortierte der Held 15,1 px zu frueh hinter Baeume. Behoben ueber
  `heldUnterkante()` in CombatScene (WorldScene nutzt es in `spielerTiefe`).
  Gemessen nach dem Fix: **0,00 px Unterschied** zum bisherigen Verhalten.

## Schalter

Dev-Konsole -> Tab mit dem 3D-Held-Test: "GEMALTER HELD (R247)". Standard AN.
AUS = sofort zurueck zur prozeduralen Zeichnung, kein Neustart noetig.
Persistiert in den Einstellungen (`heldGemalt`).

## Abnahme - Stand

| Punkt | Ergebnis |
|-------|----------|
| Vier Richtungsgruppen | OK - alle acht Engine-Richtungen treffen die richtige Zeile |
| Gehframes 1-4 | Zuordnung OK (pstep 0-3 -> walk_1-4), am Renderer geprueft |
| Frontangriff windup/impact/followthrough | OK - Frames 5, 6, 7 in Zeile unten |
| Kein Umspringen links/rechts | OK - Stand und Schlag liegen in derselben Zeile |
| Oben nur Hinterkopf | OK (im Blatt so gemalt, alle Frames) |
| Schildvariante blockt mit Spalte 8 | OK - `held_gemalt_gambeson`, Frame 8 |
| Fuss/Hitbox/Tiefe unveraendert | OK - 0,00 px Abweichung |
| tsc + vitest | sauber, 526/526 |

## Ehrliche Luecke

Der Gehzyklus ist als **Zuordnung** geprueft (pstep 0-3 -> walk_1-4, direkt am
Renderer), aber NICHT durch echte Laufbewegung im Spiel: der Testheld spawnt
in Rabenmoor am Westrand im Wasser und kommt dort nicht vom Fleck (0 px trotz
Tastendruck). Das ist ein Spawn-/Kollisionsthema der Probe, kein Renderfehler -
die Animation reagierte korrekt auf den Tastendruck (Wechsel Stand -> walk_1).
Der Autor sieht den vollstaendigen Gehzyklus beim ersten eigenen Laufen.

## Test-URL und Bedienung

`npm run dev`, dann `http://localhost:5173/`. Laufen mit WASD, Schlag mit der
Maus, Blocken mit der rechten Maustaste. Umschalten in der Dev-Konsole.
