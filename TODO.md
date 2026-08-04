# TODO - Notizen für später (keine Nebenbei-Refactorings)

- Erledigt R75: Wetter-Achse + Stimmungsregen (bis 1. Dungeon) + Pfützen am
  Weg + Ufer-Schilf (Test, Autor-Abnahme offen) + liegender ez-tree-Stamm
  (zerlegbar; die alte backeLiege-Zwischenzeichnung ist gestrichen).
- POIs auf three.js - TEIL ERLEDIGT (R204): Galgen/Bildstock/Karren/Meiler
  sind 3D-Modelle (demo3d/poiBau.ts), gebacken via gfx/poiBitmaps.ts in der
  Boot-Kette, spawnePois zeigt poi3d_* mit Canvas-Fallback. Sichtpruefung per
  PNG-Export gemacht (2 Nachbesserungen: Meiler war "Schokokugel", Bildstock-
  Dach zu wuchtig). NOCH OFFEN: Wegweiser + Suehnekreuz (bewusst Canvas
  gelassen - beide leben von der eingekerbten Raben-Zeichnung, die in 3D
  nichts gewinnt) und die BRUECKE als 3D-Bake (T.BRIDGE-Sprite).
- Bewegtes GRAS + BLUMEN (three.js, Autor will besseren Look als die alten
  Canvas-Striche): Referenzen recherchiert - Codrops "Fluffiest Grass"
  (InstancedMesh + Wind-Shader) und github.com/CK42BB/procedural-grass-threejs
  (Bezier-Halme, Böen-Wellen). Ansatz für unser 2D-Spiel: Halm-Büschel im
  Backofen (three.js) backen -> Sprites mit leichtem Schwank-Shader. ez-tree
  bringt zusätzlich ein (nicht exportiertes) Grass-Modul mit GLB-Assets mit.

- WETTER-Feinschliff (R77 offen, Rest des dorfSim-Ports): Bewölkungs-TINT
  (Tageslicht dämpfen bei Regen), Nässe-Dunkelboden, Wind-Böenwelle örtlich
  (statt globaler Phase), Donner-Sound zum Blitz. Achse/Nebel/Blitz/Pfützen/
  Sturm-Wind stehen bereits.
- WICHTIG (Runde 73): die START-Karte (buildStart, NEUES SPIEL) ist auf den
  Engine-Pfad gehoben. Ihre Baum-OPTIK kommt noch aus dorfSim (ez-tree ->
  3D-Backofen) via gfx/baumBitmaps.ts (beim Boot registriert). Das ist die
  LETZTE Verbindung dieser Karte zu dorfSim - bewusst als reversibler
  Übergang. Sobald die finalen ComfyUI-Bäume da sind:
  registriereBaumBitmaps()-Aufruf in BootScene UND das Modul
  gfx/baumBitmaps.ts + die Export-Funktion baueBaumBitmaps() in dorfSim.ts
  wieder entfernen, obj_baum_*/obj_wald_* aus den ComfyUI-Assets laden. Dann
  ist die START-Karte komplett dorfSim-frei. Fest einplanen, sonst wird aus
  dem Übergang ein Dauerzustand.
- OFFEN (Messung, nur am echten Gerät): FPS auf der START-Karte (RTX 4070 Ti)
  und ob das Laufen ruckelfrei ist (kein dorfSim auf dieser Karte mehr -> der
  ~1s-Haken sollte weg sein). Entscheidet über "produktionsreif".

- BootScene erzeugt beim Start einige HEAD-Anfragen für fehlende
  Hot-Swap-Dateien - erwartetes Verhalten, im Netzwerk-Tab sichtbar,
  Konsole bleibt sauber.
- [x] Inventarliste ERLEDIGT (Altlast-Zeile): Maus-Rad blättert (panels.ts:158),
  Bildlaufleiste rechts (:1483). Browser-verifiziert R202 (Scroll 0->3->0 mit
  30 Items). Touch-Wisch offen, faellt unter den Touch-Gesamtpass.
