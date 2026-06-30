import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  backgroundColor: string;
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subValue, icon: Icon, color, backgroundColor, loading }) => {
  return (
    <div className="glass-card p-6 flex items-center gap-4">
      <div 
        className="p-3 rounded-sm" 
        style={{ backgroundColor, color }}
      >
        <Icon size={24} />
      </div>
      <div className="flex-1">
        <span className="text-(--text-secondary) text-[0.8rem] font-semibold block">{title}</span>
        {loading ? (
          <div className="h-7 w-28 bg-white/10 animate-pulse rounded-sm mt-1"></div>
        ) : (
          <h2 className="text-2xl font-extrabold">
            {value} {subValue && <span className="text-[0.9rem] text-(--text-muted) font-normal">{subValue}</span>}
          </h2>
        )}
      </div>
    </div>
  );
};
