import { LanguageModel } from "ai";
import { CompatibleModelLike, CoreSchemaType, EnvConfig } from "./type";

function rootdataHeaders(env: EnvConfig): Record<string, string> {
  return {
    apikey: env.ROOTDATA_API_KEY ?? "",
    language: "en",
    "content-type": "application/json",
  };
}

function collectUrls(values: unknown[]): string[] {
  const urls: string[] = [];
  for (const value of values) {
    const candidate = optionalUrl(value);
    if (candidate) {
      urls.push(candidate);
    }
  }
  return Array.from(new Set(urls));
}

function optionalUrl(value: unknown): string | null {
  const str = stringOrNull(value);
  return str && isHttpUrl(str) ? str : null;
}

function stringOrNull(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function extractArray<T = unknown>(value: unknown): T[] | null {
  return Array.isArray(value) ? (value as T[]) : null;
}

function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.replace(/[^\d.,-]/g, "").replace(/,/g, "");
    const parsed = Number.parseFloat(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function normalizeDateString(value: unknown): string | null {
  const dateString = stringOrNull(value);
  if (!dateString) return null;
  const timestamp = Date.parse(dateString);
  if (Number.isNaN(timestamp)) {
    return dateString;
  }
  return new Date(timestamp).toISOString();
}

function timestampFromValue(value: unknown): number {
  const normalized = normalizeDateString(value);
  if (!normalized) {
    return 0;
  }
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampLimit(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function safeJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function noStoreHeaders(): Record<string, string> {
  return { "cache-control": "no-store" };
}

export {
  rootdataHeaders,
  collectUrls,
  optionalUrl,
  stringOrNull,
  extractArray,
  parseAmount,
  normalizeDateString,
  timestampFromValue,
  clampLimit,
  isHttpUrl,
  safeJson,
};
