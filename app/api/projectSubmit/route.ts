import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createProjectViaAI } from "@/app/service/pensieveAi";
import { getErrorMessage, loadEnv, noStoreHeaders } from "@/app/api/shared";

export const runtime = "nodejs";

const websiteSchema = z.object({
  title: z.string().min(1),
  url: z.string().min(1),
});

const founderSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  region: z.string().optional(),
});

const smartContractSchema = z.object({
  id: z.string().min(1),
  chain: z.string().min(1),
  addresses: z.string().min(1),
});

const referenceSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

const payloadSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1),
  categories: z.array(z.string().min(1)).min(1),
  mainDescription: z.string().min(1),
  logoUrl: z.string().min(1),
  websites: z.array(websiteSchema).min(1),
  appUrl: z.string().nullable(),
  dateFounded: z.string().min(1),
  dateLaunch: z.string().nullable(),
  devStatus: z.string().min(1),
  fundingStatus: z.string().min(1).nullable(),
  openSource: z.boolean(),
  codeRepo: z.string().nullable(),
  tokenContract: z.string().nullable(),
  orgStructure: z.string().min(1),
  publicGoods: z.boolean(),
  founders: z.array(founderSchema).min(1),
  tags: z.array(z.string().min(1)),
  whitePaper: z.string().nullable(),
  dappSmartContracts: z.array(smartContractSchema).nullable(),
  refs: z.array(referenceSchema).nullable(),
});

const requestSchema = z.object({ payload: payloadSchema });

export async function POST(req: NextRequest): Promise<NextResponse> {
  let env = loadEnv();

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

  const rawPayload = parsed.data.payload;

  const payload = {
    ...rawPayload,
    dateFounded: new Date(rawPayload.dateFounded),
    dateLaunch: rawPayload.dateLaunch ? new Date(rawPayload.dateLaunch) : null,
  };

  try {
    const response = await createProjectViaAI(payload, {
      baseUrl: env.PENSIEVE_BASE_URL,
      systemToken: env.PENSIEVE_SYSTEM_TOKEN,
    });
    return NextResponse.json(response, { headers: noStoreHeaders() });
  } catch (error) {
    const message = getErrorMessage(error);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}
