import Phaser from 'phaser';
import { geometrieZuUniforms, MAX_SEG, MAX_LAKE, type WasserGeometrie } from './wasserFeld';

export type { WasserGeometrie, WasserBahn, SeeEllipse, BahnPunkt } from './wasserFeld';

// =====================================================================
//  WASSER (Runde 72) - prozeduraler Liquid-Shader, faithful aus
//  reference/fluss-bach.html (+ Autor-Übergabenotiz). KEINE Masken-Textur:
//  die Wasserform entsteht im Shader über Abstandsfunktionen (SDF) + smin.
//  Datengetrieben: der Flusslauf kommt als Segment-/See-Uniforms PRO KARTE
//  (aus der gezeichneten Skizze), nicht als fest verdrahtete sdMain/sdBrook.
//
//  u_layerMode: 0 = ganze Szene inkl. prozeduralem Gras (wie der Prototyp,
//  zum Vergleichen); 1 = Land transparent, nur Wasser/Bett/Kiesel (Layer über
//  dem echten Terrain, unter den Spielfiguren).
//
//  Phaser stellt time (s) und resolution (vec2 px) automatisch bereit,
//  fragCoord ist Phasers Default-Varying.
// =====================================================================

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 fragCoord;
uniform float time;
uniform vec2  resolution;

uniform float u_speed, u_turb, u_wake, u_bed, u_refract, u_tint, u_shore;
uniform float u_wavescale, u_nscale, u_gloss, u_turbidity, u_bank, u_emerge, u_sand;
uniform float u_procDensity, u_procSize, u_flowDir, u_layerMode;
uniform float u_detailScale;   // skaliert Bett/Wellen/Kiesel auf Bildschirmgröße (große Karten)
uniform float u_widthMul;      // Live-Flussbreite: skaliert die Segment-Halbbreiten (Bäche/Flüsse)
uniform float u_overlayFeather;// Overlay: Breite der Alpha-Blende Land(Shader)->Gras(dorfSim) hinter dem Ufersaum
uniform float u_rain;          // Regenstärke 0..1: Regentropfen-Kreise auf der Wasseroberfläche
// Untergrund-Textur (R72k): der ECHT gerenderte dorfSim-Boden. Damit rendert das
// Overlay den Übergang Boden->Wasser DECKEND (kein Alpha-Blending über unbekanntem
// Boden -> kein heller Saum). u_scroll/u_view = Kamera-Versatz/Sichtgröße (Pixel),
// um vom Welt-Fragment auf die Bildschirm-UV des Boden-Canvas zu kommen.
uniform sampler2D iChannel0;
uniform vec2 u_scroll;
uniform vec2 u_view;
uniform float u_useGround;     // 1 = Boden-Textur nutzen (deckend), 0 = altes Alpha-Overlay
uniform float u_groundFlip;    // 1 = Boden-UV vertikal spiegeln (Canvas-Texturen sind oft geflippt)
uniform float u_groundDebug;   // 1 = sUV als Farbe ausgeben (Mapping-Test)
uniform vec3  u_lichtMul;      // Tag/Nacht-Tönung (aus dorfSim) - färbt das Wasser wie den Boden
uniform vec3  u_deep, u_sky, u_spec, u_bedShallow, u_bedDeep, u_stoneCol;
uniform vec2  u_light;
uniform float u_ambient;
uniform vec3  u_points[8];          // Held-Störquellen: xy = UV, z = Alter 0..1 (z<0 = inaktiv)

// Datengetriebener Flusslauf (aus der Karten-Skizze), UV-Koordinaten:
uniform vec4  u_seg[${MAX_SEG}];    // ax,ay,bx,by
uniform vec2  u_segW[${MAX_SEG}];   // hwA,hwB
uniform float u_segN;
uniform vec4  u_lake[${MAX_LAKE}];  // cx,cy,rx,ry
uniform float u_lakeN;
uniform float u_smink;              // Verschmelzungs-Radius (smin)

float smin(float a,float b,float k){ float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0); return mix(b,a,h)-k*h*(1.0-h); }
float sdSegHw(vec2 p, vec2 a, vec2 b, float ra, float rb){ vec2 pa=p-a,ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*h)-mix(ra,rb,h); }

vec3 mod289(vec3 x){ return x-floor(x*(1.0/289.0))*289.0; }
vec2 mod289(vec2 x){ return x-floor(x*(1.0/289.0))*289.0; }
vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }
float snoise(vec2 v){ const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx); vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0); m=m*m; m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0; vec3 h=abs(x)-0.5; vec3 ox=floor(x+0.5); vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h); vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw; return 130.0*dot(m,g); }
float fbm4(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*snoise(p); p*=2.0; a*=0.5; } return s; }
float fbm2(vec2 p){ float s=0.0,a=0.6; for(int i=0;i<2;i++){ s+=a*snoise(p); p*=2.2; a*=0.5; } return s; }
vec2 hash2(vec2 p);   // Vorwärtsdeklaration (Definition weiter unten) - für rainH/inter

