import React, { useState } from 'react';
import { useCustomersQuery, Customer, CustomersFilters } from '../api/customerApi';
import {
  useChallansQuery,
  SalesChallan,
  ChallansFilters,
} from '../api/challanApi';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Table, Column } from '../components/common/Table';
import { Badge, BadgeVariant } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { CustomerFormModal } from '../components/crm/CustomerFormModal';
import { CustomerDetailModal } from '../components/crm/CustomerDetailModal';
import { ChallanFormModal } from '../components/sales/ChallanFormModal';
import { ChallanDetailModal } from '../components/sales/ChallanDetailModal';
import {
  Plus,
  Building2,
  Phone,
  Eye,
  Edit2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Lock,
  FileCheck,
  ShoppingBag,
} from 'lucide-react';

export const SalesPage: React.FC = () => {
  const { user } = useAuth();
  const canEditCRM = user?.role === 'ADMIN' || user?.role === 'SALES';

  const [activeTab, setActiveTab] = useState<'crm' | 'challans'>('challans');

  // --- CRM Directory State ---
  const [crmFilters, setCrmFilters] = useState<CustomersFilters>({
    page: 1,
    limit: 10,
    search: '',
    status: '',
    customerType: '',
  });

  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerDetailOpen, setIsCustomerDetailOpen] = useState(false);

  const { data: customerData, isLoading: crmLoading } = useCustomersQuery(crmFilters);
  const customers = customerData?.data?.customers || [];
  const crmPagination = customerData?.data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

  // --- Sales Challans Register State ---
  const [challanFilters, setChallanFilters] = useState<ChallansFilters>({
    page: 1,
    limit: 10,
    search: '',
    status: '',
  });

  const [isChallanFormOpen, setIsChallanFormOpen] = useState(false);
  const [challanToEdit, setChallanToEdit] = useState<SalesChallan | null>(null);
  const [selectedChallanId, setSelectedChallanId] = useState<string | null>(null);
  const [isChallanDetailOpen, setIsChallanDetailOpen] = useState(false);

  const { data: challanData, isLoading: challansLoading } = useChallansQuery(challanFilters);
  const challans = challanData?.data?.challans || [];
  const challanPagination = challanData?.data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

  // --- CRM Actions ---
  const handleOpenAddCustomer = () => {
    setCustomerToEdit(null);
    setIsCustomerFormOpen(true);
  };

  const handleOpenEditCustomer = (c: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomerToEdit(c);
    setIsCustomerFormOpen(true);
  };

  const handleOpenCustomerDetail = (c: Customer) => {
    setSelectedCustomer(c);
    setIsCustomerDetailOpen(true);
  };

  // --- Challan Actions ---
  const handleOpenAddChallan = () => {
    setChallanToEdit(null);
    setIsChallanFormOpen(true);
  };

  const handleOpenEditChallan = (c: SalesChallan) => {
    setChallanToEdit(c);
    setIsChallanFormOpen(true);
  };

  const handleOpenChallanDetail = (c: SalesChallan) => {
    setSelectedChallanId(c.id);
    setIsChallanDetailOpen(true);
  };

  const crmStatusVariants: Record<string, BadgeVariant> = {
    LEAD: 'warning',
    ACTIVE: 'success',
    INACTIVE: 'neutral',
  };

  const challanStatusVariants: Record<string, BadgeVariant> = {
    DRAFT: 'warning',
    CONFIRMED: 'success',
    CANCELLED: 'neutral',
  };

  const isFollowUpDue = (followUpDateStr: string | null) => {
    if (!followUpDateStr) return false;
    const followDate = new Date(followUpDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return followDate <= today;
  };

  const crmColumns: Column<Customer>[] = [
    {
      header: 'Business Name',
      cell: (row) => (
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-200 text-xs">{row.businessName}</span>
            {isFollowUpDue(row.followUpDate) && (
              <span title="Follow-up Overdue / Due Today">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Contact: {row.name}</p>
        </div>
      ),
    },
    {
      header: 'Contact Info',
      cell: (row) => (
        <div>
          <p className="text-xs text-slate-300 flex items-center gap-1">
            <Phone className="h-3 w-3 text-slate-500" /> {row.mobile}
          </p>
          <p className="text-[11px] text-slate-400">{row.email}</p>
        </div>
      ),
    },
    {
      header: 'Type',
      cell: (row) => <Badge variant="purple">{row.customerType}</Badge>,
    },
    {
      header: 'Status',
      cell: (row) => <Badge variant={crmStatusVariants[row.status]}>{row.status}</Badge>,
    },
    {
      header: 'GSTIN',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-400">{row.gstNumber || 'N/A'}</span>
      ),
    },
    {
      header: 'Notes Count',
      cell: (row) => (
        <span className="text-xs font-bold text-sky-400">{row._count?.notes || 0} notes</span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenCustomerDetail(row)}
          >
            <Eye className="h-3.5 w-3.5 mr-1" /> Profile
          </Button>

          {canEditCRM && (
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => handleOpenEditCustomer(row, e)}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const challanColumns: Column<SalesChallan>[] = [
    {
      header: 'Challan Number',
      cell: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-sky-400 px-2 py-0.5 bg-sky-950/80 rounded border border-sky-800">
            {row.challanNumber}
          </span>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {new Date(row.createdAt).toLocaleDateString()}
          </p>
        </div>
      ),
    },
    {
      header: 'Customer Account',
      cell: (row) => (
        <div>
          <p className="font-bold text-xs text-slate-200">{row.customer?.businessName}</p>
          <p className="text-[10px] text-slate-400">Attn: {row.customer?.name}</p>
        </div>
      ),
    },
    {
      header: 'Total Quantity',
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-slate-200">
          {row.totalQuantity} units ({row.lineItems?.length || 0} items)
        </span>
      ),
    },
    {
      header: 'Estimated Value',
      cell: (row) => {
        const estVal = row.lineItems?.reduce(
          (sum, item) => sum + item.quantity * item.unitPriceSnapshot,
          0
        ) || 0;
        return (
          <span className="font-mono text-xs font-extrabold text-emerald-400">
            ₹{estVal.toFixed(2)}
          </span>
        );
      },
    },
    {
      header: 'Status',
      cell: (row) => (
        <Badge variant={challanStatusVariants[row.status] || 'neutral'}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Fulfillment Date',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-400">
          {row.confirmedAt ? new Date(row.confirmedAt).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOpenChallanDetail(row)}
        >
          <Eye className="h-3.5 w-3.5 mr-1" /> View Snapshot
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title Header & Main Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-sky-400" /> Commercial Sales & Fulfillment Portal
          </h2>
          <p className="text-sm text-slate-400">
            Manage customer CRM pipelines and issue stock-fulfillment Sales Delivery Challans
          </p>
        </div>

        {canEditCRM ? (
          <div className="flex space-x-2">
            {activeTab === 'crm' ? (
              <Button variant="primary" onClick={handleOpenAddCustomer}>
                <Plus className="h-4 w-4 mr-1.5" /> Add Customer Lead
              </Button>
            ) : (
              <Button variant="primary" onClick={handleOpenAddChallan}>
                <Plus className="h-4 w-4 mr-1.5" /> Create Sales Challan
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center text-xs text-slate-400 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
            <Lock className="h-4 w-4 text-slate-500 mr-2" />
            <span>Role ({user?.role}) has Read-Only permissions</span>
          </div>
        )}
      </div>

      {/* Navigation Tab Pills */}
      <div className="flex space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('challans')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'challans'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-950/50'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <FileCheck className="h-4 w-4" />
          <span>Sales Delivery Challans Register</span>
        </button>

        <button
          onClick={() => setActiveTab('crm')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'crm'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-950/50'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Customer Directory & Activity CRM</span>
        </button>
      </div>

      {/* TAB 1: SALES DELIVERY CHALLANS */}
      {activeTab === 'challans' && (
        <div className="space-y-6">
          <Card title="Sales Challans Register Controls" subtitle="Search challan number or customer name, and filter by status">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <Input
                label="Search Keywords"
                placeholder="e.g. CH-2026-0001, Apex, Menon"
                value={challanFilters.search || ''}
                onChange={(e) => setChallanFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
              />

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">Filter by Challan Status</label>
                <div className="flex space-x-2">
                  {['', 'DRAFT', 'CONFIRMED', 'CANCELLED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setChallanFilters((prev) => ({ ...prev, status: st, page: 1 }))}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        (challanFilters.status || '') === st
                          ? 'bg-sky-950 border border-sky-500 text-sky-300'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {st === '' ? 'ALL' : st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Sales Delivery Challans Register" subtitle={`Showing ${challans.length} of ${challanPagination.total} delivery orders`}>
            <Table
              columns={challanColumns}
              data={challans}
              keyExtractor={(row) => row.id}
              isLoading={challansLoading}
              onRowClick={(row) => handleOpenChallanDetail(row)}
            />

            {/* Pagination Controls */}
            <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                Page <strong className="text-slate-200">{challanPagination.page}</strong> of <strong className="text-slate-200">{challanPagination.totalPages}</strong>
              </span>
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={challanPagination.page <= 1}
                  onClick={() => setChallanFilters((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={challanPagination.page >= challanPagination.totalPages}
                  onClick={() => setChallanFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: CUSTOMER CRM DIRECTORY */}
      {activeTab === 'crm' && (
        <div className="space-y-6">
          <Card title="Filter CRM Directory" subtitle="Search accounts by name, mobile, business name, or email">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Search Keywords"
                placeholder="e.g. Apex, +919876, Rajesh"
                value={crmFilters.search || ''}
                onChange={(e) => setCrmFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
              />

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">Filter by Lead Status</label>
                <select
                  value={crmFilters.status || ''}
                  onChange={(e) => setCrmFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                >
                  <option value="">All Statuses</option>
                  <option value="LEAD">LEAD (Pipeline)</option>
                  <option value="ACTIVE">ACTIVE (Verified Customer)</option>
                  <option value="INACTIVE">INACTIVE (Dormant)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">Filter by Customer Category</label>
                <select
                  value={crmFilters.customerType || ''}
                  onChange={(e) => setCrmFilters((prev) => ({ ...prev, customerType: e.target.value, page: 1 }))}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                >
                  <option value="">All Categories</option>
                  <option value="RETAIL">RETAIL</option>
                  <option value="WHOLESALE">WHOLESALE</option>
                  <option value="DISTRIBUTOR">DISTRIBUTOR</option>
                </select>
              </div>
            </div>
          </Card>

          <Card title="Client Directory" subtitle={`Showing ${customers.length} of ${crmPagination.total} customer accounts`}>
            <Table
              columns={crmColumns}
              data={customers}
              keyExtractor={(row) => row.id}
              isLoading={crmLoading}
              onRowClick={(row) => handleOpenCustomerDetail(row)}
            />

            {/* Pagination Controls */}
            <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                Page <strong className="text-slate-200">{crmPagination.page}</strong> of <strong className="text-slate-200">{crmPagination.totalPages}</strong>
              </span>
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={crmPagination.page <= 1}
                  onClick={() => setCrmFilters((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={crmPagination.page >= crmPagination.totalPages}
                  onClick={() => setCrmFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* --- Modals --- */}
      {isCustomerFormOpen && (
        <CustomerFormModal
          isOpen={isCustomerFormOpen}
          onClose={() => setIsCustomerFormOpen(false)}
          customerToEdit={customerToEdit}
        />
      )}

      {isCustomerDetailOpen && (
        <CustomerDetailModal
          isOpen={isCustomerDetailOpen}
          onClose={() => setIsCustomerDetailOpen(false)}
          customer={selectedCustomer}
        />
      )}

      {isChallanFormOpen && (
        <ChallanFormModal
          isOpen={isChallanFormOpen}
          onClose={() => setIsChallanFormOpen(false)}
          challanToEdit={challanToEdit}
        />
      )}

      {isChallanDetailOpen && (
        <ChallanDetailModal
          isOpen={isChallanDetailOpen}
          onClose={() => setIsChallanDetailOpen(false)}
          challanId={selectedChallanId}
          onOpenEdit={handleOpenEditChallan}
        />
      )}
    </div>
  );
};
