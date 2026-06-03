import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the built index.html also works when Electron
  // loads it via the file:// protocol.
  base: './',
  server: {
    port: 5173,
    open: false,
  },
});
