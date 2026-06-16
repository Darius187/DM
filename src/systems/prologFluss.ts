// Übergabe zwischen den eigenständigen Prolog-Szenen und der WorldScene.
// Der Prolog läuft als eigene Szene WÄHREND die WorldScene pausiert im
// Hintergrund liegt (ihr voller Zustand - Inventar, HP, Quests - bleibt also
// erhalten). Ist ein Prolog-Abschnitt zu Ende, weckt diese Funktion die
// WorldScene wieder und meldet ihr per Spiel-Event, dass es weitergeht
// (sie entscheidet dann das Ziel: Dorf nach dem Eröffnungs-Prolog, Boss-Arena
// nach dem Blutstrom-Gang). Beim Standalone-Test (?prolog=...) ist keine
// WorldScene aktiv - dann geht es schlicht zurück zum Titel.

import Phaser from 'phaser';

export const PROLOG_AKTIV = 'prologAktiv';   // Registry-Flag: läuft aus dem echten Spiel?

// Einen Prolog-Abschnitt beenden. Die WorldScene schläft im Hintergrund - wir
// wecken sie und stoppen uns selbst. Den Rest (Zielgebiet) erledigt die
// WorldScene in ihrem eigenen WAKE-Ereignis (robust: erst dort ist sie wirklich
// wieder aktiv). Beim Standalone-Test ist keine WorldScene da -> zurück zum Titel.
export function beendeProlog(scene: Phaser.Scene): void {
  const ausSpiel = scene.game.registry.get(PROLOG_AKTIV) === true;
  if (ausSpiel) {
    scene.scene.wake('World');
    scene.scene.stop();
  } else {
    scene.scene.start('Title');
  }
}
