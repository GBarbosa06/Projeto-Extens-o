import { describe, it, expect } from 'vitest';
import {
  type Product,
  type DuplicateStrategy,
  type DetectedCustomField,
  type ImportParsedItem,
  type ImportAnalysisResult,
  MOVEMENT_REASONS,
  DEFAULT_STORE_SETTINGS
} from '../types';

describe('Domain Types and Constants', () => {
  it('exports valid movement reasons map', () => {
    expect(MOVEMENT_REASONS.REPLENISHMENT).toBe('Reposição');
    expect(MOVEMENT_REASONS.SALE).toBe('Venda');
    expect(MOVEMENT_REASONS.LOSS_DAMAGE).toBe('Perda / Avaria');
  });

  it('exports default store settings', () => {
    expect(DEFAULT_STORE_SETTINGS.currency).toBe('BRL');
    expect(DEFAULT_STORE_SETTINGS.activeSegment).toBe('general');
    expect(Array.isArray(DEFAULT_STORE_SETTINGS.customFields)).toBe(true);
  });

  it('instantiates valid product contract', () => {
    const product: Product = {
      id: 'prod-1',
      name: 'Camisa Polo',
      salePrice: 59.9,
      quantity: 10,
      minQuantity: 2,
      customFieldValues: { tamanho: 'M', cor: 'Azul' },
      createdAt: '2026-11-09T00:00:00Z',
      updatedAt: '2026-11-09T00:00:00Z',
    };
    expect(product.name).toBe('Camisa Polo');
    expect(product.quantity).toBe(10);
  });

  it('instantiates valid import analysis contracts', () => {
    const strategy: DuplicateStrategy = 'sum';
    const field: DetectedCustomField = {
      id: 'field_material',
      name: 'Material',
      selected: true,
    };
    const item: ImportParsedItem = {
      name: 'Camiseta de Algodão',
      salePrice: 49.9,
      quantity: 20,
      minQuantity: 0,
      customFieldValues: { material: 'Algodão 100%' },
      warnings: [],
      isDuplicate: false,
    };
    const analysis: ImportAnalysisResult = {
      items: [item],
      newCustomFields: [field],
      totalRows: 1,
      validCount: 1,
      warningCount: 0,
      duplicateCount: 0,
    };

    expect(strategy).toBe('sum');
    expect(analysis.totalRows).toBe(1);
    expect(analysis.newCustomFields[0].name).toBe('Material');
  });
});
