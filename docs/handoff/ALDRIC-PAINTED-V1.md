# Aldric Painted V1 - Uebergabe Codex -> Claude

## Status

Bereit fuer einen begrenzten Live-Integrationstest. Der verworfene Low-Poly-Rig
wurde entfernt. Diese Lieferung verwendet vollstaendig gemalte Figuren statt
aufgeklebter Ruestungs-Ebenen. Die vom Autor beanstandeten frontalen Treffer-
und Nachziehframes der Basis wurden als natuerlicher Einhandhieb ersetzt.

## Lieferumfang

- `assets/sprites/hero-painted-v1/base/`: Hemd + Solide Klinge.
- `assets/sprites/hero-painted-v1/gambeson-turmschild/`: Gambeson + dunkler
  Umhang + Holz-Turmschild + Solide Klinge.
- Pro Variante ein transparentes 1152x512-Sheet: 128x128-Zellen, Zeilen
  `down`, `left`, `right`, `up`; Spalten `idle`, `walk_1..4`, `windup`,
  `impact`, `followthrough`, `block`.
- Pro Variante Kontrollbogen sowie animierte Walk-/Attack-GIFs unter
  `proofs/`.
- Reproduzierbarer Zuschnitt: `scripts/build_painted_hero_v1.py`.

## Integration

Jede Variante ist ein gebackener Vollfiguren-Satz. Es gibt hier absichtlich
keine Z-Reihenfolge und keine Anker: Ruestung, Umhang, Schild und Waffe sind in
jeder Pose fertig gemalt. Die Engine waehlt anhand der Ausruestungsstufe eines
der zwei Sheets und liest Richtung/Frame direkt aus dem Manifest.

Timing: Gehen 120 ms; Schlag 140/80/180 ms; Stand 240 ms; Block 160 ms.
Laufabdeckung: vier eigene Gehframes in allen Richtungen `down`, `left`,
`right`, `up`.

## Bewusste Grenze

Nur zwei in sich geschlossene Ausruestungsstufen. Keine beliebigen
Paperdoll-Kombinationen und noch keine Helme. Weitere Vollfiguren-Saetze erst
nach dem Live-Test dieser Animationen.
