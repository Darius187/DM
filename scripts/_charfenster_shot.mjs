// Charakterfenster oeffnen und ansehen (R196-Korrektur nach Autor-Screenshot).
export default async (page) => {
  await page.evaluate(() => {
    const g = window.__game;
    if (g && !window.__welt) g.scene.start('World', { neu: true, startArea: 'stadt' });
  });
  await page.waitForFunction(() => !!window.__welt, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    const w = window.__welt;
    if (w?.panels?.openTab) w.panels.openTab('held');
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.__game.loop.sleep());
  await page.waitForTimeout(400);
};
