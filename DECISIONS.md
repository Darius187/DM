# DECISIONS - Protokoll aller Annahmen und Entscheidungen

- Runde 104b (Dorf: quadratisch + Boxen 1:1 aus Planungskarte; Wasser-Vorschlag):
  * GROESSE: 'stadt' jetzt QUADRATISCH 128x128 (Autor "Karte zu klein, groesser/quadratisch") - passt 1:1 zur 128x128-Planungskarte. Entkoppelt via OberweltCfg.w/h (Default 130x85 fuer alle anderen Areas). ACHTUNG: bricht die Naht zu den Oberwelt-Nachbarn - fuer die (halb-)eigenstaendige Dorfkarte ok, Overworld-Verdrahtung ist eh offen.
  * FPS: im Headless nicht messbar (kein GPU, ~2 FPS konstant ueber alle Groessen -> Groesse ist NICHT der Dauer-Bottleneck). Architektur: Kacheln einmalig erzeugt + kamera-gecullt -> Groesse kostet v.a. Ladezeit/Speicher (128x128 ~16k Tile-Objekte vs 130x85 ~8.7k). 128x128 sicher; jenseits ~200x200 wird Ladezeit/Speicher zum Thema. DEV-Haken window.__stadtGroesse fuer weitere Tests.
  * BOXEN 1:1 aus der Autor-Planungskarte uebernommen (dorfplan.ts, 128x128-Kacheln). Muehle B6 + Muellerhaus B7 am echten Ostfluss.
  * WASSER-VORSCHLAG (NICHT umgesetzt, dem Autor gezeigt - Regel "Wasser nicht ungefragt umbauen"): Suedbach + See RAUS, nur der Ostfluss bleibt -> Sueden frei fuer Felder (wie in der Planungskarte, die keinen Suedfluss hat). Wartet auf Autor-Freigabe.

- Runde 104 (Dorf-Layout-Planung als Platzhalter-Boxen auf 'stadt', Autorauftrag):
  * REINE Positionsplanung: beschriftete Platzhalter-Rechtecke (src/data/dorfplan.ts + Overlay in WorldScene.zeichneDorfplan), KEINE Sprites/NPCs/Kollision/Interaktion. Overlay nur in der 'stadt'-Area, Flag DORFPLAN_AN.
  * Ziel-Area = 'stadt' (buildStadtNatur, "neue Ravensmoor-Dorf-Karte" mit dem bewusst angelegten Wasser), 130x85 Kacheln - NICHT 128x128 wie die Planungskarte. Positionen ans ECHTE Terrain angepasst (Salzstrasse-Spine E-W bei y~45, Nordstrasse T-Kreuz x~55, Ostfluss x~99, See unten-rechts), nicht roh aus 128x128 skaliert.
  * TERRAIN-VORRANG (Autor-Praezisierung): landet ein Platzhalter auf Wasser/Baeumen -> erst den Platzhalter verschieben (+ notes), NICHT das Terrain. Das neue Wasser wird NICHT ungefragt umgebaut - bei Bedarf erst zeigen/fragen. Umgesetzt: Muehle B6 + Muellerhaus B7 an den echten Ostfluss statt an die gemalte Stelle; Loeschteich = nur Platzhalter-Box (kein echtes Wasser).
  * Planungsbild lag den Uploads NICHT bei -> Layout aus Autor-Text + Angerdorf-Archetyp + Terrain abgeleitet (erster begehbarer Durchlauf). Exakte Positionen kommen mit dem Bild. Offen in OFFENE-FRAGEN 25.
  * Ausgaenge passen nicht zur Oberwelt-Nachbarschaft (Wunsch Kloster/Burg/Marktort/Dunkelwald vs. aktuell lager/wald_se/start/nichts; Suedkante ohne Weg-Uebergang) - Platzhalter markieren nur den Wunsch; echte Verdrahtung offen (OFFENE-FRAGEN 26). Sued-Ausgang notgedrungen in der Wasser/Wald-Zone, geflaggt.

- Runde 102b (Autor-Rueckmeldung zum Katakomben-Dungeon V8):
  * GAENGE ZU ENG (Autor "1-Kachel-Gang, die 2x-Wandfassade ragt rein"): Gaenge sind jetzt IMMER 2 Kacheln breit (grabeGang zweite Spur immer, nur in Fels, nie Raum-/Vault-Waende). Verifiziert: 99% der Gang-Kacheln 2-breit, nur Tuerdurchgaenge auf 1. breiterGangChance entfernt.
  * RAEUME ZU LEER: mehr Wand-Props je Rolle (propAnzahl hoch) + begehbare Boden-Deko (deko: Blut/Runen). DEKO-BUDGET: hoechstens 50% des Rauminneren bekommt Marker, damit kleine Raeume trotz mehr Props begehbar bleiben (Props werden im Live-Level z.T. solide Moebel). Deko blockt nie (nur BLOOD/RUNE = begehbar).
  * Autor-Urteil: "nicht das was ich wollte aber wir nehmen das jetzt" - mit den vorhandenen Kacheln nicht schmuckhaft genug; eigene Deko-Sprites bleiben TODO.
  * VERWENDUNG bewusst OFFEN gelassen (Autor entscheidet Ort spaeter: Uebergang/Passage/evtl. erste Karte). In DUNGEON-VERSIONEN.md + OFFENE-FRAGEN 23 als "wenn der Autor nach dem Dungeon/der Passage fragt, ist V8 gemeint" verankert - GEDAECHTNIS liegt in den DATEIEN, nicht im Chat (CLAUDE.md 12).

- Runde 102 (Katakomben-Generator, Autorauftrag komplett Phase 1-4):
  * OUTPUT = EDITOR-Codes (dungeonVorlage 0-4), NICHT neues Format - Editor/Export/Probe unveraendert, generierte Karten im Editor bearbeitbar (Editor uebernimmt V8 jetzt 1:1 inkl. Tueren/Gaenge).
  * Groesse "ca. 3x": 84x70 (=5880 Kacheln) vs. Krypta 44x44 (=1936). In DIABLO_GEN aenderbar.
  * FUELL-RolLE "gewoelbe": die Rollen-Tabelle des Autors deckt ~10 Raeume, der Dungeon hat 18-28 - ueberzaehlige Raeume werden schlichtes Gewoelbe (wenig Props, mittlere Gegner). Leicht aenderbar (Gewichte in DIABLO_ROLLEN).
  * BOSSARENA = unter den 3 graph-FERNSTEN Raeumen der GROESSTE (statt stur der fernste): "am weitesten weg" bleibt erfuellt, aber die Arena ist nie ein 5x5-Kaemmerchen. 2 grosse Raeume werden beim Platzieren garantiert.
  * Bossarena-Props deterministisch je 1x (Blutfont, Ritualkreis, Treppe ab) statt zufaellig gezogen - sonst koennte die Abstiegs-Treppe fehlen (Kette kaputt, Regel 10).
  * GEHEIMTUER im Live-Spiel = T.CRACK (Mauerriss, mit Angriffen aufbrechbar) - bestehende Mechanik statt neuer Tuer-Zustand. In der Probe/im Editor normale Tuer + geheim-Flag.
  * Vault-Stollen duerfen fruehere Vaults NIE anritzen (Tabu-Pruefung) - sonst zweite Oeffnung; Wand-Kreuzung nur durch Haupt-Raum-Ringe (dort entsteht regulaer eine Tuer).
  * gegner_boss im Live-Einsatz = Elite-Champion "Herr der Tiefe" (KEIN Templer-Boss: dessen Tod-Logik gehoert den Boss-Kammern; echte Boss-Inszenierung entscheidet der Autor).
  * EINSATZ flexibel + Standard AUS: KATAKOMBEN_EINSATZ { ebenen: [], abEbene: null }. Hook an EINER Stelle (WorldScene holeArea, crypt-Zweig). Test: Probe V8 + F10-Knopf "Katakomben-Dungeon betreten (Ebene 1, Test)". DEV-Haken window.__katakombenEinsatz (Vite-import() im Test lieferte sonst eine ZWEITE Modul-Instanz - Falle dokumentiert).
  * Ereignis-Marker (hinterhalt/kaefig/kerzen_aus/sarkophag/blutgang) werden generiert + im Live-Level als special-Eintraege sichtbar; die RUNTIME-AUSLOESUNG (Tuer zu, Welle, Licht aus, ...) ist bewusst ein EIGENER spaeterer Schritt (TODO).
  * Prop-Marker -> vorhandene Kacheln als Annaeherung (Sarkophag=Grabstein, Grabplatte=Rune, Waffenstaender=leeres Regal, Kette=Gebeine); eigene Sprites je Rolle = spaeterer Asset-Schritt.

- Runde 101e (Autor-Bug "Krieger findet den Weg um die lange Palisade nicht, laeuft nur hin und her"):
  * Ursache: MARSCH-Befehle (jagdZiel) benutzten die GREEDY-Nahausweichung (laufe), NICHT das globale Flussfeld. Greedy sieht nur ein paar Pixel voraus -> an einer langen Wand jittert die Einheit, statt aussen herumzufinden. Das Flussfeld (deckt die GANZE Karte, kein Reichweiten-Limit - in Wegfeld.ts geprueft) wurde bisher nur beim KAMPF-Anlauf genutzt.
  * Fix: neue Host-Abfrage wegRichtungZiel(x,y,zielX,zielY) = Flussfeld-Richtung zu einem BELIEBIGEN Ziel (ueber rtsBattle.wegPunkt(team,...)). jagdZiel- UND belagerungsZiel-Marsch folgen jetzt dem Flussfeld (um Waende herum), Fallback greedy nur wenn kein Feld/kein Weg. Basis-Host (Feind ohne Verbuendete/Tor) liefert null -> greedy (dort nur Kurzstrecken-Jagd).
  * Verifiziert: Verbuendeter rechts einer langen senkrechten Palisade, Marschziel links -> laeuft ums offene Wandende herum auf die linke Seite (vorher: Jitter an der Wand).

- Runde 101d (Autor "ich will die Turm-Winkel im echten Spiel vergleichen"): drei
  baubare Wachturm-Varianten mit unterschiedlichem Kamera-BACKWINKEL - wachturm (57°,
  aktuell), wachturm_45 (45°), wachturm_40 (40°). Kleinerer Winkel = schraeger =
  mehr Fassade, weniger Dach. Gleiche Mechanik (2x2, Besatzung, Belagerung, HP), nur
  das gebackene Sprite unterscheidet sich. macheBackofen bekam einen optionalen
  elevGrad-Parameter (ohne Angabe unveraendert ~57°). Turm-Logik ueber Praedikat
  istWachturm(id)=id.startsWith('wachturm') entkoppelt. VORLAEUFIG zum Vergleich -
  sobald der Autor einen Winkel waehlt, fliegen die anderen beiden wieder raus.

- Runde 101c (Autor-Bug "bei offenem Tor kommen die Monster nicht rein"):
  * Ursache: Feinde nutzten die ROHE Kollision/Wegfindung (isSolidAt), in der ein Tor IMMER solide ist - nur Held/Truppe bekamen ueber solidFuerHeld die Ausnahme "offenes Tor passierbar". Ein offenes Tor war also nur fuer eigene Einheiten offen (Alt-Design R99 P11 "Zugangskontrolle").
  * Neu: ein OFFENES Tor ist fuer JEDEN passierbar. Neuer Helfer torOffenHier(x,y) + solidFuerFeind(x,y) (= isSolidAt, aber offenes Tor frei). Verdrahtet in: Feind-Kollision (enemyHost-Proxy), Feind-Wegfeld (rtsBattle begehbar), Szenen-Wegfeld zum Helden (begehbarFuerWeg override). Der Feind-Schnellpfad (Host = this) wird uebersprungen, sobald ueberhaupt ein Tor existiert - sonst braeuchte der Feind die rohe Kollision und bliebe draussen.
  * Verifiziert: geschlossenes Tor -> 0 Monster drin; nach Oeffnen stroemen 3/4 hinter die Torlinie (belagerungsZiel geloescht, hatWegZumZiel=true). Tor-Meldung angepasst ("jetzt kommen auch Feinde herein").
  * Design-Konsequenz (bewusst): das Tor hat keine Fraktions-Zugangskontrolle mehr - offen = fuer alle offen (taktische Wahl: aufmachen zum Ausfall heisst Feinde reinlassen).

- Runde 101b (Turm-Ausrichtung + Belagerungs-KI, Autor "Turm von vorne wie die Haeuser; Monster sollen die schwaechste Stelle gezielt angreifen; eingeschlossene Bogenschuetzen sollen still halten"):
  * TURM-BLICK: Codex-Wachturm jetzt FRONT (0deg Yaw) statt 3/4 (40deg) gebacken - eine Wand fluchtet zur Kamera wie die uebrigen Haeuser, 2x2-Grundflaeche achsparallel. Origin 0.5/0.78, Zielhoehe 132 (Beinstand ~2 Kacheln, Fuesse an der Block-Vorderkante). Ein-Zeilen-Umschalter in lagerBitmaps, falls doch 3/4 gewuenscht. Spieler-Drehung bei Platzierung NICHT gebaut (der Turm ist 4-fach symmetrisch, 45deg saehe diagonal aus) - offener Punkt, falls asymmetrische Bauten kommen.
  * BELAGERUNGS-FOKUS (updateBelagerung neu): Angreifer nagen nicht mehr jeder am naechsten Stueck, sondern die Belagerung waehlt EINE Bresche = schwaechste Struktur (HP + naeheGewicht*Dist zum Angreifer-Schwerpunkt) und verteilt die Belagerer auf die Bresche + ihre Nachbarn im Abschnitt (je maxProStelle=2) -> gebuendelter Angriff auf 2-3 Kacheln, "nicht alle auf einer Stelle". Nur Feinde OHNE Weg zum Ziel (eingeschlossen) belagern - wer durchs offene Tor/aussen herum kann, zieht normal durch. Bricht eine Struktur, werden die Flussfelder sofort verworfen (rtsBattle.wegfelderNeu + Szenen-wegfeldNeu) -> Angreifer stroemen durch die Bresche. Bresche-Ziel liegt als e.belagerungsZiel im Enemy; eine neue Enemy-Marsch-Branche laeuft hin und HAELT davor. Verifiziert: 6 Monster verteilen sich 2/2/2 auf den naechsten Wandabschnitt und reissen ihn ein.
  * EINGESCHLOSSENE HALTEN STILL: neue Host-Abfrage wegBlockiert(x,y) = "Flussfeld vorhanden, aber von hier kein Weg zum Ziel". In der Annaeherungs-Branche haelt die Einheit jetzt bei wegAng===null UND (wegBlockiert ODER Wand davor) - vorher liess der reine !direktFrei-Test eingeschlossene (Bogen-)Einheiten an einer weiter entfernten Mauer entlangrutschen ("liefen wild hin und her"). Ohne Feld (offenes Gelaende) unveraendert direkter Anlauf. Verifiziert: eingeschlossener Bogenschuetze driftet 9px, step=0.
  * OFFEN/naechste Ideen (dem Autor genannt, nicht gebaut): Nahkampf-Verteidiger sollen eine frische Bresche aktiv zuhalten; Belagerungs-Tempo (schadensFaktor) ist ein Balancing-Wert falls Bresche zu langsam.

- Runde 101 (Codex-Wachturm einbauen, Autorwunsch "setze das Asset ein, den Turm in 4 Kacheln zeichnen und beim Bauen 4 Kacheln anzeigen"):
  * PORT statt PNG: Codex' `tower.js` (ueberdachter Verteidigungsturm) wurde als Geometrie 1:1 nach `src/demo3d/codexTurm.ts` (Export `baueWachturm`) portiert und ueber den bestehenden propBackofen gebacken - NICHT das fertige `defense-tower-roofed.png` geladen. Begruendung: das PNG ist im Codex-Winkel (azimuth 40) fest gerendert; ueber die Bake-Pipeline bekommt der Turm die Spiel-Beleuchtung und fluchtet mit Palisade/Tor. RoundedBoxGeometry kommt aus `three/examples/jsm/geometries/` (im Projekt vorhanden). Anisotropie ohne Renderer = fester Wert 4 statt getMaxAnisotropy(). Seed 1402 bleibt (deterministisch, kein Math.random).
  * BAKE-WINKEL: Turm wird mit 40deg Gruppen-Yaw gebacken (asset.json azimuthDegrees 40) - genau die 3/4-Ansicht, die der Autor gelobt hat (Rumpf/Bruestung/Streben sichtbar statt reiner Dachflaeche; loest zugleich die alte "zuviel Dach"-Kritik). Leicht aenderbar in `src/gfx/lagerBitmaps.ts` (eine Zeile).
  * 2x2-FUSSABDRUCK: `bauFussabdruck('wachturm')=2`, sonst 1. Neue Helfer `bauSnap` (schnappt auf den Block, cx/cy=Block-MITTE) und `bauplatzFreiBlock` (alle 4 Kacheln muessen bebaubar sein). Platzierungs-Geist + Baustellen-Umriss zeigen 2x2 (66px). Feldbau merkt tx/ty (obere-linke Kachel) + tx2/ty2 (untere-rechte). Sprite: origin (0.5,0.78), Zielhoehe 132 -> Beinstand ~2 Kacheln (verifiziert: Beinband world-y 1723-1789 deckt Block 1728-1792). Tiefe = Block-Vorderkante (y+24).
  * KOLLISION bewusst NICHT gesetzt: der Turm-Block bleibt begehbar (wie der alte Wachturm auch). Grund: die Turm-Besatzung pfadet zur Turm-MITTE und dockt dort an (rtsBattle festPos) - ein solider 2x2-Block wuerde das Andocken via Wegfeld blockieren. Monster greifen den Turm weiter ueber updateBelagerung an (unabhaengig von Solidity). Falls spaeter doch Kollision gewuenscht: Rand-Kacheln solide, Mitte frei - offener Punkt.
  * Alter gemalter `baueWachturm` in `lagerBau.ts` entfernt (toter Code), Canvas-Fallback `macheWachturmBild` bleibt fuer den Bake-Fehlerfall.

- Runde 69 (ANFANGSKARTE-Layout im Canvas + Port-Ansatz HYBRID, Autorwunsch "erste Anfangskarte so groß wie die Stadtkarte, alle Biome außer Schnee, natürlicher Weg West->Ost Richtung Stadt; übertrage ins Live-Spiel"):
  * PORT-ANSATZ vom Autor gewählt: HYBRID (Canvas-Boden + Tile-Figuren) - die Canvas-Welt (Terrain/Wasser/Bäume/Wetter) als Hintergrund, darüber die Spiel-Entitäten (Spieler/NPCs/Gegner) aus dem Tile-System. Begründung: Live-Spiel ist kachelbasiert (32px), Demo ist freies Canvas; Hybrid behält den weichen Look UND bindet das Kampfsystem ein.
  * ARCHITEKTUR-Befund (2 Explore-Agenten): Live-Spiel rendert über eine Custom-Canvas-Tile-Engine (Integer-Tile-Arrays, depth-sortierte Phaser-Images, KEINE Phaser-Tilemap), Map-Generatoren in src/world/areagen.ts (AreaData). Stadtkarte-Planer StadtProbe = 130x85 Tiles = 4160x2720px (TILE=32). Dev-UI existiert: F10-Entwicklungskasten (CombatScene) + LichtPanel (L) mit echten Slider-Bars.
  * ANFANGSKARTE v1 (im Canvas/Demo gebaut, da portabel): WELT_W/H = 4160x2720 (Stadtkarte-Größe). Schnee-Berg AUS via Flag BERG_AN=false (NORD_Y=0, baueBerg/zeichneBerg/Berg-Bäume+Felsen+Hütte geguardet). Weg West->Ost (Held startet West, Stadt im Osten). Fluss Nord->Süd kreuzt den Weg (Brücke setzt sich automatisch an die Kreuzung, verifiziert cx=1533), Bach mündet als Y-Gabelung in den Fluss, Fluss mündet in den See (SO). Biome Wald/Wiese/Moor/Fels sind noise-getrieben -> füllen die größere Welt automatisch. Verifiziert per Screenshots (Start West, Brücken-Kreuzung, Y-Gabelung, See-Zufluss; kein Schnee mehr).
  * Baumgröße-Empfehlung 0.85 (R69) auch hier wirksam.
  * RAND-zu-RAND (Autorwunsch): Wege/Flüsse/Bäche laufen jetzt von Kartenrand zu Kartenrand statt mitten zu enden. Weg: West-Kante (y=1500) -> Ost-Kante (y=1350). Fluss: Nord-Kante (x=1700) -> durch den See -> Süd-Kante (x=3320). Bach: West-Kante (y=760) -> Y-Mündung in den Fluss. Brücke automatisch an der Kreuzung (cx=1976 verifiziert). See liegt AUF dem Flusslauf (Fluss fließt durch). Alle 4 Kanten per Screenshot geprüft.
  * KANTEN-MANIFEST: src/data/kartenKanten.ts hält die Kreuzungs-Positionen je Kante fest (Memory für nahtlose Nachbarkarten). Ost-Kante hier = West-Kante der Stadt -> Stadt muss den Weg bei y=1350 fortsetzen.
  * Stadtkarte ist 130x85 Tiles (4160x2720), NICHT quadratisch. Startkarte teilt die senkrechte Ostkante mit der Stadt -> Höhe MUSS 2720 sein (nicht 4160x4160), sonst kein nahtloser Übergang. Zukünftig: Folgekarten direkt live bauen, sobald die Hybrid-Pipeline steht.
  * OFFEN (nächste Schritte): (1) dorfSim als einbettbares Modul (init(canvas)) refaktorieren; (2) Hybrid-Phaser-Szene "Anfangskarte" = Canvas-Boden-Layer + Tile-Entitäten + Kollisionsgrid aus der Canvas-Geometrie; (3) alle Regler in die Dev-Konsole (LichtPanel-Stil); (4) Übergang in die Stadt im Osten.
- Runde 68 (gefällter Baum liegt neben dem Stumpf, Autorkritik "die bäume liegen über dem abgesägten teil drüber"):
  * STUMPF SICHTBAR (BEHALTEN): der gefällte Stamm rutscht beim Fallen vom Stumpf (gap = 26*sk*prog in Fallrichtung) -> der Stumpf mit Schnittfläche bleibt sichtbar NEBEN dem Holz statt darunter verdeckt.
  * Hack-Stufen (entrindeter Stamm / in Scheiben zerlegt als prozedurales Rundholz) WIEDER ENTFERNT: der Autor fand sie deutlich unpassend ("sehen SCHEISSE aus, haben nichts mit dem eigentlichen Baum zu tun, komplett andere Bilder"). Der liegende Baum bleibt beim Hacken jetzt durchgehend das ECHTE gebackene Baum-Sprite (wie vor R68), nur das Abrutschen vom Stumpf bleibt. Holz wird weiterhin in Etappen gesammelt (unsichtbar), bis der Stamm weg ist.
  * Lehre: prozedural neu gemaltes Holz passt stilistisch NICHT zum gebackenen 3D-Baum-Sprite. Falls Hack-Stufen erneut gewünscht, müssten sie aus dem GLEICHEN gebackenen Sprite abgeleitet werden (z.B. Krone wegblenden, Stamm freistellen), nicht frei gezeichnet.
- Runde 67 (Wasser-Konturen raus + ineinander fließend, Autorkritik "du hast das wasser deutlich verschlechtert, eine kontur ums wasser, nichts fließt ineinander", Referenz madebyevan.com/webgl-water):
  * KONTUREN ENTFERNT: helle Schaum-Uferkanten (Bach rgba(222,242,242), Fluss rgba(150,168,188)), die helle Gras-Lippe der Böschung und ALLE harten inneren Wand-Linien (uferWand-Funktion gelöscht, See-Wand-Stroke, Mündungs-Rinnen-Stroke). Diese erzeugten den sichtbaren Saum/Kontur.
  * WEICHER UFERHANG: uferBoeschung neu = 9 sehr dünne, niedrig-alpha Schatten-Ringe (außen breit -> innen schmal), gestapelt zu einem glatten Schatten-Halo ohne Banding/Kontur. See-Böschung analog (8 gefederte Ringe statt 3 harter Bänder).
  * INEINANDER FLIESSEND: (a) Bach-Mündung vertieft sich jetzt (klar -> dunkel wie der Fluss) über die letzten ~11 Mittelpunkte per Längs-Gradient -> der klare Bach fließt sichtbar in den Fluss statt hell daneben zu enden. (b) Fluss->See nutzt weiter die Mündungs-Rinne (gleiche Tiefen-Palette), jetzt ohne harte Wand-Linie. Bach-Mündungs-Schaum stark reduziert (zarter Hauch statt heller Blobs).
  * Tiefen-Verlauf (tiefeFarbe/kanalTiefe) bleibt, trägt jetzt allein die Tiefe; Ränder laufen weich aus. Verifiziert per Screenshots (Bach->Fluss, Fluss->See): keine Kontur mehr, Gewässer gehen ineinander über. tsc grün.
- Phaser 3 (3.90) statt Phaser 4 gepinnt - der Masterprompt nennt ausdrücklich Phaser 3.
- Dependencies: phaser (Spec), vite/typescript/vitest (Spec Teil 3.1). Keine weiteren.
- CLAUDE.md im Repo war eine generische Vorlage; durch den hochgeladenen Arbeitskodex des Autors ersetzt.
- Referenzdatei nach reference/ravensmoor-v2.html kopiert, Masterprompt in den Projektstamm.
- Vite publicDir auf assets/ gesetzt: Hot-Swap-Dateien liegen wie spezifiziert in assets/..., URLs intern ohne Präfix - reine Technik, keine Auswirkung für den Autor.
- Goldverlust beim Tod 15% (Masterprompt 4.4) statt 20% (Referenz) - Konfliktregel: Spielgefühl-Spezifikation schlägt Referenz.
- Parade-Fenster 300 ms, Riposte +100%, Rolle 300 ms Unverwundbarkeit (Masterprompt Teil 4) statt 250 ms / +50% / 180 ms der Referenz - Konfliktregel.
- Erholzeit nach schwerem Hieb 0,7 s als eigener Wert in kampf.ts angenommen (Masterprompt nennt nur Ausholzeit 0,6 s) - leicht änderbar.
- Schwerer Hieb durchbricht Haltung: 0,6 s Taumeln angenommen (Wert in kampf.ts).
- Pfeile stapeln zu 20 pro Slot - analog Tränken, leicht änderbar in items.ts (ARROW_STACK).
- Bögen mischen sich mit 18% unter Waffen-Drops (Referenz kennt keine Bögen) - Wert in loot.ts.
- Zauberrollen-Dropchance 4% je Gegner ergänzt (Masterprompt 6.2 verlangt Rollen als Drops, Referenz kennt keine) - Wert in items.ts.
- Fertigkeits-Schulen: Benutzungs-Schwellen je Stufe als Kurve in balancing.ts (Masterprompt nennt keine Zahlen) - eine Zeile zum Ändern.
- Werte der 9 neuen Fähigkeiten (Kettenblitz, Frostnova usw.) in balancing.ts festgelegt - Masterprompt beschreibt nur Wirkprinzip.
- Lore-Notizen 4+5 (Folterkammer, Beinhaus-Schrein) neu verfasst - Masterprompt 7.3 verlangt sie ausdrücklich als NEU, Stil an Referenz-Notizen angelehnt.
- Dialoge für neue NPCs (Landherr, Schmied, Müller, Bauern, Händler) und Anna-Quest neu geschrieben - Masterprompt Teil 7/8 verlangt sie, Referenz enthält keine. Ton an Referenz-Dialogen ausgerichtet.
- Landherr-Name "Landherr von Falkenberg" als Platzhalter in story.json - dort in einer Zeile änderbar (Tabletop-Anbindung).
- Speicherformat v3 mit Slot-System (0=Autosave, 1-3 manuell) statt Einzelslot der Referenz - Masterprompt Phase 10 verlangt 3 Slots + Autosave.
- Einstellungen: Lautstärke in Effekte/Atmosphäre aufgeteilt (Masterprompt 5.2), Referenz hatte einen Regler.
- Eigener Mini-Animator (Texturwechsel pro Frame) statt Phaser-Anims, damit Hot-Swap-Einzelbilder und Fallback-Sheets denselben Codepfad nutzen.
- Tagesablauf-NPCs: 2-3 Positionen je Tageszeit wie Masterprompt 7.2, als Daten im Dorf-Layout.
- Lebensmittel-Buffs (Brot/Käse/Wurst usw.): Werte in shops.ts festgelegt (Masterprompt nennt nur das Prinzip Regeneration über Zeit).
- Schmiede-Upgrade-Kosten (Gold/Eisen/Kohle je Stufe) in shops.ts festgelegt - Masterprompt nennt nur +1 bis +3 Stufen gegen Gold + Material.
- Aufbau-Stufen-Kosten (Gehöft) in crafting.ts festgelegt - Masterprompt nennt Material + Gold ohne Zahlen.
- Im Dunkelwald liegt eine Holzaxt im umgestürzten Baum (Tutorial) - der Spieler braucht die Schmied-Axt damit nicht mehr; Schmied-Angebot bleibt für den Fall, dass man das Tutorial-Tool verpasst.
- Dev-Hook window.__welt (nur Dev-Build) für automatisierte Browser-Tests.
- Fähigkeitstasten: Zauberei-Fähigkeiten auf 4/5/6 (Erweiterung der Zauberleiste), Nahkampf/Bogen kontextabhängig auf R/T - Masterprompt nennt keine Belegung.
- Phase 11: BootScene wurde um zwei Aufrufe der Grafik-Schicht (PackLoader) ergänzt - die Phase-11-Regel "nur src/gfx/ und assets/" ist insofern berührt, als das Laden von Dateien zwangsläufig in der Boot-Szene hängt. Spiellogik unverändert; hiermit dokumentiert.
- Pack-Pipeline: Kacheln/Figuren aus Paketen werden beim Boot in die bestehenden Hot-Swap-Schlüssel (hs_tile_*, as_*) komponiert statt neue Codepfade einzuführen.
- Leibwache vor dem Boss: "Bruder Aldric, der Grabwächter" (Elite-Skelett-Champion) + 2 elite Grabschatten stehen zuerst im Bossraum; der Tempelritter erscheint erst, wenn der Wächter fällt. Werte/Positionen in areagen.ts (buildBoss) und WorldScene.onEnemyKilled.
- Boss-Einzelloot: "Harnisch des Kreuzritters" (+25 Leben, +3 Rüstung) und "Ring des ewigen Wächters" (+3 Lebensraub, +50 Lichtradius) - frei erfunden, da die Referenz keinen Boss-Loot kennt; Werte direkt in WorldScene.onEnemyKilled, leicht änderbar.
- Stadtportal auf Taste 8 (zusätzlich als belegbare Aktion '⌂' für M3/M4/M5), erst nach Boss-Sieg nutzbar - vorher kommt eine Fehlermeldung. Kein Item, kein Mana: Komfortfunktion, kein Balancing-Hebel.
- Tod in der Krypta löscht die Ebenen-Layouts NICHT mehr: aufgedeckte Minimap und Treppen bleiben erhalten, nur die Gegner kehren zurück (Spawns leben im Gebiet, nicht im Spielstand).
- Maustasten M1/M2 (links/rechts) sind jetzt wie M3-M5 frei belegbar; 'Angriff' und 'Block' wurden dafür zu Aktionen (Halten-Logik bleibt erhalten). Standard bleibt links=Angriff, rechts=Block.
- Verfluchte Truhen: 30% der Krypta-Truhen, violett markiert, Beute eine Ebene besser, 55% Hinterhalt (3 Schatten) - Werte in krypta.ts (CHEST_VERFLUCHT).
- Kopfgeld: Ebene würfelt sich deterministisch aus Spieltag+Seed; Auszahlung sofort beim Kill (kein Abhol-Schritt), Werte in welt.ts (KOPFGELD).
- Elite-Affixe Feurig/Teilend ergänzt (Brandfläche unter dem Spieler / zerfällt in 2 Abbilder mit 35% Leben) - Werte in enemies.ts (ELITE).
- Endlose Tiefe: crypt6+ nutzt die Themen 1-5 zyklisch, depth skaliert weiter, Elite-Chance 18% statt 10%; der Abstieg im Bossraum öffnet sich erst nach dem Sieg.
- Sammelalbum auf Taste B (fest, nicht umbelegbar - bewusst einfach gehalten), Inhalt wandert mit dem Spielstand (welt.album).
- Edelstein-Angebot bei Magdalena zum Festpreis 120 Gold (Edelsteine haben keine Preisformel).
- Grafik-Politur rein programmatisch: Umriss-Silhouetten über Offscreen-Canvas (keine neue Dependency), Tile-Details deterministisch je Variante (kein Flackern).
- Einfälle: erst nach dem Boss-Sieg, abends, frühestens jeden 2. Tag, nur wenn der Spieler im Dorf ist; Gebietswechsel bricht den Einfall ab (keine Belohnung). Trupp-Größe wächst mit den Spieltagen (Werte in welt.ts, EINFALL). Dörfler kämpfen (noch) nicht mit und nehmen keinen Schaden - bewusst klein angefangen.
- Palisade (Stadtmauer Stufe 1): 120 Gold + 30 Holz + 10 Stein, Bau über Nacht beim Schmied (wie Gehöft-Aufbau). Als solides Tile unzerstörbar für normale Monster; mit Mauer spawnen Einfälle nur an den zwei Salzstraßen-Toren. Boss-Monster, die Mauern beschädigen (alle 7 Tage), als spätere Stufe notiert.
- Anti-Grind fürs Holz: Bäume geben 2-4 Holz und respawnen nach 1 Tag (bestand schon), zusätzlich verkauft der Schmied Holz für 6 Gold - 30 Holz sind ~10 Bäume oder 180 Gold.
- Stadttore: zwei Tore (West/Ost) einzeln per E schließbar; beide zu = Einfall fällt aus (Meldung statt Welle, zählt als "übersprungen"). Belohnungs-Abwägung bleibt: sichere Stadt = kein Einfall-Gold. Spieler kann sich nicht selbst im Torbogen einsperren.
- Palisaden-Bauzeit auf 3 Nächte erhöht (welt.ts, STADTMAUer.stufen[0].naechte); alte Spielstände mit "bestellt" werden als 1 Restnacht weitergeführt.
- Tageszeit-Anzeige als Sonnen-/Mondstand in der HUD-Zeile (Morgen/Mittag/Abend/Nacht statt Uhrzeit - die Spiellogik kennt nur Phasen); in der Krypta steht die Zeit still und die Anzeige sagt das auch.
- NPC-Nachtruhe: ab 78% des Tages verschwinden die Dorfbewohner in ihre Häuser (unsichtbar, nicht ansprechbar), ab 20% des Folgetages sind sie zurück; ein Einfall ruft alle sofort auf die Straße. Begehbare Innenräume sind das NICHT - als eigene Phase notiert.
- Auferstehung nach dem Tod jetzt auf dem Friedhof neben der Kirche (erster freier Platz bei den Gräbern) mit Licht-Effekt und Erwachens-Text - "etwas Gutes wacht über Ravensmoor".
- Innenräume als eigene Areale (innen_<haus>), Daten in src/data/innenraeume.ts: Möbel-Tiles + Bewohner je Haus, ein Builder für alle. Türen per E (wie Treppen), kleine Stuben werden mittig im Bild zentriert.
- Dorfvolk nach Vorbild eines deutschen Dorfs um 1349 (Schwarzer Tod): Schulze (Gemeindevorsteher), Bäcker, Zimmermann, Schneider, Hirtenjunge, Magd, Wäscherin, Wirtin, Witwe, zwei Kinder - jede Figur mit eigenem Figuren-Namen in FIGURES, damit spätere Sprite-Pakete sie 1:1 ersetzen.
- Tagesrhythmus: Männer/Berufe tagsüber an der Arbeitsstelle (Dorf-NPCs), Frauen/Alte tagsüber in der Stube, Familie abends/nachts komplett daheim (nurAbends-Schalter im Innenraum). Beim Einfall bleiben nur Kämpfer (Schmied, Heinrich, Müller, Veit, Zimmermann, Schulze) auf der Straße, der Rest "flieht ins Gemeindehaus" (Meldung; sichtbare Flucht-Wege wären ein späterer Ausbau).
- Gemeindehaus statt "Rathaus": historisch hat ein Dorf dieser Größe kein Rathaus, sondern ein Gemeinde-/Schulzenhaus - größtes Gebäude am Markt, Zufluchtsort.
- Neue Möbel-Tiles (Bett, Tisch, Stuhl, Kamin, Teppich, Tresen, Holzboden, Haustür) als Y-sortierte Standobjekte; Kamine speisen das warme Fackellicht.
- Runde 10 Dorfwirtschaft: 9 Zünfte (Bader, Küfer, Weberin, Gerber, Hebamme, Küster, Fischer, Imker, Schäfer) je mit Haus, Innenraum, Tagesablauf, Dialog und Spielnutzen. Werte in shops.ts (SHOP_*, TAGWERKE, BADER_BEHANDLUNG, UNTERRICHT).
- Tagesablauf jetzt dreiphasig: morgens Arbeitsplatz, mittags (45-55% des Tages) soziale Runde (mittag-Position: Markt, Taverne, Nachbarn), abends heimwärts, nachts in der Stube.
- Wirtschaftskreislauf sichtbar gemacht: Schäfer verkauft Wolle (8 G), Weberin zahlt fürs Abliefern 50 G für 4 - der Held kann Zwischenhändler sein; Wölfe geben Felle für den Gerber; Küfer kauft Holz. Keine echte Waren-Simulation zwischen NPCs - der Handel der Dörfler untereinander lebt in Dialogen und Wegen (ehrlich dokumentiert).
- Tagwerke (Arbeit für den Helden) 1x pro Spieltag je Auftrag, Stand wandert in den Spielstand (welt.tagwerke). Unterricht beim Küster: Gold gegen XP (skaliert mit Stufe), ebenfalls 1x täglich.
- Neue Materialien fell/wolle in MaterialId aufgenommen (alte Spielstände erhalten sie als 0).
- Gerberei liegt flussabwärts am Südrand des Bachs - historisch korrekt, "weil es stinkt" (steht so im Dialog).
- Runde 11 Fähigkeiten: Aderlass (15 Leben -> 25 Mana, Zauberei 2), Lebenstausch (30 Mana -> 20 Leben, Zauberei 4), Feuerregen (40 Mana, 6 Einschläge auf den Mauszeiger-Zielort, Zauberei 8, Tasten 9/0 + belegbare Aktionen). Feuerregen ist absichtlich ausweichbar - die Einschläge treffen den Ort, nicht den Gegner.
- Schildträger: 25% der Skelette tragen Schilde, blocken Treffer von vorn zu 50% (dann nur 30% Schaden, kein Rückstoß) - Flankieren wird belohnt.
- Spenden statt Gold aus dem Nichts: Opferstock beim Pater (25 Gold -> Segen 240s), Dorfkasse beim Schulzen (Schwellen 100/250/500 -> Händler-Rabatt 5% je Stufe); Monster-Gold bleibt als Spielkonvention bestehen (ehrlich vermerkt).
- UI-Verschiebemodus im Entwicklungskasten: Griffe für Aktionsleiste, Dialograhmen und Meldungs-Log; Versatz wandert in die Einstellungen (ui), wird beim Fixieren gespeichert und steht im kopierbaren Bericht - so kann der Autor Layout-Wünsche exakt durchgeben.
- Sprachausgabe über die Browser-eigene speechSynthesis (de-DE), Schalter in den Einstellungen, Standard AUS - implementiert, aber mangels Lautsprecher im Container nicht angehört.
- Häuser-Verschieben im Dev-Modus NICHT umgesetzt: das Dorf-Layout ist bewusst von Hand gebaut (Koordinaten in buildVillage); ein Karten-Editor mit datengetriebenem Layout wäre eine eigene Phase - NPC-Anker hingen dann am Haus-Datensatz und wanderten automatisch mit.
- Grafik-Varianten (Runde 12): je Tile-Name werden zusätzlich <name>1.png bis <name>12.png geladen und positionsfest gemischt (Hash der Tile-Position - kein Flackern). Neue Hot-Swap-Namen: wald* (Bäume mit >=4 Baum-Nachbarn), baumstumpf* (gefällte Bäume, bleiben bis zum Nachwachsen sichtbar), haustuer*, dazu alle Möbel-/Mauer-Tiles der letzten Runden. assets/ANLEITUNG.md erklärt das Schema für den Autor; .gitkeep hält die leeren Ordner im Repo sichtbar.
- Erste echte Grafik-Assets des Autors eingebaut (38 Tiles): gras1-4, baum1-12, wald1-8, baumstumpf1-2 (Stumpf + liegender Stamm), fachwerk_fassade1-8 (mfachwerk_* und fenster-Varianten einsortiert), haustuer1-4 (aus fachwerk_tuer*). Quelldateien waren 1254x1254 RGB mit EINGEBACKENEM Karo-Hintergrund - Konvertierung: Karo-Erkennung (hell+grau) -> Alpha, premultipliziertes Mitteln auf 32x32, harte Pixelkanten. Lizenzprüfung der generierten Bilder liegt beim Autor.
- Runde 12 Audio/Film: Musik-Kanal im SoundProvider (genau ein Stück, überlebt Gebietswechsel - Loops nicht). Intro-Film im Dunkelwald (Titel-Fade + 5 Story-Zeilen + Musik, Spieler läuft frei), Einfall-Musik, Boss-Musik (Loop im Bossraum), Herzschlag-Loop unter 30% Leben, 5 Grusel-Stücke zufällig in den Katakomben (Pause 14-32s). Haken für krypta_betreten.mp3 gesetzt - Datei fehlt noch (Autor liefert nach).
- Regen: 35% Chance je Spieltag, nur draußen - Bildschirm-Streifen + leichte Verdunkelung, programmatisch (kein Asset nötig). Regen-Sound-Haken vorbereitet (assets/sounds/regen.mp3).
- Ortsnamen ("Zum Schwarzen Raben", "Lichtung") stehen nicht mehr als Text in der Welt (waren halb verdeckt), sondern erscheinen als Einblendung unter dem Gebietsnamen, wenn man näher als ~4 Tiles steht. NPC-Namen jetzt über Gebäudetiefe (2300).
- Hofpfad führte mitten durch die Taverne (fiel erst mit echten Dach-Grafiken auf) - er läuft jetzt östlich um das Gebäude zur Salzstraße.
- Waldpfad mäandert in weichen Bögen (Sinus + Zufall), atmender Grassaum, 2 Nebenlichtungen mit Stich vom Pfad, Graspolster im Dickicht; Wölfe lauern am tatsächlichen Pfadverlauf.
- Audio-Vervollständigung: Menü-Musik (Loop im Titel, endet beim Spielstart), Trauermusik beim Tod (endet beim Erwachen), Regen-Klang draußen/gedämpft drinnen (wechselt beim Betreten der Stube), krypta_betreten beim Abstieg in Ebene 1. Schwert-Sound-Schema vorverdrahtet mit Fallback: armor_cut (Tempelritter/Schildträger), schwert_slice (weiche Gegner + Todesstoß), swoosh1-4 abwechselnd beim Schwung, block bestand schon - Dateien des Autors greifen beim Ablegen automatisch.
- Runde 13: Schwert-Sounds des Autors eingebaut (armor_cut1-2, schwert_slice1-3, swoosh1-7, block1-2) - alle als abwechselnde Varianten; play('block') greift automatisch auf block1/2 zu (Held UND Gegner). Dächer/Weg/Wasser/Brunnen-Tiles konvertiert. Wasser ist jetzt ANIMIERT: die wasser1-N-Varianten laufen alle 0,5s durch (nur wenn echte Dateien vorliegen - der Fallback flackert nicht). Palisaden-Seitenansicht vorbereitet: senkrechte Mauerstücke (West/Ost) nutzen palisade_seite1-12, waagerechte palisade1-12; Fallback zeichnet beide gleich.
- Runde 14, Audio-Notfall: swoosh2 war eine 48-Sekunden-Compilation - bei jedem Hieb startete eine Dauerbeschallung (lief weiter, weil der Lautstärkeregler nur NEUE Sounds dämpft). Datei ersetzt; Regel in assets/ANLEITUNG.md: Kampf-Effekte unter 3s.
- Landherr aus dem Wald entfernt: Der Auftrag kommt jetzt per Siegelbrief des Amtmanns im Namen des Landesherrn (historisch plausibel fürs 14. Jh.: Dörfer unterstanden der Grundherrschaft, Befehle kamen über das Amt - nicht vom König persönlich).
- Maus-Belegung: Rechtsklick auf einen M-Slot öffnet ein Auswahlmenü nach oben statt blind durchzuschalten; Klicks auf die Leiste/das Menü erreichen die Welt nicht mehr (vorher wirkte der Zauber beim Belegen sofort - Designfehler, behoben).
- Tag/Nacht-Sicht: draußen immer ein Sichtkreis um den Spieler - tags weit (~640px+Lichtboni), nachts eng (~240px) und dunkel (bis 92%), der Morgen graut linear auf; Stuben bleiben hell. Fackeln glühen nachts auch im Dorf.
- Gebäude verdecken den Spieler jetzt KOMPLETT, wenn er dahinter steht (alle Wand-/Dachteile sortieren auf die Tiefe der Gebäude-Vorderkante) - vorher "stand" man optisch auf dem Dach.
- Heimkehrer erscheinen in den Stuben erst NACHTS (vorher abends doppelt: draußen UND drinnen, z.B. die Hebamme).
- Freischaltungen: Gehöft-Wiederaufbau erst nach Erreichen von Ebene 3; Stadtmauer erst nach dem ersten Einfall (der Schulze ruft danach zur Palisade auf). Kosten kräftig angehoben (Rohbau 900G, Palisade 750G+80 Holz) - der Autor hatte nach Ebene 1 bereits 1500 Gold.
- Anschlagbrett/Stadttore haben jetzt Interaktions-Vorrang vor vorbeilaufenden NPCs.
- Smalltalk-Pool (~55 Sprüche: Männer/Frauen/Kinder + Lage: Regen, Nacht, nach Boss, nach Einfall) - jeder Dorfbewohner ist ansprechbar. Neue Innenräume: Kirchenschiff (Seitenpforte), beide Bauernhäuser. Spieler-Sprites des Autors aktiv (links = gespiegeltes rechts), Kirche-Tiles drin. Häuser-Verschieben im Spiel bleibt offen (Karten-Editor = eigene Phase); Quests fürs Haus-Freischalten notiert.
- Runde 15, F10-Bug: Dem Entwicklungskasten fehlte fixUiScroll - bei gescrollter Kamera lagen alle Knopf-Hitboxen daneben ("nichts aktiv"). Eine Zeile, behoben; Lehre: JEDES neue UI-Container-Element braucht fixUiScroll.
- Menü-Musik lief ins Spiel hinein: jedes Title-create() startete eine NEUE Instanz, get().stop() stoppte nur die erste - jetzt stopByKey (alle Instanzen).
- Weg-Tiles: waagerechte Wegstücke werden um 90 Grad gedreht (die Karrenspuren der Grafik laufen senkrecht) - Kreuzungen/Knicke bleiben ungedreht.
- Gegenstandsstufe: Item.lvl = Fundtiefe, sichtbar als "Stufe X ·" in jeder Wertezeile (Inventar, Händler, Vergleich).
- Boss-Endsequenz: im Test vollständig durchspielbar (Wahl -> WEITERSPIELEN -> frei); konnte den gemeldeten Hänger nicht reproduzieren. Absicherungen ergänzt: E/Enter schließen das End-Fenster zusätzlich zum Knopf (einmal-Guard), Boss-Musik stoppt beim Ende.
- Orbs (Leben/Mana) im UI-Modus verschiebbar (ui.orbHp/orbMp) - z.B. nebeneinander legbar.
- Rückweg Stadt -> Dunkelwald am Westrand der Salzstraße; Wald von 70 auf 104 Tiles verlängert (längerer Vorspann-Marsch), 4 Nebenlichtungen, 3 Wölfe am Pfad, Intro-Film mit 7 Zeilen im Aufzeichnungs-Ton (»...«).
- Balance: Bogen-Erholung 0,5 -> 0,32s; Heiliges Licht CD 4,5 -> 3s; Heilung 7 -> 5s; Kettenblitz CD 2s/+Schaden/3 Sprünge; Frostnova CD 4s und Verlangsamung 4,5s; Bannkreis 9s; Feuerregen 11s.
- Runde 16 Kampfgefühl: Krypta-Gegner auf 72% Tempo (TUNING.kryptaGegnerTempo, F10-Regler) - schleichende Bedrohung statt Gewusel; Schwerthieb-Kegel von 1,15 auf 0,85 rad und Reichweite 58->50 (präziser); Zauberstäbe zurück in den Drops (~12%) mit doppelter Mana-Regeneration in der Hand; Rundumschlag für alle Nahkämpfer, aber mit Hellebarde (Stange) die Spezialität: Radius 105 statt 70, x1,5 Schaden.
- Blutmagie: Leben und Mana sind EIN Kreislauf - Aderlass/Lebenstausch tauschen 1:1 (20er-Pakete, kostenlos, 1,5s Takt); fehlt beim Zaubern Mana, zahlt das Leben den Rest eins zu eins (nie unter 5 Leben) - gilt für Zauber UND Fähigkeiten.
- Boss-Eskalation als echter Raumwechsel: unter 25% reißt der Ritter den Helden ins "Innere Grab" (eigenes Areal, keine Treppen bis zum Sieg, Rest-Leben wird übernommen); nach dem Sieg erscheinen Aufgang und Endlos-Abstieg dort. Gilt auch für den Schattenfürsten im NG+ (Flag wird bei WEITERSPIELEN zurückgesetzt).
- Belagerung: jeder 7. Tag (nach dem ersten Einfall) ist eine Belagerung - größerer Trupp, Anführer "Der Rammbock" (gepanzert, Schildträger), und die Palisade bekommt 2 Breschen (Nord/Süd), durch die zusätzlich Gegner kommen. Reparatur beim Schmied (60 Gold + 10 Holz je Bresche). Breschen wandern in den Spielstand.
- Einfall überlebt den Blick ins Gemeindehaus: Angreifer werden beim Betreten gespeichert und beim Heraustreten wiederhergestellt; im Gemeindehaus drängen sich währenddessen sieben Flüchtlinge (Frauen, Kinder, Alte) sichtbar ums Feuer. Dörfler kämpfen ausdrücklich NICHT (Wunsch des Autors).
- Sichtbares Tagwerk: 10 Bewohner ARBEITEN an ihren Tagespositionen (Zimmermann hackt mit Spänen+Klang, Schmied funkt, Fischer wirft aus, Bauern hacken das Feld, Hirte/Schäfer füttern, Wäscherin platscht, Bäcker raucht, Weberin webt) - Werkel-Animation + Effekt + entfernungsabhängiges Geräusch alle 2,4-4,6s. Geschlossene Warenwirtschaft mit sichtbaren Lagern/Trägern zwischen NPCs: als nächster Ausbau notiert.
- Dialog-Politur: Pergament-Paneel (abgerundet, Doppelborte, Goldlinie unterm Sprecher), Schrift 17px mit mehr Zeilenluft. Spieler-Laufanimation: Schritte wippen 1px hoch und seitlich (aus dem Standbild erzeugt, bis echte Frames kommen).
- Runde 17: eigener Regler "Lautstärke Musik" (volMusik) - Musikstücke hingen vorher an "Atmosphäre". Gebiets-Loops vorbereitet: liegen musik_dorf/musik_wald/musik_krypta.mp3 vor, laufen sie als Schleife im jeweiligen Gebiet (Autor liefert echte Loops nach).
- Bücherregale: einmal stöbern pro Regal, danach "durchsucht" mit Staub-Meldung (Flag je Regalposition).
- Schildträger ab Krypta-Ebene 2 (30% der Skelette) und ENDLICH SICHTBAR: kleines Rundschild an der dem Spieler zugewandten Seite (Overlay). Sie schlagen und blocken wie der Spieler (bestand schon - war nur unsichtbar).
- Tuning-Grenzen für den Autor erweitert: Gegner-Leben/-Schaden bis x10, Tempo bis x3.
- ui.fenster-Versatz: Inventar-/Charakter-/Handelsfenster wandern mit dem neuen FENSTER-Griff im UI-Modus.
- NPC-Kollision statt Revert: Bewohner laufen nicht mehr DURCH Gebäude (achsenweises Entlangschieben); die Gebäude-Verdeckung von Runde 14 bleibt.
- Held: Wippen-Animation entfernt (sah schlecht aus), Sprite auf 1,35x skaliert (war winzig neben den Figuren). Echte Lauf-Frames bleiben Wunschliste an den Autor.
- Hover-Namen: Mauszeiger über Gegner/NPC/Fass/Truhe/Regal/Erzader/Treppe/usw. zeigt den Namen als kleines Schildchen - die Welt fühlt sich interaktiv an.
- Krypta-Wandkanten: Wände, die an Boden grenzen, bekommen eine helle Kontur (Graphics-Pass beim Gebietsladen) - Räume und Ecken lesen sich jetzt als solche.
- Haus-Optik: Dächer wirken als Rechtecke ("Schrank") - Plan: GANZE Häuser als EIN transparentes Sprite (z.B. 128x96) vom Autor generieren lassen und über die Grundfläche legen; Vorgaben in der Antwort an den Autor.
- Runde 18, Haus-Sprites: die 12 ChatGPT-Häuser (3D-Look) liegen als Gesamtbilder über den Gebäude-Grundflächen (Wand-Kacheln unsichtbar, Kollision + Türen bleiben). Auto-Skalierung auf Grundflächenbreite x1,3; F10-Knopf "HÄUSER JUSTIEREN" macht sie per Maus verschiebbar (Versatz je Haus im Browser-Speicher). Kirche bleibt Kacheln (eigener Look bis Kirchen-Sprite kommt).
- Kirchenschiff als Vorlevel: Kirchentür -> lange Halle (Bankreihen, Läufer, Altar mit Kerzen), dahinter der Geheimgang in die Krypta; Meldung "Der Gestank der Verwesung liegt in der Luft."; Haken für musik_kirche (Chor) gesetzt. crypt1-Aufgang führt jetzt ins Schiff statt direkt ins Dorf.
- Audio: Wolfslaut (wolf.mp3, ersetzt Hund beim Wolf), Stadt-Musik = Vogelstück, spielt EINMAL und pausiert dann 2-4 Minuten (Wunsch), Endboss-Musik durch das Storytelling-Stück ersetzt. swoosh-Satz final = die 6 benannten Dateien (alice-Compilation war bereits raus).
- Schildträger blocken besser: 70% statt 50%, breiterer Deckungswinkel (1,35 rad). Gegnertyp-Feinjustierung im F10: Typ mit Pfeilen wählen, Tempo/Schaden je Typ drehen (TUNING.typ, wirkt auf NEUE Spawns, steht im Bericht).
- Gewöhnliche Gegenstände jetzt GRAU (#a8a294, hob sich vorher nicht von der Schrift ab); Todesbildschirm 55% statt 90% deckend (Welt bleibt sichtbar); Gegner-Hover zeigt Stufe; Kauf-Rückmeldung "GEKAUFT" blitzt im Handelsfenster auf; Bäume 1,85x (wirkten wie Büsche).
- Runde 19: Haus-Basisgröße auf Grundflächenbreite x1,0 reduziert (x1,3 war riesig); im F10-Justiermodus skaliert das MAUSRAD über dem Haus (0,4x-2,5x, je Haus gespeichert), Ziehen verschiebt weiter. Foto-Held entfernt - zurück zur Zeichenfigur, aber aufgewertet: heller Blaugrau-Mantel (#46588a), kräftigere Haut, Scale 1,15 - er hebt sich jetzt klar vom Boden und Dorfvolk ab.
- Runde 20, Sounds: pfeil_schuss (arrow swoosh) für Bogen UND Knochenschützen; fireball1/2 wechseln sich ab (playAbwechselnd); musik_nacht (midnight) läuft nachts in der Stadt als Schleife und weicht tagsüber wieder der Dorf-Musik; musik_krypta (ravenmoorloop_low) ersetzt die Grusel-Rotation als Krypta-Schleife. Die 39MB-Vollversion passt in git (Grenze 100MB/Datei) - der Autor kann sie selbst als assets/sounds/musik_krypta.mp3 ablegen.
- Runde 20, Menü-Musik: Browser blockieren Ton bis zur ersten Eingabe (Autoplay-Sperre) - TitleScene startet die Musik jetzt zusätzlich über Phasers UNLOCKED-Ereignis, sobald der Browser Ton erlaubt.
- Runde 20, Ankunft: die Ankunfts-Erzählung beim ersten Stadtbesuch blockiert nicht mehr (einblendende Textzeilen statt Dialogfenster); Intro-Zeilen laufen langsamer (9,5s) und folgen dem DIALOGRAHMEN-Griff; Wald auf 128 Kacheln verlängert (mäandernder Pfad, 5 Lichtungen, 3 Wolfsrudel).
- Runde 20, Kampf: Gore-Tod (Leiche färbt sich rot, wird zerdrückt, 6 Teile fliegen; Sound-Haken tod_gore, hinter Blut-Schalter); Knochenschützen schießen sichtbare Pfeile statt Bällen; Schildträger gehen alle 2,5-4,5s für ~1s in volle Frontdeckung ("GEDECKT!"); flinke Gegner (Ratte/Schatten/Wolf) weichen 16% der Nahkampfhiebe aus - Nahkampf ist damit nicht mehr reines Draufhalten.
- Runde 20, rote Augen: Pestopfer, Skelette, Schützen und Schatten haben jetzt glühende Augenpunkte (FigureSpec.augen); Skelett-Krieger tragen sichtbar Schwert.
- Runde 20, Chronik: Taste H öffnet das Ereignisfenster mit Tabs Ereignisse/Geschichte/Beute (240 Einträge Ringpuffer); Dialogseiten, Meldungen und aufgehobene Beute laufen automatisch hinein; Fenster folgt dem FENSTER-Griff.
- Runde 20, Leisten-Trennung: Hotbar in ZWEI Leisten geteilt - Tastenleiste (1-6/9/0/R/T) und Maus-Leiste (M1-M5) mit eigenem Griff "MAUS-LEISTE" im UI-Modus (settings.ui.mausleiste). Standard: rechts neben der Tastenleiste, nie aus dem Bild geschoben.
- Runde 20, Drag & Drop: Zauber/Fähigkeiten von der Tastenleiste auf einen Maus-Slot ZIEHEN belegt ihn; zwischen Maus-Slots ziehen tauscht. Das Rechtsklick-Menü bleibt als zweiter Weg, weil Trank/Blocken/Schriftrolle/Stadtportal auf keiner Tastenleiste liegen. Neue Maus-Aktionen waffe1/waffe2 (R/T-Fähigkeit je nach Waffe). Ziehen beginnt erst nach 6px Bewegung (dragDistanceThreshold), damit Klicks und Tooltips normal bleiben.
- Runde 21, Sieg-Fenster-Fehler GEFUNDEN: fixUiScroll lief, BEVOR der WEITERSPIELEN-Knopf in den Container kam - der Knopf hatte im gescrollten Bossraum nie eine korrekte Hitbox. fixUiScroll jetzt als LETZTES nach allen Knöpfen; Regel ergänzt die bekannte Phaser-Falle.
- Runde 21, Stadtmusik im Dungeon: musik_nacht fehlte in der "wechselbar"-Liste beim Gebietswechsel - wer nachts lud, nahm die Nacht-Stadtmusik mit in die Krypta. Liste ergänzt; Dorf/Stube wählen nachts direkt musik_nacht statt musik_dorf.
- Runde 21, Bosskampf NEU (Wunsch: kein Beamen): das Grab ist EIN Areal mit drei Kammern (Vorhof, Halle der Wächter, Inneres Grab), getrennt durch Gittertore (T.CAGE). Bei 66%/33% Leben (BOSS_KAMPF.rueckzugBei in krypta.ts) entweicht der Ritter nach Norden, das Tor birst, eine 5er-Welle stürmt heraus - er stellt sich erst wieder, wenn der Held die Torlinie überschreitet. Beim Neubetreten mit lebendem Boss versiegeln die Tore wieder. bossinner-Areal entfernt.
- Runde 21, NG+-Fehler nebenbei gefunden: der Schattenfürst konnte sich NIE erheben (Leibwache-Prüfung verlangte !bossDead, das bleibt nach dem ersten Sieg true). Neue gemeinsame Prüfung bossKampfSteht(); das Bossgrab regeneriert beim NG+-Start mit.
- Runde 21, Bildgröße: Regler in den Einstellungen (100-200%, wirkt sofort). Technik: FIT-Scaler statt RESIZE - das Spiel rendert intern Fenster/Zoom und wird aufs Fenster gestreckt; Maus rechnet Phaser selbst um. Hochskalieren macht das Bild prinzipbedingt etwas pixeliger; die scharfe Variante (Kacheln aus den 300px-Quellen größer rendern) ist als eigene Phase in TODO.md notiert.
- Runde 21, F10: Beute-Regler (TUNING.beuteRate 0-3, skaliert alle Drop-Chancen außer Gold), Knopf ZAUBER FREISCHALTEN (TUNING.alleZauberFrei umgeht Stufen-Sperren in castSpell/abilityReady/Leiste), Dev-Sprünge ZUM BOSS / IN DIE STADT.
- Runde 22, Musik-Schicht im Spiel: der UNLOCKED-Lauscher der Menü-Musik (Autoplay-Fix R20) blieb beim Spielstart registriert und feuerte beim ersten Klick IM SPIEL - Menü-Musik legte sich über die Spielmusik. Lauscher wird beim Verlassen des Titels abgemeldet + isActive-Wache. Browser-verifiziert (0 Menü-Instanzen im Spiel).
- Runde 22, Haus-Skalierung repariert: das Mausrad hing am Bild-Objekt und feuerte nur bei exaktem Hitbox-Treffer - jetzt lauscht die SZENE im Justiermodus und findet das Haus unter dem Zeiger selbst (hausUnterZeiger, vorderstes bei Überlappung). Verifiziert (Skala 0,85 -> 1,02, gespeichert).
- Runde 22, Reichweiten-Regler im F10: Held: Hieb-Reichweite x / Schwung-Breite x (wirken auf leichte/schwere Hiebe und Stangenstoß, Sichtbogen wächst mit), Gegner: Hieb-Reichweite x (Treffer-Distanz aller Nahkampf-Muster inkl. Boss; Auslöse-Abstand wächst mit, damit sie früher ausholen). Beobachtung des Autors stimmt: Gegner-Hiebe trugen nur ~18px über die Körperradien.
- Runde 22, STADT-BAUKASTEN (V1): F10-Knopf BAUKASTEN (nur in Ravensmoor). Tabs BODEN (Gras/Weg/Acker/Wasser/Steinboden/Brandstelle), OBJEKT (Baum/Zaun/Palisade/Brunnen/Grabstein/Fels/Fackel/Schild mit freiem Text per Eingabe), TIERE (Huhn/Schwein/Kuh/Schaf/Hund), HAUS (Justieren, BILD AUF HAUS LADEN per Datei-Dialog, Bilder verwerfen). Kacheln malen per Klicken/Ziehen, RADIERER baut zurück (Karte erhält ihr Original). Alles in localStorage (ravensmoor_stadtplan, ravensmoor_hausbilder), wird beim Dorfaufbau über das frische Dorf gelegt; STADTPLAN KOPIEREN exportiert das JSON für die feste Übernahme in den Code. Schilder zeigen ihren Text beim Daraufzeigen.
- Runde 22, Baukasten-Grenzen (ehrlich): Häuser KOMPLETT versetzen (Grundfläche+Kollision+Tür+Bewohner) kann V1 nicht - der Autor verschiebt Bilder/Optik frei und schickt mir den Stadtplan, ich versetze Grundflächen dann im Code. Bewohner-Zuordnung + Tagesablauf auf die neue Stadt folgt als eigener Schritt, sobald sein Stadtplan steht.
- Runde 23, Kirchenaltar-Falle: die Rückkehr aus der Krypta spawnte bei downPos+40px = exakt in der Altar-Zeile. Spawn jetzt 2,2 Kacheln VOR dem Altar (mit Test) + generelles Sicherheitsnetz entklemmeSpieler(): wer je in einer festen Kachel landet, wird per Breitensuche auf die nächste freie geschoben.
- Runde 23, Inventar-Fenster DIREKT greifbar: obere Griffleiste am Fenster (auch optisch angedeutet, "ziehen zum Verschieben"), Versatz speichert in ui.fenster und gilt damit zugleich für Handel/Chronik. Erste Fassung übersteuerte (lokale dragX auf Container addiert schaukelt sich auf) - per Checkliste im Browser gefunden, auf Zeiger-Schirmkoordinaten umgestellt, hin- und Rückweg verifiziert (-180/+63, zurück exakt 0/0).
- Runde 23, Bildgröße entschärft: Regler wirkt NUR noch im Hauptmenü (im Spiel ausgegraut mit Hinweis) - Live-Ändern ließ fertig aufgebaute Szenen "zerschossen" zurück. Dazu image-rendering: pixelated beim Hochskalieren (harte Pixel statt matschiger Schrift) und Messung über das Eltern-Element. Verifiziert: 120% exakt 1,200x1,200 unverzerrt, Rückweg auf 100% sauber.
- Runde 23, Arbeitskodex: Risiko-Checkliste als Abschnitt 9 in CLAUDE.md verankert (Reproduzieren vor dem Fixen, Rückweg- und Beide-Richtungen-Tests, Phaser-Fallen-Liste, keine Live-Resizes in laufende Szenen). Vom Autor eingefordert; die Liste wächst mit jedem Fehler, der eine Runde gekostet hat.
- Runde 24, unsichtbare Wände WEG: verschiebeHaus() versetzt beim Dorfaufbau die Grundflächen-Kacheln, den Tür-Eintrag und den Hausnamen kachelgenau dorthin, wo der Autor das Hausbild hingezogen hat (Justier-Anker bleibt das Original, damit dx/dy nicht doppelt zählen). Beim Beenden des Justier-Modus baut sich das Dorf sofort frisch. Test + Browser-Verifikation (alte Fläche Gras, Tür folgt, Bild deckungsgleich mit Kollision).
- Runde 24, Bild-Upload für Werkzeuge: BODEN/OBJEKT-Tab haben "EIGENES BILD fürs Werkzeug laden" - ersetzt die GANZE Varianten-Familie (hs_tile_<name>*), Browser-seitige Verarbeitung in bildVerarbeitung.ts: Karo-/Weiß-Freistellung (min>=210, Spannweite<=16 - wie die Python-Importpipeline), Halbierungs-Downsampling auf 32px, harte Alphakante. Boden wird NICHT freigestellt (sonst Löcher). Persistenz in localStorage, BootScene wendet sie vor dem Menü wieder an. Haus-Upload stellt jetzt ebenfalls frei (Beschwerde "Hintergrund nicht freigestellt").
- Runde 24, Haus-Animationen: hausN_anim1..4.png (0,4s-Takt, z. B. Mühlrad/Schmiedefeuer) und hausN_nacht.png (Fensterlicht: abends 55%, nachts 100%, tags 0 - weiches Ein-/Ausblenden) legen sich passgenau über das Hausbild (gleiche Maße, transparent bis auf den bewegten Teil). Spezifikation in ANLEITUNG.md; mit Testdateien im Browser verifiziert (danach entfernt).
- Runde 24, Pferd: neuer Tiertyp (Vierbeiner-Zeichnung, groß), 2 Stück am Bauernhof-Gatter, im Baukasten-TIERE-Tab setzbar.
- Runde 24, Stadtplan-Export erweitert: enthält jetzt auch die Haus-Justierungen und die Namen eigener Bilder - daraus lese ich ab, wohin Türen, Bewohner und Tagesabläufe sollen, wenn ich den Plan fest einbaue.
- Runde 24, ANLEITUNG.md: komplettes Figuren-Schema (16 PNGs je Figur: 4 Richtungen x 4 Frames à 32px, transparent, Füße bei Zeile 28, 140ms-Takt) und die Haus-Animations-Spezifikation für die Sprite-Produktion des Autors.
- Runde 25, Kern-Refactor zeichneKachel(): Dorfaufbau und Live-Malen nutzen jetzt EINEN Render-Pfad. Die Ursache für "Baukasten-Bäume klein und nicht freigestellt": refreshTile war ein halber Sonderweg (nur Boden-Textur tauschen) - gemalte Objekte bekamen keinen Boden darunter, keine Größe, keine Y-Sortierung. Jetzt: jedes Kachel-Bild trägt ein "kachel"-Tag, refreshTile räumt per Tag ab und zeichnet mit derselben Funktion neu; gemalte Kacheln zeichnen ihre 4 Nachbarn mit (Weg-Drehung, Wald-Verdichtung).
- Runde 25, Varianten-Wahl: jedes Kachel-Werkzeug hat einen Durchblätterer (Mischung -> 1..n, mit Mini-Vorschau); die Wahl wird je gemalter Kachel im Stadtplan gespeichert (PlanKachel.v) und schlägt den Positions-Hash.
- Runde 25, Größen-Regler je Objekttyp (OBJEKT-Tab): 0,5x-3x, wirkt SOFORT auf alle stehenden Objekte dieser Art (displaySize statt Scale - Upload-Auflösung egal), gespeichert in ravensmoor_objektskala. Baum-Standard bleibt 1,85.
- Runde 25, Upload-"Willkür" gefunden und behoben: (a) mehrere Texturen teilten sich EIN Canvas/Image als Quelle - beim Entfernen eines Schlüssels zerschoss es die anderen -> jetzt eigene Kopie je Schlüssel (auch in BootScene); (b) Upload ersetzt jetzt GEZIELT die gewählte Variante statt immer der ganzen Familie ("Mischung" ersetzt weiterhin alle); (c) Objekt-Uploads behalten 64px für schärfere Skalierung.
- Runde 25, halbes Pferd: Vierbeiner-Zeichnung zentriert sich jetzt selbst im 32er-Sprite (Kuh ragte ebenfalls schon hinaus); große Tiere (size>=1,2) haben längere und vier Beine; Pferd auf 1,35 (mehr passt samt Umriss nicht ins Raster). Pixelgenau verifiziert: Randspalten leer.
- Runde 26, Datei-Dialog-Wurzelproblem: das file-input hing nie im DOM - Chrome ignoriert den Klick loser Elemente bzw. der Garbage Collector räumt sie weg, dadurch öffnete der Dialog nur sporadisch UND gewählte Bilder gingen verloren ("Haus wird wieder altes Bild"). Jetzt: einhängen, nach Auswahl/Abbruch entfernen. Repro + Fix browser-verifiziert.
- Runde 26, ALLE Slots frei belegbar (wie WoW): settings.tasten (t1-t6,t9,t0,tr,tt) ergänzt settings.maus; EINE belegbar()-Fabrik für alle 15 Slots (Abklingzeiten für Zauber UND Fähigkeiten, Sperr-Hinweise); Rechtsklick-Liste überall, Ziehen tauscht zwei beliebige Slots; Angriff/Blocken (Halten-Logik) nur auf Maustasten. Tastendruck -> runAction(settings.tasten[slot]). End-to-End verifiziert (Taste 4 per Menü auf Heiltrank, Trank getrunken).
- Runde 26, genereller UI-Klick-Schutz: input.hitTestPointer - landet ein Klick auf IRGENDEINEM bildschirmfesten interaktiven Element (Chronik-Tabs, Album, F10-Kasten), schlägt der Held nicht zu. Deckt die ganze Fehlerklasse ab, nicht nur die Chronik.
- Runde 26, Krypta-Respawn nach Wunsch: komplett geleerte Ebenen (außer Bossgrab) bleiben leer ("Totenstill"-Meldung), erst der TOD des Helden weckt alle Ebenen neu. Nach Speichern/Laden ist die Tiefe wie bisher wieder wach (Areale liegen nicht im Spielstand - bewusste Grenze).
- Runde 26, Gegner-Spawn-Entklemmung: Spawns in festen Kacheln (Altar, Wände) weichen per Ringsuche (bis 12 Kacheln) auf freien Boden aus. Verifiziert: Wandkachel neben Raum -> daneben gelandet.
- Runde 26, Hieb-Animation folgt der Reichweite (Schwung-Radius = eingestellte Reichweite; Standard sieht exakt aus wie vorher), Musik-/Atmosphäre-Regler wirken sofort auf LAUFENDE Klänge (vorher erst beim nächsten Stück; Hörprobe am Gerät steht aus), Haus-Justiermodus zeigt über jedem Haus Name+Kennung, Mehrfachauswahl beim Werkzeug-Upload macht die Dateien zur neuen Varianten-Familie (eigenes Gras/Weg mischt wieder), Wolf war wie das Pferd seitlich abgeschnitten (Zentrier-Fix R25 deckt ihn, pixel-verifiziert 0/0).
- Runde 27, Schilde komplett: neue Gegenstandsart 'schild' (Holz- bis Turmschild, val = Rüstungsbonus), droppt (ein Drittel der Rüstungswürfe), eigener Ausrüstungsplatz im Charakterfenster, Speichern/Laden (schildIdx), eigenes Icon, Vergleichs-Tooltips. BLOCKEN neu: MIT Schild wie bisher (Normale 0%, Elite 30% Durchschlag); OHNE Schild nur Waffenparade (Normale 20%, Elite 55%); Bogen/Stab blocken GAR nicht (Hinweis-Meldung, Rolle stattdessen); Bogen/Stab anlegen legt den Schild automatisch ab. Werte in kampf.ts BLOCK.
- Runde 27, Bildgröße dritter Anlauf (Kopfschmerz-Schrift): Canvas wird NIE mehr gestreckt - volle Fensterauflösung, der Regler zoomt nur die WELT-Kamera der Spielszene; eine zweite UI-Kamera rendert Leisten/Schrift nativ scharf. Objekt-Zuordnung je Frame über cameraFilter (scrollFactor 0 = UI). Zeiger-Weltposition überall über weltPunkt() (Haupt-Kamera), Lichtkreise rechnen worldView+zoom. Regler wirkt sofort, auch im Spiel. Verifiziert: 130% Welt-Zoom, Klick trifft kachelgenau, Canvas 1280x720 nativ.
- Runde 27, Gegner-KI: (a) laufe() umgeht Hindernisse (Wandfolgen mit merkbarer Drehrichtung) statt dagegen zu rennen; (b) Skelette/Pestopfer sammeln sich kurz in Sichtweite und stürmen gemeinsam, sobald 2+ Verbündete nahe sind; (c) Rückzug nach dem Schlag geht SCHRÄG und wer nachsetzt, kassiert einen schnellen Gegenhieb (0,18s) - auch Schildträger kontern beim Ablaufen ihrer Deckung; (d) F10-Regler Gegner-Schlagtempo (Ausholzeit + Pausen).
- Runde 27, Bogen-Mittelweg: Spannen 1,2s -> 0,95s, Pfeiltempo 420 -> 440, Spitze 1,8x -> 1,7x.
- Runde 27, Arbeitskodex: Vollständigkeits-Regel ("Auto ohne Räder") als Abschnitt 10 - jede Mechanik braucht ihre komplette Kette (Quelle, Anzeige, Speicherung), ohne dass der Autor sie einzeln bestellt.
- Runde 28, Stadtportal als Portal-PAAR: Öffnen (Taste 8/Slot) merkt die Stelle im Dungeon, stellt dort und am Marktplatz einen drehenden Wirbel auf und trägt dich in die Stadt. E am Stadt-Wirbel: zurück an EXAKT die gemerkte Stelle, Portal schließt; E am Dungeon-Wirbel: erneut hinauf, Portal bleibt. Browser-verifiziert (Rundlauf punktgenau).
- Runde 28, Einfall-Rhythmus: der ERSTE Einfall kommt sofort beim nächsten Stadtbesuch nach dem Boss-Sieg (vorher nur abends - wer tagsüber heimkam, sah nie etwas, Fehlerbericht). Belagerung jetzt jeder 3. Einfall (einfallZaehler, gespeichert) statt Kalendertag %7, der für reale Spielstände nie eintrat.
- Runde 28, Endlose Tiefe gedämpft: ab Ebene 7 wächst die Gegnerstärke nur noch halb so schnell (kampfTiefe() in enemies.ts) - ab Stufe ~16 war es laut Autor kaum spielbar. XP wachsen weiter voll.
- Runde 28, Rundumschlag gerettet: cd 5 -> 2,5, Schaden 1,2x -> 1,5x (Stange 1,8x) - war gegen die Zauber chancenlos. Edelsteine sortieren im Inventar nach Kraft (power statt val=0). Handel: Reiter "Schilde" + Knopf "ALLES VERKAUFEN (n Stück, X G)" für den aktuellen Reiter (Angelegtes bleibt geschützt).
- Runde 29, verschwundene Lebenskugel: Orb-Versätze werden jetzt eingefangen (nie weiter als an den Bildrand) + Notausgang "ALLE POSITIONEN ZURÜCKSETZEN" im UI-Modus.
- Runde 29, Boss sofort wieder da: das Bossgrab folgt jetzt der Krypta-Regel - nach dem Sieg bleibt es LEER (geleert-Markierung statt Cache-Löschung in endGame), erst der eigene Tod weckt es als NG+-Grab (Tore versiegeln sich dann wieder). Nach Speichern/Laden ist es wach (bekannte Grenze, wie die Ebenen).
- Runde 29, Fackel-Fernsicht: in dunklen Gebieten leuchten Fackeln nur noch nahe am eigenen Sichtkreis (Distanz < 1,35x Sichtradius) - vorher deckten ferne Fackelreihen halbe Karten samt Gegnern auf.
- Runde 29, Chronik = Chat-Fenster (Wunsch "wie bei WoW"): links unten verankert, halbtransparent, neueste Einträge unten, live nachgeschoben; Kopf zieht, Ecke unten rechts SKALIERT (260x160 bis 720x540), beides in chronikBox gespeichert.
- Runde 29, Inventar: Reiter ALLE/WAFFEN/RÜSTUNG/SCHILDE/RINGE/STEINE/ROLLEN/SONST, Fenster auf 880 verbreitert, Bonus-Werte (+X ...) überall GRÜN (Zeile und Tooltip; itemStatLine kann ohne Boni liefern).
- Runde 29, Balancing: Splitter-Drop 0,05 -> 0,02; Streitkolben-Überkopfschlag kürzer (48 -> 34 Versatz) und an den Reichweiten-Regler gekoppelt; NEU: F10-Regler "Gegner: Cleverness x" (skaliert Rückzugs-Konter, Deckungs-Gegenstoß, Sammeln; 0 = stumpf wie früher) - der in Runde 27 nur angekündigt, nie gebaut war (mein Fehler in der Antwort). F10-Kasten kompakter + schrumpft bei kleinen Fenstern statt abgeschnitten zu werden.
- Runde 30, ZWEI Absturz-Ursachen behoben: (a) Baukasten-Malen über/neben Wasser - die Wasser-Animation hielt zerstörte Kachel-Bilder fest und rief setTexture auf ihnen (Absturz beim Zeichnen); Liste filtert jetzt inaktive aus. (b) Haus-Bild erneut hochladen - die alte Upload-Textur wurde entfernt, während das Haus sie noch trug; jetzt wird erst umgehängt, dann entfernt (gleiche Absicherung beim Werkzeug-Upload). Datei-Dialog nutzt zusätzlich showPicker() statt click() (zuverlässiger aus Canvas-Klickketten); Headless-Tests des Dialogs bleiben werkzeugbedingt wacklig - am echten Browser gegentesten.
- Runde 30, "Ebene wieder voll": nie ausgelöste HINTERHALT-Gegner (versteckt, z. B. Beinhaus/Fässer) zählten als "lebend" - die Ebene galt nie als geräumt. Versteckte zählen nicht mehr; verifiziert.
- Runde 30, Beute-Regler deckt jetzt ALLES: auch Fass-/Kisten-Ausrüstung und die (vorher garantierten) Miniboss-Drops hören auf TUNING.beuteRate.
- Runde 30, farbige Aktions-Icons (Vorbild-Screenshot des Autors): jede Aktion hat eine Kennfarbe (Feuerball orange, Frost blau, Heilung grün, Tränke rot/blau ...) - in der Leiste und im Belegungs-Menü.
- Runde 30, F10: TAG/ABEND/NACHT-Knöpfe (Tageszeit direkt setzen), NEBEL-Probe (4 hochaufgelöste, driftende Schwaden aus weichen Verläufen - nur Dev, zur Beurteilung), Kasten per Kopfzeile verschiebbar und mit A+/A- skalierbar (gemerkt). Kodex-Regel 11: ALLE Fenster müssen verschiebbar sein.
- Runde 31, Stimmungs-Paket (Vorbild-Screenshot des Autors): (a) farbige Magie-Lichter in dunklen Gebieten - Kerzenschreine bläulich, Altäre violett, Blutbrunnen rot, pulsierend, nur nahe dem Sichtkreis (neutrale farbblob-Textur + Tint); (b) Feuerball glüht mehrschichtig mit hellem Kern und Flackern; (c) Stimmungs-Tönung: goldener Abend und kühles Morgenblau im Freien, violetter Hauch in der Krypta (additives Vollbild-Rect unter dem HUD) + dezente Vignette; (d) Wasser-Tiefenkante: dunkler Saum an der Becken-Oberkante, helle Lippe unten - das Vorbild mit weichen Übergangs-Tiles (Auto-Tiling) bleibt als eigene Phase in TODO.
- Runde 31, Sounds: wucht_schlag.mp3 (gelieferter Aufprall) für Hammer/Streitkolben-Überkopfschlag; neue Haken schritt_gras/schritt_stein (Schritt-Logik eingebaut, spielt nur mit Datei, 0,34s-Takt, Untergrund-abhängig); Gold-Klimpern nutzt den bestehenden muenzen-Haken (Datei des Autors ersetzt den Synth automatisch).
- Runde 31, Tab-Fenster: CHARAKTER & INVENTAR / SAMMELALBUM / STATISTIK als Haupt-Reiter in EINEM Fenster (B öffnet direkt das Album); Statistik zeigt Stufe/Tag/Gold, Erschlagene gesamt + Top 3, Vorsteher, epische Funde, Notizen, eigene Tode, Fertigkeiten. Sub-Container brauchte eigenes fixUiScroll (Checklisten-Fund).
- Runde 32, Todes-Sounds je Gegnertyp (gelieferte Monster_death-Dateien): tod_pest (Pest und höher entwickelte Pest-Varianten), tod_skelett bzw. tod_skelett_schild (Skelett mit/ohne Schild, auch Schütze), tod_universal rotierend für alles übrige inkl. Boss und den NEUEN "Lebenden Toten" - jeweils 1-3 zum Abwechseln, Fallback auf tod_universal, dann auf den alten Synth-Tod. Zuordnung wie vom Autor beschrieben.
- Runde 32, Begegnungs-Sounds (monster1-Dateien): begegnung_<typ> wird beim ERSTEN Sichtkontakt eines Gegners gerufen, aber bewusst gedrosselt ("sonst wird man verrückt"): globale Sperre 9s UND nur 35% Chance - so spielt es nur hin und wieder. Elite/Champions nutzen begegnung_miniboss. Werte leicht in CombatScene.begegnungsRuf änderbar.
- Runde 32, NEUER Gegnertyp "Lebender Toter": sieht aus wie ein Bewohner (blasse Haut, braune Tunika/Haar) nur mit ROTEN Augen (#e02828); Werte in enemies.ts (hp 26 +9/Ebene, dmg 7 +3, mittleres Tempo, aggro 240). Spawnt in der Krypta-Mischung (ab Ebene 1, ab 3 Gegnern doppelt) und bei den Stadt-Einfällen - thematisch passend, da er wie ein verdorbener Dorfbewohner wirkt. Angriffsmuster: Hieb (0.42) und Doppelhieb (0.55).
- Runde 32, beschädigte Liefer-Dateien: pest_death4.mp3 und living_dead.mp3 kamen aus dem RAR mit 0 Bytes an ("Attempted to read more data than was available") - konnten nicht eingebaut werden, beim Autor nachgefordert. Die übrigen 7 Dateien sind eingebaut und browser-verifiziert geladen.
- Runde 33, Grafik-Weg HYBRID gewaehlt (Autor-Entscheidung): KI erzeugt die Optik (vom Autor, da ich keinen Zugriff auf Dienste wie spritecook.ai habe), ich baue Animation/Ausruestung/Kampf-Anbindung; selbst gezeichnete Figur bleibt Rueckfall. Stil: duester wie The Slormancer (Form+Licht+Palette, NICHT kopieren); helles Sea-of-Stars-Vorbild ausdruecklich nicht. Held auf 64 px, Gegner/Dorf vorerst 32 px. Alles in GRAFIK-RICHTUNG.md festgehalten ("merk dir das").
- Runde 33, Ausruestung sichtbar am Helden: Heldenkoerper richtet sich nach Ruestungswert (stoff/leder/kette/platte, Schwellen in helden.ts) und zeigt die getragene Waffe in der Hand (Schwert/Axt/Hellebarde/Streitkolben/Bogen/Zauberstab). Zauberstab (stab) als Figur-Waffe + drawHeldWeapon neu. Figurname spieler_<stufe>_<waffe>; 24 Fallback-Varianten lazy in FIGURES registriert (nichts iteriert ueber FIGURES, kein eager-Laden). Browser-verifiziert: ohne Ruestung stoff, mit Wert 25 platte.
- Runde 33, Hot-Swap-Pipeline pro Ruestungsstufe praktikabel gemacht: figureFrame faellt von spieler_<stufe>_<waffe> auf das stufen-eigene Paket spieler_<stufe> zurueck - so genuegt EIN KI-Paket je Stufe statt 24. SPRITE_NAMES um die vier Stufen ergaenzt (Lader probt sprites/spieler_<stufe>_<richtung>_<frame>.png). Browser-verifiziert: eingeschleustes Test-Bild hs_spieler_platte_unten_1 wird vom geruesteten Helden sofort genutzt (Pipeline real, nicht nur versprochen).
- Runde 34, Lautstaerke-Regler-Bug: die Audio-Regler reagierten nur auf einen Klick auf die 6px hohe Leiste (kein Ziehen) - praktisch nicht zu treffen ("Musik liess sich nicht runterdrehen"). Jetzt ziehbarer Knopf, 28px hohe Greifflaeche, Ziehen ueber die ganze Szene. Live-Anpassung laufender Musik (snd_musik_* via passeLaufendeAn) wie zuvor. Alle Musik laeuft ueber snd_musik_*, ist also jederzeit regelbar. Browser-verifiziert (Ziehen -> Musik faellt auf 0).
- Runde 34, Todes-Gore ueberarbeitet (Autorwunsch): ALLE Todes-Partikel fallen blutrot auseinander (vorher Gegnerfarbe), Skelette/Schuetzen knochenweiss; langsamer und laenger (~1,8s, passend zu den laengeren Todeslauten), Leiche zerfaellt ueber 900ms statt 380ms. Neu in effects.ts: goreBurst (mit Schwerkraft, fallen), mist (Blutnebel/Knochenstaub-Schleier), flash (Lichtblitz) -> deathGore-Sequenz. Treffer-Spritzer bei Skeletten ebenfalls knochenweiss. Abschaltbar ueber "Blut & Ueberreste".
- Runde 34, Reit-Eroeffnung: der Held reitet zu Spielbeginn PC-gesteuert nach rechts durch den Dunkelwald (epische Intro-Musik + Prolog laeuft weiter), waehrend man den Vorspann liest. Pferd (pferd-Figur) unter dem erhoehten Helden, leichtes Wippen; keine Eingabe/Kein Kampf waehrend des Ritts. Endet automatisch am Waldrand (checkTriggers -> Dorf, endeReitIntro). Ueberspringbar per Klick (Hinweis nach 2,5s). reitIntro/reitPferd in create() zurueckgesetzt (Instanz-Reuse). Browser-verifiziert: reitet, Pferd sichtbar, endet sauber im Dorf.
- Runde 35, gezeichneter Ritter-Held (Autor-Vorlage aus Claude Chat): Quelle ist die vom Autor gelieferte RitterHeld.ts (flacher Vektor-Stil, Topfhelm mit Sehschlitz, grosses Heater-Schild, roter Umhang, Plattenruestung mit rotem Kreuz, Langschwert nach unten). 1:1 als src/gfx/RitterHeld.ts uebernommen, helmTop = 11 (vom Autor gewaehlt - Helm oben kuerzer). createRitterTexture(scene) erzeugt einmalig die Textur 'held_ritter' (288x392, NEAREST). Eingebaut ueber zeichneHeld() in CombatScene.renderEntities: bevorzugt echte Hot-Swap-KI-Sprites, sonst held_ritter (statt Pixel-Fallback), sonst Pixel-Fallback. Frontansicht, links/rechts gespiegelt. Skala RITTER_TEXTUR_SKALA=0.15 in helden.ts (in einer Zeile aenderbar). Offen/Nicht fertig: Blickrichtungen oben/unten und Gehanimation - die Textur ist eine einzelne Frontansicht (Hybrid-Plan: Optik zuerst, Animation als naechster Schritt).
- Runde 35, Kamin und Licht in den Stuben (Autorwunsch "häuser und requisiten mit kamin und licht"): Innenräume waren flach beleuchtet (renderLight sprang für innen früh raus). Jetzt warmer, sanft abgedunkelter Innenraum (lightRT.fill 0x0a0703 @0.5), in dem Kamin/Kerze/Wandfackel flackerndes Licht werfen; der Held trägt ein kleines Grundlicht (Radius 150). Neue AreaData.herde sammelt die Innen-Lichtquellen (art kamin/kerze/wandfackel) - buildInterior baut sie aus den Möbeln. Lebendige Flammen über jeder Quelle in renderWorldOverlay. Annahme (Detail stammt aus dem Gespräch vor der Kontext-Zusammenfassung): "Licht" = der Kamin beleuchtet die Stube wirklich; "Requisiten" = neue Deko. Werte (Radien/Alpha/Dunkelheit) leicht in WorldScene.renderLight änderbar.
- Runde 35, neue Innen-Requisiten: Kerze (Kerzenständer, Licht), Wandfackel (Licht), Brennholz (Stapel), Kessel (Topf am Dreifuß) als Tiles (T.KERZE/WANDFACKEL/BRENNHOLZ/KESSEL) + drawObjectArt. Brennholz wird in buildInterior automatisch neben JEDEN Kamin gestapelt (erstes freies Nachbarfeld), Wandfackeln flankieren oben (x=2 und w-3, wo frei) - so bekommt jedes Haus Wärme/Licht ohne Handarbeit. Zusätzlich hand-platziert: Kerze in Taverne, zwei Kerzen am Kirchenaltar, Kessel in Magdalenas Hütte. Kerze/Wandfackel nicht-solid, Brennholz/Kessel solid. Browser-verifiziert (Taverne: Kamin + Kerze leuchten warm; Dorf-Außenlicht unverändert).
- Runde 35, BEFUND Cleverness-Regler (Frage des Autors "bringt nichts?"): Der F10-Regler gegnerCleverness wirkt real an 3 Stellen in Enemy.ts, ABER zwei davon sind reine AN/AUS-Schwellen (>= 0.5: Schild-Gegenstoss, Sammeln auf Verbündete). Nur der Rückzugs-Konter skaliert stetig (Wahrscheinlichkeit 0.6*Wert). Folge: zwischen 0.5 und 2.0 ändert sich fast nichts ausser der Konter-Häufigkeit -> fühlt sich "nach nichts" an. Bei 0 sind alle drei aus (stumpf). Der Eindruck des Autors ist also berechtigt. Offen: stetige Skalierung statt Schwellen (in OFFENE-FRAGEN).
- Runde 35, Entwicklungskasten erweitert (Autorwunsch "pro Gegner Schlagtempo und Hiebreichweite"): Das Per-Typ-Tuning (TUNING.typ, im F10 mit Pfeilen je Gegnertyp) hatte nur Tempo+Schaden. Jetzt zusätzlich Typ-Schlagtempo (Ausholen/Pausen) und Typ-Reichweite (Hiebweite) je Typ. Enemy bekommt schlagtempoF/reichweiteF beim Spawn aus TUNING.typ; in Enemy.ts werden die globalen Faktoren gegnerSchlagtempo/gegnerReichweite mit dem Per-Typ-Faktor multipliziert. Wirkt wie bisher auf NEUE Spawns. F10-Panelhöhe um 52px erhöht (2 neue Zeilen, schrumpft weiter bei kleinen Fenstern). Browser-verifiziert: alle vier Per-Typ-Zeilen sichtbar, nicht abgeschnitten.
- Runde 35, Gore in Top-Perspektive (Autorhinweis: Teile fielen nach UNTEN, falsch fürs Vogelperspektiv-Spiel): goreBurst stiebt jetzt radial vom Treffer und gleitet am Boden aus (ground-Partikel mit starker Reibung statt Schwerkraft); auch die Leichen-Teile (Rechtecke) fliegen radial statt nach unten (kein +26-Versatz, Ease Quad.Out = ausgleiten). Waffen-Wucht steuert die Wurfweite: GORE_WUCHT in kampf.ts (wucht/Hammer 1.7, Axt 1.3, Stange 1.05, Schwert 1.0, Bogen/Stab 0.7). killEnemy liest die Wucht der tötenden Waffe. Leicht änderbar.
- Runde 35, Hausfenster nach Tageszeit (Autorwunsch): tagsüber AUS, abends leuchten alle Fenster warm, nachts erlischt Haus für Haus zu einer GESTAFFELTEN Schlafenszeit (deterministisch aus der Hausposition, 0.78..0.96), tief in der Nacht alle dunkel. fensterAlpha()/fensterSchlaf() in WorldScene. Prozedural über das Lichtsystem (eraseLight + warmer placeWarm 0xffce7a je Haus) - funktioniert OHNE Autor-Nachtbilder; das alte hs_hausN_nacht-Overlay nutzt jetzt dieselbe Kurve (vorher falschherum: am hellsten tief nachts). Browser-verifiziert: Abend alle an, Nacht gestaffelt aus. Dev-Hilfe: ?zeit=0.85 startet zu einer Tageszeit (nur Dev-Build).
- Runde 35, Physik-Test im Debug (Autorwunsch "nicht live, erstmal im Debug mit Umschalter"): F10-Schalter "PHYSIK-TEST" (TUNING.physikTest, Standard aus). AN: der Spieler schiebt Fässer/Kisten/Krüge weg, sie gleiten aus, prallen an Wänden ab und stoßen sich gegenseitig (updateSchiebephysik in WorldScene, Werte in kampf.ts PHYSIK). Verschobenes Objekt führt Trefferziel UND Speicher-Eintrag mit (dort treffen/zerstören); Zerstör-Filter auf Objekt-Identität statt x/y umgestellt (robust). AUS = striktes No-Op (early return) = exakt altes Verhalten. Dev-Start ?physik=1 schaltet ihn direkt an. Browser: läuft fehlerfrei mit Physik an; das Schiebe-GEFÜHL muss der Autor im Debug selbst antesten (Headless-Screenshot zeigt Bewegung schlecht).
- Runde 35, Dev-Parameter ergänzt: ?zeit=0..1 (Start-Tageszeit), ?physik=1 (Physik-Test an) - nur Dev-Build, analog ?start=/?relikt=.
- Runde 35, Kampf-KI Aggression (Autorproblem "Gegner weichen zurück, lassen sich abschnetzeln"): Gegner gingen nach JEDEM eigenen Schlag (skelett/wolf/schatten) UND bei fast jedem Treffer (onHurt 0,7 für flinke) passiv zurück. Jetzt datengetrieben je Typ über AGGRO.rueckzugChance (pest 0 = drängt stur, lebender_toter 0.08, skelett 0.3, schatten 0.45, wolf 0.4). Rückzug kürzer (ENEMY_AI.rueckzugDauer 0.26), Konter aus dem Rückzug härter (konterChance 0.85 statt 0.6). onHurt-Zucken nur noch rueckzugChance*0.7. Sammeln-vor-dem-Sturm kürzer und früher (sammelnMin/Spanne/Ab), nur noch Skelett. Ergebnis: meist Konfrontation und sofortiges Nachsetzen, nur manchmal kurzes Tänzeln - je Typ unterschiedlich. Tunbar in enemies.ts; greift weiter mit dem F10-Cleverness-/Per-Typ-Regler ineinander.
- Runde 35, Gruppendynamik Flankieren (Autorwunsch "die Schnellen von hinten, Tanks vorne"): Jeder Gegner bekommt eine Rolle - 'flanke' (schatten/wolf/ratte, ~halbe Skelette) umläuft den Spieler und greift von HINTEN an (zielt auf den Punkt hinter dem Spieler über die neue host.playerDir()), 'front' (pest/lebender_toter, Schildträger) bindet vorn. So kämpft man vorne gegen die Tanks, während die Flinken hinten herum kommen. Schildträger werden beim Spawn auf 'front' gesetzt. Browser: läuft fehlerfrei in der Krypta; das Gefühl muss der Autor anspielen.
- Runde 35, "Gefallene" - bewaffnete Gegner (Autorwunsch c: beides in Variationen, plus Bögen/Stäbe/Hämmer/Äxte; hinter Schalter wegen Balance): F10-Schalter "GEFALLENE (bewaffnet)" (TUNING.gefallene, Standard AUS) + Dev-Start ?gefallene=1. AN: Skelett/Pest/Lebender Toter bekommen beim Spawn zufällig (gewichtet) ein Loadout aus GEFALLENE_WAFFEN (enemies.ts): Schwert, Schwert+Schild, Axt, Hammer (wucht), Bogen, Zauberstab. Sichtbar an der Figur über lazily registrierte Varianten <typ>_<waffe> in fallbackArt (klont Basis-Spec, tauscht weapon - analog zum Helden); Schild als typ-unabhängiges Overlay; Stab schießt violettes Arkangeschoss (fireball1), Bogen Pfeile. Werte je Waffe (dmg/reich/tempoMult) liegen in enemies.ts und stapeln auf die bestehenden Enemy-Faktoren (reichweiteF/schlagtempoF), also auch über den F10-Per-Typ-Regler nachjustierbar. Bogen/Stab -> ranged + rolle front; Schild -> rolle front. Der alte Skelett-Schild-Block ist im Gefallenen-Modus deaktiviert (das Loadout übernimmt). Name zeigt das Loadout ("... mit Schwert & Schild"). Browser-verifiziert in der Krypta: bewaffnete Gegner spawnen sichtbar, Kampf fehlerfrei. Balance bewusst noch nicht justiert - dafür ist der Schalter.
- Runde 35, Dev-Parameter ?gefallene=1 ergänzt (nur Dev-Build).
- Runde 35, Gegner-Aggression "zack-zack" (Autorproblem "wirken harmlos, laufen lange an"): ENEMY_AI.meleeAtkCd 1.05 -> 0.7 und meleeWindup 0.36 -> 0.28 - kürzeres Ausholen, kürzere Pausen, deutlich mehr Druck. Zusammen mit dem Rückzug-Umbau (Runde 35 davor) setzen sie jetzt nach statt zu warten. Über den F10-Schlagtempo-Regler (global UND je Typ) wieder entschärfbar.
- Runde 35, Leben je Gegnertyp im F10 (Autorwunsch "kann ich nicht einstellen"): TUNING.typ um 'leben' erweitert (neuerTypTuning), neue Per-Typ-Zeile "Typ-Leben x" im Entwicklungskasten, beim Spawn maxhp *= leben. Panelhöhe angepasst (5 Per-Typ-Zeilen), browser-verifiziert nicht abgeschnitten.
- Runde 35, Todes-Sequenz (Autorwunsch "Welt läuft weiter, Monster scharen sich um die Leiche, Fenster nur drüber"): Beim Spielertod friert die Welt NICHT mehr ein. beginDeathScene goret den Helden wie einen Gegner (rote Gore-Sequenz + Leichnam-Tween, kippt/verblasst). updateTodesszene simuliert danach weiter (Gegner, Projektile, Render). Gegner-KI: bei host.playerTot() scharen sie sich über gatherCorpse im Kreis um die Leiche und "fressen" (kleine Blutspritzer) statt anzugreifen; enemyMeleeHit an der Leiche geblockt. Das Gestorben-Fenster kommt nach 1,3 s, blendet sanft ein und ist dünner (Alpha 0,4) - man sieht das Geschehen dahinter. Wiederbelebung setzt den Held-Sprite sauber zurück (belebePlayerSprite). renderEntities lässt beim Tod den Spieler-Block aus (Leichen-Pose bleibt). Browser-verifiziert: "DU BIST GEFALLEN" halbtransparent, Gegner geschart, Gore sichtbar, fehlerfrei. Dev-Taste K tötet sofort (nur Dev-Build, auch bei offenem Fenster) zum Testen.
- Runde 36, Chronik standardmäßig offen (Autorwunsch "H-Menü immer aktiv"): neue Einstellung chronikAuto (Standard true), beim Spielstart öffnet WorldScene das Chronik-Fenster; per H weiter schließ-/öffnbar, Position/Größe bleiben gespeichert. Browser-verifiziert.
- Runde 36, Actionbar nach Kategorie gefärbt (Autorwunsch "Zauber/Kampf/Bogen besser unterscheiden"): jeder Slot bekommt Rahmen + dezenten Hintergrund-Schimmer je Kategorie - Kampf rot (0xc85a3a), Zauber blau (0x6a7ae0), Bogen grün (0x5ac06a), Item gold (0xb89a4a). Kategorie aus der belegten Aktion (SLOT_KAT in hud.ts); Waffen-Slots wechseln mit der Waffe (Bogen-Fähigkeiten = grün). Browser-verifiziert.
- Runde 36, Verbrauchsgegenstände nur per RECHTSKLICK (Autorwunsch "Rollen lösen sofort beim Klick aus"): Tränke/Manatränke/Rollen/Proviant werden im Inventar nur noch per Rechtsklick benutzt; Linksklick wählt nur an (Tooltip zeigt "Rechtsklick: ..."). Manatrank im Inventar war bisher gar nicht benutzbar - jetzt ergänzt (p.mpot++). Ausrüstung weiter per Linksklick. (Alternativ: Rollen in die Actionbar legen und per Maus/Taste auslösen - der 'rolle'-Slot nutzt die erste Rolle im Beutel.)
- Runde 36, vier besondere ROLLEN-Zauber (Autorwunsch "Feuerwand, Feuerwalze, Eisregen, Gewitter"): in useAbility ergänzt, Werte in balancing.ts (ABILITY_FX). Gewitter = einschlagende Blitze (Blitz-FX + Schaden) auf den Zielort; Eisregen = Eis-Einschläge mit Schaden + Verlangsamung; Feuerwand = Feuerlinie quer zur Blickrichtung, tickt 4 s; Feuerwalze = nach vorn rollende Feuerwoge mit Rückstoß. Zielpunkt-Helfer zielPunkt() extrahiert. Erhältlich als Beute (rarity 2, seltener) und beim Händler (140-170 Gold). Hinweis: aus dem Inventar gewirkt zielen die ortsgebundenen auf die Mausposition (über dem Inventar ~ beim Helden); für gezieltes Wirken die Rolle in die Actionbar legen und mit der Maus zielen. Browser-verifiziert (alle drei Effekte sichtbar, fehlerfrei).
- Runde 36, Inventar-Überschneidung behoben (Autorwunsch "Schriften überschneiden sich, aufräumen"): Ursache war die jetzt standardmäßig offene Chronik, die unten links über die Charakterwerte des Inventars ragte. Lösung: die Chronik blendet sich aus, solange ein Fenster offen ist (uiBlocked) und kommt danach von selbst zurück. Inventar-Liste rechts war sauber. Browser-verifiziert.
- Runde 36, WICHTIGER Fix: die neuen Rollen-Zauber (gewitter/eisregen/feuerwand/feuerwalze/windstoss) feuerten zunächst GAR NICHT - abilityReady() lehnt jede Id ab, die nicht in den lernbaren ABILITIES steht. Jetzt lässt abilityReady die Liste ROLLEN_ZAUBER (balancing.ts) durch (immer bereit, nur eigene Abklingzeit). Numerisch verifiziert.
- Runde 36, Physik auf Gegner ausgeweitet (Autorbrainstorm "Gegner wegfegen mit Wind, Physik nutzen - erst mal testen"): HINTER dem Physik-Test-Schalter wird der Rückstoß geschwindigkeitsbasiert - getroffene Gegner bekommen einen Impuls (kvx/kvy), gleiten aus und prallen an Wänden (Enemy.update integriert mit PHYSIK.gegnerReibung/-Stoss/-KvMax). Neuer Rollen-Zauber WINDSTOSS fegt radial alle Gegner ringsum weg (mit Physik gleiten/prallen sie, ohne nur ein Schubs). Numerisch verifiziert: Gegner 50px -> 184/125px weggeschleudert (einer an der Wand gestoppt). Schalter aus = exakt altes Rückstoß-Verhalten. Schildträger blocken den Windstoß frontal (wie andere Frontaltreffer) - bewusst so gelassen, ggf. später Wind durchlassen. Wind-Rolle als Beute + Händler (120 Gold).
- Runde 36, Erkenntnis Welt-Pause: bei offenem Dialog/Fenster (uiBlocked) friert die Welt ein - Gegner/Physik laufen dann nicht. Das ist gewolltes Verhalten (Zauber wirkt man im Spiel, nicht im Menü); beim Testen den Dialog erst schliessen.
- Runde 37, Statuszeile aufgeräumt (Autorwunsch "zuviel / an der Leiste angehängt"): die untere Zeile zeigt nur noch STUFE/GOLD/Tag/Zeit, mit Abstand zur Leiste (h-33 statt h-42). Der redundante Slot-Hilfetext ("Rechtsklick = belegen, Ziehen = tauschen") und die B-Album/H-Chronik-Hinweise sind raus - der Slot-Hilfetext steht ohnehin in den Slot-Tooltips. Browser-verifiziert.
- Runde 37, Level-Up-Fanfare (Autorwunsch "Aufstieg cool sichtbar"): statt nur Log+Partikel jetzt zeigeLevelUp() - Gold-Puls + aufsteigende Funken am Helden, ein bildschirmfestes Banner "STUFE X / AUFGESTIEGEN" (pop per Back.Out, hält, blendet hoch aus) und ein kurzer goldener Bildschirm-Schimmer. Browser-verifiziert.
- Runde 37, Held neu als ANIMIERTE prozedurale Figur (Autorwunsch "Fallback neu, kein blaues Hemd, kein Schwert, Stil wie die anderen, Bewegungsanimationen"): zeichneHeld nutzt jetzt die drawHumanoid-Figur (4 Richtungen + Gehschritt) statt der statischen Ritter-Textur. Held je Rüstungsstufe waffenlos + heroisch: stoff Oxblut-Wams mit Kapuze (KEIN Blau mehr), leder Lederkapuze, kette Kettenkoif, platte Plattenhelm; spielerFigur gibt 'spieler_<stufe>' (ohne Waffe) zurück, heldFigur ohne Waffenargument. Die Waffe wird nicht mehr in der Hand gezeigt (geschlagen wird per Schwung-FX). createRitterTexture/held_ritter aus dem Render-Weg entfernt; RitterHeld.ts bleibt schlummernd erhalten (Löschen wäre destruktiv) für späteren Re-Import. SPIELER_WAFFEN-Variantenschleife entfernt. Browser-verifiziert: Held läuft animiert nach unten/rechts, dunkelrot+gekapuzt, ohne Waffe.
- Runde 37, Held als detaillierte 64px-Figur (Autorkritik "Platte unten / Kopf ein Rechteck / zeichne 64x64 mit mehr Details"): neue Datei heldArt.ts mit drawHeld(tier,dir,frame) - eigene 64x64-Zeichnung (vs. 32px Dorf/Gegner): RUNDER Kapuzenkopf (Ellipse + Gesichtsschatten/Stirnlicht), getrennte Beine mit STIEFELN (keine flache Platte mehr), Wams mit Licht-/Schattenkante + Mittelnaht + Gürtel & Schnalle, Umhang dahinter, Arme gegenläufig, 4 Richtungen + Gehschritt. Vier Stufen: stoff Stoffkapuze/Oxblut, leder Lederkapuze, kette Kettenkoif (Glanz), platte Plattenhelm (Helm statt Kapuze). SpriteProvider.ensureHeldFigure baut den 64px-Atlas held_<tier>; figureFrame routet spieler_<tier> dorthin. Anzeige-Skala HELD_SKALA=0.78 (in helden.ts, zeichneHeld setzt sie auch nach der Todes-Animation korrekt). Hot-Swap-KI-Pakete haben weiter Vorrang. Browser-verifiziert: runder Kopf, Stiefel, Richtungswechsel.
- Runde 38, Held-Kopf gefixt + auf Dorfgröße (Autorkritik "Glatze / zu groß"): die Kapuze/der Helm wird jetzt als VOLLER Dom über dem Kopf gezeichnet (deckt den Scheitel), das Gesicht sitzt als kleinere Haut-Öffnung mit dunklem Rahmen davor - kein kahler Kopf mehr. HELD_SKALA 0.78 -> 0.48 (Dorfbewohner-Größe). Browser-verifiziert.
- Runde 38, Gegner-Rückzug RAUS, Parade rein (Autorwunsch "echter Schlagabtausch, kein Schritt nach hinten bei jedem Treffer; Monster, nicht Tiere"): AGGRO.rueckzugChance für alle MONSTER auf 0 (pest/skelett/lebender_toter/schatten/schuetze), nur Wolf/Ratte tänzeln noch. Das seitliche Ausweichen bei Treffern (damageEnemy) gilt jetzt auch nur für Tiere. Stattdessen sind Monster "kampfbewusst": sie gehen nah am Spieler kurz in Deckung (blockT, seltener/kürzer als Schildträger) und PARIEREN den Frontaltreffer, dann sofortiger Konter (e.blockT=0, atkCd kurz). Deckung/Parade an gegnerCleverness>=0.5 gekoppelt (F10 abschaltbar). Schildträger wie bisher.
- Runde 38, Festhäng-Erkennung (Autorwunsch "merkt die KI nicht dass sie hängt?"): prüft alle 0,3 s, ob der Gegner trotz Annäherung <2,5px vom Fleck kam (Regal/Ecke); wenn ja, schlägt er für 0,7 s einen Bogen (seitlicher Umweg via laufe), statt stur pfeilgerade gegen das Hindernis zu drücken. Felder letztX/letztY/hängtT/umwegT in Enemy.
- Runde 38, Beute/XP-Balance (Autorkritik "4 Epics auf Ebene 1, fast Stufe 5, Inventar sofort voll, Waffen nicht besonders"): RARITY_ROLL drastisch gesenkt (epicBase 0.025->0.006, rareBase 0.12->0.045, magicChance 0.45->0.30) - Epics ~1%, Selten ~4%, der Rest gewöhnlich/magisch. gearChance 0.11->0.06 (weniger Drops). XP-Kurve steiler (firstLevel 45->80, exponent 1.45->1.5) - Stufe 5 braucht ~2x so lange. Alles in items.ts/balancing.ts, weiter über F10-Beute-Regler + Gegner-XP justierbar.
- Runde 38, Item-Icons seltenheitsbewusst (Autorkritik "rostige Klinge sieht aus wie Epic-Schwert"): das Waffen-Icon hing nur am weaponClass. Jetzt: farbiger Seltenheits-Schein + Rahmen hinter JEDEM Icon (grau/blau/gold/lila), Metall/Klinge nach Seltenheit getönt (METALL-Tabelle: stumpf->kühl->vergoldet->arkan), Knauf-/Brust-/Reif-Edelstein ab Selten. iconKey enthält jetzt die Seltenheit (sonst cachte er rostig=episch). Stab-Icon ergänzt. Browser-verifiziert: vier Schwerter klar unterscheidbar.
- Runde 38, Charakterfenster überarbeitet (Autorkritik: Überlappungen, Aufgaben fehl am Platz, Fähigkeiten unübersichtlich, Ressourcen unklar): Reiter neu CHARAKTER | FÄHIGKEITEN | AUFGABEN | ALBUM | STATISTIK mit Trennlinie; der Inhalt beginnt klar darunter (kein Überlappen der Sektionstitel mehr). CHARAKTER-Tab schlank: Portrait/Slots + WERTE-Box (2 Spalten Label/Wert) + VORRAT-Box (Gold/Flaschen/Holz/Stein/Eisen/Kräuter/Kohle mit Farbpunkten). FÄHIGKEITEN-Tab: drei Klassen-Kacheln in Klassenfarbe (Krieger rot ⚔, Zauberer lila ✦, Bogenschütze grün ➶) mit Icon, Stufe, Fortschrittsbalken und Fähigkeits-Chips (frei farbig, gesperrt grau, Tooltip). AUFGABEN-Tab: Tagebuch als Liste, Hauptaufgaben mit Goldpunkt, Hinweise eingerückt. Browser-verifiziert (alle drei Tabs sauber, keine Überlappung).
- Runde 39, Elite/Champion-Leuchten statt Kreis (Autorwunsch "die stärkeren Gegner haben einen Kreis, lieber ein Leuchten"): der harte Goldkreis um Elites ist weg. Stattdessen eine eigene ADD-Grafikschicht (auraGfx, Tiefe 2590), die einen weichen, pulsierenden Schein in der Affix-Farbe zeichnet (Feurig orange, Vampirisch rot, Schnell cyan, Teilend grün, Champion gold). Hebt Minibosse hervor UND liest sich als Gefahren-Hinweis. ADD-Blend hellt den Gegner auf, statt ihn zu verdecken. Browser-verifiziert.
- Runde 39, Held-Kopf verkleinert + größer skaliert (Autorkritik "Ballon auf dem Kopf, Held wirkt winzig neben Gegnern"): Kapuze/Helm von Radius 11 auf 7 (enge Haube statt Ballon), Hals ergänzt, kleinere Augen - proportionaler Kopf. HELD_SKALA 0.48 -> 0.6 (etwas größer als normale Gegner). Die gute Laufanimation (Arme schwingen) bleibt. Vergleichs-Screenshot Held neben Skelett/Pest/Lebender Toter/Schütze an den Autor geschickt zur Größen-Entscheidung.
- Runde 39, Kampf-BEDROHUNG (Autorkritik "Gegner schlagen kaum zu, ein Schritt zurück reicht zum Ausweichen, keine Bedrohung"): der Gegner stößt jetzt MIT dem Hieb nach (lungeIn: Vorstoß zum Spieler bis zum Kontakt) - ein simpler Schritt zurück reicht nicht mehr, man muss rollen/seitlich ausweichen. Gilt für Hieb (26px) und Doppelhieb (22px). Macht jeden Gegner bedrohlich und die Kämpfe zum Duell. Pest/Monster weichen weiter nicht zurück (AGGRO 0).
- Runde 39, Beute/XP noch weiter gedrosselt (Autorkritik "3 Seltene + 2 Magische auf Ebene 1, Stufe 3-4"): RARITY_ROLL weiter runter (epicBase 0.003, rareBase 0.022, magic 0.24); gearChance 0.06->0.045; Elites lassen nicht mehr GARANTIERT Beute fallen (0.45*rate statt min(1,rate)) - das war die Hauptquelle der Seltenen. XP-Kurve steiler (firstLevel 80->110, exponent 1.5->1.55). Ziel: Ebene 1 ~1-2 magische Funde, Seltene selten.
- Runde 39, Kisten mit GEWICHT (Autorkritik "ich schiebe Fässer wie Luft, kein Gewicht, bremst den Helden nicht"): BREAKABLE_MASSE je Art (Fass 1.6 ... Heuhaufen 0.6). Schwerer = langsamer schiebbar UND bremst den Helden (schiebeBremse, Fass -> 53% Tempo). Kiste kann NIE schneller als der schiebende Held (Tempo gedeckelt) - fliegt nicht mehr davon. Numerisch verifiziert. (Nur im Physik-Test.)
- Runde 39, Festhäng-Erkennung robuster: bei <2px Bewegung in 0,25s weicht der Gegner zur tatsächlich FREIEN Seite aus (Probe links/rechts) und drückt direkt per moveBody (nicht laufe, das zurückdrehte); bei erneutem Hängen Richtung umkehren.
- Runde 40, Inventar-Reiter umbrechen + WAFFEN-Filter (Bugs): die 8 Filter-Reiter ragten rechts aus dem Fenster ("SONST" außerhalb) - sie brechen jetzt in eine zweite Reihe um, Listenanfang rückt entsprechend nach. WAFFEN-Filter zeigt jetzt auch Pfeile (it.kind === 'weapon' || 'arrows'), "SONST" schließt Pfeile aus. (Autorwunsch: Pfeil/Bogen sind Waffen.)
- Runde 40, Schriftrollen/Tränke auf die Aktionsleiste ziehbar (Autorbug "Rollen kann ich nicht unten ins Menü ziehen"): Inventarzeilen mit kind scroll/potion/mpotion sind jetzt ziehbar (SLOT_AKTION-Tabelle: scroll->rolle, potion->pot, mpotion->mpot). UIPanels.onAssignToSlot ruft Hud.belegeBeiPunkt(x,y,id), das den Slot unter dem Zeiger mit der Aktion belegt und speichert. Ghost-Glyph beim Ziehen. (Bestehender Rechtsklick-Weg bleibt.)
- Runde 40, geleerte Ebenen bleiben in ALLEN Gebieten leer (Autorbug "Level zurück = alle Gegner wieder da, das hatten wir schonmal"): die geleert-Merkung galt nur für dark-Krypten. Jetzt für jedes Gebiet mit festen enemySpawns (Bossgrab ausgenommen) - der Wald respawnt beim Zurücklaufen nicht mehr. Erst der Tod weckt alles neu (unverändert).
- Runde 40, Tag-Nacht-Uhr läuft auch im Dungeon (Autorwunsch "sollte deutlich langsamer weiterlaufen, 0,05-0,1-fach"): advanceClock aus updateVillageLife herausgelöst und läuft überall; im Dungeon (area.dark) nur TAG.dungeonFaktor = 0.08-fach. Dorf-Leben/Einfall bleiben dorfexklusiv.
- Runde 40, Frostnova als blaue Aura statt Kreis (Autorwunsch): neues EffectSystem.frostNova - ein blau glühender Stoßring wächst nach außen und verblasst (weicher Schleier + heller Frostring + innerer Ring), dazu Eispartikel. Der flache holy-Goldkreis entfällt für Frostnova. Browser-verifiziert.
- Runde 40, Feuerregen mit echten fallenden Flammen (Autorwunsch "echter Flammenregen, nicht nur Kreise"): EffectSystem.flameDrop - Flammenstreifen stürzt 0,45s vor dem Einschlag von oben herab und landet im Warnring. Warnring jetzt feurig (art 'feuer': glühender, sich füllender Ring) statt heiligem Gold. Plus Einschlag-Burst/Flash. Browser-verifiziert.
- Runde 40, Pfeil-Wand-Physik im Physik-Test (Autorwunsch "Pfeile sollten in Wänden stecken ODER abprallen, beides"): PFEIL_PHYSIK (steckChance 0.5, maxPraller 2, prallDaempfung 0.62, steckDauerS 4, minPrallTempo 70). Pfeil an der Wand: per Zufall steckt er (verkeilt, behält Einschlagwinkel, verblasst nach 4s) oder prallt physikalisch ab (an der getroffenen Achse gespiegelt, Schwung -38%); nach 2 Abprallern/zu langsam bleibt er stecken. Gilt für Gegner- UND Spielerpfeile. Browser-verifiziert (steckende Pfeile an der Wand sichtbar).
- Runde 40, Stufenaufstieg langsamer (Autorkritik "nach 3-4 Gegnern schon Stufe 2"): XP.firstLevel 110 -> 190. Stufe 2 braucht jetzt ~190 XP statt 110 (Ebene-1-Gegner geben 9-23), also grob 9-12 Kills statt 4-5. Leicht änderbar.
- Runde 40, Kampf-Bedrohung im Physik-Test (Autorbug "ich drücke nur die linke Maustaste, die Gegner kommen nicht zum Schlag"): die Ursache war der Impuls-Rückstoß - JEDER leichte Treffer schob den Gegner als kvx/kvy weg, und im Gleit-Zustand (kvx>8) läuft die Gegner-KI NICHT (return). So hielt Dauer-Linksklick die Gegner im Wegrutschen fest. Fix: nur kräftige Treffer (Finisher/Schwer, |knockback|>=10) schleudern als Impuls; leichte Hiebe geben nur einen kleinen moveBody-Schubs -> die KI läuft weiter und der Gegner schlägt zu.
- Runde 40, Pfeile mit Spitze (Autorkritik "Pfeile haben keine Spitze, nur eine Kugel vorne"): der fliegende Pfeil wird jetzt mit Holzschaft + Eisenspitze (Dreieck vorne) + roter Befiederung hinten gezeichnet, nicht mehr als kurze Linie/Kugel. Browser-verifiziert.
- Runde 40, Bogen-/Stab-Flugtempo wie Feuerball (Autorwunsch): bogen.projSpeed 440 -> 390, stab.projSpeed 360 -> 390 (Feuerball = 390).
- Runde 40, Zauberstab-Geschoss wie Feuerball (Autorwunsch "Effekt Licht + kleine Kugel"): die Arkankugel (magie-Flag) glüht jetzt violett mit hellem Kern wie der Feuerball (kleinerer Radius 4). Beide - Feuerball UND Stabkugel - werfen im Dunkeln Licht (eraseLight + warmer Schein in renderLight), orange bzw. violett. Browser-verifiziert (Lichtpfütze in der Krypta).
- Runde 40, Schadens-Spanne "von bis" (Autorwunsch "Schaden von bis wie im RPG"): neue weaponDamageRange(it) zeigt min-max aus den Hieb-Varianzgrenzen (0,85..1,2 * Basiswert), z.B. "12-17 Schaden". Genutzt in itemStatLine (Tooltip), Inventarzeile und der WERTE-Box (Spieler-Schaden als Spanne). Test angepasst.
- Runde 40, Kamera-Wackeln Standard AUS (Autorwunsch): DEF_SETTINGS.shake false (per Einstellungen wieder anschaltbar).
- Runde 40, Speicher-Slots mit Datum + Uhrzeit (Autorwunsch): Pause-Menü zeigt jetzt Tag.Monat.Jahr + Stunde:Minute statt nur Uhrzeit (Titel-Lademenü hatte das Datum schon).
- Runde 40, Rennen + schwerer Schlag (Autorwunsch): gehaltene Leertaste rennt mit +50% (PLAYER.sprintMult 1.5), nicht beim Blocken/Spannen/schweren Ausholen. Beim schweren Schlag (Umschalt) darf man jetzt bedächtig weitergehen (heavyWalkMult 0.5, vorher festgenagelt). ANNAHME: Leertaste tippen = weiterhin Ausweichrolle, Leertaste HALTEN = Rolle + danach Dauerlauf. Falls der Autor reines Rennen ohne Anfangsrolle will, ist das eine Zeile.
- Runde 40, Mauerriss-Tooltip (Autorwunsch): beim Zeigen auf eine brüchige Wand erscheint "Brüchige Wand - mit Angriffen aufbrechen".
- Runde 40, Belegungsmenü nach Kategorien (Autorkritik "total unübersichtlich, aufräumen nach Magier/Krieger/farblich"): das Rechtsklick-Menü gruppiert die Aktionen jetzt unter farbigen Überschriften NAHKAMPF (rot), BOGEN (grün), ZAUBER (blau), GEGENSTAND (gold) mit farbigem Balken; Einträge in der Kategoriefarbe, aktiver hervorgehoben. Browser-verifiziert.
- Runde 40, Aktionsleisten zentrierter Block (Autorwunsch "UI wie der Screenshot, mittig, skaliert nicht verrutschen"): Maus-Leiste (5) links + Tastenleiste (10) rechts bilden EINEN Block, der sich aus w/2 zentriert (BLOCK_W konstant) - bleibt auf jeder Fenstergröße mittig, keine Überlapp-Klemmung mehr. mausLeisteAnkerX = linke Blockkante, tastenLeisteMitteX für den Dev-Verschiebegriff. Browser-verifiziert.
- Runde 40, kein Rennen + schwächere Rolle (Autorkorrektur): Leertasten-Sprint wieder entfernt; Ausweichrolle abgeschwächt (ROLL.speed 560->400, durationS 0.3->0.26, iFrames 260) - kürzerer Satz statt weitem Hechtsprung.
- Runde 40, Held-Proportionen + FIGUR-EDITOR (Autorkritik "Kapuze viel zu groß, Ballon" + Wunsch "Tool zum Selbst-Anpassen, nicht nur skalieren"): Proportionen in HeldForm ausgelagert (Kopfgröße/-höhe, Schulter, Taille, Rumpf, Arme, Beine, Gesamtgröße) und drawHeld vollständig daraus berechnet (vorher hartkodierte Magic Numbers). Neuer Standard mit kleinerem Kopf (kopfR 7->5.8). In-Game-Editor (ui/heldEditor.ts) mit Live-Vorschau (drehbar, animiert) und -/+ je Proportion; SPEICHERN übernimmt auf die Welt-Figur (SpriteProvider.invalidateHeld baut die 64px-Atlanten neu) + Browser-Speicher, ZURÜCKSETZEN = Standardwerte, SCHLIESSEN verwirft Ungespeichertes. Geöffnet über Pause-Menü "FIGUR ANPASSEN". HELD_SKALA wandert nach HeldForm.skala. Browser-verifiziert (Editor offen, -/+ ändert Vorschau live).
- Runde 40, Sockelstein-Flut behoben (Autorbug "5 Steine auf Ebene 1 trotz Beutemenge 0,2 - WARUM?"): die Truhen-Steine ignorierten den Beute-Regler KOMPLETT und jede selten/verfluchte Truhe gab GARANTIERT einen Stein. Jetzt: Truhen-Stein nur noch mit CHEST.gemChance*beuteRate (gemChance 0.35->0.12, kein Selten-Automatismus mehr). Die Sondertruhe belohnt weiter mit besserer Ausrüstung. Browser-verifiziert: Ebene 1 hat 3 Truhen, Stein-Chance bei Beutemenge 0,2 nun ~2,4% je Truhe.
- Runde 40, Leveln DRASTISCH langsamer (Autorkritik, mehrfach: "Ende Ebene 1 schon Stufe 3 - Stufe 2 erst IN Ebene 2"): XP.firstLevel 190->300 UND neuer XP.gegnerMult 0.3 (Gegner geben 30% ihrer Basis-XP, am Award angewandt). Browser-verifiziert an echtem Ebene-1-Layout: 27 Gegner = 163 effektive XP, Stufe 2 braucht 300 -> nach KOMPLETTER Ebene 1 noch Stufe 1 (54% zu Stufe 2), Stufe 2 fällt mitten in Ebene 2. gegnerMult ist die eine Stellschraube zum Nachjustieren.
- Runde 40, Figur-Editor erweitert (Autorwunsch: dunkle/helle Rüstungen + modularer Helm mit Visier/Gesichtsöffnung): drei neue Form-Regler - gesichtOffen (wie viel Gesicht/Augen sichtbar), visier (Stahlvisier senkt sich von oben über die Augen, lässt einen Schlitz), ruestHell (Rüstung heller/dunkler via shade auf alle Rüstungsfarben, Haut bleibt). Editor zeigt eine RÜSTUNG-ANSEHEN-Auswahl (Stoff/Leder/Kette/Platte), um die Form auf jeder Stufe zu sehen (Helm gehört zur Platte). Werte global (eine Einstellung für alle Stufen) - Browser-verifiziert (Platte mit gesenktem Visier, dunkel vs. hell sichtbar verschieden).
- Runde 40, Editor-Erweiterung (Autorwunsch "deutlich mehr im Editor, größeres Fenster"): Fenster auf 760x620 (3 Spalten). Neue Regler: Umhang-Weite + Umhang-Länge (Cape schmaler/kürzer), Gürtelbreite, Kettengitter (Kettenhemd-Muster: geklippte abwechselnde helle/dunkle Pixel auf dem Wams), Gold-Leuchten (gebackener goldener Schein = epische Rüstung). Neuer FARBEN-Picker: Teil wählen (Wams/Umhang/Kapuze-Helm/Gürtel) + 12er-Palette, Standardfarbe-Knopf setzt zurück. drawHeld wendet Farb-Überschreibungen + Helligkeit auf die Palette an. Browser-verifiziert (Kettengitter sichtbar, Gold-Halo, Farbe greift).
- Runde 40, Editor-Speicherabsturz: invalidateHeld zeichnet die Atlanten IN PLACE neu (Canvas überzeichnen + refresh) statt textures.remove - letzteres ließ den Spieler-Sprite auf eine null-glTexture zeigen ("Cannot read properties of null (reading 'glTexture')").
- Runde 40, Resize/Vollbild-Bug (Autorbug "F11 und zurück -> Bild broken; Browser größer/kleiner -> Skalierung dahin, Leben/Mana und Charakterfenster verschieben sich"): WorldScene lauscht jetzt auf scale 'resize' (beim Verlassen abgemeldet) und zieht Haupt-/UI-Kamera + Lichtschicht auf die neue Größe und baut OFFENE, mittig gebaute Fenster neu auf (panels.refresh, Pause, Editor). Die HUD-Leisten/Kugeln richten sich ohnehin pro Frame aus. Browser-verifiziert: Charakterfenster zentriert sich nach Verkleinern UND Vergrößern wieder korrekt.
- Runde 40, Aussehen PRO Rüstungsstufe (Autorwunsch "je nach Rüstung anderes Aussehen, erstmal Stoff/Leder/Kette/Platte"): HeldForm wird jetzt je Stufe gespeichert (HeldFormen = Record<HeldTier, HeldForm>), getHeldForm(tier). drawHeld(tier) nutzt die Form der Stufe, der Held wechselt das Aussehen automatisch mit der getragenen Rüstung. Start-Looks: Kette mit Gittermuster + Coif, Platte mit leicht gesenktem Visier. Editor: "RÜSTUNG BEARBEITEN" wählt die zu bearbeitende Stufe (Untertitel zeigt sie), ZURÜCKSETZEN nur für die aktuelle Stufe, SPEICHERN sichert alle vier. Gold-Leuchten bleibt manueller Regler (Autorwunsch). Browser-verifiziert (Platte mit Visier, Kette mit Gitter, getrennt bearbeitbar).
- Runde 40, geleerte Ebenen bleiben AUCH nach dem Tod leer (Autorkritik, mehrfach: "gestorben, vom Friedhof in Ebene 1 gelaufen - wieder voller Gegner, das will ich nicht"): der Tod-Reset (alle geleert=false) ist entfernt. Geräumte Ebenen bleiben dauerhaft ruhig.
- Runde 40, Feuerzauber feuriger (Autorwunsch "Feuerwalze/-wand/-regen deutlich beeindruckender mit feurigen Leuchteffekten"): neuer EffectSystem.feuerStoss (Blitz + mehrlagige Flammen-/Glutpartikel + züngelnde Flammen) ersetzt die kleinen Funken-Bursts. Neu: temporäre Feuerlichter (feuerlicht-Hook, in WorldScene über die Lichtschicht) - Feuerwand/-walze/-regen lassen den dunklen Gang orange auflodern (eraseLight + warmer Schein, flackernd, nach Restzeit abklingend). Browser-verifiziert in der Krypta (Feuerregen + Feuerwalze erhellen den Raum orange).
- Runde 40, Editor-Feinschliff (Autorkritik-Sammlung): (1) "Rüstung hell/dunkel" wirkt jetzt auf ALLES inkl. Wams, Helm und Metallteile - die Helligkeit wird ZULETZT auf die ganze Palette + die hartkodierten Metalle (shade) angewandt (vorher überschrieben Farben/Helm sie). (2) Kettengitter ist jetzt ein VERSETZTES Maschenmuster (heller Ringreflex + Schatten, jede zweite Reihe versetzt) statt Steppjacken-Karos. (3) Beide Handschuhe gleiche Farbe (eigene Handschuhfarbe statt an die Armseite gekoppelt) - zusätzlich als Farb-Teil wählbar. (4) Schnalle (Gürtelmitte) jetzt eigenes Farb-Teil. (5) Gold-Leuchten = leuchtende KONTUR (shadowBlur um die Figur) statt Halo (Autorwunsch). Browser-verifiziert.
- Runde 40, benannte Vorlagen (Autorwunsch "Figur speichern unter Name, z.B. Rüstung_kette_episch"): Vorlagen-Bibliothek (localStorage), "SPEICHERN UNTER…" (window.prompt für den Namen, Vorschlag Rüstung_<stufe>), Liste mit Laden (auf aktuelle Stufe anwenden) und Löschen (×). Browser-verifiziert.
- Runde 40, mehr Editor-Optionen (Autorwunsch "mehr Möglichkeiten", u.a. Schultern-Epik-Slider, Rüstungs-Zustand/Rost): drei neue Regler - Schulterplatten (0 keine / 1 schlicht / 2 massiv verzierte Pauldrons mit Niete), Rost (rostbraune ortsfeste Patina auf dem Wams), Verschmutzung (dunkler Schmutzschleier am unteren Rand). Editor-Fenster auf 760x664, Reglerzeilen enger (22px). Browser-verifiziert (Platte mit massiven Pauldrons + Rost).
- Runde 40, World-Editor-Absturz beim "Weg malen" (Autorbug): Ursache nicht headless reproduzierbar, aber die wahrscheinlichste Quelle behoben: der Baukasten zählte NICHT als uiBlocked, d.h. jeder Mal-Klick löste ZUGLEICH eine Kampfaktion in der laufenden Welt aus. Jetzt blockiert ein offener Baukasten den Kampf (Welt friert beim Editieren ein). Zusätzlich die Mal-Aktion in try/catch gekapselt (Fehler wird geloggt + gemeldet statt das Spiel zu killen).
- Runde 40, "Lavahöhle" umbenannt (Autorhinweis "kein Lava drin"): Krypta-Thema 5 heißt jetzt "Die Glutkatakomben" (passt zur rötlichen Glut-Palette + Miniboss "Die Aschengeborene").
- Runde 40, Bodennebel über die ganze Sicht (Autorwunsch "Nebel standardmäßig an, über die ganze Karte nicht nur im Sichtfeld, mehr Atmosphäre"): bildschirmfeste, treibende Nebelschwaden (8 Sprites, Tiefe 4180, unter dem HUD) decken die gesamte Ansicht ab - egal wohin man läuft. Aktiv an Tag 1 (beim Start gesetzt) und nach JEDEM Regen (wuerfleWetter: nebelAktiv = regnet), blendet sanft ein/aus (nebelStaerke lerpt). In der dunklen Krypta aus (dort trägt das Grusel-Licht). Browser-verifiziert (dichter Nebel über dem ganzen Dorf).
- Runde 40, Proben Taverne + NPC (Autorwunsch "zeichne mir eine Taverne und einen NPC im Stil des Helden"): neue gfx/npcArt.ts mit drawWirtin (detaillierte Wirtin: Rock mit Falten, Schürze, geschnürtes Mieder, gekrempelte Ärmel, Haardutt, Gesicht, Krug) und drawTaverne ("Zum Schwarzen Raben": Steinsockel-Mauerwerk, Fachwerk mit Andreaskreuz-Streben, beleuchtete Sprossenfenster, Tür, Schindel-Steildach, Schornstein, Hängeschild mit Raben-Silhouette). Erste Entwürfe, prozedural. DEV-Vorschau zeichneProben() zum Zeigen. Noch NICHT in die Welt integriert - warten auf Autor-Feedback zur Richtung.
- Runde 40, KRITISCHER XP-Bug (Autorkritik "3. Gegner schon Stufe 2"): newPlayerState setzte xpNext FEST auf 45 (alter Wert), ignorierte also firstLevel 300 komplett. Jetzt xpNext = xpForNextLevel(1) = 300. Browser-verifiziert: frischer Held braucht 300 XP, ganze Ebene 1 (29 Gegner) = 180 effektive XP -> bleibt Stufe 1.
- Runde 40, TUNING-Standards (Autorwunsch): physikTest = true, gefallene = true (bewaffnete Gegner komplett ins Spiel), gegnerCleverness = 2.0 (maximal), beuteRate 1.0 -> 0.4 (weniger Beute, "Beute runter").
- Runde 40, Bodennebel WELT-verankert + ohne Kanten (Autorbug "Viereck bewegt sich mit der Figur, harte Kanten"): Nebel jetzt im Welt-Raum (Tiefe 2900, driftet auf dem Spielfeld, wird nur weit außerhalb der Sicht nahtlos umgesetzt) statt bildschirmfest. Neue Textur 256px mit Kernen WEIT innen -> Alpha läuft zum Rand voll auf 0 aus (keine Quadratkante).
- Runde 40, Editor-Farbfixe (Autorkritik): Palette 12 -> 24 Farben; neue Färb-Teile Schulterplatten + Visier; BEIDE Arme/Handschuhe gleiche Grundfarbe (vorher vorne/hinten verschieden hell). Browser-verifiziert (8 Teile, 24 Farben im Picker).
- Runde 40, detaillierte Breakables 64px (Autorwunsch "maximale Details in 64x64 runterskaliert"): drawBreakable komplett neu in 64px - Fass (Dauben + 3 Metallreifen + Deckel + Licht/Schatten), Kiste (Planken + Eckbeschläge + Nieten + Maserung), Krug (Bauch + Hals + Henkel + Mündung + Glasur), Heuhaufen (Strohhalme + Lichtkante), Knochenhaufen (Schädel + gekreuzte Knochen). breakableKey-Canvas 64px, Sprite auf 36px heruntergerechnet. Browser-verifiziert (Detailprobe). NPC-Wirtin: Kopf direkt auf den Schultern (kein Hals). Tiles/Objekte (Altar, Zaun, Folterbank, Skelette, Fels, Wasser, Felder) folgen als Batch 2.
- Runde 40, schäbige Häuser + weißer Rand (Autorkritik "so kann man nicht spielen"): die haus*.png-Assets waren schäbig/hatten weiße Ränder. Ersetzt durch DETAILLIERTE prozedurale Fachwerkhäuser (drawHaus: Steinsockel-Mauerwerk, Fachwerk-Balken + Andreaskreuze, beleuchtete Sprossenfenster, Tür, Schindel-Steildach mit Überstand, Schornstein; 4 Varianten je Farbe). IMMER prozedural (asset-PNGs ignoriert), Baukasten-Upload überschreibt weiter. Browser-verifiziert.
- Runde 40, Baukasten "speichert nur manchmal" (Autorbug): URSACHE = hochgeladene Haus-Bilder wurden als VOLLE base64-PNGs im localStorage abgelegt -> wenige Uploads sprengten das ~5MB-Limit, danach scheiterte JEDER weitere setItem still (Bilder, Stadtplan, Hauspositionen). Fix: Uploads vor dem Speichern auf max 256px verkleinern (verkleinereCanvas). Bestehender Ballast lässt sich im Baukasten mit "ALLE HAUSBILDER LÖSCHEN" leeren.
- Runde 40, Geleert-Fehler (Autorbug "alle Monster weg, obwohl nicht gecleart"): URSACHE = beim Verlassen galt eine Ebene als geleert, wenn kein Gegner SICHTBAR war (`!enemies.some(e => e.hp>0 && !e.versteckt)`). `versteckt` ist aber nur ein Sichtlinien-Flag der dunklen Krypta - wer zur Treppe lief, hatte die Gegner um die Ecke nicht im Blick. Fix: geleert = KEIN lebender Gegner mehr da (`!enemies.some(e => e.hp>0)`), unabhängig von der Sicht.
- Runde 40, HUD-Umbau (Autorwunsch): Lebenskugel direkt links neben der Maus-Leiste, Manakugel direkt rechts neben der Tastenleiste (orbHpAnkerX/orbMpAnkerX folgen den echten Leistenkanten). Meldungen ins obere Viertel (y=64, neueste oben) - überschnitten sich unten mit den Dialograhmen. Chronik ganz links unten (knapp über dem unteren HUD-Streifen, damit die Lebenskugel frei bleibt). uiLayoutV 3 setzt alte Versätze einmalig zurück.
- Runde 40, Bewohner-Trennung (Autorbug "Figuren stehen ineinander"): NPCs teilten sich oft dasselbe Mittags-/Abendziel (Taverne, Markt) und stapelten sich. Neue trenneNpcs() schiebt überlappende sichtbare Nachbarn achsenweise auseinander (NPC_R=12, ohne durch Wände zu drücken) - analog zur Gegner-Trennung.
- Runde 40, Wirtin Mathilde echt im Spiel (Autorbug "sieht aus wie immer"): drawWirtin steckte nur in der Vorschau. Jetzt über eine DETAIL_NPCS-Registry im SpriteProvider gerendert (64px gezeichnet, sauber auf die 32px-Figurzelle heruntergerechnet, Frontansicht für alle Richtungen). Leicht erweiterbar für weitere Detail-NPCs.
- Runde 40, Batch 2 (Autorwunsch "den Rest in 64px runterskaliert"): neue detailArt.ts mit Felsbrocken (facettierter Granit + Moos), Zaun (verwitterte Latten + Nägel), Acker/Felder (Furchen + Schollen + Triebe), Folterbank (Speichenwalzen + Seile + Blut), liegendem Skelett (Schädel + Brustkorb + Glieder), Altar (Blutrinne + Schädel + Kerzen). tileArt rechnet sie per detail()-Helfer auf 32px herunter. Wasser/Fluss ANIMIERT: prozedurale Phasen-Frames lassen die Wellen abwärts wandern (animiereWasser läuft auch ohne Hot-Swap, Frame auf WASSER_FRAMES=8 begrenzt -> kein Texturleck). Browser-verifiziert (Detailprobe + Meldungen oben + Orbs an den Leisten + Chronik links unten).
- Runde 40, Resize-/Vollbild-Fehler (Autorbug "Fehler beim Vollbild/Fenster ziehen"): nach Fenstergröße-Ändern lag die ganze Krypta offen, weil das In-Place-setSize der Licht-RenderTexture den Framebuffer kaputt ließ. Fix: Lichtschicht bei Resize NEU erzeugen (erstelleLichtTextur) statt setSize. Reproduziert (Playwright resize) und verifiziert.
- Runde 40, Tuning-Bericht übernommen: beuteRate 0.4->0.3, spielerReichweite 1.0->0.8, gegnerReichweite 1.0->1.4 (übrige Werte + Tempo 90% waren bereits Standard). UI-Versätze des Berichts NICHT übernommen: sie waren der manuelle Weg des Autors, Orbs-an-die-Leisten + Meldungen-oben zu erreichen - genau das ist jetzt fest verankert; wörtlich angewandt würde alles doppelt verschoben und aus dem Bild rutschen. Die Migration (uiLayoutV 3) nullt die alten Versätze.
- Runde 40, Etage immer sichtbar (Autorwunsch): Krypta-Name zeigt "· EBENE n", Treppen nennen ihr Ziel ("Treppe hinab zu Ebene 2" / "hinauf zu Kirche St. Marien" / "Grab des Kreuzritters").
- Runde 40, Grafik-Aufwertung (Autorfrage "Schatten/Shader?"): JA - Phaser-postFX. Welt-Kamera bekommt dezentes Bloom (Fackeln/Feuer/Zauber glühen) + weiche Vignette. UI-Kamera bleibt scharf. Abschaltbar (settings.postFx, Standard an), live nachgezogen. Browser-verifiziert Krypta+Dorf.
- Runde 40, Monster aufgewertet (Autorwunsch "vorhandene Monster, Stil lassen, mehr Details"): Skelett/Schütze bekommen Totenschädel (Augenhöhlen/Nase/Kiefer+Zähne) + Brustkorb (Wirbelsäule/Rippen/Becken); Pest bekommt dunkelrote Beulen (seuche-Flag). Silhouette + Animation + Richtungen bleiben; Villager unberührt. Detailprobe verifiziert.
- Runde 40, Nebel verdunkelt statt aufzuhellen (Autorbug "Nebel macht alles heller, passt nicht zu Sonnenschein"): bei aktivem Nebel legt renderFog einen kühlen Grauschleier (desättigt + abdunkelnd, skaliert mit nebelStaerke) übers ganze Bild - trüb-dämmrig wie bei Regen. Nebelschwaden-Textur von hellweiß auf kühl-gedämpftes Grau. Kombiniert mit der Sichtbegrenzung = stimmiges Nebelwetter.
- Runde 40, Sichtweite draußen begrenzt (Autorwunsch "so weit wie ein Mensch sieht, viel weiter als Dungeon"): renderLight kappt den Außen-Lichtradius auf TUNING.sichtweiteDorf (Standard 440px), Nebel verkürzt ihn um bis zu 30%. F10-Kasten: Regler sichtweiteDorf (200-760px) + Schalter sichtBegrenzung. Zum Ausprobieren/Tunen gedacht.
- Runde 40, eigene Wasser-Simulation (Autorwunsch "dein Sprite ist nicht gut, lösche es, mach deine eigene"): assets/tiles/wasser1-3.png gelöscht (mit Freigabe) -> Spiel nutzt prozedurales wasser64. Neu: Tiefenverlauf, mehrere fließende Wellenbänder unterschiedlicher Frequenz, dunkle Strömungsadern, Kaustik-Glanzbögen, Schaumtupfer; animiert über die Phase.
- Runde 40, Loot-Rahmen entfernt (Autorkritik "Rahmen um den Loot sieht nicht gut aus"): eckiger Seltenheits-strokeRect aus rarityBackdrop raus; der runde Seltenheits-Schimmer bleibt, die Inventarfelder tragen ihre eigene Umrandung (panels.ts).
- Runde 40, Brücken-Prototyp ab Ebene 4 (Autorwunsch "neuer Stil ab Level 4, testen ob es gut aussieht"): neue Tiles ABYSS (unbegehbar) + BRIDGE (begehbar). Generierung ab n>=4: größter Raum (>=6x6) wird Schlucht - Innenfläche Abgrund, 1 Kachel Boden-Ring außen bleibt, Kreuz-Steg über die Mitte. Ring+Steg garantieren Durchquerbarkeit (Flutfüllung an 40 E4/E5-Generierungen: 100% Steg + Treppe erreichbar). Ebenen 1-3 unberührt. Rein optischer Prototyp; falls der Look passt, kann später eine "Pflicht-Überquerung" (ohne Ring) folgen.
- Runde 40, Dev-Teleport zu jeder Ebene: devTeleport nimmt jetzt jede Gebiets-ID; F10-Kasten hat eine Sprung-Reihe (E1-E5, GRAB, STADT), E4/E5 hervorgehoben - zum schnellen Testen des Brücken-Prototyps.
- Runde 40, Schlucht-Tiefe (Autorwunsch "es soll Tiefe haben, man sieht unten was, an Spielen orientieren, Abwechslung"): die sich wiederholenden Abgrund-Kacheln ersetzt durch EIN gezeichnetes Tiefenbild (drawSchlucht) über die ganze Schlucht - beleuchteter Felssaum, dunkle Schichtwand, glühender Grund mit Funken. Akzentfarbe je Ebenen-Thema (Verlies blau, Glutkatakomben orange). Schlucht-Glühen wirft farbiges Licht auf den Steg. Höhle bis 14x11, EIN breiter Steg quer (Abgrund oben+unten offen, Boden-Ring sichert Durchquerbarkeit - 40/40 per Flutfüllung geprüft). Prototyp; Autor schaut es sich an, dann nächster Schritt (Pflicht-Überquerung / mehrere Stege / Wendeltreppe tiefer).
- Runde 40, Schlucht-Set-Piece (Autorwunsch "tobt dich aus, mehr solche Sachen"): vier Leucht-Kristalle (drawKristall) als Tor-Pfosten an den Steg-Enden, glühen in der Akzentfarbe (pulsierendes Licht); ein Champion "Wächter der Schlucht" bewacht die Überquerung. Macht aus der Brücke einen bewachten Schauplatz.
- Runde 40, Raum-Abwechslung (Autorwunsch "Räume dürfen anders sein"): ~38% größerer Räume werden runde Kavernen (carveOval, Korridore stanzen sich durch den Rand); 1-2 große Räume je Ebene werden Säulenhallen (neue Kachel PILLAR, drawObjectArt 'saeule': Sockel/Schaft/Kapitell). Durchquerbarkeit 60/60 per Flutfüllung geprüft.
- Runde 40, Treppen-Fix: späte Terrain-Eingriffe (Schlucht/Säulenhalle) durften die Treppen-Kacheln nicht mehr überschreiben (Testfall schlug fehl) - enthaeltTreppe-Wächter + Sicherheitsnetz am Ende von buildCrypt. Alle 67 Tests grün.
- Runde 40, Boden-Skelette weg (Autorwunsch): knochen-Kachel zeigt nur noch einen dezenten dunklen Fleck statt eines ganzen liegenden Skeletts.
- Runde 40, eigener Stil ab Ebene 4 (Autorwunsch "wie ein neuer Abschnitt"): theme.stil; "Verlies" (E4) = kalter blau-grauer Quaderstein-Kerker (Eisennieten, kuehler Glanz), "Glutkatakomben" (E5) = verkohlter Boden + gluehende Risse in Boden und Wand. Floor-/Wall-Drawing verzweigt nach stil.
- Runde 40, Bruecke fuehrt zur Tresor-Insel (Autorkritik "fuehrt ans Kartenende"): Schlucht = Nahseite - Abgrund - Insel-Pocket, ringsum vom Abgrund eingeschlossen, NUR ueber den Steg erreichbar (seltene Truhe + Waechter). Flutfuellung: 40/40 ohne Steg unerreichbar (Pflicht-Ueberquerung), 40/40 mit Steg erreichbar, 50/50 Treppe erreichbar. Insel-Boden Tiefe -8 (ueber dem Tiefenbild -9). a.schlucht = exaktes Abgrund-Rechteck.
- Runde 40, Unbesiegbarkeit + Gegner-Dichte (Autorwunsch zum Testen): UNBESIEGBAR-Schalter (TUNING.unbesiegbar) - hurtPlayer ignoriert allen Schaden. Gegner-Dichte-Regler (TUNING.gegnerDichte, F10-Slider) als Multiplikator auf die Spawn-Anzahl je Raum (wirkt auf NEU erzeugte Ebenen). Bestaetigt: E4/E5 spawnen mit der bestehenden Formel (cnt je Raum * (10+n) Raeume) ~60 Gegner (E1 27, E2 42, E3 43, E4 61, E5 63) - NICHT durch die R40-Aenderungen, sondern die alte Tiefenskalierung. Regler senkt es live (0.5 -> ~37). Default 1.0 belassen (Autor entscheidet die Schwierigkeit).
- Runde 40, Actionbar per Mausklick (Autorwunsch): Linksklick auf einen Slot löst die belegte Aktion aus (runActionFromBar -> barCastAim -> Auto-Ziel auf nächsten Gegner, da der Cursor auf der Leiste ist). Ziehen verschiebt/tauscht weiterhin (klickSlot wird beim dragstart verworfen). Browser-verifiziert (Klick auf Feuerball-Slot -> Projektil + Mana).
- Runde 40, Fackeln nehmen Kristall-Akzent an (Autorwunsch): in Schlucht-Ebenen (E4/E5) leuchten Fackelflamme UND -licht in der Akzentfarbe (Verlies kalt-blau, Glut orange) - kohärentes Themen-Licht.
- Runde 40, Der GROSSE Einfall nach dem Boss (Autorwunsch "Bedrohung/Panik/Chaos spürbar, Welt reagiert, Geschichte geht weiter"): 33 Monster + Anführer; RÄUBER (Enemy.jagdZiel) jagen/reißen Vieh (verschwindet) und verschleppen Bewohner; Tiere fliehen panisch aus den Gattern, Bewohner rennen sichtbar ins Gemeindehaus (imHaus). Meldung "VERTEIDIGE RAVENSMOOR"; Sieg setzt flags.kriegBegonnen + Enthüllung (Boss hatte das Relikt nicht, rief den Krieg aus, Gräber öffnen sich) + neue Quest. Räuber-Spawn NAHE der Beute (Vieh steht in Gattern am Rand) + Tempo x1.4, sonst kämen sie nie an. Verifiziert: Vieh 13->4, Bewohner fliehen, Sieg -> kriegBegonnen.
- Prolog/"Ebene 1" (Briefing): Architektur als eigenständige Phaser-Szenen (kampffrei, eigener minimaler Held) + drei wiederverwendbare Systeme unter src/systems/. Begründung: das Briefing fordert genau diese Struktur (eigene Szenen + Systeme); die Angst-Ebene ist bewusst KEIN Kampf, also passt eine schlanke Szene ohne den RPG-Player/Combat besser. Tunables in src/data/prolog.ts. Pure Logik in prologMath.ts (Phaser-frei -> Node-Tests). Startbar zum Testen ueber ?prolog=kammer / ?prolog=schwelle / ?prolog=blutstrom. OFFEN: Einbettung in den Hauptspielfluss (Reihenfolge der Raeume, Uebergang zu Krypta-Level 1, echte Audio-Assets) + Boss-Arena (font) - mit dem Autor abzustimmen.
- Prolog-Korrektur (Runde 41, Autor-Klarstellung): der Eröffnungs-Prolog ist "Ebene 0" (UNbeschriftet, die Krypta bleibt Ebene 1-5). Ablauf jetzt: Kirchen-Abstieg -> Kammer der Finsternis mit LÄNGEREM Eingangsgang (Tür fällt zu, man tastet sich durch den Gang in die Becken-Kammer) -> Die Schwelle. Am Ende der Schwelle ein HEBEL: er öffnet hinter dem Spieler das Eingangstor wieder (Rückweg ins Dorf, OPTIONAL - man muss nicht) UND gibt vor ihm die Treppe HINAB in die Krypta frei. Hauptweg = Abstieg -> crypt1 (das frühere Level 1); Hebel-Rückweg -> Dorf. beendeProlog(scene, ziel?) kann das Registry-Ziel überschreiben ('rueckweg'); prologFertig kennt jetzt crypt1/rueckweg/boss. In BEIDE Richtungen browser-verifiziert (Hebel -> Treppe -> crypt1; Hebel -> Rückweg -> Dorf). Frühere Lesart (Prolog -> zurück ins Dorf als Pflicht) war falsch.
- Prolog in den Hauptspielfluss eingebettet (Autorwunsch): die drei Räume nach ihrem Briefing-ZWECK verteilt. (1) ERÖFFNUNGS-PROLOG beim ersten Kirchen-Abstieg ("Ebene 1"): Kammer -> Schwelle -> Rückweg/Schalter -> zurück ins Dorf (flags.prologGesehen, danach führt die Treppe normal in crypt1). (2) PRE-BOSS einmalig (crypt5 -> Boss): der Blutstrom-Gang ("direkt vor der Boss-Arena", flags.blutstromGesehen). TECHNIK: starteProlog() legt die WorldScene SCHLAFEND in den Hintergrund (scene.sleep -> voller Zustand/Inventar/HP bleibt, kein Neuladen) und startet die Prolog-Szene darüber; beendeProlog() (src/systems/prologFluss.ts) weckt sie wieder; die WorldScene macht den Gebietswechsel in ihrem WAKE-Ereignis (robuster als ein synchrones Event - erst dort ist sie sicher aktiv; Standalone-Test ohne WorldScene -> zurück zum Titel). Browser-verifiziert in BEIDE Richtungen (Start: Welt schläft + Prolog aktiv; Rückkehr Eröffnung -> Dorf + prologGesehen; Rückkehr Blutstrom -> Boss; kein HUD-Durchscheinen). Krypta-Nummerierung NICHT verschoben (Krypta bleibt Ebene 1-5) - offene Frage an den Autor in OFFENE-FRAGEN.md.
- Prolog-Raum 3 "Der Blutstrom" (Briefing, Gang vor der Boss-Arena): BloodFlow auf 'river' = breite, leuchtende Ader quer durch den Gang, zugleich die HAUPTLICHTQUELLE (Laterne auf 70% gedimmt, drei stille Lichtquellen entlang des Stroms). Das Blut ist UNbegehbar (solid) - so bleibt der Gang kampffrei, statt Schaden im Blut zu nehmen quert man auf versunkenen Grabplatten (orthogonal verbundener Trittstein-Pfad). addPullEffect aktiv (Fluestern + rote Vignette nahe dem Strom). Bleiche Haende steigen periodisch aus dem Blut (zeigeHand, reine Stimmung). Notiz des Pater Johannes (am Leichnam des vorausgeschickten Boten, E zum Lesen) enthuellt: das Blut der Gefallenen naehrt das Geschenk und haelt den Templer am Leben. Am oberen Ufer der Templer - groesser/klarer als zuvor, mit eigenem Licht + glimmenden Augen, steht ~4s und dreht sich weg. Browser-verifiziert (Strom+Platten+Hand+Leichnam, Templer klar am Ufer).

## Runde 50 (Autorliste: lvl-up, Nahkampf-Moves, 3D-Knöpfe, Zauberstab, Chronik, Krypta-Art)

- Aufstiegs-Banner (Autorwunsch "lvl up länger + welcher Skill dazukam mit Icon"): eigenes Banner zeigeSchulAufstieg(school, level) getrennt vom Spieler-XP-Banner zeigeLevelUp. Zeigt "AUFSTIEG · SCHULE STUFE N" + die an dieser Stufe neu freigeschaltete Fertigkeit (SPELLS/ABILITIES mit unlock===level) samt SKILL_ICONS-Symbol + Hinweis "auf die Aktionsleiste legen". Mit Skill 4,2s, sonst 2,6s sichtbar. Browser-verifiziert.
- Vier neue Nahkampf-Fähigkeiten (Autorwunsch "Krieger hat nur 3 Specials, mehr rein, RPG-typisch"): Wuchtschlag (Stufe 2, Einzelhieb + Knockback + Stun), Blutdurst (Stufe 4, Rundhieb mit Lebensraub healPerHit je Treffer - passt zum Unsterblichkeits-Thema), Kriegsschrei (Stufe 5, AoE-Stun + Stärke-Buff via p.buffT/ALTAR.buffDmgMult), Erschütternder Stoß (Stufe 7, AoE-Knockback + Stun). Werte in ABILITY_FX, einzeln auf die Leiste legbar, im Fähigkeiten-Tab nach Stufe einsortiert. progression-Test angepasst. Browser-verifiziert (Tab zeigt alle mit Symbolen).
- 3D-Knöpfe der Aktionsleiste (Autorwunsch "wie bei WoW"): zeichne3dKnopf() - dunkler Metallkörper, Glas-Glanz obere Hälfte, Glanzkante oben/links, Schattenkante unten/rechts, kategoriefarbener Rahmen. Browser-verifiziert.
- Zauberstab-Icons (Autorwunsch "sehen aus wie Mops/Lutscher"): Item-Icon (itemIcons stab) neu = konischer Holzschaft + Lederwicklung + Krallen-Fassung + Rauten-Kristall (Farbe nach Seltenheit). Gegner-Figur (fallbackArt stab) = Holzschaft + Zierring + gefasster Kristall statt flachem Klotz. Beide browser-verifiziert.
- Chronik scrollbar + Tag-Ereignisse gelb (Autorwunsch): Mausrad über dem Fenster blättert (chronikScroll, ▲/▼-Hinweise, Lauscher in create() genau einmal an-/abgemeldet - Regel 9). Tag-Ereignisse ("Tag N bricht an", "du erwachst erholt") via logMsg(text,'tag') gelb (#f0e08a) mit ◆-Marke, ohne doppeltes Tag-Präfix. chronik(kat,text,gelb?) um optionalen Parameter erweitert (override-kompatibel). Browser-verifiziert (gelbe Tage, Scrollen vor/zurück).
- Krypta-Art (Autorliste): Blut NUR noch in Sonderräumen (Folterkammer/Blutbrunnen/Opferaltar) - allgemeine Streuung setzt nur noch Knochen (th.blood entfällt). Blutlache/Käfig/Kerzenschrein optisch überarbeitet (dunkler Kern+Glanz / 3D-Stäbe+Knochen / Sockel+mehr Kerzen+Wachs). Vergilbter Foliant (Pickup) = dicker Lederband mit Bünden + Schließe. Streckbank über ZWEI Kacheln (neues Tile RACK_R + folterbankWide/detailWide, Generator setzt RACK+RACK_R). Alles browser-verifiziert; Krypta lädt fehlerfrei.
- NOCH OFFEN aus der Art-Liste (in TODO.md, eigene Runde): Bücherregal-Zustände leer/voll/geleert, Bücher als seltene 10x-Schriftrollen, begehbare Türen/Zellen ohne Ladebildschirm.
- Runde 50 Forts. (restliche Art-Liste): Bücherregale mit drei Zuständen voll/durchsucht(geleert)/leer als eigene Tiles SHELF_GELEERT/SHELF_LEER. Durchsuchen setzt das Regal sichtbar auf "durchsucht" (leereRegal swap + refreshTile); 25% der Bibliotheksregale stehen von Anfang an leer (Deko). Zustand bleibt über Speichern/Laden: in loadAreaObjects werden gemerkte Regal-Flags VOR dem Zeichnen auf die Karte angewandt. Bücher SIND jetzt seltene Schriftrollen mit 10 Anwendungen (BUCH_ZAUBER in balancing.ts: Gewitter/Eisregen/Feuerwand/Feuerwalze/Windstoß/Heiliges Licht), 18% Fund beim Stöbern, rarity 2, stack 10. Browser-verifiziert (drei Regal-Zustände rendern klar unterschiedlich).
- Runde 50, "Türen/Zellen begehbar, kein Laden" - gewählte Lesart (OFFENE-FRAGEN.md Nr. 12): als begehbare ZELLE in der Folterkammer umgesetzt. Neues Tile ZELLENTOR (NICHT solide), gezeichnet als zur Seite aufgeschwungenes Gittertor; in der Folterkammer trennt eine Gitterreihe (CAGE) mit einem ZELLENTOR in der Mitte einen Zellenstreifen ab, dahinter die seltene Truhe - man geht durch das Tor hinein, kein goArea/Ladebildschirm. Browser/Logik-verifiziert (ZELLENTOR solid=false, Crypt-Ebenen 1/3/4 laden fehlerfrei, Tor rendert als offene Tür). Falls die normalen Kammertüren gemeint waren: in OFFENE-FRAGEN vermerkt.
- Runde 50 Forts. (Folterkammer-Ausbau): Zwei neue Folterinstrument-Tiles - Eiserne Jungfrau (IRONMAIDEN, Stachelsarg mit Blut am Fuß) und Kohlebecken (KOHLEBECKEN, Glutschale auf Dreifuß mit zwei glühenden Brandeisen, plus ein torches-Eintrag für warmes Glut-Licht). Beide solide STANDING_OBJECTS. In die Folterkammer eingebaut (Jungfrau bottom-left, Becken bottom-right an den Wänden), Blut von 4 auf 8 Spritzer erhöht. Damit erfüllt der Raum den Listenpunkt "Folterkammer mit Instrumenten + mehr Blut". Browser-verifiziert (Instrumente rendern isoliert korrekt; Folterkammer in crypt1 zeigt Jungfrau/Streckbank/Becken-Glut/Zelle/Käfige/Blut zusammen, 0 Fehler). NICHT umgesetzt: ein baulich ABGETRENNTER Trakt (eigener Gang -> mehrere Zellen -> Instrumentenraum) - das bleibt als optionaler größerer Layout-Schritt offen (OFFENE-FRAGEN Nr. 12b).
- Runde 50 Forts. (Folterkammer-TRAKT, vorher OFFENE-FRAGEN 12b): Folterkammer ist jetzt ein abgegrenzter Trakt statt eines Einzelraums. Layout um die Raum-Mitte (Gang-Spalte = r.cx, Eingangsreihe E = r.cy): Eingangsgang quer (carve X..X+6 bei E, verbindet beide Seiten an die Dungeon-Korridore), Instrumentenraum oben (E-4..E-1: Eiserne Jungfrau, 2-Kachel-Streckbank, Kohlebecken+Glut, 8 Blutspritzer), Gefängnisgang unten (Spalte X+3, E+1..E+5) mit 4 begehbaren Zellen links/rechts (je 1 Kachel Inneres + ZELLENTOR-Gate), Truhe in Zelle 0, gefangenes Wesen in Zelle 3. Guard: nur bauen, wenn Footprint (7x10) komplett auf der Karte liegt UND keine Treppe enthält, sonst Fallback = einzelne Folterkammer. Reachability über die bestehende areagen.test (40 Seeds x Ebene 1-3, prüft Spezialräume UND Truhen) bestätigt: der quer durchlaufende Eingangsgang an E=r.cy garantiert, dass der Dungeon-Korridor (zielt auf r.cx,r.cy) immer auf Trakt-Boden trifft; die Zellen-Truhe ist durch das ZELLENTOR erreichbar. Browser-verifiziert (rendert in crypt1).

## Runde 51 (Autorwünsche: Reitszene weg, Kirche/Abstieg, Sounds)

- Reitszene/Pferd-Eröffnung KOMPLETT entfernt (Autorwunsch, Pferd+Reiter sahen schlecht aus, erzwungener Ritt fühlte sich nicht gut an): reitIntro-Flag, reitPferd-Sprite, updateReitIntro (Auto-Lauf), skipReitIntro/endeReitIntro + Hinweis, Pferd-Render-Zweig - alles raus. Es bleibt der ruhige Titel-Einblender; der Held ist von Anfang an frei steuerbar und läuft selbst durch den Wald. Verifiziert (neues Spiel: keine Auto-Bewegung, kein Pferd). Die Hof-Pferde (Deko-Vierbeiner am Gatter) habe ich VORERST GELASSEN - offene Frage, ob die auch weg sollen.
- Kirche-Gras-Glitch: Stehobjekte (Bänke) nahmen draußen-'gras' als Untergrund, weil die Kirche nicht 'innen'/'dark' ist. Neues Feld AreaData.bodenName erzwingt den Untergrund; Kirche = 'krypta_boden' (Stein), passend zu ihren Bodenkacheln. Verifiziert (Boden jetzt Stein statt Gras).
- Kirchenabstieg = SCHMALE Treppe (Autorwunsch "schmal wie der Prolog-Gang"): starteProlog übergibt jetzt schmal:true an Treppenabstieg (die Szene konnte das schon). Verifiziert.
- Sound-Überlappung (Autorbericht "Sounds überlappen beim Übergang"): musik_intro/musik_kirche standen NICHT in der 'wechselbar'-Liste und dröhnten so in jedes Folgegebiet weiter (überlagerten Ambiente/Prolog). Jetzt ersetzbar; ein Gebiet ohne eigene Musik (Kirche) stoppt die Eröffnungsmusik. Verifiziert (in der Kirche keine Intro-Musik mehr).
- Nahtlose Prolog-Übergänge: alle Prolog-Szenen blenden jetzt beim Start aus Schwarz ein (fadeIn) - vorher harter Schnitt nach dem Ausblenden der Vorszene. Treppenabstieg 500ms, übrige 400ms, PrologRaum-Basis deckt LangerGang/PlattenPfad/Geheimwand. Verifiziert.
- OFFEN/Autor-Design (NICHT gebaut, er überlegt noch): die NEUE Eröffnung statt der Reitszene - Held kommt im Dorf an, wird irgendwohin geschickt, bekommt erklärt wie es läuft, kann etwas Gold verdienen (funktionierende Dorf-Wirtschaft). Großes Feature, wartet auf sein Konzept (Notiz in OFFENE-FRAGEN.md).
- Runde 51 Forts. (Bloom + Tiere): Bloom/Leuchten von An/Aus-Schalter (postFx) auf REGLER (settings.bloom 0-100) umgestellt, Standard 0 = AUS (Autorkritik "zu stark"); Regler steuert die addBloom-strength (0..1,0 statt fest 1,1); Migration bloomV setzt auch Altstände auf 0. Pferd/Kuh-Grafik verbessert: QuadSpec um mane/horns/snout/longHead/longTail erweitert - Pferd mit Mähne/langer Schnauze/Schweif, Kuh mit Hörnern/rosa Maul/Flecken. Hoftiere bleiben (Autor: "Hoftiere bleiben auf jeden Fall"). Raben sind bereits drin (baueRaben). Offen/Autor-Idee: evtl. mehr Schweine/Hühner - er war selbst unsicher, daher Anzahl vorerst unverändert.

- Runde 51 Forts. (Waldschauplätze + See + Goldhöhlen-Eingang, Autorwunsch): Neuer Helfer waldLichtung() legt Lichtungen auf der platzreicheren Seite des mäandernden Waldpfads an (sonst läuft der Weg hinein) und verbindet sie über einen Stich. Drei Schauplätze im Dunkelwald: WALDSEE (Wasserfläche mit Grasufer, Ufer-Tiefe automatisch vom Renderer), PESTGRUBE (verbrannte Erde + 3 Grabhügel, Pest-Stimmung des Schwarzen Todes), GOLDHÖHLEN-EINGANG (Höhlenmaul = STAIR, Felsrahmen). Neue Gebiet-Funktion buildGoldmine(): dunkle Höhle mit drei verbundenen Kavernen, Goldadern (T.ORE) in den Felswänden, die beim Abbauen GOLD statt Eisen geben (mine() um 'gold' erweitert: 5-12 Gold, Münz-Sound), dünn bewacht (1 Skelett + 2 Ratten, Tiefe 1), eine Truhe, Aufgang (STAIRUP) zurück ans Höhlenmaul. Übergänge in WorldScene: STAIR im Wald -> goldmine; STAIRUP in goldmine -> Wald an den special-Marker 'goldmine'. Verifiziert per Logik-Test (je 12 Seeds): See/Pestgrube/Höhlenmaul erreichbar + Labels; in der Höhle jede Goldader vom Boden abbaubar, Truhe + Wachen + Aufgang erreichbar. Live-Screenshot in dieser Umgebung nicht möglich (Dev-Server wird sekundenschnell beendet); genutzte Renderer (Wasser-Ufer, Erzader, Treppen, Fackel-Licht, Labels) sind aus früheren Runden bereits browser-verifiziert. OFFEN: Fischer am See; große Goldmine als eigenes Level.

- Runde 51 Forts. (Held vs. Arbeiter beim Abbauen, Autorentscheid "Held sichert, Bewohner schürfen"): Die Goldader in der Goldhöhle gibt jetzt GOLDERZ ins Dorf-Lager statt Sofort-Gold in die Heldentasche (Golderz ist kein Geld - es muss eingeschmolzen werden, Autorpunkt). Neue Daten in wirtschaft.ts: GOLD_SCHMELZE (golderz->Gold, proErz 10, menge 4/Tag) + pure Helfer goldSchmelzen(lager) (testbar). Im Tagestakt (wirtschaftsTick -> schmelzeGold) macht der Schmied das Golderz zu GOLD in die DORFKASSE - damit zahlt das Dorf die Abgaben an den Fürsten (Kreis geschlossen: Held sichert Höhle + bricht kleine Mengen Golderz heraus -> Dorf-Lager -> Schmelze -> Dorfkasse -> Abgabe). mine() nimmt statt 'gold' jetzt 'golderz' (1-2 ins Lager, kein p.gold, kein Münz-Ton). Held-Erklärung 1s vs 1 Tag: verschiedene MASSSTÄBE (ein Schlag = ein Stamm/Brocken nebenbei; ein Arbeitstag = ein ganzer Stapel) - der Held SICHERT die Stätten (Kampf), die Bewohner PRODUZIEREN täglich ins Lager. Verifiziert per Unit-Test (goldschmelze.test.ts: Tagesdeckel, Teilmengen, Mehrtages-Vorrat vollständig zu Gold). NOCH OFFEN (nächster Schritt, im Backlog): das "Sichern" als echte Mechanik (geräumte Stätte -> Arbeiter produzieren / höhere Tagesproduktion), verknüpft mit den Anfangsquests.

- Runde 51 Forts. (Gold = Bergregal des Fürsten + sichern->Produktion, Autorkorrektur "Gold wird nicht im Dorf verarbeitet, wie war das früher"): Historisch korrekt - Gold schmelzen/prägen war im 14. Jh. ein REGAL des Landesherrn (Bergregal/Münzregal), ein Dorf durfte das nicht; Eisen dagegen wurde lokal verhüttet und der Dorfschmied schmiedete daraus Waffen/Werkzeug. Daher: die zuvor gebaute Dorf-Gold-Schmelze (GOLD_SCHMELZE/goldSchmelzen) WIEDER ENTFERNT. Stattdessen: Golderz aus der Goldhöhle geht als ABGABE an den Fürsten - bei der Abgabe deckt Golderz zuerst die Goldschuld (golderzFuerAbgabe, GOLDERZ_WERT 10/Klumpen, der Fürst prägt es), der Rest aus der Dorfkasse. Sichern->Produktion: fällt die letzte Wache in der Goldhöhle (onEnemyKilled), wird flags.goldmineGesichert gesetzt; ab dann fördern die Knappen täglich GOLDERZ_PRO_TAG (2) Golderz ins Dorf-Lager (wirtschaftsTick). Der Held SICHERT also die Stätte (Kampf) + bricht kleine Mengen nebenbei, die Bewohner PRODUZIEREN täglich. Verifiziert per Unit-Test (golderz_abgabe.test.ts: Teildeckung, Volldeckung mit minimalem Erzverbrauch, kein Erz, keine Schuld). NOCH OFFEN (Autor entscheidet): die Eisen->Barren->Waffe-Kette schließen - der Dorf-Schmelze-Barren ist noch ungenutzt, der Schmied verbessert Waffen aktuell aus rohem Eisen+Kohle.

- Runde 51 Forts. (Eisen-Kette geschlossen, Autorentscheid "historisch korrekt, also Barren"): Historisch wurde Eisenerz lokal verhüttet (Erz -> Stabeisen/Barren) und der Dorfschmied schmiedete daraus Waffen - im Gegensatz zu Gold (Regal des Fürsten). Daher schmiedet der Schmied jetzt aus EISENBARREN statt aus rohem Eisen+Kohle: SCHMIEDE_UPGRADE.eisenProStufe/kohleProStufe -> barrenProStufe [1,2,3]. Die Barren liegen im DORF-LAGER (die Dorf-Schmelze erzeugt sie aus Eisen+Kohle, Phase 2) - shop.ts forge() zieht sie von dort ab (neue lager-Callback an die ShopUI, in WorldScene this.shop.lager = () => this.dorfLager). Damit hängt die Helden-Waffenstärke an der Dorfwirtschaft (Bewohner verhütten, Held nutzt + kämpft). Der Schmied-Dialog zeigt den Barren-Bestand; die Schmiede-Zeile zeigt "N Eisenbarren (Dorf-Lager: M)". Neuer Held-Hebel: beim Schmied "Eisen & Kohle für die Schmelze stiften" (stifteSchmelze) bringt bis zu 8 Eisen + 4 Kohle ins Dorf-Lager, die die Schmelze über die Tage zu Barren macht - so kann der Held den Nachschub beschleunigen, ohne selbst zu verhütten. Verifiziert: tsc sauber, 112 Tests grün inkl. Ketten-Regressionstest (eisenkette.test.ts: VERARBEITUNG.schmelze.aus==='barren' == was der Schmied braucht). Live-Screenshot/Schmied-UI-Interaktion in dieser Umgebung NICHT verifizierbar (Dev-Server wird sekundenschnell beendet) - die genutzte Shop-UI ist aus früheren Runden bereits abgenommen, neu ist nur die Material-Quelle (Lager statt p.materials).

- Runde 51 Forts. (Hauptmenü-Skalierung kaputt, Autorbug mit Screenshot "Titelbild rechts, Knöpfe abgeschnitten"): TitleScene baute sein Layout EINMAL in create() aus this.scale.width/height und reagierte - anders als WorldScene - NICHT auf Größenänderungen. Wurde das Fenster danach schmaler (oder kam create() bei einer anderen Größe), blieb das Layout für die alte, breitere Größe stehen -> Titelbild/Titel/Knöpfe nach rechts verschoben und am rechten Rand abgeschnitten (genau das Screenshot-Symptom: Layout für breiteren Canvas als der aktuelle). Fix: alle sichtbaren Elemente in EINEN Container, neue Methode buildLayout() baut für die aktuelle Größe auf, this.scale.on('resize', buildLayout) baut bei jeder Änderung neu (Risiko-Checkliste 9.5: Hauptmenü ist die erlaubte Stelle für Resize-Neuaufbau), Lauscher in SHUTDOWN abgemeldet (Regel 9: globale Lauscher abmelden). Dazu: die 8 Menüknöpfe liefen unten aus dem Bild - der Knopfabstand wird jetzt aus der verfügbaren Höhe berechnet (alle passen rein), Knopfbreite und Titelbreite skalieren bei schmalen Fenstern herunter. Version-Label auf Runde 51 aktualisiert. tsc sauber, 112 Tests grün. EHRLICHE LÜCKE: kein Live-Screenshot möglich (Dev-Server wird in dieser Umgebung beim Laden sekundenschnell beendet); der Fix repliziert exakt das resize-Muster, das WorldScene im laufenden Spiel bereits bewiesen nutzt.

- Runde 51 Forts. (Dungeon-Versionen + begehbare Probe, Autorwunsch): Generator-Taxonomie festgelegt und dokumentiert (DUNGEON-VERSIONEN.md): V1 = buildCrypt (läuft aktuell), V2 = verbundene Kammern dgn2 (für die Goldmine, frühe Iteration überschrieben -> noch zu bauen), V3 = logischerDungeon.ts "geteilte Halle" (vom Autor als Version 3 GESICHERT, Header markiert, Kandidat fürs Kloster), V4 = Höhle mit begehbaren Räumen in den Hohlräumen (ZIEL, noch zu bauen - rot markierter Screenshot). DUNGEON-PROBE umgebaut: vereinheitlichte ProbeKarte (grid + solid() + farbe()) für JEDEN Generator; Modi ÜBERSICHT (ganze Karte einpassen, wie bisher) und neu BEGEHEN ("in den Dungeon einsteigen", Autorwunsch) - der Spieler läuft mit Pfeilen/WASD selbst durch, Kollision gegen Wand/Abgrund/Requisit, Ringsuche-Startpunkt. Kamera bleibt FEST (Zoom 1, Scroll 0), die Karte scrollt von Hand unter dem zentrierten Spieler durch -> die UI bleibt klickbar (vermeidet die tote-Knöpfe-bei-gescrollter-Kamera-Falle, Regel 9.4). Versions-Knöpfe V1/V3 (beide begehbar), V2/V4 folgen wenn gebaut. tsc sauber, 119 Tests grün. EHRLICHE LÜCKE: kein Live-Screenshot in dieser Umgebung möglich (Dev-Server bricht beim Laden ab) - die Lauf-/Kollisionslogik ist simpel und reines Gitter, Szenen-Felder werden in create() zurückgesetzt (Regel 9).

- Runde 51 Forts. (Schlacht-Prototyp neu, Autorspezifikation AoE + Beyond All Reason; Absturz nach dem Kampf): SchlachtProbe komplett neu auf Basis des reinen, getesteten Moduls formationen.ts. ROLLEN: Schild (vorn/schwer), Nahkampf, Bogen (hinten), Heiler (heilt statt anzugreifen) - ordnen sich per Rang selbst ein (Schild/Nahkampf vorne, Bogen/Heiler hinten). 5 FESTFORMATIONEN (Linie/Block/Keil/Locker/Schutz, Knöpfe -> formen die Auswahl am Schwerpunkt, Front zum Feind) ODER mit gedrückter rechter Maus eine eigene LINIE ziehen (Einheiten verteilen sich entlang der Strecke, Front quer zur Linie Richtung Feind, Live-Vorschau-Geisterringe). 3 BEWEGUNGSMODI: Rechtsklick = Formationsmarsch (Slots halten), Umschalt+Rechts = Direkt (lockerer Pulk, direkt zum Ziel), A+Rechts = Angriffsmarsch (Anker rückt langsam vor, hält an, sobald die Front Nahkontakt hat -> kämpft statt blind durchzurennen). KOHÄSION: der Formationsanker bewegt sich mit dem TEMPO der langsamsten Einheit und wartet, wenn der größte Nachzügler > 1,7*Abstand vom Slot weg ist (Schnelle warten auf Langsame). Auswahlrahmen + Strg-1..4-Gruppen bleiben. ABSTURZ-FIX: die Szene wird per scene.restart() in DERSELBEN Instanz neu gestartet, aber create() setzte die Felder nicht zurück -> nach dem Kampf hingen zerstörte Einheiten im Array (Regel-9-Falle). Jetzt setzt create() units/Flags/Auswahl/Grid sauber zurück; toeten() löst Gruppen-/Slot-/Ziel-Referenzen tot markierter Einheiten. tsc sauber, 119 Tests grün (Formations-Mathematik). EHRLICHE LÜCKE: das Interaktive (Maus/Formationen/Kampf) konnte ich NICHT live im Browser prüfen (Dev-Server bricht beim Laden ab, Regel 9.1 nicht erfüllbar) - die Formations-Mathematik ist unit-getestet, die Szenenlogik sorgfältig durchdacht und der Absturz-Auslöser (fehlender Reset) klar behoben.

- Runde 51 Forts. (Action-Bar-Belegungsmenü + Klassenfarben + Icons, Autorwunsch mit Screenshot): (1) KLASSENFARBEN getauscht - Krieger BLAU (0x5a86e0), Magier ROT (0xd0563a), Bogen GRÜN (0x5ac06a), in hud.ts SLOT_KAT_FARBE und panels.ts Fähigkeiten-Tab. (2) BELEGUNGS-MENÜ (Rechtsklick auf einen Slot) neu: statt einer HOHEN Liste (lief unten aus dem Bild) jetzt SPALTEN nebeneinander - Krieger · Magier · Bogen · Gegenstand, mit Trennlinien sichtbar unterteilt, je Spalte nach STUFE sortiert, mit Symbol. Klick belegt den Slot; ZIEHEN eines Eintrags auf einen beliebigen Action-Bar-Slot belegt jenen (neue slotUnter()/belege()-Helfer, popupGhost, justDragged-Guard gegen Klick/Drag-Doppelung). (3) BOGEN FEHLTE in der Auswahl: alle Bogen-Fähigkeiten (Hagel/Splitterpfeil/Durchschlag/Sprungpfeil/Fesselpfeil/Markierter Tod) und auch Heilende Hand + Hinrichtung/Rundumschlag/Sturmangriff zu AKTIONEN ergänzt; SLOT_KAT um diese erweitert. (4) ICONS überarbeitet (Autorkritik "Heilung unklar, Blocken sieht aus wie Heilung"): Blocken ⛨->🛡 (Schild ohne Kreuz), Heilung ❧->✚, Heilende Hand ✚->🤲, Markierter Tod ◎->⌖ (war doppelt mit Bannkreis ◎), Blutdurst ⚔->🩸 (war doppelt mit Angriff ⚔); konsistent in AKTIONEN (hud.ts), SKILL_ICONS (skills.ts) und SPELLS (balancing.ts). tsc sauber, 119 Tests grün. EHRLICHE LÜCKE: UI NICHT live browser-geprüft (Dev-Server bricht beim Laden ab, Regel 9.1) - besonders die Emoji-Symbole (🛡 🤲 🩸) müssen im Browser des Autors auf saubere Darstellung geprüft werden (das bereits genutzte 🧪 beweist, dass Emoji rendern). Kein voller Custom-Icon-Art-Umbau, nur Glyph-Auswahl.

- Runde 51 Forts. (V4-Höhlengenerator, Autorwunsch "weiter mit dem Höhlengenerator"): Neues reines Modul hoehlenDungeon.ts (baueHoehle) === Dungeon-Version 4. Organische Höhle per ZELLULÄREM AUTOMAT (Zufallsfüllung 55% Boden, 4 Glättungs-Iterationen, größte zusammenhängende Fläche behalten -> Diablo-1-Look). Dann eingelassene BEGEHBARE RÄUME in den Hohlräumen (Autorwunsch dgnB + Räume): an Stellen mit >=78% offenem Höhlenboden (und ohne anderen Raum daneben) wird eine Tasche freigeräumt und ein rechteckiger Insel-Raum mit Wänden + EINER Tür hineingestellt - man läuft drumherum und durch die Tür hinein, die Höhle bleibt zusammenhängend. ~9 Räume. Tile-Codes 0 Fels/1 Höhlenboden/2 Tür/3 Raumboden. In die DUNGEON-PROBE als V4 eingehängt (Standard-Version jetzt V4, Knopf "V4 Höhle", begehbar wie V1/V3 über die ProbeKarte-Abstraktion, Raumboden deutlich abgesetzt gefärbt). Verifiziert per Unit-Test (hoehlenDungeon.test.ts, 20 Läufe): alles Begehbare ist zusammenhängend erreichbar, genug Höhlenboden (>300), meist >=3 Räume mit Türen. Layout-Dump bestätigt organische Höhle + Insel-Räume. tsc sauber, 121 Tests grün. Live-Screenshot in dieser Umgebung weiterhin nicht möglich (Dev-Server bricht beim Laden ab); Generator + Begeh-Logik sind reines Gitter und getestet.

- Runde 52 (Held-Anthrazit + Action-Button gedrückt + Fähigkeiten als volle Knöpfe, Autorwunsch): (1) HELD ANTHRAZIT - Basis-Figur `spieler` und alle vier Rüstungsstufen `SPIELER_STUFEN` (stoff/leder/kette/platte) in fallbackArt.ts von Oxblut/Braun auf durchgehend dunklen Anthrazit-/Dunkelstahl-Ton umgefärbt ("wie die schwarzen Ritter aus der Schlacht-Probe"). Der Ton wird mit der Stufe heller/metallischer (stoff #2f3338 ... platte #5c626a); kette/platte zusätzlich `ritter: true` für den Ritter-Helm-Look wie die Soldaten. Leicht änderbar in einer Datei. (2) GEDRÜCKT-OPTIK der Aktionsleiste (hud.ts): Linksklick auf einen Slot zeigt den Knopf sofort 140ms lang "gedrückt" - Lichtkante wandert nach unten/rechts, Schattenkante nach oben/links, Körper dunkler, kein Schlagschatten, Symbol sinkt 1px. Neuer Parameter `pressed` in zeichne3dKnopf, Zustand über gedruecktSlot/gedruecktBis (scene.time.now). Ziehen löscht den Druck. (3) FÄHIGKEITEN-BAUM als volle Aktionsknöpfe (panels.ts buildSkillsTab): statt Text-Chips jetzt echte 3D-Knöpfe wie in der Leiste (zeichneSkillKnopf), Symbol + Stufen-Plakette + Name daneben, nach Stufe von LINKS nach RECHTS sortiert, gesperrte matt. Freigeschaltete Knöpfe sind per Drag in die Aktionsleiste ZIEHBAR (macheSkillZiehbar nutzt bestehendes onAssignToSlot -> Hud.belegeBeiPunkt, das alle belegbaren Aktions-IDs akzeptiert). Alle Vektorgrafik auf EINER Graphics-Ebene (zuerst im Container), damit Symbole/Texte/Ziehflächen darüber liegen. (4) V7-BSP-Generator (burgDungeon.ts): die obersten DREI Ebenen teilen jetzt immer (tiefe < 5 statt < 6 für den Zufalls-Abbruch) -> mindestens 8 Räume garantiert, kein seltener Zerfall in 6 Großräume (behebt einen flackernden Test an der Grenze >6). tsc sauber, 123 Tests grün, Vite-Build ok. EHRLICHE LÜCKE: UI/Held-Optik NICHT live im Browser geprüft (Dev-Server bricht in dieser Umgebung beim Laden ab, Regel 9.1) - der Autor muss die Anthrazit-Farbe, die Gedrückt-Animation und das Ziehen aus dem Fähigkeiten-Baum auf die Leiste im Browser bestätigen.

- Runde 52 Forts. (Quest-System + HUD-Alternativen + alle Fenster verschiebbar, Autorwunsch): (1) QUEST-DATENBANK src/data/quests.ts (reine Daten/Prädikate, Phaser-frei) + QUEST-LOGBUCH-LOGIK src/logic/questLog.ts: Quests mit geordneten Zielen, Status (offen/aktiv/abgeschlossen), aktuellem Ziel + Ortshinweis. Quests leiten sich aus den BESTEHENDEN Story-Flags ab (keine Umverdrahtung der Trigger), Aufgabentexte 1:1 aus journalLines (kein erfundener Inhalt). Verfolgte Quest wird automatisch gewählt (oberste aktive Hauptquest) und ist im Logbuch überstimmbar; Auswahl persistiert (localStorage 'ravensmoor_quest_verfolgt'). 10 Logbuch-Tests. (2) QUEST-VERFOLGER src/ui/questTracker.ts: halbtransparentes, frei verschiebbares Fenster oben rechts mit Titel/aktuellem Ziel/Wohin-Pfeil; zeichnet nur bei Inhaltsänderung neu (Signatur). An/aus über settings.questTrackerAn (Dev-Menü). (3) AUFGABEN-Tab ist jetzt ein hübsches Questlogbuch (Karten mit Kategorie-Akzentbalken, Häkchen-Zielen, Belohnung, VERFOLGEN-Schalter). Handwerks-Hinweise als Fußtext. (4) DREI LEBEN/MANA-STILE (settings.hudStil): 0 Kugeln rot/blau (bisher), 1 WoW-Balken (horizontal, Leben grün/rot, Mana blau, Glanz+Rahmen), 2 vertikale Kristall-Säulen (RPG, füllen von unten, Viertel-Striche). Beide Anzeigen weiterhin einzeln verschiebbar (orbHp/orbMp-Versatz). Umschalten im F10-Kasten ("LEBEN/MANA" durchschalten, "QUEST-VERFOLGER AN/AUS"). (5) ALLE FENSTER VERSCHIEBBAR (Kodex Regel 11): neuer Helfer macheFensterZiehbar() in dialog.ts (Kopf-Streifen, Schirmkoordinaten-Delta, optional persistenter Versatz). Angewandt auf Handel (shop), Lager-Truhe (stash), Dialogfenster (ui.dialog) und Figur-Editor (Abdunkler aus dem verschiebbaren Container herausgelöst, bleibt bildschirmfest). Charakterfenster/Chronik/Dev-Kasten waren schon verschiebbar. tsc sauber, 132 Tests grün, Vite-Build ok. EHRLICHE LÜCKE: gesamte UI NICHT live im Browser geprüft (Dev-Server bricht in dieser Umgebung beim Laden ab) - Quest-Verfolger-Optik, die drei Leben/Mana-Stile und das Verschieben aller Fenster muss der Autor im Browser bestätigen.

- Runde 53 (Dungeon-Editor + Formations-Ziehband, Autorwunsch): (1) DUNGEON-EDITOR in der DUNGEON-PROBE: neuer Knopf EDITOR neben ÜBERSICHT/BEGEHEN. Der Autor zeichnet eine Dungeon-Vorlage von Hand (Pinsel: Wand/Raumboden/Tür/Gang/Leer-Fels, Größe 1-3), ausgehend von der generierten Karte ("AUS GENERATOR") oder einer gespeicherten Vorlage. Werkzeuge LEEREN/RAHMEN/SPEICHERN/LADEN/BEGEHEN/EXPORT. EXPORT kopiert einen lesbaren Code-Block (VORLAGE_V<n>) in die Zwischenablage (Fallback Konsole) - der Autor schickt mir den Code, ich baue daraus einen prozeduralen Generator. Pro V-Version gespeichert (localStorage ravensmoor_dvorlage_v<n>). Reine Logik src/world/dungeonVorlage.ts (Kachel-Codes 0 Leer/1 Raum/2 Wand/3 Tür/4 Gang, vonKarte/exportiere/parse, verlustfreier Round-Trip), 8 Tests. Malen über Pointer-Events nur innerhalb der Zeichenfläche (UI-Klicks oben/unten werden durch Bereichsprüfung ignoriert). (2) SCHLACHTPROBE-FORMATION: das rechte Ziehband ersetzt die Formation nicht mehr durch eine freie Linie, sondern DREHT (Linienrichtung = Blickrichtung) und SKALIERT (Linienlänge = Größe) die AKTIVE Formation - der Keil bleibt ein Keil, wird nur breiter/gedreht. Neue reine Funktion formSlotsSkaliert() (Vorne-Hinten-Ausdehnung = Linienlänge, Form bleibt, min/max-Abstand), 2 Tests. Aktiver Formations-Knopf golden hervorgehoben; 'Linie' bleibt die klassische Reihe entlang der Strecke; Live-Vorschau zeigt die aktive Formation samt Richtungsspitze. tsc sauber, 142 Tests grün, Vite-Build ok. EHRLICHE LÜCKE: Editor-UI und Formations-Gefühl NICHT live im Browser geprüft (Dev-Server bricht in dieser Umgebung beim Laden ab) - der Autor muss Malen/Export und das Drehen/Skalieren der Formationen im Browser bestätigen.

- Runde 53 (Setting-Wechsel + Heeres-Grundlage, Autorabstimmung): (1) SETTING: Da der Autor keine Musketen will und vor ~1500 kein Schießpulver dominiert, wechselt die Zeit vom Dreißigjährigen Krieg (1635) ins 14. Jahrhundert zur Zeit des SCHWARZEN TODES (~1348-1360, Heiliges Römisches Reich, rund um den Hundertjährigen Krieg): Langbogen/Armbrust statt Musketen, Söldner/Raubritter, Pest allgegenwärtig, untoter Kreuzritter als Boss passt weiter. ACHTUNG/Folge: der Masterprompt nennt noch "1635" - das muss in einem eigenen, sorgfältigen Schritt auf das 14. Jh. umgeschrieben werden (vom Autor bestätigt, aber noch nicht im Masterprompt nachgezogen). (2) HEER-GRUNDLAGE (reine, getestete Logik, noch ohne UI): src/data/heer.ts (Standard-Ausrüstung der Zeit als Platzhalter: Falchion val 7, Gambeson val 5, Notbehelf Knüppel/Bauernkittel, Veteranen-Eigengear Reitschwert/Kettenhemd; Goldstufen mit Berufs-Pools von Gepressten bis Veteranen; Namens-/Charakterzug-Bausteine) + src/logic/heer.ts (werbeRekruten: aus Gold-Sold + Fürsten-Kiste benannte Rekruten AUTOMATISCH ausrüsten, 1:1-Verbrauch der Kiste, rollengerecht - Nahkämpfer nie Bogen und umgekehrt, schwächere Spenden werden NICHT verbraucht (kein Downgrade), Permadeath-Feld tot). Mehr Gold pro Kopf = bessere Stufe (der Fürst muss sie ja bezahlen). 10 Tests. Namen/Berufe/Werte sind Platzhalter, vom Autor zum Schluss zu überarbeiten. NÄCHSTE SCHRITTE: Fürsten-Kiste-UI (spenden), Heeresliste-Fenster (Namen/Beruf/Stufe/Ausrüstung/Status), Einbindung in die Schlacht + Figuren-Equip, dann Mine-Ästhetik (Erzadern in Höhlenwänden) und Magieresistenz der Kriegs-Monster gegen Feuerregen.

- Runde 54 (Schlacht-Elite/Riesen + Schwert-Wusch + Helden-Seitenansichten, Autorwunsch): (1) ELITE/RIESEN in der SCHLACHTPROBE: neue Typen elite/e_elite (1.35x, ~560 HP, 19-20 dmg) und troll/e_troll (2.5x, 1600 HP, 34 dmg, knockback). groesse skaliert Sprite + Auswahlring. BEFÖRDERN-Knöpfe (Reihe 1) werten die GEWÄHLTEN Einheiten auf ("→ ELITE"/"→ RIESE"), je Team die passende Variante (eigen/untot) - so wählt der Autor selbst, was Elite/Riese ist (Helms-Klamm). Leben-Verhältnis bleibt beim Befördern erhalten; Werte/Figur/Größe übernehmen den Typ. Werte als benannte Konstanten in TYP (leicht änderbar). (2) RIESEN-SCHLEUDER: beim Nahkampftreffer schleudert ein Riese alle nahen Gegner (Radius 80, Kraft 420, klingt mit exp-decay ab) radial beiseite - analog zum Hammerschlag des Helden. Rückstoß über kbX/kbY auf der Einheit, in updateUnit vor der normalen Steuerung abgearbeitet (Einheit "fliegt" und kann währenddessen nicht handeln). Riesen schleudern keine Riesen. Klang hammer_schlag + Druckwellen-Ring. (3) SCHWERT-WUSCH wie im Hauptspiel: zeichneSchwuenge übernimmt den CombatScene-Look (drei Lagen Schein/Klinge/Kern, Bogen wischt mit dem Schlag durch (sweep) und wächst beim Verblassen). Silbrig eigene, rötlich Untote; Elite/Riesen schlagen einen größeren, breiteren Bogen (gross-Flag). (4) HELDEN-SEITENANSICHTEN: drawHeld zeichnet für dir links/rechts jetzt ein echtes Profil mit Geh-Zyklus (schmaler, leicht nach vorn geneigter Rumpf; nahes + ferneres dunkleres Bein/Arm, gegenläufig schwingend; Stiefelspitzen in Laufrichtung; Umhang weht nach hinten) statt der Frontfigur. Front (unten) und Rücken (oben) unverändert. Gilt für alle vier Stufen samt Kettengitter + Farb-Überschreibungen. DIESMAL VISUELL GEPRÜFT: Wegwerf-Harness (Vite-IIFE-Build + Playwright-Screenshot über die im Container vorhandene Chromium-Binärdatei /opt/pw-browsers) zeigt 4x4 Posen je Stufe - die Seitenansichten sind klar gerichtet und animiert (Harness nach der Prüfung wieder entfernt, nicht eingecheckt). tsc sauber, 172 Tests grün, Vite-Build ok. OFFEN für den Autor: Spielgefühl im echten Spiel (Tempo der Schleuder, Größe der Riesen, Wusch-Intensität) und die Seitenansicht in Bewegung im Browser bestätigen.

- Runde 54 Forts. (Schlacht-KI, Formationen, Helden-Animationen): (1) AGGRESSIV ohne Leine: willEngagieren (kampfKi.ts) lässt aggressive Einheiten jeden Gegner in Sicht (420) verfolgen, ohne Bindung an den Formations-Slot - vorher rückten Bogenschützen nie in Schussreichweite vor und standen herum. verteidigen behält die kurze Leine (130), halten bleibt am Slot. naechsterFeind-Sicht auf 440. Lose aggressive Einheiten rücken bei freiem Feld zur Feindmitte vor. (2) DREI HISTORISCHE FORMATIONEN (14. Jh.): schiltron (Speer-Ring gegen Reiterei, Bannockburn), bogenfluegel (Langbogen-Flügel-V, Crécy/Azincourt), kolonne (tiefe Marschkolonne). UI in drei Reihen (FORMATION/HALTUNG+BEFÖRDERN/BAU). Slot-Mathematik rein+getestet. (3) RING-FARBEN vereinheitlicht: Schützen (Rang>=2) golden, Nahkampf Team-Farbe - gleich wie die Formationsvorschau (Autorfrage). (4) SEITENANSICHT-PROFILGESICHT: ein Auge + Nase statt Frontaugen (Autorbug). (5) ACHT RICHTUNGEN + SCHWERTSCHLAG: drawHeld 8 Richtungen (Diagonalen) x 5 Frames (4=Schlag); Vorder-Diagonalen 3/4-Frontgesicht, reine Seiten Profil, Rück-Diagonalen Haube. angleToDir8; SpriteProvider bäckt 8x5; Schlagpose (schlagArm greift in Schlagrichtung) bei meleeArcAttack 0,2s/0,32s, Swoosh bleibt die Klinge. Gegner/NPCs unverändert bei 4 Richtungen. Figur-Editor dreht durch alle 8. Visuell via Playwright-Harness geprüft. tsc sauber, 173 Tests grün, Build ok. OFFEN: Spielgefühl (Vorrücken/Schussreichweite, Formations-Nutzen, 8-Richtungs-Lauf + Schlagauslösung) im echten Spiel bestätigen - Dev-Server hält im Sandkasten nicht.

- Runde 54 Forts.2 (Schlagpose-Vollständigkeit + Riesen-Figur): (1) Die Helden-Schlagpose feuert jetzt bei JEDEM Nahkampf-Schwung (Normalhieb, Hellebarden-Stoß, Rundumschlag, Wuchtschlag, Blutdurst) - zentral in playSwingSound gesetzt, das alle Schwünge durchlaufen (Kodex Regel 10 Vollständigkeit). Finisher/schwer 0,3s, leicht 0,2s. (2) Riesen/Trolle in der Schlacht haben eine EIGENE Hünen-Figur statt hochskalierter Soldaten: neues massig-Flag in FigureSpec (breite Schulterwülste, breiter Brustkorb, dicke lange Arme, Hauer). FIGURES.riese (grünhäutig, Keule) und FIGURES.untoter_riese (fahl-grau, glimmende Augen); TYP.troll/e_troll nutzen sie (weiter 2,5x skaliert). Visuell via Playwright-Harness geprüft. tsc sauber, 173 Tests grün, Build ok.

- Runde 54 Forts.3 (Mehrphasen-Schwung + Waffe in der Hand): Der Helden-Schlag ist jetzt eine echte Animation, die dem Swoosh folgt - DREI Phasen (Ausholen/Treffer/Ausschwung) statt einer Streck-Pose, in CombatScene über die Restzeit durchlaufen (~55-65ms/Phase, so schnell wie der Swoosh). Held-Atlas daher 8x7. schlagArm hat einen ELLENBOGEN (Oberarm+Unterarm, gewinkelt, Hand schwingt durch den Bogen). Die AUSGERÜSTETE Waffe (Schwert/Axt/Kolben/Stange/Wucht/Stab) liegt beim Gehen in der Hand und wird beim Schlag mitgeschwungen; eigener Atlas je Waffe (held_<tier>_<waffe>), lazy gebacken, invalidateHeld frischt alle auf. Profil-Nase auf einen kleinen Höcker gekürzt (Autorwunsch). Visuell via Playwright-Harness geprüft. tsc sauber, 173 Tests grün, Build ok. OFFEN: im echten Spiel bestätigen, dass Schwung-Tempo + Waffe-in-Hand sich gut anfühlen.

- Runde 54 Forts.4 (Schlag-Überarbeitung + Klingen-Schweif + Formationen): (1) SCHLAGARM mit 2-Knochen-IK (ik2): Ellenbogen knickt natürlich, Arm streckt sich durch den Treffer (Hand nah beim Ausholen -> gestreckt beim Treffer -> wieder gebeugt beim Ausschwung); Ellenbogen-Seite über face links/rechts gespiegelt (Autorwunsch "linke Animation spiegeln"); Klinge folgt dem Unterarm. (2) KLINGEN-SCHWEIF (klingenSpur): blau-weißer, verblassender Bogen hinter der Klinge - "Nachziehen der Waffe", zusätzlich zum Swoosh. (3) SCHWUNG-RICHTUNG (SCHLAG_SENSE): links/oben unten->oben, rechts/unten oben->unten. (4) KEIN ZELLEN-ÜBERLAUF mehr: jede Atlas-Zelle wird beim Backen geclippt; Schwung kompakter + Waffen gekürzt, damit nichts abgeschnitten wird/in Nachbar-Frames blutet. (5) FORMATIONEN: Einheiten in einer Formation brechen nicht mehr einzeln aus (das zerriss die Formation), sondern halten den Slot und rücken als BLOCK vor (lenkeAggressiveVerbaende); lose Einheiten stürmen weiter. Der Block rückt vor, bis die NAHKAMPF-Front Kontakt hat (Schützen schießen über die Linie), statt schon auf 210px Schussreichweite zu stoppen. Alles visuell (Playwright) bzw. via tsc/Tests geprüft; 173 Tests grün. OFFEN: Schlag-/Formations-Gefühl im echten Spiel bestätigen.

- Runde 55 (Figur-Stil parkiert + Schatten-Technik Slembcke SFSS bewertet, Autorabstimmung): (1) FIGUR-STIL-ENTSCHEIDUNG (A Detail-fuer-alle vs B Held-auf-Robenfiguren-vereinfachen) bleibt bewusst OFFEN/PARKIERT - der Autor hat genug Beispiele gesammelt (Skelett/Buerger/Pest-Opfer/Lebender Toter im Held-Detailstil, F10-Viewer), entscheidet aber noch nicht: die Detail-Figuren wirken auf ihn eher COMIC als ernster Grusel. FOLGE: detaillierte Charakter-Kunst/-Animation wird ans ENDE (finales Polishing) verschoben - gefahrlos, weil das Figurensystem modular ist (Rigg + Skin) und KEINE Spiellogik an der Detailgrafik haengt. Bis dahin laufen die einfachen Figuren weiter. (2) SCHATTEN: Slembcke "Super Fast Soft Shadows" (SFSS) geprueft - es ist die Referenz fuer weiche 2D-Schatten (projiziert Verdecker-Kanten TANGENTIAL an eine endlich grosse Lichtquelle -> echter Halbschatten/Penumbra, Arbeit fast nur im Vertex-Shader, sehr schnell). ABER: reine WebGL/Shader-Technik (kein Canvas-Fallback), braeuchte eine eigene Phaser-WebGL-Pipeline + GLSL-Port + Verdecker als Liniensegmente. (3) BEFUND/RICHTUNG: Wir haben mit LightingManager (dunkle RenderTexture + weiche ERASE-Lichtloecher) bereits die halbe Miete - was fehlt, ist VERDECKUNG (Licht geht aktuell durch Waende). Der staerkste Hebel fuer "ernsten Grusel" ist nicht weiche Penumbra, sondern Dunkelheit + gerichtetes Fackel-/Sonnenlicht + Schlagschatten HINTER Objekten. Plan: nicht jetzt SFSS, sondern zuerst die bereits prototypisierte MANUELLE Verdeckung (DebugArena) in den Live-LightingManager integrieren - dependency-frei auf Canvas UND WebGL, weiche Kanten per Blur faelschbar, mit Performance-Regler. SFSS bleibt als dokumentierte WebGL-Polishing-Option fuer spaeter (siehe OFFENE-FRAGEN.md Nr.16).

- Runde 55 Forts. (Roben-Skala, Elementarpfeile, Leben-Regler, Raycasting-Schatten - Autorwünsche): (1) EINFACHE ROBEN-FIGUR (Dev-Umschalter) war "viel zu groß" - Skala von 1.5 auf 1.15 gesenkt (32px-Figur, normale Gegner laufen bei 1.0), leicht änderbar in zeichneHeld. (2) ELEMENTARPFEILE: Befund - die gefasste Elementwirkung (Detektion via weaponGem pro Schuss) ist STABIL, Pfeile werden NICHT als Munition verbraucht (p.arrows wird nirgends dekrementiert, "Keine Pfeile mehr"-Text ist tot). Der echte Mangel: der fliegende Pfeil wurde IMMER als schlichter Holzpfeil gezeichnet (pr.arrow-Zweig zuerst), d.h. der gesockelte Effekt war im Flug unsichtbar. Fix: Elementarpfeile glühen jetzt durchgehend in ihrer Farbe (Frost BLAU 0x6ac8ec, Feuer orange 0xf0842a, Schatten violett 0xb06ae8) - weicher Schein + helle Element-Spitze - plus ein leichter Partikel-Schweif (Frost Eissplitter, Feuer Glut, Schatten violette Funken; jeder ~2. Frame, über fx.burst, günstig). Damit erfüllt: "Frost blau + Frosteffekt", "Feuerpfeile Feuereffekt". (3) SCHLACHTPROBE: Leben-Regler (LEBEN -/x/+ in der Befördern-Reihe), Multiplikator x0.5..x5 in 0.5-Schritten, wirkt SOFORT auf alle vorhandenen Einheiten (Verhältnis hp/maxhp bleibt) und auf neue; persistiert über NEU. (4) RAYCASTING-SCHATTEN: NEIN, der Forum-Faden (phaser-raycaster) wurde bisher NICHT genutzt - DebugArena nutzt manuelle Keil-Verdeckung. Neue eigene Debug-Map StrahlenProbe ("STRAHLEN-SCHATTEN" im Titelmenü) zeigt die Faden-Technik plugin-frei: vom Licht Strahlen auf alle Hindernis-Ecken (+/- Mini-Winkel), nächster Treffer je Strahl -> Sicht-Polygon, ringsum Dunkelheit per RenderTexture-Erase ausgestanzt -> SCHARFE Schatten. Maus bewegt Licht, M Maus-Folgen, R Strahlen zeigen, +/- Reichweite. VISUELL VERIFIZIERT (Playwright/Chromium, /tmp/ray1+ray2.png): Schatten fallen korrekt hinter alle Kästen, Strahlenfächer sichtbar, keine Konsolenfehler. tsc sauber. Erkenntnis fürs Live-Spiel: scharfe Raycasting-Schatten sind günstig und exakt - für "ernsten Grusel" evtl. mit leichter Kantenunschärfe kombinieren; SFSS (weiche Schatten) bleibt die WebGL-Option fürs Polishing.

- Runde 55 Forts.2 (Grusel-Schatten mit echten Figuren, Held-Skala 0.9, Live-Grusel-Tint - Autorwünsche): (1) HELD-SKALA: alle vier Stufen in heldForm.ts defaults() auf skala 0.9 gesetzt (Autor: "überall auf 0,9 hochgestellt, bitte übernehmen"; vorher 0.8/0.6). (2) GRUSEL-SCHATTEN-PROBE (vormals nur graue Kästen) komplett ausgebaut: echter Held (per RÜSTUNG-Knopf Stoff/Leder/Kette/Platte durchschaltbar - der Rüstungswechsel ist im Bild SICHTBAR, also funktioniert das Tier-System), echte Monster (Skelett, Pest-Opfer via SpriteProvider), Dungeon-Boden + Wände als Schattenwerfer. Wand-Schatten per Raycasting-Sichtpolygon (scharf), Figuren werfen zusätzlich einen weichen Boden-Schlagschatten vom Licht weg, Held trägt eine Fackel (Licht folgt ihm, WASD-steuerbar -> "wie es sich spielt"). Skelett mit Blutlache + Spritzern + Fleischresten gezeichnet. GRUSEL-REGLER (ziehbarer Schieber): steuert Dunkelheit + Fackelgröße (mehr Grusel = engerer Lichtkreis) + Vignette + KALTEN/DUNKLEN Tint auf den Figuren + kranke Unter-Glut (Pest grünlich, Skelett dunkelrot). Visuell verifiziert (Playwright /tmp/g_low+g_high+g_platte.png): niedrig = warme Fackel, hoch = enge, dunkle, gruselige Stimmung; Rüstung Platte ist deutlich heller/stählerner als Kette. (3) LIVE INS SPIEL: neues Setting grusel (0-100), F10-Schalter "GRUSEL-ATMOSPHÄRE (Gegner)" stuft 0/33/66/100%; in CombatScene.renderEntities bekommen alle Gegner (nicht der Held) einen kalten Multiplikations-Tint (Richtung 0x5a6274). Verifiziert in der DebugArena (echter Kampf, /tmp/live_off+live_on.png): bei 80% sind Skelette/Pest spürbar dunkler/kälter. So kann der Autor den Grusel-Trick im echten Spiel testen, ohne dass eine Figur neu gezeichnet werden muss. tsc sauber. OFFEN: ob der Tint allein reicht oder ob die volle Dunkelheit+Raycasting auch in die WorldScene/DebugArena soll (größerer Schritt) - siehe OFFENE-FRAGEN Nr.18.

- Runde 55 Forts.3 (Schatten LIVE ins Spiel - beide Modi, Autorwunsch "Strahlen-Schatten einbringen, Gebäude werfen Schatten"): (1) GETEILTE ENGINE schatten.ts (reine Mathe, 8 Tests) + neue Klasse SchattenManager (src/systems/SchattenManager.ts) mit BEIDEN Modi: sonne() = parallele Tag-Schlagschatten per Projektion (billig, für Stadt/Freiland), fackel() = Dungeon-Punktlicht mit Raycasting-Sichtpolygon (scharfe Schatten). Kamera-Transform (Folgen/Zoom) intern berücksichtigt. Stärke 0..1 aus dem Regler. (2) WICHTIGE ERKENNTNIS: Licht und Schatten sind im Top-Down ZWEI Mechanismen - Punktlicht (Fackel) = Raycasting, Sonne (Tag) = Projektion. Raycasting kostet quadratisch mit der Zahl der Kanten -> für eine ganze Stadt mit vielen Lichtern zu teuer; deshalb Tag-Schatten per Projektion (skaliert, statisch vorberechenbar). (3) DEBUGARENA: alten Schatten-Prototyp durch den Manager ersetzt; Fackel-Modus mit echtem Held + echten Gegnern VISUELL VERIFIZIERT (/tmp/s_fackel.png - scharfe Schatten hinter Säulen/Gebäuden), Sonnenmodus läuft (auf dem dunklen Dungeon-Boden naturgemäß dezent - Sonnenschatten gehören aufs helle Freiland). (4) WORLDSCENE (Autor-Headline "Gebäude werfen Schatten"): aktualisiereSchatten() zeichnet im FREIEN am TAG Schlagschatten für alle 21 Gebäude (Grundriss aus hausBilder, Höhe = Bildhöhe -> langer Schatten) + NPCs + Gegner + Held; Richtung/Länge aus this.tageszeit (morgens/abends lang, mittags kurz); in Innenräumen/Dunkelheit/Nacht aus. Manager je Gebiet neu aufgebaut (robust gegen unloadAreaObjects), Schatten-Ebene Tiefe -7 (über Boden -10, unter Figuren). VISUELL VERIFIZIERT im Dorf (/tmp/w_clip.png: Held/Anschlagbrett/Brunnen werfen klare gerichtete Schatten; 21 Gebäude-Occluder aktiv). (5) LEISTUNGSREGLER: Setting schatten (0-100, Standard 70) + Schieberegler in den Einstellungen ("Schatten / Licht-Stärke, 0 = aus, spart Leistung"). tsc sauber, 181 Tests grün. OFFEN (Nr.19): Bäume werfen noch keinen Schatten (nur Gebäude/Figuren); Dungeon-Fackel-Schatten in den echten Krypta-Szenen noch nicht verdrahtet (DebugArena ja); Feinschliff von Schattenstärke/-länge/Weichheit nach Autor-Sichtung.

- Runde 55 Forts.4 (Echte weiche Dungeon-Schatten, Autorwunsch "weiche Überläufe sind muss"): Die Fackel ist jetzt KEIN Punktlicht mehr, sondern eine kleine FLÄCHENlichtquelle: in SchattenManager.fackel() wird sie von 6 Punkten auf einer Scheibe (RING, Radius = Weichheit) abgetastet, je Abtastung ein Sichtpolygon mit Teil-Deckkraft (0.46, multiplikatives ERASE) ausgestanzt. Wo ALLE 6 hinsehen -> voll hell; wo nur einige -> Halbschatten-Verlauf, der mit dem Abstand vom Objekt breiter wird (physikalisch korrekter Penumbra, nicht nur ein gleichmäßiger Weichzeichner). Darüber ein GPU-Weichzeichner (rt.postFX.addBlur, WebGL; Canvas-Fallback = härtere Kanten) glättet die 6 Abtaststufen zu sauberen Überläufen. Weichheit über den Parameter `weich` (Standard 0.7) = Radius der Lichtquelle + Blur-Stärke - an EINER Stelle justierbar. VISUELL VERIFIZIERT (DebugArena Fackel, /tmp/f_soft.png): warmer Lichtkreis mit weichem Abfall, weiche Schatten statt harter Keile. Kosten: 6 Sichtpolygone/Frame je Licht (für den Dungeon mit wenigen Verdeckern ok; bei vielen Verdeckern später nach Lichtnähe cullen). tsc sauber, 181 Tests grün. OFFEN: Schatten-KONTRAST/Stärke nach Autor-Sichtung feintunen (aktuell eher dezent-weich); dieselbe Weichheit optional auch auf die Tag-/Sonnenschatten legen.

- Runde 55 Forts.5 (Licht-Test-Werkbank + Stadtschatten besser, Autorwunsch "alle Varianten per Regler, Fackel besser, Feuer besser, Sichtradius am Helden, Stadtschatten schlecht"): (1) SchattenManager auf MEHRERE Lichter umgebaut: neue Methode lichter(Licht[], dyn, staerke). Jedes Licht ist 'fackel' (Flächenlicht -> echte weiche Schatten per Raycasting + Feuerschein + animierte Flamme) ODER 'sicht' (weicher persönlicher Lichtradius um den Helden OHNE Schattenwurf = der "Sichtradius", wie früher das getragene Licht, nur ohne Fackel-Objekt in der Hand). Emitter verdeckt sich nicht selbst (Occluder < 16px vom Licht werden ignoriert). (2) DEBUGARENA LICHT-TEST-PANEL (rechts, Regler + Schalter): Varianten-Wahl (5: Nur Sichtradius / Nur Wandfackel / Wandfackel+Sicht / Mehrere Fackeln+Sicht / Licht am Helden alt), Schalter Held-Licht an/aus, Regler Sichtradius (40-240), Schalter Feuer-Stil neu/alt, Regler Weichheit (0-100), Schalter Dungeon-Dunkel (X). Labels reaktiv je Frame. Drei feste Wandfackeln im Raum, neuer Halter (Stab+Eisenband+Korb+Glut). (3) FEUER besser: Stil 'neu' = geschichtete Glut (tiefrot->orange->hellgelb) + lebhaftes Flackern + gezeichnete, züngelnde FLAMME (Tropfenform, flackernde Höhe, seitliches Wehen); Stil 'alt' = der schlichte warme Kreis zum Vergleichen. (4) STADTSCHATTEN besser (Autor "absolut unzufrieden"): GPU-Weichzeichner auf der Sonnen-Schatten-Ebene (weiche statt harter Blob-Kanten), dunkler-kühl 0x08080f Alpha 0.42, kürzere Längen, nur dezenter Kontaktschatten am Fuß (kein dicker Erdungs-Klecks mehr). VISUELL VERIFIZIERT (Playwright): /tmp/lit_v3/lit_sicht/lit_multi (Varianten + Feuer), /tmp/panel (reaktive Regler), /tmp/town_soft (weiche sichtbare Stadtschatten). tsc sauber, 181 Tests grün. OFFEN: Feinabstimmung Feuer/Weichheit/Stadtschatten-Stärke nach Autor-Sichtung; danach die gewählte Variante in die echte Krypta + Stadt übernehmen.

- Runde 55 Forts.6 (Licht-Werkbank live im Hauptspiel + Raycaster-Sonne, Autorwunsch): (1) Alle Licht-Regler vom DebugArena-Test 1:1 ins HAUPTSPIEL: neue persistente Einstellungen settings.licht (variante, sichtRadius, heldLichtAn, feuerNeu, weichheit, sonneRaycast, sonneKegel). Neues, wiederverwendbares Bedienfeld src/ui/lichtPanel.ts (LichtPanel), das direkt auf settings.licht + settings.schatten schreibt und SOFORT wirkt + persistiert. In der WorldScene per Taste L ein-/ausblendbar (oben rechts unter dem Quest-Verfolger), in der DebugArena gleich offen. DebugArena auf dasselbe Panel + dieselben Settings umgebaut (kein doppelter Zustand mehr; ~90 Zeilen Inline-Panel entfernt). (2) RAYCASTER-SONNE (Autorwunsch "kannst du mit dem Raycaster ein Sonnenlicht simulieren? heller Punkt in der Stadt, großer Lichtkegel"): SchattenManager.sonneRaycast() setzt EINEN fernen, riesigen Lichtpunkt in -Schattenrichtung; das Raycasting lässt hinter jedem Gebäude/jeder Figur einen echten (annähernd parallelen) Schattenkeil stehen, während die ganze Stadt hell bleibt (milder kühler Schatten-Fill, Lichtkegel per Sichtpolygon ausgestanzt, weich via Mehrfachabtastung + Blur). Umschaltbar gegen die billige Projektion über den Werkbank-Schalter "Sonne: Projektion/Raycaster"; Regler "Sonnen-Kegel" steuert die Ferne (nah=radial/dramatisch, fern=parallel/lang). VISUELL VERIFIZIERT (Playwright, Dorf): /tmp/sun_proj (kurze dezente Projektionsschatten), /tmp/sun_ray (lange dramatische Raycaster-Schlagschatten), /tmp/sun_panel (Werkbank live im Spiel). tsc sauber, 181 Tests grün. OFFEN: Raycaster-Schatten sind LANG (Schatten reicht bis zum Kegelrand - physikalisch für Punktlicht korrekt); ggf. Länge begrenzen wenn dem Autor zu wuchtig. Dungeon-Sichtradius im Live-Spiel läuft noch über das bestehende lightRT-System, nicht über die Werkbank (bewusst nicht angefasst).

- Runde 55 Forts.7 (Bewegungs-Probe + Licht-Werkbank im Dungeon + Tageszeit-Regler, Autorwünsche): (1) BEWEGUNGS-PROBE (Titelmenü): Beispiel-Animationen für den Helden als Mix aus unserem Stil + den zwei Phaser-Referenzen (Knight-Kette + Brawler-Set). LINKS unser AKTUELLES Sprite, RECHTS eine NEUE prozedurale Seitenfigur mit: nach vorn geneigtem KOPF (anatomisch natürlicher, Autorwunsch), echtem AUSFALLSCHRITT/Lunge beim Schlag (vorderes Bein tief vor + gebeugt, hinteres gestreckt, Oberkörper führt nach vorn), SCHWERT+SCHILD-Garde und natürlicherem Gang. Klick = Zustand wechseln (Brawler-Idee), K = Kette idle->Garde->Ausfall->idle (Knight-Idee). 2-Knochen-IK für Knie/Ellenbogen. Nur Vergleichs-Beispiel, noch nicht im Spiel - der Autor entscheidet, was übernommen wird. Visuell verifiziert (/tmp/v_anim.png). (2) LICHT-WERKBANK BUGS behoben: das Panel lag auf Tiefe ~2400, das Dungeon-Dunkel-Overlay (lightRT) auf 4000 -> im Dungeon war das Panel VERDECKT (Autorbug "sehe Optionen im Dungeon nicht, kann L nicht aufrufen"). Panel jetzt auf Basis-Tiefe 9000 (über Dunkelheit/HUD). (3) TAGESZEIT-REGLER im Panel (Autorwunsch "Mittag/Uhrzeit testen"): setzt this.tageszeit direkt, Label = Tageszeit-Name; so prüfbar von Sonnenaufgang bis -untergang inkl. MITTAG (höchste Sonne = kürzeste Schatten). (4) DUNGEON-LICHT NEU (Schalter "Dungeon-Licht: NEU (Test)"): in dunklen Gebieten übernimmt wahlweise der SchattenManager (Held-Sichtradius + nahe Gebiets-Fackeln als Flammenlicht + nahe SOLID-Wandkacheln als Verdecker fürs Raycasting); das alte lightRT-Overlay wird dann ausgeblendet. Standard AUS (altes System bleibt sicher). rtTiefe 3990 (deckt Welt, unter Minikarte/HUD). VISUELL VERIFIZIERT: /tmp/v_dungeon (Panel sichtbar im Dungeon + neues Licht), /tmp/v_mittag (kurze Mittagsschatten). tsc sauber, 181 Tests grün. OFFEN: Dungeon-Raycasting-Leistung bei vielen Wandkacheln (auf 8 Kacheln Umkreis gecullt) im echten Spiel beobachten; ggf. Abtastzahl je Licht senken.

- Runde 55 Forts.8 (Licht-Fehler nach Live-Test behoben, Autorbugs): (1) DUNGEON 1 FPS: Ursache war das Wand-Raycasting (jede SOLID-Kachel im Umkreis als Verdecker x mehrere Fackeln x 6 Abtastpunkte). KOMPLETT entfernt - der Dungeon nutzt jetzt nur noch den Held-Sichtradius (weicher Reveal, kein Raycasting) + die NAHEN Fackeln als reines dezentes Glühen ('glut'-Lichttyp: kein Reveal, kein Schatten, lokal). FPS-Vergleich headless (Software-Renderer ~5-7 fps für ALLES): Dungeon alt 7, neu 5 - also auf echter Hardware wieder volle Bildrate. (2) FACKELN überstrahlten + waren map-weit: waren 'fackel'-Lichter (voller Reveal Radius 150) -> jetzt 'glut' (dim, Radius 64) und nur innerhalb sichtRadius*1.25 vom Helden -> lokal, dezent, kein Aufdecken der ganzen Karte. (3) "Licht hinter den Mauern in einem Lichtkegel": kam vom Fackel-Raycasting -> mit 'glut' (kein Kegel) weg. (4) RAYCASTER-SONNE "ewig lange Seitenschatten": Schatten verblassen jetzt mit der Sonnenhöhe (sin(winkel*PI)) - MITTAGS fast kein Schatten (Sonne oben/overhead, Autorwunsch), morgens/abends lang+dunkel. Die PROJEKTIONS-Sonne (Standard) liefert die realistische Mittagssonne ohnehin (kurze Schatten nach oben) - per Tageszeit-Regler ist Mittag (kurze Schatten) jetzt direkt anfahrbar (verifiziert). (5) DEBUGARENA "funktioniert nicht": startete im unsichtbaren Sonnen-Modus auf dunklem Boden -> Standard jetzt fackelAn=true (Dungeon-Licht gleich sichtbar). tsc sauber, 181 Tests grün. OFFEN: echte Wand-Verdeckung im Dungeon (Licht von Mauern blockiert) wäre schön, ist aber teuer (Raycasting) - bei Bedarf später als Hochqualitäts-Option mit zusammengefassten Wand-Rechtecken.

- Runde 55 Forts.9 (Licht-Regression behoben + Wandschatten als Aufsatz + Panel neu, mehrere Autorbugs): FALSCHER Ansatz vorher: "Dungeon-Licht: NEU" ERSETZTE das ganze alte lightRT-System -> alle Effekt-Lichter weg (Held warm, Fackeln, Feuerball, Zauber, Pfeile gaben kein Licht mehr), keine Stimmung, kein Raycasting sichtbar. JETZT richtig: (1) Das alte, bewährte lightRT-System (eraseLight + placeWarm) läuft IMMER und liefert weiter Licht für ALLE Quellen (Held warm-gelblich, Fackeln, Feuerball/Zauber/Pfeile farbig, Magie-Schreine). (2) "Dungeon Wand-Schatten: AN" ist jetzt nur ein AUFSATZ: das Held-Licht UND die nahen Fackeln werden statt als Kreis als SICHTPOLYGON ausgestanzt (Raycasting gegen die Wände) -> Licht reicht nur in den Raum, nicht durch die Mauern = die stimmungsvollen Schatten aus dem Debug, jetzt LIVE. Performance: nahe SOLID-Wände werden zu wenigen Rechtecken zusammengefasst (horizontale Läufe, dungeonWandSegmente), darum schnell (Headless-Software-FPS = Basiswert, also auf echter HW volle Rate; das alte 1-FPS-Problem - per-Kachel-Raycasting - ist weg). lightRT bekommt einen Weichzeichner für weiche Schattenkanten. (3) FACKEL-HELLIGKEIT als Regler (settings.licht.fackelHelligkeit) - skaliert Fackel-Lichtradius + warmes Glühen. (4) L-PANEL komplett neu (src/ui/lichtPanel.ts): KEINE Phaser-Interaktiv-Objekte je Regler mehr (die verursachten "Schalter geht nach Regler-Ziehen nicht"), sondern MANUELLES Hit-Testing in einem pointerdown-Handler. Verifiziert: Regler ziehen (Sichtradius 110->209) DANN Schalter klicken (Held-Licht true->false, Feuer-Stil flippt) - alles geht. Alle Optionen 1:1 (Tageszeit/Sonne/Kegel/Stärke/Weichheit/Wand-Schatten/Fackel-Helligkeit/Variante/Held-Licht/Sichtradius/Feuer-Stil). (5) Kampfklick überspringt das Panel (zeigerAufUI-Hook + trifft()). VISUELL VERIFIZIERT (/tmp/d_neu = warmes Licht + Wand-Raycasting live, /tmp/d_panel = volles Panel im Dungeon). tsc sauber, 181 Tests grün.

- Runde 55 Forts.10 (Weiche Dungeon-Schatten + getrennte Regler-Abschnitte, Autorbugs "harte Schatten / mehr Regler / Aussen+Dungeon getrennt"): (1) HARTE SCHATTEN behoben: das Held-/Fackel-Sichtpolygon im Live-Dungeon war EIN harter Polygon-Ausstanz; jetzt wie im Debug ein FLÄCHENLICHT (Mehrfach-Abtastung von mehreren Punkten -> echter Halbschatten). Held = 4 Abtastungen (weich), Fackeln = 1 (Blur weicht ab; Leistung). lightRT-Weichzeichner-Stärke an die Dungeon-Weichheit gekoppelt. Headless-Software-FPS ~4 (Basiswert 5-7), auf echter HW spielbar. (2) GETRENNTE ABSCHNITTE im L-Panel (Autorwunsch): zwei Überschriften AUSSENWELT (Sonne/Tag) und DUNGEON (Fackeln/Sicht) mit je eigenen Reglern. (3) MEHR REGLER: Sonnen-Weichheit (aussen) UND Wand-Schatten-Weichheit (dungeon) getrennt; Sonnen-Ferne (Kegel) + Fackel-Reichweite (getrennte "Entfernung"); Fackel-Helligkeit (schwach/stark); Fackel-Farbe (Regler 0 tiefrot .. 100 weißgelb, fackelTint -> placeWarm-Tönung); Sichtradius. Neue Settings: fackelReichweite, fackelFarbe, dungeonWeichheit. VISUELL VERIFIZIERT (/tmp/s2_soft = weiche Wandschatten + wärmere Fackelfarbe, /tmp/s2_panel = zwei Abschnitte + alle Regler). tsc sauber, 181 Tests grün. OFFEN: Leistung der Mehrfachabtastung im echten Spiel beobachten (Held 4-fach); bei Bedarf Abtastzahl an einen Qualitäts-Regler hängen.

- Runde 55 Forts.11 (Dungeon-Licht = EXAKT die Debug-Engine, Autorwunsch "das ist nicht das selbe wie im Debug, fang neu an"): Mein Fehler: ich hatte für den Live-Dungeon einen EIGENEN Weg gebaut (altes lightRT + von Hand ausgestanzte Sichtpolygone) statt der Debug-Engine. Sah anders aus (harte Keile, flache Pools, kein Falloff). JETZT korrekt: der Live-Dungeon (Wand-Schatten an) ruft GENAU dieselbe Funktion auf wie das Debug-Menü - SchattenManager.lichter(). Dadurch identische Optik: Fackeln = Flächenlicht mit 6-fach-Abtastung (echte weiche Schatten) + dunkler Falloff zum Rand + geschichteter Feuerschein + Flamme; Held = warmer Sichtradius (sicht). Effekte sind als farbige 'sicht'-Lichter eingespeist (Feuerball orange, Zauber violett, Feuerzauber) -> sie leuchten wieder. Das alte lightRT wird bei "Wand-Schatten an" ausgeblendet. PERFORMANCE: nur die 2 NÄCHSTEN Fackeln werfen Schatten (fackel), weitere glühen (glut); + per-Licht-Verdecker-Cull im SchattenManager (nur Wände im Lichtradius) -> Headless-Software-FPS ~4 (Basis 5-7), auf echter HW spielbar. Der eigene Dungeon-Sonderweg (eraseSichtpolygon, dungeonWandSegmente, fackelTint, lichtBlur) wurde entfernt. SchattenManager.Licht um 'farbe' erweitert (sicht-Schein-Farbe für Effekte); sicht-Standard jetzt warm-gelblich (Held). VISUELL VERIFIZIERT (/tmp/z_dungeon: Fackel mit warmem Falloff + weicher Schatten wie im Debug). tsc sauber, 181 Tests grün.

- Runde 58 (Endboss-Ausbau, Autorwahl "Endboss"): Der Tempelritter-Kampf hatte schon 3 Kammern (Vorhof/Halle/Inneres Grab) mit Tor-Rückzug und HP-Phasen, aber die Kammern fühlten sich gleich an. Jetzt kennt der Boss seine Kammer (Enemy.bossKammer, von der Welt beim Erscheinen/Wiederaufstellen gesetzt) und jede Kammer hat eine Signatur: Vorhof = Nahkampf/Ansturm/Stampf; Halle (Kammer 1) = zusätzlich die Projektil-Salve (ab Betreten, nicht erst bei 50% HP); Inneres Grab (Kammer 2) = neue Phase-III-"Blutsäulen" (Ring Blut-Geysire um den Ritter + Geysire unter dem Helden, Telegraph-Schaden via addTelegraph). Alle Werte in BOSS (src/data/enemies.ts: geysirCd/Ring/RingR/AmHeld/Streuung/Radius/TelegraphS/DmgMult) zentral änderbar. Text BOSS_TEXTE.blutsaeulen. Verifiziert: Salve 7 Projektile in Kammer 1 bei voller HP, 9 Geysir-Telegraphen in Kammer 2.

- Runde 58 (Boss-Auftritt + Anmarschgang, Autorwunsch): (A) Dramatischer Auftritt - die Leibwache fällt, dann erhebt sich der Tempelritter INSZENIERT aus kochendem Blut (Stimme/Beben/roter Puls -> Blutwelle + bleiche Hand -> nach ~1,1s der Ritter mit großer Blutwelle), verzögerte Schritte mit Gebiets-Wächter. (B) Anmarschgang: bossH 58->80, neuer Gang y54-78 südlich vor dem Vorhof; neue Kachel T.BLUTSTROM (unbegehbar, FLYOVER, dunkelrot, BloodFlow-getönt), überquert NUR von einer Brücke aus Grabplatten (T.BRIDGE x16-17). BloodFlow+Fratzen+schwimmende Tote bis in den Gang; scheue Schatten (bossSchemen) huschen am Rand und verschwinden bei Annäherung. Spawn nach Süden (y76), Treppe als reiner Eingangs-Anschluss am Süd-Ende. Die Kammern (y4-53) und die ganze Bosskampf-Logik (BOSS_TORE/KAMMERN/Phasen) bleiben unverändert. Werte: Blutstrom-Band y62-69, Brücke y61-70.

- Runde 58 (3D-Test, Autorwunsch "Wow-Effekt", Plugins ziehen erlaubt): NEUE Dependency three.js (^0.x) + @types/three - NUR für einen ISOLIERTEN 3D-Test (held3d.html + src/demo3d/held3d.ts), NICHT im Spiel (src/main.ts importiert three nicht -> kein Bundle-Einfluss aufs Spiel dank Tree-Shaking). Zeigt den Helden in 3D mit echter Skelett-Animation (Soldier.glb aus den three.js-Beispielen als Platzhalter-Rig, CC-frei, in assets/demo3d/), dynamischem Fackel-Licht + weichen Schatten, Krypta-Nebel und Glut. Aufruf: npm run dev -> /held3d.html. Zweck: Entscheidungsgrundlage, ob/wo sich 3D lohnt. Bei "ja" käme ein eigenes Kapuzen-Ritter-Modell statt des Soldaten. Verifiziert: Modell lädt (Idle/Walk/Run), rendert mit Schatten im Krypta-Look.

- Runde 58 (Prozeduraler Ritter, Autorwunsch "procedural Spieler-Aussehen nach den Vorgaben"): Da kein freies animiertes Ritter-Modell ladbar war, den Helden aus Geometrie gebaut (src/demo3d/ritterBau.ts) - nach den 2D-Specs der Platte-Stufe (fallbackArt): Dunkelstahl-Platte #53565e/Beine #3e4046, Topfhelm #56504a mit Visier+Goldkamm, Schulterpanzer #3a3630 mit Goldkante, Tabard #7a7268 mit verblasstem rotem Kreuz #8e3a30, Umhang, Goldzier - plus richtiges Schwert. Eigene Gelenk-Hierarchie (Torso/Kopf/Arme/Hüften/Umhang) -> prozedurale Animation (Atmen, Gehen gegenläufig, Überkopf-Hieb). Schaubühne: /ritter.html (drehbar, Stehen/Gehen/Schlagen). Als Spielfigur: RitterModell (src/demo3d/ritterModell.ts) ersetzt in der DebugArena den Soldier-Platzhalter (held3dModel.ts entfernt). Schlag weiter an heldSchlagT gekoppelt. Verifiziert: Ritter rendert (Helm/Kreuz/Pauldrons/Schwert) in Schaubühne UND Arena, Schwung läuft.

- Runde 58 (beide 3D-Modelle testbar + Schlagtechniken): DebugArena hält jetzt BEIDE Modelle - den prozeduralen Ritter (RitterModell) UND das geriggte Soldier-Modell (Held3DModell wiederhergestellt). Taste M wechselt Ritter -> Soldat -> 2D-Sprite. Vier Schlagtechniken nach den bekannten Movesets (CombatScene): slash (Schwert/Axt, meleeArcAttack), overhead (Hammer, overheadAttack), thrust (Stange, thrustAttack), spin (Rundumschlag, spinAttack). Reale Angriffe wählen die Technik nach Waffenklasse (Stange=Stich, Hammer=Überkopf, sonst Hieb); Taste B testet jede Technik einzeln (Vorführ-Schwung). Schaubühne /ritter.html hat Knöpfe Hieb/Überkopf/Stich/Wirbel. Verifiziert: alle vier Techniken sichtbar verschieden; M/B funktionieren.

- Runde 58 (3D-Schatztruhe, Autorwahl): prozedurale Truhe (src/demo3d/truheBau.ts) - Holzkorpus mit Eisenbeschlägen + Goldschloss, Deckel auf Scharnier (klappt animiert auf), Beute drinnen (Münzen + Edelstein) und eine Lichtsäule in RARITÄTSFARBE (setTruheFarbe). Schaubühne /truhe.html mit Öffnen/Schließen + Raritäts-Durchschalter. Gedacht als Kopplung an das Truhe-Öffnen-Event. Verifiziert: zu/auf rendern, Deckel klappt, Lichtsäule wächst.

- Runde 58 (3D-Test-Galerie + Tür/Tor, Autorwunsch "viele Details, erst in der Test-Umgebung"): Gemeinsame Bühne src/demo3d/buehne.ts (Krypta-Boden/Nebel/Fackeln/Schatten, drehbar) + Galerie /demo3d.html (Objekt oben wählen, Aktion unten) - EINE Test-Umgebung für alle prozeduralen 3D-Objekte, bevor etwas live geht. Tür + Tor in src/demo3d/tuerBau.ts, maximal detailliert: Tür = Planken + Eisenbänder mit Nieten + Diagonalstrebe + Ringgriff + Schlüsselloch + vergittertes Guckloch + Scharnierbänder + Steinrundbogen aus Keilsteinen; Tor = Torhaus (Pfeiler/Keilstein-Bogen/Zinnen/Sims) + Fallgitter + zwei schwere Torflügel mit Balken/Bändern/dicken Nieten/Ringgriffen, beide schwingen auf. Truhe ebenfalls in die Galerie gehängt (mit Raritäts-Schalter). Verifiziert: Tür/Tor zu+auf gerendert.

- Runde 58 (weitere Galerie-Props, autonom): Brunnen (Steinring + Dach + Winde + Eimer + animiertes Wasser/Ripple; Aktion: Eimer herab), Altar (Steinblock + eingraviertes Kreuz + Blutspur + 4 Kerzen mit echten Flammenlichtern + Goldkelch; Aktion: Heiligenlicht/Reliquie steigt), Fass (14 Dauben + 3 Eisenreifen + Deckel + Münzen; Aktion: zerschlägt - Dauben fliegen auseinander, Münzen frei) in src/demo3d/propsBau.ts, alle in der Galerie /demo3d.html. Verifiziert.

- Runde 58 (3D-Objekt-Baukasten in der DebugArena, Autorwunsch): Texturen (texturen.ts) auf alle Props; Objekt3DLager (src/demo3d/objekt3dLager.ts) rendert jedes 3D-Objekt mit Top-Down-Schrägblick in eine eigene Phaser-Textur und setzt es als tiefen-sortierten Sprite in die Welt (statisch = 1x gerendert, animiert = nur während der Animation -> billig). Verschiebbares DOM-Baumenü (Truhe/Fass/Brunnen/Altar/Tür/Tor + Zeiger/Löschen/Alle löschen + Größe -/+). Weltklick-Hook bauKlick() in CombatScene; in der Arena: Setzmodus platziert, Löschmodus entfernt, sonst Klick auf Truhe/Fass öffnet/zerschlägt (animiert). Held verkleinert (Scale 0.4->0.28, war zu groß). OFFEN/nächster Schritt: Türen/Tore als echter Raum-Durchgang (aktuell nur auf-/zuklappen); Feld ggf. erweitern; weitere Props; in der Galerie sind alle ebenfalls.

- Runde 58 (three.js-PR #33848 "volumetric fire" eingebaut, Autorwunsch): Das WebGPU-Volumenfeuer-Beispiel (sunag, dev-fire-fx) als eigene Seite /webgpu_fire.html portiert - Importmap entfernt (Vite löst die Bare-Imports three/webgpu, three/tsl, three/addons/*), fehlendes Addon curlNoise.js vendored (src/demo3d/vendor/). Unsere three 0.184.0 hat VolumeNodeMaterial + alle nötigen TSL-Funktionen. Aus dem 3D-Baukasten der Arena per Knopf "WebGPU-Feuer öffnen" erreichbar. WICHTIG/EHRLICH: WebGPU braucht einen Browser mit echtem Adapter (Chrome/Edge); die Headless-Umgebung hier hat KEINEN (Vulkan-Surface fehlt) -> visuell NICHT verifiziert, nur dass alle Imports fehlerfrei auflösen und die Seite lädt. Echte In-Canvas-Integration (WebGPU->Phaser-Textur) wäre der nächste, schwerere Schritt.

- Runde 58 (sechs weitere Props, Autorwunsch "mehr Props"): src/demo3d/props2Bau.ts - Grabstein (Rundstein mit Kreuz/Inschrift/Moos auf Grabhügel), Kiste (Brett-Wände + Eckleisten + Münzen, ZERBRICHT wie das Fass), Käfig (Eisenstäbe + Aufhänge-Ring + Gebein/Schädel drin), Wandfackel (Steinhalt + Eisen-Halter + Fackel + Flamme + 2 Lichter, flackert in der Galerie), Erzader (Felsbrocken mit eingesprengten Gold-Erzkristallen), Bücherregal (Seiten/Bretter/Rückwand + bunte Buchrücken, ein paar schief/Lücken). Material-Helfer (matHolz/matEisen/matStein/matGold) nach texturen.ts extrahiert. Alle in KATALOG3D (Baumenü) UND der Galerie. Verifiziert (Galerie-Montage). Hinweis: die Fackel-Flamme flackert nur in der Galerie (Dauer-Render); als platzierter Sprite wird sie 1x statisch gerendert (lit, aber ohne Flackern).

- Runde 58 (Live-3D-Raum-Simulation + Fixes, Autorwunsch): /raum3d.html (src/demo3d/raum3dSim.ts) - ZWEI begehbare 3D-Räume mit echten 3D-Wänden (Kollision), dazwischen eine Tür, die sich NACH HINTEN öffnet, wenn der Held näher kommt; WASD/Pfeile laufen, Kamera folgt schräg von Süden (Südwand niedrig, verdeckt nicht). Atmosphäre: Fackeln (echtes flackerndes Licht), Blutstrom (glühender roter Streifen + Fluss + Licht), Blut-Tropfen von oben (Partikel), Wasserbecken (Ripple + Steinrand), Requisiten (Truhe offen mit Lichtsäule, Fass, Grabstein, Käfig, Wandfackel, Altar). Held = prozeduraler Ritter, animiert. FIXES: Tür öffnet nach hinten (Vorzeichen), Tor-Fallgitter hebt sich beim Öffnen, Bücherrücken gedeckter, Truhen-Lichtsäule kommt schmal aus der Truhe und flammt nach oben auf. OFFEN/Ideen: Palisade/Zaun als Props, mehr Erz-Varianten (groß/klein).

- Runde 59 (Kurskorrektur "alles in UNSEREM Top-Down mit dem alten Spieler-Charakter", Autorwunsch): Der begehbare 3D-Raum (raum3d.html) bleibt als Tech-Skizze liegen, ist aber NICHT die Richtung ("cooles, aber komplett anderes Spiel"). Klarstellung Hybrid: Phaser bleibt das 2D-Top-Down-Spiel; three.js BÄCKT nur Objekte/Effekte in Sprites (objekt3dLager-Muster) und setzt sie als flache, tiefen-sortierte Sprites in die echte 2D-Welt. (1) DebugArena: held3dModus startet jetzt 'aus' = die alte 2D-Figur (drawHeld); der prozedurale Ritter/Soldat sind nur noch per Taste M zuschaltbare Tests (der "Klotz" gefiel nicht). (2) Neue Außen-Props src/demo3d/props3Bau.ts: bauePalisade (spitze Wehrpfähle + Querbalken + Erdwall), baueZaun (leichtes Tiergatter, 2 Pfosten/2 Latten), baueErz(art,groesse) mit Arten Gold/Kupfer/Eisen/Silber/Kristall - eine Funktion, alle Adern; Größe über den Regler. In KATALOG3D (Baumenü Arena) + Galerie. (3) Top-Down-Vorschau /topdown3d.html (src/demo3d/topdown3dSim.ts): KEIN 3D-Spiel - bäckt die Props mit dem Spiel-Schrägblick in Bilder und komponiert sie als Sprites auf den ECHTEN Spiel-Boden (drawTileArt) samt laufender 2D-Figur (drawHeld). Verifiziert (Screenshots Galerie + Top-Down-Vorschau). drawHeld/drawTileArt sind Phaser-frei, daher in der Standalone-Seite nutzbar.

- Runde 59 (prozedurales Level in unserem Top-Down, Autorwunsch "wie sieht das in einem proceduralen Level aus?"): /level3d.html (src/demo3d/level3dSim.ts) nutzt den ECHTEN Generator buildCrypt(3, seededRng) und zeichnet das Kachel-Layout exakt wie das Spiel in 2D (drawTileArt Boden/Fassade/Dach via SOLID-Prüfung). An a.ores stehen die 3D-gebackenen Erz-Sprites (Art+Größe positionsstabil aus Hash), an a.chests die offene Truhe, an T.GRAVE der Grabstein - alle tiefen-sortiert. Fackel-Dunkelheit als Licht-Maske (destination-out-Löcher an Held/Truhen/Kristall-Erz/Fackeln) + additiver Warm-Schimmer. Held wandert von selbst (Kollision gegen SOLID), WASD/Pfeile übernehmen, Kamera folgt + an Map-Rand geklemmt. Beweist: derselbe Hybrid trägt ein komplettes prozedurales Level, ohne das Genre zu wechseln. Verifiziert (Screenshot: Held neben Erz-Ader + leuchtende Truhe). Der gemeinsame Top-Down-Backofen wurde nach src/demo3d/propBackofen.ts extrahiert (2. Nutzung: topdown3d + level3d) - eine geteilte WebGL-Render-Pipeline statt Duplikat.

- Runde 60 (Autorwunsch "richtige Wände + Raumgefühl", scharfe Kritik): Drei Korrekturen. (1) level3d: KEIN Selbstlaufen mehr - die Figur steht still und läuft nur auf WASD/Pfeil (Auto-Wander + neuesZiel/zielTx entfernt). (2) baueZaun gleichmäßig: gleich dicke Pfosten/Latten, kein Zufalls-Schräghang, flache Kappe - die Cartoon-Verjüngung war der Bake-Winkel + die zufällige Rotation. (3) NEU /raumgefuehl.html (src/demo3d/raumgefuehl3d.ts): ein top-down Dungeon mit ECHTEN hohen Steinwänden (HW=3.6) rundherum - vertikal UND horizontal, 90°-Eckpfeiler, ZWEI Räume (A vorn, B hinten) mit einem Tor in der gemeinsamen Wand (öffnet bei Annäherung, Fallgitter hebt sich), ein Zaun-Gehege mit echten Ecken (vertikale Seiten via rotation.y=PI/2 + Eckpfosten + Eingang). Nahwand (Süd) niedrig (1.5), damit die Kamera von schräg oben HINEIN blickt; die sichtbaren Seiten-/Rückwände sind voll hoch -> kein "schwarzes Loch" mehr. 2D-Held als Billboard (drawHeld), steht still, WASD, Kollision gegen die Wand-AABBs; Erz an den Wänden, Truhe mit Lichtsäule, Fackeln. Begründung Engine: Autor sagte "ob three.js oder phaser egal, ich will richtige Wände" - echte 3D-Geometrie gibt nahtlose, hohe Wände ohne Kachel-Fugen. Verifiziert (Screenshots Raum A mit Gehege + Raum B durchs Tor).

- Runde 60 (Autorentscheid: Wände als 2D-Phaser-Kachelkunst, NICHT three.js): Beweis /wand2d.html (src/demo3d/wand2dSim.ts + src/demo3d/wandKachel.ts). zeichneWandKachel malt JEDE Wandkachel als erhabenen Steinblock rein in 2D-Canvas (Phaser-fähig): helle Mauerkrone (Kappe) oben + hohe, dunkle Vorderfront nach Süden (ragt über die Bodenkachel), scharfe Oberkante + Lichtgrat + Kontaktschatten, Kantenlicht/-schatten je offenem Nachbarn (NW-Licht). Autotile über die vier Nachbarn (Kanten n/e/s/w) -> durchgehende waagerechte UND senkrechte Wände + 90°-Ecken, massiver Fels (ringsum Wand) nur als dunkle Kappe. Layout vom ECHTEN buildCrypt; Boden = drawTileArt('krypta_boden'); alles tiefen-sortiert wie im Spiel (Wand-Front verdeckt nur Nördliches). Türen (erkannte Engstellen in waagerechten Wänden) + Truhe/Erz/Grab als 3D-gebackene Sprites (propBackofen). Held = 2D drawHeld, steht STILL, nur WASD. Verifiziert (Screenshots: Raum mit erhabenen Wänden + Truhe; 3D-Tür im Wandloch). NÄCHSTER SCHRITT (offen): zeichneWandKachel in den echten Renderer (SpriteProvider/WorldScene/DungeonSpielScene) portieren.

- Runde 60 (Wand-Feinjustage, Autorwunsch "dünner+dunkler, am Raycaster testen, Türen raus"): (1) wandKachel.ts neu: Mauerkrone nur noch ~1 Ziegel dick (capH = ts*0.34) statt voller Kachel, deutlich DUNKLERE Steinpalette, kurzer Süd-Überhang (faceH ts*0.35) -> schmale dunkle Mauer. (2) wand2dSim nutzt jetzt UNSER echtes Raycaster-Schattensystem: sichtPolygon + Segmente aus src/systems/schatten.ts; die Wand-Kanten (nur zum Boden offene Kanten) sind die Verdecker, der Held trägt eine Fackel + verstreute Wandfackeln -> echte radiale Schatten, Unbeleuchtetes bleibt schwarz (destination-out-Reveal je Lichtpolygon + warmer Feuerschein). (3) Türen ENTFERNT (Autor: sinnlos, weil daneben offene Durchgänge sind). Verifiziert (Screenshot: dünne dunkle Wände, Fackel-Pools von Wänden begrenzt, Schattenkeile). Hinweis: das ist dieselbe Raycaster-Mathematik wie im Spiel (schatten.ts), nur Phaser-frei im Canvas gespiegelt - der echte SchattenManager nutzt exakt sichtPolygon.

- Runde 60 (Wand-Modell als erhabener Block, Autorkritik "doppelt so hoch, senkrechte+Ecken fehlen, Löcher, muss abschließen"): zeichneWandKachel komplett auf ein ERHABENES-BLOCK-Modell umgestellt - die Mauerkrone (Kappe) wird um H (~0.85*Kachel) NACH OBEN gezogen, darunter die Vorderfront bis zum Boden. Aufrufer zeichnet die Wände NORD->SÜD (ty aufsteigend) VOR den Sprites; dadurch decken die Kappen der südlicheren Wände die Fronten der nördlichen ab -> senkrechte Wände werden zu einem DURCHGEHENDEN erhabenen Streifen (kein Stufen-Effekt), Ecken verbinden, der Raum schließt rundum ab, keine Löcher. ~doppelt so hoch wie zuvor. Kappe sichtbar (mittelgrau + NW/SO-Relief), Front dunkel. Schatten: unser Raycaster (sichtPolygon), zusätzlich die Dunkelheits-Maske beim Compositing weichgezeichnet (ctx.filter blur) -> weiche Schattenkanten wie der echte SchattenManager. Verifiziert (Screenshots: erhabene Wände, sichtbare Senkrechte+Ecken, weiche Schattenkeile von den Wänden).

- Runde 60 (Wand zurück auf dunklen Ziegel-Look + höher, Autorkritik "nimm die alten dunklen Wände, mach 3-4x so hoch, nicht fett/hell wie Tetris"): Der erhabene helle Block war falsch. zeichneWandKachel jetzt = dunkles ZIEGELBAND: die Wandkachel selbst als dunkler Ziegel (Oberseite) + eine nach SÜDEN in den Raum hängende Front (faceH ~1 Kachel) = Wandband ~2 Kacheln hoch, nur eine DÜNNE Lichtkante oben (kein heller Klotz). Nord->Süd gezeichnet, südlichere Oberseiten decken nördliche Fronten ab -> durchgehende Senkrechte + Ecken. NICHT nach oben gezogen (das ergab ein Ziegelfeld überall), sondern hängende Front -> sauberes Band. Grundhelligkeit leicht angehoben, damit die Ziegel im Fackellicht sichtbar sind. Diagnose-Hook __hell(true) blendet Dunkelheit/Raycaster aus (nur Wände prüfen). Verifiziert (Diagnose-Screenshot: saubere dunkle Ziegelbänder; Lit-Screenshot mit Raycaster).

- Runde 60 (zwei Autorbugs): (1) "Mobile Massenvernichtungseinheit" (atomschlag, ☢) ging nicht. Ursachen: a) in CombatScene.runAction fehlte der case 'atomschlag' -> der Slot tat nichts (fiel auf default). b) atomschlag hat in ABILITIES unlock:99 -> abilityReady blockte ihn ohne TUNING.alleZauberFrei. Fix: case ergänzt; abilityReady behandelt atomschlag als DEV-Sonderfall (immer wirkbar, nur eigene Abklingzeit). Zusätzlich ABILITY_FX.atomschlag.cd 10->0 (Autorwunsch: 0 Manakosten, 0 Abklingzeit; Mana war schon 0). Verifiziert im echten World-Scene (atomWalze wird erzeugt). (2) Aktionsleiste graute abklingende Zauber nicht aus - nur der Schwung war zu sehen. Fix in hud.ts: bei cdFrac>0 ganze Taste matt (0x05030a/0.5) + Symbol/Zahl auf Alpha 0.5. Verifiziert (Screenshot: R/T-Slots mit Restsekunden sind sichtbar abgedunkelt).

- Runde 60 (Klarstellung Autor: gemeint war das RECHTSKLICK-Belegungs-Menü, nicht die Leiste selbst): Im Belegungs-Menü (openBelegungsMenue) waren noch nicht gelernte Zauber NICHT ausgegraut. Neuer Helfer istGelernt(id): s1/s2/s3 -> Spieler-Level >= unlock; Schul-Fähigkeiten -> Schul-Level >= unlock; Items/Waffen-Slots/Rollen -> immer verfügbar; atomschlag (DEV) -> immer. Menü-Einträge sind jetzt grau (#5a5142) bis gelernt, Hover gedämpft. Verifiziert (Screenshot Level-1-Held: alle Kampf/Zauber/Bogen-Einträge grau, Gegenstände/Waffen-Slots farbig).

- Runde 60 (Regen/Pfützen-Effekt, Autor zweifelte ob machbar): Das angefragte Three.js/R3F/WebGL-Demo steht unter GPL-3.0 -> NICHT übernehmbar (Copyleft würde unser Spiel GPL-pflichtig machen). Stattdessen eigener Effekt in REINEM 2D-Canvas (regen.html + src/demo3d/regenSim.ts), Phaser-fähig: nasses Pflaster (gebackene Kachel), organische Pfützen (weiche Alpha-Maske aus überlappenden Ellipsen, per destination-in maskiert) mit Himmel-/Laternen-Spiegelung (senkrechter warmer Streifen), Regen mit Tiefenstaffelung, Tropfen-Ringe in Pfützen + Spritzer-Krönchen auf Stein, Blitz, Vignette. Maus = Laterne, Klick = Einschlag. Verifiziert (Screenshot: Pfützenspiegelung sichtbar). Gedacht für Ravensmoor-Außenbereiche, nicht die Krypta.

- Runde 60 (Wald via ez-tree, Autorfrage "was ist damit für unseren Wald"): ez-tree (@dgreenheck/ez-tree) ist MIT-lizenziert (Copyright 2024 Daniel Greenheck) -> nutzbar (anders als das GPL-Regen-Demo). Es ist Three.js, und WIR NUTZEN BEREITS Three.js (propBackofen/macheBackofen bäckt prozedurale 3D-Props im Spiel-Schrägblick zu Sprites). Daher Neue Dependency @dgreenheck/ez-tree aufgenommen (Begründung: prozeduraler Baum-Generator für den Wald, MIT, fügt sich 1:1 in unseren vorhandenen Backofen). Tree extends THREE.Group -> direkt an backe() übergebbar. Ablauf: new Tree(); loadPreset('Oak Large' u.a.); options.seed setzen; generate(); auf asynchrone Rinden-/Blatt-Texturen warten; backe() -> flacher Sprite. FALLE: ez-tree-Bäume sind ~100 Einheiten groß, die Backofen-Kamera hat far=60 -> ungeskaliert wird alles weggeclippt (leeres Sprite). Lösung: Baum vor dem Backen auf ~2.4 Einheiten herunterskalieren. Demo: baum.html + src/demo3d/baumSim.ts (Top-Down-Wald, depth-sortiert, leichtes Wiegen). Verifiziert (Screenshot: Eiche/Esche/Espe/Kiefer als Sprites). Kein Laufzeit-3D im Spiel nötig.

- Runde 60 (Wald-Stimmung, Autorwunsch "satte aber nicht knallige Bäume + kahl/tot nur um Krypta/Mine, erholt sich später"): baumSim.ts bekommt zwei EINSTELLBARE Stimmungs-Konstanten (WALD, BLIGHT) mit je blattDichte (Multiplikator auf ez-tree leaves.count -> Kahlheit), blattTint/rindeTint (überschreibt das knallige Preset-Gelbgrün durch tiefes gedämpftes Grün bzw. Grau-Braun), blattGroesse, sat/hell (2D saturate()/brightness() auf dem Sprite = global "nicht knallig"). Jede Art wird in BEIDEN Stimmungen gebacken. Layout: ein Krypta-Punkt mit Blight-Radius; Bäume innerhalb (weicher Zufallsrand) nehmen die kahle BLIGHT-Variante, außen die satte WALD-Variante; Boden in der Zone zusätzlich entsättigt+abgedunkelt. So ist die "Erholung" später nur ein Umschalten der Stimmung pro Baum. Verifiziert (Screenshot: dunkler Wald außen, kahle graue Zone um die Krypta).

- Runde 60 (begehbarer Wald + Wind + Fällen): baumSim.ts ist jetzt eine begehbare Karte (Welt 2600x1800, Kamera folgt dem Helden, WASD). WIND: stehende Bäume werden über eine Streifen-Biegung des flachen Sprites bewegt (Stammfuß fest, Krone wiegt sich, windKraft mit Böen + feines Blätterzittern; Blight-Bäume steifer). FÄLLEN (F/Leertaste): nächster Baum (<130px) kippt per easeOutCubic um den Stammfuß weg vom Helden (zeichneGefällt: Rotation um die Basis + leichte Liege-Verkürzung), Stumpf (macheStumpf, Schnittfläche+Ringe) bleibt, Späne + Blätter stieben (Partikel). Held trägt 'axt'. Kollision = Stammfuß-Kreis stehender Bäume. Dev-Hooks __demo.{setPos,geheZuBaum,fälle}. tsc grün, im Browser geprüft.

- Runde 60 (kombinierte Szene dorf.html/dorfSim.ts - Autorwunsch "alles verbinden"): Wald + Regen + Pfützen + Held/Hühner/Dorfbewohner + Laufeffekte + Wind-Wetter in EINER 2D-Canvas-Szene. WETTER: eine windKraft (mit Böen) treibt Regenneigung, Baumwiegen, Gras-Neigung und im Sturm (|wind|>0.7) das Blätter-Abfallen (Blatt-Partikel driften herab). PFAD: begehbarer Erd-Pfad (Polylinie + distPfad); Pfützen bilden sich NUR auf dem Pfad; Bäume/Grasbüschel meiden den Pfad. LAUFEFFEKTE: Wesen in Pfütze -> Ringe+Spritzer; auf Gras -> Rascheln. REGEN-AUFSCHLAG: in Pfütze -> Ringe (erster Effekt), auf Gras/Pfad -> Aufschlag-Krönchen + Tröpfchen (zweiter Effekt, wie auf den Kacheln im Regen-Demo). LEBEN: Held (WASD, F=fällen) + 3 Dorfbewohner (drawHeld stoff/kette) + 6 Hühner (prozedurales Sprite), simple Wander-KI, tiefensortiert. Bestätigt: Bäume können wachsen/Blätter bekommen/verlieren (leaves.count + Größe als Stellschraube; Blattfall im Wind demonstriert). tsc grün, im Browser geprüft (Held+Hühner+Bauern, Pfad mit Pfützen, Regen).

- Runde 60 (echtes Wetter/Unwetter + besseres Wasser + Nebel; Autorwunsch & Three.js-Anregungen): Three.js Water.js/FogExp2/Wet-Material sind 3D-WebGL, in unserer 2D-Szene nicht direkt nutzbar - die IDEEN aber in 2D-Canvas umgesetzt. (1) Dynamisches Wetter: wetter 0..1 (klar/Regen/Unwetter), Ziel driftet automatisch (28% Unwetter-Chance) + Tasten 1/2/3; treibt Regendichte/-tempo, Windstärke (Böen), Dunst und Bodendunkelheit. (2) Regentropfen-Aufschlag entkoppelt von den Streifen: regenAufschlaege() verteilt KLEINE Tropfen-Ringe übers ganze Sichtfeld und gezielt in jede sichtbare Pfütze (Wasser "lebt") + Krönchen auf Gras/Pfad. (3) Pfützen sehen jetzt nach Wasser aus: dunkler Spiegel-Gradient, heller Himmel-Streifen/Horizont, driftender Glanzpunkt, Tropfen-Ringe (hell+dunkel), zeilenweiser Oberflächen-Wobble, nasser Rand-Schein (Wet-Material-Idee). (4) Nebel/Dunst (FogExp2-Idee): grau-blauer Schleier + driftende Schwaden, Stärke nach Wetter; Vignette/Bodendunkelheit steigen mit. (5) Unwetter: im starken Böen-Wind knickt selten (~1/100) ein Baum um. tsc grün, im Browser geprüft (Wasser-Pfützen, Sturm mit Dunst).

- Runde 60 (Autorfeedback an der kombinierten Szene): (1) BUG Stumpf war fixe Größe (~40px) -> wirkte 10x zu groß; jetzt mit b.skala*0.9 skaliert (passt zum Stamm). (2) Pfützen fügten sich nicht in den Pfad ein (lagen quer drauf). Umbau: Pfütze = schmale Lache AM Pfad ENTLANG - Mittelpunkt + Länge L (in Pfadrichtung) + Breite B (< Pfadbreite) + Winkel (atan2 der Pfad-Segmentrichtung); Maske/Render gedreht; brauner Schlamm-Halo (1.3x) bettet sie in den Weg ein; Himmel-Spiegelung gedämpft, damit sie nicht "leuchtet". Tropfen-/Schritt-Ringe jetzt in LOKALEN Maskenkoordinaten (Ring.lx/ly). Verifiziert (Screenshot: lange Wasserlachen am Weg, integriert). OFFEN/angemerkt: Baum-Perspektive wirkt bei manchen Arten unsicher (Backofen-Schrägblick) - bei Bedarf Tilt reduzieren oder Arten tauschen.

- Runde 60 (Bäume dicker/höher + Vielfalt + Größenregler, Wiesen-Bewuchs, Pfützen-Feinschliff, 1349-Recherche):
  * BÄUME: ez-tree branch.radius[0] (Stammdicke) ×1.7×dick und branch.length[0] (Höhe) angehoben -> keine "jungen Bäumchen" mehr. 8 Sorten mit unterschiedlicher Dicke (einige dicke alte, einige schlanke). Größeren Streubereich der Skala. GRÖSSEN-REGLER (HTML-Slider in dorf.html) setzt globalen baumGroesse-Faktor live (Draw + Stumpf).
  * 1349-MISCHWALD (Recherche): mitteleuropäische Naturwälder ~14. Jh. = BUCHE + EICHE dominant, dazu Esche, Hainbuche, Linde, Birke, Kiefer; Fichte/Tanne v.a. im Bergland (KEINE Fichten-Monokultur - die kam erst mit der Forstwirtschaft des 18./19. Jh.). Starke Rodung 1100-1300, dann "Krise des 14. Jh." (Pest 1348-50) -> Felder verlassen -> Wiederbewaldung durch Pionierarten. Daher Eiche dominant in der Mischung, dazu Esche/Kiefer/Espe (ez-tree-Presets; Buche fehlt als Preset, Eiche/Esche decken die Laubbäume ab).
  * WIESEN-BEWUCHS: 5 prozedurale Mini-Sprites (3 Blümchen gedämpft, Kräuter, Klee), locker gestreut (~520, abseits des Pfads), leichtes Wiegen.
  * PFÜTZEN-Feinschliff (Autorfeedback): härtere Maskenkante (blur 0.06->0.022), dunkle fast-schwarze Grundfläche, halbtransparent (Lehmboden scheint durch, alpha 0.78), Helligkeit NUR als gedämpfte Himmel-Spiegelung (kein heller Füll-Fleck/Glanz mehr), Mitte dunkler als Rand (Senke). Tropfen-Ringe als einzige feine Lichtkanten.
  * STUMPF skaliert jetzt mit baumGroesse. Freeze-Hook __demo.frieren() für Screenshots (Software-WebGL sonst zu langsam zum Capturen).

- Runde 60 (Autorfeedback: dynamische Pfützen, natürlicher Weg, Fall-Physik, Holz):
  * PHYSIK-Frage: Spiel hat EIGENE Impuls-Physik (stossWeg/KNOCKBACK für Gegner, schiebbare Fässer/Kisten), KEIN matter.js (nicht installiert). Fallender Baum daher als eigene Winkel-Physik (Schwerkraft-Drehmoment ~ sin(Neigung), beschleunigt mit der Neigung; am Boden Nachfedern per Feder+Dämpfung). matter.js wäre für einen Baum überdimensioniert.
  * DYNAMISCHE PFÜTZEN: zentraler wetness (0..1), Regen füllt schnell (×0.18×Regenstärke), Verdunsten langsam (×0.012). Feste Spots auf dem Weg; jede mit gestaffelter Schwelle (0.12..0.62), grow/shrink (shrink langsamer), current 0..1 -> Skalierung + Deckkraft. Pfützen entstehen erst bei Regen, mehr je nasser, verschwinden langsam.
  * NATÜRLICHER WEG: mäandernde Mittellinie (Sinus-Noise) + variable, ausgefranste Halbbreite; gefülltes Band statt Lineal-Strich; Spurrillen (2 dunkle Längslinien), nass/trocken-Flecken + Steine (auf den Weg geclippt), Saum aus zertretenem Gras über die Kante + durchwachsendes Gras. Regler "Weg-Breite" (live). distPfad/Platzierung nutzen weiter die gerade Linie (Mäander ist sanft).
  * FÄLLEN: Drehpunkt am Stammfuß, Easing durch Physik (langsam los, beschleunigt, am Boden Nachfedern), Krone staucht beim Aufprall minimal, Schatten wandert mit, Aufprall wirft Staub + Blätter. HOLZ: F am liegenden, ungeernteten Stamm -> +1 Holz (geerntet, Stamm weg, Stumpf bleibt). Selbsttest grün (gefallen/geerntet/holz 0->1).
  * PERFORMANCE: Wind-Streifen je Baum 18->12 (kaum Optik-Unterschied). Screenshot-Hooks __demo.frieren/nass/selbsttest (Software-WebGL sonst zu langsam zum Capturen).

- Runde 60 (Baum-Winkel/Look + Wald-Dichte; Autor fragte mesh vs. billboard): Klargestellt: unsere Bäume sind BEREITS Billboards (ez-tree EINMAL über macheBackofen aus identischem festem Kamerawinkel blick=(0,0.86,0.56)~57° gebacken) - kein Kipp-Bug, kein X/Z-Tilt, alle gleicher Winkel. Fällen ist schon Sprite-Rotation um den Stammfuß. Die Ungleichheit kam aus ez-trees gnarliness (Krummwuchs): branch.gnarliness[0] default 0.15 -> Stamm lehnt. Fix in baueBaum: gnarliness[0]=0.04, gnarliness[1]*0.6, force.strength 0.01->0.02 -> gerade, aufrechte, einheitliche Stämme. WALD-DICHTE: Platzierung jetzt über sanfte Noise-Zonen (dichter Wald <-> Lichtung/Waldrand, Wahrscheinlichkeit ~ d²), Mindestabstand 50px (kein Überlappungs-Matsch), Größenklassen (d>0.62 große alte Bäume, sonst Mischung). tsc grün.

- Runde 60 (Menü): "DORF IM WALD" in das Titelmenü aufgenommen (öffnet die Demo-Seite dorf.html via window.location). Dafür "BEWEGUNGS-PROBE" entfernt: Menüpunkt ersetzt + BewegungsProbe aus main.ts (Import + Szenenliste) raus + src/scenes/BewegungsProbe.ts gelöscht (auf ausdrücklichen Autorwunsch). Verifiziert: Menü zeigt den Punkt, Klick navigiert zu dorf.html.

- Runde 60 (Occlusion-Fade + X-Ray-Silhouette, Autorwunsch "Held hinter Bäumen/Wänden durchschimmern"): In dorfSim umgesetzt. METHODE A: in der Y-Painter-Liste werden Bäume, die VOR dem Helden liegen (b.y > held.y) UND dessen Körper-Rechteck mit ihrem Kronen-Rechteck überlappen, weich auf ~0.3 globalAlpha gefadet (b.fade lerpt mit dt*9, kein Poppen). METHODE B: ist der Held verdeckt, wird nach der Szene eine getönte Röntgen-Silhouette (Offscreen, source-in-Tint #aecbe8) bei 0.4 Alpha über ihn gelegt -> Garantie, dass er nie ganz verschwindet. Held-Rechteck ~44x60 um die Figur. rechteckeUeberlappen-Helfer. Verifiziert (Screenshot: Krone durchsichtig, echter Held + Axt scheint durch). Hinweis: nur in der Demo; fürs echte Spiel (CombatScene-Wände) müsste dasselbe in deren Renderer portiert werden.

- Runde 60 (Sturm-Wind aufs Gras + Moosboden in dichten Wäldern):
  * STURM-GRAS: Gras & Bewuchs nutzen denselben zentralen Wind-Wert wd=wind(now) wie die Bäume (gleiche Richtung/Phase/Böen -> kein Auseinanderlaufen). Gras-Sway-Multiplikator 3->6 (im Unwetter fast flach gedrückt), Pivot bleibt am Fuß (nur Spitze neigt), Bewuchs-Rotation 0.05->0.14, Saum-/Durchwachs-Gras am Weg von wd*2 auf wd*5.
  * MOOSBODEN: vorhandene dichteNoise auf Modulebene gehoben (Platzierung + Boden teilen sie). Moos-Karte moosCv (Welt/16, weich hochskaliert) = dunkelgrüner Schleier ~ Walddichte über dem Gras-Boden -> weicher Übergang (Noise). Gras-Büschel im Dichten spärlicher (skip ~ d) und kürzer (kurz-Flag, Höhe ×0.6), Blumen seltener im Dichten (invers). Boden ist gekachelte Pattern-Textur -> Moos läuft als hochskalierte Tint-Karte, kein harter Layer.
  * AUDIO/Stufe 4 (Blitz+Donner mit Sound-Sync) = OFFEN: braucht die Audiodateien vom Autor (Stufe-3-Sturm, Stufe-4-Donner); Blitz-im-Spiel wird an die Blitz-Zeitpunkte im Sound gekoppelt (leicht versetzt Blitz->Donner).

- Runde 60 (Occlusion abgeschwächt, Autorfeedback "zu aggressiv, kein Geist"): (1) Röntgen-Silhouette (Methode B) für Bäume KOMPLETT RAUS - kein getönter blauer Geist mehr; der echte Held scheint einfach durch die durchsichtige Krone (Fallout-Look). silCv/silCtx + heldVerdeckt entfernt. (2) Überlappungstest viel enger: statt 44x60-Helden-Box ein schmaler 24x34-Bereich um Kopf/Oberkörper gegen den OBEREN Kronen-Teil (w*0.6 x hh*0.55) -> nur der Baum direkt vor dem Helden fadet, nicht der halbe Hain. (3) Fade-Ziel 0.3 -> 0.55 (1 - fade*0.45), Krone bleibt als Baum lesbar. Verifiziert (Screenshot: echter Held mit Details durch eine leicht transparente Krone, nur ein Baum gefadet).

- Runde 60 (Böen-Welle + Stufe 4 Gewitter optisch + Donner-Logik):
  * BÖEN-WELLE: boeWelle(x,y,now) = ortsabhängiger Faktor (Wellenlänge ~1500px, läuft mit der Zeit) auf Gras, Bewuchs, Bäume und Saumgras -> eine Böe läuft als Welle durch, statt dass alle Halme synchron als Fläche klappen (Autor-Prüfpunkt).
  * STUFE 4 "Gewitter": Tasten jetzt 1/2/3/4 (klar/Regen/Unwetter/Gewitter, wetterZiel 0.05/0.42/0.78/1.0); WETTER_NAME +Gewitter (>0.9). Auto-Zyklus erreicht weiterhin gelegentlich Gewitter.
  * BLITZ (optisch, vor dem Ton gebaut): harte, kurze Aufhellung der ganzen Szene (rgba weiß-blau * blitz*0.55), schneller Abfall (dt*14, kein weiches Abblenden) + DOPPEL-Flash (zweiter schwächerer Spike nach ~0.1s). Zündet bei wetter>0.85 in zufälligen Abständen (4-13s).
  * DONNER mit VERZÖGERUNG (robuster als Audio-Zeitmarken): das Spiel zündet den Blitz und legt einen Donner-Event in donnerQueue mit 0.3..2 s Verzögerung (nah=laut/früh, fern=leise/spät); spieleDonner(laut) ist AUDIO-PLATZHALTER (TODO: einzelne Donner-Samples je Blitz). Ambience-Loops (Stufe 2/3) kommen analog. Audiodateien muss der Autor beschaffen (CC0/Freesound), dann wird angehängt.

- Runde 60 (Look-Referenzen: Größe + Geerdet-Sein): (Etappe 1) BÄUME ~2,1x größer (Skala dicht 0.98-1.53, Rand 0.64-1.14) -> türmen über der Figur wie in den Referenzen; Mindestabstand 50->78, Kollision skaliert mit Baumgröße. KONTAKTSCHATTEN: schattenBild (weicher radialer Schatten, einmal gebacken) + kontaktSchatten() unter jedem stehenden Baum am Fuß -> Objekte sitzen im Boden statt aufgeklebt (Autor: "wichtigster Einzel-Fix"). Slider Baumgröße bleibt zum Feintunen. Hinweis: Zoom bleibt 1:1; für die weite Referenz-Ansicht (viele Bäume) wäre ein Kamera-Zoom-Out separat nötig.

- Runde 60 (Etappe 2: See). Entscheidung (Autorfrage): FEST platziert + STATISCH (eine definierte Stelle, kein Pegel-aus-Regen) - sauberer als prozedural, wetness bleibt für Pfützen. see = {cx,cy,rx,ry} bei (0.8W,0.79H), groß. Uferintegration (der eigentliche Hebel): unregelmäßige Noise-Uferlinie (kein Kreis), nasser dunkler Schlammsaum (Ufer 1.1x), Tiefengradient (Mitte tief/dunkel, Rand heller), gedämpfte Himmel-Schlieren statt echter Spiegelung, Regen-Ringe (seeRinge), Schilf/Rohrkolben am Ufer (mit Böen-Welle) + Seerosen innen am Rand, Dunst über dem Wasser. Bäume/Gras/Blumen aus dem See ausgespart (imSee/nahSee). CLUSTERING (Teil): Blumen bevorzugt an Wasserkante/Wegrand statt gleichverteilt. OFFEN/nächste Etappe: Büsche (ez-tree Bush, Occluder) + Felsen (prozedural, solide Kollision, geclustert) mit Kontaktschatten.

- Runde 60 (Outline für verdeckte Wesen + stärkere Sturm-Biegung):
  * BÄUME BIEGEN STÄRKER: Biegungs-Multiplikator größenproportional (wd*sk*40, Blight*16) statt fix -> im Sturm deutlich sichtbares Biegen (vorher bei den großen Bäumen proportional zu schwach).
  * OUTLINE statt Geist-Silhouette: verdeckte Wesen bekommen eine dünne FARBCODIERTE Kontur (Held kühl-blau #bfe0ff, NPC neutral-gelb; Gegner später rot), Figur innen bleibt normal. Technik: figCv in 8 Richtungen +2px in umrissCv, source-in-Tint, unter die normale Figur. Nur bei Verdeckung gerechnet (istVerdecktVomBaum, gleicher Test wie Occluder-Fade), weich gefadet (w.umriss-Lerp). Hühner OHNE Outline (Autor-Geschmack: kleine Tiere wirken sonst unruhig). Verifiziert.

- Runde 60 (HP-Fäll-/Hack-System statt Ein-Klick): Konstanten FAELLEN (hpProGroesse 80, schaden 30, hackHpProGroesse 210, holzProGroesse 1.9) - leicht justierbar.
  * STEHENDER BAUM: hp/maxHp ~ Größe. Jeder F-Schlag -30, grüner Fortschrittsbalken am Stammfuß (nur wenn hp<maxHp). Erst hp<=0 -> starteFall.
  * FALL langsamer/schwerer: FALL_G 7.5->5.2 (Rotation um den Fuß ~1.5s + Nachfedern).
  * LIEGENDER STAMM: eigener, höherer hackHp (~Größe, deutlich länger als Fällen). Jeder F-Schlag -30; Holz fällt in ETAPPEN ab (Schwelle aus holzGesamt) mit Splitter-Partikeln; bei hackHp<=0 Rest-Holz + Stamm weg (b.weg, nur Stumpf bleibt). Gelber Hack-Balken.
  * HOLZ je BAUMGRÖSSE: holzGesamt = max(1, round(skala*1.9)) -> kleine ~1, große ~2-3; größere brauchen mehr Schläge UND mehr Hacks. (Erklärt Holzfäller-NPC ~8-12 Holz/Tag.) Selbsttest grün: schlaege=3, hacks=8, holz 0->2, weg=true.
  * OFFEN/Konzept (für echtes Spiel / Etappe 3): Stein/Erz/Gold-Knoten in mehreren Abbau-Stufen mit sichtbarem Zerfall (voll -> Nuggets geleert -> Brocken bröckelt) - kommt mit den Felsen.

- Runde 60 (Bugfix: NPCs leuchteten auf freier Fläche): Ursache = durch die ~2,1x großen Bäume reichte die KRONEN-BOUNDING-BOX weit über den sichtbaren Baum hinaus; Wesen bis ~200px neben/unter einem großen Baum galten fälschlich als verdeckt -> Outline. Fix: unterBaum() jetzt DISTANZBASIERT (dx < 30+bw*0.04, dn 6..170) statt Box-Überlappung -> nur Wesen, die WIRKLICH nah/hinter einem Stamm stehen, werden verdeckt; derselbe Test treibt Outline UND Occluder-Fade (konsistent). rechteckeUeberlappen entfernt (ungenutzt). Outline-Deckkraft auf *0.7 gesenkt (dezent, kein Leuchten). Verifiziert: Lichtung-NPCs ohne Outline, Held hinter Baum weiterhin mit Outline.

- Runde 60 (Held im dichten Wald sichtbar + Verteilung, Autorwunsch): Problem = sehr hohe Bäume -> Kronen überdecken die "Lichtung"; Held mittendrin unsichtbar, NPCs galten als verdeckt. Lösung (Autorvorschlag): Lichtung/Weg samt KRONEN-ÜBERHANG freihalten (Platzierung prüft zusätzlich den Kronen-Nordpunkt kroneN = y-512*skala*0.42 gegen Lichtung/Weg) -> dort offener Himmel; dafür dichter im Wald (Ziel 230 Bäume). Occlusion getrennt: FADE = unterBaum (distanzbasiert, nur der Baum direkt dahinter wird transparent), OUTLINE = unterKrone (Kronen-Kern, greift im dichten Wald). Logik-Check: Lichtung nicht verdeckt, Wald teils verdeckt (Outline). Verifiziert (Lichtung-Screenshot offen, NPCs ohne Leuchten).

- Runde 60 (Etappe 3a: Felsen + Stein-Abbau in Stufen): Felsen = prozedurale Billboard-Sprites (macheFels, 3 Größen, facettiert + Moos oben), in CLUSTERN platziert (Haufen verschiedener Größen), abseits Lichtung/Weg/See, nicht in Stämmen; Kontaktschatten; SOLIDE Kollision (Radius schrumpft mit Abbau). STEIN-ABBAU in STUFEN (Autorwunsch): F-Schlag -> hp runter; sichtbarer Zerfall stufe 0 voll -> 1 Risse (kleiner+Risslinien) -> 2 Geröll -> 3 entfernt (Geröll-Rest); je Stufe Stein-Ertrag + Splitter-/Brocken-Partikel; Stein/HP ~ Felsgröße. STEIN-Konstanten justierbar. F-Aktion: erst Fels in Reichweite abbauen, sonst Baum. Selbsttest: Größe1 = 5 Schläge, 3 Stein, Stufen 0/1/2/3. tsc grün.

- Runde 60 (Etappe 3b: Büsche): ez-tree Bush-Presets (Bush 1/2/3) über denselben Backofen wie die Bäume gebacken -> 3 Busch-Sprites (verifiziert: keine leer). Büsche = BEGEHBARE Occluder (keine Kollision): tiefensortiert mit Kontaktschatten, leichter Occluder-Fade wenn der Held direkt dahinter steht. CLUSTERING (Autorpunkt): Büsche bevorzugt UM Felsen (Anker) + locker im Wald (dichteabhängig), nicht auf Lichtung/Weg/See. Stats: 212 Bäume, 20 Felsen, 57 Büsche. Etappe 3 (Büsche + Felsen + Stein-Abbau) komplett. tsc grün, im Browser geprüft (Felsen+Büsche clustern).

- Runde 60 (Funktionsfehler + Tunings aus der großen Liste):
  * PUNKT 3 BUGFIX Sturm-Wind: vorher gab boe nur alle ~31s einen Ausschlag, grund kreuzte 0 -> "kurz stark, dann nichts". Jetzt im Sturm (wetter>0.5) ein KONSTANT starker, gerichteter Term (konstant, kreuzt nie 0) + schnelle Böen obendrauf -> Bäume bleiben dauerhaft gebogen.
  * PUNKT 1 F-Ziel-Logik: zielObjekt() liefert das NÄCHSTE interagierbare Objekt JEDES Typs (Fels/liegender Stamm/stehender Baum) im Wirkradius; aktionF wendet die passende Aktion an (abbauen/hacken/schlagen). HIGHLIGHT: dezenter pulsierender Ring am anvisierten Objekt, damit man vor dem F-Druck sieht, was getroffen wird.
  * PUNKT 2 Stufe 4 härter: Tropfen-Pool 420->620 (sichtbarer Anteil skaliert mit Wetter), Baum-Biegung skaliert mit dem jetzt konstant starken Sturm-Wind.
  * PUNKT 5 Fall-Tempo-Regler: Slider in dorf.html -> fallG (höher = schneller fallen).
- OFFEN/MERKEN (Autor, für Live/Dorf-Export): bei Starkregen gehen viele NPCs ins Haus, bei Sturm sind keine NPCs mehr draußen (Wetter-abhängiges NPC-Verhalten). Erst relevant, wenn die Szene ins echte Spiel/Dorf/Wälder exportiert wird.
- OFFEN (aus der Liste, nächste Blöcke): P4 gefällter Baum als korrektes Liege-Sprite (Krone in Fallrichtung gestreckt statt rotiertes Steh-Sprite -> braucht gebackene Liege-Variante); P6 Stümpfe axt-typisch splittrig + Varianz; P7 Felsen/Erze detaillierter + Erz-Knoten mit Mineral-Adern; i18n-Vorbereitung (t()/Sprachdatei); P8 BIOME (Wald/Wiese/Fluss/Sumpf-Moor/Fels-Berg/später Schnee) über Noise-Biomkarte. ANHÖHE/Berg: optisch vs. begehbare diskrete Höhen-Level - hängt an Autorentscheidung (siehe Frage).

- Runde 60 (Sprite-Qualität P6+P7): P6 STÜMPFE axt-typisch: unregelmäßiger/splittriger Umriss, Kerbschnitt (Keil) + hochstehende Splitter, leicht versetzte Jahresringe; 4 gebackene Varianten + Position-Hash für Auswahl + Rotation -> nicht alle gleich. P7 ERZ-KNOTEN: ~30% der Felsen sind Erz (gold/eisen/kristall) mit Mineral-Adern/Einsprengseln in Erzfarbe (deterministisch, leichtes Glitzern); Abbau gibt ERZ nach Sorte (erzVorrat) statt Stein, Splitter in Erzfarbe; HUD zeigt Holz/Stein/Erz. Abbau-Test: 20 Felsen -> 51 Stein + Gold5/Eisen13/Kristall8. Mountain-Entscheidung des Autors: BEGEHBARE diskrete Höhen-Level (für den Anhöhe-Block gemerkt). Nächste Blöcke: P4 Liege-Sprite + BIOME + i18n.

- Runde 60 (Stumpf-Fix + viel stärkerer Sturm + Biom-System):
  * BUGFIX Stümpfe: die Rotation (b.x*0.7+...) ließ die flachen Top-Down-Stümpfe wie schräg liegende Klötze wirken -> Rotation RAUS, Stümpfe bleiben aufrecht; Varianz nur über 4 axt-typische gebackene Varianten (Position-Hash). (Autorbeschwerde.)
  * STURM viel stärker: Biegungs-Multiplikator 40->78 (Blight 16->30) + Wind-Schwankung im Sturm deutlich kräftiger/schneller (mehrere Sinus-Terme) -> Bäume schwingen heftig hin und her. Fall-Tempo-Slider-Minimum 0.4->0.12 (noch langsamer fallen möglich, Autorwunsch).
  * BIOME (großer Block): Noise-Biomkarte biomAt() = Wald/Wiese/Moor/Fels. Biom-Boden-Karte (niedrig aufgelöst, weich geblendet, hochskaliert) ersetzt die Moos-Karte -> je Biom eigene Boden-Tönung (Wald moosig, Moor dunkelbraun, Fels grau, Wiese Grundgras), weiche Übergänge über die Noise-Kante. Platzierung biom-abhängig: Bäume dicht im Wald, spärlich in Wiese/Moor, fast keine im Fels; Moor = tote Bäume (blight). Felsen-Cluster bevorzugt im Fels-Biom. Blumen nur Wiese/Wald. tsc grün. OFFEN: Moor-Schilf/Nebel, P4 Liege-Sprite, i18n.

- Runde 61 (Block A: üppiger, geschichteter, dichte-gesteuerter Bewuchs):
  * MEHRERE HÖHEN-EBENEN (Autorwunsch "Referenz-Look"): EBENE 1 kurzes Bodengras (dicht, überall außer Pfad/See; kürzer im dichten Wald), EBENE 2 hohes Gras als eigene Büschel-Sprites (7 Halme via quadraticCurve, stärkerer Sway), EBENE 3 Blüten + verstreute Kräuter/Klee.
  * ANKER-CLUSTERING: anker-Liste = See-Ufer + Felsen + jeder 6. Pfad-Mittelpunkt; ankerNah(x,y) 0..1 (1 = innerhalb 160px). Hohes Gras und Blüten clustern an Ankern (dicht an Wasser/Felsen/Weg, spärlich auf freier Fläche) statt gleichmäßig.
  * BLÜTEN IN FARB-GRUPPEN (Autorwunsch): je Cluster EINE Farbe (gelb/rosa/weiß/lila), 90 Cluster mit 3-8 Blüten, nur Wiese/Wald. 6 gebackene Bewuchs-Sprites (4 Blütenfarben + Kraut + Klee).
  * DICHTE-REGLER (Autorwunsch "wieder einen Regler"): neuer Slider "Bewuchs" (0..1.4) -> bewuchsDichte. Jede Pflanze trägt ein festes r (0..1); beim Zeichnen `if (item.r > bewuchsDichte) continue;` -> Regler dünnt live aus/füllt auf, ohne Neuverteilung. Default 1.0.
  * Verifiziert im Browser (Crop um den Helden, Dichte 1.4): alle 3 Ebenen sichtbar - Bodengras flächig, hohe Gras-Büschel als hellere vertikale Cluster, rosa Blüten-Gruppe. tsc grün.

- Runde 61 (Block B: Brücke über fließenden Fluss):
  * FLUSS (fließendes Wasser): Polyline von oben quer über den Weg, mündet in den See (See deckt die Mündung). Wasser wie der See (dunkle Grundfarbe + tiefe dunkle Mitte als breiter Strich), ABER mit FLIESS-TEXTUR: ~170 scrollende Strähnen, die flussabwärts laufen (s += spd, mod flussLen) und entlang der lokalen Flussrichtung gezeichnet werden -> klar erkennbare Strömung. Ufer wie am See (nasser Schlammsaum + helle Schaum-Uferkante + Schilf mit Wind-Sway).
  * STROMSCHNELLEN: Steine im Flussbett; an jedem Stein oszillierender weißer Schaum stromabwärts (5 Tupfen, Phase über die Zeit + seitliches Wackeln).
  * BRÜCKE: liegt automatisch auf der Fluss-Weg-Kreuzung (Fluss-Sample mit min. Weg-Abstand), Deck folgt der WEG-Richtung, Spannweite = Flussbreite/sin(Winkel)+Ufer. Deck = Planken QUER zur Laufrichtung (uneben/versetzt, 5er-Palette, Fugen, Maserung, Astlöcher) + Pfeiler ins Wasser + Bordkanten. Zwei Geländer (Pfosten+Handlauf+Holm).
  * TIEFENSORTIERUNG (Autorwunsch "Held läuft drüber"): Deck + HINTERES Geländer werden VOR den Wesen gezeichnet (liegen darunter/dahinter); das VORDERE Geländer kommt als eigener Eintrag (y = vordere Deckkante) in die Tiefensortierung -> Held läuft zwischen den Geländern, vorderes Geländer verdeckt ihn an der vorderen Kante. Verifiziert: Held steht auf dem Deck zwischen den Geländern.
  * KOLLISION: imFluss(x,y) blockiert in frei(), AUSSER aufBruecke(x,y) -> Fluss nur über die Brücke querbar. Fluss aus allen Platzierungen ausgenommen (Bäume/Felsen/Büsche/Bewuchs/Pfützen), analog zum See.
  * tsc grün; im Browser verifiziert (Held auf der Brücke, Fluss strömt darunter, Schaum an Steinen).

- Runde 61 (Waldboden deutlicher absetzen - Autorfeedback "links wie Wiese mit Bäumen statt Waldboden"):
  * BODEN FOLGT DER DICHTE: Waldboden-Tint hängt jetzt an DERSELBEN dichteNoise-Map wie die Bäume (Schwelle sst(0.46,0.7) ~ Baum-Onset 0.5) -> Boden und Bewuchs fahren GEMEINSAM hoch (vorher blieb der Boden Wiesengrün, während der Bewuchs schon dicht war).
  * STÄRKER + BRÄUNLICH: Tint-Alpha im dichten Bereich 0.62 -> bis 0.9 (vorher zu schwach); Waldboden-Farbe von dunkelgrün [20,32,15] auf erdig-braun [31,27,15] (Laub/Nadeln/Erde) -> wirkt wie Waldgrund, nicht wie schattiges Gras. Leichte Fleckung (hashCell) gegen zu flachen Look.
  * WALDBODEN-DETAIL-SPRITES (dichtegesteuert, ~viel im Wald, kaum offen): 4 gebackene Typen - Falllaub-Fleck, Totholz/Ast (mit Kontaktschatten), kahle Erdstelle, Kies-Cluster. Brechen den flachen Tint auf. Zusätzlich Kies-Cluster an den Felsen.
  * GRAS/BLÜTEN IM DICHTEN WALD SPÄRLICHER: Bodengras-Skip d*0.55 -> d*0.72; hohes Gras im dichten Wald (d>0.6) zu 60% raus; Blüten im dichten Wald (d>0.62) zu 70% raus.
  * KLEINE STEINE (Autorpunkt "gleichförmig/aufgesetzt"): Weg-Steine jetzt in CLUSTERN (2-4) statt gleichförmig verstreut + weicher Kontaktschatten -> geerdet wie die großen Felsen. Kies-Detail-Cluster ebenfalls mit Kontaktschatten.
  * Verifiziert: dichter Wald (d=0.78) = brauner erdiger Waldgrund mit Laub/Erde-Flecken; offene Wiese (d=0.15) bleibt grün. tsc grün.

- Runde 61 (Anhöhe/Berg im Norden - Autorwunsch "im Norden geht es einen Berg hoch bis Schnee; erweitere die Karte"):
  * KARTE NACH NORDEN ERWEITERT: Welt-y reicht jetzt von NORD_Y=-900 (Gipfel) bis WELT_H=1800 (Süd). Bestehender Inhalt (Wald/Dorf/See/Fluss) bleibt unverändert bei y>=0; der Berg liegt im neuen Band y<0. Kamera-Klemme nach oben auf NORD_Y, Bewegungsgrenze in frei() auf NORD_Y+30. (Negativ-y statt alles zu verschieben -> minimal-invasiv, keine Koordinaten-Umrechnung.)
  * DISKRETE HÖHEN-LEVEL (Autorentscheidung Runde 60 "begehbar, diskrete Level"): BERG_NIV=5 Stufen. Je Stufengrenze eine wellige KLIPPE (klippeY) mit 1-2 PÄSSEN (Lücken). imBergWall() macht die Klippen SOLIDE (außer im Pass) -> man steigt im Zickzack durch die Pässe Stufe für Stufe hoch. bergNiveau() = Höhenstufe eines Punktes.
  * RENDERING: gestufte Bänder von Fuß->Gipfel (höhere überdecken die Klippe der tieferen), Farbverlauf Gras/Fels -> Geröll -> Schnee (lvl0-1 grünlich, lvl2 grau, lvl3-4 weiß). Klippen-WAND (16px, dunkel) an jeder Süd-Kante -> 2.5D-Stufenlook; Pässe als begehbare Streifen sichtbar. Schnee-Glitzer auf den oberen Stufen.
  * INHALT: schnee-bestäubte Bergtannen (macheTanne, 3 Schneestufen, tiefensortiert mit dem Helden) v.a. unter der Baumgrenze; Geröll/Felsbrocken (oben verschneit). Über lvl>=3 kaum Bäume (Baumgrenze).
  * SCHNEE-WETTER: driftende Flocken, nur wenn der Berg im Bild ist (camY<0), nach oben dichter. Eigener Schirmkoordinaten-Pool.
  * Verifiziert: Gipfel = verschneiter Alpenhang mit Stufen/Klippen/Pässen, Schneetannen, Geröll, Schneefall; Fuß = natürlicher Übergang Wald->Vorberg. tsc grün.

- Runde 61 (Moor-Feinschliff: Schilf + Nebel auf dem Moorboden - eigenständig aus der Warteschlange):
  * MOOR-SCHILF: Rohrkolben/Schilf in Clustern (2-5) über dem Moorboden (biomAt==='moor'), ~40% totes/braunes Schilf; sway im Wind wie das See/Fluss-Schilf. Gezeichnet in der Vegetations-Ebene.
  * MOOR-NEBEL: bodennahe Nebelschwaden, an Moor-Zentren verankert (Raster 95px, wo moorNoise>0.68), driften leicht (sin/cos über die Zeit), Alpha pulsiert (Basis 0.24, im Regen mehr). Gezeichnet NACH der Vegetation, VOR den Wesen -> tote Bäume/Schilf/Held ragen aus dem Dunst heraus. ~33 Schwaden.
  * Verifiziert: Moor = tote Bäume + Schilf, die aus driftendem Bodennebel ragen - sumpfige, düstere Stimmung. tsc grün.

- Runde 61 (P4: gefällter Baum als echtes Liege-Sprite - eigenständig):
  * BACKE-LIEGE: pro Baumart wird zusätzlich eine LIEGE-Variante gebacken - der 3D-Baum wird um die Z-Achse umgelegt (-90°, Stamm waagerecht nach +X, Krone in Fallrichtung gestreckt) und so durch den Backofen gerendert. Ergebnis: echtes Liege-Sprite (Stamm am Boden, abgeknickte Krone) statt rotiertem Steh-Sprite.
  * BUGFIX beim Backen: backeLiege muss die Skalierung VOR dem Messen zurücksetzen (obj.scale=1), sonst misst Box3 die schon skalierte Größe -> doppelte Skalierung -> Baum 100 Einheiten -> vom Backofen (far=60) geclippt -> LEERES Sprite. (Per Sprite-Atlas gefunden und verifiziert.)
  * zeichneGefällt: FALLEND weiter das Steh-Sprite rotieren (natürliche Fallbewegung); GELEGT das Liege-Sprite, Stammende am Stumpf verankert, per scale(richtung,..) für Links-/Rechtsfall gespiegelt, minimaler Aufprall-Stauch.
  * Verifiziert: Sprite-Atlas zeigt für alle 8 Arten korrekte Liege-Sprites (Stamm + gestreckte Krone, Kiefer besonders deutlich). tsc grün.

- Runde 61 (i18n-Vorbereitung - eigenständig, letzter Punkt der Warteschlange):
  * NEUE Sprachdatei src/data/i18n.ts: zentrale Schlüssel->Text-Tabelle (Deutsch als Referenzsprache) + t(key, vars?) mit {platzhalter}-Ersetzung + setLocale/getLocale. BEWUSST ohne Bibliothek (Autorwunsch "noch keine Lib") - Struktur erlaubt später weitere Sprachen über EINE zusätzliche Tabelle. Spielertexte bleiben Deutsch (CLAUDE.md).
  * Dorf-Demo umgestellt: alle sichtbaren Strings laufen über t() - Canvas-HUD (Wetter/Nässe/Vorrat mit Platzhaltern), Wetterstufen-Namen, Lade-Text; HTML-Texte (Titel, Beschreibung, Regler-Labels) werden beim Start aus t() gesetzt (dorf.html hat dafür ids/spans). Keine fest verdrahteten Strings mehr im Code/Markup.
  * Muster für das echte Spiel vorbereitet: dort später texte.ts/dialoge.ts schrittweise auf t() umstellen. Verifiziert: alle Texte erscheinen korrekt aus der Sprachdatei. tsc grün.

- Runde 62 (Autorfeedback Bild "nein/so will ich das" + zu viele Sturm-Bäume):
  * FALL-OPTIK: Der Fall lief vorher über das rotierte STEH-Sprite -> bei flachem Winkel wirkte es schwebend/schräg ("nein"). Jetzt fällt der Baum, indem das LIEGE-Sprite um den Stammfuß von aufrecht (-FALL_ZIEL) nach flach (0) kippt - dasselbe Sprite über den ganzen Fall, Endlage korrekt flach am Boden ("so will ich das"). Per Sequenz-Render (aufrecht->flach) verifiziert: liest sich als kippender Baum, der flach liegen bleibt.
  * STURM-HÄUFIGKEIT (Autorwunsch "nicht reihenweise"): pro-Baum-Wurf je Frame raus (fällte ~3 Bäume/s!). Jetzt GLOBALER Timer: nur bei kräftigem Sturm (wetter>0.8, wd>1.4) fällt frühestens alle ~40-100 s EIN einzelner Baum, gewichtet (morsche/tote bevorzugt, große etwas eher), in zufällige Richtung. -> "ab und zu mal einer" statt Massensterben.

- Runde 62 (Wasser - Autorwunsch Option 3: Three.js-Textur backen, in 2D nutzen):
  * NEUER wasserBackofen.ts: rendert echtes THREE.Water (three/examples) + THREE.Sky (Himmel-Verlauf zum Spiegeln) orthographisch top-down in eine Folge Frames; kachelbare prozedurale Wellen-Normalmap.
  * WICHTIGE ERKENNTNIS: THREE.Water KACHELT NICHT (im Shader stehen Magic-Divisoren /103,/107,... -> nicht-ganzzahlige Sampling-Spanne, Naht beim Wiederholen). Daher KEINE Tiling-Nutzung. Lösung: der SEE ist begrenzt -> EINE gebackene Textur deckt den ganzen See ab (kein Kacheln nötig), Animation über Frame-Wechsel. Funktioniert sauber und sieht reflektierend/lebendig aus.
  * Top-Down hat wenig Fresnel -> erst mit Verlaufs-Himmel (THREE.Sky) zum Spiegeln + stärkeren Wellen-Normalen + Distortion werden die reflektierenden Wellen sichtbar. Über dem Tiefen-Verlauf gemischt (Alpha 0.6) + Mitte dunkel gehalten.
  * FLUSS bleibt beim eigens gebauten 2D-Flow: er windet sich, und die per-Sample-Strähnen folgen der Strömungsrichtung der Kurve - eine flache Three.js-Kachel könnte das nicht (und würde wegen Nicht-Kachelbarkeit Nähte zeigen). 2D-Fallback bleibt aktiv, falls der Backofen fehlschlägt.
  * Offen/Angebot an den Autor: falls er ÜBERALL (auch Fluss) konsistentes, schärferes Wasser will -> Option 1 (2D-Nachbau) wäre dann der portierbare Weg.

- Runde 62 (Wasser Option 1 - Autor: "Wasser gefällt mir nicht, bitte Option 1"): THREE.Water (Option 3) wieder RAUS (wasserBackofen.ts gelöscht, kein Three.js fürs Wasser mehr). Stattdessen reiner 2D-Kaustik-Schimmer:
  * macheWasserMuster(): kachelbare Wellen-Textur (Summe periodischer Sinus, höhere Frequenzen = feine Wellen), nur die KÄMME als dünne helle Linien (smoothstep 0.58..0.94) -> kein Flächen-Wash.
  * wasserGlanz(): zeichnet die Textur in ZWEI Schichten mit leicht verschiedener Drift additiv ('lighter') in die aktuelle Clip-Maske -> Interferenz = bewegtes Licht. Weltverankert (ctx schon -cam verschoben), tempo-/richtungs-parametrierbar. Kachelbar -> 1:1 ins 2D-Spiel portierbar.
  * SEE: dunkler Tiefen-Verlauf bleibt dominant + dezente Himmel-Spiegelung + schmale vertikale MOND-BAHN + sanfter Schimmer (tempo 0.5). FLUSS: gleicher Schimmer flussabwärts (Richtung 0.6/0.85) zusätzlich zu den richtungs-folgenden Strähnen -> See und Fluss sehen nach demselben Wasser aus.
  * Verifiziert: See = ruhiges, dunkles, fein schimmerndes Nachtwasser mit Mond; Fluss = fließender Schimmer. tsc grün.

- Runde 62 (Anhöhe liest sich flach - Autorfeedback "wie Höhenlinien-Karte"): Höhe deutlich sichtbarer gemacht (diskrete Stufen, wie vom Autor gewählt):
  * ECHTE HANGKANTE/WAND je Stufe statt dünner Linie: schattierte Wandfläche (faceCol, am Fuß zusätzlich abgedunkelt) + senkrechte Felsrisse (Striationen) + belichtete Plateau-Oberkante (heller Saum, Lichtrichtung von oben). Wandhöhe steigt mit dem Level.
  * DROP-SHADOW der höheren Stufe auf die tiefere Terrasse (zwei weiche Streifen südlich der Wand) - der vom Autor genannte stärkste Tiefen-Trick. Reihenfolge: tiefere Terrasse zuerst, dann Schatten + Wand der höheren Stufe darüber.
  * PÄSSE als begehbare RAMPE (Geröll-/Felssims) statt grauer Platzhalter-Kästen: Trapez mit Verlauf (oben hell -> unten dunkel), Trittstufen-Linien, deterministisches Geröll, helle Seitenkanten.
  * SCHNEE AUF DEN TANNEN-KRONEN: macheTanne mit größerer Schnee-Kappe + Schnee auf den Astspitzen; selbst die untersten Bergtannen leicht überzuckert (kalter Berg) -> keine "Sommerbäume im Schnee" mehr.
  * SCHNEE STATT REGEN am Berg (niedrige Prio): Regen blendet aus, je höher die Kamera (bergAnteil über camY) -> oben fällt nur noch Schnee.
  * Verifiziert: Stufen wirken als gestapelte Sims mit Wand+Schatten; Pass = Rampe mit Trittstufen/Geländer; Tannen mit Schneekronen; Schneefall oben. tsc grün. (Standbild - echtes Höhengefühl zeigt sich erst beim Hochlaufen.)

- Runde 62 (Sonnenschein als eigener Wetter-Zustand - Autorwunsch):
  * ANTWORT auf die Autorfrage: die düstere Stimmung ist ein GLOBALER Tint (Overlay rgba(12,18,24, 0.1+wetter*0.28) + Vignette, skaliert mit wetter) auf eher dunkler Asset-Palette. Also war Sonne "fast geschenkt" - nur ein weiterer Zielwert auf derselben Achse.
  * WETTER-ACHSE erweitert: wetter reicht jetzt von -1 (sonnig) über 0 (klar) bis 1 (Sturm); sonne = max(0,-wetter). Weich übergeblendet (kein harter Schalter). Tasten neu: 1 Sonne · 2 klar · 3 Regen · 4 Unwetter · 5 Gewitter. Zufalls-Wetter würfelt jetzt auch Sonne (~24%).
  * WARMER TINT (wichtigster Hebel): bei Sonne dunkles Overlay weg, stattdessen warmer Gold-Verlauf per 'overlay' (Helligkeit+Kontrast+Wärme) + sanfte Aufhellung per 'soft-light'; Vignette deutlich schwächer. Grüns wirken satter/wärmer.
  * GERICHTETE SCHATTEN: kontaktSchatten bei Sonne einheitlich nach rechts-unten versetzt + verlängert (= Sonne links oben). Zweitstärkster Sonnen-Trick.
  * GOD RAYS: 4 schräge, warme, langsam driftende Lichtschäfte ('lighter', sehr niedrige Deckkraft) - sparsam.
  * KEINE expliziten Kanten-Highlights (Autor-Warnung "Pfützen-Glühen") - Wärme kommt aus dem Tint, nicht aus Bloom.
  * REGEN->SONNE-Übergang emergent: weiche Achse + wetness verdunstet langsam -> kurz nach Regen sind Flächen noch nass und glänzen unter dem warmen Tint, bevor sie abtrocknen.
  * Verifiziert: sonnig = deutlich heller, warm, sattes Grün (vs. dunkel/blau bei Regen); dichter Wald golden belichtet. tsc grün.

- Runde 63 (God Rays raus + Tageszeit-System als eigene Achse):
  * GOD RAYS ersatzlos gestrichen (Autorwunsch). Optionaler Staub/Pollen-Ersatz bewusst weggelassen.
  * TAGESZEIT (eigene Achse, unabhängig vom Wetter): tag = Stunde 0..24, zyklisch (TAG_LAENGE = 200 s/Zyklus, Regler Tag-Tempo 0..3×, Regler Tageszeit zum Scrubben). berechneLicht(tag) interpoliert Keyframes -> Multiply-Farbe (Helligkeit+Temperatur), Tag-Aufhellung (soft-light), warmer Hauch (overlay, golden hour), Vignette, Sonnenstand (hoehe) + Schattenrichtung (dir).
  * WETTER MODULIERT obendrauf: Bewölkung (max(0,wetter)) zieht die Multiply-Farbe Richtung Grau + dämpft Helligkeit + unterdrückt gerichtete Schatten (diffus); klarer Himmel (max(0,-wetter)) hebt leicht. -> jede Tageszeit × jedes Wetter (Nacht+Sturm sehr dunkel, Mittag+Sonne hell, alles dazwischen).
  * GERICHTETE SCHATTEN an die Tageszeit gekoppelt: kontaktSchatten nutzt globale schDX/schLang aus Sonnenstand (tief = lang+seitlich, mittags = kurz) und -richtung (morgens/abends andere Seite); Bewölkung/Nacht unterdrücken -> diffus/zentriert.
  * Der frühere "sonnig"-Warm-Tint kommt jetzt aus der Tageszeit (warme Stunden), nicht mehr aus dem Wetter; sonne-Variable entfernt, klar8/bew8 in Schritt 8.
  * HUD zeigt Uhrzeit + Tageszeit-Name. Verifiziert: Morgen warm-dim, Mittag hell neutral, Goldene Stunde gold, Nacht tiefblau, Nacht+Sturm sehr dunkel/grau/Regen. tsc grün.

- Runde 63 (Bergzone komplett neu + Zufluchts-Station - Weg 1, Billboards, keine 2. Kamera):
  * ARCHITEKTUR-Entscheidung: bleibt in dorfSim (Nordband y<0), KEINE separate HTML (würde den Code zerfasern). Justierbare Werte im BERG-Objekt oben.
  * SERPENTINE: Switchback-Pässe (alternierende Seiten) + sichtbarer Serpentinen-Weg (bergPfad) zickzack Fuß->Gipfel, höhenabhängig Erde->festgetretener Schnee. Bewusst lang.
  * KLIPPEN/RISER (aus Runde 62 beibehalten - vom Autor gelobt): schattierte Fels-Wände + Drop-Shadow der höheren auf die tiefere Stufe + belichtete Oberkante.
  * BIOM-GRADIENT über die Höhe: Wald-Grün (Fuß) -> Fels-Grau (Vorberge) -> Schnee-Weiß (Gipfel), via bandCol + bergSchnee(y) (smoothstep).
  * BÄUME = ECHTE Billboard-Bäume (in baeume mit schnee?-Flag, y<0): zur Baumgrenze (BERG.baumGrenzeAb) ausdünnend, mit dezenter Schneekrone (schneeAufKrone). KEINE flachen Tännchen mehr (macheTanne/bergBaeume gelöscht).
  * FELSEN = ECHTE Fels-Sprites (in felsen mit schnee?-Flag) in Clustern + Schneehaube + Kontaktschatten. KEINE grauen Kugeln mehr (bergFelsen gelöscht).
  * GIPFEL-BACKDROP: ferne, schneebedeckte Gipfel + Himmel-Verlauf oben, mit Parallaxe (langsamer als die Kamera).
  * ZUFLUCHTS-STATION (Bauwerk, nur Bühne): größeres Berghaus auf einem Schnee-Plateau auf halber Höhe (wo der Weg sich verbreitert). Verschneites Giebeldach, Schornstein mit Rauch, WARM leuchtende Fenster+Tür (Kontrast zum kalten Schnee), Kontaktschatten. Wand solide (frei()), Süd-Tür + Innenraum begehbar.
  * BETRETBAR = DACH-AUSBLENDEN (Stardew-Variante; gewählt, weil die 2D-Canvas-Demo KEINE Innenraum-Szene/2.-Renderer hat - die Krypta/CombatScene laufen anders): huetteDach blendet Dach+Front weich aus, sobald der Held eintritt -> Innenraum sichtbar. INNEN reine Deko: Feuerstelle (warmes Licht), Pritschen, Lager-Kisten/Fass. KEINE Funktion (keine NPCs/Zähler/Kapazität).
  * BEWUSST NICHT (kommt separat): Flucht-System, NPC-Pathfinding, Beherbergungs-Logik, Überrannt-Auslöser, Phasen.
  * Verifiziert: Hütte = warmer Landmark im Schnee; Eintreten blendet das Dach aus -> Feuerstelle/Innenraum; Hang = echte Bäume/Felsen schneebestäubt, Serpentine, Biom-Gradient. tsc grün.

- Runde 63 (Autorfeedback Baumstamm-Sichtbarkeit + Weg-Rand):
  * FRAGE beantwortet: die Stamm-Sichtbarkeit kam von der EZ-TREE-PRESET-Wahl. Eichen/Esche = dichte, tief hängende Krone -> Stamm verdeckt; Aspe (#8) = höhere/lichtere Krone -> Stamm sichtbar. Der Autor mag den sichtbaren Stamm.
  * FIX: branch.length[0] *1.05 -> *1.6 (längerer Stamm) -> die Krone sitzt bei ALLEN Arten höher, der Stamm ist sichtbar (Lollipop-Look, einheitlich). Per Sprite-Atlas verifiziert.
  * WEG-RAND: Baum-Ausschluss am Weg von PFAD_BREITE*0.7 auf *1.5 erhöht (Stamm UND Kronen-Überhang) -> mind. eine Wegbreite links/rechts baumfrei. Gleiches am Berg-Serpentinen-Weg (BERG.pfadBreite*0.75 -> *1.5). Verifiziert.

- Runde 64 (Autorwunsch "kristallklarer Bach im Wald"): Ja, geht in 2D ohne Graben/Höhe. NEUER Bach (eigene Wasserlogik vom Fluss): schmaler, flacher Waldbach durch den Westwald, mündet in den Fluss. KRISTALLKLAR = sichtbares helles Kiesbett (Kiesel) + dünner, klarer Wasser-Tint (man sieht auf den Grund) + flussabwärts laufende Licht-Kaustik-Strähnen + Schaum an ragenden Steinen + helle Schaum-Uferkante. Begehbar (flach) -> beim Durchwaten Wasser-Spritzer. Aus allen Platzierungen ausgenommen (Bäume/Felsen/Büsche/Gras/Blüten). Verifiziert: helles, klares, fließendes Bächlein vs. dunkler Fluss.

- Runde 64 (Spieler-Sichtfenster - Autorwunsch "Held im dichten Wald immer erkennbar"): weiches, spielfigur-großes Fenster um den Helden, in dem die VOR ihm gezeichneten Bäume durchsichtig werden. Technik ohne 2. Renderpass: direkt nach dem Zeichnen des Helden wird die Region (Held + Hintergrund, noch VOR den Front-Bäumen) in ein Offscreen kopiert + mit einem gefederten Radial-Fenster maskiert; nach der Tiefensortierung wird dieses Fenster zurück-komponiert -> Front-Bäume im Fenster weg, Held klar sichtbar. Umriss/Rand bleibt (im Fenster mitgesichert). Größe per Regler "Sicht-Fenster" (80..220 px).
- Runde 64 (Bäume zeigen Stamm + mehr/höhere Nadelbäume - Autorfeedback "wieder Bäume ohne Stamm"):
  * Stamm-Sichtbarkeit kam von der Preset-Wahl. FIX: branch.length[0] weiter erhöht (Laub *2.0, Nadel *2.5) -> Krone sitzt bei ALLEN Arten hoch, Stamm sichtbar.
  * SORTEN neu gemischt: 2 dichte Eichen raus, 3 NADELBÄUME (Pine, versch. seeds) rein -> mehr Fichten/Kiefern (beliebt, schnellwüchsig). nadel[]-Flag je Art; Nadelbäume spawnen mit *1.45 Skala = deutlich höher.
- Runde 64 (Sturm-Stärke-Regler - Autorwunsch "fetter Regler", Bäume biegen sich zu wenig): neue Konstante sturmStaerke (Default 1.5) multipliziert die Baum-Biegung; Regler "Sturm-Stärke" 0..4×. Default schon stärker als vorher.

- Runde 64 (jquery.ripples geprüft + Bach FLIESSEND gemacht):
  * jquery.ripples: NICHT geeignet (rippelt das background-image eines DOM-Elements, nicht maskierte/scrollende Canvas-Bereiche; braucht jQuery+WebGL; nicht in die Tiefensortierung einfügbar; überträgt sich nicht ins Phaser-Spiel; ist "stilles Wasser zum Anstupsen", kein fließender Bach). IDEE (Refraktion) übernommen, in 2D nachgebaut.
  * BACH FLIESSEND (Autorwunsch): REFRAKTIONS-WOBBLE - Kiesel werden von flussabwärts wandernden Wellen (Phase = s - time) quer verschoben -> Blick durchs fließende Wasser. Plus FLIESSENDE OBERFLÄCHENWELLEN: helle Quer-Kämme + dunkle Täler wandern flussabwärts. Zusammen mit den Kaustik-Strähnen liest sich der Bach jetzt als fließendes Wasser.

- Runde 64 (BUGFIX Autorbild "Bäume lösen sich im Sturm auf"): Regression aus dem Sturm-Regler. Ursache: bend konnte ~500px erreichen -> das Streifen-Biegen (zeichneImWind) scherte den Baum zu einem dünnen Schliere = "aufgelöst". FIX: bend WEICH begrenzt per tanh auf max ~Baumbreite (Math.tanh(bend/maxB)*maxB) -> der Baum biegt sich weiterhin STARK (auch bei Sturm-Stärke 4×), bleibt aber als zusammenhängender Baum; Streifen-Überlappung leicht erhöht. Verifiziert bei max. Sturm.

- Runde 64 (Wasser-Prototyp: echte Wellen-Simulation + Tiefe/Grube + Strömung - großer Autorwunsch):
  * WELLENFELD-SIMULATION (See): klassischer 2D-Höhenfeld-Ripple-Algorithmus (jede Zelle = Mittel der Nachbarn minus Vorwert, gedämpft 0.966). Störungen von REGENTROPFEN und vom WATENDEN Helden/NPC (imSee) -> echte, sich ausbreitende Ringe. Render = Specular aus dem Höhen-Gradienten (Hang Richtung NW-Licht hell, Täler dunkel), im See-Clip. Das ist die "echte Simulation in unserem Stack" (statt SPH/PixiJS - siehe vorige Runde). Dev-Hooks zumSee/seeTropfen.
  * TIEFE/GRUBE (wie die Schnee-Stufen): neue Helfer uferBoeschung (außen flach ins Gras -> nach innen dunkler, 3 Bänder + belichtete Gras-Lippe) + uferWand (innerer Wand-Schatten im Clip). Auf SEE, FLUSS und BACH angewandt -> das Wasser liegt sichtbar VERTIEFT in einer Rinne, nicht flach auf dem Rasen.
  * STRÖMUNG/NEBENFLUSS: Bach mündet sichtbar in den Fluss (Schaum/Verwirbelung an der Mündung); Fluss mündet in den See (See deckt die Mündung). Bach-Refraktion (vorige Runde) bleibt.
  * Verifiziert: See in Grube + Wellenringe von Tropfen/Held; Fluss + Bach in vertiefter Rinne. tsc grün. (Wellen leben in Bewegung - Standbild zeigt einen Moment.)

- Runde 64 (Wasser-Überarbeitung nach Autorfeedback "künstliche Ripples schrecklich, ein Effekt wandert nach oben, mehr Zwischenfarben"):
  * KÜNSTLICHE RIPPLES RAUS: Bach-Querkämme (Oberflächenwellen) + Kiesel-Refraktions-Wobble entfernt -> ruhiger, klarer Bach. Fluss: wasserGlanz (die diagonale Kaustik, deren zweite Schicht AUFWÄRTS = gegen die Strömung driftete) entfernt; nur noch sanfte Fließ-Strähnen flussabwärts.
  * RICHER TIEFEN-VERLAUF (volle Palette, viele Zwischenfarben): neue tiefeFarbe(d) (9 Anker grün->teal->blau->marineblau) + kanalTiefe() = verschachtelte Füllungen entlang des variabel-breiten Kanals (Rand flach/grünlich -> Mitte tief/blau). Fluss 16 Stufen, Bach 14 (klar, tiefeBachTint translucent), See radial 11 Stops. uferBoeschung von 3 auf 6 Bänder verfeinert.
  * TIEFE SICHTBARER: See-Spiegelung + Schimmer (wasserGlanz 1.15->0.5) gedämpft, damit der Tiefen-Verlauf dominiert (Mitte dunkel).
  * ÜBERGÄNGE: alle Wasser nutzen jetzt DIESELBE Tiefen-Palette -> Fluss/See passen farblich zusammen; Bach mündet mit Schaum in den Fluss, Fluss (vom See gedeckt) in den See.
  * Verifiziert: ruhiger klarer Bach in der Rinne, Fluss mit sattem Tiefen-Verlauf ohne Upstream-Drift, See tief mit feinem Verlauf. tsc grün.
- Runde 65 (fließender Übergang Fluss -> See nach Autorfeedback "keine fließenden übergänge zwischen den flüssen und dem see"):
  * PROBLEM reproduziert: Der See deckt das Fluss-Ende; dazwischen lag der braune See-Böschungs-Ring -> Fluss und See sahen wie zwei getrennte Gewässer mit Land dazwischen aus.
  * FIX: neue zeichneMuendungSee() legt eine Mündungs-Rinne über genau diese Lücke. Sammelt die Fluss-Mittelpunkte im Eintritts-Korridor (See-Ellipse 0.13..1.36) und füllt sie mit kanalTiefe()/tiefeFarbe() - DERSELBEN Tiefen-Palette wie Fluss UND See. So taucht die tiefe Fluss-Rinne nahtlos in die See-Mitte ein; dezenter Wand-Schatten an den Flanken (Grube). Wird NACH dem See gezeichnet, überdeckt den braunen Ring nur am Eintritt.
  * Schmale, tiefe Rinne (Delta-Weitung nur 1.32x) statt breitem Delta gewählt -> die dunkle Mitte verbindet Fluss-Tiefe mit See-Mitte, statt einen hellen Flach-Fleck zu erzeugen. Leicht änderbar (wAt-Faktor, r2-Schwellen).
  * Verifiziert per Screenshot: Fluss fließt jetzt als durchgehende, tiefer werdende Rinne in den See (vorher Land dazwischen). tsc grün, 181 Tests grün.

- Runde 71 (Flüssigkeits-Shader portiert aus fluss.html - Wasser + Blut, additiver Overlay-Test):
  * NEUES MODUL src/world/fluessigkeitsShader.ts: der Fragment-Shader aus fluss.html als Phaser-Shader (this.add.shader). Maus-Interaktion (u_points/inter()) ENTFERNT (ruhiger Fluss). Zwei Paletten (Wasser/Blut), zwei Presets, baueFlussbett() als Phaser-Canvas-Textur (iChannel0).
  * UNIFORM-NAMEN: Phaser stellt automatisch time (vergangene Sekunden), resolution (vec2 px) und iChannel0 (Sampler) - NICHT iTime/iResolution (das sind Shadertoy-Namen, die Phaser NICHT benutzt). uv = fragCoord/resolution.xy (fragCoord ist Phasers Default-Varying). Auftrag sagte "u_time->iTime"; korrekt für Phaser ist time/resolution. Neue Custom-Uniforms: uColor (Einfärbung), uFlowSpeed, uTurbulence (+ uDeep/uSky/uSpec/uLight/uAmbient/uEdgeFade pro Preset).
  * EINE geteilte BaseShader-Instanz (ein Compile), pro Quad eigene Uniform-Kopie (Phaser deep-extended this.uniforms) -> effizient, ein Programm für alle Regionen.
  * REGION-ERKENNUNG in eigenem, Phaser-freiem Modul src/world/fluessigkeitsRegionen.ts (Flood-Fill, Bounding-Box je zusammenhängender Fläche) -> unit-getestet (5 Tests). Eine Brücke quer durch den Bach teilt ihn korrekt in ZWEI Regionen, damit das opake Quad die Brücke nicht zudeckt (im Dorf 2 Quads, im Bossraum 2 Quads wegen der Grabplatten-Brücke).
  * KOLLISION UNANGETASTET: nur die alten Wasser-/Blut-Tile-SPRITES der Region werden entfernt (kein Doppel-Render, wasserBilder-Rest=0 verifiziert), die a.map-IDs (T.WATER/T.BLUTSTROM, SOLID+FLYOVER) bleiben -> isSolidAt unverändert (solidAtBrook=true verifiziert). loadAreaObjects/zeichneKachel NICHT umgebaut, nur 1 Hook nach loadAreaObjects + Cleanup in unloadAreaObjects.
  * BLUT STANDARD AUS (FLUSS_SHADER.blut=false): der reich dekorierte Bossraum-Blutstrom (eigenes BloodFlow-System) bleibt unangetastet. Zum Vergleich/Testen per window.__fluss.blut=true (DEV) oder Flag umschaltbar. Wasser standard AN.
  * Tiefe -9 (über Grund -10/-11, unter Spieler) - wie der bestehende BloodFlow. Render-Tiefe/Licht-Komposition korrekt: Krypta-Licht (Dunkelheit-RenderTexture + Fackeln) liegt darüber, Shader wird mitverdunkelt (gewünscht).
  * VERIFIZIERT (Headless-WebGL, SwiftShader): Renderer WebGL, Shader kompiliert (keine GLSL-Fehler), Quads exakt 64px/2 Kacheln über dem Bach (Kachel 102). Übergänge village->boss->village via goArea (echter Spielpfad) = 0 Fehler. Der "gl null"-Fehler trat NUR bei wiederholtem scene.start('World') (Vollszenen-Neustart) im Teststand auf - kein realer Spielpfad. tsc grün, 186 Tests grün.
  * FPS-Messung im Headless = SwiftShader (Software), NICHT repräsentativ (3-21 fps, vom Software-Renderer dominiert, nicht vom Shader). Auf echter GPU sind wenige Fragment-Quads billig. Auf echter Hardware noch zu bestätigen.
  * GRENZE (dokumentiert): Bounding-Box je Komponente -> bei nicht-rechteckigen (L/Y-förmigen) Wasserläufen deckt das Quad auch etwas Land. Für die Testregionen (senkrechter Bach, rechteckiger Blutstrom) exakt. Später per Maske verfeinerbar.

- Runde 71b (neues Wasser auf die Anfangskarte: Flüsse, Bach, See - Autorwunsch "auch auf die neue Karte ... lasse mir Spielraum für Einstellungen"):
  * GEWÄHLTER WEG (per Rückfrage bestätigt): jetzt auf der Canvas-Hybrid-Anfangskarte, dem Flusslauf folgend. dorfSim exportiert die Wasser-Geometrie (flussBahn/bachBahn = Mittellinien mit Strömung+Halbbreite, seeBereich = Ellipse).
  * SHADER erweitert: uShape (0 Fluss = Ufer links/rechts, 1 See = radial/ellipse) + uAlphaFade (0 deckend wie Tile, 1 Ränder blenden weich in den Untergrund). Premultipliziertes Alpha (Phasers Standard-Blend) -> geschwungene Flüsse/See fügen sich weich ein statt als harte Rechtecke. Tile-Fall (Dorf/Boss) UNVERÄNDERT (uShape=0,uAlphaFade=0 -> identisch deckend).
  * segmentiereBahn(): zerlegt die geschwungene Mittellinie in gedrehte Quad-Segmente entlang der Strömung (angleRad), Breite=Flussbreite, leichter Längs-Überlapp gegen Nähte. In das Phaser-freie Modul gelegt -> 4 Unit-Tests (190 gesamt grün).
  * AnfangskarteSzene: baueWasser() legt Fluss+Bach als Segmente (Tiefe -900: über dem Canvas-Boden -1000, unter Spieler/Gegnern) + See als ruhige Ellipse (SEE_PRESET, langsam/glatt). Welt-Koordinaten -> folgt dem Canvas-Boden (wie der Spieler). Verifiziert: 18 Quads, exakt auf See/Fluss/Bach ausgerichtet, WebGL, 0 Fehler.
  * SEGMENT-ANZAHL als Perf-Stellschraube: jedes Phaser-Shader-Quad bindet die Pipeline neu, darum grob segmentiert (Fluss ~350px, Bach ~300px -> ~18 Quads statt 31). Auf echter GPU zu bestätigen; die Hybrid-Karte war schon vorher schwer (Canvas-Vollbild-Upload je Frame).
  * "SPIELRAUM FÜR EINSTELLUNGEN": Dev-Panel um "Wasser (neu)" erweitert - Fließ-Tempo, Wirbel, Helligkeit, Wasser-Ton (live auf alle Wasser-Shader). Presets WASSER/SEE als veränderbare Kopien.
  * GRENZE: Headless-Screenshot der vielen WebGL-Shader nur mit langem Timeout (Software-WebGL langsam) - kein echter FPS-Wert. Look ist die faithful fluss.html-Optik; feinjustierbar über die Regler (der schmale Bach wirkt durch Schaum/Glanz recht spritzig).

- Runde 71c (Anfangskarte-Wasser neu gebaut nach Autorfeedback "wie Klebeband in Streifen, man sieht das darunter, keine natürliche Flussform"):
  * PROBLEM erkannt: die gedrehten Rechteck-Segmente (71b) lagen als harte Streifen auf der Landschaft, deckten die geschwungene Form nicht und das Canvas-Wasser schien daneben durch.
  * NEU: EIN Wasser-Quad über der ganzen Welt, maskiert durch eine WASSERFELD-Textur (baueWasserFeld): rg = kodierte Strömungsrichtung, b = Wassermaske. Rasterung der Fluss-/Bach-Segmente (viele feine gedrehte Rechtecke - billig, nur Rasterung) + See-Ellipse, niedrige Auflösung + Blur + LINEAR -> weiche, EXAKTE organische Form. Der Shader nimmt damit die echte Flussform an (uFeld-Modus, Maske->Alpha), statt Streifen. Pro-Pixel-Strömung folgt dem Lauf; der See (Strömung~0) ist ruhig.
  * Statt 18 Shader-Quads jetzt 1 (besser für Performance, ein Pipeline-Bind).
  * FARBE/LOOK getunt: Feld-Bett satter/dunkler; Himmel-Spiegelung + Schaum im Feld-Modus gedämpft (hl=0.3), sonst bleichte das ruhige Wasser aus. Fluss/Bach lesen sich jetzt als tiefes, fließendes Wasser, das sich natürlich durch die Landschaft zieht.
  * Tile-Modus (Dorf/Boss) bleibt UNVERÄNDERT (uFeld=0 -> alter Pfad, identisch).
  * Verifiziert (Headless-WebGL): 1 Shader, organische Fluss-/Bach-/See-Form, weiche Ränder, kein Durchscheinen, 0 Fehler, tsc grün, 190 Tests grün. See-Mitte bei Regen noch etwas dunstig (Wetter über großer offener Fläche) - über Helligkeit-Regler justierbar.

- Runde 71d (Autorfeedback: Anfangskarte-Wasser "sieht schlecht aus, keine Referenz" + "der Held läuft auf dem Nebel"):
  * WASSER-SHADER VON DER ANFANGSKARTE ENTFERNT (Rückbau): Strecken-/Feld-Overlay sah schlechter aus als das vorhandene Canvas-Wasser und deckte es zu. Anfangskarte zeigt wieder das organische dorfSim-Canvas-Wasser (Fluss liest sich gut). Der Liquid-Shader bleibt als Modul + im Tile-Spiel (Dorf/Boss) erhalten; auf der Anfangskarte erst wieder, wenn ein Referenzbild vorliegt.
  * BUG GEFUNDEN+GEFIXT ("Held läuft auf dem Nebel"): frei() machte den FLUSS solide, aber NICHT den SEE - der Held konnte mitten in den See laufen, der bei Regen dunstig/blass ist -> sah aus, als liefe er auf Nebel/Wasser. Fix: `if (imSee) return false` in frei() (See = tiefes Wasser, unbegehbar wie der Fluss). Verifiziert: See-Mitte/Rand jetzt solide, Spawn + Land ringsum weiter begehbar.
  * OFFEN: der See ist bei Regen blass (Canvas-Dunst übers Wasser, Runde 64/65) - kann auf Wunsch gedämpft werden; und ein Referenzbild für den gewünschten Fluss-/See-Look steht noch aus.

- Runde 72 (Neue Weltkarte + Wasser komplett neu - Auftrag "organische Nachbarkarten um die Stadt"):
  * SCHRITT 0 erfüllt: reference/fluss-bach.html liegt im Repo (Commit 9e53adc) - massgebliche Quelle + vollständiger Shader-Code für das neue Wasser.
  * 4 AUTOR-ENTSCHEIDUNGEN (per Rückfrage bestätigt):
    1. Raster-Lesart der gezeichneten Karte BESTÄTIGT (gx nach Osten, gy nach Süden; START=(2,3), STADT=(4,3), Burg/Fürst=(0,3), Kloster=(5,0)). Volle Tabelle in WELTKARTE-PLAN.md.
    2. FUERSTENTUM: "Ersetzen, Stadt neutral" - das neue Raster ersetzt das alte (wald 0,0 / village 1,0). STADT (4,3) entsteht als NEUTRALE Naturkarte OHNE Gebäude; die fertige bebaute Stadt (buildVillage) wird für die Oberwelt vorerst stillgelegt, Häuser kommen später per StadtProbe-Planer zurück.
    3. Kachel-Wasser Dorf/Boss: "Ein Wasser für alles" - sobald das neue SDF-Wasser steht, werden Dorf-Bach (T.WATER) und Boss-Blutstrom (T.BLUTSTROM) auf dasselbe System umgestellt (Konsistenz).
    4. Erste Karte: START (2,3) zuerst vollständig bauen, dann anhalten und dem Autor zeigen.
  * ARCHITEKTUR-LEITPLANKE (aus ZUSAMMENFASSUNG-ANFANGSKARTE.md): jede Karte ist eine ECHTE WorldScene-Area (AreaData/areagen.ts), KEINE Eigenbau-Szene wie AnfangskarteSzene. Look kommt in den Area-Renderer, nicht die Spiel-Systeme in eine Insel.
  * FPS-ERKENNTNIS (verifiziert per Code-Analyse): die ~11 fps lagen NUR an der Insel (AnfangskarteSzene.update -> tex.refresh() lädt das ganze Canvas pro Frame als GPU-Textur). Eine echte WorldScene-Area malt den Boden EINMALIG beim Laden (zeichneKachel in loadAreaObjects) - kein Per-Frame-Upload. Der Weg "echte Area" löst das FPS-Problem also von selbst. Shader-FPS auf echter GPU bleibt erst nach realem Lauf bestätigt.
  * GEBACKENER BODEN-HINTERGRUND machbar als KLEINER Eingriff: AreaData hat heute kein Bild-Feld (Boden = Kachel-Sprites, Tiefe -10). Plan: optionales Feld backgroundImage? in AreaData + ~5 Zeilen in loadAreaObjects (Bild auf Tiefe -11 unter die Kacheln). Additiv, keine Logik berührt. Wird umgesetzt, wenn START den gebackenen Look braucht.
  * REIHENFOLGE-REGEL (wichtig, gegen Absturz): FUERSTENTUM liest getArea(id) für jedes besuchte Gebiet (Übersichtskarte, WorldScene.ts:3745). Eine Zelle wandert daher erst ins FUERSTENTUM/kartenKanten, wenn ihr Area-Builder existiert. Das Raster als Gesamtbild lebt in WELTKARTE-PLAN.md; real verdrahtet wird zellenweise ab START.
  * NEUES SPIEL bleibt auf dem vorhandenen echten Spiel (village), bis START fertig+geprüft ist (Auftrag Schritt 3).
  * OFFEN (natürlicher Halt-Punkt, in OFFENE-FRAGEN.md): die exakten Kreuzungspunkte (Wege/Flüsse/Bäche pro Kante) brauchen die "untere Zeichnung" des Autors (Strassen und Flüsse). Bis dahin: Salzstrasse West->Ost als unzweideutiger Default (aus ANFANGSKARTE übernommen), Fluss/See-Geometrie pro Karte als Vorschlag markiert.

- Runde 72b (Wasser komplett neu - faithful Port aus reference/fluss-bach.html, Schritt 2):
  * NEUES MODUL src/world/wasserFeld.ts (Phaser-frei, 6 Unit-Tests): aus Mittellinien (Flüsse/Bäche mit Halbbreite) + See-Ellipsen ein Feld-Raster - pro Zelle weiche Wassermaske (b) + Strömungsrichtung (rg). SDF + Smooth-Min (smin) wie in der Referenz -> nahtlose Mündungen/Verzweigungen, KEINE Rechteck-Streifen (behebt den "Klebeband"-Fehler 71b).
  * NEUES MODUL src/world/wasser.ts: faithful Fragment-Shader aus der Referenz - Voronoi-Flussbett (vor(): Steine/Fugen/Kies + Sandflecken), Zwei-Lagen-Oberfläche (fbm4 groß + fbm2 fein, Zwei-Phasen-Trick), Fresnel-Himmel, Glanz, Schaum. Maske + Strömung kommen aus EINER gebackenen Feldtextur -> EIN Shader-Layer pro Karte, exakte organische Form, weiche Ufer (Premultiplied-Alpha blendet am Ufer in den Boden). Presets WASSER/SEE/BLUT (Werte aus der Referenz, "Tag"-Stimmung).
  * BUG GEFUNDEN+GEFIXT: das Feld (NPOT, z.B. 256x144) wurde von Phaser als iChannel mit textureData.repeat=true (gl.REPEAT) gebunden -> in WebGL1 unvollständige (schwarze) Textur -> kein Wasser. FIX: explizit setSampler2D('iChannel0', key, 0, {repeat:false, wrapS/T:'clamp_to_edge'}) - wir sampeln nur uv 0..1, clamp ist korrekt. Debug-Schalter WASSER_DEBUG_FELD im Shader (gibt b-Kanal aus) half bei der Diagnose.
  * NEUE SZENE WasserProbe (in main.ts registriert): zeigt den Shader über einer Test-Geometrie nach dem Referenz-Layout (Hauptfluss + Bach mündet ein + See + Abfluss) auf einfachem Wiesenboden. Dev-Regler (Schritt 2c): Stimmung (Fluss/See/Blut), Fließ-Tempo, Wirbel, Helligkeit - live auf den Shader (WASSER_CFG.flowMul/turbAdd/ambientMul).
  * VERIFIZIERT (Headless-WebGL, Screenshots): organischer Fluss/Bach/See, weiche sandige Ufer ins Gras, Glanz/Schaum; 0 Konsolenfehler; tsc grün; 196 Tests grün. FPS auf echter GPU (RTX 4070 Ti) noch zu bestätigen, sobald eine Wasser-KARTE läuft.
  * SKIZZE abgelegt: reference/weltkarte-skizze.png (Autor) - räumliche Vorlage für Wege/Flüsse/Seen + Kanten-Kreuzungen. Legende: braun=Wege, blau=Flüsse/Bäche, blaue Ellipsen=Seen.
  * OFFEN: u_points-Held-Effekt (Wellen um den Helden) aus der Referenz ist noch NICHT portiert (Sekundär-Optik) - kommt nach Freigabe des Grund-Looks. Der alte fluessigkeitsShader (Dorf/Boss) wird gemäß "ein Wasser für alles" später auf dieses Modul umgestellt.

- Runde 72c (Wasser auf PROZEDURALEN Shader umgestellt - nach Autor-Übergabenotiz, Schritt 2):
  * Autor lieferte eine Übergabenotiz + den spielfertigen Prototyp-Shader (u_layerMode, procStones, u_points-Held). Empfehlung: prozedurale SDF im Shader statt Masken-Textur (keine zweite Textur, die fehlschlagen kann). Den von ihm vermuteten Sampling-Bug hatte ich schon gefixt (NPOT+REPEAT -> clamp), aber der prozedurale Weg ist robuster und übernimmt den Prototyp 1:1.
  * UMBAU: wasser.ts ist jetzt der prozedurale Shader (faithful aus reference/fluss-bach.html): sdWater/flowDir DATENGETRIEBEN über Uniform-Arrays (u_seg/u_segW/u_lake) statt fest verdrahteter sdMain/sdBrook -> EIN Shader für ALLE Karten, Flusslauf kommt als Geometrie pro Karte (aus der Skizze). Keine Textur mehr. u_layerMode: 0 = ganze Szene inkl. Gras (Prototyp-Vergleich), 1 = Overlay (Land transparent) über echtem Terrain. Voller Parametersatz + Held-Punkte (u_points) vorhanden.
  * wasserFeld.ts ist jetzt reine Geometrie: Typen + geometrieZuUniforms() (flache Uniform-Arrays) + sdWasser() (für Tests/spätere KI-/Kollisions-Abfragen). Masken-Textur-Bau entfernt. 5 Unit-Tests grün.
  * WasserProbe: zwei Tabs (Wasser/Blut) mit dem VOLLEN Reglersatz (Autorwunsch "die ganzen regler in ein zweites tab, einmal für blut, einmal für wasser - wir unterscheiden evtl. Geschwindigkeit/Aussehen") + Ansicht-Umschalter (ganze Szene/Overlay) + Fließrichtung. Presets WASSER/BLUT als veränderbare Objekte.
  * VERIFIZIERT (Headless-WebGL, Screenshots): ganze Szene = Prototyp-Look (Gras, Kiesel-Streufeld, gravelliges Bett, Glanz); Overlay = Land transparent, nur Wasser/Ufer über dem Boden; Blut = dunkelroter Lauf. 0 Fehler, tsc grün, 195 Tests grün. FPS auf echter GPU noch offen.
  * MAX_SEG=24, MAX_LAKE=6 (Uniform-Array-Grenzen). Bahn-Punkte als UV (0..1) der Karte; y wird in der Geometrie gespiegelt (Phaser y-unten vs. Prototyp y-oben).

- Runde 72d (START-Area gebaut - erste echte Oberwelt-Karte, Schritt 3):
  * buildStart() in areagen.ts: echte AreaData (130x85) - Waldrand/Wiese, Salzstraße West->Ost, Fluss von Norden in einen See (+Abfluss Süd), Wölfe, Kräuter, Felsen. Wasser-Geometrie (UV) aus der Skizze; T.WATER wird aus DERSELBEN SDF (sdWasser) gecarvt -> Kollision deckt sich mit der Optik. Wo der Weg das Wasser quert: T.BRIDGE (begehbar).
  * AreaData.wasserLauf? = { geo, blut } trägt die Gewässer-Geometrie pro Area.
  * WorldScene: getArea kennt 'start'; spawneNeuesWasser() ersetzt die T.WATER-Kacheln durch Gras und legt EIN prozedurales Wasser-Overlay (wasser.ts, layerMode=1) über die Karte; spawneFluessigkeitsShader wird für Karten mit wasserLauf übersprungen ("ein Wasser pro Karte"). Cleanup in unloadAreaObjects.
  * FUERSTENTUM: 'start' (gx2,gy3) ergänzt (Reihenfolge-Regel: Builder existiert). kartenKanten.ts: START_KANTEN mit den Kanten aus der Skizze (Weg W/O, Fluss Nord, Abfluss Süd) - für den späteren Nachbar-Anschluss.
  * TitleScene: Menüpunkt "START-KARTE (neu)" zum Prüfen. NEUES SPIEL bleibt vorerst auf village (bis START final abgenommen).
  * VERIFIZIERT (Headless-WebGL): Area lädt (id start, 130x85), volles HUD/Quest/Chronik/Tag, Wasser-Overlay rendert mit weichen Ufern ins Gras, Wasser-Kacheln SOLIDE (isSolidAt=true), Spawn begehbar, Salzstraße-Brücke quert den Fluss (über dem Wasser), 0 Fehler, tsc grün, 195 Tests grün.
  * OFFEN/zu justieren (Autor-Abnahme): Wasser wirkt tagsüber etwas blass (Regler/Tageslicht - Werte feintunen); die mäandernde Brücke quert den Fluss als Treppenmuster (kosmetisch begradigbar); der genaue Fluss-/See-/Wege-Verlauf ist meine Lesart der Skizze - bitte bestätigen oder korrigieren.

- Runde 72e (Gebackener organischer Boden für START - Hybrid-Look, Schritt 3 abgeschlossen):
  * AreaData.gebackenerBoden? + WorldScene.bakeBoden(): malt EINMAL ein organisches Bodenbild (Wiese mit Farbspiel, Erd-/Trampelflecken, organischer Weg-Trail aus den PATH/BRIDGE-Kacheln) in ein Canvas (halbe Auflösung, LINEAR hochskaliert) und legt es auf Tiefe -11 unter die Objekte.
  * zeichneKachel zeichnet bei gebackenem Boden KEINE Boden-/Wasserkacheln mehr (GRASS/PATH/FIELD/WATER übersprungen) und KEINEN Untergrund unter stehenden Objekten - das Bodenbild trägt die Optik. Kollision bleibt komplett aus a.map (SOLID unverändert). Ergebnis-Schichten: Logik-Raster (unsichtbar) < Bodenbild (-11) < Wasser-Overlay (-9) < Brücke (-8) < Objekte/Figuren (y-sortiert) < Wetter/Licht/HUD.
  * NEBENEFFEKT (Perf): statt ~11000 Boden-Tile-Sprites nur noch ~1625 Objekt-Sprites in START -> der Kachel-Vollbild-Aufbau entfällt weitgehend (kein Per-Frame-Upload sowieso, jetzt auch viel weniger statische Sprites).
  * VERIFIZIERT (Headless-WebGL): organischer Boden statt Kachelraster, Wasser-Overlay + Brücke darüber, weiche Ufer in die Wiese; 0 Fehler, tsc grün, 195 Tests grün.
  * OFFEN/justierbar: Bodenbild ist prozedural-einfach (Wiese+Erde+Weg) - reicht für den Canvas-Look, kann später reicher werden (Biome-Optik, siehe IDEEN-BACKLOG). Wasser tagsüber noch etwas blass; Brücke als Treppenmuster.

- Runde 72f (Zweite Oberwelt-Karte wald_o + begehbare Kartenränder - "weiter"):
  * Gemeinsamer Oberwelt-Builder baueOberweltGebiet(cfg) aus buildStart extrahiert (DRY für viele Karten): Waldrand/Wiese + Salzstraße + Wasser-Lauf (Geometrie pro Karte) + Wölfe/Kräuter/Felsen + gebackener Boden. buildStart und buildWaldOst sind dünne Wrapper.
  * buildWaldOst (wald_o, 3,3): dichterer Wald, schmaler Bach von Norden + kleiner Tümpel, Salzstraße durch. getArea/FUERSTENTUM/kartenKanten ergänzt.
  * BEGEHBARE KARTENRÄNDER (checkKartenRand + KARTEN_KANTEN-Registry): läuft der Held an einen Rand, dessen Nachbar eine DEFINIERTE Oberwelt-Karte ist, wechselt er nahtlos und erscheint an der gespiegelten Kante. Nur Nachbarn in der Registry -> kein toter Übergang zu ungebauten Karten. Basis für den Weg START->Wald->Stadt und den späteren Schnelllauf.
  * VERIFIZIERT (Headless): START<->wald_o in BEIDE Richtungen (Hin- und Rückweg, kein Bounce), wald_o lädt mit organischem Boden/Wasser/allen Systemen, 0 Fehler, tsc grün, 195 Tests grün.
  * upPos/downPos der Oberwelt-Gebiete markieren West-Eingang/Ost-Ausgang.

- Runde 72g (STADT-Naturkarte (4,3) + Kette START->Wald->Stadt begehbar - "weiter"):
  * buildStadtNatur (id 'stadt', 4,3): NEUTRALE Naturkarte (Autorbeschluss "Stadt neutral") - offenes Tal/Wiese (wenig Bäume = Platz für die spätere Stadt), Mühlteich mit Zufluss, Salzstraße W->O. Gebäude/Kirche/Dungeon kommen später per StadtProbe-Planer. Eigene id 'stadt'; die voll bebaute 'village' bleibt unangetastet.
  * getArea 'stadt', FUERSTENTUM (4,3), kartenKanten STADT_KANTEN + Registry-Eintrag. wald_o.ost -> stadt nun erreichbar.
  * VERIFIZIERT (Headless): zu Fuß start -> wald_o -> stadt durchquert (begehbare Ränder, gespiegelte Kanten), Stadt lädt mit Wasser/Boden/allen Systemen, 0 Fehler, tsc grün, 195 Tests grün.
  * Damit steht der Kern-Weg der Oberwelt. Offene Punkte unverändert (Wasser-Ton blass, Brücke als Treppenmuster, Verläufe als Skizzen-Lesart - Abnahme/Feintuning durch den Autor).

- Runde 72h (Autor-Korrektur: 3 Karten verworfen, EINE Area nach der Skizze + Wasser-Fixes):
  * 3 Karten (burg/wald_w/wald_se) VERWORFEN (trafen die Zeichnung nicht). Fokus auf EINE saubere Area (START) nach der Skizze.
  * SKIZZE GELESEN (START-Zelle aus reference/weltkarte-skizze.png herausgeschnitten/gezoomt via Chromium-Base64): EIN durchgehender Fluss von der Nordkante herab (leichter Mäander) in einen MITTELGROSSEN See am Südrand (kein Riesen-Blob), Straße quert. buildStart-Geometrie entsprechend ersetzt (eine Bahn + EIN See cx0.5/cy0.88/rx0.11/ry0.06).
  * LOOK-FIX (blass -> trüb mit sichtbarem Bett): u_detailScale im Shader - Bett/Wellen/Kiesel werden auf BILDSCHIRMgröße skaliert (auf großen Karten war die uv 0..1 über die ganze Karte gespannt -> riesige, blasse Strukturen). detailScale = max(1, worldH/720). Dadurch ist Flachwasser klar mit sichtbarem Flussbett, "Tiefe" klebt nicht mehr am Maximum (kleiner See/schmaler Fluss -> deepness niedrig -> Bett sichtbar). Tuning-Werte sind die aus fluss-bach.html (Trübung 0.4, Tönung 0.65, Bett-Farben).
  * WASSER = KOLLISION + HELD-EFFEKT aus DERSELBEN Geometrie: T.WATER wird aus sdWasser gecarvt (verifiziert seeSolide=true), Bäume spawnen NICHT im Wasser (baumImWasser=0 verifiziert). Held-Wellen (u_points) werden pro Frame mit der Spielerposition (UV) gefüttert, solange der Held im/am Wasser steht (updateWasserHeld) -> Wellen sichtbar, nur dort.
  * DEV-KONSOLE mit Tabs (WasserProbe): WASSER (voller Reglersatz + Wasser/Blut + Ansicht/Fließrichtung), WETTER (Regen -> Wirbel/Trübung + Tint), UHRZEIT (Stunde -> Tag/Dämmerung/Nacht-Tint), NÄSSE (kühler dunkler Schleier). Probe-Geometrie = START-Lauf.
  * VERIFIZIERT (Headless-WebGL): START mit durchgehendem Fluss + See, sichtbares Bett (trüb), Kollision, Held-Wellen aktiv (Trail=3), keine Bäume im Wasser, 0 Fehler, tsc grün, 195 Tests grün.
  * STOPP zum Zeigen (Autorwunsch "erst wenn die eine stimmt, weiter").

- Runde 72i (Autor-Korrektur 2: Wasser live ins Spiel, F10-Tab-Konsole, durchgehender Fluss, START blank):
  * WASSER LIVE IM SPIEL statt Testszene: WasserProbe-Szene ENTFERNT (main.ts/Titel bereinigt) - "wir haben genug Testszenen". Das neue Wasser läuft in der echten START-Area; getunt wird über die F10-Konsole.
  * F10-DEV-KONSOLE mit Tabs (neues src/ui/devKonsole.ts, generisch, verschiebbar): WASSER (voller Reglersatz + Wasser/Blut + Fließrichtung), WETTER (Regen), UHRZEIT (Tageszeit), NÄSSE (Wasser-Dämpfung), ANFANG (dorfSim-Regler der Anfangskarte), KASTEN (alter Kampf-Kasten). F10 ruft jetzt oeffneDevKonsole() (überschreibbar; andere Szenen behalten den alten Kasten). Ab jetzt kommt alles Einstellbare hier rein.
  * DURCHGEHENDER FLUSS (kein Gap): (a) flowDir bremst die Strömung FLIESSEND in den See ab (still-Faktor per smoothstep statt hartem 0) -> nahtloser Übergang, Tempo-Gefälle Fluss>See; (b) START-Geometrie: letzte Fluss-Stützstelle liegt IM See-Mittelpunkt (Überlapp), Verschmelzung (smin/carve) auf 0.08 angehoben -> Optik deckt Kollision. Verifiziert: Wasser durchgehend y0..y82, keine echte Lücke (maxGap=4 = Mäander-Versatz der Mittelspalte, visuell durchgehend).
  * START BLANK (Autorwunsch "erstmal alles blanko"): baueOberweltGebiet hat ein blanko-Flag - kein Weg, keine Bäume, keine Gegner; nur Gras + Wasser + gebackener Boden. Verifiziert: tree=0, path=0, enemies=0. Inhalte kommen Stück für Stück aus der Anfangskarte.
  * VERIFIZIERT (Headless-WebGL): F10-Konsole offen mit allen Tabs, START blank, durchgehendes Wasser mit sichtbarem Bett, 0 Fehler, tsc grün, Tests grün.

- Runde 72j (Autor-Korrektur 3: Canvas-Look SOFORT - Boden+Wasser EIN Shader, begehbares Wasser):
  * "2 Ebenen"-Problem behoben: START rendert Boden UND Wasser jetzt aus EINEM Shader (wasser.ts, layerMode 0, Tiefe -11) - Land+Wasser+weiche Ufer in einem Pass (mix(landFull,water,waterDepth)), wie fluss.html. Kein separates Bodenbild mehr (bakeBoden bei vollszene aus). Weiche, fließende Ufer (nicht hart abgehakt).
  * START-Geometrie nach der Skizze (START-Zelle scharf herausgeschnitten): Fluss tritt OBEN RECHTS ein, zieht DIAGONAL nach unten-links in einen flachen See unten-Mitte; Bach entlang der Südkante von links in denselben See. DÜNNER als zuvor (hw ~0.013-0.017). Nicht mehr senkrecht.
  * BEGEHBARES WASSER statt hartem Block (Autorwunsch): wasserSolide=false -> T.WATER wird NICHT gecarvt; areaSpeedFactor verlangsamt den Helden im Wasser aus DERSELBEN Geometrie zunehmend (Ufer 1.0 -> tief ~0.07, "kann nicht schwimmen, bleibt fast stecken"). Held bleibt sichtbar (Sprite über dem Wasser) und erzeugt Wellen (u_points). Breite/Verlangsamung über die Geometrie koppelbar.
  * KEINE DOPPELTEN EFFEKTE: Regen/Sturm/Uhrzeit/Sonnenauf-/-untergang werden NICHT hier neu gebaut - sie kommen aus der Anfangskarte (dorfSim) und werden übertragen (nächster Schritt). F10-Konsole WETTER/UHRZEIT hängen an den vorhandenen Spiel-Systemen.
  * VERIFIZIERT (Headless): water-Kacheln=0 (begehbar), vollszene-Shader als Boden, kein gebackenes Bild, See begehbar (solide=false), Tempo See 0.07 / Ufer 1.0, 0 Fehler, tsc grün, Tests grün. Look ist trüb/organisch (Morgenlicht dimmt - finale Stimmung kommt mit der Anfangskarte-Tag/Nacht-Übertragung).

- Runde 72k (DURCHBRUCH: dorfSim-Look IN der WorldScene-Area - Option A live):
  * Die START-Area rendert ihren Boden/Bäume/Wetter/Tag-Nacht/Atmosphäre jetzt über den dorfSim-Canvas (Anfangskarte-Look), während die WorldScene-Systeme (Kampf/HUD/Quest/Speichern/Chronik) darüber laufen. Mechanik wie AnfangskarteSzene, aber in WorldScene:
    - AreaData.dorfSimBoden; buildStart liefert nur ein leeres Gras-Raster (130x85 = dorfSim WELT 4160x2720) + dorfSimBoden=true.
    - setupDorfSim: dorfStart(canvas,{hybrid,externKamera}) + addCanvas + Bild (scrollFactor 0, Tiefe -1000, setDisplaySize Fenster). updateDorfSim: setKamera(scrollX,scrollY)+tex.refresh pro Frame. isSolidAt -> dorfIstSolide. Kacheln/Bake/Wasser-Overlay bei dorfSimBoden übersprungen. Cleanup: dorfPause beim Area-Wechsel/Shutdown.
  * VERIFIZIERT (Headless): START zeigt dorfSim (Gelände/Bäume/Fluss/Regen/Tageszeit) + volles WorldScene-HUD, dorfBereit=true, 0 Fehler, tsc grün, Tests grün.
  * NÄCHSTE SCHRITTE (offen): (a) dorfSims eigenes Wasser abschalten und MEIN Shader-Wasser nach der Skizze (Fluss+Gabelung+Bach+See) darüberlegen; (b) Layout/Verlauf nach "Straßen und Flüsse" + durchgehende Kanten übers ganze Fürstentum; (c) dorfSims Debug-HUD-Text im Hybrid ausblenden; (d) Bäume/Brücke final. FPS auf echter GPU (Canvas-Upload pro Frame) noch zu prüfen.

- Runde 72l (dorfSim ohne Wasser + mein Shader-Wasser drüber - Autorvorgabe, mit ehrlichem Befund):
  * dorfSim: keinWasser-Flag (starteWelt-Option) - zeichnet Fluss/Bach/See NICHT und wertet sie NICHT als Kollision; Vegetation meidet die Wasserzonen weiter (keine Bäume im Wasser). frei()/Zeichnen-Aufrufe entsprechend geguardet.
  * WorldScene START: dorfSim als Boden (keinWasser) + MEIN Shader-Wasser auf dorfSims Wasserzonen (Geometrie aus flussBahn/bachBahn/seeBereich, herunterabgetastet, in UV). a.wasserLauf.begehbar -> Held watet hinein, Verlangsamung (0.16 tief), Held sichtbar (Sprite über Wasser), Held-Wellen (u_points). spawneNeuesWasser bei dorfSimBoden ohne Gras-Kachel-Ersatz.
  * VERIFIZIERT (Headless): dorfSim aktiv, Shader-Wasser da, Held sichtbar, See begehbar (nicht solide), Tempo 0.16, 0 Fehler, tsc grün, Tests grün.
  * EHRLICHER BEFUND: Mein GL-Wasser ist eine separate Ebene ÜBER dem dorfSim-Canvas -> es wird NICHT von dorfSims Tag/Nacht/Wetter eingefärbt -> wirkt zu hell/blass und losgelöst (2-Ebenen-Seam). Fixbar, indem ich dorfSims aktuelle Licht-/Tageszeit-Tönung pro Frame an die Wasser-Uniformen (uColor/uAmbient) anlege; ODER dorfSims integriertes Wasser nehmen (lit/geschichtet) und nach Skizze formen. Dem Autor vorgelegt.

- Runde 72m (Nahtloser Merge - gründlich, mit ehrlichem Zwischenstand):
  * dorfSim aktuellesLicht() exportiert (effektives Tag/Nacht+Wetter-Licht). WorldScene koppelt es pro Frame an mein Wasser: neuer Shader-Uniform u_lichtMul (Tönung), gesetzt aus dorfLicht().mul + lift -> Wasser wird vom selben Licht gefärbt wie der Canvas-Boden.
  * WorldScene-Doppellicht entfernt: renderLight() überspringt dorfSim-Areas komplett (lightRT/warmPool aus) - dorfSim regelt Tag/Nacht/Wetter/Nebel allein. (Vorher dimmte WorldScenes Licht zusätzlich -> Wasser-Seam.)
  * WASSER-Preset dunkler/trüber getunt (deep dunkler, ambient 0.9, tint 0.82, turbidity 0.6, gloss 0.3, wake 0.3) für satteres, integriertes Wasser.
  * VERIFIZIERT (Headless): u_lichtMul greift (=Morgenlicht des Spiel-dorfSim), 0 Fehler, tsc grün. Held sichtbar, See begehbar (Tempo 0.16).
  * EHRLICH OFFEN: das GL-Wasser über dem 2D-dorfSim-Canvas wirkt am GROSSEN See noch flach/blass (ihm fehlen dorfSims Lift/Warm/Vignette/Dunst; aktuell noch dorfSims große See-Geometrie). Verbesserung erwartet durch: kleinere See-Geometrie nach Skizze, optional lift/vignette auch aufs Wasser, weiteres Tuning. Schmaler Fluss liest sich bereits besser. Nächste Schritte: Verlauf nach Skizze (Fluss/Gabelung/Bach/See/Weg), dann Bäume/Biome an die Ränder.

- Runde 72n (Spieler-Fix + Fluss nach Skizze + sichtbares Wasser):
  * SPIELER-FIX: goArea zentriert die Kamera nach dem Spawn SOFORT hart auf den Helden (centerOn) + setzt playerSprite-Position. Vorher lerpte die Verfolgung und der Held lag beim Laden unter dem Bildrand (dorfSim-Hintergrund füllte den Schirm -> "kein Spieler sichtbar"). Jetzt vertikal zentriert/sichtbar.
  * FLUSS NACH SKIZZE: buildStart liefert a.wasserLauf.geo = Skizzen-Layout (Fluss oben rechts -> GABELUNG -> See unten-Mitte + BACH-Zufluss von West), segN=9 verifiziert. setupDorfSim nutzt diese Geometrie (nicht mehr dorfSims). dorfSim-Bahn-Importe entfernt.
  * WASSER SICHTBAR: Preset war zu dunkel getunt -> unsichtbar. Zurück auf klar sichtbar (tint 0.7, turbidity 0.5, ambient 1.0, deep [0.07,0.19,0.24]). Licht-Kopplung mit Sockel (0.4 + 0.65*licht) -> tönt Tag/Nacht, bleibt aber dämmrig lesbar. Feinabstimmung macht der Autor live in F10 -> WASSER.
  * tsc grün, 0 Fehler. HINWEIS (Prozess): zu viele Screenshots im Chat -> "Request too large"; Bilder ab jetzt nur per SendUserFile an den Autor, nicht selbst laden.

- Runde 72o (KERN-BUG gefunden: dorfSim-Hintergrund wurde nicht gerendert):
  * sortiereKameras() steckt ALLE scrollFactor-0-Objekte in die UI-Kamera (die ÜBER der Welt liegt) und die Welt-Kamera ZOOMT (~1.3). Mein dorfSim-Hintergrund (scrollFactor 0) landete damit auf der UI-Kamera (verdeckte alles bzw. passte durch den Zoom nicht) -> dorfBildWillRender(welt)=false -> man sah weder dorfSim-Boden noch (richtig) Spieler/Wasser. DAS war "nichts geändert / kein Spieler / kein Wasser".
  * FIX: (1) dorfBild bleibt auf der WELT-Kamera (Backdrop), in sortiereKameras ausgenommen (cameraFilter = UI-Kamera verstecken). (2) In dorfSim-Areas Welt-Zoom = 1 (sonst passt der bildschirmfeste Hintergrund nicht 1:1 zur gezoomten Welt). Verifiziert: dorfBildWillRender=true, view 1280x720, scroll [0,1140] (zentriert), Spieler willRender/inView.
  * NEUES SPIEL leitet jetzt auf die neue START-Karte (World startArea 'start') statt auf die alte Anfangskarte-Szene - kein falscher Einstieg mehr.
  * tsc grün, 0 Fehler.

## Runde 73 - Flussbreite, weiches Ufer, Frei-Kamera
- Fluss-Grundbreiten in buildStart halbiert (Hauptfluss hw 0.008-0.011,
  Gabelung 0.007-0.008, Bach 0.005-0.007) - "dünner" wie gewünscht; Bach<Gabelung<Fluss.
- u_widthMul (Default 1.0, Regler 0.3x-2.0x) skaliert alle Fluss-/Bachbreiten LIVE,
  damit der Autor die Breite in einer Zeile/per Regler tunt. Liegt in WASSER_CFG.widthMul,
  greift auch auf die Wat-Bremse (sdWasser bekam widthMul-Parameter).
- Weicher Ufersaum im Overlay-Modus: feuchter Erdsaum (Alpha bis 0.7) über u_shore*4..u_shore*0.4,
  blendet ins Gras - ersetzt den harten transparenten Schnitt. Optik bleibt über u_shore weich.
- Frei-Kamera: Scroll-Tempo 700 px/s (durch Zoom geteilt), Mittelmaus-Ziehen 1:1.
  Held-Bewegung via bewegungGesperrt()-Hook gesperrt, solange aktiv.
- Doppelte Dev-Tabs WETTER+NÄSSE entfernt (Funktion steckt in ANFANG/dorfSim).

## Runde 74 - Boden/Bäume "gleich richtig" (Autorauftrag)
- Held-Watewellen entfernt (Autor: "sieht nicht gut aus"); der Shader-Haken
  setzeHeldPunkte/inter() bleibt für den geplanten besseren Effekt.
- world/bodenMaler.ts: Boden-Bake im echten dorfSim-Look, komplett aus der
  Kachelkarte abgeleitet (Weglinie aus PATH/BRIDGE-Spalten, Waldbiom aus
  T.TREE-Dichte) - keine Zusatzdaten, gilt automatisch für jede Karte mit
  gebackenem Boden. Deterministisch (mulberry32-Seed aus der Area-Id).
- Waldboden ÜBERARBEITET statt blind portiert (Autorkritik "kaum Struktur"):
  eigenes Moos-Pattern (Polster-Cluster + Nadel-/Laubstriche) analog zum
  Gras-Tile, statt dorfSims flachem Braun-Tint.
- Weg-Mäander im Bake bewusst klein (<= halbe Kachel), damit die begehbaren
  PATH-Kacheln (Brems-Ausnahme) das sichtbare Band decken: Kollision = Optik.
- Bäume: dorfSim-Regeln übernommen (>=120px Abstand zum Weg inkl. Krone,
  >=80px Baum zu Baum, Wasser-Puffer); Größe per a.baumSkala (Start: 11
  Kacheln Basis, Streuung 0.65-1.55, Fuß-Anker 0.64, Kontaktschatten).
  Leicht änderbar in areagen.ts (eine Zahl).

## Runde 75 - Wetter/Pfuetzen/Schilf/Stamm
- Wetter als EINE kontinuierliche Achse (data/welt.ts WETTER) statt Tages-
  Wuerfel; Stimmungs-Nieselregen (0.45) haelt bis zum ersten Dungeon-Besuch
  (flags.nErsterDungeon) - Heavy-Rain-Stimmung, in einer Zeile aenderbar.
- Pfuetzen: gebackene Einzel-Texturen laengs der Weg-Mittellinie, Dynamik nur
  ueber Alpha/Groesse (kein Per-Frame-Canvas) - kein Upload-Ruckler.
- Schilf-Cluster ueber Orts-Rauschen an der SDF-Wasserkante (Band -0.004..0.009),
  deterministisch je Kachel; Autor-Abnahme des Looks offen ("teste das mal").
- Gefaellter Stamm = das rotierte ez-tree-Original-Bitmap (Autorfreigabe);
  Holz kommt erst beim Zerlegen (GATHER.stammSchlaege), nicht beim Faellen.
- R80 Wetter-Vereinheitlichung: EINE Achse -1..1 (dorfSim-System) fuer alle
  Engine-Karten; alter WorldScene-Zyklus + Stimmungsregen laufen weiter, aber
  nur noch ueber den Timer (Regler setzt FEST, Automatik-Knopf gibt frei).
- Fensterlicht/Nachtkreis haengen an TAG.lichtAb (0.76 = ~18:15) bzw. am
  Sonnenstand der dorfSim-Kurve - abendAb (13:12) bleibt REINER NPC-Feierabend.
- Blitz zuendet ab Wetter ~0.8 (Gewitter, dorfSim-Schwelle), nicht mehr im Regen.
- 7DtD-Abbau: Fels/Erz zerfallen in Stufen (ganz->rissig->Geroell->weg), zahlen
  anteilig aus (ABBAU in crafting.ts: Fels 3-6 Stein, Erz 2-4 Eisen, Gold 2-3);
  Geroell verschwindet nach dem letzten Schlag KOMPLETT (dorfSim laesst einen
  Rest liegen - leicht nachruestbar, wenn der Autor den Rest behalten will).
- Autorbug nebenbei gefunden: buildStart-Felsen standen NUR in der Liste, ohne
  Map-Kachel (unsichtbar, keine Kollision) - jetzt gesetzt + Regressionstest.
- R80 Anfangskarte-Parität: Boden-Grün/Biom-Tint/Kies 1:1 aus dorfSim gemalt,
  Lift-Aufhellung PIXEL-GEMESSEN gegen die echte Anfangskarte kalibriert
  (kanalgewichtet warm, Wiese trifft Referenz auf +-3 je Kanal).
- Feines Gras ist KEIN Sprite mehr: zeichneFeinGras malt dorfSims Strich-Gras
  (kurz 3 Halme, hoch 5 luftige Halme) jeden Frame mit wind()/Böen-Welle und
  Wegbiegen; die "Grabstein"-Bueschel-Bitmaps sind geloescht.
- Spielstart SONNIG (startWetter -0.5): der Stimmungs-Dauerregen bis zum
  1. Dungeon ist per Konstante AUS (WETTER.stimmungsRegenAn) - Autoransage
  "tagsueber scheint die Sonne" schlaegt den alten Heavy-Rain-Wunsch; per
  F10-Knopf "Stimmungs-Niesel FEST" jederzeit zurueckholbar.
- Vignette aus dorfSim uebernommen (innen min(W,H)*0.34, aussen max(W,H)*0.74),
  in echter Bildschirmgroesse gebacken statt gestrecktem Quadrat.
- Pfuetzen "abgehakt" behoben: der Bild-Canvas war schmaler als die Blob-
  Ellipsen (harte Schnittkante) - jetzt gross genug + dorfSim-Blur-Kante.
- R81 Holzlogik: NPC-Holzfaeller liefern taeglich npcBaeumeProTag*5 = 50 Holz
  ins Dorflager, das Saegewerk verschneidet bis 25 Holz/Tag zu Brettern (1->2).
  Alles Konstanten in HOLZ (crafting.ts), in einer Zeile aenderbar.
- Persoenliches Baumenue auf Taste N (B war vom Album belegt): erster Bauplan
  Lagerfeuer (3 Holz + 1 Stein) - heilt im Umkreis wie der Kamin, leuchtet
  nachts, wird je Karte gespeichert. Steht der Held auf dem Weg, weicht der
  Bauplatz automatisch auf freien Boden daneben aus.
- Held-Licht-Regler leben in den gespeicherten Licht-Einstellungen
  (nachtDunkel/nachtSicht/nachtGlut/nachtGlutFarbe), F10-Tab LICHT.
- Biome auf START = dieselben dorfSim-Noise-Formeln und Weltmasse wie die
  Anfangskarte -> gleiche Verteilung (Moor mittig am Fluss, Fels am Rand).
- Moornebel bewusst WEICHER als die Anfangskarte (Autor: "sah aus wie
  Schnee"): grosse blaugraue Wolken-Textur, traege Drift, atmendes Alpha.
- R82 Antialiasing: WebGL-Graphics kann bei pixelArt kein AA -> ALLE Graeser/
  Schilfe sind jetzt 3x-ueberabgetastete Canvas-Bakes (Anzeige 1/3). Ufer-
  Schilf auf ~25-38px verkleinert (war 50-93px, "riesig vs. Held").
- Baeume/Buesche: Bakes werden progressiv auf ~2x Anzeigegroesse vorskaliert
  (Canvas high-quality) - die GPU-Minification ohne Mipmaps zerhackte die
  Aeste ("unnatuerliche Aestelung"). Presets sind unveraendert die der
  Anfangskarte (identische SORTEN-Liste).
- Spieltag 600 -> 1200 s (Autor: "Tageszeiten zu kurz"); eine Zeile in TAG.
- Held-Laterne nachts: enger heller Kern + weiter Schein, Glut-Regler
  skaliert /70 (Stellung 100 deutlich heller als das alte Maximum).
- Bewuchs-Regler (ANFANG) skaliert jetzt die SPAWN-Dichte des Sprite-Grases
  (greift beim Kartenwechsel).
- R82b Baum-Erdung: fester kleiner Fussschatten DIREKT am Stamm (dorfSim-Regel
  "Grundschatten erdet immer"), getrennt vom wandernden Sonnenschatten.
- Felsen: dorfSims gemalter Fels (Facetten/Moos/Kontaktschatten, 2x-AA) ersetzt
  die 32px-Kachelgrafik auf gebackenen Karten; Adern zeigen Erz-Einsprengsel
  (Eisen braun, Goldmine gold). Formationen: 3-5 Brocken eng beieinander.
- R83 1:1-Baumschatten: die Baum-TEXTUR selbst wird dunkel getoent am Fuss
  gespiegelt (Rotation ~180 Grad +/- Sonnenrichtung), Laenge waechst mit
  tiefer Sonne, Wolken daempfen, Boeen-Welle laesst ihn mitschwanken.
- Baeume 8px im Boden versenkt (Fuss-Anker 1.0) + fester Fussschatten.
- Rasen-Basis als TileSprite in VOLLER Aufloesung (128er-Kachel), der
  Half-Res-Bake traegt nur noch Tint/Details/Weg - Rasen wieder scharf.
- Nacht-Licht nach Dungeon-Prinzip: der Farb-Multiplizierer faellt nachts
  nur noch auf ~0.52-0.66 (blauer Ton), die Dunkelheit kommt vom Licht-
  Overlay mit Loechern -> Held im eigenen Licht farbig sichtbar, das
  Gluehen (ADD-Kern) ist zurueckgenommen.
- Tag: leichte Saettigungs-Anhebung bei Sonne (ColorMatrix.saturate 0.16),
  Wolken daempfen, nachts aus. Waldboden mit Moos-Polstern strukturiert.
- R84 Krypta-Waende: Befund war Fall B (a.map ist vollstaendig wandgefuellt,
  buildCrypt carved Raeume heraus - nur das ZEICHNEN zeigte seitlich nichts).
  Sued-Waende: 10px-Mauerstreifen der VORHANDENEN krypta_wand_front-Textur
  vertikal GESTAPELT (Kopien, kein Strecken), Fuss unten, y-sortiert an der
  Basis (Held verschwindet dahinter). Ost/West-Kanten + Ecken: derselbe
  Streifen 90 Grad gedreht als Seitenkante. Hoehe als Regler (F10->LICHT,
  Default 2 Kacheln, baut live neu). Kollision unangetastet, alles hinter
  a.dark - Oberwelt pixelgleich geprueft.
- R84b Krypta-Waende v2 (Autor "sieht schrecklich aus"): Streifen-Ansatz
  verworfen. Neues System: WANDKRONE (Stein-Oberseite aus wallFace, 28%
  abgedunkelt, Plattenfugen) auf JEDER raumberuehrenden Wandzelle - Raeume
  sind horizontal+vertikal+Ecken sichtbar eingefasst; Sued-Stirnwaende als
  DURCHGEHENDES Mauerwerk im Laeuferverband (gleiche Fugen-/Licht-Toene wie
  die alte 10px-Stirn). Farben ausschliesslich aus dem CryptTheme.
- R85 Fasern: neue Bau-Ressource (MaterialId 'fasern') aus Schilf (1) und
  Bueschen (1-2) - Autor-Idee "Ressource fuers spaetere Bauen" umgesetzt,
  Verwendung (Seile/Bindungen) folgt mit dem Baumenue-Ausbau.
- Schilf/Buesche zerlegbar ueber das Hittable-System der Krypta-Kruege;
  Zerschnipsel-Animation: drei Quer-Schnipsel (setCrop) fliegen in Schlag-
  richtung auseinander, kippen und verwehen.
- Gewitter: Blitz NUR auf hoechster Stufe (Schwelle 1.15 = Wetter ~0.89),
  Doppel-Puls wie die Anfangskarte, onBlitz-Haken spielt Donner mit 0.35-1.5s
  Verzoegerung, sobald assets/sounds/donner.mp3 geliefert ist.
- Ufer-Schilf nachgemessen kniehoch (~22-31px, Bake 186px -> Skala /3*0.35-0.5).
- Held-Glut liegt in der Tiefe UNTER der Figur (Boden glimmt, Figur wird
  nicht angestrahlt); Brueckengelaender = echte Barriere (Wasserkacheln an
  den Laengsseiten gesperrt, Set-Lookup in isSolidAt).
- R86: Sonnen-Schatten gespiegelt (Autorwunsch, Sonne von der anderen Seite).
  Held-Durchschein: Baeume, deren Krone den Helden verdeckt, faden weich auf
  42% (dorfSim-Reveal-Idee als Alpha-Fade). Baum-Mindestabstand auf offener
  Wiese 170px (Wald 100). Bake-Sorten: Oak Large Stammdicke 1.9->1.3, Aspen
  durch zweite Esche ersetzt (nur Engine-Bake, Anfangskarte unveraendert).
- Buesche: Fuss unten + 4px versenkt + Kontaktschatten, biegen vor dem Helden
  weg (windGras) und bremsen beim Durchdraengen (55-90% je Naehe/Groesse).
- Findlinge: 4. Felsgroesse (8 Schlaege, 10-16 Stein) + 6 Stueck verstreut;
  Fels-Cluster 20 statt 14, auch vereinzelt ausserhalb des Fels-Bioms; mehr
  Kies auf der Wiese. Holzfaellen verdoppelt (6 Schlaege faellen/zerlegen).
  Fall-Tempo-Standard 0.5. Chronik: dockt unten an (einmalige Migration nur
  fuer die Chronik), Minus-Knopf klappt auf die Kopfzeile zusammen.
- R87 RTS-Fundament: data/rts.ts traegt die 1300er-Doktrin (Banner/Gleve,
  Gewappnete, Spiesser, Armbruster, Bogenschuetzen, Feldscher), Formationen,
  Feldbauten (gesperrte werden per Fortschritt freigeschaltet - Autorkonzept),
  Moral (Basis 70, Standarte +10, Banneret nah +10, Flucht <25) und Rang
  (je 3 Kills: +15% Schaden/+10% LP). HEER-Tab im Charakterfenster zeigt die
  Doktrin + Umschalter; RTS-Modus = Frei-Kamera + Leiste (Formation-Vorwahl,
  Lagerfeuer/Standarte/Palisade baubar). Einheiten-BEFEHLE folgen mit den
  Schlacht-Karten - die Schlacht-Probe (962 Zeilen) ist die Blaupause.
- Verbaende heilen sofort +30 (Taste V); Standarten sind je Sitzung (Save folgt
  mit dem Schlacht-Ausbau). Blumen/Kraeuter geben beim Schneiden 1 Kraeuter.
- R88 Fixes: (1) Baumschatten ist eine echte REFLEXION (Sprite setFlipX + Rotation
  Math.PI - L.dir), R86-Punktspiegelung verworfen - legt sich seitlich weg vom
  Licht. (2) RTS-Leiste startet OBEN (weg von der Aktionsleiste), Kopfzeile
  verschiebbar, Position gemerkt. (3) Bauen ist RTS-artig: Bauwerk anklicken ->
  Geist folgt der Maus -> Linksklick setzt Baustelle -> Bauzeit-Fortschritt
  (Lagerfeuer 3s, Standarte 2.5s, Palisade 4s) -> dann steht es. Baumenü (N)
  und RTS nutzen denselben Platzierungs-Pfad (bauKlick-Hook).

## R89 - Pflanzen-Ökosystem + Architektur-Regel
ARCHITEKTUR-REGEL (Autor, verbindlich): DER HELD FARMT, DIE NPCs VEREDELN.
Rohpflanzen sind reine Zutaten (Inventar-Ressourcen), sie geben NICHT direkt
Buffs. Geplante NPC-Stationen (Folge-Task): Magdalena (Tränke/Sude/Salben),
Schmied (Waffen/Rüstung/Waffengift/Palisadenholz), Wirt Heinrich (Eintopf-
Buffs/Handel/Gerüchte->Quests), Pater Johannes (Weihwasser=Schatten/Seuche,
Segen=Moral, weiht die Standarte), optional Kräuterhexe im Hexenwald (dunkle
Rezepte: Waffengift/Flugsalbe). Tränke NUR dort, wenn der Held Ressourcen bringt.

- data/pflanzen.ts: 14 benannte Heilpflanzen (Ids = MaterialIds), an Biome +
  vier Achsen gebunden (Feuer/Frost/Schatten + SEUCHE als eigener Wert, bei der
  Pest als Setting). Schnitt mit dem Schwert -> Drop-Sprite -> Aufheben (wie
  Holz) -> Respawn nach 90s. Distinkte prozedurale Sprites (gfx/pflanzenArt.ts).
- Seuche als 4. Resistenz-Achse (playerState.resist.seuche), im Charakterfenster.
- Verband-Rezept auf Schafgarbe (Soldatenkraut) gemappt. Magdalenas generische
  'kraeuter'-Rezepte bleiben vorerst (Klee/Kräuter-Deko liefert weiter kraeuter);
  Migration auf benannte Pflanzen kommt mit der Magdalena-Station.
- HEXENWALD als Biom-Typ angelegt (Bilsenkraut/Eisenhut/Alraune) - spawnt erst
  mit dem späteren Gift-Biom, nicht auf START.
- HISTORISCHE EHRLICHKEIT (Kompendium, Autorwunsch): Schafgarbe/Spitzwegerich
  (Wundkraut), Johanniskraut (fuga daemonum), Pestwurz (echte Pestpflanze),
  Bilsenkraut/Eisenhut (Gift/Hexe), Hauswurz (gegen Blitz/Feuer) sind belegt.
  UNSICHER: Engelwurz-Pest-Legende (nicht sicher vor 1349), Alraune wächst nicht
  in Deutschland (dt. "Alraune" oft Zaunrüben-Aberglaube) - NICHT als Fakt
  behaupten. Quellen bei Bedarf gezielt nachschlagen.

## R90 - Ernte-Config, Fels-Fix, Kronen-Loch (Option C)
- Fels-Viereck war KEIN Drop/Partikel/Debug-Rect: der geleerte Fels-Tile wurde
  T.FLOOR (NAME='krypta_boden') -> dunkles Steintile-Sprite auf dem Rasen.
  Fix: auf gebackenen Karten T.GRASS (Backboden zeigt durch, kein Sprite).
- HARVEST_CONFIG (crafting.ts) = EINZIGE Ernte-Quelle. Held: 10 Schläge/Baum,
  2200ms Pause -> ~22s, GENAU 1 Holz (ganze Zahl). Stein/Erz eigene Werte je
  Größe. Swing-Cooldown (hackCdMs) macht die Arbeit tageslängen-UNABHÄNGIG;
  KEINE Müdigkeit/kein abnehmender Ertrag. Voller Tag (1200s/22s) ~ 54 Holz.
  NPC-Holzfäller npcHolzfaellerTagesertrag(rng)=25..75 angelegt, NICHT scharf
  (Aktivierung sobald STADT+Stadtlager existieren).
- Bäume = individuelle ez-tree-Sprites (NICHT gebacken) -> Option C machbar:
  KRONEN-LOCH via bildschirmfeste Masken-RenderTexture (weicher Pinsel am Held,
  invertAlpha) als BitmapMask NUR auf verdeckende Bäume (Krone überlappt Held +
  Y-sortiert davor). Kein Ganz-Baum-Faden mehr, keine Distanz-Auslösung.

## R92 - Schilf gedämpft, Kronen-Loch nur dicht, RTS-Toggle + Feldbauten
- Schilf: kleiner (Anzeige 34-48px statt 62-92), weniger (1-2/Kachel), Rispen
  nur ~40% der Halme + gedämpft olivbraun -> fügt sich ins Bild.
- Kronen-Loch erst ab 2 verdeckenden Kronen (dichter Wald), Stamm-Bereich bleibt
  frei (Überlappung nur oben in der Krone) - kein Loch bei einem Baum daneben.
- RTS-Leiste: Umschalter Truppen-Steuerung (Frei-Kamera) <-> Held selbst (WASD
  kämpfen). Feldbauten alle baubar (Wachturm/Lazarett/Zelt) mit Kosten in
  Relation zur Wirtschaft (Wachturm ~20 Holz = halber Tag Hacken); einfache
  Feldbau-Sprites (HP/Menü/Reparatur folgen mit dem RTS-Bau-Ausbau).
- Links-Kanten-Offset: in Headless NICHT reproduzierbar, Kamera-Mathematik
  korrekt (Sprite exakt auf px/py, Bounds x=0, worldView geklemmt).

## R93 - Ernte-Feinschliff, Loot-Symbole, Baum/Weg + Stein/Wasser
- Holz kommt ERST beim Zerlegen des LIEGENDEN Stamms (4 Schläge), nicht beim
  Fällen (Autor). Baum-Lebensbalken + Schlag-Fortschritt (updateHackBalken)
  über dem Ziel beim Hacken; blendet nach Ruhe aus.
- Busch gibt Fasern jetzt als DROP (aufheben), nicht sofort. Mehr Büsche.
- Loot-Symbole (Pickups): benannte Ressourcen (matId) als Vektor - Pflanzen/
  Fasern GRÜNES Pflänzchen, Holz Scheit, Stein Brocken, Erz Klumpen (Autor:
  "soll nach Pflanze aussehen, grün").
- Robuste Nachbereinigung ALLER Oberweltkarten: raeumeBaeumeAmWeg (kein Stamm
  auf Weg/Brücke, Radius 2) + entferneWasserBeute (keine Loot-Steine/-Erz im
  Wasser). Verifiziert: baumAmWeg=0, steinImWasser=0.
- RTS-Baumenü als VERTIKALE Leiste rechts unten (C&C-Stil), zwei Tabs BAUEN/
  BEFEHLE, A-/A+-Skala (rtsSkala 0.8..1.4). Werte in baueRtsLeiste(),
  Skala-Grenzen dort leicht änderbar.
- RTS-Einheitensteuerung läuft im FREI-KAMERA-Modus ("Truppen (Maus)"):
  Held anklicken wählt (Ring), Klick auf Boden schickt ihn, Auto-Angriff auf
  nächsten Gegner in 46px. Im HELD-Modus (WASD) ist die Maus aus - so
  kollidieren die beiden Steuerungen nicht.
- Schild-Toggle (rtsSchildAktiv, Standard AN): der gewählte Held hält
  zwischen den Auto-Schlägen die Deckung oben (tryBlockStart), senkt sie zum
  Zuschlagen. AUS = kämpft ohne Deckung. Toggle im BEFEHLE-Tab.
- Feldbau-Lebenspunkte/Reparatur zentral in data/rts.ts (BAU_HP,
  BAU_REPARATUR): Reparatur +34% HP für 25% Baukosten, Abbau gibt 50%
  zurück, Balken dauerhaft ab <35% (balkenRotUnter). Eine Datei zum Tunen.
- Palisade "drehen": statt manuellem Rechtsklick-Drehen VERBINDEN sich die
  Pfähle automatisch aus den Nachbarn (N/E/S/W-Maske -> Ecken/Enden); Ziehen
  legt eine orthogonale L-Linie (erst waagerecht, dann senkrecht) mit sauberer
  Ecke. 3 m hohe Pfähle (Bake 32x64, gezeichnet auf TILE x 2*TILE).
- RTS-Held-Tempo: tempoFaktor 0.55 (data/rts.ts RTS_HELD), Klick-Marsch
  bedächtiger als ARPG; Lauf-Animation an rtsLaeuft gekoppelt.
- RTS-Baumenü verschiebbar (Kopfzeile-Griff, Schirmkoordinaten-Delta), Position
  in Settings.rtsLeistePos gespeichert.
- RTS-Steuerung als eigenes Modul logic/rtsBattle.ts (aus SchlachtProbe/
  formationen.ts portiert). Einheiten-Werte in data/rts.ts (RTS_UNIT_TYP).
  Held ist Sonder-Einheit (Auswahl/Befehl über HeldRef-Callbacks in die Welt).
- Formations-Abbildung Leisten-Id -> Formations-Mathematik: schildwall=schutz,
  plaenkler=locker, linie=linie, keil=keil (RTS_FORM_MAP).
- Taste A (Angriffsmarsch) überschneidet sich mit WASD-Kamera (A=links). Lösung:
  A "schärft" den Angriffsmarsch, der nächste RECHTS-Zug/-Klick führt ihn aus;
  die Kamera scrollt weiter. H (Stellung halten) ist frei von Konflikten.
- Palisade: prozedurale Rundhölzer (Maserung/Knoten/Spitze), Vertikalwand als
  doppelte versetzte Reihe, Ecke mit Eckpfosten. Werte in palisadeTexturKey.
- Feldbauten neu gemalt (macheFeldbauBild): Wachturm 52x104 (ragt über die
  2-Kachel-Palisade), Tor 40x64, Zelte als First-/Giebelzelte. Tor: data-Eintrag
  in RTS_BAUTEN + BAU_HP.tor=160.
- Wachturm-Besatzung: Rechtsklick auf Turm = besetzen (TURM in data/rts.ts:
  Kapazität 2, +150 Reichweite Fern / +30 Nah, +35% Schaden). Andere Befehle
  lassen die Einheit absteigen.
- R97 A-Taste bleibt Kamera (WASD): Angriffsmarsch als Menü-Knopf (scharf ->
  nächster Rechts-Befehl), H = Halten.
- R97 Spawn per Maus: TEST-Knopf schärft einen Typ, Geist folgt der Maus,
  Linksklick setzt (mehrfach), Rechtsklick beendet. Kein Auto-Spawn.
- R97 Held = Schlachtführer: sein Tod verliert die Schlacht, eigene Truppe flieht
  (Moralbruch wie beim Fall des Banners um 1300).
- R97 Turm/Zelte als three.js-Bakes (demo3d/lagerBau.ts + gfx/lagerBitmaps.ts,
  Boot-Kette), Canvas bleibt Fallback. spawneFeldbau skaliert nach Seitenverhältnis.
- R97 Lager-Auren zentral in data/rts.ts (LAGER_EFFEKT), Radius 150: Feldaltar
  (Moral/Untotenschutz/Heilung), Feldküche (+30% Schaden), Brunnen (Moral),
  Zelt/Nachschub (Regen), Feldschmiede (Bau-Reparatur), Wartfeuer (Verstärkung).
- R98 Projekt-Gedächtnis: Stand wird in DATEIEN geführt (CLAUDE.md §12 listet
  Referenz- + Zustandsdateien). Ein Neustart soll allein aus der Doku möglich sein.
- R98 reference/ravenkarte.png und reference/weltkarte-skizze.png sind BYTE-
  identisch (md5 e48a9c32...) - dieselbe Autor-Skizze, verbindliche Oberwelt-Quelle.
- R98 Diagnose Kanten-System: Oberwelt-Builder (areagen.ts) lesen kartenKanten.ts
  NICHT; Wasser/Wege sind pro Karte hartcodierte UV-"Lesart der Skizze". Nachbarn
  verbinden nicht (start Ost-Fluss v≈0.44 vs wald_o ohne West-Fluss). Prompt-1-
  Bau-Phase (autoritative %-Tabelle, Übergabe-System, Referenzkarte, Rezept) ist
  NICHT umgesetzt - Details in WELTKARTE-PLAN.md.
- R98c Bruecken: der Weg friert ueber Wasser seine Hoehe/Spalte ein (kein
  diagonales Driften) -> Bruecken sind kurze GERADE Stege quer ueber den Fluss
  (Autor "90 Grad zum Wasser"). Gilt fuer baueOberweltGebiet UND buildStart.
- R98c Nord-Sued-Strassen ohne Sued-Weg enden an der T-KREUZUNG mit der
  Salzstrasse (nicht an der Zellmitte).
- R98c stadt (Ravensmoor) nach AUTOR-VORLAGE neu: See unten rechts, Nordfluss
  die Ostseite hinunter in den See, Suedbach vom See zur Westkante, Ost-Abfluss.
  Eigener Wasser-Plan via randFluesseAuto=false + kantenFlussAnker (Tabellen-
  Anker -> Ufer matchen weiter). Der erfundene "Muehlteich" links ist raus.
- R98c Wald-Namen einzigartig (Autorwunsch): wald_w=Wolfsbruch, wald_o=
  Finsterhain, wald_n=Nebelforst, wald_m=Kraehenwald, wald_se=Rabenhain.
- R99d KAMPF-VEREINHEITLICHUNG (Brief P12-14): Verbuendete RTS-Kaempfer sind
  echte Enemy-Instanzen (team 'spieler', Soldaten-Figur, RTS-Werte); Feinde
  echte spawnEnemy-Monster. EnemyHost-PROXY lenkt das "Spieler"-Ziel je Fraktion
  (WorldScene.enemyHost/zielFuer); Schaden/Projektile team-geroutet; Friendly-
  Fire zentral gesperrt. rtsBattle = reine Kommando-Schicht (jagdZiel/fokusZiel),
  alte Test-Kampfsim GELOESCHT. Turm-Reichweiten-Bonus wirkt derzeit NICHT auf
  Enemy-Truppen (deren Bogen-KI hat eigene Reichweite) - im Asset/Feinschliff-
  Block nachziehen, in TODO notiert.
- R99d P16: RTS-Modus-Ende laesst die Schlacht WEITERLAUFEN (Truppen fuehren
  Befehle aus); aufgeraeumt wird beim Kartenwechsel / [alle entfernen].
- R99e Assets: three.js-Bake-Pipeline (kein Live-3D in der Szene). NEU: Ortho-
  KACHELOFEN (gfx/lagerBitmaps, Baum-Blickwinkel 0/0.86/0.56, 48x96, Bodenlinie
  Zeile 88) fuer kachelbuendige Bakes (Palisade-Masken, Tor h/v auf/zu,
  Baustelle); freistehende Props weiter ueber den Perspektiv-Backofen.
  Lehre: cam.matrixWorldInverse VOR project() explizit fuellen (sonst leere Crops).
  Renderer bevorzugen 3D-Keys, Canvas bleibt Fallback.
- R100 Wasser/Wege: Achsenzwang (R99b) zurueckgenommen. randKanten + randWegLinien
  verbinden die Tabellen-Kreuzungen mit weichen Bezier-Boegen (deterministisch je
  Karte). Monsterlager: randFluesseAuto=false (kein Rand-Fluss, nur See links).
- R100 Bauten robust: BAU_HP Palisade 900 / Tor 1500 / Turm 1300; Belagerung
  kontinuierlich mit BELAGERUNG.schadensFaktor -> Minuten Standzeit. Werte tunebar.
- R100 Turm-Insassen: e.imTurm -> Sprite unsichtbar; Abzeichen "🏹 n/2" ueber dem Turm.
- R100 Assets massiver: Palisaden-Logs R0.115/H1.85, Tor H2.05 mit Zinnen+Ring;
  Kachelofen 48x128 (top=3.2); Anzeige 2.67 Kacheln hoch. Lager-Props kleiner.
- R100 Held im RTS: aimAngle auto-zielt auf naechsten Gegner (bewegungGesperrt),
  Held laeuft Gegner an. Bau auf Wegen erlaubt. UI-Klick-Schutz fuer RTS-Leiste/Popup.
- R104c Wasser Dorf ('stadt', Autorwunsch "Fluss vom See aus Richtung Sueden
  umleiten, See als Muehlenweiher/Fischteich behalten"): Der fruehere West-
  Suedbach QUER durch den Sueden entfaellt. Neu in buildStadtNatur:
  See bleibt (cx0.78/cy0.76), Nordfluss speist ihn weiter (Muehlenweiher-Zufluss),
  Ost-Abfluss haelt die Ost-Naht zu wald_se, ein neuer Sued-Abfluss laesst den See
  nach SUEDEN aus der Karte laufen. Die West-Naht zu wald_o (Tabelle Fluss@81.7%,
  vom Test oberweltVerbindung geschuetzt) wird durch einen KURZEN Bach in der
  Suedwest-Ecke gehalten, der ebenfalls nach Sueden abfliesst - Naht bleibt, die
  Feldflaeche im zentralen Sueden ist frei. Alle Werte in areagen.buildStadtNatur.
- R105 Dorf-Editor (Autorwunsch "Boxen beweglich, Baukasten fuer eigene Marker,
  Berichtsfunktion mit Koordinaten, Felder/Wege/Baeume"): In-Game-Editor in der
  'stadt'-Area. Taste [P] schaltet um (nur dort). Boxen frei ziehbar (kacheln-
  gerastet, Schirmkoordinaten-Delta); Baukasten-Leiste (verschiebbar) setzt neue
  Marker der Typen Wohnhaus/Gebaeude/POI/Ausgang/Feld/Weg/Baum+/Baum-, jeweils mit
  Beschriftung (prompt). Gewaehlte Box: Groesse B/H +-, Umbenennen, Loeschen.
  Bericht-Knopf oeffnet ein DOM-Overlay mit Klartext-Liste + kopierbarem TS-Block
  (DORFPLAN_BOXEN) -> Autor kopiert ihn in den Chat, ich pflege ihn nach
  src/data/dorfplan.ts zurueck (Datei bleibt das Gedaechtnis). Autor-Edits liegen
  im Browser (localStorage 'ravensmoor.dorfplan.v1'), '↺ Saat' laedt das Datei-
  Layout zurueck. Reine Logik (ID-Vergabe/Serialisierung/Bericht) in dorfplan.ts,
  7 Vitest-Tests. Baum+/Baum- sind vorerst MARKER (kein Live-Terrain-Eingriff) -
  echtes Baeume-Setzen/Entfernen backe ich spaeter aus dem Bericht in areagen.
- R105b Dorf-Editor Ziehen/Groesse FIX (Autor "kann Felder nicht in der Groesse
  ziehen und vorhandene nicht verschieben"): Ursache war die Zwei-Kamera-Falle -
  Phasers Objekt-Drag traf die Welt-Boxen (uiCam.ignore) nicht zuverlaessig. Jetzt
  manuelles Ziehen ueber den Welt-Punkt der Haupt-Kamera (dorfEditPointer/Move/Up,
  wie im RTS): Box unter dem Zeiger waehlen + verschieben (kachelgerastet); weisser
  Eck-Griff unten-rechts an der gewaehlten Box = Groesse ziehen (Greifzone 30 px,
  sichtbar 18 px). Mittelmaus bleibt Kamera. Im Browser per echtem Maus-Drag
  verifiziert (verschieben + Groesse).
- R106 Mittelalter-UI-System (Autorauftrag, Mockup "Auswahl/Banner" im Stil
  1300/1400): NEUE UI-Schicht als DOM/CSS-Overlay ueber dem Canvas (#game),
  KEIN grosses Menue-Bild - Pergament/Holz/Bronze kommen komplett aus CSS
  (Gradients/Pseudoelemente), Farben als CSS-Variablen (--mv-*) fuer spaeteres
  Umstimmen in einer Datei. Bausteine in src/ui/medievalUi.ts: mvPanel (ziehbar,
  UI-Regel 11), mvKnopf, mvTabs, mvBalken, mvStatReihe, mvTrenner, mvKarte
  (waehlbar), mvSlots, mvAbzeichen, mvSchalter. Styles: src/ui/medieval-ui.css.
  Erst ISOLIERTE interaktive Vorschau (TitleScene "MENUE-PROBE (UI)" -> UIProbe-
  Szene, Demo-Daten wie im Mockup, Ereignis-Log zeigt echte Klicks, ESC raeumt
  das DOM-Overlay ab) - die echte RTS-Leiste zieht ERST NACH Autor-Abnahme um
  (Alpha: bewusst kein Umbau der laufenden Spiel-UI in diesem Schritt).
  Ausdruecklich NICHT pixelgenau zum Mockup, sondern wiederverwendbarer Stil.
- R107 Einstellungen kategorisiert + Leistungsregler (Autorwunsch "unterteile
  wie ueblich: Grafik/Video/Sound/Tastaturbelegung + Performance-Regler fuer
  verschiedene Systeme"): SettingsScene neu mit REITERN ANZEIGE / GRAFIK / TON /
  STEUERUNG / ALLGEMEIN (Inhalt je Reiter in eigenem Container, Wechsel baut neu).
  NEU: Leistungs-Voreinstellung Niedrig/Mittel/Hoch (settings.wendeGrafikVor-
  einstellung, GRAFIK_PRESETS) buendelt die teuren Hebel: bloom, schatten (aussen),
  licht.dungeonNeu (Raycaster), licht.schattenFackeln, wasserEffekte, blut,
  wackeln, grusel. Handverstellung setzt grafikStufe=3 "Eigen". Neue Felder in
  settings.ts: fpsAnzeige, wasserEffekte, grafikStufe. Verdrahtung in WorldScene:
  wendeGrafikAn() (Wasser-Shader setVisible je wasserEffekte, sofort beim
  Kartenaufbau + beim Zurueck aus den Einstellungen); FPS-Anzeige liest fpsAnzeige
  jeden Frame (kurze "FPS n"-Zeile, Dev-Kasten weiter ausfuehrlich). Vollbild-
  Schalter (scale.toggleFullscreen). FPS-LIMIT bewusst NICHT eingebaut (im
  Browser-RAF nicht ehrlich kappbar -> waere Placebo). Presets per Vitest getestet.
- R108 Atmosphäre-Audio (Autorwunsch "Sound-Fanatiker: Hall, Entfernungsdämpfung,
  räumlicher Klang - mit Reglern; Kopfkino"): neue Web-Audio-Effektkette
  src/gfx/audioBus.ts (AudioBus) fuer POSITIONALE Klaenge: pro Klang Tiefpass
  (Ferne dumpfer), Panner (Stereo ODER HRTF), Send in gemeinsamen Convolver-Hall
  (prozedurale Impulsantwort, kein Sample). UI/Musik bleiben trocken (Phaser-Weg).
  SoundProvider.spielePositional() routet playAt/playAtAbwechselnd durch den Bus,
  liest die Regler je Klang (immer aktuell, keine Szenen-Plumbing) und faellt ohne
  WebAudio auf den alten Stereo-Weg zurueck. Umgebung: WorldScene.goArea setzt
  setzeUmgebung (innen 0.95 / dark 0.8 / offen 0.18) -> Hall stark im Dungeon.
  audioRaum liefert zusaetzlich dist01 (0 nah .. 1 fern) fuer den Tiefpass. Neue
  Settings: hall(45), distanzDaempfung(55), raumklang(false); Regler im TON-Reiter.
  Verifiziert: Bus baut (bereit, ctx running), positionale Klaenge fehlerfrei -
  KLANGQUALITAET muss der Autor am Geraet/Kopfhoerer pruefen (headless nicht hoerbar).
- R109 Audio-Kette v2 (Autor "klingt jetzt mono / audiophil, hautnah dabei"):
  URSACHE gefunden: (a) Web-Audio-PannerNode (HRTF) mischt Stereo-Quellen
  spec-gemaess auf MONO - unsere Effekte sind fast alle Stereo-MP3s; (b) im
  Nahkampf ist Pan~0 (Gegner an Bildmitte) -> alles mittig; (c) Tiefpass
  dumpfte ab Distanz 0. FIX in audioBus v2: Dual-HRTF-Panner (L/R-Kanal je
  eigener Panner, +-0.35 versetzt -> Position UND Breite), Pan-Spreizung
  (|p|^0.6 - kleine Auslenkung hoerbar), Tiefpass-Totzone bis 35% Distanz dann
  logarithmisch, Hall-Send distanzabhaengig (nah trocken 0.18, fern 1.0),
  dunklere IR (1.6s, Ein-Pol-LP schliesst zum Ende, 18ms Vorverzoegerung),
  Master-DynamicsCompressor (-16dB/2.5:1). MESSBAR verifiziert (OfflineAudio-
  Context-Rendering): Pan +-0.8 -> +-20dB; Nahkampf-Pan 0.15 -> 4.6dB (vorher
  ~1dB); Stereo-Breite bleibt in beiden Modi erhalten.
- R109 Sound-Assets analysiert (scripts/soundcheck.mjs, ab jetzt Pflicht bei
  jeder Lieferung, in CLAUDE.md Abschnitt 13 verankert): alle 42 MP3/verlust-
  behaftet, Detail in SOUND-INVENTAR.md Abschnitt D. Wunschformat an Autor:
  WAV 48kHz/24bit als Quelle; kurze Effekte direkt WAV, langes als OGG q8+.
- R110 Gesockelte Steine ueberall (Autorwunsch "Steine geben Schaden UND
  sichtbaren Element-Effekt - bei allen Waffen und allen Spezialeffekten"):
  (1) Schulstufen-Sperre entfernt: ELEM_PFEIL.stufe 3 -> 0 (Steine wirken
  sofort, tunebar in items.ts). (2) Nahkampf: Feuer brannte nicht - jetzt
  steinProc() zentral (Feuer=DoT, Eis=slow, Schatten=Lebensraub, Werte in
  ELEM_WAFFE, reine Logik in logic/steinEffekte.ts mit Tests). (3) Nahkampf-
  FAEHIGKEITEN (Rundumschlag, Sturmangriff, Wuchtschlag, Blutdurst,
  Erschuetterung) geben jetzt Stein-Bonus-Schaden + Element-Wirkung + Element-
  Farbton auf Welle/Burst. (4) Stab-Bolzen wird elementar (Farbe/Glueh-Flag/
  On-Hit ueber die bestehende Projektil-Pipeline pr.elem). Pfeil-Faehigkeiten
  liefen schon alle durch veredelPfeil (R58). Browser-verifiziert: Feueropal
  -> Gegner brennt (2.2s/5dps), Eis -> slowT 1.2, Pfeil elementar ab Stufe 0,
  Bolzen traegt Element. 254 Tests gruen.
- R112 Settings-Menue im Vorlage-Stil (Autor + Codex-Lieferung): Codex-Branch
  codex/ui-texturen gemergt (parchment/wood/button.png + reference/menue-
  vorlage-1300.png). Neues DOM-Menue src/ui/settingsMenue.ts nach der Vorlage:
  Holzrahmen+Eisenecken, Leder-Buchreiter links (Ton rot/Bild gruen/Grafik
  braun/Steuerung blau/Allgemein grau), Pergament-Banner+Siegel, Messing-Regler,
  dunkle Wert-/Tastenknoepfe, STANDARD/ZURUECK+Siegelband. SettingsScene ist nur
  noch Daten+Callbacks (Presets, Keybind-Capture, Live-Lautstaerke) und raeumt
  das DOM bei SHUTDOWN ab. Browser-verifiziert inkl. RUECKWEG (auf-zu-auf),
  Texturen aktiv, Preset+Regler schreiben localStorage. KEIN grosses Menuebild -
  Vorlage-Optik aus CSS + kachelbaren Codex-Texturen.
- R111b Licht-Regler "verschwunden" aufgeklaert (Autor "Fackeln warfen mehr
  Schatten, Regler weg/kaputt"): Die LICHT-WERKBANK (Taste L, ~30 Regler inkl.
  aller Fackel-/Schattenwerte) existiert unveraendert - sie war nur nirgends
  verlinkt. Der F10-LICHT-Tab hatte NUR Nacht-Regler. Jetzt: Knopf "Licht-
  Werkbank oeffnen" im F10-LICHT-Tab + die wichtigsten Fackel-Regler dort
  gespiegelt (gleiche Settings). WICHTIG als Hinweis dokumentiert: die GRAFIK-
  Voreinstellungen (R107) setzen schattenFackeln/dungeonNeu mit um - "Niedrig/
  Mittel" reduziert Fackelschatten; "Hoch" stellt sie wieder voll an. Das
  erklaert den Eindruck "frueher mehr Schatten".
- R111c Dev-Kompendium: gesockelte Schwerter/Aexte/Staebe (je Element, power 4)
  neben den gesockelten Boegen - zum Sofort-Testen der R110-Element-Effekte.
- R113 Wetter + Spuren (Autorauftrag): (1) DONNER rollt jetzt immer (Synth-
  Grollen als Fallback bis donner.mp3 kommt; Blitz existierte schon im
  WetterOverlay, Doppel-Flash). (2) MOOR-NEBEL: nach dem Regen (Naesse>=0.40,
  Hysterese bis 0.22) ziehen gesichtslose Schwaden uebers Land (NebelFratzen
  mit gesichter:false + neue nebel_schwade-Textur; Fratzen bleiben dem
  Blutstrom vorbehalten). Feld heisst wetterNebel (moorNebel kollidierte mit
  dem statischen R81-Nebel). (3) MATSCH: Naesse>=0.45 auf Gras/Weg draussen ->
  Tempo x0.85 + schritte_matsch (Schmatz-Synth) + braune Fussabdruecke.
  (4) SPUREN: Fussabdruecke (L/R versetzt, 26s Ausblenden, max 220) in Matsch
  UND Blut (Blutlache betreten oder fleischiger Nahkampf-Kill aus der Naehe ->
  8 rote Tritte). (5) BLUT AM HELDEN: heldBlut 0..1 (Tint der Figur ab 0.22),
  trocknet kaum, Regen waescht, Waten waescht schnell (heldNass). KEIN NPC-
  Kommentar (Autor: weggelassen). Werte in data/welt.ts (MATSCH/MOOR_NEBEL/
  SPUREN), reine Logik in logic/spuren.ts (5 Tests). Browser-verifiziert.
- R113b Backlog (Autor "fuer spaeter, wenn das Dorf steht"): Belagerungs-
  Vorlauf (3 Warnstufen: Raben sammeln, Tiere fliehen, Hornstoss) + Glocken/
  Tagesrhythmus/Nachtwaechter -> IDEEN-BACKLOG.md.
- R112b Settings-Menue STRUKTURELL an die Vorlage (Autor "nicht nur Texturen
  drueberlegen"): Rahmen kompakt (1120x600, box-sizing border-box - vorher
  blaehten padding+border das Fenster auf Vollbreite), ALLE Reiter zweispaltig
  (CSS columns, break-inside avoid), Regler mit KURZER fester Schiene (150px)
  statt Vollbreite, engere Zeilenabstaende, Leder-Buchreiter sitzen AUF dem
  Holzrahmen (nicht daneben schwebend), Banner/Knoepfe verkleinert. Kein
  grosses Menuebild - weiterhin CSS + Codex-Texturen. menu-ui-template/
  (Restyle-Brief + HUD-Handover + final-hud-extra-flat-reference-layout-1300)
  liegt NUR auf dem Autor-PC, nicht im Repo -> HUD-Arbeit blockiert, bis die
  Dateien gepusht sind (siehe OFFENE-FRAGEN).
- R115b (Autor "die Leiste ist nicht was ich wollte - darf Codex uebernehmen?"):
  Claudes flacher HUD-Umbau (R115) per git revert zurueckgenommen - der
  vorherige Kugel-Stand ist wieder aktiv. Die HUD-Leiste (src/ui/hud.ts) ist
  an CODEX uebergeben (Regeln + zu erhaltende Anker in CODEX.md Abschnitt 6).
  Claude fasst hud.ts bis auf Weiteres nicht mehr an; Integration/Review der
  Codex-PRs weiterhin bei Claude.
- R118 V9 GEBAUT (Autor "V9 bauen"): Generator v9Dungeon (BSP 84x70, MIN-Kante
  10, Tueren 3 breit, Spannbaum+Grad-2 -> jeder Raum >=2 Tueren, 25-Seed-Tests)
  + v9Krypta (Live: Treppen im entferntesten Raum, Wand-Fackeln, 2-6 SCHLAFENDE
  Gegner je Raum via EnemySpawn.schlaeft, 30% Truhen) + T.DTUER=57 (SOLID ->
  blockiert Weg UND Sichtfeld; Holztuer-Zeichnung) + Enemy.schlaeft (weckt nur
  Tuer/Schaden) + oeffneDungeonTuer (Strang zu Boden, Tuerblatt-Aufschwing-
  Tween, tuer-Klang, refreshTile, wegfeldNeu, weckt angrenzende Raeume).
  Einsatz flexibel: V9_EINSATZ / window.__v9Einsatz / F10-Testknopf.
- R121 Weg-Malen im Dorf-Editor (Autorwunsch "Feldweg selber zeichnen; die
  Strasse in der Stadt ist anders"): Mal-Sektion in der Editor-Leiste -
  FELDWEG (lehm) und STRASSE (gepflastert) als getrennte Pinsel, RADIERER,
  Pinselgroesse 1-3, "Wege loeschen". Malen = halten & ziehen (dorfMale ueber
  die Pointer-Handler, Vorrang vor Auswahl/Platzieren, Rechtsklick bricht ab).
  Gemalte Kacheln: eigene Ebene (halbtransparent), localStorage
  'ravensmoor.dorfwege.v1', im 📋-Bericht als kompakte ZEILEN-LAEUFE
  (wegeZuLaeufen -> DORF_WEGE-Block, [xStart,xEnde,y] je Sorte) - der Autor
  malt, schickt den Bericht, ich backe die Laeufe fest in die Generierung
  (T.PATH/Pflaster) und leite mehr daraus ab. Logik + RLE getestet (9 Tests).
- R122 Codex-HUD gemergt (PR #2, codex/hud-leiste): NUR src/ui/hud.ts geaendert
  (Regel eingehalten). HUD bleibt flach (Leben links, Maus-Block, Tastenblock,
  Mana rechts), keine hohen Saeulen mehr - gespeicherter Stil 2 faellt auf
  kompakte Kugeln zurueck; ruhigere Orbs, Messingkanten, Trank-Plaketten,
  Statuszeile. hotbarMitteX als Alias ergaenzt (tastenLeisteMitteX bleibt).
  Claude-Review: alle oeffentlichen Anker (orbHpAnkerX/orbMpAnkerX/
  mausLeisteAnkerX/hotbarMitteX/tastenLeisteMitteX) + Hud-API (update,
  belegeBeiPunkt, klickBlockiert) erhalten. tsc sauber, 271 Tests gruen
  (Codex 262 auf aelterer Basis), im Browser flach + fehlerfrei verifiziert.
- R124 Boden-Stile (Autorwunsch "Variationen in Bodentexturen, 10 Beispiele +
  zur Auswahl in der Probe, dann begehbar"): src/gfx/bodenStile.ts - 10
  prozedurale 32x32-Boeden (Grabplatten, Schwarzer Schiefer, Kopfsteinpflaster,
  Ziegel, Marmor, Moosstein, Sand, Erde, Blutstein, Gebein), lazy in den
  Szenen-Cache gebacken (bodenStilTextur, je Variante 0-6). DUNGEON-PROBE:
  Swatch-Reihe (10 echte Textur-Kaestchen, Klick waehlt, Rahmen markiert);
  BEGEHEN/SPIELEN gibt bodenStil an DungeonSpielScene weiter, die den Boden
  damit zeichnet (sonst Standard-Krypta). Alle Live-Generatoren (V1 buildCrypt,
  V8 Katakomben, V9 buildV9Krypta) SIND bereits in der Probe waehlbar (V1-V11).
- R125 HUD-Assets (Codex PR #3, codex/hud-assets-1300) in src/ui/hud.ts
  integriert (Autorwunsch "Integriere die HUD-Assets; Texte/Zahlen/Icons
  dynamisch aus dem Code, keine AI-Schrift einbacken"). Nur hud.ts angefasst.
  Geladen zur Laufzeit (ladeHudAssets -> scene.load.image + load.start,
  COMPLETE-Hook), bis dahin bleibt die prozedurale Optik als Fallback
  (assetsReady-Flag). Eingesetzt: hud-orb-life/mana-empty (Lebens-/Manakugel),
  hud-slot-empty (Slot-Rahmen), hud-potion-label-blank (Trank-Plaketten),
  hud-status-strip-blank (Statusleiste). Dynamisch drueber gezeichnet: Zahlen
  (90/40), Icons/Tastensymbole, Q/F-Trank-Anzahl, Statuszeile. Orb-Fuellstand =
  Bild unten anteilig zeigen (setCrop) + dunkle Basis + Bronzering auf gfxOver.
  Slot-Kategoriefarbe (Kampf/Zauber/Bogen/Item, R36/R51) bleibt als duenner
  Rand ueber dem Slot-Bild erhalten. Zweite Graphics-Ebene gfxOver (Depth 4602)
  fuer alles ueber den Bild-Assets (Kategorierand, Abkling-Schleier, Orb-Ring);
  Icons auf 4603. Anker (orbHpAnkerX/orbMpAnkerX/mausLeisteAnkerX/hotbarMitteX/
  tastenLeisteMitteX) + Hud-API unveraendert. tsc sauber, 275 Tests gruen,
  im Browser verifiziert (beide Orbs, Slots, Plaketten, Statusleiste flach im
  1300er-Messingstil - wirkt wie hud-reference-final-extra-flat-1300.png).
- R125 V11-Fix (Autor: "v11 voll verkackt - Uebergaenge 1 statt 3 breit, ueberall
  schwarze ungefuellte Flaechen; Generator-Grundansatz lassen"): (1) grabeGang-Bug
  - die Verbreiterungs-Spur lag LAENGS zur Laufrichtung statt QUER (setze-Flag
  invertiert) -> Gaenge nur 1 breit. Jetzt 3-breit (Regressionstest: 0 duenne
  1-breite Gang-Kacheln ueber 25 Seeds). (2) Fuell-Schritt von Rejection-Sampling
  auf WELLEN mit Distanztransformation umgestellt (felsNachTiefe): je Welle alle
  Fels-Kacheln nach Tiefe sortiert, von tief nach flach mit passend grossen
  Raeumen gefuellt -> Raeume wandern um die Hauptraeume herum, Fels faellt von
  ~65% auf ~31-36%. Rand nicht als Distanz-Quelle (Ecken werden gefuellt). Kein
  Endlos-Spin mehr (frueher Single-deepest-cell-Ansatz haengte an unplatzierbaren
  Rand-Zellen). tsc sauber, 277 Tests gruen, im Browser (Dungeon-Probe V11) dicht
  + unregelmaessig + 3-breite Passagen verifiziert.
- R126 V4 = echte HÖHLE/MINE (Autorwunsch + 4 Referenzfotos Stollen): 25%
  kleiner (147x90 statt 196x120, linear je Achse - Annahme, leicht änderbar in
  src/data/mine.ts). ERZADERN: Codes 4 Eisen / 5 Kupfer / 6 Gold als SOLIDE
  Wandkacheln, per Zufallslauf entlang der Wand-Boden-Kante gewachsen (liegen
  sichtbar im Stollen wie eine Goldader). Kupfer aufgenommen - historisch
  korrekt fuer 1300/1400 (Kupferbergbau u.a. Rammelsberg/Falun; Malachit-gruene
  Optik gewaehlt). Alle Werte in src/data/mine.ts (Adern-Anzahl, Laengen,
  Anteile, Licht, Tropfen). Optik: src/gfx/hoehlenArt.ts (proz. Texturen:
  Geroell-Wand aus eckigen Brocken, erdiger Hoehlenboden, Erzadern mit
  Funken, Holzbohlen fuer Kammern). Atmosphaere: src/gfx/hoehlenAtmosphaere.ts
  (Dunkelheit als RenderTexture + radierte Lichtkreise: Heldenlaterne warm +
  flackernd, Grubenlampen an Wandkanten mit Mindestabstand; Wassertropfen mit
  Fall-Animation + positionalem Synth-"plip" (wasser_tropfen, ueber AudioBus
  mit Hoehlen-Hall setzeUmgebung 0.9); Pfuetzen; Gold-Glitzern). ZWEI im
  Browser gefundene + gefixte Fehler: (a) Waende (Depth ty*32) lagen UEBER der
  Dunkelheit (640) und dem Szenen-HUD (700) -> Dunkelheit auf 5000, Glows 4900,
  HUD-Texte 6000; (b) RenderTexture.erase() achtet den Stempel-URSPRUNG
  (Mitte) - Position = Lichtzentrum, nicht Ecke (alle Lichter sassen sonst um
  ihren Radius nach oben-links versetzt). "Live": sofort spielbar in der
  Dungeon-Probe (V4 -> SPIELEN, volle Atmosphaere); Oberwelt-Eingang der Mine
  ist ein eigener Schritt (OFFENE-FRAGEN). tsc sauber, 279 Tests gruen
  (4 Hoehlen-Tests: Groesse, Adern-Anzahl, Erz-an-Kante, Erreichbarkeit),
  Browser-Screenshots: Stimmung wie Referenz (dunkel, warme Lichtinseln).
- R127 Boden-Stile 2.0 (Autor: "natuerlicher, Ziegel passt nicht, Kirchenboden/
  Mosaik/Plattenboden..., verschiedene Boeden je Raum"): bodenStile.ts auf 20
  Stile ausgebaut, alle mit gemeinsamen Natur-Bausteinen (Koernung, Trittspur-
  Abnutzung, Risse): Steinplatten (Fugen versetzt statt mittig), Schiefer
  (Schichtung), Kopfstein (Moertelbett + Lichtkante), Fischgraet-Ziegel (opus
  spicatum, ERSETZT den alten Wand-Ziegel), Marmor (Wolken+Adern), Marmor-
  Schachbrett, Kirchenfliesen (glasiert, zweifarbig, abgeplatzte Ecken),
  Steinmosaik (Tesserae), Ornamentplatte (Rosette), Sandstein, Kalkstein
  (abgetreten), Granit, Flusskiesel, Holzdielen (Maserung+Astloch), gestampfter
  Lehm (Trockenrisse), Erde, Moosstein (Moos WAECHST AUS DEN FUGEN), Sand
  (weiche Verwehungen), Blutboden (eingetrocknete Lache+Spritzer), Gebeinboden
  (Knochen+Schaedel). RAUM-BOEDEN: ProbeKarte.raumBoeden (Rechteck+Stil);
  V8 nach ROLLE (Folter=Blut, Beinhaus=Gebein, Kerker=Lehm, Kapelle=
  Kirchenfliesen, Skriptorium=Holzdielen, Schatzkammer=Mosaik, Bossarena=
  Schachbrett, Krypta=Rosette, Wachstube=Flusskiesel), V3/V6 nach Thema
  (Blut/Knochen/Folter; Haupthalle=Kirchenfliesen, Kloster-Kandidat),
  V9/V10/V11 zufaellig ~30% der Raeume aus einem Pool. Sonder-Boden schlaegt
  den gewaehlten Stil, nur begehbare Kacheln. Gewaehlter 'ziegel' (entfernt)
  faellt sauber auf Stil 1 zurueck (find ?? [0]). tsc sauber, 283 Tests gruen
  (4 neue: 20 Stile/IDs, V8-Rollen-Boeden, V3-Fliesen, V9/V11-Zufall), im
  Browser verifiziert (Swatch-Reihe 20, V8: Rosetten-Krypta + Blut-Folterkammer).
- R127b Böden gedämpft (Autor: "zu hell/zu bunt - so farbig sind die in echt
  nicht"): globaler Dämpfungs-Pass in bodenStilTextur (daempfe): entsättigt
  Richtung Luminanz (SAETTIGUNG 0.6 = ~40% Farbe raus) + leicht abgedunkelt
  (HELLIGKEIT 0.86) via getImageData/putImageData je Kachel. Zusätzlich die
  hellsten Grundwerte gesenkt: Marmor 168->128, Schachbrett-Hellfeld 172->132,
  Kalkstein 148->120, Sand 132->112, Sandstein 128->114; Kirchenfliesen-Ocker +
  Mosaik-Palette entsättigt, farbige Mosaik-Steine seltener. Ein Regler
  (SAETTIGUNG/HELLIGKEIT) tunt die gesamte Boden-Stimmung. REGEL (Autor): pro
  Karte max. 2 verschiedene Bodenplatten (1 Basis + 1 Insel-Boden). tsc sauber,
  283 Tests grün, im Browser: ruhiges Steingrau/-braun statt Buntmuster.
  (Hinweis: nach Container-Reset war node_modules weg + Branch auf alten Stand
  detached - Branch sauber auf origin realigned, Deps neu installiert, R127b
  frisch aufgesetzt.)
- R127c Nahtloses Gestein + Boden-Fixes (Autor: "Steine abgehackt wenn sich
  das Muster wiederholt - muss geloest werden"): hoehlenArt.ts auf SUPERTEXTUR
  umgebaut - Wand/Boden/Bohlen werden auf EINE 256x256-Flaeche (8x8 Kacheln)
  MIT UMLAUF gezeichnet (jede Form an 9 Versatz-Positionen: was rechts raus-
  laeuft, kommt links wieder rein), dann in 64 Einzelkacheln geschnitten und
  in DungeonSpielScene NACH POSITION (tx%8, ty%8) verlegt. Ergebnis: Steine
  laufen ueber Kachelgrenzen im Nachbarn weiter, nichts abgehackt, und die
  8x8-Flaeche kachelt mit sich selbst nahtlos (im 6x6-Naht-Beweisbild ist kein
  Raster erkennbar). Erzadern = Band UEBER dem nahtlosen Wand-Ausschnitt
  (Richtung im Schachbrett -> Adern verbinden sich). Bohlen: durchlaufende
  Bretter mit versetzten Stossfugen, Umlauf-Segment behaelt einen Ton.
  hoehleTextur-Signatur: (scene, art, tx, ty) statt variant. AUSSERDEM:
  Granit entschaerft (28 statt 60 Sprenkel, Alpha ~halbiert, Plattenrand WEG -
  "zu dominant, nutzlos bei Wiederholung"); Lehm + Erde ohne Abnutzungs-
  Ellipse (ovales Overlay wiederholte sich sichtbar; passt jetzt zur Hoehle).
  tsc sauber, 283 Tests gruen, im Browser verifiziert (Naht-Beweis + V4 live).
- R127d Felsige Hoehlen-Kanten + mehr Adern (Autor: "Kanten der Vierecke
  abrunden / aeussere Schicht uneben und felsig; Adern deutlich erhoehen"):
  (1) hoehleKante in hoehlenArt.ts - an jeder Wand-Boden-Grenze liegt ein
  gezackter Fels-Ueberlauf auf der Bodenkachel (dunkler Schattensaum mit
  unregelmaessigem Profil + halb eingegrabene Geroellbrocken, Dicke 14px).
  Profil = Summe PERIODISCHER Sinuswellen ueber 256px -> die 8 positions-
  basierten Schnitte (tx%8 bzw. ty%8) laufen ueber Kachelgrenzen nahtlos
  durch (gleiche Supertextur-Technik wie R127c). Verlegt in DungeonSpielScene
  auf Hoehlenboden (Code 1) je Wandnachbar (oben/unten/links/rechts, Depth -9);
  Kammer-Bohlen/Tueren bekommen KEINE Felskante (gebaute Raeume). Ecken mit
  zwei Wandseiten ueberlappen sich -> wirkt zusaetzlich felsig. (2) MINE.ADERN
  26 -> 64 (Test verschaerft: >40 Adern, >120 Erz-Kacheln). tsc sauber,
  283 Tests gruen, Browser: Waende lesen sich als unregelmaessige Felsmassen,
  Adern deutlich praesenter (HUD zeigt "64 Erzadern").
- R127e Erzadern realistisch + abbaubar + MINE LIVE (Autor: "sind die wirklich
  so? pruefe mit dem Internet, korrigiere Farben, mache sie abbaubar, nimm die
  Karte gleich live"): RECHERCHE (Wikipedia Goldquarzgang u.a.): Gold kommt als
  GOLDQUARZGANG vor - 97-98% weiss-grauer Quarz, Gold nur als kleine metallisch-
  gelbe Sprenkel; Eisen um 1300 = Roteisenerz/Haematit (rotbraun, Rost-Hof,
  stahlgrauer Glanz); Kupfer = Kupferkies (messinggelb), oberflaechennah zu
  GRUENEM Malachit (selten blauem Azurit) verwittert. zeichneErzBand in
  hoehlenArt.ts entsprechend umgebaut (eine gewuerfelte Mittellinie, alle
  Striche/Sprenkel darauf). ABBAU: 'kupfer' als neues Material (MaterialId,
  Name, kupferProAder 3; alte Saves sicher - materials wird mit Defaults
  gemerged); Abbaubar.erz ('eisen'|'kupfer'|'gold') je Ader; interactHint
  nennt Eisen-/Kupfer-/Goldader und mine() zahlt passend aus (Gold weiter ins
  Dorf-Lager, Held sichert/Knappen schuerfen); macheFelsBild kennt Kupfer-
  Einsprengsel (Malachitgruen). LIVE: buildGoldmine nutzt jetzt den V4-
  Generator (147x90) statt des alten 30x20-Handlayouts - Eingang/Rueckweg
  (Hoehlenmaul im Wald), Befreien-Quest (goldmineGesichert, 12 Besatzer,
  2 Eliten), 2 Truhen tief drin, sparsame Grubenlichter; Erzadern aus dem
  Generator als T.ORE mit Typ. 2 neue Tests (Groesse/Typen/Treppe/Spawn +
  volle Erreichbarkeit inkl. Gegner/Truhen). E2E im Browser verifiziert:
  Kupferader +3 Kupfer, Eisenader +3 Eisen, Goldader +2 Golderz (Dorf-Lager).
  HINWEIS: Headless-Browser lief nur ~3-4 FPS -> Abbau-Cooldown (1,4s,
  unveraendert alt) im Test uebersprungen; die Mechanik selbst ist verifiziert.
  OFFEN: Hoehlen-OPTIK (Supertexturen/Kanten/Licht/Tropfen) in WorldScene
  portieren - die Live-Mine nutzt noch die Standard-Fels-Optik.
- R127f LIVE-Mine komplett (Autor: "packe das schoene Zeug live rein"):
  (1) OPTIK: zeichneKachel rendert bei a.hoehlenOptik (Goldmine) das nahtlose
  Probe-Gestein live - T.ROCK-Waende als Supertextur-Ausschnitte nach Position,
  Hoehlenboden/Bohlen ebenso, gezackte Fels-Kanten an jeder Wandgrenze;
  Untergrund unter Objekten positionsbasiert (unter Erz die Stollenwand).
  (2) VORKOMMEN statt Adern (Autor: "Adern kacke, sichtbare grosse Vorkommen"):
  zeichneVorkommen in hoehlenArt - Nugget-Nest in Quarz-Tasche (Gold),
  Haematit-Brocken mit Rost-Hof (Eisen), Kupferkies mit Malachit-Kruste
  (Kupfer); in der Live-Szene als abbaubares Objekt (vorkommenTextur) AUF der
  Wand, Abbau-Stufen rissig/Geroell unveraendert. Probe nutzt dieselbe Optik.
  (3) GESTEIN ABBAUBAR: 14 Felsbrocken auf dem Hoehlenboden (a.rocks, Groessen
  0-2, nur in offener Flaeche >=6 freie Nachbarn - kein Gang verstopft).
  (4) KAMMERN = Rueckzugsorte der Knappen: Bohlenboden, Tisch (NICHT in der
  Tuerspalte - versiegelte sonst die Kammer, Test-Fund), Stuehle (begehbar),
  Bett nur bei >=3 Innenzeilen (Versiegelungs-Fund #2), Vorrats-Fass,
  Kerzenlicht (herde). Moebel/Brocken VOR den Spawns gesetzt.
  (5) MINENEINGANG (Autor): im NORDEN von FINSTERHAIN (wald_o, letzte Karte
  vor Ravensmoor) - Felsmassiv mit Stollenmaul (T.STAIR), Weg zur Salzstrasse,
  davor VERLASSENER WACHPOSTEN als Platzhalter (Zaun-Fragmente, 2 kalte
  Kohlebecken, zurueckgelassene Faesser/Kisten, Labels); Ruegkweg der Mine
  fuehrt an dieses Maul (special 'goldmine' in wald_o). Alter Dunkelwald-
  Verweis ersetzt (Eingang dort war seit R53 ohnehin entfernt). Autor bessert
  die Eingangs-Optik spaeter nach. tsc sauber, 285 Tests gruen, E2E im
  Browser: Finsterhain -> Stollenmaul-Hint -> Goldhoehle (neue Optik sichtbar:
  nahtlose Waende, Bohlen-Kammer mit Tisch/Stuehlen/Fass, gruene Kupfer-
  Vorkommen) -> Rueckweg-Hint.
- R127g Höhlen-Atmosphäre LIVE in der Goldmine (Autor: "da muss die Atmosphäre
  wie im Dungeon rein, auch Tropfen"): neue Klasse src/gfx/hoehlenLeben.ts -
  KEINE eigene Dunkelheit (die macht in der WorldScene die lightRT: Helden-
  laterne + Grubenfackeln), nur das LEBEN: Wassertropfen (fallend + Aufprall-
  Ring + positionaler "plip" wasser_tropfen über den AudioBus mit Höhlen-Hall,
  nur nahe dem Helden <760px), stehende Pfützen (einmal gebacken), Gold-
  Glitzern an sichtbaren Gold-Vorkommen. In WorldScene.goArea bei a.hoehlenOptik
  angelegt (sonst zerstört), pro Frame update, Hall auf MINE.HALL (0.9) statt
  0.8. Werte in src/data/mine.ts. tsc sauber, 285 Tests grün, im Browser:
  Leben aktiv (24 Tropfstellen, 53 Gold-Vorkommen), keine JS-Fehler.
- R127h Zimmermannshaus als ATLAS + verschiebbar in Ravensmoor (Autor-Handoff:
  1 Atlas-PNG + 1 JSON statt 11 Layer). NEU: src/gfx/hausAtlas.ts (HausAtlas) -
  lädt zur Laufzeit assets/houses/medieval_carpenter_house_atlas.png/.json
  (Loader-Key haus_zimmermann), baut daraus Hauptsprite (Zustand), Vordergrund-
  Occlusion, Bodenschatten und additive Fensterlicht-Maske. Alle Layer teilen
  denselben Ursprung; Boden-Anker building_ground_rear = (916.5, 682.07) auf dem
  1400er Canvas -> Weltposition = footprint - Anker*skala, y-sortiert am Anker.
  Zustände (Tür zu/auf, Innenraum EG/OG) = reines Frame-Umschalten (setZustand).
  FEHLT der Atlas (aktuell), zeigt HausAtlas einen prozeduralen Fachwerk-
  PLATZHALTER (sichtbar + verschiebbar) - Spiel bleibt lauffähig; erkannt via
  Frame-Check (Dev-Server liefert fehlende Datei als HTML/200). VERSCHIEBBAR:
  das Haus hängt an der Dorf-Editor-Box N1 in 'stadt' (Ravensmoor) und folgt ihr
  LIVE beim Ziehen (dorfRender -> setPosition). Kamera-Zuordnung über ignoriere-
  Callback (nur Welt-Kamera, nicht UI). Andockstelle dokumentiert in
  assets/houses/README.md (Dateinamen, Frames, Anker, untrimmte-Layer-Empfehlung).
  tsc sauber, 285 Tests grün, im Browser: Platzhalter in Ravensmoor an N1,
  folgt der Box beim Verschieben (footX == Box-footX).
- R127i Licht/Schatten 1:1 in der Hoehle (Autor: "das System muss ueberall
  gleich sein, es ist nur eine andere Karte"): PRUEFUNG ergab - das Licht-
  SYSTEM war bereits identisch (lightRT-Dunkelheit, Raycaster-Wandschatten
  dungeonNeu, Fackel-Logik, Sichtfeld haengen alle nur am dark-Flag; die
  Schattenwerfer kommen generisch aus isSolidAt, Minen-Fels wirft also schon
  Schatten wie Krypta-Waende). Der EINE echte Unterschied: die hohen Wand-
  koerper (R84) hingen am Kachelnamen krypta_wand_front - Minen-Fels (T.ROCK)
  blieb flach, dadurch fiel Fackellicht anders. FIX: hoeheFelsWand in
  hoehlenArt.ts - nach Sueden zeigende Fels- UND Erz-Kacheln der Mine bekommen
  denselben hohen Wandkoerper (licht.wandHoehe Kacheln, Fuss-Anker unten,
  Depth (ty+1)*TILE-6 wie die Krypta), gestapelt aus der nahtlosen Fels-
  Supertextur (unterste Zeile = eigener Ausschnitt, darueber die Zeilen
  darueber mod 8 -> horizontal und vertikal nahtlos). Erz-Vorkommen-Objekt
  liegt knapp UEBER dem Wandkoerper (ty*32+28). tsc sauber, 285 Tests gruen,
  im Browser: Heldenlicht + Felswaende ok, keine JS-Fehler.
- R128 Fackellicht-Regression behoben (Autor: "das Licht war perfekt vor dem
  Hochziehen der Waende - viel weicher und gleichmaessiger; die Regler danach
  haben es nie zurueckgebracht"): URSACHE gefunden - Commit 9fe7ded ersetzte
  den eigenen weichen Dungeon-Licht-Weg (lightRT: weiche runde eraseLight-
  Kreise + warme Glows) durch die SchattenManager-Raycaster-Engine und
  schaltete sie per dungeonNeu=true zum STANDARD. In grossen offenen Raeumen
  (Goldhoehle!) wirkt das Raycaster-Licht als riesiges hartes Polygon-Segel.
  FIX: dungeonNeu-Default auf false (das alte weiche lightRT-Licht ist wieder
  Standard, ueberall - Krypta UND Mine, ein System) + einmalige Migration
  lichtV<1 -> dungeonNeu=false, damit auch der GESPEICHERTE Stand des Autors
  umspringt (localStorage ueberlagert sonst den neuen Default). Der Raycaster
  bleibt als bewusste Option in der Licht-Werkbank (Taste L, "Dungeon-
  Wandschatten"). Verifiziert im Browser: Krypta E1 + Goldhoehle zeigen wieder
  weiche warme Lichtkreise. tsc sauber, 285 Tests gruen.
- R128b Alte E1 wieder eingereiht (Autor: "du hast E1 ersetzt - lass es so,
  aber pack die alte E1-Karte dahinter, dann gibt es mehr Ebenen"): URSACHE
  der "neuen E1" gefunden - der F10-Testknopf "Katakomben-Dungeon betreten
  (Ebene 1, Test)" schaltet KATAKOMBEN_EINSATZ.ebenen auf [1]; wer ihn drueckt,
  bekommt fortan die Katakomben-Karte als crypt1 (Session/Spielstand). JETZT
  OFFIZIELL: KATAKOMBEN_EINSATZ.ebenen = [1] fest (Katakomben = Ebene 1), und
  Sonder-Ebenen ERSETZEN die klassische Kette nicht mehr, sondern SCHIEBEN sie
  nach unten: kryptaVersatzUnter/ebeneFuerKlassik (data/katakombenDungeon.ts),
  getArea baut crypt(n) als buildCrypt(n - versatz) mit id/depth = n. Ergebnis:
  crypt1 = Katakomben-Gewoelbe (84x70), crypt2 = ALTE E1 (Krypta - Gruft,
  44x44, Inhalt 1:1), crypt3 = Beinhaus, ..., Grab-Vorstufe (klassisch 5)
  liegt auf Ebene 6 - alle Hardcodes (crypt5->boss, boss->crypt6, Treppen-
  Labels, EBENE-6-Anzeige, Endlos-Tiefe) dynamisch ueber ebeneFuerKlassik(5).
  3 neue Tests (Versatz + Grab-Ebene). E2E im Browser: Kette crypt1..crypt6
  mit korrekten Namen/Groessen/Tiefen verifiziert. 288 Tests gruen.
- R128c Licht-Werkbank verschiebbar (Autor: "warum kann ich die Licht-Werkbank
  nicht verschieben?" - Verstoss gegen UI-Regel 11): LichtPanel bekommt die
  Titelzeile als Verschiebe-Griff (ziehPanel), Position wird in settings.ui.
  lichtPanel {x,y} gespeichert und beim naechsten Start wiederhergestellt.
  verschiebe() verschiebt x0/oben/viewTop + alle Regler-X + Titeltext, Y laeuft
  ueber viewTop automatisch mit, auf dem Schirm geklemmt. tsc sauber, 288 Tests
  gruen, im Browser: Panel per Titel gezogen (980/90 -> 580/270), gespeichert.
- R129 ECHTER KRIEGSNEBEL (Autor: "den gelben Bereich duerfte ich gar nicht
  sehen - Sichtweite dimmt nur alles, kein echter Fog of War"): Diagnose
  bestaetigt - das weiche Licht hat KEINE Sichtlinienpruefung (Fackeln decken
  Raeume hinter Waenden auf) und KEIN Gedaechtnis (Sichtweite = globaler
  Dimmer). NEU src/systems/kriegsnebel.ts: berechneSicht (reiner, getesteter
  Kern - Bresenham-Strahl je Kachel, Waende selbst sichtbar, blocken dahinter)
  + KriegsnebelAnzeige (Schleier UEBER dem weichen Licht, Depth 4050 ueber
  lightRT 4000 und Warm-Glows 4010, unter HUD): nie gesehen = schwarz (auch
  Fackel-Glows scheinen NICHT durch), gerade sichtbar = frei, erkundet =
  gedaempfte Erinnerung (Regler nebelErinnerung, Default 45). Gedaechtnis je
  Ebene in der Session (nebelGedaechtnis Map in WorldScene). Schalter
  licht.kriegsnebel (Default AN) + Regler in der Licht-Werkbank; das weiche
  Licht selbst ist unangetastet. Zeichnung nur im Kamera-Ausschnitt mit
  Zeilen-Lauf-Zusammenfassung (Perf). 3 Kern-Tests. E2E im Browser (crypt2,
  Autor-Szenario): Nebenraeume schwarz, Erinnerung gedimmt, Sicht folgt den
  Waenden. OFFEN (ehrlich): Gedaechtnis wird noch NICHT im Spielstand
  gespeichert (nur Session) und die Minimap zeigt weiter alles - beides als
  Folgeschritt, wenn der Autor den Nebel so abnimmt.
- R130 Kriegsnebel v2 (Autor-Abnahme der Zusammenfassung, Punkt fuer Punkt):
  (2) LICHT ERWEITERT DIE SICHT: berechneSicht prueft jetzt Basis-Sichtweite
  ODER Beleuchtung durch eine Lichtquelle - immer INNERHALB der Sichtlinie
  (nie durch Waende). Quellen aus WorldScene: Fackeln (r95), Lagerfeuer,
  Feuerzauber, gluehende Geschosse, Kerzen-Herde - erweiterbar fuer alles
  Kuenftige; Neuberechnung auch bei Quellen-Bewegung (Feuerball-Signatur).
  (4) ERINNERUNG STANDARD AUS (verdeckt bleibt verdeckt - Orientierung ist
  Aufgabe der Karte), aber als FALLBACK-Schalter nebelErinnerungAn + Staerke-
  Regler in der Werkbank behalten (Autor: "falls es mir doch nicht gefaellt").
  Das erkundet-Set wird weiter gepflegt - es speist die kommende Minimap-
  Kartographie. (7a) WEICHE SICHTKANTE: Doppelsaum (sichtbare Randkachel 0.3,
  verdeckte Kachel neben Sicht 0.7*basis) statt hartem Kachelschnitt.
  (6) DEV-KONSOLE: "Kriegsnebel auch DRAUSSEN (Test)" (licht.kriegsnebelDraussen)
  - ensureKriegsnebel baut den Nebel lazy im Update auf, damit der Schalter
  sofort wirkt; Autor-Idee "draussen sobald es dunkler wird" notiert.
  (7b) HELD-SCHEIN VOM HELDEN AUS: der warme Held-Glow (placeWarm idx 0) liegt
  jetzt KNAPP UNTER der Figur (Tiefe py-0.5) statt darueber - der Held bleibt
  in seinen Farben; placeWarm hat dafuer einen optionalen Tiefe-Parameter.
  Fallback-Schalter heldGlutUeberFigur (Werkbank) stellt den alten Look her.
  5 Kern-Tests (inkl. Licht-erweitert-Sicht + nie-durch-Waende), 293 gruen.
  E2E crypt2: Fackelbereich jenseits der Sichtweite sichtbar, hinter dem
  Helden wieder schwarz, weicher Saum. NAECHSTES PAKET: Minimap-Kartographie
  (nur Gesehenes, huebscher, zoombar, Diablo-Overlay-Schalter).

## R131 - Kriegsnebel raus, Dungeon-Dunkelheit rauf, Kampf-Anzeige (Autor)
- KRIEGSNEBEL v2 ABGESCHALTET (Autor: "blinkt seltsam, nicht smooth - kann man
  weglassen/auslassen"). Default licht.kriegsnebel=false + einmalige Migration
  nebelV, damit auch alte Staende (in denen der Nebel als frueherer Standard
  true gespeichert war) den Nebel verlieren. Code + Schalter bleiben als Option.
- DUNGEON-DUNKELHEIT ist die eigentliche Loesung (Autor: "auf 100/120 ist genau
  was ich suche - ausser Sichtweite alles schwarz"). Regler jetzt 0-150 (war
  0-100). Formel dunkelAlpha = min(1, 0.80 + dStk/100*0.17): 100=0.97, ab ~118
  komplett schwarz. Leicht aenderbar in settings.ts / lichtPanel.ts.
- ROTE RINGE UM MONSTER (Windup) per Schalter, Default AUS (Autor: "was bedeuten
  die roten ringe? bitte weg"). settings.gegnerWindupRing, CombatScene gated.
- HELD LEUCHTET SELBER: der warme Halo UM den Helden (heldGlutImgs) per Schalter
  heldEigenGlut, Default AUS (Autor: "warum leuchtet der held selber? schneide
  ihn aus dem leuchten, man sieht ihn ganz normal"). Der Sichtkreis (eraseLight)
  bleibt - er ist die Laterne, nicht das Eigenglühen.
- KAMPFTEXTE ("Pariert", Treffer, Schaden) abschaltbar in den SPIELEINSTELLUNGEN
  (Reiter Allgemein, Abschnitt "Kampf-Anzeige"): settings.kampfTexte (Default an)
  + settings.gegnerWindupRing (Default aus). effects.float() gated auf kampfTexte.
- CHRONIK-REITER "KAMPF": jeder Kampftext geht zusaetzlich in die Chronik
  (fx.onKampf -> chronik('kampf', txt)). Neuer Reiter zwischen Ereignisse und
  Geschichte, Dedup fuer 'kampf' deaktiviert (gleiche Zahl darf mehrfach kommen).
- tsc sauber, 293 Tests gruen, Hauptmenue bootet fehlerfrei (Playwright-Smoke,
  keine JS-Fehler). NAECHSTES PAKET: RTS-Modus ohne Zeitlupe (#14).

## R131b - RTS-Modus ohne Slow-Motion (Autor)
- Autor: "wenn ich den RTS-Modus anschalte läuft alles langsamer, alles wie in
  Zeitlupe, auch die Pfeile - das war nicht der Sinn, Held und Monster sollen
  sich wie in den Dungeons bewegen." R103 hatte die GANZE RTS-Schlacht per
  globalem dt*kryptaTempo verlangsamt (Bullet-Time auf Held, Monster, Geschosse).
- FIX: zwei getrennte Mechaniken sauber getrennt.
  1. kampfTempo (globales dt) NICHT mehr fuer rtsBattle - nur noch fuer den
     grossen Stadt-Einfall (einfallAktiv). RTS: Monster + Geschosse in Echtzeit.
  2. areaSpeedFactor() gibt im RTS-Gefecht (this.rtsBattle) kryptaTempo zurueck -
     nur das HELDEN-Tempo ist dungeon-bedaechtig, dt bleibt Echtzeit.
  So bewegt sich der Held wie im Dungeon, aber Pfeile/Monster laufen normal.
- tsc sauber, 293 Tests gruen. Im Browser: WorldScene bootet fehlerfrei; das
  RTS-Gefecht selbst nicht headless durchgespielt (Autor bitte im Spiel gegenfuehlen).

## R131c - Echtes 3D-Zimmermannshaus in Ravensmoor N1 (Codex-GLB, Live-three.js)
- Der Atlas-/Fachwerk-Platzhalter (HausAtlas) an Box N1 im NEUEN Ravensmoor
  (stadt-Dorfplan) ist durch das ECHTE drehbare 3D-Haus ersetzt. Es haengt weiter
  an Box N1 und folgt ihr beim Ziehen (verschiebbar), ist ueber settings.haus3d
  drehbar/persistent (UI-Regel 11).
- Rendering: src/demo3d/hausRuntime.ts laedt das GLB live mit three.js/GLTFLoader
  und rendert mit Ortho-Orbit-Kamera in eine Leinwand; src/gfx/haus3dWelt.ts
  blendet sie als Welt-Sprite ein (spiegelt die HausAtlas-Schnittstelle, damit der
  Tausch minimal ist). Kein gebackenes PNG; Rotationsatlas nur Fallback.
- Material-Farben: der GLB-Export lieferte 16/20 Materialien weiss ohne Texturen -
  namensbasierte Farbtabelle in src/data/hausMaterial.ts ueberbrueckt das (dunkle
  Eiche, Lehm-Gefach, Schindeln, Feldstein), schaltet sich bei einem sauberen
  Re-Export mit echten Farben von selbst ab. Autor exportiert GLB neu (OFFENE-FRAGEN
  auf dem codex-Branch).
- HAUS-PROBE (Menue) zum Ansehen/Drehen (alle Steuerungen aus dem Manifest).
- Verifiziert im Browser: stadt-Karte, Haus steht live-3D an N1, keine JS-Fehler.
  tsc sauber, 293 Tests gruen. (Assets+Module vom Branch codex/rotatable-3d-
  carpenter-house sauber uebernommen statt Konflikt-Merge.)

## R133 - Wand-Schatten-Schleier beseitigt (Autor: "Held wie hinter einem Schleier")
- URSACHE GEFUNDEN: Der Raycaster-Pfad (Wand-Schatten AN) stanzte das Licht als
  FLACHES Sichtlinien-Polygon aus der Dunkelheit (harte Kastenkante am Licht-
  Radius) und legte zum Kaschieren je Fackel eine DUNKLE Deckscheibe ("Falloff",
  Alpha 0,28+0,26*Staerke - bei Dunkelheit 150 = 0,67!) UEBER die Szene - auch
  ueber den Helden. Mehrere Fackeln stapelten ihre Scheiben -> der gemeldete
  Schleier. Grosse Reichweite = groessere Scheiben = schlimmer; kleine Reichweite
  = weniger Schleier, aber sichtbare Vierecke (die Kastenkante). Exakt die
  Autor-Beobachtung.
- FIX: RADIALE LICHT-STANZE statt Flach-Stanze + Deckscheibe. Je Ring-Abtastung
  wird die Lichtform in einer Stanz-Textur komponiert (Sichtlinien-Polygon MAL
  weicher Radialverlauf via inversem Pinsel) und dann aus der Dunkelheit
  gestanzt. Ergebnis: weiches, RUNDES Licht wie beim geliebten lightRT-Pfad,
  Wandschatten bleiben (Polygon begrenzt die Form), und es liegt NICHTS
  Dunkles mehr ueber Held/Boden. Deckscheiben (falloff-Pool/-Textur) komplett
  entfernt.
- Sichtfeld-Nebel (heldSichtfeld) und Grunddunkelheit bleiben unveraendert -
  der Autor mag die Schatten, nur der Schleier war falsch.
- Verifiziert (Playwright, crypt1, Autor-Setup Dunkelheit 150 + Sichtfeld 19):
  Reichweite 100 -> Held gestochen klar im Fackellicht, weicher runder Abfall;
  Reichweite 18 -> runder Lichtkegel, KEINE Vierecke. tsc sauber, Tests gruen.

## Dorfwirtschaft M0 - Anker-System (Grundlage, Auftrag "Siedler lite")
- AUFTRAG-dorfleben-anker.md existiert NICHT im Repo (Autor-Referenz fehlt).
  Entscheidung statt Rueckfrage (Arbeitsmodus: autonom): der Kern des Anker-
  Auftrags ist im neuen Auftrag beschrieben (Anker-System, Tagesplaene,
  Natuerlichkeit) -> daraus als M0 rekonstruiert. Falls die Originaldatei
  auftaucht, wird nachgezogen (OFFENE-FRAGEN #31).
- NEU src/data/dorfleben.ts: Tagesplan (schlaf/arbeit/pause/mittag/abend) mit
  Vormittags- + Nachmittags-Verschnaufer (je ~30 s), Mittagsrunde 0.44-0.52,
  persoenlicher Zeitversatz je Bewohner (seeded aus der id, +-0.016 Tag) -
  KEIN Gleichtakt mehr. Pausenplatz = feste "eigene Ecke" neben der Station.
- TAG.abendAb 0.55 -> 0.62 (welt.ts): vorher lief die Mittagsrunde direkt in
  den Feierabend - jetzt gibt es den Nachmittags-Arbeitsblock. Fenster-/Licht-
  Logik haengt an lichtAb (0.76) und ist unberuehrt.
- updateVillageLife: Zielwahl laeuft ueber tagesZiel(); Kampf/Panik/Einfall
  uebersteuern unveraendert. Pause = ruhig stehen + gelegentliches Strecken
  (reichere Posen kommen in M1/M2).
- 6 neue Tests (tests/dorfleben.test.ts), 299 gesamt gruen. Browser: im
  Pausenfenster sind 6 Bewohner an der Station und 19 unterwegs (Versatz
  wirkt sichtbar - kein Stechuhr-Dorf).

## Dorfwirtschaft M1 - Bewohner-Roster + Rollen-Sprites
- ROSTER exakt nach Autor-Vorgabe (23 Bewohner + Fahrender Haendler):
  NEU: Wirtin Agnes (Heinrichs Frau, Kueche, arbeit 'kochen'), Holzfaeller
  Ruprecht (Waldrand SW), Bauer Ott + Baeuerin Hilde (FAMILIE B, VIEH:
  Angerwiese + Schafweide), Witwe Ottilie (Klatsch am Brunnen).
  GESTRICHEN (Autor: "gehoeren in die Hauptstadt"): Bader Severin, Kuefer
  Urban, Weberin Adelheid, Gerber Lorenz, Schaefer Tobias + Waescherin Ida
  (nicht im Roster; die Magd uebernimmt Wasser+Waesche). Ihre GEBAEUDE bleiben
  als Kulisse; Dialog-/Shop-Daten bleiben fuer die Hauptstadt liegen.
- Familien markiert: A = Veit + Grete + Hannes (KORN), B = Ott + Hilde +
  Hirtenjunge Lenz (VIEH). Namen vereinheitlicht: Wirtin heisst ueberall
  Agnes (vorher innen 'Mathilde'), Witwe ueberall Ottilie (vorher 'Kaethe').
- KUESTER LAEUTET: Morgen- und Abendglocke (Schwellen morgenAb/abendAb) mit
  Chronik-Zeile - nur wenn er lebt. Glocke als Synth im SoundProvider
  ('kirchenglocke', 2 tiefe Sinus-Schlaege); eine echte Datei
  snd_kirchenglocke gewinnt automatisch (Hot-Swap, Regel 13 beachtet).
- WERKZEUGE in der Hand (prozedural, fallbackArt): hammer/sack/angel/eimer/
  korb neu + zugewiesen (Schmied Hammer, Mueller Mehlsack, Fischer Angel,
  Magd Eimer, Magdalena Kraeuterkorb, Holzfaeller/Zimmermann Axt). Alles
  ueber FIGURES -> spaetere Sprite-Pakete ersetzen 1:1 (Hot-Swap).
- Fluechtlings-Liste angepasst (Ottilie statt Kaethe, Magd statt Ida).
- Roster-Test neu (tests/areagen.test.ts): prueft das 23er-Roster UND dass
  die Gestrichenen wirklich fehlen. 299 Tests gruen.

## Dorfwirtschaft M2 - Arbeitsorte, sichtbare Arbeit, Pausen
- NEU src/gfx/stationsArt.ts + AreaData.stationen: sichtbare Arbeits-Stationen
  als prozedurale Props - Amboss (Schmied), Backofen (Baecker), Holzstapel
  (Holzfaeller), 3 Bienenkoerbe (Imker, ersetzen die Krug-Platzhalter).
  Hot-Swap: hs_station_<art> gewinnt. Muehle/Feld/Steg/Kraeuterbeet/Brunnen/
  Baustelle existieren bereits als Karten-Elemente.
- MAGD-PENDELWEG: Trine traegt in der Arbeitsphase sichtbar Wasser - sie
  pendelt zwischen Muehle und der Brunnen-Kachel (T.WELL, aus der Karte
  gesucht + gecacht) mit kurzem Verweilen an beiden Enden.
- PLAUSCH: bei Mittagsrunde/Abend wenden sich beieinanderstehende Bewohner
  dem naechsten Nachbarn zu (Blickrichtung) - Gruppen wirken im Gespraech.
- Holzfaeller: gelegentlich faellt hoerbar ein Stamm (Synth 'baum_faellt' +
  Spaene-Wolke). Wirtin-Kessel (kochen) kam mit M1.
- Pausen: Verschnaufer (M0) + Mittagsrunde + Abend-Wirtshaus decken die
  M2-Anforderung ab.
- Test: Stationen-Test in areagen.test.ts (Amboss nahe Schmied-Anker).

## Dorfwirtschaft M3 - Lager & Verwaltung
- NEU src/data/dorfOekonomie.ts: voller Warenkatalog (Korn/Mehl/Wasser/Brot/
  Fisch/Fleisch/Eier/Milch/Honig/Kraeuter/Holz/Bretter/Stein/Erz/Kohle/
  Eisenbarren/Waffen/Werkzeuge/Felle/Golderz; Gold = Dorfkasse). BESTEHENDE
  Schluessel bleiben (weizen/eisen/barren) - nur die ANZEIGE sagt Korn/Erz
  (Spielstand-Kompatibilitaet). Benannte Kraeuter als KRAEUTER_ARTEN vorbereitet.
- KAPAZITAET je Warengruppe (Speisekammer/Kornboden/Baustoffe/Erzkeller/
  Kammer); lagerEinlagern() ist pure + getestet. Ueberlauf verkauft der
  Schulze automatisch an den Haendler (feste VERKAUFSPREISE, Gold ->
  Dorfkasse, Chronik-Zeile) - im Browser belegt (+26 Gold fuer 13 Bretter).
- Alle Lager-Zu-/Abgaenge laufen jetzt durch lagerRein/lagerRaus -> fuellt den
  TAGESBERICHT (gestern erzeugt/verbraucht), gespeichert in
  welt.wirtschaft.bericht (optional, alte Staende laden mit leerem Bericht).
- VERWALTUNGSBUCH beim Schulzen (Dialog-Wahl): EIN Panel - Bestaende je
  Gruppe mit Fuellstand, gestern erzeugt/verbraucht, Dorfkasse/Abgabe,
  WARNUNGEN (Warenschwellen + "Mueller/Baecker/Schmied fehlt"). Verschiebbar
  am Titel (UI-Regel 11).
- 5 neue Tests (dorfOekonomie.test.ts), 304 gesamt gruen.

## Dorfwirtschaft M4 - Produktionsketten (input-gegated, NPC-gebunden)
- JEDE Stufe laeuft nur noch, wenn ihr Bewohner ARBEITSFAEHIG ist
  (kettenNpcVerfuegbar: lebt/nicht verwundet, flieht nicht vor dem Einfall;
  ist das Dorf nicht geladen, gelten alle als wohlauf - Tagestakt-Naeherung,
  ehrlich dokumentiert) UND die Inputs im Lager liegen.
- PRODUZENTEN (wirtschaft.ts): holz=Holzfaeller, kraeuter=Magdalena,
  weizen=Bauer Veit, fisch=Fischer, honig=Imker, wasser=Magd. EISEN/KOHLE aus
  der Tagesproduktion GESTRICHEN (Quellen jetzt: Held + Haendler; Haken fuer
  Goldmine-Dungeon und Koehler-Biom stehen im Kommentar). Stein bleibt ohne
  Besitzer (Tageloehner).
- BROT braucht jetzt Mehl UND Wasser (einWasser) - das Wasser bringt die Magd
  (M2-Pendelweg liefert die Optik, die Tagesproduktion die Zahl).
- SCHMIED fertigt aus Barren abwechselnd WAFFEN/WERKZEUGE (SCHMIEDE_FERTIGUNG)
  ins Lager (= sein Verkaufsinventar; Shop-Kopplung folgt in M6).
  ZEUGHAUS_HAKEN als reiner Datenhaken angelegt (Auftrag: nur vorsehen).
- ZIMMERMANN verbraucht je Wiederaufbau-Nacht AUFBAU_HOLZ_JE_STUFE Holz aus
  dem Lager; fehlt Holz oder der Zimmermann, stockt die Baustelle (Chronik).
- Ausgefallene Stufen melden sich in der Chronik ("Die Muehle steht still...").
- Browser-Beleg: Tick liefert Fisch/Honig/Wasser; Mueller verwundet ->
  Muehle still + Mehl sinkt weiter (Baecker verbraucht) - Kette spuerbar.

## Dorfwirtschaft M5 - Bauernfelder + Vieh
- NEU src/data/dorfVieh.ts: feldTick/viehTick/viehGerissen als PURE Funktionen
  (11 Tests). Alle Raten/Deckel/Futter in FELD_REGELN/VIEH_REGELN.
- FELDER: die zwei bestehenden Acker-Flaechen (NW Bauer Veit, SO Baeuerin
  Grete) sind jetzt echte Bauern-Felder (AreaData.bauernFelder): wachsen nur,
  wenn der Bauer arbeitet; Reife nach 5 Tagen -> 8 Korn ins Lager + Chronik;
  SICHTBAR ueber ein Farb-Overlay (braun -> gruen -> gold). Weizen aus der
  Tagesproduktion GESTRICHEN (kommt jetzt von den Feldern).
- VIEH (Familie B): Eier/Milch taeglich, Vermehrung nur SATT (Korn-Futter)
  und bis zum Deckel; Kuh ueber Deckel -> Schlachtung; Schwein-Schlachttag im
  Wochenrhythmus bis zum Mindestbestand. Chronik meldet Geburten/Schlachtungen.
  Hirte/Bauer Ott versorgen - fehlen beide, ruht der Stall.
- EINFALL-KOPPLUNG: gerissenes Vieh senkt den BESTAND (Hook an der Kadaver-
  Stelle) + grosser Einfall zertrampelt die Felder (-2 Wachstumstage).
- Spielstand: welt.wirtschaft.felder/vieh (optional; alte Staende starten mit
  Standardwerten). Browser-Beleg: 6 Tage -> Ernte, Huehner 4->5, Ferkel +
  Schlachttag, Speisekammer-Ueberlauf griff beim Fleisch.

## Dorfwirtschaft M6 - Verbrauch & Kreislauf
- ESSEN (dorfOekonomie.ts): 24 Koepfe x 0,5 Portionen/Tag, Prioritaet
  brot>fisch>eier>milch>fleisch>honig (essenTick pure + Test). Knappheit
  LITE: dorfHunger-Flag -> Unmuts-Chronik ("Kein Brot mehr!"), Arbeits-Takt
  x1,5 langsamer, Warnung im Verwaltungsbuch. KEIN Hungertod.
- ABGABEN ziehen weiter aus demselben Lager (Zielkonflikt steht) - NEU: der
  Held kann beim Schulzen MATERIAL SPENDEN (10 Holz / 5 Eisen / 5 Kohle aus
  dem eigenen Beutel ins Dorflager; Spenden-Weg war Backlog).
- HAENDLER AN DIE EIGENPRODUKTION GEKOPPELT (ShopOfferDef.lagerWare):
  Schmied-Waffen/-Werkzeuge, Baecker-... (Bauer-)Brot, Milch, Honig, Eier,
  Fischer-Fisch erscheinen NUR bei Dorf-Lagerbestand; der Kauf entnimmt
  1 Stueck und der Erloes geht in die DORFKASSE. Feste Preise, schwankende
  Verfuegbarkeit (kein dynamisches Preissystem - Auftrag).
- Browser-Beleg: Tag-1-Verzehr aus Vieh-Ertraegen; leere Speisekammer ->
  Hunger + Klatsch; Waffen-Angebot erscheint nur mit Lagerbestand.

## Dorfwirtschaft M7 - Sprechen & Handeln fuer (fast) alle
- KONTEXT-DIALOGE: Lage-Zeile mit Prioritaet Einfall > Knappheit > Abgabetag >
  Regen (dorfLageZeile) - bei ALLEN Zunft-Dialogen eingeschoben und im
  Dorfvolk-Smalltalk verdrahtet. Neue Pools SMALLTALK.knapp/.abgabe (je 3
  Zeilen, 1349er-Ton). Bestehende Pools (Einfall/Boss/Regen/Nacht) blieben.
- HANDEL NEU: Baecker (SHOP_BAECKER: Brot/Honigkuchen aus dem Lager), Wirtin
  (SHOP_WIRTIN: Eintopf + Brotzeit/Milch aus dem Lager), Bauer Ott + Baeuerin
  Hilde (Familie B, SHOP_BAUER2 mit Eiern/Milch, eigene Dialog-Defs BAUER3/4).
  Bestehende Haendler (Schmied/Fischer/Imker/Magdalena/Heinrich) unveraendert.
- Kinder, Witwe, Magd, Pater: weiterhin NUR Dialog (Auftrag).

## Dorfwirtschaft UMZUG + M8 (Autor-Order: "ALLES im NEUEN Ravensmoor!")
- AUTOR-ORDER mitten in M8: die gesamte Dorfwirtschaft gehoert ins NEUE
  Ravensmoor (stadt-Karte mit den Dorfplan-Platzhaltern und den begehbaren
  3D-Gebaeuden) - das ALTE Dorf (village) wird NICHT mehr angeruehrt
  (eingefroren, M0-M7-Aenderungen dort bleiben harmlos liegen).
- R132 VOM CODEX-BRANCH GEPORTET: gebaeude3d.ts + gebaeude3dWelt.ts +
  HausProbe + neue GLBs (voll texturiert) + Settings gebaeude3d (Migration
  von haus3d.yaw) + WorldScene-Hooks (Kollision/Hoehenversatz/Editor-Regler).
  Haus3DWelt/hausRuntime/hausMaterial GELOESCHT (ersetzt). Haus haengt an N1,
  Schmiede an B1 - begehbar, Tueren blocken/oeffnen, drinnen Dach weg.
- bevoelkereStadt() (areagen): das komplette 23er-Roster + Haendler an den
  DORFPLAN-Box-Ankern (Schmied B1+Amboss, Wirtshaus B2 Heinrich+Agnes,
  Backhaus B3+Backofen, Kirche B4 Johannes, Friedhof Kuester, Fronhof B5
  Schulze, Muehle B6 Mueller+Magd (Pendel zum neuen Brunnen), Baustelle
  BrandHofstelle Zimmermann, Waldrand Holzfaeller+Holzstapel, See Fischer,
  Sued-Imkerei+3 Koerbe, Westrand Magdalena+Kraeutergarten, N4 Hebamme,
  2 SUED-AECKER Familie A, ANGERWIESE 2 Gatter mit 8 Tieren Familie B,
  Brunnen-Kachel (T.WELL) an der Brunnen-Box, Witwe/Kinder/Haendler am Anger).
- GATES umgestellt: kettenNpcVerfuegbar/Glocke -> 'stadt'; Feld-Overlay folgt
  bauernFelder der geladenen Karte. OFFEN/EHRLICH: der EINFALL zielt weiter
  aufs alte Dorf (Fluchtpunkte/Spawns dort) - Einfall im neuen Ravensmoor ist
  ein eigener spaeterer Schritt; bis dahin wirkt die Vieh-/Feld-Kopplung nur,
  wenn der Einfall dorthin umzieht.
- M8 FERTIG: questgeber-Feld + Kopf-Marker (! verfuegbar / ? abgabebereit),
  QUESTLINIEN-Tabelle (data/questlinien.ts, 11 Linien, 3 aktiv/8 Platzhalter),
  Stahl-Quest real (5 Erz -> sichtbare Schmiede-Vorfuehrung -> Waffe ins
  Lager + 40 Gold; Logbuch-Def neben_stahl), Tresen-Kopfgeld am Wirt-Dialog.
  Browser-Beleg: Marker ! -> ? -> Abgabe (Erz 6->1, Chronik); Fertigstellung
  ist ein delayedCall (headless-Drossel verhinderte das Abwarten).
- questLog-Tests an die neue Wahrheit angepasst (Stahl-Quest sofort aktiv).

## ARCHIV-Order (Autor): altes Dorf = "Shit (Archiv)", nie wieder anfassen
- Anzeige-Name der village-Area auf "Shit (Archiv)" (Karte + Ortsname); die
  id 'village' bleibt fuer alte Spielstaende, Inhalt wird nie mehr geaendert.
- Ankunfts-Routing (nAnkunft) fuehrt jetzt ins NEUE Ravensmoor ('stadt').
- Dauerregel als CLAUDE.md Punkt 14 verankert - gilt fuer jede Sitzung.

## R134 - Wiese feiner, Pfuetzen-Ringe dichter, Baumschatten nach hinten (Autor)
- GRAS (dorfSim-Boden der Oberwelt): Grundtextur mit 620 statt 360 Halmen,
  duenner (0,7px), gebogen, vier Tonstufen inkl. hellerer Lichthalme + Tau-
  Punkte; kurzes Bodengras fast verdoppelt (1500 -> 2800 Bueschel); Totholz/
  Steine/Erdstellen erscheinen jetzt auch auf der OFFENEN Wiese (Grundchance
  0,1 -> 0,28). Kachel-Gras (tileArt grasBase, fuer Nicht-Bake-Karten) ebenso
  verfeinert: mehr duenne gebogene Halme, JEDE Variante mit eigenem Detail
  (Blueten gelb/lila/weiss wie die Referenz-Wiese, Steinchen mit Lichtkante
  und Bodenschatten, Astgabel, trockene Halme). Feintuning weiter ueber den
  bestehenden 'Bewuchs'-Regler.
- PFUETZEN: Regen-Tropfenringe je Pfuetze DEUTLICH dichter (Rate 2,2+4w ->
  6+11w, variable Dauer). Held-Durchlauf wirft jetzt eine SALVE aus 4
  gestaffelten, leicht versetzten Ringen + kraeftigerem Spritzer, Takt 0,1 ->
  0,07 s - liest sich wie natuerliches Durchwaten.
- BAUMSCHATTEN (Autor-Referenzfoto): Sonne von VORN -> Schatten faellt HINTER
  den Baum (Basis PI), kippt mit dem Sonnenstand nur noch leicht (+-0,18 rad)
  zur Seite statt weit nach West/Ost. Boeen-Schwanken + Laenge bei tiefer
  Sonne bleiben. EHRLICH: Screenshot-Verifikation der Richtung gelang nicht
  (kein Baum im Testausschnitt) - Codeaenderung ist eine Zeile, bitte im
  Spiel gegenpruefen.

## R134b - Baumschatten nach HINTEN (korrigiert) + DORFWACHE (Autor)
- BAUMSCHATTEN: mein R134-Fix war falsch (nur Seitenneigung reduziert, Basis
  blieb PI = nach vorn). Ursache: bei origin(0.5,1) legt Rotation PI die
  Silhouette nach UNTEN/VORNE. KORREKTUR: Basis 0 -> Schatten nach OBEN/HINTEN
  (Sonne von vorn). Sonnenstand kippt ihn zur Seite (rot = L.dir*(0.5+(1-hoehe)
  *0.35)): mittags fast senkrecht hinter den Stamm, morgens/abends schraeg +
  lang, Seite wechselt mit dem Tag. Bleibt windbewegt. GEOMETRISCH verifiziert
  (Kronenspitze wy<0 in allen Tageszeiten, Seite wechselt) + visuell belegt.
  Ehrlich: mein erster Anlauf war ungeprueft - daher diesmal reproduziert +
  geometrisch UND visuell bestaetigt.
- DORFWACHE (Autor: "das Dorf lagert Golderz aus der Mine -> Waechter"): NEU
  NpcSpawn.patrouille (Wegpunkt-Route). 3 Waechter im NEUEN Ravensmoor:
  Torwaechter Cunz (Fronhof B5 = Lager+Golderz), Buettel Kilian (Anger-Rundgang
  Brunnen/Wirtshaus), Waechter Hagen (Westzufahrt/Schmiede). Sie laufen die
  Route HIN und ZURUECK mit kurzer Rast (Logik verifiziert: 1->2->3R->2R->1R->0),
  sind TAG UND NACHT sichtbar (patrouillieren rund um die Uhr) und sind
  kaempfer -> verteidigen beim Einfall. Figur 'wache' (Lederwams, Eisenhut,
  Spiess, Hot-Swap-faehig), ansprechbar (VOLK-Zeilen). Routen in areagen /
  Figur in fallbackArt - leicht anpassbar.

## R135c - Feind-Truppen im RTS: eigene Werte statt Dungeon-Skelette (Schritt 1/3)
- Diagnose bestaetigt: spawnFeind spawnte Dungeon-Skelette (Tiefe 2, ~32 HP), die
  zaehen Soldatenwerte in RTS_UNIT_TYP (e_nah 210, e_elite 540) wurden umgangen.
- Fix ohne zweite Tabelle (Dok 03 warnt vor Parallel-Tabellen): RtsUnitDef um
  schadensRed (Ruestung, Multiplikator >=0.5 - Regel 4, nie 0), schild (Block,
  vorhandene Enemy-Mechanik) und tags (kampfarten.ts, fuer spaetere Konter-Matrix)
  erweitert; spawnFeind wendet diese echten Werte an. Enemy.schadensRed default 1
  (Dungeon-Gegner unveraendert). Gemessen: Soeldner 4 -> 35 Hiebe bis Tod.
- Held-Werte NICHT angefasst. Ziel-Cap fuer den Schwung GESTRICHEN (Autor R135c).

## R135d - Angriffs-Slots + Held-Kollision (Schritt 2+3, zusammen)
- Schritt 2 (Slots): reine Logik src/logic/angriffsSlots.ts (weiseSlotsZu, getestet).
  Nahkaempfer bekommen je Frame Ring-Plaetze um ihr Ziel (ANGRIFFSSLOTS in kampf.ts:
  12 Plaetze, Ring ~34px, alle 0,3s neu). Enemy.slotWinkel steuert den Anmarsch auf
  den Ring statt den Mittelpunkt. Fernkaempfer/Bosse/Jaeger/Verbuendete ohne Slot.
- Schritt 3 (Kollision): CombatScene.druckeGegnerVomHelden() drueckt Gegner aus dem
  Held-Radius (kein Stapeln auf seinem Punkt). Nur Gegner, Held bleibt beweglich.
- Gemessen (15 Soeldner, ungeschuetzt stehend): gleichzeitige Angreifer 3-4 -> 12;
  Held tot in 2,7s (vorher unverwundbar). Ziel "10-12 kreisen ein" erreicht.
- Ziel-Cap fuer den Heldenschwung bleibt GESTRICHEN. HP-Werte (210/540) nicht angefasst.

## R131c - Drehbares 3D-Zimmermannshaus live ins Spiel (Codex-GLB)
- Primaerpfad wie im Manifest gefordert: three.js GLTFLoader rendert das GLB LIVE
  in eine Leinwand, Phaser blendet sie als Textur ein (Muster wie propBackofen,
  nur laufend). Kein gebackenes PNG als Endergebnis. Modul: src/demo3d/hausRuntime.ts.
- Steuerung strikt nach medieval_carpenter_house_3d_runtime.json: Hausdrehung ueber
  Wrapper-Group.rotation.y (stufenlos 0-360), Ortho-Kamera-Orbit (Hoehe 18-78°,
  Azimut 0-360°, Zoom 0.55-2.4), Root-Pivot HOUSE_ROTATION_PIVOT, Tueren ueber die
  beiden Hinge-Animationen, Dach/Cutaway datengetrieben ueber die glTF-extras
  (roof_removable / cutaway_near_wall pro Knoten), transparente Fenster erhalten
  (KHR_materials_transmission). Ansehen/Drehen in der neuen HAUS-PROBE (Menue).
- MATERIAL-FARBEN (Bruecke fuer Export-Fehler): der GLB hat 20 Materialien, aber
  KEINE Texturen und bei 16 die Grundfarbe = reines Weiss (auch OAK_HANDHEWN_DARK).
  Das Haus rendert dadurch weiss. Loesung: namensbasierte Farbtabelle in
  src/data/hausMaterial.ts (dunkle Eiche, Lehm-Gefach, Schindeln, Feldstein). Faithful
  zu den Materialnamen, in EINER Datei tunebar. Materialien mit echter Farbe (Stroh,
  Eisen, Hanf, Glas) bleiben unberuehrt. -> Frage an den Autor in OFFENE-FRAGEN.
- KOLLISION: die collision_guides der Runtime-JSON haben alle Zentren = 0 (im Export
  verloren) und liegen NICHT als Knoten im GLB. Darum dreht ein Grundriss-Footprint
  aus bounds_blender mit dem Yaw (Manifest-Regel: X/Y um (0,0) rotieren). Reicht fuer
  eine platzierte Kulisse, um die man herumlaeuft; per-Wand-Kollision braucht einen
  Re-Export mit echten Zentren (OFFENE-FRAGEN).
- Verifiziert im Browser (Playwright): Haus laedt, dreht stufenlos, Kamera/Zoom,
  Tueren auf/zu, Dach weg (Innenansicht), Cutaway, Footprint dreht mit - keine
  JS-Fehler. tsc sauber. Screenshots im Bericht.
- BRANCH: codex/rotatable-3d-carpenter-house (Autor-Vorgabe). ACHTUNG: der frueher
  auf claude/inspiring-planck angelegte Atlas-Platzhalter ("Zimmermannshaus (Atlas
  fehlt)") liegt NICHT auf diesem Branch - hier gab es nichts zu entfernen.

## R132 - Begehbare, voll texturierte 3D-Gebaeude (Haus + Schmiede, Codex 1e4b40a)
- GEMEINSAME RUNTIME src/demo3d/gebaeude3d.ts fuer BEIDE Gebaeude: GLTFLoader,
  SRGBColorSpace + ACESFilmicToneMapping + Exposure 1.0 (Handoff-Rezept),
  Materialien/Texturen UNVERAENDERT aus dem GLB. Tinting KOMPLETT entfernt
  (hausMaterial.ts + hausRuntime.ts geloescht - im Auftrag gefordert); die neuen
  GLBs tragen 20/20 bzw. 26/26 Materialien MIT Texturen. Transmission-Fenster
  (alphaMode BLEND) bleiben unberuehrt durchsichtig.
- DREHUNG um die benannten Pivots (HOUSE_/FORGE_ROTATION_PIVOT um three.js-Y);
  Kollisionszentren drehen mit demselben Yaw um (0,0) (JSON-Regel). Tueren ueber
  die exportierten Hinge-Animationen (Frame 1-30; Schmiede-Doppeltuer = 2 Fluegel).
  Dach/Cutaway/floor_level DATENGETRIEBEN aus den glTF-extras.
- BEGEHBARKEIT: Plan-Belegungsgitter (0,1 m) je Ebene. SCHMIEDE 1:1 aus den
  collision_guides/markers der JSON (echte Zentren). HAUS: die JSON traegt
  WEITERHIN nur Null-Zentren (0/17 Guides, 0/4 Marker, wie beim ersten Export) ->
  Kollisionen aus den GLB-Mesh-AABBs selbst (Original-Geometrie, keine
  Schaetzung): Helden-Koerperzone 0,48-1,85 m (Eingangsstufen/Schwellen bleiben
  begehbar), OG-Zone ueber dem OG-Boden, Innen-/OG-Flaechen aus den
  interior_floor-Meshes, Treppe aus den STAIR-Meshes, Tueren aus den
  Tuerblatt-AABBs der Hinge-Teilbaeume.
- TUEREN: Annaeherung (<1,6 m) oeffnet weich, Entfernung schliesst. Zu = eigener
  Block-Riegel in der Oeffnung, offen = frei. Die Oeffnung wird aus dem statischen
  Gitter FREIGESTANZT (durchlaufende Fachwerk-Schwellen/Riegel und Diagonalstreben-
  AABBs deckten sie sonst).
- INNEN/EBENEN: Innen-Erkennung ueber die EG-Bodenflaeche (mit 0,5-m-Hysterese an
  Schwellen). Innen: Dach + Cutaway-Waende aus, floor_level UPPER/ATTIC/ROOF weg
  (EG-Sicht) bzw. ATTIC/ROOF (OG-Sicht); draussen alles wiederhergestellt.
  Treppe: frei begehbar, Uebergang am oberen/unteren Ende (Ende mit OG-Boden =
  oben), Figur steht auf Treppe/OG sichtbar HOEHER (heldHoeheOffset-Hook in
  CombatScene, Versatz = OG-Hoehe * ppm * cos(Kamerahoehe)). OG-Kollision haelt
  auf dem OG-Boden (Absturzkante blockt).
- WELT: Haus haengt an Box N1, Schmiede an B1 (stadt-Dorfplan, folgen beim
  Ziehen); Zimmerei-Platz im alten Dorf zeigt weiter das Haus (Kacheln
  freigeraeumt, 3D-Kollision uebernimmt). Dorf-Editor: Drehung je Gebaeude
  (+-15/+-1 Grad) + EINHEITLICHE Groesse (ppm, alle Gebaeude) - persistent in
  settings.gebaeude3d (Migration von haus3d.yaw). Gegner nutzen die EG-Sicht
  (offene Tuer = Durchgang).
- VERIFIZIERT (Playwright, stadt): beide GLBs laden (10-13 s), echte Texturen
  ohne Tinting, zu-Tuer blockiert / offene frei / Wand blockiert (Haus + Schmiede),
  betreten -> ebene eg + Dach weg, Schmiede-Treppe -> og (Versatz 37 px, Kante
  blockt) -> wieder eg, verlassen -> aussen + Dach zurueck. tsc sauber, 275 Tests
  gruen. HINWEIS Playwright: evaluate() nie Phaser-Objekte zurueckgeben lassen
  (ScenePlugin-Serialisierung sprengt den Transport) - Primitives zurueckgeben.
- OFFEN: Haus-JSON-Export weiter mit Null-Zentren (Codex-Re-Export wuenschenswert,
  aendert aber nichts Sichtbares - Mesh-Ableitung ist praezise); OG im HAUS hat
  keinen eigenen Treppen-Test (gleiche Logik wie Schmiede); Feinde pathen nicht
  aktiv INS Gebaeude (nur Kollision, keine Innen-KI).

## R133 - Reitbares Blender-Pferd live in Phaser
- Das freigegebene Blender-Rig wird als transparente 8-Richtungs-Atlanten
  gerendert, nicht als prozedurale Ersatzzeichnung: 288 Gangart-Frames plus 384
  Wende-Frames. Zwei Atlanten halten beide Texturen unter 4096 px Kantenlaenge.
- Gangarten: Idle, Schritt, Trab, Galopp und langsames Rueckwaertsgehen. Kleine,
  mittlere und starke Wendung links/rechts haben je acht echte Bein-/Hals-/
  Oberkoerper-Frames; keine eingefrorene Wendepose.
- Steuerung: W beschleunigt stufenlos, S bremst und wechselt danach in den
  Rueckwaertsgang, A/D lenken. Beritten lenkt gehaltene rechte Maus zum Cursor;
  zu Fuss bleibt rechte Maus Blocken. Das maximale Drehtempo sinkt mit der
  Geschwindigkeit, ein langsames Drehen auf der Stelle bleibt moeglich.
- E steigt in Reichweite auf und wieder ab. Der vorhandene Hauptcharakter bleibt
  eine getrennte Ebene am Sattel; das Pferd verdeckt den Unterkoerper. Berittener
  Kampf bleibt fuer diesen ersten Live-Test gesperrt. Pferde folgen zwischen
  offenen Oberweltkarten, bleiben aber vor Innenraeumen/Krypten zurueck.
- Lizenzprovenienz liegt in assets/horse/ATTRIBUTION.md: Quaternius-Pferd CC0,
  Fab-Sattel von Abhi Artist CC BY 4.0, Anpassungen benannt.
- Verifiziert: Produktions-Build, 279 Tests, Browser-Auf-/Absitzen und Darstellung,
  keine Browser-Fehler. Live-Ansicht: screenshots/reitpferd-live.png.
- Nach erstem Live-Spielerfeedback verkleinert: Pferd 0,55 -> 0,43, Reiter und
  Schatten proportional angepasst, Kollision 20 -> 17 px. Rechte Maus ist nun
  der einfache 2D-Modus: Halten laesst das Pferd selbst zum Cursor laufen, nahe
  am Ziel abbremsen und bei einem Ziel hinter ihm erst eindrehen. Die manuelle
  W/S/A/D-Steuerung bleibt erhalten; Drehen reagiert bei Schritt/Stand schneller.
- Nachkorrektur verifiziert: Browser ohne Fehler, Build sauber, 280 Tests gruen.

## R134 - Pferde-Bodenkontakt, Gangwechsel und echte Sitzpose
- Der Blender-Export richtet die Kamera nicht mehr pro Frame auf die bewegte
  Mesh-Mitte aus. Die Zielhoehe bleibt fest am Boden; nur die authored Root-
  Verschiebung der Wendemanöver wird horizontal nachgefuehrt. Die orthografische
  Kamerahoehe wurde von 18 auf 10 Grad abgesenkt, passend zur flachen 2D-Welt.
- Key/Fill/Rim sind jetzt kamera-relativ. Damit bleibt die Fellfarbe in allen
  acht Richtungen und bei allen Aktionen konstant. Ein gemeinsames gedecktes
  Braun-/Ravensmoor-Grading wird beim Packen identisch auf jeden Frame angewandt.
- Schritt, Trab und Galopp behalten beim Clipwechsel ihre normalisierte
  Schrittphase. Ein 160-ms-Doppel-Sprite-Crossfade verdeckt den verbleibenden
  Posewechsel. Die Kadenz ist geschwindigkeitsabhaengig und an beiden
  Gangartgrenzen stetig, damit die Hufe nicht sichtbar ueber den Boden rutschen.
- Der stehende/croppte Held wurde ersetzt: vier echte Reitposen je Richtung mit
  angewinkelten Beinen, Steigbuegelhaltung und Haenden an den Zuegeln. Blender
  exportiert fuer alle 672 Frames den projizierten Sattelpunkt; der Reiter folgt
  dadurch auch im Trab/Galopp dem Sattel statt neben oder hinter ihm zu schweben.
- Verifiziert: beide Atlanten neu gerendert und gepackt, 672 Sattelpunkte geladen,
  Live-Sichttest im Hauptspiel, Produktions-Build sauber, 42 Testdateien und 281
  Tests gruen. Ergebnis: screenshots/reitpferd-live.png.

## R135 - Echte Rig-Uebergaenge, 16 Perspektiven und Mausfahrt
- Der Sprite-Crossfade aus R134 ist entfernt. Blender mischt fuer jeden Wechsel
  sechs echte Skelettposen: Stand/Schritt, Schritt/Trab und Trab/Galopp jeweils
  vorwaerts und rueckwaerts. Die Beinphasen wurden vermessen; insbesondere
  Trab-Frame 2 schliesst an Galopp-Frame 5 an statt an denselben Frameindex.
- Blender 5.1 braucht nach direkten Pose-Matrix-Schreibzugriffen ein explizites
  Dependency-Graph-Update. Ohne dieses Update blieb eine alte Rig-Pose fuer ein
  Bild aktiv, Pferd und Sattelpunkt sprangen seitlich. Der Export erzwingt nun
  die Auswertung; alle 192 Uebergangs-Endpunkte pro Seite besitzen identische
  Sattelpunkte zu ihrem Quell-/Zielbild.
- Alle Gangarten, Wendemanöver und Uebergaenge sind in 16 Kamerawinkeln (22,5
  Grad) gebacken. Das ist weiterhin ein Phaser-natives 2D-Atlas aus der echten
  Blender-Geometrie, kein zur Laufzeit gerendertes GLB. Kontinuierliche 360 Grad
  wuerden einen zusaetzlichen Three.js/WebGL-Renderer erfordern und nicht mehr
  exakt zur flachen 2D-Figur passen.
- Bei Fahrt bleibt die aktuelle Gangart aktiv; ein Maus-Lenkimpuls schaltet
  nicht mehr auf einen langsamen Stand-Wendeclip. A/D nutzt die kleinen,
  mittleren und starken Hals-/Rumpf-Wendemanöver nur beim Drehen auf der Stelle.
  Pfeil links/rechts dreht nicht mehr; Pfeil hoch/runter bzw. W/S regelt das
  Tempo, gehaltene rechte Maus gibt die Fahrtrichtung vor. Die Drehung reagiert
  deutlich schneller.
- Der Reiter behaelt eine unabhaengige, kontinuierliche Sitzphase. Seine grosse
  Bewegung kommt aus den 1.920 Blender-Sattelpunkten, daher wird sie bei einem
  Clipwechsel nicht mehr zurueckgesetzt oder seitlich versetzt.
- Sechs Atlanten mit 128x96-Zellen halten jede Textur unter 4096 Pixeln und die
  GPU-Belegung im Rahmen; die sichtbare Spielgroesse bleibt durch Skalierung
  gleich. Verifiziert: Build sauber, 42 Testdateien/282 Tests, alle 13 Asset-URLs
  HTTP 200 und keine Pferde-Asset-/Framefehler in der Browser-Konsole (nur die
  bereits vorhandene Three.js-PCFSoftShadowMap-Deprecation). Animationsvorschau:
  screenshots/reitpferd-uebergaenge.gif.

## R136 - Pferde-Sprite darf nie auf Phasers __MISSING-Textur fallen
- Der grellgruene N-Rahmen ist Phasers interne Fehltextur. Er erschien nach
  einem Vite-Hot-Reload, wenn die neue Szenenlogik schon einen Trab-/Galopp- oder
  Uebergangsatlas anforderte, den die laufende alte Boot-Sitzung noch nicht
  geladen hatte.
- Vor jedem Atlaswechsel werden Texture-Key und Frame explizit geprueft. Fehlt
  das Ziel, bleibt der letzte gueltige Pferde-Frame sichtbar. War der Sprite
  bereits __MISSING, wird er auf die passende Standrichtung zurueckgesetzt; ist
  selbst diese nicht geladen, wird er verborgen statt als gruene Kachel gezeigt.
- Verifiziert nach vollem Reload auf der Startkarte: Pferd sichtbar, Aufsitzen
  sichtbar, keine neuen __MISSING-/Framewarnungen. Build sauber, 282 Tests gruen.
  Screenshot: screenshots/reitpferd-fehltextur-behoben.png.

## R136 - Kerker-Generator Schritt 1 (V12): Teilung + Raeume + Tueren
- Neues Modul src/world/kerkerDungeon.ts (reine Logik, 7 Tests): rekursive
  Flaechenteilung, 1-Kachel-Trennwaende, Tueren via randomisiertem Kruskal-
  Spanning-Tree + extraTuerAnteil Schleifen, Flood-Fill-Pruefung mit Reparatur.
- Output = EditCode-Gitter (dungeonVorlage.ts) -> Editor/AUS GENERATOR/Begehen/
  Spielen schlucken es ohne Konvertierung (editorCodes:true), von Hand editierbar.
- Als V12 in erzeugeKarte() + V-Knopf in DungeonProbe. Hoehlen-/Blob-Generator
  (V4, hoehlenDungeon.ts) UNANGETASTET - zwei Werkzeuge, zwei Aufgaben.
- Tuning in src/data/kerker.ts; stopChance 0.4 -> 0.5 nach Editor-Sichtpruefung
  (mehr Saele, 187 -> ~165 Raeume). Spec-Rahmen 0.3-0.5 eingehalten.
- HALT nach Schritt 1 (Autor-Abnahme im Editor) - Vaults/Setpieces/Rollen folgen.

## R136b - Kerker (V12) LIVE als Planungskarte + Insel-Boeden gestrichen
- Autor: V12 gefaellt, aber (a) verschiedene Boeden je Raum wirken fremd ->
  fuer V12 GESTRICHEN (ein durchgehender Boden; V4/Hoehle bleibt wie sie ist),
  (b) die Dungeon-Probe ist nur Testumgebung -> V12 jetzt als ECHTE WorldScene-
  Area 'kerker12' (Regel 7: HUD/Licht/Kampf/Tueren automatisch, T.DTUER echt).
- KEIN Eingang auf einer Spielkarte: geplante Karten liegen in der Dev-Konsole
  (F10) im neuen Tab MAPS (betreten / NEU wuerfeln / zurueck), bis der Autor sie
  zu einem neuen Dungeon verknuepft (Sondermission, Ort noch offen).
- Planungskarte = bewusst nur Geometrie + sparsame Fackeln, KEINE Gegner/Beute/
  Treppen. missionTiefe=3 + missionThema=1 (Gruft) sind PLATZHALTER in
  src/data/kerker.ts - je eine Zeile.

## R137 - Reitpferd-Abnahme per lokalem Dev-Tuning
- Groesse und Sitz werden vor dem naechsten Blender-Render im vorhandenen
  F10-Fenster live abgestimmt. Die Testwerte liegen in `localStorage`, nicht im
  Spielstand; erst der vom Autor kopierte Endwert wird spaeter fest uebernommen.
- Breite/Hoehe sind reine Vergleichsregler fuer die Gesamtsilhouette. Eine
  isolierte Beinkraeftigung bleibt Assetarbeit am Blender-Modell bzw. Render.

## R138 - Unsichtbare Fluss-Waende, Maps-Tab, Standards, Respawn, Sonnen-Regler
- URSACHE unsichtbare Waende: "Wasser-Effekte AUS" (Schalter/Leistungs-Preset
  Niedrig) blendete den Wasser-Shader aus - bei gebackenem Boden zeichnete dann
  NICHTS mehr das Wasser, die T.WATER-Kollision blieb (1400 SOLID-Kacheln allein
  auf 'start'). Fix: flaches Ersatz-Wasser aus DERSELBEN SDF wie Shader und
  Kollision (baueWasserFallback), sichtbar immer wenn der Shader aus ist. Das
  Einstellungs-Versprechen "aus = flaches Wasser" stimmt jetzt.
- Wandhoehe: Standard UEBERALL x1,25 (vorher 2), einmalige Migration lichtV=2
  hebt auch gespeicherte Staende an - danach frei regelbar. V12 nutzt denselben
  globalen Regler wie alle dark-Areas.
- Wand-Schatten (licht.dungeonNeu): Standard AN in jedem Dungeon (Autor-Order,
  kehrt die R128-Entscheidung "weiches lightRT als Standard" bewusst um).
  Gleiche lichtV=2-Migration. ACHTUNG: Grafik-Presets Niedrig/Mittel schalten
  ihn weiterhin AUS (Leistung) - nur wer sie waehlt.
- Respawn nach Tod: NIE mehr ins alte Dorf (Archiv!). Dungeons/Innenraeume/
  Boss/Kirchenschiff -> neues Ravensmoor (stadt, DEATH.respawnKarte);
  Oberwelt-Karten -> Eingang DERSELBEN Karte. Regel: src/logic/respawn.ts
  (+ Tests). Das echte Wiederbelebungs-System des Autors kommt spaeter.
- Maps-Tab = Sammelstelle ALLER Planungskarten (kerker12, v9, katakomben) -
  sofort live betretbar, kein Eingang im Spiel. V9/Katakomben haben jetzt
  EIGENE Area-Ids statt (wie die alten Kasten-Knoepfe) crypt1 zu kapern -
  die echte Krypta-Kette bleibt unberuehrt. Treppen in Planungskarten sagen
  ehrlich "ohne Ziel". V9 (Kammern+echte Tueren, R118) und Katakomben
  (Raum+Gang+Vault, R102) sind ZWEI verschiedene Generatoren.
- Sonnen-Regler: die neue Stadt hatte NULL statische Sonnen-Verdecker (nur
  alte 2D-hausBilder zaehlten) - jetzt werfen auch die begehbaren 3D-Gebaeude
  Sonnenschatten (sonnenOccluder, laedt mit dem GLB nach). Der Projektions-
  Modus hoert jetzt auf Sonnen-Ferne (Schattenlaenge) und Sonnen-Weichheit
  (Blur) - vorher wirkte nur die Staerke. Standard bleibt Projektion.

## R138b - Boden/Wand-Werkbank + Live-Karten im Maps-Tab
- Dev-Konsole (F10) hat einen neuen Tab STIL: 20 Boeden (BODEN_STILE aus R124,
  bisher nur in der Dungeon-Probe) + 10 NEUE Waende (src/gfx/wandStile.ts:
  Bruchstein, Sandstein-Quader, Feldstein, Backstein, Kalkputz, Fachwerk,
  Holzbohlen, Schiefer, Granitquader, Beinhaus/Ossuar). Alles prozedural,
  settingkonform 1349, real existierende Bauweisen. Klick laedt die Karte an
  Ort und Stelle neu; NICHTS wird gespeichert (reines Testen). Wirkt auf
  dunklen Karten; in der Hoehle wechselt nur der Boden (Fels-Stollenwand
  bleibt natuerlich).
- Maps-Tab zeigt jetzt auch LIVE-Karten (Goldmine-Schnellzugang). Stehende
  Autor-Regel (auch in AGENTS.md): JEDE neue Karte bekommt sofort einen
  Maps-Tab-Eintrag.
- Dev-Hook window.__settings (main.ts): dieselbe Settings-Instanz wie das
  Spiel fuer die Browser-Verifikation (Seiten-Import erwischte nach HMR eine
  zweite Instanz).

## R139 - RTS Rang 1: Dorf-Lager-Kosten, MORAL, Ziel-Sperrzeit (Dok 03)
- 1.1 BAUKOSTEN: RTS-Bauten zahlt das DORF-LAGER (M3-Bestand, Record<string,
  number> - fehlende Waren zaehlen 0, voll flexibel bis das physische
  Lagergebaeude steht). Kosten-QUELLE ('held'|'dorf') haengt am Platzierungs-
  Modus, an Baustellen und am fertigen Feldbau: Reparatur + Abbau-Erstattung
  buchen in DIESELBE Kasse. Persoenliches Baumenue (Taste N) zahlt weiter der
  Held ("Held farmt" ist Absicht, Dok 03). BAUEN-Tab zeigt den Lagerbestand.
- 1.2 MORAL: die EINE Formel lebt in src/logic/moral.ts (Systemkarte: nur EINE,
  damit Proviant/Sold spaeter einspeisen koennen), alle Stellschrauben in
  data/rts.ts (MORAL). Senker: Verluste im 12s-Fenster, Uebermacht, Kessel,
  Panik durch fliehende Kameraden, Nacht (Sunzi N5.5). Heber: Kameraden,
  Standarte, Anfuehrer (Held bzw. Elite-Anfuehrer der Feinde), geweihter
  Feldaltar, Veteranenraenge (Feld vorhanden, Raenge kommen mit 2.2).
  BEIDE Seiten werden alle 0,5s bewertet (O(n^2) bei 2 Hz, unkritisch).
- FLUCHT: unter fluchtUnter bricht die Einheit SICHTBAR ("BRICHT!"-Schwebetext),
  laeuft vom Feind-Schwerpunkt weg zur Kartenkante (jagdZiel = laufen ohne
  kaempfen, +15% Tempo). FEINDE entkommen an der Kante (verlassen das Feld,
  vorher abfangbar); EIGENE kauern dort und sammeln sich ab Moral>=45
  (Hysterese). Fliehende bleiben gueltige Ziele.
- Sunzi N5.3 "das Loch im Kessel": EINGEKESSELTE (Feinde in >=3 Quadranten)
  fliehen NICHT - sie kaempfen verzweifelt (+15% Schaden, roter Schwebetext).
  Fluchtwege offenlassen ist jetzt eine echte taktische Entscheidung.
- Banner-Moral in der RTS-Leiste zeigt den ECHTEN Truppen-Durchschnitt.
- 1.4 ZIEL-SPERRZEIT (Dungeon Siege): zielFuer haelt das gewaehlte Ziel ~0,9s
  (+-40% Streuung) statt jeden Frame den Naechsten zu nehmen - kein Zappeln
  zwischen zwei gleich nahen Zielen. Wechsel bei tot/unerreichbar (>560px)/
  Spielerbefehl (Fokus schlaegt Sperre immer).
- OFFEN als Asset: Flucht-/Sammel-RUFE (Sound) - der Autor ist Sound-Fanatiker,
  Platzhalter bewusst NICHT eingebaut (nur Schwebetexte).

## R139b - RTS Rang 1 fertig: Achsen, Set-Target, Tag-Konter, Abstand (Dok 03)
- 1.7 DREI VERHALTENS-ACHSEN (Dungeon Siege "Field Commands"): Stance bleibt
  die BEWEGUNGS-Achse (Verfolgen/Nahe bleiben/Halten), NEU sind Angriff
  (Angreifen/Nur zurueckschlagen/Feuer einstellen) und Zielwahl (Naechster/
  Schwaechster/Gefaehrlichster). Enemy.kaempftNicht gatet startPattern +
  Fernschuss zentral. 'Zurueckschlagen' kaempft nur, wenn in den letzten 5s
  getroffen oder der Feind ansteht (<60px). Heiler-Einheiten starten als
  "nahe bleiben + Feuer einstellen" (zieht keine Aggro) - die Feldscher-
  Einheit selbst fehlt noch (TODO R99d), die Rolle ist vorbereitet.
- 1.3 BEWEGUNG UND ZIEL TRENNEN (BAR "Set Target"): Feind-Rechtsklick bei
  LAUFENDEM Gruppen-Marsch setzt nur noch die ZIEL-PRIORITAET (Marsch laeuft
  weiter, angegriffen wird, sobald das Ziel in Reichweite ist); im Stand
  bleibt es der bekannte Angriffsbefehl. Nicht headless verifiziert -
  Autor bitte im Spiel gegenfuehlen (wie R131).
- 1.6 TAG-KONTER: die VORHANDENE KONTER-Matrix aus kampfarten.ts (Dok 02,
  war nie verdrahtet!) wirkt jetzt Einheit-gegen-Einheit: Nahkampf ueber
  schadensArt des Angreifers x kampfTags des Ziels, Fernkampf als Pfeil-
  Konter an beiden Projektil-Einschlaegen. ALLE RTS-Einheiten haben jetzt
  schadensArt + tags (Spielerseite neu: Schildtraeger wucht/gepanzert+schild,
  Gewappneter schnitt, Bogenschuetze pfeil/leicht, Ritter stich/schwer -
  KEINE Reiter, N0: der 'Ritter' kaempft zu Fuss). Rueckmeldung nach
  kampfarten Kap. 4 ("SCHWACH!"/"PRALLT AB"), je Ziel auf 1,2s gedrosselt.
  Dungeon-Monster ohne Tags bleiben unveraendert (Faktor 1).
- 1.9 FORMATIONS-ABSTAND (Dungeon Siege 30.4): abstandF 0,6-2,0 skaliert
  alle Slot-Rechnungen; UI-Knoepfe Eng/Normal/Weit im BEFEHLE-Tab
  (eng = Nahkampf, weit = gegen Flaechenschaden).
- 1.8 ENGSTELLEN-KOMPRESSION: BEWUSST ZURUECKGESTELLT - Dok 03 sagt selbst
  "das passiert VERMUTLICH schon". Regel 9.1: erst auf einer Tor-Karte
  REPRODUZIEREN, dann fixen. Eintrag in TODO.md.
- Held-Waffen gegen Einheiten-Tags (Konter fuer den HELDEN-Schwung) bewusst
  NICHT mit verdrahtet - eigener Schritt, beruehrt die Dungeon-Balance.

## R141 - RTS Rang 2.1/2.2/2.4: Persistente Armee, Veteranen, Verstaerkung
- ROSTER (2.1): src/logic/armee.ts - reine, getestete Logik AUSSERHALB von
  RtsBattle (Dok 03: Kommando-Schicht nicht aufweichen). Einheiten sind
  BENANNTE Personen (Namenspool aus dem R53-Heer wiederverwendet - keine
  dritte Parallelwelt), Modell { id, name, typ, hp, kills, verletzungen[] }.
  verletzungen[] liegt bereit fuers spaetere Wundsystem.
- JEDE Spieler-Einheit, die uebers Spawn-System entsteht, IST eine Roster-
  Einheit (Test-Spawns mustern automatisch ein; Rekrutierungs-KOSTEN kommen
  mit 2.3). Kartenwechsel + Speichern schreiben hp/kills zurueck
  (syncArmeeVomFeld in unloadAreaObjects + Save). SaveData: welt.armee
  (optional, alte Staende laden mit leerem Heer).
- PERMADEATH: Tote sind endgueltig raus, Namen wandern ins Gefallenen-Buch
  (armee.gefallene) - Meldung "NAME ist gefallen - das Heer verliert ihn
  fuer immer." Verluste muessen weh tun.
- VETERANEN (2.2): Kills je Einheit (Nahkampf exakt ueber den Host-Closure-
  Kill-Hook; Fernkampf-Kills: TODO, Projektil kennt den Schuetzen noch
  nicht). rangFuerKills/rangDmgF/rangHpF = EINE Rechnung fuer Spawn, Kampf
  (steuereEinheit skaliert den Schaden) und Anzeige. Aufstieg feiert sichtbar
  ("RANG N!"-Schwebetext, goldene Winkel im Overlay, ▲ im Namen), Moral-
  Formel bekommt den Rang als Heber.
- VERSTAERKUNG (2.4): das Wartfeuer ruft aus dem ROSTER (nicht Aufgestellte),
  in SCHUEBEN (Haelfte sofort, Rest nach 6s - "durchhalten, bis sie
  kommen"). Leeres Roster = "niemand antwortet" - kein Gratis-Nachschub mehr.
- AUFSTELLEN: Knopf im BEFEHLE-Tab ("Heer aufstellen (N bereit)") sammelt
  die Nicht-Aufgestellten beim Helden. BEWUSST kein Auto-Spawn beim
  Kartenwechsel (das Heer marschiert nicht ueberall mit) - siehe
  OFFENE-FRAGEN.
- HEER-Tab zeigt das echte Roster (Name, Rang-Winkel, LP, Kills) + die
  letzten Gefallenen.

## R142 - Das Heer LEBT in der Welt (Autor-Korrektur, Jagged-Alliance-Prinzip)
- Der R141-Aufstell-Knopf ist WEG (Autor: "das Heer wird nicht aufgestellt").
  Einheiten haben ort (Karten-Id) + pos (gemerkte Stellung); beim Betreten
  einer Karte steht die GARNISON an ihren Stellungen und verteidigt
  selbststaendig (passiv bis Sichtkontakt - der Team-Alarm weckt sie, die
  Enemy-KI kaempft ohne Helden weiter; zieht der Held ab, wird der Stand
  zurueckgeschrieben).
- MAERSCHE: kartenweise ueber den FUERSTENTUM-Raster-Graphen (BFS-Route,
  MARSCH.dauerJeKarteS je Etappe, Regler in data/rts.ts). Ist der Held auf
  der Karte, zieht die Kolonne SICHTBAR von Kante zu Kante (kantenPunkt aus
  den Raster-Richtungen); sonst laeuft der Marsch abstrakt weiter. Die
  Marsch-Uhr tickt IMMER (auch ohne RTS-Modus).
- GRAF-VERSTAERKUNG: betritt die Welt am Waldrand (MARSCH.grafStart) und
  zieht selbststaendig nach Ravensmoor (MARSCH.zielStadt). Ausloeser vorerst
  der TEST-Tab-Knopf - ob automatisch oder per Bote entscheidet der Autor
  (OFFENE-FRAGEN).
- WARTFEUER: teleportiert NICHTS mehr. Reserve auf derselben Karte sammelt
  sich am Feuer; sonst rueckt die NAECHSTE Garnison (BFS-Distanz) real aus -
  mit ehrlicher Ankunftszeit in der Meldung.
- KARTEN-TAB: ⚔N = Garnison je Karte (Klick = Quelle waehlen), ⚑N = Trupp
  im Marsch; Menge Alle/Haelfte/5, dann Ziel-Karte anklicken. Das ist die
  Jagged-Alliance-Verlege-Geste des Autors ("10 Mann auf die Ostkarte").
- Offscreen-Kaempfe (Monster greifen eine Garnison OHNE Helden an) werden
  NICHT simuliert - es gibt derzeit keine Offscreen-Angriffe. Kommt mit
  Aufklaerung/Feldzug (Dok 03 Rang 3).
- R143: Rekrutierung (Dok 03 2.3): 40 Gold + 1 waffen-Einheit + 1 Arbeiter je Bauern-Rekrut; Soeldner 150 Gold ohne Arbeiter/Waffe, Moral-Malus 12, desertiert bei Flucht an der Kartenkante endgueltig (NICHT ins Gefallenen-Buch - er ist nicht tot). Bevoelkerung startet bei 30 (23 benannte Bewohner + Tageloehner); Heer-Deckel = Bevoelkerung/2; Tagesproduktion (inkl. Holzfaeller-Grossschlag) skaliert mit Bevoelkerung/30. Gold zahlt die Dorfkasse zuerst, den Rest der Held. Alles in REKRUTIERUNG (data/rts.ts) einstellbar.
- R144 (Autor-Bugmeldung "Soldaten wehren sich nicht"): Weck-System (updateWachwerden) und Moral laufen jetzt in JEDEM Modus, nicht nur im RTS-Modus. Moral aber nur, wenn Truppen auf dem Feld stehen - reiner Held-Kampf im Dungeon bleibt moral-frei (Spielgefuehl unveraendert). Beim RTS-Einstieg uebernimmt die Befehls-Schicht stehende Garnisonen (rtsTyp am Enemy); Nachzuegler (Marschierer/Rekruten mitten im Gefecht) melden sich selbst an.
- R145 (Autor): Tod kostet NUR noch 10% Gold (vorher 15, Masterprompt sagte 15 - Autor-Order schlaegt Spez). Lebende Monster schreiben beim Kartenwechsel Stellung+Wunden in ihren Spawn zurueck (EnemySpawn.hp) - nach Tod/Rueckkehr stehen sie verwundet dort, wo sie standen. Tote bleiben tot (R47), geleert bleibt geleert (R40). geleert ignoriert jetzt eigene Soldaten (Garnison verhinderte sonst das Totenstill-Flag).
- R146 (Autor-Repro "unsichtbare Waende am Waldrand"): Ursache war NICHT fehlende Kollision, sondern Lesbarkeit: (1) Weg-Kacheln, die die Wasser-SDF queren, sind seit R100h begehbar - aber das Wasser-Overlay malte drueber, die Querung war unsichtbar (start: 45, wald_o: 23, stadt: 7 ertraenkte Kacheln). Fix: Furt-Bilder (Trittsteine/Kies, bodenMaler.macheFurtBild) auf der Bruecken-Ebene UEBER dem Wasser, nur auf den echten Weg-Kacheln. Keine Auto-Bruecke (R100h bleibt). (2) Bei Regen stieg die Wasser-Truebung um rainAmt*0.5 - das Wasser kippte in stumpfes Grau und wirkte wie fester Kies. Zuschlag jetzt 0.2 (WASSER_CFG.regenTurb), Ufer-Wasserlinie mit hoeherem Grundanteil (0.30 statt 0.16) - in jedem Wetter lesbar.
- Fleischgolem-Gang: 1,0-s-Zyklus bei 30 px/s mit 62% Standphase je Fuss; gespiegelte Beinknochen werden lokal gleichsinnig angesteuert, damit sie sich im Raum gegensinnig bewegen. Alle Atlasframes liegen auf Bodenlinie 132 und erhalten einen festen Kontaktschatten.
- Menschengolem statt Steingolem: Spielertexte und sichtbarer Name verwenden nur
  `Menschengolem`. Bestehende interne Kennungen und der Atlas-Dateiname werden
  vorerst nicht migriert, weil sie Savegame- und Phaser-Cache-Vertraege sind.
- Die Autorabnahme der Monsterproportion erfolgt ueber F10 > GEGNER. Diese Werte
  werden lokal gespeichert und skalieren nur das gerenderte Bild. Trefferkreis,
  Wegfindung, Schaden und Reichweite werden erst gemeinsam angepasst, wenn der
  Autor die endgueltige visuelle Groesse bestaetigt.
- Der HP-Regler unter F10 > GEGNER ist ausdruecklich ein RTS-Testwert. Eine
  Aenderung setzt bestehende lebende Menschengolems auf den neuen Wert und heilt
  sie voll, damit wiederholte Schadensmessungen denselben Ausgangspunkt haben.
- R147 (Autor): (a) Held-XP nur noch fuer EIGENE Kills - Soldaten-Kills geben keine Held-XP mehr (killDurchTruppe-Kennung durch damageEnemy; Fernkampf-Projektile kennen jetzt ihren Schuetzen -> dessen Rang zaehlt, R141-TODO geschlossen). (b) Monster haben KEINE Moral/Flucht mehr (Autor-Entscheid) - Moral gehoert den eigenen Truppen. (c) SCHLACHT-WERTUNG: gewonnene Schlachten (>=3 Feinde, 6s Ruhe im 600px-Umkreis) geben Held-XP nach Formel (Basis je Feind x Verlust-Malus x Moral-Bonus x Schonungs-Bonus; logic/schlachtWertung.ts, Regler SCHLACHT_WERTUNG). (d) Auswahlringe: duenn (1px), BLAU eigene / ROT Feind-Hover, auf Boden-Ebene (Tiefe 0) am Fusspunkt statt ueber den Figuren; Held-Ring fester Fusspunkt py+14 (displayHeight enthaelt transparenten Rand).
- Der Menschengolem ist ein standfester Phasengegner, kein vergroesserter
  Standardgegner. Er ignoriert Rueckstoss, Standard-Stun und weissen Hit-Flash.
  Seine Schwellen liegen zentral in `data/golem.ts` bei 70/50/30/15/5 Prozent.
  Die fruehere abgeschnittene Arm-Grafik ist nach der Live-Abnahme verworfen:
  15% bedeutet nun massiven Blutverlust und halbierten Schaden, unter 5% eine
  kontinuierliche Blutung mit Bodenlachen. Nur der 100%-Dev-Test setzt den
  Phasenzustand bewusst komplett zurueck.
- Standfestigkeit ist auch eine Kollisionsregel: Trefferimpulse, Held-Kollision
  und Einheiten-Trennung duerfen die Position des Menschengolems nicht aendern.
  Bei Ueberlappung nimmt immer die leichtere Figur die gesamte Korrektur auf.
- Sein Testtempo betraegt 34 px/s. Der Tod wird mit 7 fps langsam ausgespielt,
  durch Aufschlag und Blutlachen gestaffelt und bleibt neun Sekunden als Leiche
  liegen; schnelle Zerlegung oder abspringende Gliedmassen sind ausgeschlossen.
- Die Dev-Werkbank heisst `GEGNER`, weil sie nicht dauerhaft nur fuer den
  Menschengolem reserviert sein soll. Neue besondere Gegner erhalten darin
  jeweils einen klar benannten eigenen Abschnitt.
- Der Menschengolem-Standard ist 1,00 Gesamtgroesse, 0,70 Breite, 0,70 Hoehe
  und 1000 HP. Sein Bodenanker ist mit 0,910 aus dem Koerperkontakt in Atlaszeile
  131/144 abgeleitet; der darunterliegende Kontaktschatten bestimmt nicht den
  Kollisionsfuss.
- Ein Menschengolem erweitert eine eingerissene 32-px-Palisadenkachel auf zwei
  benachbarte freie Kacheln, weil sein Kollisionsdurchmesser 58 px betraegt. Ein
  zweikacheliges Tor zaehlt bereits als vollwertige Bresche.
- Golem-Spezialangriffe bleiben aus Fairness telegraphiert, aber nur mit einer
  duennen, transparenten Kreislinie. Zusaetzliche gezeichnete Rippen sind keine
  Anatomie und werden nicht mehr ueber den Atlas gelegt.
- Bei Belagerungen haben Palisade, Tor und Wachturm Zielprioritaet. Erst wenn
  keine Wehrstruktur mehr steht und kein Verteidiger erreichbar ist, duerfen
  Menschengolem und andere Belagerer uebrige Feld-/Lagerbauten angreifen.
- R149 (Autor "was sind das fuer Steine?! nur die unsichtbare Wand weg"): R146-Trittstein-Furten komplett zurueckgebaut. Stattdessen UFER_SAUM_UV (wasserFeld.ts, 0.008 ~ 1 Kachel): die Wasser-Kollision beginnt erst ETWAS tiefer als die Wasserlinie - der flache, fast durchsichtige Saum (wo Schilf steht) ist BEGEHBAR, duenne Baeche werden durchwatbar. In BEIDEN Carve-Pfaden (areagen cfg-Generator + Oberwelt-Generator OW_SMIN). Auf start: 1400 -> 1001 solide Wasserkacheln; Ost-Strassen-Querung durchgaengig (2 Kacheln breit, Pferd nutzt dieselbe Kollision).
- R154: Nord-Reihe verdrahtet - hochland (2,1 'Hoher Norden'), wald_nw (3,1 'Grauwald'), wald_ne (4,1 'Huenenwald'), schlacht (5,1 'Altes Schlachtfeld'), kloster (5,0 'Klosterberg') als Oberwelt-Huellen (Kanten aus der ravenkarte-Tabelle OBERWELT_KANTEN; Namen sind Vorschlaege, leicht aenderbar). Rand-Uebergaenge laufen jetzt ueber das FUERSTENTUM-RASTER statt der alten 3-Karten-Tabelle - JEDE Oberweltkarte fuehrt an offenen Kanten zum Nachbarn ('wald'/'village' als Legacy ausgenommen). UFERPFAD: Baeume direkt am Wasser weichen (begehbarer R149-Saum, oeffnet Fluss-Kanten als Wildwechsel). Maps-Tab listet ALLE Fuerstentum-Karten automatisch (R138b-Regel damit dauerhaft erfuellt).
- R155 (Autor "von Ravensmoor nach Westen landet man im Fluss"): Ursache waren die KARTENGROESSEN - stadt ist 128x128, die Waelder 130x85; der Rand-Uebergang uebernahm die absolute Pixelposition, 53% Stadt-Kante = 80% Nachbar-Kante = Fluss. Uebergaenge uebertragen die Position ENTLANG der Kante jetzt PROPORTIONAL (verifiziert: Landung am Weg, Zeile 45 statt 69).
- R156 (Autor "Begrenzungen frueherer Fluesse"): Voll-Audit ueber alle 10 Oberweltkarten - bei Standard-Reglern deckt sich JEDE Solid-Wasserkachel mit sichtbarem Wasser (0 Geister). Neu abgehaertet: recarveWasser() carvt die Kollision aus der SICHTBAREN (skalierten) Geometrie neu, sobald die Werkbank Flussbreite/Bahn/See-Regler verstellt - Live-Tuning kann Kollision und Optik nicht mehr auseinanderziehen. Nur WASSER<->GRAS wird getauscht.
- R157 (Autor-Freigabe "genau mach das"): EINFALL-UMZUG nach Neu-Ravensmoor. Trigger/Abwehr/Zwischenspeicher laufen auf 'stadt'; die Angreifer spawnen mit erzwinge=true (die Stadt ist friedlich markiert - der Einfall bricht den Frieden ausdruecklich). ORGANISCH: Kolonnen ruecken in gestaffelten Schueben (0/8/16s) ueber die WEGE der Nord- und Ost-Kante an (ravenkarte-Kreuzungen) und ziehen Richtung Stadtmitte; Raeuber des grossen Einfalls setzen weiter nahe der Beute ein. Sieg erst, wenn kein Angreifer lebt UND keine Kolonne mehr aussteht. Tod-Erwachen auf stadt laesst die Angreifer WARTEN (einfallRest, R145-Regel); Verlassen der Stadt laesst den Einfall wie bisher verpuffen. Alt-Dorf-Mauerlogik (Tore/Breschen) ruht, bis die neue Stadtbefestigung steht.
- R157b: Krypta-Eingang der Stadt ist REAL - Wendeltreppe auf der Dorfplan-Box 'KryptaEingang' (102,51), fuehrt mit Prolog/Spiel-Logik nach Ebene 1. Die Flaeche 100-106/49-55 ist von der 3D-Gebaeude-Kollision AUSGENOMMEN: egal wie die Kirche verschoben/skaliert wird, der Eingang bleibt frei.
- R158 (Autor "ich laufe schon wieder gegen unsichtbare Waende am Fluss"): GEMESSEN - die Kollision ist deckungsgleich mit sichtbarem Wasser (alle 1001 Solid-Wasserkacheln der Startkarte haben Shader-Alpha >0.75, 0 unsichtbare). Das eigentliche Problem: das truebe Moorwasser LIEST sich als kiesiger Schlammboden in Gras-Farbe (bed=1.0 zeigte das Flussbett voll, gloss niedrig, grau-gruener Ton wie Gras) - der Held erkennt den Fluss nicht und laeuft hinein. Drei Massnahmen: (1) WASSER-Preset liest sich als Wasser (bed 1.0->0.5, gloss 0.35->0.55, turbidity 0.6->0.45, deep saturierter, spec staerker) - hebt sich vom Gras ab, bleibt Moorwasser. (2) Ufer-Wasserlinie IMMER hell/deutlich (Shader-Grundanteil 0.30->0.50, wetterunabhaengig). (3) BULLETPROOF: blockiertFeedback - laeuft der Held gegen Wasser, Spritzer + Ton + einmaliger Hinweis "Der Fluss ist zu tief - suche eine Furt oder Bruecke". Damit ist die Wand nie mehr ein Raetsel, egal wie das Wasser aussieht.
- R159 (Autor): Zaeune in Neu-Ravensmoor entfernt (die zwei Vieh-Gatter der Angerwiese) - die Tiere bleiben ueber ihre pen-Rechtecke auf der Weide, die Flaeche ist frei begehbar. Archiv-Dorf und Wachposten-Karte unangetastet (Regel 14).
- R160 (Autor "das Rote/Blaue fehlt"): die Kugel-"Fuellung" war nur ein Alpha-Fade der GANZEN Kugel - bei wenig Leben eine dunkle Kugel ohne sichtbares Rot. Jetzt echter Diablo-Fuellstand: Crop von unten auf Hoehe des HP-/Mana-Anteils (verifiziert: 25% HP = exakt 25% Fuellhoehe).
- R163 (Autor "brueckige Waende lassen sich oft nicht mehr durchschlagen"): Treffer-Radius der Mauerrisse 16->30px und Nahschlag-Regel (naeher als 46px trifft zerstoerbare Objekte unabhaengig vom Schlagwinkel) - seit den hoeheren Waenden (R138) lag die sichtbare Riss-Fassade oft knapp ausserhalb des alten Trefferfensters. Verifiziert: Riss bricht auch bei schraegem Schlag direkt davor.
- R161 (Autor "im Charakter-Menue ist alles versetzt"): die Bildschale malt eigene Kaesten - ich habe sie VERMESSEN (Pixel-Laeufe im PNG) und alles auf die gemessenen Design-Koordinaten gesetzt: obere 8 Tabs exakt in die gemalten Kaesten (vorher Gleichverteilung, Drift bis 39px), Filter-Reiter auf die gemalten Reiter (676..1176), Item-Icons in die gemalte Slot-Spalte (Mitte x=590, Text ab 628), und das AUSGEWAEHLT-Panel komplett skaliert in die Innenbox (1283..1528, zentriertes Kopf-Layout; "4-6 Schaden" sitzt IM Werte-Kasten). Knopf-Block (BENUTZEN/ABLEGEN/VERGLEICHEN) in buildDetailButtons vereinheitlicht.
- R162 (Autor "die Waende sehen alle schlecht aus + ich erkenne sie nicht"): 8 NEUE Wand-Stile (Kalkstein-Quader, Basalt mit Kalkfugen, Klosterziegel mit hellem Moertel + Rollschicht-Sockel, Putz mit Eckquaderung, Bruchstein+Ziegelband/opus mixtum, Tuffstein, Eichen-Blockbau, bemooster Bruchstein). Kernunterschied: DETERMINISTISCHE Geometrie - Reihen/Fugen laufen NAHTLOS ueber Kachelgrenzen (die alten 10 wuerfelten die Reihen-Phase je Kachel, darum sprangen die Fugen an jeder Naht); nur die Steintoenung variiert. Alte 10 bleiben zur Auswahl. Lesbarkeits-Pass fuer ALLE 18: kraeftige Lichtkante unter der Krone + Sockelschatten/Standlinie am Boden - jede Wand liest sich als Barriere.
- R165 (Autor "57 FPS aber alles stockend wie Zeitlupe"): die BEWUSSTE Slow-Motion des Stadt-Einfalls entfernt - sie fuehlte sich wie Lag an. Alles laeuft in Echtzeit (R131-Linie).
- R166 (Autor "die Angreifer haengen alle am Wasser, ich musste sie suchen"): Einfall-Kolonnen zielen ENTLANG DER STRASSE ins Stadtinnere statt Luftlinie zur Mitte (die fuehrte in den Fluss); dazu Anti-Haenger: wer 2s keinen Fortschritt macht, verliert sein jagdZiel und die normale KI (Wegfeld, fuehrt um Wasser herum) uebernimmt. Mueller + Magd Trine standen IN der See-Ellipse des Muehlenweihers - Anker ans Nordufer verlegt.
- R167 (Autor "Truppen sind vor meinen Augen mitten im Dorf verschwunden"): laeuft die Marsch-Uhr ab, despawnen nur Einheiten NAHE der Kartenkante; wer mitten auf der Karte steht (befehligt/aufgehalten), dessen Marsch wird STORNIERT (storniereMarsch, neue reine Funktion + Test) - er bleibt sichtbar hier stationiert.
- R168 (Autor "Stadtportal bringt mich ins alte Ravensmoor"): Portal-Anker + alle Portal-Ziele von village auf stadt (Brunnen-Platz 61/72) umgestellt.
- R169 (Autor "mache das weg"): der Annehmen/Zerstoeren-Relikt-Dialog nach dem Boss entfaellt - stattdessen "Trugbild zerfaellt"-Meldung + Chronik; endGame/ENDEN bleiben fuer das echte Relikt-Finale erhalten.
- R173 (Autor-Frage "welcher Zauber mit Level 1?"): Antwort war KEINER (Feuerball ab 2) - Feuerball jetzt ab Stufe 1 frei, damit die Zauberei-Schule von Anfang an steigerbar ist.
- R158b (Autor "Wasser sieht seltsam aus und macht seltsame Geraeusche"): meine R158-Preset-Umstimmung KOMPLETT zurueckgenommen (Optik gehoert dem Autor/F10) und den falsch besetzten Block-Klang beim Wasser-Anlaufen entfernt (Spritzer + Hinweis bleiben).
- R170 (Autor "Held gluht von innen, Regler wirkungslos"): die beiden Werkbank-Regler wirkten nur im ALTEN Licht-Pfad - seit dungeonNeu Standard ist, lief der V2-Renderer mit festem Held-Licht auf der Figurmitte. Jetzt in BEIDEN Pfaden verdrahtet: "Schein ueber Figur" AUS (Standard) legt das Held-Licht an den FUSSPUNKT (Boden ringsum leuchtet, Figur strahlt nicht von innen); "Eigengluehen" AUS (Standard) nimmt den warmen Glut-Kern weg.
- R171 (Autor "dunkler Schleier am Kartenrand - entferne das"): die dorfSim-Rand-Vignette (bis 0,85 Deckkraft bei Nacht/Bewoelkung) ist STANDARD AUS - ihr Radialverlauf erzeugte nachts zudem das blockige Banding aus dem Autor-Screenshot. Werkbank-Schalter "Rand-Vignette" holt sie fuer Vergleiche zurueck.
- R172 (Autor "kaum Waffen/Schilde, nicht inflationaer machen"): beuteRate 0.3 -> 1.0. Befund: die 0.3 (Autorwunsch R40) und die spaetere Drittelung der Basis-gearChance (0.11->0.045, R38/39) multiplizierten sich zu effektiv 1,35% Ausruestungs-Chance je Kill - eine Doppel-Senkung, die so nie entschieden wurde. Neutral 1.0 ergibt 4,5% (~1 Teil je 22 Kills) - weiterhin "selten & wertvoll", der F10-Regler bleibt.
- R174 (Autor "die Monster springen mich beim Angriff zu arg an - Mittelweg"): der Vorstoss in den Schlag (R39 "Duell-Gefuehl") ist HALBIERT (Hieb 26->13px, Doppelhieb 22->11px) - ein Nachsetz-Schritt statt Sprung, ein reiner Rueckschritt rettet weiterhin nicht. Der Wolfssprung fliegt langsamer und kuerzer (330->240 px/s, 0.35->0.3s = ~72 statt ~115px). Alle Werte als Regler in ENEMY_AI (data/enemies.ts).
- R164 (Autor, BAR-Spezifikation): das RTS-Fenster ("Banner") ist jetzt das KOMMANDO-Pult nach dem Beyond-All-Reason-Prinzip - KEINE Tabs mehr. Aufbau: Ressourcen-Zeile (Kernwaren + Arbeiter + Heer-Deckel, immer sichtbar) -> Auswahl-Bereich (R148-Chips/Detail-Karte/Gebaeude) -> festes 4x3-Kommando-Raster, dessen Inhalt ALLEIN aus der Auswahl folgt: Einheiten gewaehlt = Kampf-Raster (Angriff/Halten/Formation/Abstand + Haltungs-Toggles + Feuer/Zielwahl, aktive Zustaende gedrueckt markiert, Hotkeys A/H auf den Feldern); nichts gewaehlt = Bau-KATEGORIEN (Befestigung/Lager/Versorgung/Feldzeichen, Q/W/E/R) -> zweite Rasterebene mit konkreten Bauten+Kosten+Zurueck; Aushebung und Dev/Test als eigene Rasterebenen. Kontrollgruppen (Strg+1..9/1..9), Doppelklick-Typwahl und Chip-Herauspicken waren aus dem R148-Teilstand vorhanden und sind eingebunden; neu: Typ-Chip filtert die Auswahl (waehleNurTyp).
- R175 (#13 Minimap-Kartographie, letzter Alt-Backlog): Minimap huebscher (Pergament-Toene, WAND-KONTUREN um begangene Raeume, pulsierender Held-Punkt), ZOOMBAR (Mausrad ueber der Karte, 2..6 px je Kachel) und mit DIABLO-OVERLAY: TAB legt dieselbe erkundete Karte gross und halbtransparent mittig ueber das Spielfeld (TAB per addCapture vom Browser-Fokuswechsel befreit). Aufdeckung bleibt strikt Sichtlinien-basiert (nur Gesehenes).
- Die Skelettwache ist eine besondere feindliche RTS-Einheit und keine neue
  spielbare Truppengattung. Sie nutzt Stichschaden, eine gepanzerte Knochen-
  Signatur sowie Speerstich, Doppelstich und einen seltenen beidhändigen
  Rundumschlag ohne aufdringlichen Bodentelegraphen.
- Das vom Autor gelieferte Fab-Paket enthaelt Rig, modulare Geometrie, Waffe und
  Texturen, aber keine Animationen. Die sieben Clips wurden in Blender neu
  erstellt; im Repository liegen nur Phaser-Atlas und Entitlement-Attribution,
  keine FBX- oder 4K-Quelldateien.
- Der Ravensmoorer Pferdebestand besteht aus vier eigenstaendigen, reitbaren
  Entities mit gemeinsamem Blender-Atlas: schwarzes, etwas leichteres
  Heldenpferd sowie drei breitere Arbeitspferde in gedecktem Fuchs, dem bisher
  abgenommenen Dunkelbraun und warmem Braun. Es werden keine modernen Rassen
  behauptet; die leichte Formdifferenz steht fuer mittelalterliche Nutztypen.
- Die Arbeitspferde sind NPC-gefuehrt: Stallknecht Hanko bestimmt tagsueber eine
  langsame, breite Hofrunde. Aufsitzen pausiert diese Routine. Das Heldenpferd
  wartet ungeritten. Eine spaetere Stallverwaltung darf diese Grundlogik
  erweitern, aber nicht wieder auf ein einziges globales Pferd reduzieren.
- R176 (Autor "der Eingang ins Verlies ist die Kirche, nicht die Krypta-Treppe"): die R157-Aussen-Wendeltreppe suedoestlich der Kirche ist ENTFERNT. Der Weg ist jetzt: Kirchentuer der 3D-Kirche (Interaktionstaste, Schluessel-Gate wie gehabt bei Pater Johannes) -> Kirchenschiff-Innenraum (Zelda-Prinzip; derselbe Raum wie im alten Ravensmoor, Verschoenerung mit Codex/Blender-Assets folgt SPAETER) -> Geheimgang unter dem Chor (Wendeltreppe links vom Altar, Prolog beim ersten Abstieg bleibt) -> Krypta/Verlies. Der Kirchhof-Ausgang des Kirchenschiffs fuehrt vor die STADT-Kirche (KIRCHE_VORPLATZ in data/welt.ts), nicht mehr ins Archiv-Dorf.
- R176 Kirchentuer-Erkennung: die Betreten-Interaktion haengt an den ECHTEN Tuer-Positionen des 3D-Kirchenmodells (neu: Gebaeude3DWelt.tuerWeltPositionen) - verschiebt/skaliert der Autor die Kirche im Dorf-Editor, wandert der Eingang automatisch mit. Reichweite als KIRCHE_TUER_REICHWEITE_PX (56px) in data/welt.ts.
- R176 (Autor "Quest fuer das Stadtportal, ab der dritten Ebene"): das Stadtportal (feste Taste) ist QUEST-Belohnung - Gate umgestellt von bossDead auf das BESTEHENDE flags.ebene3 (wird beim ersten Betreten von crypt3 gesetzt; alte Spielstaende, die Ebene 3 schon erreicht haben, besitzen das Portal damit sofort). Erstes Erreichen meldet die Freischaltung (Log + Chronik), neue Nebenquest 'Der Weg zurueck ans Licht' in data/quests.ts, Zeile in der Aufgabenliste. Stadtportal-ROLLEN wirken weiterhin jederzeit (sie sind das Mittel selbst); castTownPortal-Altlasten ('village'-Check/Ziel) auf stadt korrigiert.
- R176 Innenraeume fuer ALLE Haeuser (Autor-Plan): kommt SPAETER Haus fuer Haus mit schoenen Assets - nicht Teil dieser Runde (TODO.md).
- R177 (Autor "die herbeigerufene Armee soll sich auf dem Hauptweg zur Verteidigung positionieren"): Ankuenfte in Ravensmoor (sichtbar UND abstrakt via Garnison-Spawn) beziehen automatisch STELLUNGS-LINIEN quer ueber die Einfall-Strassen - abwechselnd Nord- und Ost-Linie, 5 Mann je Reihe, weitere Reihen dahinter. Alle Werte in data/rts.ts (VERTEIDIGUNG). Der Stellungs-Platz ist deterministisch (Platz in der sortierten Stadt-Garnison), damit niemand doppelt steht.
- R178 (Autor "es kommen immer mal Spaeher-Monster vom Kloster"): alle 4-9 Minuten (SPAEHER in data/welt.ts, ab Tag 2, nie waehrend eines Einfalls) sickern 1-2 flache Skelett-Kundschafter "Kloster-Spaeher" ueber die NORDSTRASSE ein (der Klosterberg liegt im Norden der ravenkarte) - mit Meldung. Der R166-Entklemmer laeuft in der Stadt jetzt immer, damit auch Spaeher nie am Fluss haengen.
- R179 (Autor "ja, der Bote soll das ausloesen... Gebaeude auf x-beliebiger Karte, Pferd kommt mit"): Grafen-Ruf NUR noch ueber den Boten. Er wohnt beim Amt in Ravensmoor (Schulze-Dialog: "Den Boten zum Grafen schicken"); das neue RTS-Gebaeude BOTENPOSTEN (Kategorie Versorgung) holt ihn automatisch samt Pferd ins Feldlager - dort haengt der Ruf am Posten-Menue. Der Ritt laeuft kartenweise (40% der Fussmarsch-Zeit, reine Logik in logic/bote.ts mit 5 Vitest-Tests), Ziel ist die ECHTE burg-Karte (Fuerstenburg) + Audienz-Uhr; je Teilstrecke Abfang-Risiko 8% (20% bei Einfall/Krieg) - faellt er, ruestet sich in 5 Minuten ein Ersatz. Ankunft loest grafSchicktVerstaerkung aus. Bote wird gespeichert/geladen (save.welt.bote).
- R179 offen/bewusst abstrakt: der reitende Bote ist (noch) KEINE sichtbare Figur auf der Karte - Meldungen/Chronik erzaehlen den Ritt. Sichtbarer Reiter (Codex-Pferd) in TODO.md notiert. Der Bote hat bewusst noch keinen NAMEN (Regel 6: Namen erfindet der Autor) - Frage in OFFENE-FRAGEN.md.
- R180 (Autor "nicht ab Tag 2, sondern ab dem Boss-Sieg in der Krypta"): Spaeher-Gate von abTag auf bossDead umgestellt - passt exakt zur Dramaturgie aus Dok 06 C3 ("bis dahin laeuft alles still und heimlich"). Waehrend eines laufenden Einfalls schweigen die Spaeher weiterhin (verifiziert: bossDead loest erst den grossen Einfall aus, Kundschafter kommen ZWISCHEN den Einfaellen).
- R181 (Autor "die aeusserste Karte ganz links, von dort sollen die Truppen los laufen"): MARSCH.grafStart von 'start' auf 'burg' (Fuerstenburg) - die Grafen-Kolonne marschiert jetzt die komplette gy3-Reihe (burg -> wald_w -> start -> wald_o -> stadt, ~6:15 min). Boten-Ritt + Kolonne ab Nord-Lager gesamt ~9:30 Spielminuten (Rechnung in FELDZUG-PLAN.md, alles Regler).
- R180 GROSSE VISION (Feldzug): Autor-Order als FELDZUG-PLAN.md festgehalten und in Phasen F1-F6 zerlegt (Gebiets-Status, Feind-Produktion, Feind-Befestigung, sichtbarer Boten-Reiter/Zwischenbote/Pferde-Einrichtung, Fall+Rueckeroberung Ravensmoors mit Zuflucht im Norden, Balance-Pass Ueberlegenheit). Grundlage ist Dok 06 (Teile E/G/H decken die Vision) - NICHT sofort gebaut, sondern geordnete Aufgabenschlange (Autor-Regel: der Reihe nach).
- R182 (Autor "9:30 zu lang, Audienz 5s, Galopp"): BOTE.burgDauerS 45->5, BOTE.tempoF 0.4->0.2 (Galopp, 15s je Karte). Der grosse Zeit-Anteil ist jetzt bewusst der KOLONNEN-Marsch (75s je Karte, eigener Regler) - Boten-Kette ab Nord-Lager gesamt ~7:35 statt 9:30.
- R182 (Autor): NIEDERLAGEN-REGEL - man verliert NIE komplett. Zwischenloesung: letzter Rueckzugsort ist die Fuerstenburg (Frage "oder in die Berge?" in OFFENE-FRAGEN).
- R182 Feind-KI-Recherche des Autors gesichtet -> docs/design/07-FEIND-KI.md. UEBERNOMMEN: 3-Ebenen-Ticks, Blackboard mit Erinnerungs-Verfall, Cluster per Raster, Kampfstaerke-Formel (mit UNSEREM Schnitt/Stich/Wucht-Konter statt Speer-Reiter-Dreieck), Angriffs-Schwellen + Sammel-Timeouts, verschlankte Zustandsmaschine, Rueckzugslogik, Kein-Overkill, Lagerbau nach FESTER Reihenfolge an festen Ankern, Feind-Spaeher zur Staerkeschaetzung (Autor-Zusatz). NICHT UEBERNOMMEN (gemeldet): Kavallerie-Anteile/Reiterkeil (harte Regel 5), Armbrustschuetzen (Regel 6), Belagerungsgeraet (Regel 5), Hungarian-Algorithmus, eigene Einheiten-Ebene (existiert), Schwierigkeitsgrade/Scheinangriffe (spaeter), ML, fremde Punktwerte-Tabellen.
- F1 (gebaut + verifiziert): Gebietslage als reine Logik (logic/gebietslage.ts, 3 Tests) - Status je Karte frei/umkaempft/besetzt, nur Abweichungen im Save (welt.lage). Start-Besetzung FELDZUG.startBesetzt = lager/stadt2/kloster (data/welt.ts). Einfall setzt stadt auf umkaempft, Abwehr/Abbruch auf frei; jede Aenderung meldet sich im Log + Chronik (KAMPF-Reiter). KARTE-Tab faerbt: besetzt = roter Rahmen + Schleier + Stempel, umkaempft = orange.
- F2 (gebaut + verifiziert): der FEINDZUG lebt - logic/feindzug.ts (rein, 5 Tests) nach 07-FEIND-KI: jedes Feindlager (Start: Monsterlager, Verfallene Stadt, Klosterberg) produziert Kampfkraft (FELDZUG.produktionProS), schickt SPAEHER (Meldung "Kundschafter gesehen" = faire Vorwarnung), bemisst die Welle an der Sichtung (staerkeFaktor 1.3, welleMin 40) und greift die freie Nachbarkarte an, die Ravensmoor am naechsten liegt (die Zange schliesst sich; stadt2 nimmt zuerst RABENHAIN - deckt sich exakt mit der Autor-Beschreibung). Gate: erst nach dem Krypta-Boss.
- F2 Aufloesung: Held NICHT auf der Zielkarte -> abstrakt nach kampfDauerS (Welle vs. Garnison-Kampfkraft, kraftJeMann 12); Held AUF der Zielkarte -> ECHTE Welle von der Kante Richtung Angreifer-Lager, zaeher als Dungeon-Monster (truppHpF 2.2 / truppDmgF 1.3, Dok 06 H1.1), gedeckelt auf liveWelleMax 10 (Autor: keine Hunderterhorden). Alle Angreifer tot = zurueckgeschlagen.
- F2 Niederlage ohne Totalverlust: faellt eine Karte, STIRBT die Garnison nicht - sie zieht sichtbar zur freien Nachbarkarte Richtung Ravensmoor ab (Rueckzugs-Marsch). stadt und burg sind unantastbar (stadt faellt nur im F5-Story-Ereignis, burg ist der letzte Rueckzugsort).
- F2 Rueckeroberung V1 ("Gebiete saeubern"): steht der Held auf einer besetzten Karte und lebt dort kein Feind mehr (3s-Bestaetigung), faellt sie zurueck an den Spieler und das Feindlager dort ist zerstoert. F3 haengt hier das SICHTBARE zerstoerbare Feindlager ein.
- R188 (Autor "1 FPS bei 10 bewegten NPCs"): URSACHE gefunden - wegPunkt berechnete je Einheit ein Voll-Karten-Flussfeld (128x128), und weil das Slot-Ziel einer BEWEGTEN Formation jeden Frame wandert, griff der Feld-Cache nie (je Einheit und Frame eine Vollberechnung). FIX: (1) Freie-Bahn-Abkuerzung - ist die Gerade zum Ziel frei, gibt es KEIN Flussfeld (offenes Feld = fast immer); (2) Ziel-Kacheln in 3er-Bloecken gebuendelt (Cache-Stabilitaet); (3) updateWachwerden auf 4x je Sekunde gedrosselt (Paar-Schleifen mit Sichtlinien-Raycasts liefen jeden Frame). Verifiziert: Formations-Marsch-Frames kosten jetzt Faktor 1,0 gegenueber Ruhe (vorher ~50x).
- R189 (Autor "nur 1-2 von 10 wehren sich"): URSACHE - der STELLUNGS-Befehl (jagdZiel) laeuft in der Einheiten-KI VOR dem Kampf-Zweig und returnt; eine Einheit in Stellung konnte sich NIE wehren, Wecken half nicht. FIX: eine wache Einheit laesst ihre Stellung fallen, sobald ein Gegner in Reaktionsweite ist (VERTEIDIGUNG.reaktionPx 220, Sichtlinie geprueft); Marschierer sind ausgenommen (sonst zerlegt jeder Kontakt den Marsch, R167). Verifiziert: 10/10 verlassen die Stellung und kaempfen.
- R190 (Autor-Verbot "Held darf nicht durch fremde Kaempfe aufsteigen"): ZWEI XP-Lecks gefunden und gestopft - (1) Kills der BEWOHNER-Kaempfer (KAEMPFER-Schleife) und (2) Kills der eigenen SKELETTWACHE (beide riefen damageEnemy OHNE durchTruppe-Flag). Die Meldung "X Erfahrung fuer die Fuehrung" nach gewonnener Schlacht ist dagegen GEWOLLT (R147c, Autor-Order Schlacht-Wertung). Verifiziert: Truppen-Kill 0 XP, eigener Kill gibt XP.
- R192 (Autor: Zuflucht-Vorschlag A ANGENOMMEN, "muss von vorne klar sein"): die Fuerstenburg nimmt kaum Fluechtlinge auf (Angst vor Krankheiten) - der Held haelt das beim ERSTEN Betreten Ravensmoors in seinen Aufzeichnungen fest (Dialog + Chronik, flags.zufluchtGehoert), inkl. Hinweis auf die sichere Zuflucht im Norden. Damit ist der Zwei-Zufluchten-Konflikt aufgeloest.
- R193 (Autor "Skelett fehlt Dynamik und Schlagfertigkeit"): Die Skelettwache
  besitzt eine eigene, mit Blender synchronisierte Kampf-Zeitleiste statt des
  pauschalen Gegner-Cooldowns. Stich/Kombo/Rundumschlag treffen jetzt in ihren
  sichtbaren Kontaktframes (0,30/0,34/0,52 s Windup), der zweite Kombostich
  folgt nach 0,24 s, und der normale Stich kann nach 0,74 s neu beginnen.
  Trefferreaktionen duerfen einen laufenden Angriff nicht mehr optisch
  ueberschreiben; die Angriffsrichtung bleibt bis zum Clipende verriegelt.
- R193 Animation: Laufen verlagert Becken, Rumpf und Speer ueber das Standbein;
  Stiche werden fuer Vorder-/Rueckansicht leicht diagonal gefuehrt; beim
  Rundumschlag dreht sich der komplette Koerper um 360 Grad. Die Speerwache
  pariert nur kurz (0,20-0,32 s) und kontert mit ihrem echten Stich statt mit
  dem generischen Hieb. Der neue Atlas bleibt bei 576 Frames / 1920x7680 px.
- R184 (Autor "unsichtbare Wand am Waldrand, wo frueher ein Fluss war"): URSACHE - recarveWasser nahm BEGEHBARE Wasserkarten (nur start) aus; die beim Kartenbau eingebrannte Wasser-Kollision blieb stehen, waehrend die SICHTBARE Geometrie (F10-Regler, persistiert) laengst anders lief. FIX: start recarvt jetzt wie alle Karten (R156-Regel: Kollision folgt IMMER der Sichtbreite). Verifiziert: 1001 -> 373 -> 1001 Wasser-Kacheln je nach sichtbarer Geometrie.
- R184 Befund stadt2->schlacht: der Nord-Uebergang ist am WEG (58% der Breite) mit Standard-Geometrie ERREICHBAR (BFS ueber die echte Kollision, 6146 Kacheln). Dass der Autor nicht durchkommt, liegt an der FLUSS-LAGE (76.8% schneidet die Nordost-Ecke ab) - das ist die R185-Neuverlegung (nie diagonal), nicht eine unsichtbare Wand.
- R185 (Autor "Fluesse NIE diagonal - vertikal/horizontal mit Kurven, wie gezeichnet"): neuer achsentreuer Fluss-Generator flussWeg() ersetzt den Quer-Bogen (bogenPunkte) fuer ALLE Tabellen-Fluesse: ein Lauf folgt der Achse seiner Start-Kante (Nord/Sued senkrecht, West/Ost waagerecht), schlaengelt leicht (Sinus + smoothstep-Versatz) und biegt in einem RUNDEN ELLBOGEN ab - auch See-/Hub-Muendungen. Kanten-POSITIONEN unveraendert (Nachbar-Ufer matchen weiter), Wege bleiben gerade (R100i). Verifiziert: Karten-Uebersicht deckt sich mit reference/ravenkarte.png (senkrechte Laeufe oben, waagrechter Hauptlauf unten), Uebergaenge stadt2->Nord, stadt->West, start->Ost per Kollisions-BFS erreichbar.
- R186 (Autor-Paket Kommando-Pult): (1) Das Schwebe-Fenster am Feldbau ist WEG - Klick auf ein Gebaeude waehlt es im Pult (oeffnet den RTS-Modus, falls zu); die Gebaeude-Karte traegt jetzt Reparieren/Abbauen UND die Sonderaktionen (Wartfeuer-Ruf, Tor auf/zu, Botenposten). (2) Grid-Felder groesser (40 statt 34 hoch, Text 9 statt 7) - "Lager/Versorgung" lesbar. (3) TOOLTIPS auf ALLEN Pult-Feldern (Haltungen, Feuer, Zielwahl, Kategorien mit Inhaltsliste, Dev). (4) FORMATIONS-EBENE: der Formation-Knopf oeffnet ein eigenes Raster mit ALLEN Formationen (+ Abstand Eng/Normal/Weit) und Zurueck - kein Durchklicken mehr. rtsBattle.waehleNichts() neu (sauberes Abwaehlen).
- R193 (Autor "Gegner sollen im Kommando-Fenster zu sehen sein"): Klick auf einen GEGNER (ohne eigene Auswahl) zeigt seine FEIND-Karte im Pult: Name, Lebensbalken (rot), Schaden, Kampfart, Merkmale (Schild/Elite/ANFUEHRER/Feindzug-Welle). Eigene Einheiten/Held/Gebaeude hatten bereits Karten. NOCH OFFEN: Info-Karten fuer die 3D-STADTHAEUSER (kommt mit den Innenraeumen) und die Gegenstaende-Frage (OFFENE-FRAGEN).
- R187 (Autor "Standard-Heerwaffe 5-8 wie Spielerwaffen, Leder/Kette statt Stoff, epische Waffe rueberschieben"): HEER_AUSRUESTUNG (data/rts.ts) gibt jedem Heer-Typ eine Grundausstattung: Heerklinge/Heerbogen mit VON-BIS-Schaden (wuerfelt je Schlag/Schuss) + Lederwams (10% Schutz) bzw. Kettenhemd (18%, Schild/Reiter). Die Ruestung daempft eingehenden Schaden real (trifftVerbuendeten). Rang skaliert die Klinge weiter mit.
- R187 Uebergabe: auf der Einzel-Soldat-Karte im PULT (das IST die "Ausgewaehlt"-Ansicht des Heeres) sitzt der Knopf "Ausruesten" - er listet die besten Waffen (+dmg-Boni+Schmiedestufe) und Ruestungen/Schilde aus dem Helden-Rucksack; Klick uebergibt den Gegenstand (wandert aus dem Inventar, wird im Roster als Geschenk gespeichert und wirkt sofort). Ein ERSETZTES Geschenk wandert zurueck in den Rucksack (Original-Item wird mitgespeichert). Die Charakterfenster-Anbindung ("Truhe") kann spaeter zusaetzlich andocken.
- R191 RUECKZUG (Autor "im RTS-Menue sichtbar"): neues Pult-Feld im Grundraster - alle Einheiten der Karte marschieren zur freien Nachbarkarte RICHTUNG ZUFLUCHT (FELDZUG.zufluchtKarte=hochland, kuerzeste Route); eingeschlossen = ehrliche Meldung. Auf der Stadtkarte suchen die Bewohner 60s lang Schutz im Gemeindehaus (Panik-Mechanik) - der grosse Treck in die Zuflucht kommt mit F5.
- R191 SICHTBARE REPARATUR (Autor "jemand soll sichtlich reparieren"): Reparatur ist jetzt ein AUFTRAG - der naechste eigene Soldat (Umkreis 700) geht ans Bauwerk und haemmert 4s (FX+Klang alle 0,8s, BAU_REPARATUR.dauerS), erst dann steigt der Zustand; steht nur der Held daneben, legt ER Hand an. NIEMAND in der Naehe = keine Reparatur (ehrliche Meldung, keine Kosten). Kaempft der Arbeiter zwischendurch (R189), nimmt er die Arbeit danach wieder auf.
- F3 (gebaut + verifiziert): das FEINDLAGER auf besetzten Karten (erst nach dem Krypta-Boss). Der BINDEALTAR (Dok 06 A3, 320 LP, stationaer, kein Angriff) haelt den Abschnitt: faellt er, verliert die gesamte Besatzung die Haelfte ihrer HP ("die Horde zerfaellt") - der Comeback-Mechanismus. Der KNOCHENWALL waechst nach FESTER Reihenfolge mit der Besatzungszeit (Stufe 1 ab 90s: Sued-Halbring; Stufe 2 ab 300s: voller Ring mit Nord/Sued-Toren) aus BRUECHIGEN Kacheln (CRACK - durchschlagbar wie Mauerrisse). Waechter 3/5/7 je Stufe, zaeh (truppHpF). Saeuberung raeumt den Wall. OPTIK IST PLATZHALTER - die Monster-Bau-Assets (Knochen/Fleisch/Blut, Autor-Ansage) sind noch zu definieren (OFFENE-FRAGEN).
- F4 (gebaut + verifiziert): (1) SICHTBARER BOTEN-REITER - quert der Bote die Held-Karte, gleitet die Pferd-Figur (Codex-Atlas, idle-Frames; Galopp-Frames folgen mit den Assets) von Kante zu Kante, Fortschritt = echte Teilstrecken-Uhr. (2) PFERDEKOPPEL als neues Versorgungs-Bauwerk: nur MIT ihr (oder in Ravensmoor) reitet der Bote (15s/Karte), sonst laeuft er (BOTE.tempoFZuFuss 0.55 = ~41s/Karte) - Meldungen sagen es ehrlich. (3) ZWISCHENBOTE: vom Botenposten aus rennt ein Laeufer abstrakt nach Ravensmoor und schickt bei Ankunft den Hauptboten zum Grafen - der Ruf ist damit von JEDER Karte ausloesbar, wie vom Autor gewuenscht.
- F5 (gebaut + verifiziert): DER FALL VON RAVENSMOOR als Zustandsmaschine (flags.fallSturm/fallVerloren/stadtGefallen/zufluchtBezogen/stadtZurueck, Uhren fallT/treckT in FELDZUG, alles im Save). Ablauf: der grosse Einfall wird zum STURM (endloser Nachschub alle 18s, nach 30s kommt der GOLEM); nach 75s ist die Stadt nicht mehr zu halten (ehrliche Verloren-Meldung) - WEICHT der Held (Kartenwechsel bzw. Rueckzugs-Befehl), faellt Ravensmoor: Lage besetzt, Feindlager+Bindealtar stehen, die Bewohner fliehen als TRECK (240s Weg) in die Zuflucht (hochland). Die Rueckeroberung laeuft ueber die normale Saeuberung (F2/F3): Stadt frei -> stadtZurueck, Bewohner kehren zurueck. Der Held verliert NIE komplett (Autor-Order) - der Fall ist ein Story-Tal, kein Game Over.
- F5 Bewohner in der besetzten Stadt: NPCs werden schon beim SPAWN versteckt (nicht erst im Dorfleben-Takt) - der Takt pausiert bei offenen Fenstern (uiBlocked) und liesse sie sonst sichtbar stehen. Der fruehere Rot-Befund im Test war genau das: der offene R192-Aufzeichnungs-Dialog.
- F5 Einfall-Sperre: in der GEFALLENEN Stadt starten keine Einfaelle mehr (weder der naechtliche noch der grosse) - sie gehoert dem Feind bereits; ohne die Sperre haette ein spaeter Einfall-Trigger die Rueckeroberung gestoert (Lage zurueck auf umkaempft, endloser Nachschub gegen die Saeuberungs-Uhr).
