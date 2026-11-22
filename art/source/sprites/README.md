# Hojas de sprites de los Axem Rangers X

Hay dos géneros, cada uno con su hoja de referencia. **Violet** y **Orange** son variantes cromáticas de la referencia de su género: usan exactamente los mismos cuadros, poses y ataques, y solo cambia la paleta. No hay dos colecciones dibujadas a mano.

| Género | Referencia | Hoja | Tamaño | Dirección nativa |
|---|---|---|---|---|
| Masculino | Axem Red | `references/axem-red/axem-red-spritesheet.png` | 730 × 804 px, fondo teal `rgb(0,128,128)` | Derecha |
| Femenino | Axem Pink | `references/axem-pink/axem-pink-spritesheet.png` | 900 × 421 px, fondo blanco | Izquierda |

La orientación nativa se conserva en todas las imágenes de cada fuente: Axem Red masculino, incluidos el retrato base y los GIF de acción, apunta a la derecha; Axem Pink femenino apunta a la izquierda. El renderizador espeja cada sprite solo cuando el luchador necesita mirar hacia el lado contrario.

Las referencias nunca se modifican. La pose suelta femenina `axem-pink-pose.png` y los GIF de Axem Red (`axem-ranger-run.gif`, `axem-ranger-bike.gif`, `axem-ranger-double-axe.gif`) se recolorean con el mismo proceso. Las referencias sueltas femeninas `axem-pink-battle-pose.png` y `axem-pink-levitate.png` ya no forman parte del pipeline y se eliminaron.

## Cómo se generan los resultados

`npm run prepare:sprites` (también corre antes de `dev`, `build` y `test`) quita el fondo, cambia solo el tono de la familia cromática del traje (violeta 273°, naranja 22°, conservando luminosidad y saturación) y escribe en `results/`:

```
results/
  male/
    {violet,orange}/
      spritesheet.png                     hoja de Axem Red, mismas coordenadas que la referencia
      run.png  bike.png  double-axe.png   tiras PNG para el pipeline del juego
      run.gif  bike.gif  double-axe.gif   GIF originales de carrera, bicicleta y doble hacha
      pose.gif punch-01.gif punch-02.gif punch-03.gif battle-pose.gif
      run.gif dash.gif jump.gif hit.gif hurt.gif teleport.gif (Violet y Orange)
      sequences/group-01.png … group-14.png + index.json
  female/
    axem-ranger-{violet,orange}.png     referencias femeninas apiladas
    {violet,orange}/
      spritesheet.png  pose.png
      sequences/group-01.png … group-06.png + index.json
      supplemental/group-01.png … group-07.png (armas, efectos, íconos y siluetas)
```

Los retratos laterales del menú se generan directamente desde la referencia original `references/axem-red/axem-red-spritesheet.png`; no se necesita una vista previa duplicada en `results/male/`. El recoloreado del cabello recorre cada componente rubio de todas las poses, incluso cuando está separado del casco o la cara, para evitar que queden mechones originales sin procesar.

La hoja femenina `spritesheet.png` conserva su corrección manual de paleta cuando está versionada en `results/female/{orange,violet}/`. `prepare:sprites`, `pretest` y `prebuild` la preservan; si falta, se reconstruye desde el atlas original. La pose femenina `pose.png` se genera desde su imagen canónica versionada. Los antiguos archivos sueltos de referencia de batalla y levitación ya no forman parte del pipeline.

El `charge.gif` masculino conserva los tres cuadros de preparación y luego sostiene el quinto (último) sprite de `sequences/group-09.png` mientras anima cuatro fotogramas de la hoja `super-saiyan-aura.webp`. El aura que aparece en el GIF es la misma hoja que se muestra en `super-saiyan-aura.svg`: un aro de llamas doradas envolventes, con borde blanco-amarillo, centro transparente y chispas ascendentes. Cada celda de 64×64 px se amplía con nearest-neighbor y se coloca detrás del ranger, sin recolorearla ni recortar sus llamas laterales. Es arte original creado para Axem-FighterX con estética Super Saiyan de Dragon Ball Z, no un recorte de sprites oficiales; la procedencia está documentada en `art/source/effects/dragon-ball-style/SOURCE.md`.

Los GIF masculinos de bicicleta y doble hacha conservan sus lienzos de **150 × 100 px**. Los 11 GIF base de cada variante masculina se generan desde las secuencias clasificadas; todos los GIF de acción usan lienzos de **150 × 100 px**, transparencia y escalado nearest-neighbor para conservar el pixel-art. El pivote de los pies se centra horizontalmente y mantiene una línea de suelo fija para evitar saltos entre fotogramas.


