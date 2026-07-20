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

## Phase 5 - Dorf groß (abgenommen)

Fertig und verifiziert (Screenshot-Tour phase5-dorf-markt/-kirche/-taverne,
phase5-haendler-dialog/-shop/-kauf.png):
- Ravensmoor ist 92x60 Tiles (Referenz: 46x30), aufgebaut entlang der
  alten Salzstraße mit Bach, Steg, Marktplatz und Brunnen.
- Alle Gebäude aus 7.2: Taverne "Zum Schwarzen Raben", Kirche St. Marien
  mit Friedhof und Kryptaeingang (Schlüssel von Pater Johannes),
  Magdalenas Hütte am Waldrand (Kräuter davor), Mühle am Bach, Schmiede,
  zwei Bauernhöfe mit Gattern (Schweine, Hühner, Kuh - laufen umher und
  geben Laute nach Entfernung), Marktplatz mit fahrendem Händler,
  niedergebranntes Gehöft, Bildstock, Heuhaufen, Krüge, Hund bei der
  Taverne, Hühner auf der Straße, Krähen am Friedhof (Audio).
- NPCs mit Tagesablauf: Morgen-/Abendposition, sie LAUFEN sichtbar dorthin
  (Schmied, Müller, Bauern abends zur Taverne). Spieltag = 10 min,
  Abenddämmerung tönt das Bild ein.
- Dialoge mit Portraitrahmen (Hot-Swap-fähig) - alle Referenztexte, dazu
  neue NPCs. Im Browser verifiziert: Händler-Dialog samt Auswahlknöpfen.
- Handel: gemeinsames Shop-Fenster mit KAUFEN/VERKAUFEN/VERBESSERN-
  Reitern. Verifiziert: Kauf beim fahrenden Händler (600-273=327 Gold,
  Slot würfelt nach), korrekte Ablehnung bei zu wenig Gold,
  Wochensortiment seedbasiert mit Episch-Chance. Heinrich (Ankauf, Bett
  10 Gold = schlafen/Tag überspringen), Magdalena (Elixiere, Flaschen-
  Upgrades, Zauberrollen), Schmied (Pfeile, Werkzeuge, Upgrade-Reiter
  mit Gold+Eisen+Kohle), Bauern (Saatgut, Lebensmittel-Buffs) nutzen
  exakt denselben verifizierten Codepfad mit statischen Sortimenten.
- Müller-Nebenaufgabe (Ratten im Lager) mit Belohnung; Anna-Quest-Abgabe
  bei Heinrich (seltener Ring + 100 Gold); Dank-Dialoge nach Relikt-
  Zerstörung für Heinrich/Magdalena/Johannes.
- Bäume fällen (Axt, 3 Schläge, Holz, respawnt nach Schlaf), Felsen im
  Dorf, Kräuter sammelbar.
- Atmosphäre: Nebelschwaden, Vignette, Schornsteinrauch, Dorf-Wind-Loop.

Offen:
- Taverne/Bett, Müller-Quest, Schmiede-Upgrade im Browser nicht einzeln
  durchgeklickt (gleiche verifizierte UI-Pfade); beim Story-Durchlauf in
  Phase 6 wird der Weg Johannes -> Schlüssel -> Krypta mitgeprüft.
- Präfix-Deklination ("Grimmiger Kettenhemd") wie Referenz - siehe
  OFFENE-FRAGEN.md Punkt 6.

## Phase 6 - Dunkelwald + Story (abgenommen)

Fertig und verifiziert (Story-Durchlauf im Browser, Zustände protokolliert):
- Dunkelwald als geführtes Eröffnungsgebiet: dichter dunkler Wald, ein
  gewundener Pfad nach Ravensmoor, Nebel (Screenshot phase6-wald-intro).
- Intro-Szene: Auftrag des Landherrn mit Portrait - Name kommt aus
  src/data/story.json ("Landherr von Falkenberg", in einer Zeile änderbar
  für die Tabletop-Anbindung).
- Tutorial-Beats: Wolf als erster Kampf (zwei Begegnungen am Pfad),
  umgestürzter Baum versperrt den Weg - im Stamm steckt eine Holzaxt
  (Holzhack-Tutorial, 3 Schläge je Baum), Lichtung mit erstem
  Kerzenschrein.
- Erzähler-Interludium "Ich wusste nicht, was mich erwartete..." am
  Waldrand (Referenztext), danach Übergang ins Dorf.
- Verifizierter Ablauf (Zustands-Log): Landherr-Dialog -> Auftrag ->
  Axt erhalten -> Schrein -> Ankunfts-Text -> Dorf -> Johannes gibt
  Kryptaschlüssel -> Kirchentür -> Krypta-Ebene 1 samt Interludium.
- Anna-Quest (Phase 4/5) und beide Enden (Phase 4) vervollständigen das
  Story-Gerüst aus Teil 8.

Anmerkung zur Verifikation: Die Laufwege wurden im Test teleportiert,
alle Interaktionen/Trigger/Dialoge liefen echt. Der frei laufende Bot
schaffte den Wald nur unzuverlässig - das ist eine Schwäche des Test-
Bots, nicht des Spiels (manuelle Stichprobe der Wege steht beim Autor aus).

## Phase 7 - Crafting/Aufbau/Farm (abgenommen)

Fertig und verifiziert (Browser-Test mit Zustands-Log, Screenshot
phase7-hof.png):
- Ressourcen komplett: Holz (Bäume fällen, 3 Schläge, respawnen nach
  einer Nacht), Stein (Felsen, Spitzhacke), Eisen (Erzadern Krypta 2+),
  Kräuter (Waldrand/Magdalenas Ecke), Kohle (beim Schmied - die
  Spezifikation nennt einen Köhler, definiert ihn aber nicht; siehe
  OFFENE-FRAGEN).
- Wiederaufbau in 3 Stufen beim Schmied in Auftrag gebbar, Kosten gegen
  Gold+Holz+Stein+Eisen, baut sich über eine Spielnacht. VERIFIZIERT:
  Stufe 0->1->2->3 mit korrektem Materialabzug, Gebäude wird im Dorf
  sichtbar neu gebaut ("Dein Hof").
- Stufe 1: Lager-Truhe (Items ein-/auslagern, eigenes Fenster) +
  Strohlager (Schlafen). Stufe 2: Kamin (Buff "Aufgewärmt": Regeneration
  im nächsten Kryptagang, verfällt bei Rückkehr ins Dorf) + richtiges
  Bett. Stufe 3: Feld, Einrichtung wählbar (4 Deko-Sets), Gartenschrein
  (Schnellreise zur Krypta).
- Farm-Loop VERIFIZIERT: Säen (Saatgut der Bauern) -> Gießen -> über
  Nächte wachsen (nur gegossene Beete) -> Ernten (Rüben/Kohl als
  Lebensmittel-Buff oder Verkaufsware). Setzlinge wachsen sichtbar.
- Magdalenas Rezepte: Heiltrank aus 2 Kräutern, Manatrank aus 3.

Offen:
- Einrichtungs-Sets sind wählbar, aber noch ohne sichtbare Deko im
  Hausbereich (Innenräume gibt es nicht; Politur-Kandidat Phase 9/11).

## Phase 8 - Fertigkeiten (abgenommen)

Fertig und in der DebugArena demonstriert (Mess-Logs + Screenshots
phase8-zauberei/-bogen.png):
- Nahkampf: Rundumschlag (Stufe 3, Taste R, alle Gegner im Umkreis
  getroffen), Sturmangriff (Stufe 6, Taste T, Ansturm mit Schaden entlang
  der Bahn), Hinrichtung (Stufe 9, passiv - GEMESSEN: 100 -> 250 Schaden
  gegen Taumelnde, Faktor exakt 2,5).
- Zauberei: Kettenblitz (Taste 4, springt auf 2 weitere Gegner, gezackter
  Blitz-Effekt), Frostnova (Taste 5, Kreis + Verlangsamung - 4 Gegner
  gleichzeitig verlangsamt), Bannkreis (Taste 6, goldene Fläche 6 s,
  Untote erleiden dort mehr Schaden; Wolf/Ratte ausgenommen).
- Bogenschießen: Mehrfachschuss (R mit Bogen - GEMESSEN: 3 Pfeile
  verbraucht, 3 Projektile im Fächer), Durchschlag (Stufe 6, passiv -
  Pfeile durchdringen, pierce-Flag verifiziert), Markierter Tod (T mit
  Bogen - Gegner markiert, +25% Schaden, rotes Mal über dem Kopf).
- Schulen steigen nur durch passende Benutzung: Nahkampf-Treffer,
  gewirkte Zauber, Pfeiltreffer (Fehlerquelle behoben: Zauber/Pfeile
  zählten anfangs als Nahkampf).
- Zauberrollen: wirken einmal ohne Manakosten, auch oberhalb der eigenen
  Stufe (GEMESSEN: Stufe-1-Charakter wirkt Heiliges Licht per Rolle, Mana
  unverändert). Rollen droppen mit 4% und stehen bei Magdalena im Regal.
- Arena-Spawns auf F1-F9 verlegt (Konflikt mit Zauber-/Fähigkeitstasten).

Offen:
- Fähigkeits-Abklingzeiten sind nicht im HUD sichtbar (Meldung erscheint
  nur, wenn die Schule fehlt) - kommt mit der HUD-Politur in Phase 9/10.

## Phase 9 - Pseudo-3D-Politur (abgenommen)

Fertig und verifiziert (Screenshot phase9-ysort.png; "Vorher" sind die
Phase-5-Screenshots):
- Y-Sortierung ALLER Entities und stehenden Objekte: Bäume, Felsen,
  Grabsteine, Brunnen, Zäune, Regale, Altäre, Schreine, Erzadern,
  Streckbank, Käfige sind jetzt vom Boden getrennte, transparente
  Sprites mit eigenem Schlagschatten - der Spieler verschwindet sichtbar
  hinter Baumkronen (im Screenshot oben rechts), Gebäudefassaden
  verdecken ihn weiterhin korrekt.
- Der Brunnen hat ein Dachgestell bekommen (mehr Tiefe), gefällte Bäume/
  abgebaute Adern räumen ihr Objekt-Sprite korrekt weg.
- Blut & Überreste: gefallene Gegner hinterlassen Flecken (Skelette
  Knochen), max. 90 je Areal, über die Einstellungen abschaltbar,
  beim Gebietswechsel geleert (Referenz-Verhalten).
- Schritt-Sounds nach Untergrund (Gras im Dorf/Wald, Stein in der
  Krypta), leise, an den Gehzyklus gekoppelt.
- Bereits in früheren Phasen poliert und hier nachgeprüft: weiche
  Schatten unter allen Figuren, Krypta-Licht mit Fackelflackern,
  Nebelschwaden + Abendtönung im Dorf, Parade-Funken, Element-Schwünge
  gesockelter Waffen, Rollen-Staub, Lichtsäulen über Drops.

Offen:
- Sprites bleiben bewusst Fallback-Qualität - das eigentliche
  Grafik-Upgrade ist Phase 11 (optional) bzw. die Bilder des Autors.

## Phase 10 - Menüs, Speichern, Touch (abgenommen)

Fertig und verifiziert:
- Hauptmenü mit Titelbild (Hot-Swap, sonst Kirche-im-Nebel-Vektorszene),
  NEUES SPIEL / LADEN / EINSTELLUNGEN seit Phase 0; LADEN öffnet jetzt
  eine Slot-Auswahl (Autosave + Platz 1-3) mit Stufe/Tag/Zeitstempel
  (Screenshot phase10-laden.png).
- Speichern: 3 manuelle Slots über das Pausemenü (ESC/P), Autosave bei
  jedem Gebietswechsel und beim Schlafen. SPIELSTAND-ROUNDTRIP IM BROWSER
  VERIFIZIERT: Gold/Stufe/Schlüssel/Material/verbesserte Hellebarde im
  Inventar/Aufbaustufe/Tag/bepflanztes Beet - alles exakt zurückgelesen
  nach komplettem Seiten-Neuladen. Dazu 4 Vitest-Roundtrip-Tests.
- Pausemenü: WEITER / SPEICHERN 1-3 / EINSTELLUNGEN (pausiert die Welt,
  kehrt zurück) / HAUPTMENÜ (mit Autosave).
- Einstellungen komplett aus der Referenz + Erweiterungen: getrennte
  Lautstärken, Helligkeit, Wackeln, Schadenszahlen, Blut, freie
  Tastenbelegung (mit Konflikt-Tausch), Linkshänder-Modus; jetzt
  zweispaltig, nichts läuft mehr aus dem Bild (phase10-einstellungen.png).
- Touch-Steuerung: virtueller Joystick (linke Bildhälfte, Linkshänder-
  Modus spiegelt), Angriff mit Auto-Aim auf den nächsten Gegner, schwerer
  Hieb, Block (halten), Rolle, Trank, Inventar, kontextuelle E-Taste nur
  bei Interaktionszielen. MIT EMULIERTEM TOUCH-GERÄT VERIFIZIERT:
  Joystick bewegte den Spieler 211px, Angriffsknopf löste die Kombo aus
  (phase10-touch.png). Implementiert, aber NICHT auf echtem Gerät
  getestet - bitte einmal am Handy prüfen.

## Phase 11 - Grafik-Upgrade mit echten Assets (VORBEREITET, wartet auf Pakete)

HARTER STOPP-GRUND beim eigentlichen Upgrade: assets/packs/ ist leer -
Schritt 2 der Anleitung ("ZIPs entpacken nach assets/packs/") ist noch
offen, und itch.io ist aus dieser Arbeitsumgebung gesperrt (403,
Netzwerk-Richtlinie). Ich kann und darf die Pakete nicht selbst holen
(Lizenzprüfung liegt laut Anleitung beim Autor). NICHTS wurde als gelöst
ausgegeben - das Spiel läuft weiter vollständig auf den gekennzeichneten
Fallbacks.

Was fertig und VERIFIZIERT ist (die komplette Pipeline):
- scripts/packs-inventar.mjs: scannt assets/packs/, liest PNG-Maße, rät
  Kachelgrößen, schreibt PACKS-INVENTAR.md mit Zuordnungs-Stand und
  Lückenbericht (21 Figuren, 32 Tiles offen) samt itch.io-Suchvorschlägen.
- src/data/gfx-mapping.json: verbindet Spielbegriffe mit Paket-Dateien
  (Figuren mit Richtungs-Reihen/Frames, Tiles mit Sheet-Koordinaten,
  Skalierungsfaktor 16px->32px). Beispielblock liegt in der Datei.
- src/gfx/PackLoader.ts: lädt gemappte Sheets beim Boot, setzt sie
  pixel-scharf hochskaliert in die bestehende Hot-Swap-Rangfolge ein
  (Figuren als Atlas mit Gehrichtungen, fehlende Richtungen/Frames werden
  abgeleitet). Die Spiellogik bleibt unberührt.
- IM BROWSER BEWIESEN mit einem synthetischen Testpaket: gemapptes
  Skelett erschien mit Pack-Grafik in der Arena, gemapptes Gras-Tile
  ersetzte alle Grasflächen im Dorf (Screenshots
  phase11-pipeline-arena/-dorf.png). Testpaket danach entfernt, Mapping
  geleert.

Nächster Schritt (dein Part, 15-30 Minuten): Pakete laut Anleitung auf
itch.io laden (Lizenz prüfen!), nach assets/packs/<name>/ entpacken,
committen/pushen - dann übernehme ich Inventur, Zuordnung aller 21
Figuren und 32 Tiles, Konsistenz-Pass und die Screenshot-Tour.

## Hinweis zur Verifikations-Umgebung

Playwrights eigener Browser-Download ist in dieser Umgebung gesperrt;
Screenshots laufen über ein npm-Chromium (@sparticuz/chromium). Touch auf
echtem Gerät kann hier nicht geprüft werden - wird je Phase vermerkt.

## Feedback-Runde 1 (Spieltest des Autors) - umgesetzt

Bugs/Korrekturen:
- Sturmangriff (T) klemmt nicht mehr in Wänden (eckgeprüfte Bewegung).
- Grammatik: Präfixe deklinieren nach Genus ("Eisernes Langschwert",
  "Geweihtes Kettenhemd", "Grimmige Klinge") - per Test über 400 Würfe
  abgesichert. Damit ist OFFENE-FRAGEN Punkt 6 entschieden.
- Treppen/Kryptaeingang nur noch per E (kein versehentliches Drüberlaufen).
- Speichern zeigt Slot-Belegung im Pausemenü + sichtbare Bestätigung.

UI-Überarbeitung:
- Charakter + Inventar in EINEM Fenster (I oder C), Inventar sortiert
  (Angelegtes zuerst), mit Maus-Rad blätterbar, Bildlaufleiste, Typ-Icons
  und Typ/Wert-Zeile je Eintrag; Tooltip zeigt beim Anlegen die
  Differenzen farbig (+grün/-rot) über alle Werte. Auch Händler-Listen
  blättern jetzt; Verkaufen gibt es bei ALLEN Händlern.
- Neues HUD: Lebens-/Mana-Orbs mit Verlauf (wie HTML-Referenz), Q/F-
  Trankanzeige, Zauber-/Fähigkeitsleiste 1-6 + R/T mit Symbolen,
  Abklingzeit-Verdunkelung, Sperr-Anzeige und Hover-Tooltips.
- Aufgabenliste im Charakterfenster (was als Nächstes zu tun ist, plus
  Kurzanleitung Holz/Stein/Schmied/Brauen).

Kampf/KI ("alles langweilig"):
- Gegner umzingeln jetzt: jeder nähert sich aus eigenem Flankenwinkel,
  umkreist den Spieler in der Erholzeit; Skelette/Wölfe/Schatten weichen
  nach dem Schlag zurück.
- Endboss deutlich verschärft: 520 statt 340 Basis-Leben, schneller,
  dichterer Angriffstakt, größere Beschwörungswellen, 7er-Fächer, NEU:
  Ansturm quer durch den Raum mit Ansage.
- Miniboss je Krypta-Ebene: Der Gruftvogt / Knochenwächter Ottokar /
  Der Kultmeister - groß, benannt, garantiert Edelstein + bessere Beute.
- Neues Spiel+: nach dem Ende erwacht die Krypta zäher (+3 Ebenenstufen),
  im Grab wartet DER SCHATTENFÜRST statt des Tempelritters; nach dem Sieg
  führt ein Portal zurück nach Ravensmoor.

Komfort/Inhalte:
- Pfeile sind unendlich (Wunsch), Pfeil-Angebote/Drops entfernt.
- Zauberstäbe als neue Waffenklasse (Knorriger Stab, Kristallstab):
  manafreies Arkangeschoss, zählt zur Zauberei-Schule, verstärkt Zauber.
