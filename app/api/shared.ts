import { EnvConfig } from "@/app/utils/type";

function clampLimit(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

export function loadEnv(): EnvConfig {
  const missing: string[] = [];
  if (!process.env.OPENAI_API_KEY) missing.push("OPENAI_API_KEY");
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  const excerptValue = Number.parseInt(process.env.HTML_EXCERPT ?? "5000", 10);
  const defaultLimitValue = Number.parseInt(
    process.env.DEFAULT_LIMIT ?? "3",
    10
  );

  return {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    ROOTDATA_API_KEY: process.env.ROOTDATA_API_KEY,
    PENSIEVE_BASE_URL: process.env.PENSIEVE_BASE_URL,
    PENSIEVE_SYSTEM_TOKEN: process.env.PENSIEVE_SYSTEM_TOKEN,
    PENSIEVE_SUPABASE_JWT: process.env.PENSIEVE_SUPABASE_JWT,
    HTML_EXCERPT:
      Number.isFinite(excerptValue) && excerptValue > 0 ? excerptValue : 5000,
    DEFAULT_LIMIT: clampLimit(defaultLimitValue, 1, 5),
  };
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function noStoreHeaders(): Record<string, string> {
  return { "cache-control": "no-store" };
}
