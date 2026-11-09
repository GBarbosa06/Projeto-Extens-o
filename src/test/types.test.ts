import { describe, it, expect } from 'vitest';
import {
  type Product,
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
});
