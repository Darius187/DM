// ARBEITS-STATIONEN (M2 Dorfwirtschaft): kleine prozedurale Props, die den
// Arbeits-Ankern der Bewohner einen sichtbaren ORT geben - Amboss vor der
// Schmiede, Backofen am Backhaus, Holzstapel am Holzplatz, Bienenkoerbe der
// Imkerei. Prozedural wie alles Uebrige; echte Grafiken ersetzen sie spaeter
// per Hot-Swap (Textur-Schluessel 'station_<art>' -> Datei hs_station_<art>).

export type StationsArt = 'amboss' | 'backofen' | 'holzstapel' | 'bienenkorb';

// zeichnet die Station in ein 32x32-Canvas (Fusspunkt unten-mittig)
export function zeichneStation(art: StationsArt): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = 32; cv.height = 32;
  const c = cv.getContext('2d')!;
  const p = (x: number, y: number, w: number, h: number, f: string): void => { c.fillStyle = f; c.fillRect(x, y, w, h); };
  switch (art) {
    case 'amboss':
      p(11, 24, 10, 4, '#3a3630');     // Klotz
      p(12, 20, 8, 4, '#5a5e66');      // Fuss
      p(8, 16, 16, 5, '#767b84');      // Koerper
      p(6, 15, 6, 3, '#767b84');       // Horn
      p(8, 15, 16, 1, '#9aa0a8');      // Lichtkante
      break;
    case 'backofen':
      p(6, 12, 20, 16, '#7a6a56');     // Lehmkuppel
      p(8, 10, 16, 4, '#6a5a46');      // Kuppel oben
      p(12, 18, 8, 8, '#241a12');      // Ofenloch
      p(13, 19, 6, 3, '#c85a1a');      // Glut
      p(14, 20, 4, 1, '#f0a030');      // Glut hell
      p(4, 26, 24, 2, '#5a5048');      // Steinsockel
      break;
    case 'holzstapel':
      for (let i = 0; i < 3; i++) {
        p(6, 22 - i * 4, 20, 4, i % 2 ? '#7a5c34' : '#6a4e2a');   // Staemme
        p(6, 22 - i * 4, 2, 4, '#c8a870');                        // Hirnholz
        p(24, 22 - i * 4, 2, 4, '#b89860');
      }
      p(4, 26, 24, 2, '#4a3a26');      // Unterlage
      break;
    case 'bienenkorb':
      p(10, 14, 12, 12, '#b89a5e');    // Strohkorb
      p(11, 12, 10, 3, '#a8894e');     // Kuppel
      p(9, 17, 14, 2, '#8a7040');      // Wulst
      p(9, 21, 14, 2, '#8a7040');
      p(14, 23, 4, 3, '#3a2c18');      // Flugloch
      p(4, 26, 24, 2, '#6a5a42');      // Brett
      break;
  }
  return cv;
}
