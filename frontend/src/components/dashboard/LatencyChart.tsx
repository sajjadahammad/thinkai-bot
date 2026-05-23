import React from "react";
import { TrendPoint } from "../../lib/api";

interface LatencyChartProps {
  trends: TrendPoint[];
}

export function LatencyChart({ trends }: LatencyChartProps) {
  const chartHeight = 120;
  const chartWidth = 500;
  const maxLatency = Math.max(...trends.map((t) => t.latency), 100);

  // Path computation for Latency Trend line chart
  const latencyPoints = trends.map((t, idx) => {
    const x = (idx / (trends.length - 1)) * (chartWidth - 40) + 20;
    const y = chartHeight - (t.latency / maxLatency) * (chartHeight - 30) - 15;
    return { x, y };
  });

  const latencyPath =
    latencyPoints.length > 0
      ? `M ${latencyPoints[0].x} ${latencyPoints[0].y} ` +
        latencyPoints.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ")
      : "";

  const latencyAreaPath =
    latencyPoints.length > 0
      ? `${latencyPath} L ${latencyPoints[latencyPoints.length - 1].x} ${chartHeight - 10} L ${
          latencyPoints[0].x
        } ${chartHeight - 10} Z`
      : "";

  return (
    <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-5 animate-fade-in">
      <h3 className="text-sm font-medium text-zinc-300 mb-4">Latency Trend (Last 24 Hours)</h3>
      <div className="w-full flex justify-center">
        {trends.length > 0 ? (
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-[150px] overflow-visible">
            <defs>
              <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line x1="20" y1="15" x2={chartWidth - 20} y2="15" stroke="#1f1f23" strokeDasharray="3 3" />
            <line x1="20" y1="60" x2={chartWidth - 20} y2="60" stroke="#1f1f23" strokeDasharray="3 3" />
            <line x1="20" y1={chartHeight - 10} x2={chartWidth - 20} y2={chartHeight - 10} stroke="#27272a" />

            {/* Area */}
            {latencyAreaPath && <path d={latencyAreaPath} fill="url(#latencyGrad)" />}

            {/* Line */}
            {latencyPath && (
              <path d={latencyPath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
            )}

            {/* Data Circles */}
            {latencyPoints.map((p, i) => (
              <g key={i} className="group/dot">
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="3.5"
                  fill="#0c0c0e"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  className="cursor-pointer hover:r-5 transition-all"
                />
                <title>{`Time: ${trends[i].time}\nLatency: ${trends[i].latency} ms`}</title>
              </g>
            ))}

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
export default LatencyChart;
