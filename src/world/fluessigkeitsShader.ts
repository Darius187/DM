import Phaser from 'phaser';
import { findeFluessigkeitsRegionen, segmentiereBahn, type KachelRegion, type FlussSegment } from './fluessigkeitsRegionen';

export { findeFluessigkeitsRegionen, segmentiereBahn, type KachelRegion, type FlussSegment };

// =====================================================================
//  FLÜSSIGKEITS-SHADER  (portiert aus fluss.html, Runde 71)
//  Ein gerichteter Strömungs-Shader als ADDITIVER Boden-Overlay über
//  Wasser- bzw. Blut-Kacheln. Wiederverwendbar, zwei Paletten.
//
//  WICHTIG (Auftrag): Das hier ist KEIN neuer Boden-Renderer. Die
//  a.map-Daten (Kollision, Geschoss-Durchflug) bleiben UNANGETASTET -
//  nur die Optik liegt als eigenes Phaser-Shader-Objekt darüber. Die
//  alten Wasser-Tile-Sprites in der Region werden vom Aufrufer entfernt
//  (kein Doppel-Render), die IDs in a.map bleiben aber erhalten.
//
//  Phaser stellt dem Shader automatisch bereit:
//    time       (float)  - vergangene Sekunden       (= u_time aus fluss.html)
//    resolution (vec2)   - Anzeigegröße des Quads px  (= u_res)
//    iChannel0  (sampler) - gebundene Bett-Textur      (= u_bg)
//    fragCoord  (varying) - Pixelkoordinate            (uv = fragCoord/resolution)
//  Die Maus-Interaktion (u_points / inter()) aus fluss.html ist ENTFERNT
//  (ruhiger Fluss). Neu: uColor (Einfärbung), uFlowSpeed, uTurbulence.
// =====================================================================

// --- Master-Stellschrauben (CLAUDE.md: keine Magic Numbers, leicht änderbar) ---
export const FLUSS_SHADER = {
  aktiv: true,    // Gesamtschalter für den Overlay-Test
  wasser: true,   // T.WATER-Kacheln bekommen den Wasser-Shader
  // Standard AUS: der reich dekorierte Bossraum-Blutstrom (eigenes BloodFlow-
  // System) bleibt damit exakt wie er ist. Zum Vergleich auf true setzen.
  blut: false,    // T.BLUTSTROM-Kacheln bekommen den Blut-Shader
  tiefe: -9,      // Render-Tiefe: über dem Grund (-10/-11), unter Spieler/Objekten
  bettMax: 768,   // max. Kantenlänge der Bett-Textur (Performance/Speicher)
};

// ---------------------------------------------------------------------
//  Fragment-Shader (GLSL) - portiert, Maus raus, Uniforms umbenannt
// ---------------------------------------------------------------------
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float time;
uniform vec2  resolution;
uniform sampler2D iChannel0;

uniform float uFlowSpeed;
uniform float uTurbulence;
uniform float uFlowSign;
uniform vec3  uDeep;
uniform vec3  uSky;
uniform vec3  uSpec;
uniform vec2  uLight;
uniform float uAmbient;
uniform vec3  uColor;
uniform float uEdgeFade;
uniform float uShape;       // 0 = Fluss (Ufer links/rechts), 1 = See (ellipse, radial)
uniform float uAlphaFade;   // 0 = deckend, 1 = Ränder transparent (in Untergrund blenden)

varying vec2 fragCoord;

// ---- Stellschrauben ----
const float NSCALE  = 0.10;   // wie stark die Oberfläche kippt (Glanz/Verzerrung)
const float REFRACT = 0.04;   // Stärke der Lichtbrechung des Flussbetts

// ---- Simplex-Noise (Ashima Arts, public domain) ----
vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
vec2 mod289(vec2 x){ return x - floor(x*(1.0/289.0))*289.0; }
vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
  vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g; g.x = a0.x*x0.x + h.x*x0.y; g.yz = a0.yz*x12.xz + h.yz*x12.yw;
  return 130.0 * dot(m, g);
}

