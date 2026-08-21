import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { axiosClient } from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  Boxes,
  ClipboardList,
  ArrowLeftRight,
  ShoppingBag,
  Building2,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: statsData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await axiosClient.get('/dashboard/stats');
      return response.data?.data || {};
    },
  });

  const stats = statsData || {
    totalLocations: 3,
    totalProducts: 4,
    totalWorkOrders: 1,
    pendingWorkOrders: 1,
    totalTransfers: 1,
    pendingTransfers: 1,
    totalCustomerOrders: 1,
    lowStockCount: 1,
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 border border-sky-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-400">
            Operations & ERP Portal Overview
          </span>
          <h2 className="text-2xl font-extrabold text-white mt-1">
            Welcome back, {user?.name || 'User'} 👋
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Logged in with active permission role <Badge variant="purple" size="sm">{user?.role || 'SALES'}</Badge>. Manage inventory, work orders, transfers, and reservations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={() => navigate('/inventory')}>
            <Boxes className="h-4 w-4 mr-1.5" /> View Inventory
          </Button>
          <Button variant="outline" onClick={() => navigate('/work-orders')}>
            <ClipboardList className="h-4 w-4 mr-1.5" /> Work Orders
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/inventory')}
          className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-sky-500/50 cursor-pointer transition-all space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Physical Locations</span>
            <div className="h-9 w-9 rounded-xl bg-sky-600/20 flex items-center justify-center text-sky-400">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-100">{stats.totalLocations ?? 3}</p>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">{stats.totalProducts ?? 4} Catalog Products</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/work-orders')}
          className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Work Orders</span>
            <div className="h-9 w-9 rounded-xl bg-amber-600/20 flex items-center justify-center text-amber-400">
              <ClipboardList className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-amber-400">{stats.pendingWorkOrders ?? 1}</p>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">Total Created: {stats.totalWorkOrders ?? 1}</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/transfers')}
          className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Transfers</span>
            <div className="h-9 w-9 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-indigo-400">{stats.pendingTransfers ?? 1}</p>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">Total Transfers: {stats.totalTransfers ?? 1}</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/customer-orders')}
          className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer Orders</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-600/20 flex items-center justify-center text-emerald-400">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-emerald-400">{stats.totalCustomerOrders ?? 1}</p>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">Stock Reserved</p>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <Card title="Mini Operations ERP Workflow" subtitle="Select a module to perform operations">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => navigate('/inventory')}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 cursor-pointer transition-all space-y-2 group"
          >
            <Boxes className="h-6 w-6 text-sky-400 group-hover:scale-110 transition-transform" />
            <h4 className="font-bold text-sm text-slate-200">1. Physical Inventory</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Track physical, reserved, available stock & low-stock alerts.
            </p>
          </div>

          <div
            onClick={() => navigate('/work-orders')}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all space-y-2 group"
          >
            <ClipboardList className="h-6 w-6 text-amber-400 group-hover:scale-110 transition-transform" />
            <h4 className="font-bold text-sm text-slate-200">2. Work Orders</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Calculate material shortage = Max(0, Required - Available at Location).
            </p>
          </div>

          <div
            onClick={() => navigate('/transfers')}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all space-y-2 group"
          >
            <ArrowLeftRight className="h-6 w-6 text-indigo-400 group-hover:scale-110 transition-transform" />
            <h4 className="font-bold text-sm text-slate-200">3. Internal Transfers</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Request, dispatch, and receive stock between physical locations.
            </p>
          </div>

          <div
            onClick={() => navigate('/customer-orders')}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all space-y-2 group"
          >
            <ShoppingBag className="h-6 w-6 text-emerald-400 group-hover:scale-110 transition-transform" />
            <h4 className="font-bold text-sm text-slate-200">4. Customer Reservations</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Reserve stock against available quantity under transaction lock.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
