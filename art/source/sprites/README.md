# Hojas de sprites de los Axem Rangers X

Hay dos géneros, cada uno con su hoja de referencia. **Violet** y **Orange** son variantes cromáticas de la referencia de su género: usan exactamente los mismos cuadros, poses y ataques, y solo cambia la paleta. No hay dos colecciones dibujadas a mano.

| Género | Referencia | Hoja | Tamaño | Dirección nativa |
|---|---|---|---|---|
| Masculino | Axem Red | `references/axem-red/axem-red-spritesheet.png` | 730 × 804 px, fondo teal `rgb(0,128,128)` | Derecha |
| Femenino | Axem Pink | `references/axem-pink/axem-pink-spritesheet.png` | 900 × 421 px, fondo blanco | Izquierda |

La orientación nativa se conserva en todas las imágenes de cada fuente: Axem Red masculino, incluidos el retrato base y los GIF de acción, apunta a la derecha; Axem Pink femenino apunta a la izquierda. El renderizador espeja cada sprite solo cuando el luchador necesita mirar hacia el lado contrario.

Las referencias nunca se modifican. Las poses sueltas (`axem-pink-pose.png`, `axem-pink-battle-pose.png`, `axem-pink-levitate.png`) y los GIF (`axem-ranger-run.gif`, `axem-ranger-bike.gif`, `axem-ranger-double-axe.gif`, de Axem Red) se recolorean con el mismo proceso.

## Cómo se generan los resultados

`npm run prepare:sprites` (también corre antes de `dev`, `build` y `test`) quita el fondo, cambia solo el tono de la familia cromática del traje (violeta 273°, naranja 22°, conservando luminosidad y saturación) y escribe en `results/`:

```
results/
  male/
    {violet,orange}/
      spritesheet.png                     hoja de Axem Red, mismas coordenadas que la referencia
      run.png  bike.png  double-axe.png   tiras PNG para el pipeline del juego
      run.gif  bike.gif  double-axe.gif   GIF animados con cabello negro, puntas marrones y fondo transparente
      sequences/group-01.png … group-14.png + index.json
  female/
    axem-ranger-{violet,orange}.png     referencias femeninas apiladas
    {violet,orange}/
      spritesheet.png  pose.png  battle-pose.png  levitate.png
```

Los retratos laterales del menú se generan directamente desde la referencia original `references/axem-red/axem-red-spritesheet.png`; no se necesita una vista previa duplicada en `results/male/`. El recoloreado del cabello recorre cada componente rubio de todas las poses, incluso cuando está separado del casco o la cara, para evitar que queden mechones originales sin procesar.

Los seis GIF masculinos de acción (`run.gif`, `bike.gif` y `double-axe.gif` de Violet y Orange) usan lienzos de **150 × 100 px**, como las referencias de bicicleta y doble hacha. La fuente de `run.gif` mide 101 × 100 px y se centra sobre transparencia para igualar el tamaño sin estirar ni deformar el personaje.

## El atlas no es una cuadrícula

Ninguna hoja tiene filas de cuadros uniformes: cambian la cantidad, el ancho y la separación (por ejemplo, la distancia entre inicios de cuadro de `group-01` va de 27 a 38 px) y ambas traen ruido de compresión en el fondo. Por eso no se usa un paso fijo: cada cuadro tiene su propio rectángulo `[x, y, ancho, alto]`, ajustado a los píxeles del personaje.

Los rectángulos los detecta `scripts/analyze-atlas.mjs` y quedan en `src/infrastructure/assets/atlasFrames.json`; las reglas (color de fondo, tolerancia, zonas excluidas) están en `atlasLayoutRules.js` y el algoritmo en `atlasFrameDetection.js`. Para regenerarlo tras cambiar una hoja: `node scripts/analyze-atlas.mjs`. `atlasFrames.test.js` verifica las cantidades, que no haya superposiciones y que Violet y Orange tengan el mismo canal alfa en cada hoja generada.

## Masculino (Axem Red): 14 grupos, 107 cuadros

Estrategia de filas: proyección de píxeles → tiras → cuadros. Los grupos se numeran de arriba hacia abajo y los cuadros de izquierda a derecha. `pivotX` es la columna de los pies relativa al cuadro. Cada tira de `sequences/` pone todos los cuadros de un grupo en celdas del mismo tamaño, con los pies sobre la misma línea y alineados por `pivotX`, así el personaje no “salta” cuando la bufanda o un tajo ensanchan el rectángulo.

