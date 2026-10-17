import React, { useState, useEffect, useCallback } from "react";
import { User } from "../types/user";
import { EmailRecord, QueueHealthMetrics } from "../types/email";
import { emailService } from "../services/emailService";
import { StatCard } from "../components/dashboard/StatCard";
import { QueueHealth } from "../components/dashboard/QueueHealth";
import { EmailTable } from "../components/emails/EmailTable";
import { ComposeEmailModal } from "../components/emails/ComposeEmailModal";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  RefreshCw,
  Zap,
  Filter,
} from "lucide-react";
import { Button } from "../components/ui/Button";

export interface DashboardPageProps {
  user: User;
  onLogout: () => void;
  onOpenCompose: () => void;
  isComposeOpen: boolean;
  onCloseCompose: () => void;
  slackStatus: { connected: boolean; integration?: { teamName: string; channelName: string } };
  onConnectSlack: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  onOpenCompose,
  isComposeOpen,
  onCloseCompose,
  slackStatus,
  onConnectSlack,
}) => {
  const [activeTab, setActiveTab] = useState<"scheduled" | "sent">("scheduled");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [scheduledEmails, setScheduledEmails] = useState<EmailRecord[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailRecord[]>([]);
  const [totalScheduled, setTotalScheduled] = useState(0);
  const [totalSent, setTotalSent] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Queue Health
  const [queueMetrics, setQueueMetrics] = useState<QueueHealthMetrics | null>(null);
  const [redisStatus, setRedisStatus] = useState<{ status: string; error?: string }>({
    status: "disconnected",
  });
  const [esStatus, setEsStatus] = useState<{ status: string; error?: string }>({
    status: "disconnected",
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch queue health metrics
  const fetchQueueHealth = useCallback(async () => {
    try {
      const data = await emailService.getQueueHealth();
      setQueueMetrics(data.queue);
      setRedisStatus(data.services.redis);
      setEsStatus(data.services.elasticsearch);
    } catch {
      // offline fallback
    }
  }, []);

  // Fetch emails based on active tab and search query
  const fetchEmails = useCallback(async () => {
    try {
      setIsLoading(true);

      if (debouncedQuery) {
        // Search API
        const statusFilter = activeTab === "scheduled" ? "scheduled" : "sent";
        const res = await emailService.searchEmails(debouncedQuery, statusFilter);
        if (activeTab === "scheduled") {
          setScheduledEmails(res.emails);
          setTotalScheduled(res.total);
        } else {
          setSentEmails(res.emails);
          setTotalSent(res.total);
        }
      } else {
        // Standard list APIs
        const [scheduledRes, sentRes] = await Promise.all([
          emailService.getScheduledEmails(1, 50),
          emailService.getSentEmails(1, 50),
        ]);

        setScheduledEmails(scheduledRes.emails);
        setTotalScheduled(scheduledRes.total);
        setSentEmails(sentRes.emails);
        setTotalSent(sentRes.total);
      }
    } catch (err) {
      console.error("Failed to load emails", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, debouncedQuery]);

  useEffect(() => {
    fetchEmails();
    fetchQueueHealth();

    // Auto-refresh queue health every 15 seconds
    const interval = setInterval(fetchQueueHealth, 15000);
    return () => clearInterval(interval);
  }, [fetchEmails, fetchQueueHealth]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchEmails(), fetchQueueHealth()]);
    setIsRefreshing(false);
  };

  const displayedEmails = activeTab === "scheduled" ? scheduledEmails : sentEmails;

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Campaign Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Welcome back, <span className="text-indigo-400 font-medium">{user.name}</span>. Manage scheduled delayed jobs, delivery logs, and sending limits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            isLoading={isRefreshing}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenCompose}
            icon={<Plus className="w-4 h-4" />}
          >
            Compose Campaign
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Scheduled Emails"
          value={totalScheduled}
          subtitle="Queued delayed jobs"
          icon={<Clock className="w-5 h-5" />}
          color="indigo"
        />
        <StatCard
          label="Delivered Emails"
          value={totalSent}
          subtitle="Sent via Ethereal SMTP"
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          label="Hourly Limit"
          value="200 / hr"
          subtitle="Per-sender sliding window"
          icon={<Zap className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          label="Worker Concurrency"
          value="5 workers"
          subtitle="Configurable parallel jobs"
          icon={<Filter className="w-5 h-5" />}
          color="sky"
        />
      </div>

      {/* BullMQ Operational Health Component */}
      <QueueHealth
        metrics={queueMetrics}
        redisStatus={redisStatus}
        esStatus={esStatus}
        onRefresh={fetchQueueHealth}
      />

      {/* Main Tabs and Search Toolbar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          {/* Tabs */}
          <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setActiveTab("scheduled")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "scheduled"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Scheduled Emails</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/30 font-mono">
                {totalScheduled}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("sent")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "sent"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sent Emails</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/30 font-mono">
                {totalSent}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipient, subject, sender..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50"
            />
          </div>
        </div>

        {/* Email Table */}
        <EmailTable
          emails={displayedEmails}
          isLoading={isLoading}
          type={activeTab}
          onComposeClick={onOpenCompose}
        />
      </div>

      {/* Compose Campaign Modal */}
      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={onCloseCompose}
        onSuccess={() => {
          fetchEmails();
          fetchQueueHealth();
        }}
        defaultSenderEmail={user.email || "demo-sender@reachinbox.test"}
      />
    </div>
  );
};
