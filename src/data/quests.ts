// Quest-Datenbank (Runde 52, Autorwunsch "RPG/WoW-ähnliche Quest-Steuerung").
// REINE DATEN + Prädikate (Phaser-frei -> testbar). Jede Quest hat geordnete
// Ziele; das erste noch nicht erfüllte Ziel ist das "aktuelle" - genau das zeigt
// der Quest-Verfolger auf dem Hauptbildschirm an. Die Bedingungen lesen den
// Spielzustand aus einem QuestCtx (Flags + ein paar abgeleitete Werte), damit
// die bestehende Story-Logik (Flags in WorldScene) NICHT umgebaut werden muss.
//
// WICHTIG (Kodex Regel 6): die Aufgabentexte stammen 1:1 aus der bisherigen
// Aufgabenliste (journalLines) - es wird KEIN neuer Story-Inhalt erfunden.

export type QuestKategorie = 'haupt' | 'neben' | 'ereignis';

// Spielzustand, soweit die Quests ihn brauchen. WorldScene baut ihn pro Abruf.
export interface QuestCtx {
  flags: Record<string, boolean>;
  hasKey: boolean;
  bossDead: boolean;
  level: number;
}

export interface QuestZiel {
  text: string;                       // Aufgabentext (was tun)
  wohin?: string;                     // Ortshinweis (wohin) - fürs "du weißt, wohin"
  erfuellt: (c: QuestCtx) => boolean; // Ziel erreicht?
}

export interface QuestDef {
  id: string;
  titel: string;
  kategorie: QuestKategorie;
  geber: string;                      // Questgeber (Stimmung/Herkunft)
  kurz: string;                       // ein Satz Beschreibung
  ziele: QuestZiel[];                 // geordnete Schritte
  aktiv: (c: QuestCtx) => boolean;    // Quest ist angenommen/im Logbuch sichtbar
  fertig: (c: QuestCtx) => boolean;   // komplett abgeschlossen
  belohnung?: string;                 // optionaler Belohnungshinweis
}

const f = (c: QuestCtx, k: string): boolean => c.flags[k] === true;