## Regla global de transparencia y pixel art

La política está centralizada en `processing-rules.json` y se aplica automáticamente a **todos los PNG y GIF dentro de `results/`**, de forma recursiva, cada vez que se ejecutan `npm run prepare:sprites`, `npm run dev`, `npm test` o `npm run build`.

- **Fondo transparente:** se elimina únicamente el color uniforme (o casi uniforme) conectado al borde de cada imagen/cuadro. Los píxeles del mismo color encerrados dentro de la silueta se conservan. Si una imagen opaca no tiene un fondo reconocible, el proceso falla y exige una regla específica; no perfora ni adivina el fondo.
- **Bordes nítidos:** se conserva el lienzo y la resolución originales. No se aplica blur ni sharpen artificial: ambos pueden deformar el pixel art o crear halos. La limpieza de halo se limita a la franja exterior del fondo eliminado.
- **Escalado:** cuando otro generador necesita redimensionar, usa `nearest` (vecino más cercano), sin interpolación ni suavizado. No se reescala como parte de la normalización global.
- **Animaciones:** los GIF se revisan cuadro por cuadro; al corregir el fondo se mantienen cantidad de cuadros, dimensiones y tiempos de reproducción.
- **Validación futura:** cualquier PNG/GIF nuevo que se agregue a `results/` entra en la misma regla en la siguiente ejecución. Los originales de `references/` se preservan como masters y deben pasar por sus generadores antes de convertirse en sprites de juego.

La configuración de Phaser ya refuerza el resultado con `pixelArt`, `antialias: false`, `roundPixels` y filtro `NEAREST` para las texturas que se cargan. Por eso el criterio visual es **píxel definido y borde limpio**, no bordes borrosos o suavizados por interpolación.

## El atlas no es una cuadrícula

Ninguna hoja tiene filas de cuadros uniformes: cambian la cantidad, el ancho y la separación (por ejemplo, la distancia entre inicios de cuadro de `group-01` va de 27 a 38 px) y ambas traen ruido de compresión en el fondo. Por eso no se usa un paso fijo: cada cuadro tiene su propio rectángulo `[x, y, ancho, alto]`, ajustado a los píxeles del personaje.

Los rectángulos los detecta `scripts/analyze-atlas.mjs` y quedan en `src/infrastructure/assets/atlasFrames.json`; las reglas (color de fondo, tolerancia, zonas excluidas) están en `atlasLayoutRules.js` y el algoritmo en `atlasFrameDetection.js`. Para regenerarlo tras cambiar una hoja: `node scripts/analyze-atlas.mjs`. `atlasFrames.test.js` verifica las cantidades, que no haya superposiciones y que Violet y Orange tengan el mismo canal alfa en cada hoja generada.

## Masculino (Axem Red): 14 grupos, 107 cuadros

Estrategia de filas: proyección de píxeles → tiras → cuadros. Los grupos se numeran de arriba hacia abajo y los cuadros de izquierda a derecha. `pivotX` es la columna de los pies relativa al cuadro. Cada tira de `sequences/` pone todos los cuadros de un grupo en celdas del mismo tamaño, con los pies sobre la misma línea y alineados por `pivotX`, así el personaje no “salta” cuando la bufanda o un tajo ensanchan el rectángulo.

La clasificación de las secuencias para el masculino naranja es: `group-01` + `group-02` (`idle`); `group-03`, `group-04` y `group-05` (`punch-01`, `punch-02` y `punch-03`, cada uno independiente); `group-09` → `group-08` → `group-07` → `group-06` (`battle-pose`); `group-10` (`run`); `group-11` (`dash`); `group-12` (`jump`); `group-13` (fotogramas 1–2 para `hit` y 4–6 para `hurt`); y `group-14` (`teleport`).

### Grupo 16 — derrota e invocación del hacha

La secuencia complementaria `group-16.png` contiene dos cuadros alineados: el primero se exporta como `defeated.png` y se pre-carga para mostrar la pose de derrota cuando un Ranger masculino entra en KO; el segundo se añade al final de `battle-pose.gif`, cerrando la animación con el hacha invocada y el personaje listo para combatir. El generador produce ambos resultados para Orange y Violet.

### Secuencias complementarias del Axem Violeta

