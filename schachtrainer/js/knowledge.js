// Condensed, faithful digest of the Schach-Wissen handbook, used to ground the
// local Ollama model. The full handbook (public/wissen.html) is far too large
// to send to a local model per request, so this captures its core principles
// and Merksätze in a compact form (~1k tokens).
export const KNOWLEDGE_DIGEST = [
  'GRUNDIDEE: Ziel ist Schachmatt, nicht Material. Königssicherheit zählt mehr als ein Mehrbauer.',
  'Sieh zwei Filme: deinen Plan UND den Plan des Gegners.',
  'ZENTRUM: d4, e4, d5, e5 sind der Marktplatz. Wer es kontrolliert, ist überall schneller.',
  'PATZER-CHECK vor jedem Zug: 1) Schachs? 2) Schlagzüge? 3) Drohungen? 4) steht etwas ungedeckt? 5) wird mein König schwächer? Erst Sicherheitsgurt, dann Gas.',
  'Merksatz: "Lose Figuren gehen verloren." Fast jede Taktik beginnt bei einer ungedeckten Figur.',
  'Merksatz: "Patzer sieht Schach, Patzer gibt Schach." Ein Schach muss etwas bringen (Material, Matt, Tempo).',
  'TAKTIK-MOTIVE: Gabel, Fesselung, Spieß, Abzugsangriff/-schach, Doppelangriff, Überlastung, Ablenkung, Hinlenkung, Zwischenzug, Grundreihenmatt, Mattnetz.',
  'STELLUNGSBEWERTUNG, 7 Fragen: Material, Königssicherheit, Figurenaktivität, Bauernstruktur, Raum, Initiative, Endspielperspektive.',
  'STRATEGIE: Verbessere deine schlechteste Figur. Aktivität zählt. Kontrolliere offene Linien. Besetze Vorposten. Schaffe zweite Schwächen. Prophylaxe: nimm dem Gegner seinen Plan weg.',
  'Merksatz: "Gegen einen Flügelangriff hilft ein Gegenstoß im Zentrum." Und: "Die Drohung ist stärker als ihre Ausführung."',
  'BAUERN sind das Skelett: Doppelbauer, Isolani, rückständiger Bauer, Freibauer (gedeckt = gefährlich), Bauernkette (greife die Basis an). Im Zweifel zur Mitte schlagen.',
  'ERÖFFNUNG: Zentrum besetzen, Figuren entwickeln (Springer vor Läufer), früh rochieren, nicht dieselbe Figur mehrfach ziehen, Dame nicht zu früh, Türme verbinden. Prinzipien vor Auswendiglernen.',
  'Mit Weiß drücken und die Initiative halten; mit Schwarz erst ausgleichen, dann zuschlagen.',
  'ANGRIFF braucht: mehr Angreifer als Verteidiger am König, offene Linien/Diagonalen, schwache Fluchtfelder, Tempo. Nicht mit zwei Figuren gegen fünf Verteidiger stürmen.',
  'VERTEIDIGUNG: König wegziehen, Verteidiger zurückholen, gefährlichste Angriffsfigur tauschen, Gegenspiel suchen, Luftloch schaffen, notfalls Material zurückgeben.',
  'ENDSPIEL: König aktivieren (er ist eine Figur), Freibauern schaffen, Türme gehören hinter Freibauern. Opposition und Schlüsselfelder im Bauernendspiel. Quadratregel. Zugzwang nutzen. König gehört vor seine Bauern. Randbauer ist oft Remisbauer.',
  'Wichtige Endspiele: K+D gegen K und K+T gegen K gewinnen (Rand, Patt vermeiden). Lucena = Gewinn (Brücke bauen), Philidor = Remis (3./6. Reihe halten).',
  'FIGURENWERT (Faustwerte): Bauer 1, Springer 3, Läufer 3, Turm 5, Dame 9. Aktive Figur kann mehr wert sein als der Nennwert. Läuferpaar ist in offenen Stellungen stark; Springer mögen geschlossene Stellungen und Vorposten.',
].join('\n');
