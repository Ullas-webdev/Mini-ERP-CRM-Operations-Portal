import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import {
  Customer,
  CustomerType,
  CustomerStatus,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
} from '../../api/customerApi';
import { AlertCircle } from 'lucide-react';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
}

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const MOBILE_REGEX = /^\+?[0-9]{10,15}$/;

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  customerToEdit,
}) => {
  const isEditing = !!customerToEdit;

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('RETAIL');
  const [status, setStatus] = useState<CustomerStatus>('LEAD');
  const [address, setAddress] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = useCreateCustomerMutation();
  const updateMutation = useUpdateCustomerMutation();

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name || '');
      setMobile(customerToEdit.mobile || '');
      setEmail(customerToEdit.email || '');
      setBusinessName(customerToEdit.businessName || '');
      setGstNumber(customerToEdit.gstNumber || '');
      setCustomerType(customerToEdit.customerType || 'RETAIL');
      setStatus(customerToEdit.status || 'LEAD');
      setAddress(customerToEdit.address || '');
      setFollowUpDate(
        customerToEdit.followUpDate
          ? new Date(customerToEdit.followUpDate).toISOString().split('T')[0]
          : ''
      );
    } else {
      setName('');
      setMobile('');
      setEmail('');
      setBusinessName('');
      setGstNumber('');
      setCustomerType('RETAIL');
      setStatus('LEAD');
      setAddress('');
      setFollowUpDate('');
    }
    setErrors({});
    setServerError(null);
  }, [customerToEdit, isOpen]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim() || name.length < 2) errs.name = 'Customer name must be at least 2 characters';
    if (!mobile.trim() || !MOBILE_REGEX.test(mobile)) {
      errs.mobile = 'Enter a valid 10 to 15 digit mobile number (e.g. +919876543210)';
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email address';
    if (!businessName.trim() || businessName.length < 2) errs.businessName = 'Business name is required';
    if (!address.trim() || address.length < 5) errs.address = 'Detailed address is required';

    if (gstNumber.trim()) {
      const formattedGst = gstNumber.trim().toUpperCase();
      if (!GSTIN_REGEX.test(formattedGst)) {
        errs.gstNumber = 'Invalid 15-character GSTIN format (e.g. 27AAAAA0000A1Z5)';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    const payload = {
      name: name.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      businessName: businessName.trim(),
      gstNumber: gstNumber.trim() ? gstNumber.trim().toUpperCase() : null,
      customerType,
      status,
      address: address.trim(),
      followUpDate: followUpDate ? followUpDate : null,
    };

    try {
      if (isEditing && customerToEdit) {
        await updateMutation.mutateAsync({ id: customerToEdit.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to save customer details';
      setServerError(msg);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Customer — ${customerToEdit?.businessName}` : 'Add New Customer Lead'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Contact Person Name *"
            placeholder="e.g. Rajesh Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            required
          />

          <Input
            label="Business / Enterprise Name *"
            placeholder="e.g. Apex Retailers Pvt Ltd"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            error={errors.businessName}
            required
          />

          <Input
            label="Mobile Number *"
            placeholder="e.g. +919876543210"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            error={errors.mobile}
            required
          />

          <Input
            label="Work Email *"
            type="email"
            placeholder="e.g. rajesh@apexretailers.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            required
          />

          <Input
            label="GSTIN Number (Optional)"
            placeholder="e.g. 27AAAAA0000A1Z5"
            value={gstNumber}
            onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
            error={errors.gstNumber}
          />

          <Input
            label="Follow-Up Target Date (Optional)"
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
          />

          {/* Customer Type Dropdown */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">Customer Category *</label>
            <select
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value as CustomerType)}
              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            >
              <option value="RETAIL">RETAIL</option>
              <option value="WHOLESALE">WHOLESALE</option>
              <option value="DISTRIBUTOR">DISTRIBUTOR</option>
            </select>
          </div>

          {/* Customer Status Dropdown */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">Lead Status *</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CustomerStatus)}
              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            >
              <option value="LEAD">LEAD (Pipeline)</option>
              <option value="ACTIVE">ACTIVE (Verified Customer)</option>
              <option value="INACTIVE">INACTIVE (Dormant)</option>
            </select>
          </div>
        </div>

        <Input
          label="Registered Business Address *"
          placeholder="e.g. 102 Industrial Estate, Andheri East, Mumbai 400069"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          error={errors.address}
          required
        />

        <div className="pt-4 flex justify-end space-x-3 border-t border-slate-800">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            {isEditing ? 'Update Customer Profile' : 'Create Customer Record'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
