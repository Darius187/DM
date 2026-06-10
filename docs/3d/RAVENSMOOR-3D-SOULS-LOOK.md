# RAVENSMOOR 3D - ERGÄNZUNG: Der "Dark Souls"-Look (Showcase-First)
## Diese Datei ergänzt RAVENSMOOR-3D-PROMPTS.md und ändert die Art-Direction von stilisiert auf realistisch-düster

**Warum diese Ergänzung:** Die beeindruckenden Clips im Netz ("Dark Souls mit Claude gebaut")
bestehen aus drei Zutaten: realistische Gratis-Assets (Mixamo-Charakter, Polyhaven-Texturen/HDRIs),
physikalisch korrektes Licht mit Post-Processing, und EINE perfekt inszenierte Szene. Genau das
bauen wir zuerst - als Messlatte. Erst wenn die Szene den Look hat, ziehen die Spielsysteme aus
dem bestehenden Phasenplan dort ein.

---

## TEIL A - Neue Asset-Liste (ersetzt KayKit/Kenney für den realistischen Look)

### A1. Mixamo - dein Ritter mit Kampfanimationen (kostenlos, Adobe-Konto nötig, ~30 Min)
Gehe auf mixamo.com, melde dich an, dann:

1. **Charakter wählen:** Tab "Characters" -> suche einen Ritter/Krieger
   (z.B. "Paladin", "Knight", "Warrok" oder ähnlich - nimm den, der nach 1635/Söldner aussieht).
   Download: Format **FBX Binary**, Pose **T-Pose**, "With Skin".
   Speichere als `assets/raw/mixamo/character.fbx`
2. **Animationen laden:** Wähle DENSELBEN Charakter aus, dann Tab "Animations". Lade jede der
   folgenden Animationen einzeln herunter - Format FBX, **"Without Skin"**, 30 FPS, in Mixamo
   ggf. "In Place" anhaken wo verfügbar (wichtig bei Laufen/Rolle):
   - Idle (z.B. "Sword And Shield Idle")
   - Walk + Run ("Sword And Shield Walk/Run")
   - 3 verschiedene Schwertangriffe ("Sword And Shield Slash", "Attack", "Power Attack" o.ä.
     - ein horizontaler, ein Rückhand, ein schwerer für den Finisher)
   - Block ("Sword And Shield Block", idealerweise Block-Idle + Block-Impact)
   - Ausweichrolle ("Sword And Shield Roll" oder "Stand To Roll")
   - Treffer-Reaktion ("Sword And Shield Impact" / "Hit Reaction")
   - Sterben ("Sword And Shield Death")
   - Trinken/Interagieren optional ("Drinking" / "Picking Up")
   Speichere alle nach `assets/raw/mixamo/anim/<name>.fbx`
3. **Gegner:** Mixamo hat auch Monster-Charaktere (z.B. "Zombie", "Skeleton"-artige,
   "Mutant", "Vampire" - nimm 2-3 verschiedene) + passende Animationssets
   (Zombie Walk/Attack/Death, Mutant Swipe usw.) nach demselben Schema:
   Charakter with skin, Animationen without skin, nach `assets/raw/mixamo/enemies/<typ>/`

### A2. Polyhaven - Texturen und Licht (kostenlos, CC0, kein Konto, ~15 Min)
Von polyhaven.com herunterladen (jeweils 2K-Auflösung reicht):
- **HDRIs** (Tab HDRIs) nach `assets/raw/hdri/`: ein bewölkt-düsteres für das Dorf
  (Suche: "overcast", "moonless", "kloppenheim") und ein dunkles/nächtliches als Basis-
  Umgebungslicht für die Krypta
- **Texturen** (Tab Textures, jeweils das ZIP mit Diffuse/Normal/Roughness/AO) nach
  `assets/raw/textures/<name>/`:
  Steinboden + Steinmauer (Suche "castle wall", "stone floor", "cobblestone"),
  Erde/Schlamm ("mud", "dirt"), Holzbohlen ("wood planks"), Dachziegel ("roof"),
  Putz für Fachwerk ("plaster"), optional Blut ersetzt durch dunkle Decals aus Code

