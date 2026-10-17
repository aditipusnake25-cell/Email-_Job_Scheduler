import { query } from "../config/database.js";

export interface Sender {
  id: string;
  user_id: string;
  email: string;
  name: string;
  is_default: boolean;
  hourly_limit: number;
  created_at: Date;
}

export const SenderModel = {
  async getByUserId(userId: string): Promise<Sender[]> {
    const res = await query<Sender>(
      "SELECT * FROM senders WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC",
      [userId]
    );
    return res.rows;
  },

  async findById(id: string): Promise<Sender | null> {
    const res = await query<Sender>("SELECT * FROM senders WHERE id = $1", [id]);
    return res.rows[0] || null;
  },

  async findOrCreateDefault(userId: string, email: string, name: string): Promise<Sender> {
    const existing = await query<Sender>(
      "SELECT * FROM senders WHERE user_id = $1 AND email = $2",
      [userId, email]
    );
    if (existing.rows[0]) {
      return existing.rows[0];
    }

    const res = await query<Sender>(
      `INSERT INTO senders (user_id, email, name, is_default, hourly_limit)
       VALUES ($1, $2, $3, TRUE, 200)
       RETURNING *`,
      [userId, email, name]
    );
    return res.rows[0]!;
  },

  async create(data: {
    userId: string;
    email: string;
    name: string;
    hourlyLimit?: number;
    isDefault?: boolean;
  }): Promise<Sender> {
    const res = await query<Sender>(
      `INSERT INTO senders (user_id, email, name, hourly_limit, is_default)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, email)
       DO UPDATE SET
         name = EXCLUDED.name,
         hourly_limit = EXCLUDED.hourly_limit
       RETURNING *`,
      [data.userId, data.email, data.name, data.hourlyLimit || 200, !!data.isDefault]
    );
    return res.rows[0]!;
  },
};
