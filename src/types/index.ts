export type CustomFieldType = 'text' | 'number' | 'date' | 'select';

export interface CustomField {
  id: string;
  name: string;
  type: CustomFieldType;
  options?: string[];
  required?: boolean;
}

export interface StoreSettings {
  storeName: string;
  currency: string;
  activeSegment: 'general' | 'clothing' | 'food' | 'custom';
  customFields: CustomField[];
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  costPrice?: number;
  salePrice: number;
  quantity: number;
  minQuantity: number;
  customFieldValues: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type MovementType = 'IN' | 'OUT';

export type MovementReason =
  | 'REPLENISHMENT'
  | 'SALE'
  | 'LOSS_DAMAGE'
  | 'ADJUSTMENT'
  | 'OTHER';

export const MOVEMENT_REASONS: Record<MovementReason, string> = {
  REPLENISHMENT: 'Reposição',
  SALE: 'Venda',
  LOSS_DAMAGE: 'Perda / Avaria',
  ADJUSTMENT: 'Ajuste de Balanço',
  OTHER: 'Outro',
};

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number;
  reason: MovementReason;
  notes?: string;
  previousQuantity: number;
  newQuantity: number;
  createdAt: string;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'Minha Empresa',
  currency: 'BRL',
  activeSegment: 'general',
  customFields: [],
};
