import { EnvConfig } from "@/app/utils/type";
import { rootdataHeaders, safeJson } from "../utils/util";

export async function fetchRootDataByProjectId(
  projectId: number,
  env: EnvConfig
) {
  if (!env.ROOTDATA_API_KEY || !projectId) {
    return {};
  }

  try {
    const detail = await rootdataDetail(projectId, env);
    return detail ?? {};
  } catch (error) {
    console.warn("rootdata fetch failed", error);
    return {};
  }
}

export interface RootDataSearchResult {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
}

export async function searchRootDataProjects(
  query: string,
  env: EnvConfig
): Promise<RootDataSearchResult[]> {
  if (!env.ROOTDATA_API_KEY) return [];

  try {
    const response = await fetch("https://api.rootdata.com/open/ser_inv", {
      method: "POST",
      headers: rootdataHeaders(env),
      body: JSON.stringify({ query }),
    });

    if (!response || !response.ok) {
      return [];
    }

    const data = await safeJson(response);
    const items = Array.isArray(data?.data) ? data.data : [];

    return items;
  } catch (error) {
    console.warn("rootdata search failed", error);
    return [];
  }
}

async function rootdataDetail(projectId: number, env: EnvConfig) {
  if (!env.ROOTDATA_API_KEY) return {};

  const response = await fetch("https://api.rootdata.com/open/get_item", {
    method: "POST",
    headers: rootdataHeaders(env),
    body: JSON.stringify({
      project_id: projectId,
      include_investors: true,
    }),
  });

  if (!response || !response.ok) {
    return {};
  }

  const data = await safeJson(response);
  const detail = data?.data ?? {};
  return mapRootDataDetail(detail);
}

function mapRootDataDetail(detail: any) {
  return {
    name: detail.project_name,
    tagline: detail.one_liner,
    logoUrl: detail.logo,
    mainDescription: detail.description,
    rootdataurl: detail.rootdataurl,
    tags: detail.tags,
    websites: [
      {
        url: detail.social_media.website,
        title: "Official Website",
      },
    ],
    fundingStatus: detail.investors?.length > 0,
  };
}