### A3. Requisiten (optional, steigert den Look weiter)
- Sketchfab: Filter "Downloadable" + Lizenz CC0/CC-BY, Suchbegriffe "medieval props",
  "sarcophagus", "altar", "bookshelf", "torch", "gravestone" -> GLB nach `assets/raw/props/`
- Wenn du 20-40 Euro investieren willst: ein Synty-"POLYGON Dark Fantasy"-Pack oder ein
  realistisches Modular-Dungeon-Pack von itch.io/Unity Asset Store (FBX/GLB) hebt das Niveau
  nochmal deutlich. Gleicher Ordner, der Code bleibt identisch.

---

## TEIL B - DER SHOWCASE-PROMPT (vor allen anderen Phasen einfügen, direkt nach Prompt 0)

```
PHASE 0.5 - SHOWCASE-SZENE "Die Gruft erwacht". Ziel: EIN Standbild und ein 20-Sekunden-
Eindruck, die mit den besten Three.js-Demos im Netz mithalten. Das wird unsere visuelle
Messlatte - alle späteren Phasen müssen dieses Niveau halten. Gameplay ist hier egal,
es zählt nur: Licht, Material, Inszenierung.

ART-DIRECTION (verbindlich, gilt ab jetzt für das ganze Projekt):
Realistisch-düster, Dark-Souls-Grit statt Comic. Entsättigte kalte Grundtöne (Blaugrau,
Umbra), Licht fast ausschließlich aus warmen Quellen (Fackeln, Kerzen). Hoher Kontrast:
tiefe Schatten, kleine Lichtinseln. Materialien abgenutzt: nasser Stein, rostiges Metall,
zerschlissener Stoff. Nichts ist sauber, nichts ist bunt.

ASSET-PIPELINE ZUERST:
1. Schreibe scripts/convert.ts: konvertiert alle Mixamo-FBX zu GLB (fbx2gltf als npm-Tool
   oder FBXLoader->GLTFExporter), retargetet die "Without Skin"-Animationen auf das
   Charakter-Skelett (gleiches Mixamo-Rig, Bone-Namen identisch - AnimationClips einfach
   übernehmen) und schreibt EINE Datei pro Figur: character.glb mit allen Clips.
   Aktualisiere assets/INVENTORY.md mit allen Clip-Namen und -Längen
2. Schreibe src/render/materials.ts: lädt Polyhaven-Textursets als MeshStandardMaterial
   (map/normalMap/roughnessMap/aoMap, korrekte Wrap/Repeat-Einstellungen, anisotropy 8)

DIE SZENE (eine handgebaute Korridor-und-Halle-Komposition, src/scenes/Showcase.ts,
erreichbar per ?scene=showcase):
- Ein 4 Einheiten breiter Kryptakorridor aus PBR-Steinmauern und nassem Steinboden
  (roughness niedrig + subtile Pfützen via roughnessMap-Variation), der sich nach 15 Metern
  zu einer kleinen Halle mit Sarkophag öffnet
- Boden leicht uneben wirken lassen: Normal-Map kräftig, vereinzelte Schutt-/Knochenhaufen
- Licht: KEIN flaches Ambient. HDRI als Environment mit sehr niedriger Intensität (0.05-0.15)
  für glaubwürdige Reflexe, dazu 4-6 Wandfackeln als flackernde PointLights mit Schatten
  (warm, 1800-2400K-Farbton), eine Kerzengruppe am Sarkophag, ein einzelner kalter
  Mondlicht-Spot durch einen Deckenriss als Kontrast (volumetrischer Fake: additiver
  Lichtschacht-Kegel mit weicher Textur + schwebende Staubpartikel im Kegel)
- Nebel: FogExp2 dicht genug, dass das Korridorende im Dunkel verschwindet, plus 2-3
  bodennahe driftende Nebelsprites
- DER RITTER: Mixamo-Charakter in der Halle, Sword-Idle-Loop, leichtes Fackel-Rimlight
  von hinten (dezenter roter SpotLight nur auf den Charakter für Kantenlicht)
- Post-Processing: ACESFilmicToneMapping, UnrealBloom (threshold hoch - nur Flammen blühen),
  Vignette, leichtes Filmkorn, Farbkorrektur (Schatten kühl, Mitteltöne entsättigt, Lichter
  warm), dezente Depth-of-Field nur für den Screenshot-Modus (?dof=1)
- Kamera: isometrische Spielkamera als Default; zusätzlich ?cam=cine für eine tiefe
  Dark-Souls-artige Third-Person-Einstellung hinter dem Ritter für das Hero-Shot-Standbild,
  und ?cam=fly für eine langsame 20s-Kamerafahrt durch den Korridor in die Halle

VERIFIKATION MIT AUGEN (Pflicht-Loop, mindestens 3 Iterationen):
Erzeuge mit Playwright Screenshots: shots/showcase-iso.png, shots/showcase-cine.png,
shots/showcase-corridor.png. Bewerte jeden gegen diese Checkliste und iteriere:
[ ] Es gibt echte Schwarzwerte (keine grau-ausgewaschene Dunkelheit)
[ ] Die Fackeln erzeugen lesbare Lichtinseln mit weichen Schattenkanten
[ ] Materialien zeigen Tiefe (Normal-Maps sichtbar, Specular-Glanz auf nassem Stein)
[ ] Der Ritter hebt sich durch Rimlight von der Umgebung ab
[ ] Bloom blüht NUR auf Flammen, nicht auf der ganzen Szene
[ ] Das Bild könnte als Atmosphäre-Screenshot eines kommerziellen Indie-Titels durchgehen
Benenne nach jeder Iteration konkret, was noch billig wirkt, und fixe genau das.

Abnahme: 60 FPS, und shots/showcase-cine.png ist ein Bild, das man rahmen will.
```

