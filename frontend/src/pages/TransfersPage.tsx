import React, { useState } from 'react';
import {
  useTransfersQuery,
  StockTransfer,
  useCreateTransferMutation,
  useDispatchTransferMutation,
  useReceiveTransferMutation,
} from '../api/transferApi';
import { useLocationsQuery } from '../api/locationApi';
import { useProductsQuery } from '../api/productApi';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Table, Column } from '../components/common/Table';
import { Badge, BadgeVariant } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftRight,
  Plus,
  Send,
  CheckCircle2,
  MapPin,
  Info,
} from 'lucide-react';

export const TransfersPage: React.FC = () => {
  const { user } = useAuth();
  const canManageTransfers = user?.role === 'ADMIN' || user?.role === 'OPERATIONS';

  const [selectedStatus, setSelectedStatus] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(20);

  const { data: locationsData } = useLocationsQuery();
  const { data: productsData } = useProductsQuery({});
  const { data: transfersData, isLoading, isError } = useTransfersQuery({
    status: selectedStatus || undefined,
  });

  const createMutation = useCreateTransferMutation();
  const dispatchMutation = useDispatchTransferMutation();
  const receiveMutation = useReceiveTransferMutation();

  const locations = locationsData?.data?.locations || [];
  const products = productsData?.data?.products || [];
  const transfers: StockTransfer[] = transfersData?.data?.transfers || [];

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceLocationId || !destinationLocationId || !productId) {
      toast.error('Please select source, destination, and product');
      return;
    }
    if (sourceLocationId === destinationLocationId) {
      toast.error('Source and Destination locations must be different');
      return;
    }

    try {
      await createMutation.mutateAsync({
        sourceLocationId,
        destinationLocationId,
        productId,
        quantity,
      });
      toast.success('Stock Transfer requested successfully!');
      setIsAddModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to request transfer');
    }
  };

  const handleDispatch = async (transferId: string, transferNumber: string) => {
    try {
      await dispatchMutation.mutateAsync(transferId);
      toast.success(`Transfer #${transferNumber} Dispatched! Source inventory reduced.`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Dispatch failed');
    }
  };

  const handleReceive = async (transferId: string, transferNumber: string) => {
    try {
      await receiveMutation.mutateAsync(transferId);
      toast.success(`Transfer #${transferNumber} Received! Destination inventory updated.`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Receipt failed');
    }
  };

  const statusVariants: Record<string, BadgeVariant> = {
    REQUESTED: 'info',
    DISPATCHED: 'warning',
    RECEIVED: 'success',
  };

  const columns: Column<StockTransfer>[] = [
    {
      header: 'Transfer ID',
      cell: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-sky-400">{row.transferNumber}</span>
          <p className="text-[10px] text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      header: 'Source Location',
      cell: (row) => (
        <span className="text-xs text-rose-300 font-medium flex items-center gap-1">
          <MapPin className="h-3 w-3 text-rose-400" /> {row.sourceLocation.name} ({row.sourceLocation.code})
        </span>
      ),
    },
    {
      header: 'Destination Location',
      cell: (row) => (
        <span className="text-xs text-emerald-300 font-medium flex items-center gap-1">
          <MapPin className="h-3 w-3 text-emerald-400" /> {row.destinationLocation.name} ({row.destinationLocation.code})
        </span>
      ),
    },
    {
      header: 'Item & SKU',
      cell: (row) => (
        <div>
          <p className="font-bold text-xs text-slate-100">{row.product.name}</p>
          <span className="font-mono text-[10px] text-slate-400">SKU: {row.product.sku}</span>
        </div>
      ),
    },
    {
      header: 'Quantity',
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-slate-200">{row.quantity} units</span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => <Badge variant={statusVariants[row.status]}>{row.status}</Badge>,
    },
    {
      header: 'Transfer Lifecycle Actions',
      cell: (row) => (
        <div className="flex items-center space-x-2">
          {row.status === 'REQUESTED' && canManageTransfers && (
            <Button
              variant="outline"
              size="sm"
              isLoading={dispatchMutation.isPending}
              onClick={() => handleDispatch(row.id, row.transferNumber)}
            >
              <Send className="h-3.5 w-3.5 mr-1 text-amber-400" /> Dispatch
            </Button>
          )}

          {row.status === 'DISPATCHED' && canManageTransfers && (
            <Button
              variant="primary"
              size="sm"
              isLoading={receiveMutation.isPending}
              onClick={() => handleReceive(row.id, row.transferNumber)}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Confirm Receipt
            </Button>
          )}

          {row.status === 'RECEIVED' && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Transfer Closed
            </span>
          )}

          {!canManageTransfers && row.status !== 'RECEIVED' && (
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
            <ArrowLeftRight className="h-6 w-6 text-sky-400" /> Internal Stock Transfers
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Inter-warehouse stock movement state machine with inventory isolation
          </p>
        </div>

        {canManageTransfers ? (
          <Button
            variant="primary"
            onClick={() => {
              if (products.length > 0) setProductId(products[0].id);
              if (locations.length >= 2) {
                setSourceLocationId(locations[0].id);
                setDestinationLocationId(locations[1].id);
              }
              setIsAddModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Request Stock Transfer
          </Button>
        ) : (
          <span className="text-xs text-slate-400 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
            Transfer requests restricted to Admin & Operations
          </span>
        )}
      </div>

      {/* Rules Banner */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center space-x-3 text-sky-300">
          <Info className="h-5 w-5 text-sky-400 flex-shrink-0" />
          <div>
            <p className="font-bold text-slate-200">Stock Transfer Isolation Rules:</p>
            <p className="text-slate-400 mt-0.5">
              1. <span className="text-amber-300 font-semibold">DISPATCH</span> reduces source physical stock immediately. Destination stock does NOT increase yet.
              <br />
              2. <span className="text-emerald-300 font-semibold">RECEIVE</span> increases destination physical stock. Double-receive is strictly prevented by the backend.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <Card title="Transfer Filters" subtitle="Filter by transfer status">
        <div className="max-w-xs space-y-1">
          <label className="block text-xs font-semibold text-slate-300">Transfer Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200"
          >
            <option value="">-- All Statuses --</option>
            <option value="REQUESTED">REQUESTED</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="RECEIVED">RECEIVED</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card title="Stock Transfers Log" subtitle={`Showing ${transfers.length} transfer records`}>
        <Table
          columns={columns}
          data={transfers}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage={
            isError
              ? 'Failed to load stock transfers from backend'
              : 'No stock transfers found matching criteria'
          }
        />
      </Card>

      {/* Request Stock Transfer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Request Internal Stock Transfer"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">Source Warehouse Location *</label>
            <select
              value={sourceLocationId}
              onChange={(e) => setSourceLocationId(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200"
            >
              {locations.map((loc: any) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">Destination Warehouse Location *</label>
            <select
              value={destinationLocationId}
              onChange={(e) => setDestinationLocationId(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200"
            >
              {locations.map((loc: any) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">Item / Product *</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200"
            >
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>
                  [{p.sku}] {p.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Transfer Quantity *"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
            required
          />

          <div className="pt-3 border-t border-slate-800 flex justify-end space-x-3">
            <Button variant="secondary" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending}>
              Request Stock Transfer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