- [x] Fähigkeits-Abklingzeiten ERLEDIGT (Altlast-Zeile, gebaut seit R60):
  Abkling-Schwung + Restsekunden-Zahl auf jedem Slot (hud.ts:1036). Browser-
  verifiziert R203 (R zeigt "7", T zeigt "4" bei laufendem Cd).
- Einrichtungs-Sets (Stufe 3) haben noch keine sichtbare Deko am Haus.
- Erledigt 2026-06-10: Einstellungen liefen bei kleinen Fenstern aus dem
  Bild - jetzt zweispaltig.
- Feedback-Runde 1, Rest: Buch-Lesen als eigenes Pergament-Fenster mit mehr
  Text. ERLEDIGT davon (R203-Audit): UI-Fenster verschiebbar (alle schwebenden
  Fenster haben Griffe - dialog, Charakter, questTracker, lichtPanel,
  devKonsole, heldEditor, shop, stash, Einstellungen, medievalUi-Panels;
  HUD/Kommando-Pult/Baukasten sind angedockte Leisten, Pause/Tod Vollbild);
  Maustasten-Belegung frei (M1-M5 per Rechtsklick belegbar, hud.ts);
  Zauberrollen-Schnellslot (Aktion 'rolle' wirkt die oberste Rolle).
- Feedback-Runde 3, noch offen (nächste Runde): Endboss mit 3 Phasen +
  Raumwechsel + Eskalation; mehr Zaubersprüche (Blitzschlag einzeln,
  Feuerwand ...); Maustasten FREI belegbar (aktuell feste Anzeige M3/M4/M5
  in der Leiste); Crafting-Ausbau (Rezepte-Werkbank); Housing-Ausbau
  (Innenraum, Deko sichtbar); Collectables; Fenster verschieben;
  Buch-Pergament-Fenster; Dev-Tuning-Panel mit Berichtsfunktion.
- Feedback-Runde 5, noch offen: Boss-Eskalation als echter RAUMWECHSEL
  (aktuell erscheint der Tempelritter im selben Raum, nachdem die Leibwache
  fällt); Karten-/Platzier-Editor im Entwicklungskasten; weitere Zauber;
  Crafting-Werkbank-Ausbau; Housing-Innenraum; Sammelalbum (Collectables);
  Fenster verschieben; Buch-Pergament-Fenster. (Hotbar-Drag&Drop: erledigt
  in Runde 20.)
- Feedback-Runde 6, notiert: Riesige prozedurale Außenwelt mit Biomen nach
  dem Boss-Sieg + Stadtmauern/Verteidigung (Autor-Idee, groß - braucht
  eigene Phase und ein Konzept: Welt-Chunks, Biome, Monster-Einfälle).
  Vorschlag Claude: erst als "Einfälle"-Ereignis klein anfangen.
- Einfälle/Stadtmauer, nächste Ausbaustufen (Autor-Plan): Boss-Monster
  alle 7 Tage, die die Palisade beschädigen können (Mauer-Reparatur);
  Dörfler wehren sich/nehmen Schaden; Mauer-Stufe 2 (Stein); danach
  offene Außenwelt mit 2-3 Biomen.
- Begehbare Häuser (Innenräume für Taverne, Hütten, Kirche) - eigene
  Phase: Innen-Karten, Tür-Übergänge, NPCs sichtbar am Tisch/im Bett.
  Aktuell verschwinden die Bewohner nachts "in" ihre Häuser.
- Geschlossene Dorf-Wirtschaft (Runde-16-Wunsch, nächster Ausbau):
  sichtbare Lager/Vorräte je Betrieb, Träger-NPCs bringen Waren
  (Korn -> Mühle -> Backhaus), Bestände beeinflussen Angebote.
- HD-Bild (Runde 21 notiert): Der Bildgrößen-Regler skaliert hoch und wird
  dadurch pixeliger. Die scharfe Lösung wäre, die Kacheln/Figuren aus den
  300px-Quellen gleich in größerer Zielauflösung zu rendern (TILE 32 -> 48):
  eigene Phase, weil Tempo-/Reichweiten-Werte in Pixeln mitskaliert werden
  müssen. Lohnt, sobald die Sprite-Sätze des Autors final sind.

