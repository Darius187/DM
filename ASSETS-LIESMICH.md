# ASSETS-LIESMICH - Checkliste für alle erwarteten Bild- und Sounddateien

Das Spiel prüft bei jedem Start, welche dieser Dateien vorhanden sind, und
nutzt sie automatisch (Hot-Swap). Fehlt eine Datei, zeichnet das Spiel einen
Fallback - es geht NIE etwas kaputt. Die Browser-Konsole (F12) listet bei
jedem Start auf, was gefunden wurde und was noch auf Fallback läuft.

Einheitlicher Stil-Vorschlag für alle ChatGPT-Bilder:
"düsteres Gemälde, 14. Jahrhundert, Schwarzer Tod / Pestzeit, spätmittelalterlich,
dunkler neutraler Hintergrund, gedämpfte Farben, dramatisches Kerzenlicht"

## 1. Portraits - `assets/portraits/` (PNG, quadratisch, 512x512 empfohlen)

Portraits werden NICHT freigestellt, sondern vom Spiel in einen Rahmen gesetzt.

ChatGPT-Prompt-Vorlage:
> Porträt im Stil eines düsteren Ölgemäldes des 14. Jahrhunderts,
> Brustbild, Blick zum Betrachter, dunkler neutraler Hintergrund,
> dramatisches Kerzenlicht: [BESCHREIBUNG]. Quadratisch, 512x512.

- [ ] `spieler.png` - der Fremde: abgerissener Reisender mit Schwert, wettergegerbtes Gesicht, dunkler Mantel
- [ ] `heinrich.png` - Heinrich Kramer: Wirt um die 50, müde Augen, Lederschürze, hinter ihm Schankraum im Halbdunkel
- [ ] `magdalena.png` - Magdalena: Kräuterfrau, waches Gesicht, grünes Tuch, getrocknete Kräuter im Hintergrund
- [ ] `johannes.png` - Pater Johannes: hagerer Priester, graue Schläfen, schwarze Soutane, Angst hinter frommem Blick
- [ ] `landherr.png` - der Landherr: strenger Adliger, Spitzenkragen, Siegelring, kalter Blick
- [ ] `schmied.png` - Schmied: bulliger Mann, rußiges Gesicht, Funkenflug im Hintergrund
- [ ] `mueller.png` - Müller: mehlbestäubter Mann um die 40, schlaues Gesicht
- [ ] `bauer1.png` - Bauer: sonnenverbrannter Mann mit Strohhut
- [ ] `bauer2.png` - Bäuerin oder zweiter Bauer: erschöpft, aber freundlich
- [ ] `haendler.png` - fahrender Händler: verschlagenes Lächeln, bunter Flickenmantel, Karren im Hintergrund

Optionale Varianten (Charakterfenster zeigt sie passend zur Rüstung):
- [ ] `spieler_ruestung2.png` - Spieler in Kettenhemd
- [ ] `spieler_ruestung3.png` - Spieler in Kürass

## 2. Item-Bilder - `assets/items/` (PNG, quadratisch, 256x256 bis 512x512)

Einfarbiger Hintergrund ist okay - das Spiel stellt per Farbtoleranz frei
(Eckpixel als Referenzfarbe). Raritätsrand und Glühen legt das SPIEL über
das Bild, dasselbe Schwert kann gewöhnlich bis episch sein.

ChatGPT-Prompt-Vorlage:
> Einzelner Gegenstand im Stil eines düsteren Ölgemäldes des 14. Jahrhunderts,
> zentriert, komplett sichtbar, einfarbig dunkelgrauer Hintergrund,
> kein Text: [GEGENSTAND]. Quadratisch, 512x512.

