// PROTOTYP (Runde 41, Autorfrage): eine FRATZE IM NEBEL - so unscheinbar, dass
// man zweimal hinschauen muss. Idee: den Blutstrom mit einem Nebel voller
// Fratzen umhüllen. Diese Studie zeigt mehrere driftende Nebelschwaden, in denen
// kaum sichtbare Gesichter (hohle Augen, aufgerissener Mund) auftauchen und
// wieder vergehen. Startbar über ?prolog=nebel.

import Phaser from 'phaser';

export class NebelProbe extends Phaser.Scene {
  constructor() { super('NebelProbe'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0c10');
    const W = this.scale.width, H = this.scale.height;
    this.ensureFratze();
    // dunkler, leicht nebliger Grund
    for (let i = 0; i < 5; i++) {
      this.add.image(Math.random() * W, Math.random() * H, 'nebel_schwade')
        .setScale(2 + Math.random() * 2).setAlpha(0.06 + Math.random() * 0.05)
        .setBlendMode(Phaser.BlendModes.SCREEN);
    }
    // Mehrere Fratzen unterschiedlicher Deutlichkeit - manche klar erkennbar,
    // andere nur zu erahnen (für die Studie ruhig sichtbar genug zum Beurteilen).
    const staerken = [0.30, 0.46, 0.22, 0.55, 0.26, 0.40, 0.18, 0.50];
    for (let i = 0; i < staerken.length; i++) {
      const x = (0.12 + 0.76 * (i % 4) / 3) * W + (Math.random() - 0.5) * 80;
      const y = (i < 4 ? 0.3 : 0.62) * H + (Math.random() - 0.5) * 80;
      // NORMAL-Blend (kein SCREEN): so bleiben die DUNKLEN Augenhöhlen/der Mund
      // sichtbar - unter SCREEN würden nur die hellen Teile durchkommen.
      const f = this.add.image(x, y, 'nebel_fratze')
        .setScale(1.4 + Math.random() * 1.0).setAlpha(staerken[i]).setAngle((Math.random() - 0.5) * 16);
      // langsames Atmen: die Fratze tritt hervor und tritt zurück (nie ganz weg)
      this.tweens.add({ targets: f, alpha: staerken[i] * 0.6, duration: 2600 + Math.random() * 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: Math.random() * 2000 });
      this.tweens.add({ targets: f, x: x + (Math.random() - 0.5) * 60, y: y + (Math.random() - 0.5) * 40, duration: 6000 + Math.random() * 4000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.add.text(W / 2, 24, 'NEBEL-FRATZEN (Prototyp)  ·  zweimal hinschauen', { fontFamily: 'serif', fontSize: '15px', color: '#6a6470', letterSpacing: 2 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(5000);
    this.add.text(W / 2, H - 24, 'Unscheinbar im Nebel - gedacht als Hülle um den Blutstrom', { fontFamily: 'serif', fontSize: '12px', color: '#4a4650' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(5000);
  }

  // Texturen: eine weiche Nebelschwade und eine kaum sichtbare Fratze.
  private ensureFratze(): void {
    if (!this.textures.exists('nebel_schwade')) {
      const S = 256, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
      const ctx = cv.getContext('2d')!;
      const g = ctx.createRadialGradient(S / 2, S / 2, 8, S / 2, S / 2, S / 2);
      g.addColorStop(0, 'rgba(150,160,180,0.5)'); g.addColorStop(0.6, 'rgba(110,120,140,0.18)'); g.addColorStop(1, 'rgba(90,100,120,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      this.textures.addCanvas('nebel_schwade', cv);
    }
    if (!this.textures.exists('nebel_fratze')) {
      const S = 256, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
      const ctx = cv.getContext('2d')!;
      // weicher Nebelgrund, in den das Gesicht eingebettet ist
      const bg = ctx.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S / 2);
      bg.addColorStop(0, 'rgba(150,158,172,0.40)'); bg.addColorStop(0.7, 'rgba(120,128,144,0.12)'); bg.addColorStop(1, 'rgba(100,108,124,0)');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S);
      const cx = S / 2, cy = S / 2;
      // Augenhöhlen (dunkle, weiche Vertiefungen) - das markanteste Merkmal
      for (const ex of [-46, 46]) {
        const eg = ctx.createRadialGradient(cx + ex, cy - 28, 2, cx + ex, cy - 28, 40);
        eg.addColorStop(0, 'rgba(8,8,14,0.55)'); eg.addColorStop(1, 'rgba(8,8,14,0)');
        ctx.fillStyle = eg; ctx.beginPath(); ctx.ellipse(cx + ex, cy - 28, 30, 34, 0, 0, Math.PI * 2); ctx.fill();
      }
      // Brauen / Stirnschatten (dünne dunkle Bögen darüber)
      ctx.strokeStyle = 'rgba(10,10,16,0.30)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx - 46, cy - 22, 30, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + 46, cy - 22, 30, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      // Wangen-/Schläfenhöhlen (ausgezehrt)
      for (const sx of [-78, 78]) {
        const sg = ctx.createRadialGradient(cx + sx, cy + 6, 4, cx + sx, cy + 6, 54);
        sg.addColorStop(0, 'rgba(8,8,14,0.32)'); sg.addColorStop(1, 'rgba(8,8,14,0)');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(cx + sx, cy + 6, 26, 50, 0, 0, Math.PI * 2); ctx.fill();
      }
      // aufgerissener Mund (senkrechte dunkle Höhle - ein stummer Schrei)
      const mg = ctx.createRadialGradient(cx, cy + 58, 3, cx, cy + 58, 46);
      mg.addColorStop(0, 'rgba(6,6,12,0.6)'); mg.addColorStop(1, 'rgba(6,6,12,0)');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(cx, cy + 58, 20, 40, 0, 0, Math.PI * 2); ctx.fill();
      // schwacher Lichtsaum auf Nasenrücken/Wangenknochen (lässt das Gesicht "kommen")
      ctx.strokeStyle = 'rgba(190,198,212,0.18)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx, cy - 22); ctx.lineTo(cx, cy + 30); ctx.stroke();           // Nasenrücken
      this.textures.addCanvas('nebel_fratze', cv);
    }
  }
}
