import React from 'react';

export const SkeletonText: React.FC<{ className?: string }> = ({ className = 'h-4 bg-slate-200 rounded' }) => {
  return <div className={`animate-pulse ${className}`} />;
};

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full border border-slate-200 rounded-2xl overflow-hidden bg-white animate-pulse">
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex space-x-4">
        {Array.from({ length: cols }).map((_, idx) => (
          <div key={idx} className="h-4 bg-slate-300 rounded flex-1" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="p-4 flex space-x-4">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div key={cIdx} className="h-3 bg-slate-200 rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between animate-pulse space-y-4">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0" />
        <div className="flex-1 space-y-2 min-w-0">
          <div className="h-4 bg-slate-200 rounded w-2/3" />
          <div className="h-3 bg-slate-200 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2 border-t pt-4">
        <div className="h-3 bg-slate-200 rounded w-full" />
        <div className="h-3 bg-slate-200 rounded w-4/5" />
      </div>
    </div>
  );
};

export const SkeletonDashboard: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="h-3 bg-slate-200 rounded w-1/2" />
            <div className="h-7 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-2/3" />
          </div>
        ))}
      </div>
      {/* Chart blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm col-span-2 h-64 flex flex-col justify-between">
          <div className="h-4 bg-slate-200 rounded w-1/4" />
          <div className="h-40 bg-slate-100 rounded w-full" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-64 flex flex-col justify-between">
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="h-40 bg-slate-100 rounded w-full" />
        </div>
      </div>
    </div>
  );
};
