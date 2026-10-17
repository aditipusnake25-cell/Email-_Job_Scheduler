import { api } from "./api";
import { EmailRecord, ScheduleEmailPayload, Sender, QueueHealthMetrics } from "../types/email";

export interface PaginatedEmailsResponse {
  success: boolean;
  emails: EmailRecord[];
  total: number;
  page: number;
  totalPages: number;
  source?: string;
}

export const emailService = {
  async scheduleEmails(payload: ScheduleEmailPayload) {
    const res = await api.post("/api/emails/schedule", payload);
    return res.data;
  },

  async getScheduledEmails(page = 1, limit = 20): Promise<PaginatedEmailsResponse> {
    const res = await api.get<PaginatedEmailsResponse>("/api/emails/scheduled", {
      params: { page, limit },
    });
    return res.data;
  },

  async getSentEmails(page = 1, limit = 20): Promise<PaginatedEmailsResponse> {
    const res = await api.get<PaginatedEmailsResponse>("/api/emails/sent", {
      params: { page, limit },
    });
    return res.data;
  },

  async searchEmails(query: string, status?: string, page = 1, limit = 20): Promise<PaginatedEmailsResponse> {
    const res = await api.get<PaginatedEmailsResponse>("/api/search", {
      params: { q: query, status, page, limit },
    });
    return res.data;
  },

  async getQueueHealth(): Promise<{
    success: boolean;
    queue: QueueHealthMetrics;
    services: {
      redis: { status: string; error?: string };
      elasticsearch: { status: string; error?: string };
    };
  }> {
    const res = await api.get("/api/queue/health");
    return res.data;
  },

  async getSenders(): Promise<Sender[]> {
    try {
      const res = await api.get<{ success: boolean; senders: Sender[] }>("/api/emails/senders");
      return res.data.senders || [];
    } catch {
      return [];
    }
  },

  async getSlackStatus(): Promise<{ connected: boolean; integration?: { teamName: string; channelName: string } }> {
    try {
      const res = await api.get("/api/slack/status");
      return res.data;
    } catch {
      return { connected: false };
    }
  },

  async getSlackAuthUrl(): Promise<string | null> {
    try {
      const res = await api.get<{ success: boolean; authUrl: string }>("/api/slack/oauth/start");
      return res.data.authUrl;
    } catch {
      return null;
    }
  },

  async disconnectSlack(userId: string): Promise<boolean> {
    try {
      const res = await api.post("/api/slack/disconnect", { userId });
      return res.data.success;
    } catch {
      return false;
    }
  },
};
