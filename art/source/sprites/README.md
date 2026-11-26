# Hojas de sprites de los Axem Rangers X

Hay dos géneros, cada uno con su hoja de referencia. **Violet** y **Orange** son variantes cromáticas de la referencia de su género: usan exactamente los mismos cuadros, poses y ataques, y solo cambia la paleta. No hay dos colecciones dibujadas a mano.

| Género | Referencia | Hoja | Tamaño | Dirección nativa |
|---|---|---|---|---|
| Masculino | Axem Red | `references/axem-red/axem-red-spritesheet.png` | 1316 × 1230 px, paneles blancos sobre fondo negro | Derecha |
| Femenino | Axem Pink | `references/axem-pink/axem-pink-spritesheet.png` | 1316 × 717 px, paneles blancos sobre fondo negro | Izquierda |

La orientación nativa se conserva en todas las imágenes de cada fuente: Axem Red masculino, incluidos el retrato base y los GIF de acción, apunta a la derecha; Axem Pink femenino apunta a la izquierda. El renderizador espeja cada sprite solo cuando el luchador necesita mirar hacia el lado contrario.

La carpeta `references/axem-red/` conserva la hoja compuesta `axem-red-spritesheet.png`, las secuencias de referencia `dash.gif`, `idle.gif`, `jump.gif`, `run.gif` y `walk.gif`, y los GIF maestros `axem-ranger-run.gif` y `axem-ranger-bike.gif`. Las hojas de animación separadas de Red y Pink se eliminaron; los recortes de combate se reconstruyen desde la hoja Orange procesada y su índice versionado. No se genera una copia redundante en `results/male/red/`: Red queda centralizado en `references/axem-red/`. El GIF maestro de batalla de Orange se conserva en `references/axem-orange/battle-pose.gif`. La tira `references/axem-orange/ko-source.png` conserva las dos poses originales del KO y es la entrada del GIF `ko.gif`. Orange y Violet siguen siendo variantes cromáticas independientes; Red no se obtiene recoloreando a Orange.

## Cómo se generan los resultados

`npm run prepare:sprites` prepara los resultados de Axem Naranja masculino en `results/male/orange/`. `npm run dev` inicia Vite sin ejecutar generadores; `npm test` y `npm run build` preparan y validan los recursos antes de continuar. Los masters y las secuencias de referencia de Axem Red permanecen en `references/axem-red/`, sin duplicarse bajo `results/male/red/`.

```
results/
  male/
    orange/
      spritesheet.png  run.png  bike.png  GIF de combate y acciones
  female/
    violet/          destino reservado para los resultados femeninos

references/axem-red/
  axem-red-spritesheet.png

references/axem-pink/
  axem-pink-spritesheet.png
  axem-pink-pose.png  super-axem-pink.png
  axem-ranger-run.gif  axem-ranger-bike.gif
  dash.gif  idle.gif  jump.gif  run.gif  walk.gif

references/axem-orange/
  battle-pose.gif

pickups/
  axem-boost.png  axem-boost.svg  axem-slow.png  axem-slow.svg  ATTRIBUTION.txt
```

Los retratos laterales del menú y las secuencias automáticas se generan desde los recursos Orange versionados en `results/male/orange/`; el mapa de recortes está en `src/infrastructure/assets/spriteFrameIndex.json`. La hoja compuesta `axem-red-spritesheet.png` se conserva únicamente como referencia visual. El recoloreado del cabello recorre cada componente rubio de todas las poses, incluso cuando está separado del casco o la cara, para evitar que queden mechones originales sin procesar.

La ruta de resultados femeninos es `results/female/violet/`; el contenido provisional `results/female/pink/` se retiró. La referencia original Pink permanece en `references/axem-pink/` y no se replica como una variante Pink dentro de `results/`.

El `charge.gif` masculino conserva los tres cuadros de preparación y luego sostiene el quinto (último) sprite de `sequences/group-09.png` mientras anima cuatro fotogramas de la hoja `super-saiyan-aura.webp`. El aura que aparece en el GIF es la misma hoja que se muestra en `super-saiyan-aura.svg`: un aro de llamas doradas envolventes, con borde blanco-amarillo, centro transparente y chispas ascendentes. Cada celda de 64×64 px se amplía con nearest-neighbor y se coloca detrás del ranger, sin recolorearla ni recortar sus llamas laterales. Es arte original creado para Axem-FighterX con estética Super Saiyan de Dragon Ball Z, no un recorte de sprites oficiales; la procedencia está documentada en `art/source/effects/dragon-ball-style/SOURCE.md`.

Los GIF de acciones de personaje conservan lienzos de **150 × 100 px por cuadro**, transparencia y escalado nearest-neighbor. Su temporización está centralizada en `asset-standards.json`: **100 ms por cuadro (10 FPS)**. El generador y el validador leen el mismo valor; `idle`, `run`, `hit`, `hurt`, `guard`, `roll`, `ko` y las demás acciones no tienen cadencias de exportación individuales. El pivote de los pies se centra horizontalmente y mantiene una línea de suelo fija para evitar saltos entre fotogramas.


## Regla global de transparencia y pixel art

La política está centralizada en `processing-rules.json` y se aplica automáticamente a **todos los PNG y GIF dentro de `results/`**, de forma recursiva, cada vez que se ejecutan `npm run prepare:sprites`, `npm test` o `npm run build`.

