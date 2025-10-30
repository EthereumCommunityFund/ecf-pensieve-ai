import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  checkProjectName,
  type CheckProjectNameResult,
} from "@/app/service/pensieveAi";
import { getErrorMessage, loadEnv, noStoreHeaders } from "@/app/api/shared";

export const runtime = "nodejs";

const requestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name cannot be empty"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const env = loadEnv();

  if (!env.PENSIEVE_BASE_URL || !env.PENSIEVE_SYSTEM_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Pensieve integration is not configured. Set PENSIEVE_BASE_URL and PENSIEVE_SYSTEM_TOKEN.",
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  const { name } = parsed.data;

  try {
    const result: CheckProjectNameResult = await checkProjectName(name, {
      baseUrl: env.PENSIEVE_BASE_URL,
      systemToken: env.PENSIEVE_SYSTEM_TOKEN,
    });
    return NextResponse.json(result, { headers: noStoreHeaders() });
  } catch (error) {
    const message = getErrorMessage(error);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}
