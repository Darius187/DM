// R206: Kontaktbogen der Monster-VORSCHLAEGE fuer den Autor. Zeichnet die
// neuen FIGURES-Eintraege (plus Skelett/Wolf als Massstab) gross auf eine
// Tafel mit Namen und speichert sie als PNG.
import fs from 'node:fs';

export default async (page) => {
  await page.waitForTimeout(4000);
  const dataUrl = await page.evaluate(async () => {
    const mod = await import('/src/gfx/fallbackArt.ts');
    const { FIGURES, drawHumanoid, drawQuadruped } = mod;
    const zeigen = [
      ['schinder', 'DER SCHINDER\nhebt Tote wieder auf'],
      ['gefallener', 'GEFALLENER HELD\nElite-Scherge'],
      ['moorleiche', 'MOORLEICHE\nzaeher Ufer-Schrecken'],
      ['fuhrmann_tot', 'UNTOTER FUHRMANN\nfuehrt den Blut-Konvoi'],
      ['zimmermann_tot', 'UNTOTER ZIMMERMANN\nbaut Feind-Palisaden'],
      ['leichenhund', 'LEICHENHUND\njagt im Rudel'],
      ['skelett', '(Skelett - Bestand,\nzum Vergleich)'],
      ['wolf', '(Wolf - Bestand,\nzum Vergleich)'],
    ];
    // Zelle hoch genug fuer den 1.35er Gefallenen bei voller 5x-Skala (216px) -
    // im ersten Bogen war sein Helm abgeschnitten (Autor hat es gesehen).
    const ZELLE = 240, KOPF = 60, FUSS = 64, SP = 4;
    const cv = document.createElement('canvas');
    cv.width = ZELLE * SP; cv.height = KOPF + (ZELLE + FUSS) * 2;
    const g = cv.getContext('2d');
    g.fillStyle = '#1c1610'; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#c9a227'; g.font = 'bold 26px serif'; g.textAlign = 'center';
    g.fillText('MONSTER-VORSCHLAEGE R206 (prozedurale Platzhalter-Optik)', cv.width / 2, 38);
    zeigen.forEach(([name, label], i) => {
      const sx = (i % SP) * ZELLE, sy = KOPF + Math.floor(i / SP) * (ZELLE + FUSS);
      g.fillStyle = i < 6 ? '#241c12' : '#1f1a14';
      g.fillRect(sx + 6, sy + 4, ZELLE - 12, ZELLE + FUSS - 12);
      // Figur in 32x32 zeichnen, dann 5x hochskaliert (scharf) einblenden
      const fc = document.createElement('canvas'); fc.width = 32; fc.height = 32;
      const fg = fc.getContext('2d');
      const spec = FIGURES[name];
      if (spec && 'quad' in spec) drawQuadruped(fg, spec.quad, 0, 0);
      else if (spec) drawHumanoid(fg, spec, 0, 0);
      g.imageSmoothingEnabled = false;
      // Zellen-Deckel: grosse Figuren (scale) nicht ueber den Kasten wachsen lassen
      const w = Math.min(32 * (spec && spec.scale ? spec.scale : 1) * 5, ZELLE - 24);
      g.drawImage(fc, sx + ZELLE / 2 - w / 2, sy + ZELLE - w + 10, w, w);
      g.fillStyle = '#e8dcc0'; g.font = '15px serif';
      label.split('\n').forEach((zeile, zi) => g.fillText(zeile, sx + ZELLE / 2, sy + ZELLE + 24 + zi * 19));
    });
    return cv.toDataURL('image/png');
  });
  const ziel = process.env.POI_AUS ?? '/tmp';
  fs.writeFileSync(`${ziel}/monster_bogen.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('BOGEN ok');
};
