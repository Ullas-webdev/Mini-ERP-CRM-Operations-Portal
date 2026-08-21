import React, { useState } from 'react';
import { useProductsQuery, Product, ProductsFilters } from '../api/productApi';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Table, Column } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { ProductFormModal } from '../components/inventory/ProductFormModal';
import { StockAdjustmentModal } from '../components/inventory/StockAdjustmentModal';
import { ProductDetailModal } from '../components/inventory/ProductDetailModal';
import {
  Boxes,
  Plus,
  MapPin,
  Eye,
  Edit2,
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';

export const WarehousePage: React.FC = () => {
  const { user } = useAuth();
  const canAdjustStock = user?.role === 'ADMIN' || user?.role === 'OPERATIONS';

  const [filters, setFilters] = useState<ProductsFilters>({
    page: 1,
    limit: 10,
    search: '',
    category: '',
    lowStock: false,
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  const { data, isLoading } = useProductsQuery(filters);

  const products = data?.data?.products || [];
  const pagination = data?.data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

  const handleSearchChange = (val: string) => {
    setFilters((prev) => ({ ...prev, search: val, page: 1 }));
  };

  const handleCategoryChange = (val: string) => {
    setFilters((prev) => ({ ...prev, category: val, page: 1 }));
  };

  const handleLowStockToggle = (checked: boolean) => {
    setFilters((prev) => ({ ...prev, lowStock: checked, page: 1 }));
  };

  const handleOpenAdd = () => {
    setProductToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setProductToEdit(p);
    setIsFormOpen(true);
  };

  const handleOpenAdjust = (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setAdjustProduct(p);
    setIsAdjustOpen(true);
  };

  const handleOpenDetail = (p: Product) => {
    setSelectedProduct(p);
    setIsDetailOpen(true);
  };

  const columns: Column<Product>[] = [
    {
      header: 'SKU / Product Name',
      cell: (row) => (
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-bold text-sky-400 px-2 py-0.5 bg-sky-950/80 rounded border border-sky-800">
              {row.sku}
            </span>
            <span className="font-bold text-slate-200 text-xs">{row.name}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <MapPin className="h-3 w-3 text-slate-500" /> Location: <strong>{row.warehouseLocation}</strong>
          </p>
        </div>
      ),
    },
    {
      header: 'Category',
      cell: (row) => <Badge variant="purple">{row.category}</Badge>,
    },
    {
      header: 'Unit Price',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-300 font-semibold">
          ₹{row.unitPrice.toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Current Inventory',
      cell: (row) => {
        const isLow = row.currentStock <= row.minStockAlert;
        return (
          <div className="flex items-center space-x-2">
            <span className={`font-mono text-xs font-bold ${isLow ? 'text-rose-400' : 'text-emerald-400'}`}>
              {row.currentStock} units
            </span>
            {isLow && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/90 text-rose-300 border border-rose-600 animate-pulse">
                <AlertOctagon className="h-3 w-3 mr-1 text-rose-400" /> Low Stock (Min: {row.minStockAlert})
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Ledger Entries',
      cell: (row) => (
        <span className="text-xs text-slate-400 font-mono">
          {row._count?.stockMovements || 0} movements
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenDetail(row)}
          >
            <Eye className="h-3.5 w-3.5 mr-1" /> Ledger
          </Button>

          {canAdjustStock && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => handleOpenAdjust(row, e)}
              >
                Adjust Stock
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => handleOpenEdit(row, e)}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <Boxes className="h-6 w-6 text-sky-400" /> Warehouse & Physical Inventory Catalog
          </h2>
          <p className="text-sm text-slate-400">
            Monitor real-time physical stock levels, execute transactional movements, and audit ledger entries
          </p>
        </div>

        {canAdjustStock ? (
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Inventory Item
          </Button>
        ) : (
          <div className="flex items-center text-xs text-slate-400 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
            <Lock className="h-4 w-4 text-slate-500 mr-2" />
            <span>Role ({user?.role}) has Read-Only Stock permissions</span>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <Card title="Inventory Catalog Controls" subtitle="Search by SKU code, product title, category, or location">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Input
            label="Search Keywords"
            placeholder="e.g. SKU-VALVE-001, Valve, Rack A-12"
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
          />

          <Input
            label="Category Keyword"
            placeholder="e.g. Hydraulics, Bearings, Seals"
            value={filters.category || ''}
            onChange={(e) => handleCategoryChange(e.target.value)}
          />

          {/* Low Stock Toggle */}
          <div className="pb-2">
            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-300 cursor-pointer bg-slate-900 p-2.5 rounded-xl border border-slate-800 hover:bg-slate-800/80 transition-colors">
              <input
                type="checkbox"
                checked={filters.lowStock || false}
                onChange={(e) => handleLowStockToggle(e.target.checked)}
                className="h-4 w-4 rounded bg-slate-950 border-slate-800 text-sky-500 focus:ring-sky-500"
              />
              <span className="flex items-center text-rose-300">
                <AlertOctagon className="h-3.5 w-3.5 mr-1 text-rose-400" /> Filter Low-Stock Alerts Only
              </span>
            </label>
          </div>
        </div>
      </Card>

      {/* Product Inventory Table */}
      <Card title="Product Inventory Directory" subtitle={`Showing ${products.length} of ${pagination.total} inventory catalog items`}>
        <Table
          columns={columns}
          data={products}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          onRowClick={(row) => handleOpenDetail(row)}
        />

        {/* Pagination Controls */}
        <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-800">
          <span className="text-xs text-slate-400">
            Page <strong className="text-slate-200">{pagination.page}</strong> of <strong className="text-slate-200">{pagination.totalPages}</strong>
          </span>
          <div className="flex space-x-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Form Modal (Create / Edit metadata) */}
      {isFormOpen && (
        <ProductFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          productToEdit={productToEdit}
        />
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustOpen && (
        <StockAdjustmentModal
          isOpen={isAdjustOpen}
          onClose={() => setIsAdjustOpen(false)}
          product={adjustProduct}
        />
      )}

      {/* Product Detail & Ledger Modal */}
      {isDetailOpen && (
        <ProductDetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          product={selectedProduct}
        />
      )}
    </div>
  );
};
