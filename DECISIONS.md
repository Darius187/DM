# DECISIONS.md — Entscheidungsprotokoll

Dokumentiert eigenständige Entscheidungen im Sinne der Designsäulen (Master-Prompt Abschnitt 7).

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

## 2026-06-10 — Block-Kegel

„Frontschaden" ist im Prompt nicht als Winkel definiert. Festgelegt: ±70° um die Blickrichtung
(zur Maus). Breit genug, dass Blocken sich verlässlich anfühlt (Designsäule 1), schmal genug,
dass Positionierung zählt.
