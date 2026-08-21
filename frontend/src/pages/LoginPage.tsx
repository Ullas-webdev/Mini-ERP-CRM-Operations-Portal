import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Building2, Lock, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, setRole } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('Demo@123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Login failed. Please check your credentials.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoFill = (demoEmail: string, role: any) => {
    setEmail(demoEmail);
    setPassword('Demo@123');
    setRole(role);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center mx-auto shadow-xl shadow-sky-950/50">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Mini Operations ERP
          </h1>
          <p className="text-xs text-slate-400">
            Authenticate to access operations & role-gated domain modules
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card rounded-2xl p-8 border border-slate-800 shadow-2xl space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start space-x-3">
              <ShieldAlert className="h-5 w-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-bold text-rose-200">Authentication Error</p>
                <p className="mt-1 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Work Email Address"
              type="email"
              placeholder="e.g. admin@demo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" variant="primary" className="w-full py-3" isLoading={isSubmitting}>
              <Lock className="h-4 w-4 mr-2" /> Sign In to ERP Portal
            </Button>
          </form>

          {/* Quick Demo Credentials Autofill */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center">
              Quick Demo Fill Credentials (Password: Demo@123)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoFill('admin@demo.com', 'ADMIN')}
                className="px-2.5 py-2 rounded-lg bg-purple-950/40 border border-purple-800/50 hover:bg-purple-900/60 text-purple-300 text-xs font-semibold flex items-center justify-between transition-colors"
              >
                <span>Admin</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-400" />
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('ops@demo.com', 'OPERATIONS')}
                className="px-2.5 py-2 rounded-lg bg-amber-950/40 border border-amber-800/50 hover:bg-amber-900/60 text-amber-300 text-xs font-semibold flex items-center justify-between transition-colors"
              >
                <span>Ops</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('sales@demo.com', 'SALES')}
                className="px-2.5 py-2 rounded-lg bg-sky-950/40 border border-sky-800/50 hover:bg-sky-900/60 text-sky-300 text-xs font-semibold flex items-center justify-between transition-colors"
              >
                <span>Sales</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-sky-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
