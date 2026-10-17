import { query } from "../config/database.js";

export interface User {
  id: string;
  google_id: string | null;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export const UserModel = {
  async findById(id: string): Promise<User | null> {
    const res = await query<User>("SELECT * FROM users WHERE id = $1", [id]);
    return res.rows[0] || null;
  },

  async findByGoogleId(googleId: string): Promise<User | null> {
    const res = await query<User>("SELECT * FROM users WHERE google_id = $1", [googleId]);
    return res.rows[0] || null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const res = await query<User>("SELECT * FROM users WHERE email = $1", [email]);
    return res.rows[0] || null;
  },

  async upsertGoogleUser(data: {
    google_id: string;
    name: string;
    email: string;
    avatar_url?: string;
  }): Promise<User> {
    const res = await query<User>(
      `INSERT INTO users (google_id, name, email, avatar_url, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (email)
       DO UPDATE SET
         google_id = EXCLUDED.google_id,
         name = EXCLUDED.name,
         avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
         updated_at = NOW()
       RETURNING *`,
      [data.google_id, data.name, data.email, data.avatar_url || null]
    );
    return res.rows[0]!;
  },
};
