import React from "react";
import { EmailStatus } from "../../types/email";
import { CheckCircle2, Clock, AlertCircle, RefreshCw, Send, Hourglass } from "lucide-react";

export interface StatusBadgeProps {
  status: EmailStatus | string;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md" }) => {
  const normalized = (status || "scheduled").toLowerCase();

  const configs: Record<
    string,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    sent: {
      label: "Sent",
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    scheduled: {
      label: "Scheduled",
      bg: "bg-indigo-500/10",
      text: "text-indigo-400",
      border: "border-indigo-500/20",
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    queued: {
      label: "Queued",
      bg: "bg-sky-500/10",
      text: "text-sky-400",
      border: "border-sky-500/20",
      icon: <Hourglass className="w-3.5 h-3.5" />,
    },
    sending: {
      label: "Sending",
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/20",
      icon: <Send className="w-3.5 h-3.5 animate-pulse" />,
    },
    failed: {
      label: "Failed",
      bg: "bg-rose-500/10",
      text: "text-rose-400",
      border: "border-rose-500/20",
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    },
    rescheduled: {
      label: "Rescheduled",
      bg: "bg-orange-500/10",
      text: "text-orange-400",
      border: "border-orange-500/20",
      icon: <RefreshCw className="w-3.5 h-3.5" />,
    },
  };

  const current = configs[normalized] || {
    label: status,
    bg: "bg-slate-800",
    text: "text-slate-300",
    border: "border-slate-700",
    icon: <Clock className="w-3.5 h-3.5" />,
  };

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs gap-1" : "px-2.5 py-1 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${current.bg} ${current.text} ${current.border} ${sizeClasses}`}
    >
      {current.icon}
      <span>{current.label}</span>
    </span>
  );
};
