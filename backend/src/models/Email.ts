import { query } from "../config/database.js";

export interface EmailRecord {
  id: string;
  campaign_id: string;
  recipient: string;
  subject: string;
  body: string;
  sender_email: string | null;
  status: "scheduled" | "queued" | "sending" | "sent" | "failed" | "rescheduled";
  scheduled_at: Date;
  sent_at: Date | null;
  error_message: string | null;
  ethereal_preview_url: string | null;
  job_id: string | null;
  attempts: number;
  idempotency_key: string | null;
  created_at: Date;
  updated_at: Date;
}

export const EmailModel = {
  async findById(id: string): Promise<EmailRecord | null> {
    const res = await query<EmailRecord>("SELECT * FROM emails WHERE id = $1", [id]);
    return res.rows[0] || null;
  },

  async findByIdempotencyKey(key: string): Promise<EmailRecord | null> {
    const res = await query<EmailRecord>("SELECT * FROM emails WHERE idempotency_key = $1", [key]);
    return res.rows[0] || null;
  },

  async findByJobId(jobId: string): Promise<EmailRecord | null> {
    const res = await query<EmailRecord>("SELECT * FROM emails WHERE job_id = $1", [jobId]);
    return res.rows[0] || null;
  },

  async createBatch(
    campaignId: string,
    senderEmail: string,
    subject: string,
    body: string,
    recipients: { recipient: string; scheduledAt: Date; idempotencyKey?: string }[]
  ): Promise<EmailRecord[]> {
    if (recipients.length === 0) return [];

    const values: unknown[] = [];
    const placeholders: string[] = [];

    recipients.forEach((item, index) => {
      const offset = index * 7;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`
      );
      values.push(
        campaignId,
        item.recipient,
        subject,
        body,
        senderEmail,
        item.scheduledAt,
        item.idempotencyKey || null
      );
    });

    const sql = `
      INSERT INTO emails (
        campaign_id, recipient, subject, body, sender_email, scheduled_at, idempotency_key
      )
      VALUES ${placeholders.join(", ")}
      ON CONFLICT (campaign_id, recipient) DO UPDATE
      SET
        subject = EXCLUDED.subject,
        body = EXCLUDED.body,
        scheduled_at = EXCLUDED.scheduled_at,
        updated_at = NOW()
      RETURNING *
    `;

    const res = await query<EmailRecord>(sql, values);
    return res.rows;
  },

  async updateJobId(id: string, jobId: string): Promise<void> {
    await query("UPDATE emails SET job_id = $1, status = 'queued', updated_at = NOW() WHERE id = $2", [
      jobId,
      id,
    ]);
  },

  async markSent(id: string, previewUrl?: string): Promise<void> {
    await query(
      `UPDATE emails
       SET status = 'sent',
           sent_at = NOW(),
           ethereal_preview_url = COALESCE($1, ethereal_preview_url),
           error_message = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [previewUrl || null, id]
    );
  },

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await query(
      `UPDATE emails
       SET status = 'failed',
           error_message = $1,
           attempts = attempts + 1,
           updated_at = NOW()
       WHERE id = $2`,
      [errorMessage, id]
    );
  },

  async markRescheduled(id: string, newScheduledAt: Date, jobId?: string): Promise<void> {
    await query(
      `UPDATE emails
       SET status = 'rescheduled',
           scheduled_at = $1,
           job_id = COALESCE($2, job_id),
           updated_at = NOW()
       WHERE id = $3`,
      [newScheduledAt, jobId || null, id]
    );
  },

  async getScheduled(options: {
    limit?: number;
    offset?: number;
    userId?: string;
  }): Promise<{ emails: EmailRecord[]; total: number }> {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    let whereClause = "WHERE e.status IN ('scheduled', 'queued', 'rescheduled')";
    const params: unknown[] = [];

    if (options.userId) {
      params.push(options.userId);
      whereClause += ` AND c.user_id = $${params.length}`;
    }

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) FROM emails e JOIN campaigns c ON e.campaign_id = c.id ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const sql = `
      SELECT e.*
      FROM emails e
      JOIN campaigns c ON e.campaign_id = c.id
      ${whereClause}
      ORDER BY e.scheduled_at ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const res = await query<EmailRecord>(sql, params);
    return {
      emails: res.rows,
      total: parseInt(countRes.rows[0]?.count || "0", 10),
    };
  },

  async getSent(options: {
    limit?: number;
    offset?: number;
    userId?: string;
  }): Promise<{ emails: EmailRecord[]; total: number }> {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    let whereClause = "WHERE e.status IN ('sent', 'failed')";
    const params: unknown[] = [];

    if (options.userId) {
      params.push(options.userId);
      whereClause += ` AND c.user_id = $${params.length}`;
    }

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) FROM emails e JOIN campaigns c ON e.campaign_id = c.id ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const sql = `
      SELECT e.*
      FROM emails e
      JOIN campaigns c ON e.campaign_id = c.id
      ${whereClause}
      ORDER BY COALESCE(e.sent_at, e.updated_at) DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const res = await query<EmailRecord>(sql, params);
    return {
      emails: res.rows,
      total: parseInt(countRes.rows[0]?.count || "0", 10),
    };
  },

  async getPendingForReconciliation(): Promise<EmailRecord[]> {
    const res = await query<EmailRecord>(
      `SELECT * FROM emails
       WHERE status IN ('scheduled', 'queued', 'rescheduled')
       ORDER BY scheduled_at ASC
       LIMIT 1000`
    );
    return res.rows;
  },
};
