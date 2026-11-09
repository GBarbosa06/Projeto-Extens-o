import { describe, it, expect } from 'vitest';
import { calculateDashboardMetrics } from '../components/dashboard/dashboardUtils';
import { Product } from '../types';

describe('Dashboard Metrics', () => {
  it('computes metrics from product list', () => {
    const mockProducts: Product[] = [
      {
        id: '1',
        name: 'Item 1',
        salePrice: 10,
        quantity: 5,
        minQuantity: 2,
        customFieldValues: {},
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '2',
        name: 'Item 2',
        salePrice: 20,
        quantity: 1,
        minQuantity: 3,
        customFieldValues: {},
        createdAt: '',
        updatedAt: '',
      },
    ];

    const metrics = calculateDashboardMetrics(mockProducts);
    expect(metrics.totalProducts).toBe(2);
    expect(metrics.totalItems).toBe(6);
    expect(metrics.totalInventoryValue).toBe(70); // 5*10 + 1*20
    expect(metrics.lowStockCount).toBe(1); // Item 2 is below minQuantity
  });

  it('handles empty product list gracefully', () => {
    const metrics = calculateDashboardMetrics([]);
    expect(metrics.totalProducts).toBe(0);
    expect(metrics.totalItems).toBe(0);
    expect(metrics.totalInventoryValue).toBe(0);
    expect(metrics.lowStockCount).toBe(0);
  });
});
