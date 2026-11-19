export const STAGE_IDS = Object.freeze({
  RUINS: 'ruins',
  VOLCANO: 'volcano',
  FOREST: 'forest',
  SANCTUARY: 'sanctuary',
});

export const STAGES = Object.freeze([
  Object.freeze({
    id: STAGE_IDS.RUINS,
    name: 'Ruinas de medianoche',
    tagline: 'Murallas antiguas bajo una luna inmóvil',
    location: 'Frontera de Eteria',
    description: 'Un puesto defensivo abandonado, con pasajes estrechos y muros que todavía conservan sus runas.',
    dialogue: Object.freeze([
      Object.freeze({ speaker: 'violet', text: 'El registro de la muralla marca una entrada abierta. ¿La viste?' }),
      Object.freeze({ speaker: 'orange', text: 'Sí. Está despejada, pero el piso cede cerca de los pilares.' }),
      Object.freeze({ speaker: 'violet', text: 'Entonces revisamos el centro y salimos por donde entramos. No hace falta correr.' }),
      Object.freeze({ speaker: 'orange', text: 'El informe también pide una evaluación de combate en cada zona.' }),
      Object.freeze({ speaker: 'violet', text: 'Podrías haberlo mencionado antes de traerme hasta acá.' }),
      Object.freeze({ speaker: 'orange', text: 'Tenés razón. ¿Hacemos una ronda corta y después revisamos la salida?' }),
      Object.freeze({ speaker: 'violet', text: 'Una ronda. Y esta vez decidimos el plan entre los dos.' }),
    ]),
  }),
  Object.freeze({
    id: STAGE_IDS.VOLCANO,
    name: 'Cráter del exilio',
    tagline: 'Una caldera activa sobre placas de basalto',
    location: 'Cordillera Ígnea',
    description: 'Un puente de roca volcánica atraviesa respiraderos y corrientes de lava.',
    dialogue: Object.freeze([
      Object.freeze({ speaker: 'violet', text: 'El puente está cediendo. ¿Cuánto tiempo nos queda?' }),
      Object.freeze({ speaker: 'orange', text: 'Lo suficiente para cruzar, no para volver por el mismo camino.' }),
      Object.freeze({ speaker: 'violet', text: 'La ruta de la izquierda tiene menos grietas.' }),
      Object.freeze({ speaker: 'orange', text: 'Pero pasa junto al respiradero. Esperá a que baje la presión.' }),
      Object.freeze({ speaker: 'violet', text: 'No voy a salir corriendo a la primera señal. Marcá el momento.' }),
      Object.freeze({ speaker: 'orange', text: 'Cuando se apague el resplandor, avanzamos. Después hacemos la evaluación.' }),
      Object.freeze({ speaker: 'violet', text: 'Bien. Primero cruzamos; después vemos quién tiene más resistencia.' }),
    ]),
  }),
  Object.freeze({
    id: STAGE_IDS.FOREST,
    name: 'Bosque de los ecos',
    tagline: 'Senderos cubiertos por raíces y luces errantes',
    location: 'Valle de Niebla Verde',
    description: 'Un bosque antiguo donde las ramas confunden las distancias y las luciérnagas marcan caminos falsos.',
    dialogue: Object.freeze([
      Object.freeze({ speaker: 'violet', text: '¿Escuchaste eso otra vez?' }),
      Object.freeze({ speaker: 'orange', text: 'Sí. Viene de la arboleda, pero no parece acercarse.' }),
      Object.freeze({ speaker: 'violet', text: 'Las huellas terminan acá. No me gusta que el sendero esté tan limpio.' }),
      Object.freeze({ speaker: 'orange', text: 'Puede que los animales hayan salido por el cambio de viento.' }),
      Object.freeze({ speaker: 'violet', text: 'Revisemos sin separarnos. Si aparece algo, lo enfrentamos juntos.' }),
      Object.freeze({ speaker: 'orange', text: 'Y después hacemos el ejercicio. Quiero ver cómo respondemos en este terreno.' }),
      Object.freeze({ speaker: 'violet', text: 'Trato hecho. Pero nada de perderse entre los árboles.' }),
    ]),
  }),
  Object.freeze({
    id: STAGE_IDS.SANCTUARY,
    name: 'Santuario celeste',
    tagline: 'Columnas doradas alrededor de un sello antiguo',
    location: 'Meseta de Auralis',
    description: 'Un recinto suspendido entre ruinas claras, mecanismos rúnicos y corrientes de energía.',
    dialogue: Object.freeze([
      Object.freeze({ speaker: 'violet', text: 'El sello está intacto. ¿Por qué sigue brillando?' }),
      Object.freeze({ speaker: 'orange', text: 'El mecanismo recibe energía desde abajo. El santuario no está apagado.' }),
      Object.freeze({ speaker: 'violet', text: 'Entonces tocar esa placa podría activar otra cosa.' }),
      Object.freeze({ speaker: 'orange', text: 'Por eso no la toques todavía. Primero voy a comprobar los símbolos.' }),
      Object.freeze({ speaker: 'violet', text: 'Te cubro. Avisame antes de abrir nada.' }),
      Object.freeze({ speaker: 'orange', text: 'Cuando termine, hacemos el último ejercicio acá. El suelo parece estable.' }),
      Object.freeze({ speaker: 'violet', text: 'Perfecto. Esta vez prefiero saber dónde piso.' }),
    ]),
  }),
]);

export function getStage(stageId) {
  return STAGES.find((stage) => stage.id === stageId) ?? STAGES[0];
}