export const QUESTS: QuestDef[] = [
  {
    id: 'haupt_unsterblichkeit',
    titel: 'Der Preis der Unsterblichkeit',
    kategorie: 'haupt',
    geber: 'Der Landherr',
    kurz: 'Ein Bote ruft dich in den Dunkelwald - Rabenmoor stirbt an einem alten Übel.',
    aktiv: () => true, // die Hauptquest liegt von Anfang an im Logbuch
    fertig: (c) => c.bossDead || f(c, 'ngPlus'),
    ziele: [
      { text: 'Sprich mit dem Landherrn im Dunkelwald.', wohin: 'Dunkelwald', erfuellt: (c) => f(c, 'auftragErhalten') },
      { text: 'Folge dem Pfad nach Osten nach Rabenmoor.', wohin: 'Pfad nach Osten', erfuellt: (c) => f(c, 'nAnkunft') },
      { text: 'Hol den Kryptaschlüssel von Pater Johannes an der Kirche.', wohin: 'Kirche von Rabenmoor', erfuellt: (c) => c.hasKey },
      { text: 'Steig in die Krypta hinab und finde die Quelle des Übels.', wohin: 'Krypta unter der Kirche', erfuellt: (c) => c.bossDead },
    ],
  },
  {
    // M8 Dorfwirtschaft: "Stahl fuer Rabenmoor" (Schmied) - real verdrahtet
    id: 'neben_stahl',
    titel: 'Stahl für Rabenmoor',
    kategorie: 'neben',
    geber: 'Der Schmied',
    kurz: 'Der Schmied braucht Erz, um die erste Waffe aus Rabenmoorer Stahl zu schmieden.',
    aktiv: () => true,
    fertig: (c) => f(c, 'stahlWaffe'),
    belohnung: '40 Gold - und die erste Waffe im Verkauf des Schmieds',
    ziele: [
      { text: 'Bringe dem Schmied 5 Erz (aus Krypta-Beute oder vom Händler).', wohin: 'Schmiede in Rabenmoor', erfuellt: (c) => f(c, 'stahlErz') },
      { text: 'Der Schmied schmiedet die erste Waffe.', erfuellt: (c) => f(c, 'stahlWaffe') },
    ],
  },
  {
    id: 'neben_ratten',
    titel: 'Die Ratten der Mühle',
    kategorie: 'neben',
    geber: 'Der Müller',
    kurz: 'Im Lager der Mühle nisten Ratten - der Müller bittet um Hilfe.',
    aktiv: (c) => f(c, 'muellerQuest'),
    fertig: (c) => f(c, 'rattenFertig'),
    belohnung: '60 Gold und Brot',
    ziele: [
      { text: 'Erledige die Ratten im Lager der Mühle und kehr zum Müller zurück.', wohin: 'Mühle bei Rabenmoor', erfuellt: (c) => f(c, 'rattenFertig') },
    ],
  },
  {
    id: 'neben_medaillon',
    titel: 'Annas Medaillon',
    kategorie: 'neben',
    geber: 'Anna',
    kurz: 'Ein Medaillon vom Grab - es gehört in Heinrichs Hände.',
    aktiv: (c) => f(c, 'medaillonGenommen'),
    fertig: (c) => f(c, 'annaQuestFertig'),
    ziele: [
      { text: 'Bring Annas Medaillon zu Heinrich in die Taverne.', wohin: 'Taverne von Rabenmoor', erfuellt: (c) => f(c, 'annaQuestFertig') },
    ],
  },
  {
    // R176 (Autor "ich will eine Quest fuer das Stadtportal, ab der dritten
    // Ebene im Verlies"): Freischaltung haengt am bestehenden ebene3-Flag.
    id: 'neben_stadtportal',
    titel: 'Der Weg zurück ans Licht',
    kategorie: 'neben',
    geber: 'Das Verlies',
    kurz: 'Wer sich bis zur dritten Ebene des Verlieses vorkämpft, dem öffnet sich das Stadtportal.',
    aktiv: (c) => c.hasKey,
    fertig: (c) => f(c, 'ebene3'),
    belohnung: 'Der Stadtportal-Zauber - jederzeit zurück nach Rabenmoor',
    ziele: [
      { text: 'Erreiche die dritte Ebene des Verlieses.', wohin: 'Verlies unter der Kirche', erfuellt: (c) => f(c, 'ebene3') },
    ],
  },
  {
    id: 'haupt_schattenfuerst',
    titel: 'Der Schattenfürst',
    kategorie: 'haupt',
    geber: 'Neues Spiel +',
    kurz: 'Das Übel ist nicht gebannt - im Grab des Kreuzritters wartet ein stärkerer Feind.',
    aktiv: (c) => f(c, 'ngPlus'),
    fertig: (c) => f(c, 'ngPlusGeschafft'),
    ziele: [
      { text: 'Im Grab des Kreuzritters wartet der Schattenfürst - besiege ihn.', wohin: 'Grab des Kreuzritters', erfuellt: (c) => f(c, 'ngPlusGeschafft') },
    ],
  },
  {
    id: 'ereignis_krieg',
    titel: 'Der Krieg um Rabenmoor',
    kategorie: 'ereignis',
    geber: 'Ereignis',
    kurz: 'Der Krieg hat begonnen - die Gräber drohen das Land zu verschlingen.',
    aktiv: (c) => f(c, 'kriegBegonnen'),
    fertig: () => false, // offenes Ereignis (kein Abschluss-Flag im Spiel)
    ziele: [
      { text: 'Finde das WAHRE Relikt, ehe die Gräber das Land verschlingen.', wohin: 'Rabenmoor und seine Krypten', erfuellt: () => false },
    ],
  },
];
