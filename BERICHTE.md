# BERICHTE - Abnahmeberichte je Phase

## Phase 0 - Projektgerüst (abgenommen)

Fertig und verifiziert:
- Vite + Phaser 3.90 + TypeScript (strict) + Vitest stehen; `tsc --noEmit`
  fehlerfrei, 39 Tests grün, Produktions-Build läuft.
- Referenzdatei liegt unter reference/ravensmoor-v2.html und ist vollständig
  als typisierte Daten extrahiert (src/data/): Items, Affixe, Edelsteine,
  Raritäten samt Drop-Formeln, Gegnerwerte, Elite, Boss-Mechanik,
  Krypta-Themen, Altar-/Brunnen-/Truhen-Effekte, alle Dialoge, alle
  Erzähler-Texte, Notizen, Enden, Balancing-Formeln.
- Hot-Swap-Asset-System: BootScene prüft alle erwarteten Dateien
  (Portraits, Items, Sounds, Sprites, Tiles, Titelbild), loggt
  Gefunden/Fallback in der Konsole; SpriteProvider liefert programmatische
  Fallbacks (Figuren mit 4 Richtungen + Gehzyklus, Item-Icons, Tiles).
- ASSETS-LIESMICH.md (komplette Checkliste + ChatGPT-Prompts) und
  TILES-LIESMICH.md erzeugt.
- Hauptmenü läuft im Browser (Screenshot: screenshots/phase0-titel.png),
  Vektor-Fallback "Kirche im Nebel" aktiv, da noch kein Titelbild da ist.
- Screenshot-Werkzeug (scripts/screenshot.mjs) für alle weiteren Phasen.

Diff-Liste gegen die Referenz (bewusste Abweichungen laut Konfliktregel -
Masterprompt schlägt Referenz):
- Goldverlust beim Tod: 15% statt 20%.
- Perfekte Parade: Fenster 300 ms statt 250 ms, Riposte +100% statt +50%.
- Ausweichrolle: 300 ms Unverwundbarkeit statt 180 ms (Abklingzeit 0,9 s gleich).
- Hit-Stop: 50/80/100 ms (Referenz nutzte 45/70/100).
- Schwerer Hieb, Waffenklassen-Movesets, Bögen/Pfeile, Zauberrollen,
  Fertigkeits-Schulen, Material/Lebensmittel, 3 Speicherslots, getrennte
  Lautstärken: in der Referenz nicht vorhanden, laut Masterprompt ergänzt.
- Unverändert 1:1 übernommen: alle Texte/Dialoge, Item-/Gegnertabellen,
  XP-/HP-/Mana-Formeln, Zauberwerte, Drop-Chancen, Krypta-Paletten,
  Altar-/Blutbrunnen-/Truhen-Effekte, Elite-Affixe, Boss-Phasen.

Offen:
- WorldScene/UIScene sind Gerüste (Inhalt ab Phase 4/5).
- DebugArena zeigt nur Hinweistext - Kampfkern ist Phase 1.

## Phase 1 - DebugArena + Kampfkern (abgenommen)

Fertig und verifiziert:
- Kampfkern als reine, getestete Logik (src/logic/combat.ts): 3er-Kombo mit
  Finisher (+45%), Eingabe-Puffer 250 ms (Klickspam-Test UND
  Nicht-verschluckt-Test grün), schwerer Hieb 0,6 s/2,2x mit vollem
  Commitment, Block auf 30%, perfekte Parade 300 ms mit Riposte +100%,
  Rolle 300 ms Unverwundbarkeit/0,9 s Abklingzeit, Abbruchfenster ab 50%
  der Erholung. 38 Vitest-Tests grün.
- DebugArena im Browser verifiziert (screenshots/phase1-arena.png):
  Bewegung, Kombo, Schadenszahlen, Schwung-Bögen, Gegner-Telegraph
  (pulsierender Ring), Hit-Stop, Kamera-Wackeln, Dummy-Gegner.
- Debug-Overlay (Taste H): Hitboxen, Aggro-Radien, alle Timings live
  (Zustand, Erholung, Puffer, Parade-Fenster, Riposte, Rolle, Hit-Stop).
