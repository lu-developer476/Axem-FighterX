import { describe, expect, it } from 'vitest';
import { contentWidth, insetSize, UI_SPACING } from './uiLayout.js';

describe('Espaciado compartido de interfaces', () => {
  it('aplica el mismo marco interior a paneles de cualquier tamaño', () => {
    expect(insetSize(330)).toBe(328);
    expect(insetSize(440)).toBe(438);
  });

  it('usa un margen de contenido uniforme y permite ajustar el texto de botones', () => {
    expect(contentWidth(330)).toBe(318);
    expect(contentWidth(210, UI_SPACING.buttonTextGutter)).toBe(198);
    expect(UI_SPACING.footerGutter).toBe(2);
  });

  it('nunca devuelve anchos negativos para paneles pequeños', () => {
    expect(contentWidth(10, 12)).toBe(0);
    expect(insetSize(2)).toBe(0);
  });
});
