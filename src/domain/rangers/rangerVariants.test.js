import { describe, expect, it } from 'vitest';
import { AVAILABLE_RANGER_VARIANTS, genderForRanger, getCounterpartSelection, isAvailableRangerVariant } from './rangerVariants.js';

describe('variantes disponibles de Axem', () => {
  it('incluye Axem Orange, White y Red masculinos', () => {
    expect(AVAILABLE_RANGER_VARIANTS).toEqual([{ id: 'orange', gender: 'male' }, { id: 'white', gender: 'male' }, { id: 'red', gender: 'male' }]);
    expect(genderForRanger('orange')).toBe('male');
    expect(genderForRanger('white')).toBe('male');
    expect(genderForRanger('red')).toBe('male');
    expect(genderForRanger('violet')).toBeNull();
    expect(isAvailableRangerVariant('orange', 'male')).toBe(true);
    expect(isAvailableRangerVariant('violet', 'female')).toBe(false);
    expect(isAvailableRangerVariant('orange', 'female')).toBe(false);
    expect(isAvailableRangerVariant('red', 'male')).toBe(true);
  });
  it('mantiene una selección visual válida para el rival IA', () => {
    expect(getCounterpartSelection({ id: 'orange', gender: 'male' })).toEqual({ id: 'orange', gender: 'male' });
  });
  it('rechaza combinaciones que no están disponibles', () => {
    expect(() => getCounterpartSelection({ id: 'violet', gender: 'female' })).toThrow(/selección de Axem no está disponible/);
    expect(() => getCounterpartSelection({ id: 'orange', gender: 'female' })).toThrow(/selección de Axem no está disponible/);
  });
});
