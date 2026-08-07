// R205-Pruefung: hebt klares Wetter das Tageslicht wirklich an, dunkelt Regen
// und Naesse ab? Die ColorMatrix-Multiplikatoren werden per Hook abgegriffen
// (tagLichtFX.set), je Szenario ein renderStimmung-Aufruf bei Mittag.
export default async (page) => {
  for (let i = 0; i < 25; i++) {
    await page.evaluate(() => {
      const g = window.__game;
      if (g && !window.__welt) g.scene.start('World', { neu: true, startArea: 'start' });
    }).catch(() => {});
    if (await page.evaluate(() => !!window.__welt).catch(() => false)) break;
    await page.waitForTimeout(3000);
  }
  await page.waitForTimeout(2000);
  const bericht = await page.evaluate(() => {
    const w = window.__welt;
    if (!w) return { fehler: 'Welt fehlt' };
    // Headless gibt es die Kamera-PostFX nicht - renderStimmung nutzt ?. , also
    // reicht ein Mess-Stub, der die Multiply-Werte abgreift.
    let mul = null, satt = null;
    const echt = w.tagLichtFX;
    w.tagLichtFX = {
      set: (m) => { mul = [m[0], m[6], m[12]].map((v) => Math.round(v * 1000) / 1000); },
      saturate: (v) => { satt = Math.round(v * 1000) / 1000; },
    };
    const misst = (wetter, naesse) => {
      w.tageszeit = 0.5;             // Mittag
      w.wetterWert = wetter; w.wetterZiel = wetter; w.wetterTimer = 1e9;
      w.naesse = naesse;
      w.regnet = wetter > 0.15;
      w.renderStimmung();
      return { mul, satt, gold: Math.round((w.stimmungRect?.fillAlpha ?? 0) * 1000) / 1000 };
    };
    const out = {
      sonnig: misst(-1, 0),
      neutral: misst(0, 0),
      regen: misst(0.8, 0.6),
      nassNachRegen: misst(0, 0.8),
    };
    w.tagLichtFX = echt;
    return out;
  });
  console.log('WETTER ' + JSON.stringify(bericht));
};
