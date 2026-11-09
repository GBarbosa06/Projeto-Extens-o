import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  runTransaction
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { MovementReason, MovementType, StockMovement } from '../types';

export interface CalculatedStockResult {
  newQuantity: number;
  isNegative: boolean;
}

export const calculateNewStock = (
  currentQuantity: number,
  movementQuantity: number,
  type: MovementType
): CalculatedStockResult => {
  const delta = type === 'IN' ? movementQuantity : -movementQuantity;
  const raw = currentQuantity + delta;
  const newQuantity = Math.round(raw * 10000) / 10000;
  return {
    newQuantity,
    isNegative: newQuantity < 0,
  };
};

export interface RegisterMovementParams {
  userId: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number;
  reason: MovementReason;
  notes?: string;
}

export const registerStockMovement = async (
  params: RegisterMovementParams
): Promise<StockMovement> => {
  const { userId, productId, productName, type, quantity, reason, notes } = params;

  const productRef = doc(db, 'users', userId, 'products', productId);
  const movementsRef = collection(db, 'users', userId, 'movements');
  const movementId = doc(movementsRef).id;
  const movementRef = doc(db, 'users', userId, 'movements', movementId);

  const now = new Date().toISOString();

  let finalMovement: StockMovement | null = null;

  await runTransaction(db, async (transaction) => {
    const productSnap = await transaction.get(productRef);
    if (!productSnap.exists()) {
      throw new Error('Produto não encontrado no estoque.');
    }

    const currentQty = productSnap.data().quantity ?? 0;
    const { newQuantity } = calculateNewStock(currentQty, quantity, type);

    transaction.update(productRef, {
      quantity: newQuantity,
      updatedAt: now,
    });

    finalMovement = {
      id: movementId,
      productId,
      productName,
      type,
      quantity,
      reason,
      notes: notes?.trim() || '',
      previousQuantity: currentQty,
      newQuantity,
      createdAt: now,
    };

    transaction.set(movementRef, finalMovement);
  });

  return finalMovement!;
};

export const getMovements = async (userId: string): Promise<StockMovement[]> => {
  try {
    const movementsRef = collection(db, 'users', userId, 'movements');
    const q = query(movementsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as StockMovement[];
  } catch (err) {
    console.warn('Erro ao carregar movimentações:', err);
    return [];
  }
};
