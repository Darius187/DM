// Lager-Props aus fertigen GLB-Modellen (Autor: die neuen Zelte sind "geiler").
// Backt die GLB 1:1 zu EIGENEN feldbau_*-Texturen (NICHT-destruktiv: die
// bestehende feldbau_zelt-Handbau-Grafik bleibt unangetastet). So kann das
// echte Modell im Spiel geprueft und dann bewusst als Bau-Grafik verdrahtet
// werden - ohne eine funktionierende Grafik ungesehen zu ueberschreiben.
// (Die three.js-Backung laeuft nur auf echter GPU, nicht im Headless-Harness -
// die 3/4-Drehung/Skala muss darum im echten Browser abgenommen werden.)

import Phaser from 'phaser';
import { backeGlbProp } from '../demo3d/glbPropBackofen';

// key = feldbau_<id>, url = im publicDir (assets/) unter /props/camp/...,
// drehen = Yaw fuer die 3/4-Ansicht (an der Preview-Optik ausgerichtet).
const CAMP_GLB: ReadonlyArray<{ key: string; url: string; drehen: number }> = [
  // Kleines Feldzelt (A-Rahmen).
  { key: 'feldbau_field_tent', url: '/props/camp/field_tent/medieval_field_tent_3d_runtime.glb', drehen: -Math.PI * 0.72 },
  // Befehlspavillon (grosses Kommandozelt).
  { key: 'feldbau_command_pavilion', url: '/props/camp/command_pavilion/medieval_command_pavilion_3d_runtime.glb', drehen: -Math.PI * 0.72 },
];

export async function registriereCampGlbProps(tex: Phaser.Textures.TextureManager): Promise<void> {
  for (const { key, url, drehen } of CAMP_GLB) {
    try {
      const cv = await backeGlbProp(url, { groesse: 640, drehen, zielH: 340 });
      if (tex.exists(key)) tex.remove(key);
      tex.addCanvas(key, cv)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    } catch (e) {
      // GLB nicht ladbar/GL fehlt -> handgebaute Fallback-Grafik bleibt bestehen.
      console.warn('[campGlb] Backen fehlgeschlagen:', key, e);
    }
  }
}
