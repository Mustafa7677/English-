import { defineConfig } from 'vite';

export default defineConfig({
  server: { host: true, port: 5173 },
  // assetsInlineLimit: the map card pictures are inlined, so the game stays one self-contained HTML file
  build: { chunkSizeWarningLimit: 1200, assetsInlineLimit: 200000 },
});
