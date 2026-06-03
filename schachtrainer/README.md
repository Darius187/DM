# Schachtrainer

Lokales, kostenloses Schach-Trainingsprogramm im Browser. Siehe `../SCHACHTRAINER_PROJECT.md` für die vollständige Spezifikation.

## Funktionen (Phasen 1–7 abgeschlossen)

1. **Brett & Regeln** — chessground + chess.js, Züge per Maus, illegale Züge werden abgelehnt, Erkennung von Schach/Matt/Patt/Remis.
2. **Gegner** — Stockfish 18 (lite-single, WASM) im Web Worker, antwortet auf jeden Zug. Stärke über das Dropdown „Stärke".
3. **Analyse** — Bewertungsbalken, Bester-Zug-Pfeil als Tipp (Checkbox „Tipp anzeigen"), Patzer-Warnung bei großem Bewertungsabfall. Eine zweite Stockfish-Instanz analysiert mit voller Stärke, unabhängig vom (evtl. geschwächten) Gegner.
4. **Sprachausgabe** — Züge und Vorschläge werden auf Deutsch angesagt („Läufer auf c2"), Checkbox „Ansage".
5. **Trainer-Erklärung (optional)** — deutsche Erklärungen von einem lokalen Ollama-Modell (Checkbox „Trainer"). Wenn Ollama nicht läuft, bleibt die App voll funktionsfähig und zeigt einen Hinweis.
6. **Eröffnungstrainer** — führt Zug für Zug durch das Londoner System und das Italienische, mit Pfeil, Ansage und Erklärung bei Abweichung.
7. **PGN** — Partie speichern (Download + Textfeld) und laden; geladene Partien lassen sich mit ◀ ▶ durchblättern.

## Hinweise

- **Stärke:** Stockfishs `UCI_Elo` hat eine Untergrenze von 1320, was für absolute Anfänger zu stark ist. Schwache Stufen laufen daher über `Skill Level` (0–20); höhere Stufen („Klub", „Stark") nutzen `UCI_Elo`.
- **Engine-Dateien:** werden beim `npm install`, `npm run dev` und `npm run build` automatisch aus `node_modules/stockfish` nach `public/engine/` kopiert (`scripts/copy-engine.js`) und sind daher nicht im Git eingecheckt.
- **Erklärungen sind nur so gut wie das lokale Modell.** Im Zweifel zählt immer Stockfishs Bewertung, nicht der Erklärungstext.

## Starten

```bash
cd schachtrainer
npm install
npm run dev
```

Dann im Browser `http://localhost:5173` öffnen (über den Dev-Server, nicht per Doppelklick auf die Datei – Web Worker und WASM brauchen `http://localhost`).

## Ollama einrichten (optional, für die Trainer-Erklärungen)

```bash
ollama pull llama3.1:8b   # oder ein anderes deutschfähiges Modell
```

Der Browser ruft `http://localhost:11434/api/generate` auf. Wegen CORS muss Ollama Anfragen vom App-Ursprung erlauben, z. B.:

```bash
OLLAMA_ORIGINS="http://localhost:5173" ollama serve
```

Das Modell lässt sich im Textfeld neben der „Trainer"-Checkbox ändern.

## Bedienung

- Figur per Maus ziehen → Zug wird ausgeführt, wenn legal
- **Neue Partie** setzt das Brett zurück (bzw. startet die gewählte Eröffnung neu)
- **Zug zurück** nimmt den letzten Zug zurück
- **Seite** (Weiß/Schwarz), **Stärke**, **Eröffnung** und die Checkboxen **Tipp/Ansage/Trainer** oben in der Leiste
- **PGN**: Speichern / Laden / ◀ ▶ zum Durchblättern
