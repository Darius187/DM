import { WebGPURenderer } from "three/webgpu";

export interface RendererResult {
  renderer: WebGPURenderer;
  // true = echtes WebGPU aktiv, false = WebGL2-Fallback
  isWebGPU: boolean;
  label: string;
}

// Erzeugt den WebGPURenderer. Faellt automatisch sauber auf WebGL2 zurueck,
// wenn WebGPU im Browser nicht verfuegbar ist. forceWebGL erzwingt den
// Fallback (z. B. ueber ?webgl in der URL zum Testen der Fallback-Pfade).
export async function createRenderer(
  canvas: HTMLCanvasElement,
  forceWebGL = false,
): Promise<RendererResult> {
  const hasWebGPU = !forceWebGL && typeof navigator !== "undefined" && "gpu" in navigator;

  const renderer = new WebGPURenderer({
    canvas,
    antialias: true,
    // Wenn kein WebGPU vorhanden ist, direkt den WebGL2-Backend erzwingen,
    // damit init() nicht erst scheitern muss.
    forceWebGL: !hasWebGPU,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  try {
    await renderer.init();
  } catch (err) {
    // Letzter Rettungsanker: hart auf WebGL2 zwingen.
    console.warn("WebGPU-Init fehlgeschlagen, Fallback auf WebGL2:", err);
    (renderer as unknown as { forceWebGL: boolean }).forceWebGL = true;
    await renderer.init();
  }

  // Backend pruefen: WebGPUBackend traegt isWebGPUBackend = true.
  const backend = renderer.backend as { isWebGPUBackend?: boolean };
  const isWebGPU = backend?.isWebGPUBackend === true;

  return {
    renderer,
    isWebGPU,
    label: isWebGPU ? "WebGPU" : "WebGL2 (Fallback)",
  };
}
