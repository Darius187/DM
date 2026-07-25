// R196 Kampf-Audit, zweiter Durchgang: die drei auffaelligen Punkte aus Lauf 1
// sauber nachstellen (Blickrichtung setzen, Zauber freischalten, GESCHLOSSENE
// Palisade statt freistehender Wand).
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
    let t = 200000;
    const schritte = (n) => { for (let i = 0; i < n; i++) { t += 16.6; w.update(t, 16.6); } };
    const leeren = () => {
      for (const e of w.enemies) e.hp = 0;
      w.enemies.length = 0; w.projectiles.length = 0;
      w.p.hp = w.p.stats.maxhp; w.p.mana = w.p.stats.maxmana;
      w.p.abilityCds = {}; w.p.spellCds = [0, 0, 0];
    };

    // --- A) HELD: Blickrichtung ZUM Ziel setzen, dann schlagen
    try {
      leeren();
      const m = w.spawnEnemy('skelett', 1, w.px + 30, w.py, false, true);
      m.passiv = false; m.hp = m.maxhp = 500;
      const hp0 = m.hp;
      for (let i = 0; i < 30; i++) {
        w.pdir = Math.atan2(m.y - w.py, m.x - w.px);   // Zielrichtung wie bei Mausklick
        w.runActionFromBar('angriff');
        schritte(20);
      }
      out.heldMitBlickrichtung = { monsterSchaden: Math.round(hp0 - m.hp), pdir: Math.round(w.pdir * 100) / 100 };
    } catch (e) { out.heldMitBlickrichtung = { fehler: String(e) }; }

    // --- B) FAEHIGKEITEN mit freigeschalteten Zaubern (Stufensperre war der Grund)
    try {
      const tun = window.__tuning || null;
      out.faehigkeitenHinweis = 'alleZauberFrei ueber Dev-Schalter';
      w.p.level = 30;
      for (const k of Object.keys(w.p.schools ?? {})) w.p.schools[k].level = 30;
      const ids = ['angriff', 'wuchtschlag', 'rundumschlag', 'sturmangriff', 'blutdurst',
        'kriegsschrei', 'erschuetterung', 'hinrichtung', 's1', 's2', 's3', 'heilen',
        'kettenblitz', 'frostnova', 'frostball', 'bannkreis', 'feuerregen', 'aderlass', 'lebenstausch'];
      const ergebnis = {};
      for (const id of ids) {
        leeren();
        const z = w.spawnEnemy('skelett', 1, w.px + 34, w.py, false, true);
        z.passiv = false; z.hp = z.maxhp = 4000;
        w.pdir = 0;
        const hp0 = z.hp, mana0 = w.p.mana, heldHp0 = w.p.hp;
        try { w.runActionFromBar(id); } catch (e) { ergebnis[id] = 'AUSNAHME ' + String(e).slice(0, 70); continue; }
        schritte(150);
        ergebnis[id] = {
          schaden: Math.round(hp0 - z.hp),
          mana: Math.round(mana0 - w.p.mana),
          heldHp: Math.round(w.p.hp - heldHp0),
        };
      }
      out.faehigkeiten = ergebnis;
      void tun;
    } catch (e) { out.faehigkeiten = { fehler: String(e) }; }

    // --- C) BELAGERUNG mit GESCHLOSSENEM Ring (kein Aussenherum moeglich)
    try {
      leeren();
      const T = 32;
      const cx = Math.floor(w.px / T) + 12, cy = Math.floor(w.py / T);
      const R = 3;   // Ring 7x7 Kacheln
      for (let dx = -R; dx <= R; dx++) {
        for (let dy = -R; dy <= R; dy++) {
          if (Math.abs(dx) !== R && Math.abs(dy) !== R) continue;
          w.vollendeBau('palisade', (cx + dx) * T + 16, (cy + dy) * T + 16, 'held');
        }
      }
      const wand = w.feldbauten.filter((f) => f.id === 'palisade');
      const vert = w.spawnVerbuendeter('nahkampf', cx * T + 16, cy * T + 16);
      if (vert) { vert.passiv = false; vert.jagdZiel = null; }
      const angreifer = [];
      for (let i = 0; i < 4; i++) {
        const m = w.spawnEnemy('skelett', 1, (cx + R + 3) * T + 16, (cy + i - 2) * T + 16, false, true);
        m.passiv = false; angreifer.push(m);
      }
      const hp0 = wand.map((f) => f.hp);
      const vHp0 = vert ? vert.hp : 0;
      schritte(1200);   // ~20 s
      const angenagt = wand.filter((f, i) => f.hp < hp0[i]);
      out.belagerungRing = {
        palisaden: wand.length,
        angenagt: angenagt.length,
        groessterSchaden: angenagt.length ? Math.round(Math.max(...angenagt.map((f, i) => hp0[wand.indexOf(f)] - f.hp))) : 0,
        breschen: wand.filter((f) => f.hp <= 0).length,
        verteidigerSchaden: vert ? Math.round(vHp0 - vert.hp) : 'kein Verteidiger',
        angreiferAbstandZumRing: angreifer.map((m) => Math.round(Math.hypot(m.x - cx * T, m.y - cy * T) / T)),
      };
    } catch (e) { out.belagerungRing = { fehler: String(e) }; }

    // --- D) SOLDAT gegen SCHUETZE: wer bewegt sich wohin?
    try {
      leeren();
      const s = w.spawnVerbuendeter('nahkampf', w.px + 40, w.py);
      s.passiv = false; s.jagdZiel = null;
      const sch = w.spawnEnemy('schuetze', 1, w.px + 280, w.py, false, true);
      sch.passiv = false;
      const s0 = { x: s.x, y: s.y }, a0 = { x: sch.x, y: sch.y };
      schritte(600);
      out.soldatJagd = {
        soldatGelaufen: Math.round(Math.hypot(s.x - s0.x, s.y - s0.y)),
        schuetzeGelaufen: Math.round(Math.hypot(sch.x - a0.x, sch.y - a0.y)),
        abstandVorher: Math.round(Math.hypot(s0.x - a0.x, s0.y - a0.y)),
        abstandJetzt: Math.round(Math.hypot(s.x - sch.x, s.y - sch.y)),
        soldatLebt: s.hp > 0, schuetzeHp: Math.round(sch.hp),
      };
    } catch (e) { out.soldatJagd = { fehler: String(e) }; }

    return out;
  });
  console.log('AUDIT2 ' + JSON.stringify(bericht, null, 1));
};
