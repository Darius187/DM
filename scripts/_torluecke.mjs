// R197 (Autorbug): "Monster bleibt vor dem Tor stehen und hackt darauf, obwohl
// nebendran die Palisade offen steht - keiner geht da durch."
// Aufbau: geschlossener Palisadenring MIT einer Luecke, Verteidiger drin,
// Angreifer draussen. Erwartet: die Angreifer nehmen die Luecke.
export default async (page) => {
  // Szenenstart notfalls mehrfach anstossen - in dieser Umgebung braucht der
  // Boot manchmal laenger, und ohne __welt laeuft die Messung ins Leere.
  for (let versuch = 0; versuch < 6; versuch++) {
    await page.evaluate(() => {
      const g = window.__game;
      if (g && !window.__welt) g.scene.start('World', { neu: true, startArea: 'stadt' });
    }).catch(() => {});
    const da = await page.evaluate(() => !!window.__welt).catch(() => false);
    if (da) break;
    await page.waitForTimeout(2500);
  }
  await page.waitForTimeout(3000);
  const bereit = await page.evaluate(() => !!window.__welt).catch(() => false);
  if (!bereit) { console.log('TORLUECKE {"fehler":"Welt startete nicht"}'); return; }

  const bericht = await page.evaluate(() => {
    const w = window.__welt;
    const out = {};
    let t = 900000;
    const schritte = (n) => { for (let i = 0; i < n; i++) { t += 16.6; w.update(t, 16.6); } };
    for (const e of w.enemies) e.hp = 0;
    w.enemies.length = 0; w.projectiles.length = 0;
    // Messkulisse: ALLE Fenster zu. vollendeBau ruft panels.refresh() - blieb ein
    // Fenster offen, meldet uiBlocked() true und die WELT STEHT (dann misst man
    // nur noch Standbilder). Genau das ist mir hier passiert.
    w.panels?.closeAll?.();
    w.dialog?.close?.();
    w.pauseMenu = null; w.baukastenPanel = null; w.deathOverlay = null;

    const T = 32;
    const cx = Math.floor(w.px / T) + 12, cy = Math.floor(w.py / T);
    const R = 3;
    // Ring MIT LUECKE: die beiden Kacheln bei (cx+R, cy+1) und (cx+R, cy+2)
    // bleiben offen - eine klar begehbare Gasse auf der Angreiferseite.
    const luecke = [[R, 1], [R, 2]];
    for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) {
      if (Math.abs(dx) !== R && Math.abs(dy) !== R) continue;
      if (luecke.some(([lx, ly]) => lx === dx && ly === dy)) continue;
      w.vollendeBau('palisade', (cx + dx) * T + 16, (cy + dy) * T + 16, 'held');
    }
    // Autor-Fall: GESCHLOSSENES TOR auf der Angreiferseite, direkt neben der
    // offenen Gasse. Das Tor ist solide - die Gasse ist es nicht.
    w.vollendeBau('tor', (cx + R) * T + 16, (cy - 1) * T + 16, 'held');
    w.panels?.closeAll?.();
    const wand = w.feldbauten.filter((f) => f.id === 'palisade');
    const hp0 = wand.map((f) => f.hp);
    const vert = w.spawnVerbuendeter('nahkampf', cx * T + 16, cy * T + 16);
    if (vert) { vert.passiv = false; vert.jagdZiel = null; }
    const ang = [];
    for (let i = 0; i < 4; i++) {
      const m = w.spawnEnemy('skelett', 1, (cx + R + 3) * T + 16, (cy + i - 1) * T + 16, false, true);
      m.passiv = false; ang.push(m);
    }
    const innen = (m) => Math.abs(m.x / T - cx) < R && Math.abs(m.y / T - cy) < R;
    const spur = [];
    for (let i = 0; i < 10; i++) {
      schritte(120);
      const m0s = ang[0];
      spur.push({
        drin: ang.filter((m) => m.hp > 0 && innen(m)).length,
        belagert: ang.filter((m) => !!m.belagerungsZiel).length,
        wandSchaden: Math.round(hp0.reduce((a, h, k) => a + (h - wand[k].hp), 0)),
        // Wer bewegt sich wohin? (Kachelkoordinaten)
        angr: m0s ? [Math.round(m0s.x / T), Math.round(m0s.y / T)] : null,
        vert: vert ? [Math.round(vert.x / T), Math.round(vert.y / T)] : null,
        d: vert && m0s ? Math.round(Math.hypot(m0s.x - vert.x, m0s.y - vert.y)) : -1,
        vertHp: vert ? Math.round(vert.hp) : -1,
      });
    }
    // KONTROLLE: laeuft die Welt ueberhaupt? Ein Skelett weit weg vom Ring,
    // Ziel = Held. Bewegt sich das nicht, friert meine Messkulisse die Welt ein
    // und alle Zahlen oben sind wertlos.
    const kontrolle = w.spawnEnemy('skelett', 1, w.px + 200, w.py, false, true);
    kontrolle.passiv = false;
    const k0 = { x: kontrolle.x, y: kontrolle.y };
    schritte(180);
    out.kontrolle = {
      gelaufen: Math.round(Math.hypot(kontrolle.x - k0.x, kontrolle.y - k0.y)),
      uiBlockiert: typeof w.uiBlocked === 'function' ? !!w.uiBlocked() : 'unbekannt',
      dialogOffen: !!w.dialog?.aktiv,
      pausiert: !!w.pausiert,
    };
    // Diagnose: was DENKT der vorderste Angreifer?
    const m0 = ang[0];
    const zz = m0 ? w.zielFuer(m0) : null;
    out.diagnose = m0 ? {
      lebt: m0.hp > 0, passiv: !!m0.passiv, aggro: m0.aggro,
      ziel: zz === 'held' ? 'held' : zz ? (zz === vert ? 'verteidiger' : 'anderer') : 'KEINS',
      abstandZuVert: vert ? Math.round(Math.hypot(m0.x - vert.x, m0.y - vert.y)) : -1,
      belagerungsZiel: !!m0.belagerungsZiel,
      jagdZiel: !!m0.jagdZiel,
      wegVorhanden: vert ? w.wegRichtungZiel(m0.x, m0.y, vert.x, vert.y) !== null : null,
      sicht: vert ? w.marschBahnFrei(m0.x, m0.y, vert.x, vert.y) : null,
      posKachel: [Math.round(m0.x / T), Math.round(m0.y / T)],
      ringMitte: [cx, cy],
    } : 'kein Angreifer';
    const tor = w.feldbauten.find((f) => f.id === 'tor');
    out.torLuecke = {
      luecken: luecke.length, palisaden: wand.length,
      torSchaden: tor ? Math.round(tor.maxHp - tor.hp) : 'kein Tor',
      verlauf: spur,
      angreiferDrin: ang.filter((m) => m.hp > 0 && innen(m)).length,
      verteidigerSchaden: vert ? Math.round(vert.maxhp - vert.hp) : 'keiner',
    };
    return out;
  });
  console.log('TORLUECKE ' + JSON.stringify(bericht, null, 1));
};
