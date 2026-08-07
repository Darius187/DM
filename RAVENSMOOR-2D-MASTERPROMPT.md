# RAVENSMOOR - Der Preis der Unsterblichkeit
## Masterprompt für Claude Code: Die große 2D-Version (Stardew trifft Diablo)

Dieses Dokument ist eigenständig. Es setzt KEIN Vorwissen über frühere Projekte,
Chats oder eine 3D-Version voraus. Alles, was du zum Bauen brauchst, steht hier
oder in der Referenzdatei.

---

# TEIL 1: WAS GEBAUT WIRD

## 1.1 Elevator Pitch

Ein browserbasiertes 2D-Action-RPG im Deutschland des Jahres 1349 (Schwarzer Tod /
Pestzeit, Heiliges Römisches Reich - rund um den Hundertjährigen Krieg, Langbogen
und Armbrust statt Schießpulver). Der Spieler erhält im Dunkelwald einen Auftrag seines Landherrn, nach dem
Dorf Ravensmoor zu sehen, aus dem beunruhigende Berichte kommen. Dort entfaltet
sich eine Horrorgeschichte um eine Krypta unter der Dorfkirche, einen lebendig
begrabenen Tempelritter und ein Relikt, das Unsterblichkeit verspricht - zu einem
furchtbaren Preis.

Spielgefühl: Die Kampfmechanik von Dark Souls (Blocken, Parieren, Ausweichrolle,
bewusste Angriffe) in der isometrisch wirkenden 2D-Draufsicht von Diablo 1 -
aber FEEL-GOOD statt hart. Dazu eine Stardew-Valley-Schicht: ein lebendiges
mittelalterliches Dorf, Crafting, Wiederaufbau, eine kleine Farm, Handel und
Fertigkeiten, die durch Benutzung wachsen. Optik-Vorbilder: Zelda - A Link to
the Past und Stardew Valley (Pseudo-3D durch Tiefenstaffelung).

## 1.2 Die Original-Wünsche des Autors (wörtlich, als verbindlicher Kontext)

Die folgenden Sätze stammen wörtlich vom Autor (Darius). Sie definieren Absicht
und Tonalität. Bei Auslegungsfragen gilt: im Geist dieser Sätze entscheiden.

Zur Optik und Stimmung:
> "das inventar grafisch aufbessern und allgemein die gegner oder die hauptfigur
> oder vielleicht das gesamte dorf noch etwas mehr stimmung mit pseudo 3d diese
> 2d landschaft wie z.b. bei zelda link to the past oder stardew valley oder
> ähnliches"

Zu Items und Sammelwut:
> "gibt es auch seltene oder epische gegenstände nach farben wie bei wow sortiert
> die leuchten als beispiel? oder man kann die mit etwa sockeln damit es
> feuerschaden oder eisschaden oder schattenschaden macht und dann verschieden
> leuchtet... braucht da mehr highlights auf die ich mich freue und mehr
> sammelwut"

Zum Speichern:
> "auch einen speicherpunkt ähnlichen zustand, also wenn ich pause machen will
> und später weiter oder wenn ich sterbe will ich nicht bei 0 anfangen oder
> vielleicht nur in der stadt und muss dann wieder runter"

Zu Effekten:
> "da geht noch einiges mehr an effekten habe ich das gefühl.. also mehr
> leuchteffekte und spezialeffekte aber muss nicht überladen sein eher dezent
> aber vorhanden"

Zu den Dungeon-Räumen:
> "die räume dürften auch interessanter sein durch was auch immer weil so ist es
> nur ein langweiliges labyrith, mache vorschläge.. bücherregale evtl. in denen
> bücher drin sind, schicke truhen die man öffnen, unterirdische brunnen mit
> blut, düstere skeletträume oder folterkeller oder was anderes besonderes
> interessantes mit etwas story die zur lore passt"

Zur Sprache:
> "hast du auch die englischen texte überarbeitet da ist englisch mit deutsch
> gemischt" (Konsequenz: ALLE Spieltexte sind durchgehend Deutsch)

Zum Dorf:
> "das städtchen am anfang könnte auch etwas größer sein und interessanter wie
> ein dorf damals im mittelalter aufgebaut mit mühle, schmied, und so..."

Zu Crafting und Aufbau:
> "evtl. auch crafting .. das abgebrannte haus wieder aufbauen... im wald holz
> hacken um material zu holen... steine farmen... feuer machen im kamin ...
> einrichten... oder eine farm wie bei stardew valley einbauen.. mehr handel
> treiben mit den lokalen einkaufsläden... farmer sind dort auch mit tieren..
> wie stardew valley könnte sogar die perspektive sein"

Zu Fertigkeiten:
> "deine skills werden stärker wenn man mit schwert kämpft oder wenn man zaubert
> dann werden die skills im zaubern besser und schalten neue fähigkeiten frei
> und bogenschießen ... heilfähigkeiten als zaubersprüche.. zauberrollen..."

Zu Portraits:
> "coole bilder als charakterfenster die ich dir schicke die mir chatgpt
> herstellt für rüstung und charaktäre"

Zum Story-Einstieg:
> "das darf sich sogar an unserem tabletop spiel orientieren ... man startet
> zuerst im dunkelwald weil man eine aufgabe bekommen hat vom landlord (oder so)
> und kommt dann zu dem dorf um nach dem rechten zu sehen"

