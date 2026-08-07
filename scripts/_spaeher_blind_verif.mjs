// F2a Live-Wiring: getoeteter Kloster-Spaeher blendet den Feindzug (A10).
export default async (page) => {
  await page.evaluate(() => {
    const g = window.__game;
    if (g && !window.__welt) g.scene.start('World', { neu: true, startArea: 'stadt' });
  });
  await page.waitForFunction(() => !!window.__welt, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const res = await page.evaluate(() => {
    const w = window.__welt;
    if (!w) return { fehler: 'kein __welt' };
    const spawnSpaeher = () => {
      const e = w.spawnEnemy('skelett', 1, w.px + 80, w.py, false, true);
      e.name = 'Kloster-Späher';
      return e;
    };
    const blind0 = w.spaeherBlindT;           // frisch: 0
    w.killEnemy(spawnSpaeher());
    const blind1 = w.spaeherBlindT;           // nach 1 Kill: blindProKillS (90)
    // Deckel testen: viele Kills -> gedeckelt bei blindMaxS (240)
    for (let i = 0; i < 6; i++) w.killEnemy(spawnSpaeher());
    const blindCap = w.spaeherBlindT;
    // Abklingen: der Feindzug-Tick zieht dt ab
    w['updateFeindzug'] ? w['updateFeindzug'](5) : null;
    const blindNachTick = w.spaeherBlindT;
    return { blind0, blind1, blindCap, blindNachTick };
  });
  console.log('SPAEHER-WIRING ' + JSON.stringify(res));
};