- Runde 50, Art-Liste KOMPLETT abgearbeitet: Blut nur in Sonderräumen;
  Käfig/Kerzenschrein/Blut/Foliant-Optik überarbeitet; Streckbank über zwei
  Kacheln; Bücherregale mit Zuständen voll/durchsucht/leer (Zustand bleibt
  über Speichern/Laden); Bücher = seltene 10x-Schriftrollen; begehbare Zelle
  mit offenem Zellentor in der Folterkammer (kein Laden).
  Offen/zur Klärung (siehe OFFENE-FRAGEN.md): ob "begehbare Türen/Zellen" auch
  die normalen Krypta-Kammern/Türen meinte (aktuell als Folterkammer-Zelle
  umgesetzt) und ob die Folterkammer als komplett EIGENER Raumabschnitt mit
  Instrumenten + mehr Blut gewünscht ist (aktuell ein Sonderraum, nicht
  abgetrennt).

- Prolog: ab dem 3. Raum wiederholt sich der Spieler-/Bewegungs-/solid-/
  Lichtaufbau in KammerDerFinsternis/DieSchwelle/BlutstromGang (CLAUDE.md
  Regel 3, "ab dem dritten Mal extrahieren"). Schlanke Basisklasse
  PrologRaum (Held, bewege, solid, Licht, hint/zeigeMeldung, Titel)
  herausziehen, alle drei migrieren, alle drei neu verifizieren. Bewusst
  als eigener Schritt (kein Nebenbei-Refactoring).

## R96 - RTS "später"-Schicht (vom Autor als zweite Stufe eingeordnet)
- Lager-Bauten als Dateneinträge auf dem stehenden Bausystem: Feldaltar (Moral+
  Untotenresistenz-Aura), Mannschaftszelt (Ruhe -> Moral/Kraft), Kochstelle
  (zeitlicher Buff), Brunnen/Wasserfass (Moral über lange Belagerung),
  Feldschmiede (repariert Bauten/Ausrüstung), Wartfeuer/Signalfeuer (ruft
  Verstärkungswelle), Nachschubzelt (Ausrüstung im Feld verteilen).
- Erschöpfungs-/Wach-Wechsel-System (Einheiten-Moral/Ermüdung, Rotation).
- Ausrüstung ans Heer verteilen: benannte Ausrüstungs-Items mit Werten (Vorarbeit
  Opus), Zuweisung Einheit<-Slot im Dorf-Zeughaus + Feld-Nachschubzelt.
- [x] R99d: Turm-Reichweiten-Bonus ERLEDIGT - Enemy.turmReichF wirkt auf die
  Schussweite (Enemy.ts:460), FELDZUG.turmReichF setzt ihn beim Besetzen,
  zielFuer zieht den Suchradius mit (WorldScene:8953). Beim Turmtod zurueck
  auf 1.
- [x] R99d: Feldscher/Heiler ERLEDIGT - spawnVerbuendeter-
  Eintrag 'heiler', Heil-KI updateFeldscher (geht zum naechsten Verwundeten,
  heilt in Reichweite 16 HP/s, auch den Helden), Rekrutier-Knopf 'Feldscher'.
  Browser-verifiziert (Verwundeter 20->53 HP in ~2s).
- [x] R100d: 2-Kachel-Tor ERLEDIGT - das Tor belegt zwei Kacheln (tx2/ty2), wird
  als Paar gesetzt (WorldScene:4829) und beim Abbau auch als Paar geraeumt
  (:5036). Der Codex-Auftrag fuer die Tor-Grafiken (10 Texturen) liegt in
  docs/handoff/PROMPT-CODEX-PALISADE-TOR-TURM.md.
- R100 pruefen: "NPCs laufen wirr umher" - Idle-Verhalten der Verbuendeten/Feinde
  ohne Ziel im Auge behalten (sollten halten statt jittern).
- R102 Katakomben-Dungeon (V8): Runtime-AUSLOESUNG der Ereignis-Marker bauen
  (Hinterhalt: Tuer zu + Welle; Kaefig-Gefangener; Kerzen erloeschen;
  Sarkophag oeffnet sich; Blutgang-Einfaerbung vor dem Boss) - Marker liegen
  bereits als special-Eintraege im Level. Dazu: eigene Sprites fuer
  Sarkophag/Grabplatte/Waffenstaender statt der Annaeherungs-Kacheln.
