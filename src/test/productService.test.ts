import { describe, it, expect } from 'vitest';
import { isLowStock, formatCurrency, filterProducts, parseBrazilianNumber } from '../services/productService';
import { Product } from '../types';

describe('Product Service Helpers', () => {
  it('correctly identifies low stock condition', () => {
    expect(isLowStock({ quantity: 1, minQuantity: 3 } as Product)).toBe(true);
    expect(isLowStock({ quantity: 5, minQuantity: 3 } as Product)).toBe(false);
    expect(isLowStock({ quantity: 0, minQuantity: 0 } as Product)).toBe(true);
  });

  it('formats currency in Brazilian standard', () => {
    expect(formatCurrency(59.9)).toContain('59,90');
    expect(formatCurrency(0)).toContain('0,00');
  });

  it('parses brazilian numbers with thousand dots, commas and R$ prefixes', () => {
    expect(parseBrazilianNumber('1.250,50')).toBe(1250.5);
    expect(parseBrazilianNumber('1.000')).toBe(1000);
    expect(parseBrazilianNumber('R$ 49,90')).toBe(49.9);
    expect(parseBrazilianNumber('2,5')).toBe(2.5);
    expect(parseBrazilianNumber(-10)).toBe(0);
  });

  it('filters products by query and stock status', () => {
    const products: Product[] = [
      { id: '1', name: 'Bolo de Chocolate', category: 'Doces', salePrice: 35, quantity: 2, minQuantity: 5, customFieldValues: {}, createdAt: '', updatedAt: '' },
      { id: '2', name: 'Coxinha de Frango', category: 'Salgados', salePrice: 8, quantity: 20, minQuantity: 10, customFieldValues: {}, createdAt: '', updatedAt: '' },
    ];

    expect(filterProducts(products, 'bolo', 'all').length).toBe(1);
    expect(filterProducts(products, 'salgados', 'all').length).toBe(1);
    expect(filterProducts(products, '', 'low_stock').length).toBe(1);
    expect(filterProducts(products, '', 'all').length).toBe(2);
  });
});
