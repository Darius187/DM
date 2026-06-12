// Kampfsystem-Werte aus RAVENSMOOR-2D-MASTERPROMPT.md Teil 4.
// KONFLIKTREGEL: Diese Werte schlagen die Referenzdatei (dort z. B. Parade 250ms,
// Riposte x1,5, Rolle 180ms - hier gelten die Masterprompt-Werte).
// KEINE Ausdauer-Mechanik - nirgends.

export const PLAYER = {
  speed: 178,          // Referenz
  radius: 11,          // Referenz
  blockSpeedMult: 0.45, // Referenz: Blocken verlangsamt
} as const;

// Leichter Angriff: 3er-Kombo mit Finisher
export const LIGHT_ATTACK = {
  comboLength: 3,
  finisherDmgBonus: 0.45,   // 3. Hieb: +45% Schaden
  finisherKnockback: 12,    // mehr Rückstoß (Referenz: 12 statt 6)
  normalKnockback: 6,
  inputBufferMs: 250,       // Eingabe-Puffer 250 ms
  comboWindowS: 0.9,        // Referenz comboT
  recoveryS: 0.34,          // Erholzeit normaler Hieb (Referenz atkCd)
  recoveryFinisherS: 0.52,  // Erholzeit Finisher (Referenz)
  cancelPct: 0.5,           // Erholphase ab 50% durch Rolle oder Block abbrechbar
  // Runde 16: Hieb präziser - kleinerer Kegel, etwas kürzere Reichweite
  range: 50,
  rangeFinisher: 60,
  arc: 0.85,                // Trefferkegel (rad, halbe Breite)
  arcFinisher: 1.2,         // breiterer Bogen beim Finisher
  dmgVarianceMin: 0.85,
  dmgVarianceMax: 1.2,
} as const;

// Schwerer Hieb: volles Commitment
export const HEAVY_ATTACK = {
  windupS: 0.6,        // 0,6 s Ausholzeit, nicht abbrechbar
  dmgMult: 2.2,        // ca. 2,2x Schaden
  recoveryS: 0.7,      // eigene Erholzeit (Annahme, siehe DECISIONS.md)
  range: 64,
  arc: 1.0,
  knockback: 16,
  breaksPosture: true, // durchbricht Gegner-Haltung
  postureStunS: 0.6,   // Annahme: kurzes Taumeln beim Haltungsbruch
} as const;

// Blocken und perfekte Parade
export const BLOCK = {
  dmgTakenPct: 0.30,    // reduziert Schaden auf 30%, kein Guard-Break
  arcRad: 1.35,         // Blockwinkel (Referenz)
  parryWindowMs: 300,   // Block in den ersten 300 ms -> perfekte Parade
  parryStunS: 0.9,      // Gegner taumelt 0,9 s
  riposteBonus: 1.0,    // nächster Hieb +100% Schaden
  riposteWindowS: 1.3,  // Zeitfenster für die Riposte (Referenz)
} as const;

// Ausweichrolle
export const ROLL = {
  iFramesMs: 300,       // 300 ms Unverwundbarkeit
  cooldownS: 0.9,       // Abklingzeit 0,9 s
  speed: 560,           // Referenz Dash-Geschwindigkeit
  durationS: 0.3,       // Rolldauer = Unverwundbarkeitsfenster
} as const;

// Hit-Stop bei Treffern (Masterprompt: leicht 50 / Finisher 80 / schwer+Parade 100)
export const HITSTOP_MS = { light: 50, finisher: 80, heavy: 100, parry: 100, playerHurt: 50 } as const;
export const HITSTOP_TIMESCALE = 0.15; // Referenz: dt*0.15 während Hit-Stop

// Gegnerschaden: ein normaler Treffer kostet 10-16% der Spieler-Maximal-HP (Masterprompt 4.3).
// Wird in der DebugArena gegen die Basiswerte geprüft.
export const ENEMY_HIT_PCT = { min: 0.10, max: 0.16 } as const;

// Waffenklassen-Movesets (Masterprompt 4.2 + Zauberstab aus Feedback-Runde 1)
export const WEAPON_MOVESETS = {
  schwert: { comboLength: 3, speedMult: 1.0 },
  axt:     { comboLength: 2, sweep360: true, speedMult: 0.9 },   // 3. Eingabe = Rundumschlag
  stange:  { comboLength: 1, thrust: true, range: 96, arc: 0.35, knockback: 14, speedMult: 0.95 },
  wucht:   { comboLength: 1, overhead: true, aoeRadius: 40, postureDmgMult: 2.0, speedMult: 0.7, miniShake: true },
  bogen:   { drawTimeMaxS: 1.2, dmgMultFull: 1.8, projSpeed: 420, speedMult: 1.0 },
  // Zauberstab: manafreies Arkangeschoss, skaliert mit der Zauberei-Schule,
  // und verstärkt gewirkte Zauber (halber Stabwert als Bonus)
  stab:    { projSpeed: 360, dmgMult: 0.75, spellBonusFaktor: 0.5, zaubereiBonusJeStufe: 0.05 },
} as const;

// Gedeckter Schlag: Angriff aus dem Block heraus (Feedback-Runde 1) -
// leicht abgeschwächt, da man hinter dem Schild gedeckt bleibt
export const GUARDED_ATTACK = { dmgMult: 0.8, recoveryMult: 1.25 } as const;

// Tod und Rasten (Masterprompt 4.4 - schlägt Referenz: dort 20% Goldverlust)
export const DEATH = {
  goldLossPct: 0.15,    // 15% Goldverlust
  // Erwachen in Ravensmoor (Taverne), Krypta-Ebenen werden neu bevölkert
} as const;

// Kerzenschreine: Rasten heilt voll, füllt Flaschen, setzt KEINE Gegner zurück
export const SHRINE = { healsFull: true, refillsFlasks: true, resetsEnemies: false } as const;

// Flaschensystem (Masterprompt 6.2)
export const FLASKS = { start: 3, healPct: 0.45 } as const;

// Debug-Flag: Debug-Ausgaben nur hinter diesem Schalter
export const DEBUG = false;
