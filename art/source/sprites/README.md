# Recursos gráficos versionados

Los PNG y GIF que están en este árbol son archivos versionados y constituyen la fuente de verdad del juego. Se usan directamente desde sus rutas actuales; no hay pasos que los regeneren, normalicen, reescriban o eliminen.

## Fuentes de Axem

- Artwork estático Orange: `results/male/orange/super-axem-ranger-orange.png`.
- Hoja de poses Orange: `results/male/orange/spritesheet.png`.
- Tiras PNG mantenidas para carrera y combate: `results/male/orange/run.png` y `results/male/orange/bike.png`.
- Animaciones versionadas: los GIF de `results/male/orange/`.
- Referencia Pink: `references/axem-pink/super-axem-pink.png`.
- GIF maestro de bicicleta Red: `references/axem-red/axem-red-nitro-bike.gif`.

Los recursos de efectos manuales están en `art/source/effects/`. Los PNG y GIF originales se conservan tal como están versionados, incluyendo los directorios `axem`, `canon` y `sparks`.

## Validación

`npm test`, `npm run build` y `npm run validate:assets` no generan ni modifican imágenes. El validador abre los archivos existentes para comprobar formato, dimensiones, transparencia y decodificación; no escribe archivos.

Los minijuegos HaxeFlixel también consumen PNG ya versionados en `public/minigames/assets/races/` y fuentes PNG de `art/source/effects/bike/`. La compilación reconstruye únicamente el bundle ejecutable del minijuego; no convierte GIF ni modifica los assets fuente.
