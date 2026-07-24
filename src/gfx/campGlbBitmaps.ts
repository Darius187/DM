// RTS-/Lagerbauten aus den ECHTEN GLB-Modellen (Codex-Entscheid): jede kartierte
// Bau-ID wird 1:1 aus ihrem Blender/GLB gebacken - kein Nachbau, keine geschaetzten
// Farben. Architektur nach Codex-Vorgabe:
//   - LAZY: nicht alle GLBs beim Boot laden, sondern erst wenn ein Bau dieses Typs
//     zum ersten Mal gezeigt wird (backeCampSprite).
//   - CACHE je ID: das Ergebnis liegt als EIGENE Textur feldbau_glb_<id>; mehrere
//     Instanzen teilen dieselbe Phaser-Textur. NICHT-destruktiv - die handgebaute
//     feldbau_<id> bleibt als Fallback bestehen (z.B. wenn das GLB nicht laedt).
//   - FREIGABE: der GLB-Renderer/Kontext + die Modell-Ressourcen werden nach dem
//     Bake freigegeben (in glbPropBackofen).
// HINWEIS: In der Cloud fehlt git-lfs - 12 der 16 Modelle sind dort nur LFS-Pointer
// und das Backen scheitert (Fallback bleibt). Die visuelle Abnahme der Modelle
// macht Codex lokal (echte GPU). Hier steht nur die Verdrahtung.

import Phaser from 'phaser';
import { backeGlbProp } from '../demo3d/glbPropBackofen';
import { feldbauOptik } from '../data/feldbauOptik';

const G = (rest: string) => `/props/camp/${rest}`;

// RTS-Bau-ID -> echtes Camp-GLB. drehen = Yaw fuer die 3/4-Ansicht (Codex nimmt
// die Feinjustage lokal ab). Nur EINDEUTIG passende Zuordnungen; weitere GLBs
// (rest_tent, supply_tent, fletcher, ... command_pavilion) warten auf eigene
// Bau-Typen in rts.ts (Codex).
// Der Blickwinkel steht NICHT mehr hier, sondern im Baukasten
// (src/data/feldbauOptik.ts) - der Autor kann ihn im Spiel drehen.
export const CAMP_GLB: Readonly<Record<string, { url: string }>> = {
  zelt:         { url: G('field_tent/medieval_field_tent_3d_runtime.glb') },
  befehlszelt:  { url: G('command_pavilion/medieval_command_pavilion_3d_runtime.glb') },
  lazarett:     { url: G('medical_tent/medieval_medical_tent_3d_runtime.glb') },
  feldschmiede: { url: G('field_forge/medieval_field_forge_3d_runtime.glb') },
  kochstelle:   { url: G('cooking_fire/medieval_camp_cooking_fire_3d_runtime.glb') },
  brunnen:      { url: G('camp_well/medieval_camp_well_3d_runtime.glb') },
  standarte:    { url: G('order_banner/medieval_order_banner_3d_runtime.glb') },
  feldaltar:    { url: G('field_shrine/medieval_field_shrine_3d_runtime.glb') },
  nachschub:    { url: G('supply_wagon/medieval_supply_wagon_3d_runtime.glb') },
  pferdekoppel: { url: G('horse_corral/medieval_horse_corral_3d_runtime.glb') },
};

export function hatCampGlb(id: string): boolean { return id in CAMP_GLB; }
export function campGlbKey(id: string): string { return `feldbau_glb_${id}`; }

const laeuft = new Set<string>();

// Backt EINE Bau-GLB lazy zu feldbau_glb_<id>. Ergebnis:
//   true  = die GLB-Textur ist da (jetzt frisch oder schon gecacht)
//   false = keine GLB kartiert / Bake scheitert / laeuft noch (Aufrufer nutzt
//           solange die feldbau_<id>-Fallback-Grafik).
// Idempotent + doppel-sicher (ein Bake je ID zur Zeit).
export async function backeCampSprite(tex: Phaser.Textures.TextureManager, id: string): Promise<boolean> {
  const key = campGlbKey(id);
  if (tex.exists(key)) return true;
  const def = CAMP_GLB[id];
  if (!def || laeuft.has(id)) return false;
  laeuft.add(id);
  try {
    const drehen = feldbauOptik(id).drehen * Math.PI / 180;
    const cv = await backeGlbProp(def.url, { groesse: 640, drehen, zielH: 340 });
    if (!tex.exists(key)) tex.addCanvas(key, cv)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    return true;
  } catch (e) {
    console.warn('[campGlb] Bake fehlgeschlagen (Fallback bleibt):', id, e);
    return false;
  } finally {
    laeuft.delete(id);
  }
}

// Baukasten: nach einer Drehungs-Aenderung muss neu gebacken werden.
export function verwerfeCampSprite(tex: Phaser.Textures.TextureManager, id: string): void {
  const key = campGlbKey(id);
  if (tex.exists(key)) tex.remove(key);
}

// VORWAERMEN (Autorbug R195 "kurz erscheint noch das alte Asset"): die Bakes
// laufen los, BEVOR ein Bau fertig ist - dann steht beim Aufstellen sofort das
// echte Modell da statt erst der Notgrafik. Nacheinander, damit nicht zehn
// GLB-Ladevorgaenge gleichzeitig das Bild anhalten.
export async function vorwaermeCampSprites(
  tex: Phaser.Textures.TextureManager,
  ids: readonly string[],
): Promise<void> {
  for (const id of ids) {
    if (!hatCampGlb(id) || tex.exists(campGlbKey(id))) continue;
    await backeCampSprite(tex, id);
  }
}
