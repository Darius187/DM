// R196 Kampf-Audit, dritter Durchgang: unterscheidet "Faehigkeit hat gar nicht
// ausgeloest" von "ausgeloest, aber ohne Wirkung" - und prueft die Wegfindung
// der eigenen Truppe auf FREIEM Feld (ohne Haeuser dazwischen).
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
    let t = 300000;
    const schritte = (n) => { for (let i = 0; i < n; i++) { t += 16.6; w.update(t, 16.6); } };
    w.p.level = 30;
    for (const k of Object.keys(w.p.schools ?? {})) w.p.schools[k].level = 30;

    // --- A) Nahkampf-Faehigkeiten: hat sie ueberhaupt ausgeloest?
    const nah = ['wuchtschlag', 'rundumschlag', 'sturmangriff', 'blutdurst',
      'kriegsschrei', 'erschuetterung', 'hinrichtung'];
    out.nahkampf = {};
    for (const id of nah) {
      for (const e of w.enemies) e.hp = 0;
      w.enemies.length = 0;
      w.p.abilityCds = {}; w.p.hp = w.p.stats.maxhp; w.p.mana = w.p.stats.maxmana;
      w.zielModus = null;
      const z = w.spawnEnemy('skelett', 1, w.px + 30, w.py, false, true);
      z.hp = z.maxhp = 5000; z.passiv = true;   // passiv: schlaegt nicht zurueck
      w.pdir = 0;
      const hp0 = z.hp;
      w.runActionFromBar(id);
      const cdGesetzt = (w.p.abilityCds[id] ?? 0) > 0;
      schritte(120);
      out.nahkampf[id] = { ausgeloest: cdGesetzt, schaden: Math.round(hp0 - z.hp) };
    }
    // Direktaufruf zum Vergleich: liegt es an runAction oder an der Faehigkeit?
    out.direkt = {};
    for (const id of nah) {
      for (const e of w.enemies) e.hp = 0;
      w.enemies.length = 0;
      w.p.abilityCds = {};
      const z = w.spawnEnemy('skelett', 1, w.px + 30, w.py, false, true);
      z.hp = z.maxhp = 5000; z.passiv = true;
      w.pdir = 0;
      const hp0 = z.hp;
      try { w.useAbility(id, true); } catch (e) { out.direkt[id] = 'AUSNAHME ' + String(e).slice(0, 60); continue; }
      schritte(120);
      out.direkt[id] = { ausgeloest: (w.p.abilityCds[id] ?? 0) > 0, schaden: Math.round(hp0 - z.hp) };
    }

    // --- B) Eigene Truppe auf FREIEM Feld: kommt sie beim Schuetzen an?
    try {
      for (const e of w.enemies) e.hp = 0;
      w.enemies.length = 0; w.projectiles.length = 0;
      // freies Feld suchen: 12 Kacheln in +x muessen begehbar sein
      const T = 32;
      let bx = 0, by = 0, gefunden = false;
      for (let ty = 6; ty < w.area.h - 6 && !gefunden; ty += 3) {
        for (let tx = 6; tx < w.area.w - 20 && !gefunden; tx += 3) {
          let ok = true;
          for (let i = 0; i < 12 && ok; i++) if (w.solidFuerHeld((tx + i) * T + 16, ty * T + 16)) ok = false;
          if (ok) { bx = tx; by = ty; gefunden = true; }
        }
      }
      const s = w.spawnVerbuendeter('nahkampf', bx * T + 16, by * T + 16);
      s.passiv = false; s.jagdZiel = null;
      const sch = w.spawnEnemy('schuetze', 1, (bx + 8) * T + 16, by * T + 16, false, true);
      sch.passiv = false;
      const d0 = Math.hypot(s.x - sch.x, s.y - sch.y);
      const spur = [];
      for (let i = 0; i < 40; i++) { schritte(15); spur.push(Math.round(Math.hypot(s.x - sch.x, s.y - sch.y))); }
      out.truppeFreiesFeld = {
        freiesFeldGefunden: gefunden, abstandStart: Math.round(d0),
        abstandVerlauf: spur.filter((_, i) => i % 4 === 0),
        schuetzeHp: Math.round(sch.hp), schuetzeMax: Math.round(sch.maxhp),
        soldatLebt: s.hp > 0,
      };
    } catch (e) { out.truppeFreiesFeld = { fehler: String(e) }; }

    return out;
  });
  console.log('AUDIT3 ' + JSON.stringify(bericht, null, 1));
};