- Maustasten-Schnellbelegung: Mitte = Feuerball, Daumentaste 1 = Heiltrank,
  Daumentaste 2 = Heilung (freie Belegung folgt, siehe TODO).
- Schildschlag: Linksklick im Block = gedeckter Schlag (80% Schaden).
- Atmosphäre: dichtere Nebelschwaden, kühler Grundton + kräftige Vignette,
  Dunkelwald mit tiefem Grünstich.

Bewusst offen (siehe TODO.md): verschiebbare Fenster, Buch-Pergament,
freie Maustasten-Belegung, Rollen-Schnellslot. Die Figurengrafik bleibt
Fallback-Qualität, bis die itch.io-Pakete in assets/packs/ liegen - genau
dafür steht die Phase-11-Pipeline bereit.

## Feedback-Runde 2 - umgesetzt
- BUG: Einfrieren nach Pause->Hauptmenü->Laden behoben (Phaser nutzt die
  Szenen-Instanz wieder; alle Felder werden jetzt sauber zurückgesetzt).
  Im Browser verifiziert: nach genau diesem Pfad ist das Spiel beweglich.
- BUG: UI hinter Gebäuden/Dächern - komplette Tiefen-Bänder eingeführt
  (Welt < Effekte < Licht < HUD < Fenster). Dialoge, Orbs, Tooltips liegen
  jetzt immer oben.
- Weiße Nebelballen entfernt (Tönung+Vignette bleiben).
- Minimap deckt nur noch Einsehbares auf (Sichtlinien-Prüfung); in der
  Krypta sind Gegner ohne Sichtlinie unsichtbar (kein Wallhack mehr).
- Inventar: Angelegtes nur noch links im Charakter (Slot-Klick legt ab),
  Filter-Reiter (Alle/Waffen/Rüstung/Ringe/Sonstiges), beste Items oben
  (Seltenheit, dann Wert). Sockel zeigen Bonus ("◆ Schattenperle (+5
  Schatten)"), Steine sind austauschbar (alter kommt zurück).
- Schild: blockt gewöhnliche Gegner KOMPLETT, Elite/Champion/Boss drücken
  30% durch; gedeckter Schlag aus dem Block bestand schon.
- Spieler-Tempo-Regler in den Einstellungen (70-110%, Standard 90) - dein
  Sweetspot-Regler.
- KI: Gegner weichen bei Treffern zurück (flinke Typen 70%), Champions
  deutlich stärker (x2,6 Leben, +35% Schaden, schneller).
- Schriftrolle per Taste 7 (erste im Gepäck), Cooldown-SEKUNDEN auf den
  Leisten-Slots, Käfige aufbrechbar (Beute oder böse Überraschung),
  Bücherregale mit größerer Reichweite + Fundchance (Münzen/Rolle),
  Zauberstäbe wieder aus den Drops, Landherr reitet nach dem Auftrag davon.
- Spielerportrait: Bild als assets/portraits/spieler.png ablegen (Hot-Swap).

## Feedback-Runde 3 - umgesetzt (Nachtrag)
Bäume überall hackbar (kachelbasiert statt Listen), Bogen mit Spannzeit
(0,5s Nachladen statt Dauerfeuer), Dungeon-Tempo eigener Faktor (65%),
Rollen 5x nutzbar, zweiter Miniboss je Ebene, Loot-Ruhe nach dem Bosskampf
(Beschworene zerfallen), Maus-Slots M3/M4/M5 in der Leiste sichtbar.

## Feedback-Runde 4 - umgesetzt (Nachtrag)
Krypta-Ebenen 4 (Das Verlies) und 5 (Die Lavahöhle) vor dem Bossraum,
Nebenräume ab Ebene 2 (Sackgassen mit Truhe/Erz), Boss-Phase 3 ab 25%
Leben (Beschwörung, Tempo, Sturmangriff), Maus-Slots frei belegbar
(Rechtsklick auf den Slot wechselt die Aktion), Entwicklungskasten auf F10
(Balancing-Regler + BERICHT KOPIEREN), Nebel des Krieges im Dunkelwald
(abschaltbar in den Einstellungen).

## Feedback-Runde 5 - umgesetzt
Alles im Browser durchgespielt und verifiziert (Bossraum-Sequenz komplett):
- Leibwache vor dem Boss: "Bruder Aldric, der Grabwächter" + 2 elite
  Grabschatten machen zuerst Rambazamba. Fällt Aldric, bebt der Raum
  ("Wer wagt es, meinen Wächter zu fällen?") und der Tempelritter
  erscheint. Im NG+ ist es der Schattenfürst (zäher, härter).
  EHRLICHE LÜCKE: Es ist derselbe Raum, kein Raumwechsel - der echte
  Eskalations-Nebenraum steht in TODO.md.
- Loot-Ruhe nach dem Ende: Wer nach der Relikt-Wahl WEITERSPIELEN wählt,
  bleibt im Bossraum und kann in Ruhe einsammeln (kein Zwangs-Teleport).
- Stadtportal: Taste 8 (oder als Maus-Aktion '⌂' belegbar) öffnet nach dem
  Boss-Sieg jederzeit den Weg nach Ravensmoor; vorher verweigert es den
  Dienst mit Meldung. Verifiziert: vor dem Sieg blockiert, danach Dorf.
- Boss-Einzelloot: Harnisch des Kreuzritters und Ring des ewigen Wächters
  fallen zusätzlich zur Templerklinge.
- Tod im Bossraum: Layout und aufgedeckte Minimap aller Ebenen bleiben
  bestehen - nur die Gegner kehren zurück. Kein neues Auswürfeln mehr.
- Titelbild zeigt jetzt "Stand: Feedback-Runde 5".
Stand: tsc fehlerfrei, 47/47 Tests grün, Boss-Sequenz im Browser geprüft.

## Feedback-Runde 6 - umgesetzt
Alles mit tsc + 48 Tests grün und im Browser geprüft (Screenshots gemacht):
- Maustasten KOMPLETT frei belegbar: auch links (M1) und rechts (M2) sind
  jetzt Slots in der Leiste. Rechtsklick auf einen M-Slot wechselt die
  Aktion - Feuerball auf rechte Maustaste geht jetzt. Standard bleibt
  links=Angriff, rechts=Block; beides ist als Aktion wieder zuweisbar.
- Händler-Ausbau: Heinrich (8 Angebote), Magdalena (+Ring, +Edelstein,
  +Kettenblitz-Rolle), Schmied (+Waffen/Rüstung Tiefe 3, +Eisen), Bauern
  (+Honig, +Eintopf). Verkaufen hat jetzt Filter-Reiter wie das Inventar
  (Alle/Waffen/Rüstung/Ringe/Steine).
- Elite-Affixe: neu "Feurig" (Treffer hinterlassen Brandflächen - nicht
  stehenbleiben!) und "Teilend" (zerfällt beim Tod in zwei kleine
  Abbilder), zusätzlich zu Schnell/Vampirisch. Champions würfeln ihren
  Affix mit - jeder Miniboss-Kampf liest sich anders.
- Verfluchte Truhen (30%): violett markiert und angekündigt, bessere
  Beute, aber 55% Hinterhalt. Geprüft: Markierung, Loot, Schatten kommen.
- Tägliches Kopfgeld: Anschlagbrett auf dem Marktplatz, jeden Spieltag
  ein neuer Steckbrief ("Vorsteher auf Ebene X"), Auszahlung sofort beim
  Kill. Geprüft: 225 Gold + 2 Eisen für Ebene 5 kamen an.
- Endlose Tiefe: nach dem Boss-Sieg bricht hinter dem Grab ein Abstieg
  auf - die Krypta geht ab Ebene 6 endlos weiter (Themen wiederholen
  sich, Gegner skalieren, mehr Elites). Geprüft bis Tiefe 7.
- Sammelalbum auf Taste B: Monsterkunde (??? bis zum ersten Kill),
  besiegte Vorsteher, epische Funde, gelesene Notizen - alles im
  Spielstand.
- Grafik-Politur ohne Assets: dunkle Umrisse um ALLE Figuren (heben sich
  endlich vom Boden ab), Armschwung beim Laufen, mehr Schattierung
  (Gürtel, Schuhe, Wangen, Glanzkanten), Grasbüschel und Sprenkel,
  Plattenfugen + Risse in der Krypta, Mauerwerk an Wandstirnen,
  Wasser-Glitzer, vollere Baumkronen mit Lichtballen.
Stand: 48/48 Tests grün, Version auf dem Titel: Feedback-Runde 6.

## Feedback-Runde 7 - umgesetzt (Einfälle + Palisade)
Alles mit tsc + 49 Tests grün und im Browser durchgespielt:
- Einfälle: Nach dem Boss-Sieg greifen abends Monster-Trupps Ravensmoor
  an (Skelette, Pestopfer, Wölfe, Stärke wie Krypta-Ebene 3, Trupp wächst
  mit den Spieltagen, frühestens jeden 2. Tag). Wer den letzten Angreifer
  fällt, bekommt Gold + Holz von den Dörflern. Geprüft: Einfall kam,
  75 Gold + 2 Holz kamen an. Wer das Dorf verlässt, verliert die
  Belohnung (Einfall verpufft).
- Palisade: Bauprojekt beim Schmied (Menüpunkt "Stadtmauer"), 120 Gold +
  30 Holz + 10 Stein, steht über Nacht. Geschlossener Pfahlring um das
  ganze Dorf, NICHT zerstörbar durch normale Monster. Mit Mauer kommen
  Einfälle nur noch durch die zwei Tore der Salzstraße (West/Ost) -
  geprüft: Spawns lagen nur an den Toren. Test sichert ab, dass der Ring
  geschlossen ist und die Tore offen bleiben.
- Kein Holz-Grind: Bäume geben 2-4 Holz und wachsen nach einem Tag nach;
  zusätzlich verkauft der Schmied Holz (6 Gold). 30 Holz = ~10 Bäume
  oder 180 Gold.
- Ehrlich offen: Die Dörfler kämpfen noch nicht aktiv mit und können
  nicht verletzt werden - die Trupps jagen den Spieler. Boss-Monster,
  die alle 7 Tage die Mauer beschädigen: notiert für die nächste Stufe.
Stand: 49/49 Tests grün, Version auf dem Titel: Feedback-Runde 7.

## Feedback-Runde 8 - umgesetzt (Tore, Uhr, Nachtruhe, Friedhof)
Alles mit tsc + 49 Tests grün und im Browser durchgespielt:
- Stadttore schließbar: West- und Osttor einzeln per E öffnen/schließen
  (massives Bohlentor im Torbogen). Beide zu = der Einfall fällt aus:
  "Trommeln im Dunkelwald - doch die Tore sind zu. Ravensmoor atmet
  auf." Nur ein Tor offen = die Welle kommt genau dort. Geprüft: Tore
  zu -> kein Einfall; Westtor auf -> 5 Angreifer nur am Westtor.
- Ausgleich dafür: die Palisade braucht jetzt 3 Nächte Bauzeit (der
  Schmied meldet den Fortschritt, alte Spielstände laufen weiter).
- Uhr: die HUD-Zeile zeigt jetzt den Sonnen-/Mondstand (☀ Morgen /
  Mittag / Abend, ☾ Nacht) neben dem Tag. Ein Tag = 10 Minuten
  Echtzeit, läuft nur über der Erde - in der Krypta steht die Zeit
  still (steht auch so in der Anzeige).
- Nachtruhe: Nachts verschwinden die Dorfbewohner in ihre Häuser und
  sind nicht ansprechbar. Bricht ein Einfall los, stehen alle sofort
  wieder auf der Straße. Geprüft: nachts unsichtbar, beim Einfall da.
