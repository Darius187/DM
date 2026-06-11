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

// Dorfvolk (Feedback-Runde 9): Berufe und Familien des 17. Jahrhunderts.
// Zwei, drei Sätze je Figur - Alltag, Krieg und Aberglaube der Zeit.
export const VOLK: Readonly<Record<string, ReadonlyArray<string>>> = {
  schulze: [
    'Schulze Bertram, Vorsteher dieses Dorfes. Der Landherr ist fern, die Zeiten sind böse - also halte ich Ordnung, so gut ein Mann das vermag.',
    'Wenn die Sturmglocke geht, sammeln sich alle im Gemeindehaus. Wer eine Klinge führen kann, stellt sich an die Tore. So halten wir es seit dem großen Krieg.',
  ],
  baecker: [
    'Frisch aus dem Ofen, wenn der Tag jung ist. Das Korn wird knapp, seit die Wege unsicher sind - aber solange die Mühle mahlt, backe ich.',
    'Meine Elsbeth führt den Laden, ich stehe am Ofen, und die kleine Lisbeth stiehlt die Krumen. So soll es sein.',
  ],
  zimmermann: [
    'Jakob, Zimmermann. Balken, Dachstühle, Särge - in diesen Tagen leider mehr Särge, als mir lieb ist.',
    'Die Palisade? Gutes Holz, sauber gesetzt. Wenn der Schmied den Auftrag gibt, stehen meine Leute bereit.',
  ],
  schneider: [
    'Caspar, Schneider. Ich flicke mehr, als ich nähe - neues Tuch hat seit Jahren keiner mehr gesehen. Aber ein gerader Saum hält die Würde zusammen.',
  ],
  hirte: [
    'Ich hüte die Schweine und die Hühner vom Veit. Nachts höre ich manchmal die Wölfe drüben im Dunkelwald - dann zähle ich die Tiere zweimal.',
  ],
  magd: [
    'Trine, ich helfe an der Mühle. Säcke schleppen, Korn schütten - harte Arbeit, aber ehrliche. Die Witwe Käthe hat mich aufgenommen, Gott vergelte es ihr.',
  ],
  waescherin: [
    'Ida. Ich wasche am Bach, solange das Licht reicht. Das Wasser ist eiskalt, aber es ist das einzige in Ravensmoor, das noch sauber ist.',
  ],
  wirtin: [
    'Mathilde, die Wirtin. Setzt euch ans Feuer, der Abend ist rau. Der Heinrich handelt, ich führe die Stube - und über das Raunen unter der Kirche reden wir hier drinnen nicht.',
  ],
  kind1: [
    'Hast du das Schwert mal gezogen? Zeig mal! Mutter sagt, ich darf nicht zum Friedhof - aber du warst DRUNTER, stimmt das?',
  ],
  kind2: [
    'Ich hab eine tote Maus im Brunnen gesehen! Sag es nicht dem Schulzen. Willst du mein Geheimversteck sehen? Es ist hinter dem Backhaus.',
  ],
  frau1: [
    'Gott zum Gruße. Verzeiht die Unordnung - der Tag hat mehr Arbeit als Stunden.',
  ],
  frau2: [
    'Margret, die Frau vom Jakob. Er kommt abends mit Spänen im Haar heim und der Hannes hängt ihm am Bein. Gute Männer, beide.',
  ],
  witwe: [
    'Käthe. Meinen Mann hat der Krieg geholt, das Haus ist geblieben. Jetzt wohnen Trine und der Lenz bei mir - allein wird einem die Stille zu laut.',
  ],
  // Runde 10: die Zünfte - jede mit Nutzen für den Helden
  bader: [
    'Severin, Bader und Wundarzt. Zähne ziehen, Adern lassen, Wunden nähen - bei mir kommt ihr billiger davon als beim Tod.',
    'Setzt euch ins warme Wasser, ich flicke euch zusammen. Wer aus der Krypta steigt, braucht beides.',
  ],
  kuefer: [
    'Urban, Küfer. Ohne Fässer kein Bier, kein Met, kein Sauerkraut - das halbe Dorf läuft durch meine Reifen, auch wenn es das nicht weiß.',
    'Gutes Holz ist knapp. Bringt mir welches, und ich zahle bar - die Wirtin wartet auf neue Fässer.',
  ],
  weberin: [
    'Adelheid, Weberin. Die Wolle kommt vom Tobias, das Linnen vom Feld - und aus beidem mache ich Tuch, das euch im Winter das Leben rettet.',
    'Wenn ihr Wolle vom Schäfer mitbringt, zahle ich gut. Mein Webstuhl steht nie still.',
  ],
  gerber: [
    'Lorenz. Ja, es stinkt - Lohe und Häute riechen nun mal nicht nach Rosen. Darum sitze ich am Bach, flussabwärts, wo es keinen stört.',
    'Wolfsfelle nehme ich euch ab, gutes Geld für gutes Fell. Daraus wird Leder, das härter schützt als mancher Harnisch.',
  ],
  hebamme: [
    'Walpurga, Hebamme. Ich hole die Kinder dieses Dorfes auf die Welt und bringe die Fiebernden durch die Nacht. Meine Sude sind die günstigsten weit und breit.',
  ],
  kuester: [
    'Benedikt, Küster von St. Marien. Ich läute die Glocken, führe die Bücher und lehre die Kinder Lesen, Schreiben und den Katechismus.',
    'Auch ein Schwertarm wird klüger, wenn der Kopf es ist. Setzt euch dazu - eine Lektion kostet wenig und nützt lang.',
  ],
  fischer: [
    'Nepomuk, Fischer. Der Bach gibt jeden Morgen her, was der Herrgott erlaubt - Forellen, Äschen, ab und zu einen Aal.',
    'Frischer Fang macht müde Knochen munter. Geräuchert hält er bis tief in die Krypta.',
  ],
  imker: [
    'Anselm, Imker. Meine Bienen sammeln, was das Dorf süß macht - Honig für den Bäcker, Wachs für die Kirche, Met für die Taverne.',
    'Stört mir die Körbe nicht! Aber kostet den Met - der macht warm bis in die Zehen.',
  ],
  schaefer: [
    'Tobias, Schäfer. Die Herde frisst die Weide kurz und gibt Wolle für die Adelheid. Nachts zähle ich sie zweimal - der Wald ist nah.',
    'Wolle gefällig? Die Weberin zahlt für abgelieferte Wolle übrigens mehr, als ich dafür nehme. So bleibt das Geld im Dorf.',
  ],
} as const;
