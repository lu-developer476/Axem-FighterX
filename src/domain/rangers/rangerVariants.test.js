import { describe, expect, it } from 'vitest';
import {
  AVAILABLE_RANGER_VARIANTS,
  genderForRanger,
  getCounterpartSelection,
  isAvailableRangerVariant,
} from './rangerVariants.js';

describe('variantes disponibles de Axem', () => {
  it('mantiene exclusivamente Violeta femenino y Naranja masculino', () => {
    expect(AVAILABLE_RANGER_VARIANTS).toEqual([
      { id: 'orange', gender: 'male' },
      { id: 'violet', gender: 'female' },
    ]);
    expect(genderForRanger('violet')).toBe('female');
    expect(genderForRanger('orange')).toBe('male');
    expect(isAvailableRangerVariant('orange', 'female')).toBe(false);
    expect(isAvailableRangerVariant('violet', 'male')).toBe(false);
  });

  it('asigna a las IA la variante contraria a la elegida por J1', () => {
    expect(getCounterpartSelection({ id: 'violet', gender: 'female' })).toEqual({
      id: 'orange', gender: 'male',
    });
    expect(getCounterpartSelection({ id: 'orange', gender: 'male' })).toEqual({
      id: 'violet', gender: 'female',
    });
  });

  it('rechaza variantes retiradas antes de asignar un rival', () => {
    expect(() => getCounterpartSelection({ id: 'violet', gender: 'male' }))
      .toThrow(/selección de Axem no está disponible/);
  });
});