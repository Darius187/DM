// Kampf-KI-Entscheidung "soll die Einheit angreifen?" (Runde 53, Autorwunsch:
// "die Einheiten sollen KÄMPFEN - nach einem Fokus-Kill nicht zurücklaufen,
// und sobald sie ihre befohlene Position erreicht haben, sich ins Getümmel
// stürzen"). REINE Logik (Phaser-frei -> testbar). Die Szene füttert nur
// Abstände + Haltung hinein und bewegt die Einheit entsprechend.

export type Stance = 'aggressiv' | 'verteidigen' | 'halten';

export interface EngageParams {
  stance: Stance;
  istFokus: boolean;         // ein Fokus-Befehl ist aktiv (gezielt diesen Gegner)
  eigeneSeite: boolean;      // gehört der vom Spieler gesteuerten Seite
  schlachtLaeuft: boolean;
  reich: number;             // Angriffsreichweite der Einheit
  dFeind: number;            // Abstand Einheit -> Gegner
  dFeindVonHeimat: number;   // Abstand Gegner -> Heimat/Slot der Einheit
}

// Reichweiten je Haltung. verteidigen: hält die Stellung, schlägt aber alles,
// was nah an die eigene Position kommt (großzügiger als früher, damit die Truppe
// wirklich kämpft). aggressiv: rückt weit vor. halten: rührt sich nie vom Slot.
export const ENGAGE_SICHT = { verteidigen_extra: 100, aggressiv: 320 };
export const ENGAGE_LEINE = { verteidigen: 130, aggressiv: 210 };

export function willEngagieren(p: EngageParams): boolean {
  if (p.istFokus) return true;                       // Fokusbefehl: immer angreifen
  if (!p.eigeneSeite) return p.schlachtLaeuft;       // KI-Seite rennt frei, sobald die Schlacht läuft
  if (p.stance === 'halten') return false;           // Stellung halten: nie vom Slot weg
  const sicht = p.stance === 'verteidigen' ? p.reich + ENGAGE_SICHT.verteidigen_extra : ENGAGE_SICHT.aggressiv;
  const leine = p.stance === 'verteidigen' ? ENGAGE_LEINE.verteidigen : ENGAGE_LEINE.aggressiv;
  return p.dFeind <= sicht && p.dFeindVonHeimat <= leine;
}
