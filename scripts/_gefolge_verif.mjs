// Verifikation: eigene Einheiten NAHE dem Helden folgen ueber die Kante auf die
// Nachbarkarte (Gefolge). Ohne Naehe bleiben sie als Garnison zurueck.
export default async (page) => {
  await page.evaluate(() => {
    const g = window.__game;
    if (g && !window.__welt) g.scene.start('World', { neu: true, startArea: 'stadt' });
  });
  await page.waitForFunction(() => !!window.__welt, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const res = await page.evaluate(() => {
    const w = window.__welt;
    if (!w) return { fehler: 'kein __welt' };
    const von = w.area.id;
    const nachbarn = w.kartenNachbarn(von);
    if (!nachbarn.length) return { fehler: 'keine Nachbarkarte von ' + von };
    const nach = nachbarn[0];

    // Zwei Roster-Einheiten auf DIESER Karte anlegen.
    const mkEinheit = (id) => ({ id, name: 'Test' + id, typ: 'nahkampf', rang: 0, kills: 0,
      hp: 30, maxhp: 30, ort: von, pos: undefined });
    const nahId = 9001, fernId = 9002;
    w.armee.einheiten.push(mkEinheit(nahId), mkEinheit(fernId));

    // Passende Feld-Sprites: einer NAH beim Helden, einer WEIT weg.
    const mkFeld = (id, dx, dy) => ({ team: 'spieler', armeeId: id, hp: 30,
      x: w.px + dx, y: w.py + dy, sprite: { destroy() {} } });
    w.enemies.push(mkFeld(nahId, 40, 0), mkFeld(fernId, 2000, 2000));

    // Ueber die Kante wechseln, Gefolge mitnehmen.
    w.goArea(nach, undefined, true);

    const nahE = w.armee.einheiten.find((e) => e.id === nahId);
    const fernE = w.armee.einheiten.find((e) => e.id === fernId);
    return {
      von, nach,
      nahOrt: nahE ? nahE.ort : 'weg',
      fernOrt: fernE ? fernE.ort : 'weg',
      nahImFeld: w.enemies.some((e) => e.armeeId === nahId),
      nahImFeldHp: (w.enemies.find((e) => e.armeeId === nahId) || {}).hp,
      spielerImFeld: w.enemies.filter((e) => e.team === 'spieler').length,
      areaJetzt: w.area.id,
    };
  });
  console.log('GEFOLGE ' + JSON.stringify(res));
};
