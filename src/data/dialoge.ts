// NPC-Dialoge - 1:1 aus der Referenz (talkTo). Neue NPCs (Landherr, Schmied,
// Müller, Bauern, Händler) laut Masterprompt Teil 7/8 NEU verfasst, knapper
// zeitgemäßer Ton, durchgehend Deutsch.

export interface DlgPage {
  text: string;
  action?: string; // Schlüssel für Spiel-Effekte (z. B. 'gibSchluessel')
  choices?: Array<{ label: string; action?: string }>;
}

// --- Referenz-Dialoge (wörtlich) ---

export const JOHANNES = {
  ohneSchluessel: [
    { text: 'Ihr seid es also, den man geschickt hat... Hört ihr sie nicht? Die Stimmen aus der Krypta. Seit die Soldaten die Kirche geplündert haben, schweigen sie nicht mehr.' },
    { text: 'Tief unter dem Gewölbe liegt ein Kreuzritter begraben. Er kehrte einst mit einem Relikt aus dem Heiligen Land zurück - einem "Geschenk", sagte er. Es verwandelte Menschen in etwas Anderes. Man begrub ihn bei lebendigem Leib.' },
    { text: 'Nehmt den Schlüssel zur Krypta. Und betet, dass Gott euch dort unten noch hört.', action: 'gibSchluessel' },
  ],
  mitSchluessel: [
    { text: 'Die Kirchentür ist offen für euch. Steigt hinab, wenn ihr den Mut habt - aber wisst: Was dort unten "lebt", war einmal Mensch.' },
  ],
  nachBoss: [
    { text: 'Die Stimmen... sie sind verstummt. Was immer ihr dort unten getan habt - möge es der Herr richten, nicht ich.' },
  ],
  // NEU: dankbare Zeile nach Zerstörung des Relikts (Masterprompt Teil 8)
  nachZerstoerung: [
    { text: 'Zum ersten Mal seit Jahren habe ich die Frühmesse gelesen, ohne dass es unter dem Boden raunte. Gott hat euch geschickt, daran zweifle ich nicht mehr.' },
  ],
} as const;

export const HEINRICH = {
  erstesMal: [
    { text: 'Willkommen im Schwarzen Raben, Fremder. Verschlagenes Bier, aber das Einzige weit und breit. Seit die Schweden das Kirchensilber gestohlen haben, ruhen die Toten nicht mehr - das sage ich jedem, der es hören will.' },
    { text: 'Meine Anna... sie suchte damals, als die Pest kam, Schutz in der Krypta. Was sie dort fand, war keine Rettung. Fragt nicht weiter.' },
  ],
  handel: {
    text: 'Braucht ihr etwas für den Weg nach unten?',
    choices: [
      { label: 'Handel', action: 'shopHeinrich' },
      { label: 'Bett mieten (10 Gold)', action: 'bettMieten' },
      { label: 'Lebt wohl' },
    ],
  },
  // NEU: Anna-Quest (Masterprompt 7.3 - Grabkammer der Anna)
  medaillon: [
    { text: 'Das... das ist Annas Medaillon. Ich habe es ihr zur Verlobung geschenkt, ein Leben ist das her.' },
    { text: 'Ihr wart dort unten. Bei ihr. Dann hat sie nun jemand gesehen, der ihr nichts Böses wollte - das ist mehr, als ich je hoffen durfte.', action: 'annaBelohnung' },
    { text: 'Nehmt das hier. Es lag für schlechte Zeiten unter dem Schankboden, aber es gibt keine schlechteren als diese. Und... danke, Fremder.' },
  ],
  nachMedaillon: [
    { text: 'Seit ihr mir das Medaillon gebracht habt, schlafe ich zum ersten Mal wieder. Anna hat nun Ruhe - und ich vielleicht auch bald.' },
  ],
  // NEU: dankbare Zeile nach Zerstörung des Relikts
  nachZerstoerung: [
    { text: 'Das erste ehrliche Bier des Jahres geht auf euch, Fremder. Solange ich hinter diesem Tresen stehe, zahlt ihr hier keinen Heller mehr.' },
  ],
} as const;

export const MAGDALENA = {
  erstesMal: [
    { text: 'Die Sterne stehen schlecht, Fremder. Unter der Krypta liegt mehr als nur der Ritter - eine alte Kultstätte, älter als das Kreuz. Der Krieg hat den Boden bereitet, und nun erwacht es.' },
    { text: 'Nehmt dies. Gegen die Schatten.', action: 'gibTraenke' },
  ],
  wiederholt: [
    { text: 'Hütet euch vor dem "Geschenk" des Ritters. Was ewig lebt, hat aufgehört, Mensch zu sein.' },
  ],
  handel: {
    text: 'Meine Kräuter sind nicht umsonst, aber ehrlich.',
    choices: [
      { label: 'Handel', action: 'shopMagdalena' },
      { label: 'Lebt wohl' },
    ],
  },
  // NEU: dankbare Zeile nach Zerstörung des Relikts
  nachZerstoerung: [
    { text: 'Die Sterne haben sich gedreht, Fremder. Zum ersten Mal seit Jahren lese ich in ihnen etwas anderes als Unheil.' },
  ],
} as const;

