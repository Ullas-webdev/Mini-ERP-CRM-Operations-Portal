import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Shield, LogOut, Search, Package, X, Menu } from 'lucide-react';
import { useAuth, UserRole } from '../../context/AuthContext';
import { Badge, BadgeVariant } from '../common/Badge';
import { axiosClient } from '../../api/axiosClient';

interface SearchResult {
  type: 'inventory' | 'product';
  id: string;
  primary: string;
  secondary: string;
  meta?: string;
}

const useGlobalSearch = (query: string) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const prodRes = await axiosClient.get(`/products?search=${encodeURIComponent(query)}`);
        const products: SearchResult[] = (prodRes.data?.data?.products ?? []).map((p: any) => ({
          type: 'product',
          id: p.id,
          primary: p.name,
          secondary: `SKU: ${p.sku}`,
          meta: p.category,
        }));

        setResults(products);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { results, isLoading };
};

interface TopBarProps {
  onToggleMobileMenu?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleMobileMenu }) => {
  const { user, setRole, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { results, isLoading: searchLoading } = useGlobalSearch(searchQuery);

  const roleVariants: Record<UserRole, BadgeVariant> = {
    ADMIN: 'purple',
    OPERATIONS: 'warning',
    SALES: 'info',
  };

  const roleDefaultPaths: Record<UserRole, string> = {
    ADMIN: '/',
    OPERATIONS: '/inventory',
    SALES: '/customer-orders',
  };

  const handleRoleSelect = async (selectedRole: UserRole) => {
    await setRole(selectedRole);
    navigate(roleDefaultPaths[selectedRole]);
  };

  const handleResultClick = (_result: SearchResult) => {
    setSearchQuery('');
    setIsSearchFocused(false);
    navigate('/inventory');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showDropdown = isSearchFocused && (results.length > 0 || (searchQuery.length >= 2 && searchLoading));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 gap-2">
      {onToggleMobileMenu && (
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/60 border border-slate-700/60 focus:outline-none flex-shrink-0"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Global Search */}
      <div ref={searchRef} className="relative flex-1 max-w-sm">
        <div className={`flex items-center gap-2 bg-slate-950/60 border rounded-xl px-3 py-2 transition-all ${
          isSearchFocused ? 'border-sky-500/60 ring-1 ring-sky-500/20' : 'border-slate-800'
        }`}>
          <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search items, SKUs, categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            className="bg-transparent text-xs text-slate-200 placeholder-slate-500 outline-none flex-1 min-w-0"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setIsSearchFocused(false); }}>
              <X className="h-3.5 w-3.5 text-slate-500 hover:text-slate-300 transition-colors" />
            </button>
          )}
        </div>

        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
            {searchLoading && results.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400">Searching...</div>
            ) : results.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-500">No results for "{searchQuery}"</div>
            ) : (
              <div>
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-slate-500 tracking-wider bg-slate-950/50 border-b border-slate-800">
                  Product Catalog Items
                </div>
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleResultClick(r)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/80 transition-colors text-left"
                  >
                    <Package className="h-4 w-4 text-sky-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">{r.primary}</p>
                      <p className="text-[11px] font-mono text-sky-400 truncate">{r.secondary}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">{r.meta}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 md:gap-4 ml-4">
        {user?.role === 'ADMIN' && (
          <div className="hidden md:flex items-center space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <span className="text-[11px] font-semibold uppercase text-slate-400 px-2 flex items-center gap-1">
              <Shield className="h-3 w-3 text-sky-400" />
              <span className="hidden lg:inline">Simulate Role:</span>
            </span>
            {(['ADMIN', 'OPERATIONS', 'SALES'] as UserRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleRoleSelect(r)}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg cursor-pointer transition-all duration-200 ${
                  user?.role === r
                    ? 'bg-sky-600 text-white shadow-md ring-1 ring-sky-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pl-2 md:pl-4 border-l border-slate-800">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center border border-sky-700/50 flex-shrink-0">
            <UserIcon className="h-4 w-4 text-white" />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-semibold text-slate-200 leading-tight">
              {user?.name ?? 'Guest'}
            </span>
            <Badge variant={user ? roleVariants[user.role] : 'neutral'} size="sm">
              {user?.role ?? 'GUEST'}
            </Badge>
          </div>

          <button
            onClick={handleLogout}
            title="Logout / Sign Out"
            className="ml-1 rounded-lg p-1.5 text-slate-500 hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
