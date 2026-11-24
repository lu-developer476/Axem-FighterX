import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(ROOT, 'public', 'minigames', 'index.html');

try {
  const entry = await fs.stat(ENTRY);
  if (!entry.isFile() || entry.size === 0) {
    throw new Error('El archivo de entrada está vacío o no es un archivo.');
  }
  console.log('Build HTML5 de HaxeFlixel verificado: public/minigames/index.html');
} catch (error) {
  console.error(
    'No está disponible el build HTML5 de HaxeFlixel en public/minigames/index.html. ' +
    'Generalo con "npm run build:haxe" y versioná public/minigames antes de desplegar en Vercel.'
  );
  console.error(error);
  process.exitCode = 1;
}
