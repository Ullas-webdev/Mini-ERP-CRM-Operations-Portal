import React, { useState } from 'react';
import { useAuditLogsQuery, AuditLogItem, AuditLogFilters } from '../api/auditLogApi';
import { Card } from '../components/common/Card';
import { Table, Column } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Eye, ChevronLeft, ChevronRight, FileJson } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 10,
    action: '',
    entityType: '',
  });

  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const { data, isLoading } = useAuditLogsQuery(filters);

  const logs = data?.data?.logs || [];
  const pagination = data?.data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

  const handleFilterChange = (field: keyof AuditLogFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
      page: 1,
    }));
  };

  const parseJsonState = (jsonStr: string | null) => {
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr);
    } catch {
      return jsonStr;
    }
  };

  const columns: Column<AuditLogItem>[] = [
    {
      header: 'Timestamp',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-300">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Actor / User',
      cell: (row) => (
        <div>
          <p className="font-bold text-slate-200 text-xs">{row.user?.name || 'System / Guest'}</p>
          <p className="text-[11px] text-slate-400 font-mono">{row.user?.email || 'N/A'}</p>
        </div>
      ),
    },
    {
      header: 'Action',
      cell: (row) => {
        let variant: any = 'info';
        if (row.action.includes('FAILED') || row.action.includes('LOCKED')) variant = 'error';
        if (row.action.includes('SUCCESS') || row.action.includes('SEEDED')) variant = 'success';
        if (row.action.includes('LOGOUT')) variant = 'warning';

        return <Badge variant={variant}>{row.action}</Badge>;
      },
    },
    {
      header: 'Entity Domain',
      cell: (row) => (
        <span className="font-mono text-xs text-sky-400 font-semibold">{row.entityType}</span>
      ),
    },
    {
      header: 'IP Address',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-400">{row.ipAddress || '127.0.0.1'}</span>
      ),
    },
    {
      header: 'State Diff',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedLog(row)}
        >
          <Eye className="h-3.5 w-3.5 mr-1" /> Inspect JSON
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-extrabold text-slate-100">Audit & Traceability Log</h2>
            <Badge variant="purple">Admin Only</Badge>
          </div>
          <p className="text-sm text-slate-400">
            Immutable system activity ledger capturing before & after state diffs across all operations
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card title="Filter Audit Records" subtitle="Search by action keyword, entity domain, or actor">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Action Type"
            placeholder="e.g. LOGIN_SUCCESS, UPDATE"
            value={filters.action || ''}
            onChange={(e) => handleFilterChange('action', e.target.value)}
          />

          <Input
            label="Entity Domain"
            placeholder="e.g. USER, CUSTOMER, STOCK"
            value={filters.entityType || ''}
            onChange={(e) => handleFilterChange('entityType', e.target.value)}
          />

          <Input
            label="Start Date"
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />

          <Input
            label="End Date"
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card title="System Activity Ledger" subtitle={`Showing ${logs.length} of ${pagination.total} audit entries`}>
        <Table columns={columns} data={logs} keyExtractor={(row) => row.id} isLoading={isLoading} />

        {/* Pagination Controls */}
        <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-800">
          <span className="text-xs text-slate-400">
            Page <strong className="text-slate-200">{pagination.page}</strong> of <strong className="text-slate-200">{pagination.totalPages}</strong>
          </span>
          <div className="flex space-x-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* State Inspector Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Log Inspection — ${selectedLog.action}`}
        >
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
              <p><strong className="text-slate-400">Timestamp:</strong> {new Date(selectedLog.createdAt).toLocaleString()}</p>
              <p><strong className="text-slate-400">Actor:</strong> {selectedLog.user?.name} ({selectedLog.user?.email})</p>
              <p><strong className="text-slate-400">Entity:</strong> {selectedLog.entityType} (ID: {selectedLog.entityId || 'N/A'})</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <FileJson className="h-3.5 w-3.5" /> Before State
                </p>
                <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
                  {selectedLog.beforeState
                    ? JSON.stringify(parseJsonState(selectedLog.beforeState), null, 2)
                    : 'null (Created or N/A)'}
                </pre>
              </div>

              <div>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <FileJson className="h-3.5 w-3.5" /> After State
                </p>
                <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
                  {selectedLog.afterState
                    ? JSON.stringify(parseJsonState(selectedLog.afterState), null, 2)
                    : 'null (Deleted or N/A)'}
                </pre>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
