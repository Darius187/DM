// Verifikation M1-Netz: sichereLagerRoute schlaegt eine Bresche, wenn der Altar
// vollstaendig eingemauert ist - und laesst ein Lager mit Tor-Luecke unangetastet.
export default async (page) => {
  // In die Welt springen (WorldScene setzt window.__welt).
  await page.evaluate(() => {
    const g = window.__game;
    if (g && !window.__welt) g.scene.start('World', { neu: true, startArea: 'stadt' });
  });
  await page.waitForFunction(() => !!window.__welt, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const res = await page.evaluate(() => {
    const GRASS = 1, CRACK = 44, TILE = 32;
    const w = window.__welt;
    if (!w) return { fehler: 'kein __welt' };
    const orig = { area: w.area, refresh: w.refreshTile, log: w.logMsg, dorf: w.dorfAktiv };
    w.refreshTile = () => {};
    w.logMsg = (m) => console.log('LOG ' + m);
    w.dorfAktiv = false;

    const baueArea = (mitLuecke) => {
      const W = 25, H = 17, ax = 12, ay = 8, r = 5;
      const map = [];
      for (let y = 0; y < H; y++) { map[y] = []; for (let x = 0; x < W; x++) map[y][x] = GRASS; }
      const schritte = 40;
      for (let i = 0; i < schritte; i++) {
        const wk = (i / schritte) * Math.PI * 2;
        // Luecke: ein Tor im Osten (wk um 0) offen lassen
        if (mitLuecke && Math.cos(wk) > 0.85) continue;
        const tx = ax + Math.round(Math.cos(wk) * r), ty = ay + Math.round(Math.sin(wk) * r * 0.7);
        if (map[ty] && map[ty][tx] !== undefined) map[ty][tx] = CRACK;
      }
      return { id: 'bfs_test', w: W, h: H, map, ax, ay };
    };

    // Unabhaengige BFS-Kontrolle: erreicht der Altar eine Kante?
    const kanteErreichbar = (a) => {
      const frei = (tx, ty) => tx >= 0 && ty >= 0 && tx < a.w && ty < a.h &&
        !w.solidFuerFeind(tx * TILE + 16, ty * TILE + 16);
      const seen = new Set([a.ay * a.w + a.ax]);
      const q = [a.ay * a.w + a.ax];
      for (let h = 0; h < q.length; h++) {
        const id = q[h], tx = id % a.w, ty = (id - tx) / a.w;
        if (tx === 0 || ty === 0 || tx === a.w - 1 || ty === a.h - 1) return true;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = tx + dx, ny = ty + dy, nid = ny * a.w + nx;
          if (nx < 0 || ny < 0 || nx >= a.w || ny >= a.h || seen.has(nid)) continue;
          seen.add(nid);
          if (frei(nx, ny)) q.push(nid);
        }
      }
      return false;
    };
    const zaehleCrack = (a) => { let c = 0; for (const row of a.map) for (const t of row) if (t === CRACK) c++; return c; };

    // Fall 1: vollstaendig eingemauert -> Netz MUSS oeffnen
    const dicht = baueArea(false);
    w.area = dicht;
    const dichtVor = kanteErreichbar(dicht);
    const crackVor1 = zaehleCrack(dicht);
    w.sichereLagerRoute(dicht, dicht.ax, dicht.ay, [0, Math.PI]);
    const dichtNach = kanteErreichbar(dicht);
    const crackNach1 = zaehleCrack(dicht);

    // Fall 2: Tor-Luecke vorhanden -> Netz darf NICHTS anfassen
    const offen = baueArea(true);
    w.area = offen;
    const offenVor = kanteErreichbar(offen);
    const crackVor2 = zaehleCrack(offen);
    w.sichereLagerRoute(offen, offen.ax, offen.ay, [0, Math.PI]);
    const crackNach2 = zaehleCrack(offen);

    // Aufraeumen
    w.area = orig.area; w.refreshTile = orig.refresh; w.logMsg = orig.log; w.dorfAktiv = orig.dorf;

    return {
      fall1: { vorher: dichtVor, nachher: dichtNach, crackVor: crackVor1, crackNach: crackNach1 },
      fall2: { vorher: offenVor, crackVor: crackVor2, crackNach: crackNach2 },
    };
  });
  console.log('BFS-VERIF ' + JSON.stringify(res, null, 2));
};
