# Schachtrainer

Lokales, kostenloses Schach-Trainingsprogramm im Browser. Siehe `../SCHACHTRAINER_PROJECT.md` für die vollständige Spezifikation.

## Aktueller Stand

**Phase 1** abgeschlossen: Brett anzeigen (chessground), Züge per Maus, Regeln über chess.js, illegale Züge werden abgelehnt.

**Phase 2** abgeschlossen: Stockfish 18 (lite-single, WASM) als Gegner im Web Worker. Die Engine antwortet auf jeden Zug, die Stärke ist über das Dropdown "Stärke" einstellbar.

Hinweis zur Stärke: Stockfishs `UCI_Elo` hat eine Untergrenze von 1320, was für absolute Anfänger zu stark ist. Schwache Stufen laufen daher über `Skill Level` (0–20). Höhere Stufen ("Klub", "Stark") nutzen `UCI_Elo`.

Die Engine-Dateien werden beim `npm install`, `npm run dev` und `npm run build` automatisch aus `node_modules/stockfish` nach `public/engine/` kopiert (Skript `scripts/copy-engine.js`) und sind daher nicht im Git eingecheckt.

Nächste Phasen siehe Spezifikation:
3. Bewertung und Bester-Zug-Pfeil, Blunder-Warnung
4. Sprachausgabe (SAN nach Deutsch)
5. Ollama-Anbindung für deutsche Erklärungen
6. Eröffnungstrainer (London + Italienisch)
7. PGN speichern und laden

## Starten

```bash
cd schachtrainer
npm install
npm run dev
```

Dann im Browser `http://localhost:5173` öffnen.

## Bedienung

- Figur per Maus ziehen → Zug wird ausgeführt, wenn legal
- **Neue Partie** setzt das Brett zurück
- **Zug zurück** nimmt den letzten Zug zurück
- Mit dem Dropdown die eigene Seite (Weiß/Schwarz) wählen
