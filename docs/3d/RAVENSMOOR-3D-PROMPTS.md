# RAVENSMOOR 3D - Komplette Prompt-Sammlung für Claude Code
## Isometrisches 3D-Action-RPG mit echtem Charakter, begehbaren Häusern und moderner Beleuchtung

---

## TEIL A - Was du VOR dem ersten Prompt selbst tun musst (einmalig, ca. 20 Minuten)

Claude Code kann keine 3D-Modelle erschaffen und nichts mit Login herunterladen. Die Grafikqualität
steht und fällt mit diesen Assets. Lade folgende kostenlosen Packs (alle CC0, kommerziell nutzbar)
und entpacke sie in den Projektordner unter `assets/raw/`:

1. **KayKit Adventurers** (kaylousberg.itch.io/kaykit-adventurers)
   -> animierte Helden inkl. Ritter mit Schwert: Idle, Laufen, Angriffe, Block, Treffer, Sterben
   -> Ordner: `assets/raw/kaykit-adventurers/`
2. **KayKit Skeletons** (kaylousberg.itch.io/kaykit-skeletons)
   -> animierte Skelett-Gegner (Krieger, Bogenschütze, Magier) - unsere Untoten
   -> Ordner: `assets/raw/kaykit-skeletons/`
3. **KayKit Dungeon Remastered** (kaylousberg.itch.io/kaykit-dungeon-remastered)
   -> modulare Dungeon-Teile: Wände, Böden, Treppen, Fackeln, Bücherregale, Säulen, Kisten, Knochen
   -> Ordner: `assets/raw/kaykit-dungeon/`
4. **Kenney Fantasy Town Kit** (kenney.nl/assets/fantasy-town-kit)
   -> modulare Fachwerkhäuser, Dächer, Türen, Zäune, Brunnen für Ravensmoor
   -> Ordner: `assets/raw/kenney-town/`
5. Optional für mehr Grusel: **KayKit Graveyard** falls verfügbar, sonst reicht das Dungeon-Pack.

Falls ein Pack-Name nicht mehr exakt stimmt: nimm das nächstliegende KayKit/Kenney-Pack mit
GLB/GLTF-Dateien. Wichtig ist nur: GLB-Format, ein animierter Held, animierte Skelette,
modulare Dungeon- und Dorf-Teile.

Danach: Claude Code im Projektordner starten und die Prompts aus Teil B der Reihe nach geben.

---

## TEIL B - Die Prompts (in dieser Reihenfolge, einer nach dem anderen)

### PROMPT 0 - Kickoff und Fundament

