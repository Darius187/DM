# Uebergabe: Aldric Painted V2 ist live

## Stand

Der stämmige Painted-V1-Held ist im Live-Pfad durch einen schlankeren,
vollstaendig gemalten Abenteurer mit gruendem Umhang ersetzt. Das alte V1-Paket
bleibt als Historie im Repo, wird aber nicht mehr automatisch ausgewaehlt.

## Blattvertrag

- Asset: `assets/sprites/hero-painted-v2/base/aldric-abenteurer-schwert-painted-32x8.png`
- Manifest: `assets/sprites/hero-painted-v2/base/aldric-painted-v2.json`
- Zelle: 128x128, Blatt: 4096x1024, 256 nichtleere Frames
- Zeilen: S, SW, W, NW, N, NE, E, SE - exakt `angleToDir8`, kein Zusammenlegen
- Spalten: Stand; Gehen 1-24; Hieb 1-6; Block
- Hieb: Ausholen, frueher Hieb, Treffer, spaeter Hieb, Nachziehen, Erholen
- Tempo: Gehen 40 ms; Hieb 90/50/45/50/75/110 ms

## Live-Anschluss

- Format, Richtungen und Framewahl: `src/gfx/heldGemalt.ts`
- Groesse, Fusspunkt und Timings: `src/data/heldGemalt.ts`
- Renderer-Anschluss: `src/world/CombatScene.ts`
- Werkbank: `tools/sprite-werkbank.html`
- Der gemalte Pfad ist weiter ueber `heldGemalt` abschaltbar.
- Alle Nicht-Schwert-Klassen und die leere Hand bleiben im bisherigen Fallback.
  So zeigt der Held niemals eine falsche Klinge. Bogen und Stab brauchen als
  Naechstes ihre eigenen Spann-/Zauber-Koerperanimationen.

## Verifiziert bis V2.1

- Werkbank: alle acht Richtungsknoepfe, 16er-Lauf und 6er-Hieb ohne Browserfehler
- Echtes Phaser-Spiel: V2-Held geladen, bewegt und Schlagframe gezeigt
- Tests: `tests/heldGemaltV2.test.ts` prueft 8 Richtungen, 24 Laufbilder,
  6 gewichtete Hiebphasen, Block und Frame 255
- Reproduzierbarer Bau: `scripts/build_painted_hero_v2.py`

## Bewusste Grenze

V2 ist eine vollstaendig gemalte Figur, kein Paperdoll. Ruestung, Umhang und
Schwert werden in diesem Blatt nicht als Canvas-Schichten aufgesetzt. Weitere
sichtbare Ausruestungsstufen brauchen deshalb eigene vollstaendig gemalte
32x8-Blaetter. Bogen-/Stab-Koerperanimationen bleiben die naechste Stufe.

## Korrektur V2.1

Die erste Live-Fassung besass zwar acht Gehdateien, aber nicht genug echte
Zwischenphasen. V2.1 ersetzt sie durch einen vollstaendigen 16er-Gang pro
Richtung: Fersenaufsatz, Belastung, Tiefpunkt, Zehenabdruck, Vorbeischwung,
Kniehub, Streckung und Vorkontakt jeweils fuer beide Beine. Alle 128 Laufbilder
sind pixelverschieden; Angriff und Block blieben unveraendert.

## Korrektur V2.2

V2.1 hatte zwar 16 unterschiedliche Bilder, aber die Figur wechselte zwischen
ihnen sichtbar Breite, Haltung und Schwertwinkel. V2.2 benutzt deshalb pro
Richtung acht kontrollierte Gang-Keyposes und berechnet je Uebergang zwei
bewegungsgefuehrte Zwischenphasen. Der volle Gang besitzt damit 24 ruhige
Phasen. Stand, Lauf, Schlag und Block sind auf dieselbe sichtbare Groesse
normalisiert. Die acht Blickrichtungen bleiben vollstaendig getrennt.

Zum reproduzierbaren Neubau zuerst
`pip install -r scripts/requirements-painted-hero.txt --target .codex-tools/hero-animation`
ausfuehren und danach `scripts/build_painted_hero_v2.py` starten.

V2.2 ist in Blatt, Manifest, Framewahl und Werkbank verdrahtet. TypeScript,
530 Tests und Produktions-Build sind gruen. Der sichtbare Live-Lauf im Phaser-
Spiel ist der ausdrueckliche erste Pruefschritt fuer Claude nach dem Pull.
