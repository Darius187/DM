# Fuerstenburg - Phaser-3-Runtime

Die Burg ist als kompaktes, texturiertes GLB in die vorhandene
Three.js/Phaser-Runtime von Ravensmoor eingebunden. Sie enthaelt nur die
eigentliche Schlossanlage und den Innenhof: kein Wassergraben, keine Bruecke,
keine Insel, kein Aussenboden und keinen Anmarschweg.

## Dateien

- `medieval_castle_3d_runtime.glb` - sichtbares 3D-Modell
- `medieval_castle_3d_runtime.json` - Bounds, Marker und 30 Kollisionen
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
Mauern, vier Eckverbinder, Tuerme, Donjon, Nebengebaeude, Stall und Brunnen.

`buildBurg()` erzeugt eine wasserfreie Burgkarte, raeumt die Stellflaeche frei
und setzt den Spieler direkt an das offene Suedtor im Innenhof. Die fuer die
Oberwelt-Naht benoetigten Fluss-Randkacheln bleiben ausserhalb der sichtbaren
Burg erhalten, erzeugen hier aber bewusst keinen Wasser-Shader.

Die Burg wird aus derselben Canvas-Textur in einen Hintergrund- und einen
Vordergrund-Ausschnitt am Fuss der Spielfigur geteilt. Dadurch bleibt der Hof
hinter dem Spieler, waehrend Suedmauer und Tor ihn korrekt verdecken. Die
physischen Kollisionen bleiben unabhaengig davon aktiv.

## Runtime-Vertrag

- Modus: `exterior_only`
- Root: `BRG_CASTLE_RUNTIME_ROOT`
- Groesse: 62,11 x 45,79 x 16,04 Meter
- Eingang: `TRIGGER_CASTLE_GATE`
- Hof-Spawn: `SPAWN_CASTLE_COURTYARD`
- Haupttor: echtes Paket-Torhaus, korrekt auf die Nord-Sued-Achse gedreht
- Durchgang: offen, beide Holzfluegel sichtbar an die Tunnelwaende geschwenkt
- Ringmauer: 28 cm Modulueberlappung, 11 echte Paket-Stuetzpfeiler an den
  geraden Naehten und vier buendig mauerstarke Eckkerne
- Wehrgang: Traeger/Laufseite zeigt nach innen; zwei je 6,4 m lange,
  durchgehende Steintreppen vom Hofboden bis auf 4,13 m Hoehe
- Hofboden: geschlossen bis unter die inneren Mauerkanten; steinerne Schwelle
  durch den kompletten Tortunnel
- Materialien: unveraendert aus dem GLB, sRGB + ACES Filmic

Die bearbeitbare Quelldatei liegt unter
`C:/Obsidian/DM/medieval-castle/castle_reworked.blend`.
