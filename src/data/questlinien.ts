// QUESTLINIEN-TABELLE (M8 Dorfwirtschaft, vom Autor vorgegeben). Status
// PLATZHALTER = Inhalt kommt spaeter; die Technik (questgeber-Feld am NPC +
// Kopf-Marker + Logbuch-Anbindung) steht bereits. ZWEI Linien sind als Beweis
// real verdrahtet: 'stahl' (Schmied) und 'kopfgeld' (Wirt, wiederholbar).

export interface QuestLinie {
  npc: string;               // NPC-id (Dorf)
  linie: string;             // Name der Questlinie
  freiAb: string;            // wann sie beginnt (lesbar; Logik kommt je Linie)
  inhalt: string;            // Kurzbeschreibung (Autor-Tabelle)
  status: 'aktiv' | 'platzhalter';
}

export const QUESTLINIEN: ReadonlyArray<QuestLinie> = [
  { npc: 'johannes', linie: 'Hauptquest', freiAb: 'sofort', inhalt: 'Krypta/Finsternis (existiert)', status: 'aktiv' },
  { npc: 'schulze', linie: 'Dorf im Aufbau', freiAb: 'sofort', inhalt: 'Wiederaufbau, Abgaben-Noete', status: 'platzhalter' },
  { npc: 'schmied', linie: 'Stahl für Rabenmoor', freiAb: 'sofort', inhalt: 'Erz beschaffen -> erste Waffe -> spaeter Zeughaus/Miliz', status: 'aktiv' },
  { npc: 'magdalena', linie: 'Kräuterkunde', freiAb: 'sofort', inhalt: 'benannte Kraeuter sammeln -> Traenke', status: 'platzhalter' },
  { npc: 'mueller', linie: 'Vom Korn zum Brot', freiAb: 'Tag 2', inhalt: 'die Kette anstossen/retten (mit dem Baecker)', status: 'platzhalter' },
  { npc: 'baecker', linie: 'Vom Korn zum Brot', freiAb: 'Tag 2', inhalt: 'die Kette anstossen/retten (mit dem Mueller)', status: 'platzhalter' },
  { npc: 'fischer', linie: 'Der stille See', freiAb: 'Tag 3', inhalt: 'Angelplaetze, Geruecht im Wasser', status: 'platzhalter' },
  { npc: 'zimmermann', linie: 'Der verbrannte Hof', freiAb: 'nach 1. Einfall', inhalt: 'Wiederaufbau-Projekt (aufbauStufe)', status: 'platzhalter' },
  { npc: 'heinrich', linie: 'Gerüchte am Tresen', freiAb: 'sofort, wiederholbar', inhalt: 'Kopfgelder (System existiert)', status: 'aktiv' },
  { npc: 'imker', linie: 'Süßes Gold', freiAb: 'Tag 4', inhalt: 'Honig/Met', status: 'platzhalter' },
  { npc: 'hebamme', linie: 'Kranke im Dorf', freiAb: 'nach Einfall', inhalt: 'Heilung, verzahnt mit Magdalena', status: 'platzhalter' },
];

// Die Stahl-Quest (real verdrahtet): Zahlen hier justierbar.
export const STAHL_QUEST = {
  erzBedarf: 5,
  belohnungGold: 40,
} as const;
