# PORTIERUNG.md — Leitfaden für den 3D-Port

Dieses Repo ist die **Portierungsquelle** für RAVENSMOOR 3D (Prompt-Suite: `docs/3d/`).
Die Spiellogik ist bewusst in engine-unabhängige Module (keine Phaser-Imports, Vitest-getestet)
und Phaser-Präsentation getrennt. **Portiere die Logik, erfinde sie nicht neu.**

## Engine-unabhängige Logik (1:1 übernehmbar)

| Modul | Inhalt | Tests |
|---|---|---|
| `src/systems/combat.ts` | Alle v3-Kampfwerte und -Fenster: Kombo-Multiplikatoren (1/1/1,4/2,2), Riposte ×2, Block −75 %, Parade-Fenster 300 ms, Riposte-Fenster 1,3 s, Rolle (300 ms i-Frames/450 ms), Input-Buffer 250 ms, Cancel ab 50 % der Erholung, Hit-Stop 50/80/100 ms, Block-Kegel ±70°, **StaminaPool** (120, Regen 45/20 pro s, Kosten 10/24/20, geblockt 10–20), Angriffs-Timings (`ATTACK_STAGES`), Sektor-Treffertest, Winkelmathe | `tests/combat.test.ts`, `tests/attack.test.ts` |
| `src/systems/enemyAI.ts` | Steering (Nahkampf/Schütze mit Rückzug), Separation, Sichtlinien-DDA, Elite-Roll, Flank-Offsets | `tests/enemyAI.test.ts` |
| `src/systems/dungeonGen.ts` | Seeded Generator (mulberry32), Räume + 2 Kacheln breite L-Korridore, Spezialräume (Altar/Bibliothek/Treppe), Fackel-/Dekor-/Spawn-Punkte, BFS-Begehbarkeit, Kreis-gegen-Raster-Kollision mit Gleiten | `tests/dungeonGen.test.ts` (100 Ebenen begehbar) |
| `src/systems/loot.ts` | Referenz-Loot: Raritätsformel (selten 0,12+0,02·Tiefe, magisch <0,45), Präfix/Suffix-Namen, Boni-Rolls ohne Duplikate, Tier-Auswahl nach Tiefe, Preisformel (val·9+Boni·35+Rarität·25), Stat-Aggregation, Templerklinge | `tests/loot.test.ts` (Verteilungstests) |
| `src/systems/gameState.ts` | Stufen/XP (90+14·Stufe HP, 40+8·Stufe Mana, xpNext 45·Stufe^1,45, Aufstieg heilt 50 %), Flaschen (heilt 45 % max, Upgrades bis 6), Elixiere, Inventar/Ausrüstung, Schrein-Rast, Optionen | indirekt |
| `src/systems/save.ts` | Save-Schema (localStorage) inkl. Migrationen — Feldliste als Vorlage fürs 3D-Save | — |

## Daten (JSON, direkt übernehmbar)

Alle Inhalte wörtlich aus `ravensmoor.html` (verbindliche Referenz, liegt im Repo-Root):

- `src/data/items.json` — Waffen/Rüstungen/Ringe, Boni-Bereiche, **Zauber** (Feuerball 12 Mana/Stufe 2/0,55 s CD; Heiliges Licht 22/3/4,5 s; Heilung 26/5/7 s), Tränke/Elixier-Preise, Leveling-Formeln, Altar-Kommentar
- `src/data/enemies.json` — 4 Typen + Elite-Affixe; HP/XP-Tiefenskalierung aus der Referenz; **Telegraphen (450–700 ms) und Schadenswerte nach v3** (Spielgefühl schlägt Referenz)
- `src/data/dialogues.json` — alle NPC-Dialoge wörtlich, mehrseitig
- `src/data/narration.json` — Erzähler-Beats (je 2 Seiten), Relikt-Dialog, beide Enden samt Titeln, Tagebuchseiten (NEU-Inhalt, nicht aus Referenz)
- `src/data/themes.json` — Theme-Namen/Dekordichten aus `CRYPT_THEMES`

## Regel-Implementierungen in Phaser-Code (Logik beim Port herauslösen)

Diese Regeln stecken in Entities/Szenen — Werte und Verhalten sind die Spezifikation:

- `src/entities/Enemy.ts` — Gegner-Vertrag: **max. 2 gleichzeitige Angreifer**, Erholungsfenster nach 2–3 Schlägen (2,5 s), Lauerer (kauern → 0,8 s Audio-Vorwarnung → erheben), **Angriffsmuster** (`SPECIAL_MOVES`): Pestopfer-Übergriff (700 ms, ×1,3, nur bei Elite unblockbar/gelb), Skelett-Doppelhieb (450 ms, 2×0,7, zweiter Schlag +280 ms), Schützen-Stoß (<70 px, ×0,6 + Rücksprung), Grabschatten-Blink (500 ms Flüstern → Teleport → 350 ms Nach-Telegraph)
- `src/entities/Player.ts` — Zustandsmaschine (normal/attack/dodge/drink/cast), Zauber-Wirkzeit 0,4 s nicht unterbrechbar, Altar-Segen ×1,3 auf Hiebe UND Feuerball/Heiliges Licht, Trink-Abbruch ohne Flaschenverlust, Herzschlag <25 %
- `src/scenes/Dungeon.ts` — `useAltar()` (Effekttabelle: <0,25 Segen / <0,45 Heilung / <0,60 Gold 30–80 / <0,80 XP 25+15·Tiefe / sonst 3 Untote), Schrein-Rast + Respawn, Tod (15 % Gold), Späh-Kamera (Dead-Zone 90 px, max. 130 px), Skript-Momente (Fackel, Sargdeckel — je 1×/Ebene, nie Schaden)
- `src/systems/sound.ts` — prozedurale Sound-Rezepte (Frequenzen/Hüllkurven) als Referenz fürs Sound-Design; Idle-Geräusche pro Typ, Pan = Richtung
- `src/systems/effects.ts` — Hit-Stop-Mechanik (Zeitskala 0,15), Shake-Stärken, Riposte-Zoom

## Stolpersteine aus der 2D-Entwicklung (siehe DECISIONS.md)

1. **Eine Kampf-Uhr für alles:** Parade-Fenster, Buffer und Telegraphen müssen auf derselben
   (skalierten) Uhr laufen, sonst drifted das Timing bei Hit-Stop/Frame-Einbrüchen.
2. **Kein Delta-Smoothing** der Engine übernehmen — eigene Spike-Kappung (50 ms) pro Szene.
3. **Angriff muss gehaltenen Block unterbrechen**, sonst wird die Riposte verschluckt.
4. **Sieg-/Tod-Erkennung nicht über Zustands-Snapshots** im Update-Loop (Boss-Kill kam aus
   dem Spieler-Update) — Flanken über persistente Flags erkennen.
