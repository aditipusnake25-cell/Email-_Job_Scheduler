import { query } from "../config/database.js";

export interface Campaign {
  id: string;
  user_id: string;
  sender_id: string | null;
  name: string;
  status: string;
  start_at: Date;
  delay_seconds: number;
  hourly_limit: number;
  total_emails: number;
  sent_emails: number;
  failed_emails: number;
  created_at: Date;
  updated_at: Date;
}

export const CampaignModel = {
  async create(data: {
    userId: string;
    senderId?: string;
    name: string;
    startAt: Date;
    delaySeconds?: number;
    hourlyLimit?: number;
    totalEmails: number;
  }): Promise<Campaign> {
    const res = await query<Campaign>(
      `INSERT INTO campaigns (user_id, sender_id, name, start_at, delay_seconds, hourly_limit, total_emails, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled')
       RETURNING *`,
      [
        data.userId,
        data.senderId || null,
        data.name,
        data.startAt,
        data.delaySeconds ?? 2,
        data.hourlyLimit ?? 200,
        data.totalEmails,
      ]
    );
    return res.rows[0]!;
  },

  async findById(id: string): Promise<Campaign | null> {
    const res = await query<Campaign>("SELECT * FROM campaigns WHERE id = $1", [id]);
    return res.rows[0] || null;
  },

  async getByUserId(userId: string): Promise<Campaign[]> {
    const res = await query<Campaign>(
      "SELECT * FROM campaigns WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    return res.rows;
  },

  async incrementSent(id: string): Promise<void> {
    await query(
      `UPDATE campaigns
       SET sent_emails = sent_emails + 1,
           status = CASE WHEN sent_emails + failed_emails + 1 >= total_emails THEN 'completed' ELSE 'active' END,
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  },

  async incrementFailed(id: string): Promise<void> {
    await query(
      `UPDATE campaigns
       SET failed_emails = failed_emails + 1,
           status = CASE WHEN sent_emails + failed_emails + 1 >= total_emails THEN 'completed' ELSE 'active' END,
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  },
};
