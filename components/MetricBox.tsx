
import React from 'react';

interface MetricBoxProps {
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
}

export const MetricBox: React.FC<MetricBoxProps> = ({ label, value, subValue, color = 'text-slate-900' }) => {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className={`text-xl font-black ${color}`}>{value}</span>
        {subValue && <span className="text-[10px] text-slate-400 font-bold">{subValue}</span>}
      </div>
    </div>
  );
};
