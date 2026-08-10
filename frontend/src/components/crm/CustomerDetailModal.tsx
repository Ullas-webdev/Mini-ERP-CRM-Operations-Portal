import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  Customer,
  useCustomerNotesQuery,
  useAddCustomerNoteMutation,
} from '../../api/customerApi';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Send,
  User,
  Clock,
  Lock,
} from 'lucide-react';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const { user } = useAuth();
  const canEditCRM = user?.role === 'ADMIN' || user?.role === 'SALES';

  const [newNote, setNewNote] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: notesData, isLoading: notesLoading } = useCustomerNotesQuery(customer?.id || null);
  const addNoteMutation = useAddCustomerNoteMutation();

  if (!customer) return null;

  const notes = notesData?.data || [];

  // Check if followUpDate is today or overdue
  const isFollowUpDue = () => {
    if (!customer.followUpDate) return false;
    const followDate = new Date(customer.followUpDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return followDate <= today;
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSubmitError(null);

    try {
      await addNoteMutation.mutateAsync({
        customerId: customer.id,
        note: newNote.trim(),
      });
      setNewNote('');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to post follow-up note';
      setSubmitError(msg);
    }
  };

  const statusVariants: Record<string, any> = {
    LEAD: 'warning',
    ACTIVE: 'success',
    INACTIVE: 'neutral',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Customer Profile & Activity Timeline — ${customer.businessName}`}
    >
      <div className="space-y-6">
        {/* Highlighted Overdue / Due Today Follow-Up Alert Banner */}
        {isFollowUpDue() && (
          <div className="p-4 rounded-xl bg-amber-950/80 border border-amber-600 text-amber-200 flex items-start space-x-3 shadow-lg animate-pulse">
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-amber-100 text-xs uppercase tracking-wider">
                ⚠️ Follow-Up Action Required
              </p>
              <p className="text-xs text-amber-200 mt-0.5">
                Scheduled follow-up date ({new Date(customer.followUpDate!).toLocaleDateString()}) is{' '}
                <strong className="text-amber-400">TODAY or OVERDUE</strong>. Contact this customer lead immediately.
              </p>
            </div>
          </div>
        )}

        {/* Customer Info Card Header */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-sky-400" />
                {customer.businessName}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> Primary Contact: <strong>{customer.name}</strong>
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Badge variant="purple">{customer.customerType}</Badge>
              <Badge variant={statusVariants[customer.status]}>{customer.status}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-xs">
            <div className="flex items-center text-slate-300">
              <Phone className="h-3.5 w-3.5 text-slate-400 mr-2" />
              <span>{customer.mobile}</span>
            </div>

            <div className="flex items-center text-slate-300">
              <Mail className="h-3.5 w-3.5 text-slate-400 mr-2" />
              <span>{customer.email}</span>
            </div>

            <div className="flex items-center text-slate-300">
              <span className="font-bold text-slate-400 mr-2">GSTIN:</span>
              <span className="font-mono text-sky-400">{customer.gstNumber || 'N/A (Unregistered)'}</span>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-400 flex items-start gap-2">
            <MapPin className="h-3.5 w-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
            <span>{customer.address}</span>
          </div>
        </div>

        {/* Note Activity Timeline Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4 text-sky-400" /> Activity Timeline & Follow-Up Notes ({notes.length})
            </h4>
          </div>

          {/* Quick Action: Add Follow-Up Note Form */}
          {canEditCRM ? (
            <form onSubmit={handleAddNote} className="space-y-2">
              {submitError && <p className="text-xs text-rose-400 font-medium">{submitError}</p>}
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  placeholder="Record a timestamped follow-up note or meeting summary..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="self-end py-3"
                  isLoading={addNoteMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-1" /> Post Note
                </Button>
              </div>
            </form>
          ) : (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <Lock className="h-4 w-4 text-slate-500" />
              <span>Your active role ({user?.role}) has <strong>Read-Only</strong> access to Customer CRM notes.</span>
            </div>
          )}

          {/* Notes Activity Feed */}
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {notesLoading ? (
              <p className="text-xs text-slate-400 italic">Loading activity timeline...</p>
            ) : notes.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 text-center rounded-xl bg-slate-950/40 border border-slate-800">
                No activity notes recorded yet for this customer profile.
              </p>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-200">{note.author.name}</span>
                      <Badge variant="purple" size="sm">{note.author.role}</Badge>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      {new Date(note.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{note.note}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
