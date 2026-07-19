import Phaser from 'phaser';
import { SKELETTWACHE, skelettwacheFrame, type SkelettwacheClip } from '../data/skelettwache';
import type { Enemy } from '../world/Enemy';

export function skelettwacheClipUndFrame(e: Enemy): { clip: SkelettwacheClip; frame: number } {
  // Der Trefferreflex darf einen bereits laufenden Stich nicht verdecken: Die KI
  // fuehrt den Angriff ebenfalls weiter aus. Attack-Prioritaet verhindert den
  // sichtbaren Sprung Hit -> halb abgelaufener Angriff bei dichtem Nahkampf.
  if (e.visualAttackT > 0) {
    const fortschritt = 1 - e.visualAttackT / Math.max(0.001, e.visualAttackDauer);
    const clip = e.skelettwacheAngriff ?? 'thrust';
    return { clip, frame: Math.floor(fortschritt * SKELETTWACHE.frames[clip]) };
  }
  if (e.visualHitT > 0) {
    const fortschritt = 1 - e.visualHitT / SKELETTWACHE.trefferDauerS;
    return { clip: 'hit', frame: Math.floor(fortschritt * SKELETTWACHE.frames.hit) };
  }
  if (e.visualMoveT > 0) return { clip: 'walk', frame: Math.floor(e.visualWalkTime * SKELETTWACHE.fps.walk) };
  return { clip: 'idle', frame: Math.floor(e.visualTime * SKELETTWACHE.fps.idle) };
}

export function wendeSkelettwacheSpriteAn(sprite: Phaser.GameObjects.Sprite, e: Enemy): void {
  const { clip, frame } = skelettwacheClipUndFrame(e);
  sprite.setTexture(SKELETTWACHE.atlasKey, skelettwacheFrame(clip, e.visualDir8, frame));
  sprite.setOrigin(0.5, SKELETTWACHE.bodenanker).setScale(SKELETTWACHE.skala).setCrop();
}
