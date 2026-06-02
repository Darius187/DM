// Copies the single-threaded Stockfish build from node_modules into public/
// so Vite serves it as a static asset. Single-threaded (lite-single) needs no
// SharedArrayBuffer, so it runs in a plain Web Worker without COOP/COEP headers.
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const srcDir = join(root, 'node_modules', 'stockfish', 'bin');
const outDir = join(root, 'public', 'engine');

const files = ['stockfish-18-lite-single.js', 'stockfish-18-lite-single.wasm'];

mkdirSync(outDir, { recursive: true });

let copied = 0;
for (const f of files) {
  const src = join(srcDir, f);
  if (!existsSync(src)) {
    console.error(`[copy-engine] missing ${src} — run "npm install" first.`);
    process.exit(1);
  }
  copyFileSync(src, join(outDir, f));
  copied++;
}
console.log(`[copy-engine] copied ${copied} engine file(s) to public/engine/`);
