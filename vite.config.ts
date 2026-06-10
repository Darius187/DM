import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // Hot-Swap-Ordner: alles unter assets/ wird unter / ausgeliefert,
  // das Spiel lädt z. B. portraits/heinrich.png (= assets/portraits/heinrich.png)
  publicDir: 'assets',
  server: { host: true, port: 5173 },
  build: { target: 'es2022' },
});
