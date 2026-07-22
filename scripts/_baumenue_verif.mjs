// Verifikation: Baumenue-Icons laden und werden gezeichnet (RTS-Modus + Bau-Leiste).
export default async (page) => {
  await page.evaluate(() => {
    const g = window.__game;
    if (g && !window.__welt) g.scene.start('World', { neu: true, startArea: 'stadt' });
  });
  await page.waitForFunction(() => !!window.__welt, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(4500);
  // In den RTS-Modus + Bau-Leiste zeichnen.
  await page.evaluate(() => { const w = window.__welt; w.toggleRtsModus?.(); });
  await page.waitForTimeout(1500);

  const res = await page.evaluate(() => {
    const w = window.__welt;
    const ids = ['wehr','lager','versorgung','zeichen','palisade','wachturm','tor','lazarett','zelt',
      'feldaltar','kochstelle','brunnen','feldschmiede','wartfeuer','nachschub','botenposten','pferdekoppel',
      'lagerfeuer','standarte','aushebung','rueckzug','schild','nahkampf','bogen','heiler','reiter',
      'linie','schildwall','keil','plaenkler'];
    const geladen = ids.filter((id) => w.textures.exists('baumenue_' + id));
    const fehlt = ids.filter((id) => !w.textures.exists('baumenue_' + id));
    return { geladen: geladen.length, gesamt: ids.length, fehlt };
  });
  console.log('BAUMENUE ' + JSON.stringify(res));
};
