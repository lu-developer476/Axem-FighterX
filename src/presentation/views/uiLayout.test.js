import { describe, expect, it } from 'vitest';
import { contentWidth, insetSize, mapPanelY, UI_SPACING } from './uiLayout.js';

describe('Espaciado compartido de interfaces', () => {
  it('aplica el mismo marco interior a paneles de cualquier tamaño', () => {
    expect(insetSize(330)).toBe(328);
    expect(insetSize(440)).toBe(438);
  });

  it('usa un margen de contenido uniforme y mantiene anchos válidos', () => {
    expect(contentWidth(330)).toBe(318);
    expect(contentWidth(210, UI_SPACING.buttonTextGutter)).toBe(198);
    expect(contentWidth(10, 12)).toBe(0);
  });

  it('reserva el borde superior e inferior de todo modal', () => {
    expect(UI_SPACING.modalTopInset).toBe(16);
    expect(UI_SPACING.modalBottomInset).toBe(16);
    expect(UI_SPACING.modalFooterReserve).toBe(30);
    expect(UI_SPACING.modalHeaderRuleInset).toBe(32);
  });

  it('mapea títulos y controles al espacio interior sin desbordar', () => {
    expect(mapPanelY(122, 122, 239, 46, 226)).toBe(46);
    expect(mapPanelY(239, 122, 239, 46, 226)).toBe(226);
    expect(mapPanelY(500, 122, 239, 46, 226)).toBe(226);
  });
});
