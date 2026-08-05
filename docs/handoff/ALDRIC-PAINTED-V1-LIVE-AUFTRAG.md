# Claude-Code-Auftrag: Aldric Painted V1 live anschliessen

Bitte den aktuellen gemeinsamen Branch zuerst aktualisieren und dann den
gemalten Aldric als begrenzten Live-Test in den echten Phaser-Spielrenderer
integrieren. Nicht zu V3-Paperdoll oder Low-Poly-Rig zurueckkehren.

## Verbindliche Quellen

- Basis: `assets/sprites/hero-painted-v1/base/aldric-hemd-schwert-painted-9x4.png`
- Ausgeruestet: `assets/sprites/hero-painted-v1/gambeson-turmschild/aldric-gambeson-turmschild-painted-9x4.png`
- Jeweiliges Manifest: `aldric-painted-v1.json`
- Zelle 128x128; Sheet 1152x512.
- Zeilen: `down`, `left`, `right`, `up`.
- Spalten: `idle`, `walk_1`, `walk_2`, `walk_3`, `walk_4`, `windup`,
  `impact`, `followthrough`, `block`.

## Echter Einstiegspunkt

- Laden/Registrieren: `src/scenes/BootScene.ts` und/oder gekapselt in
  `src/gfx/SpriteProvider.ts`.
- Zustandsauswahl: `src/world/CombatScene.ts`, Methode `zeichneHeld` und die
  Frame-Auswahl in `renderEntities`.
- Bestehenden prozeduralen und 3D-Pfad als sicheren Fallback behalten.

## Frame-Mapping

- Stand -> Spalte 0.
- Laufend, `pstep` 0..3 -> Spalten 1..4; Takt weiterhin ca. 120-130 ms.
- `heldSchlagT` -> Spalten 5, 6, 7 mit 140/80/180 ms bzw. proportional zur
  vorhandenen Schlagdauer.
- `combat.blocking` -> Spalte 8.
- Die Engine hat acht Richtungen, das Sheet vier. Fuer den Test stabil mappen:
  `0,1 -> down`; `2,3 -> left`; `4,5 -> up`; `6,7 -> right`.

## Varianten fuer diesen Test

- Ohne aktive Ruestung/Schild: Basis-Sheet.
- Mit Ruestung UND aktivem Schild: Gambeson/Turmschild-Sheet.
- Alle anderen Kombinationen duerfen vorerst auf Basis oder den bestehenden
  Fallback fallen; keine neuen Canvas-Overlays bauen.
- Bogen/Reiten weiterhin bestehender Fallback, da dafuer keine Frames geliefert
  sind.

## Abnahme im echten Spiel

1. Stand und vier Gehframes in allen vier Richtungsgruppen live zeigen.
2. Frontangriff pruefen: nur eine Hand am Schwert, keine Klinge zwischen den
   Beinen, Treffer/Nachziehen bilden einen zusammenhaengenden Hieb.
3. Links/rechts darf beim Wechsel Stand -> Schlag nicht umspringen.
4. Oben zeigt in allen Frames nur den Hinterkopf.
5. Schildvariante blockt mit Spalte 8 sichtbar.
6. Fussposition, Hitbox, Tiefensortierung und Kollisionslogik bleiben
   unveraendert; nur Darstellung austauschen.
7. `npx tsc --noEmit` und `npx vitest run`; danach Browser-/Live-Beweis mit
   Screenshot oder kurzer Aufnahme in `screenshots/`.

Danach kurz in `docs/handoff/` dokumentieren: Loader, Richtungs-/Frame-Mapping,
Fallbacks, offene optische Fehler und exakte Test-URL/Bedienung.