`group-01` (idle), `group-02` (walk) y `group-03` (attack) son las secuencias de combate; el resto queda disponible sin interpretar.

### group-01 — `idle`

Región `[3, 4, 226, 45]` · 7 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 3 | 7 | 34 | 42 | 16 |
| 1 | 41 | 5 | 24 | 44 | 11 |
| 2 | 70 | 4 | 22 | 45 | 10 |
| 3 | 97 | 4 | 25 | 45 | 13 |
| 4 | 128 | 4 | 25 | 45 | 13 |
| 5 | 158 | 7 | 31 | 42 | 15 |
| 6 | 192 | 9 | 37 | 40 | 17 |

### group-02 — `walk`

Región `[3, 58, 354, 42]` · 9 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 3 | 60 | 34 | 40 | 14 |
| 1 | 43 | 59 | 33 | 41 | 14 |
| 2 | 82 | 59 | 34 | 41 | 14 |
| 3 | 121 | 58 | 34 | 42 | 14 |
| 4 | 158 | 58 | 34 | 42 | 14 |
| 5 | 199 | 59 | 34 | 41 | 14 |
| 6 | 239 | 59 | 34 | 41 | 14 |
| 7 | 282 | 60 | 34 | 40 | 14 |
| 8 | 323 | 60 | 34 | 40 | 14 |

### group-03 — `attack`

Región `[12, 109, 421, 44]` · 10 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 12 | 110 | 32 | 43 | 16 |
| 1 | 50 | 109 | 33 | 44 | 18 |
| 2 | 88 | 122 | 44 | 31 | 14 |
| 3 | 137 | 119 | 39 | 34 | 14 |
| 4 | 180 | 121 | 39 | 32 | 14 |
| 5 | 226 | 122 | 39 | 31 | 15 |
| 6 | 270 | 122 | 39 | 31 | 14 |
| 7 | 314 | 121 | 39 | 31 | 15 |
| 8 | 356 | 120 | 38 | 32 | 15 |
| 9 | 403 | 114 | 30 | 39 | 14 |

### group-04

Región `[14, 162, 355, 45]` · 8 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 14 | 171 | 30 | 36 | 14 |
| 1 | 57 | 171 | 31 | 36 | 15 |
| 2 | 100 | 162 | 41 | 45 | 14 |
| 3 | 148 | 163 | 38 | 44 | 15 |
| 4 | 194 | 162 | 37 | 45 | 15 |
| 5 | 240 | 163 | 37 | 44 | 14 |
| 6 | 288 | 163 | 37 | 44 | 14 |
| 7 | 333 | 168 | 36 | 39 | 15 |

### group-05

Región `[10, 221, 339, 43]` · 8 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 10 | 222 | 34 | 42 | 18 |
| 1 | 53 | 222 | 35 | 42 | 19 |
| 2 | 96 | 222 | 38 | 42 | 17 |
| 3 | 142 | 221 | 37 | 43 | 16 |
| 4 | 184 | 222 | 35 | 42 | 14 |
| 5 | 224 | 222 | 35 | 42 | 14 |
| 6 | 267 | 222 | 35 | 42 | 14 |
| 7 | 309 | 223 | 40 | 41 | 14 |

### group-06

Región `[10, 281, 254, 41]` · 5 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 10 | 281 | 48 | 40 | 19 |
| 1 | 65 | 281 | 47 | 40 | 15 |
| 2 | 114 | 281 | 46 | 40 | 15 |
| 3 | 167 | 281 | 47 | 40 | 14 |
| 4 | 217 | 282 | 47 | 40 | 14 |

### group-07

Región `[10, 336, 254, 37]` · 5 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 10 | 336 | 43 | 37 | 19 |
| 1 | 61 | 336 | 45 | 37 | 20 |
| 2 | 118 | 337 | 44 | 36 | 19 |
| 3 | 168 | 337 | 44 | 36 | 19 |
| 4 | 221 | 337 | 43 | 36 | 18 |

### group-08

