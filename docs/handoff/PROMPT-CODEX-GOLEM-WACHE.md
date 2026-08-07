# Codex-Auftrag: Golem + Skelettwache neu rendern (Perspektive + Rahmung)

## Kontext - worum es geht

Ravensmoor ist ein 2D-Spiel (Phaser 3) mit **Schrägdraufsicht von oben**.
Kachelgroesse 32x32 px. Alles in der Welt - Boden, Palisaden, Zelte, Baeume -
wird mit **derselben Kamera-Neigung von ca. 57 Grad ueber dem Boden** gerendert
bzw. gebacken. Dadurch liegt die ganze Welt in einer einheitlichen Perspektive.

Figuren kommen als vorgerenderte Blender-Atlanten ins Spiel. Es gibt bereits
drei Exporter (laut Atlas-Metadaten):
- `Ravensmoor Blender horse exporter`          -> **Pferd, sitzt richtig**
- `Ravensmoor Blender golem exporter`          -> Golem
- `Ravensmoor Blender Skeleton Guard exporter` -> Skelettwache

## Das Problem (vom Autor gemeldet, von mir geprueft)

Der Autor: *"der Golem passt irgendwie nicht so recht von der Perspektive ins
Spiel, und die Skelettwache auch."*

Meine Pruefung der ausgelieferten Atlas-Dateien bestaetigt das:

1. **Kamera zu flach.** Im direkten Seitenansicht-Vergleich schaut man beim
   **Pferd** klar von oben auf den Ruecken/Sattel. Beim **Golem** ist der Blick
   deutlich flacher, bei der **Skelettwache** fast auf Augenhoehe (flaches
   Profil, kaum Draufsicht). Dadurch wirken beide "davorgestellt" statt in der
   Welt stehend.

2. **Skelettwache verschenkt Aufloesung.** Die Figur fuellt nur **76 x 89 px in
   einer 160 x 160-Zelle** (rund ein Viertel der Flaeche), der Rest ist leerer
   Rand. Grund steht im Code-Kommentar: die Kamera wurde zurueckgezogen, damit
   die **Speerspitze beim maximalen Ausfall** noch ins Bild passt. Das Spiel
   gleicht das mit Skala 0,80 aus. Ergebnis: die Wache hat viel weniger echte
   Pixel als jedes andere Asset und wirkt klein und weich.

Zur Klarstellung - **kein** Problem und bitte NICHT "mitfixen":
- Es gibt **keine Verzerrung**. Beide werden gleichmaessig skaliert
  (Golem 0,70 / Wache 0,80 in Breite *und* Hoehe).
- Unterschiedliche Richtungszahl (Golem 8, Wache 16) ist gewollt.

## Auftrag

### 1) Kamera-Neigung angleichen (beide)
Beide Exporter auf **dieselbe Kamera-Elevation wie der Pferde-Exporter**
umstellen (Zielwert ~57 Grad ueber dem Boden, orthografisch oder leichte
Perspektive - so wie das Pferd es macht) und neu exportieren.

**Der Pferde-Exporter ist die verbindliche Referenz.** Wenn dort ein anderer
Wert steht als 57 Grad, gilt der Pferde-Wert - Hauptsache alle drei sind gleich.

### 2) Skelettwache enger rahmen
Die Kamera **nicht** fuer alle Frames zurueckziehen. Stattdessen einer von:
- groessere Zelle nur fuer die Angriffs-Clips, oder
- Zellgroesse beibehalten und den Speer-Ausfall so animieren, dass er
  hineinpasst, oder
- getrennte Zellgroesse je Clip.

**Ziel: die Figur fuellt im Idle mindestens ~80 % der Zellhoehe** (so wie der
Golem heute: 116 von 144 px). Danach kann die Skala-0,80-Kruecke raus - bitte
melde mir den neuen Wert, dann passe ich `SKELETTWACHE.skala` an.

## Verbindliches Ausgabeformat (drop-in, sonst bricht das Spiel)

Gleiche Dateien, gleiche Namen, gleiches JSON-Format (Phaser-Hash-Atlas):

| | Golem | Skelettwache |
|---|---|---|
| PNG | `assets/golem/ravensmoor-stone-golem.png` | `assets/skeleton_guard/ravensmoor-skeleton-guard.png` |
| JSON | `assets/golem/ravensmoor-stone-golem.json` | `assets/skeleton_guard/ravensmoor-skeleton-guard.json` |
| Atlas-Key | `ravensmoor_stone_golem` | `ravensmoor_skeleton_guard` |
| Zelle | 144 x 144 | 160 x 160 (darf wachsen, siehe 2) |
| Richtungen | 8 | 16 |
| Frames gesamt | 440 | 1184 |

**Frame-Namen exakt so:** `<clip>_d<richtung>_f<nummer>`
(z. B. `idle_d0_f0`, `walk_d3_f7`) - das Spiel greift direkt auf diese Namen zu.

**Clips + Framezahl je Richtung (unveraendert lassen):**
- Golem: `idle` 8, `walk` 12, `attack` 14, `hit` 7, `death` 14
- Wache: `idle` 6, `walk` 12, `thrust` 10, `combo` 14, `spin` 14, `hit` 6, `death` 12

**Richtung d0 = Blick zum Betrachter** (nach Sueden), dann im Uhrzeigersinn -
so wie es jetzt schon ist. Bitte beibehalten.

## Was du mir zurueckmelden musst

Diese Werte brauche ich, um den Code nachzuziehen:
1. **Bodenanker** = auf welcher relativen Zellhoehe die Fuesse stehen
   (aktuell Golem 0,91 / Wache 0,925).
2. **Neue Zellgroesse**, falls du die Wache-Zelle aenderst.
3. **Empfohlene Skala**, falls sich die Figurgroesse in der Zelle aendert.
4. Die tatsaechlich verwendete **Kamera-Elevation** (zur Dokumentation).

## Abnahme-Kriterien
- [ ] Golem und Wache haben dieselbe Kamera-Neigung wie das Pferd.
- [ ] Skelettwache fuellt im Idle >= 80 % der Zellhoehe.
- [ ] Alle Frame-Namen und Frameanzahlen unveraendert.
- [ ] Kein eingebackener Bodenteller (weicher Kontaktschatten ist ok).
- [ ] Sauberes Alpha ohne halbtransparenten Saum.
