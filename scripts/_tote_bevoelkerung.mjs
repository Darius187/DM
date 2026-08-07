// R212: Kontaktbogen der TOTEN BEVOELKERUNG (Dok 06 Teil E) - jeder Beruf
// als Wiedergaenger, Werkzeug bleibt in der Hand.
import fs from 'node:fs';
export default async (page) => {
  await page.waitForTimeout(4000);
  const dataUrl = await page.evaluate(async () => {
    const hd = await import('/src/gfx/monsterArtHd.ts');
    const zeigen = [
      ['schmied_tot', 'TOTER SCHMIED\n(flickt die Elite)'],
      ['mueller_tot', 'TOTER MUELLER'],
      ['baecker_tot', 'TOTER BAECKER'],
      ['priester_tot', 'TOTER PRIESTER'],
      ['moench_tot', 'TOTER MOENCH'],
      ['wirtin_tot', 'TOTE WIRTIN'],
      ['fischer_tot', 'TOTER FISCHER\n(Angel)'],
      ['gerber_tot', 'TOTER GERBER'],
      ['bauer1_tot', 'TOTER BAUER\n(graebt Graeben)'],
      ['magd_tot', 'TOTE MAGD'],
      ['wache_tot', 'TOTE STADTWACHE\n(Hellebarde)'],
      ['soldat_tot', 'GEFALLENER SOLDAT'],
      ['schulze_tot', 'TOTER SCHULZE'],
      ['landherr_tot', 'TOTER LANDHERR'],
      ['schmied_tot_e3', 'TOTER SCHMIED Ebene 3\n(+Ebenen-Ton)'],
      ['wache_tot_e5', 'TOTE WACHE Ebene 5\n(Schattenwerk)'],
    ];
    const ZELLE = 240, KOPF = 60, FUSS = 64, SP = 4;
    const reihen = Math.ceil(zeigen.length / SP);
    const cv = document.createElement('canvas');
    cv.width = ZELLE * SP; cv.height = KOPF + (ZELLE + FUSS) * reihen;
    const g = cv.getContext('2d');
    g.fillStyle = '#161a16'; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#c9a227'; g.font = 'bold 26px serif'; g.textAlign = 'center';
    g.fillText('R212: DIE TOTE BEVOELKERUNG - Herkunft = Beruf (Dok 06 Teil E)', cv.width / 2, 38);
    zeigen.forEach(([name, label], i) => {
      const sx = (i % SP) * ZELLE, sy = KOPF + Math.floor(i / SP) * (ZELLE + FUSS);
      g.fillStyle = '#1e241e'; g.fillRect(sx + 6, sy + 4, ZELLE - 12, ZELLE + FUSS - 12);
      const fc = document.createElement('canvas'); fc.width = hd.HD_ZELLE; fc.height = hd.HD_ZELLE;
      hd.drawMonsterHd(fc.getContext('2d'), name, 0, 0);
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      const luftF = hd.HD_ZELLE_U / hd.HD_FIGUR_U, w = 32 * 5 * luftF;
      const fussAnteil = (hd.HD_LUFT_OBEN_U + 14) / hd.HD_ZELLE_U;
      g.drawImage(fc, 0, 0, hd.HD_ZELLE, hd.HD_ZELLE, sx + ZELLE / 2 - w / 2, sy + ZELLE + 4 - fussAnteil * w, w, w);
      g.fillStyle = '#d8e0cc'; g.font = '15px serif';
      label.split('\n').forEach((zeile, zi) => g.fillText(zeile, sx + ZELLE / 2, sy + ZELLE + 24 + zi * 19));
    });
    return cv.toDataURL('image/png');
  });
  fs.writeFileSync(`${process.env.POI_AUS ?? '/tmp'}/tote_bevoelkerung.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('TOTE ok');
};
