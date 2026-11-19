export const STAGE_IDS = Object.freeze({
  RUINS: 'ruins',
  VOLCANO: 'volcano',
  FOREST: 'forest',
  SANCTUARY: 'sanctuary',
});

const lines = (...entries) => Object.freeze(entries.map(([speaker, text]) => Object.freeze({ speaker, text })));

export const STAGES = Object.freeze([
  Object.freeze({
    id: STAGE_IDS.RUINS,
    name: 'Ruinas de medianoche',
    tagline: 'Murallas antiguas bajo una luna inmóvil',
    location: 'Frontera de Eteria',
    description: 'Un puesto defensivo abandonado, con pasajes estrechos y muros que todavía conservan sus runas.',
    dialogue: lines(
      ['violet', 'La puerta estaba abierta cuando llegamos. Eso no me gusta.'],
      ['orange', 'A mí tampoco. Mirá el polvo: alguien salió de acá hace muy poco.'],
      ['violet', '¿Seguimos el rastro o revisamos primero las habitaciones?'],
      ['orange', 'El rastro va hacia el patio. Pero esas columnas no van a aguantar otro temblor.'],
      ['violet', 'Entonces no nos quedamos quietos. Yo cruzo por la izquierda.'],
      ['orange', 'Voy por la derecha. Si escuchás caer una piedra, no intentes atraparla.'],
      ['violet', 'No prometo nada. Vamos; después discutimos quién tuvo la peor idea.'],
    ),
    resultDialogue: Object.freeze({
      violetWins: lines(
        ['violet', 'La entrada quedó despejada. Y, por una vez, las ruinas siguen en pie.'],
        ['orange', 'Me ganaste. La próxima voy a mirar menos las columnas y más tus movimientos.'],
      ),
      orangeWins: lines(
        ['orange', 'La ruta está asegurada. Y no, no pienso cargar con las piedras que rompiste.'],
        ['violet', 'Está bien, esta ronda es tuya. La próxima no voy a regalarte el patio.'],
      ),
      draw: lines(
        ['violet', 'Ninguno pudo cerrar el combate. Al menos encontramos una salida.'],
        ['orange', 'Y seguimos enteros. En estas ruinas, eso ya cuenta como una victoria.'],
      ),
    }),
  }),
  Object.freeze({
    id: STAGE_IDS.VOLCANO,
    name: 'Cráter del exilio',
    tagline: 'Una caldera activa sobre placas de basalto',
    location: 'Cordillera Ígnea',
    description: 'Un puente de roca volcánica atraviesa respiraderos y corrientes de lava.',
    dialogue: lines(
      ['violet', 'No te acerques al borde. Esa placa acaba de partirse.'],
      ['orange', 'La vi. El calor está abriendo otra grieta detrás de nosotros.'],
      ['violet', 'Podemos saltar hasta el arco de basalto.'],
      ['orange', 'Con esa corriente de aire, el salto puede llevarnos bastante más arriba.'],
      ['violet', 'Mejor. No pienso esperar a que el puente desaparezca.'],
      ['orange', 'Tomá impulso cuando baje el vapor. Si te adelantás, no voy a alcanzarte.'],
      ['violet', 'Contá hasta tres y saltamos juntos. Esta vez, sin improvisar.'],
    ),
    resultDialogue: Object.freeze({
      violetWins: lines(
        ['violet', 'La corriente me dio el impulso justo. El cráter no iba a decidir por mí.'],
        ['orange', 'Lo sé. Me apuré al aterrizar y me quedé sin margen. Bien jugado.'],
      ),
      orangeWins: lines(
        ['orange', 'Esperé a que cambiara el viento. En este lugar, el momento lo es todo.'],
        ['violet', 'Me ganaste por poco. La próxima voy a controlar mejor el descenso.'],
      ),
      draw: lines(
        ['violet', 'La caldera nos obligó a frenar antes de terminar.'],
        ['orange', 'Y fue lo más sensato que hicimos. No vale la pena ganar cayendo a la lava.'],
      ),
    }),
  }),
  Object.freeze({
    id: STAGE_IDS.FOREST,
    name: 'Bosque de los ecos',
    tagline: 'Senderos cubiertos por raíces y luces errantes',
    location: 'Valle de Niebla Verde',
    description: 'Un bosque antiguo donde las ramas confunden las distancias y las luciérnagas marcan caminos falsos.',
    dialogue: lines(
      ['violet', 'Las huellas terminan acá. No hay marcas de regreso.'],
      ['orange', 'Las ramas están dobladas hacia arriba. Algo pasó por las copas.'],
      ['violet', '¿Y las luciérnagas? Hace un momento iluminaban el sendero.'],
      ['orange', 'Se apagaron cuando nos acercamos. Este bosque está intentando confundirnos.'],
      ['violet', 'Entonces seguimos hablando. Si la niebla nos separa, nos guiamos por la voz.'],
      ['orange', 'De acuerdo. Yo voy a la altura de las ramas; vos revisá el claro.'],
      ['violet', 'Y nada de perseguir sombras. Si encontramos algo, lo enfrentamos juntos.'],
    ),
    resultDialogue: Object.freeze({
      violetWins: lines(
        ['violet', 'La niebla dejó de moverse cuando terminó el combate. ¿Lo notaste?'],
        ['orange', 'Sí. Y también noté que me leíste cada amague. Me toca aprender de eso.'],
      ),
      orangeWins: lines(
        ['orange', 'No seguí las luces. Seguí el sonido de tus pasos. Esta vez funcionó.'],
        ['violet', 'Buena lectura. Me distraje con los ecos y vos aprovechaste el momento.'],
      ),
      draw: lines(
        ['violet', 'Los ecos se apagaron. No sé si eso significa que el camino está libre.'],
        ['orange', 'Por ahora alcanza. Salgamos antes de que el bosque vuelva a cerrarse.'],
      ),
    }),
  }),
  Object.freeze({
    id: STAGE_IDS.SANCTUARY,
    name: 'Santuario celeste',
    tagline: 'Columnas doradas alrededor de un sello antiguo',
    location: 'Meseta de Auralis',
    description: 'Un recinto suspendido entre ruinas claras, mecanismos rúnicos y corrientes de energía.',
    dialogue: lines(
      ['violet', 'El suelo vibra cada vez que el sello se enciende.'],
      ['orange', 'No es el suelo: la plataforma está suspendida y el núcleo la está empujando.'],
      ['violet', 'Entonces esas corrientes no son viento.'],
      ['orange', 'Son descargas de energía. Podemos usarlas para subir, pero hay que medir el impulso.'],
      ['violet', 'Yo pruebo desde el arco. Avisame si el sello cambia de color.'],
      ['orange', 'Azul significa estable. Dorado significa que nos vayamos.'],
      ['violet', 'Perfecto. Si empieza a brillar en dorado, no discutimos: salimos.'],
    ),
    resultDialogue: Object.freeze({
      violetWins: lines(
        ['violet', 'El sello volvió a estabilizarse. Parece que por fin encontramos el ritmo.'],
        ['orange', 'Me superaste en el aire. No voy a fingir que no vi cómo corregiste el último giro.'],
      ),
      orangeWins: lines(
        ['orange', 'La corriente cambió justo antes del impacto. Había que aprovecharla.'],
        ['violet', 'Lo vi tarde. Esta ronda es tuya; la próxima voy a leer mejor el núcleo.'],
      ),
      draw: lines(
        ['violet', 'El núcleo se apagó antes de que hubiera un resultado.'],
        ['orange', 'Quizá era una advertencia. Mejor dejar el santuario en paz por hoy.'],
      ),
    }),
  }),
]);

export function getStage(stageId) {
  return STAGES.find((stage) => stage.id === stageId) ?? STAGES[0];
}