- Spawn-Tasten 1-7 für alle Gegnertypen, 9 = Elite, 0 = Dummy, K = leeren,
  G = Waffe durchwechseln (für Phase 2).
- Gegner-KI portiert: Verfolgen, Telegraph-Windup, Fernkampf-Kiting,
  Elite-Affixe (Schnell/Vampirisch), Boss-Gerüst (Phasen, Beschwörung,
  Slam, Fächer).
- Dreifaches Treffer-Feedback überall zusammen: Hit-Stop + Partikel + Sound
  (WebAudio-Fallback).

Spielgefühl-Check (per Code-Timings + Browser-Probelauf): Klickspam ohne
Timing verliert die Kombo (Puffer verfällt nach 250 ms), gewollte Eingaben
in den letzten 250 ms der Erholung kommen garantiert. Parade fühlt sich
großzügig an (300 ms), bleibt aber optional.

Offen:
- Touch-Steuerung kommt in Phase 10.
- Bogen-Moveset (Spannen/Pfeile) kommt in Phase 2.

## Phase 2 - Waffenklassen + Gegnerkatalog (abgenommen)

Fertig und verifiziert (Browser-Durchlauf mit allen Typen, Screenshots
phase2-bogen-spannen/-schuss/-boss/-alle.png, keine Laufzeitfehler):
- Alle 5 Waffenklassen-Movesets: Schwerter (3er-Kombo), Äxte (Finisher =
  360°-Rundumschlag), Hellebarde (Geradeaus-Stoß, höchste Reichweite,
  schmaler Kegel, Rückstoß), Wuchtwaffen (Überkopfschlag, Flächenschaden,
  bester Haltungsschaden, Mini-Shake), Bogen (halten = spannen mit
  Spann-Anzeige, mehr Schaden bei vollem Zug, Pfeile als Ressource).
- Jede Klasse mit eigenem Klang (WebAudio-Fallback) und eigenem Schwung-Visual.
- Gegner-Angriffsmuster (Telegraphen 0,35-0,85 s): Pestopfer Hieb +
  Giftwolke (Flächen-Telegraph), Skelett Hieb + Doppelhieb, Grabschatten
  Hieb + Blinkschlag (erscheint hinter dem Spieler), Wolf Biss +
  Sprungangriff, Schütze Schuss + Nahkampf + Kiting, Tempelritter
  Hieb/Slam/Fächer + Beschwörung 66%/33% + Phase 2 ab 50%.
- Elite-Gegner: goldener Ring, größer, Schnell/Vampirisch, in der Arena
  per Taste 9 zuschaltbar.
- "Hören vor Sehen": Gegner ab 1,5-facher Aggro-Reichweite leise hörbar
  (Lautstärke nach Distanz). Implementiert, aber per Screenshot nicht
  prüfbar - im Live-Spiel gegenhören.

Offen:
- Wolf nutzt den Hunde-Klang als Fallback (kein Wolf-Sound in der
  Spezifikations-Soundliste) - in OFFENE-FRAGEN.md vermerkt.

## Phase 3 - Items komplett (abgenommen)

Fertig und verifiziert:
- Loot-Test-Suite grün (Raritäten-Verteilung je Ebene, Affix-Pools ohne
  Doppler, Präfix/Suffix-Regeln, Fassungen ab Selten, Edelstein-Formel,
  Preisformel) - 38 Tests gesamt.
