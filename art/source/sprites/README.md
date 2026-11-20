# Atlas compartido de Axem Rangers X

Fuente única de movimientos: **`axem-rangers-moves-sprites.png`** (730 × 804 px, origen arriba a la izquierda, fondo teal plano `rgb(0, 128, 128)`). El original no se modifica: el juego recorta cada cuadro en memoria, quita el fondo y genera Violet y Orange cambiando el tono HSL de la familia roja.

## El atlas no es una cuadrícula

Cada fila tiene distinta cantidad de cuadros, anchos y separaciones (por ejemplo, la distancia entre inicios de cuadro de `idle` va de 27 a 38 px). Por eso **no se usan celdas uniformes**: cada cuadro tiene su propio rectángulo `[x, y, ancho, alto]`, ajustado a los píxeles del personaje. Los rectángulos se detectan con `scripts/analyze-atlas.mjs` y quedan en `src/infrastructure/assets/axemAtlasFrames.json`.

Cada cuadro guarda además `pivotX` (columna de los pies relativa al cuadro). Al armar las hojas, todos los cuadros activos se apoyan sobre la línea base de su grupo y se alinean por ese pivote en una celda común de 48 × 52 px, de modo que el personaje no “salta” cuando la bufanda o un tajo ensanchan el rectángulo, y la escala es igual en todos los estados.

Para regenerar el manifiesto tras cambiar el atlas: `node scripts/analyze-atlas.mjs`. `sharedAxemAtlas.test.js` falla si el manifiesto deja de coincidir con el PNG.

## Secuencias activas (combate)

La misma tabla de coordenadas se usa para Violet y Orange. Solo cambia el tono: violeta (268°) o naranja (22°); se conservan luminosidad, saturación, transparencia y los colores no rojos (bufanda amarilla, grises, negros).

| Estado | Grupo | Cuadros | Reproducción |
|---|---|---:|---|
| `idle` | `group-01` | 7 | 6 fps, loop |
| `walk` | `group-02` | 9 | 10 fps, loop |
| `attack` | `group-03` | 10 | duración del ataque del dominio |

## Todos los grupos y sus cuadros

Los grupos se numeran de arriba hacia abajo y los cuadros de izquierda a derecha. Cada cuadro es `x,y ancho×alto`. Los grupos 01–03 son los activos; el resto son referencias identificadas que **no** se reproducen hasta clasificar cada pose.

### group-01 — activo: `idle`

Región `[3, 3, 226, 46]` · 7 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 3 | 6 | 34 | 43 | 16 |
| 1 | 41 | 4 | 24 | 45 | 11 |
| 2 | 70 | 3 | 22 | 46 | 10 |
| 3 | 97 | 3 | 25 | 46 | 13 |
| 4 | 128 | 3 | 25 | 46 | 13 |
| 5 | 158 | 6 | 31 | 43 | 14 |
| 6 | 192 | 8 | 37 | 41 | 18 |

### group-02 — activo: `walk`

Región `[3, 57, 354, 43]` · 9 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 3 | 59 | 34 | 41 | 15 |
| 1 | 43 | 58 | 34 | 42 | 15 |
| 2 | 82 | 58 | 34 | 42 | 15 |
| 3 | 121 | 57 | 34 | 43 | 15 |
| 4 | 158 | 57 | 34 | 43 | 15 |
| 5 | 199 | 58 | 34 | 42 | 15 |
| 6 | 239 | 58 | 34 | 42 | 15 |
| 7 | 282 | 59 | 34 | 41 | 15 |
| 8 | 323 | 59 | 34 | 41 | 15 |

### group-03 — activo: `attack`

Región `[12, 109, 421, 44]` · 10 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 12 | 110 | 32 | 43 | 17 |
| 1 | 50 | 109 | 33 | 44 | 18 |
| 2 | 88 | 122 | 44 | 31 | 14 |
| 3 | 137 | 119 | 39 | 34 | 14 |
| 4 | 180 | 121 | 39 | 32 | 14 |
| 5 | 226 | 122 | 39 | 31 | 14 |
| 6 | 270 | 122 | 39 | 31 | 14 |
| 7 | 314 | 121 | 39 | 31 | 15 |
| 8 | 356 | 120 | 38 | 32 | 15 |
| 9 | 403 | 113 | 30 | 40 | 15 |

### group-04

Región `[14, 161, 355, 46]` · 8 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 14 | 170 | 30 | 37 | 15 |
| 1 | 57 | 170 | 31 | 37 | 16 |
| 2 | 99 | 161 | 42 | 46 | 16 |
| 3 | 147 | 162 | 39 | 45 | 17 |
| 4 | 194 | 161 | 37 | 46 | 15 |
| 5 | 240 | 162 | 37 | 45 | 15 |
| 6 | 288 | 162 | 37 | 45 | 15 |
| 7 | 333 | 167 | 36 | 40 | 15 |

### group-05

Región `[10, 220, 339, 44]` · 8 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 10 | 221 | 34 | 43 | 19 |
| 1 | 53 | 221 | 35 | 43 | 20 |
| 2 | 95 | 221 | 39 | 43 | 19 |
| 3 | 142 | 220 | 37 | 44 | 17 |
| 4 | 184 | 221 | 35 | 43 | 15 |
| 5 | 224 | 221 | 35 | 43 | 15 |
| 6 | 267 | 221 | 35 | 43 | 15 |
| 7 | 309 | 222 | 40 | 42 | 14 |

### group-06

Región `[9, 280, 255, 42]` · 5 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 9 | 280 | 50 | 41 | 20 |
| 1 | 65 | 280 | 47 | 41 | 15 |
| 2 | 114 | 280 | 47 | 41 | 15 |
| 3 | 167 | 280 | 47 | 41 | 15 |
| 4 | 217 | 281 | 47 | 41 | 15 |

