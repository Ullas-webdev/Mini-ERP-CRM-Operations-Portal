import React, { useState } from 'react';
import {
  useCustomerOrdersQuery,
  CustomerOrder,
  useCreateCustomerOrderMutation,
} from '../api/customerOrderApi';
import { useCustomersQuery } from '../api/customerApi';
import { useLocationsQuery } from '../api/locationApi';
import { useProductsQuery } from '../api/productApi';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Table, Column } from '../components/common/Table';
import { Badge, BadgeVariant } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { toast } from 'react-hot-toast';
import {
  ShoppingBag,
  Plus,
  Trash2,
  Lock,
  Building2,
  MapPin,
  ShieldAlert,
} from 'lucide-react';

interface OrderItemInput {
  productId: string;
  quantity: number;
}

export const CustomerOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const canCreateOrder = user?.role === 'ADMIN' || user?.role === 'SALES';

  const [selectedStatus, setSelectedStatus] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);

  // Form states
  const [customerId, setCustomerId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItemInput[]>([
    { productId: '', quantity: 10 },
  ]);

  const { data: customersData } = useCustomersQuery({});
  const { data: locationsData } = useLocationsQuery();
  const { data: productsData } = useProductsQuery({});
  const { data: ordersData, isLoading, isError } = useCustomerOrdersQuery({
    status: selectedStatus || undefined,
  });

  const createMutation = useCreateCustomerOrderMutation();

  const customers = customersData?.data?.customers || [];
  const locations = locationsData?.data?.locations || [];
  const products = productsData?.data?.products || [];
  const orders: CustomerOrder[] = ordersData?.data?.orders || [];

  const handleAddItemRow = () => {
    if (products.length === 0) return;
    setOrderItems([...orderItems, { productId: products[0].id, quantity: 1 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (orderItems.length === 1) {
      toast.error('Order must contain at least 1 item');
      return;
    }
    setOrderItems(orderItems.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderItemInput, value: any) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };
    setOrderItems(updated);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReservationError(null);

    if (!customerId || !locationId) {
      toast.error('Please select customer and fulfillment location');
      return;
    }

    if (orderItems.some((it) => !it.productId || it.quantity <= 0)) {
      toast.error('All order line items must have a selected product and positive quantity');
      return;
    }

    try {
      await createMutation.mutateAsync({
        customerId,
        locationId,
        items: orderItems,
      });
      toast.success('Customer Order created and inventory RESERVED successfully!');
      setIsAddModalOpen(false);
    } catch (err: any) {
      const errMsg =
        err.response?.data?.error?.message ||
        'Reservation failed: Cannot reserve inventory beyond available quantity';
      setReservationError(errMsg);
      toast.error(errMsg);
    }
  };

  const statusVariants: Record<string, BadgeVariant> = {
    PENDING: 'info',
    RESERVED: 'purple',
    FULFILLED: 'success',
    CANCELLED: 'neutral',
  };

  const columns: Column<CustomerOrder>[] = [
    {
      header: 'Order #',
      cell: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-sky-400">{row.orderNumber}</span>
          <p className="text-[10px] text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      header: 'Customer',
      cell: (row) => (
        <div>
          <p className="font-bold text-xs text-slate-100 flex items-center gap-1">
            <Building2 className="h-3 w-3 text-sky-400" /> {row.customer.businessName}
          </p>
          <span className="text-[10px] text-slate-400">{row.customer.name} ({row.customer.mobile})</span>
        </div>
      ),
    },
    {
      header: 'Fulfillment Location',
      cell: (row) => (
        <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
          <MapPin className="h-3 w-3 text-amber-400" /> {row.location.name} ({row.location.code})
        </span>
      ),
    },
    {
      header: 'Reserved Items',
      cell: (row) => (
        <div className="space-y-1">
          {row.items.map((item) => (
            <div key={item.id} className="text-xs font-mono text-slate-300">
              • {item.product.name} × <span className="font-bold text-sky-400">{item.quantity}</span> @ ₹{item.unitPriceSnapshot}
            </div>
          ))}
        </div>
      ),
    },
    {
      header: 'Total Value',
      cell: (row) => (
        <span className="font-mono text-xs font-extrabold text-emerald-400">
          ₹{row.totalAmount.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => (
        <div>
          <Badge variant={statusVariants[row.status]}>{row.status}</Badge>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">Stock Reserved</span>
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
            <ShoppingBag className="h-6 w-6 text-sky-400" /> Customer Orders & Stock Reservation
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time stock reservation engine: <span className="font-mono text-sky-300">Reserved Qty increases atomically inside transaction lock</span>
          </p>
        </div>

        {canCreateOrder ? (
          <Button
            variant="primary"
            onClick={() => {
              if (customers.length > 0) setCustomerId(customers[0].id);
              if (locations.length > 0) setLocationId(locations[0].id);
              if (products.length > 0) setOrderItems([{ productId: products[0].id, quantity: 10 }]);
              setReservationError(null);
              setIsAddModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Create Customer Order
          </Button>
        ) : (
          <span className="text-xs text-slate-400 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-slate-500" /> Sales Orders restricted to Sales Users & Admin
          </span>
        )}
      </div>

      {/* Filter Bar */}
      <Card title="Order Filters" subtitle="Filter by reservation status">
        <div className="max-w-xs space-y-1">
          <label className="block text-xs font-semibold text-slate-300">Order Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200"
          >
            <option value="">-- All Statuses --</option>
            <option value="RESERVED">RESERVED</option>
            <option value="PENDING">PENDING</option>
            <option value="FULFILLED">FULFILLED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card title="Customer Orders Directory" subtitle={`Showing ${orders.length} orders`}>
        <Table
          columns={columns}
          data={orders}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage={
            isError
              ? 'Failed to load customer orders from backend'
              : 'No customer orders found matching criteria'
          }
        />
      </Card>

      {/* Create Customer Order Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create Customer Order & Reserve Stock"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {reservationError && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start space-x-3">
              <ShieldAlert className="h-5 w-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-bold text-rose-200">Stock Reservation Failure</p>
                <p className="mt-1 leading-relaxed">{reservationError}</p>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">Select Customer *</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200"
            >
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.businessName} — {c.name} ({c.mobile})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">Fulfillment Warehouse Location *</label>
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

          {/* Line Items */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Order Items</span>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItemRow}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Line Item
              </Button>
            </div>

            {orderItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex-1">
                  <select
                    value={item.productId}
                    onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-xs text-slate-200"
                  >
                    {products.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        [{p.sku}] {p.name} (₹{p.unitPrice})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-24">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-xs text-slate-200 text-center font-mono"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveItemRow(idx)}
                  className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end space-x-3">
            <Button variant="secondary" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending}>
              Create Order & Reserve Inventory
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
