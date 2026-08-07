# Häuser-Atlas - Andockstelle (R127h)

Hierher kommen die fertig gebackenen Haus-Atlanten (ein Haus = 1 PNG + 1 JSON).
Vite liefert `assets/` unter `/` aus, das Spiel lädt zur Laufzeit von hier -
**einfach die zwei Dateien hineinlegen, kein Code-Eingriff nötig.**

## Zimmermannshaus

Erwartete Dateien (genau so benannt):

```
assets/houses/medieval_carpenter_house_atlas.png
assets/houses/medieval_carpenter_house_atlas.json
```

Der Loader-Key ist `haus_zimmermann` (Phaser-Atlas). Fehlen die Dateien, zeigt
das Spiel einen prozeduralen Fachwerk-PLATZHALTER an derselben Stelle - es
bleibt also immer lauffähig.

### Anforderungen an den Atlas (aus dem Handoff)

- **Frames** (genau diese Namen): `exterior_closed`, `exterior_open`,
  `ground_floor`, `upper_floor`, `front_occlusion`, `ground_shadow`,
  `window_light_mask`.
- **Gemeinsamer Ursprung:** Alle Layer teilen denselben Ursprung (1400er Canvas,
  links-oben). Am einfachsten sind **untrimmte** Frames gleicher Größe
  (1400×1400). Sind die Frames getrimmt, muss die JSON `spriteSourceSize`/
  `sourceSize` korrekt führen (Phaser-Standard-Atlas-Format).
- **Anker:** `building_ground_rear` = (916.5, 682.07) auf dem 1400er Canvas
  (Boden-Kontakt hinten). Danach wird das Haus in der Welt positioniert und
  y-sortiert. Der Wert steht in `src/gfx/hausAtlas.ts` (`HAUS_ANKER`) - falls
  der finale Atlas abweicht, dort eine Zeile ändern.

### Position im Spiel

Das Haus hängt an einer **verschiebbaren Fläche** in Ravensmoor (Dorf-Editor,
Box `N1`). Es folgt der Box: Box ziehen = Haus verschieben. Die endgültige
Weltposition setzt also die Szene, nicht der Atlas (der ist intern verankert).

### Zustände

`exterior_closed` ↔ `exterior_open` (Tür), `ground_floor`/`upper_floor`
(Innenraum) werden durch reines Frame-Umschalten gewechselt
(`HausAtlas.setZustand(...)`). `window_light_mask` liegt additiv drüber und wird
nachts eingeblendet.
