// Nebel-Fratzen-Schleier (Runde 41, Autorwunsch "den Blutstrom mit einem Nebel
// voll Fratzen umhüllen"). Wiederverwendbar: legt über eine Region mehrere
// driftende Nebelschwaden, in denen kaum sichtbare Gesichter (hohle Augen,
// aufgerissener Mund) auftauchen und vergehen - so unscheinbar, dass man zweimal
// hinschauen muss. Aus dem NebelProbe-Prototyp herausgezogen.

import Phaser from 'phaser';

export interface FratzenOpts {
  anzahl?: number; depth?: number; maxAlpha?: number; ton?: number;
  // R113: gesichter=false -> schlichte Moor-Schwaden (kein Horror-Gesicht),
  // breiter gestreckt und mit weiterem Drift ("Schwaden ziehen uebers Moor").
  gesichter?: boolean;
  // R113: Kamera-Ausschluss je Bild (z.B. uiCam.ignore in der WorldScene).
  ignoriere?: (o: Phaser.GameObjects.GameObject) => void;
}

export class NebelFratzen {
  private bilder: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, region: { x: number; y: number; w: number; h: number }, opts: FratzenOpts = {}) {
    ensureTexturen(scene);
    const n = opts.anzahl ?? 8;
    const tiefe = opts.depth ?? 1900;
    const maxA = opts.maxAlpha ?? 0.26;
    const gesicht = opts.gesichter !== false;
    for (let i = 0; i < n; i++) {
      const x = region.x + Math.random() * region.w;
      const y = region.y + Math.random() * region.h;
      const basis = maxA * (0.45 + Math.random() * 0.55);
      const f = scene.add.image(x, y, gesicht ? 'nebel_fratze' : 'nebel_schwade')
        .setDepth(tiefe).setAngle((Math.random() - 0.5) * 18).setAlpha(basis);
      if (gesicht) f.setScale(1.5 + Math.random() * 1.4);
      else f.setScale(2.2 + Math.random() * 2.2, 0.9 + Math.random() * 0.7);   // flache, breite Schwade
      if (opts.ton !== undefined) f.setTint(opts.ton);
      opts.ignoriere?.(f);
      // Atmen: tritt hervor und zurück (nie ganz weg - Untergrenze wie im Prototyp)
      scene.tweens.add({ targets: f, alpha: basis * 0.55, duration: 2600 + Math.random() * 2800, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: Math.random() * 2600 });
      // langsames Driften - Schwaden ZIEHEN weiter (groessere Bahn) als Fratzen
      const zug = gesicht ? 1 : 3.2;
      scene.tweens.add({ targets: f, x: x + (Math.random() - 0.5) * 100 * zug, y: y + (Math.random() - 0.5) * 70 * (gesicht ? 1 : 1.6), duration: (7000 + Math.random() * 5000) * (gesicht ? 1 : 1.7), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.bilder.push(f);
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  destroy(): void { for (const f of this.bilder) f.destroy(); this.bilder = []; }
}

// Texturen: eine weiche Fratze, in NORMAL-Blend gerendert, damit die DUNKLEN
// Augenhöhlen/der Mund sichtbar bleiben (unter SCREEN kämen nur die hellen Teile).
function ensureTexturen(scene: Phaser.Scene): void {
  // R113: schlichte Schwade (nur der weiche Nebelball, ohne Gesicht) fuer den Moor-Nebel.
  if (!scene.textures.exists('nebel_schwade')) {
    const S = 256, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const ctx = cv.getContext('2d')!;
    const bg = ctx.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S / 2);
    bg.addColorStop(0, 'rgba(168,176,186,0.38)'); bg.addColorStop(0.65, 'rgba(140,148,160,0.14)'); bg.addColorStop(1, 'rgba(120,128,140,0)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S);
    scene.textures.addCanvas('nebel_schwade', cv);
  }
  if (scene.textures.exists('nebel_fratze')) return;
  const S = 256, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
  const ctx = cv.getContext('2d')!;
  const bg = ctx.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S / 2);
  bg.addColorStop(0, 'rgba(150,158,172,0.40)'); bg.addColorStop(0.7, 'rgba(120,128,144,0.12)'); bg.addColorStop(1, 'rgba(100,108,124,0)');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S);
  const cx = S / 2, cy = S / 2;
  for (const ex of [-46, 46]) {
    const eg = ctx.createRadialGradient(cx + ex, cy - 28, 2, cx + ex, cy - 28, 40);
    eg.addColorStop(0, 'rgba(8,8,14,0.55)'); eg.addColorStop(1, 'rgba(8,8,14,0)');
    ctx.fillStyle = eg; ctx.beginPath(); ctx.ellipse(cx + ex, cy - 28, 30, 34, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(10,10,16,0.30)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx - 46, cy - 22, 30, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + 46, cy - 22, 30, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  for (const sx of [-78, 78]) {
    const sg = ctx.createRadialGradient(cx + sx, cy + 6, 4, cx + sx, cy + 6, 54);
    sg.addColorStop(0, 'rgba(8,8,14,0.32)'); sg.addColorStop(1, 'rgba(8,8,14,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(cx + sx, cy + 6, 26, 50, 0, 0, Math.PI * 2); ctx.fill();
  }
  const mg = ctx.createRadialGradient(cx, cy + 58, 3, cx, cy + 58, 46);
  mg.addColorStop(0, 'rgba(6,6,12,0.6)'); mg.addColorStop(1, 'rgba(6,6,12,0)');
  ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(cx, cy + 58, 20, 40, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(190,198,212,0.18)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(cx, cy - 22); ctx.lineTo(cx, cy + 30); ctx.stroke();
  scene.textures.addCanvas('nebel_fratze', cv);
}
