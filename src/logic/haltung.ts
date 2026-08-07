// R198 (Autor-Entscheid): "die Verhaltens-Achsen sollen DAUERHAFT gelten - der
// RTS-Modus oeffnet nur das Bauen, sonst ist das nichts anderes als das, was wir
// schon haben."
//
// Bisher lebten die drei Achsen (Bewegung / Angriff / Zielwahl) ausschliesslich
// im RTS-Kommandopult (rtsBattle) und galten nur, solange der Modus offen war.
// Diese Datei enthaelt die ENTSCHEIDUNG als reine Funktion - die Szene wendet
// sie in JEDEM Modus an, das Kommandopult nutzt dieselbe Regel.

export type Stance = 'aggressiv' | 'verteidigen' | 'halten';
export type AngriffsArt = 'angreifen' | 'zurueckschlagen' | 'feuerEinstellen';

export interface HaltungWerte {
  /** So weit darf ein 'verteidigen'-Posten seinem Ziel entgegengehen (px). */
  verteidigenRadius: number;
  /** Naeher als das gilt als "am Feind" - dann ist die Stellung egal. */
  handgemengePx: number;
  /** 'zurueckschlagen': so lange nach einem Treffer gilt man als angegriffen. */
  zurueckschlagenS: number;
}

export interface HaltungLage {
  stance: Stance;
  angriff: AngriffsArt;
  /** Abstand zum naechsten Feind (px), Infinity wenn keiner da ist. */
  feindAbstand: number;
  /** Sekunden seit dem letzten erlittenen Treffer (Infinity = nie). */
  seitTreffer: number;
  /** Wo die Einheit ihre Stellung haelt (null = dort, wo sie steht). */
  posten: { x: number; y: number } | null;
  /** Aktuelle Position - Rueckfall-Posten, wenn keiner gesetzt ist. */
  x: number;
  y: number;
}

export interface HaltungBefehl {
  /** Ziel, das die Einheit ansteuert; null = frei jagen. */
  jagdZiel: { x: number; y: number } | null;
  /** true = greift NICHT an (Feuer einstellen bzw. noch nicht beschossen). */
  kaempftNicht: boolean;
}

/**
 * Die Haltung einer Einheit in EINEN Befehl uebersetzen.
 * - aggressiv:  jagt jeden Feind, keine Stellung
 * - verteidigen: haelt die Stellung, geht aber bis verteidigenRadius entgegen
 * - halten:      bleibt stehen; nur im Handgemenge darf sie sich loesen
 */
export function haltungsBefehl(lage: HaltungLage, werte: HaltungWerte): HaltungBefehl {
  const posten = lage.posten ?? { x: lage.x, y: lage.y };
  const imHandgemenge = lage.feindAbstand <= werte.handgemengePx;

  const kaempftNicht = lage.angriff === 'feuerEinstellen'
    || (lage.angriff === 'zurueckschlagen' && lage.seitTreffer > werte.zurueckschlagenS && !imHandgemenge);

  if (lage.stance === 'aggressiv') return { jagdZiel: null, kaempftNicht };
  if (lage.stance === 'halten') {
    return { jagdZiel: imHandgemenge ? null : posten, kaempftNicht };
  }
  // verteidigen: entgegengehen, solange der Feind im Umkreis der Stellung ist
  const nah = lage.feindAbstand <= werte.verteidigenRadius;
  return { jagdZiel: nah ? null : posten, kaempftNicht };
}
