import { describe, expect, it } from 'vitest';
import { berechneAdaptiveRenderAufloesung } from '../src/demo3d/renderAufloesung';

describe('adaptive 3D-Gebaeude-Aufloesung', () => {
  it('deckt Spritegroesse, Kamerazoom und DPR ohne Hochskalierung ab', () => {
    expect(berechneAdaptiveRenderAufloesung({
      displayWidth: 975,
      displayHeight: 975,
      kameraZoom: 1.3,
      devicePixelRatio: 1,
    })).toEqual({
      pixelRatio: 1,
      bildschirmWidth: 1267.5,
      bildschirmHeight: 1267.5,
      renderWidth: 1268,
      renderHeight: 1268,
    });
  });

  it('begrenzt DPR auf zwei und die Renderseite auf die GPU-sichere Obergrenze', () => {
    expect(berechneAdaptiveRenderAufloesung({
      displayWidth: 2200,
      displayHeight: 1800,
      kameraZoom: 1.4,
      devicePixelRatio: 3,
    })).toMatchObject({ pixelRatio: 2, renderWidth: 4096, renderHeight: 4096 });
  });
});