- [ ] R106: RTS-Leiste (BANNER) auf das Mittelalter-UI-System (medievalUi.ts)
      umziehen, sobald der Autor die MENUE-PROBE abgenommen hat. Danach: Bau-
      Popup, Tooltips, ggf. Chronik. Echte Icons (gebackene Sprites) statt Emoji.
- [ ] V9-Dungeon (R116): V2-Stil komplett gefuellt (Leerflaeche = Raumboden),
      je Kammer 2 Tueren; ECHTE Dungeon-Tueren (T.DTUER: solid + sichtblockend,
      E oeffnet mit Aufschwing-Animation + Knarzen, Monster im Raum erwachen
      beim Oeffnen). Groesse wie V8/Katakomben (84x70). Spez in DUNGEON-VERSIONEN.md V9.
- [ ] V9-Tueren huebscher oeffnen (Autor: "die loesen sich einfach auf"):
      sichtbares Tuerblatt, das aufschwingt und OFFEN STEHEN BLEIBT (Sprite an
      der Wand), statt Kipp-Tween + Ausblenden.

- R139: Engstellen-Kompression (Dok 03, 1.8) - erst REPRODUZIEREN (Tor-Karte,
  breite Linie durchschicken, Verklumpung filmen), dann bauen. Regel 9.1.
- R139: Konter-Matrix auch fuer den HELDEN-Schwung gegen Einheiten-Tags
  (WAFFEN_SCHADENSART x kampfTags) - eigener Schritt, Dungeon-Balance pruefen.
- [x] R139: Feldscher/Heiler ERLEDIGT - spawnVerbuendeter-
  Eintrag 'heiler', Heil-KI updateFeldscher (geht zum naechsten Verwundeten,
  heilt in Reichweite 16 HP/s, auch den Helden), Rekrutier-Knopf 'Feldscher'.
  Browser-verifiziert (Verwundeter 20->53 HP in ~2s).
- R139: Flucht-/Sammel-RUFE als Sound-Assets (Autor fragen: WAV 48kHz/24bit).
- [x] R141: Fernkampf-Kills zaehlen fuer den Veteranen-Rang - war bereits
  verdrahtet (pr.schuetze -> meldeTruppenKill -> meldeKill), verifiziert:
  Ally-Pfeil-Kill -> ally.kills 0->1, einheit.kills 0->1.
- [x] R148-Politur: Auswahl-Karte (Leben/Moral) wird jetzt LIVE im 0,5-s-Takt
  nachgezogen (updateRtsWahlLive), guarded gegen Klick/Drag. Verifiziert.
- R148: Gebaeude-Karte zeigt Turm-Besatzung; weitere Gebaeude-Aktionen
  (Reparieren/Abbauen-Knoepfe in der Karte) folgen mit dem Gebaeude-Menue.

## R176-Folgearbeit (Autor-Plan, ausdruecklich SPAETER)
- Zelda-Innenraum fuer JEDES Stadt-Haus (Haus fuer Haus): Betreten oeffnet
  eine Innenraum-Karte wie beim Kirchenschiff; huebsche Assets entstehen
  mit Codex/Blender. Kirche zuerst verschoenern (aktuell alter R18-Raum).
- R179-Folgearbeit: der reitende Bote als SICHTBARE Figur (Codex-Pferd-Sprite)
  auf der Karte, wenn der Held ihm begegnet; Abfang-Szene statt Wuerfelwurf.
- [x] R201 Wegfindung Waldkarten ERLEDIGT: kantenPunkt liest die Weg-Kreuzung aus
  OBERWELT_KANTEN (wegKreuzungPx) statt der geometrischen Kantenmitte; das
  Auf-freien-Boden-Ruecken (angeschlossenerBoden) gilt jetzt fuer JEDES
  Kanten-Einsetzen, nicht nur fuer die Feldzug-Welle. Browser-A/B auf wald_o:
  West-Kante 3 Stehenbleiber -> 0, geretteter Spawn-Anteil 43 % -> 23 %,
  Marschweg 208 -> 285 px. REST: an der Nord-Kante bleibt 1/10 stehen (vorher
  ebenfalls 1) - kleiner Einzelfall, spaeter nachsehen.

