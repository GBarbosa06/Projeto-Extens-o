import { describe, it, expect } from 'vitest';
import { isLowStock, formatCurrency, filterProducts } from '../services/productService';
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
