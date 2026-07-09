# CODEX.md - Zusammenarbeit Codex + Claude an "Ravensmoor"

Willkommen, Codex. Du hilfst bei der OPTIK (besonders Menue-Bilder via ChatGPT).
Damit wir uns NICHT in die Quere kommen, halte dich an diese Regeln.

## 1. Grundregeln (Pflicht)
- Lies zuerst `CLAUDE.md` (Arbeitskodex) und `DECISIONS.md` (was schon entschieden ist).
- Aendere KEINE bestehenden Systeme/Logik. Kein Umbau von Wasser, Terrain, Kampf,
  Wegfindung, WorldScene. Nur NEUE Dateien + die unten genannten Andockstellen.
- Sprache: Spielertexte + Kommentare auf Deutsch, Code-Bezeichner auf Englisch.
  Kein "—" (immer "-"). Keine Secrets/Keys committen.
- Nach Aenderung: `npx tsc --noEmit` fehlerfrei + `npx vitest run` gruen.

## 2. Getrennte Zustaendigkeit (damit nichts kollidiert)
- DU (Codex): Bild-Texturen + Icons in `assets/ui/`, und NUR die Datei
  `src/ui/mvTexturen.ts` (dort haengst du die Bilder ein).
- ICH (Claude): das UI-Gerüst (`src/ui/medieval-ui.css`, `src/ui/medievalUi.ts`),
  Spiel-Logik, Integration ins Spiel.
- So fasst niemand die Dateien des anderen an -> keine Merge-Konflikte.

## 3. Menue-Bilder: so lieferst du sie
- NICHT ein grosses Bild als ganzes Menue. Nur kleine, kachelbare Flaechen/Teile.
- Genaue Namen, Groessen und der Einbau stehen in `assets/ui/README.md`.
- Kurz: PNG nach `assets/ui/` legen -> in `src/ui/mvTexturen.ts` importieren +
  ins `TEXTUREN`-Objekt eintragen. Vite bindet es automatisch ein.
- Ansehen: Spiel starten (`npm run dev`), Titelmenue -> "MENUE-PROBE (UI)".

## 4. Branch / Ablauf
- Arbeite auf einem EIGENEN Branch: `codex/ui-texturen` (nicht direkt auf main
  und nicht auf Claudes Feature-Branch).
- Committe klein und mit klarer deutscher Nachricht.
- Wenn fertig: Pull Request auf. Claude sieht ihn durch und pflegt ihn ein.

## 5. Testen
- `npm run dev` startet das Spiel lokal (Vite, http://localhost:5173).
- `npx tsc --noEmit` (Typen), `npx vitest run` (Tests), `npx vite build` (Bundle).

## 6. HUD-Leiste: gehoert jetzt CODEX (R115b, Autor-Entscheidung)
- Die Spiel-HUD-Leiste (`src/ui/hud.ts`) darf Codex komplett umgestalten -
  Claudes flacher Umbau (R115) wurde auf Autorwunsch REVERTIERT, Ausgangslage
  ist wieder der Kugel-Stand davor.
- Referenzen: `menu-ui-template/claude-code-handover-final-ui-1300.md` +
  `final-hud-extra-flat-reference-layout-1300.png` (massgeblich).
- REGELN dabei:
  - NUR `src/ui/hud.ts` anfassen (plus neue Assets in `assets/ui/`).
  - Oeffentliche Anker/Signaturen ERHALTEN (werden von aussen genutzt):
    `orbHpAnkerX`, `orbMpAnkerX`, `mausLeisteAnkerX`, `hotbarMitteX`,
    Klasse `Hud` mit `update(extra)`, `belegeBeiPunkt`, `klickBlockiert`.
  - UI-Texte aus dem Code (Settings/kb), NICHT aus den AI-Bildern abtippen.
  - `npx tsc --noEmit` + `npx vitest run` gruen; eigener Branch, PR an Claude.
