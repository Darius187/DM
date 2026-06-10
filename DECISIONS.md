# DECISIONS.md — Entscheidungsprotokoll

Dokumentiert eigenständige Entscheidungen im Sinne der Designsäulen (Master-Prompt Abschnitt 7).

## 2026-06-10 — Kampf-und-Pacing v3 in der 2D-Codebasis umgesetzt

Die v3-Spezifikation („Bewusst, aber Feel-Good") richtet sich an eine 3D-Prompt-Suite
(`RAVENSMOOR-3D-PROMPTS.md`, Mixamo-Clips, echtes 3D-Audio), die nicht vorliegt. Entscheidung:
alle engine-unabhängigen v3-Mechaniken in der bestehenden Phaser-Version umsetzen — Ausdauer,
Fenster (250/300/300 ms), schwerer Hieb, Gegner-Vertrag (max. 2 Angreifer, Erholungsfenster,
Lauerer), Flaschen+Schreine, milder Tod (15 %), Späh-Kamera, Hören-vor-Sehen (Stereo-Pan),
Herzschlag, Optionen. 3D-spezifisch bleibt offen: Mixamo-Animationen, echtes 3D-Positionsaudio,
Kamera in 3D-Einheiten, „Showcase-Checkliste"-Schwarzwerte. Zauber-Wirkzeit (0,4 s) wartet
weiter auf das Zauber-System (referenzabhängig).

## 2026-06-10 — Referenzdatei `ravensmoor.html` fehlt

**Befund:** Der Master-Prompt nennt `ravensmoor.html` als verbindliche Quelle für alle Inhalte
(Items, Gegnerwerte, Dialoge, Erzähltexte, Balancing, swingStyle-Stufen, Boss-Phasen, Altar-Effekte).
Die Datei lag dem Repository jedoch nicht bei — der Ordner enthielt nur `CLAUDE.md`.

**Entscheidung:** Entwicklung beginnt trotzdem, weil das Kampfsystem (Abschnitt 4 des Prompts,
50 % der Arbeit) vollständig im Prompt spezifiziert ist und nicht von der Referenz abhängt.
Alle referenzabhängigen Inhalte liegen als **klar markierte Platzhalter** in `src/data/*.json`
(`_meta.source` kennzeichnet sie). Die Platzhalter folgen den Beschreibungen im Master-Prompt
(Gegnertypen, NPC-Rollen, Story-Beats, Themes, Affixe inkl. „+Lichtradius").

**Folge:** Sobald `ravensmoor.html` nachgeliefert wird, werden die `data/*.json`-Dateien 1:1 aus
der Referenz neu extrahiert (Texte wörtlich). Die Systeme sind datengetrieben gebaut, sodass der
Austausch keinen Codeeingriff erfordert.

## 2026-06-10 — Parade-Fenster-Grenze

Das Prompt sagt „Block beginnt <250 ms vor dem Treffer". Umsetzung: strikt kleiner
(`delta < 250`), bei exakt 250 ms gilt der normale Block. Negative Deltas (Block nach dem
Treffer begonnen) zählen nie als Parade.

## 2026-06-10 — Angriff unterbricht Block (Phase-1-Selbstkritik)

Nach einer perfekten Parade hält der Spieler meist noch die Blocktaste. Würde der Angriffsklick
dann ignoriert, ginge die Riposte (das Belohnungsmoment der Parade) regelmäßig verloren —
Verstoß gegen „keine verschluckten Eingaben". Festgelegt: Angriff hat Priorität über gehaltenen
Block; der Block endet mit Angriffsbeginn und muss danach neu aufgebaut werden (neues
Parade-Fenster).

## 2026-06-10 — Kombo-Folgeschlag chaint ab 60 % in der Recovery

Die Cancel-Regel (ab 60 % der Animation) gilt laut Prompt für Ausweichen/Block. Für den
nächsten Kombo-Schlag übernehmen wir dieselbe Schwelle (zusätzlich: erst in der Recovery-Phase),
damit Kombos snappy bleiben, ohne die aktiven Frames zu verkürzen.

## 2026-06-10 — Nahkämpfer umkreisen im Cooldown (Phase-2-Selbstkritik)

Nahkämpfer, die in Reichweite stehen, aber auf ihren Angriffs-Cooldown warten, standen regungslos.
Jetzt umkreisen sie den Spieler langsam (perpendikulares Strafing mit Richtungswechsel), was den
Kampf lebendig hält und Positionierung belohnt.

## 2026-06-10 — Performance-Beobachtung (offen, Phase 7)

Alle Entities zeichnen ihre Graphics jeden Frame neu (clear + redraw). Headless/SwiftShader bricht
damit messbar ein; auf GPU-Hardware voraussichtlich unkritisch, aber vor Phase 7 mit 30 Gegnern +
20 Lichtquellen auf realer Hardware prüfen. Optimierungsoption: statische Körper in generierte
Texturen backen, nur dynamische Overlays (Telegraph, Flash, HP) live zeichnen.

## 2026-06-10 — Phaser-Delta-Smoothing deaktiviert

Bei anhaltend niedrigen FPS (Software-Rendering, schwache Hardware) unterschätzt Phasers
Delta-Glättung (`smoothStep`) das reale Frame-Delta massiv (gemessen: 16,7 ms gemeldet bei
~220 ms realem Frame) — das Spiel lief in Zeitlupe (Faktor ~0,075) und Timer verzögerten sich
entsprechend. `smoothStep: false` liefert reale Deltas; Spike-Schutz übernehmen die Szenen
selbst mit `Math.min(delta, 50)`. Bei stabilen 60 FPS ändert sich nichts.

## 2026-06-10 — `ravensmoor.html` nachgeliefert: Inhalte wörtlich übernommen

Mit dem 3D-Starter-Paket kam die Referenz. Übernommen: alle Dialoge (mehrseitig, wörtlich),
Erzähler-Beats (je 2 Seiten), Relikt-Dialog und beide Enden samt Titeln, Item-Tabellen
(Waffen/Rüstungen/Ringe, Präfix/Suffix-Namensschema, Boni-Bereiche, Preisformel val·9+Boni·35+
Rarität·25), Raritätsformel (selten 0,12+0,02·Tiefe), XP/Stufen (90+14·Stufe, xpNext 45·Stufe^1,45,
Aufstieg heilt 50 %), Elixiere, Altar-Effekttabelle, HP/XP-Tiefenskalierung der Gegner,
Theme-Namen/Dekordichten, Magdalenas Geschenk (+2 Tränke), Annehmen-Ende (+30 maxLeben).
Konfliktregel angewandt: Telegraphen/Schadenswerte bleiben v3 (Spielgefühl schlägt Referenz);
Boss behält v3-Werte (1100 HP, 4 Angriffe inkl. Sturm). Lebensraub jetzt flach (Referenz).

**Nachtrag (Abschluss als Portierungsquelle):** Zauber-Ausführung (Feuerball-Projektil mit
kleiner AoE, Heiliges Licht als AoE um den Spieler, Heilung 40 % — Wirkzeit 0,4 s nicht
unterbrechbar, Altar-Segen wirkt auf die Schadenszauber), 2 Angriffsmuster pro Gegnertyp
(Übergriff/Doppelhieb/Stoß/Blink mit unterscheidbaren Telegraphen, Elite-Übergriff unblockbar
mit gelbem Aufblitzen) und der Sargdeckel-Skriptmoment sind umgesetzt. Übersicht für den
3D-Port: `PORTIERUNG.md`.

## 2026-06-10 — Block-Kegel

„Frontschaden" ist im Prompt nicht als Winkel definiert. Festgelegt: ±70° um die Blickrichtung
(zur Maus). Breit genug, dass Blocken sich verlässlich anfühlt (Designsäule 1), schmal genug,
dass Positionierung zählt.
