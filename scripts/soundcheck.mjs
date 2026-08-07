// SOUND-QUALITAETS-PRUEFUNG (R109, Autorwunsch "Sound ist wichtig - analysiere
// das immer, wenn ich neue Sounds gebe"). Liest alle Dateien in assets/sounds/
// und meldet Format, Abtastrate, Kanaele (Mono/Stereo), Bitrate/Bittiefe.
// Aufruf:  node scripts/soundcheck.mjs [ordner]
// Kein ffprobe noetig - die Header werden direkt geparst (MP3/WAV/OGG).

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';

const ordner = process.argv[2] ?? 'assets/sounds';

const MP3_RATEN = { 0: [11025, 12000, 8000], 2: [22050, 24000, 16000], 3: [44100, 48000, 32000] };
const MP3_BITRATE_V1L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const MP3_BITRATE_V2L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];

function pruefeMp3(buf) {
  // ID3v2 ueberspringen
  let o = 0;
  if (buf.length > 10 && buf.toString('latin1', 0, 3) === 'ID3') {
    o = 10 + ((buf[6] & 0x7f) << 21 | (buf[7] & 0x7f) << 14 | (buf[8] & 0x7f) << 7 | (buf[9] & 0x7f));
  }
  // ersten Frame-Sync suchen
  for (; o < buf.length - 4; o++) {
    if (buf[o] === 0xff && (buf[o + 1] & 0xe0) === 0xe0) break;
  }
  if (o >= buf.length - 4) return null;
  const b1 = buf[o + 1], b2 = buf[o + 2], b3 = buf[o + 3];
  const versionBits = (b1 >> 3) & 3;           // 3=MPEG1, 2=MPEG2, 0=MPEG2.5
  const rateIdx = (b2 >> 2) & 3;
  const bitrateIdx = (b2 >> 4) & 15;
  const kanalModus = (b3 >> 6) & 3;             // 3 = Mono
  const raten = MP3_RATEN[versionBits];
  const rate = raten ? raten[rateIdx] : undefined;
  const kbit = (versionBits === 3 ? MP3_BITRATE_V1L3 : MP3_BITRATE_V2L3)[bitrateIdx];
  return { format: 'MP3 (verlustbehaftet)', rate, kanaele: kanalModus === 3 ? 1 : 2, detail: `${kbit || '?'} kbit/s` };
}

function pruefeWav(buf) {
  if (buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WAVE') return null;
  // fmt-Chunk suchen
  let o = 12;
  while (o + 8 <= buf.length) {
    const id = buf.toString('latin1', o, o + 4);
    const len = buf.readUInt32LE(o + 4);
    if (id === 'fmt ') {
      const kanaele = buf.readUInt16LE(o + 10);
      const rate = buf.readUInt32LE(o + 12);
      const bits = buf.readUInt16LE(o + 22);
      return { format: 'WAV (unkomprimiert)', rate, kanaele, detail: `${bits} bit` };
    }
    o += 8 + len + (len % 2);
  }
  return null;
}

function pruefeOgg(buf) {
  if (buf.toString('latin1', 0, 4) !== 'OggS') return null;
  const i = buf.indexOf('vorbis', 0, 'latin1');
  if (i < 0 || i + 16 > buf.length) return { format: 'OGG', rate: undefined, kanaele: undefined, detail: '' };
  const kanaele = buf[i + 10];
  const rate = buf.readUInt32LE(i + 11);
  return { format: 'OGG Vorbis (verlustbehaftet)', rate, kanaele, detail: '' };
}

const dateien = readdirSync(ordner).filter((f) => ['.mp3', '.wav', '.ogg', '.m4a', '.flac'].includes(extname(f).toLowerCase())).sort();
let mono = 0, niedrig = 0, lossy = 0;
console.log(`Soundpruefung: ${ordner} - ${dateien.length} Dateien\n`);
console.log('Datei'.padEnd(32), 'Format'.padEnd(28), 'Rate'.padEnd(9), 'Kanäle'.padEnd(7), 'Detail', '   Größe');
for (const f of dateien) {
  const p = join(ordner, f);
  const buf = readFileSync(p);
  const kb = Math.round(statSync(p).size / 1024);
  const info = pruefeWav(buf) ?? pruefeOgg(buf) ?? pruefeMp3(buf) ?? { format: 'unbekannt', rate: undefined, kanaele: undefined, detail: '' };
  if (info.kanaele === 1) mono++;
  if (info.rate && info.rate < 44100) niedrig++;
  if (info.format.includes('verlustbehaftet')) lossy++;
  const rate = info.rate ? `${info.rate / 1000} kHz` : '?';
  const kan = info.kanaele === 1 ? 'MONO' : info.kanaele === 2 ? 'Stereo' : '?';
  console.log(f.padEnd(32), info.format.padEnd(28), String(rate).padEnd(9), kan.padEnd(7), String(info.detail).padEnd(10), `${kb} KB`);
}
console.log(`\nFazit: ${dateien.length} Dateien | ${lossy} verlustbehaftet | ${mono} mono | ${niedrig} unter 44.1 kHz`);
console.log('Empfehlung: Quellen in 48 kHz / 24 bit WAV anliefern; Auslieferung als WAV (kurze');
console.log('Effekte) oder OGG Vorbis q8+. MP3 unter 192 kbit/s ist fuer Effekte hoerbar schlechter.');
