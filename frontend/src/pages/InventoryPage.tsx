import React, { useState } from 'react';
import { useInventoryQuery, InventoryItem, useCreateInventoryMutation, useAdjustInventoryMutation } from '../api/inventoryApi';
import { useLocationsQuery } from '../api/locationApi';
import { useProductsQuery } from '../api/productApi';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Table, Column } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { toast } from 'react-hot-toast';
import {
  Boxes,
  Plus,
  MapPin,
  AlertOctagon,
  Lock,
  SlidersHorizontal,
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const canManageInventory = user?.role === 'ADMIN' || user?.role === 'OPERATIONS';

  const [search, setSearch] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null);

  // Form states for Add Batch
  const [addProductId, setAddProductId] = useState('');
  const [addLocationId, setAddLocationId] = useState('');
  const [addBatchNumber, setAddBatchNumber] = useState('BATCH-2026-A');
  const [addPhysicalQty, setAddPhysicalQty] = useState(50);

  // Form states for Adjust Stock
  const [adjustDelta, setAdjustDelta] = useState(10);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT'>('IN');
  const [adjustReason, setAdjustReason] = useState('Physical audit adjustment');

  const { data: locationsData } = useLocationsQuery();
  const { data: productsData } = useProductsQuery({});
  const { data: inventoryData, isLoading, isError } = useInventoryQuery({
    locationId: selectedLocationId || undefined,
    search: search || undefined,
  });

  const createMutation = useCreateInventoryMutation();
  const adjustMutation = useAdjustInventoryMutation();

  const locations = locationsData?.data?.locations || [];
  const products = productsData?.data?.products || [];
  const rawInventories: InventoryItem[] = inventoryData?.data?.inventories || [];

  const inventories = lowStockOnly
    ? rawInventories.filter((inv) => inv.isLowStock)
    : rawInventories;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addProductId || !addLocationId) {
      toast.error('Please select product and location');
      return;
    }
    try {
      await createMutation.mutateAsync({
        productId: addProductId,
        locationId: addLocationId,
        batchNumber: addBatchNumber.trim() || 'DEFAULT',
        physicalQuantity: addPhysicalQty,
      });
      toast.success('Inventory batch updated/created successfully!');
      setIsAddModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create inventory batch');
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    try {
      await adjustMutation.mutateAsync({
        inventoryId: adjustTarget.id,
        quantityChanged: adjustDelta,
        movementType: adjustType,
        reason: adjustReason.trim(),
      });
      toast.success('Stock adjusted successfully!');
      setIsAdjustModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to adjust stock');
    }
  };

  const columns: Column<InventoryItem>[] = [
    {
      header: 'Item & SKU',
      cell: (row) => (
        <div>
          <p className="font-bold text-xs text-slate-100">{row.product.name}</p>
          <span className="font-mono text-[10px] text-sky-400">SKU: {row.product.sku}</span>
        </div>
      ),
    },
    {
      header: 'Category',
      cell: (row) => <Badge variant="purple">{row.product.category}</Badge>,
    },
    {
      header: 'Location',
      cell: (row) => (
        <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
          <MapPin className="h-3 w-3 text-amber-400" /> {row.location.name} ({row.location.code})
        </span>
      ),
    },
    {
      header: 'Batch #',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-400 bg-slate-950/60 px-2 py-1 rounded border border-slate-800">
          {row.batchNumber}
        </span>
      ),
    },
    {
      header: 'Physical Qty',
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-200">{row.physicalQuantity} units</span>
      ),
    },
    {
      header: 'Reserved Qty',
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-amber-400">
          {row.reservedQuantity} units
        </span>
      ),
    },
    {
      header: 'Available Qty',
      cell: (row) => (
        <div>
          <span
            className={`font-mono text-xs font-extrabold ${
              row.availableQuantity <= 0
                ? 'text-rose-400'
                : row.isLowStock
                ? 'text-amber-400 animate-pulse'
                : 'text-emerald-400'
            }`}
          >
            {row.availableQuantity} units
          </span>
          {row.isLowStock && (
            <p className="text-[10px] text-rose-400 font-semibold flex items-center gap-0.5 mt-0.5">
              <AlertOctagon className="h-3 w-3" /> Low Stock Alert
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div>
          {canManageInventory ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAdjustTarget(row);
                setIsAdjustModalOpen(true);
              }}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1 text-sky-400" /> Adjust Stock
            </Button>
          ) : (
            <span className="text-xs text-slate-500 italic">Read Only</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <Boxes className="h-6 w-6 text-sky-400" /> Physical Inventory & Stock Catalog
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time batch stock metrics: Physical Quantity, Reserved Quantity, and Available Stock
          </p>
        </div>

        {canManageInventory ? (
          <Button
            variant="primary"
            onClick={() => {
              if (products.length > 0) setAddProductId(products[0].id);
              if (locations.length > 0) setAddLocationId(locations[0].id);
              setIsAddModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Inventory Batch
          </Button>
        ) : (
          <div className="flex items-center text-xs text-slate-400 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
            <Lock className="h-4 w-4 text-slate-500 mr-2" />
            <span>Role ({user?.role}) has Read-Only Stock permissions</span>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <Card title="Inventory Search & Filters" subtitle="Filter by location, product SKU, or low-stock alerts">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Input
            label="Search Item / SKU / Category"
            placeholder="e.g. Valve, SKU-VALVE-001, Hydraulics"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">Filter by Location</label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            >
              <option value="">-- All Physical Locations --</option>
              {locations.map((loc: any) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.code})
                </option>
              ))}
            </select>
          </div>

          <div className="pb-1">
            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-300 cursor-pointer bg-slate-950 p-2.5 rounded-xl border border-slate-800 hover:bg-slate-900 transition-colors">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
                className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-sky-500"
              />
              <span className="flex items-center text-rose-300">
                <AlertOctagon className="h-3.5 w-3.5 mr-1 text-rose-400" /> Low-Stock Alerts Only
              </span>
            </label>
          </div>
        </div>
      </Card>

      {/* Inventory Table */}
      <Card title="Physical Stock Directory" subtitle={`Showing ${inventories.length} inventory records`}>
        {isError && (
          <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-rose-400 shrink-0" />
              <span>
                Unable to connect or load inventory records from the backend server. Please verify the backend service at <code className="text-sky-400 font-mono">http://localhost:5000/api/v1</code> is running.
              </span>
            </div>
          </div>
        )}
        <Table
          columns={columns}
          data={inventories}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage={
            isError
              ? 'Error loading inventory records from backend server'
              : 'No inventory records found for selected filter'
          }
        />
      </Card>

      {/* Add Inventory Batch Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Initialize / Add Inventory Batch"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">Select Item / Product *</label>
            <select
              value={addProductId}
              onChange={(e) => setAddProductId(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200"
            >
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>
                  [{p.sku}] {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">Select Warehouse Location *</label>
            <select
              value={addLocationId}
              onChange={(e) => setAddLocationId(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200"
            >
              {locations.map((loc: any) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.code})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Batch Number *"
            value={addBatchNumber}
            onChange={(e) => setAddBatchNumber(e.target.value)}
            placeholder="e.g. BATCH-2026-A"
            required
          />

          <Input
            label="Physical Quantity *"
            type="number"
            min="0"
            value={addPhysicalQty}
            onChange={(e) => setAddPhysicalQty(parseInt(e.target.value, 10) || 0)}
            required
          />

          <div className="pt-3 border-t border-slate-800 flex justify-end space-x-3">
            <Button variant="secondary" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending}>
              Save Inventory Batch
            </Button>
          </div>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title={`Adjust Stock — ${adjustTarget?.product.name || ''}`}
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1 font-mono">
            <p className="text-slate-400">Location: <span className="text-slate-200">{adjustTarget?.location.name}</span></p>
            <p className="text-slate-400">Current Physical: <span className="text-slate-200">{adjustTarget?.physicalQuantity} units</span></p>
            <p className="text-slate-400">Current Reserved: <span className="text-amber-400">{adjustTarget?.reservedQuantity} units</span></p>
            <p className="text-slate-400">Current Available: <span className="text-emerald-400">{adjustTarget?.availableQuantity} units</span></p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">Adjustment Type *</label>
            <select
              value={adjustType}
              onChange={(e) => setAdjustType(e.target.value as 'IN' | 'OUT')}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200"
            >
              <option value="IN">Stock IN (Restock / Supplier Receipt)</option>
              <option value="OUT">Stock OUT (Scrap / Manual Reduction)</option>
            </select>
          </div>

          <Input
            label="Quantity Changed *"
            type="number"
            min="1"
            value={adjustDelta}
            onChange={(e) => setAdjustDelta(parseInt(e.target.value, 10) || 1)}
            required
          />

          <Input
            label="Audit Reason *"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            placeholder="e.g. Physical inventory audit discrepancy"
            required
          />

          <div className="pt-3 border-t border-slate-800 flex justify-end space-x-3">
            <Button variant="secondary" type="button" onClick={() => setIsAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={adjustMutation.isPending}>
              Save Stock Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
