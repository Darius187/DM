// Macht die Abnahme-Screenshots: alle drei Gebiete, je Vorher (?mood=0)
// und Nachher, nach BILDER/. Erwartet einen laufenden Dev-Server (npm run dev).
// Aufruf: node tools/screenshots.cjs [chrome-pfad]
const { chromium } = require('playwright');

const CHROME = process.argv[2] || '/tmp/chrome-linux64/chrome';
const BASIS = 'http://localhost:5190';
const GEBIETE = ['wald', 'haus', 'gruft'];

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--hide-scrollbars'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('[konsole]', m.text());
  });
  page.on('pageerror', (e) => console.log('[fehler]', e.message));

  for (const gebiet of GEBIETE) {
    for (const mood of [0, 1]) {
      const url = `${BASIS}/?szene=${gebiet}&mood=${mood}`;
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2500); // Laden + ein paar Frames Flackern
      const name = `BILDER/${gebiet}-${mood ? 'nachher' : 'vorher'}.png`;
      await page.screenshot({ path: name });
      console.log('ok:', name);
    }
  }
  await browser.close();
})();
