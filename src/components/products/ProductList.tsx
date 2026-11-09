import React, { useState } from 'react';
import { Product, CustomField } from '../../types';
import { filterProducts, formatCurrency } from '../../services/productService';
import { LowStockBadge } from './LowStockBadge';
import {
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Edit2,
  Trash2,
  PackageSearch,
} from 'lucide-react';

interface ProductListProps {
  products: Product[];
  customFields: CustomField[];
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onOpenMovement: (product: Product, type: 'IN' | 'OUT') => void;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  customFields,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onOpenMovement,
}) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'low_stock' | 'out_of_stock'>('all');

  const filtered = filterProducts(products, search, filterStatus);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Catálogo de Produtos</h2>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie itens, preços e execute movimentações rápidas de estoque.
          </p>
        </div>
        <button
          onClick={onAddProduct}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, categoria ou código SKU..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterStatus === 'all'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Todos ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('low_stock')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterStatus === 'low_stock'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Estoque Baixo
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('out_of_stock')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterStatus === 'out_of_stock'
                ? 'bg-red-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Esgotados
          </button>
        </div>
      </div>

      {/* Product Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <PackageSearch className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">Nenhum produto encontrado</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {products.length === 0
              ? 'Comece cadastrando os primeiros produtos do seu estoque.'
              : 'Nenhum item corresponde ao termo pesquisado ou filtro selecionado.'}
          </p>
          {products.length === 0 && (
            <button
              onClick={onAddProduct}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Primeiro Produto
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                  <th className="py-3.5 px-4">Produto</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4 text-right">Preço Venda</th>
                  <th className="py-3.5 px-4 text-center">Estoque</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Movimentar</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{product.name}</div>
                      {product.sku && (
                        <div className="text-xs text-slate-400">SKU: {product.sku}</div>
                      )}
                      {customFields.length > 0 && product.customFieldValues && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {customFields.slice(0, 2).map((cf) => {
                            const val = product.customFieldValues[cf.id];
                            if (!val) return null;
                            return (
                              <span
                                key={cf.id}
                                className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600"
                              >
                                {cf.name}: {val}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {product.category ? (
                        <span className="px-2 py-0.5 rounded-md text-xs bg-slate-100 text-slate-700">
                          {product.category}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-slate-800">
                      {formatCurrency(product.salePrice)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-900 text-base">
                        {product.quantity}
                      </span>
                      {product.minQuantity > 0 && (
                        <span className="block text-[11px] text-slate-400">
                          mín: {product.minQuantity}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <LowStockBadge product={product} />
                    </td>

                    {/* Quick Movement Buttons */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenMovement(product, 'IN')}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                          title="Dar Entrada de Estoque (Reposição)"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          Entrada
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenMovement(product, 'OUT')}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                          title="Dar Baixa de Estoque (Venda / Perda)"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          Saída
                        </button>
                      </div>
                    </td>

                    {/* Edit / Delete */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditProduct(product)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                          title="Editar produto"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProduct(product.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                          title="Excluir produto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
