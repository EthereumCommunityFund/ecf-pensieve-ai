import superjson from "superjson";

const TRPC_CREATE_PROJECT_ROUTE = "/api/trpc/project.createProjectViaAI";
const TRPC_CHECK_PROJECT_ROUTE = "/api/trpc/project.checkProjectName";

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
  const url = buildRequestUrl(options.baseUrl, TRPC_CREATE_PROJECT_ROUTE);
  const headers = buildHeaders(options.systemToken);
  const body = superjson.stringify(payload);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: options.signal,
    });
    return response.json();
  } catch (networkError) {
    const message = getErrorMessage(networkError);
    console.error("createProjectViaAI network error", message);
    throw new Error(`Failed to reach Pensieve service: ${message}`);
  }
}

export interface CheckProjectNameOptions {
  baseUrl: string;
  systemToken: string;
  signal?: AbortSignal;
}

export interface CheckProjectNameResult {
  exists: boolean;
}

export async function checkProjectName(
  name: string,
  options: CheckProjectNameOptions
): Promise<CheckProjectNameResult> {
  validateOptions(options);
  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (!trimmedName) {
    throw new Error("Project name cannot be empty");
  }

  const route = buildRequestUrl(options.baseUrl, TRPC_CHECK_PROJECT_ROUTE);
  const url = new URL(route);
  url.searchParams.set("input", superjson.stringify({ name: trimmedName }));
  const headers = buildHeaders(options.systemToken, {
    includeContentType: false,
  });

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
      signal: options.signal,
    });

    const payload = await response.json();
    const data = extractTrpcJson<CheckProjectNameResult>(payload);
    if (data && typeof data.exists === "boolean") {
      return { exists: data.exists };
    }

    const pensieveError = extractTrpcErrorMessage(payload);
    if (pensieveError) {
      throw new Error(pensieveError);
    }

    throw new Error("Pensieve returned an unexpected response for checkProjectName.");
  } catch (networkError) {
    const message = getErrorMessage(networkError);
    console.error("checkProjectName network error", message);
    throw new Error(`Failed to reach Pensieve service: ${message}`);
  }
}

function buildRequestUrl(baseUrl: string, route: string): string {
  const trimmed = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${trimmed}${route}`;
}

interface BuildHeadersOptions {
  includeContentType?: boolean;
}

function buildHeaders(
  systemToken: string,
  options?: BuildHeadersOptions
): Record<string, string> {
  const headers: Record<string, string> = {
    "x-ai-system-token": systemToken,
  };

  if (options?.includeContentType ?? true) {
    headers["content-type"] = "application/json";
  }

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
