# Codex-Nachtrag: WELCHE Varianten wirklich gebraucht werden (R242)

Autor-Order: "die ganzen verschiedenen Schwerter und Schilde muss Codex
auch liefern - und auch die verschiedenen Ruestungen."

Damit Codex nicht raet: das hier ist die ECHTE Item-Liste aus dem Spiel
(`src/data/items.ts`, `src/data/rts.ts`). Jede Zeile ist ein Gegenstand,
den der Spieler wirklich finden und tragen kann. Alles auf DIESELBEN
Anker, DERSELBE Koerper - kein neuer Koerper, keine Kombinationen.

## 1. WAFFEN (Ebene weapon, 9 Spalten x 4 Richtungen je Datei)

Vom Spiel gefuehrte Nahkampfwaffen, aufsteigend nach Schaden. Die
Klasse in Klammern bestimmt die Silhouette - GLEICHE Klasse darf sich
aehneln, unterschiedliche Klassen muessen klar unterscheidbar sein:

| Nr | Name | Klasse | Schaden | Optik-Hinweis |
|----|------|--------|---------|----------------|
| 1 | Solide Klinge | schwert | 6 | Startwaffe des Helden, schlicht, Werkzeug |
| 2 | Kurzschwert | schwert | 8 | kuerzer, breitere Klinge |
| 3 | Streitkolben | kolben | 11 | kurzer Stiel, gerippter Metallkopf |
| 4 | Langschwert | schwert | 14 | lange Klinge, laengeres Heft (1,5-Hand) |
| 5 | Streitaxt | axt | 16 | einschneidiges Blatt, Holzstiel |
| 6 | Falchion | schwert | 18 | einschneidig, zur Spitze breiter werdend |
| 7 | Hellebarde | stange | 20 | LANG (ragt aus der Zelle), Beil + Dorn |
| 8 | Kriegshammer | wucht | 22 | Hammerkopf + Gegendorn |

FERNKAMPF (eigene Animation SPANNEN statt SCHLAG - Runde 3, jetzt nur
die Idle-/Geh-Haltung mitliefern, wenn es ohne Mehraufwand geht):
| 9 | Jagdbogen | bogen | 9 |
| 10 | Armbrust | bogen | 14 | (periodengetreu 14. Jh., kein Schiesspulver) |
| 11 | Kriegsbogen | bogen | 17 |

ZAUBERSTAEBE (niedrige Prioritaet, zuletzt):
| 12 | Knorriger Stab | stab | 7 |
| 13 | Kristallstab | stab | 15 |

HEER: der Fusssoldat traegt die "Heerklinge" - dafuer reicht Nr. 2
(Kurzschwert) als Stellvertreter, KEINE eigene Datei noetig.

PRIORITAET, falls die Menge zu gross wird: erst 1-6 (die
Nahkampf-Kette, die der Spieler am haeufigsten sieht), dann 7-8,
dann Boegen, zuletzt Staebe.

## 2. SCHILDE (Ebene shield, wie oben)

| Nr | Name | Ruestung | Optik-Hinweis |
|----|------|----------|----------------|
| 1 | Holzschild | 1 | rohe Planken, schmaler Rand, kein Buckel-Prunk |
| 2 | Rundschild | 2 | bemalt/gefasst, klarer Eisenbuckel |
| 3 | Beschlagener Rundschild | 3 | zusaetzliche Eisenbaender ueber dem Holz |
| 4 | Eisenschild | 4 | ganz aus Metall, dunkel, wenig Holz sichtbar |
| 5 | Turmschild | 5 | GROSS und laenglich (kein Rund!), deckt bis zum Knie |

Nr. 2 und 3 existieren bereits aus dem ersten Paket - bitte nur an den
neuen Koerper anpassen.

## 3. RUESTUNGEN (Ebene armor - NEU, deckt nur den Torso)

Die Basis (Hemd, Hose, Stiefel) bleibt der nackte Koerper; jede
Ruestung ist eine Ebene DARUEBER. Reihenfolge = Fortschritt des
Spielers:

| Nr | Name | Ruestung | Optik-Hinweis |
|----|------|----------|----------------|
| 0 | (keine) | - | nur Hemd - die Koerperebene selbst |
| 1 | Lumpen | 1 | zerschlissener Kittel, Flicken |
| 2 | Lederwams | 3 | genaehtes Leder, Guertel |
| 3 | Gambeson | 5 | gestepptes Wams, senkrechte Steppnaehte |
| 4 | Kettenhemd | 8 | Kettengeflecht bis zu den Oberschenkeln |
| 5 | Plattenrock | 11 | Coat of plates: Nietenreihen auf Stoff |

Der Umhang mit Gugel bleibt eine EIGENE, unabhaengige Ebene (an/aus) -
er kann ueber JEDER Ruestung getragen werden.

## 4. REGELN (unveraendert, gelten fuer alles oben)

- EIN Koerper, EIN Ankersatz. Jede neue Waffe/jedes Schild/jede
  Ruestung ist NUR ein weiteres Sheet auf dieselben Anker.
- Format je Sheet: 128x128-Zellen, 9 Spalten (Stehen 1, Gehen 4,
  Schlag 3, Block 1) x 4 Richtungen = 1152x512.
- Lange Waffen (Hellebarde, Turmschild) duerfen ueber die Zelle
  hinausragen - dann Zellgroesse fuer DIESE Ebene beibehalten und den
  Ueberstand abschneiden ODER in der Uebergabe vermerken, dass diese
  Ebene ein groesseres Raster braucht.
- Z-Reihenfolge und Anker weiter im JSON, je Richtung und Frame.
- Die zwei offenen Punkte aus der letzten Pruefung mitkorrigieren:
  (a) bei OBEN muessen Schild-Zeichnung und JSON-Z-Reihenfolge
      zusammenpassen, (b) im OBEN-Ausholframe darf kein Gesicht zu
      sehen sein (Hinterkopf).

## 5. ABNAHME

Der Autor testet in `tools/sprite-werkbank.html` (bereits im Repo):
alle Richtungen, alle Waffen, alle Schilde, alle Ruestungen, Stehen /
Gehen / Schlag / Block. Was dort nicht sauber stapelt, faellt sofort
auf - bitte vorher selbst dagegen pruefen.
