import { describe, expect, it } from 'vitest';
import { HELDEN_PFERD_ID, RAVENSMOOR_PFERDE, pferdDef } from '../src/data/ravensmoorPferde';

describe('Ravensmoorer Pferdebestand', () => {
  it('enthaelt genau vier eigenstaendige Stallplaetze', () => {
    expect(RAVENSMOOR_PFERDE).toHaveLength(4);
    expect(new Set(RAVENSMOOR_PFERDE.map((p) => p.id)).size).toBe(4);
    expect(new Set(RAVENSMOOR_PFERDE.map((p) => p.stallId)).size).toBe(4);
  });

  it('gibt dem Helden das schwarze, leichtere Reitpferd', () => {
    const held = pferdDef(HELDEN_PFERD_ID);
    expect(held.rolle).toBe('held');
    expect(held.name.toLowerCase()).toContain('schwarz');
    expect(held.breite).toBe(1);
  });

  it('macht alle drei Arbeitspferde sichtbar kraeftiger und NPC-gefuehrt', () => {
    const arbeit = RAVENSMOOR_PFERDE.filter((p) => p.rolle === 'arbeit');
    expect(arbeit).toHaveLength(3);
    expect(arbeit.every((p) => p.breite > 1 && p.npcId)).toBe(true);
    expect(arbeit.some((p) => p.tint === 0x5c4c3c)).toBe(true);
  });
});