float fbm4(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*snoise(p); p*=2.0; a*=0.5; } return s; }
float fbm2(vec2 p){ float s=0.0,a=0.6; for(int i=0;i<2;i++){ s+=a*snoise(p); p*=2.2; a*=0.5; } return s; }

// Strömungsrichtung, leicht durch Rauschen variiert -> Wirbel statt starrer Fluss
vec2 flowDir(vec2 uv){
  vec2 base = uFlowSign * vec2(0.0, 1.0);
  float ang = snoise(uv*1.3 + time*0.04) * 0.45;
  float c = cos(ang), s = sin(ang);
  return mat2(c,-s,s,c) * base;
}

// Höhenfeld der Wasseroberfläche (Zwei-Phasen-Trick gegen sichtbares Wiederholen)
float wh(vec2 uv){
  vec2 dir = flowDir(uv);
  float t = time * uFlowSpeed;
  float p0 = fract(t), p1 = fract(t+0.5);
  float w0 = 1.0-abs(2.0*p0-1.0), w1 = 1.0-abs(2.0*p1-1.0);
  float dist = 0.55;
  float b0 = fbm4(uv*3.0 + dir*p0*dist);
  float b1 = fbm4(uv*3.0 + dir*p1*dist);
  float big = (b0*w0 + b1*w1)/(w0+w1);
  float fine = fbm2(uv*9.0 + dir*(time*uFlowSpeed*2.2));
  return big*0.65 + fine*0.35*uTurbulence;
}

vec3 normalAt(vec2 uv){
  float e = 1.6/resolution.y;
  float hL = wh(uv-vec2(e,0.0));
  float hR = wh(uv+vec2(e,0.0));
  float hD = wh(uv-vec2(0.0,e));
  float hU = wh(uv+vec2(0.0,e));
  float gx = (hR-hL)/(2.0*e);
  float gy = (hU-hD)/(2.0*e);
  return normalize(vec3(-gx*NSCALE, -gy*NSCALE, 1.0));
}

