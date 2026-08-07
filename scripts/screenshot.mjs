// Screenshot-Werkzeug für die Browser-Verifikation (CLAUDE.md Regel 1).
// Nutzung: node scripts/screenshot.mjs <url> <ausgabe.png> [wartezeitMs] [aktionenDatei]
// Die Aktionen-Datei ist ein .mjs-Modul mit `export default async (page) => {...}`.

import { chromium as pwChromium } from 'playwright-core';
import sparticuz from '@sparticuz/chromium';
import { pathToFileURL } from 'node:url';

const [, , url, out, waitMs = '2500', actionsFile] = process.argv;
if (!url || !out) {
  console.error('Aufruf: node scripts/screenshot.mjs <url> <ausgabe.png> [wartezeitMs] [aktionenDatei]');
  process.exit(1);
}

const execPath = await sparticuz.executablePath();
const browser = await pwChromium.launch({
  executablePath: execPath,
  args: sparticuz.args,
});
// TOUCH=1 emuliert ein Touch-Gerät (für die Prüfung der Touch-Steuerung)
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  hasTouch: process.env.TOUCH === '1',
});
const logs = [];
page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => logs.push(`[goto] ${e.message}`));
await page.waitForTimeout(parseInt(waitMs, 10));
if (actionsFile) {
  const mod = await import(pathToFileURL(actionsFile).href);
  await mod.default(page);
}
await page.screenshot({ path: out });
await browser.close();
// Fehlende Hot-Swap-Dateien sind erwartet - keine echten Fehler
const expected = (l) => l.includes('Failed to process file') || l.includes('Failed to load resource') || l.includes('404');
const errors = logs.filter((l) => (l.startsWith('[pageerror]') || l.startsWith('[error]')) && !expected(l));
console.log(logs.filter((l) => !expected(l) && !l.includes('Fallback aktiv für')).slice(0, 40).join('\n'));
console.log(`\nScreenshot: ${out} | Fehler: ${errors.length}`);
process.exit(errors.length ? 2 : 0);
