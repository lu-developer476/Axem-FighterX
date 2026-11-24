import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = path.join(ROOT, 'public', 'minigames');
const ENTRY = path.join(OUTPUT, 'index.html');
const BOOTSTRAP = path.join(OUTPUT, 'minigame-bootstrap.js');

async function main() {
  const [entry, bootstrap] = await Promise.all([
    fs.stat(ENTRY),
    fs.stat(BOOTSTRAP),
  ]);
  if (!entry.isFile() || entry.size === 0) {
    throw new Error('El archivo de entrada HTML5 está vacío o no es un archivo.');
  }
  if (!bootstrap.isFile() || bootstrap.size === 0) {
    throw new Error('Falta public/minigames/minigame-bootstrap.js.');
  }

  const html = await fs.readFile(ENTRY, 'utf8');
  if (/<script\b(?![^>]*\bsrc\s*=)[^>]*>/i.test(html)) {
    throw new Error("index.html contiene scripts inline; Vercel los bloquea con script-src 'self'.");
  }
  if (!/src=["']\.\/index\.js["']/.test(html) ||
      !/src=["']\.\/minigame-bootstrap\.js["']/.test(html)) {
    throw new Error('index.html debe cargar index.js y minigame-bootstrap.js como scripts externos.');
  }

  console.log('Build HTML5 de HaxeFlixel verificado: HTML5 presente y compatible con CSP.');
}

main().catch((error) => {
  console.error(
    'No está disponible un build HTML5 de HaxeFlixel válido para Vercel. ' +
    'Ejecutá "npm run build:haxe" antes de desplegar.'
  );
  console.error(error);
  process.exitCode = 1;
});
