import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas: funciona en la raíz (Vercel) y en subdirectorios (GitHub Pages).
  base: './',
  build: {
    outDir: 'dist',
    // Los sprites se importan desde art/source: se emiten siempre como archivos, nunca en base64.
    assetsInlineLimit: 0,
    // Phaser es grande; se separa en su propio chunk para cachearlo mejor.
    rollupOptions: {
      output: { manualChunks: { phaser: ['phaser'] } },
    },
    chunkSizeWarningLimit: 1500,
  },
});