```
Wir bauen "Ravensmoor 3D - Der Preis der Unsterblichkeit": ein isometrisches 3D-Action-RPG
im Stil von Diablo 1 (düster, Horror, Dreißigjähriger Krieg 1635), technisch modern.

LIES ZUERST: die Datei ravensmoor.html im Projektordner (falls vorhanden) bzw. RAVENSMOOR-PROMPT.md.
Sie sind die verbindliche Quelle für ALLE Inhalte: Item-Tabellen mit Affixen, Gegnerwerte,
NPC-Dialoge (Heinrich Kramer, Magdalena, Pater Johannes), Erzähltexte "Aus meinen Aufzeichnungen",
Altar-Effekte, Boss-Phasen des Tempelritters und die beiden Enden. Extrahiere diese Inhalte
nach src/data/*.json (items, enemies, dialogues, narration, themes).

DESIGNSÄULEN (Rangfolge, bei Konflikt gewinnt die höhere):
1. Das Schnetzeln muss Spaß machen - Schlagen, Blocken, Parieren, Ausweichen sind der Kern.
   Jede Entscheidung wird daran gemessen, ob der Nahkampf besser aussieht und flüssiger wird.
2. Atmosphäre: dunkel, neblig, Fackellicht - die Grafikqualität kommt aus Beleuchtung und
   Post-Processing, nicht aus Polygonzahl.
3. Die Ich-Erzählung wird an festen Beats erzählt.

TECHNIK (verbindlich):
- Three.js (aktuelle Version) + TypeScript + Vite
- Renderer: WebGLRenderer mit shadowMap (PCFSoftShadowMap), ACESFilmicToneMapping,
  outputColorSpace SRGB, Pixelratio max 2
- Post-Processing: EffectComposer mit UnrealBloomPass (dezent!), Vignette-Shader, leichtes
  Filmkorn. Eine zentrale Datei src/render/post.ts, per Taste F2 an/abschaltbar
- Kamera: PerspectiveCamera FOV 38, fester Yaw 45 Grad, Pitch ca. 55 Grad, Abstand ~16 Einheiten,
  folgt dem Spieler weich (Lerp). Kein freies Drehen - klassisch isometrisch wie Diablo
- Assets: GLB-Loader mit Cache (src/assets/loader.ts). Alle Modelle aus assets/raw/.
  Schreibe ein Skript scripts/inventory.ts, das alle GLBs scannt und nach
  assets/INVENTORY.md schreibt: Dateiname, enthaltene Meshes, Animationen, Bounding-Box.
  FÜHRE ES AUS und nutze die Ergebnisse - rate niemals Animationsnamen
- Projektstruktur: src/scenes (Boot, Village, Dungeon, BossRoom, DebugArena),
  src/systems (combat, enemyAI, dungeonGen, lighting, loot, save, narration),
  src/entities (Player, Enemy, Boss), src/ui (HUD, Inventory, Dialogue), src/data (JSON)
- Tests: Vitest für reine Logik (Loot-Rolls, Dungeon-Begehbarkeit, Schadensformel, Parade-Fenster)
- SELBSTVERIFIKATION MIT AUGEN: Installiere Playwright. Schreibe scripts/screenshot.ts, das
  das Spiel headless startet, definierte Szenen lädt (per URL-Parameter ?scene=debug&pose=combat)
  und Screenshots nach shots/ legt. Nach JEDER Phase: Screenshots machen, selbst ansehen und
  beurteilen (Lesbarkeit, Beleuchtung, Proportionen), Mängel fixen. Du hast Augen - benutze sie.

ARBEITSWEISE FÜR JEDE PHASE: 1) Plan auflisten 2) implementieren in kleinen Commits
3) npm run typecheck + npm run test grün 4) Screenshots erzeugen und bewerten
5) eine Sache benennen, die sich noch nicht gut anfühlt/aussieht, und fixen 6) erst dann weiter.
Entscheidungen ohne Rückfrage treffen und in DECISIONS.md dokumentieren.

PHASE 0 JETZT: Projekt aufsetzen (Vite+TS+Three+Vitest+Playwright+ESLint), CLAUDE.md mit
dieser Kurzfassung anlegen, Asset-Inventar erzeugen, Daten-JSONs aus der Referenz extrahieren,
eine Testszene: dunkler Boden, ein geladenes Haus-Modell, eine Fackel als Punktlicht mit
Schattenwurf, FPS-Anzeige. Abnahme: npm run dev läuft, Screenshot zeigt das beleuchtete Haus
mit Schatten, INVENTORY.md ist vollständig.
```

### PROMPT 1 - Charakter und Steuerung (der "echte Charakter")

```
PHASE 1 - Spielfigur. Nimm den Ritter aus dem Adventurers-Pack (laut INVENTORY.md).

- CharacterController (Kapsel-Kollision gegen ein Grid/AABBs, kein Physik-Framework nötig):
  WASD-Bewegung relativ zur Kamera, Figur dreht weich in Bewegungsrichtung (Slerp),
  Beschleunigen/Abbremsen mit kurzen Rampen (kein digitales An/Aus)
- AnimationStateMachine (src/systems/anim.ts): Zustände Idle, Run, getrennt mit Crossfade
  (0.12s). Laufgeschwindigkeit moduliert die Abspielrate leicht, damit die Füße nicht rutschen
- Die Schwert- und Schild-Meshes des Packs an die Hand-Bones hängen (Bone-Namen aus INVENTORY.md)
- Kamera-Follow mit Dead-Zone und weichem Nachziehen; Mauszeiger wird per Raycast auf die
  Bodenebene projiziert -> daraus entsteht die Zielrichtung für Kampf (Phase 2)
- DebugArena-Szene (?scene=debug): 30x30 Steinboden aus Dungeon-Bodenplatten, 4 Fackeln,
  Gizmo-Overlay per F1: Kollisionskapsel, Blickrichtung, aktueller Anim-State, FPS
- Beleuchtungs-Baseline: sehr dunkles Ambient (kaltes Blaugrau), Fackeln als flackernde
  PointLights mit Schatten (Flackern: Intensität + minimale Position, jede mit eigener Phase),
  dezenter Bloom auf den Flammen, Nebel (FogExp2, dunkel)

Abnahme: Screenshot der DebugArena sieht stimmungsvoll aus (dunkel, warme Lichtinseln),
der Ritter läuft mit sauberen Übergängen, 60 FPS, keine Konsolen-Fehler.
```