// Wasser-Distanz aus den Segment-/See-Uniforms (smin = nahtlose Verschmelzung)
float sdWater(vec2 p){
  float d=1e9; bool erst=true;
  for(int i=0;i<${MAX_SEG};i++){ if(float(i)>=u_segN) break; vec4 s=u_seg[i]; vec2 w=u_segW[i];
    float di=sdSegHw(p,s.xy,s.zw,w.x*u_widthMul,w.y*u_widthMul); d = erst ? di : smin(d,di,u_smink); erst=false; }
  for(int i=0;i<${MAX_LAKE};i++){ if(float(i)>=u_lakeN) break; vec4 L=u_lake[i];
    // ORGANISCHER See: der Radius wird je Winkel mit Sinus-Oberwellen verzerrt
    // (kein glatter Ellipsen-Klotz). Phase aus cx/cy -> jeder See sieht anders aus.
    vec2 rel=p-L.xy; float ang=atan(rel.y,rel.x);
    float seed=(L.x*7.13+L.y*3.71)*6.2831853;
    float wob=1.0+0.20*sin(3.0*ang+seed)+0.11*sin(5.0*ang-seed*1.7)+0.06*sin(8.0*ang+seed*0.5);
    vec2 q=rel/(L.zw*wob); float dl=(length(q)-1.0)*min(L.z,L.w); d = erst ? dl : smin(d,dl,u_smink); erst=false; }
  // Ufer-Rauschen KLEIN halten: bei 0.006 war die Störung so groß wie die halbe
  // Breite dünner Bäche (hw 0.005-0.007) -> das Alpha brach längs periodisch ein
  // und der Bach zerfiel optisch in Pfützen (Autorbug "Wasser nicht durchgehend").
  // 0.0015 raut die Kante weiter an, bleibt aber << jeder Bachbreite. Der
  // organische See-Umriss kommt aus wob (oben), nicht aus diesem Term.
  d += fbm2(p*5.0)*0.0015;
  return d;
}

// Strömungsrichtung: Tangente des nächsten Fluss-Segments. Der See bremst die
// Strömung FLIESSEND ab (nicht abrupt auf 0) - so ist der Übergang Fluss->See
// nahtlos und der See fließt nur stiller (Tempo-Gefälle Fluss > See).
vec2 flowDir(vec2 p){
  float best=1e9; vec2 dir=vec2(0.0,1.0);
  for(int i=0;i<${MAX_SEG};i++){ if(float(i)>=u_segN) break; vec4 s=u_seg[i];
    vec2 pa=p-s.xy, ba=s.zw-s.xy; float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);
    float di=length(p-(s.xy+ba*h)); if(di<best){ best=di; dir=normalize(ba); } }
  float lakeNear=1e9;
  for(int i=0;i<${MAX_LAKE};i++){ if(float(i)>=u_lakeN) break; vec4 L=u_lake[i];
    vec2 q=(p-L.xy)/L.zw; float dl=(length(q)-1.0)*min(L.z,L.w); lakeNear=min(lakeNear,dl); }
  float still = 1.0 - 0.82*(1.0 - smoothstep(0.0, 0.06, lakeNear));   // im See ~0.18, am Ufer fließend hoch
  float ang=snoise(p*1.3+time*0.04)*0.4*u_turb; float c=cos(ang),s=sin(ang); return mat2(c,-s,s,c)*dir*u_flowDir*still;
}

float wh(vec2 p, vec2 dir, float spd){ float ws=u_wavescale*u_detailScale; float t=time*u_speed; float p0=fract(t),p1=fract(t+0.5); float w0=1.0-abs(2.0*p0-1.0),w1=1.0-abs(2.0*p1-1.0); float dist=0.55*spd;
  float b0=fbm4(p*ws+dir*p0*dist); float b1=fbm4(p*ws+dir*p1*dist); float big=(b0*w0+b1*w1)/(w0+w1);
  float fine=fbm2(p*ws*2.6+dir*(time*u_speed*2.2*spd)); return big*0.65 + fine*0.35*u_turb; }
float inter(vec2 uv){ float aspect=resolution.x/resolution.y; float add=0.0;
  for(int i=0;i<8;i++){ vec3 pt=u_points[i]; if(pt.z<0.0) continue; vec2 pos=pt.xy+vec2(0.0,-1.0)*pt.z*0.02; vec2 d=uv-pos; d.x*=aspect; float r=length(d);
    float ring=sin(r*75.0-pt.z*30.0); float env=exp(-r*30.0)*(1.0-pt.z); add+=ring*env; } return add*u_wake; }