void main(){
  vec2 uv = fragCoord / resolution.xy;
  // Wie tief / wie viel Flüssigkeit quer (0 am trockenen Ufer, 1 in der Mitte).
  // uEdgeFade=0 -> überall voll (Pfütze/Becken), =1 -> Ufer wie im Fluss.
  // uShape=0 -> Fluss (Ufer links/rechts an uv.x), =1 -> ellipse (See, radial).
  float river = smoothstep(0.05,0.22,uv.x) * smoothstep(0.05,0.22,1.0-uv.x);
  float rad = length((uv-0.5)*2.0);
  float ellipse = smoothstep(1.0, 0.55, rad);
  float shape = mix(river, ellipse, uShape);
  float depth = mix(1.0, shape, uEdgeFade);
  vec3 n = normalAt(uv);

  // Brechung des Flussbetts
  vec2 refrUV = uv + n.xy * REFRACT * depth;
  vec3 bed = texture2D(iChannel0, clamp(refrUV,0.0,1.0)).rgb * uAmbient;

  // Flüssigkeitsfarbe: tiefer = mehr Eigenfarbe
  vec3 col = mix(bed, uDeep, depth*0.6);

  // Fresnel -> Himmelsspiegelung an flachen Winkeln
  float fres = pow(1.0 - clamp(n.z,0.0,1.0), 4.0);
  col = mix(col, uSky, fres*0.4*depth);

  // Glanzlicht (Sonne/Mond) + feines Funkeln
  vec3 V = vec3(0.0,0.0,1.0);
  vec3 L = normalize(vec3(uLight, 0.9));
  vec3 H = normalize(L+V);
  float sp = max(dot(n,H),0.0);
  col += pow(sp,90.0)  * uSpec * depth * 0.9;
  col += pow(sp,340.0) * uSpec * depth * 1.6;

  // Schaum an steilen Kämmen
  float slope = length(n.xy);
  float foam = smoothstep(0.18,0.42,slope) * depth;
  col = mix(col, vec3(0.90,0.94,0.95), foam*0.55*clamp(uTurbulence,0.0,1.4));

  // Ufer (depth~0) zeigen einfach das Bett
  vec3 finalCol = mix(bed, col, depth);

  // Globale Einfärbung (Wasser=neutral, Blut=rötlich)
  finalCol *= uColor;

  // sanfte Vignette
  vec2 q = uv-0.5; finalCol *= 1.0 - dot(q,q)*0.45;

  // uAlphaFade=0 -> deckend (Tile-Ersatz), =1 -> Ränder blenden in den
  // Untergrund (Canvas-Wasser) - so fügen sich geschwungene Flüsse/See
  // weich ein statt als harte Rechtecke.
  // Premultipliziertes Alpha (Phasers Standard-Blend ONE, ONE_MINUS_SRC_ALPHA).
  // alpha=1 -> deckend (Tile-Fall unverändert); <1 -> sauberer Übergang.
  float alpha = mix(1.0, clamp(shape, 0.0, 1.0), uAlphaFade);
  gl_FragColor = vec4(finalCol * alpha, alpha);
}
`;

// ---------------------------------------------------------------------
//  Presets: Wasser (blaugrün, normaler Fluss) & Blut (dunkelrot, zäh)
// ---------------------------------------------------------------------
export interface FluessigkeitPreset {
  bett: 'wasser' | 'blut';
  color: [number, number, number];    // uColor (multiplikativ)
  flowSpeed: number;                   // uFlowSpeed
  turbulence: number;                  // uTurbulence
  flowSign: number;                    // +1 abwärts, -1 aufwärts
  deep: [number, number, number];      // uDeep  - Eigenfarbe in der Tiefe
  sky: [number, number, number];       // uSky   - Spiegelung an flachen Winkeln
  spec: [number, number, number];      // uSpec  - Glanzlicht
  light: [number, number];             // uLight - Lichtrichtung
  ambient: number;                     // uAmbient - Helligkeit des Betts
  edgeFade: number;                    // uEdgeFade 0..1 (Ufer-Abfall)
}

export const WASSER_PRESET: FluessigkeitPreset = {
  bett: 'wasser',
  color: [1.0, 1.0, 1.0],
  flowSpeed: 0.13,
  turbulence: 0.7,
  flowSign: 1.0,
  deep: [0.10, 0.28, 0.30],
  sky: [0.55, 0.75, 0.92],
  spec: [1.0, 0.97, 0.88],
  light: [0.25, 0.65],
  ambient: 1.05,
  edgeFade: 1.0,
};

// Ruhiger See: langsamer und glatter als der Fluss (stehendes Gewässer).
export const SEE_PRESET: FluessigkeitPreset = {
  bett: 'wasser',
  color: [1.0, 1.0, 1.0],
  flowSpeed: 0.05,            // kaum Strömung
  turbulence: 0.28,           // glatte Oberfläche
  flowSign: 1.0,
  deep: [0.07, 0.20, 0.26],   // etwas tiefer/dunkler als der Fluss
  sky: [0.55, 0.75, 0.92],
  spec: [1.0, 0.97, 0.88],
  light: [0.25, 0.65],
  ambient: 1.0,
  edgeFade: 1.0,
};

export const BLUT_PRESET: FluessigkeitPreset = {
  bett: 'blut',
  color: [1.0, 0.86, 0.86],   // zusätzlicher Rotstich
  flowSpeed: 0.045,           // viel langsamer - zäh
  turbulence: 0.32,           // ruhiger - dickflüssig
  flowSign: 1.0,
  deep: [0.20, 0.015, 0.015], // tiefes Schwarzrot
  sky: [0.35, 0.06, 0.06],    // matte rote "Spiegelung"
  spec: [0.70, 0.20, 0.20],   // stumpfe rote Glanzpunkte
  light: [0.40, 0.50],
  ambient: 0.62,
  edgeFade: 0.85,
};

// ---------------------------------------------------------------------
//  Flussbett-Textur (Canvas -> Phaser-Textur), zwei Paletten
//  Portiert aus buildRiverbed(); als wiederverwendbare, gestreckte
//  Textur (eine pro Palette genügt - der Shader streckt sie in 0..1 UV).
// ---------------------------------------------------------------------
interface BettPalette {
  verlauf: [string, string, string, string, string];  // quer: Ufer..Mitte..Ufer
  fleck: string;                                       // weiche Tiefenflecken (rgba)
  kiesel: string[];                                    // Streukörner
  brocken: string[];                                   // größere Brocken
  ufer: [string, string, string];                      // Ufer-Verlauf
  streuHell: string; streuDunkel: string;              // Ufer-Streukörner (rgba)
}

const PALETTEN: Record<'wasser' | 'blut', BettPalette> = {
  wasser: {
    verlauf: ['#6f6a55', '#5b6253', '#39463f', '#5b6253', '#6f6a55'],
    fleck: 'rgba(18,28,26,0.18)',
    kiesel: ['#7d7768', '#8c8676', '#69635a', '#9a9180', '#5f5b51', '#888070', '#736d61'],
    brocken: ['#6a655b', '#585249', '#777063'],
    ufer: ['#3f4a2a', '#4a5530', '#2f3a22'],
    streuHell: 'rgba(90,110,55,0.5)', streuDunkel: 'rgba(40,55,28,0.5)',
  },
  blut: {
    verlauf: ['#3a1414', '#4a1010', '#1c0505', '#4a1010', '#3a1414'],
    fleck: 'rgba(46,4,4,0.28)',
    kiesel: ['#5a1414', '#6a1818', '#3a0c0c', '#7a1212', '#2e0808', '#601010', '#430a0a'],
    brocken: ['#5a1010', '#3e0a0a', '#6c1414'],
    ufer: ['#3a1212', '#4a1818', '#220707'],
    streuHell: 'rgba(120,28,28,0.5)', streuDunkel: 'rgba(50,10,10,0.5)',
  },
};

function clampB(v: number): number { return v < 0 ? 0 : v > 255 ? 255 : v; }
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${clampB((n >> 16) + amt)},${clampB(((n >> 8) & 255) + amt)},${clampB((n & 255) + amt)})`;
}

