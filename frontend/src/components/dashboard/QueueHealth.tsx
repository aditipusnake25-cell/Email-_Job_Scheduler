import React from "react";
import { QueueHealthMetrics } from "../../types/email";
import { Layers, Activity, CheckCircle2, XCircle, ExternalLink, RefreshCw } from "lucide-react";

export interface QueueHealthProps {
  metrics: QueueHealthMetrics | null;
  redisStatus: { status: string; error?: string };
  esStatus: { status: string; error?: string };
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const QueueHealth: React.FC<QueueHealthProps> = ({
  metrics,
  redisStatus,
  esStatus,
  onRefresh,
  isRefreshing,
}) => {
  const isRedisOnline = redisStatus.status === "connected";
  const isEsOnline = esStatus.status === "connected";

  return (
    <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">BullMQ Operational Engine</h4>
            <p className="text-xs text-slate-400">Delayed jobs, worker persistence, and infrastructure status</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Redis Status Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isRedisOnline
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}
            title={redisStatus.error || "Redis connected"}
          >
            {isRedisOnline ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            <span>Redis: {isRedisOnline ? "Online" : "Needs URL"}</span>
          </div>

          {/* Elasticsearch Status Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isEsOnline
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
            title={esStatus.error || "Elasticsearch connected"}
          >
            <span>Search: {isEsOnline ? "Elasticsearch" : "Postgres Fallback"}</span>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh queue health"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`} />
            </button>
          )}

          {/* Bull Board Link */}
          <a
            href="http://localhost:5000/admin/queues"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <span>Bull Board</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 text-center">
        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Delayed</p>
          <p className="text-xl font-bold text-indigo-400 mt-1 font-mono">{metrics?.delayed ?? 0}</p>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Waiting</p>
          <p className="text-xl font-bold text-sky-400 mt-1 font-mono">{metrics?.waiting ?? 0}</p>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Active</p>
          <p className="text-xl font-bold text-amber-400 mt-1 font-mono">{metrics?.active ?? 0}</p>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Completed</p>
          <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">{metrics?.completed ?? 0}</p>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Failed</p>
          <p className="text-xl font-bold text-rose-400 mt-1 font-mono">{metrics?.failed ?? 0}</p>
        </div>
      </div>
    </div>
  );
};
