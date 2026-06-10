# CLAUDE.md

Anleitung für KI-Assistenten in diesem Repository.

---

## Projekt

**RAVENSMOOR — Der Preis der Unsterblichkeit**: Top-Down-Action-RPG im Geist von Diablo 1.
Dorf im Dreißigjährigen Krieg (1635), darunter eine Krypta mit drei Ebenen und einem untoten
Tempelritter als Endboss. Ich-Erzähler in der Vergangenheitsform.

Vollständige Spezifikation: Master-Prompt (vom Nutzer bereitgestellt). Verbindliche Inhalts-
referenz ist `ravensmoor.html` — **liegt aktuell NICHT im Repository**, siehe `DECISIONS.md`.
Bis zur Nachlieferung sind `src/data/*.json` markierte Platzhalter.

## Designsäulen (bei Konflikt gewinnt die höhere)

1. **Bewusst, aber Feel-Good (v3)** — Die Spannung kommt aus der Dunkelheit, nicht aus der
   Härte. Der Kampf hat Gewicht und Absicht (jeder Schlag eine bewusste Entscheidung, Gegner
   werden gelesen), aber er fließt und verzeiht (reaktionsschnell, großzügige Fenster, geringe
   Strafen) — Referenz: Elden Rings Flüssigkeit, nicht Dark Souls' Strenge. Erkundung langsam
   und angespannt; im Kampf fühlt sich der Spieler fähig. „Ich bin in Gefahr" ja, „ich packe
   das nicht" niemals. Tempo: Diablo 1 / Dungeon Siege 1.
2. **Die Geschichte wird erzählt, nicht abgehandelt** — Atmosphäre trägt die Stimmung.
3. **Loot motiviert** — bessere Waffen sehen sichtbar anders aus und schlagen anders zu.

## Stack

Phaser 3 + TypeScript + Vite. Tests mit Vitest (nur reine Logik). Grafik bis Phase 5
ausschließlich programmatisch (keine externen Assets). Speichern via localStorage.
Sounds prozedural (WebAudio).

## Befehle

```bash
npm run dev        # Dev-Server (Port 5173)
npm run build      # Typecheck + Produktions-Build
npm run typecheck  # tsc --noEmit
npm run test       # Vitest (einmalig)
npm run lint       # ESLint über src/
```

## Struktur

```
src/
  scenes/    Boot, Village, Dungeon, BossRoom, UIOverlay, DebugArena (F1)
  systems/   combat.ts, enemyAI.ts, dungeonGen.ts, loot.ts, lighting.ts, save.ts, narration.ts
  data/      items.json, enemies.json, dialogues.json, narration.json, themes.json
  entities/  Player.ts, Enemy.ts, Boss.ts, Projectile.ts
tests/       Vitest-Tests für reine Logik
```

**Regel:** Inhalte (Items, Gegnerwerte, Dialoge, Texte) liegen datengetrieben in `src/data/` —
niemals hartkodiert in Szenen. Reine Logik in `systems/` ohne Phaser-Imports halten, damit sie
testbar bleibt.

## Steuerung

WASD bewegen · Maus zielen (+Späh-Kamera) · Linksklick/J Kombo · Shift+Klick schwerer Hieb ·
Rechtsklick/K halten = Block/Parade (300 ms Fenster) · Leertaste Rolle (Ausdauer) ·
E interagieren/rasten · I Inventar · Q Heilflasche · O Optionen · F1 DebugArena.
Ausdauer ist Rhythmusgeber, keine Strafe. Max. 2 Gegner greifen gleichzeitig an.

## Arbeitsweise

- Phasenplan aus dem Master-Prompt der Reihe nach; keine Phase ohne erfüllte Abnahmekriterien beenden.
- Pro Phase: Plan → kleine Commits (Conventional Commits) → `typecheck`+`test`+`dev` verifizieren → eine Selbstkritik fixen.
- Eigenständige Entscheidungen in `DECISIONS.md` dokumentieren.
- Lies Dateien vor dem Bearbeiten; minimale Änderungen; keine erfundenen URLs; keine Secrets committen.
- Entwicklung auf dem zugewiesenen `claude/`-Branch, nie direkt auf `main`.