/** Zeichnet ein Flussbett der gewählten Palette in einen 2D-Kontext. */
export function zeichneFlussbett(x: CanvasRenderingContext2D, w: number, h: number, pal: BettPalette): void {
  const pick = <T>(a: T[]): T => a[(Math.random() * a.length) | 0];
  const bankW = Math.round(w * 0.15);

  // Grundverlauf quer: am Ufer heller, in der Mitte tiefer
  const g = x.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0.00, pal.verlauf[0]); g.addColorStop(0.15, pal.verlauf[1]);
  g.addColorStop(0.50, pal.verlauf[2]); g.addColorStop(0.85, pal.verlauf[3]);
  g.addColorStop(1.00, pal.verlauf[4]);
  x.fillStyle = g; x.fillRect(0, 0, w, h);

  // weiche Tiefenflecken
  for (let d = 0; d < 40; d++) {
    const bx = w * 0.2 + Math.random() * w * 0.6, by = Math.random() * h, br = 60 + Math.random() * 160;
    const rg = x.createRadialGradient(bx, by, 0, bx, by, br);
    rg.addColorStop(0, pal.fleck); rg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = rg; x.fillRect(bx - br, by - br, br * 2, br * 2);
  }

  // Kiesel / Brocken
  const pebble = (px: number, py: number, r: number, col: string): void => {
    x.save(); x.translate(px, py); x.rotate(Math.random() * Math.PI);
    x.scale(1, 0.55 + Math.random() * 0.3);
    const pg = x.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    pg.addColorStop(0, shade(col, 40)); pg.addColorStop(0.7, col); pg.addColorStop(1, shade(col, -18));
    x.fillStyle = pg; x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.fill();
    x.restore();
  };
  const anzahl = Math.min(2500, Math.round(w * h / 1100));
  for (let p = 0; p < anzahl; p++) pebble(bankW + Math.random() * (w - 2 * bankW), Math.random() * h, 2 + Math.random() * 6, pick(pal.kiesel));
  for (let q = 0; q < 14; q++) pebble(bankW + Math.random() * (w - 2 * bankW), Math.random() * h, 12 + Math.random() * 22, pick(pal.brocken));

  // Ufer links/rechts mit unregelmäßigem Rand
  const bank = (side: number): void => {
    x.save(); x.beginPath();
    if (side < 0) {
      x.moveTo(0, 0);
      for (let yy = 0; yy <= h; yy += 18) { const e = bankW + Math.sin(yy * 0.025) * 16 + Math.sin(yy * 0.07) * 8 + (Math.random() * 8 - 4); x.lineTo(e, yy); }
      x.lineTo(0, h);
    } else {
      x.moveTo(w, 0);
      for (let yy = 0; yy <= h; yy += 18) { const e = w - bankW - Math.sin(yy * 0.025) * 16 - Math.sin(yy * 0.07) * 8 - (Math.random() * 8 - 4); x.lineTo(e, yy); }
      x.lineTo(w, h);
    }
    x.closePath(); x.clip();
    const bg = x.createLinearGradient(side < 0 ? 0 : w, 0, side < 0 ? bankW * 1.4 : w - bankW * 1.4, 0);
    bg.addColorStop(0, pal.ufer[0]); bg.addColorStop(0.7, pal.ufer[1]); bg.addColorStop(1, pal.ufer[2]);
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    const streu = Math.round(h * bankW / 120);
    for (let s = 0; s < streu; s++) {
      const sx = side < 0 ? Math.random() * bankW * 1.2 : w - Math.random() * bankW * 1.2;
      x.fillStyle = Math.random() > 0.5 ? pal.streuHell : pal.streuDunkel;
      x.beginPath(); x.arc(sx, Math.random() * h, 1 + Math.random() * 2.2, 0, Math.PI * 2); x.fill();
    }
    x.restore();
  };
  bank(-1); bank(1);
}