## GROSSER GRAFIK-SPRUNG - Normal + Emissive aus dem Blender-Bake (Autor R109, Fahrplan)
Ziel (Autor-Zitat): "Normal- + Emissive-Maps aus dem Blender-Bake -> Light2D
bumpig + leuchtende Fenster." Farb-Grading, Vignette, Glatte-Kanten sind fertig.
Erarbeiteter, sauber verifizierbarer Weg (in kleinen Schritten, jeder mit
Browser-Beleg - der Playwright-Harness war in dieser Sitzung flaky, Bake-Pixel
im Browser messen sobald er wieder stabil ist):

1. propBackofen.ts: macheBackofen um ZWEI zusaetzliche Bake-Pässe erweitern, die
   DIESELBE Kamera-Rahmung wie backe() nutzen (Bilder liegen pixelgenau uebereinander):
   - backeNormal(gruppe): Meshes temporaer auf MeshNormalMaterial tauschen, rendern,
     zuruecktauschen -> Sicht-Raum-Normalen als RGB (Phaser-Light2D-__NORMAL-Format,
     0.5/0.5/1 = zur Kamera). Framing-Code aus backe() in einen Helfer ziehen.
   - backeEmissive(gruppe): Materialien auf unbeleuchtetes MeshBasicMaterial mit der
     emissive-Farbe (x emissiveIntensity) tauschen, auf Schwarz rendern -> nur die
     selbstleuchtenden Teile. (Braucht, dass Fenster-Meshes in den *Bau.ts emissive
     gesetzt bekommen - aktuell meist 0.)
   WICHTIG (CLAUDE.md §3 kein toter Code): NICHT als ungenutzte Exports committen -
   erst zusammen mit Schritt 2/3 einbauen, sodass sie sofort verwendet werden.
2. [ERLEDIGT R109] Emissiv: Feuer-Props (Kochstelle/Feldschmiede/Wartfeuer) leuchten
   nachts. backeEmissive im propBackofen, feldbau_<id>_glut in lagerBitmaps, additives
   Glow-Sprite je Prop (ruesteLagerGlut/updateLagerGlut), Alpha an nachtFaktor gekoppelt.
   Browser-verifiziert (Alpha tags 0, nachts 0,85). OFFEN falls gewuenscht: mehr Props
   mit Leucht-Teilen (Feldaltar-Kerzen?), und ein Regler fuer die Glut-Staerke.
3. Normal danach (Light2D bumpig): pro Prop-Textur die Normal-Bake als __NORMAL an
   die Phaser-Textur haengen und sprite.setPipeline('Light2D'); eine Lichtquelle
   (Sonne/Fackel) in der WorldScene. ACHTUNG Risiko-Checkliste: Light2D vertraegt
   sich evtl. schlecht mit der RESIZE-Skalierung und den Kamera-PostFX (Grading/
   Bloom) - isoliert testen, Rueckweg (an/aus) pruefen, in beide Richtungen.
Reihenfolge bewusst: Emissiv (klein, sichtbar, geringes Risiko) vor Normal/Light2D
(pipeline-tief, hoeheres Regressionsrisiko).

- IDEE (Autor): animierter Feuer-Effekt statt gebackener Glut-Sprite - three.js/
  Partikel-Flamme (Zuckeln, Funken, Rauch) fuer Kochstelle/Wartfeuer/Lagerfeuer.
  Die Nacht-Beleuchtung selbst ist jetzt korrekt (Feuer stanzen Licht + Schein);
  dieser Punkt betrifft nur die BEWEGTE Optik der Flamme, nicht das Licht.

## FELDZUG UM RAVENSMOOR - Staffelplan (Autor-Vision, Runde aktuell)
Autor-Entscheidung: nach dem Boss rollt der Kampf um Ravensmoor OHNE Pause
weiter (Dynamik gewollt). Der Held allein schafft es nicht - er muss die
Bewohner in Sicherheit bringen UND Verstaerkung holen. Erst bei der
Rueckeroberung mit mehreren Einheiten bleiben die Wellen aus, dann beginnt
Ausbau/Sicherung der Stadt.

