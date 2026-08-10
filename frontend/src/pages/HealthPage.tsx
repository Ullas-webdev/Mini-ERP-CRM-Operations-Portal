import React from 'react';
import { useHealthQuery } from '../api/healthApi';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { RefreshCw, Database, Clock, Cpu, CheckCircle2, XCircle } from 'lucide-react';

export const HealthPage: React.FC = () => {
  const { data, isLoading, isError, refetch, isRefetching } = useHealthQuery();

  const healthData = data?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">System Health Monitor</h2>
          <p className="text-sm text-slate-400">
            Real-time backend API telemetry & database connection check (TanStack Query auto-refresh 10s)
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => refetch()}
          isLoading={isRefetching}
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh Health Status
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
            <p className="text-sm text-slate-400">Querying /api/v1/health endpoint...</p>
          </div>
        </Card>
      ) : isError || !healthData ? (
        <Card className="border-rose-800/60 bg-rose-950/20">
          <div className="flex items-center space-x-3 text-rose-400">
            <XCircle className="h-6 w-6" />
            <div>
              <h4 className="font-bold text-base">Health Endpoint Connection Error</h4>
              <p className="text-xs text-rose-300 mt-0.5">
                Could not connect to http://localhost:5000/api/v1/health. Ensure backend is running.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Overall API Status">
            <div className="flex items-center space-x-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              <div>
                <Badge variant="success" size="md">
                  STATUS: {healthData.status}
                </Badge>
                <p className="text-xs text-slate-400 mt-2">
                  Environment: <span className="text-slate-200 font-mono">{healthData.environment}</span>
                </p>
                <p className="text-xs text-slate-400">
                  Last Checked: {new Date(healthData.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </Card>

          <Card title="PostgreSQL Connectivity">
            <div className="flex items-center space-x-4">
              <Database className="h-10 w-10 text-purple-400" />
              <div>
                <Badge
                  variant={healthData.database === 'connected' ? 'purple' : 'error'}
                  size="md"
                >
                  DATABASE: {healthData.database.toUpperCase()}
                </Badge>
                <p className="text-xs text-slate-400 mt-2">
                  ORM Engine: <span className="text-slate-200 font-mono">Prisma v5</span>
                </p>
                <p className="text-xs text-slate-400">
                  Protocol: <span className="text-slate-200 font-mono">postgresql://</span>
                </p>
              </div>
            </div>
          </Card>

          <Card title="Process Uptime & Specs">
            <div className="flex items-center space-x-4">
              <Clock className="h-10 w-10 text-sky-400" />
              <div>
                <p className="text-xl font-bold text-slate-100 font-mono">
                  {Math.floor(healthData.uptime)} seconds
                </p>
                <p className="text-xs text-slate-400 mt-1 flex items-center">
                  <Cpu className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  Node.js Memory Heap: {healthData.memoryUsage ? Math.round(healthData.memoryUsage.heapUsed / 1024 / 1024) : 0} MB
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
