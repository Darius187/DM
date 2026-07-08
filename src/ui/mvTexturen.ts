// CODEX-ANDOCKSTELLE (R106b): Hier - und NUR hier - werden Bild-Texturen ins
// Mittelalter-UI eingehängt. Codex legt PNGs nach assets/ui/ und trägt sie unten
// als import ein; wendeMvTexturenAn() schreibt sie in die CSS-Variablen aus
// medieval-ui.css. Ist nichts eingetragen, bleiben die CSS-Gradients sichtbar
// (das Menü sieht trotzdem fertig aus). Diese Datei darf Codex frei ändern -
// sie berührt keine Spiel-Logik.
//
// SO GEHT'S (für Codex):
//   1) Bild nach assets/ui/ legen (siehe assets/ui/README.md für Namen/Größen).
//   2) Oben importieren:      import pergament from '../../assets/ui/parchment.png';
//   3) In TEXTUREN eintragen:  parchment: pergament,
//   Fertig - Vite bündelt das Bild automatisch, es erscheint im Menü.

// --- Import-Slots (auskommentiert lassen, bis das Bild existiert) -------------
// import parchment from '../../assets/ui/parchment.png';
// import wood from '../../assets/ui/wood.png';
// import button from '../../assets/ui/button.png';

interface MvTexturen {
  parchment?: string;   // Pergamentfläche der Panels        -> --mv-img-parchment
  wood?: string;        // Holz der Kopfzeile/Reiter          -> --mv-img-wood
  button?: string;      // Knopf-Oberfläche                   -> --mv-img-button
}

// Codex trägt hier die importierten Bilder ein (Wert = import-Variable):
const TEXTUREN: MvTexturen = {
  // parchment,
  // wood,
  // button,
};

// Schreibt die vorhandenen Texturen in die CSS-Variablen (nur was gesetzt ist).
export function wendeMvTexturenAn(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  const setze = (v: string, url?: string): void => { if (url) root.setProperty(v, `url(${JSON.stringify(url)})`); };
  setze('--mv-img-parchment', TEXTUREN.parchment);
  setze('--mv-img-wood', TEXTUREN.wood);
  setze('--mv-img-button', TEXTUREN.button);
}
