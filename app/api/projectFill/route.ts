import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { EnvConfig, coreSchema } from "@/app/utils/type";
import { fetchRootDataByProjectId } from "@/app/service/rootdata";
import { getErrorMessage, loadEnv, noStoreHeaders } from "@/app/api/shared";

export const runtime = "nodejs";

const requestSchema = z.object({
  projectId: z.number().min(1),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let env: EnvConfig;
  try {
    env = loadEnv();
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  console.log("payload", payload);

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid parameter format. Verify projectId and limit." },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  const projectId = parsed.data.projectId;
  if (!projectId) {
    return NextResponse.json(
      { error: "projectId must not be empty." },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  const rawRootPartial: any = await fetchRootDataByProjectId(projectId, env);

  const projectName = (rawRootPartial?.name ?? "").trim() || projectId;

  const officialUrl = rawRootPartial.websites?.[0]?.url;
  const rootdataUrl = rawRootPartial.rootdataurl;
  const allowedHosts = [officialUrl, rootdataUrl];

  const domainPrompt =
    allowedHosts.length > 0
      ? `Use only the following domains and validate each domain's credibility: ${allowedHosts.join(
          ", "
        )}.`
      : "No trusted domains detected. Prioritize authoritative sources and verify credibility.";

  const preferredSiteQueries = allowedHosts
    .slice(0, 2)
    .map((host) => `\"site:${host}\"`)
    .join(" and ");

  const sitePrompt = preferredSiteQueries
    ? `When possible, prioritize search sub-queries that include ${preferredSiteQueries}.`
    : "When possible, prioritize search sub-queries targeting official and authoritative domains.";

  let llmResult;
  try {
    llmResult = await generateText({
      model: openai("gpt-4o-mini"),
      tools: {
        web_search: openai.tools.webSearch({
          searchContextSize: "high",
        }),
      },
      experimental_output: Output.object({ schema: coreSchema }),

      system: [
        "You are a researcher responsible for extracting structured on-chain project intelligence.",
        "Process requirements: 1) Use only the allowed domains and confirm their credibility; 2) Provide evidence-backed values for every field and use null only when evidence is absent;",
        "3) The output must strictly follow the provided JSON Schema with no extra or missing fields;",
        "4) Ensure categories contains at least one enum item and return ISO 8601 date strings with time-offset (e.g., 2024-01-01T00:00:00Z) for dateFounded and dateLaunch;",
        "5) Choose devStatus and orgStructure from their enums using the best-supported value (if unresolved, use Evolving Structure for orgStructure, never null);",
        "6) Provide boolean values for publicGoods and openSource, include at least one founder with name and title, and verify founders via evidence;",
        "7) Preserve array element structure, remove invalid URLs, and when sources conflict prefer the most recent authoritative evidence, otherwise return null;",
        "8) Treat RootData-provided founder, founders, dateFounded, dateLaunch, and whitePaper as primary candidates; validate them against schema and corroborate with current evidence;",
        "9) If ISO 8601 formatted dates cannot be verified, set the corresponding field to null;",
      ].join("\n"),
      prompt: [
        `Goal: extract and populate form fields about "${projectName}".`,
        domainPrompt,
        sitePrompt,
        "Before filling each field, verify evidence and schema constraints, ensure all required fields have values, and return an object that conforms to the schema (only fields marked nullable may be null).",
        "Do not output any schema-undefined fields or explanatory text.",
      ].join("\n"),
      toolChoice: { type: "tool", toolName: "web_search" },
    });
  } catch (error) {
    console.error("error", error);
    return NextResponse.json(
      { error: "Structured generation failed. Please try again later." },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  if (!llmResult?.experimental_output) {
    return NextResponse.json(
      { error: "Model output did not contain structured data." },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  const llmObject = coreSchema.parse(llmResult.experimental_output);

  return NextResponse.json(
    { ...llmObject, ...rawRootPartial },
    { headers: noStoreHeaders() }
  );
}
