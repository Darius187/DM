# Schachtrainer

Lokales, kostenloses Schach-Trainingsprogramm im Browser. Siehe `../SCHACHTRAINER_PROJECT.md` für die vollständige Spezifikation.

## Aktueller Stand

**Phase 1** abgeschlossen: Brett anzeigen (chessground), Züge per Maus, Regeln über chess.js, illegale Züge werden abgelehnt.

Nächste Phasen siehe Spezifikation:
2. Stockfish als Gegner (UCI, Stärke einstellbar)
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
