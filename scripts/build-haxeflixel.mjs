import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = path.join(ROOT, 'haxeflixel');
const OUTPUT = path.join(PROJECT, 'export', 'html5', 'bin');
const PUBLIC_OUTPUT = path.join(ROOT, 'public', 'minigames');

async function main() {
  const result = spawnSync('haxelib', ['run', 'lime', 'build', 'html5', '-release'], {
    cwd: PROJECT,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    throw new Error('No se pudo ejecutar Haxe/Lime. Instalá Haxe, Lime, OpenFL y HaxeFlixel antes de compilar.');
  }
  if (result.status !== 0) {
    throw new Error('Falló la compilación HTML5 de HaxeFlixel (código ' + result.status + ').');
  }

  try {
    await fs.access(path.join(OUTPUT, 'index.html'));
  } catch {
    throw new Error('Lime terminó sin generar export/html5/bin/index.html.');
  }

  await fs.rm(PUBLIC_OUTPUT, { recursive: true, force: true });
  await fs.mkdir(PUBLIC_OUTPUT, { recursive: true });
  await fs.cp(OUTPUT, PUBLIC_OUTPUT, { recursive: true });
  console.log('HaxeFlixel publicado para Vite en public/minigames/.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
