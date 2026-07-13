// UNTOTE - Herkunft, Charakter, Beute.
//
// WARUM DIESE DATEI EXISTIERT
// ---------------------------
// Der Kerngedanke des Spiels: Die Untoten sind keine Monster. Sie sind die TOTEN
// DEINER EIGENEN WELT. Jeder war einmal jemand - ein Bauer, ein Soldat, ein Kaufmann.
// Der Waffenknecht hat sie nicht erschaffen, er hat sie BENUTZT.
//
// Daraus folgt alles Weitere, und zwar aus EINEM Datensatz:
//   1. AUSSEHEN     - der Kittel, das Kettenhemd, der Harnisch
//   2. STAERKE      - der Bauer ist schwach, der Ritter gefaehrlich
//   3. AUSRUESTUNG  - die Sense, das Schwert, der Harnisch
//   4. BEUTE        - was er bei sich trug
//   5. BUDGET       - was er den Spawner kostet (siehe unten)
//   6. BESCHREIBUNG - die Vermutung, wer er war
//
// WARUM DAS SO STARK IST
// ----------------------
// (a) LORE OHNE TEXTWAND: Man SIEHT, dass hier ein Dorf gestorben ist, weil die Toten
//     Kittel tragen und Sensen halten. Keine Notiz, kein Dialog - der Gegner IST die
//     Erzaehlung. Und jede Beschreibung ist eine kleine Anklage.
// (b) TAKTIK DURCH LESBARKEIT: Was du SIEHST, sagt dir, was dich ERWARTET und was du
//     KRIEGST. Ein Trupp Gepanzerter: hart, lohnt sich. Eine Bauernhorde: viele, schwach,
//     kaum Beute - lauf durch oder mach Flaeche. Der Spieler entscheidet, BEVOR er kaempft.
// (c) SIE BEANTWORTET, WARUM IN GRAEBERN BESSERES ZEUG LIEGT: Weil dort Ritter liegen,
//     keine Bauern. Grabbeigaben sind historisch, kein Fantasy-Kniff.
//
// SPAWN-BUDGET (loest das "Gewusel"-Problem)
// ------------------------------------------
// Eine Ebene bekommt ein BUDGET, keine feste Gegnerzahl. Ein Ritter kostet 4 Punkte,
// ein Bauer 1. Die Tiefe erhoeht das BUDGET - aber der Generator gibt es aus, wie er
// will. Manche Ebenen kaufen 20 Schwache, manche 5 Harte.
// -> Automatisch Rhythmus-Abwechslung, ohne jede Ebene von Hand zu bauen.
// -> Die Tiefe skaliert weiter, ohne den Bildschirm zu verstopfen.
// MEHR IST NICHT BESSER. Andersartig ist besser.

import type { Tag } from './kampfarten';

export type Herkunft =
  | 'bauer'
  | 'handwerker'
  | 'kaufmann'
  | 'soldat'
  | 'ritter'
  | 'held';        // Monster-Helden - siehe unten

export interface UntoterTyp {
  id: Herkunft;
  name: string;               // wird dem Spieler NICHT gezeigt (er kennt den Namen nicht)
  tags: readonly Tag[];       // speist die Konter-Matrix aus kampfarten.ts
  hp: number;
  dmg: number;
  tempo: number;
  budget: number;             // Spawn-Budget-Kosten
  rolle: MonsterRolle;
  // Die Vermutung, die beim Anklicken erscheint. MEHRERE Varianten, damit es nicht
  // stumpf wird - eine wird zufaellig (aber stabil je Gegner) gewaehlt.
  vermutung: readonly string[];
  loot: LootEintrag[];
}

// ROLLEN (aus dem Monster-Rollen-Katalog)
// Mehr Gegner = Gewusel. Andersartige Gegner = Kampf.
export type MonsterRolle =
  | 'schwarm'       // viele Schwache -> Flaechenwaffen
  | 'blocker'       // Schild, muss umgangen oder gebrochen werden
  | 'fernkampf'     // zwingt zum Vorruecken
  | 'beschwoerer'   // produziert Nachschub -> MUSS ZUERST STERBEN
  | 'unterstuetzer' // heilt die anderen -> Prioritaetsziel
  | 'elite';        // traegt die Mechanik der Karte

export interface LootEintrag {
  was: string;      // Item-ID oder Material-ID
  chance: number;   // 0..1
  min?: number;
  max?: number;
}

// ---------------------------------------------------------------------------
// DIE HERKUENFTE
// ---------------------------------------------------------------------------

