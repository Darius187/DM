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
- Ausnahme: Fuer die HUD-Leiste gilt die ausdrueckliche Freigabe in Abschnitt 6
  fuer `src/ui/hud.ts`.
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

## 6. HUD-Leiste: Codex integriert die gelieferten Assets (Autor-Entscheidung)
- Die Spiel-HUD-Leiste (`src/ui/hud.ts`) gehoert fuer diese Aenderung Codex.
- Claude Code fasst `src/ui/hud.ts` nicht parallel an und prueft spaeter den PR.
- Bildvorlagen und leere Bauteile liegen unter `assets/ui/hud/`.
- Massgebliche Uebergabe: `assets/ui/hud/README.md`.
- Massgebliche Zielvorlage: `assets/ui/hud/hud-reference-final-extra-flat-1300.png`.
- REGELN dabei:
  - Codex bindet die PNG-Bauteile als Phaser-Images ein; kein Nachmalen der
    gesamten Vorlage mit `Graphics`.
  - Texte, Zahlen, Tastenzuweisungen und Icons bleiben dynamisch aus dem Code.
  - AI-Texte aus Referenzbildern NICHT abtippen oder einbacken.
  - Oeffentliche Anker/Signaturen in `hud.ts` erhalten:
    `orbHpAnkerX`, `orbMpAnkerX`, `mausLeisteAnkerX`, `hotbarMitteX`,
    Klasse `Hud` mit `update(extra)`, `belegeBeiPunkt`, `klickBlockiert`.