---

## TEIL C - Anpassungen am bestehenden Phasenplan (RAVENSMOOR-3D-PROMPTS.md)

Gib nach erfolgreicher Showcase-Phase diesen Prompt:

```
Die Showcase-Szene ist ab jetzt die visuelle Referenz (Art-Bibel). Übernimm für alle
weiteren Phasen aus RAVENSMOOR-3D-PROMPTS.md folgende Änderungen:
- Charaktere/Gegner: Mixamo-Figuren mit den konvertierten Animationssets statt KayKit.
  Kampf-Animationen aus Phase 2 auf die echten Clips mappen (Kombo = die 3 Schwertangriffe,
  Cancel-Fenster anhand der Clip-Längen aus INVENTORY.md setzen, Blend 0.1s)
- Umgebungen: modulare Geometrie selbst bauen (BoxGeometry/ExtrudeGeometry-Module) mit den
  Polyhaven-PBR-Materialien statt Kit-Modellen - Wandsegment, Boden, Torbogen, Säule,
  Treppe als wiederverwendbare Bausteine in src/world/modules.ts. Falls GLB-Props in
  assets/raw/props liegen, bevorzugt diese verwenden
- Dorf: Häuser aus denselben Modulen (Fachwerk = Putz-Material + dunkle Balken-Boxen,
  Dächer mit Ziegel-Textur), begehbar mit Dach-Fading wie geplant
- Licht/Post: exakt die Showcase-Einstellungen als zentrale Presets pro Gebiet
  (village/crypt1-3/boss) in src/render/presets.ts
- Jede Phasen-Abnahme enthält ab jetzt den Augen-Check gegen die Showcase-Checkliste
Alle übrigen Inhalte des Phasenplans (Kampfsystem-Werte, Gegnerverhalten, Loot, Dialoge,
Erzählung, Boss, Enden) bleiben unverändert gültig.
```

---

## TEIL D - Realistische Einordnung (kurz)

Mit Mixamo + Polyhaven + diesem Look-Dev-Loop erreichst du genau das Niveau der Clips, die
du gesehen hast: einzelne Bilder und Momente, die nach Dark Souls aussehen. Der Unterschied
zwischen so einem Showcase und einem fertigen Spiel ist Fleißarbeit über viele Iterationen -
dafür ist der Phasenplan da. Und falls eine Szene im Netz tatsächlich NOCH besser aussieht,
ist sie fast sicher UE5 mit gekauften Marketplace-Assets - derselbe Trick, teurere Zutaten.
