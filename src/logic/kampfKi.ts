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

// Reichweiten je Haltung.
// - aggressiv: VERFOLGT FREI jeden Gegner in Sicht, OHNE Leine zur Heimat
//   (Autorwunsch R54: "immer angreifen, wenn Feinde in der Nähe sind" - vorher
//   klebten gerade die Bogenschützen an der Formation und rückten nie in
//   Schussreichweite vor). Sicht großzügig, damit die ganze Linie reagiert.
// - verteidigen: hält die Stellung, schlägt aber alles, was nah an die eigene
//   Position kommt (Leine kurz).
// - halten: rührt sich nie vom Slot.
export const ENGAGE_SICHT = { verteidigen_extra: 100, aggressiv: 420 };
export const ENGAGE_LEINE = { verteidigen: 130 };

export function willEngagieren(p: EngageParams): boolean {
  if (p.istFokus) return true;                       // Fokusbefehl: immer angreifen
  if (!p.eigeneSeite) return p.schlachtLaeuft;       // KI-Seite rennt frei, sobald die Schlacht läuft
  if (p.stance === 'halten') return false;           // Stellung halten: nie vom Slot weg
  if (p.stance === 'aggressiv') return p.dFeind <= ENGAGE_SICHT.aggressiv;  // keine Leine: verfolgt jeden Gegner in Sicht
  // verteidigen: nur nah an der eigenen Stellung
  return p.dFeind <= p.reich + ENGAGE_SICHT.verteidigen_extra && p.dFeindVonHeimat <= ENGAGE_LEINE.verteidigen;
}