Región `[10, 394, 230, 46]` · 5 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 10 | 396 | 42 | 44 | 15 |
| 1 | 58 | 394 | 43 | 46 | 14 |
| 2 | 106 | 395 | 42 | 45 | 14 |
| 3 | 150 | 395 | 42 | 45 | 15 |
| 4 | 198 | 395 | 42 | 45 | 15 |

### group-09

Región `[4, 453, 210, 54]` · 5 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 4 | 453 | 36 | 54 | 21 |
| 1 | 47 | 453 | 36 | 54 | 21 |
| 2 | 94 | 453 | 32 | 54 | 16 |
| 3 | 142 | 453 | 30 | 54 | 14 |
| 4 | 184 | 453 | 30 | 54 | 14 |

### group-10

Región `[3, 525, 384, 40]` · 11 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 3 | 525 | 30 | 40 | 15 |
| 1 | 35 | 525 | 32 | 40 | 10 |
| 2 | 68 | 527 | 37 | 38 | 11 |
| 3 | 107 | 529 | 39 | 36 | 32 |
| 4 | 148 | 529 | 32 | 36 | 20 |
| 5 | 185 | 528 | 25 | 37 | 10 |
| 6 | 211 | 527 | 28 | 38 | 9 |
| 7 | 241 | 527 | 34 | 38 | 12 |
| 8 | 277 | 527 | 34 | 38 | 26 |
| 9 | 313 | 528 | 38 | 37 | 28 |
| 10 | 353 | 528 | 34 | 37 | 20 |

### group-11

Región `[11, 577, 399, 39]` · 8 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 11 | 578 | 31 | 34 | 10 |
| 1 | 53 | 582 | 39 | 30 | 13 |
| 2 | 99 | 583 | 40 | 29 | 13 |
| 3 | 152 | 583 | 40 | 29 | 13 |
| 4 | 205 | 583 | 40 | 29 | 13 |
| 5 | 260 | 583 | 40 | 29 | 13 |
| 6 | 322 | 578 | 33 | 38 | 14 |
| 7 | 376 | 577 | 34 | 39 | 15 |

### group-12

Región `[3, 624, 586, 50]` · 14 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 3 | 633 | 34 | 41 | 19 |
| 1 | 45 | 626 | 31 | 48 | 10 |
| 2 | 91 | 624 | 27 | 50 | 9 |
| 3 | 128 | 624 | 29 | 50 | 11 |
| 4 | 169 | 624 | 29 | 50 | 11 |
| 5 | 208 | 624 | 28 | 50 | 10 |
| 6 | 245 | 626 | 38 | 48 | 17 |
| 7 | 293 | 626 | 36 | 48 | 17 |
| 8 | 338 | 628 | 33 | 46 | 13 |
| 9 | 379 | 628 | 33 | 46 | 13 |
| 10 | 421 | 628 | 33 | 46 | 13 |
| 11 | 463 | 628 | 32 | 46 | 12 |
| 12 | 507 | 630 | 34 | 44 | 16 |
| 13 | 552 | 634 | 37 | 40 | 19 |

### group-13

Región `[8, 689, 268, 45]` · 6 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 8 | 689 | 35 | 44 | 18 |
| 1 | 49 | 690 | 38 | 43 | 19 |
| 2 | 99 | 692 | 31 | 41 | 14 |
| 3 | 148 | 693 | 31 | 40 | 14 |
| 4 | 199 | 694 | 32 | 40 | 14 |
| 5 | 244 | 695 | 32 | 39 | 14 |

### group-14

Región `[6, 744, 164, 45]` · 6 cuadros

| # | x | y | ancho | alto | pivotX |
|---:|---:|---:|---:|---:|---:|
| 0 | 6 | 747 | 31 | 42 | 13 |
| 1 | 40 | 744 | 29 | 45 | 17 |
| 2 | 72 | 744 | 23 | 45 | 9 |
| 3 | 98 | 744 | 22 | 45 | 10 |
| 4 | 123 | 744 | 22 | 45 | 11 |
| 5 | 148 | 744 | 22 | 45 | 11 |

### Zona excluida

- `reference-poses` `[525, 0, 205, 385]`: Siluetas de referencia (rojo pleno, rojo claro y rosa), personaje caído, pose con hacha, y poses sueltas: no forman tiras de animación.

## Femenino (Axem Pink): 116 regiones, 84 de personaje

