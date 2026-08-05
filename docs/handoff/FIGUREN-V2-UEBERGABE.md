# Figuren V2 – Übergabe Codex → Claude

## Stapelreihenfolge

Reihenfolge jeweils hinten → vorne:

- `down`: Körper, Waffe, Schild
- `left`: Waffe, Körper, Schild
- `right`: Körper, Waffe, Schild
- `up`: Waffe, Schild, Körper

Der Umhang ist Teil des Körperbildes: `down` ist seine Überdeckung hinter dem Oberkörper, `up` vor dem Rücken bereits in die jeweiligen Frames gezeichnet.

## Anker

Koordinaten sind ganzzahlige, zelllokale Pixel ab linker oberer Ecke der 128×128-Zelle. `weapon` bezeichnet die Mitte der geschlossenen Griffhand am Übergang Griff/Parierstange; der Ursprung zukünftiger Waffen ist ihre Griffmitte. `shield` bezeichnet die Mitte des Schildbuckels; der Ursprung zukünftiger Schilde ist der Buckelmittelpunkt. Fertige Full-Cell-Layer sind bereits ausgerichtet und werden ohne Zusatzversatz am Zellursprung gezeichnet. Alle Werte stehen in `hero-combat-v2.json`.

## Tempo

- Gehen: 120 ms je Frame.
- Schlag: Ausholen 140 ms, Treffer 80 ms, Nachziehen 180 ms.
- Block: halten, solange die Eingabe aktiv ist; beim Ein-/Ausblenden ca. 80 ms Übergang vorsehen.

## Abweichungen und Lücken

- Der erwähnte V2-Prompt war lokal nicht auffindbar; umgesetzt wurde die vollständige Chat-Spezifikation.
- ImageGen lieferte ein 1254×1254-Master; Export auf 512×512 erfolgte mit Nearest-Neighbor. Die Zellen sind exakt 128×128, aber nicht modellnativ in dieser Auflösung erzeugt.
- Körper ist ImageGen-Art; Waffen und Schilde sind für exakte Anker deterministisch als Pixel-Layer gebaut.
- Seitliche Trefferframes lesen sich teilweise eher als kurzer gerader Schnitt/Stoß. Vor Integration am Kontaktbogen freigeben oder neu zeichnen.
- Umhang und Rüstung sind noch keine austauschbaren Ebenen. Ausweichrolle bleibt für Runde 3 offen.

## Nächster Schritt

Noch nicht integrieren. Zuerst `proof-attack-without-with-shield.png` und `proof-block-without-with-shield.png` freigeben. Danach braucht das bestehende prozedurale Ein-Bild-System einen zweiten Renderer, der Körper sowie aus dem Ausrüstungszustand gewählte Waffen-/Schild-Layer gemäß JSON stapelt.
