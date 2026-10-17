-- ReachInbox Email Job Scheduler Database Schema
-- Compatible with PostgreSQL 13+ (including Neon Serverless PostgreSQL)

-- 1. Users Table (Google OAuth and App Users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id VARCHAR(255) UNIQUE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sender Accounts (Support multiple email sender profiles)
CREATE TABLE IF NOT EXISTS senders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(150) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    hourly_limit INTEGER NOT NULL DEFAULT 200,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, email)
);

-- 3. Campaigns Table (Email batches/campaigns)
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES senders(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    start_at TIMESTAMPTZ NOT NULL,
    delay_seconds INTEGER NOT NULL DEFAULT 2,
    hourly_limit INTEGER NOT NULL DEFAULT 200,
    total_emails INTEGER NOT NULL DEFAULT 0,
    sent_emails INTEGER NOT NULL DEFAULT 0,
    failed_emails INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Emails Table (Individual recipient jobs)
CREATE TABLE IF NOT EXISTS emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    sender_email VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'queued', 'sending', 'sent', 'failed', 'rescheduled'
    scheduled_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    ethereal_preview_url TEXT,
    job_id VARCHAR(255),
    attempts INTEGER NOT NULL DEFAULT 0,
    idempotency_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (campaign_id, recipient)
);

-- 5. Slack Integrations Table (Workspace OAuth and limit notification alerts)
CREATE TABLE IF NOT EXISTS slack_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    team_id VARCHAR(100) NOT NULL,
    team_name VARCHAR(255),
    access_token TEXT NOT NULL,
    bot_user_id VARCHAR(100),
    channel_id VARCHAR(100),
    channel_name VARCHAR(255),
    authed_user_id VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance & rapid query execution
CREATE INDEX IF NOT EXISTS idx_emails_status_scheduled ON emails(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_emails_campaign_id ON emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_emails_sender_email ON emails(sender_email);
CREATE INDEX IF NOT EXISTS idx_emails_job_id ON emails(job_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_slack_user_id ON slack_integrations(user_id);
