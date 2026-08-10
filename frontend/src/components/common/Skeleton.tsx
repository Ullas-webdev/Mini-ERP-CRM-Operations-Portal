import React from 'react';

interface SkeletonProps {
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-800/80 rounded-lg ${className}`} />
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 1,
  className = '',
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`}
      />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`glass-card rounded-xl p-6 space-y-4 ${className}`}>
    <div className="flex items-center justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 4,
}) => (
  <div className="w-full rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden">
    {/* Header */}
    <div className="flex items-center gap-4 px-6 py-3.5 bg-slate-900/80 border-b border-slate-800">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-3 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div
        key={rowIdx}
        className="flex items-center gap-4 px-6 py-4 border-b border-slate-800/60 last:border-0"
      >
        {Array.from({ length: cols }).map((_, colIdx) => (
          <Skeleton
            key={colIdx}
            className={`h-4 flex-1 ${colIdx === 0 ? 'max-w-[100px]' : ''}`}
          />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonStat: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className={`grid grid-cols-2 md:grid-cols-${count} gap-4`}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export { Skeleton };
