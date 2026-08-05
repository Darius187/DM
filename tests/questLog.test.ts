import { describe, it, expect } from 'vitest';
import { logbuch, aktiveQuests, autoVerfolgt, verfolgteQuest, questSicht } from '../src/logic/questLog';
import { QUESTS, type QuestCtx } from '../src/data/quests';

function ctx(flags: Record<string, boolean> = {}, extra: Partial<QuestCtx> = {}): QuestCtx {
  return { flags, hasKey: false, bossDead: false, level: 1, ...extra };
}

const haupt = QUESTS.find((q) => q.id === 'haupt_unsterblichkeit')!;

describe('Quest-Logbuch', () => {
  it('Spielstart: Hauptquest + Stahl-Quest (M8, sofort frei) sind aktiv', () => {
    const c = ctx();
    const log = logbuch(c);
    expect(log).toHaveLength(2);   // Hauptquest + "Stahl fuer Rabenmoor" (M8)
    expect(log[0].def.id).toBe('haupt_unsterblichkeit');
    expect(log[0].status).toBe('aktiv');
    expect(log[0].aktuellesZiel?.text).toContain('Landherrn');
    expect(log[0].fortschritt).toBe(0);
  });

  it('Hauptquest schreitet mit den Flags voran', () => {
    const s1 = questSicht(haupt, ctx({ auftragErhalten: true }));
    expect(s1.aktuellesZiel?.text).toContain('Pfad nach Osten');
    expect(s1.fortschritt).toBe(1);
    const s2 = questSicht(haupt, ctx({ auftragErhalten: true, nAnkunft: true }));
    expect(s2.aktuellesZiel?.text).toContain('Kryptaschlüssel');
    const s3 = questSicht(haupt, ctx({ auftragErhalten: true, nAnkunft: true }, { hasKey: true }));
    expect(s3.aktuellesZiel?.text).toContain('Krypta hinab');
  });

  it('Hauptquest gilt nach dem Boss als abgeschlossen, kein aktuelles Ziel mehr', () => {
    const s = questSicht(haupt, ctx({ auftragErhalten: true, nAnkunft: true }, { hasKey: true, bossDead: true }));
    expect(s.status).toBe('abgeschlossen');
    expect(s.aktuellesZiel).toBeNull();
    expect(s.fortschritt).toBe(s.gesamt);
  });

  it('Nebenquest Ratten erscheint erst nach Annahme und endet mit rattenFertig', () => {
    expect(aktiveQuests(ctx()).some((s) => s.def.id === 'neben_ratten')).toBe(false);
    const angenommen = aktiveQuests(ctx({ muellerQuest: true, rattenAktiv: true }));
    expect(angenommen.some((s) => s.def.id === 'neben_ratten')).toBe(true);
    const fertig = logbuch(ctx({ muellerQuest: true, rattenFertig: true })).find((s) => s.def.id === 'neben_ratten')!;
    expect(fertig.status).toBe('abgeschlossen');
  });

  it('automatische Verfolgung wählt die Hauptquest, nicht eine Nebenquest', () => {
    const c = ctx({ muellerQuest: true, rattenAktiv: true });
    expect(autoVerfolgt(c)).toBe('haupt_unsterblichkeit');
  });

  it('nach Abschluss der Hauptquest verfolgt die Automatik die nächste aktive Quest', () => {
    const c = ctx({ auftragErhalten: true, nAnkunft: true, muellerQuest: true, rattenAktiv: true }, { hasKey: true, bossDead: true });
    // Hauptquest abgeschlossen -> Ratten-Nebenquest wird verfolgt
    // M8: die sofort-freie Stahl-Quest steht in der Automatik VOR den Ratten
    expect(autoVerfolgt(c)).toBe('neben_stahl');
    expect(verfolgteQuest(c, '')?.def.id).toBe('neben_stahl');
  });

  it('eine vom Spieler gewählte aktive Quest wird respektiert, eine ungültige fällt auf Automatik zurück', () => {
    const c = ctx({ muellerQuest: true, rattenAktiv: true });
    expect(verfolgteQuest(c, 'neben_ratten')?.def.id).toBe('neben_ratten');
    // nicht aktive/unbekannte Wunsch-ID -> Automatik (Hauptquest)
    expect(verfolgteQuest(c, 'gibt_es_nicht')?.def.id).toBe('haupt_unsterblichkeit');
  });

  it('Krieg ist ein offenes Ereignis und bleibt aktiv (kein Abschluss)', () => {
    const krieg = logbuch(ctx({ kriegBegonnen: true })).find((s) => s.def.id === 'ereignis_krieg')!;
    expect(krieg.status).toBe('aktiv');
    expect(krieg.aktuellesZiel?.text).toContain('WAHRE Relikt');
  });

  it('abgeschlossene Quests stehen im Logbuch hinter den aktiven', () => {
    const c = ctx({ auftragErhalten: true, nAnkunft: true, medaillonGenommen: true }, { hasKey: true, bossDead: true });
    const log = logbuch(c);
    const ersterAbgeschlossen = log.findIndex((s) => s.status === 'abgeschlossen');
    const letzterAktiv = [...log].reverse().findIndex((s) => s.status === 'aktiv');
    const letzterAktivIdx = letzterAktiv < 0 ? -1 : log.length - 1 - letzterAktiv;
    expect(ersterAbgeschlossen).toBeGreaterThan(letzterAktivIdx);
  });
});
