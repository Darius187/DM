// Heer des Fürsten - LOGIK (Runde 53, Autorwunsch). REIN und damit testbar:
// aus gespendetem Gold (Sold) + der Fürsten-Kiste (gespendete Ausrüstung) werden
// benannte Rekruten geworben und AUTOMATISCH ausgerüstet. Grundidee des Autors:
// "ein gespendetes Schwert -> ein damit bewaffneter Soldat, Stück ist dann weg."
// Mehr Gold = bessere Leute (der Fürst muss sie ja bezahlen). Permadeath: jeder
// Rekrut ist eine benannte Person mit Status `tot`.

import type { Item } from '../data/types';
import { defaultRng, type Rng } from './rng';
import {
  GOLD_STUFEN, VORNAMEN, BEINAMEN, ZUEGE,
  STD_WAFFE_NAH, STD_WAFFE_FERN, STD_RUESTUNG, NOTBEHELF_WAFFE, NOTBEHELF_RUESTUNG, VETERAN_WAFFE, VETERAN_RUESTUNG,
  type HeerRolle, type GoldStufe, type BerufDef, type StdGear,
} from '../data/heer';

export type { HeerRolle };

export interface Rekrut {
  id: string;
  name: string;
  beruf: string;
  rolle: HeerRolle;
  stufe: number;
  zug: string;                         // Charakterzug
  waffe: string; waffeWert: number;
  ruestung: string; ruestungWert: number;
  schild: string | null;
  maxhp: number; dmg: number;
  tot: boolean;                        // Permadeath
}

export interface WerbeParams {
  gold: number;          // gespendetes Gold (Sold) für diese Welle
  anzahl: number;        // wie viele Rekruten der Fürst schickt
  kiste: Item[];         // gespendete Ausrüstung (wird 1:1 verbraucht)
  rng?: Rng;
  startId?: number;      // fortlaufende IDs (Permadeath-Liste)
}

export interface WerbeErgebnis {
  rekruten: Rekrut[];
  kisteRest: Item[];     // übrige Ausrüstung (nicht verbrauchte Stücke)
  stufe: string;         // Titel der erreichten Goldstufe
  abrechnung: string;    // Ein-Satz-Erklärung des Fürsten (Platzhalter)
}

// Höchste Goldstufe, deren Schwelle der Sold pro Kopf erreicht.
export function stufeFuerGold(goldProKopf: number): GoldStufe {
  let gewaehlt = GOLD_STUFEN[0];
  for (const s of GOLD_STUFEN) if (goldProKopf >= s.abGoldProKopf) gewaehlt = s;
  return gewaehlt;
}

// Bestes passendes Stück aus der Kiste ZIEHEN (entfernen), aber nur, wenn es
// mindestens so gut ist wie der Rückfall (minWert) - schwächere Spenden bleiben
// liegen, statt einen Soldaten zu verschlechtern. Gibt das verbrauchte Stück
// zurück (oder null).
function ziehBest(kiste: Item[], passt: (it: Item) => boolean, minWert: number): Item | null {
  let bi = -1, bv = minWert - 1;
  for (let i = 0; i < kiste.length; i++) {
    const it = kiste[i];
    if (passt(it) && it.val >= minWert && it.val > bv) { bv = it.val; bi = i; }
  }
  return bi < 0 ? null : kiste.splice(bi, 1)[0];
}

const istNahWaffe = (it: Item): boolean => it.kind === 'weapon' && it.weaponClass !== 'bogen' && it.weaponClass !== 'stab';
const istBogen = (it: Item): boolean => it.kind === 'weapon' && it.weaponClass === 'bogen';

interface Ausruestung { waffe: string; waffeWert: number; ruestung: string; ruestungWert: number; schild: string | null }

// Einen Rekruten automatisch ausrüsten: zuerst aus der Kiste (verbraucht das
// Stück), sonst mit dem passenden Standard-/Notbehelf-/Veteranen-Gerät.
export function ausruesten(def: BerufDef, kiste: Item[]): Ausruestung {
  const fallbackW: StdGear = def.eigenesGear ? VETERAN_WAFFE : def.stufe <= 1 ? NOTBEHELF_WAFFE : (def.rolle === 'bogen' ? STD_WAFFE_FERN : STD_WAFFE_NAH);
  const fallbackR: StdGear = def.eigenesGear ? VETERAN_RUESTUNG : def.stufe <= 1 ? NOTBEHELF_RUESTUNG : STD_RUESTUNG;
  let waffe = fallbackW.name, waffeWert = fallbackW.val;
  if (def.rolle !== 'heiler') {
    const w = ziehBest(kiste, def.rolle === 'bogen' ? istBogen : istNahWaffe, fallbackW.val);
    if (w) { waffe = w.name; waffeWert = w.val; }
  }
  let ruestung = fallbackR.name, ruestungWert = fallbackR.val;
  const r = ziehBest(kiste, (it) => it.kind === 'armor', fallbackR.val);
  if (r) { ruestung = r.name; ruestungWert = r.val; }
  let schild: string | null = null;
  if (def.rolle === 'nahkampf') {
    const s = ziehBest(kiste, (it) => it.kind === 'schild', 0);
    if (s) schild = s.name;
  }
  return { waffe, waffeWert, ruestung, ruestungWert, schild };
}

function grundHp(rolle: HeerRolle, stufe: number): number {
  if (rolle === 'bogen') return 26 + stufe * 10;
  if (rolle === 'heiler') return 32 + stufe * 10;
  return 40 + stufe * 16;
}
function grundDmg(rolle: HeerRolle, stufe: number): number {
  if (rolle === 'heiler') return 4 + stufe;        // = Heilung pro Schlag
  return 4 + stufe * 2;
}

export function werbeRekruten(p: WerbeParams): WerbeErgebnis {
  const rng = p.rng ?? defaultRng;
  const anzahl = Math.max(0, Math.floor(p.anzahl));
  const proKopf = anzahl > 0 ? p.gold / anzahl : 0;
  const stufe = stufeFuerGold(proKopf);
  const kiste = p.kiste.map((it) => ({ ...it }));    // Arbeitskopie für den 1:1-Verbrauch
  const pick = <T,>(arr: T[]): T => arr[Math.min(arr.length - 1, Math.floor(rng.random() * arr.length))];
  const rekruten: Rekrut[] = [];
  for (let i = 0; i < anzahl; i++) {
    const def = pick(stufe.pool);
    const g = ausruesten(def, kiste);
    rekruten.push({
      id: `rek_${(p.startId ?? 0) + i}`,
      name: `${pick(VORNAMEN)} ${pick(BEINAMEN)}`,
      beruf: def.beruf, rolle: def.rolle, stufe: def.stufe, zug: pick(ZUEGE),
      waffe: g.waffe, waffeWert: g.waffeWert, ruestung: g.ruestung, ruestungWert: g.ruestungWert, schild: g.schild,
      maxhp: grundHp(def.rolle, def.stufe) + g.ruestungWert * 3 + (g.schild ? 12 : 0),
      dmg: grundDmg(def.rolle, def.stufe) + (def.rolle === 'heiler' ? 0 : g.waffeWert),
      tot: false,
    });
  }
  return {
    rekruten, kisteRest: kiste, stufe: stufe.titel,
    // Platzhalter-Abrechnung des Fürsten (zeigt: das Gold geht in Sold/Verpflegung).
    abrechnung: `Für ${p.gold} Gulden konnte der Fürst ${anzahl} ${stufe.titel} anwerben und versorgen.`,
  };
}