- Auferstehung auf dem Friedhof: Wer fällt, erwacht zwischen den
  Gräbern neben der Kirche - fahles Licht, Erwachens-Text ("Du bist
  nicht allein."). Geprüft: Tod -> Knopf -> Friedhof, volle Werte.
- EHRLICH OFFEN: Häuser sind noch nicht begehbar (Innenräume sind eine
  eigene Phase, in TODO.md) - die Bewohner verschwinden nachts "in"
  ihre Häuser, statt sichtbar hineinzugehen.
Stand: 49/49 Tests grün, Version auf dem Titel: Feedback-Runde 8.

## Feedback-Runde 9 - umgesetzt (Begehbare Häuser + lebendiges Dorf)
Alles mit tsc + 50 Tests grün und im Browser durchgespielt:
- 11 begehbare Innenräume: Taverne (Schankraum mit Tresen, Tischen,
  Kamin), Gemeindehaus, Backhaus, Zimmerei, Mühle, Schmiede, Magdalenas
  Hütte und vier Wohnhäuser in der neuen Wohngasse. Haustür per E
  betreten, drinnen warmes Holz, Teppiche, Kaminfeuer mit Licht.
- Neue Gebäude am Markt (wie im Dorf des 14. Jahrhunderts: Läden am
  Platz): Gemeindehaus (größtes Haus, Zuflucht bei Einfällen), Backhaus,
  Zimmerei mit Holzlager, dazu die Wohngasse mit vier Familienhäusern.
- 13 neue Dorfbewohner mit Berufen und Tagesablauf: Schulze Bertram,
  Bäcker Matthes mit Elsbeth und Lisbeth, Zimmermann Jakob mit Margret
  und Hannes, Schneider Caspar, Witwe Käthe mit Hirtenjunge Lenz und
  Magd Trine, Wäscherin Ida, Alte Mutter Hanne, Wirtin Mathilde. Männer
  tagsüber bei der Arbeit (Mühle, Hof, Werkstatt), abends daheim bei
  Frau und Kind - geprüft: mittags nur Margret in der Stube, abends
  sitzt die ganze Familie da. Kinder spielen tagsüber am Marktbrunnen.
- Jede Figur hat eigene Dialogzeilen (Alltag, Krieg, Aberglaube) und
  einen eigenen Figuren-Namen - spätere Sprite-Pakete ersetzen sie 1:1.
- Einfall-Verhalten: Nicht-Kämpfer fliehen ins Gemeindehaus (Meldung),
  nur die sechs wehrhaften Männer bleiben auf der Straße - geprüft.
- Neuer Test sichert ab: jede Haustür führt in eine echte Stube, Möbel
  stehen nie in Wänden oder vor der Tür.
Stand: 50/50 Tests grün, Version auf dem Titel: Feedback-Runde 9.

## Feedback-Runde 10 - umgesetzt (Die Dorfwirtschaft: 9 Zünfte)
Alles mit tsc + 51 Tests grün und im Browser durchgespielt:
- 9 neue Berufe mit Haus + Innenraum + Tagesablauf + Funktion:
  Bader Severin (Badehaus am Bach: BEHANDLUNG 25 Gold = volle Heilung),
  Küfer Urban (kauft Holz: Tagwerk 5 Holz = 40 Gold),
  Weberin Adelheid (Tuchrüstung + Verbände; Tagwerk 4 Wolle = 50 Gold),
  Gerber Lorenz (flussabwärts, kauft Felle: 3 Felle = 60 Gold;
  Wölfe lassen jetzt Felle fallen), Hebamme Walpurga (günstigste
  Heiltränke), Küster Benedikt (Dorfschule: UNTERRICHT 30 Gold = XP,
  Kinder sitzen vormittags in der Schule), Fischer Nepomuk (Fisch,
  Hütte am Ostufer), Imker Anselm (Honig + Met, Bienenkörbe), Schäfer
  Tobias (Schafweide mit 3 Schafen, verkauft Wolle und Käse).
- Wirtschaftskreislauf zum Mitspielen: Wolle beim Schäfer für 8 kaufen,
  bei der Weberin für 50/4 abliefern - der Held verdient als
  Zwischenhändler, "so bleibt das Geld im Dorf". Geprüft.
- Der Held darf arbeiten: Tagwerke (je 1x pro Tag), Unterricht,
  dazu wie bisher Holz hacken, Erz schürfen, Kräuter sammeln, Feld.
- Soziale Mittagsrunde: zwischen Vormittag und Abend gehen viele
  Bewohner nicht zur Arbeit, sondern zum Markt, zur Taverne oder zu
  Nachbarn (Küfer läuft mittags zur Taverne - im Browser beobachtet).
- Alle ansprechbar: neuer Test stellt sicher, dass KEIN Dorf-NPC stumm
  ist (Sonderdialog oder VOLK-Zeilen), alle Zünfte im Dorf stehen und
  Schafe auf der Weide sind.
- EHRLICH: Der Warenfluss zwischen den NPCs selbst (Mehl->Bäcker usw.)
  ist erzählt (Dialoge, Wege), nicht simuliert - eine echte
  Güter-Simulation wäre der nächste Ausbau.
Stand: 51/51 Tests grün, Version auf dem Titel: Feedback-Runde 10.

## Feedback-Runde 11 - umgesetzt (Skills, Schildträger, Spenden, Dev-Werkzeuge)
Alles mit tsc + 51 Tests grün und im Browser durchgespielt:
- Feuerregen (Taste 9, Zauberei 8): sechs Feuerschläge regnen auf den
  Mauszeiger-Zielort - Warnringe, Einschläge, Flächenschaden. Stehende
  Ziele werden zerlegt, flinke können entkommen. Geprüft (46 -> 5 Leben).
- Aderlass (Taste 0, Zauberei 2): 15 Leben -> 25 Mana. Lebenstausch
  (Zauberei 4): 30 Mana -> 20 Leben. Beide auch auf Maustasten belegbar.
- Schildträger: ein Viertel der Skelette trägt jetzt Schilde und blockt
  Treffer von vorn (GEBLOCKT, nur 30% Schaden, kein Zurückweichen) -
  geprüft: 3 von 7 Fronttreffern geblockt. Flankieren lohnt sich.
- Spenden: Opferstock beim Pater (25 Gold -> Segen), Dorfkasse beim
  Schulzen (50 Gold je Spende; ab 100/250/500 senken die Händler die
  Preise um 5/10/15%). Geprüft: Kasse 100 -> Rabatt 5% aktiv.
- Entwicklungskasten: neuer Knopf UI VERSCHIEBEN - Aktionsleiste,
  Dialograhmen und Meldungs-Log per Griff ziehen, FIXIEREN speichert
  die Versätze dauerhaft und schreibt sie in den kopierbaren Bericht.
  So kannst du Layouts selbst testen und mir die Werte schicken.
- Texte vorlesen: neuer Schalter in den Einstellungen (Sprachausgabe
  de-DE über den Browser). Implementiert, aber im Container ohne
  Lautsprecher nicht angehört - bitte einmal am PC testen.
- EHRLICH: Häuser verschieben geht (noch) nicht - das Dorf ist von Hand
  gebaut (Koordinaten im Code). Ein Karten-Editor wäre eine eigene
  Phase; die Bewohner-Anker würden dann am Haus hängen und mitwandern.
Stand: 51/51 Tests grün, Version auf dem Titel: Feedback-Runde 11.

## Feedback-Runde 20 - umgesetzt (Sounds, Kampfgefühl, Chronik, getrennte Leisten)

- Sounds eingebaut: Pfeil-Swoosh (Bogen + Knochenschützen), Feuerball 1/2
  im Wechsel, Mitternachts-Stück nachts in der Stadt, Krypta-Schleife
  (ravenmoorloop_low) statt Grusel-Rotation. Menü-Musik startet jetzt,
  sobald der Browser Ton erlaubt (Autoplay-Sperre umgangen).
- Anfang: Wald auf 128 Kacheln verlängert (5 Lichtungen, 3 Wolfsrudel),
  Intro-Zeilen langsamer und am DIALOGRAHMEN-Griff verschiebbar, die
  Ankunfts-Erzählung in der Stadt blockiert nicht mehr (einblendende
  Zeilen statt Dialogfenster).
- Kampf: Gore-Tod (rot verfärbt, zerdrückt, Teile fliegen; Haken für
  tod_gore.mp3 gesetzt), Schützen schießen sichtbare Pfeile, Schildträger
  gehen periodisch in volle Deckung ("GEDECKT!"), flinke Gegner weichen
  Nahkampfhieben aus. Rote Augen für Pestopfer/Skelette/Schützen/Schatten.
- Chronik (Taste H): Tabs Ereignisse/Geschichte/Beute, sammelt Meldungen,
  Dialogseiten und aufgehobene Beute automatisch; folgt dem FENSTER-Griff.
- Leisten getrennt: Tastenleiste (1-6/9/0/R/T) und Maus-Leiste (M1-M5)
  mit eigenem Griff im UI-Modus. Belegung per DRAG & DROP von der
  Tastenleiste auf die Maus-Slots (geprüft: Kettenblitz auf M5 gezogen,
  Einstellung gespeichert); Rechtsklick-Liste bleibt für Trank/Blocken/
  Schriftrolle/Stadtportal.
- Verifiziert im Browser (Playwright): geteilte Leisten + Tooltip,
  Drag&Drop-Belegung, Chronik, Gore-Tod in der Krypta, Nacht-/Tag-
  Musikwechsel im Dorf. 51/51 Tests grün, tsc sauber.
- Offen/ehrlich: tod_gore.mp3 und musik_kirche.mp3 fehlen noch (Dateien
  vom Autor); Touch nicht auf echtem Gerät getestet.

## Feedback-Runde 21 - umgesetzt (Bosskampf-Räume, Sieg-Fenster, Zoom, Dev-Werkzeuge)

- Sieg-Fenster-Fehler GEFUNDEN und behoben: der WEITERSPIELEN-Knopf bekam
  seine Hitbox-Korrektur nie (fixUiScroll lief vor dem Hinzufügen) - im
  gescrollten Bossraum war er daher nicht klickbar. Im Browser verifiziert:
  Klick schließt das Fenster, Neues Spiel+ startet.
- Stadtmusik im Dungeon behoben: musik_nacht fehlte in der Wechselliste -
  nach dem Laden lief die Nacht-Stadtmusik bis in die Krypta. Verifiziert:
  Dorf nachts musik_nacht -> Krypta musik_krypta.
- Bosskampf NEU, ohne Beamen: ein Grab mit drei Kammern und Gittertoren.
  Bei 66%/33% weicht der Ritter nach Norden, das Tor birst, eine Welle
  stürmt heraus - er stellt sich erst, wenn man ihm folgt. Komplett im
  Browser durchgespielt (beide Rückzüge, Wellen, Sieg, Abstieg).
- Nebenbei gefunden: in NG+ konnte sich der Schattenfürst nie erheben
  (Prüfung verlangte !bossDead). Behoben.
- Bildgröße-Regler in den Einstellungen (100-200%, wirkt sofort): das Spiel
  rückt näher ans Geschehen, UI wächst mit. Ehrlich: Hochskalieren ist
  etwas pixeliger; die scharfe HD-Variante steht in TODO.md.
- F10 erweitert: Beute-Menge-Regler (Drops x0-x3), ZAUBER FREISCHALTEN
  (alle Sperren aus, zum Testen), ZUM BOSS / IN DIE STADT (Dev-Sprünge,
  verifiziert). 52/52 Tests grün (neuer Test: Tore versiegeln die
  hinteren Kammern, nach dem Sieg alles erreichbar), tsc sauber.

## Feedback-Runde 22 - umgesetzt (Stadt-Baukasten, Reichweiten, drei Fixes)

- Musik-Schicht am Anfang behoben: ein liegengebliebener Ton-Freigabe-
  Lauscher startete die Menü-Musik beim ersten Klick IM SPIEL erneut.
  Verifiziert: 0 Menü-Instanzen nach Spielstart.
- Haus-Skalierung repariert: das Mausrad lauscht jetzt an der Szene und
  findet das Haus unter dem Zeiger selbst. Verifiziert (Skala gespeichert).
- Neue F10-Regler: Held Hieb-Reichweite x, Held Schwung-Breite x, Gegner
  Hieb-Reichweite x. Befund bestätigt: Gegner-Hiebe trugen nur ~18 Pixel.
- STADT-BAUKASTEN (V1, F10 -> BAUKASTEN, nur in Ravensmoor): Tabs
  BODEN/OBJEKT/TIERE/HAUS. Boden malen per Ziehen (Gras, Weg, Acker,
  Wasser, Steinboden, Brandstelle), Objekte setzen (Baum, Zaun, Palisade,
  Brunnen, Grabstein, Fels, Fackel, beschriftbares Schild), Tiere setzen,
  RADIERER baut zurück. Haus-Tab: Justieren + eigenes BILD AUF HAUS LADEN
  (Datei-Dialog). Alles überlebt im Browser-Speicher; STADTPLAN KOPIEREN
  exportiert das JSON zur festen Übernahme.
- Browser-verifiziert: 8 Wasser-Kacheln gemalt und nach Neuladen wieder
  da; Schild mit Hover-Text, Fackel, Huhn gesetzt; Radierer entfernt;
  Haus-Bild-Upload angewendet (hausupload_gemeindehaus). 57/57 Tests
  grün (5 neue für den Kachel-Plan), tsc sauber.
- Grenze (ehrlich): Häuser KOMPLETT versetzen (Kollision, Tür, Bewohner)
  kann V1 nicht. Plan: Stadt bauen, STADTPLAN KOPIEREN, mir schicken -
  dann versetze ich Grundflächen, ordne Bewohner zu und stelle die
  Tagesabläufe auf die neue Stadt um.

## Feedback-Runde 23 - umgesetzt (drei Fixes + verbindliche Prüf-Checkliste)

- Kirchenaltar-Falle: Rückkehr aus der Krypta landet jetzt VOR dem Altar
  (Test abgesichert); zusätzlich schiebt ein Sicherheitsnetz jeden Spawn
  aus festen Kacheln auf die nächste freie - die ganze Fehlerklasse
  "stecke fest" ist damit abgedeckt. Browser-verifiziert.
- Inventar-/Charakterfenster ist DIREKT greifbar: obere Leiste ziehen,
  Position bleibt dauerhaft (gilt auch für Handel/Chronik). Hin- und
  Rückweg im Browser verifiziert.
- Bildgröße: nur noch im Hauptmenü änderbar (im Spiel Hinweis statt
  Regler) - das "Zerschossene" kam vom Live-Ändern in fertige Szenen.
  Hochskalieren jetzt mit harten Pixeln statt matschiger Schrift.
  Verifiziert: 120% exakt unverzerrt (1,200x1,200), Rückweg sauber.
- Arbeitskodex erweitert (CLAUDE.md Abschnitt 9): Reproduzieren vor dem
  Fixen, Rückweg-Tests, Übergänge in beide Richtungen, Phaser-Fallen-
  Liste. Die Checkliste hat sich sofort bezahlt gemacht: die erste
  Fassung des Fenster-Griffs übersteuerte - im eigenen Browser-Test
  gefunden und behoben, bevor es dich erreicht hat.
- 58/58 Tests grün (neu: Kirchenschiff-Rückkehr), tsc sauber.

## Feedback-Runde 24 - umgesetzt (Baukasten-Ausbau: eigene Bilder überall)

- Unsichtbare Wände behoben: Grundfläche, Tür und Hausname wandern jetzt
  kachelgenau mit dem verschobenen Haus; beim Beenden des Justier-Modus
  baut sich das Dorf sofort frisch. Verifiziert: alte Fläche begehbar,
  Tür sitzt am neuen Ort, Bild deckungsgleich mit der Kollision.
- Eigene Bilder für Werkzeuge: in BODEN/OBJEKT "EIGENES BILD fürs
  Werkzeug laden" - mit automatischer Freistellung (Karo/Weiß weg) und
  Herunterrechnen auf Kachelgröße. Gilt sofort überall, überlebt das
  Neuladen. Verifiziert mit einem Testbaum auf eingebackenem Schachbrett.
- Haus-Upload stellt den Hintergrund jetzt ebenfalls automatisch frei.
- Haus-Animationen vorbereitet und verifiziert: hausN_anim1..4.png
  (Mühlrad, Feuer; 0,4s-Takt) und hausN_nacht.png (Fensterlicht, blendet
  abends ein). Spezifikation steht in assets/ANLEITUNG.md.
- Pferde sind im Spiel (Bauernhof-Gatter + TIERE-Tab im Baukasten).
- STADTPLAN KOPIEREN exportiert jetzt auch Haus-Positionen/-Größen und
  die Liste eigener Bilder - die Grundlage, auf der ich Bewohner und
  Tagesabläufe der neuen Stadt zuordne.
- 59/59 Tests grün (neu: verschiebeHaus), tsc sauber.

## Feedback-Runde 25 - umgesetzt (Baukasten-Generalüberholung)

- Gemalte Objekte sind jetzt identisch mit gebauten: groß, mit Boden
  darunter, hinter dem Helden sortiert. Ursache war ein halber
  Render-Sonderweg beim Live-Malen - jetzt gibt es genau EINEN Pfad
  (zeichneKachel) für Aufbau und Baukasten. Browser-verifiziert.
- Varianten wählbar: jedes Werkzeug blättert durch "Mischung, 1..n" mit
  Mini-Vorschau; die Wahl gilt pro gemalter Kachel und wird gespeichert.
- Größe selbst einstellbar: Regler je Objektart (0,5x-3x) im OBJEKT-Tab,
  wirkt sofort auf ALLE Objekte dieser Art (verifiziert an 566 Bäumen).
- Upload-Willkür behoben: Texturen teilten sich eine Quelle und
  zerschossen sich beim Ersetzen gegenseitig (jetzt Kopie je Schlüssel);
  außerdem ersetzt der Upload jetzt GEZIELT die gewählte Variante -
  verifiziert: Variante 2 neu, Variante 1 unangetastet, nach Neuladen
  beides korrekt.
- Pferd ist ein ganzes Pferd: die Vierbeiner-Zeichnung zentriert sich
  selbst (die Kuh war auch schon angeschnitten), große Tiere haben vier
  Beine. Pixelgenau geprüft: keine belegten Randspalten mehr.
- 60/60 Tests grün, tsc sauber.

## Feedback-Runde 26 - umgesetzt (Leisten wie WoW, Dialog-Wurzelbug, Krypta-Regel)

- ALLE 15 Slots frei belegbar: Rechtsklick = Aktionsliste, Ziehen = zwei
  Slots tauschen; Angriff/Blocken nur auf Maustasten (Halten-Logik).
  End-to-End verifiziert.
- Wurzel des Upload-Spuks gefunden: der Datei-Dialog hing nie im DOM -
  Chrome öffnete ihn nur sporadisch und verlor Auswahlen (daher auch
  "Haus wird wieder altes Bild"). Behoben + verifiziert: Upload überlebt
  Justieren jetzt.
- Klicks auf Chronik-Tabs & Co. lösen keine Hiebe mehr aus (genereller
  UI-Treffer-Schutz für alle bildschirmfesten Elemente).
- Geleerte Krypta-Ebenen bleiben leer, bis der Held stirbt (Wunsch);
  Bossgrab ausgenommen. Verifiziert: 29 Gegner -> leer -> leer.
- Gegner spawnen nie mehr in Wänden/Altären (Ringsuche), Wolf ist wieder
  ein ganzer Wolf (pixel-verifiziert), Hieb-Animation zeigt exakt die
  eingestellte Reichweite, Musik-Regler wirkt sofort auf laufende Musik,
  Haus-Justiermodus beschriftet jedes Haus (Schmiede bleibt Schmiede),
  Mehrfach-Upload macht eigene Bilder zu Varianten (Gras/Weg mischen).
- 60/60 Tests grün, tsc sauber.

## Feedback-Runde 27 - umgesetzt (Schilde, scharfe Schrift, klügere Gegner)

- Schilde sind im Spiel: droppen als Beute, eigener Platz im Charakter-
  fenster, geben Rüstung. Blocken: voll nur MIT Schild; ohne = schwächere
  Waffenparade; Bogen/Stab blocken nicht (und werfen den Schild beim
  Anlegen ab). Alles getestet (4 neue Tests) und im Browser verifiziert.
- Schrift-Kopfschmerz behoben: das Bild wird nicht mehr hochgestreckt.
  Der Regler zoomt nur noch die Welt; Schrift und Leisten rendert eine
  zweite Kamera in voller Auflösung - gestochen scharf bei jedem Zoom.
  Wirkt jetzt sofort, auch mitten im Spiel. Verifiziert (130%: Klick
  trifft kachelgenau, Canvas nativ).
- Gegner-KI: Hindernisse werden umlaufen statt angerannt; Skelette und
  Pestopfer sammeln sich erst und stürmen gemeinsam; nach dem eigenen
  Schlag weichen Gegner schräg und KONTERN, wenn man nachsetzt -
  Schildträger stoßen zudem aus der ablaufenden Deckung zu.
- Neuer F10-Regler: Gegner-Schlagtempo. Bogen auf Mittelweg (schneller
  gespannt, etwas weniger Spitzenschaden).
- 64/64 Tests grün, tsc sauber.

## Feedback-Runde 28 - umgesetzt (Portal-Paar, Einfall-Timing, Tiefe, Komfort)

- Stadtportal neu: bleibendes Portal-Paar mit sichtbarem Wirbel - Tränke
  holen, durchschreiten, exakt an der alten Stelle weiterkämpfen.
  Verifiziert: Rundlauf punktgenau, Portal schließt bei Rückkehr.
- Der erste Einfall kommt jetzt SOFORT beim Heimkommen nach dem Boss-Sieg
  (verifiziert: 5 Angreifer am hellen Tag); Belagerung = jeder 3. Einfall
  statt "Kalendertag durch 7".
- Endlose Tiefe: ab Ebene 7 halbiertes Stärkewachstum - tief unten bleibt
  es hart, aber spielbar.
- Rundumschlag: halbe Abklingzeit, mehr Schaden. Edelsteine sortieren
  nach Kraft. Handel: "ALLES VERKAUFEN" je Reiter + Schilde-Reiter.
- 64/64 Tests grün, tsc sauber.

## Feedback-Runde 29 - umgesetzt (Chronik-Chat, Sicht, Boss-Ruhe, Komfort)

- Lebenskugel gerettet: Versätze fangen sich am Bildrand + Reset-Knopf.
- Bossgrab bleibt nach dem Sieg leer (wie die Ebenen) - kein sofortiger
  Wiedergänger mehr; der eigene Tod weckt das NG+-Grab.
- Ferne Fackeln decken keine Räume mehr auf (nur noch nahe am eigenen
  Sichtkreis).
- Chronik ist jetzt ein Chat-Fenster links unten: halbtransparent,
  neueste Einträge unten, frei zieh- und an der Ecke skalierbar
  (gespeichert). Verifiziert inkl. Skalieren.
- Inventar: 8 Reiter (u. a. Schilde, Steine, Rollen), breiter, alle
  Bonus-Werte grün. Splitter-Drop stark gesenkt, Streitkolben-Reichweite
  eingefangen, NEU: Cleverness-Regler im F10 (war angekündigt, fehlte).
- 64/64 Tests grün, tsc sauber.

## Feedback-Runde 30 - umgesetzt (zwei Abstürze, Clear-Regel, Farben, Dev)

- Absturz beim Malen (Wasser-Animation auf zerstörten Kacheln) und beim
  erneuten Haus-Bild-Hochladen (entfernte Textur am lebenden Haus)
  behoben; Datei-Dialog robuster (showPicker). Browser-verifiziert:
  malen + 2x hochladen ohne Absturz.
- Geräumte Ebenen bleiben jetzt wirklich leer: unsichtbare, nie
  ausgelöste Hinterhalte zählten fälschlich als lebende Gegner.
- Beute-Regler wirkt jetzt überall (auch Fässer und Miniboss-Garantien).
- Aktions-Icons sind farbig (Feuer orange, Frost blau, Heilung grün ...).
- F10: TAG/ABEND/NACHT setzen, NEBEL-Probe (hochaufgelöste Schwaden),
  Kasten verschieb- und skalierbar. Neue Kodex-Regel: alle Fenster
  müssen verschiebbar sein.
- 64/64 Tests grün, tsc sauber.

## Feedback-Runde 31 - umgesetzt (Stimmung, Licht, Sound, Tab-Fenster)

- Farbige Magie-Lichter in der Krypta (Schreine blau, Altäre violett,
  Blutbrunnen rot, pulsierend), Feuerball glüht mit hellem Kern,
  goldener Abend und Morgenblau im Freien, violetter Hauch in der
  Tiefe, dezente Vignette, Wasser mit Tiefenkante.
- Hammer/Streitkolben nutzen den gelieferten Aufprall-Klang; Schritt-
  Sound-Haken (gras/stein) eingebaut - Dateien folgen vom Autor;
  Münz-Klimpern: eigene muenzen-Datei ersetzt den Synth automatisch.
- Tab-Fenster: Charakter & Inventar, Sammelalbum und Statistik in einem
  Fenster (B = direkt zum Album). Browser-verifiziert inkl. Stimmung
  und farbiger Lichter. 64/64 Tests grün, tsc sauber.

## Feedback-Runde 32 - umgesetzt (Monster-Sounds, neuer Gegner)

- Todes-Sounds je Gegnertyp eingebaut: Pest, Skelett (mit/ohne Schild)
  und ein universeller Tod, der rotiert und auch für Boss und den neuen
  Gegner dient. Je 1-3 Varianten, sauberer Fallback.
- Begegnungs-Sounds: ein Gegner ruft beim ersten Erblicken - aber
  gedrosselt (9s Sperre, nur 35% Chance), damit es nicht nervt.
  Elite/Champions haben einen eigenen Miniboss-Ruf.
- NEUER Gegner "Lebender Toter": sieht aus wie ein Dorfbewohner mit
  roten Augen, spawnt in der Krypta und bei den Stadt-Einfällen.
  Browser-verifiziert (Sprite mit roten Augen, 5 Stück in der Gruft,
  Drossel lässt nur 1 von 30 Sofort-Rufen durch, Pest-Tod fehlerfrei).
- HINWEIS: pest_death4.mp3 und living_dead.mp3 kamen beschädigt (0 Byte)
  an und fehlen noch - bitte neu schicken. 64/64 Tests grün, tsc sauber.

## Feedback-Runde 33 - umgesetzt (Grafik-Richtung, Ausruestung sichtbar)

- Grafik-Weg festgelegt: HYBRID (KI-Optik vom Autor, Animation/Logik von
  mir, gezeichnete Figur als Rueckfall). Duesterer Stil in Slormancer-Liga,
  Held auf 64 px. Komplett dokumentiert in GRAFIK-RICHTUNG.md inklusive der
  Datei-Namen, mit denen KI-Bilder ins Spiel fallen.
- Ausruestung sieht man jetzt am Helden: vier Ruestungsstufen (Stoff, Leder,
  Kette, Platte) und die getragene Waffe in der Hand (inkl. neuem
  Zauberstab). Browser-verifiziert.
- Hot-Swap-Pipeline pro Stufe bewiesen: ein eingeschleustes Test-Bild wird
  vom geruesteten Helden sofort verwendet - deine KI-Pakete fallen also
  wirklich rein. 64/64 Tests gruen, tsc sauber.

## Feedback-Runde 34 - umgesetzt (Sound-Fix, Todes-Gore, Reit-Intro)

- Lautstaerke-Regler: jetzt ziehbarer Knopf mit grosser Greifflaeche -
  Musik (und alles andere) laesst sich jederzeit runterregeln. Der alte
  6px-Klickbalken war kaum zu treffen. Verifiziert.
- Todesanimation: ALLE Gegner zerfallen jetzt blutrot in langsam fallende
  Partikel, mit Lichtblitz und Blutnebel (extra Gore), passend zur Laenge
  der Todeslaute. Skelette zerfallen weiss (Knochenstaub). Verifiziert.
- Reit-Eroeffnung: der Held reitet zu Spielbeginn von selbst durch den
  Dunkelwald, waehrend epische Musik und der Prolog laufen - ein echter
  Vorspann. Per Klick ueberspringbar, endet sauber im Dorf. Verifiziert.
  64/64 Tests gruen, tsc sauber.

## Ebene 1 - Die kampffreie Angst-Ebene (Prolog, Briefing-Auftrag)

Drei wiederverwendbare Systeme zuerst gebaut und einzeln verifiziert, dann die
Raeume - genau in der vom Briefing geforderten Reihenfolge.

FERTIG und browser-verifiziert (tsc sauber, 71/71 Tests gruen):
- LightingManager (src/systems): winziger weicher Lichtkreis, fast totale
  Finsternis ringsum; Zusatzlichter, Puls, Resize-fest (RenderTexture neu
  statt setSize).
- ScareTrigger (src/systems): datengetriebene Schreck-Zonen (einmalig),
  mehrere Effekte je Trigger - sting/shake/flackern/Leiche/Silhouette/Ratte/
  Mauer/Tuer + Fallen (bodenbruch/truemmer, wenig Schaden). KEIN echter Kampf.
- BloodFlow (src/systems): EINE Blut-Ader-Komponente in fuenf Staerken
  (drip -> trickle -> stream -> river -> font), gleicher Look (tiefes Rot,
  leuchtend, zaehfluessig, Puls); Sog-Effekt (Fluestern + rote Vignette).
- Raum 1 "Die Kammer der Finsternis": tasten im Dunkeln, vier Kohlebecken
  entzuenden (Licht weitet sich, Schreck, Dunkel kriecht zurueck), Ausgang
  oeffnet wenn alle brennen. Ein harmloses Huschen, sonst nichts.
- Raum 2 "Die Schwelle": erste Bluttropfen (BloodFlow 'drip'), ins Nasse
  treten im Dunkeln, der Templer-Glimpse (2s, dann weg), verriegeltes Tor
  mit eingeritzter Warnung.
- Raum 3 "Der Blutstrom" (Gang vor der Boss-Arena): der leuchtende Strom
  (BloodFlow 'river') als Hindernis UND Hauptlichtquelle, Querung auf
  versunkenen Grabplatten (Blut unbegehbar = kampffrei), bleiche Haende aus
  dem Blut, Notiz des Pater Johannes (das Blut naehrt das Geschenk und haelt
  den Templer am Leben), der Templer klar am anderen Ufer.

OFFEN (mit dem Autor abzustimmen, in OFFENE-FRAGEN.md): Boss-Arena (BloodFlow
'font', Becken aus dem sich der Templer erhebt) - die beginnt den Kampf, gehoert
also zur Arena, nicht zur kampffreien Ebene; Einbettung in den Hauptspielfluss
(Reihenfolge, Uebergang Dorf->Ebene 1->Krypta, Tuer-Schalter zum Zurueck ins
Dorf); echte Audio-Assets (aktuell stille/prozedurale Fallback-Haken).

## Runde 52 - Quest-System, HUD-Alternativen, verschiebbare Fenster

VERIFIZIERT (Logik/Build): tsc fehlerfrei, 132 Tests grün (10 neue Quest-Logbuch-Tests),
Vite-Build ok.

FERTIG:
- Quest-Datenbank + Logbuch-Logik (datengetrieben, RPG/WoW-artig, aus den
  bestehenden Story-Flags abgeleitet - keine Story-Inhalte erfunden).
- Questlogbuch (AUFGABEN-Tab) hübsch als Karten: Kategorie-Akzent, Häkchen-Ziele,
  Belohnung, "VERFOLGEN"-Schalter. Verfolgte Quest erscheint automatisch
  (oberste Hauptquest) oder per Wahl.
- Quest-Verfolger auf dem Hauptbildschirm: halbtransparentes, frei verschiebbares
  Fenster mit aktuellem Ziel + Wohin-Hinweis. An/aus im F10-Kasten.
- Drei umschaltbare Leben/Mana-Anzeigen (Kugeln rot/blau, WoW-Balken,
  Kristall-Säulen), Umschalten im F10-Kasten, beide Anzeigen einzeln verschiebbar.
- Alle Fenster verschiebbar (Handel, Lager, Dialog, Figur-Editor zusätzlich zu
  Charakterfenster/Chronik/Dev-Kasten).

NICHT live verifiziert (Dev-Server bricht in dieser Umgebung beim Laden ab):
die tatsächliche Optik im Browser. Bitte prüfen: Quest-Verfolger-Aussehen und
Verschieben, die drei Leben/Mana-Stile durchschalten, das Verschieben von
Handel/Lager/Dialog.

## Runde 71 - Flüssigkeits-Shader (Wasser + Blut) aus fluss.html portiert

**Auftrag:** Den Fluss-Shader aus fluss.html als wiederverwendbaren Phaser-Shader-
Overlay portieren - Test für Wasser und Blut. Additiv, ohne Boden-Renderer-Umbau,
Kollision unangetastet.

**Fertig und verifiziert:**
- Neues Modul `src/world/fluessigkeitsShader.ts`: der Fragment-Shader 1:1 portiert
  (Simplex-Noise, Zwei-Phasen-Höhenfeld, Brechung, Fresnel, Glanz, Schaum),
  Maus-Interaktion raus. Zwei Paletten (Wasser blaugrün / Blut dunkelrot, zäh),
  zwei Presets, prozedurales Flussbett als Phaser-Canvas-Textur.
- `src/world/fluessigkeitsRegionen.ts`: zusammenhängende Wasser-/Blutflächen
  finden (Flood-Fill). 5 Unit-Tests (u. a.: Brücke teilt den Bach in zwei
  Regionen, damit das Quad die Brücke nicht zudeckt).
- WorldScene: nur additive Hooks (1 Aufruf + Cleanup + 1 Methode), `loadAreaObjects`/
  `zeichneKachel` unverändert. Die alten Wasser-Tile-Sprites der Region werden
  entfernt (kein Doppel-Render), `a.map` bleibt (Kollision/Geschoss-Durchflug
  unverändert - im Browser geprüft).
- Im Spiel gesehen: Wasser fließt als 2-Kachel-Bach senkrecht durch Ravensmoor;
  Blut als zwei Streifen im Bossraum-Gang, korrekt vom Krypta-Licht verdunkelt.
  Übergänge village->boss->village (echter goArea-Pfad) fehlerfrei. tsc grün,
  186 Tests grün.

**Standard:** Wasser AN, Blut AUS (Bossraum-BloodFlow bleibt unangetastet) -
beides per `FLUSS_SHADER` / `window.__fluss` (DEV) umschaltbar.

**Offen:** FPS nur im Software-Renderer (SwiftShader) gemessen - nicht
repräsentativ; auf echter GPU noch zu bestätigen. Bounding-Box je Fläche -> bei
nicht-rechteckigen Wasserläufen deckt das Quad etwas Land mit (für Bach/Blutstrom
exakt).

## Runde 72 - Neues Wasser + erste Oberwelt-Karte (START)
- Schritt 0-2: Referenzen abgelegt (fluss-bach.html, weltkarte-skizze.png); Wasser KOMPLETT NEU als prozeduraler Shader (faithful aus der Referenz/Autor-Übergabe), datengetrieben (Flusslauf als Geometrie pro Karte), kein Masken-Textur-Sampling. WasserProbe mit vollem Reglersatz in zwei Tabs (Wasser/Blut).
- Schritt 3: START-Area (2,3) als echte WorldScene-Area gebaut (buildStart). Erbt HUD/ESC/Licht/Kampf/Fällen/Steine/Speichern automatisch. Neues Wasser als EIN Overlay pro Karte (weiche Ufer ins Gras), Kollision aus T.WATER (deckt sich mit der Optik), Salzstraße-Brücke über den Fluss. Erreichbar über Titel-Menü "START-KARTE (neu)"; NEUES SPIEL noch auf village.
- Verifiziert headless (WebGL, 0 Fehler), tsc grün, 195 Tests grün. FPS auf echter GPU offen.
- Offen für deine Abnahme: Wasser-Look-Feintuning (tagsüber blass), Brücken-Form (Treppenmuster), und ob mein Fluss-/See-/Wege-Verlauf der Skizze entspricht.

## Runde 74 - Startkarte nach Vorlage + echter Boden/Bäume
- START-Layout 1:1 nach reference/ravenkarte.png (Lesart-Bild an den Autor):
  Fluss von Norden mit Ost-Abzweig, großer organischer See, Bach von Westen,
  fast gerade Salzstraße mit Brücke (ungebremst begehbar, gemessen Faktor 1.0).
- Nur noch EINE Karte (start_engine/blank + Test-Knöpfe entfernt), keine
  Gegner (friedlich-Guard, hart getestet), Wege auf allen Oberweltkarten
  gerader, KARTE-Tab mit Klick-Großansicht.
- Boden-Bake jetzt im echten dorfSim-Look (bodenMaler: Wiese/Moos/Wegband),
  Bäume als große ez-tree-Bitmaps mit dorfSim-Abständen und Kontaktschatten.
  Held-Watewellen raus. Alles im Browser verifiziert, tsc + 195 Tests grün.
- OFFEN: Wettersystem+Pfützen-Port (Blaupause liegt vor: dorfSim Z.468-1487),
  bewegtes three.js-Gras/Blumen (Recherche: InstancedMesh-Halme mit Wind-
  Shader, Codrops/CK42BB als Referenz -> über den Backofen als Sprites backen).

## R94 - RTS-Block: Baumenü, Einheitensteuerung, Gebäude-HP, Palisaden
FERTIG und im Browser verifiziert (tsc + 201 Tests grün, 0 Laufzeitfehler):
- Baumenü rechts unten als vertikale C&C-Leiste, Tabs BAUEN/BEFEHLE, A-/A+.
- Held wählbar (Ring) + per Klick schickbar + Auto-Angriff; Schild-Toggle
  AN/AUS (Held hält zwischen den Schlägen die Deckung).
- Jedes Bauwerk hat jetzt Lebenspunkte: Klick öffnet Menü mit Balken,
  Reparieren (+34% HP / -25% Kosten, geprüft: 50->124.8 HP, Holz 200->195)
  und Abbauen (50% zurück, geprüft: Holz ->205, Registry 1->0). Balken nur
  bei Auswahl bzw. dauerhaft im roten Bereich (<35%).
- Palisaden ziehbar: 6-Segment-L-Linie mit sauberer Ecke gebaut, 3 m hohe
  Pfähle, verbinden sich mit Nachbarn. (Screenshots im Scratchpad.)
- OFFEN: Eventuell zusätzliches manuelles Palisaden-Drehen/Diagonalen
  (siehe OFFENE-FRAGEN Nr. 7); Held-Marschtempo nur headless gemessen
  (rAF-Drossel), im echten Browser flüssig zu prüfen.

## R96 - RTS-Ausbau (Steuerung, Einheiten, Bauten, Turm) + Bäume/Schilf (R95)
Alle im Browser verifiziert (tsc + 201 Tests grün, 0 Laufzeitfehler):
- R95: Ufer-Schilf-Dichteregler (live, F10-Tab ANFANG); Bäume schweben nicht mehr
  (Anker auf gemessenem Stammfuß); Held/Gegner sortieren auf dem Fußpunkt -> der
  Held steht mit freiem Kopf VOR dem Stamm, dahinter korrekt verdeckt.
- Held im RTS bedächtiger (0.55x) mit sauberer Lauf-Animation.
- C&C-Baumenü verschiebbar (Kopfzeile), Position gespeichert.
- RTS-Steuerung wie in der Schlacht-Probe: Einheiten wählen (Klick/Gummiband/
  Doppelklick/Shift), Rechtsklick-Befehle, Rechts-Ziehen = Formation mit Ghost-
  Vorschau, A/H, Held als Sonder-Einheit. Feind-Klick gibt Feedback + Ziel-Marker.
- TEST-Tab: eigene Truppen + Feind-Monster spawnen (Schlacht/Formationen testen).
- Palisade mit Holzstruktur, doppelter Vertikalreihe, Eckpfosten. Baubares Tor.
- Wachturm höher (ragt über die Palisade). Zelte historisch (First-/Giebelzelte).
- Wachturm-Besatzung: Einheit hochbefehligen -> Bogenschütze +150 Reichweite,
  +35% Schaden (trifft Feinde außer Boden-Reichweite; verifiziert).
- OFFEN: die "später"-Lager-Bauten + Erschöpfung/Wach-Wechsel + Ausrüstungs-
  Verteilung (bewusst zurückgestellt, siehe OFFENE-FRAGEN 10 / TODO).

## R97 - RTS-Feinschliff: Spawn/Maus, Schlachtführer, 3D-Bauten, Lager-Schicht
Alle im Browser verifiziert (tsc + 201 Tests grün, 0 Laufzeitfehler):
- Einheiten/Monster per Maus setzen (kein Auto-Spawn), A-Taste frei (WASD Kamera),
  Angriffsmarsch als Knopf.
- Held tot = Schlacht verloren (Truppe flieht).
- Wachturm + Zelte als massive three.js-Bakes (Turm überragt die Palisade klar,
  runde Feldzelte mit Kegeldach/Abspannung, Lazarett mit rotem Kreuz).
- "Später"-Lager-Schicht umgesetzt: Feldaltar, Feldküche, Brunnen, Mannschafts-
  /Nachschubzelt, Feldschmiede, Wartfeuer (Verstärkungswelle) - mit Auren/Moral/
  Reparatur/Nachschub, alle platzier-/reparier-/abbaubar.
- OFFEN (bewusst später): Erschöpfungs-/Wach-Wechsel-System und Ausrüstungs-
  Verteilung ans Heer (Dorf-Zeughaus + Feld-Nachschubzelt) - siehe TODO.

## R99 - Autorbrief komplett (P1-18): Bau-System, ein Kampfsystem, Assets
Alle 18 Punkte umgesetzt und im Browser/Tests verifiziert (225 gruen):
- P1-4: Palisaden-Ecken geschlossen, lueckenlos, buendig; Tor = Rasterkachel.
- P5/P11: Tor auf/zu per Menue, Durchlass nur fuer eigene Fraktion (verifiziert).
- P6-10: three.js-Assets via Bake-Pipeline: Ortho-Kachelofen im Baum-Winkel;
  3D-Palisade/Tor(h+v, auf/zu)/BAUSTELLE/Feldaltar/Feldkueche/Brunnen/
  Feldschmiede/Wartfeuer; Turm/Zelte waren schon 3D. Canvas = Fallback.
- P12-14: RTS-Kampf = DUNGEON-Kampf. Verbuendete sind echte Enemies (team
  'spieler', Soldaten-Figur, Schild/Parade/Bogen), Feinde echte Monster;
  EnemyHost-Proxy lenkt die Ziele, Schaden/Pfeile team-geroutet, alte Test-Sim
  GELOESCHT. Wechselseitig verifiziert (Ally toetet Skelett, Feind 220->129,
  Pfeile beidseitig, Feinde greifen den Helden an).
- P15/16: Held per Box-Select gruppierbar; Moduswechsel nahtlos (Truppen
  marschieren im Helden-Modus weiter, Wiedereinstieg findet dieselbe Schlacht).
- P17: RTS-Wegfindung = Dungeon-Wegfeld (Flussfeld je Befehlsziel), Umweg-Test.
- P18: Box-Select, Ringe, Ziel-Ping, Feind-Hover, Befehls-Sound, HP-Balken.
- Extra-Fixes: Tor folgt der Wand-Ausrichtung, Palisaden-Bauzeit (Baustellen),
  RTS-Blick folgt nicht mehr der Maus; Wasser/Wege ACHSENTREU auf allen Karten
  (Bruecken 90 Grad, begehbar, Monsterlager-Mitte frei), stadt nach Autor-Vorlage.
- OFFEN (TODO): Turm-Reichweitenbonus fuer Enemy-Schuetzen, Feldscher neu,
  Tor-Fluegel-Animation als Frame-Folge, gy1-Huellen (wald_nw/ne, hochland, kloster).

## Runde 102 - Katakomben-Generator (V8), alle 4 Phasen
- KERN: Rechteck-Raeume (Rejection Sampling, 18-28, gemischte Groessen) + MST
  ueber Raumzentren (alles erreichbar) + 15-25% Schleifen + L-Gaenge mit Tueren
  am Wandring. VAULTS: 3-6 Sackgassen in der Wandmasse, GENAU EINE Tuer, 1-2
  geheim. ~3x Krypta-Groesse (84x70). Ausgabe = Editor-Codes (weiter editierbar).
- ROLLEN: Eingang (randnah), Bossarena (graph-fernster grosser Raum),
  Schatzkammer bevorzugt im Vault, Kapelle/Folterkammer/Kerker/Krypta/Beinhaus/
  Skriptorium/Wachstube gewichtet mit Ruhe-nahe-Eingang/Gefahr-Richtung-Boss;
  Blut nimmt Richtung Boss zu, Blutgang-Marker vor der Boss-Tuer.
- EREIGNIS-MARKER: Hinterhalt/Kaefig/Kerzen-aus/Sarkophag (Ausloesung = TODO).
- VERIFIZIERT: 15 Property-Tests ueber 10 Seeds (jeder Raum erreichbar, Vault
  versiegelt = abgekapselt, Tueren gerade durchschreitbar, Rollen-Obergrenzen,
  Round-Trip); im Browser: DUNGEON-PROBE V8 (Uebersicht mit Rollen-Etiketten,
  BEGEHEN, SPIELEN mit echtem Helden) UND live als Krypta-Ebene (84x70,
  52 Gegner-Spawns, Treppen auf/ab, Fackeln, Truhen, Geheimwand als Mauerriss).
- EINSATZ flexibel + Standard AUS (KATAKOMBEN_EINSATZ: ebenen[]/abEbene) - der
  Autor sagt spaeter, wo er laufen soll (siehe OFFENE-FRAGEN 23/24). Test im
  Spiel: F10 -> KASTEN -> "Katakomben-Dungeon betreten (Ebene 1, Test)".

## Runde 105 - Dorf-Editor (Boxen beweglich + Baukasten + Bericht)
Fertig und im Browser verifiziert (Playwright-Smoke: Area erreicht, 31 Boxen,
Editor an, Verschieben, Marker setzen 31->32, Bericht-DOM mit TS+Feld, 0 Fehler):
- [P] in Ravensmoor ('stadt') oeffnet den Editor (Frei-Kamera, Held haelt still).
- Boxen mit der Maus ziehen = verschieben (kachelgerastet); gewaehlte Box laesst
  sich vergroessern/verkleinern, umbenennen, loeschen.
- Baukasten setzt neue beschriftete Marker: Wohnhaus, Gebaeude, Ort/POI, Ausgang,
  Feld, Weg, Baum+ (setzen), Baum- (entfernen-Markierung).
- "Bericht" -> Fenster mit kopierbaren Koordinaten (Klartext + TS-Block). Der Autor
  kopiert das und schickt es mir; ich pflege es nach src/data/dorfplan.ts.
- Aenderungen ueberleben den Reload (Browser). "Saat" holt das Datei-Layout zurueck.
- tsc sauber, 244 Vitest-Tests gruen, Vite-Build ok.
OFFEN: Baum+/- sind Marker (noch kein echter Terrain-Eingriff); Felder/Wege noch
ohne Grafik (Platzhalter). Beides bewusst - Grafik/Terrain kommt, sobald die
Positionen stehen.

## Dorfwirtschaft "Siedler lite" - M0: Anker-System (Grundlage)
FERTIG + VERIFIZIERT: Tagesplan je Bewohner (arbeit/pause/mittag/abend/schlaf)
mit persoenlichem Zeitversatz (seeded) und Verschnaufpausen an der Station;
Nachmittags-Arbeitsblock neu (abendAb 0.55->0.62). tsc + 299 Tests gruen.
Browser-Check: Phasenwechsel + gemischte Zustaende im Pausenfenster (6 an
Station / 19 unterwegs). Screenshots: m0_arbeit/mittag/abend (Scratchpad).
ENTSCHEIDUNGEN: Anker-Auftrag aus Referenzen rekonstruiert (Datei fehlt im
Repo); Pausen-/Mittagszeiten als Daten in src/data/dorfleben.ts.
EHRLICHE LUECKE: Pausen-Pose ist vorerst simples Stehen/Strecken - echte
Sitz-/Trink-Posen kommen mit den Rollen-Sprites (M1/M2).

## Dorfwirtschaft M1: Bewohner-Roster + Sprites
FERTIG + VERIFIZIERT: 23-Personen-Roster exakt nach Autor-Liste (Browser-
Roster-Dump stimmt 1:1), Kuester-Glocke morgens/abends (Chronik-Zeile im
Screenshot sichtbar), Werkzeuge je Rolle prozedural ueber FIGURES.
Screenshots: m1_schmied.png (Schmied + neue Baeuerin Hilde + Glocken-Chronik),
m1_brunnen.png. tsc + 299 Tests gruen.
ENTSCHEIDUNGEN: Namen um 1349 ergaenzt (Agnes, Ruprecht, Ott, Hilde,
Ottilie); gestrichene Zuenfte nur despawnt, Daten bleiben fuer die
Hauptstadt; Glocke als Synth-Klang (echte WAV gewinnt per Hot-Swap).
EHRLICHE LUECKEN: Rollenspezifische ARBEITS-Posen sind weiter Partikel+Takt
(rollenspezifische Bewegungs-Posen kommen mit M2-Stationen); Werkzeuge sind
bei 32px klein - Detailpruefung steht aus, Zeichencode ist simpel.

## Dorfwirtschaft M2: Arbeitsorte + sichtbare Arbeit + Pausen
FERTIG + VERIFIZIERT: Stationen sichtbar (Screenshot m2_amboss.png: Amboss
neben dem Schmied; m2_backofen.png), Magd-Pendel Richtung Brunnen im Browser
gemessen (Distanz sinkt), Stationen-Test gruen. tsc + 300 Tests gruen.
EHRLICHE LUECKEN: Headless laeuft das Spiel mit ~1-2 fps (RAF-Drossel) -
Bewegungs-Verifikation nur als Richtungs-Messung, nicht als fluessiger Lauf;
Angel-Wippe ist Partikel-Takt (keine eigene Ruten-Animation).

## Dorfwirtschaft M3: Lager & Verwaltung
FERTIG + VERIFIZIERT: Warenkatalog + Gruppen-Kapazitaeten + Ueberlauf-Verkauf
(Chronik-Beleg im Screenshot m3_buch.png), Verwaltungsbuch-Panel mit
Bestaenden/Tagesbericht/Warnungen ("Wasser geht aus!", "Erz geht aus!").
tsc + 304 Tests gruen. Spielstand: neues bericht-Feld optional (alte Staende
kompatibel, ?? beim Lesen).

## Dorfwirtschaft M4: Produktionsketten input-gegated + NPC-gebunden
FERTIG + VERIFIZIERT (Browser): normale Ticks fuellen Fisch/Honig/Wasser;
Stoerfall Mueller-verwundet -> "Die Muehle steht still" in der Chronik,
Mehl faellt von 3 auf 1 (Baecker backt weiter, bis nichts mehr da ist).
tsc + 304 Tests gruen.
ENTSCHEIDUNGEN: Abwesenheits-Naeherung (Dorf nicht geladen = alle arbeiten);
Waffen/Werkzeuge abwechselnd je Tag; Erz/Kohle-Tagesproduktion gestrichen.
EHRLICHE LUECKE: "ARBEITS-Phase" gilt je TAG (Tagestakt), nicht je Stunde -
LITE-Auslegung des Auftrags.

## Dorfwirtschaft M5: Bauernfelder + Vieh
FERTIG + VERIFIZIERT (Browser, 6 Wirtschaftstage): Ernte in der Chronik,
Bestaende wachsen bis Deckel, Schlachttage liefern Fleisch, Kapazitaets-
Ueberlauf verkauft automatisch. Feld-Overlay faerbt die Aecker (m5_feld.png).
tsc + 310 Tests gruen. Einfall senkt Bestand + Feldwachstum real.

## Dorfwirtschaft M6: Verbrauch & Kreislauf
FERTIG + VERIFIZIERT (Browser): taeglicher Verzehr nach Prioritaet, Knappheit
-> Unmut + langsamere Arbeit + Buch-Warnung, Haendler-Angebote haengen am
Dorf-Lager (Kauf entnimmt Ware, Gold -> Dorfkasse), Spenden-Weg beim
Schulzen. tsc + 311 Tests gruen.
EHRLICHE LUECKE: "Brot" gibt es weiter auch bei Bauer B als Menue-Eintrag -
gekoppelt ans Lager; Heinrichs Wirtshaus-Karte blieb unveraendert (Eintopf
etc. sind Wirtshaus-Kueche, bewusst ungekoppelt).

## Dorfwirtschaft M7: Sprechen & Handeln
FERTIG + VERIFIZIERT (Browser): Knappheits-Zeile erscheint im Dialogkontext,
Baecker-Angebote folgen dem Lagerbestand (ohne Brot nur Honigkuchen).
tsc + 311 Tests gruen.
EHRLICHE LUECKE: Kontexte sind gemeinsame Pools + Prioritaet, nicht 5
individuelle Tabellen JE Bewohner (LITE; leicht erweiterbar in dialoge.ts).

## Dorfwirtschaft "Siedler lite" - M9 GESAMTBERICHT (alles im NEUEN Ravensmoor)
WAS STEHT (alle Meilensteine M0-M8 + Umzug, je eigener Commit):
- M0 Anker-Tagesplan mit Zeitversatz + Verschnaufpausen (dorfleben.ts)
- M1 23er-Autor-Roster + Werkzeuge in der Hand + Kuester-Glocke
- M2 Stationen (Amboss/Backofen/Holzstapel/Bienenkoerbe), Magd-Pendelweg,
  Plausch-Zuwendung
- M3 Warenkatalog + Gruppen-Kapazitaeten + Schulze-Ueberlaufverkauf +
  VERWALTUNGSBUCH (verschiebbar)
- M4 Ketten input-gegated + NPC-gebunden (Chronik meldet Ausfaelle),
  Schmiede-Fertigung, Baustellen-Holzverbrauch, Zeughaus-Datenhaken
- M5 Bauern-Felder (sichtbares Wachstum) + Vieh (Vermehrung/Schlachtung),
  Einfall-Kopplung (Bestand/Felder)
- M6 taeglicher Verzehr + Knappheits-LITE + Haendler an Eigenproduktion +
  Spenden-Weg
- M7 Kontext-Dialoge (Knappheit/Abgabetag) + Handel Baecker/Wirtin/Familie B
- M8 questgeber + Kopf-Marker + Questlinien-Tabelle + Stahl-Quest real +
  Tresen-Kopfgeld-Hook
- UMZUG: alles an die Dorfplan-Boxen der stadt-Karte, begehbare 3D-Gebaeude
  (Haus N1 + Schmiede B1) vom Codex-Branch geportet. Altes Dorf eingefroren.
M9-MEHRTAGE-TEST (14 Tage, Browser): stabil - kein Dauerhunger (Vieh traegt),
Huehner 5->6, Kasse 312->608 (Ueberlauf-Verkaeufe). Stoerfall Mueller:
"Muehle steht still" + Erholung nach Heilung - beides belegt.
ZAHLEN-DATEIEN (Autor justiert NUR hier): wirtschaft.ts, dorfOekonomie.ts,
dorfVieh.ts, dorfleben.ts, questlinien.ts, shops.ts, dorfplan.ts.
BALANCING-BEFUNDE fuer die Feinjustier-Runde:
1. HOLZ faellt auf 0: Saegewerk (50/Tag) + Abgabe fressen es; Baustoffe-
   Kapazitaet 260 laeuft mit Brettern voll -> Holz landet im Ueberlauf-
   Verkauf. Stellschrauben: HOLZ.saegewerkProTag / KAPAZITAET.baustoffe.
2. WEIZEN-Defizit: Felder ~3,2/Tag vs. Bedarf 5/Tag (Futter+Muehle) - Muehle
   laeuft nicht taeglich voll. Gewollt LITE (Held-Hebel), justierbar ueber
   FELD_REGELN.ertragKorn/reifeTage.
EHRLICHE LUECKEN: Einfall zielt noch aufs alte Dorf (Umzug des Einfalls =
eigener Schritt; Vieh-/Feld-Kopplung wirkt erst dann im neuen Dorf); Posen
sind LITE (Stehen/Strecken/Zuwendung, keine eigenen Pose-Atlanten); Stahl-
Quest-Fertigstellung (delayedCall) headless nicht abgewartet; Bewohner-Zahl
fuer den Verzehr ist eine Daten-Konstante (24), nicht live gezaehlt;
Kraeuter-Untertypen nur vorbereitet (KRAEUTER_ARTEN).
## Runde 133 - Reitpferd live im Hauptspiel
Fertig und direkt auf der Startkarte testbar:
- Gesatteltes und gezÃ¤umtes Blender-Pferd steht beim Spieler. E = auf-/absitzen.
- W/S regeln Vorwaerts-Tempo, Bremsen und langsames Rueckwaertsgehen; A/D lenken.
- Rechte Maus halten = fein und stufenlos in Richtung Mauszeiger lenken. Die
  Kampfbelegung der rechten Maus bleibt nach dem Absitzen unveraendert.
- Schritt, Trab, Galopp und Rueckwaertsgang laufen als echte 8-Richtungs-
  Animationen. Kleine/mittlere/starke Link-/Rechtswendungen haben ebenfalls je
  8 Frames, damit Beine, Hals und Rumpf in der Kurve nicht einfrieren.
- Der existierende Hauptcharakter sitzt als eigene Ebene am Sattel; kein fest in
  das Pferdebild eingebrannter Fremdreiter. Groessere Pferdekollision und freier
  Absitzpunkt sind aktiv.
- Browser-Sichttest ohne Laufzeitfehler; Screenshot: screenshots/reitpferd-live.png.
- `npm run build` sauber, 42 Testdateien / 279 Tests gruen.

Nach dem ersten Live-Test nachgebessert:
- Pferd, Reiter, Schatten und Kollision deutlich verkleinert; es belegt den
  engen 2D-Weg nicht mehr optisch wie ein Grossgegner.
- Einfacher Mausmodus: rechte Maustaste halten, das Pferd reitet zum Cursor,
  bremst in Zielnaehe und dreht bei seitlichen/rueckwaertigen Zielen zuerst ein.
- Langsames Drehen reagiert staerker; W/S/A/D und Rueckwaertsgang bleiben als
  manuelle Steuerung erhalten. Browser fehlerfrei, Build sauber, 280 Tests gruen.

## Runde 134 - Animationen geerdet und Reiter wirklich aufgesessen
Nach dem direkten Spielerfeedback wurde nicht nur optisch nachjustiert, sondern
die fehlerhafte Export-/Uebergangslogik korrigiert:
- Feste Boden-Kamera statt Mitschwingen mit dem Pferderumpf; flachere 10-Grad-
  Perspektive und mitdrehendes Studiolicht verhindern Schweben und Farbwechsel.
- Einheitliches dunkleres Braun-Grading fuer alle 672 Pferde-Frames.
- Schrittphase bleibt beim Wechsel zu Trab/Galopp erhalten; kurzer 160-ms-
  Crossfade und stetige, tempoabhaengige Hufkadenz beseitigen den harten Sprung.
- Eigene 8-Richtungs-Sitzfigur des Haupthelden mit gebeugten Knien/Steigbuegeln
  und Zuegelarmen. Die Huefte folgt einem aus Blender exportierten Sattelpunkt
  pro Frame; kein abgeschnittener Stand-Sprite mehr hinter dem Pferd.
- Live im Hauptspiel sichtbar geprueft. `npm run build` erfolgreich; 42
  Testdateien / 281 Tests gruen. Screenshot: screenshots/reitpferd-live.png.

## Runde 135 - Harte Gangwechsel entfernt, 16 echte Blickrichtungen
Die Ursache des Rueck-/Vorwaertssprungs lag in zwei Dingen: falsche Beinphasen
beim Clipwechsel und ein Sprite-Crossfade, der zwei verschiedene Koerperposen
uebereinander legte. Beides ist ersetzt:
- Sechs echte Blender-Rig-Uebergaenge mit je sechs Zwischenposen. Stand ->
  Schritt und Schritt -> Trab starten phasengleich; Trab -> Galopp verbindet die
  vermessenen Frames 2 -> 5. Dieselben Uebergaenge existieren beim Abbremsen.
- Ein gefundener Blender-5.1-Auswertungsfehler im Export ist behoben: nach jeder
  gemischten Pose wird das Rig vollstaendig aktualisiert. Pferd und projizierter
  Sattelpunkt springen dadurch nicht mehr einen Frame seitlich.
- 16 statt 8 echte Blender-Kameraperspektiven (22,5 statt 45 Grad). Das Asset
  bleibt bewusst ein 2D-Atlas fuer Phaser und die flache Hauptfigur; fuer frei
  kontinuierliche 360 Grad waere ein separater Live-3D-Renderer noetig.
- Mausfahrt behaelt Schritt/Trab/Galopp bei und wechselt beim Lenken nicht mehr
  in langsame Stand-Wendeschritte. Rechte Maus halten = Zielrichtung; Pfeil
  hoch/runter oder W/S = Tempo. Pfeil links/rechts dreht nicht; A/D bleibt als
  schnelles manuelles Zuegeln mit Hals-/Rumpf-Wendeposen auf der Stelle.
- Der Reiter folgt 1.920 Blender-Sattelpunkten und fuehrt seine kleine Sitzphase
  clipuebergreifend weiter, statt bei jedem Gangwechsel sichtbar neu anzusetzen.
- Ergebnis als Animationsvorschau: screenshots/reitpferd-uebergaenge.gif.
  Produktions-Build sauber, 42 Testdateien / 282 Tests gruen; alle sechs Atlas-
  Paare plus Sattel-JSON werden vom laufenden Server mit HTTP 200 ausgeliefert.
  Keine Pferde-Asset-/Framefehler in der Browser-Konsole; sichtbar bleibt nur
  die schon vorhandene Three.js-PCFSoftShadowMap-Deprecation.

## Runde 136 - Gruenes N beseitigt
Das gruene N war kein Richtungsmarker, sondern Phasers interne `__MISSING`-
Textur. Nach einem Hot-Reload konnte die neue Pferdelogik bereits auf einen der
neuen Teilatlanten wechseln, obwohl die alte laufende Boot-Sitzung ihn noch nicht
geladen hatte. Jeder Framewechsel prueft nun Atlas und Frame vorab, behaelt bei
einem fehlenden Ziel den letzten gueltigen Frame und repariert einen schon
fehlgeschlagenen Sprite ueber die passende Standpose. Im schlechtesten Fall wird
das Pferd verborgen statt als gruene Fehlerkachel gezeichnet. Nach vollem Reload
live aufgesessen und geprueft: keine neuen Frame-/`__MISSING`-Warnungen; Build und
alle 282 Tests gruen. Screenshot: screenshots/reitpferd-fehltextur-behoben.png.

## Runde 137 - Reitpferd Live-Tuning und Uebergangsdiagnose
- In der verschiebbaren F10-Dev-Konsole gibt es den Tab PFERD. Gesamtgroesse,
  Breite/Hoehe, Bodenanker, Reitergroesse/-versatz, Sattel-Nachlauf,
  Animations-Zeitlupe und Schatten lassen sich live einstellen.
- Werte bleiben nur als lokales Dev-Tuning im Browser und koennen fuer die
  feste Asset-Abnahme kopiert oder auf den bisherigen Standard zurueckgesetzt
  werden. Claudes Tint, Hufspuren, Bewegung und Kadenzwerte blieben erhalten.
- Atlasmessung: alle Clipnaehte sind pixelgenau, aber `walk_to_trot` veraendert
  sich in seinen sechs Zwischenframes nur minimal (mittlere Bilddifferenz etwa
  0,09 statt 0,8-1,0 bei den echten Uebergaengen). Das sichtbare Stocken ist
  damit als Blender-/Assetproblem eingegrenzt.
- Im Browser geprueft: F10-Tab, Live-Skalierung, Aufsitzen, Reiterversatz und
  Ruecksetzen. TypeScript sauber, 53 Testdateien / 337 Tests gruen.

## Runde 138 - Codex-Haeuser (Baeckerei/Muehle) verifiziert
- Codex-Commit 3dbac25 gezogen (Fast-forward). Baeckerei -> Box B3 (das
  "Backhaus"-Feld), Muehle -> Box B6 (das "Muehle"-Feld am echten Ostfluss,
  yaw 180 damit das Rad zum Wasser zeigt). Boxen und Gebaeude passen semantisch
  zusammen, nicht willkuerlich gesetzt.
- Diff ist minimal und sauber: 8 Zeilen in WorldScene.ts (GEB3D_BOXEN) plus je
  ein bounds_blender-Block in beiden Runtime-JSONs. bounds_blender ist genau der
  noetige Fix: gebaeude3d.ts liest ihn in baueBegehbarkeit() (Zeile 278) und
  greift sofort auf b.min/b.max zu - ohne den Block waere das Gebaeude beim
  Laden abgestuerzt. Damit sind beide Haeuser jetzt erst begehbar.
- Assetpfade aufgeloest (publicDir 'assets'): GLB + JSON liegen, walkable_interior
  und doors vorhanden. Aufrufkette bestaetigt: goArea('stadt') -> zeichneDorfplan
  -> GEB3D_BOXEN-Schleife -> starteGebaeude3d, unabhaengig vom Ankunfts-Flag.
- tsc sauber, 53 Testdateien / 337 Tests gruen. Hauptmenue nebenbei geprueft
  (Codex-TitleScene): realistischer Abtei-Hintergrund, ruhige Marke, vier
  Aktionen, Entwicklungsproben hinter ENTWICKLUNG - sitzt.
- OFFEN/ehrlich: der Live-3D-Screenshot in der stadt liess sich headless NICHT
  aufnehmen - Software-WebGL kann die vier schweren GLB-Modelle nicht schnell
  genug bauen (Render blieb im Aufbau haengen). Verdrahtung ist statisch
  vollstaendig bewiesen; die reine Optik im laufenden Spiel bleibt vom Autor
  bzw. Codex am echten Geraet zu bestaetigen.
- Befund fuer die restlichen Haeuser: apothecary hat bounds_blender, aber
  butcher, cooperage und stable FEHLT er noch - vor dem Setzen ergaenzen, sonst
  Absturz wie oben. Boettcherei (cooperage) gehoert laut Dok 01 ins ZWEITE Dorf,
  nicht nach Ravensmoor.

## Runde 138 - Fluss-Waende, Standards, Respawn, Maps-Tab, Stil-Werkbank
- UNSICHTBARE FLUSS-WAENDE (Autorbug): reproduziert - "Wasser-Effekte aus"
  (Schalter oder Leistungs-Preset Niedrig) blendete den Wasser-Shader aus,
  und bei gebackenem Boden zeichnete dann NICHTS das Wasser; die SOLID-
  Kollision blieb (1400 Kacheln allein auf der Startkarte). Fix: flaches
  Ersatz-Wasser aus DERSELBEN SDF wie Kollision und Shader, automatisch
  sichtbar sobald der Shader aus ist. Browser-verifiziert (Screenshot
  r138-flachwasser-statt-unsichtbarer-wand.png).
- Ehrlicher Nebenbefund: auch MIT Shader ist der Fluss bei Tag schwach
  sichtbar (r138-fluss-mittag-shader-an.png) - als Frage notiert, kein
  eigenmaechtiger Eingriff in den kanonischen Wasser-Look.
- Wandhoehe-Standard x1,25 ueberall + Wand-Schatten AN in jedem Dungeon
  (einmalige Migration; Grafik-Presets Niedrig/Mittel schalten Wand-Schatten
  aus Leistungsgruenden weiter aus). Im Browser in kerker12 geprueft.
- Respawn: Dungeon-/Innenraum-Tod -> neues Ravensmoor; Oberwelt-Tod ->
  Eingang derselben Karte. NIE mehr altes Dorf. Regel als reine Logik mit
  Tests (respawnZiel), im Browser beide Wege geprueft (stadt / start+amSpawn).
- Maps-Tab = Sammelstelle: V12-Kerker, V9-Kammern, Katakomben-Gewoelbe (je
  mit NEU wuerfeln) + Live-Karten-Schnellzugang (Goldmine). V9/Katakomben
  haben eigene Area-Ids - die echte crypt1-Kette bleibt unberuehrt (geprueft).
  Stehende Regel (AGENTS.md): jede neue Karte bekommt sofort ihren Eintrag.
- Sonnen-Regler: 3D-Gebaeude werfen jetzt Sonnenschatten (vorher hatte die
  neue Stadt NULL statische Verdecker); der Projektions-Modus hoert auf
  Sonnen-Ferne und Sonnen-Weichheit (vorher nur Staerke). Schattenlaenge/
  Weichheit im Browser als Vergleichs-Screenshots geprueft.
- STIL-Werkbank (Dev-Konsole F10 > STIL): 20 Boeden (R124-Stile, jetzt live
  im Spiel statt nur in der Probe) + 10 NEUE Waende (Bruchstein, Sandstein-
  Quader, Feldstein, Backstein, Kalkputz, Fachwerk, Holzbohlen, Schiefer,
  Granitquader, Beinhaus). Klick laedt die Karte an Ort und Stelle neu,
  nichts wird gespeichert. Geprueft in kerker12 (Fischgraet+Backstein,
  Holzdielen+Fachwerk, Gebein+Beinhaus - Screenshots r138-werkbank-*) und
  in der Goldmine (Boden wechselt, Fels-Stollenwand bleibt natuerlich).
- tsc fehlerfrei, 54 Testdateien / 340 Tests gruen.

## Runde 139 - GPT-2-UI: HUD, Einstellungen, Charakter und Inventar
- HUD auf die freigegebenen Einzelassets umgestellt: Mausblock links,
  Tastaturblock daneben, flache Lebens-/Manakugeln aussen und Statusstreifen
  unten. Alte Canvas-Rahmen werden nicht mehr ueber die Bildteile gezeichnet.
- Einstellungen verwenden die neue 1672x941-GPT-Bildschale als verbindliche
  Geometrie. Tabs, aktuelle Regler, Tasten und Schalter bleiben dynamische
  DOM-Elemente und lassen sich weiterhin bedienen; das Titelband verschiebt
  Bild und Inhalt gemeinsam.
- Charakter/Inventar verwenden ebenfalls eine neue 1672x941-GPT-Bildschale.
  Aldrics Portrait ohne Wappen, Ausruestung, echte Spielerwerte, Feuer-/Kaelte-/
  Schattenwiderstand, Vorrat, Inventarfilter und Itemaktionen liegen auf festen
  Referenzkoordinaten und skalieren proportional. Keine erfundenen Werte.
- Browser-Abnahme bei 1024x768, 1280x720 und 1920x1080: oeffnen/schliessen,
  Reiter, Verschieben, Klickschutz und erneutes Oeffnen funktionieren. Vorschauen
  liegen ausserhalb des Repos unter menu-ui-template/codex-gpt2-*-final-1280.png.
- `npm run typecheck`, 54 Testdateien / 340 Tests und `npm run build` gruen.
  Offen im Gesamtauftrag bleiben Hauptmenue, Shop und Dialog; diese Runde hat
  deren Logik und Dateien nicht angefasst.

## Runde 139/140 - RTS Rang 1 komplett + Charakter-Menue repariert
- RTS (Dok 03, Rang 1 - alle Punkte): 1.1 Dorf-Lager zahlt die Feldbauten
  (Leiste zeigt den Bestand und faerbt danach), 1.2 MORAL entscheidet Kaempfe
  (die EINE Formel, Flucht zur Kartenkante, Sunzi-Kessel, Banner-Durchschnitt;
  live gemessen: 3 Soeldner gegen 10 Gewappnete -> Moral 39 -> BRICHT bei 4 ->
  flieht -> sammelt sich bei 46), 1.3 Set-Target (Marsch + Ziel-Prioritaet
  getrennt), 1.4 Ziel-Sperrzeit (kein Zappeln), 1.6 Tag-Konter (Matrix aus
  Dok 02 endlich verdrahtet, 'SCHWACH!'/'PRALLT AB'-Rueckmeldung), 1.7 drei
  Verhaltens-Achsen (Bewegung/Angriff/Zielwahl - "Feuer einstellen" existiert),
  1.9 Formations-Abstand (Eng/Normal/Weit). 1.8 Engstellen: erst reproduzieren
  (TODO). Vier Commits, alles browser-verifiziert, 357 Tests gruen.
- CHARAKTER-MENUE (Autor-Meldung, Codex-Bildschale): alle vier Punkte behoben
  und im Browser nachgestellt (Vorher/Nachher in screenshots/r140-*):
  1) Items/Schriften verschoben: Pack-Icons (128px) ragten 20px ueber die
     Zeilen, der Name lag AUF dem Icon - Icons passen sich jetzt der Zeile an,
     Texte wachsen mit der Zeilenhoehe.
  2) AUSRUESTEN PER DOPPELKLICK wie frueher (350ms-Fenster; Traenke/Rollen
     werden per Doppelklick benutzt) - programmatisch verifiziert
     (Rostige Klinge -> Probeklinge angelegt).
  3) 'N Gegenstaende · Gold' war 7-10px winzig -> jetzt 12-15px in Tinte.
  4) Portraet verzerrt: setCrop+setDisplaySize arbeiteten gegeneinander
     (DisplaySize misst den vollen Frame, der Crop zeigt einen Ausschnitt) -
     neuer Einpass-Helfer skaliert den Ausschnitt und zentriert ihn korrekt.

