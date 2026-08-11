import React, { useState } from 'react';
import { useChallansQuery, SalesChallan } from '../api/challanApi';
import { Card } from '../components/common/Card';
import { Badge, BadgeVariant } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Table, Column } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { axiosClient } from '../api/axiosClient';
import { toast } from 'react-hot-toast';
import {
  CreditCard,
  FileText,
  Receipt,
  Plus,
  Download,
  FileCheck,
} from 'lucide-react';

export const AccountsPage: React.FC = () => {
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedChallanId, setSelectedChallanId] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useChallansQuery({ page: 1, limit: 50 });
  const challans = data?.data?.challans || [];

  const confirmedChallans = challans.filter((c) => c.status === 'CONFIRMED');
  const totalRevenue = confirmedChallans.reduce((sum, c) => {
    const challanTotal = (c.lineItems || []).reduce(
      (s, li) => s + li.quantity * li.unitPriceSnapshot,
      0
    );
    return sum + challanTotal;
  }, 0);

  const statusVariants: Record<string, BadgeVariant> = {
    DRAFT: 'warning',
    CONFIRMED: 'success',
    CANCELLED: 'neutral',
  };

  const handleDownloadInvoicePdf = async (challan: SalesChallan) => {
    setIsDownloading((prev) => ({ ...prev, [challan.id]: true }));
    try {
      const response = await axiosClient.get(`/challans/${challan.id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${challan.challanNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`📄 Invoice exported: Invoice-${challan.challanNumber}.pdf`);
      setIsInvoiceModalOpen(false);
    } catch (err: any) {
      toast.error('❌ Failed to generate Invoice PDF');
    } finally {
      setIsDownloading((prev) => ({ ...prev, [challan.id]: false }));
    }
  };

  const handleModalGenerate = () => {
    const target = challans.find((c) => c.id === selectedChallanId);
    if (target) {
      handleDownloadInvoicePdf(target);
    } else {
      toast.error('Please select a valid order/challan to generate invoice');
    }
  };

  const columns: Column<SalesChallan>[] = [
    {
      header: 'Invoice / Challan #',
      cell: (row) => (
        <div>
          <span className="font-bold font-mono text-sky-400 text-xs">{row.challanNumber}</span>
          <p className="text-[10px] text-slate-400">
            {new Date(row.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
      ),
    },
    {
      header: 'Customer Enterprise',
      cell: (row) => (
        <div>
          <p className="font-bold text-xs text-slate-200">{row.customer?.businessName || 'N/A'}</p>
          <p className="text-[11px] text-slate-400">Contact: {row.customer?.name}</p>
        </div>
      ),
    },
    {
      header: 'Total Quantity',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-300 font-semibold">
          {row.totalQuantity} units ({row.lineItems?.length || 0} items)
        </span>
      ),
    },
    {
      header: 'Invoice Amount',
      cell: (row) => {
        const estVal = (row.lineItems || []).reduce(
          (sum, item) => sum + item.quantity * item.unitPriceSnapshot,
          0
        );
        return (
          <span className="font-mono text-xs font-bold text-emerald-400">
            ₹{estVal.toFixed(2)}
          </span>
        );
      },
    },
    {
      header: 'Status',
      cell: (row) => (
        <Badge variant={statusVariants[row.status] || 'neutral'}>{row.status}</Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <Button
          variant="primary"
          size="sm"
          isLoading={!!isDownloading[row.id]}
          onClick={() => handleDownloadInvoicePdf(row)}
        >
          <Download className="h-3.5 w-3.5 mr-1" /> Download Invoice PDF
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-emerald-400" /> Accounts & Billing Ledger
            </h2>
            <Badge variant="success">Protected: Admin, Accounts</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Financial auditing, invoicing, and GST billing documentation portal
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            if (challans.length > 0) setSelectedChallanId(challans[0].id);
            setIsInvoiceModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Generate Invoice PDF
        </Button>
      </div>

      {/* Financial Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Confirmed Revenue</p>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">
                ₹{totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Total Delivery Orders</p>
              <p className="text-2xl font-extrabold text-white mt-1">{challans.length}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-sky-950/80 border border-sky-800/50 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-sky-400" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Fulfillments Processed</p>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">
                {confirmedChallans.length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-950/80 border border-purple-800/50 flex items-center justify-center">
              <FileText className="h-5 w-5 text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Dynamic Accounts Invoicing Directory Table */}
      <Card
        title="Billing Invoices & Sales Orders Register"
        subtitle={`Showing ${challans.length} accounts transactions ready for invoice export`}
      >
        <Table
          columns={columns}
          data={challans}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage="No billing invoices found. Create sales delivery orders to process invoices."
        />
      </Card>

      {/* Generate Invoice Modal */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="Generate Official Commercial Billing Invoice PDF"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-sky-950/60 border border-sky-800/60 text-sky-300 text-xs flex items-start gap-2.5">
            <FileCheck className="h-5 w-5 text-sky-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sky-200">System-Generated Commercial Invoice</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-sky-300/90">
                Select an order/challan number below to instantly compile a formatted PDF billing invoice including line item price snapshots, GST details, and customer information.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Select Delivery Order / Challan *
            </label>
            <select
              value={selectedChallanId}
              onChange={(e) => setSelectedChallanId(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            >
              <option value="">-- Choose Order to Export --</option>
              {challans.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.challanNumber}] {c.customer?.businessName} — Status: {c.status} ({c.totalQuantity} units)
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsInvoiceModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleModalGenerate}
              isLoading={!!isDownloading[selectedChallanId]}
            >
              <Download className="h-4 w-4 mr-1.5" /> Export & Download Invoice PDF
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

