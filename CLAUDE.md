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

1. **Das Schnetzeln muss Spaß machen** — Nahkampfgefühl schlägt alles.
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

WASD bewegen · Maus zielen · Linksklick/J Kombo · Rechtsklick/K halten = Block/Parade ·
Leertaste ausweichen · 1/2/3 Zauber · E interagieren · I Inventar · Q/F Tränke · P Pause ·
F1 DebugArena.

## Arbeitsweise

- Phasenplan aus dem Master-Prompt der Reihe nach; keine Phase ohne erfüllte Abnahmekriterien beenden.
- Pro Phase: Plan → kleine Commits (Conventional Commits) → `typecheck`+`test`+`dev` verifizieren → eine Selbstkritik fixen.
- Eigenständige Entscheidungen in `DECISIONS.md` dokumentieren.
- Lies Dateien vor dem Bearbeiten; minimale Änderungen; keine erfundenen URLs; keine Secrets committen.
- Entwicklung auf dem zugewiesenen `claude/`-Branch, nie direkt auf `main`.
