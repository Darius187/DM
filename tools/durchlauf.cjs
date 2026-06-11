// Funktionstest: laeuft im Haus zur Suedtuer, prueft den E-Hinweis und den
// Gebietswechsel in den Wald. Erwartet einen laufenden Dev-Server.
const { chromium } = require('playwright');

const CHROME = process.argv[2] || '/tmp/chrome-linux64/chrome';

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('[fehler]', e.message));

  const szene = () =>
    page.evaluate(() => window.spiel.scene.getScenes(true).map((s) => s.scene.key).join(','));
  const hinweis = () =>
    page.evaluate(() => {
      const s = window.spiel.scene.getScenes(true)[0];
      return s.children.list
        .filter((k) => k.type === 'Text')
        .map((t) => t.text)
        .join(' | ');
    });

  await page.goto('http://localhost:5190/?szene=haus', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('aktive Szene:', await szene());

  await page.click('canvas');
  // Zur Suedtuer laufen (erst nach Osten auf Tuerhoehe, dann nach Sueden).
  await page.keyboard.down('d');
  await page.waitForTimeout(1200);
  await page.keyboard.up('d');
  await page.keyboard.down('s');
  await page.waitForTimeout(2200);
  await page.keyboard.up('s');
  await page.waitForTimeout(300);
  console.log('Texte an der Tuer:', await hinweis());

  await page.keyboard.down('e');
  await page.waitForTimeout(200);
  await page.keyboard.up('e');
  await page.waitForTimeout(1500);
  console.log('Szene nach E:', await szene());

  // Kurz im Wald herumlaufen (Schritte/Animation, keine Fehler).
  await page.keyboard.down('a');
  await page.waitForTimeout(1200);
  await page.keyboard.up('a');
  await page.screenshot({ path: '/tmp/durchlauf-wald.png' });
  console.log('fertig');
  await browser.close();
})();
