# AGENTS.md - Zusammenarbeit Codex + Claude Code an "Ravensmoor"

Zwei KI-Entwickler arbeiten an diesem Repo: **Codex** und **Claude Code**.
Diese Datei ist der VERBINDLICHE Arbeitsvertrag fuer beide. Codex liest sie
automatisch, Claude wird von `CLAUDE.md` hierher verwiesen.

Wir arbeiten **abwechselnd** (Staffelstab), nicht gleichzeitig. Das hier verhindert,
dass wir uns die Arbeit gegenseitig ueberschreiben - genau das ist bereits passiert
(zwei Branches liefen wochenlang getrennt weiter, der Merge kostete Stunden).

---

## Die 9 goldenen Regeln (das Wichtigste)

1. **EIN gemeinsamer Branch.** Arbeite auf `claude/inspiring-planck-2n73vv` - dem
   aktuellen Gesamtstand (Pferd, 3D-Gebaeude, RTS, Wirtschaft, Kerker-Generator
   sind hier alle drin). **Leg KEINEN eigenen langlebigen Branch an.** Zwei
   Branches driften auseinander.
2. **Vor dem Anfangen: `git pull`.** Immer erst den neuesten Stand holen.
3. **Nach JEDER Aufgabe: committen UND `git push`.** Kleine Commits, klare
   deutsche Nachricht. **Nichts nur lokal liegen lassen** - was nicht gepusht ist,
   existiert fuer den anderen nicht.
4. **Immer nur EINER hat den Staffelstab.** Fang erst an, wenn der andere fertig
   gepusht und uebergeben hat. Nie gleichzeitig an derselben Datei.
5. **Bleib in deiner Spur** (siehe unten). Musst du ausnahmsweise eine fremde
   Datei anfassen: in die Uebergabe-Notiz schreiben.
6. **Niemals:** `git push --force`, History umschreiben, oder Dateien des anderen
   loeschen/umbenennen ohne Ankuendigung.
7. **Lies `CLAUDE.md` und `docs/design/00-CLAUDE-KONTEXT.md`** - die 12 Design-
   Regeln gelten fuer BEIDE (kein "-" Gedankenstrich, keine Secrets, Deutsch fuer
   Spielertexte/Kommentare, keine Trefferwuerfel, das Schwert wirkt immer, usw.).
8. **Gruen vor dem Push:** `npx tsc --noEmit` fehlerfrei UND `npx vitest run` gruen.
9. **Uebergabe-Notiz** in der Commit-Nachricht: *was geaendert, was noch offen,
   was der andere NICHT anfassen soll, was als Naechstes dran ist.*

---

## Zustaendigkeiten (Spuren)

| Spur | Codex | Claude Code |
|------|-------|-------------|
| **Was** | 3D-Gebaeude + Assets (`assets/houses/`, Blender-Pipeline, Render-/Pack-Skripte), Pferde-/Animations-Assets, HUD-/UI-Bilder | Spiel-Logik, Wirtschaft, RTS/Kampf, Generatoren, Systeme, Datenschicht (`src/data`, `src/logic`, `src/world`-Logik) |
| **Andockstelle im Spielcode** | die AUSDRUECKLICH benannten Einhaeng-Punkte (z.B. `GEB3D_BOXEN` in `WorldScene.ts` fuer die Gebaeude-Platzierung) | alles Uebrige |

**Geteilte Hotspot-Dateien** (`src/scenes/WorldScene.ts`, `src/world/CombatScene.ts`,
`src/ui/hud.ts`): hohes Konfliktrisiko. **Immer nur einer gleichzeitig**, per
Uebergabe abstimmen.

---

## Aktueller Stand (bitte aktuell halten)

- Alles ist auf `claude/inspiring-planck-2n73vv` zusammengefuehrt. Der alte Branch
  `codex/rotatable-3d-carpenter-house` ist eingemergt - **neue Arbeit vom
  integrierten Branch abzweigen, nicht vom alten Codex-Branch.**

## Stehende Regeln (Autor)

- **Jede neue Karte bekommt SOFORT einen Eintrag im Maps-Tab der Dev-Konsole**
  (WorldScene > baueDevTabs > MAPS): Planungskarten sowieso, aber auch live
  platzierte Karten (Schnellzugang ohne Hinlaufen). Autor-Order R138b.

## Offene Arbeitsauftraege fuer Codex

- **`docs/handoff/HAEUSER-IN-RAVENSMOOR.md`** - die gebauten 3D-Haeuser an ihre
  Platzhalter-Boxen im neuen Ravensmoor (Area `stadt`) setzen.
- **`docs/handoff/REITPFERD-UEBERARBEITUNG.md`** - Reitpferd Asset-Seite (Galopp-
  Clipping per breiterer Atlas-Zelle neu rendern, kraeftigere Beine). Claudes
  Code-Fixes (Kadenz, Tint, Spuren) bleiben.
- **`docs/handoff/UI-UMBAU.md`** - das GESAMTE UI umbauen (HUD, Hauptmenue,
  Einstellungen, Charakter, Inventar, Shop, Dialog). Enthaelt Architektur-
  Landkarte, den Signatur-Vertrag (was erhalten bleiben MUSS) und die Zwei-
  Kamera-Falle. In-Game-UI lebt in WorldScene, NICHT in UIScene.
