import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
    <div className="h-16 w-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-500">
      {icon}
    </div>
    <div>
      <h3 className="text-sm font-bold text-slate-300">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-xs">{description}</p>
    </div>
    {action && (
      <Button variant="primary" size="sm" onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </div>
);
