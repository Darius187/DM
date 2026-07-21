// F3 (A9): Wehrtuerme am Vollausbau-Feindlager (Tor-Korridore, zerstoerbar).
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
    // Alle Gegner raeumen, damit baueFeindlager neu baut
    for (const e of w.enemies.slice()) { e.hp = 0; }
    w.enemies = w.enemies.filter(() => false);
    w.altarStehtHier = false;
    // Vollausbau erzwingen: dieses Lager ist lange besetzt (Stufe 2)
    let lg = w.feindzug.lager.find((l) => l.karte === area.id);
    if (!lg) { lg = { karte: area.id, punkte: 0 }; w.feindzug.lager.push(lg); }
    lg.seitS = 400;
    w.baueFeindlager(area);
    const tuerme = w.enemies.filter((e) => e.name === 'Knochenturm');
    const t0 = tuerme[0];
    return {
      karte: area.id,
      tuerme: tuerme.length,
      probe: t0 ? { speed: t0.speed, ranged: t0.ranged, turmReichF: t0.turmReichF, hp: t0.hp, rolle: t0.lagerRolle, champion: t0.champion } : null,
      altar: w.enemies.some((e) => e.name === 'Bindealtar'),
    };
  });
  console.log('TURM-VERIF ' + JSON.stringify(res));
};