La hoja de Pink tiene distribución libre (poses en el aire, estelas, armas sueltas, íconos), así que no se agrupa en tiras. Se detectan componentes conexos que se fusionan si están a 3 px o menos, y cada región se clasifica por su color: un personaje tiene masa rosada más el azul verdoso del traje o la bufanda amarilla; las estelas, armas, corazones, la figura con ojos y las tres siluetas de referencia quedan como `other`. Las regiones van en orden de lectura aproximado (franjas de 40 px y luego izquierda a derecha).

**La clasificación es heurística.** 12 regiones llevan una marca `review` para revisarlas a mano: `varias-poses` (una sola caja con más de una pose fusionada por una estela o un arma que las toca) y `posible-personaje` (vistas laterales angostas o poses tumbadas que se descartaron). Por eso las hojas femeninas generadas conservan la distribución original completa en lugar de recortar tiras por cuadro.

| # | x | y | ancho | alto | tipo | revisión |
|---:|---:|---:|---:|---:|---|---|
| 0 | 435 | 9 | 32 | 39 | character |  |
| 1 | 479 | 10 | 28 | 39 | character |  |
| 2 | 527 | 26 | 36 | 47 | character |  |
| 3 | 578 | 27 | 37 | 46 | character |  |
| 4 | 622 | 25 | 40 | 48 | character |  |
| 5 | 668 | 23 | 33 | 53 | character |  |
| 6 | 710 | 35 | 24 | 38 | character |  |
| 7 | 742 | 37 | 28 | 37 | character |  |
| 8 | 778 | 33 | 18 | 37 | character |  |
| 9 | 800 | 35 | 29 | 33 | character |  |
| 10 | 836 | 32 | 28 | 36 | character |  |
| 11 | 872 | 30 | 18 | 35 | other |  |
| 12 | 203 | 79 | 29 | 36 | character |  |
| 13 | 241 | 61 | 31 | 52 | character |  |
| 14 | 281 | 64 | 32 | 52 | character |  |
| 15 | 324 | 68 | 31 | 53 | character |  |
| 16 | 368 | 67 | 31 | 52 | character |  |
| 17 | 409 | 59 | 84 | 54 | character | varias-poses |
| 18 | 16 | 80 | 31 | 32 | character |  |
| 19 | 54 | 81 | 18 | 32 | other |  |
| 20 | 78 | 82 | 16 | 31 | other |  |
| 21 | 106 | 81 | 23 | 32 | character |  |
| 22 | 144 | 83 | 29 | 34 | character |  |
| 23 | 182 | 83 | 17 | 30 | other |  |
| 24 | 504 | 82 | 40 | 38 | character |  |
| 25 | 566 | 82 | 52 | 54 | character |  |
| 26 | 639 | 84 | 32 | 55 | character |  |
| 27 | 688 | 81 | 30 | 55 | character |  |
| 28 | 732 | 101 | 17 | 31 | other |  |
| 29 | 770 | 94 | 23 | 38 | character |  |
| 30 | 808 | 82 | 19 | 45 | other | posible-personaje |
| 31 | 833 | 89 | 28 | 37 | other |  |
| 32 | 12 | 127 | 44 | 61 | character |  |
| 33 | 67 | 124 | 96 | 67 | character | varias-poses |
| 34 | 181 | 125 | 48 | 61 | character |  |
| 35 | 241 | 139 | 31 | 41 | character |  |
| 36 | 284 | 138 | 17 | 40 | character |  |
| 37 | 318 | 137 | 14 | 40 | character |  |
| 38 | 359 | 138 | 19 | 39 | character |  |
| 39 | 386 | 127 | 32 | 52 | character |  |
| 40 | 427 | 134 | 36 | 43 | character |  |
| 41 | 472 | 144 | 48 | 35 | character |  |
| 42 | 532 | 142 | 43 | 37 | character |  |
| 43 | 587 | 151 | 41 | 31 | other |  |
| 44 | 644 | 151 | 27 | 46 | other | posible-personaje |
| 45 | 683 | 143 | 42 | 46 | character |  |
| 46 | 734 | 151 | 40 | 36 | character |  |
| 47 | 785 | 147 | 27 | 36 | character |  |
| 48 | 826 | 146 | 18 | 35 | other |  |
| 49 | 854 | 145 | 31 | 32 | character |  |
| 50 | 201 | 195 | 34 | 41 | character |  |
| 51 | 248 | 198 | 56 | 40 | character | varias-poses |
| 52 | 370 | 199 | 48 | 40 | character |  |
| 53 | 431 | 199 | 33 | 39 | character |  |
| 54 | 478 | 199 | 56 | 41 | character | varias-poses |
| 55 | 723 | 197 | 43 | 45 | character |  |
| 56 | 781 | 194 | 43 | 48 | character |  |
| 57 | 841 | 195 | 42 | 47 | character |  |
| 58 | 21 | 207 | 27 | 40 | character |  |
| 59 | 61 | 213 | 23 | 32 | other |  |
| 60 | 93 | 212 | 28 | 33 | character |  |
| 61 | 131 | 201 | 22 | 39 | character |  |
| 62 | 164 | 200 | 22 | 39 | character |  |
| 63 | 315 | 200 | 49 | 39 | character |  |
| 64 | 551 | 202 | 49 | 41 | character |  |
| 65 | 609 | 202 | 47 | 40 | character |  |
| 66 | 666 | 201 | 42 | 44 | character |  |
| 67 | 15 | 257 | 49 | 40 | character |  |
| 68 | 77 | 256 | 43 | 40 | character |  |
| 69 | 128 | 253 | 23 | 42 | character |  |
| 70 | 167 | 254 | 22 | 40 | character |  |
| 71 | 200 | 253 | 28 | 39 | character |  |
| 72 | 239 | 255 | 32 | 40 | character |  |
| 73 | 282 | 253 | 28 | 39 | character |  |
| 74 | 324 | 253 | 22 | 40 | character |  |
| 75 | 358 | 254 | 23 | 41 | character |  |
| 76 | 388 | 254 | 32 | 40 | character |  |
| 77 | 437 | 254 | 22 | 40 | character |  |
| 78 | 480 | 260 | 56 | 34 | character | varias-poses |
| 79 | 541 | 260 | 17 | 30 | other |  |
| 80 | 569 | 251 | 31 | 41 | character |  |
| 81 | 620 | 253 | 20 | 53 | character |  |
| 82 | 647 | 256 | 95 | 41 | character | varias-poses |
| 83 | 748 | 257 | 28 | 40 | character |  |
| 84 | 788 | 253 | 19 | 44 | character |  |
| 85 | 816 | 251 | 32 | 40 | character |  |
| 86 | 856 | 261 | 30 | 37 | other |  |
| 87 | 28 | 306 | 39 | 27 | other |  |
| 88 | 74 | 306 | 11 | 11 | other |  |
| 89 | 92 | 314 | 5 | 4 | other |  |
| 90 | 108 | 311 | 33 | 35 | character |  |
| 91 | 146 | 310 | 30 | 35 | character |  |
| 92 | 183 | 307 | 29 | 36 | character |  |
| 93 | 224 | 307 | 27 | 35 | character |  |
| 94 | 263 | 310 | 27 | 35 | character |  |
| 95 | 305 | 310 | 34 | 34 | character |  |
| 96 | 351 | 307 | 21 | 40 | character |  |
| 97 | 387 | 311 | 29 | 34 | character |  |
| 98 | 433 | 307 | 22 | 41 | character |  |
| 99 | 463 | 318 | 39 | 22 | other |  |
| 100 | 515 | 309 | 18 | 44 | character |  |
| 101 | 556 | 312 | 31 | 44 | other |  |
| 102 | 604 | 314 | 32 | 45 | other | posible-personaje |
| 103 | 656 | 307 | 32 | 49 | other | posible-personaje |
| 104 | 704 | 309 | 27 | 48 | other |  |
| 105 | 746 | 307 | 14 | 49 | other |  |
| 106 | 773 | 307 | 18 | 52 | other |  |
| 107 | 796 | 313 | 97 | 41 | other | posible-personaje |
| 108 | 14 | 320 | 10 | 11 | other |  |
| 109 | 25 | 324 | 67 | 41 | other | posible-personaje |
| 110 | 6 | 374 | 33 | 22 | other |  |
| 111 | 59 | 378 | 46 | 23 | other |  |
| 112 | 126 | 376 | 48 | 22 | other |  |
| 113 | 192 | 377 | 46 | 23 | other |  |
| 114 | 250 | 376 | 39 | 33 | other |  |
| 115 | 306 | 382 | 43 | 20 | other |  |