export const UNTOTE: Record<Herkunft, UntoterTyp> = {
  bauer: {
    id: 'bauer',
    name: 'Untoter Bauer',
    tags: ['untot', 'knochen', 'ungepanzert', 'schwarm'],
    hp: 45, dmg: 6, tempo: 58, budget: 1,
    rolle: 'schwarm',
    vermutung: [
      'Der zerrissene Kittel und die schwieligen Haende deuten auf einen Bauern - er hielt noch eine Sense, als sie ihn holten.',
      'Barfuss, in Leinen. Ein Feldarbeiter. Er hat nie eine Waffe getragen, bis heute.',
      'Um den Hals ein Strohband, wie man es zur Ernte bindet. Er starb im Sommer.',
    ],
    loot: [
      { was: 'pfennig', chance: 0.5, min: 1, max: 4 },
      { was: 'fasern', chance: 0.2, min: 1, max: 1 },
    ],
  },

  handwerker: {
    id: 'handwerker',
    name: 'Untoter Handwerker',
    tags: ['untot', 'knochen', 'ungepanzert'],
    hp: 60, dmg: 9, tempo: 56, budget: 1,
    rolle: 'schwarm',
    vermutung: [
      'Die lederne Schuerze ist verkohlt - ein Schmied oder Koehler. Sein Hammer haengt noch am Guertel.',
      'Holzspaene im Haar, ein Beil in der Faust. Ein Zimmermann, der sein Werkzeug nicht loslassen konnte.',
      'Mehlstaub auf dem Wams. Ein Mueller - die Muehle steht wohl still.',
    ],
    loot: [
      { was: 'pfennig', chance: 0.5, min: 2, max: 6 },
      { was: 'eisen', chance: 0.3, min: 1, max: 2 },
      { was: 'holz', chance: 0.25, min: 1, max: 2 },
    ],
  },

  kaufmann: {
    id: 'kaufmann',
    name: 'Untoter Kaufmann',
    tags: ['untot', 'knochen', 'ungepanzert'],
    hp: 50, dmg: 7, tempo: 54, budget: 1,
    rolle: 'schwarm',
    vermutung: [
      'Feine Stoffe, ein Siegelring am Knochenfinger. Ein Kaufmann - auf der Strasse ueberfallen, nicht im Feld gefallen.',
      'Eine leere Geldkatze am Guertel. Wer ihn erschlug, nahm zuerst das Gold.',
      'Sein Wams ist gefuettert, seine Stiefel gut. Er reiste - und kam nie an.',
    ],
    loot: [
      { was: 'pfennig', chance: 0.85, min: 8, max: 30 },
      { was: 'gulden', chance: 0.12, min: 1, max: 1 },
      { was: 'schmuck', chance: 0.08 },
    ],
  },

  soldat: {
    id: 'soldat',
    name: 'Untoter Soldat',
    tags: ['untot', 'knochen', 'gepanzert'],
    hp: 110, dmg: 16, tempo: 52, budget: 2,
    rolle: 'blocker',
    vermutung: [
      'Kettenhemd und Wappenrock - dem Aussehen nach ein Soldat. Die Farben sind verblasst, aber es koennten die des Grafen sein.',
      'Ein Soeldner. Der Panzer ist geflickt, das Schwert gut gepflegt. Er wusste, was er tat.',
      'Ein Mann des Aufgebots. Er stand einmal in einer Reihe wie deine Maenner heute.',
    ],
    loot: [
      { was: 'pfennig', chance: 0.6, min: 5, max: 15 },
      { was: 'waffe_gewoehnlich', chance: 0.3 },
      { was: 'eisen', chance: 0.4, min: 1, max: 3 },
    ],
  },

  ritter: {
    id: 'ritter',
    name: 'Untoter Ritter',
    tags: ['untot', 'knochen', 'gepanzert', 'schild', 'schwer'],
    hp: 260, dmg: 26, tempo: 44, budget: 4,
    rolle: 'blocker',
    vermutung: [
      'Ein Harnisch, ein Wappenschild, ein Langschwert. Ein Ritter - und er kaempft noch immer wie einer.',
      'Das Wappen ist zerkratzt, aber die Haltung sitzt. Man verlernt es nicht, auch nicht im Tod.',
      'Er wurde mit seinen Waffen bestattet. Jemand hat ihn wieder ausgegraben.',
    ],
    loot: [
      { was: 'gulden', chance: 0.4, min: 1, max: 3 },
      { was: 'waffe_magisch', chance: 0.35 },
      { was: 'ruestung', chance: 0.25 },
      { was: 'edelstein', chance: 0.1 },
    ],
  },

  // MONSTER-HELDEN
  // --------------
  // Der Autorwunsch: "die Monster haben auch Helden und sowas verdient".
  // Ein Monster-Held ist ein Untoter, der sich BEWAEHRT hat - er hat viele deiner
  // Maenner erschlagen und ist dadurch INNERHALB SEINES LEVELS aufgestiegen.
  //
  // WICHTIG - DAS IST KEIN AUTOSCALING:
  // Er wird ein BESSERER Level-4-Untoter. Er wird NIE Level 20. Die Decke bleibt.
  // Autoscaling loescht den Fortschritt des Spielers aus und ruiniert Spiele.
  // Befoerderung im Feld tut das nicht.
  //
  // Er traegt eine AURA (wie deine eigenen Anfuehrer), ist Prioritaetsziel, und
  // wenn er faellt, bricht ein Teil der Horde.
  //
  // Und der Bonus, den der Autor wollte: Er hat GELERNT. Ein untoter Ritter, der
  // zu Lebzeiten Ritter erschlug, weiss, wo der Harnisch duenn ist.
  held: {
    id: 'held',
    name: 'Der Gepanzerte',   // Der Spieler kennt seinen Namen NICHT - nur einen Beinamen
    tags: ['untot', 'knochen', 'gepanzert', 'schild', 'schwer', 'anfuehrer'],
    hp: 520, dmg: 34, tempo: 46, budget: 8,
    rolle: 'elite',
    vermutung: [
      'Dieser hier ist anders. Er befiehlt. Die anderen weichen ihm aus.',
      'Sein Harnisch traegt frische Kerben - von deinen Maennern. Er hat viele erschlagen.',
      'Er hebt den Schild, bevor du zuschlaegst. Er hat gelernt.',
    ],
    loot: [
      { was: 'gulden', chance: 0.8, min: 3, max: 10 },
      { was: 'waffe_selten', chance: 0.5 },
      { was: 'setteil', chance: 0.2 },
      { was: 'edelstein', chance: 0.3 },
    ],
  },
};

