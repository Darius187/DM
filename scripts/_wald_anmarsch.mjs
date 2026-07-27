// R201 "Wald-Wegfindung": A/B-Beleg fuer den Kanten-Einsetzpunkt. Eine Feldzug-
// Welle wird auf der WALDKARTE zweimal gespawnt - einmal mit dem ALTEN Anker
// (geometrische Kantenmitte, hier nachgebaut) und einmal mit dem NEUEN
// (Strassen-Kreuzung aus OBERWELT_KANTEN). Gemessen wird, wie weit die Welle
// nach 300 Takten wirklich gekommen ist und wie viele sich keinen Pixel bewegt
// haben.
//
// Regel aus DECISIONS: jede Messung braucht eine KONTROLLE, sonst misst man
// womoeglich eine eingefrorene Welt.
export default async (page) => {
  for (let versuch = 0; versuch < 6; versuch++) {
    await page.evaluate(() => {
      const g = window.__game;
      if (g && !window.__welt) g.scene.start('World', { neu: true, startArea: 'wald_o' });
    }).catch(() => {});
    if (await page.evaluate(() => !!window.__welt).catch(() => false)) break;
    await page.waitForTimeout(2500);
  }
  await page.waitForTimeout(3000);
  const da = await page.evaluate(() => !!window.__welt).catch(() => false);
  if (!da) { console.log('WALD {"fehler":"Welt startete nicht"}'); return; }

  const bericht = await page.evaluate(() => {
    const w = window.__welt;
    const T = 32;
    let t = 1200000;
    const schritte = (n) => { for (let i = 0; i < n; i++) { t += 16.6; w.update(t, 16.6); } };
    const frei = () => {
      w.panels?.closeAll?.(); w.dialog?.close?.();
      w.pauseMenu = null; w.baukastenPanel = null; w.deathOverlay = null;
    };
    const leer = () => {
      for (const e of w.enemies) e.hp = 0;
      w.enemies.length = 0; w.projectiles.length = 0;
      w.p.hp = w.p.stats.maxhp; w.playerDead = false;
      frei();
    };

    const echt = w.kantenPunkt.bind(w);
    // Der ALTE Anker: exakt der Code vor R201 (Laengs-Koordinate = Kartenmitte).
    const alt = (a, nachbar, eintritt) => {
      const p = echt(a, nachbar, eintritt);
      const mitte = { x: a.w * T / 2, y: a.h * T / 2 };
      const rand = eintritt ? T * 3 : T * 1.2;
      // nur die Laengs-Koordinate zuruecksetzen (die Rand-Koordinate bleibt)
      if (Math.abs(p.x - rand) < 1 || Math.abs(p.x - (a.w * T - rand)) < 1) return { x: p.x, y: mitte.y };
      return { x: mitte.x, y: p.y };
    };

    // Wie oft musste ein Spawn-Platz ueberhaupt aus dem Bewuchs gerettet werden?
    // Das ist der DIREKTE Gradmesser fuer "die Welle spawnt in Taschen".
    const echterBoden = w.angeschlossenerBoden.bind(w);

    const lauf = (name, kantenPunktFn, von) => {
      leer();
      let gerettet = 0, weiteste = 0, plaetze = 0;
      w.angeschlossenerBoden = (x, y, zx, zy) => {
        const p = echterBoden(x, y, zx, zy);
        const d = Math.hypot(p.x - x, p.y - y);
        plaetze++;
        if (d > 1) { gerettet++; weiteste = Math.max(weiteste, d); }
        return p;
      };
      w.kantenPunkt = kantenPunktFn;
      w.spawneFeldzugWelle(von, 900);
      w.kantenPunkt = echt;
      w.angeschlossenerBoden = echterBoden;
      frei();
      const welle = w.enemies.filter((e) => e.feldzugTrupp && e.hp > 0);
      const start = welle.map((e) => ({ x: e.x, y: e.y }));
      // Kontrolle: ein Skelett auf gesichert freiem Boden, das laufen MUSS
      const kp = echterBoden(w.px + 200, w.py, w.px, w.py);
      const k = w.spawnEnemy('skelett', 1, kp.x, kp.y, false, true);
      k.passiv = false;
      const k0 = { x: k.x, y: k.y };
      schritte(300);
      let steher = 0, summe = 0;
      const mitte = { x: w.area.w * T / 2, y: w.area.h * T / 2 };
      let d0 = 0, d1 = 0;
      welle.forEach((e, i) => {
        const weg = Math.hypot(e.x - start[i].x, e.y - start[i].y);
        summe += weg;
        if (weg < 6) steher++;
        d0 += Math.hypot(start[i].x - mitte.x, start[i].y - mitte.y);
        d1 += Math.hypot(e.x - mitte.x, e.y - mitte.y);
      });
      const n = Math.max(1, welle.length);
      return {
        name,
        anzahl: welle.length,
        kontrolleGelaufen: Math.round(Math.hypot(k.x - k0.x, k.y - k0.y)),
        uiBlockiert: !!w.uiBlocked?.(),
        steher,
        plaetze,                                  // geprüfte Spawn-/Zielpunkte
        gerettet,                                 // davon lagen im Bewuchs
        geretteAnteil: Math.round(gerettet / Math.max(1, plaetze) * 100) + '%',
        weitesteRettungPx: Math.round(weiteste),
        wegSchnitt: Math.round(summe / n),
        // Naeher an der Kartenmitte geworden? Das ist der eigentliche Fortschritt.
        naeherAnMitte: Math.round((d0 - d1) / n),
      };
    };

    const laeufe = [];
    laeufe.push(lauf('ALT: geometrische Kantenmitte (West)', alt, 'start'));
    laeufe.push(lauf('NEU: Strassen-Uebergang (West)', echt, 'start'));
    laeufe.push(lauf('ALT: geometrische Kantenmitte (Ost)', alt, 'stadt'));
    laeufe.push(lauf('NEU: Strassen-Uebergang (Ost)', echt, 'stadt'));
    laeufe.push(lauf('ALT: geometrische Kantenmitte (Nord)', alt, 'wald_m'));
    laeufe.push(lauf('NEU: Strassen-Uebergang (Nord)', echt, 'wald_m'));
    return { karte: w.area.id, laeufe };
  });
  console.log('WALD ' + JSON.stringify(bericht, null, 1));
};
