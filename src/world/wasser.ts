import Phaser from 'phaser';
import { baueWasserfeldDaten, feldGroesse, type WasserGeometrie } from './wasserFeld';

export type { WasserGeometrie, WasserBahn, SeeEllipse, BahnPunkt } from './wasserFeld';

// =====================================================================
//  WASSER (Runde 72) - komplett neuer Liquid-Shader, faithful portiert aus
//  reference/fluss-bach.html. Anders als der alte fluessigkeitsShader:
//   - prozedurales VORONOI-FLUSSBETT (Kiesel/Kies/Sand) wie in der Referenz
//   - Zwei-Lagen-Oberfläche mit Wellenfeinheit (uWaveScale) + Zwei-Phasen-Trick
//   - weiche Ufer: ALLE Effekte x Tiefe; Rand blendet transparent (Overlay)
//   - Form + Strömung kommen aus EINEM gebackenen Wasserfeld (wasserFeld.ts) ->
//     ein Layer pro Karte, exakte organische Form (kein Rechteck-Streifen).
//
//  Phaser liefert automatisch: time (s), resolution (vec2 px), fragCoord (varying).
//  iChannel0 = Wasserfeld (rg = Strömung, b = weiche Maske).
// =====================================================================

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
// WASSER_DEBUG_FELD: zum Prüfen der Feld-Bindung den b-Kanal direkt ausgeben.

uniform float time;
uniform vec2  resolution;
uniform sampler2D iChannel0;   // Wasserfeld: rg = Strömung, b = weiche Maske

uniform float uFlowSpeed;
uniform float uTurbulence;
uniform float uFlowSign;
uniform vec3  uDeep;
uniform vec3  uSky;
uniform vec3  uSpec;
uniform vec2  uLight;
uniform float uAmbient;
uniform vec3  uColor;
uniform vec3  uBedShallow;
uniform vec3  uBedDeep;
uniform float uTint;
uniform float uTurbidity;
uniform float uGloss;
uniform float uBed;
uniform float uSand;
uniform float uWaveScale;
uniform float uNscale;
uniform float uRefract;
uniform float uBedScale;

varying vec2 fragCoord;

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

vec2 hash2(vec2 p){ p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }

// Voronoi (F1,F2) wie in der Referenz - leicht durch fbm verzerrt
vec2 vor(vec2 p){
  p += 0.35*vec2(fbm2(p*1.6), fbm2(p*1.6+7.3));
  vec2 n=floor(p), f=fract(p); float f1=8.0,f2=8.0;
  for(int j=-1;j<=1;j++){ for(int i=-1;i<=1;i++){
    vec2 g=vec2(float(i),float(j)); vec2 o=hash2(n+g); float d=dot(g+o-f,g+o-f);
    if(d<f1){ f2=f1; f1=d; } else if(d<f2){ f2=d; }
  } }
  return vec2(sqrt(f1), sqrt(f2));
}

// Flussbett: Voronoi-Steine + Fugen + Kies + Sandflecken (Referenz riverbed())
vec3 riverbed(vec2 p, float deepness){
  vec3 base = mix(uBedShallow, uBedDeep, deepness);
  vec2 vB = vor(p*7.5); float stoneB=smoothstep(0.34,0.04,vB.x); float fugeB=smoothstep(0.0,0.11,vB.y-vB.x);
  base = mix(base, base*1.32, stoneB*0.45*uBed); base *= mix(1.0, 0.62+0.38*fugeB, uBed);
  vec2 vL = vor(p*19.0); float kies=smoothstep(0.0,0.26,vL.x); base *= mix(1.0, 0.80+0.32*kies, uBed);
  float sandPatch = smoothstep(0.44,0.78, fbm4(p*6.0+30.0)*0.5+0.5);
  base = mix(base, base*1.18+vec3(0.05,0.043,0.022), sandPatch*uSand*(1.0-deepness*0.55));
  base *= 0.9 + 0.2*fbm4(p*44.0)*uBed;
  return base;
}

// Strömungsrichtung: Feld-Basis + sanftes Mäandern (Turbulenz dreht leicht)
vec2 flowDir(vec2 uv, vec2 base){
  float ang = snoise(uv*uWaveScale*0.25 + time*0.04) * 0.4 * uTurbulence;
  float c=cos(ang), s=sin(ang);
  return mat2(c,-s,s,c) * base;
}

