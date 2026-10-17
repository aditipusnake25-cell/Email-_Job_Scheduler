import { getElasticsearchClient } from "../config/elasticsearch.js";
import { config } from "../config/env.js";
import { query } from "../config/database.js";
import { EmailRecord } from "../models/Email.js";
import { logger } from "../utils/logger.js";

export interface SearchFilters {
  query?: string;
  status?: string;
  senderEmail?: string;
  page?: number;
  limit?: number;
  userId?: string;
}

export interface SearchResult {
  emails: EmailRecord[];
  total: number;
  page: number;
  totalPages: number;
  source: "elasticsearch" | "postgresql_fallback";
}

export const SearchService = {
  async indexEmail(email: EmailRecord): Promise<void> {
    try {
      const client = getElasticsearchClient();
      await client.index({
        index: config.elasticsearch.index,
        id: email.id,
        document: {
          id: email.id,
          campaign_id: email.campaign_id,
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
          sender_email: email.sender_email,
          status: email.status,
          scheduled_at: email.scheduled_at,
          sent_at: email.sent_at,
          created_at: email.created_at,
        },
      });
      logger.debug("Indexed email in Elasticsearch", { id: email.id });
    } catch (err) {
      logger.debug("Elasticsearch indexing skipped (fallback active)", {
        error: (err as Error).message,
        id: email.id,
      });
    }
  },

  async updateEmailStatus(id: string, status: string, sentAt?: Date | null): Promise<void> {
    try {
      const client = getElasticsearchClient();
      await client.update({
        index: config.elasticsearch.index,
        id,
        doc: {
          status,
          sent_at: sentAt || null,
        },
      });
    } catch {
      // Elasticsearch offline fallback
    }
  },

  async searchEmails(filters: SearchFilters): Promise<SearchResult> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const from = (page - 1) * limit;

    // Try Elasticsearch first
    try {
      const client = getElasticsearchClient();
      const mustClauses: unknown[] = [];
      const filterClauses: unknown[] = [];

      if (filters.query && filters.query.trim()) {
        mustClauses.push({
          multi_match: {
            query: filters.query.trim(),
            fields: ["recipient^3", "subject^2", "body", "sender_email"],
            fuzziness: "AUTO",
          },
        });
      } else {
        mustClauses.push({ match_all: {} });
      }

      if (filters.status && filters.status !== "all") {
        filterClauses.push({ term: { status: filters.status } });
      }

      if (filters.senderEmail) {
        filterClauses.push({ term: { sender_email: filters.senderEmail } });
      }

      const res = await client.search({
        index: config.elasticsearch.index,
        from,
        size: limit,
        sort: [{ scheduled_at: { order: "desc" } }],
        query: {
          bool: {
            must: mustClauses as any,
            filter: filterClauses as any,
          },
        },
      });

      const totalHits = typeof res.hits.total === "number" ? res.hits.total : res.hits.total?.value || 0;
      const emails = res.hits.hits.map((hit) => hit._source as EmailRecord);

      return {
        emails,
        total: totalHits,
        page,
        totalPages: Math.ceil(totalHits / limit) || 1,
        source: "elasticsearch",
      };
    } catch (err) {
      logger.debug("Searching via Elasticsearch unavailable, falling back to PostgreSQL", {
        error: (err as Error).message,
      });
    }

    // Fallback to PostgreSQL authoritative search
    const whereParts: string[] = ["1=1"];
    const params: unknown[] = [];

    if (filters.query && filters.query.trim()) {
      params.push(`%${filters.query.trim()}%`);
      whereParts.push(
        `(e.recipient ILIKE $${params.length} OR e.subject ILIKE $${params.length} OR e.body ILIKE $${params.length} OR e.sender_email ILIKE $${params.length})`
      );
    }

    if (filters.status && filters.status !== "all") {
      params.push(filters.status);
      whereParts.push(`e.status = $${params.length}`);
    }

    if (filters.senderEmail) {
      params.push(filters.senderEmail);
      whereParts.push(`e.sender_email = $${params.length}`);
    }

    if (filters.userId) {
      params.push(filters.userId);
      whereParts.push(`c.user_id = $${params.length}`);
    }

    const whereClause = whereParts.join(" AND ");

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) FROM emails e JOIN campaigns c ON e.campaign_id = c.id WHERE ${whereClause}`,
      params
    );

    params.push(limit, from);
    const sql = `
      SELECT e.*
      FROM emails e
      JOIN campaigns c ON e.campaign_id = c.id
      WHERE ${whereClause}
      ORDER BY e.scheduled_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const dataRes = await query<EmailRecord>(sql, params);
    const total = parseInt(countRes.rows[0]?.count || "0", 10);

    return {
      emails: dataRes.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      source: "postgresql_fallback",
    };
  },

  async rebuildIndex(): Promise<{ indexedCount: number }> {
    const client = getElasticsearchClient();
    const res = await query<EmailRecord>("SELECT * FROM emails ORDER BY created_at ASC");
    let count = 0;

    for (const email of res.rows) {
      try {
        await client.index({
          index: config.elasticsearch.index,
          id: email.id,
          document: {
            id: email.id,
            campaign_id: email.campaign_id,
            recipient: email.recipient,
            subject: email.subject,
            body: email.body,
            sender_email: email.sender_email,
            status: email.status,
            scheduled_at: email.scheduled_at,
            sent_at: email.sent_at,
            created_at: email.created_at,
          },
        });
        count++;
      } catch {
        // continue
      }
    }

    logger.info("Rebuilt Elasticsearch index from PostgreSQL", { count });
    return { indexedCount: count };
  },
};
