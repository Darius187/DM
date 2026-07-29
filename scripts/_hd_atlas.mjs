// R207: baut der SpriteProvider die fig_-Atlanten der HD-Monster korrekt?
export default async (page) => {
  await page.waitForTimeout(4000);
  const b = await page.evaluate(async () => {
    const g = window.__game;
    if (!g) return { fehler: 'kein Spiel' };
    const szene = g.scene.getScenes(true)[0];
    const { SpriteProvider } = await import('/src/gfx/SpriteProvider.ts');
    const prov = new SpriteProvider(szene);
    const out = {};
    for (const n of ['schinder', 'gefallener', 'moorleiche', 'fuhrmann_tot', 'zimmermann_tot']) {
      const f = prov.figureFrame(n, 0, 0);
      const t = g.textures.get(f.key);
      const fr = t.get(f.frame);
      // Alpha-Probe: hat der Frame sichtbaren Inhalt?
      const src = t.getSourceImage();
      const c = document.createElement('canvas'); c.width = 32; c.height = 32;
      const cx = c.getContext('2d');
      cx.drawImage(src, fr.cutX, fr.cutY, 32, 32, 0, 0, 32, 32);
      const d = cx.getImageData(0, 0, 32, 32).data;
      let voll = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 30) voll++;
      out[n] = { key: f.key, frame: f.frame, w: fr.width, h: fr.height, pixel: voll };
    }
    return out;
  });
  console.log('HDATLAS ' + JSON.stringify(b));
};