// Regentropfen auf dem Wasser: in einem Zellraster verteilte, periodisch
// aufploppende und auslaufende Ringe (Dichte/Stärke ~ u_rain). Liefert einen
// Höhenbeitrag -> echte Kreise auf der Oberfläche (über die Normale).
float rainH(vec2 uv){
  if(u_rain<=0.001) return 0.0;
  float aspect=resolution.x/resolution.y;
  // Zellraster MIT detailScale (Autorbug R77: feste 18er-Zellen = 230px-Riesen-
  // ringe auf großen Karten - ein Tropfen lief über den ganzen See).
  vec2 P=vec2(uv.x*aspect,uv.y)*18.0*u_detailScale; vec2 cell=floor(P); float sum=0.0;
  for(int j=-1;j<=1;j++){ for(int i=-1;i<=1;i++){
    vec2 cc=cell+vec2(float(i),float(j)); vec2 h=hash2(cc);
    if(h.x>u_rain) continue;
    float period=0.6+h.y*0.8; float ph=fract(time/period + h.x*7.0);
    vec2 ctr=cc+vec2(0.25+0.5*h.x, 0.25+0.5*fract(h.y*3.7));
    float r=length(P-ctr); float rad=ph*0.8;
    float ring=sin((r-rad)*44.0)*exp(-r*2.8)*(1.0-ph)*smoothstep(0.0,0.06,ph);
    sum+=ring;
  } }
  // DEUTLICH gedämpft (Autorbug R78 "Nieselregen verwässert den Fluss"):
  // leichter Regen wirkt nur minimal (quadratische Kurve), Sturm spürbar.
  return sum*0.7*(0.12+0.88*u_rain*u_rain);
}
vec3 normalAt(vec2 uv, vec2 dir, float spd){ float e=1.6/resolution.y;
  float hL=wh(uv-vec2(e,0.0),dir,spd)+inter(uv-vec2(e,0.0))+rainH(uv-vec2(e,0.0)); float hR=wh(uv+vec2(e,0.0),dir,spd)+inter(uv+vec2(e,0.0))+rainH(uv+vec2(e,0.0));
  float hD=wh(uv-vec2(0.0,e),dir,spd)+inter(uv-vec2(0.0,e))+rainH(uv-vec2(0.0,e)); float hU=wh(uv+vec2(0.0,e),dir,spd)+inter(uv+vec2(0.0,e))+rainH(uv+vec2(0.0,e));
  float gx=(hR-hL)/(2.0*e); float gy=(hU-hD)/(2.0*e); return normalize(vec3(-gx*u_nscale,-gy*u_nscale,1.0)); }