- [x] SCHRITT 1 (erledigt): Wirtshaus = klassischer RPG-Eingang (Tuer ->
      Innen-Instanz innen_taverne). leaveInterior kehrt zur Herkunftskarte
      zurueck (nicht mehr ins tote Dorf). Grundstein fuer die Zuflucht.
- [ ] (Feldzug-Haeuser) SCHRITT 2: 3D-Begehbare Gebaeude, in denen NPCs stecken bleiben,
      entschaerfen - Fussabdruck SOLID machen (kein 1:1-Reinlaufen mehr), Tuer
      als einziger Eingang. Betrifft Wirtshaus (+ spaeter Gemeindehaus, das
      der Autor noch platzieren will).
- [ ] SCHRITT 3: Bewohner-FLUCHT bei Einfall: lebende NPCs pathen zur
      Wirtshaus-Tuer und "verschwinden" in die Innen-Instanz (Zustand
      'gefluechtet'). Auch VERWUNDETE fliehen - Verwundung blockiert nicht.
      Monster folgen NICHT in die Instanz (sichere Zuflucht). Geheilt wird
      drinnen in Sicherheit.
- [ ] SCHRITT 4: Bewohner wieder RAUSHOLEN + westlich zur Zuflucht begleiten
      (Eskorte). Mechanik im Eifer des Gefechts noch offen (Vorschlag: Held
      spricht sie in der Instanz an -> sie folgen ihm als Gruppe zur Westkante).
- [ ] SCHRITT 5: Wellen-Logik: Angriff laeuft ununterbrochen weiter (Held
      allein nicht gewinnbar). Bei der RUECKEROBERUNG mit >=X eigenen
      Einheiten: Wellen aussetzen -> Verschnaufen -> Ausbau/Sicherung.
- [ ] Gemeindehaus als Gebaeude platzieren (Autor will es selbst hinstellen);
      Innen-Def gemeindehaus existiert bereits, wird analog zum Wirtshaus
      verdrahtet, sobald das Gebaeude steht.

## PERF-BEFUND Ravensmoor-Ruckeln / 5 FPS Grafen-Einberufung (#107, Messung)
Headless-Messung (Stadt, ms/Frame ueber 60 Schritte):
- leer (0 Einheiten): ~600 ms/Frame  |  +80 Einheiten: ~595 ms/Frame
=> Die Einheiten kosten praktisch NICHTS extra. Die per-Frame-Kosten sind FIX.
Analyse der CPU-Seite (alles schon optimiert):
- Trennung/Separation: Spatial-Grid O(n) (R188). Kein O(n^2).
- Wegfindung: pro Einheit gedrosselt (nur alle ~0,7-1,2 s neu), NICHT per Frame.
- 3D-Gebaeude (gebaeude3dWelt): rendern NUR bei Tuer-Animation/dirty, nicht per Frame.
- applyFigure: nur setTexture bei Aenderung.
SCHLUSS: Der Ruckler ist NICHT die Einheiten-KI. Die ~600 ms sind der SOFTWARE-
WebGL-Renderer im Headless (PostFX/Bloom/Grading/Shader ueber 1280x720) - auf der
RTX 4070 des Autors ist das ein Bruchteil. Ein VERLAESSLICHER Profil des echten
5-FPS-Effekts geht nur AUF DEM GERAET des Autors.
NAECHSTER SCHRITT (Autor, RTX 4070): Chrome DevTools > Performance > Aufnahme
WAEHREND der Grafen-Einberufung (5-8 s), dann schicken:
- ist es ein SPITZEN-Hitch beim Spawn (viele Sprites/Text auf einmal) oder ein
  DAUERHAFTER Einbruch, solange das Heer gross ist?
- welcher Balken dominiert (Scripting = CPU/JS, oder Rendering/GPU = PostFX)?
Verdacht (zu pruefen mit dem Profil): (a) Spawn-Spike durch viele Sprite/Text-
Objekte auf einen Schlag -> gestaffelt spawnen; (b) Live-Karten-/HUD-Neuaufbau
mit vielen Markern; (c) PostFX-Kette (Bloom) zu teuer bei vielen additiven
Lichtern -> Bloom im Einfall drosseln. Ohne Geraeteprofil aber nicht auf Verdacht.

