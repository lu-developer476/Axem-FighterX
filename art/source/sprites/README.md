# Recursos gráficos versionados

Los PNG y GIF que están en este árbol son archivos versionados y constituyen la fuente de verdad del juego. Se usan directamente desde sus rutas actuales; no hay pasos que los regeneren, normalicen, reescriban o eliminen.

## Fuentes de Axem

- Artwork estático Orange: `results/male/orange/super-orange/super-axem-ranger-orange.png`.
- Recursos de la variante Orange: archivos de la carpeta `results/male/orange/` con el prefijo `axem-orange-`.
- Tiras PNG de carrera y combate Orange: `axem-orange-run.png` y `axem-orange-bike.png`.
- Referencia y recursos de White: archivos de `results/male/white/` con el prefijo `axem-white-`.
- Recursos de Super White: archivos de `results/male/white/super-white/` con el prefijo `super-white-`.
- Referencia Pink: `references/axem-pink/super-axem-pink.png`.
- GIF maestro de bicicleta Red: `references/axem-red/axem-red-nitro-bike.gif`.

Los recursos de efectos manuales están en `art/source/effects/`. Los PNG y GIF originales se conservan tal como están versionados, incluyendo los directorios `axem`, `canon` y `sparks`.

## Validación

`npm test`, `npm run build` y `npm run validate:assets` no generan ni modifican imágenes. El validador abre los archivos existentes para comprobar formato, dimensiones, transparencia, decodificación y nomenclatura; no escribe archivos.

Los minijuegos HaxeFlixel también consumen PNG ya versionados en `public/minigames/assets/races/` y fuentes PNG de `art/source/effects/bike/`. La compilación reconstruye únicamente el bundle ejecutable del minijuego; no convierte GIF ni modifica los assets fuente.
