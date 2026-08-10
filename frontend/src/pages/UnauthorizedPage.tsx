import React from 'react';
import { ShieldAlert, ArrowLeft, Shield } from 'lucide-react';
import { useAuth, UserRole } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useNavigate } from 'react-router-dom';

export const UnauthorizedPage: React.FC = () => {
  const { user, setRole } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl p-8 max-w-md w-full border border-rose-500/20 text-center space-y-6 shadow-2xl">
        <div className="h-16 w-16 rounded-full bg-rose-950/80 border border-rose-800/50 flex items-center justify-center mx-auto text-rose-400">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div>
          <Badge variant="error" size="md">
            403 ACCESS FORBIDDEN
          </Badge>
          <h3 className="text-xl font-bold text-white mt-3">Role Authorization Required</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Your current active role (<span className="text-rose-400 font-semibold">{user?.role}</span>) does not have sufficient permissions to view this domain route.
          </p>
        </div>

        {/* Demo Switcher Helper */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-left space-y-3">
          <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-sky-400" /> Test with a different role:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRole(r);
                  navigate(-1);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                  user?.role === r
                    ? 'bg-rose-950/40 text-rose-400 border-rose-800'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-sky-500'
                }`}
              >
                Switch to {r}
              </button>
            ))}
          </div>
        </div>

        <Button variant="secondary" className="w-full" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Return to Dashboard
        </Button>
      </div>
    </div>
  );
};
