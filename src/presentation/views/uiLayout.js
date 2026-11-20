/**
 * Espaciado compartido de todos los paneles del juego.
 * Ninguna vista define márgenes internos independientes para sus modales.
 */
export const UI_SPACING = Object.freeze({
  panelFrame: 2,
  contentGutter: 12,
  buttonTextGutter: 10,
});

export const contentWidth = (width, gutter = UI_SPACING.contentGutter) =>
  Math.max(0, width - gutter * 2);

export const insetSize = (size) =>
  Math.max(0, size - UI_SPACING.panelFrame * 2);
