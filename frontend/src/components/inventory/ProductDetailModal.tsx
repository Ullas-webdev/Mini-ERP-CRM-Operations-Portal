import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Table, Column } from '../common/Table';
import { Product, StockMovement } from '../../api/productApi';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { useAuth } from '../../context/AuthContext';
import {
  Boxes,
  MapPin,
  AlertOctagon,
  History,
  Plus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

interface MovementsData {
  movements: StockMovement[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const { user } = useAuth();
  const canAdjustStock = user?.role === 'ADMIN' || user?.role === 'OPERATIONS';

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [movementPage, setMovementPage] = useState(1);
  const [movementsData, setMovementsData] = useState<MovementsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveProduct, setLiveProduct] = useState<Product | null>(product);

  const fetchMovements = useCallback(async (productId: string, page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [prodRes, movRes] = await Promise.all([
        fetch(`${API_BASE}/products/${productId}`, { headers }),
        fetch(`${API_BASE}/products/${productId}/movements?page=${page}&limit=10`, { headers }),
      ]);

      if (prodRes.ok) {
        const prodJson = await prodRes.json();
        setLiveProduct(prodJson.data);
      }

      if (movRes.ok) {
        const movJson = await movRes.json();
        setMovementsData(movJson.data);
      } else {
        const errJson = await movRes.json();
        setError(`API Error ${movRes.status}: ${errJson?.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`Network error: ${String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch whenever modal opens or page changes
  useEffect(() => {
    if (isOpen && product?.id) {
      setMovementPage(1);
      setMovementsData(null);
      setLiveProduct(product);
      fetchMovements(product.id, 1);
    }
  }, [isOpen, product?.id]);

  useEffect(() => {
    if (isOpen && product?.id) {
      fetchMovements(product.id, movementPage);
    }
  }, [movementPage]);

  const handleAdjustClose = () => {
    setIsAdjustModalOpen(false);
    // Refresh movements after adjustment
    if (product?.id) {
      fetchMovements(product.id, movementPage);
    }
  };

  if (!product) return null;

  const activeProduct = liveProduct || product;
  const movements = movementsData?.movements || [];
  const pagination = movementsData?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };
  const isLowStock = activeProduct.currentStock <= activeProduct.minStockAlert;

  const columns: Column<StockMovement>[] = [
    {
      header: 'Timestamp',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-300">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Direction',
      cell: (row) => (
        <Badge variant={row.movementType === 'IN' ? 'success' : 'error'}>
          {row.movementType === 'IN' ? 'IN (+)' : 'OUT (-)'}
        </Badge>
      ),
    },
    {
      header: 'Qty Changed',
      cell: (row) => (
        <span className={`font-mono text-xs font-bold ${row.movementType === 'IN' ? 'text-emerald-400' : 'text-rose-400'}`}>
          {row.movementType === 'IN' ? `+${row.quantityChanged}` : `-${row.quantityChanged}`}
        </span>
      ),
    },
    {
      header: 'Reason / Audit Note',
      cell: (row) => <span className="text-xs text-slate-300">{row.reason}</span>,
    },
    {
      header: 'Actor',
      cell: (row) => (
        <div>
          <p className="text-xs font-bold text-slate-200">{row.creator?.name || 'System'}</p>
          <p className="text-[10px] text-slate-400 font-mono">{row.creator?.role || 'N/A'}</p>
        </div>
      ),
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Product Profile & Movement Ledger — ${activeProduct.sku}`}
    >
      <div className="space-y-6">
        {/* Low Stock Warning Alert Banner */}
        {isLowStock && (
          <div className="p-4 rounded-xl bg-rose-950/90 border border-rose-600 text-rose-200 flex items-start space-x-3 shadow-lg animate-pulse">
            <AlertOctagon className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-rose-100 text-xs uppercase tracking-wider">
                ⚠️ CRITICAL REORDER ALERT
              </p>
              <p className="text-xs text-rose-200 mt-0.5">
                Current inventory ({activeProduct.currentStock} units) is at or below the minimum threshold ({activeProduct.minStockAlert} units). Replenish immediately.
              </p>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-600 text-amber-200 text-xs">
            <strong>Fetch Error:</strong> {error}
          </div>
        )}

        {/* Product Profile Header Card */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-sky-400 px-2 py-0.5 bg-sky-950/80 rounded border border-sky-800">
                  {activeProduct.sku}
                </span>
                <Badge variant="purple">{activeProduct.category}</Badge>
              </div>
              <h3 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                <Boxes className="h-5 w-5 text-sky-400" />
                {activeProduct.name}
              </h3>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => product?.id && fetchMovements(product.id, movementPage)}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
              </Button>
              {canAdjustStock && (
                <Button variant="primary" onClick={() => setIsAdjustModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Adjust Stock
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
            <div>
              <p className="text-slate-400 text-[11px] uppercase font-semibold">Physical Stock</p>
              <p className={`text-base font-extrabold mt-0.5 ${isLowStock ? 'text-rose-400' : 'text-emerald-400'}`}>
                {activeProduct.currentStock} units
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-[11px] uppercase font-semibold">Min Alert Threshold</p>
              <p className="text-base font-bold text-slate-200 mt-0.5">{activeProduct.minStockAlert} units</p>
            </div>
            <div>
              <p className="text-slate-400 text-[11px] uppercase font-semibold">Unit List Price</p>
              <p className="text-base font-bold text-sky-400 mt-0.5">₹{activeProduct.unitPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[11px] uppercase font-semibold">Warehouse Location</p>
              <p className="text-xs font-bold text-slate-300 mt-1 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> {activeProduct.warehouseLocation}
              </p>
            </div>
          </div>
        </div>

        {/* Stock Movement Ledger Audit Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <History className="h-4 w-4 text-sky-400" />
              Append-Only Movement Audit Ledger ({pagination.total})
            </h4>
          </div>

          <Table
            columns={columns}
            data={movements}
            keyExtractor={(row) => row.id}
            isLoading={isLoading}
            emptyMessage={isLoading ? 'Loading movements...' : 'No stock movement records found for this product.'}
          />

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                Page <strong className="text-slate-200">{pagination.page}</strong> of{' '}
                <strong className="text-slate-200">{pagination.totalPages}</strong>
              </span>
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={movementPage <= 1}
                  onClick={() => setMovementPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={movementPage >= pagination.totalPages}
                  onClick={() => setMovementPage((p) => p + 1)}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && (
        <StockAdjustmentModal
          isOpen={isAdjustModalOpen}
          onClose={handleAdjustClose}
          product={activeProduct}
        />
      )}
    </Modal>
  );
};