- `group-15.png` añade tres cuadros al final de `teleport.gif`.
- `group-17.png` genera `charge.gif`.
- `group-18.png` y `group-19.png` forman los ocho cuadros de `idle.gif`.
- La animación `idle.gif` normaliza los ocho cuadros a una altura visible común, mantiene los pies sobre la misma línea y compone cada fotograma sobre un lienzo fijo de **150 × 100 px**. Así se evita que el personaje cambie de escala al pasar de una secuencia a la otra.

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

### Recursos suplementarios masculinos

La zona `reference-poses` `[525, 0, 205, 385]` queda excluida de las secuencias animadas, pero sus elementos se conservan: el análisis detecta los recursos independientes y los exporta, agrupados por los cinco renglones originales, como `supplemental/group-01.png` a `group-05.png` más `supplemental/index.json`. Allí se incluyen las siluetas de referencia, la pose de derrota, la pose con hacha y las demás poses sueltas. Cada elemento ocupa una celda propia y el índice mantiene sus coordenadas de origen. Orange y Violet comparten el orden, las dimensiones y la transparencia; solo cambia la paleta.

## Femenino (Axem Pink): 7 grupos, 116 regiones, 84 de personaje

La hoja de Pink tiene distribución libre (poses en el aire, estelas, armas sueltas e íconos), no una cuadrícula de cuadros uniformes. Se detectan componentes conexos que se fusionan si están a 3 px o menos, y cada región se clasifica por su color: un personaje tiene masa rosada más el azul verdoso del traje o la bufanda amarilla; las estelas, armas, corazones, la figura con ojos y las tres siluetas de referencia quedan como `other`. Después, las 116 regiones se distribuyen en siete grupos espaciales según su centro vertical, de arriba hacia abajo. Cada grupo conserva el ancho completo del atlas y los límites se amplían hasta incluir todas sus regiones.

**La clasificación de regiones es heurística.** 12 regiones llevan una marca `review` para revisarlas a mano: `varias-poses` (una sola caja con más de una pose fusionada por una estela o un arma que las toca) y `posible-personaje` (vistas laterales angostas o poses tumbadas cuya clasificación no es segura). Ninguna se descarta: las regiones `character` y `other`, incluidas las 12 marcadas, se asignan exactamente una vez a los siete grupos.

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


### Grupos femeninos por fila

La hoja completa se recorre de arriba hacia abajo y cada uno de sus siete renglones se procesa. **Cada región de personaje se extrae a una celda individual** y se compone en una tira horizontal compacta, con celdas uniformes y centradas para conservar también las poses aéreas o tumbadas. El formato es el mismo que el de las tiras masculinas: `sequences/group-XX.png` y un `index.json` con el orden, las coordenadas de origen y las marcas de revisión de cada fotograma.

Dos cajas detectadas contenían varias poses claramente independientes: la región 33 se separa en dos fotogramas y la región 82 en tres. Así, las **84 regiones de personaje detectadas producen 87 celdas de fotograma** sin fusionar personajes distintos. Los elementos que no son fotogramas de personaje (armas, estelas, efectos, corazones, íconos y siluetas) no se mezclan con las secuencias: se conservan en `supplemental/group-XX.png`, vinculados al grupo de la misma fila. La séptima fila no contiene poses clasificadas como personaje, pero sus seis recursos suplementarios también se exportan. No se descarta ninguna de las 116 regiones detectadas.

| Grupo | Fotogramas | Recursos suplementarios | Regiones |
|---|---:|---:|---:|
| group-01 | 11 | 1 | 12 |
| group-02 | 14 | 6 | 20 |
| group-03 | 16 | 3 | 18 |
| group-04 | 16 | 1 | 17 |
| group-05 | 20 | 2 | 20 |
| group-06 | 10 | 13 | 23 |
| group-07 | 0 | 6 | 6 |
| **Total** | **87** | **32** | **116** |

**Revisión manual:** las 12 regiones que el detector considera compuestas (`varias-poses`) o dudosas (`posible-personaje`) se conservan identificadas. Las dos cajas que contenían varios personajes se dividieron manualmente con coordenadas explícitas; las demás siguen en su celda original con su marca de revisión. Ninguna región se omite.

Orange y Violet utilizan las mismas regiones, orden y dimensiones de celda. Solo cambia la paleta.


## Acciones añadidas para combate y carrera

