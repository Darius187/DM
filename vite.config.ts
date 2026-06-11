import { defineConfig } from 'vite';

export default defineConfig({
  // Die Spiel-Assets liegen bewusst in assets/ (siehe ASSETS-LIESMICH.txt)
  // und werden unveraendert unter / ausgeliefert.
  publicDir: 'assets',
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
});
