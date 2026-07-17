import { describe, expect, it } from 'vitest';
import { neueArmee, musterEin, heerObergrenze, pruefeRekrutierung, desertiere } from '../src/logic/armee';
import { REKRUTIERUNG } from '../src/data/rts';
import { skaliereProduktion } from '../src/data/wirtschaft';
import { moralWert, LEERE_LAGE } from '../src/logic/moral';
import { seededRng } from '../src/logic/rng';

describe('Rekrutierung: Bauern werden Soldaten (R143, Dok 03 2.3)', () => {
  it('Heer-Obergrenze haengt an der Bevoelkerung', () => {
    expect(heerObergrenze(REKRUTIERUNG.bevoelkerungStart)).toBe(Math.floor(REKRUTIERUNG.bevoelkerungStart * REKRUTIERUNG.obergrenzeJeEinwohner));
    expect(heerObergrenze(4)).toBe(2);
    expect(heerObergrenze(0)).toBe(0);
  });

  it('Bauern-Rekrut braucht Gold UND Waffe UND Arbeiter', () => {
    const genug = { gold: REKRUTIERUNG.gold, waffen: 1, bevoelkerung: 10, heerGroesse: 0 };
    expect(pruefeRekrutierung('bauer', genug)).toBeNull();
    expect(pruefeRekrutierung('bauer', { ...genug, gold: REKRUTIERUNG.gold - 1 })).toMatch(/Gold/);
    expect(pruefeRekrutierung('bauer', { ...genug, waffen: 0 })).toMatch(/Waffe/);
    expect(pruefeRekrutierung('bauer', { ...genug, bevoelkerung: 0 })).toMatch(/Arbeiter/);
  });

  it('Soeldner kostet NUR Gold - keine Waffe, kein Arbeiter', () => {
    expect(pruefeRekrutierung('soeldner', { gold: REKRUTIERUNG.soeldnerGold, waffen: 0, bevoelkerung: 2, heerGroesse: 0 })).toBeNull();
    expect(pruefeRekrutierung('soeldner', { gold: REKRUTIERUNG.soeldnerGold - 1, waffen: 9, bevoelkerung: 9, heerGroesse: 0 })).toMatch(/Gold/);
  });

  it('Obergrenze blockt beide Wege (Truppen nicht frei stapelbar)', () => {
    const voll = { gold: 9999, waffen: 9, bevoelkerung: 4, heerGroesse: heerObergrenze(4) };
    expect(pruefeRekrutierung('bauer', voll)).toMatch(/Obergrenze|Bevölkerung|traegt/i);
    expect(pruefeRekrutierung('soeldner', voll)).toMatch(/Obergrenze|Bevölkerung|traegt/i);
  });

  it('Soeldner-Flag wandert in die Einheit', () => {
    const a = neueArmee();
    const s = musterEin(a, 'nahkampf', 'stadt', seededRng(1), true);
    const b = musterEin(a, 'nahkampf', 'stadt', seededRng(2));
    expect(s.soeldner).toBe(true);
    expect(!!b.soeldner).toBe(false);
  });

  it('Desertion: raus aus dem Heer, aber NICHT ins Gefallenen-Buch', () => {
    const a = neueArmee();
    const s = musterEin(a, 'nahkampf', 'stadt', seededRng(3), true);
    const name = desertiere(a, s.id);
    expect(name).toBe(s.name);
    expect(a.einheiten.length).toBe(0);
    expect(a.gefallene).toEqual([]);
  });

  it('Tages-Produktion skaliert mit der Bevoelkerung (jeder Rekrut macht das Dorf aermer)', () => {
    expect(skaliereProduktion(4, REKRUTIERUNG.bevoelkerungStart)).toBe(4);
    expect(skaliereProduktion(4, REKRUTIERUNG.bevoelkerungStart / 2)).toBe(2);
    expect(skaliereProduktion(4, 0)).toBe(0);
    expect(skaliereProduktion(1, REKRUTIERUNG.bevoelkerungStart - 1)).toBe(1);   // rundet, wuergt Kleinstmengen nicht sofort ab
  });

  it('Soeldner-Moral liegt unter Bauern-Moral (gleiche Lage)', () => {
    const bauer = moralWert({ ...LEERE_LAGE });
    const soeldner = moralWert({ ...LEERE_LAGE, soeldner: true });
    expect(soeldner).toBe(bauer - REKRUTIERUNG.soeldnerMoralMalus);
  });
});
