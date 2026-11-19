import { defineConfig } from 'vite';
import { existsSync, readdirSync } from 'node:fs';

const SHEETS_DIR = 'public/assets/sprites/rangers';

/**
 * Expone `virtual:sprite-sheets`: la lista de hojas de sprites que existen en
 * public/assets/sprites/rangers/<ranger>/<estado>.png. Así el juego solo carga
 * lo que está subido y usa animaciones por código para el resto.
 * Si agregás archivos con el servidor de desarrollo abierto, reinicialo.
 */
function spriteSheetsPlugin() {
  const virtualId = 'virtual:sprite-sheets';
  const resolvedId = `\0${virtualId}`;
  return {
    name: 'axem-sprite-sheets',
    resolveId: (id) => (id === virtualId ? resolvedId : undefined),
    load(id) {
      if (id !== resolvedId) return undefined;
      const found = [];
      if (existsSync(SHEETS_DIR)) {
        for (const entry of readdirSync(SHEETS_DIR, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          for (const file of readdirSync(`${SHEETS_DIR}/${entry.name}`)) {
            if (file.toLowerCase().endsWith('.png')) found.push(`${entry.name}/${file}`);
          }
        }
      }
      return `export default ${JSON.stringify(found.sort())};`;
    },
  };
}

export default defineConfig({
  // Rutas relativas: funciona en la raíz (Vercel) y en subdirectorios (GitHub Pages).
  base: './',
  plugins: [spriteSheetsPlugin()],
  build: {
    outDir: 'dist',
    // Phaser es grande; se separa en su propio chunk para cachearlo mejor.
    rollupOptions: {
      output: { manualChunks: { phaser: ['phaser'] } },
    },
    chunkSizeWarningLimit: 1500,
  },
});
