import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  ArrowLeftRight,
  ShoppingBag,
  Activity,
  FileCheck2,
  Building2,
  X,
} from 'lucide-react';
import { useAuth, UserRole } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'OPERATIONS', 'SALES'] },
  { name: 'Inventory', path: '/inventory', icon: Boxes, roles: ['ADMIN', 'OPERATIONS', 'SALES'] },
  { name: 'Work Orders', path: '/work-orders', icon: ClipboardList, roles: ['ADMIN', 'OPERATIONS'] },
  { name: 'Internal Transfers', path: '/transfers', icon: ArrowLeftRight, roles: ['ADMIN', 'OPERATIONS'] },
  { name: 'Customer Orders', path: '/customer-orders', icon: ShoppingBag, roles: ['ADMIN', 'SALES'] },
  { name: 'System Health', path: '/health', icon: Activity, roles: ['ADMIN', 'OPERATIONS', 'SALES'] },
  { name: 'Activity Log', path: '/audit-logs', icon: FileCheck2, roles: ['ADMIN'] },
];

interface SidebarNavProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ isOpen = false, onClose }) => {
  const { user } = useAuth();
  const currentRole = user?.role || 'SALES';

  const visibleNavItems = navItems.filter((item) => item.roles.includes(currentRole));

  const sidebarContent = (
    <>
      <div>
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-950/50">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">MINI ERP</h1>
              <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Operations Portal</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <div className="p-4 space-y-1">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Operations Menu
          </p>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon className="h-4 w-4 text-slate-400" />
                  <span>{item.name}</span>
                </div>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Role Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="rounded-lg bg-slate-900/80 p-3 border border-slate-800/80">
          <p className="text-xs font-medium text-slate-400 mb-1">Active Permission Role</p>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">{currentRole}</span>
            <Badge variant={currentRole === 'ADMIN' ? 'purple' : currentRole === 'OPERATIONS' ? 'warning' : 'info'} size="sm">
              Role Protected
            </Badge>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-slate-900/90 border-r border-slate-800/80 flex-col justify-between h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          <aside className="relative z-10 w-72 max-w-[80vw] bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-full shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
