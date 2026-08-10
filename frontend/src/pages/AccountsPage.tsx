import React from 'react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { CreditCard, FileText, Receipt, Plus } from 'lucide-react';

export const AccountsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold text-slate-100">Accounts & Billing</h2>
            <Badge variant="success">Protected: Admin, Accounts</Badge>
          </div>
          <p className="text-sm text-slate-400">
            Financial Ledger, Invoicing, and Expense Management Skeleton
          </p>
        </div>
        <Button variant="primary">
          <Plus className="h-4 w-4 mr-2" /> Generate Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Monthly Revenue</p>
              <p className="text-2xl font-extrabold text-white mt-1">$124,500</p>
            </div>
            <CreditCard className="h-8 w-8 text-emerald-400" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Outstanding Receivables</p>
              <p className="text-2xl font-extrabold text-white mt-1">$18,200</p>
            </div>
            <Receipt className="h-8 w-8 text-amber-400" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Processed Invoices</p>
              <p className="text-2xl font-extrabold text-white mt-1">94</p>
            </div>
            <FileText className="h-8 w-8 text-sky-400" />
          </div>
        </Card>
      </div>

      <Card title="Accounts Domain Controller Architecture">
        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-300 space-y-2">
          <p className="text-emerald-400">// Router Endpoint: /api/v1/accounts/*</p>
          <p className="text-slate-400">// Guard Middleware: authenticateJwt + requireRoles('ADMIN', 'ACCOUNTS')</p>
          <p className="text-slate-400">{'// Zod Request Validation: validateRequest({ body: invoiceSchema })'}</p>
        </div>
      </Card>
    </div>
  );
};
