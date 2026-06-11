import { defineConfig } from 'vite';

export default defineConfig({
  // Die Spiel-Assets liegen bewusst in assets/ (siehe ASSETS-LIESMICH.txt)
  // und werden unveraendert unter / ausgeliefert.
  publicDir: 'assets',
  server: {
    host: true,
    // Fester eigener Port, damit parallel laufende andere Projekte
    // (ueblicherweise 5173) nicht in die Quere kommen.
    port: 5190,
    strictPort: true,
  },
});