### group-07

Región `[10, 335, 255, 38]` · 5 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 10 | 335 | 44 | 38 | 20 |
| 1 | 61 | 335 | 45 | 38 | 20 |
| 2 | 118 | 336 | 44 | 37 | 19 |
| 3 | 168 | 336 | 44 | 37 | 19 |
| 4 | 221 | 336 | 44 | 37 | 19 |

### group-08

Región `[10, 394, 230, 46]` · 5 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 10 | 395 | 42 | 45 | 15 |
| 1 | 58 | 394 | 43 | 46 | 15 |
| 2 | 106 | 395 | 42 | 45 | 15 |
| 3 | 150 | 395 | 42 | 45 | 15 |
| 4 | 198 | 395 | 42 | 45 | 15 |

### group-09

Región `[4, 452, 210, 55]` · 5 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 4 | 453 | 36 | 54 | 21 |
| 1 | 46 | 452 | 37 | 55 | 22 |
| 2 | 94 | 452 | 32 | 55 | 17 |
| 3 | 142 | 452 | 30 | 55 | 15 |
| 4 | 184 | 452 | 30 | 55 | 15 |

### group-10

Región `[3, 524, 384, 41]` · 11 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 3 | 524 | 30 | 41 | 15 |
| 1 | 35 | 524 | 32 | 41 | 10 |
| 2 | 68 | 527 | 37 | 38 | 11 |
| 3 | 107 | 529 | 39 | 36 | 32 |
| 4 | 148 | 529 | 32 | 36 | 21 |
| 5 | 185 | 527 | 25 | 38 | 10 |
| 6 | 211 | 526 | 28 | 39 | 9 |
| 7 | 241 | 526 | 34 | 39 | 12 |
| 8 | 277 | 526 | 34 | 39 | 26 |
| 9 | 313 | 527 | 38 | 38 | 28 |
| 10 | 353 | 527 | 34 | 38 | 20 |

### group-11

Región `[11, 576, 399, 40]` · 8 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 11 | 577 | 31 | 35 | 10 |
| 1 | 53 | 581 | 39 | 31 | 13 |
| 2 | 99 | 582 | 40 | 30 | 13 |
| 3 | 152 | 582 | 40 | 30 | 13 |
| 4 | 205 | 582 | 40 | 30 | 13 |
| 5 | 260 | 582 | 40 | 30 | 13 |
| 6 | 322 | 577 | 33 | 39 | 15 |
| 7 | 376 | 576 | 34 | 40 | 16 |

### group-12

Región `[2, 624, 587, 50]` · 14 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 2 | 632 | 35 | 42 | 20 |
| 1 | 45 | 625 | 31 | 49 | 10 |
| 2 | 91 | 624 | 27 | 50 | 9 |
| 3 | 128 | 624 | 29 | 50 | 11 |
| 4 | 169 | 624 | 29 | 50 | 11 |
| 5 | 208 | 624 | 28 | 50 | 10 |
| 6 | 245 | 625 | 38 | 49 | 17 |
| 7 | 293 | 625 | 36 | 49 | 17 |
| 8 | 338 | 627 | 33 | 47 | 13 |
| 9 | 379 | 627 | 33 | 47 | 13 |
| 10 | 421 | 627 | 33 | 47 | 13 |
| 11 | 463 | 627 | 32 | 47 | 12 |
| 12 | 507 | 629 | 34 | 45 | 16 |
| 13 | 552 | 633 | 37 | 41 | 20 |

### group-13

Región `[8, 688, 268, 46]` · 6 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 8 | 688 | 35 | 45 | 18 |
| 1 | 49 | 689 | 38 | 44 | 19 |
| 2 | 99 | 691 | 31 | 42 | 15 |
| 3 | 148 | 692 | 31 | 41 | 15 |
| 4 | 199 | 693 | 32 | 41 | 15 |
| 5 | 244 | 694 | 32 | 40 | 15 |

### group-14

Región `[6, 743, 164, 46]` · 6 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 6 | 746 | 31 | 43 | 13 |
| 1 | 39 | 743 | 30 | 46 | 18 |
| 2 | 72 | 743 | 23 | 46 | 9 |
| 3 | 98 | 743 | 22 | 46 | 11 |
| 4 | 123 | 743 | 22 | 46 | 11 |
| 5 | 148 | 743 | 22 | 46 | 11 |

## Elementos excluidos

- **Zona derecha, `[525, 0, 205, 385]`:** siluetas de referencia (rojo pleno, rojo claro y rosa), el personaje caído, una pose con hacha, poses sueltas con accesorios, figuras aisladas y el rótulo “It's over…”. No son tiras de animación ni cuadros del personaje; se ignoran por completo.
- **Efectos adosados:** algunos cuadros incluyen un tajo o estela dentro de su rectángulo (por ejemplo `group-03` #2, `group-06` #0, `group-07` #0 y `group-09` #0). Forman parte de ese cuadro del atlas; no se registran como cuadros propios.
- Los PNG individuales de Violet/Orange, `axem-rangers-fullview.png` y las poses sueltas de `art/source/` se conservan intactos como referencia; no se cargan como segunda fuente de movimientos.

## Dónde está el código

- Detección (función pura): `src/infrastructure/assets/atlasFrameDetection.js`
- Reglas del atlas (fondo y zonas excluidas): `src/infrastructure/assets/atlasLayoutRules.js`
- Secuencias, celda común y paletas: `src/infrastructure/assets/sharedAxemAtlas.js`
- Recorte, fondo y recolor en memoria: `src/infrastructure/graphics/prepareSharedAxemTextures.js`
