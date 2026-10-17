export type EmailStatus =
  | "scheduled"
  | "queued"
  | "sending"
  | "sent"
  | "failed"
  | "rescheduled";

export interface EmailRecord {
  id: string;
  campaign_id: string;
  recipient: string;
  subject: string;
  body: string;
  sender_email: string | null;
  status: EmailStatus;
  scheduled_at: string;
  sent_at: string | null;
  error_message: string | null;
  ethereal_preview_url: string | null;
  job_id: string | null;
  attempts: number;
  created_at: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  status: string;
  start_at: string;
  delay_seconds: number;
  hourly_limit: number;
  total_emails: number;
  sent_emails: number;
  failed_emails: number;
}

export interface Sender {
  id: string;
  email: string;
  name: string;
  is_default: boolean;
  hourly_limit: number;
}

export interface QueueHealthMetrics {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  isPaused: boolean;
}

export interface ScheduleEmailPayload {
  senderEmail: string;
  senderName?: string;
  campaignName?: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime?: string;
  delaySeconds?: number;
  hourlyLimit?: number;
}
