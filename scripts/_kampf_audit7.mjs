// R196 Abschluss-Lauf: prueft, dass die Korrekturen nichts anderes kaputt
// gemacht haben - Held ueberlebt normale Begegnungen, Belagerung laeuft,
// Speichern/Laden geht, Kartenwechsel raeumt sauber ab.
export default async (page) => {
  await page.evaluate(() => {
    const g = window.__game;
    if (g && !window.__welt) g.scene.start('World', { neu: true, startArea: 'stadt' });
  });
  await page.waitForFunction(() => !!window.__welt, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const bericht = await page.evaluate(() => {
    const w = window.__welt;
    const out = {};
    let t = 700000;
    const schritte = (n) => { for (let i = 0; i < n; i++) { t += 16.6; w.update(t, 16.6); } };
    const leer = () => {
      for (const e of w.enemies) e.hp = 0;
      w.enemies.length = 0; w.projectiles.length = 0;
      w.p.hp = w.p.stats.maxhp; w.p.mana = w.p.stats.maxmana;
      w.p.abilityCds = {}; w.p.spellCds = [0, 0, 0]; w.zielModus = null;
    };

    // 1) Held gegen drei Skelette, OHNE zu handeln: wie schnell faellt er?
    try {
      leer();
      for (let i = 0; i < 3; i++) {
        const m = w.spawnEnemy('skelett', 1, w.px + 120 + i * 20, w.py + (i - 1) * 40, false, true);
        m.passiv = false;
      }
      const hp0 = w.p.hp;
      let taktBisTot = -1;
      for (let i = 0; i < 600 && taktBisTot < 0; i++) { schritte(1); if (w.playerDead) taktBisTot = i; }
      out.heldUeberleben = {
        sekundenBisTod: taktBisTot < 0 ? '>10 s (lebt noch)' : Math.round(taktBisTot * 16.6) / 1000,
        hpVerlust: Math.round(hp0 - w.p.hp), heldLebt: !w.playerDead,
      };
      w.p.hp = w.p.stats.maxhp; w.playerDead = false;
    } catch (e) { out.heldUeberleben = { fehler: String(e) }; }

    // 2) Belagerung: geschlossener Ring, Verteidiger drin
    try {
      leer();
      const TL = 32;
      const cx = Math.floor(w.px / TL) + 12, cy = Math.floor(w.py / TL);
      const R = 3;
      for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) {
        if (Math.abs(dx) !== R && Math.abs(dy) !== R) continue;
        w.vollendeBau('palisade', (cx + dx) * TL + 16, (cy + dy) * TL + 16, 'held');
      }
      const wand = w.feldbauten.filter((f) => f.id === 'palisade');
      const vert = w.spawnVerbuendeter('nahkampf', cx * TL + 16, cy * TL + 16);
      if (vert) { vert.passiv = false; vert.jagdZiel = null; }
      const vHp0 = vert ? vert.hp : 0;
      const hp0 = wand.map((f) => f.hp);
      for (let i = 0; i < 4; i++) {
        const m = w.spawnEnemy('skelett', 1, (cx + R + 3) * TL + 16, (cy + i - 2) * TL + 16, false, true);
        m.passiv = false;
      }
      schritte(1500);
      const angenagt = wand.filter((f, i) => f.hp < hp0[i]);
      out.belagerung = {
        palisaden: wand.length, angenagt: angenagt.length,
        schadenGesamt: Math.round(hp0.reduce((a, h, i) => a + (h - wand[i].hp), 0)),
        breschen: wand.filter((f) => f.hp <= 0).length,
        verteidigerSchaden: vert ? Math.round(vHp0 - vert.hp) : 'keiner',
      };
    } catch (e) { out.belagerung = { fehler: String(e) }; }

    // 3) Speichern/Laden
    try {
      w.p.gold = 4242;
      const vorher = { gold: w.p.gold, karte: w.area.id };
      w.speichern?.(1);
      const roh = localStorage.getItem('ravensmoor_save_1') ?? localStorage.getItem('ravensmoor_slot1');
      out.speichern = { geschrieben: !!roh, groesse: roh ? roh.length : 0, vorher };
    } catch (e) { out.speichern = { fehler: String(e) }; }

    return out;
  });
  console.log('AUDIT7 ' + JSON.stringify(bericht, null, 1));

  // 4) Kartenwechsel: bleiben Masken/Objekte liegen?
  const nachWechsel = await page.evaluate(async () => {
    const w = window.__welt;
    const vorher = w.children.list.length;
    w.goArea('wald_n');
    await new Promise((r) => setTimeout(r, 1200));
    const w2 = window.__welt;
    return { objekteVorher: vorher, objekteNachher: w2.children.list.length, karte: w2.area?.id };
  }).catch((e) => ({ fehler: String(e) }));
  console.log('WECHSEL ' + JSON.stringify(nachWechsel));
};
