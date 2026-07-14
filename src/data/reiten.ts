// Zentrale Werte fuer das reitbare Blender-Pferd.  Bewegung und Darstellung
// bleiben hier abstimmbar, damit die Szenenlogik keine versteckten Zahlen traegt.
export const REIT_PFERD = {
  atlasKey: 'as_ravensmoor_horse',
  atlasBild: 'horse/ravensmoor-horse.png',
  atlasJson: 'horse/ravensmoor-horse.json',
  schnellAtlasKey: 'as_ravensmoor_horse_fast',
  schnellAtlasBild: 'horse/ravensmoor-horse-fast.png',
  schnellAtlasJson: 'horse/ravensmoor-horse-fast.json',
  wendeLinksAtlasKey: 'as_ravensmoor_horse_turns_left',
  wendeLinksAtlasBild: 'horse/ravensmoor-horse-turns-left.png',
  wendeLinksAtlasJson: 'horse/ravensmoor-horse-turns-left.json',
  wendeRechtsAtlasKey: 'as_ravensmoor_horse_turns_right',
  wendeRechtsAtlasBild: 'horse/ravensmoor-horse-turns-right.png',
  wendeRechtsAtlasJson: 'horse/ravensmoor-horse-turns-right.json',
  uebergangHochAtlasKey: 'as_ravensmoor_horse_transitions_up',
  uebergangHochAtlasBild: 'horse/ravensmoor-horse-transitions-up.png',
  uebergangHochAtlasJson: 'horse/ravensmoor-horse-transitions-up.json',
  uebergangRunterAtlasKey: 'as_ravensmoor_horse_transitions_down',
  uebergangRunterAtlasBild: 'horse/ravensmoor-horse-transitions-down.png',
  uebergangRunterAtlasJson: 'horse/ravensmoor-horse-transitions-down.json',
  richtungen: 16,
  sattelPunkteKey: 'reit_pferd_sattelpunkte',
  sattelPunkteJson: 'horse/ravensmoor-horse-mounts.json',
  zellenBreite: 128,
  zellenHoehe: 96,
  darstellungSkala: 0.645,
  fussOriginY: 0.9,
  reiterSkala: 0.72,
  // Verdunkelung des Pferds als Phaser-Multiply-Tint (Autor R135: "dunkler,
  // vielleicht schwarz, staerker zeichnen"). Dunkler = staerkere Silhouette,
  // dadurch lesen sich die duennen Beine besser gegen den Boden. In EINER Zeile
  // tunebar: heller 0x9a7c60 -> dunkelbay 0x7a6450 -> dunkel 0x5c4c3c ->
  // fast schwarz 0x443a30. 0xffffff = Originalfarbe ohne Tint.
  farbTint: 0x5c4c3c,
  // Hufspuren beim Laufen (Autor R135b). Kleine dunkle Abdruecke, die hinter dem
  // Pferd liegen bleiben und langsam verblassen. Alles hier tunebar.
  spurAbstandPx: 24,    // alle X zurueckgelegten Pixel ein neuer Abdruck
  spurTempoMin: 18,     // erst ab diesem Tempo Spuren (im Stand keine)
  spurLebenS: 7,        // Sekunden bis vollstaendig verblasst
  spurBreite: 11,       // Abdruckgroesse
  spurHoehe: 6,
  spurAlpha: 0.42,      // Anfangs-Deckkraft
  spurFarbe: 0x1b130c,  // dunkle, feuchte Erde (Abdruck druecktden Boden ein)
  spurSeitVersatz: 7,   // seitlicher Versatz der linken/rechten Hufe
  spurMax: 60,          // Obergrenze gleichzeitiger Abdruecke
  schattenBreite: 50,
  schattenHoehe: 14,
  startAbstand: 72,
  aufsitzDistanz: 78,
  absitzAbstand: 54,
  kollisionsRadius: 17,
  rueckwaertsTempo: 48,
  schrittGrenze: 92,
  trabGrenze: 176,
  hoechstTempo: 276,
  beschleunigung: 155,
  bremsung: 235,
  ausrollBremsung: 105,
  drehTempoLangsam: 5.2,
  drehTempoSchnell: 2.55,
  standDrehFaktor: 0.72,
  mausVollausschlag: 0.58,
  mausStoppDistanz: 44,
  mausLangsamDistanz: 190,
  mausHoechstTempo: 220,
  lenkTotzone: 0.055,
  wendeMittelAb: 0.38,
  wendeStarkAb: 0.72,
  animationFps: {
    idle: 3,
    walk: 9,
    trot: 12,
    gallop: 15,
    back: 8,
    turn: 8,
  },
} as const;

export type ReitClip = 'idle' | 'walk' | 'trot' | 'gallop' | 'back'
  | 'turn_small_left' | 'turn_small_right'
  | 'turn_medium_left' | 'turn_medium_right'
  | 'turn_strong_left' | 'turn_strong_right'
  | ReitUebergangClip;

export type ReitGangClip = 'idle' | 'walk' | 'trot' | 'gallop';
export type ReitUebergangClip = 'idle_to_walk' | 'walk_to_trot' | 'trot_to_gallop'
  | 'gallop_to_trot' | 'trot_to_walk' | 'walk_to_idle';

export interface ReitSattelPunkt { x: number; y: number }
export type ReitSattelPunkte = Record<string, ReitSattelPunkt>;