- **Fondo transparente:** se elimina únicamente el color uniforme (o casi uniforme) conectado al borde de cada imagen/cuadro. Los píxeles del mismo color encerrados dentro de la silueta se conservan. Si una imagen opaca no tiene un fondo reconocible, se conserva intacta y se informa como omitida; no perfora ni adivina el fondo. Solo fallan los recursos que un generador concreto necesita y no puede interpretar.
- **Bordes nítidos:** se conserva el lienzo y la resolución originales. No se aplica blur ni sharpen artificial: ambos pueden deformar el pixel art o crear halos. La limpieza de halo se limita a la franja exterior del fondo eliminado.
- **Escalado:** cuando otro generador necesita redimensionar, usa `nearest` (vecino más cercano), sin interpolación ni suavizado. No se reescala como parte de la normalización global.
- **Animaciones:** los GIF se revisan cuadro por cuadro; al corregir el fondo se mantienen cantidad de cuadros, dimensiones y tiempos de reproducción.
- **Validación futura:** cualquier PNG/GIF nuevo que se agregue a `results/` se inspecciona en la siguiente preparación; si no es posible inferir el fondo sin riesgo, queda preservado sin cambios. Los originales de `references/` se preservan como masters y deben pasar por sus generadores antes de convertirse en sprites de juego.

La configuración de Phaser ya refuerza el resultado con `pixelArt`, `antialias: false`, `roundPixels` y filtro `NEAREST` para las texturas que se cargan. Por eso el criterio visual es **píxel definido y borde limpio**, no bordes borrosos o suavizados por interpolación.

## Recortes y referencias conservados

Las hojas de animación separadas de Axem Red y Axem Pink se retiraron del repositorio. Se conservan las dos hojas compuestas como referencias visuales, no como entradas de los generadores.

Las animaciones masculinas se regeneran desde `results/male/orange/spritesheet.png`, que conserva el lienzo de **730 × 804 px** y la transparencia. Sus coordenadas de recorte y grupos están versionados en `src/infrastructure/assets/spriteFrameIndex.json`; la preparación no vuelve a analizar ni exige imágenes de hojas de animación. Los GIF maestros de carrera siguen en `references/axem-red/`.

## Recortes masculinos conservados: 14 grupos, 107 cuadros

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

## Femenino (Axem Pink)

La hoja compuesta Pink se conserva en `references/axem-pink/axem-pink-spritesheet.png`. El proyecto ya no mantiene una hoja de animación separada ni un índice de regiones femenino.

## Acciones añadidas para combate y carrera

El proceso de preparación también genera para Orange y Violet los GIF `guard.gif`,
`guard-hit.gif`, `roll.gif`, `land.gif`, `special-attack.gif`, `victory.gif`
y `ko.gif`. Se construyen desde recortes masculinos versionados: guardia
y reacción al bloqueo desde la pose de combate, rodada desde el dash, aterrizaje
desde los últimos cuadros del salto, especial desde la secuencia del hacha, y
victoria desde las poses de combate y reposo disponibles. El KO naranja se construye
desde las dos poses de `references/axem-orange/ko-source.png`, sin escalar el pixel art.

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
| GIF de acción | 150 × 100 px por cuadro | Transparencia obligatoria; 100 ms por cuadro (10 FPS); cantidad de cuadros estable |
| Celda de tiras PNG derivadas de GIF | 86 × 57 px | Pivote de pies declarado en la configuración |

**Alcance:** este estándar de 150 × 100 px y 100 ms se aplica a los GIF de acciones de personaje definidos en `categories.actionGif`. Los GIF de efectos visuales (`categories.effectAnimation`) conservan las dimensiones de su PNG fuente y usan la cadencia específica declarada para cada efecto. El favicon animado es una salida independiente de 32 × 32 px que conserva los tiempos de su GIF fuente. No se deben normalizar todos los GIF del repositorio con una única dimensión o velocidad.

### Artwork Super Axem: Orange fija la escala visual

El artwork Super Axem masculino canónico `results/male/orange/super-axem-ranger-orange.png` es la fuente de `public/generated/super-axem-source-male.png`. Ya no se conserva una imagen Red individual redundante: la referencia de Axem Red queda reservada a sus GIF maestros y la hoja de sprites completa.

La misma regla incluye a la Ranger femenina Violeta: el master Pink y el resultado Violet usan **745 × 1372 px**. Cada familia conserva la proporción de su referencia; no se fuerza una relación de aspecto común entre el artwork masculino y el femenino.

Los masters de `references/` son inmutables y contienen las referencias base Red y Pink; la imagen individual Super Axem Red redundante fue retirada. Los uploads originales de Orange y Violet se conservan dentro de sus propias rutas de variante: `results/male/orange/source/super-axem-orange-upload.png` y `results/female/violet/source/super-axem-violet-upload.png`. `prepare-super-rangers.mjs` crea copias de trabajo en `public/generated/super-axem-source-male.png` y `public/generated/super-axem-source-female.png`, conservando el lienzo original. Los generadores de texturas y retratos consumen esas copias. Los uploads fuente están excluidos de la normalización automática.

### Qué se normaliza y qué se conserva

- Los artworks de personaje conservan el lienzo de su fuente canónica. Orange mantiene la escala de su upload original; la fuente masculina preparada reutiliza el artwork Super Axem Orange mediante nearest-neighbor, sin deformación ni recorte. Violet mantiene la normalización de su familia.
- Las texturas de combate, retratos y GIF se generan con sus medidas de categoría.
- Las hojas compuestas de referencia conservan sus dimensiones originales. Las animaciones usan las celdas declaradas en sus `index.json`, y el mapa de recortes masculino permanece versionado.
- Armas, objetos, efectos, recursos suplementarios, fondos y tilesets conservan sus dimensiones nativas. Los fondos pueden tener proporciones distintas según la escena.

`standardize-assets.mjs` aplica el padding transparente permitido y `validate-assets.mjs` comprueba los masters, las variantes Orange/Violet, los retratos, las texturas, los GIF y las tiras de secuencia. Ambos se ejecutan automáticamente en `npm test`, `npm run build` y `npm run prepare:sprites`.