## Runde 141 - Persistente Armee: das Fundament der RTS-Schicht (Dok 03, 2.1/2.2/2.4)
- Das Heer besteht jetzt aus BENANNTEN Leuten (Namenspool des R53-Heers), die
  Kartenwechsel und Speichern ueberleben: hp/kills wandern vom Feld ins Roster
  und zurueck. Tote sind ENDGUELTIG raus und stehen im Gefallenen-Buch.
- Veteranen: je 3 Kills ein Rang (goldene Winkel im Overlay, ▲ im Namen,
  +Schaden/+Leben/+Moral aus RTS_RANG). Aufstieg wird sichtbar gefeiert.
- Wartfeuer ruft aus dem ROSTER in Schueben - leeres Heer = keine Verstaerkung.
  Neuer Knopf "Heer aufstellen (N bereit)" im BEFEHLE-Tab. HEER-Tab zeigt die
  Mannschaft samt Gefallenen.
- Ende-zu-Ende im Browser gemessen: Einmustern (3 benannte), Rang-Aufstieg
  (Heinz Sauerbier ▲, 242 statt 220 LP), Kartenwechsel-Persistenz (hp 100
  bleibt), Wiederantreten, Permadeath (Roster 3 -> 2, Gedenkbuch), Wartfeuer
  leer ("niemand antwortet") und mit Schub (+1 sofort, Rest nach 6s).