Waffen:
- [ ] `waffe_rostige-klinge.png` - rostiges, schartiges Kurzschwert
- [ ] `waffe_kurzschwert.png` - schlichtes Kurzschwert
- [ ] `waffe_streitkolben.png` - eiserner Streitkolben
- [ ] `waffe_langschwert.png` - Langschwert mit Parierstange
- [ ] `waffe_streitaxt.png` - einschneidige Streitaxt
- [ ] `waffe_reiterdegen.png` - eleganter Reiterdegen
- [ ] `waffe_hellebarde.png` - Hellebarde mit langem Schaft
- [ ] `waffe_kriegshammer.png` - schwerer Kriegshammer
- [ ] `waffe_jagdbogen.png` - schlichter Jagdbogen
- [ ] `waffe_kriegsbogen.png` - verstärkter Kriegsbogen
Rüstungen:
- [ ] `ruestung_lumpen.png` - zerlumpte Stoffkleidung
- [ ] `ruestung_lederwams.png` - abgewetztes Lederwams
- [ ] `ruestung_gambeson.png` - gesteppter Gambeson
- [ ] `ruestung_kettenhemd.png` - Kettenhemd
- [ ] `ruestung_kuerass.png` - Brustharnisch/Kürass
Ringe:
- [ ] `ring_knochenring.png` - Ring aus geschnitztem Knochen
- [ ] `ring_siegelring.png` - goldener Siegelring
- [ ] `ring_silberring.png` - schlichter Silberring
- [ ] `ring_eisenring.png` - grober Eisenring
Edelsteine:
- [ ] `edelstein_feueropal.png` - orange glühender Opal
- [ ] `edelstein_frostsplitter.png` - hellblauer Eissplitter
- [ ] `edelstein_schattenperle.png` - violett schimmernde Perle
Verbrauchsgegenstände:
- [ ] `trank_heil.png` - rote Glasflasche
- [ ] `trank_mana.png` - blaue Glasflasche
- [ ] `schriftrolle.png` - versiegelte Pergamentrolle
- [ ] `pfeile.png` - Bündel Pfeile
- [ ] `relikt.png` - goldenes, warm glühendes Fragment

## 3. Titelbild - `assets/title/`

- [ ] `ravensmoor-title.jpg` - Dorf mit Steinkirche im Nebel, bleierner
      Himmel, 14. Jahrhundert, Ölgemälde-Stil, Querformat (z. B. 1920x1080)

## 4. Sounds - `assets/sounds/` (CC0, .ogg oder .wav)

Bis die Dateien da sind, erzeugt das Spiel Ersatzklänge per WebAudio.
Quellenempfehlung: freesound.org (CC0-Filter), opengameart.org.

Kampf:
- [ ] `schwert_swing.ogg` · [ ] `axt_swing.ogg` · [ ] `hellebarde_stoss.ogg`
- [ ] `hammer_schlag.ogg` · [ ] `bogen_spannen.ogg` · [ ] `pfeil_schuss.ogg`
- [ ] `pfeil_einschlag.ogg` · [ ] `treffer_fleisch.ogg` · [ ] `treffer_knochen.ogg`
- [ ] `block.ogg` · [ ] `parade.ogg` · [ ] `rolle.ogg`
Gegner:
- [ ] `skelett_klappern.ogg` · [ ] `pest_stoehnen.ogg`
- [ ] `schatten_fluestern.ogg` · [ ] `templer_stimme.ogg`
Welt:
- [ ] `schritte_gras.ogg` · [ ] `schritte_stein.ogg` · [ ] `tuer.ogg`
- [ ] `truhe.ogg` · [ ] `muenzen.ogg` · [ ] `trank.ogg`
- [ ] `holz_hacken.ogg` · [ ] `stein_hacken.ogg` · [ ] `feuer_knistern.ogg`
- [ ] `muehle.ogg` · [ ] `schmiede_hammer.ogg`
- [ ] `huhn.ogg` · [ ] `schwein.ogg` · [ ] `kuh.ogg` · [ ] `hund.ogg` · [ ] `kraehen.ogg`
Atmosphäre (nahtlose Loops):
- [ ] `dorf_wind.ogg` · [ ] `krypta_droehnen.ogg` · [ ] `wald_nacht.ogg`
UI:
- [ ] `klick.ogg` · [ ] `item_episch.ogg` · [ ] `levelup.ogg` · [ ] `fertigkeit_neu.ogg`

## 5. Figuren-Sprites - `assets/sprites/` (optional, für Grafik-Upgrade)

Zwei Varianten werden unterstützt:
1. Einzelbilder `<name>_<richtung>_<frame>.png` mit richtung = unten/links/rechts/oben
   und frame = 1-4, z. B. `spieler_unten_1.png`, `skelett_links_2.png`
2. Ein Sheet `<name>.png` mit JSON-Atlas `<name>.json` daneben
   (Framenamen wie oben: `spieler_unten_1` usw.)

Erwartete Namen: spieler, pest, skelett, schuetze, schatten, templer, wolf,
ratte, heinrich, magdalena, johannes, landherr, schmied, mueller, bauer1,
bauer2, haendler, huhn, schwein, kuh, hund

## 6. Tiles - `assets/tiles/` (optional, für Grafik-Upgrade)

Siehe TILES-LIESMICH.md für die vollständige Liste aller Tile-Namen.
