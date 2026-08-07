// F3/M1: sichtbare untote Zimmerleute - nur beim wachsenden Lager, kein Kampf,
// zerfallen mit dem Altar.
export default async (page) => {
  await page.evaluate(() => {
    const g = window.__game;
    if (g && !window.__welt) g.scene.start('World', { neu: true, startArea: 'lager' });
  });
  await page.waitForFunction(() => !!window.__welt, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const res = await page.evaluate(() => {
    const w = window.__welt;
    if (!w) return { fehler: 'kein __welt' };
    const area = w.area;
    const bauLager = (seitS) => {
      for (const e of w.enemies.slice()) e.hp = 0;
      w.enemies = w.enemies.filter(() => false);
      w.altarStehtHier = false;
      let lg = w.feindzug.lager.find((l) => l.karte === area.id);
      if (!lg) { lg = { karte: area.id, punkte: 0 }; w.feindzug.lager.push(lg); }
      lg.seitS = seitS;
      w.baueFeindlager(area);
    };
    const arb = () => w.enemies.filter((e) => e.name === 'Untoter Zimmermann' && e.hp > 0);

    // Stufe 1 (waechst noch, 90..300) -> Zimmerleute da
    bauLager(150);
    const a1 = arb();
    const probe = a1[0] ? { dmg: a1[0].dmg, passiv: a1[0].passiv, hp: a1[0].hp, rolle: a1[0].lagerRolle } : null;
    // Stufe 2 (voll ausgebaut) -> KEINE Zimmerleute mehr
    bauLager(400);
    const a2 = arb().length;
    // Zerfall: Altar faellt -> Zimmerleute zerfallen
    bauLager(150);
    const vorSturz = arb().length;
    for (const e of w.enemies) if (e.name === 'Bindealtar') e.hp = 0;
    w.pruefeAltarSturz();
    const nachSturz = arb().length;

    return { bauStufe1: a1.length, probe, vollAusbau: a2, vorSturz, nachSturz };
  });
  console.log('ARBEITER-VERIF ' + JSON.stringify(res));
};
