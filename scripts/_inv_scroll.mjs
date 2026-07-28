// R202/R203-Pruefung: (a) funktioniert das Inventar-Scrollen (Maus-Rad) mit der
// Charakter-Schale? (b) zeigt das HUD laufende Abklingzeiten (Schwung + Zahl)?
// Beide TODO-Zeilen behaupten "fehlt" - der Code sagt "gebaut". Der Browser
// entscheidet.
export default async (page) => {
  // Die Stadt baut headless lange (3D-Gebaeude) - grosszuegig warten.
  for (let versuch = 0; versuch < 20; versuch++) {
    await page.evaluate(() => {
      const g = window.__game;
      if (g && !window.__welt) g.scene.start('World', { neu: true, startArea: 'stadt' });
    }).catch(() => {});
    if (await page.evaluate(() => !!window.__welt).catch(() => false)) break;
    await page.waitForTimeout(4000);
  }
  await page.waitForTimeout(3000);
  const bericht = await page.evaluate(() => {
    const w = window.__welt;
    if (!w) return { fehler: 'Welt startete nicht' };
    // 30 Handaexte in den Rucksack
    for (let i = 0; i < 30; i++) {
      w.p.inv.push({ id: 'probe' + i, kind: 'weapon', weaponClass: 'axt', name: 'Probeaxt ' + i, val: 3, rarity: 0, boni: [] });
    }
    w.panels.openTab('held');
    const vorher = w.panels.scroll ?? -1;
    // Drei Rad-Schritte nach unten
    for (let i = 0; i < 3; i++) w.input.emit('wheel', { x: 0, y: 0 }, [], 0, 120, 0);
    const nachher = w.panels.scroll ?? -1;
    // und wieder hoch (Rueckweg, Regel 9)
    for (let i = 0; i < 5; i++) w.input.emit('wheel', { x: 0, y: 0 }, [], 0, -120, 0);
    const zurueck = w.panels.scroll ?? -1;
    w.panels.closeAll();

    // (b) Abklingzeiten im HUD: die Standard-Belegung hat nur R/T belegt
    // (waffe1/waffe2 -> rundumschlag/sturmangriff) - genau deren Cds setzen,
    // einen HUD-Takt laufen lassen, dann nachsehen was die Slot-Texte zeigen.
    w.p.abilityCds = w.p.abilityCds ?? {};
    w.p.abilityCds['rundumschlag'] = 6.5;
    w.p.abilityCds['sturmangriff'] = 3.2;
    let t = 500000;
    for (let i = 0; i < 5; i++) { t += 16.6; w.update(t, 16.6); }
    const hud = w.hud;
    const slotAnzeigen = (hud?.slots ?? []).map((s, i) => ({
      i,
      cdSek: Math.round((s.cdSek?.() ?? 0) * 10) / 10,
      cdFrac: Math.round((s.cdFrac?.() ?? 0) * 100) / 100,
      text: hud.slotTexts?.[i]?.text ?? '?',
    })).filter((s) => s.cdSek > 0);
    return { vorher, nachher, zurueck, offen: w.panels.blocked, slotAnzeigen };
  });
  console.log('INVSCROLL ' + JSON.stringify(bericht));
};
