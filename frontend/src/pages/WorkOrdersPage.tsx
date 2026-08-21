import React, { useState } from 'react';
import {
  useWorkOrdersQuery,
  WorkOrder,
  useCreateWorkOrderMutation,
  useUpdateWorkOrderStatusMutation,
} from '../api/workOrderApi';
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
  ClipboardList,
  Plus,
  AlertTriangle,
  CheckCircle2,
  User,
  MapPin,
} from 'lucide-react';

export const WorkOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for creating Work Order
  const [locationId, setLocationId] = useState('');
  const [productId, setProductId] = useState('');
  const [requiredQuantity, setRequiredQuantity] = useState(50);
  const [assignedUserId] = useState(user?.id || '');

  const { data: locationsData } = useLocationsQuery();
  const { data: productsData } = useProductsQuery({});
  const { data: workOrdersData, isLoading, isError } = useWorkOrdersQuery({
    locationId: selectedLocationId || undefined,
    status: selectedStatus || undefined,
  });

  const createMutation = useCreateWorkOrderMutation();
  const updateStatusMutation = useUpdateWorkOrderStatusMutation();

  const locations = locationsData?.data?.locations || [];
  const products = productsData?.data?.products || [];
  const workOrders: WorkOrder[] = workOrdersData?.data?.workOrders || [];

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId || !productId) {
      toast.error('Please select location and product');
      return;
    }
    try {
      await createMutation.mutateAsync({
        locationId,
        productId,
        requiredQuantity,
        assignedUserId: assignedUserId || user!.id,
      });
      toast.success('Work Order created successfully!');
      setIsAddModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create Work Order');
    }
  };

  const handleStatusChange = async (workOrderId: string, newStatus: any) => {
    try {
      await updateStatusMutation.mutateAsync({ id: workOrderId, status: newStatus });
      toast.success(`Work Order status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update status');
    }
  };

  const statusVariants: Record<string, BadgeVariant> = {
    ASSIGNED: 'info',
    IN_PROGRESS: 'warning',
    COMPLETED: 'success',
  };

  const columns: Column<WorkOrder>[] = [
    {
      header: 'Work Order ID',
      cell: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-sky-400">{row.workOrderNumber}</span>
          <p className="text-[10px] text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</p>
        </div>
      ),
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
      header: 'Item & SKU',
      cell: (row) => (
        <div>
          <p className="font-bold text-xs text-slate-100">{row.product.name}</p>
          <span className="font-mono text-[10px] text-slate-400">SKU: {row.product.sku}</span>
        </div>
      ),
    },
    {
      header: 'Required Qty',
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-slate-200">{row.requiredQuantity} units</span>
      ),
    },
    {
      header: 'Shortage (Auto-Calculated)',
      cell: (row) => (
        <div>
          {row.shortage > 0 ? (
            <div className="p-1.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-bold flex items-center space-x-1">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
              <span>Shortage: {row.shortage} units</span>
            </div>
          ) : (
            <div className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-bold flex items-center space-x-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
              <span>Full Stock Available</span>
            </div>
          )}
          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
            Available at Loc: {row.availableQuantityAtLocation}
          </span>
        </div>
      ),
    },
    {
      header: 'Assigned Worker',
      cell: (row) => (
        <span className="text-xs text-slate-300 flex items-center gap-1">
          <User className="h-3 w-3 text-sky-400" /> {row.assignedUser?.name || 'Unassigned'}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => (
        <div className="flex items-center space-x-2">
          <Badge variant={statusVariants[row.status]}>{row.status}</Badge>

          <select
            value={row.status}
            onChange={(e) => handleStatusChange(row.id, e.target.value)}
            className="rounded-lg bg-slate-950 border border-slate-800 p-1 text-[11px] text-slate-300 focus:outline-none"
          >
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
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
            <ClipboardList className="h-6 w-6 text-sky-400" /> Work Orders & Material Planning
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Automatic shortage engine: <span className="font-mono text-sky-300">Shortage = Max(0, Required Quantity - Available Stock at Location)</span>
          </p>
        </div>

        {isAdmin ? (
          <Button
            variant="primary"
            onClick={() => {
              if (products.length > 0) setProductId(products[0].id);
              if (locations.length > 0) setLocationId(locations[0].id);
              setIsAddModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Create Work Order
          </Button>
        ) : (
          <span className="text-xs text-slate-400 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
            Work Order creation restricted to Admin
          </span>
        )}
      </div>

      {/* Filter Bar */}
      <Card title="Work Order Filters" subtitle="Filter by location or status">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">Location</label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200"
            >
              <option value="">-- All Locations --</option>
              {locations.map((loc: any) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200"
            >
              <option value="">-- All Statuses --</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card title="Work Orders Queue" subtitle={`Showing ${workOrders.length} work orders`}>
        <Table
          columns={columns}
          data={workOrders}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage={
            isError
              ? 'Failed to fetch Work Orders from backend'
              : 'No Work Orders found matching criteria'
          }
        />
      </Card>

      {/* Create Work Order Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create Production Work Order"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">Target Location *</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
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
            <label className="block text-xs font-semibold text-slate-300">Required Item / Product *</label>
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
            label="Required Quantity *"
            type="number"
            min="1"
            value={requiredQuantity}
            onChange={(e) => setRequiredQuantity(parseInt(e.target.value, 10) || 1)}
            required
          />

          <div className="pt-3 border-t border-slate-800 flex justify-end space-x-3">
            <Button variant="secondary" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending}>
              Create Work Order
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