// --- NEUE NPCs (Masterprompt Teil 7) ---

export const LANDHERR = {
  // Intro im Dunkelwald (Masterprompt 7.1/Teil 8): Auftrag, knapper zeitgemäßer Ton.
  // Name/Anrede liegen in story.json, damit der Autor sie leicht anpassen kann.
  auftrag: [
    { text: 'Ihr habt mich nicht warten lassen - das gefällt mir. Hört zu, denn der Weg ist weit und der Tag kurz.' },
    { text: 'Aus Ravensmoor kommen seit zwei Monden weder Abgaben noch Nachrichten. Kein Bote kehrte zurück. Die Leute reden von Pest, von Schlimmerem - ich gebe nichts auf Gerede, aber auf meine Einkünfte.' },
    { text: 'Reitet hin und seht nach dem Rechten. Folgt dem Pfad durch den Dunkelwald, er führt geradewegs ins Dorf. Und Fremder - was immer ihr dort findet: Ich will die Wahrheit, nicht die hübsche Fassung davon.', action: 'questStart' },
  ],
} as const;

export const SCHMIED = {
  begruessung: [
    { text: 'Ein neues Gesicht - und eines, das eine Waffe trägt. Gut. Der Amboss hier hat seit Wochen nichts als Sensen und Hufeisen gesehen.' },
  ],
  handel: {
    text: 'Stahl, Pfeile, Werkzeug - oder soll ich an Eurem Eisen arbeiten?',
    choices: [
      { label: 'Handel', action: 'shopSchmied' },
      { label: 'Verbessern', action: 'schmieden' },
      { label: 'Wiederaufbau', action: 'aufbau' },
      { label: 'Lebt wohl' },
    ],
  },
} as const;

export const MUELLER = {
  begruessung: [
    { text: 'Das Rad dreht sich, solange der Bach läuft - mehr Verlass ist auf nichts mehr in dieser Zeit. Ihr seid der Fremde, von dem das ganze Dorf spricht?' },
  ],
  rattenQuest: [
    { text: 'Wenn ihr schon fragt: Im Lager hausen Ratten, fett wie Ferkel. Das Korn der Bauern frisst sich von allein weg. Schafft sie mir vom Hals, und ich vergesse es euch nicht.', action: 'rattenQuestStart' },
  ],
  rattenDank: [
    { text: 'Still ist es im Lager - zum ersten Mal seit Wochen. Hier, für eure Mühe. Und das Mehl mahle ich euch künftig zuerst.', action: 'rattenBelohnung' },
  ],
} as const;

export const BAUER1 = {
  begruessung: [
    { text: 'Bleibt von den Gattern weg, wenn euch die Schweine lieb sind - die beißen schneller als mancher Hund. Saatgut und Wurst hätte ich feil, wenn ihr braucht.' },
  ],
  handel: {
    text: 'Was vom Feld und aus dem Stall - ehrliche Ware.',
    choices: [{ label: 'Handel', action: 'shopBauer1' }, { label: 'Lebt wohl' }],
  },
} as const;

export const BAUER2 = {
  begruessung: [
    { text: 'Die Kuh gibt kaum noch Milch, seit das Raunen aus der Kirche kommt. Tiere spüren so etwas, sage ich euch. Tiere wissen es zuerst.' },
  ],
  handel: {
    text: 'Brot und Käse halten Leib und Seele zusammen.',
    choices: [{ label: 'Handel', action: 'shopBauer2' }, { label: 'Lebt wohl' }],
  },
} as const;

export const HAENDLER = {
  begruessung: [
    { text: 'Aus Nürnberg, aus Leipzig, aus dem Welschland - was die Straßen hergeben, liegt auf meinem Karren. Wer weiß, wie lange die Wege noch offen sind. Greift zu, solange ich noch komme.' },
  ],
  handel: {
    text: 'Diese Woche im Angebot - nächste Woche vielleicht nie wieder.',
    choices: [{ label: 'Handel', action: 'shopHaendler' }, { label: 'Lebt wohl' }],
  },
} as const;

// Grabkammer der Anna (Masterprompt 7.3) - kleiner Story-Raum
export const ANNA_GRAB = {
  name: 'Grabkammer',
  text: 'Ein geöffneter Sarg, sorgsamer behauen als alle anderen. Auf dem Deckel eingeritzt: "ANNA - GOTT GEBE IHR DEN FRIEDEN, DEN WIR IHR NICHT GEBEN KONNTEN." Im Staub daneben liegt ein Medaillon an zerrissener Kette.',
  aufheben: 'Das Medaillon an sich nehmen',
} as const;