## R213-GEPLANT: Elementar-Waffen fuer hohe Ebenen (Autor-Order, "spaeter")
- Fernkampf-Monster ab hoeheren Ebenen verschiessen AB UND ZU Brand-/Frost-/
  Schattenpfeile wie der Held (ELEM_PFEIL existiert bereits fuer Spieler-
  Munition: Brand = DoT via BRAND_TICK_S, Frost = verlangsamen, Schatten =
  Leben saugen). WICHTIG (Autor): nur gelegentlich, weil DoT dazukommt -
  Vorschlag: elemChance je Ebene in enemies.ts (e3: 15 %, e4: 25 %, e5: 35 %),
  Elementwahl passend zum Ebenen-Ton (Blutstrom -> Brand, Katakomben -> Frost,
  Schattenwerk -> Schatten). Verdrahtung: spawnEnemyProjectile bekommt elem,
  Treffer-Zweig nutzt die BESTEHENDE Elem-Logik der Spielerpfeile.
- Dasselbe fuer NAHKAEMPFER: brennende/frostige Schwerter (Klinge im HD-
  Zeichner mit Glut-/Frostkante + Partikel am Schlag, Schaden ueber dieselben
  On-Hit-Effekte). Erst nach Autor-Abnahme der Schlag-Animation (R209).
- R209-Folge: Fernkampf-Schuss mit kurzem Spann-VORLAUF (Bogen sichtbar
  gespannt BEVOR der Pfeil fliegt) - braucht einen kleinen KI-Umbau
  (Schuss-Telegraph analog windup).

## R227 - Feindzug-Regeln (Autor-Klaerung)
- [x] Spieler-FELDBAUTEN zaehlen in die ABSTRAKTE Verteidigung einer
      Karte: bautenAbwehr (logic/feindzug.ts) + FELDBAU_ABWEHR in
      src/data/welt.ts - seit R227 in verteidigung() verdrahtet.
- [x] VERSORGUNGSLINIE VOM KLOSTER: istVersorgt (logic/feindzug.ts) -
      abgeschnittene Feindlager produzieren nichts und greifen nicht an
      (seit R227, FELDZUG.startBesetzt als Ursprung).
- [x] Schmied-Lehrling KOMPLETT (R229+R231): Bewohner-NPC am Amboss,
      Ruf-Knopf an die Feldschmiede (Route-frei-Pruefung), Lehrling-
      allein-Malus (halbe Schmelze, Stueck nur jeden 2. Tag). Offen
      bleibt nur ein Qualitaets-Feld je Waffe, falls das Zeughaus kommt.
- [ ] Schmied-Verrats-Bogen (Doku 07/4b+4c, naechster Baustein): Akt 2
      Vertrauen (Botengaenge), Akt 3 "Lieferung an den Grafen" -
      Schmied fort, Ahnengruft-Siegel bricht, Wenzel traegt die Esse.
- [ ] Umkehrer (Doku 07/3): vertriebene/begnadigte Voegte, die die
      Aushoehlung gesehen haben, brechen mit dem Feind - Informanten/
      Fluechtlinge. Braucht: Vogt-Schicksale nach Gefangennahme,
      zweites-Dorf-Frage (aufnehmen oder verstossen).
- [ ] Dorfstimmungs-Malus fuer das Toeten unbewaffneter Voegte (aktuell
      nur Chronik-Eintrag) - sobald es ein Stimmungs-System gibt.
- [ ] Waffenkammer-LISTE sichtbar machen (Verwaltungs-Buch/Lager-Tab):
      aktuell erzaehlen nur Chronik + Rekrutierungs-Meldung die Stuecke.
      Spaeter: Zeughaus-Zuteilung einzelner Klingen an einzelne Soldaten.
- [ ] Werkzeuge analog als Einzelstuecke? (Aktuell nur Waffen - Autor
      fragte nach Waffen; Werkzeuge blieben Zaehler.)
