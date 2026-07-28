// R204-Pruefung: sind die poi3d_*-Bakes registriert, wie gross sind sie, und
// wie sehen sie aus? Die Sprites werden als dataURL herausgereicht und vom
// Aufrufer als PNG gespeichert - ECHTE Sichtpruefung statt Welt-Screenshot.
import fs from 'node:fs';

export default async (page) => {
  // Boot abwarten (die Bakes laufen in der BootScene vor dem Titel)
  for (let i = 0; i < 30; i++) {
    const da = await page.evaluate(() => !!window.__game?.textures?.exists?.('poi3d_galgen')).catch(() => false);
    if (da) break;
    await page.waitForTimeout(2000);
  }
  const bericht = await page.evaluate(() => {
    const tex = window.__game?.textures;
    if (!tex) return { fehler: 'kein Spiel' };
    const out = {};
    for (const art of ['galgen', 'meiler', 'bildstock', 'karren']) {
      const key = 'poi3d_' + art;
      if (!tex.exists(key)) { out[art] = null; continue; }
      const src = tex.get(key).getSourceImage();
      out[art] = { w: src.width, h: src.height, png: src.toDataURL('image/png') };
    }
    return out;
  });
  const ordner = process.env.POI_AUS ?? '/tmp';
  const zusammenfassung = {};
  for (const [art, d] of Object.entries(bericht)) {
    if (!d || !d.png) { zusammenfassung[art] = null; continue; }
    fs.writeFileSync(`${ordner}/poi3d_${art}.png`, Buffer.from(d.png.split(',')[1], 'base64'));
    zusammenfassung[art] = { w: d.w, h: d.h };
  }
  console.log('POIBAKE ' + JSON.stringify(zusammenfassung));
};
