# Aldric Rig-Prototyp - Übergabe Codex an Claude

## Status

Technischer Animations-Haltpunkt. Noch keine Spielintegration und noch keine
Freigabe als endgültiger Figurenstil.

Einstiegspunkt:

`assets/sprites/hero-rig-v1/prototype/aldric-rig-prototype.json`

## Was bewiesen ist

- Alle 36 Posen stammen aus genau einem Blender-Armature-Rig.
- Vier Richtungen: `down`, `left`, `right`, `up`.
- Neun Spalten: Stand, vier Gehphasen, Ausholen, Treffer, Nachziehen, Block.
- Körper, Schwert und Holz-Rundschild werden separat und pixelgenau synchron
  gerendert.
- Schwert und Schild folgen Hand-Controllern im Rig. Keine nachträgliche
  Rotation bereits fertiger PNG-Ausrüstung.
- Zusätzlich existiert ein 3D-tiefenkorrekt gerendertes Composite-Sheet.

## Dateien

- Rig-Quelle: `assets/sprites/hero-rig-v1/source/aldric-rig-prototype.blend`
- Renderer: `tools/blender/render_aldric_rig_prototype.py`
- Packer: `scripts/pack_aldric_rig_prototype.py`
- Finale 128er-Sheets: `assets/sprites/hero-rig-v1/prototype/`
- Frameprüfung und GIFs: `assets/sprites/hero-rig-v1/prototype/proofs/`

## Reproduzierbarer Build

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' -b `
  -P tools\blender\render_aldric_rig_prototype.py -- `
  tmp\aldric-rig-frames `
  assets\sprites\hero-rig-v1\source\aldric-rig-prototype.blend all

python scripts\pack_aldric_rig_prototype.py `
  tmp\aldric-rig-frames `
  assets\sprites\hero-rig-v1\prototype
```

## Für Claude

1. Das alte Paket unter `hero-combat-v2/aldric-v3` nicht integrieren. Sein
   Manifest trägt jetzt `rejected-broken-do-not-integrate`.
2. Auch den Rig-Prototyp noch nicht in den Live-Renderer hängen. Zuerst nimmt
   der Autor Bewegungslesbarkeit und Grundstil anhand der Proofs ab.
3. Nach Abnahme bleibt der 4x9-Vertrag bestehen. Weitere Rüstungen werden auf
   dasselbe Rig gebaut und neu gerendert; Waffen und Schilde benutzen dieselben
   Hand-Controller.

## Bewusste Grenze dieses Haltpunkts

Der Prototyp enthält nur Hemd/Basis, solide Klinge und Holz-Rundschild. Sein
stilisiertes Low-Poly-Modell beweist die stabile Bewegung und Socket-Pipeline,
nicht den endgültigen Detailgrad. Rüstungen, Helme, Umhang und weitere Waffen
werden erst nach dieser Abnahme ergänzt, damit keine fehlerhafte Grundlage
erneut vervielfacht wird.