### PROMPT 2 - DER KAMPFKERN (wichtigste Phase, nimm dir Zeit)

```
PHASE 2 - Kampfsystem in der DebugArena. Das ist das Herz des Spiels. Erst wenn sich das
hervorragend anfühlt UND gut aussieht, geht es weiter.

SPIELER-AKTIONEN (Animationen aus dem Pack laut INVENTORY.md zuordnen; fehlt eine, die
nächstliegende nehmen und per Abspielrate/Blending anpassen):
- Linksklick: 3er-Kombo. Schlag 1 (horizontal), Schlag 2 (Rückhand), Schlag 3 Finisher
  (Überkopf/weiter Bogen, +45% Schaden, starker Knockback, kleiner Vorwärts-Lunge von 0.6
  Einheiten pro Schlag in Zielrichtung - das gibt Wucht). Kombo verfällt nach 0.9s
- Rechtsklick halten: Block. Schild/Klinge hoch (Block-Pose), Bewegung 45%, Figur richtet
  sich kontinuierlich zur Maus aus, Frontschaden -70 Prozent, Pfeile frontal abgewehrt
- Perfekte Parade: Block beginnt <250ms vor Treffereinschlag -> kein Schaden, Angreifer 0.9s
  betäubt (Taumel-Animation oder Rückwärts-Zucken), Metallfunken-Partikel, heller Klang,
  kurzer radialer Lichtblitz am Schild, Riposte-Fenster 1.3s: nächster Schlag golden, +50%
- Leertaste: Ausweichrolle (Roll-Animation), 180ms i-Frames, fester Impuls, Cooldown 0.9s,
  Staubpartikel

SPIELGEFÜHL-PFLICHTEN:
- Input-Buffering 150ms; Angriffs-Recovery ab 60% durch Rolle/Block abbrechbar; Rolle bricht alles
- Hit-Stop: 45ms normal / 70ms Finisher / 90ms Parade als Zeitskalierung 0.15 (mixer.timeScale
  und Spiellogik gemeinsam), danach weich zurück
- Schwert-Trail: Mesh-Trail an der Klingenspitze (kurzes Ribbon, additiv, verblasst in 0.15s).
  Farbe/Breite kommen später von der Waffe - baue die Schnittstelle jetzt (TrailStyle)
- Treffer-Feedback dreischichtig: Gegner-Material blitzt weiß (emissive-Puls 80ms) + Partikel-
  Burst + Sound mit Tonhöhenvariation. Schadenszahlen als kamerazugewandte Sprites, steigen
  und verblassen; Parade/Riposte golden, eingehender Schaden rot
- Screenshake: Kamera-Offset-Noise, klein/mittel/stark, immer unter 0.3 Einheiten, abklingend
- Dummy-Gegner in der Arena: Skelett aus dem Pack, greift auf Taste T an, respawnt sofort.
  JEDER gegnerische Nahkampfangriff hat 0.35-0.5s sichtbares Aufladen: Ausholanimation
  verlangsamt + pulsierender roter Ring-Decal am Boden unter dem Gegner. Ohne lesbaren
  Telegraph keine faire Parade - das ist der Vertrag mit dem Spieler
- Debug-Overlay F1 erweitert: aktive Trefferfenster, Parade-Fenster-Timing, letzte Eingaben

Tests: Schadensformel, Parade-Fenster-Logik, Kombo-Reset als Vitest-Units.
Abnahme: 60 Sekunden Dauerkampf gegen 3 Dummys fühlen sich flüssig an (keine verschluckten
Eingaben, Parade konsistent), Screenshots der Kombo-Posen und einer Parade sehen dynamisch aus,
60 FPS. Mach Screenshots in Schlag-Momenten (pose=combat) und bewerte die Silhouetten.
```

### PROMPT 3 - Gegner und KI

