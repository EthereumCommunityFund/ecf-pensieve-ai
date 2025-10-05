import superjson from "superjson";

const TRPC_CREATE_PROJECT_ROUTE = "/api/trpc/project.createProjectViaAI";

export interface ProjectWebsite {
  title: string;
  url: string;
}

export interface ProjectFounder {
  name: string;
  title: string;
  region?: string;
}

export interface ProjectSmartContract {
  id: string;
  chain: string;
  addresses: string;
}

export interface ProjectReference {
  key: string;
  value: string;
}

export interface CreateProjectViaAIPayload {
  name: string;
  tagline: string;
  categories: string[];
  mainDescription: string;
  logoUrl: string;
  websites: ProjectWebsite[];
  appUrl: string | null;
  dateFounded: Date;
  dateLaunch: Date | null;
  devStatus: string;
  fundingStatus: string | null;
  openSource: boolean;
  codeRepo: string | null;
  tokenContract: string | null;
  orgStructure: string;
  publicGoods: boolean;
  founders: ProjectFounder[];
  tags: string[];
  whitePaper: string | null;
  dappSmartContracts: ProjectSmartContract[] | null;
  refs?: ProjectReference[] | null;
}

export interface CreateProjectViaAIOptions {
  baseUrl: string;
  systemToken: string;
  signal?: AbortSignal;
}

export interface CreateProjectViaAIResponse {
  id: string;
  projectId: string;
  proposalId?: string | null;
  [key: string]: unknown;
}

interface TrpcSuccessEnvelope<T> {
  result?: {
    data?: {
      json?: T;
    };
  };
}

interface TrpcErrorEnvelope {
  error: {
    message?: string;
    code?: number;
    data?: {
      code?: string;
      httpStatus?: number;
    };
  };
}

export async function createProjectViaAI(
  payload: CreateProjectViaAIPayload,
  options: CreateProjectViaAIOptions
) {
  validateOptions(options);
  const url = buildRequestUrl(options.baseUrl);
  const headers = buildHeaders(options.systemToken);
  const body = superjson.stringify(payload);

  try {
    await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: options.signal,
    });
  } catch (networkError) {
    const message = getErrorMessage(networkError);
    console.error("createProjectViaAI network error", message);
    throw new Error(`Failed to reach Pensieve service: ${message}`);
  }

  return {};
}

function buildRequestUrl(baseUrl: string): string {
  const trimmed = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${trimmed}${TRPC_CREATE_PROJECT_ROUTE}`;
}

function buildHeaders(systemToken: string): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-ai-system-token": systemToken,
  };
  return headers;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function validateOptions(options: CreateProjectViaAIOptions) {
  if (!options.baseUrl) {
    throw new Error("baseUrl is required");
  }
  if (!options.systemToken) {
    throw new Error("x-ai-system-token is required");
  }
}

function extractTrpcJson<T>(payload: unknown): T | null {
  const successPayload = payload as TrpcSuccessEnvelope<T> | undefined;
  return successPayload?.result?.data?.json ?? null;
}

function extractTrpcErrorMessage(payload: unknown): string | null {
  const errorPayload = payload as TrpcErrorEnvelope | undefined;
  const error = errorPayload?.error;
  if (!error) {
    return null;
  }
  if (typeof error.message === "string" && error.message.trim().length > 0) {
    return error.message;
  }
  const code = error.data?.code ?? error.code;
  if (typeof code === "string" && code.trim().length > 0) {
    return code;
  }
  if (typeof code === "number") {
    return `Pensieve error code ${code}`;
  }
  if (typeof error.data?.httpStatus === "number") {
    return `Pensieve HTTP status ${error.data.httpStatus}`;
  }
  return "Pensieve returned an unknown error.";
}

function normalizeCreateProjectResponse(
  data: unknown
): CreateProjectViaAIResponse {
  if (!isRecord(data)) {
    throw new Error("Pensieve response data is not an object.");
  }

  const rawId = coerceNonEmptyString(data.id);
  const rawProjectId = coerceNonEmptyString(data.projectId);
  const normalizedId = rawId ?? rawProjectId;

  if (!normalizedId) {
    throw new Error("Pensieve response is missing the id field.");
  }

  const normalizedProjectId = rawProjectId ?? normalizedId;
  const proposalIdValue = coerceNonEmptyString(data.proposalId);

  const normalized: Record<string, unknown> = {
    ...data,
    id: normalizedId,
    projectId: normalizedProjectId,
  };

  if (proposalIdValue !== null) {
    normalized.proposalId = proposalIdValue;
  } else if ("proposalId" in data) {
    normalized.proposalId = null;
  }

  return normalized as CreateProjectViaAIResponse;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coerceNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