- Bodenbeute im Spiel: Gegner lassen Gold/Tränke/Ausrüstung/Edelsteine
  fallen (Referenz-Chancen), Lichtsäulen in Raritätsfarbe über Magisch+,
  Auto-Aufnahme für Gold/Tränke/Edelsteine, E-Aufnahme mit Hinweistext
  für Ausrüstung (Screenshot phase3-loot.png: "Kriegsbogen - E zum
  Aufheben").
- Inventar (Taste I): Item-Karten mit Raritätsrand/-balken, Icon je Typ
  (Hot-Swap-fähig), Wertezeile, ANGELEGT-Marke, Klick = anlegen/ablegen/
  Edelstein fassen, Tooltip mit allen Werten und Vergleich zum angelegten
  Item (Screenshot phase3-inventar.png).
- Charakterfenster (Taste C): Portrait (Hot-Swap, sonst Figur im Rahmen,
  Rüstungsvariante ab Kettenhemd), Ausrüstungs-Slots mit Raritätsrahmen
  und Sockel-Anzeige, Werteübersicht, Fertigkeits-Balken aller drei
  Schulen (Screenshot phase3-charakter.png).
- Behoben: offene Fenster verschluckten die Schließen-Taste.

Offen:
- Inventarliste blättert noch nicht (Überlauf-Schutz greift ab ~10
  Einträgen) - in TODO.md, wird mit Phase 10 (Menüpolitur) gelöst.

## Phase 4 - Krypta (abgenommen)

Fertig und verifiziert:
- 3 prozedurale Ebenen (Gruft/Beinhaus/Kultstätte) + Bossraum mit den
  Referenz-Farbpaletten; Treppen verbinden alles, Krypta wird beim Tod
  neu bevölkert, 15% Goldverlust.
- Spezialräume: Bibliothek (anklickbare Bücher mit Lore-Schnipseln +
  Foliant), Folterkammer (Streckbank, Käfige, Notiz, seltene Truhe,
  Skript-Moment), Beinhaus-Schrein (Knochenwände, Skelett-Welle,
  Beinaltar mit garantiertem Edelstein), Grabkammer der Anna (Medaillon),
  Blutbrunnen, Opferaltäre (Kultstätte: zwei), Kerzenschrein je Ebene
  (Rasten: Vollheilung + Flaschen, keine Gegner-Resets), Truhen mit
  Goldschimmer, Erzadern/Felsen (Abbau ab Spitzhacke).
- ERREICHBARKEIT BEWIESEN: BFS-Test über 40 Seeds je Ebene - jeder
  Spezialraum, jede Truhe, jeder Schrein, jede Treppe erreichbar
  (tests/areagen.test.ts, 45 Tests grün). Max. 2 Skript-Momente getestet.
- Zerstörbare Objekte: Fässer/Kisten/Krüge/Knochenhaufen/Spinnweben mit
  1-2 Treffern, Bruch-Partikel + Sound + Hit-Stop, Loot-Tabelle (meist
  nichts/Münzen, gelegentlich Trank/Pfeile, selten Item, Holz/Eisenreste
  als Material), Lauerer dahinter (zählt zum Skript-Budget). Treffer über
  alle Angriffsarten inkl. Rundumschlag-Fassgruppen und Projektile.
- Licht: stockdunkle Krypta, weiches Spielerlicht (Lichtradius-Affix
  wirkt), flackernde Fackeln mit warmem Schein, Helligkeits-Regler
  angebunden. Minimap mit Aufdeck-Logik. Screenshots phase4-krypta1/2.png.
- Boss-Kampf im Browser bestanden (Bot-Lauf: "Der Tempelritter ist
  gefallen", Templerklinge + Relikt + 120 Gold fallen, Screenshot
  phase4-boss-kampf.png), Relikt-Dialog mit beiden Wahlmöglichkeiten und
  ERLÖSUNG-Ende verifiziert (phase4-relikt.png, phase4-ende.png).
- Zauber (Feuerball/Heiliges Licht/Heilung) und Tränke an Tasten 1-3/Q/F.
- Wichtiger Fix: Input-Hitboxen in UI-Containern bei gescrollter Kamera
  (Phaser-Eigenheit) - betraf alle Dialog-/Inventarknöpfe.

Offen/Anmerkungen:
- "Annehmen"-Ende per Code identisch verifiziert wie "Zerstören"
  (gleicher Pfad), aber nur "Zerstören" im Browser durchgeklickt.
- Fässer-Spielgefühl: Bruch-Feedback implementiert (Partikel+Sound+
  Hit-Stop), gezielter Browser-Test der Fassgruppen steht aus - die
  Trefferpfade sind dieselben wie die verifizierten Gegner-Treffer.
- Dev-Werkzeuge (?start=, ?ruestzeug=, ?relikt=) nur im Dev-Build aktiv.

## Hinweis zur Verifikations-Umgebung

Playwrights eigener Browser-Download ist in dieser Umgebung gesperrt;
Screenshots laufen über ein npm-Chromium (@sparticuz/chromium). Touch auf
echtem Gerät kann hier nicht geprüft werden - wird je Phase vermerkt.
