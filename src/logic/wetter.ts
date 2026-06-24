// Spielweiter Wetter-Zustand (Runde 69): EINE weiche Achse + Tageszeit, von ALLEN Szenen
// geteilt (über WetterOverlay angezeigt). So liegt dasselbe Wetter über Welt, Stadt usw.
// staerke: -1 sonnig .. 0 klar .. 0.5 Regen .. 1 Unwetter. tageszeit: 0..24 h.

export const wetter = { staerke: 0.5, ziel: 0.5, timer: 8, tageszeit: 19, tagTempo: 0.4, blitz: 0, blitzTimer: 12 + Math.random() * 20 };

export function setWetterStaerke(s: number): void { wetter.staerke = s; wetter.ziel = s; wetter.timer = 60; }
export function setTageszeit(h: number): void { wetter.tageszeit = ((h % 24) + 24) % 24; }

// Tageszeit -> Nacht-Dunkelheit 0 (heller Tag) .. 1 (tiefe Nacht), weich über den Tag.
export function nachtDunkel(h: number): number {
  const t = ((h % 24) + 24) % 24;
  const tag = 0.5 - 0.5 * Math.cos((t / 24) * Math.PI * 2);   // 0 Mitternacht .. 1 Mittag
  return Math.max(0, Math.min(0.82, 1 - tag * 1.45));
}

// Pro Frame fortschreiben: Tageszeit laufen lassen, Wetter sanft zum Ziel, Blitz abklingen.
export function wetterTick(dt: number): void {
  wetter.tageszeit = (wetter.tageszeit + dt * wetter.tagTempo + 24) % 24;
  wetter.timer -= dt;
  if (wetter.timer <= 0) { wetter.timer = 25 + Math.random() * 35; wetter.ziel = [-0.8, 0.05, 0.45, 0.8][Math.floor(Math.random() * 4)]; }
  wetter.staerke += (wetter.ziel - wetter.staerke) * Math.min(1, dt * 0.5);
  if (wetter.blitz > 0) wetter.blitz = Math.max(0, wetter.blitz - dt * 3.5);
  if (wetter.staerke > 0.7) { wetter.blitzTimer -= dt; if (wetter.blitzTimer <= 0) { wetter.blitz = 1; wetter.blitzTimer = 6 + Math.random() * 16; } }
}
