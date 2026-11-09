import { describe, it, expect } from 'vitest';
import { PRESET_SEGMENTS, sanitizeCustomFieldValue } from '../services/settingsService';
import { CustomField } from '../types';

describe('Settings Presets and Field Validation', () => {
  it('provides clothing preset with size and color fields', () => {
    const clothing = PRESET_SEGMENTS.find((s) => s.id === 'clothing');
    expect(clothing).toBeDefined();
    expect(clothing?.fields.some((f) => f.name.toLowerCase() === 'tamanho')).toBe(true);
    expect(clothing?.fields.some((f) => f.name.toLowerCase() === 'cor')).toBe(true);
  });

  it('provides food preset with expiration date and batch fields', () => {
    const food = PRESET_SEGMENTS.find((s) => s.id === 'food');
    expect(food).toBeDefined();
    expect(food?.fields.some((f) => f.name.toLowerCase() === 'validade')).toBe(true);
    expect(food?.fields.some((f) => f.name.toLowerCase() === 'lote')).toBe(true);
  });

  it('sanitizes field value according to field type', () => {
    const numberField: CustomField = { id: 'peso', name: 'Peso (kg)', type: 'number' };
    expect(sanitizeCustomFieldValue(numberField, '12.5')).toBe(12.5);
    expect(sanitizeCustomFieldValue(numberField, 'invalid')).toBe(0);

    const textField: CustomField = { id: 'cor', name: 'Cor', type: 'text' };
    expect(sanitizeCustomFieldValue(textField, '  Vermelho  ')).toBe('Vermelho');
  });
});
