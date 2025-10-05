import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getErrorMessage,
  loadEnv,
  noStoreHeaders,
} from "@/app/api/shared";
import {
  RootDataSearchResult,
  searchRootDataProjects,
} from "@/app/service/rootdata";
import { EnvConfig } from "@/app/utils/type";

export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().min(1),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  let env: EnvConfig;
  try {
    env = loadEnv();
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());

  const parsed = querySchema.safeParse(searchParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid parameter format. Verify q." },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  const query = parsed.data.q.trim();

  const results: RootDataSearchResult[] = await searchRootDataProjects(query, env);

  return NextResponse.json(
    { query, results },
    { headers: noStoreHeaders() }
  );
}