- tsc fehlerfrei, 57 Testdateien / 364 Tests gruen (7 neue Armee-Tests).
- OFFEN: Fernkampf-Kills zaehlen noch nicht (Projektil kennt den Schuetzen
  nicht) - kleiner Folgeschritt; Auto-Aufstellen beim Feldzug siehe
  OFFENE-FRAGEN.

## Runde 142 - Das Heer LEBT in der Welt (Autor-Order, Jagged-Alliance-Prinzip)
- Autor-Korrektur eingearbeitet: KEIN "Heer aufstellen"-Knopf mehr. Das Heer
  steht dauerhaft auf den Karten: jede Karte merkt sich, WER (namentlich) dort
  stationiert ist und WO er stand. Beim Betreten stehen die Garnisonen an ihren
  Stellungen und verteidigen selbststaendig (passiv bis Sichtkontakt/Alarm).
- Graf-Verstaerkung betritt die Welt am WALDRAND (erste Karte ganz links) und
  marschiert SICHTBAR von allein nach Ravensmoor (Kolonne zieht von Kante zu
  Kante, Marsch-Uhr 75s je Karte, Chronik meldet Etappen und Ankunft).
- Trupps verlegen im Karten-Tab: Quelle anklicken (Schwerter-Zahl je Karte),
  Menge waehlen (Alle/Haelfte/5), Ziel anklicken - der Trupp marschiert
  kartenweise (BFS ueber das Fuerstentum-Raster), mit oder ohne Held.
