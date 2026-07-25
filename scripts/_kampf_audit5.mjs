// R196 Kampf-Audit, Nachweis-Lauf: pruefen, ob die Korrekturen greifen.
//  A) Soldat holt den kiteenden Schuetzen jetzt ein und toetet ihn.
//  B) rundumschlag/sturmangriff/angriff ueber die Leiste (waren tot).
//  C) aderlass/lebenstausch/markierterTod sauber nachgestellt.
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
    const out = {};
    let t = 500000;
    const schritte = (n) => { for (let i = 0; i < n; i++) { t += 16.6; w.update(t, 16.6); } };
    const leer = () => {
      for (const e of w.enemies) e.hp = 0;
      w.enemies.length = 0; w.projectiles.length = 0;
      w.p.abilityCds = {}; w.p.spellCds = [0, 0, 0]; w.zielModus = null;
    };
    if (T) T.alleZauberFrei = true;

    // --- A) Verfolgung
    try {
      leer();
      const TL = 32;
      let bx = 0, by = 0, gef = false;
      for (let ty = 6; ty < w.area.h - 6 && !gef; ty += 3) {
        for (let tx = 6; tx < w.area.w - 24 && !gef; tx += 3) {
          let ok = true;
          for (let i = 0; i < 16 && ok; i++) if (w.solidFuerHeld((tx + i) * TL + 16, ty * TL + 16)) ok = false;
          if (ok) { bx = tx; by = ty; gef = true; }
        }
      }
      const s = w.spawnVerbuendeter('nahkampf', bx * TL + 16, by * TL + 16);
      s.passiv = false; s.jagdZiel = null;
      const sch = w.spawnEnemy('schuetze', 1, (bx + 8) * TL + 16, by * TL + 16, false, true);
      sch.passiv = false;
      const hp0 = sch.hp;
      const spur = [];
      for (let i = 0; i < 12; i++) { schritte(50); spur.push(Math.round(Math.hypot(s.x - sch.x, s.y - sch.y))); }
      out.verfolgung = {
        abstandVerlauf: spur, schuetzeSchaden: Math.round(hp0 - sch.hp),
        schuetzeTot: sch.hp <= 0, soldatLebt: s.hp > 0,
      };
    } catch (e) { out.verfolgung = { fehler: String(e) }; }

    // --- B) frueher tote Leisten-Aktionen
    try {
      out.leistenAktionen = {};
      for (const id of ['angriff', 'rundumschlag', 'sturmangriff']) {
        leer();
        w.p.hp = w.p.stats.maxhp;
        const z = w.spawnEnemy('skelett', 1, w.px + 30, w.py, false, true);
        z.hp = z.maxhp = 9000; z.passiv = true;
        w.pdir = 0;
        const hp0 = z.hp;
        w.runActionFromBar(id);
        schritte(120);
        out.leistenAktionen[id] = { schaden: Math.round(hp0 - z.hp) };
      }
    } catch (e) { out.leistenAktionen = { fehler: String(e) }; }

    // --- C) Sonderfaelle
    try {
      out.sonder = {};
      // aderlass: Leben -> Mana, also mit LEEREM Mana testen
      leer(); w.p.hp = w.p.stats.maxhp; w.p.mana = 0;
      const m0 = w.p.mana, h0 = w.p.hp;
      w.runActionFromBar('aderlass'); schritte(30);
      out.sonder.aderlass = { manaPlus: Math.round(w.p.mana - m0), hpMinus: Math.round(h0 - w.p.hp) };
      // lebenstausch: Mana -> Leben, also mit WENIG Leben testen
      leer(); w.p.hp = 10; w.p.mana = w.p.stats.maxmana;
      const h1 = w.p.hp, m1 = w.p.mana;
      w.runActionFromBar('lebenstausch'); schritte(30);
      out.sonder.lebenstausch = { hpPlus: Math.round(w.p.hp - h1), manaMinus: Math.round(m1 - w.p.mana) };
      // markierterTod: markiert das Ziel (markedT), Bogen noetig?
      leer();
      const z2 = w.spawnEnemy('skelett', 1, w.px + 60, w.py, false, true);
      z2.hp = z2.maxhp = 9000; z2.passiv = true;
      w.pdir = 0;
      w.runActionFromBar('markierterTod'); schritte(20);
      out.sonder.markierterTod = { markiert: (z2.markedT ?? 0) > 0, waffe: w.weaponClass() };
    } catch (e) { out.sonder = { fehler: String(e) }; }

    if (T) T.alleZauberFrei = false;
    return out;
  });
  console.log('AUDIT5 ' + JSON.stringify(bericht, null, 1));
};