```
PHASE 3 - Gegner. Werte aus src/data/enemies.json (Quelle: Referenz).

- Pestopfer: langsam, zäh - nimm ein Skelett/Zombie-Modell, dunkelgrün getönt, gebeugte Haltung
  (Spine-Bone leicht rotiert)
- Skelett-Krieger: schnell, schwach, Schwertangriff mit Telegraph
- Skelett-Schütze: hält 8-12 Einheiten Abstand, Sichtlinien-Check (Raycast), Pfeil als
  Projektil-Mesh mit Leuchtspur, weicht zurück wenn der Spieler näherkommt
- Grabschatten (ab Ebene 3): sehr schnell, halbtransparentes schwarzes Material mit
  Fresnel-Glühen (violett), hinterlässt kurzlebige Schattenpartikel
- Elite-Varianten (10%): Affix Schnell/Vampirisch/Verflucht (hinterlässt Schadensfläche als
  grünes Decal), 1.25x Größe, Namenszug über dem Kopf, bessere Beute
- Verhalten: Aggro-Radius, Verfolgen mit Separation (kein Stapeln), Angriff nur mit Telegraph,
  Betäubung nach Parade (Taumeln), max. 2 Angreifer gleichzeitig aktiv, Rest umkreist
  (Diablo-Gefühl: bedrängt, aber lesbar)
- Tod mit Wucht: Treffer-Impuls kippt das Modell (kein Ragdoll nötig: Root rotieren + fallen),
  versinkt nach 3s im Boden, hinterlässt dauerhaftes Blut-Decal (Skelette: Knochenhaufen-Prop)
- Trefferzonen: einfache Kapseln pro Gegner, vom Schwert-Sweep (Bogen-Abfrage) getroffen

Abnahme: 10 gemischte Gegner in der Arena, jeder Typ erzwingt anderes Spielerverhalten,
Telegraphen klar lesbar, 60 FPS, Screenshot einer Kampfszene wirkt dicht aber lesbar.
```

### PROMPT 4 - Die Krypta in 3D

```
PHASE 4 - Dungeon-Generierung mit dem Dungeon-Kit.

- Generator (Räume + 2 Einheiten breite Korridore) erzeugt ein Grid; daraus werden die
  modularen Teile platziert: Bodenplatten, Wandsegmente, Ecken, Türbögen zwischen Raum und
  Korridor, Treppen-Props für Auf-/Abstieg. Instanced Meshes für Boden/Wände (Performance)
- Drei Themes via Material-Tönung + Prop-Dichte (Werte aus themes.json):
  Ebene 1 Gruft (graubraun, vereinzelt Knochen), Ebene 2 Beinhaus (kalt grünlich, viele
  Knochenhaufen), Ebene 3 Kultstätte (rötlich-schwarz, Blut-Decals, glühende rote Boden-Runen
  mit pulsierendem Emissive)
- Spezialräume: Opferaltar (Altar-Prop, Kerzenlichter, Blut/Runen drumherum, Interaktion E
  mit den Zufallseffekten aus der Referenz) und Bibliothek (Bücherregale an den Wänden,
  Foliant-Pickup gibt Erfahrung)
- Fackeln an Wandsegmenten (jede ~4. Wand): Flammen-Sprite + flackerndes PointLight.
  Lichtbudget: maximal 8 aktive Schatten-Lichter - Pool, der die nächstgelegenen aktiviert,
  ferne Fackeln nur Emissive ohne Licht
- Sichtbarkeit: dichter Nebel (FogExp2) + Minimap (Canvas-Overlay) mit Fog of War
- Loot-Drops als leuchtende Bodenobjekte (Waffen-Mesh klein + Lichtsäule in Raritätenfarbe -
  Diablo-Gefühl), Gold/Tränke mit Magnet-Einsammeln
- Vitest: 100 generierte Ebenen begehbar (Start->Treppe), keine überlappenden Module

Abnahme: Screenshots aller drei Themes klar unterscheidbar und atmosphärisch (dunkle Gänge,
Lichtinseln), 60 FPS bei 20 Fackeln + 15 Gegnern.
```

### PROMPT 5 - Ravensmoor: das Dorf mit begehbaren Häusern

