import Phaser from 'phaser';
import { GOLEM, golemFrame, type GolemClip } from '../data/golem';
import type { Enemy } from '../world/Enemy';

export function golemClipUndFrame(e: Enemy): { clip: GolemClip; frame: number } {
  if (e.visualHitT > 0) {
    const fortschritt = 1 - e.visualHitT / GOLEM.trefferDauerS;
    return { clip: 'hit', frame: Math.floor(fortschritt * GOLEM.frames.hit) };
  }
  if (e.visualAttackT > 0) {
    const fortschritt = 1 - e.visualAttackT / Math.max(0.001, e.visualAttackDauer);
    return { clip: 'attack', frame: Math.floor(fortschritt * GOLEM.frames.attack) };
  }
  if (e.visualMoveT > 0) return { clip: 'walk', frame: Math.floor(e.visualWalkTime * GOLEM.fps.walk) };
  return { clip: 'idle', frame: Math.floor(e.visualTime * GOLEM.fps.idle) };
}

export function wendeGolemSpriteAn(sprite: Phaser.GameObjects.Sprite, e: Enemy): void {
  const { clip, frame } = golemClipUndFrame(e);
  sprite.setTexture(GOLEM.atlasKey, golemFrame(clip, e.visualDir8, frame));
  sprite.setOrigin(0.5, GOLEM.ursprungY).setScale(GOLEM.spriteScale);
}
