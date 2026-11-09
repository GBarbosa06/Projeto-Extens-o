import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar, NavTab } from './components/layout/Navbar';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { ProductList } from './components/products/ProductList';
import { MovementHistory } from './components/movements/MovementHistory';
import { SettingsView } from './components/settings/SettingsView';
import { ProductFormModal } from './components/products/ProductFormModal';
import { StockMovementModal } from './components/movements/StockMovementModal';
import { AuthModal } from './components/auth/AuthModal';
import { Product, StockMovement, StoreSettings, DEFAULT_STORE_SETTINGS, MovementType } from './types';
import { getProducts, saveProduct, deleteProduct } from './services/productService';
import { getMovements, registerStockMovement } from './services/movementService';
import { getStoreSettings } from './services/settingsService';

const MainApp: React.FC = () => {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);

  // Modal states
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementProduct, setMovementProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] = useState<MovementType>('IN');

  // Load initial data
  const loadData = async () => {
    if (currentUser) {
      const [userProducts, userMovements, userSettings] = await Promise.all([
        getProducts(currentUser.uid),
        getMovements(currentUser.uid),
        getStoreSettings(currentUser.uid),
      ]);
      setProducts(userProducts);
      setMovements(userMovements);
      setSettings(userSettings);
    } else {
      // In guest/demo mode or after logout, reset movements and settings
      setMovements([]);
      setSettings(DEFAULT_STORE_SETTINGS);

      // Provide a friendly initial sample so users/evaluators see features immediately
      const initialSample: Product[] = [
        {
          id: 'demo-1',
          name: 'Camiseta Algodão Básica',
          sku: 'TSH-001',
          category: 'Vestuário',
          costPrice: 20,
          salePrice: 49.9,
          quantity: 15,
          minQuantity: 5,
          customFieldValues: { tamanho: 'M', cor: 'Azul Marinho' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'demo-2',
          name: 'Caneca Cerâmica Personalizada',
          sku: 'MUG-002',
          category: 'Artesanato',
          costPrice: 12,
          salePrice: 32.0,
          quantity: 3,
          minQuantity: 5,
          customFieldValues: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      setProducts(initialSample);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Product Actions
  const handleSaveProduct = async (productData: any) => {
    if (currentUser) {
      const saved = await saveProduct(currentUser.uid, productData);
      setProducts((prev) => {
        const index = prev.findIndex((p) => p.id === saved.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = saved;
          return updated;
        }
        return [saved, ...prev];
      });
    } else {
      // Local state fallback
      const id = productData.id || `local-${Date.now()}`;
      const now = new Date().toISOString();
      const newProduct: Product = {
        ...productData,
        id,
        createdAt: now,
        updatedAt: now,
      };
      setProducts((prev) => {
        const index = prev.findIndex((p) => p.id === id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = newProduct;
          return updated;
        }
        return [newProduct, ...prev];
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Deseja realmente excluir este produto?')) return;

    if (currentUser) {
      await deleteProduct(currentUser.uid, productId);
    }
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  // Stock Movement Action
  const handleRegisterMovement = async (params: any) => {
    if (currentUser) {
      const newMovement = await registerStockMovement({
        userId: currentUser.uid,
        ...params,
      });
      setMovements((prev) => [newMovement, ...prev]);

      // Update product quantity in state
      setProducts((prev) =>
        prev.map((p) =>
          p.id === params.productId ? { ...p, quantity: newMovement.newQuantity } : p
        )
      );
    } else {
      // Local fallback
      const prod = products.find((p) => p.id === params.productId);
      const currentQty = prod ? prod.quantity : 0;
      const delta = params.type === 'IN' ? params.quantity : -params.quantity;
      const newQty = currentQty + delta;
      const now = new Date().toISOString();

      const localMovement: StockMovement = {
        id: `mov-${Date.now()}`,
        productId: params.productId,
        productName: params.productName,
        type: params.type,
        quantity: params.quantity,
        reason: params.reason,
        notes: params.notes,
        previousQuantity: currentQty,
        newQuantity: newQty,
        createdAt: now,
      };

      setMovements((prev) => [localMovement, ...prev]);
      setProducts((prev) =>
        prev.map((p) => (p.id === params.productId ? { ...p, quantity: newQty } : p))
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAuth={() => setIsAuthOpen(true)}
        storeName={settings.storeName}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            products={products}
            recentMovements={movements}
            onNavigateToProducts={() => setActiveTab('products')}
            onNavigateToMovements={() => setActiveTab('movements')}
            onAddProduct={() => {
              setProductToEdit(null);
              setIsProductModalOpen(true);
            }}
          />
        )}

        {activeTab === 'products' && (
          <ProductList
            products={products}
            customFields={settings.customFields || []}
            onAddProduct={() => {
              setProductToEdit(null);
              setIsProductModalOpen(true);
            }}
            onEditProduct={(prod) => {
              setProductToEdit(prod);
              setIsProductModalOpen(true);
            }}
            onDeleteProduct={handleDeleteProduct}
            onOpenMovement={(prod, type) => {
              setMovementProduct(prod);
              setMovementType(type);
              setIsMovementModalOpen(true);
            }}
          />
        )}

        {activeTab === 'movements' && <MovementHistory movements={movements} />}

        {activeTab === 'settings' && (
          <SettingsView
            userId={currentUser?.uid || 'guest'}
            settings={settings}
            onSettingsUpdated={setSettings}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>
          Projeto de Extensão Universitária • Engenharia de Software UCB (2026)
        </p>
        <p className="mt-1 text-slate-400">
          Solução Digital para Organização e Gestão de Estoque de Pequenos Empreendedores
        </p>
      </footer>

      {/* Modals */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProduct}
        productToEdit={productToEdit}
        customFields={settings.customFields || []}
      />

      <StockMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        product={movementProduct}
        initialType={movementType}
        onSubmit={handleRegisterMovement}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
