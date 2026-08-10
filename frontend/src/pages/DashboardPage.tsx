import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { SkeletonCard, SkeletonTable } from '../components/common/Skeleton';
import {
  useAdminStatsQuery,
  useSalesSummaryQuery,
  useWarehouseSummaryQuery,
  useAccountsSummaryQuery,
} from '../api/dashboardApi';
import {
  Users, Package, AlertOctagon, CheckCircle2, TrendingUp, ClipboardList,
  FileText, Layers, IndianRupee, Activity, Boxes, ChevronRight,
} from 'lucide-react';

// ─── Shared Stat Card ────────────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  trend?: 'up' | 'down' | 'neutral';
}> = ({ label, value, sub, icon, iconBg, trend }) => (
  <div className="glass-card rounded-xl p-5 flex items-center justify-between hover:border-slate-600 transition-all border border-slate-800/60">
    <div className="space-y-1">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-2xl font-extrabold text-white">{value}</p>
      {sub && (
        <p className={`text-xs flex items-center gap-1 ${
          trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-slate-400'
        }`}>
          {sub}
        </p>
      )}
    </div>
    <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
      {icon}
    </div>
  </div>
);

// ─── Welcome Banner ───────────────────────────────────────────────────────────
const WelcomeBanner: React.FC<{ name: string; role: string }> = ({ name, role }) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const roleColors: Record<string, string> = {
    ADMIN: 'from-purple-600/20 via-slate-900/60 to-indigo-900/20 border-purple-700/30',
    SALES: 'from-sky-600/20 via-slate-900/60 to-blue-900/20 border-sky-700/30',
    WAREHOUSE: 'from-amber-600/20 via-slate-900/60 to-orange-900/20 border-amber-700/30',
    ACCOUNTS: 'from-emerald-600/20 via-slate-900/60 to-teal-900/20 border-emerald-700/30',
  };

  return (
    <div className={`p-6 rounded-2xl border bg-gradient-to-r ${roleColors[role] || roleColors.ADMIN}`}>
      <p className="text-sm text-slate-400">{greeting},</p>
      <h2 className="text-2xl font-extrabold text-white mt-0.5">{name} 👋</h2>
      <p className="text-xs text-slate-400 mt-1">
        Here's your <span className="text-slate-200 font-semibold">{role}</span> workspace overview for today,{' '}
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}.
      </p>
    </div>
  );
};

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useAdminStatsQuery();
  const stats = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonTable rows={3} cols={4} />
      </div>
    );
  }

  const totalChallansThisWeek = stats?.challansThisWeek.reduce((s, d) => s + d.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Customers"
          value={stats?.totalCustomers ?? 0}
          sub={`${stats?.customersByStatus.find(s => s.status === 'LEAD')?.count ?? 0} leads`}
          icon={<Users className="h-6 w-6 text-sky-400" />}
          iconBg="bg-sky-950/80 border border-sky-800/50"
        />
        <StatCard
          label="Total Products"
          value={stats?.totalProducts ?? 0}
          sub={`${stats?.lowStockCount ?? 0} low stock`}
          icon={<Package className="h-6 w-6 text-purple-400" />}
          iconBg="bg-purple-950/80 border border-purple-800/50"
          trend={stats?.lowStockCount ? 'down' : 'neutral'}
        />
        <StatCard
          label="Low Stock Alerts"
          value={stats?.lowStockCount ?? 0}
          sub="Needs reorder"
          icon={<AlertOctagon className="h-6 w-6 text-rose-400" />}
          iconBg="bg-rose-950/80 border border-rose-800/50"
          trend={stats?.lowStockCount ? 'down' : 'neutral'}
        />
        <StatCard
          label="Confirmed This Week"
          value={totalChallansThisWeek}
          sub="Sales challans"
          icon={<CheckCircle2 className="h-6 w-6 text-emerald-400" />}
          iconBg="bg-emerald-950/80 border border-emerald-800/50"
          trend="up"
        />
      </div>

      {/* Customer status breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats?.customersByStatus.map((s) => (
          <div key={s.status} className="glass-card rounded-xl p-4 border border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Customers — {s.status}</p>
              <p className="text-xl font-bold text-white mt-0.5">{s.count}</p>
            </div>
            <Badge variant={s.status === 'ACTIVE' ? 'success' : s.status === 'LEAD' ? 'warning' : 'neutral'}>
              {s.status}
            </Badge>
          </div>
        ))}
      </div>

      {/* Challans This Week Chart */}
      <Card title="Challans Confirmed — Last 7 Days" subtitle="Daily confirmed delivery orders" action={
        <Button variant="ghost" size="sm" onClick={() => navigate('/sales')}>
          View All <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      }>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats?.challansThisWeek ?? []} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(val) => new Date(val).toLocaleDateString('en-IN', { weekday: 'short' })}
            />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }}
              labelFormatter={(val) => new Date(String(val)).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
            />
            <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#94a3b8', fontSize: 10 }} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Recent Audit Logs */}
      <Card title="Recent System Audit Events" subtitle="Last 5 platform actions" action={
        <Button variant="ghost" size="sm" onClick={() => navigate('/audit-logs')}>
          Full Log <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      }>
        {!stats?.recentAuditLogs.length ? (
          <p className="text-xs text-slate-500 py-6 text-center">No audit events recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {stats.recentAuditLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{log.action}</p>
                    <p className="text-[11px] text-slate-400">{log.entityType} · by {log.user?.name ?? 'System'} ({log.user?.role})</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

// ─── SALES DASHBOARD ──────────────────────────────────────────────────────────
const SalesDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useSalesSummaryQuery();
  const stats = data?.data;
  const now = new Date();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonTable rows={4} cols={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="My Open Leads"
          value={stats?.myLeads.length ?? 0}
          sub={`${stats?.overdueFollowUpCount ?? 0} overdue`}
          icon={<Users className="h-6 w-6 text-sky-400" />}
          iconBg="bg-sky-950/80 border border-sky-800/50"
          trend={stats?.overdueFollowUpCount ? 'down' : 'neutral'}
        />
        <StatCard
          label="Draft Challans"
          value={stats?.draftChallans.length ?? 0}
          sub="Awaiting confirmation"
          icon={<ClipboardList className="h-6 w-6 text-amber-400" />}
          iconBg="bg-amber-950/80 border border-amber-800/50"
        />
        <StatCard
          label="Recently Confirmed"
          value={stats?.recentConfirmed.length ?? 0}
          sub="Last 5 fulfillments"
          icon={<CheckCircle2 className="h-6 w-6 text-emerald-400" />}
          iconBg="bg-emerald-950/80 border border-emerald-800/50"
          trend="up"
        />
      </div>

      {/* My Leads with overdue highlighting */}
      <Card title="My Open Leads" subtitle="Customers assigned to you requiring follow-up" action={
        <Button variant="ghost" size="sm" onClick={() => navigate('/sales')}>
          Manage <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      }>
        {!stats?.myLeads.length ? (
          <p className="text-xs text-slate-500 py-6 text-center">No leads assigned to you yet. Add a new customer!</p>
        ) : (
          <div className="space-y-2">
            {stats.myLeads.map((lead) => {
              const isOverdue = lead.followUpDate && new Date(lead.followUpDate as string) < now;
              const isDueSoon = lead.followUpDate && !isOverdue &&
                (new Date(lead.followUpDate as string).getTime() - now.getTime()) < 2 * 24 * 60 * 60 * 1000;
              return (
                <div
                  key={lead.id}
                  className={`flex items-center justify-between py-2.5 px-3 rounded-lg border cursor-pointer hover:bg-slate-800/40 transition-colors ${
                    isOverdue
                      ? 'bg-rose-950/30 border-rose-800/60'
                      : isDueSoon
                      ? 'bg-amber-950/20 border-amber-800/40'
                      : 'bg-slate-900/60 border-slate-800/60'
                  }`}
                  onClick={() => navigate('/sales')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${isOverdue ? 'bg-rose-400 animate-pulse' : isDueSoon ? 'bg-amber-400' : 'bg-slate-500'}`} />
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{lead.name}</p>
                      <p className="text-[11px] text-slate-400">{lead.businessName} · {lead.customerType}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {lead.followUpDate ? (
                      <p className={`text-[10px] font-mono ${isOverdue ? 'text-rose-400' : isDueSoon ? 'text-amber-400' : 'text-slate-500'}`}>
                        {isOverdue ? '⚠️ Overdue' : '📅'} {new Date(lead.followUpDate).toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-600">No follow-up set</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Draft Challans */}
      <Card title="Draft Challans Awaiting Confirmation" subtitle="Click to open and confirm fulfillment" action={
        <Button variant="ghost" size="sm" onClick={() => navigate('/sales')}>
          View All <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      }>
        {!stats?.draftChallans.length ? (
          <p className="text-xs text-slate-500 py-6 text-center">No draft challans. Create a new delivery order!</p>
        ) : (
          <div className="space-y-2">
            {stats.draftChallans.map((c) => {
              const totalValue = c.lineItems.reduce((s, i) => s + i.quantity * i.unitPriceSnapshot, 0);
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-amber-950/20 border border-amber-800/40 cursor-pointer hover:bg-amber-950/30 transition-colors"
                  onClick={() => navigate('/sales')}
                >
                  <div>
                    <p className="text-xs font-bold text-amber-200">{c.challanNumber}</p>
                    <p className="text-[11px] text-slate-400">{c.customer?.name} · {c.totalQuantity} items</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-sky-400">₹{totalValue.toLocaleString('en-IN')}</p>
                    <Badge variant="warning" size="sm">DRAFT</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

// ─── WAREHOUSE DASHBOARD ─────────────────────────────────────────────────────
const WarehouseDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useWarehouseSummaryQuery();
  const stats = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonTable rows={5} cols={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Products"
          value={stats?.totalProducts ?? 0}
          sub="In catalog"
          icon={<Boxes className="h-6 w-6 text-sky-400" />}
          iconBg="bg-sky-950/80 border border-sky-800/50"
        />
        <StatCard
          label="Low Stock Alerts"
          value={stats?.lowStockProducts.length ?? 0}
          sub="Need restocking"
          icon={<AlertOctagon className="h-6 w-6 text-rose-400" />}
          iconBg="bg-rose-950/80 border border-rose-800/50"
          trend={stats?.lowStockProducts.length ? 'down' : 'neutral'}
        />
        <StatCard
          label="Recent Movements"
          value={stats?.recentMovements.length ?? 0}
          sub="Last 10 ledger entries"
          icon={<Activity className="h-6 w-6 text-purple-400" />}
          iconBg="bg-purple-950/80 border border-purple-800/50"
        />
      </div>

      {/* Low Stock Alerts */}
      {(stats?.lowStockProducts.length ?? 0) > 0 && (
        <Card title="⚠️ Critical Stock Alerts" subtitle="Products at or below minimum threshold" action={
          <Button variant="ghost" size="sm" onClick={() => navigate('/warehouse')}>
            Manage Stock <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        }>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats!.lowStockProducts.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/60 space-y-1"
                onClick={() => navigate('/warehouse')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-sky-400">{p.sku}</span>
                  <Badge variant="error" size="sm">Stock: {p.currentStock} / Min: {p.minStockAlert}</Badge>
                </div>
                <p className="text-xs font-semibold text-slate-200 truncate">{p.name}</p>
                <p className="text-[11px] text-slate-400">{p.warehouseLocation}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Movements */}
      <Card title="Recent Stock Movements" subtitle="Latest append-only ledger entries across all products" action={
        <Button variant="ghost" size="sm" onClick={() => navigate('/warehouse')}>
          Full Ledger <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      }>
        {!stats?.recentMovements.length ? (
          <p className="text-xs text-slate-500 py-6 text-center">No stock movements recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {stats.recentMovements.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-xs font-bold ${m.movementType === 'IN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {m.movementType === 'IN' ? `+${m.quantityChanged}` : `-${m.quantityChanged}`}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{m.product?.name ?? 'Unknown'}</p>
                    <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{m.reason}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-slate-500 font-mono">{new Date(m.createdAt).toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500">{m.creator?.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

// ─── ACCOUNTS DASHBOARD ───────────────────────────────────────────────────────
const AccountsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useAccountsSummaryQuery();
  const stats = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonTable rows={5} cols={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Revenue This Month"
          value={`₹${(stats?.revenueThisMonth ?? 0).toLocaleString('en-IN')}`}
          sub="From confirmed challans"
          icon={<IndianRupee className="h-6 w-6 text-emerald-400" />}
          iconBg="bg-emerald-950/80 border border-emerald-800/50"
          trend="up"
        />
        <StatCard
          label="Challans This Month"
          value={stats?.challanCountThisMonth ?? 0}
          sub="Confirmed & fulfilled"
          icon={<FileText className="h-6 w-6 text-sky-400" />}
          iconBg="bg-sky-950/80 border border-sky-800/50"
        />
        <StatCard
          label="Total Invoiced"
          value={stats?.recentConfirmedChallans.length ?? 0}
          sub="Recent records shown"
          icon={<TrendingUp className="h-6 w-6 text-purple-400" />}
          iconBg="bg-purple-950/80 border border-purple-800/50"
        />
      </div>

      {/* Recent Confirmed Challans */}
      <Card title="Recent Confirmed Challans" subtitle="Latest fulfilled delivery orders with invoice totals" action={
        <Button variant="ghost" size="sm" onClick={() => navigate('/sales')}>
          View All <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      }>
        {!stats?.recentConfirmedChallans.length ? (
          <p className="text-xs text-slate-500 py-6 text-center">No confirmed challans yet.</p>
        ) : (
          <div className="space-y-2">
            {stats.recentConfirmedChallans.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between py-3 px-4 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-lg bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">{c.challanNumber}</p>
                    <p className="text-[11px] text-slate-400">{c.customer?.name ?? 'Unknown'} · {c.totalQuantity} items</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-emerald-400">₹{c.totalValue.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {c.confirmedAt ? new Date(c.confirmedAt).toLocaleDateString('en-IN') : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

// ─── MAIN DASHBOARD PAGE ─────────────────────────────────────────────────────
export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role ?? 'ADMIN';

  const roleLabel: Record<string, string> = {
    ADMIN: 'System Administration',
    SALES: 'Sales & CRM',
    WAREHOUSE: 'Warehouse Operations',
    ACCOUNTS: 'Accounts & Billing',
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <WelcomeBanner name={user?.name ?? 'User'} role={role} />

      {/* Role-aware label */}
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{roleLabel[role]} Dashboard</span>
        <Badge variant={role === 'ADMIN' ? 'purple' : role === 'SALES' ? 'info' : role === 'WAREHOUSE' ? 'warning' : 'success'} size="sm">
          {role}
        </Badge>
      </div>

      {/* Render role-specific dashboard */}
      {role === 'ADMIN' && <AdminDashboard />}
      {role === 'SALES' && <SalesDashboard />}
      {role === 'WAREHOUSE' && <WarehouseDashboard />}
      {role === 'ACCOUNTS' && <AccountsDashboard />}
    </div>
  );
};