El proceso de preparación también genera para Orange y Violet los GIF `guard.gif`,
`guard-hit.gif`, `roll.gif`, `land.gif`, `special-attack.gif`, `victory.gif`
y `ko.gif`. Se construyen desde secuencias originales del atlas masculino: guardia
y reacción al bloqueo desde la pose de combate, rodada desde el dash, aterrizaje
desde los últimos cuadros del salto, especial desde la secuencia del hacha, y
victoria/KO desde las poses de combate, reposo y derrota disponibles.

Todos conservan el lienzo transparente de 150×100 px y el apoyo del sprite en la misma
línea de suelo. El pipeline también exporta sus tiras de 86×57 px en
`public/generated/axem-{color}-{acción}.png`, que Phaser carga como hojas cuadro a
cuadro. Las variantes femeninas conservan su material visual y reciben las mismas
transiciones mediante poses procedurales.

Para la carrera no se duplican los fotogramas de bicicleta: se registran cadencias
independientes para espera, aceleración, frenado, nitro y resultados. La inclinación
del ciclista acompaña la entrada y el estado final.

## Estándar centralizado de recursos gráficos

Las reglas dimensionales viven en `asset-standards.json`. Los generadores, el juego, las pruebas y los validadores leen esa configuración en lugar de mantener medidas independientes.

| Categoría | Estándar | Regla |
|---|---:|---|
| Artwork Super Axem masculino | 857 × 1171 px | Red derivado se escala proporcionalmente para ajustarse al espacio de Orange |
| Artwork Super Axem femenino | 745 × 1372 px | Violet usa el lienzo de su master Axem Pink |
| Textura base de combate | 53 × 83 px | Lienzo fijo y transparente |
| Retrato lateral de menú | 104 × 150 px | Lienzo fijo y transparente |
| GIF de acción | 150 × 100 px por cuadro | Se conserva la cantidad de cuadros y sus tiempos |
| Celda de tiras PNG derivadas de GIF | 86 × 57 px | Pivote de pies declarado en la configuración |

### Artwork Super Axem: Orange fija la escala visual

El master masculino `references/axem-red/super-axem-red.png` y el resultado `results/male/orange/super-axem-ranger-orange.png` usan exactamente **857 × 1171 px**. Orange conserva la escala y la ocupación de su upload original; no se reduce para coincidir con el master Red. El pipeline genera el artwork Red ajustado exclusivamente en `public/generated/super-axem-source-male.png` para el juego; se escala proporcionalmente con vecino más cercano para caber en la caja visible de Orange. Se centra horizontalmente y se alinea por la línea de apoyo de los pies. Cuando las proporciones originales difieren, el derivado queda contenido dentro de esa caja con una diferencia máxima del 4 %; no se deforma ni se recorta, y la referencia original Red permanece intacta.

La misma regla incluye a la Ranger femenina Violeta: el master Pink y el resultado Violet usan **745 × 1372 px**. Cada familia conserva la proporción de su referencia; no se fuerza una relación de aspecto común entre el artwork masculino y el femenino.

Los masters de `references/` son inmutables y contienen únicamente las referencias base Red y Pink. Los uploads originales de Orange y Violet se conservan dentro de sus propias rutas de variante: `results/male/orange/source/super-axem-orange-upload.png` y `results/female/violet/source/super-axem-violet-upload.png`. `prepare-super-rangers.mjs` crea copias de trabajo en `public/generated/super-axem-source-male.png` y `public/generated/super-axem-source-female.png`, conservando el lienzo original. Los generadores de texturas y retratos consumen esas copias. Los uploads fuente están excluidos de la normalización automática.

### Qué se normaliza y qué se conserva

- Los artworks de personaje conservan el lienzo de su master. Orange mantiene la escala de su upload original; el derivado Red se escala proporcionalmente para igualar la altura visible de Orange mediante nearest-neighbor, con centrado horizontal y pies alineados. Violet mantiene la normalización de su familia. Nunca se aplica deformación ni recorte automático.
- Las texturas de combate, retratos y GIF se generan con sus medidas de categoría.
- Los atlas mantienen sus dimensiones y su distribución irregular. Las secuencias usan las celdas declaradas en sus respectivos `index.json`; no se inventa una cuadrícula global.
- Armas, objetos, efectos, recursos suplementarios, fondos y tilesets conservan sus dimensiones nativas. Los fondos pueden tener proporciones distintas según la escena.

`standardize-assets.mjs` aplica el padding transparente permitido y `validate-assets.mjs` comprueba los masters, las variantes Orange/Violet, los retratos, las texturas, los GIF y las tiras de secuencia. Ambos se ejecutan automáticamente en `npm test`, `npm run build` y `npm run prepare:sprites`.
