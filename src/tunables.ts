// Zentrale Kampf-Werte aus "Feel-Good" v3. Diese Felder sind LIVE im
// Debug-Overlay aenderbar, damit wir das Gefuehl direkt im Browser tunen.
export interface Tunables {
  // Eingabe-Puffer fuer Kombo-Folgeschlaege (ms)
  inputBufferMs: number;
  // Perfekte-Parade-Fenster ab Block-Beginn (ms)
  parryWindowMs: number;
  // Unverwundbarkeit waehrend der Ausweichrolle (ms)
  iFrameMs: number;
  // Abklingzeit der Ausweichrolle (ms)
  rollCooldownMs: number;
  // Hit-Stop-Laengen (ms)
  hitStopLightMs: number;
  hitStopFinisherMs: number;
  hitStopHeavyMs: number;
}

export const DEFAULT_TUNABLES: Tunables = {
  inputBufferMs: 250,
  parryWindowMs: 300,
  iFrameMs: 300,
  rollCooldownMs: 900,
  hitStopLightMs: 50,
  hitStopFinisherMs: 80,
  hitStopHeavyMs: 100,
};

// Beschreibung der Slider fuers Overlay (Schluessel, Label, min, max, schritt)
export const TUNABLE_SLIDERS: {
  key: keyof Tunables;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "inputBufferMs", label: "Eingabe-Puffer", min: 0, max: 500, step: 10 },
  { key: "parryWindowMs", label: "Paradefenster", min: 50, max: 600, step: 10 },
  { key: "iFrameMs", label: "i-Frame-Dauer", min: 50, max: 600, step: 10 },
  { key: "rollCooldownMs", label: "Rollen-Cooldown", min: 200, max: 2000, step: 50 },
  { key: "hitStopLightMs", label: "Hit-Stop leicht", min: 0, max: 200, step: 5 },
  { key: "hitStopFinisherMs", label: "Hit-Stop Finisher", min: 0, max: 250, step: 5 },
  { key: "hitStopHeavyMs", label: "Hit-Stop schwer", min: 0, max: 300, step: 5 },
];

// Feste Kampfgeometrie/-werte, die nicht live getunt werden muessen.
export const COMBAT = {
  // Spieler
  playerMaxHp: 100,
  playerSpeed: 7.0, // Einheiten/s
  blockSlowFactor: 0.45, // Bewegungstempo im Block
  rollSpeed: 18.0,
  rollDurationMs: 300, // Dauer der Rollbewegung (= i-Frames per Default)

  // Leichter Angriff - drei Schritte, dritter ist Finisher
  light: {
    windupMs: 90,
    activeMs: 70,
    recoveryMs: 200,
    cancelFromPct: 0.5, // ab 50% der Erholphase per Rolle/Block abbrechbar
    reach: 2.6,
    halfArcDeg: 45,
    damage: [9, 9, 16], // Schritt 1, 2, Finisher
  },

  // Schwerer Angriff - volles Commitment
  heavy: {
    windupMs: 600,
    activeMs: 90,
    recoveryMs: 320,
    reach: 3.2,
    halfArcDeg: 70,
    damage: 22, // ~2,2x des leichten Grundschadens
  },

  blockDamageFactor: 0.25, // Restschaden bei normalem Block
  parryBuffMultiplier: 2.0, // naechster eigener Treffer +100%

  // Gegner
  enemy: {
    maxHp: 60,
    runnerSpeed: 4.6,
    circlerSpeed: 4.2,
    attackReach: 2.2,
    telegraphMs: 520, // 0,4-0,6 s sichtbares Ausholen
    strikeActiveMs: 120,
    recoverMs: 600,
    staggerMs: 900, // Taumeln nach perfekter Parade
    damagePct: [10, 16] as [number, number], // 10-16% Spielerschaden
    hitReactionMs: 220,
  },
} as const;
