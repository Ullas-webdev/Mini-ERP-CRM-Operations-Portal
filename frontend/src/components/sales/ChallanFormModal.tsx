import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useCustomersQuery } from '../../api/customerApi';
import { useProductsQuery } from '../../api/productApi';
import {
  SalesChallan,
  StockShortageItem,
  useCreateChallanMutation,
  useUpdateChallanMutation,
  useConfirmChallanMutation,
} from '../../api/challanApi';
import { Plus, Trash2, ShieldAlert, CheckCircle2, AlertOctagon } from 'lucide-react';

interface ChallanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  challanToEdit?: SalesChallan | null;
}

interface FormLineItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  productName: string;
  sku: string;
  currentStock: number;
}

export const ChallanFormModal: React.FC<ChallanFormModalProps> = ({
  isOpen,
  onClose,
  challanToEdit,
}) => {
  const isEditing = !!challanToEdit;

  const [customerId, setCustomerId] = useState('');
  const [lineItems, setLineItems] = useState<FormLineItem[]>([]);
  const [shortages, setShortages] = useState<StockShortageItem[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: customerData } = useCustomersQuery({ page: 1, limit: 100 });
  const { data: productData } = useProductsQuery({ page: 1, limit: 100 });

  const customers = customerData?.data?.customers || [];
  const products = productData?.data?.products || [];

  const createMutation = useCreateChallanMutation();
  const updateMutation = useUpdateChallanMutation();
  const confirmMutation = useConfirmChallanMutation();

  useEffect(() => {
    if (challanToEdit) {
      setCustomerId(challanToEdit.customerId || '');
      if (challanToEdit.lineItems && challanToEdit.lineItems.length > 0) {
        setLineItems(
          challanToEdit.lineItems.map((li) => ({
            productId: li.productId,
            quantity: li.quantity,
            unitPrice: li.unitPriceSnapshot,
            productName: li.productNameSnapshot,
            sku: li.product?.sku || 'SKU',
            currentStock: li.product?.currentStock || 0,
          }))
        );
      }
    } else {
      setCustomerId(customers[0]?.id || '');
      if (products.length > 0) {
        setLineItems([
          {
            productId: products[0].id,
            quantity: 1,
            unitPrice: products[0].unitPrice,
            productName: products[0].name,
            sku: products[0].sku,
            currentStock: products[0].currentStock,
          },
        ]);
      } else {
        setLineItems([]);
      }
    }
    setShortages([]);
    setServerError(null);
  }, [challanToEdit, isOpen, customers, products]);

  const handleAddLineItem = () => {
    if (products.length === 0) return;
    const firstProd = products[0];
    setLineItems((prev) => [
      ...prev,
      {
        productId: firstProd.id,
        quantity: 1,
        unitPrice: firstProd.unitPrice,
        productName: firstProd.name,
        sku: firstProd.sku,
        currentStock: firstProd.currentStock,
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, newProdId: string) => {
    const selectedProd = products.find((p) => p.id === newProdId);
    if (!selectedProd) return;

    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        productId: selectedProd.id,
        quantity: updated[index]?.quantity || 1,
        unitPrice: selectedProd.unitPrice,
        productName: selectedProd.name,
        sku: selectedProd.sku,
        currentStock: selectedProd.currentStock,
      };
      return updated;
    });
  };

  const handleQuantityChange = (index: number, qtyStr: string) => {
    const qty = parseInt(qtyStr, 10);
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index].quantity = isNaN(qty) || qty < 1 ? 1 : qty;
      return updated;
    });
  };

  const totalQuantity = lineItems.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleSubmit = async (shouldConfirm: boolean) => {
    setServerError(null);
    setShortages([]);

    if (!customerId) {
      setServerError('Please select a customer for this challan');
      return;
    }

    if (lineItems.length === 0) {
      setServerError('Please add at least one line item product');
      return;
    }

    try {
      let challanId = challanToEdit?.id;

      const payload = {
        customerId,
        lineItems: lineItems.map((li) => ({
          productId: li.productId,
          quantity: li.quantity,
        })),
      };

      if (isEditing && challanId) {
        await updateMutation.mutateAsync({ id: challanId, payload });
      } else {
        const createdRes = await createMutation.mutateAsync(payload);
        challanId = createdRes.data.data.id;
      }

      if (shouldConfirm && challanId) {
        await confirmMutation.mutateAsync(challanId);
      }

      onClose();
    } catch (err: any) {
      const errDetails = err.response?.data?.error;
      const msg = errDetails?.message || 'Failed to save Sales Challan';

      if (errDetails?.code === 'INSUFFICIENT_STOCK' && Array.isArray(errDetails?.details)) {
        setShortages(errDetails.details);
        setServerError('Challan saved as DRAFT, but Stock Confirmation failed due to insufficient stock. See details below.');
      } else {
        setServerError(msg);
      }
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending || confirmMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Sales Challan — ${challanToEdit?.challanNumber}` : 'Create New Sales Delivery Challan'}
    >
      <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
        {/* Error Alert Box */}
        {serverError && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-200 text-xs flex items-start space-x-3">
            <ShieldAlert className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{serverError}</p>
            </div>
          </div>
        )}

        {/* Detailed Shortage Breakdown Alert Table */}
        {shortages.length > 0 && (
          <div className="rounded-xl border border-rose-700 bg-rose-950/90 p-4 space-y-3 shadow-xl">
            <div className="flex items-center space-x-2 text-rose-100 font-extrabold text-xs">
              <AlertOctagon className="h-4 w-4 text-rose-400" />
              <span>STOCK SHORTAGE REPORT (No stock was deducted)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-rose-200">
                <thead>
                  <tr className="border-b border-rose-800 text-[11px] font-bold uppercase text-rose-300">
                    <th className="py-2">SKU / Product</th>
                    <th className="py-2 text-center">Available Stock</th>
                    <th className="py-2 text-center">Requested Qty</th>
                    <th className="py-2 text-center">Shortage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-900/60 font-mono">
                  {shortages.map((short, idx) => (
                    <tr key={idx}>
                      <td className="py-2 font-semibold">
                        <span className="text-sky-300 mr-2">[{short.sku}]</span> {short.productName}
                      </td>
                      <td className="py-2 text-center text-amber-300">{short.availableStock}</td>
                      <td className="py-2 text-center">{short.requestedQuantity}</td>
                      <td className="py-2 text-center text-rose-400 font-bold">-{short.shortage} units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Customer Picker */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-300">Select Customer Account *</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          >
            <option value="">-- Choose Customer --</option>
            {customers.map((cust) => (
              <option key={cust.id} value={cust.id}>
                {cust.businessName} ({cust.name}) — Mobile: {cust.mobile}
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic Line Item Rows */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Challan Line Items ({lineItems.length})
            </h4>
            <Button variant="outline" size="sm" type="button" onClick={handleAddLineItem}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Product Row
            </Button>
          </div>

          <div className="space-y-2">
            {lineItems.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-2 items-center text-xs relative"
              >
                <div className="sm:col-span-5">
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">Product *</label>
                  <select
                    value={item.productId}
                    onChange={(e) => handleProductChange(idx, e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.sku}] {p.name} (Stock: {p.currentStock})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 sm:contents gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-semibold mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(idx, e.target.value)}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 text-center font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-semibold mb-1">Price</label>
                    <span className="block p-2 text-sky-400 font-mono text-xs font-semibold">
                      ₹{item.unitPrice.toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-semibold mb-1">Subtotal</label>
                    <span className="block p-2 text-emerald-400 font-mono text-xs font-bold">
                      ₹{(item.quantity * item.unitPrice).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="absolute top-2 right-2 sm:relative sm:top-0 sm:right-0 sm:col-span-1 text-right sm:pt-4">
                  <button
                    type="button"
                    onClick={() => handleRemoveLineItem(idx)}
                    className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg bg-slate-950/60 sm:bg-transparent"
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4 text-rose-400 sm:text-slate-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Footer */}
        <div className="glass-card p-4 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-slate-400 uppercase font-semibold">Total Quantity: </span>
            <strong className="text-slate-200">{totalQuantity} units</strong>
          </div>
          <div>
            <span className="text-slate-400 uppercase font-semibold">Est. Total Amount: </span>
            <strong className="text-sky-400 text-sm font-extrabold">₹{grandTotal.toFixed(2)}</strong>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex justify-end space-x-3 border-t border-slate-800">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>

          <Button
            variant="outline"
            type="button"
            isLoading={isSubmitting}
            onClick={() => handleSubmit(false)}
          >
            Save as DRAFT
          </Button>

          <Button
            variant="primary"
            type="button"
            isLoading={isSubmitting}
            onClick={() => handleSubmit(true)}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" /> Save & Confirm Fulfillment
          </Button>
        </div>
      </div>
    </Modal>
  );
};