// Höhenfeld: große Welle (fbm4) + feine Welle (fbm2), Turbulenz nur Amplitude
// der FEINEN Welle. Zwei-Phasen-Trick (Dreieck-Gewichte) gegen Wiederholung.
float wh(vec2 uv, vec2 base, float spd){
  vec2 dir = flowDir(uv, base);
  float t = time*uFlowSpeed; float p0=fract(t), p1=fract(t+0.5);
  float w0=1.0-abs(2.0*p0-1.0), w1=1.0-abs(2.0*p1-1.0); float dist=0.55*spd;
  float b0 = fbm4(uv*uWaveScale + dir*p0*dist);
  float b1 = fbm4(uv*uWaveScale + dir*p1*dist);
  float big = (b0*w0 + b1*w1)/(w0+w1);
  float fine = fbm2(uv*uWaveScale*2.6 + dir*(time*uFlowSpeed*2.2*spd));
  return big*0.65 + fine*0.35*uTurbulence;
}

vec3 normalAt(vec2 uv, vec2 base, float spd){
  float e = 1.6/resolution.y;
  float hL=wh(uv-vec2(e,0.0),base,spd), hR=wh(uv+vec2(e,0.0),base,spd);
  float hD=wh(uv-vec2(0.0,e),base,spd), hU=wh(uv+vec2(0.0,e),base,spd);
  float gx=(hR-hL)/(2.0*e), gy=(hU-hD)/(2.0*e);
  return normalize(vec3(-gx*uNscale, -gy*uNscale, 1.0));
}

