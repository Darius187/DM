# SCHACHTRAINER - Projektanweisung für Claude Code

## Ziel

Ein Schach-Trainingsprogramm, das im Browser läuft, vollständig lokal und kostenlos (keine Claude API, keine Cloud). Es soll mir bei jedem Zug helfen: besten Zug vorschlagen, Stellung bewerten, Fehler warnen, auf Deutsch erklären warum, und die Züge per Sprachausgabe ansagen (zum Beispiel "Läufer auf c2"). Ziel ist, mich vom Anfänger systematisch stärker zu machen.

## Technik-Stack (alles lokal, kostenlos)

| Aufgabe | Werkzeug |
|---|---|
| Brett-Anzeige | chessground (Brett von Lichess) |
| Regeln, legale Züge, SAN, FEN | chess.js |
| Engine (Zugvorschlag, Bewertung) | stockfish.js / stockfish.wasm (läuft im Browser als Web Worker) |
| Deutsche Erklärungen | lokales Sprachmodell über Ollama (localhost:11434) |
| Sprachausgabe der Züge | Web Speech API (SpeechSynthesis, deutsche Stimme) |

Alternative zur Brett-Anzeige, falls chessground zu kompliziert ist: chessboard.js (einfacher, älter). Empfehlung ist chessground wegen besserer Qualität.

Alternative für die Sprachausgabe, falls die Browser-Stimmen zu schlecht klingen: edge-tts über einen kleinen lokalen Python-Dienst (kenne ich aus meinem Obsidian-Setup, +20% Tempo). Erst mit der Web Speech API starten, edge-tts nur bei Bedarf nachrüsten.

## Funktionen

1. Spiel gegen Stockfish, Stärke einstellbar (für den Start bewusst schwach).
2. Nach jedem meiner Züge: bester Zug als Pfeil auf dem Brett plus Bewertung (wer steht wie gut).
3. Blunder-Warnung, wenn die Bewertung durch meinen Zug stark abfällt.
4. Deutsche Erklärung vom lokalen Modell: warum der vorgeschlagene Zug gut ist, was der Plan ist, was an meinem Zug schlecht war.
5. Gesprochene Zugansage auf Deutsch, sowohl für den Vorschlag als auch optional für meinen eigenen Zug.
6. Eröffnungstrainer: führt mich durch das Londoner System und das Italienische, Zug für Zug.
7. Partie als PGN speichern, um sie später noch einmal anzusehen.

## Sprachausgabe: SAN nach Deutsch umwandeln

chess.js liefert Züge in SAN (zum Beispiel `Bc2`, `Nf3`, `O-O`, `exd5`, `Qh7#`). Diese müssen in deutsche Sprache übersetzt werden.

Figuren-Buchstaben zu deutschem Wort:

| SAN | Deutsch |
|---|---|
| K | König |
| Q | Dame |
| R | Turm |
| B | Läufer |
| N | Springer |
| (kein Buchstabe) | Bauer |

Weitere Zeichen:
- `x` = "schlägt"
- `+` = "Schach"
- `#` = "Schachmatt"
- `O-O` = "kurze Rochade"
- `O-O-O` = "lange Rochade"
- `=Q` (Umwandlung) = "Umwandlung in Dame"

Zielfeld einfach als Buchstabe und Zahl vorlesen ("c2", "e5").

Beispiele:
- `Bc2` -> "Läufer auf c2"
- `Nf3` -> "Springer auf f3"
- `Nxe5` -> "Springer schlägt auf e5"
- `O-O` -> "kurze Rochade"
- `Qh5+` -> "Dame auf h5, Schach"
- `exd5` -> "Bauer schlägt auf d5"

Dafür eine Funktion `sanZuDeutsch(san)` bauen, die den String zerlegt und zusammensetzt, dann an `speechSynthesis.speak()` mit deutscher Stimme (`lang = "de-DE"`) übergeben.

## Stockfish steuern

Stockfish läuft als Web Worker und spricht das UCI-Protokoll. Wichtige Befehle:
- Position setzen: `position fen <FEN>`
- Rechnen lassen: `go depth 15` oder `go movetime 1000`
- Antwort: `bestmove <zug>` und `info ... score cp <wert>` für die Bewertung.

Spielstärke des Gegners begrenzen (für den Anfang):
- `setoption name UCI_LimitStrength value true`
- `setoption name UCI_Elo value 800` (langsam erhöhen, wenn ich besser werde)

