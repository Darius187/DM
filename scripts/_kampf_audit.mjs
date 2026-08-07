// R196 Kampf-Audit: fuehrt Kampfszenarien DETERMINISTISCH aus
// (w.update(t, 16.6) statt Wanduhr - die Kopflos-Umgebung laeuft nur mit ~3-9 FPS)
// und gibt Messwerte als JSON aus. Kein Screenshot noetig.
export default async (page) => {
  await page.evaluate(() => {
    const g = window.__game;
    if (g && !window.__welt) g.scene.start('World', { neu: true, startArea: 'stadt' });
  });
  await page.waitForFunction(() => !!window.__welt, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const bericht = await page.evaluate(() => {
    const w = window.__welt;
    if (!w) return { fehler: 'kein __welt' };
    const out = {};
    let t = 100000;
    const schritte = (n) => { for (let i = 0; i < n; i++) { t += 16.6; w.update(t, 16.6); } };
    const leeren = () => {
      for (const e of w.enemies) e.hp = 0;
      w.enemies.length = 0; w.projectiles.length = 0;
      w.p.hp = w.p.stats.maxhp; w.p.mana = w.p.stats.maxmana;
      w.p.abilityCds = {}; w.p.spellCds = [0, 0, 0];
    };

    // --- 1) HELD schlaegt zu: kommt Schaden an?
    try {
      leeren();
      const m = w.spawnEnemy('skelett', 1, w.px + 34, w.py, false, true);
      m.passiv = false;
      const mHp0 = m.hp, hHp0 = w.p.hp;
      for (let i = 0; i < 40; i++) { w.runActionFromBar('angriff'); schritte(12); }
      out.heldSchlaegtZu = {
        monsterSchaden: Math.round(mHp0 - m.hp), monsterTot: m.hp <= 0,
        heldSchaden: Math.round(hHp0 - w.p.hp),
      };
    } catch (e) { out.heldSchlaegtZu = { fehler: String(e) }; }

    // --- 2) SOLDAT UNTER BESCHUSS: schlaegt er zurueck? (Autorbug R195)
    try {
      leeren();
      const s = w.spawnVerbuendeter('nahkampf', w.px + 40, w.py);
      if (!s) throw new Error('kein Verbuendeter');
      s.passiv = false;
      const sch = w.spawnEnemy('schuetze', 1, w.px + 280, w.py, false, true);
      sch.passiv = false;
      const sx0 = s.x, sy0 = s.y, d0 = Math.hypot(sx0 - sch.x, sy0 - sch.y);
      schritte(480);
      out.soldatUnterBeschuss = {
        soldatGetroffen: s.hp < s.maxhp,
        merktAngreifer: !!s.letzterAngreifer,
        istLosgelaufen: Math.round(Math.hypot(s.x - sx0, s.y - sy0)) > 8,
        abstandVorher: Math.round(d0), abstandJetzt: Math.round(Math.hypot(s.x - sch.x, s.y - sch.y)),
        schuetzeGetroffen: sch.hp < sch.maxhp,
      };
    } catch (e) { out.soldatUnterBeschuss = { fehler: String(e) }; }

    // --- 3) TURMSCHUETZE (Autorbug R195)
    try {
      leeren();
      const b = w.spawnVerbuendeter('bogen', w.px + 40, w.py);
      if (!b) throw new Error('kein Bogenschuetze');
      b.passiv = false; b.imTurm = true; b.turmReichF = 1.9;
      b.festPos = { x: b.x, y: b.y - 40 };
      const ziel = w.spawnEnemy('skelett', 1, w.px + 430, w.py, false, true);
      ziel.passiv = false;
      let geschosse = 0;
      for (let i = 0; i < 300; i++) {
        const vor = w.projectiles.length;
        schritte(1);
        if (w.projectiles.length > vor) geschosse += w.projectiles.length - vor;
      }
      out.turmschuetze = {
        zielGefunden: !!w.zielFuer(b), geschosse,
        zielGetroffen: ziel.hp < ziel.maxhp, stehtOben: !!b.festPos,
      };
    } catch (e) { out.turmschuetze = { fehler: String(e) }; }

    // --- 4) FAEHIGKEITEN: wirken sie, und richten sie Schaden an?
    try {
      leeren();
      const ids = ['angriff', 'wuchtschlag', 'rundumschlag', 'sturmangriff', 'blutdurst',
        'kriegsschrei', 'erschuetterung', 'hinrichtung', 's1', 's2', 's3', 'heilen',
        'kettenblitz', 'frostnova', 'frostball', 'bannkreis', 'feuerregen', 'aderlass', 'lebenstausch'];
      const fehler = [], ohneWirkung = [];
      for (const id of ids) {
        try {
          leeren();
          const z = w.spawnEnemy('skelett', 1, w.px + 40, w.py, false, true);
          z.passiv = false; z.hp = z.maxhp = 999;
          const hp0 = z.hp, mana0 = w.p.mana;
          w.runActionFromBar(id);
          schritte(90);
          const heil = ['s3', 'heilen', 'lebenstausch', 'aderlass', 'kriegsschrei', 'bannkreis'].includes(id);
          if (!heil && z.hp >= hp0 && w.p.mana >= mana0) ohneWirkung.push(id);
        } catch (e) { fehler.push(`${id}: ${String(e).slice(0, 90)}`); }
      }
      out.faehigkeiten = { geprueft: ids.length, fehler, ohneWirkung };
    } catch (e) { out.faehigkeiten = { fehler: String(e) }; }

    // --- 5) BELAGERUNG: Palisade als echtes Hindernis
    try {
      leeren();
      const T = 32;
      const tx = Math.floor(w.px / T) + 5;
      const ty0 = Math.floor(w.py / T) - 4;
      for (let i = 0; i < 9; i++) w.vollendeBau('palisade', tx * T + 16, (ty0 + i) * T + 16, 'held');
      const wand = w.feldbauten.filter((f) => f.id === 'palisade');
      // Verteidiger HINTER der Wand (links), Angreifer davor (rechts)
      const vert = w.spawnVerbuendeter('nahkampf', (tx - 2) * T + 16, w.py);
      if (vert) vert.passiv = false;
      const angreifer = [];
      for (let i = 0; i < 4; i++) {
        const m = w.spawnEnemy('skelett', 1, (tx + 2) * T + 16, w.py + (i - 2) * 26, false, true);
        m.passiv = false; angreifer.push(m);
      }
      const hp0 = wand.map((f) => f.hp);
      const vertHp0 = vert ? vert.hp : 0;
      schritte(900);   // ~15 s
      const hp1 = wand.map((f) => f.hp);
      const geschaedigt = hp1.filter((h, i) => h < hp0[i]).length;
      const durch = angreifer.filter((m) => m.hp > 0 && m.x < tx * T).length;
      out.belagerung = {
        palisadenGesetzt: wand.length,
        palisadenAngenagt: geschaedigt,
        breschen: wand.filter((f) => f.hp <= 0).length,
        verteidigerSchadenHinterWand: vert ? Math.round(vertHp0 - vert.hp) : 'kein Verteidiger',
        angreiferDurch: durch,
        angreiferLeben: angreifer.filter((m) => m.hp > 0).length,
      };
    } catch (e) { out.belagerung = { fehler: String(e) }; }

    out.zustand = {
      karte: w.area?.id, gegner: w.enemies.length, geschosse: w.projectiles.length,
      heldLebt: !w.playerDead, fps: Math.round(window.__game.loop.actualFps),
    };
    return out;
  });
  console.log('KAMPF-AUDIT ' + JSON.stringify(bericht, null, 1));
};
