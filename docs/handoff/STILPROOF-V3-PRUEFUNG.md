# Pruefung des Stilproofs V3 (Claude Code -> Codex)

Geprueft: `screenshots/codex_v2/rework/styleproof-ruestungen-v3.png` und
`styleproof-ausruestung-v3.png` (Commits 04ff3ab / 9c06587).
Belege: `screenshots/codex_v2/rework/pruefung/`.

## Urteil: STIL IST DRIN - ABER die Produktion so noch NICHT starten

Der Wechsel von programmatischen Overlay-Flaechen auf vollstaendig
gezeichnete Koerper war richtig. Die Ruestungen lesen sich als Kleidung:
Schultern, Aermel, Saum und Silhouette aendern sich echt. Das alte
Ebenen-Paket (`screenshots/codex_v2/*/armor-*.png`, `head-*.png`) ist
damit erledigt und wird nicht integriert.

## Was ich GEMESSEN habe (nicht geschaetzt)

1. **Groessen-Konsistenz INNERHALB eines Bildes: sehr gut.**
   Figurenhoehen der sechs Varianten: 422 / 422 / 422 / 428 / 426 / 428 px
   = 1,4 % Abweichung. Breiten 224-230 px. Das traegt einen gemeinsamen
   Fusspunkt.

2. **Lesbarkeit bei Spielgroesse: bestanden.**
   Auf 112 px Figurenhoehe herunterskaliert (entspricht der 128er Zelle
   mit Fusspunkt 124) bleiben alle sechs Zustaende unterscheidbar -
   Lumpen an der zerfetzten Silhouette, Gambeson an der Steppung,
   Kettenhemd an der Koernung, Plattenrock an den Nietenreihen.
   Beleg: `pruefung/spielgroesse-112px.png` (oben 1:1, unten 4x).

3. **GESICHTS-DRIFT ZWISCHEN ZWEI BILDERN: das ist der Blocker.**
   Derselbe Aldric im Kettenhemd sieht in den beiden Proofs
   unterschiedlich aus - Bartlaenge, Bartfarbe, Gesichtsbreite,
   Haaransatz und sogar die Machart des Kettengeflechts weichen ab.
   Beleg: `pruefung/gesichts-drift-zwischen-bildern.png` (links Ruestungs-
   proof, rechts Ausruestungsproof).

4. **Magenta-Saum: 1,1 % der Figurenflaeche.**
   Der Hintergrund ist kein reines Magenta (Eckwert 230,10,224), es gibt
   einen Mischsaum an den Kanten.

## Daraus folgen drei verbindliche Produktionsregeln

**A. EIN SHEET = EINE EINZIGE GENERIERUNG.**
Punkt 1 und Punkt 3 zusammen sagen es eindeutig: innerhalb eines Bildes
haelt das Modell die Figur konstant, zwischen zwei Bildern nicht. Ein
komplettes 9x4-Sheet (36 Frames) einer Ruestungsvariante muss deshalb
in EINEM Bild entstehen - nicht Frame fuer Frame oder Zeile fuer Zeile
zusammengesetzt. Sonst flackert Aldrics Gesicht im Spiel bei jedem
Schritt. Falls das Modell ein 9x4-Raster nicht in einem Zug schafft:
melden, BEVOR produziert wird - dann brauchen wir einen anderen Weg
(z. B. Kopf/Gesicht als eingefrorenen Bildausschnitt ueber alle Frames).

**B. Der Anheft-Beweis steht noch aus.**
Im zweiten Proof wurden Waffen und Schilde MITGEMALT, nicht angeheftet.
Das beweist den Stil, aber nicht die Mechanik. Der fehlende Beweis:
dieselbe Koerperzelle, einmal blank und einmal mit einem SEPARAT
gelieferten Waffen-Sheet darueber gelegt - und die Faust muss den Griff
umschliessen. Genau das prueft die Werkbank
(`tools/sprite-werkbank.html`); bitte selbst dagegen halten.

**C. Freistellen mit Rand-Entfaerbung.**
1,1 % Magenta-Saum sind auf Gras sichtbar. Beim Ausschneiden die
Kantenpixel entfaerben (Magenta-Anteil herausrechnen), nicht nur
Schwellwert-Maskieren.

## Reihenfolge, die ich vorschlage

1. Erst B beweisen (ein Waffen-Sheet, eine Koerperzelle, gestapelt).
2. Dann EINE komplette Variante als 9x4-Sheet in einem Zug (Vorschlag:
   Basis/Hemd) - daran sehen wir, ob A haelt.
3. Erst danach die restlichen fuenf Ruestungen und die Waffen/Schilde
   aus `docs/CODEX-VARIANTEN-LISTE.md`.

Keine 216-Frame-Produktion vor Schritt 2. Der Autor gibt den Stil frei,
nicht ich - aber technisch ist der Weg damit tragfaehig.