/**
 * Legt (einmalig) die Bett-Textur einer Palette als Phaser-Canvas-Textur an.
 * Gibt den Texturschlüssel zurück. Eine Textur pro Palette genügt.
 */
export function baueFlussbett(scene: Phaser.Scene, palette: 'wasser' | 'blut'): string {
  const key = `fluss_bett_${palette}`;
  if (scene.textures.exists(key)) return key;
  // Hochformat (typischer senkrechter Fluss); wird vom Shader gestreckt.
  const w = Math.round(FLUSS_SHADER.bettMax * 0.42), h = FLUSS_SHADER.bettMax;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return key;
  zeichneFlussbett(tex.context, w, h, PALETTEN[palette]);
  tex.refresh();
  return key;
}

// ---------------------------------------------------------------------
//  Spawn: ein Shader-Quad über einer Pixel-Region anlegen
// ---------------------------------------------------------------------
let baseShader: Phaser.Display.BaseShader | null = null;

function getBaseShader(): Phaser.Display.BaseShader {
  if (baseShader) return baseShader;
  // Eine geteilte BaseShader-Instanz (ein Compile) - die Werte werden pro
  // Objekt kopiert (Phaser deep-extended this.uniforms beim setShader).
  const uniforms = {
    uFlowSpeed: { type: '1f', value: 0.13 },
    uTurbulence: { type: '1f', value: 0.7 },
    uFlowSign: { type: '1f', value: 1.0 },
    uDeep: { type: '3f', value: { x: 0.1, y: 0.28, z: 0.3 } },
    uSky: { type: '3f', value: { x: 0.55, y: 0.75, z: 0.92 } },
    uSpec: { type: '3f', value: { x: 1.0, y: 0.97, z: 0.88 } },
    uLight: { type: '2f', value: { x: 0.25, y: 0.65 } },
    uAmbient: { type: '1f', value: 1.05 },
    uColor: { type: '3f', value: { x: 1.0, y: 1.0, z: 1.0 } },
    uEdgeFade: { type: '1f', value: 1.0 },
    uShape: { type: '1f', value: 0.0 },
    uAlphaFade: { type: '1f', value: 0.0 },
  };
  baseShader = new Phaser.Display.BaseShader('fluessigkeit', FRAG, undefined, uniforms);
  return baseShader;
}

export interface PixelRegion { x: number; y: number; w: number; h: number; }

