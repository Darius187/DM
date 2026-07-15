# Arbeitsauftrag (Codex): Reitpferd-Ueberarbeitung (Asset-Seite)

**Ausgangslage:** Das Reitpferd ist live im Spiel (aufsitzen mit E, reiten, Spuren).
Claude Code hat einige CODE-seitige Sachen gefixt. Die eigentliche Ueberarbeitung
liegt jetzt bei dir - sie betrifft die **Blender-Quelle + das Atlas-Rendering**,
deine Spur. Regeln: `AGENTS.md`.

---

## 1. Was Claude schon gefixt hat - NICHT rueckgaengig machen

Alles code-seitig, alle Werte in `src/data/reiten.ts` (`REIT_PFERD`) bzw.
`src/logic/reiten.ts`:

- **Uebergangs-Kadenz geglaettet** (`clipFps`/`gangFps` in `src/logic/reiten.ts`):
  Uebergaenge liefen mit festen 18 fps und fielen danach abrupt auf die Gangart
  zurueck ("haengt beim Losreiten"). Jetzt laufen sie in der Kadenz der Zielgangart.
- **Gleiten beim Losreiten** behoben: die Huf-Kadenz-Kurve (`gangFps`) wurde
  deutlich angehoben, damit die Beine mit dem Tempo Schritt halten (Boden zog
  vorher ~9px pro Beinbild durch, jetzt ~2-4).
- **Pferd dunkler** ueber einen Multiply-Tint: `REIT_PFERD.farbTint = 0x5c4c3c`.
  **In EINER Zeile tunebar** (heller 0x9a7c60 ... fast schwarz 0x443a30, 0xffffff = aus).
- **Hufspuren** beim Laufen (neu, `aktualisiereReitSpuren` in WorldScene +
  `REIT_PFERD.spur*`-Werte).

Diese Sachen sind Code/Tuning. **Deine Ueberarbeitung ersetzt sie nicht** - sie
verbessert die zugrunde liegenden ASSETS, dann greifen Claudes Fixes darauf sauberer.

---

## 2. Deine Hauptarbeit (Asset-Seite, Blender + Render)

Quelle liegt bei dir: die `.blend` (`ravensmoor_horse_animation_stage.blend`) +
die Skripte `scripts/render_horse_atlas.py` und `scripts/pack_horse_atlas.py`.
Das Repo hat nur die gerenderten Atlas-PNGs (`assets/horse/`).

### 2a. GALOPP wird abgeschnitten (bestaetigt gemessen) - HOECHSTE PRIORITAET
Die Galopp-Pose ist BREITER als die 128px-Atlas-Zelle. Gemessen an
`gallop_d12`: solide Pixel liegen an der linken UND rechten Zellkante (Schnauze
vorne, Hinterteil hinten werden um bis zu 17px abgeschnitten). Autor-Symptom:
"beim Galopp sieht man vorne die Schnauze nicht bei einem gewissen Frame."

**Fix (nur du kannst das, Blender noetig):** breitere Zelle rendern.
1. `scripts/render_horse_atlas.py`: `CELL_W = 128` -> `160` (Zeile 23).
2. `scripts/pack_horse_atlas.py`: `CELL_W = 128` -> `160` (Zeile 13).
3. Blender-Render + Pack neu laufen lassen -> neue `assets/horse/*.png` + `*.json`.
4. `src/data/reiten.ts`: `zellenBreite: 128` -> `160` (Zeile 25). Das ist die
   EINZIGE Code-Zeile, die du dafuer anfassen musst (Reiter-Sattelpunkt-Rechnung).

### 2b. Beine wirken zu duenn
Das Pferd wurde stark runterskaliert (Darstellung 0.645), dadurch verlieren die
duennen Beine Substanz. Ein Neu-Rendering mit **hoeherer Aufloesung** (groessere
Zelle / mehr Pixel je Meter) macht die Beine kraeftiger - geht im selben
Aufwasch wie 2a.

### 2c. Uebergangs-Frames (optional, falls noch hakelig)
Claudes Kadenz-Fix hat das Timing geglaettet. Falls die einzelnen Blender-
Zwischenposen (idle_to_walk, walk_to_trot, trot_to_gallop) selbst noch ruckeln,
kannst DU sie in Blender sauberer setzen. Das ist Feinschliff, nicht Pflicht.

### 2d. Drehung "steppig" / keine volle 3D-Perspektive (Design-Frage, nicht bauen)
Das Pferd ist ein 16-Richtungs-Atlas (22,5°-Stufen), deshalb "springt" die
Drehung. Echte kontinuierliche 360°-Drehung waere ein LIVE-three.js/GLB-Renderer
statt gebackener Atlas - ein eigenes, grosses System. **Nicht ohne Autor-Auftrag
bauen** - nur als Option merken.

---

## 3. Abnahme
- Nach dem Re-Render: aufsitzen (E), durch Schritt/Trab/Galopp reiten, drehen.
- **Galopp: Schnauze + Hinterteil vollstaendig sichtbar** (nicht mehr abgeschnitten).
- Beine kraeftiger, Farbe konstant ueber alle Gangarten (Tint bleibt 0x5c4c3c).
- Reiter sitzt sauber im Sattel (die Sattelpunkte kommen aus dem neuen `*-mounts.json`).
- `npx tsc --noEmit` gruen, `npx vitest run` gruen (die Reit-Tests pruefen die Logik).
- Committen + pushen, Uebergabe-Notiz.

## 4. Grenzen
- `src/logic/reiten.ts` (Kadenz-Logik) und die `REIT_PFERD`-Tuning-Werte NICHT
  umbauen - die gehoeren zur Code-Spur. Wenn dir dort etwas falsch scheint: melden.
- Du aenderst: die `.blend`, die Render-/Pack-Skripte, die `assets/horse/`-Ausgabe,
  und die EINE Zeile `zellenBreite` in `reiten.ts` (weil sie direkt an der Zellgroesse haengt).
