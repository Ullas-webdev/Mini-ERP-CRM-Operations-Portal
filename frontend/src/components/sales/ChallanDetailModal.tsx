import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Table, Column } from '../common/Table';
import { axiosClient } from '../../api/axiosClient';
import toast from 'react-hot-toast';
import {
  SalesChallan,
  ChallanLineItem,
  useChallanDetailQuery,
  useConfirmChallanMutation,
  useCancelChallanMutation,
  StockShortageItem,
} from '../../api/challanApi';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Building2,
  Calendar,
  UserCheck,
  CheckCircle2,
  XCircle,
  Edit3,
  AlertOctagon,
  ShieldAlert,
  Download,
} from 'lucide-react';

interface ChallanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  challanId: string | null;
  onOpenEdit?: (challan: SalesChallan) => void;
}

export const ChallanDetailModal: React.FC<ChallanDetailModalProps> = ({
  isOpen,
  onClose,
  challanId,
  onOpenEdit,
}) => {
  const { user } = useAuth();
  const canManageChallan = user?.role === 'ADMIN' || user?.role === 'SALES';

  const { data, isLoading } = useChallanDetailQuery(challanId);
  const challan = data?.data;

  const [shortages, setShortages] = useState<StockShortageItem[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const confirmMutation = useConfirmChallanMutation();
  const cancelMutation = useCancelChallanMutation();

  if (!challanId) return null;

  const lineItems = challan?.lineItems || [];
  const grandTotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceSnapshot,
    0
  );

  const handleDownloadPdf = async () => {
    if (!challan) return;
    setIsDownloadingPdf(true);
    try {
      const response = await axiosClient.get(`/challans/${challan.id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${challan.challanNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`📄 Exported ${challan.challanNumber}.pdf`);
    } catch (err: any) {
      toast.error('❌ Failed to download Challan PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleConfirm = async () => {
    setServerError(null);
    setShortages([]);
    try {
      await confirmMutation.mutateAsync(challanId);
    } catch (err: any) {
      const errDetails = err.response?.data?.error;
      const msg = errDetails?.message || 'Failed to confirm Sales Challan';

      if (errDetails?.code === 'INSUFFICIENT_STOCK' && Array.isArray(errDetails?.details)) {
        setShortages(errDetails.details);
        setServerError('Confirmation rejected due to insufficient stock. No stock was deducted.');
      } else {
        setServerError(msg);
      }
    }
  };

  const handleCancel = async () => {
    setServerError(null);
    setShortages([]);
    try {
      await cancelMutation.mutateAsync(challanId);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to cancel Sales Challan';
      setServerError(msg);
    }
  };

  const columns: Column<ChallanLineItem>[] = [
    {
      header: 'Item Ref',
      cell: (row) => <span className="font-mono text-xs text-slate-400">#{row.id.slice(-6)}</span>,
    },
    {
      header: 'Product Title (Snapshot)',
      cell: (row) => (
        <div>
          <p className="font-bold text-xs text-slate-200">{row.productNameSnapshot}</p>
          {row.product?.sku && (
            <span className="font-mono text-[10px] text-sky-400">SKU: {row.product.sku}</span>
          )}
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
      header: 'Snapshot Unit Price',
      cell: (row) => (
        <span className="font-mono text-xs text-sky-400 font-semibold">
          ₹{row.unitPriceSnapshot.toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Line Subtotal',
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-emerald-400">
          ₹{(row.quantity * row.unitPriceSnapshot).toFixed(2)}
        </span>
      ),
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Sales Challan Detail Snapshot — ${challan?.challanNumber || 'Loading...'}`}
    >
      <div className="space-y-5">
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

        {/* Challan Overview Card */}
        {challan && (
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm font-extrabold text-sky-400 px-2.5 py-1 bg-sky-950 rounded border border-sky-800">
                    {challan.challanNumber}
                  </span>
                  <Badge
                    variant={
                      challan.status === 'CONFIRMED'
                        ? 'success'
                        : challan.status === 'DRAFT'
                        ? 'warning'
                        : 'neutral'
                    }
                  >
                    {challan.status}
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-white mt-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  {challan.customer?.businessName || 'Customer Account'}
                </h3>
              </div>

              <div className="text-right font-mono">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Grand Total</p>
                <p className="text-xl font-extrabold text-emerald-400 mt-0.5">₹{grandTotal.toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
              <div>
                <p className="text-slate-400 text-[11px] uppercase font-semibold">Contact Person</p>
                <p className="text-slate-200 font-bold mt-0.5">{challan.customer?.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">{challan.customer?.mobile}</p>
              </div>

              <div>
                <p className="text-slate-400 text-[11px] uppercase font-semibold">Created Date</p>
                <p className="text-slate-300 font-mono mt-0.5 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-slate-500" />
                  {new Date(challan.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-slate-400 text-[11px] uppercase font-semibold">Status / Fulfillment</p>
                <p className="text-slate-300 font-mono mt-0.5">
                  {challan.confirmedAt ? (
                    <span className="text-emerald-400 font-bold">
                      Confirmed {new Date(challan.confirmedAt).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-amber-400 italic">Pending Confirmation</span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-slate-400 text-[11px] uppercase font-semibold">Issued By</p>
                <p className="text-slate-300 font-bold mt-0.5 flex items-center gap-1">
                  <UserCheck className="h-3 w-3 text-slate-500" />
                  {challan.creator?.name || 'Sales Exec'} ({challan.creator?.role || 'SALES'})
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Snapshotted Line Items Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-4 w-4 text-sky-400" /> Snapshotted Line Items ({lineItems.length})
          </h4>

          <Table
            columns={columns}
            data={lineItems}
            keyExtractor={(row) => row.id}
            isLoading={isLoading}
          />
        </div>

        {/* Actions Footer */}
        {challan && (
          <div className="pt-4 flex justify-between items-center border-t border-slate-800">
            <div>
              <Button
                variant="outline"
                size="sm"
                isLoading={isDownloadingPdf}
                onClick={handleDownloadPdf}
              >
                <Download className="h-4 w-4 mr-1 text-sky-400" /> Export PDF
              </Button>
            </div>

            {canManageChallan && (
              <div className="flex space-x-2">
                {challan.status === 'DRAFT' && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        onClose();
                        if (onOpenEdit) onOpenEdit(challan);
                      }}
                    >
                      <Edit3 className="h-4 w-4 mr-1" /> Edit Draft
                    </Button>

                    <Button
                      variant="primary"
                      isLoading={confirmMutation.isPending}
                      onClick={handleConfirm}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm & Fulfill Stock
                    </Button>
                  </>
                )}

                {challan.status !== 'CANCELLED' && (
                  <Button
                    variant="danger"
                    isLoading={cancelMutation.isPending}
                    onClick={handleCancel}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    {challan.status === 'CONFIRMED' ? 'Cancel & Reverse Stock' : 'Cancel Challan'}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
