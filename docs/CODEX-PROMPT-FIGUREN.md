# Prompt fuer Codex: Figuren-Gegentest (R239)

Diesen Prompt an Codex geben. Ziel: Codex zeichnet dieselben Figuren in
seinem eigenen Stil, damit der Autor beide Handschriften nebeneinander
vergleichen kann. Codex arbeitet auf demselben Branch (AGENTS.md gilt).

---

Du bist Pixel-Artist fuer "Eternal Pain" (Arbeitstitel-Untertitel "Der
Preis der Unsterblichkeit"), ein duesteres Mittelalter-2D-Spiel von oben
(Phaser 3, Kachelgroesse 32 px). Die bestehenden prozeduralen Figuren
wirken zu weich und rundgelutscht ("wie Windows-Buttons aus den 90ern").
Zeichne als GEGENPROBE einen eigenen Satz Figuren - NICHT die bestehende
Zeichenpipeline anpassen, sondern ein eigenstaendiges Beispiel liefern.

AUFGABE
1. Schreibe ein eigenstaendiges Skript (z. B. scripts/codex_figuren.mjs,
   node-canvas ODER eine HTML-Seite mit Canvas), das folgende 12 Figuren
   zeichnet, jede in NATIVER Pixelgroesse 32x32 UND 64x64 (kein Hoch-
   oder Runterskalieren - jede Groesse wird eigens gezeichnet, Pixel
   sitzen auf dem Raster, keine Anti-Aliasing-Weichzeichnung):
   Held (Wanderer mit Schwert), Templer (weisser Wappenrock, rotes
   Kreuz, Zweihaender), Soldat (Kettenhaube, Heerklinge), Bogenschuetze,
   Schmied (Lederschuerze, Hammer), Baeuerin, Moench, Kind,
   Pestopfer (untot, gruenstichig), Skelett, Untoter Riese, Wolf.
2. Stil-Vorgaben (WICHTIG - genau das fehlt den bestehenden Figuren):
   - Klare, dunkle UMRISSLINIE (1 px, sehr dunkles Braun/Schwarz) um
     jede Figur - keine offenen weichen Kanten.
   - 2-3 Helligkeitsstufen je Flaeche (Licht von oben links), KEINE
     Verlaeufe, KEINE Weichzeichnung.
   - Lesbare SILHOUETTE: Beruf/Rolle muss am Umriss erkennbar sein
     (Hammer, Bogen, Kutte, Schuerze).
   - Gedeckte, erdige Palette (Moor-Toene: Oliv, Braun, Rost, Knochen,
     kaltes Grau) - maximal 8-10 Farben je Figur, ein Akzent erlaubt
     (Templer-Rot, Pest-Gruen).
   - Proportionen: leicht gedrungen (Kopf ~1/3 der Hoehe), Frontansicht,
     beide Fuesse am Boden, 1-2 px Bodenkontakt-Schatten.
3. Ausgabe: EIN Kontaktbogen-PNG (dunkler Hintergrund #1a1611, je Figur
   eine Zelle mit Namens-Beschriftung, obere Reihe(n) 64x64, untere
   32x32, jede Zelle zusaetzlich einmal auf einem Gras-Gruen #46543a,
   damit man die Kanten beurteilen kann). Dateiname:
   screenshots/codex_figuren_kontaktbogen.png - lege den Ordner an.
4. KEINE bestehenden Spieldateien anfassen (src/gfx bleibt unberuehrt).
   Nur das neue Skript + das PNG committen. Deutsche Commit-Message.
5. Am Ende: das PNG-Ergebnis kurz selbst bewerten (2-3 Saetze: was ist
   gelungen, was wuerdest du in Runde 2 aendern).

BEWERTUNGSMASSSTAB DES AUTORS: "Sieht es nach einem duesteren
Mittelalter-Spiel aus - oder nach Buttons?" Kantig schlaegt weich,
lesbar schlaegt detailreich.

---
