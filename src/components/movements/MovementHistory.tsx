import React, { useState } from 'react';
import { StockMovement, MOVEMENT_REASONS } from '../../types';
import { ArrowUpRight, ArrowDownLeft, History, Search } from 'lucide-react';

interface MovementHistoryProps {
  movements: StockMovement[];
}

export const MovementHistory: React.FC<MovementHistoryProps> = ({ movements }) => {
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [search, setSearch] = useState('');

  const filtered = movements.filter((m) => {
    if (filterType !== 'ALL' && m.type !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchProduct = m.productName.toLowerCase().includes(q);
      const matchNotes = m.notes?.toLowerCase().includes(q);
      const matchReason = (MOVEMENT_REASONS[m.reason] || '').toLowerCase().includes(q);
      return matchProduct || matchNotes || matchReason;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <History className="w-7 h-7 text-blue-600" />
          Extrato de Movimentações de Estoque
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Acompanhe todas as entradas e saídas registradas com data, motivo e saldo resultante.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por produto, motivo ou observação..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterType === 'ALL'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Todas ({movements.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('IN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterType === 'IN'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Entradas
          </button>
          <button
            type="button"
            onClick={() => setFilterType('OUT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterType === 'OUT'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Saídas
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
          Nenhuma movimentação encontrada.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4">Produto</th>
                  <th className="py-3.5 px-4 text-center">Qtd Movimentada</th>
                  <th className="py-3.5 px-4 text-center">Saldo Anterior / Novo</th>
                  <th className="py-3.5 px-4">Motivo</th>
                  <th className="py-3.5 px-4">Data / Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((m) => {
                  const isEntry = m.type === 'IN';
                  const dateStr = new Date(m.createdAt).toLocaleString('pt-BR');

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isEntry
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {isEntry ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          )}
                          {isEntry ? 'Entrada' : 'Saída'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{m.productName}</div>
                        {m.notes && (
                          <div className="text-xs text-slate-500 italic">"{m.notes}"</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-base">
                        <span className={isEntry ? 'text-emerald-700' : 'text-red-700'}>
                          {isEntry ? '+' : '-'}{m.quantity}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center text-xs text-slate-600">
                        <span>{m.previousQuantity}</span>
                        <span className="mx-1.5 text-slate-400">→</span>
                        <strong className="text-slate-900 font-bold">{m.newQuantity}</strong>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 text-xs font-medium">
                        {MOVEMENT_REASONS[m.reason] || m.reason}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {dateStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
