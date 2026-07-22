export const MAX_GEBAEUDE_PIXEL_RATIO = 2;
export const MAX_GEBAEUDE_RENDER_SEITE = 4096;

export interface AdaptiveRenderEingabe {
  displayWidth: number;
  displayHeight: number;
  kameraZoom: number;
  devicePixelRatio: number;
  maxSeite?: number;
}

export interface AdaptiveRenderErgebnis {
  pixelRatio: number;
  bildschirmWidth: number;
  bildschirmHeight: number;
  renderWidth: number;
  renderHeight: number;
}

// Phaser skaliert die Welt erst durch die Sprite-Displaygroesse und danach
// durch den Weltkamera-Zoom. Das Three-Offscreen-Canvas muss deshalb diese
// tatsaechliche Bildschirmgroesse in physischen Geraetepixeln abdecken.
export function berechneAdaptiveRenderAufloesung(e: AdaptiveRenderEingabe): AdaptiveRenderErgebnis {
  const pixelRatio = Math.min(MAX_GEBAEUDE_PIXEL_RATIO, Math.max(1, Number.isFinite(e.devicePixelRatio) ? e.devicePixelRatio : 1));
  const kameraZoom = Math.max(0.01, Number.isFinite(e.kameraZoom) ? e.kameraZoom : 1);
  const bildschirmWidth = Math.max(1, e.displayWidth * kameraZoom);
  const bildschirmHeight = Math.max(1, e.displayHeight * kameraZoom);
  const maxSeite = Math.max(1, e.maxSeite ?? MAX_GEBAEUDE_RENDER_SEITE);
  return {
    pixelRatio,
    bildschirmWidth,
    bildschirmHeight,
    renderWidth: Math.min(maxSeite, Math.ceil(bildschirmWidth * pixelRatio)),
    renderHeight: Math.min(maxSeite, Math.ceil(bildschirmHeight * pixelRatio)),
  };
}
