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
    groundDepthMode: 'restricted',
    dialogue: lines(
      ['violet', 'La bisagra todavía tiene grasa. Alguien abrió esta puerta hoy.'],
      ['orange', 'Y dejó la marca del carro en el polvo. No salió por el portón.'],
      ['violet', 'La huella termina junto al arco. ¿Ves el cable?'],
      ['orange', 'Sí. Si lo tensamos, cae la reja. Si lo cortamos, cae igual.'],
      ['violet', 'Entonces no lo toques. Voy a trabar el contrapeso.'],
      ['orange', 'Dame diez segundos. La piedra está encajada; necesito hacer palanca.'],
      ['violet', 'Tenés cinco. Escuché pasos del otro lado.'],
    ),
    resultDialogue: Object.freeze({
      violetWins: lines(
        ['violet', 'El contrapeso cedió cuando dejaste de tirar de la cadena.'],
        ['orange', 'Lo vi tarde. Seguí empujando cuando ya habías encontrado el seguro.'],
      ),
      orangeWins: lines(
        ['orange', 'La marca del carro apuntaba al arco lateral. Era la única salida.'],
        ['violet', 'Me concentré en la reja y no miré el polvo. Esa fue la diferencia.'],
      ),
      draw: lines(
        ['violet', 'La cadena se trabó antes de liberar la puerta.'],
        ['orange', 'Y el techo empezó a crujir. No voy a probar una segunda vez acá dentro.'],
      ),
    }),
  }),
  Object.freeze({
    id: STAGE_IDS.VOLCANO,
    name: 'Cráter del exilio',
    tagline: 'Una caldera activa sobre placas de basalto',
    location: 'Cordillera Ígnea',
    description: 'Un puente de roca volcánica atraviesa respiraderos y corrientes de lava.',
    groundDepthMode: 'restricted',
    dialogue: lines(
      ['violet', 'El vapor sale por esa grieta, no por la chimenea. Mirá el suelo.'],
      ['orange', 'La placa cambia de color antes de ceder. No pises la veta naranja.'],
      ['violet', 'Tengo que cruzar hasta la válvula. Desde acá no llego.'],
      ['orange', 'El puente aguanta un paso por vez. No vengas detrás mío.'],
      ['violet', 'No voy a quedarme mirando cómo bajás solo.'],
      ['orange', 'Entonces esperá a que caiga el vapor. Si saltás ahora, te tapa la salida.'],
      ['violet', 'Ya sé. Contá el pulso y avisame cuándo.'],
    ),
    resultDialogue: Object.freeze({
      violetWins: lines(
        ['violet', 'Esperaste a que bajara el vapor. Yo salté antes y perdí apoyo.'],
        ['orange', 'La placa se partió detrás de vos. No había margen para corregir el paso.'],
      ),
      orangeWins: lines(
        ['orange', 'La veta se puso naranja antes de que llegaras a la válvula.'],
        ['violet', 'La vi. Pensé que aguantaba mi peso. No tendría que haberlo supuesto.'],
      ),
      draw: lines(
        ['violet', 'El respiradero volvió a abrirse mientras cruzábamos.'],
        ['orange', 'Salimos ahora. No hay una segunda oportunidad si esa placa se hunde.'],
      ),
    }),
  }),
  Object.freeze({
    id: STAGE_IDS.FOREST,
    name: 'Bosque de los ecos',
    tagline: 'Senderos cubiertos por raíces y luces errantes',
    location: 'Valle de Niebla Verde',
    description: 'Un bosque antiguo donde las ramas confunden las distancias y las luciérnagas marcan caminos falsos.',
    groundDepthMode: 'free',
    dialogue: lines(
      ['violet', 'Volvimos al mismo tronco. La marca que hice está del otro lado.'],
      ['orange', 'No. Esa corteza está raspada desde arriba; alguien cambió las señales.'],
      ['violet', '¿Las luciérnagas también? Nos están llevando al claro.'],
      ['orange', 'No las sigas. Escuchá: el agua está a nuestra izquierda.'],
      ['violet', 'El arroyo tendría que estar atrás. Estamos girando en círculos.'],
      ['orange', 'Voy a dejar marcas en los troncos. Vos no te apartes del sendero.'],
      ['violet', 'No me aparté. Pero si esa cosa vuelve a moverse, no pienso esperar.'],
    ),
    resultDialogue: Object.freeze({
      violetWins: lines(
        ['violet', 'La marca estaba en el lado sin musgo. Esa era la ruta verdadera.'],
        ['orange', 'La pasé por alto. Seguí las luces en vez de revisar el tronco.'],
      ),
      orangeWins: lines(
        ['orange', 'Dejaste de mirar el sendero cuando escuchaste el ruido detrás.'],
        ['violet', 'Creí que venía del arroyo. Me hizo girar justo cuando avanzaste.'],
      ),
      draw: lines(
        ['violet', 'El ruido volvió a sonar, pero esta vez vino de los dos lados.'],
        ['orange', 'No vamos a perseguirlo a oscuras. Volvemos por las marcas que dejamos.'],
      ),
    }),
  }),
  Object.freeze({
    id: STAGE_IDS.SANCTUARY,
    name: 'Santuario celeste',
    tagline: 'Columnas doradas alrededor de un sello antiguo',
    location: 'Meseta de Auralis',
    description: 'Un recinto suspendido entre ruinas claras, mecanismos rúnicos y corrientes de energía.',
    groundDepthMode: 'free',
    dialogue: lines(
      ['violet', 'El anillo exterior está quieto. El del centro sigue contando.'],
      ['orange', 'Tres pulsos cortos y uno largo. La puerta responde a ese orden.'],
      ['violet', 'La inscripción dice que no hay que tocar el sello mientras brilla.'],
      ['orange', 'Ya lo toqué. La columna de la derecha acaba de bajar.'],
      ['violet', '¿Por qué no avisaste antes?'],
      ['orange', 'Porque pensé que era un seguro, no el mecanismo entero.'],
      ['violet', 'Apartate del círculo. Voy a devolverlo a su posición.'],
    ),
    resultDialogue: Object.freeze({
      violetWins: lines(
        ['violet', 'El sello parpadeó dos veces antes de abrir. Lo llegaste a ver.'],
        ['orange', 'Lo vi tarde. Vos contaste el intervalo y encontraste el momento justo.'],
      ),
      orangeWins: lines(
        ['orange', 'El anillo exterior se detuvo. Ahí teníamos que movernos.'],
        ['violet', 'Me quedé esperando otra señal. El mecanismo ya había dado la respuesta.'],
      ),
      draw: lines(
        ['violet', 'El mecanismo se bloqueó con los dos dentro del círculo.'],
        ['orange', 'Dejemos la sala quieta. No pienso probar otra combinación a ciegas.'],
      ),
    }),
  }),
]);

export function getStage(stageId) {
  return STAGES.find((stage) => stage.id === stageId) ?? STAGES[0];
}
