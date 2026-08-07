// R196 Kampf-Audit, vierter Durchgang:
//  A) Faehigkeiten mit dem echten Dev-Schalter alleZauberFrei (statt Schulstufe
//     zu setzen - die wird von gainSchoolUse wieder aus der XP gerechnet).
//  B) Zustands-Spur eines Soldaten, der einen Schuetzen jagen soll.
export default async (page) => {
  await page.evaluate(() => {
    const g = window.__game;
    if (g && !window.__welt) g.scene.start('World', { neu: true, startArea: 'stadt' });
  });
  await page.waitForFunction(() => !!window.__welt, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const bericht = await page.evaluate(() => {
    const w = window.__welt;
    const T = window.__tuning;
    const out = { tuningDa: !!T };
    let t = 400000;
    const schritte = (n) => { for (let i = 0; i < n; i++) { t += 16.6; w.update(t, 16.6); } };
    if (T) T.alleZauberFrei = true;

    // --- A) alle aktiven Faehigkeiten, jede einzeln, mit freigeschalteten Schulen
    const ids = ['wuchtschlag', 'rundumschlag', 'sturmangriff', 'blutdurst', 'kriegsschrei',
      'erschuetterung', 's1', 's2', 's3', 'heilen', 'kettenblitz', 'frostnova', 'frostball',
      'bannkreis', 'feuerregen', 'aderlass', 'lebenstausch', 'mehrfachschuss', 'hagel',
      'splitterpfeil', 'durchschlag', 'sprungpfeil', 'fesselpfeil', 'markierterTod'];
    out.faehigkeiten = {};
    for (const id of ids) {
      for (const e of w.enemies) e.hp = 0;
      w.enemies.length = 0; w.projectiles.length = 0;
      w.p.abilityCds = {}; w.p.spellCds = [0, 0, 0];
      w.p.hp = w.p.stats.maxhp; w.p.mana = w.p.stats.maxmana;
      w.zielModus = null;
      const z = w.spawnEnemy('skelett', 1, w.px + 30, w.py, false, true);
      z.hp = z.maxhp = 9000; z.passiv = true;
      w.pdir = 0;
      const hp0 = z.hp, mana0 = w.p.mana, proj0 = w.projectiles.length;
      w.runActionFromBar(id);
      const cd = (w.p.abilityCds[id] ?? 0) > 0 || w.p.spellCds.some((c) => c > 0);
      const projSofort = w.projectiles.length - proj0;
      schritte(120);
      out.faehigkeiten[id] = {
        ausgeloest: cd || projSofort > 0 || w.zielModus === id,
        schaden: Math.round(hp0 - z.hp), mana: Math.round(mana0 - w.p.mana),
        zielmodus: w.zielModus === id,
      };
      w.zielModus = null;
    }

    // --- B) Soldat jagt Schuetzen: Zustand mitschreiben
    try {
      for (const e of w.enemies) e.hp = 0;
      w.enemies.length = 0; w.projectiles.length = 0;
      const TL = 32;
      let bx = 0, by = 0, gef = false;
      for (let ty = 6; ty < w.area.h - 6 && !gef; ty += 3) {
        for (let tx = 6; tx < w.area.w - 20 && !gef; tx += 3) {
          let ok = true;
          for (let i = 0; i < 12 && ok; i++) if (w.solidFuerHeld((tx + i) * TL + 16, ty * TL + 16)) ok = false;
          if (ok) { bx = tx; by = ty; gef = true; }
        }
      }
      const s = w.spawnVerbuendeter('nahkampf', bx * TL + 16, by * TL + 16);
      s.passiv = false; s.jagdZiel = null;
      const sch = w.spawnEnemy('schuetze', 1, (bx + 8) * TL + 16, by * TL + 16, false, true);
      sch.passiv = false;
      const spur = [];
      for (let i = 0; i < 12; i++) {
        schritte(50);
        const z = w.zielFuer(s);
        spur.push({
          d: Math.round(Math.hypot(s.x - sch.x, s.y - sch.y)),
          ziel: z === 'held' ? 'held' : z ? (z === sch ? 'schuetze' : 'anderer') : 'KEINS',
          prov: Math.round((s.provokationT ?? 0) * 10) / 10,
          jagd: !!s.jagdZiel, flieht: !!s.flieht, kaempftNicht: !!s.kaempftNicht,
          speed: Math.round(s.speed ?? 0), stun: Math.round((s.stun ?? 0) * 10) / 10,
        });
      }
      out.soldatSpur = { start: Math.round(Math.hypot(s.x - sch.x, s.y - sch.y)), spur, rtsAktiv: !!w.rtsBattle };
    } catch (e) { out.soldatSpur = { fehler: String(e) }; }

    if (T) T.alleZauberFrei = false;
    return out;
  });
  console.log('AUDIT4 ' + JSON.stringify(bericht, null, 1));
};
