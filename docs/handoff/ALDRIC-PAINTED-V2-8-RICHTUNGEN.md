# Uebergabe: Aldric Painted V2 ist live

## Stand

Der stämmige Painted-V1-Held ist im Live-Pfad durch einen schlankeren,
vollstaendig gemalten Abenteurer mit gruendem Umhang ersetzt. Das alte V1-Paket
bleibt als Historie im Repo, wird aber nicht mehr automatisch ausgewaehlt.

## Blattvertrag

- Asset: `assets/sprites/hero-painted-v2/base/aldric-abenteurer-schwert-painted-16x8.png`
- Manifest: `assets/sprites/hero-painted-v2/base/aldric-painted-v2.json`
- Zelle: 128x128, Blatt: 2048x1024, 128 nichtleere Frames
- Zeilen: S, SW, W, NW, N, NE, E, SE - exakt `angleToDir8`, kein Zusammenlegen
- Spalten: Stand; Gehen 1-8; Hieb 1-6; Block
- Hieb: Ausholen, frueher Hieb, Treffer, spaeter Hieb, Nachziehen, Erholen
- Tempo: Gehen 75 ms; Hieb 90/50/45/50/75/110 ms

## Live-Anschluss

- Format, Richtungen und Framewahl: `src/gfx/heldGemalt.ts`
- Groesse, Fusspunkt und Timings: `src/data/heldGemalt.ts`
- Renderer-Anschluss: `src/world/CombatScene.ts`
- Werkbank: `tools/sprite-werkbank.html`
- Der gemalte Pfad ist weiter ueber `heldGemalt` abschaltbar.
- Alle Nicht-Schwert-Klassen und die leere Hand bleiben im bisherigen Fallback.
  So zeigt der Held niemals eine falsche Klinge. Bogen und Stab brauchen als
  Naechstes ihre eigenen Spann-/Zauber-Koerperanimationen.

## Verifiziert

- Werkbank: alle acht Richtungsknoepfe, 8er-Lauf und 6er-Hieb ohne Browserfehler
- Echtes Phaser-Spiel: V2-Held geladen, bewegt und Schlagframe gezeigt
- Tests: `tests/heldGemaltV2.test.ts` prueft 8 Richtungen, 8 Laufbilder,
  6 gewichtete Hiebphasen, Block und Frame 127
- Reproduzierbarer Bau: `scripts/build_painted_hero_v2.py`

## Bewusste Grenze

V2 ist eine vollstaendig gemalte Figur, kein Paperdoll. Ruestung, Umhang und
Schwert werden in diesem Blatt nicht als Canvas-Schichten aufgesetzt. Weitere
sichtbare Ausruestungsstufen brauchen deshalb eigene vollstaendig gemalte
16x8-Blaetter. Bogen-/Stab-Koerperanimationen bleiben die naechste Stufe.
