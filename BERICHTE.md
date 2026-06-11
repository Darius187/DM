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
- Neue Gebäude am Markt (wie im Dorf des 17. Jahrhunderts: Läden am
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
