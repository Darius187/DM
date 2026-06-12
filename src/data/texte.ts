// Alle erzählenden Texte - 1:1 aus der Referenz portiert, nicht paraphrasiert.
// Die zwei neuen Lore-Notizen (Folterkammer, Beinhaus-Schrein) sind laut
// Masterprompt 7.3 NEU zu verfassen - im Stil der Original-Notizen.

export const TITEL = {
  haupt: 'RAVENSMOOR',
  unter: 'DER PREIS DER UNSTERBLICHKEIT',
  intro: 'Anno Domini 1635. Der Krieg wütet seit siebzehn Jahren, die Pest hat das Land geleert, und die Schweden haben das Kirchensilber geraubt. Seitdem, so flüstern die Leute von Ravensmoor, ruhen die Toten unter der Kirche nicht mehr. Du wurdest entsandt, der Sache auf den Grund zu gehen.',
} as const;

// Ich-Erzähler-Interludien "Aus meinen Aufzeichnungen" (Referenz)
export const ERZAEHLER = {
  name: 'Aus meinen Aufzeichnungen',
  ankunft: [
    'Ich wusste nicht, was mich erwartete, als ich den Auftrag annahm, nach Ravensmoor zu reisen. Die Geschichten, die man sich über dieses abgelegene Dorf erzählte, hielt ich für Ammenmärchen - Schauergeschichten für lange Winterabende.',
    'Doch als ich ankam, umhüllten dichter Nebel und eine seltsame Dunkelheit das Dorf. Die wenigen Häuser duckten sich wie ängstliche Tiere um die alte Steinkirche, deren verwitterter Turm sich drohend gegen den bleiernen Himmel reckte. Die Bewohner sprachen nur im Flüsterton.',
  ],
  krypta: [
    'Als ich die modrigen Stufen hinabstieg, kroch die Kälte durch meine Kleidung. Der Fackelschein warf tanzende Schatten an die feuchten Wände - und irgendwo unter mir bewegte sich etwas.',
    'Was ich in den Gewölben fand, spottete jeder Beschreibung: leichenblasse Gestalten, deren Haut wie vergilbtes Pergament wirkte. Ihre Bewegungen waren zu schnell, zu abgehackt für menschliche Wesen.',
  ],
  boss: [
    '»Erlöse mich von meiner ewigen Qual - und ich werde...« Die Stimme kam aus der tiefsten Ecke des Grabes, ein Flüstern wie raschelndes Laub.',
    'Ich wusste nicht, was zu tun war. Aber ich wusste: Dieser Wahnsinn musste enden - und wenn das Opfer ich selbst sein sollte.',
  ],
} as const;

// Lore-Notizen 1-3 aus der Referenz, 4-5 NEU (Folterkammer / Beinhaus-Schrein)
export const NOTIZEN: ReadonlyArray<string> = [
  '»...wir schafften das Silber in die Gruft, ehe die Schweden kamen. Doch Anna sagt, sie hört nachts Stimmen unter dem Boden. Ich habe ihr verboten, je wieder hinabzusteigen.« - Heinrich K., Anno 1632',
  '»Das Beinhaus war voll, lange bevor die Pest kam. Wer hat all diese Toten hierher geschafft? Die Knochen sind angeordnet. Wie Zeichen.« - Bruder Anselm, Küster',
  '»Der Ritter sprach im Schlaf, heißt es. Auf Latein - und in einer Sprache aus dem Osten. Sie begruben ihn lebendig, doch das Flüstern hörte nie auf.« - aus dem Kirchenbuch von St. Marien',
  // NEU - Folterkammer (Masterprompt 7.3)
  '»Wir sperrten die Veränderten hier unten ein, als die Pest kam. Gott vergebe uns - es waren Nachbarn, Gevattern, Kinder. Der Schmied schwor, einer habe noch gesprochen, als kein Atem mehr in ihm war.« - ohne Unterschrift, Anno 1631',
  // NEU - Beinhaus-Schrein (Masterprompt 7.3)
  '»Bruder Anselm hatte recht. Die Knochen sind kein Vorrat und kein Friedhof - sie sind eine Schrift. Wer sie zu lesen versteht, so heißt es, dem öffnet der Altar sein Innerstes. Ich habe nicht den Mut, es zu versuchen.« - Randnotiz im Kirchenbuch',
];