void main(){
  vec2 uv = fragCoord / resolution.xy;
  vec4 fld = texture2D(iChannel0, uv);
#ifdef WASSER_DEBUG_FELD
  gl_FragColor = vec4(fld.b, fld.b, fld.b, 1.0); return;
#endif
  float wet = smoothstep(0.06, 0.5, fld.b);          // weiche Wassermaske
  if (wet <= 0.002) { gl_FragColor = vec4(0.0); return; }  // Land: transparent
  float deepness = smoothstep(0.42, 0.96, fld.b);    // tief in der Mitte

  vec2 fl = (fld.rg - 0.5) * 2.0; float fmag = length(fl);
  vec2 base = (fmag > 0.05 ? normalize(fl) : vec2(0.0,1.0)) * clamp(fmag*1.4, 0.12, 1.0) * uFlowSign;

  float spd = mix(1.0, 0.4, deepness);               // tiefes Wasser fließt ruhiger
  vec3 n = normalAt(uv, base, spd);

  // Flussbett (mit Lichtbrechung), tieferes Wasser nimmt mehr Eigenfarbe an
  vec2 rp = (uv + n.xy*uRefract*wet) * uBedScale;
  vec3 bed = riverbed(rp, deepness) * uAmbient;
  vec3 col = mix(bed, uDeep, wet * mix(uTurbidity, 1.0, deepness) * uTint);

  // Fresnel -> Himmelsspiegelung an flachen Winkeln
  float fres = pow(1.0 - clamp(n.z,0.0,1.0), 4.0);
  col = mix(col, uSky, fres*0.4*wet);

  // Glanzlicht (Sonne/Mond) + feines Funkeln
  vec3 V = vec3(0.0,0.0,1.0);
  vec3 L = normalize(vec3(uLight, 0.9));
  vec3 H = normalize(L+V);
  float sp = max(dot(n,H),0.0);
  col += pow(sp,90.0)  * uSpec * wet * 0.9 * uGloss;
  col += pow(sp,340.0) * uSpec * wet * 1.6 * uGloss;

  // Schaum an steilen Kämmen (mit Turbulenz)
  float slope = length(n.xy);
  float foam = smoothstep(0.18,0.42,slope) * wet;
  col = mix(col, vec3(0.90,0.94,0.95), foam*0.45*clamp(uTurbulence,0.0,1.0));

  col *= uColor;
  // Premultipliziertes Alpha (Phaser-Standard-Blend): Rand blendet weich in den
  // Untergrund (Boden-Kacheln scheinen am Ufer durch).
  float alpha = clamp(wet, 0.0, 1.0);
  gl_FragColor = vec4(col*alpha, alpha);
}
`;

// ---------------------------------------------------------------------
//  Presets - Werte aus der Referenz ("Tag"-Stimmung + Standard-Regler)
// ---------------------------------------------------------------------
export interface WasserPreset {
  color: [number, number, number];
  flowSpeed: number;
  turbulence: number;
  flowSign: number;
  deep: [number, number, number];
  sky: [number, number, number];
  spec: [number, number, number];
  light: [number, number];
  ambient: number;
  bedShallow: [number, number, number];
  bedDeep: [number, number, number];
  tint: number;
  turbidity: number;
  gloss: number;
  bed: number;
  sand: number;
}

export const WASSER: WasserPreset = {
  color: [1.0, 1.0, 1.0],
  flowSpeed: 0.13,
  turbulence: 0.0,            // Referenz-Standard: ruhige große Welle (Turbulenz 0)
  flowSign: 1.0,
  deep: [0.08, 0.24, 0.27],
  sky: [0.55, 0.75, 0.92],
  spec: [1.0, 0.97, 0.88],
  light: [0.25, 0.65],
  ambient: 1.05,
  bedShallow: [0.40, 0.369, 0.298],   // #665e4c
  bedDeep: [0.129, 0.161, 0.161],     // #212929
  tint: 0.65,
  turbidity: 0.4,
  gloss: 0.4,
  bed: 1.0,
  sand: 0.5,
};

// Ruhiger See: kaum Strömung, etwas tiefer/dunkler, glatter.
export const SEE: WasserPreset = {
  ...WASSER,
  flowSpeed: 0.05,
  turbulence: 0.0,
  deep: [0.07, 0.20, 0.26],
  gloss: 0.5,
};

// Blutstrom: dunkelrot, zäh, langsam.
export const BLUT: WasserPreset = {
  ...WASSER,
  color: [1.0, 0.86, 0.86],
  flowSpeed: 0.045,
  turbulence: 0.0,
  deep: [0.20, 0.015, 0.015],
  sky: [0.35, 0.06, 0.06],
  spec: [0.70, 0.20, 0.20],
  light: [0.40, 0.50],
  ambient: 0.62,
  bedShallow: [0.227, 0.078, 0.078],
  bedDeep: [0.110, 0.020, 0.020],
  tint: 0.8,
  turbidity: 0.6,
  gloss: 0.35,
};

// ---------------------------------------------------------------------
//  Master-Stellschrauben + dev-tunbare Globale (Regler greifen hier zu)
// ---------------------------------------------------------------------
export const WASSER_CFG = {
  tiefe: -9,          // Render-Tiefe: über Boden (-10/-11), unter Spieler/Objekten
  feldScale: 5,       // Welt-Pixel pro Feldzelle (Maske/Strömung-Auflösung)
  bedProWelt: 90,     // uBedScale ≈ worldW / bedProWelt (Kiesel-Korngröße)
  waveProWelt: 170,   // uWaveScale ≈ worldW / waveProWelt (Wellenfeinheit)
  // Live-Regler (Dev): multiplikativ/überschreibend auf alle Wasser-Shader.
  flowMul: 1.0,       // Fließ-Tempo-Faktor
  turbAdd: 0.0,       // Wirbel zusätzlich
  ambientMul: 1.0,    // Helligkeit-Faktor
};

let baseShader: Phaser.Display.BaseShader | null = null;
function getBaseShader(): Phaser.Display.BaseShader {
  if (baseShader) return baseShader;
  const u = {
    uFlowSpeed: { type: '1f', value: 0.13 },
    uTurbulence: { type: '1f', value: 0.0 },
    uFlowSign: { type: '1f', value: 1.0 },
    uDeep: { type: '3f', value: { x: 0.08, y: 0.24, z: 0.27 } },
    uSky: { type: '3f', value: { x: 0.55, y: 0.75, z: 0.92 } },
    uSpec: { type: '3f', value: { x: 1.0, y: 0.97, z: 0.88 } },
    uLight: { type: '2f', value: { x: 0.25, y: 0.65 } },
    uAmbient: { type: '1f', value: 1.05 },
    uColor: { type: '3f', value: { x: 1.0, y: 1.0, z: 1.0 } },
    uBedShallow: { type: '3f', value: { x: 0.4, y: 0.369, z: 0.298 } },
    uBedDeep: { type: '3f', value: { x: 0.129, y: 0.161, z: 0.161 } },
    uTint: { type: '1f', value: 0.65 },
    uTurbidity: { type: '1f', value: 0.4 },
    uGloss: { type: '1f', value: 0.4 },
    uBed: { type: '1f', value: 1.0 },
    uSand: { type: '1f', value: 0.5 },
    uWaveScale: { type: '1f', value: 24.0 },
    uNscale: { type: '1f', value: 0.1 },
    uRefract: { type: '1f', value: 0.05 },
    uBedScale: { type: '1f', value: 46.0 },
  };
  baseShader = new Phaser.Display.BaseShader('wasser', FRAG, undefined, u);
  return baseShader;
}

function v3(c: [number, number, number]): { x: number; y: number; z: number } { return { x: c[0], y: c[1], z: c[2] }; }

/** Setzt alle Preset-Uniformen (auch live für Regler) auf ein Shader-Objekt. */
export function wendeWasserPreset(sh: Phaser.GameObjects.Shader, p: WasserPreset): void {
  sh.setUniform('uFlowSpeed.value', p.flowSpeed * WASSER_CFG.flowMul);
  sh.setUniform('uTurbulence.value', Math.max(0, p.turbulence + WASSER_CFG.turbAdd));
  sh.setUniform('uFlowSign.value', p.flowSign);
  sh.setUniform('uDeep.value', v3(p.deep));
  sh.setUniform('uSky.value', v3(p.sky));
  sh.setUniform('uSpec.value', v3(p.spec));
  sh.setUniform('uLight.value', { x: p.light[0], y: p.light[1] });
  sh.setUniform('uAmbient.value', p.ambient * WASSER_CFG.ambientMul);
  sh.setUniform('uColor.value', v3(p.color));
  sh.setUniform('uBedShallow.value', v3(p.bedShallow));
  sh.setUniform('uBedDeep.value', v3(p.bedDeep));
  sh.setUniform('uTint.value', p.tint);
  sh.setUniform('uTurbidity.value', p.turbidity);
  sh.setUniform('uGloss.value', p.gloss);
  sh.setUniform('uBed.value', p.bed);
  sh.setUniform('uSand.value', p.sand);
}

/**
 * Backt das Wasserfeld einer Karte (Maske + Strömung) in eine Phaser-Textur.
 * Gibt den Texturschlüssel zurück. Niedrige Auflösung + LINEAR-Filter = weiche
 * organische Ufer (kein Pixel-Raster sichtbar).
 */
export function baueWasserfeld(scene: Phaser.Scene, key: string, geo: WasserGeometrie, worldW: number, worldH: number, scale = WASSER_CFG.feldScale): string {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const { w, h } = feldGroesse(worldW, worldH, scale);
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return key;
  const data = baueWasserfeldDaten(worldW, worldH, scale, geo);
  const img = tex.context.createImageData(w, h);
  img.data.set(data);
  tex.context.putImageData(img, 0, 0);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return key;
}

/**
 * Spawnt EIN Wasser-Quad über die ganze Karte, maskiert durchs gebackene Feld.
 * worldW/worldH = Kartengröße in Welt-Pixeln. Liefert das Shader-Objekt
 * (für Live-Regler / Cleanup beim Area-Wechsel).
 */
export function spawneWasser(scene: Phaser.Scene, feldKey: string, worldW: number, worldH: number, preset: WasserPreset, depth = WASSER_CFG.tiefe): Phaser.GameObjects.Shader {
  const sh = scene.add.shader(getBaseShader(), 0, 0, worldW, worldH);
  // Feld als iChannel0 binden - CLAMP statt REPEAT (wir sampeln nur uv 0..1; ein
  // NPOT-Feld + REPEAT liefert in WebGL1 eine unvollständige (schwarze) Textur).
  sh.setSampler2D('iChannel0', feldKey, 0, { repeat: false, wrapS: 'clamp_to_edge', wrapT: 'clamp_to_edge', minFilter: 'linear', magFilter: 'linear' });
  sh.setOrigin(0, 0).setDepth(depth);
  wendeWasserPreset(sh, preset);
  sh.setUniform('uWaveScale.value', Math.max(6, worldW / WASSER_CFG.waveProWelt));
  sh.setUniform('uBedScale.value', Math.max(12, worldW / WASSER_CFG.bedProWelt));
  return sh;
}
