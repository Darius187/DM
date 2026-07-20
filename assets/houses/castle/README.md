# Fuerstenburg - Phaser-3-Runtime

Die Burg ist als kompaktes, texturiertes GLB in die vorhandene
Three.js/Phaser-Runtime von Ravensmoor eingebunden. Sie enthaelt nur die
eigentliche Schlossanlage und den Innenhof: kein Wassergraben, keine Bruecke,
keine Insel, kein Aussenboden und keinen Anmarschweg.

## Dateien

- `medieval_castle_3d_runtime.glb` - sichtbares 3D-Modell
- `medieval_castle_3d_runtime.json` - Bounds, Marker und 24 Kollisionen
- `medieval_castle_3d_runtime_preview.png` - Blender-Abnahmebild

Vite verwendet `assets/` als `publicDir`. Deshalb lautet die Laufzeit-URL des
Manifests:

```text
houses/castle/medieval_castle_3d_runtime.json
```

Das Manifest verweist relativ auf `medieval_castle_3d_runtime.glb`.

## Einbindung im Spiel

`WorldScene.zeichneDorfplan()` startet das Modell automatisch, sobald die
Area-ID `burg` aktiv ist. `Gebaeude3DWelt` laedt das Manifest und GLB mit dem
vorhandenen `GLTFLoader`, rendert transparent in eine Canvas-Textur und stellt
diese als Phaser-Weltobjekt dar. Die Kollisionsrechtecke aus der JSON sperren
Mauern, Tuerme, Donjon, Nebengebaeude, Stall und Brunnen.

`buildBurg()` erzeugt eine wasserfreie Burgkarte, raeumt die Stellflaeche frei
und setzt den Spieler direkt an das offene Suedtor im Innenhof. Da die ganze
Burg ein gemeinsames Canvas-Sprite ist, werden Spielfiguren auf dieser Karte
vor dem Burg-Layer gerendert; die physische Mauerkollision bleibt aktiv.

## Runtime-Vertrag

- Modus: `exterior_only`
- Root: `BRG_CASTLE_RUNTIME_ROOT`
- Groesse: etwa 61 x 46 x 16 Meter
- Eingang: `TRIGGER_CASTLE_GATE`
- Hof-Spawn: `SPAWN_CASTLE_COURTYARD`
- Durchgang: offen, keine animierten Tuerfluegel
- Materialien: unveraendert aus dem GLB, sRGB + ACES Filmic

Die bearbeitbare Quelldatei liegt unter
`C:/Obsidian/DM/medieval-castle/castle_reworked.blend`.
