// Optionaler Browser-Smoke-Test fuer die Abnahme (kein Teil des Builds).
// Voraussetzung: `npm i -D playwright` und ein Chromium-Binary.
// Aufruf: `node scripts/smoke.mjs` (baut vorher `npm run build`).
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";

const CHROME =
  process.env.CHROME_PATH ||
  `${process.env.HOME}/.cache/ms-playwright/chromium-1223/chrome-linux/chrome`;
const PORT = 4173;
const log = (...a) => console.log(...a);

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--host"], {
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", () => {});
await wait(3000);
log("step: preview gestartet");

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
log("step: browser gestartet");

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));

// --- WebGL2-Fallback-Pfad (zuverlaessig headless) ---
await page.goto(`http://localhost:${PORT}/?webgl`, { waitUntil: "load", timeout: 20000 });
log("step: geladen (?webgl)");
await wait(2500);

const rendererTag = await page.locator("#renderer-tag").textContent().catch(() => "n/a");
log("RENDERER_TAG:", rendererTag);

await page.screenshot({ path: "docs/shot-1-start.png" });
log("step: shot-1 gespeichert");

// Aktionen: zielen, leichte Kombo, Rolle.
await page.mouse.move(820, 300);
for (let i = 0; i < 3; i++) {
  await page.mouse.click(720, 320);
  await wait(170);
}
await page.keyboard.press("Space");
await wait(150);
await page.screenshot({ path: "docs/shot-2-kampf.png" });
log("step: shot-2 gespeichert");

// Neue Welle + Block halten.
await page.keyboard.press("KeyG");
await wait(100);
await page.mouse.down({ button: "right" });
await wait(450);
await page.screenshot({ path: "docs/shot-3-block.png" });
await page.mouse.up({ button: "right" });
log("step: shot-3 gespeichert");

const fps = await page
  .locator("#debug .row")
  .first()
  .locator("span")
  .last()
  .textContent()
  .catch(() => "n/a");
log("FPS_READ:", fps);

const errors = logs.filter((l) => l.includes("[pageerror]") || l.startsWith("[error]"));
log("CONSOLE_ERRORS:", errors.length);
for (const e of errors.slice(0, 20)) log("  ", e);
log("TOTAL_LOGS:", logs.length);

await browser.close();
server.kill("SIGTERM");
log("DONE");
