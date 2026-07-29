// R207c-Beweis IM SPIEL: (a) sind die HD-Frames groesser und der Ursprung so
// gesetzt, dass der FUSSPUNKT auf derselben Weltposition liegt wie vorher?
// (b) wird der Templer nicht mehr doppelt skaliert / abgeschnitten?
// (c) zeichnet die Szene den Bodenschatten (kein Schweben)?
export default async (page) => {
  for (let i = 0; i < 25; i++) {
    await page.evaluate(() => {
      const g = window.__game;
      if (g && !window.__welt) g.scene.start('World', { neu: true, startArea: 'start' });
    }).catch(() => {});
    if (await page.evaluate(() => !!window.__welt).catch(() => false)) break;
    await page.waitForTimeout(3000);
  }
  await page.waitForTimeout(2500);
  const b = await page.evaluate(async () => {
    const w = window.__welt;
    if (!w) return { fehler: 'Welt fehlt' };
    const hd = await import('/src/gfx/monsterArtHd.ts');
    const T = 32;
    // Freies Feld suchen und je einen Gegner setzen
    const setze = (typ, tx, ty) => {
      const e = w.spawnEnemy(typ, 1, tx * T + 16, ty * T + 16, false, true);
      if (e) e.passiv = true;
      return e;
    };
    for (const e of w.enemies) e.hp = 0;
    w.enemies.length = 0;
    const templer = setze('templer', 20, 20);
    const skelett = setze('skelett', 24, 20);
    const wolf = setze('wolf', 28, 20);
    // R207c: die GEFALLENEN-Varianten (skelett_schwert & Co.) sind die echten
    // Feldfiguren - genau sie muessen den HD-Weg nehmen.
    const gefallen = setze('skelett', 32, 20);
    if (gefallen) gefallen.figurName = 'skelett_schwert';
    // einen Takt rendern lassen, damit applyFigure + Schatten laufen
    let t = 900000;
    for (let i = 0; i < 4; i++) { t += 16.6; w.update(t, 16.6); }

    const mess = (e, name) => {
      if (!e || !e.sprite) return null;
      const s = e.sprite;
      // Fusspunkt in Weltkoordinaten = Anker + (1 - originY) * FrameHoehe * Skala
      const fussUnterAnker = (1 - s.originY) * s.frame.height * s.scaleY;
      return {
        typ: name,
        hd: hd.istHdFigur(e.figur()),
        frameW: s.frame.height, frameH: s.frame.height,
        originY: Math.round(s.originY * 10000) / 10000,
        szenenSkala: Math.round(s.scaleX * 100) / 100,
        // Bei den alten 32er-Frames lag der Fuss 12 px unter dem Anker (x Skala).
        fussUnterAnkerPx: Math.round(fussUnterAnker * 100) / 100,
        sollFussPx: Math.round(12 * s.scaleY * 100) / 100,
        // sichtbare Figurhoehe in Weltpixeln (Figur, nicht Frame)
        figurHoehePx: Math.round(s.frame.height * (hd.istHdFigur(e.figur()) ? hd.HD_FIGUR_U / hd.HD_ZELLE_U : 1) * s.scaleY),
      };
    };

    // Schatten-Ebene: hat sie Zeichenbefehle bekommen?
    const g = w.figurSchattenGfx;
    const schattenBefehle = g ? (g.commandBuffer ? g.commandBuffer.length : -1) : -2;

    return {
      hdFrame: hd.hdFrameGroesse(32),
      hdOriginY: Math.round(hd.HD_ORIGIN_Y * 10000) / 10000,
      figuren: [mess(templer, 'templer'), mess(skelett, 'skelett'), mess(wolf, 'wolf')].filter(Boolean),
      schattenTiefe: g ? g.depth : null,
      schattenBefehle,
    };
  });
  console.log('HDGAME ' + JSON.stringify(b, null, 1));
};
