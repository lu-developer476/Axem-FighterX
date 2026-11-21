export const STAGE_IDS = Object.freeze({
  RUINS: 'ruins',
  VOLCANO: 'volcano',
  FOREST: 'forest',
  SANCTUARY: 'sanctuary',
  DOWNTOWN: 'downtown-ruins',
  MEADOW: 'meadow-outskirts',
  VOLCANO_MOUTH: 'obsidian-maw',
  YOSHI_ISLAND: 'yoshis-island',
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
  Object.freeze({
    id: STAGE_IDS.DOWNTOWN,
    name: 'Avenida del apagón',
    tagline: 'Persianas torcidas, cables caídos y comercios vaciados',
    location: 'Distrito Sur · Sector 6',
    description: 'Una calle comercial quedó partida por el derrumbe: marquesinas encendidas a medias, un patrullero volcado, hidrantes abiertos y vidrieras tapiadas.',
    groundDepthMode: 'free',
    dialogue: lines(
      ['orange', 'El semáforo sigue cambiando para una avenida que ya no tiene tránsito.'],
      ['violet', 'La joyería tiene la persiana arrancada. El marco está doblado hacia afuera.'],
      ['orange', 'No fue una explosión. Mirá las marcas en el cordón: arrastraron algo pesado.'],
      ['violet', 'El patrullero bloquea media calle y el hidrante no deja de tirar agua.'],
      ['orange', 'Entonces no pises los cables. Ese cartel todavía chisporrotea.'],
      ['violet', 'La entrada del videoclub está tapiada. Alguien dejó herramientas adentro.'],
      ['orange', 'No vamos a encontrar a nadie siguiendo huellas entre los vidrios. Primero despejemos la calle.'],
    ),
    resultDialogue: Object.freeze({
      violetWins: lines(
        ['violet', 'El patrullero te dejó sin salida cuando intentaste rodearlo.'],
        ['orange', 'Me encerré solo. Tendría que haber usado la vereda, no el medio de la avenida.'],
      ),
      orangeWins: lines(
        ['orange', 'El agua del hidrante te hizo perder pie justo al girar.'],
        ['violet', 'Miré el semáforo roto en vez del charco. No voy a cometer ese error otra vez.'],
      ),
      draw: lines(
        ['violet', 'El transformador volvió a chisporrotear sobre los cables caídos.'],
        ['orange', 'Cortemos acá. La calle no va a dejar de venirse abajo por una pelea.'],
      ),
    }),
  }),
  Object.freeze({
    id: STAGE_IDS.MEADOW,
    name: 'Llanura de la torre rota',
    tagline: 'Colinas verdes, cercas de madera y un puente sobre el barranco',
    location: 'Límite de la meseta',
    description: 'Una zona campal aislada de la ciudad: lomadas suaves, senderos de tierra, un puente angosto, una torre de vigilancia y rocas dispersas bajo un cielo limpio.',
    groundDepthMode: 'free',
    dialogue: lines(
      ['violet', 'Desde la torre se ve la ciudad, pero el camino termina en el barranco.'],
      ['orange', 'El puente aguanta. La baranda derecha está floja; no te apoyes ahí.'],
      ['violet', 'Hay marcas de ruedas en el sendero. El carro tuvo que subir por la loma.'],
      ['orange', 'Y esas piedras no están puestas al azar. Alguien delimitó un circuito.'],
      ['violet', 'El viento viene de la llanura. No hay edificios que lo frenen.'],
      ['orange', 'La cerca está rota junto al árbol. Podemos rodear por el pasto alto.'],
      ['violet', 'No. Si perdemos de vista la torre, después no vamos a encontrar el puente.'],
    ),
    resultDialogue: Object.freeze({
      violetWins: lines(
        ['violet', 'Te quedaste junto al puente y no viste que había ganado la loma.'],
        ['orange', 'La pendiente me tapó el otro lado. Tendría que haber cambiado de carril.'],
      ),
      orangeWins: lines(
        ['orange', 'El sendero se estrecha detrás de la torre. Ahí te quedaste sin espacio.'],
        ['violet', 'Creí que la cerca seguía entera. No vi el tramo caído junto al árbol.'],
      ),
      draw: lines(
        ['violet', 'El viento ya cubrió las huellas del sendero.'],
        ['orange', 'Dejemos el puente en paz. Con la baranda floja no aguanta otra embestida.'],
      ),
    }),
  }),
  Object.freeze({
    id: STAGE_IDS.VOLCANO_MOUTH,
    name: 'Fauces de obsidiana',
    tagline: 'El cráter respira: la roca se abre antes de escupir fuego',
    location: 'Caldera de Khar-Zul',
    description: 'Una cornisa negra rodea la boca de un volcán activo. Tres respiraderos se encienden por turnos, la lava rebalsa por grietas y los fragmentos incandescentes caen de vuelta sobre la arena.',
    groundDepthMode: 'free',
    hazards: Object.freeze({
      type: 'lava-vents',
      positions: Object.freeze([148, 320, 492]),
      initialVentIndex: 1,
      warningMs: 1700,
      activeMs: 900,
      cooldownMs: 2100,
      damage: 14,
      radiusX: 34,
      depthTolerance: 16,
      safeAltitude: 58,
    }),
    dialogue: lines(
      ['violet', 'No es humo. La ceniza sale en pulsos, como si el cráter estuviera respirando.'],
      ['orange', 'Las grietas se iluminaron en ese orden: izquierda, centro, derecha.'],
      ['violet', 'La roca del borde está hueca. Escuchá cómo retumba cuando cae la grava.'],
      ['orange', 'No te acerques al respiradero cuando se ponga naranja. Primero avisa, después explota.'],
      ['violet', 'La lava no corre pareja. Se junta detrás de esa cresta y salta cuando rebalsa.'],
      ['orange', 'Entonces no alcanza con esquivar al otro. Hay que mirar el suelo todo el tiempo.'],
      ['violet', 'Cuando la boca se abra, salimos del círculo. No voy a probar cuánto aguanta la armadura.'],
    ),
    resultDialogue: Object.freeze({
      violetWins: lines(
        ['violet', 'El respiradero central avisó dos veces. Te quedaste mirando la lava en vez de moverte.'],
        ['orange', 'Pensé que el pulso había terminado. La segunda columna me alcanzó de lleno.'],
      ),
      orangeWins: lines(
        ['orange', 'Te empujé hacia la grieta cuando empezó a brillar. No había margen para salir.'],
        ['violet', 'Vi el resplandor tarde. Tendría que haber ganado altura antes de atacar.'],
      ),
      draw: lines(
        ['violet', 'La cornisa se abrió en tres partes. Ya no queda suelo firme junto al cráter.'],
        ['orange', 'Basta. Si vuelve a escupir lava, no va a quedar nadie para contarlo.'],
      ),
    }),
  }),
  Object.freeze({
    id: STAGE_IDS.YOSHI_ISLAND,
    name: 'Isla de Yoshi',
    tagline: 'Una isla tropical que se desvanece bajo el cielo abierto',
    location: 'Yoshi\'s Island · Mar abierto',
    description: 'Una isla de playas claras, palmeras inclinadas y un muelle de tablones. La marea se come la orilla y algo bajo el acantilado amenaza con partirla en pedazos.',
    groundDepthMode: 'free',
    dialogue: lines(
      ['violet', 'La isla se ve entera desde acá, pero la arena de la orilla ya está cediendo.'],
      ['orange', 'Es la marea. Cada ola se lleva un pedazo de playa y no lo devuelve.'],
      ['violet', 'Las palmeras de la punta están inclinadas hacia el mar. Alguien las debilitó.'],
      ['orange', 'No fue el viento. Las raíces están cortadas a ras y la savia todavía está fresca.'],
      ['violet', 'Entonces esta isla no se hunde sola. Hay algo debajo del acantilado.'],
      ['orange', 'Escucho un zumbido metálico bajo el agua. Cada vez más cerca.'],
      ['violet', 'Si la isla se parte, peleamos mientras quede suelo. Después vemos cómo salir.'],
    ),
    resultDialogue: Object.freeze({
      violetWins: lines(
        ['violet', 'Te quedaste en la orilla cuando subió la marea. La arena no sostuvo tu apoyo.'],
        ['orange', 'Miré la palmera caída y no el agua. Cuando reaccioné ya no tenía suelo.'],
      ),
      orangeWins: lines(
        ['orange', 'Te llevé hacia el acantilado y la ola cortó tu retirada por el muelle.'],
        ['violet', 'Contaba las grietas de la isla en vez de mirarte a vos. Error mío.'],
      ),
      draw: lines(
        ['violet', 'La playa se partió entre los dos y cada uno quedó en un trozo distinto.'],
        ['orange', 'Mejor así. Un golpe más y el mar nos lleva junto con la isla.'],
      ),
    }),
  }),
]);

export function getStage(stageId) {
  return STAGES.find((stage) => stage.id === stageId) ?? STAGES[0];
}
