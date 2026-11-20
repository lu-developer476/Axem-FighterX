/**
 * Espaciado único para los paneles y el contenido interactivo del juego.
 * Los títulos y controles se calculan dentro de límites interiores compartidos.
 */
export const UI_SPACING = Object.freeze({
  panelFrame: 1,
  contentGutter: 6,
  buttonTextGutter: 6,
  footerGutter: 2,
  modalTopInset: 16,
  modalBottomInset: 16,
  modalFooterReserve: 30,
  modalHeaderRuleInset: 32,
});

export const contentWidth = (width, gutter = UI_SPACING.contentGutter) =>
  Math.max(0, width - gutter * 2);

export const insetSize = (size) =>
  Math.max(0, size - UI_SPACING.panelFrame * 2);

export const mapPanelY = (value, sourceStart, sourceEnd, targetStart, targetEnd) => {
  if (sourceEnd <= sourceStart) return targetStart;
  const progress = Math.max(0, Math.min(1, (value - sourceStart) / (sourceEnd - sourceStart)));
  return Math.round(targetStart + (targetEnd - targetStart) * progress);
};