export interface SpawnOpts {
  depth?: number;               // Render-Tiefe (Standard: FLUSS_SHADER.tiefe)
  origin?: [number, number];    // Ursprung (Standard [0,0]; Segmente/See [0.5,0.5])
  angleRad?: number;            // Rotation - für Fluss-Segmente entlang der Strömung
  shape?: number;               // 0 Fluss (Ufer l/r), 1 See (ellipse)
  alphaFade?: number;           // 0 deckend, 1 Ränder blenden in den Untergrund
}

/** Setzt alle Preset-Uniformen auf ein bestehendes Shader-Objekt (auch live, für Regler). */
export function wendeFluessigkeitPreset(sh: Phaser.GameObjects.Shader, preset: FluessigkeitPreset): void {
  sh.setUniform('uFlowSpeed.value', preset.flowSpeed);
  sh.setUniform('uTurbulence.value', preset.turbulence);
  sh.setUniform('uFlowSign.value', preset.flowSign);
  sh.setUniform('uDeep.value', { x: preset.deep[0], y: preset.deep[1], z: preset.deep[2] });
  sh.setUniform('uSky.value', { x: preset.sky[0], y: preset.sky[1], z: preset.sky[2] });
  sh.setUniform('uSpec.value', { x: preset.spec[0], y: preset.spec[1], z: preset.spec[2] });
  sh.setUniform('uLight.value', { x: preset.light[0], y: preset.light[1] });
  sh.setUniform('uAmbient.value', preset.ambient);
  sh.setUniform('uColor.value', { x: preset.color[0], y: preset.color[1], z: preset.color[2] });
  sh.setUniform('uEdgeFade.value', preset.edgeFade);
}

/** Kern: ein Shader-Quad (x,y = Welt-Pixel) anlegen und konfigurieren. */
export function macheFluessigkeitsShader(scene: Phaser.Scene, x: number, y: number, w: number, h: number, preset: FluessigkeitPreset, opts: SpawnOpts = {}): Phaser.GameObjects.Shader {
  const bettKey = baueFlussbett(scene, preset.bett);
  const sh = scene.add.shader(getBaseShader(), x, y, w, h, [bettKey]);
  const [ox, oy] = opts.origin ?? [0, 0];
  sh.setOrigin(ox, oy).setDepth(opts.depth ?? FLUSS_SHADER.tiefe);
  if (opts.angleRad) sh.setRotation(opts.angleRad);
  wendeFluessigkeitPreset(sh, preset);
  sh.setUniform('uShape.value', opts.shape ?? 0);
  sh.setUniform('uAlphaFade.value', opts.alphaFade ?? 0);
  return sh;
}

/**
 * Tile-Variante: deckendes Quad über einer achsenparallelen Region (Welt-Pixel),
 * Tiefe FLUSS_SHADER.tiefe. Für WorldScene-Wasser/Blut-Kacheln.
 */
export function spawneFluessigkeit(scene: Phaser.Scene, region: PixelRegion, preset: FluessigkeitPreset): Phaser.GameObjects.Shader {
  return macheFluessigkeitsShader(scene, region.x, region.y, region.w, region.h, preset, {});
}

/**
 * Ein gedrehtes Fluss-Segment: das Quad zeigt mit seiner Höhe stromabwärts
 * (angleRad), die Breite quer zum Fluss. Ränder blenden weich (alphaFade=1),
 * damit geschwungene Läufe nahtlos aneinander- und in den Untergrund passen.
 */
export function spawneFlussSegment(scene: Phaser.Scene, seg: FlussSegment, preset: FluessigkeitPreset, depth: number): Phaser.GameObjects.Shader {
  return macheFluessigkeitsShader(scene, seg.cx, seg.cy, seg.breite, seg.laenge, preset, {
    origin: [0.5, 0.5], angleRad: seg.angleRad, depth, alphaFade: 1, shape: 0,
  });
}

/** Ein ruhiger See: ellipse-geformtes Quad (radialer Abfall, weiche Ränder). */
export function spawneSee(scene: Phaser.Scene, cx: number, cy: number, w: number, h: number, preset: FluessigkeitPreset, depth: number): Phaser.GameObjects.Shader {
  return macheFluessigkeitsShader(scene, cx, cy, w, h, preset, {
    origin: [0.5, 0.5], depth, alphaFade: 1, shape: 1,
  });
}