// Beide End-Texte (Referenz endGame)
export const ENDEN = {
  annehmen: {
    titel: 'DER PREIS DER UNSTERBLICHKEIT',
    text: 'Das Geschenk ist nun Teil von dir. Du spürst die neue Kraft - und die neue Last. Die Dorfbewohner nennen dich ihren Retter, doch in ihren Augen liest du Furcht. Und manchmal, in der dunkelsten Stunde vor der Dämmerung, hörst du sein Lachen in deinem Kopf. Du weißt: Ein Teil von ihm lebt in dir weiter.',
  },
  zerstoeren: {
    titel: 'ERLÖSUNG',
    text: 'Das Fragment zerspringt unter deinem Stiefel, und ein Seufzen geht durch das Gewölbe - wie hundert Stimmen, die endlich schweigen dürfen. Ravensmoor ist frei. Die Narben des Krieges bleiben, doch die Toten ruhen wieder. Heinrich schenkt dir das erste ehrliche Bier des Jahres aus.',
  },
} as const;

// Relikt-Aufnahme (Referenz pickupRelic)
export const RELIKT = {
  name: 'Das Relikt des Kreuzritters',
  text: 'In der zerschmetterten Rüstung des Ritters liegt ein Fragment - warm, obwohl alles hier kalt ist. Die Inschrift auf dem Grab nennt es ein "Geschenk des ewigen Lebens". Du spürst, wie es nach dir greift.',
  frage: 'Was tust du?',
  annehmen: 'Das Geschenk annehmen',
  zerstoeren: 'Das Relikt zerstören',
} as const;

// Todestext (Referenz die) - Goldverlust wird dynamisch eingesetzt
export const TOD = {
  titel: 'DU BIST GEFALLEN',
  text: (gold: number) => `Die Dunkelheit nimmt, was ihr gehört. ${gold} Gold verloren. Deine Habseligkeiten bleiben dir - Ravensmoor wartet.`,
  knopf: 'AUF DEM FRIEDHOF ERWACHEN',
  erwachen: 'Ein fahles Licht hebt dich aus der Finsternis - zwischen den Gräbern schlägst du die Augen auf. Du bist nicht allein.',
} as const;

// Intro-Film (Runde 12): Zeilen erscheinen nacheinander, während der
// Held durch den Dunkelwald nach Osten läuft - wie ein Vorspann.
export const INTRO_FILM: ReadonlyArray<string> = [
  'Anno Domini 1635. Der Krieg frisst dieses Land seit siebzehn Jahren.',
  'Die Pest nahm, was die Söldner übrig ließen. Ganze Dörfer schweigen für immer.',
  'Aus meinen Aufzeichnungen: »Heute erreichte mich ein Brief mit dem Siegel des Amtmanns. Im Namen des Landesherrn: Geht nach Ravensmoor. Seht nach dem Rechten.«',
  '»Die Boten flüstern Ärgeres, als Worte fassen: Die Toten unter der Kirche... ruhen nicht mehr.«',
  '»Ich habe die Residenz im Morgengrauen verlassen. Hinter mir die Mauern, vor mir nur noch Wald.«',
  '»Der Dunkelwald kennt den Weg, sagen die Alten. Man müsse nur dem Pfad nach Osten folgen - und nie der Stille trauen.«',
  '»Was immer in Ravensmoor wartet: Ich schreibe diese Zeilen, damit jemand die Wahrheit kennt, falls ich nicht wiederkehre.«',
];

// Boss-Rufe (Referenz)
export const BOSS_TEXTE = {
  beschwoerung: 'Erhebt euch! Dient mir erneut!',
  ausholen: 'Der Tempelritter holt aus!',
  gefallen: 'Der Tempelritter ist gefallen',
  name: 'DER TEMPELRITTER',
} as const;

