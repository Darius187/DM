// Quest-Logbuch-Logik (Runde 52). REINE Logik (Phaser-frei -> testbar): leitet
// aus der Quest-Datenbank + Spielzustand (QuestCtx) den Status jeder Quest und
// das aktuelle Ziel ab und verwaltet, WELCHE Quest gerade "verfolgt" wird (auf
// dem Hauptbildschirm angezeigt). Die verfolgte Quest wird automatisch gewählt
// (oberste aktive Hauptquest), der Spieler kann sie im Logbuch aber überstimmen.

import { QUESTS, type QuestCtx, type QuestDef, type QuestZiel } from '../data/quests';

export type QuestStatus = 'offen' | 'aktiv' | 'abgeschlossen';

export interface QuestSicht {
  def: QuestDef;
  status: QuestStatus;
  zielErfuellt: boolean[];          // pro Ziel: erfüllt?
  aktuellesZiel: QuestZiel | null;  // erstes noch offenes Ziel (nur bei 'aktiv')
  fortschritt: number;              // erfüllte Ziele
  gesamt: number;                   // Anzahl Ziele
}

function status(def: QuestDef, c: QuestCtx): QuestStatus {
  if (def.fertig(c)) return 'abgeschlossen';
  if (def.aktiv(c)) return 'aktiv';
  return 'offen';
}

export function questSicht(def: QuestDef, c: QuestCtx): QuestSicht {
  const zielErfuellt = def.ziele.map((z) => z.erfuellt(c));
  const st = status(def, c);
  const idx = zielErfuellt.findIndex((e) => !e);
  return {
    def,
    status: st,
    zielErfuellt,
    aktuellesZiel: st === 'aktiv' && idx >= 0 ? def.ziele[idx] : null,
    fortschritt: zielErfuellt.filter(Boolean).length,
    gesamt: def.ziele.length,
  };
}

// Alle Quests, die ins Logbuch gehören (aktiv oder abgeschlossen) - aktive zuerst,
// Hauptquests vor Nebenquests, Abgeschlossene ans Ende.
export function logbuch(c: QuestCtx): QuestSicht[] {
  const katRang: Record<string, number> = { haupt: 0, ereignis: 1, neben: 2 };
  return QUESTS.map((d) => questSicht(d, c))
    .filter((s) => s.status !== 'offen')
    .sort((a, b) => {
      if ((a.status === 'abgeschlossen' ? 1 : 0) !== (b.status === 'abgeschlossen' ? 1 : 0)) {
        return (a.status === 'abgeschlossen' ? 1 : 0) - (b.status === 'abgeschlossen' ? 1 : 0);
      }
      return katRang[a.def.kategorie] - katRang[b.def.kategorie];
    });
}

export function aktiveQuests(c: QuestCtx): QuestSicht[] {
  return logbuch(c).filter((s) => s.status === 'aktiv');
}

// Automatische Wahl der verfolgten Quest: oberste aktive Hauptquest, sonst die
// erste aktive Quest überhaupt.
export function autoVerfolgt(c: QuestCtx): string | null {
  const aktive = aktiveQuests(c);
  return (aktive.find((s) => s.def.kategorie === 'haupt') ?? aktive[0])?.def.id ?? null;
}

// Die tatsächlich verfolgte Quest-Sicht: gewünschte ID, falls sie noch aktiv ist,
// sonst automatische Wahl. wunsch === null/'' bedeutet "automatisch".
export function verfolgteQuest(c: QuestCtx, wunsch: string | null): QuestSicht | null {
  const aktive = aktiveQuests(c);
  if (wunsch) {
    const gewuenscht = aktive.find((s) => s.def.id === wunsch);
    if (gewuenscht) return gewuenscht;
  }
  const autoId = autoVerfolgt(c);
  return aktive.find((s) => s.def.id === autoId) ?? null;
}

// --- Persistenz der verfolgten Quest (vom Spieler im Logbuch wählbar) ---------
// Bewusst getrennt von der reinen Logik gehalten, damit die Tests ohne
// localStorage laufen. '' = automatisch.

const VERFOLGT_KEY = 'ravensmoor_quest_verfolgt';

export function getVerfolgtWunsch(): string {
  try { return localStorage.getItem(VERFOLGT_KEY) ?? ''; } catch { return ''; }
}

export function setVerfolgtWunsch(id: string): void {
  try {
    if (id) localStorage.setItem(VERFOLGT_KEY, id);
    else localStorage.removeItem(VERFOLGT_KEY);
  } catch { /* localStorage gesperrt - bewusst ignoriert */ }
}
