import React, { useState } from 'react';
import { MovementReason, MovementType, MOVEMENT_REASONS, Product } from '../../types';
import { calculateNewStock } from '../../services/movementService';
import { parseBrazilianNumber } from '../../services/productService';
import { ArrowUpRight, ArrowDownLeft, X, AlertTriangle, Check } from 'lucide-react';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  initialType: MovementType;
  onSubmit: (params: {
    productId: string;
    productName: string;
    type: MovementType;
    quantity: number;
    reason: MovementReason;
    notes?: string;
  }) => Promise<void>;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  isOpen,
  onClose,
  product,
  initialType,
  onSubmit,
}) => {
  const [type, setType] = useState<MovementType>(initialType);
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState<MovementReason>(
    initialType === 'IN' ? 'REPLENISHMENT' : 'SALE'
  );
  const [notes, setNotes] = useState('');
  const [confirmNegative, setConfirmNegative] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync initial type when opening modal
  React.useEffect(() => {
    setType(initialType);
    setReason(initialType === 'IN' ? 'REPLENISHMENT' : 'SALE');
    setQuantity('1');
    setNotes('');
    setConfirmNegative(false);
  }, [initialType, isOpen]);

  if (!isOpen || !product) return null;

  const numericQty = parseBrazilianNumber(quantity);
  const { newQuantity, isNegative } = calculateNewStock(product.quantity, numericQty, type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericQty <= 0) {
      alert('Informe uma quantidade válida maior que zero.');
      return;
    }

    if (isNegative && !confirmNegative) {
      alert('Por favor, confirme que está ciente de que o saldo ficará negativo antes de continuar.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        productId: product.id,
        productName: product.name,
        type,
        quantity: numericQty,
        reason,
        notes,
      });
      onClose();
    } catch (err: any) {
      alert('Erro ao registrar movimentação: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              type === 'IN'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {type === 'IN' ? (
              <ArrowUpRight className="w-6 h-6" />
            ) : (
              <ArrowDownLeft className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {type === 'IN' ? 'Entrada de Estoque' : 'Saída de Estoque'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">{product.name}</p>
          </div>
        </div>

        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => {
              setType('IN');
              setReason('REPLENISHMENT');
            }}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              type === 'IN'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            + Entrada (Reposição)
          </button>
          <button
            type="button"
            onClick={() => {
              setType('OUT');
              setReason('SALE');
            }}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              type === 'OUT'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            - Saída (Venda/Baixa)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Stock Simulation Badge */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Estoque atual: <strong className="text-slate-800">{product.quantity}</strong>
            </span>
            <span className="font-bold">
              Novo saldo: {' '}
              <span className={isNegative ? 'text-red-600 font-extrabold' : 'text-slate-900'}>
                {newQuantity}
              </span>
            </span>
          </div>

          {/* Negative Stock Warning Dialog */}
          {isNegative && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold">Atenção: Saldo Negativo</p>
                <p className="mt-0.5">
                  Esta saída deixará o estoque abaixo de zero ({newQuantity}).
                </p>
                <label className="flex items-center gap-2 mt-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={confirmNegative}
                    onChange={(e) => setConfirmNegative(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Estou ciente e desejo continuar</span>
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Quantidade *
            </label>
            <input
              type="text"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Motivo da Movimentação
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as MovementReason)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {type === 'IN' ? (
                <>
                  <option value="REPLENISHMENT">{MOVEMENT_REASONS.REPLENISHMENT}</option>
                  <option value="ADJUSTMENT">{MOVEMENT_REASONS.ADJUSTMENT}</option>
                  <option value="OTHER">{MOVEMENT_REASONS.OTHER}</option>
                </>
              ) : (
                <>
                  <option value="SALE">{MOVEMENT_REASONS.SALE}</option>
                  <option value="LOSS_DAMAGE">{MOVEMENT_REASONS.LOSS_DAMAGE}</option>
                  <option value="ADJUSTMENT">{MOVEMENT_REASONS.ADJUSTMENT}</option>
                  <option value="OTHER">{MOVEMENT_REASONS.OTHER}</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Observações (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Pedido nº 123, cliente balcão..."
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || (isNegative && !confirmNegative)}
              className={`px-5 py-2.5 font-medium rounded-xl text-white text-sm transition shadow-sm flex items-center gap-1.5 disabled:opacity-50 ${
                type === 'IN'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              <Check className="w-4 h-4" />
              {saving ? 'Registrando...' : 'Confirmar Movimentação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