// Diverse Log-Meldungen (Referenz)
export const MELDUNGEN = {
  start: 'Ravensmoor liegt im Nebel. Sprich mit den Dorfbewohnern (E).',
  geladen: 'Spielstand geladen - willkommen zurück in Ravensmoor',
  kircheZu: 'Die Kirchentür ist verschlossen. Pater Johannes hat den Schlüssel.',
  schluessel: 'Kryptaschlüssel erhalten',
  truhe: 'Truhe geöffnet',
  segen: 'Segen der Stärke: +30% Schaden für 45 Sekunden',
  segenEnde: 'Der Segen verblasst',
  altarHeilt: 'Der Altar heilt deine Wunden',
  altarGold: (g: number) => `Vergessene Opfergaben: +${g} Gold`,
  altarXp: 'Visionen vergangener Zeiten: Erfahrung erhalten',
  toteErwachen: 'Die Toten erwachen!',
  blutLeben: 'Das Blut brennt in deinen Adern: +10 maximales Leben',
  blutHeilt: 'Der Brunnen stillt mehr als Durst - vollständig geheilt',
  blutSchatten: 'Das Blut ruft die Schatten!',
  foliant: 'Vergilbter Foliant: altes Wissen (+Erfahrung)',
  keineTraenke: 'Keine Heiltränke',
  keineManatraenke: 'Keine Manatränke',
  heiltrank: 'Heiltrank getrunken',
  manatrank: 'Manatrank getrunken',
  heiltrankFund: 'Heiltrank gefunden',
  manatrankFund: 'Manatrank gefunden',
  nichtGenugGold: 'Nicht genug Gold',
  nichtGenugMana: 'Nicht genug Mana',
  elixier: '+10 maximales Leben',
  stufe: (n: number) => `Stufe ${n} erreicht!`,
  neuerZauber: (n: string) => `Neuer Zauber: ${n}`,
  pariert: 'PARIERT!',
  geblockt: 'Geblockt',
  ausgewichen: 'Ausgewichen',
  inventarLeer: 'Leer wie ein Pestdorf.',
  gefasst: (gem: string, waffe: string) => `${gem} in ${waffe} gefasst`,
  keineFassung: 'Keine freie Fassung in der Waffe',
  keineWaffe: 'Keine Waffe angelegt',
  reliktPuls: 'Das Geschenk pulsiert in dir. +30 maximales Leben.',
  keinePfeile: 'Keine Pfeile mehr',
  geschmiedet: (name: string) => `${name} verbessert`,
  schreinRast: 'Du rastest am Kerzenschrein. Wunden heilen, Flaschen füllen sich.',
  aufgewaermt: 'Aufgewärmt: +Regeneration für den nächsten Kryptagang',
} as const;

// Erzähler-Interludium beim Waldrand (Masterprompt 7.1: "aus der Referenz" -
// die Ankunfts-Passage wird dort am Waldrand gezeigt)
export const WALDRAND_TEXT = ERZAEHLER.ankunft;

// Kurze Lore-Schnipsel für anklickbare Bücher in der Bibliothek
// (Masterprompt 7.3 - NEU verfasst, Stil an den Notizen ausgerichtet)
export const BUECHER: ReadonlyArray<string> = [
  '»Vermächtnisse der Gefallenen, Band III« - die Seiten sind vom Wasser gewellt. Ein Eintrag: "Dem Müller zwei Säcke Korn schuldig. Gott vergebe mir, mehr hinterlasse ich nicht."',
  '»Über die Heilkraft der Salze« - jemand hat an den Rand geschrieben: "Nichts davon hat geholfen. Nichts."',
  'Ein Kirchenregister. Die Sterbeeinträge des Jahres 1631 füllen elf Seiten. Die letzte Zeile lautet nur: "Der Rest wurde nicht mehr gezählt."',
  'Eine lateinische Abhandlung über das Heilige Land. Zwischen den Seiten liegt eine gepresste Blume, die hier nirgends wächst.',
  '»Predigten wider die Furcht« - das Buch ist fast neu. Es wurde offenbar nie zu Ende gelesen.',
  'Ein dünnes Heft ohne Titel. Auf jeder Seite steht derselbe Satz, hunderte Male: "Die Toten ruhen. Die Toten ruhen. Die Toten ruhen."',
];
