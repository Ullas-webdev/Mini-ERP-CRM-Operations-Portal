import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
}) => {
  return (
    <div className={`glass-card rounded-xl p-6 shadow-xl transition-all duration-300 ${className}`}>
      {(title || subtitle || action) && (
        <div className="mb-5 flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div>
            {title && <h3 className="text-lg font-bold text-slate-100">{title}</h3>}
            {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