- Wartfeuer ruft jetzt REAL: Reserve auf der Held-Karte sammelt sich am Feuer,
  sonst rueckt die NAECHSTE Garnison aus (mit Ankunftszeit-Meldung).
- Zwei Stolperfallen gefunden und gefixt: (1) der Feld-Sync lief beim
  Kartenwechsel erst NACH der area-Zuweisung - das Heer "reiste heimlich mit
  dem Helden mit"; (2) Sprites abgeschlossener Maersche zogen beim Sync die
  Ankunft zurueck - ort wechselt jetzt AUSSCHLIESSLICH ueber die Marsch-Logik,
  und Kolonnen, die die Karte laut Uhr verlassen, werden abgeraeumt.
- Ende-zu-Ende im Browser gemessen (7 Sonden, alle gruen): Graf schickt 6 ->
  6 sichtbar ziehend am Waldrand -> Etappen -> benannte 6er-Garnison in
  Ravensmoor -> 3 nach Finsterhain verlegt -> Garnison 3/3 passiv dort ->
  Wartfeuer auf leerer Karte holt die 3 aus Finsterhain (Marsch gestartet).
- tsc fehlerfrei, 57 Testdateien / 368 Tests gruen (4 neue Marsch-Tests).
- OFFEN (Autor-Frage): WIE ruft der Graf - automatisch oder per Bote?
  Vorschlag steht in OFFENE-FRAGEN.md (benannter Reiter, abfangbar).

## Runde 143-145 - Rekrutierung, Kampf-Fix, Tod ohne Resets
- R143 REKRUTIERUNG (Dok 03, 2.3 - Manor Lords): Bauern-Rekrut kostet 40 Gold
  (Dorfkasse zuerst, Rest zahlt der Held) + EINE Waffe aus dem Dorf-Lager
  (die Schmiede-Kette schliesst sich) + EINEN ARBEITER. Die Tagesproduktion
  (inkl. Holzfaeller) skaliert mit der Bevoelkerung - jeder Soldat macht das
  Dorf spuerbar aermer. Soeldner: 150 Gold, kein Arbeiter, aber Moral-Malus
  und Desertion bei Flucht (endgueltig weg, NICHT im Gefallenen-Buch).
  Heer-Deckel = Bevoelkerung/2. AUSHEBUNG im BEFEHLE-Tab; der Neue tritt der
  Garnison von Ravensmoor bei (steht er beim Helden, tritt er sichtbar an).
  Browser-gemessen: 30+10 Gold gebucht, Waffe raus, Bevoelkerung 30->29,
  "Kaspar der Stille" angetreten; ohne Waffe blockt es; Obergrenze greift.
- R144 KAMPF-FIX (Autor-Meldung "Soldaten stehen bloed rum und wehren sich
  nicht"): Ursache gefunden und im Browser REPRODUZIERT (3 Garnisons-Soldaten
  + Monster, 20s: wach 0/3) - das Weck-System (Team-Alarm, Gegner-in-Sicht)
  und die Moral liefen NUR im RTS-Modus; Garnisonen stehen aber immer auf der
  Karte. Jetzt laufen beide in jedem Modus (Moral nur, wenn Truppen beteiligt -
  das Dungeon-ARPG-Gefuehl bleibt unveraendert). Dazu: beim RTS-Einstieg
  uebernimmt die Befehls-Schicht stehende Garnisonen (anwaehlbar/steuerbar),
  Nachzuegler melden sich mitten im Gefecht selbst an. DASSELBE Repro-Skript
  danach: wach 3/3, Monster von 32 auf 8 HP heruntergekaempft, Moral live.
  Rueckweg getestet: RTS an->aus->an ohne Doppel-Fuehrung.
- R145 TOD OHNE RESETS (Autor-Order): Tod kostet nur noch 10% Gold (vorher
  15%). Lebende Monster merken sich Wunden UND Stellung je Karte - beim
  Wiederkommen (auch nach dem Tod) stehen sie verwundet da, wo sie standen.
  Tote bleiben tot (R47), geleerte Ebenen bleiben leer (R40), andere Karten
  bleiben unberuehrt. Browser-gemessen: Monster auf HP 9 geschlagen ->
  Kartenwechsel hin/zurueck -> HP 9 an gemerkter Stelle; Tod mit 100 Gold ->
  Erwachen mit 90 auf derselben Karte, Verwundeter noch da, Toter noch tot.
- OFFEN/GEFUNDEN: der Monster-Einfall referenziert noch das ARCHIV-Dorf
  (village) - im neuen Ravensmoor feuert kein Einfall, und ein Tod waehrend
  eines Einfalls liesse die Angreifer verpuffen. Wegen der ARCHIV-Regel nicht
  angefasst - Vorschlag "Einfall-Umzug" steht in OFFENE-FRAGEN.md.
- tsc fehlerfrei, 59 Testdateien / 378 Tests gruen (8 neue Rekrutierungs-Tests).

