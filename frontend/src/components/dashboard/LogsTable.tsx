import React, { useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { LogEntry } from "../../lib/api";

interface LogsTableProps {
  logs: LogEntry[];
}

export function LogsTable({ logs }: LogsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Filter logs based on search term (O(1) checks mapped dynamically)
  const filteredLogs = logs.filter(
    (log) =>
      log.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.input_preview.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.output_preview.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl overflow-hidden animate-fade-in">
      <div className="p-5 border-b border-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-zinc-200">Logged Inference Events</h3>
          <p className="text-xs text-zinc-500">Live feed of SDK-captured payloads (PII Redacted)</p>
        </div>

        {/* Search Box */}
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Filter logs by model, prompt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs text-zinc-300 bg-[#09090b] border border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-700 placeholder:text-zinc-650"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        {filteredLogs.length > 0 ? (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-900 bg-zinc-950/20 text-zinc-400 font-medium">
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Provider</th>
                <th className="px-5 py-3.5">Model</th>
                <th className="px-5 py-3.5">Latency</th>
                <th className="px-5 py-3.5">Tokens</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60">
              {filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const isSuccess = log.status_code === 200;

                return (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className={`hover:bg-zinc-900/30 transition-colors cursor-pointer ${
                        isExpanded ? "bg-zinc-900/10" : ""
                      }`}
                    >
                      <td className="px-5 py-3 text-zinc-400 whitespace-nowrap">{log.timestamp}</td>
                      <td className="px-5 py-3 text-zinc-300 capitalize font-medium">{log.provider}</td>
                      <td className="px-5 py-3 text-zinc-400 font-mono text-[11px]">{log.model}</td>
                      <td className="px-5 py-3 text-zinc-300 font-medium">{log.latency_ms} ms</td>
                      <td className="px-5 py-3 text-zinc-400">{log.total_tokens}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            isSuccess
                              ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/40"
                              : "bg-red-950/30 text-red-400 border-red-900/40"
                          }`}
                        >
                          {log.status_code}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button className="text-zinc-500 hover:text-zinc-300 p-1">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Preview Details */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="px-5 py-4 bg-zinc-950/50 border-t border-zinc-900/40">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                                Input Prompt (PII Redacted)
                              </span>
                              <div className="p-3 bg-[#09090b] border border-zinc-800 rounded-lg text-zinc-300 font-mono text-[11px] overflow-x-auto max-h-[140px] whitespace-pre-wrap">
                                {log.input_preview}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                                Output Response (PII Redacted)
                              </span>
                              <div className="p-3 bg-[#09090b] border border-zinc-800 rounded-lg text-zinc-300 font-mono text-[11px] overflow-x-auto max-h-[140px] whitespace-pre-wrap">
                                {log.output_preview}
                              </div>
                            </div>
                          </div>

                          {log.error_message && (
                            <div className="mt-3 p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-lg text-[11px] font-mono">
                              <strong>Error Log:</strong> {log.error_message}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="py-12 text-center text-zinc-500 text-xs">No matching inference logs found.</div>
        )}
      </div>
    </div>
  );
}
export default LogsTable;
