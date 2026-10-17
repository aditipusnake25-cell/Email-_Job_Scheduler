export interface ParseEmailResult {
  validEmails: string[];
  invalidCount: number;
  duplicatesCount: number;
  totalParsed: number;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function parseEmailsFromText(rawText: string): ParseEmailResult {
  if (!rawText || !rawText.trim()) {
    return { validEmails: [], invalidCount: 0, duplicatesCount: 0, totalParsed: 0 };
  }

  // Split by commas, semicolons, tabs, and newlines
  const tokens = rawText
    .split(/[\r\n,;\t]+/)
    .map((t) => t.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);

  const seen = new Set<string>();
  const validEmails: string[] = [];
  let invalidCount = 0;
  let duplicatesCount = 0;

  for (const token of tokens) {
    const clean = token.toLowerCase();
    if (EMAIL_REGEX.test(clean)) {
      if (seen.has(clean)) {
        duplicatesCount++;
      } else {
        seen.add(clean);
        validEmails.push(clean);
      }
    } else {
      // Ignore header row names like "email", "recipient"
      if (!["email", "emails", "recipient", "recipients"].includes(clean)) {
        invalidCount++;
      }
    }
  }

  return {
    validEmails,
    invalidCount,
    duplicatesCount,
    totalParsed: tokens.length,
  };
}

export async function parseEmailsFromFile(file: File): Promise<ParseEmailResult> {
  const text = await file.text();
  return parseEmailsFromText(text);
}
