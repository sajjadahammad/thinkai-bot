"use client";

import React from "react";
import { 
  BarChart3, 
  Clock, 
  AlertTriangle, 
  Layers, 
  ArrowLeft, 
  RefreshCw, 
  Database
} from "lucide-react";

import { DashboardData } from "../lib/api";
import { MetricCard } from "./dashboard/MetricCard";
import { LatencyChart } from "./dashboard/LatencyChart";
import { ThroughputChart } from "./dashboard/ThroughputChart";
import { LogsTable } from "./dashboard/LogsTable";
import { useDashboardQuery } from "../hooks/useDashboard";

export default function Dashboard({ onClose }: { onClose: () => void }) {
  const { data, isLoading, error, refetch } = useDashboardQuery();

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-zinc-200">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-zinc-400 text-sm font-light">Loading dashboard metrics...</p>
      </div>
    );
  }

  const summary = data?.summary || {
    avg_latency_ms: 0,
    total_requests: 0,
    total_tokens: 0,
    prompt_tokens: 0,
    completion_tokens: 0,
    error_rate: 0,
    error_count: 0
  };

  const trends = data?.trends || [];
  const logs = data?.logs || [];

  return (
    <div className="flex flex-col min-h-screen bg-[#09090b] text-zinc-100 font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-900/60 rounded-lg border border-zinc-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-semibold font-heading tracking-tight flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              Inference Insights
            </h1>
            <p className="text-xs text-zinc-500 font-light">Real-time metrics, logs, and token analytics</p>
          </div>
        </div>

        <button 
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          Refresh
        </button>
      </header>

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {error && (
          <div className="p-4 bg-red-950/20 border border-red-900/30 text-red-400 rounded-lg text-xs font-mono">
            {error.message}
          </div>
        )}

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total Requests"
            value={summary.total_requests.toLocaleString()}
            subtext="Total database logged queries"
            icon={<BarChart3 className="w-4 h-4" />}
            gradientClass="bg-emerald-500"
            iconBgClass="bg-emerald-950/30"
            iconTextClass="text-emerald-400 border-emerald-900/30"
          />

          <MetricCard
            title="Avg Latency"
            value={`${summary.avg_latency_ms} ms`}
            subtext="Time to first chunk generation"
            icon={<Clock className="w-4 h-4" />}
            gradientClass="bg-blue-500"
            iconBgClass="bg-blue-950/30"
            iconTextClass="text-blue-400 border-blue-900/30"
          />

          <MetricCard
            title="Error Rate"
            value={`${summary.error_rate}%`}
            subtext={`${summary.error_count} failed requests overall`}
            icon={<AlertTriangle className="w-4 h-4" />}
            gradientClass="bg-red-500"
            iconBgClass={summary.error_rate > 0 ? "bg-red-950/30" : "bg-zinc-900"}
            iconTextClass={summary.error_rate > 0 ? "text-red-400 border-red-900/30" : "text-zinc-400 border-zinc-800"}
          />

          <MetricCard
            title="Total Tokens"
            value={summary.total_tokens.toLocaleString()}
            subtext={`P: ${summary.prompt_tokens.toLocaleString()} | C: ${summary.completion_tokens.toLocaleString()}`}
            icon={<Layers className="w-4 h-4" />}
            gradientClass="bg-violet-500"
            iconBgClass="bg-violet-950/30"
            iconTextClass="text-violet-400 border-violet-900/30"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LatencyChart trends={trends} />
          <ThroughputChart trends={trends} />
        </div>

        {/* Logs List Table */}
        <LogsTable logs={logs} />
      </main>
    </div>
  );
}
