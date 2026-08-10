import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'purple' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'info',
  size = 'md',
}) => {
  const variantStyles = {
    success: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50',
    warning: 'bg-amber-950/60 text-amber-400 border-amber-800/50',
    error: 'bg-rose-950/60 text-rose-400 border-rose-800/50',
    info: 'bg-sky-950/60 text-sky-400 border-sky-800/50',
    purple: 'bg-purple-950/60 text-purple-400 border-purple-800/50',
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} transition-all`}
    >
      {children}
    </span>
  );
};
