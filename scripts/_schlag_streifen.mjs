// R209: die Schlag-Animation als Streifen zum Abnehmen - Skelett (Zweihaender),
// vier Bilder: Stand -> Ausholen -> Hieb -> Ausklang.
import fs from 'node:fs';
export default async (page) => {
  await page.waitForTimeout(4000);
  const dataUrl = await page.evaluate(async () => {
    const hd = await import('/src/gfx/monsterArtHd.ts');
    const PHASEN = [[0, 'STAND'], [4, 'AUSHOLEN'], [5, 'HIEB'], [6, 'AUSKLANG']];
    const Z = 260, KOPF = 56, FUSS = 44;
    const cv = document.createElement('canvas');
    cv.width = Z * PHASEN.length; cv.height = KOPF + Z + FUSS;
    const g = cv.getContext('2d');
    g.fillStyle = '#1c1610'; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#c9a227'; g.font = 'bold 24px serif'; g.textAlign = 'center';
    g.fillText('R209: SCHLAG-ANIMATION Skelett (Zweihaender) - Vorschau zur Abnahme', cv.width / 2, 34);
    PHASEN.forEach(([frame, label], i) => {
      const sx = i * Z;
      g.fillStyle = '#241c12'; g.fillRect(sx + 5, KOPF, Z - 10, Z);
      const fc = document.createElement('canvas'); fc.width = hd.HD_ZELLE; fc.height = hd.HD_ZELLE;
      hd.drawMonsterHd(fc.getContext('2d'), 'skelett', 0, frame);
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(fc, sx + 5, KOPF, Z - 10, Z);
      g.fillStyle = '#e8dcc0'; g.font = '17px serif';
      g.fillText(String(label), sx + Z / 2, KOPF + Z + 28);
    });
    return cv.toDataURL('image/png');
  });
  fs.writeFileSync(`${process.env.POI_AUS ?? '/tmp'}/schlag_streifen.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('STREIFEN ok');
};
