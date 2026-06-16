// "Rumschlagen" im kampffreien Prolog (Runde 41, Autorwunsch "im Prolog die
// Waffe schon haben und schwingen koennen - es passiert halt nichts"). Ein
// kleiner wiederverwendbarer Helfer: Linksklick lässt den Helden einen sichtbaren
// Waffenschwung Richtung Mauszeiger ausführen (Bogen + Swoosh), rein optisch.
// Die Farbe richtet sich nach der ECHTEN Waffe des Spielers (falls die WorldScene
// im Hintergrund liegt), sonst Stahl.

import Phaser from 'phaser';
import type { SoundProvider } from '../gfx/SoundProvider';

function waffenFarbe(scene: Phaser.Scene): number {
  const world = scene.scene.get('World') as unknown as { p?: { weapon?: { weaponClass?: string }; bogen?: unknown; bogenAktiv?: boolean } } | null;
  const wc = world?.p?.weapon?.weaponClass;
  if (world?.p?.bogenAktiv) return 0xd8d0b8;
  return wc === 'stab' ? 0xb06ae8 : wc === 'axt' || wc === 'wucht' ? 0x9aa0a8 : 0xd8e0ea;
}

export function registriereSchwung(scene: Phaser.Scene, holePos: () => { x: number; y: number }, sfx: SoundProvider): void {
  let cd = 0;
  scene.events.on(Phaser.Scenes.Events.UPDATE, (_t: number, delta: number) => { if (cd > 0) cd -= delta / 1000; });
  scene.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
    if (cd > 0) return;
    cd = 0.32;
    const { x, y } = holePos();
    const wp = scene.cameras.main.getWorldPoint(ptr.x, ptr.y);
    const ang = Math.atan2(wp.y - y, wp.x - x);
    const farbe = waffenFarbe(scene);
    const g = scene.add.graphics().setDepth(y + 6);
    // gefüllte Sichel (deutlich sichtbarer Schwung) + helle Schneide
    g.fillStyle(farbe, 0.45);
    g.beginPath(); g.arc(x, y - 4, 32, ang - 0.7, ang + 0.7); g.arc(x, y - 4, 16, ang + 0.7, ang - 0.7, true); g.closePath(); g.fill();
    g.lineStyle(3, 0xffffff, 0.8); g.beginPath(); g.arc(x, y - 4, 32, ang - 0.62, ang + 0.62); g.strokePath();
    scene.tweens.add({ targets: g, alpha: 0, duration: 190, ease: 'Quad.out', onComplete: () => g.destroy() });
    sfx.play(Math.random() < 0.5 ? 'schwert_slice1' : 'swoosh1', 0.55);
  });
}
