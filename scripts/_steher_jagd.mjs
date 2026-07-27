// R198 "Stehenbleiber-Jagd": sucht Einheiten, die ein lebendes Ziel haben, nicht
// passiv sind - und sich trotzdem KEINEN Pixel bewegen. Genau diese Klasse war
// zuletzt dreimal die Ursache (Sammel-Endlosschleife, Wegfindung liefert null,
// Wegfeld-Ziel auf der Wand).
//
// WICHTIG: jede Messung hat eine KONTROLLE. Ist die Welt eingefroren
// (uiBlocked), sind alle Zahlen wertlos - das ist mir schon passiert.
export default async (page) => {
  for (let versuch = 0; versuch < 6; versuch++) {
    await page.evaluate(() => {
      const g = window.__game;
      if (g && !window.__welt) g.scene.start('World', { neu: true, startArea: 'stadt' });
    }).catch(() => {});
    if (await page.evaluate(() => !!window.__welt).catch(() => false)) break;
    await page.waitForTimeout(2500);
  }
  await page.waitForTimeout(3000);
  if (!await page.evaluate(() => !!window.__welt).catch(() => false)) {
    console.log('JAGD {"fehler":"Welt startete nicht"}'); return;
  }

  const bericht = await page.evaluate(() => {
    const w = window.__welt;
    const T = 32;
    const out = {};
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
    // Freies Feld suchen (Laenge Kacheln in +x begehbar)
    const feldSuche = (laenge) => {
      for (let ty = 8; ty < w.area.h - 8; ty += 4) {
        for (let tx = 8; tx < w.area.w - laenge - 4; tx += 4) {
          let ok = true;
          for (let i = 0; i < laenge && ok; i++) {
            for (let j = -1; j <= 1 && ok; j++) {
              if (w.solidFuerHeld((tx + i) * T + 16, (ty + j) * T + 16)) ok = false;
            }
          }
          if (ok) return { tx, ty };
        }
      }
      return null;
    };
    // Ein Lauf: Einheiten setzen, laufen lassen, Bewegung je Einheit messen.
    const lauf = (name, bauen, takte = 260) => {
      leer();
      const einheiten = bauen() ?? [];
      frei();
      const start = einheiten.map((e) => ({ x: e.x, y: e.y }));
      // Kontrolle: ein Skelett auf freiem Feld mit dem Helden als Ziel
      const kf = feldSuche(8) ?? { tx: 10, ty: 10 };
      const kontrolle = w.spawnEnemy('skelett', 1, kf.tx * T + 16, kf.ty * T + 16, false, true);
      kontrolle.passiv = false;
      const k0 = { x: kontrolle.x, y: kontrolle.y };
      schritte(takte);
      const steher = [];
      einheiten.forEach((e, i) => {
        if (e.hp <= 0) return;
        const weg = Math.hypot(e.x - start[i].x, e.y - start[i].y);
        const z = w.zielFuer(e);
        const hatZiel = z === 'held' ? !w.playerDead : !!z && z.hp > 0;
        if (weg < 6 && hatZiel && !e.passiv && !e.festPos) {
          steher.push({
            nr: i, team: e.team, typ: e.type, weg: Math.round(weg),
            ziel: z === 'held' ? 'held' : 'einheit',
            abstand: z === 'held' ? Math.round(Math.hypot(w.px - e.x, w.py - e.y))
              : Math.round(Math.hypot(z.x - e.x, z.y - e.y)),
            jagd: !!e.jagdZiel, belagert: !!e.belagerungsZiel, flieht: !!e.flieht,
          });
        }
      });
      return {
        name,
        kontrolleGelaufen: Math.round(Math.hypot(kontrolle.x - k0.x, kontrolle.y - k0.y)),
        uiBlockiert: !!w.uiBlocked?.(),
        einheiten: einheiten.length,
        steher,
      };
    };

    const laeufe = [];

    // 1) Verbuendete gegen Monster auf freiem Feld
    laeufe.push(lauf('offenes Feld: 4 Soldaten gegen 4 Monster', () => {
      const f = feldSuche(12); if (!f) return [];
      const liste = [];
      for (let i = 0; i < 4; i++) {
        const s = w.spawnVerbuendeter(i % 2 ? 'bogen' : 'nahkampf', (f.tx + 1) * T + 16, (f.ty + i - 1) * T + 16);
        if (s) { s.passiv = false; s.jagdZiel = null; liste.push(s); }
      }
      for (let i = 0; i < 4; i++) {
        const m = w.spawnEnemy(i % 2 ? 'schuetze' : 'skelett', 1, (f.tx + 9) * T + 16, (f.ty + i - 1) * T + 16, false, true);
        m.passiv = false; liste.push(m);
      }
      return liste;
    }));

    // 2) Ziel stirbt mitten im Kampf - suchen sie sich ein neues?
    laeufe.push(lauf('Ziel stirbt: bleiben die Angreifer stehen?', () => {
      const f = feldSuche(12); if (!f) return [];
      const opfer = w.spawnVerbuendeter('nahkampf', (f.tx + 2) * T + 16, f.ty * T + 16);
      const zweiter = w.spawnVerbuendeter('nahkampf', (f.tx + 4) * T + 16, f.ty * T + 16);
      if (opfer) { opfer.passiv = false; opfer.jagdZiel = null; }
      if (zweiter) { zweiter.passiv = false; zweiter.jagdZiel = null; }
      const liste = [];
      for (let i = 0; i < 3; i++) {
        const m = w.spawnEnemy('skelett', 1, (f.tx + 8) * T + 16, (f.ty + i - 1) * T + 16, false, true);
        m.passiv = false; liste.push(m);
      }
      // Opfer sofort toeten -> die Angreifer muessen umschwenken
      if (opfer) opfer.hp = 0;
      return liste;
    }));

    // 3) Held tot: kaempfen die eigenen Truppen weiter?
    laeufe.push(lauf('Held gefallen: kaempfen die Soldaten weiter?', () => {
      const f = feldSuche(12); if (!f) return [];
      const liste = [];
      for (let i = 0; i < 3; i++) {
        const s = w.spawnVerbuendeter('nahkampf', (f.tx + 1) * T + 16, (f.ty + i - 1) * T + 16);
        if (s) { s.passiv = false; s.jagdZiel = null; liste.push(s); }
      }
      for (let i = 0; i < 3; i++) {
        const m = w.spawnEnemy('skelett', 1, (f.tx + 8) * T + 16, (f.ty + i - 1) * T + 16, false, true);
        m.passiv = false; liste.push(m);
      }
      w.playerDead = true;   // der Held ist gefallen
      return liste;
    }));

    // 4) Turm zerstoert: springen die Insassen heraus und kaempfen weiter?
    laeufe.push(lauf('Turm faellt: reagiert die Besatzung?', () => {
      const f = feldSuche(12); if (!f) return [];
      const liste = [];
      for (let i = 0; i < 2; i++) {
        const b = w.spawnVerbuendeter('bogen', (f.tx + 2) * T + 16, (f.ty + i) * T + 16);
        if (b) {
          b.passiv = false; b.imTurm = true; b.turmReichF = 1.9;
          b.festPos = { x: b.x, y: b.y - 40 };
          liste.push(b);
        }
      }
      for (let i = 0; i < 2; i++) {
        const m = w.spawnEnemy('skelett', 1, (f.tx + 8) * T + 16, (f.ty + i) * T + 16, false, true);
        m.passiv = false; liste.push(m);
      }
      // Turm faellt: Fixierung loesen (so macht es updateBelagerung beim Turmtod)
      for (const b of liste) {
        if (b.team === 'spieler') { b.imTurm = false; b.festPos = null; b.turmReichF = 1; }
      }
      return liste;
    }));

    // 5) Wand OHNE Durchlass: sie sollen NICHT durchdrehen, sondern nagen
    laeufe.push(lauf('Wand ohne Durchlass: nagen statt zittern', () => {
      const f = feldSuche(16); if (!f) return [];
      const cx = f.tx + 8, cy = f.ty;
      for (let dy = -4; dy <= 4; dy++) w.vollendeBau('palisade', cx * T + 16, (cy + dy) * T + 16, 'held');
      const s = w.spawnVerbuendeter('nahkampf', (cx - 2) * T + 16, cy * T + 16);
      if (s) { s.passiv = false; s.jagdZiel = null; }
      const liste = [];
      for (let i = 0; i < 3; i++) {
        const m = w.spawnEnemy('skelett', 1, (cx + 3) * T + 16, (cy + i - 1) * T + 16, false, true);
        m.passiv = false; liste.push(m);
      }
      return liste;
    }, 400));

    out.laeufe = laeufe;
    return out;
  });
  console.log('JAGD ' + JSON.stringify(bericht, null, 1));
};