vec2 hash2(vec2 p){ p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
float hash11(float p){ return fract(sin(p*127.1)*43758.5453); }
vec2 vor(vec2 p){ p+=0.35*vec2(fbm2(p*1.6),fbm2(p*1.6+7.3)); vec2 n=floor(p),f=fract(p); float f1=8.0,f2=8.0;
  for(int j=-1;j<=1;j++){ for(int i=-1;i<=1;i++){ vec2 g=vec2(float(i),float(j)); vec2 o=hash2(n+g); float d=dot(g+o-f,g+o-f);
    if(d<f1){ f2=f1; f1=d; } else if(d<f2){ f2=d; } } } return vec2(sqrt(f1),sqrt(f2)); }

vec3 riverbed(vec2 p, float deepness){ vec3 base=mix(u_bedShallow,u_bedDeep,deepness);
  vec2 vB=vor(p*7.5); float stoneB=smoothstep(0.34,0.04,vB.x); float fugeB=smoothstep(0.0,0.11,vB.y-vB.x);
  base=mix(base, base*1.32, stoneB*0.45*u_bed); base*=mix(1.0, 0.62+0.38*fugeB, u_bed);
  vec2 vL=vor(p*19.0); float kies=smoothstep(0.0,0.26,vL.x); base*=mix(1.0, 0.80+0.32*kies, u_bed);
  float sandPatch=smoothstep(0.44,0.78,fbm4(p*6.0+30.0)*0.5+0.5); base=mix(base, base*1.18+vec3(0.05,0.043,0.022), sandPatch*u_sand*(1.0-deepness*0.55));
  base*=0.9+0.2*fbm4(p*44.0)*u_bed; return base; }
vec3 land(vec2 p){ float n=fbm4(p*7.0)*0.5+0.5; vec3 g=mix(vec3(0.13,0.19,0.09),vec3(0.22,0.28,0.13),n); g+=fbm4(p*30.0)*0.04;
  float dirt=smoothstep(0.62,0.82, fbm4(p*5.0+10.0)*0.5+0.5); g=mix(g, vec3(0.19,0.15,0.10), dirt*0.30); return g; }
vec3 landFull(vec2 p, float sd){ vec3 c=land(p); float bank=smoothstep(u_shore*3.0,-u_shore,sd)*u_bank; c=mix(c, mix(c,vec3(0.29,0.24,0.17),0.62), bank); return c; }

void stoneInstance(vec2 uv, vec2 center, float aspect, float R, float seed, inout float maxH, inout vec3 sN, inout vec3 sCol, inout float sMask){
  vec2 d=(uv-center); d.x*=aspect; if(length(d)>R*1.25) return;
  float rot=hash11(seed)*6.2831; float c=cos(rot),si=sin(rot); vec2 dl=mat2(c,-si,si,c)*d;
  float stretch=0.72+0.56*hash11(seed+3.1); dl=vec2(dl.x/stretch, dl.y*stretch);
  float rr=length(dl)/R; float a=atan(dl.y,dl.x);
  float wob=0.14*sin(a*4.0+seed*6.28)+0.08*sin(a*7.0+seed*3.0+1.7)+0.05*sin(a*11.0+seed*9.0); rr*=(1.0+wob);
  if(rr>=1.0) return; float hfac=0.42+0.58*hash11(seed+5.7); float bumps=fbm2(uv*82.0+center*9.0+seed*15.0);
  float h=sqrt(max(0.0,1.0-rr*rr))*hfac + bumps*0.04;
  if(h>maxH){ maxH=h; float rl=length(d); vec2 rdir=(rl>0.0001)?d/rl:vec2(0.0);
    sN=normalize(vec3(rdir*rr*1.4 + vec2(bumps*0.28,bumps*0.2), 1.0));
    float cv=(hash11(seed+7.3)-0.5)*0.28; sCol=clamp(u_stoneCol*(1.0+cv)*(0.86+0.28*(bumps*0.5+0.5)),0.0,1.0);
    sMask=smoothstep(1.0,0.84,rr); } }
void procStones(vec2 uv, float aspect, float sd, inout float maxH, inout vec3 sN, inout vec3 sCol, inout float sMask){
  if(u_procDensity<=0.0) return;
  // Kiesel NUR im flachen Ufersaum: nahe der Uferlinie, und im TIEFEN ruhigen
  // Wasser (See) ausgeblendet - dort sieht man keine Steine (Autorwunsch).
  float wz = smoothstep(u_shore*1.5, -u_shore*0.3, sd) * (1.0 - smoothstep(-u_shore*0.3, -u_shore*1.3, sd));
  if(wz<0.04) return;
  float cs=u_procSize/u_detailScale; vec2 gp=vec2(uv.x*aspect,uv.y)/cs; vec2 cf=floor(gp);
  for(int j=-1;j<=1;j++){ for(int i=-1;i<=1;i++){ vec2 cc=cf+vec2(float(i),float(j)); vec2 rnd=hash2(cc);
    if(rnd.x>u_procDensity) continue; float seed=fract(rnd.y*13.37)*10.0+0.21;
    vec2 ctr=(cc+vec2(0.25+0.5*rnd.x,0.25+0.5*rnd.y))*cs; ctr=vec2(ctr.x/aspect,ctr.y);
    float R=cs*(0.16+0.20*hash11(dot(cc,vec2(7.1,3.3)))); stoneInstance(uv,ctr,aspect,R,seed,maxH,sN,sCol,sMask); } } }
float stoneField(vec2 uv, float aspect, float sd, out vec3 sCol, out vec3 sN, out float sMask){
  float maxH=0.0; sCol=vec3(0.5); sN=vec3(0.0,0.0,1.0); sMask=0.0;
  procStones(uv,aspect,sd,maxH,sN,sCol,sMask); return maxH; }
vec3 stoneLit(vec3 sN, vec3 sCol){ vec3 L=normalize(vec3(u_light,0.8)); float lam=max(dot(sN,L),0.0)*0.76+0.24;
  float spc=pow(max(dot(sN,normalize(L+vec3(0.0,0.0,1.0))),0.0),22.0)*0.16; return sCol*lam+spc; }

void main(){
  // fragCoord.y ist hier y-AUF (Ursprung unten links). Die Geometrie (Flusslauf,
  // Seen) und die Held-UV (px/py) sind aber y-AB (0 oben, 1 unten). Darum die
  // y-Achse EINMAL spiegeln - sonst rendert das ganze Wasser senkrecht verkehrt
  // (See oben statt unten) UND die Held-Wellen erscheinen auf der Gegenseite.
  // Eine Korrektur an der Wurzel deckt Geometrie-Lage UND Held-Spiegelung ab.
  vec2 uv = vec2(fragCoord.x, resolution.y - fragCoord.y) / resolution;
  float sd=sdWater(uv); float aspect=resolution.x/resolution.y;
  float waterDepth=smoothstep(u_shore,-u_shore,sd); float deepness=smoothstep(0.0,-0.20,sd);
  vec3 sCol,sN; float sMask; float sH=stoneField(uv,aspect,sd,sCol,sN,sMask);
  float emerged=clamp(sH*(0.5+u_emerge) - deepness*0.55, 0.0, 1.0);

  // Echten dorfSim-Boden an dieser Stelle holen (Overlay mit Untergrund-Textur):
  // Welt-Fragment -> Bildschirm-UV des Boden-Canvas. So rendern wir DECKEND.
  vec3 ground = vec3(0.0); bool hasGround = (u_layerMode>0.5 && u_useGround>0.5);
  if(hasGround){
    vec2 sUV = (fragCoord.xy - u_scroll) / u_view;
    float gy = u_groundFlip>0.5 ? (1.0 - sUV.y) : sUV.y;
    // DEBUG (Design-Chat-Test): sUV sichtbar machen - Rot=x links->rechts,
    // Grün=y oben->unten, je EINMAL sauber über den Schirm = Mapping ok.
    if(u_groundDebug>0.5){ gl_FragColor=vec4(fract(sUV.x), fract(gy), 0.0, 1.0); return; }
    ground = texture2D(iChannel0, vec2(sUV.x, gy)).rgb;
  }
  // Feuchter, dunklerer Ufersaum auf dem ECHTEN Boden (nass-Sand-Verlauf, blendet
  // sich in den echten Boden -> kein fremdfarbiger Saum).
  float bankWet = smoothstep(u_shore*3.0, 0.0, sd) * u_bank * 0.55;
  vec3 wetGround = mix(ground, ground*vec3(0.62,0.60,0.52), bankWet);

  if(waterDepth<0.003){
    if(u_layerMode>0.5){
      if(hasGround){ gl_FragColor=vec4(wetGround, 1.0); return; }   // deckend: echter Boden + feuchter Saum
      gl_FragColor=vec4(0.0); return;                               // Fallback (altes Alpha-Overlay)
    }
    // Vollszene (layerMode 0, Prototyp-Look): Shader zeichnet Gras + Ufersaum.
    vec3 c=landFull(uv,sd); c=mix(c, stoneLit(sN,sCol), sMask);
    vec2 q0=uv-0.5; gl_FragColor=vec4(c*u_ambient*(1.0-dot(q0,q0)*0.35),1.0); return;
  }
  float localDepth=waterDepth*(1.0-emerged*0.95);
  vec2 dir=flowDir(uv); float spd=mix(1.0,0.4,deepness); vec3 n=normalAt(uv,dir,spd);
  vec2 refrUV=uv+n.xy*u_refract*localDepth; vec3 bed=riverbed(refrUV*u_detailScale,deepness)*u_ambient;
  bed=mix(bed, stoneLit(sN,sCol)*u_ambient, sMask);
  // Rand-Ausblendfaktor (0 am Ufer .. 1 tiefer) - bleibt NUR für die hellen
  // Effekte (gegen die Effekt-Kante), bricht die Prototyp-Äquivalenz nicht.
  float edgeFade=smoothstep(0.0, u_shore*2.5, -sd);
  // EXAKT wie der Prototyp - KEIN fester Sockel mehr. Am flachen Ufer ist
  // waterDepth (= Alpha) klein -> Bett kaum eingemischt, Boden scheint durch.
  float tintAmt = localDepth*mix(u_turbidity,1.0,deepness)*u_tint;
  vec3 col=mix(bed,u_deep, clamp(tintAmt,0.0,1.0));
  // JEDER AUFHELLENDE Term (Himmelspiegelung, Glanz, Schaum, Stein-Wasserlinie)
  // wird zum flachen Ufer hin ausgeblendet - sonst flammen sie an der Uferkante
  // auf. Die dunkle Grundfarbe (col) und das Alpha bleiben ungefadet.
  float fres=pow(1.0-clamp(n.z,0.0,1.0),4.0); col=mix(col,u_sky,fres*0.4*localDepth*edgeFade);
  vec3 V=vec3(0.0,0.0,1.0),H=normalize(normalize(vec3(u_light,0.9))+V); float sp=max(dot(n,H),0.0);
  col+=pow(sp,90.0)*u_spec*localDepth*0.9*u_gloss*edgeFade; col+=pow(sp,340.0)*u_spec*localDepth*1.6*u_gloss*edgeFade;
  float slope=length(n.xy); float foam=smoothstep(0.18,0.42,slope)*localDepth; col=mix(col,vec3(0.90,0.94,0.95),foam*0.5*clamp(u_turb,0.0,1.0)*edgeFade);
  // Held-Wellen + Regentropfen: bewusst OHNE edgeFade - die sollen man auch im
  // flachen Ufer-Wasser sehen (Waten/Regen), bilden keine durchgehende Kante.
  float heroWake=inter(uv); col += vec3(0.85,0.92,1.0)*abs(heroWake)*0.35*localDepth;
  float rain=rainH(uv); col += vec3(0.82,0.88,0.96)*abs(rain)*0.18*localDepth;
  vec3 dryStone=stoneLit(sN,sCol)*1.08*u_ambient; col=mix(col, dryStone, sMask*emerged*edgeFade);
  float waterline=sMask*smoothstep(0.0,0.32,emerged)*(1.0-smoothstep(0.32,0.62,emerged));
  // R146/R158b: Uferlinie deutlich, aber nicht grell (Autor stimmt Optik ab).
  col=mix(col, vec3(0.92,0.95,0.96), clamp(waterline,0.0,1.0)*(0.30+0.30*u_turb)*edgeFade);

  col *= u_lichtMul;   // Tag/Nacht-Tönung aus dorfSim (nahtlose Einbettung ins Canvas-Licht)
  if(u_layerMode>0.5){
    // Overlay über dem echten Boden (dorfBild, depth -1000). Phaser blendet
    // PREMULTIPLIZIERT -> RGB mit DEMSELBEN Alpha multiplizieren (vec4(col*a, a)).
    // Mathematisch KEIN Saum (weder hell noch dunkel), egal wie hell col am Ufer
    // ist - der echte Boden scheint sauber durch. KEIN iChannel0. (Design-Chat)
    float a = smoothstep(u_shore, -u_shore*0.5, sd);
    gl_FragColor = vec4(col * a, a); return;
  }
  // Vollszene: Land+Wasser im selben Mix (Prototyp-Look).
  vec3 finalCol=mix(landFull(uv,sd)*u_ambient*u_lichtMul, col, waterDepth);
  vec2 q=uv-0.5; finalCol*=1.0-dot(q,q)*0.35;
  gl_FragColor=vec4(finalCol, 1.0);
}
`;

// ---------------------------------------------------------------------
//  Presets - voller Parametersatz (Werte aus der Referenz/Übergabenotiz)
// ---------------------------------------------------------------------
export interface WasserPreset {
  speed: number; turb: number; wake: number; bed: number; refract: number;
  tint: number; shore: number; wavescale: number; nscale: number; gloss: number;
  turbidity: number; bank: number; emerge: number; sand: number;
  procDensity: number; procSize: number; flowDir: number; ambient: number;
  deep: [number, number, number]; sky: [number, number, number]; spec: [number, number, number];
  bedShallow: [number, number, number]; bedDeep: [number, number, number]; stoneCol: [number, number, number];
  light: [number, number];
}

// R158b (Autor "das Wasser sieht seltsam aus"): meine R158-Umtstimmung des
// Presets ZURUECKGENOMMEN - die Wasser-Optik stimmt der Autor selbst in der
// F10-Werkbank ab. Es gilt wieder der alte Stand (R138 "WASSER SICHTBAR").
export const WASSER: WasserPreset = {
  speed: 0.13, turb: 0.0, wake: 0.5, bed: 1.0, refract: 0.05,
  tint: 0.8, shore: 0.010, wavescale: 5.0, nscale: 0.10, gloss: 0.35,
  turbidity: 0.6, bank: 0.45, emerge: 0.4, sand: 0.5,
  procDensity: 0.35, procSize: 0.05, flowDir: 1.0, ambient: 1.0,
  deep: [0.07, 0.19, 0.24], sky: [0.5, 0.66, 0.82], spec: [0.95, 0.95, 0.9],
  bedShallow: [0.40, 0.37, 0.30], bedDeep: [0.13, 0.16, 0.16], stoneCol: [0.345, 0.329, 0.298],
  light: [0.25, 0.65],
};

// Blut: dunkelrot, zäh, langsam, trüber, weniger Glanz.
export const BLUT: WasserPreset = {
  ...WASSER,
  speed: 0.05, turb: 0.0, gloss: 0.30, tint: 0.85, turbidity: 0.7, sand: 0.15,
  deep: [0.22, 0.02, 0.02], sky: [0.35, 0.06, 0.06], spec: [0.70, 0.20, 0.20],
  bedShallow: [0.26, 0.10, 0.10], bedDeep: [0.10, 0.02, 0.02], stoneCol: [0.30, 0.16, 0.16],
  light: [0.40, 0.50], ambient: 0.7,
};

// Regler-Metadaten (geteilt von WasserProbe + F10-Dev-Konsole), voller Satz.
export const WASSER_REGLER: Array<{ key: keyof WasserPreset; label: string; min: number; max: number; step: number }> = [
  { key: 'speed', label: 'Fließ-Tempo', min: 0.02, max: 0.5, step: 0.01 },
  { key: 'turb', label: 'Turbulenz/Wirbel', min: 0, max: 1, step: 0.02 },
  { key: 'wavescale', label: 'Wellenfeinheit', min: 2.5, max: 9, step: 0.5 },
  { key: 'nscale', label: 'Wellen-Kippung', min: 0.02, max: 0.25, step: 0.01 },
  { key: 'refract', label: 'Brechung', min: 0, max: 0.1, step: 0.005 },
  { key: 'gloss', label: 'Glanz', min: 0, max: 1.5, step: 0.05 },
  { key: 'tint', label: 'Farbintensität', min: 0.1, max: 1, step: 0.05 },
  { key: 'turbidity', label: 'Trübung', min: 0, max: 1, step: 0.05 },
  { key: 'shore', label: 'Uferbreite', min: 0.004, max: 0.06, step: 0.002 },
  { key: 'bank', label: 'Nasser Uferstreifen', min: 0, max: 1, step: 0.05 },
  { key: 'bed', label: 'Bett-Struktur', min: 0, max: 1.4, step: 0.05 },
  { key: 'sand', label: 'Sand-Beimischung', min: 0, max: 1, step: 0.05 },
  { key: 'emerge', label: 'Steine über Wasser', min: 0, max: 1.5, step: 0.1 },
  { key: 'procDensity', label: 'Steindichte', min: 0, max: 0.7, step: 0.05 },
  { key: 'procSize', label: 'Kieselgröße', min: 0.025, max: 0.11, step: 0.005 },
  { key: 'ambient', label: 'Helligkeit', min: 0.4, max: 1.6, step: 0.05 },
];
export const WASSER_FARBEN: Array<{ key: keyof WasserPreset; label: string }> = [
  { key: 'deep', label: 'Wasserfarbe (tief)' },
  { key: 'sky', label: 'Spiegelung (Himmel)' },
  { key: 'spec', label: 'Glanzlicht' },
  { key: 'bedShallow', label: 'Bett hell (flach)' },
  { key: 'bedDeep', label: 'Bett tief' },
  { key: 'stoneCol', label: 'Steinfarbe' },
];

// Live-Regler (Dev): multiplikativ/überschreibend auf alle Wasser-Shader.
export const WASSER_CFG = {
  tiefe: -9,            // Render-Tiefe: über Boden (-10/-11), unter Spieler/Objekten
  smink: 0.08,          // smin-Verschmelzung der Gewässer (UV) - = Carve-Wert (areagen) -> Optik deckt Kollision
  flowMul: 1.0, turbAdd: 0.0, ambientMul: 1.0,
  regenTurb: 0.2,       // R146: Truebungs-ZUSCHLAG bei vollem Regen (vorher 0.5 - das Wasser kippte in stumpfes Grau und war nicht mehr als Wasser lesbar)
  widthMul: 1.0,        // Live-Flussbreite (Dev-Regler) - skaliert alle Fluss-/Bach-Breiten
  overlayFeather: 0.03, // Breite der weichen Außenblende (Shader-Land -> dorfSim-Gras) hinter dem Ufersaum
};

let baseShader: Phaser.Display.BaseShader | null = null;
function getBaseShader(): Phaser.Display.BaseShader {
  if (baseShader) return baseShader;
  const f = (value: number) => ({ type: '1f', value });
  const v3 = (x: number, y: number, z: number) => ({ type: '3f', value: { x, y, z } });
  const u: Record<string, unknown> = {
    u_speed: f(0.13), u_turb: f(0), u_wake: f(0.2), u_bed: f(1), u_refract: f(0.05),
    u_tint: f(0.65), u_shore: f(0.05), u_wavescale: f(5), u_nscale: f(0.1), u_gloss: f(0.4),
    u_turbidity: f(0.4), u_bank: f(0.45), u_emerge: f(0.4), u_sand: f(0.5),
    u_procDensity: f(0.35), u_procSize: f(0.05), u_flowDir: f(1), u_layerMode: f(1), u_ambient: f(1.05),
    u_detailScale: f(1), u_widthMul: f(1), u_overlayFeather: f(0.03), u_rain: f(0),
    u_scroll: { type: '2f', value: { x: 0, y: 0 } }, u_view: { type: '2f', value: { x: 1280, y: 720 } }, u_useGround: f(0), u_groundFlip: f(1), u_groundDebug: f(0),
    u_lichtMul: { type: '3f', value: { x: 1, y: 1, z: 1 } },
    u_deep: v3(0.08, 0.24, 0.27), u_sky: v3(0.55, 0.75, 0.92), u_spec: v3(1, 0.97, 0.88),
    u_bedShallow: v3(0.4, 0.37, 0.3), u_bedDeep: v3(0.13, 0.16, 0.16), u_stoneCol: v3(0.345, 0.329, 0.298),
    u_light: { type: '2f', value: { x: 0.25, y: 0.65 } },
    u_points: { type: '3fv', value: new Float32Array(8 * 3).fill(-1) },
    u_seg: { type: '4fv', value: new Float32Array(MAX_SEG * 4) },
    u_segW: { type: '2fv', value: new Float32Array(MAX_SEG * 2) },
    u_segN: f(0), u_lake: { type: '4fv', value: new Float32Array(MAX_LAKE * 4) }, u_lakeN: f(0),
    u_smink: f(0.07),
  };
  baseShader = new Phaser.Display.BaseShader('wasser', FRAG, undefined, u);
  return baseShader;
}

function setV3(sh: Phaser.GameObjects.Shader, key: string, c: [number, number, number]): void {
  sh.setUniform(`${key}.value`, { x: c[0], y: c[1], z: c[2] });
}

/** Setzt den vollen Parametersatz eines Presets (auch live für Regler). */
export function wendeWasserPreset(sh: Phaser.GameObjects.Shader, p: WasserPreset): void {
  sh.setUniform('u_speed.value', p.speed * WASSER_CFG.flowMul);
  sh.setUniform('u_turb.value', Math.max(0, p.turb + WASSER_CFG.turbAdd));
  sh.setUniform('u_wake.value', p.wake);
  sh.setUniform('u_bed.value', p.bed);
  sh.setUniform('u_refract.value', p.refract);
  sh.setUniform('u_tint.value', p.tint);
  sh.setUniform('u_shore.value', p.shore);
  sh.setUniform('u_wavescale.value', Math.max(2.5, p.wavescale));
  sh.setUniform('u_nscale.value', p.nscale);
  sh.setUniform('u_gloss.value', p.gloss);
  sh.setUniform('u_turbidity.value', p.turbidity);
  sh.setUniform('u_bank.value', p.bank);
  sh.setUniform('u_emerge.value', p.emerge);
  sh.setUniform('u_sand.value', p.sand);
  sh.setUniform('u_procDensity.value', p.procDensity);
  sh.setUniform('u_procSize.value', p.procSize);
  sh.setUniform('u_flowDir.value', p.flowDir);
  sh.setUniform('u_ambient.value', p.ambient * WASSER_CFG.ambientMul);
  sh.setUniform('u_widthMul.value', WASSER_CFG.widthMul);
  sh.setUniform('u_overlayFeather.value', WASSER_CFG.overlayFeather);
  setV3(sh, 'u_deep', p.deep); setV3(sh, 'u_sky', p.sky); setV3(sh, 'u_spec', p.spec);
  setV3(sh, 'u_bedShallow', p.bedShallow); setV3(sh, 'u_bedDeep', p.bedDeep); setV3(sh, 'u_stoneCol', p.stoneCol);
  sh.setUniform('u_light.value', { x: p.light[0], y: p.light[1] });
}

/** Lädt den Flusslauf (Segmente/Seen) einer Karte in die Shader-Uniforms. smink =
 * Verschmelzungs-Radius DIESER Karte (fehlt er, gilt der globale WASSER_CFG-Wert).
 * Wird hier mitgesetzt, weil setzeGeometrie bei JEDER Regler-Änderung neu läuft -
 * sonst fiele der karteneigene smin auf den globalen zurück. */
export function setzeGeometrie(sh: Phaser.GameObjects.Shader, geo: WasserGeometrie, smink = WASSER_CFG.smink): void {
  const u = geometrieZuUniforms(geo);
  sh.setUniform('u_seg.value', u.seg);
  sh.setUniform('u_segW.value', u.segW);
  sh.setUniform('u_segN.value', u.segN);
  sh.setUniform('u_lake.value', u.lake);
  sh.setUniform('u_lakeN.value', u.lakeN);
  sh.setUniform('u_smink.value', smink);
}

/** Störquellen (Wellen) setzen: bis zu 8 Punkte als [x,y,alter] in UV.
 * AKTUELL UNGENUTZT (Runde 74): der alte Held-Watewellen-Effekt ist raus
 * (Autorwunsch, ein besserer kommt später). Der Haken bleibt, weil der
 * künftige Effekt dieselben Störpunkte füttern kann. */
export function setzeHeldPunkte(sh: Phaser.GameObjects.Shader, punkte: Array<[number, number, number]>): void {
  const arr = new Float32Array(8 * 3).fill(-1);
  for (let i = 0; i < Math.min(8, punkte.length); i++) {
    arr[i * 3] = punkte[i][0]; arr[i * 3 + 1] = punkte[i][1]; arr[i * 3 + 2] = punkte[i][2];
  }
  sh.setUniform('u_points.value', arr);
}

export interface SpawnWasserOpts { depth?: number; layerMode?: number; groundKey?: string; smink?: number; }

/**
 * Spawnt EIN Wasser-Quad (x=0,y=0, Größe worldW×worldH) mit dem prozeduralen
 * Shader. geo = Flusslauf in UV (0..1) der Karte. layerMode 1 = Overlay (Land
 * transparent), 0 = ganze Szene inkl. Gras (Prototyp-Vergleich). groundKey =
 * Textur-Schlüssel des echten Bodens (-> iChannel0, deckendes Rendering).
 */
export function spawneWasser(scene: Phaser.Scene, geo: WasserGeometrie, worldW: number, worldH: number, preset: WasserPreset, opts: SpawnWasserOpts = {}): Phaser.GameObjects.Shader {
  // iChannel0 wird über das textures-Argument von add.shader gebunden (NICHT
  // setSampler2D - das greift bei BaseShader-Shadern nicht zuverlässig).
  const sh = opts.groundKey
    ? scene.add.shader(getBaseShader(), 0, 0, worldW, worldH, [opts.groundKey])
    : scene.add.shader(getBaseShader(), 0, 0, worldW, worldH);
  sh.setOrigin(0, 0).setDepth(opts.depth ?? WASSER_CFG.tiefe);
  wendeWasserPreset(sh, preset);
  setzeGeometrie(sh, geo, opts.smink);
  sh.setUniform('u_layerMode.value', opts.layerMode ?? 1);
  // Detail (Bett/Wellen/Kiesel) auf Bildschirmgröße halten: auf großen Karten ist
  // die uv 0..1 über die ganze Karte gespannt -> sonst riesige, blasse Strukturen.
  sh.setUniform('u_detailScale.value', Math.max(1, worldH / 720));
  return sh;
}
