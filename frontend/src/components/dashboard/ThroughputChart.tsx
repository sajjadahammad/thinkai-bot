import React from "react";
import { TrendPoint } from "../../lib/api";

interface ThroughputChartProps {
  trends: TrendPoint[];
}

export function ThroughputChart({ trends }: ThroughputChartProps) {
  const chartHeight = 120;
  const chartWidth = 500;
  const maxRequests = Math.max(...trends.map((t) => t.requests), 5);

  return (
    <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-5 animate-fade-in">
      <h3 className="text-sm font-medium text-zinc-300 mb-4">Request Throughput (Last 24 Hours)</h3>
      <div className="w-full flex justify-center">
        {trends.length > 0 ? (
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-[150px] overflow-visible">
            {/* Grid Lines */}
            <line x1="20" y1="15" x2={chartWidth - 20} y2="15" stroke="#1f1f23" strokeDasharray="3 3" />
            <line x1="20" y1="60" x2={chartWidth - 20} y2="60" stroke="#1f1f23" strokeDasharray="3 3" />
            <line x1="20" y1={chartHeight - 10} x2={chartWidth - 20} y2={chartHeight - 10} stroke="#27272a" />

            {/* Bars */}
            {trends.map((t, idx) => {
              const barWidth = Math.max(4, (chartWidth - 40) / trends.length - 6);
              const x = (idx / trends.length) * (chartWidth - 40) + 20 + 3;
              const valHeight = (t.requests / maxRequests) * (chartHeight - 30);
              const y = chartHeight - valHeight - 10;

              return (
                <g key={idx} className="group/bar">
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={valHeight}
                    fill={t.requests > 0 ? "#10b981" : "#1f1f23"}
                    rx="1.5"
                    className="hover:opacity-80 transition-all cursor-pointer"
                  />
                  <title>{`Time: ${t.time}\nRequests: ${t.requests}`}</title>
                </g>
              );
            })}

            {/* Axis labels */}
            <text x="20" y={chartHeight + 10} fill="#71717a" fontSize="8" textAnchor="start">
              {trends[0]?.time}
            </text>
            <text x={chartWidth - 20} y={chartHeight + 10} fill="#71717a" fontSize="8" textAnchor="end">
              {trends[trends.length - 1]?.time}
            </text>
          </svg>
        ) : (
          <div className="h-[120px] flex items-center justify-center text-zinc-600 text-xs">
            No trend data available
          </div>
        )}
      </div>
    </div>
  );
}
export default ThroughputChart;
