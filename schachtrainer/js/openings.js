// Opening repertoires for the trainer. Each line is a list of plies: the
// White move to practise (with a short German tip) and a canned Black reply
// so the line stays on track without an opponent engine. SAN notation.

export const OPENINGS = {
  london: {
    name: 'Londoner System',
    side: 'white',
    line: [
      { white: 'd4', black: 'Nf6', tip: 'Beanspruche sofort das Zentrum.' },
      { white: 'Bf4', black: 'e6', tip: 'Der Läufer kommt aktiv heraus, bevor e3 ihn einsperrt.' },
      { white: 'e3', black: 'Be7', tip: 'Stützt d4 und öffnet dem Läufer f1 den Weg.' },
      { white: 'Bd3', black: 'O-O', tip: 'Entwickelt den Läufer auf die starke Diagonale b1–h7.' },
      { white: 'Nf3', black: 'd5', tip: 'Entwickelt den Springer und bereitet die Rochade vor.' },
      { white: 'c3', black: 'c5', tip: 'Stützt d4 dauerhaft und gibt der Dame das Feld c2.' },
      { white: 'Nbd2', black: 'Nc6', tip: 'Der zweite Springer entwickelt sich flexibel.' },
      { white: 'O-O', black: 'b6', tip: 'König in Sicherheit – die Grundstellung des Systems steht.' },
    ],
  },
  italienisch: {
    name: 'Italienisch (Giuoco Piano)',
    side: 'white',
    line: [
      { white: 'e4', black: 'e5', tip: 'Besetze das Zentrum mit dem e-Bauern.' },
      { white: 'Nf3', black: 'Nc6', tip: 'Entwickle mit Tempo und greife e5 an.' },
      { white: 'Bc4', black: 'Bc5', tip: 'Der Läufer zielt auf den schwachen Punkt f7.' },
      { white: 'c3', black: 'Nf6', tip: 'Bereitet d4 vor und baut ein starkes Zentrum auf.' },
      { white: 'd3', black: 'd6', tip: 'Solider Aufbau, hält die Stellung geschlossen.' },
      { white: 'O-O', black: 'O-O', tip: 'Bring den König in Sicherheit.' },
    ],
  },
  carokann: {
    name: 'Caro-Kann (Schwarz)',
    side: 'black',
    line: [
      { white: 'e4', black: 'c6', tip: 'Der Caro-Kann: c6 bereitet d5 vor - solide und stabil.' },
      { white: 'd4', black: 'd5', tip: 'Fordere mit d5 das Zentrum heraus.' },
      { white: 'Nc3', black: 'dxe4', tip: 'Schlage zum Zentrum: dxe4 räumt auf und gewinnt Zeit.' },
      { white: 'Nxe4', black: 'Bf5', tip: 'Entwickle den Läufer nach draußen, bevor e6 ihn einsperrt.' },
      { white: 'Ng3', black: 'Bg6', tip: 'Weiche dem Angriff aus und behalte den guten Läufer.' },
    ],
  },
  damengambit: {
    name: 'Abgelehntes Damengambit (Schwarz)',
    side: 'black',
    line: [
      { white: 'd4', black: 'd5', tip: 'Halte mit d5 das Zentrum.' },
      { white: 'c4', black: 'e6', tip: 'e6 stützt d5 und öffnet dem Läufer f8 den Weg - solide statt gierig.' },
      { white: 'Nc3', black: 'Nf6', tip: 'Entwickle den Springer und kämpfe um e4.' },
      { white: 'Bg5', black: 'Be7', tip: 'Be7 löst die Fesselung sanft auf.' },
      { white: 'e3', black: 'O-O', tip: 'Rochiere - König in Sicherheit, der Aufbau steht.' },
    ],
  },
  skandinavisch: {
    name: 'Skandinavisch (Schwarz)',
    side: 'black',
    line: [
      { white: 'e4', black: 'd5', tip: 'Skandinavisch: d5 fordert sofort den e-Bauern heraus.' },
      { white: 'exd5', black: 'Qxd5', tip: 'Nimm mit der Dame zurück - rechne aber mit einem Tempoangriff.' },
      { white: 'Nc3', black: 'Qa5', tip: 'Bring die Dame auf a5 in Sicherheit, abseits der Angriffe.' },
      { white: 'd4', black: 'Nf6', tip: 'Entwickle den Springer und kontrolliere e4 und d5.' },
      { white: 'Nf3', black: 'c6', tip: 'c6 gibt der Dame ein Fluchtfeld und stützt das Zentrum.' },
    ],
  },
};

// Compare two SAN strings ignoring check/mate markers.
export function normalizeSan(san) {
  return String(san || '').replace(/[+#]/g, '');
}
