import { Client } from "@elastic/elasticsearch";
import { config } from "./env.js";
import { logger } from "../utils/logger.js";

let esClient: Client | null = null;
let isConnected = false;

export function getElasticsearchClient(): Client {
  if (!esClient) {
    esClient = new Client({
      node: config.elasticsearch.node,
    });
  }
  return esClient;
}

export async function checkElasticsearchHealth(): Promise<{ status: "connected" | "disconnected"; error?: string }> {
  try {
    const client = getElasticsearchClient();
    const health = await client.cluster.health({});
    isConnected = true;
    logger.info("Elasticsearch cluster connected", { clusterStatus: health.status });
    return { status: "connected" };
  } catch (err) {
    isConnected = false;
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("Elasticsearch is currently unreachable (search features will degrade gracefully)", { error: message });
    return { status: "disconnected", error: message };
  }
}

export async function initializeElasticsearchIndex(): Promise<void> {
  try {
    const client = getElasticsearchClient();
    const indexName = config.elasticsearch.index;

    const exists = await client.indices.exists({ index: indexName });
    if (!exists) {
      await client.indices.create({
        index: indexName,
        mappings: {
          properties: {
            id: { type: "keyword" },
            campaign_id: { type: "keyword" },
            recipient: { type: "text", fields: { keyword: { type: "keyword" } } },
            subject: { type: "text" },
            body: { type: "text" },
            sender_email: { type: "keyword" },
            status: { type: "keyword" },
            scheduled_at: { type: "date" },
            sent_at: { type: "date" },
            created_at: { type: "date" },
          },
        },
      });
      logger.info(`Elasticsearch index '${indexName}' created successfully.`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("Elasticsearch index initialization skipped (ES may be offline)", { message });
  }
}