## Runde 146 - Unsichtbare Fluss-Waende v2 (Autor-Repro Waldrand)
- Reproduziert per Kachel-Sonde: die Kollision stimmt (Fluss = SOLID), aber
  ZWEI Lesbarkeits-Luecken machten sie "unsichtbar": ertraenkte Weg-Querungen
  (begehbar, aber vom Wasser-Overlay uebermalt - start 45, wald_o 23, stadt 7
  Kacheln) und Regen-Truebung, die das Wasser in stumpfes Kies-Grau kippte.
- Fix: FURTEN sichtbar (Trittstein-/Kiesband nur auf den echten Weg-Kacheln,
  Bruecken-Ebene ueber dem Wasser; R100h "keine Auto-Bruecke" bleibt) +
  Regen-Truebung gedeckelt (regenTurb 0.2) + Ufer-Wasserlinie immer lesbar.
- Browser-verifiziert: furt_start-Textur vorhanden, alle 4 Sonden-Kacheln der
  Ost-Strassen-Querung begehbar, Screenshot zeigt das Steinband ueber dem Fluss.
- tsc fehlerfrei, 378 Tests gruen.
## Fleischgolem - Gang und Anatomie ueberarbeitet
- Animationsfehler behoben: Die gespiegelten Beine schwangen vorher gemeinsam in
  dieselbe Raumrichtung. Jetzt wechseln Stand- und Schwungbein mit einer langen,
  schweren Standphase; die Schrittdistanz passt zu 30 px/s RTS-Tempo.
- Alle 440 Frames neu gerendert. Feste Bodenlinie und Kontaktschatten verhindern
  das sichtbare Schweben zwischen den Einzelbildern.
- Material und Silhouette staerker organisch: dunkelrotes Muskelgewebe, Poren,
  Blutspalten, asymmetrische Wucherungen, offene Brustwunde und haengende Sehnen.
- Im RTS-Testmodus auf echtem Spielboden geprueft; Fleischgolem platzierbar,
  Richtungen und Laufanimation sichtbar, Browserkonsole ohne Fehler.
- TypeScript, Build und 59 Testdateien / 378 Tests gruen.

## Menschengolem - Fleisch, Blut, Knochen und Live-Groesse
- Die sichtbare Identitaet heisst jetzt ueberall `Menschengolem`. Der interne
  Typ `golem` und der alte Atlas-Dateiname bleiben nur fuer Savegame- und
  Cache-Kompatibilitaet bestehen und werden dem Spieler nicht gezeigt.
- Neuer Blender-Pass: deutlich weniger steinerne Normalstruktur, blutiges
  Muskelgewebe, offene Brusthoehle, drei freiliegende gebrochene Rippen,
  Brustbein, grobe Kreuznaehte, Schulter-Knochenfragment und Sehnen. Alle
  anatomischen Teile sind an das Rig gebunden und bewegen sich mit den Clips.
- Alle 440 Richtungsframes fuer Idle, Lauf, Schlag, Treffer und Tod wurden aus
  Blender 5.1 neu gerendert und in den Phaser-Atlas gepackt. Die editierbare
  Szene liegt als `C:/Obsidian/DM/ravensmoor-flesh-golem.blend` bereit.
- F10 > GEGNER hat beim Abschnitt MENSCHENGOLEM persistente Live-Regler fuer Gesamtgroesse, Breite, Hoehe und
  Bodenanker sowie Kopieren und Zuruecksetzen. Die Regler wirken sofort auf
  lebende Menschengolems und werden beim Erzeugen ihrer Todesanimation
  uebernommen. Trefferkreis und Kampfreichweite bleiben bis zur Endabnahme
  absichtlich unveraendert.
- Browser-Abnahme: GEGNER-Tab sichtbar, Groessenregler korrekt mit Standardwerten
  0.92 / 1.00 / 1.00 / 0.810; keine Browserfehler. TypeScript, Build und 59
  Testdateien / 379 Tests gruen.
- Nachtrag HP-Testregler: F10 > GEGNER bietet `Leben (RTS-Test)` von 100 bis
  20.000 HP in 100er-Schritten. Der Wert wird gespeichert, fuer neue
  RTS-Menschengolems verwendet und setzt bereits lebende Golems sofort auf den
  neuen Maximalwert mit voller Heilung. Browser-Anzeige und fehlerfreie Konsole
  geprueft.

## Menschengolem - standfeste Kampfphasen und Ausbluten
- Die normale Gegner-Trefferreaktion ist fuer den Menschengolem abgeschaltet:
  kein weisses Aufleuchten, kein Treffer-Rueckzug, kein Hammer-Schub und keine
  normale Betäubung. Blut- und Fleischfeedback bleibt erhalten.
- Eigene HP-Kampfphasen: ueber 70% gelegentlicher Rundumschlag; ab 70% statt
  dessen Fleischwelle mit starkem Flaechen-Rueckstoss; ab 50% zusaetzlicher
  Bodenstampfer mit 1,45 s Laehmung; unter 5% kombinierte letzte Raserei mit
  allen Flaecheneffekten. Jeder Spezialangriff hat einen grossen sichtbaren
  Warnkreis.
- Korrektur nach Live-Abnahme: die kuenstlich ausgeschnittene Gliedmasse und der
  separat gezeichnete Arm sind entfernt. Ab 30% reisst der Koerper auf; ab 15%
  beginnt massiver Blutverlust und der Schaden halbiert sich. Unter 5% blutet
  der Golem fortlaufend aus mehreren Stellen und legt wachsende, lange sichtbare
  Blutlachen auf den Boden. Das Atlasbild bleibt in jeder Richtung vollstaendig.
- Alle Treffer-, Impuls- und Kollisionswege behandeln den Golem jetzt als
  unverrueckbare Masse. Beim Kontakt mit Held oder Soldaten weicht die leichtere
  Figur aus; der Golem wird nicht mehr durch den Kampf ueber die Karte geschoben.
- Das RTS-Tempo wurde leicht von 30 auf 34 px/s angehoben. Die Todesanimation
  laeuft mit 7 statt 12 Bildern/s deutlich schwerer und fast zwei Sekunden lang;
  Aufschlag, Blutnebel und zwei grosse Lachen sind gestaffelt. Der Leichnam liegt
  danach neun Sekunden und blendet in weiteren 1,4 Sekunden aus.
- Dev-Konsole: `GOLEM` wurde zu `GEGNER`. Darin steht der Menschengolem als
  erster Gegnertyp mit Groessen-/HP-Reglern und Direktknoepfen fuer 100, 70, 50,
  30, 15 und 4 Prozent. Weitere Gegner koennen dort als eigene Abschnitte folgen.
- Browser-geprueft: 15%-Text und 4%-Dauerblutung mit mehreren Bodenlachen,
  vollstaendig sichtbarer Koerper und Raserei-Telegraph; keine Konsolenfehler.
  TypeScript, Produktions-Build und 59 Testdateien / 380 Tests gruen.

## Menschengolem - Proportion, Bresche und dezente Spezialwarnung
- Autorwerte als neuer Spielstandard uebernommen: Gesamtgroesse 1,00, Breite
  0,70, Hoehe 0,70 und 1000 HP. Der Bodenanker ist nicht geraten, sondern am
  Atlas vermessen: Koerperkontakt Zeile 131 von 144, daher 0,910. Der alte
  lokale Tuning-Speicher wird einmalig ueber eine neue Versionskennung ersetzt.
- Die zusaetzlich in Phaser gezeichneten Rippen sind vollstaendig entfernt.
  Fleischverlust bleibt ueber Atlas, Tint, Blut und Bodenlachen lesbar.
- Spezialangriffe behalten eine faire Vorwarnung, aber der rote Kreis ist nur
  noch 1,1 px breit (Raserei 1,45 px), stark transparent und fast ungefuellt.
- Beim Angriff auf Palisade, Tor oder Wachturm spielt der Menschengolem nun den
  echten Schlagclip. Holzsplitter entstehen im Schlagrhythmus statt zufaellig.
  Nach dem Fall der Wehrbauten kann er auch die uebrigen Lagergebaeude mit
  diesem Clip angreifen, statt sie als unverwundbare Kulisse zu ignorieren.
- Eine Palisadenkachel ist 32 px breit, der Golem mit Radius 29 braucht 58 px.
  Nach dem ersten Durchbruch erweitert er seine Bresche deshalb gezielt um ein
  direkt angrenzendes Segment. Ein Doppeltor ist bereits breit genug. Damit
  folgt er nicht mehr einem fuer den Wegfinder offenen, fuer seinen Koerper aber
  zu schmalen Loch.
- Live-Werkbank geprueft: 1,00 / 0,70 / 0,70 / 0,910 / 1000 HP werden geladen,
  4%-Phase reagiert und keine Rippen-Ueberzeichnung erscheint. TypeScript,
  Produktions-Build und 60 Testdateien / 385 Tests gruen.

## Runde 147-153 - RTS-Grosspaket (Autor-Liste) - alles browser-verifiziert
- R147 XP-GERECHTIGKEIT: Held-XP nur noch fuer EIGENE Kills (Soldaten-Kill: 0 XP,
  gemessen). Stattdessen SCHLACHT-WERTUNG: Sieg (>=3 Feinde, 6s Ruhe im Umkreis)
  gibt Fuehrer-XP nach Formel (Verlust-Malus, Moral-Bonus, Schonungs-Bonus) -
  Browser: 5 Feinde, 0 Verluste, Moral 83 -> exakt 37 XP wie gerechnet.
  Fernkampf-Projektile kennen ihren Schuetzen (Rang-TODO zu). Monster haben
  KEINE Moral/Flucht mehr (Autor-Entscheid). Auswahlringe: duenn, blau/rot,
  Boden-Ebene am Fusspunkt; Held-Ring sitzt (fester Fusspunkt).
- R148 RTS-VERWALTUNG (AoE/BAR): Kontrollgruppen Strg+1..9 / 1..9 (verifiziert
  4+Held), WAHL-Tab folgt der Auswahl: Chip-Reihe (Klick pickt EINE Einheit
  heraus, auch den Helden ♛), Einheiten-Karte (Portraet=Feld-Sprite, Name, Typ,
  Rang/Kills, Leben, Waffe/Ruestung, Verhalten), Mehrfach-Zusammenfassung je
  Typ, Gebaeude-Karte bei Feldbau-Klick (Zustand, Besatzung). Doppelklick=Typ-
  Auswahl gab es schon.
- R149 FLUSS-NACHARBEIT: R146-Trittsteine RAUS (Autor-Order). UFER_SAUM_UV:
  Kollision beginnt erst unter der Wasserlinie - Ufersaum/Schilfband begehbar
  (start: 1400->1001 Solid-Kacheln), Ost-Strassen-Querung durchgaengig (Pferd
  nutzt dieselbe Kollision). In BEIDEN Carve-Pfaden.
- R150 EDITOR: Einzel-Groessenfaktor je 3D-Gebaeude ("Dies +-") zusaetzlich zur
  globalen Skalierung ("Alle +-") - Kirche x1,5 gemessen, persistent.
- R151 LICHT: 3D-Gebaeude Richtung duesterer Vorschau gedimmt (GEB3D_LICHT-
  Block: Exposure 0.72->0.55, Sonne 1.6->1.15, Hemi, Env - EINE Stelle).
- R153 FEINSCHLIFF: doppelte Lebensbalken weg (eigene Truppen: NUR der schmale
  gruene, jetzt aus der Dungeon-Zeichnung; Feinde: nur der rote), Marschierer
  verlassen die Karte an der Kante SOFORT (verifiziert: Feld 0, Roster bleibt),
  ⚑-Hinweis ueber ziehenden Kolonnen nennt das Etappen-Ziel.
- OFFEN aus der Autor-Liste: R152 Live-Karte (Held/NPCs/Truppen/Haeuser),
  R154 Nord-Karten + alle Raender betretbar - in Arbeit.
- tsc fehlerfrei, 61 Testdateien / 390 Tests gruen.

## Runde 154 - Der Norden steht, alle Karten betretbar
- 5 neue Karten aus der ravenkarte: Hoher Norden (2,1), Grauwald (3,1),
  Huenenwald (4,1), Altes Schlachtfeld (5,1), Klosterberg (5,0) - Huellen mit
  Tabellen-Kanten; Schnee/Schlachtfeld-Deko/Kloster folgen je eigenem Auftrag.
- Rand-Uebergaenge umgestellt: statt der alten 3-Karten-Tabelle laeuft der
  Kartenrand jetzt ueber das FUERSTENTUM-Raster - jede Karte fuehrt an jeder
  offenen Kante zum Nachbarn. Browser-verifiziert: alle 12 Oberweltkarten
  laden, Uebergang Nebelforst -> Hoher Norden funktioniert.
- UFERPFAD: Baeume direkt am Wasser weichen - der begehbare Ufersaum (R149)
  ist frei, man kann am Fluss entlang, und reine Fluss-Kanten oeffnen sich
  als Wildwechsel zum Nachbarn.
- Maps-Tab (Dev-Konsole) listet ab jetzt ALLE Fuerstentum-Karten automatisch -
  die R138b-Regel (jede neue Karte sofort im Maps-Tab) erfuellt sich von selbst.
- R152 LIVE-KARTE (aus derselben Autor-Liste): der Karten-Tab zeigt Held (rot),
  eigene Truppen (blau, kartenuebergreifend aus den Roster-Stellungen) und
  Bewohner (gelb) live; Waelder/Fluesse/Wege/Haeuser stecken in den Thumbs.
- tsc fehlerfrei, 390 Tests gruen.

## Runde 155-157 - Uebergaenge, Wasser-Sync, Einfall-Umzug
- R155: "Von Ravensmoor nach Westen im Fluss gelandet" - Ursache Kartengroessen
  (stadt 128x128 vs. Wald 130x85): Rand-Uebergaenge uebertragen die Position
  jetzt PROPORTIONAL. Verifiziert: Landung am Weg (Zeile 45) statt im Fluss.
- R156: Voll-Audit aller 10 Oberweltkarten: bei Standard-Reglern deckt sich
  jede Solid-Wasserkachel mit sichtbarem Wasser (0 Geisterkacheln). recarve-
  Haertung: Werkbank-Regler (Flussbreite/Bahn/See) carven die Kollision live
  mit - Optik und Wand koennen nicht mehr auseinanderlaufen.
- R157: EINFALL lebt jetzt in NEU-RAVENSMOOR: erst nach dem Boss-Sieg (Logik
  unveraendert), die Monster kommen ORGANISCH als gestaffelte Kolonnen ueber
  die Strassen von NORDEN und OSTEN und ziehen zur Stadtmitte; Raeuber fallen
  weiter ueber Vieh/Bewohner her. Sieg erst, wenn auch die letzte Kolonne
  geschlagen ist. Browser-gemessen: 21 Sofort-Angreifer + 12 Kolonnen-Nachschub,
  32 Feinde auf der Karte, Zug zur Mitte. Der Tod des Helden laesst die
  Angreifer warten (nichts resettet); Stadt verlassen bricht den Einfall ab.
- R157b: Der KRYPTA-EINGANG an der Kirche ist real - Wendeltreppe auf der
  Dorfplan-Box, Prolog + Ebenen-Kette haengen dran, und die Kirche kann den
  Eingang NIE blockieren (Kollisions-Ausnahme der Eingangs-Flaeche).
- tsc fehlerfrei, 390 Tests gruen, alles browser-verifiziert.

## Runde 159-163 - Zaeune, Kugeln, Menue-Vermessung, Risse, neue Waende
- R159: Zaeune in Neu-Ravensmoor entfernt (Vieh bleibt per pen auf der Weide).
- R160: HP-/Mana-Kugeln zeigen echten FUELLSTAND (Diablo-Crop von unten) statt
  Alpha-Fade - bei 25% Leben steht das Rot exakt auf 25% (browser-gemessen).
- R161: Charakter-Menue per BILD-VERMESSUNG ausgerichtet: obere Tabs exakt in
  die gemalten Kaesten (vorher bis 39px Drift), Filter-Reiter auf die gemalten
  Reiter, Item-Icons in die gemalte Slot-Spalte, AUSGEWAEHLT-Panel skaliert
  in die Innenbox ("4-6 Schaden" sitzt IM Werte-Kasten). Screenshot-verifiziert.
- R163: Mauerrisse (Geheimkammern) treffen wieder zuverlaessig: Radius 16->30
  und Nahschlag trifft unabhaengig vom Winkel (hoehere Waende hatten die
  sichtbare Fassade aus dem alten Trefferfenster geschoben). In Ebene 3
  verifiziert: Riss bricht mit schraegem Schlag durch.
- R162: 8 NEUE Wand-Stile mit NAHTLOSEM Mauerwerk (deterministische Fugen -
  die alten sprangen an jeder Kachelnaht) + Lesbarkeits-Pass fuer alle 18
  (Lichtkante oben, Sockelschatten am Boden - Waende lesen sich als Barriere,
  Autor lief dagegen weil er sie nicht erkannte). Basalt im Browser gerendert.
- tsc fehlerfrei, 390 Tests gruen.

## Runde 164-174 - Kommando-Pult (BAR), Einfall-Politur, grosser Fix-Schub
- R164 KOMMANDO-PULT: das Banner-Fenster mit 4 Tabs ist ersetzt durch EIN
  kontextabhaengiges Pult nach der Autor-Spezifikation (Beyond All Reason):
  Ressourcen-Zeile, Auswahl-Bereich (Chips/Detail-Karte), festes 4x3-Raster,
  dessen Inhalt allein der Auswahl folgt (Kampf-Befehle vs. Bau-Kategorien in
  zwei Rasterebenen). Browser-verifiziert mit Screenshot beider Kontexte.
- R165-R169: Einfall in Echtzeit (Zeitlupe raus), Kolonnen marschieren ueber
  die Strassen und haengen nie mehr am Fluss (Anti-Haenger), Mueller/Magd
  raus aus dem Muehlenweiher, Marsch-Storno statt Verschwinden mitten im Dorf,
  Stadtportal nach NEU-Ravensmoor, Relikt-Dialog raus (Trugbild-Meldung).
- R170-R174: Held-Licht-Regler wirken (Licht am Fusspunkt statt aus der
  Figur), Rand-Vignette standard aus (auch das Nacht-Banding), Beute-Doppel-
  senkung aufgehoben (beuteRate 1.0 = 4,5% Ausruestung je Kill), Feuerball ab
  Stufe 1 (vorher gab es auf Stufe 1 KEINEN Zauber), Monster-Ansprung halbiert,
  Wasser-Preset + Ufer-Klang auf Autor-Wunsch zurueckgenommen.
