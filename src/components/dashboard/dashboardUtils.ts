import { Product } from '../../types';
import { isLowStock } from '../../services/productService';

export interface DashboardMetrics {
  totalProducts: number;
  totalItems: number;
  totalInventoryValue: number;
  lowStockCount: number;
}

export const calculateDashboardMetrics = (products: Product[]): DashboardMetrics => {
  let totalItems = 0;
  let totalInventoryValue = 0;
  let lowStockCount = 0;

  for (const p of products) {
    const qty = p.quantity || 0;
    const price = p.salePrice || 0;

    totalItems += qty;
    totalInventoryValue += qty * price;

    if (isLowStock(p)) {
      lowStockCount += 1;
    }
  }

  return {
    totalProducts: products.length,
    totalItems,
    totalInventoryValue,
    lowStockCount,
  };
};
