// R206: Kontaktbogen der Monster-VORSCHLAEGE fuer den Autor. Zeichnet die
// neuen FIGURES-Eintraege (plus Skelett/Wolf als Massstab) gross auf eine
// Tafel mit Namen und speichert sie als PNG.
import fs from 'node:fs';

export default async (page) => {
  await page.waitForTimeout(4000);
  const dataUrl = await page.evaluate(async () => {
    const mod = await import('/src/gfx/fallbackArt.ts');
    const hd = await import('/src/gfx/monsterArtHd.ts');
    const { FIGURES, drawHumanoid, drawQuadruped } = mod;
    const zeigen = [
      ['schinder', 'DER SCHINDER\nhebt Tote wieder auf'],
      ['gefallener', 'GEFALLENER HELD\nElite-Scherge'],
      ['moorleiche', 'MOORLEICHE\nzaeher Ufer-Schrecken'],
      ['fuhrmann_tot', 'UNTOTER FUHRMANN\nfuehrt den Blut-Konvoi'],
      ['zimmermann_tot', 'UNTOTER ZIMMERMANN\nbaut Feind-Palisaden'],
      ['leichenhund', 'LEICHENHUND\n(noch 32er-Vierbeiner)'],
      ['skelett', 'SKELETT\n(Zweihand-Griff)'],
      ['schuetze', 'SCHUETZE\n(Langbogen + Pfeil)'],
      ['pest', 'PESTKRANKER\n(HD)'],
      ['lebender_toter', 'LEBENDER TOTER\n(HD)'],
      ['schatten', 'GRABSCHATTEN\n(HD)'],
      ['templer', 'TEMPLER\nBidenhaender 1,5x + Helm'],
      ['soldat', 'HEER: SOLDAT\n(Helm statt Hut)'],
      ['bogensoldat', 'HEER: BOGENSCHUETZE\n(HD)'],
      ['wache', 'STADTWACHE\n(Hellebarde)'],
      ['untoter_riese', 'UNTOTER RIESE\n(massig, HD)'],
      ['schmied', 'DORF: SCHMIED\n(Hammer)'],
      ['bauer1', 'DORF: BAUER\n(Helm-Kappe statt Hut)'],
      ['magd', 'DORF: MAGD\n(Eimer)'],
      ['haendler', 'DORF: HAENDLER\n(HD)'],
    ];
    // Zelle hoch genug fuer den 1.35er Gefallenen bei voller 5x-Skala (216px) -
    // im ersten Bogen war sein Helm abgeschnitten (Autor hat es gesehen).
    const ZELLE = 240, KOPF = 60, FUSS = 64, SP = 4;
    const reihen = Math.ceil(zeigen.length / SP);
    const cv = document.createElement('canvas');
    cv.width = ZELLE * SP; cv.height = KOPF + (ZELLE + FUSS) * reihen;
    const g = cv.getContext('2d');
    g.fillStyle = '#1c1610'; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#c9a227'; g.font = 'bold 26px serif'; g.textAlign = 'center';
    g.fillText('FIGUREN R208: HD fuer ALLE - Monster, Heer, Dorf (Platzhalter-Optik)', cv.width / 2, 38);
    zeigen.forEach(([name, label], i) => {
      const sx = (i % SP) * ZELLE, sy = KOPF + Math.floor(i / SP) * (ZELLE + FUSS);
      g.fillStyle = i < 6 ? '#241c12' : '#1f1a14';
      g.fillRect(sx + 6, sy + 4, ZELLE - 12, ZELLE + FUSS - 12);
      // HD-Figuren (R207) direkt aus der 128er-Zeichnung zeigen, Bestand wie
      // gehabt aus der 32er - beides auf dieselbe Anzeigegroesse gebracht.
      const istHd = hd.istHdFigur(name);
      const nat = istHd ? hd.HD_ZELLE : 32;
      const fc = document.createElement('canvas'); fc.width = nat; fc.height = nat;
      const fg = fc.getContext('2d');
      const spec = FIGURES[name];
      if (istHd) hd.drawMonsterHd(fg, name, 0, 0);
      else if (spec && 'quad' in spec) drawQuadruped(fg, spec.quad, 0, 0);
      else if (spec) drawHumanoid(fg, spec, 0, 0);
      g.imageSmoothingEnabled = istHd;                  // HD glatt, Bestand pixelig
      g.imageSmoothingQuality = 'high';
      // Die FIGUR soll in allen Zellen gleich gross erscheinen. Im HD-Frame
      // fuellt sie nur HD_FIGUR_U von HD_ZELLE_U - der Rest ist Luft fuer die
      // Klinge, also entsprechend groesser zeichnen.
      const luftF = istHd ? hd.HD_ZELLE_U / hd.HD_FIGUR_U : 1;
      const figW = 32 * 5;
      const w = figW * luftF;
      // Fusspunkt beider Varianten auf dieselbe Grundlinie legen
      const fussAnteil = istHd ? (hd.HD_LUFT_OBEN_U + 14) / hd.HD_ZELLE_U : 14 / 16;
      const grundlinie = sy + ZELLE + 4;
      g.drawImage(fc, 0, 0, nat, nat, sx + ZELLE / 2 - w / 2, grundlinie - fussAnteil * w, w, w);
      g.fillStyle = '#e8dcc0'; g.font = '15px serif';
      label.split('\n').forEach((zeile, zi) => g.fillText(zeile, sx + ZELLE / 2, sy + ZELLE + 24 + zi * 19));
    });
    return cv.toDataURL('image/png');
  });
  const ziel = process.env.POI_AUS ?? '/tmp';
  fs.writeFileSync(`${ziel}/monster_bogen.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('BOGEN ok');
};