Zu Sounds und Waffen:
> "wie sieht es mit sounds aus? [...] die schläge vom charakter dürften auch
> anders sein also verschiedene schläge ausüben.. einen rundumschlag oder einen
> geradeaus schlag... hellebarden, äxte, schwerter, haben verschiedene sounds
> und bewegungen"

Frühere Leitsätze des Autors zum Spielgefühl (verbindlich):
> "Die Spannung kommt aus der Dunkelheit, nicht aus der Härte."
> "Klickspam wird bestraft, aber Eingaben fühlen sich nie verschluckt an.
> Niemals das eine für das andere opfern."

Wichtige spätere Entscheidung des Autors:
> "ich will die ausdauer nicht, die darf weg."
(Konsequenz: Es gibt KEINE Ausdauer-Mechanik. Rhythmus entsteht ausschließlich
über Angriffs-Erholzeiten, Commitment bei schweren Hieben und Gegner-Telegraphen.)

---

# TEIL 2: VERBINDLICHE REFERENZ

## 2.1 Die Referenzdatei

Im Projektordner liegt (oder wird vom Autor abgelegt): `reference/ravensmoor-v2.html`

Das ist ein vollständig spielbarer Einzeldatei-Prototyp. Er ist die
INHALTS-WAHRHEIT. Das heißt konkret, daraus werden 1:1 übernommen (nicht neu
erfunden):

- Alle deutschen Texte: NPC-Dialoge (Heinrich Kramer, Pater Johannes, Magdalena),
  die Ich-Erzähler-Interludien "Aus meinen Aufzeichnungen", die drei
  Lore-Notizen, beide End-Texte, Titel- und Todestexte
- Item-Tabellen: Waffen (Rostige Klinge bis Kriegshammer, inkl. Streitaxt und
  Hellebarde), Rüstungen, Ringe, Präfixe/Suffixe, Affix-Pools (Schaden, Rüstung,
  Leben, Mana, Lebensraub, Lichtradius bei Ringen)
