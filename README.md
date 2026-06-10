# RAVENSMOOR — Der Preis der Unsterblichkeit

Ein Top-Down-Action-RPG im Geist von Diablo 1. Anno 1635, im sechzehnten Jahr des
großen Krieges, erreicht ein namenloser Reisender das Dorf Ravensmoor — und steigt
in die Krypta unter der Kirche hinab, wo ein untoter Tempelritter ein Relikt hütet,
das verspricht, was kein Grab je hielt.

**Stack:** Phaser 3 · TypeScript · Vite · Vitest. Alle Grafiken programmatisch,
alle Sounds prozedural (WebAudio), keine externen Assets.

## Starten

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run test       # Unit-Tests (Kampflogik, Dungeon-Generator, Loot-Verteilungen)
npm run typecheck  # TypeScript
npm run lint       # ESLint
npm run build      # Produktions-Build nach dist/
```

## Steuerung

| Eingabe | Aktion |
|---|---|
| **WASD** | Bewegen |
| **Maus** | Zielen |
| **Linksklick / J** | Angriff — 3er-Kombo, der dritte Hieb ist ein Finisher |
| **Rechtsklick / K halten** | Blocken (−70 % Frontschaden, wehrt Pfeile ab) |
| **Block kurz vor dem Treffer** | **Perfekte Parade**: kein Schaden, Gegner betäubt, goldene Riposte (+50 %) |
| **Leertaste** | Ausweichschritt (kurze Unverwundbarkeit) |
| **E** | Interagieren (NPCs, Krypta, Relikt, weiter) |
| **I** | Inventar / Händler |
| **Q** | Heiltrank |
| **F1** | Debug-Arena |

### Debug-Arena (F1)

T: Dummys greifen an · G: Auto-Angriff · H: Hitbox/Frame-Overlay · R: heilen ·
F2: Gegnerwelle · F3: leeren · F4: Krypta · F8: Bossraum. In der Krypta: F5 überspringt die Ebene.

## Spielablauf

Dorf (Schlüssel bei Pater Johannes holen, bei Heinrich und Magdalena einkaufen) →
Krypta mit drei prozeduralen Ebenen (Gruft, Beinhaus, alte Kultstätte) →
der Tempelritter → die Entscheidung über das Relikt. Zwei Enden.
Fünf Tagebuchseiten eines früheren Reisenden liegen in der Tiefe verstreut.

Gespeichert wird automatisch (localStorage): Inventar, Ausrüstung, Gold, Tränke,
Story-Fortschritt.

## Projektnotizen

- `DECISIONS.md` dokumentiert Designentscheidungen.
- `src/data/*.json` enthält alle Inhalte (Items, Gegner, Dialoge, Erzähltexte) —
  aktuell als markierte Platzhalter, bis die Referenzdatei `ravensmoor.html` vorliegt.
- Architektur: reine, getestete Logik in `src/systems/`, Phaser-Entities in
  `src/entities/`, Szenen in `src/scenes/`.
