import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import {
  Product,
  useCreateProductMutation,
  useUpdateProductMutation,
} from '../../api/productApi';
import { AlertCircle } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
}) => {
  const isEditing = !!productToEdit;

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [unitPrice, setUnitPrice] = useState<string>('0');
  const [currentStock, setCurrentStock] = useState<string>('0');
  const [minStockAlert, setMinStockAlert] = useState<string>('5');
  const [warehouseLocation, setWarehouseLocation] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = useCreateProductMutation();
  const updateMutation = useUpdateProductMutation();

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name || '');
      setSku(productToEdit.sku || '');
      setCategory(productToEdit.category || '');
      setUnitPrice(String(productToEdit.unitPrice || 0));
      setCurrentStock(String(productToEdit.currentStock || 0));
      setMinStockAlert(String(productToEdit.minStockAlert || 0));
      setWarehouseLocation(productToEdit.warehouseLocation || '');
    } else {
      setName('');
      setSku('');
      setCategory('Hydraulics');
      setUnitPrice('500');
      setCurrentStock('10');
      setMinStockAlert('5');
      setWarehouseLocation('Rack A-01');
    }
    setErrors({});
    setServerError(null);
  }, [productToEdit, isOpen]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim() || name.length < 2) errs.name = 'Product name must be at least 2 characters';
    if (!sku.trim() || sku.length < 2) errs.sku = 'SKU code is required';
    if (!category.trim()) errs.category = 'Category is required';
    if (!warehouseLocation.trim()) errs.warehouseLocation = 'Warehouse location is required';

    const price = parseFloat(unitPrice);
    if (isNaN(price) || price < 0) errs.unitPrice = 'Enter a valid positive unit price';

    const minAlert = parseInt(minStockAlert, 10);
    if (isNaN(minAlert) || minAlert < 0) errs.minStockAlert = 'Enter a valid non-negative alert threshold';

    if (!isEditing) {
      const stock = parseInt(currentStock, 10);
      if (isNaN(stock) || stock < 0) errs.currentStock = 'Enter a valid non-negative initial stock';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    try {
      if (isEditing && productToEdit) {
        await updateMutation.mutateAsync({
          id: productToEdit.id,
          payload: {
            name: name.trim(),
            sku: sku.trim().toUpperCase(),
            category: category.trim(),
            unitPrice: parseFloat(unitPrice),
            minStockAlert: parseInt(minStockAlert, 10),
            warehouseLocation: warehouseLocation.trim(),
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          category: category.trim(),
          unitPrice: parseFloat(unitPrice),
          currentStock: parseInt(currentStock, 10),
          minStockAlert: parseInt(minStockAlert, 10),
          warehouseLocation: warehouseLocation.trim(),
        });
      }
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to save product details';
      setServerError(msg);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Product — ${productToEdit?.sku}` : 'Add New Inventory Product'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Product Title / Name *"
            placeholder="e.g. Industrial Hydraulic Valve 3/4"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            required
          />

          <Input
            label="SKU Code *"
            placeholder="e.g. SKU-VALVE-001"
            value={sku}
            onChange={(e) => setSku(e.target.value.toUpperCase())}
            error={errors.sku}
            disabled={isEditing}
            required
          />

          <Input
            label="Category *"
            placeholder="e.g. Hydraulics, Bearings, Electrical"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            error={errors.category}
            required
          />

          <Input
            label="Unit Price (INR) *"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            error={errors.unitPrice}
            required
          />

          <Input
            label="Warehouse Rack Location *"
            placeholder="e.g. Rack A-12, Bin B-04"
            value={warehouseLocation}
            onChange={(e) => setWarehouseLocation(e.target.value)}
            error={errors.warehouseLocation}
            required
          />

          <Input
            label="Min Stock Alert Threshold *"
            type="number"
            placeholder="5"
            value={minStockAlert}
            onChange={(e) => setMinStockAlert(e.target.value)}
            error={errors.minStockAlert}
            required
          />

          {!isEditing && (
            <Input
              label="Initial Physical Stock *"
              type="number"
              placeholder="0"
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
              error={errors.currentStock}
              required
            />
          )}
        </div>

        {isEditing && (
          <p className="text-[11px] text-slate-400 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            ℹ️ Current physical stock cannot be edited directly here. Use the <strong>Stock Movement</strong> button to record audited inventory adjustments.
          </p>
        )}

        <div className="pt-4 flex justify-end space-x-3 border-t border-slate-800">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            {isEditing ? 'Update Product Info' : 'Create Product Catalog Item'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