- Raritätensystem: Gewöhnlich (weiß) / Magisch (blau #8aa6e8) / Selten (gold
  #e0b53a) / Episch (lila #b048e8), Drop-Wahrscheinlichkeiten wie in der Referenz
- Edelstein-/Sockelsystem: Feueropal, Frostsplitter (verlangsamt), Schattenperle
  (heilt den Spieler), Werte und Farben aus der Referenz
- Gegnerwerte: Pestopfer, Skelett, Skelett-Schütze, Grabschatten, Elite-Affixe
  (Schnell, Vampirisch, 10% Chance, garantierter Drop), Boss "Der Tempelritter"
  (Phasen, Beschwörung bei 66%/33%, Slam-Telegraph, Projektilfächer in Phase 2)
- Balancing-Basiswerte: Spieler-HP/Mana-Formeln, XP-Kurve, Goldverlust beim Tod,
  Trank-Heilwerte, Zauberkosten (Feuerball, Heiliges Licht, Heilung)
- Krypta-Themen: Ebene 1 "Gruft", Ebene 2 "Beinhaus", Ebene 3 "Die alte
  Kultstätte", Bossraum "Grab des Kreuzritters" - mit ihren Farbpaletten
- Spezialinhalte: Opferaltäre mit Zufallseffekten, Bibliotheksräume mit
  Folianten, Truhen, Blutbrunnen, Lichtsäulen über Drops in Raritätsfarbe
- Speichersystem-Verhalten: Autosave bei Gebietswechsel, Laden-Button,
  Einstellungen (Tastenbelegung, Lautstärke, Helligkeit, Bildschirmwackeln,
  Schadenszahlen, Blut an/aus, Linkshänder-Modus)

KONFLIKTREGEL: Wo dieses Dokument (besonders die Kampf-Spezifikation in Teil 4)
von der Referenzdatei abweicht, gilt dieses Dokument. Die Referenz ist die
Wahrheit für INHALTE, dieses Dokument für SPIELGEFÜHL und STRUKTUR.

Falls die Referenzdatei fehlt: STOPPEN und den Autor bitten, sie abzulegen.
Keine Inhalte erfinden.

## 2.2 Falls bereits Code im Projekt liegt

Falls der Projektordner bereits ein Phaser-3-Spiel zu Ravensmoor enthält:
darauf aufbauen, nichts wegwerfen, dieses Dokument als Ausbauplan behandeln.
Falls der Ordner leer ist: neu aufsetzen nach Teil 3.

---

# TEIL 3: TECHNIK UND ARBEITSWEISE

## 3.1 Stack

- Phaser 3 + TypeScript + Vite
- Begründung: Webprojekt, das du (Claude Code) selbst verifizieren kannst -
  Dev-Server starten, Screenshot machen (z. B. via Playwright), prüfen
- Datengetrieben: Items, Gegner, Dialoge, Loot-Tabellen, Rezepte, Dorf-Layout
  als JSON/TS-Daten unter `src/data/`, nicht hart im Code verdrahtet
- Tests: Vitest für reine Logik (Schadensrechnung, Loot-Rolls, Skill-Fortschritt,
  Speichern/Laden-Roundtrip, Crafting-Rezepte)
- Speicherung: localStorage, JSON-versioniert, mit try/catch abgesichert

## 3.2 Harte Regeln

1. ALLE Spielertexte auf Deutsch. Kein Sprachmix. Typografie: "-" statt "—".
2. Niemals behaupten, etwas sei fertig, was nicht im Browser verifiziert wurde.
3. Keine Platzhalter als Endergebnis ausgeben. Programmatisch gezeichnete
   Sprites sind okay (siehe 5.1), aber sie müssen dem Stil-Anspruch genügen.
4. Inhalte aus der Referenz portieren, nicht paraphrasieren.
5. Jede Phase endet mit: Tests grün + Browser-Screenshot + kurzem Abnahmebericht.
6. Keine Ausdauer-Mechanik. Nirgends.
7. Eine `DebugArena`-Szene existiert von Anfang an: leerer Raum, ein Dummy-Gegner
   jedes Typs auf Knopfdruck spawnbar, Anzeige von Hitboxen/Timings per Taste.
   Dort wird das Kampfgefühl getunt, BEVOR Inhalte gebaut werden.

## 3.3 Assets vom Autor (Bilder aus ChatGPT, Sounds) - Hot-Swap-Prinzip

Der Autor erstellt Bilder mit ChatGPT und lädt sie NACH UND NACH hoch. Deshalb
gilt das Hot-Swap-Prinzip: Das Spiel prüft beim Start, welche Dateien in den
Asset-Ordnern liegen, nutzt vorhandene automatisch und fällt für alles Fehlende
auf programmatisch gezeichnete Versionen zurück. Es darf NIE etwas kaputtgehen,
weil ein Bild fehlt, und NIE Code-Anpassung nötig sein, weil eines dazukommt.

Ordner und Namenskonventionen (exakt so erwarten):

- `assets/portraits/` - Charakterbilder für Dialoge und Charakterfenster:
  `spieler.png, heinrich.png, magdalena.png, johannes.png, landherr.png,
  schmied.png, mueller.png, bauer1.png, bauer2.png, haendler.png`
  Auch Varianten erlaubt: `spieler_ruestung2.png` usw. (Charakterfenster zeigt
  passend zur angelegten Rüstungsstufe, falls Varianten existieren).
- `assets/items/` - Item-Bilder für Inventar, Tooltips und Händler:
  Schema `<typ>_<basisname>.png`, Basisname kleingeschrieben, Umlaute
  ausgeschrieben, z. B.:
  `waffe_rostige-klinge.png, waffe_kurzschwert.png, waffe_streitkolben.png,
  waffe_langschwert.png, waffe_streitaxt.png, waffe_reiterdegen.png,
  waffe_hellebarde.png, waffe_kriegshammer.png, waffe_jagdbogen.png,
  waffe_kriegsbogen.png, ruestung_lumpen.png, ruestung_lederwams.png,
  ruestung_gambeson.png, ruestung_kettenhemd.png, ruestung_kuerass.png,
  ring_knochenring.png, ring_siegelring.png, ring_silberring.png,
  ring_eisenring.png, edelstein_feueropal.png, edelstein_frostsplitter.png,
  edelstein_schattenperle.png, trank_heil.png, trank_mana.png,
  schriftrolle.png, pfeile.png, relikt.png`
- `assets/sounds/` - CC0-Sounds (.ogg/.wav), Kategorien siehe Teil 9.
  Fallback: WebAudio-Synthese.
- `assets/title/ravensmoor-title.jpg` - Titelbild. Fallback: atmosphärischer
  programmatischer Hintergrund (Kirche im Nebel als Vektorszene).

Technische Behandlung der Bilder:
- Erwartet werden PNG, quadratisch, 256x256 bis 1024x1024 (Portraits gern
  512x512). Beim Import auf Zielgröße skalieren.
- ChatGPT liefert oft KEINEN transparenten Hintergrund. Deshalb beim Import:
  wenn ein Item-Bild einen annähernd einfarbigen Hintergrund hat, per
  Farbtoleranz-Key freistellen (Eckpixel als Referenzfarbe). Portraits werden
  nicht freigestellt, sondern in einen Rahmen gesetzt.
- Raritätsrand und -glühen legt das SPIEL über das Item-Bild, nicht das Bild
  selbst (dasselbe Schwertbild kann gewöhnlich bis episch sein).

PFLICHT in Phase 0: Eine Datei `ASSETS-LIESMICH.md` im Projektstamm erzeugen,
die ALLE erwarteten Dateinamen als Checkliste auflistet, mit Bildgröße und
einem fertigen ChatGPT-Prompt-Vorschlag pro Kategorie (einheitlicher Stil:
"düsteres Gemälde, 14. Jahrhundert / Pestzeit, dunkler neutraler Hintergrund"), damit
der Autor die Bilder Stück für Stück abarbeiten kann. Bei jedem Spielstart
loggt das Spiel in der Konsole, welche Assets gefunden wurden und welche noch
auf Fallback laufen.

---

# TEIL 4: KAMPFSYSTEM ("Bewusst, aber Feel-Good")

Doppeltes Abnahmekriterium, beides muss gelten:
(a) Klickspam wird bestraft - wer blind drückt, steht in Gegner-Angriffen.
(b) Keine Eingabe fühlt sich verschluckt an - Puffer und Abbruchfenster sorgen
    dafür, dass gewollte Aktionen kommen.

## 4.1 Spieler-Aktionen

- Leichter Angriff: 3er-Kombo mit Finisher (3. Hieb: +45% Schaden, mehr
  Rückstoß, breiterer Bogen). Eingabe-Puffer 250 ms. Erholphase ab 50% durch
  Rolle oder Block abbrechbar.
- Schwerer Hieb (Shift / eigener Touch-Button): 0,6 s Ausholzeit, volles
  Commitment (nicht abbrechbar), ca. 2,2x Schaden, durchbricht Gegner-Haltung.
- Blocken (halten): reduziert Schaden auf 30%. Kein Guard-Break.
- Perfekte Parade: Block in den ersten 300 ms eines eintreffenden Treffers ->
  Gegner taumelt 0,9 s, nächster eigener Hieb +100% Schaden (Riposte). Die
  Parade ist Stil-Belohnung, nie Pflicht.
- Ausweichrolle: 300 ms Unverwundbarkeit, kurze Distanz, Abklingzeit 0,9 s.
- Hit-Stop bei Treffern: leicht 50 ms / Finisher 80 ms / schwer+Parade 100 ms.
- Dreifaches Treffer-Feedback immer zusammen: Hit-Stop + Partikel + Sound.
- Schadenszahlen schweben auf (abschaltbar in den Einstellungen).

## 4.2 Waffenklassen mit eigenen Movesets und Sounds (Wunsch des Autors)

| Klasse | Beispiele | Moveset | Klangcharakter |
|---|---|---|---|
| Schwerter | Kurzschwert, Langschwert, Reiterdegen | klassische 3er-Kombo, schnell | helles Schwirren, metallisch |
| Äxte | Streitaxt | 2er-Kombo, 3. Eingabe = RUNDUMSCHLAG (360°, trifft alle Gegner im Radius) | dumpfes Wuchten |
| Stangenwaffen | Hellebarde | GERADEAUS-STOSS mit höchster Reichweite, schmaler Trefferkegel, Rückstoß | Luftschnitt, lang |
| Wuchtwaffen | Streitkolben, Kriegshammer | langsamer Überkopfschlag, kleiner Flächenschaden am Aufschlagpunkt, bester Haltungsschaden | tiefer Schlag, Erde bebt (Mini-Shake) |
| Bogen (NEU) | Jagdbogen, Kriegsbogen | gezielter Schuss (halten = spannen, mehr Schaden), Pfeile als Ressource | Sehne, Pfeifen, Einschlag |

Jede Klasse hat eigene Schwung-/Projektil-Visuals. Gesockelte Edelsteine färben
den Schwung in der Elementfarbe (Feuer orange, Eis hellblau, Schatten violett).

## 4.3 Gegner

- Jeder Gegnertyp hat 2-3 unterscheidbare Angriffsmuster mit klaren Telegraphen
  (rot pulsierender Ring / Ausholanimation, 0,35-0,85 s Vorwarnung).
- Gegnerschaden: ein normaler Treffer kostet 10-16% der Spieler-Maximal-HP.
- Hören vor Sehen: Gegner sind ab ca. 1,5-facher Sichtweite hörbar
  (Positions-Audio: Schlurfen, Knochenklappern, Flüstern), bevor man sie sieht.
- Lauernde Gegner (z. B. Pestopfer, die sich aus Leichenhaufen erheben) geben
  0,8 s Audio-Vorwarnung. Maximal 2 Skript-Schreckmomente pro Ebene
  (z. B. ein Sargdeckel, der aufspringt).
- Elite-Gegner (10%): Affixe Schnell / Vampirisch, goldener Ring + Namenszug,
  größer, garantierter Drop höherer Stufe. Aus der Referenz übernehmen.

## 4.4 Tod und Rasten

- Tod: 15% Goldverlust, Erwachen in Ravensmoor (Taverne). Ausrüstung,
  Erfahrung, Fortschritt bleiben. Krypta-Ebenen werden neu bevölkert.
- Kerzenschreine in der Krypta (1 pro Ebene): Rasten heilt voll, füllt Flaschen,
  setzt KEINE Gegner zurück (Feel-Good-Entscheidung), dient als Rücksetzpunkt
  innerhalb der Krypta und als Speicherpunkt.

---

# TEIL 5: OPTIK - PSEUDO-3D WIE ZELDA LTTP / STARDEW VALLEY

## 5.1 Grundprinzipien

- Y-Sortierung ALLER Entities und Objekte: was weiter unten steht, wird vor dem
  gezeichnet, was weiter oben steht. Der Spieler kann hinter Bäumen, Häusern,
  Zäunen verschwinden (obere Hauskante verdeckt ihn, untere nicht).
- Gebäude mit Tiefe: sichtbare Fassade (Fachwerk, Fenster mit warmem Licht,
  Türen) + Dach in Schrägansicht, wie in A Link to the Past.
- Figuren als Sprites mit 4 Blickrichtungen und 2-4 Frame Walkcycle. Da der
  Autor keine Sprite-Assets liefert: Sprites zur Buildzeit oder Laufzeit
  PROGRAMMATISCH auf Canvas zeichnen (kleine Pixel-Figuren mit Kopf, Körper,
  Beinen, Waffe in der Hand) und als Texturen einbinden. Qualitätsanspruch:
  erkennbar, charmant, konsistent - keine farbigen Kreise.
- Weiche Schlagschatten unter allen Figuren und Objekten.
- Lichtstimmung: Dorf mit bleiernem Himmel, treibenden Nebelschwaden,
  Schornsteinrauch, beleuchteten Fenstern. Krypta stockdunkel mit Fackellicht
  (Mehrfach-Lichtquellen), Lichtradius des Spielers durch Ring-Affix erweiterbar.
- Effekte dezent, aber vorhanden: Glühen auf seltenen Drops (Lichtsäulen in
  Raritätsfarbe), Funken bei Paraden, Element-Partikel bei gesockelten Waffen,
  Staub bei Rollen, Blutspritzer (abschaltbar). Nichts davon überladen.

## 5.2 Inventar und UI grafisch hochwertig

- Inventar: Item-Karten mit Raritätsrand und -glühen (blau/gold/lila),
  Item-Bilder aus `assets/items/` falls vorhanden (Hot-Swap, siehe 3.3),
  sonst gezeichnete Icons je Typ (Schwert, Axt, Hellebarde, Bogen, Rüstung,
  Ring, Edelstein, Trank, Schriftrolle), Tooltip mit allen Werten, Vergleich
  mit angelegtem Item.
- Charakterfenster: Portrait aus `assets/portraits/` (Fallback: gezeichnet),
  Ausrüstungs-Slots um die Figur (Waffe, Rüstung, Ring, Beutel), Werteübersicht,
  Fertigkeiten-Fortschritt (siehe Teil 6).
- Dialoge mit NPC-Portrait links neben dem Text.
- HUD: Lebens- und Mana-Orbs (Diablo-Stil), Zauberleiste, Flaschen, XP-Leiste.
- Hauptmenü: Titelbild, NEUES SPIEL / LADEN / EINSTELLUNGEN.
- Einstellungen (aus Referenz übernehmen und erweitern): Tastenbelegung frei,
  Lautstärke (getrennt: Effekte / Atmosphäre), Helligkeit, Bildschirmwackeln,
  Schadenszahlen, Blut & Überreste, Linkshänder-Modus (Touch).

## 5.3 Grafik als austauschbares Modul (WICHTIG - Architekturprinzip)

Der Autor will die Grafik später deutlich verbessern können, ohne dass am
Spiel selbst etwas umgebaut werden muss. Deshalb gilt von Anfang an:

- STRIKTE TRENNUNG von Spiellogik und Darstellung. Die Logik kennt nur
  abstrakte Begriffe ("zeichne Entity X an Position Y mit Animation Z") -
  WOHER die Grafik kommt, entscheidet allein eine zentrale Grafik-Schicht
  (z. B. `src/gfx/SpriteProvider.ts`).
- Der SpriteProvider hat zwei Quellen mit klarer Rangfolge:
  1. Echte Grafikdateien aus den Hot-Swap-Ordnern (siehe unten) - wenn
     vorhanden, werden sie genutzt
  2. Programmatisch erzeugte Sprites/Tiles als Fallback
- Zusätzliche Hot-Swap-Ordner für späteres Grafik-Upgrade:
  - `assets/sprites/` - Spritesheets für Figuren, Schema
    `<name>_<richtung>_<frame>.png` (z. B. `spieler_unten_1.png`,
    `skelett_links_2.png`) ODER ein Sheet `<name>.png` mit JSON-Atlas
    `<name>.json` daneben. Beide Varianten unterstützen.
  - `assets/tiles/` - Tileset-Bilder, Schema `<tilename>.png`
    (z. B. `gras.png`, `fachwerk_fassade.png`, `krypta_boden.png`).
    Eine generierte `TILES-LIESMICH.md` listet alle Tile-Namen auf.
- Alle Sprite-Größen, Animationsraten und Tile-Maße leben als Konstanten in
  `src/data/gfx.json`, damit ein Grafik-Upgrade (z. B. von 32px auf 48px
  Tiles) eine Konfigurationsänderung ist, kein Umbau.
- Konsequenz: Ein späteres "Grafik-Upgrade" besteht nur darin, Bilddateien
  in die Ordner zu legen oder die Fallback-Zeichnungen im SpriteProvider zu
  verschönern - die Spiellogik wird dafür NIE angefasst. Das ist die
  optionale PHASE 11 im Phasenplan.

---

# TEIL 6: FERTIGKEITEN, MAGIE, BOGEN ("Learning by doing")

## 6.1 Drei Schulen, Steigerung durch Benutzung

| Schule | steigt durch | alle 3 Stufen neue Fähigkeit |
|---|---|---|
| Nahkampf | Treffer mit Nahkampfwaffen | Stufe 3: Rundumschlag auch für Schwerter (Knopf) · Stufe 6: Sturmangriff (kurzer Ansturm) · Stufe 9: Hinrichtung (Bonus gegen taumelnde Gegner) |
| Zauberei | gewirkte Zauber | Stufe 3: Kettenblitz (springt auf 2 weitere Gegner) · Stufe 6: Frostnova (Kreis, verlangsamt) · Stufe 9: Bannkreis (Fläche, die Untote schwächt) |
| Bogenschießen | Pfeiltreffer | Stufe 3: Mehrfachschuss (3 Pfeile im Fächer) · Stufe 6: Durchschlag (Pfeil durchdringt Gegner) · Stufe 9: Markierter Tod (markierter Gegner erhält +25% Schaden) |

- Fortschritt sichtbar im Charakterfenster (Balken je Schule).
- Jede Schulstufe gibt zusätzlich einen kleinen passiven Bonus
  (+Schaden / -Manakosten / +Pfeilschaden).

## 6.2 Heilung und Zauberrollen

- Heilzauber bleiben (Heilung, Heiliges Licht aus der Referenz), skalieren mit
  Zauberei-Stufe.
- Zauberrollen als Verbrauchsgegenstände (Drops + Händler): wirken einen Zauber
  ohne Manakosten, auch Zauber oberhalb der eigenen Stufe (Vorgeschmack-Design).
- Flaschensystem: 3 Heilflaschen, die an Kerzenschreinen auffüllen; Magdalena
  verkauft dauerhafte Flaschen-Upgrades (+1 Flasche, stärkere Heilung).

---

# TEIL 7: DIE WELT

## 7.1 Gebiet 1: Der Dunkelwald (NEU - Spielstart, Tabletop-Anbindung)

- Kurzes, geführtes Eröffnungsgebiet (10-15 Minuten): dichter, dunkler Wald,
  Nebel, ein Pfad nach Ravensmoor.
- Intro-Szene: Brief/Auftrag des LANDHERRN (Dialogszene mit Portrait): aus
  Ravensmoor kommen keine Abgaben und keine Nachrichten mehr; der Spieler soll
  nach dem Rechten sehen. (Der Autor möchte hier Anknüpfung an sein
  Tabletop-Spiel - Namen/Details des Landherrn so gestalten, dass der Autor sie
  leicht in einer Datendatei `src/data/story.json` anpassen kann.)
- Der Wald lehrt die Steuerung diegetisch: ein Wolf/Wegelagerer als erster
  Kampf, ein umgestürzter Baum als Holzhack-Tutorial, eine Lichtung mit erstem
  Kerzenschrein.
- Erster Ich-Erzähler-Text beim Waldrand (aus der Referenz: "Ich wusste nicht,
  was mich erwartete...").

## 7.2 Gebiet 2: Ravensmoor - ein echtes Dorf des 14. Jahrhunderts (DEUTLICH GRÖSSER)

Mindestens dreimal so groß wie der Referenz-Prototyp. Aufbau entlang der alten
Salzstraße, mit Wegen, Zäunen, Feldern, Bachlauf. Gebäude und Orte:

1. Taverne "Zum Schwarzen Raben" (Heinrich Kramer) - Handel, Gerüchte, Bett
   gegen Gold (= Rasten/Speichern, solange das eigene Haus nicht steht)
2. Kirche St. Marien mit Friedhof (Pater Johannes) - Eingang zur Krypta
3. Magdalenas Hütte am Waldrand - Tränke, Elixiere, Flaschen-Upgrades, Kräuter
4. MÜHLE am Bach (NEU) - Müller als NPC; mahlt Getreide der Bauern; kleine
   Nebenaufgabe (Ratten im Lager / fehlende Lieferung)
5. SCHMIEDE (NEU) - Schmied verbessert Waffen und Rüstungen gegen Gold + Material
   (Eisen aus der Krypta, Kohle vom Köhler): +1 bis +3 Stufen je Item;
   verkauft auch Pfeile und einfache Waffen
6. ZWEI BAUERNHÖFE (NEU) - Bauern-NPCs mit TIEREN (Hühner, Schweine, eine Kuh -
   Tiere laufen in Gattern umher, Pseudo-3D, mit Lauten); verkaufen Saatgut und
   Lebensmittel (kleine Buffs: Brot, Käse, Wurst = Regeneration über Zeit)
7. Marktplatz mit Brunnen und einem fahrenden Händler, dessen Sortiment
   wöchentlich (Spielzeit) wechselt - Sammelwut-Treiber mit seltenen Items
8. Das NIEDERGEBRANNTE GEHÖFT (Kriegsruine) - das Wiederaufbau-Projekt des
   Spielers (siehe 7.4)
9. Kleinigkeiten für Stimmung: Hühner auf der Straße, ein Hund bei der Taverne,
   Wäscheleinen, Heuhaufen, ein Bildstock am Ortsrand, Krähen auf dem Friedhof

NPCs haben einfache Tagesabläufe (morgens Feld, abends Taverne), damit das Dorf
lebt. Kein komplexes Schedule-System nötig - 2-3 Positionen pro NPC je Tageszeit.

## 7.3 Gebiet 3: Die Krypta (aus Referenz, plus interessantere Räume)

Drei prozedurale Ebenen + Bossraum, Themen aus der Referenz (Gruft / Beinhaus /
alte Kultstätte / Grab des Kreuzritters). Damit es "kein langweiliges Labyrinth"
ist, bekommt JEDE Ebene 2-4 handgebaute Spezialräume, die in die prozedurale
Struktur eingewebt werden:

- BIBLIOTHEK: Regale mit erkennbaren Büchern; einzelne Bücher anklickbar mit
  kurzen Lore-Schnipseln; ein vergilbter Foliant gibt Erfahrung (Referenz)
- FOLTERKAMMER (NEU): Streckbank, Käfige, Ketten; Lore-Notiz dazu - die
  Dorfbewohner sperrten hier in der Pestzeit "Veränderte" ein; ein Käfig ist
  aufgebrochen... (1 Skript-Moment erlaubt); seltene Truhe
- SKELETTRAUM / Beinhaus-Schrein (NEU): Wände aus geschichteten Knochen,
  angeordnet "wie Zeichen" (Lore-Notiz Bruder Anselm); betreten weckt eine
  Skelett-Welle; danach öffnet sich ein Beinaltar mit garantiertem Edelstein
- BLUTBRUNNEN-KAMMER: aus Referenz (Trinken: +max. Leben / Vollheilung /
  Schatten erwachen)
- OPFERALTAR-RÄUME: aus Referenz (Diablo-Schrein-Zufallseffekte)
- TRUHEN: 1-2 pro Ebene, golden schimmernd (Referenz)
- ZERSTÖRBARE OBJEKTE (NEU, Diablo-Klassiker): Fässer, Holzkisten, Tonkrüge,
  Knochenhaufen und Spinnweben stehen verteilt in den Räumen und gehen mit
  1-2 Treffern zu Bruch - durch JEDE Angriffsart (Schwert, Axt-Rundumschlag
  räumt ganze Fassgruppen, Pfeile, Feuerball). Mit Bruch-Partikeln, Sound und
  Loot-Tabelle: meist nichts oder ein paar Münzen, gelegentlich Trank oder
  Pfeile, selten ein Item, dazu Crafting-Material (Fässer/Kisten -> Holz,
  beschlagene Truhenkisten -> Eisenreste). Würze: hinter manchen Fässern
  lauert eine Ratte oder ein Pestopfer (zählt zu den max. 2 Skript-Momenten
  pro Ebene). Auch im Dorf vereinzelt zerstörbare Krüge/Heuhaufen, aber ohne
  Loot-Übertreibung - die Welt soll reagieren, nicht zur Loot-Pinata werden.
- KERZENSCHREIN: 1 pro Ebene (Rast-/Speicherpunkt, siehe 4.4)
- GRABKAMMER DER ANNA (NEU, Ebene 2): kleiner Story-Raum zu Heinrichs Frau -
  ein geöffneter Sarg, ein zurückgelassenes Medaillon; das Medaillon kann
  Heinrich gebracht werden (kleine Quest, emotionale Auflösung, Belohnung:
  sein bestes Item + neuer Dialog)
- Lore-Notizen (3 Texte aus der Referenz) + 2 neue passend zur Folterkammer
  und zum Beinhaus-Schrein

## 7.4 Crafting und Wiederaufbau ("Stardew-Schicht")

Ressourcen:
- HOLZ: Bäume im Dunkelwald und am Dorfrand mit der Axt fällen (Baum hat 3
  Schläge, fällt mit Animation, respawnt nach Spielzeit)
- STEIN: Felsbrocken am Wegrand und in der Krypta abbauen (Spitzhacke beim
  Schmied kaufbar)
- EISEN: Erzadern in der Krypta (Ebene 2+)
- KRÄUTER: am Waldrand sammeln (für Magdalenas Tränke-Rezepte)

Wiederaufbau des niedergebrannten Gehöfts in 3 Stufen (beim Schmied/Bauern in
Auftrag geben, kostet Material + Gold, baut sich sichtbar über eine Spielnacht):
1. Stufe 1 - Rohbau: Dach dicht, eine Truhe (Lager), Strohlager (Rasten)
2. Stufe 2 - Wohnhaus: KAMIN (Feuer machen = Buff "Aufgewärmt": +Regeneration
   für den nächsten Kryptagang), richtiges Bett (Speichern + Tag überspringen)
3. Stufe 3 - Hof: kleines FELD (3x3 Beete: pflügen, säen, gießen, ernten -
   Saatgut von den Bauern; Erträge: Nahrung/Buffs oder Verkauf), Einrichtung
   wählbar (3-4 Deko-Sets), Schrein im Garten (Schnellreise Dorf <-> Kryptaeingang)

Die Farm ist bewusst LIGHT: kein Stardew-Vollumfang, sondern ein gemütlicher
Anker, der Heilung/Buffs/Einkommen liefert und das Dorf zum Zuhause macht.

## 7.5 Handel

- Heinrich: Tränke, Gebrauchtwaffen, Ankauf von Beute
- Magdalena: Tränke, Elixiere, Flaschen-Upgrades, Zauberrollen, Rezepte
- Schmied: Waffen/Rüstung, Upgrades, Pfeile, Werkzeuge (Axt, Spitzhacke)
- Bauern: Saatgut, Lebensmittel-Buffs, Tierprodukte
- Fahrender Händler: wechselndes Sortiment, Chance auf Episch
- Ankaufspreise fair, Sammelwut > Goldgrind

---

# TEIL 8: STORY-GERÜST UND TEXTE

1. Intro Dunkelwald: Auftrag des Landherrn (neuer Text, knapp, zeitgemäßer Ton)
2. Ankunft in Ravensmoor: Erzähler-Interludium aus der Referenz
3. Dorf-Phase: Dialoge Heinrich / Magdalena / Johannes (Referenz), Schlüssel
   zur Krypta von Pater Johannes
4. Krypta-Abstieg: Erzähler-Interludien aus der Referenz an den bekannten
   Stellen; Anna-Nebenquest (7.3)
5. Boss: Der Tempelritter (Referenz-Mechanik), sein Flüstern "Erlöse mich von
   meiner ewigen Qual..." (Referenztext)
6. Das Relikt: Entscheidung ANNEHMEN oder ZERSTÖREN - beide Endtexte aus der
   Referenz; nach dem Ende weiterspielbar (Annehmen: +30 max. Leben und
   gelegentliches Flüstern als Audio-Detail; Zerstören: Dorf-NPCs mit
   dankbaren neuen Dialogzeilen)
7. Alle Texte durchgehend Deutsch, Ich-Erzähler in der Wir-Form des Originals
   ("Aus meinen Aufzeichnungen")

---

# TEIL 9: SOUNDS

Erwartete Dateien in `assets/sounds/` (der Autor liefert CC0-Material; bis
dahin WebAudio-Fallbacks):

- Kampf: schwert_swing, axt_swing, hellebarde_stoss, hammer_schlag,
  bogen_spannen, pfeil_schuss, pfeil_einschlag, treffer_fleisch,
  treffer_knochen, block, parade, rolle
- Gegner: skelett_klappern, pest_stoehnen, schatten_fluestern, templer_stimme
- Welt: schritte_gras, schritte_stein, tuer, truhe, muenzen, trank,
  holz_hacken, stein_hacken, feuer_knistern, muehle, schmiede_hammer,
  huhn, schwein, kuh, hund, kraehen
- Atmosphäre (Loops): dorf_wind, krypta_droehnen, wald_nacht
- UI: klick, item_episch (besonderer Jingle), levelup, fertigkeit_neu

Lautstärke-Mix: Effekte und Atmosphäre getrennt regelbar (Einstellungen).

---

# TEIL 10: PHASENPLAN MIT ABNAHMEKRITERIEN

Jede Phase: implementieren -> Tests -> Dev-Server -> Screenshot -> Bericht.
Erst nach Abnahme zur nächsten Phase.

- PHASE 0 - Projektgerüst: Vite + Phaser + TS, Szenenstruktur, Datenordner,
  Referenzdatei eingelesen und Inhalte als JSON extrahiert (Items, Dialoge,
  Gegner, Texte), Asset-Lader mit Hot-Swap-Prinzip (3.3) angelegt,
  ASSETS-LIESMICH.md mit vollständiger Checkliste und ChatGPT-Prompt-Vorschlägen
  erzeugt. Abnahme: Datenextrakt vollständig, Diff-Liste gegen Referenz,
  Checkliste vorhanden.
- PHASE 1 - DebugArena + Kampfkern: Bewegung, 3er-Kombo, schwerer Hieb, Block,
  Parade, Rolle, Hit-Stop, ein Dummy-Gegner. Abnahme: alle Timings aus Teil 4
  messbar korrekt (Debug-Overlay), Spielgefühl-Check.
- PHASE 2 - Waffenklassen + Gegnerkatalog: alle Movesets, alle Gegnertypen mit
  2-3 Mustern, Elite. Abnahme: in der DebugArena jeder Gegner + jede Waffe.
- PHASE 3 - Items komplett: Raritäten, Affixe, Sockel/Edelsteine, Lichtsäulen,
  Inventar-UI, Charakterfenster. Abnahme: Loot-Test-Suite grün, UI-Screenshots.
- PHASE 4 - Krypta: 3 Ebenen prozedural + alle Spezialräume aus 7.3,
  zerstörbare Objekte mit Loot- und Material-Drops, Boss.
  Abnahme: kompletter Krypta-Durchlauf, jeder Spezialraum erreichbar,
  Fässer zerlegen fühlt sich gut an (Partikel + Sound + Hit-Feedback).
- PHASE 5 - Dorf groß: alle Gebäude/NPCs/Tiere aus 7.2, Handel, Tagesablauf.
  Abnahme: Screenshot-Tour durch das Dorf, alle Händler funktionieren.
- PHASE 6 - Dunkelwald + Story: Intro, Landherr, Tutorial-Beats,
  Erzähler-Interludien, Anna-Quest, beide Enden. Abnahme: Story-Durchlauf.
- PHASE 7 - Crafting/Aufbau/Farm: Ressourcen, Gehöft 3 Stufen, Kamin, Feld.
  Abnahme: kompletter Aufbau-Loop spielbar.
- PHASE 8 - Fertigkeiten: 3 Schulen, alle 9 Fähigkeiten, Zauberrollen, Bogen.
  Abnahme: jede Fähigkeit in der DebugArena demonstriert.
- PHASE 9 - Pseudo-3D-Politur: Y-Sortierung überall, Sprites, Schatten, Licht,
  dezente Effekte, Sounds eingebunden. Abnahme: Vorher/Nachher-Screenshots.
- PHASE 10 - Menüs, Speichern, Touch: Hauptmenü mit Titelbild, Einstellungen
  (komplett aus Referenz + Audio-Mix), 3 Speicherslots + Autosave,
  Touch-Steuerung (Joystick links, Auto-Aim-Angriff, kontextuelle
  Interaktionstaste, Linkshänder-Modus). Abnahme: Spielstand-Roundtrip-Test,
  Touch im Browser-Device-Modus geprüft.
- PHASE 11 (OPTIONAL, jederzeit nachholbar) - Grafik-Upgrade: Dank der
  Trennung aus 5.3 ist dies eine reine Darstellungs-Phase. Inhalte:
  Fallback-Sprites verfeinern (mehr Frames, bessere Silhouetten, Details),
  Tiles verschönern (Texturvariation, Kanten-Übergänge zwischen Gras/Weg,
  Verwitterung), zusätzliche Animationen (Idle-Atmen, Umhang im Wind,
  Wasser im Bach), Licht-Politur (weichere Verläufe, Farbstimmung pro
  Gebiet), sowie Einbindung aller bis dahin vom Autor gelieferten Dateien
  aus assets/sprites/ und assets/tiles/. HARTE REGEL: In dieser Phase wird
  keine einzige Datei außerhalb von src/gfx/ und assets/ angefasst - wenn
  doch nötig, ist das ein Architekturfehler, der zuerst in DECISIONS.md
  dokumentiert und behoben wird. Abnahme: Vorher/Nachher-Screenshots aller
  Gebiete, Spiellogik-Tests unverändert grün.

---

# TEIL 11: KICKOFF

Lies zuerst dieses Dokument vollständig, dann `reference/ravensmoor-v2.html`.
Lege los mit Phase 0 und melde dich mit dem Datenextrakt und offenen Fragen.
Bei fehlenden Assets oder fehlender Referenzdatei: stoppen und nachfragen,
nichts erfinden.
