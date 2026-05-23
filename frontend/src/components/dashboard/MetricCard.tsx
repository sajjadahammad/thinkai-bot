import React from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
  gradientClass: string;
  iconBgClass: string;
  iconTextClass: string;
}

export function MetricCard({
  title,
  value,
  subtext,
  icon,
  gradientClass,
  iconBgClass,
  iconTextClass,
}: MetricCardProps) {
  return (
    <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-5 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl transition-all duration-500 opacity-20 ${gradientClass}`} />
      <div className="flex items-center justify-between mb-3">
        <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-lg border ${iconBgClass} ${iconTextClass}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-zinc-100">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{subtext}</div>
    </div>
  );
}
export default MetricCard;
