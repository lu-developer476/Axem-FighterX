import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    // Phaser es grande; se separa en su propio chunk para cachearlo mejor.
    rollupOptions: {
      output: { manualChunks: { phaser: ['phaser'] } },
    },
    chunkSizeWarningLimit: 1500,
  },
});