- tsc fehlerfrei, 391 Tests gruen.

## Runde 175 - Minimap-Kartographie (letzter Alt-Backlog-Punkt)
- Minimap zeigt weiter NUR Gesehenes (Sichtlinien-Aufdeckung), ist jetzt aber
  lesbar-huebsch (Pergament-Toene + Wand-Konturen um jeden begangenen Raum,
  pulsierender Held-Punkt), per Mausrad ueber der Karte ZOOMBAR (2-6 px je
  Kachel) und hat das DIABLO-OVERLAY: TAB legt die erkundete Karte gross und
  halbtransparent mittig ueber das Spielfeld. Browser-verifiziert (Screenshot).
- Damit ist die alte Aufgabenliste KOMPLETT abgearbeitet. Naechster Auftrag
  (Autor): Kirche als Verlies-Eingang mit Zelda-Innenraum + Stadtportal-Quest.

## Ravensmoor-Pferdebestand - vier Varianten live

- Am 3D-Pferdestall S2 stehen vier echte Pferde-Entities. Die Platzierung folgt
  den exportierten GLB-Markern statt fest in ein Hausbild gebackener Pferde.
- Das Heldenpferd ist schwarz. Die bisherige dunkelbraune Abnahme lebt in einem
  kraeftigeren Arbeitspferd weiter; hinzu kommen gedeckter Fuchs und warmes Braun.
- Alle vier sind mit E reitbar und behalten ihre Variante durch alle Gangarten
  und Atlaswechsel. Beim Pferdewechsel bleibt das vorige Pferd in der Welt.
- Stallknecht Hanko fuehrt die drei Arbeitspferde tagsueber in einer ruhigen,
  raeumlich getrennten Hofrunde; das schwarze Heldenpferd wartet ungeritten.
- Browser-Abnahme: vier Pferde am Stall, Namenshinweis, Aufsitzen auf die
  Fuchsstute und Reiterdarstellung funktionieren ohne Pferde-/Konsolenfehler.
- Produktions-Build sowie 63 Testdateien / 397 Tests sind gruen.
## Skelettwache - Blender-Animation und RTS-Testeinheit

- Das modulare Skeleton-Guard-Fab-Asset ist als dunkle, gepanzerte Skelettwache
  mit beidhändig geführtem Speer umgesetzt. Blender rendert 576 Frames in acht
  Richtungen: Stand, geerdetes Gehen, Stich, Doppelstich, Rundumschlag,
  Trefferreaktion und seitlicher Tod.
- Der 1920 x 7680 grosse Phaser-Atlas bleibt WebGL-sicher. Alle Frames besitzen
  dieselbe Bodenlinie und einen dezenten Kontaktschatten; Speerspitze und
  Todespose bleiben vollständig in der 160-px-Zelle.
- In `RTS -> Dev/Test -> Feind-Monster` erscheint `Skelettwache`. Sie hat 720 HP,
  Stichschaden, gepanzerte Knochen-Tags und eine seltene echte Flaechenattacke.
- Live im Browser geprueft: Testeintrag sichtbar, Platzierung funktioniert,
  Textur wird geladen, die Einheit läuft zum Ziel und spielt ihre Angriffsfolge
  ohne Konsolenfehler. Produktions-Build und 62 Testdateien / 394 Tests sind gruen.
## Runde 176 - Die Kirche ist der Verlies-Eingang + Stadtportal-Quest
- Der Weg ins Verlies fuehrt jetzt DURCH die Kirche (Zelda-Prinzip): an der
  Tuer der 3D-Kirche oeffnet E das Kirchenschiff (Schluessel-Gate bei Pater
  Johannes bleibt), drinnen liegt der "Geheimgang unter dem Chor" (Wendel-
  treppe links vom Altar, Angst-Prolog beim ersten Abstieg) hinab in die
  Krypta. Die R157-Aussentreppe auf dem Vorplatz ist weg; der Kirchhof-
  Ausgang bringt einen vor die STADT-Kirche (nicht mehr ins Archiv-Dorf).
  Die Tuer-Erkennung haengt an den echten Tueren des 3D-Modells - verschiebt
  der Autor die Kirche im Dorf-Editor, wandert der Eingang mit.
- Stadtportal ist QUEST-Belohnung: neue Nebenquest "Der Weg zurueck ans
  Licht" - wer die dritte Verlies-Ebene erreicht, schaltet das Portal frei
  (vorher: erst nach dem Boss). Meldung + Chronik beim Freischalten,
  Zeile in der Aufgabenliste; Portal-ROLLEN wirken weiterhin jederzeit.
- Browser-verifiziert (Playwright, komplette Kette): Kirchentuer zu/auf ->
  Kirchenschiff -> Kirchhof zurueck zur Stadt -> Portal in crypt1 abgelehnt,
  nach Betreten von crypt3 freigeschaltet und traegt in die Stadt. tsc
  fehlerfrei, 391 Tests gruen.
- Ausdruecklich SPAETER (Autor-Plan, in TODO.md): Zelda-Innenraum fuer jedes
  Haus + Verschoenerung des Kirchenschiffs mit Codex/Blender-Assets.

## Runde 177-179 - Verteidigung am Hauptweg, Kloster-Spaeher, der Bote
- R177: Verstaerkung, die Ravensmoor erreicht, bleibt nicht mehr an der Kante
  stehen - sie rueckt selbststaendig in STELLUNGS-LINIEN quer ueber die
  Nord- und Ost-Strasse (dort, wo Einfall und Spaeher kommen). Browser-
  verifiziert: 6 Grafen-Maenner marschieren exakt auf die beiden Linien.
- R178: das Kloster schickt alle paar Minuten 1-2 Kundschafter ueber die
  Nordstrasse ("Kloster-Spaeher", flache Gegner, ab Tag 2, nie waehrend
  eines Einfalls) - die Stadt bleibt spuerbar bedroht. Browser-verifiziert.
- R179: der GRAFEN-RUF laeuft jetzt ueber den BOTEN (Autor-Order). Schulze
  schickt ihn (Dialog), oder man baut im Feldlager einen BOTENPOSTEN
  (RTS-Bau, Versorgung) - dann reitet der Bote samt Pferd aus Ravensmoor
  heran und wartet dort. Der Ritt zur Fuerstenburg (echte burg-Karte) ist
  ABFANGBAR (8%/Teilstrecke, 20% im Krieg); faellt er, ruestet sich nach
  5 Minuten ein Ersatz. Ankunft loest die Grafen-Kolonne aus. Reine Logik
  in logic/bote.ts (5 Tests), Bote wird gespeichert. Browser-verifiziert:
  kompletter Ritt, Posten-Bezug, Ritt vom Posten. Der Reiter ist noch
  NICHT als Figur sichtbar (Meldungen/Chronik erzaehlen den Ritt) - steht
  in TODO.md; sein Name gehoert dem Autor (OFFENE-FRAGEN).
- tsc fehlerfrei, 402 Tests gruen (64 Dateien).

## Runde 182 - Feldzug-Auftakt: Boten-Tempo, Feind-KI-Plan, Gebietslage (F1)
- Bote galoppiert jetzt (15s je Karte, Audienz 5s) - Boten-Kette ab Nord-
  Lager ~7:35 statt 9:30; der grosse Rest ist der bewusst schwere
  Kolonnen-Fussmarsch (eigener Regler). Niederlagen-Regel festgehalten:
  man verliert NIE komplett (letzter Rueckzugsort: Fuerstenburg, offen).
- Deine Feind-KI-Recherche ist gesichtet: docs/design/07-FEIND-KI.md haelt
  fest, was uebernommen wird und was nicht (Kavallerie, Armbrust und
  Belagerungsgeraet fliegen raus - deine eigenen harten Regeln 5/6).
- F1 GEBIETSLAGE ist GEBAUT und verifiziert: jede Karte ist frei/umkaempft/
  besetzt (Start: Monsterlager, Verfallene Stadt, Klosterberg besetzt).
  Der KARTE-Tab zeigt es (rote Rahmen + BESETZT-Stempel, orange UMKAEMPFT
  bei laufendem Einfall), Aenderungen landen im Log + Kriegstagebuch,
  alles im Spielstand. Screenshot der Karte liegt vor. tsc + 405 Tests gruen.

## Runde 183 - F2: Der Feind fuehrt Krieg (Produktion + Expansion)
- Ab dem Krypta-Boss produzieren die drei Feindlager Kampfkraft und greifen
  nach den Nachbarkarten: erst Kundschafter (Vorwarnung im Log), dann eine
  an der Sichtung bemessene Welle. Ohne Verteidigung faellt die Karte
  (Garnison zieht sich Richtung Ravensmoor zurueck - niemand stirbt mit der
  Karte); steht der Held dort, kommt die Welle REAL ueber die Kante (zaehe
  Feind-Trupps, Deckel 10). Saeubern gewinnt die Karte zurueck.
- Im Test lief exakt die Autor-Geschichte: die Verfallene Stadt nahm zuerst
  RABENHAIN, waehrend das Kloster das Alte Schlachtfeld ausspaehte - zwei
  Fronten, alles im Kriegstagebuch und auf der Karte (F1-Faerbung).
- Browser-verifiziert (komplette Kette: Spaeher -> Angriff -> erobert ->
  gesaeubert -> Live-Welle -> zurueckgeschlagen), tsc fehlerfrei, 410 Tests.

## Runde 184a - Drei Kern-Bugs aus dem Autor-Test (Performance, Gegenwehr, XP)
- 1-FPS-Einbruch bei bewegten Formationen: Wegfindung rechnete je Einheit
  und Frame ein Voll-Karten-Flussfeld - Freie-Bahn-Abkuerzung + Cache-
  Buendelung + Weck-Drossel. Marsch kostet jetzt nichts mehr extra (1,0x).
- "Nur 1-2 von 10 wehren sich": der Stellungs-Befehl blockierte die
  Gegenwehr komplett - Wachen lassen die Stellung jetzt fallen, wenn ein
  Gegner in Reaktionsweite ist. 10/10 kaempfen im Test.
- Held-XP-Lecks gestopft: Bewohner-Kaempfer- und Skelettwache-Kills gaben
  faelschlich Held-XP. Die "Erfahrung fuer die Fuehrung"-Meldung nach
  gewonnener Schlacht ist das gewollte R147c-System.
- Offen als Aufgaben: unsichtbare Wand Waldrand + Fluss-Neuverlegung,
  Pult-UI (Gebaeude-Karte/Tooltips/Schrift/Formations-Ebene), Heer-
  Ausruestung, Rueckzugs-Befehl + sichtbare Reparatur. Feldzug-Plan um
  Schachmatt-Endgame, Rueckzugsweg und Spieler-KI-Konzept erweitert.

## Runde 185 - Fluesse neu verlegt (achsentreu, nach deiner Skizze)
- Alle Tabellen-Fluesse laufen jetzt wie in der ravenkarte gezeichnet:
  senkrecht oder waagerecht mit leichtem Schlaengeln und RUNDEN Ellbogen -
  keine diagonalen Boegen mehr quer ueber die Karte. Kanten-Anschluesse an
  die Nachbarn unveraendert. Die frueher abgeschnittene Nordost-Ecke der
  Verfallenen Stadt ist frei; stadt2->Schlachtfeld, Stadt->West und
  Waldrand->Ost sind per Kollisions-BFS bestaetigt erreichbar.
- Dazu R184: der Waldrand recarvt seine Wasser-Kollision jetzt nach der
  SICHTBAREN Geometrie (unsichtbare Alt-Fluss-Wand weg) und R192: die
  Zuflucht-Lore (Burg nimmt keine Fluechtlinge) beim ersten Stadtbesuch.

## Runde 193 - Skelettwache: dynamischer Lauf und schlagfertige Speerkombos
- Blender-Pass ueber alle sieben Clips und acht Richtungen: groesserer,
  geerdeter Schritt mit Gewichtsverlagerung von Becken/Rumpf, lesbare diagonale
  Speerstiche sowie ein echter Ganzkoerper-Rundumschlag. Der 576-Frame-Atlas
  wurde mit Blender 5.1 vollstaendig neu gerendert und WebGL-sicher gepackt.
- Kampfcode und Clip sind jetzt eine Zeitleiste: Stichkontakt bei 0,30 s,
  erster Kombotreffer bei 0,34 s, zweiter Treffer 0,24 s spaeter. Weg sind die
  vorherige 1,3-s-Pauschalpause, der Hit-Clip-Sprung mitten im Angriff und das
  Umspringen der Blickrichtung waehrend eines laufenden Speerhiebs.
- Die Wache pariert kuerzer und kontert mit ihrem eigenen Speerstich. Kombo und
  Stich kommen haeufiger zum Einsatz; der Rundumschlag bleibt der seltene,
  deutlich lesbare Spezialangriff.
- Browser-Abnahme: `RTS -> Dev/Test -> Feind-Monster -> Skelettwache` sichtbar,
  Tooltip und Platzierungsmodus funktionieren, neuer Atlas wird geladen,
  keine Browser-Konsolenfehler. Produktions-Build sowie 66 Testdateien / 412
  Tests sind gruen.
## Runde 186 - Kommando-Pult-Paket (+ Feind-Karten)
- Gebaeude werden komplett im PULT gesteuert: Karte mit Zustand, Beschreibung,
  Reparieren/Abbauen und Sonderaktionen (Wartfeuer/Tor/Botenposten) - das
  alte Schwebe-Fenster ist raus. Schrift im Raster deutlich groesser,
  Tooltips auf ALLEN Knoepfen, und der Formation-Knopf oeffnet jetzt eine
  eigene Ebene mit allen Formationen + Abstand + Zurueck.
- Gegner anklicken zeigt ihre FEIND-Karte im Pult (Name, Leben, Schaden,
  Kampfart, Elite/Anfuehrer-Merkmal). Browser-verifiziert mit Screenshot;
  tsc + 410 Tests gruen. Bilder auf den Knoepfen folgen spaeter (Autor).

## Runde 187 - Heer-Ausruestung (Von-Bis-Waffen, Leder/Kette, Uebergabe)
- Jeder Soldat traegt jetzt eine echte Grundausstattung: Heerklinge 5-8 /
  Heerbogen 4-7 (wuerfelt je Schlag wie Spielerwaffen) und Lederwams bzw.
  Kettenhemd, das eingehenden Schaden real daempft - kein "Stoff", kein
  fixer Streitkolben-Wert mehr. Die Soldaten-Karte im Pult zeigt Waffe,
  Spanne und Schutz.
- NEU: "Ausruesten"-Knopf auf der Soldaten-Karte - der Held schiebt Waffen
  oder Ruestungen aus seinem Rucksack an einzelne Maenner (z.B. eine
  epische Klinge an den Veteranen). Der Gegenstand wandert ins Roster,
  wirkt sofort (5-8 wird mit +6-Klinge zu 11-14) und kommt beim Ersetzen
  zurueck in den Rucksack. Alles im Spielstand.
- Browser-verifiziert (Grundwerte, Uebergabe, Ruestungs-Daempfung 10->9),
  tsc fehlerfrei, 412 Tests gruen.

## Runde 191 - Rueckzugs-Befehl + sichtbare Reparatur
- RUECKZUG ist ein sichtbarer Punkt im Kommando-Raster: die Truppen der
  Karte weichen zur freien Nachbarkarte Richtung Zuflucht aus (verifiziert:
  stadt -> Finsterhain), die Bewohner rennen ins Gemeindehaus.
- Reparieren ist Handwerk geworden: ein benannter Soldat geht zum Bau und
  haemmert sichtbar 4 Sekunden, dann steigt der Zustand (verifiziert:
  10 -> 24 LP durch "Cord der Stille"); ohne Leute in der Naehe gibt es
  keine Zauber-Reparatur mehr. tsc + 412 Tests gruen.

## F5 - Der Fall von Ravensmoor (Sturm, Treck, Rueckeroberung)
- Der grosse Einfall ist jetzt der ANFANG VOM FALL: endloser Nachschub
  (alle 18s), nach 30s bricht der GOLEM ueber die Nordstrasse herein, nach
  75s kommt die ehrliche Ansage "nicht zu halten - Rueckzug!".
- Weicht der Held (Karte verlassen oder Rueckzugs-Befehl), FAELLT die
  Stadt: Lage besetzt, Feindlager + Bindealtar stehen, die Bewohner sind
  fort (Treck, 4 Minuten Weg) und erreichen die Zuflucht im Norden.
- In der besetzten Stadt sind alle Bewohner unsichtbar (schon beim
  Betreten, nicht erst im Dorfleben-Takt) - und mit der normalen
  Saeuberung (F2/F3) kommt alles zurueck: Lage frei, Bewohner daheim,
  Chronik-Eintrag "Ravensmoor ist zurueckerobert".
- In der gefallenen Stadt starten keine Einfaelle mehr (Sperre) - sonst
  haette der Nacht-Trigger die Rueckeroberung gestoert.
- Browser-verifiziert (kompletter Durchlauf Sturm -> Fall -> Zuflucht ->
  Rueckeroberung, alle 6 Stationen gruen), tsc + 414 Tests gruen.
- Man verliert NIE komplett (Autor-Order): der Fall ist ein Story-Tal,
  kein Game Over - Burg und Zuflucht stehen immer.

## F6 - Balance-Pass Ueberlegenheit (Dok 06 Teil H)
- Der Golem ist jetzt eine echte ELITE-Aufgabe: allein prallt der Held an
  seinem Panzer ab (15% Schaden kommt durch, verifiziert 100 -> 15), erst
  von drei Seiten GEBUNDEN faellt er (60%, verifiziert 100 -> 60). Der
  Held wurde dafuer NICHT geschwaecht - die Armee wird wichtig, weil sie
  bindet, was er allein nicht binden kann.
- Angriffs-Slots wirken in BEIDE Richtungen: Monster umringen jetzt auch
  Soldaten (verifiziert: 6 von 6 Nahkaempfern bekommen Ring-Plaetze um
  einen Soldaten), Soldaten umringen Feinde - Einkreisung ist allgemein.
- Wellen-Deckel: der Sturm-Nachschub pausiert bei 16 lebenden Feinden
  (verifiziert: voller Deckel -> 0 Nachschub, freier -> Nachschub kommt).
- Feldzug-Wellen marschieren als FORMATION (Reihen zu 5) und greifen auf
  breiter Front an (verifiziert: 10 Mann, 5 Zielpunkte).
- Blutlager-Comeback: ein verlorenes Feindlager kostet die Horde die
  Haelfte ihrer Ruecklagen und drosselt die Produktion 150s auf 35%
  (Vitest, 2 neue Tests).
- tsc + 414 Tests gruen, alle Werte in src/data (FELDZUG).
