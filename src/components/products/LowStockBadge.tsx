import React from 'react';
import { AlertTriangle, AlertOctagon } from 'lucide-react';
import { isLowStock } from '../../services/productService';
import { Product } from '../../types';

interface LowStockBadgeProps {
  product: Product;
}

export const LowStockBadge: React.FC<LowStockBadgeProps> = ({ product }) => {
  if (product.quantity <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
        <AlertOctagon className="w-3.5 h-3.5" />
        Esgotado
      </span>
    );
  }

  if (isLowStock(product)) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
        <AlertTriangle className="w-3.5 h-3.5" />
        Estoque Baixo
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
      Normal
    </span>
  );
};
