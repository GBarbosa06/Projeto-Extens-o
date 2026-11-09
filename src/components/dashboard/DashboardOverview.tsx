import React from 'react';
import { Product, StockMovement } from '../../types';
import { calculateDashboardMetrics } from './dashboardUtils';
import { formatCurrency } from '../../services/productService';
import {
  Package,
  Layers,
  CircleDollarSign,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
} from 'lucide-react';

interface DashboardOverviewProps {
  products: Product[];
  recentMovements: StockMovement[];
  onNavigateToProducts: () => void;
  onNavigateToMovements: () => void;
  onAddProduct: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  products,
  recentMovements,
  onNavigateToProducts,
  onNavigateToMovements,
  onAddProduct,
}) => {
  const metrics = calculateDashboardMetrics(products);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white mb-3 backdrop-blur-sm">
            Painel de Gestão Ágil
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Controle de Estoque Descomplicado
          </h2>
          <p className="mt-2 text-blue-100 text-sm sm:text-base leading-relaxed">
            Tenha clareza sobre o volume de mercadorias, valor em estoque e alertas de reposição para não perder vendas.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={onAddProduct}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-blue-700 font-semibold text-sm hover:bg-blue-50 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Produto
            </button>
            <button
              onClick={onNavigateToProducts}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600/60 hover:bg-blue-600/80 text-white font-medium text-sm transition backdrop-blur-sm border border-white/20"
            >
              Ver Catálogo Completo
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total de Itens
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-0.5">
              {metrics.totalProducts}
            </div>
            <div className="text-[11px] text-slate-400">produtos cadastrados</div>
          </div>
        </div>

        {/* Total Units */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Unidades em Estoque
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-0.5">
              {metrics.totalItems}
            </div>
            <div className="text-[11px] text-slate-400">peças / unidades físicas</div>
          </div>
        </div>

        {/* Total Value */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CircleDollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Valor em Mercadorias
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-0.5">
              {formatCurrency(metrics.totalInventoryValue)}
            </div>
            <div className="text-[11px] text-slate-400">preço de venda estimado</div>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div
          className={`p-6 rounded-2xl border shadow-sm flex items-center gap-4 transition ${
            metrics.lowStockCount > 0
              ? 'bg-amber-50/70 border-amber-200'
              : 'bg-white border-slate-200'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              metrics.lowStockCount > 0
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Estoque Baixo / Crítico
            </div>
            <div
              className={`text-2xl font-bold mt-0.5 ${
                metrics.lowStockCount > 0 ? 'text-amber-800' : 'text-slate-800'
              }`}
            >
              {metrics.lowStockCount}
            </div>
            <div className="text-[11px] text-slate-400">necessitam reposição</div>
          </div>
        </div>
      </div>

      {/* Recent Movements Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Últimas Movimentações</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro recente de entradas e saídas realizadas na loja.
            </p>
          </div>
          <button
            onClick={onNavigateToMovements}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            Ver histórico completo →
          </button>
        </div>

        {recentMovements.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Nenhuma movimentação registrada recentemente.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentMovements.slice(0, 5).map((m) => {
              const isEntry = m.type === 'IN';
              return (
                <div key={m.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isEntry ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {isEntry ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{m.productName}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(m.createdAt).toLocaleDateString('pt-BR')} • {m.notes || 'Sem observações'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-sm font-bold ${
                        isEntry ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {isEntry ? '+' : '-'}{m.quantity}
                    </span>
                    <div className="text-[11px] text-slate-400">saldo: {m.newQuantity}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
