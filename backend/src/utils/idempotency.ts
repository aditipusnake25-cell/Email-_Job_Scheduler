import crypto from "crypto";

export function generateIdempotencyKey(parts: (string | number | undefined)[]): string {
  const content = parts.filter(Boolean).join(":");
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 32);
}

export function isValidIdempotencyKey(key: string): boolean {
  return typeof key === "string" && key.trim().length >= 8 && key.trim().length <= 64;
}