```
PHASE 5 - Das Dorf aus dem Town-Kit, handgebaut als Szenen-Definition in data/village.json.

- Layout wie in der Referenz: Taverne "Zum Schwarzen Raben", Kirche mit Friedhof (Grabsteine,
  totes Bäumchen), Magdalenas Hütte am Waldrand, niedergebranntes Gehöft (verkohlte Balken,
  nur Mauerreste), Brunnen, Wege, Zäune, kahle Bäume
- BEGEHBARE HÄUSER: Taverne und Magdalenas Hütte haben Innenräume (Boden, Möbel-Props aus den
  Kits: Tische, Fässer, Regale, Kamin mit Feuerlicht). Betritt der Spieler das Haus oder
  verdeckt das Dach die Figur (Raycast Kamera->Spieler), faden Dach und kameraseitige Wände
  auf 10% Opazität (Material transparent, depthWrite beachten). Innen: eigene warme Lichter,
  Außennebel ausgeblendet
- Stimmung: bleierner Himmel (dunkle HemisphereLight, kaltes schwaches Directional mit
  Schatten), Bodennebel-Schwaden (große langsam driftende Alpha-Sprites), Schornsteinrauch-
  Partikel über der Taverne, warm leuchtende Fenster (Emissive + kleines Licht), 2-3 Krähen
  als simple schwarze Props auf Grabsteinen
- NPCs: drei Figuren aus dem Adventurers-Pack (umgefärbt: Wirt braun, Priester schwarz,
  Kräuterfrau grün), Idle-Animation, Namensschild, Interaktion E -> Dialog-UI (Texte und
  Entscheidungen 1:1 aus dialogues.json), Händler-UI für Heinrich und Magdalena
- Kirchentür -> Krypta-Abstieg (erst mit Schlüssel von Pater Johannes)

Abnahme: Screenshot des Dorfplatzes wirkt wie ein düsteres Diorama (Nebel, warme Fenster);
Screenshot IN der Taverne zeigt funktionierendes Dach-Fading und gemütlich-bedrückende
Innenbeleuchtung; kompletter Loop Dorf->Schlüssel->Krypta->zurück spielbar.
```

### PROMPT 6 - Loot, Inventar, Waffen am Mann

```
PHASE 6 - Itemsystem aus items.json (Raritäten, Affixe inkl. +Lichtradius auf Ringen).

- Waffenwechsel tauscht das Mesh in der Hand (verschiedene Schwerter/Kolben aus den Kits,
  Raritäten-Tönung). Der Schwert-Trail nutzt jetzt TrailStyle pro Waffe: rostig dünn-grau,
  besser breiter/heller, ab Langschwert bläulich, selten golden mit Funken, Templerklinge
  mit breitem heiligem Goldtrail
- Rüstung tönt Schulter/Brust-Materialien; Ring +Lichtradius vergrößert sichtbar das
  Spielerlicht (eigenes PointLight am Spieler)
- Inventar-UI (HTML-Overlay im Stil der Referenz: Pergament-Töne, Cinzel-Font): Liste mit
  Raritätsfarben, Statzeile, Klick zum Anlegen, Stats-Block (Schaden/Rüstung/Leben/Mana/
  Lebensraub/Lichtradius), Gold, Tränke Q/F
- Händler kaufen/verkaufen, Restock wie in der Referenz; Elixiere von Magdalena
- Speichersystem (localStorage): Inventar, Ausrüstung, Stufe, Gold, Flags, bereits
  generierte Ebenen-Seeds

Abnahme: ein seltener Fund verändert sichtbar Klinge UND Trail (Screenshot-Vergleich),
Vitest für Roll-Verteilungen grün, Speichern/Laden verlustfrei.
```

### PROMPT 7 - Der Tempelritter und die Enden

```
PHASE 7 - Bossraum und Finale.

- Grabhalle: Säulenreihen, Runenkreis (glühend) um einen Sarkophag, viele Fackeln, dichter
  Nebel; der Tempelritter erhebt sich beim Betreten aus dem Sarkophag (kurze Inszenierung:
  Kamera zieht leicht auf, Erzähler-Beat aus narration.json mit dem Flüstern)
- Modell: größter Ritter/Skelett-Krieger aus den Packs, 1.6x skaliert, dunkle Rüstungstönung,
  rote Emissive-Augen, zerschlissener Umhang falls vorhanden
- Phasen aus der Referenz: telegrafierter Slam auf Spielerposition (Boden-Ring-Decal,
  Trümmerpartikel), Beschwörung bei 66/33% (Skelette steigen mit Erdpartikeln aus dem Boden),
  unter 50%: Projektilfächer + NEU Sturmangriff quer durch den Raum mit langem Telegraph
  (Anlauf-Pose + Staublinie), parierbarer Nahkampfhieb (keine Betäubung, aber Riposte)
- Nach dem Sieg: Templerklinge + Relikt (golden pulsierendes Artefakt überm Sarkophag),
  Entscheidung annehmen/zerstören -> beide End-Sequenzen mit den Texten aus narration.json,
  Annehmen färbt das Spielerlicht dauerhaft leicht rötlich (subtile Korruption)
- Erzähler-Beats an allen Stationen prüfen (Start, erster Abstieg, Bossraum), 5 sammelbare
  Tagebuchseiten eines früheren Reisenden über die Ebenen verteilen

Abnahme: Bosskampf 60-120s, jeder Angriff parierbar oder ausweichbar, beide Enden erreichbar,
Screenshot der Bosshalle ist das beeindruckendste Bild des Spiels.
```