Bewertung in Worte: positiver Wert (in Hundertstel-Bauern, "centipawns") heißt Weiß steht besser, negativer heißt Schwarz. Ein Abfall von zum Beispiel mehr als 150 centipawns durch meinen Zug löst die Blunder-Warnung aus.

## Ollama-Anbindung (deutsche Erklärungen)

Ollama läuft lokal auf der RTX 4070 Ti. Der Browser schickt eine Anfrage an `http://localhost:11434/api/generate`.

Wichtig wegen CORS: Ollama muss Anfragen vom Browser-Ursprung erlauben. Dafür `OLLAMA_ORIGINS` setzen, oder die App selbst von localhost ausliefern.

Modell: ein deutschfähiges Modell, das in 12 GB VRAM passt. Startempfehlung zum Testen: `llama3.1:8b` oder `qwen2.5:7b`. Größere Modelle wie `qwen2.5:14b` gehen eventuell knapp, Geschwindigkeit selbst testen. Die deutsche Qualität bitte selbst prüfen, da bin ich mir nicht sicher welches Modell am besten Deutsch kann.

Prompt-Idee an das lokale Modell (mit Stellung als FEN, meinem Zug und Stockfishs bestem Zug als Kontext):

> Du bist ein Schachtrainer. Erkläre auf Deutsch in zwei bis drei kurzen Sätzen, warum der Zug {bester_zug} in dieser Stellung gut ist und was an meinem Zug {mein_zug} schlechter war. Keine langen Ausführungen.

## Eröffnungstrainer

Zwei Repertoires fest hinterlegen, als Zugfolge:

Londoner System (Weiß): d4, Lf4, e3, Ld3, Sf3, c3, Sbd2, kurze Rochade.

Italienisch (Weiß): e4, Sf3, Lc4 (nach 1.e4 e5 2.Sf3 Sc6 3.Lc4).

Der Trainer zeigt den nächsten Soll-Zug an, sagt ihn per Sprachausgabe an und prüft, ob ich ihn richtig gespielt habe. Bei Abweichung kurz erklären, warum der Plan-Zug besser ist.

## Dateistruktur

```
schachtrainer/
  index.html          Brett, Buttons, Bewertungsanzeige
  style.css           Layout
  js/
    main.js           Steuerung, verbindet alles
    board.js          chessground einrichten
    engine.js         Stockfish im Web Worker, UCI
    speech.js         sanZuDeutsch + Sprachausgabe
    coach.js          Anfrage an Ollama, Erklärung anzeigen
    openings.js       London + Italienisch als Zugfolgen
  lib/
    stockfish.wasm    Engine
```

## Bauplan in Phasen

Bitte in dieser Reihenfolge bauen, nach jeder Phase testen:

1. Brett anzeigen (chessground), Figuren per Maus ziehen, Regeln über chess.js, illegale Züge ablehnen.
2. Stockfish als Gegner einbinden, er antwortet auf meine Züge. Stärke per UCI_Elo einstellbar.
3. Bewertungsanzeige und bester-Zug-Pfeil nach jedem meiner Züge. Blunder-Warnung.
4. Sprachausgabe: `sanZuDeutsch` plus Web Speech API, sagt Züge auf Deutsch an.
5. Ollama-Anbindung: deutsche Erklärung nach jedem Zug.
6. Eröffnungstrainer (London + Italienisch).
7. PGN speichern und laden.

## Voraussetzungen

- Node.js (für chessground/chess.js per npm und einen lokalen Dev-Server, zum Beispiel Vite).
- Stockfish als WASM-Datei (gibt es als npm-Paket oder zum Download).
- Ollama installiert und ein Modell geladen (`ollama pull llama3.1:8b`).
- Die App über einen lokalen Server starten, nicht per Doppelklick auf die Datei (Web Worker und CORS brauchen http://localhost, nicht file://).

## Ehrliche Grenzen

- Stockfish sagt, welcher Zug gut ist und um wie viel, aber das "Warum" in Worten kommt vom lokalen Sprachmodell und ist nur so gut wie das Modell. Erwartung entsprechend setzen.
- Lokale Modelle in 12 GB VRAM sind deutlich schwächer als Claude oder GPT. Für kurze Schach-Erklärungen reicht das meist, aber es kann auch mal Unsinn erzählen. Im Zweifel zählt immer Stockfishs Bewertung, nicht die Erklärung.
- Die Web-Speech-Stimmen klingen je nach System unterschiedlich gut. Wenn es stört, auf edge-tts wechseln.
