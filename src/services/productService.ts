import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Product } from '../types';

export const isLowStock = (product: Pick<Product, 'quantity' | 'minQuantity'>): boolean => {
  if (product.quantity <= 0) return true;
  if (product.minQuantity > 0 && product.quantity <= product.minQuantity) return true;
  return false;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

export const filterProducts = (
  products: Product[],
  searchQuery: string,
  filterStatus: 'all' | 'low_stock' | 'out_of_stock'
): Product[] => {
  const queryLower = searchQuery.toLowerCase().trim();

  return products.filter((product) => {
    // Search match
    const matchesSearch =
      !queryLower ||
      product.name.toLowerCase().includes(queryLower) ||
      (product.sku && product.sku.toLowerCase().includes(queryLower)) ||
      (product.category && product.category.toLowerCase().includes(queryLower));

    if (!matchesSearch) return false;

    // Status filter
    if (filterStatus === 'low_stock') {
      return isLowStock(product);
    }
    if (filterStatus === 'out_of_stock') {
      return product.quantity <= 0;
    }

    return true;
  });
};

export const getProducts = async (userId: string): Promise<Product[]> => {
  try {
    const productsRef = collection(db, 'users', userId, 'products');
    const q = query(productsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Product[];
  } catch (err) {
    console.warn('Erro ao buscar produtos no Firestore:', err);
    return [];
  }
};

export const saveProduct = async (
  userId: string,
  productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<Product> => {
  const productsRef = collection(db, 'users', userId, 'products');
  const productId = productData.id || doc(productsRef).id;
  const now = new Date().toISOString();

  const productDocRef = doc(db, 'users', userId, 'products', productId);

  const fullProduct: Product = {
    id: productId,
    name: productData.name.trim(),
    sku: productData.sku?.trim() || '',
    category: productData.category?.trim() || '',
    costPrice: productData.costPrice || 0,
    salePrice: productData.salePrice || 0,
    quantity: productData.quantity ?? 0,
    minQuantity: productData.minQuantity ?? 0,
    customFieldValues: productData.customFieldValues || {},
    createdAt: (productData as any).createdAt || now,
    updatedAt: now,
  };

  await setDoc(productDocRef, fullProduct, { merge: true });
  return fullProduct;
};

export const deleteProduct = async (userId: string, productId: string): Promise<void> => {
  const productDocRef = doc(db, 'users', userId, 'products', productId);
  await deleteDoc(productDocRef);
};
