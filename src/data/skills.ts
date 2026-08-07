// Gemeinsame Symbole, Kurzbeschreibungen und Schadenstexte der Zauber/Fähigkeiten
// (Runde 49). Damit Aktionsleiste UND Fähigkeiten-Tab DIESELBEN Symbole zeigen
// und die Tooltips erklären, was ein Skill tut und wie viel er austeilt.

import { SPELL_FX, ABILITY_FX, ABILITIES } from './balancing';

// Symbole müssen mit AKTIONEN in hud.ts übereinstimmen. Runde 51: Heilung =
// Kreuz (war ❧, unklar), Heilende Hand = Hände, Markierter Tod = Fadenkreuz
// (war ◎ doppelt mit Bannkreis), Blutdurst = Blutstropfen (war ⚔ doppelt mit Angriff).
export const SKILL_ICONS: Record<string, string> = {
  // Zauber (Zauberei-Schule, liegen in SPELLS)
  feuerball: '✦', heiligesLicht: '☩', heilung: '✚',
  // Zauberei-Fähigkeiten
  kettenblitz: '⌁', frostnova: '❄', bannkreis: '◎', aderlass: '⚱', lebenstausch: '❤', heilen: '🤲', feuerregen: '☄', atomschlag: '☢',
  // Nahkampf
  wuchtschlag: '⤲', rundumschlag: '↻', blutdurst: '🩸', kriegsschrei: '⛉', sturmangriff: '⇒', erschuetterung: '⤓', hinrichtung: '☠',
  // Bogen
  mehrfachschuss: '⫶', durchschlag: '➶', markierterTod: '⌖', hagel: '⇊', splitterpfeil: '✸', sprungpfeil: '⤴', fesselpfeil: '⛓',
};

// Kurzbeschreibung der drei Zauber (ABILITIES hat schon eine eigene beschreibung)
const SPELL_BESCHREIBUNG: Record<string, string> = {
  feuerball: 'Schleudert einen Feuerball; beim Einschlag Splittschaden in der Nähe.',
  heiligesLicht: 'Göttlicher Lichtblitz rings um dich - Untote nehmen deutlich mehr Schaden.',
  heilung: 'Heilt dich augenblicklich um einen Anteil deines Lebens.',
};

export function skillBeschreibung(id: string): string {
  if (SPELL_BESCHREIBUNG[id]) return SPELL_BESCHREIBUNG[id];
  return ABILITIES.find((a) => a.id === id)?.beschreibung ?? '';
}

type FxWerte = { dmgBase?: number; dmgPerLevel?: number; dmgMult?: number; mana?: number; cd?: number;
  healPct?: number; slowS?: number; wurzelS?: number; spruenge?: number; splitter?: number; radius?: number;
  stunS?: number; knockback?: number; healPerHit?: number; buffS?: number };

// Schaden/Wirkung + Abklingzeit als kurzer Tooltip-Text (auf die Heldenstufe
// gerechnet). Gibt null, wenn es keinen sinnvollen Schadenswert gibt.
export function skillWirkungText(id: string, level: number): string | null {
  const spell = (SPELL_FX as Record<string, FxWerte>)[id];
  if (id === 'feuerball' && spell) { const d = (spell.dmgBase ?? 0) + (spell.dmgPerLevel ?? 0) * level; return `~${d} Schaden + Splash · ${spell.cd ?? SPELL_CD[id]} s`; }
  if (id === 'heiligesLicht' && spell) { const d = (spell.dmgBase ?? 0) + (spell.dmgPerLevel ?? 0) * level; return `~${d} Schaden (Untote +40%) · ${SPELL_CD[id]} s`; }
  if (id === 'heilung' && spell) return `Heilt ${Math.round((spell.healPct ?? 0) * 100)}% Leben · ${SPELL_CD[id]} s`;
  const fx = (ABILITY_FX as Record<string, FxWerte>)[id];
  if (!fx) return null;
  const cd = fx.cd !== undefined ? ` · ${fx.cd} s` : '';
  if (id === 'kriegsschrei') return `Betäubt ringsum ${fx.stunS} s · +Schaden ${fx.buffS} s${cd}`;
  if (fx.dmgBase !== undefined) { const d = fx.dmgBase + (fx.dmgPerLevel ?? 0) * level; return `~${d} Schaden${cd}`; }
  if (fx.wurzelS !== undefined) return `Fesselt ${fx.wurzelS} s${cd}`;
  if (fx.healPct !== undefined || id === 'heilen') return `Hebt Helfer auf / heilt dich${cd}`;
  if (fx.dmgMult !== undefined) {
    const zusatz = fx.healPerHit ? ` · +${fx.healPerHit} Leben je Treffer` : fx.stunS ? ` · betäubt ${fx.stunS} s` : '';
    return `Schaden ×${fx.dmgMult}${zusatz}${fx.spruenge ? ` · springt ${fx.spruenge}×` : ''}${fx.splitter ? ` · ${fx.splitter} Splitter` : ''}${cd}`;
  }
  return cd ? `Abklingzeit${cd}` : null;
}

// Abklingzeiten der drei Zauber (in SPELLS, nicht in SPELL_FX)
const SPELL_CD: Record<string, number> = { feuerball: 0.55, heiligesLicht: 2, heilung: 4 };
