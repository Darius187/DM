// DORFLEBEN-ANKER (M0 des Dorfwirtschaft-Auftrags; rekonstruiert aus dem
// referenzierten, im Repo fehlenden AUFTRAG-dorfleben-anker.md - siehe
// DECISIONS.md): Jeder Bewohner folgt einem TAGESPLAN aus Ankern
// (arbeit / pause / mittag / abend / schlaf). Die Uebergaenge sind NICHT fuer
// alle gleichzeitig: jeder hat einen eigenen, festen Zeitversatz (seeded aus
// seiner id) - so wirkt das Dorf natuerlich statt wie eine Stechuhr.
// ALLE Zeiten sind Anteile des Spieltags (0..1) und hier justierbar.

import { TAG } from './welt';

export const DORF_RHYTHMUS = {
  // Verschnaufer an der Station (kurz): vormittags + nachmittags
  pauseVormittag: 0.33,
  pauseNachmittag: 0.56,
  pausenDauer: 0.025,        // ~30 s bei 20-Minuten-Tag
  // grosse Mittagsrunde (sozialer Block an Linde/Markt/Taverne)
  mittagAb: 0.44,
  mittagBis: 0.52,
  // Natuerlichkeit: maximaler persoenlicher Zeitversatz (+/-) je Bewohner
  zeitversatzMax: 0.016,
  // Verschnaufer-Platz: kleiner fester Versatz neben der Arbeits-Station
  pausenPlatzRadius: 20,
} as const;

export type TagesZiel = 'schlaf' | 'arbeit' | 'pause' | 'mittag' | 'abend';

// Deterministischer Hash einer Bewohner-id -> 0..1 (kein Math.random: der
// Versatz muss jeden Tag und nach jedem Laden gleich sein).
export function npcHash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}

// Persoenlicher Zeitversatz in Tagesanteilen (-max..+max), fest je Bewohner.
export function npcZeitversatz(id: string): number {
  return (npcHash(id) * 2 - 1) * DORF_RHYTHMUS.zeitversatzMax;
}

// Der Tagesplan: liefert fuer die (um den persoenlichen Versatz verschobene)
// Tageszeit den aktuellen Anker. Kampf/Panik/Einfall uebersteuern das in der
// Szene - hier steht nur der friedliche Alltag.
export function tagesZiel(tageszeit: number, versatz = 0): TagesZiel {
  const t = tageszeit + versatz;
  const R = DORF_RHYTHMUS;
  if (t < TAG.morgenAb || t > TAG.nachtAb) return 'schlaf';
  if (t >= R.pauseVormittag && t < R.pauseVormittag + R.pausenDauer) return 'pause';
  if (t >= R.mittagAb && t < R.mittagBis) return 'mittag';
  if (t >= R.pauseNachmittag && t < R.pauseNachmittag + R.pausenDauer) return 'pause';
  if (t >= TAG.abendAb) return 'abend';
  return 'arbeit';
}

// Fester Verschnaufer-Platz neben der Station (seeded, damit jeder Bewohner
// "seine" Ecke hat und nicht alle auf demselben Punkt sitzen).
export function pausenPlatz(id: string, stationX: number, stationY: number): { x: number; y: number } {
  const a = npcHash(id + 'p') * Math.PI * 2;
  const r = 8 + npcHash(id + 'r') * (DORF_RHYTHMUS.pausenPlatzRadius - 8);
  return { x: stationX + Math.cos(a) * r, y: stationY + Math.sin(a) * r };
}
