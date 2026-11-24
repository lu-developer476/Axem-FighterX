import { describe, expect, it } from 'vitest';
import { AVAILABLE_RANGER_VARIANTS, genderForRanger, getCounterpartSelection, isAvailableRangerVariant } from './rangerVariants.js';

describe('variantes disponibles de Axem', () => {
  it('ofrece únicamente Axem Naranja masculino hasta que las demás hojas estén listas', () => {
    expect(AVAILABLE_RANGER_VARIANTS).toEqual([{ id: 'orange', gender: 'male' }]);
    expect(genderForRanger('orange')).toBe('male');
    expect(genderForRanger('violet')).toBeNull();
    expect(isAvailableRangerVariant('orange', 'male')).toBe(true);
    expect(isAvailableRangerVariant('violet', 'female')).toBe(false);
    expect(isAvailableRangerVariant('orange', 'female')).toBe(false);
    expect(isAvailableRangerVariant('red', 'male')).toBe(false);
  });
  it('mantiene una selección visual válida para el rival IA', () => {
    expect(getCounterpartSelection({ id: 'orange', gender: 'male' })).toEqual({ id: 'orange', gender: 'male' });
  });
  it('rechaza combinaciones que no están disponibles', () => {
    expect(() => getCounterpartSelection({ id: 'violet', gender: 'female' })).toThrow(/selección de Axem no está disponible/);
    expect(() => getCounterpartSelection({ id: 'orange', gender: 'female' })).toThrow(/selección de Axem no está disponible/);
  });
});