// ---------------------------------------------------------------------------
// BEFOERDERUNG IM FELD (nicht Autoscaling!)
// ---------------------------------------------------------------------------
// Ein Untoter, der viele deiner Maenner erschlaegt, steigt INNERHALB seines
// Levels auf. Bei genug Kills wird er zum Monster-Helden.
//
// Und: DIE UNTOTEN INVESTIEREN IN IHRE BESTEN. Der Beschwoerer stellt zuerst den
// wieder auf, der am meisten getoetet hat. Der Heiler kuemmert sich zuerst um den
// Gefaehrlichsten. Das ist die LOGIK einer untoten Armee - sie hat keine Gefuehle,
// nur Effizienz.

export const FEIND_BEFOERDERUNG = {
  killsProStufe: 4,          // so viele eigene Maenner muss er erschlagen
  maxStufen: 3,              // Decke - er wird nie ueber sein Level hinaus
  dmgJeStufe: 0.15,
  hpJeStufe: 0.12,
  // Ab dieser Stufe wird er zum Monster-Helden (Aura, Beiname, Prioritaetsziel)
  heldAbStufe: 3,
  // Bonus gegen SOLDATEN (nicht gegen den Helden): er weiss, wo der Harnisch duenn ist
  bonusGegenTruppen: 1.25,
  // Der Beschwoerer stellt ihn BEVORZUGT wieder auf
  wiederbelebungsPrioritaet: 3,
} as const;

// ---------------------------------------------------------------------------
// DIE GEFALLENEN - der staerkste Mechanismus im Spiel
// ---------------------------------------------------------------------------
// Dein Soldat faellt. Zwei Wellen spaeter kommt er zurueck:
//   - gleicher NAME (den du kennst)
//   - gleiches WAMS (nur verranzter, untoter)
//   - deine AUSRUESTUNG (die er trug)
//   - seine RAENGE (die er sich verdient hat)
//
// WARUM DAS SO STARK IST:
//   Jeder Verlust wird DOPPELT bestraft - du verlierst ihn UND bekommst ihn als
//   Feind zurueck. Und dadurch wird "das Feld behalten" zur taktischen NOTWENDIGKEIT
//   statt zur Deko.
//
// DIE GEGENMASSNAHME (wichtig, sonst ist es nur Bestrafung):
//   Wer seinen eigenen Toten erneut faellt, kann ihn BEERDIGEN. Das kostet Zeit mitten
//   im Gefecht - aber es gibt MORAL, weil die Maenner sehen, dass ihr Hauptmann seine
//   Leute nicht liegen laesst.
//   Wer sie liegen laesst, sieht sie wieder.
//   -> Die Bergung ist keine Buchhaltung, sondern eine Frage der EHRE. Und sie ist
//      taktisch bezahlt.
//
// TECHNISCHE FOLGE (MUSS von Anfang an im Roster stehen, sonst teuer nachzuruesten):
//   Ein gefallener Soldat wird NICHT geloescht. Er bekommt den Status 'gefallen'
//   und bleibt im Datenmodell, bis er entweder beerdigt oder wieder aufgestellt wird.

export type SoldatStatus = 'aktiv' | 'verwundet' | 'gefallen' | 'beerdigt' | 'erhoben';

export const GEFALLENE = {
  // Wie viele Wellen/Sekunden, bis der Feind ihn wieder aufstellt
  erhebungNachS: 90,
  // Ein Erhobener behaelt so viel Prozent seiner Werte
  behaeltWerte: 0.85,
  // Beerdigen: Dauer und Moralgewinn
  beerdigenDauerS: 4,
  beerdigenMoral: 6,
  // Wird er erhoben und die Truppe sieht es: Moral-Schock
  erhebungMoralSchock: -10,
} as const;
