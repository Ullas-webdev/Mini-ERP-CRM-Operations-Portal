import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Product, useAdjustStockMutation } from '../../api/productApi';
import { ArrowUpRight, ArrowDownLeft, ShieldAlert } from 'lucide-react';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState<string>('1');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const adjustMutation = useAdjustStockMutation();

  if (!product) return null;

  const currentStock = product.currentStock;
  const parsedQty = parseInt(quantity, 10) || 0;

  const calculatedNewStock =
    movementType === 'IN' ? currentStock + parsedQty : currentStock - parsedQty;

  const isNegativeStock = movementType === 'OUT' && calculatedNewStock < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (parsedQty <= 0) {
      setErrorMsg('Quantity must be a positive number greater than 0');
      return;
    }

    if (!reason.trim() || reason.trim().length < 3) {
      setErrorMsg('Please enter a clear reason for this inventory movement (min 3 chars)');
      return;
    }

    if (isNegativeStock) {
      setErrorMsg(
        `Stock deduction rejected. Requested OUT (${parsedQty}) exceeds current available stock (${currentStock}). Stock cannot be negative.`
      );
      return;
    }

    try {
      await adjustMutation.mutateAsync({
        id: product.id,
        payload: {
          quantity: parsedQty,
          movementType,
          reason: reason.trim(),
        },
      });
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to process stock adjustment';
      setErrorMsg(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Transactional Stock Adjustment — ${product.sku}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Current Stock vs New Stock Preview Header */}
        <div className="glass-card p-4 rounded-xl border border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <p className="text-[11px] text-slate-400 uppercase font-semibold">Current Stock</p>
            <p className="text-base font-extrabold text-slate-200 mt-1">{currentStock} units</p>
          </div>

          <div>
            <p className="text-[11px] text-slate-400 uppercase font-semibold">Adjustment</p>
            <p className={`text-base font-extrabold mt-1 ${movementType === 'IN' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {movementType === 'IN' ? `+${parsedQty}` : `-${parsedQty}`}
            </p>
          </div>

          <div>
            <p className="text-[11px] text-slate-400 uppercase font-semibold">Resulting Stock</p>
            <p className={`text-base font-extrabold mt-1 ${isNegativeStock ? 'text-rose-400' : 'text-sky-400'}`}>
              {calculatedNewStock} units
            </p>
          </div>
        </div>

        {/* Movement Type Toggle */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-300">Movement Direction *</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMovementType('IN')}
              className={`p-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition-all ${
                movementType === 'IN'
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
              <span>STOCK IN (Receipt / Add)</span>
            </button>

            <button
              type="button"
              onClick={() => setMovementType('OUT')}
              className={`p-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition-all ${
                movementType === 'OUT'
                  ? 'bg-rose-950/80 border-rose-500 text-rose-300 ring-1 ring-rose-500/50'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <ArrowUpRight className="h-4 w-4 text-rose-400" />
              <span>STOCK OUT (Issue / Deduct)</span>
            </button>
          </div>
        </div>

        <Input
          label="Quantity to Adjust *"
          type="number"
          min="1"
          placeholder="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-300">Reason / Audit Trail Note *</label>
          <textarea
            rows={3}
            placeholder="e.g. Physical inventory audit discrepancy, damaged stock write-off, manual receipt"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
            required
          />
        </div>

        <div className="pt-4 flex justify-end space-x-3 border-t border-slate-800">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={movementType === 'IN' ? 'primary' : 'danger'}
            type="submit"
            isLoading={adjustMutation.isPending}
            disabled={isNegativeStock}
          >
            Confirm {movementType} Stock Movement
          </Button>
        </div>
      </form>
    </Modal>
  );
};
