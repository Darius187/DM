// Inventur der Asset-Pakete (Phase 11): scannt assets/packs/, liest
// PNG-Maße, rät Kachelgrößen, gleicht mit gfx-mapping.json ab und schreibt
// PACKS-INVENTAR.md inklusive Lückenbericht.
// Aufruf: node scripts/packs-inventar.mjs

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const PACKS = join(ROOT, 'assets', 'packs');
const MAPPING = join(ROOT, 'src', 'data', 'gfx-mapping.json');
const OUT = join(ROOT, 'PACKS-INVENTAR.md');

// Spielbedarf (muss zu src/gfx/assetManifest.ts passen)
const FIGUREN_BEDARF = [
  'spieler', 'pest', 'skelett', 'schuetze', 'schatten', 'templer', 'wolf', 'ratte',
  'heinrich', 'magdalena', 'johannes', 'landherr', 'schmied', 'mueller',
  'bauer1', 'bauer2', 'haendler', 'huhn', 'schwein', 'kuh', 'hund',
];
const TILES_BEDARF = [
  'gras', 'weg', 'baum', 'wasser', 'acker', 'zaun', 'fels',
  'fachwerk_fassade', 'fachwerk_dach', 'kirche_fassade', 'kirche_dach', 'kirchentuer',
  'grabstein', 'brunnen', 'brandstelle', 'heuhaufen',
  'krypta_boden', 'krypta_wand', 'knochen', 'blut', 'rune', 'altar', 'regal',
  'treppe_ab', 'treppe_auf', 'erzader', 'streckbank', 'kaefig', 'kerzenschrein',
  'fass', 'kiste', 'krug',
];

function pngSize(file) {
  const buf = readFileSync(file);
  if (buf.length < 24 || buf.readUInt32BE(12) !== 0x49484452) return null; // IHDR
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function guessTile(w, h) {
  for (const t of [48, 32, 16, 8]) {
    if (w % t === 0 && h % t === 0) return t;
  }
  return null;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

if (!existsSync(PACKS)) {
  console.error('assets/packs/ existiert nicht - bitte zuerst Pakete ablegen (siehe Anleitung).');
  process.exit(1);
}

const mapping = JSON.parse(readFileSync(MAPPING, 'utf8'));
const gemappteFiguren = Object.keys(mapping.figuren ?? {});
const gemappteTiles = Object.keys(mapping.tiles ?? {});

const packs = new Map(); // paketname -> dateien
let pngCount = 0;
for (const file of walk(PACKS)) {
  const rel = relative(PACKS, file);
  if (!rel.includes('/')) continue; // lose Dateien (z. B. HIERHER.txt) sind kein Paket
  const pack = rel.split('/')[0];
  if (!packs.has(pack)) packs.set(pack, []);
  const entry = { rel: relative(join(ROOT, 'assets'), file), name: rel };
  if (file.toLowerCase().endsWith('.png')) {
    const size = pngSize(file);
    if (size) {
      entry.size = size;
      entry.tile = guessTile(size.w, size.h);
      pngCount++;
    }
  }
  packs.get(pack).push(entry);
}

const lines = [];
lines.push('# PACKS-INVENTAR - Asset-Pakete und Zuordnung');
lines.push('');
lines.push(`Stand: ${new Date().toLocaleString('de-DE')} · erzeugt von scripts/packs-inventar.mjs`);
lines.push('');
if (packs.size === 0) {
  lines.push('KEINE PAKETE GEFUNDEN. Bitte ZIPs nach assets/packs/<paketname>/ entpacken');
  lines.push('und dieses Skript erneut ausführen.');
} else {
  for (const [pack, files] of packs) {
    lines.push(`## Paket: ${pack}`);
    lines.push('');
    lines.push('| Datei | Maße | mögliche Kachelgröße |');
    lines.push('|---|---|---|');
    for (const f of files) {
      if (!f.size) continue;
      lines.push(`| ${f.name} | ${f.size.w}x${f.size.h} | ${f.tile ? f.tile + 'px' : '-'} |`);
    }
    const sonstige = files.filter((f) => !f.size).length;
    if (sonstige) lines.push(`| _(+${sonstige} Nicht-PNG-Dateien: Lizenz/Doku/GIF)_ | | |`);
    lines.push('');
  }
}
lines.push('## Zuordnungs-Stand (gfx-mapping.json)');
lines.push('');
lines.push(`- Figuren gemappt: ${gemappteFiguren.length ? gemappteFiguren.join(', ') : 'keine'}`);
lines.push(`- Tiles gemappt: ${gemappteTiles.length ? gemappteTiles.join(', ') : 'keine'}`);
lines.push('');
lines.push('## Lückenbericht (läuft auf programmatischem Fallback)');
lines.push('');
const figLuecken = FIGUREN_BEDARF.filter((f) => !gemappteFiguren.includes(f));
const tileLuecken = TILES_BEDARF.filter((t) => !gemappteTiles.includes(t));
lines.push(`- Figuren ohne Pack-Grafik (${figLuecken.length}/${FIGUREN_BEDARF.length}): ${figLuecken.join(', ') || 'keine'}`);
lines.push(`- Tiles ohne Pack-Grafik (${tileLuecken.length}/${TILES_BEDARF.length}): ${tileLuecken.join(', ') || 'keine'}`);
lines.push('');
lines.push('Suchvorschläge für offene Lücken (itch.io): "top-down village tileset 16x16"');
lines.push('für Dorf/Fachwerk, "undead dungeon tileset top down" für die Krypta,');
lines.push('"farm animals pixel 16x16" für Hühner/Schweine/Kuh, Tag "Dark Fantasy"');
lines.push('für Gegner. Kachelgröße konsistent halten (alles 16px ODER alles 32px).');
lines.push('');
writeFileSync(OUT, lines.join('\n'));
console.log(`PACKS-INVENTAR.md geschrieben: ${packs.size} Pakete, ${pngCount} PNGs, ` +
  `${figLuecken.length} Figuren- und ${tileLuecken.length} Tile-Lücken.`);