### PROMPT 8 - Politur: der 2026-Look

```
PHASE 8 - Finale Politur. Ziel: jedes Standbild sieht nach moderner Indie-Produktion aus.

- Post-Processing-Pass: Bloom fein abstimmen (nur Flammen/Emissive blühen), Vignette,
  dezentes Filmkorn, leichte Farbkorrektur (Schatten ins Blaugrüne, Lichter warm),
  optional SSAO falls Performance es erlaubt - alles per F2 schaltbar
- Partikel-Pass: Staub in Lichtkegeln (schwebende Motes), Glut über Fackeln, Atemnebel?
  Nein - aber Bodennebel in der Krypta als driftende Sprites
- Sound-Pass: jede Aktion hörbar (Schwung, Treffer dumpf, Parade hell-metallisch, Rolle,
  Schritte nach Untergrund, Gegner-Telegraph-Zischen, Boss-Brüllen, Ambient: Wind im Dorf,
  Tropfen/Hall in der Krypta, tiefes Dröhnen im Bossraum). WebAudio-prozedural oder
  CC0-Sounds aus assets/raw falls vorhanden; zentraler Mixer mit Lautstärkegruppen
- UI-Pass: Titelscreen (Logo-Typo Cinzel, Nebelhintergrund aus der Engine gerendert),
  Tod/Respawn-Inszenierung (Zeitlupe, Entsättigung, Erzählerzeile), Pausenmenü, Optionen
  (Lautstärke, Shake-Stärke, Post-Processing)
- Performance-Pass: Frustum-Culling prüfen, Instancing prüfen, Licht-Pool prüfen,
  Ziel 60 FPS auf Mittelklasse-Hardware
- Balancing-Durchlauf Ebene 1 bis Boss; README mit Steuerung und Asset-Credits (CC0-Quellen)

Abnahme: kompletter Durchlauf ohne Fehler, 6 finale Screenshots (Dorf, Taverne innen, alle
3 Krypta-Themes, Bosshalle) - bewerte jeden selbstkritisch und fixe das schwächste Bild.
```

---

## TEIL C - Feedback-Prompts für danach (Vorlagen zum Anpassen)

Kampfgefühl tunen:
```
Die Parade fühlt sich zu streng an. Erweitere das Fenster auf 300ms, mache den Telegraph-Ring
20% größer und füge 2 Frames mehr Ausholzeit beim Skelett-Krieger hinzu. Teste in der
DebugArena und zeig mir einen Screenshot des Parade-Moments.
```

Optik tunen:
```
Screenshot shots/dungeon-theme3.png wirkt zu flach. Erhöhe den Kontrast zwischen Lichtinseln
und Dunkelheit: Ambient um 30% runter, Fackel-Intensität 20% hoch, Nebel dichter. Danach
neuen Screenshot zum Vergleich.
```

Performance:
```
FPS fällt im Beinhaus unter 50. Profile die Szene (Drawcalls, Lichter, Partikel), berichte
die drei größten Kosten und optimiere sie, ohne die Optik sichtbar zu verschlechtern.
```

---

## TEIL D - Ehrliche Erwartung

Mit diesen Prompts entsteht: echtes isometrisches 3D, ein animierter Ritter mit Schwert und
Schild, Skelett-Horden, begehbare Häuser mit Dach-Fading, Fackellicht mit Schatten, Nebel,
Bloom - der Look eines hochwertigen stilisierten Indie-Spiels (Richtung Death's Door /
dunkles Tunic), nicht Diablo 4. Der Unterschied zu Diablo 4 ist kein Prompt, sondern ein
Asset-Budget von vielen Millionen. Wenn du später mehr Grafikqualität willst, ist der Hebel
immer derselbe: bessere Assets in assets/raw legen (auch gekaufte Packs von Synty/itch.io
funktionieren mit demselben Code) - und Claude Code bitten, sie zu integrieren.
