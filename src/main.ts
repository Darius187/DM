import Phaser from 'phaser';
import { BootSzene } from './boot';
import { WaldSzene, HausSzene, GruftSzene } from './gebiete';

// ?glatt=1: bilineares Filtern statt harter Pixel ("3dfx-Voodoo-Weichzeichner").
const glatt = new URLSearchParams(window.location.search).get('glatt') === '1';

// Stimmungstest: bewusst kleine interne Aufloesung, hochskaliert (Pixel-Look).
const spiel = new Phaser.Game({
  type: Phaser.AUTO,
  width: 640,
  height: 360,
  backgroundColor: '#000000',
  pixelArt: !glatt,
  antialias: glatt,
  physics: { default: 'arcade' },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootSzene, WaldSzene, HausSzene, GruftSzene],
});

// Debug-Handle fuer den Screenshot-/Test-Runner.
(window as unknown as { spiel: Phaser.Game }).spiel = spiel;
